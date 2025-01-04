import React from "react";
import "./PkbFooter.css"; // Import the CSS file for styles

export const pkbMenu = {
    highlightItems: [
        { label: 'PanKgraph',               path: 'https://dev.pankgraph.org/' },
        { label: 'Data Library',            path: 'https://data.pankbase.org' },
        { label: 'Integrated Cell Browser', path: 'https://pankbase.org:8000/single-cell.html' }
    ],
    menuItems: [
        {
            label: 'Data', path: '',
            subMenuItems: [
                { label: 'Data Browser', path: 'https://pankbase.org:8000/data-browser.html' },
                { label: 'Donor Metadata', path: 'http://tools.cmdga.org:3838/metadata_analysis_assays/' },
                { label: 'APIs',         path: 'https://pankbase.org:8000/apis.html' }
            ]
        },{
            label: 'Resources', path: '',
            subMenuItems: [
                { label: 'Integrated Cell Browser', path: 'https://pankbase.org:8000/single-cell.html' },
                { label: 'Analytical Library',      path: 'https://pankbase.org:8000/analytical-library.html' },
                { label: 'Publications',            path: 'https://pankbase.org:8000/publications.html' }
            ]
        },{
            label: 'About', path: '',
            subMenuItems: [
                { label: 'Project',     path: 'https://pankbase.org:8000/projects.html' },
                { label: 'People',      path: 'https://pankbase.org:8000/people.html' },
                { label: 'Policies',    path: 'https://pankbase.org:8000/policies.html' },
                { label: 'Programs',    path: 'https://pankbase.org:8000/programs.html' },
                { label: 'Collaborate', path: 'https://pankbase.org:8000/collaborate.html' }
            ]
        },{
            label: 'Help', path: '',
            subMenuItems: [
                { label: 'Contact',                   path: 'https://pankbase.org:8000/contact.html' },
                { label: 'Metadata | Data Standards', path: 'https://pankbase.org:8000/metadata-data-standards.html' },
                { label: 'Tools | Pipelines',         path: 'https://pankbase.org:8000/tools-pipelines.html' },
                { label: 'Tutorials',                 path: 'https://pankbase.org:8000/tutorials.html' },
                { label: 'News',                      path: 'https://pankbase.org:8000/news.html' }
            ]
        }
    ],
}

function PkbFooter() {
    return (
        <div className="pkb-footer">
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
                    <div className="menu-item-wrapper" key={item.path || item.label}>
                        <a className="menu-item" href={item.path || null} style={{ fontWeight: 600 }}>
                            {item.label}
                        </a>
                        {item.subMenuItems && (
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
                        )}
                    </div>
                ))}
            </div>
            <div className={'f-row'} style={{ gap: "20px", flexDirection: 'row', display: 'flex', width: 'fit-content' }}>
                <div className="logo">
                    <a href="/">
                        <img
                            style={{ height: "37px" }}
                            src="https://hugeampkpncms.org/sites/default/files/users/user32/pankbase/PanKbase_logo-black.svg"
                            alt="PanKbase Logo"
                        />
                    </a>
                </div>
                <div style={{ textAlign: 'left'}}>
                    Supported by <strong>National Institutes of Health (NIH)</strong>{" "}
                    grants <strong>U24 DK138515</strong>, <strong>U24 DK138512</strong>
                    <br />
                    Supplemental funds from the{" "}
                    <strong>NIH Office of Data Science Strategies</strong>
                </div>
            </div>
        </div>
    );
}

export default PkbFooter;
