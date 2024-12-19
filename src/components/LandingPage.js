import React, {useEffect, useState} from 'react';
import { Box, Typography, Container, Link } from '@mui/material';
import landingPageLogo from '../image/landingPageLogo.png';
import relatedResources from '../image/relatedResources.png';
import apiIcon from '../image/apiIcon.png';
import { Link as RouterLink } from 'react-router-dom';

function LandingPage() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth)
      console.log(window.innerWidth)
    }
    window.addEventListener('resize', handleResize);
    return (_) => {
      window.removeEventListener('resize', handleResize);
    };
  });
  return (
    <Container maxWidth={false} disableGutters sx={{ padding: 0}}>
      {/* 主要内容区域 */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4
      }}>
        {/* 上半部分 */}
        <Box sx={{ 
          display: 'flex',
          width: '100%',
          gap: 4,
          alignItems: 'center'
        }}>
          {/* 左侧图片 */}
          <Box sx={{ 
            width: 550,
            height: 384,
            position: 'absolute',
            top: 192,
            right: windowWidth * 0.5 + 100,
            '& img': {
              width: 550,
              height: 384,
              objectFit: 'contain'
            }
          }}>
            <img src={landingPageLogo} alt="PanKgraph" />
          </Box>

          {/* 右侧标题和搜索框 */}
          <Box sx={{ 
            width: 672,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            position: 'absolute',
            left: windowWidth * 0.5 + 44,
            top: 311
          }}>
            <Typography sx={{ fontSize: 32, textAlign: 'left' }}>
              Explore T1D knowledge and resources with the knowledge graph
            </Typography>
            
            {/* 搜索框部分可以根据需要添加 */}
          </Box>
        </Box>

        {/* 下半部分 */}
        <Box sx={{ 
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          mt: 4
        }}>
          {/* API 访问部分 */}
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            position: 'absolute',
            top: 540,
            right: windowWidth * 0.5 + 200
          }}>
            <img src={apiIcon} alt="API" style={{ width: '32px', height: '32px' }} />
            <Typography sx={{ fontSize: 24}}>
              Access PanKgraph with <Link component={RouterLink} to="/api" sx={{ textDecoration: 'none' }}>API</Link>
            </Typography>
          </Box>

          {/* 关于项目部分 */}
          <Box sx={{ position: 'absolute', bottom: 70, width: 633, right: windowWidth * 0.5 + 44 }}>
            <Typography sx={{ fontSize: 32, textAlign: 'left' }}>About the Project</Typography>
            <Typography sx={{ maxWidth: '800px', fontSize: 16, textAlign: 'left' }}>
              PanKGraph combines Knowledge Graphs and LLMs to create a powerful T1D knowledge portal, 
              integrating diverse data to uncover insights and accelerate research.
            </Typography>
            <Typography sx={{ fontSize: 16, textAlign: 'left' }}>
              Supported by National Institutes of Health (NIH) grants U24 DK138515, U24 DK138512, and 
              supplemental funds from the NIH Office of Data Science Strategies.
            </Typography>
          </Box>

          {/* NIH 标志 */}
          <Box sx={{ 
            display: 'flex',
            gap: 4,
            mt: 2,
            position: 'absolute',
            left: windowWidth * 0.5 + 44,
            bottom: 70
          }}>
            <img src={relatedResources} alt="NIH NIDDK" style={{ height: '100px' }} />
          </Box>
        </Box>
      </Box>
    </Container>
  );
}

export default LandingPage;
