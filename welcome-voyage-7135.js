/* MijnSerenity 7.13.5 — grappige welkomstzinnen + automatisch vaar-dashboard */
(()=>{
  'use strict';

  const RETURN_DELAY_MS=10000;
  const MOVING_SPEED_KMH=1.5;
  let returnTimer=null;
  let greeting='';
  let greetingLockUntil=0;
  let lastKnownPage='dashboard';

  function pickDifferent(list,key){
    if(!Array.isArray(list)||!list.length)return 'Welkom aan boord, Desi & Michel! ⚓';
    let previous='';
    try{ previous=localStorage.getItem(key)||''; }catch(_){ }
    let choices=list.filter(item=>item!==previous);
    if(!choices.length)choices=list;
    const selected=choices[Math.floor(Math.random()*choices.length)];
    try{ localStorage.setItem(key,selected); }catch(_){ }
    return selected;
  }

  function greetingPool(date){
    const hour=date.getHours();
    const weekday=date.getDay();

    if(hour>=5&&hour<10){
      return [
        'Goedemorgen Desi & Michel ☕⚓ Serenity is wakker. De bemanning hopelijk ook.',
        'Môgge Desi & Michel! 🌅 Eerst koffie, dan koers. Anders wordt het een rondje rietkraag.',
        'Goedemorgen kapiteins! 🚤 De dag ligt open — en hopelijk de bruggen straks ook.',
        'Desi & Michel, welkom aan boord 🌞 Serenity meldt: motor koud, koffie graag warm.',
        'Opstaan Desi & Michel! ⚓ De boot heeft er zin in. Nu jullie nog even.'
      ];
    }
    if(hour>=10&&hour<12){
      return [
        'Goedemorgen Desi & Michel 😎 Prima vaartijd: wakker, gevoed en nog vóór de borrel.',
        'Welkom aan boord! 🚤 Het water ligt klaar. Probeer vandaag alleen de vaargeul te testen.',
        'Desi & Michel aan boord ✅ Serenity kan weer opgelucht ademhalen.',
        'Trossen los? ⚓ Desi & Michel zijn er — nu alleen nog doen alsof alles gepland was.',
        'Ah, de directie is gearriveerd 😄 Welkom Desi & Michel. Serenity staat paraat.'
      ];
    }
    if(hour>=12&&hour<17){
      return [
        'Goedemiddag Desi & Michel ☀️ Ideaal vaarweer… althans volgens de kapitein.',
        'Welkom terug, Desi & Michel! 🚤 Tijd om kilometers te maken of heel professioneel een terrasje te zoeken.',
        'Middag aan boord ⚓ Serenity vraagt vriendelijk: varen we nog, of was de lunch het einddoel?',
        'Desi & Michel zijn present 😎 Koers gezet op gezelligheid, met een kleine afwijking voor bruggen.',
        'Goedemiddag! 🛟 De boot is klaar. De vraag is vooral: waar leggen we straks aan voor iets lekkers?'
      ];
    }
    if(hour>=17&&hour<21){
      return [
        'Goedenavond Desi & Michel 🌇 De mooiste vaaruren beginnen. De borrel ligt vermoedelijk al op koers.',
        'Welkom aan boord! 🍹⚓ Avondvaartmodus: rustig gas, mooie plek, nul haast.',
        'Desi & Michel, daar zijn jullie weer 😄 Serenity heeft de zonsondergang alvast besteld.',
        'Avond aan boord 🚤 Vandaag nog varen of direct overgaan naar de afdeling hapjes & drankjes?',
        'Goedenavond kapiteins 🌅 De haven lonkt, maar een klein ommetje kan natuurlijk altijd.'
      ];
    }
    if(hour>=21||hour<1){
      return [
        'Goedenavond Desi & Michel 🌙 Serenity fluistert: rustig aan, de boeien slapen bijna.',
        'Welkom aan boord bij nacht 🌌 Navigatielichten aan, gezelligheidsverlichting ook.',
        'Desi & Michel, late dienst! ⚓ Nu vooral niet denken: “dat bruggetje redden we nog wel”.',
        'Avondploeg compleet 😄 Serenity is wakker zolang jullie dat ook zijn.',
        'Nachtelijke groet 🌙 De boot zegt: nog één rondje dan… precies zoals jullie.'
      ];
    }
    return [
      'Desi & Michel… het is écht laat 😴 Serenity adviseert koers: bed.',
      'Nachtwacht aan boord 🌙 Wie nu nog vaart, mag morgen de koffie dubbel zetten.',
      'Welkom nachtbrakers ⚓ Zelfs de meeuwen hebben vrij. Doe een beetje rustig.',
      'Serenity om deze tijd? 😄 Dat heet geen avondvaart meer, dat heet overwerk.',
      'Desi & Michel, welkom 🌌 De sterren staan aan. De rest mag eigenlijk uit.'
    ];
  }

  function makeGreeting(){
    const now=new Date();
    let pool=greetingPool(now);
    if(now.getDay()===5&&now.getHours()>=15){
      pool=pool.concat([
        'Vrijdag! 🎉 Desi & Michel aan boord — weekend officieel goedgekeurd door Serenity.',
        'Het is vrijdag 😎 Laptop dicht, trossen los. Serenity begrijpt prioriteiten.'
      ]);
    }
    if(now.getDay()===0||now.getDay()===6){
      pool=pool.concat([
        'Weekend aan boord! 🚤 Desi & Michel, vandaag is “moeten” vervangen door “waar varen we heen?”.',
        'Weekendmodus actief 😎 Planning: varen, aanleggen, genieten. Volgorde mag wisselen.'
      ]);
    }
    return pickDifferent(pool,'mijnserenity-last-welcome-7135');
  }

  function applyGreeting(force=false){
    if(!greeting)greeting=makeGreeting();
    if(force)greetingLockUntil=Date.now()+12000;
    ['welcome','captainGreeting'].forEach(id=>{
      const el=document.getElementById(id);
      if(el&&el.textContent!==greeting)el.textContent=greeting;
    });
  }

  function currentSpeed(){
    try{
      if(typeof liveNavState!=='undefined'){
        const speed=Number(liveNavState?.speedKmh);
        if(Number.isFinite(speed))return speed;
      }
    }catch(_){ }
    const el=document.getElementById('liveSpeedKmh');
    const parsed=Number(String(el?.textContent||'0').replace(',','.'));
    return Number.isFinite(parsed)?parsed:0;
  }

  function tripIsActive(){
    try{
      if(typeof liveNavState!=='undefined'&&liveNavState?.status==='active')return true;
    }catch(_){ }
    return currentSpeed()>=MOVING_SPEED_KMH;
  }

  function visiblePage(){
    const sections=[...document.querySelectorAll('#appView > section')];
    return sections.find(section=>!section.classList.contains('hidden'))?.id||lastKnownPage||'dashboard';
  }

  function clearReturnTimer(){
    if(returnTimer){
      clearTimeout(returnTimer);
      returnTimer=null;
    }
  }

  function scrollDashboardTop(){
    const target=document.getElementById('serenityIvms')||document.getElementById('dashboard');
    if(target){
      target.scrollIntoView({behavior:'smooth',block:'start'});
    }else{
      window.scrollTo({top:0,left:0,behavior:'smooth'});
    }
  }

  function returnToVoyageDashboard(){
    clearReturnTimer();
    if(!tripIsActive()||document.hidden)return;
    const page=visiblePage();
    if(page!=='dashboard'&&typeof window.captainNavigate==='function'){
      window.captainNavigate('dashboard');
      setTimeout(scrollDashboardTop,180);
    }else{
      scrollDashboardTop();
    }
  }

  function scheduleReturn(reason='navigation'){
    clearReturnTimer();
    if(!tripIsActive()||document.hidden)return;
    returnTimer=setTimeout(returnToVoyageDashboard,RETURN_DELAY_MS);
  }

  function installNavigationGuard(){
    const original=window.captainNavigate;
    if(typeof original!=='function'||original.__ms7135Wrapped)return false;

    function wrapped(id,sourceButton=null){
      const result=original.call(this,id,sourceButton);
      lastKnownPage=id||visiblePage();
      setTimeout(()=>{
        if(tripIsActive()){
          if(id==='dashboard'){
            // Het essentiële vaaroverzicht blijft bovenaan in beeld.
            scrollDashboardTop();
          }else{
            scheduleReturn('navigation');
          }
        }else{
          clearReturnTimer();
        }
      },120);
      return result;
    }
    wrapped.__ms7135Wrapped=true;
    wrapped.__ms7135Original=original;
    window.captainNavigate=wrapped;
    return true;
  }

  function installScrollGuard(){
    let scrollArmed=false;
    window.addEventListener('scroll',()=>{
      if(!tripIsActive()||visiblePage()!=='dashboard')return;
      const y=window.scrollY||document.documentElement.scrollTop||0;
      if(y<180){
        scrollArmed=false;
        return;
      }
      if(!scrollArmed){
        scrollArmed=true;
        scheduleReturn('scroll');
        setTimeout(()=>{scrollArmed=false;},RETURN_DELAY_MS+250);
      }
    },{passive:true});
  }

  function heartbeat(){
    if(Date.now()<greetingLockUntil)applyGreeting(false);
    if(tripIsActive()){
      if(!returnTimer&&visiblePage()!=='dashboard')scheduleReturn('heartbeat');
    }else{
      clearReturnTimer();
    }
  }

  function start(){
    greeting=makeGreeting();
    applyGreeting(true);

    let tries=0;
    const navigationInstaller=setInterval(()=>{
      tries++;
      if(installNavigationGuard()||tries>40)clearInterval(navigationInstaller);
    },250);

    installScrollGuard();
    setInterval(heartbeat,1000);

    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){
        clearReturnTimer();
      }else{
        applyGreeting(false);
        if(tripIsActive()&&visiblePage()!=='dashboard')scheduleReturn('resume');
      }
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }
})();
