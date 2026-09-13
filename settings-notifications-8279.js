/* MijnSerenity 8.27.9 — instelbare alarmen */
(()=>{
'use strict';
if(window.__msSettingsNotifications8279)return;
window.__msSettingsNotifications8279=true;
const $=id=>document.getElementById(id),copy=v=>JSON.parse(JSON.stringify(v)),finite=v=>v!==''&&v!=null&&Number.isFinite(Number(v));
const DEF={version:1,monitoringEnabled:true,pushEnabled:true,
 houseBattery:{enabled:true,push:true,socWarning:20,socCritical:10,voltageWarning:12.1,voltageCritical:11.8},
 starterBattery:{enabled:true,push:true,voltageWarning:12.2,voltageCritical:11.8},
 water:{enabled:false,push:true,warning:20,critical:10},fuel:{enabled:false,push:true,warning:25,critical:10},
 waste:{enabled:false,push:true,warning:75,critical:90},shorePower:{enabled:true,push:true},
 temperature:{enabled:true,push:true},victron:{enabled:true,push:true}};
let state=copy(DEF),busy=false;
function merge(raw){const s=copy(DEF),r=raw&&typeof raw==='object'?raw:{};for(const k of ['monitoringEnabled','pushEnabled'])if(typeof r[k]==='boolean')s[k]=r[k];for(const k of ['houseBattery','starterBattery','water','fuel','waste','shorePower','temperature','victron'])if(r[k]&&typeof r[k]==='object')Object.assign(s[k],r[k]);return s}
function chk(id,label,on,sub=''){return `<label class="a-row"><span><strong>${label}</strong>${sub?`<small>${sub}</small>`:''}</span><input id="${id}" type="checkbox" ${on?'checked':''}></label>`}
function num(id,label,v,u,step='1',min='0',max='100'){return `<label class="a-num"><span>${label}</span><div><input id="${id}" type="number" inputmode="decimal" value="${v}" step="${step}" min="${min}" max="${max}"><b>${u}</b></div></label>`}
function block(title,sub,en,push,on,pushOn,fields=''){return `<div class="a-block"><div class="a-head"><div><strong>${title}</strong><small>${sub}</small></div><label>Actief <input id="${en}" type="checkbox" ${on?'checked':''}></label><label>Push <input id="${push}" type="checkbox" ${pushOn?'checked':''}></label></div>${fields?`<div class="a-fields">${fields}</div>`:''}</div>`}
function css(){if($('ms8279AlarmStyle'))return;const s=document.createElement('style');s.id='ms8279AlarmStyle';s.textContent=`
#ms8279SettingsCard{overflow:hidden}#ms8279SettingsCard .a-summary{display:flex;justify-content:space-between;gap:10px;margin:8px 0;padding:10px;border-radius:14px;background:rgba(30,72,91,.22)}
#ms8279SettingsCard .a-pill{height:max-content;padding:5px 8px;border-radius:999px;background:rgba(57,217,138,.13);color:#aef5d5;font-size:10px;font-weight:800}#ms8279SettingsCard .a-pill.off{background:rgba(154,178,191,.12);color:#aebfc8}
#ms8279SettingsWrap{padding-top:8px}#ms8279SettingsWrap.hidden{display:none!important}#ms8279SettingsCard .a-row,#ms8279SettingsCard .a-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
#ms8279SettingsCard .a-row,#ms8279SettingsCard .a-block{margin:8px 0;padding:11px;border-radius:14px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.06)}
#ms8279SettingsCard small{display:block;margin-top:2px;font-size:10px;opacity:.65}#ms8279SettingsCard input[type=checkbox]{width:21px;height:21px;accent-color:#24a86b}
#ms8279SettingsCard .a-head>div{flex:1}#ms8279SettingsCard .a-head>label{font-size:9px;display:grid;gap:3px;justify-items:center}
#ms8279SettingsCard .a-title{margin:15px 2px 5px;font-size:10px;letter-spacing:.11em;text-transform:uppercase;opacity:.62}
#ms8279SettingsCard .a-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:9px}#ms8279SettingsCard .a-num{padding:8px;border-radius:11px;background:rgba(4,18,29,.42)}
#ms8279SettingsCard .a-num>span{font-size:9px;opacity:.65}#ms8279SettingsCard .a-num>div{display:flex;align-items:center;gap:4px}#ms8279SettingsCard .a-num input{min-width:0;width:100%;font-size:16px;font-weight:800}#ms8279SettingsCard .a-num b{font-size:9px;opacity:.55}
#ms8279SettingsCard .a-actions{display:flex;gap:8px;margin-top:13px}#ms8279SettingsCard .a-actions button{flex:1}#ms8279SettingsStatus{min-height:18px;margin-top:8px;font-size:10px;opacity:.75}#ms8279SettingsStatus.ok{color:#9af0ca}#ms8279SettingsStatus.err{color:#ffb2b2}`;document.head.appendChild(s)}
function render(){const c=$('ms8279SettingsCard');if(!c)return;const open=!$('ms8279SettingsWrap')?.classList.contains('hidden');c.innerHTML=`
<button id="ms8279Toggle" class="section-toggle" type="button"><span>Alarmen</span><span class="chevron">${open?'⌃':'⌄'}</span></button>
<div class="a-summary"><div><strong>Victron/Cerbo + MijnSerenity</strong><small>Automatische controle iedere 2 minuten</small></div><span id="ms8279Pill" class="a-pill ${state.monitoringEnabled?'':'off'}">${state.monitoringEnabled?'ACTIEF':'UIT'}</span></div>
<div id="ms8279SettingsWrap" class="${open?'':'hidden'}">
${chk('ms8279Master','Alarmbewaking',state.monitoringEnabled,'Hoofdschakelaar voor alle alarmregels')}
${chk('ms8279PushAll','Pushmeldingen',state.pushEnabled,'Zet meldingen op iPhone/iPad globaal aan of uit')}
<div class="a-title">Accu’s</div>
${block('Huishoudaccu','SOC en spanning','ms8279HouseEn','ms8279HousePush',state.houseBattery.enabled,state.houseBattery.push,
 num('ms8279HouseSocW','Waarschuwing SOC',state.houseBattery.socWarning,'%')+num('ms8279HouseSocC','Kritiek SOC',state.houseBattery.socCritical,'%')+
 num('ms8279HouseVW','Waarschuwing spanning',state.houseBattery.voltageWarning,'V','0.1','9','17')+num('ms8279HouseVC','Kritieke spanning',state.houseBattery.voltageCritical,'V','0.1','9','17'))}
${block('Startaccu','Spanning','ms8279StartEn','ms8279StartPush',state.starterBattery.enabled,state.starterBattery.push,
 num('ms8279StartVW','Waarschuwing',state.starterBattery.voltageWarning,'V','0.1','9','17')+num('ms8279StartVC','Kritiek',state.starterBattery.voltageCritical,'V','0.1','9','17'))}
<div class="a-title">Tanks</div>
${block('Drinkwater','Alarm bij lage tankstand','ms8279WaterEn','ms8279WaterPush',state.water.enabled,state.water.push,num('ms8279WaterW','Waarschuwing onder',state.water.warning,'%')+num('ms8279WaterC','Kritiek onder',state.water.critical,'%'))}
${block('Diesel','Alarm bij lage tankstand','ms8279FuelEn','ms8279FuelPush',state.fuel.enabled,state.fuel.push,num('ms8279FuelW','Waarschuwing onder',state.fuel.warning,'%')+num('ms8279FuelC','Kritiek onder',state.fuel.critical,'%'))}
${block('Zwartwater','Alarm bij hoge tankstand','ms8279WasteEn','ms8279WastePush',state.waste.enabled,state.waste.push,num('ms8279WasteW','Waarschuwing boven',state.waste.warning,'%')+num('ms8279WasteC','Kritiek boven',state.waste.critical,'%'))}
<div class="a-title">Victron / Cerbo</div>
${block('Walstroom','Grid-lost alarm','ms8279ShoreEn','ms8279ShorePush',state.shorePower.enabled,state.shorePower.push)}
${block('Temperatuur','Victron temperatuur-alarmen','ms8279TempEn','ms8279TempPush',state.temperature.enabled,state.temperature.push)}
${block('Overige Victron-alarmen','Omvormer, spanning, rimpel en sensoren','ms8279VicEn','ms8279VicPush',state.victron.enabled,state.victron.push)}
<div class="a-actions"><button id="ms8279Save" type="button">Alarmen opslaan</button><button id="ms8279Reset" type="button" class="secondary">Standaard</button></div><div id="ms8279SettingsStatus"></div></div>`;bind()}
function b(id,f){return $(id)?$(id).checked:f}function n(id,f){return $(id)&&finite($(id).value)?Number($(id).value):f}
function collect(){const s=copy(state);s.monitoringEnabled=b('ms8279Master',s.monitoringEnabled);s.pushEnabled=b('ms8279PushAll',s.pushEnabled);for(const [k,e,p] of [['houseBattery','ms8279HouseEn','ms8279HousePush'],['starterBattery','ms8279StartEn','ms8279StartPush'],['water','ms8279WaterEn','ms8279WaterPush'],['fuel','ms8279FuelEn','ms8279FuelPush'],['waste','ms8279WasteEn','ms8279WastePush'],['shorePower','ms8279ShoreEn','ms8279ShorePush'],['temperature','ms8279TempEn','ms8279TempPush'],['victron','ms8279VicEn','ms8279VicPush']]){s[k].enabled=b(e,s[k].enabled);s[k].push=b(p,s[k].push)}
s.houseBattery.socWarning=n('ms8279HouseSocW',20);s.houseBattery.socCritical=n('ms8279HouseSocC',10);s.houseBattery.voltageWarning=n('ms8279HouseVW',12.1);s.houseBattery.voltageCritical=n('ms8279HouseVC',11.8);s.starterBattery.voltageWarning=n('ms8279StartVW',12.2);s.starterBattery.voltageCritical=n('ms8279StartVC',11.8);s.water.warning=n('ms8279WaterW',20);s.water.critical=n('ms8279WaterC',10);s.fuel.warning=n('ms8279FuelW',25);s.fuel.critical=n('ms8279FuelC',10);s.waste.warning=n('ms8279WasteW',75);s.waste.critical=n('ms8279WasteC',90);return s}
function valid(s){if(s.houseBattery.socCritical>=s.houseBattery.socWarning)return'Kritiek SOC moet lager zijn dan waarschuwing.';if(s.houseBattery.voltageCritical>=s.houseBattery.voltageWarning)return'Kritieke huishoudspanning moet lager zijn dan waarschuwing.';if(s.starterBattery.voltageCritical>=s.starterBattery.voltageWarning)return'Kritieke startaccuspanning moet lager zijn dan waarschuwing.';if(s.water.critical>=s.water.warning)return'Drinkwater kritiek moet lager zijn dan waarschuwing.';if(s.fuel.critical>=s.fuel.warning)return'Diesel kritiek moet lager zijn dan waarschuwing.';if(s.waste.critical<=s.waste.warning)return'Zwartwater kritiek moet hoger zijn dan waarschuwing.';return''}
function status(t,cl=''){const e=$('ms8279SettingsStatus');if(e){e.textContent=t;e.className=cl}}
function ctx(){let client=null,boat=null,user=null;try{client=typeof sb!=='undefined'?sb:null;boat=typeof currentBoat!=='undefined'?currentBoat:null;user=typeof currentUser!=='undefined'?currentUser:null}catch(_){}if(!client||!boat?.id||!user?.id)throw new Error('Nog niet volledig aangemeld.');return{client,boat}}
async function load(){if(busy)return;busy=true;try{const{client,boat}=ctx(),{data,error}=await client.from('technical_state').select('data').eq('boat_id',boat.id).maybeSingle();if(error)throw error;state=merge(data?.data?.alarmSettings);render();status('Alarmwaarden geladen.','ok')}catch(e){render();status(String(e?.message||e),'err')}finally{busy=false}}
async function save(){if(busy)return;const s=collect(),err=valid(s);if(err){status(err,'err');return}busy=true;status('Opslaan…');try{const{client,boat}=ctx(),{error}=await client.rpc('set_serenity_alarm_settings',{p_boat_id:boat.id,p_settings:s});if(error)throw error;state=s;const pill=$('ms8279Pill');if(pill){pill.textContent=s.monitoringEnabled?'ACTIEF':'UIT';pill.classList.toggle('off',!s.monitoringEnabled)}status('Opgeslagen. Nieuwe waarden gelden uiterlijk binnen 2 minuten.','ok');window.dispatchEvent(new CustomEvent('mijnserenity:alarm-settings-updated',{detail:{settings:copy(s)}}));window.ms8278RefreshVictron?.()}catch(e){status(`Opslaan mislukt: ${String(e?.message||e)}`,'err')}finally{busy=false}}
function bind(){$('ms8279Toggle')?.addEventListener('click',()=>{const w=$('ms8279SettingsWrap');w?.classList.toggle('hidden');const ch=$('ms8279Toggle')?.querySelector('.chevron');if(ch)ch.textContent=w?.classList.contains('hidden')?'⌄':'⌃'});$('ms8279Save')?.addEventListener('click',save);$('ms8279Reset')?.addEventListener('click',()=>{state=copy(DEF);render();$('ms8279SettingsWrap')?.classList.remove('hidden');status('Standaardwaarden ingevuld; nog niet opgeslagen.')})}
function mount(){const settings=$('settings');if(!settings)return;if(!$('ms8279SettingsCard')){css();const c=document.createElement('div');c.id='ms8279SettingsCard';c.className='card collapsible-card';const info=settings.querySelector('.ms752-app-info-card');if(info)info.insertAdjacentElement('afterend',c);else settings.prepend(c);render();setTimeout(load,80)}}
function wake(){[0,250,900].forEach(ms=>setTimeout(mount,ms))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wake,{once:true});else wake();window.addEventListener('pageshow',wake,{passive:true});window.addEventListener('hashchange',wake,{passive:true});window.addEventListener('mijnserenity:dashboard-ready',wake,{passive:true});
window.ms8279OpenAlarmSettings=()=>{window.captainNavigate?.('settings');setTimeout(()=>{$('ms8279SettingsWrap')?.classList.remove('hidden')},200)};window.ms8279LoadAlarmSettings=load;
})();