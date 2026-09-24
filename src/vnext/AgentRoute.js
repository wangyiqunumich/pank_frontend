import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AgentResultLayout } from '../SearchResult/AgentResult';
import AgentResultView from './ResultView';
import { getDevConfig } from './runtimeConfig';

// Explicit v2 identities remain readable even when new work is rolled back.
// Unversioned saved sessions always retain the legacy reader.
export const shouldUseVnextForNewQuestion = (search, enabled) => {
  const params = new URLSearchParams(search);
  return enabled === true && Boolean(params.get('question')) && !params.get('session_id');
};
export const shouldUseVnextAgent = (search, enabled) => {
  const params = new URLSearchParams(search);
  return params.get('provider') === 'vnext' || Boolean(params.get('run_id'))
    || shouldUseVnextForNewQuestion(search, enabled);
};
export default function AgentRoute({ children }) {
  const location = useLocation();
  const identity = useMemo(() => {
    const params = new URLSearchParams(location.search);
    if (!params.has('intent') && !params.has('run_id') && !params.has('session_id')) {
      params.set('intent', `${location.key}:${window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`);
    }
    return params.toString();
  }, [location.key, location.search]);
  if (!shouldUseVnextAgent(location.search, getDevConfig().vnextEnabled)) return children;
  if (identity !== location.search.replace(/^\?/, '')) return <Navigate to={`/result-new2?${identity}`} replace state={location.state} />;
  return <AgentResultLayout ResultView={AgentResultView} allowSearch showFloatingSearchBar questionCharacterLimit={6000} />;
}
