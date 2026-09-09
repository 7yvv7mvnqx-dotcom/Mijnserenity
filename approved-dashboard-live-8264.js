/* MijnSerenity 8.26.4 — live Victron, tanks, climate and outside weather for approved Haven dashboard */
(()=>{
'use strict';
if(window.__msApprovedDashboardLive8264)return;
window.__msApprovedDashboardLive8264=true;

const ROOT='ms8210Start';
const PANEL='ms8264LiveInstruments';
const STYLE='ms8264LiveInstrumentsStyle';
const $=id=>document.getElementById(id);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const num=v=>finite(v)?Number(v):null;
const metric=v=>num(v?.value??v);
const firstNum=(...values)=>values.map(v=>num(v)).find(v=>v!==null)??null;
const fmt=(v,d=1,unit='')=>finite(v)?`${Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d})}${unit}`:`—${unit}`;
const signed=(v,d=1,unit='')=>finite(v)?`${Number(v)>0?'+':''}${fmt(v,d,unit)}`:`—${unit}`;
let frame=0;
let outside={temperature:null,apparent:null,sampledAt:'',source:''};
let outsideBusy=false;
let lastOutsideFetch=0;
let liveBusy=false;
let lastLiveRefresh=0;

function cleanText(value){return String(value??'').replace(/\s+/g,' ').trim()}
function domNum(ids){
  for(const id of ids){
    const text=cleanText($(id)?.textContent).replace(',','.');
    const match=text.match(/-?\d+(?:\.\d+)?/);
    if(match&&finite(match[0]))return Number(match[0]);
  }
  return null;
}
function technical(){
  try{
    if(typeof technicalStateCache!=='undefined'&&technicalStateCache&&typeof technicalStateCache==='object')return technicalStateCache;
    if(typeof readTechnicalLocalState==='function')return readTechnicalLocalState()||{};
  }catch{}
  return {};
}
function live(){
  const value=window.MIJSERENITY_VRM_LIVE_ENERGY;
  if(!value||typeof value!=='object'||value.success===false)return {};
  return value;
}
function diagnostics(){
  const value=window.MIJSERENITY_VRM_DIAGNOSTICS;
  return value&&typeof value==='object'?value:{};
}
function climate(){
  try{
    if(typeof window.ms7102GetRuuviClimate==='function'){
      const value=window.ms7102GetRuuviClimate();
      if(value?.salon||value?.forward)return value;
    }
  }catch{}
  let value=window.MIJSERENITY_VRM_DATA;
  if(!value){
    try{value=JSON.parse(localStorage.getItem('ms7150_ruuvi_last')||'null')}catch{}
  }
  return {
    salon:value?.salon?{
      temperature:num(value.salon.temperature),humidity:num(value.salon.humidity),pressure:num(value.salon.pressure),source:'vrm'
    }:null,
    forward:value?.machinekamer?{
      temperature:num(value.machinekamer.temperature),humidity:num(value.machinekamer.humidity),pressure:num(value.machinekamer.pressure),source:'vrm'
    }:null,
    updatedAt:value?.updatedAt||''
  };
}
function weatherCache(){
  try{
    if(typeof ms709WeatherPayload!=='undefined'&&ms709WeatherPayload?.current)return ms709WeatherPayload;
  }catch{}
  try{
    const keys=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i)||'';
      if(key.startsWith('mijnserenity-weather-793-'))keys.push(key);
    }
    for(const key of keys.reverse()){
      const value=JSON.parse(localStorage.getItem(key)||'null');
      if(value?.current)return value;
    }
  }catch{}
  return null;
}
function syncWeatherCache(){
  const cache=weatherCache();
  const t=num(cache?.current?.temperature_2m);
  if(t===null)return;
  const at=cache?.current?.time||cache?.updatedAt||cache?.fetchedAt||'';
  outside={temperature:t,apparent:num(cache?.current?.apparent_temperature),sampledAt:at,source:'Weer'};
}
function ageMs(value){
  const at=Date.parse(String(value||''));
  return Number.isFinite(at)?Math.max(0,Date.now()-at):Infinity;
}
function timeText(value){
  const at=Date.parse(String(value||''));
  if(!Number.isFinite(at))return '';
  return new Date(at).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'});
}
function setText(id,value){
  const el=$(id);if(el&&value!==undefined&&value!==null&&el.textContent!==String(value))el.textContent=String(value);
}
function setBar(id,value){
  const el=$(id);if(!el)return;
  const pct=finite(value)?clamp(Number(value),0,100):0;
  el.style.width=`${pct}%`;
  el.parentElement?.classList.toggle('empty',!finite(value));
}
function mirror(id,value){
  const el=$(id);if(el&&value!==null&&value!==undefined)el.textContent=String(value);
}
function ensureOutsideMirror(){
  if($('outsideTemperature'))return $('outsideTemperature');
  const el=document.createElement('span');
  el.id='outsideTemperature';el.hidden=true;el.dataset.ms8264Mirror='1';
  document.body.appendChild(el);return el;
}

