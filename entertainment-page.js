/* ============================================================
   MijnSerenity Cloud 7.2.3 — Home Assistant Smart Home
   Ring, Philips Hue, Sonos, Apple TV en scènes via één beveiligde
   webhook. Er wordt geen Home Assistant-accounttoken opgeslagen.
   ============================================================ */

const MS712_ENTERTAINMENT_VERSION=2;
const MS712_DEFAULT_VOLUME=35;
const MS712_DEFAULT_BRIGHTNESS=70;

function ms712RandomId(){
  if(globalThis.crypto?.randomUUID){
    return crypto.randomUUID();
  }

  const bytes=new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes]
    .map(value=>value.toString(16).padStart(2,'0'))
    .join('');
}

function ms712DefaultPlayers(){
  return [
    {key:'salon',name:'Sonos salon',entityId:''},
    {key:'stuurstand',name:'Sonos stuurstand',entityId:''},
    {key:'achterdek',name:'Sonos achterdek',entityId:''}
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
  return Array.from({length:6},(_,index)=>({
    id:`favoriet-${index+1}`,
    name:`Favoriet ${index+1}`,
    mediaContentId:'',
    mediaContentType:'music'
  }));
}

function ms712DefaultConfig(){
  return {
    version:MS712_ENTERTAINMENT_VERSION,
    enabled:false,
    haBaseUrl:'',
    dashboardPath:'/lovelace/mijnserenity',
    webhookId:'',
    activePlayer:'salon',
    activeLight:'salon',
    volume:MS712_DEFAULT_VOLUME,
    brightness:MS712_DEFAULT_BRIGHTNESS,
    ring:{
      name:'Ring beveiliging',
      cameraEntity:'',
      motionSwitchEntity:''
    },
    hue:{
      lights:ms712DefaultLights()
    },
    players:ms712DefaultPlayers(),
    appleTv:{
      name:'Apple TV',
      mediaEntity:'',
      remoteEntity:''
    },
    scenes:ms712DefaultScenes(),
    favorites:ms712DefaultFavorites(),
    updatedAt:null
  };
}

function ms712SafeKey(value,fallback='apparaat'){
  const key=String(value||'')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9_-]+/g,'-')
    .replace(/^-+|-+$/g,'');
  return key||fallback;
}

function ms712Entity(value){
  return String(value||'').trim().toLowerCase().slice(0,160);
}

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
    return {
      key:ms712SafeKey(candidate.key||item.key,item.key),
      name:String(candidate.name||item.name).trim().slice(0,50)||item.name,
      entityId:ms712Entity(candidate.entityId)
    };
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
    return {
      id:String(candidate.id||favorite.id).trim()||favorite.id,
      name:String(candidate.name||favorite.name).trim().slice(0,50)||favorite.name,
      mediaContentId:String(candidate.mediaContentId||'').trim().slice(0,1000),
      mediaContentType:String(candidate.mediaContentType||'music').trim().slice(0,80)||'music'
    };
  });

  const activePlayer=players.some(player=>player.key===saved.activePlayer&&player.entityId)
    ?saved.activePlayer
    :players.find(player=>player.entityId)?.key||players[0].key;
  const activeLight=lights.some(light=>light.key===saved.activeLight&&light.entityId)
    ?saved.activeLight
    :lights.find(light=>light.entityId)?.key||lights[0].key;

  return {
    ...base,
    ...saved,
    version:MS712_ENTERTAINMENT_VERSION,
    enabled:Boolean(saved.enabled),
    haBaseUrl:String(saved.haBaseUrl||'').trim().replace(/\/+$/,''),
    dashboardPath:String(saved.dashboardPath||base.dashboardPath).trim().slice(0,240)||base.dashboardPath,
    webhookId:String(saved.webhookId||'').trim().replace(/[^a-zA-Z0-9_-]/g,''),
    activePlayer,
    activeLight,
    volume:Math.max(0,Math.min(100,Number(saved.volume)||MS712_DEFAULT_VOLUME)),
    brightness:Math.max(1,Math.min(100,Number(saved.brightness)||MS712_DEFAULT_BRIGHTNESS)),
    ring:{
      ...base.ring,
      ...(saved.ring||{}),
      name:String(saved.ring?.name||base.ring.name).trim().slice(0,50)||base.ring.name,
      cameraEntity:ms712Entity(saved.ring?.cameraEntity),
      motionSwitchEntity:ms712Entity(saved.ring?.motionSwitchEntity)
    },
    hue:{
      ...base.hue,
      ...(saved.hue||{}),
      lights
    },
    players,
    appleTv:{
      ...base.appleTv,
      ...(saved.appleTv||{}),
      name:String(saved.appleTv?.name||base.appleTv.name).trim().slice(0,50)||base.appleTv.name,
      mediaEntity:ms712Entity(saved.appleTv?.mediaEntity),
      remoteEntity:ms712Entity(saved.appleTv?.remoteEntity)
    },
    scenes,
    favorites
  };
}

function ms712LocalKey(name){
  return `mijnserenity-home-assistant-${name}-${currentBoat?.id||'geen-boot'}`;
}

