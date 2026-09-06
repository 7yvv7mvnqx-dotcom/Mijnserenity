/* MijnSerenity 8.25.6 — vaste Startknop, rustige iPhone-polish en stabiele welkomsttekst */
(()=>{
  'use strict';
  if(window.__msPolish8256)return;
  window.__msPolish8256=true;

  const BUILD='8.25.6';
  const BASE='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@a6b4bf5c344ed71eacf452b7e4fe68ffb2ce1ac5/start-dashboard-71510.js';
  const STYLE_ID='ms8256PolishStyle';
  const FALLBACK_ID='ms8256GlobalStart';
  const WELCOME='Klaar om te gaan varen?';

  let routeObserver=null;
  let observedSections=[];
  let welcomeObserver=null;
  let welcomeNode=null;
  let queued=false;
  let lastRoute='dashboard';

  const clean=value=>String(value??'').trim().toLowerCase();

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const settings=document.getElementById('settingsAppVersion');
    if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
  }

  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      /* 8.25.6 — kleine visuele correcties zonder de goedgekeurde dag/nacht-stijl om te gooien. */
      #ms8210Start,.ms8234-header,.ms8234-status,.ms8234-hero,.ms8234-feature{box-sizing:border-box!important}
      #ms8210Start .ms8234-status-copy,
      #ms8210Start .ms8234-live-copy,
      #ms8210Start .ms8234-feature-copy,
      #ms8210Start .ms8234-attention-copy{min-width:0!important}
      #ms8210Start .ms8234-status-copy strong,
      #ms8210Start .ms8245-status-sub{
        display:block!important;
        max-width:100%!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        white-space:nowrap!important;
      }
      #ms8210Start .ms8234-live-metric{min-width:0!important}
      #ms8210Start .ms8234-live-copy strong{
        display:block!important;
        max-width:100%!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        white-space:nowrap!important;
        font-size:clamp(13px,3.8vw,17px)!important;
      }

      /* Op iedere echte subpagina is de onderste balk altijd één duidelijke Startknop. */
      body.ms8256-start-page .bottom-nav{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
      body.ms8256-sub-page #appView{padding-bottom:calc(82px + env(safe-area-inset-bottom))!important}
      body.ms8256-sub-page .bottom-nav{
        position:fixed!important;
        left:0!important;right:0!important;bottom:0!important;top:auto!important;
        z-index:2147483000!important;
        display:flex!important;
        visibility:visible!important;
        opacity:1!important;
        pointer-events:auto!important;
        transform:none!important;
        width:100%!important;
        max-width:none!important;
        min-height:calc(70px + env(safe-area-inset-bottom))!important;
        padding:0 10px env(safe-area-inset-bottom)!important;
        margin:0!important;
        overflow:visible!important;
        border:0!important;
        border-top:1px solid rgba(102,216,249,.22)!important;
        border-radius:0!important;
        background:rgba(2,14,24,.96)!important;
        box-shadow:0 -10px 30px rgba(0,0,0,.28)!important;
        backdrop-filter:blur(20px) saturate(135%)!important;
        -webkit-backdrop-filter:blur(20px) saturate(135%)!important;
      }
      html[data-ms-daynight="day"] body.ms8256-sub-page .bottom-nav{
        border-top-color:rgba(35,130,174,.18)!important;
        background:rgba(244,252,255,.96)!important;
        box-shadow:0 -10px 28px rgba(26,75,103,.13)!important;
      }
      body.ms8256-sub-page .bottom-nav .bottom-nav-item{display:none!important}
      body.ms8256-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"]{
        display:flex!important;
        flex:1 1 100%!important;
        align-items:center!important;
        justify-content:center!important;
        gap:11px!important;
        width:100%!important;
        max-width:none!important;
        min-height:56px!important;
        margin:7px 0!important;
        padding:8px 18px!important;
        border:1px solid rgba(88,213,249,.30)!important;
        border-radius:18px!important;
        background:linear-gradient(105deg,rgba(7,112,157,.94),rgba(8,165,210,.94))!important;
        color:#fff!important;
        box-shadow:0 8px 22px rgba(0,121,168,.22)!important;
      }
      html[data-ms-daynight="day"] body.ms8256-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"]{
        border-color:rgba(0,145,203,.25)!important;
        background:linear-gradient(105deg,#078fd1,#18c5e8)!important;
        color:#fff!important;
      }
      body.ms8256-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"] .ms8219-home-copy{display:none!important}
      body.ms8256-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"] .ms8256-start-copy{
        display:grid!important;
        gap:1px!important;
        text-align:left!important;
        line-height:1.05!important;
      }
      body.ms8256-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"] .ms8256-start-copy strong{
        display:block!important;color:#fff!important;font-size:17px!important;line-height:1.05!important;font-weight:900!important;letter-spacing:-.02em!important
      }
      body.ms8256-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"] .ms8256-start-copy small{
        display:block!important;color:rgba(255,255,255,.78)!important;font-size:10px!important;line-height:1.05!important;font-weight:700!important
      }

      #${FALLBACK_ID}{
        position:fixed!important;
        left:12px!important;right:12px!important;bottom:calc(10px + env(safe-area-inset-bottom))!important;
        z-index:2147483001!important;
        display:flex!important;align-items:center!important;justify-content:center!important;gap:9px!important;
        min-height:56px!important;padding:10px 18px!important;
        border:1px solid rgba(89,218,250,.32)!important;border-radius:18px!important;
        background:linear-gradient(105deg,#087fae,#0bb7dc)!important;color:#fff!important;
        font:900 17px/1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;
        box-shadow:0 12px 30px rgba(0,0,0,.30)!important;
      }
      #${FALLBACK_ID}[hidden]{display:none!important}

      @media(max-width:620px){
        #ms8210Start .ms8234-header{
          position:relative!important;
          min-width:0!important;
          padding-left:12px!important;
          padding-right:12px!important;
        }
        #ms8210Start .ms8234-brand{
          width:52%!important;
          max-width:52%!important;
          min-width:0!important;
        }
        #ms8210Start .ms8254-tagline{
          display:block!important;
          width:100%!important;
          max-width:126px!important;
          white-space:normal!important;
          line-height:1.38!important;
          letter-spacing:.16em!important;
        }
        #ms8210Start .ms8234-attention{
          left:auto!important;
          right:8px!important;
          top:14px!important;
          width:44%!important;
          max-width:184px!important;
          min-width:0!important;
          box-sizing:border-box!important;
        }
        #ms8210Start .ms8234-attention-copy strong{font-size:11px!important;line-height:1.05!important}
        #ms8210Start .ms8234-attention-copy small{font-size:9px!important;line-height:1.1!important}
        #ms8210Start .ms8234-status-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
        #ms8210Start .ms8234-status{min-width:0!important;overflow:hidden!important}
        #ms8210Start .ms8234-status-copy strong{font-size:clamp(12px,3.7vw,15px)!important}
        #ms8210Start .ms8245-status-sub{font-size:9px!important}
        #ms8210Start .ms8234-live-metrics{grid-template-columns:repeat(3,minmax(0,1fr))!important}
        body.ms8256-sub-page .bottom-nav{padding-left:8px!important;padding-right:8px!important}
      }

      @media(max-width:390px){
        #ms8210Start .ms8234-brand{width:50%!important;max-width:50%!important}
        #ms8210Start .ms8254-tagline{max-width:112px!important;font-size:6px!important;letter-spacing:.13em!important}
        #ms8210Start .ms8234-attention{width:45%!important;padding-left:9px!important;padding-right:9px!important}
        #ms8210Start .ms8234-attention-copy strong{font-size:10.5px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function appVisible(){
    const app=document.getElementById('appView');
    return Boolean(app&&!app.classList.contains('hidden')&&app.getAttribute('aria-hidden')!=='true');
  }

  function activeRoute(){
    const app=document.getElementById('appView');
    if(!app)return 'dashboard';
    const sections=[...app.children].filter(node=>node.matches?.('section[id]'));
    const visible=sections.find(node=>!node.classList.contains('hidden')&&node.getAttribute('aria-hidden')!=='true');
    return clean(visible?.id)||'dashboard';
  }

  function routeFromEvent(event){
    const detail=event?.detail;
    const value=typeof detail==='string'?detail:(detail?.route||detail?.id||detail?.target||'');
    return clean(value);
  }

  function manualStart(){
    const app=document.getElementById('appView');
    if(!app)return;
    [...app.children].forEach(section=>{
      if(!section.matches?.('section[id]'))return;
      const isStart=section.id==='dashboard';
      section.classList.toggle('hidden',!isStart);
      section.setAttribute('aria-hidden',isStart?'false':'true');
    });
    document.querySelectorAll('.bottom-nav .bottom-nav-item').forEach(item=>{
      item.classList.toggle('active',item.dataset.target==='dashboard');
    });
  }

  function goStart(event){
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const home=document.querySelector('.bottom-nav .bottom-nav-item[data-target="dashboard"]');
    let navigated=false;
    if(typeof window.captainNavigate==='function'){
      try{
        window.captainNavigate('dashboard',home||null);
        navigated=true;
      }catch(error){
        console.warn('Startnavigatie hersteld via fallback:',error);
      }
    }
    if(!navigated)manualStart();
    lastRoute='dashboard';
    syncRoute('dashboard');
    try{window.scrollTo({top:0,left:0,behavior:'smooth'})}catch{window.scrollTo(0,0)}
    window.dispatchEvent(new CustomEvent('mijnserenity:start-requested',{detail:{route:'dashboard'}}));
  }

  function ensureFallback(show){
    let button=document.getElementById(FALLBACK_ID);
    if(!button){
      button=document.createElement('button');
      button.id=FALLBACK_ID;
      button.type='button';
      button.innerHTML='<span aria-hidden="true">⌂</span><span>Start</span>';
      button.setAttribute('aria-label','Terug naar Start');
      button.addEventListener('click',goStart);
      document.body?.appendChild(button);
    }
    if(button)button.hidden=!show;
  }

  function ensureHomeButton(onSubPage){
    const nav=document.querySelector('.bottom-nav');
    const home=nav?.querySelector('.bottom-nav-item[data-target="dashboard"]');
    if(!nav||!home){
      ensureFallback(Boolean(onSubPage));
      return;
    }
    ensureFallback(false);
    home.hidden=false;
    home.removeAttribute('aria-hidden');
    home.setAttribute('aria-label','Start');
    home.setAttribute('title','Start');
    if(home.dataset.ms8256Bound!=='1'){
      home.dataset.ms8256Bound='1';
      home.onclick=goStart;
    }
    let copy=home.querySelector('.ms8256-start-copy');
    if(!copy){
      copy=document.createElement('span');
      copy.className='ms8256-start-copy';
      copy.innerHTML='<strong>Start</strong><small>Terug naar startscherm</small>';
      home.appendChild(copy);
    }
  }

  function syncRoute(preferred=''){
    syncBuild();
    const body=document.body;
    if(!body)return;
    if(!appVisible()){
      body.classList.remove('ms8256-start-page','ms8256-sub-page');
      ensureFallback(false);
      return;
    }
    let route=clean(preferred);
    if(!route||route==='more')route=activeRoute();
    if(!route)route=lastRoute||'dashboard';
    lastRoute=route;
    const onSub=route!=='dashboard';
    body.classList.toggle('ms8256-start-page',!onSub);
    body.classList.toggle('ms8256-sub-page',onSub);
    ensureHomeButton(onSub);
  }

  function enforceWelcome(){
    syncBuild();
    const root=document.getElementById('ms8210Start');
    const heading=root?.querySelector('.ms8234-hero h2');
    if(!heading)return false;
    if(heading.textContent!==WELCOME)heading.textContent=WELCOME;
    if(heading!==welcomeNode){
      welcomeObserver?.disconnect();
      welcomeNode=heading;
      welcomeObserver=new MutationObserver(()=>{
        if(heading.textContent!==WELCOME)heading.textContent=WELCOME;
      });
      welcomeObserver.observe(heading,{subtree:true,childList:true,characterData:true});
    }
    return true;
  }

  function watchRoutes(){
    if(routeObserver)return;
    const app=document.getElementById('appView');
    if(!app)return;
    routeObserver=new MutationObserver(queueSync);
    observedSections=[app,...[...app.children].filter(node=>node.matches?.('section[id]'))];
    observedSections.forEach(node=>routeObserver.observe(node,{attributes:true,attributeFilter:['class','aria-hidden']}));
  }

  function queueSync(event){
    const route=event?.type==='mijnserenity:routechange'?routeFromEvent(event):'';
    if(route)lastRoute=route;
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      installStyle();
      enforceWelcome();
      watchRoutes();
      syncRoute(route||'');
    });
  }

  function startEnhancements(){
    installStyle();
    enforceWelcome();
    watchRoutes();
    syncRoute();

    ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:profile-ready','mijnserenity:auth-ready','mijnserenity:theme-changed','pageshow','online']
      .forEach(type=>window.addEventListener(type,queueSync,{passive:true}));
    window.addEventListener('mijnserenity:routechange',queueSync,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)queueSync()},{passive:true});

    [0,250,800,1700,3500,7000].forEach(ms=>setTimeout(queueSync,ms));
    console.info(`MijnSerenity ${BUILD}: welkomsttekst, Startknop en mobiele polish actief.`);
  }

  function loadBase(){
    if(window.__msReferenceDashboard8254){
      startEnhancements();
      return;
    }
    const script=document.createElement('script');
    script.src=BASE;
    script.async=false;
    script.crossOrigin='anonymous';
    script.onload=startEnhancements;
    script.onerror=()=>{
      console.error('MijnSerenity 8.25.4 basis kon niet worden geladen.');
      startEnhancements();
    };
    document.head.appendChild(script);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadBase,{once:true});
  else loadBase();
})();
