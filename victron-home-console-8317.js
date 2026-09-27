/* MijnSerenity 8.31.7 - Victron Home Console, geladen nadat het dashboard bestaat. */
(()=>{
'use strict';
if(window.__msVictronHomeConsole8317)return;
window.__msVictronHomeConsole8317=true;

const CONFIG_URL='/api/victron-console-config';
const GUI_URL='/victron-gui/index.html';
const TOKEN_KEYS=['ms7148_vrm_token','ms7148VrmToken','mijnserenity_vrm_token','vrm_api_token'];
const EMAIL_KEY='mijnserenity_vrm_mqtt_email';
const $=id=>document.getElementById(id);
let loading=false, readyTimer=0, timeoutTimer=0;

function savedToken(){
  for(const key of TOKEN_KEYS){
    try{
      const v=String(localStorage.getItem(key)||'').trim().replace(/^Token\s+/i,'');
      if(v)return v;
    }catch{}
  }
  return '';
}
function saveToken(value){
  const token=String(value||'').trim().replace(/^Token\s+/i,'');
  if(!token)return '';
  for(const key of TOKEN_KEYS){try{localStorage.setItem(key,token)}catch{}}
  return token;
}
function currentEmail(){
  try{
    const v=String(localStorage.getItem(EMAIL_KEY)||'').trim();
    if(v.includes('@'))return v;
  }catch{}
  try{
    const v=String(currentUser?.email||'').trim();
    if(v.includes('@'))return v;
  }catch{}
  const v=String($('email')?.value||'').trim();
  return v.includes('@')?v:'';
}
function saveEmail(v){
  const email=String(v||'').trim();
  if(email.includes('@'))try{localStorage.setItem(EMAIL_KEY,email)}catch{}
  return email;
}
function refs(){
  return {
    panel:$('ms8316ConsolePanel'),
    frame:$('ms8316ConsoleFrame'),
    loading:$('ms8316ConsoleLoading'),
    normal:$('ms8316ConsoleLoadingNormal'),
    setup:$('ms8316ConsoleTokenSetup'),
    status:$('ms8316ConsoleStatus')
  };
}
function stopTimers(){clearInterval(readyTimer);clearTimeout(timeoutTimer)}
function status(text,state='loading'){
  const r=refs();
  if(r.status)r.status.textContent=text;
  r.panel?.classList.toggle('loaded',state==='ready');
  r.panel?.classList.toggle('error',state==='error');
  if(r.loading){
    r.loading.classList.toggle('hidden',state==='ready');
    r.loading.classList.toggle('error',state==='error');
    const t=r.loading.querySelector('[data-ms8316-console-text]');
    if(t)t.textContent=text;
  }
}
function tokenSetup(show){
  const r=refs();
  r.setup?.classList.toggle('hidden',!show);
  r.normal?.classList.toggle('hidden',show);
}
async function config(token){
  const ctl=new AbortController();
  const timer=setTimeout(()=>ctl.abort(),8000);
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
function guiUrl(cfg,token){
  const email=saveEmail(cfg?.email||currentEmail());
  if(!email)throw new Error('VRM-account e-mailadres ontbreekt.');
  const payload={id:String(cfg?.portalId||''),shard:String(cfg?.shard||''),user:email,pass:'Token '+token};
  if(!payload.id||!payload.shard)throw new Error('Geen live console-configuratie ontvangen.');
  return GUI_URL+'#msconfig='+encodeURIComponent(JSON.stringify(payload));
}
function watch(frame){
  stopTimers();
  let checks=0;
  readyTimer=setInterval(()=>{
    checks++;
    try{
      if(frame?.contentWindow?.guiv2initialized===true){
        stopTimers();status('LIVE','ready');return;
      }
    }catch{}
    if(checks>=30){stopTimers();status('Geen live verbinding · tik ↻','error')}
  },500);
  timeoutTimer=setTimeout(()=>{
    if(!refs().panel?.classList.contains('loaded'))status('Geen live verbinding · tik ↻','error');
  },15000);
}
async function connect(force=false){
  const r=refs();
  if(!r.panel||!r.frame||loading)return false;
  if(!force&&r.frame.dataset.started==='1')return true;
  const token=savedToken();
  if(!token){status('VRM-token nodig','error');tokenSetup(true);return false}
  loading=true;tokenSetup(false);r.frame.dataset.started='1';status('Verbinden…','loading');
  try{
    const cfg=await config(token);
    r.frame.src=guiUrl(cfg,token);
    status('Cerbo GX verbinden…','loading');
    watch(r.frame);
    return true;
  }catch(err){
    r.frame.dataset.started='0';
    const msg=err?.name==='AbortError'?'Victron verbinding time-out':(err?.message||'Console kon niet verbinden.');
    status(msg,'error');
    if(/token|toegang|account|e-mailadres/i.test(msg))tokenSetup(true);
    return false;
  }finally{loading=false}
}
function reload(){
  const r=refs();if(!r.frame)return;
  stopTimers();r.frame.dataset.started='0';r.frame.src='about:blank';status('Opnieuw verbinden…','loading');
  setTimeout(()=>connect(true),100);
}
function fullscreen(){
  const active=document.body.classList.toggle('ms8316-console-full');
  const b=$('ms8316ConsoleExpand');
  if(b){b.textContent=active?'↙':'↗';b.title=active?'Console verkleinen':'Console schermvullend'}
}
function mount(){
  const r=refs();
  if(!r.panel||!r.frame)return false;
  if(r.panel.dataset.consoleBound!=='1'){
    r.panel.dataset.consoleBound='1';
    $('ms8316ConsoleReload')?.addEventListener('click',reload);
    $('ms8316ConsoleExpand')?.addEventListener('click',fullscreen);
    $('ms8316ConsoleTokenToggle')?.addEventListener('click',e=>{
      const input=$('ms8316ConsoleToken');if(!input)return;
      const show=input.type==='password';input.type=show?'text':'password';e.currentTarget.textContent=show?'Verberg':'Toon';
    });
    $('ms8316ConsoleTokenSetup')?.addEventListener('submit',e=>{
      e.preventDefault();
      const input=$('ms8316ConsoleToken'), token=saveToken(input?.value);
      if(!token){status('Plak eerst je VRM API-token.','error');return}
      if(input)input.value='';r.frame.dataset.started='0';tokenSetup(false);connect(true);
    });
  }
  connect(false);
  return true;
}
window.ms8317MountVictronConsole=mount;
window.ms8317ReloadConsole=reload;
window.ms8317ToggleConsoleFullscreen=fullscreen;
setTimeout(mount,20);
})();