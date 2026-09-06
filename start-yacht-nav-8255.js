/* MijnSerenity 8.25.8 — VriJon motorjacht als betrouwbare Start-navigatie op alle subpagina's */
(()=>{
  'use strict';
  if(window.__msStartYacht8255)return;
  window.__msStartYacht8255=true;

  const BUILD='8.25.8';
  const STYLE_ID='ms8255StartYachtStyle';
  const FALLBACK_ID='ms8258StartFallback';
  const YACHT=`<svg class="ms8255-yacht-svg" viewBox="0 0 170 76" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
      <path class="ms8255-yacht-rail" d="M31 38h101M43 38V31m20 7V29m25 9V27m24 11V30m19 8v-6"/>
      <path class="ms8255-yacht-cabin" d="M47 43V28h50l25 15M58 28l10-11h21l13 11"/>
      <path class="ms8255-yacht-window" d="M55 31h15v10H55zm19 0h15v10H74zm19 0h14l10 10H93z"/>
      <path class="ms8255-yacht-mast" d="M87 17V8m0 2h10m-10 4h-8"/>
      <path class="ms8255-yacht-hull" d="M18 44h137l-12 18H39c-9 0-16-6-21-18Z"/>
      <path class="ms8255-yacht-stripe" d="M28 49h119"/>
      <path class="ms8255-yacht-wave" d="M8 67c15-5 29-5 43 0 14 5 29 5 43 0 14-5 29-5 44 0"/>
    </g>
  </svg>`;

  let navObserver=null;
  let dashboardObserver=null;
  let appObserver=null;

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const version=document.getElementById('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');
    if(badge)badge.textContent=BUILD;
  }

  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .ms8255-yacht-icon{display:grid!important;place-items:center!important;position:relative!important;flex:0 0 auto!important;overflow:visible!important;color:inherit!important}
      .ms8255-yacht-icon .ms8255-yacht-svg{display:block!important;width:100%!important;height:100%!important;overflow:visible!important;transform-origin:50% 78%;animation:ms8255YachtRock 2.9s ease-in-out infinite;filter:drop-shadow(0 4px 7px rgba(0,0,0,.22))}
      .ms8255-yacht-hull{fill:rgba(8,53,82,.92);stroke:currentColor;stroke-width:3}
      .ms8255-yacht-cabin{fill:rgba(239,250,255,.96);stroke:currentColor;stroke-width:2.2}
      .ms8255-yacht-window{fill:rgba(7,48,73,.95);stroke:#7fe4ff;stroke-width:1.5}
      .ms8255-yacht-rail,.ms8255-yacht-mast{stroke:currentColor;stroke-width:1.7}
      .ms8255-yacht-stripe{stroke:#55ddff;stroke-width:2.2}
      .ms8255-yacht-wave{stroke:#32d4ff;stroke-width:2.1;opacity:.92;animation:ms8255Wave 2.9s ease-in-out infinite}

      #ms8210Start .ms8234-navbtn[data-ms8210-target="dashboard"] .ms8255-yacht-icon{width:43px!important;height:27px!important;margin-bottom:1px!important}
      #ms8210Start .ms8234-navbtn[data-ms8210-target="dashboard"] .ms8234-icon-home{display:none!important}

      .bottom-nav .bottom-nav-item[data-target="dashboard"]>.ms8255-yacht-icon{width:50px!important;height:31px!important;margin:0 auto 2px!important}
      body.ms8219-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"] .ms8219-home-logo,
      body.ms8256-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"] .ms8219-home-logo{width:58px!important;height:42px!important;border-radius:14px!important;overflow:visible!important}
      body.ms8219-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"] .ms8219-home-logo .ms8255-yacht-icon,
      body.ms8256-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"] .ms8219-home-logo .ms8255-yacht-icon{width:51px!important;height:31px!important}
      body.ms8219-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"] .ms8219-home-logo img,
      body.ms8256-sub-page .bottom-nav .bottom-nav-item[data-target="dashboard"] .ms8219-home-logo img{display:none!important}

      #${FALLBACK_ID}{position:fixed!important;left:0!important;right:0!important;bottom:0!important;z-index:2147483600!important;display:none!important;align-items:stretch!important;justify-content:center!important;width:100%!important;height:calc(72px + env(safe-area-inset-bottom))!important;padding:0 0 env(safe-area-inset-bottom)!important;margin:0!important;background:rgba(2,11,19,.98)!important;border-top:1px solid rgba(113,220,255,.24)!important;box-shadow:0 -10px 30px rgba(0,0,0,.38)!important;backdrop-filter:blur(18px) saturate(130%);-webkit-backdrop-filter:blur(18px) saturate(130%)}
      #${FALLBACK_ID}.is-visible{display:flex!important}
      #${FALLBACK_ID} .ms8258-start-button{display:flex!important;align-items:center!important;justify-content:center!important;gap:12px!important;width:100%!important;height:72px!important;padding:7px max(18px,env(safe-area-inset-right)) 7px max(18px,env(safe-area-inset-left))!important;margin:0!important;border:0!important;border-radius:0!important;background:linear-gradient(90deg,rgba(7,35,52,.99),rgba(9,53,76,.99),rgba(7,35,52,.99))!important;color:#fff!important;font:inherit!important;box-shadow:none!important;-webkit-tap-highlight-color:transparent}
      #${FALLBACK_ID} .ms8258-start-button:active{transform:scale(.99)}
      #${FALLBACK_ID} .ms8255-yacht-icon{width:62px!important;height:39px!important;color:#f8fcff!important}
      #${FALLBACK_ID} .ms8258-start-copy{display:grid!important;gap:2px!important;text-align:left!important;line-height:1!important}
      #${FALLBACK_ID} .ms8258-start-copy strong{display:block!important;color:#fff!important;font-size:18px!important;line-height:1.05!important;font-weight:900!important;letter-spacing:-.02em!important}
      #${FALLBACK_ID} .ms8258-start-copy small{display:block!important;color:#87dfff!important;font-size:10px!important;line-height:1.1!important;font-weight:800!important;letter-spacing:.04em!important}
      #${FALLBACK_ID} .ms8258-start-chevron{display:block!important;margin-left:2px!important;color:#b6efff!important;font-size:25px!important;line-height:1!important}

      @keyframes ms8255YachtRock{
        0%,100%{transform:translateY(0) rotate(-1.7deg)}
        25%{transform:translateY(-1.5px) rotate(.9deg)}
        50%{transform:translateY(0) rotate(1.8deg)}
        75%{transform:translateY(1px) rotate(-.7deg)}
      }
      @keyframes ms8255Wave{
        0%,100%{transform:translateX(-1.5px);opacity:.72}
        50%{transform:translateX(1.5px);opacity:1}
      }
      @media(max-width:620px){
        #${FALLBACK_ID}{height:calc(68px + env(safe-area-inset-bottom))!important}
        #${FALLBACK_ID} .ms8258-start-button{height:68px!important}
        #${FALLBACK_ID} .ms8255-yacht-icon{width:58px!important;height:36px!important}
      }
      @media(prefers-reduced-motion:reduce){
        .ms8255-yacht-icon .ms8255-yacht-svg,.ms8255-yacht-wave{animation:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function yachtIcon(){
    const wrap=document.createElement('span');
    wrap.className='ms8255-yacht-icon';
    wrap.setAttribute('aria-hidden','true');
    wrap.innerHTML=YACHT;
    return wrap;
  }

  function appIsVisible(){
    const app=document.getElementById('appView');
    return Boolean(app&&!app.classList.contains('hidden')&&getComputedStyle(app).display!=='none');
  }

  function activeRouteFromDom(){
    const app=document.getElementById('appView');
    if(!app)return 'dashboard';
    const sections=[...app.querySelectorAll(':scope > section[id]')];
    const visible=sections.find(section=>{
      if(section.classList.contains('hidden')||section.hidden||section.getAttribute('aria-hidden')==='true')return false;
      const style=getComputedStyle(section);
      return style.display!=='none'&&style.visibility!=='hidden';
    });
    return String(visible?.id||'dashboard').toLowerCase();
  }

  function elementVisible(node){
    if(!node||!node.isConnected)return false;
    const style=getComputedStyle(node);
    if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)return false;
    const rect=node.getBoundingClientRect();
    return rect.width>24&&rect.height>24&&rect.bottom>0&&rect.top<window.innerHeight;
  }

  function regularStartVisible(){
    const home=document.querySelector('.bottom-nav .bottom-nav-item[data-target="dashboard"]');
    const nav=home?.closest('.bottom-nav');
    return Boolean(home&&nav&&elementVisible(nav)&&elementVisible(home));
  }

  function goStart(event){
    event?.preventDefault?.();
    const normalHome=document.querySelector('.bottom-nav .bottom-nav-item[data-target="dashboard"]');
    try{
      if(typeof window.captainNavigate==='function'){
        window.captainNavigate('dashboard',normalHome||undefined);
        return;
      }
    }catch(error){console.warn('Startnavigatie via captainNavigate mislukt:',error)}
    try{
      if(normalHome){normalHome.click();return}
    }catch{}
    const app=document.getElementById('appView');
    const dashboard=document.getElementById('dashboard');
    if(app&&dashboard){
      [...app.querySelectorAll(':scope > section[id]')].forEach(section=>{
        const active=section===dashboard;
        section.classList.toggle('hidden',!active);
        section.setAttribute('aria-hidden',active?'false':'true');
      });
      window.dispatchEvent(new CustomEvent('mijnserenity:routechange',{detail:{route:'dashboard',source:'vriJon-start-fallback'}}));
    }
  }

  function ensureFallback(){
    let shell=document.getElementById(FALLBACK_ID);
    if(shell)return shell;
    shell=document.createElement('div');
    shell.id=FALLBACK_ID;
    shell.setAttribute('aria-hidden','true');
    const button=document.createElement('button');
    button.type='button';
    button.className='ms8258-start-button';
    button.setAttribute('aria-label','Terug naar Start met VriJon');
    button.setAttribute('title','Terug naar Start');
    button.appendChild(yachtIcon());
    const copy=document.createElement('span');
    copy.className='ms8258-start-copy';
    copy.innerHTML='<strong>Start</strong><small>VriJon · terug naar MijnSerenity</small>';
    button.appendChild(copy);
    const chevron=document.createElement('span');
    chevron.className='ms8258-start-chevron';
    chevron.setAttribute('aria-hidden','true');
    chevron.textContent='⌂';
    button.appendChild(chevron);
    button.addEventListener('click',goStart);
    shell.appendChild(button);
    document.body.appendChild(shell);
    return shell;
  }

  function syncFallback(){
    const shell=ensureFallback();
    const route=activeRouteFromDom();
    const show=appIsVisible()&&route!=='dashboard'&&!regularStartVisible();
    shell.classList.toggle('is-visible',show);
    shell.setAttribute('aria-hidden',show?'false':'true');
  }

  function patchPremiumStart(){
    const start=document.querySelector('#ms8210Start .ms8234-navbtn[data-ms8210-target="dashboard"]');
    if(!start)return;
    if(!start.querySelector('.ms8255-yacht-icon')){
      const old=start.querySelector('.ms8234-icon-home,.ms8234-icon');
      old?.insertAdjacentElement('afterend',yachtIcon());
      if(!old)start.prepend(yachtIcon());
    }
    const label=[...start.querySelectorAll('span')].find(node=>/^Dashboard$/i.test(String(node.textContent||'').trim()));
    if(label)label.textContent='Start';
    start.setAttribute('aria-label','Start');
    start.setAttribute('title','Start');
  }

  function patchLegacyBottomNav(){
    document.querySelectorAll('.bottom-nav .bottom-nav-item[data-target="dashboard"]').forEach(home=>{
      home.setAttribute('aria-label','Start met VriJon');
      home.setAttribute('title','Start');

      const specialLogo=home.querySelector('.ms8219-home-logo');
      if(specialLogo){
        if(!specialLogo.querySelector('.ms8255-yacht-icon'))specialLogo.appendChild(yachtIcon());
        specialLogo.querySelector('img')?.setAttribute('aria-hidden','true');
        return;
      }

      if(home.querySelector(':scope > .ms8255-yacht-icon'))return;
      const direct=[...home.children];
      const oldIcon=direct.find(node=>{
        const text=String(node.textContent||'').trim();
        return node.matches('span')&&(text==='🏠'||text==='⌂'||text==='🏡'||!text);
      });
      if(oldIcon)oldIcon.replaceWith(yachtIcon());
      else home.prepend(yachtIcon());
    });
  }

  function patch(){
    syncBuild();
    installStyle();
    patchPremiumStart();
    patchLegacyBottomNav();
    syncFallback();
  }

  let queued=false;
  function queuePatch(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;patch();watchTargets()});
  }

  function watchTargets(){
    const nav=document.querySelector('.bottom-nav');
    if(nav&&!navObserver){
      navObserver=new MutationObserver(queuePatch);
      navObserver.observe(nav,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-hidden']});
    }
    const dashboard=document.getElementById('dashboard');
    if(dashboard&&!dashboardObserver){
      dashboardObserver=new MutationObserver(queuePatch);
      dashboardObserver.observe(dashboard,{childList:true});
    }
    const app=document.getElementById('appView');
    if(app&&!appObserver){
      appObserver=new MutationObserver(mutations=>{
        const routeChanged=mutations.some(mutation=>{
          const node=mutation.target;
          return node===app||(node instanceof Element&&node.matches('section[id]')&&node.parentElement===app);
        });
        if(routeChanged)queuePatch();
      });
      appObserver.observe(app,{subtree:true,attributes:true,attributeFilter:['class','hidden','aria-hidden'],childList:true});
    }
  }

  function start(){
    patch();
    watchTargets();
    ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:routechange','mijnserenity:theme-changed','mijnserenity:start-requested','pageshow'].forEach(type=>{
      window.addEventListener(type,queuePatch,{passive:true});
    });
    document.addEventListener('click',event=>{
      if(event.target instanceof Element&&event.target.closest('[data-target],[data-route],[data-go]'))setTimeout(queuePatch,40);
    },{capture:true,passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)queuePatch()},{passive:true});
    setTimeout(queuePatch,100);
    setTimeout(queuePatch,350);
    setTimeout(queuePatch,900);
    setTimeout(queuePatch,1800);
    setInterval(()=>{if(!document.hidden)queuePatch()},15000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();