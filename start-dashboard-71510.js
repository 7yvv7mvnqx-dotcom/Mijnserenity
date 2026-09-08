/* MijnSerenity 8.28.4 — Meer terug op Start + zichtbare live versie. */
(()=>{
  'use strict';
  if(window.__ms8284StartFix)return;
  window.__ms8284StartFix=true;

  const BUILD='8.28.4';
  const PRIOR='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@0261da95450099f9fef74f16b8ba20acd0f9e507/start-dashboard-71510.js?v=828400';
  const PARTS=Array.from({length:13},(_,i)=>`/assets/serenity-hero-8281-${String(i+1).padStart(2,'0')}.txt?v=828401`);
  const ACTIVE_CLASS='ms8284-modern-start-active';
  const HIDDEN_ATTR='data-ms8284-legacy-hidden';
  const CONTROLS_ID='ms8284ReleaseControls';
  let imageUrl='';
  let imagePromise=null;
  let rootObserver=null;
  let dashboardObserver=null;
  let appObserver=null;

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const version=document.getElementById('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
    const badge=document.querySelector(`#${CONTROLS_ID} .ms8284-version`);
    if(badge)badge.textContent=`v${BUILD}`;
  }

  function appVisible(){
    const app=document.getElementById('appView');
    return Boolean(app&&!app.classList.contains('hidden'));
  }

  function dashboardVisible(){
    if(!appVisible())return false;
    const dashboard=document.getElementById('dashboard');
    if(!dashboard||dashboard.classList.contains('hidden')||dashboard.getAttribute('aria-hidden')==='true')return false;
    try{return getComputedStyle(dashboard).display!=='none'&&getComputedStyle(dashboard).visibility!=='hidden';}
    catch{return true;}
  }

  function openMore(){
    try{
      if(typeof window.ms797OpenMore==='function'){
        window.ms797OpenMore();
        return;
      }
      const legacy=document.querySelector('#ms71510Dashboard .ms71510-more,.ms71510-more');
      if(legacy){
        legacy.click();
        return;
      }
      console.warn('MijnSerenity: Meer-menu is nog niet beschikbaar.');
    }catch(error){
      console.warn('MijnSerenity: Meer-menu openen mislukt.',error);
    }
  }

  function ensureReleaseControls(){
    let controls=document.getElementById(CONTROLS_ID);
    if(!controls){
      controls=document.createElement('div');
      controls.id=CONTROLS_ID;
      controls.setAttribute('aria-label','MijnSerenity versie en menu');
      controls.innerHTML=`
        <span class="ms8284-version" aria-label="MijnSerenity versie ${BUILD}">v${BUILD}</span>
        <button type="button" class="ms8284-more" aria-label="Meer opties openen"><span aria-hidden="true">☰</span><strong>Meer</strong></button>`;
      (document.body||document.documentElement).appendChild(controls);
      controls.querySelector('.ms8284-more')?.addEventListener('click',openMore);
    }
    syncReleaseControls();
    return controls;
  }

  function syncReleaseControls(){
    const controls=document.getElementById(CONTROLS_ID);
    if(!controls)return;
    const showApp=appVisible();
    const showMore=dashboardVisible();
    controls.classList.toggle('is-app-visible',showApp);
    controls.classList.toggle('is-dashboard-visible',showMore);
    controls.setAttribute('aria-hidden',showApp?'false':'true');
    const more=controls.querySelector('.ms8284-more');
    if(more)more.hidden=!showMore;
  }

  function loadPrior(){
    if(window.__ms8280Header)return Promise.resolve();
    return new Promise(resolve=>{
      let s=document.querySelector('script[data-ms8284-prior],script[data-ms8282-prior],script[data-ms8281-prior]');
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
      s.dataset.ms8284Prior='1';
      s.onload=resolve;
      s.onerror=()=>{console.error('MijnSerenity 8.28.4: headerbasis kon niet laden.'); resolve();};
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
    let style=document.getElementById('ms8284StartFixStyle');
    if(!style){
      style=document.createElement('style');
      style.id='ms8284StartFixStyle';
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

      /* Alleen de échte oude dashboard-hero verdwijnt; de moderne Start blijft staan. */
      #dashboard.${ACTIVE_CLASS} .ms71514-hero{
        display:none!important;
        visibility:hidden!important;
      }

      /* Versie linksboven en Meer rechtsboven blijven op iPhone/PWA altijd bereikbaar. */
      #${CONTROLS_ID}{
        position:fixed!important;
        z-index:2147483200!important;
        top:calc(env(safe-area-inset-top,0px) + 7px)!important;
        left:max(10px,env(safe-area-inset-left,0px))!important;
        right:max(10px,env(safe-area-inset-right,0px))!important;
        display:none!important;
        align-items:center!important;
        justify-content:space-between!important;
        gap:10px!important;
        pointer-events:none!important;
        font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif!important;
      }
      #${CONTROLS_ID}.is-app-visible{display:flex!important}
      #${CONTROLS_ID} .ms8284-version{
        pointer-events:auto!important;
        display:inline-flex!important;
        align-items:center!important;
        min-height:28px!important;
        padding:5px 9px!important;
        border:1px solid rgba(102,220,255,.26)!important;
        border-radius:999px!important;
        background:rgba(2,22,35,.80)!important;
        color:#98e7ff!important;
        box-shadow:0 6px 18px rgba(0,0,0,.24)!important;
        -webkit-backdrop-filter:blur(14px) saturate(130%)!important;
        backdrop-filter:blur(14px) saturate(130%)!important;
        font-size:11px!important;
        line-height:1!important;
        font-weight:850!important;
        letter-spacing:.035em!important;
      }
      #${CONTROLS_ID} .ms8284-more{
        pointer-events:auto!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        gap:7px!important;
        min-height:38px!important;
        padding:8px 12px!important;
        margin:0!important;
        border:1px solid rgba(102,220,255,.30)!important;
        border-radius:14px!important;
        background:rgba(2,27,43,.90)!important;
        color:#fff!important;
        box-shadow:0 7px 20px rgba(0,0,0,.28)!important;
        -webkit-backdrop-filter:blur(14px) saturate(130%)!important;
        backdrop-filter:blur(14px) saturate(130%)!important;
        font-size:13px!important;
        line-height:1!important;
        font-weight:850!important;
      }
      #${CONTROLS_ID} .ms8284-more[hidden]{display:none!important}
      #${CONTROLS_ID} .ms8284-more span{font-size:16px!important;line-height:1!important}
      #${CONTROLS_ID} .ms8284-more:active{transform:scale(.97)!important}

      @media(max-width:760px){
        #ms8210Start .ms8280-photo{object-position:66% 54%!important}
      }
      @media(min-width:761px){
        #${CONTROLS_ID}{top:12px!important;left:14px!important;right:14px!important}
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
    ensureReleaseControls();
    suppressLegacyHero();

    const url=await loadPhoto();
    if(!url)return false;

    let changed=false;
    document.querySelectorAll('#ms8210Start .ms8280-photo').forEach(img=>{
      if(img.src!==url){img.src=url; changed=true;}
    });

    suppressLegacyHero();
    syncReleaseControls();
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
      dashboardObserver=new MutationObserver(()=>{
        suppressLegacyHero();
        syncReleaseControls();
      });
      dashboardObserver.observe(dashboard,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-hidden']});
    }

    const app=document.getElementById('appView');
    if(app&&!appObserver){
      appObserver=new MutationObserver(syncReleaseControls);
      appObserver.observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-hidden']});
    }
  }

  async function boot(){
    syncBuild();
    installStyle();
    ensureReleaseControls();
    await loadPrior();

    for(let i=0;i<100;i++){
      if(await applyPhoto())break;
      await new Promise(r=>setTimeout(r,100));
    }

    suppressLegacyHero();
    observeStart();
    syncReleaseControls();

    [300,900,1800,4000,8000].forEach(ms=>setTimeout(()=>{void applyPhoto();},ms));

    [
      'mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:start-requested',
      'mijnserenity:routechange','pageshow','focus'
    ].forEach(type=>window.addEventListener(type,()=>requestAnimationFrame(()=>{
      suppressLegacyHero();
      observeStart();
      ensureReleaseControls();
      syncReleaseControls();
    }),{passive:true}));

    console.info('MijnSerenity 8.28.4: Meer terug op Start en live versie linksboven zichtbaar.');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();