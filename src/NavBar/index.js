import './scoped-shared.scss';

import React, { useMemo, useState } from 'react';

import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import { Drawer, IconButton, Typography } from '@mui/material';

import hirnLogo from '../image/logo-hirn.svg';

const fundingLink = process.env.REACT_APP_API_GATEWAY_STAGE_NAME === 'development'
  ? 'https://dev.pankbase.org/funding.html'
  : 'https://pankbase.org/funding.html';

const integratedCellBrowserLink = process.env.REACT_APP_API_GATEWAY_STAGE_NAME === 'development'
  ? 'https://dev.pankbase.org/single-cell.html'
  : 'https://pankbase.org/single-cell.html';

const topMenuItems = [
  {
    label: 'Funding Opportunities',
    href: fundingLink,
    icon: 'https://hugeampkpncms.org/sites/default/files/images/pankbase/icons/funding_icon_black.svg',
    iconAlt: 'Funding Icon',
  },
  {
    label: 'Search',
    icon: 'https://hugeampkpncms.org/sites/default/files/users/user32/pankbase/search-icon.svg',
    iconAlt: 'Search Icon',
    disabled: true,
  },
  {
    label: 'Analysis',
    disabled: true,
  },
  {
    label: 'Login',
    icon: 'https://hugeampkpncms.org/sites/default/files/users/user32/pankbase/user-icon.svg',
    iconAlt: 'User Icon',
    disabled: true,
  },
];

const primaryMenuItems = [
  {
    label: 'PanKgraph',
    href: process.env.REACT_APP_PANKGRAPH_LINK,
    highlighted: true,
    subMenuItems: [
      { label: 'Chat', href: process.env.REACT_APP_PANKGRAPH_LINK },
      { label: 'Tools', href: `${process.env.REACT_APP_PANKGRAPH_LINK}/skills` },
      { label: 'KG API Doc', href: `${process.env.REACT_APP_PANKGRAPH_LINK}/docs/KG_API` },
      { label: 'Literature API Doc', href: `${process.env.REACT_APP_PANKGRAPH_LINK}/docs/Literature_API` },
      { label: 'Ontology', href: `${process.env.REACT_APP_PANKGRAPH_LINK}/docs/ontology` },
      { label: 'Use cases', href: `${process.env.REACT_APP_PANKGRAPH_LINK}/docs/usecase` },
      { label: 'Tutorials', href: `${process.env.REACT_APP_PANKGRAPH_LINK}/docs/tutorial` },
      { label: 'Statistics', href: `${process.env.REACT_APP_PANKGRAPH_LINK}/docs/statistics` },
    ],
  },
  {
    label: 'Integrated Cell Browser',
    href: integratedCellBrowserLink,
  },
];

