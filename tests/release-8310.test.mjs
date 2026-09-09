import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=name=>fs.readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
const html=read('index.html');
const bootstrap=read('auth-bootstrap.js');
const sw=read('sw.js');
const start=read('start-dashboard-core.js');
const css=read('start-dashboard-71510.css');
const netlify=read('netlify.toml');

assert.match(html,/mijnserenity-build" content="8\.31\.2"/,'Productieshell heeft niet de actuele build');
assert.ok(!sw.includes('rewriteIndexHtml'),'Service worker mag HTML niet herschrijven');
assert.ok(!sw.includes('client.navigate'),'Service worker mag clients niet geforceerd naar een release-URL sturen');
assert.match(start,/const HERO='\/assets\/serenity-hero-8275\.jpg\?v=831200'/,'Juiste Serenity-header ontbreekt');
assert.match(start,/const HERO_FALLBACK='\/assets\/serenity-hero-8274\.jpg\?v=831200'/,'Veilige Serenity-fallback ontbreekt');
assert.match(css,/object-fit:cover/,'Headerafbeelding wordt niet proportioneel beeldvullend weergegeven');
assert.match(css,/overflow-x:hidden/,'Horizontale overflow-guard ontbreekt');
assert.match(css,/@media\(max-width:620px\) and \(orientation:portrait\)/,'iPhone portrait-regels ontbreken');
assert.match(css,/@media\(orientation:landscape\) and \(max-height:540px\)/,'Landscape-regels ontbreken');
assert.match(css,/@media\(min-width:901px\) and \(orientation:landscape\)/,'Desktop/iPad landscape-regels ontbreken');
for(const module of ['mission-control.js','easy-auto.js','route-control.js'])assert.ok(bootstrap.includes(module),`Kritieke live-module ontbreekt uit lazy loader: ${module}`);
assert.match(bootstrap,/live:\{[\s\S]*route-control\.js/s,'Live varen laadt Route Control niet');
assert.ok(!netlify.includes('to = "/.netlify/functions/vrm-ruuvi"'),'Dode Netlify VRM-route is nog aanwezig');
assert.match(html,/msLegacyTelemetryBridge/,'Telemetrycompatibiliteit ontbreekt');
for(const legacy of ['dashboard-analog-7141.css','dashboard-premium-7143.css','start-cockpit-7144.css','serenity-ivms.css']){
  assert.ok(!html.includes(legacy),`Legacy stylesheet nog in productieshell: ${legacy}`);
}
console.log('MijnSerenity 8.31.2 releasecontract: OK');