/* MijnSerenity 7.15.41 — windpijl wijst altijd waar de wind naartoe waait */
(()=>{
  'use strict';
  if(window.__msWindDirectionFix71541)return;
  window.__msWindDirectionFix71541=true;

  const $=id=>document.getElementById(id);
  const norm=value=>{
    const n=Number(value);
    return Number.isFinite(n)?((n%360)+360)%360:null;
  };

  function text(id){
    return ($(id)?.textContent||'').trim();
  }

  function windFrom(){
    const live=norm(window.liveNavState?.weather?.windDirection);
    if(live!==null)return live;

    const source=text('ivmsWeatherWind')||text('ms71512WindDirection');
    const match=source.match(/(-?\d{1,3}(?:[.,]\d+)?)\s*°/);
    return match?norm(String(match[1]).replace(',','.')):null;
  }

  function compassLabel(deg){
    if(deg===null)return '';
    const labels=['N','NO','O','ZO','Z','ZW','W','NW'];
    return labels[Math.round(deg/45)%8];
  }

  function sync(){
    const from=windFrom();
    if(from===null)return;

    // Weerbronnen geven normaal de richting WAARVANDAAN de wind komt.
    // Voor MijnSerenity tonen we bewust de richting WAARHEEN de wind waait.
    const to=norm(from+180);
    if(to===null)return;

    const rounded=Math.round(to)%360;
    const degrees=String(rounded).padStart(3,'0')+'°';
    const label=compassLabel(to);

    const deg=$('mscWindDeg');
    if(deg)deg.textContent=degrees+(label?' '+label:'');

    const awa=$('mscAwa');
    if(awa)awa.textContent=degrees;

    const arrow=$('mscWindArrow');
    if(arrow){
      // Geen correctie met deviceorientation/kompas van de iPhone.
      // 0° = noord bovenin het vaste dashboard; 90° = oost, enz.
      arrow.style.transform=`translate(-50%,-100%) rotate(${to}deg)`;
    }

    const topLabel=document.querySelector('.msc-wind-top small');
    if(topLabel)topLabel.textContent='Wind waait naar';
  }

  function install(){
    sync();
    ['mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity:weather-updated']
      .forEach(name=>window.addEventListener(name,sync,{passive:true}));
    setInterval(()=>{if(!document.hidden)sync()},500);
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')sync();
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
