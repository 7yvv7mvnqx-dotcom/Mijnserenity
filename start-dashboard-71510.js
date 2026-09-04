/* MijnSerenity 8.23.6 — dashboard hotfix voor iPhone + live Cerbo-waarden + aandachtspunten */
(()=>{
  'use strict';
  if(window.__msDashboardHotfix8235)return;
  window.__msDashboardHotfix8235=true;

  const BUILD='8.23.6';
  const SOURCE='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@f63ec7e8acea22a105c69ca6de95b5be25371a7e/start-dashboard-71510.js';
  const $=id=>document.getElementById(id);
  const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
  const numberFrom=value=>{
    const match=clean(value).replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  };
  const invalid=value=>{
    const text=clean(value);
    return !text||/^(?:undefined|null|–|-|—|–\s*(?:%|v|°c|bft|m)?|-\s*(?:%|v|°c|bft|m)?)$/i.test(text);
  };
  const first=ids=>{
    for(const id of ids){const text=clean($(id)?.textContent);if(!invalid(text))return text}
    return '';
  };
  const set=(id,value,missing=false)=>{
    const node=$(id);if(!node)return;
    if(node.textContent!==String(value))node.textContent=String(value);
    node.classList.toggle('is-missing',Boolean(missing));
    node.closest('.ms8234-status')?.classList.toggle('is-missing',Boolean(missing));
  };
  const setRing=(id,value)=>{const node=$(id);if(node)node.style.setProperty('--pct',String(Math.max(0,Math.min(100,value||0))))};

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');if(meta)meta.content=BUILD;
    const version=$('settingsAppVersion');if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
  }

  function installCss(){
    if($('ms8235DashboardHotfixStyle'))return;
    const style=document.createElement('style');
    style.id='ms8235DashboardHotfixStyle';
    style.textContent=`
#ms8210Start .ms8234-attention{flex:0 0 166px!important;min-width:0!important;max-width:48%!important;gap:8px!important;padding:9px 10px!important}
#ms8210Start .ms8234-attention-copy{min-width:0!important;flex:1!important}
#ms8210Start .ms8234-attention-copy strong{font-size:11.5px!important;line-height:1.05!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important}
#ms8210Start .ms8234-status{min-height:61px!important}
#ms8210Start .ms8234-status-copy strong{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;line-height:1.08!important}
#ms8210Start .ms8234-status.is-missing strong,#ms8210Start .is-missing{color:#8fa6b6!important}
#ms8210Start .ms8234-live-copy strong.is-missing{font-size:11px!important;color:#9bb1c0!important}
#ms8210Start .ms8234-gauge-copy strong.is-missing{font-size:11px!important;color:#8fa6b6!important}
@media(max-width:620px){#ms8210Start .ms8234-attention{flex-basis:158px!important}}
@media(max-width:390px){#ms8210Start .ms8234-brand h1{font-size:38px!important}#ms8210Start .ms8234-attention{flex-basis:146px!important;gap:7px!important}#ms8210Start .ms8234-attention-copy small{display:none!important}#ms8210Start .ms8234-attention-copy strong{font-size:10.5px!important}#ms8210Start .ms8234-live-copy strong.is-missing{font-size:9.5px!important}}`;
    document.head.appendChild(style);
  }

  function battery(){
    const live=window.MIJSERENITY_VRM_LIVE_ENERGY||{};
    const diag=window.MIJSERENITY_VRM_DIAGNOSTICS||{};
    const metric=value=>value&&typeof value==='object'&&'value' in value?value.value:value;
    const soc=numberFrom(live.battery?.soc)??numberFrom(metric(diag.battery?.soc))??numberFrom(first(['msCerboSoc','ms71510HouseSoc','ivmsBatterySoc','ivmsBatteryRing','techHouseSoc','liveHouseSoc']));
    const voltage=numberFrom(live.battery?.voltage)??numberFrom(metric(diag.battery?.voltage))??numberFrom(first(['msCerboVoltage','ms71510HouseVoltage','ivmsBatteryVoltage','techHouseVoltage','liveHouseVoltage']));
    return {soc,voltage};
  }

  function location(){
    const label=first(['liveLocationName','gpsLocationName','currentLocationName','routeCurrentLocation']);
    if(label)return {text:label,missing:false};
    const direct=document.querySelector('[data-current-location]');
    if(direct&&!invalid(direct.textContent))return {text:clean(direct.textContent),missing:false};
    const state=window.liveNavState||{};
    const lat=numberFrom(state.currentLat??state.lat),lon=numberFrom(state.currentLon??state.lon??state.lng);
    return lat!==null&&lon!==null?{text:'GPS actief',missing:false}:{text:'GPS zoeken…',missing:true};
  }

  function apply(){
    const root=$('ms8210Start');if(!root)return;
    syncBuild();installCss();

    const loc=location();set('ms8234Location',loc.text,loc.missing);
    const outside=first(['ivmsOutsideTemp','weatherCurrentTemp','currentWeatherTemp','ms709WeatherTemp']);
    set('ms8234Outside',outside||'Geen data',!outside);

    const b=battery();
    const soc=b.soc===null?'':`${Math.round(Math.max(0,Math.min(100,b.soc)))}%`;
    const voltage=b.voltage===null?'':`${b.voltage.toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:2})} V`;
    set('ms8234TopSoc',soc||'Niet verbonden',!soc);
    set('ms8234House',soc||'Niet verbonden',!soc);
    set('ms8234HouseSub',voltage||'Geen meting',!voltage);
    setRing('ms8234HouseRing',b.soc??0);

    const depth=first(['ms71510Depth','ivmsDepth','liveDepth']);
    set('ms8234Depth',depth?(/m\b/i.test(depth)?depth:`${depth} m`):'Geen meting',!depth);
    const wind=first(['ms71510WindBft','ivmsWindBft','weatherWindBft','liveWindBft']);
    set('ms8234Wind',wind?(/bft\b/i.test(wind)?wind:`${wind} Bft`):'Geen meting',!wind);

    const shore=first(['liveShorePower','techShorePowerStatus','ivmsShorePower']);
    if(!shore)set('ms8234Shore','Geen data',true);

    const summary=$('ms8210Summary');
    if(summary){
      const count=clean(summary.querySelector('.count')?.textContent)||'0';
      const strong=summary.querySelector('.ms8234-attention-copy strong');
      if(strong&&Number(count)>0)strong.textContent=`${count} aandachtspunt${Number(count)===1?'':'en'}`;
    }
  }

  let applying=false;
  function queue(){
    if(applying)return;
    applying=true;
    requestAnimationFrame(()=>{try{apply()}finally{applying=false}});
  }

  function activate(){
    installCss();queue();
    const root=$('ms8210Start');
    if(root){
      const observer=new MutationObserver(queue);
      observer.observe(root,{subtree:true,childList:true,characterData:true});
    }
    ['mijnserenity-vrm-updated','mijnserenity-ruuvi-vrm-updated','mijnserenity-ha-state-updated','mijnserenity:dashboard-ready','online','offline'].forEach(name=>window.addEventListener(name,queue,{passive:true}));
    setInterval(()=>{if(!document.hidden)queue()},3000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()},{passive:true});
    console.info(`MijnSerenity ${BUILD}: dashboard hotfix actief.`);
  }

  function loadDashboard(){
    if(window.__msDashboardLoader8234){activate();return}
    const script=document.createElement('script');
    script.src=SOURCE;script.async=false;script.crossOrigin='anonymous';
    script.onload=()=>{setTimeout(activate,0)};
    script.onerror=()=>{console.error('Serenity dashboardbasis kon niet worden geladen.');syncBuild()};
    document.head.appendChild(script);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadDashboard,{once:true});
  else loadDashboard();
})();

(()=>{
  if(window.__msAttentionScrollLoader8236)return;
  window.__msAttentionScrollLoader8236=true;
  const script=document.createElement('script');
  script.src='attention-scroll-8236.js?v=824000';
  script.async=false;
  script.onerror=()=>console.warn('Aandachtspunt-navigatie kon niet worden geladen.');
  document.head.appendChild(script);
})();

(()=>{
  if(window.__msHarbourExperienceLoader8240)return;
  window.__msHarbourExperienceLoader8240=true;
  const script=document.createElement('script');
  script.src='harbor-experience-8240.js?v=824001';
  script.async=false;
  script.onerror=()=>console.warn('Haven-details en Serenity loader konden niet worden geladen.');
  document.head.appendChild(script);
})();
