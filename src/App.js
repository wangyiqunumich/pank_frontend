import './App.css';
import React, { useState } from 'react';
import NavBar from './NavBar';
import SearchBar from './SearchBar';
import SearchResult from './SearchResult';
import {useDispatch, useSelector} from 'react-redux';
import {queryImage} from "./redux/typeToImageSlice";
import {queryCatalog} from "./redux/catalogSlice";

function App() {
  const [showResult, setShowResult] = useState(false);
  // const image = useSelector((state) => state.typeToImage.typeToImage);
  const dispatch = useDispatch();

  const handleSearch = () => {
    setShowResult(true);
  };

  return (
    <div className="App">
      <NavBar />
      <SearchBar onSearch={handleSearch} />
      {showResult && <SearchResult />}
      {/*<button onClick={() => dispatch(queryImage({imageType: 'test'})).unwrap()}>test connection</button>*/}
      {/*<img src={`data:image/jpeg;base64,${image}`}/>*/}
    </div>
  );
}

export default App;
