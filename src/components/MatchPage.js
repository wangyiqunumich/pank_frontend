import React, {useEffect, useState} from 'react';
import { Box, Typography, Container, Link, Select, MenuItem,Button, FormControl, InputLabel, Snackbar, Alert } from '@mui/material';
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
  const [visualPattern, setVisualPattern] = useState('');
  const dispatch = useDispatch();


  const navigate = useNavigate();
  const [openSnackbar, setOpenSnackbar] = useState(true);

  const isSearchBarDisabled = !selectedQuestion;
  const dropdownOptions = {};

  // Extract the question from the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const questionFromUrl = params.get('question'); // Get the 'question' parameter
    if (questionFromUrl) {
      setSelectedQuestion(decodeURIComponent(questionFromUrl)); // Decode the question and set it
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
  });

  // Handle dropdown value change
  const handleDropdownChange = (value, placeholder) => {
    setSelectedQuestion((prevQuestion) =>
      prevQuestion.replace(`{${placeholder}}`, `{${value}}`) // Replace the placeholder with the selected value
    );
  };

  // Handle submit button click
  const handleSubmit = () => {
    navigate(`/intermediate?question=${encodeURIComponent(selectedQuestion)}`); // Navigate to the intermediate page with the updated question
  };

  function renderSequence() {
    const sequence = selectedQuestion || ''; // Use the selected question or an empty string
    const parts = sequence.split(/(\{.*?\}|\(.*?\))/); // Split the string into parts based on {} or ()
  
    return parts.map((part, index) => {
      if (part.startsWith('(') && part.endsWith(')')) {
        // Render grey box for items enclosed in ()
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
        // Render dropdown for items enclosed in {}
        const options = ['Option 1', 'long option test', 'CFTR']; // Example dropdown options
        return (
          <Box key={index} sx={{ display: 'inline-flex', alignItems: 'center',marginLeft: '-8px' }} >
            <Select
              defaultValue=""
              displayEmpty
              onChange={(e) => handleDropdownChange(e.target.value, part.slice(1, -1))}
              sx={{
                backgroundColor: '#EFF5FF',
                border: '1px solid #71B9FA', // Remove the default border
                borderRadius: '8px',
                minWidth: '80px',
                mx: 1,
                '& .MuiSelect-select': {
                  padding: '2px 20px 2px 8px  !important',
                  alignItems: 'center',
                  display: 'flex',
                  justifyContent: 'center',
                  overflow: 'hidden !important',
                  textOverflow: 'ellipsis !important',
                },
                '.MuiOutlinedInput-notchedOutline': {
                  border:'none',
                  marginLeft: '0px !important',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  border: 'none',
                },
                '.MuiSvgIcon-root ': {
                  position: 'absolute',
                  right: '2px', 
                  color: '#A9D3FC',
                },
                
              }}
            >
              <MenuItem value="" disabled>
                {part.slice(1, -1)} {/* Use the text inside the curly braces as the placeholder */}
              </MenuItem>
              {options.map((option, idx) => (
                <MenuItem key={idx} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
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
  // Function to fetch the gene pattern
  const fetchGenePattern = async (question) => {
    // Extract the gene name from the question
    const geneNameMatch = question.match(/\{(.*?)\}/); // Match text inside {}
    if (!geneNameMatch) {
      console.error('Gene name not found in the question');
      setVisualPattern('Gene name not found');
      return;
    }
    const geneName = geneNameMatch[1]; // Extract the gene name

    try {
      // Make a request to the Amazon API Gateway to fetch the gene ID
      const response = await axios.post('https://vcr7lwcrnh.execute-api.us-east-1.amazonaws.com/development/inputToVocab', 
        { input: geneName }, 
        { headers: { 'Content-Type': 'application/json' } }
      );
      console.log(response.data); // Log the API response for debugging
      // Extract the gene ID from the API response
      const geneId = response.data; // Assuming the API returns { "gene_id": "some_id" }

      if (!geneId) {
        console.error('Gene ID not found for the given gene name');
        setVisualPattern('Gene ID not found');
        return;
      }

      // Construct the pattern
      const pattern = `(SNP) - eqtl of -> (@${geneId.split('@')[1]}@)`;
      setVisualPattern(pattern); // Update the state with the fetched pattern
    } catch (error) {
      console.error('Error fetching gene ID:', error.message);
      setVisualPattern('Failed to fetch gene ID');
    }
  };

  // Update the gene pattern whenever selectedQuestion changes
  useEffect(() => {
    if (selectedQuestion) {
      fetchGenePattern(selectedQuestion);
    }
  }, [selectedQuestion]);

  // useEffect(() => {
  //   if (selectedQuestion) {
  //     // Extract the gene name from the selected question
  //     const geneNameMatch = selectedQuestion.match(/\{(.*?)\}/); // Match text inside {}
  //     if (geneNameMatch) {
  //       const geneName = geneNameMatch[1]; // Extract the gene name
  
  //       // Dispatch the queryVocab action to fetch the gene ID
  //       dispatch(queryVocab(geneName))
  //         .unwrap()
  //         .then((response) => {
  //           if (response.gene_id) {
  //             // Construct the pattern using the fetched gene ID
  //             const pattern = `(SNP) - eqtl of -> (@${response.gene_id}@)`;
  //             setVisualPattern(pattern); // Update the state with the fetched pattern
  //           } else {
  //             setVisualPattern('Gene ID not found');
  //           }
  //         })
  //         .catch((error) => {
  //           console.error('Error fetching gene ID:', error.message);
  //           setVisualPattern('Failed to fetch gene ID');
  //         });
  //     } else {
  //       setVisualPattern('Gene name not found in the question');
  //     }
  //   }
  // }, [selectedQuestion, dispatch]);

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
          marginBottom: 2,
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
}

export default MatchPage;
