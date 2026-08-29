/* MijnSerenity 7.19.3 — RWS getijden op actuele GPS-positie */
const RWS='https://ddapi20-waterwebservices.rijkswaterstaat.nl';
const CATALOG_URL=RWS+'/METADATASERVICES/OphalenCatalogus';
const OBS_URL=RWS+'/ONLINEWAARNEMINGENSERVICES/OphalenWaarnemingen';
const GROUPS=['GETETBRKD2','GETETBRKDMSL2'];
const MAX_DISTANCE_KM=55;
const CATALOG_TTL=12*60*60*1000;
let stationCache={at:0,stations:[]};

const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=300, s-maxage=900'};
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const scalar=(obj,keys)=>{for(const k of keys){if(obj&&obj[k]!=null)return obj[k]}return null};
const normalizeId=v=>v==null?'':String(v);

function coords(loc){
  let lat=num(scalar(loc,['Lat','lat','Latitude','latitude']));
  let lon=num(scalar(loc,['Lon','lon','Lng','lng','Longitude','longitude']));
  const x=num(loc?.X),y=num(loc?.Y);
  if(lat==null||lon==null){
    if(x!=null&&y!=null){
      if(y>=45&&y<=60&&x>=-2&&x<=15){lat=y;lon=x}
      else if(x>=45&&x<=60&&y>=-2&&y<=15){lat=x;lon=y}
    }
  }
  return lat!=null&&lon!=null?{lat,lon}:null;
}
function distanceKm(a,b){
  const r=6371,toRad=d=>d*Math.PI/180;
  const dLat=toRad(b.lat-a.lat),dLon=toRad(b.lon-a.lon);
  const h=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;
  return 2*r*Math.asin(Math.sqrt(h));
}
async function postJson(url,body){
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','X-API-KEY':'MijnSerenity'},body:JSON.stringify(body)});
  if(response.status===204)return null;
  const text=await response.text();
  let data=null;try{data=text?JSON.parse(text):null}catch{}
  if(!response.ok)throw new Error(`RWS ${response.status}${data?.Message?`: ${data.Message}`:''}`);
  return data;
}
function metaId(row){return normalizeId(scalar(row,['AquoMetadata_MessageID','AquoMetaData_MessageID','AquoMetadataMessageID','AquoMetadataId','MessageID']))}
function locId(row){return normalizeId(scalar(row,['Locatie_MessageID','LocatieMessageID','LocatieId','MessageID']))}
function xrefMetaId(row){return normalizeId(scalar(row,['AquoMetaData_MessageID','AquoMetadata_MessageID','AquoMetadataMessageID','AquoMetadataId']))}
function xrefLocId(row){return normalizeId(scalar(row,['Locatie_MessageID','LocatieMessageID','LocatieId','MessageID_Locatie']))}
function isTideMeta(row){return GROUPS.some(code=>String(row?.Groepering?.Code||'').toUpperCase()===code)||/GETETBRKD(?:MSL)?2/i.test(JSON.stringify(row||{}))}

