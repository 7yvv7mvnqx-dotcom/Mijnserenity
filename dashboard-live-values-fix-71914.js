/* MijnSerenity 8.20.2 — robuuste Victron live waarden voor Marine Glass
   Event-driven updates, rustige veiligheidsrefresh en begrensde netwerkrequests. */
(()=>{
  'use strict';
  if(window.__msDashboardLiveValues8202)return;
  window.__msDashboardLiveValues8202=true;

  const $=id=>document.getElementById(id);
  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const num=v=>finite(v)?Number(v):null;
  const set=(id,value)=>{
    const el=$(id);
    if(el&&value!==undefined&&value!==null&&el.textContent!==String(value))el.textContent=String(value);
  };
  const fmt=(v,d=0,s='')=>finite(v)
    ?`${Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d})}${s}`
    :`–${s}`;
  const signed=(v,d=0,s='')=>finite(v)?`${Number(v)>0?'+':''}${fmt(v,d,s)}`:`–${s}`;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const TOKEN_KEYS=['ms7148_vrm_token','ms7148VrmToken','mijnserenity_vrm_token','vrm_api_token'];

  let busy=false;
  let lastFetch=0;
  let frame=0;
  let lastDbLoad=0;
  let fallbackTechnical={};
  let fallbackDiagnostics={};

  function client(){try{return typeof sb!=='undefined'?sb:null}catch{return null}}
  function boat(){try{return typeof currentBoat!=='undefined'?currentBoat:null}catch{return null}}
  function user(){try{return typeof currentUser!=='undefined'?currentUser:null}catch{return null}}
  function technical(){
    try{
      const local=typeof technicalStateCache!=='undefined'&&technicalStateCache?technicalStateCache:{};
      return {...fallbackTechnical,...local};
    }catch{return {...fallbackTechnical}}
  }
  function token(){
    for(const key of TOKEN_KEYS){
      const value=localStorage.getItem(key);
      if(value&&String(value).trim())return String(value).trim().replace(/^Token\s+/i,'');
    }
    try{
      const cfg=JSON.parse(localStorage.getItem('mijnserenity-ruuvi-climate-v7102')||'{}');
      if(cfg?.vrmToken)return String(cfg.vrmToken).trim().replace(/^Token\s+/i,'');
    }catch{}
    return '';
  }
  function withTimeout(promise,timeoutMs,label='Request'){
    let timer=0;
    const timeout=new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error(`${label} time-out`)),timeoutMs);
    });
    return Promise.race([promise,timeout]).finally(()=>clearTimeout(timer));
  }
  function ageMs(value){
    const at=Date.parse(String(value||''));
    return Number.isFinite(at)?Math.max(0,Date.now()-at):Infinity;
  }
  function liveData(){
    const live=window.MIJSERENITY_VRM_LIVE_ENERGY;
    if(!live||typeof live!=='object'||live.success===false)return {};
    return ageMs(live.sampledAt)<=10*60*1000?live:{};
  }
  function diagnostics(){
    const diag=window.MIJSERENITY_VRM_DIAGNOSTICS;
    return diag&&typeof diag==='object'?diag:fallbackDiagnostics;
  }
  function metric(v){return num(v?.value??v)}

  function snapshot(){
    const live=liveData();
    const diag=diagnostics();
    const t=technical();
    const b=live.battery||{};
    const s=live.solar||{};
    const ac=live.ac||{};
    const db=diag.battery||{};
    const ds=diag.solar||{};

    const soc=num(b.soc)??metric(db.soc)??num(t.houseSoc);
    const voltage=num(b.voltage)??metric(db.voltage)??num(t.houseVoltage);
    const current=num(b.current)??metric(db.current)??num(t.houseCurrent);
    let power=num(b.power)??metric(db.power)??num(t.housePower);
    if(power===null&&voltage!==null&&current!==null)power=voltage*current;
    const solar=num(s.power)??num(live.system?.solarPower)??metric(ds.power)??num(t.solarPower);
    const start=[num(b.starterVoltage),metric(db.starterVoltage),num(live.starter?.voltage),num(t.startVoltage)]
      .find(v=>finite(v)&&v>=9&&v<=16.8)??null;

    const shoreV=num(ac.inputVoltage)??num(t.shoreVoltage);
    let shore=typeof ac.shoreConnected==='boolean'?ac.shoreConnected:null;
    if(shore===null&&typeof t.shorePower==='boolean')shore=t.shorePower;
    if(shore===null&&finite(shoreV)){
      if(shoreV>=180&&shoreV<=280)shore=true;
      else if(shoreV<80)shore=false;
    }

    const charger=num(ac.chargerPower)??num(t.chargerPower);
    const inverter=num(ac.inverterPower)??num(t.inverterPower);
    const explicitLoad=num(ac.loadPower)??num(t.loadPower);
    const load=finite(explicitLoad)?Math.abs(explicitLoad):(finite(power)&&power<0?Math.abs(power):null);
    const dc=num(ac.dcPower)??num(t.dcLoadPower);
    const sampledAt=live.sampledAt||diag.sampledAt||t.liveTechnicalAt||'';
    return {soc,voltage,current,power,solar,start,shore,shoreV,charger,inverter,load,dc,sampledAt};
  }

  function paintOriginal(s){
    if(!$('#mgSoc'))return;
    set('mgSoc',finite(s.soc)?`${Math.round(clamp(s.soc,0,100))}%`:'–%');
    set('mgVolt',fmt(s.voltage,2,' V'));
    set('mgAmp',signed(s.current,2,' A'));
    set('mgSolar',fmt(s.solar,0,' W'));
    set('mgShore',s.shore===true?'Aangesloten':s.shore===false?'Niet aangesloten':'Niet gekoppeld');
    set('mgLoad',fmt(s.load,0,' W'));
    set('mgStart','Startaccu');
    set('mgStartV',fmt(s.start,2,' V'));
    set('mgInv',fmt(s.inverter,0,' W'));
    set('mgChg',fmt(s.charger,0,' W'));
    set('mgNetPower',signed(s.power,0,' W'));
    set('mgPv',fmt(s.solar,0,' W'));
    set('mgBatP',signed(s.power,0,' W'));
    set('mgInv2',fmt(s.inverter,0,' W'));
    set('mgChg2',fmt(s.charger,0,' W'));
    const flow=$('mgFlow');
    if(flow)flow.dataset.dir=!finite(s.power)?'idle':s.power>15?'in':s.power<-15?'out':'idle';
  }

  function paintVictronPanel(s){
    if(!$('#msVictronLivePanel'))return;
    set('msvSoc',finite(s.soc)?`${Math.round(clamp(s.soc,0,100))}%`:'–%');
    set('msvVolt',fmt(s.voltage,2,' V'));
    set('msvAmp',signed(s.current,2,' A'));
    set('msvBatPower',signed(s.power,0,' W'));
    set('msvSolar',fmt(s.solar,0,' W'));
    set('msvLoad',fmt(s.load,0,' W'));
    set('msvDc',fmt(finite(s.dc)?Math.abs(s.dc):null,0,' W'));
    set('msvShore',s.shore===true?'Aangesloten':s.shore===false?'Niet aangesloten':'Niet gekoppeld');
    set('msvShoreMeta',s.shore===true&&finite(s.shoreV)
      ?`${fmt(s.shoreV,0,' V')} via MultiPlus`
      :s.shore===false?'Geen walspanning':'Cerbo / MultiPlus-data ontbreekt');
    set('msvStart',fmt(s.start,2,' V'));
    set('msvStartState',!finite(s.start)?'Wachten op meting':s.start>=12.2?'In orde':s.start>=12?'Laag':'Controleren');
    const multi=finite(s.charger)&&s.charger>5
      ?'Laden'
      :finite(s.inverter)&&Math.abs(s.inverter)>5?'Omvormen':s.shore===true?'Walstroom':'Stand-by';
    set('msvMulti',multi);
    set('msvInv',fmt(s.inverter,0,' W'));
    set('msvCharge',finite(s.charger)&&s.charger>5?'Laden':'Lader uit');
    set('msvChg',fmt(s.charger,0,' W'));
  }

  function render(){
    const s=snapshot();
    paintOriginal(s);
    paintVictronPanel(s);
  }
  function queue(){
    if(frame)return;
    frame=requestAnimationFrame(()=>{frame=0;render()});
  }

  async function loadDatabaseFallback(force=false){
    if(!force&&Date.now()-lastDbLoad<30000)return false;
    const c=client(),b=boat(),u=user();
    if(!c||!b?.id||!u)return false;
    lastDbLoad=Date.now();
    let changed=false;

    try{
      const {data,error}=await withTimeout(
        c.from('victron_diagnostics').select('data,sampled_at,updated_at').eq('boat_id',b.id).maybeSingle(),
        10000,
        'Victron database'
      );
      if(!error&&data?.data){
        fallbackDiagnostics={...data.data,sampledAt:data.sampled_at||data.data.sampledAt,saved:true};
        window.MIJSERENITY_VRM_DIAGNOSTICS=fallbackDiagnostics;
        window.dispatchEvent(new CustomEvent('mijnserenity-vrm-diagnostics-updated',{detail:fallbackDiagnostics}));
        changed=true;
      }
    }catch(error){console.warn('Victron fallback uit database laden mislukt:',error)}

    try{
      const {data,error}=await withTimeout(
        c.from('technical_state').select('data,updated_at').eq('boat_id',b.id).maybeSingle(),
        10000,
        'Technische database'
      );
      if(!error&&data?.data){
        fallbackTechnical=data.data;
        try{
          if(typeof technicalStateCache!=='undefined'&&technicalStateCache&&typeof technicalStateCache==='object')Object.assign(technicalStateCache,data.data);
          else if(typeof technicalStateCache!=='undefined')technicalStateCache=data.data;
        }catch{}
        changed=true;
      }
    }catch(error){console.warn('Technische fallback laden mislukt:',error)}

    if(changed)queue();
    return changed;
  }

  async function refreshLive(force=false){
    if(busy||(!force&&Date.now()-lastFetch<55000))return false;
    const c=client(),b=boat(),u=user(),vrm=token();
    if(!c||!b?.id||!u){
      await loadDatabaseFallback(force);
      return false;
    }

    busy=true;
    lastFetch=Date.now();
    try{
      if(typeof window.msLoadVictronDiagnostics==='function')window.msLoadVictronDiagnostics().catch(()=>{});
      await loadDatabaseFallback(force);
      if(!vrm)return false;

      const result=await withTimeout(
        c.functions.invoke('victron-energy-live',{
          body:{boatId:b.id},
          headers:{'x-vrm-token':vrm}
        }),
        15000,
        'Victron live'
      );
      const {data,error}=result||{};
      if(error||!data?.success)throw error||new Error(data?.error||'Geen geldige VRM-data');
      window.MIJSERENITY_VRM_LIVE_ENERGY=data;
      window.dispatchEvent(new CustomEvent('mijnserenity-vrm-energy-live-updated',{detail:data}));
      queue();
      return true;
    }catch(error){
      console.warn('Dashboard Victron live vernieuwen mislukt:',error);
      queue();
      return false;
    }finally{
      busy=false;
    }
  }

  const wake=()=>{
    queue();
    setTimeout(()=>{
      loadDatabaseFallback(false);
      refreshLive(false);
    },50);
  };

  [
    'mijnserenity:dashboard-ready','mijnserenity-vrm-energy-live-updated',
    'mijnserenity-vrm-diagnostics-updated','mijnserenity-ha-state-updated',
    'mijnserenity-ha-connected','mijnserenity:routechange','mijnserenity:modules-ready'
  ].forEach(name=>window.addEventListener(name,wake,{passive:true}));
  window.addEventListener('focus',()=>{queue();loadDatabaseFallback(false);refreshLive(false)},{passive:true});
  window.addEventListener('pageshow',()=>{queue();loadDatabaseFallback(false);refreshLive(false)},{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden){queue();loadDatabaseFallback(false);refreshLive(false)}
  },{passive:true});

  function start(){
    queue();
    setTimeout(queue,200);
    setTimeout(()=>loadDatabaseFallback(true),500);
    setTimeout(()=>refreshLive(true),1200);

    /* Boot/membership kan na login later beschikbaar komen: begrensde retry. */
    let attempts=0;
    const retry=setInterval(async()=>{
      if(document.hidden)return;
      attempts+=1;
      const ok=await loadDatabaseFallback(true);
      if(ok||attempts>=15)clearInterval(retry);
    },2000);

    /* Rustige DOM-veiligheidsrefresh; echte data-updates zijn event-driven. */
    setInterval(()=>{if(!document.hidden)queue()},5000);
    setInterval(()=>{
      if(!document.hidden){
        loadDatabaseFallback(false);
        refreshLive(false);
      }
    },60000);
  }

  window.ms71915RefreshEnergy=()=>Promise.allSettled([loadDatabaseFallback(true),refreshLive(true)]);
  window.ms71915RenderEnergy=render;

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();