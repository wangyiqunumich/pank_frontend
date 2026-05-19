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
import BackupTableIcon from '@mui/icons-material/BackupTable';
import BiotechOutlinedIcon from '@mui/icons-material/BiotechOutlined';
import CheckIcon from '@mui/icons-material/Check';
import ContactSupportOutlinedIcon
  from '@mui/icons-material/ContactSupportOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import IosShareOutlinedIcon from '@mui/icons-material/IosShareOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import ScatterPlotOutlinedIcon from '@mui/icons-material/ScatterPlotOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';

import AgentSidebar from '../components/AgentSidebar';
import BoxSvg from '../image/Box.svg';
import VectorSvg from '../image/Vector.svg';
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
        fontFamily: 'Inter',
        fontSize: 12,
        '& .MuiOutlinedInput-root': {
          borderRadius: '4px',
          height: 32,
          fontSize: 12,
          fontFamily: 'Inter',
          bgcolor: '#FFFFFF',
        },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          ref={params.InputProps.ref}
          label={label}
          placeholder={placeholder}
          InputLabelProps={{
            shrink: true,
            sx: {
              fontFamily: 'Inter',
              fontSize: 12,
              transform: 'translate(14px, -5px) scale(0.75)'
            },
          }}
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

  const getModeDefaultOptions = (modeConfig, fieldType) => {
    const modeDefaults = modeConfig?.defaults || {};
    const sharedDefaults = qtlContent.defaults || {};
    if (fieldType === 'gene') {
      return modeDefaults.geneOptions || sharedDefaults.geneOptions || [];
    }
    return modeDefaults.snpOptions || sharedDefaults.snpOptions || [];
  };

  const renderModeIcon = (icon) => (
    <Box
      sx={{
        width: 24,
        height: 24,
        borderRadius: '4px',
        bgcolor: '#E9F6F7',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </Box>
  );

  const modeIcon = {
    gene: renderModeIcon(<BiotechOutlinedIcon sx={{ color: '#3A838B', fontSize: 16 }} />),
    snp: renderModeIcon(<ScatterPlotOutlinedIcon sx={{ color: '#3A838B', fontSize: 16 }} />),
    pair: renderModeIcon(<LinkOutlinedIcon sx={{ color: '#3A838B', fontSize: 16 }} />),
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
    <Box sx={{ flex: 1, bgcolor: '#FFFFFF', display: 'flex', minHeight: 0, fontFamily: 'Inter', fontSize: 12, lineHeight: 1.4 }}>
      <AgentSidebar activeNav="skills" />

      <Box
        sx={{
          flex: 1,
          px: { xs: 2, md: 3 },
          py: { xs: 2, md: 2 },
          overflowY: 'auto',
          fontFamily: 'Inter',
          fontSize: 12,
          lineHeight: 1.4,
          '& .MuiTypography-root': {
            fontFamily: 'Inter',
            fontWeight: 400,
            lineHeight: 1.4,
          },
          '& .MuiButton-root': {
            fontFamily: 'Inter',
            fontSize: 12,
            fontWeight: 400,
            lineHeight: 1.4,
          },
        }}
      >
        <Box sx={{ maxWidth: 1440, mx: 'auto' }}>
          <Button
            startIcon={<ArrowBackIcon fontSize="12px" />}
            onClick={() => navigate('/skills')}
            sx={{
              textTransform: 'none',
              color: '#2F6F6A',
              fontFamily: 'Inter',
              fontSize: 12,
              fontWeight: 400,
              mb: 1.5,
              px: 0,
              py: 0,
              minWidth: 0,
            }}
          >
            {qtlContent.header.backText}
          </Button>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '9fr 3fr' }, gap: 2.5 }}>
            <Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '7fr 2fr' }, gap: 2 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Box sx={{ width: 24, height: 24, borderRadius: '15px', bgcolor: '#6669B0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Box component="img" src={BoxSvg} alt="Box" sx={{ width: 16, height: 16 }} />
                    </Box>
                    <Typography sx={{ fontFamily: 'Inter', fontWeight: '500 !important', fontSize: 20, color: '#0F172A' }}>
                      {qtlContent.header.title}
                    </Typography>
                    <Box sx={{ px: 1, py: 0.15, borderRadius: '999px', bgcolor: '#F1F5F9', color: '#64748B', fontFamily: 'Inter', fontSize: 10, fontWeight: 400, height: 22, display: 'inline-flex', alignItems: 'center' }}>
                      {qtlContent.header.version}
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    {qtlContent.header.badges.map((badge) => (
                      <Box key={badge} sx={{ px: 1.1, py: 0.25, borderRadius: '999px', bgcolor: '#EBF0F6', color: '#444D6C', fontFamily: 'Inter', fontSize: 10, fontWeight: 400, height: 10, display: 'inline-flex', alignItems: 'center' }}>
                        {badge}
                      </Box>
                    ))}
                  </Box>

                  {qtlContent.header.descriptionLines.map((line) => (
                    <Typography key={line} sx={{ fontFamily: 'Inter', fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>
                      {line}
                    </Typography>
                  ))}
                </Box>

                <Box sx={{ borderRadius: '14px', p: 0, alignSelf: 'start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '4px',
                        bgcolor: '#E9F6F7',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <BackupTableIcon sx={{ fontSize: 16, color: '#3A838B' }} />
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#000000', fontWeight: '600 !important', fontSize: 14 }}>
                        {qtlContent.stats.count}
                      </Typography>
                      <Typography sx={{ color: '#000000', fontWeight: '500 !important', fontSize: 12 }}>
                        {qtlContent.stats.label}
                      </Typography>
                      <Typography sx={{ color: '#000000', fontSize: 12 }}>
                        {qtlContent.stats.subLabel}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    fullWidth
                    endIcon={<IosShareOutlinedIcon fontSize="inherit" />}
                    onClick={() => navigate('/qtldatasource')}
                    sx={{
                      width: '100%',
                      height: '24px',
                      textTransform: 'none',
                      bgcolor: '#EEF8FC',
                      color: '#3A838B',
                      fontWeight: 500,
                      borderRadius: '4px',
                      fontSize: 10,
                      '& .MuiButton-endIcon .MuiSvgIcon-root': {
                        fontSize: 12,
                      },
                    }}
                  >
                    {qtlContent.stats.buttonText}
                  </Button>
                </Box>
              </Box>

              <Box sx={{ borderRadius: '14px', mt: 2, p: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#3A838B', color: '#fff', fontWeight: '500 !important', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    1
                  </Box>
                  <Typography sx={{ color: 'black', fontWeight: '500 !important', fontSize: 14 }}>
                    {qtlContent.configureSection.title}
                  </Typography>
                </Box>
                <Typography sx={{ color: '#2E4F8F', mb: 1.5, fontSize: 12 }}>
                  {qtlContent.configureSection.subtitle}
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, alignItems: 'stretch', gap: 1.5 }}>
                  {qtlContent.modes.map((item) => {
                    const selected = mode === item.id;
                    return (
                      <Box
                        key={item.id}
                        onClick={() => setMode(item.id)}
                        sx={{
                          border: selected ? '1px solid #3A838B' : '1px solid #DEE6F0',
                          borderRadius: '12px',
                          p: 1.5,
                          cursor: 'pointer',
                          bgcolor: '#FFFFFF',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Box sx={{ width: 16, height: 16, borderRadius: '50%', border: selected ? '1px solid #3A838B' : '1px solid #C0CCDD', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            {selected ? <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#3A838B' }} /> : null}
                          </Box>
                          {modeIcon[item.id]}
                          <Typography sx={{ color: 'black', fontWeight: '500 !important', fontSize: 14 }}>
                            {item.title}
                          </Typography>
                        </Box>
                        <Typography sx={{ color: '#4B5563', fontSize: 12, mb: 1.5 }}>
                          {item.description}
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
                            mt: 'auto',
                            px: 1,
                            py: 0.7,
                            height: 54,
                            borderRadius: '10px',
                            bgcolor: '#E9F6F7',
                            color: '#1D6E95',
                            fontSize: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: '#DCEFF6' },
                          }}
                        >
                          <Typography sx={{ color: '#6C7E9D', fontWeight: 400, fontSize: 10, mb: 0.3 }}>
                            {item.exampleLabel}
                          </Typography>
                          <Typography sx={{ color: '#007A8D', fontWeight: 400, fontSize: 12 }}>
                            {item.exampleQuestion}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, mb: 1.5 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#3A838B', color: '#fff', fontWeight: '500 !important', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    2
                  </Box>
                  <Typography sx={{ color: 'black', fontWeight: '500 !important', fontSize: 14 }}>
                    {selectedMode.searchTitle}
                  </Typography>
                </Box>

                <Box sx={{ borderRadius: '10px', bgcolor: '#F5F9FC', p: 1.8 }}>
                  <Typography sx={{ color: '#4B5563', mb: 2, fontSize: 12 }}>
                    {selectedMode.searchHint}
                  </Typography>

                  <Box sx={{ display: 'grid', gridTemplateColumns: selectedMode.secondaryLabel ? { xs: '1fr', md: '1fr 1fr' } : '1fr', gap: 1.5 }}>
                    <Box>
                      {(() => {
                        const primaryType = selectedMode.primaryLabel === 'Gene' ? 'gene' : 'snp';
                        return (
                      <QtlTermAutocomplete
                        type={primaryType}
                        label={selectedMode.primaryLabel}
                        placeholder={selectedMode.primaryPlaceholder}
                        value={selectedMode.primaryLabel === 'Gene' ? geneInput : snpInput}
                        onChange={selectedMode.primaryLabel === 'Gene' ? setGeneInput : setSnpInput}
                        defaultOptions={getModeDefaultOptions(selectedMode, primaryType)}
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
                        );
                      })()}
                      <Typography sx={{ color: '#8F8F8F', mt: 0.75, fontSize: 10 }}>
                        {selectedMode.primaryExamples}
                      </Typography>
                    </Box>

                    {selectedMode.secondaryLabel ? (
                      <Box>
                        {(() => {
                          const secondaryType = selectedMode.secondaryLabel === 'Gene' ? 'gene' : 'snp';
                          return (
                        <QtlTermAutocomplete
                          type={secondaryType}
                          label={selectedMode.secondaryLabel}
                          placeholder={selectedMode.secondaryPlaceholder}
                          value={selectedMode.secondaryLabel === 'Gene' ? geneInput : snpInput}
                          onChange={selectedMode.secondaryLabel === 'Gene' ? setGeneInput : setSnpInput}
                          defaultOptions={getModeDefaultOptions(selectedMode, secondaryType)}
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
                          );
                        })()}
                        <Typography sx={{ color: '#8F8F8F', mt: 0.75, fontSize: 10 }}>
                          {selectedMode.secondaryExamples}
                        </Typography>
                      </Box>
                    ) : null}
                  </Box>

                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <InfoOutlinedIcon sx={{ color: '#2A85A5', fontSize: 18 }} />
                    <Typography sx={{ color: '#4B5563', fontSize: 12 }}>{qtlContent.shared.infoBar}</Typography>
                  </Box>
                </Box>

                <Box sx={{ mt: 2}}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.6fr' }, gap: 1.6, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.8 }}>
                      <Box component="img" src={VectorSvg} alt="Vector" sx={{ width: 12, height: 12, flexShrink: 0, mt: 0.2 }} />
                      <Box>
                        <Typography sx={{ color: 'black', fontWeight: '500 !important', fontSize: 10, mb: 0.2 }}>
                          {qtlContent.shared.whatNextTitle}
                        </Typography>
                        <Typography sx={{ color: '#4B5563', fontSize: 9 }}>
                          {qtlContent.shared.whatNextDescription}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr auto 1fr' }, alignItems: 'center', gap: 1 }}>
                      {qtlContent.shared.workflow.map((step, index) => (
                        <React.Fragment key={step.title}>
                          <Box
                            sx={{
                              border: '1px solid #E2E8F0',
                              borderRadius: '6px',
                              bgcolor: index === 0 ? '#FDEED9' : index === 2 ? '#FCE7E7' : '#F5FBFF',
                              px: '24px',
                              height: '60px',
                              textAlign: 'center',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography sx={{ color: '#243E6A', fontWeight: '500 !important', fontSize: 9 }}>{step.title}</Typography>
                            <Typography sx={{ color: '#2E4F8F', fontSize: 9, pt: 0.75 }}>{step.text}</Typography>
                          </Box>
                          {index < qtlContent.shared.workflow.length - 1 ? (
                            <ArrowForwardIcon sx={{ color: '#91A7C8', fontSize: 26, justifySelf: 'center' }} />
                          ) : null}
                        </React.Fragment>
                      ))}
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 3, gap: 0.9 }}>
                  <Button
                    onClick={handleContinue}
                    disabled={!canContinue}
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      textTransform: 'none',
                      minWidth: 540,
                      maxWidth: '100%',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: 12,
                      p: '10px',
                      color: '#FFFFFF',
                      bgcolor: canContinue ? '#3A838B' : '#94B7C5',
                      '&:hover': {
                        bgcolor: canContinue ? '#327077' : '#94B7C5',
                      },
                      '&.Mui-disabled': {
                        color: '#FFFFFF',
                      },
                    }}
                  >
                    {qtlContent.shared.continueButton}
                  </Button>

                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.7 }}>
                    <SecurityOutlinedIcon sx={{ fontSize: 16, color: '#3B7A9B' }} />
                      <Typography sx={{ color: '#305F8C', fontSize: 12 }}>{qtlContent.shared.securityNote}</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            <Box sx={{ border: '1px solid #E5EBF3', borderRadius: '14px', alignSelf: 'start' }}>
              <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 1 }}>
                  <InfoOutlinedIcon sx={{ color: '#1E3F7C', fontSize: 20 }} />
                  <Typography sx={{ color: '#1E3F7C', fontWeight: '500 !important', fontSize: 12 }}>
                    {qtlContent.rightPanel.aboutTitle}
                  </Typography>
                </Box>
                <Typography sx={{ color: 'black', fontSize: 12, lineHeight: 1.4 }}>{qtlContent.rightPanel.aboutBody}</Typography>
              </Box>
              <Box sx={{ borderTop: '1px solid #E5EBF3', p: 2 }}>
                <Typography sx={{ color: '#1E3F7C', fontWeight: '500 !important', fontSize: 12, mb: 1 }}>{qtlContent.rightPanel.importantTitle}</Typography>
                {qtlContent.rightPanel.importantBodyLines.map((line) => (
                  <Typography key={line} sx={{ color: 'black', fontSize: 12, lineHeight: 1.4 }}>
                    {line}
                  </Typography>
                ))}
              </Box>
              <Box sx={{ borderTop: '1px solid #E5EBF3', p: 2 }}>
                <Typography sx={{ color: '#1E3F7C', fontWeight: '500 !important', fontSize: 12, mb: 1 }}>{qtlContent.rightPanel.whyTitle}</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {qtlContent.rightPanel.whyItems.map((item) => (
                    <Box key={item} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <CheckIcon sx={{ color: '#1A9DC0', fontSize: 18, mt: 0.2 }} />
                      <Typography sx={{ color: '#007A8D', fontSize: 12, lineHeight: 1.4 }}>{item}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box sx={{ borderTop: '1px solid #E5EBF3', p: 2 }}>
                <Typography sx={{ color: '#1E3F7C', fontWeight: '500 !important', fontSize: 12, mb: 1 }}>{qtlContent.rightPanel.examplesTitle}</Typography>
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
                      <ContactSupportOutlinedIcon sx={{ color: '#1A9DC0', fontSize: 17, mt: 0.2 }} />
                      <Typography sx={{ color: '#007A8D', fontSize: 12, lineHeight: 1.4 }}>{exampleText}</Typography>
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
