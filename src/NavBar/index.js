import React from 'react';
import { Link } from 'react-router-dom';
import './scoped.css'; // This is where you will import your CSS from
 
function NavBar() {
 
  return (
    <nav className="navigation-bar">
        <div className="logo" >
            <Link to="/">PanKGraph Logo</Link>
        </div>
        <div className="nav-links">
            {/* These links will be aligned to the right */}
            <Link to="/knowledge">Knowledge</Link>
            <Link to="/catalog">Catalog</Link>
            <Link to="/pankgraph">PanKGraph</Link>
            <Link to="/compute">Compute</Link>
            <Link to="/info">Info</Link>
            <Link to="/help">Help</Link>
        </div>
    </nav>
  )
}

export default NavBar;
