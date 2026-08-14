/* MijnSerenity 7.15.31 — cockpit portal boven legacy pager + interactieve kaarten */
(()=>{
  'use strict';
  if(window.__msCockpitPortal)return;
  window.__msCockpitPortal=true;

  let portal=null;
  let navObserver=null;
  let moveTimer=0;

  function activeRoute(){
    const nav=document.querySelector('.bottom-nav');
    const active=nav?.querySelector('.bottom-nav-item.active,[aria-current="page"]');
    return active?.dataset?.target||'dashboard';
  }

  function navigate(route){
    if(!route)return;
    if(route==='more'){
      document.querySelector('.ms750-more-button')?.click();
      return;
    }
    portal&&(portal.hidden=true);
    document.body.classList.remove('ms-cockpit-visible');
    if(typeof window.ms708GoToPage==='function'&&window.ms708GoToPage(route,true)!==false)return;
    if(typeof window.captainNavigate==='function'){
      window.captainNavigate(route);
      return;
    }
    document.querySelector(`.bottom-nav-item[data-target="${CSS.escape(route)}"],.tab[data-target="${CSS.escape(route)}"]`)?.click();
  }

  function ensureStyle(){
    if(document.getElementById('msCockpitPortalStyle'))return;
    const style=document.createElement('style');
    style.id='msCockpitPortalStyle';
    style.textContent=`
      #msProDashboard.ms-cockpit-portal{
        position:fixed!important;
        inset:0 0 calc(72px + env(safe-area-inset-bottom,0px)) 0!important;
        z-index:7000!important;
        display:block!important;
        overflow:auto!important;
        -webkit-overflow-scrolling:touch!important;
        background:#020d18!important;
        padding:0 0 18px!important;
        margin:0!important;
        max-width:none!important;
        width:100%!important;
        height:auto!important;
        overscroll-behavior:contain;
      }
      #msProDashboard.ms-cockpit-portal[hidden]{display:none!important}
      body.ms-cockpit-visible{overflow:hidden!important;background:#020d18!important}
      body.ms-cockpit-visible .bottom-nav{z-index:8000!important}
      #msProDashboard [data-go]{cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
      #msProDashboard .ms-cockpit-action{transition:transform .12s ease,border-color .12s ease,box-shadow .12s ease,filter .12s ease}
      #msProDashboard .ms-cockpit-action:active{transform:scale(.985);filter:brightness(1.12)}
      #msProDashboard .ms-cockpit-action:focus-visible{outline:2px solid #55baff!important;outline-offset:3px!important;box-shadow:0 0 0 4px rgba(85,186,255,.18)!important}
      @media(hover:hover){#msProDashboard .ms-cockpit-action:hover{border-color:rgba(85,186,255,.65)!important;box-shadow:0 0 0 1px rgba(85,186,255,.18),0 12px 28px rgba(0,0,0,.24)!important}}
      @media(max-width:700px){
        #msProDashboard.ms-cockpit-portal{inset:0 0 calc(66px + env(safe-area-inset-bottom,0px)) 0!important}
      }
    `;
    document.head.appendChild(style);
  }

  function makeAction(selector,route,label){
    const el=portal?.querySelector(selector);
    if(!el)return;
    el.dataset.go=route;
    el.classList.add('ms-cockpit-action');
    if(el.tagName!=='BUTTON'&&el.tagName!=='A'){
      el.setAttribute('role','button');
      el.tabIndex=0;
    }
    if(label)el.setAttribute('aria-label',label);
  }

  function enhanceInteractions(){
    if(!portal)return;
    makeAction('.msc-location','map','Open kaart en GPS');
    makeAction('.msc-wind','weather','Open weer en wind');
    makeAction('.msc-course','live','Open live varen en koers');
    makeAction('.msc-energy','technical','Open energie en techniek');
    makeAction('.msc-status-main','technical','Open systeemstatus en techniek');
    makeAction('.msc-depth','live','Open live varen en diepte');
    makeAction('.msc-water','weather','Open water en weer');
    makeAction('.msc-weather','weather','Open weervooruitzicht');
    portal.querySelectorAll('[data-go]').forEach(el=>el.classList.add('ms-cockpit-action'));
  }

  function syncVisibility(){
    if(!portal||!portal.isConnected)return;
    const show=activeRoute()==='dashboard';
    portal.hidden=!show;
    document.body.classList.toggle('ms-cockpit-visible',show);
    if(show){
      portal.style.display='block';
      if(portal.scrollTop>20)portal.scrollTop=0;
      enhanceInteractions();
    }
  }

  function mount(){
    ensureStyle();
    const pro=document.getElementById('msProDashboard');
    if(!pro)return false;
    portal=pro;
    if(portal.parentElement!==document.body)document.body.appendChild(portal);
    portal.classList.add('ms-cockpit-portal');
    portal.removeAttribute('aria-hidden');
    enhanceInteractions();
    syncVisibility();
    return true;
  }

  function activateTarget(target,event){
    const action=target instanceof Element?target.closest('#msProDashboard [data-go]'):null;
    if(!action||!portal||action.closest('#msProDashboard')!==portal)return false;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    navigate(action.dataset.go);
    return true;
  }

  function watchNavigation(){
    const nav=document.querySelector('.bottom-nav');
    if(!nav)return;
    if(navObserver)navObserver.disconnect();
    navObserver=new MutationObserver(syncVisibility);
    navObserver.observe(nav,{subtree:true,attributes:true,attributeFilter:['class','aria-current'],childList:true});
    nav.addEventListener('click',()=>setTimeout(syncVisibility,0),true);
  }

  function bindActions(){
    if(document.documentElement.dataset.msCockpitActions==='1')return;
    document.documentElement.dataset.msCockpitActions='1';
    document.addEventListener('click',event=>activateTarget(event.target,event),true);
    document.addEventListener('keydown',event=>{
      if(event.key!=='Enter'&&event.key!==' ')return;
      activateTarget(event.target,event);
    },true);
  }

  function start(){
    bindActions();
    let tries=0;
    const tick=()=>{
      tries+=1;
      mount();
      watchNavigation();
      syncVisibility();
      if((!portal||!portal.isConnected)&&tries<80)moveTimer=setTimeout(tick,125);
    };
    tick();
    window.addEventListener('mijnserenity:routechange',()=>setTimeout(syncVisibility,0),{passive:true});
    window.addEventListener('pageshow',()=>{mount();watchNavigation();syncVisibility();},{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){mount();syncVisibility();}},{passive:true});
    setInterval(()=>{mount();syncVisibility();},1000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();