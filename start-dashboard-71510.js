/* MijnSerenity 8.25.5 — lokale stabiele Start in de goedgekeurde Serenity-stijl */
(()=>{
  'use strict';
  if(window.__msReferenceDashboard8255)return;
  window.__msReferenceDashboard8255=true;

  const BUILD='8.25.5';
  const ROOT_ID='ms8210Start';
  const STYLE_ID='ms8255ReferenceHomeStyle';
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();

  const icons={
    speed:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17a8 8 0 1 1 16 0"/><path d="m12 14 4-4"/><circle cx="12" cy="14" r="1.4"/></svg>',
    depth:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v14"/><path d="m8 13 4 4 4-4"/><path d="M4 20c2-1 4-1 6 0s4 1 6 0 3-1 4-.5"/></svg>',
    compass:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z"/></svg>',
    pin:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.4"/></svg>',
    cloud:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18h11a4 4 0 0 0 .5-8 6 6 0 0 0-11.3-1.5A4.7 4.7 0 0 0 6 18Z"/></svg>',
    battery:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="17" height="10" rx="2"/><path d="M20 10h2v4h-2"/></svg>',
    plug:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v7M16 3v7M6 10h12v2a6 6 0 0 1-6 6v3M9 21h6"/></svg>',
    wifi:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9a14 14 0 0 1 18 0M6 13a9 9 0 0 1 12 0M9.5 16.5a4 4 0 0 1 5 0"/><circle cx="12" cy="20" r="1"/></svg>',
    map:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/></svg>',
    route:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 5h4a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h7"/></svg>',
    radar:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2"/><path d="M4.2 19.8a11 11 0 0 1 15.6-15.6M7 17a7 7 0 0 1 10-10M12 12l7-7"/></svg>',
    sun:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.7 8.7 0 1 0 11.2 11.2Z"/></svg>',
    play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 9 6-9 6V6Z"/></svg>',
    chevron:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>'
  };

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    document.querySelector('meta[name="mijnserenity-build"]')?.setAttribute('content',BUILD);
    document.querySelector('meta[name="ms-build"]')?.setAttribute('content',BUILD);
    const settings=$('settingsAppVersion');
    if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
  }

  function installStyle(){
    if($(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      :root{--ms8255-cyan:#16d6ff;--ms8255-navy:#031421;--ms8255-card:rgba(4,29,46,.76);--ms8255-line:rgba(134,221,255,.24)}
      #dashboard.ms8255-reference-dashboard{padding:0!important;margin:0!important;max-width:none!important;background:#031522!important;overflow:visible!important}
      #dashboard.ms8255-reference-dashboard>[data-ms8255-hidden="1"]{display:none!important}
      #${ROOT_ID}.ms8255-reference-home{display:block!important;position:relative!important;z-index:40!important;width:100%!important;min-height:100dvh!important;margin:0!important;padding:0 0 34px!important;overflow:hidden!important;background:linear-gradient(180deg,#062437 0%,#031522 78%,#020e17 100%)!important;color:#fff!important;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
      #${ROOT_ID} *{box-sizing:border-box}
      #${ROOT_ID} button{font:inherit}
      #${ROOT_ID} svg{display:block;width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      #${ROOT_ID} .ms8255-hero{position:relative;min-height:min(72vh,760px);isolation:isolate;background:url('/serenity-ivms-hero.png?v=8255') center 47%/cover no-repeat}
      #${ROOT_ID} .ms8255-hero::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(0,17,29,.93) 0%,rgba(1,20,32,.72) 35%,rgba(0,18,28,.22) 68%,rgba(0,12,21,.14) 100%),linear-gradient(180deg,rgba(1,15,25,.28) 0%,rgba(1,15,25,.03) 48%,rgba(1,18,29,.7) 100%)}
      #${ROOT_ID} .ms8255-top{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:max(24px,env(safe-area-inset-top)) clamp(26px,4.2vw,66px) 10px}
      #${ROOT_ID} .ms8255-brand{display:grid;gap:2px;width:max-content;text-shadow:0 2px 20px rgba(0,0,0,.28)}
      #${ROOT_ID} .ms8255-brand strong{font-family:Georgia,"Times New Roman",serif;font-size:clamp(47px,5.2vw,82px);font-weight:500;line-height:.9;letter-spacing:-.065em;background:linear-gradient(180deg,#88efff 0%,#17cfff 78%);-webkit-background-clip:text;background-clip:text;color:transparent}
      #${ROOT_ID} .ms8255-brand small{padding-left:4px;color:#e8f9ff;font-size:clamp(8px,.7vw,11px);font-weight:900;letter-spacing:.34em;text-transform:uppercase}
      #${ROOT_ID} .ms8255-theme{display:flex;align-items:center;gap:10px;min-height:50px;padding:0 21px;border:1px solid rgba(176,229,255,.22);border-radius:999px;background:rgba(2,22,36,.82);box-shadow:0 12px 30px rgba(0,0,0,.2);color:#fff;font-weight:800;cursor:pointer;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
      #${ROOT_ID} .ms8255-theme svg{width:23px;height:23px;color:#2edcff;fill:#2edcff;stroke:#2edcff}
      #${ROOT_ID} .ms8255-copy{width:min(650px,52vw);margin:clamp(44px,8vh,90px) 0 0 clamp(28px,4.2vw,68px);padding-bottom:210px}
      #${ROOT_ID} .ms8255-kicker{display:block;margin-bottom:12px;color:#2ce4ff;font-size:clamp(12px,1vw,17px);font-weight:900;letter-spacing:.22em;text-transform:uppercase}
      #${ROOT_ID} h2{max-width:610px;margin:0 0 12px;color:#fff;font-size:clamp(46px,5.2vw,78px);font-weight:900;line-height:.91;letter-spacing:-.055em;text-wrap:balance;text-shadow:0 5px 28px rgba(0,0,0,.32)}
      #${ROOT_ID} .ms8255-lede{max-width:620px;margin:0 0 20px;color:#f0f8fb;font-size:clamp(17px,1.5vw,23px);font-weight:520;line-height:1.35;text-shadow:0 2px 14px rgba(0,0,0,.5)}
      #${ROOT_ID} .ms8255-live{display:flex;align-items:stretch;width:max-content;max-width:100%;margin:18px 0 20px;border:1px solid rgba(152,224,255,.35);border-radius:20px;background:rgba(3,28,43,.62);box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 14px 34px rgba(0,0,0,.2);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);overflow:hidden}
      #${ROOT_ID} .ms8255-metric{display:grid;grid-template-columns:auto auto;grid-template-areas:"icon value" "icon label";align-items:center;column-gap:11px;min-width:170px;padding:13px 18px;color:#fff}
      #${ROOT_ID} .ms8255-metric+.ms8255-metric{border-left:1px solid rgba(187,231,249,.24)}
      #${ROOT_ID} .ms8255-metric>svg{grid-area:icon;width:27px;height:27px;color:#e7f8ff}
      #${ROOT_ID} .ms8255-metric strong{grid-area:value;font-size:19px;line-height:1.05;font-weight:850;white-space:nowrap}
      #${ROOT_ID} .ms8255-metric small{grid-area:label;margin-top:5px;color:#b6c8d1;font-size:12px;white-space:nowrap}
      #${ROOT_ID} .ms8255-start{display:flex;align-items:center;justify-content:center;gap:14px;width:min(493px,100%);min-height:69px;padding:0 24px;border:1px solid rgba(126,241,255,.55);border-radius:21px;background:linear-gradient(135deg,#12bde8,#19e0fb);box-shadow:0 14px 35px rgba(0,192,236,.22),inset 0 1px 0 rgba(255,255,255,.32);color:#fff;font-size:21px;font-weight:900;cursor:pointer}
      #${ROOT_ID} .ms8255-start svg{width:25px;height:25px;stroke-width:2.1}
      #${ROOT_ID} .ms8255-start .chev{margin-left:auto;width:21px;height:21px}
      #${ROOT_ID} .ms8255-status{position:absolute;left:clamp(20px,3.8vw,58px);right:clamp(20px,3.8vw,58px);bottom:24px;display:grid;grid-template-columns:1.05fr 1fr 1fr 1fr 1fr;gap:11px;z-index:2}
      #${ROOT_ID} .ms8255-status-card{display:grid;grid-template-columns:45px 1fr;grid-template-areas:"icon label" "icon value" "icon sub";align-items:center;min-height:94px;padding:14px 17px;border:1px solid var(--ms8255-line);border-radius:18px;background:linear-gradient(150deg,rgba(6,45,66,.86),rgba(3,27,43,.7));box-shadow:0 14px 34px rgba(0,0,0,.19),inset 0 1px 0 rgba(255,255,255,.06);backdrop-filter:blur(15px);-webkit-backdrop-filter:blur(15px);overflow:hidden}
      #${ROOT_ID} .ms8255-status-card>svg{grid-area:icon;width:31px;height:31px;color:#fff}
      #${ROOT_ID} .ms8255-status-card>small{grid-area:label;color:#b7c8d1;font-size:10px;font-weight:850;letter-spacing:.15em;text-transform:uppercase;white-space:nowrap}
      #${ROOT_ID} .ms8255-status-card>strong{grid-area:value;margin-top:2px;color:#fff;font-size:17px;font-weight:850;line-height:1.12;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #${ROOT_ID} .ms8255-status-card>em{grid-area:sub;margin-top:4px;color:#afc2cb;font-size:11px;font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #${ROOT_ID} .ms8255-features{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px clamp(20px,3.8vw,58px) 30px;background:linear-gradient(180deg,#052235 0%,#031522 100%)}
      #${ROOT_ID} .ms8255-feature{position:relative;display:grid;grid-template-columns:58px 1fr 26px;align-items:center;gap:18px;min-height:119px;padding:18px 28px;border:1px solid rgba(124,215,255,.25);border-radius:20px;background:linear-gradient(110deg,rgba(2,67,98,.9),rgba(4,43,65,.84));box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 14px 30px rgba(0,0,0,.12);color:#fff;text-align:left;cursor:pointer;overflow:hidden}
      #${ROOT_ID} .ms8255-feature::after{content:"";position:absolute;inset:auto -12% -100% 36%;height:180%;background:radial-gradient(circle,rgba(28,205,255,.16),transparent 63%);pointer-events:none}
      #${ROOT_ID} .ms8255-feature[data-tone="purple"]{background:linear-gradient(110deg,rgba(47,30,84,.9),rgba(37,22,68,.86));border-color:rgba(194,135,255,.25)}
      #${ROOT_ID} .ms8255-feature[data-tone="purple"]::after{background:radial-gradient(circle,rgba(169,86,255,.19),transparent 63%)}
      #${ROOT_ID} .ms8255-feature[data-tone="green"]{background:linear-gradient(110deg,rgba(4,79,75,.9),rgba(4,50,57,.86));border-color:rgba(83,230,208,.24)}
      #${ROOT_ID} .ms8255-feature[data-tone="green"]::after{background:radial-gradient(circle,rgba(26,222,190,.18),transparent 63%)}
      #${ROOT_ID} .ms8255-feature[data-tone="gold"]{background:linear-gradient(110deg,rgba(72,62,30,.9),rgba(48,43,27,.86));border-color:rgba(255,220,109,.24)}
      #${ROOT_ID} .ms8255-feature[data-tone="gold"]::after{background:radial-gradient(circle,rgba(255,205,69,.17),transparent 63%)}
      #${ROOT_ID} .ms8255-feature>svg:first-child{width:43px;height:43px;stroke-width:1.65}
      #${ROOT_ID} .ms8255-feature-copy{display:grid;gap:4px;position:relative;z-index:1}
      #${ROOT_ID} .ms8255-feature-copy strong{font-size:20px;font-weight:900}
      #${ROOT_ID} .ms8255-feature-copy small{color:#b8c7d0;font-size:13px}
      #${ROOT_ID} .ms8255-feature>.chev{width:23px;height:23px;justify-self:end;position:relative;z-index:1}
      body.ms8255-home-active .bottom-nav{display:none!important;visibility:hidden!important;pointer-events:none!important}
      body.ms8255-sub-active .bottom-nav{position:fixed!important;left:0!important;right:0!important;bottom:0!important;z-index:2147483000!important;display:flex!important;min-height:68px!important;background:rgba(2,15,25,.96)!important;border-top:1px solid rgba(88,205,245,.2)!important;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
      body.ms8255-sub-active .bottom-nav .bottom-nav-item{display:none!important}
      body.ms8255-sub-active .bottom-nav .bottom-nav-item[data-target="dashboard"]{display:flex!important;flex:1 1 100%!important;align-items:center!important;justify-content:center!important;gap:10px!important;width:100%!important;max-width:none!important;color:#fff!important}
      @media(max-width:900px){
        #${ROOT_ID} .ms8255-hero{min-height:740px;background-position:60% center}
        #${ROOT_ID} .ms8255-copy{width:min(620px,72vw);margin-top:58px;padding-bottom:205px}
        #${ROOT_ID} .ms8255-status{grid-template-columns:repeat(5,minmax(155px,1fr));overflow-x:auto;padding-bottom:2px;scrollbar-width:none}
        #${ROOT_ID} .ms8255-status::-webkit-scrollbar{display:none}
      }
      @media(max-width:620px){
        #${ROOT_ID}.ms8255-reference-home{padding-bottom:18px!important}
        #${ROOT_ID} .ms8255-hero{min-height:755px;background-position:64% center}
        #${ROOT_ID} .ms8255-hero::before{background:linear-gradient(180deg,rgba(0,15,25,.5),rgba(0,15,25,.56) 38%,rgba(0,14,24,.88) 76%,rgba(0,15,25,.96))}
        #${ROOT_ID} .ms8255-top{align-items:center;padding:max(18px,env(safe-area-inset-top)) 17px 8px}
        #${ROOT_ID} .ms8255-brand strong{font-size:45px}
        #${ROOT_ID} .ms8255-brand small{font-size:7px;letter-spacing:.28em}
        #${ROOT_ID} .ms8255-theme{min-height:42px;padding:0 13px;font-size:13px}
        #${ROOT_ID} .ms8255-theme svg{width:19px;height:19px}
        #${ROOT_ID} .ms8255-copy{width:auto;margin:58px 18px 0;padding-bottom:238px}
        #${ROOT_ID} .ms8255-kicker{font-size:11px}
        #${ROOT_ID} h2{max-width:355px;font-size:48px}
        #${ROOT_ID} .ms8255-lede{max-width:360px;font-size:16px}
        #${ROOT_ID} .ms8255-live{width:100%;border-radius:17px}
        #${ROOT_ID} .ms8255-metric{grid-template-columns:auto 1fr;min-width:0;flex:1;padding:11px 9px;column-gap:7px}
        #${ROOT_ID} .ms8255-metric>svg{width:21px;height:21px}
        #${ROOT_ID} .ms8255-metric strong{font-size:14px}
        #${ROOT_ID} .ms8255-metric small{font-size:9px}
        #${ROOT_ID} .ms8255-start{min-height:61px;border-radius:18px;font-size:18px}
        #${ROOT_ID} .ms8255-status{left:14px;right:14px;bottom:14px;grid-template-columns:repeat(5,164px);gap:9px}
        #${ROOT_ID} .ms8255-status-card{grid-template-columns:37px 1fr;min-height:88px;padding:12px 13px}
        #${ROOT_ID} .ms8255-status-card>svg{width:26px;height:26px}
        #${ROOT_ID} .ms8255-status-card>strong{font-size:15px}
        #${ROOT_ID} .ms8255-features{grid-template-columns:1fr;gap:10px;padding:12px 14px 22px}
        #${ROOT_ID} .ms8255-feature{grid-template-columns:48px 1fr 22px;min-height:96px;padding:15px 20px;border-radius:18px}
        #${ROOT_ID} .ms8255-feature>svg:first-child{width:36px;height:36px}
        #${ROOT_ID} .ms8255-feature-copy strong{font-size:18px}
      }
      @media(min-width:1500px){#${ROOT_ID} .ms8255-hero{min-height:760px}}
    `;
    document.head.appendChild(style);
  }

  function metric(iconName,valueId,label){return `<div class="ms8255-metric">${icons[iconName]}<strong id="${valueId}">—</strong><small>${label}</small></div>`}
  function status(iconName,label,valueId,subId){return `<div class="ms8255-status-card">${icons[iconName]}<small>${label}</small><strong id="${valueId}">—</strong><em id="${subId}"> </em></div>`}
  function feature(target,iconName,title,sub,tone){return `<button type="button" class="ms8255-feature" data-ms8255-go="${target}" data-tone="${tone}">${icons[iconName]}<span class="ms8255-feature-copy"><strong>${title}</strong><small>${sub}</small></span><span class="chev">${icons.chevron}</span></button>`}

  function build(){
    syncBuild();
    installStyle();
    const dashboard=$('dashboard');
    if(!dashboard)return false;
    dashboard.classList.add('ms8255-reference-dashboard');
    let root=$(ROOT_ID);
    if(!root){root=document.createElement('section');root.id=ROOT_ID;dashboard.prepend(root)}
    root.className='ms8255-reference-home';
    root.hidden=false;
    root.removeAttribute('aria-hidden');
    root.innerHTML=`
      <section class="ms8255-hero" aria-label="Serenity startdashboard">
        <div class="ms8255-top">
          <div class="ms8255-brand"><strong>Serenity</strong><small>Explore · Navigate · Enjoy</small></div>
          <button type="button" class="ms8255-theme" id="ms8255Theme">${icons.moon}<span>Nacht</span></button>
        </div>
        <div class="ms8255-copy">
          <span class="ms8255-kicker">Welkom terug</span>
          <h2>Klaar om te<br>gaan varen?</h2>
          <p class="ms8255-lede">De Serenity ligt klaar. Waar brengt de volgende reis je naartoe?</p>
          <div class="ms8255-live">
            ${metric('speed','ms8255Speed','Snelheid')}
            ${metric('depth','ms8255Depth','Diepte')}
            ${metric('compass','ms8255Wind','Wind')}
          </div>
          <button type="button" class="ms8255-start" data-ms8255-go="live">${icons.play}<span>Start live varen</span><span class="chev">${icons.chevron}</span></button>
        </div>
        <div class="ms8255-status">
          ${status('pin','Ligplaats','ms8255Location','ms8255LocationSub')}
          ${status('cloud','Buiten','ms8255Outside','ms8255OutsideSub')}
          ${status('battery','Accu','ms8255Soc','ms8255BatterySub')}
          ${status('plug','Walstroom','ms8255Shore','ms8255ShoreSub')}
          ${status('wifi','Verbinding','ms8255Online','ms8255OnlineSub')}
        </div>
      </section>
      <section class="ms8255-features" aria-label="Navigatie">
        ${feature('map','map','Kaart','Waterkaarten & navigatie','blue')}
        ${feature('planner','route','Reisplanner','Plan je route & bekijk reistijd','purple')}
        ${feature('ais','radar','AIS','Schepen in de omgeving','green')}
        ${feature('weather','sun','Weer','Actuele weersinformatie','gold')}
      </section>`;

    [...dashboard.children].forEach(child=>{
      if(child===root){child.removeAttribute('data-ms8255-hidden');return}
      child.setAttribute('data-ms8255-hidden','1');
      child.setAttribute('aria-hidden','true');
    });

    root.querySelectorAll('[data-ms8255-go]').forEach(button=>button.addEventListener('click',()=>go(button.dataset.ms8255Go)));
    $('ms8255Theme')?.addEventListener('click',toggleTheme);
    syncValues();
    syncPageState();
    return true;
  }

  function visibleText(selectors){
    for(const selector of selectors){
      const nodes=[...document.querySelectorAll(selector)];
      for(const node of nodes){
        if(node.closest(`#${ROOT_ID}`))continue;
        const value=clean('value' in node?node.value:node.textContent);
        if(value&&value!=='—'&&value!=='-')return value;
      }
    }
    return '';
  }

  function setText(id,value){const node=$(id);if(node&&clean(value)!==clean(node.textContent))node.textContent=value}
  function number(value){const m=clean(value).replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):null}

  function syncValues(){
    const speedRaw=visibleText(['#ivmsSpeed','#ms7161Speed','[data-live-speed]']);
    const speed=number(speedRaw);
    setText('ms8255Speed',speed===null?'0 km/u':`${speed.toLocaleString('nl-NL',{maximumFractionDigits:1})} km/u`);

    const depthRaw=visibleText(['#ivmsDepth','#ms7161Depth','[data-live-depth]']);
    const depth=number(depthRaw);
    setText('ms8255Depth',depth===null?'Geen meting':`${depth.toLocaleString('nl-NL',{maximumFractionDigits:1})} m`);

    const windRaw=visibleText(['#ivmsWindValue','#ms7161Wind','[data-live-wind]']);
    const windUnit=visibleText(['#ivmsWindUnit','#ms7161WindBft']);
    const wind=number(windRaw);
    setText('ms8255Wind',wind===null?'Geen meting':`${wind.toLocaleString('nl-NL',{maximumFractionDigits:1})}${windUnit&&/[a-z]/i.test(windUnit)?` ${windUnit.replace(/^[-–\s]+/,'')}`:''}`);

    const tempRaw=visibleText(['#ms793WeatherOutsideTemp','#ms793WeatherTemp','#outsideTemperature','#ruuviOutsideTemperature','[data-outside-temp]']);
    const temp=number(tempRaw);
    setText('ms8255Outside',temp===null?'—':`${temp.toLocaleString('nl-NL',{maximumFractionDigits:1})}°`);
    setText('ms8255OutsideSub',temp===null?'Geen meting':'Actuele buitentemperatuur');

    const socRaw=visibleText(['#ivmsBatteryRing','#ms7161HouseSoc','#techHouseSoc','[data-house-soc]']);
    const soc=number(socRaw);
    setText('ms8255Soc',soc===null?'—%':`${Math.round(soc)}%`);
    const volts=visibleText(['#ivmsBatteryVoltage','#ms7161HouseV','#techHouseVoltage','[data-house-voltage]']);
    const amps=visibleText(['#ivmsBatteryCurrent','#ms7161HouseA','[data-house-current]']);
    setText('ms8255BatterySub',[volts,amps].filter(Boolean).join(' · ')||'Live accustatus');

    const shore=visibleText(['#ivmsShorePower','#techShorePower','#shorePowerStatus','[data-shore-power]']);
    const shoreOn=/aan|on|connected|verbonden|grid|walstroom/i.test(shore)&&!/niet|off|disconnected/i.test(shore);
    setText('ms8255Shore',shore?shore:(shoreOn?'Aangesloten':'Niet aangesloten'));
    setText('ms8255ShoreSub',shoreOn?'Walstroom actief':'');

    setText('ms8255Online',navigator.onLine?'Online':'Offline');
    setText('ms8255OnlineSub',navigator.onLine?'Verbinding actief':'Geen netwerkverbinding');
  }

  function locate(){
    setText('ms8255Location','GPS zoeken...');
    setText('ms8255LocationSub','Positie wordt bepaald');
    if(!navigator.geolocation)return;
    navigator.geolocation.getCurrentPosition(pos=>{
      const lat=pos.coords.latitude.toFixed(4),lon=pos.coords.longitude.toFixed(4);
      setText('ms8255Location','GPS actief');
      setText('ms8255LocationSub',`${lat}, ${lon}`);
    },()=>{}, {enableHighAccuracy:false,maximumAge:300000,timeout:5000});
  }

  function go(target){
    document.body?.classList.remove('ms8255-home-active');
    const aliases=target==='planner'?['planner','route']:target==='map'?['map','waterkaarten']:[target];
    const root=$(ROOT_ID);
    for(const name of aliases){
      const candidates=[...document.querySelectorAll(`.bottom-nav-item[data-target="${name}"],.tabs [data-target="${name}"],[data-route="${name}"],[data-target="${name}"]`)];
      const node=candidates.find(el=>!root?.contains(el));
      if(node){node.click();setTimeout(syncPageState,80);return}
      try{if(typeof window.navigateTo==='function'){window.navigateTo(name);setTimeout(syncPageState,80);return}}catch(_){ }
      try{if(typeof window.showPage==='function'){window.showPage(name);setTimeout(syncPageState,80);return}}catch(_){ }
    }
  }

  function dashboardVisible(){
    const app=$('appView'),dashboard=$('dashboard');
    if(!dashboard)return false;
    if(app?.classList.contains('hidden'))return false;
    return !dashboard.classList.contains('hidden')&&dashboard.getAttribute('aria-hidden')!=='true';
  }

  function syncPageState(){
    const body=document.body;if(!body)return;
    const home=dashboardVisible();
    body.classList.toggle('ms8255-home-active',home);
    body.classList.toggle('ms8255-sub-active',!home&&Boolean($('appView')&&!$('appView').classList.contains('hidden')));
  }

  function toggleTheme(){
    const root=$(ROOT_ID),button=$('ms8255Theme');if(!root||!button)return;
    const day=root.dataset.theme==='day';
    root.dataset.theme=day?'night':'day';
    button.querySelector('span:last-child').textContent=day?'Nacht':'Dag';
    root.style.filter=day?'none':'brightness(1.09) saturate(.94)';
  }

  window.ms8255RenderStart=build;
  window.ms8210RefreshStart=()=>{if(!$(ROOT_ID)?.classList.contains('ms8255-reference-home'))build();syncValues();syncPageState();return true};

  function start(){
    if(!build())setTimeout(start,120);
    else locate();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('online',syncValues,{passive:true});
  window.addEventListener('offline',syncValues,{passive:true});
  window.addEventListener('pageshow',()=>{build();syncPageState()},{passive:true});
  ['mijnserenity:route','mijnserenity:navigate','mijnserenity:dashboard-ready','mijnserenity:boot-complete'].forEach(name=>window.addEventListener(name,()=>setTimeout(syncPageState,30),{passive:true}));
  setInterval(()=>{syncValues();syncPageState()},1200);
})();