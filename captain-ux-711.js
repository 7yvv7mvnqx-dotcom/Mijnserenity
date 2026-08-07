/* MijnSerenity 7.11.0 — Captain UX: contextueel startscherm en slimme status */
(()=>{
  'use strict';
  const BUILD='7.11.0';
  const $=id=>document.getElementById(id);
  const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
  const txt=(id,fallback='–')=>clean($(id)?.textContent)||fallback;
  const num=value=>{
    const match=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  };
  const finite=value=>Number.isFinite(Number(value));
  let timer=0;
  let installed=false;

  function nav(route){
    if(route==='waterkaarten'){window.openWaterkaarten?.();return;}
    window.captainNavigate?.(route);
  }

  function battery(){
    const pct=num($('ivmsBatteryRing')?.querySelector('strong')?.textContent);
    return {pct,voltage:txt('ivmsBatteryVoltage'),current:txt('ivmsBatteryCurrent'),power:txt('ivmsBatteryPower'),remaining:txt('ivmsBatteryTime')};
  }
  function climate(){
    try{return window.ms7102GetRuuviClimate?.()||null}catch{return null}
  }
  function presence(){
    try{return window.ms7103GetPresenceSummary?.()||null}catch{return null}
  }
  function shore(){return /walstroom/i.test(txt('ivmsPowerSource',''))}
  function sailing(){
    const start=$('liveStartButton'),stop=$('liveStopButton');
    if(stop&&!stop.classList.contains('hidden'))return true;
    if(start&&start.classList.contains('hidden'))return true;
    return false;
  }

  function installStatusStrip(){
    const welcome=$('ms750SimpleDashboard')?.querySelector('.ms750-welcome-card');
    if(!welcome||$('ms711CaptainStatus'))return;
    const strip=document.createElement('div');
    strip.id='ms711CaptainStatus';
    strip.className='ms711-status-strip';
    strip.setAttribute('aria-label','Actuele boordstatus');
    strip.innerHTML=`
      <div class="ms711-status-pill" data-ms711="presence"><small>Boordstatus</small><strong>Controleren…</strong></div>
      <div class="ms711-status-pill" data-ms711="battery"><small>Accu</small><strong>–</strong></div>
      <div class="ms711-status-pill" data-ms711="power"><small>Stroom</small><strong>–</strong></div>
      <div class="ms711-status-pill" data-ms711="climate"><small>Salon</small><strong>–</strong></div>`;
    welcome.insertAdjacentElement('afterend',strip);
  }

  function card(icon,label,id,route){
    return `<button type="button" class="ms711-smart-card" data-ms711-route="${route}" aria-label="${label}">
      <div class="ms711-card-head"><span aria-hidden="true">${icon}</span><small>${label}</small></div>
      <strong class="ms711-main-value" id="${id}Main">–</strong>
      <p id="${id}Sub">Gegevens worden bijgewerkt…</p>
      <div id="${id}Extra" class="ms711-subvalue"></div>
    </button>`;
  }

  function installOverview(){
    const root=$('ms750SimpleDashboard');
    if(!root||$('ms711SmartOverview'))return;
    const node=document.createElement('section');
    node.id='ms711SmartOverview';
    node.setAttribute('aria-label','Slim overzicht');
    node.innerHTML=`
      <div class="ms711-overview">
        ${card('⚡','Energie','ms711Energy','technical')}
        ${card('🌦️','Weer','ms711Weather','weather')}
        ${card('🚤','Varen','ms711Sailing','live')}
        ${card('📍','Positie','ms711Location','map')}
      </div>
      <div id="ms711AlertCard" class="ms711-alert-card"><div class="ms711-alert-line"><span class="ms711-alert-icon">✓</span><div class="ms711-alert-copy"><strong>Alles wordt gecontroleerd</strong><small>MijnSerenity verzamelt de actuele boordstatus.</small></div></div></div>
      <div class="ms711-start-row">
        <button type="button" class="ms711-start-sailing" data-ms711-route="live">▶ Start varen</button>
        <button type="button" data-ms711-route="waterkaarten">🗺️ Waterkaarten</button>
      </div>`;
    const auto=root.querySelector('.ms750-auto-card');
    if(auto)auto.insertAdjacentElement('afterend',node); else root.appendChild(node);
    node.addEventListener('click',event=>{
      const target=event.target.closest('[data-ms711-route]');
      if(target)nav(target.dataset.ms711Route);
    });
  }

  function ensureMoreShortcuts(){
    const grid=$('ms750MoreLayer')?.querySelector('.ms750-more-grid');
    if(!grid||grid.querySelector('[data-ms711-special]'))return;
    const mk=(icon,title,route,special='')=>{
      const b=document.createElement('button');
      b.type='button';b.className='ms750-more-route';b.dataset.ms711Special=special||route;
      b.innerHTML=`<span aria-hidden="true">${icon}</span><strong>${title}</strong>`;
      b.addEventListener('click',()=>{
        if(route==='waterkaarten')window.openWaterkaarten?.();
        else nav(route);
        if(special==='maintenance')setTimeout(()=>document.querySelector('#technical .technical-maintenance-card')?.scrollIntoView({behavior:'smooth',block:'start'}),250);
      });
      return b;
    };
    grid.prepend(mk('🗺️','Waterkaarten','waterkaarten','waterkaarten'));
    grid.append(mk('🔧','Onderhoud','technical','maintenance'));
  }

  function renderRuuvi(extra){
    const data=climate();
    if(!data)return extra.innerHTML='<span>Ruuvi nog niet gekoppeld</span>';
    const mini=slot=>{
      const s=data?.[slot];
      if(!s)return'';
      const temperature=finite(s.temperature)?`${Number(s.temperature).toLocaleString('nl-NL',{maximumFractionDigits:1})} °C`:'– °C';
      const humidity=finite(s.humidity)?`${Math.round(s.humidity)}% RV`:'–';
      return `<div class="ms711-ruuvi-mini"><small>${s.label||slot}</small><strong>${temperature}</strong><em>${humidity}</em></div>`;
    };
    extra.className='ms711-ruuvi-row';
    extra.innerHTML=mini('salon')+mini('forward');
  }

  function updateStatus(){
    if(!installed)return;
    const batt=battery(),pres=presence(),isShore=shore(),isSailing=sailing(),cl=climate();
    const presencePill=document.querySelector('[data-ms711="presence"]');
    const battPill=document.querySelector('[data-ms711="battery"]');
    const powerPill=document.querySelector('[data-ms711="power"]');
    const climatePill=document.querySelector('[data-ms711="climate"]');
    if(presencePill){
      const count=finite(pres?.count)?Number(pres.count):null;
      presencePill.querySelector('strong').textContent=isSailing?'Onderweg':count===null?'Aan boord':`${count} ${count===1?'persoon':'personen'}`;
      presencePill.classList.toggle('is-ok',isSailing||count>0);
    }
    if(battPill){
      battPill.querySelector('strong').textContent=finite(batt.pct)?`${Math.round(batt.pct)}%`:`${batt.voltage}`;
      battPill.classList.toggle('is-ok',finite(batt.pct)&&batt.pct>=40);
      battPill.classList.toggle('is-warn',finite(batt.pct)&&batt.pct<40);
    }
    if(powerPill){powerPill.querySelector('strong').textContent=isShore?'Walstroom':'Accu';powerPill.classList.toggle('is-ok',isShore)}
    if(climatePill){
      const temp=cl?.salon?.temperature;
      climatePill.querySelector('strong').textContent=finite(temp)?`${Number(temp).toLocaleString('nl-NL',{maximumFractionDigits:1})} °C`:txt('ivmsCabinTemp');
    }

    const energyMain=$('ms711EnergyMain'),energySub=$('ms711EnergySub'),energyExtra=$('ms711EnergyExtra');
    if(energyMain)energyMain.textContent=finite(batt.pct)?`${Math.round(batt.pct)}% accu`:batt.voltage;
    if(energySub)energySub.textContent=`${batt.voltage} · ${batt.current} · ${batt.power}`;
    if(energyExtra)energyExtra.innerHTML=`<div class="ms711-energy-flow"><span>☀️ ${txt('ivmsSolarPower')}</span><i></i><span>🔋</span><i></i><span>${isShore?'🔌 Wal':'🚤 Boot'}</span></div>`;

    const wMain=$('ms711WeatherMain'),wSub=$('ms711WeatherSub'),wExtra=$('ms711WeatherExtra');
    if(wMain)wMain.textContent=txt('ivmsOutsideTemp');
    if(wSub)wSub.textContent=`Wind ${txt('ivmsWindValue')} km/u · ${txt('ivmsWindUnit')}`;
    if(wExtra)wExtra.textContent='Tik voor verwachting, radar en waarschuwingen';

    const sMain=$('ms711SailingMain'),sSub=$('ms711SailingSub'),sExtra=$('ms711SailingExtra');
    const speed=txt('ivmsSpeed','0,0');
    if(sMain)sMain.textContent=isSailing?`${speed} km/u`:'Klaar om te varen';
    if(sSub)sSub.textContent=isSailing?`Koers ${txt('ivmsHeading')} ${txt('ivmsHeadingDir')}`:'GPS, route en automatisch logboek';
    if(sExtra)sExtra.textContent=isSailing?`${txt('liveDistance','0,00')} km gevaren`:'Start met één tik';

    const lMain=$('ms711LocationMain'),lSub=$('ms711LocationSub'),lExtra=$('ms711LocationExtra');
    const lat=txt('ivmsGpsLat','GPS nog niet actief'),lon=txt('ivmsGpsLon','');
    if(lMain)lMain.textContent=/gps nog/i.test(lat)?'Serenity':txt('ivmsGpsStatus','Live positie');
    if(lSub)lSub.textContent=/gps nog/i.test(lat)?'Start varen voor live positie':`${lat} · ${lon}`;
    if(lExtra){renderRuuvi(lExtra)}

    renderAlerts(batt,isShore,isSailing,cl);
    const startButton=document.querySelector('.ms711-start-sailing');
    if(startButton)startButton.textContent=isSailing?'⛵ Open vaarmodus':'▶ Start varen';
    ensureMoreShortcuts();
  }

  function renderAlerts(batt,isShore,isSailing,cl){
    const card=$('ms711AlertCard');if(!card)return;
    const alerts=[];
    if(finite(batt.pct)&&batt.pct<30)alerts.push(`Huishoudaccu staat op ${Math.round(batt.pct)}%.`);
    const salon=cl?.salon?.temperature,forward=cl?.forward?.temperature;
    if(finite(salon)&&salon>30)alerts.push(`Salon is warm: ${Number(salon).toLocaleString('nl-NL',{maximumFractionDigits:1})} °C.`);
    if(finite(forward)&&forward>30)alerts.push(`Voorhut is warm: ${Number(forward).toLocaleString('nl-NL',{maximumFractionDigits:1})} °C.`);
    const bilge=txt('ivmsBilgeStatus','');
    if(bilge&&!/geen melding|normaal|ok/i.test(bilge))alerts.push(`Bilge: ${bilge}.`);
    card.classList.toggle('is-warning',alerts.length>0);
    card.innerHTML=alerts.length
      ?`<div class="ms711-alert-line"><span class="ms711-alert-icon">⚠️</span><div class="ms711-alert-copy"><strong>${alerts.length} aandachtspunt${alerts.length===1?'':'en'}</strong><small>${alerts.join(' ')}</small></div></div>`
      :`<div class="ms711-alert-line"><span class="ms711-alert-icon">✓</span><div class="ms711-alert-copy"><strong>Alles OK</strong><small>${isSailing?'Vaarmodus actief. MijnSerenity blijft de boordstatus volgen.':isShore?'Walstroom actief en geen directe waarschuwingen.':'Geen directe waarschuwingen gedetecteerd.'}</small></div></div>`;
  }

  function install(){
    if(installed)return;
    installStatusStrip();installOverview();ensureMoreShortcuts();
    if(!$('ms711SmartOverview'))return;
    installed=true;
    document.documentElement.dataset.ms711='true';
    updateStatus();
    clearInterval(timer);timer=setInterval(updateStatus,4000);
    ['mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-presence-updated','mijnserenity-presence-config-updated'].forEach(name=>window.addEventListener(name,updateStatus));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateStatus()});
    console.info(`MijnSerenity Captain UX ${BUILD} actief.`);
  }

  const observer=new MutationObserver(()=>{
    if(!installed)install();
    else ensureMoreShortcuts();
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{observer.observe(document.body,{childList:true,subtree:true});setTimeout(install,250)},{once:true});
  else{observer.observe(document.body,{childList:true,subtree:true});setTimeout(install,250)}
})();
