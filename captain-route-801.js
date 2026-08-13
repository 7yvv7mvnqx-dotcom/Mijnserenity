(function(){
'use strict';
if(window.__msCaptainRoute801)return;
window.__msCaptainRoute801=true;
const UPDATE_MS=3000;
const num=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:null};
const txt=v=>String(v??'').trim();
const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
function ensure(){
 let el=document.getElementById('msCaptainNavigationStrip');
 if(el)return el;
 const dash=document.getElementById('ms71510Dashboard');
 if(!dash)return null;
 el=document.createElement('button');el.id='msCaptainNavigationStrip';el.type='button';
 el.innerHTML='<span class="mscr-main"><small>ROUTE</small><strong id="mscrDest">Nog geen route</strong></span><span><small>REST</small><strong id="mscrRest">– km</strong></span><span><small>ETA</small><strong id="mscrEta">–</strong></span><span class="mscr-next"><small>VOLGENDE BRUG / SLUIS</small><strong id="mscrNext">Nog niet bekend</strong><em id="mscrNextDist"></em></span><b>›</b>';
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
function next(){
 const ps=points();if(!ps.length)return null;const here=pos();let start=0;
 if(here){let best=Infinity;ps.forEach((p,i)=>{const d=km(here,ll(p));if(d!==null&&d<best){best=d;start=i}})}
 for(let i=start;i<ps.length;i++)if(obstacle(ps[i])){const d=here?km(here,ll(ps[i])):null;return {name:name(ps[i])||'Brug / sluis',distance:d}}
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
function render(){
 const el=ensure();if(!el)return;const n=nav(),dest=txt(n.destination||document.getElementById('liveTo')?.value),rest=num(n.remainingKm);set('mscrDest',dest&&dest!=='Nog niet gekozen'?dest:'Nog geen actieve route');set('mscrRest',fmt(rest));
 if(rest!==null){const eta=new Date(Date.now()+rest/speed()*3600000);set('mscrEta',eta.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}))}else set('mscrEta','–');
 const o=next();if(o){set('mscrNext',o.name);set('mscrNextDist',o.distance!==null?`${fmt(o.distance)} · ${timeLeft(o.distance)}`:'Op actieve route');el.classList.add('has-obstacle')}else{set('mscrNext','Nog niet gevonden op route');set('mscrNextDist',dest?'Open reisplanner voor routedetails':'Plan eerst een route');el.classList.remove('has-obstacle')}
}
function init(){ensure();render();setInterval(render,UPDATE_MS);window.addEventListener('mscaptainmodechange',render)}
window.msCaptainRoute={refresh:render};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();