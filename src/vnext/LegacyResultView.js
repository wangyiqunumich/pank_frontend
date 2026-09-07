import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useProjectedResult } from './ResultView';
import { templateRequest } from './contracts';
import { legacyPresentationData } from './legacyResultData';
import LegacyResultPresentation from './LegacyResultPresentation';

export default function LegacyConventionalResultView() {
  const location = useLocation();
  const search = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const payload = useMemo(() => { try { return templateRequest(search); } catch (_) { return null; } }, [search]);
  const [result, error] = useProjectedResult(payload);
  const { hoverId, hoverState } = useSelector((state) => state.hover);
  const data = useMemo(() => legacyPresentationData(result, search, { hoverId, hoverState }), [result, search, hoverId, hoverState]);
  return <LegacyResultPresentation data={data} interactionResultId={result?.result_id} error={error || (!payload ? 'This search is unavailable in the isolated demo.' : '')} />;
}
