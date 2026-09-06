import './index.css';

import React from 'react';

import ReactDOM from 'react-dom/client';
import { AuthContext } from 'react-oidc-context';
import { BASE_PATH } from './vnext/api';
import { ErrorComponent } from './components/IntermediatePage';
import { Provider } from 'react-redux';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import { Container } from '@mui/material';

import AgentLandingPage from './components/AgentLandingPage';


import IntermediatePage from './components/IntermediatePage';
import LandingPage from './components/LandingPage';
import MatchPage from './components/MatchPage';
import PkbFooter from './Footer/footer';
import NavBar from './NavBar';
import DocPage from './pages/DocPage';
import Ontology from './pages/Ontology';
import Pipeline from './pages/Pipeline';
import QTLDataSource from './pages/QTL_data_source';


import StatPage from './pages/StatPage';
import Tutorial from './pages/Tutorial';
import UsecasesPage from './pages/UsecasePage';
import { store } from './redux/store';
import ResultPage from './vnext/LegacyResultView';
import { AgentResultLayout } from './SearchResult/AgentResult';
import { ConventionalResultView as ResultPageNew } from './vnext/ResultView';
import ResultPageNew2 from './vnext/ResultView';





const demoAuth = { isAuthenticated: false, isLoading: false, user: null, signinRedirect: async () => {}, removeUser: async () => {} };
const Unavailable = () => <ErrorComponent errorTitle="Unavailable in this demo" errorMessage="This tool is outside the isolated regular-graph demonstration." />;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthContext.Provider value={demoAuth}>
    <Provider store={store}>
      <Container disableGutters maxWidth={false} sx={{
        padding: 0, margin: 0, minHeight: '100vh',
        display: 'flex', flexDirection: 'column'
      }}>
        <BrowserRouter basename={BASE_PATH}>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <NavBar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Routes>
                <Route path="/pipeline" element={<Pipeline />} />
                <Route path="/qtldatasource" element={<QTLDataSource />} />
                <Route path="/intermediate" element={<IntermediatePage />} />
                <Route path="/ontology" element={<Ontology />} />
                <Route path="/statistics" element={<StatPage />} />
                {/* <Route path="/api" element={<ApiPage />} /> */}
                <Route path="/tutorial" element={<Tutorial />} />
                <Route path="/result" element={<ResultPage />} />
                <Route
                  path="/result-new"
                  element={<AgentResultLayout ResultView={ResultPageNew} allowSearch={false} />}
                />
                <Route
                  path="/result-new2"
                  element={<AgentResultLayout ResultView={ResultPageNew2} allowSearch={true} showFloatingSearchBar={true} />}
                />
                <Route path="/usecases" element={<UsecasesPage />} />
                <Route path="/docs/*" element={<DocPage />} />
                <Route path="/match" element={<MatchPage />} />
                <Route path="/review/*" element={<Unavailable />} />
                <Route path="/skills" element={<Unavailable />} />
                <Route path="/qtl-explorer" element={<Unavailable />} />
                <Route path="/gwas-explorer" element={<Unavailable />} />
                <Route path="/functional-data" element={<Unavailable />} />
                <Route path="/hirn-literature" element={<Unavailable />} />
                <Route path="/agent-landing" element={<Navigate to="/" replace />} />
                <Route path="/old-landing" element={<LandingPage />} />
                <Route path="/callback" element={<AgentLandingPage />} />
                <Route path="/" element={<AgentLandingPage />} />
                <Route
                  path="/debug"
                  element={<Unavailable />}
                />
                <Route path="/igv" element={<Unavailable />} />
                <Route path="*" element={<AgentLandingPage />} />
              </Routes>
            </div>
            <PkbFooter />
          </div>
        </BrowserRouter>

      </Container>
    </Provider>
  </AuthContext.Provider>
);
