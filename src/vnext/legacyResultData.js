import visualizationSchema from '../schema/visualization_schema.json';
import { tabsQTL } from '../components/IntermediatePage';
import { addHighlight } from '../utils/textProcessing';
import { sitePath } from './api';

const escapeText = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export function safeLegacyHref(value) {
  if (typeof value !== 'string') return undefined;
  if (/^(https?:\/\/|mailto:|#)/i.test(value)) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return sitePath(value);
  return undefined;
}

function localSuggestions(result, search, schema) {
  if (Array.isArray(result.next_questions)) return result.next_questions.filter((item) => item.question && safeLegacyHref(item.link));
  const nodes = result.combined_query_result?.nodes || [];
  const source = (search.get('sourceTerm') || '').split('@');
  const target = (search.get('targetTerm') || '').split('@');
  const name = (id) => nodes.find((node) => node['~id'] === id)?.['~properties']?.name || id;
  const values = { [`${source[0]}_id`]: source[1], [`${source[0]}_symbol`]: name(source[1]), [`${target[0]}_id`]: target[1], [`${target[0]}_symbol`]: name(target[1]) };
  const expand = (text, replacements) => String(text || '').replace(/@([a-z_]+)@/g, (_, key) => replacements[key] || '');
  const suggestions = [];
  for (const item of schema?.next_questions || []) {
    for (const node of nodes) {
      const labels = (node['~labels'] || []).map((label) => label.toLowerCase());
      const type = labels.includes('gene') ? 'gene' : labels.includes('snp') || labels.includes('variant') ? 'snp' : labels.includes('cell_type') ? 'cell_type' : '';
      if (!type) continue;
      const replacements = { ...values, [`nbr_${type}_id`]: node['~id'], [`nbr_${type}_symbol`]: node['~properties']?.name || node['~id'] };
      const required = [...`${item.question} ${item.link}`.matchAll(/@([a-z_]+)@/g)].map((match) => match[1]);
      if (required.some((key) => !replacements[key])) continue;
      const question = addHighlight(escapeText(expand(item.question, replacements)));
      const link = expand(item.link, replacements);
      if (question && safeLegacyHref(link) && !suggestions.some((previous) => previous.link === link)) suggestions.push({ question, link });
      if (suggestions.length === 3) return suggestions;
    }
  }
  return suggestions.length ? suggestions : null;
}

export function legacyPresentationData(result, search = new URLSearchParams(), hover = {}) {
  if (!result) return {};
  const source = search.get('sourceTerm') || '';
  const target = search.get('targetTerm') || '';
  const relationship = search.get('relationship') || '';
  const schema = visualizationSchema[`${source.split('@')[0]} - ${relationship} - ${target.split('@')[0]}`]?.[`${source.includes('@') ? 'specific' : 'general'} - relationship - ${target.includes('@') ? 'specific' : 'general'}`] || {};
  let referenceData = result.resources_tabs || {};
  if (!referenceData.empirical_evidence && ['partial', 'unavailable', 'failed'].includes(result.component_status?.resources)) {
    referenceData = { ...referenceData, empirical_evidence: {
      status: 'unavailable', title: 'Supplementary resources unavailable',
      description: 'Some source files or plots could not be retrieved. This is a resource-availability limit, not evidence of biological absence.'
    } };
  }
  const articlesData = Object.values(referenceData.references || {}).map((ref, index) => {
    const original = ref.data || {};
    const authors = ref.authors || original.authors || [];
    return { ...ref, id: ref.id || `reference-${index + 1}`, pmid: ref.pmid || '',
      data: { ...original, title: ref.title || original.title || ref.id || '',
        authors: (Array.isArray(authors) ? authors : [authors]).map((author) => typeof author === 'string' ? { name: author } : author),
        fulljournalname: ref.journal || original.fulljournalname || '',
        pubdate: String(ref.date || ref.year || original.pubdate || ''),
      } };
  });
  const answer = typeof result.answer === 'string' ? result.answer : result.answer?.text;
  const pending = ['pending', 'queued', 'running'].includes(result.component_status?.answer);
  const notice = result.display?.notice || '';
  const answerText = answer || (!pending && result.status === 'ready' ? 'The answer is unavailable.' : '');
  const text = answerText ? [answerText, notice].filter(Boolean).join('\n\n') : '';
  return { queryResultPage: result, aiAnswer: { answers: text ? [text] : [], pending }, displayNotice: answerText ? '' : notice,
    currentQuestion: addHighlight(escapeText(result.question || result.title || '')),
    aiAnswerSubtitle: [], currentQuestionType: tabsQTL.find((tab) => tab.data_source === referenceData.empirical_evidence?.data_source)?.label || '',
    nextQuestions: localSuggestions(result, search, schema), referenceData, articlesData, viewSchema: schema, ...hover,
  };
}
