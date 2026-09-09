/* MijnSerenity 8.26.0 — approved dashboard 2026-09-09 */
(()=>{
'use strict';
if(window.__msApprovedDashboard8260)return;
window.__msApprovedDashboard8260=true;
const ROOT='ms8210Start', STYLE='ms8260ApprovedStyle', BUILD='8.26.0';
const $=id=>document.getElementById(id);
const icon={
 home:'<svg viewBox="0 0 24 24"><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
 map:'<svg viewBox="0 0 24 24"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/></svg>',
 route:'<svg viewBox="0 0 24 24"><circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 5h4a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h7"/></svg>',
 radar:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"/><path d="M4.2 19.8a11 11 0 0 1 15.6-15.6M7 17a7 7 0 0 1 10-10M12 12l7-7"/></svg>',
 sun:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
 more:'<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
 pin:'<svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.4"/></svg>',
 cloud:'<svg viewBox="0 0 24 24"><path d="M6 18h11a4 4 0 0 0 .5-8 6 6 0 0 0-11.3-1.5A4.7 4.7 0 0 0 6 18Z"/></svg>',
 battery:'<svg viewBox="0 0 24 24"><rect x="3" y="7" width="17" height="10" rx="2"/><path d="M20 10h2v4h-2"/></svg>',
 speed:'<svg viewBox="0 0 24 24"><path d="M4 17a8 8 0 1 1 16 0"/><path d="m12 14 4-4"/><circle cx="12" cy="14" r="1.4"/></svg>',
 depth:'<svg viewBox="0 0 24 24"><path d="M12 3v14"/><path d="m8 13 4 4 4-4"/><path d="M4 20c2-1 4-1 6 0s4 1 6 0 3-1 4-.5"/></svg>',
 compass:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z"/></svg>',
 moon:'<svg viewBox="0 0 24 24"><path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.7 8.7 0 1 0 11.2 11.2Z"/></svg>',
 play:'<svg viewBox="0 0 24 24"><path d="m9 6 9 6-9 6V6Z"/></svg>',
 chev:'<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>'
};
function installStyle(){
 if($(STYLE))return;
 const s=document.createElement('style'); s.id=STYLE;
 s.textContent=`
 #dashboard.ms8255-reference-dashboard{padding:0!important;margin:0!important;max-width:none!important;background:#03131f!important}
 #${ROOT}{display:block!important;width:100%!important;min-height:100dvh!important;margin:0!important;padding:0 0 36px!important;background:radial-gradient(circle at 78% 12%,#0b3346 0,#041c2a 31%,#02131f 74%)!important;color:#fff!important;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;overflow:hidden!important}
 #${ROOT} *{box-sizing:border-box} #${ROOT} button{font:inherit} #${ROOT} svg{display:block;width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
 #${ROOT} .ms8260-shell{width:100%;max-width:920px;margin:0 auto;background:linear-gradient(180deg,#041d2c,#03131f 72%);min-height:100dvh;box-shadow:0 0 70px rgba(0,0,0,.22)}
 #${ROOT} .ms8260-hero{position:relative;min-height:430px;background:url('/serenity-dashboard-boat-20260909.webp?v=8260') center 48%/cover no-repeat;isolation:isolate;overflow:hidden}
 #${ROOT} .ms8260-hero:after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,13,24,.06) 0%,rgba(0,17,28,.02) 45%,rgba(0,20,31,.60) 78%,rgba(0,17,27,.92) 100%)}
 #${ROOT} .ms8260-brand{position:absolute;left:32px;top:28px;text-shadow:0 2px 12px rgba(255,255,255,.18)}
 #${ROOT} .ms8260-brand strong{display:block;font-family:Georgia,"Times New Roman",serif;font-size:58px;line-height:.88;font-weight:500;letter-spacing:-.055em;color:#072e58}
 #${ROOT} .ms8260-brand small{display:block;margin:8px 0 0 4px;color:#072644;font-size:16px;font-weight:800;letter-spacing:.01em}
 #${ROOT} .ms8260-tag{position:absolute;right:30px;top:30px;color:#082c56;text-align:right;font-family:"Segoe Script","Bradley Hand",cursive;font-size:27px;font-style:italic;line-height:1.02;transform:rotate(-4deg);text-shadow:0 1px 9px rgba(255,255,255,.35)}
 #${ROOT} .ms8260-nav{position:absolute;left:0;right:0;bottom:0;display:grid;grid-template-columns:repeat(6,1fr);min-height:89px;padding:10px 7px 7px;background:rgba(2,28,43,.84);border-top:1px solid rgba(171,231,255,.16);border-bottom:1px solid rgba(92,207,245,.28);backdrop-filter:blur(15px);-webkit-backdrop-filter:blur(15px)}
 #${ROOT} .ms8260-nav button{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:0;background:transparent;color:#eaf4f8;font-size:12px;cursor:pointer}
 #${ROOT} .ms8260-nav button svg{width:27px;height:27px;stroke-width:2.15} #${ROOT} .ms8260-nav button.active{color:#22d9ff} #${ROOT} .ms8260-nav button.active:after{content:"";position:absolute;left:10%;right:10%;bottom:-7px;height:2px;background:#21d9ff;border-radius:2px}
 #${ROOT} .ms8260-main{padding:30px 27px 34px;background:linear-gradient(180deg,rgba(3,24,37,.98),#03131f)}
 #${ROOT} .ms8260-greet{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin:0 2px 23px}
 #${ROOT} .ms8260-greet b{display:block;font-size:15px;letter-spacing:.12em;text-transform:uppercase} #${ROOT} .ms8260-date{margin-top:5px;color:#9cb2c0;font-size:14px;font-weight:650}
 #${ROOT} .ms8260-theme{display:flex;align-items:center;gap:10px;min-height:51px;padding:0 18px;border:1px solid rgba(85,205,248,.28);border-radius:999px;background:rgba(3,28,43,.76);color:#fff;font-weight:800;box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}
 #${ROOT} .ms8260-theme svg{width:23px;height:23px;color:#22d8ff;fill:#22d8ff;stroke:#22d8ff}
 #${ROOT} .ms8260-status{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;margin-bottom:18px}
 #${ROOT} .ms8260-status-card{display:grid;grid-template-columns:39px 1fr;grid-template-areas:"ic lab" "ic val" "ic sub";align-items:center;min-width:0;min-height:100px;padding:14px 13px;border:1px solid rgba(96,201,240,.24);border-radius:19px;background:linear-gradient(145deg,rgba(8,49,70,.82),rgba(3,29,45,.76));box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 11px 24px rgba(0,0,0,.11)}
 #${ROOT} .ms8260-status-card>svg{grid-area:ic;width:29px;height:29px;color:#f2f8fb} #${ROOT} .ms8260-status-card>small{grid-area:lab;color:#9fb3c0;font-size:10px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;white-space:nowrap} #${ROOT} .ms8260-status-card>strong{grid-area:val;margin-top:2px;font-size:18px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #${ROOT} .ms8260-status-card>em{grid-area:sub;margin-top:3px;color:#9eb2bf;font-size:11px;font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 #${ROOT} .ms8260-welcome{position:relative;padding:30px 25px 24px;border:1px solid rgba(64,197,243,.35);border-radius:25px;background:radial-gradient(circle at 92% 26%,rgba(18,94,123,.18),transparent 37%),linear-gradient(145deg,rgba(2,26,40,.95),rgba(1,18,29,.97));overflow:hidden;box-shadow:0 15px 38px rgba(0,0,0,.18)}
 #${ROOT} .ms8260-welcome:after{content:"✦";position:absolute;right:25px;top:44px;font-size:118px;line-height:1;color:rgba(18,145,188,.09);transform:rotate(20deg);pointer-events:none}
 #${ROOT} .ms8260-kicker{display:block;margin-bottom:13px;color:#25dafa;font-size:12px;font-weight:900;letter-spacing:.19em;text-transform:uppercase}
 #${ROOT} .ms8260-welcome h2{position:relative;z-index:1;max-width:560px;margin:0;color:#fff;font-size:45px;line-height:.94;letter-spacing:-.045em;font-weight:900} #${ROOT} .ms8260-welcome p{position:relative;z-index:1;max-width:620px;margin:16px 0 21px;color:#d6e1e8;font-size:17px;line-height:1.34;font-weight:600}
 #${ROOT} .ms8260-live{display:grid;grid-template-columns:repeat(3,1fr);margin:0 0 20px;border:1px solid rgba(92,200,240,.28);border-radius:19px;background:rgba(2,24,37,.78);overflow:hidden}
 #${ROOT} .ms8260-metric{display:grid;grid-template-columns:auto 1fr;grid-template-areas:"ic val" "ic lab";align-items:center;column-gap:10px;min-width:0;padding:14px 14px} #${ROOT} .ms8260-metric+.ms8260-metric{border-left:1px solid rgba(177,220,236,.19)} #${ROOT} .ms8260-metric svg{grid-area:ic;width:27px;height:27px} #${ROOT} .ms8260-metric strong{grid-area:val;font-size:17px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #${ROOT} .ms8260-metric small{grid-area:lab;margin-top:3px;color:#9fb1bd;font-size:11px}
 #${ROOT} .ms8260-start{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;gap:13px;width:100%;min-height:72px;border:1px solid rgba(128,244,255,.62);border-radius:20px;background:linear-gradient(135deg,#13bde8,#20d9f4);color:white;font-size:21px;font-weight:900;box-shadow:0 14px 32px rgba(10,193,230,.16),inset 0 1px 0 rgba(255,255,255,.32);cursor:pointer} #${ROOT} .ms8260-start svg{width:27px;height:27px;stroke-width:2.2} #${ROOT} .ms8260-start .chev{margin-left:5px}
 #${ROOT} .ms8260-features{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:18px}
 #${ROOT} .ms8260-feature{display:grid;grid-template-columns:54px 1fr 20px;align-items:center;gap:12px;min-height:124px;padding:18px 20px;border:1px solid rgba(106,210,250,.28);border-radius:21px;color:#fff;text-align:left;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 13px 27px rgba(0,0,0,.1)} #${ROOT} .ms8260-feature>svg{width:40px;height:40px;stroke-width:1.9} #${ROOT} .ms8260-feature .copy strong{display:block;font-size:20px} #${ROOT} .ms8260-feature .copy small{display:block;margin-top:6px;color:#b6c6d0;font-size:13px;line-height:1.25} #${ROOT} .ms8260-feature .chev{width:20px;height:20px;color:#dbeaf0}
 #${ROOT} .ms8260-feature.blue{background:linear-gradient(135deg,rgba(4,55,79,.95),rgba(6,39,59,.94))} #${ROOT} .ms8260-feature.purple{background:linear-gradient(135deg,rgba(52,28,82,.94),rgba(37,25,68,.94));border-color:rgba(173,94,255,.3)} #${ROOT} .ms8260-feature.green{background:linear-gradient(135deg,rgba(4,70,63,.93),rgba(2,46,47,.94));border-color:rgba(43,209,165,.3)} #${ROOT} .ms8260-feature.gold{background:linear-gradient(135deg,rgba(74,66,37,.94),rgba(44,42,29,.94));border-color:rgba(230,178,68,.3)}
 @media(max-width:620px){
   #${ROOT} .ms8260-shell{width:100vw;max-width:none;margin-left:calc(50% - 50vw)} #${ROOT} .ms8260-hero{min-height:410px;background-position:center 46%} #${ROOT} .ms8260-brand{left:20px;top:22px} #${ROOT} .ms8260-brand strong{font-size:47px} #${ROOT} .ms8260-brand small{font-size:12px;margin-top:6px} #${ROOT} .ms8260-tag{right:19px;top:22px;font-size:22px} #${ROOT} .ms8260-nav{min-height:82px} #${ROOT} .ms8260-nav button{font-size:10px;gap:5px} #${ROOT} .ms8260-nav button svg{width:24px;height:24px}
   #${ROOT} .ms8260-main{padding:26px 18px 30px} #${ROOT} .ms8260-greet{margin-bottom:18px} #${ROOT} .ms8260-theme{min-height:46px;padding:0 15px;font-size:14px} #${ROOT} .ms8260-status{gap:8px} #${ROOT} .ms8260-status-card{grid-template-columns:33px 1fr;min-height:92px;padding:11px 9px} #${ROOT} .ms8260-status-card>svg{width:25px;height:25px} #${ROOT} .ms8260-status-card>strong{font-size:15px} #${ROOT} .ms8260-status-card>em{font-size:9px} #${ROOT} .ms8260-welcome{padding:27px 20px 21px} #${ROOT} .ms8260-welcome h2{font-size:39px} #${ROOT} .ms8260-welcome p{font-size:15px} #${ROOT} .ms8260-live{margin-bottom:18px} #${ROOT} .ms8260-metric{grid-template-columns:28px 1fr;column-gap:7px;padding:12px 9px} #${ROOT} .ms8260-metric svg{width:23px;height:23px} #${ROOT} .ms8260-metric strong{font-size:14px} #${ROOT} .ms8260-metric small{font-size:9px} #${ROOT} .ms8260-start{min-height:66px;font-size:18px} #${ROOT} .ms8260-feature{grid-template-columns:43px 1fr 16px;min-height:113px;padding:15px 15px;gap:8px} #${ROOT} .ms8260-feature>svg{width:34px;height:34px} #${ROOT} .ms8260-feature .copy strong{font-size:17px} #${ROOT} .ms8260-feature .copy small{font-size:11px}
 }
 @media(max-width:365px){#${ROOT} .ms8260-main{padding-left:13px;padding-right:13px} #${ROOT} .ms8260-status-card{grid-template-columns:28px 1fr;padding-left:7px;padding-right:7px} #${ROOT} .ms8260-status-card>svg{width:22px;height:22px} #${ROOT} .ms8260-welcome h2{font-size:35px} #${ROOT} .ms8260-features{grid-template-columns:1fr}}
 `; document.head.appendChild(s);
}
function nav(target){
 if(target==='dashboard')return;
 const root=$(ROOT), aliases=target==='planner'?['planner','route']:target==='map'?['map','waterkaarten']:[target];
 for(const name of aliases){
  const c=[...document.querySelectorAll(`.bottom-nav-item[data-target="${name}"],.tabs [data-target="${name}"],[data-route="${name}"],[data-target="${name}"]`)];
  const n=c.find(el=>!root?.contains(el)); if(n){n.click();return}
  try{if(typeof window.navigateTo==='function'){window.navigateTo(name);return}}catch(_){}
  try{if(typeof window.showPage==='function'){window.showPage(name);return}}catch(_){}
 }
}
function dateText(){try{return new Intl.DateTimeFormat('nl-NL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date())}catch(_){return ''}}
function greeting(){const h=new Date().getHours();return h<12?'Goedemorgen':h<18?'Goedemiddag':'Goedenavond'}
function metric(ic,id,label){return `<div class="ms8260-metric">${icon[ic]}<strong id="${id}">—</strong><small>${label}</small></div>`}
function status(ic,label,id,sub){return `<div class="ms8260-status-card">${icon[ic]}<small>${label}</small><strong id="${id}">—</strong><em id="${sub}"></em></div>`}
function feature(target,ic,title,sub,tone){return `<button type="button" class="ms8260-feature ${tone}" data-ms8260-go="${target}">${icon[ic]}<span class="copy"><strong>${title}</strong><small>${sub}</small></span><span class="chev">${icon.chev}</span></button>`}
function apply(){
 const root=$(ROOT); if(!root)return false; installStyle();
 if(root.querySelector('.ms8260-shell'))return true;
 root.className='ms8255-reference-home ms8260-approved-home'; root.dataset.approved='8260';
 root.innerHTML=`<div class="ms8260-shell">
 <section class="ms8260-hero" aria-label="Serenity">
  <div class="ms8260-brand"><strong>Serenity</strong><small>VriJon Contessa 37E</small></div>
  <div class="ms8260-tag">Explore<br>Navigate<br>Enjoy</div>
  <nav class="ms8260-nav" aria-label="Hoofdnavigatie">
   <button class="active" data-ms8260-go="dashboard">${icon.home}<span>Haven</span></button><button data-ms8260-go="map">${icon.map}<span>Kaart</span></button><button data-ms8260-go="planner">${icon.route}<span>Reisplanner</span></button><button data-ms8260-go="ais">${icon.radar}<span>AIS</span></button><button data-ms8260-go="weather">${icon.sun}<span>Weer</span></button><button data-ms8260-go="more">${icon.more}<span>Meer</span></button>
  </nav>
 </section>
 <main class="ms8260-main">
  <section class="ms8260-greet"><div><b>${greeting()} 👋</b><div class="ms8260-date">${dateText()}</div></div><button type="button" class="ms8260-theme" id="ms8260Theme">${icon.moon}<span>Nacht</span><span>⌄</span></button></section>
  <section class="ms8260-status">${status('pin','Ligplaats','ms8255Location','ms8255LocationSub')}${status('cloud','Buiten','ms8255Outside','ms8255OutsideSub')}${status('battery','Accu','ms8255Soc','ms8255BatterySub')}</section>
  <section class="ms8260-welcome"><span class="ms8260-kicker">Welkom terug</span><h2>Welkom terug<br>aan boord!</h2><p>De Serenity ligt klaar. Waar brengt de volgende reis je naartoe?</p><div class="ms8260-live">${metric('speed','ms8255Speed','Snelheid')}${metric('depth','ms8255Depth','Diepte')}${metric('compass','ms8255Wind','Wind')}</div><button type="button" class="ms8260-start" data-ms8260-go="live">${icon.play}<span>Start live varen</span><span class="chev">${icon.chev}</span></button></section>
  <section class="ms8260-features">${feature('map','map','Kaart','Waterkaarten & navigatie','blue')}${feature('planner','route','Reisplanner','Plan je route & bekijk reistijd','purple')}${feature('ais','radar','AIS','Schepen in de omgeving','green')}${feature('weather','sun','Weer','Actuele weersinfo & voorspellingen','gold')}</section>
 </main></div>`;
 root.querySelectorAll('[data-ms8260-go]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.ms8260Go)));
 $('ms8260Theme')?.addEventListener('click',()=>{const shell=root.querySelector('.ms8260-shell');const day=shell.dataset.theme==='day';shell.dataset.theme=day?'night':'day';shell.style.filter=day?'none':'brightness(1.08) saturate(.92)';$('ms8260Theme').querySelector('span').textContent=day?'Nacht':'Dag'});
 window.MIJSERENITY_BUILD=BUILD;
 try{window.ms8210RefreshStart?.()}catch(_){}
 return true;
}
window.ms8260ApplyApprovedDashboard=apply;
function start(){if(!apply())setTimeout(start,80)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
let busy=false;const mo=new MutationObserver(()=>{if(busy)return;const root=$(ROOT);if(root&&!root.querySelector('.ms8260-shell')){busy=true;setTimeout(()=>{apply();busy=false},25)}});mo.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('pageshow',()=>setTimeout(apply,20),{passive:true});
window.addEventListener('hashchange',()=>setTimeout(apply,100),{passive:true});
})();