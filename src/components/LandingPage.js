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
  Collapse,
  Container,
  Link,
  Paper,
  TextField,
  Typography,
} from '@mui/material';

import landingPageLogo from '../image/landing image cropped.png';
import ExampleQueries from '../schema/landing_sample_questions.json';

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
        backgroundColor: "#fffbea",
        px: 1.5,
        py: 0.5,
        cursor: "default",
        transition: "all 0.3s ease",
        "&:hover": { backgroundColor: "#fff6d8" },
        ...sx
      }}
    >
      <Collapse in={hover} orientation="horizontal" collapsedSize={0}>
        <Typography
          sx={{
            color: "#d4aa00",
            fontWeight: 500,
            fontSize: "0.85rem",
            whiteSpace: "nowrap",
          }}
        >
          This is the beta version — data coverage is currently limited.
        </Typography>
      </Collapse>
      <Collapse in={!hover} orientation="horizontal" collapsedSize={0}>
        <Typography
          sx={{
            color: "#d4aa00",
            fontWeight: 600,
            fontSize: "0.85rem",
            whiteSpace: "nowrap",
          }}
        >
          Beta
        </Typography>
      </Collapse>
    </Box>
  );
}

const ExampleClasses = {
  "eQTL analysis": {
    color: "#067A71",
    bgcolor: "#F1FDFA",
    bdcolor: "#95F6E4",
  },
  "Gene expression": {
    color: "#2654E9",
    bgcolor: "#EFF6FF",
    bdcolor: "#BFDBFF",

  },
  "SNP studies": {
    color: "#008236",
    bgcolor: "#EFFDF4",
    bdcolor: "#B9F8CF",
  },
  "T1D research": {
    color: "#007595",
    bgcolor: "#ECFEFF",
    bdcolor: "#A2F4FD",
  }
};

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
              paddingBottom: '24px',
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
                    placeholder="Ask a question about [GENE], [SNP], QTL, or T1D"
                    sx={{
                      height: '85px', // Increase the height of the input box
                      width: '100%',
                      '& .MuiInputBase-root': {
                        borderRadius: '12px',
                        height: '85px', // Adjust the height of the input field
                        alignItems: 'center', // Center the text vertically
                        padding: '14px 25px !important', // Adjust padding to accommodate the increased height
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
                          <SearchIcon sx={{ fontSize: '40px', color: '#98A1AE' }} />
                          {params.InputProps.startAdornment}
                        </>
                      ),
                      endAdornment: (
                        <Box display="flex" alignItems="center" sx={{
                          position: 'absolute',
                          right: '25px',
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
                          <Box
                            sx={{
                              height: "60px",
                              width: "150px",
                              borderRadius: "16px",
                              background: !query.trim() ? "#21919780" : "#219197",
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',

                              cursor: !query.trim() ? 'not-allowed' : 'pointer',
                            }}
                            onClick={!query.trim()
                              ? () => { setShowWarning("Please ensure all boxes are filled out before submitting") }
                              : () => {
                                setShowLoading(true);
                                handleSearch(query.trim());
                              }}
                          >
                            <Typography
                              className="search-button"

                              sx={{
                                color: 'white',
                                fontFamily: 'Open Sans',
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
                      height: '220px',
                      "& .MuiAutocomplete-option.Mui-focused": {
                        backgroundColor: '#E2EAEB !important',
                      },
                      "& .MuiAutocomplete-option": {
                        backgroundColor: '#F2FAFB !important',
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
                    key={option}
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
                      setShowWarning("Please ensure all boxes are filled out before submitting");
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
                          backgroundColor: '#E2EAEB !important',
                        },
                      },
                    }} onClick={(e) => { setQuery(example); setShowExamples(undefined); }}>
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
              {
                Object.keys(ExampleClasses).map((key) => (
                  <Button key={key} className="example-class" sx={{
                    display: 'flex',
                    alignItems: 'center',
                    margin: '8px',
                    cursor: 'pointer',
                    backgroundColor: ExampleClasses[key].bgcolor,
                    borderRadius: '20px',
                    padding: '8px 16px',
                    border: `1px solid ${ExampleClasses[key].bdcolor}`,
                    textTransform: 'none',
                  }} onClick={() => {
                    setShowExamples(showExamples === key ? undefined : key);
                  }}>
                    <Typography sx={{
                      fontFamily: 'Open Sans',
                      fontWeight: 400,
                      fontSize: '16px',
                      color: ExampleClasses[key].color,
                    }}>
                      {key}
                    </Typography>
                  </Button>
                ))
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
