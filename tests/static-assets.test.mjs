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

const activeDashboard=read('start-dashboard-71510.js');
const fallbackDashboard=read('start-dashboard-8271.js');
assert.match(activeDashboard,/const BUILD='8\.28\.0',TOKEN='828000'/);
assert.match(activeDashboard,/nordkapp-gen3-8280\.js/);
assert.match(activeDashboard,/mijnserenity:dashboard-ready/);
assert.match(activeDashboard,/__msApprovedHomeReady8279/);
assert.match(fallbackDashboard,/__msDashboardFallback8280/);
assert.match(fallbackDashboard,/start-dashboard-71510\.js/);
assert.match(fallbackDashboard,/828000/);
assert.doesNotMatch(fallbackDashboard,/approved-dashboard-8263\.js/,
  'De fallback mag zelf geen tweede dashboardrenderer starten.');

const dashboardCompatibility=read('dashboard-unified-71919-loader.js');
assert.match(dashboardCompatibility,/__msDashboardCompat8280/);
assert.match(dashboardCompatibility,/start-dashboard-71510\.js/);
assert.match(dashboardCompatibility,/828000/);
assert.doesNotMatch(dashboardCompatibility,/approved-dashboard-8263\.js/,
  'De oude 71919-loader mag geen tweede dashboardrenderer meer starten.');

assert.match(serviceWorker,/const BUILD='8\.28\.0'/);
assert.match(serviceWorker,/const TOKEN='828000'/);
assert.match(serviceWorker,/nordkapp-gen3-8280\.js/);
assert.equal(exists('nordkapp-gen3-8280.js'),true,'Nordkapp Gen 3-module ontbreekt in de webbron.');

const nordkapp=read('nordkapp-gen3-8280.js');
assert.match(nordkapp,/Nordkapp Air Gen 3/);
assert.match(nordkapp,/mijnserenity-ha-oauth-v733/);
assert.match(nordkapp,/climate.*turn_off/s);
assert.match(nordkapp,/set_temperature/);
assert.match(nordkapp,/Afkoelen/);
assert.doesNotMatch(nordkapp,/location\.reload\(/,
  'Nordkapp-module mag geen harde app-reload afdwingen.');

const nativeBridgeSource=read('native-src/bridge.ts');
assert.match(nativeBridgeSource,/webAppOrigin = 'https:\/\/mijnserenity\.nl'/);
assert.match(nativeBridgeSource,/startsWith\('\/api\/'\)/);

const capacitorConfig=read('capacitor.config.ts');
assert.match(capacitorConfig,/CapacitorHttp:\s*\{\s*enabled:\s*true/s);

const builtIndex=read('www/index.html');
const builtBootstrap=read('www/auth-bootstrap.js');
const builtBridge=read('www/native-app-bridge.js');
assert.match(builtIndex,/<meta\s+name="mijnserenity-build"\s+content="8\.28\.0"/i);
assert.match(builtIndex,/window\.MIJSERENITY_BUILD='8\.28\.0';/);
assert.match(builtIndex,/auth-bootstrap\.js\?v=828000/);
assert.match(builtIndex,/start-dashboard-71510\.js\?v=828000/);
assert.match(builtIndex,/<body[^>]*>\s*<script src="native-app-bridge\.js"><\/script>/i);
assert.match(builtBootstrap,/const BUILD='8\.28\.0';/);
assert.match(builtBootstrap,/const VERSION='828000';/);
assert.match(builtBridge,/mijnserenity\.nl/);
assert.equal(exists('www/nordkapp-gen3-8280.js'),true,'Nordkapp Gen 3-module ontbreekt in de native webbuild.');

const retiredNativeAssets=[
  'futuristic-analog-7140.js','futuristic-analog-7140.css',
  'dashboard-analog-7141.js','dashboard-analog-7141.css',
  'start-cockpit-7144.js','start-cockpit-7144.css'
];
for(const asset of retiredNativeAssets){
  assert.equal(exists(`www/${asset}`),false,`Oud dashboardbestand zit nog in native build: ${asset}`);
  assert.equal(builtIndex.includes(asset),false,`Native index verwijst nog naar oud dashboardbestand: ${asset}`);
}

console.log(`Statische appbestanden: OK (${new Set(localReferences).size} HTML, ${new Set(cachedFiles).size} cache)`);
console.log('Fase-1 native/web pariteit: OK (dashboard 8.28.0 + Nordkapp Gen 3, native API bridge actief)');
console.log('Fase-2 oude code: OK (één Start-renderer, compatibiliteitsloaders delegeren alleen)');