function snapshot(){
  const l=live(),d=diagnostics(),t=technical(),c=climate();
  const b=l.battery||{},db=d.battery||{},solar=l.solar||{},ds=d.solar||{},ac=l.ac||{},tanks=l.tanks||{};
  const soc=firstNum(b.soc,metric(db.soc),t.houseSoc,domNum(['techHouseSoc','ms71510HouseSoc','mgSoc']));
  const voltage=firstNum(b.voltage,metric(db.voltage),t.houseVoltage,domNum(['techHouseVoltage','ms71510HouseVoltage','mgVolt']));
  const current=firstNum(b.current,metric(db.current),t.houseCurrent,domNum(['techHouseCurrent','ms71510HouseCurrent','mgAmp']));
  let power=firstNum(b.power,metric(db.power),t.housePower);
  if(power===null&&voltage!==null&&current!==null)power=voltage*current;
  const startVoltage=firstNum(b.starterVoltage,metric(db.starterVoltage),t.startVoltage,domNum(['techStartVoltage','ms71510StartVoltage','mgStartVoltage']));
  const fuelPct=firstNum(tanks.fuel?.levelPct,t.fuelPct,domNum(['mg-fuel','techFuelPct','ms71510Fuel']));
  const waterPct=firstNum(tanks.water?.levelPct,t.waterPct,domNum(['mg-water','techWaterPct']));
  const wastePct=firstNum(tanks.waste?.levelPct,t.wastePct,domNum(['techWastePct']));
  const fuelLiters=firstNum(tanks.fuel?.remainingLiters);
  const waterLiters=firstNum(tanks.water?.remainingLiters);
  const solarPower=firstNum(solar.power,metric(ds.power),t.solarPower,domNum(['liveSolarYieldPower','mgSolar']));
  const shoreVoltage=firstNum(ac.inputVoltage,t.shoreVoltage);
  let shore=typeof ac.shoreConnected==='boolean'?ac.shoreConnected:null;
  if(shore===null&&typeof t.shorePower==='boolean')shore=t.shorePower;
  if(shore===null&&shoreVoltage!==null)shore=shoreVoltage>=180&&shoreVoltage<=280?true:shoreVoltage<80?false:null;
  const salonTemp=firstNum(c?.salon?.temperature,window.MIJSERENITY_VRM_DATA?.salon?.temperature,domNum(['ivmsCabinTemp']));
  const salonHumidity=firstNum(c?.salon?.humidity,window.MIJSERENITY_VRM_DATA?.salon?.humidity,domNum(['ivmsCabinHumidity']));
  const machineTemp=firstNum(c?.forward?.temperature,window.MIJSERENITY_VRM_DATA?.machinekamer?.temperature,domNum(['ivmsForwardTemp']));
  const machineHumidity=firstNum(c?.forward?.humidity,window.MIJSERENITY_VRM_DATA?.machinekamer?.humidity,domNum(['ivmsForwardHumidity']));
  const sampledAt=l.sampledAt||t.liveTechnicalAt||t.updatedAt||d.sampledAt||d.sampled_at||'';
  const climateAt=window.MIJSERENITY_VRM_DATA?.updatedAt||c?.updatedAt||'';
  return {soc,voltage,current,power,startVoltage,fuelPct,waterPct,wastePct,fuelLiters,waterLiters,solarPower,shoreVoltage,shore,salonTemp,salonHumidity,machineTemp,machineHumidity,sampledAt,climateAt};
}

