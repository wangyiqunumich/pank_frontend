import fs from 'node:fs';
import path from 'node:path';
export function notices() {
  return { name: 'source-notices', writeBundle() {
    const files = ['vendor/LICENSE', 'vendor/UPSTREAM.json'];
    for (const entry of fs.readdirSync('node_modules')) {
      if (!/^(vue|d3($|-)|dompurify|internmap|delaunator|robust-predicates)/.test(entry)) continue;
      for (const file of fs.readdirSync(path.join('node_modules', entry))) if (/^licen[sc]e/i.test(file)) files.push(path.join('node_modules', entry, file));
    }
    fs.writeFileSync('../public/scbrowser/THIRD_PARTY_NOTICES.txt', files.map(file => `${file}\n\n${fs.readFileSync(file, 'utf8')}`).join('\n\n'));
  } };
}
