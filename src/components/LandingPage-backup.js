import React, {
  useEffect,
  useState,
} from 'react';

import TerminalIcon from '@mui/icons-material/Terminal';
import {
  Box,
  Container,
  Link,
  Typography,
} from '@mui/material';

import landingPageLogo from '../image/landing image cropped.png';
import Question from './Question';

function LandingPage() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(true);

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

  return (
    <Container maxWidth={false} disableGutters sx={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      marginTop: '0px',
      marginBottom: '40px',
    }}>
      <Container maxWidth={false} disableGutters sx={{
        display: 'flex',
        flexDirection: { sm: 'column', md: 'row' }, justifyContent: 'center',
        alignItems: 'top',
        paddingTop: '0px',
        paddingLeft: { sm: 0, md: '6%' },
        paddingRight: { sm: 0, md: '6%' },
        paddingBottom: '0px',
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
          flex: 1,
          position: 'relative',
          display: 'block',
          '& img': {
            width: { sm: '100%', md: '100%' },
            maxHeight: '425px',
            objectFit: 'contain',
            objectPosition: 'left',
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
              left: "calc(min(50%, 330px) - 23px)",
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
          width: { sm: '90%', md: '50%' },
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          marginRight: 1,
          marginTop: { sm: '0px', md: '55px' },
          marginLeft: { sm: '5%', md: 0 },
          minHeight: { sm: 'unset', md: '500px' }
        }}>

          {/* 更新 Question 组件，传入 setSelectedQuestion */}
          <Question
            selectedQuestion={selectedQuestion}
            setSelectedQuestion={setSelectedQuestion}
          />

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
