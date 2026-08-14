/* MijnSerenity 7.15.31 Pro cockpit startpagina */
(()=>{
'use strict';
if(window.__msProCockpit733)return;window.__msProCockpit733=true;
const $=id=>document.getElementById(id);
const txt=id=>($(id)?.textContent||'').trim();
const num=v=>{const m=String(v??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):null};
const set=(id,v)=>{const el=$(id);if(el&&v!==undefined&&v!==null)el.textContent=String(v)};
const read=(ids,f='–')=>{for(const id of ids){const v=txt(id);if(v&&v!=='–'&&v!=='-')return v}return f};
const norm=d=>{const n=Number(d);return Number.isFinite(n)?((n%360)+360)%360:null};
const dirs=['N','NNO','NO','ONO','O','OZO','ZO','ZZO','Z','ZZW','ZW','WZW','W','WNW','NW','NNW'];
const dirName=d=>d===null?'–':dirs[Math.round(d/22.5)%16];
let navObserver=null;

function go(route){
 if(route==='more'){document.querySelector('.ms750-more-button')?.click();return;}
 if(typeof window.ms708GoToPage==='function'){window.ms708GoToPage(route,true);return;}
 if(typeof window.captainNavigate==='function')window.captainNavigate(route);
}
function ensureNav(){
 const nav=document.querySelector('.bottom-nav');if(!nav)return;
 const wanted=['dashboard','live','map','logbook','entertainment','more'];
 const have=[...nav.querySelectorAll('.bottom-nav-item')].map(b=>b.dataset.target);
 if(have.join('|')!==wanted.join('|')){
  nav.innerHTML=`<button class="bottom-nav-item active" data-target="dashboard"><span>▦</span><small>Dashboard</small></button><button class="bottom-nav-item" data-target="live"><span>⛵</span><small>Live varen</small></button><button class="bottom-nav-item" data-target="map"><span>🗺️</span><small>Kaart</small></button><button class="bottom-nav-item" data-target="logbook"><span>📖</span><small>Logboek</small></button><button class="bottom-nav-item" data-target="entertainment"><span>♫</span><small>Entertainment</small></button><button class="bottom-nav-item" data-target="more"><span>•••</span><small>Meer</small></button>`;
 }
 if(nav.dataset.msCockpitBound!=='1'){
  nav.dataset.msCockpitBound='1';nav.addEventListener('click',e=>{const b=e.target.closest('.bottom-nav-item');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();go(b.dataset.target)},true);
 }
}
function installNavGuard(){ensureNav();if(navObserver)return;navObserver=new MutationObserver(()=>requestAnimationFrame(ensureNav));navObserver.observe(document.body,{childList:true,subtree:true});}

function build(){
 const host=$('dashboard');if(!host)return;host.classList.add('mspro-active');if($('msProDashboard'))return;
 const el=document.createElement('section');el.id='msProDashboard';el.innerHTML=`
 <header class="msc-head"><button data-go="more" class="msc-menu">☰</button><div class="msc-brand">Mijn<span>Serenity</span><b>7.15.31</b><small><i></i>Systeem OK &nbsp;&nbsp; Alles normaal</small></div><div class="msc-head-icons">⌁　♧</div></header>
 <div class="msc-main-grid">
  <article class="msc-card msc-location"><div class="msc-title">LOCATIE & GPS <span class="ok">○ GPS</span></div><div class="msc-loc-body"><div><small>Huidige positie</small><strong id="mscLat">–</strong><strong id="mscLon">–</strong><hr><small>Snelheid over grond</small><b id="mscSog">0.0 kn</b><hr><small>Laatste update</small><b class="ok" id="mscUpdated">–</b></div><div class="msc-mini-map"><div class="msc-boat">◆</div></div></div></article>
  <article class="msc-card msc-wind"><div class="msc-title">WIND <span>ⓘ</span></div><div class="msc-wind-top"><strong id="mscWindDeg">–</strong><small id="mscWindTrue">True</small></div><div class="msc-wind-layout"><div><b id="mscAws">– kn</b><small>AWS</small><b class="ok" id="mscAwa">–</b><small>AWA</small></div><div class="msc-wind-dial"><i id="mscWindArrow"></i><div class="msc-wind-core"><b id="mscTws">–</b><small>TWS</small></div></div><div><b id="mscBft">– Bft</b><small>Windkracht</small><b class="ok">Stabiel</b><small>Trend</small></div></div></article>
  <article class="msc-card msc-course"><div class="msc-title">KOERS & ROER <span class="ok">○ Actief</span></div><div class="msc-course-center"><small>Koers (COG)</small><strong id="mscCog">–°</strong></div><div class="msc-rudder-arc"><i id="mscRudderNeedle"></i></div><div class="msc-rudder-foot"><span>BB <b>35°</b></span><div><small>Roerstand</small><strong id="mscRudder">0°</strong></div><span>SB <b>35°</b></span></div></article>
  <aside class="msc-card msc-energy"><div class="msc-title">ENERGIE <span class="ok">• Alles goed</span></div><div class="msc-energy-row"><div><small>Accu's (DC)</small><strong id="mscSoc">–%</strong><span id="mscVoltAmp">– V　– A</span></div><b>▣</b></div><div class="msc-energy-row"><div><small>Verbruik</small><strong id="mscAmp">– A</strong><span class="msc-line">⌁⌁⌁⌁⌁⌁</span></div></div><div class="msc-energy-row"><div><small>Walstroom</small><span id="mscShore">–</span></div><b>♧</b></div><div class="msc-energy-row"><div><small>PV Zonnepanelen</small><span id="mscSolar">– W</span></div><b>☀</b></div><div class="msc-energy-row"><div><small>Generator</small><span>Uit</span></div><b>▧</b></div></aside>
  <section class="msc-statusbar"><article class="msc-card msc-status-main"><div class="msc-check">✓</div><div><small>SYSTEEMSTATUS</small><strong id="mscSystem">Alles normaal</strong><span>Geen actieve alarmen</span><span id="mscSystemTime">Laatste controle: –</span></div></article><button data-go="technical" class="msc-card msc-status-tile"><b>▱</b><span>Motor</span><strong>OK</strong></button><button data-go="technical" class="msc-card msc-status-tile"><b>▣</b><span>Accu's</span><strong>OK</strong></button><button data-go="technical" class="msc-card msc-status-tile"><b>♒</b><span>Bilgepomp</span><strong>OK</strong></button><button data-go="live" class="msc-card msc-status-tile"><b>◎</b><span>Navigatie</span><strong>OK</strong></button><button data-go="entertainment" class="msc-card msc-status-tile"><b>♢</b><span>Verlichting</span><strong>OK</strong></button></section>
  <article class="msc-card msc-depth"><div class="msc-title">DIEPTE <span>⋮</span></div><strong><span id="mscDepth">–</span> <small>m</small></strong><div class="msc-spark">⌁⌁⌁⌁⌁</div><span>Sensor: <b class="ok" id="mscDepthState">–</b></span></article>
  <article class="msc-card msc-water"><div class="msc-title">WATER</div><strong id="mscWater">– °C</strong><b class="blue">Buitenwater</b><span>Sensor: <b class="ok">Actief</b></span></article>
  <article class="msc-card msc-weather"><div class="msc-title">WEERVOORUITZICHT <span>Bron: OpenWeather</span></div><div class="msc-forecast" id="mscForecast"><div>Nu<b>☁</b><strong id="mscNowTemp">–°</strong><small id="mscNowWind">– kn</small></div><div>+2u<b>⛅</b><strong>–°</strong><small>– kn</small></div><div>+4u<b>☀</b><strong>–°</strong><small>– kn</small></div><div>+6u<b>⛅</b><strong>–°</strong><small>– kn</small></div><div>+8u<b>☾</b><strong>–°</strong><small>– kn</small></div><div>+10u<b>☾</b><strong>–°</strong><small>– kn</small></div></div><div class="msc-weather-foot"><span>☀ <b id="mscSunrise">–</b></span><span>☀ <b id="mscSunset">–</b></span><span>Waterstand: <b id="mscWaterlevel">–</b></span></div></article>
  <aside class="msc-card msc-quick"><div class="msc-title">SNELLE ACTIES</div><div class="msc-quick-grid"><button data-go="map">🧭<span>Navigatie</span></button><button data-go="entertainment">♫<span>Entertainment</span></button><button data-go="entertainment">💡<span>Verlichting</span></button><button data-go="settings">⚙<span>Instellingen</span></button></div></aside>
 </div>`;
 host.insertBefore(el,host.firstChild);el.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b)go(b.dataset.go)});
}
function coords(){const pts=window.liveNavState?.points;const p=Array.isArray(pts)&&pts.length?pts[pts.length-1]:null;const lat=Number(p?.lat),lon=Number(p?.lon);return Number.isFinite(lat)&&Number.isFinite(lon)?{lat,lon}:null}
function windFrom(){const d=norm(window.liveNavState?.weather?.windDirection);if(d!==null)return d;const s=txt('ivmsWeatherWind')||txt('ms71512WindDirection');const m=s.match(/(\d{1,3})\s*°/);return m?norm(m[1]):null}
function sync(){
 if(!$('msProDashboard'))build();if(!$('msProDashboard'))return;
 const now=new Date(),c=coords();set('mscUpdated',now.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit',second:'2-digit'}));set('mscSystemTime','Laatste controle: '+now.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit',second:'2-digit'}));
 if(c){set('mscLat',`${c.lat.toFixed(5)}° N`);set('mscLon',`${c.lon.toFixed(5)}° O`)}
 const kn=num(txt('ivmsSpeedKn'))??num(window.liveNavState?.speedKnots)??0;set('mscSog',`${kn.toFixed(1)} kn`);
 const system=read(['ivmsSystemLabel','dashboardTechnicalStatus'],'Alles normaal');set('mscSystem',/alarm|krit|storing|waarsch/i.test(system)?system:'Alles normaal');
 const from=windFrom(),heading=norm(window.__msWindDeviceHeading),to=from===null?null:norm(from+180),rotation=to===null?0:(heading===null?to:norm(to-heading));if(from!==null){set('mscWindDeg',`${String(Math.round(from)).padStart(3,'0')}°`);set('mscAwa',`${String(Math.round(from)).padStart(3,'0')}°`);const a=$('mscWindArrow');if(a)a.style.transform=`translate(-50%,-100%) rotate(${rotation}deg)`}
 const ws=num(txt('ivmsWindValue'))??num(window.liveNavState?.weather?.windSpeed);if(ws!==null){set('mscAws',`${(ws/1.852).toFixed(1)} kn`);set('mscTws',ws.toFixed(1));set('mscNowWind',`${(ws/1.852).toFixed(0)} kn`)}set('mscBft',txt('ms71510WindBft')||'– Bft');
 const cog=num(window.liveNavState?.course)??num(window.liveNavState?.cog)??num(txt('ivmsCourse'));set('mscCog',cog===null?'–°':`${String(Math.round(cog)).padStart(3,'0')}°`);
 let rud=num($('liveRudderInput')?.value)??num(window.liveNavState?.rudderAngle)??0;rud=Math.max(-35,Math.min(35,rud));set('mscRudder',`${Math.round(rud)}°`);const rn=$('mscRudderNeedle');if(rn)rn.style.transform=`translateX(-50%) rotate(${rud}deg)`;
 const depth=num(txt('ivmsDepth'))??num(txt('ms71510Depth'));set('mscDepth',depth===null?'–':depth.toFixed(1));set('mscDepthState',depth===null?'Niet gekoppeld':'Actief');
 set('mscWater',read(['ms71510WaterTemp','ms793WeatherWaterTemp','rwsWaterTemperature'],'– °C'));
 const soc=read(['ivmsHouseSoc','techHouseSoc','haHouseSoc'],'–%');set('mscSoc',soc);const volt=read(['ivmsHouseVoltage','techHouseVoltage'],'– V'),amp=read(['ivmsHouseCurrent','haHouseCurrent'],'– A');set('mscVoltAmp',`${volt}　${amp}`);set('mscAmp',amp);set('mscShore',read(['ivmsShorePower','techShorePower'],'–'));set('mscSolar',read(['ivmsSolarPower','techSolarPower'],'– W'));
 set('mscNowTemp',read(['weatherCurrentTemp','ms793WeatherTemp','ivmsWeatherTemp'],'–°'));set('mscSunrise',read(['weatherSunrise','ms793Sunrise'],'–'));set('mscSunset',read(['weatherSunset','ms793Sunset'],'–'));set('mscWaterlevel',read(['rwsWaterLevel','ms793WaterLevel'],'–'));
 ensureNav();
}
function init(){build();installNavGuard();sync();['mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-ruuvi-vrm-updated','mijnserenity:routechange'].forEach(n=>window.addEventListener(n,sync,{passive:true}));setInterval(()=>{if(!document.hidden)sync()},1000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();