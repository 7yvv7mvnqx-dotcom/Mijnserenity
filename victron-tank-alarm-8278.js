/* MijnSerenity 8.27.8 — server-side Victron tankstatus + actieve alarmen op Start. */
(()=>{
'use strict';
if(window.__msVictronTankAlarm8278)return;
window.__msVictronTankAlarm8278=true;

const PANEL='ms8264LiveInstruments';
const STYLE='ms8278VictronTankAlarmStyle';
const STATUS='ms8278VictronAlarmStatus';
const $=id=>document.getElementById(id);
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const num=v=>finite(v)?Number(v):null;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
let cloud={};
let cloudUpdatedAt='';
let busy=false;
let lastLoad=0;
let timer=0;

function ageMs(value){const t=Date.parse(String(value||''));return Number.isFinite(t)?Math.max(0,Date.now()-t):Infinity}
function hhmm(value){const t=Date.parse(String(value||''));return Number.isFinite(t)?new Date(t).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}):''}
function live(){const v=window.MIJSERENITY_VRM_LIVE_ENERGY;return v&&typeof v==='object'&&v.success!==false?v:{}}
function technical(){
  let local={};
  try{if(typeof technicalStateCache!=='undefined'&&technicalStateCache&&typeof technicalStateCache==='object')local=technicalStateCache}catch(_){}
  return {...local,...cloud};
}
function setText(id,value){const el=$(id);if(el&&value!==undefined&&value!==null&&el.textContent!==String(value))el.textContent=String(value)}
function setBar(id,value){const el=$(id);if(!el)return;const pct=finite(value)?clamp(Number(value),0,100):0;el.style.width=`${pct}%`;el.parentElement?.classList.toggle('empty',!finite(value))}

function ensureStyle(){
  if($(STYLE))return;
  const s=document.createElement('style');s.id=STYLE;s.textContent=`
  #${PANEL} .ms8278-victron-status{display:flex;align-items:flex-start;gap:10px;margin:0 0 12px;padding:10px 12px;border:1px solid rgba(74,213,159,.30);border-radius:15px;background:rgba(17,73,61,.22);color:#baf3dc;font-size:10px;line-height:1.35}
  #${PANEL} .ms8278-victron-status .dot{flex:0 0 auto;width:8px;height:8px;margin-top:2px;border-radius:50%;background:#39d98a;box-shadow:0 0 0 3px rgba(57,217,138,.10)}
  #${PANEL} .ms8278-victron-status strong{display:block;color:#eafff6;font-size:10px;letter-spacing:.04em}
  #${PANEL} .ms8278-victron-status small{display:block;margin-top:2px;color:inherit;font-size:9px}
  #${PANEL} .ms8278-victron-status.warning{border-color:rgba(247,190,79,.38);background:rgba(94,66,18,.28);color:#ffe0a0}
  #${PANEL} .ms8278-victron-status.warning .dot{background:#f4b74f}
  #${PANEL} .ms8278-victron-status.critical{border-color:rgba(255,91,91,.45);background:rgba(105,25,31,.30);color:#ffc5c5}
  #${PANEL} .ms8278-victron-status.critical .dot{background:#ff6161;box-shadow:0 0 0 3px rgba(255,97,97,.12)}
  #${PANEL} .ms8278-victron-status.stale{border-color:rgba(154,178,191,.25);background:rgba(78,96,108,.16);color:#aebfc8}
  #${PANEL} .ms8278-victron-status.stale .dot{background:#8aa0ad;box-shadow:none}
  `;document.head.appendChild(s);
}
function ensureStatus(){
  const panel=$(PANEL);if(!panel)return null;ensureStyle();
  let box=$(STATUS);if(box)return box;
  box=document.createElement('div');box.id=STATUS;box.className='ms8278-victron-status stale';box.innerHTML='<span class="dot"></span><div><strong>Victron alarmstatus laden…</strong><small>Wachten op Cerbo/VRM</small></div>';
  const grid=panel.querySelector('.ms8264-grid');if(grid)grid.insertAdjacentElement('beforebegin',box);else panel.appendChild(box);
  return box;
}

function bestWater(){
  const l=live(),t=technical(),liveTank=l?.tanks?.water;
  if(finite(liveTank?.levelPct)&&ageMs(l.sampledAt)<=10*60*1000)return {value:Number(liveTank.levelPct),at:l.sampledAt,fresh:true,source:'Victron live'};
  const at=t.victronTankSampledAt||cloudUpdatedAt||'';
  if(t.victronWaterAvailable!==false&&finite(t.waterPct))return {value:Number(t.waterPct),at,fresh:ageMs(at)<=6*60*1000,source:'Victron'};
  return {value:null,at,fresh:false,source:'Victron'};
}
function bestFuel(){
  const l=live(),t=technical(),liveTank=l?.tanks?.fuel;
  if(finite(liveTank?.levelPct)&&ageMs(l.sampledAt)<=10*60*1000)return {value:Number(liveTank.levelPct),at:l.sampledAt,fresh:true};
  const at=t.victronTankSampledAt||cloudUpdatedAt||'';
  return finite(t.fuelPct)?{value:Number(t.fuelPct),at,fresh:ageMs(at)<=6*60*1000}:{value:null,at,fresh:false};
}
function alarms(){
  const t=technical(),at=t.victronAlarmSampledAt||cloudUpdatedAt||'';
  const list=Array.isArray(t.victronAlarms)?t.victronAlarms:[];
  const count=finite(t.victronAlarmCount)?Number(t.victronAlarmCount):list.length;
  const level=String(t.victronAlarmLevel|| (list.some(a=>a?.level==='critical')?'critical':count?'warning':'good'));
  return {list,count,level,at,fresh:ageMs(at)<=6*60*1000};
}