function ms712Config(){
  const config=ms712NormaliseConfig(
    technicalStateCache?.entertainment||ms712DefaultConfig()
  );

  try{
    const localPlayer=localStorage.getItem(ms712LocalKey('player'))||'';
    if(config.players.some(player=>player.key===localPlayer&&player.entityId)){
      config.activePlayer=localPlayer;
    }

    const localLight=localStorage.getItem(ms712LocalKey('light'))||'';
    if(config.hue.lights.some(light=>light.key===localLight&&light.entityId)){
      config.activeLight=localLight;
    }

    const localVolume=Number(localStorage.getItem(ms712LocalKey('volume')));
    if(Number.isFinite(localVolume)&&localVolume>=0&&localVolume<=100){
      config.volume=localVolume;
    }

    const localBrightness=Number(localStorage.getItem(ms712LocalKey('brightness')));
    if(Number.isFinite(localBrightness)&&localBrightness>=1&&localBrightness<=100){
      config.brightness=localBrightness;
    }
  }catch(error){
    console.warn('Lokale Home Assistant-keuze lezen mislukt:',error);
  }

  return config;
}

function ms712SetStatus(message,state=''){
  const element=document.getElementById('entertainmentStatus');
  if(!element)return;
  element.textContent=message||'';
  element.classList.toggle('hidden',!message);
  element.classList.remove('success','warning','error');
  if(state)element.classList.add(state);
}

function ms712ConfiguredPlayers(config=ms712Config()){
  return config.players.filter(player=>player.entityId);
}

function ms712ConfiguredLights(config=ms712Config()){
  return config.hue.lights.filter(light=>light.entityId);
}

function ms712ConfiguredScenes(config=ms712Config()){
  return config.scenes.filter(scene=>scene.entityId);
}

function ms712ConfiguredDeviceCount(config=ms712Config()){
  return [
    ...ms712ConfiguredPlayers(config),
    ...ms712ConfiguredLights(config),
    ...ms712ConfiguredScenes(config),
    config.ring.cameraEntity||config.ring.motionSwitchEntity?'ring':'',
    config.appleTv.mediaEntity||config.appleTv.remoteEntity?'apple-tv':''
  ].filter(Boolean).length;
}

function ms712WebhookUrl(config=ms712Config()){
  if(!config.haBaseUrl||!config.webhookId)return '';
  return `${config.haBaseUrl}/api/webhook/${config.webhookId}`;
}

