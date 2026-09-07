/* MijnSerenity 8.27.4 live header bootstrap */
(()=>{
  'use strict';
  if(window.__ms8274LiveHeader)return;
  window.__ms8274LiveHeader=true;

  const BUILD='8.27.4';
  const PRIOR='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@7c27ef93b619e9074732b64e9d7c12b22653715d/start-dashboard-71510.js?v=827400';
  const PHOTO='/assets/serenity-hero-8274.jpg?v=827400';
  const STYLE_ID='ms8274LiveHeaderStyle';
  let queued=false;

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
      if(window.__ms8272ExactSerenityHero){resolve();return;}
      let script=document.querySelector('script[data-ms8274-prior]');
      if(script){script.addEventListener('load',resolve,{once:true});setTimeout(resolve,5000);return;}
      script=document.createElement('script');
      script.src=PRIOR;
      script.async=false;
      script.crossOrigin='anonymous';
      script.dataset.ms8274Prior='1';
      script.onload=resolve;
      script.onerror=()=>{console.error('MijnSerenity 8.27.2 basis kon niet worden geladen.');resolve();};
      (document.head||document.documentElement).appendChild(script);
      setTimeout(resolve,5000);
    });
  }

  function installStyle(){
    document.getElementById(STYLE_ID)?.remove();
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #ms8210Start{background:#031421!important}
      #ms8210Start .ms8234-header.ms8274-live{
        position:relative!important;isolation:isolate!important;overflow:hidden!important;
        background:#041725!important;background-image:none!important;
      }
      #ms8210Start .ms8234-header.ms8274-live>.ms8274-photo{
        position:absolute!important;inset:0!important;z-index:0!important;width:100%!important;height:100%!important;
        object-fit:cover!important;object-position:center center!important;display:block!important;pointer-events:none!important;
      }
      #ms8210Start .ms8234-header.ms8274-live>.ms8274-overlay{
        position:absolute!important;inset:0!important;z-index:1!important;pointer-events:none!important;
        background:linear-gradient(90deg,rgba(0,13,23,.78) 0%,rgba(0,13,23,.48) 32%,rgba(0,13,23,.10) 57%,rgba(0,13,23,.03) 75%),linear-gradient(0deg,rgba(1,12,20,.56) 0%,rgba(1,12,20,.08) 44%,rgba(1,12,20,0) 68%)!important;
      }
      #ms8210Start .ms8234-header.ms8274-live>.ms8234-brand,
      #ms8210Start .ms8234-header.ms8274-live>.ms8234-hero,
      #ms8210Start .ms8234-header.ms8274-live>.ms8234-status-grid,
      #ms8210Start .ms8234-header.ms8274-live>.ms8272-night{position:absolute!important}
      #ms8210Start .ms8234-header.ms8274-live>.ms8234-brand{z-index:20!important}
      #ms8210Start .ms8234-header.ms8274-live>.ms8234-hero{z-index:18!important}
      #ms8210Start .ms8234-header.ms8274-live>.ms8234-status-grid{z-index:22!important}
      #ms8210Start .ms8234-header.ms8274-live>.ms8272-night{z-index:30!important}
      #ms8210Start .ms8274-live .ms8234-live-metrics,
      #ms8210Start .ms8274-live .ms8234-status{backdrop-filter:blur(16px) saturate(120%)!important;-webkit-backdrop-filter:blur(16px) saturate(120%)!important}
      #ms8210Start .ms8274-live .ms8272-live-button{background:linear-gradient(105deg,#14b9df,#29d1ed)!important}
      @media(max-width:760px){
        #ms8210Start .ms8234-header.ms8274-live>.ms8274-photo{object-position:58% center!important}
      }
    `;
    document.head.appendChild(style);
  }

  function apply(){
    syncBuild();installStyle();
    const root=document.getElementById('ms8210Start');
    const header=root?.querySelector('.ms8234-header')||root?.querySelector('.ms8210-header');
    if(!header)return false;
    header.classList.add('ms8274-live');
    header.dataset.msHeroBuild='8274';
    let img=header.querySelector(':scope > .ms8274-photo');
    if(!img){
      img=document.createElement('img');img.className='ms8274-photo';img.alt='';img.setAttribute('aria-hidden','true');header.prepend(img);
    }
    if(!img.src.includes('serenity-hero-8274.jpg'))img.src=PHOTO;
    let overlay=header.querySelector(':scope > .ms8274-overlay');
    if(!overlay){overlay=document.createElement('span');overlay.className='ms8274-overlay';overlay.setAttribute('aria-hidden','true');img.insertAdjacentElement('afterend',overlay)}
    const shore=[...header.querySelectorAll('.ms8234-status')].find(node=>/walstroom/i.test(node.textContent||''));
    if(shore){
      const strong=shore.querySelector('strong');
      if(strong&&/^[\s—–-]*$/.test(strong.textContent||''))strong.textContent='Niet aangesloten';
    }
    return true;
  }

  function queue(){
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;apply()});
  }

  function start(){
    syncBuild();installStyle();apply();
    [100,300,700,1400,2600,5000,9000].forEach(ms=>setTimeout(apply,ms));
    ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:start-requested','mijnserenity:routechange','mijnserenity:theme-changed','pageshow','online']
      .forEach(type=>window.addEventListener(type,queue,{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()},{passive:true});
    window.addEventListener('resize',queue,{passive:true});
    const root=document.getElementById('ms8210Start');
    if(root){const observer=new MutationObserver(queue);observer.observe(root,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),30000)}
    console.info(`MijnSerenity ${BUILD}: vernieuwde Serenity-header actief.`);
  }

  loadPrior().finally(start);
})();