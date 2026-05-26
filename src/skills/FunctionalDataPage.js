import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import BarChartIcon from '@mui/icons-material/BarChart';
import BiotechIcon from '@mui/icons-material/Biotech';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import PsychologyIcon from '@mui/icons-material/Psychology';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import {
  Backdrop,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Slider,
  Tooltip,
  Typography,
} from '@mui/material';

import AgentSidebar from '../components/AgentSidebar';
import BoxSvg from '../image/Box.svg';
import functionalDataApi from '../utils/functionalDataApi';
import { buildFunctionalPlotPrompt } from '../utils/functionalPromptBuilder';
import functionalDataContent from './functionalDataContent.json';

const SEL_SX = {
  borderRadius: '8px',
  fontFamily: 'Inter',
  fontSize: 13,
  height: 34,
  bgcolor: '#FFFFFF',
};

// Each step card has the same horizontal chrome (padding + border),
// so outer step widths should be slightly offset from 2:1 to keep
// inner plot areas at the target 2:1 ratio with equal heights.
const STEP_WIDTH_COMPENSATION_PX = 11.3;
const STEP_GRID_GAP_PX = 16;

function StepBadge({ n }) {
  return (
    <Box
      sx={{
        width: 22, height: 22, borderRadius: '50%',
        bgcolor: '#0F766E', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800, fontFamily: 'Inter', flexShrink: 0,
      }}
    >
      {n}
    </Box>
  );
}

const utf8ToBase64 = (str) => btoa(unescape(encodeURIComponent(str)));

function AgentBtn({ disabled = false, onClick }) {
  return (
    <Tooltip
      title="Send the current plot and selected cohort filters to the AI agent for interpretation."
      arrow
    >
      <span>
        <Button
          size="small"
          disabled={disabled}
          onClick={onClick}
          startIcon={!disabled ? <AutoAwesomeIcon sx={{ fontSize: 14 }} /> : undefined}
          sx={{
            textTransform: 'none',
            fontFamily: 'Inter',
            fontSize: 12,
            fontWeight: 600,
            minHeight: 30,
            minWidth: disabled ? 30 : 0,
            px: disabled ? 0.75 : 1.2,
            borderRadius: '10px',
            border: '1px solid',
            color: disabled ? '#94A3B8' : '#0F766E',
            bgcolor: disabled ? '#F8FAFC' : '#E6F7F3',
            borderColor: disabled ? '#E2E8F0' : '#B7E4DA',
            '&:hover': {
              bgcolor: disabled ? '#F8FAFC' : '#D1F0E8',
              borderColor: disabled ? '#E2E8F0' : '#7CCDBE',
            },
          }}
        >
          {disabled ? <AutoAwesomeIcon sx={{ fontSize: 14 }} /> : 'Interpret plot with AI'}
        </Button>
      </span>
    </Tooltip>
  );
}

function StepCard({ step, title, titleInfo, subtitle, subtitleInfo, showAgent, agentDisabled = false, onAgentClick, extra, children }) {
  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: '10px', border: '1px solid #E2E8F0', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      {/* Line 1: badge + title + AgentBtn | extra + chat icon */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: subtitle ? 0.5 : 1.5, gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <StepBadge n={step} />
          <Typography sx={{ fontFamily: 'Inter', fontSize: 13.5, fontWeight: 600, color: '#0F172A', ml: 0.25 }}>
            {title}
          </Typography>
          <Tooltip title={titleInfo || ''} arrow>
            <InfoOutlinedIcon sx={{ fontSize: 14, color: '#94A3B8', ml: 0.25, cursor: 'help' }} />
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {extra}
          {showAgent && (
            <AgentBtn disabled={agentDisabled} onClick={onAgentClick} />
          )}
        </Box>
      </Box>
      {/* Line 2 (optional subtitle) */}
      {subtitle && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5, ml: '30px' }}>
          <Typography sx={{ fontFamily: 'Inter', fontSize: 12.5, fontWeight: 400, color: '#0F172A' }}>
            {subtitle}
          </Typography>
          <Tooltip title={subtitleInfo || ''} arrow>
            <InfoOutlinedIcon sx={{ fontSize: 13, color: '#94A3B8', cursor: 'help' }} />
          </Tooltip>
        </Box>
      )}
      {children}
    </Paper>
  );
}

