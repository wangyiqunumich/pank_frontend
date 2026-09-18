import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getDevConfig } from './runtimeConfig';
// Existing session URLs always retain their legacy handler. New v2 history has
// its own route, independent of the default-entry flag and rollback setting.
export const useVnextForNewQuestion = (search, enabled) => {
  const params = new URLSearchParams(search);
  return enabled === true && Boolean(params.get('question')) && !params.get('session_id');
};
export default function AgentRoute({ children }) {
  const location = useLocation();
  const search = useMemo(() => {
    const params = new URLSearchParams(location.search);
    if (!params.has('intent')) params.set('intent', window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    return params.toString();
  }, [location.key, location.search]);
  return useVnextForNewQuestion(location.search, getDevConfig().vnextEnabled)
    ? <Navigate to={`/agent-vnext?${search}`} replace /> : children;
}
