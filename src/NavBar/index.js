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
                  <a href="https://pankbase.org:8000/">
                    <img style={{height: '50px'}}
                         src="https://hugeampkpncms.org/sites/default/files/users/user32/pankbase/PanKbase_logo-black-tagline.svg"/>
                  </a>
                </div>
                <div className="menu-wrapper">
                  <div className="topmenu">
                    <a className="topmenu-item" href="https://dev.pankgraph.org/" style={{ color: '#d9d9d9' }}>
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
                        <div className="submenu">
                          <a className="submenu-item" href="https://dev.pankgraph.org/">Search</a>
                          <a className="submenu-item" href="https://dev.pankgraph.org/api">API</a>
                          <a className="submenu-item" href="https://dev.pankgraph.org/ontology">Ontology</a>
                          <a className="submenu-item" href="https://dev.pankgraph.org/usecases">Use cases</a>
                          <a className="submenu-item" href="https://dev.pankgraph.org/tutorial">Tutorial</a>
                          <a className="submenu-item" href="https://dev.pankgraph.org/statistics">Statistics</a>
                        </div>
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
    </>
  );
}

export default NavBar;
