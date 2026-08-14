/* MijnSerenity 7.15.31 Pro start dashboard + vaste Pro navigatie */
(()=>{
'use strict';
if(window.__msPro71531V2)return;window.__msPro71531V2=true;
const $=id=>document.getElementById(id);
const txt=id=>($(id)?.textContent||'').trim();
const num=v=>{const m=String(v??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):null};
const set=(id,v)=>{const el=$(id);if(el&&v!==undefined&&v!==null)el.textContent=String(v)};
const read=(ids,fallback='–')=>{for(const id of ids){const v=txt(id);if(v&&v!=='–'&&v!=='-')return v}return fallback};
const norm=d=>{const n=Number(d);return Number.isFinite(n)?((n%360)+360)%360:null};
let navObserver=null;
let dashboardObserver=null;

function navigate(route){
  if(route==='more'){
    document.querySelector('.ms750-more-button')?.click();
    return;
  }
  if(typeof window.ms708GoToPage==='function'){window.ms708GoToPage(route,true);return;}
  if(typeof window.captainNavigate==='function'){window.captainNavigate(route);return;}
  document.querySelector(`.tab[data-target="${route}"]`)?.click();
}

function ensureProNav(){
  const nav=document.querySelector('.bottom-nav');
  if(!nav)return;
  const wanted=['dashboard','live','map','logbook','entertainment','more'];
  const current=[...nav.querySelectorAll('.bottom-nav-item')].map(b=>b.dataset.target);
  if(current.join('|')!==wanted.join('|')){
    nav.innerHTML=`
      <button type="button" class="bottom-nav-item" data-target="dashboard" aria-label="Start"><span>🏠</span><small>Start</small></button>
      <button type="button" class="bottom-nav-item" data-target="live" aria-label="Varen"><span>⛵</span><small>Varen</small></button>
      <button type="button" class="bottom-nav-item" data-target="map" aria-label="Kaart"><span>🗺️</span><small>Kaart</small></button>
      <button type="button" class="bottom-nav-item" data-target="logbook" aria-label="Logboek"><span>📖</span><small>Logboek</small></button>
      <button type="button" class="bottom-nav-item" data-target="entertainment" aria-label="Entertainment"><span>🎵</span><small>Entertainment</small></button>
      <button type="button" class="bottom-nav-item" data-target="more" aria-label="Meer"><span>☰</span><small>Meer</small></button>`;
  }
  if(nav.dataset.msProBound!=='1'){
    nav.dataset.msProBound='1';
    nav.addEventListener('click',event=>{
      const b=event.target.closest('.bottom-nav-item');if(!b)return;
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      navigate(b.dataset.target);
    },true);
  }
  syncNav(window.__msProRoute||'dashboard');
}

function syncNav(route){
  window.__msProRoute=route||'dashboard';
  document.querySelectorAll('.bottom-nav-item').forEach(b=>{
    const active=b.dataset.target===window.__msProRoute;
    b.classList.toggle('active',active);
    if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
  });
}

function installNavGuard(){
  ensureProNav();
  if(navObserver)return;
  navObserver=new MutationObserver(()=>requestAnimationFrame(ensureProNav));
  navObserver.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('mijnserenity:routechange',e=>{const route=e.detail?.route||'dashboard';syncNav(route);setTimeout(ensureProNav,0);},{passive:true});
}

function heroImage(){
  const source=$('dashboardBoatPhoto');
  return source?.src&&source.naturalWidth>0?source.src:'';
}

function buildDashboard(){
  const host=$('dashboard');if(!host)return;
  host.classList.add('mspro-active');
  let el=$('msProDashboard');
  if(el)return;
  el=document.createElement('section');el.id='msProDashboard';el.setAttribute('aria-label','MijnSerenity Pro startpagina');
  el.innerHTML=`
    <div class="mspro-hero">
      <div class="mspro-hero-copy"><h1>Serenity</h1><p>WELKOM AAN BOORD</p><div class="mspro-clock"><span id="msProClock">–</span><span id="msProDate">–</span></div></div>
      <div class="mspro-hero-photo"><img id="msProHeroImage" alt="Serenity"><span id="msProHeroFallback">🚤</span></div>
      <div class="mspro-hero-system"><small>SYSTEEMSTATUS</small><strong id="msProSystem">Alles normaal</strong><button type="button" data-go="more">☰ &nbsp; Meer</button></div>
    </div>

    <div class="mspro-metrics mspro-three">
      <button class="mspro-card mspro-metric" data-go="live"><span class="mspro-gauge speed"></span><div><small>SNELHEID</small><strong><b id="msProSpeed">0</b> km/u</strong><em id="msProSpeedKn">0 kn</em></div><i>›</i></button>
      <button class="mspro-card mspro-metric" data-go="technical"><span class="mspro-gauge rpm"></span><div><small>TOERENTAL</small><strong><b id="msProRpm">0</b> rpm</strong><em id="msProRpmSub">0 u/min</em></div><i>›</i></button>
      <button class="mspro-card mspro-metric" data-go="technical"><span class="mspro-rudder-icon"><i id="msProRudderNeedle"></i></span><div><small>ROERSTAND</small><strong><b id="msProRudder">0°</b></strong><em id="msProRudderText">MIDDEN</em></div><i>›</i></button>
    </div>

    <div class="mspro-metrics mspro-three">
      <button class="mspro-card mspro-metric mspro-wind-card" data-go="weather"><span class="mspro-wind-sight"><i id="msProWindArrow"></i></span><div><small>WIND</small><strong><b id="msProWindSpeed">–</b> km/u</strong><em><span id="msProBft">– Bft</span> · <span id="msProWindText">richting –</span></em></div><i>›</i></button>
      <button class="mspro-card mspro-metric" data-go="live"><span class="mspro-depth-icon">≋</span><div><small>DIEPTE</small><strong><b id="msProDepth">–</b> m</strong><em id="msProDepthState">nog niet gekoppeld</em></div><i>›</i></button>
      <button class="mspro-card mspro-metric" data-go="weather"><span class="mspro-temp-icon">♨</span><div><small>WATERTEMP.</small><strong id="msProWater">– °C</strong><em>Water</em></div><i>›</i></button>
    </div>

    <div class="mspro-energy">
      <button data-go="technical"><small>HUISHOUD ACCU</small><strong id="msProHouseSoc">–%</strong><em id="msProHouseVolt">– V</em></button>
      <button data-go="technical"><small>START ACCU</small><strong id="msProStartSoc">–%</strong><em id="msProStartVolt">– V</em></button>
      <button data-go="technical"><small>WALSTROOM</small><strong id="msProShore">–</strong><em id="msProShoreSub">–</em></button>
      <button data-go="technical"><small>LADER</small><strong id="msProCharger">–</strong><em id="msProChargerSub">–</em></button>
      <button data-go="technical"><small>ZONNEPANELEN</small><strong id="msProSolar">– W</strong><em id="msProSolarSub">–</em></button>
      <button data-go="technical"><small>BILGE</small><strong id="msProBilge">OK</strong><em id="msProBilgeSub">Geen water</em></button>
    </div>`;
  host.insertBefore(el,host.firstChild);
  el.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b)navigate(b.dataset.go)});
  updateHero();
}

