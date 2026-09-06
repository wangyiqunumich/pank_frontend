/** Source-level presentation parity checks, independent of changing API state. */
const fs = require('fs');
const childProcess = require('child_process');
const parser = require('@babel/parser');

const BASELINE = 'bc27e3f272057ba161ac827bd91adfb7823d7b07';
const upstream = (file) => childProcess.execFileSync('git', ['show', `${BASELINE}:${file}`], { encoding: 'utf8' });
function attributes(source, names = ['sx', 'style']) {
  const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
  const values = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXAttribute' && names.includes(node.name.name)) values.push(source.slice(node.start, node.end));
    Object.entries(node).forEach(([key, value]) => { if (!['loc', 'start', 'end'].includes(key)) { if (Array.isArray(value)) value.forEach(visit); else visit(value); } });
  }
  visit(ast);
  return values;
}
function resultStructure(source) {
  const body = source.slice(source.indexOf('    return !(queryResultPage?.combined_query_result)'), source.lastIndexOf('export default'));
  const ast = parser.parse(`function Page() { ${body}`, { sourceType: 'module', plugins: ['jsx'] });
  const result = [];
  function visit(node, parents = []) {
    if (!node || typeof node !== 'object') return;
    let path = parents;
    if (node.type === 'JSXElement') {
      path = [...parents, node.openingElement.name.name];
      // Actual provenance may add a line break inside the existing author row.
      if (!(node.openingElement.name.name === 'br' && parents.slice(-2).join('/') === 'ListItem/Typography')) result.push(path.join('/'));
    }
    // PMID is now conditional because some supplied references have document IDs.
    const citationPunctuation = path.slice(-2).join('/') === 'ListItem/Typography' && /^[.;:()\s]+$/.test(node.value || '');
    if (node.type === 'JSXText' && node.value.trim() && node.value.trim() !== 'PMID:' && !citationPunctuation) result.push(`${path.join('/')}:${node.value.trim()}`);
    Object.entries(node).forEach(([key, value]) => { if (!['loc', 'start', 'end'].includes(key)) { if (Array.isArray(value)) value.forEach((item) => visit(item, path)); else visit(value, path); } });
  }
  visit(ast);
  return result;
}
test.each(['src/components/ResultComponent.js', 'src/components/KnowledgeGraph.js', 'src/components/MatchPage.js', 'src/components/IntermediatePage.js', 'src/SearchResult/AgentResult.js', 'src/SearchResult/loading.js'])('%s preserves every existing inline presentation style', (file) => {
  let current = attributes(fs.readFileSync(file, 'utf8'));
  // A fitted large graph may start below0.6. Only the zoom-out control's state
  // threshold changes; its enabled/disabled opacity and every style stay fixed.
  if (file === 'src/components/KnowledgeGraph.js') {
    // Full evidence must remain reachable in the existing hover card. Only its
    // height bound/vertical scrolling are added; popup/page styling is retained.
    expect(current.filter((style) => style.includes('maxHeight: "calc(100vh - 24px)"'))).toHaveLength(1);
    current = current.map((style) => style
      .replace('opacity: zoomLevel <= minimumZoom ? 0.5 : 1', 'opacity: zoomLevel <= 0.6 ? 0.5 : 1')
      .replace(/\n\s+overflowY: "auto",\n\s+maxHeight: "calc\(100vh - 24px\)",/, ''));
  }
  expect(current).toEqual(attributes(upstream(file)));
});
test('existing answer tables/CSV/fullscreen renderer keeps upstream styles', () => {
  const source = upstream('src/SearchResult/resultpage_new.js');
  const block = source.slice(source.indexOf('    const dispatchPmidReferenceEvent ='), source.indexOf('    const stripHtml =', source.indexOf('    const dispatchPmidReferenceEvent =')));
  expect(attributes(fs.readFileSync('src/vnext/AnswerMarkdown.js', 'utf8'))).toEqual(attributes(`function Renderer() { ${block} }`));
});
test('legacy /result preserves every original inline presentation style and control', () => {
  const source = fs.readFileSync('src/vnext/LegacyResultPresentation.js', 'utf8');
  const original = upstream('src/SearchResult/index.js');
  expect(attributes(source)).toEqual(attributes(original));
  expect(attributes(source, ['height', 'variant', 'scrollButtons', 'alt', 'target', 'rel'])).toEqual(attributes(original, ['height', 'variant', 'scrollButtons', 'alt', 'target', 'rel']));
  expect(resultStructure(source)).toEqual(resultStructure(original));
  const entry = fs.readFileSync('src/index.js', 'utf8');
  expect(entry).toContain("import ResultPage from './vnext/LegacyResultView'");
  expect(entry).toContain("import { ConventionalResultView as ResultPageNew } from './vnext/ResultView'");
  expect(source).not.toMatch(/queryAiAnswer|queryArticles|queryImage|validateQuestions|flaskBackend|typeToImage|VisuImage|lambda_function|dispatch\(/);
});
test('active entrypoint uses local controllers and starts no production endpoint probes or analytics', () => {
  const entry = fs.readFileSync('src/index.js', 'utf8');
  expect(entry).toContain("from './vnext/ResultView'");
  expect(entry).not.toMatch(/AuthProvider|cognito-idp|\/SearchResult\/resultpage_new|\/SearchResult\/index_new/);
  expect(fs.readFileSync('src/constants/apiEndpoints.js', 'utf8')).not.toMatch(/fetch\(|https?:\/\//);
  expect(fs.readFileSync('public/index.html', 'utf8')).not.toContain('googletagmanager');
  expect(fs.readFileSync('src/redux/queryResultSlice.js', 'utf8')).not.toMatch(/RDSLambda|\.post\(|execute-api/);
});
test('conventional schema retains all presentation values while stripping executable query fields', () => {
  const clean = (value, removeTemplate = false) => {
    if (Array.isArray(value)) return value.map((item) => clean(item, removeTemplate));
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'query' && !/^(cypher_|cyper_|rdb_query)/.test(key) && (!removeTemplate || key !== 'template_id')).map(([key, item]) => [key, clean(item, removeTemplate)]));
  };
  const current = JSON.parse(fs.readFileSync('src/schema/visualization_schema.json', 'utf8'));
  const original = JSON.parse(upstream('src/schema/visualization_schema.json'));
  expect(clean(current, true)).toEqual(clean(original));
  expect(JSON.stringify(current)).not.toMatch(/SELECT |MATCH \(/);
  expect(Object.values(current).flatMap(Object.values).every((template) => Boolean(template.template_id))).toBe(true);
});
