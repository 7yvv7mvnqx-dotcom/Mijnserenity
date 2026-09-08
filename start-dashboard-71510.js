/* MijnSerenity 8.30.2 — behoud canonieke 8.30 Start en herstel de scherpe Serenity-headerfoto. */
(()=>{
  'use strict';
  if(window.__msStart8302HeroFix)return;
  window.__msStart8302HeroFix=true;

  const BUILD='8.30.2';
  const TOKEN='830200';
  const BASE_RUNTIME='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@4cbe8b1c08205475a8f59e470f5eb193a0ba808c/start-dashboard-71510.js?v=830200-base';
  const HERO_COMMIT='b348a16f729e4e330038d57955aff82e4ed1e88c';
  const HERO_CACHE='mijnserenity.hero.8281.reference.v1';
  const HERO_CHUNKS=13;
  const STYLE_ID='ms8302HeroReferenceStyle';
  let heroBusy=false;
  let heroReady=false;

  function loadBaseRuntime(){
    return new Promise(resolve=>{
      if(window.__msStart8300){resolve();return;}
      let script=document.querySelector('script[data-ms8302-base]');
      if(script){
        script.addEventListener('load',()=>resolve(),{once:true});
        script.addEventListener('error',()=>resolve(),{once:true});
        setTimeout(resolve,6500);
        return;
      }
      script=document.createElement('script');
      script.src=BASE_RUNTIME;
      script.async=false;
      script.crossOrigin='anonymous';
      script.dataset.ms8302Base='1';
      script.onload=resolve;
      script.onerror=()=>{console.error('MijnSerenity: canonieke Start-runtime kon niet worden geladen.');resolve();};
      (document.head||document.documentElement).appendChild(script);
      setTimeout(resolve,6500);
    });
  }

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta&&meta.content!==BUILD)meta.content=BUILD;
    const settings=document.getElementById('settingsAppVersion');
    if(settings&&settings.textContent!==BUILD)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>{if(node.textContent!==BUILD)node.textContent=BUILD;});
  }

  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      /* De bestaande header blijft staan; alleen beeld, positionering en rechter bediening worden gecorrigeerd. */
      #ms8210Start .ms8300-photo{
        display:block!important;
        visibility:visible!important;
        opacity:1!important;
        object-fit:cover!important;
        object-position:center center!important;
        image-rendering:auto!important;
        filter:none!important;
        transform:none!important;
      }
      #ms8210Start .ms8300-overlay{
        background:
          linear-gradient(90deg,rgba(1,14,24,.78) 0%,rgba(1,14,24,.58) 32%,rgba(1,14,24,.24) 58%,rgba(1,14,24,.06) 82%,rgba(1,14,24,.02) 100%),
          linear-gradient(0deg,rgba(1,12,20,.58) 0%,rgba(1,12,20,.09) 50%,rgba(1,12,20,.02) 76%)!important;
      }
      #ms8210Start .ms8300-actions{max-width:none!important;flex-wrap:nowrap!important}
      #ms8210Start .ms8300-actions>.ms8300-action:not(#ms8300Theme){display:none!important;visibility:hidden!important}
      #ms8210Start #ms8300Theme{
        display:flex!important;
        visibility:visible!important;
        min-width:146px!important;
        height:54px!important;
        min-height:54px!important;
        padding:0 20px!important;
        border-radius:999px!important;
        background:rgba(2,32,51,.90)!important;
        font-size:17px!important;
        font-weight:850!important;
      }
      #ms8210Start .ms8300-eyebrow{letter-spacing:.20em!important}
      @media(min-width:900px) and (orientation:landscape){
        #ms8210Start .ms8300-photo{object-position:center center!important}
        #ms8210Start .ms8300-copy{width:min(700px,50%)!important}
      }
      @media(max-width:620px){
        #ms8210Start #ms8300Theme{min-width:118px!important;height:44px!important;min-height:44px!important;padding:0 14px!important;font-size:14px!important}
      }
    `;
    (document.head||document.documentElement).appendChild(style);
  }

  function cachedHero(){
    try{
      const value=localStorage.getItem(HERO_CACHE)||'';
      return value.startsWith('/9j/')&&value.length>60000?value:'';
    }catch{return '';}
  }

  function saveHero(value){
    try{if(value&&value.length<1500000)localStorage.setItem(HERO_CACHE,value)}catch{}
  }

  async function fetchHeroChunk(index){
    const part=String(index).padStart(2,'0');
    const path=`assets/serenity-hero-8281-${part}.txt`;
    const urls=[
      `https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@${HERO_COMMIT}/${path}`,
      `https://raw.githubusercontent.com/7yvv7mvnqx-dotcom/Mijnserenity/${HERO_COMMIT}/${path}`
    ];
    let lastError=null;
    for(const url of urls){
      try{
        const response=await fetch(url,{mode:'cors',cache:'force-cache'});
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
        const text=(await response.text()).replace(/\s+/g,'');
        if(!text)throw new Error('leeg beelddeel');
        return text;
      }catch(error){lastError=error;}
    }
    throw lastError||new Error(`Serenity beelddeel ${part} ontbreekt`);
  }

  async function heroBase64(){
    const cached=cachedHero();
    if(cached)return cached;
    const parts=await Promise.all(Array.from({length:HERO_CHUNKS},(_,i)=>fetchHeroChunk(i+1)));
    const joined=parts.join('').replace(/\s+/g,'');
    if(!joined.startsWith('/9j/')||joined.length<60000)throw new Error('Serenity referentiebeeld is onvolledig');
    saveHero(joined);
    return joined;
  }

  async function applyHero(){
    if(heroBusy||heroReady)return;
    const photo=document.querySelector('#ms8210Start .ms8300-photo');
    if(!photo)return;
    heroBusy=true;

    /* Nooit meer eerst de zwaar gepixelde 8275-versie tonen. */
    if(!String(photo.src||'').startsWith('data:image/jpeg;base64,')){
      photo.src=`/assets/serenity-hero-8274.jpg?v=${TOKEN}`;
    }

    try{
      const base64=await heroBase64();
      const src=`data:image/jpeg;base64,${base64}`;
      if(photo.src!==src){
        photo.src=src;
        photo.removeAttribute('srcset');
        try{await photo.decode?.()}catch{}
      }
      photo.dataset.msHero='reference-8281';
      heroReady=true;
    }catch(error){
      console.warn('MijnSerenity: scherpe Serenity-foto kon niet worden hersteld; veilige fallback actief.',error);
      photo.src=`/assets/serenity-hero-8274.jpg?v=${TOKEN}`;
    }finally{
      heroBusy=false;
    }
  }

  function polish(){
    syncBuild();
    installStyle();
    const root=document.getElementById('ms8210Start');
    if(!root)return false;

    const eyebrow=root.querySelector('.ms8300-eyebrow');
    if(eyebrow&&eyebrow.textContent!=='WELKOM TERUG')eyebrow.textContent='WELKOM TERUG';

    /* Verwijder alleen oude zwevende releaseknoppen die nog boven de huidige header kunnen hangen. */
    document.querySelectorAll('#ms8287ReleaseControls,#ms8286ReleaseControls,#ms8285ReleaseControls,#ms8290ReleaseControls').forEach(node=>node.remove());
    applyHero();
    return true;
  }

  function watch(){
    let queued=false;
    const queue=()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{
        queued=false;
        polish();
      });
    };
    const dashboard=document.getElementById('dashboard');
    if(dashboard){
      const observer=new MutationObserver(queue);
      observer.observe(dashboard,{childList:true,subtree:true});
    }
    window.addEventListener('pageshow',queue,{passive:true});
    window.addEventListener('mijnserenity:routechange',queue,{passive:true});
    setTimeout(queue,300);
    setTimeout(queue,1200);
  }

  async function boot(){
    installStyle();
    await loadBaseRuntime();
    syncBuild();
    polish();
    watch();
    window.dispatchEvent(new CustomEvent('mijnserenity:hero-ready',{detail:{build:BUILD,hero:'reference-8281'}}));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
