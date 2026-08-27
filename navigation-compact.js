/* MijnSerenity 7.19.0 — legacy compacte navigatie uitgeschakeld.
   De onderbalk wordt voortaan alleen met CSS aan de viewport vastgezet.
   Dit voorkomt VisualViewport/ResizeObserver/MutationObserver feedback-loops. */
(()=>{
  'use strict';
  if(window.__msNavigationCleanup71900)return;
  window.__msNavigationCleanup71900=true;

  function clean(){
    const root=document.documentElement;
    root.style.removeProperty('--ms751-nav-bottom');
    document.body?.classList.remove('ms744-keyboard-open','ms744-nav-repositioning');
    const nav=document.querySelector('.bottom-nav');
    if(!nav)return;
    nav.classList.remove('bottom-nav-viewport-fixed','bottom-nav-always-visible','bottom-nav-auto-hidden');
    nav.dataset.autoHide='false';
    nav.setAttribute('aria-hidden','false');
    ['position','left','right','top','bottom','width','max-width','transform','translate','contain','margin','visibility','opacity','pointer-events','z-index']
      .forEach(name=>nav.style.removeProperty(name));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clean,{once:true});
  else clean();
})();
