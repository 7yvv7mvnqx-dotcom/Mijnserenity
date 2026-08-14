/* MijnSerenity 7.15.31 Pro dashboard + stabiele windrichting */
(()=>{
'use strict';
if(window.__msPro71531)return; window.__msPro71531=true;
const $=id=>document.getElementById(id);
const txt=id=>($(id)?.textContent||'').trim();
const num=v=>{const m=String(v??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):null};
const set=(id,v)=>{const el=$(id);if(el&&v!==undefined&&v!==null)el.textContent=String(v)};
const esc=v=>String(v??'–').replace(/[&<>]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]));
const dirs=['N','NNO','NO','ONO','O','OZO','ZO','ZZO','Z','ZZW','ZW','WZW','W','WNW','NW','NNW'];
const degToDir=d=>dirs[Math.round((((d%360)+360)%360)/22.5)%16];
let windSamples=[];
function circularMean(values){if(!values.length)return null;let x=0,y=0;values.forEach(d=>{const r=d*Math.PI/180;x+=Math.cos(r);y+=Math.sin(r)});let d=Math.atan2(y,x)*180/Math.PI;return(d+360)%360}
function rawWindDeg(){
 const candidates=[window.liveNavState?.weather?.windDirection,window.liveNavState?.windDirection,txt('ivmsWindDirection'),txt('ms71512WindDirection')];
 for(const c of candidates){const n=num(c);if(Number.isFinite(n))return((n%360)+360)%360}
 return null;
}
function stableWind(){const raw=rawWindDeg();if(raw===null)return null;windSamples.push(raw);if(windSamples.length>8)windSamples.shift();return circularMean(windSamples)}
function coords(){
 const pts=window.liveNavState?.points;const p=Array.isArray(pts)&&pts.length?pts[pts.length-1]:null;
 const lat=Number(p?.lat),lon=Number(p?.lon);return Number.isFinite(lat)&&Number.isFinite(lon)?{lat,lon}:null;
}
function build(){
 const host=$('dashboard'); if(!host||$('msProDashboard'))return;
 host.classList.add('mspro-active');
 const el=document.createElement('section');el.id='msProDashboard';el.setAttribute('aria-label','MijnSerenity Pro dashboard');
 el.innerHTML=`
 <div class="mspro-grid">
  <article class="mspro-card"><h3>LOCATIE & GPS <span class="mspro-green">● GPS</span></h3><div class="mspro-location"><div><div class="mspro-muted">Huidige positie</div><div class="mspro-med" id="msProLat">–</div><div class="mspro-med" id="msProLon">–</div><div style="margin-top:18px" class="mspro-muted">Snelheid over grond</div><div class="mspro-med"><span id="msProSpeed">0</span> kn</div><div style="margin-top:18px" class="mspro-muted">Laatste update</div><div class="mspro-green" id="msProTime">–</div></div><div class="mspro-map" aria-label="Positie-indicatie"></div></div></article>
  <article class="mspro-card mspro-accent"><h3>WIND</h3><div class="mspro-row"><div><div class="mspro-big mspro-green" id="msProWindDir">–</div><div class="mspro-muted">richting waar wind naartoe waait</div></div><div><b id="msProBft">– Bft</b></div></div><div class="mspro-compass"><span class="n">N</span><span class="e">O</span><span class="s">Z</span><span class="w">W</span><i id="msProWindArrow"></i><div class="mspro-wind-center"><div><strong id="msProWindSpeed">–</strong><small>km/u</small></div></div></div><div class="mspro-row"><span class="mspro-muted">Bronrichting</span><strong class="mspro-green" id="msProWindSource">–</strong></div></article>
  <article class="mspro-card"><h3>KOERS & ROER <span class="mspro-green">● Actief</span></h3><div style="text-align:center"><div class="mspro-muted">Koers (COG)</div><div class="mspro-big mspro-green"><span id="msProCourse">–</span>°</div></div><div class="mspro-rudder"><div class="mspro-rudder-arc"></div><i id="msProRudderNeedle" class="mspro-rudder-needle"></i></div><div class="mspro-row"><span>BB <b class="mspro-red">35°</b></span><strong id="msProRudder">Midden</strong><span>SB <b class="mspro-green">35°</b></span></div></article>
 </div>
 <div class="mspro-status-strip">
  <article class="mspro-card mspro-status"><div><div class="icon">✓</div><b id="msProSystem">Alles normaal</b><div class="mspro-muted">SYSTEEMSTATUS</div></div></article>
  <button class="mspro-card mspro-status" data-go="technical"><span class="icon">⚙️</span><span>Motor</span><strong>OK</strong></button>
  <button class="mspro-card mspro-status" data-go="technical"><span class="icon">🔋</span><span>Accu's</span><strong>OK</strong></button>
  <button class="mspro-card mspro-status" data-go="technical"><span class="icon">💧</span><span>Bilgepomp</span><strong>OK</strong></button>
  <button class="mspro-card mspro-status" data-go="live"><span class="icon">🧭</span><span>Navigatie</span><strong>OK</strong></button>
  <button class="mspro-card mspro-status" data-go="entertainment"><span class="icon">💡</span><span>Verlichting</span><strong>OK</strong></button>
 </div>
 <div class="mspro-bottom">
  <article class="mspro-card"><h3>DIEPTE</h3><div class="mspro-big"><span id="msProDepth">–</span> <small>m</small></div><div class="mspro-spark"></div><div class="mspro-muted">Sensor: <span class="mspro-green">Actief</span></div></article>
  <article class="mspro-card"><h3>WATER</h3><div class="mspro-big" id="msProWater">– °C</div><div class="mspro-green" style="margin-top:12px">Buitenwater</div><div class="mspro-muted">RWS / dichtstbijzijnde meting</div></article>
  <article class="mspro-card"><h3>WEERVOORUITZICHT</h3><div class="mspro-forecast" id="msProForecast"><div class="mspro-fc">Nu<b>–</b><small>–</small></div><div class="mspro-fc">+2u<b>–</b><small>–</small></div><div class="mspro-fc">+4u<b>–</b><small>–</small></div><div class="mspro-fc">+6u<b>–</b><small>–</small></div><div class="mspro-fc">+8u<b>–</b><small>–</small></div><div class="mspro-fc">+10u<b>–</b><small>–</small></div></div></article>
  <article class="mspro-card"><h3>SNELLE ACTIES</h3><div class="mspro-actions"><button class="mspro-action" data-go="map"><span>🧭</span>Navigatie</button><button class="mspro-action" data-go="entertainment"><span>🎵</span>Entertainment</button><button class="mspro-action" data-go="technical"><span>💡</span>Verlichting</button><button class="mspro-action" data-go="settings"><span>⚙️</span>Instellingen</button></div></article>
 </div>`;
 host.insertBefore(el,host.firstChild);
 el.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>window.captainNavigate?.(b.dataset.go)));
}
function sync(){
 if(!$('msProDashboard'))build(); if(!$('msProDashboard'))return;
 const c=coords(); if(c){set('msProLat',`${c.lat.toFixed(5)}° N`);set('msProLon',`${c.lon.toFixed(5)}° O`)}
 const speed=num(txt('ivmsSpeedKn'))??num(window.liveNavState?.speedKnots)??0;set('msProSpeed',speed.toFixed(1));
 set('msProTime',new Date().toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit',second:'2-digit'}));
 const windSpeed=num(txt('ivmsWindValue'))??num(window.liveNavState?.weather?.windSpeed);set('msProWindSpeed',windSpeed===null?'–':windSpeed.toFixed(1));
 set('msProBft',txt('ms71510WindBft')||'– Bft');
 const from=stableWind(); if(from!==null){const to=(from+180)%360;set('msProWindDir',degToDir(to));set('msProWindSource',degToDir(from));const a=$('msProWindArrow');if(a)a.style.transform=`translate(-50%,-100%) rotate(${to}deg)`}
 const course=num(window.liveNavState?.course)??num(window.liveNavState?.cog)??num(txt('ivmsCourse'));set('msProCourse',course===null?'–':String(Math.round(course)).padStart(3,'0'));
 let rud=num($('liveRudderInput')?.value)??num(window.liveNavState?.rudderAngle)??0;rud=Math.max(-35,Math.min(35,rud));const rn=$('msProRudderNeedle');if(rn)rn.style.transform=`rotate(${rud}deg)`;set('msProRudder',Math.abs(rud)<1?'Midden':`${rud<0?'BB':'SB'} ${Math.abs(Math.round(rud))}°`);
 const sys=(txt('ivmsSystemLabel')||'Alles normaal');set('msProSystem',/alarm|krit|storing|waarsch/i.test(sys)?sys:'Alles normaal');
 set('msProDepth',num(txt('ivmsDepth'))??'–');set('msProWater',txt('ms71510WaterTemp')||txt('ms793WeatherWaterTemp')||'– °C');
}
function init(){build();sync();['mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-ruuvi-vrm-updated','mijnserenity:routechange'].forEach(n=>window.addEventListener(n,sync,{passive:true}));setInterval(()=>{if(!document.hidden)sync()},1000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
