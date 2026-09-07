/* MijnSerenity 8.27.8 — robuuste iPad/desktop hero-fix: foto zichtbaar, één tagline, nette controls. */
(()=>{
  'use strict';
  if(window.__ms8278HeroFix)return;
  window.__ms8278HeroFix=true;

  const BUILD='8.27.8';
  const CORE='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@30cb7aa9bb709e5d8371c83622883f87ca83c486/start-dashboard-71510.js?v=827600';
  const PHOTO='/assets/serenity-hero-8275.jpg?v=827800';
  const STYLE_ID='ms8278HeroFixStyle';
  let corePromise=null;
  let queued=false;

  const norm=value=>String(value||'').replace(/\s+/g,' ').trim();

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const version=document.getElementById('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
  }

  function loadCore(){
    if(window.__ms8276SolidHeader)return Promise.resolve();
    if(corePromise)return corePromise;
    corePromise=new Promise(resolve=>{
      let script=document.querySelector('script[data-ms8278-core]');
      if(script){
        if(window.__ms8276SolidHeader)resolve();
        else{
          script.addEventListener('load',resolve,{once:true});
          setTimeout(resolve,5000);
        }
        return;
      }
      script=document.createElement('script');
      script.src=CORE;
      script.async=false;
      script.crossOrigin='anonymous';
      script.dataset.ms8278Core='1';
      script.onload=resolve;
      script.onerror=()=>{
        console.error('MijnSerenity 8.27.8: startkern kon niet worden geladen.');
        resolve();
      };
      (document.head||document.documentElement).appendChild(script);
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
      html body #ms8210Start,
      html body #ms8210Start .ms8210-shell{
        width:100%!important;
        max-width:none!important;
        margin:0!important;
        padding:0!important;
      }

      html body #ms8210Start .ms8234-header.ms8278-fixed{
        position:relative!important;
        isolation:isolate!important;
        box-sizing:border-box!important;
        overflow:hidden!important;
        width:100%!important;
        max-width:none!important;
        min-height:650px!important;
        height:auto!important;
        margin:0!important;
        padding:0!important;
        border:1px solid rgba(55,201,244,.34)!important;
        border-radius:30px!important;
        background-color:#041725!important;
        background-image:url("${PHOTO}")!important;
        background-size:cover!important;
        background-repeat:no-repeat!important;
        background-position:64% 52%!important;
        box-shadow:inset 0 0 0 1px rgba(79,218,255,.05),0 18px 48px rgba(0,0,0,.28)!important;
      }

      html body #ms8210Start .ms8234-header.ms8278-fixed::before,
      html body #ms8210Start .ms8234-header.ms8278-fixed::after,
      html body #ms8210Start .ms8234-header.ms8278-fixed>.ms8234-brand::before,
      html body #ms8210Start .ms8234-header.ms8278-fixed>.ms8234-brand::after,
      html body #ms8210Start .ms8234-header.ms8278-fixed>.ms8234-hero::before,
      html body #ms8210Start .ms8234-header.ms8278-fixed>.ms8234-hero::after{
        display:none!important;
        content:none!important;
      }

      html body #ms8210Start .ms8278-fixed>.ms8278-photo{
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
        object-position:64% 52%!important;
        pointer-events:none!important;
        user-select:none!important;
      }

      html body #ms8210Start .ms8278-fixed>.ms8278-overlay{
        display:block!important;
        position:absolute!important;
        inset:0!important;
        z-index:1!important;
        pointer-events:none!important;
        background:
          linear-gradient(90deg,rgba(1,16,27,.91) 0%,rgba(1,16,27,.76) 27%,rgba(1,16,27,.36) 51%,rgba(1,16,27,.09) 73%,rgba(1,16,27,.03) 100%),
          linear-gradient(0deg,rgba(1,12,20,.73) 0%,rgba(1,12,20,.18) 39%,rgba(1,12,20,.03) 68%)!important;
      }

      html body #ms8210Start .ms8278-fixed>.ms8234-brand,
      html body #ms8210Start .ms8278-fixed>.ms8234-hero,
      html body #ms8210Start .ms8278-fixed>.ms8234-status-grid,
      html body #ms8210Start .ms8278-fixed>.ms8276-night,
      html body #ms8210Start .ms8278-fixed>.ms8278-attention{
        position:absolute!important;
        z-index:20!important;
      }

      html body #ms8210Start .ms8278-fixed>.ms8234-brand{
        left:clamp(28px,4vw,58px)!important;
        top:30px!important;
        width:auto!important;
        max-width:430px!important;
      }
      html body #ms8210Start .ms8278-fixed .ms8276-brand-title{
        font-size:clamp(58px,5vw,72px)!important;
        line-height:.9!important;
      }
      html body #ms8210Start .ms8278-fixed .ms8276-brand-tagline{
        margin-top:10px!important;
        white-space:nowrap!important;
      }

      html body #ms8210Start .ms8278-fixed>.ms8234-hero{
        left:clamp(28px,4vw,58px)!important;
        top:162px!important;
        width:min(610px,48vw)!important;
        max-width:610px!important;
        margin:0!important;
        padding:0!important;
        background:transparent!important;
        border:0!important;
        box-shadow:none!important;
      }
      html body #ms8210Start .ms8278-fixed .ms8276-eyebrow{
        margin-bottom:12px!important;
      }
      html body #ms8210Start .ms8278-fixed .ms8276-title{
        max-width:590px!important;
        margin-bottom:8px!important;
        font-size:clamp(52px,4.25vw,62px)!important;
        line-height:.96!important;
      }
      html body #ms8210Start .ms8278-fixed .ms8276-subtitle{
        max-width:590px!important;
        margin-bottom:15px!important;
        font-size:16px!important;
      }
      html body #ms8210Start .ms8278-fixed .ms8234-live-metrics{
        width:100%!important;
        max-width:590px!important;
        margin:13px 0 14px!important;
        padding:10px 8px!important;
        background:rgba(2,25,41,.70)!important;
        backdrop-filter:blur(15px) saturate(120%)!important;
        -webkit-backdrop-filter:blur(15px) saturate(120%)!important;
      }
      html body #ms8210Start .ms8278-fixed .ms8234-live-metric{
        padding:0 13px!important;
      }
      html body #ms8210Start .ms8278-fixed .ms8276-live-button{
        width:min(500px,100%)!important;
        min-height:62px!important;
        margin:0!important;
      }

      html body #ms8210Start .ms8278-fixed>.ms8234-status-grid{
        left:clamp(20px,3.5vw,52px)!important;
        right:clamp(20px,3.5vw,52px)!important;
        bottom:18px!important;
        display:grid!important;
        grid-template-columns:repeat(5,minmax(0,1fr))!important;
        gap:10px!important;
        width:auto!important;
        margin:0!important;
        padding:0!important;
      }
      html body #ms8210Start .ms8278-fixed .ms8234-status{
        min-height:88px!important;
        padding:12px 14px!important;
      }

      html body #ms8210Start .ms8278-fixed>.ms8278-attention{
        right:26px!important;
        top:20px!important;
        min-height:48px!important;
        max-width:210px!important;
        margin:0!important;
      }
      html body #ms8210Start .ms8278-fixed>.ms8276-night{
        right:26px!important;
        top:78px!important;
        min-width:138px!important;
        height:50px!important;
        margin:0!important;
      }
      html body #ms8210Start .ms8278-fixed:not(.ms8278-has-attention)>.ms8276-night{
        top:26px!important;
      }

      .ms8278-hide-duplicate{
        display:none!important;
        visibility:hidden!important;
        width:0!important;
        height:0!important;
        min-width:0!important;
        min-height:0!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
        overflow:hidden!important;
        pointer-events:none!important;
      }

      @media(max-width:1100px){
        html body #ms8210Start .ms8234-header.ms8278-fixed{min-height:660px!important;background-position:67% 52%!important;}
        html body #ms8210Start .ms8278-fixed>.ms8278-photo{object-position:67% 52%!important;}
        html body #ms8210Start .ms8278-fixed>.ms8234-hero{left:38px!important;top:158px!important;width:min(575px,55vw)!important;}
        html body #ms8210Start .ms8278-fixed .ms8276-title{font-size:56px!important;}
      }

      @media(max-width:760px){
        html body #ms8210Start .ms8234-header.ms8278-fixed{min-height:860px!important;border-radius:24px!important;background-position:66% 48%!important;}
        html body #ms8210Start .ms8278-fixed>.ms8278-photo{object-position:66% 48%!important;}
        html body #ms8210Start .ms8278-fixed>.ms8278-overlay{
          background:linear-gradient(90deg,rgba(0,13,23,.91),rgba(0,13,23,.43)),linear-gradient(0deg,rgba(1,12,20,.88),rgba(1,12,20,.10) 62%)!important;
        }
        html body #ms8210Start .ms8278-fixed>.ms8234-brand{left:20px!important;top:20px!important;max-width:58%!important;}
        html body #ms8210Start .ms8278-fixed .ms8276-brand-title{font-size:48px!important;}
        html body #ms8210Start .ms8278-fixed .ms8276-brand-tagline{font-size:8px!important;letter-spacing:.18em!important;}
        html body #ms8210Start .ms8278-fixed>.ms8278-attention{right:12px!important;top:14px!important;max-width:145px!important;min-height:42px!important;font-size:12px!important;}
        html body #ms8210Start .ms8278-fixed>.ms8276-night{right:12px!important;top:66px!important;min-width:108px!important;height:42px!important;font-size:13px!important;}
        html body #ms8210Start .ms8278-fixed:not(.ms8278-has-attention)>.ms8276-night{top:16px!important;}
        html body #ms8210Start .ms8278-fixed>.ms8234-hero{left:20px!important;right:20px!important;top:145px!important;width:auto!important;max-width:none!important;}
        html body #ms8210Start .ms8278-fixed .ms8276-title{font-size:43px!important;max-width:94%!important;}
        html body #ms8210Start .ms8278-fixed .ms8276-subtitle{font-size:14px!important;max-width:94%!important;}
        html body #ms8210Start .ms8278-fixed .ms8276-live-button{width:100%!important;min-height:58px!important;font-size:17px!important;}
        html body #ms8210Start .ms8278-fixed>.ms8234-status-grid{left:12px!important;right:12px!important;bottom:12px!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;}
        html body #ms8210Start .ms8278-fixed .ms8234-status{min-height:82px!important;padding:10px!important;border-radius:17px!important;}
        html body #ms8210Start .ms8278-fixed .ms8234-status:last-child:nth-child(odd){grid-column:1/-1!important;}
      }
    `;
  }

  function findHeader(root){
    return root?.querySelector('.ms8234-header.ms8276-solid')||root?.querySelector('.ms8234-header')||root?.querySelector('.ms8210-header')||null;
  }

  function ensurePhoto(header){
    if(!header)return;
    header.querySelectorAll(':scope > .ms8273-backdrop,:scope > .ms8273-photo-overlay,:scope > .ms8274-photo,:scope > .ms8274-overlay,:scope > .ms8275-photo,:scope > .ms8275-overlay,:scope > .ms8277-photo,:scope > .ms8277-overlay').forEach(node=>node.remove());

    let photo=header.querySelector(':scope > .ms8278-photo');
    if(!photo){
      photo=document.createElement('img');
      photo.className='ms8278-photo';
      photo.alt='';
      photo.setAttribute('aria-hidden','true');
      photo.decoding='async';
      photo.loading='eager';
      photo.fetchPriority='high';
      header.prepend(photo);
    }
    if(photo.getAttribute('src')!==PHOTO)photo.src=PHOTO;

    let overlay=header.querySelector(':scope > .ms8278-overlay');
    if(!overlay){
      overlay=document.createElement('div');
      overlay.className='ms8278-overlay';
      overlay.setAttribute('aria-hidden','true');
      photo.insertAdjacentElement('afterend',overlay);
    }
  }

  function hideDuplicateTaglines(header){
    const brand=header?.querySelector(':scope > .ms8234-brand');
    const wanted=new Set([
      'explore · navigate · enjoy',
      'explore • navigate • enjoy',
      'explore - navigate - enjoy'
    ]);
    document.querySelectorAll('body *').forEach(el=>{
      if(brand?.contains(el))return;
      const text=norm(el.textContent).toLowerCase().replace(/[›>]+$/,'').trim();
      if(wanted.has(text))el.classList.add('ms8278-hide-duplicate');
    });
  }

  function ensureStatus(root,header){
    const grid=root?.querySelector('.ms8234-status-grid');
    if(grid&&grid.parentElement!==header)header.appendChild(grid);
  }

  function ensureAttention(header){
    if(!header)return;
    const candidates=[...document.querySelectorAll('button,[role="button"],a')];
    const attention=candidates.find(el=>{
      const text=norm(el.textContent).toLowerCase();
      return text.length<120&&text.includes('aandachtspunt');
    });
    header.querySelectorAll(':scope > .ms8278-attention').forEach(el=>{
      if(el!==attention)el.classList.remove('ms8278-attention');
    });
    if(attention){
      attention.classList.add('ms8278-attention');
      if(attention.parentElement!==header)header.appendChild(attention);
      header.classList.add('ms8278-has-attention');
    }else{
      header.classList.remove('ms8278-has-attention');
    }
  }

  function ensureNight(root,header){
    if(!root||!header)return;
    const candidates=[...root.querySelectorAll('button,[role="button"]')];
    const night=candidates.find(el=>{
      const text=norm(el.textContent).toLowerCase();
      return text==='nacht'||text.startsWith('nacht ')||text.includes(' nacht');
    });
    if(night){
      night.classList.add('ms8276-night');
      if(night.parentElement!==header)header.appendChild(night);
    }
  }

  function patch(){
    syncBuild();
    installStyle();
    const root=document.getElementById('ms8210Start');
    const header=findHeader(root);
    if(!root||!header){
      hideDuplicateTaglines(null);
      return false;
    }

    header.classList.add('ms8276-solid','ms8278-fixed');
    header.dataset.msHeroBuild='8278';
    ensurePhoto(header);
    ensureStatus(root,header);
    ensureNight(root,header);
    ensureAttention(header);
    hideDuplicateTaglines(header);
    return true;
  }

  function queuePatch(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      patch();
    });
  }

  async function boot(){
    syncBuild();
    await loadCore();
    installStyle();
    patch();

    [80,180,350,700,1200,2200,4000,7000,11000].forEach(ms=>setTimeout(patch,ms));
    ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:start-requested','mijnserenity:routechange','mijnserenity:theme-changed','pageshow','online']
      .forEach(type=>window.addEventListener(type,queuePatch,{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)queuePatch()},{passive:true});
    window.addEventListener('resize',queuePatch,{passive:true});

    const root=document.getElementById('ms8210Start');
    if(root){
      const observer=new MutationObserver(queuePatch);
      observer.observe(root,{childList:true,subtree:true});
    }
    console.info(`MijnSerenity ${BUILD}: Serenity hero-fix actief.`);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
