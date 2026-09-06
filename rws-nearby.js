/* MijnSerenity 8.26.1 — RWS meldingen + globale VriJon wachtboot */
(()=>{
  'use strict';
  if(window.__msRwsFix8261)return;
  window.__msRwsFix8261=true;

  const BASE='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@e342e98287b2dffa6e153191b8deaf1972603ed0/rws-nearby.js';
  const WAIT_BOAT='/global-wait-boat-8260.js?v=826100';
  let repairTimer=0;
  let waitBoatPromise=null;
  let rwsObserver=null;

  function appIsVisible(){
    const app=document.getElementById('appView');
    return Boolean(app&&!app.classList.contains('hidden'));
  }

  function visibleAppSections(){
    const app=document.getElementById('appView');
    if(!app)return [];
    return [...app.querySelectorAll(':scope > section[id]')]
      .filter(section=>!section.classList.contains('hidden')&&section.getAttribute('aria-hidden')!=='true');
  }

  function ensureWaitBoat(){
    if(window.MijnSerenityWait)return Promise.resolve(true);
    if(waitBoatPromise)return waitBoatPromise;
    waitBoatPromise=new Promise(resolve=>{
      const finish=()=>resolve(Boolean(window.MijnSerenityWait));
      const existing=[...document.scripts].find(script=>/global-wait-boat-8260\.js(?:\?|$)/.test(script.src||''));
      if(existing){
        if(window.MijnSerenityWait){finish();return}
        existing.addEventListener('load',finish,{once:true});
        existing.addEventListener('error',()=>resolve(false),{once:true});
        setTimeout(finish,3500);
        return;
      }
      const script=document.createElement('script');
      script.src=WAIT_BOAT;
      script.async=false;
      script.onload=finish;
      script.onerror=()=>{console.warn('VriJon wachtboot kon niet worden geladen.');resolve(false)};
      document.head.appendChild(script);
    });
    return waitBoatPromise;
  }

  function syncNotificationButton(){
    const button=document.getElementById('rwsNotificationButton');
    const label=document.getElementById('rwsNotificationLabel');
    if(!button)return;
    const supported='Notification' in window;
    const permission=supported?Notification.permission:'unsupported';
    if(permission==='granted'){
      if(label)label.textContent='Meldingen toegestaan';
      button.textContent='Meldingen aan ✓';
      button.disabled=false;
      button.removeAttribute('aria-disabled');
      button.title='Vaarwegmeldingen zijn actief';
    }
  }

  function watchRwsUx(){
    const page=document.getElementById('rws');
    if(!page)return;
    syncNotificationButton();
    if(rwsObserver)return;
    rwsObserver=new MutationObserver(()=>syncNotificationButton());
    rwsObserver.observe(page,{
      subtree:true,
      childList:true,
      attributes:true,
      attributeFilter:['disabled','aria-disabled']
    });
  }

  function syncNavState(){
    document.querySelectorAll('.tab').forEach(tab=>{
      tab.classList.toggle('active',tab.dataset.target==='rws');
    });
    document.querySelectorAll('.bottom-nav-item').forEach(button=>{
      button.classList.toggle('active',button.dataset.target==='rws');
    });
    document.body?.classList.remove('ms8219-start-page');
    document.body?.classList.add('ms8219-sub-page');
  }

  function showRwsDirect(){
    const app=document.getElementById('appView');
    const page=document.getElementById('rws');
    if(!app||!page)return false;

    app.querySelectorAll(':scope > section[id]').forEach(section=>section.classList.add('hidden'));
    page.classList.remove('hidden');
    page.removeAttribute('aria-hidden');
    syncNavState();

    try{window.initRwsPage?.()}catch(error){
      console.warn('Vaarwegberichten initialiseren na navigatieherstel:',error);
    }
    watchRwsUx();
    window.MijnSerenityWait?.refresh?.();

    requestAnimationFrame(()=>{
      window.scrollTo({top:0,left:0,behavior:'auto'});
      document.documentElement.scrollTop=0;
      document.body.scrollTop=0;
    });

    try{
      window.dispatchEvent(new CustomEvent('mijnserenity:routechange',{
        detail:{route:'rws',source:'rws-8261'}
      }));
    }catch{}
    return true;
  }

  function recoverBlankNavigation(){
    if(!appIsVisible())return false;
    const page=document.getElementById('rws');
    if(!page)return false;
    if(visibleAppSections().length!==0){watchRwsUx();return false}

    console.info('MijnSerenity: lege RWS-navigatie hersteld.');
    const tab=document.querySelector('.tab[data-target="rws"]');
    try{
      if(typeof window.showTab==='function'&&tab){
        window.showTab('rws',tab);
        syncNavState();
      }else{
        showRwsDirect();
      }
    }catch(error){
      console.warn('Normale RWS-navigatie kon niet worden hersteld:',error);
      showRwsDirect();
    }

    setTimeout(()=>{
      try{window.initRwsPage?.()}catch{}
      try{window.ms710RefreshRws?.()}catch{}
      watchRwsUx();
    },60);
    return true;
  }

  function strengthenOpenButton(){
    const original=window.ms795OpenRws;
    if(typeof original!=='function'||original.__ms8261Wrapped)return;

    const wrapped=function(...args){
      try{
        window.initRwsPage?.();
        const result=original.apply(this,args);
        clearTimeout(repairTimer);
        repairTimer=setTimeout(()=>{
          const page=document.getElementById('rws');
          if(page?.classList.contains('hidden'))showRwsDirect();
          watchRwsUx();
          window.MijnSerenityWait?.refresh?.();
        },90);
        return result;
      }catch(error){
        console.error('Vaarwegberichten openen mislukt:',error);
        showRwsDirect();
      }
    };
    wrapped.__ms8261Wrapped=true;
    window.ms795OpenRws=wrapped;
  }

  function installRepair(){
    strengthenOpenButton();
    [0,40,120,320,800].forEach(delay=>setTimeout(()=>{
      strengthenOpenButton();
      recoverBlankNavigation();
      watchRwsUx();
      window.MijnSerenityWait?.refresh?.();
    },delay));

    if(!window.__msRws8261Events){
      window.__msRws8261Events=true;

      window.addEventListener('mijnserenity:routechange',event=>{
        const detail=event?.detail;
        const route=String(typeof detail==='string'?detail:(detail?.route||detail?.id||detail?.target)||'').toLowerCase();
        if(route==='rws')setTimeout(()=>{
          strengthenOpenButton();
          const page=document.getElementById('rws');
          if(page?.classList.contains('hidden'))showRwsDirect();
          watchRwsUx();
          window.MijnSerenityWait?.refresh?.();
        },40);
      },{passive:true});

      document.addEventListener('click',event=>{
        if(event.target instanceof Element&&event.target.closest('#rwsNotificationButton')){
          setTimeout(()=>{syncNotificationButton();window.MijnSerenityWait?.refresh?.()},0);
          setTimeout(syncNotificationButton,400);
        }
      },{capture:true,passive:true});

      document.addEventListener('visibilitychange',()=>{
        if(!document.hidden){
          strengthenOpenButton();
          recoverBlankNavigation();
          watchRwsUx();
        }
      },{passive:true});
    }
  }

  function patchBase(source){
    let patched=String(source||'');

    const radiusNeedle='[5,10,20,30,50].includes(saved)';
    const radiusReplacement='[5,10,20,30,50,100].includes(saved)';
    const optionNeedle='<option value="50">50 km</option></select>';
    const optionReplacement='<option value="50">50 km</option><option value="100">100 km</option></select>';

    if(!patched.includes(radiusReplacement)){
      if(!patched.includes(radiusNeedle))throw new Error('Straalvalidatie in RWS-module niet gevonden.');
      patched=patched.replace(radiusNeedle,radiusReplacement);
    }
    if(!patched.includes('option value="100"')){
      if(!patched.includes(optionNeedle))throw new Error('Straalkeuzes in RWS-module niet gevonden.');
      patched=patched.replace(optionNeedle,optionReplacement);
    }

    const buttonNeedle=`button.textContent=permission==='granted'?'Meldingen aan':'Meldingen inschakelen';
    button.disabled=permission==='granted'||permission==='denied'||!supported;`;
    const buttonReplacement=`button.textContent=permission==='granted'?'Meldingen aan ✓':'Meldingen inschakelen';
    button.disabled=permission==='denied'||!supported;`;
    if(patched.includes(buttonNeedle))patched=patched.replace(buttonNeedle,buttonReplacement);

    const permissionNeedle=`    try{
      const result=await Notification.requestPermission();
      renderNotificationState();
      if(result==='granted')window.showAppToast?.('Vaarwegmeldingen zijn ingeschakeld zolang MijnSerenity actief is.');
    }catch{window.showAppToast?.('Meldingstoestemming kon niet worden aangevraagd.')}
`;
    const permissionReplacement=`    const waitKey='rws-notifications';
    window.MijnSerenityWait?.show('Meldingen controleren…',waitKey);
    try{
      const result=await Notification.requestPermission();
      renderNotificationState();
      if(result==='granted')window.showAppToast?.('Vaarwegmeldingen staan aan.');
    }catch{window.showAppToast?.('Meldingstoestemming kon niet worden aangevraagd.')}
    finally{window.MijnSerenityWait?.hide(waitKey)}
`;
    if(patched.includes(permissionNeedle))patched=patched.replace(permissionNeedle,permissionReplacement);

    return patched;
  }

  function loadBaseFallback(){
    const script=document.createElement('script');
    script.src=BASE;
    script.async=false;
    script.crossOrigin='anonymous';
    script.onload=()=>{installRepair();watchRwsUx()};
    script.onerror=()=>{
      console.error('Bestaande Vaarwegberichten-module kon niet worden geladen.');
      window.showAppToast?.('Vaarwegberichten konden niet worden geladen.');
      if(visibleAppSections().length===0)window.captainNavigate?.('dashboard');
    };
    document.head.appendChild(script);
  }

  async function loadBase(){
    await ensureWaitBoat();

    if(typeof window.initRwsPage==='function'&&typeof window.ms795OpenRws==='function'){
      installRepair();
      watchRwsUx();
      return;
    }

    try{
      const response=await fetch(BASE,{cache:'no-store'});
      if(!response.ok)throw new Error(`RWS-basis antwoordde met ${response.status}`);
      const source=patchBase(await response.text());
      const script=document.createElement('script');
      script.textContent=`${source}\n//# sourceURL=mijnserenity-rws-nearby-base.js`;
      document.head.appendChild(script);
      script.remove();
      if(typeof window.initRwsPage!=='function'||typeof window.ms795OpenRws!=='function'){
        throw new Error('Gepatchte RWS-module is niet gestart.');
      }
      installRepair();
      watchRwsUx();
    }catch(error){
      console.warn('RWS-uitbreiding kon niet dynamisch worden geladen; basisversie wordt gebruikt.',error);
      loadBaseFallback();
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadBase,{once:true});
  else loadBase();
})();
