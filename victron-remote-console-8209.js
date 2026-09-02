/* MijnSerenity 8.22.0 — officiële Victron Cerbo GX Remote Console LIVE in MijnSerenity.
   Geen VRM-snelkoppeling en geen iframe naar de VRM-website. MijnSerenity host de
   officiële Victron GUI-v2 en verbindt die rechtstreeks met Serenity via VRM MQTT. */
(()=>{
  'use strict';
  if(window.__msVictronRemoteConsole8216)return;
  window.__msVictronRemoteConsole8216=true;

  const BUILD='8.22.0';
  const CONFIG_URL='/api/victron-console-config';
  const GUI_URL='/victron-gui/index.html';
  const TOKEN_KEYS=['ms7148_vrm_token','ms7148VrmToken','mijnserenity_vrm_token','vrm_api_token'];
  const EMAIL_KEY='mijnserenity_vrm_mqtt_email';
  const $=id=>document.getElementById(id);

  let readyTimer=0;
  let loading=false;
  let lastConfig=null;

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const version=$('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');
    if(badge)badge.textContent=BUILD;
  }

  function savedToken(){
    for(const key of TOKEN_KEYS){
      const value=String(localStorage.getItem(key)||'').trim().replace(/^Token\s+/i,'');
      if(value)return value;
    }
    return '';
  }

  function saveToken(value){
    const token=String(value||'').trim().replace(/^Token\s+/i,'');
    if(!token)return '';
    for(const key of TOKEN_KEYS){
      try{localStorage.setItem(key,token)}catch{}
    }
    try{
      const configKey='mijnserenity-ruuvi-climate-v7102';
      const config=JSON.parse(localStorage.getItem(configKey)||'{}');
      localStorage.setItem(configKey,JSON.stringify({...config,vrmToken:token}));
    }catch{}
    window.dispatchEvent(new CustomEvent('mijnserenity:vrm-token-saved'));
    return token;
  }

  function currentEmail(){
    try{
      const saved=String(localStorage.getItem(EMAIL_KEY)||'').trim();
      if(saved.includes('@'))return saved;
    }catch{}
    try{
      if(typeof currentUser!=='undefined'&&String(currentUser?.email||'').includes('@'))return String(currentUser.email).trim();
    }catch{}
    const login=String($('email')?.value||'').trim();
    return login.includes('@')?login:'';
  }

  function saveEmail(value){
    const email=String(value||'').trim();
    if(email.includes('@'))try{localStorage.setItem(EMAIL_KEY,email)}catch{}
    return email;
  }

  function setStatus(text,state='loading'){
    const node=$('msVictronConsoleStatus');
    if(node)node.textContent=text;
    const card=$('msVictronConsoleCard');
    card?.classList.toggle('loaded',state==='ready');
    card?.classList.toggle('error',state==='error');
    const loadingNode=$('msVictronConsoleLoading');
    if(loadingNode){
      loadingNode.classList.toggle('hidden',state==='ready');
      loadingNode.classList.toggle('error',state==='error');
      const textNode=loadingNode.querySelector('[data-ms-victron-loading-text]');
      if(textNode)textNode.textContent=text;
    }
  }

  function showTokenSetup(show=true){
    const setup=$('msVictronConsoleTokenSetup');
    const normal=$('msVictronConsoleLoadingNormal');
    setup?.classList.toggle('hidden',!show);
    normal?.classList.toggle('hidden',show);
    if(show)setTimeout(()=>$('msVictronConsoleToken')?.focus(),80);
  }

  function ensureStyle(){
    if($('msVictronConsoleStyle8211'))return;
    $('msVictronConsoleStyle8210')?.remove();
    $('msVictronConsoleStyle8209')?.remove();
    const style=document.createElement('style');
    style.id='msVictronConsoleStyle8211';
    style.textContent=`
      #msVictronConsoleCard{margin:14px 0 18px;border:1px solid rgba(66,170,255,.32);border-radius:22px;overflow:hidden;background:#061725;box-shadow:0 14px 34px rgba(0,0,0,.24)}
      #msVictronConsoleCard .msvrc-head{display:flex;align-items:center;gap:12px;padding:13px 14px;background:linear-gradient(145deg,#071b2c,#0b2539);border-bottom:1px solid rgba(255,255,255,.08)}
      #msVictronConsoleCard .msvrc-logo{display:grid;place-items:center;width:43px;height:43px;flex:0 0 43px;border-radius:13px;background:#0d74bb;color:#fff;font-size:23px;font-weight:900;box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)}
      #msVictronConsoleCard .msvrc-copy{min-width:0;flex:1}
      #msVictronConsoleCard .msvrc-copy small{display:block;color:#8fb5ce;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
      #msVictronConsoleCard .msvrc-copy strong{display:block;margin-top:2px;color:#f5fbff;font-size:18px;line-height:1.15}
      #msVictronConsoleCard .msvrc-copy span{display:block;margin-top:3px;color:#b9d0df;font-size:11px;line-height:1.35}
      #msVictronConsoleCard .msvrc-tools{display:flex;gap:7px}
      #msVictronConsoleCard .msvrc-tools button{width:40px;height:40px;min-height:40px;padding:0;border:1px solid rgba(83,194,255,.34);border-radius:12px;background:#0a3550;color:#fff;font-size:19px}
      #msVictronConsoleCard .msvrc-view{position:relative;width:100%;height:clamp(520px,72dvh,820px);background:#000;overflow:hidden}
      #msVictronConsoleFrame{display:block;width:100%;height:100%;border:0;background:#000}
      #msVictronConsoleLoading{position:absolute;inset:0;z-index:3;display:grid;place-items:center;padding:24px;background:#02080d;color:#c8dce9;text-align:center;font-size:13px;line-height:1.5;transition:opacity .25s ease}
      #msVictronConsoleLoading.hidden{opacity:0;pointer-events:none}
      #msVictronConsoleLoading.error{color:#ffd4d4;background:#16090b}
      #msVictronConsoleLoading .msvrc-spinner{width:32px;height:32px;margin:0 auto 13px;border:3px solid rgba(104,194,244,.20);border-top-color:#43baff;border-radius:50%;animation:msvrc-spin .9s linear infinite}
      #msVictronConsoleLoading.error .msvrc-spinner{display:none}
      #msVictronConsoleLoadingNormal.hidden,#msVictronConsoleTokenSetup.hidden{display:none}
      #msVictronConsoleTokenSetup{width:min(100%,420px);padding:22px;border:1px solid rgba(83,194,255,.32);border-radius:18px;background:linear-gradient(145deg,#081d2e,#0a273b);box-shadow:0 18px 44px rgba(0,0,0,.36);color:#eef9ff;text-align:left}
      #msVictronConsoleTokenSetup h3{margin:0 0 7px;font-size:20px;color:#fff}
      #msVictronConsoleTokenSetup p{margin:0 0 15px;color:#b9d0df;font-size:13px;line-height:1.45}
      #msVictronConsoleTokenSetup label{display:block;margin-bottom:7px;color:#dff3ff;font-size:13px;font-weight:800}
      #msVictronConsoleTokenSetup .msvrc-token-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}
      #msVictronConsoleToken{width:100%;min-width:0;height:48px;padding:0 13px;border:1px solid rgba(103,201,255,.42);border-radius:12px;background:#04131f;color:#fff;font:inherit;font-size:16px;outline:none}
      #msVictronConsoleToken:focus{border-color:#53c2ff;box-shadow:0 0 0 3px rgba(83,194,255,.16)}
      #msVictronConsoleTokenSetup button{min-height:48px;padding:0 14px;border:1px solid rgba(83,194,255,.38);border-radius:12px;background:#0a3550;color:#fff;font:inherit;font-weight:800}
      #msVictronConsoleTokenSetup .msvrc-token-save{width:100%;margin-top:10px;background:#0878bd;border-color:#2ca8ed}
      #msVictronConsoleTokenSetup small{display:block;margin-top:10px;color:#8fb5ce;font-size:11px;line-height:1.4}
      @keyframes msvrc-spin{to{transform:rotate(360deg)}}
      #msVictronConsoleCard .msvrc-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;background:#071a29;color:#9eb9ca;font-size:10px;line-height:1.35}
      #msVictronConsoleCard .msvrc-status{display:flex;align-items:center;gap:7px}
      #msVictronConsoleCard .msvrc-dot{width:8px;height:8px;border-radius:50%;background:#f2bd42;box-shadow:0 0 0 3px rgba(242,189,66,.12)}
      #msVictronConsoleCard.loaded .msvrc-dot{background:#36d98b;box-shadow:0 0 0 3px rgba(54,217,139,.12)}
      #msVictronConsoleCard.error .msvrc-dot{background:#ef5b62;box-shadow:0 0 0 3px rgba(239,91,98,.12)}
      body.msvrc-fullscreen{overflow:hidden!important}
      body.msvrc-fullscreen #msVictronConsoleCard{position:fixed!important;inset:max(6px,env(safe-area-inset-top)) max(6px,env(safe-area-inset-right)) calc(70px + env(safe-area-inset-bottom)) max(6px,env(safe-area-inset-left))!important;z-index:2147483400!important;margin:0!important;border-radius:18px!important;display:flex!important;flex-direction:column!important;background:#02080d!important}
      body.msvrc-fullscreen #msVictronConsoleCard .msvrc-view{height:auto!important;min-height:0!important;flex:1 1 auto!important}
      body.msvrc-fullscreen #msVictronConsoleCard .msvrc-foot{display:none}
      @media(max-width:620px){
        #msVictronConsoleCard .msvrc-copy span{display:none}
        #msVictronConsoleCard .msvrc-view{height:68dvh;min-height:500px}
        #msVictronConsoleCard .msvrc-foot{align-items:flex-start;flex-direction:column}
      }
    `;
    document.head.appendChild(style);
  }

  function technicalSection(){
    return $('technical')||document.querySelector('[data-page="technical"],.technical-page,.technical-section');
  }

  async function getVrmConfig(token){
    const response=await fetch(CONFIG_URL,{
      method:'POST',
      cache:'no-store',
      headers:{'x-vrm-token':token,'accept':'application/json'}
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data?.success===false)throw new Error(data?.error||`HTTP ${response.status}`);
    return data;
  }

  function frameAddress(config,token){
    const email=saveEmail(config?.email||currentEmail());
    if(!email)throw new Error('Het e-mailadres van je VRM-account ontbreekt.');
    const payload={
      id:String(config.portalId||''),
      shard:String(config.shard||''),
      user:email,
      pass:`Token ${token}`
    };
    if(!payload.id||!payload.shard)throw new Error('VRM heeft geen MQTT-configuratie voor Serenity teruggegeven.');
    return `${GUI_URL}#msconfig=${encodeURIComponent(JSON.stringify(payload))}`;
  }

  function watchGuiReady(frame){
    clearInterval(readyTimer);
    let checks=0;
    readyTimer=setInterval(()=>{
      checks+=1;
      try{
        if(frame?.contentWindow?.guiv2initialized===true){
          clearInterval(readyTimer);
          setStatus('Cerbo Remote Console · LIVE','ready');
          return;
        }
      }catch{}
      if(checks>=240){
        clearInterval(readyTimer);
        setStatus('De Victron GUI is geladen, maar de live verbinding reageert niet.','error');
      }
    },500);
  }

  async function loadFrame(force=false){
    if(loading)return false;
    const frame=$('msVictronConsoleFrame');
    if(!frame)return false;
    if(!force&&frame.dataset.msVictronStarted==='1')return true;

    const token=savedToken();
    if(!token){
      setStatus('VRM-token ontbreekt. Sla eerst de Victron-koppeling in MijnSerenity op.','error');
      showTokenSetup(true);
      return false;
    }

    loading=true;
    showTokenSetup(false);
    frame.dataset.msVictronStarted='1';
    setStatus('Live Cerbo-console via VRM voorbereiden…','loading');
    try{
      const config=await getVrmConfig(token);
      lastConfig=config;
      setStatus('Verbinden met Serenity via Victron VRM MQTT…','loading');
      const target=frameAddress(config,token);

      /* Geen token in het iframe-src-attribuut: de gevoelige configuratie wordt
         alleen als URL-fragment in de iframe browsing context gezet. Het fragment
         wordt niet naar Netlify gestuurd; de ingebouwde bridge leest hem lokaal. */
      frame.dataset.msVictronStarted='1';
      try{frame.contentWindow.location.replace(target)}
      catch{frame.src=target}
      watchGuiReady(frame);
      return true;
    }catch(error){
      frame.dataset.msVictronStarted='0';
      setStatus(error?.message||'Victron Remote Console kon niet starten.','error');
      if(/token|toegang/i.test(String(error?.message||'')))showTokenSetup(true);
      return false;
    }finally{
      loading=false;
    }
  }

  async function reloadFrame(){
    const frame=$('msVictronConsoleFrame');
    if(!frame)return;
    clearInterval(readyTimer);
    frame.dataset.msVictronStarted='0';
    try{frame.contentWindow.location.replace('about:blank')}catch{frame.src='about:blank'}
    setTimeout(()=>loadFrame(true),80);
  }

  function toggleFullscreen(){
    const active=document.body.classList.toggle('msvrc-fullscreen');
    const button=$('msVictronConsoleExpand');
    if(button){button.textContent=active?'↙':'↗';button.setAttribute('aria-label',active?'Verklein Victron console':'Victron console schermvullend')}
  }

  function mount(){
    syncBuild();
    ensureStyle();
    if($('msVictronConsoleCard'))return true;
    const section=technicalSection();
    if(!section)return false;

    const card=document.createElement('section');
    card.id='msVictronConsoleCard';
    card.innerHTML=`
      <div class="msvrc-head">
        <div class="msvrc-logo">V</div>
        <div class="msvrc-copy">
          <small>Victron · Cerbo GX</small>
          <strong>Remote Console Live</strong>
          <span>De officiële Victron GUI-v2 live in MijnSerenity · via VRM MQTT, ook op afstand.</span>
        </div>
        <div class="msvrc-tools">
          <button id="msVictronConsoleReload" type="button" aria-label="Victron console vernieuwen" title="Vernieuwen">↻</button>
          <button id="msVictronConsoleExpand" type="button" aria-label="Victron console schermvullend" title="Schermvullend">↗</button>
        </div>
      </div>
      <div class="msvrc-view">
        <div id="msVictronConsoleLoading">
          <div id="msVictronConsoleLoadingNormal"><div class="msvrc-spinner"></div><strong data-ms-victron-loading-text>Live Cerbo-console wordt voorbereid…</strong></div>
          <form id="msVictronConsoleTokenSetup" class="hidden" autocomplete="off">
            <h3>Victron-token toevoegen</h3>
            <p>Plak je VRM API-token om de live Cerbo GX-console te verbinden.</p>
            <label for="msVictronConsoleToken">VRM API-token</label>
            <div class="msvrc-token-row">
              <input id="msVictronConsoleToken" type="password" autocapitalize="none" spellcheck="false" placeholder="Plak hier je token" required>
              <button id="msVictronConsoleTokenToggle" type="button">Toon</button>
            </div>
            <button class="msvrc-token-save" type="submit">Token opslaan en verbinden</button>
            <small>De token blijft alleen op dit apparaat bewaard en komt niet in MijnSerenity of GitHub terecht.</small>
          </form>
        </div>
        <iframe id="msVictronConsoleFrame" allow="fullscreen; clipboard-read; clipboard-write" referrerpolicy="no-referrer" title="Victron Cerbo GX Remote Console"></iframe>
      </div>
      <div class="msvrc-foot">
        <span class="msvrc-status"><i class="msvrc-dot"></i><b id="msVictronConsoleStatus">Live Cerbo-console voorbereiden…</b></span>
        <span>Officiële Victron GUI-v2 · live verbinding met Serenity</span>
      </div>`;

    const firstCard=section.querySelector('.card');
    if(firstCard)firstCard.insertAdjacentElement('afterend',card);
    else section.prepend(card);

    $('msVictronConsoleReload')?.addEventListener('click',reloadFrame);
    $('msVictronConsoleExpand')?.addEventListener('click',toggleFullscreen);
    $('msVictronConsoleTokenToggle')?.addEventListener('click',event=>{
      const input=$('msVictronConsoleToken');
      if(!input)return;
      const reveal=input.type==='password';
      input.type=reveal?'text':'password';
      event.currentTarget.textContent=reveal?'Verberg':'Toon';
    });
    $('msVictronConsoleTokenSetup')?.addEventListener('submit',event=>{
      event.preventDefault();
      const input=$('msVictronConsoleToken');
      const token=saveToken(input?.value);
      if(!token){
        setStatus('Plak eerst je Victron VRM API-token.','error');
        input?.focus();
        return;
      }
      if(input)input.value='';
      showTokenSetup(false);
      loadFrame(true);
    });
    setTimeout(()=>loadFrame(false),60);
    return true;
  }

  function start(){
    syncBuild();
    let attempts=0;
    const tryMount=()=>{
      attempts+=1;
      if(mount()||attempts>=24)return;
      setTimeout(tryMount,350);
    };
    tryMount();
  }

  window.msOpenVictronRemoteConsole=()=>{
    mount();
    $('msVictronConsoleCard')?.scrollIntoView({behavior:'smooth',block:'start'});
    loadFrame(false);
  };
  window.msVictronConsoleReload=reloadFrame;
  window.msVictronConsoleFullscreen=toggleFullscreen;
  window.msVictronConsoleConfig=()=>lastConfig?{...lastConfig}:null;

  ['mijnserenity:modules-ready','mijnserenity:routechange','mijnserenity:dashboard-ready']
    .forEach(name=>window.addEventListener(name,()=>setTimeout(()=>{mount();loadFrame(false)},80),{passive:true}));
  window.addEventListener('pageshow',()=>setTimeout(()=>{mount();loadFrame(false)},80),{passive:true});
  window.addEventListener('mijnserenity:vrm-token-saved',()=>setTimeout(()=>loadFrame(true),80),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>loadFrame(false),80)},{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
