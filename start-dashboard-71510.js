/* MijnSerenity 8.28.5 — Safari-stabiliteit + Start pas na inloggen laden. */
(()=>{
  'use strict';
  if(window.__ms8285StartFix)return;
  window.__ms8285StartFix=true;

  const BUILD='8.28.5';
  const PRIOR='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@0261da95450099f9fef74f16b8ba20acd0f9e507/start-dashboard-71510.js?v=828500';
  const PARTS=Array.from({length:13},(_,i)=>`/assets/serenity-hero-8281-${String(i+1).padStart(2,'0')}.txt?v=828501`);
  const ACTIVE_CLASS='ms8285-modern-start-active';
  const HIDDEN_ATTR='data-ms8285-legacy-hidden';
  const CONTROLS_ID='ms8285ReleaseControls';

  let imageUrl='';
  let imagePromise=null;
  let rootObserver=null;
  let dashboardObserver=null;
  let appObserver=null;
  let startInitialised=false;
  let startInitialising=false;

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const version=document.getElementById('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
    const badge=document.querySelector(`#${CONTROLS_ID} .ms8285-version`);
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
    try{
      const style=getComputedStyle(dashboard);
      return style.display!=='none'&&style.visibility!=='hidden';
    }catch{return true;}
  }

  function openMore(){
    try{
      if(typeof window.ms797OpenMore==='function')return window.ms797OpenMore();
      const legacy=document.querySelector('#ms71510Dashboard .ms71510-more,.ms71510-more');
      if(legacy)return legacy.click();
      console.warn('MijnSerenity: Meer-menu is nog niet beschikbaar.');
    }catch(error){console.warn('MijnSerenity: Meer-menu openen mislukt.',error);}
  }

  function ensureReleaseControls(){
    if(!appVisible())return null;
    let controls=document.getElementById(CONTROLS_ID);
    if(!controls){
      controls=document.createElement('div');
      controls.id=CONTROLS_ID;
      controls.setAttribute('aria-label','MijnSerenity versie en menu');
      controls.innerHTML=`<span class="ms8285-version">v${BUILD}</span><button type="button" class="ms8285-more" aria-label="Meer opties openen"><span aria-hidden="true">☰</span><strong>Meer</strong></button>`;
      document.body.appendChild(controls);
      controls.querySelector('.ms8285-more')?.addEventListener('click',openMore);
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
    controls.setAttribute('aria-hidden',showApp?'false':'true');
    const more=controls.querySelector('.ms8285-more');
    if(more&&more.hidden===showMore)more.hidden=!showMore;
  }

  function installStyle(){
    let style=document.getElementById('ms8285StartFixStyle');
    if(!style){
      style=document.createElement('style');
      style.id='ms8285StartFixStyle';
      document.head.appendChild(style);
    }
    style.textContent=`
      #ms8210Start .ms8280-photo{display:block!important;visibility:visible!important;opacity:1!important;object-fit:cover!important;object-position:62% 54%!important}
      #dashboard.${ACTIVE_CLASS} .ms71514-hero{display:none!important;visibility:hidden!important}
      #${CONTROLS_ID}{position:fixed!important;z-index:2147483200!important;top:calc(env(safe-area-inset-top,0px) + 7px)!important;left:max(10px,env(safe-area-inset-left,0px))!important;right:max(10px,env(safe-area-inset-right,0px))!important;display:none!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;pointer-events:none!important;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif!important}
      #${CONTROLS_ID}.is-app-visible{display:flex!important}
      #${CONTROLS_ID} .ms8285-version{pointer-events:auto!important;display:inline-flex!important;align-items:center!important;min-height:28px!important;padding:5px 9px!important;border:1px solid rgba(102,220,255,.26)!important;border-radius:999px!important;background:rgba(2,22,35,.80)!important;color:#98e7ff!important;box-shadow:0 6px 18px rgba(0,0,0,.24)!important;-webkit-backdrop-filter:blur(14px) saturate(130%)!important;backdrop-filter:blur(14px) saturate(130%)!important;font-size:11px!important;line-height:1!important;font-weight:850!important;letter-spacing:.035em!important}
      #${CONTROLS_ID} .ms8285-more{pointer-events:auto!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;min-height:38px!important;padding:8px 12px!important;margin:0!important;border:1px solid rgba(102,220,255,.30)!important;border-radius:14px!important;background:rgba(2,27,43,.90)!important;color:#fff!important;box-shadow:0 7px 20px rgba(0,0,0,.28)!important;-webkit-backdrop-filter:blur(14px) saturate(130%)!important;backdrop-filter:blur(14px) saturate(130%)!important;font-size:13px!important;line-height:1!important;font-weight:850!important}
      #${CONTROLS_ID} .ms8285-more[hidden]{display:none!important}
      #${CONTROLS_ID} .ms8285-more span{font-size:16px!important;line-height:1!important}
      #${CONTROLS_ID} .ms8285-more:active{transform:scale(.97)!important}
      @media(max-width:760px){#ms8210Start .ms8280-photo{object-position:66% 54%!important}}
      @media(min-width:761px){#${CONTROLS_ID}{top:12px!important;left:14px!important;right:14px!important}}
    `;
  }

  function loadPrior(){
    if(window.__ms8280Header)return Promise.resolve();
    return new Promise(resolve=>{
      let script=document.querySelector('script[data-ms8285-prior],script[data-ms8284-prior],script[data-ms8282-prior],script[data-ms8281-prior]');
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
      script.dataset.ms8285Prior='1';
      script.onload=resolve;
      script.onerror=()=>{console.error('MijnSerenity 8.28.5: headerbasis kon niet laden.');resolve();};
      document.head.appendChild(script);
      setTimeout(resolve,7000);
    });
  }

  async function loadPhoto(){
    if(imageUrl)return imageUrl;
    if(imagePromise)return imagePromise;
    imagePromise=(async()=>{
      const chunks=[];
      for(const path of PARTS){
        const response=await fetch(path,{cache:'no-store',credentials:'same-origin'});
        if(!response.ok)throw new Error(`Serenity-fotodeel ${response.status}: ${path}`);
        chunks.push((await response.text()).trim());
      }
      const b64=chunks.join('').replace(/\s+/g,'');
      if(!b64.startsWith('/9j/'))throw new Error('Ongeldige Serenity JPEG');
      imageUrl=`data:image/jpeg;base64,${b64}`;
      return imageUrl;
    })().catch(error=>{console.error('Serenity-achtergrond kon niet worden opgebouwd.',error);imagePromise=null;return '';});
    return imagePromise;
  }

  function suppressLegacyHero(){
    const dashboard=document.getElementById('dashboard');
    if(!dashboard)return false;
    const modern=dashboard.querySelector('#ms8210Start .ms8280-header');
    const legacyHeroes=[...dashboard.querySelectorAll('.ms71514-hero')];

    if(!modern){
      if(dashboard.classList.contains(ACTIVE_CLASS))dashboard.classList.remove(ACTIVE_CLASS);
      legacyHeroes.forEach(hero=>{
        if(hero.hasAttribute(HIDDEN_ATTR)){
          if(hero.hidden)hero.hidden=false;
          if(hero.hasAttribute('aria-hidden'))hero.removeAttribute('aria-hidden');
          hero.removeAttribute(HIDDEN_ATTR);
        }
      });
      return false;
    }

    if(!dashboard.classList.contains(ACTIVE_CLASS))dashboard.classList.add(ACTIVE_CLASS);
    legacyHeroes.forEach(hero=>{
      if(modern.contains(hero))return;
      if(!hero.hidden)hero.hidden=true;
      if(hero.getAttribute('aria-hidden')!=='true')hero.setAttribute('aria-hidden','true');
      if(!hero.hasAttribute(HIDDEN_ATTR))hero.setAttribute(HIDDEN_ATTR,'1');
    });
    return true;
  }

  async function applyPhoto(){
    if(!appVisible())return false;
    syncBuild();
    installStyle();
    ensureReleaseControls();
    suppressLegacyHero();
    const url=await loadPhoto();
    if(!url)return false;
    let changed=false;
    document.querySelectorAll('#ms8210Start .ms8280-photo').forEach(img=>{
      if(img.src!==url){img.src=url;changed=true;}
    });
    suppressLegacyHero();
    syncReleaseControls();
    return changed||!!document.querySelector('#ms8210Start .ms8280-photo');
  }

  function observeStart(){
    const root=document.getElementById('ms8210Start');
    if(root&&!rootObserver){
      rootObserver=new MutationObserver(()=>{if(appVisible())void applyPhoto();});
      rootObserver.observe(root,{childList:true,subtree:true});
    }
    const dashboard=document.getElementById('dashboard');
    if(dashboard&&!dashboardObserver){
      dashboardObserver=new MutationObserver(()=>{suppressLegacyHero();syncReleaseControls();});
      dashboardObserver.observe(dashboard,{childList:true,subtree:true});
    }
  }

  async function initialiseStart(){
    if(startInitialised||startInitialising||!appVisible())return;
    startInitialising=true;
    try{
      ensureReleaseControls();
      await loadPrior();
      for(let i=0;i<60;i++){
        if(await applyPhoto())break;
        await new Promise(resolve=>setTimeout(resolve,100));
      }
      suppressLegacyHero();
      observeStart();
      syncReleaseControls();
      [500,1500,3500,7000].forEach(ms=>setTimeout(()=>{if(appVisible())void applyPhoto();},ms));
      startInitialised=true;
      console.info('MijnSerenity 8.28.5: stabiele Start actief; zware Startcode pas na inloggen geladen.');
    }finally{
      startInitialising=false;
    }
  }

  function watchAppVisibility(){
    const app=document.getElementById('appView');
    if(!app||appObserver)return;
    appObserver=new MutationObserver(()=>{
      syncBuild();
      if(appVisible()){
        ensureReleaseControls();
        void initialiseStart();
      }else{
        syncReleaseControls();
      }
    });
    appObserver.observe(app,{attributes:true,attributeFilter:['class','aria-hidden']});
  }

  function boot(){
    syncBuild();
    installStyle();
    watchAppVisibility();
    if(appVisible())void initialiseStart();

    ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:start-requested','mijnserenity:routechange','pageshow','focus']
      .forEach(type=>window.addEventListener(type,()=>requestAnimationFrame(()=>{
        syncBuild();
        if(appVisible()){
          ensureReleaseControls();
          void initialiseStart();
          suppressLegacyHero();
          observeStart();
          syncReleaseControls();
        }
      }),{passive:true}));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();