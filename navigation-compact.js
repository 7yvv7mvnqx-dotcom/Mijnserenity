/* MijnSerenity 8.20.2 — navigatie compatibiliteitscleanup
   De uniforme dashboardloader is de enige eigenaar van de onderste navigatie.
   Deze legacy module ruimt uitsluitend oude inline/classes op en bouwt niets meer. */
(()=>{
  'use strict';
  if(window.__msNavigationCleanup8202)return;
  window.__msNavigationCleanup8202=true;

  function clean(){
    const root=document.documentElement;
    root.style.removeProperty('--ms751-nav-bottom');
    root.removeAttribute('data-ms-ipad-nav-fix');
    document.getElementById('ms71918IPadNavStyle')?.remove();
    document.body?.classList.remove('ms744-keyboard-open','ms744-nav-repositioning');

    const nav=document.querySelector('.bottom-nav');
    if(!nav)return;
    nav.classList.remove(
      'bottom-nav-viewport-fixed','bottom-nav-always-visible','bottom-nav-auto-hidden',
      'ms71918-ipad-nav','ms744-compact-nav'
    );
    nav.dataset.autoHide='false';
    nav.setAttribute('aria-hidden','false');
    delete nav.dataset.ms71918MoreBound;

    [
      'position','left','right','top','bottom','inset','width','max-width','height','min-height',
      'max-height','transform','translate','contain','margin','padding','visibility','opacity',
      'pointer-events','z-index','display','grid-template-columns','grid-template-rows'
    ].forEach(name=>nav.style.removeProperty(name));

    nav.querySelectorAll(':scope > .bottom-nav-item').forEach(item=>{
      ['width','min-width','max-width','height','min-height','max-height','margin','padding','display','transform']
        .forEach(name=>item.style.removeProperty(name));
    });
  }

  function repair(){
    clean();
    if(typeof window.ms8202RepairUnifiedUi==='function'){
      try{window.ms8202RepairUnifiedUi()}catch(error){console.debug('Navigatiecleanup:',error)}
    }
  }

  function start(){
    clean();
    [100,500,1500].forEach(ms=>setTimeout(repair,ms));
  }

  ['mijnserenity:dashboard-ready','mijnserenity:boot-complete']
    .forEach(name=>window.addEventListener(name,repair,{passive:true}));
  window.addEventListener('pageshow',repair,{passive:true});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();