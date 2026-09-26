/* MijnSerenity 8.31.0 — live Victron startdashboard; bestaande Snel-naar-kaarten blijven intact. */
(()=>{
'use strict';
if(window.__msVictronStart8310)return;
window.__msVictronStart8310=true;
const ROOT='ms8210Start', ID='ms8310LiveDashboard', STYLE='ms8310LiveStyle';
const HERO='/serenity-dashboard-boat-20260926.webp?v=831000';
const $=id=>document.getElementById(id);
const ok=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const num=v=>ok(v&&typeof v==='object'&&'value'in v?v.value:v)?Number(v&&typeof v==='object'&&'value'in v?v.value:v):null;
const first=(...a)=>{for(const v of a){const n=num(v);if(n!==null)return n}return null};
const fmt=(v,d,u)=>ok(v)?Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d})+(u||''):'—'+(u||'');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let tab='overview',shoreLimit=6;

function tech(){
  try{
    if(typeof technicalStateCache!=='undefined'&&technicalStateCache)return technicalStateCache;
    if(typeof readTechnicalLocalState==='function')return readTechnicalLocalState()||{};
  }catch(e){}
  return {};
}
function climate(){
  try{if(typeof window.ms7102GetRuuviClimate==='function')return window.ms7102GetRuuviClimate()||{}}catch(e){}
  const v=window.MIJSERENITY_VRM_DATA||{};
  return {salon:v.salon||null,forward:v.machinekamer||null};
}
function domn(ids){
  for(const id of ids){
    const m=String($(id)?.textContent||'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    if(m&&ok(m[0]))return Number(m[0]);
  }
  return null;
}
function snap(){
  const l=(window.MIJSERENITY_VRM_LIVE_ENERGY&&window.MIJSERENITY_VRM_LIVE_ENERGY.success!==false)?window.MIJSERENITY_VRM_LIVE_ENERGY:{};
  const d=window.MIJSERENITY_VRM_DIAGNOSTICS||{},t=tech(),c=climate();
  const b=l.battery||{},db=d.battery||{},solar=l.solar||{},ds=d.solar||{},ac=l.ac||{},dc=l.dc||{},alt=l.alternator||l.dynamo||{},tanks=l.tanks||{};
  const soc=first(b.soc,db.soc,t.houseSoc,domn(['msrHousePct','ms8264House','ms71510HouseSoc']));
  const voltage=first(b.voltage,db.voltage,t.houseVoltage,domn(['ms71510HouseVoltage','mgVolt']));
  const current=first(b.current,db.current,t.houseCurrent,domn(['ms71510HouseCurrent','mgAmp']));
  let power=first(b.power,db.power,t.housePower); if(power===null&&voltage!==null&&current!==null)power=voltage*current;
  const solarPower=first(solar.power,ds.power,t.solarPower,domn(['liveSolarYieldPower','mgSolar']));
  const acLoad=first(ac.outputPower,ac.loadPower,ac.consumptionPower,ac.loads,ac.powerOut,ac.outPower);
  const acIn=first(ac.inputPower,ac.gridPower,ac.shorePower,ac.powerIn,ac.inPower);
  const dcCurrent=first(dc.current,dc.loadCurrent,dc.loadsCurrent,dc.consumptionCurrent);
  const altCurrent=first(alt.current,alt.outputCurrent,l.alternatorCurrent,l.dynamoCurrent);
  const shoreV=first(ac.inputVoltage,t.shoreVoltage);
  let shore=typeof ac.shoreConnected==='boolean'?ac.shoreConnected:null;
  if(shore===null&&typeof t.shorePower==='boolean')shore=t.shorePower;
  if(shore===null&&shoreV!==null)shore=shoreV>=180&&shoreV<=280?true:shoreV<80?false:null;
  let mode=String(ac.mode||l.inverter?.mode||l.multiplus?.mode||l.vebus?.mode||'').replace(/_/g,' ').trim();
  if(!mode)mode=shore===true?'Laden / net':'Uit';
  return {
    soc,voltage,current,power,solarPower,acLoad,acIn,dcCurrent,altCurrent,shoreV,shore,mode,
    water:first(tanks.water?.levelPct,t.waterPct,domn(['msrWaterPct','techWaterLevel'])),
    fuel:first(tanks.fuel?.levelPct,t.fuelPct,domn(['msrFuelPct','techFuelLevel'])),
    waste:first(tanks.waste?.levelPct,t.wastePct,domn(['techWasteLevel'])),
    waterL:first(tanks.water?.remainingLiters),fuelL:first(tanks.fuel?.remainingLiters),
    salon:first(c.salon?.temperature,window.MIJSERENITY_VRM_DATA?.salon?.temperature),
    salonH:first(c.salon?.humidity,window.MIJSERENITY_VRM_DATA?.salon?.humidity),
    machine:first(c.forward?.temperature,window.MIJSERENITY_VRM_DATA?.machinekamer?.temperature),
    machineH:first(c.forward?.humidity,window.MIJSERENITY_VRM_DATA?.machinekamer?.humidity),
    at:l.sampledAt||t.liveTechnicalAt||t.updatedAt||d.sampledAt||d.sampled_at||''
  };
}
function css(){
 if($(STYLE))return;
 const s=document.createElement('style');s.id=STYLE;s.textContent=
 '#'+ROOT+'.ms8310 #'+ID+'{display:grid;grid-template-columns:minmax(170px,.68fr) minmax(470px,1.75fr) minmax(170px,.68fr);gap:10px;min-height:0;height:100%;overflow:hidden}'+
 '#'+ROOT+'.ms8310 .ms8263-main{grid-template-rows:clamp(142px,19vh,178px) minmax(0,1fr)!important;gap:.75vh!important}'+
 '#'+ROOT+'.ms8310 .ms8310-old{display:none!important}'+
 '#'+ROOT+'.ms8310 .msr-hero{background-image:url("'+HERO+'")!important;background-position:center 58%!important}'+
 '#'+ROOT+'.ms8310 .msr-hero-bg{object-position:center 58%!important}'+
 '#'+ROOT+' .v8310-stack{display:grid;grid-template-rows:1fr 1fr;gap:10px;min-height:0}'+
 '#'+ROOT+' .v8310-card,#'+ROOT+' .v8310-main{border:1px solid rgba(41,162,218,.58);border-radius:18px;background:linear-gradient(145deg,rgba(5,43,64,.97),rgba(2,23,37,.98));box-shadow:inset 0 1px rgba(255,255,255,.05),0 12px 26px rgba(0,0,0,.18);color:#fff;overflow:hidden}'+
 '#'+ROOT+' .v8310-card{padding:11px;display:flex;flex-direction:column;text-align:left}'+
 '#'+ROOT+' .v8310-head{display:flex;align-items:center;justify-content:space-between;gap:7px}'+
 '#'+ROOT+' .v8310-name{display:flex;align-items:center;gap:8px;min-width:0}'+
 '#'+ROOT+' .v8310-ico{display:grid;place-items:center;width:34px;height:34px;flex:0 0 34px;border-radius:50%;background:linear-gradient(145deg,#1087e1,#075b9f);font-size:18px}'+
 '#'+ROOT+' .v8310-name strong{display:block;font-size:14px;line-height:1}#'+ROOT+' .v8310-name small{display:block;margin-top:3px;color:#adc3ce;font-size:8.5px}'+
 '#'+ROOT+' .v8310-arrow{font-size:24px;color:#dff7ff}'+
 '#'+ROOT+' .v8310-tech{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:9px}'+
 '#'+ROOT+' .v8310-tech div{padding:7px;border:1px solid rgba(88,178,216,.22);border-radius:10px;background:rgba(13,57,77,.58)}'+
 '#'+ROOT+' .v8310-tech small{display:block;color:#98b0bd;font-size:7px;text-transform:uppercase}#'+ROOT+' .v8310-tech strong{display:block;margin-top:3px;font-size:10px}'+
 '#'+ROOT+' .v8310-map{position:relative;flex:1;min-height:0;margin-top:8px;border-radius:12px;background:linear-gradient(135deg,#dcecc5 0 28%,#a8def2 28% 62%,#6ac6e7 62%);overflow:hidden}'+
 '#'+ROOT+' .v8310-map:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(18deg,transparent 0 31px,rgba(255,255,255,.36) 32px 33px)}'+
 '#'+ROOT+' .v8310-map b{position:absolute;left:54%;top:42%;font-size:25px;transform:rotate(-28deg);color:#082336}#'+ROOT+' .v8310-map span{position:absolute;left:7px;right:7px;bottom:6px;padding:5px 7px;border-radius:7px;background:rgba(2,24,37,.72);font-size:8px;color:#fff}'+
 '#'+ROOT+' .v8310-main{padding:10px;display:grid;grid-template-rows:auto minmax(0,1fr) auto auto;gap:7px;background:radial-gradient(circle at 50% 24%,rgba(27,119,169,.17),transparent 38%),linear-gradient(180deg,#06243a,#031826)}'+
 '#'+ROOT+' .v8310-live{display:flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;border:1px solid rgba(52,228,118,.4);background:rgba(20,159,75,.27);color:#a5f6c2;font-size:8px;font-weight:900}#'+ROOT+' .v8310-live:before{content:"";width:7px;height:7px;border-radius:50%;background:#2bdd76;box-shadow:0 0 9px #2bdd76}'+
 '#'+ROOT+' .v8310-live.stale{border-color:#9d782d;background:rgba(113,76,19,.3);color:#ffdc91}#'+ROOT+' .v8310-live.stale:before{background:#f0b949;box-shadow:none}'+
 '#'+ROOT+' .v8310-panels{min-height:0;overflow:hidden}#'+ROOT+' .v8310-panel{display:none;height:100%}#'+ROOT+' .v8310-panel.active{display:block}'+
 '#'+ROOT+' .v8310-flow{height:100%;display:grid;grid-template-columns:1fr 1.28fr 1fr;grid-template-rows:1fr 1fr;grid-template-areas:"solar multi ac" "alt battery dc";gap:7px}'+
 '#'+ROOT+' .v8310-node{position:relative;min-width:0;padding:8px;border:1px solid #2e8dd3;border-radius:10px;background:#f8fafb;color:#151b20;overflow:hidden}'+
 '#'+ROOT+' .v8310-node small{display:block;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#'+ROOT+' .v8310-node strong{display:block;margin-top:3px;font-size:20px;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}#'+ROOT+' .v8310-node em{display:block;margin-top:4px;color:#657680;font-size:7px;font-style:normal}'+
 '#'+ROOT+' .solar{grid-area:solar}#'+ROOT+' .multi{grid-area:multi}#'+ROOT+' .acload{grid-area:ac}#'+ROOT+' .alt{grid-area:alt}#'+ROOT+' .battery{grid-area:battery;padding-bottom:29px}#'+ROOT+' .dcload{grid-area:dc}'+
 '#'+ROOT+' .v8310-bars{position:absolute;left:7px;right:7px;bottom:7px;height:17px;display:flex;gap:3px;align-items:end}#'+ROOT+' .v8310-bars i{flex:1;height:var(--h);border-radius:3px;background:#2e8ede}'+
 '#'+ROOT+' .v8310-batt{position:absolute;left:0;right:0;bottom:0;height:27px;padding:5px 7px;display:flex;justify-content:space-between;background:linear-gradient(90deg,rgba(64,165,232,.78) var(--p),rgba(224,233,238,.85) var(--p));color:#163246;font-size:8px}'+
 '#'+ROOT+' .v8310-tabs{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}#'+ROOT+' .v8310-tabs button{min-height:30px;border:1px solid rgba(71,153,196,.44);border-radius:999px;background:rgba(8,43,63,.76);color:#deedf3;font-size:8px;font-weight:750}#'+ROOT+' .v8310-tabs button.active{background:linear-gradient(#209cff,#087ed8);color:#fff}'+
 '#'+ROOT+' .v8310-controls{display:grid;grid-template-columns:1.7fr .72fr;gap:7px}#'+ROOT+' .v8310-ctl{padding:7px;border:1px solid rgba(69,148,189,.4);border-radius:12px;background:rgba(6,38,56,.72)}#'+ROOT+' .v8310-ctl>strong{display:block;margin-bottom:6px;font-size:8px}'+
 '#'+ROOT+' .v8310-modes{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}#'+ROOT+' .v8310-modes button{min-height:34px;padding:3px;border:1px solid rgba(93,159,194,.34);border-radius:8px;background:#183a50;color:#eef7fa;font-size:7.5px;font-weight:750}#'+ROOT+' .v8310-modes button[data-mode="on"]{background:#0b873e}#'+ROOT+' .v8310-modes button[data-mode="charger"]{background:#0d75cb}'+
 '#'+ROOT+' .v8310-shore{display:grid;grid-template-columns:33px 1fr 33px;gap:5px;align-items:center}#'+ROOT+' .v8310-shore button{height:34px;border:0;border-radius:9px;background:#087bd0;color:#fff;font-size:19px}#'+ROOT+' .v8310-shore b{text-align:center;font-size:16px}#'+ROOT+' .v8310-status{grid-column:1/-1;color:#98afba;font-size:7.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
 '#'+ROOT+' .v8310-info{height:100%;display:grid;grid-template-columns:repeat(3,1fr);gap:7px}#'+ROOT+' .v8310-info div{padding:10px;border:1px solid rgba(78,160,201,.38);border-radius:11px;background:rgba(11,54,74,.66)}#'+ROOT+' .v8310-info small{display:block;color:#9eb5c1;font-size:8px;text-transform:uppercase}#'+ROOT+' .v8310-info strong{display:block;margin-top:6px;font-size:15px}#'+ROOT+' .v8310-info em{display:block;margin-top:5px;color:#c1d0d7;font-size:8px;font-style:normal}'+
 '#'+ROOT+' .v8310-tanks{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;align-items:end;margin-top:auto;padding-top:7px}#'+ROOT+' .v8310-tank{text-align:center}#'+ROOT+' .v8310-tank small{display:block;margin-bottom:4px;font-size:7px;color:#c7d8df}#'+ROOT+' .v8310-box{position:relative;height:57px;border:2px solid rgba(60,169,223,.72);border-radius:9px;background:#092334;overflow:hidden}#'+ROOT+' .v8310-fill{position:absolute;left:4px;right:4px;bottom:4px;height:var(--p);max-height:calc(100% - 8px);border-radius:5px;background:linear-gradient(#25b8ff,#078ce0)}#'+ROOT+' .fuel .v8310-fill{background:linear-gradient(#ffd04f,#e49f13)}#'+ROOT+' .waste .v8310-fill{background:linear-gradient(#aeb8bf,#76848d)}#'+ROOT+' .v8310-tank strong{display:block;margin-top:4px;font-size:10px}'+
 '#'+ROOT+' .v8310-log{position:relative;flex:1;min-height:0;margin-top:8px;border-radius:12px;background:radial-gradient(circle at 61% 69%,#ffd269 0 6%,transparent 7%),linear-gradient(180deg,#4385aa,#dc8c3b 67%,#1b4864 68%);overflow:hidden}#'+ROOT+' .v8310-log:after{content:"";position:absolute;left:-5%;right:-5%;bottom:15%;height:19%;background:repeating-linear-gradient(174deg,rgba(255,255,255,.5) 0 2px,transparent 2px 7px)}#'+ROOT+' .v8310-log span{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:6px 8px;background:rgba(2,22,34,.72);font-size:8px}'+
 '@media(max-width:950px) and (orientation:landscape) and (max-height:520px){#'+ROOT+'.ms8310 .ms8263-main{display:block!important;padding-bottom:80px!important}#'+ROOT+' #'+ID+'{height:auto;min-height:520px;grid-template-columns:1fr 2fr 1fr}}'+
 '@media(max-width:900px) and (orientation:portrait),(max-width:600px){#'+ROOT+'.ms8310 .ms8263-main{display:block!important}#'+ROOT+' #'+ID+'{display:block;height:auto;overflow:visible}#'+ROOT+' .v8310-stack{grid-template-columns:1fr 1fr;grid-template-rows:none;margin-bottom:9px}#'+ROOT+' .v8310-card{min-height:160px}#'+ROOT+' .v8310-main{min-height:590px;margin-bottom:9px}#'+ROOT+' .v8310-flow{min-height:260px}#'+ROOT+' .v8310-controls{grid-template-columns:1fr}}';
 document.head.appendChild(s);
}
function html(){
 const bars=[18,55,42,8,7,6,17,38,26,49,61,45].map(h=>'<i style="--h:'+h+'%"></i>').join('');
 return '<section class="v8310-stack">'+
 '<button class="v8310-card" data-go="technical"><div class="v8310-head"><div class="v8310-name"><span class="v8310-ico">🔧</span><span><strong>Techniek</strong><small>Systemen & onderhoud</small></span></div><span class="v8310-arrow">›</span></div><div class="v8310-tech"><div><small>Victron</small><strong id="v8310Victron">Live</strong></div><div><small>Walstroom</small><strong id="v8310Shore">—</strong></div><div><small>Accu</small><strong id="v8310BatMini">—</strong></div><div><small>Zon</small><strong id="v8310SunMini">—</strong></div></div></button>'+
 '<button class="v8310-card" data-go="map"><div class="v8310-head"><div class="v8310-name"><span class="v8310-ico">🗺️</span><span><strong>Kaart</strong><small>Waterkaarten</small></span></div><span class="v8310-arrow">›</span></div><div class="v8310-map"><b>➤</b><span id="v8310Map">Serenity · GPS</span></div></button></section>'+
 '<section class="v8310-main"><div class="v8310-head"><div class="v8310-name"><span class="v8310-ico">⚡</span><span><strong style="font-size:18px">Victron Energie</strong><small>Live overzicht op het dashboard</small></span></div><span id="v8310Live" class="v8310-live">LIVE</span></div>'+
 '<div class="v8310-panels"><div class="v8310-panel active" data-panel="overview"><div class="v8310-flow">'+
 '<div class="v8310-node solar"><small>☀ Zon opbrengst</small><strong id="v8310Solar">— W</strong><em>SmartSolar</em><div class="v8310-bars">'+bars+'</div></div>'+
 '<div class="v8310-node multi"><small>▣ Omvormer / Lader</small><strong id="v8310Mode">—</strong><em id="v8310ModeSub">MultiPlus-II</em></div>'+
 '<div class="v8310-node acload"><small>∿ AC Belastingen</small><strong id="v8310Ac">— W</strong><em>230 V zijde</em></div>'+
 '<div class="v8310-node alt"><small>⚡ Dynamo</small><strong id="v8310Alt">— A</strong><em>Dynamo / DC-DC</em></div>'+
 '<div class="v8310-node battery"><small>▣ Accu</small><strong id="v8310Soc">—%</strong><em id="v8310State">SmartShunt</em><div id="v8310Batt" class="v8310-batt" style="--p:0%"><span id="v8310Volt">— V</span><span id="v8310Amp">— A</span><span id="v8310Power">— W</span></div></div>'+
 '<div class="v8310-node dcload"><small>⊖ DC Belastingen</small><strong id="v8310Dc">— A</strong><em>12 V systeem</em></div></div></div>'+
 '<div class="v8310-panel" data-panel="levels"><div class="v8310-info"><div><small>Huishoudaccu</small><strong id="v8310LevelBat">—%</strong><em id="v8310LevelBatSub">SmartShunt</em></div><div><small>Drinkwater</small><strong id="v8310LevelWater">—%</strong><em id="v8310LevelWaterSub">Victron tank</em></div><div><small>Diesel</small><strong id="v8310LevelFuel">—%</strong><em id="v8310LevelFuelSub">Tankniveau</em></div></div></div>'+
 '<div class="v8310-panel" data-panel="environment"><div class="v8310-info"><div><small>Salon</small><strong id="v8310Salon">— °C</strong><em id="v8310SalonH">RuuviTag</em></div><div><small>Machinekamer</small><strong id="v8310Machine">— °C</strong><em id="v8310MachineH">RuuviTag</em></div><div><small>Walstroom</small><strong id="v8310EnvShore">—</strong><em id="v8310EnvShoreV">AC ingang</em></div></div></div>'+
 '<div class="v8310-panel" data-panel="messages"><div class="v8310-info"><div><small>Status</small><strong id="v8310Msg">Geen actieve melding</strong><em id="v8310Age">Victron live</em></div><div><small>Walstroom</small><strong id="v8310MsgShore">—</strong><em>Actuele detectie</em></div><div><small>Systeem</small><strong>MijnSerenity</strong><em>Live dashboard actief</em></div></div></div>'+
 '<div class="v8310-panel" data-panel="devices"><div class="v8310-info"><div><small>Cerbo GX</small><strong id="v8310GX">Online</strong><em>VRM</em></div><div><small>SmartShunt</small><strong id="v8310Shunt">Actief</strong><em>Accumeting</em></div><div><small>SmartSolar</small><strong id="v8310MPPT">Actief</strong><em>MPPT</em></div></div></div></div>'+
 '<div class="v8310-tabs"><button class="active" data-tab="overview">⌂ Overzicht</button><button data-tab="levels">▤ Niveaus</button><button data-tab="environment">♨ Omgeving</button><button data-tab="messages">♧ Meldingen</button><button data-tab="devices">☷ Apparaten</button></div>'+
 '<div class="v8310-controls"><div class="v8310-ctl"><strong>▣ MultiPlus bediening</strong><div class="v8310-modes"><button data-mode="on">⏻<br>Aan</button><button data-mode="off">⏻<br>Uit</button><button data-mode="charger">▣<br>Alleen laden</button><button data-mode="inverter">∿<br>Alleen omvormer</button></div></div><div class="v8310-ctl"><strong>🔌 Walstroomlimiet</strong><div class="v8310-shore"><button data-limit="-">−</button><b id="v8310Limit">6 A</b><button data-limit="+">+</button></div></div><div id="v8310Status" class="v8310-status">Live waarden gekoppeld. Bediening wordt alleen verzonden wanneer de Victron-control bridge beschikbaar is.</div></div></section>'+
 '<section class="v8310-stack"><button class="v8310-card" data-go="technical"><div class="v8310-head"><div class="v8310-name"><span class="v8310-ico">💧</span><span><strong>Tanks</strong><small>Live niveaus</small></span></div><span class="v8310-arrow">›</span></div><div class="v8310-tanks"><div class="v8310-tank"><small>Drinkwater</small><div class="v8310-box"><i id="v8310WaterFill" class="v8310-fill" style="--p:0%"></i></div><strong id="v8310Water">—%</strong></div><div class="v8310-tank fuel"><small>Diesel</small><div class="v8310-box"><i id="v8310FuelFill" class="v8310-fill" style="--p:0%"></i></div><strong id="v8310Fuel">—%</strong></div><div class="v8310-tank waste"><small>Zwartwater</small><div class="v8310-box"><i id="v8310WasteFill" class="v8310-fill" style="--p:0%"></i></div><strong id="v8310Waste">—%</strong></div></div></button>'+
 '<button class="v8310-card" data-go="logbook"><div class="v8310-head"><div class="v8310-name"><span class="v8310-ico">📖</span><span><strong>Logboek</strong><small>Laatste tocht</small></span></div><span class="v8310-arrow">›</span></div><div class="v8310-log"><span id="v8310Log">Tik om het logboek te openen</span></div></button></section>';
}
function set(id,v){const e=$(id);if(e&&e.textContent!==String(v))e.textContent=String(v)}
function fill(id,v){const e=$(id);if(e)e.style.setProperty('--p',clamp(ok(v)?Number(v):0,0,100)+'%')}
function nav(to){
 try{if(typeof window.ms8263Navigate==='function')return window.ms8263Navigate(to)}catch(e){}
 try{if(typeof window.captainNavigate==='function')return window.captainNavigate(to)}catch(e){}
 location.hash='#'+to;
}
function showTab(name){
 tab=name||'overview';
 document.querySelectorAll('#'+ID+' [data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 document.querySelectorAll('#'+ID+' [data-panel]').forEach(p=>p.classList.toggle('active',p.dataset.panel===tab));
}
function controlMode(mode){
 const st=$('v8310Status'),bridge=window.MIJSERENITY_VICTRON_CONTROL;
 const fn=bridge&&typeof bridge.setMode==='function'?bridge.setMode.bind(bridge):typeof window.msVictronSetMode==='function'?window.msVictronSetMode:null;
 if(!fn){if(st)st.textContent='MultiPlus niet gewijzigd: de schrijfbare Victron-control bridge is nog niet gekoppeld.';return}
 if(st)st.textContent='MultiPlus-commando verzenden…';
 Promise.resolve(fn(mode)).then(()=>{if(st)st.textContent='MultiPlus-commando verzonden; live status wordt opnieuw ingelezen.';refresh()}).catch(e=>{if(st)st.textContent='Bediening niet uitgevoerd: '+(e?.message||'onbekende fout')});
}
function controlLimit(delta){
 shoreLimit=clamp(shoreLimit+delta,1,10);set('v8310Limit',shoreLimit+' A');
 const st=$('v8310Status'),bridge=window.MIJSERENITY_VICTRON_CONTROL;
 const fn=bridge&&typeof bridge.setShoreLimit==='function'?bridge.setShoreLimit.bind(bridge):typeof window.msVictronSetShoreLimit==='function'?window.msVictronSetShoreLimit:null;
 if(!fn){if(st)st.textContent=shoreLimit+' A geselecteerd; Victron is niet gewijzigd omdat de control bridge nog niet schrijfbaar is.';return}
 Promise.resolve(fn(shoreLimit)).then(()=>{if(st)st.textContent='Walstroomlimiet '+shoreLimit+' A verzonden.';refresh()}).catch(e=>{if(st)st.textContent='Walstroomlimiet niet gewijzigd: '+(e?.message||'onbekende fout')});
}
function paint(){
 if(!$(ID))return;
 const s=snap(),at=Date.parse(String(s.at||'')),fresh=Number.isFinite(at)&&Date.now()-at<600000;
 const live=$('v8310Live');if(live){live.classList.toggle('stale',!fresh);live.textContent=fresh?'LIVE':'DATA'}
 set('v8310Solar',fmt(s.solarPower,0,' W')); set('v8310Mode',s.mode); set('v8310ModeSub',s.shore===true?(ok(s.acIn)?'Wal '+fmt(s.acIn,0,' W'):'Walstroom actief'):'MultiPlus-II');
 set('v8310Ac',fmt(s.acLoad,0,' W'));set('v8310Alt',fmt(s.altCurrent,1,' A'));set('v8310Dc',fmt(s.dcCurrent,1,' A'));
 set('v8310Soc',ok(s.soc)?Math.round(s.soc)+'%':'—%');set('v8310Volt',fmt(s.voltage,2,' V'));set('v8310Amp',ok(s.current)?((s.current>0?'+':'')+fmt(s.current,1,' A')):'— A');set('v8310Power',ok(s.power)?((s.power>0?'+':'')+fmt(s.power,0,' W')):'— W');
 set('v8310State',ok(s.current)?(s.current>.7?'Laden':s.current<-.7?'Ontladen':'Rust'):'SmartShunt');
 const bb=$('v8310Batt');if(bb)bb.style.setProperty('--p',clamp(ok(s.soc)?s.soc:0,0,100)+'%');
 set('v8310Victron',fresh?'Live':'Verbinden…');set('v8310Shore',s.shore===true?'Aan':s.shore===false?'Uit':'—');set('v8310BatMini',ok(s.soc)?Math.round(s.soc)+'%':'—');set('v8310SunMini',fmt(s.solarPower,0,' W'));
 set('v8310LevelBat',ok(s.soc)?Math.round(s.soc)+'%':'—%');set('v8310LevelBatSub',fmt(s.voltage,2,' V')+' · '+fmt(s.current,1,' A'));
 set('v8310LevelWater',ok(s.water)?Math.round(s.water)+'%':'—%');set('v8310LevelWaterSub',ok(s.waterL)?Math.round(s.waterL)+' L':'Victron tank');
 set('v8310LevelFuel',ok(s.fuel)?Math.round(s.fuel)+'%':'—%');set('v8310LevelFuelSub',ok(s.fuelL)?Math.round(s.fuelL)+' L':'Tankniveau');
 set('v8310Salon',fmt(s.salon,1,' °C'));set('v8310SalonH',ok(s.salonH)?Math.round(s.salonH)+'% RV · RuuviTag':'RuuviTag');set('v8310Machine',fmt(s.machine,1,' °C'));set('v8310MachineH',ok(s.machineH)?Math.round(s.machineH)+'% RV · RuuviTag':'RuuviTag');
 set('v8310EnvShore',s.shore===true?'Aangesloten':s.shore===false?'Niet aangesloten':'Onbekend');set('v8310EnvShoreV',ok(s.shoreV)?fmt(s.shoreV,0,' V'):'AC ingang');
 set('v8310MsgShore',s.shore===true?'Aangesloten':s.shore===false?'Niet aangesloten':'Onbekend');set('v8310Age',fresh?'Victron live':'Laatste live data wordt vernieuwd');
 set('v8310GX',fresh?'Online':'Data ouder');set('v8310Shunt',ok(s.voltage)?'Actief':'Wachten');set('v8310MPPT',ok(s.solarPower)?'Actief':'Wachten');
 [['v8310Water',s.water],['v8310Fuel',s.fuel],['v8310Waste',s.waste]].forEach(x=>set(x[0],ok(x[1])?Math.round(x[1])+'%':'—%'));
 fill('v8310WaterFill',s.water);fill('v8310FuelFill',s.fuel);fill('v8310WasteFill',s.waste);
 const coords=String($('msrGpsCoords')?.textContent||'').trim();set('v8310Map',coords?'Serenity · '+coords:'Serenity · GPS');
 const alarm=$('msSerenityAlarmBanner');set('v8310Msg',alarm?.classList.contains('show')?'Actieve melding':'Geen actieve melding');
}
async function refresh(){try{if(typeof window.ms71915RefreshEnergy==='function')await window.ms71915RefreshEnergy()}catch(e){}paint()}
function bind(root){
 if(root.dataset.ms8310bound==='1')return;root.dataset.ms8310bound='1';
 root.addEventListener('click',e=>{
   const t=e.target.closest('#'+ID+' [data-tab]');if(t){e.preventDefault();showTab(t.dataset.tab);return}
   const m=e.target.closest('#'+ID+' [data-mode]');if(m){e.preventDefault();controlMode(m.dataset.mode);return}
   const l=e.target.closest('#'+ID+' [data-limit]');if(l){e.preventDefault();controlLimit(l.dataset.limit==='+'?1:-1);return}
   const g=e.target.closest('#'+ID+' [data-go]');if(g){e.preventDefault();nav(g.dataset.go)}
 });
}
function apply(){
 const root=$(ROOT);if(!root)return false;
 const main=root.querySelector('.ms8263-main'),quick=root.querySelector('.msr-quick');if(!main||!quick)return false;
 css();root.classList.add('ms8310');
 const hero=root.querySelector('.msr-hero'),img=root.querySelector('.msr-hero-bg');if(hero)hero.style.backgroundImage='url("'+HERO+'")';if(img&&img.getAttribute('src')!==HERO)img.setAttribute('src',HERO);
 Array.from(main.children).filter(x=>x.classList.contains('msr-row')).forEach(x=>x.classList.add('ms8310-old'));
 let w=$(ID);if(!w){w=document.createElement('section');w.id=ID;w.innerHTML=html();quick.insertAdjacentElement('afterend',w)}
 bind(root);showTab(tab);paint();return true;
}
function start(){if(!apply())setTimeout(start,120)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
['pageshow','mijnserenity:dashboard-ready','mijnserenity-vrm-energy-live-updated','mijnserenity-vrm-diagnostics-updated','mijnserenity-victron-water-updated'].forEach(n=>window.addEventListener(n,()=>setTimeout(apply,20),{passive:true}));
new MutationObserver(()=>{if(location.hash===''||location.hash==='#dashboard')apply()}).observe(document.documentElement,{childList:true,subtree:true});
setInterval(()=>{if(!document.hidden&&(location.hash===''||location.hash==='#dashboard')){apply();paint()}},2000);
setTimeout(()=>refresh(),1400);
})();