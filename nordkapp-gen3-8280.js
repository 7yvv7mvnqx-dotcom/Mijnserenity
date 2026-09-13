/* MijnSerenity 8.28.0 — Nordkapp Air Gen 3 via Home Assistant entities. */
(()=>{
'use strict';
if(window.__msNordkappGen38280)return;
window.__msNordkappGen38280=true;

const BUILD='8.28.0';
const AUTH_KEY='mijnserenity-ha-oauth-v733';
const CONFIG_KEY='mijnserenity-nordkapp-gen3-v1';
const CARD_ID='ms8280NordkappTechnical';
const DASH_ID='ms8280NordkappDashboard';
const STYLE_ID='ms8280NordkappStyle';
const MATCH=['nordkapp','nord_kapp','nord-kapp','diesel_heater','diesel heater','air_heater','air heater','heater','verwarming','kachel'];
let states=[];
let stateMap=new Map();
let config=loadConfig();
let refreshTimer=0;
let mountTimer=0;
let busy=false;

const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const textOf=e=>`${e?.entity_id||''} ${e?.attributes?.friendly_name||''}`.toLowerCase();
const domain=e=>String(e?.entity_id||'').split('.')[0];
const numberOrNull=value=>Number.isFinite(Number(value))?Number(value):null;

function installStyle(){
  if($(STYLE_ID))return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
  .ms8280-nordkapp{box-sizing:border-box;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:linear-gradient(145deg,rgba(11,36,52,.96),rgba(4,20,32,.98));box-shadow:0 16px 40px rgba(0,0,0,.2);color:#f3f8fb;padding:18px;margin:16px 0;font-family:inherit}
  .ms8280-nordkapp *{box-sizing:border-box}.ms8280-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.ms8280-title{display:flex;gap:12px;align-items:center}.ms8280-icon{width:46px;height:46px;display:grid;place-items:center;border-radius:15px;background:rgba(255,145,58,.13);font-size:25px}.ms8280-title h3{margin:0;font-size:19px}.ms8280-title p{margin:3px 0 0;color:#a9bcc8;font-size:12px}.ms8280-pill{border-radius:999px;padding:6px 10px;background:rgba(101,218,160,.12);color:#8ae4b4;font-weight:800;font-size:11px;white-space:nowrap}.ms8280-pill.off{background:rgba(255,255,255,.07);color:#b7c4cc}.ms8280-pill.warn{background:rgba(255,180,64,.12);color:#ffd28b}.ms8280-pill.error{background:rgba(255,82,82,.13);color:#ffaaaa}
  .ms8280-hero{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}.ms8280-metric{padding:14px;border-radius:18px;background:rgba(255,255,255,.055)}.ms8280-label{display:block;color:#9eb2bf;font-size:11px;text-transform:uppercase;letter-spacing:.06em}.ms8280-value{display:block;margin-top:3px;font-size:24px;font-weight:850}.ms8280-sub{display:block;margin-top:4px;color:#91a6b3;font-size:11px}
  .ms8280-controls{display:flex;flex-wrap:wrap;gap:9px;margin-top:14px}.ms8280-btn{appearance:none;border:0;border-radius:15px;padding:11px 14px;background:rgba(255,255,255,.09);color:#f8fbfd;font-weight:800;font:inherit;cursor:pointer}.ms8280-btn.primary{background:#ef7d32;color:#fff}.ms8280-btn.danger{background:rgba(255,92,92,.14);color:#ffb0b0}.ms8280-btn:disabled{opacity:.45;cursor:not-allowed}.ms8280-temp{display:flex;align-items:center;gap:8px}.ms8280-temp strong{min-width:62px;text-align:center;font-size:18px}.ms8280-range{margin-top:12px}.ms8280-range input{width:100%}
  .ms8280-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}.ms8280-kv{padding:10px 11px;border-radius:15px;background:rgba(255,255,255,.045)}.ms8280-kv b{display:block;margin-top:2px;font-size:14px}.ms8280-kv span{font-size:10px;color:#90a4b1;text-transform:uppercase;letter-spacing:.04em}
  .ms8280-setup{margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.09)}.ms8280-setup-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.ms8280-select{min-width:220px;max-width:100%;flex:1;border:1px solid rgba(255,255,255,.12);border-radius:13px;padding:10px 12px;background:#0b2637;color:#fff;font:inherit}.ms8280-note{margin:10px 0 0;color:#9db0bb;font-size:11px;line-height:1.45}.ms8280-note strong{color:#ffd19d}
  .ms8280-dash{padding:14px 15px;margin:12px 10px}.ms8280-dash .ms8280-hero{grid-template-columns:1fr 1fr;margin-top:11px}.ms8280-dash .ms8280-metric{padding:10px}.ms8280-dash .ms8280-value{font-size:19px}.ms8280-dash .ms8280-controls{margin-top:10px}.ms8280-dash .ms8280-setup,.ms8280-dash .ms8280-grid{display:none}
  @media(max-width:620px){.ms8280-nordkapp{border-radius:20px;padding:15px}.ms8280-grid{grid-template-columns:1fr 1fr}.ms8280-head{align-items:center}.ms8280-pill{max-width:42vw;overflow:hidden;text-overflow:ellipsis}.ms8280-setup-row{align-items:stretch}.ms8280-select{width:100%;min-width:0}.ms8280-btn{min-height:44px}}
  `;
  document.head.appendChild(s);
}

function loadConfig(){
  try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}')||{}}catch{return {}}
}
function saveConfig(next){
  config={...config,...next,updatedAt:new Date().toISOString()};
  localStorage.setItem(CONFIG_KEY,JSON.stringify(config));
  window.dispatchEvent(new CustomEvent('mijnserenity:nordkapp-config',{detail:{...config}}));
}
function authData(){
  try{return JSON.parse(localStorage.getItem(AUTH_KEY)||'null')}catch{return null}
}
async function tokenRequest(baseUrl,body){
  const response=await fetch(`${baseUrl}/auth/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams(body).toString(),cache:'no-store'});
  let data={};try{data=await response.json()}catch{}
  if(!response.ok)throw new Error(data.error_description||data.error||`Home Assistant-login mislukt (${response.status}).`);
  return data;
}
async function accessToken(){
  let auth=authData();
  if(!auth?.baseUrl||!auth?.refreshToken)throw new Error('Home Assistant is nog niet gekoppeld.');
  if(auth.accessToken&&Number(auth.expiresAt||0)>Date.now()+60000)return auth.accessToken;
  const data=await tokenRequest(auth.baseUrl,{grant_type:'refresh_token',refresh_token:auth.refreshToken,client_id:auth.clientId||window.location.origin});
  auth={...auth,accessToken:data.access_token,expiresAt:Date.now()+Math.max(60,Number(data.expires_in)||1800)*1000};
  localStorage.setItem(AUTH_KEY,JSON.stringify(auth));
  return auth.accessToken;
}
async function haFetch(path,options={}){
  const auth=authData();
  if(!auth?.baseUrl)throw new Error('Home Assistant is nog niet gekoppeld.');
  const token=await accessToken();
  const response=await fetch(`${auth.baseUrl}${path}`,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(options.headers||{})},cache:'no-store'});
  if(!response.ok){let message='';try{message=(await response.json())?.message||''}catch{}throw new Error(message||`Home Assistant reageerde met ${response.status}.`)}
  if(response.status===204)return null;
  try{return await response.json()}catch{return null}
}
async function callService(d,s,entityId,data={}){
  if(!entityId)throw new Error('Geen Nordkapp-entiteit gekozen.');
  const result=await haFetch(`/api/services/${encodeURIComponent(d)}/${encodeURIComponent(s)}`,{method:'POST',body:JSON.stringify({entity_id:entityId,...data})});
  await refresh(true);
  return result;
}

function hasMatch(e,terms=MATCH){return terms.some(t=>textOf(e).includes(t))}
function byId(id){return id?stateMap.get(id)||null:null}
function allByDomain(d){return states.filter(e=>domain(e)===d)}
function best(d,terms,exact=[]){
  const list=allByDomain(d);
  for(const suffix of exact){const hit=list.find(e=>String(e.entity_id).toLowerCase().includes(suffix));if(hit)return hit}
  return list.map(e=>({e,score:terms.reduce((n,t)=>n+(textOf(e).includes(t)?1:0),0)+(hasMatch(e)?2:0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score)[0]?.e||null;
}
function resolveEntities(){
  let climate=byId(config.climateEntity);
  if(!climate){
    climate=best('climate',MATCH,['climate.diesel_heater','diesel_heater','nordkapp']);
    if(climate)saveConfig({climateEntity:climate.entity_id});
  }
  const scopeTokens=[];
  if(climate){
    scopeTokens.push(...String(climate.entity_id).split(/[._-]+/).filter(x=>x.length>3&&!['climate'].includes(x)));
    const name=String(climate.attributes?.friendly_name||'').toLowerCase();
    scopeTokens.push(...name.split(/\s+/).filter(x=>x.length>3));
  }
  const terms=[...new Set([...MATCH,...scopeTokens])];
  return {
    climate,
    power:best('switch',terms,['diesel_heater_power','nordkapp_power']),
    fan:best('fan',terms,['diesel_heater_heater_level','heater_level']),
    level:best('number',terms,['diesel_heater_level','heater_level']),
    mode:best('select',terms,['diesel_heater_running_mode','running_mode']),
    voltage:best('sensor',[...terms,'voltage','spanning'],['supply_voltage','voltage']),
    status:best('sensor',[...terms,'running step','running_step','status','mode'],['running_step_mode','running_step','status']),
    error:best('sensor',[...terms,'error','fault','storing'],['error_code','fault']),
    interior:best('sensor',[...terms,'interior temperature','interior_temperature','room temperature','cabin temperature'],['interior_temperature','room_temperature']),
    connected:best('binary_sensor',[...terms,'connected','verbonden'],['connected']),
    problem:best('binary_sensor',[...terms,'problem','fault','storing'],['problem'])
  };
}
function attr(entity,key){return entity?.attributes?.[key]}
function displayNumber(value,digits=1){const n=numberOrNull(value);return n===null?'—':n.toLocaleString('nl-NL',{minimumFractionDigits:digits,maximumFractionDigits:digits})}
function temperatureValue(r){return numberOrNull(attr(r.climate,'current_temperature'))??numberOrNull(r.interior?.state)}
function targetValue(r){return numberOrNull(attr(r.climate,'temperature'))??numberOrNull(attr(r.climate,'target_temp_high'))}
function statusInfo(r){
  const raw=`${r.status?.state||''} ${attr(r.climate,'hvac_action')||''} ${r.climate?.state||''}`.toLowerCase();
  if(/cool|cooldown|shut.?down|after.?run|afkoel/.test(raw))return {label:'Afkoelen',cls:'warn'};
  if(/heat|running|run\b|start|ignit|verwarm/.test(raw))return {label:'Verwarmen',cls:''};
  if(/vent|fan/.test(raw))return {label:'Ventileren',cls:'warn'};
  if(/idle|standby|wacht/.test(raw))return {label:'Stand-by',cls:'off'};
  if(/off|uit|stopped|stop/.test(raw))return {label:'Uit',cls:'off'};
  if(r.climate)return {label:String(r.climate.state||'Verbonden'),cls:'off'};
  return {label:'Nog niet gekoppeld',cls:'warn'};
}
function errorText(r){
  if(r.problem&&['on','true','1','problem'].includes(String(r.problem.state).toLowerCase()))return r.error?.state&&r.error.state!=='0'?`Storing ${r.error.state}`:'Storing actief';
  const v=String(r.error?.state||'').trim();
  if(v&&!['0','none','ok','unknown','unavailable'].includes(v.toLowerCase()))return v;
  return 'Geen';
}
function connectionText(r){
  if(r.connected){const on=['on','true','1','connected'].includes(String(r.connected.state).toLowerCase());return on?'Verbonden':'Niet verbonden'}
  return r.climate&&r.climate.state!=='unavailable'?'Verbonden':'—';
}
function levelText(r){
  if(r.level){const v=numberOrNull(r.level.state);if(v!==null)return `${Math.round(v)}/10`}
  if(r.fan){const p=numberOrNull(attr(r.fan,'percentage'));if(p!==null)return `${Math.max(1,Math.round(p/10))}/10`}
  return '—';
}

async function refresh(force=false){
  if(busy&&!force)return;
  busy=true;
  try{
    states=await haFetch('/api/states');
    if(!Array.isArray(states))states=[];
    stateMap=new Map(states.map(e=>[e.entity_id,e]));
    resolveEntities();
    renderAll();
    window.dispatchEvent(new CustomEvent('mijnserenity:nordkapp-state',{detail:snapshot()}));
  }catch(error){
    renderAll(error);
  }finally{busy=false}
}
function snapshot(){
  const r=resolveEntities(),status=statusInfo(r);
  return {build:BUILD,configured:Boolean(r.climate),entityId:r.climate?.entity_id||'',status:status.label,currentTemperature:temperatureValue(r),targetTemperature:targetValue(r),voltage:numberOrNull(r.voltage?.state),level:levelText(r),error:errorText(r),connected:connectionText(r)};
}

async function setPower(on){
  const r=resolveEntities();
  try{
    setBusyButtons(true);
    if(r.climate)await callService('climate',on?'turn_on':'turn_off',r.climate.entity_id);
    else if(r.power)await callService('switch',on?'turn_on':'turn_off',r.power.entity_id);
    else throw new Error('Er is nog geen bestuurbare Nordkapp-entiteit gevonden.');
    toast(on?'Nordkapp startcommando verstuurd.':'Nordkapp stopcommando verstuurd — voeding blijft aan voor afkoelen.');
  }catch(error){toast(error.message,true)}finally{setBusyButtons(false)}
}
async function nudgeTemperature(delta){
  const r=resolveEntities();
  const current=targetValue(r)??20;
  const min=numberOrNull(attr(r.climate,'min_temp'))??8;
  const max=numberOrNull(attr(r.climate,'max_temp'))??36;
  const next=Math.max(min,Math.min(max,Math.round((current+delta)*2)/2));
  try{setBusyButtons(true);await callService('climate','set_temperature',r.climate?.entity_id,{temperature:next});toast(`Nordkapp ingesteld op ${String(next).replace('.',',')} °C.`)}catch(error){toast(error.message,true)}finally{setBusyButtons(false)}
}
async function setLevel(value){
  const r=resolveEntities();
  const level=Math.max(1,Math.min(10,Number(value)||1));
  try{
    if(r.level)await callService('number','set_value',r.level.entity_id,{value:level});
    else if(r.fan)await callService('fan','set_percentage',r.fan.entity_id,{percentage:level*10});
    else return;
    toast(`Vermogensstand ${level}/10 ingesteld.`);
  }catch(error){toast(error.message,true)}
}
function setBusyButtons(value){document.querySelectorAll('[data-ms8280-action]').forEach(b=>b.disabled=value)}
function toast(message,error=false){
  if(typeof window.showAppToast==='function'){try{window.showAppToast(message);return}catch{}}
  console[error?'warn':'info']('[Nordkapp Gen 3]',message);
}

function climateOptions(){
  const climates=allByDomain('climate');
  const selected=config.climateEntity||'';
  return `<option value="">Automatisch zoeken</option>${climates.map(e=>`<option value="${esc(e.entity_id)}" ${e.entity_id===selected?'selected':''}>${esc(e.attributes?.friendly_name||e.entity_id)} · ${esc(e.entity_id)}</option>`).join('')}`;
}
function cardMarkup(compact=false,error=null){
  const r=resolveEntities();
  const status=statusInfo(r);
  const current=temperatureValue(r),target=targetValue(r),voltage=numberOrNull(r.voltage?.state);
  const canControl=Boolean(r.climate||r.power);
  const err=error?error.message:errorText(r);
  const targetText=target===null?'—':`${displayNumber(target)} °C`;
  const currentText=current===null?'—':`${displayNumber(current)} °C`;
  const disconnected=error||!authData();
  return `<div class="ms8280-head">
    <div class="ms8280-title"><div class="ms8280-icon">🔥</div><div><h3>Nordkapp Air Gen 3</h3><p>Home Assistant · nieuwste generatie · 12/24 V onafhankelijk</p></div></div>
    <span class="ms8280-pill ${disconnected?'error':status.cls}">${esc(disconnected?'Niet verbonden':status.label)}</span>
  </div>
  <div class="ms8280-hero">
    <div class="ms8280-metric"><span class="ms8280-label">Salon</span><span class="ms8280-value">${esc(currentText)}</span><span class="ms8280-sub">Werkelijke temperatuur</span></div>
    <div class="ms8280-metric"><span class="ms8280-label">Ingesteld</span><span class="ms8280-value">${esc(targetText)}</span><span class="ms8280-sub">Thermostaat</span></div>
  </div>
  <div class="ms8280-controls">
    <button class="ms8280-btn primary" data-ms8280-action="on" ${canControl?'':'disabled'}>AAN</button>
    <button class="ms8280-btn danger" data-ms8280-action="off" ${canControl?'':'disabled'}>UIT</button>
    <div class="ms8280-temp"><button class="ms8280-btn" data-ms8280-action="minus" ${r.climate?'':'disabled'}>−</button><strong>${esc(targetText)}</strong><button class="ms8280-btn" data-ms8280-action="plus" ${r.climate?'':'disabled'}>+</button></div>
    <button class="ms8280-btn" data-ms8280-action="refresh">↻</button>
  </div>
  ${r.level||r.fan?`<div class="ms8280-range"><label class="ms8280-label">Vermogen · ${esc(levelText(r))}</label><input data-ms8280-level type="range" min="1" max="10" step="1" value="${esc(String(numberOrNull(r.level?.state)??Math.max(1,Math.round((numberOrNull(attr(r.fan,'percentage'))??10)/10))))}"></div>`:''}
  <div class="ms8280-grid">
    <div class="ms8280-kv"><span>Spanning</span><b>${voltage===null?'—':`${esc(displayNumber(voltage,1))} V`}</b></div>
    <div class="ms8280-kv"><span>Vermogen</span><b>${esc(levelText(r))}</b></div>
    <div class="ms8280-kv"><span>Verbinding</span><b>${esc(connectionText(r))}</b></div>
    <div class="ms8280-kv"><span>Modus</span><b>${esc(r.mode?.state||'—')}</b></div>
    <div class="ms8280-kv"><span>Statussensor</span><b>${esc(r.status?.state||status.label)}</b></div>
    <div class="ms8280-kv"><span>Storing</span><b>${esc(err||'Geen')}</b></div>
  </div>
  ${compact?'':`<div class="ms8280-setup">
    <div class="ms8280-setup-row"><select class="ms8280-select" data-ms8280-climate>${climateOptions()}</select><button class="ms8280-btn" data-ms8280-action="discover">Opnieuw zoeken</button></div>
    <p class="ms8280-note">MijnSerenity zoekt automatisch naar Nordkapp-/dieselkachel-entiteiten in Home Assistant. De app is bewust <strong>Gen 3-entiteitgestuurd</strong>: Bluetooth, Wi‑Fi of een latere Home Assistant-driver kan erachter wisselen zonder deze bediening opnieuw te bouwen.</p>
    <p class="ms8280-note"><strong>Veilig uitschakelen:</strong> UIT verstuurt alleen het normale Home Assistant/Nordkapp-stopcommando. MijnSerenity onderbreekt nooit de 12/24-V voeding tijdens de afkoelcyclus.</p>
  </div>`}`;
}
function wire(card){
  if(!card)return;
  card.querySelector('[data-ms8280-action="on"]')?.addEventListener('click',()=>setPower(true));
  card.querySelector('[data-ms8280-action="off"]')?.addEventListener('click',()=>setPower(false));
  card.querySelector('[data-ms8280-action="minus"]')?.addEventListener('click',()=>nudgeTemperature(-.5));
  card.querySelector('[data-ms8280-action="plus"]')?.addEventListener('click',()=>nudgeTemperature(.5));
  card.querySelector('[data-ms8280-action="refresh"]')?.addEventListener('click',()=>refresh(true));
  card.querySelector('[data-ms8280-action="discover"]')?.addEventListener('click',()=>{saveConfig({climateEntity:''});refresh(true)});
  card.querySelector('[data-ms8280-climate]')?.addEventListener('change',e=>{saveConfig({climateEntity:e.target.value});renderAll();toast(e.target.value?'Nordkapp-entiteit gekozen.':'Automatisch zoeken ingeschakeld.');});
  let levelTimer=0;card.querySelector('[data-ms8280-level]')?.addEventListener('change',e=>{clearTimeout(levelTimer);levelTimer=setTimeout(()=>setLevel(e.target.value),120)});
}
function renderCard(id,compact,error){
  const card=$(id);if(!card)return;
  card.innerHTML=cardMarkup(compact,error);wire(card);
}
function renderAll(error=null){renderCard(CARD_ID,false,error);renderCard(DASH_ID,true,error)}

function ensureTechnicalCard(){
  const host=$('technical');
  if(!host||$(CARD_ID))return;
  const card=document.createElement('section');card.id=CARD_ID;card.className='ms8280-nordkapp';card.setAttribute('aria-label','Nordkapp Air Gen 3 verwarming');host.appendChild(card);renderCard(CARD_ID,false);
}
function ensureDashboardCard(){
  const host=$('ms8210Start');
  if(!host||$(DASH_ID))return;
  const card=document.createElement('section');card.id=DASH_ID;card.className='ms8280-nordkapp ms8280-dash';card.setAttribute('aria-label','Nordkapp verwarming');host.appendChild(card);renderCard(DASH_ID,true);
}
function mount(){installStyle();ensureTechnicalCard();ensureDashboardCard()}
function scheduleMount(){clearTimeout(mountTimer);mountTimer=setTimeout(()=>{mount();renderAll()},100)}
function needsMount(){return Boolean(($('technical')&&!$(CARD_ID))||($('ms8210Start')&&!$(DASH_ID)))}
function start(){
  mount();
  refresh(true);
  clearInterval(refreshTimer);refreshTimer=setInterval(()=>{if(document.visibilityState==='visible')refresh()},30000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh(true)},{passive:true});
  window.addEventListener('mijnserenity:dashboard-ready',scheduleMount,{passive:true});
  window.addEventListener('mijnserenity-ha-connected',()=>refresh(true),{passive:true});
  window.addEventListener('mijnserenity-ha-state-updated',()=>{clearTimeout(mountTimer);mountTimer=setTimeout(()=>refresh(),400)},{passive:true});
  window.addEventListener('hashchange',scheduleMount,{passive:true});
  const observer=new MutationObserver(()=>{if(needsMount())scheduleMount()});observer.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();

window.ms8280Nordkapp={refresh:()=>refresh(true),snapshot,turnOn:()=>setPower(true),turnOff:()=>setPower(false),setTemperature:value=>{const r=resolveEntities();return callService('climate','set_temperature',r.climate?.entity_id,{temperature:Number(value)})},selectClimate:entityId=>{saveConfig({climateEntity:String(entityId||'')});return refresh(true)}};
})();
