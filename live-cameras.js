/* MijnSerenity 7.3.3 — twee Home Assistant-camera's met play/pauze */
(()=>{
  'use strict';
  const KEY='mijnserenity-live-camera-config-v733';
  const SELECT_KEY='mijnserenity-ha-live-cameras-v733';
  const DEFAULTS=[
    {key:'radarbeugel',name:'Camera radarbeugel',entityId:'camera.serenity_live_weergave'},
    {key:'oprit',name:'Camera oprit',entityId:'camera.oprit_live_weergave'}
  ];
  const runtime=new Map();
  let installed=false;

  function escape(value){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function normalise(item,index){
    const fallback=DEFAULTS[index]||{key:`camera-${index+1}`,name:`Camera ${index+1}`,entityId:''};
    return {
      key:String(item?.key||fallback.key).replace(/[^a-z0-9_-]/gi,'-'),
      name:String(item?.name||fallback.name).trim()||fallback.name,
      entityId:String(item?.entityId||item?.entity_id||fallback.entityId).trim()
    };
  }
  function readSelected(){
    try{
      const selected=JSON.parse(localStorage.getItem(SELECT_KEY)||'[]');
      if(Array.isArray(selected)&&selected.length){
        const priority=[];
        const byId=new Map(selected.map(item=>[item.entityId||item.entity_id,item]));
        for(const def of DEFAULTS)if(byId.has(def.entityId))priority.push(byId.get(def.entityId));
        for(const item of selected)if(!priority.includes(item))priority.push(item);
        return priority.slice(0,2).map(normalise);
      }
    }catch{}
    return [];
  }
  function readConfig(){
    try{
      const saved=JSON.parse(localStorage.getItem(KEY)||'[]');
      if(Array.isArray(saved)&&saved.length)return [0,1].map(i=>normalise(saved[i],i));
    }catch{}
    const selected=readSelected();
    if(selected.length)return [0,1].map(i=>normalise(selected[i],i));
    return DEFAULTS.map(normalise);
  }
  function saveConfig(cameras){localStorage.setItem(KEY,JSON.stringify(cameras.map(normalise)))}
  function cameras(){return readConfig()}
  function state(key){
    if(!runtime.has(key))runtime.set(key,{playing:false,busy:false,timer:null,objectUrl:'',failures:0,lastFrame:null});
    return runtime.get(key);
  }
  function liveVisible(){return !document.getElementById('live')?.classList.contains('hidden')}
  function board(){return document.querySelector('.live-radar-camera-card')}
  function el(key,suffix){return document.getElementById(`ms732-${key}-${suffix}`)}

  function clearTimer(rt){if(rt.timer){clearTimeout(rt.timer);rt.timer=null}}
  function revoke(rt){if(rt.objectUrl){URL.revokeObjectURL(rt.objectUrl);rt.objectUrl=''}}
  function schedule(camera,delay=1200){
    const rt=state(camera.key);clearTimer(rt);
    if(!rt.playing||document.hidden||!liveVisible())return;
    rt.timer=setTimeout(()=>loadFrame(camera),Math.max(850,delay));
  }
  function setBadge(camera,label,kind=''){
    const badge=el(camera.key,'badge');if(!badge)return;
    badge.textContent=label;badge.className=`ms732-camera-badge ${kind}`.trim();
  }
  function setMessage(camera,message){const target=el(camera.key,'message');if(target)target.textContent=message||''}
  function updateButton(camera){
    const rt=state(camera.key);const button=el(camera.key,'toggle');
    if(button)button.textContent=rt.playing?'⏸ Pauze':'▶ Afspelen';
  }

  async function loadFrame(camera,force=false){
    const rt=state(camera.key);
    if((!rt.playing&&!force)||rt.busy)return;
    if(!camera.entityId){setBadge(camera,'Niet ingesteld','error');setMessage(camera,'Vul een camera-entiteit in.');return}
    if(typeof window.ms730FetchCameraFrame!=='function'){
      setBadge(camera,'HA niet klaar','error');
      setMessage(camera,'Open Home Assistant en koppel eerst je account.');
      return;
    }
    rt.busy=true;setBadge(camera,'Verbinden…','loading');
    el(camera.key,'loading')?.classList.remove('hidden');
    try{
      const blob=await window.ms730FetchCameraFrame(camera.entityId);
      const nextUrl=URL.createObjectURL(blob);
      const image=el(camera.key,'image');
      const previous=rt.objectUrl;
      rt.objectUrl=nextUrl;rt.failures=0;rt.lastFrame=new Date();
      if(image){
        image.onload=()=>{if(previous)URL.revokeObjectURL(previous)};
        image.src=nextUrl;image.classList.remove('hidden');
      }else if(previous)URL.revokeObjectURL(previous);
      el(camera.key,'placeholder')?.classList.add('hidden');
      setBadge(camera,rt.playing?'● Live':'Actueel',rt.playing?'live':'');
      setMessage(camera,`Beeld ${rt.lastFrame.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`);
      const full=document.getElementById('ms732CameraFullscreen');
      if(full&&!full.classList.contains('hidden')&&full.dataset.cameraKey===camera.key){
        const fullImg=document.getElementById('ms732CameraFullscreenImage');if(fullImg)fullImg.src=nextUrl;
      }
    }catch(error){
      rt.failures++;
      if(camera.key==='radarbeugel'){
        rt.playing=false;
        setBadge(camera,'Bootcamera offline','error');
        setMessage(camera,'Wifi of camera op de boot is niet bereikbaar. Tik op Afspelen zodra de boot weer online is.');
      }else{
        setBadge(camera,'Geen beeld','error');
        setMessage(camera,error?.message||'Camerabeeld kon niet worden geladen.');
        if(rt.failures>=3)rt.playing=false;
      }
    }finally{
      rt.busy=false;el(camera.key,'loading')?.classList.add('hidden');updateButton(camera);
      if(rt.playing)schedule(camera,rt.failures?3000:1200);
    }
  }

  function play(key){
    const camera=cameras().find(item=>item.key===key);if(!camera)return;
    const rt=state(key);rt.playing=true;rt.failures=0;updateButton(camera);loadFrame(camera,true);
  }
  function pause(key,show=true){
    const camera=cameras().find(item=>item.key===key);if(!camera)return;
    const rt=state(key);rt.playing=false;clearTimer(rt);updateButton(camera);
    setBadge(camera,rt.lastFrame?'Gepauzeerd':'Gereed','');
    if(show)setMessage(camera,rt.lastFrame?'Livebeeld gepauzeerd.':'Tik op Afspelen om livebeeld te starten.');
  }
  function toggle(key){state(key).playing?pause(key):play(key)}
  function playAll(){for(const camera of cameras())play(camera.key)}
  function pauseAll(show=true){for(const camera of cameras())pause(camera.key,show)}
  function refresh(key){const camera=cameras().find(item=>item.key===key);if(camera)loadFrame(camera,true)}

  function openFullscreen(key){
    const camera=cameras().find(item=>item.key===key);if(!camera)return;
    let overlay=document.getElementById('ms732CameraFullscreen');
    if(!overlay){
      overlay=document.createElement('div');overlay.id='ms732CameraFullscreen';overlay.className='ms732-camera-fullscreen hidden';
      overlay.innerHTML='<div class="ms732-camera-fullscreen-head"><strong id="ms732CameraFullscreenTitle">Camera</strong><button type="button" onclick="ms732CloseCameraFullscreen()">×</button></div><img id="ms732CameraFullscreenImage" alt="Volledig camerabeeld">';
      document.body.appendChild(overlay);
    }
    overlay.dataset.cameraKey=key;overlay.classList.remove('hidden');document.body.style.overflow='hidden';
    const title=document.getElementById('ms732CameraFullscreenTitle');if(title)title.textContent=camera.name;
    const src=el(key,'image')?.src;if(src)document.getElementById('ms732CameraFullscreenImage').src=src;
    if(!state(key).playing)play(key);
  }
  function closeFullscreen(){
    const overlay=document.getElementById('ms732CameraFullscreen');overlay?.classList.add('hidden');
    document.body.style.overflow='';
  }

  function settingsHtml(list){return `<details class="ms732-camera-settings"><summary>⚙️ Camera’s instellen</summary><div class="ms732-camera-settings-grid">${list.map((camera,index)=>`<label>${escape(camera.name)}<input id="ms732-setting-name-${index}" value="${escape(camera.name)}"></label><label>Home Assistant-entiteit<input id="ms732-setting-entity-${index}" value="${escape(camera.entityId)}" placeholder="camera.naam_live_weergave"></label>`).join('')}</div><div class="actions"><button type="button" onclick="ms732SaveCameraSettings()">💾 Bewaren</button><button type="button" class="secondary" onclick="captainNavigate('entertainment')">🏠 Home Assistant koppelen</button></div><p class="ms732-camera-help">Standaard: <code>camera.serenity_live_weergave</code> en <code>camera.oprit_live_weergave</code>. De beelden lopen rechtstreeks via Home Assistant en gebruiken geen Supabase-opslag.</p></details>`}
  function tile(camera){return `<article class="ms732-camera-tile"><div class="ms732-camera-title-row"><h3>${escape(camera.name)}</h3><span id="ms732-${escape(camera.key)}-badge" class="ms732-camera-badge">Gereed</span></div><div class="ms732-camera-viewport"><img id="ms732-${escape(camera.key)}-image" class="hidden" alt="${escape(camera.name)}"><div id="ms732-${escape(camera.key)}-placeholder" class="ms732-camera-placeholder"><span>📹</span><b>${escape(camera.name)}</b><small>Tik op Afspelen voor actueel beeld.</small></div><div id="ms732-${escape(camera.key)}-loading" class="ms732-camera-loading hidden">Beeld ophalen…</div></div><div class="ms732-camera-meta"><span id="ms732-${escape(camera.key)}-message">Nog niet gestart</span><span>${escape(camera.entityId)}</span></div><div class="ms732-camera-actions"><button id="ms732-${escape(camera.key)}-toggle" type="button" onclick="ms732ToggleCamera('${escape(camera.key)}')">▶ Afspelen</button><button type="button" class="secondary" onclick="ms732RefreshCamera('${escape(camera.key)}')">↻ Nu</button><button type="button" class="secondary" onclick="ms732OpenCameraFullscreen('${escape(camera.key)}')">⛶ Groot</button></div></article>`}

  function render(){
    const target=board();if(!target)return false;
    const list=cameras();target.classList.add('ms732-camera-board');
    target.innerHTML=`<div class="ms732-camera-board-head"><div><span class="eyebrow">HOME ASSISTANT · LIVE CAMERA’S</span><h2>Radarbeugel en oprit</h2><p class="small">Twee beveiligde camera’s met afzonderlijke play- en pauzeknop.</p></div><div class="ms732-camera-board-actions"><button type="button" onclick="ms732PlayAllLiveCameras()">▶ Alles afspelen</button><button type="button" class="secondary" onclick="ms732PauseAllLiveCameras()">⏸ Alles pauzeren</button></div></div><div class="ms732-camera-grid">${list.map(tile).join('')}</div>${settingsHtml(list)}`;
    for(const camera of list)updateButton(camera);
    return true;
  }

  function saveSettings(){
    pauseAll(false);
    const list=[0,1].map((index)=>normalise({
      key:DEFAULTS[index].key,
      name:document.getElementById(`ms732-setting-name-${index}`)?.value,
      entityId:document.getElementById(`ms732-setting-entity-${index}`)?.value
    },index));
    saveConfig(list);runtime.clear();render();showAppToast?.('Camera’s voor Live varen opgeslagen ✅');
  }

  function init(){
    if(!installed){installed=true;render()}
    else if(!document.querySelector('.ms732-camera-grid'))render();
    if(typeof window.ms730HomeAssistantConnected==='function'&&!window.ms730HomeAssistantConnected()){
      for(const camera of cameras()){setBadge(camera,'HA koppelen','error');setMessage(camera,'Koppel Home Assistant via het Home Assistant-scherm.');}
    }
  }

  window.ms733InitLiveCameras=init;
  window.ms732InitLiveCameras=init;
  window.ms732ToggleCamera=toggle;
  window.ms732RefreshCamera=refresh;
  window.ms732PlayAllLiveCameras=playAll;
  window.ms733PauseAllLiveCameras=pauseAll;
  window.ms732PauseAllLiveCameras=pauseAll;
  window.ms732OpenCameraFullscreen=openFullscreen;
  window.ms732CloseCameraFullscreen=closeFullscreen;
  window.ms732SaveCameraSettings=saveSettings;

  document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseAll(false)});
  window.addEventListener('mijnserenity-ha-cameras-updated',()=>{localStorage.removeItem(KEY);pauseAll(false);runtime.clear();render()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else queueMicrotask(init);
})();