function ChartPlaceholder({ height = 240, aspectRatio = null, icon: Icon, loading = false, error = null, imageUrl = null }) {
  const PlaceholderIcon = Icon || ShowChartIcon;
  const sizeSx = aspectRatio ? { aspectRatio } : { height };
  
  if (loading) {
    return (
      <Box
        sx={{
          ...sizeSx,
          bgcolor: '#F8FAFC', borderRadius: '8px',
          border: '1.5px dashed #CBD5E1',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 1.5,
        }}
      >
        <CircularProgress size={40} sx={{ color: '#0F766E' }} />
        <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#94A3B8' }}>
          Loading chart...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          ...sizeSx,
          bgcolor: '#FEF2F2', borderRadius: '8px',
          border: '1.5px solid #FCA5A5',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 1,
          p: 2,
        }}
      >
        <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#DC2626', fontWeight: 500 }}>
          Failed to load chart
        </Typography>
        <Typography sx={{ fontFamily: 'Inter', fontSize: 11, color: '#991B1B', textAlign: 'center' }}>
          {error}
        </Typography>
      </Box>
    );
  }

  if (imageUrl) {
    return (
      <Box
        sx={{
          ...sizeSx,
          bgcolor: '#F8FAFC', borderRadius: '8px',
          border: '1.5px solid #E2E8F0',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={imageUrl}
          alt="chart"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'contain',
          }}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        ...sizeSx,
        bgcolor: '#F8FAFC', borderRadius: '8px',
        border: '1.5px dashed #CBD5E1',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 1.5,
      }}
    >
      <PlaceholderIcon sx={{ fontSize: 44, color: '#CBD5E1' }} />
      <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#94A3B8' }}>
        [ placeholder chart ]
      </Typography>
    </Box>
  );
}

