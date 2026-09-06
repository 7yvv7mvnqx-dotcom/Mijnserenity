/* MijnSerenity 8.26.5 — mirrored Serenity hero on the start page.
   Keep the complete 8.26.4 dashboard intact by loading that pinned build first,
   then apply the new photo only to the start-page header/hero. */
(()=>{
  'use strict';
  if(window.__ms8265HomeHero)return;
  window.__ms8265HomeHero=true;

  const PRIOR='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@83f48cc089aecf77e41109bd92348be9bb19d035/start-dashboard-71510.js?v=826400';
  const CHUNKS=[1,2,3,4].map(n=>`/assets/serenity-home-hero-8265.b64.${n}?v=826500`);
  let heroData='';

  function loadPrior(){
    return new Promise(resolve=>{
      if(window.__MS71510_START_DASHBOARD__){resolve();return;}
      const existing=document.querySelector('script[data-ms8265-prior]');
      if(existing){existing.addEventListener('load',resolve,{once:true});setTimeout(resolve,3500);return;}
      const script=document.createElement('script');
      script.src=PRIOR;
      script.async=false;
      script.dataset.ms8265Prior='1';
      script.onload=resolve;
      script.onerror=resolve;
      (document.head||document.documentElement).appendChild(script);
      setTimeout(resolve,3500);
    });
  }

  function installStyle(){
    if(document.getElementById('ms8265HomeHeroStyle'))return;
    const style=document.createElement('style');
    style.id='ms8265HomeHeroStyle';
    style.textContent=`
      #dashboard .ms71514-hero.ms8265-home-hero,
      #ms8210Start .ms8265-home-hero{
        background-image:linear-gradient(90deg,rgba(2,14,22,.68) 0%,rgba(2,14,22,.38) 38%,rgba(2,14,22,.08) 72%,rgba(2,14,22,.18) 100%),var(--ms8265-hero-image)!important;
        background-size:cover!important;
        background-position:center 52%!important;
        background-repeat:no-repeat!important;
        color:#fff!important;
        text-shadow:0 2px 12px rgba(0,0,0,.42);
      }
      #dashboard .ms71514-hero.ms8265-home-hero::after{
        background:linear-gradient(180deg,rgba(2,12,20,.02),rgba(2,13,20,.46))!important;
      }
      #ms8210Start .ms8265-home-hero h1,
      #ms8210Start .ms8265-home-hero h2,
      #ms8210Start .ms8265-home-hero h3,
      #ms8210Start .ms8265-home-hero p,
      #ms8210Start .ms8265-home-hero [class*="title"],
      #ms8210Start .ms8265-home-hero [class*="brand"]{
        color:#fff!important;
        text-shadow:0 2px 12px rgba(0,0,0,.45);
      }
    `;
    (document.head||document.documentElement).appendChild(style);
  }

  function modernHero(root){
    let hero=root.querySelector('[class*="hero"],[class*="welcome"],[class*="intro"]');
    if(hero)return hero;
    const labels=[...root.querySelectorAll('h1,h2,h3,[class*="brand"],[class*="title"],strong')];
    const hit=labels.find(el=>/mijnserenity|welkom aan boord|klaar om te gaan varen/i.test(el.textContent||''));
    if(!hit)return null;
    let node=hit;
    while(node.parentElement&&node.parentElement!==root){
      const r=node.getBoundingClientRect();
      if(r.width>240&&r.height>90)return node;
      node=node.parentElement;
    }
    return hit.parentElement&&hit.parentElement!==root?hit.parentElement:null;
  }

  function applyHero(){
    if(!heroData)return;
    installStyle();
    const image=`url("${heroData}")`;
    const targets=[];
    const legacy=document.querySelector('#dashboard .ms71514-hero');
    if(legacy)targets.push(legacy);
    const modern=document.getElementById('ms8210Start');
    const current=modern&&modernHero(modern);
    if(current)targets.push(current);
    targets.forEach(el=>{
      el.classList.add('ms8265-home-hero');
      el.style.setProperty('--ms8265-hero-image',image);
      el.dataset.msHeroBuild='8265';
    });
  }

  async function loadHero(){
    try{
      const parts=await Promise.all(CHUNKS.map(url=>fetch(url,{cache:'force-cache'}).then(r=>{
        if(!r.ok)throw new Error(`Hero ${r.status}`);
        return r.text();
      })));
      heroData='data:image/webp;base64,'+parts.map(p=>p.trim()).join('');
      applyHero();
    }catch(error){
      console.warn('Serenity startfoto kon niet worden geladen.',error);
    }
  }

  function watch(){
    applyHero();
    const root=document.body||document.documentElement;
    if(!root)return;
    const observer=new MutationObserver(applyHero);
    observer.observe(root,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),15000);
  }

  loadPrior().finally(()=>{applyHero();watch();});
  loadHero();
  window.addEventListener('mijnserenity:dashboard-ready',applyHero,{passive:true});
  window.addEventListener('mijnserenity:routechange',applyHero,{passive:true});
})();
