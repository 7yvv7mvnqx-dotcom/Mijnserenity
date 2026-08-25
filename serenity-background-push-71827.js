/* MijnSerenity 7.18.27 — Web Push registratie voor alarmen als de app gesloten is */
(()=>{
  'use strict';

  const BUILD='7.18.27';
  const STATE_KEY='mijnserenity-background-push-v71827';
  const TOKEN_KEYS=['ms7148_vrm_token','ms7148VrmToken','mijnserenity_vrm_token','vrm_api_token'];
  const RUUVI_CONFIG_KEY='mijnserenity-ruuvi-climate-v7102';
  let busy=false;
  let retryTimer=null;

  function client(){
    try{return typeof sb!=='undefined'?sb:null}catch{return null}
  }
  function boat(){
    try{return typeof currentBoat!=='undefined'?currentBoat:null}catch{return null}
  }
  function user(){
    try{return typeof currentUser!=='undefined'?currentUser:null}catch{return null}
  }
  function loadState(){
    try{return JSON.parse(localStorage.getItem(STATE_KEY)||'{}')||{}}catch{return {}}
  }
  function saveState(patch){
    try{localStorage.setItem(STATE_KEY,JSON.stringify({...loadState(),...patch,updatedAt:new Date().toISOString()}))}catch{}
  }
  function savedVrmToken(){
    for(const key of TOKEN_KEYS){
      const value=localStorage.getItem(key);
      if(value&&String(value).trim())return String(value).trim().replace(/^Token\s+/i,'');
    }
    try{
      const config=JSON.parse(localStorage.getItem(RUUVI_CONFIG_KEY)||'{}');
      if(config?.vrmToken&&String(config.vrmToken).trim())return String(config.vrmToken).trim().replace(/^Token\s+/i,'');
    }catch{}
    return '';
  }
  function supported(){
    return 'Notification' in window&&'serviceWorker' in navigator&&'PushManager' in window;
  }
  function base64UrlToUint8Array(value){
    const padding='='.repeat((4-value.length%4)%4);
    const base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/');
    const raw=atob(base64);
    return Uint8Array.from([...raw].map(char=>char.charCodeAt(0)));
  }
  function keyToBase64Url(key){
    if(!key)return '';
    const bytes=new Uint8Array(key);
    let binary='';
    bytes.forEach(byte=>binary+=String.fromCharCode(byte));
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  async function invoke(body){
    const supabase=client();
    if(!supabase?.functions?.invoke)throw new Error('Supabase is nog niet gereed.');
    const {data,error}=await supabase.functions.invoke('serenity-push',{body});
    if(error)throw error;
    if(!data?.success)throw new Error(data?.error||'Achtergrondmeldingen konden niet worden ingesteld.');
    return data;
  }
  async function serviceWorker(){
    let registration=await navigator.serviceWorker.getRegistration('/');
    if(!registration)registration=await navigator.serviceWorker.ready;
    return registration||null;
  }
  function currentSubscriptionKey(subscription){
    try{return keyToBase64Url(subscription?.options?.applicationServerKey)}catch{return ''}
  }
  async function ensureSubscription(publicKey){
    const registration=await serviceWorker();
    if(!registration?.pushManager)throw new Error('PushManager is niet beschikbaar.');
    let subscription=await registration.pushManager.getSubscription();
    const previousKey=currentSubscriptionKey(subscription);
    const state=loadState();
    if(subscription&&((previousKey&&previousKey!==publicKey)||(!previousKey&&state.vapidPublicKey&&state.vapidPublicKey!==publicKey))){
      try{await subscription.unsubscribe()}catch{}
      subscription=null;
    }
    if(!subscription){
      subscription=await registration.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:base64UrlToUint8Array(publicKey)
      });
    }
    return subscription;
  }
  function statusText(state){
    if(state==='active')return 'Achtergrondalarmen actief';
    if(state==='vrm_token_required')return 'VRM-token nodig voor achtergrondalarmen';
    if(state==='permission_required')return 'Meldingen nog niet toegestaan';
    if(state==='unsupported')return 'Achtergrondmeldingen niet ondersteund';
    if(state==='waiting')return 'Achtergrondmeldingen worden gekoppeld';
    if(state==='error')return 'Achtergrondmeldingen konden niet worden gekoppeld';
    return 'Achtergrondmeldingen';
  }
  function publish(state,extra={}){
    saveState({state,...extra});
    window.MIJSERENITY_BACKGROUND_PUSH={build:BUILD,state,...extra,active:state==='active'};
    window.dispatchEvent(new CustomEvent('mijnserenity-background-push-updated',{detail:window.MIJSERENITY_BACKGROUND_PUSH}));
    const setup=document.getElementById('msSerenityNotificationSetup');
    if(setup){
      let label=setup.querySelector('[data-ms-background-push-status]');
      if(!label){
        label=document.createElement('small');
        label.dataset.msBackgroundPushStatus='1';
        label.style.cssText='display:block;margin-top:8px;opacity:.72;font-size:11px;line-height:1.35';
        setup.appendChild(label);
      }
      label.textContent=statusText(state);
    }
  }
  async function register({force=false}={}){
    if(busy)return false;
    if(!supported()){
      publish('unsupported');
      return false;
    }
    if(Notification.permission!=='granted'){
      publish('permission_required');
      return false;
    }
    const activeBoat=boat(),activeUser=user(),supabase=client();
    if(!activeBoat?.id||!activeUser||!supabase){
      publish('waiting');
      return false;
    }
    const vrmToken=savedVrmToken();
    if(!vrmToken){
      publish('vrm_token_required');
      return false;
    }
    const state=loadState();
    if(!force&&state.state==='active'&&state.boatId===activeBoat.id&&state.registeredAt&&Date.now()-Date.parse(state.registeredAt)<12*60*60*1000){
      window.MIJSERENITY_BACKGROUND_PUSH={build:BUILD,...state,active:true};
      return true;
    }

    busy=true;
    publish('waiting');
    try{
      const config=await invoke({action:'config'});
      const publicKey=String(config?.publicKey||'');
      if(publicKey.length<40)throw new Error('Web Push sleutel ontbreekt.');
      const subscription=await ensureSubscription(publicKey);
      const json=subscription.toJSON();
      await invoke({
        action:'register',
        boatId:activeBoat.id,
        vrmToken,
        subscription:json,
        userAgent:navigator.userAgent||''
      });
      const registeredAt=new Date().toISOString();
      publish('active',{
        active:true,
        boatId:activeBoat.id,
        endpoint:json.endpoint||'',
        vapidPublicKey:publicKey,
        registeredAt,
        permission:Notification.permission
      });
      return true;
    }catch(error){
      console.warn('Serenity achtergrondmeldingen koppelen mislukt:',error);
      publish('error',{active:false,error:String(error?.message||error).slice(0,300)});
      return false;
    }finally{
      busy=false;
    }
  }
  async function unsubscribe(){
    try{
      const registration=await serviceWorker();
      const subscription=await registration?.pushManager?.getSubscription();
      if(subscription){
        try{
          const supabase=client();
          if(supabase?.rpc)await supabase.rpc('disable_serenity_push',{p_endpoint:subscription.endpoint});
        }catch{}
        await subscription.unsubscribe();
      }
    }catch{}
    publish('permission_required',{active:false,registeredAt:null,endpoint:''});
    return true;
  }
  async function testBackgroundRegistration(){
    return register({force:true});
  }
  function scheduleRetry(delay=1500){
    clearTimeout(retryTimer);
    retryTimer=setTimeout(()=>register().catch(()=>{}),delay);
  }
  function install(){
    window.MijnSerenityBackgroundPush={
      build:BUILD,
      register:()=>register({force:true}),
      refresh:()=>register({force:true}),
      unsubscribe,
      status:()=>({supported:supported(),permission:'Notification' in window?Notification.permission:'unsupported',...loadState()}),
      testRegistration:testBackgroundRegistration
    };
    if(Notification.permission==='granted')scheduleRetry(500);
    else publish(supported()?'permission_required':'unsupported');

    ['mijnserenity-alarm-notifications-ready','mijnserenity:modules-ready','mijnserenity-vrm-diagnostics-updated','mijnserenity-ha-connected'].forEach(name=>{
      window.addEventListener(name,()=>scheduleRetry(250));
    });
    window.addEventListener('focus',()=>scheduleRetry(350));
    window.addEventListener('pageshow',()=>scheduleRetry(350));
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleRetry(300)});
    setInterval(()=>{
      if(document.visibilityState==='visible'&&Notification.permission==='granted'&&loadState().state!=='active')register().catch(()=>{});
    },15000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
