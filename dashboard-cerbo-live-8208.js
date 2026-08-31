/* MijnSerenity 8.20.8 — Cerbo GX live energiestroom op het Marine Glass dashboard.
   Eigen DOM-ID's voorkomen dat de oudere Marine Glass energierenderer live Victronwaarden overschrijft. */
(()=>{
  'use strict';
  if(window.__msCerboLive8208)return;
  window.__msCerboLive8208=true;

  const $=id=>document.getElementById(id);
  const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
  const num=value=>finite(value)?Number(value):null;
  const metric=value=>num(value?.value??value);
  const text=id=>String($(id)?.textContent||'').trim();
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const fmt=(value,digits=0,unit='')=>finite(value)
    ?`${Number(value).toLocaleString('nl-NL',{minimumFractionDigits:digits,maximumFractionDigits:digits})}${unit}`
    :`–${unit}`;
  const signed=(value,digits=1,unit='')=>finite(value)
    ?`${Number(value)>0?'+':''}${fmt(value,digits,unit)}`
    :`–${unit}`;

  let lastForcedRefresh=0;
  let refreshTimer=0;
  let mountAttempts=0;

  function liveData(){
    const live=window.MIJSERENITY_VRM_LIVE_ENERGY;
    if(!live||typeof live!=='object'||live.success===false)return {};
    const sampled=Date.parse(String(live.sampledAt||''));
    if(Number.isFinite(sampled)&&Date.now()-sampled>15*60*1000)return {};
    return live;
  }

  function diagnostics(){
    const data=window.MIJSERENITY_VRM_DIAGNOSTICS;
    return data&&typeof data==='object'?data:{};
  }

  function technical(){
    try{
      if(typeof technicalStateCache!=='undefined'&&technicalStateCache)return technicalStateCache;
      if(typeof readTechnicalLocalState==='function')return readTechnicalLocalState()||{};
    }catch{}
    return {};
  }

  function states(){
    try{return typeof window.ms730GetStateSnapshot==='function'?window.ms730GetStateSnapshot():[]}
    catch{return []}
  }

  function stateNumber(terms,unit=''){
    const candidates=states().map(entity=>{
      const value=num(entity?.state);
      if(value===null)return null;
      const hay=`${entity?.entity_id||''} ${entity?.name||''} ${entity?.attributes?.friendly_name||''}`.toLowerCase();
      let score=0;
      terms.forEach((term,index)=>{if(hay.includes(term.toLowerCase()))score+=80-index});
      const entityUnit=String(entity?.attributes?.unit_of_measurement||'').toLowerCase();
      if(unit&&entityUnit===unit.toLowerCase())score+=20;
      if(/victron|cerbo|orion|smartshunt|multiplus|serenity/.test(hay))score+=10;
      return {value,score};
    }).filter(Boolean).filter(item=>item.score>=75).sort((a,b)=>b.score-a.score);
    return candidates[0]?.value??null;
  }

  function snapshot(){
    const live=liveData(),diag=diagnostics(),t=technical();
    const battery=live.battery||{},solar=live.solar||{},ac=live.ac||{};
    const db=diag.battery||{},ds=diag.solar||{};

    const soc=num(battery.soc)??metric(db.soc)??num(t.houseSoc)??num(text('techHouseSoc'));
    const voltage=num(battery.voltage)??metric(db.voltage)??num(t.houseVoltage)??num(text('techHouseVoltage'));
    const current=num(battery.current)??metric(db.current)??num(t.houseCurrent)??num(text('techHouseCurrent'));
    let power=num(battery.power)??metric(db.power)??num(t.housePower);
    if(power===null&&voltage!==null&&current!==null)power=voltage*current;

    const pv=num(solar.power)??metric(ds.power)??num(t.solarPower)??stateNumber(['solar charger power','mppt power','pv power','zonnepaneel vermogen'],'w');
    const startVoltage=num(battery.starterVoltage)??metric(db.starterVoltage)??num(t.startVoltage)??num(text('techStartVoltage'));
    const inverter=num(ac.inverterPower)??num(t.inverterPower)??stateNumber(['inverter power','omvormer vermogen'],'w');
    const charger=num(ac.chargerPower)??num(t.chargerPower)??stateNumber(['charger power','lader vermogen','charging power'],'w');
    const acLoad=num(ac.loadPower)??num(ac.outputPower)??num(t.loadPower)??stateNumber(['ac loads','ac load','ac belastingen','ac output power'],'w');
    const shoreVoltage=num(ac.inputVoltage)??num(t.shoreVoltage);
    let shore=typeof ac.shoreConnected==='boolean'?ac.shoreConnected:null;
    if(shore===null&&typeof t.shorePower==='boolean')shore=t.shorePower;
    if(shore===null&&finite(shoreVoltage))shore=shoreVoltage>=180&&shoreVoltage<=280?true:shoreVoltage<80?false:null;

    const dynamo=num(live.alternator?.power)??num(live.system?.alternatorPower)??num(t.alternatorPower)??num(t.dynamoPower)
      ??stateNumber(['dynamo power','dynamo vermogen','alternator power','orion power','orion xs power','dc-dc power'],'w');

    let dcLoad=num(live.system?.dcLoadPower)??num(ac.dcLoadPower)??num(t.dcLoadPower)
      ??stateNumber(['dc loads','dc load','dc belastingen','dc consumption','dc verbruik'],'w');
    let dcDerived=false;
    if(dcLoad===null&&finite(power)&&power<0&&Math.abs(pv??0)<3&&Math.abs(inverter??0)<3&&Math.abs(charger??0)<3&&Math.abs(dynamo??0)<3){
      dcLoad=Math.abs(power);
      dcDerived=true;
    }

    const timeToGo=metric(db.timeToGo)??num(battery.timeToGo)??num(t.timeToGo);
    const sampledAt=live.sampledAt||diag.sampledAt||diag.sampled_at||t.liveTechnicalAt||'';
    const batteryState=!finite(power)?'Wachten':power>8?'Laden':power<-8?'Ontladen':'Rust';
    const multiState=finite(charger)&&charger>5?'Laden':finite(inverter)&&Math.abs(inverter)>5?'Omvormen':shore===true?'Walstroom':'Uit';

    return {soc,voltage,current,power,pv,startVoltage,inverter,charger,acLoad,shore,shoreVoltage,dynamo,dcLoad,dcDerived,timeToGo,sampledAt,batteryState,multiState};
  }

  function ensureStyle(){
    if($('msCerboLive8208Style'))return;
    const style=document.createElement('style');
    style.id='msCerboLive8208Style';
    style.textContent=`
      #msMarineGlass .mg-energy{overflow:visible!important}
      #msMarineGlass .mscerbo{min-width:0;color:#f5fbff}
      #msMarineGlass .mscerbo-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px}
      #msMarineGlass .mscerbo-head h3{margin:0!important}
      #msMarineGlass .mscerbo-live{display:flex;align-items:center;gap:6px;min-width:0;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#9eb5c7;white-space:nowrap}
      #msMarineGlass .mscerbo-live i{width:8px;height:8px;border-radius:50%;background:#32d583;box-shadow:0 0 0 3px rgba(50,213,131,.12)}
      #msMarineGlass .mscerbo-live.stale i{background:#f1b74a;box-shadow:0 0 0 3px rgba(241,183,74,.12)}
      #msMarineGlass .mscerbo-stage{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:minmax(118px,auto) minmax(150px,auto);gap:50px 12px;min-height:318px;isolation:isolate}
      #msMarineGlass .mscerbo-lines{position:absolute;inset:0;width:100%;height:100%;z-index:0;overflow:visible;pointer-events:none}
      #msMarineGlass .mscerbo-lines .base{fill:none;stroke:rgba(62,145,217,.38);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
      #msMarineGlass .mscerbo-lines .flow{fill:none;stroke:#3b91df;stroke-width:4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:10 12;opacity:0}
      #msMarineGlass .mscerbo-lines .flow.active{opacity:1;animation:mscerboFlow 1.2s linear infinite}
      #msMarineGlass .mscerbo-lines .flow.reverse{animation-direction:reverse}
      #msMarineGlass .mscerbo-lines circle{fill:#3186cf;stroke:#70b8f0;stroke-width:1.5}
      @keyframes mscerboFlow{to{stroke-dashoffset:-44}}
      @media(prefers-reduced-motion:reduce){#msMarineGlass .mscerbo-lines .flow.active{animation:none}}
      #msMarineGlass .mscerbo-card{position:relative;z-index:1;min-width:0;min-height:118px;padding:10px;border:1px solid rgba(76,164,235,.72);border-radius:12px;background:linear-gradient(180deg,rgba(16,47,72,.98),rgba(12,37,57,.98));color:#f5fbff;text-align:left;box-shadow:inset 0 0 0 1px rgba(15,92,151,.14);overflow:hidden}
      #msMarineGlass button.mscerbo-card{width:100%;font:inherit;cursor:pointer}
      #msMarineGlass .mscerbo-card small{display:block;color:#f5fbff;font-size:clamp(9px,2.5vw,12px);line-height:1.15;white-space:normal}
      #msMarineGlass .mscerbo-card strong{display:block;margin-top:7px;color:#fff;font-size:clamp(24px,6vw,36px);font-weight:500;line-height:.98;letter-spacing:-.035em;white-space:nowrap}
      #msMarineGlass .mscerbo-card em{display:block;margin-top:7px;color:#9eb5c7;font-size:10px;font-style:normal;line-height:1.15;white-space:normal}
      #msMarineGlass .mscerbo-card[data-pos="solar"]{grid-column:1;grid-row:1}
      #msMarineGlass .mscerbo-card[data-pos="multi"]{grid-column:2;grid-row:1}
      #msMarineGlass .mscerbo-card[data-pos="ac"]{grid-column:3;grid-row:1}
      #msMarineGlass .mscerbo-card[data-pos="dynamo"]{grid-column:1;grid-row:2}
      #msMarineGlass .mscerbo-card[data-pos="battery"]{grid-column:2;grid-row:2;min-height:150px;padding:0;border-color:#388dde;background:#123f66}
      #msMarineGlass .mscerbo-card[data-pos="dc"]{grid-column:3;grid-row:2}
      #msMarineGlass .mscerbo-battery-top{padding:10px 10px 8px;background:rgba(8,35,55,.58)}
      #msMarineGlass .mscerbo-battery-top small{display:flex;align-items:center;justify-content:space-between;gap:5px}
      #msMarineGlass .mscerbo-soc{display:block;padding:8px 10px 0;font-size:clamp(29px,7vw,43px)!important}
      #msMarineGlass .mscerbo-state{display:block;padding:0 10px;color:#acd0ee;font-size:11px}
      #msMarineGlass .mscerbo-ttg{display:block;padding:3px 10px 7px;color:#fff;font-size:10px}
      #msMarineGlass .mscerbo-battery-values{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:3px;padding:8px 7px 7px;border-top:1px solid rgba(255,255,255,.08)}
      #msMarineGlass .mscerbo-battery-values span{min-width:0;text-align:center;font-size:clamp(9px,2.4vw,12px);white-space:nowrap}
      #msMarineGlass .mscerbo-start{display:block;padding:0 8px 8px;text-align:center;color:#b8d2e6;font-size:9px;white-space:nowrap}
      #msMarineGlass .mscerbo-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding-top:9px;border-top:1px solid rgba(126,186,225,.16);color:#8eaabc;font-size:9px;line-height:1.2}
      #msMarineGlass .mscerbo-footer button{min-height:34px;padding:6px 9px;border:1px solid rgba(77,164,230,.35);border-radius:9px;background:rgba(17,60,91,.72);color:#d9efff;font-size:10px;font-weight:700}
      @media(max-width:430px){
        #msMarineGlass .mscerbo-stage{grid-template-rows:minmax(110px,auto) minmax(146px,auto);gap:44px 7px;min-height:300px}
        #msMarineGlass .mscerbo-card{min-height:110px;padding:8px;border-radius:10px}
        #msMarineGlass .mscerbo-card[data-pos="battery"]{min-height:146px;padding:0}
        #msMarineGlass .mscerbo-card strong{margin-top:6px;font-size:clamp(22px,6.2vw,30px)}
        #msMarineGlass .mscerbo-card small{font-size:9px}
        #msMarineGlass .mscerbo-card em{font-size:8.5px}
      }
    `;
    document.head.appendChild(style);
  }

  function mount(){
    ensureStyle();
    const card=document.querySelector('#msMarineGlass .mg-energy');
    if(!card)return false;
    if($('msCerboLivePanel'))return true;

    card.innerHTML=`
      <div id="msCerboLivePanel" class="mscerbo" aria-label="Cerbo GX live energiestroom">
        <div class="mscerbo-head">
          <h3>Energie &amp; Stroom</h3>
          <span id="msCerboLiveBadge" class="mscerbo-live"><i></i><b>CERBO GX · LIVE</b></span>
        </div>
        <div class="mscerbo-stage">
          <svg class="mscerbo-lines" viewBox="0 0 600 320" preserveAspectRatio="none" aria-hidden="true">
            <path class="base" d="M100 108 V160 H300 V211"/><path id="msCerboFlowSolar" class="flow" d="M100 108 V160 H300 V211"/>
            <path class="base" d="M300 108 V211"/><path id="msCerboFlowMulti" class="flow" d="M300 108 V211"/>
            <path class="base" d="M368 59 H500"/><path id="msCerboFlowAc" class="flow" d="M368 59 H500"/>
            <path class="base" d="M100 261 H232"/><path id="msCerboFlowDynamo" class="flow" d="M100 261 H232"/>
            <path class="base" d="M368 261 H500"/><path id="msCerboFlowDc" class="flow" d="M368 261 H500"/>
            <circle cx="100" cy="160" r="5"/><circle cx="300" cy="160" r="5"/><circle cx="300" cy="211" r="5"/><circle cx="232" cy="261" r="5"/><circle cx="368" cy="261" r="5"/><circle cx="500" cy="59" r="5"/>
          </svg>

          <button type="button" class="mscerbo-card" data-pos="solar" data-route="technical">
            <small>☼ Zon opbrengst</small><strong id="msCerboSolar">–W</strong><em id="msCerboSolarMeta">MPPT</em>
          </button>
          <button type="button" class="mscerbo-card" data-pos="multi" data-route="technical">
            <small>▣ Omvormer / Lader</small><strong id="msCerboMulti">–</strong><em id="msCerboMultiMeta">MultiPlus</em>
          </button>
          <button type="button" class="mscerbo-card" data-pos="ac" data-route="technical">
            <small>∿ AC Belastingen</small><strong id="msCerboAcLoad">–W</strong><em id="msCerboAcMeta">230 V</em>
          </button>
          <button type="button" class="mscerbo-card" data-pos="dynamo" data-route="technical">
            <small>⚡ Dynamo</small><strong id="msCerboDynamo">–W</strong><em id="msCerboDynamoMeta">Orion / alternator</em>
          </button>
          <button type="button" class="mscerbo-card" data-pos="battery" data-route="technical">
            <span class="mscerbo-battery-top"><small>▣ Accu <b id="msCerboBatteryFresh">LIVE</b></small></span>
            <strong id="msCerboSoc" class="mscerbo-soc">–%</strong>
            <span id="msCerboBatteryState" class="mscerbo-state">Wachten</span>
            <span id="msCerboTimeToGo" class="mscerbo-ttg">–</span>
            <span class="mscerbo-battery-values"><span id="msCerboVoltage">– V</span><span id="msCerboCurrent">– A</span><span id="msCerboPower">– W</span></span>
            <span id="msCerboStart" class="mscerbo-start">Startaccu – V</span>
          </button>
          <button type="button" class="mscerbo-card" data-pos="dc" data-route="technical">
            <small>⊖ DC Belastingen</small><strong id="msCerboDcLoad">–W</strong><em id="msCerboDcMeta">12 V verbruik</em>
          </button>
        </div>
        <div class="mscerbo-footer"><span id="msCerboUpdated">Wachten op Cerbo GX…</span><button id="msCerboRefresh" type="button">↻ Vernieuwen</button></div>
      </div>`;

    card.querySelectorAll('[data-route]').forEach(button=>button.addEventListener('click',()=>{
      if(typeof window.captainNavigate==='function')window.captainNavigate(button.dataset.route,button);
      else window.ms708GoToPage?.(button.dataset.route,true);
    }));
    $('msCerboRefresh')?.addEventListener('click',()=>forceRefresh(true));
    return true;
  }

  function set(id,value){const node=$(id);if(node&&node.textContent!==String(value))node.textContent=String(value)}
  function flow(id,active,reverse=false){
    const node=$(id);if(!node)return;
    node.classList.toggle('active',Boolean(active));
    node.classList.toggle('reverse',Boolean(reverse));
  }

  function ageLabel(sampledAt){
    const at=Date.parse(String(sampledAt||''));
    if(!Number.isFinite(at))return {label:'Cerbo GX live',stale:false};
    const seconds=Math.max(0,Math.round((Date.now()-at)/1000));
    if(seconds<8)return {label:'zojuist bijgewerkt',stale:false};
    if(seconds<60)return {label:`${seconds} sec geleden`,stale:seconds>30};
    const minutes=Math.round(seconds/60);
    return {label:`${minutes} min geleden`,stale:true};
  }

  function render(){
    if(!mount())return false;
    const s=snapshot();
    set('msCerboSolar',finite(s.pv)?`${Math.round(Math.abs(s.pv))}W`:'–W');
    set('msCerboSolarMeta',finite(s.pv)&&Math.abs(s.pv)<1?'MPPT · geen opbrengst':'MPPT · live');
    set('msCerboMulti',s.multiState||'–');
    set('msCerboMultiMeta',s.shore===true?(finite(s.shoreVoltage)?`Wal ${Math.round(s.shoreVoltage)} V`:'Walstroom'):s.shore===false?'Geen walstroom':'MultiPlus');
    set('msCerboAcLoad',finite(s.acLoad)?`${Math.round(Math.abs(s.acLoad))}W`:'–W');
    set('msCerboAcMeta',s.shore===true?'AC via walstroom':'AC uitgang');
    set('msCerboDynamo',finite(s.dynamo)?`${Math.round(Math.abs(s.dynamo))}W`:'–W');
    set('msCerboDynamoMeta',finite(s.dynamo)?'Orion / alternator live':'Geen vermogensmeting');
    set('msCerboSoc',finite(s.soc)?`${Math.round(clamp(s.soc,0,100))}%`:'–%');
    set('msCerboBatteryState',s.batteryState);
    set('msCerboTimeToGo',finite(s.timeToGo)?`${Math.max(0,s.timeToGo).toLocaleString('nl-NL',{maximumFractionDigits:1})} u resterend`:'');
    set('msCerboVoltage',fmt(s.voltage,2,' V'));
    set('msCerboCurrent',signed(s.current,1,' A'));
    set('msCerboPower',signed(s.power,0,' W'));
    set('msCerboStart',finite(s.startVoltage)?`Startaccu ${fmt(s.startVoltage,2,' V')}`:'Startaccu – V');
    set('msCerboDcLoad',finite(s.dcLoad)?`${s.dcDerived?'≈':''}${Math.round(Math.abs(s.dcLoad))}W`:'–W');
    set('msCerboDcMeta',s.dcDerived?'Berekend uit accuvermogen':'12 V verbruik live');

    const age=ageLabel(s.sampledAt);
    const badge=$('msCerboLiveBadge');
    badge?.classList.toggle('stale',age.stale);
    set('msCerboUpdated',age.label);
    set('msCerboBatteryFresh',age.stale?'OUD':'LIVE');

    flow('msCerboFlowSolar',finite(s.pv)&&Math.abs(s.pv)>2,false);
    flow('msCerboFlowMulti',(finite(s.charger)&&Math.abs(s.charger)>2)||(finite(s.inverter)&&Math.abs(s.inverter)>2),finite(s.inverter)&&Math.abs(s.inverter)>2);
    flow('msCerboFlowAc',finite(s.acLoad)&&Math.abs(s.acLoad)>2,true);
    flow('msCerboFlowDynamo',finite(s.dynamo)&&Math.abs(s.dynamo)>2,false);
    flow('msCerboFlowDc',finite(s.dcLoad)&&Math.abs(s.dcLoad)>2,true);
    return true;
  }

  async function forceRefresh(userInitiated=false){
    if(document.hidden)return false;
    const now=Date.now();
    if(!userInitiated&&now-lastForcedRefresh<9000)return false;
    lastForcedRefresh=now;
    if(userInitiated)set('msCerboUpdated','Cerbo GX wordt vernieuwd…');
    try{
      if(typeof window.ms71915RefreshEnergy==='function')await window.ms71915RefreshEnergy();
      else if(typeof window.msEnergyBridge8206Refresh==='function')window.msEnergyBridge8206Refresh();
    }catch(error){console.debug('Cerbo live vernieuwen:',error)}
    render();
    return true;
  }

  function dashboardVisible(){
    const dashboard=$('dashboard');
    return Boolean(dashboard&&!dashboard.classList.contains('hidden')&&!document.hidden);
  }

  function start(){
    if(!mount()){
      mountAttempts+=1;
      if(mountAttempts<20)setTimeout(start,350);
      return;
    }
    render();
    [250,900,1800,3500].forEach(ms=>setTimeout(render,ms));
    setTimeout(()=>forceRefresh(false),800);
    if(refreshTimer)clearInterval(refreshTimer);
    refreshTimer=setInterval(()=>{
      if(!dashboardVisible())return;
      render();
      forceRefresh(false);
    },10000);
  }

  [
    'mijnserenity:dashboard-ready','mijnserenity-vrm-energy-live-updated',
    'mijnserenity-vrm-diagnostics-updated','mijnserenity-ha-state-updated',
    'mijnserenity-ha-connected','mijnserenity:routechange','mijnserenity:modules-ready'
  ].forEach(name=>window.addEventListener(name,render,{passive:true}));
  window.addEventListener('focus',()=>{render();forceRefresh(false)},{passive:true});
  window.addEventListener('pageshow',()=>{render();forceRefresh(false)},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();forceRefresh(false)}},{passive:true});

  window.msCerboLive8208Render=render;
  window.msCerboLive8208Refresh=()=>forceRefresh(true);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();