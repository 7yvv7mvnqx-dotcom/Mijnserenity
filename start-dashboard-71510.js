/* MijnSerenity 8.28.0 — volledig nieuwe, responsieve Serenity-header. */
(()=>{
  'use strict';
  if(window.__ms8280Header)return;
  window.__ms8280Header=true;

  const BUILD='8.28.0';
  const BUILD_TOKEN='828000';
  const CORE='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@de78ddf4fba781d312d7aa109c0f06f3e358e49d/start-dashboard-71510.js?v=828000';
  const PHOTO=`/assets/serenity-hero-8275.jpg?v=${BUILD_TOKEN}`;
  const STYLE_ID='ms8280HeaderStyle';
  let corePromise=null;
  let mountQueued=false;
  let observer=null;

  const norm=value=>String(value||'').replace(/\s+/g,' ').trim();
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

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
      let script=document.querySelector('script[data-ms8280-core]');
      if(script){
        if(window.__msStartStatus8265)resolve();
        else{
          script.addEventListener('load',resolve,{once:true});
          script.addEventListener('error',resolve,{once:true});
          setTimeout(resolve,7000);
        }
        return;
      }
      script=document.createElement('script');
      script.src=CORE;
      script.async=false;
      script.crossOrigin='anonymous';
      script.dataset.ms8280Core='1';
      script.onload=resolve;
      script.onerror=()=>{
        console.error('MijnSerenity 8.28.0: startdashboard-kern kon niet worden geladen.');
        resolve();
      };
      (document.head||document.documentElement).appendChild(script);
      setTimeout(resolve,7000);
    });
    return corePromise;
  }

  function removeLegacyHeaderStyles(){
    [
      'ms8270LiveSerenityHeaderStyle','ms8271UnifiedSerenityHeaderStyle','ms8271HeaderStyle',
      'ms8272ExactSerenityHeroStyle','ms8273BackdropStyle','ms8274LiveHeaderStyle',
      'ms8275HeaderFixStyle','ms8276SolidHeaderStyle','ms8278HeroFixStyle'
    ].forEach(id=>document.getElementById(id)?.remove());
  }

  function installStyle(){
    removeLegacyHeaderStyles();
    let style=document.getElementById(STYLE_ID);
    if(!style){
      style=document.createElement('style');
      style.id=STYLE_ID;
      (document.head||document.documentElement).appendChild(style);
    }
    style.textContent=`
      #ms8210Start,
      #ms8210Start .ms8210-shell{
        box-sizing:border-box!important;
        width:100%!important;
        max-width:none!important;
        margin:0!important;
      }

      #ms8210Start .ms8280-header{
        position:relative!important;
        isolation:isolate!important;
        display:flex!important;
        flex-direction:column!important;
        box-sizing:border-box!important;
        width:100%!important;
        min-height:0!important;
        margin:0!important;
        padding:clamp(20px,3.2vw,38px)!important;
        overflow:hidden!important;
        border:1px solid rgba(57,201,244,.38)!important;
        border-radius:clamp(22px,3vw,30px)!important;
        background:#031522!important;
        color:#fff!important;
        box-shadow:inset 0 0 0 1px rgba(96,224,255,.05),0 18px 48px rgba(0,0,0,.26)!important;
      }

      #ms8210Start .ms8280-photo,
      #ms8210Start .ms8280-overlay{
        position:absolute!important;
        inset:0!important;
        width:100%!important;
        height:100%!important;
        pointer-events:none!important;
      }
      #ms8210Start .ms8280-photo{
        z-index:0!important;
        display:block!important;
        object-fit:cover!important;
        object-position:64% 50%!important;
      }
      #ms8210Start .ms8280-overlay{
        z-index:1!important;
        background:
          linear-gradient(90deg,rgba(1,14,24,.94) 0%,rgba(1,14,24,.78) 31%,rgba(1,14,24,.40) 57%,rgba(1,14,24,.13) 78%,rgba(1,14,24,.06) 100%),
          linear-gradient(0deg,rgba(1,12,20,.76) 0%,rgba(1,12,20,.15) 48%,rgba(1,12,20,.03) 72%)!important;
      }

      #ms8210Start .ms8280-topbar,
      #ms8210Start .ms8280-content{
        position:relative!important;
        z-index:3!important;
      }
      #ms8210Start .ms8280-topbar{
        display:grid!important;
        grid-template-columns:minmax(0,1fr) auto!important;
        align-items:start!important;
        gap:16px!important;
      }
      #ms8210Start .ms8280-brand{min-width:0!important}
      #ms8210Start .ms8280-brand-title{
        display:block!important;
        margin:0!important;
        color:#29cdf4!important;
        font-family:Georgia,"Times New Roman",serif!important;
        font-size:clamp(50px,6vw,76px)!important;
        font-weight:500!important;
        line-height:.9!important;
        letter-spacing:-.055em!important;
        text-shadow:0 3px 18px rgba(0,0,0,.54)!important;
      }
      #ms8210Start .ms8280-brand-tagline{
        display:block!important;
        margin:12px 0 0 4px!important;
        color:#fff!important;
        font:850 clamp(8px,1vw,11px)/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        letter-spacing:.23em!important;
        text-transform:uppercase!important;
        white-space:nowrap!important;
        text-shadow:0 2px 10px rgba(0,0,0,.78)!important;
      }

      #ms8210Start .ms8280-actions{
        display:flex!important;
        flex-wrap:wrap!important;
        justify-content:flex-end!important;
        align-items:center!important;
        gap:9px!important;
        max-width:340px!important;
      }
      #ms8210Start .ms8280-actions .ms8280-attention,
      #ms8210Start .ms8280-actions #ms8210Summary,
      #ms8210Start .ms8280-actions .ms8280-night{
        position:static!important;
        inset:auto!important;
        transform:none!important;
        box-sizing:border-box!important;
        margin:0!important;
        min-width:0!important;
        min-height:48px!important;
        height:auto!important;
        border:1px solid rgba(65,205,246,.30)!important;
        border-radius:18px!important;
        background:rgba(2,30,48,.88)!important;
        color:#fff!important;
        box-shadow:0 10px 26px rgba(0,0,0,.24)!important;
        backdrop-filter:blur(16px) saturate(120%)!important;
        -webkit-backdrop-filter:blur(16px) saturate(120%)!important;
      }
      #ms8210Start .ms8280-actions .ms8280-attention,
      #ms8210Start .ms8280-actions #ms8210Summary{
        display:flex!important;
        align-items:center!important;
        justify-content:flex-start!important;
        gap:9px!important;
        width:auto!important;
        max-width:205px!important;
        padding:8px 11px!important;
        text-align:left!important;
      }
      #ms8210Start .ms8280-actions .ms8280-attention .ms8234-attention-copy,
      #ms8210Start .ms8280-actions #ms8210Summary .ms8234-attention-copy{min-width:0!important}
      #ms8210Start .ms8280-actions .ms8280-attention .ms8234-attention-copy strong,
      #ms8210Start .ms8280-actions #ms8210Summary .ms8234-attention-copy strong{
        display:block!important;
        max-width:100%!important;
        color:#fff!important;
        font-size:13px!important;
        line-height:1.08!important;
        white-space:normal!important;
        overflow-wrap:normal!important;
        word-break:normal!important;
      }
      #ms8210Start .ms8280-actions .ms8280-attention .ms8234-attention-copy small,
      #ms8210Start .ms8280-actions #ms8210Summary .ms8234-attention-copy small{display:none!important}
      #ms8210Start .ms8280-actions .ms8280-night{
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        gap:8px!important;
        min-width:118px!important;
        padding:0 15px!important;
        border-radius:999px!important;
        font:800 14px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        white-space:nowrap!important;
      }

      #ms8210Start .ms8280-content{
        width:min(650px,68%)!important;
        margin-top:clamp(76px,10vw,132px)!important;
      }
      #ms8210Start .ms8280-eyebrow{
        display:block!important;
        margin:0 0 14px!important;
        color:#2ed5f8!important;
        font:900 14px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        letter-spacing:.20em!important;
        text-transform:uppercase!important;
        text-shadow:0 2px 10px rgba(0,0,0,.72)!important;
      }
      #ms8210Start .ms8280-title{
        max-width:640px!important;
        margin:0!important;
        color:#fff!important;
        font:900 clamp(48px,5.2vw,68px)/.97 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        letter-spacing:-.052em!important;
        text-wrap:balance!important;
        text-shadow:0 3px 16px rgba(0,0,0,.68)!important;
      }
      #ms8210Start .ms8280-subtitle{
        max-width:610px!important;
        margin:14px 0 18px!important;
        color:#eef7fb!important;
        font:650 clamp(14px,1.6vw,17px)/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        text-shadow:0 2px 12px rgba(0,0,0,.78)!important;
      }

      #ms8210Start .ms8280-metrics,
      #ms8210Start .ms8280-metrics.ms8234-live-metrics{
        display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        width:100%!important;
        max-width:610px!important;
        margin:0 0 16px!important;
        padding:10px 8px!important;
        overflow:hidden!important;
        border:1px solid rgba(57,201,244,.32)!important;
        border-radius:22px!important;
        background:rgba(2,27,44,.77)!important;
        box-shadow:0 11px 28px rgba(0,0,0,.23)!important;
        backdrop-filter:blur(16px) saturate(122%)!important;
        -webkit-backdrop-filter:blur(16px) saturate(122%)!important;
      }
      #ms8210Start .ms8280-metrics .ms8234-live-metric{
        display:grid!important;
        grid-template-columns:24px minmax(0,1fr)!important;
        align-items:center!important;
        gap:8px!important;
        box-sizing:border-box!important;
        min-width:0!important;
        width:auto!important;
        margin:0!important;
        padding:3px 13px!important;
        border:0!important;
        border-right:1px solid rgba(162,221,240,.22)!important;
        background:transparent!important;
        box-shadow:none!important;
      }
      #ms8210Start .ms8280-metrics .ms8234-live-metric:last-child{border-right:0!important}
      #ms8210Start .ms8280-metrics .ms8234-live-metric>span:first-child{
        display:grid!important;
        place-items:center!important;
        width:24px!important;
        min-width:24px!important;
        color:#fff!important;
        font-size:22px!important;
      }
      #ms8210Start .ms8280-metrics .ms8234-live-copy{display:block!important;min-width:0!important}
      #ms8210Start .ms8280-metrics .ms8234-live-copy strong{
        display:block!important;
        min-width:0!important;
        max-width:100%!important;
        overflow:hidden!important;
        color:#fff!important;
        font-size:clamp(15px,1.8vw,20px)!important;
        font-weight:850!important;
        line-height:1.1!important;
        white-space:nowrap!important;
        text-overflow:ellipsis!important;
      }
      #ms8210Start .ms8280-metrics .ms8234-live-copy small{
        display:block!important;
        margin-top:3px!important;
        overflow:hidden!important;
        color:#b7cad7!important;
        font-size:11px!important;
        line-height:1.15!important;
        white-space:nowrap!important;
        text-overflow:ellipsis!important;
      }

      #ms8210Start .ms8280-live-button{
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        gap:13px!important;
        box-sizing:border-box!important;
        width:min(520px,100%)!important;
        min-height:64px!important;
        margin:0!important;
        padding:14px 22px!important;
        border:1px solid rgba(151,242,255,.72)!important;
        border-radius:22px!important;
        background:linear-gradient(105deg,#13b9df,#2bd2eb)!important;
        color:#fff!important;
        font:850 19px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        box-shadow:0 15px 34px rgba(0,174,218,.31),inset 0 1px 0 rgba(255,255,255,.25)!important;
      }
      #ms8210Start .ms8280-live-button:active{transform:scale(.99)!important}
      #ms8210Start .ms8280-live-button .ms8280-chevron{margin-left:4px!important;font-size:27px!important}

      #ms8210Start .ms8280-status-grid,
      #ms8210Start .ms8280-status-grid.ms8234-status-grid{
        display:grid!important;
        grid-template-columns:repeat(5,minmax(0,1fr))!important;
        gap:10px!important;
        box-sizing:border-box!important;
        width:100%!important;
        margin:12px 0 0!important;
        padding:0!important;
        position:static!important;
        inset:auto!important;
      }
      #ms8210Start .ms8280-status-grid .ms8234-status{
        position:static!important;
        min-width:0!important;
        min-height:82px!important;
        margin:0!important;
        padding:12px 13px!important;
        border:1px solid rgba(57,201,244,.24)!important;
        border-radius:18px!important;
        background:rgba(3,28,45,.86)!important;
        box-shadow:none!important;
      }

      @media(max-width:760px){
        #ms8210Start .ms8280-header{
          padding:18px 16px 20px!important;
          border-radius:22px!important;
        }
        #ms8210Start .ms8280-photo{object-position:68% 50%!important}
        #ms8210Start .ms8280-overlay{
          background:
            linear-gradient(90deg,rgba(1,14,24,.95) 0%,rgba(1,14,24,.77) 38%,rgba(1,14,24,.37) 71%,rgba(1,14,24,.14) 100%),
            linear-gradient(0deg,rgba(1,12,20,.78) 0%,rgba(1,12,20,.18) 52%,rgba(1,12,20,.04) 78%)!important;
        }
        #ms8210Start .ms8280-topbar{grid-template-columns:minmax(0,1fr) minmax(126px,43%)!important;gap:10px!important}
        #ms8210Start .ms8280-brand-title{font-size:48px!important}
        #ms8210Start .ms8280-brand-tagline{
          max-width:100%!important;
          margin-top:9px!important;
          font-size:7.5px!important;
          letter-spacing:.16em!important;
          white-space:normal!important;
          line-height:1.35!important;
        }
        #ms8210Start .ms8280-actions{
          display:grid!important;
          grid-template-columns:1fr!important;
          justify-items:stretch!important;
          gap:7px!important;
          width:100%!important;
          max-width:none!important;
        }
        #ms8210Start .ms8280-actions .ms8280-attention,
        #ms8210Start .ms8280-actions #ms8210Summary,
        #ms8210Start .ms8280-actions .ms8280-night{
          width:100%!important;
          max-width:none!important;
          min-height:42px!important;
        }
        #ms8210Start .ms8280-actions .ms8280-attention,
        #ms8210Start .ms8280-actions #ms8210Summary{padding:7px 9px!important;border-radius:16px!important}
        #ms8210Start .ms8280-actions .ms8280-attention .ms8234-attention-copy strong,
        #ms8210Start .ms8280-actions #ms8210Summary .ms8234-attention-copy strong{font-size:11px!important;line-height:1.08!important}
        #ms8210Start .ms8280-actions .ms8280-night{min-width:0!important;padding:0 11px!important;font-size:13px!important}
        #ms8210Start .ms8280-content{
          width:100%!important;
          margin-top:clamp(62px,17vw,94px)!important;
        }
        #ms8210Start .ms8280-eyebrow{margin-bottom:11px!important;font-size:12px!important;letter-spacing:.18em!important}
        #ms8210Start .ms8280-title{max-width:95%!important;font-size:clamp(40px,11vw,50px)!important;line-height:.98!important}
        #ms8210Start .ms8280-subtitle{max-width:96%!important;margin:12px 0 16px!important;font-size:14px!important;line-height:1.35!important}
        #ms8210Start .ms8280-metrics,
        #ms8210Start .ms8280-metrics.ms8234-live-metrics{padding:9px 4px!important;border-radius:19px!important}
        #ms8210Start .ms8280-metrics .ms8234-live-metric{grid-template-columns:18px minmax(0,1fr)!important;gap:5px!important;padding:2px 7px!important}
        #ms8210Start .ms8280-metrics .ms8234-live-metric>span:first-child{width:18px!important;min-width:18px!important;font-size:18px!important}
        #ms8210Start .ms8280-metrics .ms8234-live-copy strong{font-size:14px!important}
        #ms8210Start .ms8280-metrics .ms8234-live-copy small{font-size:10px!important}
        #ms8210Start .ms8280-live-button{width:100%!important;min-height:58px!important;border-radius:20px!important;font-size:17px!important}
        #ms8210Start .ms8280-status-grid,
        #ms8210Start .ms8280-status-grid.ms8234-status-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}
        #ms8210Start .ms8280-status-grid .ms8234-status{min-height:76px!important;padding:10px!important;border-radius:16px!important}
        #ms8210Start .ms8280-status-grid .ms8234-status:last-child:nth-child(odd){grid-column:1/-1!important}
      }

      @media(max-width:380px){
        #ms8210Start .ms8280-header{padding-left:13px!important;padding-right:13px!important}
        #ms8210Start .ms8280-topbar{grid-template-columns:minmax(0,1fr) 128px!important}
        #ms8210Start .ms8280-brand-title{font-size:43px!important}
        #ms8210Start .ms8280-content{margin-top:54px!important}
        #ms8210Start .ms8280-title{font-size:39px!important}
        #ms8210Start .ms8280-metrics .ms8234-live-metric{padding-left:5px!important;padding-right:5px!important}
        #ms8210Start .ms8280-metrics .ms8234-live-copy strong{font-size:13px!important}
      }
    `;
  }

  function navigateLive(){
    try{
      if(typeof window.captainNavigate==='function'){
        const nav=document.querySelector('.bottom-nav .bottom-nav-item[data-target="live"]');
        window.captainNavigate('live',nav||null);
        return;
      }
      document.querySelector('.bottom-nav [data-target="live"],.tabs [data-target="live"],[data-ms8210-target="live"]')?.click();
    }catch(error){
      console.warn('Live varen openen mislukt:',error);
    }
  }

  function findAttention(root){
    const direct=root.querySelector('.ms8234-attention,#ms8210Summary');
    if(direct)return direct;
    return [...root.querySelectorAll('button,a,[role="button"]')].find(node=>{
      const text=norm(node.textContent).toLowerCase();
      return text.length<150&&text.includes('aandachtspunt');
    })||null;
  }

  function findNight(root){
    return [...root.querySelectorAll('button,[role="button"]')].find(node=>{
      const text=norm(node.textContent).toLowerCase();
      return text==='nacht'||text.startsWith('nacht ')||text.includes(' nacht')||text==='dag'||text.startsWith('dag ');
    })||null;
  }

  function fallbackMetrics(){
    const wrap=document.createElement('div');
    wrap.className='ms8234-live-metrics ms8280-metrics';
    const data=[
      ['⌁','ms8234Speed','0 km/u','Snelheid'],
      ['⌄','ms8234Depth','Geen meting','Diepte'],
      ['◉','ms8234Wind','Geen meting','Wind']
    ];
    data.forEach(([icon,id,strong,small])=>{
      const item=document.createElement('div');
      item.className='ms8234-live-metric';
      item.innerHTML=`<span aria-hidden="true">${icon}</span><span class="ms8234-live-copy"><strong id="${id}">${strong}</strong><small>${small}</small></span>`;
      wrap.appendChild(item);
    });
    return wrap;
  }

  function createHeader(metrics){
    const header=document.createElement('header');
    header.className='ms8280-header';
    header.dataset.msHeroBuild='8280';
    header.setAttribute('aria-label','Serenity start');

    const photo=document.createElement('img');
    photo.className='ms8280-photo';
    photo.src=PHOTO;
    photo.alt='';
    photo.setAttribute('aria-hidden','true');
    photo.decoding='async';
    photo.loading='eager';
    photo.fetchPriority='high';

    const overlay=document.createElement('div');
    overlay.className='ms8280-overlay';
    overlay.setAttribute('aria-hidden','true');

    const topbar=document.createElement('div');
    topbar.className='ms8280-topbar';

    const brand=document.createElement('div');
    brand.className='ms8280-brand';
    brand.innerHTML='<span class="ms8280-brand-title">Serenity</span><span class="ms8280-brand-tagline">EXPLORE · NAVIGATE · ENJOY</span>';

    const actions=document.createElement('div');
    actions.className='ms8280-actions';
    actions.setAttribute('aria-label','Snelle instellingen');

    topbar.append(brand,actions);

    const content=document.createElement('div');
    content.className='ms8280-content';

    const eyebrow=document.createElement('span');
    eyebrow.className='ms8280-eyebrow';
    eyebrow.textContent='WELKOM TERUG';

    const title=document.createElement('h2');
    title.className='ms8280-title';
    title.textContent='Klaar om te gaan varen?';

    const subtitle=document.createElement('p');
    subtitle.className='ms8280-subtitle';
    subtitle.textContent='Ontdek, vaar en geniet. De Serenity ligt klaar. Waar brengt de volgende reis je naartoe?';

    metrics.classList.add('ms8280-metrics');

    const button=document.createElement('button');
    button.type='button';
    button.className='ms8280-live-button';
    button.innerHTML='<span aria-hidden="true">▶</span><span>Start live varen</span><span class="ms8280-chevron" aria-hidden="true">›</span>';
    button.addEventListener('click',event=>{
      event.preventDefault();
      navigateLive();
    });

    content.append(eyebrow,title,subtitle,metrics,button);
    header.append(photo,overlay,topbar,content);
    return header;
  }

  function normalizeControl(control,type){
    if(!control)return null;
    control.classList.remove('ms8276-hidden','ms8278-hide-duplicate');
    if(type==='attention')control.classList.add('ms8280-attention');
    if(type==='night')control.classList.add('ms8280-night');
    control.hidden=false;
    control.removeAttribute('aria-hidden');
    return control;
  }

  function mount(){
    syncBuild();
    installStyle();

    const root=document.getElementById('ms8210Start');
    if(!root)return false;

    let current=root.querySelector(':scope .ms8280-header');
    const legacy=root.querySelector('.ms8234-header,.ms8210-header');

    if(!current){
      if(!legacy)return false;

      const attention=normalizeControl(findAttention(root),'attention');
      const night=normalizeControl(findNight(root),'night');
      const metrics=root.querySelector('.ms8234-live-metrics')||fallbackMetrics();
      const statusGrid=root.querySelector('.ms8234-status-grid');

      current=createHeader(metrics);
      legacy.replaceWith(current);

      const actions=current.querySelector('.ms8280-actions');
      if(attention)actions.appendChild(attention);
      if(night&&night!==attention)actions.appendChild(night);

      if(statusGrid){
        statusGrid.classList.add('ms8280-status-grid');
        current.insertAdjacentElement('afterend',statusGrid);
      }
    }else{
      if(legacy&&legacy!==current)legacy.remove();
      const actions=current.querySelector('.ms8280-actions');
      const attention=normalizeControl(findAttention(root),'attention');
      const night=normalizeControl(findNight(root),'night');
      if(attention&&attention.parentElement!==actions)actions.appendChild(attention);
      if(night&&night!==attention&&night.parentElement!==actions)actions.appendChild(night);
      const statusGrid=root.querySelector('.ms8234-status-grid');
      if(statusGrid){
        statusGrid.classList.add('ms8280-status-grid');
        if(statusGrid.previousElementSibling!==current)current.insertAdjacentElement('afterend',statusGrid);
      }
    }

    return true;
  }

  function queueMount(){
    if(mountQueued)return;
    mountQueued=true;
    requestAnimationFrame(()=>{
      mountQueued=false;
      mount();
    });
  }

  async function waitAndMount(){
    for(let i=0;i<120;i++){
      if(mount())return true;
      await sleep(75);
    }
    return false;
  }

  async function boot(){
    syncBuild();
    installStyle();
    try{
      const preload=new Image();
      preload.decoding='async';
      preload.src=PHOTO;
    }catch{}

    await loadCore();
    await waitAndMount();

    [250,700,1400,3000,6500,11500].forEach(ms=>setTimeout(mount,ms));
    [
      'mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:start-requested',
      'mijnserenity:routechange','mijnserenity:theme-changed','weather:update','weather:updated',
      'mijnserenity:weather-updated','pageshow','online'
    ].forEach(type=>window.addEventListener(type,queueMount,{passive:true}));

    document.addEventListener('visibilitychange',()=>{if(!document.hidden)queueMount()},{passive:true});
    window.addEventListener('resize',queueMount,{passive:true});

    const root=document.getElementById('ms8210Start');
    if(root&&!observer){
      observer=new MutationObserver(queueMount);
      observer.observe(root,{childList:true,subtree:true});
    }

    console.info(`MijnSerenity ${BUILD}: complete nieuwe Serenity-header actief.`);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();