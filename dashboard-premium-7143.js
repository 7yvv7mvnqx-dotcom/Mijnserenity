/* MijnSerenity 7.19.0 — legacy premium dashboard uitgeschakeld + SOC kleurzones.
   De actuele Marine Glass-kaart toont zelf stroom, spanning en vermogen.
   Huishoudaccu: >99% groen, >85–99% geel, >40–85% oranje, 0–40% rood. */
(()=>{
  'use strict';
  window.__ms71531BatteryFlow=true;

  const colorForSoc=soc=>soc>99?'#46d879':soc>85?'#ffd43b':soc>40?'#ff922b':'#ff4d4f';
  function applySocColor(){
    const ring=document.getElementById('mgSocRing');
    const socEl=document.getElementById('mg7195Soc');
    if(!ring||!socEl)return;
    const m=String(socEl.textContent||'').replace(',','.').match(/\d+(?:\.\d+)?/);
    if(!m)return;
    const soc=Math.max(0,Math.min(100,Number(m[0])));
    if(!Number.isFinite(soc))return;
    const color=colorForSoc(soc);
    ring.style.background=`conic-gradient(from 218deg, ${color} 0 calc(var(--p)*1%), #17334b calc(var(--p)*1%) 72%, transparent 72% 100%)`;
    const value=socEl.closest('strong');
    if(value)value.style.color=color;
  }
  function start(){
    applySocColor();
    new MutationObserver(applySocColor).observe(document.body,{subtree:true,childList:true,characterData:true});
    setInterval(applySocColor,2000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
