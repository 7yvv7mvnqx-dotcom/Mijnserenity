/* MijnSerenity 8.25.4 — goedgekeurde lichte Serenity dagbeleving */
(()=>{
  'use strict';
  if(window.__msReferenceDashboard8254)return;
  window.__msReferenceDashboard8254=true;

  const BUILD='8.25.4';
  const BASE='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@4120bf082838776b07957f6aef3ef9c17fe915fd/start-dashboard-71510.js';
  const STYLE_ID='ms8254ReferenceDashboardStyle';
  let observer=null;

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta&&meta.content!==BUILD)meta.content=BUILD;
    const settings=document.getElementById('settingsAppVersion');
    if(settings&&settings.textContent!==BUILD)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>{
      if(node.textContent!==BUILD)node.textContent=BUILD;
    });
  }

  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
/* 8.25.4 — Dag exact in de richting van het goedgekeurde voorbeeld.
   Nacht blijft bewust de bestaande donkere navigatiebeleving gebruiken. */
html[data-ms-daynight="day"],
html[data-ms-daynight="day"] body,
html[data-ms-daynight="day"] #appView,
html[data-ms-daynight="day"] #dashboard{
  background:#edf8fc!important;
  color:#071f37!important;
}

html[data-ms-daynight="day"] #ms8210Start{
  --ms8254-navy:#062344;
  --ms8254-blue:#0aa9eb;
  --ms8254-cyan:#22c6ee;
  --ms8254-muted:#58748b;
  position:relative!important;
  isolation:isolate!important;
  overflow:visible!important;
  color:var(--ms8254-navy)!important;
  padding-bottom:112px!important;
  background:
    linear-gradient(180deg,rgba(241,251,255,.10) 0%,rgba(237,249,253,.60) 24%,rgba(239,249,252,.92) 53%,#edf8fb 100%),
    url('/serenity-ivms-hero.png') center top/100% auto no-repeat,
    linear-gradient(180deg,#dff4ff,#edf8fb)!important;
}

/* Header: geen zwarte balk meer, maar lucht/water en een duidelijke Serenity lock-up. */
html[data-ms-daynight="day"] #ms8210Start .ms8234-header{
  position:relative!important;
  overflow:visible!important;
  min-height:178px!important;
  margin:0!important;
  padding:18px 14px 14px!important;
  border:0!important;
  border-radius:0!important;
  background:linear-gradient(180deg,rgba(244,252,255,.18),rgba(236,248,252,.06))!important;
  box-shadow:none!important;
  backdrop-filter:none!important;
  -webkit-backdrop-filter:none!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8234-header::before,
html[data-ms-daynight="day"] #ms8210Start .ms8234-header::after{opacity:0!important;background:none!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-brand{
  position:relative!important;
  z-index:2!important;
  align-items:flex-start!important;
  color:var(--ms8254-navy)!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8234-brand h1,
html[data-ms-daynight="day"] #ms8210Start .ms8218-serenity-brand,
html[data-ms-daynight="day"] #ms8210Start .ms8218-brand-lockup{
  color:#07315d!important;
  font-family:Georgia,"Times New Roman",serif!important;
  font-size:clamp(42px,11vw,64px)!important;
  font-weight:500!important;
  line-height:.88!important;
  letter-spacing:-.055em!important;
  text-shadow:0 1px 0 rgba(255,255,255,.76)!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8234-sail,
html[data-ms-daynight="day"] #ms8210Start .ms8218-brand-sail{
  color:#047fc4!important;
  filter:drop-shadow(0 3px 7px rgba(4,83,134,.10))!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8254-tagline{
  display:block!important;
  margin:7px 0 0!important;
  color:#173f68!important;
  font-size:7.5px!important;
  line-height:1!important;
  font-weight:800!important;
  letter-spacing:.28em!important;
  text-transform:uppercase!important;
  white-space:nowrap!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8234-greeting{
  position:relative!important;
  z-index:2!important;
  margin-top:18px!important;
  color:#092846!important;
  font-size:18px!important;
  line-height:1.05!important;
  font-weight:850!important;
  text-shadow:0 1px 0 rgba(255,255,255,.65)!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8245-date{
  position:relative!important;
  z-index:2!important;
  margin-top:5px!important;
  color:#536f88!important;
  font-size:12px!important;
  font-weight:540!important;
}

/* Aandachtspunten: los wit kaartje rechtsboven zoals in het voorbeeld. */
html[data-ms-daynight="day"] #ms8210Start .ms8234-attention{
  position:absolute!important;
  z-index:6!important;
  top:14px!important;
  right:10px!important;
  width:min(47%,188px)!important;
  min-height:70px!important;
  max-width:none!important;
  padding:10px 12px!important;
  border:1px solid rgba(56,105,139,.16)!important;
  border-radius:25px!important;
  background:rgba(255,255,255,.94)!important;
  color:#092846!important;
  box-shadow:0 12px 30px rgba(28,70,99,.15),inset 0 1px 0 rgba(255,255,255,.96)!important;
  backdrop-filter:blur(14px)!important;
  -webkit-backdrop-filter:blur(14px)!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8234-attention-copy strong{
  color:#09233f!important;
  font-size:12px!important;
  line-height:1.02!important;
  font-weight:900!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8234-attention-copy small{
  color:#607a90!important;
  font-size:10px!important;
  font-weight:550!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8234-attention .ms8234-icon{color:#547288!important}

/* Dag-keuze als witte Apple-achtige pill. */
html[data-ms-daynight="day"] #ms8251ThemeControl{
  position:relative!important;
  z-index:20!important;
  margin:-12px 13px 10px!important;
}
html[data-ms-daynight="day"] #ms8251ThemeControl .ms8251-theme-button{
  min-height:42px!important;
  padding:8px 16px!important;
  border:1px solid rgba(48,103,137,.16)!important;
  border-radius:24px!important;
  background:rgba(255,255,255,.94)!important;
  color:#0a2948!important;
  box-shadow:0 9px 24px rgba(30,73,101,.11),inset 0 1px 0 #fff!important;
}
html[data-ms-daynight="day"] #ms8251ThemeControl .ms8251-theme-icon{color:#ffb000!important;font-size:21px!important}
html[data-ms-daynight="day"] #ms8251ThemeControl .ms8251-theme-label{font-size:13px!important;font-weight:850!important}

/* Bovenste drie statuskaarten. */
html[data-ms-daynight="day"] #ms8210Start .ms8234-status-grid{
  gap:11px!important;
  padding:0 13px!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8234-status{
  min-height:90px!important;
  padding:13px 11px!important;
  border:1px solid rgba(62,124,157,.14)!important;
  border-radius:20px!important;
  background:linear-gradient(155deg,rgba(255,255,255,.98),rgba(247,252,254,.91))!important;
  color:#0a2948!important;
  box-shadow:0 10px 25px rgba(29,76,102,.09),inset 0 1px 0 rgba(255,255,255,.98)!important;
  backdrop-filter:blur(12px)!important;
  -webkit-backdrop-filter:blur(12px)!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8234-status>.ms8234-icon{color:#0788ca!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-status-copy small{
  color:#617d93!important;
  font-size:10px!important;
  font-weight:850!important;
  letter-spacing:.07em!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8234-status-copy strong{
  color:#092441!important;
  font-size:15px!important;
  font-weight:900!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8245-status-sub{color:#607b91!important;font-size:9px!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-status .ms8234-icon-chevron{color:#587a93!important}

/* Hero: groot, licht, foto rechts; teksten links. */
html[data-ms-daynight="day"] #ms8210Start .ms8234-hero{
  position:relative!important;
  overflow:hidden!important;
  min-height:520px!important;
  margin:18px 13px 17px!important;
  padding:29px 22px 24px!important;
  border:1.5px solid rgba(38,170,225,.48)!important;
  border-radius:27px!important;
  color:#071f37!important;
  background:
    linear-gradient(90deg,rgba(242,251,255,.98) 0%,rgba(238,249,253,.92) 43%,rgba(230,247,253,.44) 68%,rgba(219,243,252,.08) 100%),
    url('/serenity-ivms-hero.png') right center/cover no-repeat!important;
  background-blend-mode:normal!important;
  box-shadow:0 18px 42px rgba(31,91,121,.14),inset 0 1px 0 rgba(255,255,255,.88)!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8234-hero::before{
  content:''!important;
  position:absolute!important;
  inset:0!important;
  z-index:0!important;
  pointer-events:none!important;
  background:linear-gradient(180deg,rgba(255,255,255,.02) 0%,rgba(215,241,251,.18) 100%)!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8234-hero>*{position:relative!important;z-index:1!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-kicker{
  margin-bottom:20px!important;
  color:#078fd0!important;
  font-size:13px!important;
  font-weight:950!important;
  letter-spacing:.16em!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8234-hero h2{
  width:min(100%,500px)!important;
  margin:0!important;
  color:#061f3a!important;
  font-size:clamp(39px,9.5vw,57px)!important;
  line-height:.98!important;
  font-weight:950!important;
  letter-spacing:-.052em!important;
  text-shadow:0 1px 0 rgba(255,255,255,.64)!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8245-hero-sub{
  width:min(100%,500px)!important;
  margin:14px 0 0!important;
  color:#365d76!important;
  font-size:15px!important;
  line-height:1.25!important;
  font-weight:650!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8234-live-metrics{
  margin:28px 0 16px!important;
  padding:13px 10px!important;
  border:1px solid rgba(61,117,151,.13)!important;
  border-radius:18px!important;
  background:rgba(255,255,255,.91)!important;
  box-shadow:0 7px 20px rgba(31,78,104,.10),inset 0 1px 0 #fff!important;
  backdrop-filter:blur(14px)!important;
  -webkit-backdrop-filter:blur(14px)!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8234-live-metric{border-right-color:rgba(29,78,109,.13)!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-live-metric .ms8234-icon{color:#0a4168!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-live-copy strong{color:#071f3a!important;font-weight:900!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-live-copy small{color:#668197!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-start{
  width:100%!important;
  min-height:62px!important;
  border:1px solid rgba(0,155,220,.32)!important;
  border-radius:18px!important;
  background:linear-gradient(105deg,#079fe6 0%,#1bc8eb 100%)!important;
  color:#fff!important;
  font-size:18px!important;
  font-weight:850!important;
  box-shadow:0 14px 30px rgba(4,153,210,.25),inset 0 1px 0 rgba(255,255,255,.24)!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8234-start:active{transform:scale(.985)!important}

/* Vier hoofdfuncties: zachte pastelkaarten met één consistente lijnstijl. */
html[data-ms-daynight="day"] #ms8210Start .ms8234-feature-grid{
  gap:12px!important;
  padding:0 13px!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8234-feature{
  min-height:148px!important;
  padding:20px 38px 20px 19px!important;
  border:1px solid rgba(51,121,155,.13)!important;
  border-radius:24px!important;
  color:#082746!important;
  background:linear-gradient(145deg,#f0fbff,#dff4fa)!important;
  box-shadow:0 11px 28px rgba(29,77,103,.08),inset 0 1px 0 rgba(255,255,255,.82)!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8234-feature[data-tone="purple"]{background:linear-gradient(145deg,#fbf8ff,#eee8fb)!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-feature[data-tone="green"]{background:linear-gradient(145deg,#f3fdf9,#e2f6ec)!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-feature[data-tone="gold"]{background:linear-gradient(145deg,#fffdf7,#fff0cd)!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-feature>.ms8234-icon{
  color:#092f57!important;
  filter:none!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8234-feature[data-tone="gold"]>.ms8234-icon{color:#e99f00!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-feature-copy strong{color:#071f3a!important;font-size:18px!important;font-weight:900!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-feature-copy small{color:#55748d!important;font-size:13px!important;line-height:1.2!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-feature::before{color:#557890!important}

/* Onderste navigatie: donker marineglazen pill; Start is helder blauw actief. */
html[data-ms-daynight="day"] #ms8210Start .ms8234-bottom{
  position:fixed!important;
  z-index:2147483000!important;
  left:12px!important;
  right:12px!important;
  bottom:max(8px,env(safe-area-inset-bottom))!important;
  width:auto!important;
  max-width:760px!important;
  min-height:72px!important;
  margin:0 auto!important;
  padding:7px 8px!important;
  border:1px solid rgba(87,168,211,.28)!important;
  border-radius:30px!important;
  background:linear-gradient(180deg,rgba(5,50,80,.97),rgba(3,35,61,.98))!important;
  box-shadow:0 16px 40px rgba(5,32,49,.27),inset 0 1px 0 rgba(255,255,255,.08)!important;
  backdrop-filter:blur(20px)!important;
  -webkit-backdrop-filter:blur(20px)!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8234-navbtn{
  min-height:58px!important;
  border:0!important;
  border-radius:20px!important;
  background:transparent!important;
  color:#c9dfeb!important;
  font-size:11px!important;
  font-weight:650!important;
  box-shadow:none!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8234-navbtn .ms8234-icon{color:#c9dfeb!important}
html[data-ms-daynight="day"] #ms8210Start .ms8234-navbtn.active,
html[data-ms-daynight="day"] #ms8210Start .ms8234-navbtn:first-child{
  border:1px solid rgba(56,202,255,.28)!important;
  background:linear-gradient(180deg,#17acf1,#087cd7)!important;
  color:#fff!important;
  box-shadow:0 8px 22px rgba(0,143,229,.42),inset 0 1px 0 rgba(255,255,255,.22)!important;
}
html[data-ms-daynight="day"] #ms8210Start .ms8234-navbtn.active .ms8234-icon,
html[data-ms-daynight="day"] #ms8210Start .ms8234-navbtn:first-child .ms8234-icon{color:#fff!important}

/* Overige kaarten in Dag blijven licht en rustig. */
html[data-ms-daynight="day"] #ms8210Start .ms8234-boatstatus,
html[data-ms-daynight="day"] #ms8210Start .ms8234-mini{
  border-color:rgba(50,120,153,.13)!important;
  background:rgba(255,255,255,.84)!important;
  color:#123753!important;
  box-shadow:0 10px 28px rgba(29,77,103,.08)!important;
}

@media(max-width:620px){
  html[data-ms-daynight="day"] #ms8210Start{padding-bottom:104px!important;background-size:auto,auto 360px,auto!important;background-position:center top,center top,center top!important}
  html[data-ms-daynight="day"] #ms8210Start .ms8234-header{min-height:172px!important;padding-left:12px!important;padding-right:12px!important}
  html[data-ms-daynight="day"] #ms8210Start .ms8234-brand h1,
  html[data-ms-daynight="day"] #ms8210Start .ms8218-serenity-brand,
  html[data-ms-daynight="day"] #ms8210Start .ms8218-brand-lockup{font-size:44px!important}
  html[data-ms-daynight="day"] #ms8210Start .ms8234-attention{right:8px!important;width:45%!important;min-height:68px!important;padding:9px 10px!important}
  html[data-ms-daynight="day"] #ms8210Start .ms8234-status-grid,
  html[data-ms-daynight="day"] #ms8210Start .ms8234-feature-grid{padding-left:10px!important;padding-right:10px!important}
  html[data-ms-daynight="day"] #ms8210Start .ms8234-status{min-height:84px!important;padding:11px 8px!important}
  html[data-ms-daynight="day"] #ms8210Start .ms8234-status-copy strong{font-size:13px!important}
  html[data-ms-daynight="day"] #ms8210Start .ms8234-hero{min-height:500px!important;margin:16px 10px!important;padding:27px 20px 20px!important}
  html[data-ms-daynight="day"] #ms8210Start .ms8234-hero h2{font-size:clamp(36px,10.7vw,48px)!important}
  html[data-ms-daynight="day"] #ms8210Start .ms8245-hero-sub{font-size:14px!important}
  html[data-ms-daynight="day"] #ms8210Start .ms8234-live-metrics{margin-top:24px!important;padding:12px 6px!important}
  html[data-ms-daynight="day"] #ms8210Start .ms8234-feature{min-height:136px!important;padding:17px 32px 17px 15px!important}
  html[data-ms-daynight="day"] #ms8210Start .ms8234-feature-copy strong{font-size:16px!important}
  html[data-ms-daynight="day"] #ms8210Start .ms8234-feature-copy small{font-size:11px!important}
  html[data-ms-daynight="day"] #ms8210Start .ms8234-bottom{left:7px!important;right:7px!important;min-height:68px!important;border-radius:27px!important}
  html[data-ms-daynight="day"] #ms8210Start .ms8234-navbtn{min-height:54px!important;font-size:10px!important}
}
@media(max-width:390px){
  html[data-ms-daynight="day"] #ms8210Start .ms8234-brand h1,
  html[data-ms-daynight="day"] #ms8210Start .ms8218-serenity-brand,
  html[data-ms-daynight="day"] #ms8210Start .ms8218-brand-lockup{font-size:39px!important}
  html[data-ms-daynight="day"] #ms8210Start .ms8254-tagline{font-size:6px!important;letter-spacing:.19em!important}
  html[data-ms-daynight="day"] #ms8210Start .ms8234-attention-copy strong{font-size:10.5px!important}
  html[data-ms-daynight="day"] #ms8210Start .ms8234-attention-copy small{font-size:8.5px!important}
  html[data-ms-daynight="day"] #ms8210Start .ms8234-hero{padding-left:17px!important;padding-right:17px!important}
  html[data-ms-daynight="day"] #ms8210Start .ms8234-hero h2{font-size:37px!important}
  html[data-ms-daynight="day"] #ms8210Start .ms8234-start{font-size:16px!important}
}
@media(prefers-reduced-motion:reduce){
  html[data-ms-daynight="day"] #ms8210Start *{scroll-behavior:auto!important;transition:none!important}
}
`;
    document.head.appendChild(style);
  }

  function polishDom(){
    syncBuild();
    const root=document.getElementById('ms8210Start');
    if(!root)return false;

    const brand=root.querySelector('.ms8234-brand');
    if(brand&&!brand.querySelector('.ms8254-tagline')){
      const tagline=document.createElement('small');
      tagline.className='ms8254-tagline';
      tagline.textContent='EXPLORE · NAVIGATE · ENJOY';
      const heading=brand.querySelector('h1,.ms8218-serenity-brand,.ms8218-brand-lockup');
      (heading||brand).insertAdjacentElement('afterend',tagline);
    }

    const hero=root.querySelector('.ms8234-hero');
    const kicker=hero?.querySelector('.ms8234-kicker');
    if(kicker&&kicker.textContent!=='WELKOM TERUG')kicker.textContent='WELKOM TERUG';

    root.dataset.msReferenceDesign='8254';
    return true;
  }

  function repair(){
    installStyle();
    polishDom();
  }

  function startReferenceDesign(){
    repair();
    if(!observer&&document.body){
      observer=new MutationObserver(()=>{
        const root=document.getElementById('ms8210Start');
        if(root&&!root.dataset.msReferenceDesign)repair();
        else if(root&&!root.querySelector('.ms8254-tagline'))polishDom();
      });
      observer.observe(document.body,{subtree:true,childList:true});
    }

    ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:theme-changed','mijnserenity:profile-ready'].forEach(type=>{
      window.addEventListener(type,repair,{passive:true});
    });
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)repair()},{passive:true});

    setTimeout(repair,0);
    setTimeout(repair,300);
    setTimeout(repair,900);
    setTimeout(repair,1800);
  }

  function loadBase(){
    if(window.__msPersonalWelcome8253){
      startReferenceDesign();
      return;
    }
    const script=document.createElement('script');
    script.src=BASE;
    script.async=false;
    script.crossOrigin='anonymous';
    script.onload=startReferenceDesign;
    script.onerror=()=>{
      console.error('MijnSerenity 8.25.3 basis kon niet worden geladen.');
      startReferenceDesign();
    };
    document.head.appendChild(script);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadBase,{once:true});
  else loadBase();
})();
