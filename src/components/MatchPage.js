import React, {useEffect, useState} from 'react';
import { Box, Typography, Container, Link, Autocomplete, TextField,MenuItem,Button, FormControl, InputLabel, Snackbar, Alert } from '@mui/material';
import landingPageLogo from '../image/landing image cropped.png';
import SearchBar from '../SearchBar';
import { useNavigate } from 'react-router-dom';
import TerminalIcon from '@mui/icons-material/Terminal';
import Question from './Question';
import { useDispatch, useSelector } from 'react-redux';
import { queryVocab } from '../redux/inputToVocabSlice'; // Import the action
import axios from 'axios';

function MatchPage() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [qid, setQid] = useState('');
  const [visualPattern, setVisualPattern] = useState('');
  const dispatch = useDispatch();
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const navigate = useNavigate();

  // 从URL中提取问题和qid
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const questionFromUrl = params.get('question'); // 获取'question'参数
    const qidFromUrl = params.get('qid'); // 获取'qid'参数
    if (questionFromUrl) {
      setSelectedQuestion(decodeURIComponent(questionFromUrl)); // 解码问题并设置它
      setQid(qidFromUrl);
    }
  }, []);

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize);
    return (_) => {
      window.removeEventListener('resize', handleResize);
    };
  },[]);


  // Handle submit button click
  const handleSubmit = () => {
    const consequenceMatch = selectedQuestion.match(/\{(.*?)\}|\(.*?\)/g);
    const sourceTerm = consequenceMatch[0] ? consequenceMatch[0].replace(/[{}()]/g, '') : '';
    const relationTerm = consequenceMatch[1] ? consequenceMatch[1].replace(/[{}()]/g, '') : '';
    const targetTerm = consequenceMatch[2] ? consequenceMatch[2].replace(/[{}()]/g, '') : '';
  
    const url = `/intermediate?qid=${qid}&sourceTerm=sequence_variant&relationship=fine_mapped_QTL&targetTerm=gene:${targetTerm}&question=${selectedQuestion}`;
    navigate(url);
  };

  function updateSource(newInputValue) {
    const geneName = newInputValue;
    dispatch(queryVocab({input: geneName})).unwrap() 
    .then((response) => 
      { if (response) {
        console.log('response in updateSource', response);
        console.log('geneName', geneName);
        const geneId = response.replace('gene', geneName);
        setOptions([geneId]);
      }});
  };

  function renderSequence() {
    const sequence = selectedQuestion || ''; // 使用选定的问题或空字符串
    const parts = sequence.split(/(\{.*?\}|\(.*?\))/); // 根据{}或()将字符串分割成部分
  
    return parts.map((part, index) => {
      if (part.startsWith('(') && part.endsWith(')')) {
        return (
          <Box
            key={index}
            sx={{
              backgroundColor: '#F2F6FC',
              border: '1px dotted #95A6A6',
              padding: '2px 8px',
              borderRadius: '8px',
              marginRight: '8px',
              display: 'inline-block',
            }}
          >
            {part.slice(1, -1)} {/* Remove the enclosing parentheses */}
          </Box>
        );
      } else if (part.startsWith('{') && part.endsWith('}')) {
        return (
          <Box key={index} sx={{ display: 'inline-flex', alignItems: 'center',marginLeft: '-8px' }} >
            <Autocomplete
              freeSolo
              initialValue={part.slice(1, -1)}
              options={options}
              onInputChange={(event, newInputValue) => {
                if(newInputValue) {
                  updateSource(newInputValue);
                }else{
                  setOptions([]);
                }
              }}
              onChange={(event, newValue) => {
                if (newValue && selectedQuestion) {
                  setSelectedQuestion((prevQuestion) => {
                    if (!prevQuestion) return '';
                    return prevQuestion.replace(`{${part.slice(1, -1)}}`, `{${newValue}}`);
                  });
                }
              }}
              value={inputValue}
              renderInput={(params) => (
                <TextField
                  {...params}
                  onChange={(e) => {
                    setInputValue(e.target.value);  // 更新输入值
                    if (e.target.value) {
                      updateSource(e.target.value);
                    }
                  }}
                  sx={{
                    backgroundColor: '#EFF5FF',
                    border: '1px solid #71B9FA',
                    borderRadius: '8px',
                    minWidth: '80px',
                    mx: 1,
                    '& .MuiAutocomplete-root': {
                      width: 'auto !important',
                    },
                    '& .MuiOutlinedInput-root':{
                      padding: '2px 8px !important',
                      width: 'auto !important',
                      '& fieldset': {
                        border: 'none',
                      },
                      '&:hover fieldset': {
                        border: 'none',
                      },
                      '&.Mui-focused fieldset': {
                        border: 'none',
                      },
                    },
                    '& .MuiInputBase-input': {
                      padding: '2px 8px !important',
                      width: 'auto !important',
                    },
                  }}
                />
              )}
            />
          </Box>
        );
      } else {
        // Render plain text for other parts
        return (
          <Typography
            key={index}
            sx={{
              marginRight: '8px',
              display: 'inline-block',
            }}
          >
            {part}
          </Typography>
        );
      }
    });
  };

  useEffect(() => {
    if (selectedQuestion) {
      const extractedParts = selectedQuestion.match(/\(\s*.*?\s*\)|\{\s*.*?\s*\}/g);
      const connectedString = extractedParts.join('-');
      setVisualPattern(connectedString);
      console.log('visual pattern', connectedString);
    }
  }, [selectedQuestion]);


  return (
    <Container maxWidth={false} disableGutters sx={{
      padding: 0, display: 'flex',
      flexDirection: 'row', justifyContent: 'space-evenly',
      flex: 1, alignItems: 'center'
    }}>

      {/* 左侧图片 */}
      <Box sx={{ 
        width: '50%',
        padding: '2 auto',
        display: 'block',
        '& img': {
          width: '100%',
          objectFit: 'contain'
        }
      }}>
        <img src={landingPageLogo} alt="PanKgraph" />
        <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: '20px', alignItems: 'center' }}>
          <TerminalIcon sx={{ width: '30px', color: '#C48E25' }}/>
          <Typography sx={{ marginLeft: '10px', fontSize: '20px'}}>
            Access PanKgraph with <Link
              href={process.env.REACT_APP_PANKGRAPH_LINK + '/api'}
              sx={{ textDecoration: 'underline', color: 'black', textAlign: 'right'}}>API</Link>
          </Typography>
        </Box>
      </Box>

      {/* 右侧内容区域 */}
      <Box sx={{ 
        width: '50%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        margin: 2,
        backgroundColor: '#E4F0F1',
        borderRadius: '20px',
        padding:3,
      }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <Typography sx={{ 
          fontSize: 28,
          fontWeight: 700,
          textAlign: 'left', 
        }}>
          Search for QTL
        </Typography>
        <Link
          href="/"
          sx={{
            textDecoration: 'underline',
            color: '#398289',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            marginRight: 2,
          }}
        >
          CANCEL/RETURN
        </Link>
      </Box>
      <Box sx={{ 
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        flexDirection: 'column',
      }}>
        <Typography sx={{ 
          marginBottom: 2,
          color: '#398289',
          fontSize: 17,
          fontWeight: 600,
        }}>
        Pick a specific gene
        </Typography>
        <Box sx={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          padding: 2,
          width: 'calc(100% - 32px)', 
        }}>
          {renderSequence()}
        </Box>
      </Box>
      
      <Typography sx={{ 
          color: '#398289',
          fontSize: 17,
          fontWeight: 600,
        }}>
        Graph Visualization
      </Typography>
      <Box sx={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        alignItems: 'center',
        display: 'flex',
        flexWrap: 'wrap',
        padding: 2,
      }}>
        {visualPattern}
      </Box>
        
      <Button
      variant="contained" // Use a contained button for emphasis
      color="primary" // Use the primary color
      sx={{
        backgroundColor: '#219197', // Custom background color
        color: '#FFFFFF', // Text color
        textTransform: 'none', // Prevent uppercase text
        fontSize: '16px', // Adjust font size
        fontWeight: 600, // Bold text
        borderRadius: '8px', // Rounded corners
        padding: '8px 16px', // Add padding
        '&:hover': {
          backgroundColor: '#1A7A75', // Darker shade on hover
        },
      }}
      onClick={handleSubmit}
    >
      Submit
    </Button>
        

      </Box>
    </Container>
  );
};


export default MatchPage;
