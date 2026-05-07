import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';
import AutoGraphOutlinedIcon from '@mui/icons-material/AutoGraphOutlined';
import CloseIcon from '@mui/icons-material/Close';
import FlareOutlinedIcon from '@mui/icons-material/FlareOutlined';
import SearchIcon from '@mui/icons-material/Search';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import TravelExploreOutlinedIcon
  from '@mui/icons-material/TravelExploreOutlined';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material';

import landingPageLogo from '../image/landing image cropped.png';
import landingSendIcon from '../image/landing_send.svg';
import ExampleQueries from '../schema/landing_sample_questions.json';
import AgentSidebar from './AgentSidebar';

export const utf8ToBase64 = (str) => btoa(unescape(encodeURIComponent(str)));

function BetaBadge({ sx }) {
    return (
        <Box
            sx={{
                display: 'inline-flex',
                height: 'fit-content',
                alignItems: 'center',
                border: '1px solid #F6C957',
                borderRadius: '9999px',
                backgroundColor: '#FFFFFF',
                px: { xs: 1, md: 1.2 },
                py: '2px',
                flexShrink: 0,
                ...sx,
            }}
        >
            <Typography
                sx={{
                    color: '#F6C957',
                    fontWeight: 700,
                    fontSize: { xs: 10, md: 10.5 },
                    whiteSpace: 'nowrap',
                    fontFamily: 'Inter',
                    lineHeight: 1,
                }}
            >
                Beta
            </Typography>
        </Box>
    );
}