function meterCard(id,icon,label,target){
  return `<button type="button" class="ms8264-meter" data-ms8264-go="${target}"><span class="ms8264-icon">${icon}</span><div class="ms8264-copy"><small>${label}</small><strong id="${id}">—</strong><em id="${id}Sub">Wachten op live data</em><i class="ms8264-bar"><b id="${id}Bar"></b></i></div></button>`;
}
function ensureStyle(){
  if($(STYLE))return;
  const style=document.createElement('style');style.id=STYLE;
  style.textContent=`
  #${ROOT} .ms8264-instruments{margin:0 0 19px;padding:18px;border:1px solid rgba(79,199,241,.30);border-radius:24px;background:linear-gradient(145deg,rgba(3,31,48,.96),rgba(2,19,31,.98));box-shadow:0 14px 34px rgba(0,0,0,.14)}
  #${ROOT} .ms8264-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 2px 14px}
  #${ROOT} .ms8264-head small{display:block;color:#27dcfa;font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}
  #${ROOT} .ms8264-head strong{display:block;margin-top:3px;font-size:18px;letter-spacing:-.02em}
  #${ROOT} .ms8264-badge{display:flex;align-items:center;gap:7px;min-height:30px;padding:0 10px;border:1px solid rgba(74,213,159,.32);border-radius:999px;background:rgba(17,73,61,.40);color:#a9f3d5;font-size:9px;font-weight:900;letter-spacing:.10em;text-transform:uppercase;white-space:nowrap}
  #${ROOT} .ms8264-badge:before{content:"";width:7px;height:7px;border-radius:50%;background:#39d98a;box-shadow:0 0 0 3px rgba(57,217,138,.10)}
  #${ROOT} .ms8264-badge.stale{border-color:rgba(247,190,79,.32);background:rgba(94,66,18,.35);color:#ffd98b}
  #${ROOT} .ms8264-badge.stale:before{background:#f4b74f}
  #${ROOT} .ms8264-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
  #${ROOT} .ms8264-meter{display:grid;grid-template-columns:34px minmax(0,1fr);gap:10px;align-items:center;min-width:0;min-height:99px;padding:12px;border:1px solid rgba(85,188,227,.26);border-radius:18px;background:linear-gradient(145deg,rgba(7,48,69,.92),rgba(3,29,44,.88));color:#fff;text-align:left;box-shadow:inset 0 1px rgba(255,255,255,.035);cursor:pointer}
  #${ROOT} .ms8264-meter:active{transform:scale(.985)}
  #${ROOT} .ms8264-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:12px;background:rgba(36,207,245,.10);font-size:20px}
  #${ROOT} .ms8264-copy{min-width:0}
  #${ROOT} .ms8264-copy small{display:block;color:#91adbd;font-size:9px;font-weight:900;letter-spacing:.11em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #${ROOT} .ms8264-copy strong{display:block;margin-top:3px;font-size:19px;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #${ROOT} .ms8264-copy em{display:block;margin-top:5px;color:#a8bdc8;font-size:9.5px;font-style:normal;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #${ROOT} .ms8264-bar{display:block;height:3px;margin-top:8px;border-radius:999px;background:rgba(174,215,230,.12);overflow:hidden}
  #${ROOT} .ms8264-bar b{display:block;width:0;height:100%;border-radius:inherit;background:#22d8ff;transition:width .45s ease}
  #${ROOT} .ms8264-bar.empty{opacity:.25}
  @media(max-width:700px){#${ROOT} .ms8264-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:430px){
    #${ROOT} .ms8264-instruments{padding:14px;border-radius:21px}
    #${ROOT} .ms8264-grid{gap:8px}
    #${ROOT} .ms8264-meter{grid-template-columns:30px minmax(0,1fr);gap:8px;min-height:92px;padding:10px;border-radius:16px}
    #${ROOT} .ms8264-icon{width:30px;height:30px;border-radius:10px;font-size:17px}
    #${ROOT} .ms8264-copy strong{font-size:17px}
    #${ROOT} .ms8264-copy em{font-size:8.8px}
  }
  `;
  document.head.appendChild(style);
}
function navigate(target){
  try{if(typeof window.ms8263Navigate==='function'){window.ms8263Navigate(target);return}}catch{}
  try{if(typeof window.captainNavigate==='function')window.captainNavigate(target)}catch{}
}
function mount(){
  const root=$(ROOT);if(!root)return false;
  ensureStyle();
  if($(PANEL))return true;
  const status=root.querySelector('.ms8263-status');
  if(!status)return false;
  const section=document.createElement('section');section.id=PANEL;section.className='ms8264-instruments';section.setAttribute('aria-label','Live Victron en sensoren');
  section.innerHTML=`
    <div class="ms8264-head"><div><small>Live aan boord</small><strong>Victron &amp; sensoren</strong></div><span id="ms8264LiveBadge" class="ms8264-badge stale">Verbinden…</span></div>
    <div class="ms8264-grid">
      ${meterCard('ms8264House','🔋','Huishoudaccu','technical')}
      ${meterCard('ms8264Start','⚡','Startaccu','technical')}
      ${meterCard('ms8264Fuel','⛽','Dieseltank','technical')}
      ${meterCard('ms8264Water','💧','Drinkwater','technical')}
      ${meterCard('ms8264Outside','🌤️','Buitentemp.','weather')}
      ${meterCard('ms8264Salon','🌡️','Salon','technical')}
      ${meterCard('ms8264Machine','🛠️','Machinekamer','technical')}
      ${meterCard('ms8264Solar','☀️','Zon / walstroom','technical')}
    </div>`;
  status.insertAdjacentElement('afterend',section);
  section.querySelectorAll('[data-ms8264-go]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.ms8264Go)));
  queuePaint();
  return true;
}

function paint(){
  frame=0;
  if(!mount())return;
  syncWeatherCache();
  const s=snapshot();
  const soc=finite(s.soc)?clamp(s.soc,0,100):null;
  setText('ms8264House',soc!==null?`${Math.round(soc)}%`:'—%');
  setText('ms8264HouseSub',[finite(s.voltage)?fmt(s.voltage,2,' V'):'',finite(s.current)?signed(s.current,1,' A'):'',finite(s.power)?signed(s.power,0,' W'):''].filter(Boolean).join(' · ')||'Wachten op Victron');
  setBar('ms8264HouseBar',soc);

  setText('ms8264Start',finite(s.startVoltage)?fmt(s.startVoltage,2,' V'):'— V');
  setText('ms8264StartSub',!finite(s.startVoltage)?'Wachten op Victron':s.startVoltage>=12.2?'Spanning in orde':s.startVoltage>=12?'Laag · controleren':'Laag');
  setBar('ms8264StartBar',finite(s.startVoltage)?clamp((s.startVoltage-11.5)/1.4*100,0,100):null);

  setText('ms8264Fuel',finite(s.fuelPct)?`${Math.round(s.fuelPct)}%`:'—%');
  setText('ms8264FuelSub',finite(s.fuelLiters)?`${Math.round(s.fuelLiters)} L · Victron tank`:(finite(s.fuelPct)?'Victron tankniveau':'Geen tankmeting'));
  setBar('ms8264FuelBar',s.fuelPct);

  setText('ms8264Water',finite(s.waterPct)?`${Math.round(s.waterPct)}%`:'—%');
  setText('ms8264WaterSub',finite(s.waterLiters)?`${Math.round(s.waterLiters)} L · Victron tank`:(finite(s.waterPct)?'Victron tankniveau':'Geen tankmeting'));
  setBar('ms8264WaterBar',s.waterPct);

  const outsideTemp=firstNum(outside.temperature,domNum(['weatherTemperature','weatherCurrentTemp','currentTemperature','msWeatherTemperature']));
  setText('ms8264Outside',finite(outsideTemp)?fmt(outsideTemp,1,' °C'):'— °C');
  setText('ms8264OutsideSub',finite(outsideTemp)?`${outside.source||'Weer'}${timeText(outside.sampledAt)?' · '+timeText(outside.sampledAt):''}`:'Actuele buitenwaarde laden…');
  setBar('ms8264OutsideBar',null);

  setText('ms8264Salon',finite(s.salonTemp)?fmt(s.salonTemp,1,' °C'):'— °C');
  setText('ms8264SalonSub',finite(s.salonHumidity)?`${Math.round(s.salonHumidity)}% RV · Ruuvi`:(finite(s.salonTemp)?'Ruuvi · VRM':'Ruuvi wacht op data'));
  setBar('ms8264SalonBar',null);

  setText('ms8264Machine',finite(s.machineTemp)?fmt(s.machineTemp,1,' °C'):'— °C');
  setText('ms8264MachineSub',finite(s.machineHumidity)?`${Math.round(s.machineHumidity)}% RV · Ruuvi`:(finite(s.machineTemp)?'Ruuvi · VRM':'Ruuvi wacht op data'));
  setBar('ms8264MachineBar',null);

  setText('ms8264Solar',finite(s.solarPower)?fmt(s.solarPower,0,' W'):'— W');
  const shoreText=s.shore===true?`Wal ${finite(s.shoreVoltage)?fmt(s.shoreVoltage,0,' V'):'aan'}`:s.shore===false?'Geen walstroom':'Wal onbekend';
  setText('ms8264SolarSub',`${shoreText}${finite(s.wastePct)?` · zwartwater ${Math.round(s.wastePct)}%`:''}`);
  setBar('ms8264SolarBar',null);

  /* Feed the approved top cards from the actual data source, not old placeholder DOM. */
  if(soc!==null){
    mirror('ms71510HouseSoc',`${Math.round(soc)}%`);mirror('houseSoc',`${Math.round(soc)}%`);mirror('batterySoc',`${Math.round(soc)}%`);mirror('victronSoc',`${Math.round(soc)}%`);
    setText('ms8263Soc',`${Math.round(soc)}%`);
  }
  if(finite(s.voltage)){mirror('ms71510HouseVoltage',fmt(s.voltage,2,' V'));mirror('houseVoltage',fmt(s.voltage,2,' V'))}
  if(finite(s.current)){mirror('ms71510HouseCurrent',signed(s.current,1,' A'));mirror('houseCurrent',signed(s.current,1,' A'))}
  setText('ms8263BatterySub',[finite(s.voltage)?fmt(s.voltage,2,' V'):'',finite(s.current)?signed(s.current,1,' A'):''].filter(Boolean).join(' · ')||'Geen live data');
  if(finite(outsideTemp)){
    ensureOutsideMirror().textContent=fmt(outsideTemp,1,' °C');
    setText('ms8263Outside',fmt(outsideTemp,1,'°'));
    setText('ms8263OutsideSub','Actueel weer');
  }

  const sources=[s.sampledAt,s.climateAt,outside.sampledAt].map(v=>({v,age:ageMs(v)})).filter(x=>Number.isFinite(x.age));
  const freshest=sources.sort((a,b)=>a.age-b.age)[0];
  const badge=$('ms8264LiveBadge');
  if(badge){
    const fresh=Boolean(freshest&&freshest.age<3*60*1000);
    badge.classList.toggle('stale',!fresh);
    badge.textContent=fresh?`Live${timeText(freshest.v)?' · '+timeText(freshest.v):''}`:(freshest?`Laatste · ${timeText(freshest.v)}`:'Verbinden…');
  }
}
function queuePaint(){
  if(frame)return;
  frame=requestAnimationFrame(paint);
}

function coordsFromDashboard(){
  const text=cleanText($('ms8263LocationSub')?.textContent).replace(',','.');
  const matches=text.match(/-?\d+(?:\.\d+)?/g)||[];
  if(matches.length>=2){
    const lat=Number(matches[0]),lon=Number(matches[1]);
    if(Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180)return {lat,lon};
  }
  return null;
}
function getPosition(){
  const known=coordsFromDashboard();if(known)return Promise.resolve(known);
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){reject(new Error('GPS niet beschikbaar'));return}
    navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lon:p.coords.longitude}),reject,{enableHighAccuracy:false,maximumAge:120000,timeout:8000});
  });
}
async function refreshOutside(force=false){
  if(outsideBusy||document.hidden||(!force&&Date.now()-lastOutsideFetch<5*60*1000))return false;
  outsideBusy=true;lastOutsideFetch=Date.now();
  try{
    const {lat,lon}=await getPosition();
    const params=new URLSearchParams({latitude:Number(lat).toFixed(5),longitude:Number(lon).toFixed(5),current:'temperature_2m,apparent_temperature',timezone:'auto'});
    const response=await fetch(`https://api.open-meteo.com/v1/forecast?${params}`,{cache:'no-store',headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    const temperature=num(data?.current?.temperature_2m);
    if(temperature===null)throw new Error('Geen temperatuur');
    outside={temperature,apparent:num(data?.current?.apparent_temperature),sampledAt:data?.current?.time||new Date().toISOString(),source:'Buitenweer'};
    queuePaint();return true;
  }catch(error){
    console.debug('Buitentemperatuur dashboard:',error);
    syncWeatherCache();queuePaint();return false;
  }finally{outsideBusy=false}
}
async function refreshLive(force=false){
  if(liveBusy||document.hidden||(!force&&Date.now()-lastLiveRefresh<55000))return false;
  const refresh=window.ms71915RefreshEnergy;
  if(typeof refresh!=='function')return false;
  liveBusy=true;lastLiveRefresh=Date.now();
  try{await refresh();queuePaint();return true}catch(error){console.debug('Victron dashboard refresh:',error);return false}finally{liveBusy=false}
}

function start(){
  mount();syncWeatherCache();queuePaint();
  [250,900,2200,5000].forEach(ms=>setTimeout(()=>{mount();queuePaint();if(ms>=900)refreshLive(false);if(ms>=2200)refreshOutside(false)},ms));
  const root=$(ROOT);
  if(root){
    const observer=new MutationObserver(()=>{if(!$(PANEL))mount();queuePaint()});
    observer.observe(root,{childList:true,subtree:false});
  }
  [
    'mijnserenity-vrm-energy-live-updated','mijnserenity-vrm-diagnostics-updated','mijnserenity-ruuvi-vrm-updated',
    'mijnserenity-vrm-updated','mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity:live-values-ready',
    'mijnserenity:live-core-ready','mijnserenity:dashboard-ready'
  ].forEach(name=>window.addEventListener(name,queuePaint,{passive:true}));
  window.addEventListener('focus',()=>{mount();queuePaint();refreshLive(false);refreshOutside(false)},{passive:true});
  window.addEventListener('pageshow',()=>{mount();queuePaint();refreshLive(false);refreshOutside(false)},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){mount();queuePaint();refreshLive(false);refreshOutside(false)}},{passive:true});
  setInterval(()=>{if(!document.hidden){mount();queuePaint()}},3000);
  setInterval(()=>{if(!document.hidden){refreshLive(false);refreshOutside(false)}},60000);
}

window.ms8264RefreshDashboardLive=()=>Promise.allSettled([refreshLive(true),refreshOutside(true)]);
window.ms8264RenderDashboardLive=queuePaint;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();