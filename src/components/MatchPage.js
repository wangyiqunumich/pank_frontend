import React, {useEffect, useState} from 'react';
import { Box, Typography, Container, Link, Autocomplete, TextField,MenuItem,Button, FormControl, InputLabel, Snackbar, Alert } from '@mui/material';
import landingPageLogo from '../image/landing image cropped.png';
import SearchBar from '../SearchBar';
import { useNavigate, useLocation } from 'react-router-dom';
import TerminalIcon from '@mui/icons-material/Terminal';
import Question from './Question';
import { useDispatch, useSelector } from 'react-redux';
import { queryVocab } from '../redux/inputToVocabSlice'; // Import the action
import Popper from '@mui/material/Popper';
import './styles.css';

function MatchPage() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [qid, setQid] = useState('');
  const dispatch = useDispatch();
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(true);
  const [geneId, setGeneId] = useState('');
  const [cellId, setCellId] = useState('');
  const [snpId, setSnpId] = useState('');
  const [geneOptions, setGeneOptions] = useState([]);
  const [cellOptions, setCellOptions] = useState([]);
  const [snpOptions, setSnpOptions] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const questionData = location.state;
  const [visualPattern, setVisualPattern] = useState(questionData.pattern_for_the_matched_page);

  const partofquestion = questionData.question.split(/(\s+|\{.*?\}|\(.*?\))/); // 根据{} 或（）将字符串分割成部分，其余按照空格分割成部分
  const dictionary = partofquestion.reduce((acc, part, index) => {
    if (part.startsWith('{') && part.endsWith('}')) {
      acc[index] = part.slice(1, -1).split('@')[0]; // Extract the type from the part
    }
    return acc;
  }, {});
  // console.log('dictionary', dictionary);

  // Extract this page's question and qid from URL
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
    if(selectedQuestion.startsWith('What is')){
      const url = `/result?sourceTerm=gene:${geneId.split('(')[1].slice(0, -1)}&targetTerm=cell_type:CL_0002064&relationship=express_in`
      navigate(url);
    }
    else{
    const consequenceMatch = selectedQuestion.match(/\{(.*?)\}|\(.*?\)/g);
    const sourceTerm = consequenceMatch[0] ? consequenceMatch[0].replace(/[{}()]/g, '') : '';
    const relationTerm = consequenceMatch[1] ? consequenceMatch[1].match(/\((.*?)\)/)[1] : '';
    const target = consequenceMatch[2] ? consequenceMatch[2].replace(/[{})]/g, '') : '';
    const [targetSymbol, targetTerm] = target.split('(');
    const url = `/intermediate?sourceTerm=${sourceTerm.toLowerCase()}&relationship=${relationTerm}&targetTerm=gene:${targetTerm}&targetSymbol=${targetSymbol}`;
    navigate(url);
    }
  };

  function updateSource(newInputValue,type,index) {
    const geneName = newInputValue;
    dispatch(queryVocab({input: geneName})).unwrap() 
    .then((response) => 
      { if (response && typeof response.result === 'string') {
        console.log('response', response);
        const parsedResponse = response.result.split('@');
        if (parsedResponse.length > 1) {
          if(type === 'gene'&& parsedResponse[0] === 'gene'){
            const geneId = `${geneName}(${parsedResponse[1]})`;
            setGeneOptions([geneId]);
          }
          else if(type === 'cell'&& parsedResponse[0] === 'cell_type'){
            const cellId = `${geneName}(${parsedResponse[1]})`;
            setCellOptions([cellId]);
          }
          else if(type === 'snp'&& parsedResponse[0] === 'snp'){
            const snpId = `${geneName}(${parsedResponse[1]})`;
            setSnpOptions([snpId]);
          }
        }
      }});
  };

  function renderSequence() {
    const sequence = selectedQuestion || ''; // 使用选定的问题或空字符串
    const parts = sequence.split(/(\s+|\{.*?\}|\(.*?\))/); // 根据{} 或（）将字符串分割成部分，其余按照空格分割成部分
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
        const type = dictionary[index];
        return (
          <Box key={index} sx={{ display: 'inline-flex', alignItems: 'center',marginLeft: '-8px' }} >
            <Autocomplete
              freeSolo
              options={type === 'gene' ? geneOptions : type === 'cell' ? cellOptions : snpOptions}
              className={dictionary[index]}
              onInputChange={(event, newInputValue) => {
                if(newInputValue) {
                  updateSource(newInputValue,type);
                  setIsSubmitDisabled(!options.includes(newInputValue));
                }else{
                  setOptions([]);
                  setIsSubmitDisabled(true);
                }
              }}
              onChange={(event, newValue) => {
                if (newValue) {
                  if(type === 'gene'){
                    setGeneId(newValue);
                  }
                  else if(type === 'cell'){
                    setCellId(newValue);
                  }else if(type === 'snp'){
                    setSnpId(newValue);
                  }
                  
                  if(selectedQuestion){
                  setSelectedQuestion((prevQuestion) => {
                    if (!prevQuestion) return '';
                    return prevQuestion.replace(`{${part.slice(1, -1)}}`, `{${newValue}}`);
                  });
                }
                setIsSubmitDisabled(!newValue);}
              }}
              PopperComponent={(props) => (
                <Popper {...props} style={{ width: 'fit-content !important' }} />
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={part.slice(1, -1).split('@')[1]}
                  onChange={(e) => {
                    setInputValue(e.target.value);  // 更新输入值
                    if (e.target.value) {
                      updateSource(e.target.value);
                    }
                  }}
                  sx={{
                    width: 'auto !important',
                    mx: 1,
                    '& .MuiAutocomplete-input':{
                      width: '60px !important',
                    },
                    '& .MuiOutlinedInput-root':{
                      width: '100%',
                      padding: '0!important',
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
                      padding: '2px 18px 2px 8px !important',
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
              marginRight: '4px',
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
        let connectedString = visualPattern;
        if (geneId) {
          connectedString = connectedString.replace(/\{gene@.*?@}/, `{gene@${geneId}@}`);
        }
        if (cellId) {
          connectedString = connectedString.replace(/\{ontology@.*?@}/, `{ontology@${cellId}@}`);
        }
        if (snpId) {
          connectedString = connectedString.replace(/\{snp@.*?@}/, `{snp@${snpId}@}`);
        }
        setVisualPattern(connectedString);
      
    }
  }, [selectedQuestion, geneId, cellId, snpId]);


  return (
    <Container maxWidth={false} disableGutters sx={{
      display: 'flex',
      flexDirection: {sm: 'column', md: 'row'}, justifyContent: 'center',
      flex: 1, alignItems: 'center',
      paddingTop: '40px',
      paddingLeft: {sm: 0, md: '10%'},
      paddingRight: {sm: 0, md: '10%'},
      paddingBottom: '40px',
      gap: {sm: 0, md: '40px'},
    }}>

      {/* 左侧图片 */}
      <Box sx={{ 
        width: {sm: '100%', md: '50%'},
        marginTop: {sm: '0px', md: '60px'},
        display: 'block',
        textAlign: 'left',
        '& img': {
          width: '80%',
          objectFit: 'contain',
        }
      }}>
        <img src={landingPageLogo} alt="PanKgraph" />
        <Box sx={{ width: '80%', display: 'flex', justifyContent: 'center', marginTop: '20px', alignItems: 'center' }}>
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
        width: {sm: '80%', md: '50%'},
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        backgroundColor: '#E4F0F1',
        borderRadius: '20px',
        padding:3,
      }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <Typography sx={{ 
          fontSize: 28,
          fontWeight: 700,
          textAlign: 'left', 
          fontFamily: 'Open Sans',
        }}>
          {questionData.matched_page_title}
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
          CANCEL
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
          fontFamily: 'Open Sans',
        }}>
        {questionData.matched_page_sub_title}
        </Typography>
        <Box sx={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          padding: 2,
          width: 'calc(100% - 32px)', 
          gap: 0,
        }}>
          {renderSequence()}
        </Box>
      </Box>
      <Box sx={{ 
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        flexDirection: 'column',
      }}>
      <Typography sx={{ 
          color: '#398289',
          fontSize: 17,
          fontWeight: 600,
          fontFamily: 'Open Sans',
          marginBottom: 2,
        }}>
        Graph visualization
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
        {visualPattern}
      </Box>
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
      disabled={isSubmitDisabled}
    >
      Submit
    </Button>
        

      </Box>
    </Container>
  );
};


export default MatchPage;
