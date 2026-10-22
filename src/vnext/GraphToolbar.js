import React, { useRef, useState } from 'react';
import { ButtonBase, Tooltip } from '@mui/material';
import FullscreenExitRoundedIcon from '@mui/icons-material/FullscreenExitRounded';
import compactChevron from '../image/graph-toolbar/compact-chevron.svg';
import compactFullscreen from '../image/graph-toolbar/compact-fullscreen.svg';
import compactZoomIn from '../image/graph-toolbar/compact-zoom-in.svg';
import compactZoomOut from '../image/graph-toolbar/compact-zoom-out.svg';
import compactFit from '../image/graph-toolbar/compact-fit.svg';
import compactHover from '../image/graph-toolbar/compact-hover.svg';
import compactDownload from '../image/graph-toolbar/compact-download.svg';
import compactReset from '../image/graph-toolbar/compact-reset.svg';
import fullscreenIcon from '../image/graph-toolbar/expanded-fullscreen.svg';
import zoomIn from '../image/graph-toolbar/expanded-zoom-in.svg';
import zoomOut from '../image/graph-toolbar/expanded-zoom-out.svg';
import fit from '../image/graph-toolbar/expanded-fit.svg';
import hover from '../image/graph-toolbar/expanded-hover.svg';
import mode from '../image/graph-toolbar/expanded-mode.svg';
import chevron from '../image/graph-toolbar/expanded-chevron.svg';
import download from '../image/graph-toolbar/expanded-download.svg';
import downloadChevron from '../image/graph-toolbar/expanded-download-chevron.svg';
import reset from '../image/graph-toolbar/expanded-reset.svg';
import './GraphToolbar.css';

export default function GraphToolbar({ fullscreen, onFullscreen, zoomPercent, canZoomIn, canZoomOut, onZoomIn, onZoomOut, onFit, hoverEnabled, onHover, onDownload, onReset, modeLabel = 'KG mode' }) {
  const [expanded, setExpanded] = useState(false);
  const toolbarRef = useRef(null);
  // Native fullscreen dialogs live above body portals; keep tips in that layer.
  const tooltipProps = { placement: 'left', PopperProps: { container: () => toolbarRef.current?.closest('dialog') || document.body } };
  const actions = {
    fullscreen: { label: fullscreen ? 'Exit full screen' : 'Open in full screen', icon: fullscreenIcon, compact: compactFullscreen, onClick: onFullscreen },
    zoomIn: { label: 'Zoom in', icon: zoomIn, compact: compactZoomIn, onClick: onZoomIn, disabled: !canZoomIn, suffix: <span className="graph-toolbar-zoom">{zoomPercent}%</span> },
    zoomOut: { label: 'Zoom out', icon: zoomOut, compact: compactZoomOut, onClick: onZoomOut, disabled: !canZoomOut },
    fit: { label: 'Fit to view', icon: fit, compact: compactFit, onClick: onFit },
    hover: { label: 'Hover info', icon: hover, compact: compactHover, onClick: onHover, pressed: hoverEnabled, suffix: <span className={`graph-toolbar-switch${hoverEnabled ? ' is-on' : ''}`} aria-hidden="true"><span /></span> },
    download: { label: 'Download', icon: download, compact: compactDownload, onClick: onDownload, suffix: <img src={downloadChevron} alt="" /> },
    reset: { label: 'Reset graph', icon: reset, compact: compactReset, onClick: onReset },
  };
  const action = key => {
    const item = actions[key];
    return <Tooltip key={key} title={expanded ? '' : item.label} {...tooltipProps}><span className="graph-toolbar-action-wrapper">
      <ButtonBase className={`graph-toolbar-action${item.pressed ? ' is-active' : ''}`} aria-label={item.label} aria-pressed={item.pressed} disabled={item.disabled} onClick={item.onClick}>
        <span className="graph-toolbar-icon">{key === 'fullscreen' && fullscreen ? <FullscreenExitRoundedIcon sx={{ fontSize: expanded ? 14 : 16 }} /> : <img src={expanded ? item.icon : item.compact} alt="" />}</span>
        {expanded && <><span className="graph-toolbar-label">{item.label}</span>{item.suffix}</>}
      </ButtonBase>
    </span></Tooltip>;
  };
  return <div ref={toolbarRef} className={`graph-toolbar${expanded ? ' is-expanded' : ''}`} role="toolbar" aria-label="Graph controls" aria-orientation="vertical">
    <ButtonBase className="graph-toolbar-toggle" aria-label={expanded ? 'Collapse graph toolbar' : 'Expand graph toolbar'} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
      <img src={compactChevron} alt="" style={{ transform: expanded ? 'none' : 'scaleX(-1)' }} />
    </ButtonBase>
    {expanded ? <>
      <div className="graph-toolbar-section"><h3>View</h3>{['fullscreen', 'zoomIn', 'zoomOut', 'fit'].map(action)}</div>
      <div className="graph-toolbar-section"><h3>Graph</h3>{action('hover')}
        <Tooltip title="The saved graph determines its presentation mode." {...tooltipProps}><div className="graph-toolbar-mode"><span className="graph-toolbar-icon"><img src={mode} alt="" /></span><span className="graph-toolbar-label">Mode</span><span className="graph-toolbar-mode-value">{modeLabel}</span><img src={chevron} alt="" /></div></Tooltip>
      </div>
      <div className="graph-toolbar-section"><h3>Download &amp; reset</h3>{['download', 'reset'].map(action)}</div>
    </> : <><div className="graph-toolbar-divider" />{['fullscreen', 'zoomIn', 'zoomOut', 'fit', 'hover'].map(action)}<div className="graph-toolbar-divider" />{['download', 'reset'].map(action)}</>}
  </div>;
}
