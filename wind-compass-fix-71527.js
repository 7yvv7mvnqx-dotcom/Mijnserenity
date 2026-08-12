(function(){
  'use strict';
  if(window.__ms71527WindCompassFix)return;
  window.__ms71527WindCompassFix=true;

  const $=id=>document.getElementById(id);
  let heading=null;
  let listening=false;
  let gotSensor=false;
  let lastSensorAt=0;

  function norm360(value){
    const n=Number(value);
    return Number.isFinite(n)?((n%360)+360)%360:null;
  }

  function screenRotationClockwise(){
    try{
      const angle=Number(screen.orientation?.angle);
      if(Number.isFinite(angle))return angle;
    }catch(e){}
    const legacy=Number(window.orientation);
    return Number.isFinite(legacy)?-legacy:0;
  }

  function weatherDirection(){
    try{
      const d=Number(window.liveNavState?.weather?.windDirection);
      if(Number.isFinite(d))return norm360(d);
    }catch(e){}
    const text=$('ivmsWeatherWind')?.textContent||'';
    const match=text.match(/\b(NNO|ONO|OZO|ZZO|ZZW|WZW|WNW|NNW|NO|ZO|ZW|NW|N|O|Z|W)\b/i);
    if(!match)return null;
    const map={N:0,NNO:22.5,NO:45,ONO:67.5,O:90,OZO:112.5,ZO:135,ZZO:157.5,Z:180,ZZW:202.5,ZW:225,WZW:247.5,W:270,WNW:292.5,NW:315,NNW:337.5};
    return map[match[1].toUpperCase()]??null;
  }

  function render(){
    const arrow=$('ms71512WindArrow');
    const wind=weatherDirection();
    if(!arrow||wind===null)return;
    const windTo=norm360(wind+180);
    const rotation=heading===null?windTo:norm360(windTo-heading);
    arrow.style.setProperty('transform',`translate(-50%,-100%) rotate(${rotation}deg)`,'important');
  }

  function sensor(event){
    let next=null;
    const iosHeading=Number(event.webkitCompassHeading);
    if(Number.isFinite(iosHeading)){
      // iOS/WebKit levert hier al een echte kompasrichting t.o.v. noord.
      // Niet nogmaals corrigeren voor portrait/landscape.
      next=iosHeading;
    }else if(Number.isFinite(Number(event.alpha))){
      // Alpha is toestel-frame-data; alleen deze fallback krijgt schermcorrectie.
      next=norm360(360-Number(event.alpha)-screenRotationClockwise());
    }
    if(next===null)return;
    heading=norm360(next);
    gotSensor=true;
    lastSensorAt=Date.now();
    const btn=$('ms71512CompassPermission');
    if(btn){
      btn.classList.remove('hidden');
      btn.classList.add('active');
      btn.textContent=`🧭 Kompas actief · ${Math.round(heading)}°`;
    }
    render();
  }

  function start(){
    if(listening)return;
    listening=true;
    window.addEventListener('deviceorientationabsolute',sensor,true);
    window.addEventListener('deviceorientation',sensor,true);
  }

  window.ms71512EnableCompass=async function(event){
    event?.stopPropagation?.();
    const btn=$('ms71512CompassPermission');
    gotSensor=false;
    if(btn){
      btn.classList.remove('hidden');
      btn.textContent='🧭 Kompas starten…';
    }
    try{
      if(typeof DeviceOrientationEvent!=='undefined' && typeof DeviceOrientationEvent.requestPermission==='function'){
        const result=await DeviceOrientationEvent.requestPermission();
        if(result!=='granted'){
          if(btn)btn.textContent='🧭 Kompastoegang geweigerd';
          return;
        }
      }
      try{localStorage.setItem('ms71512_compass_enabled','1')}catch(e){}
      start();
      if(btn)btn.textContent='🧭 Wachten op kompas…';
      setTimeout(()=>{
        if(!gotSensor&&btn){
          btn.classList.remove('active','hidden');
          btn.textContent='🧭 Geen kompasdata · tik opnieuw';
        }
      },2200);
    }catch(error){
      console.warn('MijnSerenity kompas activeren mislukt',error);
      if(btn)btn.textContent='🧭 Kompas opnieuw proberen';
    }
  };

  function init(){
    const btn=$('ms71512CompassPermission');
    if(btn){
      btn.classList.remove('hidden');
      let enabled=false;
      try{enabled=localStorage.getItem('ms71512_compass_enabled')==='1'}catch(e){}
      btn.textContent=enabled?'🧭 Tik voor live kompas':'🧭 Kompas activeren';
    }
    // Op browsers zonder expliciete toestemming kan luisteren direct werken.
    start();
    render();
    setInterval(()=>{
      render();
      if(gotSensor&&Date.now()-lastSensorAt>5000){
        const b=$('ms71512CompassPermission');
        if(b){b.classList.remove('hidden');b.textContent='🧭 Kompas opnieuw activeren';}
      }
    },120);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
