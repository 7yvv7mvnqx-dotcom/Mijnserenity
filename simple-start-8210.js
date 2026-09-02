/* MijnSerenity 8.22.0 — rustige Start + duidelijke paginakop en Thuisknop */
(()=>{
  'use strict';

  const BUILD='8.22.0';
  const ROOT_ID='ms8210Start';
  const PAGE_TITLE_CLASS='ms8219-page-title';
  const $=id=>document.getElementById(id);
  let observer=null;
  let enforcing=false;

  const ROUTE_LABELS={
    dashboard:'Start',
    live:'Varen',
    ais:'AIS',
    weather:'Weer',
    rws:'Rijkswaterstaat',
    map:'Kaart',
    planner:'Route',
    route:'Route',
    entertainment:'Home Assistant',
    technical:'Techniek',
    pois:"POI's",
    logbook:'Logboek',
    costs:'Kosten',
    finance:'Financieel',
    financial:'Financieel',
    settings:'Instellingen',
    boat:'Boot & delen'
  };

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const settings=$('settingsAppVersion');
    if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');
    if(badge)badge.textContent=BUILD;
  }

  function ensureSerenityBrandStyle(){
    if($('ms8219SerenityUiStyle'))return;
    $('ms8218SerenityBrandStyle')?.remove();
    const style=document.createElement('style');
    style.id='ms8219SerenityUiStyle';
    style.textContent=`
      #${ROOT_ID} .ms8218-serenity-brand{color:#f8fbff!important}
      #${ROOT_ID} .ms8218-brand-lockup{display:inline-flex;align-items:flex-end;position:relative;width:max-content;max-width:100%;padding:0 .08em .24em 0;font-family:Georgia,'Times New Roman',serif;font-size:1.08em;font-weight:500;line-height:.82;letter-spacing:-.055em;color:#f8fbff;white-space:nowrap;text-shadow:0 2px 18px rgba(148,220,255,.08)}
      #${ROOT_ID} .ms8218-brand-sail{width:.43em;height:.61em;flex:0 0 auto;margin:0 -.025em .025em 0;overflow:visible;color:#f8fbff}
      #${ROOT_ID} .ms8218-brand-word{display:inline-block}
      #${ROOT_ID} .ms8218-brand-lockup::after{content:'';position:absolute;left:14%;bottom:.035em;width:77%;height:.13em;border-bottom:.035em solid currentColor;border-radius:0 0 70% 45%;transform:skewX(-16deg) rotate(-1.2deg);transform-origin:left center;opacity:.94;pointer-events:none}

      .${PAGE_TITLE_CLASS}{display:flex;align-items:center;gap:11px;box-sizing:border-box;width:100%;min-height:54px;margin:0 0 12px!important;padding:max(10px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) 10px max(16px,env(safe-area-inset-left))!important;border:0!important;border-bottom:1px solid rgba(99,217,249,.18)!important;border-radius:0!important;background:linear-gradient(180deg,rgba(7,31,48,.97),rgba(3,18,29,.93))!important;box-shadow:0 8px 22px rgba(0,0,0,.18)!important;color:#f6fbff!important;position:relative;z-index:50}
      .${PAGE_TITLE_CLASS} img{display:block;width:30px;height:30px;flex:0 0 30px;object-fit:contain;border-radius:8px;filter:drop-shadow(0 2px 8px rgba(56,189,248,.18))}
      .${PAGE_TITLE_CLASS} .ms8219-page-title-copy{display:grid;gap:1px;min-width:0}
      .${PAGE_TITLE_CLASS} small{display:block;margin:0!important;color:#7fdcff!important;font-size:9px!important;line-height:1.1!important;font-weight:900!important;letter-spacing:.14em!important;text-transform:uppercase}
      .${PAGE_TITLE_CLASS} h1{display:block;margin:0!important;padding:0!important;color:#f8fbff!important;font-size:clamp(19px,3.5vw,26px)!important;line-height:1.05!important;font-weight:850!important;letter-spacing:-.025em!important}

      body.ms8219-start-page .bottom-nav.ms8214-nav,body.ms8219-start-page .bottom-nav{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
      body.ms8219-sub-page .bottom-nav.ms8214-nav,body.ms8219-sub-page .bottom-nav{position:fixed!important;inset:auto 0 0 0!important;z-index:2147483000!important;display:flex!important;align-items:stretch!important;width:100%!important;max-width:none!important;height:calc(72px + env(safe-area-inset-bottom))!important;min-height:calc(72px + env(safe-area-inset-bottom))!important;padding:0 0 env(safe-area-inset-bottom)!important;margin:0!important;overflow:hidden!important;background:rgba(2,11,19,.98)!important;border:0!important;border-top:1px solid rgba(113,220,255,.22)!important;border-radius:0!important;box-shadow:0 -10px 28px rgba(0,0,0,.34)!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;transform:none!important;backdrop-filter:blur(18px) saturate(130%);-webkit-backdrop-filter:blur(18px) saturate(130%)}
      body.ms8219-sub-page .bottom-nav .bottom-nav-item{display:none!important}
      body.ms8219-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"]{display:flex!important;flex:1 1 100%!important;flex-direction:row!important;align-items:center!important;justify-content:center!important;gap:11px!important;width:100%!important;min-width:100%!important;max-width:none!important;height:72px!important;min-height:72px!important;padding:8px max(18px,env(safe-area-inset-right)) 8px max(18px,env(safe-area-inset-left))!important;margin:0!important;border:0!important;border-radius:0!important;background:linear-gradient(90deg,rgba(7,35,52,.98),rgba(9,49,70,.98),rgba(7,35,52,.98))!important;color:#fff!important;box-shadow:none!important}
      body.ms8219-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"] .ms8219-home-logo{display:grid!important;place-items:center!important;width:39px!important;height:39px!important;flex:0 0 39px!important;margin:0!important;border:1px solid rgba(123,222,255,.28)!important;border-radius:12px!important;background:rgba(255,255,255,.07)!important;overflow:hidden}
      body.ms8219-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"] .ms8219-home-logo img{display:block!important;width:30px!important;height:30px!important;object-fit:contain}
      body.ms8219-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"] .ms8219-home-copy{display:grid!important;gap:1px!important;margin:0!important;text-align:left;line-height:1.05!important}
      body.ms8219-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"] .ms8219-home-copy strong{display:block!important;color:#fff!important;font-size:17px!important;line-height:1.08!important;font-weight:900!important;letter-spacing:-.02em!important}
      body.ms8219-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"] .ms8219-home-copy small{display:block!important;color:#87dfff!important;font-size:10px!important;line-height:1.08!important;font-weight:800!important;letter-spacing:.04em!important}
      body.ms8219-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"] .ms8219-home-chevron{display:block!important;margin-left:4px!important;color:#a9eaff!important;font-size:24px!important;line-height:1!important}

      @media(max-width:620px){
        #${ROOT_ID} .ms8218-brand-lockup{font-size:1.02em;letter-spacing:-.06em}
        .${PAGE_TITLE_CLASS}{min-height:50px;padding-bottom:9px!important}
        .${PAGE_TITLE_CLASS} img{width:27px;height:27px;flex-basis:27px}
        body.ms8219-sub-page .bottom-nav.ms8214-nav,body.ms8219-sub-page .bottom-nav{height:calc(68px + env(safe-area-inset-bottom))!important;min-height:calc(68px + env(safe-area-inset-bottom))!important}
        body.ms8219-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"]{height:68px!important;min-height:68px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function brandSerenity(root){
    if(!root)return false;
    ensureSerenityBrandStyle();
    if(root.querySelector('.ms8218-brand-lockup'))return true;
    const preferred=[...root.querySelectorAll('h1,h2,h3,[role="heading"],[class*="title"],[class*="heading"]')];
    let heading=preferred.find(el=>String(el.textContent||'').trim()==='Start');
    if(!heading){
      const leaf=[...root.querySelectorAll('*')].find(el=>el.children.length===0&&String(el.textContent||'').trim()==='Start');
      heading=leaf?.closest('h1,h2,h3,[role="heading"]')||leaf||null;
    }
    if(!heading)return false;
    heading.classList.add('ms8218-serenity-brand');
    heading.setAttribute('aria-label','Serenity');
    heading.innerHTML=`<span class="ms8218-brand-lockup"><svg class="ms8218-brand-sail" viewBox="0 0 44 58" aria-hidden="true" focusable="false"><path d="M21 4v43" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M18.2 8.5 5.3 42.7h12.9Z" fill="currentColor"/><path d="M24.2 11.4v31.3h14.4Z" fill="currentColor" opacity=".82"/><path d="M4.5 48.8c8.6 3.6 24.7 4.6 35.4.1-7.2 7-26.2 7.5-35.4-.1Z" fill="currentColor"/></svg><span class="ms8218-brand-word">Serenity</span></span>`;
    return true;
  }

  function appIsVisible(){
    const app=$('appView');
    return Boolean(app&&!app.classList.contains('hidden'));
  }

  function activeRouteFromDom(){
    const app=$('appView');
    if(!app)return 'dashboard';
    const visible=[...app.querySelectorAll(':scope > section[id]')].find(node=>!node.classList.contains('hidden')&&node.getAttribute('aria-hidden')!=='true');
    return visible?.id||'dashboard';
  }

  function routeFromEvent(event){
    const detail=event?.detail;
    const route=typeof detail==='string'?detail:(detail?.route||detail?.id||detail?.target);
    return String(route||'').trim().toLowerCase();
  }

  function routeLabel(route,section){
    const key=String(route||'').trim().toLowerCase();
    if(ROUTE_LABELS[key])return ROUTE_LABELS[key];
    const tab=document.querySelector(`.tabs [data-target="${CSS.escape(key)}"]`);
    const tabText=String(tab?.textContent||'').replace(/\s+/g,' ').trim();
    if(tabText)return tabText;
    const heading=[...section?.querySelectorAll?.('h1,h2')||[]].find(node=>!node.closest(`.${PAGE_TITLE_CLASS}`));
    const headingText=String(heading?.textContent||'').replace(/\s+/g,' ').trim();
    if(headingText&&headingText.length<=48)return headingText;
    return key.replace(/[-_]+/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase())||'MijnSerenity';
  }

  function ensurePageTitle(route){
    document.querySelectorAll(`.${PAGE_TITLE_CLASS}`).forEach(node=>{if(node.parentElement?.id!==route)node.remove()});
    if(route==='dashboard')return;
    const section=$(route);
    if(!section)return;
    let title=section.querySelector(`:scope > .${PAGE_TITLE_CLASS}`);
    if(!title){
      title=document.createElement('header');
      title.className=PAGE_TITLE_CLASS;
      section.prepend(title);
    }
    const label=routeLabel(route,section);
    const safeLabel=label.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    title.setAttribute('aria-label',`Je bent nu bij ${label}`);
    title.innerHTML=`<img src="/favicon-64.png" alt="" aria-hidden="true"><span class="ms8219-page-title-copy"><small>MijnSerenity</small><h1>${safeLabel}</h1></span>`;
  }

  function ensureHomeButton(){
    const nav=document.querySelector('.bottom-nav');
    const home=nav?.querySelector('.bottom-nav-item[data-target="dashboard"]');
    if(!nav||!home)return;
    home.setAttribute('aria-label','Naar Start');
    home.setAttribute('title','Naar Start');
    if(!home.querySelector('.ms8219-home-copy')){
      home.innerHTML=`<span class="ms8219-home-logo"><img src="/favicon-64.png" alt="" aria-hidden="true"></span><span class="ms8219-home-copy"><strong>MijnSerenity</strong><small>Naar Start</small></span><span class="ms8219-home-chevron" aria-hidden="true">⌂</span>`;
    }
  }

  function syncPageChrome(preferredRoute=''){
    ensureSerenityBrandStyle();
    const body=document.body;
    if(!body)return;
    if(!appIsVisible()){
      body.classList.remove('ms8219-start-page','ms8219-sub-page');
      return;
    }
    let route=String(preferredRoute||'').trim().toLowerCase();
    if(!route||route==='more'||!$(route)||$(route).classList.contains('hidden'))route=activeRouteFromDom();
    const onStart=route==='dashboard';
    body.classList.toggle('ms8219-start-page',onStart);
    body.classList.toggle('ms8219-sub-page',!onStart);
    if(onStart)document.querySelectorAll(`.${PAGE_TITLE_CLASS}`).forEach(node=>node.remove());
    else{
      ensurePageTitle(route);
      ensureHomeButton();
    }
  }

  function forceStart(){
    if(enforcing)return false;
    enforcing=true;
    try{
      syncBuild();
      const dashboard=$('dashboard');
      if(!dashboard)return false;
      if(!$(ROOT_ID)){
        try{window.ms8210RefreshStart?.()}catch(error){console.warn('Start opbouwen mislukt:',error)}
      }
      const root=$(ROOT_ID);
      if(!root)return false;
      dashboard.classList.add('ms8216-simple-start','ms8217-hard-start','ms8218-serenity-logo','ms8219-clean-start');
      root.hidden=false;
      root.removeAttribute('aria-hidden');
      root.style.setProperty('display','block','important');
      root.style.setProperty('visibility','visible','important');
      root.style.setProperty('opacity','1','important');
      root.style.setProperty('position','relative','important');
      root.style.setProperty('z-index','20','important');
      root.style.setProperty('min-height','calc(100dvh - 82px)','important');
      brandSerenity(root);
      [...dashboard.children].forEach(child=>{
        if(child===root)return;
        child.style.setProperty('display','none','important');
        child.setAttribute('aria-hidden','true');
      });
      return true;
    }finally{
      enforcing=false;
    }
  }

  function refreshUi(event){
    forceStart();
    const route=routeFromEvent(event);
    requestAnimationFrame(()=>syncPageChrome(route));
  }

  function watch(){
    const dashboard=$('dashboard');
    if(!dashboard||observer)return;
    observer=new MutationObserver(()=>requestAnimationFrame(()=>{
      forceStart();
      syncPageChrome();
    }));
    observer.observe(dashboard,{childList:true,subtree:true});
  }

  function start(){
    forceStart();
    syncPageChrome();
    watch();
    [50,150,350,700,1200,2200,4000,7000].forEach(ms=>setTimeout(()=>{forceStart();syncPageChrome();watch()},ms));
    setInterval(()=>{if(!document.hidden){forceStart();syncPageChrome()}},5000);
    ['mijnserenity:dashboard-ready','mijnserenity:routechange','mijnserenity:boot-complete','pageshow','online'].forEach(name=>window.addEventListener(name,refreshUi,{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshUi()},{passive:true});
    console.info(`MijnSerenity ${BUILD}: rustige Start, paginakoppen en Thuisknop actief.`);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
