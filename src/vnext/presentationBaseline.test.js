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
test.each(['src/components/ResultComponent.js', 'src/components/KnowledgeGraph.js', 'src/components/MatchPage.js', 'src/components/IntermediatePage.js', 'src/SearchResult/AgentResult.js', 'src/SearchResult/loading.js'])('%s preserves every existing inline presentation style', (file) => {
  expect(attributes(fs.readFileSync(file, 'utf8'))).toEqual(attributes(upstream(file)));
});
test('existing answer tables/CSV/fullscreen renderer keeps upstream styles', () => {
  const source = upstream('src/SearchResult/resultpage_new.js');
  const block = source.slice(source.indexOf('    const dispatchPmidReferenceEvent ='), source.indexOf('    const stripHtml =', source.indexOf('    const dispatchPmidReferenceEvent =')));
  expect(attributes(fs.readFileSync('src/vnext/AnswerMarkdown.js', 'utf8'))).toEqual(attributes(`function Renderer() { ${block} }`));
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
