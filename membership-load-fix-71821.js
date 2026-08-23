/* MijnSerenity 7.18.28 — robuuste login + lidmaatschap zonder blokkerende netwerkpopup */
(()=>{
  'use strict';
  if(window.__msMembershipLoadFix71821)return;
  window.__msMembershipLoadFix71821=true;

  const RETRY_DELAYS=[0,600,1600];
  const QUERY_TIMEOUT_MS=3500;
  const LOGIN_RETRY_DELAYS=[0,700,1800];
  const LOGIN_TIMEOUT_MS=9000;
  const TRANSIENT=/load failed|failed to fetch|networkerror|network request|timeout|timed out|fetch|connection|network/i;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  function messageOf(error){
    return String(error?.message||error||'Onbekende verbindingsfout');
  }

  function withTimeout(task,timeoutMs,label){
    let timer=null;
    return Promise.race([
      Promise.resolve(task),
      new Promise((_,reject)=>{
        timer=setTimeout(()=>reject(new Error(`${label} time-out`)),timeoutMs);
      })
    ]).finally(()=>{
      if(timer)clearTimeout(timer);
    });
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
    const request=sb
      .from('boat_members')
      .select('role,boat_id,boats(id,name,created_by)')
      .eq('user_id',currentUser.id)
      .limit(1);
    const {data,error}=await withTimeout(request,QUERY_TIMEOUT_MS,'Lidmaatschap laden');
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
    showConnectionStatus('Serenity kon nog niet worden bereikt. Dashboard blijft beschikbaar; probeer zo opnieuw.',true);
    try{
      if(typeof showAppToast==='function')showAppToast('Serenity tijdelijk niet bereikbaar. Probeer zo opnieuw.');
    }catch{}
    console.error('Lidmaatschap laden definitief mislukt:',text);
    return false;
  }

  async function resolveSignedInSession(result){
    if(result?.data?.session?.user)return result.data.session;
    const response=await withTimeout(sb.auth.getSession(),4000,'Sessie controleren');
    return response?.data?.session||null;
  }

  async function ensureAppOpened(session){
    if(!session?.user)return false;

    /* Geef onAuthStateChange eerst kort de kans. */
    await sleep(120);
    const app=document.getElementById('appView');
    if(app&&!app.classList.contains('hidden'))return true;

    /* Safari/PWA mist soms of vertraagt het auth-event. Start dan zelf. */
    try{
      if(typeof initialise==='function'){
        await withTimeout(initialise(session),8000,'MijnSerenity openen');
      }
    }catch(error){
      console.warn('Directe sessie-overdracht na login:',error);
    }

    return Boolean(app&&!app.classList.contains('hidden'));
  }

  async function robustSignIn(){
    const email=String(document.getElementById('email')?.value||'').trim();
    const password=document.getElementById('password')?.value||'';
    const button=document.getElementById('signInButton');

    if(!email||!password){
      showConnectionStatus('Vul e-mailadres en wachtwoord in.',true);
      return;
    }

    if(button?.disabled)return;
    if(button)button.disabled=true;

    let lastError=null;
    try{
      for(let attempt=0;attempt<LOGIN_RETRY_DELAYS.length;attempt++){
        const delay=LOGIN_RETRY_DELAYS[attempt];
        if(delay)await sleep(delay);

        try{
          showConnectionStatus(
            attempt===0
              ?'Veilig inloggen…'
              :`Inlogverbinding herstellen… poging ${attempt+1}/${LOGIN_RETRY_DELAYS.length}`
          );

          const result=await withTimeout(
            sb.auth.signInWithPassword({email,password}),
            LOGIN_TIMEOUT_MS,
            'Inloggen'
          );
          if(result?.error)throw result.error;

          const session=await resolveSignedInSession(result);
          if(!session?.user)throw new Error('Inlogsessie is nog niet beschikbaar.');

          const passwordField=document.getElementById('password');
          if(passwordField)passwordField.value='';
          showConnectionStatus('Ingelogd. MijnSerenity wordt geopend…');

          const opened=await ensureAppOpened(session);
          if(!opened){
            /* Laat de geldige sessie staan; pageshow/onAuthStateChange kan nog afronden. */
            showConnectionStatus('Ingelogd. App wordt verder geopend…');
            setTimeout(async()=>{
              try{
                const latest=await sb.auth.getSession();
                if(latest?.data?.session?.user&&typeof initialise==='function'){
                  await initialise(latest.data.session);
                }
              }catch(error){
                console.warn('Vertraagde login-herstelactie:',error);
              }
            },500);
          }
          return;
        }catch(error){
          lastError=error;
          const text=messageOf(error);
          console.warn(`Inloggen poging ${attempt+1} mislukt:`,error);

          /* Verkeerd wachtwoord, onbevestigd account e.d. nooit opnieuw proberen. */
          if(!TRANSIENT.test(text))throw error;
        }
      }

      throw lastError||new Error('Inloggen kon niet worden voltooid.');
    }catch(error){
      const friendly=typeof friendlyAuthError==='function'
        ?friendlyAuthError(error)
        :messageOf(error);
      showConnectionStatus(friendly||'Inloggen mislukt. Probeer opnieuw.',true);
    }finally{
      if(button)button.disabled=false;
    }
  }

  loadMembership=robustLoadMembership;
  signIn=robustSignIn;
  window.signIn=robustSignIn;

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
