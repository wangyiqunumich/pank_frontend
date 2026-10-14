import React, { useRef, useState } from 'react';
import { CircularProgress } from '@mui/material';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { sitePath } from './api';
import schema from './schema/result_page_schema.json';
import './SourceData.css';

// Zhiyuan's atlas handoff, 138cac4. The schema/resolver own files and labels.
const config = schema.ai_summary.insertions.raw_data_download.file_table;
const interpolate = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
function SourceData({ insertion }) {
  const links = insertion.links || [];
  const [states, setStates] = useState({});
  const [bulk, setBulk] = useState(false);
  const [notice, setNotice] = useState('');
  const active = useRef(new Set());
  const change = (id, value) => setStates(previous => ({ ...previous, [id]: value }));
  const download = async link => {
    if (active.current.has(link.id)) return false;
    active.current.add(link.id);
    change(link.id, 'progress');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeout_ms);
    try {
      const response = await fetch(sitePath(link.url), { credentials: 'same-origin', signal: controller.signal });
      const media = (response.headers.get('Content-Type') || '').split(';')[0].trim();
      if (!response.ok || !config.response_media_types.includes(media)) throw new Error('Download unavailable');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = link.filename || config.fallback_filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), config.object_url_lifetime_ms);
      change(link.id, 'done');
      setNotice(interpolate(config.labels.ready_notice, { name: link.filename || link.label }));
      return true;
    } catch (_) {
      change(link.id, 'error');
      setNotice(interpolate(config.labels.error_notice, { name: link.filename || link.label }));
      return false;
    } finally {
      clearTimeout(timer);
      active.current.delete(link.id);
    }
  };
  const downloadAll = async () => {
    setBulk(true);
    for (let i = 0; i < links.length; i += 1) {
      setNotice(interpolate(config.labels.bulk_progress, { current: i + 1, count: links.length }));
      await download(links[i]);
    }
    setBulk(false);
  };
  const complete = links.length > 0 && links.every(link => states[link.id] === 'done');
  const busy = bulk || Object.values(states).includes('progress');
  return (
    <section className="pk-source" aria-label={insertion.title}>
      <div className="pk-source-head">
        <div className="pk-source-text"><h3>{insertion.title}</h3>
          {insertion.description && <p>{insertion.description}</p>}
        </div>
        {links.length >= config.bulk_min_files && <button className="pk-source-button pk-source-bulk" disabled={busy} onClick={downloadAll}>
          <DownloadRoundedIcon />{bulk ? config.labels.progress : complete ? config.labels.bulk_done : interpolate(config.labels.bulk, { count: links.length })}
        </button>}
      </div>
      <div className="pk-source-table" role="table" aria-label={config.labels.table}>
        <div className="pk-source-columns" role="row">{config.columns.map(column => <span key={column} role="columnheader">{column}</span>)}</div>
        {links.map(link => {
          const state = states[link.id];
          const name = link.filename || link.label;
          const description = link.contextLabel || link.description;
          return <div className="pk-source-row" role="row" key={link.id}>
            <div className="pk-source-file" role="cell"><span className="pk-source-name" title={name}>{name}</span>
              {description && <span className="pk-source-description" title={description}>{description}</span>}
              {state === 'error' && <span className="pk-source-error">{config.labels.error}</span>}
            </div>
            <div role="cell"><span className="pk-source-tag">{config.media_type_tags[link.mediaType] || config.fallback_tag}</span></div>
            <div role="cell"><button className={`pk-source-button pk-source-action${state === 'done' ? ' pk-source-done' : ''}`} onClick={() => download(link)} disabled={busy}
              aria-label={interpolate(config.labels.download_accessible, { name })} title={state === 'done' ? config.labels.again : interpolate(config.labels.download_accessible, { name })}>
              {state === 'progress' ? <CircularProgress size={14} /> : state === 'done' ? <CheckRoundedIcon /> : <DownloadRoundedIcon />}
              <span>{config.labels[state === 'error' ? 'retry' : state || 'idle']}</span>
            </button></div>
          </div>;
        })}
      </div>
      <span className="pk-source-announcement" role="status" aria-live="polite">{notice}</span>
    </section>
  );
}

export default function SummaryInsertions({ insertions = [] }) {
  return insertions.map(insertion => <SourceData key={`${insertion.id}:${(insertion.links || []).map(link => link.url).join('|')}`} insertion={insertion} />);
}
