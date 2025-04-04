import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import Ontology from './pages/Ontology';
import ApiPage from './pages/ApiPage';
import AIAnswer from './pages/AIAnswer';
import StatPage from './pages/StatPage';
import DocPage from './pages/DocPage';
import Tutorial from './pages/Tutorial';
import LandingPage from './components/LandingPage';
import IntermediatePage from './components/IntermediatePage';
import ResultPage from './SearchResult';
import NavBar from "./NavBar";
import PkbFooter from "./Footer/footer";
import { Container } from "@mui/material";
import UsecasesPage from "./pages/UsecasePage";
import QTLDataSource from "./pages/QTL_data_source";
import Pipeline from "./pages/Pipeline";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <Container disableGutters maxWidth={false} sx={{
        padding: 0, margin: 0, minHeight: '100vh',
        display: 'flex', flexDirection: 'column'
      }}>
        <BrowserRouter>
          <NavBar />
          <Routes>
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/qtldatasource" element={<QTLDataSource />} />
            <Route path="/intermediate" element={<IntermediatePage />} />
            <Route path="/ontology" element={<Ontology />} />
            <Route path="/statistics" element={<StatPage />} />
            <Route path="/api" element={<ApiPage />} />
            <Route path="/tutorial" element={<Tutorial />} />
            <Route path="/result" element={<ResultPage />} />
            <Route path="/usecases" element={<UsecasesPage />} />
            <Route path="/docs/*" element={<DocPage />} />
            <Route path="/" element={<LandingPage />} />
          </Routes>
          <PkbFooter />
        </BrowserRouter>
      </Container>
    </Provider>
  </React.StrictMode>
);
