import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import GraphInfoPanel, { GraphInfoPanelBody, GraphInfoPanelHeader } from '../vnext/GraphInfoPanel';
import { bundled as graphPanelSchema } from '../vnext/evidence/panelSchema';
import functionalSchema from '../schema/functional_browser_schema.json';
import { buildCohortPlot, nearestCohortTrace } from './functionalCohortGeometry';
import './FunctionalCohortPlot.css';

const formatValue = value => typeof value === 'number'
  ? value.toLocaleString('en-US', { maximumSignificantDigits: 4 }) : String(value);
const EMPTY_DONORS = [];

export default function FunctionalCohortPlot({ data, donors = EMPTY_DONORS, metadataLoading = false, metadataError = '', schema = functionalSchema }) {
  const config = schema.cohort_traces;
  const panelConfig = config.hover_panel;
  const panelSchema = useMemo(() => ({ panel_presentation: {
    ...graphPanelSchema,
    surface: { ...graphPanelSchema.surface, compact_width_px: panelConfig.width_px },
  } }), [panelConfig.width_px]);
  const hostRef = useRef(null), svgRef = useRef(null), panelRef = useRef(null);
  const hideTimer = useRef(null), hoverFrame = useRef(null);
  const [width, setWidth] = useState(720);
  const height = Math.max(280, width / 2);
  const plot = useMemo(() => buildCohortPlot(data, width, height), [data, width, height]);
  const donorById = useMemo(() => new Map(donors.map(donor => [donor.donor_id, donor])), [donors]);
  const [hover, setHover] = useState(null);
  const [position, setPosition] = useState({ x: 12, y: 12 });
  const panelId = useId();
  const keepOpen = () => clearTimeout(hideTimer.current);
  const close = useCallback(() => {
    clearTimeout(hideTimer.current);
    cancelAnimationFrame(hoverFrame.current);
    hoverFrame.current = null;
    setHover(null);
  }, []);
  const leave = event => {
    if (event.pointerType === 'touch') return;
    cancelAnimationFrame(hoverFrame.current);
    hoverFrame.current = null;
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setHover(null), 240);
  };

  useLayoutEffect(() => {
    const element = hostRef.current;
    const measure = () => {
      const measured = element.getBoundingClientRect().width;
      if (measured > 0) setWidth(measured);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  useEffect(() => {
    const dismiss = event => {
      if (event.target instanceof Node && panelRef.current?.contains(event.target)) return;
      if (event.type === 'pointerdown' && event.target instanceof Node && hostRef.current?.contains(event.target)) return;
      close();
    };
    const keydown = event => { if (event.key === 'Escape') close(); };
    window.addEventListener('pointerdown', dismiss);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('blur', dismiss);
    window.addEventListener('keydown', keydown);
    return () => {
      window.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('blur', dismiss);
      window.removeEventListener('keydown', keydown);
      clearTimeout(hideTimer.current);
      cancelAnimationFrame(hoverFrame.current);
    };
  }, [close]);

  useEffect(() => { close(); }, [close, data, width]);

  useLayoutEffect(() => {
    if (!hover || !panelRef.current) return;
    const panel = panelRef.current.getBoundingClientRect();
    const panelWidth = Math.min(panelConfig.width_px, window.innerWidth - 24);
    const panelHeight = Math.min(panel.height, window.innerHeight - 24);
    const x = hover.clientX + 16 + panelWidth <= window.innerWidth - 12
      ? hover.clientX + 16 : hover.clientX - panelWidth - 16;
    const y = hover.clientY + 16 + panelHeight <= window.innerHeight - 12
      ? hover.clientY + 16 : hover.clientY - panelHeight - 16;
    setPosition({
      x: Math.max(12, Math.min(x, window.innerWidth - panelWidth - 12)),
      y: Math.max(12, Math.min(y, window.innerHeight - panelHeight - 12)),
    });
  }, [hover, panelConfig.width_px, metadataLoading, metadataError, donorById]);

  const inspect = event => {
    keepOpen();
    cancelAnimationFrame(hoverFrame.current);
    const { clientX, clientY } = event;
    hoverFrame.current = requestAnimationFrame(() => {
      hoverFrame.current = null;
      const box = svgRef.current.getBoundingClientRect();
      const nearest = nearestCohortTrace(plot.curves, (clientX - box.left) * width / box.width, (clientY - box.top) * height / box.height);
      if (nearest) setHover({ ...nearest, clientX, clientY });
      else hideTimer.current = setTimeout(() => setHover(null), 160);
    });
  };
  const inspectKey = event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) || !plot.curves.length) return;
    event.preventDefault();
    keepOpen();
    const index = plot.curves.findIndex(curve => curve.id === hover?.curve.id);
    const delta = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
    const nextIndex = index < 0 ? (delta > 0 ? 0 : plot.curves.length - 1) : (index + delta + plot.curves.length) % plot.curves.length;
    const curve = plot.curves[nextIndex];
    const sample = curve.points.find(Boolean);
    const box = svgRef.current.getBoundingClientRect();
    setHover({ curve, sample, clientX: box.left + sample.x * box.width / width, clientY: box.top + sample.y * box.height / height });
  };
  const metadata = hover && {
    ...donorById.get(hover.curve.id),
    donor_id: hover.curve.id,
    time_minutes: hover.sample.time,
    response_value: hover.sample.value,
    response_label: data.y_label,
  };
  const title = metadata && panelConfig.title_fields.map(key => metadata[key]).find(value => value !== null && value !== undefined && value !== '');

  return <div ref={hostRef} className="functional-cohort-plot" style={{ height }}>
    {!plot.curves.length ? <p role="status">{config.empty_message}</p> : <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} role="img"
      aria-label={`${data.y_label}. ${plot.curves.length} donor traces. Use arrow keys to inspect donors.`}
      tabIndex={0} onKeyDown={inspectKey} aria-describedby={hover ? panelId : undefined}>
      <g className="functional-cohort-stimuli" aria-hidden="true">{plot.stimuli.map(({ start, end, label, index }) => <g key={index}>
        {index % 2 === 1 && <rect x={start} y={plot.top} width={Math.max(0, end - start)} height={plot.bottom - plot.top} />}
        <text x={start + (end - start) / 2} y={plot.top - 12} transform={`rotate(${width < 480 ? -65 : -35}, ${start + (end - start) / 2}, ${plot.top - 12})`}>{label}</text>
      </g>)}</g>
      <g className="functional-cohort-axes" aria-hidden="true">
        {plot.yTicks.map(tick => <g key={tick.value}><line x1={plot.left} x2={plot.right} y1={tick.position} y2={tick.position} />
          <text x={plot.left - 9} y={tick.position + 3} textAnchor="end">{tick.label}</text></g>)}
        {plot.xTicks.map(tick => <g key={tick.value}><line x1={tick.position} x2={tick.position} y1={plot.bottom} y2={plot.bottom + 4} />
          <text x={tick.position} y={plot.bottom + 18} textAnchor="middle">{tick.label}</text></g>)}
        <path d={`M${plot.left},${plot.top}V${plot.bottom}H${plot.right}`} />
        <text x={(plot.left + plot.right) / 2} y={height - 7} textAnchor="middle" className="functional-cohort-axis-title">{config.x_label}</text>
        <text transform={`translate(17, ${(plot.top + plot.bottom) / 2}) rotate(-90)`} textAnchor="middle" className="functional-cohort-axis-title">{data.y_label}</text>
      </g>
      <g className="functional-cohort-lines" aria-hidden="true">
        {plot.curves.map(curve => <path key={curve.id} data-donor-id={curve.id} d={curve.path} />)}
        <path className="functional-cohort-mean" d={plot.meanPath} />
        {hover && <><path className="functional-cohort-selected" d={hover.curve.path} />
          <circle className="functional-cohort-point" cx={hover.sample.x} cy={hover.sample.y} r={3} /></>}
      </g>
      <rect className="functional-cohort-hit-area" x={plot.left} y={plot.top} width={plot.right - plot.left} height={plot.bottom - plot.top}
        onPointerMove={inspect} onPointerDown={inspect} onPointerLeave={leave} />
    </svg>}
    <GraphInfoPanel label="Functional donor information" panelRef={panelRef} visible={Boolean(hover)} mode="hover" schema={panelSchema}
      position={position} onEnter={keepOpen} onLeave={leave}>
      {metadata && <>
        <GraphInfoPanelHeader title={String(title)}>{title}</GraphInfoPanelHeader>
        <GraphInfoPanelBody><dl className="functional-cohort-metadata" id={panelId}>
          {panelConfig.columns.map(column => {
            const value = metadata[column.key];
            const missing = value === undefined || value === null || value === '';
            return <div key={column.key} data-field={column.key}>
              <dt>{metadata[column.label_key] || column.label}</dt>
              <dd>{missing ? (metadataLoading ? 'Loading…' : panelConfig.missing_value) : `${formatValue(value)}${column.unit ? ` ${column.unit}` : ''}`}</dd>
            </div>;
          })}
        </dl>{metadataError && <p className="functional-cohort-metadata-error" role="status">Donor metadata could not be loaded.</p>}</GraphInfoPanelBody>
      </>}
    </GraphInfoPanel>
  </div>;
}
