import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'victron-gui');
const RELEASE='v1.3.17';
const ZIP_URL=`https://github.com/victronenergy/gui-v2/releases/download/${RELEASE}/venus-webassembly.zip`;

const response=await fetch(ZIP_URL,{headers:{'user-agent':'MijnSerenity/8.21.1'}});
if(!response.ok)throw new Error(`Victron GUI download mislukt: HTTP ${response.status}`);
const zip=await JSZip.loadAsync(await response.arrayBuffer());

await fs.rm(OUT,{recursive:true,force:true});
await fs.mkdir(OUT,{recursive:true});

for(const [name,entry] of Object.entries(zip.files)){
  if(entry.dir||!name.startsWith('wasm/'))continue;
  const relative=name.slice('wasm/'.length);
  if(!relative)continue;
  const target=path.join(OUT,relative);
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.writeFile(target,await entry.async('nodebuffer'));
}

/* De release bevat de WASM als .gz. De normale GUI probeert bij netwerkproblemen
   terug te vallen op venus-gui-v2.wasm. Een byte-identieke kopie met een
   Content-Encoding:gzip header geeft die fallback zonder tientallen MB extra. */
try{
  const gz=await fs.readFile(path.join(OUT,'venus-gui-v2.wasm.gz'));
  await fs.writeFile(path.join(OUT,'venus-gui-v2.wasm'),gz);
}catch{}

const indexPath=path.join(OUT,'index.html');
let html=await fs.readFile(indexPath,'utf8');
const bridge=`
<script id="mijnserenity-victron-bridge">
(function(){
  'use strict';
  const KEY='mijnserenity-victron-gui-config-v1';
  function read(){
    const hash=new URLSearchParams(location.hash.replace(/^#/,''));
    let config=null;
    const raw=hash.get('msconfig');
    if(raw){
      try{config=JSON.parse(raw);sessionStorage.setItem(KEY,JSON.stringify(config));}catch(e){console.error('MijnSerenity Victron config:',e)}
    }
    if(!config){try{config=JSON.parse(sessionStorage.getItem(KEY)||'null')}catch{}}
    return config;
  }
  const config=read();
  if(config&&config.id&&config.shard&&config.user&&config.pass){
    const q=new URLSearchParams();
    q.set('id',String(config.id));
    q.set('shard',String(config.shard));
    q.set('user',String(config.user));
    q.set('pass',String(config.pass));
    q.set('download','vrm');
    q.set('fullscreen','1');
    q.set('colorScheme','dark');
    q.set('animationEnabled','true');
    history.replaceState(null,'',location.pathname+'?'+q.toString());
    const scrub=setInterval(function(){
      if(window.guiv2initialized===true){
        clearInterval(scrub);
        history.replaceState(null,'',location.pathname);
      }
    },500);
    setTimeout(function(){clearInterval(scrub)},120000);
  }
})();
</script>`;
html=html.replace('</head>',bridge+'\n</head>');
await fs.writeFile(indexPath,html,'utf8');
await fs.writeFile(path.join(OUT,'mijnserenity-release.txt'),`${RELEASE}\n`,'utf8');
console.log(`Victron GUI ${RELEASE} klaargezet in ${OUT}`);
