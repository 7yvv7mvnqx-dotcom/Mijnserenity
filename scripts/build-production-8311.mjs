import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const DIST=path.join(ROOT,'dist');
const BUILD='8.31.1';
const TOKEN='831100';

const EXCLUDED_DIRS=new Set([
  '.git','.github','node_modules','ios','dist','tests','docs','scripts'
]);

/* Alleen bewezen verouderde visuele lagen worden uit productie gehouden.
   Functionele modules met oude versienummers blijven staan zolang de actuele
   bootstrap of route-loader ze nog gebruikt. */
const LEGACY_VISUAL_FILES=new Set([
  '.DS_Store',
  'dashboard-analog-7141.js','dashboard-analog-7141.css',
  'dashboard-premium-7143.js','dashboard-premium-7143.css',
  'start-cockpit-7144.js','start-cockpit-7144.css',
  'futuristic-analog-7140.js','futuristic-analog-7140.css',
  'serenity-ivms.css',
  'dashboard-cockpit-portal.js',
  'dashboard-ais-map-71824.js','dashboard-ais-map-71825.js',
  'dashboard-alarm-live-fix-71540.js',
  'dashboard-energy-live-fix-71537.js',
  'dashboard-navigation-71548.js','dashboard-navigation-71548.css',
  'dashboard-pro-71531-loader.js','dashboard-pro-71531.js','dashboard-pro-71531.css',
  'dashboard-pro-71700.js',
  'dashboard-rudder-icons-fix-71545.js',
  'dashboard-visual-71523.css',
  'dashboard-wind-direction-fix-71541.js',
  'serenity-theme-8310.css','serenity-theme-8310.js',
  'iphone-landscape-8301.css','iphone-compact-7132.css','iphone-experience.css',
  'mijnserenity-6-responsive.css',
  'marine-glass-fixes-7193.css','marine-glass-mobile-7182.css','marine-glass-mobile-7184.css',
  'marine-glass-polish-7185.css','marine-glass-polish-7185.js','marine-glass-start-fix-71801.js',
  'mobile-dashboard-7161.css','mobile-dashboard-7161.js','mobile-viewport-guard-71911.js',
  'professional-ui-71700.css',
  'simple-accessible.css','simple-accessible.js',
  'serenity-control-dashboard.css','serenity-control-dashboard.js',
  'start-dashboard-71510.css','start-dashboard-71510.js',
  'start-dashboard-71900-bridge.js','start-dashboard-core-8300.js'
]);

function isNonRuntimeFile(relative,name){
  if(LEGACY_VISUAL_FILES.has(name))return true;
  if(/\.(?:md|sql)$/i.test(name))return true;
  if(/^(?:README|RELEASE|LEESMIJ|CONTROLE|STABILITY|VERIFICATION|MIGRATION|CHANGELOG)[._-]/i.test(name))return true;
  if(/^(?:preview_iphone|head-snippet)\.html$/i.test(name))return true;
  if(/^\.env(?:\.|$)/i.test(name))return true;
  /* De root-ais.mjs is een historische kopie; Netlify gebruikt netlify/functions/ais.mjs. */
  if(relative==='ais.mjs')return true;
  return false;
}

async function copyTree(source,target,relative=''){
  const entries=await fs.readdir(source,{withFileTypes:true});
  await fs.mkdir(target,{recursive:true});
  for(const entry of entries){
    const rel=relative?`${relative}/${entry.name}`:entry.name;
    const src=path.join(source,entry.name);
    const dst=path.join(target,entry.name);
    if(entry.isDirectory()){
      if(EXCLUDED_DIRS.has(entry.name))continue;
      await copyTree(src,dst,rel);
      continue;
    }
    if(isNonRuntimeFile(rel,entry.name))continue;
    await fs.copyFile(src,dst);
  }
}

function findBalancedElement(html,id,tag){
  const openRe=new RegExp(`<${tag}\\b[^>]*\\bid=["']${id}["'][^>]*>`,'i');
  const match=openRe.exec(html);
  if(!match)return null;
  const start=match.index;
  const openEnd=start+match[0].length;
  const tokenRe=new RegExp(`<\\/?${tag}\\b[^>]*>`,'gi');
  tokenRe.lastIndex=start;
  let depth=0;
  let token;
  while((token=tokenRe.exec(html))){
    const closing=/^<\//.test(token[0]);
    depth+=closing?-1:1;
    if(depth===0){
      return {
        start,
        openEnd,
        closeStart:token.index,
        end:tokenRe.lastIndex,
        outer:html.slice(start,tokenRe.lastIndex),
        inner:html.slice(openEnd,token.index)
      };
    }
  }
  throw new Error(`Ongebalanceerd <${tag}> element: #${id}`);
}

function stripLocalStyles(html){
  return html.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["'](?!https?:\/\/)([^"']+)["'][^>]*>\s*/gi,(tag,href)=>{
    const clean=String(href).split('?')[0].replace(/^\//,'');
    return clean==='styles.css'||clean==='serenity-theme-8311.css'?tag:'';
  });
}

