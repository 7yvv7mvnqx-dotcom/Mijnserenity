/* MijnSerenity 7.16.0 — Waterkaarten integratie via GPX delen, zonder iframe/API */
(()=>{
  'use strict';
  if(window.__msWaterkaartenGpx71600)return;
  window.__msWaterkaartenGpx71600=true;

  const BUILD='7.16.0';
  const $=id=>document.getElementById(id);
  const num=value=>{const m=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):null};
  const xml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));

  function ll(point){
    if(Array.isArray(point)){
      const lon=num(point[0]),lat=num(point[1]);
      return lat!==null&&lon!==null?[lat,lon]:null;
    }
    const lat=num(point?.lat??point?.latitude??point?.position?.lat);
    const lon=num(point?.lon??point?.lng??point?.longitude??point?.position?.lon);
    return lat!==null&&lon!==null?[lat,lon]:null;
  }

  function activePlan(){
    try{const plan=window.ms660NavigationPlan?.();if(plan)return plan}catch{}
    try{if(typeof plannerCurrentPlan!=='undefined'&&plannerCurrentPlan)return plannerCurrentPlan}catch{}
    return window.plannerCurrentPlan||window.msActivePlannerPlan||{};
  }

  function plannedPoints(){
    let state={},route={};
    const plan=activePlan();
    try{state=typeof liveNavState!=='undefined'?(liveNavState||{}):(window.liveNavState||{})}catch{state=window.liveNavState||{}}
    try{route=typeof currentRoute!=='undefined'?(currentRoute||{}):(window.currentRoute||{})}catch{route=window.currentRoute||{}}
    const segmentPoints=Array.isArray(plan?.segments)?plan.segments.flatMap(segment=>segment?.routeCoordinates||[]):[];
    const sets=[
      plan?.routeCoordinates,plan?.route?.coordinates,plan?.routeGeometry?.coordinates,
      segmentPoints,plan?.points,plan?.route?.points,state?.routeCoordinates,state?.routePoints,
      state?.route?.points,route?.points,route?.route?.points
    ];
    for(const values of sets){
      if(!Array.isArray(values))continue;
      const points=values.map(ll).filter(Boolean);
      if(points.length>1)return points;
    }
    return [];
  }

  function destination(){
    try{
      const summary=window.ms705NavigationSummary?.()||window.ms660NavigationEstimate?.()||{};
      const value=String(summary.destination||$('msnSmartDestination')?.textContent||$('msnDestination')?.textContent||$('liveTo')?.value||'').trim();
      if(value&&!/geen route|nog niet/i.test(value))return value;
    }catch{}
    return 'Serenity route';
  }

  function filename(value){
    const safe=String(value||'serenity-route')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').toLowerCase();
    return `${safe||'serenity-route'}.gpx`;
  }

  function makeGpx(points,name){
    const now=new Date().toISOString();
    const track=points.map(([lat,lon])=>`      <trkpt lat="${lat.toFixed(7)}" lon="${lon.toFixed(7)}"></trkpt>`).join('\n');
    const start=points[0],end=points[points.length-1];
    return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="MijnSerenity ${BUILD}" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">\n  <metadata><name>${xml(name)}</name><time>${now}</time></metadata>\n  <wpt lat="${start[0].toFixed(7)}" lon="${start[1].toFixed(7)}"><name>Start</name></wpt>\n  <wpt lat="${end[0].toFixed(7)}" lon="${end[1].toFixed(7)}"><name>${xml(name)}</name></wpt>\n  <trk><name>${xml(name)}</name><trkseg>\n${track}\n  </trkseg></trk>\n</gpx>\n`;
  }

  function toast(message){
    if(typeof window.showAppToast==='function')window.showAppToast(message);
  }

  async function shareRoute(){
    const points=plannedPoints();
    if(points.length<2){
      alert('Bereken eerst een route in MijnSerenity. Daarna kan ik die als GPX naar Waterkaarten sturen.');
      return false;
    }

    const name=destination();
    const gpx=makeGpx(points,name);
    const fileName=filename(`serenity-${name}`);

    try{
      if(window.MijnSerenityNative?.shareGpx){
        await window.MijnSerenityNative.shareGpx(gpx,fileName,`Route naar ${name}`);
        toast('Kies Waterkaarten in de deelkaart om de route te importeren.');
        return false;
      }

      const file=new File([gpx],fileName,{type:'application/gpx+xml'});
      let canShareFiles=Boolean(navigator.share);
      if(canShareFiles&&navigator.canShare){
        try{canShareFiles=navigator.canShare({files:[file]})}catch{canShareFiles=false}
      }
      if(canShareFiles){
        await navigator.share({title:`Route naar ${name}`,text:'Open deze route in Waterkaarten.',files:[file]});
        return false;
      }

      const url=URL.createObjectURL(file);
      const a=document.createElement('a');
      a.href=url;
      a.download=file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      alert('De GPX-route is opgeslagen. Open het bestand daarna met Waterkaarten.');
    }catch(error){
      if(error?.name!=='AbortError'){
        console.error('Route delen naar Waterkaarten mislukt:',error);
        alert('Route delen is niet gelukt: '+(error?.message||'onbekende fout'));
      }
    }
    return false;
  }

  function removeIframeUi(){
    ['ms738WaterkaartenModal','ms738WaterkaartenBanner','mswk71561Overlay'].forEach(id=>document.getElementById(id)?.remove());
    document.documentElement.classList.remove('ms-waterkaarten-open','mswk71561-open');
    document.body?.classList.remove('ms-waterkaarten-open','mswk71561-open');
  }

  function updateButton(){
    const button=$('msnWaterkaarten');
    if(button){
      button.setAttribute('aria-label','Deel huidige route met Waterkaarten');
      const label=button.querySelector('b');
      if(label)label.textContent='Route → Waterkaarten';
      button.title='Deel de huidige SmartRoute als GPX met Waterkaarten';
    }
  }

  function patch(){
    removeIframeUi();
    window.msShareRouteToWaterkaarten=shareRoute;
    window.ms738LaunchWaterkaarten=shareRoute;
    window.ms738ShowWaterkaartenPrompt=shareRoute;
    window.openWaterkaarten=shareRoute;
    updateButton();
  }

  function start(){
    patch();
    const observer=new MutationObserver(()=>requestAnimationFrame(patch));
    observer.observe(document.body,{childList:true,subtree:true});
    setInterval(()=>{if(!document.hidden)patch()},1500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
