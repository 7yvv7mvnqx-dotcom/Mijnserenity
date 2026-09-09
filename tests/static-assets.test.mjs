import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=new URL('../',import.meta.url);
const html=fs.readFileSync(new URL('index.html',root),'utf8');
const localReferences=[...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map(match=>match[1])
  .filter(reference=>
    !/^(?:https?:|data:|mailto:|#)/i.test(reference)
  )
  .map(reference=>reference.split('?')[0].replace(/^\//,''))
  .filter(Boolean);

const missing=[...new Set(localReferences)].filter(reference=>
  !fs.existsSync(new URL(reference,root))
);
assert.deepEqual(missing,[],`Ontbrekende lokale HTML-bestanden: ${missing.join(', ')}`);

const serviceWorker=fs.readFileSync(new URL('sw.js',root),'utf8');
const cachedFiles=[...serviceWorker.matchAll(/`\/?([^`?]+)\?v=\$\{BUILD_TOKEN\}`/g)]
  .map(match=>match[1]);
const missingCached=[...new Set(cachedFiles)].filter(reference=>
  !fs.existsSync(path.resolve(new URL(root).pathname,reference))
);
assert.deepEqual(missingCached,[],`Ontbrekende cachebestanden: ${missingCached.join(', ')}`);

assert.match(html,/auth-bootstrap\.js\?v=823000/);
assert.match(serviceWorker,/receipt-reader-pro\.js\?v=\$\{BUILD_TOKEN\}/);

console.log(`Statische appbestanden: OK (${new Set(localReferences).size} HTML, ${new Set(cachedFiles).size} cache)`);
