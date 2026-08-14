(function(){
  'use strict';
  if(window.__ms71527WindCompassFix)return;
  window.__ms71527WindCompassFix=true;
  window.__msWindDisplayOwner='71531-device-relative';

  const $=id=>document.getElementById(id);
  const DIRS=['N','NNO','NO','ONO','O','OZO','ZO','ZZO','Z','ZZW','ZW','WZW','W','WNW','NW','NNW'];
  let smoothWind=null,displayedDir=null,observer=null,rendering=false;
  let heading=null,listening=false,gotSensor=false,lastSensorAt=0;

  function norm360(v){const n=Number(v);return Number.isFinite(n)?((n%360)+360)%360:null;}
  function shortestDelta(a,b){return ((b-a+540)%360)-180;}
  function directionName(d){const v=norm360(d);return v===null?'–':DIRS[Math.round(v/22.5)%16];}
  function directionCenter(n){const i=DIRS.indexOf(n);return i<0?null:i*22.5;}

  function rawWeatherDirection(){
    try{const d=Number(window.liveNavState?.weather?.windDirection);if(Number.isFinite(d))return norm360(d);}catch(e){}
    const text=$('ivmsWeatherWind')?.textContent||'';
    const degree=text.match(/(?:^|\s)(\d{1,3})\s*°/);if(degree)return norm360(degree[1]);
    const m=text.match(/\b(NNO|ONO|OZO|ZZO|ZZW|WZW|WNW|NNW|NO|ZO|ZW|NW|N|O|Z|W)\b/i);
    if(!m)return null;
    const map={N:0,NNO:22.5,NO:45,ONO:67.5,O:90,OZO:112.5,ZO:135,ZZO:157.5,Z:180,ZZW:202.5,ZW:225,WZW:247.5,W:270,WNW:292.5,NW:315,NNW:337.5};
    return map[m[1].toUpperCase()]??null;
  }

  function filteredWind(){
    const raw=rawWeatherDirection();if(raw===null)return smoothWind;
    if(smoothWind===null)smoothWind=raw;else smoothWind=norm360(smoothWind+shortestDelta(smoothWind,raw)*0.18);
    return smoothWind;
  }
  function stableDirectionName(d){
    if(d===null)return '–';const candidate=directionName(d);
    if(!displayedDir){displayedDir=candidate;return displayedDir;}
    const center=directionCenter(displayedDir);if(center===null||Math.abs(shortestDelta(center,d))>14.5)displayedDir=candidate;
    return displayedDir;
  }

  function screenAngle(){
    try{const a=Number(screen.orientation?.angle);if(Number.isFinite(a))return a;}catch(e){}
    const legacy=Number(window.orientation);return Number.isFinite(legacy)?-legacy:0;
  }

  function sensor(event){
    let next=null;
    const ios=Number(event.webkitCompassHeading);
    if(Number.isFinite(ios))next=ios;
    else if(Number.isFinite(Number(event.alpha)))next=norm360(360-Number(event.alpha)-screenAngle());
    if(next===null)return;
    const n=norm360(next);heading=heading===null?n:norm360(heading+shortestDelta(heading,n)*0.25);
    window.__msWindDeviceHeading=heading;
    gotSensor=true;lastSensorAt=Date.now();
    const btn=$('ms71512CompassPermission');
    if(btn){btn.style.removeProperty('display');btn.classList.add('active');btn.textContent='🧭 Richting actief';setTimeout(()=>btn.classList.add('hidden'),1200);}
    render();
  }

  function startListening(){
    if(listening)return;listening=true;
    window.addEventListener('deviceorientationabsolute',sensor,true);
    window.addEventListener('deviceorientation',sensor,true);
  }

  window.ms71512EnableCompass=async function(event){
    event?.stopPropagation?.();const btn=$('ms71512CompassPermission');
    try{
      if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){
        const result=await DeviceOrientationEvent.requestPermission();
        if(result!=='granted'){if(btn)btn.textContent='🧭 Toestemming nodig';return;}
      }
      try{localStorage.setItem('ms71512_compass_enabled','1')}catch(e){}
      gotSensor=false;startListening();if(btn){btn.style.removeProperty('display');btn.classList.remove('hidden');btn.textContent='🧭 Richting bepalen…';}
    }catch(error){console.warn('Kompas activeren mislukt',error);if(btn)btn.textContent='🧭 Probeer opnieuw';}
  };

  function render(){
    const arrow=$('ms71512WindArrow'),dir=$('ms71512WindDirection'),wind=filteredWind();
    if(wind===null){if(dir)dir.textContent='–';return;}
    rendering=true;
    try{
      const name=stableDirectionName(wind);if(dir&&dir.textContent!==name)dir.textContent=name;
      const windTo=norm360(wind+180);
      const rotation=heading===null?windTo:norm360(windTo-heading);
      if(arrow){
        arrow.style.setProperty('--ms-wind-angle',`${rotation}deg`);
        arrow.style.setProperty('transform',`translate(-50%,-100%) rotate(${rotation}deg)`,'important');
        arrow.style.setProperty('display','block','important');arrow.style.setProperty('visibility','visible','important');arrow.style.setProperty('opacity','1','important');
      }
      const btn=$('ms71512CompassPermission');
      if(btn&&!gotSensor){btn.style.removeProperty('display');btn.classList.remove('hidden');btn.textContent='🧭 Tik voor live richting';}
    }finally{rendering=false;}
  }

  function installObserver(){
    if(observer)return;const card=document.querySelector('.ms71512-wind-card');if(!card)return;
    observer=new MutationObserver(()=>{if(!rendering)requestAnimationFrame(render);});
    observer.observe(card,{subtree:true,characterData:true,childList:true,attributes:true,attributeFilter:['style','class']});
  }

  function init(){
    let enabled=false;try{enabled=localStorage.getItem('ms71512_compass_enabled')==='1'}catch(e){}
    if(enabled)startListening();
    installObserver();render();
    setInterval(()=>{
      render();installObserver();
      if(gotSensor&&Date.now()-lastSensorAt>6000){gotSensor=false;const b=$('ms71512CompassPermission');if(b){b.classList.remove('hidden');b.textContent='🧭 Tik voor live richting';}}
    },250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();