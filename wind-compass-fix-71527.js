(function(){
  'use strict';
  if(window.__ms71527WindCompassFix)return;
  window.__ms71527WindCompassFix=true;
  window.__msWindDisplayOwner='71531-stable';

  const $=id=>document.getElementById(id);
  const DIRS=['N','NNO','NO','ONO','O','OZO','ZO','ZZO','Z','ZZW','ZW','WZW','W','WNW','NW','NNW'];
  let heading=null;
  let listening=false;
  let gotSensor=false;
  let lastSensorAt=0;
  let smoothWind=null;
  let displayedDir=null;
  let observer=null;
  let rendering=false;

  function norm360(value){
    const n=Number(value);
    return Number.isFinite(n)?((n%360)+360)%360:null;
  }

  function shortestDelta(from,to){
    return ((to-from+540)%360)-180;
  }

  function directionName(deg){
    const value=norm360(deg);
    if(value===null)return '–';
    return DIRS[Math.round(value/22.5)%16];
  }

  function directionCenter(name){
    const i=DIRS.indexOf(name);
    return i<0?null:i*22.5;
  }

  function screenRotationClockwise(){
    try{
      const angle=Number(screen.orientation?.angle);
      if(Number.isFinite(angle))return angle;
    }catch(e){}
    const legacy=Number(window.orientation);
    return Number.isFinite(legacy)?-legacy:0;
  }

  function rawWeatherDirection(){
    // Eén bron heeft voorrang: actuele weerdata. Zo mengen we geen graden uit
    // verschillende widgets of oude DOM-tekst door elkaar.
    try{
      const d=Number(window.liveNavState?.weather?.windDirection);
      if(Number.isFinite(d))return norm360(d);
    }catch(e){}

    // Alleen als liveNavState nog niet beschikbaar is, mag de weertekst dienen
    // als tijdelijke fallback. Een bestaande dashboardtekst wordt bewust genegeerd.
    const text=$('ivmsWeatherWind')?.textContent||'';
    const degree=text.match(/(?:^|\s)(\d{1,3})(?:\s*°)/);
    if(degree){
      const n=norm360(degree[1]);
      if(n!==null)return n;
    }
    const match=text.match(/\b(NNO|ONO|OZO|ZZO|ZZW|WZW|WNW|NNW|NO|ZO|ZW|NW|N|O|Z|W)\b/i);
    if(!match)return null;
    const map={N:0,NNO:22.5,NO:45,ONO:67.5,O:90,OZO:112.5,ZO:135,ZZO:157.5,Z:180,ZZW:202.5,ZW:225,WZW:247.5,W:270,WNW:292.5,NW:315,NNW:337.5};
    return map[match[1].toUpperCase()]??null;
  }

  function filteredWind(){
    const raw=rawWeatherDirection();
    if(raw===null)return smoothWind;
    if(smoothWind===null){
      smoothWind=raw;
    }else{
      // Circulaire low-pass: grote bronwissels worden niet in één frame zichtbaar.
      const delta=shortestDelta(smoothWind,raw);
      smoothWind=norm360(smoothWind+delta*0.18);
    }
    return smoothWind;
  }

  function stableDirectionName(deg){
    if(deg===null)return '–';
    const candidate=directionName(deg);
    if(!displayedDir){
      displayedDir=candidate;
      return displayedDir;
    }
    const center=directionCenter(displayedDir);
    if(center===null){
      displayedDir=candidate;
      return displayedDir;
    }
    // Hysterese: pas naar een buur-sector wanneer de meting ruim buiten de
    // huidige 22,5° sector staat. Hierdoor knippert N/NW niet op de grens.
    if(Math.abs(shortestDelta(center,deg))>14.5)displayedDir=candidate;
    return displayedDir;
  }

  function render(){
    const arrow=$('ms71512WindArrow');
    const dir=$('ms71512WindDirection');
    const wind=filteredWind();
    if(wind===null){
      if(dir&&dir.textContent!=='–')dir.textContent='–';
      return;
    }

    rendering=true;
    try{
      const name=stableDirectionName(wind);
      // Alleen een rustige kompasnaam. Geen losse graden die kunnen verspringen.
      if(dir&&dir.textContent!==name)dir.textContent=name;

      // Meteorologische richting = waar de wind vandaan komt.
      // Pijl moet wijzen waar hij naartoe waait. De CSS-pijl wijst standaard omhoog,
      // dus 0°=omhoog, 90°=rechts, 180°=omlaag, 270°=links.
      const windTo=norm360(wind+180);
      const rotation=heading===null?windTo:norm360(windTo-heading);
      if(arrow){
        arrow.style.setProperty('--ms-wind-angle',`${rotation}deg`);
        arrow.style.setProperty('transform',`translate(-50%,-100%) rotate(${rotation}deg)`,'important');
        arrow.style.setProperty('display','block','important');
        arrow.style.setProperty('visibility','visible','important');
        arrow.style.setProperty('opacity','1','important');
      }
    }finally{
      rendering=false;
    }
  }

  function sensor(event){
    let next=null;
    const iosHeading=Number(event.webkitCompassHeading);
    if(Number.isFinite(iosHeading)){
      // iOS geeft een absolute kompasrichting. Geen extra landscape-correctie.
      next=iosHeading;
    }else if(Number.isFinite(Number(event.alpha))){
      next=norm360(360-Number(event.alpha)-screenRotationClockwise());
    }
    if(next===null)return;
    // Kleine kompasjitter eveneens dempen.
    const normalized=norm360(next);
    if(heading===null)heading=normalized;
    else heading=norm360(heading+shortestDelta(heading,normalized)*0.25);
    gotSensor=true;
    lastSensorAt=Date.now();
    const btn=$('ms71512CompassPermission');
    if(btn){
      btn.classList.remove('hidden');
      btn.classList.add('active');
      btn.textContent='🧭 Kompas actief';
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
    if(btn){btn.classList.remove('hidden');btn.textContent='🧭 Kompas starten…';}
    try{
      if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){
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
        if(!gotSensor&&btn){btn.classList.remove('active','hidden');btn.textContent='🧭 Geen kompasdata · tik opnieuw';}
      },2200);
    }catch(error){
      console.warn('MijnSerenity kompas activeren mislukt',error);
      if(btn)btn.textContent='🧭 Kompas opnieuw proberen';
    }
  };

  function installOwnershipObserver(){
    if(observer)return;
    const card=document.querySelector('.ms71512-wind-card');
    if(!card)return;
    observer=new MutationObserver(()=>{
      if(rendering)return;
      // Een oudere module heeft de tekst of transform overschreven.
      // Herstel in de volgende animatieframe zonder zichtbare 800ms-wissel.
      requestAnimationFrame(render);
    });
    observer.observe(card,{subtree:true,characterData:true,childList:true,attributes:true,attributeFilter:['style','class']});
  }

  function init(){
    const btn=$('ms71512CompassPermission');
    if(btn){
      btn.classList.remove('hidden');
      let enabled=false;
      try{enabled=localStorage.getItem('ms71512_compass_enabled')==='1'}catch(e){}
      btn.textContent=enabled?'🧭 Tik voor live kompas':'🧭 Kompas activeren';
    }
    start();
    installOwnershipObserver();
    render();
    setInterval(()=>{
      render();
      installOwnershipObserver();
      if(gotSensor&&Date.now()-lastSensorAt>5000){
        const b=$('ms71512CompassPermission');
        if(b){b.classList.remove('hidden');b.textContent='🧭 Kompas opnieuw activeren';}
      }
    },250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
