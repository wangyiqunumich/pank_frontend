import React, {useEffect, useState} from 'react';
import { Box, Typography, Container, Link, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import landingPageLogo from '../image/landingPageLogo.png';
import relatedResources from '../image/relatedResources.png';
import apiIcon from '../image/apiIcon.png';
import { Link as RouterLink } from 'react-router-dom';
import SearchBar from '../SearchBar';
import NavBar from "../NavBar";
import PkbFooter from "../Footer/footer";

function LandingPage() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [selectedQuestion, setSelectedQuestion] = useState('Which SNP serves as the expression quantitative trait locus (eQTL) for PTPN22?');
  
  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize);
    return (_) => {
      window.removeEventListener('resize', handleResize);
    };
  });
  return (
    <Container minHeight={'100%'} maxWidth={false} disableGutters sx={{
      padding: 0, display: 'flex',
      flexDirection: 'row', justifyContent: 'space-evenly',
    }}>
          {/* 左侧图片 */}
          <Box sx={{ 
            width: 550,
            height: 384,
            // flex: 'auto',
            // position: 'relative',
            marginTop: '10vh',
            // right: windowWidth * 0.5 + 100,
            '& img': {
              width: 550,
              height: 384,
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
            marginTop: `calc(10vh + 75px)`
          }}>

            <Typography sx={{ fontSize: 22, textAlign: 'left', zIndex: -1 }}>
              Explore T1D knowledge and resources with the knowledge graph
            </Typography>
            {/* SearchBar 组件将在这里 */}
            <SearchBar />
          </Box>
    </Container>
  );
}

export default LandingPage;
