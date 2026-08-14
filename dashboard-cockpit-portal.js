/* MijnSerenity 7.15.31 — cockpit portal boven legacy pager */
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
      @media(max-width:700px){
        #msProDashboard.ms-cockpit-portal{inset:0 0 calc(66px + env(safe-area-inset-bottom,0px)) 0!important}
      }
    `;
    document.head.appendChild(style);
  }

  function syncVisibility(){
    if(!portal||!portal.isConnected)return;
    const show=activeRoute()==='dashboard';
    portal.hidden=!show;
    document.body.classList.toggle('ms-cockpit-visible',show);
    if(show){
      portal.style.display='block';
      if(portal.scrollTop>20)portal.scrollTop=0;
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
    syncVisibility();
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

  function start(){
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