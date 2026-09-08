/* MijnSerenity 8.28.1 — nieuwe Serenity-achtergrond live. */
(()=>{
  'use strict';
  if(window.__ms8281HeroPhoto)return;
  window.__ms8281HeroPhoto=true;

  const BUILD='8.28.1';
  const PRIOR='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@0261da95450099f9fef74f16b8ba20acd0f9e507/start-dashboard-71510.js?v=828100';
  const PARTS=Array.from({length:13},(_,i)=>`/assets/serenity-hero-8281-${String(i+1).padStart(2,'0')}.txt?v=828101`);
  let imageUrl='';
  let imagePromise=null;
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
    if(window.__ms8280Header)return Promise.resolve();
    return new Promise(resolve=>{
      let s=document.querySelector('script[data-ms8281-prior]');
      if(s){
        s.addEventListener('load',resolve,{once:true});
        s.addEventListener('error',resolve,{once:true});
        setTimeout(resolve,7000);
        return;
      }
      s=document.createElement('script');
      s.src=PRIOR;
      s.async=false;
      s.crossOrigin='anonymous';
      s.dataset.ms8281Prior='1';
      s.onload=resolve;
      s.onerror=()=>{console.error('MijnSerenity 8.28.1: headerbasis kon niet laden.'); resolve();};
      (document.head||document.documentElement).appendChild(s);
      setTimeout(resolve,7000);
    });
  }

  async function loadPhoto(){
    if(imageUrl)return imageUrl;
    if(imagePromise)return imagePromise;
    imagePromise=(async()=>{
      const chunks=[];
      for(const path of PARTS){
        const r=await fetch(path,{cache:'no-store',credentials:'same-origin'});
        if(!r.ok)throw new Error(`Serenity-fotodeel ${r.status}: ${path}`);
        chunks.push((await r.text()).trim());
      }
      const b64=chunks.join('').replace(/\s+/g,'');
      if(!b64.startsWith('/9j/'))throw new Error('Ongeldige Serenity JPEG');
      imageUrl=`data:image/jpeg;base64,${b64}`;
      return imageUrl;
    })().catch(err=>{console.error('Serenity-achtergrond kon niet worden opgebouwd.',err); imagePromise=null; return '';});
    return imagePromise;
  }

  function installStyle(){
    let style=document.getElementById('ms8281PhotoStyle');
    if(!style){
      style=document.createElement('style');
      style.id='ms8281PhotoStyle';
      (document.head||document.documentElement).appendChild(style);
    }
    style.textContent=`
      #ms8210Start .ms8280-photo{
        display:block!important;
        visibility:visible!important;
        opacity:1!important;
        object-fit:cover!important;
        object-position:62% 54%!important;
      }
      @media(max-width:760px){
        #ms8210Start .ms8280-photo{object-position:66% 54%!important}
      }
    `;
  }

  async function applyPhoto(){
    syncBuild();
    installStyle();
    const url=await loadPhoto();
    if(!url)return false;
    let changed=false;
    document.querySelectorAll('#ms8210Start .ms8280-photo').forEach(img=>{
      if(img.src!==url){img.src=url; changed=true;}
    });
    return changed || !!document.querySelector('#ms8210Start .ms8280-photo');
  }

  async function boot(){
    syncBuild();
    installStyle();
    await loadPrior();
    for(let i=0;i<100;i++){
      if(await applyPhoto())break;
      await new Promise(r=>setTimeout(r,100));
    }
    [300,900,1800,4000,8000].forEach(ms=>setTimeout(applyPhoto,ms));
    const root=document.getElementById('ms8210Start');
    if(root&&!observer){
      observer=new MutationObserver(()=>applyPhoto());
      observer.observe(root,{childList:true,subtree:true});
    }
    console.info('MijnSerenity 8.28.1: nieuwe Serenity-achtergrond actief.');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
