/* MijnSerenity 7.18.22 — startaccu in dezelfde layout als huishoudaccu */
(()=>{
  'use strict';
  if(window.__msStartBatterySoc71822)return;
  window.__msStartBatterySoc71822=true;

  const $=id=>document.getElementById(id);
  const num=value=>{
    const match=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  };
  const readNumber=ids=>{
    for(const id of ids){
      const value=num($(id)?.textContent);
      if(value!==null)return value;
    }
    return null;
  };
  const fmt=(value,digits=1)=>value===null?'–':Number(value).toLocaleString('nl-NL',{minimumFractionDigits:digits,maximumFractionDigits:digits});

  /*
   * De SmartShunt AUX/startaccu-aansluiting levert nu alleen spanning.
   * Daarom gebruiken we een rustige 12V-loodaccu spanningscurve als
   * schatting totdat er een echte startaccu-SOC sensor beschikbaar is.
   */
  function estimatedSocFromVoltage(voltage){
    if(voltage===null||voltage<8||voltage>16)return null;
    if(voltage>=12.73)return 100;
    if(voltage<=11.50)return 0;
    const points=[
      [11.50,10],[11.66,20],[11.81,30],[11.96,40],[12.10,50],
      [12.24,60],[12.37,70],[12.50,80],[12.62,90],[12.73,100]
    ];
    for(let i=1;i<points.length;i++){
      const [v1,s1]=points[i-1], [v2,s2]=points[i];
      if(voltage<=v2){
        const raw=s1+((voltage-v1)/(v2-v1))*(s2-s1);
        return Math.max(0,Math.min(100,Math.round(raw/5)*5));
      }
    }
    return 100;
  }

  function ensureStyle(){
    if($('msStartBatterySoc71822Style'))return;
    const style=document.createElement('style');
    style.id='msStartBatterySoc71822Style';
    style.textContent=`
      #msMarineGlass .mg-start.mg-battery strong{
        display:block!important;
        color:var(--mg-green)!important;
        font-size:28px!important;
        line-height:1!important;
        margin:5px 0!important;
      }
      #msMarineGlass .mg-start.mg-battery em{
        display:inline!important;
        color:#b8cbd7!important;
        font-size:11px!important;
        font-style:normal!important;
        margin-right:8px!important;
      }
      #msMarineGlass .mg-start.mg-battery[data-soc-source="estimate"] em{
        color:#8fa8b8!important;
      }
    `;
    document.head.appendChild(style);
  }

  function upgradeCard(){
    const card=document.querySelector('#msMarineGlass .mg-start');
    if(!card)return false;
    card.classList.add('mg-battery','mg-start-battery');
    if(!$('mgStartSoc')){
      card.innerHTML='<small>Startaccu</small><strong id="mgStartSoc">–%</strong><span id="mgStartV">– V</span><em id="mgStartAmp">SOC geschat</em>';
    }
    return true;
  }

  function sync(){
    ensureStyle();
    if(!upgradeCard())return;

    const card=document.querySelector('#msMarineGlass .mg-start-battery');
    const voltage=readNumber(['mgStartV','ms71510StartVoltage','techStartVoltage','liveStartVoltage']);
    const measuredSoc=readNumber(['ms71510StartSoc','techStartSoc','ivmsStartSoc']);
    const current=readNumber(['ms71510StartCurrent','techStartCurrent','ivmsStartCurrent']);
    const soc=measuredSoc!==null?Math.max(0,Math.min(100,Math.round(measuredSoc))):estimatedSocFromVoltage(voltage);

    if($('mgStartSoc'))$('mgStartSoc').textContent=soc===null?'–%':`${soc}%`;
    if($('mgStartV'))$('mgStartV').textContent=voltage===null?'– V':`${fmt(voltage,1)} V`;
    if($('mgStartAmp'))$('mgStartAmp').textContent=current===null?(measuredSoc!==null?'SOC gemeten':'SOC geschat'):`${fmt(current,1)} A`;
    if(card)card.dataset.socSource=measuredSoc!==null?'measured':'estimate';
  }

  function start(){
    sync();
    setTimeout(sync,250);
    setTimeout(sync,1000);
    setTimeout(sync,3000);

    const root=$('dashboard')||document.body;
    if(window.MutationObserver&&root){
      const observer=new MutationObserver(()=>queueMicrotask(sync));
      observer.observe(root,{childList:true,subtree:true,characterData:true});
    }

    ['mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-vrm-updated','mijnserenity-vrm-energy-live-updated','mijnserenity-vrm-diagnostics-updated','mijnserenity:routechange']
      .forEach(name=>window.addEventListener(name,sync,{passive:true}));
    setInterval(()=>{if(!document.hidden)sync()},5000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
