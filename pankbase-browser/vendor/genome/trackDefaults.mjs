// A bounded comparison panel, prioritizing an explicitly supplied cell type.
export function defaultCellTypes(available, focused) {
  const match = value => available.find(cell => cell.toLowerCase() === String(value || '').toLowerCase());
  return [...new Set([match(focused), ...['ductal','beta','alpha','acinar','delta','gamma'].map(match), ...available].filter(Boolean))].slice(0,6);
}
