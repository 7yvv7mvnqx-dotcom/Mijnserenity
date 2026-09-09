import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const indexUrl=new URL('index.html',root);
const vrmUrl=new URL('vrm-runtime-8312.js',root);
const startUrl=new URL('start-dashboard-core.js',root);
const BUILD='8.31.2';
const TOKEN='831200';
let html=fs.readFileSync(indexUrl,'utf8');
const beforeBytes=Buffer.byteLength(html);
const beforeStyles=(html.match(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)||[]).length;
const beforeScripts=(html.match(/<script\b[^>]*src=["'][^"']+["'][^>]*>/gi)||[]).length;

function requireReplace(regex,replacement,label){
  if(!regex.test(html))throw new Error(`Productieshell: ${label} niet gevonden.`);
  html=html.replace(regex,replacement);
}

if(!/data-ms-start-boot=/.test(html)){
  requireReplace(/<html\s+lang=["']nl["']>/i,'<html lang="nl" data-ms-start-boot="1">','html-root');
}
requireReplace(/<meta\s+name=["']mijnserenity-build["']\s+content=["'][^"']+["']\s*>/i,`<meta name="mijnserenity-build" content="${BUILD}">`,'build-meta');
requireReplace(/window\.MIJSERENITY_BUILD\s*=\s*["'][^"']+["'];?/,`window.MIJSERENITY_BUILD='${BUILD}';`,'build-runtime');

html=html.replace(/^[ \t]*<link\b[^>]*rel=["']preconnect["'][^>]*>\s*$/gmi,'');
html=html.replace(/^[ \t]*<link\b[^>]*rel=["']stylesheet["'][^>]*>\s*$/gmi,'');
html=html.replace(/^[ \t]*<script\b[^>]*src=["']https:\/\/(?:unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.js|cdn\.jsdelivr\.net\/npm\/jszip@3\.10\.1\/dist\/jszip\.min\.js)["'][^>]*><\/script>\s*$/gmi,'');

html=html.replace(/<link\s+rel=["']manifest["'][^>]*>/i,`<link rel="manifest" href="/manifest.json?v=${TOKEN}">`);
html=html.replace(/<link\s+rel=["']apple-touch-icon["'][^>]*>/i,`<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=${TOKEN}">`);
html=html.replace(/<link\s+rel=["']icon["'][^>]*sizes=["']64x64["'][^>]*>/i,`<link rel="icon" type="image/png" sizes="64x64" href="/favicon-64.png?v=${TOKEN}">`);

const coreHead=`
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="preload" as="image" href="/assets/serenity-hero-8275.jpg?v=${TOKEN}" fetchpriority="high">
<link rel="stylesheet" href="/styles.css?v=${TOKEN}">
<link rel="stylesheet" href="/captain-ux-711.css?v=${TOKEN}">
<link rel="stylesheet" href="/start-dashboard-71510.css?v=${TOKEN}">`;
requireReplace(/(<link\s+rel=["']manifest["'][^>]*>)/i,`$1${coreHead}`,'manifest-invoegpunt');

html=html.replace(/<img\s+class=["']auth-brand-logo["'][^>]*>/i,`<img class="auth-brand-logo" src="/icon-192.png?v=${TOKEN}" width="192" height="192" alt="MijnSerenity" decoding="async">`);
html=html.replace(/src=["']\/?mijnserenity-logo\.png(?:\?[^"']*)?["']/gi,`src="/icon-192.png?v=${TOKEN}"`);
html=html.replace(/<img\s+class=["']approval-brand-logo["']([^>]*)>/i,`<img class="approval-brand-logo"$1 width="192" height="192" loading="lazy" decoding="async">`);

const vrmMatch=html.match(/<script\s+id=["']ms7150-vrm-runtime["']>\s*([\s\S]*?)\s*<\/script>/i);
if(vrmMatch){
  fs.writeFileSync(vrmUrl,`/* MijnSerenity ${BUILD} — VRM/Ruuvi runtime, na de eerste paint geladen. */\n${vrmMatch[1].trim()}\n`);
  html=html.replace(vrmMatch[0],'');
}else if(!fs.existsSync(vrmUrl)){
  throw new Error('Productieshell: VRM-runtime ontbreekt en kon niet worden geëxtraheerd.');
}

const oldScripts=[
  'auth-bootstrap\\.js','start-dashboard-71510\\.js','poi-regio-filter-71511\\.js','wind-direction-71512\\.js',
  'ruuvi-climate\\.js','victron-energy-71559\\.js','ais-gps-fix-8221\\.js','rws-compat-8233\\.js'
].join('|');
html=html.replace(new RegExp(`\\s*<script\\b[^>]*src=["'][^"']*(?:${oldScripts})[^"']*["'][^>]*><\\/script>`,`gi`),'');

html=html.replace(/<style\s+id=["']ms8312-critical["'][\s\S]*?<\/style>/gi,'');
const critical=`<style id="ms8312-critical">
html,body{max-width:100%;overflow-x:hidden}
#dashboard>:not(#ms8210Start):not(#msLegacyTelemetryBridge){display:none!important;visibility:hidden!important;pointer-events:none!important}
#msLegacyTelemetryBridge{display:none!important}
html[data-ms-start-boot="1"] #dashboard:not(.ms8300-ready)::before{content:'MijnSerenity laden…';display:block;margin:18px auto;padding:22px;width:min(92%,860px);box-sizing:border-box;border:1px solid rgba(83,204,243,.24);border-radius:20px;background:#061321;color:#9eb6c5;font:750 14px/1.3 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center}
</style>`;
requireReplace(/<\/head>/i,`${critical}\n</head>`,'head-einde');

html=html.replace(/\s*<script\s+src=["']\/auth-bootstrap\.js[^"']*["'][^>]*><\/script>\s*/gi,'\n');
requireReplace(/<\/body>/i,`<script src="/auth-bootstrap.js?v=${TOKEN}"></script>\n</body>`,'body-einde');
html=html.replace(/\n{3,}/g,'\n\n');
fs.writeFileSync(indexUrl,html);

let start=fs.readFileSync(startUrl,'utf8');
start=start
  .replace(/\/\* MijnSerenity [^*]+— één canonieke Start-runtime\. \*\//,`/* MijnSerenity ${BUILD} — één canonieke Start-runtime. */`)
  .replace(/const BUILD='[^']+';/,`const BUILD='${BUILD}';`)
  .replace(/const HERO='[^']+';/,`const HERO='/assets/serenity-hero-8275.jpg?v=${TOKEN}';`)
  .replace(/const HERO_FALLBACK='[^']+';/,`const HERO_FALLBACK='/assets/serenity-hero-8274.jpg?v=${TOKEN}';`)
  .replace(/\[100,500,1400\]\.forEach\(delay=>setTimeout\(render,delay\)\);/,`[160,850].forEach(delay=>setTimeout(render,delay));`)
  .replace(/setInterval\(\(\)=>\{if\(!document\.hidden\)render\(\);\},5000\);/,`setInterval(()=>{if(!document.hidden&&document.body?.classList.contains('ms8300-start-page'))render();},10000);`);
if(!start.includes(`const BUILD='${BUILD}'`)||!start.includes('serenity-hero-8275.jpg')||!start.includes('},10000);'))throw new Error('Productieshell: Start-runtime kon niet volledig worden geoptimaliseerd.');
fs.writeFileSync(startUrl,start);

const afterStyles=(html.match(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)||[]).length;
const afterScripts=(html.match(/<script\b[^>]*src=["'][^"']+["'][^>]*>/gi)||[]).length;
console.log(`MijnSerenity ${BUILD}: productieshell geoptimaliseerd · CSS ${beforeStyles}→${afterStyles} · externe/lokale script-tags ${beforeScripts}→${afterScripts} · HTML ${beforeBytes}→${Buffer.byteLength(html)} bytes · Start-render 5s→10s alleen op Start.`);