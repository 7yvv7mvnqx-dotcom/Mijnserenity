/* MijnSerenity 8.26.5 — complete start dashboard buttons */
(()=>{
'use strict';
if(window.__msDashboardButtons8265)return;
window.__msDashboardButtons8265=true;

const ROOT='ms8210Start';
const STYLE='ms8265DashboardButtonsStyle';
const $=id=>document.getElementById(id);
const icons={
 home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
 boat:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11M12 4l6 7h-6M12 6 7 11h5M4 15h16l-2 4H7l-3-4Z"/></svg>',
 map:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/></svg>',
 log:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="15" height="18" rx="2"/><path d="M8 3v18M11 8h6M11 12h6M11 16h4M3 7h4M3 12h4M3 17h4"/></svg>',
 music:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg>',
 sun:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
 route:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 5h4a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h7"/></svg>',
 radar:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2"/><path d="M4.2 19.8a11 11 0 0 1 15.6-15.6M7 17a7 7 0 0 1 10-10M12 12l7-7"/></svg>',
 technical:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>',
 pin:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.4"/></svg>',
 euro:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6.5A7 7 0 1 0 18 17.5M5 10h9M5 14h8"/></svg>',
 chart:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20V7"/></svg>',
 settings:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
 battery:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2M13 8l-3 6h3l-2 5 5-7h-3l2-4Z"/></svg>',
 chev:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>'
};

function installStyle(){
 if($(STYLE))return;
 const s=document.createElement('style');
 s.id=STYLE;
 s.textContent=`
 #${ROOT} .ms8263-nav{
   display:flex!important;
   grid-template-columns:none!important;
   justify-content:flex-start!important;
   gap:2px!important;
   padding-left:8px!important;
   padding-right:8px!important;
   overflow-x:auto!important;
   overflow-y:hidden!important;
   -webkit-overflow-scrolling:touch;
   overscroll-behavior-x:contain;
   scroll-snap-type:x proximity;
   scrollbar-width:none;
   touch-action:pan-x;
 }
 #${ROOT} .ms8263-nav::-webkit-scrollbar{display:none;width:0;height:0}
 #${ROOT} .ms8263-nav button{
   flex:0 0 86px!important;
   width:86px!important;
   min-width:86px!important;
   padding-left:4px!important;
   padding-right:4px!important;
   scroll-snap-align:start;
   touch-action:pan-x;
 }
 #${ROOT} .ms8263-nav button span{max-width:100%;overflow:visible;text-overflow:clip;white-space:nowrap}
 #${ROOT} .ms8263-feature.ms8265-logbook{background:linear-gradient(145deg,rgba(4,91,145,.96),rgba(3,45,82,.96))!important;border-color:rgba(48,177,255,.44)!important}
 #${ROOT} .ms8263-feature.ms8265-energy{background:linear-gradient(145deg,rgba(125,35,48,.96),rgba(66,20,31,.98))!important;border-color:rgba(247,82,100,.42)!important}
 #${ROOT} .ms8263-feature.ms8265-logbook>svg,#${ROOT} .ms8263-feature.ms8265-energy>svg{width:39px;height:39px}
 @media(max-width:480px){
   #${ROOT} .ms8263-nav{padding-left:5px!important;padding-right:10px!important}
   #${ROOT} .ms8263-nav button{flex-basis:82px!important;width:82px!important;min-width:82px!important;font-size:10.5px!important;gap:5px!important}
   #${ROOT} .ms8263-nav button svg{width:25px!important;height:25px!important}
 }
 `;
 document.head.appendChild(s);
}

function go(target){
 try{
   if(typeof window.ms8263Navigate==='function'){
     window.ms8263Navigate(target);
     return;
   }
   if(typeof window.captainNavigate==='function'){
     window.captainNavigate(target);
     return;
   }
   location.hash='#'+target;
 }catch(_){location.hash='#'+target}
}

function bind(el){
 if(!el||el.dataset.ms8265Bound==='1')return;
 el.dataset.ms8265Bound='1';
 el.addEventListener('click',()=>go(el.dataset.ms8265Go));
}

function navButton(target,ic,label,active=false){
 return `<button type="button"${active?' class="active"':''} data-ms8265-go="${target}" aria-label="${label}">${icons[ic]}<span>${label}</span></button>`;
}

function feature(target,ic,title,subtitle,tone){
 return `<button type="button" class="ms8263-feature ${tone}" data-ms8265-go="${target}">${icons[ic]}<span class="copy"><strong>${title}</strong><small>${subtitle}</small></span><span class="chev">${icons.chev}</span></button>`;
}

function apply(){
 const root=$(ROOT);
 if(!root)return false;
 installStyle();

 const nav=root.querySelector('.ms8263-nav');
 if(nav&&nav.dataset.ms8265Complete!=='scroll-v1'){
   nav.innerHTML=[
     navButton('dashboard','home','Start',true),
     navButton('live','boat','Varen'),
     navButton('map','map','Kaart'),
     navButton('logbook','log','Logboek'),
     navButton('entertainment','music','Entertainment'),
     navButton('weather','sun','Weer'),
     navButton('planner','route','Reisplanner'),
     navButton('ais','radar','AIS'),
     navButton('technical','technical','Techniek'),
     navButton('pois','pin','POI'),
     navButton('costs','euro','Kosten'),
     navButton('finance','chart','Financieel'),
     navButton('settings','settings','Instellingen')
   ].join('');
   nav.dataset.ms8265Complete='scroll-v1';
   nav.setAttribute('aria-label','Hoofdnavigatie — veeg zijwaarts voor meer knoppen');
   nav.querySelectorAll('[data-ms8265-go]').forEach(bind);
   nav.scrollLeft=0;
 }

 root.querySelector('.ms8263-sheet')?.remove();

 const features=root.querySelector('.ms8263-features');
 if(features&&!features.querySelector('.ms8265-logbook')){
   features.insertAdjacentHTML('beforeend',
     feature('logbook','log','Logboek','Reizen, foto’s & notities','ms8265-logbook')+
     feature('technical','battery','Energie','Accu’s, tanks & stroom','ms8265-energy')
   );
   features.querySelectorAll('[data-ms8265-go]').forEach(bind);
 }
 return true;
}

window.ms8265ApplyDashboardButtons=apply;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,0),{once:true});else setTimeout(apply,0);
window.addEventListener('pageshow',()=>setTimeout(apply,20),{passive:true});
window.addEventListener('hashchange',()=>{if((location.hash||'#dashboard').startsWith('#dashboard'))setTimeout(apply,20)},{passive:true});
})();
