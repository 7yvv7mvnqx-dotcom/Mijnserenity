
(function(){
  'use strict';
  const $=id=>document.getElementById(id);

  function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()}
  function checked(selector){return [...document.querySelectorAll(selector+':checked')].map(x=>x.value)}
  function poiData(){
    // Reuse existing in-memory POI data if available.
    if(Array.isArray(window.pois)) return window.pois;
    if(Array.isArray(window.poiData)) return window.poiData;
    if(Array.isArray(window.poiList)) return window.poiList;
    try{
      const candidates=['pois','mijnserenity_pois','ms_pois'];
      for(const k of candidates){
        const a=JSON.parse(localStorage.getItem(k)||'null');
        if(Array.isArray(a)) return a;
      }
    }catch(e){}
    return [];
  }
  function rating(p){
    return Number(p.rating ?? p.stars ?? p.score ?? p.review_score ?? 0) || 0;
  }
  function regionText(p){
    return norm([p.region,p.province,p.place,p.city,p.address,p.notes].filter(Boolean).join(' '));
  }
  function typeText(p){return norm(p.category||p.type||p.kind||'')}
  function facilityText(p){
    const bits=[
      p.facilities,p.amenities,p.features,p.notes,p.description,
      p.shore_power,p.power,p.electricity,p.shower,p.toilet,p.water,p.wifi,
      p.restaurant,p.shop,p.fuel,p.laundry,p.accommodation
    ];
    return norm(bits.filter(v=>v!==undefined&&v!==null).map(v=>typeof v==='object'?JSON.stringify(v):v).join(' '));
  }
  function hasFacility(p,f){
    const t=facilityText(p);
    const aliases={
      accommodatie:['accommodatie','hotel','b&b','bed and breakfast','overnachting','chalet','lodging'],
      walstroom:['walstroom','shore power','electricity','stroom','16a','6a','10a'],
      douche:['douche','shower'],
      toilet:['toilet','wc'],
      water:['drinkwater','water','fresh water'],
      wifi:['wifi','wi-fi','internet'],
      restaurant:['restaurant','eetcafe','cafe','eten'],
      winkel:['winkel','shop','supermarkt'],
      brandstof:['brandstof','diesel','fuel','tankstation'],
      wasserette:['wasserette','laundry','washing machine','wasmachine']
    };
    return (aliases[f]||[f]).some(a=>t.includes(norm(a)));
  }
  function activeFilters(){
    return {
      regions:checked('#ms71511RegionChips input'),
      minStars:Number($('ms71511Stars')?.value||0),
      type:String($('ms71511PoiType')?.value||''),
      facilities:checked('.ms71511-facility-grid input')
    };
  }
  function matches(p,f){
    if(f.regions.length){
      const rt=regionText(p);
      if(!f.regions.some(r=>rt.includes(norm(r)))) return false;
    }
    if(rating(p)<f.minStars) return false;
    if(f.type && !typeText(p).includes(norm(f.type))) return false;
    if(f.facilities.length && !f.facilities.every(x=>hasFacility(p,x))) return false;
    return true;
  }

  window.ms71511ApplyPoiFilters=function(){
    const data=poiData();
    const f=activeFilters();
    const filtered=data.filter(p=>matches(p,f));
    window.ms71511FilteredPois=filtered;

    // Filter existing rendered cards where possible
    document.querySelectorAll('#poiList [data-poi-id], #poiList .poi-item, #poiList .poi-card').forEach(card=>{
      const hay=norm(card.textContent);
      let ok=true;
      if(f.regions.length) ok=ok&&f.regions.some(r=>hay.includes(norm(r)));
      if(f.type) ok=ok&&hay.includes(norm(f.type));
      if(f.facilities.length) ok=ok&&f.facilities.every(x=>( {
        accommodatie:['accommodatie','hotel','b&b'],
        walstroom:['walstroom','stroom'],
        douche:['douche'],
        toilet:['toilet','wc'],
        water:['drinkwater','water'],
        wifi:['wifi'],
        restaurant:['restaurant'],
        winkel:['winkel','supermarkt'],
        brandstof:['brandstof','diesel'],
        wasserette:['wasserette','wasmachine']
      }[x]||[x]).some(a=>hay.includes(norm(a))));
      card.classList.toggle('ms71511-poi-hidden',!ok);
    });

    const st=$('ms71511PoiFilterStatus');
    if(st){
      const regionTxt=f.regions.length?f.regions.join(', '):'alle regio’s';
      st.textContent=`${filtered.length} POI’s gevonden · ${regionTxt} · minimaal ${f.minStars} ster${f.minStars===1?'':'ren'}.`;
    }
    return filtered;
  };

  window.ms71511ShowFilteredPoisOnMap=function(){
    const filtered=window.ms71511FilteredPois || window.ms71511ApplyPoiFilters();
    try{
      localStorage.setItem('ms71511_map_filter',JSON.stringify(filtered.map(p=>p.id||p.uuid||p.name).filter(Boolean)));
    }catch(e){}
    // Navigate to existing map and trigger rendering if available.
    if(typeof captainNavigate==='function') captainNavigate('map');
    setTimeout(()=>{
      try{
        if(typeof renderMapPois==='function') renderMapPois(filtered);
        else if(typeof renderPoiMarkers==='function') renderPoiMarkers(filtered);
        else if(typeof initMap==='function') initMap();
      }catch(e){}
    },250);
  };

  window.ms71511ResetPoiFilters=function(){
    document.querySelectorAll('#ms71511RegionChips input,.ms71511-facility-grid input').forEach(x=>x.checked=false);
    if($('ms71511Stars')) $('ms71511Stars').value='0';
    if($('ms71511PoiType')) $('ms71511PoiType').value='';
    window.ms71511FilteredPois=null;
    document.querySelectorAll('.ms71511-poi-hidden').forEach(x=>x.classList.remove('ms71511-poi-hidden'));
    const st=$('ms71511PoiFilterStatus'); if(st) st.textContent='Filters gewist.';
  };
})();
