/* MijnSerenity 8.28.7 — iPad/Safari hero-, navigatie- en layoutfix. */
(()=>{
  'use strict';
  if(window.__ms8287StartFix)return;
  window.__ms8287StartFix=true;

  const BUILD='8.28.7';
  const PRIOR='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@0261da95450099f9fef74f16b8ba20acd0f9e507/start-dashboard-71510.js?v=828700';
  const PHOTO='/assets/serenity-hero-8275.jpg?v=828700';
  const PHOTO_FALLBACK='/assets/serenity-hero-8274.jpg?v=828700';
  const STYLE_ID='ms8287StartFixStyle';
  const CONTROLS_ID='ms8287ReleaseControls';
  const HIDDEN_ATTR='data-ms8287-hidden';

  let appObserver=null;
  let dashboardObserver=null;
  let rootObserver=null;
  let initialising=false;
  let initialised=false;
  let scheduled=false;

  const norm=value=>String(value||'').replace(/\s+/g,' ').trim();

  function appVisible(){
    const app=document.getElementById('appView');
    return !!(app&&!app.classList.contains('hidden')&&app.getAttribute('aria-hidden')!=='true');
  }

  function dashboardVisible(){
    if(!appVisible())return false;
    const dashboard=document.getElementById('dashboard');
    if(!dashboard||dashboard.classList.contains('hidden')||dashboard.getAttribute('aria-hidden')==='true')return false;
    try{
      const style=getComputedStyle(dashboard);
      return style.display!=='none'&&style.visibility!=='hidden';
    }catch{return true;}
  }

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const settings=document.getElementById('settingsAppVersion');
    if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);

    document.querySelectorAll('span,small,strong,em,b').forEach(node=>{
      const text=norm(node.textContent);
      if(text==='7.18.13'||text==='8.28.6'){
        const cls=String(node.className||'').toLowerCase();
        if(text==='7.18.13'||cls.includes('version')||cls.includes('build'))node.textContent=BUILD;
      }
    });
  }

  function openMore(){
    try{
      if(typeof window.ms797OpenMore==='function')return window.ms797OpenMore();
      const more=document.querySelector('#ms71510Dashboard .ms71510-more,.ms71510-more,[data-ms-more]');
      if(more)return more.click();
    }catch(error){console.warn('MijnSerenity: Meer openen mislukt.',error);}
  }

  function ensureControls(){
    document.getElementById('ms8286ReleaseControls')?.remove();
    document.getElementById('ms8285ReleaseControls')?.remove();
    let controls=document.getElementById(CONTROLS_ID);
    if(!controls){
      controls=document.createElement('div');
      controls.id=CONTROLS_ID;
      controls.setAttribute('aria-label','MijnSerenity versie en menu');
      controls.innerHTML=`<span class="ms8287-version">v${BUILD}</span><button type="button" class="ms8287-more" aria-label="Meer opties openen"><span aria-hidden="true">☰</span><strong>Meer</strong></button>`;
      document.body.appendChild(controls);
      controls.querySelector('.ms8287-more')?.addEventListener('click',openMore);
    }
    syncControls();
    return controls;
  }

  function syncControls(){
    const controls=document.getElementById(CONTROLS_ID);
    if(!controls)return;
    const show=dashboardVisible();
    controls.classList.toggle('is-visible',show);
    controls.setAttribute('aria-hidden',show?'false':'true');
  }

  function installStyle(){
    document.getElementById('ms8286StartFixStyle')?.remove();
    document.getElementById('ms8285StartFixStyle')?.remove();
    let style=document.getElementById(STYLE_ID);
    if(!style){
      style=document.createElement('style');
      style.id=STYLE_ID;
    }
    style.textContent=`
      [${HIDDEN_ATTR}]{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important;pointer-events:none!important}

      #ms8210Start .ms8280-header{
        position:relative!important;
        isolation:isolate!important;
        display:flex!important;
        visibility:visible!important;
        opacity:1!important;
        overflow:hidden!important;
        min-height:clamp(420px,48vw,610px)!important;
        padding:clamp(22px,2.8vw,34px)!important;
        background:#031522!important;
      }
      #ms8210Start .ms8280-photo{
        position:absolute!important;
        inset:0!important;
        z-index:0!important;
        display:block!important;
        visibility:visible!important;
        opacity:1!important;
        width:100%!important;
        height:100%!important;
        object-fit:cover!important;
        object-position:58% 52%!important;
        filter:none!important;
      }
      #ms8210Start .ms8280-overlay{
        position:absolute!important;
        inset:0!important;
        z-index:1!important;
        display:block!important;
        visibility:visible!important;
        opacity:1!important;
        background:
          linear-gradient(90deg,rgba(1,14,24,.86) 0%,rgba(1,14,24,.66) 31%,rgba(1,14,24,.28) 58%,rgba(1,14,24,.07) 82%,rgba(1,14,24,.02) 100%),
          linear-gradient(0deg,rgba(1,12,20,.64) 0%,rgba(1,12,20,.10) 50%,rgba(1,12,20,.02) 75%)!important;
      }
      #ms8210Start .ms8280-topbar,
      #ms8210Start .ms8280-content{position:relative!important;z-index:3!important}
      #ms8210Start .ms8280-topbar{display:grid!important;visibility:visible!important;opacity:1!important;min-height:86px!important}
      #ms8210Start .ms8280-brand{display:block!important;visibility:visible!important;opacity:1!important;min-width:0!important}
      #ms8210Start .ms8280-brand-title{
        display:block!important;visibility:visible!important;opacity:1!important;
        color:#2bcdf4!important;font-size:clamp(48px,5.4vw,72px)!important;
        text-shadow:0 3px 18px rgba(0,0,0,.55)!important
      }
      #ms8210Start .ms8280-brand-tagline{display:block!important;visibility:visible!important;opacity:1!important;color:#fff!important}
      #ms8210Start .ms8280-content{width:min(650px,64%)!important;margin-top:clamp(34px,4.2vw,60px)!important}
      #ms8210Start .ms8280-title{font-size:clamp(44px,4.8vw,62px)!important}
      #ms8210Start .ms8280-subtitle{margin:12px 0 16px!important}
      #ms8210Start .ms8280-live-button{min-height:58px!important}
      #ms8210Start .ms8280-status-grid{margin-top:12px!important}

      body.ms8287-dashboard-active nav.bottom-nav,
      body.ms8287-dashboard-active .bottom-nav.ms8214-nav{display:none!important;visibility:hidden!important;pointer-events:none!important}

      body.ms8287-subpage-active nav.bottom-nav,
      body.ms8287-subpage-active .bottom-nav.ms8214-nav{
        height:calc(54px + env(safe-area-inset-bottom))!important;
        min-height:calc(54px + env(safe-area-inset-bottom))!important;
        padding-bottom:env(safe-area-inset-bottom)!important;
      }
      body.ms8287-subpage-active .bottom-nav .bottom-nav-item[data-target="dashboard"]{
        height:54px!important;min-height:54px!important;padding-top:5px!important;padding-bottom:5px!important
      }
      body.ms8287-subpage-active .bottom-nav .bottom-nav-item[data-target="dashboard"] .ms8219-home-logo{width:34px!important;height:34px!important;flex-basis:34px!important}
      body.ms8287-subpage-active .bottom-nav .bottom-nav-item[data-target="dashboard"] .ms8219-home-copy strong{font-size:14px!important}
      body.ms8287-subpage-active .bottom-nav .bottom-nav-item[data-target="dashboard"] .ms8219-home-copy small{display:none!important}
      body.ms8287-subpage-active #appView{padding-bottom:calc(62px + env(safe-area-inset-bottom))!important}

      #${CONTROLS_ID}{
        position:fixed!important;z-index:2147483200!important;
        top:calc(env(safe-area-inset-top,0px) + 10px)!important;
        right:max(12px,env(safe-area-inset-right,0px))!important;
        left:auto!important;display:none!important;align-items:center!important;justify-content:flex-end!important;gap:8px!important;
        pointer-events:none!important;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif!important
      }
      #${CONTROLS_ID}.is-visible{display:flex!important}
      #${CONTROLS_ID} .ms8287-version{pointer-events:auto!important;display:inline-flex!important;align-items:center!important;min-height:30px!important;padding:6px 10px!important;border:1px solid rgba(102,220,255,.28)!important;border-radius:999px!important;background:rgba(2,22,35,.84)!important;color:#98e7ff!important;box-shadow:0 6px 18px rgba(0,0,0,.24)!important;-webkit-backdrop-filter:blur(14px)!important;backdrop-filter:blur(14px)!important;font-size:11px!important;line-height:1!important;font-weight:850!important}
      #${CONTROLS_ID} .ms8287-more{pointer-events:auto!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;min-height:40px!important;padding:8px 12px!important;margin:0!important;border:1px solid rgba(102,220,255,.30)!important;border-radius:14px!important;background:rgba(2,27,43,.92)!important;color:#fff!important;box-shadow:0 7px 20px rgba(0,0,0,.28)!important;font-size:13px!important;line-height:1!important;font-weight:850!important}
      #${CONTROLS_ID} .ms8287-more span{font-size:16px!important}

      @media(max-width:760px){
        #ms8210Start .ms8280-header{min-height:430px!important}
        #ms8210Start .ms8280-photo{object-position:64% 52%!important}
        #ms8210Start .ms8280-content{width:72%!important}
      }
      @media(max-width:620px) and (orientation:portrait){
        #ms8210Start .ms8280-header{min-height:470px!important;padding:18px 16px 20px!important}
        #ms8210Start .ms8280-photo{object-position:68% 52%!important}
        #ms8210Start .ms8280-topbar{min-height:78px!important}
        #ms8210Start .ms8280-brand-title{font-size:46px!important}
        #ms8210Start .ms8280-content{width:100%!important;margin-top:clamp(48px,14vw,78px)!important}
        #ms8210Start .ms8280-title{font-size:clamp(39px,11vw,49px)!important}
        #${CONTROLS_ID} .ms8287-version{display:none!important}
      }
    `;

    if(style.parentNode)style.parentNode.removeChild(style);
    (document.head||document.documentElement).appendChild(style);
  }

  function loadPrior(){
    if(window.__ms8280Header)return Promise.resolve();
    return new Promise(resolve=>{
      let script=document.querySelector('script[data-ms8287-prior]');
      if(script){
        if(window.__ms8280Header)return resolve();
        script.addEventListener('load',resolve,{once:true});
        script.addEventListener('error',resolve,{once:true});
        setTimeout(resolve,7000);
        return;
      }
      script=document.createElement('script');
      script.src=PRIOR;
      script.async=false;
      script.crossOrigin='anonymous';
      script.dataset.ms8287Prior='1';
      script.onload=resolve;
      script.onerror=()=>{console.error('MijnSerenity 8.28.7: basisheader kon niet laden.');resolve();};
      (document.head||document.documentElement).appendChild(script);
      setTimeout(resolve,7000);
    });
  }

  function hideNode(node){
    if(!node||node.id==='dashboard'||node.id==='ms8210Start')return false;
    node.setAttribute(HIDDEN_ATTR,'1');
    node.hidden=true;
    node.setAttribute('aria-hidden','true');
    return true;
  }

  function looksLikeStartHero(node){
    if(!node)return false;
    const text=norm(node.textContent).toLowerCase();
    return text.includes('klaar om te gaan varen')||text.includes('start live varen');
  }

  function suppressDuplicateHeroes(){
    const dashboard=document.getElementById('dashboard');
    const root=document.getElementById('ms8210Start');
    if(!dashboard||!root)return false;

    const moderns=[...root.querySelectorAll('.ms8280-header')];
    const keep=moderns[0]||null;
    if(!keep)return false;

    moderns.slice(1).forEach(hideNode);

    const candidates=[...dashboard.querySelectorAll('.ms8234-header,.ms8210-header,.ms71514-hero,.ms71510-hero,.ms71510-start-hero,.dashboard-hero,.start-hero')];
    candidates.forEach(node=>{
      if(node===keep||node.contains(keep)||keep.contains(node))return;
      hideNode(node);
    });

    [...dashboard.querySelectorAll('h1,h2,h3,[role="heading"]')].forEach(heading=>{
      if(keep.contains(heading))return;
      const text=norm(heading.textContent).toLowerCase();
      if(!text.includes('klaar om te gaan varen'))return;
      let node=heading.closest('header,.hero,[class*="hero"],.card');
      if(!node||node===dashboard||node===root)node=heading.parentElement;
      if(node&&node!==dashboard&&node!==root&&looksLikeStartHero(node))hideNode(node);
    });

    return true;
  }

  function ensureHeroPhoto(){
    const hero=document.querySelector('#ms8210Start .ms8280-header');
    if(!hero)return false;
    let photo=hero.querySelector('.ms8280-photo');
    if(!photo){
      photo=document.createElement('img');
      photo.className='ms8280-photo';
      photo.alt='';
      photo.setAttribute('aria-hidden','true');
      hero.prepend(photo);
    }
    if(!photo.getAttribute('src')||!photo.getAttribute('src').includes('serenity-hero-8275.jpg'))photo.src=PHOTO;
    photo.hidden=false;
    photo.removeAttribute('hidden');
    photo.setAttribute('aria-hidden','true');
    photo.onerror=()=>{
      if(!photo.src.includes('serenity-hero-8274.jpg'))photo.src=PHOTO_FALLBACK;
    };
    hero.dataset.msHeroBuild='8287';
    return true;
  }

  function syncLayoutState(){
    const body=document.body;
    if(!body)return;
    const onStart=dashboardVisible();
    body.classList.toggle('ms8287-dashboard-active',onStart);
    body.classList.toggle('ms8287-subpage-active',appVisible()&&!onStart);
    if(onStart){
      body.classList.add('ms8219-start-page');
      body.classList.remove('ms8219-sub-page');
    }
  }

  function applyFixes(){
    if(!appVisible())return false;
    syncBuild();
    syncLayoutState();
    installStyle();
    ensureControls();
    const photoOk=ensureHeroPhoto();
    suppressDuplicateHeroes();
    syncControls();
    return photoOk;
  }

  function scheduleApply(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      applyFixes();
    });
  }

  function observe(){
    const root=document.getElementById('ms8210Start');
    if(root&&!rootObserver){
      rootObserver=new MutationObserver(scheduleApply);
      rootObserver.observe(root,{childList:true,subtree:true});
    }
    const dashboard=document.getElementById('dashboard');
    if(dashboard&&!dashboardObserver){
      dashboardObserver=new MutationObserver(scheduleApply);
      dashboardObserver.observe(dashboard,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-hidden']});
    }
    const app=document.getElementById('appView');
    if(app&&!appObserver){
      appObserver=new MutationObserver(()=>{
        syncLayoutState();
        syncControls();
        if(appVisible()){
          void initialise();
          scheduleApply();
        }
      });
      appObserver.observe(app,{attributes:true,attributeFilter:['class','aria-hidden']});
    }
  }

  async function initialise(){
    if(initialised||initialising||!appVisible())return;
    initialising=true;
    try{
      ensureControls();
      await loadPrior();
      installStyle();
      for(let i=0;i<80;i++){
        if(applyFixes())break;
        await new Promise(resolve=>setTimeout(resolve,100));
      }
      observe();
      [250,700,1500,3000,6000].forEach(ms=>setTimeout(scheduleApply,ms));
      initialised=true;
      console.info('MijnSerenity 8.28.7: Serenity-foto, enkele hero en nette navigatie actief.');
    }finally{
      initialising=false;
    }
  }

  function boot(){
    syncBuild();
    syncLayoutState();
    installStyle();
    observe();
    if(appVisible())void initialise();
    ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:start-requested','mijnserenity:routechange','pageshow','focus','orientationchange']
      .forEach(type=>window.addEventListener(type,()=>{
        syncLayoutState();
        if(appVisible()){
          void initialise();
          scheduleApply();
        }
      },{passive:true}));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();