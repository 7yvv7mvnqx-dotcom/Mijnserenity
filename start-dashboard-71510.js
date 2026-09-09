/* MijnSerenity 8.26.2 — approved Haven dashboard bootstrap */
(()=>{
  'use strict';
  if(window.__msApprovedHomeBootstrap8262)return;
  window.__msApprovedHomeBootstrap8262=true;

  const BUILD='8.26.2';
  const TOKEN='826200';
  const ROOT='ms8210Start';
  const APPROVED='ms8260ApprovedScript';
  const $=id=>document.getElementById(id);

  function route(){
    try{return ((location.hash||'#dashboard').replace(/^#/,'').split(/[?&/]/)[0]||'dashboard').toLowerCase()}
    catch(_){return 'dashboard'}
  }

  function syncBuild(){
    try{window.APP_BUILD=BUILD;window.MIJSERENITY_BUILD=BUILD}catch(_){}
    document.querySelector('meta[name="mijnserenity-build"]')?.setAttribute('content',BUILD);
    document.querySelector('meta[name="ms-build"]')?.setAttribute('content',BUILD);
    const badge=$('buildStamp');if(badge)badge.textContent='v'+BUILD;
    const settings=$('settingsAppVersion');if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
  }

  function ensureRoot(){
    if(route()!=='dashboard')return null;
    const dashboard=$('dashboard');
    if(!dashboard)return null;
    let root=$(ROOT);
    if(!root){
      root=document.createElement('section');
      root.id=ROOT;
      root.className='ms8255-reference-home';
      dashboard.prepend(root);
    }
    dashboard.classList.add('ms8255-reference-dashboard');
    [...dashboard.children].forEach(el=>{
      if(el!==root){
        el.dataset.ms8262Hidden='1';
        el.style.setProperty('display','none','important');
      }
    });
    root.style.setProperty('display','block','important');
    if(!root.innerHTML.trim())root.innerHTML='<div style="min-height:100dvh;background:#03131f"></div>';
    return root;
  }

  function applyApproved(){
    const root=ensureRoot();
    if(!root)return false;
    syncBuild();
    if(typeof window.ms8260ApplyApprovedDashboard==='function'){
      try{return !!window.ms8260ApplyApprovedDashboard()}catch(e){console.warn('Approved dashboard apply failed',e)}
    }
    let script=$(APPROVED);
    if(!script){
      script=document.createElement('script');
      script.id=APPROVED;
      script.src='/approved-dashboard-8260.js?v='+TOKEN;
      script.async=false;
      script.addEventListener('load',()=>{try{window.ms8260ApplyApprovedDashboard?.();syncBuild()}catch(_){}},{once:true});
      document.head.appendChild(script);
    }
    return false;
  }

  function boot(){
    syncBuild();
    applyApproved();
    [0,50,150,400,900,1800,3200].forEach(ms=>setTimeout(applyApproved,ms));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('pageshow',()=>setTimeout(applyApproved,0),{passive:true});
  window.addEventListener('hashchange',()=>setTimeout(applyApproved,0),{passive:true});
  const observer=new MutationObserver(()=>{if(route()==='dashboard')setTimeout(applyApproved,0)});
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();