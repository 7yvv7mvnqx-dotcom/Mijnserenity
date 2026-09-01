/* MijnSerenity 8.21.6 — robuuste eenvoudige Startpagina, zonder afhankelijke loader */
(()=>{
  'use strict';
  if(window.__msDashboardLoader8216)return;
  window.__msDashboardLoader8216=true;

  const BUILD='8.21.6';
  const TOKEN='821600';
  const ROOT_ID='ms8210Start';
  const STYLE_ID='ms8216StartStyle';
  const $=id=>document.getElementById(id);
  const num=value=>Number.isFinite(Number(value))?Number(value):0;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));

  /* Voorkom dat oudere, los geïnjecteerde simple-start modules een tweede Start bouwen. */
  window.__msSimpleStart8210=true;

  const NAV=[
    {target:'live',icon:'🧭',label:'Live varen'},
    {target:'map',icon:'🗺️',label:'Kaart'},
    {target:'planner',icon:'🛟',label:'Reisplanner',attention:'planner'},
    {target:'ais',icon:'📡',label:'AIS'},
    {target:'weather',icon:'☀️',label:'Weer'},
    {target:'rws',icon:'📢',label:'Vaarwegberichten',attention:'rws'},
    {target:'logbook',icon:'📖',label:'Logboek'},
    {target:'pois',icon:'📍',label:"POI's"},
    {target:'technical',icon:'🛠️',label:'Techniek',attention:'technical'},
    {target:'entertainment',icon:'🏠',label:'Home Assistant'},
    {target:'costs',icon:'🧾',label:'Kosten'},
    {target:'finance',icon:'💶',label:'Financieel'},
    {target:'settings',icon:'⚙️',label:'Instellingen'},
    {target:'boat',icon:'👥',label:'Boot & delen',admin:true}
  ];

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const version=$('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');
    if(badge)badge.textContent=BUILD;
  }

  function installStyle(){
    if($(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #dashboard.ms8216-simple-start>*:not(#${ROOT_ID}){display:none!important}
      #${ROOT_ID}{display:block!important;box-sizing:border-box;width:100%;max-width:760px;margin:0 auto;padding:14px 14px max(96px,calc(env(safe-area-inset-bottom) + 78px));color:#f7fbff;font-family:inherit}
      #${ROOT_ID} *{box-sizing:border-box}
      .ms8210-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:2px 2px 14px}
      .ms8210-title{min-width:0}.ms8210-title h1{margin:0;font-size:clamp(25px,7vw,34px);line-height:1;font-weight:850;letter-spacing:-.7px;color:#fff}.ms8210-title p{margin:6px 0 0;font-size:12px;line-height:1.25;color:rgba(223,239,250,.68)}
      .ms8210-summary{flex:0 0 auto;display:inline-flex;align-items:center;gap:7px;max-width:48%;padding:8px 10px;border:1px solid rgba(111,190,232,.25);border-radius:999px;background:rgba(13,47,68,.72);font-size:11px;font-weight:800;line-height:1.1;color:#dff5ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ms8210-summary:before{content:'';width:8px;height:8px;border-radius:50%;background:#56d68a;box-shadow:0 0 0 4px rgba(86,214,138,.11)}.ms8210-summary.warning:before{background:#ffb62e;box-shadow:0 0 0 4px rgba(255,182,46,.12)}.ms8210-summary.critical:before{background:#ff5a66;box-shadow:0 0 0 4px rgba(255,90,102,.13)}
      .ms8210-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .ms8210-tile{position:relative;min-width:0;min-height:92px;padding:12px 9px 10px;border:1px solid rgba(82,164,207,.34);border-radius:18px;background:linear-gradient(180deg,rgba(18,57,79,.96),rgba(13,46,66,.96));box-shadow:0 10px 26px rgba(0,0,0,.12);color:#f7fbff;font:inherit;text-align:center;cursor:pointer;-webkit-tap-highlight-color:transparent}
      .ms8210-tile:active{transform:scale(.975);background:rgba(20,66,91,.98)}.ms8210-icon{display:block;height:34px;font-size:27px;line-height:32px}.ms8210-label{display:flex;align-items:center;justify-content:center;min-height:31px;margin-top:4px;font-size:14.5px;line-height:1.06;font-weight:850;letter-spacing:-.15px;overflow-wrap:anywhere}
      .ms8210-detail{display:none;margin-top:3px;min-height:12px;font-size:9.5px;line-height:1.1;font-weight:700;color:rgba(224,242,251,.73);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ms8210-tile.has-attention .ms8210-detail{display:block}
      .ms8210-badge{position:absolute;z-index:2;top:8px;right:8px;display:none;align-items:center;justify-content:center;min-width:23px;height:23px;padding:0 6px;border:2px solid #0d2e42;border-radius:999px;background:#3ea9e7;color:#fff;font-size:11px;line-height:1;font-weight:900;box-shadow:0 4px 10px rgba(0,0,0,.28)}.ms8210-badge.show{display:inline-flex}.ms8210-badge.warning{background:#ee9a16}.ms8210-badge.critical{background:#e53f4d}.ms8210-tile.attention-warning{border-color:rgba(238,154,22,.58)}.ms8210-tile.attention-critical{border-color:rgba(229,63,77,.7)}.ms8210-tile[hidden]{display:none!important}
      @media(min-width:620px){#${ROOT_ID}{padding-top:20px}.ms8210-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.ms8210-tile{min-height:102px}.ms8210-label{font-size:15.5px}}
      @media(min-width:920px){#${ROOT_ID}{max-width:980px}.ms8210-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
      @media(max-width:365px){#${ROOT_ID}{padding-left:10px;padding-right:10px}.ms8210-grid{gap:8px}.ms8210-tile{min-height:88px;padding-left:6px;padding-right:6px}.ms8210-label{font-size:13.5px}}
    `;
    document.head.appendChild(style);
  }

  function canShowAdmin(){
    const original=document.querySelector('.tabs [data-target="boat"],#boatManagementTab');
    if(!original)return true;
    if(original.hidden||original.classList.contains('hidden'))return false;
    try{return getComputedStyle(original).display!=='none'}catch{return true}
  }

  function navigate(target){
    try{
      if(target==='rws'&&typeof window.ms795OpenRws==='function'){window.ms795OpenRws();return;}
      if(typeof window.captainNavigate==='function'){window.captainNavigate(target);return;}
      document.querySelector(`.tabs [data-target="${target}"]`)?.click();
    }catch(error){console.warn(`Startnavigatie naar ${target} mislukte.`,error)}
  }

  function build(){
    const dashboard=$('dashboard');
    if(!dashboard)return false;
    installStyle();
    dashboard.classList.add('ms8216-simple-start');
    let root=$(ROOT_ID);
    if(!root){
      root=document.createElement('section');
      root.id=ROOT_ID;
      root.setAttribute('aria-label','MijnSerenity startpagina');
      root.innerHTML=`<div class="ms8210-head"><div class="ms8210-title"><h1>Start</h1><p>Alles aan boord in één overzicht</p></div><div id="ms8210Summary" class="ms8210-summary">Alles in orde</div></div><div class="ms8210-grid" role="navigation" aria-label="MijnSerenity navigatie">${NAV.map(item=>`<button type="button" class="ms8210-tile${item.admin?' admin-only':''}" data-ms8210-target="${esc(item.target)}"${item.admin?' data-ms8210-admin="1"':''}><span class="ms8210-badge" aria-hidden="true">0</span><span class="ms8210-icon" aria-hidden="true">${item.icon}</span><span class="ms8210-label">${esc(item.label)}</span><small class="ms8210-detail"></small></button>`).join('')}</div>`;
      dashboard.prepend(root);
      root.querySelectorAll('[data-ms8210-target]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.ms8210Target)));
    }
    const admin=root.querySelector('[data-ms8210-admin="1"]');
    if(admin)admin.hidden=!canShowAdmin();
    return true;
  }

  function techAttention(){
    let warnings=[];
    try{if(typeof window.technicalWarnings==='function'){const v=window.technicalWarnings();if(Array.isArray(v))warnings=v.filter(Boolean)}}catch{}
    const critical=warnings.filter(item=>String(item.level||'').toLowerCase()==='critical').length;
    const normal=warnings.filter(item=>String(item.level||'').toLowerCase()==='warning').length;
    let overdue=0,dueSoon=0;
    try{
      const state=typeof technicalStateCache!=='undefined'?technicalStateCache:null;
      const tasks=Array.isArray(state?.maintenance)?state.maintenance:[];
      if(typeof technicalTaskStatus==='function')tasks.forEach(task=>{const s=technicalTaskStatus(task)||{};if(s.level==='critical')overdue++;else if(s.level==='warning')dueSoon++});
    }catch{}
    const count=critical+normal+overdue+dueSoon;
    const detail=[];
    if(critical)detail.push(`${critical} storing${critical===1?'':'en'}`);
    if(overdue)detail.push(`${overdue} achterstallig`);
    if(normal)detail.push(`${normal} waarschuwing${normal===1?'':'en'}`);
    if(dueSoon)detail.push(`${dueSoon} onderhoud binnenkort`);
    return {count,level:(critical||overdue)?'critical':count?'warning':'none',detail:detail.join(' · ')};
  }

  function plannerAttention(){
    try{if(typeof readPlannerDrafts==='function'){const count=readPlannerDrafts().length;return {count,level:count?'info':'none',detail:count?`${count} conceptroute${count===1?'':'s'}`:''}}}catch{}
    return {count:0,level:'none',detail:''};
  }

  function rwsAttention(){
    try{
      const notices=typeof window.ms710GetRwsNotices==='function'?window.ms710GetRwsNotices():[];
      const important=Array.isArray(notices)?notices.filter(item=>item&&item.severity!=='info'):[];
      const urgent=important.filter(item=>item.severity==='urgent').length;
      const count=important.length;
      return {count,level:urgent?'critical':count?'warning':'none',detail:count?`${count} vaarwegmelding${count===1?'':'en'} met aandacht`:''};
    }catch{return {count:0,level:'none',detail:''}}
  }

  function attentionFor(target){
    if(target==='technical')return techAttention();
    if(target==='planner')return plannerAttention();
    if(target==='rws')return rwsAttention();
    return {count:0,level:'none',detail:''};
  }

  function refresh(){
    syncBuild();
    if(!build())return false;
    const root=$(ROOT_ID);
    if(!root)return false;
    let total=0,highest='none';
    const rank={none:0,info:1,warning:2,critical:3};
    NAV.forEach(item=>{
      const tile=root.querySelector(`[data-ms8210-target="${item.target}"]`);
      if(!tile)return;
      if(item.admin)tile.hidden=!canShowAdmin();
      const state=attentionFor(item.target);
      const count=Math.max(0,Math.round(num(state.count)));
      const level=['critical','warning','info'].includes(state.level)?state.level:'info';
      const badge=tile.querySelector('.ms8210-badge');
      const detail=tile.querySelector('.ms8210-detail');
      tile.classList.toggle('has-attention',count>0);
      tile.classList.toggle('attention-warning',count>0&&level==='warning');
      tile.classList.toggle('attention-critical',count>0&&level==='critical');
      if(badge){badge.textContent=count>99?'99+':String(count);badge.className=`ms8210-badge${count>0?' show':''}${count>0?' '+level:''}`}
      if(detail)detail.textContent=count>0?(state.detail||'Aandacht nodig'):'';
      total+=count;if(count>0&&rank[level]>rank[highest])highest=level;
    });
    const summary=$('ms8210Summary');
    if(summary){summary.className=`ms8210-summary${highest==='critical'?' critical':highest==='warning'?' warning':''}`;summary.textContent=total?`${total} aandachtspunt${total===1?'':'en'}`:'Alles in orde'}
    return true;
  }

  window.ms8210RefreshStart=refresh;
  window.ms8210RefreshAttention=refresh;

  function load(src,key){
    if(document.querySelector(`script[data-ms-loader="${key}"]`))return;
    const script=document.createElement('script');script.src=src;script.async=false;script.dataset.msLoader=key;script.onerror=()=>console.warn(`MijnSerenity module kon niet worden geladen: ${src}`);document.head.appendChild(script);
  }

  async function refreshServiceWorker(){
    if(!('serviceWorker' in navigator))return;
    try{const registration=await navigator.serviceWorker.register(`/sw.js?v=${TOKEN}`,{updateViaCache:'none'});await registration.update();if(registration.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'})}catch(error){console.warn('MijnSerenity service worker vernieuwen mislukt:',error)}
  }

  function start(){
    syncBuild();
    refresh();
    [100,350,800,1500,3000,6000].forEach(ms=>setTimeout(refresh,ms));
    setInterval(()=>{if(!document.hidden)refresh()},10000);
    ['mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-ruuvi-vrm-updated','mijnserenity:routechange','mijnserenity:dashboard-ready','online','storage'].forEach(name=>window.addEventListener(name,refresh,{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()},{passive:true});
    load(`start-dashboard-71900-bridge.js?v=${TOKEN}`,'dashboard-bridge-8216');
    load(`inventory-edit-8212.js?v=${TOKEN}`,'inventory-editor-8216');
    refreshServiceWorker();
    console.info(`MijnSerenity ${BUILD}: eenvoudige Startpagina inline actief.`);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();

/* MijnSerenity 8.21.8 — Bootbeheer live loader */
(()=>{
  'use strict';
  if(window.__msBootbeheerLoader8218)return;
  window.__msBootbeheerLoader8218=true;

  function loadCloud(){
    if(window.__msBootbeheerCloud8100||document.querySelector('script[data-ms-bootbeheer-cloud-loader]'))return;
    const cloud=document.createElement('script');
    cloud.src='bootbeheer-cloud-8100.js?v=821800';
    cloud.async=true;
    cloud.dataset.msBootbeheerCloudLoader='1';
    cloud.onerror=()=>console.warn('Bootbeheer cloudlaag kon niet worden geladen.');
    document.head.appendChild(cloud);
  }

  function loadBootbeheer(){
    if(window.__msBootbeheer8100){loadCloud();return;}
    if(document.querySelector('script[data-ms-bootbeheer-loader]')){setTimeout(loadCloud,250);return;}
    const script=document.createElement('script');
    script.src='bootbeheer-8100.js?v=821800';
    script.async=true;
    script.dataset.msBootbeheerLoader='1';
    script.onload=loadCloud;
    script.onerror=()=>console.warn('Bootbeheer kon niet worden geladen.');
    document.head.appendChild(script);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadBootbeheer,{once:true});
  else loadBootbeheer();
})();