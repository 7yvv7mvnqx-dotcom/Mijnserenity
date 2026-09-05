/* MijnSerenity — donkere/licht achtergrondkeuze bovenop dashboard 8.24.5 */
(()=>{
  'use strict';
  if(window.__msThemeChoice8246)return;
  window.__msThemeChoice8246=true;

  const PREVIOUS='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@4b2efd9f59a8bfea38744c2021457df9963006ec/start-dashboard-71510.js';
  const STORAGE_KEY='mijnserenity-theme-v1';
  const STYLE_ID='ms8246ThemeChoiceStyle';
  const ROW_ID='ms8246ThemeRow';

  function readTheme(){
    try{
      const saved=localStorage.getItem(STORAGE_KEY);
      return saved==='light'?'light':'dark';
    }catch(_){return 'dark'}
  }

  function saveTheme(theme){
    try{localStorage.setItem(STORAGE_KEY,theme)}catch(_){}
  }

  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
#${ROW_ID}{display:flex;justify-content:flex-end;align-items:center;margin:-7px 2px 12px;position:relative;z-index:8}
#${ROW_ID} .ms8246-theme-toggle{display:grid;grid-template-columns:1fr 1fr;width:min(100%,246px);padding:3px;border:1px solid rgba(113,205,239,.28);border-radius:999px;background:rgba(3,22,35,.78);box-shadow:0 8px 22px rgba(0,0,0,.14),inset 0 1px 0 rgba(255,255,255,.035);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
#${ROW_ID} .ms8246-theme-button{display:flex;align-items:center;justify-content:center;gap:7px;min-height:37px;padding:7px 13px;border:0;border-radius:999px;background:transparent;color:#9db6c7;font:inherit;font-size:12px;font-weight:780;line-height:1;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background .18s ease,color .18s ease,box-shadow .18s ease,transform .12s ease}
#${ROW_ID} .ms8246-theme-button:active{transform:scale(.98)}
#${ROW_ID} .ms8246-theme-button:focus-visible{outline:2px solid #4ed8ff;outline-offset:2px}
#${ROW_ID} .ms8246-theme-button[aria-pressed="true"]{color:#f8fcff;background:linear-gradient(180deg,rgba(13,74,106,.98),rgba(7,48,73,.98));box-shadow:inset 0 0 0 1px rgba(67,207,255,.68),0 5px 16px rgba(5,32,49,.22)}
#${ROW_ID} .ms8246-theme-icon{display:grid;place-items:center;width:17px;height:17px;flex:0 0 17px;font-size:17px;line-height:1}

/* Lichte achtergrond: rustige dagmodus, nautische kaarten/hero blijven herkenbaar */
html[data-ms-theme="light"] body,
html[data-ms-theme="light"] #appView,
html[data-ms-theme="light"] #dashboard{background:#edf5f8!important;color:#0b2536!important}
html[data-ms-theme="light"] #ms8210Start{--ink:#0a2638!important;--muted:#607887!important;--line:rgba(42,111,143,.20)!important;color:#0a2638!important;background:radial-gradient(circle at 86% 4%,rgba(46,179,218,.14),transparent 29%),radial-gradient(circle at 8% 46%,rgba(75,128,185,.10),transparent 31%),linear-gradient(180deg,#f8fcfd 0%,#eaf4f7 100%)!important}
html[data-ms-theme="light"] #ms8210Start .ms8234-brand h1,
html[data-ms-theme="light"] #ms8210Start .ms8234-sail,
html[data-ms-theme="light"] #ms8210Start .ms8218-serenity-brand,
html[data-ms-theme="light"] #ms8210Start .ms8218-brand-lockup,
html[data-ms-theme="light"] #ms8210Start .ms8218-brand-sail{color:#09283a!important}
html[data-ms-theme="light"] #ms8210Start .ms8234-greeting{color:#24485d!important}
html[data-ms-theme="light"] #ms8210Start .ms8245-date{color:#627b89!important}
html[data-ms-theme="light"] #ms8210Start .ms8234-attention{border-color:rgba(50,124,157,.22)!important;background:rgba(255,255,255,.91)!important;color:#0b2a3d!important;box-shadow:0 10px 28px rgba(24,72,94,.10)!important}
html[data-ms-theme="light"] #ms8210Start .ms8234-attention-copy small{color:#607b8b!important}
html[data-ms-theme="light"] #ms8210Start .ms8234-status{border-color:rgba(52,124,155,.18)!important;background:rgba(255,255,255,.82)!important;box-shadow:0 8px 24px rgba(29,74,94,.07)!important}
html[data-ms-theme="light"] #ms8210Start .ms8234-status-copy strong{color:#0b2b3d!important}
html[data-ms-theme="light"] #ms8210Start .ms8234-status-copy small,
html[data-ms-theme="light"] #ms8210Start .ms8245-status-sub{color:#607d8d!important}
html[data-ms-theme="light"] #ms8210Start .ms8234-status>.ms8234-icon{color:#3f7188!important}
html[data-ms-theme="light"] #ms8210Start .ms8234-hero{box-shadow:0 18px 42px rgba(14,56,76,.18)!important}
html[data-ms-theme="light"] #ms8210Start .ms8234-feature{box-shadow:0 12px 28px rgba(24,68,88,.12)!important}
html[data-ms-theme="light"] .ms8219-page-title{background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(238,247,250,.97))!important;border-bottom-color:rgba(47,125,159,.18)!important;color:#0b283a!important;box-shadow:0 8px 22px rgba(35,80,99,.09)!important}
html[data-ms-theme="light"] .ms8219-page-title h1{color:#0b283a!important}
html[data-ms-theme="light"] .ms8219-page-title small{color:#1687ad!important}
html[data-ms-theme="light"] #${ROW_ID} .ms8246-theme-toggle{border-color:rgba(45,119,151,.22);background:rgba(255,255,255,.76);box-shadow:0 8px 24px rgba(25,70,91,.08),inset 0 1px 0 rgba(255,255,255,.8)}
html[data-ms-theme="light"] #${ROW_ID} .ms8246-theme-button{color:#5d7888}
html[data-ms-theme="light"] #${ROW_ID} .ms8246-theme-button[aria-pressed="true"]{color:#09283a;background:#fff;box-shadow:inset 0 0 0 1px rgba(48,151,190,.34),0 5px 15px rgba(26,82,105,.11)}

@media(max-width:620px){
  #${ROW_ID}{margin-top:-5px;margin-bottom:11px}
  #${ROW_ID} .ms8246-theme-toggle{width:min(100%,220px)}
  #${ROW_ID} .ms8246-theme-button{min-height:35px;padding:6px 10px;font-size:11.5px}
}
@media(prefers-reduced-motion:reduce){#${ROW_ID} .ms8246-theme-button{transition:none}}
`;
    document.head.appendChild(style);
  }

  function syncButtons(theme){
    document.querySelectorAll('.ms8246-theme-button').forEach(button=>{
      const active=button.dataset.theme===theme;
      button.setAttribute('aria-pressed',String(active));
      button.classList.toggle('is-active',active);
    });
  }

  function applyTheme(theme,{persist=true}={}){
    const next=theme==='light'?'light':'dark';
    document.documentElement.dataset.msTheme=next;
    document.documentElement.style.colorScheme=next;
    if(document.body){
      document.body.classList.toggle('ms8246-light-theme',next==='light');
      document.body.classList.toggle('ms8246-dark-theme',next==='dark');
    }
    syncButtons(next);
    if(persist)saveTheme(next);
    try{window.dispatchEvent(new CustomEvent('mijnserenity:theme-changed',{detail:{theme:next}}))}catch(_){}
  }

  function ensureToggle(){
    const root=document.getElementById('ms8210Start');
    const header=root?.querySelector('.ms8234-header');
    if(!root||!header)return false;
    let row=document.getElementById(ROW_ID);
    if(!row){
      row=document.createElement('div');
      row.id=ROW_ID;
      row.setAttribute('aria-label','Achtergrond kiezen');
      row.innerHTML=`<div class="ms8246-theme-toggle" role="group" aria-label="Achtergrond"><button type="button" class="ms8246-theme-button" data-theme="dark" aria-pressed="false" title="Donkere achtergrond"><span class="ms8246-theme-icon" aria-hidden="true">☾</span><span>Donker</span></button><button type="button" class="ms8246-theme-button" data-theme="light" aria-pressed="false" title="Lichte achtergrond"><span class="ms8246-theme-icon" aria-hidden="true">☀</span><span>Licht</span></button></div>`;
      row.addEventListener('click',event=>{
        const button=event.target.closest('.ms8246-theme-button');
        if(!button)return;
        applyTheme(button.dataset.theme||'dark');
      });
      header.insertAdjacentElement('afterend',row);
    }else if(row.previousElementSibling!==header){
      header.insertAdjacentElement('afterend',row);
    }
    syncButtons(readTheme());
    return true;
  }

  function keepToggleAvailable(){
    ensureToggle();
    const observer=new MutationObserver(()=>ensureToggle());
    const start=()=>{
      if(!document.body)return;
      observer.observe(document.body,{subtree:true,childList:true});
    };
    if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
    window.addEventListener('mijnserenity:dashboard-ready',ensureToggle,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)ensureToggle()},{passive:true});
  }

  function startTheme(){
    installStyle();
    applyTheme(readTheme(),{persist:false});
    keepToggleAvailable();
  }

  function loadPreviousDashboard(){
    if(window.__msDashboardHotfix8245){startTheme();return}
    const script=document.createElement('script');
    script.src=PREVIOUS;
    script.async=false;
    script.crossOrigin='anonymous';
    script.onload=()=>{startTheme();setTimeout(ensureToggle,0);setTimeout(ensureToggle,350)};
    script.onerror=()=>{console.error('Vorige Serenity dashboardversie kon niet worden geladen.');startTheme()};
    document.head.appendChild(script);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadPreviousDashboard,{once:true});
  else loadPreviousDashboard();
})();
