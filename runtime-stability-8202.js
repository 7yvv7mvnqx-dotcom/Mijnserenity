/* MijnSerenity 8.20.2 — lichte runtime health guard
   Registreert runtimefouten en controleert kernstructuur zonder DOM-repair-loop. */
(()=>{
  'use strict';
  if(window.__msRuntimeStability8202)return;
  window.__msRuntimeStability8202=true;

  const BUILD='8.20.2';
  const STORAGE_KEY='mijnserenity-runtime-errors-8202';
  const MAX_ERRORS=20;
  let checking=false;
  let errors=[];

  try{
    const saved=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||'[]');
    if(Array.isArray(saved))errors=saved.slice(-MAX_ERRORS);
  }catch{}

  function safePath(value){
    try{
      const url=new URL(String(value||''),location.href);
      return url.origin===location.origin?url.pathname:String(url.hostname||'extern');
    }catch{return ''}
  }

  function saveErrors(){
    try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify(errors.slice(-MAX_ERRORS)))}catch{}
  }

  function record(type,message,source='',line=0){
    const text=String(message||'Onbekende runtimefout').slice(0,300);
    const item={
      at:new Date().toISOString(),
      type:String(type||'error'),
      message:text,
      source:safePath(source),
      line:Number(line)||0
    };
    const previous=errors[errors.length-1];
    if(previous&&previous.type===item.type&&previous.message===item.message&&previous.source===item.source){
      previous.at=item.at;
    }else{
      errors.push(item);
      if(errors.length>MAX_ERRORS)errors=errors.slice(-MAX_ERRORS);
    }
    saveErrors();
    window.MIJSERENITY_RUNTIME_ERRORS=[...errors];
  }

  window.addEventListener('error',event=>{
    record('error',event?.message||event?.error?.message,event?.filename,event?.lineno);
  });

  window.addEventListener('unhandledrejection',event=>{
    const reason=event?.reason;
    record('promise',reason?.message||String(reason||'Onbehandelde Promise-fout'));
  });

  function snapshot(){
    const nav=document.querySelector('.bottom-nav');
    const navButtons=nav?.querySelectorAll(':scope > .bottom-nav-item').length||0;
    const marineGlass=[...document.querySelectorAll('#msMarineGlass')];
    const app=document.getElementById('appView');
    const dashboard=document.getElementById('dashboard');
    return {
      build:String(window.MIJSERENITY_BUILD||BUILD),
      online:navigator.onLine,
      visible:!document.hidden,
      appOpen:Boolean(app&&!app.classList.contains('hidden')),
      dashboardPresent:Boolean(dashboard),
      marineGlassCount:marineGlass.length,
      navButtons,
      navUnified:Boolean(nav?.classList.contains('ms8202-nav')),
      recentErrors:errors.slice(-5),
      checkedAt:new Date().toISOString()
    };
  }

  function check(reason='manual'){
    if(checking)return window.MIJSERENITY_RUNTIME_HEALTH||snapshot();
    checking=true;
    try{
      let health=snapshot();
      const appOpen=health.appOpen;
      const navBroken=appOpen&&(health.navButtons!==6||!health.navUnified);
      if(navBroken&&typeof window.ms8202RepairUnifiedUi==='function'){
        try{window.ms8202RepairUnifiedUi()}catch(error){record('repair',error?.message||error)}
        health=snapshot();
      }
      health.reason=reason;
      window.MIJSERENITY_RUNTIME_HEALTH=health;
      window.dispatchEvent(new CustomEvent('mijnserenity:runtime-health',{detail:health}));
      return health;
    }finally{
      checking=false;
    }
  }

  window.msMijnSerenityHealth=()=>check('manual');
  window.msMijnSerenityRuntimeErrors=()=>[...errors];
  window.msMijnSerenityClearRuntimeErrors=()=>{
    errors=[];
    saveErrors();
    window.MIJSERENITY_RUNTIME_ERRORS=[];
    return check('errors-cleared');
  };

  ['mijnserenity:boot-complete','mijnserenity:dashboard-ready','mijnserenity:routechange']
    .forEach(name=>window.addEventListener(name,()=>setTimeout(()=>check(name),50),{passive:true}));
  window.addEventListener('pageshow',()=>setTimeout(()=>check('pageshow'),50),{passive:true});
  window.addEventListener('online',()=>check('online'),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check('visible')},{passive:true});

  setInterval(()=>{if(!document.hidden)check('periodic')},60000);
  setTimeout(()=>check('startup'),1500);
})();