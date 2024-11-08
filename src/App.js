import './App.css';
import React, { useState } from 'react';
import NavBar from './NavBar';
import SearchBar from './SearchBar';
import SearchResult from './SearchResult';
import IntermediatePage from './components/IntermediatePage';

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
      <SearchBar 
        onSearch={handleSearch} 
        disabled={showIntermediate} 
      />
      {showIntermediate && <IntermediatePage onContinue={handleContinue} />}
      {showResult && <SearchResult />}
    </div>
  );
}

export default App;
