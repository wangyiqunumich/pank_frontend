import React from 'react';
import { useLocation } from 'react-router-dom';
import { AgentResultLayout } from '../SearchResult/AgentResult';
import { ConventionalResultView } from './ResultView';
import { getDevConfig } from './runtimeConfig';

export default function ConventionalRoute({ children }) {
  const params = new URLSearchParams(useLocation().search);
  return getDevConfig().vnextEnabled || params.get('provider') === 'vnext' || params.has('result_id')
    ? <AgentResultLayout ResultView={ConventionalResultView} allowSearch={false} /> : children;
}
