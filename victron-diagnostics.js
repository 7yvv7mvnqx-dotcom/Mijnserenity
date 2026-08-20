/* MijnSerenity — beveiligde VRM/SmartShunt accudiagnose */
(()=>{
  'use strict';

  const TOKEN_KEYS=['ms7148_vrm_token','ms7148VrmToken','mijnserenity_vrm_token','vrm_api_token'];
  const RUUVI_CONFIG_KEY='mijnserenity-ruuvi-climate-v7102';
  const AUTO_REFRESH_MS=6*60*60*1000;
  const AUTO_REFRESH_KEY='mijnserenity-vrm-diagnostics-last-run';
  const LIVE_CHECK_CODES=new Set([
    'battery_not_found','very_low_voltage','low_voltage','very_low_soc','low_soc','soc_voltage_mismatch'
  ]);
  const HISTORY_CHECK_CODES=new Set([
    'historic_deep_voltage','full_discharges','rapid_soc_drop'
  ]);
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

  function severityLevel(checks,codes){
    let level='good';
    for(const check of checks||[]){
      if(codes&&!codes.has(String(check?.code||'')))continue;
      const severity=String(check?.severity||'info');
      if(severity==='critical')return 'critical';
      if(severity==='warning')level='warning';
    }
    return level;
  }

  function liveBatteryLevel(battery){
    const voltage=metricValue(battery?.voltage);
    const soc=metricValue(battery?.soc);
    const current=metricValue(battery?.current);
    if(voltage===null&&soc===null)return 'info';

    const lead=!/lith|lifepo|lithium/i.test(String(batteryType()||'lead'));
    const charging=current!==null&&current>1;
    const modestLoad=current===null||Math.abs(current)<5;

    if(lead&&voltage!==null&&!charging){
      if(voltage<=11.8)return 'critical';
      if(voltage<=12.1)return 'warning';
    }
    if(soc!==null){
      if(soc<=15)return 'critical';
      if(soc<=30)return 'warning';
    }
    if(lead&&soc!==null&&voltage!==null&&soc>=70&&voltage<12.15&&modestLoad&&!charging){
      return 'critical';
    }
    return 'good';
  }

  function assessmentView(data,battery,assessment){
    const checks=Array.isArray(assessment?.checks)?assessment.checks:[];
    const liveLevel=liveBatteryLevel(battery);
    const historyLevel=severityLevel(checks,HISTORY_CHECK_CODES);
    const historicalChecks=checks.filter(check=>HISTORY_CHECK_CODES.has(String(check?.code||''))||String(check?.severity||'')==='info');

    if(liveLevel==='good'&&(historyLevel==='warning'||historyLevel==='critical')){
      return {
        badgeLevel:'good',
        badgeText:'Nu in orde',
        boxLevel:historyLevel,
        title:'Historie vraagt aandacht',
        conclusion:"De actuele accuwaarden zijn in orde. In de SmartShunt-historie staat wel een eerdere afwijking. Controleer die als historisch aandachtspunt; een capaciteitstest blijft nodig voor een definitief oordeel over de accu's.",
        checks:historicalChecks
      };
    }

    if(liveLevel==='good'){
      return {
        badgeLevel:'good',
        badgeText:'In orde',
        boxLevel:assessment?.level==='good'?'good':'info',
        title:assessment?.title||'Geen direct alarm',
        conclusion:assessment?.conclusion||"De actuele accuwaarden geven geen direct alarm.",
        checks
      };
    }

    if(liveLevel==='info'){
      const hasHistoryWarning=historyLevel==='warning'||historyLevel==='critical';
      return {
        badgeLevel:'info',
        badgeText:'Nog beoordelen',
        boxLevel:hasHistoryWarning?historyLevel:'info',
        title:hasHistoryWarning?'Historie vraagt aandacht':(assessment?.title||'Nog geen diagnose'),
        conclusion:hasHistoryWarning
          ?'Er is een historisch aandachtspunt, maar er zijn nu onvoldoende actuele accuwaarden om de huidige toestand te beoordelen.'
          :(assessment?.conclusion||'Tik op “Victron uitlezen & beoordelen”.'),
        checks:hasHistoryWarning?historicalChecks:checks
      };
    }

    const currentChecks=checks.filter(check=>LIVE_CHECK_CODES.has(String(check?.code||''))||String(check?.severity||'')==='info');
    return {
      badgeLevel:liveLevel,
      badgeText:levelLabel(liveLevel),
      boxLevel:liveLevel,
      title:assessment?.title||(liveLevel==='critical'?'Accusysteem direct controleren':"Accu's vragen aandacht"),
      conclusion:assessment?.conclusion||'De actuele accuwaarden vragen aandacht.',
      checks:currentChecks.length?currentChecks:checks
    };
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
    const view=assessmentView(data,battery,assessment);
    const badge=$('msVrmDiagnosisBadge');
    if(badge){
      badge.textContent=view.badgeText;
      badge.className=`ms-vrm-diagnosis-badge ${view.badgeLevel}`;
    }
    const box=$('msVrmDiagnosisAssessment');
    if(box)box.className=`ms-vrm-diagnosis-assessment ${view.boxLevel}`;
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
    if(title)title.textContent=view.title;
    const conclusion=$('msVrmDiagnosisConclusion');
    if(conclusion)conclusion.textContent=view.conclusion;
    const checks=$('msVrmDiagnosisChecks');
    if(checks){
      checks.replaceChildren();
      (view.checks||[]).slice(0,6).forEach(check=>{
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
