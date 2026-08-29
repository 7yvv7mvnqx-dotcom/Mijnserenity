/* MijnSerenity 7.19.2 — responsive cleanup + werkende livekaartcontrole.
   Breedte en oriëntatie worden uitsluitend door normale responsive CSS bepaald.
   De statusbadge van de gedeelde live vaarkaart is nu ook echt aanklikbaar. */
(()=>{
  'use strict';
  if(window.__msOrientationCleanup71920)return;
  window.__msOrientationCleanup71920=true;

  const selectors=[
    'html','body','body > main','#appView','#dashboard','#msMarineGlass',
    '.ms708-native-pager','.ms708-native-pager > .ms708-native-page','.bottom-nav'
  ];

  function clean(){
    document.documentElement.removeAttribute('data-ms-orientation');
    document.body?.removeAttribute('data-ms-orientation');
    ['--ms-physical-width','--ms-layout-width','--ms-layout-height','--ms-landscape-width','--ms-viewport-width','--ms-viewport-height']
      .forEach(name=>document.documentElement.style.removeProperty(name));

    document.querySelectorAll(selectors.join(',')).forEach(node=>{
      ['width','max-width','min-width','margin-left','margin-right','left','right','transform','translate']
        .forEach(name=>node.style.removeProperty(name));
    });

    document.getElementById('msOrientationLayout71835Style')?.remove();
    document.getElementById('msOrientationLayout71836Style')?.remove();
  }

  function installLiveCloudCheck(){
    const badge=document.getElementById('liveCloudBadge');
    if(!badge||badge.dataset.msLiveCloudCheck==='1')return;

    badge.dataset.msLiveCloudCheck='1';
    badge.setAttribute('role','button');
    badge.setAttribute('tabindex','0');
    badge.setAttribute('aria-label','Gedeelde live vaarkaart opnieuw controleren');
    badge.setAttribute('title','Tik om de gedeelde live vaarkaart opnieuw te controleren');
    badge.style.cursor='pointer';
    badge.style.userSelect='none';
    badge.style.webkitTapHighlightColor='transparent';

    const runCheck=async event=>{
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if(badge.dataset.msLiveCloudBusy==='1')return;

      badge.dataset.msLiveCloudBusy='1';
      badge.setAttribute('aria-busy','true');
      try{
        if(typeof window.ms640LoadCloud!=='function'){
          const status=document.getElementById('liveCloudStatus');
          const detail=document.getElementById('liveCloudDetail');
          if(status)status.textContent='Livekaart wordt gestart…';
          if(detail)detail.textContent='Een ogenblik, de liveverbinding wordt geladen.';
          await new Promise(resolve=>setTimeout(resolve,500));
        }

        if(typeof window.ms640LoadCloud==='function'){
          await window.ms640LoadCloud();
        }else{
          const status=document.getElementById('liveCloudStatus');
          const detail=document.getElementById('liveCloudDetail');
          if(status)status.textContent='Livekaartcontrole niet beschikbaar';
          if(detail)detail.textContent='Vernieuw MijnSerenity en probeer het opnieuw.';
          badge.className='live-cloud-badge error';
          badge.textContent='Storing';
        }
      }catch(error){
        console.error('Handmatige livekaartcontrole mislukt:',error);
        const status=document.getElementById('liveCloudStatus');
        const detail=document.getElementById('liveCloudDetail');
        if(status)status.textContent='Cloud livekaart niet bereikbaar';
        if(detail)detail.textContent=error?.message||'Probeer het opnieuw.';
        badge.className='live-cloud-badge error';
        badge.textContent='Storing';
      }finally{
        delete badge.dataset.msLiveCloudBusy;
        badge.removeAttribute('aria-busy');
      }
    };

    badge.addEventListener('click',runCheck);
    badge.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){
        event.preventDefault();
        runCheck(event);
      }
    });
  }

  function initialise(){
    clean();
    installLiveCloudCheck();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialise,{once:true});
  else initialise();

  window.addEventListener('mijnserenity:dashboard-ready',installLiveCloudCheck,{passive:true});
  window.addEventListener('pageshow',installLiveCloudCheck,{passive:true});
})();
