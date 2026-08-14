/* MijnSerenity 8.0.2 — Entertainment Pro */
(function(){
'use strict';
if(window.__msEntertainmentPro802)return;
window.__msEntertainmentPro802=true;

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={source:localStorage.getItem('ms802_media_source')||'radio',timer:null,timerEnd:0};

function injectStyle(){
 if($('ms802EntertainmentProStyle'))return;
 const s=document.createElement('style');
 s.id='ms802EntertainmentProStyle';
 s.textContent=`
 #ms802EntertainmentPro{display:grid;gap:14px;margin:14px 0 18px}
 .ms802-pro-shell{overflow:hidden;border:1px solid rgba(126,211,255,.22);border-radius:26px;background:radial-gradient(circle at 88% 8%,rgba(91,124,255,.2),transparent 34%),radial-gradient(circle at 8% 92%,rgba(0,220,180,.12),transparent 32%),linear-gradient(145deg,rgba(7,27,47,.98),rgba(4,15,29,.99));box-shadow:0 20px 50px rgba(0,0,0,.22)}
 .ms802-pro-top{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(260px,.75fr);gap:14px;padding:18px}
 .ms802-now{display:grid;grid-template-columns:92px minmax(0,1fr);gap:16px;align-items:center;min-width:0}
 .ms802-art{width:92px;height:92px;border-radius:23px;display:grid;place-items:center;font-size:40px;background:linear-gradient(145deg,rgba(54,188,255,.24),rgba(137,83,255,.18));border:1px solid rgba(255,255,255,.1);box-shadow:inset 0 0 24px rgba(255,255,255,.04)}
 .ms802-now small{display:block;letter-spacing:.12em;font-weight:900;font-size:10px;color:#8fb8ce}.ms802-now h3{margin:4px 0 3px;font-size:clamp(1.35rem,3vw,2rem)}.ms802-now p{margin:0;opacity:.72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .ms802-source-pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:13px}.ms802-source-pills button{min-height:38px;padding:8px 12px;border-radius:999px}.ms802-source-pills button.active{background:linear-gradient(145deg,#30b8ff,#7057ff);border-color:transparent;box-shadow:0 8px 24px rgba(48,184,255,.2)}
 .ms802-controls{display:grid;align-content:center;gap:10px;padding:14px;border-radius:22px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07)}
 .ms802-control-row{display:grid;grid-template-columns:repeat(5,minmax(44px,1fr));gap:8px}.ms802-control-row button{min-width:0;height:48px;padding:0;border-radius:16px;font-size:1.08rem}.ms802-control-row .main{height:56px;font-size:1.28rem;background:linear-gradient(145deg,#2ba9ff,#6a55ff)}
 .ms802-vol{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center}.ms802-vol input{width:100%}.ms802-vol b{min-width:40px;text-align:right}
 .ms802-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:0 18px 18px}.ms802-card{min-width:0;padding:14px;border-radius:19px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07);text-align:left}.ms802-card span{font-size:22px;display:block;margin-bottom:8px}.ms802-card strong,.ms802-card small{display:block}.ms802-card small{margin-top:3px;opacity:.66;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .ms802-section{padding:17px;border-radius:22px;background:rgba(8,27,45,.82);border:1px solid rgba(139,215,255,.14)}.ms802-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:11px}.ms802-section-head h4{margin:2px 0 0}.ms802-favs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.ms802-fav{display:grid;grid-template-columns:auto minmax(0,1fr);gap:9px;align-items:center;text-align:left;min-width:0}.ms802-fav span{font-size:20px}.ms802-fav b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .ms802-modes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.ms802-mode{min-height:62px;text-align:left;border-radius:17px}.ms802-mode strong,.ms802-mode small{display:block}.ms802-mode small{opacity:.65;margin-top:3px}.ms802-timer-active{border-color:rgba(255,193,75,.6)!important;background:rgba(122,78,8,.24)!important}
 .ms802-note{font-size:.78rem;opacity:.66;margin:0;padding:0 2px}
 @media(max-width:850px){.ms802-pro-top{grid-template-columns:1fr}.ms802-grid{grid-template-columns:1fr 1fr}.ms802-favs{grid-template-columns:1fr 1fr}.ms802-modes{grid-template-columns:1fr 1fr}}
 @media(max-width:480px){.ms802-pro-top{padding:14px}.ms802-now{grid-template-columns:72px minmax(0,1fr)}.ms802-art{width:72px;height:72px;border-radius:19px;font-size:31px}.ms802-grid{padding:0 14px 14px}.ms802-favs{grid-template-columns:1fr}.ms802-control-row{grid-template-columns:repeat(5,1fr);gap:6px}.ms802-control-row button{height:44px}.ms802-source-pills button{font-size:.82rem;padding:7px 10px}}
 `;
 document.head.appendChild(s);
}

function cfg(){try{return typeof ms712Config==='function'?ms712Config():{};}catch(e){return {};}}
function favorites(){const c=cfg();return Array.isArray(c.favorites)?c.favorites:[];}
function sourceIcon(){return state.source==='spotify'?'🎵':state.source==='tv'?'📺':state.source==='bluetooth'?'🔵':'📻';}
function sourceLabel(){return ({radio:'Radio',spotify:'Spotify',tv:'TV',bluetooth:'Bluetooth'})[state.source]||'Media';}
function activePlayer(){const c=cfg(),list=(c.players||[]).filter(p=>p.entityId);return list.find(p=>p.key===c.activePlayer)||list[0]||null;}
function setSource(source){state.source=source;localStorage.setItem('ms802_media_source',source);render();if(source==='spotify'&&typeof ms716OpenSpotify==='function')ms716OpenSpotify();if(source==='bluetooth'&&typeof ms716BluetoothHelp==='function')ms716BluetoothHelp();}
window.ms802SetSource=setSource;

function command(cmd){try{if(typeof ms712Command==='function')ms712Command(cmd);}catch(e){console.warn(e)}}
function volume(v){const val=Math.max(0,Math.min(100,Number(v)||0));const input=$('entertainmentVolume');if(input){input.value=String(val);input.dispatchEvent(new Event('change',{bubbles:true}));}const out=$('ms802VolValue');if(out)out.textContent=`${Math.round(val)}%`;}
window.ms802Volume=volume;

function playFav(i){try{if(typeof ms712PlayFavoriteByOriginalIndex==='function')ms712PlayFavoriteByOriginalIndex(i);}catch(e){console.warn(e)}}
window.ms802PlayFav=playFav;
function favIcon(f){const t=`${f?.mediaContentType||''} ${f?.name||''}`.toLowerCase();if(t.includes('radio')||t.includes('station'))return '📻';if(t.includes('playlist')||t.includes('spotify'))return '🎵';return '⭐';}

function mode(name){
 const actions={
  chill:()=>{volume(24);try{window.ms712SceneCommand?.(0)}catch(e){}},
  party:()=>{volume(55);try{window.ms712SceneCommand?.(0)}catch(e){}},
  night:()=>{volume(15);try{window.ms712SceneCommand?.(2)}catch(e){}},
  off:()=>{command('stop');try{window.ms712AllHueOff?.()}catch(e){}}
 };
 actions[name]?.();
 if(typeof showAppToast==='function')showAppToast(name==='off'?'Entertainment uit':'Sfeerstand actief');
}
window.ms802Mode=mode;

function setTimer(minutes){
 if(state.timer)clearTimeout(state.timer);
 state.timer=null;state.timerEnd=0;
 if(!minutes){render();return;}
 state.timerEnd=Date.now()+minutes*60000;
 state.timer=setTimeout(()=>{command('stop');state.timer=null;state.timerEnd=0;render();if(typeof showAppToast==='function')showAppToast('Slaaptimer: audio gestopt');},minutes*60000);
 render();
}
window.ms802SetTimer=setTimer;
function timerText(){if(!state.timerEnd)return 'Slaaptimer';const m=Math.max(1,Math.ceil((state.timerEnd-Date.now())/60000));return `Slaaptimer · ${m} min`;}

function render(){
 injectStyle();
 const page=$('entertainment');if(!page)return;
 let root=$('ms802EntertainmentPro');
 if(!root){root=document.createElement('div');root.id='ms802EntertainmentPro';const hero=page.querySelector('.entertainment-hero');hero?.insertAdjacentElement('afterend',root);}
 const c=cfg(),player=activePlayer(),vol=Math.round(Number(c.volume)||35);
 const favs=favorites().map((f,i)=>({...f,i})).filter(f=>f.mediaContentId);
 root.innerHTML=`
 <section class="ms802-pro-shell">
  <div class="ms802-pro-top">
   <div class="ms802-now"><div class="ms802-art">${sourceIcon()}</div><div><small>NOW PLAYING · ENTERTAINMENT PRO</small><h3>${sourceLabel()}</h3><p>${player?`Audiozone: ${esc(player.name)}`:'Kies of configureer een audiozone'}</p><div class="ms802-source-pills"><button class="${state.source==='radio'?'active':''}" onclick="ms802SetSource('radio')">📻 Radio</button><button class="${state.source==='spotify'?'active':''}" onclick="ms802SetSource('spotify')">🎵 Spotify</button><button class="${state.source==='bluetooth'?'active':''}" onclick="ms802SetSource('bluetooth')">🔵 Bluetooth</button><button class="${state.source==='tv'?'active':''}" onclick="ms802SetSource('tv')">📺 TV</button></div></div></div>
   <div class="ms802-controls"><div class="ms802-control-row"><button class="secondary" onclick="ms712Command('previous')">⏮</button><button class="secondary" onclick="ms712Command('volume_down')">🔉</button><button class="main" onclick="ms712Command('play_pause')">⏯</button><button class="secondary" onclick="ms712Command('volume_up')">🔊</button><button class="secondary" onclick="ms712Command('next')">⏭</button></div><div class="ms802-vol"><span>VOL</span><input type="range" min="0" max="100" value="${vol}" oninput="document.getElementById('ms802VolValue').textContent=this.value+'%'" onchange="ms802Volume(this.value)"><b id="ms802VolValue">${vol}%</b></div></div>
  </div>
  <div class="ms802-grid"><button class="ms802-card" onclick="ms802SetSource('radio')"><span>📻</span><strong>Radio</strong><small>Favoriete zenders direct starten</small></button><button class="ms802-card" onclick="ms802SetSource('spotify')"><span>🎵</span><strong>Spotify</strong><small>Open Spotify en speel via Serenity</small></button><button class="ms802-card" onclick="ms802SetSource('bluetooth')"><span>🔵</span><strong>Bluetooth</strong><small>iPhone/iPad koppelen met boordradio</small></button><button class="ms802-card" onclick="ms802SetSource('tv')"><span>📺</span><strong>TV</strong><small>Apple TV / smart-tv bediening</small></button></div>
 </section>
 <section class="ms802-section"><div class="ms802-section-head"><div><span class="eyebrow">FAVORIETEN</span><h4>Zenders & playlists</h4></div><button class="secondary" onclick="ms712ToggleSettings(true)">Beheren</button></div><div class="ms802-favs">${favs.length?favs.map(f=>`<button class="secondary ms802-fav" onclick="ms802PlayFav(${f.i})"><span>${favIcon(f)}</span><b>${esc(f.name)}</b></button>`).join(''):'<div class="entertainment-empty-state compact"><strong>Nog geen favorieten</strong><small>Voeg radiozenders en Spotify-playlists toe via Beheren.</small></div>'}</div></section>
 <section class="ms802-section"><div class="ms802-section-head"><div><span class="eyebrow">SERENITY MODES</span><h4>Sfeer met één tik</h4></div><button class="secondary ${state.timerEnd?'ms802-timer-active':''}" onclick="ms802SetTimer(${state.timerEnd?0:30})">⏱ ${timerText()}</button></div><div class="ms802-modes"><button class="ms802-mode" onclick="ms802Mode('chill')"><strong>🌊 Chill</strong><small>Rustig volume & sfeer</small></button><button class="ms802-mode" onclick="ms802Mode('party')"><strong>✨ Party</strong><small>Meer volume & licht</small></button><button class="ms802-mode" onclick="ms802Mode('night')"><strong>🌙 Nacht</strong><small>Zacht en gedimd</small></button><button class="ms802-mode" onclick="ms802Mode('off')"><strong>⏻ Alles uit</strong><small>Audio stoppen & licht uit</small></button></div></section>
 <p class="ms802-note">Bluetooth-koppeling zelf loopt via iOS/iPadOS; browsers mogen Bluetooth-audio-uitvoer niet rechtstreeks overnemen. Bediening van gekoppelde media-apparaten loopt via Home Assistant.</p>`;
}

function relabel(){
 const tab=document.querySelector('.tab[data-target="entertainment"]');if(tab)tab.textContent='Entertainment Pro';
 document.querySelectorAll('.bottom-nav-item[data-target="entertainment"]').forEach(b=>{b.title='Entertainment Pro';b.setAttribute('aria-label','Entertainment Pro');const span=b.querySelector('span');if(span)span.textContent='🎵';});
 const hero=$('entertainment')?.querySelector('.entertainment-hero');if(hero){const e=hero.querySelector('.eyebrow');if(e)e.textContent='SERENITY ENTERTAINMENT PRO';const h=hero.querySelector('h2');if(h)h.textContent='Media Center';const p=hero.querySelector('p.small');if(p)p.textContent='Radio, Spotify, Bluetooth, TV, favoriete zenders en afspeellijsten in één premium bedieningsscherm.';}
}
function boot(){injectStyle();relabel();render();setInterval(()=>{if(state.timerEnd)render();},60000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('msentertainmentrefresh',render);
})();