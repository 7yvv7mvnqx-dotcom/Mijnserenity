/* MijnSerenity 8.30.3 — lokale canonieke Start, zonder externe runtime of hero-chunks. */
(()=>{
  'use strict';
  if(window.__msStart8303HeroFix)return;
  window.__msStart8303HeroFix=true;

  const BUILD='8.30.3';
  const TOKEN='830300';
  const CORE=`/start-dashboard-core-8300.js?v=${TOKEN}`;
  const HERO=`/assets/serenity-hero-8274.jpg?v=${TOKEN}`;
  const HERO_FALLBACK=`/assets/serenity-home-hero-8266.jpg?v=${TOKEN}`;
  const STYLE_ID='ms8303HeroStyle';
  let corePromise=null;

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const settings=document.getElementById('settingsAppVersion');
    if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
  }

  function preloadHero(){
    if(document.querySelector('link[data-ms8303-hero-preload]'))return;
    const link=document.createElement('link');
    link.rel='preload';
    link.as='image';
    link.href=HERO;
    link.fetchPriority='high';
    link.dataset.ms8303HeroPreload='1';
    (document.head||document.documentElement).appendChild(link);
  }

  function installStyle(){
    let style=document.getElementById(STYLE_ID);
    if(!style){
      style=document.createElement('style');
      style.id=STYLE_ID;
      (document.head||document.documentElement).appendChild(style);
    }
    style.textContent=`
      #ms8210Start .ms8300-hero{
        background-image:
          linear-gradient(90deg,rgba(1,14,24,.76) 0%,rgba(1,14,24,.54) 34%,rgba(1,14,24,.20) 62%,rgba(1,14,24,.04) 100%),
          url('${HERO}'),
          url('${HERO_FALLBACK}') !important;
        background-size:cover,cover,cover !important;
        background-position:center,center center,center center !important;
        background-repeat:no-repeat !important;
      }
      #ms8210Start .ms8300-photo{
        display:block!important;
        visibility:visible!important;
        opacity:1!important;
        width:100%!important;
        height:100%!important;
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
      @media(max-width:620px){
        #ms8210Start #ms8300Theme{min-width:118px!important;height:44px!important;min-height:44px!important;padding:0 14px!important;font-size:14px!important}
      }
    `;
  }

  function loadCore(){
    if(window.__msStart8300)return Promise.resolve(true);
    if(corePromise)return corePromise;
    corePromise=new Promise(resolve=>{
      let script=document.querySelector('script[data-ms8303-core]');
      if(!script){
        script=document.createElement('script');
        script.src=CORE;
        script.async=false;
        script.dataset.ms8303Core='1';
        (document.head||document.documentElement).appendChild(script);
      }
      let finished=false;
      const done=ok=>{if(finished)return;finished=true;clearTimeout(timer);resolve(ok)};
      const timer=setTimeout(()=>done(Boolean(window.__msStart8300)),3000);
      script.addEventListener('load',()=>done(Boolean(window.__msStart8300)),{once:true});
      script.addEventListener('error',()=>done(false),{once:true});
    });
    return corePromise;
  }

  function applyHero(){
    const root=document.getElementById('ms8210Start');
    if(!root)return false;
    const photo=root.querySelector('.ms8300-photo');
    if(photo){
      photo.hidden=false;
      photo.removeAttribute('srcset');
      photo.setAttribute('loading','eager');
      photo.setAttribute('fetchpriority','high');
      if(!String(photo.src||'').includes('/assets/serenity-hero-8274.jpg'))photo.src=HERO;
      photo.onerror=()=>{
        if(!String(photo.src||'').includes('/assets/serenity-home-hero-8266.jpg'))photo.src=HERO_FALLBACK;
      };
    }
    const eyebrow=root.querySelector('.ms8300-eyebrow');
    if(eyebrow&&eyebrow.textContent!=='WELKOM TERUG')eyebrow.textContent='WELKOM TERUG';
    document.querySelectorAll('#ms8287ReleaseControls,#ms8286ReleaseControls,#ms8285ReleaseControls,#ms8290ReleaseControls').forEach(node=>node.remove());
    return true;
  }

  function polish(){
    syncBuild();
    installStyle();
    window.ms8300RefreshStart?.();
    return applyHero();
  }

  function watch(){
    let queued=false;
    const queue=()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;polish();});
    };
    ['pageshow','orientationchange','mijnserenity:routechange','mijnserenity:dashboard-ready','mijnserenity:boot-complete']
      .forEach(type=>window.addEventListener(type,queue,{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue();},{passive:true});
    setTimeout(queue,80);
    setTimeout(queue,350);
  }

  async function boot(){
    preloadHero();
    installStyle();
    const ok=await loadCore();
    if(!ok)console.error('MijnSerenity: lokale Start-runtime kon niet worden geladen.');
    syncBuild();
    polish();
    watch();
    window.dispatchEvent(new CustomEvent('mijnserenity:hero-ready',{detail:{build:BUILD,hero:'local-8274'}}));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
