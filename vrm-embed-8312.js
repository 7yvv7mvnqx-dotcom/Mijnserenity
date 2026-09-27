/* MijnSerenity 8.31.4-isolated — Victron Cerbo GX Remote Console.
   Alleen het bestaande Victron-vak wordt vervangen; Home, navigatie en bootloader blijven ongemoeid. */
(()=>{
'use strict';
if(window.__msVrmEmbed8318)return;
window.__msVrmEmbed8318=true;
window.__msVrmEmbed8314=true;
window.__msVrmEmbed8313=true;

const ROOT='ms8210Start';
const PANEL='.msr-vrm-live';
const CONFIG_URL='/api/victron-console-config';
const GUI_URL='/victron-gui/index.html';
const STYLE_ID='ms8318VictronIsolatedStyle';
const TOKEN_KEYS=['ms7148_vrm_token','ms7148VrmToken','mijnserenity_vrm_token','vrm_api_token'];
const EMAIL_KEY='mijnserenity_vrm_mqtt_email';
const $=id=>document.getElementById(id);

let loading=false;
let readyTimer=0;
let timeoutTimer=0;
let observerQueued=false;

function installStyle(){
  if($(STYLE_ID))return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
    #${ROOT} .ms8263-main{
      grid-template-rows:clamp(142px,19vh,178px) minmax(0,1fr)!important;
      gap:.75vh!important;
      overflow:hidden!important
    }
    #${ROOT} .ms8263-main>.msr-row{display:none!important}
    #${ROOT} .msr-vrm-live{
      position:relative!important;
      display:grid!important;
      grid-template-rows:44px minmax(0,1fr)!important;
      min-height:0!important;
      height:100%!important;
      overflow:hidden!important;
      border:1px solid rgba(26,128,165,.70)!important;
      border-radius:17px!important;
      background:#01080d!important;
      box-shadow:0 10px 22px rgba(0,0,0,.20)!important
    }
    #${ROOT} .ms8318-head{
      display:flex;align-items:center;gap:10px;min-height:44px;
      padding:6px 10px 6px 12px;
      border-bottom:1px solid rgba(37,172,219,.28);
      background:linear-gradient(90deg,#061b29,#03121c);
      color:#fff
    }
    #${ROOT} .ms8318-logo{
      display:grid;place-items:center;width:30px;height:30px;flex:0 0 30px;
      border-radius:9px;background:#0d77b8;color:#fff;font-weight:900
    }
    #${ROOT} .ms8318-title{min-width:0;flex:1;line-height:1.05}
    #${ROOT} .ms8318-title strong{display:block;font-size:12px}
    #${ROOT} .ms8318-title small{display:block;margin-top:3px;color:#8fb7ca;font-size:8.5px}
    #${ROOT} .ms8318-state{
      display:flex;align-items:center;gap:6px;padding:5px 8px;
      border:1px solid rgba(68,171,208,.28);border-radius:999px;
      background:#062536;color:#bcd2dc;font-size:8.5px;font-weight:800;white-space:nowrap
    }
    #${ROOT} .ms8318-state i{width:7px;height:7px;border-radius:50%;background:#e1ad39;box-shadow:0 0 7px rgba(225,173,57,.45)}
    #${ROOT} .msr-vrm-live.ms8318-ready .ms8318-state i{background:#2bd46d;box-shadow:0 0 8px rgba(43,212,109,.55)}
    #${ROOT} .msr-vrm-live.ms8318-error .ms8318-state i{background:#ef5b62;box-shadow:0 0 8px rgba(239,91,98,.45)}
    #${ROOT} .ms8318-tools{display:flex;gap:5px}
    #${ROOT} .ms8318-tools button{
      display:grid;place-items:center;width:31px;height:31px;min-height:31px;padding:0;
      border:1px solid rgba(63,176,217,.30);border-radius:9px;
      background:#092b3d;color:#fff;font-size:15px;cursor:pointer
    }
    #${ROOT} .ms8318-tools button:active{transform:scale(.96)}
    #${ROOT} .ms8318-view{position:relative;min-height:0;height:100%;overflow:hidden;background:#000}
    #${ROOT} #ms8318ConsoleFrame{display:block;width:100%!important;height:100%!important;border:0!important;background:#000!important}
    #${ROOT} .ms8318-overlay{
      position:absolute;inset:0;z-index:4;display:grid;place-items:center;padding:18px;
      background:#01080d;color:#c5d7e1;text-align:center;font-size:11px;line-height:1.45;
      transition:opacity .2s ease
    }
    #${ROOT} .ms8318-overlay.hidden{opacity:0;pointer-events:none}
    #${ROOT} .ms8318-overlay.error{background:#10090b;color:#ffd4d4}
    #${ROOT} .ms8318-spinner{
      width:27px;height:27px;margin:0 auto 10px;border:3px solid rgba(94,190,235,.18);
      border-top-color:#42baff;border-radius:50%;animation:ms8318spin .85s linear infinite
    }
    #${ROOT} .ms8318-overlay.error .ms8318-spinner{display:none}
    @keyframes ms8318spin{to{transform:rotate(360deg)}}
    #${ROOT} .ms8318-token{
      width:min(100%,420px);padding:16px;border:1px solid rgba(77,184,230,.30);
      border-radius:14px;background:#071c2a;text-align:left;color:#eef8fd
    }
    #${ROOT} .ms8318-token.hidden{display:none}
    #${ROOT} .ms8318-token h3{margin:0 0 6px;font-size:16px}
    #${ROOT} .ms8318-token p{margin:0 0 10px;color:#aac4d0;font-size:10px}
    #${ROOT} .ms8318-token-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px}
    #${ROOT} .ms8318-token input{
      min-width:0;height:38px;padding:0 10px;border:1px solid rgba(88,190,235,.35);
      border-radius:9px;background:#020d14;color:#fff;font-size:12px
    }
    #${ROOT} .ms8318-token button{
      min-height:38px;padding:0 11px;border:1px solid rgba(88,190,235,.34);
      border-radius:9px;background:#0a3550;color:#fff;font-weight:800
    }
    #${ROOT} .ms8318-token .save{width:100%;margin-top:7px;background:#0878bd}
    body.ms8318-console-full #${ROOT} .msr-vrm-live{
      position:fixed!important;inset:8px!important;z-index:2147483000!important;
      height:auto!important;border-radius:16px!important;background:#01080d!important
    }
    body.ms8318-console-full #${ROOT} .ms8318-view{min-height:0!important}
    @media(max-width:900px) and (orientation:portrait){
      #${ROOT} .ms8263-main{display:block!important;overflow:visible!important}
      #${ROOT} .msr-vrm-live{height:720px!important;min-height:720px!important;margin-bottom:10px!important}
      #${ROOT} .ms8318-title small{display:none}
    }
  `;
  document.head.appendChild(s);
}

function savedToken(){
  for(const key of TOKEN_KEYS){
    try{
      const value=String(localStorage.getItem(key)||'').trim().replace(/^Token\s+/i,'');
      if(value)return value;
    }catch{}
  }
  return '';
}
function saveToken(value){
  const token=String(value||'').trim().replace(/^Token\s+/i,'');
  if(!token)return '';
  for(const key of TOKEN_KEYS){try{localStorage.setItem(key,token)}catch{}}
  try{
    const k='mijnserenity-ruuvi-climate-v7102';
    const cfg=JSON.parse(localStorage.getItem(k)||'{}');
    localStorage.setItem(k,JSON.stringify({...cfg,vrmToken:token}));
  }catch{}
  return token;
}
function currentEmail(){
  try{
    const saved=String(localStorage.getItem(EMAIL_KEY)||'').trim();
    if(saved.includes('@'))return saved;
  }catch{}
  try{
    const email=String(window.currentUser?.email||'').trim();
    if(email.includes('@'))return email;
  }catch{}
  const login=String($('email')?.value||'').trim();
  return login.includes('@')?login:'';
}
function saveEmail(value){
  const email=String(value||'').trim();
  if(email.includes('@'))try{localStorage.setItem(EMAIL_KEY,email)}catch{}
  return email;
}
function panel(){return document.querySelector('#'+ROOT+' '+PANEL)}
function refs(){
  const p=panel();
  return{
    panel:p,
    frame:p?.querySelector('#ms8318ConsoleFrame')||null,
    overlay:p?.querySelector('#ms8318Overlay')||null,
    normal:p?.querySelector('#ms8318Normal')||null,
    setup:p?.querySelector('#ms8318TokenSetup')||null,
    status:p?.querySelector('#ms8318Status')||null
  };
}
function stopTimers(){clearInterval(readyTimer);clearTimeout(timeoutTimer)}
function setStatus(text,state='loading'){
  const r=refs();
  if(r.status)r.status.textContent=text;
  r.panel?.classList.toggle('ms8318-ready',state==='ready');
  r.panel?.classList.toggle('ms8318-error',state==='error');
  if(r.overlay){
    r.overlay.classList.toggle('hidden',state==='ready');
    r.overlay.classList.toggle('error',state==='error');
    const t=r.overlay.querySelector('[data-ms8318-text]');
    if(t)t.textContent=text;
  }
}
function showToken(show){
  const r=refs();
  r.setup?.classList.toggle('hidden',!show);
  r.normal?.classList.toggle('hidden',show);
}
async function getConfig(token){
  const ctl=new AbortController();
  const timer=setTimeout(()=>ctl.abort(),9000);
  try{
    const response=await fetch(CONFIG_URL,{
      method:'POST',cache:'no-store',
      headers:{'x-vrm-token':token,'accept':'application/json'},
      signal:ctl.signal
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data?.success===false)throw new Error(data?.error||('HTTP '+response.status));
    return data;
  }finally{clearTimeout(timer)}
}
function makeGuiUrl(config,token){
  const email=saveEmail(config?.email||currentEmail());
  if(!email)throw new Error('VRM-account e-mailadres ontbreekt.');
  const mqttUser=email.toLowerCase().startsWith('vrmlogin_live_')?email:'vrmlogin_live_'+email;
  const payload={
    id:String(config?.portalId||''),
    shard:String(config?.shard||''),
    user:mqttUser,
    pass:'Token '+token
  };
  if(!payload.id||!payload.shard)throw new Error('Geen live console-configuratie ontvangen.');
  return GUI_URL+'#msconfig='+encodeURIComponent(JSON.stringify(payload));
}
function watchReady(frame){
  stopTimers();
  let checks=0;
  readyTimer=setInterval(()=>{
    checks++;
    try{
      if(frame?.contentWindow?.guiv2initialized===true){
        stopTimers();
        setStatus('LIVE','ready');
        return;
      }
    }catch{}
    if(checks>=40){
      clearInterval(readyTimer);
      readyTimer=0;
      const r=refs();
      if(r.overlay&&!r.overlay.classList.contains('hidden')){
        r.overlay.classList.add('hidden');
        if(r.status)r.status.textContent='Console geladen';
      }
    }
  },500);
  timeoutTimer=setTimeout(()=>{
    const r=refs();
    if(r.overlay&&!r.overlay.classList.contains('hidden')){
      r.overlay.classList.add('hidden');
      if(r.status)r.status.textContent='Console geladen';
    }
  },12000);
}
async function connect(force=false){
  const r=refs();
  if(!r.panel||!r.frame||loading)return false;
  if(!force&&r.frame.dataset.msStarted==='1')return true;
  const token=savedToken();
  if(!token){
    setStatus('VRM-token nodig','error');
    showToken(true);
    return false;
  }
  loading=true;
  showToken(false);
  r.frame.dataset.msStarted='1';
  setStatus('Verbinden…','loading');
  try{
    const config=await getConfig(token);
    const target=makeGuiUrl(config,token);
    r.frame.onload=()=>{
      setTimeout(()=>{
        const rr=refs();
        if(rr.overlay&&!rr.overlay.classList.contains('hidden')){
          rr.overlay.classList.add('hidden');
          if(rr.status)rr.status.textContent='Console geladen';
        }
      },700);
    };
    r.frame.src=target;
    setStatus('Cerbo GX verbinden…','loading');
    watchReady(r.frame);
    return true;
  }catch(error){
    r.frame.dataset.msStarted='0';
    const msg=error?.name==='AbortError'?'Victron verbinding time-out':(error?.message||'Console kon niet verbinden.');
    setStatus(msg,'error');
    if(/token|toegang|account|e-mailadres/i.test(msg))showToken(true);
    return false;
  }finally{
    loading=false;
  }
}
function reload(){
  const r=refs();
  if(!r.frame)return;
  stopTimers();
  r.frame.dataset.msStarted='0';
  r.frame.src='about:blank';
  setStatus('Opnieuw verbinden…','loading');
  setTimeout(()=>connect(true),100);
}
function fullscreen(){
  const active=document.body.classList.toggle('ms8318-console-full');
  const b=$('ms8318Expand');
  if(b){
    b.textContent=active?'↙':'↗';
    b.title=active?'Console verkleinen':'Console schermvullend';
    b.setAttribute('aria-label',b.title);
  }
}
function renderPanel(){
  const p=panel();
  if(!p)return false;
  installStyle();
  if(p.dataset.ms8318Rendered==='1'){
    connect(false);
    return true;
  }
  p.dataset.ms8318Rendered='1';
  p.id='ms8318ConsolePanel';
  p.setAttribute('aria-label','Victron Cerbo GX Remote Console');
  p.innerHTML=`
    <div class="ms8318-head">
      <div class="ms8318-logo">V</div>
      <div class="ms8318-title">
        <strong>Victron Cerbo GX · Remote Console</strong>
        <small>Officiële GUI-v2 · donkere weergave · live bediening</small>
      </div>
      <div class="ms8318-state"><i></i><span id="ms8318Status">Verbinden…</span></div>
      <div class="ms8318-tools">
        <button type="button" id="ms8318Reload" title="Console vernieuwen" aria-label="Console vernieuwen">↻</button>
        <button type="button" id="ms8318Expand" title="Console schermvullend" aria-label="Console schermvullend">↗</button>
      </div>
    </div>
    <div class="ms8318-view">
      <div class="ms8318-overlay" id="ms8318Overlay">
        <div id="ms8318Normal"><div class="ms8318-spinner"></div><strong data-ms8318-text>Live Cerbo-console wordt voorbereid…</strong></div>
        <form class="ms8318-token hidden" id="ms8318TokenSetup" autocomplete="off">
          <h3>Victron koppelen</h3>
          <p>Plak je VRM API-token om de live Cerbo-console te openen.</p>
          <div class="ms8318-token-row">
            <input id="ms8318Token" type="password" autocapitalize="none" spellcheck="false" placeholder="VRM API-token" required>
            <button type="button" id="ms8318TokenToggle">Toon</button>
          </div>
          <button type="submit" class="save">Token opslaan en verbinden</button>
        </form>
      </div>
      <iframe id="ms8318ConsoleFrame" title="Victron Cerbo GX Remote Console" allow="fullscreen; clipboard-read; clipboard-write" referrerpolicy="no-referrer"></iframe>
    </div>
  `;
  $('ms8318Reload')?.addEventListener('click',reload);
  $('ms8318Expand')?.addEventListener('click',fullscreen);
  $('ms8318TokenToggle')?.addEventListener('click',event=>{
    const input=$('ms8318Token');
    if(!input)return;
    const reveal=input.type==='password';
    input.type=reveal?'text':'password';
    event.currentTarget.textContent=reveal?'Verberg':'Toon';
  });
  $('ms8318TokenSetup')?.addEventListener('submit',event=>{
    event.preventDefault();
    const input=$('ms8318Token');
    const token=saveToken(input?.value);
    if(!token){setStatus('Plak eerst je VRM API-token.','error');return}
    if(input)input.value='';
    showToken(false);
    const r=refs();
    if(r.frame)r.frame.dataset.msStarted='0';
    connect(true);
  });
  connect(false);
  return true;
}
function queueRender(){
  if(observerQueued)return;
  observerQueued=true;
  requestAnimationFrame(()=>{
    observerQueued=false;
    if((location.hash||'#dashboard')==='#dashboard')renderPanel();
  });
}
function start(){
  let tries=0;
  const attempt=()=>{
    tries++;
    if(renderPanel()||tries>=80)return;
    setTimeout(attempt,150);
  };
  attempt();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('mijnserenity:dashboard-ready',()=>setTimeout(renderPanel,40),{passive:true});
window.addEventListener('pageshow',()=>setTimeout(renderPanel,50),{passive:true});
window.addEventListener('hashchange',()=>setTimeout(renderPanel,50),{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(renderPanel,80)},{passive:true});
new MutationObserver(queueRender).observe(document.documentElement,{childList:true,subtree:true});

window.ms8318ReloadVictronConsole=reload;
window.ms8318ToggleVictronConsoleFullscreen=fullscreen;
})();
