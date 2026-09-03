(function(){
  'use strict';

  const BUILD = '8.23.5';
  const isSmall = () => {
    const vv = window.visualViewport;
    const w = vv?.width || window.innerWidth || document.documentElement.clientWidth || 0;
    return w > 0 && w <= 768;
  };

  function glassOverflowHidden(){
    if(!document.head) return;
    let style=document.getElementById('msViewportGuardCss71911');
    if(style) return;
    style=document.createElement('style');
    style.id='msViewportGuardCss71911';
    style.textContent=`
      @media (max-width: 768px){
        html,
        body,
        #appView{
          scroll-padding-top: calc(env(safe-area-inset-top, 0px) + 10px);
          scroll-padding-bottom: calc(var(--ms-bottom-nav-space, 120px) + env(safe-area-inset-bottom, 0px));
        }
        .list,
        .scroll-list,
        .management-list,
        .timeline,
        .msu-bottom-nav,
        .bottom-nav,
        .ms-page-nav,
        .ms-page-content,
        .ms-dashboard,
        .ms-dashboard-grid,
        .ms-start-grid{
          overscroll-behavior-y: contain;
        }
        .modal,
        .dialog,
        .drawer,
        .sheet,
        .msu-modal,
        .msu-drawer,
        .msu-sheet{
          max-height: calc(100dvh - 12px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        #costs,
        #costFormWrap{
          scroll-margin-top: calc(env(safe-area-inset-top, 0px) + 16px);
          scroll-margin-bottom: calc(var(--ms-bottom-nav-space, 120px) + env(safe-area-inset-bottom, 0px) + 24px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  function autoBox(el, allowIntrinsic){
    if(!el) return;
    if(allowIntrinsic){
      el.style.removeProperty('height');
      el.style.removeProperty('max-height');
    }
    el.style.overflowY='visible';
    el.style.removeProperty('overflow');
    el.style.removeProperty('overflow-x');
    el.style.removeProperty('overflow-y');
    el.style.minHeight='0';
    el.style.setProperty('overscroll-behavior-y','auto','important');
    el.style.setProperty('-webkit-overflow-scrolling','auto','important');
  }

  function safeTopBackground(){
    const app=document.getElementById('appView');
    const candidates=[app,document.body,document.documentElement].filter(Boolean);
    for(const el of candidates){
      const bg=getComputedStyle(el).backgroundColor;
      if(bg && bg!=='transparent' && bg!=='rgba(0, 0, 0, 0)') return bg;
    }
    return '#0b2e3f';
  }

  function ensureSafeTopGuard(){
    if(!document.body) return;
    let guard=document.getElementById('msSafeTopGuard8235');
    if(!isSmall()){
      guard?.remove();
      return;
    }
    if(!guard){
      guard=document.createElement('div');
      guard.id='msSafeTopGuard8235';
      guard.setAttribute('aria-hidden','true');
      document.body.appendChild(guard);
    }
    guard.style.cssText=`
      position:fixed;
      z-index:2147482500;
      top:0;
      left:0;
      right:0;
      height:env(safe-area-inset-top, 0px);
      background:${safeTopBackground()};
      pointer-events:none;
      transform:translateZ(0);
    `;
  }

  function measuredBottomNavHeight(){
    const viewportHeight=window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0;
    const viewportWidth=window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 0;
    if(!viewportHeight || !viewportWidth) return 0;

    const candidates=[];
    document.querySelectorAll('.msu-bottom-nav,.bottom-nav,.ms-page-nav,[data-ms-page-nav],nav,footer').forEach(el=>candidates.push(el));
    try{
      if(document.elementsFromPoint){
        document.elementsFromPoint(Math.max(1,viewportWidth/2),Math.max(1,viewportHeight-4)).forEach(el=>candidates.push(el));
      }
    }catch(error){
      console.debug('[MijnSerenity] bottom nav meting overgeslagen',error);
    }

    let height=0;
    for(const el of new Set(candidates)){
      if(!(el instanceof HTMLElement)) continue;
      const cs=getComputedStyle(el);
      if(cs.display==='none' || cs.visibility==='hidden' || Number(cs.opacity||1)===0) continue;
      if(cs.position!=='fixed' && cs.position!=='sticky') continue;

      const rect=el.getBoundingClientRect();
      if(rect.height<38 || rect.height>220) continue;
      if(rect.width<Math.min(viewportWidth*0.55,320)) continue;
      if(rect.bottom<viewportHeight-16 || rect.top>viewportHeight) continue;

      height=Math.max(height,Math.ceil(viewportHeight-Math.max(0,rect.top)));
    }
    return height;
  }

  function hardViewportGuard(){
    if(!isSmall()) return;

    const root=document.documentElement;
    const body=document.body;

    [root,body].forEach(el=>autoBox(el,false));

    if(root){
      root.style.setProperty('width','100%','important');
      root.style.setProperty('min-height','100%','important');
    }
    if(body){
      body.style.setProperty('width','100%','important');
      body.style.setProperty('min-height','100%','important');
      body.style.setProperty('padding-bottom','0','important');
      body.style.setProperty('touch-action','pan-y pinch-zoom','important');
    }

    const main=document.querySelector('main');
    const app=document.getElementById('appView');
    const dashboard=document.getElementById('dashboard');

    [main,app,dashboard].forEach(el=>autoBox(el,true));

    const navHeight=measuredBottomNavHeight();
    const navSpace=Math.max(120,navHeight?navHeight+22:0);
    root?.style.setProperty('--ms-bottom-nav-space',`${navSpace}px`);

    if(app){
      app.style.setProperty('min-height','100dvh','important');
      app.style.setProperty('padding-bottom',`calc(${navSpace}px + env(safe-area-inset-bottom, 0px))`,'important');
    }

    document.querySelectorAll('main section, main .card, main .panel, main .list, main .scroll-list, .ms-dashboard, .ms-dashboard-grid').forEach(el=>{
      const cs=getComputedStyle(el);
      if(cs.position==='fixed' || cs.position==='sticky') return;
      if(cs.overflowY==='auto' || cs.overflowY==='scroll'){
        el.style.setProperty('overflow-y','visible','important');
      }
      if(cs.maxHeight && cs.maxHeight!=='none'){
        el.style.setProperty('max-height','none','important');
      }
    });

    ensureSafeTopGuard();

    if(document.body){
      document.body.dataset.viewportGuardBuild=BUILD;
    }
  }

  function withOcrTimeout(sourcePromise,ms,message,onTimeout,onLateValue){
    let settled=false;
    let timedOut=false;
    let timer=0;
    const source=Promise.resolve(sourcePromise);

    return new Promise((resolve,reject)=>{
      timer=window.setTimeout(()=>{
        if(settled) return;
        settled=true;
        timedOut=true;
        try{onTimeout?.()}catch(error){console.warn(error)}
        const timeoutError=new Error(message);
        timeoutError.name='TimeoutError';
        timeoutError.code='MS_RECEIPT_OCR_TIMEOUT';
        reject(timeoutError);
      },ms);

      source.then(value=>{
        if(timedOut){
          try{onLateValue?.(value)}catch(error){console.warn(error)}
          return;
        }
        if(settled) return;
        settled=true;
        window.clearTimeout(timer);
        resolve(value);
      },error=>{
        if(settled) return;
        settled=true;
        window.clearTimeout(timer);
        reject(error);
      });
    });
  }

  function wrapOcrWorker(worker){
    if(!worker || typeof Proxy!=='function') return worker;
    return new Proxy(worker,{
      get(target,prop){
        if(prop==='recognize' && typeof target.recognize==='function'){
          return (...args)=>withOcrTimeout(
            target.recognize(...args),
            22000,
            'Bon lezen duurde te lang. Probeer opnieuw.',
            ()=>{ try{ target.terminate?.(); }catch(error){ console.warn(error); } }
          );
        }
        if(prop==='setParameters' && typeof target.setParameters==='function'){
          return (...args)=>withOcrTimeout(
            target.setParameters(...args),
            6000,
            'OCR-instellingen reageerden niet.',
            ()=>{ try{ target.terminate?.(); }catch(error){ console.warn(error); } }
          );
        }
        const value=Reflect.get(target,prop,target);
        return typeof value==='function'?value.bind(target):value;
      }
    });
  }

  function installReceiptOcrGuard(){
    if(window.__msReceiptOcrGuard8235) return;
    const originalLoad=window.loadReceiptOcrLibrary;
    const originalPrepare=window.prepareReceiptImageForOcr;
    if(typeof originalLoad!=='function' || typeof originalPrepare!=='function') return;

    window.loadReceiptOcrLibrary=async function(...args){
      const library=await withOcrTimeout(
        originalLoad(...args),
        15000,
        'Bonlezer kon niet op tijd starten.'
      );
      if(!library || typeof library.createWorker!=='function' || typeof Proxy!=='function') return library;

      return new Proxy(library,{
        get(target,prop){
          if(prop==='createWorker'){
            return (...workerArgs)=>{
              const effectiveArgs=workerArgs.slice();
              if(isSmall() && typeof effectiveArgs[0]==='string' && effectiveArgs[0].includes('+')){
                effectiveArgs[0]='nld';
              }
              const pending=target.createWorker(...effectiveArgs);
              return withOcrTimeout(
                pending,
                18000,
                'Bonlezer kon niet op tijd starten.',
                null,
                lateWorker=>{ try{ lateWorker?.terminate?.(); }catch(error){ console.warn(error); } }
              ).then(wrapOcrWorker);
            };
          }
          const value=Reflect.get(target,prop,target);
          return typeof value==='function'?value.bind(target):value;
        }
      });
    };

    window.prepareReceiptImageForOcr=function(...args){
      return withOcrTimeout(
        originalPrepare(...args),
        12000,
        'Bonfoto verwerken duurde te lang.'
      );
    };

    window.__msReceiptOcrGuard8235=true;
    console.info('[MijnSerenity] receipt OCR timeout guard actief');
  }

  let raf=0;
  function schedule(){
    if(raf) return;
    raf=requestAnimationFrame(()=>{
      raf=0;
      hardViewportGuard();
    });
  }

  function bind(){
    glassOverflowHidden();
    installReceiptOcrGuard();
    hardViewportGuard();

    window.addEventListener('resize',schedule,{passive:true});
    window.addEventListener('orientationchange',schedule,{passive:true});
    window.visualViewport?.addEventListener('resize',schedule,{passive:true});
    window.visualViewport?.addEventListener('scroll',schedule,{passive:true});

    const observer=new MutationObserver((mutations)=>{
      if(!isSmall()) return;
      for(const m of mutations){
        if(m.type==='childList' && (m.addedNodes?.length || m.removedNodes?.length)){
          schedule();
          return;
        }
        if(m.type==='attributes' && (m.attributeName==='class' || m.attributeName==='style')){
          schedule();
          return;
        }
      }
    });
    observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();

  console.info(`[MijnSerenity] viewport guard ${BUILD}`);
})();
