import visualizationSchema from '../schema/visualization_schema.json';

// Resolve dev tool state from its URL so autocomplete responses and a previously
// opened result cannot become the next tool's intermediate selection.
export function toolSearchState(search) {
  const params = new URLSearchParams(search);
  return {
    sourceTerm: params.get('sourceTerm') || '',
    targetTerm: params.get('targetTerm') || '',
    relationship: params.get('relationship') || '',
    sourceTermSymbol: params.get('sourceSymbol') || '',
    targetTermSymbol: params.get('targetSymbol') || params.get('targetTerm')?.split('@')[1] || '',
  };
}

export function toolViewSchema({ sourceTerm, targetTerm, relationship }) {
  const source = sourceTerm.split('@')[0];
  const target = targetTerm.split('@')[0];
  const specificity = `${sourceTerm.includes('@') ? 'specific' : 'general'} - relationship - ${targetTerm.includes('@') ? 'specific' : 'general'}`;
  const schema = visualizationSchema[`${source} - ${relationship} - ${target}`]?.[specificity] || {};
  if (relationship !== 'GWAS') return schema;
  return { ...schema, intermediate_page_table: [
    { 'Credible set': 'credible_set' }, { 'Lead SNP': 'snp' }, { PIP: 'pip' },
    { 'P value': 'p_value' }, { '#': 'n_snp' },
  ] };
}
