/* MijnSerenity 7.18.21 — robuust lidmaatschap laden zonder blokkerende netwerkpopup */
(()=>{
  'use strict';
  if(window.__msMembershipLoadFix71821)return;
  window.__msMembershipLoadFix71821=true;

  const RETRY_DELAYS=[0,450,1200,2500];
  const TRANSIENT=/load failed|failed to fetch|networkerror|network request|timeout|timed out|fetch/i;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  function messageOf(error){
    return String(error?.message||error||'Onbekende verbindingsfout');
  }

  function restoreAlertGuard(){
    try{window.__msRestoreMembershipAlertGuard?.()}catch{}
  }

  function showConnectionStatus(message,isError=false){
    const auth=document.getElementById('authMsg');
    if(auth){
      auth.textContent=message;
      auth.classList.toggle('error',Boolean(isError));
    }
    const startup=document.getElementById('msStartupStatus');
    if(startup&&!isError)startup.textContent=message;
  }

  async function queryMembership(){
    const {data,error}=await sb
      .from('boat_members')
      .select('role,boat_id,boats(id,name,created_by)')
      .eq('user_id',currentUser.id)
      .limit(1);
    if(error)throw error;
    if(data?.length){
      currentRole=data[0].role;
      currentBoat=data[0].boats;
    }else{
      currentRole=null;
      currentBoat=null;
    }
    return true;
  }

  async function robustLoadMembership(){
    if(!currentUser){
      currentRole=null;
      currentBoat=null;
      restoreAlertGuard();
      return false;
    }

    let lastError=null;
    for(let attempt=0;attempt<RETRY_DELAYS.length;attempt++){
      const delay=RETRY_DELAYS[attempt];
      if(delay)await sleep(delay);
      try{
        if(attempt>0)showConnectionStatus(`Verbinding met Serenity herstellen… poging ${attempt+1}/${RETRY_DELAYS.length}`);
        await queryMembership();
        restoreAlertGuard();
        if(attempt>0)showConnectionStatus('Verbinding met Serenity hersteld.');
        return true;
      }catch(error){
        lastError=error;
        const text=messageOf(error);
        console.warn(`Lidmaatschap laden poging ${attempt+1} mislukt:`,error);
        if(!TRANSIENT.test(text))break;
      }
    }

    restoreAlertGuard();
    const text=messageOf(lastError);
    showConnectionStatus('Serenity kon nog niet worden bereikt. Controleer de verbinding en probeer opnieuw.',true);
    try{
      if(typeof showAppToast==='function')showAppToast('Serenity tijdelijk niet bereikbaar. Probeer zo opnieuw.');
    }catch{}
    console.error('Lidmaatschap laden definitief mislukt:',text);
    return false;
  }

  // Vervang de oude één-poging-functie. Alle bestaande aanroepen gebruiken
  // hiermee automatisch dezelfde retry-logica.
  loadMembership=robustLoadMembership;

  // Als de eerste auth-callback de oude functie nét vóór deze hotfix heeft
  // geraakt, herstellen we de bootkoppeling alsnog zonder opnieuw inloggen.
  setTimeout(async()=>{
    try{
      if(!currentUser||currentBoat)return;
      const ok=await robustLoadMembership();
      if(!ok||!currentBoat)return;

      try{if(typeof renderBoat==='function')renderBoat()}catch{}
      const jobs=[];
      if(typeof loadSettings==='function')jobs.push(loadSettings());
      if(typeof loadPois==='function')jobs.push(loadPois());
      if(typeof loadCosts==='function')jobs.push(loadCosts());
      if(typeof loadTrips==='function')jobs.push(loadTrips());
      if(jobs.length)await Promise.allSettled(jobs);
      try{if(typeof subscribeRealtime==='function')subscribeRealtime()}catch{}
      try{if(typeof renderDynamicWelcome==='function')renderDynamicWelcome(true)}catch{}
      try{if(typeof renderCaptainCommandCenter==='function')renderCaptainCommandCenter()}catch{}
    }catch(error){
      console.warn('Lidmaatschap herstel na opstart:',error);
    }
  },80);
})();
