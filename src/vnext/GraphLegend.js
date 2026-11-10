import React, { useId, useState } from 'react';
import { ButtonBase } from '@mui/material';
import { getContrastingColor, legendSchema } from '../components/style';
import chevron from '../image/graph-toolbar/legend-chevron.svg';
import './GraphLegend.css';

export default function GraphLegend({ defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return <aside className={`graph-legend${open ? ' is-open' : ''}`} aria-label="Graph legend">
    <div className="graph-legend-surface">
      <div className="graph-legend-body" id={id} aria-hidden={!open}>
        <div className="graph-legend-clip">
          <div className="graph-legend-content">
            <div className="graph-legend-levels"><span><i />Core Nodes</span><span><i className="is-neighbor" />Neighbor</span></div>
            <div className="graph-legend-items">{legendSchema.map(({ label, color }) =>
              <span key={label} style={{ backgroundColor: color || 'white', color: getContrastingColor(color) || 'black' }}>{label}</span>
            )}</div>
          </div>
        </div>
      </div>
      <ButtonBase className="graph-legend-heading" aria-label={open ? 'Collapse legend' : 'Expand legend'} aria-expanded={open} aria-controls={id}
        onClick={() => setOpen(value => !value)}>
        <span>Legend</span>
        <span className="graph-legend-chevron"><img src={chevron} alt="" /></span>
      </ButtonBase>
    </div>
  </aside>;
}
