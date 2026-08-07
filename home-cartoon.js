(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const finite=value=>Number.isFinite(Number(value));
  const num=(text)=>{
    const raw=String(text||'').replace(',', '.');
    const m=raw.match(/-?\d+(?:\.\d+)?/);
    return m?Number(m[0]):null;
  };

  function chooseStatus(levels){
    return levels.includes('critical') ? 'critical' : levels.includes('warning') ? 'warning' : 'good';
  }

  function waterMood(level){
    const value=num(level);
    if(!finite(value)) return {state:'warning',emoji:'🥤',title:'Drinkwater',value:'Nog onbekend',meta:'Wachten op tankstand',speech:'Kleine gids: tankstand nog even afwachten.'};
    if(value>=80) return {state:'good',emoji:'💧',title:'Drinkwater',value:`${Math.round(value)}% gevuld`,meta:'Voorraad is top',speech:'Gids: ruim voldoende aan boord.'};
    if(value>=55) return {state:'good',emoji:'🚰',title:'Drinkwater',value:`${Math.round(value)}% over`,meta:'Netjes op peil',speech:'Gids: voorraad is prima.'};
    if(value>=30) return {state:'warning',emoji:'🥤',title:'Drinkwater',value:`${Math.round(value)}% over`,meta:'Bijhouden',speech:'Gids: verbruik rustig in de gaten houden.'};
    if(value>=15) return {state:'critical',emoji:'🥵',title:'Drinkwater',value:`${Math.round(value)}% over`,meta:'Dorstalarm nadert',speech:'Gids: binnenkort bijvullen is slim.'};
    return {state:'critical',emoji:'🏜️',title:'Drinkwater',value:`${Math.round(value)}% over`,meta:'Bijna kurkdroog',speech:'Gids: snel water bijvullen.'};
  }

  function weatherMood(tempText, windText, desc){
    const temp=num(tempText), wind=num(windText);
    const description=String(desc||'').trim() || 'Actueel weer';
    if(finite(wind) && wind>=35) return {state:'warning',emoji:'🌦️',title:'Weer',value:`${Math.round(temp||0)}° · ${description}`,meta:`Wind ${Math.round(wind)} km/u`,speech:'Gids: let even op wind en weer.'};
    if(finite(temp) && temp>=23) return {state:'good',emoji:'☀️',title:'Weer',value:`${Math.round(temp)}° · ${description}`,meta:`Wind ${Math.round(wind||0)} km/u`,speech:'Gids: heerlijk weer om te varen.'};
    return {state:'good',emoji:'☁️',title:'Weer',value:`${finite(temp)?Math.round(temp):'–'}° · ${description}`,meta:`Wind ${finite(wind)?Math.round(wind):'–'} km/u`,speech:'Gids: rustige weersituatie.'};
  }

  function energyMood(){
    const batt=num($('ivmsBatteryVoltage')?.textContent);
    const powerSource=String($('ivmsPowerSource')?.textContent||'').trim() || 'ACCU';
    const meta=String($('ivmsBatteryMeta')?.textContent||'').trim() || 'Energieoverzicht';
    if(finite(batt) && batt>=12.45) return {state:'good',emoji:'🔋',title:'Energie',value:`${$('ivmsBatteryVoltage')?.textContent||'– V'} · ${powerSource}`,meta, speech:'Gids: energie is mooi op peil.'};
    if(finite(batt) && batt>=12.15) return {state:'warning',emoji:'🔋',title:'Energie',value:`${$('ivmsBatteryVoltage')?.textContent||'– V'} · ${powerSource}`,meta, speech:'Gids: laden binnenkort handig.'};
    return {state:'critical',emoji:'🪫',title:'Energie',value:`${$('ivmsBatteryVoltage')?.textContent||'– V'} · ${powerSource}`,meta, speech:'Gids: graag snel laden.'};
  }

  function captainMood(){
    const people=String($('ivmsPeople')?.textContent||'0').trim();
    const mode=String($('ivmsPeopleMode')?.textContent||'').trim() || 'Aanwezigheid onbekend';
    const security=String($('ivmsSecurityStatus')?.textContent||'').toLowerCase();
    if(security.includes('aandacht') || security.includes('controleren')) return {state:'warning',emoji:'🌦️',title:'Kapiteinsoverzicht',value:`${people} personen aan boord`,meta:mode, speech:'Gids: even extra controleren.'};
    if(security.includes('alarm')) return {state:'critical',emoji:'🚨',title:'Kapiteinsoverzicht',value:`${people} personen aan boord`,meta:mode, speech:'Gids: directe aandacht nodig.'};
    return {state:'good',emoji:'⚓',title:'Kapiteinsoverzicht',value:`${people} personen aan boord`,meta:mode, speech:'Gids: alles oogt rustig aan boord.'};
  }

  function tankMood(){
    const fuel=num($('ivmsTankFuelValue')?.textContent), water=num($('ivmsTankWaterValue')?.textContent), waste=num($('ivmsTankWasteValue')?.textContent);
    const states=[];
    if(finite(fuel)) states.push(fuel<25?'critical':fuel<55?'warning':'good');
    if(finite(water)) states.push(water<15?'critical':water<55?'warning':'good');
    if(finite(waste)) states.push(waste>89?'critical':waste>49?'warning':'good');
    const state=chooseStatus(states.length?states:['good']);
    const asset = state==='critical' ? 'tech-fuel-crit.svg' : state==='warning' ? 'tech-fuel-warn.svg' : 'tech-fuel-good.svg';
    return {
      state,
      asset,
      title:'Tanks',
      value:`Brandstof ${finite(fuel)?Math.round(fuel):'–'}% · Water ${finite(water)?Math.round(water):'–'}%`,
      meta:`Vuilwater ${finite(waste)?Math.round(waste):'–'}%`,
      speech: state==='critical' ? 'Gids: één of meer tanks vragen aandacht.' : state==='warning' ? 'Gids: tankniveaus blijven volgen.' : 'Gids: tankniveaus zijn netjes.'
    };
  }

  function ensureDock(){
    const dashboard=$('dashboard');
    const ivms=$('serenityIvms');
    if(!dashboard || !ivms) return null;
    ivms.classList.add('maritime-mode');
    let dock=$('homeCartoonDock');
    if(dock) return dock;
    dock=document.createElement('section');
    dock.id='homeCartoonDock';
    dock.className='home-cartoon-dock';
    dock.innerHTML=`
      <div class="home-cartoon-head">
        <div class="home-cartoon-title">
          <strong>Captain cartoons aan dek</strong>
          <span>Een speels overzicht van de belangrijkste boordstatussen</span>
        </div>
        <div id="homeCartoonBadge" class="home-cartoon-badge">Serenity in balans</div>
      </div>
      <div class="home-cartoon-grid">
        <button id="homeCartoonCaptain" class="home-cartoon-card" type="button" onclick="captainNavigate('dashboard')"></button>
        <button id="homeCartoonEnergy" class="home-cartoon-card" type="button" onclick="captainNavigate('technical')"></button>
        <button id="homeCartoonWeather" class="home-cartoon-card" type="button" onclick="captainNavigate('weather')"></button>
        <button id="homeCartoonTanks" class="home-cartoon-card" type="button" onclick="captainNavigate('technical')"></button>
      </div>`;
    ivms.insertAdjacentElement('afterend', dock);
    return dock;
  }

  function paint(button,mood){
    if(!button || !mood) return;
    button.className=`home-cartoon-card ${mood.state}`;
    button.innerHTML=`<div class="home-cartoon-art" aria-hidden="true">${mood.emoji || '🙂'}</div><div class="home-cartoon-copy"><b>${mood.title}</b><strong>${mood.value}</strong><span>${mood.meta}</span><div class="home-cartoon-speech">${mood.speech}</div></div>`;
  }

  function update(){
    const dock=ensureDock();
    if(!dock) return;
    const captain=captainMood();
    const energy=energyMood();
    const weather=weatherMood($('ivmsWeatherTemp')?.textContent, $('ivmsWindValue')?.textContent, $('ivmsWeatherDescription')?.textContent);
    const tanks=tankMood();
    paint($('homeCartoonCaptain'), captain);
    paint($('homeCartoonEnergy'), energy);
    paint($('homeCartoonWeather'), weather);
    paint($('homeCartoonTanks'), tanks);
    const state=chooseStatus([captain.state, energy.state, weather.state, tanks.state]);
    const badge=$('homeCartoonBadge');
    if(badge){
      badge.className=`home-cartoon-badge ${state}`;
      badge.textContent= state==='critical' ? 'Serenity vraagt aandacht' : state==='warning' ? 'Serenity houdt je scherp' : 'Serenity in balans';
    }
  }

  function install(){
    update();
    setTimeout(update,800);
    setInterval(update,4000);
    ['mijnserenity-ha-state-updated','mijnserenity-presence-updated','mijnserenity-ruuvi-config-updated'].forEach(evt=>window.addEventListener(evt,update));
    document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') setTimeout(update,150); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
