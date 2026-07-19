/* MijnSerenity 7.4.0 LIVE — officiële Home Assistant OAuth + WebSocket koppeling */
(()=>{
  'use strict';

  const AUTH_KEY='mijnserenity-ha-oauth-v733';
  const OAUTH_STATE_KEY='mijnserenity-ha-oauth-state-v733';
  const SELECT_KEY='mijnserenity-ha-selection-v733';
  const LIVE_CAMERA_KEY='mijnserenity-ha-live-cameras-v733';
  const ALLOWED_DOMAINS=new Set(['light','media_player','remote','camera','switch','scene']);
  let installed=false;
  let discovered=[];
  let stateMap=new Map();
  let originalToggleSettings=null;
  let socket=null;
  let socketToken='';
  let socketId=1;
  let stateSubscriptionActive=false;
  const pending=new Map();

  const escape=value=>String(value??'').replace(/[&<>'"]/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  })[char]);

  function authData(){
    try{return JSON.parse(localStorage.getItem(AUTH_KEY)||'null')}catch{return null}
  }

  function saveAuth(value){
    localStorage.setItem(AUTH_KEY,JSON.stringify(value));
  }

  function clearAuth(){
    localStorage.removeItem(AUTH_KEY);
    closeSocket();
  }

  function normaliseBaseUrl(value){
    const raw=String(value||'').trim().replace(/\/+$/,'');
    if(!/^https:\/\//i.test(raw))throw new Error('Gebruik je volledige beveiligde Nabu Casa-adres dat met https:// begint.');
    const url=new URL(raw);
    return url.origin;
  }

  function clientId(){return window.location.origin}
  function redirectUri(){return `${window.location.origin}${window.location.pathname}?ha_callback=1`}
  function randomState(){
    if(globalThis.crypto?.randomUUID)return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function status(message,state=''){
    const el=document.getElementById('ms730ConnectionStatus');
    if(!el)return;
    el.textContent=message;
    el.className=`ms730-connection-status ${state}`.trim();
  }

  async function tokenRequest(baseUrl,body){
    const response=await fetch(`${baseUrl}/auth/token`,{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
      body:new URLSearchParams(body).toString(),
      cache:'no-store'
    });
    let data={};
    try{data=await response.json()}catch{}
    if(!response.ok)throw new Error(data.error_description||data.error||`Home Assistant-login mislukt (${response.status}).`);
    return data;
  }

  async function currentAccessToken(){
    const auth=authData();
    if(!auth?.baseUrl||!auth?.refreshToken)throw new Error('Home Assistant is nog niet gekoppeld.');
    if(auth.accessToken&&Number(auth.expiresAt||0)>Date.now()+60000)return auth.accessToken;
    const data=await tokenRequest(auth.baseUrl,{
      grant_type:'refresh_token',
      refresh_token:auth.refreshToken,
      client_id:auth.clientId||clientId()
    });
    const updated={
      ...auth,
      accessToken:data.access_token,
      expiresAt:Date.now()+Math.max(60,Number(data.expires_in)||1800)*1000
    };
    saveAuth(updated);
    return updated.accessToken;
  }

  function closeSocket(){
    if(socket){try{socket.close()}catch{}}
    socket=null;socketToken='';stateSubscriptionActive=false;
    pending.forEach(({reject})=>reject(new Error('Home Assistant-verbinding gesloten.')));
    pending.clear();
  }

  async function ensureSocket(){
    const auth=authData();
    if(!auth?.baseUrl)throw new Error('Home Assistant is nog niet gekoppeld.');
    const token=await currentAccessToken();
    if(socket&&socket.readyState===WebSocket.OPEN&&socketToken===token)return socket;
    closeSocket();
    const wsUrl=auth.baseUrl.replace(/^https:/i,'wss:').replace(/^http:/i,'ws:')+'/api/websocket';
    return new Promise((resolve,reject)=>{
      let settled=false;
      const ws=new WebSocket(wsUrl);
      const timer=setTimeout(()=>{
        if(settled)return;settled=true;try{ws.close()}catch{};reject(new Error('Home Assistant reageert niet op tijd.'));
      },15000);
      ws.onmessage=event=>{
        let message={};
        try{message=JSON.parse(event.data)}catch{return}
        if(message.type==='auth_required'){
          ws.send(JSON.stringify({type:'auth',access_token:token}));
          return;
        }
        if(message.type==='auth_ok'){
          clearTimeout(timer);settled=true;socket=ws;socketToken=token;resolve(ws);return;
        }
        if(message.type==='auth_invalid'){
          clearTimeout(timer);settled=true;clearAuth();reject(new Error('Home Assistant heeft de koppeling geweigerd. Koppel opnieuw.'));return;
        }
        if(message.type==='result'&&pending.has(message.id)){
          const item=pending.get(message.id);pending.delete(message.id);
          if(message.success)item.resolve(message.result);else item.reject(new Error(message.error?.message||'Home Assistant-opdracht mislukt.'));
        }
        if(message.type==='event'&&message.event?.event_type==='state_changed'){
          const next=message.event.data?.new_state;
          if(next?.entity_id)stateMap.set(next.entity_id,cleanState(next));
        }
      };
      ws.onerror=()=>{
        if(!settled){clearTimeout(timer);settled=true;reject(new Error('Kan geen beveiligde verbinding met Home Assistant maken.'))}
      };
      ws.onclose=()=>{if(socket===ws){socket=null;socketToken=''}};
    });
  }

  async function wsCommand(command){
    const ws=await ensureSocket();
    const id=socketId++;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Home Assistant-opdracht duurde te lang.'))},15000);
      pending.set(id,{
        resolve:value=>{clearTimeout(timer);resolve(value)},
        reject:error=>{clearTimeout(timer);reject(error)}
      });
      ws.send(JSON.stringify({id,...command}));
    });
  }

  function cleanState(item){
    const entityId=String(item?.entity_id||'');
    const attributes=item?.attributes&&typeof item.attributes==='object'?item.attributes:{};
    return {
      entity_id:entityId,
      domain:entityId.split('.')[0]||'',
      state:String(item?.state||''),
      name:String(attributes.friendly_name||entityId),
      attributes:{
        volume_level:Number.isFinite(Number(attributes.volume_level))?Number(attributes.volume_level):null,
        brightness:Number.isFinite(Number(attributes.brightness))?Number(attributes.brightness):null,
        media_title:attributes.media_title??null,
        media_artist:attributes.media_artist??null
      }
    };
  }

  async function getStates(){
    const states=await wsCommand({type:'get_states'});
    discovered=(Array.isArray(states)?states:[])
      .map(cleanState)
      .filter(item=>ALLOWED_DOMAINS.has(item.domain))
      .sort((a,b)=>a.name.localeCompare(b.name,'nl'));
    stateMap=new Map(discovered.map(item=>[item.entity_id,item]));
    if(!stateSubscriptionActive){
      await wsCommand({type:'subscribe_events',event_type:'state_changed'});
      stateSubscriptionActive=true;
    }
    return discovered;
  }

  async function callService(domain,service,entityIds,serviceData={}){
    const ids=(Array.isArray(entityIds)?entityIds:[entityIds]).filter(Boolean);
    if(!ids.length)throw new Error('Dit apparaat is nog niet gekoppeld.');
    return wsCommand({
      type:'call_service',domain,service,
      service_data:serviceData,
      target:{entity_id:ids.length===1?ids[0]:ids}
    });
  }

  async function processOAuthCallback(){
    const params=new URLSearchParams(location.search);
    const code=params.get('code');
    const returnedState=params.get('state');
    if(!code)return;
    let saved=null;
    try{saved=JSON.parse(sessionStorage.getItem(OAUTH_STATE_KEY)||'null')}catch{}
    if(!saved||!returnedState||saved.nonce!==returnedState){
      history.replaceState({},'',location.pathname);
      throw new Error('De Home Assistant-aanmelding kon niet veilig worden gecontroleerd. Probeer opnieuw.');
    }
    const data=await tokenRequest(saved.baseUrl,{
      grant_type:'authorization_code',
      code,
      client_id:saved.clientId
    });
    saveAuth({
      baseUrl:saved.baseUrl,
      clientId:saved.clientId,
      refreshToken:data.refresh_token,
      accessToken:data.access_token,
      expiresAt:Date.now()+Math.max(60,Number(data.expires_in)||1800)*1000,
      connectedAt:new Date().toISOString()
    });
    sessionStorage.removeItem(OAUTH_STATE_KEY);
    history.replaceState({},'',location.pathname);
    window.MIJSERENITY_HA_CALLBACK_OK=true;
    window.dispatchEvent(new CustomEvent('mijnserenity-ha-connected'));
  }

  function connect(){
    try{
      const input=document.getElementById('ms730HaUrl');
      const baseUrl=normaliseBaseUrl(input?.value||authData()?.baseUrl||'');
      const nonce=randomState();
      const state={nonce,baseUrl,clientId:clientId(),redirectUri:redirectUri()};
      sessionStorage.setItem(OAUTH_STATE_KEY,JSON.stringify(state));
        const url=new URL(`${baseUrl}/auth/authorize`);
      url.searchParams.set('client_id',state.clientId);
      url.searchParams.set('redirect_uri',state.redirectUri);
      url.searchParams.set('state',nonce);
      location.assign(url.toString());
    }catch(error){status(error.message,'error')}
  }

  async function disconnect(){
    const auth=authData();
    if(auth?.baseUrl&&auth?.refreshToken){
      try{
        await fetch(`${auth.baseUrl}/auth/revoke`,{
          method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
          body:new URLSearchParams({token:auth.refreshToken}).toString(),cache:'no-store'
        });
      }catch{}
    }
    clearAuth();discovered=[];stateMap.clear();renderDiscovered();renderConnection();
    status('Home Assistant is losgekoppeld.','warning');
  }

  function renderConnection(){
    const auth=authData();
    const input=document.getElementById('ms730HaUrl');
    if(input&&!input.value)input.value=auth?.baseUrl||'';
    const connectButton=document.getElementById('ms730ConnectButton');
    const disconnectButton=document.getElementById('ms730DisconnectButton');
    if(connectButton)connectButton.textContent=auth?'Opnieuw koppelen':'Koppel met Home Assistant';
    disconnectButton?.classList.toggle('hidden',!auth);
    if(auth)status('Home Assistant-account gekoppeld. Haal nu je apparaten op.','success');
    else status('Nog niet gekoppeld. Vul je Nabu Casa-adres in en meld je aan.');
  }

  function friendly(entity){return String(entity?.name||entity?.entity_id||'Onbekend')}
  function contains(entity,terms){
    const text=`${entity?.entity_id||''} ${entity?.name||''}`.toLowerCase();
    return terms.some(term=>text.includes(term));
  }
  function defaultSelected(entity){
    if(entity.domain==='light'||entity.domain==='scene')return true;
    if(entity.domain==='camera')return contains(entity,['ring','doorbell','voordeur','oprit','serenity','radarbeugel','live_weergave']);
    if(entity.domain==='switch')return contains(entity,['ring','doorbell','voordeur']);
    if(entity.domain==='remote')return contains(entity,['apple','tv']);
    if(entity.domain==='media_player')return contains(entity,['sonos','apple tv','apple_tv']);
    return false;
  }
  function loadSavedSelection(){try{return JSON.parse(localStorage.getItem(SELECT_KEY)||'{}')||{}}catch{return {}}}

  function renderGroup(title,icon,domain,max){
    const saved=loadSavedSelection();
    const list=discovered.filter(entity=>entity.domain===domain);
    if(!list.length)return `<div class="ms730-device-group"><h5>${icon} ${title}</h5><div class="ms730-empty">Niet gevonden</div></div>`;
    return `<div class="ms730-device-group"><h5>${icon} ${title}${max?` <small>(max. ${max})</small>`:''}</h5><div class="ms730-device-list">${list.map(entity=>{
      const checked=Object.prototype.hasOwnProperty.call(saved,entity.entity_id)?Boolean(saved[entity.entity_id]):defaultSelected(entity);
      return `<label class="ms730-device-option"><input type="checkbox" data-ms730-domain="${escape(domain)}" data-ms730-max="${max||0}" value="${escape(entity.entity_id)}" ${checked?'checked':''}><span><strong>${escape(friendly(entity))}</strong><small>${escape(entity.entity_id)}</small><span class="ms730-live-state">Status: ${escape(entity.state)}</span></span></label>`;
    }).join('')}</div></div>`;
  }

  function renderDiscovered(){
    const container=document.getElementById('ms730DeviceGroups');
    if(!container)return;
    if(!discovered.length){container.innerHTML='<div class="ms730-empty">Tik op Apparaten ontdekken nadat Home Assistant is gekoppeld.</div>';return}
    container.innerHTML=[
      renderGroup('Hue / verlichting','💡','light',4),
      renderGroup('Sonos / mediaspelers','🔊','media_player',4),
      renderGroup('Apple TV afstandsbediening','📺','remote',1),
      renderGroup('Camera’s','📹','camera',4),
      renderGroup('Schakelaars','👁','switch',1),
      renderGroup('Scènes','✨','scene',4)
    ].join('');
    container.querySelectorAll('input[type=checkbox]').forEach(input=>input.addEventListener('change',()=>{
      const max=Number(input.dataset.ms730Max||0);
      if(max&&input.checked){
        const selected=[...container.querySelectorAll(`input[data-ms730-domain="${input.dataset.ms730Domain}"]:checked`)];
        if(selected.length>max){input.checked=false;showAppToast?.(`Je kunt maximaal ${max} kiezen.`)}
      }
    }));
  }

  async function testConnection(){
    if(!authData()){status('Koppel eerst met Home Assistant.','warning');return false}
    status('Beveiligde verbinding testen… even geduld.');
    try{
      await currentAccessToken();
      await ensureSocket();
      status('Home Assistant is verbonden ✅','success');
      return true;
    }catch(error){status(error.message,'error');return false}
  }

  async function discoverDevices(){
    if(!await testConnection())return;
    status('Apparaten ophalen uit Home Assistant…');
    try{
      await getStates();
      renderDiscovered();
      status(`${discovered.length} geschikte entiteiten gevonden. Kies wat je in MijnSerenity wilt tonen.`,`success`);
    }catch(error){status(error.message,'error')}
  }

  function selectedByDomain(domain){
    return [...document.querySelectorAll(`#ms730DeviceGroups input[data-ms730-domain="${domain}"]:checked`)].map(input=>input.value);
  }
  function entity(id){return discovered.find(item=>item.entity_id===id)}
  function keyFor(item,index,prefix){return typeof ms712SafeKey==='function'?ms712SafeKey(item?.name||item?.entity_id,`${prefix}-${index+1}`):`${prefix}-${index+1}`}

  async function applySelection(){
    if(!discovered.length){status('Haal eerst je apparaten op.','warning');return}
    const selected={};
    document.querySelectorAll('#ms730DeviceGroups input[type=checkbox]').forEach(input=>selected[input.value]=input.checked);
    localStorage.setItem(SELECT_KEY,JSON.stringify(selected));
    const lights=selectedByDomain('light').slice(0,4).map(entity).filter(Boolean);
    const media=selectedByDomain('media_player').map(entity).filter(Boolean);
    const remotes=selectedByDomain('remote').slice(0,1).map(entity).filter(Boolean);
    const cameras=selectedByDomain('camera').slice(0,4).map(entity).filter(Boolean);
    const switches=selectedByDomain('switch').slice(0,1).map(entity).filter(Boolean);
    const scenes=selectedByDomain('scene').slice(0,4).map(entity).filter(Boolean);
    const appleMedia=media.find(item=>contains(item,['apple tv','apple_tv','appletv']))||null;
    const players=media.filter(item=>item!==appleMedia).slice(0,3);
    const auth=authData();
    const liveCameras=cameras.map((item,index)=>({
      key:keyFor(item,index,'camera'),
      name:item.name,
      entityId:item.entity_id
    }));
    localStorage.setItem(LIVE_CAMERA_KEY,JSON.stringify(liveCameras));
    window.dispatchEvent(new CustomEvent('mijnserenity-ha-cameras-updated',{detail:liveCameras}));
    const ringCamera=cameras.find(item=>contains(item,['ring','doorbell','voordeur']))||cameras[0]||null;
    const config=ms712NormaliseConfig({
      ...ms712Config(),enabled:true,haBaseUrl:auth?.baseUrl||'',dashboardPath:'/',webhookId:'oauth_websocket',
      ring:{name:ringCamera?.name||'Ring beveiliging',cameraEntity:ringCamera?.entity_id||'',motionSwitchEntity:switches[0]?.entity_id||''},
      hue:{lights:ms712DefaultLights().map((slot,index)=>lights[index]?{key:keyFor(lights[index],index,'licht'),name:lights[index].name,entityId:lights[index].entity_id}:slot)},
      players:ms712DefaultPlayers().map((slot,index)=>players[index]?{key:keyFor(players[index],index,'speler'),name:players[index].name,entityId:players[index].entity_id}:slot),
      appleTv:{name:appleMedia?.name||remotes[0]?.name||'Apple TV',mediaEntity:appleMedia?.entity_id||'',remoteEntity:remotes[0]?.entity_id||''},
      scenes:ms712DefaultScenes().map((slot,index)=>scenes[index]?{key:keyFor(scenes[index],index,'scene'),name:scenes[index].name,entityId:scenes[index].entity_id}:slot),
      updatedAt:new Date().toISOString()
    });
    technicalStateCache=typeof normaliseTechnicalState==='function'
      ?normaliseTechnicalState({...(technicalStateCache||readTechnicalLocalState?.()||{}),entertainment:config})
      :{...(technicalStateCache||{}),entertainment:config};
    let shared=false;
    try{
      if(typeof persistTechnicalState==='function'&&currentBoat&&currentUser){
        shared=await persistTechnicalState('Home Assistant-apparaten ingesteld.');
      }
    }catch(error){
      console.warn('Home Assistant-selectie delen mislukt',error);
    }
    renderEntertainmentPage?.();
    status(shared
      ?`Gereed: ${ms712ConfiguredDeviceCount(config)} apparaten/scènes gekoppeld en gedeeld.`
      :`Gereed: ${ms712ConfiguredDeviceCount(config)} apparaten/scènes gekoppeld op dit apparaat.`,
      shared?'success':'warning');
    showAppToast?.(shared?'Home Assistant-apparaten ingesteld en gedeeld ✅':'Home Assistant-apparaten lokaal ingesteld ✅');
  }

  function injectWizard(){
    const panel=document.getElementById('entertainmentSettingsPanel');
    if(!panel||document.getElementById('ms730HomeAssistantWizard'))return;
    panel.classList.add('ms730-simple-mode');
    const wizard=document.createElement('div');
    wizard.id='ms730HomeAssistantWizard';
    wizard.innerHTML=`
      <div class="ms730-wizard-card"><div class="ms730-wizard-head"><div><span class="ms730-live-pill">🔐 OFFICIËLE HOME ASSISTANT-LOGIN</span><h4>Eenvoudig koppelen</h4><p class="small">Geen YAML, geen webhook en geen token kopiëren. Je meldt je één keer veilig aan bij Home Assistant.</p></div></div></div>
      <div class="ms730-wizard-card ms730-wizard-step"><span>1</span><div><strong>Nabu Casa-adres</strong><p class="small">Plak het adres waarmee je Home Assistant extern opent.</p><div class="ms730-wizard-grid"><label>Home Assistant Cloud-adres<input id="ms730HaUrl" type="url" inputmode="url" placeholder="https://jouw-adres.ui.nabu.casa"></label><button id="ms730ConnectButton" type="button" onclick="ms730ConnectHomeAssistant()">Koppel met Home Assistant</button></div><div class="ms730-wizard-actions"><button id="ms730DisconnectButton" type="button" class="secondary hidden" onclick="ms730DisconnectHomeAssistant()">Loskoppelen</button><button type="button" class="secondary" onclick="ms730TestConnection()">Verbinding testen</button></div></div></div>
      <div id="ms730ConnectionStatus" class="ms730-connection-status">Nog niet gekoppeld.</div>
      <div class="ms730-wizard-card ms730-wizard-step"><span>2</span><div><strong>Apparaten automatisch ophalen</strong><p class="small">MijnSerenity haalt de namen en actuele status rechtstreeks uit jouw Home Assistant.</p><div class="ms730-wizard-actions"><button type="button" onclick="ms730DiscoverDevices()">🔎 Apparaten ontdekken</button><button type="button" class="secondary" onclick="ms730ApplySelection()">✓ Selectie gebruiken</button></div><div id="ms730DeviceGroups" class="ms730-device-groups"><div class="ms730-empty">Koppel eerst Home Assistant.</div></div></div></div>
      <button type="button" class="secondary ms730-advanced-toggle" onclick="ms730ToggleAdvanced()">Geavanceerde handmatige instellingen tonen</button>`;
    panel.appendChild(wizard);
    renderConnection();renderDiscovered();
  }

  function toggleAdvanced(){
    const panel=document.getElementById('entertainmentSettingsPanel');if(!panel)return;
    const simple=panel.classList.toggle('ms730-simple-mode');panel.classList.toggle('ms730-advanced-mode',!simple);
    const button=document.querySelector('.ms730-advanced-toggle');
    if(button)button.textContent=simple?'Geavanceerde handmatige instellingen tonen':'Terug naar eenvoudige installatie';
  }

  function resolveEntity(category,target){
    const config=ms712Config();
    if(category==='media')return (config.players.find(item=>item.key===target)||config.players.find(item=>item.key===config.activePlayer))?.entityId||'';
    if(category==='hue')return (config.hue.lights.find(item=>item.key===target)||config.hue.lights.find(item=>item.key===config.activeLight))?.entityId||'';
    if(category==='scene')return config.scenes.find(item=>item.key===target)?.entityId||'';
    if(category==='ring')return config.ring.motionSwitchEntity||'';
    if(category==='appletv')return target==='remote'?config.appleTv.remoteEntity:config.appleTv.mediaEntity;
    return '';
  }

  async function sendCommand(category,action,target='',extra={}){
    if(!navigator.onLine){ms712SetStatus?.('Geen internetverbinding.','error');return false}
    if(!authData()){ms712SetStatus?.('Koppel eerst Home Assistant.','warning');ms712ToggleSettings?.(true);return false}
    ms712SetStatus?.('Opdracht naar Home Assistant verzenden…');
    try{
      if(category==='hue'){
        if(action==='all_on'||action==='all_off'){
          const ids=ms712ConfiguredLights(ms712Config()).map(item=>item.entityId);
          await callService('light',action==='all_on'?'turn_on':'turn_off',ids);
        }else{
          const id=resolveEntity(category,target);
          if(action==='toggle')await callService('light','toggle',id);
          else if(action==='brightness')await callService('light','turn_on',id,{brightness_pct:Number(extra.brightness_pct||70)});
        }
      }else if(category==='media'){
        const id=resolveEntity(category,target);
        const map={previous:'media_previous_track',play_pause:'media_play_pause',next:'media_next_track',stop:'media_stop',volume_down:'volume_down',volume_up:'volume_up'};
        if(action==='toggle'){
          if(!stateMap.has(id))await getStates();
          const state=stateMap.get(id)?.state;
          await callService('media_player',state&&state!=='off'?'turn_off':'turn_on',id);
        }else if(map[action])await callService('media_player',map[action],id);
        else if(action==='volume_set')await callService('media_player','volume_set',id,{volume_level:Number(extra.volume??extra.volume_level??0.35)});
        else if(action==='play_media')await callService('media_player','play_media',id,{media_content_id:extra.media_content_id,media_content_type:extra.media_content_type||'music'});
      }else if(category==='appletv'){
        const id=resolveEntity(category,target);
        if(target==='remote'){
          if(action==='wakeup')await callService('remote','turn_on',id);
          else if(action==='suspend')await callService('remote','turn_off',id);
          else await callService('remote','send_command',id,{command:action});
        }else{
          const map={previous:'media_previous_track',play_pause:'media_play_pause',next:'media_next_track',volume_down:'volume_down',volume_up:'volume_up'};
          if(action==='toggle'){
            if(!stateMap.has(id))await getStates();
            const state=stateMap.get(id)?.state;await callService('media_player',state&&state!=='off'?'turn_off':'turn_on',id);
          }else if(map[action])await callService('media_player',map[action],id);
        }
      }else if(category==='ring'){
        await callService('switch',action==='motion_on'?'turn_on':'turn_off',resolveEntity(category,target));
      }else if(category==='scene'){
        await callService('scene','turn_on',resolveEntity(category,target));
      }
      ms712SetStatus?.('Home Assistant-opdracht uitgevoerd ✅','success');return true;
    }catch(error){ms712SetStatus?.(error.message,'error');return false}
  }

  async function fetchCameraFrame(entityId){
    const id=String(entityId||'').trim();
    if(!id||!id.startsWith('camera.'))throw new Error('Kies een geldige Home Assistant-camera.');
    const auth=authData();
    if(!auth?.baseUrl)throw new Error('Home Assistant is nog niet gekoppeld.');
    const token=await currentAccessToken();
    const response=await fetch(`${auth.baseUrl}/api/camera_proxy/${encodeURIComponent(id)}`,{
      method:'GET',
      headers:{Authorization:`Bearer ${token}`},
      cache:'no-store',
      credentials:'omit'
    });
    if(!response.ok){
      let message='';
      try{message=await response.text()}catch{}
      throw new Error(message||`Camerabeeld ophalen mislukt (${response.status}).`);
    }
    const blob=await response.blob();
    if(!blob.size)throw new Error('Home Assistant leverde een leeg camerabeeld.');
    return blob;
  }

  function selectedLiveCameras(){
    try{
      const list=JSON.parse(localStorage.getItem(LIVE_CAMERA_KEY)||'[]');
      return Array.isArray(list)?list:[];
    }catch{return []}
  }

  function install(){
    if(installed)return;installed=true;injectWizard();
    window.MIJSERENITY_HA_BRIDGE_READY=true;
    window.ms730ConnectHomeAssistant=connect;
    window.ms730DisconnectHomeAssistant=disconnect;
    window.ms730TestConnection=testConnection;
    window.ms730DiscoverDevices=discoverDevices;
    window.ms730ApplySelection=applySelection;
    window.ms730FetchCameraFrame=fetchCameraFrame;
    window.ms730GetSelectedLiveCameras=selectedLiveCameras;
    window.ms730HomeAssistantConnected=()=>Boolean(authData());
    window.ms730ToggleAdvanced=toggleAdvanced;
    window.ms712SendCommand=sendCommand;
    window.ms712OpenHomeAssistant=()=>{
      const url=authData()?.baseUrl||ms712Config().haBaseUrl;
      if(url)window.open(url,'_blank','noopener,noreferrer');else{ms712SetStatus?.('Koppel eerst Home Assistant.','warning');ms712ToggleSettings?.(true)}
    };
    if(!originalToggleSettings&&typeof window.ms712ToggleSettings==='function'){
      originalToggleSettings=window.ms712ToggleSettings;
      window.ms712ToggleSettings=function(force){injectWizard();const result=originalToggleSettings(force);if(force!==false)document.getElementById('entertainmentSettingsPanel')?.classList.add('ms730-simple-mode');renderConnection();return result};
    }
    if(window.MIJSERENITY_HA_CALLBACK_OK){showAppToast?.('Home Assistant veilig gekoppeld ✅');setTimeout(()=>{captainNavigate?.('entertainment');ms712ToggleSettings?.(true)},300)}
    renderEntertainmentPage?.();
  }

  window.addEventListener('mijnserenity-ha-connected',()=>{
    renderConnection();
    showAppToast?.('Home Assistant veilig gekoppeld ✅');
    setTimeout(()=>{captainNavigate?.('entertainment');ms712ToggleSettings?.(true)},250);
  });

  window.ms730InstallLiveBridge=install;
  const callbackPromise=processOAuthCallback().catch(error=>{window.MIJSERENITY_HA_CALLBACK_ERROR=error.message;console.error(error)});
  window.MIJSERENITY_HA_CALLBACK_PROMISE=callbackPromise;

  // 7.4.0: initialiseer de live bridge altijd zelf. De pagina kan eerder
  // sneller starten dan dit bestand was geladen, waardoor de wizard wel zichtbaar
  // was maar de knoppen nog geen functies hadden.
  function bootLiveBridge(){
    try{install()}catch(error){
      console.error('Home Assistant live bridge kon niet starten:',error);
      status(`Home Assistant-koppeling kon niet starten: ${error.message}`,'error');
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootLiveBridge,{once:true});
  else queueMicrotask(bootLiveBridge);
})();
