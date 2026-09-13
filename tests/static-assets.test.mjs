import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=new URL('../',import.meta.url);
const read=relative=>fs.readFileSync(new URL(relative,root),'utf8');
const exists=relative=>fs.existsSync(new URL(relative,root));

const html=read('index.html');
const localReferences=[...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map(match=>match[1])
  .filter(reference=>!/^(?:https?:|data:|mailto:|#)/i.test(reference))
  .map(reference=>reference.split('?')[0].replace(/^\//,''))
  .filter(Boolean);

const missing=[...new Set(localReferences)].filter(reference=>!exists(reference));
assert.deepEqual(missing,[],`Ontbrekende lokale HTML-bestanden: ${missing.join(', ')}`);

const serviceWorker=read('sw.js');
const cachedFiles=[...serviceWorker.matchAll(/["'`]\/?([^"'`?]+\.(?:js|css|png|jpg|jpeg|webp|svg|ico|json|webmanifest))(?:\?v=[^"'`]*)?["'`]/gi)]
  .map(match=>match[1]);
const missingCached=[...new Set(cachedFiles)].filter(reference=>
  !fs.existsSync(path.resolve(new URL(root).pathname,reference))
);
assert.deepEqual(missingCached,[],`Ontbrekende cachebestanden: ${missingCached.join(', ')}`);

const legacyDashboard=read('start-dashboard-71510.js');
const currentDashboard=read('start-dashboard-8271.js');
assert.equal(legacyDashboard,currentDashboard,'Website en native fallback gebruiken niet dezelfde dashboardloader.');
assert.match(currentDashboard,/const BUILD='8\.27\.7'/);
assert.match(currentDashboard,/const BUILD='8\.27\.7',TOKEN='827700'/);
assert.match(serviceWorker,/const BUILD='8\.27\.7'/);
assert.match(serviceWorker,/const TOKEN='827700'/);

const nativeBridgeSource=read('native-src/bridge.ts');
assert.match(nativeBridgeSource,/webAppOrigin = 'https:\/\/mijnserenity\.nl'/);
assert.match(nativeBridgeSource,/startsWith\('\/api\/'\)/);

const capacitorConfig=read('capacitor.config.ts');
assert.match(capacitorConfig,/CapacitorHttp:\s*\{\s*enabled:\s*true/s);

const builtIndex=read('www/index.html');
const builtBootstrap=read('www/auth-bootstrap.js');
const builtBridge=read('www/native-app-bridge.js');
assert.match(builtIndex,/<meta\s+name="mijnserenity-build"\s+content="8\.27\.7"/i);
assert.match(builtIndex,/window\.MIJSERENITY_BUILD='8\.27\.7';/);
assert.match(builtIndex,/auth-bootstrap\.js\?v=827700/);
assert.match(builtIndex,/start-dashboard-71510\.js\?v=827700/);
assert.match(builtIndex,/<body[^>]*>\s*<script src="native-app-bridge\.js"><\/script>/i);
assert.match(builtBootstrap,/const BUILD='8\.27\.7';/);
assert.match(builtBootstrap,/const VERSION='827700';/);
assert.match(builtBridge,/mijnserenity\.nl/);

console.log(`Statische appbestanden: OK (${new Set(localReferences).size} HTML, ${new Set(cachedFiles).size} cache)`);
console.log('Fase-1 native/web pariteit: OK (dashboard 8.27.7, native API bridge actief)');
