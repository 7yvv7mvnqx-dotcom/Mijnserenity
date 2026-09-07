/* MijnSerenity 8.27.2 — exact gepolijste Serenity startheader. */
(()=>{
  'use strict';
  if(window.__ms8272ExactSerenityHero)return;
  window.__ms8272ExactSerenityHero=true;

  const BUILD='8.27.2';
  const BASE='/start-dashboard-8270-base.js?v=827202';
  const PARTS=[
    '/assets/serenity-header-8270-01.txt?v=827202',
    '/assets/serenity-header-8270-02.txt?v=827202'
  ];
  const STYLE_ID='ms8272ExactSerenityHeroStyle';
  let photoUrl='';
  let photoPromise=null;
  let observer=null;
  let queued=false;

  const norm=value=>String(value||'').replace(/\s+/g,' ').trim();

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const version=document.getElementById('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
  }

  function loadBase(){
    return new Promise(resolve=>{
      if(window.__ms8270LiveSerenityHeader){resolve();return;}
      let script=document.querySelector('script[data-ms8272-base]');
      if(script){
        script.addEventListener('load',resolve,{once:true});
        setTimeout(resolve,5000);
        return;
      }
      script=document.createElement('script');
      script.src=BASE;
      script.async=false;
      script.dataset.ms8272Base='1';
      script.onload=resolve;
      script.onerror=()=>{console.error('MijnSerenity basis kon niet worden geladen.');resolve();};
      (document.head||document.documentElement).appendChild(script);
      setTimeout(resolve,5000);
    });
  }

  async function loadPhoto(){
    if(photoUrl)return photoUrl;
    if(photoPromise)return photoPromise;
    photoPromise=(async()=>{
      const chunks=[];
      for(const path of PARTS){
        const response=await fetch(path,{cache:'no-store',credentials:'same-origin'});
        if(!response.ok)throw new Error(`Serenity-headerdeel ${response.status}: ${path}`);
        chunks.push((await response.text()).trim());
      }
      const base64=chunks.join('').replace(/\s+/g,'');
      if(!base64.startsWith('/9j/'))throw new Error('Serenity-header is geen geldige JPEG');
      photoUrl=`data:image/jpeg;base64,${base64}`;
      return photoUrl;
    })().catch(error=>{
      console.error('Serenity-headerfoto kon niet worden opgebouwd.',error);
      photoPromise=null;
      return '';
    });
    return photoPromise;
  }

  function installStyle(){
    document.getElementById(STYLE_ID)?.remove();
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #ms8210Start{width:100%!important;max-width:none!important;margin:0!important;padding:0!important;background:#031421!important;color:#fff!important}
      #ms8210Start .ms8210-shell{width:100%!important;max-width:none!important;margin:0!important;padding:0!important}

      html #ms8210Start .ms8234-header.ms8272-exact{
        position:relative!important;isolation:isolate!important;box-sizing:border-box!important;
        width:100%!important;max-width:none!important;min-height:740px!important;margin:0!important;
        padding:0!important;overflow:hidden!important;border:1px solid rgba(55,201,244,.36)!important;
        border-radius:30px!important;background-color:#041725!important;
        background-image:
          linear-gradient(90deg,rgba(0,13,23,.82) 0%,rgba(0,13,23,.58) 29%,rgba(0,13,23,.18) 51%,rgba(0,13,23,.02) 70%,rgba(0,13,23,.10) 100%),
          linear-gradient(0deg,rgba(1,12,20,.64) 0%,rgba(1,12,20,.12) 38%,rgba(1,12,20,0) 65%),
          var(--ms8272-photo,var(--ms8270-real-photo))!important;
        background-size:cover!important;background-position:center center!important;background-repeat:no-repeat!important;
        box-shadow:inset 0 0 0 1px rgba(79,218,255,.06),0 18px 48px rgba(0,0,0,.30)!important;
      }
      html #ms8210Start .ms8234-header.ms8272-exact::before,
      html #ms8210Start .ms8234-header.ms8272-exact::after{display:none!important;content:none!important}

      #ms8210Start .ms8272-exact .ms8234-brand{
        position:absolute!important;z-index:20!important;left:58px!important;top:32px!important;
        width:auto!important;max-width:430px!important;margin:0!important;padding:0!important;background:none!important;border:0!important;
      }
      #ms8210Start .ms8272-exact .ms8234-brand h1,
      #ms8210Start .ms8272-exact .ms8218-serenity-brand,
      #ms8210Start .ms8272-exact .ms8218-brand-lockup{
        display:block!important;margin:0!important;padding:0!important;color:#20cef6!important;
        font-family:Georgia,"Times New Roman",serif!important;font-size:72px!important;font-weight:500!important;
        line-height:.90!important;letter-spacing:-.055em!important;text-shadow:0 3px 18px rgba(0,0,0,.56)!important;
      }
      #ms8210Start .ms8272-exact .ms8218-brand-sail{display:none!important}
      #ms8210Start .ms8272-exact .ms8254-tagline,
      #ms8210Start .ms8272-brand-tagline{
        display:block!important;margin:11px 0 0 4px!important;color:#f7fbff!important;
        font:800 11px/1.1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        letter-spacing:.26em!important;text-transform:uppercase!important;text-shadow:0 2px 10px rgba(0,0,0,.78)!important;
      }

      #ms8210Start .ms8272-exact .ms8234-greeting,
      #ms8210Start .ms8272-exact .ms8245-date,
      #ms8210Start .ms8272-exact .ms8234-attention,
      #ms8210Start .ms8272-exact .ms8234-gauges,
      #ms8210Start .ms8272-exact .ms8234-summary,
      #ms8210Start .ms8272-exact .ms8263-vrijon-hero,
      #ms8210Start .ms8272-exact .ms8263-vrijon-lockup,
      #ms8210Start .ms8272-exact .ms8263-vrijon-svg,
      #ms8210Start .ms8272-exact .ms8234-sail{display:none!important}

      #ms8210Start .ms8272-night{
        position:absolute!important;z-index:30!important;right:48px!important;top:31px!important;
        display:flex!important;align-items:center!important;justify-content:center!important;gap:11px!important;
        min-width:146px!important;height:54px!important;margin:0!important;padding:0 20px!important;
        border:1px solid rgba(71,206,247,.27)!important;border-radius:999px!important;
        background:rgba(2,32,51,.90)!important;color:#fff!important;
        font:800 17px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        box-shadow:0 10px 28px rgba(0,0,0,.24)!important;backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important;
      }
      #ms8210Start .ms8272-night .ms8272-moon{color:#32d7fb!important;font-size:25px!important;line-height:1!important}
      #ms8210Start .ms8272-night .ms8272-down{font-size:18px!important;opacity:.9!important}

      #ms8210Start .ms8272-exact .ms8234-hero{
        position:absolute!important;z-index:18!important;left:58px!important;top:196px!important;
        width:min(650px,48vw)!important;max-width:650px!important;margin:0!important;padding:0!important;
        border:0!important;background:transparent!important;box-shadow:none!important;color:#fff!important;text-shadow:none!important;
      }
      #ms8210Start .ms8272-exact .ms8234-hero::before,
      #ms8210Start .ms8272-exact .ms8234-hero::after{display:none!important}
      #ms8210Start .ms8272-eyebrow{
        display:block!important;margin:0 0 15px!important;color:#32d8fb!important;
        font:900 14px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        letter-spacing:.21em!important;text-transform:uppercase!important;text-shadow:0 2px 10px rgba(0,0,0,.72)!important;
      }
      #ms8210Start .ms8272-exact .ms8234-hero h2{
        max-width:620px!important;margin:0 0 10px!important;color:#fff!important;
        font:900 66px/.96 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        letter-spacing:-.052em!important;text-wrap:balance!important;text-shadow:0 3px 16px rgba(0,0,0,.68)!important;
      }
      #ms8210Start .ms8272-subtitle{
        max-width:650px!important;margin:0 0 20px!important;color:#f1f8fc!important;
        font:600 17px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        text-shadow:0 2px 12px rgba(0,0,0,.82)!important;
      }

      #ms8210Start .ms8272-exact .ms8234-live-metrics{
        display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:0!important;
        width:100%!important;max-width:620px!important;margin:18px 0 17px!important;padding:12px 10px!important;
        border:1px solid rgba(61,211,251,.34)!important;border-radius:22px!important;
        background:rgba(2,25,41,.73)!important;box-shadow:0 12px 30px rgba(0,0,0,.22)!important;
        backdrop-filter:blur(18px) saturate(125%)!important;-webkit-backdrop-filter:blur(18px) saturate(125%)!important;text-shadow:none!important;
      }
      #ms8210Start .ms8272-exact .ms8234-live-metric{min-width:0!important;padding:0 16px!important;border-right:1px solid rgba(160,220,240,.24)!important}
      #ms8210Start .ms8272-exact .ms8234-live-metric:last-child{border-right:0!important}
      #ms8210Start .ms8272-exact .ms8234-live-copy strong{color:#fff!important;font-size:20px!important;line-height:1.05!important;font-weight:850!important}
      #ms8210Start .ms8272-exact .ms8234-live-copy small{color:#b8cad7!important;font-size:12px!important}

      #ms8210Start .ms8272-live-button{
        display:flex!important;align-items:center!important;justify-content:center!important;gap:14px!important;
        width:510px!important;max-width:100%!important;min-height:70px!important;margin:0!important;padding:14px 24px!important;
        border:1px solid rgba(143,240,255,.68)!important;border-radius:22px!important;
        background:linear-gradient(105deg,#13b7dd,#26d0eb)!important;color:#fff!important;
        font:850 20px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        box-shadow:0 15px 36px rgba(0,174,218,.31),inset 0 1px 0 rgba(255,255,255,.24)!important;text-shadow:none!important;
      }
      #ms8210Start .ms8272-live-button:active{transform:scale(.99)!important}
      #ms8210Start .ms8272-live-button .ms8272-play{font-size:21px!important}
      #ms8210Start .ms8272-live-button .ms8272-chevron{margin-left:5px!important;font-size:28px!important;opacity:.92!important}

      #ms8210Start .ms8272-exact .ms8234-status-grid{
        position:absolute!important;z-index:22!important;left:52px!important;right:52px!important;bottom:28px!important;
        display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:12px!important;
        width:auto!important;margin:0!important;padding:0!important;
      }
      #ms8210Start .ms8272-exact .ms8234-status{
        min-width:0!important;min-height:97px!important;margin:0!important;padding:15px 16px!important;
        border:1px solid rgba(58,204,246,.40)!important;border-radius:22px!important;
        background:rgba(2,30,48,.78)!important;color:#fff!important;
        box-shadow:0 12px 28px rgba(0,0,0,.23),inset 0 1px 0 rgba(255,255,255,.04)!important;
        backdrop-filter:blur(18px) saturate(126%)!important;-webkit-backdrop-filter:blur(18px) saturate(126%)!important;text-shadow:none!important;
      }
      #ms8210Start .ms8272-exact .ms8234-status-copy strong{color:#fff!important;font-size:17px!important;font-weight:850!important}
      #ms8210Start .ms8272-exact .ms8234-status-copy small,
      #ms8210Start .ms8272-exact .ms8245-status-sub{color:#aec4d3!important;font-size:11px!important}

      #ms8210Start .ms8272-duplicate{display:none!important}

      @media(max-width:1100px){
        html #ms8210Start .ms8234-header.ms8272-exact{min-height:720px!important}
        #ms8210Start .ms8272-exact .ms8234-brand{left:40px!important;top:30px!important}
        #ms8210Start .ms8272-exact .ms8234-brand h1,#ms8210Start .ms8272-exact .ms8218-brand-lockup{font-size:62px!important}
        #ms8210Start .ms8272-exact .ms8234-hero{left:40px!important;top:185px!important;width:min(610px,55vw)!important}
        #ms8210Start .ms8272-exact .ms8234-hero h2{font-size:58px!important}
        #ms8210Start .ms8272-night{right:38px!important}
        #ms8210Start .ms8272-exact .ms8234-status-grid{left:32px!important;right:32px!important;gap:9px!important}
      }
      @media(max-width:760px){
        html #ms8210Start .ms8234-header.ms8272-exact{min-height:900px!important;border-radius:24px!important;background-position:57% center!important}
        #ms8210Start .ms8272-exact .ms8234-brand{left:20px!important;top:22px!important;max-width:55%!important}
        #ms8210Start .ms8272-exact .ms8234-brand h1,#ms8210Start .ms8272-exact .ms8218-brand-lockup{font-size:48px!important}
        #ms8210Start .ms8272-exact .ms8254-tagline,#ms8210Start .ms8272-brand-tagline{font-size:8px!important;letter-spacing:.18em!important}
        #ms8210Start .ms8272-night{right:14px!important;top:18px!important;min-width:112px!important;height:44px!important;padding:0 13px!important;font-size:14px!important}
        #ms8210Start .ms8272-exact .ms8234-hero{left:20px!important;right:20px!important;top:155px!important;width:auto!important;max-width:none!important}
        #ms8210Start .ms8272-exact .ms8234-hero h2{font-size:44px!important;max-width:92%!important}
        #ms8210Start .ms8272-subtitle{font-size:14px!important;max-width:94%!important}
        #ms8210Start .ms8272-live-button{width:100%!important;min-height:58px!important;font-size:17px!important}
        #ms8210Start .ms8272-exact .ms8234-status-grid{left:12px!important;right:12px!important;bottom:14px!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important}
        #ms8210Start .ms8272-exact .ms8234-status{min-height:86px!important;padding:11px 10px!important;border-radius:18px!important}
        #ms8210Start .ms8272-exact .ms8234-status:last-child:nth-child(odd){grid-column:1/-1!important}
      }
    `;
    (document.head||document.documentElement).appendChild(style);
  }

  function ensureBrand(header){
    let brand=header.querySelector('.ms8234-brand');
    if(!brand){brand=document.createElement('div');brand.className='ms8234-brand';header.prepend(brand)}
    brand.innerHTML='<h1 class="ms8218-serenity-brand">Serenity</h1><div class="ms8254-tagline ms8272-brand-tagline">EXPLORE · NAVIGATE · ENJOY</div>';
  }

  function navigate(route){
    try{
      if(typeof window.captainNavigate==='function'){
        window.captainNavigate(route,document.querySelector(`.bottom-nav .bottom-nav-item[data-target="${route}"]`)||null);
        return;
      }
      document.querySelector(`.bottom-nav .bottom-nav-item[data-target="${route}"] ,.tabs [data-target="${route}"] ,[data-ms8210-target="${route}"]`)?.click();
    }catch(error){console.warn(`Navigatie naar ${route} mislukt:`,error)}
  }

  function ensureNight(root,header){
    let night=[...root.querySelectorAll('button,[role="button"]')].find(node=>{
      const text=norm(node.textContent).toLowerCase();
      return text==='nacht'||text.startsWith('nacht ')||text.includes(' nacht');
    });
    if(!night){
      night=document.createElement('button');
      night.type='button';
      night.innerHTML='<span class="ms8272-moon" aria-hidden="true">☾</span><span>Nacht</span><span class="ms8272-down" aria-hidden="true">⌄</span>';
      night.addEventListener('click',()=>{
        const candidates=[...document.querySelectorAll('button,select,[role="button"]')].filter(node=>node!==night);
        const target=candidates.find(node=>/nacht|donker|dark/i.test(norm(node.textContent)||String(node.value||'')));
        if(target){try{target.click();return}catch{}}
        document.documentElement.classList.toggle('dark');
        document.body?.classList.toggle('dark');
        window.dispatchEvent(new CustomEvent('mijnserenity:theme-changed'));
      });
    }
    night.classList.add('ms8272-night');
    if(!night.querySelector('.ms8272-moon'))night.innerHTML='<span class="ms8272-moon" aria-hidden="true">☾</span><span>Nacht</span><span class="ms8272-down" aria-hidden="true">⌄</span>';
    if(night.parentElement!==header)header.appendChild(night);
  }

  function ensureHero(root,header){
    let hero=root.querySelector('.ms8234-hero');
    if(!hero){hero=document.createElement('section');hero.className='ms8234-hero'}
    if(hero.parentElement!==header)header.appendChild(hero);

    [...hero.children].forEach(node=>{
      const text=norm(node.textContent);
      if(text==='WELKOM TERUG'||text==='De Serenity ligt klaar. Waar brengt de volgende reis je naartoe?'||text==='Start live varen')node.classList.add('ms8272-duplicate');
    });

    let eyebrow=hero.querySelector('.ms8272-eyebrow');
    if(!eyebrow){eyebrow=document.createElement('span');eyebrow.className='ms8272-eyebrow';hero.prepend(eyebrow)}
    eyebrow.textContent='WELKOM TERUG';

    let heading=hero.querySelector('h2');
    if(!heading){heading=document.createElement('h2');eyebrow.insertAdjacentElement('afterend',heading)}
    heading.textContent='Klaar om te gaan varen?';

    let subtitle=hero.querySelector('.ms8272-subtitle');
    if(!subtitle){subtitle=document.createElement('p');subtitle.className='ms8272-subtitle';heading.insertAdjacentElement('afterend',subtitle)}
    subtitle.textContent='De Serenity ligt klaar. Waar brengt de volgende reis je naartoe?';

    let metrics=hero.querySelector('.ms8234-live-metrics');
    if(metrics&&metrics.parentElement!==hero)hero.appendChild(metrics);

    let button=hero.querySelector('.ms8272-live-button');
    if(!button){
      button=document.createElement('button');button.type='button';button.className='ms8272-live-button';
      button.innerHTML='<span class="ms8272-play" aria-hidden="true">▶</span><span>Start live varen</span><span class="ms8272-chevron" aria-hidden="true">›</span>';
      button.addEventListener('click',event=>{event.preventDefault();navigate('live')});
      hero.appendChild(button);
    }

    [...root.querySelectorAll('button,a')].forEach(node=>{
      if(node!==button&&norm(node.textContent)==='Start live varen')node.classList.add('ms8272-duplicate');
    });
    [...root.querySelectorAll('p,div,span')].forEach(node=>{
      if(node!==subtitle&&node!==eyebrow&&node.children.length===0){
        const text=norm(node.textContent);
        if(text==='De Serenity ligt klaar. Waar brengt de volgende reis je naartoe?'||text==='WELKOM TERUG')node.classList.add('ms8272-duplicate');
      }
    });
  }

  function integrate(url=''){
    syncBuild();installStyle();
    const root=document.getElementById('ms8210Start');if(!root)return false;
    const header=root.querySelector('.ms8234-header')||root.querySelector('.ms8210-header');if(!header)return false;
    header.classList.remove('ms8271-unified');
    header.classList.add('ms8272-exact');
    header.dataset.msHeroBuild='8272';
    if(url)header.style.setProperty('--ms8272-photo',`url("${url}")`);
    ensureBrand(header);
    ensureHero(root,header);
    const statusGrid=root.querySelector('.ms8234-status-grid');
    if(statusGrid&&statusGrid.parentElement!==header)header.appendChild(statusGrid);
    ensureNight(root,header);
    return true;
  }

  function queue(){
    if(queued)return;queued=true;
    requestAnimationFrame(async()=>{queued=false;integrate(await loadPhoto())});
  }

  function watch(){
    const root=document.getElementById('ms8210Start');
    if(!root||observer)return;
    observer=new MutationObserver(queue);
    observer.observe(root,{childList:true,subtree:true});
    setTimeout(()=>{observer?.disconnect();observer=null},25000);
  }

  function start(){
    syncBuild();installStyle();
    void loadPhoto().then(integrate);
    [80,220,500,1000,1800,3200,5200,8000].forEach(ms=>setTimeout(()=>{void loadPhoto().then(integrate);watch()},ms));
    ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:start-requested','mijnserenity:routechange','mijnserenity:theme-changed','pageshow','online']
      .forEach(type=>window.addEventListener(type,queue,{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()},{passive:true});
    window.addEventListener('resize',queue,{passive:true});
    console.info(`MijnSerenity ${BUILD}: exacte Serenity startheader actief.`);
  }

  loadBase().finally(start);
})();
