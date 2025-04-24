import React, { useEffect, useState } from 'react';
import { Box, Typography, Select, MenuItem,List,ListItem,ListItemText,TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';

function Question({ selectedQuestion, setSelectedQuestion }) {
  const [questions, setQuestions] = useState([
    'Which (SNP) serves as the quantitative trait locus (QTL) for {CFTR}?',
    'Is {Gene} has GWAS signal associated with (T1D)?',
    'Find the GWAS-QTL co-localization contribute to T1D?',
    'How is {CFTR}’s expression in {β cells} and it’s link to T1D?',
    'What’s {CFTR}’s function in (T1D)?',
  ]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
  
    const matchingQuestions = questions.filter((q) =>
      q.toLowerCase().includes(query)
    );
    const nonMatchingQuestions = questions.filter(
      (q) => !q.toLowerCase().includes(query)
    );
  
    setQuestions([...matchingQuestions, ...nonMatchingQuestions]);
  };

  // const handleSearch = (e) => {
  //   if (e.key === 'Enter') {
  //     const query = searchQuery.toLowerCase();
  //     const matchingQuestions = questions.filter((q) =>
  //       q.toLowerCase().includes(query)
  //     );
  //     const nonMatchingQuestions = questions.filter(
  //       (q) => !q.toLowerCase().includes(query)
  //     );
  //     setQuestions([...matchingQuestions, ...nonMatchingQuestions]);
  //   }
  // };
  // 当 selectedQuestion 改变时，确保它在 questions 数组中
  useEffect(() => {
    if (selectedQuestion && !questions.includes(selectedQuestion)) {
      setQuestions(prevQuestions => {
        // 移除第一个问题并在数组开头添加新的问题
        const newQuestions = prevQuestions.slice(1);
        return [selectedQuestion, ...newQuestions];
      });
    }
  }, [selectedQuestion]);

  return (
    <Box sx={{ 
      width: '685px'
    }}>
      <Typography sx={{ 
        fontSize: 28,
        fontWeight: 700,
        textAlign: 'left', 
        marginBottom: 1, 
        color:'#4E4E4E',
      }}>
        Question List
      </Typography>
      <Typography
        sx={{
          fontSize: 14,
          fontWeight: 400,
          textAlign: 'left',
          marginBottom: 2,
          color:'#5A5555',
        }}>Click on a question to explore related data and insights
        </Typography>

        <TextField
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
      />

      <List
        sx={{
          width: '100%',
          maxHeight: '300px', // Limit the height of the list
          overflowY: 'auto', // Enable vertical scrolling if content exceeds maxHeight
        }}
      >
        {questions.map((question, index) => {
          const isRelated = question.toLowerCase().includes(searchQuery.toLowerCase());
          return (
            <ListItem
              key={index}
              sx={{
                padding: 0,
                marginBottom:1,
                opacity: isRelated ? 1 : 0.5, // Dim unrelated questions
                pointerEvents: isRelated ? 'auto' : 'none', // Disable unrelated questions
              }}
            >
              <Box className='question-box'
                fullWidth
                component="a"
                href={
                  isRelated
                  ? `/match?question=${encodeURIComponent(question)}` // Encode the question as a query parameter
                  : undefined
                } 
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  height:'52px',
                  textDecoration: 'none',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  backgroundColor: isRelated ? '#FBFFFF' : '#e0e0e0', // Different background for unrelated questions
                  color: '#333',
                  color: '#333',
                  '&:hover': {
                    border: '1px solid #219197', // Change border color on hover
                    backgroundColor: '#E4F0F1', // Change background color on hover
                  },
                  
                }}
              >
                  {/* Solid dot */}
                <Box classname="dot"
                  sx={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: isRelated? '#49B9E4':'#B8CBC9',
                    marginLeft: 2,
                    marginRight: 2, // Space between the dot and the text
                    transition: 'background-color 0.1s', // Smooth transition for hover effect
                    '.question-box:hover &': {
                    backgroundColor: '#43978F', // Change dot color on hover
                  },
                  }}
                />
                <ListItemText
                  primary={question}
                  sx={{
                    fontSize: 16,
                    textAlign: 'left',
                  }}
                />
                {/* Arrow */}
                {isRelated && (
                  <ArrowOutwardIcon
                    sx={{
                      fontSize: 20,
                      color: '#7F7D7D',
                      opacity:0,
                      marginRight: 2, // Space between the arrow and the edge
                      '.question-box:hover &': {
                        opacity: 1, // Show the arrow when the parent Box is hovered
                      },
                    }}
                  />
                )}
              </Box>
            </ListItem>
          );
        })}
      </List>

    </Box>
  );
}

export default Question;