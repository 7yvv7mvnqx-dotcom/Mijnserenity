/* MijnSerenity 8.31.2 — VRM/Ruuvi runtime, na de eerste paint geladen. */
(function(){
  'use strict';
  const VRM_ENDPOINT = 'https://wufslczbtguvtgmfufid.supabase.co/functions/v1/vrm-ruuvi';
  const TOKEN_KEYS = ['ms7148_vrm_token','ms7148VrmToken','mijnserenity_vrm_token','vrm_api_token'];
  let refreshTimer = null;

  function el(id){ return document.getElementById(id); }
  function getSavedToken(){
    for (const k of TOKEN_KEYS) {
      const v = localStorage.getItem(k);
      if (v && String(v).trim()) return String(v).trim();
    }
    return '';
  }
  function saveToken(v){
    const token = String(v || '').trim();
    if (!token) return;
    for (const k of TOKEN_KEYS) localStorage.setItem(k, token);
  }
  function num(v){
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function fmt(v, digits=1){
    const n = num(v);
    return n === null ? '–' : n.toLocaleString('nl-NL',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  }
  function setText(id, text){ const n=el(id); if(n) n.textContent=text; }
  function setBadge(ok, text){
    const b=el('ms7148VrmBadge');
    if (!b) return;
    b.textContent=text;
    b.classList.toggle('offline', !ok);
    b.classList.toggle('online', ok);
  }
  function applyData(data){
    window.MIJSERENITY_VRM_DATA=data||{};
    const salon = data && data.salon ? data.salon : {};
    const machinekamer = data && data.machinekamer ? data.machinekamer : {};
    const st = num(salon.temperature), mt = num(machinekamer.temperature);
    const sh = num(salon.humidity), mh = num(machinekamer.humidity);
    const sp = num(salon.pressure), mp = num(machinekamer.pressure);

    setText('ivmsCabinTemp', st===null ? '– °C' : `${fmt(st,1)} °C`);
    setText('ivmsCabinHumidity', sh===null ? '– % RV' : `${fmt(sh,0)} % RV`);
    setText('ivmsForwardTemp', mt===null ? '– °C' : `${fmt(mt,1)} °C`);
    setText('ivmsForwardHumidity', mh===null ? '– % RV' : `${fmt(mh,0)} % RV`);
    const pressure = sp !== null ? sp : mp;
    setText('ivmsClimatePressure', pressure===null ? 'LUCHTDRUK –' : `LUCHTDRUK ${fmt(pressure,1)} hPa`);

    const status=el('ms7148VrmStatus');
    if(status){
      const sTxt = st===null ? '–' : `${fmt(st,1)} °C`;
      const mTxt = mt===null ? '–' : `${fmt(mt,1)} °C`;
      status.textContent = `Verbonden ✅ · Salon ${sTxt} · Machinekamer ${mTxt}`;
    }
    setBadge(true,'VRM live');
    window.dispatchEvent(new CustomEvent('mijnserenity-vrm-updated',{detail:data||{}}));
    try { localStorage.setItem('ms7150_ruuvi_last', JSON.stringify({salon,machinekamer,energy:data.energy||{},updatedAt:data.updatedAt||new Date().toISOString()})); } catch(e){}
  }

  async function fetchVrm(showBusy=true){
    const input=el('ms7148VrmToken');
    const token=String((input && input.value) || getSavedToken() || '').trim();
    const status=el('ms7148VrmStatus');
    if(!token){
      if(status) status.textContent='Vul eerst je Victron VRM API-token in.';
      setBadge(false,'Niet gekoppeld');
      return false;
    }
    saveToken(token);
    if(showBusy && status) status.textContent='VRM-data ophalen…';
    try{
      const r=await fetch(VRM_ENDPOINT,{
        method:'GET',
        cache:'no-store',
        headers:{'x-vrm-token':token,'accept':'application/json'}
      });
      const data=await r.json().catch(()=>({}));
      if(!r.ok || !data || data.success===false) throw new Error(data && data.error ? data.error : `HTTP ${r.status}`);
      applyData(data);
      return true;
    }catch(err){
      if(status) status.textContent=`VRM-fout: ${err && err.message ? err.message : err}`;
      setBadge(false,'Fout');
      return false;
    }
  }

  window.ms7148ToggleVrmToken=function(btn){
    const input=el('ms7148VrmToken'); if(!input) return;
    const show=input.type==='password'; input.type=show?'text':'password'; if(btn) btn.textContent=show?'Verberg':'Toon';
  };
  window.ms7148SaveAndTestVrm=async function(){
    const input=el('ms7148VrmToken');
    if(input) saveToken(input.value);
    return fetchVrm(true);
  };
  window.ms7148RefreshVrm=async function(){ return fetchVrm(true); };

  function init(){
    const input=el('ms7148VrmToken');
    const saved=getSavedToken();
    if(input && saved && !input.value) input.value=saved;
    try{
      const cached=JSON.parse(localStorage.getItem('ms7150_ruuvi_last')||'null');
      if(cached) applyData(cached);
    }catch(e){}
    if(saved){ fetchVrm(false); }
    if(refreshTimer) clearInterval(refreshTimer);
    refreshTimer=setInterval(()=>{ if(getSavedToken()) fetchVrm(false); },60000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
