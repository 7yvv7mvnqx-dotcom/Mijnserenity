/* MijnSerenity 8.25.2 — Dag/Nacht-keuze zonder dashboard update-loop */
(()=>{
  'use strict';
  if(window.__msDayNightChoice8252)return;
  window.__msDayNightChoice8252=true;

  const BUILD='8.25.2';
  const BASE='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@47ebd68bcea993fe3780badb18f1e68a7182de10/start-dashboard-71510.js';
  const STYLE_ID='ms8251ThemeChoiceStyle';
  const CONTROL_ID='ms8251ThemeControl';
  let observer=null;

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta&&meta.content!==BUILD)meta.content=BUILD;
    const settings=document.getElementById('settingsAppVersion');
    if(settings&&settings.textContent!==BUILD)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>{if(el.textContent!==BUILD)el.textContent=BUILD});
  }

  function mode(){
    try{return window.serenityDayNight?.mode?.()||'auto'}catch(_){return 'auto'}
  }

  function theme(){
    try{return window.serenityDayNight?.theme?.()||document.documentElement.dataset.msDaynight||'day'}catch(_){return 'day'}
  }

  function labelForMode(value){
    if(value==='day')return 'Dag';
    if(value==='night')return 'Nacht';
    return 'Auto';
  }

  function iconForTheme(value){return value==='night'?'☾':'☀'}

  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
#${CONTROL_ID}{display:flex;justify-content:flex-end;position:relative;z-index:95;margin:-8px 2px 10px;pointer-events:none}
#${CONTROL_ID} .ms8251-theme-wrap{position:relative;pointer-events:auto}
#${CONTROL_ID} .ms8251-theme-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:36px;padding:7px 11px;border:1px solid rgba(94,199,235,.24);border-radius:999px;background:rgba(5,30,46,.86);box-shadow:0 8px 22px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.04);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#eaf8ff;font:inherit;font-size:11.5px;font-weight:800;line-height:1;cursor:pointer;-webkit-tap-highlight-color:transparent}
#${CONTROL_ID} .ms8251-theme-button:active{transform:scale(.98)}
#${CONTROL_ID} .ms8251-theme-icon{display:grid;place-items:center;width:18px;height:18px;font-size:17px;line-height:1;color:#62d9ff}
#${CONTROL_ID} .ms8251-theme-caret{font-size:10px;opacity:.75}
#${CONTROL_ID} .ms8251-theme-menu{position:absolute;top:calc(100% + 7px);right:0;display:grid;gap:4px;width:154px;padding:6px;border:1px solid rgba(93,195,231,.22);border-radius:16px;background:rgba(4,25,39,.97);box-shadow:0 18px 42px rgba(0,0,0,.34);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
#${CONTROL_ID} .ms8251-theme-menu[hidden]{display:none!important}
#${CONTROL_ID} .ms8251-theme-option{display:flex;align-items:center;gap:9px;min-height:38px;padding:8px 10px;border:0;border-radius:11px;background:transparent;color:#dcecf5;font:inherit;font-size:12px;font-weight:750;text-align:left;cursor:pointer}
#${CONTROL_ID} .ms8251-theme-option:hover,#${CONTROL_ID} .ms8251-theme-option:focus-visible{background:rgba(60,190,232,.10);outline:none}
#${CONTROL_ID} .ms8251-theme-option[aria-checked="true"]{background:rgba(47,190,232,.16);color:#fff}
#${CONTROL_ID} .ms8251-theme-option .ms8251-check{margin-left:auto;color:#58dcff;opacity:0}
#${CONTROL_ID} .ms8251-theme-option[aria-checked="true"] .ms8251-check{opacity:1}

html[data-ms-daynight="day"] #${CONTROL_ID} .ms8251-theme-button{border-color:rgba(45,121,151,.20);background:rgba(255,255,255,.82);box-shadow:0 8px 22px rgba(36,78,95,.10),inset 0 1px 0 rgba(255,255,255,.9);color:#17394a}
html[data-ms-daynight="day"] #${CONTROL_ID} .ms8251-theme-icon{color:#148bb5}
html[data-ms-daynight="day"] #${CONTROL_ID} .ms8251-theme-menu{border-color:rgba(48,123,153,.18);background:rgba(252,254,255,.97);box-shadow:0 18px 38px rgba(35,75,92,.18)}
html[data-ms-daynight="day"] #${CONTROL_ID} .ms8251-theme-option{color:#284c5e}
html[data-ms-daynight="day"] #${CONTROL_ID} .ms8251-theme-option:hover,html[data-ms-daynight="day"] #${CONTROL_ID} .ms8251-theme-option:focus-visible{background:rgba(24,145,185,.08)}
html[data-ms-daynight="day"] #${CONTROL_ID} .ms8251-theme-option[aria-checked="true"]{background:rgba(24,145,185,.11);color:#0a3045}
html[data-ms-daynight="day"] #${CONTROL_ID} .ms8251-theme-option .ms8251-check{color:#0c9bc7}

