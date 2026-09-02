/* MijnSerenity 8.22.0 — kaartplotter facelift zonder wijziging van kaartdata */
(()=>{
  'use strict';
  if(window.__msMapNextLevel8220)return;
  window.__msMapNextLevel8220=true;

  const $=id=>document.getElementById(id);

  function commandDeck(){
    const deck=document.createElement('div');
    deck.className='map-control-deck';
    deck.innerHTML=`
      <div class="map-control-intro">
        <div class="map-control-kicker">
          <span class="eyebrow">SERENITY KAARTPLOTTER</span>
          <span class="map-live-badge"><i></i> Live kaart</span>
        </div>
        <h2>Verken vanaf Serenity</h2>
        <p>Vind je positie, favoriete havens en alle gedeelde POI’s.</p>
      </div>
      <div class="map-primary-actions">
        <button type="button" class="map-command map-command-location" onclick="locateMe()">
          <span class="map-command-icon" aria-hidden="true">◎</span>
          <span><strong>Mijn positie</strong><small>Vind Serenity</small></span>
        </button>
        <button type="button" class="map-command map-command-waterkaarten" onclick="openWaterkaarten()">
          <span class="map-command-icon" aria-hidden="true">⌁</span>
          <span><strong>Waterkaarten</strong><small>Open navigatie</small></span>
          <span class="map-command-arrow" aria-hidden="true">↗</span>
        </button>
      </div>
      <div class="map-filter-bar" role="group" aria-label="POI’s op de kaart">
        <button type="button" id="allPoiMapButton" class="map-filter-choice poi-filter-active" aria-pressed="true" onclick="showAllPoiMarkers()"><span aria-hidden="true">●</span> Alle POI’s</button>
        <button type="button" id="favoritesMapButton" class="map-filter-choice" aria-pressed="false" onclick="showFavoritesOnly()"><span aria-hidden="true">★</span> Favorieten</button>
        <button type="button" class="map-filter-choice map-fit-choice" onclick="fitPoiMarkers()"><span aria-hidden="true">⌗</span> Overzicht</button>
      </div>`;
    return deck;
  }

  function mapShell(canvas,status){
    const shell=document.createElement('div');
    shell.className='card map-card map-next-level-shell';
    shell.innerHTML=`<div class="map-floating-count" aria-live="polite"><strong id="mapPoiCount">–</strong><span id="mapPoiMode">POI’s</span></div>`;
    canvas.setAttribute('aria-label','Kaart met positie en POI’s');
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    shell.append(canvas,status);
    return shell;
  }

  function mount(){
    const section=$('map');
    const canvas=$('mapCanvas');
    const status=$('poiMapStatus');
    if(!section||!canvas||!status)return false;
    if(!section.classList.contains('map-next-level-page')){
      section.classList.add('map-next-level-page');
      section.replaceChildren(commandDeck(),mapShell(canvas,status));
    }
    syncStatus();
    bindMapDensity();
    setTimeout(()=>{
      try{mapInstance?.invalidateSize?.({pan:false})}catch{}
    },80);
    return true;
  }

  function syncStatus(){
    const status=$('poiMapStatus');
    const count=$('mapPoiCount');
    const mode=$('mapPoiMode');
    const favorites=$('favoritesMapButton');
    const all=$('allPoiMapButton');
    const isFavorites=Boolean(favorites?.classList.contains('poi-filter-active'));
    favorites?.setAttribute('aria-pressed',String(isFavorites));
    all?.setAttribute('aria-pressed',String(!isFavorites));
    if(mode)mode.textContent=isFavorites?'favorieten':'POI’s zichtbaar';
    const match=String(status?.textContent||'').match(/(\d+)\s+zichtbaar/i);
    if(count)count.textContent=match?.[1]||'–';
  }

  function updateZoomBand(){
    const canvas=$('mapCanvas');
    try{
      const zoom=Number(mapInstance?.getZoom?.()||7);
      if(canvas)canvas.dataset.zoomBand=zoom<=7?'far':zoom>=12?'near':'mid';
    }catch{}
  }

  function bindMapDensity(){
    try{
      if(typeof mapInstance==='undefined'||!mapInstance)return;
      if(!mapInstance.__msMapDensity8220){
        mapInstance.__msMapDensity8220=true;
        mapInstance.on('zoomend',updateZoomBand);
      }
      updateZoomBand();
    }catch{}
  }

  function wrapStatus(){
    if(typeof window.updatePoiMapStatus!=='function'||window.updatePoiMapStatus.__ms8220)return;
    const original=window.updatePoiMapStatus;
    const wrapped=function(...args){
      const result=original.apply(this,args);
      syncStatus();
      bindMapDensity();
      return result;
    };
    wrapped.__ms8220=true;
    window.updatePoiMapStatus=wrapped;
  }

  function start(){
    mount();
    wrapStatus();
    [60,180,450,900].forEach(delay=>setTimeout(()=>{mount();wrapStatus()},delay));
    window.addEventListener('mijnserenity:routechange',event=>{
      const route=typeof event.detail==='string'?event.detail:event.detail?.route||event.detail?.id;
      if(route==='map')requestAnimationFrame(()=>{mount();wrapStatus()});
    },{passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
