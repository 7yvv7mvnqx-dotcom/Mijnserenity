/* MijnSerenity 7.10.2 — actuele vaarwegberichten rond Serenity via EuRIS/Rijkswaterstaat */
(()=>{
  'use strict';

  const BUILD='7.10.2';
  const API_URL='/api/euris-nts';
  const DIRECT_API='https://www.eurisportal.eu/api/v3/nts';
  const RADIUS_KEY='mijnserenity-rws-radius-km';
  const SEEN_KEY='mijnserenity-rws-seen-v1';
  const CACHE_KEY='mijnserenity-rws-cache-v1';
  const POSITION_KEY='mijnserenity-ais-last-position';
  const REFRESH_MS=5*60*1000;
  const BACKGROUND_MS=15*60*1000;
  const MAX_ITEMS=80;

  let initialised=false;
  let busy=false;
  let timer=null;
  let notices=[];
  let activeFilter='all';
  let lastPosition=null;
  let lastFetchAt=0;

  const $=id=>document.getElementById(id);
  const finite=value=>Number.isFinite(Number(value));
  const escapeHtml=value=>String(value??'')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#39;');

  function radius(){
    const saved=Number(localStorage.getItem(RADIUS_KEY));
    return [5,10,20,30,50].includes(saved)?saved:20;
  }

  function formatTime(value){
    const date=new Date(value);
    if(!Number.isFinite(date.getTime()))return 'onbekend';
    return date.toLocaleString('nl-NL',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  }

  function haversine(a,b){
    const R=6371;
    const toRad=value=>value*Math.PI/180;
    const dLat=toRad(b.lat-a.lat);
    const dLon=toRad(b.lon-a.lon);
    const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.sqrt(x));
  }

  function cachedPosition(){
    try{
      const raw=JSON.parse(localStorage.getItem(POSITION_KEY)||'null');
      if(!finite(raw?.lat)||!finite(raw?.lon))return null;
      if(Date.now()-Number(raw.timestamp||0)>24*60*60*1000)return null;
      return {lat:Number(raw.lat),lon:Number(raw.lon),accuracy:Number(raw.accuracy)||null,timestamp:Number(raw.timestamp)||Date.now(),source:'Laatst bekende positie'};
    }catch{return null}
  }

  function livePosition(){
    try{
      const point=Array.isArray(window.liveNavState?.points)?window.liveNavState.points.at(-1):null;
      if(!finite(point?.lat)||!finite(point?.lon))return null;
      const timestamp=Number(point.time||point.timestamp)||Date.now();
      if(Date.now()-timestamp>10*60*1000)return null;
      return {lat:Number(point.lat),lon:Number(point.lon),accuracy:Number(window.liveNavState?.accuracy)||null,timestamp,source:'Live GPS Serenity'};
    }catch{return null}
  }

  function browserPosition(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation){reject(new Error('GPS wordt niet ondersteund.'));return}
      navigator.geolocation.getCurrentPosition(
        pos=>resolve({lat:Number(pos.coords.latitude),lon:Number(pos.coords.longitude),accuracy:Number(pos.coords.accuracy)||null,timestamp:Number(pos.timestamp)||Date.now(),source:'Actuele GPS'}),
        reject,
        {enableHighAccuracy:true,maximumAge:15000,timeout:16000}
      );
    });
  }

  async function resolvePosition(force=false){
    const live=livePosition();
    if(live){lastPosition=live;return live}
    const cached=cachedPosition();
    if(cached&&!force){lastPosition=cached;return cached}
    try{
      const current=await browserPosition();
      lastPosition=current;
      try{localStorage.setItem(POSITION_KEY,JSON.stringify(current))}catch{}
      return current;
    }catch(error){
      if(cached){lastPosition=cached;return cached}
      throw error;
    }
  }

  function unwrapItems(payload){
    if(Array.isArray(payload))return payload;
    if(!payload||typeof payload!=='object')return [];
    const candidates=['items','results','data','notices','messages','nts','value'];
    for(const key of candidates){if(Array.isArray(payload[key]))return payload[key]}
    for(const value of Object.values(payload)){if(Array.isArray(value)&&value.some(v=>v&&typeof v==='object'))return value}
    return [];
  }

  function walk(value,visitor,path='',depth=0){
    if(depth>9||value===null||value===undefined)return;
    visitor(value,path);
    if(Array.isArray(value))value.forEach((item,index)=>walk(item,visitor,`${path}[${index}]`,depth+1));
    else if(typeof value==='object')Object.entries(value).forEach(([key,item])=>walk(item,visitor,path?`${path}.${key}`:key,depth+1));
  }

  function coordinatesFrom(value){
    const result=[];
    walk(value,(node)=>{
      if(!node||typeof node!=='object'||Array.isArray(node))return;
      const lat=node.latitude??node.lat??node.y;
      const lon=node.longitude??node.lon??node.lng??node.x;
      if(finite(lat)&&finite(lon)){
        const p={lat:Number(lat),lon:Number(lon)};
        if(Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180)result.push(p);
      }
      if(node.type&&Array.isArray(node.coordinates)){
        const collect=coords=>{
          if(Array.isArray(coords)&&coords.length>=2&&finite(coords[0])&&finite(coords[1])){
            const p={lat:Number(coords[1]),lon:Number(coords[0])};
            if(Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180)result.push(p);
          }else if(Array.isArray(coords))coords.forEach(collect);
        };
        collect(node.coordinates);
      }
    });
    const unique=[];
    const seen=new Set();
    result.forEach(p=>{const key=`${p.lat.toFixed(5)},${p.lon.toFixed(5)}`;if(!seen.has(key)){seen.add(key);unique.push(p)}});
    return unique;
  }

  function findStrings(value,keys){
    const found=[];
    walk(value,(node,path)=>{
      const key=String(path.split('.').at(-1)||'').replace(/\[.*$/,'').toLowerCase();
      if(!keys.includes(key))return;
      if(typeof node==='string'&&node.trim())found.push(node.trim());
      if(Array.isArray(node))node.filter(v=>typeof v==='string').forEach(v=>found.push(v.trim()));
    });
    return [...new Set(found)].filter(Boolean);
  }

  function pick(value,keys){
    const values=findStrings(value,keys);
    return values.find(v=>v.length>2)||'';
  }

  function deepScalar(value,keys){
    let answer=null;
    walk(value,(node,path)=>{
      if(answer!==null)return;
      const key=String(path.split('.').at(-1)||'').replace(/\[.*$/,'').toLowerCase();
      if(keys.includes(key)&&['string','number'].includes(typeof node))answer=node;
    });
    return answer;
  }

  function allText(value){
    return findStrings(value,[
      'title','subject','description','message','text','remark','remarks','reason','additionalinformation',
      'content','summary','limitation','limitationtext','communication','name','objectname','fairwayname',
      'eventtype','messagetype','type','value','label'
    ]).join(' · ');
  }

  function category(text){
    const t=text.toLowerCase();
    if(/wachttijd|waiting\s*time|delay|vertraging|queue/.test(t))return 'waiting';
    if(/waterstand|water\s*level|hoogwater|laagwater|afvoer|doorvaarthoogte|clearance/.test(t))return 'water';
    if(/sluis|lock|sluice|schut/.test(t))return 'lock';
    if(/brug|bridge|opening/.test(t))return 'bridge';
    return 'general';
  }

  function severity(text){
    const t=text.toLowerCase();
    if(/stremming|gestremd|afgesloten|blockage|blocked|closed|obstru|no\s*service|noserv|calamiteit|gevaar|danger/.test(t))return 'urgent';
    if(/beperking|restriction|wachttijd|waiting|delay|vertraging|werkzaam|maintenance|hoogwater|laagwater|warning|caution/.test(t))return 'warning';
    return 'info';
  }

  function iconFor(type){return ({bridge:'🌉',lock:'🚧',water:'🌊',waiting:'⏱️',general:'📢'})[type]||'📢'}
  function labelFor(type){return ({bridge:'Brug',lock:'Sluis',water:'Waterstand',waiting:'Wachttijd',general:'Vaarwegbericht'})[type]||'Vaarwegbericht'}

  function normalise(raw,index,position){
    const coords=coordinatesFrom(raw);
    if(!coords.length)return null;
    let nearest=null;
    coords.forEach(point=>{
      const distance=haversine(position,point);
      if(!nearest||distance<nearest.distance)nearest={...point,distance};
    });
    if(!nearest)return null;

    const text=allText(raw);
    const title=pick(raw,['title','subject','objectname','name','fairwayname'])||labelFor(category(text));
    const description=pick(raw,['description','message','text','remark','remarks','summary','additionalinformation','limitationtext','reason'])||text||'Actueel bericht voor de scheepvaart.';
    const id=String(deepScalar(raw,['id','messageid','noticeid','number','publicationnumber','uuid'])||`${title}-${nearest.lat.toFixed(5)}-${nearest.lon.toFixed(5)}-${index}`);
    const start=deepScalar(raw,['startdate','startdatetime','validfrom','fromdate','begin','starttime']);
    const end=deepScalar(raw,['enddate','enddatetime','validto','todate','end','endtime']);
    const organisation=pick(raw,['organisation','organization','authority','publisher','source','countrycode']);
    const combined=`${title} ${description} ${text}`;
    return {
      id,title,description,
      type:category(combined),severity:severity(combined),
      distance:nearest.distance,lat:nearest.lat,lon:nearest.lon,
      start,end,organisation,raw
    };
  }

  async function fetchJson(url){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),22000);
    try{
      const response=await fetch(url,{headers:{Accept:'application/json'},cache:'no-store',signal:controller.signal});
      if(!response.ok)throw new Error(`Databron antwoordde met ${response.status}`);
      return await response.json();
    }finally{clearTimeout(timeout)}
  }

  async function loadPayload(){
    try{return await fetchJson(API_URL)}
    catch(firstError){
      console.warn('EuRIS-proxy niet beschikbaar, directe verbinding geprobeerd.',firstError);
      return fetchJson(DIRECT_API);
    }
  }

  function readSeen(){
    try{return new Set(JSON.parse(localStorage.getItem(SEEN_KEY)||'[]'))}
    catch{return new Set()}
  }

  function storeSeen(ids){
    try{localStorage.setItem(SEEN_KEY,JSON.stringify([...ids].slice(-500)))}catch{}
  }

  function cacheNotices(){
    try{localStorage.setItem(CACHE_KEY,JSON.stringify({at:Date.now(),position:lastPosition,notices}))}catch{}
  }

  function readCache(){
    try{
      const value=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
      if(!Array.isArray(value?.notices))return;
      notices=value.notices;
      lastFetchAt=Number(value.at)||0;
      if(value.position)lastPosition=value.position;
    }catch{}
  }

  function notifyNew(items){
    const seen=readSeen();
    const fresh=items.filter(item=>!seen.has(item.id));
    items.forEach(item=>seen.add(item.id));
    storeSeen(seen);
    if(!fresh.length)return;

    const important=fresh.filter(item=>item.severity!=='info');
    if(important.length&&typeof window.showAppToast==='function'){
      window.showAppToast(`${important.length} nieuw vaarwegbericht${important.length===1?'':'en'} binnen ${radius()} km.`);
    }
    if(important.length&&'Notification' in window&&Notification.permission==='granted'){
      const first=important[0];
      try{
        new Notification('Serenity · vaarwegbericht',{body:`${first.title} · ${first.distance.toFixed(1)} km`,icon:'icon-192.png',tag:`rws-${first.id}`});
      }catch{}
    }
  }

  function filtered(){
    return notices.filter(item=>activeFilter==='all'||item.type===activeFilter);
  }

  function noticeLink(item){
    const params=new URLSearchParams({lat:item.lat.toFixed(6),lon:item.lon.toFixed(6)});
    return `https://www.eurisportal.eu/default.aspx?path=Actueel%2FNtSKaart&${params}`;
  }

  function render(){
    const list=$('rwsNoticeList');
    if(!list)return;
    const values=filtered();
    const status=$('rwsStatus');
    const position=$('rwsPosition');
    const updated=$('rwsUpdated');
    const count=$('rwsCount');
    if(status)status.textContent=busy?'Ophalen…':(notices.length?'Actueel':'Geen meldingen');
    if(position)position.textContent=lastPosition?`${lastPosition.lat.toFixed(4)}, ${lastPosition.lon.toFixed(4)}`:'Geen GPS';
    if(updated)updated.textContent=lastFetchAt?formatTime(lastFetchAt):'Nog niet';
    if(count)count.textContent=String(notices.length);

    if(!values.length){
      list.innerHTML=`<div class="rws-empty"><strong>${busy?'Berichten worden opgehaald…':'Geen passende berichten gevonden'}</strong><span>${busy?'Even geduld.':`Er zijn nu geen ${activeFilter==='all'?'actuele meldingen':labelFor(activeFilter).toLowerCase()+'meldingen'} binnen ${radius()} km van Serenity.`}</span></div>`;
    }else{
      list.innerHTML=values.slice(0,MAX_ITEMS).map(item=>`
        <article class="rws-notice severity-${item.severity}" data-id="${escapeHtml(item.id)}" role="button" tabindex="0">
          <div class="rws-notice-icon">${iconFor(item.type)}</div>
          <div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description)}</p>
            <div class="rws-meta">
              <span class="rws-pill">${escapeHtml(labelFor(item.type))}</span>
              <span class="rws-pill">${item.severity==='urgent'?'Urgent':item.severity==='warning'?'Let op':'Informatie'}</span>
              ${item.start?`<span class="rws-pill">Vanaf ${escapeHtml(formatTime(item.start))}</span>`:''}
              ${item.end?`<span class="rws-pill">Tot ${escapeHtml(formatTime(item.end))}</span>`:''}
              ${item.organisation?`<span class="rws-pill">${escapeHtml(item.organisation)}</span>`:''}
            </div>
          </div>
          <div class="rws-distance">${item.distance.toFixed(1)} km</div>
        </article>`).join('');
      list.querySelectorAll('.rws-notice').forEach(card=>{
        const open=()=>{
          const item=notices.find(value=>String(value.id)===card.dataset.id);
          if(item)window.open(noticeLink(item),'_blank','noopener,noreferrer');
        };
        card.addEventListener('click',open);
        card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open()}});
      });
    }

    document.querySelectorAll('.rws-filter').forEach(button=>button.classList.toggle('active',button.dataset.filter===activeFilter));
    renderLivePanel();
    updateBadges();
  }

  function renderLivePanel(){
    const list=$('rwsLiveNoticeList');
    if(!list)return;
    const count=$('rwsLiveCount');
    const status=$('rwsLiveStatus');
    const eyebrow=$('rwsLiveEyebrow');
    if(eyebrow)eyebrow.textContent=`RIJKSWATERSTAAT / EURIS · BINNEN ${radius()} KM`;
    const important=notices.filter(item=>item.severity!=='info').length;
    if(count){
      count.textContent=String(notices.length);
      count.classList.toggle('alert',important>0);
    }
    if(status){
      if(busy)status.textContent='Actuele berichten worden opgehaald…';
      else if(notices.length)status.textContent=`${notices.length} bericht${notices.length===1?'':'en'} binnen ${radius()} km · ${important?important+' met aandacht':'geen urgente hinder'}`;
      else status.textContent=`Geen actuele melding binnen ${radius()} km van Serenity.`;
    }
    const values=notices.slice(0,3);
    if(!values.length){
      list.innerHTML=`<div class="rws-live-empty"><strong>${busy?'Berichten worden gecontroleerd':'Geen actuele hinder gevonden'}</strong><small>${busy?'GPS en vaarweginformatie worden bijgewerkt.':`Binnen ${radius()} km is nu geen passend bericht gevonden.`}</small></div>`;
      return;
    }
    list.innerHTML=values.map(item=>`
      <button type="button" class="rws-live-item ${item.severity}" data-id="${escapeHtml(item.id)}">
        <span class="rws-live-icon">${iconFor(item.type)}</span>
        <span class="rws-live-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.description)}</small></span>
        <span class="rws-live-distance">${item.distance.toFixed(1)} km</span>
      </button>`).join('');
    list.querySelectorAll('.rws-live-item').forEach(button=>button.addEventListener('click',()=>{
      const item=notices.find(value=>String(value.id)===button.dataset.id);
      if(item)window.open(noticeLink(item),'_blank','noopener,noreferrer');
    }));
  }

  function bindLivePanel(){
    const refreshButton=$('rwsLiveRefreshButton');
    if(refreshButton&&!refreshButton.dataset.bound){
      refreshButton.dataset.bound='true';
      refreshButton.addEventListener('click',()=>refresh(false));
    }
    const openButton=$('rwsLiveOpenButton');
    if(openButton&&!openButton.dataset.bound){
      openButton.dataset.bound='true';
      openButton.addEventListener('click',()=>window.ms795OpenRws?.());
    }
  }

  function updateBadges(){
    const important=notices.filter(item=>item.severity!=='info').length;
    const tileBadge=$('rwsDashboardBadge');
    const navBadge=$('rwsNavBadge');
    [tileBadge,navBadge].forEach(badge=>{
      if(!badge)return;
      badge.textContent=String(Math.min(99,important));
      badge.classList.toggle('show',important>0);
    });
    const detail=$('rwsDashboardDetail');
    if(detail)detail.textContent=notices.length?`${notices.length} bericht${notices.length===1?'':'en'} binnen ${radius()} km`:`Geen melding binnen ${radius()} km`;
  }

  async function refresh(forcePosition=false){
    if(busy)return;
    busy=true;
    const button=$('rwsRefreshButton');
    const liveButton=$('rwsLiveRefreshButton');
    if(button)button.disabled=true;
    if(liveButton)liveButton.disabled=true;
    render();
    try{
      const position=await resolvePosition(forcePosition);
      const payload=await loadPayload();
      const rawItems=unwrapItems(payload);
      const limit=radius();
      const local=rawItems
        .map((item,index)=>normalise(item,index,position))
        .filter(Boolean)
        .filter(item=>item.distance<=limit)
        .sort((a,b)=>{
          const severityOrder={urgent:0,warning:1,info:2};
          return severityOrder[a.severity]-severityOrder[b.severity]||a.distance-b.distance;
        });
      notifyNew(local);
      notices=local;
      lastFetchAt=Date.now();
      cacheNotices();
    }catch(error){
      console.error('Vaarwegberichten ophalen mislukt:',error);
      if(typeof window.showAppToast==='function')window.showAppToast('Vaarwegberichten konden niet worden vernieuwd.');
    }finally{
      busy=false;
      if(button)button.disabled=false;
      if(liveButton)liveButton.disabled=false;
      render();
    }
  }

  async function requestNotifications(){
    if(!('Notification' in window)){
      window.showAppToast?.('Webmeldingen worden op dit apparaat niet ondersteund.');
      return;
    }
    try{
      const result=await Notification.requestPermission();
      renderNotificationState();
      if(result==='granted')window.showAppToast?.('Vaarwegmeldingen zijn ingeschakeld zolang MijnSerenity actief is.');
    }catch{window.showAppToast?.('Meldingstoestemming kon niet worden aangevraagd.')}
  }

  function renderNotificationState(){
    const label=$('rwsNotificationLabel');
    const button=$('rwsNotificationButton');
    if(!label||!button)return;
    const supported='Notification' in window;
    const permission=supported?Notification.permission:'unsupported';
    label.textContent=permission==='granted'?'Meldingen toegestaan':permission==='denied'?'Meldingen geblokkeerd':permission==='unsupported'?'Niet ondersteund':'Nog niet toegestaan';
    button.textContent=permission==='granted'?'Meldingen aan':'Meldingen inschakelen';
    button.disabled=permission==='granted'||permission==='denied'||!supported;
  }

  function buildPage(){
    if($('rws'))return;
    const app=$('appView');
    if(!app)return;

    const tabs=app.querySelector(':scope > .tabs');
    if(tabs&&!tabs.querySelector('[data-target="rws"]')){
      const button=document.createElement('button');
      button.className='tab';button.dataset.target='rws';button.textContent='Vaarwegberichten';
      button.onclick=()=>window.ms795OpenRws?.();
      const weather=tabs.querySelector('[data-target="weather"]');
      weather?.insertAdjacentElement('afterend',button)||tabs.appendChild(button);
    }

    const section=document.createElement('section');
    section.id='rws';section.className='hidden';
    section.innerHTML=`
      <div class="rws-page">
        <header class="rws-hero">
          <div><span class="eyebrow">RIJKSWATERSTAAT / EURIS · LIVE POSITIE</span><h1>Berichten rond Serenity</h1><p>Actuele stremmingen, beperkingen, brug- en sluisberichten, waterstanden en wachttijden voor zover de vaarwegbeheerder deze publiceert.</p></div>
          <div class="rws-source-mark"><span>⚓</span>RWS<br>EuRIS</div>
        </header>
        <div class="rws-toolbar">
          <div class="rws-control"><label for="rwsRadius">Straal</label><select id="rwsRadius"><option value="5">5 km</option><option value="10">10 km</option><option value="20">20 km</option><option value="30">30 km</option><option value="50">50 km</option></select></div>
          <button id="rwsGpsButton" class="rws-action" type="button">◎ Nieuwe GPS</button>
          <button id="rwsRefreshButton" class="rws-action primary" type="button">↻ Vernieuwen</button>
        </div>
        <div class="rws-status-grid">
          <div class="rws-stat"><span>Status</span><strong id="rwsStatus">Nog ophalen</strong></div>
          <div class="rws-stat"><span>Berichten</span><strong id="rwsCount">0</strong></div>
          <div class="rws-stat"><span>Positie</span><strong id="rwsPosition">Geen GPS</strong></div>
          <div class="rws-stat"><span>Bijgewerkt</span><strong id="rwsUpdated">Nog niet</strong></div>
        </div>
        <div class="rws-notification-row"><div><strong>Waarschuwing bij nieuwe hinder</strong><small>In-app en als webmelding zolang MijnSerenity actief is. Een gesloten iPhone-app kan zonder pushserver niet betrouwbaar op de achtergrond melden.</small></div><div><span id="rwsNotificationLabel" class="rws-pill">Controleren…</span> <button id="rwsNotificationButton" class="rws-action" type="button">Meldingen inschakelen</button></div></div>
        <div class="rws-filterbar" aria-label="Berichtfilters">
          <button class="rws-filter active" data-filter="all">Alles</button><button class="rws-filter" data-filter="bridge">🌉 Bruggen</button><button class="rws-filter" data-filter="lock">🚧 Sluizen</button><button class="rws-filter" data-filter="water">🌊 Waterstanden</button><button class="rws-filter" data-filter="waiting">⏱️ Wachttijden</button><button class="rws-filter" data-filter="general">📢 Overig</button>
        </div>
        <div id="rwsNoticeList"><div class="rws-empty"><strong>Berichten worden voorbereid</strong><span>Open deze pagina om de actuele positie te controleren.</span></div></div>
        <div class="rws-links">
          <a class="rws-link" href="https://vaarweginformatie.nl/frp/main/#/geo/map" target="_blank" rel="noopener noreferrer"><span>🗺️</span><span>Vaarweginformatie<small>Bruggen, sluizen en officiële berichten</small></span></a>
          <a class="rws-link" href="https://waterinfo.rws.nl/" target="_blank" rel="noopener noreferrer"><span>🌊</span><span>RWS Waterinfo<small>Actuele en verwachte waterstanden</small></span></a>
          <a class="rws-link" href="https://www.eurisportal.eu/default.aspx?path=Actueel%2FNtSKaart" target="_blank" rel="noopener noreferrer"><span>⏱️</span><span>EuRIS actueel<small>Hinder, objectstatus en beschikbare wachttijden</small></span></a>
        </div>
        <p class="rws-footnote">Bron: Notice to Skippers API incorporated from EuRIS (eurisportal.eu), met Nederlandse gegevens van onder andere Rijkswaterstaat en andere vaarwegbeheerders. Controleer voor belangrijke vaarbeslissingen altijd het officiële detailbericht en de verkeersaanwijzingen ter plaatse.</p>
      </div>`;
    const dashboard=$('dashboard');
    dashboard?.insertAdjacentElement('beforebegin',section)||app.appendChild(section);

    const bottom=document.querySelector('.bottom-nav');
    if(bottom&&!bottom.querySelector('[data-target="rws"]')){
      const button=document.createElement('button');
      button.className='bottom-nav-item rws-nav-button';button.dataset.target='rws';button.title='Vaarwegberichten';button.setAttribute('aria-label','Vaarwegberichten');
      button.innerHTML='<span>📢</span><i id="rwsNavBadge" class="rws-nav-badge">0</i>';
      button.onclick=()=>window.ms795OpenRws();
      const weather=bottom.querySelector('[data-target="weather"]');
      weather?.insertAdjacentElement('afterend',button)||bottom.appendChild(button);
    }

    const actions=document.querySelector('#dashboard .dashboard-actions');
    if(actions&&!$('rwsDashboardTile')){
      const tile=document.createElement('button');
      tile.id='rwsDashboardTile';tile.type='button';tile.className='dashboard-tile rws-dashboard-tile';
      tile.innerHTML='<span class="tile-icon-shell"><span class="tile-icon">📢</span></span><span class="tile-copy"><b>Vaarwegberichten</b><small id="rwsDashboardDetail">Nog niet gecontroleerd</small></span><span id="rwsDashboardBadge" class="rws-dashboard-badge">0</span><span class="tile-arrow">›</span>';
      tile.onclick=()=>window.ms795OpenRws();
      const planner=actions.querySelector('[data-route="planner"]');
      planner?.insertAdjacentElement('afterend',tile)||actions.appendChild(tile);
    }

    $('rwsRadius').value=String(radius());
    $('rwsRadius').addEventListener('change',event=>{localStorage.setItem(RADIUS_KEY,String(Number(event.target.value)||20));refresh(false)});
    $('rwsRefreshButton').addEventListener('click',()=>refresh(false));
    $('rwsGpsButton').addEventListener('click',()=>refresh(true));
    $('rwsNotificationButton').addEventListener('click',requestNotifications);
    document.querySelectorAll('.rws-filter').forEach(button=>button.addEventListener('click',()=>{activeFilter=button.dataset.filter||'all';render()}));
    renderNotificationState();
  }

  function schedule(){
    clearInterval(timer);
    timer=setInterval(()=>{
      if(document.visibilityState==='visible')refresh(false);
      else if(Date.now()-lastFetchAt>BACKGROUND_MS)refresh(false);
    },REFRESH_MS);
  }

  function init(){
    buildPage();
    bindLivePanel();
    if(!initialised){readCache();initialised=true;schedule()}
    render();
    if(!lastFetchAt||Date.now()-lastFetchAt>REFRESH_MS)refresh(false);
  }

  window.initRwsPage=init;
  window.ms710GetRwsNotices=()=>notices.map(item=>({...item}));
  window.ms710RefreshRws=()=>refresh(false);
  window.ms795OpenRws=()=>{
    buildPage();
    window.captainNavigate?.('rws');
    setTimeout(init,30);
  };

  function start(){
    buildPage();bindLivePanel();readCache();render();renderLivePanel();updateBadges();schedule();
    window.addEventListener('online',()=>refresh(false));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastFetchAt>REFRESH_MS)refresh(false)});
    console.info(`MijnSerenity ${BUILD} Rijkswaterstaat/EuRIS module actief.`);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
