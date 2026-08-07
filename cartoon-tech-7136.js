(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  let overlayTimer=null;
  let overlayCleanupTimer=null;
  let suppressWelcomeEvent=false;
  let overlayVisible=false;

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

  function dashboardVisible(){
    const authView=$('authView');
    const dashboard=$('dashboard');
    return (!authView || authView.classList.contains('hidden')) && (!!dashboard);
  }

  function ensureWelcomeCard(){
    const dashboard=$('dashboard');
    const captainStrip=document.querySelector('#dashboard .captain-strip');
    if(!dashboard || !captainStrip) return;
    let card=$('msWelcomeCard7137');
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
    const profile=window.MIJNSERENITY_WELCOME_PROFILE || (typeof window.msGetWelcomeProfile==='function' ? window.msGetWelcomeProfile(false) : null);
    const title=card.querySelector('#msWelcomeTitle7137');
    const copy=card.querySelector('#msWelcomeText7137');
    if(title) title.textContent=profile?.title||'Welkom aan boord';
    if(copy) copy.textContent=profile?.subtitle||'Serenity · VriJon Contessa 37E · Alles in één oogopslag gereed';
  }

  function ensureWelcomeOverlay(){
    let overlay=$('msScreenWelcome7139');
    if(overlay) return overlay;
    overlay=document.createElement('div');
    overlay.id='msScreenWelcome7139';
    overlay.className='ms-screen-welcome';
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML=''
      + '<div class="ms-screen-welcome-panel">'
      + '  <div class="ms-screen-welcome-badge">WELKOM AAN BOORD</div>'
      + '  <div class="ms-screen-welcome-art" aria-hidden="true">⛵</div>'
      + '  <h1 id="msScreenWelcomeTitle7139">Welkom aan boord</h1>'
      + '  <p id="msScreenWelcomeSub7139">Serenity ligt klaar voor vertrek.</p>'
      + '</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function hideWelcomeOverlay(){
    const overlay=$('msScreenWelcome7139');
    if(!overlay)return;
    clearTimeout(overlayTimer);
    clearTimeout(overlayCleanupTimer);
    overlay.classList.add('hide');
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden','true');
    overlayVisible=false;
    overlayCleanupTimer=setTimeout(()=>{
      document.body.classList.remove('ms-welcome-active');
      overlay.classList.remove('hide');
    },1200);
  }

  function showWelcomeOverlay(profile){
    if(!dashboardVisible() || !profile) return;
    const overlay=ensureWelcomeOverlay();
    const title=$('msScreenWelcomeTitle7139');
    const sub=$('msScreenWelcomeSub7139');
    if(title) title.textContent=profile.short || profile.title || 'Welkom aan boord';
    if(sub) sub.textContent=profile.title || profile.subtitle || 'Serenity ligt klaar voor vertrek.';
    clearTimeout(overlayTimer);
    clearTimeout(overlayCleanupTimer);
    overlay.classList.remove('hide');
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden','false');
    document.body.classList.add('ms-welcome-active');
    overlayVisible=true;
    overlayTimer=setTimeout(hideWelcomeOverlay,3000);
  }

  function refreshWelcome(forceNew=false,showOverlayNow=false){
    if(typeof window.msGetWelcomeProfile!=='function') return null;
    suppressWelcomeEvent=true;
    const profile=window.msGetWelcomeProfile(forceNew);
    suppressWelcomeEvent=false;
    ensureWelcomeCard();
    if(showOverlayNow) showWelcomeOverlay(profile);
    return profile;
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
    ensureWelcomeOverlay();
    update();
    setTimeout(()=>{ if(dashboardVisible()) refreshWelcome(true,true); },700);
    setTimeout(update,800);
    setInterval(update,4000);
    window.addEventListener('mijnserenity-ha-state-updated',update);
    window.addEventListener('mijnserenity-welcome-updated',event=>{
      ensureWelcomeCard();
      if(suppressWelcomeEvent) return;
      showWelcomeOverlay(event?.detail || window.MIJNSERENITY_WELCOME_PROFILE || null);
    });
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible' && dashboardVisible()){
        setTimeout(()=>{ ensureWelcomeCard(); update(); refreshWelcome(true,true); },140);
      }
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();