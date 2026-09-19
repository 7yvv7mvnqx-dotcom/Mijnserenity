/* MijnSerenity 8.28.1 — landscape startdashboard
   Belangrijkste bediening in één iPad-landscape scherm.
   Minder gebruikte functies, waaronder Live varen, staan onder Meer. */
(()=>{
'use strict';
if(window.__msApprovedDashboard8280)return;
window.__msApprovedDashboard8280=true;
window.__msApprovedDashboard8263=true;
window.__msApprovedDashboard8260=true;

const BUILD='8.28.1';
const TOKEN='828100';
const ROOT='ms8210Start';
const STYLE='ms8281LandscapeStyle';
const $=id=>document.getElementById(id);

const icon={
 home:'<svg viewBox="0 0 24 24"><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
 map:'<svg viewBox="0 0 24 24"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/></svg>',
 route:'<svg viewBox="0 0 24 24"><circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 5h4a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h7"/></svg>',
 radar:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"/><path d="M4.2 19.8a11 11 0 0 1 15.6-15.6M7 17a7 7 0 0 1 10-10M12 12l7-7"/></svg>',
 sun:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
 pin:'<svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.4"/></svg>',
 cloud:'<svg viewBox="0 0 24 24"><path d="M6 18h11a4 4 0 0 0 .5-8 6 6 0 0 0-11.3-1.5A4.7 4.7 0 0 0 6 18Z"/></svg>',
 battery:'<svg viewBox="0 0 24 24"><rect x="3" y="7" width="17" height="10" rx="2"/><path d="M20 10h2v4h-2"/></svg>',
 log:'<svg viewBox="0 0 24 24"><rect x="5" y="3" width="15" height="18" rx="2"/><path d="M8 3v18M11 8h6M11 12h6M11 16h4M3 7h4M3 12h4M3 17h4"/></svg>',
 gear:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1A1.7 1.7 0 0 0 4.6 15 1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9A1.7 1.7 0 0 0 21 10h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>',
 more:'<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
 close:'<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
 moon:'<svg viewBox="0 0 24 24"><path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.7 8.7 0 1 0 11.2 11.2Z"/></svg>',
 speed:'<svg viewBox="0 0 24 24"><path d="M4 17a8 8 0 1 1 16 0"/><path d="m12 14 4-4"/><circle cx="12" cy="14" r="1.4"/></svg>',
 depth:'<svg viewBox="0 0 24 24"><path d="M12 3v14"/><path d="m8 13 4 4 4-4"/><path d="M4 20c2-1 4-1 6 0s4 1 6 0 3-1 4-.5"/></svg>',
 compass:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z"/></svg>'
};

function installStyle(){
 if($(STYLE))return;
 ['ms8260ApprovedStyle','ms8263ApprovedStyle','ms8265DashboardButtonsStyle'].forEach(id=>$(id)?.remove());
 const s=document.createElement('style');s.id=STYLE;
 s.textContent=`
 :root{--ms8280-cyan:#25d8ff;--ms8280-bg:#03131f;--ms8280-panel:#062538;--ms8280-line:rgba(76,190,233,.30);--ms8280-muted:#91aaba}
 body.ms8263-home-active{background:#03131f!important;overflow:hidden!important;overscroll-behavior:none!important}
 body.ms8263-home-active #appView>.tabs,body.ms8263-home-active>.bottom-nav,body.ms8263-home-active #appView>.bottom-nav{display:none!important}
 #dashboard.ms8255-reference-dashboard{padding:0!important;margin:0!important;max-width:none!important;background:#03131f!important;overflow:hidden!important}
 #${ROOT}{display:block!important;width:100vw!important;height:100dvh!important;min-height:0!important;margin-left:calc(50% - 50vw)!important;padding:0!important;background:#03131f!important;color:#fff!important;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;overflow:hidden!important;-webkit-font-smoothing:antialiased}
 #${ROOT} *{box-sizing:border-box}
 #${ROOT} button{font:inherit;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
 #${ROOT} svg{display:block;width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}

 #${ROOT} .ms8263-shell{display:grid;grid-template-columns:208px minmax(0,1fr);grid-template-rows:236px minmax(0,1fr);width:100%;height:100%;background:linear-gradient(145deg,#06283b 0,#03131f 55%,#020d16 100%);overflow:hidden}
 #${ROOT} .ms8280-side{grid-row:1/3;grid-column:1;display:flex;flex-direction:column;min-height:0;padding:22px 12px 15px;border-right:1px solid rgba(76,190,233,.20);background:linear-gradient(180deg,#06304a 0,#031522 46%,#02101b 100%)}
 #${ROOT} .ms8280-logo{padding:1px 10px 19px;text-align:center}
 #${ROOT} .ms8280-logo strong{display:block;font-family:Georgia,"Times New Roman",serif;font-size:37px;font-style:italic;font-weight:500;letter-spacing:-.05em}
 #${ROOT} .ms8280-logo small{display:block;margin-top:4px;color:#8dcde4;font-size:8px;font-weight:850;letter-spacing:.19em;text-transform:uppercase}
 #${ROOT} .ms8263-nav{display:flex!important;position:static!important;flex:1;min-height:0!important;padding:0!important;overflow-y:auto!important;overflow-x:hidden!important;flex-direction:column!important;gap:3px!important;background:none!important;border:0!important;border-radius:0!important;backdrop-filter:none!important;scrollbar-width:none}
 #${ROOT} .ms8263-nav::-webkit-scrollbar{display:none}
 #${ROOT} .ms8263-nav button{display:grid!important;grid-template-columns:28px 1fr!important;align-items:center!important;justify-items:start!important;gap:12px!important;flex:none!important;width:100%!important;min-width:0!important;min-height:47px!important;padding:0 12px!important;border:1px solid transparent!important;border-radius:12px!important;background:transparent!important;color:#e9f4f8!important;font-size:13px!important;font-weight:750!important;cursor:pointer}
 #${ROOT} .ms8263-nav button svg{width:22px!important;height:22px!important}
 #${ROOT} .ms8263-nav button.active{color:#29dbff!important;background:linear-gradient(90deg,rgba(22,187,226,.20),rgba(6,48,69,.44))!important;border-color:rgba(39,209,246,.24)!important}
 #${ROOT} .ms8263-nav button.active:after{display:none!important}
 #${ROOT} .ms8280-side-foot{padding:10px 7px 0;border-top:1px solid rgba(255,255,255,.06);text-align:center;color:#8ca7b6;font-size:9px;line-height:1.35}
 #${ROOT} .ms8280-side-foot strong{display:block;color:#e8f4f7;font-size:14px;margin-bottom:1px}

 #${ROOT} .ms8263-hero{grid-column:2;grid-row:1;position:relative;min-height:0!important;background:url('/serenity-ivms-hero.png?v=${TOKEN}') center 50%/cover no-repeat!important;isolation:isolate;overflow:hidden}
 #${ROOT} .ms8263-hero:after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(1,15,25,.52) 0,rgba(1,15,25,.08) 42%,rgba(1,15,25,.16) 72%,rgba(1,15,25,.55) 100%)}
 #${ROOT} .ms8280-hero-copy{position:absolute;left:28px;bottom:23px;text-shadow:0 3px 18px rgba(0,0,0,.55)}
 #${ROOT} .ms8280-hero-copy strong{display:block;font-size:24px;line-height:1.05}
 #${ROOT} .ms8280-hero-copy span{display:block;margin-top:5px;color:#dcebf0;font-size:13px;font-weight:650}
 #${ROOT} .ms8280-clock{position:absolute;right:27px;top:20px;text-align:right;text-shadow:0 3px 15px rgba(0,0,0,.60)}
 #${ROOT} .ms8280-clock small{display:block;color:#e4eff3;font-size:11px;font-weight:760}
 #${ROOT} .ms8280-clock strong{display:block;margin-top:2px;font-size:31px;line-height:1}
 #${ROOT} .ms8280-clock span{display:block;margin-top:7px;font-size:13px;font-weight:800}\n #${ROOT} .ms8280-clock em{display:block;margin-top:4px;color:#d7e8ee;font-size:10px;font-style:normal;font-weight:650}

 #${ROOT} .ms8263-main{grid-column:2;grid-row:2;display:flex!important;flex-direction:column!important;min-height:0;padding:12px 18px 13px!important;background:linear-gradient(180deg,rgba(3,25,38,.98),#03131f 82%)!important;overflow:auto!important;overscroll-behavior:contain}
 #${ROOT} .ms8263-greet{display:none!important}
 #${ROOT} .ms8263-greet b{display:block;font-size:13px;letter-spacing:.12em;text-transform:uppercase}
 #${ROOT} .ms8263-date{margin-top:2px;color:#8faac0;font-size:11px;font-weight:650}
 #${ROOT} .ms8263-theme{display:flex;align-items:center;gap:7px;min-height:34px;padding:0 11px;border:1px solid var(--ms8280-line);border-radius:999px;background:rgba(5,36,53,.72);color:#fff;font-size:11px;font-weight:800;cursor:pointer}
 #${ROOT} .ms8263-theme svg{width:16px;height:16px;color:#25d8ff;fill:#25d8ff;stroke:#25d8ff}

 #${ROOT} .ms8280-quick{order:1;margin-bottom:11px;padding:12px 12px 13px;border:1px solid rgba(76,190,233,.28);border-radius:18px;background:rgba(2,24,37,.78)}
 #${ROOT} .ms8280-section-title{display:flex;align-items:center;justify-content:space-between;margin:0 4px 10px}
 #${ROOT} .ms8280-section-title strong{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#edf7fa}
 #${ROOT} .ms8280-section-title button{padding:0;border:0;background:transparent;color:#31d9f7;font-size:10px}
 #${ROOT} .ms8263-features{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:10px!important;margin:0!important}
 #${ROOT} .ms8263-feature{display:flex!important;min-width:0!important;min-height:116px!important;padding:12px 8px 10px!important;border:1px solid rgba(108,215,248,.38)!important;border-radius:15px!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:6px!important;color:#fff!important;text-align:center!important;cursor:pointer!important;box-shadow:inset 0 1px rgba(255,255,255,.10),0 8px 20px rgba(0,0,0,.16)!important}
 #${ROOT} .ms8263-feature>svg{width:34px!important;height:34px!important;stroke-width:2!important}
 #${ROOT} .ms8263-feature .copy{min-width:0}
 #${ROOT} .ms8263-feature .copy strong{display:block;font-size:14px;line-height:1.08}
 #${ROOT} .ms8263-feature .copy small{display:block;margin-top:4px;color:#d5e7ed;font-size:9px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 #${ROOT} .ms8263-feature .chev{display:grid;place-items:center;width:28px;height:28px;margin-top:2px;border:1px solid rgba(255,255,255,.28);border-radius:50%;background:rgba(255,255,255,.12);font-size:21px;line-height:1}
 #${ROOT} .ms8263-feature.blue{background:linear-gradient(145deg,#0a75a5,#075074)!important}
 #${ROOT} .ms8263-feature.cyan{background:linear-gradient(145deg,#0b8798,#075765)!important}
 #${ROOT} .ms8263-feature.orange{background:linear-gradient(145deg,#b85a12,#74390c)!important}
 #${ROOT} .ms8263-feature.purple{background:linear-gradient(145deg,#6a4694,#472b6a)!important}
 #${ROOT} .ms8263-feature.green{background:linear-gradient(145deg,#078574,#05594f)!important}
 #${ROOT} .ms8263-feature.navy{background:linear-gradient(145deg,#0a5e8f,#073f62)!important}

 #${ROOT} .ms8263-status{order:2;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important;margin:0 0 9px!important}
 #${ROOT} .ms8263-status-card{display:grid!important;grid-template-columns:32px minmax(0,1fr)!important;grid-template-areas:"ic lab" "ic val" "ic sub"!important;align-items:center!important;min-width:0!important;min-height:72px!important;padding:9px 11px!important;border:1px solid rgba(79,199,241,.30)!important;border-radius:15px!important;background:linear-gradient(145deg,rgba(7,54,78,.92),rgba(3,31,48,.82))!important;color:#fff!important;text-align:left!important;cursor:pointer!important}
 #${ROOT} .ms8263-status-card>svg{grid-area:ic;width:22px;height:22px}
 #${ROOT} .ms8263-status-card>small{grid-area:lab;color:#91aebd;font-size:8px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
 #${ROOT} .ms8263-status-card>strong{grid-area:val;margin-top:1px;font-size:15px;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
 #${ROOT} .ms8263-status-card>em{grid-area:sub;margin-top:3px;color:#9fb6c2;font-size:8.5px;font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

 #${ROOT} #ms8264LiveInstruments{order:3;margin:0 0 9px!important;padding:9px 10px 10px!important;border-radius:16px!important}
 #${ROOT} #ms8264LiveInstruments .ms8264-head{margin-bottom:7px!important}
 #${ROOT} #ms8264LiveInstruments .ms8264-head small{font-size:8px!important}
 #${ROOT} #ms8264LiveInstruments .ms8264-head strong{font-size:14px!important}
 #${ROOT} #ms8264LiveInstruments .ms8264-badge{font-size:8px!important;padding:5px 7px!important}
 #${ROOT} #ms8264LiveInstruments .ms8264-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:7px!important}
 #${ROOT} #ms8264LiveInstruments .ms8264-meter{min-height:64px!important;padding:8px!important;border-radius:13px!important;grid-template-columns:27px minmax(0,1fr)!important;gap:6px!important}
 #${ROOT} #ms8264LiveInstruments .ms8264-grid>.ms8264-meter:nth-child(n+5){display:none!important}
 #${ROOT} #ms8264LiveInstruments .ms8264-icon{width:27px!important;height:27px!important;font-size:15px!important;border-radius:9px!important}
 #${ROOT} #ms8264LiveInstruments .ms8264-copy small{font-size:7px!important}
 #${ROOT} #ms8264LiveInstruments .ms8264-copy strong{font-size:14px!important}
 #${ROOT} #ms8264LiveInstruments .ms8264-copy em{font-size:7px!important;margin-top:2px!important}
 #${ROOT} #ms8264LiveInstruments .ms8264-bar{height:2px!important;margin-top:4px!important}

 #${ROOT} .ms8263-welcome{order:4;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;overflow:visible!important}
 #${ROOT} .ms8263-welcome:before,#${ROOT} .ms8263-welcome:after{display:none!important}
 #${ROOT} .ms8280-ai-label{display:none}
 #${ROOT} .ms8263-start{display:none!important}
 #${ROOT} .msqa8267{margin:0!important;padding:8px 10px!important;border:1px solid rgba(75,195,235,.28)!important;border-radius:16px!important;background:linear-gradient(145deg,rgba(3,34,50,.96),rgba(2,21,33,.96))!important}
 #${ROOT} .msqa8267-label{margin:0 0 5px!important;font-size:9px!important}
 #${ROOT} .msqa8267-row{min-height:47px!important;border-radius:13px!important}
 #${ROOT} .msqa8267 input{height:40px!important;font-size:12px!important}
 #${ROOT} .msqa8267-examples{display:none!important}
 #${ROOT} .msqa8267-result{font-size:10px!important;max-height:76px!important;overflow:auto!important}

 #${ROOT} .ms8280-live-mini{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:0 0 8px}
 #${ROOT} .ms8263-metric{display:grid;grid-template-columns:21px minmax(0,1fr);grid-template-areas:"ic val" "ic lab";align-items:center;gap:2px 6px;min-width:0;padding:7px 9px;border:1px solid rgba(79,199,241,.22);border-radius:12px;background:rgba(3,29,44,.62)}
 #${ROOT} .ms8263-metric svg{grid-area:ic;width:18px;height:18px}
 #${ROOT} .ms8263-metric strong{grid-area:val;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 #${ROOT} .ms8263-metric small{grid-area:lab;color:#8faab9;font-size:7.5px}

 #${ROOT} .ms8263-sheet{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,9,16,.66);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
 #${ROOT} .ms8263-sheet.open{display:flex}
 #${ROOT} .ms8263-sheet-card{width:min(520px,92vw);padding:17px;border:1px solid rgba(92,204,244,.31);border-radius:22px;background:#062234;box-shadow:0 24px 80px rgba(0,0,0,.48)}
 #${ROOT} .ms8263-sheet-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
 #${ROOT} .ms8263-sheet-head strong{font-size:18px}
 #${ROOT} .ms8263-sheet-close{width:42px;height:42px;display:grid;place-items:center;border:1px solid rgba(119,210,244,.22);border-radius:50%;background:#082c42;color:#fff}
 #${ROOT} .ms8263-sheet-close svg{width:20px;height:20px}
 #${ROOT} .ms8263-sheet-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
 #${ROOT} .ms8263-sheet-grid button{min-height:56px;border:1px solid rgba(119,210,244,.20);border-radius:14px;background:#082a40;color:#fff;font-weight:750}

 #${ROOT}[data-theme="day"] .ms8263-main{filter:brightness(1.08) saturate(.94)}
 #${ROOT}[data-theme="day"] .ms8263-theme svg{fill:none}

 @media(max-width:900px) and (orientation:portrait){
   body.ms8263-home-active{overflow:auto!important}
   #${ROOT}{height:auto!important;min-height:100dvh!important;overflow:auto!important}
   #${ROOT} .ms8263-shell{display:block;min-height:100dvh;height:auto}
   #${ROOT} .ms8280-side{display:none}
   #${ROOT} .ms8263-hero{height:250px}
   #${ROOT} .ms8263-main{overflow:visible!important;padding:14px!important}
   #${ROOT} .ms8263-features{grid-template-columns:repeat(3,minmax(0,1fr))!important}
   #${ROOT} #ms8264LiveInstruments .ms8264-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 }
 @media(max-height:760px) and (orientation:landscape){
   #${ROOT} .ms8263-shell{grid-template-columns:188px minmax(0,1fr);grid-template-rows:205px minmax(0,1fr)}
   #${ROOT} .ms8280-side{padding-top:13px}
   #${ROOT} .ms8280-logo{padding-bottom:10px}
   #${ROOT} .ms8280-logo strong{font-size:31px}
   #${ROOT} .ms8263-nav button{min-height:40px!important;font-size:11px!important}
   #${ROOT} .ms8263-nav button svg{width:19px!important;height:19px!important}
   #${ROOT} .ms8280-hero-copy{bottom:16px}
   #${ROOT} .ms8280-clock{top:14px}
   #${ROOT} .ms8263-main{padding:8px 11px!important}
   #${ROOT} .ms8263-greet{margin-bottom:6px!important}
   #${ROOT} .ms8280-quick{padding:9px 10px 10px;margin-bottom:8px}
   #${ROOT} .ms8263-feature{min-height:96px!important;padding-top:9px!important;padding-bottom:8px!important}
   #${ROOT} .ms8263-status{margin-bottom:6px!important}
   #${ROOT} .ms8263-status-card{min-height:61px!important;padding:6px 8px!important}
   #${ROOT} #ms8264LiveInstruments{padding:7px 8px!important;margin-bottom:6px!important}
   #${ROOT} #ms8264LiveInstruments .ms8264-meter{min-height:54px!important;padding:6px!important}
   #${ROOT} .msqa8267{padding:6px 8px!important}
   #${ROOT} .msqa8267-row{min-height:42px!important}
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

function route(){try{return((location.hash||'#dashboard').replace(/^#/,'').split(/[?&/]/)[0]||'dashboard').toLowerCase()}catch(_){return'dashboard'}}
function setHomeActive(active){document.body.classList.toggle('ms8263-home-active',!!active)}
function rootQuery(sel){return $(ROOT)?.querySelector(sel)||null}
function closeMore(){rootQuery('.ms8263-sheet')?.classList.remove('open')}

function externalClick(target){
 const aliases=target==='planner'?['planner','route']:target==='map'?['map','waterkaarten']:[target];
 const root=$(ROOT);
 for(const name of aliases){
   for(const selector of [`.tabs [data-target="${name}"]`,`.bottom-nav-item[data-target="${name}"]`,`[data-route="${name}"]`,`[data-target="${name}"]`]){
     const el=[...document.querySelectorAll(selector)].find(node=>!root?.contains(node));
     if(el){el.click();return true}
   }
 }
 return false;
}
function nav(target){
 if(!target)return;
 if(target==='dashboard'){
   try{history.replaceState(null,'',location.pathname+location.search+'#dashboard')}catch(_){}
   setHomeActive(true);apply();return;
 }
 if(target==='more'){rootQuery('.ms8263-sheet')?.classList.add('open');return}
 closeMore();setHomeActive(false);
 try{history.replaceState(null,'',location.pathname+location.search+'#'+target)}catch(_){}
 try{if(typeof window.captainNavigate==='function'){window.captainNavigate(target);return}}catch(_){}
 if(externalClick(target))return;
 try{if(typeof window.navigateTo==='function'){window.navigateTo(target);return}}catch(_){}
 try{if(typeof window.showPage==='function'){window.showPage(target)}}catch(_){}
}

function dateText(){try{return new Intl.DateTimeFormat('nl-NL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date())}catch(_){return''}}
function shortDate(){try{return new Intl.DateTimeFormat('nl-NL',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(new Date())}catch(_){return''}}
function greeting(){const h=new Date().getHours();return h<12?'Goedemorgen':h<18?'Goedemiddag':'Goedenavond'}
function metric(ic,id,label){return `<div class="ms8263-metric">${icon[ic]}<strong id="${id}">—</strong><small>${label}</small></div>`}
function status(target,ic,label,id,sub){return `<button type="button" class="ms8263-status-card" data-ms8263-go="${target}">${icon[ic]}<small>${label}</small><strong id="${id}">—</strong><em id="${sub}"></em></button>`}
function feature(target,ic,title,sub,tone){return `<button type="button" class="ms8263-feature ${tone}" data-ms8263-go="${target}">${icon[ic]}<span class="copy"><strong>${title}</strong><small>${sub}</small></span><span class="chev">›</span></button>`}

function clean(v){return String(v??'').replace(/\s+/g,' ').trim()}
function sourceText(ids){for(const id of ids){const t=clean($(id)?.textContent);if(t&&t!=='—'&&t!=='–')return t}return''}
function numberFrom(v){const m=String(v||'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):NaN}
function setText(id,value){const el=$(id);if(el&&value!==undefined&&value!==null)el.textContent=String(value)}
function fmtNum(n,d=1){return Number.isFinite(n)?n.toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d}):''}

function refreshData(){
 const kmh=numberFrom(sourceText(['ms71510Speed','liveSpeed','speedValue','currentSpeed']));
 const kn=Number.isFinite(kmh)?kmh/1.852:NaN;
 setText('ms8263Speed',Number.isFinite(kn)?`${fmtNum(kn,kn<1?1:0)} kn`:'0 kn');
 const depthN=numberFrom(sourceText(['ms71510Depth','liveDepth','depthValue']));
 setText('ms8263Depth',Number.isFinite(depthN)?`${fmtNum(depthN,1)} m`:'Geen meting');
 const wind=sourceText(['ms71510WindBft','ms71510Wind','liveWind','windValue']);
 setText('ms8263Wind',Number.isFinite(numberFrom(wind))?clean(wind):'Geen meting');

 const soc=sourceText(['ms8264House','ms71510HouseSoc','houseSoc','batterySoc','victronSoc']);
 const socN=numberFrom(soc);
 setText('ms8263Soc',Number.isFinite(socN)?`${Math.round(socN)}%`:'—%');
 const volt=sourceText(['ms71510HouseVoltage','liveHouseVoltage','houseVoltage']);
 const amp=sourceText(['ms71510HouseCurrent','houseCurrent','batteryCurrent']);
 const vN=numberFrom(volt),aN=numberFrom(amp);
 setText('ms8263BatterySub',[Number.isFinite(vN)?`${fmtNum(vN,2)} V`:'',Number.isFinite(aN)?`${aN>0?'+':''}${fmtNum(aN,1)} A`:''].filter(Boolean).join(' · ')||'Live via Victron');

 const temp=sourceText(['ms8264Outside','outsideTemperature','weatherTemperature','weatherCurrentTemp','currentTemperature','msWeatherTemperature']);
 const tN=numberFrom(temp);
 setText('ms8263Outside',Number.isFinite(tN)?`${fmtNum(tN,1)}°`:'—°');
 setText('ms8263OutsideSub',Number.isFinite(tN)?'Actueel weer':'Weer laden…');\n setText('ms8280HeroTemp',Number.isFinite(tN)?`${fmtNum(tN,1)}° · actueel`:'Serenity');
}

function startGps(){
 const val=$('ms8263Location'),sub=$('ms8263LocationSub');
 if(!val||!sub)return;
 if(!navigator.geolocation){val.textContent='GPS niet beschikbaar';sub.textContent='Locatie niet ondersteund';return}
 val.textContent='GPS zoeken…';sub.textContent='Positie wordt bepaald';
 navigator.geolocation.getCurrentPosition(pos=>{
   val.textContent='GPS actief';
   sub.textContent=`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;\n   setText('ms8280HeroLocation',`${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`);
 },()=>{
   val.textContent='GPS wachten';sub.textContent='Locatie nog niet beschikbaar';
 },{enableHighAccuracy:false,timeout:7000,maximumAge:60000});
}

