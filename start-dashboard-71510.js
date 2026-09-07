/* MijnSerenity 8.27.1 — samengevoegde beeldvullende Serenity-header */
(()=>{
  'use strict';
  if(window.__ms8271UnifiedHero)return;
  window.__ms8271UnifiedHero=true;

  const BUILD='8.27.1';
  const BASE='/start-dashboard-8270-base.js?v=827101';
  const PARTS=[
    '/assets/serenity-header-8270-01.txt?v=827101',
    '/assets/serenity-header-8270-02.txt?v=827101'
  ];
  const STYLE_ID='ms8271UnifiedHeroStyle';
  let photoUrl='';
  let photoPromise=null;
  let observer=null;
  let refreshQueued=false;

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
      let script=document.querySelector('script[data-ms8271-base]');
      if(script){
        script.addEventListener('load',resolve,{once:true});
        setTimeout(resolve,5000);
        return;
      }
      script=document.createElement('script');
      script.src=BASE;
      script.async=false;
      script.dataset.ms8271Base='1';
      script.onload=resolve;
      script.onerror=()=>{console.error('MijnSerenity 8.27.0 basis kon niet worden geladen.');resolve();};
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
      if(!base64.startsWith('/9j/'))throw new Error('Nieuwe Serenity-header is geen geldige JPEG');
      photoUrl=`data:image/jpeg;base64,${base64}`;
      return photoUrl;
    })().catch(error=>{
      console.error('Nieuwe Serenity-headerfoto kon niet worden opgebouwd.',error);
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
      #ms8210Start{width:100%!important;max-width:none!important;margin:0!important;padding:0!important;background:#031421!important}
      #ms8210Start .ms8210-shell{width:100%!important;max-width:none!important;margin:0!important;padding:0!important}
      html #ms8210Start .ms8234-header.ms8271-unified{position:relative!important;isolation:isolate!important;width:100%!important;max-width:none!important;min-height:clamp(720px,calc(100dvh - 12px),980px)!important;margin:0!important;padding:clamp(24px,3vw,48px)!important;padding-bottom:clamp(178px,18vh,225px)!important;overflow:hidden!important;border:1px solid rgba(57,201,244,.40)!important;border-radius:clamp(20px,2.2vw,34px)!important;background-color:#041725!important;background-image:linear-gradient(90deg,rgba(1,12,20,.84) 0%,rgba(1,12,20,.61) 29%,rgba(1,12,20,.22) 52%,rgba(1,12,20,.05) 72%,rgba(1,12,20,.18) 100%),linear-gradient(0deg,rgba(1,10,18,.80) 0%,rgba(1,10,18,.26) 26%,rgba(1,10,18,.02) 62%),var(--ms8271-photo,var(--ms8270-real-photo))!important;background-size:cover!important;background-position:center center!important;background-repeat:no-repeat!important;box-shadow:inset 0 0 0 1px rgba(54,203,246,.07),0 20px 48px rgba(0,0,0,.30)!important}
      html #ms8210Start .ms8234-header.ms8271-unified::before,html #ms8210Start .ms8234-header.ms8271-unified::after{opacity:0!important;background:none!important;pointer-events:none!important}
      #ms8210Start .ms8271-unified .ms8234-brand{position:absolute!important;z-index:5!important;left:clamp(26px,4vw,70px)!important;top:clamp(24px,4vh,54px)!important;width:auto!important;max-width:min(44%,500px)!important}
      #ms8210Start .ms8271-unified .ms8234-brand h1,#ms8210Start .ms8271-unified .ms8218-serenity-brand,#ms8210Start .ms8271-unified .ms8218-brand-lockup{color:#35c9f4!important;text-shadow:0 3px 18px rgba(0,0,0,.72)!important}
      #ms8210Start .ms8271-unified .ms8254-tagline{color:#f8fcff!important;text-shadow:0 2px 12px rgba(0,0,0,.82)!important}
      #ms8210Start .ms8271-unified .ms8234-greeting{position:absolute!important;z-index:5!important;left:clamp(26px,4vw,70px)!important;top:clamp(142px,18vh,196px)!important;color:#fff!important;text-shadow:0 3px 16px rgba(0,0,0,.82)!important}
      #ms8210Start .ms8271-unified .ms8245-date{color:#d0e2ee!important;text-shadow:0 2px 12px rgba(0,0,0,.80)!important}
      #ms8210Start .ms8271-unified .ms8234-attention{position:absolute!important;z-index:8!important;left:auto!important;right:clamp(22px,3vw,54px)!important;top:clamp(22px,3vh,46px)!important;width:min(360px,31vw)!important;max-width:360px!important;min-width:250px!important;padding:16px 18px!important;border:1px solid rgba(67,205,246,.34)!important;border-radius:24px!important;background:rgba(3,29,47,.88)!important;color:#fff!important;box-shadow:0 16px 38px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.05)!important;backdrop-filter:blur(18px) saturate(125%)!important;-webkit-backdrop-filter:blur(18px) saturate(125%)!important}
      #ms8210Start .ms8271-unified .ms8234-attention-copy strong{color:#fff!important}#ms8210Start .ms8271-unified .ms8234-attention-copy small{color:#b4cad9!important}
      #ms8210Start .ms8271-unified .ms8271-night-control{position:absolute!important;z-index:9!important;right:clamp(22px,3vw,54px)!important;top:clamp(128px,15vh,156px)!important;width:auto!important;min-width:0!important;margin:0!important;padding:10px 16px!important;border:1px solid rgba(70,208,248,.28)!important;border-radius:999px!important;background:rgba(3,27,44,.86)!important;color:#fff!important;box-shadow:0 10px 28px rgba(0,0,0,.28)!important;backdrop-filter:blur(16px)!important;-webkit-backdrop-filter:blur(16px)!important}
      #ms8210Start .ms8271-unified .ms8234-hero{position:absolute!important;z-index:6!important;left:clamp(26px,4vw,70px)!important;top:clamp(245px,33vh,330px)!important;width:min(690px,47vw)!important;max-width:690px!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;color:#fff!important;text-shadow:0 3px 16px rgba(0,0,0,.78)!important}
      #ms8210Start .ms8271-unified .ms8234-hero::before,#ms8210Start .ms8271-unified .ms8234-hero::after{display:none!important}
      #ms8210Start .ms8271-eyebrow{display:block!important;margin:0 0 12px!important;color:#35d0f6!important;font-size:clamp(11px,1.1vw,15px)!important;line-height:1!important;font-weight:900!important;letter-spacing:.19em!important;text-transform:uppercase!important}
      #ms8210Start .ms8271-unified .ms8234-hero h2{max-width:620px!important;margin:0 0 10px!important;color:#fff!important;font-size:clamp(38px,4.6vw,74px)!important;line-height:.98!important;font-weight:900!important;letter-spacing:-.045em!important;text-wrap:balance!important}
      #ms8210Start .ms8271-subtitle{max-width:690px!important;margin:0 0 18px!important;color:#eef8ff!important;font-size:clamp(14px,1.35vw,20px)!important;line-height:1.35!important;font-weight:600!important;text-shadow:0 2px 12px rgba(0,0,0,.86)!important}
      #ms8210Start .ms8271-unified .ms8234-live-metrics{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:0!important;width:100%!important;max-width:680px!important;margin:18px 0 16px!important;padding:13px 10px!important;border:1px solid rgba(54,203,246,.34)!important;border-radius:22px!important;background:rgba(2,22,36,.70)!important;box-shadow:0 12px 32px rgba(0,0,0,.22)!important;backdrop-filter:blur(16px) saturate(125%)!important;-webkit-backdrop-filter:blur(16px) saturate(125%)!important;text-shadow:none!important}
      #ms8210Start .ms8271-unified .ms8234-live-metric{min-width:0!important;padding:0 14px!important;border-right:1px solid rgba(148,211,235,.24)!important}#ms8210Start .ms8271-unified .ms8234-live-metric:last-child{border-right:0!important}#ms8210Start .ms8271-unified .ms8234-live-copy strong{color:#fff!important;font-size:clamp(15px,1.4vw,20px)!important}#ms8210Start .ms8271-unified .ms8234-live-copy small{color:#b5cad8!important}
      #ms8210Start .ms8271-live-button{display:flex!important;align-items:center!important;justify-content:center!important;gap:12px!important;width:min(100%,520px)!important;min-height:64px!important;margin:14px 0 0!important;padding:14px 24px!important;border:1px solid rgba(130,237,255,.65)!important;border-radius:22px!important;background:linear-gradient(105deg,#0daed8,#27c9e8)!important;color:#fff!important;font:800 clamp(17px,1.5vw,22px)/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;box-shadow:0 14px 34px rgba(0,171,218,.30),inset 0 1px 0 rgba(255,255,255,.22)!important;text-shadow:none!important;-webkit-tap-highlight-color:transparent!important}
      #ms8210Start .ms8271-live-button:active{transform:scale(.99)!important}#ms8210Start .ms8271-live-button .ms8271-play{font-size:22px!important}#ms8210Start .ms8271-live-button .ms8271-chevron{margin-left:4px!important;font-size:25px!important;opacity:.9!important}
      #ms8210Start .ms8271-unified .ms8234-status-grid{position:absolute!important;z-index:7!important;left:clamp(18px,3vw,52px)!important;right:clamp(18px,3vw,52px)!important;bottom:clamp(18px,2.8vh,36px)!important;display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:12px!important;width:auto!important;margin:0!important;padding:0!important}
      #ms8210Start .ms8271-unified .ms8234-status{min-width:0!important;min-height:112px!important;margin:0!important;padding:15px 16px!important;border:1px solid rgba(58,202,244,.36)!important;border-radius:22px!important;background:rgba(3,27,44,.78)!important;color:#fff!important;box-shadow:0 12px 28px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.04)!important;backdrop-filter:blur(17px) saturate(125%)!important;-webkit-backdrop-filter:blur(17px) saturate(125%)!important;text-shadow:none!important}
      #ms8210Start .ms8271-unified .ms8234-status-copy strong{color:#fff!important;font-size:clamp(13px,1.2vw,18px)!important}#ms8210Start .ms8271-unified .ms8234-status-copy small,#ms8210Start .ms8271-unified .ms8245-status-sub{color:#aac4d5!important}
      @media(max-width:900px){#ms8210Start .ms8271-unified .ms8234-hero{width:min(620px,58vw)!important}#ms8210Start .ms8271-unified .ms8234-attention{width:34vw!important;min-width:220px!important}#ms8210Start .ms8271-unified .ms8234-status-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}#ms8210Start .ms8271-unified .ms8234-status{min-height:94px!important}html #ms8210Start .ms8234-header.ms8271-unified{padding-bottom:330px!important;min-height:920px!important}}
      @media(max-width:620px) and (orientation:portrait){html #ms8210Start .ms8234-header.ms8271-unified{min-height:1020px!important;padding:18px 14px 340px!important;border-radius:24px!important;background-position:55% center!important}#ms8210Start .ms8271-unified .ms8234-brand{left:18px!important;top:20px!important;width:51%!important;max-width:51%!important}#ms8210Start .ms8271-unified .ms8234-attention{right:10px!important;top:16px!important;width:43%!important;max-width:170px!important;min-width:0!important;padding:9px 10px!important;border-radius:18px!important}#ms8210Start .ms8271-unified .ms8271-night-control{right:12px!important;top:116px!important;padding:8px 12px!important;font-size:12px!important}#ms8210Start .ms8271-unified .ms8234-greeting{left:18px!important;top:145px!important;max-width:62%!important}#ms8210Start .ms8271-unified .ms8234-hero{left:18px!important;right:18px!important;top:260px!important;width:auto!important;max-width:none!important}#ms8210Start .ms8271-unified .ms8234-hero h2{font-size:clamp(34px,10vw,49px)!important;max-width:92%!important}#ms8210Start .ms8271-subtitle{font-size:14px!important;max-width:94%!important}#ms8210Start .ms8271-unified .ms8234-live-metrics{margin-top:14px!important;padding:10px 6px!important;border-radius:18px!important}#ms8210Start .ms8271-unified .ms8234-live-metric{padding:0 7px!important}#ms8210Start .ms8271-unified .ms8234-live-copy strong{font-size:13px!important}#ms8210Start .ms8271-unified .ms8234-live-copy small{font-size:9px!important}#ms8210Start .ms8271-live-button{min-height:56px!important;width:100%!important;border-radius:18px!important;font-size:17px!important}#ms8210Start .ms8271-unified .ms8234-status-grid{left:12px!important;right:12px!important;bottom:14px!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important}#ms8210Start .ms8271-unified .ms8234-status{min-height:92px!important;padding:12px 11px!important;border-radius:18px!important}#ms8210Start .ms8271-unified .ms8234-status:last-child:nth-child(odd){grid-column:1/-1!important}}
    `;
    (document.head||document.documentElement).appendChild(style);
  }

  function findNightControl(root){
    return [...root.querySelectorAll('button,select,[role="button"]')].find(node=>{
      const text=String(node.textContent||node.value||'').replace(/\s+/g,' ').trim().toLowerCase();
      return text.length>0&&text.length<28&&(text==='nacht'||text.startsWith('nacht ')||text.includes(' nacht'));
    })||null;
  }

  function ensureVoyageContent(root,header){
    let hero=root.querySelector('.ms8234-hero');
    if(hero&&hero.parentElement!==header)header.appendChild(hero);
    if(!hero)return;
    let eyebrow=hero.querySelector('.ms8271-eyebrow');
    if(!eyebrow){eyebrow=document.createElement('span');eyebrow.className='ms8271-eyebrow';eyebrow.textContent='WELKOM TERUG';hero.prepend(eyebrow)}
    const heading=hero.querySelector('h2');
    if(heading&&heading.textContent.trim()!=='Klaar om te gaan varen?')heading.textContent='Klaar om te gaan varen?';
    let subtitle=hero.querySelector('.ms8271-subtitle');
    if(!subtitle){subtitle=document.createElement('p');subtitle.className='ms8271-subtitle';subtitle.textContent='De Serenity ligt klaar. Waar brengt de volgende reis je naartoe?';if(heading)heading.insertAdjacentElement('afterend',subtitle);else hero.prepend(subtitle)}
    let button=hero.querySelector('.ms8271-live-button');
    if(!button){button=document.createElement('button');button.type='button';button.className='ms8271-live-button';button.innerHTML='<span class="ms8271-play" aria-hidden="true">▶</span><span>Start live varen</span><span class="ms8271-chevron" aria-hidden="true">›</span>';button.addEventListener('click',event=>{event.preventDefault();try{if(typeof window.captainNavigate==='function'){window.captainNavigate('live',document.querySelector('.bottom-nav .bottom-nav-item[data-target="live"]')||null);return}document.querySelector('.bottom-nav .bottom-nav-item[data-target="live"],.tabs [data-target="live"],[data-ms8210-target="live"]')?.click()}catch(error){console.warn('Live varen openen mislukt:',error)}});hero.appendChild(button)}
  }

  function integrateLayout(url=''){
    syncBuild();installStyle();
    const root=document.getElementById('ms8210Start');if(!root)return false;
    const header=root.querySelector('.ms8234-header')||root.querySelector('.ms8210-header');if(!header)return false;
    header.classList.add('ms8271-unified');header.dataset.msHeroBuild='8271';if(url)header.style.setProperty('--ms8271-photo',`url("${url}")`);
    ensureVoyageContent(root,header);
    const statusGrid=root.querySelector('.ms8234-status-grid');if(statusGrid&&statusGrid.parentElement!==header)header.appendChild(statusGrid);
    const night=findNightControl(root);if(night){night.classList.add('ms8271-night-control');if(night.parentElement!==header)header.appendChild(night)}
    return true;
  }

  function queueRefresh(){if(refreshQueued)return;refreshQueued=true;requestAnimationFrame(async()=>{refreshQueued=false;const url=await loadPhoto();integrateLayout(url)})}
  function watch(){const root=document.getElementById('ms8210Start');if(!root||observer)return;observer=new MutationObserver(queueRefresh);observer.observe(root,{childList:true,subtree:true});setTimeout(()=>{observer?.disconnect();observer=null},20000)}
  function start(){syncBuild();installStyle();void loadPhoto().then(url=>integrateLayout(url));[80,240,600,1200,2400,4800,8000].forEach(ms=>setTimeout(()=>{void loadPhoto().then(url=>integrateLayout(url));watch()},ms));['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:start-requested','mijnserenity:routechange','mijnserenity:theme-changed','pageshow','online'].forEach(type=>window.addEventListener(type,queueRefresh,{passive:true}));document.addEventListener('visibilitychange',()=>{if(!document.hidden)queueRefresh()},{passive:true});window.addEventListener('resize',queueRefresh,{passive:true});console.info(`MijnSerenity ${BUILD}: beeldvullende samengevoegde Serenity-header actief.`)}

  loadBase().finally(start);
})();