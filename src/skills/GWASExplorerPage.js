import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import { useDispatch } from 'react-redux';
import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckIcon from '@mui/icons-material/Check';
import DataObjectOutlinedIcon from '@mui/icons-material/DataObjectOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import ShortcutOutlinedIcon from '@mui/icons-material/ShortcutOutlined';
import TrackChangesOutlinedIcon from '@mui/icons-material/TrackChangesOutlined';
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
import gwasContent from './gwasExplorerContent.json';

function normalizeSnp(value) {
  return String(value || '').trim();
}

function GwasSnpAutocomplete({ value, onChange, defaultOptions, onValidated }) {
  const dispatch = useDispatch();
  const [options, setOptions] = useState(defaultOptions || []);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setOptions(defaultOptions || []);
  }, [defaultOptions]);

  const validateSnp = async (input) => {
    const snp = normalizeSnp(input);
    if (!snp) {
      onValidated(false, '');
      return;
    }

    try {
      const response = await dispatch(queryQueryResult({
        isNeptune: false,
        rawResponse: true,
        query: `SELECT snp FROM GWAS_DATA WHERE snp = '${snp}' LIMIT 1;`,
      })).unwrap();
      const found = response?.results?.[0]?.snp;
      if (found) {
        onValidated(true, String(found));
      } else {
        onValidated(false, '');
      }
    } catch (error) {
      onValidated(false, '');
    }
  };

  const runSuggestion = async (rawInput) => {
    const input = normalizeSnp(rawInput);
    if (!input) {
      setOptions(defaultOptions || []);
      return;
    }

    const filtered = (defaultOptions || []).filter((item) => item.toLowerCase().includes(input.toLowerCase()));
    setOptions(filtered.length ? filtered : defaultOptions || []);

    setLoading(true);
    try {
      await validateSnp(input);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Autocomplete
      freeSolo
      value={value}
      options={options}
      filterOptions={(x) => x}
      onChange={(_, nextValue) => {
        const finalValue = String(nextValue || '');
        onChange(finalValue);
        validateSnp(finalValue);
      }}
      onInputChange={(_, nextInputValue) => {
        const finalValue = String(nextInputValue || '');
        onChange(finalValue);
        onValidated(false, '');

        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
          runSuggestion(finalValue);
        }, 250);
      }}
      onBlur={() => validateSnp(value)}
      loading={loading}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: '10px',
          height: 50,
          fontSize: 18,
          fontFamily: 'Inter, sans-serif',
          bgcolor: '#FFFFFF',
        },
        '& .MuiInputBase-input': {
          fontFamily: 'Inter, sans-serif',
        },
        '& .MuiInputLabel-root': {
          fontFamily: 'Inter, sans-serif',
        },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={gwasContent.configureSection.snpLabel}
          placeholder={gwasContent.configureSection.snpPlaceholder}
          InputLabelProps={{ shrink: true, sx: { fontFamily: 'Inter, sans-serif' } }}
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

