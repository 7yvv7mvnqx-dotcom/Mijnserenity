/* MijnSerenity 7.15.42 — windpijl wijst altijd waar de wind naartoe waait */
(()=>{
  'use strict';
  if(window.__msWindDirectionFix71542)return;
  window.__msWindDirectionFix71542=true;

  const $=id=>document.getElementById(id);
  const norm=value=>{
    const n=Number(value);
    return Number.isFinite(n)?((n%360)+360)%360:null;
  };

  const CARDINAL={
    N:0,NNO:22.5,NO:45,ONO:67.5,O:90,OZO:112.5,ZO:135,ZZO:157.5,
    Z:180,ZZW:202.5,ZW:225,WZW:247.5,W:270,WNW:292.5,NW:315,NNW:337.5
  };

  function text(id){
    return ($(id)?.textContent||'').trim();
  }

  function directionFromText(source){
    const value=String(source||'').trim();
    if(!value)return null;

    const degreeMatch=value.match(/(-?\d{1,3}(?:[.,]\d+)?)\s*°/);
    if(degreeMatch)return norm(String(degreeMatch[1]).replace(',','.'));

    const compassMatch=value.match(/\b(NNO|ONO|OZO|ZZO|ZZW|WZW|WNW|NNW|NO|ZO|ZW|NW|N|O|Z|W)\b/i);
    return compassMatch ? CARDINAL[compassMatch[1].toUpperCase()] ?? null : null;
  }

  function windFrom(){
    const candidates=[
      window.liveNavState?.weather?.windDirection,
      window.liveNavState?.weather?.wind_direction,
      window.liveNavState?.weather?.windDir,
      window.liveNavState?.weather?.windDirectionDegrees
    ];
    for(const candidate of candidates){
      const direct=norm(candidate);
      if(direct!==null)return direct;
      const parsed=directionFromText(candidate);
      if(parsed!==null)return parsed;
    }

    const sources=[
      text('ivmsWeatherWind'),
      text('ms71512WindDirection'),
      text('weatherWindDirection'),
      text('ms793WeatherWindDirection')
    ];
    for(const source of sources){
      const parsed=directionFromText(source);
      if(parsed!==null)return parsed;
    }
    return null;
  }

  function compassLabel(deg){
    if(deg===null)return '';
    const labels=['N','NNO','NO','ONO','O','OZO','ZO','ZZO','Z','ZZW','ZW','WZW','W','WNW','NW','NNW'];
    return labels[Math.round(deg/22.5)%16];
  }

  function sync(){
    const topLabel=document.querySelector('.msc-wind-top small');
    if(topLabel)topLabel.textContent='Wind waait naar';

    const from=windFrom();
    if(from===null){
      const deg=$('mscWindDeg');
      if(deg)deg.textContent='richting –';
      return;
    }

    // Weerbronnen geven de richting waarVANDAAN de wind komt.
    // De pijl op MijnSerenity toont bewust waarHEEN de wind waait.
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
      // Volledig onafhankelijk van iPhone/iPad-orientatie.
      // 0° = noord bovenin, 90° = oost, 180° = zuid, 270° = west.
      arrow.style.transform=`translate(-50%,-100%) rotate(${to}deg)`;
      arrow.dataset.windTo=String(to);
    }
  }

  function install(){
    sync();
    [
      'mijnserenity-ha-state-updated',
      'mijnserenity-ha-connected',
      'mijnserenity:weather-updated',
      'mijnserenity-weather-updated'
    ].forEach(name=>window.addEventListener(name,sync,{passive:true}));
    setInterval(()=>{if(!document.hidden)sync()},500);
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')sync();
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
