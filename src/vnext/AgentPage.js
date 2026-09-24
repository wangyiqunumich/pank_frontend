import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

// Keep existing bookmarks, but use the site's original landing and result shell.
export default function AgentPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const hasInvestigation = ['run_id', 'session_id', 'question'].some(key => params.has(key));
  if (!hasInvestigation) return <Navigate to="/" replace />;
  params.set('provider', 'vnext');
  return <Navigate to={`/result-new2?${params}`} replace state={location.state} />;
}
