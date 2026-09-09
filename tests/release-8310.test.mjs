import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=name=>fs.readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
const html=read('index.html');
const bootstrap=read('auth-bootstrap.js');
const sw=read('sw.js');
const start=read('start-dashboard-core.js');
const css=read('start-dashboard-71510.css');
const netlify=read('netlify.toml');

const active=[html,bootstrap,sw,start,css].join('\n');
for(const legacy of ['dashboard-analog-7141','dashboard-premium-7143','start-cockpit-7144','serenity-ivms']){
  assert.ok(!active.includes(legacy),`Legacy dashboard nog actief: ${legacy}`);
}
assert.ok(!sw.includes('rewriteIndexHtml'),'Service worker mag HTML niet meer herschrijven');
assert.ok(!sw.includes('client.navigate'),'Service worker mag clients niet geforceerd naar een release-URL sturen');
assert.match(start,/serenity-hero-8274\.jpg/,'Juiste Serenity-header ontbreekt');
assert.doesNotMatch(start,/serenity-hero-8275\.jpg/,'Oude headerasset nog actief');
assert.match(css,/overflow-x:hidden/,'Horizontale overflow-guard ontbreekt');
assert.match(css,/@media\(max-width:620px\) and \(orientation:portrait\)/,'iPhone portrait-regels ontbreken');
assert.match(css,/@media\(orientation:landscape\) and \(max-height:540px\)/,'Landscape-regels ontbreken');
assert.match(css,/@media\(min-width:901px\) and \(orientation:landscape\)/,'Desktop/iPad landscape-regels ontbreken');
for(const module of ['mission-control.js','easy-auto.js','route-control.js'])assert.ok(bootstrap.includes(module),`Kritieke module niet geladen: ${module}`);
assert.match(bootstrap,/live:\[[^\]]*route-control\.js/s,'Live varen laadt Route Control niet');
assert.ok(!netlify.includes('to = "/.netlify/functions/vrm-ruuvi"'),'Dode Netlify VRM-route is nog aanwezig');
assert.match(html,/msLegacyTelemetryBridge/,'Telemetrycompatibiliteit ontbreekt');
console.log('MijnSerenity 8.31 releasecontract: OK');
