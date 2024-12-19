import React from 'react';
import { AppBar, Toolbar, Box, Typography, Container } from '@mui/material';
import { Link } from 'react-router-dom';

function NavBar() {
  return (
    <>
      {/* 主导航栏 */}
      <AppBar position="static" sx={{ 
        backgroundColor: '#2E5F7F',
        boxShadow: 'none'
      }}>
        <Container maxWidth={false}>
          <Toolbar disableGutters>
            {/* Logo */}
            <Box sx={{ width: '200px' }}>
              <Typography
                variant="h6"
                component={Link}
                to="/"
                sx={{
                  fontFamily: 'Open Sans',
                  fontWeight: 400,
                  color: 'white',
                  fontStyle: 'italic',
                  textDecoration: 'none',
                  fontSize: '24px',
                }}
              >
                PanKbase.org
              </Typography>
            </Box>
            
            {/* 主菜单项 */}
            <Box sx={{ 
              display: 'flex', 
              gap: 2,
              marginLeft: 'auto',
              width: 'calc(100% - 200px)',
              justifyContent: 'flex-end',
              paddingRight: '48px'
            }}>
              {['Resources', 'Data', 'Analysis', 'Knowledge', 'About', 'Help', 'News'].map((item) => (
                <Typography
                  key={item}
                  component={Link}
                  to={`/${item.toLowerCase()}`}
                  sx={{
                    color: item === 'Knowledge' ? '#000' : 'white',
                    textDecoration: 'none',
                    padding: '20px 15px',
                    backgroundColor: item === 'Knowledge' ? '#f5f5f5' : 'transparent',
                    fontFamily: 'Open Sans',
                    fontWeight: item === 'Knowledge' ? 700 : 400,
                    fontSize: '24px',
                    lineHeight: '32.68px',
                    borderTopLeftRadius: item === 'Knowledge' ? '16px' : '0',
                    borderTopRightRadius: item === 'Knowledge' ? '16px' : '0',
                  }}
                >
                  {item}
                </Typography>
              ))}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* 子导航栏 */}
      <Box sx={{ 
        backgroundColor: '#f5f5f5',
        borderBottom: '2px solid #1F8E91'
      }}>
        <Container maxWidth={false}>
          <Box sx={{ 
            display: 'flex',
            padding: '8px 0',
          }}>
            {/* 左侧空白，与上面的 Logo 宽度相同 */}
            <Box sx={{ width: '200px' }} />
            
            {/* 右侧导航项 */}
            <Box sx={{ 
              display: 'flex',
              gap: 3,
              width: 'calc(100% - 200px)',
              justifyContent: 'flex-end',
              paddingRight: '48px'
            }}>
              {['Search', 'Use cases', 'Ontology', 'Open KG', 'API', 'Doc', 'About'].map((item) => (
                <Typography
                  key={item}
                  component={Link}
                  to={item === 'Search' ? '/' : `/${item.toLowerCase().replace(' ', '-')}`}
                  sx={{
                    color: '#000',
                    textDecoration: 'none',
                    fontFamily: 'Open Sans',
                    fontWeight: 400,
                    fontSize: '20px',
                    '&:hover': {
                      color: '#4A7298'
                    }
                  }}
                >
                  {item}
                </Typography>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>
    </>
  );
}

export default NavBar;
