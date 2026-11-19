import React, {useContext, useEffect, useMemo, useState} from 'react';
import {EvidenceRequestContext} from './api';
import {collectTable} from './tableDownloads';

const matrixFields = [
  'map_id', 'condition', 'treatment', 'source', 'target', 'specificity_rank', 'lr_means', 'selection_status',
  'n_donors_sig', 'n_donors_celltypes_ok',
];
const pair = row => `${row.source} → ${row.target}`;
const stratum = row => [row.map_id, row.condition, row.treatment === 'no_treatment' ? 'Untreated' : row.treatment].filter(Boolean).join(' · ');
const number = value => value == null || value === '' ? NaN : Number(value);
const format = value => Number.isFinite(value) ? Number(value.toPrecision(4)).toString() : 'Unavailable';

export function useCccContexts(card, table, schema) {
  const viewer = useContext(EvidenceRequestContext);
  const fields = table?.all_fields || schema.tables?.[table?.id]?.all_fields;
  const [state, setState] = useState(null);
  useEffect(() => {
    if (!table || !fields) return undefined;
    const controller = new AbortController();
    collectTable(viewer, {
      ref: card.ref, table_id: table.id, filters: {},
      fields: matrixFields.filter(field => fields.includes(field)),
    }, controller.signal).then(result => {
      if (!controller.signal.aborted) setState({table, records: result.records});
    }).catch(error => {
      if (!controller.signal.aborted) setState({table, error: error.message});
    });
    return () => controller.abort();
  }, [viewer, card.ref, table, fields]);
  return state && state.table === table ? state : null;
}

export function CccSummary({state, ligand, receptor}) {
  if (!state) return <p role="status">Loading sender → receiver contexts…</p>;
  if (state.error) return <p role="alert">Cell–cell contexts unavailable. {state.error}</p>;
  const supported = new Map();
  for (const row of state.records) {
    if (row.selection_status !== 'supporting') continue;
    const group = stratum(row);
    if (!supported.has(group)) supported.set(group, new Set());
    supported.get(group).add(pair(row));
  }
  if (!supported.size) return <p>No supporting sender → receiver context returned.</p>;
  return <div>
    <p><strong>{ligand} → {receptor}</strong> is a computationally inferred CCC interaction supported in these sender → receiver contexts.</p>
    <ul>{[...supported].map(([group, pairs]) => <li key={group}>
      {group && <strong>{group} </strong>}{[...pairs].join(', ')}
    </li>)}</ul>
  </div>;
}

export function CccDotMatrix({state}) {
  const groups = useMemo(() => {
    const groups = new Map();
    for (const row of state?.records || []) {
      const key = stratum(row);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    return groups;
  }, [state]);
  if (!groups.size) return null;
  const means = state.records.map(row => number(row.lr_means)).filter(Number.isFinite);
  const min = Math.min(...means), max = Math.max(...means);
  return <section className="xe-ccc-matrix" aria-label="Cell–cell context dot matrix">
    <h3>Cell–cell context dot matrix</h3>
    <p className="xe-small">Larger dots indicate lower specificity rank. {means.length > 0 && <>Darker dots indicate higher ligand–receptor mean ({format(min)}–{format(max)} in this view). </>} An outlined dot supports the graph edge.</p>
    {[...groups].map(([group, rows]) => <section key={group}>
      {group && <h4>{group}</h4>}
      <div className="xe-table-scroll">
        <table aria-label={`Sender and receiver pairs ${group}`}>
          <thead><tr>{rows.map((row, i) => <th key={i} scope="col">
            {row.source}<span>↓ {row.target}</span>
          </th>)}</tr></thead>
          <tbody><tr>{rows.map((row, i) => {
            const rank = number(row.specificity_rank), mean = number(row.lr_means);
            const diameter = rank >= 0 && rank <= 1 ? 9 + 19 * Math.sqrt(-Math.log10(Math.max(1e-12, rank)) / 12) : 9;
            const intensity = !Number.isFinite(mean) || min === max ? 0.5 : (mean - min) / (max - min);
            const supported = row.selection_status === 'supporting';
            const label = `${pair(row)} · specificity rank ${row.specificity_rank ?? 'unavailable'} · ligand–receptor mean ${row.lr_means ?? 'unavailable'} · ${row.n_donors_sig ?? '?'} / ${row.n_donors_celltypes_ok ?? '?'} significant / eligible donors${supported ? ' · supports the edge' : ''}`;
            return <td key={i}><span className="xe-ccc-mark" tabIndex={0} title={label} aria-label={label}
              role="img" data-support={supported} data-missing={!Number.isFinite(mean)}
              style={{'--dot-size':`${diameter}px`, '--dot-color-weight':`${28 + 72 * intensity}%`}} /></td>;
          })}</tr></tbody>
        </table>
      </div>
    </section>)}
  </section>;
}
