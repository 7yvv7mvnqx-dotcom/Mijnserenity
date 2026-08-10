(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  let searchController=null;

  function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()}
  function checked(selector){return [...document.querySelectorAll(selector+':checked')].map(x=>x.value)}
  function poiData(){
    if(Array.isArray(window.ms71511OnlinePois)&&window.ms71511OnlinePois.length) return window.ms71511OnlinePois;
    if(Array.isArray(window.pois)) return window.pois;
    if(Array.isArray(window.poiData)) return window.poiData;
    if(Array.isArray(window.poiList)) return window.poiList;
    if(Array.isArray(window.poiCache)&&window.poiCache.length) return window.poiCache;
    try{
      for(const k of ['pois','mijnserenity_pois','ms_pois']){
        const a=JSON.parse(localStorage.getItem(k)||'null');
        if(Array.isArray(a)&&a.length) return a;
      }
    }catch(e){}
    return [];
  }
  function rating(p){return Number(p.rating ?? p.stars ?? p.score ?? p.review_score ?? 0)||0}
  function regionText(p){return norm([p.region,p.province,p.place,p.city,p.address,p.notes].filter(Boolean).join(' '))}
  function typeText(p){return norm(p.category||p.type||p.kind||'')}
  function facilityText(p){
    const bits=[p.facilities,p.amenities,p.features,p.notes,p.description,p.shore_power,p.power,p.electricity,p.shower,p.toilet,p.water,p.wifi,p.restaurant,p.shop,p.fuel,p.laundry,p.accommodation];
    return norm(bits.filter(v=>v!==undefined&&v!==null).map(v=>typeof v==='object'?JSON.stringify(v):v).join(' '));
  }
  function hasFacility(p,f){
    const t=facilityText(p);
    const aliases={
      accommodatie:['accommodatie','hotel','b&b','bed and breakfast','overnachting','chalet','lodging'],
      walstroom:['walstroom','shore power','electricity','stroom','power_supply'],
      douche:['douche','shower'],toilet:['toilet','wc'],water:['drinkwater','drinking_water','water','fresh water'],
      wifi:['wifi','wi-fi','internet'],restaurant:['restaurant','eetcafe','cafe','eten'],winkel:['winkel','shop','supermarket','supermarkt'],
      brandstof:['brandstof','diesel','fuel','fuel:diesel','tankstation'],wasserette:['wasserette','laundry','washing_machine','wasmachine']
    };
    return (aliases[f]||[f]).some(a=>t.includes(norm(a)));
  }
  function activeFilters(){return {regions:checked('#ms71511RegionChips input'),minStars:Number($('ms71511Stars')?.value||0),type:String($('ms71511PoiType')?.value||''),facilities:checked('.ms71511-facility-grid input')}}
  function matches(p,f){
    if(f.regions.length){const rt=regionText(p);if(!f.regions.some(r=>rt.includes(norm(r)))) return false}
    if(f.minStars>0 && rating(p)>0 && rating(p)<f.minStars) return false;
    if(f.type && !typeText(p).includes(norm(f.type))) return false;
    if(f.facilities.length && !f.facilities.every(x=>hasFacility(p,x))) return false;
    return true;
  }
  function setStatus(text){const st=$('ms71511PoiFilterStatus');if(st)st.textContent=text}

  function ensureResults(){
    let box=$('ms71511PoiResults');
    if(box)return box;
    const status=$('ms71511PoiFilterStatus');
    if(!status)return null;
    box=document.createElement('div');
    box.id='ms71511PoiResults';
    box.style.marginTop='14px';
    box.style.display='grid';
    box.style.gap='10px';
    status.insertAdjacentElement('afterend',box);
    return box;
  }
  function distanceKm(a,b,c,d){
    const R=6371,toRad=x=>x*Math.PI/180;
    const x=toRad(c-a),y=toRad(d-b),q=Math.sin(x/2)**2+Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(y/2)**2;
    return 2*R*Math.asin(Math.sqrt(q));
  }
  function category(tags){
    if(tags.leisure==='marina'||tags.harbour) return 'Haven';
    if(tags.amenity==='fuel') return 'Brandstof';
    if(tags.amenity==='restaurant'||tags.amenity==='cafe'||tags.amenity==='fast_food') return 'Restaurant';
    if(tags.shop) return 'Winkel';
    if(tags.tourism==='hotel'||tags.tourism==='hostel'||tags.tourism==='guest_house'||tags.tourism==='camp_site') return 'Accommodatie';
    if(tags.amenity==='shower') return 'Douche';
    if(tags.amenity==='toilets') return 'Toilet';
    if(tags.amenity==='drinking_water') return 'Drinkwater';
    return 'POI';
  }
  function facilities(tags){
    const out=[];
    const truth=v=>['yes','true','1','customers','public','fee'].includes(norm(v));
    if(truth(tags.shower)||tags.amenity==='shower')out.push('douche');
    if(truth(tags.toilets)||tags.amenity==='toilets')out.push('toilet');
    if(truth(tags.drinking_water)||tags.amenity==='drinking_water')out.push('drinkwater');
    if(truth(tags.internet_access)||truth(tags.wifi)||tags.internet_access==='wlan')out.push('wifi');
    if(truth(tags.electricity)||truth(tags.power_supply)||truth(tags['socket:cee_blue']))out.push('walstroom');
    if(tags.amenity==='restaurant'||tags.amenity==='cafe'||tags.amenity==='fast_food')out.push('restaurant');
    if(tags.shop)out.push('winkel');
    if(tags.amenity==='fuel')out.push('brandstof');
    if(tags.shop==='laundry'||tags.amenity==='laundry')out.push('wasserette');
    return out;
  }
  function renderResults(items){
    const box=ensureResults();if(!box)return;
    box.innerHTML='';
    if(!items.length){box.innerHTML='<div class="status small">Geen passende POI’s gevonden. Probeer minder filters of een andere regio.</div>';return}
    items.slice(0,60).forEach(p=>{
      const el=document.createElement('button');
      el.type='button';
      el.style.cssText='width:100%;text-align:left;padding:13px 14px;border-radius:16px;border:1px solid rgba(104,190,232,.25);background:rgba(10,38,56,.78);color:inherit';
      const meta=[p.category,p.distance_km!=null?`${p.distance_km.toFixed(1)} km`:null,p.place].filter(Boolean).join(' · ');
      el.innerHTML=`<strong style="display:block;font-size:16px">${String(p.name||'POI').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</strong><small style="display:block;opacity:.75;margin-top:3px">${meta}</small>`;
      el.onclick=()=>{try{window.open(`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=17/${p.latitude}/${p.longitude}`,'_blank')}catch(e){}};
      box.appendChild(el);
    });
  }

  function getPosition(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation)return reject(new Error('Locatie is niet beschikbaar'));
      navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lon:p.coords.longitude}),reject,{enableHighAccuracy:true,timeout:10000,maximumAge:60000});
    });
  }
  async function geocodeRegion(name,signal){
    const url=`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=nl&q=${encodeURIComponent(name+', Nederland')}`;
    const r=await fetch(url,{headers:{Accept:'application/json'},signal});
    if(!r.ok)throw new Error('Regio kon niet worden gevonden');
    const a=await r.json();if(!a[0])throw new Error('Regio kon niet worden gevonden');
    return {lat:Number(a[0].lat),lon:Number(a[0].lon),name};
  }
  function overpassQuery(lat,lon,radius){
    const around=`around:${radius},${lat},${lon}`;
    return `[out:json][timeout:25];(nwr(${around})["leisure"="marina"];nwr(${around})["harbour"];nwr(${around})["amenity"="fuel"];nwr(${around})["amenity"="restaurant"];nwr(${around})["amenity"="cafe"];nwr(${around})["amenity"="fast_food"];nwr(${around})["amenity"="shower"];nwr(${around})["amenity"="toilets"];nwr(${around})["amenity"="drinking_water"];nwr(${around})["shop"];nwr(${around})["tourism"~"hotel|hostel|guest_house|camp_site"];);out center tags;`;
  }
  async function fetchOverpass(query,signal){
    const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
    let last;
    for(const endpoint of endpoints){
      try{
        const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8',Accept:'application/json'},body:new URLSearchParams({data:query}).toString(),signal});
        if(!r.ok)throw new Error(`zoekdienst ${r.status}`);
        return await r.json();
      }catch(e){if(e.name==='AbortError')throw e;last=e}
    }
    throw last||new Error('POI-zoekdienst niet bereikbaar');
  }
  async function onlineSearch(f){
    searchController?.abort();searchController=new AbortController();const signal=searchController.signal;
    let centers=[];
    if(f.regions.length){
      centers=await Promise.all(f.regions.slice(0,6).map(r=>geocodeRegion(r,signal)));
    }else{
      const pos=await getPosition();centers=[{...pos,name:'huidige locatie'}];
    }
    const all=[];
    for(const center of centers){
      const radius=f.regions.length?45000:25000;
      const data=await fetchOverpass(overpassQuery(center.lat,center.lon,radius),signal);
      for(const e of data.elements||[]){
        const lat=Number(e.lat??e.center?.lat),lon=Number(e.lon??e.center?.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
        const tags=e.tags||{};const name=tags.name||tags.operator||tags.brand||category(tags);
        all.push({id:`osm-${e.type}-${e.id}`,name,latitude:lat,longitude:lon,category:category(tags),type:category(tags),region:center.name,province:center.name,place:tags['addr:city']||tags['addr:place']||tags['addr:village']||'',address:[tags['addr:street'],tags['addr:housenumber']].filter(Boolean).join(' '),facilities:facilities(tags),amenities:tags,distance_km:distanceKm(center.lat,center.lon,lat,lon),rating:0,source:'OpenStreetMap'});
      }
    }
    const unique=[...new Map(all.map(p=>[p.id,p])).values()].sort((a,b)=>a.distance_km-b.distance_km);
    window.ms71511OnlinePois=unique;
    return unique;
  }

  window.ms71511ApplyPoiFilters=async function(){
    const f=activeFilters();
    setStatus('POI’s zoeken…');
    try{
      let data=poiData();
      if(!data.length || Array.isArray(window.ms71511OnlinePois)) data=await onlineSearch(f);
      let filtered=data.filter(p=>matches(p,f));
      if(!filtered.length && !Array.isArray(window.ms71511OnlinePois)){
        data=await onlineSearch(f);filtered=data.filter(p=>matches(p,f));
      }
      window.ms71511FilteredPois=filtered;
      renderResults(filtered);
      const regionTxt=f.regions.length?f.regions.join(', '):'rond huidige locatie';
      setStatus(`${filtered.length} POI’s gevonden · ${regionTxt}${f.facilities.length?' · filters actief':''}.`);
      return filtered;
    }catch(error){
      console.error('POI zoeken mislukt:',error);
      const msg=error?.code===1?'Geef locatietoegang om POI’s in de buurt te zoeken.':(error?.message||'onbekende fout');
      setStatus(`POI zoeken mislukt: ${msg}`);
      renderResults([]);
      return [];
    }
  };

  window.ms71511ShowFilteredPoisOnMap=function(){
    const filtered=window.ms71511FilteredPois||[];
    try{localStorage.setItem('ms71511_map_filter',JSON.stringify(filtered.map(p=>p.id||p.uuid||p.name).filter(Boolean)))}catch(e){}
    if(typeof captainNavigate==='function')captainNavigate('map');
    setTimeout(()=>{try{if(typeof renderMapPois==='function')renderMapPois(filtered);else if(typeof renderPoiMarkers==='function')renderPoiMarkers(filtered);else if(typeof initMap==='function')initMap()}catch(e){}},250);
  };

  window.ms71511ResetPoiFilters=function(){
    document.querySelectorAll('#ms71511RegionChips input,.ms71511-facility-grid input').forEach(x=>x.checked=false);
    if($('ms71511Stars'))$('ms71511Stars').value='0';if($('ms71511PoiType'))$('ms71511PoiType').value='';
    window.ms71511FilteredPois=null;window.ms71511OnlinePois=null;
    const box=$('ms71511PoiResults');if(box)box.innerHTML='';
    setStatus('Filters gewist. Zoek zonder filters voor POI’s rond je huidige locatie.');
  };
})();