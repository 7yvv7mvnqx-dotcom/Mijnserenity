/* MijnSerenity 7.11.0 — Ruuvi beweging & automatische aanwezigheid via Home Assistant */
(()=>{
  'use strict';
  const BUILD='7.11.0';
  const CONFIG_KEY='mijnserenity-presence-v1';
  const GROUP_ID='ms7103PresenceGroup';
  const SLOT_LABELS={salon:'Salon',forward:'Voorhut'};
  let renderQueued=false;
  let lastCurrentKey='';

  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>\'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const states=()=>{try{return typeof window.ms730GetStateSnapshot==='function'?window.ms730GetStateSnapshot():[]}catch{return []}};
  const text=e=>`${e?.entity_id||''} ${e?.name||''}`.toLowerCase();
  const state=e=>String(e?.state||'').trim();
  const invalid=e=>!e||['','unknown','unavailable','none','null'].includes(state(e).toLowerCase());

  function config(){
    try{
      const raw=JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}');
      return {
        salonMotion:String(raw?.salonMotion||''),
        forwardMotion:String(raw?.forwardMotion||''),
        wifiSsid:String(raw?.wifiSsid||''),
        peopleEntities:Array.isArray(raw?.peopleEntities)?raw.peopleEntities.map(String).filter(Boolean).slice(0,8):[]
      };
    }catch{return {salonMotion:'',forwardMotion:'',wifiSsid:'',peopleEntities:[]}}
  }
  function save(next){
    const clean={
      salonMotion:String(next?.salonMotion||''),forwardMotion:String(next?.forwardMotion||''),wifiSsid:String(next?.wifiSsid||'').trim(),
      peopleEntities:[...new Set((next?.peopleEntities||[]).map(String).filter(Boolean))].slice(0,8)
    };
    localStorage.setItem(CONFIG_KEY,JSON.stringify(clean));
    window.dispatchEvent(new CustomEvent('mijnserenity-presence-config-updated',{detail:clean}));
    return clean;
  }

  function motionCandidate(e){
    if(invalid(e))return false;
    const t=text(e), dc=String(e?.attributes?.device_class||'').toLowerCase();
    if(e.domain==='binary_sensor')return /motion|movement|beweging|occupancy|activity/.test(`${t} ${dc}`);
    if(e.domain!=='sensor')return false;
    return /movement counter|movement|motion count|bewegingsteller|beweging teller|activity counter|motion counter/.test(t);
  }
  function phoneCandidate(e){
    if(invalid(e))return false;
    if(e.domain==='device_tracker'||e.domain==='person')return true;
    const t=text(e);
    if(e.domain==='binary_sensor')return /(phone|iphone|telefoon|mobile|wifi|wi-fi|wlan|presence|aanwezig|connect)/.test(t);
    if(e.domain==='sensor')return /(wifi connection|wi-fi connection|wlan|ssid|phone.*wifi|iphone.*wifi|telefoon.*wifi)/.test(t);
    return false;
  }
  const motionCandidates=()=>states().filter(motionCandidate).sort((a,b)=>a.name.localeCompare(b.name,'nl'));
  const phoneCandidates=()=>states().filter(phoneCandidate).sort((a,b)=>a.name.localeCompare(b.name,'nl'));
  const byId=id=>states().find(e=>e.entity_id===id)||null;

  function isPresent(entity,ssid=''){
    if(invalid(entity))return false;
    const raw=state(entity), low=raw.toLowerCase();
    if(entity.domain==='device_tracker'||entity.domain==='person')return ['home','on','present','connected','online'].includes(low);
    if(entity.domain==='binary_sensor')return ['on','home','present','connected','online'].includes(low);
    if(entity.domain==='sensor'){
      if(ssid)return raw.trim().toLowerCase()===ssid.trim().toLowerCase();
      return !['off','disconnected','not connected','away','not_home','unknown','unavailable','none'].includes(low);
    }
    return false;
  }

  function manualCount(){
    let boat='serenity';
    try{boat=currentBoat?.id||currentBoat?.name||boat}catch{}
    const value=Number(localStorage.getItem(`mijnserenity-ivms-people-${boat}`));
    return Number.isInteger(value)&&value>=0?value:2;
  }
  function presenceSummary(){
    const c=config();
    const selected=c.peopleEntities.map(byId).filter(Boolean);
    const people=selected.map(e=>({entity_id:e.entity_id,name:e.name,present:isPresent(e,c.wifiSsid),state:e.state}));
    const configured=selected.length>0;
    return {configured,count:configured?people.filter(p=>p.present).length:manualCount(),people,wifiSsid:c.wifiSsid};
  }

  function optionList(items,selected,empty='Niet gekoppeld'){
    return [`<option value="">${esc(empty)}</option>`,...items.map(e=>`<option value="${esc(e.entity_id)}" ${e.entity_id===selected?'selected':''}>${esc(e.name)} — ${esc(e.state)}</option>`)].join('');
  }

  function buildConfigGroup(){
    const container=$('ms730DeviceGroups');
    if(!container)return;
    let group=$(GROUP_ID);
    if(!group){group=document.createElement('div');group.id=GROUP_ID;group.className='ms730-device-group ms7103-presence-group';container.appendChild(group)}
    const c=config(), motions=motionCandidates(), phones=phoneCandidates();
    const phoneRows=Array.from({length:6},(_,i)=>`<label><strong>Telefoon ${i+1}</strong><select id="ms7103Phone${i}">${optionList(phones,c.peopleEntities[i]||'','Niet gebruiken')}</select></label>`).join('');
    group.innerHTML=`
      <h5>📈 Beweging & aanwezigheid <small>(optioneel)</small></h5>
      <p class="ms7103-presence-help">Koppel de bewegingsentiteit per RuuviTag en kies de telefoons/apparaattrackers die als persoon aan boord meetellen. Ruuvi kan beweging per ruimte meten, maar niet herkennen wíe er bewoog.</p>
      <div class="ms7103-presence-grid">
        <label><strong>Beweging salon</strong><select id="ms7103SalonMotion">${optionList(motions,c.salonMotion)}</select></label>
        <label><strong>Beweging voorhut</strong><select id="ms7103ForwardMotion">${optionList(motions,c.forwardMotion)}</select></label>
      </div>
      <label class="ms7103-ssid"><strong>Naam wifi aan boord (SSID)</strong><input id="ms7103WifiSsid" value="${esc(c.wifiSsid)}" placeholder="bijv. Serenity-WiFi"><small>Alleen nodig wanneer je een 'Wi‑Fi connection / SSID'-sensor kiest. Device trackers gebruiken hun aanwezigheidsstatus.</small></label>
      <div class="ms7103-phone-grid">${phoneRows}</div>
      <div class="ms730-wizard-actions ms7103-presence-actions"><button type="button" id="ms7103SavePresence">✓ Opslaan</button><span>${motions.length} bewegingsentiteit${motions.length===1?'':'en'} · ${phones.length} aanwezigheidssensor${phones.length===1?'':'en'} gevonden</span></div>`;
    group.querySelector('#ms7103SavePresence')?.addEventListener('click',()=>{
      save({salonMotion:$('ms7103SalonMotion')?.value,forwardMotion:$('ms7103ForwardMotion')?.value,wifiSsid:$('ms7103WifiSsid')?.value,peopleEntities:Array.from({length:6},(_,i)=>$(`ms7103Phone${i}`)?.value).filter(Boolean)});
      window.showAppToast?.('Beweging en aanwezigheid opgeslagen ✅');
      renderPresenceCurrent();
    });
  }

  function ensurePage(){
    if($('presence'))return;
    const app=$('appView'); if(!app)return;
    const section=document.createElement('section'); section.id='presence'; section.className='hidden';
    section.innerHTML=`<div class="ms7103-presence-page">
      <header class="ms7103-presence-hero"><div><span class="eyebrow">SERENITY · HOME ASSISTANT</span><h2>Beweging & aanwezigheid</h2><p>Bekijk beweging per ruimte en het geschatte aantal personen aan boord.</p></div><div class="ms7103-presence-icon">📈</div></header>
      <div class="ms7103-presence-stats">
        <article><small>Personen nu</small><strong id="ms7103PeopleCount">–</strong><span id="ms7103PeopleMode">Nog niet gekoppeld</span></article>
        <article><small>Salon beweging</small><strong id="ms7103SalonToday">–</strong><span>geselecteerde dag</span></article>
        <article><small>Voorhut beweging</small><strong id="ms7103ForwardToday">–</strong><span>geselecteerde dag</span></article>
      </div>
      <section class="ms7103-presence-card"><div class="ms7103-presence-toolbar"><label>Datum <input id="ms7103MotionDate" type="date"></label><button id="ms7103RefreshHistory" type="button">↻ Geschiedenis ophalen</button></div><p class="ms7103-note">Ruuvi registreert beweging/trilling van de sensor. Dit zegt in welke ruimte beweging was, niet welke persoon deze veroorzaakte.</p><div id="ms7103MovementStatus" class="ms7103-status">Kies een datum om Home Assistant-geschiedenis te laden.</div><div id="ms7103MovementChart" class="ms7103-chart" aria-label="Beweging per uur"></div><div id="ms7103MovementEvents" class="ms7103-events"></div></section>
      <section class="ms7103-presence-card"><div class="ms7103-card-head"><div><h3>📱 Verbonden telefoons</h3><p>Automatische telling op basis van de in Home Assistant gekozen apparaten.</p></div><div class="ms7103-card-actions"><button type="button" onclick="window.ivmsSetPeopleOnboard?.()">Handmatig aantal</button><button type="button" onclick="captainNavigate('entertainment')">Instellen</button></div></div><div id="ms7103PeopleList" class="ms7103-people-list"></div><p class="ms7103-note">De telling is een schatting. Een persoon kan meerdere apparaten hebben of wifi uitschakelen.</p></section>
    </div>`;
    const before=$('technical'); before?.parentNode?.insertBefore(section,before) || app.appendChild(section);
    const tabs=document.querySelector('.tabs');
    if(tabs&&!tabs.querySelector('[data-target="presence"]')){const b=document.createElement('button');b.className='tab';b.dataset.target='presence';b.textContent='Aanwezigheid';b.onclick=()=>window.captainNavigate?.('presence',b);tabs.appendChild(b)}
    const input=$('ms7103MotionDate'); if(input)input.value=new Date().toISOString().slice(0,10);
    $('ms7103RefreshHistory')?.addEventListener('click',loadHistory);
    input?.addEventListener('change',loadHistory);
  }

  function renderPresenceCurrent(){
    const summary=presenceSummary();
    if($('ms7103PeopleCount'))$('ms7103PeopleCount').textContent=String(summary.count);
    if($('ms7103PeopleMode'))$('ms7103PeopleMode').textContent=summary.configured?'Automatisch via Home Assistant':'Handmatige telling';
    const list=$('ms7103PeopleList');
    if(list)list.innerHTML=summary.people.length?summary.people.map(p=>`<div class="ms7103-person-row ${p.present?'online':'offline'}"><span>${p.present?'●':'○'}</span><strong>${esc(p.name)}</strong><em>${p.present?'aan boord':'niet gedetecteerd'}</em></div>`).join(''):'<div class="ms7103-empty">Kies onder Home Assistant de telefoons of apparaattrackers die moeten meetellen.</div>';
    const key=JSON.stringify(summary.people.map(p=>[p.entity_id,p.present]));
    if(key!==lastCurrentKey){lastCurrentKey=key;window.dispatchEvent(new CustomEvent('mijnserenity-presence-updated',{detail:summary}))}
  }

  function dateRange(value){
    const parts=String(value||'').split('-').map(Number); if(parts.length!==3||parts.some(n=>!Number.isFinite(n)))return null;
    const start=new Date(parts[0],parts[1]-1,parts[2],0,0,0,0); const end=new Date(start); end.setDate(end.getDate()+1); return {start,end};
  }
  const changedAt=item=>new Date(item?.last_changed||item?.last_updated||item?.when||0);
  const activeState=v=>['on','active','detected','motion','occupied','true','1'].includes(String(v||'').toLowerCase());
  function eventsFromHistory(items,label){
    const rows=(Array.isArray(items)?items:[]).slice().sort((a,b)=>changedAt(a)-changedAt(b));
    const out=[]; let prevNum=null, prevActive=false;
    rows.forEach((item,index)=>{
      const raw=String(item?.state??''); const num=Number(raw); const when=changedAt(item);
      if(!Number.isNaN(num)){
        if(prevNum!==null){let delta=num-prevNum;if(delta<0&&prevNum>=0&&prevNum<=254&&num>=0&&num<=254)delta=(255-prevNum)+num;if(delta>0&&delta<=255)out.push({when,label,count:Math.round(delta)})}
        prevNum=num;
      }else{
        const active=activeState(raw); if(index>0&&active&&!prevActive)out.push({when,label,count:1}); prevActive=active;
      }
    }); return out;
  }
  function historyGroupFor(data,id){return (Array.isArray(data)?data:[]).find(group=>Array.isArray(group)&&group.some(item=>item?.entity_id===id))||[]}

  async function loadHistory(){
    ensurePage();
    const c=config(), ids=[c.salonMotion,c.forwardMotion].filter(Boolean), status=$('ms7103MovementStatus');
    if(!ids.length){if(status)status.textContent='Koppel eerst een bewegingsentiteit bij Home Assistant → Beweging & aanwezigheid.';renderChart([]);return}
    if(typeof window.ms730GetHistory!=='function'){if(status)status.textContent='Home Assistant-geschiedenis is nog niet beschikbaar. Vernieuw MijnSerenity na de update.';return}
    const range=dateRange($('ms7103MotionDate')?.value); if(!range)return;
    if(status)status.textContent='Geschiedenis wordt opgehaald…';
    try{
      const data=await window.ms730GetHistory(ids,range.start,range.end);
      const events=[...eventsFromHistory(historyGroupFor(data,c.salonMotion),SLOT_LABELS.salon),...eventsFromHistory(historyGroupFor(data,c.forwardMotion),SLOT_LABELS.forward)].sort((a,b)=>a.when-b.when);
      renderChart(events);
      const salon=events.filter(e=>e.label===SLOT_LABELS.salon).reduce((a,e)=>a+e.count,0), forward=events.filter(e=>e.label===SLOT_LABELS.forward).reduce((a,e)=>a+e.count,0);
      if($('ms7103SalonToday'))$('ms7103SalonToday').textContent=String(salon); if($('ms7103ForwardToday'))$('ms7103ForwardToday').textContent=String(forward);
      if(status)status.textContent=events.length?`${salon+forward} beweging${salon+forward===1?'':'en'} geregistreerd op deze dag.`:'Geen beweging in de Home Assistant-geschiedenis voor deze dag.';
      const list=$('ms7103MovementEvents');
      if(list)list.innerHTML=events.length?events.slice().reverse().slice(0,80).map(e=>`<div class="ms7103-event"><time>${e.when.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}</time><strong>${esc(e.label)}</strong><span>+${e.count}</span></div>`).join(''):'<div class="ms7103-empty">Geen bewegingsmomenten gevonden.</div>';
    }catch(error){console.warn('Bewegingsgeschiedenis mislukt:',error);if(status)status.textContent=error?.message||'Geschiedenis kon niet worden opgehaald.'}
  }

  function renderChart(events){
    const chart=$('ms7103MovementChart'); if(!chart)return;
    const salon=Array(24).fill(0), forward=Array(24).fill(0);
    events.forEach(e=>{const h=e.when.getHours();(e.label===SLOT_LABELS.salon?salon:forward)[h]+=e.count});
    const max=Math.max(1,...salon,...forward);
    chart.innerHTML=`<div class="ms7103-chart-legend"><span><i class="salon"></i>Salon</span><span><i class="forward"></i>Voorhut</span></div><div class="ms7103-bars">${Array.from({length:24},(_,h)=>`<div class="ms7103-hour" title="${String(h).padStart(2,'0')}:00 · Salon ${salon[h]} · Voorhut ${forward[h]}"><div class="ms7103-stack"><i class="salon" style="height:${Math.max(salon[h]?4:0,salon[h]/max*100)}%"></i><i class="forward" style="height:${Math.max(forward[h]?4:0,forward[h]/max*100)}%"></i></div><small>${h%3===0?String(h).padStart(2,'0'):''}</small></div>`).join('')}</div>`;
  }

  function queue(){if(renderQueued)return;renderQueued=true;setTimeout(()=>{renderQueued=false;buildConfigGroup();renderPresenceCurrent()},80)}
  function install(){ensurePage();queue();renderPresenceCurrent();window.ms7103GetPresenceSummary=presenceSummary;window.ms7103InitPresencePage=()=>{ensurePage();renderPresenceCurrent();loadHistory()};window.addEventListener('mijnserenity-ha-state-updated',queue);window.addEventListener('mijnserenity-ha-connected',queue);window.addEventListener('mijnserenity-presence-config-updated',queue);setInterval(renderPresenceCurrent,5000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
