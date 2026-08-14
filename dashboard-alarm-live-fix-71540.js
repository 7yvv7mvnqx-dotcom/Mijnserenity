/* MijnSerenity 7.15.40 — echte alarmstatus op Pro-dashboard */
(()=>{
  'use strict';
  if(window.__msAlarmLiveFix71540)return;
  window.__msAlarmLiveFix71540=true;

  const $=id=>document.getElementById(id);
  const lower=value=>String(value||'').toLowerCase();
  const setText=(el,value)=>{if(el&&el.textContent!==String(value))el.textContent=String(value)};

  function getWarnings(){
    try{
      if(typeof window.technicalWarnings==='function'){
        const list=window.technicalWarnings();
        if(Array.isArray(list))return list.filter(Boolean);
      }
    }catch(error){
      console.warn('MijnSerenity alarmstatus lezen mislukt:',error);
    }
    return [];
  }

  function systemSaysAlarm(){
    const value=lower($('mscSystem')?.textContent);
    return /alarm|krit|storing|waarsch|let op|fout/.test(value);
  }

  function alarmLine(){
    return document.querySelector('.msc-status-main #mscSystem + span');
  }

  function brandStatus(){
    return document.querySelector('.msc-brand small');
  }

  function severity(warnings){
    if(warnings.some(item=>lower(item?.level)==='critical'))return 'critical';
    if(warnings.length||systemSaysAlarm())return 'warning';
    return 'ok';
  }

  function warningSummary(warnings){
    if(!warnings.length){
      return systemSaysAlarm()
        ?'Actief alarm aanwezig · tik voor details'
        :'Geen actieve alarmen';
    }
    const titles=warnings
      .map(item=>String(item?.title||item?.text||'Melding').trim())
      .filter(Boolean);
    const first=titles.slice(0,2).join(' · ');
    const more=Math.max(0,titles.length-2);
    return more?`${first} · +${more} meer`:first;
  }

  function applyOverall(warnings){
    const level=severity(warnings);
    const system=$('mscSystem');
    const line=alarmLine();
    const card=document.querySelector('.msc-status-main');
    const check=document.querySelector('.msc-status-main .msc-check');
    const brand=brandStatus();

    if(level==='critical'){
      setText(system,warnings.length>1?`ALARM · ${warnings.length}`:'ALARM');
      setText(line,warningSummary(warnings));
      if(system)system.style.color='#ff5b5b';
      if(line)line.style.color='#ffd0d0';
      if(check){check.textContent='!';check.style.color='#ff5b5b';check.style.borderColor='#ff5b5b';}
      if(card){card.style.borderColor='rgba(255,91,91,.72)';card.style.boxShadow='0 0 0 1px rgba(255,91,91,.18),0 10px 28px rgba(0,0,0,.2)';}
      if(brand){brand.innerHTML='<i></i><span>⚠ Systeemalarm &nbsp;&nbsp; Controle vereist</span>';brand.style.color='#ff8a8a';}
      return;
    }

    if(level==='warning'){
      setText(system,warnings.length?`LET OP · ${warnings.length}`:'ALARM');
      setText(line,warningSummary(warnings));
      if(system)system.style.color='#ffb020';
      if(line)line.style.color='#ffe0a6';
      if(check){check.textContent='!';check.style.color='#ffb020';check.style.borderColor='#ffb020';}
      if(card){card.style.borderColor='rgba(255,176,32,.62)';card.style.boxShadow='0 0 0 1px rgba(255,176,32,.14),0 10px 28px rgba(0,0,0,.2)';}
      if(brand){brand.innerHTML='<i></i><span>⚠ Systeemmelding &nbsp;&nbsp; Controle nodig</span>';brand.style.color='#ffca63';}
      return;
    }

    setText(system,'Alles normaal');
    setText(line,'Geen actieve alarmen');
    if(system)system.style.removeProperty('color');
    if(line)line.style.removeProperty('color');
    if(check){check.textContent='✓';check.style.removeProperty('color');check.style.removeProperty('border-color');}
    if(card){card.style.removeProperty('border-color');card.style.removeProperty('box-shadow');}
    if(brand){brand.innerHTML='<i></i><span>Systeem OK &nbsp;&nbsp; Alles normaal</span>';brand.style.removeProperty('color');}
  }

  function tileByLabel(label){
    return [...document.querySelectorAll('.msc-status-tile')].find(tile=>lower(tile.querySelector('span')?.textContent)===lower(label))||null;
  }

  function warningFor(warnings,pattern){
    return warnings.filter(item=>pattern.test(lower(`${item?.title||''} ${item?.text||''}`)));
  }

  function applyTile(label,warnings,pattern){
    const tile=tileByLabel(label);
    if(!tile)return;
    const target=tile.querySelector('strong');
    const matches=warningFor(warnings,pattern);
    const critical=matches.some(item=>lower(item?.level)==='critical');
    if(critical){
      setText(target,'ALARM');
      if(target)target.style.color='#ff5b5b';
      tile.style.borderColor='rgba(255,91,91,.65)';
    }else if(matches.length){
      setText(target,'LET OP');
      if(target)target.style.color='#ffb020';
      tile.style.borderColor='rgba(255,176,32,.58)';
    }else{
      setText(target,'OK');
      if(target)target.style.removeProperty('color');
      tile.style.removeProperty('border-color');
    }
  }

  function sync(){
    if(!$('msProDashboard'))return;
    const warnings=getWarnings();
    applyOverall(warnings);
    applyTile("Accu's",warnings,/accu|battery|spanning|voltage/);
    applyTile('Motor',warnings,/motor|engine|koel|coolant|olie|oil|temperatuur|temperature/);
    applyTile('Bilgepomp',warnings,/bilge|bilgepomp|lenspomp|water in bilge/);
    applyTile('Navigatie',warnings,/navig|gps|diepte|depth|roer|rudder|ais/);
  }

  function install(){
    sync();
    ['mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-ruuvi-vrm-updated']
      .forEach(name=>window.addEventListener(name,sync,{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()},{passive:true});
    setInterval(()=>{if(!document.hidden)sync()},1000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
