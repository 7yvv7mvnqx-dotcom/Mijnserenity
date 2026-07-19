/* MijnSerenity 7.4.4 — betrouwbare loginbootstrap */
(()=>{
  'use strict';

  const BUILD='7.4.4';
  const VERSION='7440';
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
    `ais-page.js?v=${VERSION}`,
    `entertainment-page.js?v=${VERSION}`,
    `ha-live-bridge.js?v=${VERSION}`,
    `live-cameras.js?v=${VERSION}`,
    `page-swipe.js?v=${VERSION}`,
    `navigation-compact.js?v=${VERSION}`
  ];
  const SUPABASE_SOURCES=[
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://unpkg.com/@supabase/supabase-js@2'
  ];

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

  async function start(){
    try{
      setAuthStatus('Beveiligde inlog wordt geladen…');
      await ensureSupabase();
      for(const src of APP_SCRIPTS)await loadScript(src,25000);

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
