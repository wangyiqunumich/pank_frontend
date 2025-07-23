import './scoped.css';

import React from 'react';

import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

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

  const MainMenuItems = [
    {
      label: 'Search',
      link: '/'
    },
    {
      label: 'Advanced Query',
      link: '/'
    },
    {
      label: 'API',
      link: '/docs/API'
    }
  ]

  const MenuItems = [
    {
      label: 'Support',
      link: process.env.REACT_APP_PANKGRAPH_LINK
    },
    {
      label: 'What\'s New',
      link: process.env.REACT_APP_PANKBASE_LINK + '/single-cell.html'
    },
    {
      label: 'Data Dump',
      link: process.env.REACT_APP_PANKBASE_LINK + '/about.html'
    }
  ]

  return (
    <>
      <div className="pkb-nav">
        <div className="logo">
          <a href={process.env.REACT_APP_PANKBASE_LINK}>
            <img style={{ height: '50px' }}
              src="https://hugeampkpncms.org/sites/default/files/users/user32/pankbase/PanKbase_logo-black-tagline.svg" />
          </a>
        </div>
        <div className="nav-right">
          {
            MainMenuItems.map((item, index) => (
              <a key={index} className="menu-item main-menu-item" href={item.link}>{item.label}</a>
            ))}
          {
            MenuItems.map((item, index) => (
              <a key={index} className="menu-item" href={item.link}>{item.label}</a>
            ))
          }
        </div>
      </div>
    </>
  );
}

export default NavBar;
