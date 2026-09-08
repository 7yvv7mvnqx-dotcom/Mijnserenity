/* MijnSerenity 8.28.6 — één stabiele Serenity-header, zonder dubbele hero of kapotte foto. */
(()=>{
  'use strict';
  if(window.__ms8286StartFix)return;
  window.__ms8286StartFix=true;

  const BUILD='8.28.6';
  const PRIOR='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@0261da95450099f9fef74f16b8ba20acd0f9e507/start-dashboard-71510.js?v=828600';
  const PHOTO_PRIMARY='/assets/serenity-hero-8275.jpg?v=828600';
  const PHOTO_FALLBACK='/assets/serenity-home-hero-8266.jpg?v=828600';
  const ACTIVE_CLASS='ms8286-modern-start-active';
  const HIDDEN_ATTR='data-ms8286-legacy-hidden';
  const CONTROLS_ID='ms8286ReleaseControls';
  const STYLE_ID='ms8286StartFixStyle';

  let rootObserver=null;
  let dashboardObserver=null;
  let appObserver=null;
  let startInitialised=false;
  let startInitialising=false;

  const norm=value=>String(value||'').replace(/\s+/g,' ').trim();

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const version=document.getElementById('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
    const badge=document.querySelector(`#${CONTROLS_ID} .ms8286-version`);
    if(badge)badge.textContent=`v${BUILD}`;
  }

  function appVisible(){
    const app=document.getElementById('appView');
    return Boolean(app&&!app.classList.contains('hidden'));
  }

  function dashboardVisible(){
    if(!appVisible())return false;
    const dashboard=document.getElementById('dashboard');
    if(!dashboard||dashboard.classList.contains('hidden')||dashboard.getAttribute('aria-hidden')==='true')return false;
    try{
      const style=getComputedStyle(dashboard);
      return style.display!=='none'&&style.visibility!=='hidden';
    }catch{return true;}
  }

  function openMore(){
    try{
      if(typeof window.ms797OpenMore==='function')return window.ms797OpenMore();
      const legacy=document.querySelector('#ms71510Dashboard .ms71510-more,.ms71510-more');
      if(legacy)return legacy.click();
      console.warn('MijnSerenity: Meer-menu is nog niet beschikbaar.');
    }catch(error){console.warn('MijnSerenity: Meer-menu openen mislukt.',error);}
  }

  function ensureReleaseControls(){
    if(!appVisible())return null;
    document.getElementById('ms8285ReleaseControls')?.remove();
    let controls=document.getElementById(CONTROLS_ID);
    if(!controls){
      controls=document.createElement('div');
      controls.id=CONTROLS_ID;
      controls.setAttribute('aria-label','MijnSerenity versie en menu');
      controls.innerHTML=`<span class="ms8286-version">v${BUILD}</span><button type="button" class="ms8286-more" aria-label="Meer opties openen"><span aria-hidden="true">☰</span><strong>Meer</strong></button>`;
      document.body.appendChild(controls);
      controls.querySelector('.ms8286-more')?.addEventListener('click',openMore);
    }
    syncReleaseControls();
    return controls;
  }

  function syncReleaseControls(){
    const controls=document.getElementById(CONTROLS_ID);
    if(!controls)return;
    const showApp=appVisible();
    const showMore=dashboardVisible();
    controls.classList.toggle('is-app-visible',showApp);
    controls.setAttribute('aria-hidden',showApp?'false':'true');
    const more=controls.querySelector('.ms8286-more');
    if(more)more.hidden=!showMore;
  }

  function installStyle(){
    document.getElementById('ms8285StartFixStyle')?.remove();
    let style=document.getElementById(STYLE_ID);
    if(!style){
      style=document.createElement('style');
      style.id=STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent=`
      /* De moderne header is de enige start-hero. */
      #dashboard.${ACTIVE_CLASS} [${HIDDEN_ATTR}]{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important;pointer-events:none!important}
      #dashboard.${ACTIVE_CLASS} .ms71514-hero{display:none!important;visibility:hidden!important}

      /* Gebruik de echte JPG rechtstreeks als achtergrond. Geen grote data-URI meer: dat voorkwam Safari-breekbeelden. */
      #ms8210Start .ms8280-header{
        display:flex!important;
        visibility:visible!important;
        opacity:1!important;
        min-height:0!important;
        padding:clamp(22px,2.8vw,34px)!important;
        background-color:#031522!important;
        background-image:url('${PHOTO_PRIMARY}'),url('${PHOTO_FALLBACK}')!important;
        background-size:cover!important;
        background-position:center 54%!important;
        background-repeat:no-repeat!important;
      }
      #ms8210Start .ms8280-photo{display:none!important;visibility:hidden!important;opacity:0!important}
      #ms8210Start .ms8280-overlay{
        display:block!important;
        visibility:visible!important;
        opacity:1!important;
        background:
          linear-gradient(90deg,rgba(1,14,24,.95) 0%,rgba(1,14,24,.80) 31%,rgba(1,14,24,.45) 58%,rgba(1,14,24,.18) 78%,rgba(1,14,24,.08) 100%),
          linear-gradient(0deg,rgba(1,12,20,.78) 0%,rgba(1,12,20,.18) 50%,rgba(1,12,20,.04) 74%)!important;
      }

      /* Branding blijft ook in iPad/PWA-volledig-scherm zichtbaar. */
      #ms8210Start .ms8280-topbar{display:grid!important;visibility:visible!important;opacity:1!important}
      #ms8210Start .ms8280-brand{display:block!important;visibility:visible!important;opacity:1!important}
      #ms8210Start .ms8280-brand-title,
      #ms8210Start .ms8280-brand-tagline{display:block!important;visibility:visible!important;opacity:1!important}

      /* Compactere compositie: geen groot leeg donker vlak meer. */
      #ms8210Start .ms8280-content{
        width:min(650px,68%)!important;
        margin-top:clamp(38px,5vw,68px)!important;
      }
      #ms8210Start .ms8280-title{font-size:clamp(44px,5vw,64px)!important}
      #ms8210Start .ms8280-subtitle{margin-top:12px!important;margin-bottom:16px!important}
      #ms8210Start .ms8280-live-button{min-height:60px!important}
      #ms8210Start .ms8280-status-grid{margin-top:12px!important}

      #${CONTROLS_ID}{position:fixed!important;z-index:2147483200!important;top:calc(env(safe-area-inset-top,0px) + 7px)!important;left:max(10px,env(safe-area-inset-left,0px))!important;right:max(10px,env(safe-area-inset-right,0px))!important;display:none!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;pointer-events:none!important;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif!important}
      #${CONTROLS_ID}.is-app-visible{display:flex!important}
      #${CONTROLS_ID} .ms8286-version{pointer-events:auto!important;display:inline-flex!important;align-items:center!important;min-height:28px!important;padding:5px 9px!important;border:1px solid rgba(102,220,255,.26)!important;border-radius:999px!important;background:rgba(2,22,35,.80)!important;color:#98e7ff!important;box-shadow:0 6px 18px rgba(0,0,0,.24)!important;-webkit-backdrop-filter:blur(14px) saturate(130%)!important;backdrop-filter:blur(14px) saturate(130%)!important;font-size:11px!important;line-height:1!important;font-weight:850!important;letter-spacing:.035em!important}
      #${CONTROLS_ID} .ms8286-more{pointer-events:auto!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;min-height:38px!important;padding:8px 12px!important;margin:0!important;border:1px solid rgba(102,220,255,.30)!important;border-radius:14px!important;background:rgba(2,27,43,.90)!important;color:#fff!important;box-shadow:0 7px 20px rgba(0,0,0,.28)!important;-webkit-backdrop-filter:blur(14px) saturate(130%)!important;backdrop-filter:blur(14px) saturate(130%)!important;font-size:13px!important;line-height:1!important;font-weight:850!important}
      #${CONTROLS_ID} .ms8286-more[hidden]{display:none!important}
      #${CONTROLS_ID} .ms8286-more span{font-size:16px!important;line-height:1!important}
      #${CONTROLS_ID} .ms8286-more:active{transform:scale(.97)!important}

      @media(min-width:761px){
        #${CONTROLS_ID}{top:12px!important;left:14px!important;right:14px!important}
      }
      @media(min-width:900px){
        #ms8210Start .ms8280-header{background-position:center 52%!important}
        #ms8210Start .ms8280-content{margin-top:clamp(40px,4.5vw,62px)!important}
      }
      @media(max-width:760px){
        #ms8210Start .ms8280-header{background-position:62% 54%!important}
      }
      @media(max-width:620px) and (orientation:portrait){
        #ms8210Start .ms8280-header{padding:18px 16px 20px!important;background-position:66% 52%!important}
        #ms8210Start .ms8280-content{width:100%!important;margin-top:clamp(48px,15vw,82px)!important}
        #ms8210Start .ms8280-title{font-size:clamp(39px,11vw,49px)!important}
      }
      @media(display-mode:standalone){
        #ms8210Start .ms8280-topbar,#ms8210Start .ms8280-brand{display:grid!important;visibility:visible!important;opacity:1!important}
        #ms8210Start .ms8280-brand{display:block!important}
      }
    `;
  }

  function loadPrior(){
    if(window.__ms8280Header)return Promise.resolve();
    return new Promise(resolve=>{
      let script=document.querySelector('script[data-ms8286-prior],script[data-ms8285-prior],script[data-ms8284-prior],script[data-ms8282-prior],script[data-ms8281-prior]');
      if(script){
        if(window.__ms8280Header)return resolve();
        script.addEventListener('load',resolve,{once:true});
        script.addEventListener('error',resolve,{once:true});
        setTimeout(resolve,7000);
        return;
      }
      script=document.createElement('script');
      script.src=PRIOR;
      script.async=false;
      script.crossOrigin='anonymous';
      script.dataset.ms8286Prior='1';
      script.onload=resolve;
      script.onerror=()=>{console.error('MijnSerenity 8.28.6: headerbasis kon niet laden.');resolve();};
      document.head.appendChild(script);
      setTimeout(resolve,7000);
    });
  }

  function hideLegacyNode(node,modernRoot){
    if(!node||node===modernRoot||modernRoot?.contains(node)||node.id==='dashboard')return false;
    if(node.contains(modernRoot))return false;
    node.setAttribute(HIDDEN_ATTR,'1');
    node.hidden=true;
    node.setAttribute('aria-hidden','true');
    return true;
  }

  function suppressLegacyHero(){
    const dashboard=document.getElementById('dashboard');
    const modernRoot=document.getElementById('ms8210Start');
    const modern=modernRoot?.querySelector('.ms8280-header');
    if(!dashboard||!modernRoot||!modern){
      dashboard?.classList.remove(ACTIVE_CLASS);
      return false;
    }

    dashboard.classList.add(ACTIVE_CLASS);
    let hidden=0;

    /* Bekende oude hero-varianten. */
    dashboard.querySelectorAll('.ms71514-hero,.ms71510-hero,.ms71510-start-hero,.dashboard-hero,.start-hero').forEach(node=>{
      if(hideLegacyNode(node,modernRoot))hidden++;
    });

    /* Extra vangnet: zoek de oude kaart op inhoud, ongeacht welke klasse een oudere release gebruikte. */
    [...dashboard.querySelectorAll('h1,h2,h3,[role="heading"]')].forEach(heading=>{
      if(modernRoot.contains(heading))return;
      if(norm(heading.textContent).toLowerCase()!=='klaar om te gaan varen?')return;
      let node=heading.parentElement;
      while(node&&node!==dashboard&&!node.contains(modernRoot)){
        const startButton=[...node.querySelectorAll('button,a,[role="button"]')].find(control=>norm(control.textContent).toLowerCase().includes('start live varen'));
        if(startButton){
          if(hideLegacyNode(node,modernRoot))hidden++;
          break;
        }
        node=node.parentElement;
      }
    });

    return hidden>0||dashboard.classList.contains(ACTIVE_CLASS);
  }

  function applyHeroFix(){
    if(!appVisible())return false;
    syncBuild();
    installStyle();
    ensureReleaseControls();
    const modern=document.querySelector('#ms8210Start .ms8280-header');
    if(!modern){
      suppressLegacyHero();
      syncReleaseControls();
      return false;
    }

    modern.dataset.msHeroBuild='8286';
    const photo=modern.querySelector('.ms8280-photo');
    if(photo){
      photo.removeAttribute('src');
      photo.hidden=true;
      photo.setAttribute('aria-hidden','true');
    }
    suppressLegacyHero();
    syncReleaseControls();
    return true;
  }

  function observeStart(){
    const root=document.getElementById('ms8210Start');
    if(root&&!rootObserver){
      rootObserver=new MutationObserver(()=>{if(appVisible())requestAnimationFrame(applyHeroFix);});
      rootObserver.observe(root,{childList:true,subtree:true});
    }
    const dashboard=document.getElementById('dashboard');
    if(dashboard&&!dashboardObserver){
      dashboardObserver=new MutationObserver(()=>requestAnimationFrame(()=>{suppressLegacyHero();syncReleaseControls();}));
      dashboardObserver.observe(dashboard,{childList:true,subtree:true});
    }
  }

  async function initialiseStart(){
    if(startInitialised||startInitialising||!appVisible())return;
    startInitialising=true;
    try{
      ensureReleaseControls();
      await loadPrior();
      for(let i=0;i<70;i++){
        if(applyHeroFix())break;
        await new Promise(resolve=>setTimeout(resolve,100));
      }
      suppressLegacyHero();
      observeStart();
      syncReleaseControls();
      [350,900,1800,3500,7000].forEach(ms=>setTimeout(()=>{if(appVisible())applyHeroFix();},ms));
      startInitialised=true;
      console.info('MijnSerenity 8.28.6: één responsieve Serenity-header actief.');
    }finally{
      startInitialising=false;
    }
  }

  function watchAppVisibility(){
    const app=document.getElementById('appView');
    if(!app||appObserver)return;
    appObserver=new MutationObserver(()=>{
      syncBuild();
      if(appVisible()){
        ensureReleaseControls();
        void initialiseStart();
        requestAnimationFrame(applyHeroFix);
      }else syncReleaseControls();
    });
    appObserver.observe(app,{attributes:true,attributeFilter:['class','aria-hidden']});
  }

  function boot(){
    syncBuild();
    installStyle();
    watchAppVisibility();
    if(appVisible())void initialiseStart();

    ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:start-requested','mijnserenity:routechange','pageshow','focus','resize','orientationchange']
      .forEach(type=>window.addEventListener(type,()=>requestAnimationFrame(()=>{
        syncBuild();
        if(appVisible()){
          ensureReleaseControls();
          void initialiseStart();
          applyHeroFix();
          observeStart();
        }
      }),{passive:true}));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();