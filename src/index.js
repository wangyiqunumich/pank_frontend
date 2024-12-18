import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import {store} from './redux/store';
import Ontology from './pages/Ontology';
import ApiPage from './pages/ApiPage';
import AIAnswer from './pages/AIAnswer';
import DocPage from './pages/DocPage';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/ontology" element={<Ontology />} />
          <Route path="/doc" element={<DocPage />} />
          <Route path="/api" element={<ApiPage />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
