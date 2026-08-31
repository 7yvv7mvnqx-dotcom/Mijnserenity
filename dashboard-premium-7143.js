/* MijnSerenity 8.20.2 — SOC kleurzones zonder globale repair-loop
   Huishoudaccu: >99% groen, >85–99% geel, >40–85% oranje, 0–40% rood. */
(()=>{
  'use strict';
  if(window.__msSocColor8202)return;
  window.__msSocColor8202=true;
  window.__ms71531BatteryFlow=true;

  const colorForSoc=soc=>soc>99?'#46d879':soc>85?'#ffd43b':soc>40?'#ff922b':'#ff4d4f';
  let observed=null;
  let observer=null;

  function socElement(){
    return document.getElementById('mgSoc')||document.getElementById('mg7195Soc');
  }

  function applySocColor(){
    const ring=document.getElementById('mgSocRing');
    const socEl=socElement();
    if(!ring||!socEl)return;
    const match=String(socEl.textContent||'').replace(',','.').match(/\d+(?:\.\d+)?/);
    if(!match)return;
    const soc=Math.max(0,Math.min(100,Number(match[0])));
    if(!Number.isFinite(soc))return;
    const color=colorForSoc(soc);
    ring.style.background=`conic-gradient(from 218deg, ${color} 0 calc(var(--p)*1%), #17334b calc(var(--p)*1%) 72%, transparent 72% 100%)`;
    const value=socEl.closest('strong')||socEl;
    value.style.color=color;
  }

  function observeSoc(){
    const target=socElement();
    if(!target||observed===target)return;
    observer?.disconnect();
    observed=target;
    observer=new MutationObserver(applySocColor);
    observer.observe(target,{childList:true,subtree:true,characterData:true});
    applySocColor();
  }

  function refresh(){
    observeSoc();
    applySocColor();
  }

  [
    'mijnserenity:dashboard-ready','mijnserenity-vrm-energy-live-updated',
    'mijnserenity-vrm-diagnostics-updated','mijnserenity-ha-state-updated'
  ].forEach(name=>window.addEventListener(name,refresh,{passive:true}));
  window.addEventListener('pageshow',refresh,{passive:true});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});
  else refresh();
})();