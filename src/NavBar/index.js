import './scoped-shared.scss';

import React from 'react';

import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { Typography } from '@mui/material';

import hirnLogo from '../image/logo-hirn.svg';
import { setSearchTerms } from '../redux/searchSlice';

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
    <div style={{ position: 'relative' }}>
      <div className="pkb-nav">
        <div className="logo">
          <a href={process.env.REACT_APP_PANKBASE_LINK}>
            <img style={{ height: '50px' }}
              src="https://hugeampkpncms.org/sites/default/files/users/user32/pankbase/PanKbase_logo-black-tagline.svg" />
          </a>
        </div>
        <div className="nav-right">
          <div className="menu-wrapper">
            <div className="topmenu">
              <a className="topmenu-item" href={
                process.env.REACT_APP_API_GATEWAY_STAGE_NAME === "development"
                  ? "https://dev.pankbase.org/funding.html"
                  : "https://pankbase.org/funding.html"}>
                {" Funding Opportunities "}
                <img src="https://hugeampkpncms.org/sites/default/files/images/pankbase/icons/funding_icon_black.svg" style={{ height: '15px', width: '15px' }} alt="Funding Icon" />
              </a>
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
                  <a className="menu-item menu-item-main" style={{ color: 'white', backgroundColor: '#219197' }} href={process.env.REACT_APP_PANKGRAPH_LINK}>PanKgraph</a>
                  <div className="submenu">
                    <a className="submenu-item" href={process.env.REACT_APP_PANKGRAPH_LINK}>Search</a>
                    <a className="submenu-item" href={process.env.REACT_APP_PANKGRAPH_LINK + '/docs/API'}>API</a>
                    <a className="submenu-item" href={process.env.REACT_APP_PANKGRAPH_LINK + '/docs/ontology'}>Ontology</a>
                    <a className="submenu-item" href={process.env.REACT_APP_PANKGRAPH_LINK + '/docs/usecase'}>Use cases</a>
                    <a className="submenu-item" href={process.env.REACT_APP_PANKGRAPH_LINK + '/docs/tutorial'}>Tutorial</a>
                    <a className="submenu-item" href={process.env.REACT_APP_PANKGRAPH_LINK + '/docs/statistics'}>Statistics</a>
                  </div>
                </div>
                {/*<div className="menu-item-wrapper">*/}
                {/*  <a className="menu-item menu-item-main" href={process.env.REACT_APP_DATA_LIB_LINK}>Data Library</a>*/}
                {/*</div>*/}
                <div className="menu-item-wrapper">
                  <a className="menu-item menu-item-main" href={process.env.REACT_APP_PANKBASE_LINK + '/single-cell.html'}>Integrated Cell Browser</a>
                </div>
              </div>
              <div className="menu-item-wrapper">
                <a className="menu-item" href="/old-landing">Data</a>
                <div className="submenu">
                  {/*<a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/data-browser.html'}>Data Browser</a>*/}
                  <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/donor-metadata.html'}>Donor Summary</a>
                  <a className="submenu-item" href={process.env.REACT_APP_DATA_LIB_LINK}>Data Library</a>
                  <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/apis.html'}>APIs</a>
                </div>
              </div>
              <div className="menu-item-wrapper">
                <a className="menu-item" href="/old-landing">Resources</a>
                <div className="submenu">
                  <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/single-cell.html'}>Integrated Cell Browser</a>
                  <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/diff-exp.html'}>Differential Gene Expression Browser</a>
                  <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/pca-explorer.html'}>PCA Explorer</a>
                  <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/analytical-library.html'}>Analytical Library</a>
                  <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/metadata-data-standards.html'}>Metadata Standards</a>
                  <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/tools-pipelines.html'}>Tools | Pipelines</a>
                  <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/publications.html'}>Publications</a>
                </div>
              </div>
              <div className="menu-item-wrapper">
                <a className="menu-item" href="/old-landing">About</a>
                <div className="submenu">
                  <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/projects.html'}>PanKbase Program</a>
                  <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/people.html'}>People</a>
                  <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/policies.html'}>Policies</a>
                  <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/programs.html'}>Related Programs</a>
                  <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/collaborate.html'}>Collaborate</a>
                </div>
              </div>
              <div className="menu-item-wrapper">
                <a className="menu-item" href="/old-landing">Help</a>
                <div className="submenu">
                  <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/contact.html'}>Contact | Feedback</a>
                  <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/tutorials.html'}>Tutorials</a>
                  <a className="submenu-item" href={process.env.REACT_APP_GITHUB_LINK}>GitHub</a>
                  <a className="submenu-item" href={process.env.REACT_APP_PANKBASE_LINK + '/news.html'}>News</a>
                </div>
              </div>
            </div>
          </div>
          <div className="logo">
            <a href="https://hirnetwork.org/" target="_blank">
              <img style={{ height: '50px' }}
                src={hirnLogo} />
            </a>
          </div>
        </div>
      </div>
      <Typography sx={{
        position: 'absolute',
        top: '100%',
        left: '20px',
        padding: '0px 15px',
        fontSize: '14px',
        backgroundColor: '#219197',
        zIndex: 100,
        color: 'white',
        width: 'fit-content',
      }}>beta</Typography>
    </div>
  );
}

export default NavBar;