const menuSections = [
  {
    label: 'Data',
    subMenuItems: [
      { label: 'Donor Summary', href: `${process.env.REACT_APP_PANKBASE_LINK}/donors.html` },
      { label: 'Data Library', href: process.env.REACT_APP_DATA_LIB_LINK },
      { label: 'APIs', href: `${process.env.REACT_APP_PANKBASE_LINK}/apis.html` },
    ],
  },
  {
    label: 'Resources',
    subMenuItems: [
      { label: 'Integrated Cell Browser', href: integratedCellBrowserLink },
      { label: 'Genome Browser', href: `${process.env.REACT_APP_PANKBASE_LINK}/atacseq.html` },
      { label: 'Differential Gene Expression Browser', href: `${process.env.REACT_APP_PANKBASE_LINK}/diff-exp.html` },
      { label: 'Gene Browser', href: `${process.env.REACT_APP_PANKBASE_LINK}/gene.html` },
      { label: 'Functional Browser', href: `${process.env.REACT_APP_PANKBASE_LINK}/functional.html` },
      { label: 'PCA Explorer', href: `${process.env.REACT_APP_PANKBASE_LINK}/pca-explorer.html` },
      { label: 'Analytical Library', href: `${process.env.REACT_APP_PANKBASE_LINK}/analytical-library.html` },
      { label: 'Data and Metadata Standards', href: `${process.env.REACT_APP_PANKBASE_LINK}/metadata-data-standards.html` },
      { label: 'Tools | Pipelines', href: `${process.env.REACT_APP_PANKBASE_LINK}/tools-pipelines.html` },
      { label: 'Publications', href: `${process.env.REACT_APP_PANKBASE_LINK}/publications.html` },
    ],
  },
  {
    label: 'About',
    subMenuItems: [
      { label: 'PanKbase Program', href: `${process.env.REACT_APP_PANKBASE_LINK}/projects.html` },
      { label: 'People', href: `${process.env.REACT_APP_PANKBASE_LINK}/people.html` },
      { label: 'Policies', href: `${process.env.REACT_APP_PANKBASE_LINK}/policies.html` },
      { label: 'Related Programs', href: `${process.env.REACT_APP_PANKBASE_LINK}/programs.html` },
      { label: 'Collaborate', href: `${process.env.REACT_APP_PANKBASE_LINK}/collaborate.html` },
      { label: 'Funding Opportunities', href: `${process.env.REACT_APP_PANKBASE_LINK}/funding.html` },
    ],
  },
  {
    label: 'Help',
    subMenuItems: [
      { label: 'Contact | Feedback', href: `${process.env.REACT_APP_PANKBASE_LINK}/contact.html` },
      { label: 'Tutorials', href: `${process.env.REACT_APP_PANKBASE_LINK}/tutorials.html` },
      { label: 'GitHub', href: process.env.REACT_APP_GITHUB_LINK },
      { label: 'News', href: `${process.env.REACT_APP_PANKBASE_LINK}/news.html` },
    ],
  },
];

