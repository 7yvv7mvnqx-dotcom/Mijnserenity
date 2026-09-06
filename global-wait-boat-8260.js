/* MijnSerenity 8.26.7 — globale wacht-/laadindicator met anti-vastloopbeveiliging */
(()=>{
  'use strict';
  const VERSION=8267;
  if(Number(window.__msGlobalWaitBoatVersion||0)>=VERSION)return;
  window.__msGlobalWaitBoatVersion=VERSION;
  window.__msGlobalWaitBoat8260=true;

  const STYLE_ID='ms8260WaitBoatStyle';
  const ROOT_ID='ms8260WaitBoat';
  const HARD_TTL_MS=10000;
  const DOM_TTL_MS=7000;
  const ACTIVE_TEXT=/(?:\b(?:wordt|worden)\s+(?:geladen|gecontroleerd|bepaald|opgehaald|verwerkt|bijgewerkt|gesynchroniseerd|voorbereid)\b)|(?:\b(?:even\s+wachten|wachten\s+op|bezig\s+met)\b)|(?:\b(?:laden|controleren|zoeken|ophalen|verbinden|bijwerken|verwerken|bepalen|synchroniseren|voorbereiden)\s*(?:…|\.{2,})\s*$)/i;
  const ACTION_TEXT=/\b(controleren|zoeken|ophalen|vernieuwen|bijwerken|verbinden|opslaan|berekenen|analyseren|scannen|laden|start\s+varen)\b/i;
  const EXPLICIT_BUSY='[aria-busy="true"],[data-loading="true"],[data-waiting="true"],.is-loading,.is-waiting';
  const NON_BLOCKING_SELECTOR='.ms710-radar-card,.ms709-weather-card,[data-ms-wait-scope="local"]';

  const sources=new Map();
  let lastInteractionAt=0;
  let lastAction='';
  let fetchSerial=0;
  let scanQueued=false;
  let observer=null;
  let domSignature='';
  let domTextExpiry=0;
  let explicitSignature='';
  let explicitExpiry=0;
  let expiryTimer=0;

  const YACHT=`<svg class="ms8260-yacht" viewBox="0 0 210 100" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
      <path class="ms8260-rail" d="M37 47h126M51 47V37m27 10V34m31 13V31m30 16V36m24 11v-7"/>
      <path class="ms8260-cabin" d="M55 52V33h61l30 19M69 33l13-14h25l16 14"/>
      <path class="ms8260-window" d="M65 37h18v12H65zm23 0h18v12H88zm23 0h17l13 12h-30z"/>
      <path class="ms8260-mast" d="M105 19V9m0 3h12m-12 5H95"/>
      <path class="ms8260-hull" d="M20 53h171l-15 23H47c-12 0-21-8-27-23Z"/>
      <path class="ms8260-stripe" d="M33 60h146"/>
    </g>
    <g class="ms8260-waves" fill="none" stroke-linecap="round">
      <path d="M6 81c19-7 37-7 55 0 18 7 37 7 55 0 18-7 37-7 56 0 12 4 23 5 32 2"/>
      <path d="M18 91c15-5 30-5 45 0 15 5 30 5 45 0 15-5 30-5 45 0 15 5 30 5 45 0"/>
    </g>
  </svg>`;

  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #${ROOT_ID}{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;padding:22px max(18px,env(safe-area-inset-right)) max(22px,env(safe-area-inset-bottom)) max(18px,env(safe-area-inset-left));background:rgba(1,12,21,.42);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .18s ease,visibility .18s ease;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif}
      #${ROOT_ID}.is-visible{opacity:1;visibility:visible}
      #${ROOT_ID} .ms8260-card{width:min(88vw,350px);display:grid;justify-items:center;gap:5px;padding:18px 20px 17px;border-radius:25px;border:1px solid rgba(103,221,255,.36);background:linear-gradient(155deg,rgba(5,35,50,.96),rgba(2,20,33,.97));box-shadow:0 24px 70px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.08);color:#f4fbff;text-align:center}
      #${ROOT_ID} .ms8260-scene{width:184px;height:88px;display:grid;place-items:center;color:#eefbff;filter:drop-shadow(0 7px 10px rgba(0,0,0,.25))}
      #${ROOT_ID} .ms8260-yacht{width:100%;height:100%;overflow:visible;transform-origin:50% 68%;animation:ms8260BoatBob 2.45s ease-in-out infinite}
      #${ROOT_ID} .ms8260-hull{fill:rgba(8,66,98,.96);stroke:#e9faff;stroke-width:3.2}
      #${ROOT_ID} .ms8260-cabin{fill:rgba(245,252,255,.98);stroke:#e9faff;stroke-width:2.4}
      #${ROOT_ID} .ms8260-window{fill:rgba(7,48,73,.98);stroke:#74e3ff;stroke-width:1.7}
      #${ROOT_ID} .ms8260-rail,#${ROOT_ID} .ms8260-mast{stroke:#e9faff;stroke-width:1.8}
      #${ROOT_ID} .ms8260-stripe{stroke:#48d9ff;stroke-width:2.5}
      #${ROOT_ID} .ms8260-waves{stroke:#31d3ff;stroke-width:2.6;opacity:.95;animation:ms8260WaveMove 1.75s ease-in-out infinite alternate}
      #${ROOT_ID} strong{font-size:19px;line-height:1.15;letter-spacing:-.02em}
      #${ROOT_ID} span{display:block;max-width:290px;color:#b9d6e4;font-size:13px;line-height:1.35;font-weight:650}
      @keyframes ms8260BoatBob{0%,100%{transform:translateY(2px) rotate(-2deg)}25%{transform:translateY(-3px) rotate(.8deg)}50%{transform:translateY(-1px) rotate(2deg)}75%{transform:translateY(3px) rotate(-.8deg)}}
      @keyframes ms8260WaveMove{from{transform:translateX(-5px);opacity:.68}to{transform:translateX(5px);opacity:1}}
      @media(max-width:620px){#${ROOT_ID} .ms8260-card{width:min(91vw,330px);padding:16px 18px 15px;border-radius:22px}#${ROOT_ID} .ms8260-scene{width:166px;height:79px}#${ROOT_ID} strong{font-size:18px}}
      @media(prefers-reduced-motion:reduce){#${ROOT_ID} .ms8260-yacht,#${ROOT_ID} .ms8260-waves{animation-duration:5s}}
    `;
    document.head.appendChild(style);
  }

  function ensureRoot(){
    installStyle();
    let root=document.getElementById(ROOT_ID);
    if(root)return root;
    root=document.createElement('div');
    root.id=ROOT_ID;
    root.setAttribute('role','status');
    root.setAttribute('aria-live','polite');
    root.setAttribute('aria-atomic','true');
    root.setAttribute('aria-hidden','true');
    root.innerHTML=`<div class="ms8260-card"><div class="ms8260-scene">${YACHT}</div><strong id="ms8260WaitTitle">Even wachten…</strong><span id="ms8260WaitDetail">MijnSerenity is bezig.</span></div>`;
    document.body.appendChild(root);
    return root;
  }

  function cleanMessage(value){
    return String(value||'').replace(/\s+/g,' ').trim().slice(0,120);
  }

  function titleFor(message){
    const text=String(message||'');
    if(/control|bepaal/i.test(text))return 'Controleren…';
    if(/zoek/i.test(text))return 'Zoeken…';
    if(/ophaal|laden|laad/i.test(text))return 'Laden…';
    if(/opslaan|bijwerk|verwerk|synchron/i.test(text))return 'Bezig…';
    return 'Even wachten…';
  }

  function scheduleExpiry(){
    clearTimeout(expiryTimer);
    let next=Infinity;
    const now=Date.now();
    for(const item of sources.values()){
      if(item.expiresAt>now)next=Math.min(next,item.expiresAt);
    }
    if(Number.isFinite(next))expiryTimer=setTimeout(render,Math.max(40,next-now+20));
  }

  function render(){
    const now=Date.now();
    for(const [key,item] of sources){
      if(!item?.expiresAt||item.expiresAt<=now)sources.delete(key);
    }
    const root=ensureRoot();
    const items=[...sources.values()];
    const active=items.length>0;
    const current=items[items.length-1]||{};
    const detail=cleanMessage(current.message)||'MijnSerenity is bezig.';
    const title=document.getElementById('ms8260WaitTitle');
    const detailNode=document.getElementById('ms8260WaitDetail');
    if(title)title.textContent=titleFor(detail);
    if(detailNode)detailNode.textContent=detail;
    root.classList.toggle('is-visible',active);
    root.setAttribute('aria-hidden',active?'false':'true');
    scheduleExpiry();
  }

  function show(key,message,ttl=HARD_TTL_MS){
    const id=String(key||'manual');
    const text=cleanMessage(message)||'MijnSerenity is bezig.';
    const now=Date.now();
    const previous=sources.get(id);
    const same=previous?.message===text;
    const startedAt=same?Number(previous.startedAt||now):now;
    const requested=Math.max(250,Number(ttl)||HARD_TTL_MS);
    const expiresAt=Math.min(now+requested,startedAt+HARD_TTL_MS);
    sources.set(id,{message:text,startedAt,expiresAt});
    render();
    return id;
  }

  function hide(key){
    sources.delete(String(key||'manual'));
    render();
  }

  function clearAll(){
    sources.clear();
    domSignature='';
    domTextExpiry=0;
    explicitSignature='';
    explicitExpiry=0;
    render();
  }

  function visible(node){
    if(!(node instanceof Element)||!node.isConnected)return false;
    if(node.closest('[hidden],.hidden,[aria-hidden="true"]'))return false;
    const style=getComputedStyle(node);
    return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)!==0;
  }

  function nonBlocking(node){
    return Boolean(node instanceof Element&&node.closest(NON_BLOCKING_SELECTOR));
  }

  function findBusyStatus(){
    const roots=[document.getElementById('appView'),document.getElementById('authView')].filter(Boolean);
    let explicit=null;
    let textNode=null;
    for(const root of roots){
      explicit=[...root.querySelectorAll(EXPLICIT_BUSY)].find(node=>visible(node)&&!nonBlocking(node))||explicit;
      const candidates=root.querySelectorAll('.status,.small,[role="status"],[aria-live],button,[data-status]');
      for(const node of candidates){
        if(!visible(node)||nonBlocking(node))continue;
        const text=cleanMessage(node.textContent);
        if(text&&ACTIVE_TEXT.test(text)){textNode=node;break}
      }
      if(explicit||textNode)break;
    }
    return {explicit,textNode};
  }

  function scanBusyStatus(){
    scanQueued=false;
    const now=Date.now();
    const {explicit,textNode}=findBusyStatus();

    if(explicit){
      const msg=cleanMessage(explicit.getAttribute('data-loading-text')||explicit.getAttribute('aria-label')||explicit.textContent)||'MijnSerenity is bezig.';
      const signature=`${explicit.id||explicit.className||explicit.tagName}|${msg}`;
      if(signature!==explicitSignature){
        explicitSignature=signature;
        explicitExpiry=now+DOM_TTL_MS;
      }
      if(now<explicitExpiry)show('dom-explicit',msg,Math.max(250,explicitExpiry-now));
      else sources.delete('dom-explicit');
    }else{
      explicitSignature='';
      explicitExpiry=0;
      sources.delete('dom-explicit');
    }

    if(textNode){
      const text=cleanMessage(textNode.textContent);
      const signature=`${textNode.id||textNode.className||textNode.tagName}|${text}`;
      if(signature!==domSignature){
        domSignature=signature;
        domTextExpiry=now+DOM_TTL_MS;
      }
      if(now<domTextExpiry)show('dom-text',text,Math.max(250,domTextExpiry-now));
      else sources.delete('dom-text');
    }else{
      domSignature='';
      domTextExpiry=0;
      sources.delete('dom-text');
    }
    render();
  }

  function queueScan(){
    if(scanQueued)return;
    scanQueued=true;
    requestAnimationFrame(scanBusyStatus);
  }

  function observeBusyStatus(){
    observer?.disconnect?.();
    const roots=[document.getElementById('appView'),document.getElementById('authView')].filter(Boolean);
    if(!roots.length)return;
    observer=new MutationObserver(queueScan);
    roots.forEach(root=>observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','hidden','aria-hidden','aria-busy','data-loading','data-waiting']}));
    queueScan();
  }

  function interactionLabel(target){
    if(!(target instanceof Element))return '';
    const node=target.closest('button,[role="button"],a,input[type="submit"],input[type="button"]');
    if(!node)return '';
    return cleanMessage(node.getAttribute('aria-label')||node.getAttribute('title')||node.value||node.textContent);
  }

  function installInteractionTracking(){
    document.addEventListener('click',event=>{
      const label=interactionLabel(event.target);
      if(!label)return;
      lastInteractionAt=Date.now();
      lastAction=label;
      if(ACTION_TEXT.test(label))show('interaction',label.endsWith('…')?label:`${label}…`,2600);
      setTimeout(queueScan,30);
      setTimeout(queueScan,250);
      setTimeout(queueScan,900);
    },{capture:true,passive:true});
    document.addEventListener('submit',event=>{
      lastInteractionAt=Date.now();
      lastAction=interactionLabel(event.submitter)||'Gegevens verwerken';
      show('interaction',`${lastAction}…`,2600);
    },{capture:true,passive:true});
  }

  function installFetchTracking(){
    if(window.__msWaitFetch8267||typeof window.fetch!=='function')return;
    window.__msWaitFetch8267=true;
    const previousFetch=window.fetch.bind(window);
    window.fetch=function(...args){
      const userInitiated=Date.now()-lastInteractionAt<1500;
      const key=`fetch-${++fetchSerial}`;
      let timer=0;
      if(userInitiated){
        timer=setTimeout(()=>show(key,lastAction||'Gegevens laden…',HARD_TTL_MS),260);
      }
      let result;
      try{result=previousFetch(...args)}catch(error){clearTimeout(timer);hide(key);throw error}
      return Promise.resolve(result).finally(()=>{
        clearTimeout(timer);
        hide(key);
        setTimeout(queueScan,20);
      });
    };
  }

  function installApi(){
    window.MijnSerenityWait={
      show(message='MijnSerenity is bezig.',key='manual'){return show(key,message,HARD_TTL_MS)},
      hide(key='manual'){hide(key)},
      hideAll(){clearAll()},
      wrap(promise,message='MijnSerenity is bezig.'){
        const key=`manual-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
        show(key,message,HARD_TTL_MS);
        return Promise.resolve(promise).finally(()=>hide(key));
      },
      refresh(){queueScan()}
    };
  }

  function start(){
    document.getElementById(ROOT_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    ensureRoot();
    installApi();
    installInteractionTracking();
    installFetchTracking();
    observeBusyStatus();

    ['mijnserenity:dashboard-ready','mijnserenity:boot-complete'].forEach(type=>{
      window.addEventListener(type,()=>setTimeout(()=>{clearAll();observeBusyStatus();queueScan()},20),{passive:true});
    });
    window.addEventListener('mijnserenity:routechange',()=>setTimeout(()=>{clearAll();observeBusyStatus();queueScan()},20),{passive:true});
    window.addEventListener('pageshow',()=>setTimeout(()=>{clearAll();observeBusyStatus();queueScan()},20),{passive:true});
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden)clearAll();
      else setTimeout(()=>{clearAll();observeBusyStatus();queueScan()},20);
    },{passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
