(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  function numberFrom(id){
    const raw=String($(id)?.textContent||'').replace(',','.');
    const match=raw.match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  }
  function setImage(id,src,label,state='normal'){
    const el=$(id);
    if(!el)return;
    let img=el.querySelector('img');
    if(!img){
      el.textContent='';
      img=document.createElement('img');
      img.loading='lazy';
      el.appendChild(img);
    }
    if(img.getAttribute('src')!==src) img.src=src;
    img.alt=label;
    el.setAttribute('aria-label',label);
    el.setAttribute('title',label);
    el.dataset.state=state;
  }
  function battery(v){
    if(!Number.isFinite(v))return ['cartoon-battery.png','Accuspanning nog onbekend','warning'];
    if(v>=12.45)return ['cartoon-battery.png','Accu goed','good'];
    if(v>=12.15)return ['cartoon-battery.png','Accu vraagt aandacht','warning'];
    return ['cartoon-battery.png','Accu laag','critical'];
  }
  function fuel(pct){
    if(!Number.isFinite(pct))return ['cartoon-fuel.png','Dieselniveau onbekend','warning'];
    if(pct>=55)return ['cartoon-fuel.png','Dieselvoorraad goed','good'];
    if(pct>=25)return ['cartoon-fuel.png','Denk aan bijtanken','warning'];
    return ['cartoon-fuel.png','Dieselvoorraad laag','critical'];
  }
  function water(pct){
    if(!Number.isFinite(pct))return ['cartoon-water-full.png','Drinkwater onbekend','warning'];
    if(pct>=70)return ['cartoon-water-full.png','Drinkwater ruim voldoende','good'];
    if(pct>=40)return ['cartoon-water-full.png','Drinkwater op gemiddeld niveau','warning'];
    if(pct>=15)return ['cartoon-water-low.png','Drinkwater laag','warning'];
    return ['cartoon-water-low.png','Drinkwater bijna leeg','critical'];
  }
  function waste(pct){
    if(!Number.isFinite(pct))return ['cartoon-waste-empty.png','Vuilwater onbekend','warning'];
    if(pct<=25)return ['cartoon-waste-empty.png','Vuilwatertank lekker leeg','good'];
    if(pct<=60)return ['cartoon-waste-empty.png','Vuilwatertank loopt op','warning'];
    if(pct<=85)return ['cartoon-waste-full.png','Vuilwatertank bijna vol','warning'];
    return ['cartoon-waste-full.png','Vuilwatertank vol','critical'];
  }
  function engine(){
    const s=String($('techEngineService')?.textContent||'').toLowerCase();
    if(!s||s.includes('nog geen'))return ['cartoon-motor.png','Motorstatus nog niet compleet','warning'];
    if(s.includes('onderhoud')||s.includes('beurt')||s.includes('binnenkort')||s.includes('over'))return ['cartoon-motor.png','Motoronderhoud in beeld','warning'];
    return ['cartoon-motor.png','Motorstatus goed','good'];
  }
  function solar(){
    const power=numberFrom('techSolarPower');
    const shore=String($('techShorePowerStatus')?.textContent||'').toLowerCase();
    if(Number.isFinite(power)&&power>20)return ['cartoon-solar.png','Zonnepanelen laden','good'];
    if(shore.includes('walstroom'))return ['cartoon-solar.png','Walstroom actief','normal'];
    return ['cartoon-solar.png','Weinig zonneopbrengst','warning'];
  }
  function systems(){
    const heater=String($('techHeaterStatus')?.textContent||'').toLowerCase();
    const bilge=String($('techBilgeStatus')?.textContent||'').toLowerCase();
    if(heater.includes('storing')||bilge.includes('alarm'))return ['cartoon-waste-full.png','Systeemstoring','critical'];
    if(bilge.includes('actief')||heater.includes('onderhoud')||heater.includes('onbekend')||bilge.includes('onbekend'))return ['cartoon-battery.png','Systemen controleren','warning'];
    return ['cartoon-motor.png','Systemen in orde','good'];
  }

  function ensureWelcomeCard(){
    const dashboard=document.getElementById('dashboard');
    const captainStrip=document.querySelector('#dashboard .captain-strip');
    if(!dashboard || !captainStrip) return;
    let card=document.getElementById('msWelcomeCard7137');
    if(!card){
      card=document.createElement('section');
      card.id='msWelcomeCard7137';
      card.className='ms-welcome-card';
      card.innerHTML=''
        + '<div class="ms-welcome-art" aria-hidden="true">⛵</div>'
        + '<div class="ms-welcome-copy">'
        + '  <span class="ms-welcome-eyebrow">WELKOM AAN BOORD</span>'
        + '  <h2 id="msWelcomeTitle7137">Welkom aan boord</h2>'
        + '  <p id="msWelcomeText7137">Serenity ligt klaar voor vertrek.</p>'
        + '</div>'
        + '<button type="button" class="ms-welcome-action" onclick="captainNavigate(\'live\')">Start varen</button>';
      captainStrip.parentNode.insertBefore(card, captainStrip);
    }
    const title=card.querySelector('#msWelcomeTitle7137');
    const text=card.querySelector('#msWelcomeText7137');
    const profile=typeof window.msGetWelcomeProfile==='function'
      ?window.msGetWelcomeProfile(false)
      :(window.MIJNSERENITY_WELCOME_PROFILE||null);
    if(title) title.textContent=profile?.title||'Welkom aan boord';
    if(text) text.textContent=profile?.subtitle||'Serenity · VriJon Contessa 37E · Alles in één oogopslag gereed';
  }

  function update(){
    let m=engine(); setImage('techEngineIcon',...m);
    m=battery(numberFrom('techHouseVoltage')); setImage('techHouseIcon',...m);
    m=battery(numberFrom('techStartVoltage')); setImage('techStartIcon',...m);
    m=fuel(numberFrom('techFuelLevel')); setImage('techFuelIcon',...m);
    m=water(numberFrom('techWaterLevel')); setImage('techWaterIcon',...m);
    m=waste(numberFrom('techWasteLevel')); setImage('techWasteIcon',...m);
    m=solar(); setImage('techSolarIcon',...m);
    m=systems(); setImage('techSystemIcon',...m);
  }
  function install(){
    ensureWelcomeCard();
    update();
    window.addEventListener('mijnserenity-welcome-updated',()=>ensureWelcomeCard());
    setTimeout(update,800);
    setInterval(update,4000);
    window.addEventListener('mijnserenity-ha-state-updated',update);
    document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'){ setTimeout(()=>{ ensureWelcomeCard(); update(); },100); } });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();