function NavBar() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [openMobileSections, setOpenMobileSections] = useState({
    PanKgraph: true,
  });

  const mobileSections = useMemo(
    () => [
      {
        label: 'Funding Opportunities',
        href: fundingLink,
      },
      ...primaryMenuItems,
      ...menuSections,
      {
        label: 'HIRN',
        href: 'https://hirnetwork.org/',
      },
    ],
    []
  );

  const closeMobileDrawer = () => {
    setMobileDrawerOpen(false);
  };

  const toggleMobileSection = (label) => {
    setOpenMobileSections((current) => ({
      ...current,
      [label]: !current[label],
    }));
  };

  const renderDesktopSubmenu = (subMenuItems, includeDivider = false) => (
    <div className="submenu">
      {subMenuItems.map((subItem, index) => (
        <React.Fragment key={subItem.label}>
          {includeDivider && index === 2 ? <div className="submenu-divider" /> : null}
          <a className="submenu-item" href={subItem.href}>
            {subItem.label}
          </a>
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div style={{ position: 'relative', zIndex: 1300 }}>
      <div className="pkb-nav">
        <IconButton
          className="mobile-context-button"
          onClick={() => setMobileDrawerOpen(true)}
          aria-label="Open context navigation"
          size="small"
        >
          <MenuRoundedIcon fontSize="small" />
        </IconButton>
        <div className="logo">
          <a href={process.env.REACT_APP_PANKBASE_LINK}>
            <img
              className="logo-img"
              src="https://hugeampkpncms.org/sites/default/files/users/user32/pankbase/PanKbase_logo-black-tagline.svg"
              alt="PanKbase Logo"
            />
          </a>
        </div>
        <div className="nav-right">
          <div className="menu-wrapper">
            <div className="topmenu">
              {topMenuItems.map((item) => (
                item.href ? (
                  <a className="topmenu-item" href={item.href} key={item.label}>
                    <span>{item.label}</span>
                    {item.icon ? (
                      <img src={item.icon} style={{ height: '15px', width: '15px' }} alt={item.iconAlt} />
                    ) : null}
                  </a>
                ) : (
                  <span className="topmenu-item topmenu-item-disabled" key={item.label}>
                    <span>{item.label}</span>
                    {item.icon ? (
                      <img src={item.icon} style={{ height: '15px', width: '15px' }} alt={item.iconAlt} />
                    ) : null}
                  </span>
                )
              ))}
            </div>
            <div className="menu">
              <div className="main-menu-items">
                {primaryMenuItems.map((item) => (
                  <div className="menu-item-wrapper" key={item.label}>
                    <a
                      className={`menu-item menu-item-main${item.highlighted ? ' menu-item-main-highlighted' : ''}`}
                      href={item.href}
                    >
                      {item.label}
                    </a>
                    {item.subMenuItems ? renderDesktopSubmenu(item.subMenuItems, item.label === 'PanKgraph') : null}
                  </div>
                ))}
              </div>
              {menuSections.map((section) => (
                <div className="menu-item-wrapper" key={section.label}>
                  <button type="button" className="menu-item menu-trigger">
                    {section.label}
                  </button>
                  {renderDesktopSubmenu(section.subMenuItems)}
                </div>
              ))}
            </div>
          </div>
          <div className="logo hirn-logo">
            <a href="https://hirnetwork.org/" target="_blank" rel="noreferrer">
              <img className="logo-img" src={hirnLogo} alt="HIRN Logo" />
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
      <Drawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={closeMobileDrawer}
        sx={{ zIndex: 1800 }}
        PaperProps={{ className: 'pkb-nav-mobile-drawer' }}
      >
        <div className="pkb-nav-mobile-drawer__content">
          <div className="pkb-nav-mobile-drawer__header">
            <a
              className="pkb-nav-mobile-drawer__brand"
              href={process.env.REACT_APP_PANKBASE_LINK}
              onClick={closeMobileDrawer}
            >
              <img
                className="pkb-nav-mobile-drawer__brand-logo"
                src="https://hugeampkpncms.org/sites/default/files/users/user32/pankbase/PanKbase_logo-black-tagline.svg"
                alt="PanKbase Logo"
              />
            </a>
            <IconButton aria-label="Close context navigation" onClick={closeMobileDrawer}>
              <CloseRoundedIcon />
            </IconButton>
          </div>
          <div className="pkb-nav-mobile-drawer__sections">
            {mobileSections.map((section) => {
              const hasSubmenu = Array.isArray(section.subMenuItems) && section.subMenuItems.length > 0;
              const isOpen = !!openMobileSections[section.label];

              if (!hasSubmenu) {
                return (
                  <a
                    className={`pkb-nav-mobile-link${section.highlighted ? ' is-highlighted' : ''}`}
                    href={section.href}
                    key={section.label}
                    onClick={closeMobileDrawer}
                  >
                    {section.label}
                  </a>
                );
              }

              return (
                <div className={`pkb-nav-mobile-section${isOpen ? ' is-open' : ''}`} key={section.label}>
                  <button
                    type="button"
                    className="pkb-nav-mobile-section__toggle"
                    onClick={() => toggleMobileSection(section.label)}
                    aria-expanded={isOpen}
                  >
                    <span>{section.label}</span>
                    <ExpandMoreRoundedIcon className="pkb-nav-mobile-section__icon" />
                  </button>
                  <div className="pkb-nav-mobile-section__panel">
                    {section.href ? (
                      <a
                        className="pkb-nav-mobile-sublink pkb-nav-mobile-sublink-main"
                        href={section.href}
                        onClick={closeMobileDrawer}
                      >
                        Open {section.label}
                      </a>
                    ) : null}
                    {section.subMenuItems.map((subItem) => (
                      <a
                        className="pkb-nav-mobile-sublink"
                        href={subItem.href}
                        key={subItem.label}
                        onClick={closeMobileDrawer}
                      >
                        {subItem.label}
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Drawer>
    </div>
  );
}

export default NavBar;
