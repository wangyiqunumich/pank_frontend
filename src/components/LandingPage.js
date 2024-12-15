import React from 'react';
import { Box, Typography, Container, Link } from '@mui/material';
import landingPageLogo from '../image/landingPageLogo.png';
import relatedResources from '../image/relatedResources.png';
import apiIcon from '../image/apiIcon.png';

function LandingPage() {
  return (
    <Container maxWidth={false}>
      {/* 主要内容区域 */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '40px 0'
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
            width: '50%',
            height: '400px',
            '& img': {
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }
          }}>
            <img src={landingPageLogo} alt="PanKgraph" />
          </Box>

          {/* 右侧标题和搜索框 */}
          <Box sx={{ 
            width: '50%',
            display: 'flex',
            flexDirection: 'column',
            gap: 3
          }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
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
            gap: 2
          }}>
            <img src={apiIcon} alt="API" style={{ width: '32px', height: '32px' }} />
            <Typography variant="h6">
              Access PanKgraph with <Link href="/api" sx={{ textDecoration: 'none' }}>API</Link>
            </Typography>
          </Box>

          {/* 关于项目部分 */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" sx={{ mb: 2 }}>About the Project</Typography>
            <Typography variant="body1" sx={{ maxWidth: '800px' }}>
              PanKGraph combines Knowledge Graphs and LLMs to create a powerful T1D knowledge portal, 
              integrating diverse data to uncover insights and accelerate research.
            </Typography>
            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
              Supported by National Institutes of Health (NIH) grants U24 DK138515, U24 DK138512, and 
              supplemental funds from the NIH Office of Data Science Strategies.
            </Typography>
          </Box>

          {/* NIH 标志 */}
          <Box sx={{ 
            display: 'flex',
            gap: 4,
            mt: 2
          }}>
            <img src={relatedResources} alt="NIH NIDDK" style={{ height: '60px' }} />
          </Box>
        </Box>
      </Box>
    </Container>
  );
}

export default LandingPage;
