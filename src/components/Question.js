import React, {
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';

import landingPageSchema from '../schema/landing_page_schema.json';

function Question({}) {
  const [questions, setQuestions] = useState([]);
  useEffect(() => {
    setQuestions(landingPageSchema); // Load questions into state
  }, []);
  const navigate = useNavigate();
  const handleQuestionClick = (index) => {
    // Navigate to the next page and pass the question data
    navigate(`/match?qid=${index}`);
  };

  const colorMap = ['#E7DD6F', '#B3DDAD', '#B3DDAD', '#B3DDAD', '#4ABBE3', '#296798'];

  // const [searchQuery, setSearchQuery] = useState('');

  // const handleSearch = (e) => {
  //   const query = e.target.value.toLowerCase();
  //   setSearchQuery(query);

  //   const matchingQuestions = questions.filter((q) =>
  //     q.toLowerCase().includes(query)
  //   );
  //   const nonMatchingQuestions = questions.filter(
  //     (q) => !q.toLowerCase().includes(query)
  //   );

  //   setQuestions([...matchingQuestions, ...nonMatchingQuestions]);
  // };

  // 当 selectedQuestion 改变时，确保它在 questions 数组中
  // useEffect(() => {
  //   if (selectedQuestion && !questions.includes(selectedQuestion)) {
  //     setQuestions(prevQuestions => {
  //       // 移除第一个问题并在数组开头添加新的问题
  //       const newQuestions = prevQuestions.slice(1);
  //       return [selectedQuestion, ...newQuestions];
  //     });
  //   }
  // }, [selectedQuestion]);

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      overflowY: 'auto',
    }}>
      <Typography sx={{
        fontSize: 28,
        fontWeight: 700,
        textAlign: 'left',
        color: '#146B6F',
        fontFamily: 'Open Sans',
      }}>
        You can ask:
      </Typography>
      <Typography
        sx={{
          fontSize: 14,
          fontWeight: 400,
          textAlign: 'left',
          color: '#5A5555',
          fontFamily: 'Open Sans',
        }}>Click on a question to explore related data, knowledge, and insights
      </Typography>

      {/* <TextField
        fullWidth
        variant="outlined"
        placeholder="Search Questions by Keyword..."
        value={searchQuery}
        onChange={handleSearch}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{width:'26px',color:'#B9B9B9'}}/>
            </InputAdornment>
          ),
        }}
        sx={{
          marginBottom: 2,
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
          },
        }}
      /> */}

      <List
        sx={{
          marginTop: '16px',
          marginBottom: '10px',
          width: '100%',
          overflowY: 'auto',
        }}
      >
        {questions.map((question, index) => {
          // const isRelated = question.toLowerCase().includes(searchQuery.toLowerCase());
          const isRelated = true;
          // const [qid, questionContent] = question.split('@');
          return (
            <ListItem
              key={index}
              sx={{
                padding: 0,
                opacity: isRelated ? 1 : 0.5, // Dim unrelated questions
                pointerEvents: isRelated ? 'auto' : 'none', // Disable unrelated questions
              }}
            >
              <Box className='question-box-container' fullWidth sx={{
                display: 'flex',
                alignItems: 'top',
                width: '100%',
              }}>
                <Box className='question-box'
                  fullWidth
                  onClick={() => handleQuestionClick(index)}
                  sx={{
                    display: 'flex',
                    alignItems: 'top',
                    width: '100%',
                    textDecoration: 'none',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    padding: '16px',
                    paddingLeft: '0px',
                    marginBottom: '8px',
                    backgroundColor: isRelated ? '#FBFFFF' : '#e0e0e0',
                    color: '#333',
                    transition: 'height 0.2s ease-in-out',
                    '.question-box-container:hover &': {
                      border: '1px solid #219197',
                      backgroundColor: '#E4F0F1',
                    },
                  }}
                >
                  <Box className="dot"
                    sx={{
                      width: '11px',
                      height: '11px',
                      borderRadius: '50%',
                      backgroundColor: colorMap[index % colorMap.length],
                      marginLeft: '20px',
                      marginRight: '20px',
                      transition: 'background-color 0.1s',
                      marginTop: '7px',
                    }}
                  />
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    flex: 1,
                  }}>
                    <ListItemText
                      primary={
                        <Box sx={{ fontFamily: 'Open Sans' }}>
                          {question.question.split(/(\([^)]*\)|\{.*?\})/).map((part, i) => {
                            if (part.startsWith('(') && part.endsWith(')')) {
                              return <span key={i} style={{ fontWeight: '600', fontStyle: 'italic', textTransform: 'uppercase' }}>{part.slice(1, -1)}</span>;
                            } else if (part.startsWith('{') && part.endsWith('}')) {
                              return <span key={i} style={{ fontWeight: '600', textTransform: 'uppercase' }}>[{part.slice(1, -1).split('@')[0]}]</span>;
                            }
                            return <span key={i}>{part}</span>;
                          })}
                        </Box>
                      }
                      sx={{
                        fontSize: 16,
                        textAlign: 'left',
                        margin: 0,
                        fontFamily: 'Open Sans',
                      }}
                    />
                    <Typography
                      sx={{
                        display: 'none',
                        transition: 'display 0.1s ease-in-out',
                        fontSize: 14,
                        color: '#219197',
                        marginTop: 0,
                        '.question-box-container:hover &': {
                          display: 'block',
                        },
                        fontFamily: 'Open Sans',
                      }}
                    >
                      {question.landing_page_subtitle}
                    </Typography>
                  </Box>
                  {isRelated && (
                    <ArrowOutwardIcon
                      sx={{
                        fontSize: 20,
                        color: '#7F7D7D',
                        opacity: 0,
                        marginRight: 2,
                        display: 'none',
                        '.question-box-container:hover &': {
                          display: 'inline-block',
                        },
                      }}
                    />
                  )}
                </Box>
              </Box>
            </ListItem>
          );
        })}
      </List>
      <Typography
        style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{
          backgroundColor: '#2aa198', color: 'white',
          fontWeight: '700',
          padding: '0px 5px',
          borderRadius: '4px',
          marginRight: '6px',
          fontSize: '14px',
        }}>Example</span>
        <Link
          to="/result?sourceTerm=snp%40rs2402203&targetTerm=gene%40ENSG00000001626&relationship=QTL"
          style={{
            fontSize: '14px',
            textDecoration: 'underline',
            color: '#333',
          }}>
          Which SNP serves as the expression quantitative trait locus (eQTL) for CFTR?
        </Link>
      </Typography>
    </Box>
  );
}

export default Question;
