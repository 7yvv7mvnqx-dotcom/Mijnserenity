/* MijnSerenity 8.30.0 — landscape startdashboard
   Belangrijkste bediening in één iPad-landscape scherm.
   Minder gebruikte functies, waaronder Live varen, staan onder Meer. */
(()=>{
'use strict';
if(window.__msApprovedDashboard8280)return;
window.__msApprovedDashboard8280=true;
window.__msApprovedDashboard8263=true;
window.__msApprovedDashboard8260=true;

const BUILD='8.30.0';
const TOKEN='830000';
const ROOT='ms8210Start';
const STYLE='ms8280LandscapeStyle';
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
 :root{--msr-cyan:#1fdcff;--msr-bg:#031623;--msr-panel:#06283b;--msr-line:#0c6688;--msr-muted:#9bb8c6;--msr-green:#27d86e}
 html,body{background:#02131e!important}
 body.ms8263-home-active{margin:0!important;background:#02131e!important;overflow:hidden!important;overscroll-behavior:none!important}
 body.ms8263-home-active #appView>.tabs,body.ms8263-home-active>.bottom-nav,body.ms8263-home-active #appView>.bottom-nav{display:none!important}
 #dashboard.ms8255-reference-dashboard{padding:0!important;margin:0!important;max-width:none!important;background:#02131e!important;overflow:hidden!important}
 #${ROOT}{display:block!important;position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;min-height:100dvh!important;margin:0!important;padding:0!important;background:#02131e!important;color:#fff!important;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;overflow:hidden!important;-webkit-font-smoothing:antialiased}
 #${ROOT} *{box-sizing:border-box}
 #${ROOT} button{font:inherit;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
 #${ROOT} svg{display:block;width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
 #${ROOT} .msr-shell{display:grid;grid-template-columns:14.36vw minmax(0,1fr);grid-template-rows:23.02vh minmax(0,1fr);width:100%;height:100%;padding-bottom:0;background:linear-gradient(145deg,#06283a 0,#031620 56%,#02111b 100%);overflow:hidden}
 #${ROOT} .msr-side{grid-row:1/3;grid-column:1;display:flex;flex-direction:column;min-height:0;border-right:1px solid rgba(35,177,222,.38);background:linear-gradient(180deg,#07324b 0,#031a2a 58%,#041727 100%);box-shadow:inset -1px 0 rgba(255,255,255,.03)}
 #${ROOT} .msr-brand{height:185px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px 12px 13px}
 #${ROOT} .msr-brand strong{font-family:Georgia,"Times New Roman",serif;font-size:45px;line-height:.85;font-style:italic;font-weight:500;letter-spacing:-.06em;text-shadow:0 2px 14px rgba(255,255,255,.12)}
 #${ROOT} .msr-wave{width:118px;height:16px;margin-top:4px;border-bottom:4px solid #86e9ff;border-radius:0 0 90% 55%;transform:skewX(-16deg)}
 #${ROOT} .msr-brand small{margin-top:11px;color:#e7f6fb;font-size:9px;letter-spacing:.21em;text-transform:uppercase;font-weight:800}
 #${ROOT} .msr-nav{display:flex;flex:1;min-height:0;flex-direction:column;gap:4px;padding:0 10px;overflow:auto;scrollbar-width:none}
 #${ROOT} .msr-nav::-webkit-scrollbar{display:none}
 #${ROOT} .msr-nav button{display:grid;grid-template-columns:32px 1fr;align-items:center;gap:12px;min-height:56px;padding:0 16px;border:1px solid transparent;border-radius:7px;background:transparent;color:#fff;text-align:left;font-size:15px;font-weight:650;cursor:pointer}
 #${ROOT} .msr-nav button svg{width:25px;height:25px;stroke-width:2}
 #${ROOT} .msr-nav button.active{position:relative;background:linear-gradient(90deg,rgba(7,146,190,.70),rgba(6,62,89,.74));border-color:rgba(37,214,255,.34);color:#fff}
 #${ROOT} .msr-nav button.active:before{content:"";position:absolute;left:-10px;top:-1px;bottom:-1px;width:5px;background:#28ddff;box-shadow:0 0 16px rgba(40,221,255,.65)}
 #${ROOT} .msr-side-foot{padding:11px 12px 18px;text-align:center;color:#5f9dbb;font-size:10px;letter-spacing:.10em}
 #${ROOT} .msr-side-foot .sun{font-size:34px;color:#d5f7ff;line-height:1}
 #${ROOT} .msr-side-foot strong{display:block;margin-top:4px;color:#fff;font-family:Georgia,serif;font-size:20px;font-weight:500;letter-spacing:.02em}
 #${ROOT} .msr-hero{grid-column:2;grid-row:1;position:relative;overflow:hidden;background:url('/serenity-reference-hero.jpg?v=${TOKEN}') center center/cover no-repeat;isolation:isolate}
 #${ROOT} .msr-hero:before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(2,14,23,.12),rgba(2,14,23,.01) 50%,rgba(2,14,23,.18))}
 #${ROOT} .msr-hero-copy{position:absolute;left:2.20vw;bottom:2.50vh;z-index:2;padding:12px 34px 12px 0;background:linear-gradient(90deg,rgba(2,19,30,.82) 0,rgba(2,19,30,.46) 63%,rgba(2,19,30,0) 100%);box-shadow:-22px 0 35px 16px rgba(2,19,30,.28);text-shadow:0 3px 15px rgba(0,0,0,.75)}
 #${ROOT} .msr-hero-copy strong{display:block;font-size:1.80vw;line-height:1.05}
 #${ROOT} .msr-hero-copy span{display:block;margin-top:6px;font-size:1.10vw;font-weight:620}
 #${ROOT} .msr-hero-copy em{display:block;margin-top:1.15vh;font-size:.97vw;font-style:italic;color:#f1f7fa}
 #${ROOT} .msr-hero-info{position:absolute;right:1.55vw;top:2.60vh;z-index:2;display:grid;padding:14px 4px 14px 36px;background:linear-gradient(270deg,rgba(2,19,30,.88) 0,rgba(2,19,30,.54) 66%,rgba(2,19,30,0) 100%);box-shadow:22px 0 35px 16px rgba(2,19,30,.25);grid-template-columns:48px auto;grid-template-areas:"date date" "moon time" "moon temp" "pin place";align-items:center;column-gap:10px;color:#fff;text-align:right;text-shadow:0 3px 14px rgba(0,0,0,.72)}
 #${ROOT} .msr-hero-date{grid-area:date;margin-bottom:4px;font-size:12px;font-weight:750}
 #${ROOT} .msr-hero-time{grid-area:time;font-size:32px;line-height:1;font-weight:800}
 #${ROOT} .msr-hero-moon{grid-area:moon;font-size:42px;line-height:1;align-self:end}
 #${ROOT} .msr-hero-temp{grid-area:temp;margin-top:5px;font-size:16px;font-weight:800}
 #${ROOT} .msr-hero-place{grid-area:place;margin-top:8px;font-size:12px;font-weight:700}
 #${ROOT} .msr-hero-pin{grid-area:pin;margin-top:8px;font-size:17px}
 #${ROOT} .ms8263-main{grid-column:2;grid-row:2;display:grid!important;grid-template-rows:1.05fr 1fr 1fr;gap:1.00vh;min-height:0;padding:1.15vh 1.25vw 9.1vh!important;background:linear-gradient(180deg,#062033 0,#031521 100%)!important;overflow:hidden!important}
 #${ROOT} .msr-panel{border:1px solid rgba(26,128,165,.70);border-radius:17px;background:linear-gradient(145deg,rgba(4,42,61,.96),rgba(2,24,38,.97));box-shadow:inset 0 1px rgba(255,255,255,.04),0 10px 22px rgba(0,0,0,.10);overflow:hidden}
 #${ROOT} .msr-kicker{display:flex;align-items:center;gap:8px;color:#74e6ff;font-size:9px;font-weight:900;letter-spacing:.19em;text-transform:uppercase}
 #${ROOT} .msr-kicker .ico{font-size:18px;letter-spacing:0}
 #${ROOT} .msr-quick{padding:13px 14px 14px}
 #${ROOT} .msr-quick-head{display:flex;align-items:center;justify-content:space-between;margin:0 3px 10px}
 #${ROOT} .msr-quick-head strong{font-size:12px;letter-spacing:.18em}
 #${ROOT} .msr-edit{border:0;background:transparent;color:#65e5ff;font-size:11px;font-weight:700}
 #${ROOT} .ms8263-features{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:12px!important;margin:0!important}
 #${ROOT} .ms8263-feature{display:flex!important;min-width:0!important;min-height:14.15vh!important;padding:16px 9px 10px!important;border:1px solid rgba(155,232,255,.38)!important;border-radius:12px!important;flex-direction:column!important;align-items:center!important;justify-content:flex-start!important;gap:7px!important;color:#fff!important;text-align:center!important;cursor:pointer!important;box-shadow:inset 0 1px rgba(255,255,255,.14),0 9px 18px rgba(0,0,0,.14)!important}
 #${ROOT} .ms8263-feature>svg{width:33px!important;height:33px!important;margin:1px 0 3px;stroke-width:2!important}
 #${ROOT} .ms8263-feature .copy strong{display:block;font-size:15px;line-height:1.05}
 #${ROOT} .ms8263-feature .copy small{display:block;margin-top:7px;color:#e1edf1;font-size:10px;line-height:1.15;white-space:normal;overflow:hidden;overflow-wrap:anywhere}
 #${ROOT} .ms8263-feature .chev{display:grid!important;place-items:center;width:34px;height:34px;margin-top:auto;border:1px solid rgba(255,255,255,.26);border-radius:50%;background:rgba(255,255,255,.12);font-size:21px;line-height:1}
 #${ROOT} .ms8263-feature.green{background:linear-gradient(145deg,#06a23f,#057637)!important}
 #${ROOT} .ms8263-feature.cyan{background:linear-gradient(145deg,#0781b0,#075b7f)!important}
 #${ROOT} .ms8263-feature.orange{background:linear-gradient(145deg,#d36a0d,#914608)!important}
 #${ROOT} .ms8263-feature.purple{background:linear-gradient(145deg,#724ca4,#50317b)!important}
 #${ROOT} .ms8263-feature.navy{background:linear-gradient(145deg,#0880bd,#075a8d)!important}
 #${ROOT} .msr-row{display:grid;grid-template-columns:1.03fr 1.03fr 1.42fr;gap:11px;min-height:0}
 #${ROOT} .msr-row-bottom{grid-template-columns:1.08fr .98fr 1.16fr}
 #${ROOT} .msr-card{display:flex;min-height:0;flex-direction:column;padding:13px 13px 9px}
 #${ROOT} .msr-card-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}
 #${ROOT} .msr-live{display:flex;align-items:center;gap:5px;padding:4px 8px;border-radius:999px;background:rgba(5,55,66,.8);font-size:9px;color:#d7f4dd}
 #${ROOT} .msr-live i{width:8px;height:8px;border-radius:50%;background:#12d64d;box-shadow:0 0 8px rgba(18,214,77,.65)}
 #${ROOT} .msr-mainline{display:flex;align-items:center;gap:16px;padding:5px 12px 8px}
 #${ROOT} .msr-mainline .bigico{font-size:39px;line-height:1}
 #${ROOT} .msr-mainline strong{font-size:21px;line-height:1.05}
 #${ROOT} .msr-mainline small{display:block;margin-top:4px;color:#afc4cd;font-size:11px}
 #${ROOT} .msr-minis{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:auto}
 #${ROOT} .msr-mini{min-width:0;padding:9px 6px;border:1px solid rgba(79,153,183,.28);border-radius:10px;background:rgba(13,49,66,.62);text-align:center}
 #${ROOT} .msr-mini small{display:block;color:#c1d0d6;font-size:9px}
 #${ROOT} .msr-mini strong{display:block;margin-top:4px;font-size:12px}
 #${ROOT} .msr-action{display:flex;align-items:center;justify-content:center;gap:6px;min-height:30px;margin-top:7px;border:1px solid rgba(56,194,235,.66);border-radius:9px;background:rgba(5,39,57,.72);color:#fff;font-size:10px;font-weight:800}
 #${ROOT} .msr-weather-main{display:flex;align-items:center;gap:14px;padding:2px 15px 7px}
 #${ROOT} .msr-weather-icon{font-size:46px}
 #${ROOT} .msr-weather-main strong{font-size:24px}
 #${ROOT} .msr-weather-main small{display:block;margin-top:3px;color:#c2d1d7;font-size:11px}
 #${ROOT} .msr-rings{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;align-items:start;padding:0 4px}
 #${ROOT} .msr-gauge{text-align:center}
 #${ROOT} .msr-ring{--p:50;position:relative;width:72px;height:72px;margin:0 auto 5px;border-radius:50%;background:conic-gradient(#24dffb calc(var(--p)*1%),#0a4661 0);box-shadow:inset 0 0 0 8px rgba(2,31,45,.95)}
 #${ROOT} .msr-ring:after{content:"";position:absolute;inset:11px;border-radius:50%;background:#06283a}
 #${ROOT} .msr-ring strong{position:absolute;inset:0;z-index:2;display:grid;place-items:center;font-size:17px}
 #${ROOT} .msr-gauge label{display:block;font-size:10px;font-weight:700}
 #${ROOT} .msr-gauge small{display:block;margin-top:2px;color:#aec2ca;font-size:8.5px;line-height:1.25}
 #${ROOT} .msr-tankline{display:grid;grid-template-columns:30px 92px 1fr 42px 18px;align-items:center;gap:6px;min-height:39px;border-bottom:1px solid rgba(255,255,255,.055)}
 #${ROOT} .msr-tankline .ticon{display:grid;place-items:center;width:28px;height:28px;border-radius:7px;background:rgba(20,105,139,.35);font-size:16px}
 #${ROOT} .msr-tankline strong{font-size:10.5px}
 #${ROOT} .msr-bar{height:13px;border-radius:999px;background:#355565;overflow:hidden;box-shadow:inset 0 1px 4px rgba(0,0,0,.45)}
 #${ROOT} .msr-bar i{display:block;height:100%;width:var(--p);border-radius:inherit;background:linear-gradient(90deg,#ff4d41,#ff6c5f)}
 #${ROOT} .msr-tankline.water .msr-bar i{background:linear-gradient(90deg,#15c6ed,#46e7ff)}
 #${ROOT} .msr-tankline small{font-size:9px;color:#b2c3cb}
 #${ROOT} .msr-status-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;padding:2px 5px}
 #${ROOT} .msr-status-item{display:grid;grid-template-columns:18px 1fr;gap:7px;align-items:start}
 #${ROOT} .msr-check{display:grid;place-items:center;width:17px;height:17px;border-radius:50%;background:#16b94f;color:white;font-size:11px;box-shadow:0 0 8px rgba(22,185,79,.30)}
 #${ROOT} .msr-status-item strong{display:block;font-size:10px}
 #${ROOT} .msr-status-item small{display:block;margin-top:2px;color:#a9c0ca;font-size:8.5px}
 #${ROOT} .msr-upcoming{display:grid;gap:5px}
 #${ROOT} .msr-upcoming-item{display:grid;grid-template-columns:28px 84px minmax(0,1fr);align-items:center;min-height:30px;padding:0 8px;border:1px solid rgba(93,166,195,.24);border-radius:9px;background:rgba(12,49,67,.54);font-size:9px}
 #${ROOT} .msr-upcoming-item .uico{font-size:15px}
 #${ROOT} .msr-upcoming-item strong{font-size:9px}
 #${ROOT} .msr-hidden-anchor,#${ROOT} #ms8264LiveInstruments{position:absolute!important;left:-99999px!important;top:-99999px!important;width:1px!important;height:1px!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important}
 #${ROOT} .ms8263-welcome{position:absolute!important;left:-99999px!important;top:-99999px!important;width:1px!important;height:1px!important;overflow:visible!important;border:0!important;background:none!important}
 #${ROOT} .ms8263-start{display:block!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important}
 #${ROOT} .msqa8267#msQuickAsk8267{position:fixed!important;z-index:10010!important;left:1.38vw!important;right:1.38vw!important;bottom:1.0vh!important;height:7.10vh!important;min-height:72px!important;margin:0!important;padding:10px 204px 10px 220px!important;border:1px solid rgba(45,175,218,.42)!important;border-radius:14px!important;background:linear-gradient(90deg,rgba(5,54,79,.98),rgba(3,31,46,.98))!important;box-shadow:0 16px 40px rgba(0,0,0,.32)!important}
 #${ROOT} .msqa8267-label{position:absolute!important;left:1.66vw!important;top:0!important;bottom:0!important;display:flex!important;align-items:center!important;width:13.55vw!important;margin:0!important;color:#fff!important;font-size:15px!important;font-weight:800!important;letter-spacing:0!important;text-transform:none!important}
 #${ROOT} .msqa8267-label:before{font-size:22px!important;margin-right:10px}
 #${ROOT} .msqa8270-badge{display:none!important}
 #${ROOT} .msqa8267-row{display:grid!important;grid-template-columns:minmax(0,1fr) 54px!important;gap:10px!important;min-height:54px!important;height:54px!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
 #${ROOT} .msqa8267-spark{display:none!important}
 #${ROOT} .msqa8267 input{height:54px!important;padding:0 18px!important;border:1px solid rgba(81,149,177,.42)!important;border-radius:10px!important;background:rgba(17,60,78,.74)!important;color:white!important;font-size:13px!important;font-weight:600!important}
 #${ROOT} .msqa8267-send{width:54px!important;height:54px!important;min-width:54px!important;min-height:54px!important;border-radius:11px!important;background:linear-gradient(135deg,#20c9ef,#23dffe)!important}
 #${ROOT} .msqa8267-examples{position:absolute!important;right:.83vw!important;top:.70vh!important;width:12.30vw!important;height:5.35vh!important;margin:0!important;padding:7px 10px!important;border:1px solid rgba(69,150,182,.30)!important;border-radius:10px!important;background:rgba(9,45,63,.78)!important;color:#d9e7ed!important;font-size:8px!important;line-height:1.35!important}
 #${ROOT} .msqa8267-examples strong{display:block;margin-bottom:2px;color:#fff;font-size:8px}
 #${ROOT} .msqa8267-result{position:fixed!important;left:245px!important;right:225px!important;bottom:96px!important;max-height:140px!important;margin:0!important;z-index:10011!important;font-size:11px!important;overflow:auto!important}
 #${ROOT} .ms8271-tools{position:absolute!important;right:18.50vw!important;top:.72vh!important;display:block!important;width:54px!important;height:54px!important;margin:0!important}
 #${ROOT} #ms8271Mic{display:grid!important;place-items:center!important;width:54px!important;height:54px!important;min-width:54px!important;min-height:54px!important;padding:0!important;border:1px solid rgba(94,169,198,.42)!important;border-radius:10px!important;background:rgba(12,54,72,.92)!important;color:#fff!important}
 #${ROOT} #ms8271Mic svg{width:23px!important;height:23px!important}
 #${ROOT} #ms8271Mic span,#${ROOT} #ms8271Clear,#${ROOT} .ms8271-speak,#${ROOT} .ms8271-ai-note,#${ROOT} .ms8271-voice-status{display:none!important}
 @media(max-height:760px) and (orientation:landscape){
   #${ROOT} .msr-shell{grid-template-columns:188px minmax(0,1fr);grid-template-rows:205px minmax(0,1fr);padding-bottom:0}
   #${ROOT} .msr-brand{height:150px}
   #${ROOT} .msr-brand strong{font-size:38px}
   #${ROOT} .msr-nav button{min-height:46px;font-size:13px}
   #${ROOT} .msr-hero-copy{bottom:20px}
   #${ROOT} .msr-hero-copy strong{font-size:22px}
   #${ROOT} .msr-hero-info{top:28px}
   #${ROOT} .ms8263-main{grid-template-rows:1fr 1fr 1fr;gap:8px;padding:9px 12px 82px!important}
   #${ROOT} .ms8263-feature{min-height:112px!important;padding-top:10px!important}
   #${ROOT} .ms8263-feature>svg{width:28px!important;height:28px!important}
   #${ROOT} .msr-card{padding:9px 10px 7px}
   #${ROOT} .msr-ring{width:58px;height:58px}
   #${ROOT} .msr-tankline{min-height:32px}
   #${ROOT} .msqa8267{height:66px!important;bottom:8px!important;padding-top:7px!important;padding-bottom:7px!important}
   #${ROOT} .msqa8267-row,#${ROOT} .msqa8267 input,#${ROOT} .msqa8267-send,#${ROOT} #ms8271Mic{height:50px!important;min-height:50px!important}
 }
 @media(max-width:900px) and (orientation:portrait){
   body.ms8263-home-active{overflow:auto!important}
   #${ROOT}{position:relative!important;height:auto!important;min-height:100dvh!important;overflow:auto!important}
   #${ROOT} .msr-shell{display:block;height:auto;min-height:100dvh;padding-bottom:115px}
   #${ROOT} .msr-side{display:none}
   #${ROOT} .msr-hero{height:260px}
   #${ROOT} .ms8263-main{display:block!important;overflow:visible!important;padding:12px!important}
   #${ROOT} .msr-quick,#${ROOT} .msr-row{margin-bottom:10px}
   #${ROOT} .ms8263-features{grid-template-columns:repeat(2,minmax(0,1fr))!important}
   #${ROOT} .msr-row,#${ROOT} .msr-row-bottom{display:block}
   #${ROOT} .msr-card{margin-bottom:10px}
   #${ROOT} .msqa8267{left:8px!important;right:8px!important;padding-left:12px!important;padding-right:72px!important}
   #${ROOT} .msqa8267-label,#${ROOT} .msqa8267-examples,#${ROOT} .ms8271-tools{display:none!important}
 }

 #${ROOT} .msr-heater{display:grid;grid-template-columns:88px 1fr 62px;align-items:center;gap:7px;margin-top:5px}
 #${ROOT} .msr-heater button{height:32px;border:1px solid rgba(65,172,211,.46);border-radius:9px;background:rgba(8,50,70,.82);color:#e8f8ff;font-size:10px;font-weight:850}
 #${ROOT} .msr-heater-power.on,#${ROOT} .msr-heater-auto.on{border-color:rgba(45,225,116,.72);background:rgba(19,126,66,.72);box-shadow:0 0 12px rgba(39,216,110,.16)}
 #${ROOT} .msr-heater-temp{display:grid;grid-template-columns:32px 1fr 32px;align-items:center;height:32px;border:1px solid rgba(65,172,211,.34);border-radius:9px;background:rgba(8,43,61,.72);overflow:hidden}
 #${ROOT} .msr-heater-temp button{height:30px;border:0;border-radius:0;background:transparent;font-size:17px}
 #${ROOT} .msr-heater-temp strong{text-align:center;font-size:14px}
 #${ROOT} .ms8263-feature .copy{min-width:0;width:100%}
 #${ROOT} .ms8263-feature .copy small{min-height:2.3em}
 #${ROOT} .msqa8267#msQuickAsk8267{bottom:max(8px,env(safe-area-inset-bottom))!important}
 @media(max-height:760px) and (orientation:landscape){
   #${ROOT} .msr-shell{grid-template-rows:20dvh minmax(0,1fr)!important}
   #${ROOT} .msr-brand{height:118px!important;padding-top:10px!important}
   #${ROOT} .msr-brand strong{font-size:38px!important}
   #${ROOT} .msr-nav button{min-height:42px!important}
   #${ROOT} .ms8263-main{grid-template-rows:126px minmax(0,1fr) minmax(0,1fr)!important;gap:7px!important;padding:7px 12px 72px!important}
   #${ROOT} .msr-quick{padding:9px 11px!important}
   #${ROOT} .msr-quick-head{margin-bottom:7px!important}
   #${ROOT} .ms8263-features{gap:8px!important}
   #${ROOT} .ms8263-feature{min-height:91px!important;padding:8px 7px 6px!important;gap:3px!important}
   #${ROOT} .ms8263-feature>svg{width:25px!important;height:25px!important;margin:0!important}
   #${ROOT} .ms8263-feature .copy strong{font-size:13px!important}
   #${ROOT} .ms8263-feature .copy small{margin-top:3px!important;font-size:8.5px!important;line-height:1.12!important}
   #${ROOT} .ms8263-feature .chev{width:25px!important;height:25px!important;font-size:16px!important}
   #${ROOT} .msr-card{padding:8px 10px 6px!important}
   #${ROOT} .msr-card-title{margin-bottom:4px!important}
   #${ROOT} .msr-mainline{padding:1px 8px 3px!important}
   #${ROOT} .msr-mainline .bigico{font-size:28px!important}
   #${ROOT} .msr-mainline strong{font-size:16px!important}
   #${ROOT} .msr-minis{gap:3px!important}
   #${ROOT} .msr-mini{padding:5px 4px!important}
   #${ROOT} .msr-action{min-height:24px!important;margin-top:4px!important}
   #${ROOT} .msr-ring{width:54px!important;height:54px!important}
   #${ROOT} .msr-ring strong{font-size:13px!important}
   #${ROOT} .msr-weather-icon{font-size:34px!important}
   #${ROOT} .msr-weather-main{padding:0 9px 3px!important}
   #${ROOT} .msr-tankline{min-height:27px!important}
   #${ROOT} .msr-status-grid{gap:3px 12px!important}
   #${ROOT} .msr-status-item small{margin-top:0!important}
   #${ROOT} .msr-upcoming{gap:3px!important}
   #${ROOT} .msr-upcoming-item{min-height:24px!important}
   #${ROOT} .msqa8267#msQuickAsk8267{height:58px!important;min-height:58px!important;padding-top:4px!important;padding-bottom:4px!important}
   #${ROOT} .msqa8267-row,#${ROOT} .msqa8267 input,#${ROOT} .msqa8267-send,#${ROOT} #ms8271Mic{height:46px!important;min-height:46px!important}
 }
 @supports(height:100dvh){#${ROOT}{height:100dvh!important;min-height:100dvh!important}}
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
 setText('ms8263OutsideSub',Number.isFinite(tN)?'Actueel weer':'Weer laden…');
}

function startGps(){
 const val=$('ms8263Location'),sub=$('ms8263LocationSub');
 if(!val||!sub)return;
 if(!navigator.geolocation){val.textContent='GPS niet beschikbaar';sub.textContent='Locatie niet ondersteund';return}
 val.textContent='GPS zoeken…';sub.textContent='Positie wordt bepaald';
 navigator.geolocation.getCurrentPosition(pos=>{
   val.textContent='GPS actief';
   sub.textContent=`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
   setText('msrGpsState','GPS actief');setText('msrGpsCoords',pos.coords.latitude.toFixed(4)+', '+pos.coords.longitude.toFixed(4));
 },()=>{
   val.textContent='GPS wachten';sub.textContent='Locatie nog niet beschikbaar';setText('msrGpsState','GPS wachten');
 },{enableHighAccuracy:false,timeout:7000,maximumAge:60000});
}

function updateClock(){
 setText('ms8280Clock',new Intl.DateTimeFormat('nl-NL',{hour:'2-digit',minute:'2-digit'}).format(new Date()));
 setText('ms8280HeroDate',shortDate());
 setText('ms8280Greeting',greeting()+' Desi & Michel');
}


function setRing(id,value){
 const el=$(id),v=Math.max(0,Math.min(100,Number(value)||0));
 if(el)el.style.setProperty('--p',String(v));
}
function decorateReference(){
 const ex=document.querySelector('#'+ROOT+' .msqa8267-examples');
 if(ex&&!ex.dataset.msrDecorated){
   ex.dataset.msrDecorated='1';
   ex.innerHTML='<strong>Voorbeeldvragen</strong>“Hoe is de accuspanning?”<br>“Plan een route naar Sneek”<br>“Wat is het weer morgen?”';
 }
}
function syncReference(){
 decorateReference();
 const speed=sourceText(['ms71510Speed','liveSpeed','speedValue','currentSpeed']);
 const speedN=numberFrom(speed);
 setText('msrSpeed',Number.isFinite(speedN)?fmtNum(speedN/1.852,speedN<1?1:0)+' kn':'0 kn');
 const depth=numberFrom(sourceText(['ms71510Depth','liveDepth','depthValue']));
 if(Number.isFinite(depth))setText('msrDepth',fmtNum(depth,1)+' m');
 const wind=sourceText(['ms71510WindBft','ms71510Wind','liveWind','windValue']);
 if(wind&&/\d/.test(wind))setText('msrWind',clean(wind));else setText('msrWind','ZW 2 Bft');

 const house=numberFrom(sourceText(['ms8264House','ms71510HouseSoc','houseSoc','batterySoc','victronSoc']));
 const hp=Number.isFinite(house)?Math.max(0,Math.min(100,Math.round(house))):48;
 setText('msrHousePct',hp+'%');setRing('msrHouseRing',hp);
 const hs=sourceText(['ms8264HouseSub']);
 if(hs)setText('msrHouseSub',hs);

 const startText=sourceText(['ms8264Start','startBatteryVoltage','techStartVoltage']);
 if(startText)setText('msrStartSub',startText+'\nSpanning in orde');

 const fuel=numberFrom(sourceText(['ms8264Fuel']));
 if(Number.isFinite(fuel)){
   const fp=Math.max(0,Math.min(100,Math.round(fuel)));
   setText('msrFuelPct',fp+'%');
   const fb=$('msrFuelBar');if(fb)fb.style.width=fp+'%';
 }
 const water=numberFrom(sourceText(['ms8264Water']));
 if(Number.isFinite(water)){
   const wp=Math.max(0,Math.min(100,Math.round(water)));
   setText('msrWaterPct',wp+'%');setText('msrWaterPct2',wp+'%');
   setRing('msrWaterRing',wp);
   const wb=$('msrWaterBar');if(wb)wb.style.width=wp+'%';
 }
 const wsub=sourceText(['ms8264WaterSub']);if(wsub)setText('msrWaterSub',wsub);

 const outside=numberFrom(sourceText(['ms8264Outside','outsideTemperature','weatherTemperature','weatherCurrentTemp','currentTemperature','msWeatherTemperature']));
 if(Number.isFinite(outside)){
   const txt=fmtNum(outside,1)+'°';
   setText('msrWeatherTemp',txt);
   const hero=$('msrHeroTemp');if(hero)hero.innerHTML=txt+'<br><small style="font-size:10px;font-weight:600">Onbewolkt</small>';
 }
 const liveBadge=clean($('ms8264LiveBadge')?.textContent);
 setText('msrLiveText',liveBadge&&liveBadge!=='Verbinden…'?liveBadge:'Live');
 const solar=sourceText(['ms8264SolarSub']);if(solar)setText('msrSolarSub',solar);
}


const HEATER_KEY='mijnserenity_nordkapp_dashboard';
function readHeater(){
 try{return Object.assign({power:false,auto:true,temp:20},JSON.parse(localStorage.getItem(HEATER_KEY)||'{}'))}
 catch(_){return{power:false,auto:true,temp:20}}
}
function saveHeater(next){
 const state=Object.assign(readHeater(),next||{});
 state.temp=Math.max(8,Math.min(30,Math.round(Number(state.temp)||20)));
 try{localStorage.setItem(HEATER_KEY,JSON.stringify(state))}catch(_){}
 renderHeater(state);
 window.dispatchEvent(new CustomEvent('mijnserenity:heater-control',{detail:Object.assign({source:'dashboard'},state)}));
}
function renderHeater(state=readHeater()){
 const power=$('msrHeaterPower'),auto=$('msrHeaterAuto');
 setText('msrHeaterTemp',state.temp+'°');
 setText('msrHeaterState',state.power?'Aan · '+state.temp+'°':(state.auto?'Stand-by · Auto':'Uit'));
 if(power){power.classList.toggle('on',!!state.power);power.setAttribute('aria-pressed',String(!!state.power));power.querySelector('span').textContent=state.power?'Aan':'Uit'}
 if(auto){auto.classList.toggle('on',!!state.auto);auto.setAttribute('aria-pressed',String(!!state.auto))}
}
function bindHeater(){
 $('msrHeaterPower')?.addEventListener('click',()=>{const s=readHeater();saveHeater({power:!s.power})});
 $('msrHeaterDown')?.addEventListener('click',()=>{const s=readHeater();saveHeater({temp:s.temp-1})});
 $('msrHeaterUp')?.addEventListener('click',()=>{const s=readHeater();saveHeater({temp:s.temp+1})});
 $('msrHeaterAuto')?.addEventListener('click',()=>{const s=readHeater();saveHeater({auto:!s.auto})});
 renderHeater();
}

function bind(){
 const root=$(ROOT);if(!root)return;
 root.querySelectorAll('[data-ms8263-go]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.ms8263Go)));
 $('ms8263Theme')?.addEventListener('click',()=>{
   const day=root.dataset.theme==='day';root.dataset.theme=day?'night':'day';
   setText('ms8263ThemeLabel',day?'Nacht':'Dag');
 });
 bindHeater();
 rootQuery('.ms8263-sheet')?.addEventListener('click',e=>{if(e.target.classList.contains('ms8263-sheet'))closeMore()});
 rootQuery('.ms8263-sheet-close')?.addEventListener('click',closeMore);
}

function apply(){
 const root=$(ROOT);if(!root)return false;
 installStyle();syncBuild();setHomeActive(true);
 root.className='ms8255-reference-home ms8263-approved-home';
 root.dataset.approved='8280';root.dataset.theme='night';
 root.innerHTML=`
 <div class="msr-shell">
  <aside class="msr-side">
    <div class="msr-brand"><strong>Serenity</strong><div class="msr-wave"></div><small>MY BOAT · MY FREEDOM</small></div>
    <nav class="msr-nav" aria-label="Hoofdnavigatie">
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
    <div class="msr-side-foot"><div class="sun">☼</div><strong>Serenity</strong>Varen is leven</div>
  </aside>

  <section class="msr-hero">
    <div class="msr-hero-copy"><strong id="ms8280Greeting">${greeting()} Desi &amp; Michel</strong><span>Fijn dat je weer aan boord bent</span><em>“Good vibes, high tides”</em></div>
    <div class="msr-hero-info">
      <div class="msr-hero-date" id="ms8280HeroDate">${shortDate()}</div>
      <div class="msr-hero-moon">☾</div>
      <div class="msr-hero-time" id="ms8280Clock">--:--</div>
      <div class="msr-hero-temp" id="msrHeroTemp">17,7°<br><small style="font-size:10px;font-weight:600">Onbewolkt</small></div>
      <div class="msr-hero-pin">⌖</div><div class="msr-hero-place">Enschede</div>
    </div>
  </section>

  <main class="ms8263-main">
    <section class="msr-panel msr-quick">
      <div class="msr-quick-head"><strong>SNEL NAAR</strong><button class="msr-edit" data-ms8263-go="settings">Bewerk ✎</button></div>
      <section class="ms8263-features">
        ${feature('technical','battery','Energie',"Accu's & laden",'green')}
        ${feature('technical','cloud','Tanks','Water, diesel, vuilwater','cyan')}
        ${feature('technical','gear','Techniek','Motor, verwarming, systemen','orange')}
        ${feature('map','map','Kaart','Waterkaarten & navigatie','purple')}
        ${feature('logbook','log','Logboek','Nieuwe logregel','navy')}
        ${feature('planner','route','Reisplanner','Plan je volgende trip','green')}
      </section>
    </section>

    <section class="msr-row">
      <section class="msr-panel msr-card">
        <div class="msr-card-title"><div class="msr-kicker"><span class="ico">⌖</span>HUIDIGE LOCATIE</div></div>
        <div class="msr-mainline"><div class="bigico">⌖</div><div><strong id="msrGpsState">GPS actief</strong><small id="msrGpsCoords">52.1998, 6.9012</small></div></div>
        <div class="msr-minis">
          <div class="msr-mini"><small>Snelheid</small><strong id="msrSpeed">0 kn</strong></div>
          <div class="msr-mini"><small>Koers</small><strong>---</strong></div>
          <div class="msr-mini"><small>Diepte</small><strong id="msrDepth">2,8 m</strong></div>
        </div>
        <button class="msr-action" data-ms8263-go="map">Open kaart <span>›</span></button>
      </section>

      <section class="msr-panel msr-card">
        <div class="msr-card-title"><div class="msr-kicker"><span class="ico">☁</span>WEER OP LOCATIE</div></div>
        <div class="msr-weather-main"><div class="msr-weather-icon">🌤️</div><div><strong id="msrWeatherTemp">17,7°</strong><small>Onbewolkt</small></div></div>
        <div class="msr-minis">
          <div class="msr-mini"><small>🌅</small><strong>07:16</strong></div>
          <div class="msr-mini"><small>🌇</small><strong>19:38</strong></div>
          <div class="msr-mini"><small>≋</small><strong id="msrWind">ZW 2 Bft</strong></div>
        </div>
        <button class="msr-action" data-ms8263-go="weather">Uitgebreid weer <span>›</span></button>
      </section>

      <section class="msr-panel msr-card">
        <div class="msr-card-title"><div class="msr-kicker"><span class="ico">⚡</span>ACCU'S &amp; ENERGIE</div><span class="msr-live"><i></i><span id="msrLiveText">Live</span></span></div>
        <div class="msr-rings">
          <div class="msr-gauge"><div class="msr-ring" id="msrHouseRing" style="--p:48"><strong id="msrHousePct">48%</strong></div><label>Huishoudaccu</label><small id="msrHouseSub">13,06 V · -4,6 A</small></div>
          <div class="msr-gauge"><div class="msr-ring" id="msrStartRing" style="--p:71"><strong>71%</strong></div><label>Startaccu</label><small id="msrStartSub">12,76 V<br>Spanning in orde</small></div>
          <div class="msr-gauge"><div class="msr-ring" id="msrWaterRing" style="--p:0"><strong id="msrWaterPct">0%</strong></div><label>Drinkwater</label><small id="msrWaterSub">0 L<br>Victron tank</small></div>
        </div>
        <button class="msr-action" data-ms8263-go="technical">Naar energie <span>›</span></button>
      </section>
    </section>

    <section class="msr-row msr-row-bottom">
      <section class="msr-panel msr-card">
        <div class="msr-card-title"><div class="msr-kicker"><span class="ico">💧</span>TANKS</div></div>
        <div class="msr-tankline"><span class="ticon">⛽</span><strong>Dieseltank</strong><div class="msr-bar" style="--p:71%"><i id="msrFuelBar" style="width:71%"></i></div><small id="msrFuelPct">71%</small><span>›</span></div>
        <div class="msr-tankline water"><span class="ticon">💧</span><strong>Drinkwater</strong><div class="msr-bar"><i id="msrWaterBar" style="width:0%"></i></div><small id="msrWaterPct2">0%</small><span>›</span></div>
        <div class="msr-tankline water"><span class="ticon">▣</span><strong>Vuilwatertank</strong><div class="msr-bar"><i style="width:100%"></i></div><small>100%</small><span>›</span></div>
        <button class="msr-action" data-ms8263-go="technical">Alle tanks <span>›</span></button>
      </section>

      <section class="msr-panel msr-card">
        <div class="msr-card-title"><div class="msr-kicker"><span class="ico">⚙</span>SYSTEEMSTATUS</div></div>
        <div class="msr-status-grid">
          <div class="msr-status-item"><span class="msr-check">✓</span><div><strong>Victron GX</strong><small>Online</small></div></div>
          <div class="msr-status-item"><span class="msr-check">✓</span><div><strong>Walstroom</strong><small>Niet actief</small></div></div>
          <div class="msr-status-item"><span class="msr-check">✓</span><div><strong>SmartShunt</strong><small>Actief</small></div></div>
          <div class="msr-status-item"><span class="msr-check">✓</span><div><strong>Motor</strong><small>Stand-by</small></div></div>
          <div class="msr-status-item"><span class="msr-check">✓</span><div><strong>Zonnepanelen</strong><small id="msrSolarSub">Laden (20,1 V)</small></div></div>
          <div class="msr-status-item"><span class="msr-check">✓</span><div><strong>Nordkapp GEN3</strong><small id="msrHeaterState">Stand-by · Auto</small></div></div>
        </div>
        <div class="msr-heater" aria-label="Bijverwarming">
          <button type="button" id="msrHeaterPower" class="msr-heater-power" aria-pressed="false">⏻ <span>Uit</span></button>
          <div class="msr-heater-temp" aria-label="Gewenste temperatuur">
            <button type="button" id="msrHeaterDown" aria-label="Temperatuur lager">−</button>
            <strong id="msrHeaterTemp">20°</strong>
            <button type="button" id="msrHeaterUp" aria-label="Temperatuur hoger">+</button>
          </div>
          <button type="button" id="msrHeaterAuto" class="msr-heater-auto on" aria-pressed="true">AUTO</button>
        </div>
        <button class="msr-action" data-ms8263-go="technical">Naar techniek <span>›</span></button>
      </section>

      <section class="msr-panel msr-card">
        <div class="msr-card-title"><div class="msr-kicker"><span class="ico">▣</span>KOMENDE ITEMS</div><button class="msr-edit" data-ms8263-go="planner">Toon alles</button></div>
        <div class="msr-upcoming">
          <div class="msr-upcoming-item"><span class="uico">🛒</span><strong>Morgen 08:00</strong><span>Boodschappen en proviand</span></div>
          <div class="msr-upcoming-item"><span class="uico">🔧</span><strong>21 sep</strong><span>Onderhoud checklist</span></div>
          <div class="msr-upcoming-item"><span class="uico">⛽</span><strong>23 sep</strong><span>Diesel bijvullen (indicatie)</span></div>
          <div class="msr-upcoming-item"><span class="uico">⛵</span><strong>Weekend</strong><span>Proefvaart / testen</span></div>
        </div>
        <button class="msr-action" data-ms8263-go="planner">Naar reisplanner <span>›</span></button>
      </section>
    </section>

    <section class="ms8263-status msr-hidden-anchor" aria-hidden="true"></section>
    <section class="ms8263-welcome" aria-hidden="true"><button type="button" class="ms8263-start" data-ms8263-go="live">Live varen</button></section>
  </main>
 </div>`;
 bind();refreshData();startGps();updateClock();decorateReference();setTimeout(syncReference,120);setTimeout(syncReference,1200);
 clearInterval(window.__ms8263RefreshTimer);
 window.__ms8263RefreshTimer=setInterval(()=>{refreshData();syncReference();updateClock()},2000);
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
