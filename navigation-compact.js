/* MijnSerenity 8.28.0 — navigatie compatibiliteitscleanup + Serenity-foto op Start/Haven.
   De uniforme dashboardloader is de enige eigenaar van de onderste navigatie.
   Deze module ruimt legacy navigatie op en vervangt uitsluitend het huis-icoon door de echte Serenity-foto. */
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

  function applySerenityHomeIcon(){
    const btn=document.querySelector('#ms8210Start .ms8263-nav [data-ms8263-go="dashboard"]');
    if(!btn)return false;
    btn.querySelector('svg')?.remove();
    let img=btn.querySelector('.ms-nav-serenity-photo');
    if(!img){
      img=document.createElement('img');
      img.className='ms-nav-serenity-photo';
      img.src='/serenity-dashboard-boat-20260909.webp?v=828000';
      img.alt='';
      img.setAttribute('aria-hidden','true');
      img.style.cssText='display:block;width:36px;height:29px;object-fit:cover;object-position:center 52%;border-radius:8px;border:1px solid rgba(235,250,255,.7);box-shadow:0 2px 9px rgba(0,0,0,.35)';
      const label=btn.querySelector('span');
      btn.insertBefore(img,label||btn.firstChild);
    }
    return true;
  }

  function repair(){
    clean();
    if(typeof window.ms8202RepairUnifiedUi==='function'){
      try{window.ms8202RepairUnifiedUi()}catch(error){console.debug('Navigatiecleanup:',error)}
    }
    applySerenityHomeIcon();
    setTimeout(applySerenityHomeIcon,80);
  }

  function start(){
    clean();
    applySerenityHomeIcon();
    [100,500,1500].forEach(ms=>setTimeout(repair,ms));
  }

  ['mijnserenity:dashboard-ready','mijnserenity:boot-complete']
    .forEach(name=>window.addEventListener(name,repair,{passive:true}));
  window.addEventListener('pageshow',repair,{passive:true});
  window.addEventListener('hashchange',()=>setTimeout(applySerenityHomeIcon,80),{passive:true});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();