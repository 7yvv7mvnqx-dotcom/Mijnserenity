/* MijnSerenity 8.21.6 hotfix — Victron legacy compatibiliteitsstub
   Live energie wordt beheerd door dashboard-live-values-fix; diagnose en bediening
   staan onder Techniek. Deze oude module mag geen tweede nav, pagina of poller bouwen.

   Hotfix: de Accuconditie-kaart mag niet groen "In orde" tonen wanneer de actuele
   SmartShunt-SOC onder dezelfde gebruikerswaarschuwingszone valt.

   8.21.6: vangnet voor live Victron tankdata. Omdat deze compatibiliteitsstub altijd
   geladen wordt, start hij de bestaande live-energy refresh als die beschikbaar is.
   Als die module niet geladen is, roept hij victron-energy-live zelf aan. Daardoor
   wordt o.a. de drinkwatertank vanuit Cerbo/VRM in technical_state bijgewerkt. */
(()=>{
  'use strict';
  if(window.__msVictronEnergyCompat8202)return;
  window.__msVictronEnergyCompat8202=true;

  const SOC_ATTENTION_LIMIT=60;
  const TOKEN_KEYS=['ms7148_vrm_token','ms7148VrmToken','mijnserenity_vrm_token','vrm_api_token'];
  let tankSyncBusy=false;
  let lastTankSync=0;

  function clean(){
    document.getElementById('ms7201UiStyle')?.remove();
    document.getElementById('ms7201MoreSheet')?.remove();
    document.getElementById('msVictronPage')?.remove();
    document.querySelectorAll('.ms7201-more-nav').forEach(node=>node.remove());
    if(document.body?.style?.overflow==='hidden')document.body.style.removeProperty('overflow');
    if(typeof window.ms8202RepairUnifiedUi==='function'){
      try{window.ms8202RepairUnifiedUi()}catch(error){console.debug('Victron legacy cleanup:',error)}
    }
  }

  function openTechnical(){
    clean();
    if(typeof window.captainNavigate==='function')return window.captainNavigate('technical');
    return window.ms708GoToPage?.('technical',true);
  }

  function number(value){
    if(value===null||value===undefined||value==='')return null;
    const parsed=Number(String(value).replace(',','.').replace(/[^0-9.-]/g,''));
    return Number.isFinite(parsed)?parsed:null;
  }

  function diagnosisSoc(){
    const direct=number(window.MIJSERENITY_VRM_DIAGNOSTICS?.battery?.soc?.value);
    if(direct!==null)return direct;
    return number(document.getElementById('msVrmDiagnosisSoc')?.textContent);
  }

  function vrmToken(){
    for(const key of TOKEN_KEYS){
      try{
        const value=localStorage.getItem(key);
        if(value&&String(value).trim())return String(value).trim().replace(/^Token\s+/i,'');
      }catch{}
    }
    try{
      const cfg=JSON.parse(localStorage.getItem('mijnserenity-ruuvi-climate-v7102')||'{}');
      if(cfg?.vrmToken)return String(cfg.vrmToken).trim().replace(/^Token\s+/i,'');
    }catch{}
    return '';
  }

  function liveAgeMs(){
    const at=Date.parse(String(window.MIJSERENITY_VRM_LIVE_ENERGY?.sampledAt||''));
    return Number.isFinite(at)?Math.max(0,Date.now()-at):Infinity;
  }

  function syncLocalTankState(data){
    const level=number(data?.tanks?.water?.levelPct);
    if(level===null)return false;
    try{
      if(typeof technicalStateCache!=='undefined'&&technicalStateCache&&typeof technicalStateCache==='object'){
        technicalStateCache.waterPct=level;
        technicalStateCache.liveWaterAt=data.sampledAt||new Date().toISOString();
        technicalStateCache.liveWaterSource={
          source:'victron-vrm',
          name:data?.tanks?.water?.name||'Drinkwater',
          instance:data?.tanks?.water?.instance??null,
          fluidType:data?.tanks?.water?.fluidType??null
        };
      }
    }catch{}
    window.dispatchEvent(new CustomEvent('mijnserenity-victron-water-updated',{detail:{levelPct:level,tank:data.tanks.water,sampledAt:data.sampledAt||''}}));
    return true;
  }

  async function syncVictronTanks(force=false){
    if(tankSyncBusy||document.hidden||(!force&&Date.now()-lastTankSync<55000))return false;
    tankSyncBusy=true;
    lastTankSync=Date.now();
    try{
      /* Voorkeur: gebruik de centrale live-refresh wanneer die module actief is. */
      if(typeof window.ms71915RefreshEnergy==='function'){
        await window.ms71915RefreshEnergy();
        syncLocalTankState(window.MIJSERENITY_VRM_LIVE_ENERGY);
        if(window.MIJSERENITY_VRM_LIVE_ENERGY?.tanks)return true;
      }

      /* Vangnet: deze stub staat altijd in index.html, dus tankdata blijft gekoppeld
         wanneer dashboard-live-values-fix om welke reden ook niet geladen is. */
      if(liveAgeMs()<55000&&window.MIJSERENITY_VRM_LIVE_ENERGY?.tanks){
        syncLocalTankState(window.MIJSERENITY_VRM_LIVE_ENERGY);
        return true;
      }
      let client=null,boat=null,user=null;
      try{client=typeof sb!=='undefined'?sb:null}catch{}
      try{boat=typeof currentBoat!=='undefined'?currentBoat:null}catch{}
      try{user=typeof currentUser!=='undefined'?currentUser:null}catch{}
      const token=vrmToken();
      if(!client||!boat?.id||!user||!token)return false;

      const {data,error}=await client.functions.invoke('victron-energy-live',{
        body:{boatId:boat.id},
        headers:{'x-vrm-token':token}
      });
      if(error||!data?.success)throw error||new Error(data?.error||'Geen geldige Victron-data');
      window.MIJSERENITY_VRM_LIVE_ENERGY=data;
      syncLocalTankState(data);
      window.dispatchEvent(new CustomEvent('mijnserenity-vrm-energy-live-updated',{detail:data}));
      return true;
    }catch(error){
      console.debug('Victron tankkoppeling:',error);
      return false;
    }finally{
      tankSyncBusy=false;
    }
  }

  function setTextIfChanged(node,text){
    if(node&&node.textContent!==text)node.textContent=text;
  }

  function syncDiagnosisAttention(){
    const soc=diagnosisSoc();
    if(soc===null||soc>SOC_ATTENTION_LIMIT)return;

    const badge=document.getElementById('msVrmDiagnosisBadge');
    const box=document.getElementById('msVrmDiagnosisAssessment');
    const title=document.getElementById('msVrmDiagnosisTitle');
    const conclusion=document.getElementById('msVrmDiagnosisConclusion');
    if(!badge||!box)return;

    /* Een bestaande kritieke of andere echte waarschuwing blijft altijd leidend. */
    if(badge.classList.contains('critical')||box.classList.contains('critical'))return;
    const alreadyWarning=badge.classList.contains('warning')||box.classList.contains('warning');
    if(alreadyWarning&&!/in orde|nog beoordelen/i.test(String(badge.textContent||'')))return;

    badge.classList.remove('good','info');
    badge.classList.add('warning');
    setTextIfChanged(badge,'Aandacht');

    box.classList.remove('good','info');
    box.classList.add('warning');
    setTextIfChanged(title,'Aandacht – accuniveau laag');
    setTextIfChanged(
      conclusion,
      `Accu technisch in orde, maar SOC is ${Math.round(soc)}% en ligt onder de ingestelde waarschuwingsgrens van ${SOC_ATTENTION_LIMIT}%.`
    );
  }

  function scheduleDiagnosisSync(){
    setTimeout(syncDiagnosisAttention,0);
    setTimeout(syncDiagnosisAttention,250);
  }

  window.msOpenVictronPage=openTechnical;
  window.msCloseVictronPage=()=>true;
  window.ms7201OpenMore=()=>{
    if(typeof window.ms797OpenMore==='function')return window.ms797OpenMore();
    return false;
  };
  window.ms8216SyncVictronTanks=()=>syncVictronTanks(true);

  function start(){
    clean();
    scheduleDiagnosisSync();
    setTimeout(()=>syncVictronTanks(true),1400);
    window.addEventListener('mijnserenity-vrm-diagnostics-updated',scheduleDiagnosisSync,{passive:true});
    window.addEventListener('mijnserenity:routechange',scheduleDiagnosisSync,{passive:true});
    window.addEventListener('mijnserenity:dashboard-ready',()=>syncVictronTanks(false),{passive:true});
    window.addEventListener('focus',()=>syncVictronTanks(false),{passive:true});
    window.addEventListener('pageshow',()=>syncVictronTanks(false),{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncVictronTanks(false)},{passive:true});
    const observer=new MutationObserver(()=>{
      if(!document.hidden)scheduleDiagnosisSync();
    });
    const diagnosisRoot=document.getElementById('msVrmDiagnosisAssessment')?.parentElement||document.body;
    observer.observe(diagnosisRoot,{subtree:true,childList:true,characterData:true});
    setInterval(()=>{
      if(!document.hidden){
        syncDiagnosisAttention();
        syncVictronTanks(false);
      }
    },60000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('mijnserenity:dashboard-ready',clean,{passive:true});
})();