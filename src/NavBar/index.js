import React from 'react';
import { AppBar, Toolbar, Box, Typography, Container } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setSearchTerms } from '../redux/searchSlice';
import './scoped-shared.scss';
function NavBar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handlePanKgraphClick = () => {
    // 预设搜索条件
    dispatch(setSearchTerms({
      sourceTerm: 'sequence_variant:',
      relationship: 'QTL_of',
      targetTerm: ''
    }));
    navigate('/pankgraph');
  };

  return (
    <>
      {/* 主导航栏 */}
      {/*<AppBar position="static" sx={{ */}
      {/*  backgroundColor: '#2E5F7F',*/}
      {/*  boxShadow: 'none'*/}
      {/*}}>*/}
        {/*<Container maxWidth={false}>*/}
          {/*<Toolbar disableGutters>*/}
          {/*  /!* Logo *!/*/}
          {/*  <Box sx={{ width: '200px' }}>*/}
          {/*    <Typography*/}
          {/*      variant="h6"*/}
          {/*      component={Link}*/}
          {/*      to="/"*/}
          {/*      sx={{*/}
          {/*        fontFamily: 'Open Sans',*/}
          {/*        fontWeight: 400,*/}
          {/*        color: 'white',*/}
          {/*        fontStyle: 'italic',*/}
          {/*        textDecoration: 'none',*/}
          {/*        fontSize: '24px',*/}
          {/*      }}*/}
          {/*    >*/}
          {/*      PanKbase.org*/}
          {/*    </Typography>*/}
          {/*  </Box>*/}
            
            {/* 主菜单项 */}
            {/*<Box sx={{ */}
            {/*  display: 'flex', */}
            {/*  gap: 2,*/}
            {/*  marginLeft: 'auto',*/}
            {/*  width: 'calc(100% - 200px)',*/}
            {/*  justifyContent: 'flex-end',*/}
            {/*  paddingRight: '48px'*/}
            {/*}}>*/}
              <div className="pkb-nav">
                <div className="logo">
                  <a href="https://pankbase.org:8000/">
                    <img style={{height: '50px'}}
                         src="https://hugeampkpncms.org/sites/default/files/users/user32/pankbase/PanKbase_logo-black-tagline.svg"/>
                  </a>
                </div>
                <div className="menu-wrapper">
                  <div className="topmenu">
                    <a className="topmenu-item" href="#" style={{ color: '#d9d9d9' }}>
                      Search
                      <img
                          style={{ height: '15px', width: '15px', color: '#d9d9d9' }}
                          src="https://hugeampkpncms.org/sites/default/files/users/user32/pankbase/search-icon.svg"
                          alt="Search Icon"
                      />
                    </a>
                    <a className="topmenu-item" href="#" style={{ color: '#d9d9d9' }}>
                      Analysis
                    </a>
                    <a className="topmenu-item" href="#" style={{ color: '#d9d9d9' }}>
                      Login
                      <img
                          style={{ height: '15px', width: '15px', color: '#d9d9d9' }}
                          src="https://hugeampkpncms.org/sites/default/files/users/user32/pankbase/user-icon.svg"
                          alt="User Icon"
                      />
                    </a>
                  </div>
                  <div className="menu">
                    <div className="main-menu-items">
                      <div className="menu-item-wrapper">
                        <a className="menu-item menu-item-main" href="https://dev.pankgraph.org/">PanKgraph</a>
                      </div>
                      <div className="menu-item-wrapper">
                        <a className="menu-item menu-item-main" href="https://data.pankbase.org/">Data Library</a>
                      </div>
                      <div className="menu-item-wrapper">
                        <a className="menu-item menu-item-main" href="https://pankbase.org:8000/single-cell.html">Integrated Cell Browser</a>
                      </div>
                    </div>
                    <div className="menu-item-wrapper">
                      <a className="menu-item" href="/">Data</a>
                      <div className="submenu">
                        <a className="submenu-item" href="https://pankbase.org:8000/data-browser.html">Data Browser</a>
                        <a className="submenu-item" href="https://pankbase.org:8000/single-cell.html">Integrated Cell Browser</a>
                        <a className="submenu-item" href="http://tools.cmdga.org:3838/metadata_analysis/">Donor Metadata</a>
                        <a className="submenu-item" href="https://pankbase.org:8000/apis.html">APIs</a>
                      </div>
                    </div>
                    <div className="menu-item-wrapper">
                      <a className="menu-item" href="/">Resources</a>
                      <div className="submenu">
                        <a className="submenu-item" href="https://pankbase.org:8000/single-cell.html">Analytical Library</a>
                        <a className="submenu-item" href="https://pankbase.org:8000/publications.html">Publications</a>
                      </div>
                    </div>
                    <div className="menu-item-wrapper">
                      <a className="menu-item" href="/">About</a>
                      <div className="submenu">
                        <a className="submenu-item" href="https://pankbase.org:8000/projects.html">Project</a>
                        <a className="submenu-item" href="https://pankbase.org:8000/people.html">People</a>
                        <a className="submenu-item" href="https://pankbase.org:8000/policies.html">Policies</a>
                        <a className="submenu-item" href="https://pankbase.org:8000/programs.html">Programs</a>
                        <a className="submenu-item" href="https://pankbase.org:8000/collaborate.html">Collaborate</a>
                      </div>
                    </div>
                    <div className="menu-item-wrapper">
                      <a className="menu-item" href="/">Help</a>
                      <div className="submenu">
                        <a className="submenu-item" href="https://pankbase.org:8000/contact.html">Contact</a>
                        <a className="submenu-item" href="https://pankbase.org:8000/metadata-data-standards.html">Metadata | Data Standards</a>
                        <a className="submenu-item" href="https://pankbase.org:8000/tools-pipelines.html">Tools | Pipelines</a>
                        <a className="submenu-item" href="https://pankbase.org:8000/tutorials.html">Tutorials</a>
                        <a className="submenu-item" href="https://pankbase.org:8000/news.html">News</a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/*{['Resources', 'Data', 'Analysis', 'PanKgraph', 'About', 'Help', 'News'].map((item) => (*/}
              {/*  <Typography*/}
              {/*    key={item}*/}
              {/*    component={item === 'PanKgraph' ? 'button' : Link}*/}
              {/*    onClick={item === 'PanKgraph' ? handlePanKgraphClick : undefined}*/}
              {/*    to={item === 'PanKgraph' ? undefined : `/${item.toLowerCase()}`}*/}
              {/*    sx={{*/}
              {/*      color: item === 'PanKgraph' ? '#000' : 'white',*/}
              {/*      textDecoration: 'none',*/}
              {/*      padding: '20px 15px',*/}
              {/*      backgroundColor: item === 'PanKgraph' ? '#f5f5f5' : 'transparent',*/}
              {/*      fontFamily: 'Open Sans',*/}
              {/*      fontWeight: item === 'PanKgraph' ? 700 : 400,*/}
              {/*      fontSize: '24px',*/}
              {/*      lineHeight: '32.68px',*/}
              {/*      borderTopLeftRadius: item === 'PanKgraph' ? '16px' : '0',*/}
              {/*      borderTopRightRadius: item === 'PanKgraph' ? '16px' : '0',*/}
              {/*      border: 'none',*/}
              {/*      cursor: 'pointer'*/}
              {/*    }}*/}
              {/*  >*/}
              {/*    {item}*/}
              {/*  </Typography>*/}
              {/*))}*/}
            {/*</Box>*/}
          {/*</Toolbar>*/}
        {/*</Container>*/}
      {/*</AppBar>*/}

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
              {['Search', 'API', 'Ontology', 'Use cases', 'Tutorial', 'Statistics'].map((item) => (
                <Typography
                  key={item}
                  component={Link}
                  to={item === 'Search' ? '/' : `/${item.toLowerCase().replace(' ', '-')}`}
                  onClick={(e) => {
                    if (item === 'Search') {
                      e.preventDefault();
                      if (window.location.pathname === '/') {
                        window.location.reload();
                      } else {
                        window.location.href = '/';
                      }
                    }
                  }}
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
