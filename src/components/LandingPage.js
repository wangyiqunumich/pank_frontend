import React, {
    useEffect,
    useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import {
    Autocomplete,
    Box,
    Button,
    Container,
    Link,
    Paper,
    TextField,
    Typography,
} from '@mui/material';

import apiImage from '../image/api.svg';
import chromatinImage from '../image/chromatin.svg';
import complexImage from '../image/complex.svg';
import dumpImage from '../image/dump.svg';
import geneImage from '../image/gene.svg';
import regulationImage from '../image/regulation.svg';
import {
    AlertMessage,
    LandingPageCard,
    LoadingMessage,
} from './SupportingMaterial';

const ExampleQueries = {
    "default": [
        "Which cis-regulatory elements are found near the promoter of TP53?",
        "What SNPs are annotated in the enhancer region on chr6:32000000–32100000?",
        "What variants are located within 5kb upstream of the CFTR gene?",
        "Is rs123456 located in a known cis-regulatory element?",
    ],
    "gene": [
        "Which cis-regulatory elements are found near the promoter of TP53?",
        "What SNPs are annotated in the enhancer region on chr6:32000000–32100000?",
        "What variants are located within 5kb upstream of the CFTR gene?",
        "Is rs123456 located in a known cis-regulatory element?"
    ],
    "regulation": [
    ],
    "chromatin": [
    ],
    "complex": [
    ]
}

const ExampleClasses = {
    "gene": {
        label: "Gene & Variant Info",
        hint: "Gene & variant example questions",
        icon: geneImage,
    },
    "regulation": {
        label: "Regulation & Traits",
        hint: "Regulation & trait example questions",
        icon: regulationImage,
    },
    "chromatin": {
        label: "Chromatin Interactions",
        hint: "Chromatin interaction example questions",
        icon: chromatinImage,
    },
    "complex": {
        label: "Complex Regulation",
        hint: "Complex regulation example questions",
        icon: complexImage,
    }
};

const handleSearch = (query) => {
}

function LandingPage() {
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [query, setQuery] = useState('');
    const [focused, setFocused] = useState(false);
    const [showExamples, setShowExamples] = useState(undefined);
    const [showWarning, setShowWarning] = useState(false);
    const [showLoading, setShowLoading] = useState(false);
    const [showCard, setShowCard] = useState(true);

    const navigate = useNavigate();

    useEffect(() => {
        function handleResize() {
            setWindowWidth(window.innerWidth)
        }
        window.addEventListener('resize', handleResize);
        return (_) => {
            window.removeEventListener('resize', handleResize);
        };
    });

    return (
        <Container maxWidth={false} disableGutters sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: '40px',
            paddingLeft: { sm: 0, md: '6%' },
            paddingRight: { sm: 0, md: '6%' },
            paddingBottom: '40px',
        }}>
            <Typography sx={{
                fontFamily: 'Inter',
                fontWeight: 800,
                fontSize: '54px',
                textAlign: 'center',
                color: '#183B5C'
            }}>
                Genomic Knowledge Base
            </Typography>
            <Typography sx={{
                fontFamily: 'Inter',
                fontWeight: 500,
                fontSize: '18px',
                color: '#7F8DA1',
                textAlign: 'center',
                paddingBottom: '84px',
            }}>
                Ask a question about human genome
            </Typography>
            <AlertMessage
                type="warning"
                content="Please ensure all boxes are filled out before submitting"
                open={showWarning}
                onClose={() => setShowWarning(false)}
                sx={{
                    '& .MuiSnackbar-root': {
                        position: 'static',
                        transform: 'none',
                        top: 'auto',
                        left: 'auto',
                        right: 'auto',
                        bottom: 'auto',
                    },
                    '& .MuiAlert-root': {
                        marginBottom: '10px',
                    }
                }}
            />
            <LoadingMessage
                open={showLoading}
                onClose={() => setShowLoading(false)}
                onCancel={() => setShowLoading(false)}
            />
            <Box className="content-wrapper" sx={{
                width: '100%',
                maxWidth: '1200px',
                justifyContent: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}>
                <Box className="llm-searchbar" sx={{
                    width: '100%',
                    display: 'flex',
                    gap: 2,
                    marginX: { sm: "0px", md: "80px" },
                    backgroundColor: 'white',
                    borderRadius: '30px',
                    boxShadow: '8px 6px 33px 0px #D8E6F8',
                }}>
                    <Autocomplete
                        freeSolo
                        fullWidth
                        options={ExampleQueries.default}
                        filterOptions={(options) => (query?.trim() === '' ? options : [])}
                        onChange={(event, newValue) => {
                            setQuery(newValue || '');
                        }}
                        onInputChange={(event, newInputValue) => {
                            setQuery(newInputValue || '');
                        }}
                        openOnFocus
                        getOptionLabel={(option) => option}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        inputValue={query}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                size="small"
                                placeholder="Ask a question about human genome # or when input starts"
                                sx={{
                                    height: '60px', // Increase the height of the input box
                                    width: '100%',
                                    '& .MuiInputBase-root': {
                                        borderRadius: '30px',
                                        height: '60px', // Adjust the height of the input field
                                        alignItems: 'center', // Center the text vertically
                                        paddingRight: '10px', // Remove right padding
                                        '& fieldset': {
                                            border: 'none',
                                        },
                                    },
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'grey', // Optional: Customize border color
                                    },
                                }}
                                fullWidth
                                InputProps={{
                                    ...params.InputProps,
                                    startAdornment: (
                                        <>
                                            <SearchIcon sx={{ marginLeft: '20px', fontSize: '20px' }} />
                                            {params.InputProps.startAdornment}
                                        </>
                                    ),
                                    endAdornment: (
                                        <Box display="flex" alignItems="center" sx={{
                                            position: 'absolute',
                                            right: 0,
                                        }}>
                                            {/* Clear Icon */}
                                            {query !== "" ? <CloseIcon
                                                onClick={() => {
                                                    setQuery(''); // Clear the input field
                                                }}
                                                sx={{
                                                    color: 'grey.500',
                                                    cursor: 'pointer',
                                                    fontSize: '20px', // Adjust size as needed
                                                    marginRight: '8px', // Add spacing from the SendIcon
                                                }}
                                            /> : <Box sx={{
                                                height: "28px",
                                                width: "28px",
                                                borderRadius: "50%",
                                                background: '#CEDDFF',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                marginRight: '8px',
                                                fontFamily: 'Inter',
                                                fontWeight: 300,
                                                color: '#3e6396',
                                                cursor: 'pointer',
                                            }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                                ?
                                            </Box>}
                                            {/* Search Icon */}
                                            <Box
                                                sx={{
                                                    height: "60px",
                                                    width: "150px",
                                                    borderRadius: "50px",
                                                    background: !query.trim() ? "linear-gradient(90.46deg, rgba(112, 134, 253, 0.3) 0.44%, rgba(70, 99, 254, 0.3) 99.65%)" : "linear-gradient(90.46deg, #7086FD 0.44%, #4663FE 99.65%)",
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',

                                                    cursor: !query.trim() ? 'not-allowed' : 'pointer',
                                                }}
                                                onClick={!query.trim()
                                                    ? () => { setShowWarning(true) }
                                                    : () => {
                                                        setShowLoading(true);
                                                        handleSearch(query.trim());
                                                    }}
                                            >
                                                <Typography
                                                    className="search-button"

                                                    sx={{
                                                        color: 'white',
                                                        fontFamily: 'Inter',
                                                        fontSize: '20px',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Search
                                                </Typography>
                                            </Box>
                                        </Box>
                                    ),
                                }}

                            />
                        )}
                        PaperComponent={({ children }) => (
                            <Paper
                                sx={{
                                    borderRadius: '16px',
                                    border: "1.5px solid #E6F0FC",
                                    boxShadow: 'none',
                                    padding: '20px',
                                    marginTop: '16px',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    alignContent: 'center',
                                    height: '450px',
                                    "& .MuiAutocomplete-option.Mui-focused": {
                                        backgroundColor: '#c1caf7 !important',
                                    },
                                    "& .MuiAutocomplete-option": {
                                        backgroundColor: '#ECF2FF !important',
                                        height: '50px',
                                        borderRadius: '8px',
                                        marginBottom: '12px',
                                    },
                                }}
                            >
                                <Box>
                                    {children}
                                </Box>
                                <Link component={"button"}
                                    sx={{
                                        textDecoration: 'none',
                                        textAlign: 'center',
                                        alignSelf: 'center',
                                        color: '#1A74FF',
                                        fontFamily: 'Inter',
                                        fontWeight: 700,
                                        fontSize: '16px',
                                    }} onClick={(e) => {
                                        navigate("/docs/api");
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }} onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}>
                                    What GKB can tell you?
                                </Link>
                            </Paper>
                        )}
                        renderOption={(props, option) => (
                            <Box
                                component="li"
                                {...props}
                                sx={{
                                    minHeight: '36px !important',
                                    '& .MuiAutocomplete-option': {
                                        backgroundColor: '#F3F5FF !important',
                                    },
                                }}
                            >
                                {option}
                                <span className={"highlight-arrow"} style={{ color: 'black', marginLeft: 'auto' }}><ArrowOutwardIcon fontSize="small" /></span>
                            </Box>
                        )}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                if (query.trim() === '') {
                                    setShowWarning(true);
                                } else {
                                    e.preventDefault();
                                    setShowLoading(true);
                                    handleSearch(query.trim());
                                }
                            }
                        }}
                    />

                </Box>
                <Box className="example-class" sx={{ height: '0px', width: '100%' }}>
                    {showExamples && <Paper sx={{
                        width: 'calc(100% - 32px)',
                        maxWidth: '1200px',
                        marginTop: '24px',
                        padding: '16px',
                        borderRadius: '16px',
                        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
                        position: 'relative',
                        zIndex: 1000,
                    }}>
                        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px' }}>
                            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                <img src={ExampleClasses[showExamples].icon} alt={showExamples} style={{ width: '20px', height: '20px', marginRight: '8px' }} />
                                <Typography sx={{
                                    fontFamily: 'Inter',
                                    fontWeight: 600,
                                    fontSize: '18px',
                                    color: '#1F66EA',
                                }}>
                                    {ExampleClasses[showExamples].hint}
                                </Typography>
                            </Box>
                            <CloseIcon
                                onClick={() => setShowExamples(undefined)}
                                sx={{
                                    color: 'grey.500',
                                    cursor: 'pointer',
                                    fontSize: '20px',
                                }}
                            />
                        </Box>
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            flexWrap: 'wrap',
                        }}>
                            {ExampleQueries[showExamples].map((example, index) => (
                                <Link key={index} href="#" sx={{
                                    textDecoration: 'none',
                                    "&:hover": {
                                        ".MuiBox-root": {
                                            backgroundColor: '#c1caf7 !important',
                                        },
                                    },
                                }}>
                                    <Box sx={{
                                        display: 'flex',
                                        padding: '12px',
                                        backgroundColor: '#ECF2FF',
                                        borderRadius: '8px',
                                        fontFamily: 'Inter',
                                        fontWeight: 400,
                                        fontSize: '16px',
                                        color: '#183B5C',
                                        justifyContent: 'space-between',
                                    }}>
                                        {example}
                                        <span className={"highlight-arrow"} style={{ color: 'black' }}><ArrowOutwardIcon fontSize="small" /></span>
                                    </Box>
                                </Link>
                            ))}
                        </Box>
                    </Paper>}
                </Box>
                <Box className="example-classes" sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    marginTop: '24px',
                }}>
                    Examples:
                    {
                        Object.keys(ExampleClasses).map((key) => (
                            <Button key={key} className="example-class" sx={{
                                display: 'flex',
                                alignItems: 'center',
                                margin: '8px',
                                cursor: 'pointer',
                                backgroundColor: showExamples === key ? '#E6F0FC' : '#F3F5FF',
                                borderRadius: '16px',
                                padding: '0 8px',
                                height: '32px',
                                border: '1px solid #1F66EA',
                                textTransform: 'none',

                            }} onClick={() => {
                                setShowExamples(showExamples === key ? undefined : key);
                            }}>
                                <img src={ExampleClasses[key].icon} alt={key} style={{ width: '20px', height: '20px', marginRight: '8px' }} />
                                <Typography sx={{
                                    fontFamily: 'Inter',
                                    fontWeight: 400,
                                    fontSize: '16px',
                                    color: '#1F66EA'
                                }}>
                                    {ExampleClasses[key].label}
                                </Typography>
                            </Button>
                        ))
                    }
                </Box>
                <LandingPageCard open={showCard} onToggle={() => setShowCard(!showCard)} sx={{ marginTop: '24px' }} />
            </Box>
            <Box className="landing-page-footer" sx={{
                position: 'absolute',
                bottom: 0,
                height: '83px',
                width: '100%',
                background: "linear-gradient(180deg, #FFFFFF 0.81%, #E5F1FF 115.09%)",
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexDirection: 'row'
            }}>
                <div style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '0px',
                    height: '32px',
                    border: '1px solid #000000',
                    opacity: 0.2,
                }}></div>
                <Box sx={{ width: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={apiImage} alt="API" style={{ marginRight: '8px' }} />
                    <Link href="/api" sx={{
                        fontFamily: 'Inter',
                        fontWeight: 600,
                        fontSize: '20px',
                        color: '#1C3C68',
                        textAlign: 'center',
                    }}>
                        Access GKB with API
                    </Link>
                </Box>
                <Box sx={{ width: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={dumpImage} alt="Data Dump" style={{ marginRight: '8px' }} />
                    <Link href="/api" sx={{
                        fontFamily: 'Inter',
                        fontWeight: 600,
                        fontSize: '20px',
                        color: '#1C3C68',
                        textAlign: 'center',
                    }}>
                        DB dump of GKB database
                    </Link>
                </Box>
            </Box>
        </Container>
    );
}

export default LandingPage;
