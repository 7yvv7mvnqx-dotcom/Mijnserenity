import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const DIST=path.join(ROOT,'dist');
const BUILD='8.31.1';
const TOKEN='831100';
const failures=[];
const warnings=[];

const fail=(message)=>failures.push(message);
const warn=(message)=>warnings.push(message);
const read=file=>fs.readFile(path.join(DIST,file),'utf8');

async function exists(file){
  try{await fs.access(path.join(DIST,file));return true}catch{return false}
}
function localPath(url){
  const clean=String(url||'').split('#')[0].split('?')[0];
  if(!clean||/^(?:https?:|data:|mailto:|tel:|#)/i.test(clean))return '';
  return clean.replace(/^\.\//,'').replace(/^\//,'');
}
function quotedAssets(source){
  const out=new Set();
  const re=/['"`]([^'"`\n]+\.(?:js|css)(?:\?[^'"`\n]*)?)['"`]/gi;
  let m;
  while((m=re.exec(source))){const p=localPath(m[1]);if(p)out.add(p)}
  return [...out];
}
function htmlAssets(html){
  const out=new Set();
  for(const re of [
    /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi,
    /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi,
    /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi
  ]){
    let m;while((m=re.exec(html))){const p=localPath(m[1]);if(p)out.add(p)}
  }
  return [...out];
}
async function jpegDimensions(file){
  const buffer=await fs.readFile(path.join(DIST,file));
  if(buffer[0]!==0xff||buffer[1]!==0xd8)return null;
  let i=2;
  while(i+9<buffer.length){
    if(buffer[i]!==0xff){i++;continue}
    const marker=buffer[i+1];
    if(marker===0xd8||marker===0xd9){i+=2;continue}
    const length=buffer.readUInt16BE(i+2);
    if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){
      return {height:buffer.readUInt16BE(i+5),width:buffer.readUInt16BE(i+7),bytes:buffer.length};
    }
    if(!length||length<2)break;
    i+=2+length;
  }
  return null;
}

const [index,baseCss,theme,sw,auth,routeAssets,startCore,shim71510,shim8300]=await Promise.all([
  read('index.html'),read('styles.css'),read('serenity-theme-8311.css'),read('sw.js'),
  read('auth-bootstrap.js'),read('route-assets-8311.js'),read('start-dashboard-core-8311.js'),
  read('start-dashboard-71510.js'),read('start-dashboard-core-8300.js')
]);

if(!index.includes(`content="${BUILD}"`))fail('index.html bevat niet de actuele build-meta.');
if(!index.includes(`/auth-bootstrap.js?v=${TOKEN}`))fail('Actuele auth-bootstrap ontbreekt in index.html.');
if(!index.includes(`/state-migration-8311.js?v=${TOKEN}`))fail('State-migratie ontbreekt in index.html.');
if(!index.includes(`/route-assets-8311.js?v=${TOKEN}`))fail('Route-assets ontbreken in index.html.');
if(!index.includes(`/serenity-theme-8311.css?v=${TOKEN}`))fail('Canonieke 8.31.1 styling ontbreekt in index.html.');
if(!index.includes(`/assets/serenity-hero-8274.jpg?v=${TOKEN}`))fail('Canonieke Serenity-header wordt niet gepreload.');
if(!index.includes(`manifest.json?v=${TOKEN}`))fail('Manifest gebruikt niet de actuele cacheversie.');
if(/ms7150-vrm-runtime/i.test(index))fail('Oude inline VRM-runtime staat nog in index.html.');
if(/start-dashboard-71510\.js|serenity-theme-8310|dashboard-premium-7143|start-cockpit-7144/i.test(index))fail('Oude dashboard-runtime staat nog in de productie-HTML.');

const dashboardStart=index.search(/<section\b[^>]*id=["']dashboard["'][^>]*>/i);
if(dashboardStart<0)fail('Dashboardsectie ontbreekt.');
else{
  const firstPart=index.slice(dashboardStart,dashboardStart+4000);
  if(!/msLegacyTelemetryBridge/.test(firstPart))fail('Verborgen telemetry-compat bridge ontbreekt.');
  if(/class=["'][^"']*(?:dashboard-pro|start-cockpit|marine-glass|serenity-ivms)/i.test(firstPart))fail('Oude visuele dashboardmarkup staat nog in de eerste dashboard-shell.');
}

for(const asset of htmlAssets(index)){
  if(!(await exists(asset)))fail(`index.html verwijst naar ontbrekend lokaal bestand: ${asset}`);
}
for(const source of [auth,routeAssets]){
  for(const asset of quotedAssets(source)){
    if(!(await exists(asset)))fail(`Bootstrap/route-loader verwijst naar ontbrekend bestand: ${asset}`);
  }
}

const forbidden=[
  'dashboard-analog-7141.js','dashboard-premium-7143.js','start-cockpit-7144.js',
  'dashboard-cockpit-portal.js','dashboard-navigation-71548.js','dashboard-pro-71531-loader.js',
  'serenity-theme-8310.css','iphone-landscape-8301.css','mobile-dashboard-7161.js',
  'simple-accessible.css','serenity-control-dashboard.js','ais.mjs'
];
for(const file of forbidden)if(await exists(file))fail(`Legacy/non-runtime bestand staat nog in dist: ${file}`);

for(const [name,source] of [['start-dashboard-71510.js',shim71510],['start-dashboard-core-8300.js',shim8300]]){
  if(!source.includes('/start-dashboard-core-8311.js?v=831100'))fail(`${name} is geen zuivere 8.31.1 upgrade-shim.`);
  if(/document\.createElement\(['"](?:section|div|header)['"]\)/.test(source))fail(`${name} bouwt nog visuele legacy-DOM.`);
}

if(/main\s*\{\s*max-width\s*:\s*980px/i.test(baseCss))fail('Historische 980px main-limiet staat nog in styles.css.');
if(!/overflow-x\s*:\s*(?:clip|hidden)/i.test(theme))fail('Globale horizontale overflow-beveiliging ontbreekt.');
if(!/object-fit\s*:\s*cover/i.test(theme))fail('Headerafbeelding heeft geen object-fit:cover regel.');

/* Test de daadwerkelijke doelapparaten, niet toevallige oude breakpoint-getallen. */
const responsiveChecks=[
  ['iPhone portrait',/@media\s*\(max-width\s*:\s*620px\)/i],
  ['iPad portrait',/@media\s*\(max-width\s*:\s*820px\)/i],
  ['tablet/iPad landscape',/@media\s*\(max-width\s*:\s*1100px\)/i],
  ['iPhone landscape',/@media\s*\(orientation\s*:\s*landscape\)[^{]*\(min-width\s*:\s*600px\)[^{]*\(max-width\s*:\s*1100px\)[^{]*\(max-height\s*:\s*700px\)/i]
];
for(const [label,re] of responsiveChecks)if(!re.test(theme))fail(`Responsive regels ontbreken voor ${label}.`);
if(!/--ser-page-max\s*:\s*1540px/i.test(theme))fail('Desktopbreedte is niet expliciet begrensd voor leesbare subpagina’s.');

if(!startCore.includes("const HERO='/assets/serenity-hero-8274.jpg'"))fail('Start-dashboard gebruikt niet de canonieke Serenity-afbeelding.');
if(!/Geen data/.test(startCore)||!/Niet aangesloten/.test(startCore))fail('Start-dashboard mist expliciete geen-data/niet-aangesloten status.');

if(/['"`]\/index\.html['"`]/.test(sw)||/cache\.put\(\s*['"`]\/index\.html/.test(sw))fail('Service worker cachet nog index.html.');
if(!/cache:'no-store'/.test(sw))fail('Service worker forceert geen verse navigatie/runtime fetch.');
if(!sw.includes(`const BUILD='${BUILD}'`))fail('Service worker buildnummer klopt niet.');

const hero=await jpegDimensions('assets/serenity-hero-8274.jpg');
if(!hero)fail('Headerafbeelding is geen leesbare JPEG.');
else if(hero.width<1600)warn(`Headerfoto is ${hero.width}×${hero.height}px (${hero.bytes} bytes); functioneel correct maar te klein voor echt scherpe HiDPI desktop/iPad-weergave.`);

console.log(`MijnSerenity ${BUILD} productievalidatie:`);
if(warnings.length){
  console.log(`Waarschuwingen (${warnings.length}):`);
  warnings.forEach(item=>console.log(`  - ${item}`));
}
if(failures.length){
  console.error(`Fouten (${failures.length}):`);
  failures.forEach(item=>console.error(`  - ${item}`));
  process.exitCode=1;
}else{
  console.log('  ✓ canonieke dashboard-shell');
  console.log('  ✓ geen oude HTML-cachefallback');
  console.log('  ✓ lokale index/bootstrap/route-assets aanwezig');
  console.log('  ✓ bekende legacy visuals niet gepubliceerd');
  console.log('  ✓ upgrade-shims verwijzen uitsluitend naar 8.31.1');
  console.log('  ✓ responsive regels voor iPhone/iPad/desktop aanwezig');
}