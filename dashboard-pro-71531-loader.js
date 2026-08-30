/* MijnSerenity 7.19.17 — stabiel iPad-dashboard bij Stage Manager + werkende Meer-knop */
(()=>{
  'use strict';
  if(window.__msDashboardLoader719170)return;
  window.__msDashboardLoader719170=true;
  const V='719170';
  const BUILD='7.19.17';
  const isIPadLike=()=>/iPad/i.test(navigator.userAgent||'')||((navigator.platform==='MacIntel'||/Macintosh/i.test(navigator.userAgent||''))&&Number(navigator.maxTouchPoints||0)>1&&Math.min(Number(screen.width||0),Number(screen.height||0))>=700);

  function currentPath(src){try{return new URL(src,location.href).pathname}catch{return src}}
  function scriptAlreadyLoaded(src){const wanted=currentPath(src);return [...document.scripts].some(script=>script.src&&currentPath(script.src)===wanted&&script.dataset.ms719Loaded==='1')}
  function load(src,key,timeoutMs=7000){
    if(scriptAlreadyLoaded(src))return Promise.resolve(true);
    return new Promise(resolve=>{
      const script=document.createElement('script');let done=false;
      const finish=ok=>{if(done)return;done=true;clearTimeout(timer);script.onload=null;script.onerror=null;if(!ok)console.warn('Dashboardmodule overgeslagen of te traag:',src);resolve(ok)};
      const timer=setTimeout(()=>finish(false),timeoutMs);
      script.src=src;script.async=false;script.dataset.ms719Loaded='1';script.dataset.msDashboard=key;
      script.onload=()=>finish(true);script.onerror=()=>finish(false);document.head.appendChild(script);
    });
  }
  function ensureCssLink(id,href){let link=document.getElementById(id);if(!link){link=document.createElement('link');link.id=id;link.rel='stylesheet';document.head.appendChild(link)}if(link.getAttribute('href')!==href)link.setAttribute('href',href)}
  function ensureStableCss(){
    ensureCssLink('msStableShell71900',`/marine-glass-mobile-7184.css?v=${V}`);
    ensureCssLink('msMarineGlassFixes7193',`/marine-glass-fixes-7193.css?v=${V}`);
    ensureCssLink('msNavigationAccess71913',`/navigation-access-71913.css?v=${V}`);
    document.getElementById('msMarineGlassStable71900')?.remove();
  }
  function removeConflicts(){
    ['msOrientationLayout71835Style','msOrientationLayout71836Style','msMarineGlassPolish7185','msSerenityControlCss','msSerenityControl','msMarineGlassStable71900'].forEach(id=>document.getElementById(id)?.remove());
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link=>{if(currentPath(link.href).endsWith('/victron-energy-71559.css'))link.remove()});
    document.querySelectorAll('[id="msMarineGlass"][data-ms-victron-live]').forEach(panel=>panel.remove());
    const dashboard=document.getElementById('dashboard');dashboard?.classList.remove('scd-active','mspro-active');
    document.querySelector('.bottom-nav')?.classList.remove('bottom-nav-viewport-fixed','bottom-nav-auto-hidden');
    document.documentElement.removeAttribute('data-ms-ipad-safe');
  }
  function syncVersion(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');if(meta)meta.content=BUILD;
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');if(badge)badge.textContent=BUILD;
    const settings=document.getElementById('settingsAppVersion');if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
  }

  function ensureIPadMore(){
    if(!document.getElementById('msIpadMoreStyle71917')){
      const style=document.createElement('style');
      style.id='msIpadMoreStyle71917';
      style.textContent=`
        #msIpadMore71917{position:fixed;inset:0;z-index:2147483500;background:rgba(0,7,13,.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);display:flex;align-items:flex-end;justify-content:center;padding:24px max(18px,env(safe-area-inset-right)) max(24px,calc(94px + env(safe-area-inset-bottom))) max(18px,env(safe-area-inset-left))}
        #msIpadMore71917.hidden{display:none!important}
        #msIpadMore71917 .ms-ipad-more-panel{width:min(760px,100%);max-height:min(78vh,720px);overflow:auto;background:#071a29;border:1px solid rgba(120,190,230,.28);border-radius:24px;box-shadow:0 24px 70px rgba(0,0,0,.48);padding:18px}
        #msIpadMore71917 .ms-ipad-more-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px}
        #msIpadMore71917 .ms-ipad-more-head h2{margin:0;color:#f5fbff;font-size:24px}
        #msIpadMore71917 .ms-ipad-more-close{width:46px;height:46px;padding:0;border-radius:50%;background:rgba(255,255,255,.10);color:#fff;font-size:28px}
        #msIpadMore71917 .ms-ipad-more-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
        #msIpadMore71917 .ms-ipad-more-grid button{min-height:86px;background:#0d2a40;color:#f5fbff;border:1px solid rgba(120,190,230,.20);border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;font-weight:800}
        #msIpadMore71917 .ms-ipad-more-grid button span{font-size:27px;line-height:1}
        @media(max-width:700px){#msIpadMore71917 .ms-ipad-more-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      `;
      document.head.appendChild(style);
    }
    let layer=document.getElementById('msIpadMore71917');
    if(!layer){
      layer=document.createElement('div');
      layer.id='msIpadMore71917';
      layer.className='hidden';
      layer.setAttribute('role','dialog');
      layer.setAttribute('aria-modal','true');
      layer.setAttribute('aria-hidden','true');
      layer.innerHTML=`<div class="ms-ipad-more-panel"><div class="ms-ipad-more-head"><h2>Meer</h2><button type="button" class="ms-ipad-more-close" aria-label="Sluiten">×</button></div><div class="ms-ipad-more-grid"><button data-route="ais"><span>📡</span>AIS</button><button data-route="weather"><span>☀️</span>Weer</button><button data-route="planner"><span>🧭</span>Reisplanner</button><button data-route="technical"><span>⚙️</span>Techniek</button><button data-route="pois"><span>📍</span>POI's</button><button data-route="logbook"><span>📖</span>Logboek</button><button data-route="costs"><span>🧾</span>Kosten</button><button data-route="finance"><span>💶</span>Financieel</button><button data-route="entertainment"><span>🏡</span>Home Assistant</button><button data-route="settings"><span>🚤</span>Instellingen</button></div></div>`;
      document.body.appendChild(layer);
      const close=()=>{layer.classList.add('hidden');layer.setAttribute('aria-hidden','true')};
      layer.addEventListener('click',event=>{
        if(event.target===layer||event.target.closest('.ms-ipad-more-close')){close();return}
        const button=event.target.closest('[data-route]');if(!button)return;
        close();
        const route=button.dataset.route;
        if(typeof window.captainNavigate==='function')window.captainNavigate(route,button);
      });
      window.ms71917CloseIPadMore=close;
    }
    window.ms797OpenMore=()=>{
      const current=ensureIPadMore();
      current.classList.remove('hidden');
      current.setAttribute('aria-hidden','false');
      requestAnimationFrame(()=>current.querySelector('.ms-ipad-more-close')?.focus());
    };
    return layer;
  }

  function preserveIPadDashboard(){
    /* Op iPad blijft het bestaande dashboard leidend. Marine Glass mag het niet
       later alsnog vervangen, ook niet na een Stage Manager-resize. */
    const dashboard=document.getElementById('dashboard');
    dashboard?.classList.remove('mg-active','scd-active','mspro-active');
    ['display','visibility','opacity','width','max-width','min-width','height','max-height','min-height','left','right','transform','translate'].forEach(name=>dashboard?.style.removeProperty(name));
    document.getElementById('msMarineGlass')?.remove();
    document.getElementById('mgMore')?.remove();
    document.getElementById('mgMoreNav')?.remove();
    const nav=document.querySelector('.bottom-nav');
    nav?.classList.remove('mg-nav');
    document.documentElement.dataset.msIpadDashboard='native';
    ensureIPadMore();
  }

  function dashboardIsActive(){
    const active=document.querySelector('.bottom-nav .bottom-nav-item.active');
    return !active||active.dataset.target==='dashboard';
  }

  function enforceIPadViewport(){
    if(!dashboardIsActive())return;
    const app=document.getElementById('appView');
    const dashboard=document.getElementById('dashboard');
    if(!app||!dashboard||app.classList.contains('hidden'))return;

    preserveIPadDashboard();
    dashboard.classList.remove('hidden');
    ['display','visibility','opacity','width','max-width','min-width','height','max-height','min-height','left','right','transform','translate','margin-left','margin-right'].forEach(name=>dashboard.style.removeProperty(name));
    [document.documentElement,document.body,document.querySelector('body>main'),app].filter(Boolean).forEach(node=>{
      ['width','max-width','min-width','left','right','transform','translate','margin-left','margin-right'].forEach(name=>node.style.removeProperty(name));
    });

    /* In het compacte iPad-venster (Stage Manager / Split View) is dit het
       dashboard dat start-dashboard-71510.css voor <=1024px vormgeeft. Inline
       !important voorkomt dat een oude responsive regel het paneel onzichtbaar laat. */
    const native=document.getElementById('ms71510Dashboard');
    if(native&&window.innerWidth<=1024){
      native.style.setProperty('display','flex','important');
      native.style.setProperty('width','100%','important');
      native.style.setProperty('max-width','100%','important');
      native.style.setProperty('min-width','0','important');
      native.style.removeProperty('height');
      native.style.removeProperty('max-height');
      native.style.removeProperty('transform');
      native.style.removeProperty('translate');
    }else if(native){
      ['display','width','max-width','min-width','height','max-height','transform','translate'].forEach(name=>native.style.removeProperty(name));
    }
  }

  function installIPadGuard(){
    if(window.__msIpadNativeDashboardGuard719170)return;
    window.__msIpadNativeDashboardGuard719170=true;
    const dashboard=document.getElementById('dashboard');
    if(!dashboard)return;
    let frame=0;
    const queue=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;enforceIPadViewport()})};
    const observer=new MutationObserver(queue);
    observer.observe(dashboard,{childList:true,subtree:false,attributes:true,attributeFilter:['class','style']});
    [80,250,600,1200,2500,5000,9000].forEach(ms=>setTimeout(queue,ms));
    window.addEventListener('resize',queue,{passive:true});
    window.addEventListener('orientationchange',queue,{passive:true});
    window.addEventListener('pageshow',queue,{passive:true});
    window.addEventListener('focus',queue,{passive:true});
    window.visualViewport?.addEventListener('resize',queue,{passive:true});
    window.visualViewport?.addEventListener('scroll',queue,{passive:true});
    window.addEventListener('mijnserenity:routechange',()=>setTimeout(queue,0),{passive:true});
  }

  async function start(){
    removeConflicts();syncVersion();

    if(isIPadLike()){
      preserveIPadDashboard();
      installIPadGuard();
      enforceIPadViewport();
      requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));
      window.dispatchEvent(new CustomEvent('mijnserenity:dashboard-ready',{detail:{build:BUILD,ipadNative:true}}));
      console.info(`MijnSerenity ${BUILD}: iPad-dashboard bewaakt bij resize; Meer-menu actief.`);
      return;
    }

    ensureStableCss();
    await load(`/mobile-viewport-guard-71911.js?v=${V}`,'mobile-viewport-guard',5000);
    await load(`/dashboard-pro-71700.js?v=${V}`,'marine-glass',9000);
    await load(`/dashboard-live-values-fix-71914.js?v=${V}`,'dashboard-live-values-fix',5000);

    removeConflicts();ensureStableCss();syncVersion();
    window.dispatchEvent(new CustomEvent('mijnserenity:dashboard-ready',{detail:{build:BUILD}}));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>start().catch(console.warn),{once:true});
  else start().catch(console.warn);
})();