/* MijnSerenity 8.25.5 — herstel zwart scherm bij openen Vaarwegberichten */
(()=>{
  'use strict';
  if(window.__msRwsBlackScreenFix8255)return;
  window.__msRwsBlackScreenFix8255=true;

  /* Bewaar de bestaande, werkende RWS/EuRIS-functionaliteit exact zoals die was
     en herstel alleen de navigatie-race-condition. */
  const BASE='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@e342e98287b2dffa6e153191b8deaf1972603ed0/rws-nearby.js';
  let repairTimer=0;

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

    app.querySelectorAll(':scope > section[id]').forEach(section=>{
      section.classList.add('hidden');
    });
    page.classList.remove('hidden');
    page.removeAttribute('aria-hidden');
    syncNavState();

    try{window.initRwsPage?.()}catch(error){
      console.warn('Vaarwegberichten initialiseren na navigatieherstel:',error);
    }

    requestAnimationFrame(()=>{
      window.scrollTo({top:0,left:0,behavior:'auto'});
      document.documentElement.scrollTop=0;
      document.body.scrollTop=0;
    });

    try{
      window.dispatchEvent(new CustomEvent('mijnserenity:routechange',{
        detail:{route:'rws',source:'rws-black-screen-fix'}
      }));
    }catch{}
    return true;
  }

  function recoverBlankNavigation(){
    if(!appIsVisible())return false;
    const page=document.getElementById('rws');
    if(!page)return false;

    /* Dit is precies de fouttoestand: captainNavigate('rws') heeft alle
       bestaande pagina's al verborgen terwijl de lazy RWS-pagina pas daarna
       is opgebouwd. Op Weer of Live varen is er wél een zichtbare pagina en
       grijpen we dus bewust niet in. */
    if(visibleAppSections().length!==0)return false;

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
    },60);
    return true;
  }

  function strengthenOpenButton(){
    const original=window.ms795OpenRws;
    if(typeof original!=='function'||original.__ms8255Wrapped)return;

    const wrapped=function(...args){
      try{
        /* initRwsPage bouwt de sectie eerst op. Daardoor kan captainNavigate
           nooit meer naar een nog niet bestaande #rws-sectie navigeren. */
        window.initRwsPage?.();
        const result=original.apply(this,args);
        clearTimeout(repairTimer);
        repairTimer=setTimeout(()=>{
          const page=document.getElementById('rws');
          if(page?.classList.contains('hidden'))showRwsDirect();
        },90);
        return result;
      }catch(error){
        console.error('Vaarwegberichten openen mislukt:',error);
        showRwsDirect();
      }
    };
    wrapped.__ms8255Wrapped=true;
    window.ms795OpenRws=wrapped;
  }

  function installRepair(){
    strengthenOpenButton();

    /* De lazy route kan de zwarte toestand al hebben veroorzaakt vóórdat dit
       bestand klaar is. Controleer daarom direct én een paar frames later. */
    [0,40,120,320,800].forEach(delay=>setTimeout(()=>{
      strengthenOpenButton();
      recoverBlankNavigation();
    },delay));

    window.addEventListener('mijnserenity:routechange',event=>{
      const detail=event?.detail;
      const route=String(typeof detail==='string'?detail:(detail?.route||detail?.id||detail?.target)||'').toLowerCase();
      if(route==='rws')setTimeout(()=>{
        strengthenOpenButton();
        const page=document.getElementById('rws');
        if(page?.classList.contains('hidden'))showRwsDirect();
      },40);
    },{passive:true});

    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden){
        strengthenOpenButton();
        recoverBlankNavigation();
      }
    },{passive:true});
  }

  /* De basisversie staat bewust vastgepind. Pas alleen de twee radiusplekken aan,
     zodat 100 km volledig meedoet met opslaan, filteren en vernieuwen. */
  function patchRadius100(source){
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
    return patched;
  }

  function loadBaseFallback(){
    const script=document.createElement('script');
    script.src=BASE;
    script.async=false;
    script.crossOrigin='anonymous';
    script.onload=installRepair;
    script.onerror=()=>{
      console.error('Bestaande Vaarwegberichten-module kon niet worden geladen.');
      window.showAppToast?.('Vaarwegberichten konden niet worden geladen.');
      /* Voorkom in ieder geval dat de gebruiker op een zwart scherm blijft. */
      if(visibleAppSections().length===0)window.captainNavigate?.('dashboard');
    };
    document.head.appendChild(script);
  }

  async function loadBase(){
    if(typeof window.initRwsPage==='function'&&typeof window.ms795OpenRws==='function'){
      installRepair();
      return;
    }

    try{
      const response=await fetch(BASE,{cache:'no-store'});
      if(!response.ok)throw new Error(`RWS-basis antwoordde met ${response.status}`);
      const source=patchRadius100(await response.text());
      const script=document.createElement('script');
      script.textContent=`${source}\n//# sourceURL=mijnserenity-rws-nearby-base.js`;
      document.head.appendChild(script);
      script.remove();
      if(typeof window.initRwsPage!=='function'||typeof window.ms795OpenRws!=='function'){
        throw new Error('Gepatchte RWS-module is niet gestart.');
      }
      installRepair();
    }catch(error){
      console.warn('100 km-uitbreiding kon niet dynamisch worden geladen; basisversie wordt gebruikt.',error);
      loadBaseFallback();
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadBase,{once:true});
  else loadBase();
})();
