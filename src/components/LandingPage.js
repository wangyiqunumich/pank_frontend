import React, {useEffect, useState} from 'react';
import { Box, Typography, Container, Link, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import landingPageLogo from '../image/landing image cropped.png';
import SearchBar from '../SearchBar';
import TerminalIcon from '@mui/icons-material/Terminal';
import Question from './Question';

function LandingPage() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  
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
            width: '600px',
            // height: 550,
            // flex: 'auto',
            // position: 'relative',
            // marginTop: 'calc(10vh - 100)',
            // right: windowWidth * 0.5 + 100,
            '& img': {
              width: '600px',
              // height: 550,
              objectFit: 'contain'
            }
          }}>
            <img src={landingPageLogo} alt="PanKgraph" />
            <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: '6px', alignItems: 'center' }}>
              <TerminalIcon sx={{ width: '30px', color: '#C48E25' }}/>
              <Typography sx={{ fontSize: '20px'}}>
                Access PanKgraph with <Link
                  href={process.env.REACT_APP_PANKGRAPH_LINK + '/api'}
                  sx={{ textDecoration: 'underline', color: 'black', textAlign: 'right'}}>API</Link>
              </Typography>
            </Box>
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
              // target={'<gene>'}
              onTargetTermChange={handleTargetTermChange}
              question={selectedQuestion}
            />
            <Link href={process.env.REACT_APP_PANKGRAPH_LINK + '/result?snpId=rs2402203&leadSnp=rs2402203&geneId=ENSG00000001626&relationship=fine_mapped_eQTL&tissueKey=&dataSource=splicing%3B+GTEx&geneSymbol=CFTR'}
                  sx={{ textDecoration: 'underline', color: 'black', fontSize: '14px' }}
            >
              Example query: How does the SNP rs2402203 influence the quantitative trait locus (QTL) of CFTR (ENSG00000001626) in pancreatic tissue, as reported by splicing; GTEx?
            </Link>
          </Box>
    </Container>
  );
}

export default LandingPage;
