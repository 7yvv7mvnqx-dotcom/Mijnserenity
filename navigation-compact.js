/* MijnSerenity 7.19.18 — compacte navigatie stabiel + iPad Meer-knop.
   De onderbalk blijft aan de viewport vastgezet zonder VisualViewport-loops.
   Op iPad/Stage Manager worden vijf vaste onderdelen plus een altijd bereikbare
   Meer-knop afgedwongen, zodat geen navigatie buiten beeld kan verdwijnen. */
(()=>{
  'use strict';
  if(window.__msNavigationCleanup71918)return;
  window.__msNavigationCleanup71918=true;

  const isIPadLike=()=>/iPad/i.test(navigator.userAgent||'')||(
    (navigator.platform==='MacIntel'||/Macintosh/i.test(navigator.userAgent||''))&&
    Number(navigator.maxTouchPoints||0)>1&&
    Math.min(Number(screen.width||0),Number(screen.height||0))>=700
  );

  function clean(){
    const root=document.documentElement;
    root.style.removeProperty('--ms751-nav-bottom');
    document.body?.classList.remove('ms744-keyboard-open','ms744-nav-repositioning');
    const nav=document.querySelector('.bottom-nav');
    if(!nav)return;
    nav.classList.remove('bottom-nav-viewport-fixed','bottom-nav-always-visible','bottom-nav-auto-hidden');
    nav.dataset.autoHide='false';
    nav.setAttribute('aria-hidden','false');
    ['position','left','right','top','bottom','width','max-width','transform','translate','contain','margin','visibility','opacity','pointer-events','z-index']
      .forEach(name=>nav.style.removeProperty(name));
  }

  function installIPadStyle(){
    if(!isIPadLike()||document.getElementById('ms71918IPadNavStyle'))return;
    const style=document.createElement('style');
    style.id='ms71918IPadNavStyle';
    style.textContent=`
      html[data-ms-ipad-nav-fix="1"] body .bottom-nav.ms71918-ipad-nav,
      html[data-ms-ipad-nav-fix="1"] body .bottom-nav.ms744-compact-nav.ms71918-ipad-nav{
        display:grid!important;
        grid-template-columns:repeat(6,minmax(0,1fr))!important;
        gap:3px!important;
        overflow:hidden!important;
        padding-left:max(7px,env(safe-area-inset-left))!important;
        padding-right:max(7px,env(safe-area-inset-right))!important;
        box-sizing:border-box!important;
        pointer-events:auto!important;
        visibility:visible!important;
        opacity:1!important;
      }
      html[data-ms-ipad-nav-fix="1"] body .bottom-nav.ms71918-ipad-nav>.bottom-nav-item,
      html[data-ms-ipad-nav-fix="1"] body .bottom-nav.ms744-compact-nav.ms71918-ipad-nav>.bottom-nav-item{
        display:flex!important;
        width:100%!important;
        min-width:0!important;
        max-width:none!important;
        flex:1 1 0!important;
        align-items:center!important;
        justify-content:center!important;
      }
      html[data-ms-ipad-nav-fix="1"] body .bottom-nav.ms71918-ipad-nav>#msIpadMoreNav71918{
        display:flex!important;
        visibility:visible!important;
        pointer-events:auto!important;
      }
      html[data-ms-ipad-nav-fix="1"] body .bottom-nav.ms71918-ipad-nav>#msIpadMoreNav71918 span{
        display:block!important;
        font-size:27px!important;
        line-height:1!important;
      }
    `;
    document.head.appendChild(style);
  }

  const IPAD_ITEMS=[
    ['dashboard','🏠','Start'],
    ['live','⛵','Varen'],
    ['map','🗺️','Kaart'],
    ['planner','🧭','Reisplanner'],
    ['technical','⚙️','Techniek'],
    ['more','•••','Meer']
  ];

  let navObserver=null;
  let navObserved=null;
  let ensureFrame=0;

  function navSignature(nav){
    return [...nav.querySelectorAll(':scope > .bottom-nav-item')]
      .map(button=>button.dataset.target||'')
      .join(',');
  }

  function bindMore(nav){
    if(nav.dataset.ms71918MoreBound==='1')return;
    nav.dataset.ms71918MoreBound='1';
    nav.addEventListener('click',event=>{
      const button=event.target.closest('.bottom-nav-item');
      if(!button||button.dataset.target!=='more')return;
      if(typeof window.ms797OpenMore==='function'){
        event.preventDefault();
        event.stopImmediatePropagation();
        window.ms797OpenMore();
      }
    },true);
  }

  function observeNav(nav){
    if(navObserved===nav)return;
    navObserver?.disconnect();
    navObserved=nav;
    navObserver=new MutationObserver(()=>queueEnsure());
    navObserver.observe(nav,{childList:true});
  }

  function ensureIPadNav(){
    if(!isIPadLike())return;
    installIPadStyle();
    document.documentElement.dataset.msIpadNavFix='1';
    const nav=document.querySelector('.bottom-nav');
    if(!nav)return;

    nav.classList.add('ms71918-ipad-nav');
    nav.setAttribute('aria-label','Hoofdnavigatie');
    nav.setAttribute('aria-hidden','false');
    nav.dataset.autoHide='false';

    const wanted=IPAD_ITEMS.map(item=>item[0]).join(',');
    if(navSignature(nav)!==wanted){
      const active=document.querySelector('.bottom-nav .bottom-nav-item.active')?.dataset.target||'dashboard';
      nav.innerHTML=IPAD_ITEMS.map(([target,icon,label])=>{
        const selected=target===active||(target==='more'&&!IPAD_ITEMS.some(item=>item[0]===active));
        const id=target==='more'?' id="msIpadMoreNav71918"':'';
        return `<button type="button"${id} class="bottom-nav-item${selected?' active':''}" data-target="${target}" aria-label="${label}"${selected?' aria-current="page"':''}><span aria-hidden="true">${icon}</span><small>${label}</small></button>`;
      }).join('');
    }

    bindMore(nav);
    observeNav(nav);
  }

  function queueEnsure(){
    if(ensureFrame)return;
    ensureFrame=requestAnimationFrame(()=>{
      ensureFrame=0;
      clean();
      ensureIPadNav();
    });
  }

  function start(){
    clean();
    ensureIPadNav();
    [80,250,700,1500,3000,6000,10000].forEach(ms=>setTimeout(queueEnsure,ms));
    window.addEventListener('pageshow',queueEnsure,{passive:true});
    window.addEventListener('resize',queueEnsure,{passive:true});
    window.addEventListener('orientationchange',queueEnsure,{passive:true});
    window.addEventListener('mijnserenity:dashboard-ready',queueEnsure,{passive:true});
    window.addEventListener('mijnserenity:routechange',queueEnsure,{passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
