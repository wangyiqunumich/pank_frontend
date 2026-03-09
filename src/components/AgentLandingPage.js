import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import TerminalIcon from '@mui/icons-material/Terminal';
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Container,
  IconButton,
  Link,
  Paper,
  TextField,
  Typography,
} from '@mui/material';

import landingPageLogo from '../image/landing image cropped.png';
import ExampleQueries from '../schema/landing_sample_questions.json';

export const utf8ToBase64 = (str) => btoa(unescape(encodeURIComponent(str)));
export const base64ToUtf8 = (base64) => decodeURIComponent(escape(atob(base64)));

function BetaBadge({ sx }) {
  const [hover, setHover] = useState(false);

  return (
    <Box
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      sx={{
        display: "inline-flex",
        height: 'fit-content',
        alignItems: "center",
        border: "1.5px solid #f0d98c",
        borderRadius: "9999px",
        backgroundColor: "#FFFFFF",
        px: 1.5,
        py: '6px',
        cursor: "default",
        transition: "all 0.3s ease",
        ...sx
      }}
    >
      <Collapse in={hover} orientation="horizontal" collapsedSize={0}>
        <Typography
          sx={{
            color: "#d4aa00",
            fontWeight: 800,
            fontSize: "16px",
            whiteSpace: "nowrap",
            fontFamily: 'Inter',
          }}
        >
          This is the beta version — data coverage is currently limited.
        </Typography>
      </Collapse>
      <Collapse in={!hover} orientation="horizontal" collapsedSize={0}>
        <Typography
          sx={{
            color: "#d4aa00",
            fontWeight: 800,
            fontSize: "16px",
            whiteSpace: "nowrap",
            fontFamily: 'Inter',
          }}
        >
          Beta
        </Typography>
      </Collapse>
    </Box>
  );
}

const ExampleClassStyles = [
  {
    color: "#067A71",
    bgcolor: "#F1FDFA",
    bdcolor: "#95F6E4",
  },
  {
    color: "#2654E9",
    bgcolor: "#EFF6FF",
    bdcolor: "#BFDBFF",
  },
  {
    color: "#008236",
    bgcolor: "#EFFDF4",
    bdcolor: "#B9F8CF",
  },
  {
    color: "#007595",
    bgcolor: "#ECFEFF",
    bdcolor: "#A2F4FD",
  },
];

