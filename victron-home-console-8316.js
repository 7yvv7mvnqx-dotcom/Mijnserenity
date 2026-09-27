/* MijnSerenity 8.31.6 - stabiele Victron Cerbo GX Remote Console op Home. */
(()=>{
'use strict';
if(window.__msVictronHomeConsole8316)return;
window.__msVictronHomeConsole8316=true;

const CONFIG_URL='/api/victron-console-config';
const GUI_URL='/victron-gui/index.html';
const TOKEN_KEYS=['ms7148_vrm_token','ms7148VrmToken','mijnserenity_vrm_token','vrm_api_token'];
const EMAIL_KEY='mijnserenity_vrm_mqtt_email';
const $=id=>document.getElementById(id);

let loading=false;
let readyTimer=0;
let connectTimer=0;

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
    if(typeof currentUser!=='undefined'&&String(currentUser?.email||'').includes('@'))return String(currentUser.email).trim();
  }catch{}
  const login=String($('email')?.value||'').trim();
  return login.includes('@')?login:'';
}
function saveEmail(value){
  const email=String(value||'').trim();
  if(email.includes('@'))try{localStorage.setItem(EMAIL_KEY,email)}catch{}
  return email;
}
function n(){
  return {
    panel:$('ms8316ConsolePanel'),
    frame:$('ms8316ConsoleFrame'),
    loading:$('ms8316ConsoleLoading'),
    normal:$('ms8316ConsoleLoadingNormal'),
    setup:$('ms8316ConsoleTokenSetup'),
    status:$('ms8316ConsoleStatus')
  };
}
function setStatus(text,state='loading'){
  const x=n();
  if(x.status)x.status.textContent=text;
  x.panel?.classList.toggle('loaded',state==='ready');
  x.panel?.classList.toggle('error',state==='error');
  if(x.loading){
    x.loading.classList.toggle('hidden',state==='ready');
    x.loading.classList.toggle('error',state==='error');
    const t=x.loading.querySelector('[data-ms8316-console-text]');
    if(t)t.textContent=text;
  }
}
function showTokenSetup(show){
  const x=n();
  x.setup?.classList.toggle('hidden',!show);
  x.normal?.classList.toggle('hidden',show);
}
async function getConfig(token){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  try{
    const response=await fetch(CONFIG_URL,{
      method:'POST',
      cache:'no-store',
      headers:{'x-vrm-token':token,'accept':'application/json'},
      signal:controller.signal
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data?.success===false)throw new Error(data?.error||('HTTP '+response.status));
    return data;
  }finally{clearTimeout(timer)}
}
function frameAddress(config,token){
  const email=saveEmail(config?.email||currentEmail());
  if(!email)throw new Error('VRM-account e-mailadres ontbreekt.');
  const payload={
    id:String(config?.portalId||''),
    shard:String(config?.shard||''),
    user:email,
    pass:'Token '+token
  };
  if(!payload.id||!payload.shard)throw new Error('Geen live console-configuratie ontvangen.');
  return GUI_URL+'#msconfig='+encodeURIComponent(JSON.stringify(payload));
}
function stopTimers(){
  clearInterval(readyTimer);
  clearTimeout(connectTimer);
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
      stopTimers();
      setStatus('Console reageert niet · tik ↻','error');
    }
  },500);
  connectTimer=setTimeout(()=>{
    try{
      if(!n().panel?.classList.contains('loaded'))setStatus('Console reageert niet · tik ↻','error');
    }catch{}
  },20000);
}
async function loadFrame(force=false){
  const x=n();
  if(!x.panel||!x.frame||loading)return false;
  if(!force&&x.frame.dataset.msStarted==='1')return true;

  const token=savedToken();
  if(!token){
    setStatus('VRM-token nodig','error');
    showTokenSetup(true);
    return false;
  }

  loading=true;
  showTokenSetup(false);
  x.frame.dataset.msStarted='1';
  setStatus('Verbinden…','loading');
  try{
    const config=await getConfig(token);
    const target=frameAddress(config,token);
    setStatus('Cerbo GX verbinden…','loading');
    x.frame.src=target;
    watchReady(x.frame);
    return true;
  }catch(error){
    x.frame.dataset.msStarted='0';
    const msg=error?.name==='AbortError'?'Victron verbinding time-out':(error?.message||'Console kon niet verbinden.');
    setStatus(msg,'error');
    if(/token|toegang|account/i.test(msg))showTokenSetup(true);
    return false;
  }finally{
    loading=false;
  }
}
function reload(){
  const x=n();
  if(!x.frame)return;
  stopTimers();
  x.frame.dataset.msStarted='0';
  setStatus('Opnieuw verbinden…','loading');
  x.frame.src='about:blank';
  setTimeout(()=>loadFrame(true),120);
}
function toggleFullscreen(){
  const active=document.body.classList.toggle('ms8316-console-full');
  const b=$('ms8316ConsoleExpand');
  if(b){
    b.textContent=active?'↙':'↗';
    b.title=active?'Console verkleinen':'Console schermvullend';
    b.setAttribute('aria-label',b.title);
  }
}
function bind(){
  const x=n();
  if(!x.panel||!x.frame)return false;
  if(x.panel.dataset.msBound!=='1'){
    x.panel.dataset.msBound='1';
    $('ms8316ConsoleReload')?.addEventListener('click',reload);
    $('ms8316ConsoleExpand')?.addEventListener('click',toggleFullscreen);
    $('ms8316ConsoleTokenToggle')?.addEventListener('click',event=>{
      const input=$('ms8316ConsoleToken');
      if(!input)return;
      const reveal=input.type==='password';
      input.type=reveal?'text':'password';
      event.currentTarget.textContent=reveal?'Verberg':'Toon';
    });
    $('ms8316ConsoleTokenSetup')?.addEventListener('submit',event=>{
      event.preventDefault();
      const input=$('ms8316ConsoleToken');
      const token=saveToken(input?.value);
      if(!token){setStatus('Plak eerst je VRM API-token.','error');return}
      if(input)input.value='';
      showTokenSetup(false);
      x.frame.dataset.msStarted='0';
      loadFrame(true);
    });
  }
  loadFrame(false);
  return true;
}
function mount(){
  if(!bind())return false;
  return true;
}
function start(){
  let tries=0;
  const attempt=()=>{
    tries++;
    if(mount()||tries>80)return;
    setTimeout(attempt,150);
  };
  attempt();
}

window.ms8316ReloadConsole=reload;
window.ms8316ToggleConsoleFullscreen=toggleFullscreen;
window.ms8316MountVictronConsole=mount;

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('mijnserenity:dashboard-ready',()=>setTimeout(mount,30),{passive:true});
window.addEventListener('pageshow',()=>setTimeout(mount,30),{passive:true});
window.addEventListener('hashchange',()=>setTimeout(mount,30),{passive:true});
window.addEventListener('mijnserenity:vrm-token-saved',()=>setTimeout(()=>loadFrame(true),80),{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(mount,60)},{passive:true});
new MutationObserver(()=>{if((location.hash||'#dashboard')==='#dashboard')mount()}).observe(document.documentElement,{childList:true,subtree:true});
})();