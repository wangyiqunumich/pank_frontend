import './App.css';
import React, { useState } from 'react';
import NavBar from './NavBar';
import SearchBar from './SearchBar';
import SearchResult from './SearchResult';
import IntermediatePage from './components/IntermediatePage';
import { Box, Container } from '@mui/material';

function App() {
  const [showIntermediate, setShowIntermediate] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const handleSearch = () => {
    setShowIntermediate(true);
  };

  const handleContinue = () => {
    setShowIntermediate(false);
    setShowResult(true);
  };

  return (
    <div className="App">
      <NavBar />
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
    </div>
  );
}

export default App;
