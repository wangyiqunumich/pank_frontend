import './index.css';

import React from 'react';

import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import { Container } from '@mui/material';

import AgentLandingPage from './components/AgentLandingPage';
import DebugPage from './components/Debug';
import IgvPage from './components/GeDebug';
import IntermediatePage from './components/IntermediatePage';
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
import { AgentResultLayout } from './SearchResult/AgentResult';
import ResultPageNew from './SearchResult/index_new';
import ResultPage2 from './SearchResult/resultpage';
import ResultPageNew2 from './SearchResult/resultpage_new';

const isDevelopmentStage =
  (process.env.REACT_APP_API_GATEWAY_STAGE_NAME || '').toLowerCase() === 'development';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Provider store={store}>
    <Container disableGutters maxWidth={false} sx={{
      padding: 0, margin: 0, minHeight: '100%',
      display: 'flex', flexDirection: 'column'
    }}>
      <BrowserRouter>
        <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
          <NavBar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Routes>
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/qtldatasource" element={<QTLDataSource />} />
              <Route path="/intermediate" element={<IntermediatePage />} />
              <Route path="/ontology" element={<Ontology />} />
              <Route path="/statistics" element={<StatPage />} />
              <Route path="/api" element={<ApiPage />} />
              <Route path="/tutorial" element={<Tutorial />} />
              <Route path="/result" element={<ResultPage />} />
              <Route
                path="/result-new"
                element={<AgentResultLayout ResultView={ResultPageNew} allowMulti={false} allowSearch={false} />}
              />
              <Route path="/resultpage" element={<ResultPage2 />} />
              <Route
                path="/result-new2"
                element={<AgentResultLayout ResultView={ResultPageNew2} allowMulti={false} allowSearch={true} showFloatingSearchBar={true} />}
              />
              <Route path="/usecases" element={<UsecasesPage />} />
              <Route path="/docs/*" element={<DocPage />} />
              <Route path="/match" element={<MatchPage />} />
              <Route path="/review/*" element={<ReviewPage />} />
              <Route path="/agent-landing" element={<Navigate to="/" replace />} />
              <Route path="/result2" element={<ResultPage2 />} />
              <Route path="/old-landing" element={<LandingPage />} />
              <Route path="/" element={<AgentLandingPage />} />
              <Route
                path="/debug"
                element={isDevelopmentStage ? <DebugPage /> : <Navigate to="/old-landing" replace />}
              />
              <Route path="/igv" element={<IgvPage />} />
              <Route path="/agent-result" element={<AgentResultLayout ResultView={ResultPageNew2} allowMulti={false} allowSearch={true} showFloatingSearchBar={true} />} />
              <Route path="*" element={<AgentLandingPage />} />
            </Routes>
          </div>
          <PkbFooter />
        </div>
      </BrowserRouter>

    </Container>
  </Provider>
);
