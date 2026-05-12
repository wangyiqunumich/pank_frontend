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
import ContactSupportOutlinedIcon
  from '@mui/icons-material/ContactSupportOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import IosShareOutlinedIcon from '@mui/icons-material/IosShareOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
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
          label={gwasContent.configureSection.snpLabel}
          placeholder={gwasContent.configureSection.snpPlaceholder}
          InputLabelProps={{
            shrink: true,
            sx: {
              fontFamily: 'Inter',
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
            {gwasContent.header.backText}
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
                      {gwasContent.header.title}
                    </Typography>
                    <Box sx={{ px: 1, py: 0.15, borderRadius: '999px', bgcolor: '#F1F5F9', color: '#64748B', fontFamily: 'Inter', fontSize: 10, fontWeight: 400, height: 22, display: 'inline-flex', alignItems: 'center' }}>
                      {gwasContent.header.version}
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    {gwasContent.header.badges.map((badge) => (
                      <Box key={badge} sx={{ px: 1.1, py: 0.25, borderRadius: '999px', bgcolor: '#EBF0F6', color: '#444D6C', fontFamily: 'Inter', fontSize: 10, fontWeight: 400, height: 10, display: 'inline-flex', alignItems: 'center' }}>
                        {badge}
                      </Box>
                    ))}
                  </Box>

                  {gwasContent.header.descriptionLines.map((line) => (
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
                      <PeopleAltOutlinedIcon sx={{ fontSize: 16, color: '#3A838B' }} />
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#000000', fontWeight: '600 !important', fontSize: 14 }}>
                        {gwasContent.stats.count}
                      </Typography>
                      <Typography sx={{ color: '#000000', fontWeight: '500 !important', fontSize: 12 }}>
                        {gwasContent.stats.label}
                      </Typography>
                      <Typography sx={{ color: '#000000', fontSize: 12 }}>
                        {gwasContent.stats.subLabel}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    fullWidth
                    endIcon={<IosShareOutlinedIcon sx={{ fontSize: 10 }} />}
                    onClick={() => navigate('/qtldatasource')}
                    sx={{ width: '100%', textTransform: 'none', bgcolor: '#EEF8FC', color: '#3A838B', fontWeight: 400, borderRadius: '4px', fontSize: 10 }}
                  >
                    {gwasContent.stats.buttonText}
                  </Button>
                </Box>
              </Box>

              <Box sx={{ borderRadius: '14px', mt: 2, p: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#3A838B', color: '#fff', fontWeight: '500 !important', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    1
                  </Box>
                  <Typography sx={{ color: 'black', fontWeight: '500 !important', fontSize: 14 }}>
                    {gwasContent.configureSection.title}
                  </Typography>
                </Box>

                <Box sx={{ borderRadius: '10px', bgcolor: '#F5F9FC', p: 2 }}>
                  <Typography sx={{ color: '#4B5563', mb: 2, fontSize: 12 }}>
                    {String(gwasContent.configureSection.stepTitle || '')}
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
                  <Typography sx={{ color: '#8F8F8F', mt: 1, fontSize: 10 }}>
                    {gwasContent.configureSection.snpExamples}
                  </Typography>

                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <InfoOutlinedIcon sx={{ color: '#2A85A5', fontSize: 18 }} />
                    <Typography sx={{ color: '#4B5563', fontSize: 12 }}>
                      {gwasContent.shared.traitTitle}: {gwasContent.shared.traitText}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.6fr' }, gap: 1.6, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.8 }}>
                      <Box component="img" src={VectorSvg} alt="Vector" sx={{ width: 12, height: 12, flexShrink: 0, mt: 0.2 }} />
                      <Box>
                        <Typography sx={{ color: 'black', fontWeight: '500 !important', fontSize: 10, mb: 0.2 }}>
                          {gwasContent.shared.whatNextTitle}
                        </Typography>
                        <Typography sx={{ color: '#4B5563', fontSize: 9 }}>
                          {gwasContent.shared.whatNextDescription}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr auto 1fr' }, alignItems: 'center', gap: 1 }}>
                      {gwasContent.shared.workflow.map((step, index) => (
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
                            {step.text ? <Typography sx={{ color: '#2E4F8F', fontSize: 9, pt: 0.75 }}>{step.text}</Typography> : null}
                          </Box>
                          {index < gwasContent.shared.workflow.length - 1 ? (
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
                  {gwasContent.shared.continueButton}
                </Button>

                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.7 }}>
                  <SecurityOutlinedIcon sx={{ fontSize: 16, color: '#3B7A9B' }} />
                  <Typography sx={{ color: '#305F8C', fontSize: 12 }}>{gwasContent.shared.securityNote}</Typography>
                </Box>
              </Box>

              </Box>
            </Box>

            <Box sx={{ border: '1px solid #E5EBF3', borderRadius: '14px', alignSelf: 'start' }}>
              <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 1 }}>
                  <InfoOutlinedIcon sx={{ color: '#1E3F7C', fontSize: 20 }} />
                  <Typography sx={{ color: '#1E3F7C', fontWeight: '500 !important', fontSize: 12 }}>
                    {gwasContent.rightPanel.aboutTitle}
                  </Typography>
                </Box>
                <Typography sx={{ color: 'black', fontSize: 12, lineHeight: 1.4 }}>{gwasContent.rightPanel.aboutBody}</Typography>
              </Box>
              <Box sx={{ borderTop: '1px solid #E5EBF3', p: 2 }}>
                <Typography sx={{ color: '#1E3F7C', fontWeight: '500 !important', fontSize: 12, mb: 1 }}>{gwasContent.rightPanel.importantTitle}</Typography>
                {gwasContent.rightPanel.importantBodyLines.map((line) => (
                  <Typography key={line} sx={{ color: 'black', fontSize: 12, lineHeight: 1.4 }}>
                    {line}
                  </Typography>
                ))}
              </Box>
              <Box sx={{ borderTop: '1px solid #E5EBF3', p: 2 }}>
                <Typography sx={{ color: '#1E3F7C', fontWeight: '500 !important', fontSize: 12, mb: 1 }}>{gwasContent.rightPanel.whyTitle}</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {gwasContent.rightPanel.whyItems.map((item) => (
                    <Box key={item} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <CheckIcon sx={{ color: '#1A9DC0', fontSize: 18, mt: 0.2 }} />
                      <Typography sx={{ color: '#007A8D', fontSize: 12, lineHeight: 1.4 }}>{item}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box sx={{ borderTop: '1px solid #E5EBF3', p: 2 }}>
                <Typography sx={{ color: '#1E3F7C', fontWeight: '500 !important', fontSize: 12, mb: 1 }}>{gwasContent.rightPanel.examplesTitle}</Typography>
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
                          <ContactSupportOutlinedIcon sx={{ color: '#1A9DC0', fontSize: 17, mt: 0.2 }} />
                          <Typography sx={{ color: '#007A8D', fontSize: 12, lineHeight: 1.4 }}>{exampleText}</Typography>
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
