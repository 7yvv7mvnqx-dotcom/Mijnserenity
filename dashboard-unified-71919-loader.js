/* MijnSerenity 8.30.4 — compacte bootstrap rond de lokale canonieke Start-runtime. */
(()=>{
  'use strict';
  if(window.__msUnifiedDashboard8304)return;
  window.__msUnifiedDashboard8304=true;
  window.__msUnifiedDashboard8215=true;

  const BUILD='8.30.4';
  const TOKEN='830400';
  const THEME='/serenity-theme-8310.js?v=831000';
  const LANDSCAPE_CSS='/iphone-landscape-8301.css?v=831100';
  const $=id=>document.getElementById(id);
  const pathOf=value=>{try{return new URL(value,location.href).pathname}catch{return String(value||'')}};
  const loads=new Map();

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const settings=$('settingsAppVersion');if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
  }

  function ensureCss(src,id){
    let link=$(id);
    if(!link){
      link=document.createElement('link');
      link.id=id;
      link.rel='stylesheet';
      (document.head||document.documentElement).appendChild(link);
    }
    const wanted=new URL(src,location.href).href;
    if(link.href!==wanted)link.href=src;
    return link;
  }

  function load(src,timeoutMs=5000){
    const wanted=pathOf(src);
    if(loads.has(wanted))return loads.get(wanted);
    const existing=[...document.scripts].find(script=>script.src&&pathOf(script.src)===wanted);
    if(existing){
      const ready=wanted==='/start-dashboard-71510.js'?Boolean(window.__msStart8304HeroFix&&window.__msStart8300):true;
      if(ready)return Promise.resolve(true);
    }
    const promise=new Promise(resolve=>{
      let script=existing;
      if(!script){
        script=document.createElement('script');
        script.src=src;
        script.async=false;
        script.dataset.ms8304Loaded='1';
        document.head.appendChild(script);
      }
      let done=false;
      const finish=ok=>{if(done)return;done=true;clearTimeout(timer);resolve(ok)};
      const timer=setTimeout(()=>finish(false),timeoutMs);
      script.addEventListener('load',()=>finish(true),{once:true});
      script.addEventListener('error',()=>finish(false),{once:true});
      if(existing&&wanted==='/start-dashboard-71510.js'&&window.__msStart8304HeroFix&&window.__msStart8300)finish(true);
    });
    loads.set(wanted,promise);
    return promise;
  }

  function removeLegacy(){
    ['msMarineGlass','msDashboardPremium7143','msStartCockpit7144','mgMore','mgMoreNav'].forEach(id=>$(id)?.remove());
    const dashboard=$('dashboard');
    dashboard?.classList.remove('mg-active','scd-active','mspro-active','ms8216-simple-start','ms8234-premium-start');
    document.querySelector('.bottom-nav')?.classList.remove('mg-nav','ms8214-nav');
    [
      'msUnifiedDashboardStyle8215','msUnifiedDashboardStyle8214','msUnifiedDashboardStyle8202','msUnifiedDashboardStyle71919',
      'ms8234PremiumStartStyle','ms8250DayNightStyle','ms8251ThemeChoiceStyle','ms8254ReferenceDashboardStyle',
      'ms8256PolishStyle','ms8262IphoneStartStyle','ms8263VriJonBrandStyle','ms8265StartStatusStyle',
      'ms8280HeaderStyle','ms8285StartFixStyle','ms8286StartFixStyle','ms8287StartFixStyle'
    ].forEach(id=>$(id)?.remove());
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link=>{
      const p=pathOf(link.href);
      if(/\/(?:professional-ui-71700|marine-glass-mobile-7182|marine-glass-mobile-7184|marine-glass-polish-7185|marine-glass-fixes-7193|serenity-control-dashboard)\.css$/.test(p))link.remove();
    });
  }

  async function ensureStart(){
    if(window.__msStart8300&&$('ms8210Start')){
      window.ms8300RefreshStart?.();
      return true;
    }
    const ok=await load(`/start-dashboard-71510.js?v=${TOKEN}`,3200);
    if(!ok&& !window.__msStart8300){
      await new Promise(resolve=>{
        const script=document.createElement('script');
        script.src=`/start-dashboard-core-8300.js?v=${TOKEN}&loader=1`;
        script.async=false;
        script.onload=script.onerror=()=>resolve();
        document.head.appendChild(script);
        setTimeout(resolve,1600);
      });
    }
    await new Promise(resolve=>requestAnimationFrame(resolve));
    window.ms8300RefreshStart?.();
    return Boolean($('ms8210Start'));
  }

  function repair(){
    syncBuild();removeLegacy();
    ensureCss(LANDSCAPE_CSS,'msIphoneLandscape8301');
    if(!window.__msSerenityTheme8310)void load(THEME,3200);
    if(window.__msStart8300)window.ms8300RefreshStart?.();
    else void ensureStart();
  }
  window.ms8202RepairUnifiedUi=repair;
  window.ms8215RepairUnifiedUi=repair;
  window.ms8300RepairUi=repair;

  function idle(task,timeout=2500){
    if('requestIdleCallback' in window)window.requestIdleCallback(task,{timeout});
    else setTimeout(task,800);
  }

  async function start(){
    syncBuild();removeLegacy();
    ensureCss(LANDSCAPE_CSS,'msIphoneLandscape8301');
    await load(THEME,3200);
    const ready=await ensureStart();
    removeLegacy();

    requestAnimationFrame(()=>{
      window.ms8300RefreshStart?.();
      window.dispatchEvent(new CustomEvent('mijnserenity:dashboard-ready',{detail:{build:BUILD,canonicalStart:true,fastStart:true,localRuntime:true,ready}}));
    });

    const live=[
      load(`/mobile-viewport-guard-71911.js?v=${TOKEN}`,4500),
      load(`/dashboard-live-values-fix-71914.js?v=${TOKEN}`,5500),
      load(`/dashboard-energy-bridge-8206.js?v=${TOKEN}`,5500)
    ];
    Promise.all(live).then(()=>window.dispatchEvent(new CustomEvent('mijnserenity:live-values-ready',{detail:{build:BUILD}}))).catch(()=>{});
    idle(()=>load(`/dashboard-collision-radar-8201.js?v=${TOKEN}`,5500),3000);

    ['pageshow','online','orientationchange','mijnserenity:boot-complete','mijnserenity:start-requested']
      .forEach(type=>window.addEventListener(type,()=>requestAnimationFrame(repair),{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestAnimationFrame(repair)},{passive:true});

    console.info(`MijnSerenity ${BUILD}: lokale dashboardbootstrap + Serenity Glass actief.`);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>start().catch(console.warn),{once:true});
  else start().catch(console.warn);
})();