function AgentLandingPage() {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [showLoading, setShowLoading] = useState(false);
    const [activeExampleGroup, setActiveExampleGroup] = useState(undefined);
    const examplesPanelRef = useRef(null);

    const searchExampleGroup = useMemo(() => {
        const group = ExampleQueries?.search_examples;
        if (group && Array.isArray(group.entries)) {
            return group;
        }

        return {
            text_before_title: 'Search',
            title: 'Examples',
            entries: [
                {
                    question: 'Is PLEKHM1 differentially expressed in any cell type in T1D?',
                    link: '',
                },
                {
                    question: 'CTLA4 is annotated with which biological processes/functions?',
                    link: '',
                },
                {
                    question: 'Describe PTPN22’s involvement in T1D, covering its associated QTL signals, expression patterns, and reported effector genes evidence.',
                    link: '',
                },
            ],
        };
    }, []);

    const quickCards = useMemo(() => {
        const groups = Array.isArray(ExampleQueries?.example_buttons) ? ExampleQueries.example_buttons : [];
        const fallbackGroups = [
            {
                text_before_title: 'Analysis',
                title: 'eQTL analysis',
                entries: [
                    {
                        question: 'Which SNP serves as the lead QTL for CFTR?',
                        link: '/result-new?sourceTerm=snp@rs2402203&targetTerm=gene@ENSG00000001626&relationship=QTL',
                    },
                ],
            },
            {
                text_before_title: 'Genetics',
                title: 'Gene expression',
                entries: [
                    {
                        question: 'How does INS expression change in T1D versus non-diabetic samples?',
                        link: '/result-new?sourceTerm=gene@ENSG00000254647&targetTerm=cell_type&relationship=express_in',
                    },
                ],
            },
            {
                text_before_title: 'Variant',
                title: 'SNP lookup',
                entries: [
                    {
                        question: 'Is PLEKHM1 differentially expressed in any cell type in T1D?',
                        link: '',
                    },
                ],
            },
            {
                text_before_title: 'Epigenomics',
                title: 'Chromatin states',
                entries: [
                    {
                        question: 'Describe PTPN22’s involvement in T1D, covering its associated QTL signals, expression patterns, and reported effector genes evidence.',
                        link: '',
                    },
                ],
            },
        ];

        const sourceGroups = groups.length > 0 ? groups : fallbackGroups;

        return sourceGroups.map((group, index) => ({
            key: group.title,
            title: group.title,
            textBeforeTitle: group.text_before_title || '',
            entries: Array.isArray(group.entries) ? group.entries : [],
            icon: [
                <AutoGraphOutlinedIcon key="analysis" sx={{ color: '#006766', fontSize: 18 }} />,
                <StorageOutlinedIcon key="genetics" sx={{ color: '#006766', fontSize: 18 }} />,
                <TravelExploreOutlinedIcon key="variant" sx={{ color: '#006766', fontSize: 18 }} />,
                <FlareOutlinedIcon key="epigenomics" sx={{ color: '#006766', fontSize: 18 }} />,
            ][index] || <AutoGraphOutlinedIcon sx={{ color: '#006766', fontSize: 18 }} />,
        }));
    }, []);

    const activeCard = quickCards.find((card) => card.key === activeExampleGroup);
    const activeExamples = activeExampleGroup === 'search' ? searchExampleGroup.entries : (activeCard?.entries || []);
    const activeTitle = activeExampleGroup === 'search' ? searchExampleGroup.title : (activeCard?.title || 'Examples');

    const handleSearch = (searchQuery) => {
        const normalized = (searchQuery || '').trim();
        if (!normalized) return;
        const encodedQuery = encodeURIComponent(utf8ToBase64(normalized));
        navigate(`/result-new2?question=${encodedQuery}&terminal=true`);
    };

    const handleExampleClick = (example) => {
        const nextQuery = (example?.question || '').trim();
        if (nextQuery) {
            setQuery(nextQuery);
        }
        setActiveExampleGroup(undefined);

        const nextLink = (example?.link || '').trim();
        if (nextLink) {
            if (nextLink.startsWith('/match')) {
                const separator = nextLink.includes('?') ? '&' : '?';
                const returnTo = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
                navigate(`${nextLink}${separator}returnTo=${returnTo}`);
                return;
            }
            navigate(nextLink);
        }
    };

    useEffect(() => {
        if (!activeExampleGroup) {
            return undefined;
        }

        const handleOutsideClick = (event) => {
            if (examplesPanelRef.current && !examplesPanelRef.current.contains(event.target)) {
                setActiveExampleGroup(undefined);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, [activeExampleGroup]);

    const renderButtonLabel = (card) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.25, width: '100%' }}>
            <Typography sx={{ color: '#6D7979', fontSize: 9, fontFamily: 'Inter', fontWeight: 700, textTransform: 'uppercase', lineHeight: '16px', letterSpacing: '1px', wordWrap: 'break-word' }}>
                {card.textBeforeTitle}
            </Typography>
            <Typography sx={{ color: '#181C1D', fontSize: 12.5, fontFamily: 'Inter', fontWeight: 600, lineHeight: '18px', wordWrap: 'break-word' }}>
                {card.title}
            </Typography>
        </Box>
    );

    return (
        <Box sx={{ flex: 1, bgcolor: '#FFFFFF', display: 'flex', minHeight: 0 }}>
            <AgentSidebar activeNav="new-chat" />

            <Box
                sx={{
                    flex: 1,
                    px: { xs: 2, md: 4 },
                    py: { xs: 16, md: 20 },
                    position: 'relative',
                    overflow: 'visible',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: { xs: 'flex-start', md: 'center' },
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.06,
                        pointerEvents: 'none',
                        // filter: 'blur(2px)',
                    }}
                >
                    <Box component="img" src={landingPageLogo} alt="background" sx={{ width: { xs: '95%', md: 992 }, maxWidth: '96%', objectFit: 'contain', transform: 'translateY(-60px)' }} />
                </Box>

                <Box sx={{ maxWidth: 700, width: '100%', mx: 'auto', pt: { xs: 1, sm: 2, md: 3 }, pb: { xs: 3, sm: 4, md: 6 }, position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: { xs: 2.5, sm: 3, md: 3.25 } }}>
                    <Box sx={{ width: '100%', maxWidth: 700, textAlign: 'center' }}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: { xs: 1, md: 1.5 }, flexWrap: 'nowrap', justifyContent: 'center', maxWidth: '100%' }}>
                            <Typography sx={{ fontFamily: 'Inter', fontWeight: 800, fontSize: { xs: 26, sm: 32, md: 38 }, lineHeight: { xs: '30px', sm: '36px', md: '40px' }, letterSpacing: { xs: '-0.02em', md: '-0.035em' }, whiteSpace: { xs: 'normal', sm: 'nowrap' }, textAlign: 'center', flexShrink: 1 }}>
                                <Box component="span" sx={{ color: '#181C1D', fontSize: { xs: 26, sm: 32, md: 38 }, fontFamily: 'Inter', fontWeight: 800, lineHeight: { xs: '30px', sm: '36px', md: '40px' }, letterSpacing: { xs: '-0.02em', md: '-0.035em' }, whiteSpace: { xs: 'normal', sm: 'nowrap' } }}>
                                    What would you like to{' '}
                                </Box>
                                <Box component="span" sx={{ color: '#008C8C', fontSize: { xs: 26, sm: 32, md: 38 }, fontFamily: 'Inter', fontWeight: 800, letterSpacing: 'normal', whiteSpace: { xs: 'normal', sm: 'nowrap' } }}>
                                    explore?
                                </Box>
                            </Typography>
                            <BetaBadge sx={{ transform: 'translateY(2px)' }} />
                        </Box>
                        <Typography sx={{ mt: { xs: 1.25, md: 2 }, fontFamily: 'Inter', fontWeight: 400, fontSize: { xs: 13, sm: 14, md: 14 }, lineHeight: 1.55, color: '#4C6261', maxWidth: { xs: 620, md: 640 }, mx: 'auto' }}>
                            Explore our comprehensive database of T1D–related data, knowledge, and insights.
                            <Box component="br" sx={{ display: 'block' }} />
                            Simply type your question-our PanKgraph agent finds the answers.
                        </Typography>
                    </Box>

                    <Box sx={{ width: '100%', maxWidth: 700, position: 'relative', pt: { xs: 0.5, md: 1 } }}>
                        <Box
                            sx={{
                                position: 'absolute',
                                inset: '12px -4px -4px -4px',
                                borderRadius: '48px',
                                background: 'linear-gradient(90deg, rgba(0,103,102,0.15) 0%, rgba(0,130,129,0.15) 100%)',
                                filter: 'blur(14px)',
                                opacity: 0.7,
                                pointerEvents: 'none',
                            }}
                        />
                        <Box
                            sx={{
                                height: { xs: 50, sm: 52 },
                                borderRadius: '32px',
                                bgcolor: '#FFFFFF',
                                border: '1px solid rgba(189,201,200,0.3)',
                                boxShadow: '0 6px 8px -6px rgba(0,103,102,0.05), 0 14px 20px -5px rgba(0,103,102,0.05)',
                                px: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                position: 'relative',
                            }}
                        >
                            <Box sx={{ pl: 1.5, pr: 0.5, display: 'flex', alignItems: 'center' }}>
                                <SearchIcon sx={{ fontSize: { xs: 15, sm: 16 }, color: '#006766' }} />
                            </Box>
                            <TextField
                                variant="standard"
                                fullWidth
                                value={query}
                                onChange={(event) => setQuery(event.target.value || '')}
                                onFocus={() => {
                                    if (searchExampleGroup.entries.length > 0) {
                                        setActiveExampleGroup('search');
                                    }
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        setShowLoading(true);
                                        handleSearch(query);
                                    }
                                }}
                                placeholder="Ask about GWAS signals, tissue-specific expression, or SNP impacts..."
                                InputProps={{ disableUnderline: true }}
                                sx={{
                                    '& .MuiInputBase-input': {
                                        fontFamily: 'Inter',
                                        fontSize: { xs: 13, sm: 14 },
                                        color: '#181C1D',
                                        p: 0,
                                    },
                                }}
                            />
                            {query.length > 0 && (
                                <IconButton
                                    size="small"
                                    onMouseDown={(event) => {
                                        event.preventDefault();
                                    }}
                                    onClick={() => {
                                        setQuery('');
                                    }}
                                    sx={{
                                        color: '#98A1AE',
                                        width: 28,
                                        height: 28,
                                        mr: 0.25,
                                    }}
                                >
                                    <CloseIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            )}
                            <Button
                                disableElevation
                                onClick={() => {
                                    setShowLoading(true);
                                    handleSearch(query);
                                }}
                                disabled={!query.trim() || showLoading}
                                sx={{
                                    height: 40,
                                    borderRadius: '24px',
                                    px: { xs: 2.25, sm: 2.5 },
                                    mr: 0.5,
                                    textTransform: 'none',
                                    bgcolor: '#219197',
                                    color: '#FFFFFF',
                                    fontFamily: 'Inter',
                                    fontSize: { xs: 12.5, sm: 13 },
                                    fontWeight: 700,
                                    '&:hover': { bgcolor: '#1C7E83' },
                                    '&.Mui-disabled': { bgcolor: 'rgba(33,145,151,0.45)', color: '#FFFFFF' },
                                }}
                                endIcon={showLoading ? <CircularProgress size={14} sx={{ color: '#FFFFFF' }} /> : <Box component="img" src={landingSendIcon} alt="send" sx={{ width: 18, height: 18 }} />}
                            >
                                Search
                            </Button>
                        </Box>
                    </Box>

                    <Box sx={{ width: '100%', maxWidth: 700, position: 'relative' }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: '10px' }}>
                            {quickCards.map((card) => (
                                <Button
                                    key={card.key}
                                    onClick={() => {
                                        setActiveExampleGroup((prev) => (prev === card.key ? undefined : card.key));
                                    }}
                                    sx={{
                                        borderRadius: '12px',
                                        minHeight: { xs: 74, sm: 74, md: 74 },
                                        px: '14px',
                                        py: '10px',
                                        textTransform: 'none',
                                        justifyContent: 'flex-start',
                                        alignItems: 'flex-start',
                                        flexDirection: 'column',
                                        gap: '6px',
                                        bgcolor: '#FFFFFF',
                                        border: '1px solid #E7EBEF',
                                        color: '#181C1D',
                                        boxShadow: activeExampleGroup === card.key ? '0 4px 10px rgba(0,103,102,0.12)' : '0 1px 0 rgba(0,103,102,0.02)',
                                        transition: 'transform .15s, border-color .15s, box-shadow .15s',
                                        '&:hover': {
                                            bgcolor: '#FFFFFF',
                                            borderColor: '#2EA7A7',
                                            transform: 'translateY(-1px)',
                                        },
                                    }}
                                >
                                    {card.icon}
                                    {renderButtonLabel(card)}
                                </Button>
                            ))}
                        </Box>

                        {activeExampleGroup && (
                            <Paper
                                ref={examplesPanelRef}
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    zIndex: 30,
                                    borderRadius: '12px',
                                    border: '1px solid #E7EBEF',
                                    boxShadow: '0 10px 20px rgba(0,103,102,0.08)',
                                    p: 2,
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {activeExampleGroup === 'search' ? null : activeCard?.icon}
                                        <Typography
                                            sx={{
                                                fontFamily: 'Inter',
                                                fontWeight: 700,
                                                fontSize: 18,
                                                color: '#006766',
                                                textTransform: 'none',
                                                lineHeight: '22px',
                                            }}
                                        >
                                            {activeTitle}
                                        </Typography>
                                    </Box>
                                    <Button
                                        onClick={() => setActiveExampleGroup(undefined)}
                                        sx={{ minWidth: 'auto', p: 0.5, color: '#64748B' }}
                                    >
                                        <CloseIcon sx={{ fontSize: 18 }} />
                                    </Button>
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    {activeExamples.map((example, index) => (
                                        <Button
                                            key={`${activeExampleGroup}-${index}`}
                                            onClick={() => handleExampleClick(example)}
                                            sx={{
                                                minHeight: 50,
                                                px: 1.5,
                                                py: 1,
                                                borderRadius: '8px',
                                                textTransform: 'none',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                bgcolor: '#F2FAFB',
                                                color: '#183B5C',
                                                fontFamily: 'Inter',
                                                fontSize: 15,
                                                fontWeight: 400,
                                                textAlign: 'left',
                                                '&:hover': {
                                                    bgcolor: '#E8F5F6',
                                                },
                                            }}
                                        >
                                            <Box sx={{ pr: 1.5, textAlign: 'left' }}>{example.question}</Box>
                                            <ArrowOutwardIcon sx={{ fontSize: 18, color: '#0F766E', flexShrink: 0 }} />
                                        </Button>
                                    ))}
                                </Box>
                            </Paper>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

export default AgentLandingPage;