function LandingPage() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(true);
  const [query, setQuery] = useState('');
  const [showExamples, setShowExamples] = useState(undefined);
  const [focused, setFocused] = useState(false);
  const [showWarning, setShowWarning] = useState(undefined);
  const [lastWarning, setLastWarning] = useState(undefined);
  const [currentQuery, setCurrentQuery] = useState(undefined);
  const refCurrentQuery = useRef(currentQuery);
  const navigate = useNavigate();
  const exampleClassKeys = React.useMemo(
    () => Object
      .keys(ExampleQueries || {})
      .filter((key) => key !== 'default' && Array.isArray(ExampleQueries?.[key]))
      .slice(0, 4),
    []
  );

  useEffect(() => {
    refCurrentQuery.current = currentQuery;
  }, [currentQuery]);

  useEffect(() => {
    if (showWarning) {
      setLastWarning(showWarning);
    }
  }, [showWarning]);
  const [showLoading, setShowLoading] = useState(false);
  const [showCard, setShowCard] = useState(true);

  const paperRef = useRef();
  useEffect(() => {
    function handleClickOutside(event) {
      if (paperRef.current && !paperRef.current.contains(event.target)) {
        setShowExamples(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const isSearchBarDisabled = !selectedQuestion;

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize);
    return (_) => {
      window.removeEventListener('resize', handleResize);
    };
  });

  const handleTargetTermChange = (newTargetTerm) => {
    console.log(newTargetTerm);
    if (newTargetTerm) {
      setSelectedQuestion(`Which SNP serves as the quantitative trait locus (QTL) for ${newTargetTerm.toUpperCase()}?`);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSnackbar(false);
  };

  const handleSearch = (searchQuery) => {
    const encodedQuery = encodeURIComponent(utf8ToBase64(searchQuery));
    navigate(`/result-new2?question=${encodedQuery}&terminal=true`);
  };

  return (
    <Container maxWidth={false} disableGutters sx={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      marginTop: '0px',
      // marginBottom: '40px',
    }}>
      <Container maxWidth={false} disableGutters sx={{
        display: 'flex',
        flexDirection: { sm: 'column', md: 'row' }, justifyContent: 'center',
        alignItems: 'center',
        paddingTop: '0px',
        paddingBottom: '0px',
        height: "100%",
      }}>
        {/* <Snackbar
        open={openSnackbar}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity="info" 
          sx={{ 
            width: '100%',
            backgroundColor: '#E4F0F1',
            '& .MuiAlert-icon': {
              color: '#219197'
            }
          }}
        >
          LLM page is currently under maintenance. We apologize for any inconvenience.
        </Alert>
      </Snackbar> */}

        {/* 左侧图片 */}
        <Box sx={{
          width: { sm: '90%', md: '45%' },
          position: 'relative',
          margin: '30px',
          marginLeft: '60px',
          marginRight: '10px',
          paddingBottom: '100px',
          height: '425px',
          '& img': {
            width: { sm: '100%', md: '100%' },
            maxHeight: '425px',
            objectFit: 'contain',
            objectPosition: 'center',
            marginTop: { sm: '0px', md: '50px' },
            marginLeft: { sm: '0px', md: '0' },
            transform: { sm: 'none', md: 'translateX(-4%)' }
          },
        }}>
          <Box sx={{
            position: { sm: 'relative', md: 'absolute' },
            top: { sm: '0', md: '0' },
            left: 0,
            right: 0,
            bottom: 0,
            margin: 'auto',
            display: 'flex', flexDirection: 'column', justifyContent: 'top', alignItems: 'flex-start',
          }}>
            <img src={landingPageLogo} alt="PanKgraph" />
            <Box sx={{
              display: 'flex',
              position: "relative",
              justifyContent: 'center',
              marginTop: '20px',
              alignItems: 'center',
              left: "calc(50% - 20px)",
              transform: { sm: 'none', md: 'translateX(-50%)' }
            }}>
              <TerminalIcon sx={{ width: '30px', color: '#C48E25' }} />
              <Typography sx={{ marginLeft: '10px', fontSize: '20px' }}>
                Access PanKgraph with <Link
                  href={process.env.REACT_APP_PANKGRAPH_LINK + '/api'}
                  sx={{ textDecoration: 'underline', color: 'black', textAlign: 'right' }}>API</Link>
              </Typography>
            </Box>
          </Box>
        </Box>


        {/* 右侧内容区域 */}
        <Box sx={{
          width: { sm: '90%', md: '55%' },
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          marginRight: 1,
          justifyContent: 'center',
          marginLeft: { sm: '5%', md: 0 },
          marginTop: '-20px',
          paddingTop: '20px',
          paddingX: '40px',
          minHeight: { sm: 'unset', md: '500px' },
          backgroundColor: '#F2FAFB',
        }}>

          {/* 更新 Question 组件，传入 setSelectedQuestion */}
          {/* <Question
            selectedQuestion={selectedQuestion}
            setSelectedQuestion={setSelectedQuestion}
          /> */}
          <Box className="content-wrapper" sx={{
            width: '100%',
            maxWidth: '1200px',
            justifyContent: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            paddingBottom: '100px',
          }}>
            <Box sx={{
              display: 'flex',
              flexDirection: 'row',
              paddingBottom: '20px',
              alignItems: 'center',
              gap: '5px',
              flexWrap: 'wrap',
            }}>
              <Typography sx={{ color: '#4E4E4E', fontSize: 32, fontFamily: 'Open Sans', fontWeight: '700' }}>
                Search PanKgraph
              </Typography>
              <Box sx={{ width: '400px' }} >
                <BetaBadge sx={{ transform: 'translateY(4px)' }} />
              </Box>
            </Box>
            <Typography sx={{ paddingBottom: '32px', color: '#5A5555', fontSize: 20, fontFamily: 'Open Sans', fontWeight: '600' }}>
              Explore our comprehensive database of T1D–related data, knowledge, and insights. Simply type your question—our PanKgraph agent finds the answers.
            </Typography>
            <Box className="llm-searchbar" sx={{
              width: 'calc(100% - 20px)',
              display: 'flex',
              gap: 2,
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: "0px 10px 35px 0px #00000014"
            }}>
              <Autocomplete
                freeSolo
                fullWidth
                options={ExampleQueries.default}
                filterOptions={(options) => (query?.trim() === '' ? options : [])}
                onChange={(event, newValue) => {
                  setQuery(newValue.question || '');
                  if (!!newValue.link) {
                    window.location.href = newValue.link;
                  }
                }}
                onInputChange={(event, newInputValue) => {
                  setQuery(newInputValue || '');
                }}
                openOnFocus
                getOptionLabel={(option) => option.question}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                inputValue={query}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder="Ask a question about [GENE], [SNP], QTL, or T1D"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        if (!query.trim()) {
                          setShowWarning("Please ensure all boxes are filled out before submitting");
                          return;
                        }
                        setShowLoading(true);
                        handleSearch(query.trim());
                      }
                    }}
                    sx={{
                      height: '85px', // Increase the height of the input box
                      width: '100%',
                      '& .MuiInputBase-root': {
                        fontSize: '22px',
                        borderRadius: '12px',
                        width: '100%',
                        height: '85px',
                        alignItems: 'center',
                        padding: '14px 20px !important',
                        '& fieldset': {
                          border: 'none',
                        },
                      },
                      '& .MuiInputBase-input': {
                        padding: '0 !important',
                        minWidth: 0,
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'grey',
                      },
                    }}
                    fullWidth
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <Box sx={{ display: 'flex', alignItems: 'center', mr: 1.5 }}>
                          <SearchIcon sx={{ fontSize: '40px', color: '#98A1AE' }} />
                          {params.InputProps.startAdornment}
                        </Box>
                      ),
                      endAdornment: (
                        <Box display="flex" alignItems="center" sx={{ gap: 1, ml: 1, flexShrink: 0 }}>
                          {/* Clear Icon */}
                          {query !== "" ? <CloseIcon
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onClick={() => {
                              setQuery(''); // Clear the input field
                            }}
                            sx={{
                              color: 'grey.500',
                              cursor: 'pointer',
                              fontSize: '20px',
                            }}
                          /> : <Box sx={{
                            height: "28px",
                            width: "28px",
                            borderRadius: "50%",
                            background: '#CEDDFF',
                            // display: 'flex',
                            display: 'none',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: '8px',
                            fontFamily: 'Open Sans',
                            fontWeight: 300,
                            color: '#3e6396',
                            cursor: 'pointer',
                          }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                            ?
                          </Box>}
                          {/* Search Icon */}
                          <Button
                            type="button"
                            disableElevation
                            disabled={!query.trim() || showLoading}
                            onClick={!query.trim()
                              ? () => { setShowWarning("Please ensure all boxes are filled out before submitting") }
                              : () => {
                                setShowLoading(true);
                                handleSearch(query.trim());
                              }}
                            sx={{
                              height: "54px",
                              minWidth: { xs: "110px", md: "132px" },
                              borderRadius: "16px",
                              px: 2,
                              textTransform: 'none',
                              backgroundColor: '#219197',
                              color: '#FFFFFF',
                              fontFamily: 'Open Sans',
                              fontSize: '20px',
                              fontWeight: 600,
                              transition: 'transform 120ms ease, box-shadow 160ms ease, background-color 160ms ease, filter 160ms ease',
                              boxShadow: '0 6px 14px rgba(33,145,151,0.28)',
                              '&:hover': {
                                backgroundColor: '#1D838A',
                                boxShadow: '0 10px 20px rgba(33,145,151,0.34)',
                                transform: 'translateY(-1px)',
                              },
                              '&:active': {
                                transform: 'translateY(1px) scale(0.985)',
                                boxShadow: '0 4px 10px rgba(33,145,151,0.26)',
                              },
                              '&.Mui-focusVisible': {
                                outline: '2px solid #84D6DB',
                                outlineOffset: '2px',
                              },
                              '&.Mui-disabled': {
                                backgroundColor: '#21919780',
                                color: 'rgba(255,255,255,0.92)',
                                boxShadow: 'none',
                              },
                            }}
                          >
                            {showLoading ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CircularProgress size={16} sx={{ color: '#FFFFFF' }} />
                                <Typography sx={{ color: 'inherit', fontFamily: 'inherit', fontSize: '16px', fontWeight: 700 }}>
                                  Searching...
                                </Typography>
                              </Box>
                            ) : (
                              <Typography
                                className="search-button"
                                sx={{
                                  color: 'inherit',
                                  fontFamily: 'inherit',
                                  fontSize: '20px',
                                  fontWeight: 700,
                                  letterSpacing: '0.01em',
                                }}
                              >
                                Search
                              </Typography>
                            )}
                          </Button>
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
                      height: '220px',
                      "& .MuiAutocomplete-option.Mui-focused": {
                        backgroundColor: '#E8F5F6 !important',
                      },
                      "& .MuiAutocomplete-option": {
                        backgroundColor: '#F2FAFB !important',
                        height: '50px',
                        borderRadius: '8px',
                        marginBottom: '12px',
                        transition: 'transform 120ms ease, background-color 150ms ease, box-shadow 150ms ease',
                      },
                      "& .MuiAutocomplete-option:hover": {
                        backgroundColor: '#E8F5F6 !important',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 3px 10px rgba(15,118,110,0.10)',
                      },
                      "& .MuiAutocomplete-option:active": {
                        transform: 'translateY(0px) scale(0.995)',
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
                        color: '#219197',
                        fontFamily: 'Open Sans',
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
                      What PanKgraph can tell you?
                    </Link>
                  </Paper>
                )}
                renderOption={(props, option) => (
                  <Box
                    component="li"
                    {...props}
                    key={option.question}
                    sx={{
                      minHeight: '36px !important',
                      cursor: 'pointer',
                      '& .highlight-arrow': {
                        transition: 'transform 140ms ease, color 140ms ease',
                      },
                      '&:hover .highlight-arrow': {
                        transform: 'translateX(3px)',
                        color: '#0F766E',
                      },
                    }}
                  >
                    {option.question}
                    <span className={"highlight-arrow"} style={{ color: 'black', marginLeft: 'auto' }}><ArrowOutwardIcon fontSize="small" /></span>
                  </Box>
                )}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.defaultMuiPrevented = true;
                    if (query.trim() === '') {
                      setShowWarning("Please ensure all boxes are filled out before submitting");
                    } else {
                      e.preventDefault();
                      setShowLoading(true);
                      console.log(query.trim());
                      handleSearch(query.trim());
                    }
                  }
                }}
              />

            </Box>
            <Box className="example-class" sx={{ height: '0px', width: '100%' }}>
              {showExamples && <Paper
                ref={paperRef}
                sx={{
                  width: 'calc(100% - 52px)',
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
                    <Typography sx={{
                      fontFamily: 'Open Sans',
                      fontWeight: 600,
                      fontSize: '18px',
                      color: '#219197',
                    }}>
                      {showExamples} Examples
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    aria-label="close examples"
                    onClick={() => setShowExamples(undefined)}
                    sx={{
                      width: 32,
                      height: 32,
                      border: '1px solid #D7E3EA',
                      color: '#64748B',
                      backgroundColor: '#FFFFFF',
                      transition: 'background-color 150ms ease, color 150ms ease, border-color 150ms ease, transform 120ms ease',
                      '&:hover': {
                        backgroundColor: '#EEF6F7',
                        color: '#0F766E',
                        borderColor: '#9FD5DC',
                        transform: 'translateY(-1px)',
                      },
                      '&:active': {
                        transform: 'translateY(0px) scale(0.96)',
                      },
                      '&.Mui-focusVisible': {
                        outline: '2px solid #84D6DB',
                        outlineOffset: '2px',
                      },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}>
                  {(ExampleQueries?.[showExamples] || []).map((example, index) => (
                    <Link key={index} href="#" sx={{
                      textDecoration: 'none',
                      display: 'block',
                      "&:hover": {
                        textDecoration: 'none',
                      },
                    }} onClick={(e) => {
                      e.preventDefault();
                      setQuery(example.question);
                      if (example.link) {
                        window.location.href = example.link;
                        return;
                      }
                      setShowExamples(undefined);
                    }}>
                      <Box sx={{
                        display: 'flex',
                        padding: '12px',
                        backgroundColor: '#F2FAFB',
                        borderRadius: '8px',
                        fontFamily: 'Open Sans',
                        fontWeight: 400,
                        fontSize: '16px',
                        color: '#183B5C',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'background-color 150ms ease, transform 120ms ease, box-shadow 150ms ease',
                        '& .highlight-arrow': {
                          transition: 'transform 140ms ease, color 140ms ease',
                        },
                        '&:hover': {
                          backgroundColor: '#E8F5F6',
                          boxShadow: '0 3px 10px rgba(15,118,110,0.10)',
                          transform: 'translateY(-1px)',
                        },
                        '&:hover .highlight-arrow': {
                          transform: 'translateX(3px)',
                          color: '#0F766E',
                        },
                        '&:active': {
                          transform: 'translateY(0px) scale(0.996)',
                        },
                      }}>
                        {example.question}
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
              {
                exampleClassKeys.map((key, index) => {
                  const style = ExampleClassStyles[index % ExampleClassStyles.length];
                  return (
                    <Button key={key} className="example-class" sx={{
                      display: 'flex',
                      alignItems: 'center',
                      margin: '8px',
                      cursor: 'pointer',
                      backgroundColor: style.bgcolor,
                      borderRadius: '20px',
                      padding: '8px 16px',
                      border: `1px solid ${style.bdcolor}`,
                      textTransform: 'none',
                      transition: 'transform 120ms ease, box-shadow 160ms ease, background-color 160ms ease, border-color 160ms ease',
                      boxShadow: showExamples === key ? '0 5px 12px rgba(15,118,110,0.18)' : 'none',
                      '&:hover': {
                        backgroundColor: '#EAF7F8',
                        borderColor: '#8DCFD6',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 6px 12px rgba(15,118,110,0.16)',
                      },
                      '&:active': {
                        transform: 'translateY(0px) scale(0.985)',
                      },
                    }} onClick={() => {
                      setShowExamples(showExamples === key ? undefined : key);
                    }}>
                      <Typography sx={{
                        fontFamily: 'Open Sans',
                        fontWeight: showExamples === key ? 700 : 500,
                        fontSize: '16px',
                        color: style.color,
                        transition: 'color 160ms ease',
                      }}>
                        {key}
                      </Typography>
                    </Button>
                  );
                })
              }
            </Box>
          </Box>

          {/* SearchBar 组件
        <SearchBar 
          onTargetTermChange={handleTargetTermChange}
          question={selectedQuestion}
        /> */}
          {/* <Link href={process.env.REACT_APP_PANKGRAPH_LINK + '/result?snpId=rs2402203&leadSnp=rs2402203&geneId=ENSG00000001626&relationship=fine_mapped_eQTL&tissueKey=pancreas&dataSource=splicing%3B+GTEx&geneSymbol=CFTR'}
              sx={{ textDecoration: 'underline', color: 'black', fontSize: '14px' }}
        >
          Example query: How does the SNP rs2402203 influence the splicing of CFTR (ENSG00000001626) in pancreas, as reported by GTEx?
        </Link> */}
        </Box>
      </Container>
    </Container>
  );
}

export default LandingPage;
