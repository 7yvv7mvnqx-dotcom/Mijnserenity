
/* MijnSerenity 7.5.5 — Mission Control */
let ms700DiagnosticResults=[];
let ms700DiagnosticsBusy=false;
let ms700BackupBusy=false;

function ms700SetText(id,value){
  const el=document.getElementById(id);
  if(el)el.textContent=value;
}
function ms700Clamp(v,min=0,max=100){return Math.max(min,Math.min(max,Number(v)||0))}
function ms700Today(){return new Date().toISOString().slice(0,10)}
function ms700CheckKey(){return `ms700-check-${currentBoat?.id||'boat'}-${ms700Today()}`}
function ms700BackupKey(){return `ms700-backup-${currentBoat?.id||'boat'}`}
function ms700ReadJson(key,fallback={}){
  try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}
}
function ms700ManualChecks(){return ms700ReadJson(ms700CheckKey(),{})}
function ms700ManualCheckChanged(input){
  const checks=ms700ManualChecks();
  checks[input.dataset.ms700Check]=Boolean(input.checked);
  localStorage.setItem(ms700CheckKey(),JSON.stringify(checks));
  ms700RenderMissionControl();
}
function ms700RestoreChecks(){
  const checks=ms700ManualChecks();
  document.querySelectorAll('[data-ms700-check]').forEach(input=>{
    input.checked=Boolean(checks[input.dataset.ms700Check]);
  });
}
function ms700ManualCompletion(){
  const checks=ms700ManualChecks();
  const keys=['lifejackets','lines','fire','documents','deck'];
  const completed=keys.filter(key=>checks[key]).length;
  return {completed,total:keys.length,percentage:completed/keys.length*100};
}
function ms700BoatProfile(){
  return ms700ReadJson(`mijnserenity-smart-route-profile-${currentBoat?.id||'serenity'}`,{});
}
function ms700LastBackup(){
  const value=Number(localStorage.getItem(ms700BackupKey())||0);
  return Number.isFinite(value)&&value>0?value:null;
}
function ms700AgeText(timestamp){
  if(!timestamp)return 'Nog nooit';
  const hours=Math.floor((Date.now()-timestamp)/3600000);
  if(hours<1)return 'Zojuist';
  if(hours<24)return `${hours} uur geleden`;
  const days=Math.floor(hours/24);
  return `${days} ${days===1?'dag':'dagen'} geleden`;
}
function ms700LevelScore(level){
  return {good:100,info:85,unknown:55,warning:45,critical:0}[level]??60;
}
function ms700Icon(level){
  return {good:'✓',info:'ℹ',unknown:'?',warning:'!',critical:'×'}[level]||'•';
}
function ms700TechnicalSnapshot(){
  return typeof ms690TechnicalSnapshot==='function'
    ?ms690TechnicalSnapshot()
    :(technicalStateCache||{});
}
function ms700TechnicalAge(){
  const s=ms700TechnicalSnapshot();
  const value=s.lastSnapshotAt||s.updatedAt||s.homeAssistantLastSync;
  const time=new Date(value||0).getTime();
  return Number.isFinite(time)&&time>0?(Date.now()-time)/3600000:Infinity;
}
function ms700AutomaticChecks(){
  const state=ms700TechnicalSnapshot();
  const health=typeof ms690BoatHealth==='function'
    ?ms690BoatHealth():{warnings:[]};
  const profile=ms700BoatProfile();
  const checks=[];
  const add=(title,detail,level='good',action='')=>checks.push({title,detail,level,action});
  const critical=(health.warnings||[]).find(x=>x.level==='critical');
  const warning=(health.warnings||[]).find(x=>x.level==='warning');
  add('Technische boordstatus',
    critical?.text||warning?.text||'Geen directe technische waarschuwing gevonden.',
    critical?'critical':warning?'warning':'good','technical');
  const fuel=Number(state.fuelPct);
  add('Brandstofvoorraad',Number.isFinite(fuel)?`${Math.round(fuel)}% in de tank`:'Tankpercentage is onbekend.',
    !Number.isFinite(fuel)?'unknown':fuel<=15?'critical':fuel<=30?'warning':'good','technical');
  const water=Number(state.waterPct);
  add('Drinkwater',Number.isFinite(water)?`${Math.round(water)}% beschikbaar`:'Drinkwaterstand is onbekend.',
    !Number.isFinite(water)?'unknown':water<=15?'warning':'good','technical');
  const age=ms700TechnicalAge();
  add('Actualiteit boordgegevens',Number.isFinite(age)
    ?age<2?'Technische gegevens zijn recent.':`Laatste update is ongeveer ${Math.floor(age)} uur oud.`
    :'Nog geen technische synchronisatie bekend.',
    age<6?'good':age<24?'warning':'unknown','technical');
  const dimensions=[profile.width,profile.draft,profile.airDraft].every(v=>Number(v)>0);
  add('Scheepsprofiel voor routecontrole',
    dimensions?'Breedte, diepgang en doorvaarthoogte zijn ingevuld.':'Vul breedte, diepgang en doorvaarthoogte aan.',
    dimensions?'good':'warning','planner');
  add('Actieve vaarplanning',plannerCurrentPlan
    ?`${plannerCurrentPlan.title||'Route'} staat klaar.`
    :'Geen route actief; dit is alleen nodig wanneer je gepland vaart.',
    plannerCurrentPlan?'good':'info','planner');
  add('Internet en cloud',navigator.onLine
    ?currentUser&&currentBoat?'Online en aangemeld bij Serenity.':'Online, maar aanmelding is niet compleet.'
    :'Offline: lokale functies blijven beschikbaar.',
    navigator.onLine&&currentUser&&currentBoat?'good':navigator.onLine?'warning':'info','settings');
  return checks;
}
function ms700PoiQuality(){
  const pois=poiCache||[];
  if(!pois.length)return {score:50,issues:[{level:'info',title:'Nog geen POI’s',text:'Voeg havens en nuttige locaties toe.',action:'pois'}]};
  const place=pois.filter(p=>String(p.place||'').trim()).length;
  const address=pois.filter(p=>String(p.address||'').trim()).length;
  const photos=pois.filter(p=>(poiPhotoCache[p.id]||[]).length).length;
  const enriched=pois.filter(p=>p.enriched_at).length;
  const score=Math.round((place/pois.length*.3+address/pois.length*.25+photos/pois.length*.2+enriched/pois.length*.25)*100);
  const issues=[];
  if(address<pois.length)issues.push({level:'warning',title:`${pois.length-address} POI’s zonder adres`,text:'Gebruik POI Data Service om adressen aan te vullen.',action:'pois'});
  if(photos<pois.length)issues.push({level:'info',title:`${pois.length-photos} POI’s zonder foto`,text:'Laat MijnSerenity een passende foto zoeken.',action:'pois'});
  if(enriched<pois.length)issues.push({level:'info',title:`${pois.length-enriched} POI’s nog niet verrijkt`,text:'Kies Werk alle POI’s nu bij.',action:'pois'});
  return {score,issues};
}
function ms700TripQuality(){
  const trips=(tripCache||[]).slice(0,20);
  if(!trips.length)return {score:65,issues:[{level:'info',title:'Nog geen vaartochten',text:'Gebruik Auto Logbook voor je eerste route.',action:'live'}]};
  const photos=window.tripPhotoCache||{};
  const route=trips.filter(t=>normaliseRouteGeojson(t.route_geojson)).length;
  const places=trips.filter(t=>t.departure&&t.arrival).length;
  const fuel=trips.filter(t=>Number(t.fuel_liters)>0).length;
  const photo=trips.filter(t=>(photos[t.id]||[]).length).length;
  const score=Math.round((route+places+fuel+photo)/(trips.length*4)*100);
  const issues=[];
  if(route<trips.length)issues.push({level:'warning',title:`${trips.length-route} recente logregels zonder route`,text:'Gebruik Live varen of importeer GPX.',action:'logbook'});
  if(fuel<trips.length)issues.push({level:'info',title:`${trips.length-fuel} tochten zonder brandstof`,text:'Vul liters in voor een betere analyse.',action:'logbook'});
  if(photo<trips.length)issues.push({level:'info',title:`${trips.length-photo} tochten zonder routefoto`,text:'Gebruik Foto onderweg.',action:'logbook'});
  return {score,issues};
}
function ms700SettingsQuality(){
  const fields=[
    [Number(settingsCache?.fuel_per_hour)>0,'Brandstofverbruik per uur ontbreekt'],
    [Number(settingsCache?.fuel_price)>0,'Brandstofprijs ontbreekt'],
    [Number(settingsCache?.tank_capacity)>0,'Tankinhoud ontbreekt'],
    [Boolean(settingsCache?.boat_name||currentBoat?.name),'Bootnaam ontbreekt']
  ];
  const complete=fields.filter(([ok])=>ok).length;
  return {
    score:complete/fields.length*100,
    issues:fields.filter(([ok])=>!ok).map(([,title])=>({
      level:'warning',title,text:'Vul dit veld in bij Instellingen.',action:'settings'
    }))
  };
}
function ms700DataQuality(){
  const poi=ms700PoiQuality(),trip=ms700TripQuality(),settings=ms700SettingsQuality();
  const score=Math.round(poi.score*.42+trip.score*.38+settings.score*.2);
  const issues=[...settings.issues,...poi.issues,...trip.issues];
  return {score,issues:(issues.length?issues:[{level:'good',title:'Gegevens zijn compleet',text:'Geen directe hiaten gevonden.',action:'dashboard'}]).slice(0,12)};
}
function ms700SystemSummary(){
  const online=navigator.onLine;
  const auth=Boolean(currentUser&&currentBoat);
  const sw=Boolean(navigator.serviceWorker?.controller);
  let score=(online?30:18)+(auth?30:0)+(sw?25:12)+15;
  return {score:ms700Clamp(score),online,auth,sw};
}
function ms700Snapshot(){
  const automatic=ms700AutomaticChecks();
  const autoScore=automatic.reduce((sum,item)=>sum+ms700LevelScore(item.level),0)/Math.max(1,automatic.length);
  const manual=ms700ManualCompletion();
  const readiness=Math.round(autoScore*.88+manual.percentage*.12);
  const data=ms700DataQuality();
  const system=ms700SystemSummary();
  const last=ms700LastBackup();
  const backup=!last?25:(Date.now()-last<7*86400000?100:Date.now()-last<30*86400000?70:35);
  return {automatic,manual,readiness,data,system,backup,
    score:Math.round(readiness*.38+data.score*.27+system.score*.2+backup*.15)};
}
function ms700Level(score){return score>=85?'good':score>=65?'warning':'critical'}
function ms700Status(score){return score>=90?'Uitstekend':score>=80?'Vaarklaar':score>=65?'Aandacht nodig':'Actie nodig'}
function ms700RenderMissionControl(){
  if(!document.getElementById('ms700MissionScore'))return;
  const s=ms700Snapshot(),level=ms700Level(s.score),ring=document.getElementById('ms700MissionRing');
  ms700SetText('ms700MissionScore',s.score);ms700SetText('ms700ModalScore',s.score);
  ms700SetText('ms709MissionHeadline',ms700Status(s.score));
  ms700SetText(
    'ms709MissionSummary',
    s.score>=85
      ?'De belangrijkste systemen en gegevens zijn op orde.'
      :s.score>=65
        ?'Enkele onderdelen vragen nog aandacht.'
        :'Open Mission Control en controleer de gemarkeerde onderdelen.'
  );
  if(ring){ring.className=`ms700-mission-ring ${level}`;ring.style.setProperty('--score',`${s.score*3.6}deg`)}
  ms700SetText('ms700ReadinessStatus',ms700Status(s.readiness));
  ms700SetText('ms700ReadinessDetail',`${s.manual.completed}/${s.manual.total} handmatig afgevinkt`);
  ms700SetText('ms700DataStatus',`${s.data.score}/100`);
  ms700SetText('ms700DataDetail',s.data.issues[0]?.title||'Gegevens compleet');
  ms700SetText('ms700SystemStatus',s.system.online&&s.system.auth?'Cloud actief':s.system.online?'Aanmelding controleren':'Offline beschikbaar');
  ms700SetText('ms700SystemDetail',s.system.sw?'App-cache actief':'App-cache wordt geladen');
  const last=ms700LastBackup();
  ms700SetText('ms700BackupStatus',last?ms700AgeText(last):'Nog geen backup');
  ms700SetText('ms700BackupDetail',last?new Date(last).toLocaleString('nl-NL'):'Maak een volledige data-export');
  ms700SetText('ms700MissionInsight',s.score>=85
    ?'Serenity is op basis van de bekende gegevens goed voorbereid.'
    :s.automatic.some(x=>x.level==='critical')
      ?'Er is een kritisch aandachtspunt. Open de vertrekcheck.'
      :s.data.score<65?'Enkele belangrijke gegevens zijn nog onvolledig.':'Controleer de openstaande punten.');
  ms700RenderReadiness(s);ms700RenderData(s);ms700RenderBackup();
}
function ms700RenderReadiness(s){
  const el=document.getElementById('ms700AutomaticChecks');if(!el)return;
  const critical=s.automatic.filter(x=>x.level==='critical').length;
  const warnings=s.automatic.filter(x=>x.level==='warning').length;
  const badge=document.getElementById('ms700ReadinessBadge');
  if(badge){badge.className=`ms700-section-badge ${critical?'critical':warnings?'warning':'good'}`;
    badge.textContent=critical?`${critical} kritisch`:warnings?`${warnings} aandacht`:'Automatisch akkoord'}
  el.innerHTML=s.automatic.map(item=>`<button type="button" class="ms700-check-item ${item.level}"
    onclick="${item.action?`ms700CloseMissionControl(null,true);captainNavigate('${item.action}')`:'void(0)'}">
    <span>${ms700Icon(item.level)}</span><span><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></span>${item.action?'<b>›</b>':''}</button>`).join('');
  ms700RestoreChecks();
}
function ms700RenderData(s){
  const el=document.getElementById('ms700DataQualityList'),badge=document.getElementById('ms700DataBadge');if(!el||!badge)return;
  badge.className=`ms700-section-badge ${ms700Level(s.data.score)}`;badge.textContent=`${s.data.score}/100`;
  el.innerHTML=s.data.issues.map(item=>`<button type="button" class="ms700-quality-item ${item.level}"
    onclick="ms700CloseMissionControl(null,true);captainNavigate('${item.action}')">
    <span>${ms700Icon(item.level)}</span><span><strong>${esc(item.title)}</strong><small>${esc(item.text)}</small></span><b>›</b></button>`).join('');
}
function ms700OpenMissionControl(section='readiness'){
  const modal=document.getElementById('ms700MissionModal');if(!modal)return;
  modal.classList.remove('hidden');document.body.classList.add('ms700-mission-open');
  if(typeof hideBottomNavigation==='function')hideBottomNavigation();
  ms700RenderMissionControl();ms700ShowMissionSection(section);
}
function ms700CloseMissionControl(event,force=false){
  const modal=document.getElementById('ms700MissionModal');
  if(event&&!force&&event.target!==modal)return;
  event?.preventDefault?.();event?.stopPropagation?.();
  modal?.classList.add('hidden');document.body.classList.remove('ms700-mission-open');
  if(typeof showBottomNavigation==='function')showBottomNavigation(false,false);
}
function ms700ShowMissionSection(section){
  const names=['readiness','data','diagnostics','backup'];
  const active=names.includes(section)?section:'readiness';
  names.forEach(name=>{
    const cap=name[0].toUpperCase()+name.slice(1);
    document.getElementById(`ms700Section${cap}`)?.classList.toggle('hidden',name!==active);
    document.getElementById(`ms700Tab${cap}`)?.classList.toggle('active',name===active);
  });
  if(active==='diagnostics'&&!ms700DiagnosticResults.length)ms700RunDiagnostics(false);
}
async function ms700FetchTimeout(url,options={},timeout=12000){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{return await fetch(url,{...options,signal:controller.signal,cache:'no-store'})}finally{clearTimeout(timer)}
}
function ms700Diag(title,level,detail){return {title,level,detail}}
async function ms700RunDiagnostics(open=false){
  if(ms700DiagnosticsBusy)return;
  if(open)ms700OpenMissionControl('diagnostics');
  ms700DiagnosticsBusy=true;
  const button=document.getElementById('ms700DiagnosticButton');
  if(button){button.disabled=true;button.textContent='⌁';button.setAttribute('aria-label','Systeemdiagnose bezig')}
  const r=[];
  r.push(ms700Diag('Internetverbinding',navigator.onLine?'good':'info',navigator.onLine?'Apparaat is online.':'Offline; lokale functies blijven beschikbaar.'));
  r.push(ms700Diag('Aanmelding en boot',currentUser&&currentBoat?'good':'critical',currentUser&&currentBoat?`Aangemeld bij ${currentBoat.name||'Serenity'}.`:'Geen geldige gebruiker of boot actief.'));
  try{const reg=await navigator.serviceWorker?.getRegistration?.();r.push(ms700Diag('Offline app-cache',reg?'good':'warning',reg?'Service worker is geregistreerd.':'Service worker is nog niet actief.'))}catch(e){r.push(ms700Diag('Offline app-cache','warning',e.message))}
  try{const key=`ms700-${Date.now()}`;localStorage.setItem(key,'ok');localStorage.removeItem(key);r.push(ms700Diag('Lokale opslag','good','Instellingen en tijdelijke data kunnen worden bewaard.'))}catch{r.push(ms700Diag('Lokale opslag','critical','Lokale opslag is niet beschikbaar.'))}
  if(navigator.storage?.estimate)try{const x=await navigator.storage.estimate(),used=(x.usage||0)/1048576,quota=(x.quota||0)/1048576;r.push(ms700Diag('Beschikbare app-opslag',quota-used>50?'good':'warning',`${used.toFixed(1)} MB gebruikt van ongeveer ${quota.toFixed(0)} MB.`))}catch{}
  try{const p=await navigator.permissions?.query?.({name:'geolocation'});r.push(ms700Diag('GPS-toestemming',p?.state==='denied'?'critical':p?.state==='granted'?'good':'warning',p?.state==='granted'?'Locatiegebruik is toegestaan.':p?.state==='denied'?'Locatiegebruik is geweigerd.':'Safari vraagt toestemming wanneer GPS nodig is.'))}catch{r.push(ms700Diag('GPS-ondersteuning',navigator.geolocation?'good':'critical',navigator.geolocation?'GPS is beschikbaar.':'GPS wordt niet ondersteund.'))}
  if(currentBoat)try{const {error}=await sb.from('boat_settings').select('boat_id').eq('boat_id',currentBoat.id).limit(1);r.push(ms700Diag('Supabase cloud',error?'critical':'good',error?error.message:'Cloudverbinding en toegangsrechten werken.'))}catch(e){r.push(ms700Diag('Supabase cloud','critical',e.message))}
  try{const query='[out:json][timeout:8];node["amenity"="fuel"](52.08,5.10,52.09,5.11);out 1;';const response=await ms700FetchTimeout('/api/overpass',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams({data:query}).toString()});r.push(ms700Diag('Kaart- en POI-dienst',response.ok?'good':'warning',response.ok?'Overpass-proxy reageert.':`HTTP ${response.status}.`))}catch{r.push(ms700Diag('Kaart- en POI-dienst','warning','Kaartdienst reageerde niet binnen de testtijd.'))}
  const ha=homeAssistantStatusCache||(typeof homeAssistantStatusFromTechnicalState==='function'?homeAssistantStatusFromTechnicalState():null);
  const haOnline=ha?.last_status==='connected'||(typeof homeAssistantIsRecentlyOnline==='function'&&homeAssistantIsRecentlyOnline(ha?.last_seen_at));
  r.push(ms700Diag('Home Assistant',!ha?.enabled?'info':haOnline?'good':'warning',!ha?.enabled?'Niet geconfigureerd; dit is optioneel.':haOnline?`Verbonden · ${Number(ha.field_count||0)} waarden ontvangen.`:'Geconfigureerd, maar niet recent verbonden.'));
  ms700DiagnosticResults=r;ms700RenderDiagnostics();ms700DiagnosticsBusy=false;
  if(button){button.disabled=false;button.textContent='⌁';button.setAttribute('aria-label','Systeemdiagnose opnieuw uitvoeren')}
  ms700RenderMissionControl();
}
function ms700RenderDiagnostics(){
  const el=document.getElementById('ms700DiagnosticList');if(!el)return;
  el.innerHTML=ms700DiagnosticResults.map(x=>`<article class="ms700-diagnostic-item ${x.level}">
    <span>${ms700Icon(x.level)}</span><div><strong>${esc(x.title)}</strong><small>${esc(x.detail)}</small></div></article>`).join('');
}
function ms700SystemReport(){
  const s=ms700Snapshot();
  return [`MijnSerenity 7.9.1 systeemrapport`,`Datum: ${new Date().toLocaleString('nl-NL')}`,
    `Boot: ${currentBoat?.name||'Serenity'}`,`Mission-score: ${s.score}/100`,
    `Vertrekcheck: ${s.readiness}/100`,`Datakwaliteit: ${s.data.score}/100`,
    `Online: ${navigator.onLine?'ja':'nee'}`,'','Diagnose:',
    ...(ms700DiagnosticResults.length?ms700DiagnosticResults:[{title:'Nog niet uitgevoerd',level:'info',detail:'Start eerst de diagnose.'}])
      .map(x=>`- [${x.level.toUpperCase()}] ${x.title}: ${x.detail}`)].join('\n');
}
async function ms700CopySystemReport(){
  const report=ms700SystemReport();
  try{await navigator.clipboard.writeText(report);showAppToast('Systeemrapport gekopieerd')}catch{alert(report)}
}
async function ms700FetchBackupTable(table){
  try{const {data,error}=await sb.from(table).select('*').eq('boat_id',currentBoat.id);if(error)throw error;return {rows:data||[]}}catch(error){return {rows:[],error:error?.message||String(error)}}
}
async function ms700BuildBackup(){
  const tables=['boat_settings','pois','poi_photos','trips','trip_photos','costs','cost_receipts','technical_state','technical_events','live_navigation_state'];
  const database={},errors=[];
  for(const table of tables){const result=await ms700FetchBackupTable(table);database[table]=result.rows;if(result.error)errors.push({table,error:result.error})}
  return {format:'mijnserenity-backup',format_version:1,app_version:'7.9.1',created_at:new Date().toISOString(),
    boat:{id:currentBoat.id,name:currentBoat.name||settingsCache?.boat_name||'Serenity'},
    user:{id:currentUser?.id||null,email:currentUser?.email||null,role:currentRole||null},
    database,local:{smart_route_profile:ms700BoatProfile(),departure_check_today:ms700ManualChecks(),technical_cache:technicalStateCache||null,settings_cache:settingsCache||null},
    summary:{pois:database.pois?.length||0,poi_photos:database.poi_photos?.length||0,trips:database.trips?.length||0,trip_photos:database.trip_photos?.length||0,costs:database.costs?.length||0},errors};
}
function ms700SafeName(v){return String(v||'serenity').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'serenity'}
async function ms700CreateAndShareBackup(){
  if(ms700BackupBusy)return;
  if(!currentBoat||!currentUser){alert('Log opnieuw in voordat je een backup maakt.');return}
  ms700BackupBusy=true;
  const button=document.getElementById('ms700BackupButton');if(button)button.disabled=true;
  try{
    const backup=await ms700BuildBackup(),json=JSON.stringify(backup,null,2),date=new Date().toISOString().slice(0,10);
    const file=new File([json],`MijnSerenity-${ms700SafeName(backup.boat.name)}-${date}.json`,{type:'application/json'});
    localStorage.setItem(ms700BackupKey(),String(Date.now()));
    let shared=false;
    try{const data={title:'MijnSerenity backup',text:`Backup van ${backup.boat.name} · ${date}`,files:[file]};
      if(navigator.share&&(!navigator.canShare||navigator.canShare(data))){await navigator.share(data);shared=true}}catch(e){if(e?.name==='AbortError')shared=true}
    if(!shared){const url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=file.name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
    ms700SetText('ms700BackupSummary',`${backup.summary.trips} vaartochten · ${backup.summary.pois} POI’s · ${backup.summary.costs} kosten · ${backup.summary.poi_photos+backup.summary.trip_photos} fotoverwijzingen${backup.errors.length?` · ${backup.errors.length} tabellen niet gelezen`:''}`);
    showAppToast('MijnSerenity-backup is gereed');
  }catch(e){alert(`Backup maken mislukt: ${e?.message||e}`)}
  finally{ms700BackupBusy=false;if(button)button.disabled=false;ms700RenderMissionControl()}
}
function ms700RenderBackup(){
  const last=ms700LastBackup(),badge=document.getElementById('ms700BackupBadge'),summary=document.getElementById('ms700BackupSummary');
  if(badge){badge.className=`ms700-section-badge ${!last?'warning':Date.now()-last<7*86400000?'good':'warning'}`;badge.textContent=last?ms700AgeText(last):'Nog geen backup'}
  if(summary&&!summary.textContent)summary.textContent=last?`Laatste backup: ${new Date(last).toLocaleString('nl-NL')}`:'Er is nog geen backup geregistreerd.';
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.getElementById('ms700MissionModal')?.classList.contains('hidden'))ms700CloseMissionControl(e,true)});
const ms700OriginalRenderCaptain=renderCaptainCommandCenter;
renderCaptainCommandCenter=function(){const r=ms700OriginalRenderCaptain();ms700RenderMissionControl();return r};
const ms700OriginalRenderTechnical=renderTechnicalDashboard;
renderTechnicalDashboard=function(){const r=ms700OriginalRenderTechnical();ms700RenderMissionControl();return r};
const ms700OriginalRenderTrips=renderTripList;
renderTripList=function(){const r=ms700OriginalRenderTrips();ms700RenderMissionControl();return r};
const ms700OriginalLoadPois=loadPois;
loadPois=async function(){const r=await ms700OriginalLoadPois();ms700RenderMissionControl();return r};
window.addEventListener('online',ms700RenderMissionControl,{passive:true});
window.addEventListener('offline',ms700RenderMissionControl,{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)ms700RenderMissionControl()});
setTimeout(ms700RenderMissionControl,1200);
