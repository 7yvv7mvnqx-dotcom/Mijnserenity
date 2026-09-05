/* MijnSerenity 8.25.3 — persoonlijke welkomsttekst per ingelogde gebruiker */
(()=>{
  'use strict';
  if(window.__msPersonalWelcome8253)return;
  window.__msPersonalWelcome8253=true;

  const BUILD='8.25.3';
  const BASE='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@e0b38dd45769c9f64ece597c85d6e21e9bc51489/start-dashboard-71510.js';
  let retryTimer=0;
  let retryCount=0;

  const clean=value=>String(value??'').replace(/\s+/g,' ').trim();

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta&&meta.content!==BUILD)meta.content=BUILD;
    const settings=document.getElementById('settingsAppVersion');
    if(settings&&settings.textContent!==BUILD)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>{
      if(node.textContent!==BUILD)node.textContent=BUILD;
    });
  }

  function tidyName(value){
    const raw=clean(value);
    if(!raw)return '';
    const first=raw.split(/\s+/)[0].replace(/^[^A-Za-zÀ-ÿ'’-]+|[^A-Za-zÀ-ÿ'’-]+$/g,'');
    if(!first||first.length>28)return '';
    return first.charAt(0).toUpperCase()+first.slice(1);
  }

  function renderedGreetingName(){
    const text=clean(document.getElementById('ms8234Greeting')?.textContent);
    const match=text.match(/^(?:Goedemorgen|Goedemiddag|Goedenavond)\s+([^\s👋,!]+)/i);
    return tidyName(match?.[1]);
  }

  function firstName(){
    const candidates=[
      window.currentProfile?.first_name,
      window.currentProfile?.display_name,
      window.currentProfile?.full_name,
      window.currentProfile?.name,
      window.currentUser?.user_metadata?.first_name,
      window.currentUser?.user_metadata?.given_name,
      window.currentUser?.user_metadata?.display_name,
      window.currentUser?.user_metadata?.full_name,
      window.currentUser?.user_metadata?.name
    ];
    for(const candidate of candidates){
      const name=tidyName(candidate);
      if(name)return name;
    }

    const email=clean(window.currentUser?.email);
    if(email){
      const local=email.split('@')[0].replace(/[._-]+/g,' ').trim().split(/\s+/)[0];
      if(/^[A-Za-zÀ-ÿ'’-]{2,28}$/.test(local))return tidyName(local);
    }

    return renderedGreetingName();
  }

  const WELCOME_COPY=[
    name=>({title:`Mooi dat je er bent, ${name}!`,sub:'Serenity staat voor je klaar. Kies je koers en geniet van het water.'}),
    name=>({title:`Welkom terug aan boord, ${name}!`,sub:'Alles staat klaar voor een ontspannen dag op het water.'}),
    name=>({title:`Fijn dat je er weer bent, ${name}!`,sub:'De Serenity ligt klaar. Waar brengt de volgende reis je naartoe?'}),
    name=>({title:`Daar ben je weer, ${name}!`,sub:'Tijd voor nieuwe plekken, mooie routes en lekker varen.'}),
    name=>({title:`Goed je weer te zien, ${name}!`,sub:'Serenity is er klaar voor. Jij bepaalt vandaag de bestemming.'}),
    name=>({title:`Welkom aan boord, ${name}!`,sub:'Een nieuwe vaardag begint hier. Waar zetten we koers naartoe?'}),
    name=>({title:`Klaar om te vertrekken, ${name}?`,sub:'De boot staat paraat voor jouw volgende tocht over het water.'}),
    name=>({title:`Serenity wacht op je, ${name}!`,sub:'Bekijk de omstandigheden, kies een route en maak er een mooie tocht van.'})
  ];

  function copyFor(name){
    if(!name){
      return {title:'Welkom terug aan boord!',sub:'De Serenity ligt klaar. Waar brengt de volgende reis je naartoe?'};
    }
    const key=name.toLocaleLowerCase('nl-NL');
    let score=0;
    for(const char of key)score+=char.codePointAt(0)||0;
    return WELCOME_COPY[score%WELCOME_COPY.length](name);
  }

  function personalizeWelcome(){
    syncBuild();
    const root=document.getElementById('ms8210Start');
    const hero=root?.querySelector('.ms8234-hero');
    const heading=hero?.querySelector('h2');
    if(!root||!hero||!heading)return false;

    const name=firstName();
    const copy=copyFor(name);
    const kicker=hero.querySelector('.ms8234-kicker');
    const sub=hero.querySelector('.ms8245-hero-sub');

    if(kicker&&kicker.textContent!=='WELKOM TERUG')kicker.textContent='WELKOM TERUG';
    if(heading.textContent!==copy.title)heading.textContent=copy.title;
    if(sub&&sub.textContent!==copy.sub)sub.textContent=copy.sub;

    root.dataset.msPersonalWelcome=name||'guest';
    return Boolean(name);
  }

  function runBoundedRefresh(){
    clearTimeout(retryTimer);
    retryCount=0;
    const run=()=>{
      retryCount+=1;
      const hasName=personalizeWelcome();
      if(!hasName&&retryCount<12){
        retryTimer=setTimeout(run,retryCount<4?250:700);
      }
    };
    run();
  }

  function startPersonalWelcome(){
    syncBuild();
    runBoundedRefresh();

    ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:auth-ready','mijnserenity:profile-ready'].forEach(type=>{
      window.addEventListener(type,runBoundedRefresh,{passive:true});
    });
    window.addEventListener('mijnserenity:theme-changed',()=>{
      personalizeWelcome();
      syncBuild();
    },{passive:true});
    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden)runBoundedRefresh();
    },{passive:true});

    setTimeout(runBoundedRefresh,0);
    setTimeout(runBoundedRefresh,500);
    setTimeout(runBoundedRefresh,1600);
  }

  function loadBase(){
    if(window.__msDayNightChoice8252){
      startPersonalWelcome();
      return;
    }
    const script=document.createElement('script');
    script.src=BASE;
    script.async=false;
    script.crossOrigin='anonymous';
    script.onload=startPersonalWelcome;
    script.onerror=()=>{
      console.error('MijnSerenity 8.25.2 basis kon niet worden geladen.');
      startPersonalWelcome();
    };
    document.head.appendChild(script);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadBase,{once:true});
  else loadBase();
})();
