export function fieldLabel(field, specs = {}, row = null) {
  const key = typeof field === 'string' ? field : field.key;
  const spec = {...specs[key], ...(typeof field === 'object' ? field : {})};
  let label = spec.short_label || spec.label || key.replace(/_/g, ' ');
  if (spec.show_unit === false) return label;
  const identifier = /(^|_)id($|_)/.test(key) || spec.kind === 'identifier';
  const unit = identifier ? null : spec.unit;
  if (!unit || label.toLowerCase() === unit.toLowerCase()) return label;
  if (unit.startsWith('%')) label = label.replace(/\s*\(%\)/g,'');
  return `${label} (${unit.replace(/\s*\(unspecified\)/g,'; unspecified')})`;
}
