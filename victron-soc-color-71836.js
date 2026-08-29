/* MijnSerenity 7.18.36 — Victron SOC kleurzones
   Eén kleur voor de volledige actieve accuring op basis van actuele SOC:
   >99% groen, >85–99% geel, >40–85% oranje, 0–40% rood. */
(()=>{
  'use strict';
  if(window.__msVictronSocColor71836)return;
  window.__msVictronSocColor71836=true;

  const colorForSoc=soc=>soc>99?'#46d879':soc>85?'#ffd43b':soc>40?'#ff922b':'#ff4d4f';

  function apply(){
    const ring=document.getElementById('mgSocRing');
    const socEl=document.getElementById('mg7195Soc');
    if(!ring||!socEl)return;
    const match=String(socEl.textContent||'').replace(',','.').match(/\d+(?:\.\d+)?/);
    if(!match)return;
    const soc=Math.max(0,Math.min(100,Number(match[0])));
    if(!Number.isFinite(soc))return;
    const color=colorForSoc(soc);
    ring.style.setProperty('--mg-soc-color',color);
    ring.style.background=`conic-gradient(from 218deg, ${color} 0 calc(var(--p)*1%), #17334b calc(var(--p)*1%) 72%, transparent 72% 100%)`;
    const value=socEl.closest('strong');
    if(value)value.style.color=color;
  }

  function start(){
    apply();
    const target=document.getElementById('msVictronEnergy')||document.body;
    new MutationObserver(apply).observe(target,{subtree:true,childList:true,characterData:true});
    setInterval(apply,2000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