function updateHero(){
  const img=$('msProHeroImage'),fb=$('msProHeroFallback'),src=heroImage();
  if(img){if(src){img.src=src;img.classList.remove('hidden');fb?.classList.add('hidden')}else{img.removeAttribute('src');img.classList.add('hidden');fb?.classList.remove('hidden')}}
}

function readWindFrom(){
  const d=norm(window.liveNavState?.weather?.windDirection);if(d!==null)return d;
  const text=txt('ivmsWeatherWind')||txt('ms71512WindDirection');
  const m=text.match(/(\d{1,3})\s*°/);if(m)return norm(m[1]);
  const names={N:0,NNO:22.5,NO:45,ONO:67.5,O:90,OZO:112.5,ZO:135,ZZO:157.5,Z:180,ZZW:202.5,ZW:225,WZW:247.5,W:270,WNW:292.5,NW:315,NNW:337.5};
  const n=text.match(/\b(NNO|ONO|OZO|ZZO|ZZW|WZW|WNW|NNW|NO|ZO|ZW|NW|N|O|Z|W)\b/i);return n?names[n[1].toUpperCase()]:null;
}
function windName(d){if(d===null)return '–';return ['N','NNO','NO','ONO','O','OZO','ZO','ZZO','Z','ZZW','ZW','WZW','W','WNW','NW','NNW'][Math.round(d/22.5)%16]}

