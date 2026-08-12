/* ============================================================
   MijnSerenity 7.16 — Entertainment & Home Assistant
   Radio, Bluetooth-route, Spotify, TV, favorieten en bestaande
   Home Assistant-bediening in één pagina.
   ============================================================ */

const MS712_ENTERTAINMENT_VERSION=3;
const MS712_DEFAULT_VOLUME=35;
const MS712_DEFAULT_BRIGHTNESS=70;

function ms712Escape(value){
  if(typeof esc==='function')return esc(value);
  return String(value??'').replace(/[&<>'"]/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  })[char]);
}

function ms712RandomId(){
  if(globalThis.crypto?.randomUUID)return crypto.randomUUID();
  const bytes=new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');
}

function ms712DefaultPlayers(){
  return [
    {key:'salon',name:'Audio salon',entityId:''},
    {key:'stuurstand',name:'Audio stuurstand',entityId:''},
    {key:'achterdek',name:'Audio achterdek',entityId:''}
  ];
}
function ms712DefaultLights(){
  return [
    {key:'salon',name:'Hue salon',entityId:''},
    {key:'stuurstand',name:'Hue stuurstand',entityId:''},
    {key:'achterdek',name:'Hue achterdek',entityId:''},
    {key:'slaapruimte',name:'Hue slaapruimte',entityId:''}
  ];
}
function ms712DefaultScenes(){
  return [
    {key:'avond',name:'Avond aan boord',entityId:''},
    {key:'varen',name:'Varen',entityId:''},
    {key:'slapen',name:'Slapen',entityId:''},
    {key:'alles-uit',name:'Alles uit',entityId:''}
  ];
}
function ms712DefaultFavorites(){
  const defaults=[
    ['Radio 1','music'],['Radio 2','music'],['Radio 3','music'],
    ['Playlist 1','playlist'],['Playlist 2','playlist'],['Playlist 3','playlist']
  ];
  return defaults.map((item,index)=>({
    id:`favoriet-${index+1}`,name:item[0],mediaContentId:'',mediaContentType:item[1]
  }));
}
function ms712DefaultConfig(){
  return {
    version:MS712_ENTERTAINMENT_VERSION,enabled:false,haBaseUrl:'',
    dashboardPath:'/lovelace/mijnserenity',webhookId:'',activePlayer:'salon',
    activeLight:'salon',volume:MS712_DEFAULT_VOLUME,brightness:MS712_DEFAULT_BRIGHTNESS,
    ring:{name:'Ring beveiliging',cameraEntity:'',motionSwitchEntity:''},
    hue:{lights:ms712DefaultLights()},players:ms712DefaultPlayers(),
    appleTv:{name:'TV / Apple TV',mediaEntity:'',remoteEntity:''},
    scenes:ms712DefaultScenes(),favorites:ms712DefaultFavorites(),updatedAt:null
  };
}
function ms712SafeKey(value,fallback='apparaat'){
  const key=String(value||'').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'');
  return key||fallback;
}
function ms712Entity(value){return String(value||'').trim().toLowerCase().slice(0,160);}
function ms712IsValidEntity(value,domain=''){
  const entity=String(value||'').trim();
  if(!entity)return true;
  if(!/^[a-z0-9_]+\.[a-z0-9_]+$/.test(entity))return false;
  return !domain||entity.startsWith(`${domain}.`);
}
function ms712NormaliseNamedEntities(savedItems,defaults){
  const saved=Array.isArray(savedItems)?savedItems:[];
  return defaults.map((item,index)=>{
    const candidate=saved[index]||{};
    return {key:ms712SafeKey(candidate.key||item.key,item.key),
      name:String(candidate.name||item.name).trim().slice(0,50)||item.name,
      entityId:ms712Entity(candidate.entityId)};
  });
}
function ms712NormaliseConfig(value){
  const base=ms712DefaultConfig();
  const saved=value&&typeof value==='object'?value:{};
  const players=ms712NormaliseNamedEntities(saved.players,base.players);
  const lights=ms712NormaliseNamedEntities(saved.hue?.lights,base.hue.lights);
  const scenes=ms712NormaliseNamedEntities(saved.scenes,base.scenes);
  const savedFavorites=Array.isArray(saved.favorites)?saved.favorites:[];
  const favorites=base.favorites.map((favorite,index)=>{
    const candidate=savedFavorites[index]||{};
    return {id:String(candidate.id||favorite.id),
      name:String(candidate.name||favorite.name).trim().slice(0,50)||favorite.name,
      mediaContentId:String(candidate.mediaContentId||'').trim().slice(0,1000),
      mediaContentType:String(candidate.mediaContentType||favorite.mediaContentType||'music').trim().slice(0,80)};
  });
  const activePlayer=players.some(p=>p.key===saved.activePlayer&&p.entityId)
    ?saved.activePlayer:(players.find(p=>p.entityId)?.key||players[0].key);
  const activeLight=lights.some(l=>l.key===saved.activeLight&&l.entityId)
    ?saved.activeLight:(lights.find(l=>l.entityId)?.key||lights[0].key);
  return {...base,...saved,version:MS712_ENTERTAINMENT_VERSION,
    enabled:Boolean(saved.enabled),haBaseUrl:String(saved.haBaseUrl||'').trim().replace(/\/+$/,''),
    dashboardPath:String(saved.dashboardPath||base.dashboardPath).trim().slice(0,240)||base.dashboardPath,
    webhookId:String(saved.webhookId||'').trim().replace(/[^a-zA-Z0-9_-]/g,''),
    activePlayer,activeLight,
    volume:Math.max(0,Math.min(100,Number(saved.volume)||MS712_DEFAULT_VOLUME)),
    brightness:Math.max(1,Math.min(100,Number(saved.brightness)||MS712_DEFAULT_BRIGHTNESS)),
    ring:{...base.ring,...(saved.ring||{}),name:String(saved.ring?.name||base.ring.name).slice(0,50),
      cameraEntity:ms712Entity(saved.ring?.cameraEntity),motionSwitchEntity:ms712Entity(saved.ring?.motionSwitchEntity)},
    hue:{...base.hue,...(saved.hue||{}),lights},players,
    appleTv:{...base.appleTv,...(saved.appleTv||{}),name:String(saved.appleTv?.name||base.appleTv.name).slice(0,50),
      mediaEntity:ms712Entity(saved.appleTv?.mediaEntity),remoteEntity:ms712Entity(saved.appleTv?.remoteEntity)},
    scenes,favorites};
}
function ms712LocalKey(name){
  return `mijnserenity-home-assistant-${name}-${globalThis.currentBoat?.id||'geen-boot'}`;
}
function ms712ReadTechnical(){
  try{
    if(globalThis.technicalStateCache)return globalThis.technicalStateCache;
    if(typeof readTechnicalLocalState==='function')return readTechnicalLocalState();
  }catch(error){console.warn(error);}
  return {};
}
function ms712Config(){
  const config=ms712NormaliseConfig(ms712ReadTechnical()?.entertainment||ms712DefaultConfig());
  try{
    const player=localStorage.getItem(ms712LocalKey('player'))||'';
    if(config.players.some(p=>p.key===player&&p.entityId))config.activePlayer=player;
    const light=localStorage.getItem(ms712LocalKey('light'))||'';
    if(config.hue.lights.some(l=>l.key===light&&l.entityId))config.activeLight=light;
    const volume=Number(localStorage.getItem(ms712LocalKey('volume')));
    if(Number.isFinite(volume)&&volume>=0&&volume<=100)config.volume=volume;
    const brightness=Number(localStorage.getItem(ms712LocalKey('brightness')));
    if(Number.isFinite(brightness)&&brightness>=1&&brightness<=100)config.brightness=brightness;
  }catch(error){console.warn('Entertainment-keuze lezen mislukt:',error);}
  return config;
}
function ms712ConfiguredPlayers(config=ms712Config()){return config.players.filter(p=>p.entityId);}
function ms712ConfiguredLights(config=ms712Config()){return config.hue.lights.filter(l=>l.entityId);}
function ms712ConfiguredScenes(config=ms712Config()){return config.scenes.filter(s=>s.entityId);}
function ms712ConfiguredDeviceCount(config=ms712Config()){
  return [...ms712ConfiguredPlayers(config),...ms712ConfiguredLights(config),...ms712ConfiguredScenes(config),
    config.ring.cameraEntity||config.ring.motionSwitchEntity?'ring':'',
    config.appleTv.mediaEntity||config.appleTv.remoteEntity?'tv':''].filter(Boolean).length;
}
function ms712WebhookUrl(config=ms712Config()){
  return config.haBaseUrl&&config.webhookId?`${config.haBaseUrl}/api/webhook/${config.webhookId}`:'';
}
function ms712DashboardUrl(config=ms712Config()){
  if(!config.haBaseUrl)return '';
  const path=String(config.dashboardPath||'').trim();
  if(/^https:\/\//i.test(path))return path;
  return path?`${config.haBaseUrl}${path.startsWith('/')?'':'/'}${path}`:config.haBaseUrl;
}
function ms712ConnectionState(config=ms712Config()){
  const deviceCount=ms712ConfiguredDeviceCount(config);
  return {ready:Boolean(config.haBaseUrl&&config.webhookId&&deviceCount),deviceCount};
}
function ms712SetStatus(message,state=''){
  const el=document.getElementById('entertainmentStatus');
  if(!el)return;
  el.textContent=message||'';el.classList.toggle('hidden',!message);
  el.classList.remove('success','warning','error');if(state)el.classList.add(state);
}
function ms712Toast(message){
  if(typeof showAppToast==='function')showAppToast(message);else ms712SetStatus(message,'warning');
}

function ms716InjectStyles(){
  if(document.getElementById('ms716EntertainmentStyles'))return;
  const style=document.createElement('style');
  style.id='ms716EntertainmentStyles';
  style.textContent=`
  .ms716-media-hub{display:grid;gap:14px;margin:14px 0 18px}.ms716-media-intro{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px;border:1px solid rgba(125,211,252,.22);border-radius:22px;background:linear-gradient(145deg,rgba(8,31,51,.96),rgba(5,18,31,.96))}.ms716-media-intro h3{margin:3px 0 5px}.ms716-media-intro p{margin:0;max-width:720px}.ms716-media-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.ms716-media-card{border:1px solid rgba(148,163,184,.2);border-radius:20px;padding:16px;background:rgba(8,25,41,.88);min-width:0}.ms716-media-card-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}.ms716-media-icon{font-size:27px;width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:rgba(56,189,248,.12)}.ms716-media-card-head strong{display:block;font-size:1rem}.ms716-media-card-head small{display:block;opacity:.72;margin-top:2px}.ms716-media-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ms716-media-actions button{min-width:0}.ms716-media-card p{margin:10px 0 0}.ms716-favorites{padding:16px;border:1px solid rgba(148,163,184,.18);border-radius:20px;background:rgba(8,25,41,.75)}.ms716-fav-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}.ms716-fav-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.ms716-fav{display:flex!important;align-items:center!important;gap:9px!important;text-align:left!important;justify-content:flex-start!important;min-width:0}.ms716-fav span{font-size:18px}.ms716-fav b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ms716-empty{grid-column:1/-1;padding:13px;border-radius:14px;background:rgba(148,163,184,.08);font-size:.88rem;opacity:.82}.ms716-bluetooth-note{display:flex;gap:8px;align-items:flex-start;margin-top:10px;font-size:.82rem;opacity:.78}.ms716-dashboard-tile .tile-icon-shell{background:rgba(139,92,246,.14)}
  @media(max-width:760px){.ms716-media-grid{grid-template-columns:1fr}.ms716-fav-grid{grid-template-columns:1fr 1fr}.ms716-media-intro{padding:15px}.ms716-media-card{padding:14px}}
  @media(max-width:430px){.ms716-fav-grid{grid-template-columns:1fr}.ms716-media-actions{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);
}
function ms716RelabelPage(){
  const tab=document.querySelector('.tab[data-target="entertainment"]');
  if(tab)tab.textContent='Entertainment';
  const page=document.getElementById('entertainment');
  if(!page)return;
  const hero=page.querySelector('.entertainment-hero');
  if(hero){
    const eyebrow=hero.querySelector('.eyebrow');if(eyebrow)eyebrow.textContent='ENTERTAINMENT AAN BOORD';
    const title=hero.querySelector('h2');if(title)title.textContent='Radio, Spotify & TV';
    const text=hero.querySelector('p.small');if(text)text.textContent='Bedien muziek, radio en tv vanaf één plek. Favoriete zenders en afspeellijsten staan direct klaar voor Serenity.';
  }
}
function ms716AddDashboardTile(){
  const grid=document.querySelector('#dashboard .dashboard-actions');
  if(!grid||grid.querySelector('[data-route="entertainment"]'))return;
  const button=document.createElement('button');
  button.type='button';button.className='dashboard-tile ms716-dashboard-tile';button.dataset.route='entertainment';
  button.onclick=event=>{if(typeof dashboardNavigate==='function')dashboardNavigate('entertainment',event);else if(typeof captainNavigate==='function')captainNavigate('entertainment');};
  button.innerHTML='<span class="tile-icon-shell"><span class="tile-icon">🎵</span></span><span class="tile-copy"><b>Entertainment</b><small>Radio, Spotify & TV</small></span><span class="tile-arrow">›</span>';
  const settings=grid.querySelector('[data-route="settings"]');
  grid.insertBefore(button,settings||null);
}
function ms716FavoriteIcon(favorite){
  const type=`${favorite.mediaContentType} ${favorite.name}`.toLowerCase();
  if(type.includes('radio')||type.includes('station'))return '📻';
  if(type.includes('playlist')||type.includes('spotify'))return '🎵';
  return '⭐';
}
function ms716RenderMediaHub(config=ms712Config()){
  const page=document.getElementById('entertainment');if(!page)return;
  let hub=document.getElementById('ms716MediaHub');
  if(!hub){
    hub=document.createElement('section');hub.id='ms716MediaHub';hub.className='ms716-media-hub';
    const toolbar=page.querySelector('.smart-home-toolbar');
    (toolbar?.parentNode||page).insertBefore(hub,toolbar?.nextSibling||page.firstChild);
  }
  const configured=ms712ConfiguredPlayers(config).length>0;
  const favorites=config.favorites.map((f,index)=>({...f,index})).filter(f=>f.mediaContentId);
  hub.innerHTML=`
    <div class="ms716-media-intro">
      <div><span class="eyebrow">MEDIA CENTER</span><h3>Entertainment op Serenity</h3><p class="small">Kies radio, Spotify of TV. De actieve audiozone gebruikt je ingestelde Home Assistant media_player.</p></div>
      <button type="button" class="secondary" onclick="ms712ToggleSettings(true)">⚙️ Instellen</button>
    </div>
    <div class="ms716-media-grid">
      <article class="ms716-media-card">
        <div class="ms716-media-card-head"><span class="ms716-media-icon">📻</span><div><strong>Radio & Bluetooth</strong><small>${configured?'Audiozone gereed':'Koppel eerst een audiozone'}</small></div></div>
        <div class="ms716-media-actions"><button type="button" onclick="ms712Command('play_pause')">⏯ Afspelen</button><button type="button" class="secondary" onclick="ms716BluetoothHelp()">ᛒ Bluetooth</button><button type="button" class="secondary" onclick="ms712Command('volume_down')">🔉 Zachter</button><button type="button" class="secondary" onclick="ms712Command('volume_up')">🔊 Harder</button></div>
        <div class="ms716-bluetooth-note"><span>ℹ️</span><span>Bluetooth-audio wordt op iPhone/iPad gekoppeld in de apparaatinstellingen; bediening loopt daarna via de gekozen audiozone/Home Assistant.</span></div>
      </article>
      <article class="ms716-media-card">
        <div class="ms716-media-card-head"><span class="ms716-media-icon">🟢</span><div><strong>Spotify</strong><small>Afspeellijsten en Spotify Connect</small></div></div>
        <div class="ms716-media-actions"><button type="button" onclick="ms716OpenSpotify()">Open Spotify</button><button type="button" class="secondary" onclick="ms712Command('play_pause')">⏯ Play/pauze</button></div>
        <p class="small">Sla Spotify-playlists hieronder als favoriet op of kies Serenity als Spotify Connect-apparaat wanneer je mediaspeler dat ondersteunt.</p>
      </article>
      <article class="ms716-media-card">
        <div class="ms716-media-card-head"><span class="ms716-media-icon">📺</span><div><strong>TV</strong><small>${config.appleTv.mediaEntity||config.appleTv.remoteEntity?'TV-bediening gekoppeld':'Ruimte voor Apple TV / smart-tv'}</small></div></div>
        <div class="ms716-media-actions"><button type="button" onclick="ms712AppleTvCommand('play_pause','media')">⏯ Play/pauze</button><button type="button" class="secondary" onclick="ms712AppleTvCommand('home','remote')">⌂ Home</button><button type="button" class="secondary" onclick="ms712AppleTvCommand('volume_down','media')">🔉 Zachter</button><button type="button" class="secondary" onclick="ms712AppleTvCommand('volume_up','media')">🔊 Harder</button></div>
      </article>
    </div>
    <div class="ms716-favorites"><div class="ms716-fav-head"><div><span class="eyebrow">FAVORIETEN</span><strong>Zenders & afspeellijsten</strong></div><button type="button" class="secondary" onclick="ms712ToggleSettings(true)">＋ Beheren</button></div><div class="ms716-fav-grid">${favorites.length?favorites.map(f=>`<button type="button" class="secondary ms716-fav" onclick="ms712PlayFavoriteByOriginalIndex(${f.index})"><span>${ms716FavoriteIcon(f)}</span><b>${ms712Escape(f.name)}</b></button>`).join(''):'<div class="ms716-empty">Nog geen favorieten ingesteld. Voeg bijvoorbeeld NPO Radio 2, Radio 10 en je Spotify-playlists toe via <b>Beheren</b>.</div>'}</div></div>`;
}
function ms716BluetoothHelp(){
  const message='Koppel de radio op iPhone/iPad via Instellingen → Bluetooth. Kies daarna in MijnSerenity de Home Assistant audiozone waarmee de radio/receiver wordt bediend.';
  ms712Toast(message);
  ms712SetStatus(message,'warning');
}
function ms716OpenSpotify(){
  window.open('https://open.spotify.com/','_blank','noopener,noreferrer');
}
function ms716Bootstrap(){
  ms716InjectStyles();ms716RelabelPage();ms716AddDashboardTile();ms716RenderMediaHub();
}

function ms712RenderCloudBadge(){
  const badge=document.getElementById('entertainmentCloudBadge');if(!badge)return;
  const ready=Boolean(globalThis.technicalCloudReady);
  badge.className=`entertainment-cloud-badge ${ready?'online':'warning'}`;
  badge.textContent=ready?'☁️ Gedeeld op alle apparaten':'⚠️ Alleen op dit apparaat';
}
function ms712SetIntegrationState(id,configured,detail){
  const el=document.getElementById(id);if(!el)return;
  el.className=`smart-home-device-state ${configured?'online':'offline'}`;el.textContent=configured?detail:'Nog instellen';
}
function ms712RenderIntegrationStates(config){
  ms712SetIntegrationState('ringDeviceState',Boolean(config.ring.cameraEntity||config.ring.motionSwitchEntity),'Gekoppeld');
  const hue=ms712ConfiguredLights(config).length;ms712SetIntegrationState('hueDeviceState',hue>0,`${hue} zone${hue===1?'':'s'}`);
  const audio=ms712ConfiguredPlayers(config).length;ms712SetIntegrationState('sonosDeviceState',audio>0,`${audio} audiozone${audio===1?'':'s'}`);
  ms712SetIntegrationState('appleTvDeviceState',Boolean(config.appleTv.mediaEntity||config.appleTv.remoteEntity),'Gekoppeld');
}
function ms712RenderPlayerOptions(config){
  const select=document.getElementById('entertainmentActivePlayer');if(!select)return;
  const items=ms712ConfiguredPlayers(config);
  select.innerHTML=items.length?items.map(p=>`<option value="${ms712Escape(p.key)}">${ms712Escape(p.name)}</option>`).join(''):'<option value="">Nog geen audiozone ingesteld</option>';
  select.value=items.some(p=>p.key===config.activePlayer)?config.activePlayer:(items[0]?.key||'');select.disabled=!items.length;
}
function ms712RenderLightOptions(config){
  const select=document.getElementById('hueActiveLight');if(!select)return;
  const items=ms712ConfiguredLights(config);
  select.innerHTML=items.length?items.map(l=>`<option value="${ms712Escape(l.key)}">${ms712Escape(l.name)}</option>`).join(''):'<option value="">Nog geen Hue-zone ingesteld</option>';
  select.value=items.some(l=>l.key===config.activeLight)?config.activeLight:(items[0]?.key||'');select.disabled=!items.length;
}
function ms712RenderPlayerCards(config){
  const container=document.getElementById('entertainmentPlayerCards');if(!container)return;
  const items=ms712ConfiguredPlayers(config);
  container.innerHTML=items.length?items.map(p=>`<button type="button" class="entertainment-player-card ${p.key===config.activePlayer?'active':''}" onclick="ms712SelectPlayer('${ms712Escape(p.key)}')"><span>🔊</span><strong>${ms712Escape(p.name)}</strong><small>${ms712Escape(p.entityId)}</small></button>`).join(''):'<div class="entertainment-empty-state compact"><span>🔊</span><strong>Nog geen audiozone gekoppeld</strong><small>Vul bij Instellen een media_player-entiteit in.</small></div>';
}
function ms712RenderLightCards(config){
  const c=document.getElementById('hueLightCards');if(!c)return;const items=ms712ConfiguredLights(config);
  c.innerHTML=items.length?items.map(l=>`<article class="smart-home-zone-card ${l.key===config.activeLight?'active':''}"><button type="button" class="smart-home-zone-select" onclick="ms712SelectLight('${ms712Escape(l.key)}')"><span>💡</span><strong>${ms712Escape(l.name)}</strong><small>${ms712Escape(l.entityId)}</small></button><div class="smart-home-zone-actions"><button type="button" class="secondary" onclick="ms712HueCommand('turn_on','${ms712Escape(l.key)}')">Aan</button><button type="button" class="secondary" onclick="ms712HueCommand('turn_off','${ms712Escape(l.key)}')">Uit</button></div></article>`).join(''):'<div class="entertainment-empty-state compact"><span>💡</span><strong>Nog geen Hue-zone gekoppeld</strong></div>';
}
function ms712RenderScenes(config){
  const c=document.getElementById('homeAssistantScenes');if(!c)return;const items=ms712ConfiguredScenes(config);
  c.innerHTML=items.length?items.map((s,i)=>`<button type="button" class="smart-home-scene-button" onclick="ms712SceneCommand(${i})"><span>${['🌙','⛵','🛏️','🌑'][i]||'✨'}</span><strong>${ms712Escape(s.name)}</strong></button>`).join(''):'<div class="entertainment-empty-state compact"><span>✨</span><strong>Nog geen scènes gekoppeld</strong></div>';
}
function ms712RenderFavorites(config){
  const c=document.getElementById('entertainmentFavorites');if(!c)return;
  const items=config.favorites.map((f,index)=>({...f,index})).filter(f=>f.mediaContentId);
  c.innerHTML=items.length?items.map(f=>`<button type="button" class="entertainment-favorite" onclick="ms712PlayFavoriteByOriginalIndex(${f.index})"><span>${ms716FavoriteIcon(f)}</span><strong>${ms712Escape(f.name)}</strong><small>${ms712Escape(f.mediaContentType)}</small></button>`).join(''):'<div class="entertainment-empty-state compact"><span>⭐</span><strong>Nog geen favoriete zenders of playlists</strong><small>Voeg ze toe bij Instellen.</small></div>';
}
function ms712InputValue(id){return String(document.getElementById(id)?.value||'').trim();}
function ms712FillSettings(config){
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.value=value??'';};
  set('entertainmentHaBaseUrl',config.haBaseUrl);set('entertainmentDashboardPath',config.dashboardPath);set('entertainmentWebhookId',config.webhookId);
  set('ringName',config.ring.name);set('ringCameraEntity',config.ring.cameraEntity);set('ringMotionSwitchEntity',config.ring.motionSwitchEntity);
  set('appleTvName',config.appleTv.name);set('appleTvMediaEntity',config.appleTv.mediaEntity);set('appleTvRemoteEntity',config.appleTv.remoteEntity);
  config.hue.lights.forEach((l,i)=>{set(`hueLightName${i+1}`,l.name);set(`hueLightEntity${i+1}`,l.entityId);});
  config.players.forEach((p,i)=>{set(`entertainmentPlayerName${i+1}`,p.name);set(`entertainmentPlayerEntity${i+1}`,p.entityId);});
  config.scenes.forEach((s,i)=>{set(`homeAssistantSceneName${i+1}`,s.name);set(`homeAssistantSceneEntity${i+1}`,s.entityId);});
  config.favorites.forEach((f,i)=>{set(`entertainmentFavoriteName${i+1}`,f.name);set(`entertainmentFavoriteUrl${i+1}`,f.mediaContentId);set(`entertainmentFavoriteType${i+1}`,f.mediaContentType);});
  const yaml=document.getElementById('entertainmentYaml');if(yaml)yaml.value=ms712BuildYaml(config);
}
function renderEntertainmentPage(){
  ms716Bootstrap();const config=ms712Config(),state=ms712ConnectionState(config);
  ms712RenderCloudBadge();ms712RenderIntegrationStates(config);ms712RenderPlayerOptions(config);ms712RenderLightOptions(config);ms712RenderPlayerCards(config);ms712RenderLightCards(config);ms712RenderScenes(config);ms712RenderFavorites(config);ms712FillSettings(config);ms716RenderMediaHub(config);
  const badge=document.getElementById('entertainmentConnectionBadge');if(badge){badge.className=`entertainment-connection-badge ${state.ready?'online':'offline'}`;badge.textContent=state.ready?`${state.deviceCount} koppeling${state.deviceCount===1?'':'en'} gereed`:'Nog instellen';}
  const volume=document.getElementById('entertainmentVolume'),vv=document.getElementById('entertainmentVolumeValue');if(volume){volume.value=String(config.volume);volume.disabled=!ms712ConfiguredPlayers(config).length;}if(vv)vv.textContent=`${Math.round(config.volume)}%`;
  const bright=document.getElementById('hueBrightness'),bv=document.getElementById('hueBrightnessValue');if(bright){bright.value=String(config.brightness);bright.disabled=!ms712ConfiguredLights(config).length;}if(bv)bv.textContent=`${Math.round(config.brightness)}%`;
  document.querySelectorAll('[data-entertainment-command]').forEach(b=>b.disabled=!ms712ConfiguredPlayers(config).length||!state.ready);
}
async function initEntertainmentPage(){
  if(!globalThis.currentBoat){ms712Toast('Koppel eerst Serenity.');return;}
  try{if(!globalThis.technicalStateCache&&typeof readTechnicalLocalState==='function')globalThis.technicalStateCache=readTechnicalLocalState();}catch(e){}
  renderEntertainmentPage();
  try{if(typeof loadTechnicalDashboard==='function'){await loadTechnicalDashboard(false);renderEntertainmentPage();}}catch(error){console.warn('Entertainment cloud laden mislukt:',error);}
}
function ms712ToggleSettings(force){
  const panel=document.getElementById('entertainmentSettingsPanel');if(!panel)return;
  const open=typeof force==='boolean'?force:panel.classList.contains('hidden');panel.classList.toggle('hidden',!open);
  if(open){ms712FillSettings(ms712Config());if(!document.getElementById('entertainmentWebhookId')?.value)ms712GenerateWebhookId();panel.scrollIntoView({behavior:'smooth',block:'start'});}
}
function ms712GenerateWebhookId(){const input=document.getElementById('entertainmentWebhookId');if(!input)return;input.value=`serenity_${ms712RandomId().replace(/-/g,'')}`;ms712RefreshYamlPreview();ms712SetStatus('Nieuwe beveiligde webhookcode gemaakt. Sla de instellingen op.','warning');}
function ms712CollectConfig(){
  const previous=ms712Config();
  const players=ms712DefaultPlayers().map((p,i)=>({key:p.key,name:ms712InputValue(`entertainmentPlayerName${i+1}`)||p.name,entityId:ms712InputValue(`entertainmentPlayerEntity${i+1}`)}));
  const lights=ms712DefaultLights().map((l,i)=>({key:l.key,name:ms712InputValue(`hueLightName${i+1}`)||l.name,entityId:ms712InputValue(`hueLightEntity${i+1}`)}));
  const scenes=ms712DefaultScenes().map((s,i)=>({key:s.key,name:ms712InputValue(`homeAssistantSceneName${i+1}`)||s.name,entityId:ms712InputValue(`homeAssistantSceneEntity${i+1}`)}));
  const favorites=ms712DefaultFavorites().map((f,i)=>({id:f.id,name:ms712InputValue(`entertainmentFavoriteName${i+1}`)||f.name,mediaContentId:ms712InputValue(`entertainmentFavoriteUrl${i+1}`),mediaContentType:ms712InputValue(`entertainmentFavoriteType${i+1}`)||f.mediaContentType}));
  const configuredPlayers=players.filter(p=>p.entityId),configuredLights=lights.filter(l=>l.entityId);
  const config=ms712NormaliseConfig({...previous,haBaseUrl:ms712InputValue('entertainmentHaBaseUrl').replace(/\/+$/,''),dashboardPath:ms712InputValue('entertainmentDashboardPath')||'/lovelace/mijnserenity',webhookId:ms712InputValue('entertainmentWebhookId'),activePlayer:configuredPlayers.some(p=>p.key===previous.activePlayer)?previous.activePlayer:(configuredPlayers[0]?.key||players[0].key),activeLight:configuredLights.some(l=>l.key===previous.activeLight)?previous.activeLight:(configuredLights[0]?.key||lights[0].key),ring:{name:ms712InputValue('ringName')||'Ring beveiliging',cameraEntity:ms712InputValue('ringCameraEntity'),motionSwitchEntity:ms712InputValue('ringMotionSwitchEntity')},hue:{lights},players,appleTv:{name:ms712InputValue('appleTvName')||'TV / Apple TV',mediaEntity:ms712InputValue('appleTvMediaEntity'),remoteEntity:ms712InputValue('appleTvRemoteEntity')},scenes,favorites,updatedAt:new Date().toISOString()});
  config.enabled=ms712ConnectionState(config).ready;return config;
}
function ms712ValidateConfig(config){
  if(!config.haBaseUrl)return 'Vul het externe HTTPS-adres van Home Assistant in.';
  if(!/^https:\/\//i.test(config.haBaseUrl))return 'Gebruik een extern HTTPS-adres voor Home Assistant.';
  if(!config.webhookId)return 'Maak eerst een beveiligde webhookcode.';
  if(!ms712ConfiguredDeviceCount(config))return 'Vul minimaal één audio-, TV-, Hue-, Ring- of scène-entiteit in.';
  const checks=[[config.ring.cameraEntity,'camera','Ring camera'],[config.ring.motionSwitchEntity,'switch','Ring detectie'],[config.appleTv.mediaEntity,'media_player','TV mediaspeler'],[config.appleTv.remoteEntity,'remote','TV afstandsbediening'],...config.hue.lights.map(l=>[l.entityId,'light',l.name]),...config.players.map(p=>[p.entityId,'media_player',p.name]),...config.scenes.map(s=>[s.entityId,'scene',s.name])];
  const invalid=checks.find(([entity,domain])=>entity&&!ms712IsValidEntity(entity,domain));return invalid?`${invalid[2]} heeft geen geldige ${invalid[1]}-entiteit.`:'';
}
async function ms712SaveSettings(){
  if(!globalThis.currentBoat||!globalThis.currentUser){ms712Toast('Log eerst in en koppel Serenity.');return;}
  const config=ms712CollectConfig(),validation=ms712ValidateConfig(config);if(validation){ms712SetStatus(validation,'error');return;}
  ms712SetStatus('Entertainment-instellingen opslaan…');
  try{
    if(typeof loadTechnicalDashboard==='function')await loadTechnicalDashboard(true);
    const state={...(globalThis.technicalStateCache||ms712ReadTechnical()),entertainment:config};
    globalThis.technicalStateCache=typeof normaliseTechnicalState==='function'?normaliseTechnicalState(state):state;
    let shared=false;if(typeof persistTechnicalState==='function')shared=await persistTechnicalState('Entertainment-instellingen opgeslagen.');
    renderEntertainmentPage();ms712SetStatus(shared?'Opgeslagen en gedeeld met alle apparaten ✅':'Lokaal opgeslagen. Cloud synchronisatie is nog niet beschikbaar.',shared?'success':'warning');
  }catch(error){console.error(error);ms712SetStatus('Opslaan is niet gelukt. Probeer het opnieuw.','error');}
}
async function ms712SaveLocalChoice(type,value){if(!value)return;try{localStorage.setItem(ms712LocalKey(type),value);}catch(e){}renderEntertainmentPage();}
function ms712SelectPlayer(key){const c=ms712Config();if(c.players.some(p=>p.key===key&&p.entityId))ms712SaveLocalChoice('player',key);}
function ms712PlayerChanged(){ms712SelectPlayer(document.getElementById('entertainmentActivePlayer')?.value||'');}
function ms712SelectLight(key){const c=ms712Config();if(c.hue.lights.some(l=>l.key===key&&l.entityId))ms712SaveLocalChoice('light',key);}
function ms712LightChanged(){ms712SelectLight(document.getElementById('hueActiveLight')?.value||'');}
function ms712VolumeLabel(){const i=document.getElementById('entertainmentVolume'),l=document.getElementById('entertainmentVolumeValue');if(l)l.textContent=`${Math.round(Number(i?.value)||0)}%`;}
async function ms712VolumeChanged(){const i=document.getElementById('entertainmentVolume'),v=Math.max(0,Math.min(100,Number(i?.value)||0));try{localStorage.setItem(ms712LocalKey('volume'),String(v));}catch(e){}return ms712SendCommand('media','volume_set',ms712Config().activePlayer,{volume:(v/100).toFixed(2)});}
function ms712BrightnessLabel(){const i=document.getElementById('hueBrightness'),l=document.getElementById('hueBrightnessValue');if(l)l.textContent=`${Math.round(Number(i?.value)||0)}%`;}
async function ms712BrightnessChanged(){const i=document.getElementById('hueBrightness'),v=Math.max(1,Math.min(100,Number(i?.value)||MS712_DEFAULT_BRIGHTNESS));try{localStorage.setItem(ms712LocalKey('brightness'),String(v));}catch(e){}return ms712SendCommand('hue','brightness',ms712Config().activeLight,{brightness_pct:v});}
async function ms712SendCommand(category,action,target='',extra={}){
  const config=ms712Config(),state=ms712ConnectionState(config);
  if(!navigator.onLine){ms712SetStatus('Geen internetverbinding. Opdracht niet verzonden.','error');return false;}
  if(!state.ready){ms712SetStatus('Stel eerst Home Assistant en minimaal één apparaat in.','warning');ms712ToggleSettings(true);return false;}
  const params=new URLSearchParams({category:String(category||''),action:String(action||''),target:String(target||''),sent_at:new Date().toISOString()});Object.entries(extra).forEach(([k,v])=>{if(v!=null)params.set(k,String(v));});
  ms712SetStatus('Opdracht verzenden…');
  try{await fetch(ms712WebhookUrl(config),{method:'POST',mode:'no-cors',cache:'no-store',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:params.toString()});ms712SetStatus('Opdracht verzonden ✅','success');return true;}catch(error){console.error(error);ms712SetStatus('Home Assistant is niet bereikbaar.','error');return false;}
}
function ms712Command(action){return ms712SendCommand('media',action,ms712Config().activePlayer);}
function ms712HueCommand(action,key=''){return ms712SendCommand('hue',action,key||ms712Config().activeLight);}
function ms712AllHueOn(){return ms712SendCommand('hue','all_on','all');}
function ms712AllHueOff(){return ms712SendCommand('hue','all_off','all');}
function ms712RingCommand(action){return ['motion_on','motion_off'].includes(action)?ms712SendCommand('ring',action,'ring'):false;}
function ms712AppleTvCommand(action,type='media'){return ms712SendCommand('appletv',action,type);}
function ms712SceneCommand(index){const s=ms712ConfiguredScenes(ms712Config())[index];return s?ms712SendCommand('scene','turn_on',s.key):false;}
function ms712PlayFavoriteByOriginalIndex(index){const c=ms712Config(),f=c.favorites[index];if(!f?.mediaContentId)return;return ms712SendCommand('media','play_media',c.activePlayer,{media_content_id:f.mediaContentId,media_content_type:f.mediaContentType||'music'});}
function ms712PlayFavorite(index){const available=ms712Config().favorites.map((f,i)=>({...f,i})).filter(f=>f.mediaContentId);const f=available[index];return f?ms712PlayFavoriteByOriginalIndex(f.i):false;}
function ms712OpenHomeAssistant(){const url=ms712DashboardUrl();if(!url){ms712SetStatus('Vul eerst het Home Assistant-adres in.','warning');ms712ToggleSettings(true);return;}window.open(url,'_blank','noopener,noreferrer');}
function ms712OpenRingCamera(){const c=ms712Config();if(!c.ring.cameraEntity){ms712SetStatus('Vul eerst de Ring camera-entiteit in.','warning');ms712ToggleSettings(true);return;}ms712OpenHomeAssistant();}
function ms712YamlQuote(v){return String(v||'').replace(/'/g,"''");}
function ms712BuildYaml(config=ms712CollectConfig()){
  if(!config.webhookId)return '# Maak eerst een webhookcode.';
  const players=Object.fromEntries(ms712ConfiguredPlayers(config).map(p=>[p.key,p.entityId]));
  const lights=Object.fromEntries(ms712ConfiguredLights(config).map(l=>[l.key,l.entityId]));
  const scenes=Object.fromEntries(ms712ConfiguredScenes(config).map(s=>[s.key,s.entityId]));
  const indentMap=obj=>Object.entries(obj).map(([k,v])=>`        ${k}: ${v}`).join('\n')||'        {}';
  return `alias: MijnSerenity Entertainment\ndescription: Radio, Spotify, TV, verlichting en scènes via de beveiligde MijnSerenity-webhook.\ntriggers:\n  - trigger: webhook\n    webhook_id: '${ms712YamlQuote(config.webhookId)}'\n    allowed_methods: [POST]\n    local_only: false\nactions:\n  - variables:\n      category: "{{ trigger.data.category | default('') }}"\n      action: "{{ trigger.data.action | default('') }}"\n      requested_target: "{{ trigger.data.target | default('') }}"\n      media_id: "{{ trigger.data.media_content_id | default('') }}"\n      media_type: "{{ trigger.data.media_content_type | default('music') }}"\n      volume_value: "{{ trigger.data.volume | default('0.35') | float(0.35) }}"\n      brightness_value: "{{ trigger.data.brightness_pct | default('70') | int(70) }}"\n      players:\n${indentMap(players)}\n      lights:\n${indentMap(lights)}\n      scenes:\n${indentMap(scenes)}\n      player: "{{ players.get(requested_target) }}"\n      light: "{{ lights.get(requested_target) }}"\n      scene: "{{ scenes.get(requested_target) }}"\n  - choose:\n      - conditions: "{{ category == 'media' and player is not none and action == 'play_pause' }}"\n        sequence:\n          - action: media_player.media_play_pause\n            target: { entity_id: "{{ player }}" }\n      - conditions: "{{ category == 'media' and player is not none and action == 'previous' }}"\n        sequence:\n          - action: media_player.media_previous_track\n            target: { entity_id: "{{ player }}" }\n      - conditions: "{{ category == 'media' and player is not none and action == 'next' }}"\n        sequence:\n          - action: media_player.media_next_track\n            target: { entity_id: "{{ player }}" }\n      - conditions: "{{ category == 'media' and player is not none and action == 'stop' }}"\n        sequence:\n          - action: media_player.media_stop\n            target: { entity_id: "{{ player }}" }\n      - conditions: "{{ category == 'media' and player is not none and action == 'volume_up' }}"\n        sequence:\n          - action: media_player.volume_up\n            target: { entity_id: "{{ player }}" }\n      - conditions: "{{ category == 'media' and player is not none and action == 'volume_down' }}"\n        sequence:\n          - action: media_player.volume_down\n            target: { entity_id: "{{ player }}" }\n      - conditions: "{{ category == 'media' and player is not none and action == 'volume_set' }}"\n        sequence:\n          - action: media_player.volume_set\n            target: { entity_id: "{{ player }}" }\n            data: { volume_level: "{{ volume_value }}" }\n      - conditions: "{{ category == 'media' and player is not none and action == 'play_media' and media_id | length > 0 }}"\n        sequence:\n          - action: media_player.play_media\n            target: { entity_id: "{{ player }}" }\n            data: { media_content_id: "{{ media_id }}", media_content_type: "{{ media_type }}" }\n      - conditions: "{{ category == 'hue' and light is not none and action == 'toggle' }}"\n        sequence:\n          - action: light.toggle\n            target: { entity_id: "{{ light }}" }\n      - conditions: "{{ category == 'hue' and light is not none and action == 'turn_on' }}"\n        sequence:\n          - action: light.turn_on\n            target: { entity_id: "{{ light }}" }\n      - conditions: "{{ category == 'hue' and light is not none and action == 'turn_off' }}"\n        sequence:\n          - action: light.turn_off\n            target: { entity_id: "{{ light }}" }\n      - conditions: "{{ category == 'hue' and light is not none and action == 'brightness' }}"\n        sequence:\n          - action: light.turn_on\n            target: { entity_id: "{{ light }}" }\n            data: { brightness_pct: "{{ brightness_value }}" }\n      - conditions: "{{ category == 'scene' and scene is not none }}"\n        sequence:\n          - action: scene.turn_on\n            target: { entity_id: "{{ scene }}" }\n      - conditions: "{{ category == 'ring' and action in ['motion_on','motion_off'] and '${ms712YamlQuote(config.ring.motionSwitchEntity)}' | length > 0 }}"\n        sequence:\n          - action: "{{ 'switch.turn_on' if action == 'motion_on' else 'switch.turn_off' }}"\n            target: { entity_id: '${ms712YamlQuote(config.ring.motionSwitchEntity)}' }\n      - conditions: "{{ category == 'appletv' and requested_target == 'media' and '${ms712YamlQuote(config.appleTv.mediaEntity)}' | length > 0 }}"\n        sequence:\n          - action: "{{ {'play_pause':'media_player.media_play_pause','previous':'media_player.media_previous_track','next':'media_player.media_next_track','volume_up':'media_player.volume_up','volume_down':'media_player.volume_down','toggle':'media_player.toggle'}.get(action,'media_player.media_play_pause') }}"\n            target: { entity_id: '${ms712YamlQuote(config.appleTv.mediaEntity)}' }\n      - conditions: "{{ category == 'appletv' and requested_target == 'remote' and '${ms712YamlQuote(config.appleTv.remoteEntity)}' | length > 0 }}"\n        sequence:\n          - action: remote.send_command\n            target: { entity_id: '${ms712YamlQuote(config.appleTv.remoteEntity)}' }\n            data: { command: "{{ action }}" }\nmode: queued\nmax: 15\n`;
}
function ms712RefreshYamlPreview(){const y=document.getElementById('entertainmentYaml');if(y)y.value=ms712BuildYaml(ms712CollectConfig());}
async function ms712CopyYaml(){const y=ms712BuildYaml(ms712CollectConfig());try{await navigator.clipboard.writeText(y);ms712SetStatus('Home Assistant-automatisering gekopieerd ✅','success');}catch(e){ms712SetStatus('Kopiëren is niet gelukt.','error');}}
function ms712DownloadYaml(){const blob=new Blob([ms712BuildYaml(ms712CollectConfig())],{type:'text/yaml;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mijnserenity-entertainment-home-assistant.yaml';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function ms712CopyWebhookUrl(){const url=ms712WebhookUrl(ms712CollectConfig());if(!url){ms712SetStatus('Vul eerst Home Assistant-adres en webhookcode in.','warning');return;}try{await navigator.clipboard.writeText(url);ms712SetStatus('Webhook-URL gekopieerd.','success');}catch(e){ms712SetStatus('Kopiëren is niet gelukt.','error');}}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ms716Bootstrap,{once:true});else ms716Bootstrap();
window.addEventListener('online',()=>{if(!document.getElementById('entertainment')?.classList.contains('hidden'))ms712SetStatus('Internetverbinding hersteld.','success');});
window.addEventListener('offline',()=>{if(!document.getElementById('entertainment')?.classList.contains('hidden'))ms712SetStatus('Geen internetverbinding. Entertainment-bediening is tijdelijk beperkt.','warning');});