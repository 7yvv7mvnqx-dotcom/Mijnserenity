/* MijnSerenity 8.20.2 — gerichte runtime performance guard
   Geen documentbrede observer: alleen dynamische app-inhoud wordt gevolgd. */
(()=>{
  'use strict';
  if(window.__msRuntimePerformance8202)return;
  window.__msRuntimePerformance8202=true;

  const STORAGE_SELECTOR='img[data-storage-bucket][data-storage-path]';
  let observedRoot=null;

  function prepareImage(image){
    if(!(image instanceof HTMLImageElement))return;
    image.decoding='async';
    /* Login/logo en vaste dashboardkop niet lazy laden: die moeten direct zichtbaar zijn. */
    if(!image.closest('#authView,.msc-head,.mg-top')&&!image.hasAttribute('loading')){
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
      const root=document.getElementById('appView');
      if(!root)return false;
      if(observedRoot===root)return true;

      storageSafeMutationObserver?.disconnect?.();
      storageSafeMutationObserver=new MutationObserver(mutations=>{
        for(const mutation of mutations){
          if(!mutation.addedNodes?.length)continue;
          mutation.addedNodes.forEach(scanNode);
        }
      });
      storageSafeMutationObserver.observe(root,{childList:true,subtree:true});
      observedRoot=root;
      return true;
    }catch(error){
      console.warn('Gerichte storage-observer kon niet worden ingesteld:',error);
      return false;
    }
  }

  function start(){
    optimiseExistingImages();
    replaceStorageMutationObserver();
    document.documentElement.dataset.msPerformance='8202';
  }

  ['mijnserenity:boot-complete','mijnserenity:dashboard-ready','mijnserenity:routechange']
    .forEach(name=>window.addEventListener(name,()=>requestAnimationFrame(start),{passive:true}));

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();