function sync(){
  if(!$('msProDashboard'))buildDashboard();
  const now=new Date();set('msProClock',now.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}));set('msProDate',now.toLocaleDateString('nl-NL',{weekday:'short',day:'numeric',month:'short'}));
  updateHero();
  const system=read(['ivmsSystemLabel','dashboardTechnicalStatus'],'Alles normaal');set('msProSystem',/alarm|krit|storing|waarsch/i.test(system)?system:'Alles normaal');
  const speed=num(txt('ms71510SpeedKm'))??num(txt('ivmsSpeedValue'))??num(window.liveNavState?.speedKmh)??0;set('msProSpeed',speed.toFixed(1).replace('.0',''));
  const kn=num(txt('ivmsSpeedKn'))??num(window.liveNavState?.speedKnots)??speed/1.852;set('msProSpeedKn',`${kn.toFixed(1)} kn`);
  const rpm=num(txt('ms71510Rpm'))??num(txt('ivmsRpmValue'))??num(window.liveNavState?.rpm)??0;set('msProRpm',Math.round(rpm));set('msProRpmSub',`${Math.round(rpm)} u/min`);
  let rud=num($('liveRudderInput')?.value)??num(window.liveNavState?.rudderAngle)??0;rud=Math.max(-35,Math.min(35,rud));set('msProRudder',`${Math.abs(Math.round(rud))}°`);set('msProRudderText',Math.abs(rud)<1?'MIDDEN':rud<0?'BB':'SB');const rn=$('msProRudderNeedle');if(rn)rn.style.transform=`rotate(${rud}deg)`;
  const windSpeed=num(txt('ivmsWindValue'))??num(window.liveNavState?.weather?.windSpeed)??num(txt('ms71510WindSpeed'));set('msProWindSpeed',windSpeed===null?'–':windSpeed.toFixed(0));set('msProBft',txt('ms71510WindBft')||'– Bft');
  const from=readWindFrom();if(from!==null){set('msProWindText',`wind uit ${windName(from)}`);const heading=norm(window.__msWindDeviceHeading);const to=norm(from+180);const rotation=heading===null?to:norm(to-heading);const a=$('msProWindArrow');if(a)a.style.transform=`translate(-50%,-50%) rotate(${rotation}deg)`}
  const depth=num(txt('ivmsDepth'))??num(txt('ms71510Depth'));set('msProDepth',depth===null?'–':depth.toFixed(1));set('msProDepthState',depth===null?'nog niet gekoppeld':'sensor actief');
  set('msProWater',read(['ms71510WaterTemp','ms793WeatherWaterTemp','rwsWaterTemperature'],'– °C'));
  set('msProHouseSoc',read(['ivmsHouseSoc','techHouseSoc','haHouseSoc'],'–%'));set('msProHouseVolt',read(['ivmsHouseVoltage','techHouseVoltage'],'– V'));
  set('msProStartSoc',read(['ivmsStartSoc','techStartSoc'],'–%'));set('msProStartVolt',read(['ivmsStartVoltage','techStartVoltage'],'– V'));
  set('msProShore',read(['ivmsShorePower','techShorePower'],'–'));set('msProShoreSub',read(['ivmsShorePowerSub'],'–'));
  set('msProCharger',read(['ivmsCharger','techCharger'],'–'));set('msProChargerSub',read(['ivmsChargerSub'],'–'));
  set('msProSolar',read(['ivmsSolarPower','techSolarPower'],'– W'));set('msProSolarSub',read(['ivmsSolarSub'],'–'));
  set('msProBilge',read(['ivmsBilge','techBilgeStatus'],'OK'));set('msProBilgeSub',read(['ivmsBilgeSub'],'Geen water'));
  ensureProNav();
}

function init(){
  buildDashboard();installNavGuard();sync();
  if(!dashboardObserver){dashboardObserver=new MutationObserver(()=>{if(!$('msProDashboard'))buildDashboard();updateHero()});const d=$('dashboard');if(d)dashboardObserver.observe(d,{childList:true,subtree:true,attributes:true});}
  ['mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-ruuvi-vrm-updated','mijnserenity:routechange'].forEach(n=>window.addEventListener(n,sync,{passive:true}));
  setInterval(()=>{if(!document.hidden)sync()},1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();