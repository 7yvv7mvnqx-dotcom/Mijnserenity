/* MijnSerenity 8.30.14 — Snel naar: onderzijde gemaskeerd, boven uitschuiven, stabiele hover */
(()=>{
'use strict';
if(window.__msQuickFeatureReveal83014)return;
window.__msQuickFeatureReveal83014=true;

const ROOT='ms8210Start';
const STYLE_ID='msQuickFeatureReveal83014Style';
const SHIFT=52;

function installStyle(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
#${ROOT} .msr-quick{
  position:relative!important;
  z-index:30!important;
  overflow:visible!important;
  clip-path:inset(-78px 0 0 0)!important;
  -webkit-clip-path:inset(-78px 0 0 0)!important;
}
#${ROOT} .ms8263-features{
  position:relative!important;
  z-index:31!important;
  overflow:visible!important;
}
#${ROOT} .ms8263-feature{
  position:relative!important;
  z-index:1!important;
  transform:translate3d(0,0,0)!important;
  transition:transform 340ms cubic-bezier(.22,.78,.2,1),box-shadow 340ms ease!important;
  will-change:transform;
  backface-visibility:hidden;
  -webkit-backface-visibility:hidden;
}
#${ROOT} .ms8263-feature.msr-feature-expanded{
  z-index:4!important;
  transform:translate3d(0,-${SHIFT}px,0)!important;
  box-shadow:inset 0 1px rgba(255,255,255,.18),0 12px 24px rgba(0,0,0,.24)!important;
}
#${ROOT} .ms8263-feature .copy small{overflow:hidden!important}
@media (prefers-reduced-motion:reduce){
  #${ROOT} .ms8263-feature{transition:none!important}
}
`;
  document.head.appendChild(s);
}

function isTouchLike(){
  return window.matchMedia?.('(hover: none), (pointer: coarse)')?.matches===true;
}

function bind(root){
  const grid=root.querySelector('.ms8263-features');
  if(!grid)return;
  const cards=[...grid.querySelectorAll('.ms8263-feature[data-ms8263-go]')];
  if(!cards.length)return;

  // Prevent older handlers from causing hover flicker by using our fixed hit zone.
  const closeAll=(except)=>{
    cards.forEach(c=>{
      if(c!==except){
        c.classList.remove('msr-feature-expanded');
        c.setAttribute('aria-expanded','false');
      }
    });
  };
  const open=(card)=>{
    if(!card)return;
    closeAll(card);
    card.classList.add('msr-feature-expanded');
    card.setAttribute('aria-expanded','true');
  };

  if(grid.dataset.ms83014Hover!=='1'){
    grid.dataset.ms83014Hover='1';
    grid.addEventListener('pointermove',e=>{
      if(isTouchLike()||e.pointerType==='touch')return;
      const r=grid.getBoundingClientRect();
      if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){closeAll();return;}
      const cs=getComputedStyle(grid);
      const gap=parseFloat(cs.columnGap||cs.gap||'0')||0;
      const w=(r.width-gap*(cards.length-1))/cards.length;
      const rel=e.clientX-r.left;
      const idx=Math.max(0,Math.min(cards.length-1,Math.floor(rel/(w+gap))));
      const start=idx*(w+gap);
      if(rel>=start&&rel<=start+w)open(cards[idx]); else closeAll();
    },{passive:true});
    grid.addEventListener('pointerleave',e=>{
      if(!isTouchLike()&&e.pointerType!=='touch')closeAll();
    },{passive:true});
  }

  cards.forEach(card=>{
    if(card.dataset.ms83014Touch==='1')return;
    card.dataset.ms83014Touch='1';
    card.setAttribute('aria-expanded',card.classList.contains('msr-feature-expanded')?'true':'false');
    card.addEventListener('click',e=>{
      if(!isTouchLike())return;
      if(!card.classList.contains('msr-feature-expanded')){
        e.preventDefault();
        e.stopImmediatePropagation();
        open(card);
      }
    },true);
  });

  if(root.dataset.ms83014Outside!=='1'){
    root.dataset.ms83014Outside='1';
    document.addEventListener('pointerdown',e=>{
      if(!isTouchLike())return;
      if(!e.target?.closest?.('#'+ROOT+' .ms8263-feature'))closeAll();
    },{passive:true});
  }
}

function apply(){
  installStyle();
  const root=document.getElementById(ROOT);
  if(root)bind(root);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('pageshow',apply,{passive:true});
window.addEventListener('mijnserenity:dashboard-ready',()=>setTimeout(apply,0),{passive:true});
setInterval(()=>{if(!document.hidden)apply()},1200);
})();