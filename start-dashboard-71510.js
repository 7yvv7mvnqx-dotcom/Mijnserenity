/* MijnSerenity 8.27.7 — harde live fix voor de Serenity startheader. */
(()=>{
  'use strict';
  if(window.__ms8277HardHero)return;
  window.__ms8277HardHero=true;

  const BUILD='8.27.7';
  const CORE='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@30cb7aa9bb709e5d8371c83622883f87ca83c486/start-dashboard-71510.js?v=827600';
  const PHOTO='/assets/serenity-hero-8275.jpg?v=827700';
  const STYLE_ID='ms8277HardHeroStyle';
  let corePromise=null;
  let patchQueued=false;

  const norm=v=>String(v||'').replace(/\s+/g,' ').trim();

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const version=document.getElementById('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(n=>n.textContent=BUILD);
  }

  function loadCore(){
    if(window.__ms8276SolidHeader)return Promise.resolve();
    if(corePromise)return corePromise;
    corePromise=new Promise(resolve=>{
      let s=document.querySelector('script[data-ms8277-core]');
      if(s){
        if(window.__ms8276SolidHeader)resolve();
        else{
          s.addEventListener('load',resolve,{once:true});
          setTimeout(resolve,5000);
        }
        return;
      }
      s=document.createElement('script');
      s.src=CORE;
      s.async=false;
      s.crossOrigin='anonymous';
      s.dataset.ms8277Core='1';
      s.onload=resolve;
      s.onerror=()=>{
        console.error('MijnSerenity 8.27.7: startkern kon niet worden geladen.');
        resolve();
      };
      (document.head||document.documentElement).appendChild(s);
      setTimeout(resolve,5000);
    });
    return corePromise;
  }

  function installStyle(){
    let style=document.getElementById(STYLE_ID);
    if(!style){
      style=document.createElement('style');
      style.id=STYLE_ID;
      (document.head||document.documentElement).appendChild(style);
    }
    style.textContent=`
      html body #ms8210Start .ms8234-header.ms8276-solid.ms8277-hard-hero{
        position:relative!important;
        isolation:isolate!important;
        overflow:hidden!important;
        width:100%!important;
        max-width:none!important;
        min-height:clamp(640px,68vh,720px)!important;
        margin:0!important;
        padding:0!important;
        border:1px solid rgba(55,201,244,.34)!important;
        border-radius:30px!important;
        background:#041725!important;
        background-image:none!important;
        box-shadow:inset 0 0 0 1px rgba(79,218,255,.05),0 18px 48px rgba(0,0,0,.28)!important;
      }
      html body #ms8210Start .ms8277-hard-hero>.ms8277-photo{
        display:block!important;
        visibility:visible!important;
        opacity:1!important;
        position:absolute!important;
        inset:0!important;
        z-index:0!important;
        width:100%!important;
        height:100%!important;
        max-width:none!important;
        max-height:none!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
        object-fit:cover!important;
        object-position:62% 53%!important;
        pointer-events:none!important;
        user-select:none!important;
      }
      html body #ms8210Start .ms8277-hard-hero>.ms8277-overlay{
        display:block!important;
        position:absolute!important;
        inset:0!important;
        z-index:1!important;
        pointer-events:none!important;
        background:
          linear-gradient(90deg,rgba(0,13,23,.92) 0%,rgba(0,13,23,.76) 28%,rgba(0,13,23,.36) 51%,rgba(0,13,23,.10) 73%,rgba(0,13,23,.04) 100%),
          linear-gradient(0deg,rgba(1,12,20,.72) 0%,rgba(1,12,20,.15) 42%,rgba(1,12,20,.06) 72%)!important;
      }
      html body #ms8210Start .ms8277-hard-hero>.ms8234-brand,
      html body #ms8210Start .ms8277-hard-hero>.ms8234-hero,
      html body #ms8210Start .ms8277-hard-hero>.ms8234-status-grid,
      html body #ms8210Start .ms8277-hard-hero>.ms8276-night{
        z-index:20!important;
      }
      html body #ms8210Start .ms8277-hard-hero>.ms8234-brand{
        left:clamp(28px,4vw,58px)!important;
        top:clamp(26px,3.2vw,38px)!important;
      }
      html body #ms8210Start .ms8277-hard-hero>.ms8234-hero{
        left:clamp(28px,4vw,58px)!important;
        top:clamp(176px,20vh,204px)!important;
        width:min(650px,50vw)!important;
        max-width:650px!important;
      }
      html body #ms8210Start .ms8277-hard-hero .ms8276-title{
        font-size:clamp(54px,4.45vw,66px)!important;
        line-height:.96!important;
      }
      html body #ms8210Start .ms8277-hard-hero .ms8276-subtitle{
        max-width:620px!important;
        margin-bottom:18px!important;
      }
      html body #ms8210Start .ms8277-hard-hero .ms8234-live-metrics{
        max-width:620px!important;
        background:rgba(2,25,41,.68)!important;
        backdrop-filter:blur(16px) saturate(120%)!important;
        -webkit-backdrop-filter:blur(16px) saturate(120%)!important;
      }
      html body #ms8210Start .ms8277-hard-hero .ms8276-live-button{
        width:min(510px,100%)!important;
        min-height:66px!important;
      }
      html body #ms8210Start .ms8277-hard-hero>.ms8234-status-grid{
        left:clamp(24px,3.5vw,52px)!important;
        right:clamp(24px,3.5vw,52px)!important;
        bottom:24px!important;
      }
      html body #ms8210Start .ms8277-hard-hero.ms8277-has-attention>.ms8276-night{
        top:88px!important;
      }
      .ms8277-hide-duplicate{
        display:none!important;
        visibility:hidden!important;
        width:0!important;
        height:0!important;
        min-width:0!important;
        min-height:0!important;
        margin:0!important;
        padding:0!important;
        overflow:hidden!important;
        pointer-events:none!important;
      }
      @media(max-width:1100px){
        html body #ms8210Start .ms8234-header.ms8276-solid.ms8277-hard-hero{min-height:680px!important;}
        html body #ms8210Start .ms8277-hard-hero>.ms8277-photo{object-position:68% 52%!important;}
        html body #ms8210Start .ms8277-hard-hero>.ms8234-hero{width:min(610px,56vw)!important;}
      }
      @media(max-width:760px){
        html body #ms8210Start .ms8234-header.ms8276-solid.ms8277-hard-hero{min-height:820px!important;border-radius:24px!important;}
        html body #ms8210Start .ms8277-hard-hero>.ms8277-photo{object-position:66% 48%!important;}
        html body #ms8210Start .ms8277-hard-hero>.ms8277-overlay{
          background:linear-gradient(90deg,rgba(0,13,23,.90),rgba(0,13,23,.43)),linear-gradient(0deg,rgba(1,12,20,.88),rgba(1,12,20,.10) 62%)!important;
        }
        html body #ms8210Start .ms8277-hard-hero>.ms8234-brand{left:20px!important;top:22px!important;max-width:65%!important;}
        html body #ms8210Start .ms8277-hard-hero>.ms8234-hero{left:20px!important;right:20px!important;top:160px!important;width:auto!important;max-width:none!important;}
        html body #ms8210Start .ms8277-hard-hero .ms8276-title{font-size:44px!important;max-width:94%!important;}
        html body #ms8210Start .ms8277-hard-hero>.ms8234-status-grid{left:12px!important;right:12px!important;bottom:14px!important;}
        html body #ms8210Start .ms8277-hard-hero.ms8277-has-attention>.ms8276-night{top:78px!important;}
      }
    `;
  }

  function hideDuplicateTaglines(header){
    const wanted=new Set([
      'explore · navigate · enjoy',
      'explore • navigate • enjoy',
      'explore - navigate - enjoy'
    ]);
    document.querySelectorAll('body *').forEach(el=>{
      if(header?.querySelector(':scope > .ms8234-brand')?.contains(el))return;
      if(el.children.length>1)return;
      const text=norm(el.textContent).toLowerCase().replace(/[›>]+$/,'').trim();
      if(wanted.has(text))el.classList.add('ms8277-hide-duplicate');
    });
  }

  function detectAttention(header){
    if(!header)return;
    let hasAttention=false;
    document.querySelectorAll('button,[role="button"],a').forEach(el=>{
      if(header.contains(el))return;
      const text=norm(el.textContent).toLowerCase();
      if(text && text.length<100 && text.includes('aandachtspunt'))hasAttention=true;
    });
    header.classList.toggle('ms8277-has-attention',hasAttention);
  }

  function ensurePhoto(header){
    if(!header)return;
    let photo=header.querySelector(':scope > .ms8277-photo');
    if(!photo){
      photo=document.createElement('img');
      photo.className='ms8277-photo';
      photo.alt='';
      photo.setAttribute('aria-hidden','true');
      photo.decoding='async';
      photo.loading='eager';
      photo.fetchPriority='high';
      photo.src=PHOTO;
      header.prepend(photo);
    }else if(!String(photo.getAttribute('src')||'').includes('827700')){
      photo.src=PHOTO;
    }

    let overlay=header.querySelector(':scope > .ms8277-overlay');
    if(!overlay){
      overlay=document.createElement('div');
      overlay.className='ms8277-overlay';
      overlay.setAttribute('aria-hidden','true');
      photo.insertAdjacentElement('afterend',overlay);
    }
  }

  function patch(){
    syncBuild();
    installStyle();
    const root=document.getElementById('ms8210Start');
    const header=root?.querySelector('.ms8234-header.ms8276-solid')||root?.querySelector('.ms8234-header');
    if(!root||!header){
      hideDuplicateTaglines(null);
      return false;
    }
    header.classList.add('ms8277-hard-hero');
    header.dataset.msHeroBuild='8277';
    ensurePhoto(header);
    hideDuplicateTaglines(header);
    detectAttention(header);
    return true;
  }

  function queuePatch(){
    if(patchQueued)return;
    patchQueued=true;
    requestAnimationFrame(()=>{
      patchQueued=false;
      patch();
    });
  }

  async function boot(){
    syncBuild();
    await loadCore();
    installStyle();
    patch();

    [100,250,500,900,1500,2600,4500,7500,11500].forEach(ms=>setTimeout(patch,ms));
    ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:start-requested','mijnserenity:routechange','mijnserenity:theme-changed','pageshow','online']
      .forEach(type=>window.addEventListener(type,queuePatch,{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)queuePatch()},{passive:true});
    window.addEventListener('resize',queuePatch,{passive:true});

    const root=document.getElementById('ms8210Start');
    if(root){
      const observer=new MutationObserver(queuePatch);
      observer.observe(root,{childList:true,subtree:true});
    }
    console.info(`MijnSerenity ${BUILD}: harde live hero-fix actief.`);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
