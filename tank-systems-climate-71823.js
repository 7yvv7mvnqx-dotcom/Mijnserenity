/* MijnSerenity 7.18.23 — Ruuvi klimaat in Tank & Systems */
(()=>{
  'use strict';
  if(window.__msTankSystemsClimate71823)return;
  window.__msTankSystemsClimate71823=true;

  const $=id=>document.getElementById(id);
  const num=value=>{
    const match=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  };
  const set=(id,value)=>{const el=$(id);if(el&&el.textContent!==String(value))el.textContent=String(value)};
  const fmtTemp=value=>value===null?'– °C':`${Number(value).toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})} °C`;
  const fmtHumidity=value=>value===null?'– % RV':`${Math.round(Number(value))}% RV`;

  function readClimate(){
    let climate=null;
    try{
      if(typeof window.ms7102GetRuuviClimate==='function')climate=window.ms7102GetRuuviClimate();
    }catch{}

    const vrm=window.MIJSERENITY_VRM_DATA||{};
    const salon=climate?.salon||{};
    const machine=climate?.forward||climate?.machinekamer||{};

    return {
      salon:{
        temperature:num(salon.temperature)??num(vrm.salon?.temperature)??num($('ivmsCabinTemp')?.textContent),
        humidity:num(salon.humidity)??num(vrm.salon?.humidity)??num($('ivmsCabinHumidity')?.textContent)
      },
      machine:{
        temperature:num(machine.temperature)??num(vrm.machinekamer?.temperature)??num(vrm.forward?.temperature)??num($('ivmsForwardTemp')?.textContent),
        humidity:num(machine.humidity)??num(vrm.machinekamer?.humidity)??num(vrm.forward?.humidity)??num($('ivmsForwardHumidity')?.textContent)
      }
    };
  }

  function ensureStyle(){
    if($('msTankSystemsClimate71823Style'))return;
    const style=document.createElement('style');
    style.id='msTankSystemsClimate71823Style';
    style.textContent=`
      #msMarineGlass .mg-climate-mini{
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:8px!important;
        padding:10px 12px!important;
        border-top:1px solid var(--mg-line2)!important;
      }
      #msMarineGlass .mg-climate-mini button{
        min-width:0!important;
        min-height:76px!important;
        padding:10px 11px!important;
        border:1px solid var(--mg-line)!important;
        border-radius:8px!important;
        background:rgba(255,255,255,.018)!important;
        text-align:left!important;
      }
      #msMarineGlass .mg-climate-mini small{
        display:block!important;
        color:#a8bfce!important;
        font-size:10px!important;
        line-height:1.15!important;
      }
      #msMarineGlass .mg-climate-values{
        display:flex!important;
        align-items:baseline!important;
        justify-content:space-between!important;
        gap:7px!important;
        margin-top:7px!important;
      }
      #msMarineGlass .mg-climate-values strong{
        color:#f6fbff!important;
        font-size:17px!important;
        line-height:1!important;
        white-space:nowrap!important;
      }
      #msMarineGlass .mg-climate-values b{
        color:var(--mg-blue)!important;
        font-size:12px!important;
        line-height:1!important;
        white-space:nowrap!important;
      }
      #msMarineGlass .mg-climate-mini em{
        display:block!important;
        margin-top:7px!important;
        color:#718c9e!important;
        font-size:8px!important;
        font-style:normal!important;
        letter-spacing:.03em!important;
      }
      @media(max-width:390px){
        #msMarineGlass .mg-climate-mini{padding:9px 10px!important;gap:6px!important}
        #msMarineGlass .mg-climate-mini button{padding:9px!important}
        #msMarineGlass .mg-climate-values{display:grid!important;gap:5px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureCards(){
    const systems=document.querySelector('#msMarineGlass .mg-systems');
    if(!systems)return false;
    if($('mgClimateMini'))return true;

    const block=document.createElement('div');
    block.id='mgClimateMini';
    block.className='mg-climate-mini';
    block.innerHTML=`
      <button type="button" data-go="technical" aria-label="Klimaat Salon Serenity">
        <small>🌡️ Salon</small>
        <span class="mg-climate-values"><strong id="mgSalonTemp">– °C</strong><b id="mgSalonRv">– % RV</b></span>
        <em>Ruuvi · Salon Serenity</em>
      </button>
      <button type="button" data-go="technical" aria-label="Klimaat Machinekamer Serenity">
        <small>🌡️ Machinekamer</small>
        <span class="mg-climate-values"><strong id="mgMachineTemp">– °C</strong><b id="mgMachineRv">– % RV</b></span>
        <em>Ruuvi · Machinekamer Serenity</em>
      </button>`;

    const firstSystem=systems.querySelector('.mg-system');
    if(firstSystem)systems.insertBefore(block,firstSystem);else systems.appendChild(block);
    return true;
  }

  function sync(){
    ensureStyle();
    if(!ensureCards())return;
    const climate=readClimate();
    set('mgSalonTemp',fmtTemp(climate.salon.temperature));
    set('mgSalonRv',fmtHumidity(climate.salon.humidity));
    set('mgMachineTemp',fmtTemp(climate.machine.temperature));
    set('mgMachineRv',fmtHumidity(climate.machine.humidity));
  }

  function start(){
    sync();
    [200,700,1800,4000].forEach(delay=>setTimeout(sync,delay));
    ['mijnserenity-vrm-updated','mijnserenity-ruuvi-vrm-updated','mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity:routechange','mijnserenity:modules-ready']
      .forEach(name=>window.addEventListener(name,sync,{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()},{passive:true});
    setInterval(()=>{if(!document.hidden)sync()},5000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();