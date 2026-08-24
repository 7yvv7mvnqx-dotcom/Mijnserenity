/* MijnSerenity 7.18.25 — Marine Glass zichtlaag; live techniek blijft onderliggend actief */
(()=>{
  'use strict';
  if(window.__msMarineGlass71825)return;
  window.__msMarineGlass71825=true;

  const BUILD='7.18.25';
  const EMPTY='—';
  const $=id=>document.getElementById(id);

  function go(page){
    if(typeof window.captainNavigate==='function'){window.captainNavigate(page);return true;}
    if(typeof window.ms708GoToPage==='function'){window.ms708GoToPage(page,true);return true;}
    return false;
  }

  function legacyControl(key){
    const legacy=$('msIntegratedDashboard');
    if(!legacy)return false;
    const control=legacy.querySelector(`[data-control="${CSS.escape(key)}"]`);
    if(!control)return false;
    control.click();
    return true;
  }

  function toast(message){
    if(typeof window.showAppToast==='function')window.showAppToast(message);
  }

  function setTab(root,targetId){
    root.querySelectorAll('.mg-tab').forEach(button=>button.classList.toggle('active',button.dataset.target===targetId));
  }

  function scrollTo(root,targetId){
    const target=$(targetId);
    if(!target)return;
    setTab(root,targetId);
    target.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function discoverSerenityImage(root){
    const explicit=window.MIJSERENITY_HERO_IMAGE;
    if(typeof explicit==='string'&&explicit.trim()){
      root.querySelector('.mg-hero')?.style.setProperty('background-image',`linear-gradient(180deg,rgba(2,10,18,.10),rgba(2,10,18,.76)),url("${explicit.replace(/"/g,'\\"')}")`);
      root.querySelector('.mg-hero')?.style.setProperty('background-size','cover');
      root.querySelector('.mg-hero')?.style.setProperty('background-position','center');
      return;
    }
    const candidate=[...document.images].find(img=>img.closest('#msMarineDashboard')===null&&/serenity|boot|boat/i.test(`${img.alt||''} ${img.title||''} ${img.dataset?.role||''}`)&&img.currentSrc);
    if(candidate?.currentSrc){
      const hero=root.querySelector('.mg-hero');
      hero?.style.setProperty('background-image',`linear-gradient(180deg,rgba(2,10,18,.12),rgba(2,10,18,.78)),url("${candidate.currentSrc.replace(/"/g,'\\"')}")`);
      hero?.style.setProperty('background-size','cover');
      hero?.style.setProperty('background-position','center');
    }
  }

  function build(){
    const host=$('dashboard');
    if(!host)return false;
    if($('msMarineDashboard'))return true;

    const root=document.createElement('section');
    root.id='msMarineDashboard';
    root.setAttribute('aria-label','MijnSerenity Marine Glass dashboard');
    root.innerHTML=`
      <header class="mg-head">
        <button class="mg-brand" type="button" data-go="dashboard" aria-label="MijnSerenity home">Mijn<span>Serenity</span></button>
        <div class="mg-head-actions">
          <span class="mg-status-dot"><i></i> SERENITY</span>
          <button class="mg-icon-btn" type="button" data-go="settings" aria-label="Instellingen">☰</button>
        </div>
      </header>

      <section class="mg-hero" aria-label="Serenity">
        <div class="mg-hero-copy">
          <span class="mg-kicker">MIJN SERENITY</span>
          <h1>Welkom aan boord</h1>
          <p>Cockpit, energie en boordsystemen in één rustig overzicht.</p>
        </div>
      </section>

      <nav class="mg-tabs" aria-label="Dashboard onderdelen">
        <button class="mg-tab active" type="button" data-target="mg-home">Home</button>
        <button class="mg-tab" type="button" data-target="mg-cockpit">Cockpit</button>
        <button class="mg-tab" type="button" data-target="mg-tech">Techniek</button>
        <button class="mg-tab" type="button" data-target="mg-board">Boord</button>
      </nav>

      <main>
        <section id="mg-home" class="mg-section">
          <div class="mg-section-head"><h2>Varen & energie</h2><p>compact overzicht</p></div>
          <div class="mg-metric-grid">
            <button class="mg-metric" type="button" data-go="live">
              <span class="mg-metric-top"><b>Snelheid</b><i class="mg-metric-icon">⌁</i></span>
              <strong class="mg-value">${EMPTY}</strong><small class="mg-sub">Live varen</small>
            </button>
            <button class="mg-metric" type="button" data-go="live">
              <span class="mg-metric-top"><b>Diepte</b><i class="mg-metric-icon">≋</i></span>
              <strong class="mg-value">${EMPTY}</strong><small class="mg-sub">Dieptemeter</small>
            </button>
            <button class="mg-metric" type="button" data-go="live">
              <span class="mg-metric-top"><b>Toerental</b><i class="mg-metric-icon">◴</i></span>
              <strong class="mg-value">${EMPTY}</strong><small class="mg-sub">Motor</small>
            </button>
            <button class="mg-metric" type="button" data-go="technical">
              <span class="mg-metric-top"><b>Accuspanning</b><i class="mg-metric-icon">⚡</i></span>
              <strong class="mg-value">${EMPTY}</strong><small class="mg-sub">Huishoudaccu</small>
            </button>
          </div>
        </section>

        <section class="mg-section mg-panel" aria-label="Startaccu's">
          <div class="mg-panel-head">
            <div class="mg-panel-title"><i>▰</i><h3>STARTACCU'S</h3></div>
            <button class="mg-link" type="button" data-go="technical">Details ›</button>
          </div>
          <div class="mg-start-grid">
            <button class="mg-mini" type="button" data-go="technical"><small>Startaccu 1</small><strong>${EMPTY}</strong></button>
            <button class="mg-mini" type="button" data-go="technical"><small>Startaccu 2</small><strong>${EMPTY}</strong></button>
          </div>
        </section>

        <section id="mg-cockpit" class="mg-section mg-panel">
          <div class="mg-panel-head">
            <div class="mg-panel-title"><i>◉</i><h3>COCKPIT</h3></div>
            <button class="mg-link" type="button" data-go="live">Live openen ›</button>
          </div>
          <div class="mg-cockpit-body">
            <div class="mg-cockpit-stage">
              <div class="mg-cockpit-readouts">
                <button class="mg-readout" type="button" data-go="live"><small>Koers</small><strong>${EMPTY}</strong></button>
                <button class="mg-readout" type="button" data-go="live"><small>Roerstand</small><strong>${EMPTY}</strong></button>
                <button class="mg-readout" type="button" data-go="live"><small>Route</small><strong>${EMPTY}</strong></button>
              </div>
              <div class="mg-action-row">
                <button class="mg-action" type="button" data-go="live">Open live cockpit</button>
                <button class="mg-action secondary" type="button" data-go="planner">Route plannen</button>
              </div>
            </div>
          </div>
        </section>

        <section id="mg-tech" class="mg-section mg-panel">
          <div class="mg-panel-head">
            <div class="mg-panel-title"><i>⚡</i><h3>TECHNIEK</h3></div>
            <button class="mg-link" type="button" data-go="technical">Alles bekijken ›</button>
          </div>
          <div class="mg-tech-grid">
            <button class="mg-tech-item" type="button" data-go="technical"><small>Huishoudaccu</small><strong>${EMPTY}</strong><span>▣</span></button>
            <button class="mg-tech-item" type="button" data-go="technical"><small>Zonnepaneel</small><strong>${EMPTY}</strong><span>☀</span></button>
            <button class="mg-tech-item" type="button" data-go="technical"><small>Walstroom</small><strong>${EMPTY}</strong><span>⌁</span></button>
            <button class="mg-tech-item" type="button" data-go="technical"><small>Drinkwater</small><strong>${EMPTY}</strong><span>💧</span></button>
            <button class="mg-tech-item" type="button" data-go="technical"><small>Brandstof</small><strong>${EMPTY}</strong><span>⛽</span></button>
            <button class="mg-tech-item" type="button" data-go="technical"><small>Zwartwater</small><strong>${EMPTY}</strong><span>◈</span></button>
          </div>
          <div class="mg-controls" aria-label="Bediening">
            <button class="mg-control" type="button" data-control="inverter">Omvormer bedienen</button>
            <button class="mg-control" type="button" data-control="charger">Lader bedienen</button>
            <button class="mg-control" type="button" data-control="light">Verlichting bedienen</button>
          </div>
        </section>

        <section id="mg-board" class="mg-section mg-panel">
          <div class="mg-panel-head">
            <div class="mg-panel-title"><i>⌂</i><h3>AAN BOORD</h3></div>
            <button class="mg-link" type="button" data-go="technical">Sensoren ›</button>
          </div>
          <div class="mg-board-grid">
            <button class="mg-board-item" type="button" data-go="technical"><small>Machinekamer</small><strong>${EMPTY}</strong><span>🌡</span></button>
            <button class="mg-board-item" type="button" data-go="technical"><small>Salon</small><strong>${EMPTY}</strong><span>🌡</span></button>
            <button class="mg-board-item" type="button" data-go="technical"><small>Beweging</small><strong>${EMPTY}</strong><span>◌</span></button>
            <button class="mg-board-item" type="button" data-go="technical"><small>Personen aan boord</small><strong>${EMPTY}</strong><span>♙</span></button>
          </div>
        </section>
      </main>

      <footer class="mg-foot">MijnSerenity ${BUILD} · Marine Glass</footer>`;

    root.addEventListener('click',event=>{
      const tab=event.target.closest('.mg-tab[data-target]');
      if(tab){event.preventDefault();scrollTo(root,tab.dataset.target);return;}

      const goTarget=event.target.closest('[data-go]');
      if(goTarget){event.preventDefault();if(!go(goTarget.dataset.go))toast('Onderdeel wordt nog geladen.');return;}

      const control=event.target.closest('[data-control]');
      if(control){
        event.preventDefault();
        if(!legacyControl(control.dataset.control)){
          if(!go('technical'))toast('Bediening wordt nog geladen.');
        }
      }
    });

    host.prepend(root);
    host.classList.add('mg-71825-active');
    discoverSerenityImage(root);

    if('IntersectionObserver' in window){
      const observer=new IntersectionObserver(entries=>{
        const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
        if(visible)setTab(root,visible.target.id);
      },{root:null,rootMargin:'-70px 0px -55% 0px',threshold:[.05,.2,.5]});
      ['mg-home','mg-cockpit','mg-tech','mg-board'].forEach(id=>{const el=$(id);if(el)observer.observe(el);});
    }

    window.dispatchEvent(new CustomEvent('mijnserenity:marine-glass-ready',{detail:{build:BUILD,valuesVisible:false}}));
    return true;
  }

  function install(){
    if(build())return;
    let tries=0;
    const timer=setInterval(()=>{
      tries+=1;
      if(build()||tries>40)clearInterval(timer);
    },100);
  }

  window.ms71825BuildMarineGlass=build;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
