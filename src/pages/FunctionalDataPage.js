import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import AttachFileIcon from '@mui/icons-material/AttachFile';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import BarChartIcon from '@mui/icons-material/BarChart';
import BiotechIcon from '@mui/icons-material/Biotech';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import CloseIcon from '@mui/icons-material/Close';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import PsychologyIcon from '@mui/icons-material/Psychology';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
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
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import AgentSidebar from '../components/AgentSidebar';
import functionalDataApi from '../utils/functionalDataApi';
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

function AgentBtn() {
  return (
    <Button
      size="small"
      aria-label="Agent"
      sx={{
        minWidth: 0,
        color: '#0F766E', px: 0.75, py: 0.25,
        border: '1px solid #CCFBF1', borderRadius: '6px', bgcolor: '#F0FDFA',
        '&:hover': { bgcolor: '#CCFBF1' },
      }}
    >
      <AutoGraphIcon sx={{ fontSize: 14 }} />
    </Button>
  );
}

function StepCard({ step, title, titleInfo, subtitle, subtitleInfo, showAgent, extra, children }) {
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
            <>
              <AgentBtn />
              <ChatBubbleOutlineIcon sx={{ fontSize: 15, color: '#94A3B8', cursor: 'pointer' }} />
            </>
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
  const [prompt, setPrompt] = useState('');
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
  const [errors, setErrors] = useState({});

  const step1Options = useMemo(() => {
    const options = summaryData?.options || {};
    const diseaseCandidates = options.disease || [];
    const t1d = diseaseCandidates.find((v) => v.toUpperCase() === 'T1D');
    const nonDiabetic = diseaseCandidates.find((v) => {
      const normalized = v.toUpperCase();
      return normalized === 'NON-DIABETIC' || normalized === 'NON DIABETIC' || normalized.includes('HEALTH');
    });
    const constrainedDisease = [t1d, nonDiabetic].filter(Boolean);

    return {
      disease: constrainedDisease.length ? constrainedDisease : ['T1D', 'Non-Diabetic'],
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

    setDisease(step1Options.disease.includes('T1D') ? 'T1D' : step1Options.disease[0]);
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
      donorId: donor.donor_id || 'N/A',
      centerId: donor.hpap_id || 'N/A',
      disease: donor.disease || disease,
      age: donor.age || 'N/A',
      sex: donor.sex || 'N/A',
      bmi: donor.bmi ? parseFloat(donor.bmi).toFixed(1) : 'N/A',
      center: donor.center || 'N/A',
      trait: formatDonorSiTrait(donor),
    }));
  }, [donorData, disease]);

  const fullTableRows = useMemo(() => {
    if (!donorData || !donorData.donors) return [];
    return donorData.donors.map((donor) => ({
      donorId: donor.donor_id || 'N/A',
      centerId: donor.hpap_id || 'N/A',
      disease: donor.disease || disease,
      age: donor.age || 'N/A',
      sex: donor.sex || 'N/A',
      bmi: donor.bmi ? parseFloat(donor.bmi).toFixed(1) : 'N/A',
      center: donor.center || 'N/A',
      trait: formatDonorSiTrait(donor),
    }));
  }, [donorData, disease]);

  const tableHeaders = ['RRID', 'Center ID', 'Disease', 'Age', 'Genetic sex', 'BMI (kg/m²)', 'Center', 'INS-IEQ G 16.7 SI'];
  const tableGridTemplate = '1.5fr 1.1fr 1fr 0.7fr 0.8fr 1fr 0.9fr 1.4fr';

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

  return (
    <Box sx={{ flex: 1, bgcolor: '#FFFFFF', display: 'flex', minHeight: 0 }}>
      <AgentSidebar activeNav="skills" />

      {/* Content column: scrollable area + fixed prompt bar */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>

        {/* Scrollable */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, md: 4 }, pt: { xs: 2, md: 3 }, pb: 2 }}>
          <Box sx={{ maxWidth: 1240, mx: 'auto' }}>

            {/* Back link */}
            <Button
              onClick={() => navigate('/skills')}
              startIcon={<ChevronLeftIcon />}
              sx={{ textTransform: 'none', color: '#64748B', fontFamily: 'Inter', fontSize: 13, mb: 1.5, px: 0, minWidth: 0 }}
            >
              {captions.backToLibrary}
            </Button>

            {/* Page header */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.75 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#F0FDFA', border: '1px solid #99F6E4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ShowChartIcon sx={{ fontSize: 20, color: '#0F766E' }} />
                  </Box>
                  <Typography sx={{ fontFamily: 'Inter', fontWeight: 800, fontSize: { xs: 18, md: 22 }, color: '#0F172A' }}>
                    HIPP Functional Data Skill
                  </Typography>
                  <Chip label="v1.0" size="small" sx={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, bgcolor: '#F1F5F9', color: '#64748B', height: 22 }} />
                  <Chip
                    label="Interactive Cohort Filtering"
                    size="small"
                    sx={{
                      fontFamily: 'Inter',
                      fontSize: 11,
                      fontWeight: 600,
                      bgcolor: '#ECFDF5',
                      color: '#047857',
                      border: '1px solid #A7F3D0',
                      height: 22,
                    }}
                  />
                  <Chip
                    label="Agent-Ready Interpretation"
                    size="small"
                    sx={{
                      fontFamily: 'Inter',
                      fontSize: 11,
                      fontWeight: 600,
                      bgcolor: '#ECFDF5',
                      color: '#047857',
                      border: '1px solid #A7F3D0',
                      height: 22,
                    }}
                  />
                </Box>
                {pageSubtitle.map((line) => (
                  <Typography key={line} sx={{ fontFamily: 'Inter', fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
                    {line}
                  </Typography>
                ))}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PeopleAltOutlinedIcon sx={{ fontSize: 22, color: '#94A3B8' }} />
                  <Box>
                    <Typography sx={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, color: '#0F172A', lineHeight: 1.25 }}>
                      {donorCount} donors selected
                    </Typography>
                    <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#64748B' }}>
                      ({percentageSelected}% of {totalDonors} total donors)
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  disabled
                  startIcon={<BookmarkBorderIcon />}
                  sx={{
                    textTransform: 'none',
                    fontFamily: 'Inter',
                    fontWeight: 600,
                    fontSize: 13,
                    borderRadius: '8px',
                    borderColor: '#E2E8F0',
                    color: '#94A3B8',
                    '&.Mui-disabled': {
                      borderColor: '#E2E8F0',
                      color: '#94A3B8',
                    },
                  }}
                >
                  {captions.saveCohort}
                </Button>
              </Box>
            </Box>

            {/* Two-column layout */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1fr) 200px' }, gap: 2.5, alignItems: 'start' }}>

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
                            <MenuItem key={o} value={o} sx={{ fontFamily: 'Inter', fontSize: 13 }}>{o}</MenuItem>
                          ))}
                        </Select>
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr auto' }, gap: 2, alignItems: 'end' }}>
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
                    <Button
                      size="small"
                      startIcon={<RefreshIcon sx={{ fontSize: 15 }} />}
                      onClick={() => {
                        setDisease(step1Options.disease.includes('T1D') ? 'T1D' : step1Options.disease[0]);
                        setSex('All');
                        setCenter(step1Options.center[0]);
                        setAgeRange([step1Ranges.age.min, step1Ranges.age.max]);
                        setBmiRange([step1Ranges.bmi.min, step1Ranges.bmi.max]);
                        setDebouncedAgeRange([step1Ranges.age.min, step1Ranges.age.max]);
                        setDebouncedBmiRange([step1Ranges.bmi.min, step1Ranges.bmi.max]);
                      }}
                      sx={{ textTransform: 'none', fontFamily: 'Inter', fontSize: 13, color: '#475569', border: '1px solid #E2E8F0', borderRadius: '8px', px: 1.5, mb: 3 }}
                    >
                      {captions.resetFilters}
                    </Button>
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
                      <IconButton size="small" sx={{ border: '1px solid #E2E8F0', borderRadius: '6px', p: 0.4 }}>
                        <ShowChartIcon sx={{ fontSize: 15, color: '#475569' }} />
                      </IconButton>
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
                    <StepCard step={3} title={steps.step3.title} titleInfo={steps.step3.titleInfo} showAgent>
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

                {/* Step 5 (full width) */}
                <StepCard
                  step={5}
                  title={steps.step5.title}
                  titleInfo={steps.step5.titleInfo}
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
                          <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155', fontWeight: 500 }}>{row.donorId}</Typography>
                          <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.centerId}</Typography>
                          <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.disease}</Typography>
                          <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.age}</Typography>
                          <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.sex}</Typography>
                          <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.bmi}</Typography>
                          <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.center}</Typography>
                          <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.trait}</Typography>
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

              {/* Right info panel */}
              <Box sx={{ display: { xs: 'none', xl: 'flex' }, flexDirection: 'column', position: 'sticky', top: 16 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                  <Tooltip title={rightPanel.aboutInfo} arrow>
                    <InfoOutlinedIcon sx={{ fontSize: 16, color: '#3B82F6', cursor: 'help' }} />
                  </Tooltip>
                  <Typography sx={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 13, color: '#1E40AF' }}>
                    {rightPanel.aboutTitle}
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: 'Inter', fontSize: 12.5, color: '#475569', lineHeight: 1.7, mb: 1.5 }}>
                  {rightPanel.aboutBody}
                </Typography>

                <Box sx={{ p: 1.25, bgcolor: '#FFFBEB', borderRadius: '8px', border: '1px solid #FDE68A', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <WarningAmberOutlinedIcon sx={{ fontSize: 14, color: '#D97706' }} />
                    <Typography sx={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 12, color: '#92400E' }}>{rightPanel.importantTitle}</Typography>
                  </Box>
                  <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#78350F', lineHeight: 1.65 }}>
                    {rightPanel.importantBody}
                  </Typography>
                </Box>

                <Typography sx={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 13, color: '#0F172A', mb: 0.75 }}>
                  {rightPanel.whyUseTitle}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.65, mb: 2 }}>
                  {rightPanel.whyUseItems.map((item) => (
                    <Box key={item} sx={{ display: 'flex', gap: 0.5 }}>
                      <Typography component="span" sx={{ fontFamily: 'Inter', fontSize: 12, color: '#0F766E', flexShrink: 0 }}>✓</Typography>
                      <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#0F766E', lineHeight: 1.55 }}>{item}</Typography>
                    </Box>
                  ))}
                </Box>

                <Typography sx={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 13, color: '#0F172A', mb: 0.75 }}>
                  {rightPanel.exampleUseCasesTitle}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {rightPanel.exampleUseCases.map(({ icon, text }) => {
                    const Icon = exampleIconMap[icon] || SearchIcon;
                    return (
                      <Box key={text} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                        <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: '#F0FDFA', border: '1px solid #99F6E4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.1 }}>
                          <Icon sx={{ fontSize: 13, color: '#0F766E' }} />
                        </Box>
                        <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155', lineHeight: 1.55 }}>{text}</Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>

            </Box>
          </Box>
        </Box>

        {/* Fixed bottom prompt bar */}
        <Box sx={{ flexShrink: 0, borderTop: '1px solid #E2E8F0', px: { xs: 2, md: 4 }, py: 1.5, bgcolor: '#FFFFFF' }}>
          <Box sx={{ maxWidth: 1240, mx: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, border: '1px solid #E2E8F0', borderRadius: '12px', px: 1.5, py: 0.75 }}>
              <ChatBubbleOutlineIcon sx={{ fontSize: 18, color: '#94A3B8', flexShrink: 0 }} />
              <TextField
                fullWidth
                variant="standard"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='Ask about this dataset or results... (e.g., "Why do older donors have lower INS response?")'
                InputProps={{ disableUnderline: true }}
                sx={{ '& input': { fontFamily: 'Inter', fontSize: 13, color: '#334155' } }}
              />
              <IconButton size="small" sx={{ color: '#94A3B8' }}>
                <AttachFileIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <IconButton
                size="small"
                sx={{ bgcolor: '#0F766E', color: '#fff', borderRadius: '8px', p: 0.75, '&:hover': { bgcolor: '#0D6660' } }}
              >
                <SendIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, px: 0.5 }}>
              <Typography sx={{ fontFamily: 'Inter', fontSize: 11, color: '#94A3B8' }}>
                Your message will be sent with the current filter and visualization context.
              </Typography>
              <Typography sx={{ fontFamily: 'Inter', fontSize: 11, color: '#94A3B8' }}>
                Powered by PanKgraph Agent
              </Typography>
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
                  <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155', fontWeight: 500 }}>{row.donorId}</Typography>
                  <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.centerId}</Typography>
                  <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.disease}</Typography>
                  <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.age}</Typography>
                  <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.sex}</Typography>
                  <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.bmi}</Typography>
                  <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.center}</Typography>
                  <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#334155' }}>{row.trait}</Typography>
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