function updateClock(){
 setText('ms8280Clock',new Intl.DateTimeFormat('nl-NL',{hour:'2-digit',minute:'2-digit'}).format(new Date()));
 setText('ms8280HeroDate',shortDate());
 setText('ms8280Greeting',greeting()+' Michel');
}

function bind(){
 const root=$(ROOT);if(!root)return;
 root.querySelectorAll('[data-ms8263-go]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.ms8263Go)));
 $('ms8263Theme')?.addEventListener('click',()=>{
   const day=root.dataset.theme==='day';root.dataset.theme=day?'night':'day';
   setText('ms8263ThemeLabel',day?'Nacht':'Dag');
 });
 rootQuery('.ms8263-sheet')?.addEventListener('click',e=>{if(e.target.classList.contains('ms8263-sheet'))closeMore()});
 rootQuery('.ms8263-sheet-close')?.addEventListener('click',closeMore);
}

function apply(){
 const root=$(ROOT);if(!root)return false;
 installStyle();syncBuild();setHomeActive(true);
 root.className='ms8255-reference-home ms8263-approved-home';
 root.dataset.approved='8280';root.dataset.theme='night';
 root.innerHTML=`<div class="ms8263-shell">
 <aside class="ms8280-side">
   <div class="ms8280-logo"><strong>Serenity</strong><small>My boat · my freedom</small></div>
   <nav class="ms8263-nav" aria-label="Hoofdnavigatie">
     <button class="active" data-ms8263-go="dashboard">${icon.home}<span>Home</span></button>
     <button data-ms8263-go="live">${icon.route}<span>Varen</span></button>
     <button data-ms8263-go="map">${icon.map}<span>Kaart</span></button>
     <button data-ms8263-go="logbook">${icon.log}<span>Logboek</span></button>
     <button data-ms8263-go="technical">${icon.gear}<span>Techniek</span></button>
     <button data-ms8263-go="weather">${icon.sun}<span>Weer</span></button>
     <button data-ms8263-go="planner">${icon.route}<span>Reisplanner</span></button>
     <button data-ms8263-go="ais">${icon.radar}<span>AIS</span></button>
     <button data-ms8263-go="pois">${icon.pin}<span>POI</span></button>
     <button data-ms8263-go="settings">${icon.gear}<span>Instellingen</span></button>
   </nav>
   <div class="ms8280-side-foot"><strong>Serenity</strong>Varen is leven</div>
 </aside>

 <section class="ms8263-hero" aria-label="Serenity">
   <div class="ms8280-hero-copy"><strong id="ms8280Greeting">${greeting()} Michel</strong><span>Fijn dat je weer aan boord bent</span></div>
   <div class="ms8280-clock"><small id="ms8280HeroDate">${shortDate()}</small><strong id="ms8280Clock">--:--</strong><span id="ms8280HeroTemp">Serenity</span><em id="ms8280HeroLocation">GPS locatie</em></div>
 </section>

 <main class="ms8263-main">
   <section class="ms8263-greet">
     <div><b>Startoverzicht</b><div class="ms8263-date">${dateText()}</div></div>
     <button type="button" class="ms8263-theme" id="ms8263Theme">${icon.moon}<span id="ms8263ThemeLabel">Nacht</span></button>
   </section>

   <section class="ms8280-quick">
     <div class="ms8280-section-title"><strong>Snel naar</strong><button type="button" data-ms8263-go="settings">Bewerk ✎</button></div>
     <section class="ms8263-features">
       ${feature('technical','battery','Energie','Accu's & laden','green')}
       ${feature('technical','cloud','Tanks','Water, diesel, vuilwater','cyan')}
       ${feature('technical','gear','Techniek','Motor, verwarming, systemen','orange')}
       ${feature('map','map','Kaart','Waterkaarten & navigatie','purple')}
       ${feature('logbook','log','Logboek','Nieuwe logregel','navy')}
       ${feature('planner','route','Reisplanner','Plan je volgende trip','green')}
     </section>
   </section>

   <section class="ms8263-status">
     ${status('map','pin','Ligplaats','ms8263Location','ms8263LocationSub')}
     ${status('weather','cloud','Buiten','ms8263Outside','ms8263OutsideSub')}
     ${status('technical','battery','Accu','ms8263Soc','ms8263BatterySub')}
   </section>

   <section class="ms8263-welcome" aria-label="Serenity AI">
     <div class="ms8280-live-mini">${metric('speed','ms8263Speed','Snelheid')}${metric('depth','ms8263Depth','Diepte')}${metric('compass','ms8263Wind','Wind')}</div>
     <button type="button" class="ms8263-start" data-ms8263-go="live" aria-hidden="true" tabindex="-1">Live varen</button>
   </section>
 </main>

 <div class="ms8263-sheet" aria-hidden="true">
   <div class="ms8263-sheet-card">
     <div class="ms8263-sheet-head"><strong>Meer functies</strong><button class="ms8263-sheet-close" aria-label="Sluiten">${icon.close}</button></div>
     <div class="ms8263-sheet-grid">
       <button data-ms8263-go="live">Live varen</button>
       <button data-ms8263-go="entertainment">Entertainment / Home Assistant</button>
       <button data-ms8263-go="costs">Kosten</button>
       <button data-ms8263-go="finance">Financieel</button>
       <button data-ms8263-go="settings">Boot & instellingen</button>
       <button data-ms8263-go="pois">POI & havens</button>
     </div>
   </div>
 </div>
 </div>`;
 bind();refreshData();startGps();updateClock();
 clearInterval(window.__ms8263RefreshTimer);
 window.__ms8263RefreshTimer=setInterval(()=>{refreshData();updateClock()},2000);
 return true;
}

window.ms8263ApplyApprovedDashboard=apply;
window.ms8260ApplyApprovedDashboard=apply;
window.ms8263Navigate=nav;

function start(){if(route()==='dashboard'){if(!apply())setTimeout(start,80)}else setHomeActive(false)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('pageshow',()=>{if(route()==='dashboard')setTimeout(apply,20)},{passive:true});
window.addEventListener('hashchange',()=>{if(route()==='dashboard')setTimeout(apply,30);else setHomeActive(false)},{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&route()==='dashboard'){refreshData();updateClock()}},{passive:true});
})();
