// Publish a dedicated entry document for the already-built dev application.
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const config = require('../config/techdemo.json');
const resultPageProfile = require('../src/vnext/schema/resultPageProfile');

if (process.env.AWS_BRANCH !== config.source_branch && process.env.PANK_BUILD_TECHDEMO !== '1') {
  process.exit(0);
}

const root = path.resolve(__dirname, '..');
const build = path.join(root, 'build');
const destination = path.join(build, 'techdemo');
const html = fs.readFileSync(path.join(build, 'index.html'), 'utf8');
if (!html.includes('<head>') || !html.includes('src="/static/')) {
  throw new Error('Expected root-hosted React assets in the development build');
}
fs.mkdirSync(destination, {recursive: true});
fs.writeFileSync(path.join(destination, 'index.html'),
  html.replace('<head>', '<head><meta name="pankgraph-page" content="techdemo">'));

// Embedded browsers resolve assets and data relative to their dedicated base URL.
for (const folder of ['scbrowser', 'pankbase-browser']) {
  const entry = JSON.parse(fs.readFileSync(path.join(build, folder, 'embed.json'), 'utf8'));
  if (entry.version !== 1 || !entry.html.startsWith('<!doctype html')) throw new Error('Missing module entry: ' + folder);
  fs.cpSync(path.join(build, folder), path.join(destination, folder), {recursive: true});
}
const commit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
const schema = resultPageProfile('techdemo');
const modules = schema.main_visuals.default_order.filter(id => {
  const item = schema.main_visuals.items[id];
  return item.extension && item.enabled && !item.hidden;
});
fs.writeFileSync(path.join(destination, 'techdemo-release.json'), JSON.stringify({
  ...config, source_commit: commit, host_commit: commit, schema_version: schema.version, modules,
  built_at: new Date().toISOString(),
}, null, 2) + '\n');
