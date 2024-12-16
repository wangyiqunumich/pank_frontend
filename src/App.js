import './App.css';
import React, { useState } from 'react';
import NavBar from './NavBar';
import SearchBar from './SearchBar';
import SearchResult from './SearchResult';
import IntermediatePage from './components/IntermediatePage';
import LandingPage from './components/LandingPage';
import { Box, Container } from '@mui/material';

function App() {
  const [showIntermediate, setShowIntermediate] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  const handleSearch = () => {
    setShowLanding(false);
    setShowIntermediate(true);
  };

  const handleContinue = () => {
    setShowIntermediate(false);
    setShowResult(true);
  };

  return (
    <div className="App">
      <NavBar />
      <SearchBar 
        onSearch={handleSearch} 
        disabled={showIntermediate || showResult}
        style={{
          position: showLanding ? 'absolute' : 'relative',
          top: showLanding ? 410 : 'auto',
          left: showLanding ? `${window.innerWidth * 0.5 + 44}px` : 'auto',
          width: showLanding ? 672 : '60%'
        }}
      />
      {showLanding ? (
        <LandingPage />
      ) : (
        <Container maxWidth="xl">
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 3,
            mt: 2
          }}>
            <Box sx={{ width: '60%', visibility: 'hidden' }} />
          </Box>
          {showIntermediate && <IntermediatePage onContinue={handleContinue} />}
          {showResult && <SearchResult />}
        </Container>
      )}
    </div>
  );
}

export default App;
