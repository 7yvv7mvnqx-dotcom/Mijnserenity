/* MijnSerenity 8.28.2 — dubbele oude start-hero verwijderd. */
(()=>{
  'use strict';
  if(window.__ms8282StartFix)return;
  window.__ms8282StartFix=true;

  const BUILD='8.28.2';
  const PRIOR='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@0261da95450099f9fef74f16b8ba20acd0f9e507/start-dashboard-71510.js?v=828200';
  const PARTS=Array.from({length:13},(_,i)=>`/assets/serenity-hero-8281-${String(i+1).padStart(2,'0')}.txt?v=828201`);
  const ACTIVE_CLASS='ms8282-modern-start-active';
  const HIDDEN_ATTR='data-ms8282-legacy-hidden';
  let imageUrl='';
  let imagePromise=null;
  let rootObserver=null;
  let dashboardObserver=null;

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const version=document.getElementById('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
  }

  function loadPrior(){
    if(window.__ms8280Header)return Promise.resolve();
    return new Promise(resolve=>{
      let s=document.querySelector('script[data-ms8282-prior],script[data-ms8281-prior]');
      if(s){
        if(window.__ms8280Header){resolve();return;}
        s.addEventListener('load',resolve,{once:true});
        s.addEventListener('error',resolve,{once:true});
        setTimeout(resolve,7000);
        return;
      }
      s=document.createElement('script');
      s.src=PRIOR;
      s.async=false;
      s.crossOrigin='anonymous';
      s.dataset.ms8282Prior='1';
      s.onload=resolve;
      s.onerror=()=>{console.error('MijnSerenity 8.28.2: headerbasis kon niet laden.'); resolve();};
      (document.head||document.documentElement).appendChild(s);
      setTimeout(resolve,7000);
    });
  }

  async function loadPhoto(){
    if(imageUrl)return imageUrl;
    if(imagePromise)return imagePromise;
    imagePromise=(async()=>{
      const chunks=[];
      for(const path of PARTS){
        const r=await fetch(path,{cache:'no-store',credentials:'same-origin'});
        if(!r.ok)throw new Error(`Serenity-fotodeel ${r.status}: ${path}`);
        chunks.push((await r.text()).trim());
      }
      const b64=chunks.join('').replace(/\s+/g,'');
      if(!b64.startsWith('/9j/'))throw new Error('Ongeldige Serenity JPEG');
      imageUrl=`data:image/jpeg;base64,${b64}`;
      return imageUrl;
    })().catch(err=>{console.error('Serenity-achtergrond kon niet worden opgebouwd.',err); imagePromise=null; return '';});
    return imagePromise;
  }

  function installStyle(){
    let style=document.getElementById('ms8282StartFixStyle');
    if(!style){
      style=document.createElement('style');
      style.id='ms8282StartFixStyle';
      (document.head||document.documentElement).appendChild(style);
    }
    style.textContent=`
      #ms8210Start .ms8280-photo{
        display:block!important;
        visibility:visible!important;
        opacity:1!important;
        object-fit:cover!important;
        object-position:62% 54%!important;
      }

      /* Zodra de nieuwe 8.28-header actief is, mag de oude dashboard-hero
         nergens meer als tweede kop onder het statusblok terugkomen. */
      #dashboard.${ACTIVE_CLASS} .ms71514-hero{
        display:none!important;
        visibility:hidden!important;
      }

      @media(max-width:760px){
        #ms8210Start .ms8280-photo{object-position:66% 54%!important}
      }
    `;
  }

  function suppressLegacyHero(){
    const dashboard=document.getElementById('dashboard');
    if(!dashboard)return false;

    const modern=dashboard.querySelector('#ms8210Start .ms8280-header');
    const legacyHeroes=[...dashboard.querySelectorAll('.ms71514-hero')];

    if(!modern){
      dashboard.classList.remove(ACTIVE_CLASS);
      legacyHeroes.forEach(hero=>{
        if(hero.hasAttribute(HIDDEN_ATTR)){
          hero.hidden=false;
          hero.removeAttribute('aria-hidden');
          hero.removeAttribute(HIDDEN_ATTR);
        }
      });
      return false;
    }

    dashboard.classList.add(ACTIVE_CLASS);
    legacyHeroes.forEach(hero=>{
      if(modern.contains(hero))return;
      hero.hidden=true;
      hero.setAttribute('aria-hidden','true');
      hero.setAttribute(HIDDEN_ATTR,'1');
    });
    return true;
  }

  async function applyPhoto(){
    syncBuild();
    installStyle();
    suppressLegacyHero();

    const url=await loadPhoto();
    if(!url)return false;

    let changed=false;
    document.querySelectorAll('#ms8210Start .ms8280-photo').forEach(img=>{
      if(img.src!==url){img.src=url; changed=true;}
    });

    suppressLegacyHero();
    return changed || !!document.querySelector('#ms8210Start .ms8280-photo');
  }

  function observeStart(){
    const root=document.getElementById('ms8210Start');
    if(root&&!rootObserver){
      rootObserver=new MutationObserver(()=>{void applyPhoto();});
      rootObserver.observe(root,{childList:true,subtree:true});
    }

    const dashboard=document.getElementById('dashboard');
    if(dashboard&&!dashboardObserver){
      dashboardObserver=new MutationObserver(()=>{suppressLegacyHero();});
      dashboardObserver.observe(dashboard,{childList:true,subtree:true});
    }
  }

  async function boot(){
    syncBuild();
    installStyle();
    await loadPrior();

    for(let i=0;i<100;i++){
      if(await applyPhoto())break;
      await new Promise(r=>setTimeout(r,100));
    }

    suppressLegacyHero();
    observeStart();

    [300,900,1800,4000,8000].forEach(ms=>setTimeout(()=>{void applyPhoto();},ms));

    [
      'mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:start-requested',
      'mijnserenity:routechange','pageshow'
    ].forEach(type=>window.addEventListener(type,()=>requestAnimationFrame(()=>{
      suppressLegacyHero();
      observeStart();
    }),{passive:true}));

    console.info('MijnSerenity 8.28.2: nieuwe Serenity-header actief; dubbele legacy-hero uitgeschakeld.');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();