export default function FunctionalDataPage() {
  const navigate = useNavigate();
  const { pageSubtitle, steps, rightPanel, captions } = functionalDataContent;
  const exampleIconMap = {
    search: SearchIcon,
    psychology: PsychologyIcon,
    biotech: BiotechIcon,
  };

  // Filter state
  const [disease, setDisease] = useState('T1D');
  const [sex, setSex] = useState('All');
  const [center, setCenter] = useState('All');
  const [ageRange, setAgeRange] = useState([3, 65]);
  const [bmiRange, setBmiRange] = useState([12, 45.5]);
  const [debouncedAgeRange, setDebouncedAgeRange] = useState([3, 65]);
  const [debouncedBmiRange, setDebouncedBmiRange] = useState([12, 45.5]);
  const [responseType, setResponseType] = useState('ins_ieq');
  const [trait, setTrait] = useState('INS-IEQ G 16.7 SI');
  const [hasInitializedFilters, setHasInitializedFilters] = useState(false);
  const [isTableOverlayOpen, setIsTableOverlayOpen] = useState(false);

  // API state
  const [summaryData, setSummaryData] = useState(null);
  const [donorData, setDonorData] = useState(null);
  const [traceImageUrl, setTraceImageUrl] = useState(null);
  const [traitImageUrl, setTraitImageUrl] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingDonors, setIsLoadingDonors] = useState(false);
  const [isLoadingTraceChart, setIsLoadingTraceChart] = useState(false);
  const [isLoadingTraitChart, setIsLoadingTraitChart] = useState(false);
  const [isBuildingStep2Prompt, setIsBuildingStep2Prompt] = useState(false);
  const [errors, setErrors] = useState({});

  const step1Options = useMemo(() => {
    const options = summaryData?.options || {};
    const diseaseOptions = ['All', ...(options.disease || [])].filter(
      (value, index, array) => array.indexOf(value) === index
    );

    return {
      disease: diseaseOptions.length ? diseaseOptions : ['All'],
      sex: ['All', ...(options.sex || [])],
      center: ['HPAP', 'Will add more later'],
    };
  }, [summaryData]);

  const step1Ranges = useMemo(() => {
    const ranges = summaryData?.ranges || {};
    return {
      age: {
        min: ranges.age?.min ?? 3,
        max: ranges.age?.max ?? 65,
      },
      bmi: {
        min: ranges.bmi?.min ?? 12,
        max: ranges.bmi?.max ?? 45.5,
      },
    };
  }, [summaryData]);

  const responseTypeOptions = useMemo(() => {
    return summaryData?.summary?.trace_types || ['ins_ieq', 'ins_content', 'gcg_ieq', 'gcg_content'];
  }, [summaryData]);

  const traitOptions = useMemo(() => {
    return summaryData?.traits || ['INS-IEQ G 16.7 SI'];
  }, [summaryData]);

  const formatResponseTypeLabel = (traceType) => {
    return (traceType || '').toUpperCase().replaceAll('_', ' ');
  };

  // Helper to build filter object
  const getFilters = () => ({
    disease: disease !== 'All' ? disease : null,
    sex: sex !== 'All' ? sex : null,
    center: center !== 'All' ? center : null,
    age_min: debouncedAgeRange[0],
    age_max: debouncedAgeRange[1],
    bmi_min: debouncedBmiRange[0],
    bmi_max: debouncedBmiRange[1],
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAgeRange(ageRange);
      setDebouncedBmiRange(bmiRange);
    }, 350);

    return () => clearTimeout(timer);
  }, [ageRange, bmiRange]);

  // Fetch summary on mount
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await functionalDataApi.getSummary();
        setSummaryData(data);
        setErrors(prev => ({ ...prev, summary: null }));
      } catch (err) {
        console.error('Error fetching summary:', err);
        setErrors(prev => ({ ...prev, summary: err.message }));
      } finally {
        setIsLoadingSummary(false);
      }
    };
    fetchSummary();
  }, []);

  useEffect(() => {
    if (!summaryData || hasInitializedFilters) return;

    setDisease(step1Options.disease.includes('All') ? 'All' : step1Options.disease[0]);
    setSex('All');
    setCenter(step1Options.center[0]);
    setAgeRange([step1Ranges.age.min, step1Ranges.age.max]);
    setBmiRange([step1Ranges.bmi.min, step1Ranges.bmi.max]);
    setDebouncedAgeRange([step1Ranges.age.min, step1Ranges.age.max]);
    setDebouncedBmiRange([step1Ranges.bmi.min, step1Ranges.bmi.max]);

    if (traitOptions.length && !traitOptions.includes(trait)) {
      setTrait(traitOptions[0]);
    }

    if (responseTypeOptions.length && !responseTypeOptions.includes(responseType)) {
      setResponseType(responseTypeOptions[0]);
    }

    setHasInitializedFilters(true);
  }, [summaryData, hasInitializedFilters, step1Options, step1Ranges, trait, traitOptions, responseType, responseTypeOptions]);

  // Fetch donors when filters change
  useEffect(() => {
    const fetchDonors = async () => {
      setIsLoadingDonors(true);
      try {
        const data = await functionalDataApi.getDonors(getFilters());
        setDonorData(data);
        setErrors(prev => ({ ...prev, donors: null }));
      } catch (err) {
        console.error('Error fetching donors:', err);
        setErrors(prev => ({ ...prev, donors: err.message }));
      } finally {
        setIsLoadingDonors(false);
      }
    };
    fetchDonors();
  }, [disease, sex, center, debouncedAgeRange, debouncedBmiRange]);

  // Fetch trace chart when filters or response type change
  useEffect(() => {
    const fetchTraceChart = async () => {
      setIsLoadingTraceChart(true);
      try {
        const blob = await functionalDataApi.getCohortTracesPng(responseType, getFilters());
        const url = URL.createObjectURL(blob);
        setTraceImageUrl(url);
        setErrors(prev => ({ ...prev, traceChart: null }));
      } catch (err) {
        console.error('Error fetching trace chart:', err);
        setErrors(prev => ({ ...prev, traceChart: err.message }));
      } finally {
        setIsLoadingTraceChart(false);
      }
    };
    fetchTraceChart();
  }, [disease, sex, center, debouncedAgeRange, debouncedBmiRange, responseType]);

  // Fetch trait summary chart when filters or trait change
  useEffect(() => {
    const fetchTraitChart = async () => {
      setIsLoadingTraitChart(true);
      try {
        const blob = await functionalDataApi.getTraitSummaryPng(trait, getFilters());
        const url = URL.createObjectURL(blob);
        setTraitImageUrl(url);
        setErrors(prev => ({ ...prev, traitChart: null }));
      } catch (err) {
        console.error('Error fetching trait chart:', err);
        setErrors(prev => ({ ...prev, traitChart: err.message }));
      } finally {
        setIsLoadingTraitChart(false);
      }
    };
    fetchTraitChart();
  }, [disease, sex, center, debouncedAgeRange, debouncedBmiRange, trait]);

  const getNumericValue = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const getTraitFromString = (traitsString, key) => {
    if (!traitsString || typeof traitsString !== 'string') return null;
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = traitsString.match(new RegExp(`${escapedKey}=([^;}]*)`));
    return getNumericValue(match?.[1]);
  };

  const getDonorTraitValue = (donor, traitKey, fallbackDirectKeys = []) => {
    const directCandidates = [donor?.[traitKey], ...fallbackDirectKeys.map((k) => donor?.[k])];
    for (const candidate of directCandidates) {
      const parsed = getNumericValue(candidate);
      if (parsed !== null) return parsed;
    }

    if (donor?.traits && typeof donor.traits === 'object' && !Array.isArray(donor.traits)) {
      const parsed = getNumericValue(donor.traits[traitKey]);
      if (parsed !== null) return parsed;
    }

    if (typeof donor?.traits === 'string') {
      return getTraitFromString(donor.traits, traitKey);
    }

    return null;
  };

  const formatDonorSiTrait = (donor) => {
    const si = getDonorTraitValue(donor, 'INS-IEQ G 16.7 SI', ['trait_value', 'traitValue']);
    return si === null ? 'N/A' : si.toFixed(1);
  };

  // Convert donor data to table rows
  const tableRows = useMemo(() => {
    if (!donorData || !donorData.donors) return [];
    return donorData.donors.slice(0, 5).map((donor) => ({
      id: donor.id || 'N/A',
      donorId: donor.donor_id || 'N/A',
      centerId: donor.hpap_id || 'N/A',
      disease: donor.disease || disease,
      age: donor.age || 'N/A',
      sex: donor.sex || 'N/A',
      bmi: donor.bmi ? parseFloat(donor.bmi).toFixed(1) : 'N/A',
      center: donor.center || 'N/A',
    }));
  }, [donorData, disease]);

  const fullTableRows = useMemo(() => {
    if (!donorData || !donorData.donors) return [];
    return donorData.donors.map((donor) => ({
      id: donor.id || 'N/A',
      donorId: donor.donor_id || 'N/A',
      centerId: donor.hpap_id || 'N/A',
      disease: donor.disease || disease,
      age: donor.age || 'N/A',
      sex: donor.sex || 'N/A',
      bmi: donor.bmi ? parseFloat(donor.bmi).toFixed(1) : 'N/A',
      center: donor.center || 'N/A',
    }));
  }, [donorData, disease]);

  const tableHeaders = ['ID', 'RRID', 'Center ID', 'Disease', 'Age', 'Genetic sex', 'BMI (kg/m²)', 'Center'];
  const tableGridTemplate = '1.4fr 1.4fr 1.1fr 1fr 0.7fr 0.8fr 1fr 0.9fr';
  const getDonorDetailsUrl = (id) => `https://data.pankbase.org/human-donors/${encodeURIComponent(String(id || '').trim())}/`;

  const renderDonorIdCell = (idValue) => {
    const idText = String(idValue || '').trim();
    if (!idText || idText === 'N/A') {
      return <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>N/A</Typography>;
    }

    return (
      <Typography
        component="a"
        href={getDonorDetailsUrl(idText)}
        target="_blank"
        rel="noreferrer"
        sx={{
          fontFamily: 'Inter',
          fontSize: 12,
          color: '#007A8D',
          fontWeight: 600,
          textDecoration: 'none',
          '&:hover': {
            textDecoration: 'none',
          },
        }}
      >
        {idText}
      </Typography>
    );
  };

  const downloadDonorsCsv = () => {
    const sourceDonors = donorData?.donors || [];
    if (!sourceDonors.length) return;

    const escapeCsvCell = (value) => {
      const raw = value === null || value === undefined ? '' : String(value);
      if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
        return `"${raw.replaceAll('"', '""')}"`;
      }
      return raw;
    };

    const orderedKeys = [];
    const seenKeys = new Set();
    sourceDonors.forEach((donor) => {
      Object.keys(donor || {}).forEach((key) => {
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          orderedKeys.push(key);
        }
      });
    });

    const csvRows = [
      orderedKeys.map(escapeCsvCell).join(','),
      ...sourceDonors.map((donor) => orderedKeys.map((key) => {
        const value = donor?.[key];
        if (value !== null && typeof value === 'object') {
          return escapeCsvCell(JSON.stringify(value));
        }
        return escapeCsvCell(value);
      }).join(',')),
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const now = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.setAttribute('download', `functional-data-donors-${now}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const donorCount = donorData?.count || 0;
  const totalDonors = summaryData?.summary?.available_donors || 114;
  const percentageSelected = totalDonors > 0 ? Math.round((donorCount / totalDonors) * 100) : 0;

  const handleResetFilters = () => {
    setDisease(step1Options.disease.includes('All') ? 'All' : step1Options.disease[0]);
    setSex('All');
    setCenter(step1Options.center[0]);
    setAgeRange([step1Ranges.age.min, step1Ranges.age.max]);
    setBmiRange([step1Ranges.bmi.min, step1Ranges.bmi.max]);
    setDebouncedAgeRange([step1Ranges.age.min, step1Ranges.age.max]);
    setDebouncedBmiRange([step1Ranges.bmi.min, step1Ranges.bmi.max]);
  };

  const handleStep2AgentSearch = async () => {
    try {
      setIsBuildingStep2Prompt(true);
      const filters = {
        ...getFilters(),
        trace_type: responseType,
      };
      const currentData = await functionalDataApi.getCohortTraces(responseType, getFilters());
      const prompt = buildFunctionalPlotPrompt({
        filters,
        currentData,
      });
      const encodedQuery = encodeURIComponent(utf8ToBase64(prompt));
      navigate(`/result-new2?question=${encodedQuery}&terminal=true&prompt_source=functional_data_auto`);
    } catch (err) {
      console.error('Failed to build Step 2 prompt:', err);
    } finally {
      setIsBuildingStep2Prompt(false);
    }
  };

  return (
    <Box sx={{ flex: 1, bgcolor: '#FFFFFF', display: 'flex', minHeight: 0 }}>
      <AgentSidebar activeNav="skills" />

      {/* Content column: scrollable area + fixed prompt bar */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>

        {/* Scrollable */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, md: 4 }, pt: { xs: 2, md: 3 }, pb: 2 }}>
          <Box sx={{ maxWidth: 1440, mx: 'auto' }}>

            {/* Back link */}
            <Button
              onClick={() => navigate('/skills')}
              startIcon={<ArrowBackIcon fontSize="12px" />}
              sx={{ textTransform: 'none', color: '#2F6F6A', fontFamily: 'Inter', fontSize: 12, fontWeight: 400, mb: 1.5, px: 0, py: 0, minWidth: 0 }}
            >
              {captions.backToLibrary}
            </Button>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '9fr 3fr' }, gap: 2.5, alignItems: 'start' }}>
              <Box>
                {/* Page header */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                      <Box sx={{ width: 24, height: 24, borderRadius: '15px', bgcolor: '#6669B0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Box component="img" src={BoxSvg} alt="Box" sx={{ width: 16, height: 16 }} />
                      </Box>
                      <Typography sx={{ fontFamily: 'Inter', fontWeight: '500 !important', fontSize: 20, color: '#0F172A' }}>
                        Pancreatic Islet Function Data Tool
                      </Typography>
                      <Box sx={{ px: 1, py: 0.15, borderRadius: '999px', bgcolor: '#F1F5F9', color: '#64748B', fontFamily: 'Inter', fontSize: 10, fontWeight: 400, height: 22, display: 'inline-flex', alignItems: 'center' }}>
                        v1.0
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                      {[
                        'Interactive Cohort Filtering',
                        'Agent-Ready Interpretation',
                      ].map((badge) => (
                        <Box key={badge} sx={{ px: 1.1, py: 0.25, borderRadius: '999px', bgcolor: '#EBF0F6', color: '#444D6C', fontFamily: 'Inter', fontSize: 10, fontWeight: 400, height: 10, display: 'inline-flex', alignItems: 'center' }}>
                          {badge}
                        </Box>
                      ))}
                    </Box>

                    {pageSubtitle.map((line) => (
                      <Typography key={line} sx={{ fontFamily: 'Inter', fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>
                        {line}
                      </Typography>
                    ))}
                  </Box>

                  <Box
                    sx={{
                      borderRadius: '12px',
                      border: '1px solid #87C8A5',
                      bgcolor: '#EEF9F3',
                      px: 1.5,
                      py: 1.25,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            bgcolor: '#0F766E',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <PeopleAltOutlinedIcon sx={{ fontSize: 18, color: '#FFFFFF' }} />
                        </Box>
                        <Box>
                          <Typography sx={{ color: '#0F172A', fontWeight: '700 !important', fontSize: 14 }}>
                            {donorCount} Donors Selected
                          </Typography>
                          <Typography sx={{ color: '#6B7280', fontSize: 10 }}>
                            Showing filtered functional data from {donorCount} / {totalDonors} total donors
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', gap: 0.5, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                        {[
                          { label: 'Disease', value: disease || 'All' },
                          { label: 'Genetic sex', value: sex || 'All' },
                          { label: 'Age range', value: `${ageRange[0]} - ${ageRange[1]}` },
                          { label: 'BMI range', value: `${bmiRange[0]} - ${bmiRange[1]}` },
                        ].map((item) => (
                          <Box
                            key={item.label}
                            sx={{
                              minWidth: 0,
                              py: 0.2,
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PeopleAltOutlinedIcon sx={{ fontSize: 13, color: '#0F766E' }} />
                              <Typography sx={{ fontFamily: 'Inter', fontSize: 11, color: '#0F766E', fontWeight: 600 }}>
                                {item.label}
                              </Typography>
                            </Box>
                            <Typography sx={{ mt: 0.25, fontFamily: 'Inter', fontSize: 12, color: '#1F2937', fontWeight: 500 }}>
                              {item.value}
                            </Typography>
                          </Box>
                        ))}
                      </Box>

                      <Button
                        size="small"
                        startIcon={<RefreshIcon sx={{ fontSize: 15 }} />}
                        onClick={handleResetFilters}
                        sx={{
                          textTransform: 'none',
                          fontFamily: 'Inter',
                          fontSize: 13,
                          color: '#0F766E',
                          border: '1px solid #97CBB0',
                          bgcolor: '#FFFFFF',
                          borderRadius: '8px',
                          px: 1.5,
                          height: 34,
                          '&:hover': { bgcolor: '#F0FAF4' },
                        }}
                      >
                        {captions.resetFilters}
                      </Button>
                    </Box>
                  </Box>
                </Box>

                {/* Left: step cards */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>

                {/* Step 1 */}
                <StepCard step={1} title={steps.step1.title} titleInfo={steps.step1.titleInfo}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.25, mb: 2 }}>
                    {[
                      { label: 'Disease', value: disease, set: setDisease, options: step1Options.disease },
                      { label: 'Genetic sex', value: sex, set: setSex, options: step1Options.sex },
                      { label: 'Center', value: center, set: setCenter, options: step1Options.center },
                    ].map(({ label, value, set, options }) => (
                      <Box key={label}>
                        <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#64748B', mb: 0.5 }}>{label}</Typography>
                        <Select size="small" fullWidth value={value} onChange={(e) => set(e.target.value)} sx={SEL_SX}>
                          {options.map((o) => (
                            <MenuItem
                              key={o}
                              value={o}
                              disabled={label === 'Center' && o === 'Will add more later'}
                              sx={{ fontFamily: 'Inter', fontSize: 13 }}
                            >
                              {o}
                            </MenuItem>
                          ))}
                        </Select>
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, alignItems: 'end' }}>
                    <Box>
                      <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#64748B', mb: 1.25 }}>Age range (years)</Typography>
                      <Box sx={{ px: 1 }}>
                        <Slider
                          value={ageRange}
                          onChange={(_, v) => setAgeRange(v)}
                          min={step1Ranges.age.min}
                          max={step1Ranges.age.max}
                          step={1}
                          valueLabelDisplay="auto"
                          sx={{ color: '#0F766E', '& .MuiSlider-thumb': { width: 14, height: 14 } }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: -0.5 }}>
                          <Typography sx={{ fontFamily: 'Inter', fontSize: 11, color: '#64748B' }}>{ageRange[0]}</Typography>
                          <Typography sx={{ fontFamily: 'Inter', fontSize: 11, color: '#64748B' }}>{ageRange[1]}</Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Box>
                      <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#64748B', mb: 1.25 }}>BMI range (kg/m²)</Typography>
                      <Box sx={{ px: 1 }}>
                        <Slider
                          value={bmiRange}
                          onChange={(_, v) => setBmiRange(v)}
                          min={step1Ranges.bmi.min}
                          max={step1Ranges.bmi.max}
                          step={0.5}
                          valueLabelDisplay="auto"
                          sx={{ color: '#0F766E', '& .MuiSlider-thumb': { width: 14, height: 14 } }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: -0.5 }}>
                          <Typography sx={{ fontFamily: 'Inter', fontSize: 11, color: '#64748B' }}>{bmiRange[0]}</Typography>
                          <Typography sx={{ fontFamily: 'Inter', fontSize: 11, color: '#64748B' }}>{bmiRange[1]}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </StepCard>

                {/* Step 2 + Step 3 (2:1) */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      lg: `minmax(0, calc((100% - ${STEP_GRID_GAP_PX}px) * 0.6667 - ${STEP_WIDTH_COMPENSATION_PX}px)) minmax(0, calc((100% - ${STEP_GRID_GAP_PX}px) * 0.3333 + ${STEP_WIDTH_COMPENSATION_PX}px))`,
                    },
                    gap: 2,
                  }}
                >

                  <Box sx={{ minWidth: 0 }}>
                    <StepCard
                      step={2}
                      title={steps.step2.title}
                      titleInfo={steps.step2.titleInfo}
                      subtitle={steps.step2.subtitle}
                      subtitleInfo={steps.step2.subtitleInfo}
                      showAgent
                      agentDisabled={isBuildingStep2Prompt}
                      onAgentClick={handleStep2AgentSearch}
                    >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#64748B' }}>{captions.responseType}</Typography>
                      <Tooltip title={steps.step2.responseTypeInfo} arrow>
                        <InfoOutlinedIcon sx={{ fontSize: 13, color: '#94A3B8', cursor: 'help' }} />
                      </Tooltip>
                      <Select size="small" value={responseType} onChange={(e) => setResponseType(e.target.value)} sx={{ ...SEL_SX, minWidth: 140 }}>
                        {responseTypeOptions.map((o) => (
                          <MenuItem key={o} value={o} sx={{ fontFamily: 'Inter', fontSize: 13 }}>{formatResponseTypeLabel(o)}</MenuItem>
                        ))}
                      </Select>
                      <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '6px', p: 0.4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShowChartIcon sx={{ fontSize: 15, color: '#475569' }} />
                      </Box>
                    </Box>
                    <ChartPlaceholder 
                      aspectRatio={2}
                      icon={ShowChartIcon}
                      loading={isLoadingTraceChart}
                      error={errors.traceChart}
                      imageUrl={traceImageUrl}
                    />
                    <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 22, height: 2, bgcolor: '#94A3B8' }} />
                        <Typography sx={{ fontFamily: 'Inter', fontSize: 11, color: '#64748B' }}>Individual donors</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 22, height: 3, bgcolor: '#DC2626' }} />
                        <Typography sx={{ fontFamily: 'Inter', fontSize: 11, color: '#64748B' }}>Mean response</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 22, height: 12, bgcolor: '#E5F0F2', border: '1px solid #E5F0F2' }} />
                        <Typography sx={{ fontFamily: 'Inter', fontSize: 11, color: '#64748B' }}>Stimulus window</Typography>
                      </Box>
                    </Box>
                    </StepCard>
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <StepCard step={3} title={steps.step3.title} titleInfo={steps.step3.titleInfo} showAgent agentDisabled>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5, mb: 1.5 }}>
                      <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#64748B' }}>{captions.trait}</Typography>
                      <Select autoWidth size="small" value={trait} onChange={(e) => setTrait(e.target.value)} sx={{ ...SEL_SX, minWidth: 220 }}>
                        {traitOptions.map((o) => (
                          <MenuItem key={o} value={o} sx={{ fontFamily: 'Inter', fontSize: 12 }}>{o}</MenuItem>
                        ))}
                      </Select>
                    </Box>
                    <ChartPlaceholder 
                      aspectRatio={1}
                      icon={BarChartIcon}
                      loading={isLoadingTraitChart}
                      error={errors.traitChart}
                      imageUrl={traitImageUrl}
                    />
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 16, height: 4, bgcolor: '#478F95' }} />
                        <Typography sx={{ fontFamily: 'Inter', fontSize: 11, color: '#64748B' }}>Top filtered donors</Typography>
                      </Box>
                    </Box>
                    </StepCard>
                  </Box>
                </Box>

                {/* Step 4 (full width) */}
                <StepCard
                  step={4}
                  title={steps.step4.title}
                  titleInfo={steps.step4.titleInfo}
                  extra={
                    <Button
                      size="small"
                      onClick={downloadDonorsCsv}
                      disabled={!fullTableRows.length}
                      startIcon={<DownloadOutlinedIcon sx={{ fontSize: 14 }} />}
                      sx={{ textTransform: 'none', fontFamily: 'Inter', fontSize: 12, color: '#475569', border: '1px solid #E2E8F0', borderRadius: '7px' }}
                    >
                      {captions.downloadCsv}
                    </Button>
                  }
                >
                  <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: tableGridTemplate, px: 1.5, py: 1, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      {tableHeaders.map((h) => (
                        <Typography key={h} sx={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: '#334155' }}>{h}</Typography>
                      ))}
                    </Box>
                    {isLoadingDonors ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                        <CircularProgress size={30} sx={{ color: '#0F766E' }} />
                      </Box>
                    ) : tableRows.length > 0 ? (
                      tableRows.map((row) => (
                        <Box
                          key={row.donorId}
                          sx={{ display: 'grid', gridTemplateColumns: tableGridTemplate, px: 1.5, py: 0.9, borderBottom: '1px solid #F1F5F9', '&:hover': { bgcolor: '#FAFAFA' } }}
                        >
                          {renderDonorIdCell(row.id)}
                          <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155', fontWeight: 500 }}>{row.donorId}</Typography>
                          <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.centerId}</Typography>
                          <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.disease}</Typography>
                          <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.age}</Typography>
                          <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.sex}</Typography>
                          <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.bmi}</Typography>
                          <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.center}</Typography>
                        </Box>
                      ))
                    ) : (
                      <Box sx={{ px: 1.5, py: 2, textAlign: 'center' }}>
                        <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#94A3B8' }}>{captions.noDonorsFound}</Typography>
                      </Box>
                    )}
                    {!isLoadingDonors && donorCount > tableRows.length && (
                      <Box sx={{ display: 'grid', gridTemplateColumns: tableGridTemplate, px: 1.5, py: 0.9 }}>
                        {['...', '...', '...', '...', '...', '...', '...', '...'].map((d, i) => (
                          <Typography key={i} sx={{ fontFamily: 'Inter', fontSize: 12, color: '#94A3B8' }}>{d}</Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                  {donorCount > tableRows.length && (
                    <Button
                      onClick={() => setIsTableOverlayOpen(true)}
                      endIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}
                      sx={{ textTransform: 'none', fontFamily: 'Inter', fontSize: 13, color: '#0F766E', fontWeight: 600, mt: 1, px: 0 }}
                    >
                      {captions.showMore} ({donorCount} donors)
                    </Button>
                  )}
                </StepCard>
                </Box>
              </Box>

              {/* Right info panel */}
              <Box sx={{ border: '1px solid #E5EBF3', borderRadius: '14px', alignSelf: 'start', display: { xs: 'none', md: 'block' } }}>
                <Box sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 1 }}>
                    <Tooltip title={rightPanel.aboutInfo} arrow>
                      <InfoOutlinedIcon sx={{ color: '#1E3F7C', fontSize: 20, cursor: 'help' }} />
                    </Tooltip>
                    <Typography sx={{ color: '#1E3F7C', fontWeight: '500 !important', fontSize: 12 }}>
                      {rightPanel.aboutTitle}
                    </Typography>
                  </Box>
                  <Typography sx={{ color: 'black', fontSize: 12, lineHeight: 1.4 }}>{rightPanel.aboutBody}</Typography>
                </Box>

                <Box sx={{ borderTop: '1px solid #E5EBF3', p: 2 }}>
                  <Typography sx={{ color: '#1E3F7C', fontWeight: '500 !important', fontSize: 12, mb: 1 }}>
                    {rightPanel.importantTitle}
                  </Typography>
                  <Typography sx={{ color: 'black', fontSize: 12, lineHeight: 1.4 }}>
                    {rightPanel.importantBody}
                  </Typography>
                </Box>

                <Box sx={{ borderTop: '1px solid #E5EBF3', p: 2 }}>
                  <Typography sx={{ color: '#1E3F7C', fontWeight: '500 !important', fontSize: 12, mb: 1 }}>
                    {rightPanel.whyUseTitle}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {rightPanel.whyUseItems.map((item) => (
                      <Box key={item} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <CheckIcon sx={{ color: '#1A9DC0', fontSize: 18, mt: 0.2 }} />
                        <Typography sx={{ color: '#007A8D', fontSize: 12, lineHeight: 1.4 }}>{item}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                <Box sx={{ borderTop: '1px solid #E5EBF3', p: 2 }}>
                  <Typography sx={{ color: '#1E3F7C', fontWeight: '500 !important', fontSize: 12, mb: 1 }}>
                    {rightPanel.exampleUseCasesTitle}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1 }}>
                    {rightPanel.exampleUseCases.map(({ icon, text }) => {
                      const Icon = exampleIconMap[icon] || SearchIcon;

                      return (
                        <Box key={text} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, borderRadius: '8px', px: 0.4, py: 0.2 }}>
                          <Icon sx={{ color: '#1A9DC0', fontSize: 17, mt: 0.2 }} />
                          <Typography sx={{ color: '#007A8D', fontSize: 12, lineHeight: 1.4 }}>{text}</Typography>
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

      <Backdrop
        open={isTableOverlayOpen}
        sx={{ zIndex: 1300, bgcolor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)' }}
      >
        <Paper
          elevation={0}
          sx={{
            width: 'min(1200px, 96vw)',
            height: 'min(860px, 92vh)',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            bgcolor: '#FFFFFF',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.25,
              borderBottom: '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: '#F0FDFA', border: '1px solid #99F6E4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <PeopleAltOutlinedIcon sx={{ fontSize: 16, color: '#0F766E' }} />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                  <Typography sx={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                    Donor Metadata
                  </Typography>
                  <Chip
                    label="Full Screen"
                    size="small"
                    sx={{
                      fontFamily: 'Inter',
                      fontSize: 11,
                      fontWeight: 600,
                      bgcolor: '#ECFDF5',
                      color: '#047857',
                      border: '1px solid #A7F3D0',
                      height: 20,
                    }}
                  />
                </Box>
                <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#64748B' }}>
                  {donorCount} donors under current filters
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                size="small"
                onClick={downloadDonorsCsv}
                disabled={!fullTableRows.length}
                startIcon={<DownloadOutlinedIcon sx={{ fontSize: 14 }} />}
                sx={{
                  textTransform: 'none',
                  fontFamily: 'Inter',
                  fontSize: 12,
                  color: '#475569',
                  border: '1px solid #E2E8F0',
                  borderRadius: '7px',
                  px: 1,
                  minWidth: 0,
                }}
              >
                {captions.downloadCsv}
              </Button>
              <IconButton
                onClick={() => setIsTableOverlayOpen(false)}
                sx={{ color: '#64748B', border: '1px solid #E2E8F0', borderRadius: '8px' }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          <Box sx={{ borderBottom: '1px solid #E2E8F0', px: 2, py: 1, bgcolor: '#F8FAFC' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: tableGridTemplate, columnGap: 1 }}>
              {tableHeaders.map((h) => (
                <Typography key={h} sx={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: '#334155' }}>
                  {h}
                </Typography>
              ))}
            </Box>
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1, bgcolor: '#FFFFFF' }}>
            {isLoadingDonors ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={30} sx={{ color: '#0F766E' }} />
              </Box>
            ) : fullTableRows.length > 0 ? (
              fullTableRows.map((row) => (
                <Box
                  key={row.donorId}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: tableGridTemplate,
                    columnGap: 1,
                    py: 0.95,
                    borderBottom: '1px solid #F1F5F9',
                    '&:hover': { bgcolor: '#FAFAFA' },
                  }}
                >
                  {renderDonorIdCell(row.id)}
                  <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155', fontWeight: 500 }}>{row.donorId}</Typography>
                  <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.centerId}</Typography>
                  <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.disease}</Typography>
                  <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.age}</Typography>
                  <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.sex}</Typography>
                  <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.bmi}</Typography>
                  <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.center}</Typography>
                </Box>
              ))
            ) : (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <Typography sx={{ fontFamily: 'Inter', fontSize: 13, color: '#94A3B8' }}>{captions.noDonorsFound}</Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Backdrop>
    </Box>
  );
}
