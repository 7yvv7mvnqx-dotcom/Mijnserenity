import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=new URL('../',import.meta.url);
const html=fs.readFileSync(new URL('index.html',root),'utf8');
const refs=[...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map(m=>m[1]).filter(v=>!/^(?:https?:|data:|mailto:|#)/i.test(v))
  .map(v=>v.split('?')[0].replace(/^\//,'')).filter(Boolean);
const missing=[...new Set(refs)].filter(v=>!fs.existsSync(new URL(v,root)));
assert.deepEqual(missing,[],`Ontbrekende lokale HTML-bestanden: ${missing.join(', ')}`);

const sw=fs.readFileSync(new URL('sw.js',root),'utf8');
const bootstrap=fs.readFileSync(new URL('auth-bootstrap.js',root),'utf8');
const start=fs.readFileSync(new URL('start-dashboard-core.js',root),'utf8');
for(const source of [html,sw,bootstrap,start])assert.match(source,/8\.31\.2|831200/,'Build 8.31.2 ontbreekt in actieve runtime');
assert.match(sw,/start-dashboard-core\.js/);
assert.match(bootstrap,/mission-control\.js/);
assert.match(bootstrap,/easy-auto\.js/);
assert.match(bootstrap,/route-control\.js/);
assert.ok(fs.existsSync(path.resolve(new URL(root).pathname,'assets/serenity-hero-8274.jpg')),'Canonieke Serenity-header ontbreekt');
assert.ok(fs.existsSync(path.resolve(new URL(root).pathname,'vrm-runtime-8312.js')),'Uitgestelde VRM-runtime ontbreekt');
console.log(`Statische appbestanden: OK (${new Set(refs).size} lokale HTML-referenties)`);
