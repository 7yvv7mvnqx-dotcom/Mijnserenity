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
    if(!finite(value)) return {state:'warning',asset:'tank-water-mid.svg',title:'Drinkwater',value:'Nog onbekend',meta:'Wachten op tankstand',speech:'Ik hou mijn bekertje alvast paraat.'};
    if(value>=80) return {state:'good',asset:'tank-water-full.svg',title:'Drinkwater',value:`${Math.round(value)}% gevuld`,meta:'Voorraad is top',speech:'Plons! Genoeg voor koffie, thee en een frisse douche.'};
    if(value>=55) return {state:'good',asset:'tank-water-good.svg',title:'Drinkwater',value:`${Math.round(value)}% over`,meta:'Netjes op peil',speech:'Nog geen dorststress aan dek.'};
    if(value>=30) return {state:'warning',asset:'tank-water-mid.svg',title:'Drinkwater',value:`${Math.round(value)}% over`,meta:'Bijhouden',speech:'Rustig aan met extra lange douches, kapitein.'};
    if(value>=15) return {state:'critical',asset:'tank-water-low.svg',title:'Drinkwater',value:`${Math.round(value)}% over`,meta:'Dorstalarm nadert',speech:'Ik zie hier al droge kelen in de verte.'};
    return {state:'critical',asset:'tank-water-empty.svg',title:'Drinkwater',value:`${Math.round(value)}% over`,meta:'Bijna kurkdroog',speech:'Nog even en we tellen druppels per persoon.'};
  }

  function weatherMood(tempText, windText, desc){
    const temp=num(tempText), wind=num(windText);
    const description=String(desc||'').trim() || 'Actueel weer';
    if(finite(wind) && wind>=35) return {state:'warning',asset:'tech-system-warn.svg',title:'Weer',value:`${Math.round(temp||0)}° · ${description}`,meta:`Wind ${Math.round(wind)} km/u`,speech:'Ik zet mijn denkbeeldige pet maar even steviger vast.'};
    if(finite(temp) && temp>=23) return {state:'good',asset:'tech-solar-good.svg',title:'Weer',value:`${Math.round(temp)}° · ${description}`,meta:`Wind ${Math.round(wind||0)} km/u`,speech:'Mooi vaarweer — zelfs de zon doet gezellig mee.'};
    return {state:'good',asset:'tech-solar-idle.svg',title:'Weer',value:`${finite(temp)?Math.round(temp):'–'}° · ${description}`,meta:`Wind ${finite(wind)?Math.round(wind):'–'} km/u`,speech:'Rustig weerbeeld — prima voor een ontspannen tochtje.'};
  }

  function energyMood(){
    const batt=num($('ivmsBatteryVoltage')?.textContent);
    const powerSource=String($('ivmsPowerSource')?.textContent||'').trim() || 'ACCU';
    const meta=String($('ivmsBatteryMeta')?.textContent||'').trim() || 'Energieoverzicht';
    if(finite(batt) && batt>=12.45) return {state:'good',asset:'tech-battery-good.svg',title:'Energie',value:`${$('ivmsBatteryVoltage')?.textContent||'– V'} · ${powerSource}`,meta, speech:'De boordspanning glimlacht breed naar je terug.'};
    if(finite(batt) && batt>=12.15) return {state:'warning',asset:'tech-battery-warn.svg',title:'Energie',value:`${$('ivmsBatteryVoltage')?.textContent||'– V'} · ${powerSource}`,meta, speech:'Ik zou zon of walstroom wel kunnen waarderen, hoor.'};
    return {state:'critical',asset:'tech-battery-crit.svg',title:'Energie',value:`${$('ivmsBatteryVoltage')?.textContent||'– V'} · ${powerSource}`,meta, speech:'Ik voel me een tikje leeg — tijd voor wat verse stroom.'};
  }

  function captainMood(){
    const people=String($('ivmsPeople')?.textContent||'0').trim();
    const mode=String($('ivmsPeopleMode')?.textContent||'').trim() || 'Aanwezigheid onbekend';
    const security=String($('ivmsSecurityStatus')?.textContent||'').toLowerCase();
    if(security.includes('aandacht') || security.includes('controleren')) return {state:'warning',asset:'tech-system-warn.svg',title:'Kapiteinsoverzicht',value:`${people} personen aan boord`,meta:mode, speech:'Ik hou de boel in de gaten — even een extra blikje werpen graag.'};
    if(security.includes('alarm')) return {state:'critical',asset:'tech-system-crit.svg',title:'Kapiteinsoverzicht',value:`${people} personen aan boord`,meta:mode, speech:'Ik maak me zorgen — hier moet even naar gekeken worden.'};
    return {state:'good',asset:'tech-system-good.svg',title:'Kapiteinsoverzicht',value:`${people} personen aan boord`,meta:mode, speech:'Welkom aan boord! Alles oogt heerlijk ontspannen.'};
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
      speech: state==='critical' ? 'Een van de tanks roept duidelijk om aandacht.' : state==='warning' ? 'Niet dramatisch, maar ik zou de tankjes wel in de gaten houden.' : 'De tanks liggen er relaxed en verzorgd bij.'
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
    button.innerHTML=`<div class="home-cartoon-art"><img src="${mood.asset}" alt="${mood.title} illustratie"></div><div class="home-cartoon-copy"><b>${mood.title}</b><strong>${mood.value}</strong><span>${mood.meta}</span><div class="home-cartoon-speech">${mood.speech}</div></div>`;
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
