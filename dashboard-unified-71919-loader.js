/* MijnSerenity 8.30.0 — compacte bootstrap rond de canonieke Start-runtime. */
(()=>{
  'use strict';
  if(window.__msUnifiedDashboard8300)return;
  window.__msUnifiedDashboard8300=true;
  window.__msUnifiedDashboard8215=true;

  const BUILD='8.30.0';
  const TOKEN='830000';
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

  function load(src,timeoutMs=9000){
    const wanted=pathOf(src);
    if(loads.has(wanted))return loads.get(wanted);
    const existing=[...document.scripts].find(script=>script.src&&pathOf(script.src)===wanted);
    if(existing){
      const ready=wanted==='/start-dashboard-71510.js'?window.__msStart8300:true;
      if(ready)return Promise.resolve(true);
    }
    const promise=new Promise(resolve=>{
      let script=existing;
      if(!script){script=document.createElement('script');script.src=src;script.async=false;script.dataset.ms8300Loaded='1';document.head.appendChild(script);}
      let done=false;
      const finish=ok=>{if(done)return;done=true;clearTimeout(timer);resolve(ok)};
      const timer=setTimeout(()=>finish(false),timeoutMs);
      script.addEventListener('load',()=>finish(true),{once:true});
      script.addEventListener('error',()=>finish(false),{once:true});
      if(existing&&wanted==='/start-dashboard-71510.js'&&window.__msStart8300)finish(true);
    });
    loads.set(wanted,promise);
    return promise;
  }

  function removeLegacy(){
    ['msMarineGlass','msDashboardPremium7143','msStartCockpit7144','mgMore','mgMoreNav'].forEach(id=>$(id)?.remove());
    const dashboard=$('dashboard');
    dashboard?.classList.remove('mg-active','scd-active','mspro-active','ms8216-simple-start','ms8234-premium-start');
    document.querySelector('.bottom-nav')?.classList.remove('mg-nav','ms8214-nav');

    /* Oude dynamisch geïnjecteerde stijlen horen niet meer bij de runtime. */
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
    if(window.__msStart8300&&$('ms8210Start')){window.ms8300RefreshStart?.();return true;}
    const ok=await load(`/start-dashboard-71510.js?v=${TOKEN}`,9000);
    if(!ok)console.warn('MijnSerenity: canonieke Start-runtime kon niet worden geladen.');
    await new Promise(resolve=>requestAnimationFrame(resolve));
    window.ms8300RefreshStart?.();
    return Boolean($('ms8210Start'));
  }

  function repair(){
    syncBuild();removeLegacy();
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

    /* Start is het enige blokkerende dashboardonderdeel. */
    await ensureStart();
    removeLegacy();

    /* Live databronnen laden parallel; de Start wacht hier niet op. */
    const live=[
      load(`/mobile-viewport-guard-71911.js?v=${TOKEN}`,6000),
      load(`/dashboard-live-values-fix-71914.js?v=${TOKEN}`,7000),
      load(`/dashboard-energy-bridge-8206.js?v=${TOKEN}`,7000)
    ];

    requestAnimationFrame(()=>{
      window.ms8300RefreshStart?.();
      window.dispatchEvent(new CustomEvent('mijnserenity:dashboard-ready',{detail:{build:BUILD,canonicalStart:true,fastStart:true}}));
    });

    Promise.all(live).then(()=>window.dispatchEvent(new CustomEvent('mijnserenity:live-values-ready',{detail:{build:BUILD}}))).catch(()=>{});
    idle(()=>load(`/dashboard-collision-radar-8201.js?v=${TOKEN}`,7000),3000);

    ['pageshow','online','orientationchange','mijnserenity:boot-complete','mijnserenity:start-requested']
      .forEach(type=>window.addEventListener(type,()=>requestAnimationFrame(repair),{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestAnimationFrame(repair)},{passive:true});

    console.info(`MijnSerenity ${BUILD}: compacte dashboardbootstrap actief.`);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>start().catch(console.warn),{once:true});
  else start().catch(console.warn);
})();
