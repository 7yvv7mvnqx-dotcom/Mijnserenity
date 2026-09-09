import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root),'utf8');
const html=read('index.html');
const bootstrap=read('auth-bootstrap.js');
const sw=read('sw.js');
const start=read('start-dashboard-core.js');

assert.match(html,/mijnserenity-build" content="8\.31\.2"/,'Productie-index gebruikt niet build 8.31.2');
assert.match(html,/auth-bootstrap\.js\?v=831200/,'Actuele bootstrap ontbreekt');
assert.doesNotMatch(html,/leaflet@1\.9\.4\/dist\/leaflet\.(?:css|js)/,'Leaflet mag niet meer in de critical path staan');
assert.doesNotMatch(html,/jszip@3\.10\.1\/dist\/jszip\.min\.js/,'JSZip mag niet meer in de critical path staan');
assert.doesNotMatch(html,/mijnserenity-logo\.png/,'Zware login-afbeelding staat nog in de critical path');
assert.match(html,/icon-192\.png\?v=831200/,'Lichte login-afbeelding ontbreekt');
assert.match(html,/rel="preload" as="image" href="\/assets\/serenity-hero-8274\.jpg\?v=831200"/,'Serenity-header wordt niet gepreload');

const styles=[...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)].map(m=>m[1]);
assert.ok(styles.length<=3,`Te veel render-blocking stylesheets: ${styles.length}`);
for(const blocked of ['weather-page.css','ais-page.css','live-split.css','route-control.css','entertainment-page.css','page-swipe.css','futuristic-analog-7140.css'])assert.ok(!html.includes(blocked),`Route/legacy CSS nog upfront geladen: ${blocked}`);

for(const eager of ['mission-control.js','easy-auto.js','route-control.js','rws-nearby.js','ais-page.js','poi-regio-filter-71511.js'])assert.ok(!html.includes(`src="${eager}`)&&!html.includes(`src="/${eager}`),`Route-script nog upfront geladen: ${eager}`);
assert.ok(fs.existsSync(new URL('vrm-runtime-8312.js',root)),'Uitgestelde VRM-runtime ontbreekt');

assert.match(bootstrap,/const BUILD='8\.31\.2'/);
assert.doesNotMatch(bootstrap,/const CRITICAL=/,'Oude blokkerende kernmodulelijst is teruggekeerd');
assert.match(bootstrap,/live:\{[\s\S]*mission-control\.js[\s\S]*easy-auto\.js[\s\S]*route-control\.js/,'Live-modules worden niet lazy geladen');
assert.match(bootstrap,/leaflet:\{[\s\S]*unpkg\.com\/leaflet/,'Leaflet lazy-loader ontbreekt');
assert.match(bootstrap,/jszip:\{[\s\S]*jszip\.min\.js/,'JSZip lazy-loader ontbreekt');
assert.match(bootstrap,/bootObserver\?\.disconnect\(\)/,'Boot-observer wordt niet opgeruimd');

assert.match(sw,/const BUILD='8\.31\.2'/);
assert.doesNotMatch(sw,/runtime-hotfix-8311|start-dashboard-71510\.js/,'Oude opstartlagen staan nog in de core-cache');
assert.match(start,/const BUILD='8\.31\.2'/);
assert.match(start,/10000/,'Start-render is niet gethrottled');

console.log(`MijnSerenity 8.31.2 performancecontract: OK · ${styles.length} render-blocking stylesheets.`);
