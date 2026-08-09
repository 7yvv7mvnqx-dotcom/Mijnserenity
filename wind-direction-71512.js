
(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  let deviceHeading=null;
  let orientationListening=false;
  let permissionGranted=false;

  function norm360(v){
    const n=Number(v);
    if(!Number.isFinite(n)) return null;
    return ((n%360)+360)%360;
  }

  function directionName(deg){
    deg=norm360(deg);
    if(deg===null)return '–';
    const names=['N','NNO','NO','ONO','O','OZO','ZO','ZZO','Z','ZZW','ZW','WZW','W','WNW','NW','NNW'];
    return names[Math.round(deg/22.5)%16];
  }

  function weatherDirection(){
    try{
      if(typeof liveNavState!=='undefined'){
        const d=Number(liveNavState?.weather?.windDirection);
        if(Number.isFinite(d))return norm360(d);
      }
    }catch(e){}

    // Open-Meteo/weerdata kunnen ook elders in de pagina beschikbaar zijn.
    const weatherText=$('ivmsWeatherWind')?.textContent||'';
    const compassMatch=weatherText.match(/\b(NNO|ONO|OZO|ZZO|ZZW|WZW|WNW|NNW|NO|ZO|ZW|NW|N|O|Z|W)\b/i);
    if(compassMatch){
      const map={N:0,NNO:22.5,NO:45,ONO:67.5,O:90,OZO:112.5,ZO:135,ZZO:157.5,Z:180,ZZW:202.5,ZW:225,WZW:247.5,W:270,WNW:292.5,NW:315,NNW:337.5};
      return map[compassMatch[1].toUpperCase()] ?? null;
    }
    return null;
  }

  function screenAngle(){
    try{
      if(screen.orientation && Number.isFinite(Number(screen.orientation.angle))){
        return Number(screen.orientation.angle);
      }
    }catch(e){}
    return Number(window.orientation)||0;
  }

  function handleOrientation(event){
    let heading=null;

    // iOS Safari geeft de absolute kompasrichting hier.
    if(Number.isFinite(Number(event.webkitCompassHeading))){
      heading=Number(event.webkitCompassHeading);
    }else if(event.absolute && Number.isFinite(Number(event.alpha))){
      // Bij absolute DeviceOrientation is alpha rotatie t.o.v. geografisch noord.
      heading=360-Number(event.alpha);
    }else if(Number.isFinite(Number(event.alpha))){
      // Beste fallback; niet op elk toestel magnetisch noord.
      heading=360-Number(event.alpha);
    }

    if(heading!==null){
      heading=norm360(heading + screenAngle());
      deviceHeading=heading;
      permissionGranted=true;
      update();
    }
  }

  function startListening(){
    if(orientationListening)return;
    orientationListening=true;
    window.addEventListener('deviceorientationabsolute',handleOrientation,true);
    window.addEventListener('deviceorientation',handleOrientation,true);
  }

  window.ms71512EnableCompass=async function(event){
    event?.stopPropagation?.();
    const btn=$('ms71512CompassPermission');
    try{
      if(typeof DeviceOrientationEvent!=='undefined' &&
         typeof DeviceOrientationEvent.requestPermission==='function'){
        const result=await DeviceOrientationEvent.requestPermission();
        if(result!=='granted'){
          if(btn)btn.textContent='🧭 Toestemming nodig';
          return;
        }
      }
      permissionGranted=true;
      try{ localStorage.setItem('ms71512_compass_enabled','1'); }catch(e){}
      startListening();
      if(btn){
        btn.textContent='🧭 Kompas actief';
        btn.classList.add('active');
      }
      setTimeout(()=>btn?.classList.add('hidden'),1800);
    }catch(err){
      console.warn('Kompas kon niet worden geactiveerd',err);
      if(btn)btn.textContent='🧭 Probeer opnieuw';
    }
  };

  function update(){
    const wind=weatherDirection();
    const dir=$('ms71512WindDirection');
    const arrow=$('ms71512WindArrow');
    if(wind===null){
      if(dir)dir.textContent='richting –';
      return;
    }

    if(dir)dir.textContent=`${directionName(wind)} · ${Math.round(wind)}°`;

    // De tekst blijft de meteorologische windrichting (waar de wind vandaan komt).
    // Alleen de pijl wijst 180 graden omgekeerd: waar de wind naartoe waait.
    const displayRotation=deviceHeading===null ? norm360(wind+180) : norm360(wind+180-deviceHeading);
    if(arrow)arrow.style.transform=`translate(-50%,-100%) rotate(${displayRotation}deg)`;
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const btn=$('ms71512CompassPermission');
    let enabled=false;
    try{enabled=localStorage.getItem('ms71512_compass_enabled')==='1'}catch(e){}
    if(enabled){
      // Op Android/veel browsers mag dit direct; op iOS kan alsnog een tik nodig zijn
      // wanneer Safari de toestemming niet heeft behouden.
      startListening();
      if(btn)btn.textContent='🧭 Kompas actief';
    }
    update();
    setInterval(update,800);
  },{once:true});

  window.addEventListener('orientationchange',()=>setTimeout(update,150));
})();
