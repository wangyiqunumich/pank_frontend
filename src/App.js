import './App.css';
import React, {useEffect, useState} from 'react';
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
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        function handleResize() {
            setWindowWidth(window.innerWidth)
        }
        window.addEventListener('resize', handleResize);
        return (_) => {
            window.removeEventListener('resize', handleResize);
        };
    });

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
                      left: `${windowWidth * 0.5 + 44}px`,
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
