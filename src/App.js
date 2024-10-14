import './App.css';
import React, { useState } from 'react';
import NavBar from './NavBar';
import SearchBar from './SearchBar';
import SearchResult from './SearchResult';
import { useSelector } from 'react-redux';

function App() {
  const [showResult, setShowResult] = useState(false);
  const { viewSchema } = useSelector((state) => state.viewSchema);

  const handleSearch = () => {
    setShowResult(true);
  };

  return (
    <div className="App">
      <NavBar />
      <SearchBar onSearch={handleSearch} />
      {showResult && <SearchResult />}
    </div>
  );
}

export default App;
