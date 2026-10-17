/* MijnSerenity 8.32.6 — zelfstandig scrollbare reisplanner voor iPad/iPhone. */
(()=>{
'use strict';
if(window.__msPlannerScroll83206)return;
window.__msPlannerScroll83206=true;
const id='msPlannerScroll83206Style';
let scheduled=false;

function style(){
 if(document.getElementById(id))return;
 const node=document.createElement('style');node.id=id;
 node.textContent=[
 'body:not(.planner-map-fullscreen-open) #appView > #planner.ms83206-scrollable:not(.hidden){',
 'box-sizing:border-box!important;display:block!important;position:relative!important;',
 'width:100%!important;max-width:none!important;min-height:0!important;',
 'height:var(--ms83206-height,calc(100dvh - 108px))!important;',
 'max-height:var(--ms83206-height,calc(100dvh - 108px))!important;',
 'overflow-x:hidden!important;overflow-y:auto!important;',
 '-webkit-overflow-scrolling:touch!important;overscroll-behavior-y:contain!important;',
 'touch-action:pan-y pinch-zoom!important;scroll-padding-bottom:28px;',
 'padding-bottom:calc(135px + env(safe-area-inset-bottom,0px))!important;}',
 'body #planner.ms83206-scrollable .planner-layout,',
 'body #planner.ms83206-scrollable .planner-form-card,',
 'body #planner.ms83206-scrollable .planner-summary-card{min-height:0!important;max-height:none!important;}',
 'body #planner.ms83206-scrollable .ms8237-shell{z-index:10;}',
 'body #planner.ms83206-scrollable .planner-main-actions,',
 'body #planner.ms83206-scrollable .harbour-library-card{scroll-margin-bottom:130px;}',
 '@supports not (height:100dvh){',
 'body #appView > #planner.ms83206-scrollable:not(.hidden){',
 'height:var(--ms83206-height,calc(100vh - 108px))!important;',
 'max-height:var(--ms83206-height,calc(100vh - 108px))!important;}}'
 ].join('\n');
 document.head.appendChild(node);
}
function shown(el){
 if(!el||el.hidden||el.classList.contains('hidden'))return false;
 const css=getComputedStyle(el);
 return css.display!=='none'&&css.visibility!=='hidden';
}
function isModalOpen(){
 const ids=['plannerMapFullscreen','poiDetailModal','poiMapPicker','radarCameraFullscreen','lightbox','installHelp'];
 if(ids.some(id=>shown(document.getElementById(id))))return true;
 if(document.querySelector('dialog[open]'))return true;
 return !!document.getElementById('ms8290MoreSheet')?.classList.contains('open');
}
function navTop(){
 const navs=[document.getElementById('ms8290GlobalNav'),...document.querySelectorAll('.bottom-nav')];
 for(const nav of navs){
  if(!shown(nav))continue;
  const box=nav.getBoundingClientRect();
  if(box.width>0&&box.height>30)return box.top;
 }
 return null;
}
function update(){
 const planner=document.getElementById('planner');
 if(!planner)return;
 const active=!planner.classList.contains('hidden')&&!document.body.classList.contains('planner-map-fullscreen-open');
 planner.classList.toggle('ms83206-scrollable',active);
 if(!active){planner.style.removeProperty('--ms83206-height');return;}

 // Oude body-scrollblokkade van een gesloten pop-up veilig herstellen.
 if(!isModalOpen()&&document.body.style.overflow==='hidden')
  document.body.style.removeProperty('overflow');

 const top=Math.max(0,planner.getBoundingClientRect().top);
 const vp=window.visualViewport;
 const bottom=vp?vp.offsetTop+vp.height:window.innerHeight;
 const nTop=navTop();
 const end=nTop===null?bottom-96:Math.min(bottom,nTop);
 const h=Math.max(220,Math.floor(end-top-12));
 planner.style.setProperty('--ms83206-height',h+'px');
}
function schedule(){
 if(scheduled)return;
 scheduled=true;
 requestAnimationFrame(()=>{scheduled=false;update()});
}
function init(){
 style();schedule();
 const planner=document.getElementById('planner');
 if(planner)new MutationObserver(schedule).observe(planner,{attributes:true,attributeFilter:['class']});
 new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});
 const nav=document.getElementById('ms8290GlobalNav');
 if(nav)new MutationObserver(schedule).observe(nav,{attributes:true,attributeFilter:['hidden','style']});
 window.addEventListener('resize',schedule,{passive:true});
 window.addEventListener('orientationchange',schedule,{passive:true});
 window.visualViewport?.addEventListener('resize',schedule,{passive:true});
 window.addEventListener('pageshow',schedule,{passive:true});
 window.addEventListener('mijnserenity:routechange',schedule,{passive:true});
 document.addEventListener('focusin',e=>{if(e.target.closest?.('#planner'))schedule()},{passive:true});
 document.addEventListener('click',()=>setTimeout(schedule,80),{passive:true});
 setTimeout(schedule,300);setTimeout(schedule,1100);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