async function loadStations(){
  if(stationCache.stations.length&&Date.now()-stationCache.at<CATALOG_TTL)return stationCache.stations;
  const data=await postJson(CATALOG_URL,{CatalogusFilter:{Compartimenten:true,Grootheden:true,Groeperingen:true}});
  const meta=Array.isArray(data?.AquoMetadataLijst)?data.AquoMetadataLijst:[];
  const locs=Array.isArray(data?.LocatieLijst)?data.LocatieLijst:[];
  const links=Array.isArray(data?.AquoMetadataLocatieLijst)?data.AquoMetadataLocatieLijst:[];
  const tideMetaIds=new Set(meta.filter(isTideMeta).map(metaId).filter(Boolean));
  const tideLocIds=new Set(links.filter(link=>tideMetaIds.has(xrefMetaId(link))).map(xrefLocId).filter(Boolean));
  let stations=locs.map(loc=>{
    const p=coords(loc);if(!p)return null;
    return {id:locId(loc),code:String(loc.Code||loc.LocatieCode||'').trim(),name:String(loc.Naam||loc.Name||loc.Omschrijving||loc.Code||'Getijstation').trim(),lat:p.lat,lon:p.lon};
  }).filter(s=>s&&s.code);
  if(tideLocIds.size)stations=stations.filter(s=>tideLocIds.has(s.id));
  stationCache={at:Date.now(),stations};
  return stations;
}
function measurementValue(m){
  const mv=m?.Meetwaarde||m?.meetwaarde||{};
  const numeric=num(scalar(mv,['Waarde_Numeriek','WaardeNumeriek','waarde_numeriek']));
  const alpha=String(scalar(mv,['Waarde_Alfanumeriek','WaardeAlfanumeriek','waarde_alfanumeriek'])??'').trim();
  return {numeric,alpha};
}
function eventType(value){
  const s=String(value||'').trim().toUpperCase();
  if(/(^|\b)(HW|HOOG|HOOGWATER|HIGH)(\b|$)/.test(s))return 'high';
  if(/(^|\b)(LW|LAAG|LAAGWATER|LOW)(\b|$)/.test(s))return 'low';
  return null;
}
function parseEvents(payload){
  const series=Array.isArray(payload?.WaarnemingenLijst)?payload.WaarnemingenLijst:[];
  const typeByTime=new Map(),heightByTime=new Map();
  let unit='cm',reference='NAP';
  for(const row of series){
    const meta=row?.AquoMetadata||{};
    const metaText=JSON.stringify(meta).toUpperCase();
    const measures=Array.isArray(row?.MetingenLijst)?row.MetingenLijst:[];
    const code=String(meta?.Grootheid?.Code||'').toUpperCase();
    const rowUnit=String(meta?.Eenheid?.Code||'').trim();
    const rowRef=String(meta?.Hoedanigheid?.Code||'').trim();
    if(rowRef&&!/NVT/i.test(rowRef))reference=rowRef;
    const samples=measures.map(m=>({time:String(m?.Tijdstip||m?.tijdstip||''),...measurementValue(m)})).filter(m=>m.time);
    const looksType=/GETIJEXTREEMTYPE|TIDAL EXTREME TYPE|GETET/.test(metaText)||samples.some(m=>eventType(m.alpha));
    const looksHeight=code==='WATHTE'||/WATERHOOGTE|WATER HEIGHT/.test(metaText)||(!looksType&&samples.some(m=>m.numeric!=null));
    if(looksType){for(const m of samples){const t=eventType(m.alpha);if(t)typeByTime.set(m.time,t)}}
    if(looksHeight){if(rowUnit)unit=rowUnit;for(const m of samples){const v=m.numeric??num(String(m.alpha).replace(',','.'));if(v!=null)heightByTime.set(m.time,v)}}
  }
  let times=[...new Set([...typeByTime.keys(),...heightByTime.keys()])].sort((a,b)=>new Date(a)-new Date(b));
  const heights=times.map(t=>heightByTime.get(t)).filter(v=>v!=null);
  const convert=v=>{if(v==null)return null;if(/^cm$/i.test(unit))return v/100;if(/^mm$/i.test(unit))return v/1000;if(/^m$/i.test(unit))return v;return Math.abs(v)>20?v/100:v};
  let events=times.map((time,index)=>({time,type:typeByTime.get(time)||null,height:convert(heightByTime.get(time))}));
  if(events.some(e=>!e.type)&&heights.length){
    events=events.map((e,i)=>{
      if(e.type||e.height==null)return e;
      const prev=events[i-1]?.height,next=events[i+1]?.height;
      if(prev!=null&&next!=null)return {...e,type:e.height>=prev&&e.height>=next?'high':e.height<=prev&&e.height<=next?'low':null};
      if(next!=null)return {...e,type:e.height>next?'high':'low'};
      if(prev!=null)return {...e,type:e.height>prev?'high':'low'};
      return e;
    });
  }
  return {events:events.filter(e=>Number.isFinite(new Date(e.time).getTime())),reference};
}
function isoOffset(date){return date.toISOString()}
async function tidesForStation(station){
  const start=new Date(Date.now()-18*60*60*1000),end=new Date(Date.now()+54*60*60*1000);
  let lastError=null;
  for(const group of GROUPS){
    try{
      const payload=await postJson(OBS_URL,{Locatie:{Code:station.code},AquoPlusWaarnemingMetadata:{AquoMetadata:{Groepering:{Code:group}}},Periode:{Begindatumtijd:isoOffset(start),Einddatumtijd:isoOffset(end)}});
      if(!payload)continue;
      const parsed=parseEvents(payload);
      if(parsed.events.length)return {...parsed,group};
    }catch(error){lastError=error}
  }
  if(lastError)throw lastError;
  return {events:[],reference:'NAP',group:null};
}

exports.handler=async(event)=>{
  if(event.httpMethod!=='GET')return{statusCode:405,headers,body:JSON.stringify({error:'Alleen GET toegestaan'})};
  const lat=num(event.queryStringParameters?.lat),lon=num(event.queryStringParameters?.lon);
  if(lat==null||lon==null||Math.abs(lat)>90||Math.abs(lon)>180)return{statusCode:400,headers,body:JSON.stringify({error:'Ongeldige GPS-positie'})};
  try{
    const stations=await loadStations();
    const ranked=stations.map(s=>({...s,distanceKm:distanceKm({lat,lon},s)})).sort((a,b)=>a.distanceKm-b.distanceKm);
    const nearby=ranked.filter(s=>s.distanceKm<=MAX_DISTANCE_KM).slice(0,6);
    if(!nearby.length)return{statusCode:200,headers,body:JSON.stringify({available:false,reason:'non_tidal',message:'Geen getij op deze locatie',nearest:ranked[0]?{name:ranked[0].name,distanceKm:Number(ranked[0].distanceKm.toFixed(1))}:null})};
    for(const station of nearby){
      try{
        const result=await tidesForStation(station);
        if(result.events.length){
          const now=Date.now();
          const upcoming=result.events.filter(e=>new Date(e.time).getTime()>=now-5*60*1000).slice(0,4);
          const previous=result.events.filter(e=>new Date(e.time).getTime()<now-5*60*1000).slice(-1);
          const selected=upcoming.length>=2?upcoming:result.events.slice(-4);
          const context=[...previous,...upcoming].slice(0,5);
          return{statusCode:200,headers,body:JSON.stringify({available:true,station:{code:station.code,name:station.name,lat:station.lat,lon:station.lon,distanceKm:Number(station.distanceKm.toFixed(1))},reference:result.reference,group:result.group,events:selected,context,source:'Rijkswaterstaat WaterWebservices'})};
        }
      }catch(error){console.warn('RWS getijstation mislukt',station.code,error?.message||error)}
    }
    return{statusCode:200,headers,body:JSON.stringify({available:false,reason:'no_data',message:'Geen getijdata beschikbaar voor deze locatie'})};
  }catch(error){
    console.error('Tides function failed',error);
    return{statusCode:502,headers:{...headers,'Cache-Control':'no-store'},body:JSON.stringify({available:false,reason:'error',error:error?.message||'Getijdata ophalen mislukt'})};
  }
};
