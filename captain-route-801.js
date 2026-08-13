(function(){
'use strict';
if(window.__msCaptainRoute801)return;
window.__msCaptainRoute801=true;
const UPDATE_MS=3000;
const WARN_KM=1;
let lastWarnKey='';
const num=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:null};
const txt=v=>String(v??'').trim();
const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
function ensure(){
 let el=document.getElementById('msCaptainNavigationStrip');
 if(el)return el;
 const dash=document.getElementById('ms71510Dashboard');
 if(!dash)return null;
 el=document.createElement('button');el.id='msCaptainNavigationStrip';el.type='button';
 el.innerHTML='<span class="mscr-main"><small>ROUTE</small><strong id="mscrDest">Nog geen route</strong></span><span><small>REST</small><strong id="mscrRest">– km</strong></span><span><small>ETA</small><strong id="mscrEta">–</strong></span><span class="mscr-next"><small>VOLGENDE BRUG / SLUIS</small><strong id="mscrNext">Nog niet bekend</strong><em id="mscrNextDist"></em><i id="mscrNextInfo"></i></span><b>›</b>';
 el.onclick=()=>window.captainNavigate?.('planner');
 const badge=document.getElementById('msCaptainModeBadge');
 if(badge?.nextSibling)dash.insertBefore(el,badge.nextSibling);else dash.prepend(el);
 return el;
}
function nav(){
 try{if(typeof window.ms705NavigationSummary==='function')return window.ms705NavigationSummary()||{}}catch(e){}
 try{if(typeof window.ms660NavigationEstimate==='function')return window.ms660NavigationEstimate()||{}}catch(e){}
 return {destination:txt(document.getElementById('liveTo')?.value),remainingKm:null};
}
function pos(){
 const s=window.liveNavState||{};const c=[[s.currentLat,s.currentLon],[s.lat,s.lon],[s.latitude,s.longitude],[s.position?.lat,s.position?.lon],[s.gps?.lat,s.gps?.lon]];
 for(const [a,b] of c){const lat=num(a),lon=num(b);if(lat!==null&&lon!==null)return {lat,lon}}return null;
}
function ll(p){const lat=num(p?.lat??p?.latitude??p?.position?.lat),lon=num(p?.lon??p?.lng??p?.longitude??p?.position?.lon);return lat!==null&&lon!==null?{lat,lon}:null}
function name(p){return txt(p?.label??p?.name??p?.title??p?.place??p?.description??p?.properties?.name)}
function obstacle(p){return /(brug|sluis|bridge|lock|hefbrug|ophaalbrug|draaibrug|keersluis|schutsluis)/i.test([name(p),p?.type,p?.category,p?.kind,p?.properties?.type].filter(Boolean).join(' '))}
function points(){
 const c=[window.plannerCurrentPlan?.points,window.plannerCurrentPlan?.route?.points,window.liveNavState?.routePoints,window.liveNavState?.route?.points,window.currentRoute?.points];
 return c.find(Array.isArray)||[];
}
function km(a,b){if(!a||!b)return null;const r=6371,d1=(b.lat-a.lat)*Math.PI/180,d2=(b.lon-a.lon)*Math.PI/180,x=Math.sin(d1/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(d2/2)**2;return r*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)))}
function firstValue(obj,keys){
 for(const key of keys){
   const value=key.split('.').reduce((current,part)=>current?.[part],obj);
   if(value!==undefined&&value!==null&&String(value).trim()!=='')return value;
 }
 return null;
}
function clearance(p){
 const raw=firstValue(p,['clearance','clearanceHeight','bridgeHeight','height','verticalClearance','doorvaarthoogte','properties.clearance','properties.clearanceHeight','properties.bridgeHeight','properties.height','properties.verticalClearance','properties.doorvaarthoogte']);
 if(raw===null)return '';
 const n=num(raw);
 if(n!==null&&n>0&&n<100)return `${n.toLocaleString('nl-NL',{maximumFractionDigits:2})} m`;
 const clean=txt(raw);
 return clean?clean:'';
}
function operation(p){
 const raw=firstValue(p,['operation','operatingHours','openingHours','openingTimes','serviceTimes','bediening','bedientijden','properties.operation','properties.operatingHours','properties.openingHours','properties.openingTimes','properties.serviceTimes','properties.bediening','properties.bedientijden']);
 if(raw===null)return '';
 if(Array.isArray(raw))return raw.map(txt).filter(Boolean).join(' · ');
 if(typeof raw==='object'){
   const parts=Object.values(raw).map(v=>typeof v==='string'?txt(v):'').filter(Boolean);
   return parts.slice(0,3).join(' · ');
 }
 return txt(raw);
}
function next(){
 const ps=points();if(!ps.length)return null;const here=pos();let start=0;
 if(here){let best=Infinity;ps.forEach((p,i)=>{const d=km(here,ll(p));if(d!==null&&d<best){best=d;start=i}})}
 for(let i=start;i<ps.length;i++)if(obstacle(ps[i])){
   const p=ps[i],d=here?km(here,ll(p)):null;
   return {name:name(p)||'Brug / sluis',distance:d,clearance:clearance(p),operation:operation(p),index:i};
 }
 return null;
}
function fmt(v){const n=num(v);if(n===null||n<0)return '– km';return n<1?`${Math.max(10,Math.round(n*100)*10)} m`:`${n.toLocaleString('nl-NL',{maximumFractionDigits:1})} km`}
function speed(){const d=num(document.getElementById('ms71510Speed')?.textContent);if(d!==null&&d>=1)return d;try{return Math.max(1,num(window.ms705Settings?.()?.cruiseSpeed)||9)}catch(e){return 9}}
function timeLeft(distanceKm){
 const d=num(distanceKm);if(d===null||d<0)return '';
 const minutes=Math.max(1,Math.round((d/speed())*60));
 if(minutes<60)return `nog ${minutes} min`;
 const h=Math.floor(minutes/60),m=minutes%60;
 return m?`nog ${h} u ${m} min`:`nog ${h} u`;
}
function warningKey(o){return `${o.name}|${o.index}`}
function warnIfClose(o){
 const d=num(o?.distance);
 if(d===null||d>WARN_KM)return;
 const key=warningKey(o);
 if(lastWarnKey===key)return;
 lastWarnKey=key;
 const message=`⚠️ ${o.name} over ${fmt(d)} · ${timeLeft(d)}`;
 try{navigator.vibrate?.([120,80,120])}catch(e){}
 try{window.showAppToast?.(message)}catch(e){}
 window.dispatchEvent(new CustomEvent('mscaptainobstaclewarning',{detail:{...o,message}}));
}
function infoLine(o){
 const parts=[];
 parts.push(o.clearance?`Hoogte ${o.clearance}`:'Hoogte onbekend');
 parts.push(o.operation?`Bediening ${o.operation}`:'Bediening onbekend');
 return parts.join(' · ');
}
function render(){
 const el=ensure();if(!el)return;
 const n=nav(),dest=txt(n.destination||document.getElementById('liveTo')?.value),rest=num(n.remainingKm);
 set('mscrDest',dest&&dest!=='Nog niet gekozen'?dest:'Nog geen actieve route');
 set('mscrRest',fmt(rest));
 if(rest!==null){const eta=new Date(Date.now()+rest/speed()*3600000);set('mscrEta',eta.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}))}else set('mscrEta','–');
 const o=next();
 if(o){
   set('mscrNext',o.name);
   set('mscrNextDist',o.distance!==null?`${fmt(o.distance)} · ${timeLeft(o.distance)}`:'Op actieve route');
   set('mscrNextInfo',infoLine(o));
   el.classList.add('has-obstacle');
   el.classList.toggle('obstacle-close',num(o.distance)!==null&&num(o.distance)<=WARN_KM);
   warnIfClose(o);
 }else{
   set('mscrNext','Nog niet gevonden op route');
   set('mscrNextDist',dest?'Open reisplanner voor routedetails':'Plan eerst een route');
   set('mscrNextInfo','');
   el.classList.remove('has-obstacle','obstacle-close');
 }
}
function init(){ensure();render();setInterval(render,UPDATE_MS);window.addEventListener('mscaptainmodechange',render)}
window.msCaptainRoute={refresh:render};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();