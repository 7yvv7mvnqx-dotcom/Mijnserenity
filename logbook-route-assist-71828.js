/* MijnSerenity 7.18.28 — logboek route-assistent
   - vertrek/aankomst suggesties tijdens typen
   - huidige locatie als vertrek
   - waterwegroute via bestaande BRouter proxy
   - automatische afstand/vaartijd
   - duidelijk geschat en werkelijk brandstofverbruik
*/
(()=>{
  'use strict';

  const VERSION='7.18.28';
  const ids={
    from:'tripFrom',
    to:'tripTo',
    distance:'tripDistance',
    hours:'tripHours',
    liters:'tripFuelLiters',
    cost:'tripFuelCost',
    fuelPreview:'fuelPreview'
  };

  let suggestionBox=null;
  let suggestionOwner=null;
  let suggestionAbort=null;
  let suggestionTimer=null;
  let lastRoute=null;
  let routeMap=null;
  let routeMapLayer=null;
  const searchCache=new Map();

  const byId=id=>document.getElementById(id);
  const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
  const num=value=>{
    const n=Number(String(value??'').replace(',','.'));
    return Number.isFinite(n)?n:null;
  };
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  function injectStyles(){
    if(document.getElementById('msTripRouteAssistStyles'))return;
    const style=document.createElement('style');
    style.id='msTripRouteAssistStyles';
    style.textContent=`
      .ms-trip-assist-actions{
        display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0 2px;
      }
      .ms-trip-assist-btn{
        min-height:46px;border:1px solid rgba(113,210,255,.38);border-radius:14px;
        background:rgba(8,34,50,.92);color:#f6fbff;font:inherit;font-weight:800;
        padding:10px 12px;touch-action:manipulation;
      }
      .ms-trip-assist-btn:active{transform:translateY(1px)}
      .ms-trip-assist-btn[disabled]{opacity:.55}
      .ms-trip-route-status,.ms-trip-fuel-detail,.ms-trip-time-warning{
        margin:10px 0 0;border-radius:14px;padding:11px 13px;
        background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.09);
        color:#bdd3df;font-size:.92rem;line-height:1.35;
      }
      .ms-trip-route-status[data-state="ok"]{border-color:rgba(73,220,155,.34);color:#d8ffec}
      .ms-trip-route-status[data-state="error"]{border-color:rgba(255,106,106,.4);color:#ffd9d9}
      .ms-trip-route-status[data-state="busy"]{border-color:rgba(113,210,255,.34);color:#d9f5ff}
      .ms-trip-time-warning{border-color:rgba(255,193,92,.42);color:#ffe0a8}
      .ms-trip-time-warning button{
        margin-top:8px;width:100%;min-height:40px;border:1px solid rgba(255,193,92,.55);
        border-radius:11px;background:rgba(255,193,92,.12);color:#fff;font:inherit;font-weight:800;
      }
      #msTripSuggestionBox{
        position:fixed;z-index:2147483000;display:none;overflow:auto;
        max-height:min(42vh,360px);border:1px solid rgba(113,210,255,.38);
        border-radius:14px;background:#071b29;box-shadow:0 18px 44px rgba(0,0,0,.42);
      }
      #msTripSuggestionBox button{
        display:block;width:100%;border:0;border-bottom:1px solid rgba(255,255,255,.08);
        background:transparent;color:#f5fbff;text-align:left;padding:12px 14px;
        font:inherit;line-height:1.25;
      }
      #msTripSuggestionBox button:last-child{border-bottom:0}
      #msTripSuggestionBox .ms-suggest-title{display:block;font-weight:850}
      #msTripSuggestionBox .ms-suggest-sub{display:block;margin-top:3px;color:#9eb7c5;font-size:.82em}
      #msTripSuggestionBox .ms-suggest-source{opacity:.72;font-size:.76em}
      .ms-trip-route-modal{
        position:fixed;inset:0;z-index:2147482500;background:rgba(0,12,20,.78);
        display:flex;align-items:flex-end;justify-content:center;padding:12px;
      }
      .ms-trip-route-modal.hidden{display:none}
      .ms-trip-route-sheet{
        width:min(760px,100%);height:min(74vh,680px);border-radius:22px 22px 16px 16px;
        background:#071b29;border:1px solid rgba(113,210,255,.32);overflow:hidden;
        display:grid;grid-template-rows:auto 1fr;
      }
      .ms-trip-route-head{
        display:flex;align-items:center;gap:10px;padding:12px 14px;color:#fff;font-weight:850;
      }
      .ms-trip-route-head span{flex:1}
      .ms-trip-route-head button{
        border:1px solid rgba(255,255,255,.18);border-radius:10px;background:rgba(255,255,255,.08);
        color:#fff;min-width:42px;min-height:38px;font:inherit;
      }
      #msTripRouteMap{min-height:280px;background:#0b2432}
      @media(max-width:520px){
        .ms-trip-assist-actions{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureSuggestionBox(){
    if(suggestionBox)return suggestionBox;
    suggestionBox=document.createElement('div');
    suggestionBox.id='msTripSuggestionBox';
    suggestionBox.setAttribute('role','listbox');
    document.body.appendChild(suggestionBox);
    return suggestionBox;
  }

  function hideSuggestions(){
    if(suggestionBox)suggestionBox.style.display='none';
    suggestionOwner=null;
  }

  function positionSuggestions(input){
    if(!suggestionBox||!input)return;
    const rect=input.getBoundingClientRect();
    const margin=8;
    const width=Math.min(rect.width,window.innerWidth-margin*2);
    suggestionBox.style.left=`${Math.max(margin,Math.min(rect.left,window.innerWidth-width-margin))}px`;
    suggestionBox.style.top=`${Math.min(window.innerHeight-120,rect.bottom+5)}px`;
    suggestionBox.style.width=`${width}px`;
  }

  function pointFromObject(item){
    const lat=num(item?.lat??item?.latitude??item?.y);
    const lon=num(item?.lon??item?.lng??item?.longitude??item?.x);
    return lat!==null&&lon!==null?{lat,lon}:null;
  }

  function localSuggestions(query){
    const q=clean(query).toLocaleLowerCase('nl-NL');
    if(q.length<2)return [];
    const results=[];
    const seen=new Set();

    const add=(label,sub='',point=null,source='MijnSerenity')=>{
      const text=clean(label);
      if(!text||!text.toLocaleLowerCase('nl-NL').includes(q))return;
      const key=text.toLocaleLowerCase('nl-NL');
      if(seen.has(key))return;
      seen.add(key);
      results.push({label:text,sub:clean(sub),point,source});
    };

    try{
      (Array.isArray(poiCache)?poiCache:[]).forEach(poi=>{
        const point=pointFromObject(poi);
        add(poi?.name,poi?.place||poi?.address,point,'Favorieten/POI');
        add(poi?.place,poi?.name||poi?.address,point,'Plaats');
      });
    }catch{}

    try{
      (Array.isArray(tripCache)?tripCache:[]).forEach(trip=>{
        add(trip?.departure,trip?.trip_date||'',null,'Eerder vertrek');
        add(trip?.arrival,trip?.trip_date||'',null,'Eerdere aankomst');
      });
    }catch{}

    return results.slice(0,6);
  }

  function nominatimLabel(item){
    const address=item?.address||{};
    const primary=clean(
      item?.namedetails?.name||
      item?.name||
      address.marina||
      address.lock||
      address.waterway||
      address.city||
      address.town||
      address.village||
      address.hamlet||
      item?.display_name
    );
    const display=clean(item?.display_name);
    const sub=display&&display!==primary?display:'';
    return {primary,sub};
  }

  async function geocode(query,limit=6,signal=null){
    const q=clean(query);
    if(q.length<2)return [];
    const key=q.toLocaleLowerCase('nl-NL');
    if(searchCache.has(key))return searchCache.get(key).slice(0,limit);

    const url=new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format','jsonv2');
    url.searchParams.set('q',q);
    url.searchParams.set('limit',String(Math.max(limit,6)));
    url.searchParams.set('addressdetails','1');
    url.searchParams.set('namedetails','1');
    url.searchParams.set('accept-language','nl');
    url.searchParams.set('countrycodes','nl,de,be');

    const response=await fetch(url,{signal,headers:{accept:'application/json'}});
    if(!response.ok)throw new Error(`Locatie zoeken: HTTP ${response.status}`);
    const data=await response.json();
    const results=(Array.isArray(data)?data:[]).map(item=>{
      const label=nominatimLabel(item);
      return {
        label:label.primary,
        sub:label.sub,
        point:{lat:Number(item.lat),lon:Number(item.lon)},
        source:'OpenStreetMap'
      };
    }).filter(item=>item.label&&Number.isFinite(item.point.lat)&&Number.isFinite(item.point.lon));

    searchCache.set(key,results);
    return results.slice(0,limit);
  }

  function renderSuggestions(input,items){
    if(!input||document.activeElement!==input)return;
    const box=ensureSuggestionBox();
    const dedup=[];
    const seen=new Set();

    items.forEach(item=>{
      const key=clean(item?.label).toLocaleLowerCase('nl-NL');
      if(!key||seen.has(key))return;
      seen.add(key);
      dedup.push(item);
    });

    if(!dedup.length){hideSuggestions();return}

    suggestionOwner=input;
    box.innerHTML=dedup.slice(0,8).map((item,index)=>`
      <button type="button" role="option" data-ms-suggest-index="${index}">
        <span class="ms-suggest-title">${esc(item.label)}</span>
        ${item.sub?`<span class="ms-suggest-sub">${esc(item.sub)}</span>`:''}
        <span class="ms-suggest-source">${esc(item.source||'Locatie')}</span>
      </button>
    `).join('');
    box.style.display='block';
    positionSuggestions(input);

    [...box.querySelectorAll('[data-ms-suggest-index]')].forEach((button,index)=>{
      button.addEventListener('pointerdown',event=>event.preventDefault());
      button.addEventListener('click',()=>{
        const item=dedup[index];
        input.value=item.label;
        input.dataset.msSelectedLabel=item.label;
        if(item.point){
          input.dataset.msLat=String(item.point.lat);
          input.dataset.msLon=String(item.point.lon);
        }else{
          delete input.dataset.msLat;
          delete input.dataset.msLon;
        }
        input.dispatchEvent(new Event('input',{bubbles:true}));
        input.dispatchEvent(new Event('change',{bubbles:true}));
        hideSuggestions();
      });
    });
  }

  function scheduleSuggestions(input){
    clearTimeout(suggestionTimer);
    if(suggestionAbort){
      try{suggestionAbort.abort()}catch{}
      suggestionAbort=null;
    }
    const query=clean(input.value);
    if(query.length<2){hideSuggestions();return}

    const locals=localSuggestions(query);
    renderSuggestions(input,locals);

    suggestionTimer=setTimeout(async()=>{
      const controller=new AbortController();
      suggestionAbort=controller;
      try{
        const online=await geocode(query,8,controller.signal);
        if(clean(input.value)!==query)return;
        renderSuggestions(input,[...locals,...online]);
      }catch(error){
        if(error?.name!=='AbortError')console.warn('Logboek locatie-suggesties:',error);
      }finally{
        if(suggestionAbort===controller)suggestionAbort=null;
      }
    },650);
  }

  function setupAutocomplete(input){
    if(!input||input.dataset.msTripAutocomplete==='1')return;
    input.dataset.msTripAutocomplete='1';
    input.autocomplete='off';
    input.setAttribute('autocapitalize','words');

    input.addEventListener('input',()=>{
      const selected=clean(input.dataset.msSelectedLabel);
      if(selected&&selected!==clean(input.value)){
        delete input.dataset.msLat;
        delete input.dataset.msLon;
        delete input.dataset.msSelectedLabel;
      }
      scheduleSuggestions(input);
    });
    input.addEventListener('focus',()=>scheduleSuggestions(input));
    input.addEventListener('keydown',event=>{
      if(event.key==='Escape')hideSuggestions();
    });
  }

  async function reverseGeocode(point){
    const url=new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format','jsonv2');
    url.searchParams.set('lat',String(point.lat));
    url.searchParams.set('lon',String(point.lon));
    url.searchParams.set('zoom','18');
    url.searchParams.set('addressdetails','1');
    url.searchParams.set('namedetails','1');
    url.searchParams.set('accept-language','nl');
    const response=await fetch(url,{headers:{accept:'application/json'}});
    if(!response.ok)throw new Error(`Locatie bepalen: HTTP ${response.status}`);
    const data=await response.json();
    const label=nominatimLabel(data);
    return {
      label:label.primary||'Huidige locatie',
      sub:label.sub||clean(data?.display_name),
      point
    };
  }

  function currentPosition(options={}){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation){
        reject(new Error('Locatiebepaling wordt op dit apparaat niet ondersteund.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        position=>resolve({
          lat:position.coords.latitude,
          lon:position.coords.longitude,
          accuracy:position.coords.accuracy
        }),
        error=>{
          const messages={
            1:'Locatietoegang is niet toegestaan. Geef MijnSerenity toegang tot je locatie.',
            2:'Je huidige locatie kon niet worden bepaald.',
            3:'Locatie bepalen duurde te lang.'
          };
          reject(new Error(messages[error.code]||'Locatie bepalen is mislukt.'));
        },
        {enableHighAccuracy:true,timeout:12000,maximumAge:30000,...options}
      );
    });
  }

  function dispatchValue(input,value){
    if(!input)return;
    input.value=value;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function setRouteStatus(message,state=''){
    const el=byId('msTripRouteStatus');
    if(!el)return;
    el.textContent=message||'';
    el.dataset.state=state||'';
  }

  async function useCurrentLocation(){
    const button=byId('msTripUseLocation');
    const input=byId(ids.from);
    if(!input)return;
    const old=button?.textContent;
    if(button){button.disabled=true;button.textContent='📍 Locatie bepalen…'}
    setRouteStatus('GPS-locatie wordt bepaald…','busy');
    try{
      const point=await currentPosition();
      let label='Huidige locatie';
      try{
        const place=await reverseGeocode(point);
        label=place.label||label;
      }catch{}
      input.value=label;
      input.dataset.msLat=String(point.lat);
      input.dataset.msLon=String(point.lon);
      input.dataset.msSelectedLabel=label;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
      setRouteStatus(
        `Vertrekpunt bepaald via GPS${Number.isFinite(point.accuracy)?` (±${Math.round(point.accuracy)} m)`:''}.`,
        'ok'
      );
    }catch(error){
      setRouteStatus(error?.message||'Locatie bepalen is mislukt.','error');
    }finally{
      if(button){button.disabled=false;button.textContent=old||'📍 Huidige locatie'}
    }
  }

  async function resolveInputPoint(input){
    const lat=num(input?.dataset?.msLat);
    const lon=num(input?.dataset?.msLon);
    if(lat!==null&&lon!==null)return {lat,lon,label:clean(input.value)};
    const query=clean(input?.value);
    if(query.length<2)throw new Error('Vul vertrek en aankomst in.');
    const result=(await geocode(query,1))[0];
    if(!result)throw new Error(`Geen locatie gevonden voor “${query}”. Kies een suggestie.`);
    input.dataset.msLat=String(result.point.lat);
    input.dataset.msLon=String(result.point.lon);
    input.dataset.msSelectedLabel=result.label;
    return {...result.point,label:result.label};
  }

  function lineStrings(payload){
    const lines=[];
    const addGeometry=geometry=>{
      if(!geometry)return;
      if(geometry.type==='LineString'&&Array.isArray(geometry.coordinates)){
        lines.push(geometry.coordinates);
      }else if(geometry.type==='MultiLineString'&&Array.isArray(geometry.coordinates)){
        geometry.coordinates.forEach(line=>lines.push(line));
      }
    };
    if(payload?.type==='FeatureCollection'){
      (payload.features||[]).forEach(feature=>addGeometry(feature?.geometry));
    }else if(payload?.type==='Feature'){
      addGeometry(payload.geometry);
    }else{
      addGeometry(payload);
    }
    return lines.map(line=>line
      .map(c=>[Number(c?.[0]),Number(c?.[1])])
      .filter(c=>Number.isFinite(c[0])&&Number.isFinite(c[1]))
    ).filter(line=>line.length>=2);
  }

  function haversineKm(a,b){
    const rad=v=>v*Math.PI/180;
    const r=6371;
    const dLat=rad(b[1]-a[1]);
    const dLon=rad(b[0]-a[0]);
    const lat1=rad(a[1]);
    const lat2=rad(b[1]);
    const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return 2*r*Math.asin(Math.sqrt(h));
  }

  function routeDistanceKm(lines){
    let total=0;
    lines.forEach(line=>{
      for(let i=1;i<line.length;i+=1)total+=haversineKm(line[i-1],line[i]);
    });
    return total;
  }

  async function fetchWaterRoute(from,to){
    const candidates=[
      ['/api/waterway-route','motorboat'],
      ['/api/waterway-route','waterway_nomod'],
      ['/api/waterway-route','river'],
      ['/api/waterway-route-backup','motorboat'],
      ['/api/waterway-route-backup','waterway_nomod'],
      ['/api/waterway-route-backup','river']
    ];

    const attempt=async([endpoint,profile])=>{
      const url=new URL(endpoint,location.origin);
      url.searchParams.set('lonlats',`${from.lon},${from.lat}|${to.lon},${to.lat}`);
      url.searchParams.set('profile',profile);
      url.searchParams.set('alternativeidx','0');
      url.searchParams.set('format','geojson');
      const response=await fetch(url,{headers:{accept:'application/geo+json, application/json'},cache:'no-store'});
      if(!response.ok)throw new Error(`${profile}: HTTP ${response.status}`);
      const payload=await response.json();
      const lines=lineStrings(payload);
      if(!lines.length)throw new Error(`${profile}: geen waterwegroute`);
      const distanceKm=routeDistanceKm(lines);
      if(!Number.isFinite(distanceKm)||distanceKm<=0)throw new Error(`${profile}: ongeldige afstand`);
      return {payload,lines,distanceKm,profile,endpoint};
    };

    if(typeof Promise.any==='function'){
      try{
        return await Promise.any(candidates.map(attempt));
      }catch{
        throw new Error('Geen vaarroute gevonden. Controleer of beide punten aan bevaarbaar water liggen.');
      }
    }

    let lastError=null;
    for(const candidate of candidates){
      try{return await attempt(candidate)}
      catch(error){lastError=error}
    }
    throw lastError||new Error('Geen vaarroute gevonden.');
  }

  function cruiseSpeed(){
    try{
      const planner=num(byId('plannerSpeed')?.value);
      if(planner&&planner>0)return planner;
    }catch{}
    try{
      if(typeof ms705Settings==='function'){
        const speed=num(ms705Settings()?.cruiseSpeed);
        if(speed&&speed>0)return speed;
      }
    }catch{}
    return 9;
  }

  function fuelSettings(){
    let perHour=null;
    let price=null;
    try{
      perHour=num(settingsCache?.fuel_per_hour);
      price=num(settingsCache?.fuel_price);
    }catch{}
    if((!perHour||perHour<=0)&&byId('plannerFuelPerHour'))perHour=num(byId('plannerFuelPerHour').value);
    if((!price||price<=0)&&byId('plannerFuelPrice'))price=num(byId('plannerFuelPrice').value);
    return {
      perHour:perHour&&perHour>0?perHour:null,
      price:price&&price>0?price:null
    };
  }

  function formatDuration(hours){
    if(!Number.isFinite(hours)||hours<0)return '–';
    const minutes=Math.round(hours*60);
    if(minutes<60)return `${minutes} min`;
    const h=Math.floor(minutes/60);
    const m=minutes%60;
    return m?`${h} u ${m} min`:`${h} u`;
  }

  function ensureFuelDetail(){
    const preview=byId(ids.fuelPreview);
    if(!preview)return null;
    let detail=byId('msTripFuelDetail');
    if(!detail){
      detail=document.createElement('div');
      detail.id='msTripFuelDetail';
      detail.className='ms-trip-fuel-detail';
      preview.insertAdjacentElement('afterend',detail);
    }
    return detail;
  }

  function renderFuel(){
    const preview=byId(ids.fuelPreview);
    const detail=ensureFuelDetail();
    if(!preview||!detail)return;

    const hours=num(byId(ids.hours)?.value)||0;
    const distance=num(byId(ids.distance)?.value)||0;
    const actualLiters=num(byId(ids.liters)?.value)||0;
    const actualCost=num(byId(ids.cost)?.value)||0;
    const settings=fuelSettings();

    if(actualLiters>0){
      const parts=[`Werkelijk: ${actualLiters.toFixed(1)} liter`];
      if(actualCost>0)parts.push(`€${actualCost.toFixed(2)}`);
      preview.textContent=parts.join(' · ');

      const metrics=[];
      if(hours>0)metrics.push(`${(actualLiters/hours).toFixed(1)} l/uur`);
      if(distance>0)metrics.push(`${(actualLiters/distance).toFixed(2)} l/km`);
      if(actualCost>0)metrics.push(`€${(actualCost/actualLiters).toFixed(2)}/liter`);
      if(hours>0)metrics.push(`vaartijd ${formatDuration(hours)}`);
      detail.textContent=metrics.length
        ?`Brandstofverbruik: ${metrics.join(' · ')}`
        :'Vul afstand en vaartijd in om het werkelijke verbruik te berekenen.';
    }else if(hours>0&&settings.perHour){
      const liters=hours*settings.perHour;
      const cost=settings.price?liters*settings.price:null;
      preview.textContent=`Geschat: ${liters.toFixed(1)} liter${cost!==null?` · €${cost.toFixed(2)}`:''}`;
      detail.textContent=`Verbruik ingesteld op ${settings.perHour.toFixed(1)} l/uur · vaartijd ${formatDuration(hours)}${distance>0?` · ${(liters/distance).toFixed(2)} l/km`:''}.`;
    }else{
      preview.textContent='Vul vaartijd in en stel verbruik/prijs in.';
      detail.textContent='Na het berekenen van de vaarroute worden afstand, vaartijd en geschat brandstofverbruik automatisch bijgewerkt.';
    }

    renderTimeWarning(hours);
  }

  function renderTimeWarning(hours){
    let warning=byId('msTripTimeWarning');
    const anchor=byId('msTripFuelDetail');
    if(!anchor)return;
    const distance=num(byId(ids.distance)?.value)||0;
    const suspicious=hours>=12&&(distance<=0||distance<100);
    if(!suspicious){
      warning?.remove();
      return;
    }
    if(!warning){
      warning=document.createElement('div');
      warning.id='msTripTimeWarning';
      warning.className='ms-trip-time-warning';
      anchor.insertAdjacentElement('afterend',warning);
    }
    const minutes=Math.round(hours);
    warning.innerHTML=`<strong>Let op:</strong> ${hours} betekent nu ${hours} uur. Bedoel je ${minutes} minuten?<button type="button">Gebruik ${minutes} minuten</button>`;
    warning.querySelector('button')?.addEventListener('click',()=>{
      dispatchValue(byId(ids.hours),(minutes/60).toFixed(2));
      renderFuel();
    },{once:true});
  }

  function ensureRouteModal(){
    let modal=byId('msTripRouteModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='msTripRouteModal';
    modal.className='ms-trip-route-modal hidden';
    modal.innerHTML=`
      <div class="ms-trip-route-sheet" role="dialog" aria-modal="true" aria-label="Vaarroute">
        <div class="ms-trip-route-head">
          <span id="msTripRouteMapTitle">Vaarroute</span>
          <button type="button" data-ms-close-route aria-label="Sluiten">✕</button>
        </div>
        <div id="msTripRouteMap"></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click',event=>{
      if(event.target===modal||event.target.closest('[data-ms-close-route]'))closeRouteMap();
    });
    return modal;
  }

  function closeRouteMap(){
    byId('msTripRouteModal')?.classList.add('hidden');
  }

  function showRouteMap(){
    if(!lastRoute)return;
    const modal=ensureRouteModal();
    modal.classList.remove('hidden');
    const title=byId('msTripRouteMapTitle');
    if(title)title.textContent=`${lastRoute.from.label} → ${lastRoute.to.label}`;

    setTimeout(()=>{
      if(!window.L){
        const mapEl=byId('msTripRouteMap');
        if(mapEl)mapEl.innerHTML='<div style="padding:20px;color:#fff">Kaartmodule is nog niet geladen. De routeafstand is wel berekend.</div>';
        return;
      }
      if(!routeMap){
        routeMap=L.map('msTripRouteMap',{zoomControl:true});
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
          maxZoom:19,
          attribution:'© OpenStreetMap'
        }).addTo(routeMap);
      }
      if(routeMapLayer){
        try{routeMapLayer.remove()}catch{}
      }
      const group=L.featureGroup();
      lastRoute.lines.forEach(line=>{
        const latLngs=line.map(coord=>[coord[1],coord[0]]);
        L.polyline(latLngs,{weight:5,opacity:.9}).addTo(group);
      });
      L.marker([lastRoute.from.lat,lastRoute.from.lon]).bindTooltip('Vertrek').addTo(group);
      L.marker([lastRoute.to.lat,lastRoute.to.lon]).bindTooltip('Aankomst').addTo(group);
      group.addTo(routeMap);
      routeMapLayer=group;
      routeMap.fitBounds(group.getBounds().pad(.08));
      setTimeout(()=>routeMap.invalidateSize(),80);
    },60);
  }

  async function calculateRoute(){
    const button=byId('msTripCalculateRoute');
    const old=button?.textContent;
    if(button){button.disabled=true;button.textContent='🧭 Route berekenen…'}
    hideSuggestions();
    setRouteStatus('Vertrek en aankomst worden gekoppeld aan de waterweg…','busy');

    try{
      const from=await resolveInputPoint(byId(ids.from));
      const to=await resolveInputPoint(byId(ids.to));
      setRouteStatus('Vaarroute over het water wordt berekend…','busy');
      const route=await fetchWaterRoute(from,to);
      const speed=cruiseSpeed();
      const hours=route.distanceKm/speed;

      dispatchValue(byId(ids.distance),route.distanceKm.toFixed(1));
      dispatchValue(byId(ids.hours),hours.toFixed(2));

      lastRoute={...route,from,to,speed,hours,createdAt:new Date().toISOString()};
      window.__msLastLogbookRoute=lastRoute;

      const fuel=fuelSettings();
      const liters=fuel.perHour?hours*fuel.perHour:null;
      setRouteStatus(
        `Vaarroute klaar: ${route.distanceKm.toFixed(1)} km · ±${formatDuration(hours)} bij ${speed.toFixed(1)} km/u${liters!==null?` · geschat ${liters.toFixed(1)} liter`:''}.`,
        'ok'
      );
      const mapButton=byId('msTripShowRoute');
      if(mapButton)mapButton.hidden=false;
      renderFuel();

      try{
        if(typeof showAppToast==='function')showAppToast('Vaarroute en brandstofberekening bijgewerkt ✅');
      }catch{}
    }catch(error){
      console.error('Logboek vaarroute:',error);
      setRouteStatus(error?.message||'Vaarroute berekenen is mislukt.','error');
    }finally{
      if(button){button.disabled=false;button.textContent=old||'🧭 Vaarroute berekenen'}
    }
  }

  function ensureControls(){
    const from=byId(ids.from);
    const to=byId(ids.to);
    if(!from||!to)return false;

    setupAutocomplete(from);
    setupAutocomplete(to);

    const hoursInput=byId(ids.hours);
    if(hoursInput){
      hoursInput.step='0.01';
      hoursInput.inputMode='decimal';
      hoursInput.placeholder='bijv. 0,75 voor 45 min';
      hoursInput.title='Vaartijd in uren. 45 minuten = 0,75 uur.';
    }

    if(!byId('msTripRouteActions')){
      const actions=document.createElement('div');
      actions.id='msTripRouteActions';
      actions.className='ms-trip-assist-actions';
      actions.innerHTML=`
        <button id="msTripUseLocation" class="ms-trip-assist-btn" type="button">📍 Huidige locatie</button>
        <button id="msTripCalculateRoute" class="ms-trip-assist-btn" type="button">🧭 Vaarroute berekenen</button>
        <button id="msTripShowRoute" class="ms-trip-assist-btn" type="button" hidden>🗺️ Route op kaart</button>
      `;
      const anchor=to.closest('label')||to;
      anchor.insertAdjacentElement('afterend',actions);

      const status=document.createElement('div');
      status.id='msTripRouteStatus';
      status.className='ms-trip-route-status';
      status.textContent='Typ bij vertrek of aankomst om locaties te zoeken.';
      actions.insertAdjacentElement('afterend',status);

      byId('msTripUseLocation')?.addEventListener('click',useCurrentLocation);
      byId('msTripCalculateRoute')?.addEventListener('click',calculateRoute);
      byId('msTripShowRoute')?.addEventListener('click',showRouteMap);
    }

    [ids.distance,ids.hours,ids.liters,ids.cost].forEach(id=>{
      const input=byId(id);
      if(!input||input.dataset.msTripFuelWatch==='1')return;
      input.dataset.msTripFuelWatch='1';
      input.addEventListener('input',()=>setTimeout(renderFuel,0));
      input.addEventListener('change',()=>setTimeout(renderFuel,0));
    });

    renderFuel();
    return true;
  }

  function init(){
    injectStyles();
    ensureSuggestionBox();
    if(!ensureControls()){
      let tries=0;
      const timer=setInterval(()=>{
        tries+=1;
        if(ensureControls()||tries>=40)clearInterval(timer);
      },250);
    }

    try{
      const original=window.previewFuelCalculation;
      if(typeof original==='function'&&!original.__msTripRouteWrapped){
        const wrapped=function(...args){
          const result=original.apply(this,args);
          setTimeout(renderFuel,0);
          return result;
        };
        wrapped.__msTripRouteWrapped=true;
        window.previewFuelCalculation=wrapped;
      }
    }catch{}

    document.addEventListener('pointerdown',event=>{
      if(!suggestionBox||suggestionBox.style.display==='none')return;
      if(event.target===suggestionOwner||suggestionBox.contains(event.target))return;
      hideSuggestions();
    });
    window.addEventListener('resize',()=>suggestionOwner&&positionSuggestions(suggestionOwner),{passive:true});
    window.addEventListener('scroll',()=>suggestionOwner&&positionSuggestions(suggestionOwner),{passive:true,capture:true});

    console.info(`MijnSerenity ${VERSION}: logboek route-assistent actief.`);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
