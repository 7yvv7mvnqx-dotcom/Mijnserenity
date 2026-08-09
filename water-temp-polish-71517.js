/* MijnSerenity 7.15.17 — RWS watertemperatuur opschonen + kaart 10 km doorsnede */
(function(){
  'use strict';

  function hideLegacyWaterCard(){
    const legacy=document.getElementById('ms793WeatherWaterTemp')?.closest('article');
    if(legacy)legacy.style.setProperty('display','none','important');
  }

  function currentCoords(){
    try{
      const point=window.liveNavState?.points?.at?.(-1);
      const lat=Number(point?.lat);
      const lon=Number(point?.lon);
      if(Number.isFinite(lat)&&Number.isFinite(lon))return {lat,lon};
    }catch(e){}
    try{
      const raw=localStorage.getItem(`mijnserenity-weather-793-${window.currentBoat?.id||'serenity'}`);
      const cached=JSON.parse(raw||'null');
      const lat=Number(cached?.coordinates?.lat);
      const lon=Number(cached?.coordinates?.lon);
      if(Number.isFinite(lat)&&Number.isFinite(lon))return {lat,lon};
    }catch(e){}
    return null;
  }

  function patchRwsMapZoom(){
    const proto=window.L?.Map?.prototype;
    if(!proto||proto.__ms71517TenKmFitBounds)return;
    const original=proto.fitBounds;
    proto.fitBounds=function(bounds,options){
      try{
        if(this.getContainer?.()?.id==='ms71515RwsWaterMap'){
          const coords=currentCoords();
          if(coords){
            const viewCircle=window.L.circle([coords.lat,coords.lon],{radius:5000});
            const nextOptions={...(options||{})};
            delete nextOptions.maxZoom;
            nextOptions.padding=[8,8];
            return original.call(this,viewCircle.getBounds(),nextOptions);
          }
        }
      }catch(e){
        console.warn('RWS kaart kon niet op 10 km doorsnede worden gezet',e);
      }
      return original.call(this,bounds,options);
    };
    proto.__ms71517TenKmFitBounds=true;
  }

  function init(){
    hideLegacyWaterCard();
    patchRwsMapZoom();
    const observer=new MutationObserver(()=>{
      hideLegacyWaterCard();
      patchRwsMapZoom();
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init,{once:true});
  }else{
    init();
  }
})();
