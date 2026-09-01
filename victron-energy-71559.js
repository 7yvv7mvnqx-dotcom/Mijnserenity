/* MijnSerenity 8.21.5 hotfix — Victron legacy compatibiliteitsstub
   Live energie wordt beheerd door dashboard-live-values-fix; diagnose en bediening
   staan onder Techniek. Deze oude module mag geen tweede nav, pagina of poller bouwen.

   Hotfix: de Accuconditie-kaart mag niet groen "In orde" tonen wanneer de actuele
   SmartShunt-SOC onder dezelfde gebruikerswaarschuwingszone valt. */
(()=>{
  'use strict';
  if(window.__msVictronEnergyCompat8202)return;
  window.__msVictronEnergyCompat8202=true;

  const SOC_ATTENTION_LIMIT=60;

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

  function start(){
    clean();
    scheduleDiagnosisSync();
    window.addEventListener('mijnserenity-vrm-diagnostics-updated',scheduleDiagnosisSync,{passive:true});
    window.addEventListener('mijnserenity:routechange',scheduleDiagnosisSync,{passive:true});
    const observer=new MutationObserver(()=>scheduleDiagnosisSync());
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
    setInterval(syncDiagnosisAttention,2000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('mijnserenity:dashboard-ready',clean,{passive:true});
})();