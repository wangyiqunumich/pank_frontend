import React, {useContext, useEffect, useMemo, useState} from 'react';
import {EvidenceRequestContext} from './api';
import {collectTable} from './tableDownloads';

const matrixFields = [
  'condition', 'treatment', 'source', 'target', 'ligand_complex', 'receptor_complex', 'specificity_rank', 'lr_means', 'selection_status',
  'n_donors_sig', 'n_donors_celltypes_ok',
];
const names = (row, display) => ['source','target'].map(key => display.value(key,row[key]) || 'Not recorded');
const stratum = (row, display) => ['condition','treatment'].map(key => display.value(key,row[key])).filter(Boolean).join(' · ');
const number = value => value == null || value === '' ? NaN : Number(value);
const format = value => Number.isFinite(value) ? Number(value.toPrecision(4)).toString() : 'Unavailable';
const missingContextFields = {error:'The evidence schema does not list context fields.'};

export function useCccContexts(card, table, schema, {request, supportingOnly = false} = {}) {
  const contextRequest = useContext(EvidenceRequestContext);
  const viewer = request || contextRequest;
  const fields = table?.all_fields || schema.tables?.[table?.id]?.all_fields;
  const [state, setState] = useState(null);
  useEffect(() => {
    if (!table || !fields) return undefined;
    const controller = new AbortController();
    collectTable(viewer, {
      ref: card.ref, table_id: table.id, filters: supportingOnly ? {selection_status: 'supporting'} : {},
      fields: matrixFields.filter(field => fields.includes(field)),
    }, controller.signal).then(result => {
      if (!controller.signal.aborted) setState({table, records: result.records});
    }).catch(error => {
      if (!controller.signal.aborted) setState({table, error: error.message});
    });
    return () => controller.abort();
  }, [viewer, card.ref, table, fields, supportingOnly]);
  if (table && !fields) return missingContextFields;
  return state && state.table === table ? state : null;
}

export function CccSummary({state, display, interaction, compact = false}) {
  if (!state) return <p role="status">Loading sender → receiver contexts…</p>;
  if (state.error) return <p role="alert">Cell–cell contexts unavailable. {state.error}</p>;
  const supported = new Map();
  for (const row of state.records) {
    if (row.selection_status !== 'supporting') continue;
    const group = stratum(row, display);
    if (!supported.has(group)) supported.set(group, new Set());
    supported.get(group).add(names(row, display).join(' → '));
  }
  if (!supported.size) return <p>No supporting sender → receiver context returned.</p>;
  return <div>
    {!compact && <p><strong>{interaction}</strong> is a computationally inferred CCC interaction supported in these sender → receiver contexts.</p>}
    <ul>{[...supported].map(([group, pairs]) => <li key={group}>
      {group && <><strong>{group}</strong>{compact ? ' ' : ': '}</>}{[...pairs].join(', ')}
    </li>)}</ul>
  </div>;
}

export function CccDotMatrix({state, display, endpoints}) {
  const groups = useMemo(() => {
    const groups = new Map();
    for (const row of state?.records || []) {
      const key = stratum(row, display);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    return groups;
  }, [state, display]);
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
          <thead><tr><th scope="col">Ligand (sender cell) → Receptor (receiver cell)</th><th scope="col">Evidence</th></tr></thead>
          <tbody>{rows.map((row, i) => {
            const ligand = display.value('ligand_complex',row.ligand_complex) || endpoints[0] || 'Ligand';
            const receptor = display.value('receptor_complex',row.receptor_complex) || endpoints[1] || 'Receptor';
            const [sender, receiver] = names(row, display);
            const interaction = `${ligand} (${sender}) → ${receptor} (${receiver})`;
            const rank = number(row.specificity_rank), mean = number(row.lr_means);
            const diameter = rank >= 0 && rank <= 1 ? 9 + 19 * Math.sqrt(-Math.log10(Math.max(1e-12, rank)) / 12) : 9;
            const intensity = !Number.isFinite(mean) || min === max ? 0.5 : (mean - min) / (max - min);
            const supported = row.selection_status === 'supporting';
            const label = `${interaction}. Specificity rank: ${row.specificity_rank ?? 'unavailable'}. Ligand–receptor mean: ${row.lr_means ?? 'unavailable'}. ${row.n_donors_sig ?? '?'} / ${row.n_donors_celltypes_ok ?? '?'} significant / eligible donors.${supported ? ' Supports the edge.' : ''}`;
            return <tr key={i}><th scope="row">{interaction}</th><td><span className="xe-ccc-mark" tabIndex={0} title={label} aria-label={label}
              role="img" data-support={supported} data-missing={!Number.isFinite(mean)}
              style={{'--dot-size':`${diameter}px`, '--dot-color-weight':`${28 + 72 * intensity}%`}} /></td></tr>;
          })}</tbody>
        </table>
      </div>
    </section>)}
  </section>;
}
