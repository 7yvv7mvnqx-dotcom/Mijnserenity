/* MijnSerenity 8.26.3 — VriJon motorjacht in Serenity branding */
(()=>{
  'use strict';
  if(window.__msVriJonBrand8263)return;
  window.__msVriJonBrand8263=true;

  const BUILD='8.26.3';
  const BASE='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@6d09297eca78d72ad30db2210aeacbee861a4556/start-dashboard-71510.js';
  const STYLE_ID='ms8263VriJonBrandStyle';
  let observer=null;

  const VRIJON=`<svg class="ms8263-vrijon-svg" viewBox="0 0 170 76" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
      <path class="ms8263-vrijon-rail" d="M31 38h101M43 38V31m20 7V29m25 9V27m24 11V30m19 8v-6"/>
      <path class="ms8263-vrijon-cabin" d="M47 43V28h50l25 15M58 28l10-11h21l13 11"/>
      <path class="ms8263-vrijon-window" d="M55 31h15v10H55zm19 0h15v10H74zm19 0h14l10 10H93z"/>
      <path class="ms8263-vrijon-mast" d="M87 17V8m0 2h10m-10 4h-8"/>
      <path class="ms8263-vrijon-hull" d="M18 44h137l-12 18H39c-9 0-16-6-21-18Z"/>
      <path class="ms8263-vrijon-stripe" d="M28 49h119"/>
      <path class="ms8263-vrijon-wave" d="M8 67c15-5 29-5 43 0 14 5 29 5 43 0 14-5 29-5 44 0"/>
    </g>
  </svg>`;

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const version=document.getElementById('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
  }

  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #ms8210Start .ms8263-vrijon-hero,#ms8210Start .ms8263-vrijon-lockup{display:inline-grid!important;place-items:center!important;flex:0 0 auto!important;overflow:visible!important;color:#39c9f4!important;filter:drop-shadow(0 5px 12px rgba(18,179,228,.16))!important}
      #ms8210Start .ms8263-vrijon-hero{width:clamp(132px,31vw,245px)!important;height:clamp(60px,14vw,108px)!important;margin:0 0 8px!important}
      #ms8210Start .ms8263-vrijon-lockup{width:1.22em!important;height:.62em!important;margin:0 .08em .02em 0!important}
      #ms8210Start .ms8263-vrijon-svg{display:block!important;width:100%!important;height:100%!important;overflow:visible!important}
      #ms8210Start .ms8263-vrijon-hull{fill:rgba(15,111,151,.35);stroke:currentColor;stroke-width:3}
      #ms8210Start .ms8263-vrijon-cabin{fill:rgba(107,219,249,.16);stroke:currentColor;stroke-width:2.2}
      #ms8210Start .ms8263-vrijon-window{fill:rgba(2,34,51,.95);stroke:#79e5ff;stroke-width:1.5}
      #ms8210Start .ms8263-vrijon-rail,#ms8210Start .ms8263-vrijon-mast{stroke:currentColor;stroke-width:1.7}
      #ms8210Start .ms8263-vrijon-stripe{stroke:#55ddff;stroke-width:2.2}
      #ms8210Start .ms8263-vrijon-wave{stroke:#32d4ff;stroke-width:2.1;opacity:.92}
      html[data-ms-daynight="day"] #ms8210Start .ms8263-vrijon-hero,html[data-ms-daynight="day"] #ms8210Start .ms8263-vrijon-lockup{color:#047fc4!important;filter:drop-shadow(0 3px 7px rgba(4,83,134,.10))!important}
      @media(max-width:620px) and (orientation:portrait){#ms8210Start .ms8263-vrijon-hero{width:128px!important;height:58px!important;margin-bottom:5px!important}#ms8210Start .ms8263-vrijon-lockup{width:1.08em!important;height:.58em!important}}
    `;
    document.head.appendChild(style);
  }

  function patch(){
    syncBuild();
    installStyle();
    const root=document.getElementById('ms8210Start');
    if(!root)return;
    root.querySelectorAll('.ms8234-sail,.ms8218-brand-sail').forEach(sail=>{
      const replacement=document.createElement('span');
      replacement.className=sail.classList.contains('ms8234-sail')?'ms8263-vrijon-hero':'ms8263-vrijon-lockup';
      replacement.setAttribute('aria-hidden','true');
      replacement.innerHTML=VRIJON;
      sail.replaceWith(replacement);
    });
    if(!observer){
      observer=new MutationObserver(()=>requestAnimationFrame(patch));
      observer.observe(root,{subtree:true,childList:true});
    }
  }

  function start(){
    patch();
    ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:start-requested','mijnserenity:theme-changed','pageshow'].forEach(type=>window.addEventListener(type,()=>requestAnimationFrame(patch),{passive:true}));
    [0,200,600,1400,3000].forEach(ms=>setTimeout(patch,ms));
    console.info(`MijnSerenity ${BUILD}: VriJon motorjacht vervangt het zeilboot-logo.`);
  }

  function loadBase(){
    if(window.__msStartIphone8262){start();return}
    const script=document.createElement('script');
    script.src=BASE;
    script.async=false;
    script.crossOrigin='anonymous';
    script.onload=start;
    script.onerror=start;
    document.head.appendChild(script);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadBase,{once:true});
  else loadBase();
})();
