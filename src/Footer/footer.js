import './PkbFooter.scss'; // Import the CSS file for styles

import React, { useState } from 'react';

import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

export const pkbMenu = {
    highlightItems: [
        { label: 'PanKgraph', path: 'https://dev.pankgraph.org/' },
        { label: 'Data Library', path: 'https://data.pankbase.org' },
        { label: 'Integrated Cell Browser', path: 'https://pankbase.org:8000/single-cell.html' }
    ],
    menuItems: [
        {
            label: 'Data', path: '',
            subMenuItems: [
                { label: 'Data Browser', path: 'https://pankbase.org:8000/data-browser.html' },
                { label: 'Donor Metadata', path: 'http://tools.cmdga.org:3838/metadata_analysis_assays/' },
                { label: 'APIs', path: 'https://pankbase.org:8000/apis.html' }
            ]
        }, {
            label: 'Resources', path: '',
            subMenuItems: [
                { label: 'Integrated Cell Browser', path: 'https://pankbase.org:8000/single-cell.html' },
                { label: 'Analytical Library', path: 'https://pankbase.org:8000/analytical-library.html' },
                { label: 'Publications', path: 'https://pankbase.org:8000/publications.html' }
            ]
        }, {
            label: 'About', path: '',
            subMenuItems: [
                { label: 'Project', path: 'https://pankbase.org:8000/projects.html' },
                { label: 'People', path: 'https://pankbase.org:8000/people.html' },
                { label: 'Policies', path: 'https://pankbase.org:8000/policies.html' },
                { label: 'Programs', path: 'https://pankbase.org:8000/programs.html' },
                { label: 'Collaborate', path: 'https://pankbase.org:8000/collaborate.html' }
            ]
        }, {
            label: 'Help', path: '',
            subMenuItems: [
                { label: 'Contact', path: 'https://pankbase.org:8000/contact.html' },
                { label: 'Metadata | Data Standards', path: 'https://pankbase.org:8000/metadata-data-standards.html' },
                { label: 'Tools | Pipelines', path: 'https://pankbase.org:8000/tools-pipelines.html' },
                { label: 'Tutorials', path: 'https://pankbase.org:8000/tutorials.html' },
                { label: 'News', path: 'https://pankbase.org:8000/news.html' }
            ]
        }
    ],
}

function PkbFooter() {
    const [openSections, setOpenSections] = useState({});

    const toggleSection = (label) => {
        setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
    };

    return (
        <div className="pkb-footer" style={{ minHeight: 'fit-content', height: 'auto', position: 'relative' }}>
            <div className="menu">
                <div className="main-menu-items">
                    {pkbMenu.highlightItems.map((item) => (
                        <div className="menu-item-wrapper" key={item.path}>
                            <a className="menu-item menu-item-main" href={item.path} style={{ fontWeight: 600 }}>
                                {item.label}
                            </a>
                        </div>
                    ))}
                </div>
                {pkbMenu.menuItems.map((item) => (
                    <div
                        className={`menu-item-wrapper${openSections[item.label] ? ' active' : ''}`}
                        key={item.path || item.label}
                    >
                        {item.path ? (
                            <a className="menu-item" href={item.path} style={{ fontWeight: 600 }}>
                                {item.label}
                            </a>
                        ) : (
                            <span className="menu-item menu-item-label" style={{ fontWeight: 600 }}>
                                {item.label}
                            </span>
                        )}
                        {item.subMenuItems && (
                            <>
                                <button
                                    type="button"
                                    className="submenu-toggle"
                                    aria-label={`Toggle ${item.label} submenu`}
                                    aria-expanded={!!openSections[item.label]}
                                    onClick={() => toggleSection(item.label)}
                                >
                                    <KeyboardArrowDownIcon fontSize="small" />
                                </button>
                                <div className="submenu">
                                    {item.subMenuItems.map((subItem) => (
                                        <a
                                            className="submenu-item"
                                            href={subItem.path || null}
                                            key={subItem.path || subItem.label}
                                        >
                                            {subItem.label}
                                        </a>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
            <div className="info-rows">
                <div className="logo info-logo-1">
                    <a href="/old-landing">
                        <img
                            className="footer-logo-img"
                            src="https://hugeampkpncms.org/sites/default/files/users/user32/pankbase/PanKbase_logo-black.svg"
                            alt="PanKbase Logo"
                        />
                    </a>
                </div>
                <div className="f-row-text info-text-1">
                    Supported by <strong>National Institutes of Health (NIH)</strong>{" "}
                    grants <strong>U24 DK138515</strong>, <strong>U24 DK138512</strong>
                    <br />
                    Supplemental funds from the{" "}
                    <strong>NIH Office of Data Science Strategies</strong>
                </div>
                <div className="logo info-logo-2">
                    <a href="https://hirnetwork.org/">
                        <img
                            className="footer-logo-img"
                            src="https://hirnetwork.org/2021/wp-content/uploads/2024/02/logo-hirn.svg"
                            alt="Hirn Logo"
                        />
                    </a>
                </div>
                <div className="f-row-text info-text-2">
                    Check out the latest developments from the Human Islet Resource Network (HIRN) through its newsletter detailing research advancements, funding opportunities, job openings, and more.
                </div>
            </div>
        </div>
    );
}

export default PkbFooter;
