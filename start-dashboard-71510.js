/* MijnSerenity 8.24.5 — dashboard polish + Serenity motorjacht loader */
(()=>{
  'use strict';
  if(window.__msDashboardHotfix8245)return;
  window.__msDashboardHotfix8245=true;

  const BUILD='8.24.5';
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
    for(const id of ids){
      const text=clean($(id)?.textContent);
      if(!invalid(text))return text;
    }
    return '';
  };
  const metric=value=>value&&typeof value==='object'&&'value' in value?value.value:value;
  const set=(id,value,missing=false)=>{
    const node=$(id);if(!node)return;
    const next=String(value);
    if(node.textContent!==next)node.textContent=next;
    node.classList.toggle('is-missing',Boolean(missing));
    node.closest('.ms8234-status')?.classList.toggle('is-missing',Boolean(missing));
  };
  const setSub=(id,value='')=>{
    const node=$(id);if(!node)return;
    const text=clean(value),hide=!text;
    if(node.textContent!==text)node.textContent=text;
    if(node.hidden!==hide)node.hidden=hide;
  };
  const setRing=(id,value)=>{const node=$(id);if(node)node.style.setProperty('--pct',String(Math.max(0,Math.min(100,value||0))))};

  const MOTOR_YACHT=`<svg viewBox="0 0 170 76" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
      <path class="ms8245-rail" d="M31 38h101M43 38V31m20 7V29m25 9V27m24 11V30m19 8v-6"/>
      <path class="ms8245-cabin" d="M48 43V27h51l23 16M58 27l9-10h22l12 10"/>
      <path class="ms8245-window" d="M55 31h15v10H55zm19 0h15v10H74zm19 0h14l10 10H93z"/>
      <path class="ms8245-mast" d="M86 17V7m0 2h9m-9 4h-7"/>
      <path class="ms8245-hull" d="M18 44h137l-12 18H39c-9 0-16-6-21-18Z"/>
      <path class="ms8245-stripe" d="M28 49h119"/>
      <path class="ms8245-wake" d="M10 66c14-5 28-5 42 0 13 5 28 5 42 0 14-5 28-5 43 0"/>
    </g>
  </svg>`;

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');if(meta)meta.content=BUILD;
    const version=$('settingsAppVersion');if(version&&version.textContent!==BUILD)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>{if(node.textContent!==BUILD)node.textContent=BUILD});
  }

  function installCss(){
    if($('ms8245DashboardPolishStyle'))return;
    const style=document.createElement('style');
    style.id='ms8245DashboardPolishStyle';
    style.textContent=`
#ms8210Start .ms8234-attention{flex:0 0 174px!important;min-width:0!important;max-width:49%!important;gap:8px!important;padding:10px 11px!important;cursor:pointer}
#ms8210Start .ms8234-attention-copy{min-width:0!important;flex:1!important}
#ms8210Start .ms8234-attention-copy strong{font-size:11.5px!important;line-height:1.05!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important}
#ms8210Start .ms8234-attention-copy small{font-size:9.5px!important}
#ms8210Start .ms8234-greeting{margin-bottom:2px!important;color:#f4f9fc!important;font-weight:800!important}
#ms8210Start .ms8245-date{display:block;margin-top:2px;color:#91a9b9;font-size:10px;line-height:1.25;font-weight:550;text-transform:none}
#ms8210Start .ms8234-status{min-height:72px!important;align-items:center!important}
#ms8210Start .ms8234-status-copy{gap:2px!important}
#ms8210Start .ms8234-status-copy strong{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;line-height:1.08!important}
#ms8210Start .ms8245-status-sub{display:block;max-width:100%;color:#7f9cad;font-size:8.5px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:none!important;letter-spacing:0!important}
#ms8210Start .ms8234-status.is-missing strong,#ms8210Start .is-missing{color:#8fa6b6!important}
#ms8210Start .ms8234-hero{padding-bottom:22px!important}
#ms8210Start .ms8245-hero-sub{max-width:390px;margin:8px 0 0;color:#c1d2dc;font-size:12px;line-height:1.3;font-weight:520}
#ms8210Start .ms8234-live-metrics{position:relative;margin:20px 0 17px!important;padding:12px 10px!important;border:1px solid rgba(113,211,244,.12);border-radius:15px;background:linear-gradient(90deg,rgba(1,14,24,.78),rgba(3,23,36,.72),rgba(1,14,24,.82));box-shadow:inset 0 1px 0 rgba(255,255,255,.025);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
#ms8210Start .ms8234-live-metric:first-child{padding-left:5px!important}
#ms8210Start .ms8234-live-copy strong.is-missing{font-size:11px!important;color:#9bb1c0!important}
#ms8210Start .ms8234-start{width:min(100%,470px)!important;min-height:58px!important;padding:0 22px!important;border-radius:17px!important;font-size:17px!important;box-shadow:0 14px 34px rgba(20,183,223,.31)!important}
#ms8210Start .ms8234-feature{padding-right:38px!important}
#ms8210Start .ms8234-feature::before{content:'›';position:absolute;right:14px;top:50%;z-index:2;transform:translateY(-50%);color:#d7f5ff;font-size:29px;line-height:1;font-weight:300;opacity:.9}
#ms8210Start .ms8234-feature>.ms8234-icon{filter:drop-shadow(0 5px 13px rgba(0,0,0,.18))}
#ms8210Start .ms8234-bottom{border-color:rgba(105,214,249,.3)!important;background:rgba(4,28,43,.97)!important;box-shadow:0 16px 45px rgba(0,0,0,.5)!important}
#ms8210Start .ms8234-gauge-copy strong.is-missing{font-size:11px!important;color:#8fa6b6!important}

/* Serenity laadanimatie: echt motorjacht, geen zeilen */
#ms824load .ms824sea{height:76px!important}
#ms824load .ms824boat{top:2px!important;width:108px!important;height:54px!important;font-size:0!important;color:#edfaff!important;filter:drop-shadow(0 6px 9px rgba(0,0,0,.42));transform-origin:50% 75%!important}
#ms824load .ms824boat svg{display:block;width:100%;height:100%;overflow:visible}
#ms824load .ms824boat .ms8245-hull{fill:#153f59;stroke:#d8f5ff;stroke-width:2.8}
#ms824load .ms824boat .ms8245-cabin{fill:#e6f5f9;stroke:#d8f5ff;stroke-width:2.3}
#ms824load .ms824boat .ms8245-window{fill:#15364b;stroke:#87dff4;stroke-width:1.5}
#ms824load .ms824boat .ms8245-rail,#ms824load .ms824boat .ms8245-mast{stroke:#d8f5ff;stroke-width:1.6}
#ms824load .ms824boat .ms8245-stripe{stroke:#52d8f3;stroke-width:2}
#ms824load .ms824boat .ms8245-wake{stroke:#61def7;stroke-width:2;opacity:.7}
#ms824load .ms824wave{border-top-width:2px!important}

@media(max-width:620px){
  #ms8210Start .ms8234-attention{flex-basis:162px!important}
  #ms8210Start .ms8234-status{min-height:69px!important}
  #ms8210Start .ms8234-live-metrics{margin-top:17px!important;padding:11px 7px!important}
  #ms8210Start .ms8234-start{width:100%!important}
}
@media(max-width:390px){
  #ms8210Start .ms8234-brand h1{font-size:38px!important}
  #ms8210Start .ms8234-attention{flex-basis:148px!important;gap:7px!important}
  #ms8210Start .ms8234-attention-copy small{display:block!important}
  #ms8210Start .ms8234-attention-copy strong{font-size:10.5px!important}
  #ms8210Start .ms8234-live-copy strong.is-missing{font-size:9.5px!important}
  #ms8210Start .ms8245-date{font-size:9px}
}
@media(prefers-reduced-motion:reduce){#ms824load .ms824boat,#ms824load .ms824wave{animation:none!important}}
`;
    document.head.appendChild(style);
  }

  function firstName(){
    const raw=[
      window.currentProfile?.first_name,
      window.currentProfile?.display_name,
      window.currentProfile?.full_name,
      window.currentProfile?.name,
      window.currentUser?.user_metadata?.first_name,
      window.currentUser?.user_metadata?.display_name,
      window.currentUser?.user_metadata?.full_name,
      window.currentUser?.user_metadata?.name
    ].map(clean).find(Boolean)||'';
    if(raw)return raw.split(/\s+/)[0];
    const email=clean(window.currentUser?.email);
    if(email){
      const local=email.split('@')[0].replace(/[._-]+/g,' ').trim().split(/\s+/)[0];
      if(local&&/^[a-zà-ÿ]{2,20}$/i.test(local))return local.charAt(0).toUpperCase()+local.slice(1).toLowerCase();
    }
    return '';
  }

  function greeting(){
    const hour=new Date().getHours();
    const word=hour<12?'Goedemorgen':hour<18?'Goedemiddag':'Goedenavond';
    const name=firstName();
    return `${word}${name?` ${name}`:''} 👋`;
  }

  function dateText(){
    const text=new Intl.DateTimeFormat('nl-NL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
    return text.charAt(0).toUpperCase()+text.slice(1);
  }

  function ensureSub(strongId,subId){
    const strong=$(strongId);if(!strong)return null;
    let sub=$(subId);
    if(!sub){
      sub=document.createElement('small');
      sub.id=subId;
      sub.className='ms8245-status-sub';
      strong.insertAdjacentElement('afterend',sub);
    }
    return sub;
  }

  function polishDom(){
    const root=$('ms8210Start');if(!root)return;
    const greet=$('ms8234Greeting');
    if(greet){
      const greetingText=greeting();
      if(greet.textContent!==greetingText)greet.textContent=greetingText;
      let date=$('ms8245Date');
      if(!date){date=document.createElement('small');date.id='ms8245Date';date.className='ms8245-date';greet.insertAdjacentElement('afterend',date)}
      const today=dateText();if(date.textContent!==today)date.textContent=today;
    }
    const hero=root.querySelector('.ms8234-hero');
    const heading=hero?.querySelector('h2');
    if(heading&&!hero.querySelector('.ms8245-hero-sub')){
      const p=document.createElement('p');p.className='ms8245-hero-sub';p.textContent='Ontdek, vaar en geniet…';heading.insertAdjacentElement('afterend',p);
    }
    ensureSub('ms8234Location','ms8245LocationSub');
    ensureSub('ms8234Outside','ms8245OutsideSub');
    ensureSub('ms8234TopSoc','ms8245BatterySub');
  }

  function battery(){
    const live=window.MIJSERENITY_VRM_LIVE_ENERGY||{};
    const diag=window.MIJSERENITY_VRM_DIAGNOSTICS||{};
    const soc=numberFrom(live.battery?.soc)??numberFrom(metric(diag.battery?.soc))??numberFrom(first(['msCerboSoc','ms71510HouseSoc','ivmsBatterySoc','ivmsBatteryRing','techHouseSoc','liveHouseSoc']));
    const voltage=numberFrom(live.battery?.voltage)??numberFrom(metric(diag.battery?.voltage))??numberFrom(first(['msCerboVoltage','ms71510HouseVoltage','ivmsBatteryVoltage','techHouseVoltage','liveHouseVoltage']));
    const current=numberFrom(live.battery?.current)??numberFrom(metric(diag.battery?.current))??numberFrom(first(['msCerboCurrent','ms71510HouseCurrent','ivmsBatteryCurrent','techHouseCurrent','liveHouseCurrent']));
    return {soc,voltage,current};
  }

  function location(){
    const state=window.liveNavState||{};
    const lat=numberFrom(state.currentLat??state.lat),lon=numberFrom(state.currentLon??state.lon??state.lng);
    const coords=lat!==null&&lon!==null?`${lat.toFixed(4)} N · ${lon.toFixed(4)} E`:'';
    const label=first(['liveLocationName','gpsLocationName','currentLocationName','routeCurrentLocation']);
    if(label)return {text:label,sub:coords,missing:false};
    return coords?{text:'GPS actief',sub:coords,missing:false}:{text:'GPS zoeken…',sub:'Positie wordt bepaald',missing:true};
  }

  function weather(){
    const temp=first(['ivmsOutsideTemp','weatherCurrentTemp','currentWeatherTemp','ms709WeatherTemp']);
    const desc=first(['weatherCurrentDescription','currentWeatherDescription','ms709WeatherCondition','weatherCondition']);
    return {temp,desc};
  }

  function batterySub(b){
    if(b.voltage===null)return '';
    const voltage=`${b.voltage.toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:2})} V`;
    if(b.current===null)return voltage;
    const state=b.current>.4?'Laden':b.current<-.4?'Verbruik':'Rust';
    return `${voltage} · ${state}`;
  }

  function upgradeMotorboat(){
    const boat=document.querySelector('#ms824load .ms824boat');
    if(!boat||boat.dataset.motorYacht==='1')return;
    boat.dataset.motorYacht='1';
    boat.setAttribute('aria-label','Serenity motorboot vaart over de golven');
    boat.innerHTML=MOTOR_YACHT;
  }

  function apply(){
    const root=$('ms8210Start');if(!root)return;
    syncBuild();installCss();polishDom();upgradeMotorboat();

    const loc=location();
    set('ms8234Location',loc.text,loc.missing);
    setSub('ms8245LocationSub',loc.sub);

    const w=weather();
    set('ms8234Outside',w.temp||'Geen data',!w.temp);
    setSub('ms8245OutsideSub',w.desc);

    const b=battery();
    const soc=b.soc===null?'':`${Math.round(Math.max(0,Math.min(100,b.soc)))}%`;
    const voltage=b.voltage===null?'':`${b.voltage.toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:2})} V`;
    set('ms8234TopSoc',soc||'Niet verbonden',!soc);
    setSub('ms8245BatterySub',batterySub(b));
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
      const small=summary.querySelector('.ms8234-attention-copy small');
      const strongText=Number(count)>0?`${count} aandachtspunt${Number(count)===1?'':'en'}`:'Aandacht';
      const smallText=Number(count)>0?'Tik om te bekijken':'Alles in orde';
      if(strong&&strong.textContent!==strongText)strong.textContent=strongText;
      if(small&&small.textContent!==smallText)small.textContent=smallText;
      summary.setAttribute('aria-label',Number(count)>0?`${count} aandachtspunten bekijken`:'Geen aandachtspunten');
    }
  }

  let applying=false;
  function queue(){
    if(applying)return;
    applying=true;
    requestAnimationFrame(()=>{try{apply()}finally{applying=false}});
  }

  function watchMotorboat(){
    upgradeMotorboat();
    if(window.__ms8245BoatObserver)return;
    window.__ms8245BoatObserver=true;
    const start=()=>{
      if(!document.body)return;
      const observer=new MutationObserver(upgradeMotorboat);
      observer.observe(document.body,{subtree:true,childList:true});
    };
    if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
  }

  function activate(){
    installCss();watchMotorboat();queue();
    const root=$('ms8210Start');
    if(root){
      const observer=new MutationObserver(queue);
      observer.observe(root,{subtree:true,childList:true,characterData:true});
    }
    ['mijnserenity-vrm-updated','mijnserenity-ruuvi-vrm-updated','mijnserenity-ha-state-updated','mijnserenity:dashboard-ready','online','offline'].forEach(name=>window.addEventListener(name,queue,{passive:true}));
    setInterval(()=>{if(!document.hidden)queue()},3000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()},{passive:true});
    console.info(`MijnSerenity ${BUILD}: dashboard polish actief.`);
  }

  function loadDashboard(){
    if(window.__msDashboardLoader8234){activate();return}
    const script=document.createElement('script');
    script.src=SOURCE;script.async=false;script.crossOrigin='anonymous';
    script.onload=()=>setTimeout(activate,0);
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
  script.src='attention-scroll-8236.js?v=824500';
  script.async=false;
  script.onerror=()=>console.warn('Aandachtspunt-navigatie kon niet worden geladen.');
  document.head.appendChild(script);
})();

(()=>{
  if(window.__msHarbourExperienceLoader8240)return;
  window.__msHarbourExperienceLoader8240=true;
  const script=document.createElement('script');
  script.src='harbor-experience-8240.js?v=824500';
  script.async=false;
  script.onerror=()=>console.warn('Haven-details en Serenity loader konden niet worden geladen.');
  document.head.appendChild(script);
})();
