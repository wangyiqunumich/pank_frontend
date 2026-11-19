import React from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import {RecordFooter} from './ProductionRecord';
import {useTableDownload} from './TableDownloadControls';
import {sourcePageUrl} from './tableDownloads';

export default function EvidenceTableCard({card, table, schema, filters, records, sets, pageIndex, onPrevious,
  onNext, hasNext, busy, error, controls, children}) {
  const {state, sources, start, cancel, wording} = useTableDownload({card, table, schema, filters, records, sets});
  const links = new Map(sources.map(source => [source.href, `${source.kind === 'library' ? 'Data Library' : 'Source'}: ${source.title}`]));
  for (const row of [...records, ...Object.values(sets || {})]) {
    const href = sourcePageUrl({href: row.data_source_url}, schema);
    if (href && !links.has(href)) links.set(href, row.data_source || 'Source page');
  }
  for (const link of table.pipeline_links || []) {
    const href = sourcePageUrl(link, schema);
    if (href && !links.has(href)) links.set(href, link.label);
  }
  const provenance = new Map();
  for (const {data_source, data_version, license, license_url} of records) {
    if (data_source || data_version || license) {
      const item = {data_source, data_version, license, license_url};
      provenance.set(JSON.stringify(item), item);
    }
  }
  const paginated = pageIndex > 0 || hasNext;

  return <section className="xe-evidence">
    <header className="xe-evidence-heading">
      {table.methodLabel && <p className="xe-small">{table.methodLabel}</p>}
      <h3>{table.title}</h3>
      {table.comparison === 'cell_type' && <p className="xe-small">Within each condition · positive log₂ FC means higher in the selected cell type.</p>}
      {table.comparison === 'disease' && <p className="xe-small">Positive log₂ FC means higher in the first condition than its reference.</p>}
    </header>
    {controls}
    <div className="xe-evidence-card" aria-busy={busy || undefined}>
      {children}
      {(records.length > 0 || paginated || busy || error) && <div className="xe-evidence-toolbar">
        <span className="xe-small">{busy ? 'Loading…' : records.length > 0 ? `${records.length} ${records.length === 1 ? 'row' : 'rows'}` : ''}</span>
        <div className="xe-evidence-actions">
          {paginated && <div className="xe-evidence-pager" aria-label="Table pages">
            <button type="button" aria-label="Previous page" onClick={onPrevious} disabled={pageIndex === 0 || busy}><ChevronLeftIcon fontSize="small" /></button>
            <span>Page {pageIndex + 1}</span>
            <button type="button" aria-label="Next page" onClick={onNext} disabled={!hasNext || busy}><ChevronRightIcon fontSize="small" /></button>
          </div>}
          {records.length > 0 && <button type="button" aria-label={wording.table || 'Download table (CSV)'} onClick={start} disabled={busy || state.busy}>
            <DownloadOutlinedIcon fontSize="small" />{state.busy ? 'Preparing…' : 'Download CSV'}
          </button>}
          {state.busy && <button type="button" onClick={cancel}>Cancel</button>}
        </div>
      </div>}
      {error && <p className="xe-evidence-message" role="alert">{error}</p>}
      {state.ready && <p className="xe-evidence-message" role="status">CSV ready · {state.rows} rows</p>}
      {state.error && <p className="xe-evidence-message" role="alert">{state.error}</p>}
      {(links.size > 0 || provenance.size > 0) && records.length > 0 && <div className="xe-evidence-sources">
        {[...provenance].map(([key, item]) => <RecordFooter key={key} provenance={item} schema={schema} showSourceLink={false} />)}
        {links.size > 0 && <div className="xe-evidence-source-links">
          {[...links].map(([href, label]) => <a key={href} href={href} target="_blank" rel="noopener noreferrer">{label} ↗</a>)}
        </div>}
      </div>}
    </div>
  </section>;
}
