import React from 'react';
import GraphToolbar from './GraphToolbar';
import './browserChrome.css';
// The React modules use the actual graph control component, including its icons,
// keyboard focus, compact/expanded state and measured short-pane layout.
export default function BrowserToolbar({ onInfo, infoEnabled, infoLabel='Plot info', onReset, ...props }) {
  return <GraphToolbar {...props} browser hoverEnabled={infoEnabled} onHover={onInfo} infoLabel={infoLabel} resetLabel="Reset view" downloadLabel="Download plot" onReset={onReset || props.onFit} />;
}
