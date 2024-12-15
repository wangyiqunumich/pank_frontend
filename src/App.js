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
      {showLanding ? (
        // Landing Page 布局
        <>
          <LandingPage />
          <Container maxWidth="xl" sx={{ position: 'absolute', top: '50%', left: '70%', transform: 'translate(-50%, -50%)' }}>
            <Box sx={{ 
              width: '50%',
              margin: '0 auto'
            }}>
              <SearchBar onSearch={handleSearch} disabled={showIntermediate || showResult} />
            </Box>
          </Container>
        </>
      ) : (
        // 其他页面布局
        <Container maxWidth="xl">
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 3,
            mt: 2
          }}>
            <Box sx={{ width: '60%', display: 'flex', gap: 2 }}>
              <SearchBar onSearch={handleSearch} disabled={showIntermediate || showResult} />
            </Box>
          </Box>
          {showIntermediate && <IntermediatePage onContinue={handleContinue} />}
          {showResult && <SearchResult />}
        </Container>
      )}
    </div>
  );
}

export default App;
