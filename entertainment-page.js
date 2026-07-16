/* ============================================================
   MijnSerenity Cloud 7.1.2 — Entertainment via Home Assistant
   Gedeelde webhookbediening zonder Home Assistant-accounttoken.
   ============================================================ */

const MS712_ENTERTAINMENT_VERSION=1;
const MS712_DEFAULT_VOLUME=35;

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
    {key:'salon',name:'Salon',entityId:''},
    {key:'stuurstand',name:'Stuurstand',entityId:''},
    {key:'achterdek',name:'Achterdek',entityId:''}
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
    webhookId:'',
    activePlayer:'salon',
    volume:MS712_DEFAULT_VOLUME,
    players:ms712DefaultPlayers(),
    favorites:ms712DefaultFavorites(),
    updatedAt:null
  };
}

function ms712SafeKey(value,fallback='speler'){
  const key=String(value||'')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9_-]+/g,'-')
    .replace(/^-+|-+$/g,'');
  return key||fallback;
}

function ms712NormaliseConfig(value){
  const base=ms712DefaultConfig();
  const saved=value&&typeof value==='object'?value:{};
  const savedPlayers=Array.isArray(saved.players)?saved.players:[];
  const savedFavorites=Array.isArray(saved.favorites)?saved.favorites:[];

  const players=base.players.map((player,index)=>{
    const candidate=savedPlayers[index]||{};
    return {
      key:ms712SafeKey(candidate.key||player.key,player.key),
      name:String(candidate.name||player.name).trim().slice(0,40)||player.name,
      entityId:String(candidate.entityId||'').trim().slice(0,120)
    };
  });

  const favorites=base.favorites.map((favorite,index)=>{
    const candidate=savedFavorites[index]||{};
    return {
      id:String(candidate.id||favorite.id).trim()||favorite.id,
      name:String(candidate.name||favorite.name).trim().slice(0,50)||favorite.name,
      mediaContentId:String(candidate.mediaContentId||'').trim().slice(0,1000),
      mediaContentType:String(candidate.mediaContentType||'music').trim().slice(0,80)||'music'
    };
  });

  const activePlayer=players.some(player=>player.key===saved.activePlayer)
    ?saved.activePlayer
    :players.find(player=>player.entityId)?.key||players[0].key;

  return {
    ...base,
    ...saved,
    version:MS712_ENTERTAINMENT_VERSION,
    enabled:Boolean(saved.enabled),
    haBaseUrl:String(saved.haBaseUrl||'').trim().replace(/\/+$/,''),
    webhookId:String(saved.webhookId||'').trim().replace(/[^a-zA-Z0-9_-]/g,''),
    activePlayer,
    volume:Math.max(0,Math.min(100,Number(saved.volume)||MS712_DEFAULT_VOLUME)),
    players,
    favorites
  };
}

