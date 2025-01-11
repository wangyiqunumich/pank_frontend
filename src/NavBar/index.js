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
              <div className="pkb-nav">
                <div className="logo">
                  <a href={process.env.REACT_APP_PANKBASE_LINK}>
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
                        <a className="menu-item menu-item-main" style={{color: 'white', backgroundColor: '#219197'}} href={process.env.REACT_APP_PANKGRAPH_LINK}>PanKgraph</a>
                        <div className="submenu">
                          <a className="submenu-item" href={process.env.REACT_APP_PANKGRAPH_LINK}>Search</a>
                          <a className="submenu-item" href={process.env.REACT_APP_PANKGRAPH_LINK + '/api'}>API</a>
                          <a className="submenu-item" href={process.env.REACT_APP_PANKGRAPH_LINK + '/ontology'}>Ontology</a>
                          <a className="submenu-item" href={process.env.REACT_APP_PANKGRAPH_LINK + '/usecases'}>Use cases</a>
                          <a className="submenu-item" href={process.env.REACT_APP_PANKGRAPH_LINK + '/tutorial'}>Tutorial</a>
                          <a className="submenu-item" href={process.env.REACT_APP_PANKGRAPH_LINK + '/statistics'}>Statistics</a>
                        </div>
                      </div>
                      <div className="menu-item-wrapper">
                        <a className="menu-item menu-item-main" href={process.env.REACT_APP_DATA_LIB_LINK}>Data Library</a>
                      </div>
                      <div className="menu-item-wrapper">
                        <a className="menu-item menu-item-main" href={process.env.REACT_APP_PANKBASE_LINK + '/single-cell.html'}>Integrated Cell Browser</a>
                      </div>
                    </div>
                    <div className="menu-item-wrapper">
                      <a className="menu-item" href="/">Data</a>
                      <div className="submenu">
                        <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/data-browser.html'}>Data Browser</a>
                        <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/single-cell.html'}>Integrated Cell Browser</a>
                        <a className="submenu-item" href={process.env.REACT_APP_DONOR_SUMMARY}>Donor Metadata</a>
                        <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/apis.html'}>APIs</a>
                      </div>
                    </div>
                    <div className="menu-item-wrapper">
                      <a className="menu-item" href="/">Resources</a>
                      <div className="submenu">
                        <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/single-cell.html'}>Analytical Library</a>
                        <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/publications.html'}>Publications</a>
                      </div>
                    </div>
                    <div className="menu-item-wrapper">
                      <a className="menu-item" href="/">About</a>
                      <div className="submenu">
                        <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/projects.html'}>Project</a>
                        <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/people.html'}>People</a>
                        <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/policies.html'}>Policies</a>
                        <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/programs.html'}>Programs</a>
                        <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/collaborate.html'}>Collaborate</a>
                      </div>
                    </div>
                    <div className="menu-item-wrapper">
                      <a className="menu-item" href="/">Help</a>
                      <div className="submenu">
                        <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/contact.html'}>Contact</a>
                        <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/metadata-data-standards.html'}>Metadata | Data Standards</a>
                        <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/tools-pipelines.html'}>Tools | Pipelines</a>
                        <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/tutorials.html'}>Tutorials</a>
                        <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/news.html'}>News</a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
    </>
  );
}

export default NavBar;
