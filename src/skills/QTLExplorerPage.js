import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BiotechOutlinedIcon from '@mui/icons-material/BiotechOutlined';
import CheckIcon from '@mui/icons-material/Check';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import ScatterPlotOutlinedIcon from '@mui/icons-material/ScatterPlotOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import ShortcutOutlinedIcon from '@mui/icons-material/ShortcutOutlined';
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';

import AgentSidebar from '../components/AgentSidebar';
import { queryQueryResult } from '../redux/queryResultSlice';
import qtlContent from './qtlExplorerContent.json';

function parseGeneOption(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(.+)\((ENSG[^)]+)\)$/i);
  if (!match) return null;
  return {
    symbol: match[1].trim(),
    id: match[2].trim(),
  };
}

function normalizeSnp(value) {
  return String(value || '').trim();
}

function QtlTermAutocomplete({
  type,
  label,
  placeholder,
  value,
  onChange,
  defaultOptions,
  onValidated,
}) {
  const dispatch = useDispatch();
  const [selfOptions, setSelfOptions] = useState(defaultOptions || []);
  const [simIsLoading, setSimIsLoading] = useState(false);
  const [valIsLoading, setValIsLoading] = useState(false);
  const [validatedValue, setValidatedValue] = useState('');
  const [inputValue, setInputValue] = useState(String(value || ''));
  const inputValueRef = useRef(String(value || ''));
  const inputChangeTimer = useRef(null);

  useEffect(() => {
    setSelfOptions(defaultOptions || []);
  }, [defaultOptions]);

  useEffect(() => {
    const next = String(value || '');
    inputValueRef.current = next;
    setInputValue(next);
  }, [value]);

  useEffect(() => {
    return () => {
      if (inputChangeTimer.current) {
        clearTimeout(inputChangeTimer.current);
      }
    };
  }, []);

  const markValidated = (ok, normalized = '') => {
    if (ok && normalized) {
      setValidatedValue(normalized);
      setInputValue(normalized);
      inputValueRef.current = normalized;
      onChange(normalized);
      onValidated(true, normalized);
      return;
    }
    setValidatedValue('');
    onValidated(false, '');
  };

  const updateSource = async (newInputValue) => {
    const keyWord = String(newInputValue || '').split('(')[0].trim();

    if (String(newInputValue || '').length <= 1) {
      setSelfOptions(defaultOptions || []);
      if (String(newInputValue || '') === inputValueRef.current) {
        setSimIsLoading(false);
      }
      return;
    }

    if (type !== 'gene') {
      setSelfOptions([]);
      if (String(newInputValue || '') === inputValueRef.current) {
        setSimIsLoading(false);
      }
      return;
    }

    try {
      const response = await dispatch(queryQueryResult({
        isNeptune: false,
        query: `SELECT id, name FROM gene_name WHERE name % '${keyWord}'ORDER BY similarity(name, '${keyWord}') DESC LIMIT 5;`,
      })).unwrap();

      if (String(newInputValue || '') !== inputValueRef.current) return;

      const results = response?.results?.[0]?.credible_sets || [];
      const parsedResponse = results.map((item) => `${item.name}(${item.id})`);
      if (parsedResponse.length === 0) {
        setSelfOptions([{ label: `${type} not found`, disabled: true, notFound: true }]);
      } else {
        setSelfOptions(parsedResponse);
      }

      const exactMatch = results.find(
        (result) => (result.name || '').toLowerCase() === String(newInputValue || '').toLowerCase()
          || (result.id || '').toLowerCase() === String(newInputValue || '').toLowerCase()
      );
      if (exactMatch) {
        markValidated(true, `${exactMatch.name}(${exactMatch.id})`);
      }
    } catch (error) {
      if (String(newInputValue || '') === inputValueRef.current) {
        setSelfOptions(defaultOptions || []);
      }
    } finally {
      if (String(newInputValue || '') === inputValueRef.current) {
        setSimIsLoading(false);
      }
    }
  };

  const updateValidation = async (newInputValue) => {
    if (type === 'gene') {
      setValidatedValue('');
      onValidated(false, '');
      setValIsLoading(false);
      return;
    }

    if (String(newInputValue || '').length <= 1) {
      markValidated(false, '');
      setValIsLoading(false);
      return;
    }

    const termName = String(newInputValue || '').split('(')[0].trim();

    try {
      const response = await dispatch(queryQueryResult({
        isNeptune: false,
        rawResponse: true,
        query: `SELECT snp FROM QTL_DATA WHERE snp = '${termName}' LIMIT 1;`,
      })).unwrap();

      if (String(newInputValue || '') !== inputValueRef.current) return;
      const id = response?.results?.[0]?.snp;
      if (id) {
        markValidated(true, String(id));
      } else {
        markValidated(false, '');
      }
    } catch (error) {
      if (String(newInputValue || '') === inputValueRef.current) {
        markValidated(false, '');
      }
    } finally {
      if (String(newInputValue || '') === inputValueRef.current) {
        setValIsLoading(false);
      }
    }
  };

  const options = useMemo(() => {
    const merged = [...(validatedValue ? [validatedValue] : []), ...selfOptions];
    const uniqueOptions = [...new Set(merged.map((option) => option?.label || option))];
    if (uniqueOptions.length > 0) return uniqueOptions;
    return type !== 'gene' ? [] : [{ label: `No ${type} found`, disabled: true, notFound: true }];
  }, [selfOptions, type, validatedValue]);

  const loading = simIsLoading || valIsLoading;

  return (
    <Autocomplete
      freeSolo
      value={inputValue}
      options={options}
      getOptionDisabled={(option) => Boolean(option?.disabled)}
      filterOptions={(x) => x}
      getOptionLabel={(option) => String(option?.label || option || '')}
      onFocus={() => {
        if (!inputValue && selfOptions.length === 0) {
          setValidatedValue('');
          updateSource('');
        }
      }}
      onInputChange={(_, nextInputValue, reason) => {
        const finalValue = String(nextInputValue || '');

        if (inputChangeTimer.current) {
          clearTimeout(inputChangeTimer.current);
        }

        if (reason === 'reset') {
          if (finalValue) {
            markValidated(true, finalValue);
          } else {
            markValidated(false, '');
            setInputValue('');
            inputValueRef.current = '';
            onChange('');
          }
          return;
        }

        setValidatedValue('');
        markValidated(false, '');
        setInputValue(finalValue);
        inputValueRef.current = finalValue;
        onChange(finalValue);

        inputChangeTimer.current = setTimeout(() => {
          setSelfOptions([]);
          setSimIsLoading(true);
          updateSource(finalValue);
          setValIsLoading(true);
          updateValidation(finalValue);
        }, 300);
      }}
      loading={loading}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: '10px',
          height: 50,
          fontSize: 18,
          bgcolor: '#FFFFFF',
        },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

export default function QTLExplorerPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(qtlContent.defaults.mode);

  const [geneInput, setGeneInput] = useState('');
  const [snpInput, setSnpInput] = useState('');
  const [geneValid, setGeneValid] = useState(false);
  const [snpValid, setSnpValid] = useState(false);

  const selectedMode = useMemo(
    () => qtlContent.modes.find((item) => item.id === mode) || qtlContent.modes[0],
    [mode]
  );

  const modeIcon = {
    gene: <BiotechOutlinedIcon sx={{ color: '#2196C9', fontSize: 24 }} />,
    snp: <ScatterPlotOutlinedIcon sx={{ color: '#7E57C2', fontSize: 24 }} />,
    pair: <LinkOutlinedIcon sx={{ color: '#2E9A5C', fontSize: 24 }} />,
  };

  const hasParsedGene = Boolean(parseGeneOption(geneInput));
  const hasSnp = Boolean(normalizeSnp(snpInput));

  const canContinue =
    (mode === 'gene' && geneValid && hasParsedGene)
    || (mode === 'snp' && snpValid && hasSnp)
    || (mode === 'pair' && geneValid && snpValid && hasParsedGene && hasSnp);

  const applyExampleFill = (modeId, fill) => {
    if (modeId) {
      setMode(modeId);
    }

    const geneValue = String(fill?.gene || '').trim();
    const snpValue = String(fill?.snp || '').trim();

    if (geneValue) {
      setGeneInput(geneValue);
      setGeneValid(Boolean(parseGeneOption(geneValue)));
    }
    if (snpValue) {
      setSnpInput(snpValue);
      setSnpValid(true);
    }
  };

  const handleExampleQuestion = (exampleConfig) => {
    const modeIdFromExample = String(exampleConfig?.modeId || '').trim();
    const matchQid = exampleConfig?.matchQid;

    const targetMode = modeIdFromExample
      ? qtlContent.modes.find((item) => item.id === modeIdFromExample)
      : qtlContent.modes.find((item) => item.matchQid === matchQid);

    if (!targetMode) return;

    const fill = exampleConfig?.fill || targetMode.exampleFill;
    if (!fill) return;

    applyExampleFill(targetMode.id, fill);
  };

  const handleContinue = () => {
    if (!canContinue) return;

    const parsedGene = parseGeneOption(geneInput);
    const snp = normalizeSnp(snpInput);

    if (mode === 'gene' && parsedGene) {
      navigate(
        `/intermediate?sourceTerm=snp&relationship=QTL&targetTerm=gene@${parsedGene.id}&targetSymbol=${parsedGene.symbol}&resultLayout=new`
      );
      return;
    }

    if (mode === 'snp') {
      navigate(
        `/intermediate?sourceTerm=snp@${snp}&relationship=QTL&targetTerm=gene&resultLayout=new`
      );
      return;
    }

    if (mode === 'pair' && parsedGene) {
      navigate(
        `/intermediate?sourceTerm=snp@${snp}&relationship=QTL&targetTerm=gene@${parsedGene.id}&targetSymbol=${parsedGene.symbol}&resultLayout=new`
      );
    }
  };

  return (
    <Box sx={{ flex: 1, bgcolor: '#FFFFFF', display: 'flex', minHeight: 0 }}>
      <AgentSidebar activeNav="skills" />

      <Box sx={{ flex: 1, px: { xs: 2, md: 3 }, py: { xs: 2, md: 2.5 }, overflowY: 'auto' }}>
        <Box sx={{ maxWidth: 1280, mx: 'auto' }}>
          <Button
            startIcon={<ArrowBackIcon fontSize="small" />}
            onClick={() => navigate('/skills')}
            sx={{
              textTransform: 'none',
              color: '#64748B',
              fontFamily: 'Inter',
              fontSize: 13,
              fontWeight: 500,
              mb: 1.5,
              px: 0,
              minWidth: 0,
            }}
          >
            {qtlContent.header.backText}
          </Button>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1fr 320px' }, gap: 2.5 }}>
            <Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 270px' }, gap: 2 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.75 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#F0FDFA', border: '1px solid #99F6E4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <LinkOutlinedIcon sx={{ fontSize: 20, color: '#0F766E' }} />
                    </Box>
                    <Typography sx={{ fontFamily: 'Inter', fontWeight: 800, fontSize: { xs: 18, md: 22 }, color: '#0F172A' }}>
                      {qtlContent.header.title}
                    </Typography>
                    <Box sx={{ px: 1, py: 0.15, borderRadius: '999px', bgcolor: '#F1F5F9', color: '#64748B', fontFamily: 'Inter', fontSize: 11, fontWeight: 600, height: 22, display: 'inline-flex', alignItems: 'center' }}>
                      {qtlContent.header.version}
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, mb: 1.2, flexWrap: 'wrap' }}>
                    {qtlContent.header.badges.map((badge) => (
                      <Box key={badge} sx={{ px: 1.1, py: 0.15, borderRadius: '999px', bgcolor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', fontFamily: 'Inter', fontSize: 11, fontWeight: 600, height: 22, display: 'inline-flex', alignItems: 'center' }}>
                        {badge}
                      </Box>
                    ))}
                  </Box>

                  {qtlContent.header.descriptionLines.map((line) => (
                    <Typography key={line} sx={{ fontFamily: 'Inter', fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
                      {line}
                    </Typography>
                  ))}
                </Box>

                <Box sx={{ border: '1px solid #E4EAF2', borderRadius: '14px', p: 2, alignSelf: 'start' }}>
                  <Typography sx={{ color: '#173B8C', fontWeight: 800, fontSize: 36 / 1.8 }}>
                    {qtlContent.stats.count}
                  </Typography>
                  <Typography sx={{ color: '#173B8C', fontWeight: 700, fontSize: 28 / 1.8 }}>
                    {qtlContent.stats.label}
                  </Typography>
                  <Typography sx={{ color: '#224488', mb: 1.5 }}>
                    {qtlContent.stats.subLabel}
                  </Typography>
                  <Button
                    endIcon={<ShortcutOutlinedIcon fontSize="small" />}
                    onClick={() => navigate('/qtldatasource')}
                    sx={{ textTransform: 'none', bgcolor: '#EEF8FC', color: '#12739B', fontWeight: 700, borderRadius: '10px' }}
                  >
                    {qtlContent.stats.buttonText}
                  </Button>
                </Box>
              </Box>

              <Box sx={{ border: '1px solid #E5EBF3', borderRadius: '14px', mt: 2, p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
                  <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#0F8AA7', color: '#fff', fontWeight: 800, fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    1
                  </Box>
                  <Typography sx={{ color: '#173B8C', fontWeight: 800, fontSize: 32 / 1.8 }}>
                    {qtlContent.configureSection.title}
                  </Typography>
                </Box>
                <Typography sx={{ color: '#2E4F8F', mb: 1.5 }}>
                  {qtlContent.configureSection.subtitle}
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                  {qtlContent.modes.map((item) => {
                    const selected = mode === item.id;
                    return (
                      <Box
                        key={item.id}
                        onClick={() => setMode(item.id)}
                        sx={{
                          border: selected ? '2px solid #53B8D8' : '1px solid #DEE6F0',
                          borderRadius: '12px',
                          p: 1.5,
                          cursor: 'pointer',
                          minHeight: 182,
                          bgcolor: '#FFFFFF',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
                          <Box sx={{ width: 20, height: 20, borderRadius: '50%', border: selected ? '2px solid #25A7C9' : '2px solid #C0CCDD', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            {selected ? <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#25A7C9' }} /> : null}
                          </Box>
                          {modeIcon[item.id]}
                          <Typography sx={{ color: '#173B8C', fontWeight: 700, fontSize: 17 }}>
                            {item.title}
                          </Typography>
                        </Box>
                        <Typography sx={{ color: '#1E3F7C', fontSize: 30 / 1.8, minHeight: 78 }}>
                          {item.description}
                        </Typography>
                        <Typography sx={{ color: '#6C7E9D', fontWeight: 700, fontSize: 12, mt: 0.2 }}>
                          {item.exampleLabel}
                        </Typography>
                        <Box
                          onClick={(event) => {
                            event.stopPropagation();
                            handleExampleQuestion({
                              modeId: item.id,
                              matchQid: item.matchQid,
                              fill: item.exampleFill,
                            });
                          }}
                          sx={{
                            mt: 0.5,
                            px: 1,
                            py: 0.7,
                            borderRadius: '10px',
                            bgcolor: '#ECF5F8',
                            color: '#1D6E95',
                            fontSize: 15,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: '#DCEFF6' },
                          }}
                        >
                          {item.exampleQuestion}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>

                <Box sx={{ mt: 1.6, borderRadius: '10px', bgcolor: '#F2F7FB', p: 1.8 }}>
                  <Typography sx={{ color: '#173B8C', fontWeight: 700, fontSize: 28 / 1.8 }}>
                    {selectedMode.searchTitle}
                  </Typography>
                  <Typography sx={{ color: '#2E4F8F', mb: 1.3, fontSize: 28 / 1.8 }}>
                    {selectedMode.searchHint}
                  </Typography>

                  <Box sx={{ display: 'grid', gridTemplateColumns: selectedMode.secondaryLabel ? { xs: '1fr', md: '1fr 1fr' } : '1fr', gap: 1.5 }}>
                    <Box>
                      <QtlTermAutocomplete
                        type={selectedMode.primaryLabel === 'Gene' ? 'gene' : 'snp'}
                        label={selectedMode.primaryLabel}
                        placeholder={selectedMode.primaryPlaceholder}
                        value={selectedMode.primaryLabel === 'Gene' ? geneInput : snpInput}
                        onChange={selectedMode.primaryLabel === 'Gene' ? setGeneInput : setSnpInput}
                        defaultOptions={selectedMode.primaryLabel === 'Gene' ? qtlContent.defaults.geneOptions : qtlContent.defaults.snpOptions}
                        onValidated={(ok, normalized) => {
                          if (selectedMode.primaryLabel === 'Gene') {
                            setGeneValid(ok);
                            if (ok && normalized) setGeneInput(normalized);
                          } else {
                            setSnpValid(ok);
                            if (ok && normalized) setSnpInput(normalized);
                          }
                        }}
                      />
                      <Typography sx={{ color: '#6A7FA7', mt: 0.6, fontSize: 14 }}>
                        {selectedMode.primaryExamples}
                      </Typography>
                    </Box>

                    {selectedMode.secondaryLabel ? (
                      <Box>
                        <QtlTermAutocomplete
                          type={selectedMode.secondaryLabel === 'Gene' ? 'gene' : 'snp'}
                          label={selectedMode.secondaryLabel}
                          placeholder={selectedMode.secondaryPlaceholder}
                          value={selectedMode.secondaryLabel === 'Gene' ? geneInput : snpInput}
                          onChange={selectedMode.secondaryLabel === 'Gene' ? setGeneInput : setSnpInput}
                          defaultOptions={selectedMode.secondaryLabel === 'Gene' ? qtlContent.defaults.geneOptions : qtlContent.defaults.snpOptions}
                          onValidated={(ok, normalized) => {
                            if (selectedMode.secondaryLabel === 'Gene') {
                              setGeneValid(ok);
                              if (ok && normalized) setGeneInput(normalized);
                            } else {
                              setSnpValid(ok);
                              if (ok && normalized) setSnpInput(normalized);
                            }
                          }}
                        />
                        <Typography sx={{ color: '#6A7FA7', mt: 0.6, fontSize: 14 }}>
                          {selectedMode.secondaryExamples}
                        </Typography>
                      </Box>
                    ) : null}
                  </Box>

                  <Box sx={{ mt: 1.4, border: '1px solid #DCE9F2', borderRadius: '9px', px: 1.2, py: 0.9, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <InfoOutlinedIcon sx={{ color: '#2A85A5', fontSize: 18 }} />
                    <Typography sx={{ color: '#2B4E88', fontSize: 15 }}>{qtlContent.shared.infoBar}</Typography>
                  </Box>
                </Box>

                <Box sx={{ mt: 1.6, borderRadius: '10px', bgcolor: '#EEF5FB', p: 1.8 }}>
                  <Typography sx={{ color: '#173B8C', fontWeight: 800, fontSize: 30 / 1.8, mb: 0.6 }}>
                    {qtlContent.shared.whatNextTitle}
                  </Typography>
                  <Typography sx={{ color: '#2E4F8F', mb: 1.2, maxWidth: 530, fontSize: 27 / 1.8 }}>
                    {qtlContent.shared.whatNextDescription}
                  </Typography>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr auto 1fr' }, alignItems: 'center', gap: 1 }}>
                    {qtlContent.shared.workflow.map((step, index) => (
                      <React.Fragment key={step.title}>
                        <Box
                          sx={{
                            border: '1px solid #D4E1EE',
                            borderRadius: '12px',
                            bgcolor: index === 0 ? '#FDEED9' : index === 2 ? '#FCE7E7' : '#F5FBFF',
                            px: 1.2,
                            py: 1,
                            textAlign: 'center',
                            minHeight: 90,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography sx={{ color: '#243E6A', fontWeight: 700, fontSize: 17 }}>{step.title}</Typography>
                          <Typography sx={{ color: '#2E4F8F', fontSize: 15 }}>{step.text}</Typography>
                        </Box>
                        {index < qtlContent.shared.workflow.length - 1 ? (
                          <ArrowForwardIcon sx={{ color: '#91A7C8', fontSize: 26, justifySelf: 'center' }} />
                        ) : null}
                      </React.Fragment>
                    ))}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1.5, gap: 0.9 }}>
                  <Button
                    onClick={handleContinue}
                    disabled={!canContinue}
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      textTransform: 'none',
                      minWidth: 360,
                      maxWidth: '100%',
                      height: 44,
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: 22 / 1.8,
                      color: '#FFFFFF',
                      bgcolor: canContinue ? '#0898B8' : '#94B7C5',
                      '&:hover': {
                        bgcolor: canContinue ? '#057E9A' : '#94B7C5',
                      },
                    }}
                  >
                    {qtlContent.shared.continueButton}
                  </Button>

                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.7 }}>
                    <SecurityOutlinedIcon sx={{ fontSize: 16, color: '#3B7A9B' }} />
                    <Typography sx={{ color: '#305F8C', fontSize: 14 }}>{qtlContent.shared.securityNote}</Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ mt: 2, border: '1px solid #E5EBF3', borderRadius: '14px', px: 1.2, py: 1.1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  fullWidth
                  disabled
                  placeholder={qtlContent.shared.bottomSearchPlaceholder}
                  InputProps={{
                    sx: {
                      height: 46,
                      borderRadius: '10px',
                      bgcolor: '#FFFFFF',
                    },
                  }}
                />
                <Button
                  disabled
                  sx={{ minWidth: 46, width: 46, height: 46, borderRadius: '10px', bgcolor: '#D2E7EE' }}
                >
                  <SendOutlinedIcon sx={{ color: '#6A9BB0' }} />
                </Button>
              </Box>
              <Box sx={{ px: 0.5, mt: 0.6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography sx={{ color: '#6A7FA7', fontSize: 13 }}>{qtlContent.shared.bottomSearchHint}</Typography>
                <Typography sx={{ color: '#2B79A0', fontSize: 14, fontWeight: 600 }}>{qtlContent.shared.poweredBy}</Typography>
              </Box>
            </Box>

            <Box sx={{ border: '1px solid #E5EBF3', borderRadius: '14px', alignSelf: 'start' }}>
              <Box sx={{ p: 2 }}>
                <Typography sx={{ color: '#173B8C', fontWeight: 800, fontSize: 30 / 1.8, mb: 1 }}>{qtlContent.rightPanel.aboutTitle}</Typography>
                <Typography sx={{ color: '#1E3F7C', fontSize: 32 / 1.8, lineHeight: 1.5 }}>{qtlContent.rightPanel.aboutBody}</Typography>
              </Box>
              <Box sx={{ borderTop: '1px solid #E5EBF3', p: 2 }}>
                <Typography sx={{ color: '#173B8C', fontWeight: 800, fontSize: 30 / 1.8, mb: 1 }}>{qtlContent.rightPanel.importantTitle}</Typography>
                {qtlContent.rightPanel.importantBodyLines.map((line) => (
                  <Typography key={line} sx={{ color: '#1E3F7C', fontSize: 32 / 1.8, lineHeight: 1.5 }}>
                    {line}
                  </Typography>
                ))}
              </Box>
              <Box sx={{ borderTop: '1px solid #E5EBF3', p: 2 }}>
                <Typography sx={{ color: '#173B8C', fontWeight: 800, fontSize: 30 / 1.8, mb: 1 }}>{qtlContent.rightPanel.whyTitle}</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {qtlContent.rightPanel.whyItems.map((item) => (
                    <Box key={item} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <CheckIcon sx={{ color: '#1A9DC0', fontSize: 18, mt: 0.2 }} />
                      <Typography sx={{ color: '#1E3F7C', fontSize: 32 / 1.8, lineHeight: 1.45 }}>{item}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box sx={{ borderTop: '1px solid #E5EBF3', p: 2 }}>
                <Typography sx={{ color: '#173B8C', fontWeight: 800, fontSize: 30 / 1.8, mb: 1 }}>{qtlContent.rightPanel.examplesTitle}</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1 }}>
                  {qtlContent.rightPanel.examples.map((item) => {
                    const exampleText = typeof item === 'string' ? item : item.text;
                    const matchQid = typeof item === 'string' ? undefined : item.matchQid;

                    return (
                    <Box
                      key={exampleText}
                      onClick={() => handleExampleQuestion(item)}
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1,
                        cursor: matchQid ? 'pointer' : 'default',
                        borderRadius: '8px',
                        px: 0.4,
                        py: 0.2,
                        '&:hover': matchQid ? { bgcolor: '#F2F8FC' } : undefined,
                      }}
                    >
                      <InfoOutlinedIcon sx={{ color: '#1A9DC0', fontSize: 17, mt: 0.2 }} />
                      <Typography sx={{ color: '#0F5E95', fontSize: 16, lineHeight: 1.45 }}>{exampleText}</Typography>
                    </Box>
                  )})}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
