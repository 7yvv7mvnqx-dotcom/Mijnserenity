(function(){
  'use strict';
  if(window.__ms71527WindCompassFix)return;
  window.__ms71527WindCompassFix=true;
  window.__msWindDisplayOwner='71531-fixed-compass';

  const $=id=>document.getElementById(id);
  const DIRS=['N','NNO','NO','ONO','O','OZO','ZO','ZZO','Z','ZZW','ZW','WZW','W','WNW','NW','NNW'];
  let smoothWind=null;
  let displayedDir=null;
  let observer=null;
  let rendering=false;

  function norm360(value){
    const n=Number(value);
    return Number.isFinite(n)?((n%360)+360)%360:null;
  }
  function shortestDelta(from,to){return ((to-from+540)%360)-180;}
  function directionName(deg){
    const value=norm360(deg);
    return value===null?'–':DIRS[Math.round(value/22.5)%16];
  }
  function directionCenter(name){
    const i=DIRS.indexOf(name);
    return i<0?null:i*22.5;
  }

  function rawWeatherDirection(){
    try{
      const d=Number(window.liveNavState?.weather?.windDirection);
      if(Number.isFinite(d))return norm360(d);
    }catch(e){}
    const text=$('ivmsWeatherWind')?.textContent||'';
    const degree=text.match(/(?:^|\s)(\d{1,3})(?:\s*°)/);
    if(degree)return norm360(degree[1]);
    const match=text.match(/\b(NNO|ONO|OZO|ZZO|ZZW|WZW|WNW|NNW|NO|ZO|ZW|NW|N|O|Z|W)\b/i);
    if(!match)return null;
    const map={N:0,NNO:22.5,NO:45,ONO:67.5,O:90,OZO:112.5,ZO:135,ZZO:157.5,Z:180,ZZW:202.5,ZW:225,WZW:247.5,W:270,WNW:292.5,NW:315,NNW:337.5};
    return map[match[1].toUpperCase()]??null;
  }

  function filteredWind(){
    const raw=rawWeatherDirection();
    if(raw===null)return smoothWind;
    if(smoothWind===null)smoothWind=raw;
    else smoothWind=norm360(smoothWind+shortestDelta(smoothWind,raw)*0.18);
    return smoothWind;
  }

  function stableDirectionName(deg){
    if(deg===null)return '–';
    const candidate=directionName(deg);
    if(!displayedDir){displayedDir=candidate;return displayedDir;}
    const center=directionCenter(displayedDir);
    if(center===null||Math.abs(shortestDelta(center,deg))>14.5)displayedDir=candidate;
    return displayedDir;
  }

  function render(){
    const arrow=$('ms71512WindArrow');
    const dir=$('ms71512WindDirection');
    const wind=filteredWind();
    if(wind===null){if(dir&&dir.textContent!=='–')dir.textContent='–';return;}

    rendering=true;
    try{
      const name=stableDirectionName(wind);
      if(dir&&dir.textContent!==name)dir.textContent=name;

      // De kompasroos op het scherm is vast: N staat altijd bovenaan.
      // Daarom NOOIT corrigeren met de fysieke richting van iPhone/iPad.
      // Meteorologische windrichting is waar de wind vandaan komt;
      // de pijl toont waar de wind naartoe waait: +180 graden.
      const rotation=norm360(wind+180);
      if(arrow){
        arrow.style.setProperty('--ms-wind-angle',`${rotation}deg`);
        arrow.style.setProperty('transform',`translate(-50%,-100%) rotate(${rotation}deg)`,'important');
        arrow.style.setProperty('display','block','important');
        arrow.style.setProperty('visibility','visible','important');
        arrow.style.setProperty('opacity','1','important');
      }

      // Live-kompas is niet meer nodig voor deze vaste windmeter.
      const btn=$('ms71512CompassPermission');
      if(btn)btn.style.setProperty('display','none','important');
    }finally{rendering=false;}
  }

  // Houd oudere modules tegen die dezelfde windkaart nog proberen te overschrijven.
  function installObserver(){
    if(observer)return;
    const card=document.querySelector('.ms71512-wind-card');
    if(!card)return;
    observer=new MutationObserver(()=>{if(!rendering)requestAnimationFrame(render);});
    observer.observe(card,{subtree:true,characterData:true,childList:true,attributes:true,attributeFilter:['style','class']});
  }

  function init(){
    installObserver();
    render();
    setInterval(()=>{render();installObserver();},250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
