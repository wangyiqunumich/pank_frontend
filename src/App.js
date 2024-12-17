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
    if (!showResult) {
      setShowLanding(false);
      setShowIntermediate(true); 
    }
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
          position: 'absolute',
          top: showLanding ? 410 : 162,
          left: `${window.innerWidth * 0.5 + 44}px`,
          width: 672
        }}
      />
      {showLanding ? (
        <LandingPage />
      ) : (
        <Container sx={{ padding: 0 }} disableGutters maxWidth={false}>
          {/*<Box sx={{ */}
          {/*  display: 'flex',*/}
          {/*  alignItems: 'center',*/}
          {/*  gap: 2,*/}
          {/*  mb: 3,*/}
          {/*  mt: 2*/}
          {/*}}>*/}
            {/*<Box sx={{ width: '60%', backgroundColor: 'red' }} />*/}
          {/*</Box>*/}
          {showIntermediate && <IntermediatePage onContinue={handleContinue} />}
          {showResult && <SearchResult />}
        </Container>
      )}
    </div>
  );
}

export default App;
