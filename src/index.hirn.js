import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import { BrowserRouter } from 'react-router-dom';

import HIRNLiteraturePage from './skills/HIRNLiteraturePage';

const runtimeOrigin = window.location.origin;
const authConfig = {
  authority: process.env.REACT_APP_COGNITO_AUTHORITY || 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_yUEKWJIVn',
  client_id: process.env.REACT_APP_COGNITO_CLIENT_ID || '7anmab22h1r3968o5tinp682kj',
  redirect_uri: process.env.REACT_APP_COGNITO_REDIRECT_URI || `${runtimeOrigin}/callback`,
  response_type: 'code',
  scope: process.env.REACT_APP_COGNITO_SCOPE || 'email openid phone',
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider {...authConfig}>
    <BrowserRouter>
      <HIRNLiteraturePage />
    </BrowserRouter>
  </AuthProvider>,
);
