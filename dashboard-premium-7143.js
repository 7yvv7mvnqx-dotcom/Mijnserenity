/* MijnSerenity 7.17.0 — legacy premium dashboard verwijderd.
   Alleen de nuttige huishoudaccu stroom-/vermogensflow blijft actief. */
(function(){
  'use strict';
  if(window.__ms71531BatteryFlow)return;
  window.__ms71531BatteryFlow=true;

  function byId(id){return document.getElementById(id)}
  function parseNumber(text){
    const match=String(text||'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    if(!match)return null;
    const value=Number(match[0]);
    return Number.isFinite(value)?value:null;
  }
  function readFrom(ids){
    for(const id of ids){
      const value=parseNumber(byId(id)?.textContent);
      if(value!==null)return value;
    }
    return null;
  }
  function readCurrent(){return readFrom(['ivmsBatteryCurrent','techHouseCurrent','liveHouseCurrent','ms71510HouseCurrent'])}
  function readVoltage(){return readFrom(['ivmsBatteryVoltage','techHouseVoltage','liveHouseVoltage','ms71510HouseVoltage'])}
  function sourceLabel(){
    const shore=String(byId('techShorePowerStatus')?.textContent||'').toLowerCase();
    const solar=readFrom(['techSolarPower']);
    if(shore.includes('walstroom')&&!shore.includes('geen')&&!shore.includes('niet'))return 'WAL';
    if(solar!==null&&solar>5)return 'ZON';
    return 'BOORD';
  }

  function installStyle(){
    if(byId('ms71531BatteryFlowStyle'))return;
    const style=document.createElement('style');
    style.id='ms71531BatteryFlowStyle';
    style.textContent=`
#ms71530BatteryFlow{display:none!important}
#ms71531BatteryFlow{grid-column:1/-1;width:100%;display:grid;grid-template-columns:auto minmax(70px,1fr) auto;align-items:center;gap:7px;margin-top:9px;padding-top:8px;border-top:1px solid rgba(105,204,235,.16);pointer-events:none}
#ms71531BatteryFlow .node{font-size:9px;font-weight:900;letter-spacing:.05em;color:#b9d5df;white-space:nowrap}
#ms71531BatteryFlow .track{position:relative;height:7px;border-radius:999px;background:rgba(139,183,199,.14);overflow:hidden}
#ms71531BatteryFlow .dot{position:absolute;top:50%;left:-10px;width:7px;height:7px;border-radius:50%;background:#d8f9ff;box-shadow:0 0 9px rgba(118,226,255,.95);transform:translateY(-50%);animation:ms71531Right var(--flow-speed,1.8s) linear infinite}
#ms71531BatteryFlow .dot:nth-child(2){animation-delay:-.45s}#ms71531BatteryFlow .dot:nth-child(3){animation-delay:-.9s}#ms71531BatteryFlow .dot:nth-child(4){animation-delay:-1.35s}
#ms71531BatteryFlow[data-direction="out"] .dot{animation-name:ms71531Left}#ms71531BatteryFlow[data-direction="idle"] .dot{animation-play-state:paused;opacity:.18}
#ms71531BatteryFlow .meta{grid-column:1/-1;display:flex;justify-content:center;gap:7px;align-items:center;color:#9fbcc7;font-size:10px;font-weight:800;text-align:center;white-space:nowrap}
#ms71531BatteryFlow .meta strong{color:#eafaff;font-size:11px}
@keyframes ms71531Right{from{left:-10px}to{left:calc(100% + 10px)}}
@keyframes ms71531Left{from{left:calc(100% + 10px)}to{left:-10px}}
@media(max-width:520px){#ms71531BatteryFlow{gap:5px;margin-top:7px;padding-top:7px}#ms71531BatteryFlow .node{font-size:8px}#ms71531BatteryFlow .meta{font-size:9px;gap:5px}#ms71531BatteryFlow .meta strong{font-size:10px}}
@media(prefers-reduced-motion:reduce){#ms71531BatteryFlow .dot{animation:none!important;left:50%!important}}
`;
    document.head.appendChild(style);
  }

  function ensureFlow(){
    installStyle();
    const old=byId('ms71530BatteryFlow');
    if(old)old.style.display='none';
    const existing=byId('ms71531BatteryFlow');
    if(existing)return existing;
    const host=document.querySelector('#ms71510Dashboard .ms71510-house-battery');
    if(!host)return null;
    const flow=document.createElement('span');
    flow.id='ms71531BatteryFlow';
    flow.dataset.direction='idle';
    flow.innerHTML='<span class="node" id="ms71531Source">BOORD</span><span class="track" aria-hidden="true"><i class="dot"></i><i class="dot"></i><i class="dot"></i><i class="dot"></i></span><span class="node">ACCU</span><span class="meta"><strong id="ms71531Label">Geen stroommeting</strong><span id="ms71531Power">– W</span></span>';
    host.appendChild(flow);
    return flow;
  }

  function updateMainPower(power,current){
    const value=byId('ms71510HouseCurrent');
    if(!value)return;
    const title=value.parentElement?.querySelector('small');
    if(title)title.textContent='VERMOGEN';
    if(power===null){value.textContent='– W';return}
    value.textContent=Math.round(Math.abs(power)).toLocaleString('nl-NL')+' W';
    value.title=(current!==null?current.toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})+' A · ':'')+'vermogen huishoudaccu';
  }

  function update(){
    try{
      const flow=ensureFlow();
      if(!flow)return;
      const current=readCurrent();
      const voltage=readVoltage();
      const power=(current!==null&&voltage!==null)?voltage*current:null;
      const absCurrent=current===null?0:Math.abs(current);
      const absPower=power===null?null:Math.abs(power);
      const label=byId('ms71531Label');
      const amount=byId('ms71531Power');
      const source=byId('ms71531Source');
      if(source)source.textContent=sourceLabel();
      updateMainPower(power,current);

      if(current===null||voltage===null){
        flow.dataset.direction='idle';
        flow.style.setProperty('--flow-speed','2.2s');
        if(label)label.textContent='Geen vermogensmeting';
        if(amount)amount.textContent='– W';
        return;
      }

      const speed=Math.max(.65,Math.min(2.4,2.4-(Math.min(absCurrent,50)/50)*1.75));
      flow.style.setProperty('--flow-speed',speed.toFixed(2)+'s');
      if(amount)amount.textContent=Math.round(absPower).toLocaleString('nl-NL')+' W';

      if(absCurrent<0.15){
        flow.dataset.direction='idle';
        if(label)label.textContent='Nagenoeg geen stroom';
      }else if(current>0){
        flow.dataset.direction='in';
        if(label)label.textContent='Laden →';
      }else{
        flow.dataset.direction='out';
        if(label)label.textContent='← Ontladen';
      }
    }catch(error){
      console.warn('Accu-stroomvisualisatie kon niet bijwerken:',error);
    }
  }

  function install(){
    update();
    setTimeout(update,900);
    ['mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-ruuvi-vrm-updated'].forEach(name=>window.addEventListener(name,update,{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(update,120)},{passive:true});
    setInterval(()=>{if(!document.hidden)update()},3000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
