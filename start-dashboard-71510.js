/* MijnSerenity 8.27.7 — harde live fix: echte hero-foto, één header, nette iPad-layout. */
(()=>{
  'use strict';
  if(window.__ms8277HardHero)return;
  window.__ms8277HardHero=true;

  const BUILD='8.27.7';
  const CORE='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@30cb7aa9bb709e5d8371c83622883f87ca83c486/start-dashboard-71510.js?v=827600';
  const PHOTO='/assets/serenity-hero-8275.jpg?v=827700';
  const STYLE_ID='ms8277HardHeroStyle';
  let corePromise=null;
  let queued=false;

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
    if(window.__ms8276SolidHeader || document.getElementById('ms8276Hero')) return Promise.resolve();
    if(corePromise)return corePromise;
    corePromise=new Promise(resolve=>{
      const done=()=>resolve();
      let s=document.querySelector('script[data-ms8277-core]');
      if(s){
        if(window.__ms8276SolidHeader)resolve();
        else s.addEventListener('load',done,{once:true});
        return;
      }
      s=document.createElement('script');
      s.src=CORE;
      s.async=false;
      s.dataset.ms8277Core='1';
      s.addEventListener('load',done,{once:true});
      s.addEventListener('error',done,{once:true});
      document.head.appendChild(s);
    });
    return corePromise;
  }

  function installCss(){
    let style=document.getElementById(STYLE_ID);
    if(!style){
      style=document.createElement('style');
      style.id=STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent=`
      #ms8276Hero.ms8277-hard-hero{
        position:relative!important;
        isolation:isolate!important;
        overflow:hidden!important;
        min-height:clamp(590px,64vh,740px)!important;
        height:auto!important;
        background:#021722!important;
        background-image:none!important;
        border-radius:0 0 32px 32px!important;
      }
      #ms8276Hero .ms8277-photo{
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
        object-fit:cover!important;
        object-position:62% 53%!important;
        pointer-events:none!important;
      }
      #ms8276Hero .ms8277-shade{
        position:absolute!important;
        inset:0!important;
        z-index:1!important;
        pointer-events:none!important;
        background:
          linear-gradient(90deg,rgba(1,18,29,.94) 0%,rgba(1,18,29,.80) 28%,rgba(1,18,29,.38) 53%,rgba(1,18,29,.10) 75%,rgba(1,18,29,.04) 100%),
          linear-gradient(0deg,rgba(1,18,29,.82) 0%,rgba(1,18,29,.20) 43%,rgba(1,18,29,.24) 100%)!important;
      }
      #ms8276Hero .ms8276-inner{
        position:relative!important;
        z-index:2!important;
        min-height:inherit!important;
        height:100%!important;
        max-width:100%!important;
        width:100%!important;
      }
      #ms8276Hero .ms8276-brand{
        position:absolute!important;
        z-index:3!important;
        left:clamp(30px,4.2vw,68px)!important;
        top:clamp(24px,3vw,46px)!important;
        margin:0!important;
      }
      #ms8276Hero .ms8276-wordmark{
        font-size:clamp(56px,5.1vw,80px)!important;
        line-height:.9!important;
        text-shadow:0 3px 22px rgba(0,0,0,.25)!important;
      }
      #ms8276Hero .ms8276-brandline{
        margin-top:12px!important;
        letter-spacing:.30em!important;
        white-space:nowrap!important;
      }
      #ms8276Hero .ms8276-panel{
        position:absolute!important;
        z-index:3!important;
        left:clamp(30px,4.2vw,68px)!important;
        bottom:clamp(28px,4vw,58px)!important;
        width:min(690px,62vw)!important;
        max-width:690px!important;
        margin:0!important;
        padding:24px 26px 22px!important;
        background:linear-gradient(135deg,rgba(0,18,30,.70),rgba(0,18,30,.38))!important;
        border:1px solid rgba(75,209,239,.14)!important;
        border-radius:24px!important;
        box-shadow:0 20px 46px rgba(0,0,0,.24)!important;
        -webkit-backdrop-filter:blur(8px)!important;
        backdrop-filter:blur(8px)!important;
      }
      #ms8276Hero .ms8276-panel h1{
        margin:8px 0 10px!important;
        font-size:clamp(45px,4.3vw,66px)!important;
        line-height:.96!important;
        letter-spacing:-.045em!important;
      }
      #ms8276Hero .ms8276-copy{
        margin:0 0 18px!important;
        font-size:clamp(14px,1.25vw,18px)!important;
        line-height:1.35!important;
      }
      #ms8276Hero .ms8276-status-placement,
      #ms8276Hero .ms8234-status-grid,
      #ms8276Hero #ms8234StatusGrid,
      #ms8276Hero [class*="status-grid"]{
        width:100%!important;
        max-width:none!important;
        margin:0 0 16px!important;
      }
      #ms8276Hero .ms8276-live-button,
      #ms8276Hero #ms8276LiveButton{
        width:min(520px,100%)!important;
        min-height:62px!important;
        margin:0!important;
      }
      .ms8277-hide-duplicate{
        display:none!important;
        visibility:hidden!important;
        width:0!important;
        height:0!important;
        overflow:hidden!important;
        pointer-events:none!important;
      }
      @media (min-width:768px){
        .ms8277-attention-control{
          position:fixed!important;
          right:max(22px,env(safe-area-inset-right))!important;
          top:calc(env(safe-area-inset-top) + 14px)!important;
          z-index:10060!important;
          margin:0!important;
        }
        .ms8277-theme-control{
          position:fixed!important;
          right:max(22px,env(safe-area-inset-right))!important;
          top:calc(env(safe-area-inset-top) + 76px)!important;
          z-index:10059!important;
          margin:0!important;
        }
      }
      @media (max-width:1180px){
        #ms8276Hero.ms8277-hard-hero{min-height:clamp(560px,62vh,690px)!important;}
        #ms8276Hero .ms8277-photo{object-position:68% 52%!important;}
        #ms8276Hero .ms8276-panel{width:min(650px,70vw)!important;}
      }
      @media (max-width:720px){
        #ms8276Hero.ms8277-hard-hero{min-height:620px!important;border-radius:0 0 24px 24px!important;}
        #ms8276Hero .ms8277-photo{object-position:68% 48%!important;}
        #ms8276Hero .ms8277-shade{
          background:linear-gradient(90deg,rgba(1,18,29,.91),rgba(1,18,29,.45)),linear-gradient(0deg,rgba(1,18,29,.92) 0%,rgba(1,18,29,.24) 58%)!important;
        }
        #ms8276Hero .ms8276-brand{left:20px!important;top:24px!important;}
        #ms8276Hero .ms8276-wordmark{font-size:54px!important;}
        #ms8276Hero .ms8276-brandline{font-size:9px!important;letter-spacing:.22em!important;}
        #ms8276Hero .ms8276-panel{
          left:16px!important;
          right:16px!important;
          bottom:18px!important;
          width:auto!important;
          max-width:none!important;
          padding:20px 18px 18px!important;
          border-radius:20px!important;
        }
        #ms8276Hero .ms8276-panel h1{font-size:43px!important;}
      }
    `;
  }

  function hideDuplicateTaglines(hero){
    const wanted=new Set([
      'explore · navigate · enjoy',
      'explore • navigate • enjoy',
      'explore - navigate - enjoy'
    ]);
    document.querySelectorAll('body *').forEach(el=>{
      if(hero && hero.contains(el))return;
      if(el.children.length>2)return;
      let text=norm(el.textContent).toLowerCase().replace(/[›>]+$/,'').trim();
      if(wanted.has(text))el.classList.add('ms8277-hide-duplicate');
    });
  }

  function markTopControls(hero){
    const candidates=document.querySelectorAll('button,[role="button"],a');
    candidates.forEach(el=>{
      if(hero && hero.contains(el))return;
      const text=norm(el.textContent).toLowerCase();
      if(text && text.length<90 && text.includes('aandachtspunt')){
        el.classList.add('ms8277-attention-control');
      }else if(/^(🌙\s*)?(nacht|dag|auto)(\s*[⌄⌄∨v›>]*)?$/i.test(norm(el.textContent))){
        el.classList.add('ms8277-theme-control');
      }
    });
  }

  function patchHero(){
    syncBuild();
    installCss();
    const hero=document.getElementById('ms8276Hero');
    if(!hero){
      hideDuplicateTaglines(null);
      return false;
    }

    hero.classList.add('ms8277-hard-hero');
    hero.setAttribute('data-ms-build',BUILD);

    let photo=hero.querySelector(':scope > .ms8277-photo');
    if(!photo){
      photo=document.createElement('img');
      photo.className='ms8277-photo';
      photo.alt='';
      photo.setAttribute('aria-hidden','true');
      photo.decoding='async';
      photo.loading='eager';
      photo.src=PHOTO;
      hero.prepend(photo);
    }else if(!photo.src.includes('827700')){
      photo.src=PHOTO;
    }

    let shade=hero.querySelector(':scope > .ms8277-shade');
    if(!shade){
      shade=document.createElement('div');
      shade.className='ms8277-shade';
      shade.setAttribute('aria-hidden','true');
      photo.insertAdjacentElement('afterend',shade);
    }

    hideDuplicateTaglines(hero);
    markTopControls(hero);
    return true;
  }

  function schedulePatch(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      patchHero();
    });
  }

  async function boot(){
    syncBuild();
    installCss();
    await loadCore();
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(patchHero() || tries>30)clearInterval(timer);
    },100);
    schedulePatch();

    const observer=new MutationObserver(schedulePatch);
    observer.observe(document.documentElement,{childList:true,subtree:true});

    window.addEventListener('pageshow',schedulePatch,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedulePatch();},{passive:true});
    setTimeout(schedulePatch,800);
    setTimeout(schedulePatch,2500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
