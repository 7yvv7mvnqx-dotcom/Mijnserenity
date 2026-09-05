/* MijnSerenity 8.25.0 — echte Dag/Nacht-beleving zoals een navigatie-app */
(()=>{
  'use strict';
  if(window.__msDayNight8250)return;
  window.__msDayNight8250=true;

  const BUILD='8.25.0';
  const PREVIOUS='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@4b2efd9f59a8bfea38744c2021457df9963006ec/start-dashboard-71510.js';
  const STYLE_ID='ms8250DayNightStyle';
  const STORAGE_KEY='mijnserenity-daynight-v1';
  let timer=0;

  function readMode(){
    try{
      const saved=localStorage.getItem(STORAGE_KEY);
      return saved==='day'||saved==='night'||saved==='auto'?saved:'auto';
    }catch(_){return 'auto'}
  }

  function saveMode(mode){
    try{localStorage.setItem(STORAGE_KEY,mode)}catch(_){}
  }

  function automaticTheme(date=new Date()){
    const hour=date.getHours()+date.getMinutes()/60;
    return hour>=7&&hour<20?'day':'night';
  }

  function resolvedTheme(){
    const mode=readMode();
    return mode==='auto'?automaticTheme():mode;
  }

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const settings=document.getElementById('settingsAppVersion');
    if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
  }

  function setThemeColor(theme){
    let meta=document.querySelector('meta[name="theme-color"]');
    if(!meta){
      meta=document.createElement('meta');
      meta.name='theme-color';
      document.head.appendChild(meta);
    }
    meta.content=theme==='day'?'#eef7fb':'#061827';
  }

  function applyTheme(theme,{notify=true}={}){
    const next=theme==='night'?'night':'day';
    const html=document.documentElement;
    html.dataset.msTheme=next==='day'?'light':'dark';
    html.dataset.msDaynight=next;
    html.style.colorScheme=next==='day'?'light':'dark';
    if(document.body){
      document.body.classList.toggle('ms8250-day',next==='day');
      document.body.classList.toggle('ms8250-night',next==='night');
      document.body.classList.remove('ms8246-light-theme','ms8246-dark-theme');
    }
    setThemeColor(next);
    if(notify){
      try{window.dispatchEvent(new CustomEvent('mijnserenity:theme-changed',{detail:{theme:next,mode:readMode()}}))}catch(_){}
    }
    return next;
  }

  function setMode(mode){
    const next=mode==='day'||mode==='night'?mode:'auto';
    saveMode(next);
    return applyTheme(next==='auto'?automaticTheme():next);
  }

  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    document.getElementById('ms8246ThemeChoiceStyle')?.remove();
    document.getElementById('ms8246ThemeRow')?.remove();

    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
/* MijnSerenity Dag/Nacht 8.25.0 — geen losse licht/donker-pil; de hele ervaring verandert. */
html[data-ms-daynight="day"],html[data-ms-daynight="day"] body{background:#eef7fb!important;color:#0a2436!important}
html[data-ms-daynight="night"],html[data-ms-daynight="night"] body{background:#04121f!important;color:#f7fbff!important}
html[data-ms-daynight="day"] body,html[data-ms-daynight="day"] #appView,html[data-ms-daynight="day"] #dashboard{background:linear-gradient(180deg,#f7fbfd 0%,#eef7fa 48%,#e8f3f7 100%)!important;color:#0a2436!important}
html[data-ms-daynight="night"] body,html[data-ms-daynight="night"] #appView,html[data-ms-daynight="night"] #dashboard{background:radial-gradient(circle at 84% 2%,rgba(31,110,160,.15),transparent 28%),linear-gradient(180deg,#071c2d 0%,#04131f 54%,#020b13 100%)!important;color:#f7fbff!important}
#ms8246ThemeRow{display:none!important}

/* START — DAG */
html[data-ms-daynight="day"] #ms8210Start{--ink:#0a2638!important;--muted:#607887!important;--line:rgba(48,120,151,.18)!important;color:#0a2638!important;background:radial-gradient(circle at 84% 3%,rgba(54,177,218,.14),transparent 29%),radial-gradient(circle at 5% 44%,rgba(113,188,219,.12),transparent 34%),linear-gradient(180deg,#fafdff 0%,#eef7fa 100%)!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-brand h1,
html[data-ms-daynight="day"] #ms8210Start .ms8234-sail,
html[data-ms-daynight="day"] #ms8210Start .ms8218-serenity-brand,
html[data-ms-daynight="day"] #ms8210Start .ms8218-brand-lockup,
html[data-ms-daynight="day"] #ms8210Start .ms8218-brand-sail{color:#0a3550!important;text-shadow:none!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-greeting{color:#234d63!important}
html[data-ms-daynight="day"] #ms8210Start .ms8245-date{color:#68808f!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-attention{border-color:rgba(48,118,150,.18)!important;background:rgba(255,255,255,.92)!important;color:#0b2a3d!important;box-shadow:0 10px 28px rgba(37,83,103,.10),inset 0 1px 0 rgba(255,255,255,.9)!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-attention-copy small{color:#607b8b!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-attention .ms8234-icon{color:#698a9b!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-status{border-color:rgba(51,122,154,.16)!important;background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(247,252,254,.92))!important;color:#183b4d!important;box-shadow:0 8px 22px rgba(34,78,98,.07)!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-status>.ms8234-icon{color:#2d83a7!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-status-copy small{color:#668090!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-status-copy strong{color:#0b2b3d!important}
html[data-ms-daynight="day"] #ms8210Start .ms8245-status-sub{color:#6b8492!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-status.is-missing strong,
html[data-ms-daynight="day"] #ms8210Start .is-missing{color:#78909c!important}

/* Hero krijgt overdag echt daglicht; dezelfde Serenity-foto blijft herkenbaar. */
html[data-ms-daynight="day"] #ms8210Start .ms8234-hero{border-color:rgba(62,158,199,.28)!important;background-color:#ccecf8!important;background-blend-mode:screen!important;box-shadow:0 18px 42px rgba(41,87,106,.17)!important;color:#081f32!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-hero::before{background:linear-gradient(90deg,rgba(238,249,253,.98) 0%,rgba(238,249,253,.86) 40%,rgba(238,249,253,.36) 68%,rgba(238,249,253,.06) 100%),linear-gradient(0deg,rgba(217,241,250,.30),transparent 48%)!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-kicker{color:#069dcb!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-hero h2{color:#071f32!important;text-shadow:0 1px 0 rgba(255,255,255,.55)!important}
html[data-ms-daynight="day"] #ms8210Start .ms8245-hero-sub{color:#385b6d!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-live-metrics{border-color:rgba(42,111,143,.15)!important;background:linear-gradient(90deg,rgba(255,255,255,.82),rgba(246,252,254,.76),rgba(255,255,255,.86))!important;box-shadow:0 5px 18px rgba(35,79,97,.08),inset 0 1px 0 rgba(255,255,255,.92)!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-live-metric{border-right-color:rgba(31,85,111,.13)!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-live-metric .ms8234-icon{color:#355f72!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-live-copy strong{color:#0a2638!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-live-copy small{color:#657f8d!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-start{border-color:rgba(0,153,218,.34)!important;background:linear-gradient(135deg,#159fda,#20c4e6)!important;color:#fff!important;box-shadow:0 14px 30px rgba(21,164,210,.25)!important}

/* Apple-Maps-achtige zachte dagtegels */
html[data-ms-daynight="day"] #ms8210Start .ms8234-feature{--accent:#0f668d!important;--glow:rgba(68,190,226,.20)!important;border-color:rgba(69,151,184,.16)!important;background:linear-gradient(145deg,#edfaff,#dff3fa)!important;color:#0b2a3d!important;box-shadow:0 11px 27px rgba(35,80,99,.09)!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-feature[data-tone="purple"]{--accent:#5c4b92!important;--glow:rgba(133,112,202,.18)!important;border-color:rgba(115,91,169,.14)!important;background:linear-gradient(145deg,#f7f3ff,#ece6fa)!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-feature[data-tone="green"]{--accent:#1e705e!important;--glow:rgba(67,176,145,.18)!important;border-color:rgba(59,144,120,.14)!important;background:linear-gradient(145deg,#effbf7,#e0f5ed)!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-feature[data-tone="gold"]{--accent:#80651f!important;--glow:rgba(228,185,83,.20)!important;border-color:rgba(173,137,51,.15)!important;background:linear-gradient(145deg,#fffaf0,#f8efd4)!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-feature-copy strong{color:#102d40!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-feature-copy small{color:#5d7584!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-feature::before{color:#447082!important}

html[data-ms-daynight="day"] #ms8210Start .ms8234-boatstatus{border-color:rgba(51,123,154,.15)!important;background:rgba(255,255,255,.76)!important;box-shadow:0 14px 32px rgba(37,80,98,.08)!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-sectionhead strong{color:#178ab3!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-sectionhead small{color:#748a97!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-gauge{color:#15384a!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-ring::before{background:#f7fcfe!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-gauge-copy small{color:#667f8e!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-gauge-copy em{color:#8196a1!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-mini{border-color:rgba(58,131,161,.14)!important;background:linear-gradient(180deg,rgba(255,255,255,.91),rgba(244,250,252,.92))!important;color:#17394b!important;box-shadow:0 8px 22px rgba(37,80,98,.07)!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-mini>.ms8234-icon{color:#238db3!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-mini-copy small{color:#708794!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-mini>.ms8234-icon-chevron{color:#73909e!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-bottom{border-color:rgba(57,128,158,.17)!important;background:rgba(249,253,255,.91)!important;box-shadow:0 16px 38px rgba(32,74,92,.15)!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-navbtn{color:#64818f!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-navbtn.active{background:linear-gradient(180deg,rgba(28,158,204,.15),rgba(28,124,167,.10))!important;color:#078ebd!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-navbtn.live{border-color:rgba(24,131,174,.18)!important;background:linear-gradient(180deg,#e9f8fc,#d9eef5)!important;color:#176786!important;box-shadow:0 12px 24px rgba(39,89,109,.16)!important}

/* START — NACHT */
html[data-ms-daynight="night"] #ms8210Start{--ink:#f7fbff!important;--muted:#9db5c6!important;--line:rgba(94,193,229,.20)!important;color:#f7fbff!important;background:radial-gradient(circle at 86% 2%,rgba(33,135,183,.17),transparent 29%),radial-gradient(circle at 8% 48%,rgba(31,77,132,.12),transparent 31%),linear-gradient(180deg,#071c2d 0%,#04131f 100%)!important}
html[data-ms-daynight="night"] #ms8210Start .ms8234-brand h1,
html[data-ms-daynight="night"] #ms8210Start .ms8234-sail,
html[data-ms-daynight="night"] #ms8210Start .ms8218-serenity-brand,
html[data-ms-daynight="night"] #ms8210Start .ms8218-brand-lockup,
html[data-ms-daynight="night"] #ms8210Start .ms8218-brand-sail{color:#42cfff!important;text-shadow:0 0 24px rgba(55,199,247,.11)!important}
html[data-ms-daynight="night"] #ms8210Start .ms8234-greeting{color:#d6e8f2!important}
html[data-ms-daynight="night"] #ms8210Start .ms8245-date{color:#8da6b7!important}
html[data-ms-daynight="night"] #ms8210Start .ms8234-attention{border-color:rgba(93,198,235,.22)!important;background:linear-gradient(180deg,rgba(12,43,62,.92),rgba(7,28,43,.94))!important;color:#f7fbff!important;box-shadow:0 13px 34px rgba(0,0,0,.24)!important}
html[data-ms-daynight="night"] #ms8210Start .ms8234-status{border-color:rgba(92,192,228,.16)!important;background:linear-gradient(180deg,rgba(10,40,59,.90),rgba(6,26,41,.92))!important;color:#e7f4fa!important;box-shadow:0 8px 24px rgba(0,0,0,.14)!important}
html[data-ms-daynight="night"] #ms8210Start .ms8234-hero{border-color:rgba(52,192,238,.36)!important;background-color:#03111e!important;background-blend-mode:multiply!important;box-shadow:0 21px 56px rgba(0,0,0,.38),0 0 0 1px rgba(47,190,237,.03)!important}
html[data-ms-daynight="night"] #ms8210Start .ms8234-hero::before{background:linear-gradient(90deg,rgba(2,17,29,.98) 0%,rgba(2,20,34,.90) 43%,rgba(2,21,36,.46) 73%,rgba(2,13,24,.24)),linear-gradient(0deg,rgba(2,13,25,.67),transparent 48%)!important}
html[data-ms-daynight="night"] #ms8210Start .ms8234-kicker{color:#34d7ff!important;text-shadow:0 0 18px rgba(52,215,255,.20)!important}
html[data-ms-daynight="night"] #ms8210Start .ms8234-live-metrics{border-color:rgba(101,209,244,.14)!important;background:linear-gradient(90deg,rgba(1,13,24,.84),rgba(3,25,39,.80),rgba(1,13,24,.88))!important}
html[data-ms-daynight="night"] #ms8210Start .ms8234-start{background:linear-gradient(135deg,#13abd8,#20c8e9)!important;box-shadow:0 14px 35px rgba(20,183,223,.31),0 0 25px rgba(36,198,237,.08)!important}
html[data-ms-daynight="night"] #ms8210Start .ms8234-feature{box-shadow:0 13px 31px rgba(0,0,0,.23)!important}
html[data-ms-daynight="night"] #ms8210Start .ms8234-boatstatus{background:linear-gradient(180deg,rgba(8,35,52,.91),rgba(4,23,37,.92))!important;box-shadow:0 18px 42px rgba(0,0,0,.22)!important}
html[data-ms-daynight="night"] #ms8210Start .ms8234-bottom{border-color:rgba(90,195,231,.22)!important;background:rgba(3,20,33,.96)!important;box-shadow:0 18px 50px rgba(0,0,0,.50)!important}

/* Pagina-kop en vaste terug-navigatie volgen Dag/Nacht mee. */
html[data-ms-daynight="day"] .ms8219-page-title{background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(238,247,250,.97))!important;border-bottom-color:rgba(47,125,159,.17)!important;color:#0b283a!important;box-shadow:0 8px 22px rgba(35,80,99,.08)!important}
html[data-ms-daynight="day"] .ms8219-page-title h1{color:#0b283a!important}
html[data-ms-daynight="day"] .ms8219-page-title small{color:#1687ad!important}
html[data-ms-daynight="night"] .ms8219-page-title{background:linear-gradient(180deg,rgba(7,31,48,.98),rgba(3,18,29,.96))!important;border-bottom-color:rgba(99,217,249,.18)!important;color:#f7fbff!important}
html[data-ms-daynight="night"] .ms8219-page-title h1{color:#f8fbff!important}
html[data-ms-daynight="night"] .ms8219-page-title small{color:#7fdcff!important}
html[data-ms-daynight="day"] body.ms8219-sub-page .bottom-nav.ms8214-nav,
html[data-ms-daynight="day"] body.ms8219-sub-page .bottom-nav{background:rgba(248,253,255,.97)!important;border-top-color:rgba(55,130,160,.16)!important;box-shadow:0 -9px 26px rgba(40,82,99,.11)!important}
html[data-ms-daynight="day"] body.ms8219-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"]{background:linear-gradient(90deg,#eef9fc,#e2f3f8,#eef9fc)!important;color:#113449!important}
html[data-ms-daynight="day"] body.ms8219-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"] .ms8219-home-copy strong{color:#113449!important}
html[data-ms-daynight="day"] body.ms8219-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"] .ms8219-home-copy small{color:#2385a9!important}
html[data-ms-daynight="day"] body.ms8219-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"] .ms8219-home-chevron{color:#2586aa!important}

/* Kaarttegels krijgen 's nachts een rustige navigatie-dimming zonder markers te raken. */
html[data-ms-daynight="night"] .leaflet-tile-pane{filter:brightness(.72) saturate(.72) contrast(1.08)!important;transition:filter .25s ease}
html[data-ms-daynight="day"] .leaflet-tile-pane{filter:none!important;transition:filter .25s ease}

@media(max-width:620px){
  html[data-ms-daynight="day"] #ms8210Start,html[data-ms-daynight="night"] #ms8210Start{transition:background .28s ease,color .22s ease}
}
@media(prefers-reduced-motion:reduce){
  html[data-ms-daynight="day"] #ms8210Start,html[data-ms-daynight="night"] #ms8210Start,.leaflet-tile-pane{transition:none!important}
}
`;
    document.head.appendChild(style);
  }

  function refreshTheme(){
    if(readMode()==='auto')applyTheme(automaticTheme(),{notify:false});
  }

  function startTheme(){
    syncBuild();
    installStyle();
    applyTheme(resolvedTheme(),{notify:false});
    clearInterval(timer);
    timer=window.setInterval(refreshTheme,60000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshTheme()},{passive:true});
  }

  function loadPreviousDashboard(){
    if(window.__msDashboardHotfix8245){startTheme();return}
    const script=document.createElement('script');
    script.src=PREVIOUS;
    script.async=false;
    script.crossOrigin='anonymous';
    script.onload=()=>{startTheme();setTimeout(refreshTheme,300)};
    script.onerror=()=>{console.error('Vorige Serenity-dashboardversie kon niet worden geladen.');startTheme()};
    document.head.appendChild(script);
  }

  window.serenityDayNight={
    set:setMode,
    auto:()=>setMode('auto'),
    day:()=>setMode('day'),
    night:()=>setMode('night'),
    mode:readMode,
    theme:resolvedTheme
  };

  try{localStorage.removeItem('mijnserenity-theme-v1')}catch(_){}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadPreviousDashboard,{once:true});
  else loadPreviousDashboard();
})();
