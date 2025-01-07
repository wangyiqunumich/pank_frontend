import React, {useEffect, useState} from 'react';
import { Box, Typography, Container, Link, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import landingPageLogo from '../image/LandingPageVisu.png';
import relatedResources from '../image/relatedResources.png';
import apiIcon from '../image/apiIcon.png';
import { Link as RouterLink } from 'react-router-dom';
import SearchBar from '../SearchBar';
import NavBar from "../NavBar";
import PkbFooter from "../Footer/footer";
import Question from './Question';

function LandingPage() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [selectedQuestion, setSelectedQuestion] = useState(
    'Which SNP serves as the quantitative trait locus (eQTL) for PTPN22?'
  );
  
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
      setSelectedQuestion(`Which SNP serves as the quantitative trait locus (eQTL) for ${newTargetTerm.toUpperCase()}?`);
    }
  };

  return (
    <Container maxWidth={false} disableGutters sx={{
      padding: 0, display: 'flex',
      flexDirection: 'row', justifyContent: 'space-evenly',
      flex: 1, alignItems: 'center'
    }}>
          {/* 左侧图片 */}
          <Box sx={{ 
            width: '36vw',
            // height: 550,
            // flex: 'auto',
            // position: 'relative',
            // marginTop: 'calc(10vh - 100)',
            // right: windowWidth * 0.5 + 100,
            '& img': {
              width: '36vw',
              // height: 550,
              objectFit: 'contain'
            }
          }}>
            <img src={landingPageLogo} alt="PanKgraph" />
          </Box>

          {/* 右侧内容区域 */}
          <Box sx={{ 
            width: 672,
            // flex: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            // position: 'relative',
            // left: windowWidth * 0.5 + 44,
            // marginTop: `calc(10vh + 75px)`
          }}>

            <Typography sx={{ fontSize: 22, textAlign: 'left', zIndex: -1 }}>
              Explore T1D knowledge and resources with the knowledge graph
            </Typography>
            
            {/* 更新 Question 组件，传入 setSelectedQuestion */}
            <Question 
              selectedQuestion={selectedQuestion} 
              setSelectedQuestion={setSelectedQuestion}
            />
            
            {/* SearchBar 组件 */}
            <SearchBar 
              target={'PTPN22'}
              onTargetTermChange={handleTargetTermChange}
            />
          </Box>
    </Container>
  );
}

export default LandingPage;
