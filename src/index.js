import './index.css';

import React from 'react';

import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import {
  BrowserRouter,
  Route,
  Routes,
} from 'react-router-dom';

import { Container } from '@mui/material';

import DebugPage from './components/Debug';
import IntermediatePage from './components/IntermediatePage';
import AgentLandingPage from './components/AgentLandingPage';
import LandingPage from './components/LandingPage';
import MatchPage from './components/MatchPage';
import PkbFooter from './Footer/footer';
import NavBar from './NavBar';
import ApiPage from './pages/ApiPage';
import DocPage from './pages/DocPage';
import Ontology from './pages/Ontology';
import Pipeline from './pages/Pipeline';
import QTLDataSource from './pages/QTL_data_source';
import ReviewPage from './pages/ReviewPage';
import StatPage from './pages/StatPage';
import Tutorial from './pages/Tutorial';
import UsecasesPage from './pages/UsecasePage';
import { store } from './redux/store';
import ResultPage from './SearchResult';
import ResultPage2 from './SearchResult/result2';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
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
          <Route path="/result2" element={<ResultPage2 />} />
          <Route path="/usecases" element={<UsecasesPage />} />
          <Route path="/docs/*" element={<DocPage />} />
          <Route path="/match" element={<MatchPage />} />
          <Route path="/review/*" element={<ReviewPage />} />
          <Route path="/agent-landing" element={<AgentLandingPage />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="/debug" element={<DebugPage />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
        <PkbFooter />
      </BrowserRouter>
    </Container>
  </Provider>
);
