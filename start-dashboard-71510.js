/* MijnSerenity 8.26.8 — originele Serenity-foto als volledige Start-header. */
(()=>{
  'use strict';
  if(window.__ms8268OriginalHero)return;
  window.__ms8268OriginalHero=true;

  const BUILD='8.26.8';
  const PRIOR='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@de78ddf4fba781d312d7aa109c0f06f3e358e49d/start-dashboard-71510.js?v=826500';
  const PARTS=Array.from({length:7},(_,i)=>`/assets/serenity-original-8268-0${i+1}.txt?v=826800`);
  const STYLE_ID='ms8268OriginalHeroStyle';
  let heroDataUrl='';
  let heroPromise=null;

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const version=document.getElementById('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
  }

  function loadPrior(){
    return new Promise(resolve=>{
      if(window.__msStartStatus8265){resolve();return;}
      const existing=document.querySelector('script[data-ms8268-prior]');
      if(existing){
        existing.addEventListener('load',resolve,{once:true});
        setTimeout(resolve,4000);
        return;
      }
      const script=document.createElement('script');
      script.src=PRIOR;
      script.async=false;
      script.crossOrigin='anonymous';
      script.dataset.ms8268Prior='1';
      script.onload=resolve;
      script.onerror=()=>{
        console.error('MijnSerenity 8.26.5 basis kon niet worden geladen.');
        resolve();
      };
      (document.head||document.documentElement).appendChild(script);
      setTimeout(resolve,4000);
    });
  }

  async function loadOriginalPhoto(){
    if(heroDataUrl)return heroDataUrl;
    if(heroPromise)return heroPromise;
    heroPromise=(async()=>{
      const chunks=await Promise.all(PARTS.map(async url=>{
        const response=await fetch(url,{cache:'no-store',credentials:'same-origin'});
        if(!response.ok)throw new Error(`Serenity-fotodeel ${response.status}`);
        return (await response.text()).trim();
      }));
      const base64=chunks.join('').replace(/\s+/g,'');
      if(!base64.startsWith('/9j/')||!base64.endsWith('/9Q=='))throw new Error('Ongeldige Serenity JPEG');
      heroDataUrl=`data:image/jpeg;base64,${base64}`;
      return heroDataUrl;
    })().catch(error=>{
      console.error('Originele Serenity-foto kon niet worden opgebouwd.',error);
      heroPromise=null;
      return '';
    });
    return heroPromise;
  }

  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      html #dashboard .ms71514-hero.ms8268-home-hero,
      html #ms8210Start .ms8234-header.ms8268-home-hero{
        position:relative!important;
        overflow:hidden!important;
        isolation:isolate!important;
        background-image:
          linear-gradient(90deg,rgba(2,14,22,.72) 0%,rgba(2,14,22,.44) 35%,rgba(2,14,22,.08) 68%,rgba(2,14,22,.18) 100%),
          linear-gradient(0deg,rgba(1,10,18,.55) 0%,rgba(1,10,18,0) 58%),
          var(--ms8268-hero-image)!important;
        background-size:cover!important;
        background-position:center 52%!important;
        background-repeat:no-repeat!important;
        color:#f4fbff!important;
        border-color:rgba(57,201,244,.34)!important;
        text-shadow:0 2px 12px rgba(0,0,0,.52)!important;
      }
      html #dashboard .ms71514-hero.ms8268-home-hero::after{
        background:linear-gradient(180deg,rgba(2,12,20,.02),rgba(2,13,20,.50))!important;
      }
      html #ms8210Start .ms8234-header.ms8268-home-hero::before,
      html #ms8210Start .ms8234-header.ms8268-home-hero::after{
        opacity:0!important;
        background:none!important;
      }
      html #ms8210Start .ms8263-vrijon-hero,
      html #ms8210Start .ms8263-vrijon-lockup,
      html #ms8210Start .ms8263-vrijon-svg{
        display:none!important;
      }
      html #ms8210Start .ms8234-header.ms8268-home-hero .ms8234-brand{
        position:relative!important;
        z-index:2!important;
        color:#39c9f4!important;
      }
      html #ms8210Start .ms8234-header.ms8268-home-hero .ms8234-brand h1,
      html #ms8210Start .ms8234-header.ms8268-home-hero .ms8218-serenity-brand,
      html #ms8210Start .ms8234-header.ms8268-home-hero .ms8218-brand-lockup{
        color:#39c9f4!important;
        font-family:Georgia,"Times New Roman",serif!important;
        text-shadow:0 3px 18px rgba(0,0,0,.60)!important;
      }
      html #ms8210Start .ms8234-header.ms8268-home-hero .ms8254-tagline{
        color:#f5fbff!important;
        text-shadow:0 2px 10px rgba(0,0,0,.70)!important;
      }
      html #ms8210Start .ms8234-header.ms8268-home-hero .ms8234-greeting{
        color:#fff!important;
        text-shadow:0 2px 12px rgba(0,0,0,.72)!important;
      }
      html #ms8210Start .ms8234-header.ms8268-home-hero .ms8245-date{
        color:#b9ccda!important;
        text-shadow:0 2px 10px rgba(0,0,0,.68)!important;
      }
      html #ms8210Start .ms8234-header.ms8268-home-hero .ms8234-attention{
        background:rgba(3,31,49,.88)!important;
        border-color:rgba(57,201,244,.30)!important;
        color:#f4fbff!important;
        box-shadow:0 16px 38px rgba(0,0,0,.30),inset 0 1px 0 rgba(255,255,255,.04)!important;
        backdrop-filter:blur(16px) saturate(120%)!important;
        -webkit-backdrop-filter:blur(16px) saturate(120%)!important;
      }
      html #ms8210Start .ms8234-header.ms8268-home-hero .ms8234-attention-copy strong{color:#fff!important}
      html #ms8210Start .ms8234-header.ms8268-home-hero .ms8234-attention-copy small{color:#adc1cf!important}
      html #dashboard .ms71514-hero.ms8268-home-hero>img{opacity:0!important}
      @media(max-width:620px){
        html #dashboard .ms71514-hero.ms8268-home-hero,
        html #ms8210Start .ms8234-header.ms8268-home-hero{
          background-position:center 50%!important;
        }
      }
    `;
    (document.head||document.documentElement).appendChild(style);
  }

  function applyPhoto(target,url){
    if(!target||!url)return;
    target.classList.add('ms8268-home-hero');
    target.style.setProperty('--ms8268-hero-image',`url("${url}")`);
    target.dataset.msHeroBuild='8268';
  }

  function modernHeader(){
    const root=document.getElementById('ms8210Start');
    return root?.querySelector('.ms8234-header')||root?.querySelector('.ms8210-header')||null;
  }

  async function applyHero(){
    installStyle();
    const url=await loadOriginalPhoto();
    if(!url)return;
    applyPhoto(document.querySelector('#dashboard .ms71514-hero'),url);
    applyPhoto(modernHeader(),url);
  }

  function refresh(){
    syncBuild();
    void applyHero();
  }

  function watch(){
    refresh();
    const root=document.body||document.documentElement;
    if(!root)return;
    const observer=new MutationObserver(()=>requestAnimationFrame(refresh));
    observer.observe(root,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),15000);
  }

  loadPrior().finally(()=>{
    watch();
    [0,250,800,1800,3500].forEach(delay=>setTimeout(refresh,delay));
  });

  ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:start-requested','mijnserenity:routechange','pageshow']
    .forEach(type=>window.addEventListener(type,()=>requestAnimationFrame(refresh),{passive:true}));
})();
