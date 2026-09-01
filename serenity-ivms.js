/* MijnSerenity 8.20.3 — IVMS compatibiliteit + duidelijke AIS/GPS-status
   De oude IVMS-startlaag ververste elke 1/3 seconde en verborg de navigatie.
   Marine Glass en de technische pagina zijn nu de enige actieve weergaven.
   Op de AIS-pagina wordt GPS-uitval nu apart benoemd van de AIS-databron. */
(()=>{
  'use strict';
  if(window.__msSerenityIvmsCompat8203)return;
  window.__msSerenityIvmsCompat8203=true;

  function clean(){
    document.body?.classList.remove('ivms-dashboard-active');
    document.querySelector('.bottom-nav')?.classList.remove('ivms-dashboard-hidden');
    document.getElementById('serenityIvms')?.remove();
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link=>{
      try{
        const path=new URL(link.href,location.href).pathname;
        if(path.endsWith('/serenity-ivms.css')||path.endsWith('serenity-ivms.css'))link.remove();
      }catch{}
    });
    if(typeof window.ms8202RepairUnifiedUi==='function'){
      try{window.ms8202RepairUnifiedUi()}catch(error){console.debug('IVMS cleanup:',error)}
    }
  }

  function setConnectionText(connection,text,statusClass){
    if(!connection)return;
    connection.classList.remove('ok','busy','bad');
    if(statusClass)connection.classList.add(statusClass);
    let dot=connection.querySelector('i');
    if(!dot){
      dot=document.createElement('i');
      connection.prepend(dot);
    }
    Array.from(connection.childNodes).forEach(node=>{
      if(node!==dot)node.remove();
    });
    connection.append(document.createTextNode(text));
  }

  function improveAisStatus(){
    const root=document.getElementById('ms820AisRoot');
    if(!root)return;

    const live=window.ms820AisState||{};
    const gpsBad=Boolean(root.querySelector('.ms820-own .gps-bad'));
    const connection=root.querySelector('#ms711AisConnection');
    const empty=root.querySelector('.ms820-empty');
    const emptyTitle=empty?.querySelector('strong');
    const emptyDetail=empty?.querySelector('small');

    if(live.configured===false){
      setConnectionText(connection,'AIS niet ingesteld','bad');
      if(emptyTitle)emptyTitle.textContent='AIS-databron niet ingesteld';
      if(emptyDetail)emptyDetail.textContent='VESSELAPI_KEY ontbreekt in Netlify.';
      return;
    }

    if(gpsBad){
      setConnectionText(
        connection,
        live.configured===true?'AIS gereed · GPS nodig':'AIS · GPS nodig',
        'busy'
      );
      if(emptyTitle)emptyTitle.textContent='AIS wacht op GPS-positie';
      if(emptyDetail)emptyDetail.textContent='Geef MijnSerenity toegang tot je exacte locatie.';
      return;
    }

    if(live.online){
      setConnectionText(connection,'AIS online','ok');
    }
  }

  let statusTimer=null;
  function scheduleAisStatusRepair(){
    clearTimeout(statusTimer);
    statusTimer=setTimeout(improveAisStatus,30);
  }

  function start(){
    clean();
    scheduleAisStatusRepair();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  window.addEventListener('mijnserenity:dashboard-ready',clean,{passive:true});
  window.addEventListener('mijnserenity:ais-update',scheduleAisStatusRepair,{passive:true});
  window.addEventListener('pageshow',scheduleAisStatusRepair,{passive:true});

  const observer=new MutationObserver(()=>{
    if(document.getElementById('ms820AisRoot'))scheduleAisStatusRepair();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();