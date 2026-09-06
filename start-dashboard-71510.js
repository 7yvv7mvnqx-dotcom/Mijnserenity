/* MijnSerenity 8.26.6 — Serenity-foto veilig bovenop 8.26.5 publiceren.
   De volledige live Start/statuslaag van commit de78ddf blijft ongewijzigd;
   deze wrapper voegt alleen de nieuwe startfoto toe. */
(()=>{
  'use strict';
  if(window.__ms8266HomeHero)return;
  window.__ms8266HomeHero=true;

  const BUILD='8.26.6';
  const PRIOR='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@de78ddf4fba781d312d7aa109c0f06f3e358e49d/start-dashboard-71510.js?v=826500';
  const HERO='/assets/serenity-home-hero-8266.jpg?v=826600';
  const STYLE_ID='ms8266HomeHeroStyle';

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const version=document.getElementById('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
  }

  function loadPrior(){
    return new Promise(resolve=>{
      if(window.__msStartStatus8265){resolve();return;}
      const existing=document.querySelector('script[data-ms8266-prior]');
      if(existing){
        existing.addEventListener('load',resolve,{once:true});
        setTimeout(resolve,4000);
        return;
      }
      const script=document.createElement('script');
      script.src=PRIOR;
      script.async=false;
      script.crossOrigin='anonymous';
      script.dataset.ms8266Prior='1';
      script.onload=resolve;
      script.onerror=()=>{
        console.error('MijnSerenity 8.26.5 basis kon niet worden geladen.');
        resolve();
      };
      (document.head||document.documentElement).appendChild(script);
      setTimeout(resolve,4000);
    });
  }

  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #dashboard .ms71514-hero.ms8266-home-hero,
      #ms8210Start .ms8266-home-hero{
        background-image:linear-gradient(90deg,rgba(2,14,22,.66) 0%,rgba(2,14,22,.38) 38%,rgba(2,14,22,.08) 72%,rgba(2,14,22,.18) 100%),url("${HERO}")!important;
        background-size:cover!important;
        background-position:center 52%!important;
        background-repeat:no-repeat!important;
        color:#fff!important;
        text-shadow:0 2px 12px rgba(0,0,0,.42)!important;
      }
      #dashboard .ms71514-hero.ms8266-home-hero::after{
        background:linear-gradient(180deg,rgba(2,12,20,.02),rgba(2,13,20,.46))!important;
      }
      #ms8210Start .ms8266-home-hero h1,
      #ms8210Start .ms8266-home-hero h2,
      #ms8210Start .ms8266-home-hero h3,
      #ms8210Start .ms8266-home-hero p,
      #ms8210Start .ms8266-home-hero [class*="title"],
      #ms8210Start .ms8266-home-hero [class*="brand"]{
        color:#fff!important;
        text-shadow:0 2px 12px rgba(0,0,0,.45)!important;
      }
    `;
    (document.head||document.documentElement).appendChild(style);
  }

  function findModernHero(root){
    if(!root)return null;
    const direct=root.querySelector('.ms8234-hero,.ms8210-hero,[class*="hero"],[class*="welcome"],[class*="intro"]');
    if(direct)return direct;
    const labels=[...root.querySelectorAll('h1,h2,h3,[class*="brand"],[class*="title"],strong')];
    const hit=labels.find(el=>/serenity|welkom aan boord|klaar om te gaan varen/i.test(String(el.textContent||'')));
    if(!hit)return null;
    let node=hit;
    while(node.parentElement&&node.parentElement!==root){
      const rect=node.getBoundingClientRect();
      if(rect.width>240&&rect.height>90)return node;
      node=node.parentElement;
    }
    return hit.parentElement&&hit.parentElement!==root?hit.parentElement:null;
  }

  function applyHero(){
    installStyle();
    const targets=[];
    const legacy=document.querySelector('#dashboard .ms71514-hero');
    if(legacy)targets.push(legacy);
    const modernRoot=document.getElementById('ms8210Start');
    const modern=findModernHero(modernRoot);
    if(modern)targets.push(modern);
    targets.forEach(target=>{
      target.classList.add('ms8266-home-hero');
      target.dataset.msHeroBuild='8266';
    });
  }

  function refresh(){
    syncBuild();
    applyHero();
  }

  function watch(){
    refresh();
    const root=document.body||document.documentElement;
    if(!root)return;
    const observer=new MutationObserver(()=>requestAnimationFrame(refresh));
    observer.observe(root,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),15000);
  }

  loadPrior().finally(()=>{
    watch();
    [0,250,800,1800,3500].forEach(delay=>setTimeout(refresh,delay));
  });

  ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:start-requested','mijnserenity:routechange','pageshow']
    .forEach(type=>window.addEventListener(type,()=>requestAnimationFrame(refresh),{passive:true}));
})();