export default function GWASExplorerPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [snpInput, setSnpInput] = useState('');
  const [snpValid, setSnpValid] = useState(false);

  const hasSnp = Boolean(normalizeSnp(snpInput));
  const canContinue = hasSnp;

  const navigateToMatchWithNewUi = (qid) => {
    if (!qid && qid !== 0) return;
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
    navigate(`/match?qid=${qid}&returnTo=${returnTo}`);
  };

  const handleContinue = () => {
    if (!canContinue) return;
    const snp = normalizeSnp(snpInput);
    navigate(`/result-new?sourceTerm=snp@${snp}&relationship=GWAS&targetTerm=disease`);
  };

  return (
    <Box sx={{ flex: 1, bgcolor: '#FFFFFF', display: 'flex', minHeight: 0 }}>
      <AgentSidebar activeNav="skills" />

      <Box
        sx={{
          flex: 1,
          px: { xs: 2, md: 3 },
          py: { xs: 2, md: 2.5 },
          overflowY: 'auto',
          fontFamily: 'Inter, sans-serif',
          '& .MuiTypography-root': {
            fontFamily: 'Inter, sans-serif',
          },
          '& .MuiButton-root': {
            fontFamily: 'Inter, sans-serif',
          },
          '& .MuiInputBase-input': {
            fontFamily: 'Inter, sans-serif',
          },
          '& .MuiInputLabel-root': {
            fontFamily: 'Inter, sans-serif',
          },
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: 'auto' }}>
          <Button
            startIcon={<ArrowBackIcon fontSize="small" />}
            onClick={() => navigate('/skills')}
            sx={{ textTransform: 'none', color: '#64748B', fontFamily: 'Inter', fontSize: 13, fontWeight: 500, mb: 1.5, px: 0, minWidth: 0 }}
          >
            {gwasContent.header.backText}
          </Button>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1fr 320px' }, gap: 2.5 }}>
            <Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 270px' }, gap: 2 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.75 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#EEF2FF', border: '1px solid #C4B5FD', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <DataObjectOutlinedIcon sx={{ fontSize: 20, color: '#7C3AED' }} />
                    </Box>
                    <Typography sx={{ fontFamily: 'Inter', fontWeight: 800, fontSize: { xs: 18, md: 22 }, color: '#0F172A' }}>
                      {gwasContent.header.title}
                    </Typography>
                    <Box sx={{ px: 1, py: 0.15, borderRadius: '999px', bgcolor: '#F1F5F9', color: '#64748B', fontFamily: 'Inter', fontSize: 11, fontWeight: 600, height: 22, display: 'inline-flex', alignItems: 'center' }}>
                      {gwasContent.header.version}
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, mb: 1.2, flexWrap: 'wrap' }}>
                    {gwasContent.header.badges.map((badge) => (
                      <Box key={badge} sx={{ px: 1.1, py: 0.15, borderRadius: '999px', bgcolor: '#ECF5FF', color: '#0369A1', border: '1px solid #BAE6FD', fontFamily: 'Inter', fontSize: 11, fontWeight: 600, height: 22, display: 'inline-flex', alignItems: 'center' }}>
                        {badge}
                      </Box>
                    ))}
                  </Box>

                  {gwasContent.header.descriptionLines.map((line) => (
                    <Typography key={line} sx={{ fontFamily: 'Inter', fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
                      {line}
                    </Typography>
                  ))}
                </Box>

                <Box sx={{ border: '1px solid #E4EAF2', borderRadius: '14px', p: 2, alignSelf: 'start' }}>
                  <Typography sx={{ color: '#173B8C', fontWeight: 800, fontSize: 36 / 1.8, whiteSpace: 'nowrap' }}>
                    {gwasContent.stats.count} {gwasContent.stats.label}
                  </Typography>
                  <Typography sx={{ color: '#224488', mb: 1.5 }}>
                    {gwasContent.stats.subLabel}
                  </Typography>
                  <Button
                    endIcon={<ShortcutOutlinedIcon fontSize="small" />}
                    onClick={() => navigate('/qtldatasource')}
                    sx={{ textTransform: 'none', bgcolor: '#EEF8FC', color: '#12739B', fontWeight: 700, borderRadius: '10px' }}
                  >
                    {gwasContent.stats.buttonText}
                  </Button>
                </Box>
              </Box>

              <Box sx={{ border: '1px solid #E5EBF3', borderRadius: '14px', mt: 2, p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8 }}>
                  <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#0F8AA7', color: '#fff', fontWeight: 800, fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    1
                  </Box>
                  <Typography sx={{ color: '#173B8C', fontWeight: 800, fontSize: 32 / 1.8 }}>
                    {gwasContent.configureSection.title}
                  </Typography>
                </Box>

                <Typography sx={{ color: '#2E4F8F', mb: 1.5 }}>
                  {gwasContent.configureSection.stepTitle}
                </Typography>

                <GwasSnpAutocomplete
                  value={snpInput}
                  onChange={setSnpInput}
                  defaultOptions={gwasContent.defaults.snpOptions}
                  onValidated={(ok, normalized) => {
                    setSnpValid(ok);
                    if (ok && normalized) setSnpInput(normalized);
                  }}
                />
                <Typography sx={{ color: '#6A7FA7', mt: 0.6, fontSize: 14 }}>
                  {gwasContent.configureSection.snpExamples}
                </Typography>

                <Box sx={{ mt: 1.4, border: '1px solid #DCE9F2', borderRadius: '9px', px: 1.2, py: 0.9, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <InfoOutlinedIcon sx={{ color: '#2A85A5', fontSize: 18 }} />
                  <Typography sx={{ color: '#2B4E88', fontSize: 15 }}>
                    {gwasContent.shared.traitTitle}: {gwasContent.shared.traitText}
                  </Typography>
                </Box>

              <Box sx={{ mt: 1.6, borderRadius: '10px', bgcolor: '#EEF5FB', p: 1.8 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.6 }}>
                  <TrackChangesOutlinedIcon sx={{ color: '#2E8AA9', fontSize: 24 }} />
                  <Typography sx={{ color: '#173B8C', fontWeight: 800, fontSize: 30 / 1.8 }}>
                    {gwasContent.shared.whatNextTitle}
                  </Typography>
                </Box>
                <Typography sx={{ color: '#2E4F8F', mb: 1.2, maxWidth: 620, fontSize: 27 / 1.8 }}>
                  {gwasContent.shared.whatNextDescription}
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr auto 1fr' }, alignItems: 'center', gap: 1 }}>
                  {gwasContent.shared.workflow.map((step, index) => (
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
                        {step.text ? <Typography sx={{ color: '#2E4F8F', fontSize: 15 }}>{step.text}</Typography> : null}
                      </Box>
                      {index < gwasContent.shared.workflow.length - 1 ? (
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
                  {gwasContent.shared.continueButton}
                </Button>

                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.7 }}>
                  <SecurityOutlinedIcon sx={{ fontSize: 16, color: '#3B7A9B' }} />
                  <Typography sx={{ color: '#305F8C', fontSize: 14 }}>{gwasContent.shared.securityNote}</Typography>
                </Box>
              </Box>

              <Box sx={{ mt: 2, border: '1px solid #E5EBF3', borderRadius: '14px', px: 1.2, py: 1.1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  fullWidth
                  disabled
                  placeholder={gwasContent.shared.bottomSearchPlaceholder}
                  InputProps={{
                    sx: {
                      height: 46,
                      borderRadius: '10px',
                      bgcolor: '#FFFFFF',
                      fontFamily: 'Inter, sans-serif',
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
                <Typography sx={{ color: '#6A7FA7', fontSize: 13 }}>{gwasContent.shared.bottomSearchHint}</Typography>
                <Typography sx={{ color: '#2B79A0', fontSize: 14, fontWeight: 600 }}>{gwasContent.shared.poweredBy}</Typography>
              </Box>

              </Box>
            </Box>

            <Box sx={{ border: '1px solid #E5EBF3', borderRadius: '14px', alignSelf: 'start' }}>
              <Box sx={{ p: 2 }}>
                <Typography sx={{ color: '#173B8C', fontWeight: 800, fontSize: 30 / 1.8, mb: 1 }}>{gwasContent.rightPanel.aboutTitle}</Typography>
                <Typography sx={{ color: '#1E3F7C', fontSize: 32 / 1.8, lineHeight: 1.5 }}>{gwasContent.rightPanel.aboutBody}</Typography>
              </Box>
              <Box sx={{ borderTop: '1px solid #E5EBF3', p: 2 }}>
                <Typography sx={{ color: '#173B8C', fontWeight: 800, fontSize: 30 / 1.8, mb: 1 }}>{gwasContent.rightPanel.importantTitle}</Typography>
                {gwasContent.rightPanel.importantBodyLines.map((line) => (
                  <Typography key={line} sx={{ color: '#1E3F7C', fontSize: 32 / 1.8, lineHeight: 1.5 }}>
                    {line}
                  </Typography>
                ))}
              </Box>
              <Box sx={{ borderTop: '1px solid #E5EBF3', p: 2 }}>
                <Typography sx={{ color: '#173B8C', fontWeight: 800, fontSize: 30 / 1.8, mb: 1 }}>{gwasContent.rightPanel.whyTitle}</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {gwasContent.rightPanel.whyItems.map((item) => (
                    <Box key={item} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <CheckIcon sx={{ color: '#1A9DC0', fontSize: 18, mt: 0.2 }} />
                      <Typography sx={{ color: '#1E3F7C', fontSize: 32 / 1.8, lineHeight: 1.45 }}>{item}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box sx={{ borderTop: '1px solid #E5EBF3', p: 2 }}>
                <Typography sx={{ color: '#173B8C', fontWeight: 800, fontSize: 30 / 1.8, mb: 1 }}>{gwasContent.rightPanel.examplesTitle}</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1 }}>
                  {gwasContent.rightPanel.examples.map((item) => {
                    const exampleText = typeof item === 'string' ? item : item.text;
                    const matchQid = typeof item === 'string' ? undefined : item.matchQid;

                    return (
                      <Box
                        key={exampleText}
                        onClick={() => navigateToMatchWithNewUi(matchQid)}
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
                    );
                  })}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
