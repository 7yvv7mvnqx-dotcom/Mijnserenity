/* MijnSerenity 7.18.26 — duidelijke alarmmeldingen op telefoon */
(()=>{
  'use strict';

  const BUILD='7.18.26';
  const STORAGE_KEY='mijnserenity-alarm-notifications-v71826';
  const SEEN_KEY='mijnserenity-alarm-notification-seen-v71826';
  const DEDUPE_MS=30*60*1000;
  const POLL_MS=5000;
  const SETUP_ID='msSerenityNotificationSetup';
  const ALARM_ID='msSerenityAlarmBanner';
  let installed=false;
  let lastFingerprint='';
  let activeFingerprint='';
  let lastHadWarning=false;
  let timer=null;

  const now=()=>Date.now();
  const $=id=>document.getElementById(id);
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[char]));

  function loadJson(key,fallback={}){
    try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch{return fallback}
  }

  function saveJson(key,value){
    try{localStorage.setItem(key,JSON.stringify(value))}catch{}
  }

  function notificationSupported(){
    return 'Notification' in window&&'serviceWorker' in navigator;
  }

  function permission(){
    return 'Notification' in window?Notification.permission:'unsupported';
  }

  function isStandalone(){
    try{return window.matchMedia?.('(display-mode: standalone)')?.matches||navigator.standalone===true}catch{return false}
  }

  function liveReady(){
    try{
      if(Array.isArray(window.ms730GetStateSnapshot?.())&&window.ms730GetStateSnapshot().length)return true;
    }catch{}
    try{
      const diagnosis=window.MIJSERENITY_VRM_DIAGNOSTICS;
      if(diagnosis?.battery?.voltage?.value!==undefined||diagnosis?.battery?.soc?.value!==undefined)return true;
    }catch{}
    return false;
  }

  function systemAlarm(){
    const node=$('mscSystem');
    const text=String(node?.textContent||'').trim();
    if(!text)return null;
    if(/^(ok|in orde|geen alarm|normaal|offline|–|-)$/i.test(text))return null;
    if(!/alarm|krit|critical|fout|error|laag|low|hoog|high|waarsch|warning/i.test(text))return null;
    const critical=/alarm|krit|critical|fout|error/i.test(text);
    return {
      level:critical?'critical':'warning',
      title:critical?'Cerbo / systeemalarm':'Cerbo waarschuwing',
      text,
      icon:critical?'🚨':'⚠️'
    };
  }

  function collectWarnings(){
    let warnings=[];
    try{
      if(typeof window.technicalWarnings==='function'){
        const result=window.technicalWarnings();
        if(Array.isArray(result))warnings=result.filter(item=>item&&['critical','warning'].includes(String(item.level||'').toLowerCase()));
      }
    }catch(error){console.warn('Serenity alarm: technische waarschuwingen konden niet worden gelezen.',error)}

    const system=systemAlarm();
    if(system)warnings.push(system);

    const unique=[];
    const seen=new Set();
    for(const item of warnings){
      const level=String(item.level||'warning').toLowerCase()==='critical'?'critical':'warning';
      const title=String(item.title||'Serenity waarschuwing').trim();
      const text=String(item.text||'Controleer MijnSerenity.').trim();
      const key=`${level}|${title}|${text}`;
      if(seen.has(key))continue;
      seen.add(key);
      unique.push({level,title,text,icon:item.icon||'⚠️'});
    }
    unique.sort((a,b)=>(a.level==='critical'?0:1)-(b.level==='critical'?0:1));
    return unique;
  }

  function fingerprint(item){
    return item?`${item.level}|${item.title}|${item.text}`:'';
  }

  function ensureStyles(){
    if($('msSerenityAlarmStyles'))return;
    const style=document.createElement('style');
    style.id='msSerenityAlarmStyles';
    style.textContent=`
      #${ALARM_ID}{position:fixed;z-index:2147483000;left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));top:max(12px,calc(env(safe-area-inset-top) + 8px));display:none;align-items:flex-start;gap:12px;padding:14px 14px 13px;border-radius:18px;color:#fff;box-shadow:0 16px 50px rgba(0,0,0,.38);font-family:inherit;-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}
      #${ALARM_ID}.show{display:flex;animation:msAlarmIn .22s ease-out}
      #${ALARM_ID}.critical{background:rgba(178,24,31,.96);border:1px solid rgba(255,255,255,.26)}
      #${ALARM_ID}.warning{background:rgba(191,105,7,.96);border:1px solid rgba(255,255,255,.22)}
      #${ALARM_ID} .ms-alarm-icon{font-size:26px;line-height:1}
      #${ALARM_ID} .ms-alarm-copy{min-width:0;flex:1}
      #${ALARM_ID} strong{display:block;font-size:16px;line-height:1.22;letter-spacing:.1px}
      #${ALARM_ID} p{margin:4px 0 0;font-size:13px;line-height:1.35;color:rgba(255,255,255,.92)}
      #${ALARM_ID} small{display:block;margin-top:5px;color:rgba(255,255,255,.72);font-size:11px}
      #${ALARM_ID} .ms-alarm-actions{display:flex;gap:8px;margin-top:9px}
      #${ALARM_ID} button{border:0;border-radius:10px;padding:7px 10px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
      #${ALARM_ID} .ms-alarm-details{background:#fff;color:#202226}
      #${ALARM_ID} .ms-alarm-close{background:rgba(255,255,255,.16);color:#fff}
      #${SETUP_ID}{position:fixed;z-index:2147482500;left:14px;right:14px;bottom:max(14px,calc(env(safe-area-inset-bottom) + 10px));margin:auto;max-width:520px;padding:14px;border-radius:18px;background:rgba(23,25,29,.96);border:1px solid rgba(255,255,255,.14);box-shadow:0 16px 45px rgba(0,0,0,.34);color:#fff;font-family:inherit;display:none}
      #${SETUP_ID}.show{display:block;animation:msAlarmIn .22s ease-out}
      #${SETUP_ID} strong{display:block;font-size:15px}
      #${SETUP_ID} p{margin:5px 0 10px;font-size:12px;line-height:1.38;color:rgba(255,255,255,.76)}
      #${SETUP_ID} .ms-notify-actions{display:flex;gap:8px;flex-wrap:wrap}
      #${SETUP_ID} button{border:0;border-radius:11px;padding:9px 12px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
      #${SETUP_ID} .enable{background:#fff;color:#1d2025}
      #${SETUP_ID} .later{background:rgba(255,255,255,.12);color:#fff}
      @keyframes msAlarmIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
    `;
    document.head.appendChild(style);
  }

  function navigateToDetails(){
    try{
      if(typeof window.captainNavigate==='function'){
        window.captainNavigate('technical');
        return;
      }
    }catch{}
    const technical=$('technical');
    if(technical){
      document.querySelectorAll('.page.active').forEach(node=>node.classList.remove('active'));
      technical.classList.add('active');
      technical.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }
    location.hash='technical';
  }

  function ensureAlarmBanner(){
    ensureStyles();
    let banner=$(ALARM_ID);
    if(banner)return banner;
    banner=document.createElement('aside');
    banner.id=ALARM_ID;
    banner.setAttribute('role','alert');
    banner.setAttribute('aria-live','assertive');
    banner.innerHTML=`
      <div class="ms-alarm-icon" aria-hidden="true">🚨</div>
      <div class="ms-alarm-copy">
        <strong>Serenity alarm</strong>
        <p>Controleer MijnSerenity.</p>
        <small></small>
        <div class="ms-alarm-actions">
          <button class="ms-alarm-details" type="button">Bekijk alarm</button>
          <button class="ms-alarm-close" type="button">Sluiten</button>
        </div>
      </div>`;
    banner.querySelector('.ms-alarm-details')?.addEventListener('click',()=>{
      banner.classList.remove('show');
      navigateToDetails();
    });
    banner.querySelector('.ms-alarm-close')?.addEventListener('click',()=>banner.classList.remove('show'));
    document.body.appendChild(banner);
    return banner;
  }

  function showAlarmBanner(item){
    if(!item)return;
    const banner=ensureAlarmBanner();
    banner.className=`show ${item.level}`;
    const icon=banner.querySelector('.ms-alarm-icon');
    const title=banner.querySelector('strong');
    const body=banner.querySelector('p');
    const time=banner.querySelector('small');
    if(icon)icon.textContent=item.level==='critical'?'🚨':'⚠️';
    if(title)title.textContent=item.title;
    if(body)body.textContent=item.text;
    if(time)time.textContent=`Serenity · ${new Date().toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}`;
  }

  function hideAlarmBanner(){
    $(ALARM_ID)?.classList.remove('show');
  }

  function setupDismissed(){
    return Boolean(loadJson(STORAGE_KEY,{}).dismissedAt);
  }

  function saveSetupDismissed(){
    const state=loadJson(STORAGE_KEY,{});
    state.dismissedAt=now();
    saveJson(STORAGE_KEY,state);
  }

  function ensureSetupCard(force=false){
    ensureStyles();
    if(permission()==='granted'){
      $(SETUP_ID)?.classList.remove('show');
      return null;
    }
    let card=$(SETUP_ID);
    if(!card){
      card=document.createElement('aside');
      card.id=SETUP_ID;
      card.setAttribute('aria-label','Serenity telefoonmeldingen instellen');
      document.body.appendChild(card);
    }

    const supported=notificationSupported();
    const denied=permission()==='denied';
    const iosHomeHint=!supported&&/iPhone|iPad|iPod/i.test(navigator.userAgent||'')&&!isStandalone();
    const explanation=denied
      ?'Meldingen staan geblokkeerd. Zet meldingen voor MijnSerenity aan in de iPhone-instellingen en open de app opnieuw.'
      :iosHomeHint
        ?'Voeg MijnSerenity eerst toe aan je beginscherm. Open daarna de app vanaf het beginscherm om meldingen in te schakelen.'
        :supported
          ?'Tik één keer op inschakelen. Daarna kan MijnSerenity duidelijke alarmmeldingen op deze telefoon tonen.'
          :'Deze browser ondersteunt geen webmeldingen voor MijnSerenity.';
    card.innerHTML=`
      <strong>🔔 Serenity-alarmen op je telefoon</strong>
      <p>${escapeHtml(explanation)}</p>
      <div class="ms-notify-actions">
        ${supported&&!denied?'<button class="enable" type="button">Meldingen inschakelen & testen</button>':''}
        <button class="later" type="button">${denied||!supported?'Sluiten':'Later'}</button>
      </div>`;
    card.querySelector('.enable')?.addEventListener('click',()=>requestPermissionAndTest());
    card.querySelector('.later')?.addEventListener('click',()=>{
      saveSetupDismissed();
      card.classList.remove('show');
    });
    if(force||!setupDismissed())card.classList.add('show');
    return card;
  }

  async function serviceWorkerRegistration(){
    if(!('serviceWorker' in navigator))return null;
    try{
      let registration=await navigator.serviceWorker.getRegistration('/');
      if(!registration)registration=await navigator.serviceWorker.ready;
      return registration||null;
    }catch{return null}
  }

  async function showOsNotification(item,{test=false}={}){
    if(permission()!=='granted')return false;
    const critical=item.level==='critical';
    const title=test?'✅ Serenity testmelding':critical?'🚨 SERENITY ALARM':'⚠️ Serenity waarschuwing';
    const body=test
      ?'Meldingen werken. Een echt alarm toont hier de oorzaak en actuele waarde.'
      :`${item.title} — ${item.text}`;
    const options={
      body,
      icon:'/icon-192.png',
      badge:'/favicon-64.png',
      tag:test?'serenity-notification-test':`serenity-${fingerprint(item).slice(0,80)}`,
      renotify:!test,
      requireInteraction:critical&&!test,
      silent:false,
      data:{url:'/?alarm=1',level:item.level,title:item.title,text:item.text,test},
      vibrate:critical?[300,120,300,120,500]:[180,80,180]
    };
    try{
      const registration=await serviceWorkerRegistration();
      if(registration?.showNotification){
        await registration.showNotification(title,options);
        return true;
      }
      const notification=new Notification(title,options);
      notification.onclick=()=>{window.focus();navigateToDetails();notification.close()};
      return true;
    }catch(error){
      console.warn('Serenity telefoonmelding mislukt:',error);
      return false;
    }
  }

  async function requestPermissionAndTest(){
    if(!('Notification' in window)){
      ensureSetupCard(true);
      return false;
    }
    let result=Notification.permission;
    try{
      if(result==='default')result=await Notification.requestPermission();
    }catch(error){console.warn('Serenity meldingsrechten konden niet worden gevraagd:',error)}
    if(result==='granted'){
      const state=loadJson(STORAGE_KEY,{});
      state.enabledAt=now();
      state.dismissedAt=0;
      saveJson(STORAGE_KEY,state);
      $(SETUP_ID)?.classList.remove('show');
      await showOsNotification({level:'warning',title:'Test',text:'Meldingen werken.'},{test:true});
      return true;
    }
    ensureSetupCard(true);
    return false;
  }

  async function test(){
    if(permission()!=='granted')return requestPermissionAndTest();
    return showOsNotification({level:'warning',title:'Test',text:'Meldingen werken.'},{test:true});
  }

  function recentlySent(fp){
    const seen=loadJson(SEEN_KEY,{});
    const sentAt=Number(seen[fp]||0);
    return sentAt&&now()-sentAt<DEDUPE_MS;
  }

  function markSent(fp){
    const seen=loadJson(SEEN_KEY,{});
    const cutoff=now()-24*60*60*1000;
    Object.keys(seen).forEach(key=>{if(Number(seen[key]||0)<cutoff)delete seen[key]});
    seen[fp]=now();
    saveJson(SEEN_KEY,seen);
  }

  async function sync({forceNotification=false}={}){
    const warnings=collectWarnings();
    const item=warnings[0]||null;
    const fp=fingerprint(item);

    if(!item){
      lastHadWarning=false;
      activeFingerprint='';
      lastFingerprint='';
      hideAlarmBanner();
      return {level:'ok',warnings:[]};
    }

    showAlarmBanner(item);
    const newOccurrence=!lastHadWarning||fp!==activeFingerprint;
    lastHadWarning=true;
    activeFingerprint=fp;

    const canNotify=liveReady()||Boolean(systemAlarm())||forceNotification;
    if(canNotify&&permission()==='granted'&&(forceNotification||newOccurrence)&&(!recentlySent(fp)||forceNotification)){
      const sent=await showOsNotification(item);
      if(sent)markSent(fp);
    }
    lastFingerprint=fp;
    return {level:item.level,warnings};
  }

  function handleServiceWorkerMessage(event){
    const data=event?.data||{};
    if(data.type==='mijnserenity-open-alarm')navigateToDetails();
  }

  function maybeOpenAlarmFromUrl(){
    try{
      const url=new URL(location.href);
      if(url.searchParams.get('alarm')==='1'){
        setTimeout(navigateToDetails,350);
        url.searchParams.delete('alarm');
        history.replaceState(history.state,'',url.pathname+url.search+url.hash);
      }
    }catch{}
  }

  function install(){
    if(installed)return;
    installed=true;
    ensureStyles();
    ensureAlarmBanner();
    setTimeout(()=>ensureSetupCard(false),1200);
    maybeOpenAlarmFromUrl();

    const resync=()=>setTimeout(()=>sync(),80);
    [
      'mijnserenity-ha-state-updated',
      'mijnserenity-ha-connected',
      'mijnserenity-vrm-diagnostics-updated',
      'mijnserenity-ruuvi-vrm-updated',
      'mijnserenity:modules-ready'
    ].forEach(name=>window.addEventListener(name,resync));
    window.addEventListener('focus',resync);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')resync()});
    navigator.serviceWorker?.addEventListener?.('message',handleServiceWorkerMessage);

    timer=setInterval(()=>{if(document.visibilityState==='visible')sync()},POLL_MS);
    setTimeout(()=>sync(),700);

    window.MijnSerenityAlarmNotifications={
      build:BUILD,
      requestPermission:requestPermissionAndTest,
      test,
      sync,
      showSetup:()=>ensureSetupCard(true),
      status:()=>({permission:permission(),supported:notificationSupported(),standalone:isStandalone(),activeFingerprint,lastFingerprint})
    };
    window.dispatchEvent(new CustomEvent('mijnserenity-alarm-notifications-ready',{detail:{build:BUILD}}));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
