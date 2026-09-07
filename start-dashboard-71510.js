/* MijnSerenity 8.27.6 — harde reset van de Serenity startheader. */
(()=>{
  'use strict';
  if(window.__ms8276SolidHeader)return;
  window.__ms8276SolidHeader=true;

  const BUILD='8.27.6';
  const CORE='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@de78ddf4fba781d312d7aa109c0f06f3e358e49d/start-dashboard-71510.js?v=827600';
  const PHOTO='https://raw.githubusercontent.com/7yvv7mvnqx-dotcom/Mijnserenity/17d3295161b5092ae4e93d279acb847499a67a75/assets/serenity-hero-8275.jpg';
  const STYLE_ID='ms8276SolidHeaderStyle';
  let corePromise=null;
  let renderQueued=false;

  const norm=value=>String(value||'').replace(/\s+/g,' ').trim();

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const version=document.getElementById('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
  }

  function loadCore(){
    if(window.__msStartStatus8265)return Promise.resolve();
    if(corePromise)return corePromise;
    corePromise=new Promise(resolve=>{
      let script=document.querySelector('script[data-ms8276-core]');
      if(script){
        script.addEventListener('load',resolve,{once:true});
        setTimeout(resolve,5000);
        return;
      }
      script=document.createElement('script');
      script.src=CORE;
      script.async=false;
      script.crossOrigin='anonymous';
      script.dataset.ms8276Core='1';
      script.onload=resolve;
      script.onerror=()=>{
        console.error('MijnSerenity 8.27.6: stabiele startkern kon niet worden geladen.');
        resolve();
      };
      (document.head||document.documentElement).appendChild(script);
      setTimeout(resolve,5000);
    });
    return corePromise;
  }

  function removeLegacyStyles(){
    const legacyIds=[
      'ms8270LiveSerenityHeaderStyle','ms8271UnifiedSerenityHeaderStyle','ms8271HeaderStyle',
      'ms8272ExactSerenityHeroStyle','ms8273BackdropStyle','ms8274LiveHeaderStyle','ms8275HeaderFixStyle'
    ];
    legacyIds.forEach(id=>document.getElementById(id)?.remove());
  }

  function installStyle(){
    removeLegacyStyles();
    document.getElementById(STYLE_ID)?.remove();
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #ms8210Start{width:100%!important;max-width:none!important;margin:0!important;padding:0!important;background:#031421!important;color:#fff!important}
      #ms8210Start .ms8210-shell{width:100%!important;max-width:none!important;margin:0!important;padding:0!important}

      #ms8210Start .ms8234-header.ms8276-solid{
        position:relative!important;isolation:isolate!important;box-sizing:border-box!important;
        width:100%!important;max-width:none!important;min-height:740px!important;margin:0!important;padding:0!important;
        overflow:hidden!important;border:1px solid rgba(55,201,244,.36)!important;border-radius:30px!important;
        background-color:#041725!important;
        background-image:
          linear-gradient(90deg,rgba(0,13,23,.82) 0%,rgba(0,13,23,.58) 30%,rgba(0,13,23,.20) 52%,rgba(0,13,23,.03) 73%,rgba(0,13,23,.10) 100%),
          linear-gradient(0deg,rgba(1,12,20,.62) 0%,rgba(1,12,20,.13) 38%,rgba(1,12,20,0) 66%),
          url("${PHOTO}")!important;
        background-size:cover!important;background-position:center center!important;background-repeat:no-repeat!important;
        box-shadow:inset 0 0 0 1px rgba(79,218,255,.05),0 18px 48px rgba(0,0,0,.28)!important;
      }
      #ms8210Start .ms8234-header.ms8276-solid::before,
      #ms8210Start .ms8234-header.ms8276-solid::after{display:none!important;content:none!important}

      #ms8210Start .ms8276-solid>.ms8234-brand{
        position:absolute!important;z-index:20!important;left:58px!important;top:32px!important;
        width:auto!important;max-width:430px!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;
      }
      #ms8210Start .ms8276-solid .ms8276-brand-title{
        display:block!important;margin:0!important;padding:0!important;color:#20cef6!important;
        font-family:Georgia,"Times New Roman",serif!important;font-size:72px!important;font-weight:500!important;
        line-height:.90!important;letter-spacing:-.055em!important;text-shadow:0 3px 18px rgba(0,0,0,.58)!important;
      }
      #ms8210Start .ms8276-solid .ms8276-brand-tagline{
        display:block!important;margin:11px 0 0 4px!important;color:#f7fbff!important;
        font:800 11px/1.1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        letter-spacing:.26em!important;text-transform:uppercase!important;text-shadow:0 2px 10px rgba(0,0,0,.78)!important;
      }

      #ms8210Start .ms8276-solid>.ms8234-hero{
        position:absolute!important;z-index:18!important;left:58px!important;top:194px!important;
        width:min(650px,48vw)!important;max-width:650px!important;margin:0!important;padding:0!important;
        border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;color:#fff!important;
      }
      #ms8210Start .ms8276-solid>.ms8234-hero::before,
      #ms8210Start .ms8276-solid>.ms8234-hero::after{display:none!important;content:none!important}
      #ms8210Start .ms8276-eyebrow{
        display:block!important;margin:0 0 15px!important;color:#32d8fb!important;
        font:900 14px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        letter-spacing:.21em!important;text-transform:uppercase!important;text-shadow:0 2px 10px rgba(0,0,0,.72)!important;
      }
      #ms8210Start .ms8276-title{
        max-width:620px!important;margin:0 0 10px!important;color:#fff!important;
        font:900 66px/.96 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        letter-spacing:-.052em!important;text-wrap:balance!important;text-shadow:0 3px 16px rgba(0,0,0,.68)!important;
      }
      #ms8210Start .ms8276-subtitle{
        max-width:650px!important;margin:0 0 20px!important;color:#f1f8fc!important;
        font:600 17px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        text-shadow:0 2px 12px rgba(0,0,0,.82)!important;
      }

      #ms8210Start .ms8276-solid .ms8234-live-metrics{
        display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:0!important;
        width:100%!important;max-width:620px!important;margin:18px 0 17px!important;padding:12px 10px!important;
        border:1px solid rgba(61,211,251,.34)!important;border-radius:22px!important;
        background:rgba(2,25,41,.73)!important;box-shadow:0 12px 30px rgba(0,0,0,.22)!important;
        backdrop-filter:blur(18px) saturate(125%)!important;-webkit-backdrop-filter:blur(18px) saturate(125%)!important;
      }
      #ms8210Start .ms8276-solid .ms8234-live-metric{min-width:0!important;padding:0 16px!important;border-right:1px solid rgba(160,220,240,.24)!important}
      #ms8210Start .ms8276-solid .ms8234-live-metric:last-child{border-right:0!important}
      #ms8210Start .ms8276-solid .ms8234-live-copy strong{color:#fff!important;font-size:20px!important;line-height:1.05!important;font-weight:850!important}
      #ms8210Start .ms8276-solid .ms8234-live-copy small{color:#b8cad7!important;font-size:12px!important}

      #ms8210Start .ms8276-live-button{
        display:flex!important;align-items:center!important;justify-content:center!important;gap:14px!important;
        width:510px!important;max-width:100%!important;min-height:70px!important;margin:0!important;padding:14px 24px!important;
        border:1px solid rgba(143,240,255,.68)!important;border-radius:22px!important;
        background:linear-gradient(105deg,#13b7dd,#26d0eb)!important;color:#fff!important;
        font:850 20px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        box-shadow:0 15px 36px rgba(0,174,218,.31),inset 0 1px 0 rgba(255,255,255,.24)!important;text-shadow:none!important;
      }
      #ms8210Start .ms8276-live-button:active{transform:scale(.99)!important}
      #ms8210Start .ms8276-live-button .ms8276-chevron{margin-left:5px!important;font-size:28px!important;opacity:.92!important}

      #ms8210Start .ms8276-solid>.ms8234-status-grid{
        position:absolute!important;z-index:22!important;left:52px!important;right:52px!important;bottom:28px!important;
        display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:12px!important;
        width:auto!important;margin:0!important;padding:0!important;
      }
      #ms8210Start .ms8276-solid .ms8234-status{
        min-width:0!important;min-height:97px!important;margin:0!important;padding:15px 16px!important;
        border:1px solid rgba(58,204,246,.40)!important;border-radius:22px!important;
        background:rgba(2,30,48,.78)!important;color:#fff!important;
        box-shadow:0 12px 28px rgba(0,0,0,.23),inset 0 1px 0 rgba(255,255,255,.04)!important;
        backdrop-filter:blur(18px) saturate(126%)!important;-webkit-backdrop-filter:blur(18px) saturate(126%)!important;
      }
      #ms8210Start .ms8276-solid .ms8234-status-copy strong{color:#fff!important;font-size:17px!important;font-weight:850!important}
      #ms8210Start .ms8276-solid .ms8234-status-copy small,
      #ms8210Start .ms8276-solid .ms8245-status-sub{color:#aec4d3!important;font-size:11px!important}

      #ms8210Start .ms8276-night{
        position:absolute!important;z-index:30!important;right:48px!important;top:31px!important;
        display:flex!important;align-items:center!important;justify-content:center!important;gap:11px!important;
        min-width:146px!important;height:54px!important;margin:0!important;padding:0 20px!important;
        border:1px solid rgba(71,206,247,.27)!important;border-radius:999px!important;
        background:rgba(2,32,51,.90)!important;color:#fff!important;
        font:800 17px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        box-shadow:0 10px 28px rgba(0,0,0,.24)!important;backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important;
      }

      #ms8210Start .ms8276-hidden{display:none!important}

      @media(max-width:1100px){
        #ms8210Start .ms8234-header.ms8276-solid{min-height:720px!important}
        #ms8210Start .ms8276-solid>.ms8234-brand{left:40px!important;top:30px!important}
        #ms8210Start .ms8276-solid .ms8276-brand-title{font-size:62px!important}
        #ms8210Start .ms8276-solid>.ms8234-hero{left:40px!important;top:185px!important;width:min(610px,55vw)!important}
        #ms8210Start .ms8276-title{font-size:58px!important}
        #ms8210Start .ms8276-night{right:38px!important}
        #ms8210Start .ms8276-solid>.ms8234-status-grid{left:32px!important;right:32px!important;gap:9px!important}
      }
      @media(max-width:760px){
        #ms8210Start .ms8234-header.ms8276-solid{min-height:900px!important;border-radius:24px!important;background-position:57% center!important}
        #ms8210Start .ms8276-solid>.ms8234-brand{left:20px!important;top:22px!important;max-width:55%!important}
        #ms8210Start .ms8276-solid .ms8276-brand-title{font-size:48px!important}
        #ms8210Start .ms8276-brand-tagline{font-size:8px!important;letter-spacing:.18em!important}
        #ms8210Start .ms8276-night{right:14px!important;top:18px!important;min-width:112px!important;height:44px!important;padding:0 13px!important;font-size:14px!important}
        #ms8210Start .ms8276-solid>.ms8234-hero{left:20px!important;right:20px!important;top:155px!important;width:auto!important;max-width:none!important}
        #ms8210Start .ms8276-title{font-size:44px!important;max-width:92%!important}
        #ms8210Start .ms8276-subtitle{font-size:14px!important;max-width:94%!important}
        #ms8210Start .ms8276-live-button{width:100%!important;min-height:58px!important;font-size:17px!important}
        #ms8210Start .ms8276-solid>.ms8234-status-grid{left:12px!important;right:12px!important;bottom:14px!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important}
        #ms8210Start .ms8276-solid .ms8234-status{min-height:86px!important;padding:11px 10px!important;border-radius:18px!important}
        #ms8210Start .ms8276-solid .ms8234-status:last-child:nth-child(odd){grid-column:1/-1!important}
      }
    `;
    (document.head||document.documentElement).appendChild(style);
  }

  function navigateLive(){
    try{
      if(typeof window.captainNavigate==='function'){
        const nav=document.querySelector('.bottom-nav .bottom-nav-item[data-target="live"]');
        window.captainNavigate('live',nav||null);
        return;
      }
      document.querySelector('.bottom-nav [data-target="live"],.tabs [data-target="live"],[data-ms8210-target="live"]')?.click();
    }catch(error){console.warn('Live varen openen mislukt:',error)}
  }

  function findHeader(root){
    return root?.querySelector('.ms8234-header')||root?.querySelector('.ms8210-header')||null;
  }

  function cleanupHeader(root,header){
    if(!root||!header)return;

    ['ms8270-live-hero','ms8271-unified','ms8272-exact','ms8273-photo-ready','ms8274-live','ms8275-fixed'].forEach(cls=>header.classList.remove(cls));
    header.classList.add('ms8276-solid');
    header.dataset.msHeroBuild='8276';

    header.querySelectorAll(':scope > .ms8273-backdrop,:scope > .ms8273-photo-overlay,:scope > .ms8274-photo,:scope > .ms8274-overlay,:scope > .ms8275-photo,:scope > .ms8275-overlay').forEach(node=>node.remove());

    const hiddenSelectors=[
      '.ms8234-greeting','.ms8245-date','.ms8234-attention','.ms8234-gauges','.ms8234-summary',
      '.ms8263-vrijon-hero','.ms8263-vrijon-lockup','.ms8263-vrijon-svg','.ms8234-sail','.ms8218-brand-sail'
    ];
    hiddenSelectors.forEach(selector=>root.querySelectorAll(selector).forEach(node=>node.classList.add('ms8276-hidden')));
  }

  function ensureBrand(header){
    let brand=header.querySelector(':scope > .ms8234-brand');
    if(!brand){
      brand=document.createElement('div');
      brand.className='ms8234-brand';
      header.prepend(brand);
    }
    brand.replaceChildren();
    const title=document.createElement('div');
    title.className='ms8276-brand-title';
    title.textContent='Serenity';
    const tagline=document.createElement('div');
    tagline.className='ms8276-brand-tagline';
    tagline.textContent='EXPLORE · NAVIGATE · ENJOY';
    brand.append(title,tagline);
    return brand;
  }

  function fallbackMetrics(){
    const wrap=document.createElement('div');
    wrap.className='ms8234-live-metrics';
    const data=[['⌁','0 km/u','Snelheid'],['⌄','Geen meting','Diepte'],['◉','Geen meting','Wind']];
    data.forEach(([icon,strong,small])=>{
      const item=document.createElement('div');
      item.className='ms8234-live-metric';
      item.innerHTML=`<span aria-hidden="true">${icon}</span><span class="ms8234-live-copy"><strong>${strong}</strong><small>${small}</small></span>`;
      wrap.appendChild(item);
    });
    return wrap;
  }

  function ensureHero(root,header){
    let metrics=root.querySelector('.ms8234-live-metrics');
    if(metrics)metrics.remove();
    else metrics=fallbackMetrics();

    root.querySelectorAll('button,a,[role="button"]').forEach(node=>{
      if(/start live varen/i.test(norm(node.textContent)))node.remove();
    });

    let hero=header.querySelector(':scope > .ms8234-hero')||root.querySelector('.ms8234-hero');
    if(!hero){hero=document.createElement('section');hero.className='ms8234-hero'}
    if(hero.parentElement!==header)header.appendChild(hero);

    const eyebrow=document.createElement('span');
    eyebrow.className='ms8276-eyebrow';
    eyebrow.textContent='WELKOM TERUG';

    const title=document.createElement('h2');
    title.className='ms8276-title';
    title.textContent='Klaar om te gaan varen?';

    const subtitle=document.createElement('p');
    subtitle.className='ms8276-subtitle';
    subtitle.textContent='De Serenity ligt klaar. Waar brengt de volgende reis je naartoe?';

    const button=document.createElement('button');
    button.type='button';
    button.className='ms8276-live-button';
    button.innerHTML='<span aria-hidden="true">▶</span><span>Start live varen</span><span class="ms8276-chevron" aria-hidden="true">›</span>';
    button.addEventListener('click',event=>{event.preventDefault();navigateLive()});

    hero.replaceChildren(eyebrow,title,subtitle,metrics,button);
    return hero;
  }

  function ensureStatusGrid(root,header){
    let grid=root.querySelector('.ms8234-status-grid');
    if(!grid)return null;
    if(grid.parentElement!==header)header.appendChild(grid);
    const shore=[...grid.querySelectorAll('.ms8234-status')].find(node=>/walstroom/i.test(norm(node.textContent)));
    if(shore){
      const strong=shore.querySelector('strong');
      if(strong&&/^[\s—–-]*$/.test(strong.textContent||''))strong.textContent='Niet aangesloten';
    }
    return grid;
  }

  function ensureNight(root,header){
    const candidates=[...root.querySelectorAll('button,[role="button"]')];
    let night=candidates.find(node=>{
      const text=norm(node.textContent).toLowerCase();
      return text==='nacht'||text.startsWith('nacht ')||text.includes(' nacht');
    });
    const allNights=candidates.filter(node=>/nacht/i.test(norm(node.textContent)));
    allNights.forEach(node=>{if(node!==night&&node.closest('#ms8210Start'))node.classList.add('ms8276-hidden')});
    if(!night)return null;
    night.classList.remove('ms8272-night','ms8271-night-control');
    night.classList.add('ms8276-night');
    if(night.parentElement!==header)header.appendChild(night);
    return night;
  }

  function patchRefresh(){
    const original=window.ms8210RefreshStart;
    if(typeof original!=='function'||original.__ms8276Wrapped)return;
    const wrapped=function(...args){
      let result;
      try{result=original.apply(this,args)}catch(error){setTimeout(queueRender,0);throw error}
      Promise.resolve(result).finally(()=>setTimeout(queueRender,0));
      return result;
    };
    wrapped.__ms8276Wrapped=true;
    window.ms8210RefreshStart=wrapped;
  }

  function render(){
    syncBuild();
    installStyle();
    const root=document.getElementById('ms8210Start');
    const header=findHeader(root);
    if(!root||!header)return false;
    cleanupHeader(root,header);
    ensureBrand(header);
    ensureHero(root,header);
    ensureStatusGrid(root,header);
    ensureNight(root,header);
    patchRefresh();
    return true;
  }

  function queueRender(){
    if(renderQueued)return;
    renderQueued=true;
    requestAnimationFrame(()=>{renderQueued=false;render()});
  }

  function start(){
    syncBuild();
    installStyle();
    try{const preload=new Image();preload.decoding='async';preload.src=PHOTO}catch{}
    render();
    [80,180,350,700,1200,2200,4000,7000,11000].forEach(ms=>setTimeout(render,ms));
    ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:start-requested','mijnserenity:routechange','mijnserenity:theme-changed','pageshow','online']
      .forEach(type=>window.addEventListener(type,queueRender,{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)queueRender()},{passive:true});
    window.addEventListener('resize',queueRender,{passive:true});
    console.info(`MijnSerenity ${BUILD}: harde, enkelvoudige Serenity-header actief.`);
  }

  loadCore().finally(start);
})();
