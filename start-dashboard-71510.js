/* MijnSerenity 8.27.0 — echte Serenity-foto als live dashboardheader. */
(()=>{
  'use strict';
  if(window.__ms8270LiveSerenityHeader)return;
  window.__ms8270LiveSerenityHeader=true;

  const BUILD='8.27.0';
  const PRIOR='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@7e0a3ea18c6267b71c715bba23357729799007b9/start-dashboard-71510.js?v=827000';
  const PARTS=[
    '/assets/serenity-real-8269-01.txt?v=827001',
    '/assets/serenity-real-8269-02.txt?v=827001',
    '/assets/serenity-real-8269-03.txt?v=827001'
  ];
  const STYLE_ID='ms8270LiveSerenityHeaderStyle';
  let imageUrl='';
  let imagePromise=null;

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const version=document.getElementById('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
  }

  function loadPrior(){
    return new Promise(resolve=>{
      if(window.__ms8268OriginalHero){resolve();return;}
      const script=document.createElement('script');
      script.src=PRIOR;
      script.async=false;
      script.crossOrigin='anonymous';
      script.onload=resolve;
      script.onerror=()=>{console.error('MijnSerenity 8.26.8 basis kon niet worden geladen.');resolve();};
      (document.head||document.documentElement).appendChild(script);
      setTimeout(resolve,4500);
    });
  }

  async function loadRealPhoto(){
    if(imageUrl)return imageUrl;
    if(imagePromise)return imagePromise;
    imagePromise=(async()=>{
      const chunks=[];
      for(const path of PARTS){
        const response=await fetch(path,{cache:'no-store',credentials:'same-origin'});
        if(!response.ok)throw new Error(`Serenity-fotodeel ${response.status}: ${path}`);
        chunks.push((await response.text()).trim());
      }
      const base64=chunks.join('').replace(/\s+/g,'');
      if(!base64.startsWith('/9j/'))throw new Error('Serenity-foto is geen geldige JPEG');
      imageUrl=`data:image/jpeg;base64,${base64}`;
      return imageUrl;
    })().catch(error=>{
      console.error('Echte Serenity-headerfoto kon niet worden opgebouwd.',error);
      imagePromise=null;
      return '';
    });
    return imagePromise;
  }

  function installStyle(){
    document.getElementById(STYLE_ID)?.remove();
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      html #ms8210Start .ms8234-header.ms8270-live-hero,
      html #dashboard .ms71514-hero.ms8270-live-hero{
        position:relative!important;
        overflow:hidden!important;
        isolation:isolate!important;
        background-color:#041725!important;
        background-image:
          linear-gradient(90deg,rgba(1,12,20,.72) 0%,rgba(1,12,20,.48) 28%,rgba(1,12,20,.12) 58%,rgba(1,12,20,.08) 100%),
          linear-gradient(0deg,rgba(1,10,18,.72) 0%,rgba(1,10,18,.08) 52%,rgba(1,10,18,0) 72%),
          var(--ms8270-real-photo)!important;
        background-size:cover!important;
        background-position:center center!important;
        background-repeat:no-repeat!important;
        border:1px solid rgba(57,201,244,.40)!important;
        box-shadow:inset 0 0 0 1px rgba(54,203,246,.08),0 18px 44px rgba(0,0,0,.28)!important;
      }
      html #ms8210Start .ms8234-header.ms8270-live-hero{
        min-height:clamp(330px,58vw,570px)!important;
        border-radius:clamp(18px,3vw,30px)!important;
        padding:clamp(18px,3.8vw,42px)!important;
        padding-bottom:clamp(54px,8vw,86px)!important;
      }
      html #ms8210Start .ms8234-header.ms8270-live-hero::before,
      html #ms8210Start .ms8234-header.ms8270-live-hero::after{opacity:0!important;background:none!important}
      html #ms8210Start .ms8263-vrijon-hero,
      html #ms8210Start .ms8263-vrijon-lockup,
      html #ms8210Start .ms8263-vrijon-svg,
      html #ms8210Start .ms8234-sail,
      html #ms8210Start .ms8218-brand-sail{display:none!important}
      html #ms8210Start .ms8234-header.ms8270-live-hero .ms8234-brand,
      html #ms8210Start .ms8234-header.ms8270-live-hero .ms8234-greeting,
      html #ms8210Start .ms8234-header.ms8270-live-hero .ms8234-attention{position:relative;z-index:3}
      html #ms8210Start .ms8234-header.ms8270-live-hero .ms8234-brand h1,
      html #ms8210Start .ms8234-header.ms8270-live-hero .ms8218-serenity-brand,
      html #ms8210Start .ms8234-header.ms8270-live-hero .ms8218-brand-lockup{
        color:#35c9f4!important;
        font-family:Georgia,"Times New Roman",serif!important;
        text-shadow:0 3px 18px rgba(0,0,0,.66)!important;
      }
      html #ms8210Start .ms8234-header.ms8270-live-hero .ms8254-tagline{color:#f7fbff!important;text-shadow:0 2px 10px rgba(0,0,0,.75)!important}
      html #ms8210Start .ms8234-header.ms8270-live-hero .ms8234-greeting{color:#fff!important;text-shadow:0 3px 14px rgba(0,0,0,.78)!important}
      html #ms8210Start .ms8234-header.ms8270-live-hero .ms8245-date{color:#b7d1e5!important;text-shadow:0 2px 10px rgba(0,0,0,.75)!important}
      html #ms8210Start .ms8234-header.ms8270-live-hero .ms8234-attention{
        background:rgba(3,29,47,.91)!important;
        border-color:rgba(57,201,244,.34)!important;
        color:#fff!important;
        box-shadow:0 14px 34px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.05)!important;
        backdrop-filter:blur(16px) saturate(125%)!important;
        -webkit-backdrop-filter:blur(16px) saturate(125%)!important;
      }
      html #ms8210Start .ms8234-header.ms8270-live-hero .ms8234-attention-copy strong{color:#fff!important}
      html #ms8210Start .ms8234-header.ms8270-live-hero .ms8234-attention-copy small{color:#adc6d8!important}
      html #dashboard .ms71514-hero.ms8270-live-hero>img{opacity:0!important}
      @media(max-width:620px) and (orientation:portrait){
        html #ms8210Start .ms8234-header.ms8270-live-hero{
          min-height:clamp(350px,74vw,500px)!important;
          background-position:52% center!important;
          padding:18px 16px 58px!important;
        }
        html #ms8210Start .ms8234-header.ms8270-live-hero .ms8234-brand{width:52%!important;max-width:52%!important}
        html #ms8210Start .ms8234-header.ms8270-live-hero .ms8234-attention{right:10px!important;top:12px!important;width:43%!important;max-width:180px!important}
      }
      @media(min-width:621px){
        html #ms8210Start .ms8234-header.ms8270-live-hero{background-position:center 48%!important}
      }
    `;
    (document.head||document.documentElement).appendChild(style);
  }

  function applyTo(target,url){
    if(!target||!url)return;
    target.classList.remove('ms8268-home-hero');
    target.classList.add('ms8270-live-hero');
    target.style.setProperty('--ms8270-real-photo',`url("${url}")`);
    target.dataset.msHeroBuild='8270';
  }

  function modernHeader(){
    const root=document.getElementById('ms8210Start');
    return root?.querySelector('.ms8234-header')||root?.querySelector('.ms8210-header')||null;
  }

  async function refresh(){
    syncBuild();
    installStyle();
    const url=await loadRealPhoto();
    if(!url)return;
    applyTo(modernHeader(),url);
    applyTo(document.querySelector('#dashboard .ms71514-hero'),url);
  }

  loadPrior().finally(()=>{
    void refresh();
    [150,500,1200,2500,5000].forEach(ms=>setTimeout(()=>void refresh(),ms));
  });

  ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:start-requested','mijnserenity:routechange','mijnserenity:theme-changed','pageshow','online']
    .forEach(type=>window.addEventListener(type,()=>requestAnimationFrame(()=>void refresh()),{passive:true}));
})();