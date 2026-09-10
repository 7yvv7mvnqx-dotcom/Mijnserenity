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
 more:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>',
 battery:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2M13 8l-3 6h3l-2 5 5-7h-3l2-4Z"/></svg>',
 chev:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>'
};

function installStyle(){
 if($(STYLE))return;
 const s=document.createElement('style');
 s.id=STYLE;
 s.textContent=`
 #${ROOT} .ms8263-nav{grid-template-columns:repeat(6,minmax(0,1fr))!important}
 #${ROOT} .ms8263-nav button{min-width:0!important;padding-left:1px!important;padding-right:1px!important}
 #${ROOT} .ms8263-nav button span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 #${ROOT} .ms8263-feature.ms8265-logbook{background:linear-gradient(145deg,rgba(4,91,145,.96),rgba(3,45,82,.96))!important;border-color:rgba(48,177,255,.44)!important}
 #${ROOT} .ms8263-feature.ms8265-energy{background:linear-gradient(145deg,rgba(125,35,48,.96),rgba(66,20,31,.98))!important;border-color:rgba(247,82,100,.42)!important}
 #${ROOT} .ms8263-feature.ms8265-logbook>svg,#${ROOT} .ms8263-feature.ms8265-energy>svg{width:39px;height:39px}
 @media(max-width:480px){
   #${ROOT} .ms8263-nav{padding-left:4px!important;padding-right:4px!important}
   #${ROOT} .ms8263-nav button{font-size:10.5px!important;gap:5px!important}
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
 if(nav&&nav.dataset.ms8265Complete!=='1'){
   nav.innerHTML=[
     navButton('dashboard','home','Start',true),
     navButton('live','boat','Varen'),
     navButton('map','map','Kaart'),
     navButton('logbook','log','Logboek'),
     navButton('entertainment','music','Entertainment'),
     navButton('more','more','Meer')
   ].join('');
   nav.dataset.ms8265Complete='1';
   nav.querySelectorAll('[data-ms8265-go]').forEach(bind);
 }

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
