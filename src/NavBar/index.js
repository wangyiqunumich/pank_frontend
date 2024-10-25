import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Menu, MenuItem } from '@mui/material';
import './scoped.css'; // This is where you will import your CSS from
 
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
    <AppBar position="static" sx={{ backgroundColor: '#4285F4' }}> {/* 使用蓝色 */}
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'white' }}>
          PanKWeb
        </Typography>
        <Button color="inherit" component={Link} to="/knowledge">Knowledge</Button>
        <Button color="inherit" component={Link} to="/catalog">Catalog</Button>
        <Button
          color="inherit"
          aria-controls={open ? 'pankgraph-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={handleClick}
        >
          Pankgraph
        </Button>
        <Menu
          id="pankgraph-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          MenuListProps={{
            'aria-labelledby': 'pankgraph-button',
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
          <MenuItem onClick={handleClose} component={Link} to="/">Query</MenuItem>
          <MenuItem onClick={handleClose} component={Link} to="/api">API</MenuItem>
          <MenuItem onClick={handleClose} component={Link} to="/llm-interface">LLM interface</MenuItem>
          <MenuItem onClick={handleClose} component={Link} to="/data-dump">Data dump</MenuItem>
          <MenuItem onClick={handleClose} component={Link} to="/docs">Docs</MenuItem>
          <MenuItem onClick={handleClose} component={Link} to="/ontology">Ontology</MenuItem>
          <MenuItem onClick={handleClose} component={Link} to="/open-kg">Open KG</MenuItem>
        </Menu>
        <Button color="inherit" component={Link} to="/compute">Compute</Button>
        <Button color="inherit" component={Link} to="/info">Info</Button>
        <Button color="inherit" component={Link} to="/help">Help</Button>
      </Toolbar>
    </AppBar>
  );
}

export default NavBar;
