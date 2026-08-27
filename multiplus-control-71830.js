/* MijnSerenity 7.18.30 — MultiPlus-II bediening via Victron VRM */
(()=>{
  'use strict';
  if(window.__ms71830MultiPlusControl)return;
  window.__ms71830MultiPlusControl=true;

  const TOKEN_KEYS=['ms7148_vrm_token','ms7148VrmToken','mijnserenity_vrm_token','vrm_api_token'];
  const MODE_LABELS={1:'Alleen laden',2:'Alleen omvormer',3:'Aan',4:'Uit'};
  let busy=false;
  let lastStatusAt=0;
  let timer=0;

  const $=id=>document.getElementById(id);
  const savedToken=()=>{
    for(const key of TOKEN_KEYS){
      const value=localStorage.getItem(key);
      if(value&&String(value).trim())return String(value).trim().replace(/^Token\s+/i,'');
    }
    return '';
  };
  const client=()=>{try{return typeof sb!=='undefined'?sb:null}catch{return null}};
  const boat=()=>{try{return typeof currentBoat!=='undefined'?currentBoat:null}catch{return null}};
  const toast=message=>{try{showAppToast?.(message)}catch{};console.info(message)};

  function installStyle(){
    if($('ms71830MultiStyle'))return;
    const style=document.createElement('style');
    style.id='ms71830MultiStyle';
    style.textContent=`
#ms71830MultiControl{margin:2px 0 10px;border:1px solid #2a3541;border-radius:11px;background:linear-gradient(145deg,rgba(9,16,25,.98),rgba(5,9,14,.98));padding:10px 11px;box-shadow:inset 0 1px rgba(255,255,255,.025)}
.ms71830-multi-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}.ms71830-multi-head div{display:flex;align-items:center;gap:8px}.ms71830-multi-head span{font-size:19px;color:#4f9fff}.ms71830-multi-head small{display:block;color:#8f9aa6;font-size:9px;letter-spacing:.45px}.ms71830-multi-head strong{display:block;font-size:13px;margin-top:2px}.ms71830-multi-badge{border:1px solid #305c8c;border-radius:999px;padding:5px 9px;font-size:10px;color:#79b7ff;background:#0a2038;white-space:nowrap}.ms71830-multi-badge.error{border-color:#743838;color:#ff8b87;background:#291111}
.ms71830-mode-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.ms71830-mode{min-height:37px;border:1px solid #34404c;border-radius:8px;background:#10161d;color:#dfe6ee;font-size:10px;font-weight:700;letter-spacing:.2px;cursor:pointer}.ms71830-mode.active{border-color:#348cff;background:#0d3157;color:#78b8ff;box-shadow:0 0 0 1px rgba(52,140,255,.2),0 0 14px rgba(52,140,255,.12)}.ms71830-mode:disabled{opacity:.42;cursor:not-allowed}
.ms71830-shore{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:7px;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid #222b34}.ms71830-shore label small{display:block;color:#929da8;font-size:9px}.ms71830-shore label strong{font-size:12px}.ms71830-shore select{height:34px;border:1px solid #35414d;border-radius:7px;background:#0b1118;color:#edf3f9;padding:0 8px;font:inherit;font-size:11px}.ms71830-limit-button{height:34px;border:1px solid #2e6cae;border-radius:7px;background:#0b2745;color:#72b7ff;padding:0 10px;font-size:10px;font-weight:700;cursor:pointer}.ms71830-limit-button:disabled,.ms71830-shore select:disabled{opacity:.4;cursor:not-allowed}.ms71830-control-note{display:block;margin-top:7px;color:#77838f;font-size:9px;line-height:1.35}
@media(max-width:430px){#ms71830MultiControl{padding:9px}.ms71830-mode-grid{grid-template-columns:repeat(2,1fr)}.ms71830-mode{min-height:35px}.ms71830-shore{grid-template-columns:1fr auto}.ms71830-shore label{grid-column:1/-1}.ms71830-shore select{width:100%}}
`;
    document.head.appendChild(style);
  }

  function markup(){
    return `<div id="ms71830MultiControl" aria-label="MultiPlus-II bediening">
      <div class="ms71830-multi-head">
        <div><span>∿</span><p><small>MULTIPLUS-II · 12/3000</small><strong id="ms71830ModeText">Status ophalen…</strong></p></div>
        <b id="ms71830MultiBadge" class="ms71830-multi-badge">VRM</b>
      </div>
      <div class="ms71830-mode-grid">
        <button class="ms71830-mode" type="button" data-ms71830-mode="4">UIT</button>
        <button class="ms71830-mode" type="button" data-ms71830-mode="1">LADEN</button>
        <button class="ms71830-mode" type="button" data-ms71830-mode="2">OMVORMER</button>
        <button class="ms71830-mode" type="button" data-ms71830-mode="3">AAN</button>
      </div>
      <div class="ms71830-shore">
        <label><small>WALSTROOMLIMIET</small><strong id="ms71830LimitText">– A</strong></label>
        <select id="ms71830LimitSelect" aria-label="Walstroomlimiet">
          <option value="6">6 A</option><option value="10" selected>10 A</option><option value="13">13 A</option><option value="16">16 A</option><option value="25">25 A</option><option value="32">32 A</option>
        </select>
        <button id="ms71830LimitButton" class="ms71830-limit-button" type="button">INSTELLEN</button>
      </div>
      <small id="ms71830ControlNote" class="ms71830-control-note">Beveiligde bediening via Victron VRM · wijzigingen worden na bevestiging verstuurd.</small>
    </div>`;
  }

  function hideLegacyControls(host){
    host.querySelectorAll('.scd-control').forEach(card=>{
      const label=(card.querySelector('small')?.textContent||'').trim().toLowerCase();
      if(label==='omvormer'||label==='lader')card.style.display='none';
    });
  }

  function mount(){
    installStyle();
    const host=document.querySelector('#msSerenityControl .scd-controls');
    if(!host)return false;
    hideLegacyControls(host);
    if(!$('ms71830MultiControl')){
      const grid=host.querySelector('.scd-control-grid');
      if(grid)grid.insertAdjacentHTML('beforebegin',markup());
      else host.insertAdjacentHTML('beforeend',markup());
      host.addEventListener('click',event=>{
        const modeButton=event.target.closest('[data-ms71830-mode]');
        if(modeButton){event.preventDefault();setMode(Number(modeButton.dataset.ms71830Mode));return}
        if(event.target.closest('#ms71830LimitButton')){event.preventDefault();setLimit()}
      });
    }
    return true;
  }

  function setBusy(value){
    busy=value;
    document.querySelectorAll('[data-ms71830-mode]').forEach(button=>button.disabled=value||button.dataset.adjustable==='0');
    const select=$('ms71830LimitSelect'),button=$('ms71830LimitButton');
    if(select)select.disabled=value||select.dataset.adjustable==='0';
    if(button)button.disabled=value||button.dataset.adjustable==='0';
  }

  function setError(message){
    const badge=$('ms71830MultiBadge'),note=$('ms71830ControlNote');
    if(badge){badge.textContent='FOUT';badge.classList.add('error')}
    if(note)note.textContent=message||'MultiPlus-bediening niet beschikbaar.';
  }

  function renderStatus(data){
    const control=data?.control||data||{};
    const mode=Number(control.mode);
    const modeText=$('ms71830ModeText'),limitText=$('ms71830LimitText'),select=$('ms71830LimitSelect'),badge=$('ms71830MultiBadge'),note=$('ms71830ControlNote');
    if(modeText)modeText.textContent=MODE_LABELS[mode]||control.modeLabel||'Status onbekend';
    document.querySelectorAll('[data-ms71830-mode]').forEach(button=>{
      button.classList.toggle('active',Number(button.dataset.ms71830Mode)===mode);
      button.dataset.adjustable=control.modeAdjustable===false?'0':'1';
    });
    if(Number.isFinite(Number(control.currentLimit))){
      const amps=Number(control.currentLimit);
      if(limitText)limitText.textContent=`${amps.toLocaleString('nl-NL',{maximumFractionDigits:1})} A`;
      if(select){
        const exact=[...select.options].find(option=>Number(option.value)===amps);
        if(exact)select.value=exact.value;
      }
    }
    if(select)select.dataset.adjustable=control.currentLimitAdjustable===false?'0':'1';
    if($('ms71830LimitButton'))$('ms71830LimitButton').dataset.adjustable=control.currentLimitAdjustable===false?'0':'1';
    if(badge){badge.textContent='VRM LIVE';badge.classList.remove('error')}
    if(note)note.textContent=control.modeAdjustable===false?'Stand wordt live getoond; Victron meldt dat wijzigen niet is toegestaan.':'Beveiligde bediening via Victron VRM · wijzigingen worden na bevestiging verstuurd.';
    setBusy(false);
  }

  async function invoke(body){
    const supabase=client(),activeBoat=boat(),token=savedToken();
    if(!supabase)throw new Error('MijnSerenity is nog niet verbonden met Supabase.');
    if(!activeBoat?.id)throw new Error('Serenity is nog niet geladen.');
    if(!token)throw new Error('Victron VRM-token ontbreekt.');
    const {data,error}=await supabase.functions.invoke('victron-control',{body:{boatId:activeBoat.id,...body},headers:{'x-vrm-token':token}});
    if(error)throw new Error(data?.error||error?.message||'Victron-bediening mislukt.');
    if(!data?.success)throw new Error(data?.error||'Victron-bediening mislukt.');
    return data;
  }

  async function refresh(force=false){
    if(busy)return;
    if(!mount())return;
    if(!force&&Date.now()-lastStatusAt<15000)return;
    try{
      const data=await invoke({action:'status'});
      lastStatusAt=Date.now();
      renderStatus(data);
    }catch(error){setError(error?.message||String(error))}
  }

  async function setMode(mode){
    if(busy||!MODE_LABELS[mode])return;
    const label=MODE_LABELS[mode];
    const detail=mode===4?'Hiermee zet je de MultiPlus-II uit. De 230 V-uitgang kan daardoor wegvallen.':mode===1?'De omvormer wordt uitgeschakeld; laden via walstroom blijft toegestaan.':mode===2?'De lader wordt uitgeschakeld; alleen de omvormer blijft toegestaan.':'Laden en omvormen worden beide toegestaan.';
    if(!confirm(`MultiPlus-II naar “${label}” schakelen?\n\n${detail}`))return;
    try{
      setBusy(true);
      const data=await invoke({action:'setMode',mode});
      renderStatus(data);
      toast(`MultiPlus-II: ${label}`);
      lastStatusAt=0;
      setTimeout(()=>refresh(true),2800);
    }catch(error){setBusy(false);setError(error?.message||String(error));toast(`Victron: ${error?.message||error}`)}
  }

  async function setLimit(){
    if(busy)return;
    const amps=Number($('ms71830LimitSelect')?.value);
    if(!Number.isFinite(amps))return;
    try{
      setBusy(true);
      const data=await invoke({action:'setCurrentLimit',amps});
      renderStatus(data);
      toast(`Walstroomlimiet ingesteld op ${amps} A`);
      lastStatusAt=0;
      setTimeout(()=>refresh(true),2800);
    }catch(error){setBusy(false);setError(error?.message||String(error));toast(`Victron: ${error?.message||error}`)}
  }

  function boot(){
    mount();
    refresh(true);
    const observer=new MutationObserver(()=>{if(mount())refresh(false)});
    observer.observe(document.body,{childList:true,subtree:true});
    ['mijnserenity:modules-ready','mijnserenity-vrm-energy-live-updated','mijnserenity-vrm-diagnostics-updated','mijnserenity:routechange'].forEach(name=>window.addEventListener(name,()=>refresh(false),{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(true)},{passive:true});
    timer=window.setInterval(()=>{if(!document.hidden)refresh(false)},30000);
  }

  window.ms71830RefreshMultiPlus=()=>refresh(true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();