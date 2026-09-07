/* MijnSerenity 8.27.5 — scherpe beeldvullende Serenity-header */
(()=>{
  'use strict';
  if(window.__ms8275HeaderFix)return;
  window.__ms8275HeaderFix=true;

  const BUILD='8.27.5';
  const PRIOR='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@7c27ef93b619e9074732b64e9d7c12b22653715d/start-dashboard-71510.js?v=827500';
  const PHOTO='/assets/serenity-hero-8275.jpg?v=827500';
  const STYLE_ID='ms8275HeaderFixStyle';
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

  function loadPrior(){
    return new Promise(resolve=>{
      if(window.__ms8272ExactSerenityHero){resolve();return;}
      let s=document.querySelector('script[data-ms8275-prior]');
      if(s){s.addEventListener('load',resolve,{once:true});setTimeout(resolve,4500);return;}
      s=document.createElement('script');
      s.src=PRIOR;s.async=false;s.crossOrigin='anonymous';s.dataset.ms8275Prior='1';
      s.onload=resolve;s.onerror=()=>resolve();
      (document.head||document.documentElement).appendChild(s);
      setTimeout(resolve,4500);
    });
  }

  function installStyle(){
    document.getElementById(STYLE_ID)?.remove();
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #ms8210Start{width:100%!important;max-width:none!important;margin:0!important;padding:0!important;background:#031421!important;color:#fff!important}
      #ms8210Start .ms8210-shell{width:100%!important;max-width:none!important;margin:0!important;padding:0!important}
      #ms8210Start .ms8234-header.ms8275-fixed{
        position:relative!important;isolation:isolate!important;box-sizing:border-box!important;
        width:100%!important;max-width:none!important;height:740px!important;min-height:740px!important;margin:0!important;padding:0!important;
        overflow:hidden!important;border:1px solid rgba(55,201,244,.36)!important;border-radius:30px!important;
        background-color:#041725!important;
        background-image:
          linear-gradient(90deg,rgba(0,13,23,.72) 0%,rgba(0,13,23,.48) 31%,rgba(0,13,23,.12) 55%,rgba(0,13,23,.02) 75%),
          linear-gradient(0deg,rgba(1,12,20,.62) 0%,rgba(1,12,20,.08) 42%,rgba(1,12,20,0) 68%),
          url('${PHOTO}')!important;
        background-size:cover!important;background-position:center center!important;background-repeat:no-repeat!important;
        box-shadow:inset 0 0 0 1px rgba(79,218,255,.06),0 18px 48px rgba(0,0,0,.30)!important;
      }
      #ms8210Start .ms8234-header.ms8275-fixed::before,#ms8210Start .ms8234-header.ms8275-fixed::after{display:none!important;content:none!important}
      #ms8210Start .ms8275-fixed>.ms8274-photo,#ms8210Start .ms8275-fixed>.ms8274-overlay,#ms8210Start .ms8275-fixed>.ms8273-backdrop,#ms8210Start .ms8275-fixed>.ms8273-photo-overlay{display:none!important}
      #ms8210Start .ms8275-fixed .ms8263-vrijon-hero,#ms8210Start .ms8275-fixed .ms8263-vrijon-lockup,#ms8210Start .ms8275-fixed .ms8263-vrijon-svg,#ms8210Start .ms8275-fixed .ms8234-sail,#ms8210Start .ms8275-fixed .ms8234-greeting,#ms8210Start .ms8275-fixed .ms8245-date,#ms8210Start .ms8275-fixed .ms8234-attention,#ms8210Start .ms8275-fixed .ms8234-gauges,#ms8210Start .ms8275-fixed .ms8234-summary{display:none!important}

      #ms8210Start .ms8275-fixed>.ms8234-brand{position:absolute!important;z-index:20!important;left:58px!important;top:32px!important;width:auto!important;max-width:430px!important;margin:0!important;padding:0!important;background:none!important;border:0!important}
      #ms8210Start .ms8275-fixed .ms8234-brand h1,#ms8210Start .ms8275-fixed .ms8218-serenity-brand,#ms8210Start .ms8275-fixed .ms8218-brand-lockup{display:block!important;margin:0!important;padding:0!important;color:#20cef6!important;font-family:Georgia,"Times New Roman",serif!important;font-size:72px!important;font-weight:500!important;line-height:.90!important;letter-spacing:-.055em!important;text-shadow:0 3px 18px rgba(0,0,0,.56)!important}
      #ms8210Start .ms8275-fixed .ms8218-brand-sail{display:none!important}
      #ms8210Start .ms8275-fixed .ms8254-tagline,#ms8210Start .ms8275-brand-tagline{display:block!important;margin:11px 0 0 4px!important;color:#f7fbff!important;font:800 11px/1.1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;letter-spacing:.26em!important;text-transform:uppercase!important;text-shadow:0 2px 10px rgba(0,0,0,.78)!important}

      #ms8210Start .ms8275-fixed>.ms8234-hero{position:absolute!important;z-index:18!important;left:58px!important;top:190px!important;width:min(650px,48vw)!important;max-width:650px!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;background-image:none!important;box-shadow:none!important;color:#fff!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;overflow:visible!important}
      #ms8210Start .ms8275-fixed>.ms8234-hero::before,#ms8210Start .ms8275-fixed>.ms8234-hero::after{display:none!important;content:none!important}
      #ms8210Start .ms8275-eyebrow{display:block!important;margin:0 0 14px!important;color:#32d8fb!important;font:900 14px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;letter-spacing:.21em!important;text-transform:uppercase!important;text-shadow:0 2px 10px rgba(0,0,0,.72)!important}
      #ms8210Start .ms8275-fixed .ms8234-hero h2{max-width:620px!important;margin:0 0 10px!important;color:#fff!important;font:900 66px/.96 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;letter-spacing:-.052em!important;text-shadow:0 3px 16px rgba(0,0,0,.68)!important}
      #ms8210Start .ms8275-subtitle{max-width:650px!important;margin:0 0 20px!important;color:#f1f8fc!important;font:600 17px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;text-shadow:0 2px 12px rgba(0,0,0,.82)!important}
      #ms8210Start .ms8275-fixed .ms8234-live-metrics{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:0!important;width:100%!important;max-width:620px!important;margin:18px 0 17px!important;padding:12px 10px!important;border:1px solid rgba(61,211,251,.34)!important;border-radius:22px!important;background:rgba(2,25,41,.70)!important;box-shadow:0 12px 30px rgba(0,0,0,.22)!important;backdrop-filter:blur(18px) saturate(125%)!important;-webkit-backdrop-filter:blur(18px) saturate(125%)!important}
      #ms8210Start .ms8275-fixed .ms8234-live-metric{min-width:0!important;padding:0 16px!important;border-right:1px solid rgba(160,220,240,.24)!important}
      #ms8210Start .ms8275-fixed .ms8234-live-metric:last-child{border-right:0!important}
      #ms8210Start .ms8275-fixed .ms8234-live-copy strong{color:#fff!important;font-size:20px!important;line-height:1.05!important;font-weight:850!important}
      #ms8210Start .ms8275-fixed .ms8234-live-copy small{color:#b8cad7!important;font-size:12px!important}
      #ms8210Start .ms8275-live-button{display:flex!important;align-items:center!important;justify-content:center!important;gap:14px!important;width:510px!important;max-width:100%!important;min-height:70px!important;margin:0!important;padding:14px 24px!important;border:1px solid rgba(143,240,255,.68)!important;border-radius:22px!important;background:linear-gradient(105deg,#13b7dd,#26d0eb)!important;color:#fff!important;font:850 20px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;box-shadow:0 15px 36px rgba(0,174,218,.31),inset 0 1px 0 rgba(255,255,255,.24)!important}

      #ms8210Start .ms8275-fixed>.ms8234-status-grid{position:absolute!important;z-index:22!important;left:52px!important;right:52px!important;bottom:28px!important;display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:12px!important;width:auto!important;margin:0!important;padding:0!important}
      #ms8210Start .ms8275-fixed .ms8234-status{min-width:0!important;min-height:97px!important;margin:0!important;padding:15px 16px!important;border:1px solid rgba(58,204,246,.40)!important;border-radius:22px!important;background:rgba(2,30,48,.78)!important;color:#fff!important;box-shadow:0 12px 28px rgba(0,0,0,.23),inset 0 1px 0 rgba(255,255,255,.04)!important;backdrop-filter:blur(18px) saturate(126%)!important;-webkit-backdrop-filter:blur(18px) saturate(126%)!important}
      #ms8210Start .ms8275-fixed .ms8234-status-copy strong{color:#fff!important;font-size:17px!important;font-weight:850!important}
      #ms8210Start .ms8275-fixed .ms8234-status-copy small,#ms8210Start .ms8275-fixed .ms8245-status-sub{color:#aec4d3!important;font-size:11px!important}

      #ms8210Start .ms8275-night{position:absolute!important;z-index:30!important;right:48px!important;top:31px!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:11px!important;min-width:146px!important;height:54px!important;margin:0!important;padding:0 20px!important;border:1px solid rgba(71,206,247,.27)!important;border-radius:999px!important;background:rgba(2,32,51,.90)!important;color:#fff!important;font:800 17px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;box-shadow:0 10px 28px rgba(0,0,0,.24)!important;backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important}
      #ms8210Start .ms8275-night .ms8275-moon{color:#32d7fb!important;font-size:25px!important}
      #ms8210Start .ms8275-duplicate{display:none!important}

      @media(max-width:1100px){
        #ms8210Start .ms8234-header.ms8275-fixed{height:720px!important;min-height:720px!important;background-position:54% center!important}
        #ms8210Start .ms8275-fixed>.ms8234-brand{left:40px!important;top:30px!important}
        #ms8210Start .ms8275-fixed .ms8234-brand h1,#ms8210Start .ms8275-fixed .ms8218-brand-lockup{font-size:62px!important}
        #ms8210Start .ms8275-fixed>.ms8234-hero{left:40px!important;top:180px!important;width:min(610px,55vw)!important}
        #ms8210Start .ms8275-fixed .ms8234-hero h2{font-size:58px!important}
        #ms8210Start .ms8275-night{right:38px!important}
        #ms8210Start .ms8275-fixed>.ms8234-status-grid{left:32px!important;right:32px!important;gap:9px!important}
      }
      @media(max-width:760px){
        #ms8210Start .ms8234-header.ms8275-fixed{height:900px!important;min-height:900px!important;border-radius:24px!important;background-position:64% center!important}
        #ms8210Start .ms8275-fixed>.ms8234-brand{left:20px!important;top:22px!important;max-width:55%!important}
        #ms8210Start .ms8275-fixed .ms8234-brand h1,#ms8210Start .ms8275-fixed .ms8218-brand-lockup{font-size:48px!important}
        #ms8210Start .ms8275-fixed .ms8254-tagline,#ms8210Start .ms8275-brand-tagline{font-size:8px!important;letter-spacing:.18em!important}
        #ms8210Start .ms8275-night{right:14px!important;top:18px!important;min-width:112px!important;height:44px!important;padding:0 13px!important;font-size:14px!important}
        #ms8210Start .ms8275-fixed>.ms8234-hero{left:20px!important;right:20px!important;top:150px!important;width:auto!important;max-width:none!important}
        #ms8210Start .ms8275-fixed .ms8234-hero h2{font-size:44px!important;max-width:92%!important}
        #ms8210Start .ms8275-subtitle{font-size:14px!important;max-width:94%!important}
        #ms8210Start .ms8275-live-button{width:100%!important;min-height:58px!important;font-size:17px!important}
        #ms8210Start .ms8275-fixed>.ms8234-status-grid{left:12px!important;right:12px!important;bottom:14px!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important}
        #ms8210Start .ms8275-fixed .ms8234-status{min-height:86px!important;padding:11px 10px!important;border-radius:18px!important}
        #ms8210Start .ms8275-fixed .ms8234-status:last-child:nth-child(odd){grid-column:1/-1!important}
      }
    `;
    (document.head||document.documentElement).appendChild(style);
  }

  function navigate(route){
    try{if(typeof window.captainNavigate==='function'){window.captainNavigate(route,document.querySelector(`.bottom-nav .bottom-nav-item[data-target="${route}"]`)||null);return;}}catch{}
    document.querySelector(`.bottom-nav .bottom-nav-item[data-target="${route}"]`)?.click();
  }

  function ensureBrand(header){
    let brand=header.querySelector(':scope > .ms8234-brand');
    if(!brand){brand=document.createElement('div');brand.className='ms8234-brand';header.prepend(brand)}
    brand.innerHTML='<h1 class="ms8218-serenity-brand">Serenity</h1><div class="ms8254-tagline ms8275-brand-tagline">EXPLORE · NAVIGATE · ENJOY</div>';
  }

  function ensureHero(root,header){
    let hero=header.querySelector(':scope > .ms8234-hero')||root.querySelector('.ms8234-hero');
    if(!hero){hero=document.createElement('section');hero.className='ms8234-hero';header.appendChild(hero)}
    if(hero.parentElement!==header)header.appendChild(hero);
    let eyebrow=hero.querySelector('.ms8275-eyebrow');
    if(!eyebrow){eyebrow=document.createElement('span');eyebrow.className='ms8275-eyebrow';hero.prepend(eyebrow)}
    eyebrow.textContent='WELKOM TERUG';
    let heading=hero.querySelector('h2');
    if(!heading){heading=document.createElement('h2');eyebrow.insertAdjacentElement('afterend',heading)}
    heading.textContent='Klaar om te gaan varen?';
    let subtitle=hero.querySelector('.ms8275-subtitle');
    if(!subtitle){subtitle=document.createElement('p');subtitle.className='ms8275-subtitle';heading.insertAdjacentElement('afterend',subtitle)}
    subtitle.textContent='De Serenity ligt klaar. Waar brengt de volgende reis je naartoe?';
    let button=hero.querySelector('.ms8275-live-button');
    if(!button){button=document.createElement('button');button.type='button';button.className='ms8275-live-button';button.innerHTML='<span aria-hidden="true">▶</span><span>Start live varen</span><span aria-hidden="true">›</span>';button.addEventListener('click',e=>{e.preventDefault();navigate('live')});hero.appendChild(button)}
    [...hero.querySelectorAll('button,a')].forEach(n=>{if(n!==button&&norm(n.textContent)==='Start live varen')n.classList.add('ms8275-duplicate')});
  }

  function ensureNight(root,header){
    let night=header.querySelector('.ms8275-night')||[...root.querySelectorAll('button,[role="button"]')].find(n=>/nacht/i.test(norm(n.textContent)));
    if(!night){night=document.createElement('button');night.type='button';night.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('mijnserenity:theme-changed')))}
    night.classList.remove('ms8272-night');night.classList.add('ms8275-night');night.innerHTML='<span class="ms8275-moon" aria-hidden="true">☾</span><span>Nacht</span><span aria-hidden="true">⌄</span>';
    if(night.parentElement!==header)header.appendChild(night);
  }

  function apply(){
    syncBuild();installStyle();
    const root=document.getElementById('ms8210Start');if(!root)return false;
    const header=root.querySelector('.ms8234-header')||root.querySelector('.ms8210-header');if(!header)return false;
    header.classList.remove('ms8274-live','ms8273-photo-ready');header.classList.add('ms8275-fixed');header.dataset.msHeroBuild='8275';
    ensureBrand(header);ensureHero(root,header);ensureNight(root,header);
    const status=root.querySelector('.ms8234-status-grid');if(status&&status.parentElement!==header)header.appendChild(status);
    const shore=[...header.querySelectorAll('.ms8234-status')].find(n=>/walstroom/i.test(n.textContent||''));
    if(shore){const strong=shore.querySelector('strong');if(strong&&/^[\s—–-]*$/.test(strong.textContent||''))strong.textContent='Niet aangesloten'}
    return true;
  }

  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}
  function start(){syncBuild();installStyle();apply();[100,300,700,1400,2600,5000,9000].forEach(ms=>setTimeout(apply,ms));['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:start-requested','mijnserenity:routechange','mijnserenity:theme-changed','pageshow','online'].forEach(t=>window.addEventListener(t,queue,{passive:true}));document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()},{passive:true});window.addEventListener('resize',queue,{passive:true});const root=document.getElementById('ms8210Start');if(root){const o=new MutationObserver(queue);o.observe(root,{childList:true,subtree:true});setTimeout(()=>o.disconnect(),30000)}console.info(`MijnSerenity ${BUILD}: scherpe beeldvullende header actief.`)}
  loadPrior().finally(start);
})();
