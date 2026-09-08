import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const DIST=path.join(ROOT,'dist');
const BUILD='8.31.1';
const TOKEN='831100';

const EXCLUDED_DIRS=new Set([
  '.git','.github','node_modules','ios','dist','tests','docs','scripts'
]);
const EXCLUDED_FILES=new Set([
  '.DS_Store',
  'dashboard-analog-7141.js','dashboard-analog-7141.css',
  'dashboard-premium-7143.js','dashboard-premium-7143.css',
  'start-cockpit-7144.js','start-cockpit-7144.css',
  'futuristic-analog-7140.js','serenity-ivms.css',
  'iphone-landscape-8301.css'
]);

async function copyTree(source,target,relative=''){
  const entries=await fs.readdir(source,{withFileTypes:true});
  await fs.mkdir(target,{recursive:true});
  for(const entry of entries){
    if(entry.name==='.DS_Store')continue;
    const rel=relative?`${relative}/${entry.name}`:entry.name;
    const src=path.join(source,entry.name);
    const dst=path.join(target,entry.name);
    if(entry.isDirectory()){
      if(EXCLUDED_DIRS.has(entry.name))continue;
      await copyTree(src,dst,rel);
      continue;
    }
    if(EXCLUDED_FILES.has(entry.name))continue;
    await fs.copyFile(src,dst);
  }
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
    const re=new RegExp(`<script\\b[^>]*src=["'][^"']*${file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}[^"']*["'][^>]*><\\/script>\\s*`,'gi');
    html=html.replace(re,'');
  }
  return html;
}
function transformIndex(html){
  html=html.replace(/<meta\s+name=["']mijnserenity-build["']\s+content=["'][^"']*["']\s*\/?\s*>/i,`<meta name="mijnserenity-build" content="${BUILD}">`);
  html=html.replace(/window\.MIJSERENITY_BUILD\s*=\s*['"][^'"]+['"]/g,`window.MIJSERENITY_BUILD='${BUILD}'`);
  html=html.replace(/<script\s+id=["']ms7150-vrm-runtime["'][^>]*>[\s\S]*?<\/script>\s*/i,'');
  html=stripLegacyBottomScripts(html);
  html=stripLocalStyles(html);

  const canonicalHead=`
<link rel="preload" as="image" href="/assets/serenity-hero-8274.jpg?v=${TOKEN}" fetchpriority="high">
<link rel="stylesheet" href="/serenity-theme-8311.css?v=${TOKEN}">
<style id="ms8311-first-paint">
  html,body,main,#appView,#dashboard{width:100%;max-width:none;min-width:0;margin:0}
  html,body{overflow-x:hidden}
  #dashboard> :not(#ms8210Start):not(#msLegacyTelemetryBridge){display:none!important}
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
  /* Verwijder de historische mobiele containerlimiet die desktop/iPad-landscape tot 980px kneep. */
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
  'index.html','styles.css','auth-bootstrap.js','app.js','sw.js',
  'start-dashboard-core-8311.js','serenity-theme-8311.css','serenity-theme-8311.js',
  'state-migration-8311.js','route-assets-8311.js','mission-control.js','route-control.js','easy-auto.js',
  'assets/serenity-hero-8274.jpg'
];
for(const file of required){
  await fs.access(path.join(DIST,file));
}
for(const legacy of EXCLUDED_FILES){
  try{await fs.access(path.join(DIST,legacy));throw new Error(`Legacy bestand staat nog in dist: ${legacy}`)}catch(error){
    if(error?.code!=='ENOENT')throw error;
  }
}

console.log(`MijnSerenity ${BUILD}: schone productiebuild gemaakt in dist/.`);