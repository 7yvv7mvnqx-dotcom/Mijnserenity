(()=>{
  'use strict';
  const $=id=>document.getElementById(id);

  function numberFrom(id){
    const raw=String($(id)?.textContent||'').replace(',','.');
    const match=raw.match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  }

  function setEmoji(id,emoji,label){
    const el=$(id);
    if(!el)return;
    el.textContent=emoji;
    el.setAttribute('aria-label',label);
    el.setAttribute('title',label);
  }

  function batteryEmoji(voltage){
    if(!Number.isFinite(voltage))return ['😐','Nog geen meting'];
    if(voltage>=12.45)return ['😄','Accu goed'];
    if(voltage>=12.15)return ['😐','Accu vraagt aandacht'];
    return ['😟','Accu laag'];
  }

  function fuelEmoji(level){
    if(!Number.isFinite(level))return ['😐','Tankstand onbekend'];
    if(level>=55)return ['😄','Dieselvoorraad goed'];
    if(level>=25)return ['😐','Denk aan bijtanken'];
    return ['😟','Dieselvoorraad laag'];
  }

  function waterEmoji(level){
    if(!Number.isFinite(level))return ['😐','Drinkwater onbekend'];
    if(level>=80)return ['😄','Drinkwater ruim voldoende'];
    if(level>=55)return ['🙂','Drinkwater goed'];
    if(level>=30)return ['😐','Drinkwater wordt minder'];
    if(level>=15)return ['🥵','Drinkwater laag'];
    return ['😵','Drinkwater bijna leeg'];
  }

  function wasteEmoji(level){
    if(!Number.isFinite(level))return ['😐','Vuilwater onbekend'];
    if(level<=15)return ['😄','Vuilwatertank lekker leeg'];
    if(level<=49)return ['🙂','Vuilwatertank heeft ruimte'];
    if(level<=74)return ['😐','Vuilwatertank loopt op'];
    if(level<=89)return ['🤢','Vuilwatertank bijna vol'];
    return ['🤮','Vuilwatertank vol'];
  }

  function engineEmoji(){
    const service=String($('techEngineService')?.textContent||'').toLowerCase();
    if(!service||service.includes('nog geen'))return ['😐','Motorstatus nog niet compleet'];
    if(service.includes('onderhoud')||service.includes('beurt')||service.includes('binnenkort')||service.includes('over'))return ['😐','Motoronderhoud in beeld'];
    return ['😄','Motorstatus goed'];
  }

  function solarEmoji(){
    const power=numberFrom('techSolarPower');
    const shore=String($('techShorePowerStatus')?.textContent||'').toLowerCase();
    if(Number.isFinite(power)&&power>20)return ['😎','Zonnepanelen laden'];
    if(shore.includes('walstroom'))return ['🙂','Walstroom aangesloten'];
    return ['😴','Weinig zonneopbrengst'];
  }

  function systemEmoji(){
    const heater=String($('techHeaterStatus')?.textContent||'').toLowerCase();
    const bilge=String($('techBilgeStatus')?.textContent||'').toLowerCase();
    if(heater.includes('storing')||bilge.includes('alarm'))return ['🚨','Systeemstoring'];
    if(bilge.includes('actief')||heater.includes('onderhoud')||heater.includes('onbekend')||bilge.includes('onbekend'))return ['😐','Systemen controleren'];
    return ['🙂','Systemen in orde'];
  }

  function update(){
    let mood=engineEmoji(); setEmoji('techEngineIcon',...mood);
    mood=batteryEmoji(numberFrom('techHouseVoltage')); setEmoji('techHouseIcon',...mood);
    mood=batteryEmoji(numberFrom('techStartVoltage')); setEmoji('techStartIcon',...mood);
    mood=fuelEmoji(numberFrom('techFuelLevel')); setEmoji('techFuelIcon',...mood);
    mood=waterEmoji(numberFrom('techWaterLevel')); setEmoji('techWaterIcon',...mood);
    mood=wasteEmoji(numberFrom('techWasteLevel')); setEmoji('techWasteIcon',...mood);
    mood=solarEmoji(); setEmoji('techSolarIcon',...mood);
    mood=systemEmoji(); setEmoji('techSystemIcon',...mood);
  }

  function install(){
    update();
    setTimeout(update,800);
    setInterval(update,4000);
    window.addEventListener('mijnserenity-ha-state-updated',update);
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')setTimeout(update,100);
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
