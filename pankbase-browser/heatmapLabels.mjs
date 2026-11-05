export function validateHeatmapLabels(metadata, rows, dataset) {
  const labels=metadata?.sample_ids;
  if(metadata?.dataset!==dataset || !Array.isArray(labels) || !labels.length || labels.some(x=>typeof x!=='string'||!x) || new Set(labels).size!==labels.length || !rows.every(row=>row.expression.length===labels.length)) throw new Error('Source sample labels do not match the heatmap columns.');
  return labels;
}
