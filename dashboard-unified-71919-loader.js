/* MijnSerenity 8.31.1 — enige dashboardloader.
   Historische URL behouden voor bestaande service-workers; de inhoud is volledig canoniek. */
(()=>{
  'use strict';
  if(window.__msUnifiedDashboard8311)return;
  window.__msUnifiedDashboard8311=true;
  window.__msUnifiedDashboard8304=true;
  window.__msUnifiedDashboard8215=true;

  const BUILD='8.31.1';
  const TOKEN='831100';
  const loads=new Map();
  const $=id=>document.getElementById(id);
  const pathOf=value=>{try{return new URL(value,location.href).pathname}catch{return String(value||'')}};

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');if(meta)meta.content=BUILD;
    if($('settingsAppVersion'))$('settingsAppVersion').textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
  }
  function load(src,timeoutMs=7000){
    const path=pathOf(src);if(loads.has(path))return loads.get(path);
    if([...document.scripts].some(script=>script.src&&pathOf(script.src)===path))return Promise.resolve(true);
    const task=new Promise(resolve=>{
      const script=document.createElement('script');let done=false;
      const finish=ok=>{if(done)return;done=true;clearTimeout(timer);resolve(ok)};
      const timer=setTimeout(()=>finish(false),timeoutMs);
      script.src=src;script.async=false;script.dataset.ms8311Loaded='1';
      script.onload=()=>finish(true);script.onerror=()=>finish(false);
      (document.head||document.documentElement).appendChild(script);
    });
    loads.set(path,task);return task;
  }
  function ensureCss(){
    if(document.querySelector('link[href*="serenity-theme-8311.css"]'))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href=`/serenity-theme-8311.css?v=${TOKEN}`;
    document.head.appendChild(link);
  }
  function removeLegacyVisuals(){
    ['msMarineGlass','msDashboardPremium7143','msStartCockpit7144','serenityIvms','ms71510Dashboard','mgMore','mgMoreNav']
      .forEach(id=>$(id)?.remove());
    document.querySelectorAll('[id^="ms8285Start"],[id^="ms8286Start"],[id^="ms8287Start"],[id^="ms8254Reference"],[id^="ms8256Polish"],[id^="ms8262IphoneStart"],[id^="ms8280Header"]')
      .forEach(node=>node.remove());
  }
  async function ensureCanonicalStart(){
    ensureCss();
    await Promise.all([
      window.__msSerenityTheme8311?Promise.resolve(true):load(`/serenity-theme-8311.js?v=${TOKEN}`),
      window.__msStart8311?Promise.resolve(true):load(`/start-dashboard-core-8311.js?v=${TOKEN}`)
    ]);
    window.ms8300RefreshStart?.();
    return Boolean($('ms8210Start'));
  }
  async function boot(){
    syncBuild();removeLegacyVisuals();
    const ready=await ensureCanonicalStart();
    removeLegacyVisuals();syncBuild();
    /* Alleen actuele waardebruggen; visuele dashboardvarianten worden niet meer geladen. */
    Promise.allSettled([
      load(`/dashboard-live-values-fix-71914.js?v=${TOKEN}`,7000),
      load(`/dashboard-energy-bridge-8206.js?v=${TOKEN}`,7000)
    ]).then(()=>window.dispatchEvent(new CustomEvent('mijnserenity:live-values-ready',{detail:{build:BUILD}})));
    window.dispatchEvent(new CustomEvent('mijnserenity:dashboard-ready',{detail:{build:BUILD,canonicalStart:true,ready}}));
    console.info(`MijnSerenity ${BUILD}: canonieke dashboardloader actief.`);
  }
  window.ms8202RepairUnifiedUi=()=>{removeLegacyVisuals();ensureCanonicalStart();syncBuild()};
  window.ms8215RepairUnifiedUi=window.ms8202RepairUnifiedUi;
  window.ms8300RepairUi=window.ms8202RepairUnifiedUi;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>boot().catch(console.warn),{once:true});else boot().catch(console.warn);
})();