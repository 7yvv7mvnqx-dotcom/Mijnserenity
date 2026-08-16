/* MijnSerenity 7.17.0 — runtime performance guard */
(()=>{
  'use strict';
  if(window.__msRuntimePerformance71700)return;
  window.__msRuntimePerformance71700=true;

  const STORAGE_SELECTOR='img[data-storage-bucket][data-storage-path]';

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

  function start(){
    optimiseExistingImages();
    replaceStorageMutationObserver();
    document.documentElement.dataset.msPerformance='71700';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
