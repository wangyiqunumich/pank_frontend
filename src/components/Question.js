import React, { useEffect, useState } from 'react';
import { Box, Typography, Select, MenuItem } from '@mui/material';

function Question({ selectedQuestion, setSelectedQuestion }) {
  const [questions, setQuestions] = useState([
    'Which SNP serves as the quantitative trait locus (QTL) for <gene>?'
  ]);

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
      width: '536px'
    }}>
      <Typography sx={{ 
        fontSize: 20,
        textAlign: 'left', 
        marginBottom: 1 
      }}>
        Question
      </Typography>
      <Select
        value={selectedQuestion}
        onChange={(e) => setSelectedQuestion(e.target.value)}
        fullWidth
        sx={{
          backgroundColor: '#E4F0F1',
          '& .MuiSelect-select': {
            padding: '16px',
            fontSize: 16,
            textAlign: 'left'
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'transparent'
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'transparent'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'transparent'
          },
          minHeight: '48px'
        }}
      >
        {questions.map((question, index) => (
          <MenuItem key={index} value={question}>
            {question}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}

export default Question;