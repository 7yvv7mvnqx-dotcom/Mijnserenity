/* MijnSerenity 7.15.31 — betrouwbare loginbootstrap */
(()=>{
  'use strict';

  const BUILD='7.15.31';
  const VERSION='715310';
  const APP_SCRIPTS=[
    `app.js?v=${VERSION}`,
    `receipt-reader-pro.js?v=${VERSION}`,
    `mission-control.js?v=${VERSION}`,
    `easy-auto.js?v=${VERSION}`,
    `auto-track-reliability.js?v=${VERSION}`,
    `gps-continuity-guard.js?v=${VERSION}`,
    `waterkaarten-split-launch.js?v=${VERSION}`,
    `live-split.js?v=${VERSION}`,
    `route-control.js?v=${VERSION}`,
    `weather-page.js?v=${VERSION}`,
    `weather-radar.js?v=${VERSION}`,
    `rws-nearby.js?v=${VERSION}`,
    `ais-page.js?v=${VERSION}`,
    `entertainment-page.js?v=${VERSION}`,
    `entertainment-pro-802.js?v=715310`,
    `ha-live-bridge.js?v=${VERSION}`,
    `ruuvi-climate.js?v=${VERSION}`,
    `movement-presence.js?v=${VERSION}`,
    `technical-live-sync.js?v=${VERSION}`,
    `live-cameras.js?v=${VERSION}`,
    `page-swipe.js?v=${VERSION}`,
    `navigation-compact.js?v=${VERSION}`,
    `simple-accessible.js?v=${VERSION}`,
    `device-sync-guard.js?v=${VERSION}`,
    `captain-experience.js?v=${VERSION}`,
    `serenity-ivms.js?v=${VERSION}`,
    `captain-ux-711.js?v=${VERSION}`,
    `dashboard-pro-71531-loader.js?v=715311`
  ];
  const SUPABASE_SOURCES=[
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://unpkg.com/@supabase/supabase-js@2'
  ];

  function syncBuildVersion(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const version=document.getElementById('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
  }

  function setAuthStatus(message,isError=false){
    const target=document.getElementById('authMsg');
    if(!target)return;
    target.textContent=message;
    target.classList.toggle('error',Boolean(isError));
  }

  function loadScript(src,timeoutMs=18000){
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      let finished=false;
      const timer=setTimeout(()=>finish(new Error(`Time-out bij laden van ${src}`)),timeoutMs);

      function finish(error){
        if(finished)return;
        finished=true;
        clearTimeout(timer);
        script.onload=null;
        script.onerror=null;
        if(error){
          script.remove();
          reject(error);
        }else{
          resolve();
        }
      }

      script.src=src;
      script.async=false;
      script.crossOrigin=src.startsWith('http')?'anonymous':'';
      script.onload=()=>finish();
      script.onerror=()=>finish(new Error(`Laden mislukt: ${src}`));
      document.head.appendChild(script);
    });
  }

  async function ensureSupabase(){
    if(window.supabase?.createClient)return;

    let lastError=null;
    for(const source of SUPABASE_SOURCES){
      try{
        await loadScript(source);
        if(window.supabase?.createClient)return;
        throw new Error('Supabase-bibliotheek is niet gestart.');
      }catch(error){
        lastError=error;
        console.warn('Supabase-bron niet beschikbaar:',source,error);
      }
    }
    throw lastError||new Error('Geen beveiligde inlogverbinding beschikbaar.');
  }

  async function ensureServiceWorker(){
    if(!('serviceWorker' in navigator))return null;
    if(location.protocol!=='https:'&&location.hostname!=='localhost')return null;
    try{
      const registration=await navigator.serviceWorker.register('/sw.js',{scope:'/'});
      registration.update().catch(()=>{});
      return registration;
    }catch(error){
      console.warn('Service worker kon niet worden geregistreerd:',error);
      return null;
    }
  }

  async function start(){
    try{
      syncBuildVersion();
      setAuthStatus('Beveiligde inlog wordt geladen…');
      await ensureServiceWorker();
      await ensureSupabase();
      for(const src of APP_SCRIPTS)await loadScript(src,25000);
      syncBuildVersion();

      if(typeof window.signIn!=='function'){
        throw new Error('De inlogfunctie is niet beschikbaar.');
      }

      const target=document.getElementById('authMsg');
      if(target&&/geladen/i.test(target.textContent||'')){
        target.textContent='Nog niet ingelogd.';
      }
      console.info(`MijnSerenity ${BUILD} is gestart.`);
    }catch(error){
      console.error('MijnSerenity kon niet starten:',error);
      setAuthStatus(
        'De beveiligde inlog kon niet worden geladen. Tik op “App herstellen en vernieuwen” en probeer opnieuw.',
        true
      );
      const button=document.getElementById('signInButton');
      if(button)button.disabled=true;
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }
})();