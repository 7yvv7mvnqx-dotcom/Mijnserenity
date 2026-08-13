(function(){
  'use strict';
  if(window.__ms71527CompassLoader)return;
  window.__ms71527CompassLoader=true;
  const script=document.createElement('script');
  script.src='/wind-compass-fix-71527.js?v=715270';
  script.async=false;
  document.head.appendChild(script);
})();

(function(){
  'use strict';
  if(window.__msCaptainModeLoader800)return;
  window.__msCaptainModeLoader800=true;

  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href='/captain-mode-800.css?v=800001';
  document.head.appendChild(css);

  const script=document.createElement('script');
  script.src='/captain-mode-800.js?v=800001';
  script.async=false;
  document.head.appendChild(script);
})();

(function(){
  'use strict';
  if(window.__msCaptainRouteLoader801)return;
  window.__msCaptainRouteLoader801=true;

  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href='/captain-route-801.css?v=801001';
  document.head.appendChild(css);

  const script=document.createElement('script');
  script.src='/captain-route-801.js?v=801001';
  script.async=false;
  document.head.appendChild(script);
})();

(function(){
  'use strict';
  if(window.__msUpdatePromptInstalled)return;
  window.__msUpdatePromptInstalled=true;

  let registration=null;
  let waitingWorker=null;
  let reloading=false;

  function ensurePrompt(){
    let panel=document.getElementById('msUpdatePrompt');
    if(panel)return panel;

    const style=document.createElement('style');
    style.textContent=`
#msUpdatePrompt{position:fixed;left:14px;right:14px;bottom:calc(92px + env(safe-area-inset-bottom));z-index:10000;display:none;align-items:center;justify-content:space-between;gap:14px;padding:14px 16px;border:1px solid rgba(91,210,244,.34);border-radius:18px;background:rgba(4,24,37,.97);box-shadow:0 16px 44px rgba(0,0,0,.38);backdrop-filter:blur(16px);color:#eefbff;font-family:inherit}
#msUpdatePrompt.show{display:flex}
#msUpdatePrompt div{min-width:0}
#msUpdatePrompt strong{display:block;font-size:16px;line-height:1.2}
#msUpdatePrompt small{display:block;margin-top:4px;color:#a8c2ce;font-size:12px;line-height:1.3}
#msUpdatePrompt button{flex:0 0 auto;min-height:44px;padding:10px 15px;border:1px solid rgba(91,210,244,.36);border-radius:13px;background:#174d68;color:#fff;font:inherit;font-weight:800}
#msUpdatePrompt button:disabled{opacity:.65}
@media(max-width:520px){#msUpdatePrompt{align-items:stretch;flex-direction:column;bottom:calc(88px + env(safe-area-inset-bottom))}#msUpdatePrompt button{width:100%}}
`;
    document.head.appendChild(style);

    panel=document.createElement('div');
    panel.id='msUpdatePrompt';
    panel.setAttribute('role','alert');
    panel.setAttribute('aria-live','assertive');
    panel.innerHTML='<div><strong>Nieuwe versie beschikbaar</strong><small>Er is een nieuwe versie van MijnSerenity. Wil je de app opnieuw opstarten?</small></div><button type="button" id="msUpdateRestartButton">Herstarten</button>';
    document.body.appendChild(panel);
    panel.querySelector('#msUpdateRestartButton')?.addEventListener('click',restartIntoUpdate);
    return panel;
  }

  function showPrompt(worker){
    waitingWorker=worker||registration?.waiting||waitingWorker;
    const panel=ensurePrompt();
    panel.classList.add('show');
  }

  async function restartIntoUpdate(){
    if(reloading)return;
    reloading=true;
    const button=document.getElementById('msUpdateRestartButton');
    if(button){button.disabled=true;button.textContent='Herstarten…';}

    try{
      const worker=waitingWorker||registration?.waiting;
      if(worker){
        worker.postMessage({type:'SKIP_WAITING'});
        return;
      }
      if(registration)await registration.update();
    }catch(error){
      console.warn('Update activeren mislukt:',error);
    }

    const url=new URL(location.href);
    url.searchParams.set('update',Date.now().toString());
    location.replace(url.toString());
  }

  function watchRegistration(reg){
    registration=reg;
    if(reg.waiting&&navigator.serviceWorker.controller)showPrompt(reg.waiting);

    reg.addEventListener('updatefound',()=>{
      const worker=reg.installing;
      if(!worker)return;
      worker.addEventListener('statechange',()=>{
        if(worker.state==='installed'&&navigator.serviceWorker.controller){
          showPrompt(reg.waiting||worker);
        }
      });
    });
  }

  async function checkForUpdate(){
    try{
      if(!registration){
        registration=await navigator.serviceWorker.getRegistration();
        if(registration)watchRegistration(registration);
      }
      await registration?.update();
      if(registration?.waiting&&navigator.serviceWorker.controller)showPrompt(registration.waiting);
    }catch(error){
      console.warn('Updatecontrole mislukt:',error);
    }
  }

  async function init(){
    if(!('serviceWorker' in navigator))return;
    try{
      const reg=await navigator.serviceWorker.ready;
      watchRegistration(reg);
      await checkForUpdate();
    }catch(error){
      console.warn('Updatecontrole kon niet starten:',error);
    }

    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(reloading)return;
      reloading=true;
      const url=new URL(location.href);
      url.searchParams.set('update',Date.now().toString());
      location.replace(url.toString());
    });

    window.addEventListener('focus',checkForUpdate,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkForUpdate();},{passive:true});
    setInterval(checkForUpdate,60*1000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
