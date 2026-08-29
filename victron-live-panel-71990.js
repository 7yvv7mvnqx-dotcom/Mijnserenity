/* MijnSerenity 7.19.9 — geïsoleerde Victron Live kaart zonder #msMarineGlass botsing */
(()=>{
  'use strict';
  if(window.__msVictronLivePanel71990)return;
  window.__msVictronLivePanel71990=true;

  const $=id=>document.getElementById(id);
  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const num=v=>finite(v)?Number(v):null;
  const fmt=(v,d=0,s='')=>finite(v)?`${Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d})}${s}`:`–${s}`;
  const signed=(v,d=0,s='')=>finite(v)?`${Number(v)>0?'+':''}${fmt(v,d,s)}`:`–${s}`;
  const set=(id,value)=>{const el=$(id);if(el&&value!=null&&el.textContent!==String(value))el.textContent=String(value)};
  const tokenKeys=['ms7148_vrm_token','ms7148VrmToken','mijnserenity_vrm_token','vrm_api_token'];
  let busy=false,lastFetch=0;

  function injectStyle(){
    if($('msVictronPanel71990Style'))return;
    const style=document.createElement('style');
    style.id='msVictronPanel71990Style';
    style.textContent=`
      #msVictronLivePanel{box-sizing:border-box;width:100%;height:auto;min-height:0;margin:0;padding:12px;border:1px solid rgba(62,164,218,.34);border-radius:22px;background:linear-gradient(180deg,#071927,#06131f);color:#f5fbff;overflow:hidden}
      #msVictronLivePanel *{box-sizing:border-box;min-width:0}
      #msVictronLivePanel .msv-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 10px}
      #msVictronLivePanel .msv-brand{display:flex;align-items:center;gap:9px}
      #msVictronLivePanel .msv-boat{font-size:27px}
      #msVictronLivePanel .msv-brand strong{display:block;color:#36b6ff;font-size:20px;line-height:1}
      #msVictronLivePanel .msv-brand small{display:block;margin-top:3px;color:#36b6ff;font-size:11px;font-weight:800}
      #msVictronLivePanel .msv-live{display:flex;align-items:center;gap:7px;color:#46d879;font-weight:900;font-size:11px;letter-spacing:.08em}
      #msVictronLivePanel .msv-live:before{content:"";width:8px;height:8px;border-radius:50%;background:#46d879;box-shadow:0 0 10px rgba(70,216,121,.8)}
      #msVictronLivePanel .msv-live.offline{color:#8399a7}#msVictronLivePanel .msv-live.offline:before{background:#667d8c;box-shadow:none}
      #msVictronLivePanel .msv-main{display:grid;grid-template-columns:1fr 1.15fr 1fr;gap:7px;align-items:stretch}
      #msVictronLivePanel .msv-cell{min-height:78px;padding:9px;border:1px solid rgba(116,190,230,.22);border-radius:13px;background:rgba(255,255,255,.018)}
      #msVictronLivePanel .msv-cell small{display:block;color:#9fb7c7;font-size:8px;font-weight:800;text-transform:uppercase}
      #msVictronLivePanel .msv-cell strong{display:block;margin-top:7px;font-size:18px;line-height:1.05}
      #msVictronLivePanel .msv-cell em{display:block;margin-top:5px;color:#9fb7c7;font-size:8px;font-style:normal}
      #msVictronLivePanel .msv-battery{grid-row:span 2;display:grid;place-items:center;text-align:center;background:radial-gradient(circle,rgba(24,113,157,.13),transparent 68%)}
      #msVictronLivePanel .msv-battery strong{font-size:32px;color:#46d879}
      #msVictronLivePanel .msv-battery b{display:block;margin-top:5px;font-size:12px;color:#c7d7e2}
      #msVictronLivePanel .msv-battery em{color:#46d879}
      #msVictronLivePanel .msv-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:7px}
      #msVictronLivePanel .msv-row .msv-cell{min-height:86px}
      #msVictronLivePanel .msv-systems{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px}
      #msVictronLivePanel .msv-system{padding:9px;border:1px solid rgba(116,190,230,.22);border-radius:13px;background:rgba(255,255,255,.014)}
      #msVictronLivePanel .msv-system small{display:block;color:#9fb7c7;font-size:8px;text-transform:uppercase}
      #msVictronLivePanel .msv-system strong{display:block;margin-top:6px;color:#46d879;font-size:14px}
      #msVictronLivePanel .msv-system em{display:block;margin-top:4px;color:#9fb7c7;font-size:8px;font-style:normal}
      #msVictronLivePanel .msv-foot{margin-top:8px;color:#819aa9;font-size:8px;text-align:center}
      @media(max-width:500px){
        #msVictronLivePanel{padding:10px;border-radius:19px}
        #msVictronLivePanel .msv-main{grid-template-columns:1fr 1.05fr 1fr;gap:5px}
        #msVictronLivePanel .msv-cell{padding:7px;min-height:70px}
        #msVictronLivePanel .msv-cell strong{font-size:15px}
        #msVictronLivePanel .msv-battery strong{font-size:28px}
        #msVictronLivePanel .msv-row,#msVictronLivePanel .msv-systems{gap:5px}
        #msVictronLivePanel .msv-row .msv-cell{min-height:78px}
      }
    `;
    document.head.appendChild(style);
  }

  function markup(){return `
    <div id="msVictronLivePanel" data-ms-victron-panel="71990">
      <div class="msv-head"><div class="msv-brand"><span class="msv-boat">🛥️</span><span><strong>SERENITY</strong><small>Victron Live</small></span></div><span id="msvLive" class="msv-live">LIVE</span></div>
      <div class="msv-main">
        <div class="msv-cell"><small>☀️ Zonne-energie</small><strong id="msvSolar">– W</strong><em>SmartSolar MPPT</em></div>
        <div class="msv-cell msv-battery"><span><small>Huishoudaccu</small><strong id="msvSoc">–%</strong><b id="msvVolt">– V</b><em><span id="msvAmp">– A</span> · <span id="msvBatPower">– W</span></em></span></div>
        <div class="msv-cell"><small>💡 Verbruik</small><strong id="msvLoad">– W</strong><em>Actueel totaal</em></div>
        <div class="msv-cell"><small>🔌 Walstroom</small><strong id="msvShore">–</strong><em id="msvShoreMeta">MultiPlus</em></div>
        <div class="msv-cell"><small>☷ DC-verbruik</small><strong id="msvDc">– W</strong><em>12 V boordnet</em></div>
      </div>
      <div class="msv-row">
        <div class="msv-cell"><small>🔋 Startaccu</small><strong id="msvStart">– V</strong><em id="msvStartState">Wachten</em></div>
        <div class="msv-cell"><small>⛽ Diesel</small><strong id="msvFuel">–%</strong><em id="msvFuelL">– L</em></div>
        <div class="msv-cell"><small>💧 Water</small><strong id="msvWater">–%</strong><em>Cerbo live</em></div>
      </div>
      <div class="msv-systems">
        <div class="msv-system"><small>MultiPlus-II</small><strong id="msvMulti">Stand-by</strong><em id="msvInv">– W</em></div>
        <div class="msv-system"><small>Laadstatus</small><strong id="msvCharge">Lader uit</strong><em id="msvChg">– W</em></div>
      </div>
      <div id="msvUpdated" class="msv-foot">Wachten op Cerbo GX live-data</div>
    </div>`}
  }

  function host(){return document.querySelector('#msMarineGlass > main.mg-grid > .mg-energy')||document.querySelector('#msMarineGlass .mg-energy')}
  function mount(){
    const card=host();if(!card)return false;
    injectStyle();
    card.style.setProperty('height','auto','important');
    card.style.setProperty('min-height','0','important');
    card.style.setProperty('max-height','none','important');
    card.style.setProperty('overflow','visible','important');
    if(!card.querySelector('#msVictronLivePanel'))card.innerHTML=markup();
    return true;
  }

  function technical(){try{return typeof technicalStateCache!=='undefined'&&technicalStateCache?technicalStateCache:{}}catch{return {}}}
  function data(){
    const live=window.MIJSERENITY_VRM_LIVE_ENERGY||{};
    const diag=window.MIJSERENITY_VRM_DIAGNOSTICS||{};
    const t=technical(),b=live.battery||{},s=live.solar||{},ac=live.ac||{},db=diag.battery||{},ds=diag.solar||{},da=diag.ac||{};
    const soc=num(b.soc)??num(db.soc?.value)??num(t.houseSoc);
    const voltage=num(b.voltage)??num(db.voltage?.value)??num(t.houseVoltage);
    const current=num(b.current)??num(db.current?.value)??num(t.houseCurrent);
    const power=num(b.power)??num(db.power?.value)??num(t.housePower)??(finite(voltage)&&finite(current)?voltage*current:null);
    const solar=num(s.power)??num(ds.power?.value)??num(t.solarPower);
    const start=num(b.starterVoltage)??num(db.starterVoltage?.value)??num(t.startVoltage);
    const shore=typeof ac.shoreConnected==='boolean'?ac.shoreConnected:(typeof da.shoreConnected==='boolean'?da.shoreConnected:null);
    const shoreV=num(ac.inputVoltage)??num(da.inputVoltage)??num(t.shoreVoltage);
    const charger=num(ac.chargerPower)??num(da.chargerPower)??num(t.chargerPower);
    const inverter=num(ac.inverterPower)??num(da.inverterPower)??num(t.inverterPower);
    const explicitLoad=num(ac.loadPower)??num(da.loadPower)??num(t.loadPower);
    const load=finite(explicitLoad)?Math.abs(explicitLoad):(finite(power)&&power<0?Math.abs(power):null);
    const dc=num(ac.dcPower)??num(t.dcLoadPower);
    const tanks=live.tanks||window.MIJSERENITY_TANK_LIVE||{};
    const fuel=num(tanks.fuel?.levelPct)??num(tanks.fuel?.value)??num(t.fuelPct);
    const water=num(tanks.water?.levelPct)??num(tanks.water?.value)??num(t.waterPct);
    const fuelL=num(tanks.fuel?.remainingLiters)??num(t.fuelLiters)??(finite(fuel)?Math.round(360*fuel/100):null);
    return {soc,voltage,current,power,solar,start,shore,shoreV,charger,inverter,load,dc,fuel,water,fuelL,sampledAt:live.sampledAt||t.liveTechnicalAt||''};
  }

  function render(){
    if(!mount())return;
    const s=data();
    set('msvSoc',finite(s.soc)?`${Math.round(Math.max(0,Math.min(100,s.soc)))}%`:'–%');
    set('msvVolt',fmt(s.voltage,2,' V'));set('msvAmp',signed(s.current,2,' A'));set('msvBatPower',signed(s.power,0,' W'));
    set('msvSolar',fmt(s.solar,0,' W'));set('msvLoad',fmt(s.load,0,' W'));set('msvDc',fmt(finite(s.dc)?Math.abs(s.dc):null,0,' W'));
    set('msvShore',s.shore===true?'Aangesloten':s.shore===false?'Niet aangesloten':'Niet gekoppeld');
    set('msvShoreMeta',s.shore===true&&finite(s.shoreV)?`${fmt(s.shoreV,0,' V')} via MultiPlus`:s.shore===false?'Geen walspanning':'Sensor nog niet beschikbaar');
    set('msvStart',fmt(s.start,2,' V'));set('msvStartState',!finite(s.start)?'Wachten':s.start>=12.2?'In orde':s.start>=12?'Laag':'Controleren');
    set('msvFuel',finite(s.fuel)?`${Math.round(s.fuel)}%`:'–%');set('msvFuelL',fmt(s.fuelL,0,' L'));set('msvWater',finite(s.water)?`${Math.round(s.water)}%`:'–%');
    const multi=finite(s.charger)&&s.charger>5?'Laden':finite(s.inverter)&&Math.abs(s.inverter)>5?'Omvormen':s.shore===true?'Walstroom':'Stand-by';
    set('msvMulti',multi);set('msvInv',fmt(s.inverter,0,' W'));set('msvCharge',finite(s.charger)&&s.charger>5?'Laden':'Lader uit');set('msvChg',fmt(s.charger,0,' W'));
    const at=Date.parse(String(s.sampledAt||'')),fresh=Number.isFinite(at)?Date.now()-at<300000:Boolean(window.MIJSERENITY_VRM_LIVE_ENERGY);
    const live=$('msvLive');if(live)live.classList.toggle('offline',!fresh);
    set('msvUpdated',fresh&&Number.isFinite(at)?`Cerbo GX live · ${new Date(at).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}`:fresh?'Cerbo GX live':'Wachten op Cerbo GX live-data');
  }

  function token(){
    for(const key of tokenKeys){const value=localStorage.getItem(key);if(value&&String(value).trim())return String(value).trim().replace(/^Token\s+/i,'')}
    try{const cfg=JSON.parse(localStorage.getItem('mijnserenity-ruuvi-climate-v7102')||'{}');if(cfg?.vrmToken)return String(cfg.vrmToken).trim().replace(/^Token\s+/i,'')}catch{}
    return '';
  }
  function client(){try{return typeof sb!=='undefined'?sb:null}catch{return null}}
  function boat(){try{return typeof currentBoat!=='undefined'?currentBoat:null}catch{return null}}
  function user(){try{return typeof currentUser!=='undefined'?currentUser:null}catch{return null}}
  async function refresh(force=false){
    if(busy||(!force&&Date.now()-lastFetch<55000))return;
    const c=client(),b=boat(),u=user(),vrm=token();if(!c||!b?.id||!u||!vrm)return;
    busy=true;lastFetch=Date.now();
    try{
      const {data,error}=await c.functions.invoke('victron-energy-live',{body:{boatId:b.id},headers:{'x-vrm-token':vrm}});
      if(error||!data?.success)throw error||new Error(data?.error||'Geen geldige VRM-data');
      window.MIJSERENITY_VRM_LIVE_ENERGY=data;
      window.dispatchEvent(new CustomEvent('mijnserenity-vrm-energy-live-updated',{detail:data}));
      render();
    }catch(error){console.warn('Victron Live vernieuwen mislukt:',error)}finally{busy=false}
  }

  ['mijnserenity:dashboard-ready','mijnserenity-vrm-energy-live-updated','mijnserenity-vrm-diagnostics-updated','mijnserenity-ha-state-updated','mijnserenity:routechange'].forEach(name=>window.addEventListener(name,render,{passive:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();refresh(false)}},{passive:true});
  window.addEventListener('focus',()=>{render();refresh(false)},{passive:true});

  function start(){render();setTimeout(render,500);setTimeout(()=>{render();refresh(true)},1800);setTimeout(render,3500);setInterval(()=>{if(!document.hidden){render();refresh(false)}},60000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
