import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined';
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';
import AutoGraphOutlinedIcon from '@mui/icons-material/AutoGraphOutlined';
import CloseIcon from '@mui/icons-material/Close';
import FlareOutlinedIcon from '@mui/icons-material/FlareOutlined';
import SearchIcon from '@mui/icons-material/Search';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
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
import { readRecentChats } from '../utils/chatSessionStorage';

export const utf8ToBase64 = (str) => btoa(unescape(encodeURIComponent(str)));

function AgentLandingPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [query, setQuery] = useState('');
    const [showLoading, setShowLoading] = useState(false);
    const [activeExampleGroup, setActiveExampleGroup] = useState(undefined);
    const [recentChats, setRecentChats] = useState([]);
    const examplesPanelRef = useRef(null);

    useEffect(() => {
        setRecentChats(readRecentChats());
    }, [location.pathname, location.search]);

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
                        link: '/result?sourceTerm=snp@rs2402203&targetTerm=gene@ENSG00000001626&relationship=QTL',
                    },
                ],
            },
            {
                text_before_title: 'Genetics',
                title: 'Gene expression',
                entries: [
                    {
                        question: 'How does INS expression change in T1D versus non-diabetic samples?',
                        link: '/result?sourceTerm=gene@ENSG00000254647&targetTerm=cell_type&relationship=express_in',
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
                <AutoGraphOutlinedIcon key="analysis" sx={{ color: '#006766' }} />,
                <StorageOutlinedIcon key="genetics" sx={{ color: '#006766' }} />,
                <TravelExploreOutlinedIcon key="variant" sx={{ color: '#006766' }} />,
                <FlareOutlinedIcon key="epigenomics" sx={{ color: '#006766' }} />,
            ][index] || <AutoGraphOutlinedIcon sx={{ color: '#006766' }} />,
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
                const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
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
            <Typography sx={{ color: '#6D7979', fontSize: 12, fontFamily: 'Inter', fontWeight: 700, textTransform: 'uppercase', lineHeight: '16px', letterSpacing: '1.20px', wordWrap: 'break-word' }}>
                {card.textBeforeTitle}
            </Typography>
            <Typography sx={{ color: '#181C1D', fontSize: 14, fontFamily: 'Inter', fontWeight: 600, lineHeight: '20px', wordWrap: 'break-word' }}>
                {card.title}
            </Typography>
        </Box>
    );

    return (
        <Box sx={{ flex: 1, bgcolor: '#FFFFFF', display: 'flex', minHeight: 0 }}>
            <Box
                sx={{
                    width: 288,
                    bgcolor: '#F0F4F4',
                    px: 3,
                    py: 3,
                    display: { xs: 'none', lg: 'flex' },
                    flexDirection: 'column',
                    boxShadow: '32px 0 64px -20px rgba(0, 106, 106, 0.04)',
                }}
            >
                <Typography sx={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 24, color: '#006766', mb: 2 }}>
                    PanKgraph
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                    <Button
                        disableElevation
                        startIcon={<AddCommentOutlinedIcon sx={{ color: '#006766' }} />}
                        onClick={() => {
                            setQuery('');
                            setActiveExampleGroup(undefined);
                            navigate('/');
                        }}
                        sx={{
                            justifyContent: 'flex-start',
                            borderRadius: '9999px',
                            bgcolor: '#FFFFFF',
                            color: '#006766',
                            fontFamily: 'Inter',
                            fontSize: 14,
                            fontWeight: 500,
                            textTransform: 'none',
                            height: 44,
                            px: 2,
                        }}
                    >
                        New Chat
                    </Button>
                    <Button
                        startIcon={<AutoGraphOutlinedIcon sx={{ color: '#5A6161' }} />}
                        sx={{ justifyContent: 'flex-start', borderRadius: '9999px', color: '#5A6161', fontFamily: 'Inter', fontSize: 14, fontWeight: 500, textTransform: 'none', height: 44, px: 2 }}
                    >
                        Subagent
                    </Button>
                    <Button
                        startIcon={<TravelExploreOutlinedIcon sx={{ color: '#5A6161' }} />}
                        sx={{ justifyContent: 'flex-start', borderRadius: '9999px', color: '#5A6161', fontFamily: 'Inter', fontSize: 14, fontWeight: 500, textTransform: 'none', height: 44, px: 2 }}
                    >
                        Recent
                    </Button>
                    <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {recentChats.length > 0 ? recentChats.map((chat) => {
                            const encodedQuestion = encodeURIComponent(utf8ToBase64(chat.firstQuestion || ''));
                            const target = `/result-new2?question=${encodedQuestion}&terminal=true&session_id=${encodeURIComponent(chat.sessionId)}`;
                            return (
                                <Button
                                    key={chat.sessionId}
                                    onClick={() => navigate(target)}
                                    sx={{
                                        justifyContent: 'flex-start',
                                        borderRadius: '12px',
                                        color: '#405252',
                                        fontFamily: 'Inter',
                                        fontSize: 12,
                                        fontWeight: 500,
                                        textTransform: 'none',
                                        minHeight: 34,
                                        px: 1.5,
                                        py: 0.75,
                                        bgcolor: 'rgba(255,255,255,0.75)',
                                        '&:hover': { bgcolor: '#FFFFFF' },
                                    }}
                                >
                                    <Box sx={{ textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                                        {chat.firstQuestion}
                                    </Box>
                                </Button>
                            );
                        }) : (
                            <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#7B8A8A', px: 2 }}>
                                No recent conversations yet.
                            </Typography>
                        )}
                    </Box>
                </Box>
                <Button
                    startIcon={<SettingsOutlinedIcon sx={{ color: '#5A6161' }} />}
                    sx={{ justifyContent: 'flex-start', borderRadius: '9999px', color: '#5A6161', fontFamily: 'Inter', fontSize: 14, fontWeight: 500, textTransform: 'none', height: 44, px: 2 }}
                >
                    Settings & help
                </Button>
            </Box>

            <Box
                sx={{
                    flex: 1,
                    px: { xs: 2, md: 4 },
                    py: { xs: 8, md: 12 },
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

                <Box sx={{ maxWidth: 992, mx: 'auto', position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <Box sx={{ width: '100%', maxWidth: 768, textAlign: 'center' }}>
                        <Typography sx={{ fontFamily: 'Inter', fontWeight: 900, fontSize: 48, lineHeight: '48px', letterSpacing: '-2.4px' }}>
                            <Box component="span" sx={{ color: '#4E4E4E', fontSize: 48, fontFamily: 'Inter', fontWeight: 900, lineHeight: '48px', letterSpacing: '-2.4px', wordWrap: 'break-word' }}>
                                What would you like to{' '}
                            </Box>
                            <Box component="span" sx={{ color: '#219197', fontSize: 48, fontFamily: 'Inter', fontWeight: 900, letterSpacing: 'normal', wordWrap: 'break-word' }}>
                                explore?
                            </Box>
                        </Typography>
                        <Typography sx={{ mt: 2, fontFamily: 'Inter', fontWeight: 400, fontSize: 18, lineHeight: 1.625, color: '#4C6261' }}>
                            Explore our comprehensive database of T1D–related data,<br />
                            knowledge, and insights. Simply type your question—our<br />
                            PanKgraph agent finds the answers.
                        </Typography>
                    </Box>

                    <Box sx={{ width: '100%', maxWidth: 768, position: 'relative', pt: 2 }}>
                        <Box
                            sx={{
                                position: 'absolute',
                                inset: '16px -4px 0 -4px',
                                borderRadius: '48px',
                                background: 'linear-gradient(90deg, rgba(0,103,102,0.2) 0%, rgba(0,130,129,0.2) 100%)',
                                filter: 'blur(8px)',
                                pointerEvents: 'none',
                            }}
                        />
                        <Box
                            sx={{
                                height: 100,
                                borderRadius: '50px',
                                bgcolor: '#FFFFFF',
                                border: '1px solid rgba(189,201,200,0.1)',
                                boxShadow: '0 8px 20px -6px rgba(0,103,102,0.05), 0 20px 50px -5px rgba(0,103,102,0.05)',
                                px: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                position: 'relative',
                            }}
                        >
                            <Box sx={{ px: 1.5, display: 'flex', alignItems: 'center' }}>
                                <SearchIcon sx={{ fontSize: 26, color: '#006766' }} />
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
                                        fontSize: { xs: 16, md: 20 },
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
                                    height: 48,
                                    borderRadius: '32px',
                                    px: 4,
                                    mr: 0.5,
                                    textTransform: 'none',
                                    bgcolor: '#219197',
                                    color: '#FFFFFF',
                                    fontFamily: 'Inter',
                                    fontSize: 16,
                                    fontWeight: 600,
                                    '&:hover': { bgcolor: '#1C7E83' },
                                    '&.Mui-disabled': { bgcolor: 'rgba(33,145,151,0.45)', color: '#FFFFFF' },
                                }}
                                endIcon={showLoading ? <CircularProgress size={14} sx={{ color: '#FFFFFF' }} /> : <Box component="img" src={landingSendIcon} alt="send" sx={{ width: 18, height: 18 }} />}
                            >
                                Search
                            </Button>
                        </Box>
                    </Box>

                    <Box sx={{ width: '100%', maxWidth: 768, position: 'relative' }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                            {quickCards.map((card) => (
                                <Button
                                    key={card.key}
                                    onClick={() => {
                                        setActiveExampleGroup((prev) => (prev === card.key ? undefined : card.key));
                                    }}
                                    sx={{
                                        borderRadius: '32px',
                                        minHeight: 132,
                                        px: 3,
                                        py: 3,
                                        textTransform: 'none',
                                        justifyContent: 'flex-start',
                                        alignItems: 'flex-start',
                                        flexDirection: 'column',
                                        gap: 1.5,
                                        bgcolor: 'rgba(240,244,244,0.8)',
                                        border: '1px solid rgba(189,201,200,0.05)',
                                        backdropFilter: 'blur(4px)',
                                        color: '#181C1D',
                                        boxShadow: activeExampleGroup === card.key ? '0 5px 12px rgba(15,118,110,0.14)' : 'none',
                                        '&:hover': {
                                            bgcolor: 'rgba(235,242,242,0.95)',
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
                                    borderRadius: '16px',
                                    border: '1px solid #E6F0FC',
                                    boxShadow: '0 8px 22px rgba(15,118,110,0.12)',
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

                    <Box
                        sx={{
                            mt: 0.5,
                            borderRadius: '9999px',
                            px: 2,
                            py: 0.75,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 1,
                            bgcolor: 'rgba(204,228,227,0.3)',
                            border: '1px solid rgba(0,103,102,0.1)',
                        }}
                    >
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#006766' }} />
                        <Typography sx={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#006766' }}>
                            Precision Engine v2.4 Beta
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

export default AgentLandingPage;
