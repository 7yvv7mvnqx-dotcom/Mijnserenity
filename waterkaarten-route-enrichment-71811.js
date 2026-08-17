/* MijnSerenity 7.18.11 — verrijk Waterkaarten GPX met bestaande Smart Route-infrastructuur */
(()=>{
  'use strict';
  if(window.__msWaterkaartenEnrichment71811)return;
  window.__msWaterkaartenEnrichment71811=true;

  const RETRY_WAIT_MS=250;
  const READY_TIMEOUT_MS=30000;
  let busy=false;
  let lastRouteId='';

  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  function isWaterkaarten(plan){
    if(!plan||typeof plan!=='object')return false;
    const source=`${plan.source||''} ${plan.routeSource||''} ${plan.routeSourceLabel||''}`.toLowerCase();
    return source.includes('waterkaarten')||Boolean(plan.waterkaartenRouteId);
  }

  function storageKey(){
    try{return typeof window.plannerStorageKey==='function'?String(window.plannerStorageKey()||''):''}
    catch{return ''}
  }

  function storedPlan(){
    try{
      const key=storageKey();
      if(!key)return null;
      const drafts=JSON.parse(localStorage.getItem(key)||'[]');
      return Array.isArray(drafts)?drafts.find(isWaterkaarten)||null:null;
    }catch{return null}
  }

  function activePlan(){
    const candidates=[
      window.MIJSERENITY_ACTIVE_WATERKAARTEN_PLAN,
      window.MIJSERENITY_IMPORTED_ROUTE_PLAN
    ];
    try{candidates.push(window.ms660NavigationPlan?.())}catch{}
    candidates.push(window.plannerCurrentPlan,storedPlan());
    return candidates.find(isWaterkaarten)||null;
  }

  function persist(plan){
    const key=storageKey();
    if(!key||!plan?.id)return;
    try{
      let drafts=JSON.parse(localStorage.getItem(key)||'[]');
      if(!Array.isArray(drafts))drafts=[];
      const index=drafts.findIndex(item=>String(item?.id||'')===String(plan.id));
      if(index>=0)drafts[index]=plan;
      else drafts.unshift(plan);
      localStorage.setItem(key,JSON.stringify(drafts.slice(0,40)));
    }catch(error){console.warn('Waterkaarten-verrijking opslaan:',error)}
  }

  function hasUsefulInfrastructure(plan){
    return Array.isArray(plan?.routeObjects)&&plan.routeObjects.some(item=>
      ['Brug','Sluis','Haven'].includes(String(item?.category||''))
    );
  }

  async function waitForSmartRoute(){
    const started=Date.now();
    while(Date.now()-started<READY_TIMEOUT_MS){
      if(typeof window.ms670LoadInfrastructure==='function')return true;
      await sleep(RETRY_WAIT_MS);
    }
    return false;
  }

  function countObjects(plan){
    const objects=Array.isArray(plan?.routeObjects)?plan.routeObjects:[];
    return {
      total:objects.length,
      bridges:objects.filter(item=>String(item?.category||'')==='Brug').length,
      locks:objects.filter(item=>String(item?.category||'')==='Sluis').length,
      harbours:objects.filter(item=>String(item?.category||'')==='Haven').length
    };
  }

  function announce(plan){
    const counts=countObjects(plan);
    const detail={planId:plan.id,waterkaartenRouteId:plan.waterkaartenRouteId,counts,plan};
    window.dispatchEvent(new CustomEvent('mijnserenity:waterkaarten-route-enriched',{detail}));
    window.dispatchEvent(new CustomEvent('mijnserenity:routechange',{detail:{source:'waterkaarten-enrichment',planId:plan.id}}));
    if(counts.bridges+counts.locks>0&&typeof window.showAppToast==='function'){
      window.showAppToast(`Waterkaarten-route aangevuld: ${counts.bridges} brug${counts.bridges===1?'':'gen'} en ${counts.locks} sluis${counts.locks===1?'':'en'}.`);
    }
  }

  function refreshPlannerIfVisible(plan){
    const planner=document.getElementById('planner');
    if(!planner||planner.classList.contains('hidden')||planner.hidden)return;
    if(typeof window.loadPlannerDraft!=='function')return;
    try{window.loadPlannerDraft(plan.id)}catch(error){console.warn('Reisplanner verversen na verrijking:',error)}
  }

  async function enrich(force=false){
    if(busy)return;
    const plan=activePlan();
    if(!plan||!Array.isArray(plan.routeCoordinates)||plan.routeCoordinates.length<2)return;
    const routeId=String(plan.waterkaartenRouteId||plan.id||'');
    if(!force&&routeId&&routeId===lastRouteId&&hasUsefulInfrastructure(plan))return;
    if(!force&&hasUsefulInfrastructure(plan)&&plan.waterkaartenEnrichedAt){
      window.MIJSERENITY_ACTIVE_WATERKAARTEN_PLAN=plan;
      window.MIJSERENITY_IMPORTED_ROUTE_PLAN=plan;
      lastRouteId=routeId;
      announce(plan);
      return;
    }

    busy=true;
    try{
      const ready=await waitForSmartRoute();
      if(!ready)throw new Error('Smart Route-infrastructuur is niet beschikbaar.');
      const objects=await window.ms670LoadInfrastructure(plan);
      plan.routeObjects=Array.isArray(objects)?objects:[];
      plan.smartDataStatus='online';
      plan.waterkaartenEnrichedAt=new Date().toISOString();
      plan.waterkaartenEnrichmentError='';
      if(typeof window.ms670AnalysePlan==='function'){
        try{plan.smartAnalysis=window.ms670AnalysePlan(plan)}catch{}
      }
      persist(plan);
      window.MIJSERENITY_ACTIVE_WATERKAARTEN_PLAN=plan;
      window.MIJSERENITY_IMPORTED_ROUTE_PLAN=plan;
      lastRouteId=routeId;
      announce(plan);
      refreshPlannerIfVisible(plan);
    }catch(error){
      plan.waterkaartenEnrichmentError=String(error?.message||error||'Verrijking mislukt');
      plan.smartDataStatus=plan.smartDataStatus||'unavailable';
      persist(plan);
      console.warn('Waterkaarten-route verrijken mislukt:',error);
    }finally{busy=false}
  }

  function start(){
    setTimeout(()=>enrich(false),700);
    window.addEventListener('mijnserenity:waterkaarten-route-imported',event=>{
      const plan=event?.detail?.plan;
      if(plan&&isWaterkaarten(plan)){
        window.MIJSERENITY_ACTIVE_WATERKAARTEN_PLAN=plan;
        window.MIJSERENITY_IMPORTED_ROUTE_PLAN=plan;
      }
      setTimeout(()=>enrich(true),150);
    },{passive:true});
    window.addEventListener('mijnserenity:modules-ready',()=>setTimeout(()=>enrich(false),250),{passive:true});
    window.addEventListener('online',()=>setTimeout(()=>enrich(false),300),{passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