function ms712LocalKey(name){
  return `mijnserenity-entertainment-${name}-${currentBoat?.id||'geen-boot'}`;
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

    const localVolume=Number(localStorage.getItem(ms712LocalKey('volume')));
    if(Number.isFinite(localVolume)&&localVolume>=0&&localVolume<=100){
      config.volume=localVolume;
    }
  }catch(error){
    console.warn('Lokale entertainmentkeuze lezen mislukt:',error);
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

function ms712WebhookUrl(config=ms712Config()){
  if(!config.haBaseUrl||!config.webhookId)return '';
  return `${config.haBaseUrl}/api/webhook/${config.webhookId}`;
}

function ms712ConnectionState(config=ms712Config()){
  const hasPlayer=ms712ConfiguredPlayers(config).length>0;
  const ready=Boolean(config.haBaseUrl&&config.webhookId&&hasPlayer);
  return {ready,hasPlayer};
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

function ms712RenderPlayerOptions(config){
  const select=document.getElementById('entertainmentActivePlayer');
  if(!select)return;

  const configured=ms712ConfiguredPlayers(config);
  select.innerHTML=configured.length
    ?configured.map(player=>`<option value="${esc(player.key)}">${esc(player.name)}</option>`).join('')
    :'<option value="">Nog geen mediaspeler ingesteld</option>';
  select.value=configured.some(player=>player.key===config.activePlayer)
    ?config.activePlayer
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
    :`<div class="entertainment-empty-state">
      <span>🎶</span>
      <strong>Nog geen mediaspeler gekoppeld</strong>
      <small>Open Instellen en vul bijvoorbeeld media_player.salon in.</small>
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
      <strong>Nog geen favorieten</strong>
      <small>Voeg radiozenders, afspeellijsten of media-URL's toe bij Instellen.</small>
    </div>`;
}

function ms712FillSettings(config){
  const setValue=(id,value)=>{
    const element=document.getElementById(id);
    if(element)element.value=value??'';
  };

  setValue('entertainmentHaBaseUrl',config.haBaseUrl);
  setValue('entertainmentWebhookId',config.webhookId);

  config.players.forEach((player,index)=>{
    setValue(`entertainmentPlayerName${index+1}`,player.name);
    setValue(`entertainmentPlayerEntity${index+1}`,player.entityId);
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

  ms712RenderCloudBadge();
  ms712RenderPlayerOptions(config);
  ms712RenderPlayerCards(config);
  ms712RenderFavorites(config);
  ms712FillSettings(config);

  if(connectionBadge){
    connectionBadge.className=`entertainment-connection-badge ${state.ready?'online':'offline'}`;
    connectionBadge.textContent=state.ready?'Bediening gereed':'Nog instellen';
  }

  if(volume){
    volume.value=String(config.volume);
    volume.disabled=!state.ready;
  }
  if(volumeValue)volumeValue.textContent=`${Math.round(config.volume)}%`;

  document.querySelectorAll('[data-entertainment-command]')
    .forEach(button=>button.disabled=!state.ready);
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
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  }
}

function ms712GenerateWebhookId(){
  const input=document.getElementById('entertainmentWebhookId');
  if(!input)return;
  input.value=`serenity_${ms712RandomId().replace(/-/g,'')}`;
  ms712RefreshYamlPreview();
  ms712SetStatus('Nieuwe beveiligde webhookcode gemaakt. Sla de instellingen op en vervang daarna de YAML in Home Assistant.','warning');
}

function ms712CollectConfig(){
  const previous=ms712Config();
  const value=id=>String(document.getElementById(id)?.value||'').trim();
  const players=ms712DefaultPlayers().map((player,index)=>({
    key:player.key,
    name:value(`entertainmentPlayerName${index+1}`)||player.name,
    entityId:value(`entertainmentPlayerEntity${index+1}`)
  }));
  const favorites=ms712DefaultFavorites().map((favorite,index)=>({
    id:favorite.id,
    name:value(`entertainmentFavoriteName${index+1}`)||favorite.name,
    mediaContentId:value(`entertainmentFavoriteUrl${index+1}`),
    mediaContentType:value(`entertainmentFavoriteType${index+1}`)||'music'
  }));
  const webhookId=value('entertainmentWebhookId')||`serenity_${ms712RandomId().replace(/-/g,'')}`;
  const configuredPlayers=players.filter(player=>player.entityId);
  const activePlayer=configuredPlayers.some(player=>player.key===previous.activePlayer)
    ?previous.activePlayer
    :(configuredPlayers[0]?.key||players[0].key);

  return ms712NormaliseConfig({
    ...previous,
    enabled:Boolean(configuredPlayers.length&&value('entertainmentHaBaseUrl')&&webhookId),
    haBaseUrl:value('entertainmentHaBaseUrl').replace(/\/+$/,''),
    webhookId,
    activePlayer,
    players,
    favorites,
    updatedAt:new Date().toISOString()
  });
}

function ms712ValidateConfig(config){
  if(!config.haBaseUrl){
    return 'Vul het externe HTTPS-adres van Home Assistant in.';
  }
  if(!/^https:\/\//i.test(config.haBaseUrl)){
    return 'Gebruik een extern HTTPS-adres, bijvoorbeeld je Nabu Casa-adres.';
  }
  if(!config.webhookId){
    return 'Maak eerst een beveiligde webhookcode.';
  }
  if(!ms712ConfiguredPlayers(config).length){
    return 'Vul minimaal één Home Assistant media_player-entiteit in.';
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

  ms712SetStatus('Entertainmentinstellingen opslaan…');

  try{
    await loadTechnicalDashboard(true);
    technicalStateCache=normaliseTechnicalState({
      ...(technicalStateCache||readTechnicalLocalState()),
      entertainment:config
    });

    const shared=await persistTechnicalState(
      'Entertainmentinstellingen opgeslagen.'
    );

    renderEntertainmentPage();
    ms712SetStatus(
      shared
        ?'Opgeslagen en direct gedeeld met alle ingelogde apparaten ✅'
        :'Lokaal opgeslagen. Cloud synchronisatie is nog niet beschikbaar.',
      shared?'success':'warning'
    );
  }catch(error){
    console.error('Entertainmentinstellingen opslaan mislukt:',error);
    ms712SetStatus('Opslaan is niet gelukt. Probeer het opnieuw.','error');
  }
}

async function ms712SaveActivePlayer(playerKey){
  if(!playerKey)return;
  const config=ms712Config();
  if(!config.players.some(player=>player.key===playerKey&&player.entityId))return;

  try{
    localStorage.setItem(ms712LocalKey('player'),playerKey);
  }catch(error){
    console.warn('Entertainmentzone lokaal bewaren mislukt:',error);
  }

  renderEntertainmentPage();
}

function ms712SelectPlayer(playerKey){
  ms712SaveActivePlayer(playerKey).catch(error=>
    console.warn('Entertainmentzone synchroniseren mislukt:',error)
  );
}

function ms712PlayerChanged(){
  const playerKey=document.getElementById('entertainmentActivePlayer')?.value||'';
  ms712SelectPlayer(playerKey);
}

function ms712VolumeLabel(){
  const input=document.getElementById('entertainmentVolume');
  const label=document.getElementById('entertainmentVolumeValue');
  if(label)label.textContent=`${Math.round(Number(input?.value)||0)}%`;
}

async function ms712VolumeChanged(){
  const input=document.getElementById('entertainmentVolume');
  const volume=Math.max(0,Math.min(100,Number(input?.value)||0));
  const config=ms712Config();
  try{
    localStorage.setItem(ms712LocalKey('volume'),String(volume));
  }catch(error){
    console.warn('Entertainmentvolume lokaal bewaren mislukt:',error);
  }
  await ms712SendCommand('volume_set',{volume:(volume/100).toFixed(2)});
}

async function ms712SendCommand(action,extra={}){
  const config=ms712Config();
  const state=ms712ConnectionState(config);
  const activePlayer=config.players.find(player=>player.key===config.activePlayer&&player.entityId)
    ||ms712ConfiguredPlayers(config)[0];

  if(!navigator.onLine){
    ms712SetStatus('Geen internetverbinding. De entertainmentopdracht is niet verzonden.','error');
    return false;
  }
  if(!state.ready||!activePlayer){
    ms712SetStatus('Stel eerst Home Assistant en minimaal één mediaspeler in.','warning');
    ms712ToggleSettings(true);
    return false;
  }

  const endpoint=ms712WebhookUrl(config);
  const params=new URLSearchParams({
    action:String(action||''),
    player:activePlayer.key,
    sent_at:new Date().toISOString()
  });
  Object.entries(extra).forEach(([key,value])=>{
    if(value!==undefined&&value!==null)params.set(key,String(value));
  });

  ms712SetStatus(`Opdracht naar ${activePlayer.name} verzenden…`);

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
    ms712SetStatus(`Opdracht verzonden naar ${activePlayer.name} ✅`,'success');
    return true;
  }catch(error){
    console.error('Entertainmentopdracht mislukt:',error);
    ms712SetStatus('Home Assistant is niet bereikbaar. Controleer internet, het externe adres en de webhook.','error');
    return false;
  }
}

function ms712Command(action){
  return ms712SendCommand(action);
}

function ms712PlayFavorite(index){
  const config=ms712Config();
  const favorites=config.favorites.filter(favorite=>favorite.mediaContentId);
  const favorite=favorites[index];
  if(!favorite)return;

  return ms712SendCommand('play_media',{
    media_content_id:favorite.mediaContentId,
    media_content_type:favorite.mediaContentType||'music'
  });
}

function ms712OpenHomeAssistant(){
  const config=ms712Config();
  if(!config.haBaseUrl){
    ms712SetStatus('Vul eerst het externe Home Assistant-adres in.','warning');
    ms712ToggleSettings(true);
    return;
  }
  window.open(config.haBaseUrl,'_blank','noopener,noreferrer');
}

function ms712YamlQuote(value){
  return String(value||'').replace(/'/g,"''");
}

function ms712BuildYaml(config=ms712CollectConfig()){
  const players=ms712ConfiguredPlayers(config);
  if(!config.webhookId||!players.length){
    return '# Maak eerst een webhookcode en vul minimaal één media_player-entiteit in.';
  }

  const playerMap=players
    .map(player=>`          ${player.key}: ${player.entityId}`)
    .join('\n');

  return `alias: MijnSerenity entertainment\ndescription: Veilige bediening van alleen de ingestelde mediaspelers via MijnSerenity.\ntriggers:\n  - trigger: webhook\n    webhook_id: '${ms712YamlQuote(config.webhookId)}'\n    allowed_methods:\n      - POST\n    local_only: false\nconditions: []\nactions:\n  - variables:\n      requested_player: \"{{ trigger.data.player | default('') }}\"\n      requested_action: \"{{ trigger.data.action | default('') }}\"\n      volume_value: \"{{ trigger.data.volume | default('0.35') | float(0.35) }}\"\n      media_id: \"{{ trigger.data.media_content_id | default('') }}\"\n      media_type: \"{{ trigger.data.media_content_type | default('music') }}\"\n      player_map:\n${playerMap}\n      target_entity: \"{{ player_map.get(requested_player) }}\"\n  - choose:\n      - conditions:\n          - condition: template\n            value_template: \"{{ target_entity is not none and requested_action == 'toggle' }}\"\n        sequence:\n          - action: media_player.toggle\n            target:\n              entity_id: \"{{ target_entity }}\"\n      - conditions:\n          - condition: template\n            value_template: \"{{ target_entity is not none and requested_action == 'previous' }}\"\n        sequence:\n          - action: media_player.media_previous_track\n            target:\n              entity_id: \"{{ target_entity }}\"\n      - conditions:\n          - condition: template\n            value_template: \"{{ target_entity is not none and requested_action == 'play_pause' }}\"\n        sequence:\n          - action: media_player.media_play_pause\n            target:\n              entity_id: \"{{ target_entity }}\"\n      - conditions:\n          - condition: template\n            value_template: \"{{ target_entity is not none and requested_action == 'next' }}\"\n        sequence:\n          - action: media_player.media_next_track\n            target:\n              entity_id: \"{{ target_entity }}\"\n      - conditions:\n          - condition: template\n            value_template: \"{{ target_entity is not none and requested_action == 'stop' }}\"\n        sequence:\n          - action: media_player.media_stop\n            target:\n              entity_id: \"{{ target_entity }}\"\n      - conditions:\n          - condition: template\n            value_template: \"{{ target_entity is not none and requested_action == 'volume_down' }}\"\n        sequence:\n          - action: media_player.volume_down\n            target:\n              entity_id: \"{{ target_entity }}\"\n      - conditions:\n          - condition: template\n            value_template: \"{{ target_entity is not none and requested_action == 'volume_up' }}\"\n        sequence:\n          - action: media_player.volume_up\n            target:\n              entity_id: \"{{ target_entity }}\"\n      - conditions:\n          - condition: template\n            value_template: \"{{ target_entity is not none and requested_action == 'volume_set' }}\"\n        sequence:\n          - action: media_player.volume_set\n            target:\n              entity_id: \"{{ target_entity }}\"\n            data:\n              volume_level: \"{{ volume_value }}\"\n      - conditions:\n          - condition: template\n            value_template: \"{{ target_entity is not none and requested_action == 'play_media' and media_id | length > 0 }}\"\n        sequence:\n          - action: media_player.play_media\n            target:\n              entity_id: \"{{ target_entity }}\"\n            data:\n              media_content_id: \"{{ media_id }}\"\n              media_content_type: \"{{ media_type }}\"\nmode: queued\nmax: 10\n`;
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
    console.error('Entertainment YAML kopiëren mislukt:',error);
    ms712SetStatus('Kopiëren is niet gelukt. Selecteer de YAML handmatig.','error');
  }
}

function ms712DownloadYaml(){
  const yaml=ms712BuildYaml(ms712CollectConfig());
  const blob=new Blob([yaml],{type:'text/yaml;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download='mijnserenity-entertainment-automation.yaml';
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
