import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const INDEX=path.join(ROOT,'index.html');

const LEGACY_SCRIPTS=[
  'futuristic-analog-7140.js',
  'dashboard-analog-7141.js',
  'dashboard-premium-7143.js',
  'start-cockpit-7144.js'
];
const LEGACY_STYLES=[
  'dashboard-analog-7141.css',
  'dashboard-premium-7143.css',
  'start-cockpit-7144.css',
  'serenity-ivms.css'
];
const LEGACY_DEPLOY_FILES=[...LEGACY_SCRIPTS,...LEGACY_STYLES];
const RWS_COMPAT='/rws-compat-8233.js?v=823300';
const VISUAL_ROOT_IDS=new Set([
  'dashboard','msLegacyTelemetryBridge','ms8210Start','ms71510Dashboard','serenityIvms',
  'msDashboardAnalog7141','msDashboardPremium7143','msStartCockpit7144','msWelcomeCard7140','msWelcomeCard7137'
]);

function escapeRe(value){
  return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
}

function stripTagByFile(html,file,tag){
  const escaped=escapeRe(file);
  if(tag==='script'){
    return html.replace(new RegExp(`<script[^>]+src=["'][^"']*${escaped}[^"']*["'][^>]*><\\/script>\\s*`,'gi'),'');
  }
  return html.replace(new RegExp(`<link[^>]+href=["'][^"']*${escaped}[^"']*["'][^>]*>\\s*`,'gi'),'');
}

function extractBalancedSection(html,rootId){
  const startRe=new RegExp(`<section\\b[^>]*\\bid=["']${escapeRe(rootId)}["'][^>]*>`,'i');
  const match=startRe.exec(html);
  if(!match)return null;
  const start=match.index;
  const openEnd=start+match[0].length;
  const tokenRe=/<section\b[^>]*>|<\/section\s*>/gi;
  tokenRe.lastIndex=start;
  let depth=0;
  let token;
  while((token=tokenRe.exec(html))){
    if(/^<section\b/i.test(token[0]))depth+=1;
    else depth-=1;
    if(depth===0){
      const end=tokenRe.lastIndex;
      const closeStart=token.index;
      return {start,openEnd,closeStart,end,openTag:match[0],html:html.slice(start,end),inner:html.slice(openEnd,closeStart)};
    }
  }
  throw new Error(`Ongebalanceerde sectie: ${rootId}`);
}

function telemetryBridgeFrom(sourceHtml){
  const entries=[];
  const seen=new Set();
  const tagRe=/<([a-z][a-z0-9-]*)\b[^>]*\bid=["']([^"']+)["'][^>]*>/gi;
  let match;
  while((match=tagRe.exec(sourceHtml))){
    const tag=match[1].toLowerCase();
    const id=match[2];
    if(VISUAL_ROOT_IDS.has(id)||seen.has(id))continue;
    seen.add(id);
    entries.push({tag,id});
  }
  const voidTags=new Set(['img','input','br','hr','meta','link','source','area','base','col','embed','param','track','wbr']);
  const nodes=entries.map(({tag,id})=>voidTags.has(tag)?`<${tag} id="${id}">`:`<${tag} id="${id}"></${tag}>`).join('');
  return `<div id="msLegacyTelemetryBridge" hidden aria-hidden="true" data-purpose="telemetry-compat">${nodes}</div>`;
}

function compactDashboard(html){
  const dashboard=extractBalancedSection(html,'dashboard');
  if(!dashboard)return html;
  const bridge=telemetryBridgeFrom(dashboard.inner);
  const replacement=`${dashboard.openTag}\n${bridge}\n</section>`;
  return html.slice(0,dashboard.start)+replacement+html.slice(dashboard.end);
}

function ensureRwsCompat(html){
  if(/rws-compat-8233\.js/i.test(html))return html;
  const tag=`<script src="${RWS_COMPAT}"></script>`;
  return /<\/body>/i.test(html)?html.replace(/<\/body>/i,`${tag}\n</body>`):`${html}\n${tag}\n`;
}

let html=await fs.readFile(INDEX,'utf8');
const beforeBytes=Buffer.byteLength(html);

for(const file of LEGACY_SCRIPTS)html=stripTagByFile(html,file,'script');
for(const file of LEGACY_STYLES)html=stripTagByFile(html,file,'style');
html=compactDashboard(html);
html=ensureRwsCompat(html);

const dashboard=extractBalancedSection(html,'dashboard');
if(!dashboard)throw new Error('Dashboardcontainer ontbreekt na cleanup');
if(/id=["']ms71510Dashboard["']/i.test(dashboard.inner))throw new Error('Legacy ms71510-dashboard staat nog in dashboard');
if(/id=["']serenityIvms["']/i.test(dashboard.inner))throw new Error('Legacy IVMS-dashboard staat nog in dashboard');
if(!/id=["']msLegacyTelemetryBridge["']/i.test(dashboard.inner))throw new Error('Telemetrybrug ontbreekt na dashboard-cleanup');
for(const file of LEGACY_SCRIPTS){
  if(new RegExp(escapeRe(file),'i').test(html))throw new Error(`Legacy scriptreferentie staat nog in index.html: ${file}`);
}
for(const file of LEGACY_STYLES){
  if(new RegExp(escapeRe(file),'i').test(html))throw new Error(`Legacy stylereferentie staat nog in index.html: ${file}`);
}
if(!/rws-compat-8233\.js/i.test(html))throw new Error('RWS compatibiliteit ontbreekt na dashboard-cleanup');

await fs.writeFile(INDEX,html,'utf8');
for(const file of LEGACY_DEPLOY_FILES){
  await fs.rm(path.join(ROOT,file),{force:true});
}

const afterBytes=Buffer.byteLength(html);
console.log(`Alle statische legacy dashboards verwijderd uit actieve shell; telemetrybrug behouden; ${beforeBytes-afterBytes} bytes HTML opgeschoond.`);
