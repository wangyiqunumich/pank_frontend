import './App.css';
import React, { useState } from 'react';
import NavBar from './NavBar';
import SearchBar from './SearchBar';
import SearchResult from './SearchResult';
import IntermediatePage from './components/IntermediatePage';
import LandingPage from './components/LandingPage';
import {Box, Container, CssBaseline, StyledEngineProvider, ThemeProvider} from '@mui/material';
import theme from './theme/theme';

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
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme()}>
                <CssBaseline />
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
                      {showIntermediate && <IntermediatePage onContinue={handleContinue} />}
                      {showResult && <SearchResult />}
                    </Container>
                  )}
            </ThemeProvider>
        </StyledEngineProvider>
    </div>
  );
}

export default App;
