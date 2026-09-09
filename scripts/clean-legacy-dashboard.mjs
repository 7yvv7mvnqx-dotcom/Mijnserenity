import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const INDEX=path.join(ROOT,'index.html');
const BUILD='8.31.0';
const TOKEN='831000';

const LEGACY_SCRIPTS=[
  'futuristic-analog-7140.js','dashboard-analog-7141.js','dashboard-premium-7143.js','start-cockpit-7144.js',
  'release-guard-8290.js'
];
const LEGACY_STYLES=[
  'page-swipe.css','simple-accessible.css','captain-experience.css','navigation-compact.css','futuristic-analog-7140.css',
  'dashboard-analog-7141.css','dashboard-premium-7143.css','start-cockpit-7144.css','serenity-ivms.css','iphone-landscape-8301.css'
];
const REMOVE_AT_DEPLOY=[
  'futuristic-analog-7140.js','dashboard-analog-7141.js','dashboard-premium-7143.js','start-cockpit-7144.js',
  'futuristic-analog-7140.css','dashboard-analog-7141.css','dashboard-premium-7143.css','start-cockpit-7144.css','serenity-ivms.css'
];
const VISUAL_ROOT_IDS=new Set(['dashboard','msLegacyTelemetryBridge','ms8210Start','ms71510Dashboard','serenityIvms','msDashboardAnalog7141','msDashboardPremium7143','msStartCockpit7144','msWelcomeCard7140','msWelcomeCard7137']);

const escapeRe=value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function stripTagByFile(html,file,tag){
  const escaped=escapeRe(file);
  return tag==='script'
    ?html.replace(new RegExp(`<script[^>]+src=["'][^"']*${escaped}[^"']*["'][^>]*><\\/script>\\s*`,'gi'),'')
    :html.replace(new RegExp(`<link[^>]+href=["'][^"']*${escaped}[^"']*["'][^>]*>\\s*`,'gi'),'');
}
function extractSection(html,id){
  const startRe=new RegExp(`<section\\b[^>]*\\bid=["']${escapeRe(id)}["'][^>]*>`,'i');
  const match=startRe.exec(html);if(!match)return null;
  const tokenRe=/<section\b[^>]*>|<\/section\s*>/gi;tokenRe.lastIndex=match.index;let depth=0,token;
  while((token=tokenRe.exec(html))){
    if(/^<section\b/i.test(token[0]))depth++;else depth--;
    if(depth===0)return {start:match.index,end:tokenRe.lastIndex,openTag:match[0],inner:html.slice(match.index+match[0].length,token.index)};
  }
  throw new Error(`Ongebalanceerde sectie: ${id}`);
}
function telemetryBridge(source){
  const entries=[],seen=new Set(),re=/<([a-z][a-z0-9-]*)\b[^>]*\bid=["']([^"']+)["'][^>]*>/gi;let m;
  while((m=re.exec(source))){const tag=m[1].toLowerCase(),id=m[2];if(VISUAL_ROOT_IDS.has(id)||seen.has(id))continue;seen.add(id);entries.push({tag,id})}
  const voids=new Set(['img','input','br','hr','meta','link','source','area','base','col','embed','param','track','wbr']);
  return `<div id="msLegacyTelemetryBridge" hidden aria-hidden="true" data-purpose="telemetry-compat">${entries.map(({tag,id})=>voids.has(tag)?`<${tag} id="${id}">`:`<${tag} id="${id}"></${tag}>`).join('')}</div>`;
}
function compactDashboard(html){
  const section=extractSection(html,'dashboard');if(!section)return html;
  return html.slice(0,section.start)+`${section.openTag}\n${telemetryBridge(section.inner)}\n</section>`+html.slice(section.end);
}
function ensureHead(html,tag,needle){return new RegExp(needle,'i').test(html)?html:html.replace(/<\/head>/i,`${tag}\n</head>`)}
function ensureBody(html,tag,needle){return new RegExp(needle,'i').test(html)?html:html.replace(/<\/body>/i,`${tag}\n</body>`)}

let html=await fs.readFile(INDEX,'utf8');
const before=Buffer.byteLength(html);
for(const file of LEGACY_SCRIPTS)html=stripTagByFile(html,file,'script');
for(const file of LEGACY_STYLES)html=stripTagByFile(html,file,'style');
html=compactDashboard(html);
html=html
  .replace(/(<meta\s+name=["']mijnserenity-build["']\s+content=["'])[^"']+(["'])/i,`$1${BUILD}$2`)
  .replace(/window\.MIJSERENITY_BUILD\s*=\s*['"][^'"]+['"]/g,`window.MIJSERENITY_BUILD='${BUILD}'`)
  .replace(/auth-bootstrap\.js\?v=\d+/g,`auth-bootstrap.js?v=${TOKEN}`)
  .replace(/start-dashboard-71510\.css\?v=\d+/g,`start-dashboard-71510.css?v=${TOKEN}`)
  .replace(/start-dashboard-71510\.js\?v=\d+/g,`start-dashboard-71510.js?v=${TOKEN}`)
  .replace(/ruuvi-climate\.js\?v=\d+/g,`ruuvi-climate.js?v=${TOKEN}`)
  .replace(/victron-energy-71559\.js\?v=\d+/g,`victron-energy-71559.js?v=${TOKEN}`);
html=ensureHead(html,`<link rel="preload" as="image" href="/assets/serenity-hero-8274.jpg?v=${TOKEN}" fetchpriority="high">`,'serenity-hero-8274\\.jpg');
html=ensureHead(html,`<style id="ms8310InitialGuard">#dashboard>:not(#ms8210Start):not(#msLegacyTelemetryBridge){display:none!important;visibility:hidden!important}#msLegacyTelemetryBridge{display:none!important}</style>`,'ms8310InitialGuard');
html=ensureBody(html,`<script src="/rws-compat-8233.js?v=823300"></script>`,'rws-compat-8233\\.js');

const dashboard=extractSection(html,'dashboard');
if(!dashboard||!/msLegacyTelemetryBridge/.test(dashboard.inner))throw new Error('Canonieke dashboard-shell ontbreekt');
for(const file of [...LEGACY_SCRIPTS,...LEGACY_STYLES])if(new RegExp(escapeRe(file),'i').test(html))throw new Error(`Legacy referentie actief: ${file}`);
if(!new RegExp(`mijnserenity-build["'] content=["']${escapeRe(BUILD)}`).test(html))throw new Error('Buildnummer niet bijgewerkt');

await fs.writeFile(INDEX,html,'utf8');
for(const file of REMOVE_AT_DEPLOY)await fs.rm(path.join(ROOT,file),{force:true});
console.log(`MijnSerenity ${BUILD}: actieve shell opgeschoond; ${before-Buffer.byteLength(html)} bytes legacy HTML verwijderd.`);
