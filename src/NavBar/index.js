import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Menu, MenuItem } from '@mui/material';
import './scoped.css';

function NavBar() {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: '#C5D9B1' }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, textAlign: 'left' }}>
          <Link to="/" className="logo">Logo</Link>
        </Typography>
        
        <div className="nav-links">
          <Button color="inherit" component={Link} to="/">Query</Button>
          <Button color="inherit" component={Link} to="/api">API</Button>
          <Button color="inherit" component={Link} to="/llm">LLM</Button>
          <Button color="inherit" component={Link} to="/data-dump">Data Dump</Button>
          <Button 
            color="inherit"
            aria-controls={open ? 'about-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
            onClick={handleClick}
          >
            About
          </Button>
          <Menu
            id="about-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{
              'aria-labelledby': 'about-button',
            }}
            PaperProps={{
              sx: {
                backgroundColor: '#f5f5f5',
                '& .MuiMenuItem-root': {
                  color: '#333',
                  '&:hover': {
                    backgroundColor: '#e0e0e0',
                  },
                },
              },
            }}
          >
            <MenuItem onClick={handleClose} component={Link} to="/docs">Docs</MenuItem>
            <MenuItem onClick={handleClose} component={Link} to="/ontology">Ontology</MenuItem>
            <MenuItem onClick={handleClose} component={Link} to="/open-kg">Open KG</MenuItem>
          </Menu>
          <Button 
            variant="contained"
            component={Link} 
            to="/pankbase"
            sx={{
              backgroundColor: '#FFFFFF',
              color: '#000000',
              borderRadius: '20px',
              marginLeft: '20px',
              '&:hover': {
                backgroundColor: '#F0F0F0'
              }
            }}
          >
            PanKbase
          </Button>
        </div>
      </Toolbar>
    </AppBar>
  );
}

export default NavBar;