function stripLegacyBottomScripts(html){
  const files=[
    'start-dashboard-71510.js','poi-regio-filter-71511.js','wind-direction-71512.js',
    'ruuvi-climate.js','victron-energy-71559.js','ais-gps-fix-8221.js','rws-compat-8233.js'
  ];
  for(const file of files){
    const escaped=file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const re=new RegExp(`<script\\b[^>]*src=["'][^"']*${escaped}[^"']*["'][^>]*><\\/script>\\s*`,'gi');
    html=html.replace(re,'');
  }
  return html;
}

function canonicaliseDashboard(html){
  const bridge=findBalancedElement(html,'msLegacyTelemetryBridge','div');
  const dashboard=findBalancedElement(html,'dashboard','section');
  if(!dashboard)throw new Error('Dashboard-shell ontbreekt in index.html.');
  const bridgeHtml=bridge?.outer||
    '<div id="msLegacyTelemetryBridge" hidden aria-hidden="true" data-purpose="telemetry-compat"></div>';
  return html.slice(0,dashboard.openEnd)+`\n${bridgeHtml}\n`+html.slice(dashboard.closeStart);
}

function transformIndex(html){
  html=html.replace(/<meta\s+name=["']mijnserenity-build["']\s+content=["'][^"']*["']\s*\/?\s*>/i,
    `<meta name="mijnserenity-build" content="${BUILD}">`);
  html=html.replace(/window\.MIJSERENITY_BUILD\s*=\s*['"][^'"]+['"]/g,
    `window.MIJSERENITY_BUILD='${BUILD}'`);
  html=html.replace(/<script\s+id=["']ms7150-vrm-runtime["'][^>]*>[\s\S]*?<\/script>\s*/i,'');
  html=stripLegacyBottomScripts(html);
  html=stripLocalStyles(html);
  html=canonicaliseDashboard(html);

  const canonicalHead=`
<link rel="preload" as="image" href="/assets/serenity-hero-8274.jpg?v=${TOKEN}" fetchpriority="high">
<link rel="stylesheet" href="/serenity-theme-8311.css?v=${TOKEN}">
<style id="ms8311-first-paint">
  html,body,main,#appView,#dashboard{width:100%;max-width:none;min-width:0;margin:0}
  html,body{overflow-x:hidden}
  #msLegacyTelemetryBridge{display:none!important}
</style>
<script>
window.MIJSERENITY_BUILD='${BUILD}';
window.__msDisableLegacyVisuals=true;
document.documentElement.dataset.msBuild='${BUILD}';
</script>`;
  html=html.replace('</head>',`${canonicalHead}\n</head>`);

  html=html.replace(/<script\s+src=["']auth-bootstrap\.js\?v=[^"']+["']><\/script>/i,
    `<script src="/state-migration-8311.js?v=${TOKEN}"></script>\n<script src="/route-assets-8311.js?v=${TOKEN}"></script>\n<script src="/auth-bootstrap.js?v=${TOKEN}"></script>`);

  return html;
}

function transformBaseCss(css){
  /* De oude 980px container was de oorzaak van het smalle dashboard op iPad-landscape/desktop. */
  css=css.replace(/main\s*\{\s*max-width\s*:\s*980px\s*;\s*margin\s*:\s*auto\s*;\s*padding\s*:\s*14px\s*;?\s*\}/i,
    'main{width:100%;max-width:none;min-width:0;margin:0;padding:0}');
  return css;
}

await fs.rm(DIST,{recursive:true,force:true});
await copyTree(ROOT,DIST);

const indexPath=path.join(DIST,'index.html');
let html=await fs.readFile(indexPath,'utf8');
html=transformIndex(html);
await fs.writeFile(indexPath,html,'utf8');

const cssPath=path.join(DIST,'styles.css');
let css=await fs.readFile(cssPath,'utf8');
css=transformBaseCss(css);
await fs.writeFile(cssPath,css,'utf8');

/* Bronconfiguratie hoort niet in de browserbundle. */
await Promise.allSettled([
  fs.rm(path.join(DIST,'netlify.toml'),{force:true}),
  fs.rm(path.join(DIST,'package.json'),{force:true}),
  fs.rm(path.join(DIST,'package-lock.json'),{force:true}),
  fs.rm(path.join(DIST,'capacitor.config.ts'),{force:true}),
  fs.rm(path.join(DIST,'capacitor.config.json'),{force:true})
]);

const required=[
  'index.html','styles.css','manifest.json','auth-bootstrap.js','app.js','sw.js',
  'start-dashboard-core-8311.js','serenity-theme-8311.css','serenity-theme-8311.js',
  'state-migration-8311.js','route-assets-8311.js',
  'mission-control.js','route-control.js','easy-auto.js',
  'dashboard-unified-71919-loader.js',
  'assets/serenity-hero-8274.jpg'
];
for(const file of required)await fs.access(path.join(DIST,file));

for(const legacy of LEGACY_VISUAL_FILES){
  try{
    await fs.access(path.join(DIST,legacy));
    throw new Error(`Legacy bestand staat nog in dist: ${legacy}`);
  }catch(error){
    if(error?.code!=='ENOENT')throw error;
  }
}

const published=await fs.readdir(DIST,{recursive:true});
console.log(`MijnSerenity ${BUILD}: schone productiebuild gemaakt (${published.length} items in dist/).`);