function paint(){
  if(!$(PANEL))return;
  const water=bestWater();
  setText('ms8264Water',finite(water.value)?`${Math.round(water.value)}%`:'—%');
  setBar('ms8264WaterBar',water.value);
  setText('ms8264WaterSub',finite(water.value)
    ?`${water.fresh?'Victron live':'Laatste Victron-meting'}${hhmm(water.at)?' · '+hhmm(water.at):''}`
    :'Geen actuele Victron-tankmeting');
  if(finite(water.value)){
    setText('techWaterPct',`${Math.round(water.value)}%`);
    setText('mg-water',`${Math.round(water.value)}%`);
  }

  const fuel=bestFuel();
  if(finite(fuel.value)){
    setText('ms8264Fuel',`${Math.round(fuel.value)}%`);setBar('ms8264FuelBar',fuel.value);
    setText('ms8264FuelSub',`${fuel.fresh?'Victron live':'Laatste Victron-meting'}${hhmm(fuel.at)?' · '+hhmm(fuel.at):''}`);
  }

  const a=alarms(),box=ensureStatus();if(!box)return;
  box.classList.remove('critical','warning','stale');
  if(!a.fresh){
    box.classList.add('stale');
    box.innerHTML=`<span class="dot"></span><div><strong>Victron alarmstatus niet actueel</strong><small>${hhmm(a.at)?'Laatste controle '+hhmm(a.at):'Wachten op achtergrondcontrole'}</small></div>`;
    return;
  }
  if(a.count<=0){
    box.innerHTML=`<span class="dot"></span><div><strong>Victron · geen actieve alarmen</strong><small>Gecontroleerd ${hhmm(a.at)||'zojuist'} · achtergrondbewaking actief</small></div>`;
    return;
  }
  const critical=a.level==='critical'||a.list.some(x=>x?.level==='critical');
  box.classList.add(critical?'critical':'warning');
  const titles=a.list.slice(0,3).map(x=>String(x?.title||x?.code||'Victron alarm')).join(' · ');
  box.innerHTML=`<span class="dot"></span><div><strong>${critical?'Victron alarm':'Victron waarschuwing'} · ${a.count} actief</strong><small>${titles||'Controleer Victron/Cerbo'}${a.count>3?' · +'+(a.count-3):''}</small></div>`;
}

async function loadCloud(force=false){
  if(busy||(!force&&Date.now()-lastLoad<25000))return false;
  let client=null,boat=null,user=null;
  try{client=typeof sb!=='undefined'?sb:null;boat=typeof currentBoat!=='undefined'?currentBoat:null;user=typeof currentUser!=='undefined'?currentUser:null}catch(_){}
  if(!client||!boat?.id||!user)return false;
  busy=true;lastLoad=Date.now();
  try{
    const {data,error}=await client.from('technical_state').select('data,updated_at').eq('boat_id',boat.id).maybeSingle();
    if(error)throw error;
    if(data?.data&&typeof data.data==='object'){
      cloud=data.data;cloudUpdatedAt=data.updated_at||'';
      try{if(typeof technicalStateCache!=='undefined'&&technicalStateCache&&typeof technicalStateCache==='object')Object.assign(technicalStateCache,data.data)}catch(_){}
      paint();return true;
    }
  }catch(error){console.debug('Victron tank/alarm cloud sync:',error)}finally{busy=false}
  return false;
}

function wake(force=false){clearTimeout(timer);timer=setTimeout(()=>{ensureStatus();paint();loadCloud(force)},50)}
function start(){
  [100,600,1600,3500].forEach((ms,i)=>setTimeout(()=>wake(i===1),ms));
  ['mijnserenity:dashboard-ready','mijnserenity-vrm-energy-live-updated','mijnserenity-vrm-diagnostics-updated','mijnserenity:routechange'].forEach(name=>window.addEventListener(name,()=>wake(false),{passive:true}));
  window.addEventListener('focus',()=>wake(true),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake(true)},{passive:true});
  setInterval(()=>{if(!document.hidden){paint();loadCloud(false)}},30000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.ms8278RefreshVictron=()=>loadCloud(true);
})();
