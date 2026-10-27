import React, { useId, useState } from 'react';
import { Collapse, IconButton } from '@mui/material';
import { getContrastingColor, legendSchema } from '../components/style';
import chevron from '../image/graph-toolbar/legend-chevron.svg';
import './GraphLegend.css';

export default function GraphLegend({ defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [bodyVisible, setBodyVisible] = useState(defaultOpen);
  const id = useId();
  return <aside className={`graph-legend${open || bodyVisible ? ' is-wide' : ''}`} aria-label="Graph legend">
    {/* Keep the target width throughout the height animation, including exit.
        Measuring auto-height while also animating width makes chips reflow. */}
    <Collapse id={id} in={open} timeout={180} onExited={() => setBodyVisible(false)}>
      <div className="graph-legend-body">
        <div className="graph-legend-levels"><span><i />Core Nodes</span><span><i className="is-neighbor" />Neighbor</span></div>
        <div className="graph-legend-items">{legendSchema.map(({ label, color }) =>
          <span key={label} style={{ backgroundColor: color || 'white', color: getContrastingColor(color) || 'black' }}>{label}</span>
        )}</div>
      </div>
    </Collapse>
    <div className="graph-legend-heading"><span>Legend</span>
      <IconButton aria-label={open ? 'Collapse legend' : 'Expand legend'} aria-expanded={open} aria-controls={id}
        onClick={() => { if (!open) setBodyVisible(true); setOpen(value => !value); }}>
        <span className="graph-legend-chevron"><img src={chevron} alt="" style={{ transform: open ? 'rotate(-90deg)' : 'none' }} /></span>
      </IconButton>
    </div>
  </aside>;
}
