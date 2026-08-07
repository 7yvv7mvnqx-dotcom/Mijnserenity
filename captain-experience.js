/* ============================================================
   MijnSerenity 7.14.2 — Captain Experience
   Contextdashboard, live status, Captain, routebeleving,
   Home Assistant-groepen, radio-minispeler en automatische thema's.
   ============================================================ */
(()=>{
  'use strict';

  const BUILD=window.MIJSERENITY_BUILD||'7.14.2';
  const THEME_KEY='ms760-theme';
  const DASHBOARD_ID='ms760CaptainDashboard';
  const REPLAY_ID='ms760ReplayLayer';
  const RADIO_ID='ms760RadioPlayer';
  const UPDATE_MS=5000;

  let updateTimer=0;
  let replayMap=null;
  let replayMarker=null;
  let replayLine=null;
  let replayCoordinates=[];
  let replayIndex=0;
  let replayTimer=0;
  let replaySpeed=1;
  let replayTrip=null;
  let logbookObserver=null;
  let lastThemeHour=-1;
  let lastHarbourSignature='';
  let lastLatestTripSignature='';

  const $=id=>document.getElementById(id);

  function safeArray(value){return Array.isArray(value)?value:[];}
  function text(value,fallback='–'){
    const clean=String(value??'').trim();
    return clean||fallback;
  }
  function escapeHtml(value){
    return String(value??'')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }
  function number(value,fallback=null){
    const parsed=Number(value);
    return Number.isFinite(parsed)?parsed:fallback;
  }
  function nl(value,digits=1){
    const parsed=number(value);
    return parsed===null?'–':parsed.toLocaleString('nl-NL',{maximumFractionDigits:digits});
  }
  function haptic(duration=10){
    try{navigator.vibrate?.(duration);}catch(_error){}
  }
  function toast(message){
    if(typeof window.showAppToast==='function')window.showAppToast(message);
  }

  function getTechnical(){
    try{
      if(typeof technicalStateCache!=='undefined'&&technicalStateCache)return technicalStateCache;
      if(typeof readTechnicalLocalState==='function')return readTechnicalLocalState();
    }catch(_error){}
    return {};
  }
  function getLive(){
    try{return typeof liveNavState!=='undefined'&&liveNavState?liveNavState:{};}catch(_error){return {};}
  }
  function getTrips(){
    try{return typeof tripCache!=='undefined'?safeArray(tripCache):[];}catch(_error){return [];}
  }
  function getPois(){
    try{return typeof poiCache!=='undefined'?safeArray(poiCache):[];}catch(_error){return [];}
  }
  function getPoiPhotos(){
    try{return typeof poiPhotoCache!=='undefined'&&poiPhotoCache?poiPhotoCache:{};}catch(_error){return {};}
  }
  function getTripPhotos(){return window.tripPhotoCache||{};}
  function getSettings(){
    try{return typeof settingsCache!=='undefined'&&settingsCache?settingsCache:{};}catch(_error){return {};}
  }
  function getAutomaticState(){
    try{
      if(typeof window.ms753SharedAutomaticState==='function')return window.ms753SharedAutomaticState();
    }catch(_error){}
    const local=$('ms701AutoToggle');
    return {known:Boolean(local),enabled:Boolean(local?.checked),localRecorder:Boolean(local?.checked),busy:false};
  }

  function formatDuration(hours){
    const value=number(hours,0);
    const minutes=Math.max(0,Math.round(value*60));
    const h=Math.floor(minutes/60);
    const m=minutes%60;
    return h?`${h} u ${m} min`:`${m} min`;
  }

  function isToday(value){
    if(!value)return false;
    const date=new Date(`${String(value).slice(0,10)}T12:00:00`);
    const now=new Date();
    return !Number.isNaN(date.getTime())&&
      date.getFullYear()===now.getFullYear()&&
      date.getMonth()===now.getMonth()&&
      date.getDate()===now.getDate();
  }

  function route(routeName){
    haptic();
    if(routeName==='waterkaarten'){
      window.openWaterkaarten?.();
      return;
    }
    if(routeName==='search'){
      window.ms755OpenSearch?.();
      return;
    }
    if(routeName==='radio'){
      openRadioPlayer(true);
      window.ms755OpenRadio?.();
      return;
    }
    if(routeName==='more'){
      document.querySelector('.bottom-nav-item[data-target="more"]')?.click();
      return;
    }
    if(typeof window.ms753Navigate==='function'){
      window.ms753Navigate(routeName);
      return;
    }
    window.captainNavigate?.(routeName);
  }

  function bftFromKmh(kmh){
    const value=Math.max(0,number(kmh,0));
    const limits=[1,6,12,20,29,39,50,62,75,89,103,118];
    return limits.findIndex(limit=>value<limit)===-1?12:limits.findIndex(limit=>value<limit);
  }

  function liveDistance(live){
    if(number(live.distanceKm)!==null)return number(live.distanceKm,0);
    if(number(live.distance_km)!==null)return number(live.distance_km,0);
    const points=safeArray(live.points);
    if(points.length<2)return 0;
    let total=0;
    for(let index=1;index<points.length;index++){
      const a=points[index-1],b=points[index];
      const lat1=number(a.lat),lat2=number(b.lat),lon1=number(a.lon),lon2=number(b.lon);
      if([lat1,lat2,lon1,lon2].some(value=>value===null))continue;
      const r=6371;
      const dLat=(lat2-lat1)*Math.PI/180;
      const dLon=(lon2-lon1)*Math.PI/180;
      const x=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
      total+=r*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
    }
    return total;
  }

  function contextState(){
    const live=getLive();
    const automatic=getAutomaticState();
    const trips=getTrips();
    const latest=trips.find(trip=>trip?.trip_date)||trips[0]||null;
    const status=String(live.status||'').toLowerCase();
    const speed=number(live.currentSpeedKmh,number(live.speedKmh,0));
    const distance=liveDistance(live);

    if(status==='active'){
      return {
        key:'underway',badge:'● LIVE',title:'Serenity vaart',
        subtitle:`${nl(speed,1)} km/u · ${nl(distance,1)} km geregistreerd`,
        actions:[
          ['live','⛵','Live varen','primary'],
          ['waterkaarten','🗺️','Waterkaarten',''],
          ['radio','📻','Radio','']
        ]
      };
    }
    if(status==='paused'){
      return {
        key:'paused',badge:'⏸ GEPAUZEERD',title:'Vaart staat veilig gepauzeerd',
        subtitle:'Open Live varen om te hervatten of de opname af te sluiten.',
        actions:[
          ['live','▶️','Hervatten','primary'],
          ['logbook','📖','Logboek',''],
          ['weather','☀️','Weer','']
        ]
      };
    }
    if(automatic?.enabled){
      return {
        key:'ready',badge:'✓ VERTREKKLAAR',title:'Captain wacht op vertrek',
        subtitle:automatic.localRecorder===false
          ?'Een ander apparaat registreert; dit apparaat kijkt mee.'
          :'Automatisch varen staat aan en controleert de GPS.',
        actions:[
          ['waterkaarten','🗺️','Plan route','primary'],
          ['live','📍','GPS-status',''],
          ['weather','☀️','Vaarweer','']
        ]
      };
    }
    if(latest&&isToday(latest.trip_date)){
      return {
        key:'arrived',badge:'⚓ AANGEKOMEN',title:'Vaartocht van vandaag staat klaar',
        subtitle:`${text(latest.departure,'Vertrek')} → ${text(latest.arrival,'Aankomst')} · ${nl(latest.distance_km,1)} km`,
        actions:[
          ['logbook','📖','Bekijk vaart','primary'],
          ['costs','🧾','Kosten',''],
          ['pois','⭐','Haven bewaren','']
        ]
      };
    }
    return {
      key:'harbour',badge:'⚓ AAN BOORD',title:'Serenity ligt rustig klaar',
      subtitle:'Kies een route, controleer het weer of start automatisch varen.',
      actions:[
        ['live','⛵','Start varen','primary'],
        ['planner','🧭','Plan route',''],
        ['weather','☀️','Vaarweer','']
      ]
    };
  }

  function statusItems(){
    const state=getTechnical();
    const live=getLive();
    const weather=live.weather||{};
    const house=number(state.houseVoltage);
    const batteryType=String(state.batteryType||'').toLowerCase();
    const batteryLevel=house===null?'info':(
      batteryType.includes('lith')
        ?house<12.0?'danger':house<12.8?'warning':'good'
        :house<11.8?'danger':house<12.2?'warning':'good'
    );
    const water=number(state.waterPct);
    const fuel=number(state.fuelPct);
    const wind=number(weather.windSpeed);
    const ha=Boolean(window.ms730HomeAssistantConnected?.());

    return [
      {icon:'🔋',label:'Huishoudaccu',value:house===null?'Nog meten':`${house.toFixed(1)} V`,level:batteryLevel},
      {icon:'⚡',label:'Walstroom',value:state.shorePower?'Aangesloten':'Niet actief',level:state.shorePower?'good':'info'},
      {icon:'💧',label:'Drinkwater',value:water===null?'Nog meten':`${Math.round(water)}%`,level:water===null?'info':water<20?'danger':water<40?'warning':'good'},
      {icon:'⛽',label:'Diesel',value:fuel===null?'Nog meten':`${Math.round(fuel)}%`,level:fuel===null?'info':fuel<20?'danger':fuel<35?'warning':'good'},
      {icon:'🌬️',label:'Wind',value:wind===null?'Weer openen':`${bftFromKmh(wind)} Bft · ${Math.round(wind)} km/u`,level:wind===null?'info':wind>=50?'danger':wind>=30?'warning':'good'},
      {icon:navigator.onLine?'📡':'⚠️',label:'Verbinding',value:navigator.onLine?(ha?'Online · HA gekoppeld':'Online'):'Offline',level:navigator.onLine?'good':'warning'}
    ];
  }

  function actionButton(action){
    const [routeName,icon,label,className]=action;
    return `<button type="button" class="ms760-context-action ${className||''}" data-ms760-route="${escapeHtml(routeName)}"><span aria-hidden="true">${icon}</span><span>${escapeHtml(label)}</span></button>`;
  }

  function quickButton(routeName,icon,label){
    return `<button type="button" class="ms760-quick-button" data-ms760-route="${escapeHtml(routeName)}"><span aria-hidden="true">${icon}</span><strong>${escapeHtml(label)}</strong></button>`;
  }

  function buildDashboard(){
    const simple=$('ms750SimpleDashboard');
    if(!simple||$(DASHBOARD_ID))return false;
    const welcome=simple.querySelector('.ms750-welcome-card');
    const section=document.createElement('section');
    section.id=DASHBOARD_ID;
    section.className='ms760-dashboard';
    section.setAttribute('aria-label','Captain dashboard');
    section.innerHTML=`
      <article class="ms760-context-card ms760-glass-card">
        <div class="ms760-context-head">
          <div class="ms760-context-copy">
            <span id="ms760ContextBadge" class="ms760-context-badge">CAPTAIN</span>
            <h3 id="ms760ContextTitle">Serenity wordt gecontroleerd…</h3>
            <p id="ms760ContextSubtitle">Even geduld.</p>
          </div>
          <button id="ms760AutoToggle" type="button" class="ms760-auto-toggle" aria-pressed="false">Auto uit</button>
        </div>
        <div id="ms760ContextActions" class="ms760-context-actions"></div>
      </article>

      <div class="ms760-section-title"><h3>Live aan boord</h3><small>Tik voor details</small></div>
      <div id="ms760StatusStrip" class="ms760-status-strip" aria-label="Actuele bootstatus"></div>

      <article class="ms760-captain-card ms760-glass-card">
        <div class="ms760-captain-head">
          <span class="ms760-captain-mark" aria-hidden="true">🧭</span>
          <div><h3>Vraag het de Captain</h3><p>Gebruikt je eigen boot-, route- en kostengegevens.</p></div>
        </div>
        <div class="ms760-captain-prompts" aria-label="Voorbeeldvragen">
          <button type="button" class="ms760-prompt" data-ms760-question="Waar kunnen we morgen heen?">Morgen varen</button>
          <button type="button" class="ms760-prompt" data-ms760-question="Is het veilig vaarweer?">Veilig vaarweer</button>
          <button type="button" class="ms760-prompt" data-ms760-question="Wat vraagt aandacht aan Serenity?">Technische aandacht</button>
          <button type="button" class="ms760-prompt" data-ms760-question="Wat hebben we dit seizoen uitgegeven?">Uitgaven</button>
          <button type="button" class="ms760-prompt" data-ms760-question="Analyseer mijn laatste vaart">Laatste vaart</button>
        </div>
        <form id="ms760CaptainForm" class="ms760-captain-input">
          <input id="ms760CaptainInput" type="search" autocomplete="off" placeholder="Stel een vraag over Serenity">
          <button type="submit" aria-label="Vraag stellen">➜</button>
        </form>
        <div id="ms760CaptainAnswer" class="ms760-captain-answer" aria-live="polite"></div>
      </article>

      <div class="ms760-section-title"><h3>Snelle bediening</h3><small>Alles binnen één tik</small></div>
      <div class="ms760-quick-grid">
        ${quickButton('live','⛵','Varen')}
        ${quickButton('waterkaarten','🗺️','Waterkaarten')}
        ${quickButton('map','📍','Kaart')}
        ${quickButton('search','🔎','Zoeken')}
        ${quickButton('entertainment','🏡','Home Assistant')}
        ${quickButton('radio','📻','Radio')}
        ${quickButton('logbook','📖','Logboek')}
        ${quickButton('weather','☀️','Weer')}
        ${quickButton('more','☰','Alles')}
      </div>

      <div id="ms760HarbourSection" class="hidden">
        <div class="ms760-section-title"><h3>Favoriete havens</h3><small>Veeg voor meer</small></div>
        <div id="ms760HarbourRow" class="ms760-harbour-row"></div>
      </div>

      <article id="ms760LatestTrip" class="ms760-trip-card ms760-glass-card hidden"></article>
    `;
    if(welcome)welcome.insertAdjacentElement('afterend',section);
    else simple.prepend(section);

    section.addEventListener('click',event=>{
      const routeButton=event.target.closest('[data-ms760-route]');
      if(routeButton){route(routeButton.dataset.ms760Route);return;}
      const question=event.target.closest('[data-ms760-question]');
      if(question){askCaptain(question.dataset.ms760Question);return;}
      const poiButton=event.target.closest('[data-ms760-poi]');
      if(poiButton){window.openCaptainItem?.('poi',poiButton.dataset.ms760Poi);return;}
      const replay=event.target.closest('[data-ms760-replay]');
      if(replay){openReplay(replay.dataset.ms760Replay);}
    });
    $('ms760CaptainForm')?.addEventListener('submit',event=>{
      event.preventDefault();
      askCaptain($('ms760CaptainInput')?.value||'');
    });
    $('ms760AutoToggle')?.addEventListener('click',toggleAutomatic);
    updateDashboard();
    return true;
  }

  async function toggleAutomatic(){
    const button=$('ms760AutoToggle');
    if(button)button.disabled=true;
    try{
      if(typeof window.ms753ToggleSharedAutomatic==='function')await window.ms753ToggleSharedAutomatic();
      else $('ms750AutoButton')?.click();
    }catch(error){
      console.warn('Automatisch varen wijzigen mislukt:',error);
      toast('Automatisch varen kon niet worden gewijzigd.');
    }finally{
      if(button)button.disabled=false;
      updateDashboard();
    }
  }


  function enhancedCaptainAnswer(question){
    const query=String(question||'').toLowerCase();
    const technical=getTechnical();
    const live=getLive();
    const weather=live.weather||{};
    const favorites=favoritePois();

    if(/morgen|waar.*heen|bestemming|leuke haven/.test(query)){
      if(favorites.length){
        const names=favorites.slice(0,3).map(item=>item.name).filter(Boolean);
        return `Mooie kandidaten uit jullie eigen favorieten zijn ${names.join(', ')}. Open Reisplanner om afstand, bruggen en doorvaarthoogte te controleren.`;
      }
      return 'Er zijn nog geen favoriete havens beschikbaar. Open POI’s of Reisplanner om een bestemming te kiezen.';
    }

    if(/veilig.*weer|vaarweer|wind|storm/.test(query)){
      const wind=number(weather.windSpeed);
      const gust=number(weather.windGusts);
      const rain=number(weather.precipitation,0);
      if(wind===null)return 'Er is nog geen actueel weer bij de route. Open Weer of Live varen om de actuele locatieverwachting op te halen.';
      const bft=bftFromKmh(wind);
      const judgement=bft<=3?'rustig':bft<=5?'opletten':bft<=6?'stevig':'ongunstig';
      return `De actuele wind is ongeveer ${bft} Bft (${Math.round(wind)} km/u)${gust!==null?`, met vlagen tot ${Math.round(gust)} km/u`:''}. Dat beoordeel ik als ${judgement}${rain>0?` en er wordt ${rain.toFixed(1)} mm neerslag gemeld`:''}. Controleer altijd ook lokale waarschuwingen en omstandigheden op het water.`;
    }

    if(/aandacht|bootstatus|hoe is de boot|techniek/.test(query)){
      const points=[];
      const house=number(technical.houseVoltage);
      const water=number(technical.waterPct);
      const fuel=number(technical.fuelPct);
      if(house!==null&&house<12.2)points.push(`huishoudaccu ${house.toFixed(1)} V`);
      if(water!==null&&water<35)points.push(`drinkwater ${Math.round(water)}%`);
      if(fuel!==null&&fuel<35)points.push(`diesel ${Math.round(fuel)}%`);
      const due=safeArray(technical.maintenance).filter(task=>{
        try{return typeof technicalTaskStatus==='function'&&['critical','warning'].includes(technicalTaskStatus(task)?.level);}catch(_error){return false;}
      }).slice(0,2).map(task=>task.title||task.name).filter(Boolean);
      points.push(...due);
      return points.length
        ?`Aandachtspunten: ${points.join(', ')}. Open Techniek voor controle en onderhoud.`
        :'Op basis van de bekende gegevens zie ik geen direct kritisch aandachtspunt. Controleer voor vertrek wel accu, brandstof, water, motor en bilge.';
    }

    if(/beste haven|favoriete haven|favorieten/.test(query)){
      if(!favorites.length)return 'Er zijn nog geen favoriete havens gemarkeerd.';
      return `Jullie favoriete havens zijn onder andere ${favorites.slice(0,4).map(item=>item.name).filter(Boolean).join(', ')}.`;
    }

    return '';
  }

  function askCaptain(question){
    const clean=String(question||'').trim();
    if(!clean){$('ms760CaptainInput')?.focus();return;}
    haptic();
    const input=$('ms760CaptainInput');
    const answer=$('ms760CaptainAnswer');
    if(input)input.value=clean;
    if(!answer)return;
    answer.classList.add('has-answer','thinking');
    answer.textContent='Captain analyseert Serenity…';
    setTimeout(()=>{
      let result='';
      try{
        result=enhancedCaptainAnswer(clean);
        if(!result&&typeof ms690CaptainAnswer==='function')result=ms690CaptainAnswer(clean);
        else if(typeof window.ms690CaptainAnswer==='function')result=window.ms690CaptainAnswer(clean);
      }catch(error){console.warn('Captain antwoord mislukt:',error);}
      if(!result){
        try{
          window.ms690AskCaptain?.(clean);
          result=$('ms690CaptainAnswer')?.textContent||'';
        }catch(_error){}
      }
      answer.textContent=result||'Deze vraag kan ik nog niet uit de beschikbare gegevens beantwoorden.';
      answer.classList.remove('thinking');
    },240);
  }

  function updateContext(){
    const context=contextState();
    const automatic=getAutomaticState();
    if($('ms760ContextBadge'))$('ms760ContextBadge').textContent=context.badge;
    if($('ms760ContextTitle'))$('ms760ContextTitle').textContent=context.title;
    if($('ms760ContextSubtitle'))$('ms760ContextSubtitle').textContent=context.subtitle;
    if($('ms760ContextActions'))$('ms760ContextActions').innerHTML=context.actions.map(actionButton).join('');
    const toggle=$('ms760AutoToggle');
    if(toggle){
      toggle.textContent=automatic?.busy?'Even…':automatic?.enabled?'Auto aan':'Auto uit';
      toggle.classList.toggle('is-on',Boolean(automatic?.enabled));
      toggle.setAttribute('aria-pressed',String(Boolean(automatic?.enabled)));
      toggle.disabled=Boolean(automatic?.busy);
    }
  }

  function updateStatus(){
    const strip=$('ms760StatusStrip');
    if(!strip)return;
    strip.innerHTML=statusItems().map(item=>`
      <button type="button" class="ms760-status-chip ${item.level||''}" data-ms760-route="${
        item.label==='Wind'?'weather':item.label==='Verbinding'?'entertainment':'technical'
      }">
        <span class="icon" aria-hidden="true">${item.icon}</span>
        <span><strong>${escapeHtml(item.value)}</strong><small>${escapeHtml(item.label)}</small></span>
      </button>
    `).join('');
  }

  function favoritePois(){
    const pois=getPois();
    let favorites=[];
    try{
      if(typeof isFavoritePoi==='function')favorites=pois.filter(isFavoritePoi);
    }catch(_error){}
    if(!favorites.length)favorites=pois.slice(0,4);
    return favorites.slice(0,6);
  }

  function updateHarbours(){
    const section=$('ms760HarbourSection');
    const row=$('ms760HarbourRow');
    if(!section||!row)return;
    const pois=favoritePois();
    section.classList.toggle('hidden',!pois.length);
    if(!pois.length){row.innerHTML='';lastHarbourSignature='';return;}
    const photoCache=getPoiPhotos();
    const signature=pois.map(poi=>`${poi.id}:${safeArray(photoCache?.[poi.id])[0]?.storage_path||''}:${poi.name||''}`).join('|');
    if(signature===lastHarbourSignature)return;
    lastHarbourSignature=signature;
    row.innerHTML=pois.map(poi=>{
      const photo=safeArray(photoCache?.[poi.id])[0];
      const photoHtml=photo?.storage_path
        ?`<img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" class="ms760-harbour-photo storage-safe-image" loading="lazy" decoding="async" data-storage-bucket="poi-photos" data-storage-path="${escapeHtml(photo.storage_path)}" alt="${escapeHtml(poi.name||'Haven')}">`
        :'<div class="ms760-harbour-fallback" aria-hidden="true">⚓</div>';
      return `<button type="button" class="ms760-harbour-card" data-ms760-poi="${escapeHtml(poi.id)}">
        ${photoHtml}<span class="ms760-harbour-shade" aria-hidden="true"></span><span class="ms760-harbour-favourite" aria-hidden="true">⭐</span>
        <span class="ms760-harbour-copy"><strong>${escapeHtml(poi.name||'Haven')}</strong><small>${escapeHtml([poi.place,poi.category].filter(Boolean).join(' · ')||'Bekijk locatie')}</small></span>
      </button>`;
    }).join('');
    try{window.storageSafeObserveImages?.(row);}catch(_error){}
  }

  function latestRouteTrip(){
    return getTrips().find(trip=>{
      try{return Boolean(normaliseRouteGeojson(trip.route_geojson));}catch(_error){return Boolean(trip.route_geojson);}
    })||null;
  }

  function updateLatestTrip(){
    const card=$('ms760LatestTrip');
    if(!card)return;
    const trip=latestRouteTrip();
    card.classList.toggle('hidden',!trip);
    if(!trip){card.innerHTML='';lastLatestTripSignature='';return;}
    const signature=[trip.id,trip.title,trip.trip_date,trip.distance_km,trip.duration_hours,trip.departure,trip.arrival].join('|');
    if(signature===lastLatestTripSignature)return;
    lastLatestTripSignature=signature;
    card.innerHTML=`
      <div><span class="ms760-context-badge">LAATSTE VAART</span><h3>${escapeHtml(trip.title||`${trip.departure||''} → ${trip.arrival||''}`||'Vaartocht')}</h3><p>${escapeHtml(trip.trip_date||'')} · ${nl(trip.distance_km,1)} km · ${formatDuration(trip.duration_hours)}</p></div>
      <button type="button" class="ms760-replay-button" data-ms760-replay="${escapeHtml(trip.id)}">▶ Beleef</button>
    `;
  }

  function updateDashboard(){
    if(!$(DASHBOARD_ID)){if(!buildDashboard())return;}
    updateContext();
    updateStatus();
    updateHarbours();
    updateLatestTrip();
    updateRadioPlayer();
    applyAutomaticTheme(false);
  }

  /* ------------------------- Routebeleving ------------------------- */
  function normaliseRoute(value){
    try{
      if(typeof normaliseRouteGeojson==='function')return normaliseRouteGeojson(value);
    }catch(_error){}
    if(typeof value==='string'){
      try{value=JSON.parse(value);}catch(_error){return null;}
    }
    if(value?.type==='Feature')value=value.geometry;
    if(value?.type==='MultiLineString')value={type:'LineString',coordinates:value.coordinates.flat()};
    return value?.type==='LineString'&&safeArray(value.coordinates).length>=2?value:null;
  }

  function ensureReplayLayer(){
    if($(REPLAY_ID))return;
    const layer=document.createElement('div');
    layer.id=REPLAY_ID;
    layer.className='ms760-replay-layer hidden';
    layer.setAttribute('role','dialog');
    layer.setAttribute('aria-modal','true');
    layer.setAttribute('aria-labelledby','ms760ReplayTitle');
    layer.innerHTML=`
      <div class="ms760-replay-panel" role="document">
        <div class="ms760-replay-head">
          <div><h2 id="ms760ReplayTitle">Vaartocht beleven</h2><p id="ms760ReplaySubtitle">Route wordt geladen…</p></div>
          <button type="button" class="ms760-replay-close" aria-label="Sluiten">×</button>
        </div>
        <div id="ms760ReplayMap" class="ms760-replay-map"></div>
        <div class="ms760-replay-controls">
          <button id="ms760ReplayPlay" type="button" class="ms760-replay-play" aria-label="Afspelen">▶</button>
          <input id="ms760ReplaySlider" class="ms760-replay-slider" type="range" min="0" max="1" step="1" value="0" aria-label="Positie op route">
          <select id="ms760ReplaySpeed" class="ms760-replay-speed" aria-label="Afspeelsnelheid"><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select>
        </div>
        <div id="ms760ReplayStats" class="ms760-replay-stats"></div>
        <div id="ms760ReplayPhotos" class="ms760-replay-photos"></div>
      </div>`;
    document.body.appendChild(layer);
    layer.addEventListener('click',event=>{if(event.target===layer||event.target.closest('.ms760-replay-close'))closeReplay();});
    $('ms760ReplayPlay')?.addEventListener('click',toggleReplay);
    $('ms760ReplaySlider')?.addEventListener('input',event=>setReplayPosition(Number(event.target.value),true));
    $('ms760ReplaySpeed')?.addEventListener('change',event=>{replaySpeed=Math.max(1,Number(event.target.value)||1);if(replayTimer){stopReplayTimer();startReplayTimer();}});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!layer.classList.contains('hidden'))closeReplay();});
  }

  function routeCoordinates(route){
    return safeArray(route?.coordinates)
      .map(point=>[number(point?.[1]),number(point?.[0])])
      .filter(([lat,lon])=>lat!==null&&lon!==null&&Math.abs(lat)<=90&&Math.abs(lon)<=180);
  }

  function openReplay(tripId){
    ensureReplayLayer();
    const trip=getTrips().find(item=>String(item.id)===String(tripId));
    const routeData=normaliseRoute(trip?.route_geojson);
    const coords=routeCoordinates(routeData);
    if(!trip||coords.length<2){toast('Voor deze vaartocht is geen bruikbare route beschikbaar.');return;}
    replayTrip=trip;
    replayCoordinates=coords;
    replayIndex=0;
    stopReplayTimer();
    const layer=$(REPLAY_ID);
    layer?.classList.remove('hidden');
    document.body.classList.add('ms760-replay-open');
    $('ms760ReplayTitle').textContent=trip.title||`${trip.departure||'Vertrek'} → ${trip.arrival||'Aankomst'}`;
    $('ms760ReplaySubtitle').textContent=`${trip.trip_date||''} · ${coords.length} routepunten`;
    const slider=$('ms760ReplaySlider');
    if(slider){slider.max=String(coords.length-1);slider.value='0';}
    $('ms760ReplayStats').innerHTML=[
      ['Afstand',`${nl(trip.distance_km,1)} km`],
      ['Vaartijd',formatDuration(trip.duration_hours)],
      ['Bemanning',text(trip.crew,'–')]
    ].map(([label,value])=>`<div class="ms760-replay-stat"><strong>${escapeHtml(value)}</strong><small>${escapeHtml(label)}</small></div>`).join('');
    const photos=safeArray(getTripPhotos()?.[trip.id]).slice(0,8);
    $('ms760ReplayPhotos').innerHTML=photos.map(photo=>`<img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" class="storage-safe-image" loading="lazy" data-storage-bucket="trip-photos" data-storage-path="${escapeHtml(photo.storage_path)}" alt="${escapeHtml(photo.description||'Routefoto')}">`).join('');
    requestAnimationFrame(()=>drawReplayMap());
    try{window.storageSafeObserveImages?.($('ms760ReplayPhotos'));}catch(_error){}
    haptic(15);
  }

  function drawReplayMap(){
    if(!window.L||!$('ms760ReplayMap'))return;
    if(replayMap){try{replayMap.remove();}catch(_error){}replayMap=null;}
    replayMap=L.map('ms760ReplayMap',{zoomControl:true,attributionControl:true});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(replayMap);
    replayLine=L.polyline(replayCoordinates,{weight:5,opacity:.85}).addTo(replayMap);
    const icon=L.divIcon({className:'',html:'<div style="width:30px;height:30px;border-radius:999px;display:grid;place-items:center;background:#50d0ff;border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.4);font-size:16px">⛵</div>',iconSize:[30,30],iconAnchor:[15,15]});
    replayMarker=L.marker(replayCoordinates[0],{icon,zIndexOffset:1000}).addTo(replayMap);
    replayMap.fitBounds(replayLine.getBounds(),{padding:[25,25],maxZoom:15});
    setTimeout(()=>replayMap?.invalidateSize(),200);
  }

  function setReplayPosition(index,pan=false){
    if(!replayCoordinates.length)return;
    replayIndex=Math.max(0,Math.min(replayCoordinates.length-1,Math.round(index)));
    const coordinate=replayCoordinates[replayIndex];
    replayMarker?.setLatLng(coordinate);
    const slider=$('ms760ReplaySlider');
    if(slider)slider.value=String(replayIndex);
    if(pan&&replayIndex%5===0)replayMap?.panTo(coordinate,{animate:true,duration:.25});
    if(replayIndex>=replayCoordinates.length-1){stopReplayTimer();const play=$('ms760ReplayPlay');if(play)play.textContent='↺';}
  }

  function startReplayTimer(){
    stopReplayTimer();
    const play=$('ms760ReplayPlay');
    if(play)play.textContent='⏸';
    replayTimer=window.setInterval(()=>{
      const step=Math.max(1,replaySpeed);
      if(replayIndex>=replayCoordinates.length-1){stopReplayTimer();return;}
      setReplayPosition(replayIndex+step,true);
    },320);
  }
  function stopReplayTimer(){
    if(replayTimer)clearInterval(replayTimer);
    replayTimer=0;
    const play=$('ms760ReplayPlay');
    if(play&&replayIndex<replayCoordinates.length-1)play.textContent='▶';
  }
  function toggleReplay(){
    if(replayIndex>=replayCoordinates.length-1)setReplayPosition(0,true);
    if(replayTimer)stopReplayTimer();else startReplayTimer();
  }
  function closeReplay(){
    stopReplayTimer();
    $(REPLAY_ID)?.classList.add('hidden');
    document.body.classList.remove('ms760-replay-open');
    if(replayMap){try{replayMap.remove();}catch(_error){}replayMap=null;}
    replayMarker=null;replayLine=null;replayCoordinates=[];replayTrip=null;
  }

  function addReplayButtons(){
    document.querySelectorAll('#tripList details[data-trip-id]').forEach(details=>{
      const id=details.dataset.tripId;
      if(!id||details.querySelector('.ms760-trip-replay-inline'))return;
      const trip=getTrips().find(item=>String(item.id)===String(id));
      if(!normaliseRoute(trip?.route_geojson))return;
      const actions=details.querySelector('.trip-actions');
      if(!actions)return;
      const button=document.createElement('button');
      button.type='button';
      button.className='ms760-trip-replay-inline';
      button.textContent='▶ Beleef vaart';
      button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openReplay(id);});
      actions.insertBefore(button,actions.firstChild);
    });
  }

  function observeLogbook(){
    const list=$('tripList');
    if(!list)return;
    logbookObserver?.disconnect();
    logbookObserver=new MutationObserver(()=>addReplayButtons());
    logbookObserver.observe(list,{childList:true,subtree:true});
    addReplayButtons();
  }

  /* ------------------------- Home Assistant ------------------------- */
  function buildHomeAssistantGroups(){
    const page=$('entertainment');
    if(!page||$('ms760HaGroups'))return;
    const hero=page.querySelector('.entertainment-hero');
    const groups=document.createElement('nav');
    groups.id='ms760HaGroups';
    groups.className='ms760-ha-groups';
    groups.setAttribute('aria-label','Home Assistant-onderdelen');
    groups.innerHTML=[
      ['all','Alles'],['media','📻 Media'],['lights','💡 Verlichting'],['security','📷 Camera'],['scenes','✨ Scènes']
    ].map(([key,label],index)=>`<button type="button" class="ms760-ha-group ${index===0?'active':''}" data-ms760-ha-filter="${key}">${label}</button>`).join('');
    hero?.insertAdjacentElement('afterend',groups);
    groups.addEventListener('click',event=>{
      const button=event.target.closest('[data-ms760-ha-filter]');
      if(!button)return;
      const filter=button.dataset.ms760HaFilter;
      page.dataset.ms760Filter=filter==='all'?'':filter;
      groups.querySelectorAll('.ms760-ha-group').forEach(item=>item.classList.toggle('active',item===button));
      haptic();
    });
  }

  /* ------------------------- Radio mini player ------------------------- */
  function radioConfig(){
    try{return typeof ms712Config==='function'?ms712Config():null;}catch(_error){return null;}
  }
  function radioState(config){
    const player=config?.players?.find(item=>item.key===config.activePlayer)||config?.players?.find(item=>item.entityId);
    const snapshot=safeArray(window.ms730GetStateSnapshot?.());
    const entity=snapshot.find(item=>item.entity_id===player?.entityId)||null;
    return {player,entity};
  }

  function buildRadioPlayer(){
    if($(RADIO_ID))return;
    const player=document.createElement('aside');
    player.id=RADIO_ID;
    player.className='ms760-radio-player hidden';
    player.setAttribute('aria-label','Radio en Sonos');
    player.innerHTML=`
      <div class="ms760-radio-main">
        <button type="button" class="ms760-radio-icon" data-ms760-radio="open" aria-label="Radio openen">📻</button>
        <div class="ms760-radio-copy"><strong id="ms760RadioTitle">Radio</strong><small id="ms760RadioSubtitle">Sonos</small></div>
        <button type="button" class="ms760-radio-control" data-ms760-radio="previous" aria-label="Vorige">⏮</button>
        <button type="button" class="ms760-radio-control" data-ms760-radio="play" aria-label="Afspelen of pauzeren">⏯</button>
        <button type="button" class="ms760-radio-control" data-ms760-radio="next" aria-label="Volgende">⏭</button>
        <button type="button" class="ms760-radio-expand" data-ms760-radio="expand" aria-label="Uitklappen">⌃</button>
      </div>
      <div class="ms760-radio-panel">
        <div class="ms760-radio-volume"><span>🔈</span><input id="ms760RadioVolume" type="range" min="0" max="100" step="1" value="35" aria-label="Radio volume"><strong id="ms760RadioVolumeLabel">35%</strong></div>
        <div id="ms760RadioFavourites" class="ms760-radio-favourites"></div>
      </div>`;
    document.body.appendChild(player);
    player.addEventListener('click',event=>{
      const button=event.target.closest('[data-ms760-radio]');
      if(!button)return;
      const command=button.dataset.ms760Radio;
      haptic();
      if(command==='open'){route('radio');return;}
      if(command==='expand'){player.classList.toggle('expanded');button.textContent=player.classList.contains('expanded')?'⌄':'⌃';return;}
      if(command==='play')window.ms712Command?.('play_pause');
      if(command==='previous')window.ms712Command?.('previous');
      if(command==='next')window.ms712Command?.('next');
    });
    $('ms760RadioVolume')?.addEventListener('input',event=>{
      const value=Math.round(Number(event.target.value)||0);
      if($('ms760RadioVolumeLabel'))$('ms760RadioVolumeLabel').textContent=`${value}%`;
    });
    $('ms760RadioVolume')?.addEventListener('change',event=>{
      const value=Math.max(0,Math.min(100,Number(event.target.value)||0));
      const config=radioConfig();
      window.ms712SendCommand?.('media','volume_set',config?.activePlayer||'',{volume:(value/100).toFixed(2)});
    });
    $('ms760RadioFavourites')?.addEventListener('click',event=>{
      const favourite=event.target.closest('[data-ms760-favourite]');
      if(!favourite)return;
      window.ms712PlayFavorite?.(Number(favourite.dataset.ms760Favourite));
    });
  }

  function openRadioPlayer(expand=false){
    buildRadioPlayer();
    const player=$(RADIO_ID);
    if(expand)player?.classList.add('expanded');
    updateRadioPlayer();
  }

  function updateRadioPlayer(){
    buildRadioPlayer();
    const player=$(RADIO_ID);
    const config=radioConfig();
    const configured=safeArray(config?.players).filter(item=>item.entityId);
    const visible=Boolean(configured.length);
    player?.classList.toggle('hidden',!visible);
    document.body.classList.toggle('ms760-radio-visible',visible);
    if(!visible)return;
    const {player:active,entity}=radioState(config);
    const attrs=entity?.attributes||{};
    const title=attrs.media_title||attrs.media_channel||attrs.friendly_name||active?.name||'Sonos';
    const subtitle=attrs.media_artist||active?.name||'Radio aan boord';
    if($('ms760RadioTitle'))$('ms760RadioTitle').textContent=title;
    if($('ms760RadioSubtitle'))$('ms760RadioSubtitle').textContent=`${subtitle} · ${entity?.state||'gereed'}`;
    const volume=Math.round((number(attrs.volume_level,number(config?.volume,35)/100))*100);
    const input=$('ms760RadioVolume');
    if(input&&!input.matches(':active'))input.value=String(volume);
    if($('ms760RadioVolumeLabel'))$('ms760RadioVolumeLabel').textContent=`${volume}%`;
    const favorites=safeArray(config?.favorites).filter(item=>item.mediaContentId);
    if($('ms760RadioFavourites'))$('ms760RadioFavourites').innerHTML=favorites.length
      ?favorites.map((item,index)=>`<button type="button" class="ms760-radio-favourite" data-ms760-favourite="${index}">▶ ${escapeHtml(item.name)}</button>`).join('')
      :'<small>Voeg radiofavorieten toe bij Home Assistant → Instellen.</small>';
  }

  /* ------------------------- Thema's ------------------------- */
  function storedTheme(){
    try{return localStorage.getItem(THEME_KEY)||'auto';}catch(_error){return'auto';}
  }
  function actualTheme(mode=storedTheme()){
    if(mode!=='auto')return mode;
    const hour=new Date().getHours();
    if(hour>=7&&hour<17)return'day';
    if(hour>=17&&hour<22)return'evening';
    return'night';
  }
  function applyAutomaticTheme(force=true){
    const hour=new Date().getHours();
    if(!force&&lastThemeHour===hour)return;
    lastThemeHour=hour;
    const mode=storedTheme();
    document.body.dataset.ms760Theme=actualTheme(mode);
    document.querySelectorAll('.ms760-theme-button').forEach(button=>button.classList.toggle('active',button.dataset.ms760Theme===mode));
  }
  function setTheme(mode){
    try{localStorage.setItem(THEME_KEY,mode);}catch(_error){}
    applyAutomaticTheme(true);
    haptic();
  }
  function injectThemeSetting(){
    const panel=document.querySelector('.ms750-more-panel');
    if(!panel||$('ms760ThemeSetting'))return;
    const setting=document.createElement('div');
    setting.id='ms760ThemeSetting';
    setting.className='ms760-theme-setting';
    setting.innerHTML=`<strong>Weergave</strong><div class="ms760-theme-buttons">
      <button type="button" class="ms760-theme-button" data-ms760-theme="auto">Automatisch</button>
      <button type="button" class="ms760-theme-button" data-ms760-theme="day">Dag</button>
      <button type="button" class="ms760-theme-button" data-ms760-theme="evening">Avond</button>
      <button type="button" class="ms760-theme-button" data-ms760-theme="night">Nachtvaren</button>
    </div>`;
    panel.appendChild(setting);
    setting.addEventListener('click',event=>{
      const button=event.target.closest('[data-ms760-theme]');
      if(button)setTheme(button.dataset.ms760Theme);
    });
    applyAutomaticTheme(true);
  }

  function exposeHaSnapshot(){
    /* De live bridge van 7.11.0 exposeert dit zelf. Deze fallback houdt
       de minispeler bruikbaar wanneer de bridge iets later initialiseert. */
    if(typeof window.ms730GetStateSnapshot!=='function')window.ms730GetStateSnapshot=()=>[];
  }

  function installGlobalInteraction(){
    document.addEventListener('click',event=>{
      if(event.target.closest('.ms760-dashboard button,.ms760-radio-player button,.ms760-ha-groups button,.ms760-replay-layer button'))haptic();
    },{passive:true});
    window.addEventListener('online',updateDashboard);
    window.addEventListener('offline',updateDashboard);
    window.addEventListener('mijnserenity-ha-connected',()=>setTimeout(updateDashboard,250));
    window.addEventListener('mijnserenity-ha-state-updated',updateRadioPlayer);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')updateDashboard();});
  }

  function boot(){
    document.body.classList.add('ms760-captain-experience');
    exposeHaSnapshot();
    buildDashboard();
    buildHomeAssistantGroups();
    buildRadioPlayer();
    injectThemeSetting();
    ensureReplayLayer();
    observeLogbook();
    installGlobalInteraction();
    applyAutomaticTheme(true);
    updateDashboard();
    setTimeout(()=>{
      try{
        const request=window.ms730RefreshStateSnapshot?.();
        request?.catch?.(()=>{});
      }catch(_error){}
    },1200);
    clearInterval(updateTimer);
    updateTimer=setInterval(()=>{
      buildDashboard();
      buildHomeAssistantGroups();
      injectThemeSetting();
      observeLogbook();
      addReplayButtons();
      updateDashboard();
    },UPDATE_MS);
    window.ms760OpenReplay=openReplay;
    window.ms760CloseReplay=closeReplay;
    window.ms760OpenRadio=()=>openRadioPlayer(true);
    window.ms760UpdateDashboard=updateDashboard;
    console.info(`MijnSerenity ${BUILD}: Captain Experience actief.`);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
