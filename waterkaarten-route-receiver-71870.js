/* MijnSerenity 7.18.7 — Waterkaarten GPX -> Reisplanner */
(()=>{
  'use strict';
  if(window.__msWaterkaartenRouteReceiver71870)return;
  window.__msWaterkaartenRouteReceiver71870=true;

  const params=new URL(location.href).searchParams;
  if(params.get('waterkaarten')!=='check')return;

  const SUPABASE_URL='https://wufslczbtguvtgmfufid.supabase.co';
  const SUPABASE_KEY='sb_publishable_LCJ5Oj0yG4guOvBFPS5ALg_WG57gAo9';
  const STORAGE_PREFIX='mijnserenity-planner-v1-';
  const MAX_READY_WAIT_MS=60000;
  const CLAIM_ATTEMPTS=15;
  const CLAIM_DELAY_MS=1000;

  let claimedRoute=null;
  let importToken='';
  let client=null;

  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  function notice(message,type='info'){
    let el=document.getElementById('msWaterkaartenImportNotice71870');
    if(!el){
      el=document.createElement('div');
      el.id='msWaterkaartenImportNotice71870';
      Object.assign(el.style,{
        position:'fixed',
        left:'max(12px, env(safe-area-inset-left))',
        right:'max(12px, env(safe-area-inset-right))',
        top:'max(12px, env(safe-area-inset-top))',
        zIndex:'2147483647',
        padding:'12px 14px',
        borderRadius:'14px',
        font:'600 14px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        boxShadow:'0 8px 30px rgba(0,0,0,.28)',
        textAlign:'center',
        backdropFilter:'blur(14px)',
        WebkitBackdropFilter:'blur(14px)'
      });
      document.body.appendChild(el);
    }
    el.textContent=message;
    el.style.color=type==='error'?'#fff':'#eef8ff';
    el.style.background=type==='error'?'rgba(145,25,25,.94)':'rgba(7,35,55,.94)';
    clearTimeout(notice.timer);
    if(type!=='loading')notice.timer=setTimeout(()=>el.remove(),6500);
  }

  function currentBoatId(){
    if(typeof window.plannerStorageKey!=='function')return '';
    const key=String(window.plannerStorageKey()||'');
    if(!key.startsWith(STORAGE_PREFIX))return '';
    const id=key.slice(STORAGE_PREFIX.length);
    return id&&id!=='geen-boot'?id:'';
  }

  async function waitUntilReady(){
    const started=Date.now();
    while(Date.now()-started<MAX_READY_WAIT_MS){
      const ready=window.supabase?.createClient&&
        typeof window.parseRouteFile==='function'&&
        typeof window.plannerStorageKey==='function'&&
        typeof window.loadPlannerDraft==='function'&&
        currentBoatId();
      if(ready)return true;
      await sleep(250);
    }
    return false;
  }

  function supabaseClient(){
    if(client)return client;
    client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}
    });
    return client;
  }

  async function readImportToken(){
    const boatId=currentBoatId();
    if(!boatId)throw new Error('De boot is nog niet geladen.');
    const sb=supabaseClient();
    const {data:sessionData}=await sb.auth.getSession();
    if(!sessionData?.session?.user)throw new Error('Log eerst in bij MijnSerenity en probeer daarna opnieuw.');
    const {data,error}=await sb
      .from('boat_settings')
      .select('waterkaarten_import_token')
      .eq('boat_id',boatId)
      .maybeSingle();
    if(error)throw error;
    const token=String(data?.waterkaarten_import_token||'').trim();
    if(!token)throw new Error('De Waterkaarten-importcode ontbreekt bij deze boot.');
    return token;
  }

  async function claimRoute(){
    const sb=supabaseClient();
    for(let attempt=0;attempt<CLAIM_ATTEMPTS;attempt++){
      const {data,error}=await sb.rpc('claim_waterkaarten_route',{p_token:importToken});
      if(error)throw error;
      const row=Array.isArray(data)?data[0]:data;
      if(row?.id&&row?.file_base64)return row;
      if(attempt<CLAIM_ATTEMPTS-1)await sleep(CLAIM_DELAY_MS);
    }
    return null;
  }

  async function releaseRoute(){
    if(!claimedRoute?.id||!importToken)return;
    try{
      await supabaseClient().rpc('release_waterkaarten_route',{
        p_token:importToken,
        p_route_id:claimedRoute.id
      });
    }catch(error){console.warn('Waterkaarten-route vrijgeven mislukt:',error)}
  }

  function base64File(row){
    const normalized=String(row.file_base64||'')
      .replace(/\s+/g,'')
      .replace(/-/g,'+')
      .replace(/_/g,'/');
    const binary=atob(normalized);
    const bytes=new Uint8Array(binary.length);
    for(let index=0;index<binary.length;index++)bytes[index]=binary.charCodeAt(index);
    const name=String(row.file_name||'waterkaarten-route.gpx');
    const type=String(row.content_type||'application/gpx+xml');
    return new File([bytes],name,{type,lastModified:Date.now()});
  }

  function collectLineStrings(geojson){
    const lines=[];
    const visitGeometry=geometry=>{
      if(!geometry)return;
      if(geometry.type==='LineString'&&Array.isArray(geometry.coordinates)){
        lines.push(geometry.coordinates);
        return;
      }
      if(geometry.type==='MultiLineString'&&Array.isArray(geometry.coordinates)){
        geometry.coordinates.forEach(line=>Array.isArray(line)&&lines.push(line));
        return;
      }
      if(geometry.type==='GeometryCollection'&&Array.isArray(geometry.geometries)){
        geometry.geometries.forEach(visitGeometry);
      }
    };
    if(geojson?.type==='FeatureCollection'){
      (geojson.features||[]).forEach(feature=>visitGeometry(feature?.geometry));
    }else if(geojson?.type==='Feature')visitGeometry(geojson.geometry);
    else visitGeometry(geojson);

    const route=[];
    lines.forEach(line=>{
      const clean=line
        .map(coord=>Array.isArray(coord)&&coord.length>=2?[Number(coord[0]),Number(coord[1])]:null)
        .filter(coord=>coord&&Number.isFinite(coord[0])&&Number.isFinite(coord[1]));
      if(clean.length<2)return;
      if(route.length){
        const last=route[route.length-1];
        const first=clean[0];
        if(Math.abs(last[0]-first[0])<1e-8&&Math.abs(last[1]-first[1])<1e-8)route.push(...clean.slice(1));
        else route.push(...clean);
      }else route.push(...clean);
    });
    return route;
  }

  function haversineKm(a,b){
    const toRad=value=>value*Math.PI/180;
    const lat1=toRad(Number(a?.[1]));
    const lat2=toRad(Number(b?.[1]));
    const dLat=lat2-lat1;
    const dLon=toRad(Number(b?.[0])-Number(a?.[0]));
    const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
  }

  function routeDistanceKm(coords){
    let total=0;
    for(let index=1;index<coords.length;index++)total+=haversineKm(coords[index-1],coords[index]);
    return total;
  }

  function inputNumber(id,fallback){
    const value=Number(document.getElementById(id)?.value);
    return Number.isFinite(value)&&value>0?value:fallback;
  }

  function fileTitle(name){
    const base=String(name||'Waterkaarten-route').replace(/\.(gpx|kml|kmz)$/i,'').trim();
    return base||'Waterkaarten-route';
  }

  function createPlan(row,coords){
    const now=new Date();
    const first=coords[0];
    const last=coords[coords.length-1];
    const distanceKm=routeDistanceKm(coords);
    const speed=inputNumber('plannerSpeed',9);
    const fuelPerHour=inputNumber('plannerFuelPerHour',5.5);
    const fuelPrice=inputNumber('plannerFuelPrice',1.9);
    const durationHours=distanceKm/speed;
    const fuelLiters=durationHours*fuelPerHour;
    const title=`Waterkaarten – ${fileTitle(row.file_name)}`;
    const routeId=String(row.id);
    const start={
      ref:`waterkaarten:${routeId}:start`,
      label:'Start Waterkaarten-route',
      lat:Number(first[1]),lon:Number(first[0]),
      category:'Waterkaarten'
    };
    const end={
      ref:`waterkaarten:${routeId}:end`,
      label:'Bestemming Waterkaarten-route',
      lat:Number(last[1]),lon:Number(last[0]),
      category:'Waterkaarten'
    };
    const id=window.crypto?.randomUUID?.()||`waterkaarten-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return {
      id,
      createdAt:now.toISOString(),
      updatedAt:now.toISOString(),
      date:now.toISOString().slice(0,10),
      title,
      fromRef:'',
      toRef:'',
      stopRefs:[],
      speed,
      factor:1,
      fuelPerHour,
      fuelPrice,
      notes:'Automatisch geïmporteerd uit Waterkaarten.',
      points:[start,end],
      segments:[{
        index:0,
        from:start,
        to:end,
        directKm:haversineKm(first,last),
        estimatedKm:distanceKm,
        distanceKm,
        routeCoordinates:coords
      }],
      distanceKm,
      durationHours,
      fuelLiters,
      fuelCost:fuelLiters*fuelPrice,
      routeCoordinates:coords,
      routingMode:'waterway',
      routeSource:'waterkaarten-gpx',
      routeSourceLabel:'Waterkaarten GPX',
      source:'waterkaarten',
      waterkaartenRouteId:routeId,
      waterkaartenFileName:String(row.file_name||''),
      waterkaartenCreatedAt:row.created_at||null,
      importedAt:now.toISOString()
    };
  }

  function storePlan(plan){
    const key=window.plannerStorageKey();
    let drafts=[];
    try{drafts=JSON.parse(localStorage.getItem(key)||'[]')}catch{drafts=[]}
    if(!Array.isArray(drafts))drafts=[];
    const existingIndex=drafts.findIndex(item=>String(item?.waterkaartenRouteId||'')===String(plan.waterkaartenRouteId));
    if(existingIndex>=0){
      const existing=drafts.splice(existingIndex,1)[0];
      plan.id=existing.id||plan.id;
      plan.createdAt=existing.createdAt||plan.createdAt;
    }
    drafts.unshift(plan);
    localStorage.setItem(key,JSON.stringify(drafts.slice(0,40)));
  }

  function openPlanner(plan){
    try{
      if(typeof window.showPage==='function')window.showPage('planner');
      else document.querySelector('[data-page="planner"],#planner')?.scrollIntoView?.({block:'start'});
    }catch(error){console.warn('Reisplanner openen:',error)}
    window.loadPlannerDraft(plan.id);
    const url=new URL(location.href);
    url.searchParams.set('open','planner');
    url.searchParams.delete('waterkaarten');
    history.replaceState(history.state||{},'',`${url.pathname}${url.search}${url.hash}`);
  }

  async function run(){
    notice('Waterkaarten-route wordt in Reisplanner geladen…','loading');
    const ready=await waitUntilReady();
    if(!ready)throw new Error('MijnSerenity was niet op tijd klaar voor de Waterkaarten-import.');

    importToken=await readImportToken();
    claimedRoute=await claimRoute();
    if(!claimedRoute)throw new Error('Geen nieuwe Waterkaarten-route gevonden. Probeer “Bewaar in MijnSerenity” nogmaals.');

    const file=base64File(claimedRoute);
    const geojson=await window.parseRouteFile(file);
    const coords=collectLineStrings(geojson);
    if(coords.length<2)throw new Error('De GPX bevat geen bruikbare vaarroute.');

    const plan=createPlan(claimedRoute,coords);
    storePlan(plan);
    openPlanner(plan);
    claimedRoute=null;
    notice(`Waterkaarten-route geladen in Reisplanner · ${plan.distanceKm.toFixed(1)} km`,'success');
    window.dispatchEvent(new CustomEvent('mijnserenity:waterkaarten-route-imported',{detail:{planId:plan.id}}));
  }

  run().catch(async error=>{
    console.error('Waterkaarten -> Reisplanner import mislukt:',error);
    await releaseRoute();
    notice(error?.message||'Waterkaarten-route importeren is mislukt.','error');
  });
})();
