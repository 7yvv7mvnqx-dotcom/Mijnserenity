/* MijnSerenity 8.21.8 — Serenity-logo op de eenvoudige Start-weergave */
(()=>{
  'use strict';

  const BUILD='8.21.8';
  const ROOT_ID='ms8210Start';
  const $=id=>document.getElementById(id);
  let observer=null;
  let enforcing=false;

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
    if($('ms8218SerenityBrandStyle'))return;
    const style=document.createElement('style');
    style.id='ms8218SerenityBrandStyle';
    style.textContent=`
      #${ROOT_ID} .ms8218-serenity-brand{
        color:#f8fbff!important;
      }
      #${ROOT_ID} .ms8218-brand-lockup{
        display:inline-flex;
        align-items:flex-end;
        position:relative;
        width:max-content;
        max-width:100%;
        padding:0 .08em .24em 0;
        font-family:Georgia,'Times New Roman',serif;
        font-size:1.08em;
        font-weight:500;
        line-height:.82;
        letter-spacing:-.055em;
        color:#f8fbff;
        white-space:nowrap;
        text-shadow:0 2px 18px rgba(148,220,255,.08);
      }
      #${ROOT_ID} .ms8218-brand-sail{
        width:.43em;
        height:.61em;
        flex:0 0 auto;
        margin:0 -.025em .025em 0;
        overflow:visible;
        color:#f8fbff;
      }
      #${ROOT_ID} .ms8218-brand-word{
        display:inline-block;
      }
      #${ROOT_ID} .ms8218-brand-lockup::after{
        content:'';
        position:absolute;
        left:14%;
        bottom:.035em;
        width:77%;
        height:.13em;
        border-bottom:.035em solid currentColor;
        border-radius:0 0 70% 45%;
        transform:skewX(-16deg) rotate(-1.2deg);
        transform-origin:left center;
        opacity:.94;
        pointer-events:none;
      }
      @media (max-width:620px){
        #${ROOT_ID} .ms8218-brand-lockup{
          font-size:1.02em;
          letter-spacing:-.06em;
        }
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
      const leaf=[...root.querySelectorAll('*')].find(el=>
        el.children.length===0 && String(el.textContent||'').trim()==='Start'
      );
      heading=leaf?.closest('h1,h2,h3,[role="heading"]')||leaf||null;
    }

    if(!heading)return false;
    heading.classList.add('ms8218-serenity-brand');
    heading.setAttribute('aria-label','Serenity');
    heading.innerHTML=`<span class="ms8218-brand-lockup"><svg class="ms8218-brand-sail" viewBox="0 0 44 58" aria-hidden="true" focusable="false"><path d="M21 4v43" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M18.2 8.5 5.3 42.7h12.9Z" fill="currentColor"/><path d="M24.2 11.4v31.3h14.4Z" fill="currentColor" opacity=".82"/><path d="M4.5 48.8c8.6 3.6 24.7 4.6 35.4.1-7.2 7-26.2 7.5-35.4-.1Z" fill="currentColor"/></svg><span class="ms8218-brand-word">Serenity</span></span>`;
    return true;
  }

  function forceStart(){
    if(enforcing)return false;
    enforcing=true;
    try{
      syncBuild();
      const dashboard=$('dashboard');
      if(!dashboard)return false;

      /* De 8.21.6 hoofdmodule bouwt de tegels. Roep hem expliciet aan als de
         Start-root er nog niet is. */
      if(!$(ROOT_ID)){
        try{window.ms8210RefreshStart?.()}catch(error){console.warn('Start opbouwen mislukt:',error)}
      }

      const root=$(ROOT_ID);
      if(!root)return false;

      dashboard.classList.add('ms8216-simple-start','ms8217-hard-start','ms8218-serenity-logo');
      root.hidden=false;
      root.removeAttribute('aria-hidden');
      root.style.setProperty('display','block','important');
      root.style.setProperty('visibility','visible','important');
      root.style.setProperty('opacity','1','important');
      root.style.setProperty('position','relative','important');
      root.style.setProperty('z-index','20','important');
      root.style.setProperty('min-height','calc(100dvh - 150px)','important');

      brandSerenity(root);

      /* Inline !important wint ook van de oude Marine Glass-regels. Daardoor
         kan kaart/meter-dashboard de eenvoudige Start niet meer overnemen. */
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

  function watch(){
    const dashboard=$('dashboard');
    if(!dashboard||observer)return;
    observer=new MutationObserver(()=>requestAnimationFrame(forceStart));
    observer.observe(dashboard,{childList:true,subtree:true});
  }

  function start(){
    forceStart();
    watch();
    [50,150,350,700,1200,2200,4000,7000].forEach(ms=>setTimeout(()=>{forceStart();watch()},ms));
    setInterval(()=>{if(!document.hidden)forceStart()},5000);
    ['mijnserenity:dashboard-ready','mijnserenity:routechange','mijnserenity:boot-complete','pageshow','online'].forEach(name=>window.addEventListener(name,forceStart,{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)forceStart()},{passive:true});
    console.info(`MijnSerenity ${BUILD}: eenvoudige Start met Serenity-logo actief.`);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();