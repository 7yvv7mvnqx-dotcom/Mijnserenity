/* MijnSerenity 8.27.3 — achtergrondfoto hard als echte laag achter de bestaande startheader. */
(()=>{
  'use strict';
  if(window.__ms8273Backdrop)return;
  window.__ms8273Backdrop=true;

  const BUILD='8.27.3';
  const PRIOR='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@7c27ef93b619e9074732b64e9d7c12b22653715d/start-dashboard-71510.js?v=827300';
  const PARTS=[
    '/assets/serenity-header-8270-01.txt?v=827300',
    '/assets/serenity-header-8270-02.txt?v=827300'
  ];
  const STYLE_ID='ms8273BackdropStyle';
  let photoUrl='';
  let photoPromise=null;
  let queued=false;
  let observer=null;

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
      let script=document.querySelector('script[data-ms8273-prior]');
      if(script){
        script.addEventListener('load',resolve,{once:true});
        setTimeout(resolve,5000);
        return;
      }
      script=document.createElement('script');
      script.src=PRIOR;
      script.async=false;
      script.crossOrigin='anonymous';
      script.dataset.ms8273Prior='1';
      script.onload=resolve;
      script.onerror=()=>{console.error('MijnSerenity 8.27.2 basis kon niet worden geladen.');resolve();};
      (document.head||document.documentElement).appendChild(script);
      setTimeout(resolve,5000);
    });
  }

  async function loadPhoto(force=false){
    if(photoUrl&&!force)return photoUrl;
    if(photoPromise&&!force)return photoPromise;
    photoPromise=(async()=>{
      const chunks=[];
      for(const path of PARTS){
        const response=await fetch(path,{cache:'no-store',credentials:'same-origin'});
        if(!response.ok)throw new Error(`Serenity-fotodeel ${response.status}: ${path}`);
        chunks.push((await response.text()).trim());
      }
      const base64=chunks.join('').replace(/\s+/g,'');
      if(!base64.startsWith('/9j/'))throw new Error('Serenity-achtergrond is geen geldige JPEG');
      photoUrl=`data:image/jpeg;base64,${base64}`;
      return photoUrl;
    })().catch(error=>{
      console.error('Serenity-achtergrond kon niet worden opgebouwd.',error);
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
      #ms8210Start .ms8234-header.ms8273-photo-ready{
        position:relative!important;
        isolation:isolate!important;
        overflow:hidden!important;
        background:#041725!important;
      }
      #ms8210Start .ms8234-header.ms8273-photo-ready>.ms8273-backdrop{
        position:absolute!important;
        inset:0!important;
        z-index:0!important;
        display:block!important;
        width:100%!important;
        height:100%!important;
        max-width:none!important;
        object-fit:cover!important;
        object-position:center center!important;
        opacity:1!important;
        pointer-events:none!important;
        user-select:none!important;
        -webkit-user-drag:none!important;
        transform:none!important;
        filter:none!important;
      }
      #ms8210Start .ms8234-header.ms8273-photo-ready>.ms8273-photo-overlay{
        position:absolute!important;
        inset:0!important;
        z-index:1!important;
        display:block!important;
        pointer-events:none!important;
        background:
          linear-gradient(90deg,rgba(0,13,23,.78) 0%,rgba(0,13,23,.53) 29%,rgba(0,13,23,.15) 52%,rgba(0,13,23,.01) 71%,rgba(0,13,23,.08) 100%),
          linear-gradient(0deg,rgba(1,12,20,.58) 0%,rgba(1,12,20,.10) 40%,rgba(1,12,20,0) 67%)!important;
      }
      #ms8210Start .ms8234-header.ms8273-photo-ready>.ms8234-brand,
      #ms8210Start .ms8234-header.ms8273-photo-ready>.ms8234-hero,
      #ms8210Start .ms8234-header.ms8273-photo-ready>.ms8234-status-grid,
      #ms8210Start .ms8234-header.ms8273-photo-ready>.ms8272-night,
      #ms8210Start .ms8234-header.ms8273-photo-ready>.ms8271-night-control,
      #ms8210Start .ms8234-header.ms8273-photo-ready>.ms8234-greeting,
      #ms8210Start .ms8234-header.ms8273-photo-ready>.ms8234-attention{
        position:absolute!important;
      }
      #ms8210Start .ms8234-header.ms8273-photo-ready>.ms8234-brand{z-index:20!important}
      #ms8210Start .ms8234-header.ms8273-photo-ready>.ms8234-hero{z-index:18!important}
      #ms8210Start .ms8234-header.ms8273-photo-ready>.ms8234-status-grid{z-index:22!important}
      #ms8210Start .ms8234-header.ms8273-photo-ready>.ms8272-night,
      #ms8210Start .ms8234-header.ms8273-photo-ready>.ms8271-night-control{z-index:30!important}
      @media(max-width:760px){
        #ms8210Start .ms8234-header.ms8273-photo-ready>.ms8273-backdrop{object-position:58% center!important}
      }
    `;
    (document.head||document.documentElement).appendChild(style);
  }

  function header(){
    const root=document.getElementById('ms8210Start');
    return root?.querySelector('.ms8234-header')||root?.querySelector('.ms8210-header')||null;
  }

  function applyPhoto(url){
    syncBuild();
    installStyle();
    const target=header();
    if(!target||!url)return false;
    target.classList.add('ms8273-photo-ready');
    target.dataset.msHeroBuild='8273';

    let img=target.querySelector(':scope > .ms8273-backdrop');
    if(!img){
      img=document.createElement('img');
      img.className='ms8273-backdrop';
      img.alt='';
      img.setAttribute('aria-hidden','true');
      target.prepend(img);
    }
    if(img.src!==url)img.src=url;

    let overlay=target.querySelector(':scope > .ms8273-photo-overlay');
    if(!overlay){
      overlay=document.createElement('span');
      overlay.className='ms8273-photo-overlay';
      overlay.setAttribute('aria-hidden','true');
      img.insertAdjacentElement('afterend',overlay);
    }
    return true;
  }

  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(async()=>{
      queued=false;
      const url=await loadPhoto();
      applyPhoto(url);
    });
  }

  function watch(){
    const root=document.getElementById('ms8210Start');
    if(!root||observer)return;
    observer=new MutationObserver(queue);
    observer.observe(root,{childList:true,subtree:true});
    setTimeout(()=>{observer?.disconnect();observer=null},30000);
  }

  function start(){
    syncBuild();
    installStyle();
    queue();
    [100,300,700,1400,2600,5000,9000].forEach(ms=>setTimeout(queue,ms));
    watch();
    ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:start-requested','mijnserenity:routechange','mijnserenity:theme-changed','pageshow','online']
      .forEach(type=>window.addEventListener(type,queue,{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()},{passive:true});
    window.addEventListener('resize',queue,{passive:true});
    console.info(`MijnSerenity ${BUILD}: Serenity-achtergrond geforceerd als echte afbeeldingslaag.`);
  }

  loadPrior().finally(start);
})();
