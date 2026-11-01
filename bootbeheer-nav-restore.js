/* MijnSerenity — Bootbeheer terug in bestaande navigatie, zonder data te wijzigen. */
(()=>{
  'use strict';
  if(window.__msBootbeheerNavRestore)return;
  window.__msBootbeheerNavRestore=true;
  const NAV_MARK='data-ms-bootbeheer-navigation';
  let pending=false;

  function open(event){
    event?.preventDefault();
    event?.stopPropagation();
    if(typeof window.msBootbeheerOpen==='function')window.msBootbeheerOpen();
    else console.warn('Bootbeheer is nog niet geladen.');
  }

  function settingsButtonLabel(button){
    if(button.hasAttribute(NAV_MARK))return false;
    const value=(button.textContent||'').replace(/\\s+/g,' ').trim().toLowerCase();
    return value==='instellingen' || value==='⚙ instellingen' ||
      button.dataset?.target==='settings' || button.dataset?.ms8290Go==='settings';
  }

  function safeNavigationContainers(){
    return document.querySelectorAll(
      'nav, aside, [role="navigation"], .tabs, .sidebar, .side-nav, [class*="sidebar"], [class*="side-nav"], .ms8290-more-grid'
    );
  }

  function cloneAsBootbeheer(source){
    const button=source.cloneNode(true);
    button.removeAttribute('id');
    button.removeAttribute('onclick');
    button.removeAttribute('aria-current');
    button.removeAttribute('href');
    for(const a of Array.from(button.attributes)){
      if(a.name.startsWith('data-'))button.removeAttribute(a.name);
    }
    button.querySelectorAll('[id],[onclick],[data-target],[data-ms8290-go]').forEach(el=>{
      el.removeAttribute('id');el.removeAttribute('onclick');
      el.removeAttribute('data-target');el.removeAttribute('data-ms8290-go');
    });
    button.classList.remove('active','selected','current','is-active');
    button.setAttribute(NAV_MARK,'1');
    button.setAttribute('aria-label','Bootbeheer: voorraad, inventaris en onderhoud');
    button.setAttribute('title','Bootbeheer');
    if(button.tagName==='BUTTON')button.type='button';
    if(button.tagName==='A')button.href='#';
    const walk=document.createTreeWalker(button,NodeFilter.SHOW_TEXT);
    let changed=false;
    while(walk.nextNode()){
      const txt=walk.currentNode;
      if(/Instellingen/i.test(txt.nodeValue||'')){
        txt.nodeValue=txt.nodeValue.replace(/Instellingen/ig,'Bootbeheer');
        changed=true;
      }
    }
    if(!changed){
      const label=button.querySelector('span, strong');
      if(label)label.textContent='Bootbeheer';
      else button.textContent='Bootbeheer';
    }
    button.addEventListener('click',open,true);
    return button;
  }

  function install(){
    if(typeof window.msBootbeheerOpen!=='function')return;
    for(const nav of safeNavigationContainers()){
      const candidates=nav.querySelectorAll('button, a, [role="button"]');
      const settings=Array.from(candidates).find(settingsButtonLabel);
      if(!settings)continue;
      const parent=settings.parentElement;
      if(!parent || Array.from(parent.children).some(el=>el.hasAttribute?.(NAV_MARK)))continue;
      const bootbeheer=cloneAsBootbeheer(settings);
      settings.insertAdjacentElement('afterend',bootbeheer);
    }
  }

  function schedule(){
    if(pending)return;
    pending=true;
    requestAnimationFrame(()=>{pending=false;install();});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
  new MutationObserver(changes=>{
    if(changes.some(change=>change.addedNodes.length||change.removedNodes.length))schedule();
  }).observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('pageshow',schedule,{passive:true});
  window.addEventListener('mijnserenity:routechange',schedule,{passive:true});
})();
