/* MijnSerenity 8.26.3 — fine-tuned approved Haven dashboard */
(()=>{
'use strict';
if(window.__msApprovedDashboard8263)return;
window.__msApprovedDashboard8263=true;
/* Prevent the superseded renderer from taking control after this one. */
window.__msApprovedDashboard8260=true;

const BUILD='8.26.3';
const TOKEN='826300';
const ROOT='ms8210Start';
const STYLE='ms8263ApprovedStyle';
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
 chev:'<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
 close:'<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>'
};

function installStyle(){
 if($(STYLE))return;
 $('ms8260ApprovedStyle')?.remove();
 const s=document.createElement('style');s.id=STYLE;
 s.textContent=`
 :root{--ms8263-cyan:#22d8ff;--ms8263-bg:#03131f;--ms8263-line:rgba(79,199,241,.31)}
 body.ms8263-home-active{background:#03131f!important;overscroll-behavior-y:none}
 body.ms8263-home-active #appView>.tabs{display:none!important}
 #dashboard.ms8255-reference-dashboard{padding:0!important;margin:0!important;max-width:none!important;background:#03131f!important;overflow:visible!important}
 #${ROOT}{display:block!important;width:100%!important;min-height:100dvh!important;margin:0!important;padding:0!important;background:#03131f!important;color:#fff!important;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;overflow:hidden!important;-webkit-font-smoothing:antialiased}
 #${ROOT} *{box-sizing:border-box}
 #${ROOT} button{font:inherit;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
 #${ROOT} svg{display:block;width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
 #${ROOT} .ms8263-shell{width:100%;max-width:920px;min-height:100dvh;margin:0 auto;background:linear-gradient(180deg,#062235 0,#031522 64%,#02101a 100%);box-shadow:0 0 70px rgba(0,0,0,.24)}
 #${ROOT} .ms8263-hero{position:relative;min-height:430px;background:url('/serenity-dashboard-boat-20260909.webp?v=${TOKEN}') center 49%/cover no-repeat;isolation:isolate;overflow:hidden}
 #${ROOT} .ms8263-hero:after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,10,19,.02) 0%,rgba(0,12,22,.02) 48%,rgba(0,20,32,.34) 70%,rgba(0,17,28,.88) 100%)}
 #${ROOT} .ms8263-brand{position:absolute;left:31px;top:max(28px,env(safe-area-inset-top));z-index:2;text-shadow:0 2px 15px rgba(255,255,255,.18)}
 #${ROOT} .ms8263-brand strong{display:block;font-family:Georgia,"Times New Roman",serif;font-size:62px;line-height:.88;font-weight:500;letter-spacing:-.058em;color:#062e57}
 #${ROOT} .ms8263-brand small{display:block;margin:8px 0 0 4px;color:#062a4d;font-size:16px;font-weight:850}
 #${ROOT} .ms8263-tag{position:absolute;right:29px;top:max(31px,env(safe-area-inset-top));z-index:2;color:#082d57;text-align:right;font-family:"Segoe Script","Bradley Hand",cursive;font-size:28px;font-style:italic;line-height:1.01;transform:rotate(-4deg);text-shadow:0 1px 8px rgba(255,255,255,.45)}
 #${ROOT} .ms8263-nav{position:absolute;left:0;right:0;bottom:0;z-index:4;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));min-height:91px;padding:9px 8px 8px;background:rgba(2,27,42,.81);border:1px solid rgba(98,207,246,.29);border-left:0;border-right:0;border-radius:29px 29px 0 0;backdrop-filter:blur(17px);-webkit-backdrop-filter:blur(17px)}
 #${ROOT} .ms8263-nav button{position:relative;min-width:0;min-height:68px;padding:4px 2px;border:0;background:transparent;color:#eff7fa;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;font-size:12px;font-weight:650;cursor:pointer}
 #${ROOT} .ms8263-nav button svg{width:28px;height:28px;stroke-width:2.05}
 #${ROOT} .ms8263-nav button.active{color:var(--ms8263-cyan)}
 #${ROOT} .ms8263-nav button.active:after{content:"";position:absolute;left:12%;right:12%;bottom:-8px;height:2px;border-radius:9px;background:var(--ms8263-cyan);box-shadow:0 0 10px rgba(34,216,255,.45)}
 #${ROOT} .ms8263-main{padding:29px 28px max(36px,env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(3,24,37,.97),#03131f 92%)}
 #${ROOT} .ms8263-greet{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:0 3px 20px}
 #${ROOT} .ms8263-greet b{display:block;font-size:16px;letter-spacing:.14em;text-transform:uppercase}
 #${ROOT} .ms8263-date{margin-top:5px;color:#8faac0;font-size:15px;font-weight:650;text-transform:none}
 #${ROOT} .ms8263-theme{display:flex;align-items:center;gap:10px;min-height:50px;padding:0 18px;border:1px solid var(--ms8263-line);border-radius:999px;background:rgba(4,31,47,.78);color:#fff;font-weight:800;box-shadow:inset 0 1px rgba(255,255,255,.04);cursor:pointer}
 #${ROOT} .ms8263-theme svg{width:23px;height:23px;color:#26dcff;fill:#26dcff;stroke:#26dcff}
 #${ROOT} .ms8263-status{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:19px}
 #${ROOT} .ms8263-status-card{display:grid;grid-template-columns:43px minmax(0,1fr);grid-template-areas:"ic lab" "ic val" "ic sub";align-items:center;min-width:0;min-height:111px;padding:15px 14px;border:1px solid rgba(79,199,241,.33);border-radius:20px;background:linear-gradient(145deg,rgba(7,54,78,.92),rgba(3,31,48,.82));color:#fff;text-align:left;box-shadow:inset 0 1px rgba(255,255,255,.04),0 10px 25px rgba(0,0,0,.10);cursor:pointer}
 #${ROOT} .ms8263-status-card>svg{grid-area:ic;width:31px;height:31px;color:#f4fbff}
 #${ROOT} .ms8263-status-card>small{grid-area:lab;color:#9db5c5;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap}
 #${ROOT} .ms8263-status-card>strong{grid-area:val;margin-top:3px;font-size:18px;line-height:1.08;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 #${ROOT} .ms8263-status-card>em{grid-area:sub;margin-top:5px;color:#9db3c1;font-size:11px;font-style:normal;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 #${ROOT} .ms8263-welcome{position:relative;padding:29px 27px 24px;border:1px solid rgba(69,198,241,.37);border-radius:25px;background:radial-gradient(circle at 88% 23%,rgba(22,109,143,.17),transparent 33%),linear-gradient(145deg,rgba(2,27,42,.98),rgba(2,17,29,.98));overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,.18)}
 #${ROOT} .ms8263-welcome:before{content:"";position:absolute;right:4%;top:3%;width:180px;height:180px;border:1px solid rgba(33,165,207,.10);border-radius:50%;box-shadow:inset 0 0 0 18px rgba(33,165,207,.025),inset 0 0 0 41px rgba(33,165,207,.025);pointer-events:none}
 #${ROOT} .ms8263-welcome:after{content:"✦";position:absolute;right:9%;top:57px;font-size:104px;line-height:1;color:rgba(24,157,202,.08);transform:rotate(20deg);pointer-events:none}
 #${ROOT} .ms8263-kicker{position:relative;z-index:1;display:block;margin-bottom:13px;color:#27dcfa;font-size:12px;font-weight:900;letter-spacing:.20em;text-transform:uppercase}
 #${ROOT} .ms8263-welcome h2{position:relative;z-index:1;max-width:560px;margin:0;color:#fff;font-size:47px;line-height:.94;letter-spacing:-.046em;font-weight:900}
 #${ROOT} .ms8263-welcome p{position:relative;z-index:1;max-width:620px;margin:17px 0 22px;color:#d7e2e8;font-size:17px;line-height:1.34;font-weight:600}
 #${ROOT} .ms8263-live{position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin:0 0 19px;border:1px solid rgba(89,199,238,.31);border-radius:19px;background:rgba(2,24,37,.80);overflow:hidden}
 #${ROOT} .ms8263-metric{display:grid;grid-template-columns:31px minmax(0,1fr);grid-template-areas:"ic val" "ic lab";align-items:center;column-gap:10px;min-width:0;padding:14px 15px}
 #${ROOT} .ms8263-metric+.ms8263-metric{border-left:1px solid rgba(177,220,236,.18)}
 #${ROOT} .ms8263-metric svg{grid-area:ic;width:28px;height:28px;color:#fff}
 #${ROOT} .ms8263-metric strong{grid-area:val;font-size:17px;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 #${ROOT} .ms8263-metric small{grid-area:lab;margin-top:4px;color:#9fb4c0;font-size:11px}
 #${ROOT} .ms8263-start{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;gap:14px;width:100%;min-height:74px;padding:0 22px;border:1px solid rgba(128,244,255,.67);border-radius:21px;background:linear-gradient(135deg,#0ec4ec,#18dff7);color:#fff;font-size:22px;font-weight:900;box-shadow:0 14px 32px rgba(10,193,230,.18),inset 0 1px rgba(255,255,255,.32);cursor:pointer}
 #${ROOT} .ms8263-start svg{width:28px;height:28px;stroke-width:2.2}
 #${ROOT} .ms8263-start .chev{width:21px;height:21px;margin-left:3px}
 #${ROOT} .ms8263-features{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}
 #${ROOT} .ms8263-feature{display:grid;grid-template-columns:55px minmax(0,1fr) 20px;align-items:center;gap:13px;min-height:126px;padding:18px 21px;border:1px solid rgba(106,210,250,.29);border-radius:21px;color:#fff;text-align:left;cursor:pointer;box-shadow:inset 0 1px rgba(255,255,255,.05),0 13px 27px rgba(0,0,0,.10)}
 #${ROOT} .ms8263-feature>svg{width:41px;height:41px;stroke-width:1.9}
 #${ROOT} .ms8263-feature .copy{min-width:0}
 #${ROOT} .ms8263-feature .copy strong{display:block;font-size:20px}
 #${ROOT} .ms8263-feature .copy small{display:block;margin-top:6px;color:#b7c8d1;font-size:13px;line-height:1.25}
 #${ROOT} .ms8263-feature .chev{width:20px;height:20px;color:#dbeaf0}
 #${ROOT} .ms8263-feature.blue{background:linear-gradient(135deg,rgba(4,59,84,.96),rgba(6,39,59,.96))}
 #${ROOT} .ms8263-feature.purple{background:linear-gradient(135deg,rgba(55,31,86,.96),rgba(38,24,69,.96));border-color:rgba(173,94,255,.32)}
 #${ROOT} .ms8263-feature.green{background:linear-gradient(135deg,rgba(4,72,64,.95),rgba(2,47,48,.96));border-color:rgba(43,209,165,.31)}
 #${ROOT} .ms8263-feature.gold{background:linear-gradient(135deg,rgba(80,61,31,.90),rgba(48,43,31,.96));border-color:rgba(224,169,63,.31)}
 #${ROOT} .ms8263-sheet{position:fixed;inset:0;z-index:9999;display:none;align-items:flex-end;justify-content:center;padding:18px;background:rgba(0,9,16,.56);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
 #${ROOT} .ms8263-sheet.open{display:flex}
 #${ROOT} .ms8263-sheet-card{width:min(560px,100%);padding:18px;border:1px solid rgba(92,204,244,.30);border-radius:25px;background:#062234;box-shadow:0 24px 80px rgba(0,0,0,.42)}
 #${ROOT} .ms8263-sheet-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}
 #${ROOT} .ms8263-sheet-head strong{font-size:20px}.ms8263-sheet-close{width:46px;height:46px;display:grid;place-items:center;border:1px solid rgba(119,210,244,.22);border-radius:50%;background:#082c42;color:#fff;cursor:pointer}
 #${ROOT} .ms8263-sheet-close svg{width:22px;height:22px}
 #${ROOT} .ms8263-sheet-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
 #${ROOT} .ms8263-sheet-grid button{min-height:58px;border:1px solid rgba(119,210,244,.20);border-radius:16px;background:#082a40;color:#fff;font-weight:750;cursor:pointer}
 #${ROOT}[data-theme="day"] .ms8263-main{filter:brightness(1.07) saturate(.94)}
 #${ROOT}[data-theme="day"] .ms8263-theme svg{fill:none}

 @media(max-width:620px){
   #${ROOT} .ms8263-shell{width:100vw;max-width:none;margin-left:calc(50% - 50vw)}
   #${ROOT} .ms8263-hero{min-height:400px;background-position:center 47%}
   #${ROOT} .ms8263-brand{left:22px;top:max(20px,env(safe-area-inset-top))}
   #${ROOT} .ms8263-brand strong{font-size:50px}
   #${ROOT} .ms8263-brand small{font-size:12px;margin-top:6px}
   #${ROOT} .ms8263-tag{right:20px;top:max(21px,env(safe-area-inset-top));font-size:23px}
   #${ROOT} .ms8263-nav{min-height:82px;padding:7px 5px 6px;border-radius:27px 27px 0 0}
   #${ROOT} .ms8263-nav button{min-height:64px;font-size:10.5px;gap:5px}
   #${ROOT} .ms8263-nav button svg{width:25px;height:25px}
   #${ROOT} .ms8263-main{padding:25px 18px max(30px,env(safe-area-inset-bottom))}
   #${ROOT} .ms8263-greet{margin-bottom:18px;gap:10px}
   #${ROOT} .ms8263-greet b{font-size:14px;letter-spacing:.13em}
   #${ROOT} .ms8263-date{font-size:13px}
   #${ROOT} .ms8263-theme{min-height:46px;padding:0 14px;font-size:14px}
   #${ROOT} .ms8263-status{gap:8px}
   #${ROOT} .ms8263-status-card{grid-template-columns:34px minmax(0,1fr);min-height:96px;padding:11px 9px}
   #${ROOT} .ms8263-status-card>svg{width:25px;height:25px}
   #${ROOT} .ms8263-status-card>small{font-size:9px;letter-spacing:.10em}
   #${ROOT} .ms8263-status-card>strong{font-size:15.5px}
   #${ROOT} .ms8263-status-card>em{font-size:9.5px}
   #${ROOT} .ms8263-welcome{padding:27px 20px 21px}
   #${ROOT} .ms8263-welcome h2{font-size:40px}
   #${ROOT} .ms8263-welcome p{font-size:15.5px;margin-top:15px}
   #${ROOT} .ms8263-metric{grid-template-columns:27px minmax(0,1fr);column-gap:7px;padding:12px 9px}
   #${ROOT} .ms8263-metric svg{width:23px;height:23px}
   #${ROOT} .ms8263-metric strong{font-size:14px}
   #${ROOT} .ms8263-metric small{font-size:9px}
   #${ROOT} .ms8263-start{min-height:67px;font-size:19px}
   #${ROOT} .ms8263-feature{grid-template-columns:43px minmax(0,1fr) 16px;min-height:112px;padding:15px 15px;gap:8px}
   #${ROOT} .ms8263-feature>svg{width:34px;height:34px}
   #${ROOT} .ms8263-feature .copy strong{font-size:17px}
   #${ROOT} .ms8263-feature .copy small{font-size:11px}
 }
 @media(max-width:390px){
   #${ROOT} .ms8263-main{padding-left:13px;padding-right:13px}
   #${ROOT} .ms8263-hero{min-height:385px}
   #${ROOT} .ms8263-brand strong{font-size:46px}
   #${ROOT} .ms8263-tag{font-size:21px}
   #${ROOT} .ms8263-status-card{grid-template-columns:29px minmax(0,1fr);padding-left:7px;padding-right:7px}
   #${ROOT} .ms8263-status-card>svg{width:22px;height:22px}
   #${ROOT} .ms8263-status-card>strong{font-size:14px}
   #${ROOT} .ms8263-welcome h2{font-size:36px}
   #${ROOT} .ms8263-feature{padding-left:12px;padding-right:12px}
 }
 @media(max-width:345px){
   #${ROOT} .ms8263-status{grid-template-columns:1fr}
   #${ROOT} .ms8263-status-card{min-height:76px;grid-template-columns:38px minmax(0,1fr)}
   #${ROOT} .ms8263-features{grid-template-columns:1fr}
 }
 @media(orientation:landscape) and (max-height:520px){
   #${ROOT} .ms8263-hero{min-height:300px;background-position:center 50%}
   #${ROOT} .ms8263-brand strong{font-size:45px}
   #${ROOT} .ms8263-tag{font-size:20px}
   #${ROOT} .ms8263-nav{min-height:72px}
   #${ROOT} .ms8263-nav button{min-height:56px}
   #${ROOT} .ms8263-main{padding-top:20px}
 }
 `;
 document.head.appendChild(s);
}

function syncBuild(){
 try{window.APP_BUILD=BUILD;window.MIJSERENITY_BUILD=BUILD}catch(_){}
 document.querySelector('meta[name="mijnserenity-build"]')?.setAttribute('content',BUILD);
 document.querySelector('meta[name="ms-build"]')?.setAttribute('content',BUILD);
 const stamp=$('buildStamp');if(stamp)stamp.textContent='v'+BUILD;
 const settings=$('settingsAppVersion');if(settings)settings.textContent=BUILD;
 document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
}

function setHomeActive(active){
 document.body.classList.toggle('ms8263-home-active',!!active);
}

function route(){
 try{return ((location.hash||'#dashboard').replace(/^#/,'').split(/[?&/]/)[0]||'dashboard').toLowerCase()}
 catch(_){return 'dashboard'}
}

function externalClick(target){
 const aliases=target==='planner'?['planner','route']:target==='map'?['map','waterkaarten']:[target];
 const root=$(ROOT);
 for(const name of aliases){
   const selectors=[`.tabs [data-target="${name}"]`,`.bottom-nav-item[data-target="${name}"]`,`[data-route="${name}"]`,`[data-target="${name}"]`];
   for(const selector of selectors){
     const el=[...document.querySelectorAll(selector)].find(node=>!root?.contains(node));
     if(el){el.click();return true}
   }
 }
 return false;
}

function closeMore(){rootQuery('.ms8263-sheet')?.classList.remove('open')}
function rootQuery(sel){return $(ROOT)?.querySelector(sel)||null}

function nav(target){
 if(!target)return;
 if(target==='dashboard'){
   try{history.replaceState(null,'',location.pathname+location.search+'#dashboard')}catch(_){}
   setHomeActive(true);apply();return;
 }
 if(target==='more'){
   try{if(typeof window.ms797OpenMore==='function'){window.ms797OpenMore();return}}catch(_){}
   rootQuery('.ms8263-sheet')?.classList.add('open');return;
 }
 closeMore();
 setHomeActive(false);
 try{history.replaceState(null,'',location.pathname+location.search+'#'+target)}catch(_){}
 try{if(typeof window.captainNavigate==='function'){window.captainNavigate(target);return}}catch(_){}
 if(externalClick(target))return;
 try{if(typeof window.navigateTo==='function'){window.navigateTo(target);return}}catch(_){}
 try{if(typeof window.showPage==='function'){window.showPage(target);return}}catch(_){}
}

function dateText(){try{return new Intl.DateTimeFormat('nl-NL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date())}catch(_){return ''}}
function greeting(){const h=new Date().getHours();return h<12?'Goedemorgen':h<18?'Goedemiddag':'Goedenavond'}
function metric(ic,id,label){return `<div class="ms8263-metric">${icon[ic]}<strong id="${id}">—</strong><small>${label}</small></div>`}
function status(target,ic,label,id,sub){return `<button type="button" class="ms8263-status-card" data-ms8263-go="${target}">${icon[ic]}<small>${label}</small><strong id="${id}">—</strong><em id="${sub}"></em></button>`}
function feature(target,ic,title,sub,tone){return `<button type="button" class="ms8263-feature ${tone}" data-ms8263-go="${target}">${icon[ic]}<span class="copy"><strong>${title}</strong><small>${sub}</small></span><span class="chev">${icon.chev}</span></button>`}

function clean(v){return String(v??'').replace(/\s+/g,' ').trim()}
function sourceText(ids){
 for(const id of ids){const el=$(id);const t=clean(el?.textContent);if(t&&t!=='—'&&t!=='–')return t}
 return '';
}
function numberFrom(v){const m=String(v||'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):NaN}
function setText(id,value){const el=$(id);if(el&&value!==undefined&&value!==null)el.textContent=String(value)}
function fmtNum(n,d=1){return Number.isFinite(n)?n.toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d}):''}

function refreshData(){
 const kmhText=sourceText(['ms71510Speed','liveSpeed','speedValue','currentSpeed']);
 const kmh=numberFrom(kmhText);
 const kn=Number.isFinite(kmh)?kmh/1.852:NaN;
 setText('ms8263Speed',Number.isFinite(kn)?`${fmtNum(kn,kn<1?1:0)} kn`:'0 kn');

 const depth=sourceText(['ms71510Depth','liveDepth','depthValue']);
 const depthN=numberFrom(depth);
 setText('ms8263Depth',Number.isFinite(depthN)?`${fmtNum(depthN,1)} m`:'Geen meting');

 const wind=sourceText(['ms71510WindBft','ms71510Wind','liveWind','windValue']);
 const windN=numberFrom(wind);
 setText('ms8263Wind',Number.isFinite(windN)?clean(wind):'Geen meting');

 const soc=sourceText(['ms71510HouseSoc','houseSoc','batterySoc','victronSoc']);
 const socN=numberFrom(soc);
 setText('ms8263Soc',Number.isFinite(socN)?`${Math.round(socN)}%`:'—%');
 const volt=sourceText(['ms71510HouseVoltage','liveHouseVoltage','houseVoltage']);
 const amp=sourceText(['ms71510HouseCurrent','houseCurrent','batteryCurrent']);
 const vN=numberFrom(volt),aN=numberFrom(amp);
 setText('ms8263BatterySub',[Number.isFinite(vN)?`${fmtNum(vN,1)} V`:'',Number.isFinite(aN)?`${fmtNum(aN,1)} A`:''].filter(Boolean).join(' · ')||'Geen live data');

 const temp=sourceText(['outsideTemperature','weatherTemperature','weatherCurrentTemp','currentTemperature','msWeatherTemperature']);
 const tN=numberFrom(temp);
 setText('ms8263Outside',Number.isFinite(tN)?`${fmtNum(tN,0)}°`:'—°');
 setText('ms8263OutsideSub',Number.isFinite(tN)?'Actuele meting':'Geen data');
 }

function startGps(){
 const val=$('ms8263Location'),sub=$('ms8263LocationSub');
 if(!val||!sub)return;
 if(!navigator.geolocation){val.textContent='GPS niet beschikbaar';sub.textContent='Locatie niet ondersteund';return}
 val.textContent='GPS zoeken…';sub.textContent='Positie wordt bepaald';
 navigator.geolocation.getCurrentPosition(pos=>{
   val.textContent='GPS actief';
   sub.textContent=`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
 },()=>{
   val.textContent='GPS wachten';sub.textContent='Locatie nog niet beschikbaar';
 },{enableHighAccuracy:false,timeout:7000,maximumAge:60000});
}

function bind(){
 const root=$(ROOT);if(!root)return;
 root.querySelectorAll('[data-ms8263-go]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.ms8263Go)));
 $('ms8263Theme')?.addEventListener('click',()=>{
   const day=root.dataset.theme==='day';root.dataset.theme=day?'night':'day';
   const label=$('ms8263ThemeLabel');if(label)label.textContent=day?'Nacht':'Dag';
 });
 rootQuery('.ms8263-sheet')?.addEventListener('click',e=>{if(e.target.classList.contains('ms8263-sheet'))closeMore()});
 rootQuery('.ms8263-sheet-close')?.addEventListener('click',closeMore);
}

function apply(){
 const root=$(ROOT);if(!root)return false;
 installStyle();syncBuild();setHomeActive(true);
 root.className='ms8255-reference-home ms8263-approved-home';
 root.dataset.approved='8263';root.dataset.theme='night';
 root.innerHTML=`<div class="ms8263-shell">
 <section class="ms8263-hero" aria-label="Serenity Haven dashboard">
   <div class="ms8263-brand"><strong>Serenity</strong><small>VriJon Contessa 37E</small></div>
   <div class="ms8263-tag">Explore<br>Navigate<br>Enjoy</div>
   <nav class="ms8263-nav" aria-label="Hoofdnavigatie">
     <button class="active" data-ms8263-go="dashboard">${icon.home}<span>Haven</span></button>
     <button data-ms8263-go="map">${icon.map}<span>Kaart</span></button>
     <button data-ms8263-go="planner">${icon.route}<span>Reisplanner</span></button>
     <button data-ms8263-go="ais">${icon.radar}<span>AIS</span></button>
     <button data-ms8263-go="weather">${icon.sun}<span>Weer</span></button>
     <button data-ms8263-go="more">${icon.more}<span>Meer</span></button>
   </nav>
 </section>
 <main class="ms8263-main">
   <section class="ms8263-greet"><div><b>${greeting()} 👋</b><div class="ms8263-date">${dateText()}</div></div><button type="button" class="ms8263-theme" id="ms8263Theme">${icon.moon}<span id="ms8263ThemeLabel">Nacht</span><span>⌄</span></button></section>
   <section class="ms8263-status">
     ${status('map','pin','Ligplaats','ms8263Location','ms8263LocationSub')}
     ${status('weather','cloud','Buiten','ms8263Outside','ms8263OutsideSub')}
     ${status('technical','battery','Accu','ms8263Soc','ms8263BatterySub')}
   </section>
   <section class="ms8263-welcome">
     <span class="ms8263-kicker">Welkom terug</span>
     <h2>Welkom terug<br>aan boord!</h2>
     <p>De Serenity ligt klaar.<br>Waar brengt de volgende reis je naartoe?</p>
     <div class="ms8263-live">${metric('speed','ms8263Speed','Snelheid')}${metric('depth','ms8263Depth','Diepte')}${metric('compass','ms8263Wind','Wind')}</div>
     <button type="button" class="ms8263-start" data-ms8263-go="live">${icon.play}<span>Start live varen</span><span class="chev">${icon.chev}</span></button>
   </section>
   <section class="ms8263-features">
     ${feature('map','map','Kaart','Waterkaarten & navigatie','blue')}
     ${feature('planner','route','Reisplanner','Plan je route & bekijk reistijd','purple')}
     ${feature('ais','radar','AIS','Schepen in de omgeving','green')}
     ${feature('weather','sun','Weer','Actuele weersinfo & voorspellingen','gold')}
   </section>
 </main>
 <div class="ms8263-sheet" aria-hidden="true"><div class="ms8263-sheet-card"><div class="ms8263-sheet-head"><strong>Meer</strong><button class="ms8263-sheet-close" aria-label="Sluiten">${icon.close}</button></div><div class="ms8263-sheet-grid"><button data-ms8263-go="live">Live varen</button><button data-ms8263-go="technical">Techniek</button><button data-ms8263-go="pois">POI's</button><button data-ms8263-go="logbook">Logboek</button><button data-ms8263-go="costs">Kosten</button><button data-ms8263-go="settings">Instellingen</button></div></div></div>
 </div>`;
 bind();refreshData();startGps();
 clearInterval(window.__ms8263RefreshTimer);
 window.__ms8263RefreshTimer=setInterval(refreshData,2000);
 return true;
}

window.ms8263ApplyApprovedDashboard=apply;
window.ms8260ApplyApprovedDashboard=apply;
window.ms8263Navigate=nav;

function start(){if(route()==='dashboard'){if(!apply())setTimeout(start,80)}else setHomeActive(false)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('pageshow',()=>{if(route()==='dashboard')setTimeout(apply,20)},{passive:true});
window.addEventListener('hashchange',()=>{if(route()==='dashboard')setTimeout(apply,30);else setHomeActive(false)},{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&route()==='dashboard')refreshData()},{passive:true});
})();