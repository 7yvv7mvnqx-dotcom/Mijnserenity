/* MijnSerenity runtime performance guard + startup fail-open */
(()=>{
  'use strict';
  if(window.__msRuntimePerformance71700)return;
  window.__msRuntimePerformance71700=true;

  const STORAGE_SELECTOR='img[data-storage-bucket][data-storage-path]';
  const STARTUP_FAIL_OPEN_MS=2500;

  function prepareImage(image){
    if(!(image instanceof HTMLImageElement))return;
    image.decoding='async';
    if(!image.closest('#authScreen,.msc-head')&&!image.hasAttribute('loading')){
      image.loading='lazy';
    }
  }

  function observeStorageImage(image){
    if(!(image instanceof HTMLImageElement)||!image.matches(STORAGE_SELECTOR))return;
    if(image.dataset.storageObserved==='1')return;
    image.dataset.storageObserved='1';
    try{
      if(typeof storageSafeImageObserver!=='undefined'&&storageSafeImageObserver){
        storageSafeImageObserver.observe(image);
      }else if(typeof ensureStorageImage==='function'){
        ensureStorageImage(image);
      }
    }catch(error){
      console.debug('Storage image observer:',error);
    }
  }

  function scanNode(node){
    if(!(node instanceof Element))return;
    if(node instanceof HTMLImageElement){
      prepareImage(node);
      observeStorageImage(node);
    }
    node.querySelectorAll?.('img').forEach(prepareImage);
    node.querySelectorAll?.(STORAGE_SELECTOR).forEach(observeStorageImage);
  }

  function optimiseExistingImages(){
    document.querySelectorAll('img').forEach(prepareImage);
  }

  function replaceStorageMutationObserver(){
    try{
      if(typeof storageSafeMutationObserver==='undefined')return false;
      storageSafeMutationObserver?.disconnect?.();
      storageSafeMutationObserver=new MutationObserver(mutations=>{
        for(const mutation of mutations){
          if(!mutation.addedNodes?.length)continue;
          mutation.addedNodes.forEach(scanNode);
        }
      });
      storageSafeMutationObserver.observe(document.body,{childList:true,subtree:true});
      return true;
    }catch(error){
      console.warn('Gerichte storage-observer kon niet worden ingesteld:',error);
      return false;
    }
  }

  function releaseStuckStartupGate(){
    setTimeout(()=>{
      const gate=document.getElementById('msStartupGate');
      if(!gate||!document.documentElement.classList.contains('ms-starting'))return;

      const views=['authView','approvalView','appView']
        .map(id=>document.getElementById(id))
        .filter(Boolean);
      let visible=views.filter(view=>!view.classList.contains('hidden'));

      // De bootstrap mag het dashboard nooit onbeperkt afdekken. Als de
      // sessiecallback geen class-mutatie geeft, tonen we de reeds geldige
      // view alsnog. Zijn alle views per ongeluk verborgen, val dan veilig
      // terug op het inlogscherm; de sessie kan daarna nog gewoon herstellen.
      if(visible.length===0){
        const auth=document.getElementById('authView');
        if(auth){
          auth.classList.remove('hidden');
          visible=[auth];
        }
      }

      if(visible.length>=1){
        document.documentElement.classList.remove('ms-starting');
        gate.style.opacity='0';
        setTimeout(()=>gate.remove(),180);
        console.info('MijnSerenity: vastgelopen opstartscherm automatisch vrijgegeven.');
      }
    },STARTUP_FAIL_OPEN_MS);
  }

  function start(){
    optimiseExistingImages();
    replaceStorageMutationObserver();
    releaseStuckStartupGate();
    document.documentElement.dataset.msPerformance='71700';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
