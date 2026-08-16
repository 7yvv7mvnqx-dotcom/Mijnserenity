/* MijnSerenity 7.15.60 — beveiligde VRM/SmartShunt accudiagnose */
(()=>{
  'use strict';

  const TOKEN_KEYS=['ms7148_vrm_token','ms7148VrmToken','mijnserenity_vrm_token','vrm_api_token'];
  const RUUVI_CONFIG_KEY='mijnserenity-ruuvi-climate-v7102';
  const AUTO_REFRESH_MS=6*60*60*1000;
  const AUTO_REFRESH_KEY='mijnserenity-vrm-diagnostics-last-run';
  let currentDiagnosis=null;
  let busy=false;
  let readyTimer=0;

  const $=id=>document.getElementById(id);
  const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
  const metricValue=metric=>finite(metric?.value)?Number(metric.value):null;
  const format=(value,digits=1,suffix='')=>finite(value)
    ?`${Number(value).toLocaleString('nl-NL',{minimumFractionDigits:digits,maximumFractionDigits:digits})}${suffix}`
    :`–${suffix}`;

  function savedVrmToken(){
    for(const key of TOKEN_KEYS){
      const value=localStorage.getItem(key);
      if(value&&String(value).trim())return String(value).trim().replace(/^Token\s+/i,'');
    }
    try{
      const config=JSON.parse(localStorage.getItem(RUUVI_CONFIG_KEY)||'{}');
      if(config?.vrmToken&&String(config.vrmToken).trim())return String(config.vrmToken).trim().replace(/^Token\s+/i,'');
    }catch{}
    return '';
  }

  function boat(){
    try{return typeof currentBoat!=='undefined'?currentBoat:null}catch{return null}
  }

  function user(){
    try{return typeof currentUser!=='undefined'?currentUser:null}catch{return null}
  }

  function client(){
    try{return typeof sb!=='undefined'?sb:null}catch{return null}
  }

  function batteryType(){
    try{
      if(typeof technicalStateCache!=='undefined'&&technicalStateCache?.batteryType)return technicalStateCache.batteryType;
      if(typeof readTechnicalLocalState==='function')return readTechnicalLocalState()?.batteryType||'lead';
    }catch{}
    return 'lead';
  }

  function levelLabel(level){
    if(level==='critical')return 'Direct controleren';
    if(level==='warning')return 'Aandacht';
    if(level==='good')return 'In orde';
    return 'Nog beoordelen';
  }

  function ageLabel(value){
    const at=Date.parse(String(value||''));
    if(!Number.isFinite(at))return 'tijdstip onbekend';
    const minutes=Math.max(0,Math.round((Date.now()-at)/60000));
    if(minutes<2)return 'zojuist';
    if(minutes<60)return `${minutes} min geleden`;
    const hours=Math.round(minutes/60);
    if(hours<48)return `${hours} uur geleden`;
    return `${Math.round(hours/24)} dagen geleden`;
  }

  function fixedMarkup(){
    return `
      <div class="ms-vrm-diagnosis-head">
        <div>
          <span class="eyebrow">VRM · SMARTSHUNT · MPPT</span>
          <h3>Accuconditie</h3>
          <p>Beveiligde beoordeling op basis van actuele waarden en Victron-historie.</p>
        </div>
        <span id="msVrmDiagnosisBadge" class="ms-vrm-diagnosis-badge info">Nog beoordelen</span>
      </div>
      <div class="ms-vrm-diagnosis-values" aria-label="Actuele accuwaarden">
        <div><small>SOC</small><strong id="msVrmDiagnosisSoc">–%</strong></div>
        <div><small>SPANNING</small><strong id="msVrmDiagnosisVoltage">– V</strong></div>
        <div><small>STROOM</small><strong id="msVrmDiagnosisCurrent">– A</strong></div>
        <div><small>VERMOGEN</small><strong id="msVrmDiagnosisPower">– W</strong></div>
        <div><small>ZON</small><strong id="msVrmDiagnosisSolar">– W</strong></div>
        <div><small>VRM-HISTORIE</small><strong id="msVrmDiagnosisHistory">–</strong></div>
      </div>
      <div id="msVrmDiagnosisAssessment" class="ms-vrm-diagnosis-assessment info">
        <strong id="msVrmDiagnosisTitle">Nog geen diagnose</strong>
        <p id="msVrmDiagnosisConclusion">Tik op “Victron uitlezen & beoordelen”.</p>
        <ul id="msVrmDiagnosisChecks"></ul>
      </div>
      <div class="ms-vrm-diagnosis-actions">
        <button id="msVrmDiagnosisRun" type="button">🔋 Victron uitlezen & beoordelen</button>
        <button id="msVrmDiagnosisSettings" class="secondary" type="button">VRM-token instellen</button>
      </div>
      <p id="msVrmDiagnosisStatus" class="ms-vrm-diagnosis-status">De VRM-token blijft lokaal op dit apparaat en wordt niet in MijnSerenity opgeslagen.</p>`;
  }

  function mount(){
    const technical=$('technical');
    if(!technical||$('msVictronDiagnosis'))return;
    const card=document.createElement('section');
    card.id='msVictronDiagnosis';
    card.className='ms-vrm-diagnosis';
    card.setAttribute('aria-label','Victron accudiagnose');
    card.innerHTML=fixedMarkup();
    const energy=$('msVictronEnergy');
    const hero=technical.querySelector('.technical-hero');
    if(energy)energy.insertAdjacentElement('afterend',card);
    else if(hero)hero.insertAdjacentElement('beforebegin',card);
    else technical.prepend(card);
    $('msVrmDiagnosisRun')?.addEventListener('click',()=>runDiagnosis({manual:true}));
    $('msVrmDiagnosisSettings')?.addEventListener('click',openSettings);
    render();
  }

  function setStatus(message,state=''){
    const status=$('msVrmDiagnosisStatus');
    if(status){
      status.textContent=message;
      status.className=`ms-vrm-diagnosis-status ${state}`.trim();
    }
  }

  function render(){
    mount();
    if(!$('msVictronDiagnosis'))return;
    const data=currentDiagnosis;
    const battery=data?.battery||{};
    const solar=data?.solar||{};
    const assessment=data?.assessment||{};
    const level=assessment.level||'info';
    const badge=$('msVrmDiagnosisBadge');
    if(badge){
      badge.textContent=levelLabel(level);
      badge.className=`ms-vrm-diagnosis-badge ${level}`;
    }
    const box=$('msVrmDiagnosisAssessment');
    if(box)box.className=`ms-vrm-diagnosis-assessment ${level}`;
    const values={
      msVrmDiagnosisSoc:format(metricValue(battery.soc),0,'%'),
      msVrmDiagnosisVoltage:format(metricValue(battery.voltage),2,' V'),
      msVrmDiagnosisCurrent:format(metricValue(battery.current),2,' A'),
      msVrmDiagnosisPower:format(metricValue(battery.power),0,' W'),
      msVrmDiagnosisSolar:format(metricValue(solar.power),0,' W')
    };
    Object.entries(values).forEach(([id,text])=>{const element=$(id);if(element)element.textContent=text});
    const history=$('msVrmDiagnosisHistory');
    const socCount=Number(data?.history?.soc?.summary?.count||0);
    const voltageCount=Number(data?.history?.voltage?.summary?.count||0);
    if(history)history.textContent=socCount?`${socCount} SOC-punten`:voltageCount?`${voltageCount} V-punten`:'geen reeks';
    const title=$('msVrmDiagnosisTitle');
    if(title)title.textContent=assessment.title||'Nog geen diagnose';
    const conclusion=$('msVrmDiagnosisConclusion');
    if(conclusion)conclusion.textContent=assessment.conclusion||'Tik op “Victron uitlezen & beoordelen”.';
    const checks=$('msVrmDiagnosisChecks');
    if(checks){
      checks.replaceChildren();
      (assessment.checks||[]).slice(0,6).forEach(check=>{
        const item=document.createElement('li');
        item.className=String(check?.severity||'info');
        item.textContent=String(check?.text||'');
        checks.appendChild(item);
      });
    }
    if(data?.sampledAt){
      setStatus(
        `${data.saved===false?'Meting ontvangen maar opslaan mislukte':'Beveiligd opgeslagen'} · ${ageLabel(data.sampledAt)} · SmartShunt instance ${battery.instance??'niet gevonden'}`,
        data.saved===false?'warning':'success'
      );
    }
  }

  function publish(data){
    currentDiagnosis=data&&typeof data==='object'?data:null;
    window.MIJSERENITY_VRM_DIAGNOSTICS=currentDiagnosis;
    window.dispatchEvent(new CustomEvent('mijnserenity-vrm-diagnostics-updated',{detail:currentDiagnosis||{}}));
    render();
  }

  async function loadLatest(){
    const supabase=client(),activeBoat=boat();
    if(!supabase||!activeBoat||!user())return false;
    try{
      const {data,error}=await supabase
        .from('victron_diagnostics')
        .select('data,sampled_at,updated_at')
        .eq('boat_id',activeBoat.id)
        .maybeSingle();
      if(error){
        if(!/does not exist|schema cache|404/i.test(String(error.message||'')))console.warn('Victron-diagnose laden mislukt:',error);
        return false;
      }
      if(data?.data)publish({...data.data,sampledAt:data.sampled_at||data.data.sampledAt,saved:true});
      return Boolean(data?.data);
    }catch(error){
      console.warn('Victron-diagnose laden mislukt:',error);
      return false;
    }
  }

  function errorMessage(error){
    const message=String(error?.message||error||'');
    if(/401|jwt|unauthorized/i.test(message))return 'Log opnieuw in bij MijnSerenity en probeer het nogmaals.';
    if(/failed to send|fetch/i.test(message))return 'De beveiligde Victron-functie is niet bereikbaar.';
    return message||'De Victron-diagnose kon niet worden uitgevoerd.';
  }

  async function runDiagnosis({manual=false}={}){
    if(busy)return false;
    mount();
    const supabase=client(),activeBoat=boat(),activeUser=user();
    if(!supabase||!activeBoat||!activeUser){
      setStatus('Log eerst in bij MijnSerenity en open daarna deze diagnose.','error');
      return false;
    }
    const token=savedVrmToken();
    if(!token){
      setStatus('Stel eerst uw bestaande Victron VRM API-token in.','warning');
      if(manual)openSettings();
      return false;
    }
    busy=true;
    const button=$('msVrmDiagnosisRun');
    if(button){button.disabled=true;button.textContent='Victron wordt veilig uitgelezen…'}
    setStatus('SmartShunt-, accu-, alarm- en MPPT-gegevens ophalen…','busy');
    try{
      const {data,error}=await supabase.functions.invoke('victron-diagnostics',{
        body:{boatId:activeBoat.id,days:7,batteryType:batteryType()},
        headers:{'x-vrm-token':token}
      });
      if(error)throw error;
      if(!data?.success)throw new Error(data?.error||'Victron gaf geen geldige diagnose terug.');
      localStorage.setItem(AUTO_REFRESH_KEY,String(Date.now()));
      publish(data);
      return true;
    }catch(error){
      console.error('Beveiligde Victron-diagnose mislukt:',error);
      setStatus(errorMessage(error),'error');
      return false;
    }finally{
      busy=false;
      if(button){button.disabled=false;button.textContent='🔋 Victron uitlezen & beoordelen'}
    }
  }

  function openSettings(){
    try{
      if(typeof captainNavigate==='function')captainNavigate('technical');
      const target=$('ms7148VrmCard');
      if(target){
        target.scrollIntoView({behavior:'smooth',block:'center'});
        setTimeout(()=>$('ms7148VrmToken')?.focus(),350);
      }
    }catch{}
  }

  async function whenReady(){
    mount();
    if(!client()||!boat()||!user())return false;
    clearInterval(readyTimer);readyTimer=0;
    await loadLatest();
    return true;
  }

  function maybeAutoRun(){
    if(!boat()||!user()||!savedVrmToken())return;
    const last=Number(localStorage.getItem(AUTO_REFRESH_KEY)||0);
    if(Date.now()-last>=AUTO_REFRESH_MS)runDiagnosis({manual:false});
  }

  function install(){
    mount();
    window.msRunVictronDiagnostics=()=>runDiagnosis({manual:true});
    window.msLoadVictronDiagnostics=loadLatest;
    readyTimer=setInterval(async()=>{
      if(await whenReady())maybeAutoRun();
    },1000);
    setTimeout(async()=>{
      if(await whenReady())maybeAutoRun();
    },250);
    window.addEventListener('mijnserenity:routechange',event=>{
      if(event?.detail?.route==='technical'){
        whenReady();
        setTimeout(maybeAutoRun,300);
      }
    });
    window.addEventListener('focus',()=>{whenReady();});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();

