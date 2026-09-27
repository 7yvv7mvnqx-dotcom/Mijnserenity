/* MijnSerenity 8.31.5 - live Victron Cerbo GX Remote Console op Home. */
(()=>{
'use strict';
if(window.__msVrmEmbed8315)return;
window.__msVrmEmbed8315=true;
window.__msVrmEmbed8314=true;
window.__msVrmEmbed8313=true;

const ROOT='ms8210Start';
const CONFIG_URL='/api/victron-console-config';
const GUI_URL='/victron-gui/index.html';
const TOKEN_KEYS=['ms7148_vrm_token','ms7148VrmToken','mijnserenity_vrm_token','vrm_api_token'];
const EMAIL_KEY='mijnserenity_vrm_mqtt_email';
const $=id=>document.getElementById(id);
let loading=false;
let readyTimer=0;

function savedToken(){
  for(const key of TOKEN_KEYS){
    const value=String(localStorage.getItem(key)||'').trim().replace(/^Token\s+/i,'');
    if(value)return value;
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
  window.dispatchEvent(new CustomEvent('mijnserenity:vrm-token-saved'));
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
function nodes(){
  return {
    panel:$('ms8315ConsolePanel'),
    frame:$('ms8315ConsoleFrame'),
    loading:$('ms8315ConsoleLoading'),
    normal:$('ms8315ConsoleLoadingNormal'),
    setup:$('ms8315ConsoleTokenSetup'),
    status:$('ms8315ConsoleStatus')
  };
}
function setStatus(text,state='loading'){
  const n=nodes();
  if(n.status)n.status.textContent=text;
  n.panel?.classList.toggle('loaded',state==='ready');
  n.panel?.classList.toggle('error',state==='error');
  if(n.loading){
    n.loading.classList.toggle('hidden',state==='ready');
    n.loading.classList.toggle('error',state==='error');
    const t=n.loading.querySelector('[data-ms8315-console-text]');
    if(t)t.textContent=text;
  }
}
function showTokenSetup(show=true){
  const n=nodes();
  n.setup?.classList.toggle('hidden',!show);
  n.normal?.classList.toggle('hidden',show);
  if(show)setTimeout(()=>$('ms8315ConsoleToken')?.focus(),80);
}
async function getConfig(token){
  const response=await fetch(CONFIG_URL,{
    method:'POST',
    cache:'no-store',
    headers:{'x-vrm-token':token,'accept':'application/json'}
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data?.success===false)throw new Error(data?.error||`HTTP ${response.status}`);
  return data;
}
function address(config,token){
  const email=saveEmail(config?.email||currentEmail());
  if(!email)throw new Error('Het e-mailadres van je VRM-account ontbreekt.');
  const payload={
    id:String(config?.portalId||''),
    shard:String(config?.shard||''),
    user:email,
    pass:`Token ${token}`
  };
  if(!payload.id||!payload.shard)throw new Error('VRM heeft geen live console-configuratie voor Serenity teruggegeven.');
  return `${GUI_URL}#msconfig=${encodeURIComponent(JSON.stringify(payload))}`;
}
function watchReady(frame){
  clearInterval(readyTimer);
  let checks=0;
  readyTimer=setInterval(()=>{
    checks++;
    try{
      if(frame?.contentWindow?.guiv2initialized===true){
        clearInterval(readyTimer);
        setStatus('LIVE','ready');
        return;
      }
    }catch{}
    if(checks>=240){
      clearInterval(readyTimer);
      setStatus('Console geladen · verbinding controleren','error');
    }
  },500);
}
async function loadFrame(force=false){
  if(loading)return false;
  const n=nodes();
  if(!n.panel||!n.frame)return false;
  if(!force&&n.frame.dataset.msStarted==='1')return true;

  const token=savedToken();
  if(!token){
    setStatus('VRM-token nodig','error');
    showTokenSetup(true);
    return false;
  }

  loading=true;
  showTokenSetup(false);
  n.frame.dataset.msStarted='1';
  setStatus('Verbinden…','loading');
  try{
    const config=await getConfig(token);
    const target=address(config,token);
    setStatus('Cerbo GX verbinden…','loading');
    try{n.frame.contentWindow.location.replace(target)}
    catch{n.frame.src=target}
    watchReady(n.frame);
    return true;
  }catch(error){
    n.frame.dataset.msStarted='0';
    setStatus(error?.message||'Console kon niet verbinden.','error');
    if(/token|toegang|account/i.test(String(error?.message||'')))showTokenSetup(true);
    return false;
  }finally{
    loading=false;
  }
}
function reload(){
  const n=nodes();
  if(!n.frame)return;
  clearInterval(readyTimer);
  n.frame.dataset.msStarted='0';
  try{n.frame.contentWindow.location.replace('about:blank')}catch{n.frame.src='about:blank'}
  setTimeout(()=>loadFrame(true),80);
}
function toggleFullscreen(){
  const active=document.body.classList.toggle('ms8315-console-full');
  const b=$('ms8315ConsoleExpand');
  if(b){
    b.textContent=active?'↙':'↗';
    b.setAttribute('aria-label',active?'Console verkleinen':'Console schermvullend');
  }
}
function bind(){
  const n=nodes();
  if(!n.panel||!n.frame)return false;
  if(n.panel.dataset.msBound!=='1'){
    n.panel.dataset.msBound='1';
    $('ms8315ConsoleReload')?.addEventListener('click',reload);
    $('ms8315ConsoleExpand')?.addEventListener('click',toggleFullscreen);
    $('ms8315ConsoleTokenToggle')?.addEventListener('click',event=>{
      const input=$('ms8315ConsoleToken');
      if(!input)return;
      const reveal=input.type==='password';
      input.type=reveal?'text':'password';
      event.currentTarget.textContent=reveal?'Verberg':'Toon';
    });
    $('ms8315ConsoleTokenSetup')?.addEventListener('submit',event=>{
      event.preventDefault();
      const input=$('ms8315ConsoleToken');
      const token=saveToken(input?.value);
      if(!token){setStatus('Plak eerst je VRM API-token.','error');input?.focus();return}
      if(input)input.value='';
      showTokenSetup(false);
      loadFrame(true);
    });
  }
  loadFrame(false);
  return true;
}
function start(){if(!bind())setTimeout(start,180)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('mijnserenity:dashboard-ready',()=>setTimeout(bind,40),{passive:true});
window.addEventListener('pageshow',()=>setTimeout(bind,40),{passive:true});
window.addEventListener('hashchange',()=>setTimeout(bind,40),{passive:true});
window.addEventListener('mijnserenity:vrm-token-saved',()=>setTimeout(()=>loadFrame(true),80),{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>loadFrame(false),80)},{passive:true});
new MutationObserver(()=>{const h=location.hash||'#dashboard';if(h==='#dashboard')bind()}).observe(document.documentElement,{childList:true,subtree:true});

window.ms8315ReloadConsole=reload;
window.ms8315ToggleConsoleFullscreen=toggleFullscreen;
})();
