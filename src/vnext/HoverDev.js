import React, { useRef, useState } from 'react';
import { Box, Container, Typography } from '@mui/material';
import KnowledgeGraph from './KnowledgeGraph';
import { useViewerService } from './evidence/viewerService';
import fixture from './hoverDevGraph.json';

const ref = (kind, record) => ({kind, type_id: record.type, id: record.id});
const graph = {
  nodes: fixture.nodes.map(node => ({
    '~id': node.id, '~labels': node.labels, '~properties': {id: node.id, name: node.label},
    ref: ref('node', node),
  })),
  edges: fixture.edges.map(edge => ({
    '~id': edge.id, '~type': edge.type.split('__')[0], '~start': edge.source, '~end': edge.target,
    ref: ref('edge', edge),
  })),
};
const positions = Object.fromEntries(fixture.nodes.map(({id, x, y}) => [id, {x, y}]));
const groups = [
  ['Nodes', fixture.nodes.filter(node => node.example)],
  ['Relationships', fixture.edges],
];

export default function HoverDev() {
  const service = useViewerService(fixture.release, true);
  const picker = useRef(null);
  const [selection, setSelection] = useState(null);
  const chooseRecord = (event) => {
    setSelection({id: event.target.value, onClose: () => {
      setSelection(null);
      requestAnimationFrame(() => picker.current?.focus({preventScroll: true}));
    }});
  };
  return <Container component="main" maxWidth="xl" sx={{py: 4}}>
    <Typography variant="h4" component="h1">What evidence can I inspect in PanKgraph?</Typography>
    <Typography sx={{mt: 1, mb: 2}}>Hover over a node or relationship, or open a record by type.</Typography>
    <Box component="label" sx={{display: 'block', mb: 2}}>Open a record{' '}
      <select ref={picker} aria-label="Open a record by type" value={selection?.id || ''} disabled={!service?.schema}
        style={{maxWidth: '100%'}} onChange={chooseRecord}>
        <option value="" disabled>Select a node or relationship type</option>
        {groups.map(([title, records]) => <optgroup key={title} label={title}>
          {records.map(record => <option key={record.id} value={record.id}>{record.type.split('__').join(' · ')}</option>)}
        </optgroup>)}
      </select>
    </Box>
    {!service?.schema && <p role="status">{service?.loading ? 'Loading evidence schema…' : 'Evidence service unavailable. Reload to retry.'}</p>}
    <KnowledgeGraph graphData={graph} coordData={positions} releaseId={fixture.release}
      evidenceService={service} inspectSelection={selection} prefetchEvidence={false} containerHeight="68vh" />
  </Container>;
}
