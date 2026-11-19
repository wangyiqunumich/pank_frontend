import React from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import {RecordFooter} from './ProductionRecord';
import {useTableDownload} from './TableDownloadControls';
import {sourcePageUrl} from './tableDownloads';

export default function EvidenceTableCard({card, table, schema, display, filters, records, recordCount, sets, pageIndex, onPrevious,
  onNext, hasNext, onRetry, versionsInRows, busy, error, controls, children}) {
  const {state, sources, start, cancel} = useTableDownload({card, table, schema, filters, records, sets});
  const links = new Map(sources.map(source => {
    const label = source.kind === 'library' ? 'Data Library' : 'Source page';
    return [source.href, source.title === 'Source page' ? label : `${source.kind === 'library' ? 'Data Library' : 'Source'}: ${source.title}`];
  }));
  for (const row of [...records, ...Object.values(sets || {})]) {
    const href = sourcePageUrl({href: row.data_source_url}, schema);
    if (href && !links.has(href)) links.set(href, display.value('data_source',row.data_source) || 'Source page');
  }
  for (const link of table.pipeline_links || []) {
    const href = sourcePageUrl(link, schema);
    if (href && !links.has(href)) links.set(href, link.label);
  }
  const provenance = records.map(({data_source, data_version, license, license_url}) =>
    display.provenance({data_source, data_version:versionsInRows ? undefined : data_version, license, license_url}));
  const paginated = pageIndex > 0 || hasNext;
  const count = state.ready ? state.rows : recordCount;
  const downloadLabel = count === undefined ? 'Download all records'
    : `Download ${count.toLocaleString('en-US')} ${count === 1 ? 'record' : 'records'}`;

  return <section className="xe-evidence">
    <div className="xe-evidence-card" aria-busy={busy || undefined}>
      <header className="xe-evidence-toolbar xe-evidence-table-toolbar">
        <div className="xe-evidence-heading">
          {table.methodLabel && <p className="xe-small">{table.methodLabel}</p>}
          <h3>{table.title}</h3>
          {table.comparison === 'cell_type' && <p className="xe-small">Within each condition, positive log₂ FC means higher in the selected cell type.</p>}
          {table.comparison === 'disease' && <p className="xe-small">Positive log₂ FC means higher in the first condition than its reference.</p>}
        </div>
        <div className="xe-evidence-actions">
          {busy && <span className="xe-small" role="status">Loading…</span>}
          {records.length > 0 && <button className="xe-evidence-download" type="button" title="Download CSV" onClick={start} disabled={busy || state.busy}>
            <DownloadOutlinedIcon fontSize="small" />{state.busy ? 'Preparing…' : downloadLabel}
          </button>}
          {state.busy && <button type="button" onClick={cancel}>Cancel</button>}
        </div>
      </header>
      <div className="xe-evidence-controls">{controls}</div>
      {paginated && <nav className="xe-evidence-pager" aria-label={`${table.title} pages`}>
        <button type="button" aria-label="Previous page" onClick={onPrevious} disabled={pageIndex === 0 || busy}><ChevronLeftIcon fontSize="small" /></button>
        <span>Page {pageIndex + 1}</span>
        <button type="button" aria-label="Next page" onClick={onNext} disabled={!hasNext || busy}><ChevronRightIcon fontSize="small" /></button>
      </nav>}
      {children}
      {error && <div className="xe-evidence-error">
        <p className="xe-evidence-message" role="alert">{error}</p>
        <button type="button" onClick={onRetry}>Retry</button>
      </div>}
      {state.ready && <p className="xe-evidence-message" role="status">CSV ready</p>}
      {state.error && <p className="xe-evidence-message" role="alert">{state.error}</p>}
      {records.length > 0 && <RecordFooter className="xe-evidence-sources" provenance={provenance} schema={schema} sourceLinks={links} />}
    </div>
  </section>;
}