@media(max-width:620px){
  #${CONTROL_ID}{margin-top:-7px;margin-bottom:9px}
  #${CONTROL_ID} .ms8251-theme-button{min-height:34px;padding:6px 10px;font-size:11px}
}
@media(prefers-reduced-motion:reduce){#${CONTROL_ID} .ms8251-theme-button{transition:none}}
`;
    document.head.appendChild(style);
  }

  function syncControl(){
    const control=document.getElementById(CONTROL_ID);
    if(!control)return;
    const currentMode=mode();
    const currentTheme=theme();
    const icon=control.querySelector('.ms8251-theme-icon');
    const label=control.querySelector('.ms8251-theme-label');
    const iconText=iconForTheme(currentTheme);
    const labelText=labelForMode(currentMode);
    if(icon&&icon.textContent!==iconText)icon.textContent=iconText;
    if(label&&label.textContent!==labelText)label.textContent=labelText;
    control.querySelectorAll('.ms8251-theme-option').forEach(option=>{
      const state=String(option.dataset.mode===currentMode);
      if(option.getAttribute('aria-checked')!==state)option.setAttribute('aria-checked',state);
    });
  }

  function closeMenu(){
    const menu=document.querySelector(`#${CONTROL_ID} .ms8251-theme-menu`);
    const button=document.querySelector(`#${CONTROL_ID} .ms8251-theme-button`);
    if(menu&&!menu.hidden)menu.hidden=true;
    if(button&&button.getAttribute('aria-expanded')!=='false')button.setAttribute('aria-expanded','false');
  }

  function choose(next){
    try{window.serenityDayNight?.set?.(next)}catch(error){console.warn('Dag/Nacht-keuze kon niet worden toegepast.',error)}
    syncControl();
    closeMenu();
  }

  function ensureControl(){
    const root=document.getElementById('ms8210Start');
    const header=root?.querySelector('.ms8234-header');
    if(!root||!header)return false;

    let control=document.getElementById(CONTROL_ID);
    if(!control){
      control=document.createElement('div');
      control.id=CONTROL_ID;
      control.innerHTML=`
        <div class="ms8251-theme-wrap">
          <button type="button" class="ms8251-theme-button" aria-haspopup="menu" aria-expanded="false" title="Dag- of nachtweergave kiezen">
            <span class="ms8251-theme-icon" aria-hidden="true">☀</span>
            <span class="ms8251-theme-label">Auto</span>
            <span class="ms8251-theme-caret" aria-hidden="true">⌄</span>
          </button>
          <div class="ms8251-theme-menu" role="menu" aria-label="Weergave kiezen" hidden>
            <button type="button" class="ms8251-theme-option" data-mode="auto" role="menuitemradio" aria-checked="false"><span aria-hidden="true">◐</span><span>Automatisch</span><span class="ms8251-check">✓</span></button>
            <button type="button" class="ms8251-theme-option" data-mode="day" role="menuitemradio" aria-checked="false"><span aria-hidden="true">☀</span><span>Dag</span><span class="ms8251-check">✓</span></button>
            <button type="button" class="ms8251-theme-option" data-mode="night" role="menuitemradio" aria-checked="false"><span aria-hidden="true">☾</span><span>Nacht</span><span class="ms8251-check">✓</span></button>
          </div>
        </div>`;

      const button=control.querySelector('.ms8251-theme-button');
      const menu=control.querySelector('.ms8251-theme-menu');
      button.addEventListener('click',event=>{
        event.stopPropagation();
        const open=menu.hidden;
        menu.hidden=!open;
        button.setAttribute('aria-expanded',String(open));
      });
      control.addEventListener('click',event=>{
        const option=event.target.closest('.ms8251-theme-option');
        if(option)choose(option.dataset.mode||'auto');
      });
      header.insertAdjacentElement('afterend',control);
    }else if(control.previousElementSibling!==header){
      header.insertAdjacentElement('afterend',control);
    }

    syncControl();
    return true;
  }

  function needsControlRepair(){
    const root=document.getElementById('ms8210Start');
    const header=root?.querySelector('.ms8234-header');
    const control=document.getElementById(CONTROL_ID);
    return Boolean(root&&header&&(!control||control.previousElementSibling!==header));
  }

  function startChoice(){
    installStyle();
    syncBuild();
    ensureControl();

    if(!observer&&document.body){
      observer=new MutationObserver(()=>{if(needsControlRepair())ensureControl()});
      observer.observe(document.body,{subtree:true,childList:true});
    }

    document.addEventListener('click',event=>{
      if(!event.target.closest(`#${CONTROL_ID}`))closeMenu();
    },{passive:true});
    window.addEventListener('mijnserenity:theme-changed',()=>{syncControl();syncBuild()},{passive:true});
    window.addEventListener('mijnserenity:dashboard-ready',()=>{ensureControl();syncBuild()},{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){ensureControl();syncControl();syncBuild()}},{passive:true});

    setTimeout(()=>{ensureControl();syncBuild()},0);
    setTimeout(()=>{ensureControl();syncBuild()},400);
    setTimeout(()=>{ensureControl();syncBuild()},1400);
  }

  function loadBase(){
    if(window.__msDayNight8250){startChoice();return}
    const script=document.createElement('script');
    script.src=BASE;
    script.async=false;
    script.crossOrigin='anonymous';
    script.onload=startChoice;
    script.onerror=()=>{console.error('MijnSerenity Dag/Nacht-basis kon niet worden geladen.');startChoice()};
    document.head.appendChild(script);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadBase,{once:true});
  else loadBase();
})();