function ms712DashboardUrl(config=ms712Config()){
  if(!config.haBaseUrl)return '';
  const path=String(config.dashboardPath||'').trim();
  if(/^https:\/\//i.test(path))return path;
  if(!path)return config.haBaseUrl;
  return `${config.haBaseUrl}${path.startsWith('/')?'':'/'}${path}`;
}

function ms712ConnectionState(config=ms712Config()){
  const deviceCount=ms712ConfiguredDeviceCount(config);
  const ready=Boolean(config.haBaseUrl&&config.webhookId&&deviceCount);
  return {ready,deviceCount};
}

function ms712RenderCloudBadge(){
  const badge=document.getElementById('entertainmentCloudBadge');
  if(!badge)return;

  if(technicalCloudReady){
    badge.className='entertainment-cloud-badge online';
    badge.textContent='☁️ Gedeeld op alle apparaten';
  }else{
    badge.className='entertainment-cloud-badge warning';
    badge.textContent='⚠️ Alleen op dit apparaat';
  }
}

function ms712SetIntegrationState(id,configured,detail){
  const element=document.getElementById(id);
  if(!element)return;
  element.className=`smart-home-device-state ${configured?'online':'offline'}`;
  element.textContent=configured?detail:'Nog instellen';
}

function ms712RenderIntegrationStates(config){
  const ringConfigured=Boolean(config.ring.cameraEntity||config.ring.motionSwitchEntity);
  const hueCount=ms712ConfiguredLights(config).length;
  const sonosCount=ms712ConfiguredPlayers(config).length;
  const appleConfigured=Boolean(config.appleTv.mediaEntity||config.appleTv.remoteEntity);

  ms712SetIntegrationState('ringDeviceState',ringConfigured,'Gekoppeld');
  ms712SetIntegrationState('hueDeviceState',hueCount>0,`${hueCount} zone${hueCount===1?'':'s'}`);
  ms712SetIntegrationState('sonosDeviceState',sonosCount>0,`${sonosCount} speler${sonosCount===1?'':'s'}`);
  ms712SetIntegrationState('appleTvDeviceState',appleConfigured,'Gekoppeld');
}

function ms712RenderPlayerOptions(config){
  const select=document.getElementById('entertainmentActivePlayer');
  if(!select)return;

  const configured=ms712ConfiguredPlayers(config);
  select.innerHTML=configured.length
    ?configured.map(player=>`<option value="${esc(player.key)}">${esc(player.name)}</option>`).join('')
    :'<option value="">Nog geen Sonos-speler ingesteld</option>';
  select.value=configured.some(player=>player.key===config.activePlayer)
    ?config.activePlayer
    :(configured[0]?.key||'');
  select.disabled=!configured.length;
}

function ms712RenderLightOptions(config){
  const select=document.getElementById('hueActiveLight');
  if(!select)return;

  const configured=ms712ConfiguredLights(config);
  select.innerHTML=configured.length
    ?configured.map(light=>`<option value="${esc(light.key)}">${esc(light.name)}</option>`).join('')
    :'<option value="">Nog geen Hue-zone ingesteld</option>';
  select.value=configured.some(light=>light.key===config.activeLight)
    ?config.activeLight
    :(configured[0]?.key||'');
  select.disabled=!configured.length;
}

function ms712RenderPlayerCards(config){
  const container=document.getElementById('entertainmentPlayerCards');
  if(!container)return;

  const configured=ms712ConfiguredPlayers(config);
  container.innerHTML=configured.length
    ?configured.map(player=>`
      <button type="button" class="entertainment-player-card ${player.key===config.activePlayer?'active':''}"
        onclick="ms712SelectPlayer('${esc(player.key)}')"
        aria-label="Bedien ${esc(player.name)}" title="Bedien ${esc(player.name)}">
        <span>🔊</span>
        <strong>${esc(player.name)}</strong>
        <small>${esc(player.entityId)}</small>
      </button>
    `).join('')
    :`<div class="entertainment-empty-state compact">
      <span>🔊</span>
      <strong>Nog geen Sonos-speler gekoppeld</strong>
      <small>Vul bij Instellen een media_player-entiteit in.</small>
    </div>`;
}

function ms712RenderLightCards(config){
  const container=document.getElementById('hueLightCards');
  if(!container)return;

  const configured=ms712ConfiguredLights(config);
  container.innerHTML=configured.length
    ?configured.map(light=>`
      <article class="smart-home-zone-card ${light.key===config.activeLight?'active':''}">
        <button type="button" class="smart-home-zone-select"
          onclick="ms712SelectLight('${esc(light.key)}')">
          <span>💡</span>
          <strong>${esc(light.name)}</strong>
          <small>${esc(light.entityId)}</small>
        </button>
        <div class="smart-home-zone-actions">
          <button type="button" class="secondary" onclick="ms712HueCommand('turn_on','${esc(light.key)}')">Aan</button>
          <button type="button" class="secondary" onclick="ms712HueCommand('turn_off','${esc(light.key)}')">Uit</button>
        </div>
      </article>
    `).join('')
    :`<div class="entertainment-empty-state compact">
      <span>💡</span>
      <strong>Nog geen Hue-zone gekoppeld</strong>
      <small>Vul bij Instellen minimaal één light-entiteit in.</small>
    </div>`;
}

function ms712RenderScenes(config){
  const container=document.getElementById('homeAssistantScenes');
  if(!container)return;

  const scenes=ms712ConfiguredScenes(config);
  container.innerHTML=scenes.length
    ?scenes.map((scene,index)=>`
      <button type="button" class="smart-home-scene-button"
        onclick="ms712SceneCommand(${index})">
        <span>${['🌙','⛵','🛏️','🌑'][index]||'✨'}</span>
        <strong>${esc(scene.name)}</strong>
      </button>
    `).join('')
    :`<div class="entertainment-empty-state compact">
      <span>✨</span>
      <strong>Nog geen scènes gekoppeld</strong>
      <small>Scènes zijn handig voor bijvoorbeeld varen, avond en alles uit.</small>
    </div>`;
}

function ms712RenderFavorites(config){
  const container=document.getElementById('entertainmentFavorites');
  if(!container)return;

  const available=config.favorites.filter(favorite=>favorite.mediaContentId);
  container.innerHTML=available.length
    ?available.map((favorite,index)=>`
      <button type="button" class="entertainment-favorite"
        onclick="ms712PlayFavorite(${index})"
        aria-label="Speel ${esc(favorite.name)}" title="Speel ${esc(favorite.name)}">
        <span>▶</span>
        <strong>${esc(favorite.name)}</strong>
        <small>${esc(favorite.mediaContentType)}</small>
      </button>
    `).join('')
    :`<div class="entertainment-empty-state compact">
      <span>⭐</span>
      <strong>Nog geen Sonos-favorieten</strong>
      <small>Voeg radiozenders, afspeellijsten of media-URL's toe bij Instellen.</small>
    </div>`;
}

function ms712FillSettings(config){
  const setValue=(id,value)=>{
    const element=document.getElementById(id);
    if(element)element.value=value??'';
  };

  setValue('entertainmentHaBaseUrl',config.haBaseUrl);
  setValue('entertainmentDashboardPath',config.dashboardPath);
  setValue('entertainmentWebhookId',config.webhookId);
  setValue('ringName',config.ring.name);
  setValue('ringCameraEntity',config.ring.cameraEntity);
  setValue('ringMotionSwitchEntity',config.ring.motionSwitchEntity);
  setValue('appleTvName',config.appleTv.name);
  setValue('appleTvMediaEntity',config.appleTv.mediaEntity);
  setValue('appleTvRemoteEntity',config.appleTv.remoteEntity);

  config.hue.lights.forEach((light,index)=>{
    setValue(`hueLightName${index+1}`,light.name);
    setValue(`hueLightEntity${index+1}`,light.entityId);
  });

  config.players.forEach((player,index)=>{
    setValue(`entertainmentPlayerName${index+1}`,player.name);
    setValue(`entertainmentPlayerEntity${index+1}`,player.entityId);
  });

  config.scenes.forEach((scene,index)=>{
    setValue(`homeAssistantSceneName${index+1}`,scene.name);
    setValue(`homeAssistantSceneEntity${index+1}`,scene.entityId);
  });

  config.favorites.forEach((favorite,index)=>{
    setValue(`entertainmentFavoriteName${index+1}`,favorite.name);
    setValue(`entertainmentFavoriteUrl${index+1}`,favorite.mediaContentId);
    setValue(`entertainmentFavoriteType${index+1}`,favorite.mediaContentType);
  });

  const yaml=document.getElementById('entertainmentYaml');
  if(yaml)yaml.value=ms712BuildYaml(config);
}

function renderEntertainmentPage(){
  const config=ms712Config();
  const state=ms712ConnectionState(config);
  const connectionBadge=document.getElementById('entertainmentConnectionBadge');
  const volume=document.getElementById('entertainmentVolume');
  const volumeValue=document.getElementById('entertainmentVolumeValue');
  const brightness=document.getElementById('hueBrightness');
  const brightnessValue=document.getElementById('hueBrightnessValue');

  ms712RenderCloudBadge();
  ms712RenderIntegrationStates(config);
  ms712RenderPlayerOptions(config);
  ms712RenderLightOptions(config);
  ms712RenderPlayerCards(config);
  ms712RenderLightCards(config);
  ms712RenderScenes(config);
  ms712RenderFavorites(config);
  ms712FillSettings(config);

  if(connectionBadge){
    connectionBadge.className=`entertainment-connection-badge ${state.ready?'online':'offline'}`;
    connectionBadge.textContent=state.ready
      ?`${state.deviceCount} koppeling${state.deviceCount===1?'':'en'} gereed`
      :'Nog instellen';
  }

  if(volume){
    volume.value=String(config.volume);
    volume.disabled=!ms712ConfiguredPlayers(config).length;
  }
  if(volumeValue)volumeValue.textContent=`${Math.round(config.volume)}%`;

  if(brightness){
    brightness.value=String(config.brightness);
    brightness.disabled=!ms712ConfiguredLights(config).length;
  }
  if(brightnessValue)brightnessValue.textContent=`${Math.round(config.brightness)}%`;

  document.querySelectorAll('[data-entertainment-command]')
    .forEach(button=>button.disabled=!ms712ConfiguredPlayers(config).length||!state.ready);
  document.querySelectorAll('[data-ring-command]')
    .forEach(button=>button.disabled=!config.ring.motionSwitchEntity||!state.ready);
  document.querySelectorAll('[data-appletv-command]')
    .forEach(button=>{
      const needsRemote=button.dataset.appletvType==='remote';
      const available=needsRemote?config.appleTv.remoteEntity:config.appleTv.mediaEntity;
      button.disabled=!available||!state.ready;
    });
}

async function initEntertainmentPage(){
  if(!currentBoat){
    showAppToast('Koppel eerst Serenity.');
    captainNavigate(isAppAdmin()?'boat':'settings');
    return;
  }

  if(!technicalStateCache){
    technicalStateCache=readTechnicalLocalState();
  }

  renderEntertainmentPage();
  await loadTechnicalDashboard(false);
  renderEntertainmentPage();
}

function ms712ToggleSettings(force){
  const panel=document.getElementById('entertainmentSettingsPanel');
  if(!panel)return;
  const open=typeof force==='boolean'
    ?force
    :panel.classList.contains('hidden');
  panel.classList.toggle('hidden',!open);
  if(open){
    ms712FillSettings(ms712Config());
    if(!document.getElementById('entertainmentWebhookId')?.value){
      ms712GenerateWebhookId();
    }
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  }
}

function ms712GenerateWebhookId(){
  const input=document.getElementById('entertainmentWebhookId');
  if(!input)return;
  input.value=`serenity_${ms712RandomId().replace(/-/g,'')}`;
  ms712RefreshYamlPreview();
  ms712SetStatus('Nieuwe beveiligde webhookcode gemaakt. Sla op en vervang daarna de YAML in Home Assistant.','warning');
}

function ms712InputValue(id){
  return String(document.getElementById(id)?.value||'').trim();
}

function ms712CollectConfig(){
  const previous=ms712Config();
  const players=ms712DefaultPlayers().map((player,index)=>({
    key:player.key,
    name:ms712InputValue(`entertainmentPlayerName${index+1}`)||player.name,
    entityId:ms712InputValue(`entertainmentPlayerEntity${index+1}`)
  }));
  const lights=ms712DefaultLights().map((light,index)=>({
    key:light.key,
    name:ms712InputValue(`hueLightName${index+1}`)||light.name,
    entityId:ms712InputValue(`hueLightEntity${index+1}`)
  }));
  const scenes=ms712DefaultScenes().map((scene,index)=>({
    key:scene.key,
    name:ms712InputValue(`homeAssistantSceneName${index+1}`)||scene.name,
    entityId:ms712InputValue(`homeAssistantSceneEntity${index+1}`)
  }));
  const favorites=ms712DefaultFavorites().map((favorite,index)=>({
    id:favorite.id,
    name:ms712InputValue(`entertainmentFavoriteName${index+1}`)||favorite.name,
    mediaContentId:ms712InputValue(`entertainmentFavoriteUrl${index+1}`),
    mediaContentType:ms712InputValue(`entertainmentFavoriteType${index+1}`)||'music'
  }));
  const webhookId=ms712InputValue('entertainmentWebhookId');
  const configuredPlayers=players.filter(player=>player.entityId);
  const configuredLights=lights.filter(light=>light.entityId);
  const activePlayer=configuredPlayers.some(player=>player.key===previous.activePlayer)
    ?previous.activePlayer
    :(configuredPlayers[0]?.key||players[0].key);
  const activeLight=configuredLights.some(light=>light.key===previous.activeLight)
    ?previous.activeLight
    :(configuredLights[0]?.key||lights[0].key);

  const config=ms712NormaliseConfig({
    ...previous,
    haBaseUrl:ms712InputValue('entertainmentHaBaseUrl').replace(/\/+$/,''),
    dashboardPath:ms712InputValue('entertainmentDashboardPath')||'/lovelace/mijnserenity',
    webhookId,
    activePlayer,
    activeLight,
    ring:{
      name:ms712InputValue('ringName')||'Ring beveiliging',
      cameraEntity:ms712InputValue('ringCameraEntity'),
      motionSwitchEntity:ms712InputValue('ringMotionSwitchEntity')
    },
    hue:{lights},
    players,
    appleTv:{
      name:ms712InputValue('appleTvName')||'Apple TV',
      mediaEntity:ms712InputValue('appleTvMediaEntity'),
      remoteEntity:ms712InputValue('appleTvRemoteEntity')
    },
    scenes,
    favorites,
    updatedAt:new Date().toISOString()
  });

  config.enabled=Boolean(ms712ConnectionState(config).ready);
  return config;
}

function ms712ValidateConfig(config){
  if(!config.haBaseUrl){
    return 'Vul het externe HTTPS-adres van Home Assistant in.';
  }
  if(!/^https:\/\//i.test(config.haBaseUrl)){
    return 'Gebruik een extern HTTPS-adres, bijvoorbeeld je Home Assistant Cloud-adres.';
  }
  if(!config.webhookId){
    return 'Maak eerst een beveiligde webhookcode.';
  }
  if(!ms712ConfiguredDeviceCount(config)){
    return 'Vul minimaal één Ring-, Hue-, Sonos-, Apple TV- of scène-entiteit in.';
  }

  const checks=[
    [config.ring.cameraEntity,'camera','Ring camera'],
    [config.ring.motionSwitchEntity,'switch','Ring bewegingsdetectie'],
    [config.appleTv.mediaEntity,'media_player','Apple TV mediaspeler'],
    [config.appleTv.remoteEntity,'remote','Apple TV afstandsbediening'],
    ...config.hue.lights.map(light=>[light.entityId,'light',light.name]),
    ...config.players.map(player=>[player.entityId,'media_player',player.name]),
    ...config.scenes.map(scene=>[scene.entityId,'scene',scene.name])
  ];

  const invalid=checks.find(([entity,domain])=>entity&&!ms712IsValidEntity(entity,domain));
  if(invalid){
    return `${invalid[2]} heeft geen geldige ${invalid[1]}-entiteit.`;
  }

  return '';
}

async function ms712SaveSettings(){
  if(!currentBoat||!currentUser){
    showAppToast('Log eerst in en koppel Serenity.');
    return;
  }

  const config=ms712CollectConfig();
  const validation=ms712ValidateConfig(config);
  if(validation){
    ms712SetStatus(validation,'error');
    return;
  }

  ms712SetStatus('Home Assistant-instellingen opslaan…');

  try{
    await loadTechnicalDashboard(true);
    technicalStateCache=normaliseTechnicalState({
      ...(technicalStateCache||readTechnicalLocalState()),
      entertainment:config
    });

    const shared=await persistTechnicalState(
      'Home Assistant-instellingen opgeslagen.'
    );

    renderEntertainmentPage();
    ms712SetStatus(
      shared
        ?'Opgeslagen en direct gedeeld met alle ingelogde apparaten ✅'
        :'Lokaal opgeslagen. Cloud synchronisatie is nog niet beschikbaar.',
      shared?'success':'warning'
    );
  }catch(error){
    console.error('Home Assistant-instellingen opslaan mislukt:',error);
    ms712SetStatus('Opslaan is niet gelukt. Probeer het opnieuw.','error');
  }
}

async function ms712SaveLocalChoice(type,value){
  if(!value)return;
  try{
    localStorage.setItem(ms712LocalKey(type),value);
  }catch(error){
    console.warn('Home Assistant-keuze lokaal bewaren mislukt:',error);
  }
  renderEntertainmentPage();
}

function ms712SelectPlayer(playerKey){
  const config=ms712Config();
  if(config.players.some(player=>player.key===playerKey&&player.entityId)){
    ms712SaveLocalChoice('player',playerKey);
  }
}

function ms712PlayerChanged(){
  ms712SelectPlayer(document.getElementById('entertainmentActivePlayer')?.value||'');
}

function ms712SelectLight(lightKey){
  const config=ms712Config();
  if(config.hue.lights.some(light=>light.key===lightKey&&light.entityId)){
    ms712SaveLocalChoice('light',lightKey);
  }
}

function ms712LightChanged(){
  ms712SelectLight(document.getElementById('hueActiveLight')?.value||'');
}

function ms712VolumeLabel(){
  const input=document.getElementById('entertainmentVolume');
  const label=document.getElementById('entertainmentVolumeValue');
  if(label)label.textContent=`${Math.round(Number(input?.value)||0)}%`;
}

async function ms712VolumeChanged(){
  const input=document.getElementById('entertainmentVolume');
  const volume=Math.max(0,Math.min(100,Number(input?.value)||0));
  try{
    localStorage.setItem(ms712LocalKey('volume'),String(volume));
  }catch(error){
    console.warn('Sonos-volume lokaal bewaren mislukt:',error);
  }
  await ms712SendCommand('media','volume_set',ms712Config().activePlayer,{volume:(volume/100).toFixed(2)});
}

function ms712BrightnessLabel(){
  const input=document.getElementById('hueBrightness');
  const label=document.getElementById('hueBrightnessValue');
  if(label)label.textContent=`${Math.round(Number(input?.value)||0)}%`;
}

async function ms712BrightnessChanged(){
  const input=document.getElementById('hueBrightness');
  const brightness=Math.max(1,Math.min(100,Number(input?.value)||MS712_DEFAULT_BRIGHTNESS));
  try{
    localStorage.setItem(ms712LocalKey('brightness'),String(brightness));
  }catch(error){
    console.warn('Hue-helderheid lokaal bewaren mislukt:',error);
  }
  await ms712SendCommand('hue','brightness',ms712Config().activeLight,{brightness_pct:brightness});
}

async function ms712SendCommand(category,action,target='',extra={}){
  const config=ms712Config();
  const state=ms712ConnectionState(config);

  if(!navigator.onLine){
    ms712SetStatus('Geen internetverbinding. De Home Assistant-opdracht is niet verzonden.','error');
    return false;
  }
  if(!state.ready){
    ms712SetStatus('Stel eerst Home Assistant en minimaal één apparaat in.','warning');
    ms712ToggleSettings(true);
    return false;
  }

  const endpoint=ms712WebhookUrl(config);
  const params=new URLSearchParams({
    category:String(category||''),
    action:String(action||''),
    target:String(target||''),
    sent_at:new Date().toISOString()
  });
  Object.entries(extra).forEach(([key,value])=>{
    if(value!==undefined&&value!==null)params.set(key,String(value));
  });

  ms712SetStatus('Opdracht naar Home Assistant verzenden…');

  try{
    await fetch(endpoint,{
      method:'POST',
      mode:'no-cors',
      cache:'no-store',
      headers:{
        'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body:params.toString()
    });
    ms712SetStatus('Opdracht verzonden naar Home Assistant ✅','success');
    return true;
  }catch(error){
    console.error('Home Assistant-opdracht mislukt:',error);
    ms712SetStatus('Home Assistant is niet bereikbaar. Controleer internet, het externe adres en de webhook.','error');
    return false;
  }
}

function ms712Command(action){
  return ms712SendCommand('media',action,ms712Config().activePlayer);
}

function ms712HueCommand(action,lightKey=''){
  const config=ms712Config();
  const target=lightKey||config.activeLight;
  return ms712SendCommand('hue',action,target);
}

function ms712AllHueOn(){
  return ms712SendCommand('hue','all_on','all');
}

function ms712AllHueOff(){
  return ms712SendCommand('hue','all_off','all');
}

function ms712RingCommand(action){
  if(!['motion_on','motion_off'].includes(action))return false;
  return ms712SendCommand('ring',action,'ring');
}

function ms712AppleTvCommand(action,type='media'){
  return ms712SendCommand('appletv',action,type);
}

function ms712SceneCommand(index){
  const scenes=ms712ConfiguredScenes(ms712Config());
  const scene=scenes[index];
  if(!scene)return false;
  return ms712SendCommand('scene','turn_on',scene.key);
}

function ms712PlayFavorite(index){
  const config=ms712Config();
  const favorites=config.favorites.filter(favorite=>favorite.mediaContentId);
  const favorite=favorites[index];
  if(!favorite)return;

  return ms712SendCommand('media','play_media',config.activePlayer,{
    media_content_id:favorite.mediaContentId,
    media_content_type:favorite.mediaContentType||'music'
  });
}

function ms712OpenHomeAssistant(){
  const config=ms712Config();
  const url=ms712DashboardUrl(config);
  if(!url){
    ms712SetStatus('Vul eerst het externe Home Assistant-adres in.','warning');
    ms712ToggleSettings(true);
    return;
  }
  window.open(url,'_blank','noopener,noreferrer');
}

function ms712OpenRingCamera(){
  const config=ms712Config();
  if(!config.ring.cameraEntity){
    ms712SetStatus('Vul eerst de Ring camera-entiteit in.','warning');
    ms712ToggleSettings(true);
    return;
  }
  ms712OpenHomeAssistant();
}

function ms712YamlQuote(value){
  return String(value||'').replace(/'/g,"''");
}

function ms712YamlMap(items,indent=8){
  const spaces=' '.repeat(indent);
  if(!items.length)return `${spaces}{}`;
  return items.map(item=>`${spaces}${item.key}: ${item.entityId}`).join('\n');
}

function ms712BuildYaml(config=ms712CollectConfig()){
  const players=ms712ConfiguredPlayers(config);
  const lights=ms712ConfiguredLights(config);
  const scenes=ms712ConfiguredScenes(config);
  if(!config.webhookId||!ms712ConfiguredDeviceCount(config)){
    return '# Maak eerst een webhookcode en vul minimaal één Home Assistant-entiteit in.';
  }

  const playerMap=ms712YamlMap(players,8);
  const lightMap=ms712YamlMap(lights,8);
  const sceneMap=ms712YamlMap(scenes,8);
  const ringCamera=config.ring.cameraEntity||'';
  const ringMotionSwitch=config.ring.motionSwitchEntity||'';
  const appleMedia=config.appleTv.mediaEntity||'';
  const appleRemote=config.appleTv.remoteEntity||'';
  const allLightsTarget=lights.length
    ?`              entity_id:\n${lights.map(light=>`                - ${light.entityId}`).join('\n')}`
    :'              entity_id: []';

  return `alias: MijnSerenity Home Assistant\ndescription: Veilige bediening van alleen de ingestelde Ring-, Hue-, Sonos-, Apple TV- en scène-entiteiten.\ntriggers:\n  - trigger: webhook\n    webhook_id: '${ms712YamlQuote(config.webhookId)}'\n    allowed_methods:\n      - POST\n    local_only: false\nconditions: []\nactions:\n  - variables:\n      requested_category: "{{ trigger.data.category | default('') }}"\n      requested_action: "{{ trigger.data.action | default('') }}"\n      requested_target: "{{ trigger.data.target | default('') }}"\n      volume_value: "{{ trigger.data.volume | default('0.35') | float(0.35) }}"\n      brightness_value: "{{ trigger.data.brightness_pct | default('70') | int(70) }}"\n      media_id: "{{ trigger.data.media_content_id | default('') }}"\n      media_type: "{{ trigger.data.media_content_type | default('music') }}"\n      player_map:\n${playerMap}\n      light_map:\n${lightMap}\n      scene_map:\n${sceneMap}\n      ring_camera: '${ms712YamlQuote(ringCamera)}'\n      ring_motion_switch: '${ms712YamlQuote(ringMotionSwitch)}'\n      apple_tv_media: '${ms712YamlQuote(appleMedia)}'\n      apple_tv_remote: '${ms712YamlQuote(appleRemote)}'\n      target_player: "{{ player_map.get(requested_target) }}"\n      target_light: "{{ light_map.get(requested_target) }}"\n      target_scene: "{{ scene_map.get(requested_target) }}"\n  - choose:\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'media' and target_player is not none and requested_action == 'toggle' }}"\n        sequence:\n          - action: media_player.toggle\n            target:\n              entity_id: "{{ target_player }}"\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'media' and target_player is not none and requested_action == 'previous' }}"\n        sequence:\n          - action: media_player.media_previous_track\n            target:\n              entity_id: "{{ target_player }}"\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'media' and target_player is not none and requested_action == 'play_pause' }}"\n        sequence:\n          - action: media_player.media_play_pause\n            target:\n              entity_id: "{{ target_player }}"\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'media' and target_player is not none and requested_action == 'next' }}"\n        sequence:\n          - action: media_player.media_next_track\n            target:\n              entity_id: "{{ target_player }}"\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'media' and target_player is not none and requested_action == 'stop' }}"\n        sequence:\n          - action: media_player.media_stop\n            target:\n              entity_id: "{{ target_player }}"\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'media' and target_player is not none and requested_action == 'volume_down' }}"\n        sequence:\n          - action: media_player.volume_down\n            target:\n              entity_id: "{{ target_player }}"\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'media' and target_player is not none and requested_action == 'volume_up' }}"\n        sequence:\n          - action: media_player.volume_up\n            target:\n              entity_id: "{{ target_player }}"\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'media' and target_player is not none and requested_action == 'volume_set' }}"\n        sequence:\n          - action: media_player.volume_set\n            target:\n              entity_id: "{{ target_player }}"\n            data:\n              volume_level: "{{ volume_value }}"\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'media' and target_player is not none and requested_action == 'play_media' and media_id | length > 0 }}"\n        sequence:\n          - action: media_player.play_media\n            target:\n              entity_id: "{{ target_player }}"\n            data:\n              media_content_id: "{{ media_id }}"\n              media_content_type: "{{ media_type }}"\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'hue' and target_light is not none and requested_action == 'toggle' }}"\n        sequence:\n          - action: light.toggle\n            target:\n              entity_id: "{{ target_light }}"\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'hue' and target_light is not none and requested_action == 'turn_on' }}"\n        sequence:\n          - action: light.turn_on\n            target:\n              entity_id: "{{ target_light }}"\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'hue' and target_light is not none and requested_action == 'turn_off' }}"\n        sequence:\n          - action: light.turn_off\n            target:\n              entity_id: "{{ target_light }}"\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'hue' and target_light is not none and requested_action == 'brightness' }}"\n        sequence:\n          - action: light.turn_on\n            target:\n              entity_id: "{{ target_light }}"\n            data:\n              brightness_pct: "{{ [1, [brightness_value, 100] | min] | max }}"\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'hue' and requested_action == 'all_on' }}"\n        sequence:\n          - action: light.turn_on\n            target:\n${allLightsTarget}\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'hue' and requested_action == 'all_off' }}"\n        sequence:\n          - action: light.turn_off\n            target:\n${allLightsTarget}\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'ring' and ring_motion_switch | length > 0 and requested_action == 'motion_on' }}"\n        sequence:\n          - action: switch.turn_on\n            target:\n              entity_id: "{{ ring_motion_switch }}"\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'ring' and ring_motion_switch | length > 0 and requested_action == 'motion_off' }}"\n        sequence:\n          - action: switch.turn_off\n            target:\n              entity_id: "{{ ring_motion_switch }}"\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'appletv' and apple_tv_media | length > 0 and requested_target == 'media' and requested_action == 'toggle' }}"\n        sequence:\n          - action: media_player.toggle\n            target:\n              entity_id: "{{ apple_tv_media }}"\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'appletv' and apple_tv_media | length > 0 and requested_target == 'media' and requested_action == 'play_pause' }}"\n        sequence:\n          - action: media_player.media_play_pause\n            target:\n              entity_id: "{{ apple_tv_media }}"\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'appletv' and apple_tv_media | length > 0 and requested_target == 'media' and requested_action == 'previous' }}"\n        sequence:\n          - action: media_player.media_previous_track\n            target:\n              entity_id: "{{ apple_tv_media }}"\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'appletv' and apple_tv_media | length > 0 and requested_target == 'media' and requested_action == 'next' }}"\n        sequence:\n          - action: media_player.media_next_track\n            target:\n              entity_id: "{{ apple_tv_media }}"\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'appletv' and apple_tv_media | length > 0 and requested_target == 'media' and requested_action == 'volume_down' }}"\n        sequence:\n          - action: media_player.volume_down\n            target:\n              entity_id: "{{ apple_tv_media }}"\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'appletv' and apple_tv_media | length > 0 and requested_target == 'media' and requested_action == 'volume_up' }}"\n        sequence:\n          - action: media_player.volume_up\n            target:\n              entity_id: "{{ apple_tv_media }}"\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'appletv' and apple_tv_remote | length > 0 and requested_target == 'remote' and requested_action in ['wakeup','suspend','home','top_menu','menu','select','up','down','left','right'] }}"\n        sequence:\n          - action: remote.send_command\n            target:\n              entity_id: "{{ apple_tv_remote }}"\n            data:\n              command: "{{ requested_action }}"\n      - conditions:\n          - condition: template\n            value_template: "{{ requested_category == 'scene' and target_scene is not none and requested_action == 'turn_on' }}"\n        sequence:\n          - action: scene.turn_on\n            target:\n              entity_id: "{{ target_scene }}"\nmode: queued\nmax: 15\n`;
}

function ms712RefreshYamlPreview(){
  const yaml=document.getElementById('entertainmentYaml');
  if(!yaml)return;
  yaml.value=ms712BuildYaml(ms712CollectConfig());
}

async function ms712CopyYaml(){
  const yaml=ms712BuildYaml(ms712CollectConfig());
  try{
    await navigator.clipboard.writeText(yaml);
    ms712SetStatus('Home Assistant-automatisering gekopieerd ✅','success');
  }catch(error){
    console.error('Home Assistant YAML kopiëren mislukt:',error);
    ms712SetStatus('Kopiëren is niet gelukt. Selecteer de YAML handmatig.','error');
  }
}

function ms712DownloadYaml(){
  const yaml=ms712BuildYaml(ms712CollectConfig());
  const blob=new Blob([yaml],{type:'text/yaml;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download='mijnserenity-home-assistant-automation.yaml';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  ms712SetStatus('YAML-bestand gedownload.','success');
}

async function ms712CopyWebhookUrl(){
  const config=ms712CollectConfig();
  const url=ms712WebhookUrl(config);
  if(!url){
    ms712SetStatus('Vul eerst het Home Assistant-adres en de webhookcode in.','warning');
    return;
  }
  try{
    await navigator.clipboard.writeText(url);
    ms712SetStatus('Beveiligde webhook-URL gekopieerd.','success');
  }catch(error){
    console.error('Webhook-URL kopiëren mislukt:',error);
    ms712SetStatus('Kopiëren is niet gelukt.','error');
  }
}

window.addEventListener('online',()=>{
  if(document.getElementById('entertainment')&&!document.getElementById('entertainment')?.classList.contains('hidden')){
    ms712SetStatus('Internetverbinding hersteld.','success');
  }
});

window.addEventListener('offline',()=>{
  if(document.getElementById('entertainment')&&!document.getElementById('entertainment')?.classList.contains('hidden')){
    ms712SetStatus('Geen internetverbinding. Home Assistant-bediening is tijdelijk niet beschikbaar.','warning');
  }
});
