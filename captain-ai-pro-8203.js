/* MijnSerenity — Captain AI Conversation + Voice 8.20.4
   Eén Captain: live boordassistent, gesprekssessie, inspreken en voorlezen. */
(()=>{
  'use strict';
  if(window.__msCaptainAiPro8204)return;
  window.__msCaptainAiPro8204=true;

  const $=id=>document.getElementById(id);
  const text=id=>String($(id)?.textContent||'').trim();
  const number=value=>{const m=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):null};
  const HISTORY_KEY='mijnserenity-captain-chat-8204';
  let recognition=null;
  let listening=false;
  let answerObserver=null;

  function loadHistory(){try{const h=JSON.parse(sessionStorage.getItem(HISTORY_KEY)||'[]');return Array.isArray(h)?h.slice(-8):[]}catch{return[]}}
  function saveHistory(h){try{sessionStorage.setItem(HISTORY_KEY,JSON.stringify(h.slice(-8)))}catch{}}
  function addHistory(role,content){const c=String(content||'').trim().slice(0,1800);if(!c)return;const h=loadHistory();h.push({role,content:c});saveHistory(h)}
  function historyContext(){const h=loadHistory();if(!h.length)return'';return '\n\nVorige gespreksturns (gebruik alleen voor context):\n'+h.map(x=>`${x.role==='user'?'Gebruiker':'Captain'}: ${x.content}`).join('\n')}

  function route(name){if(typeof window.captainNavigate==='function')window.captainNavigate(name);else window.ms708GoToPage?.(name,true)}

  function snapshot(){
    const speed=number(text('mg-speed'))??number(text('ms71510Speed'))??0;
    const soc=number(text('mgSoc'))??number(text('ms71510HouseSoc'));
    const houseV=number(text('mgVolt'))??number(text('ms71510HouseVoltage'));
    const houseA=number(text('mgAmp'))??number(text('ms71510HouseCurrent'));
    const startV=number(text('mgStartV'))??number(text('ms71510StartVoltage'));
    const solar=number(text('mgSolar'));
    const water=number(text('mg-water'))??number(text('ms71510Water'));
    const fuel=number(text('mg-fuel'))??number(text('ms71510Fuel'));
    const depth=number(text('mg-depth'))??number(text('ms71510Depth'));
    const gps=String(text('mgGps')||'').toLowerCase();
    const shore=String(text('mgShore')||'').trim();
    const mode=speed>=1.5?'varen':'haven';
    const issues=[];
    const add=(level,label,detail)=>issues.push({level,label,detail});
    if(soc!==null){if(soc<20)add('red','Huishoudaccu',`${Math.round(soc)}% — kritisch laag`);else if(soc<40)add('orange','Huishoudaccu',`${Math.round(soc)}% — laag`)}
    if(startV!==null){if(startV<11.8)add('red','Startaccu',`${startV.toFixed(1)} V — kritisch laag`);else if(startV<12.2)add('orange','Startaccu',`${startV.toFixed(1)} V — controleren`);else if(startV>15)add('orange','Startaccu',`${startV.toFixed(1)} V — ongewoon hoog`)}
    if(fuel!==null){if(fuel<15)add('red','Diesel',`${Math.round(fuel)}% — bijna leeg`);else if(fuel<30)add('orange','Diesel',`${Math.round(fuel)}% — laag`)}
    if(water!==null&&water<20)add('orange','Drinkwater',`${Math.round(water)}% — laag`);
    if(mode==='varen'&&gps&&/(wacht|zoek|geen|offline|onbekend)/i.test(gps))add('red','GPS',`GPS-status: ${text('mgGps')}`);
    if(mode==='varen'&&depth!==null&&depth>0&&depth<1.2)add('orange','Diepte',`${depth.toFixed(1)} m — extra aandacht`);
    const known=[soc,houseV,startV,fuel,water,depth].filter(v=>v!==null).length;
    const completeness=Math.round(known/6*100);
    const level=issues.some(x=>x.level==='red')?'red':issues.some(x=>x.level==='orange')?'orange':known>=3?'green':'grey';
    return {speed,soc,houseV,houseA,startV,solar,water,fuel,depth,gps,shore,mode,issues,completeness,level};
  }

  function statusText(s){
    if(s.level==='red'){const n=s.issues.filter(x=>x.level==='red').length;return `${n} direct aandachtspunt${n===1?'':'en'}`}
    if(s.level==='orange')return `${s.issues.length} aandachtspunt${s.issues.length===1?'':'en'} om te controleren`;
    if(s.level==='green')return 'Geen directe afwijkingen gevonden';
    return 'Nog te weinig live data voor een volledige boordcheck';
  }

  function questionFor(kind,s){
    const base=`Je bent mijn Captain AI, de ChatGPT-achtige boordassistent van Serenity. Modus: ${s.mode}.`;
    if(kind==='check')return `${base} Doe een volledige boordcheck. Geef eerst Groen/Oranje/Rood en daarna maximaal drie concrete acties. Benoem ontbrekende of twijfelachtige sensordata.`;
    if(kind==='energy')return `${base} Analyseer huishoudaccu, laad/ontlaadstroom, startaccu, zonne-opbrengst en walstroom. Geef maximaal drie acties op prioriteit.`;
    if(kind==='departure')return `${base} Doe een vertrekcheck op basis van accu's, brandstof, drinkwater, GPS, weer en techniek. Benoem wat ik handmatig moet controleren.`;
    if(kind==='route')return `${base} Doe een vaarcheck voor GPS, snelheid, diepte, weer/wind en routegegevens. Geef alleen advies dat uit actuele data volgt.`;
    return `${base} Analyseer de actuele boordstatus en geef het belangrijkste aandachtspunt.`;
  }

  function ensureStyle(){
    if($('msCaptainAiProStyle8204'))return;
    const style=document.createElement('style');style.id='msCaptainAiProStyle8204';style.textContent=`
      #msDashboardCaptainSearch.msai-pro{gap:12px!important;padding:15px!important;border-color:rgba(89,215,255,.38)!important;background:linear-gradient(150deg,rgba(4,27,44,.97),rgba(6,48,69,.9))!important}
      .msai-dashboard-head small{color:#77dcff!important}.msai-chatgpt-label{font-size:10px;color:#a6f0d0;font-weight:800;margin-left:6px}
      .msai-pro-status{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;padding:11px 12px;border-radius:14px;background:rgba(0,12,22,.46);border:1px solid rgba(255,255,255,.08)}
      .msai-pro-light{width:12px;height:12px;border-radius:50%;box-shadow:0 0 0 5px rgba(255,255,255,.04)}
      .msai-pro-status[data-level="green"] .msai-pro-light{background:#39d98a}.msai-pro-status[data-level="orange"] .msai-pro-light{background:#ffb84d}.msai-pro-status[data-level="red"] .msai-pro-light{background:#ff5e6c}.msai-pro-status[data-level="grey"] .msai-pro-light{background:#7f96a5}
      .msai-pro-copy b{display:block;color:#f3fbff;font-size:13px}.msai-pro-copy small{display:block;margin-top:2px;color:#9db5c3;font-size:10px}.msai-pro-mode{padding:5px 8px;border-radius:999px;background:rgba(76,202,255,.12);color:#8fe5ff;font-size:10px;font-weight:900;text-transform:uppercase}
      .msai-pro-quick{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.msai-pro-quick button{min-height:42px!important;padding:7px 6px!important;border:1px solid rgba(110,204,236,.2)!important;border-radius:12px!important;background:rgba(9,43,62,.78)!important;color:#eaf8ff!important;font-size:11px!important;font-weight:800!important}
      .msai-pro-issues{display:none;gap:6px}.msai-pro-issues.has-items{display:grid}.msai-pro-issue{display:flex;gap:8px;padding:8px 10px;border-radius:11px;background:rgba(0,12,22,.38);color:#dcecf4;font-size:11px}.msai-pro-issue.red{border-left:3px solid #ff5e6c}.msai-pro-issue.orange{border-left:3px solid #ffb84d}
      .msai-pro-actions{display:flex;gap:7px;overflow:auto}.msai-pro-actions button{flex:0 0 auto!important;min-height:34px!important;padding:6px 10px!important;border:1px solid rgba(110,204,236,.18)!important;border-radius:999px!important;background:rgba(0,19,31,.48)!important;color:#bfeeff!important;font-size:10px!important;font-weight:800!important}
      .msai-voicebar{display:grid;grid-template-columns:auto auto minmax(0,1fr);gap:7px;align-items:center}.msai-voicebar button{height:38px!important;min-width:44px!important;padding:0 10px!important;border:1px solid rgba(105,211,245,.24)!important;border-radius:12px!important;background:rgba(5,31,47,.86)!important;color:#e9faff!important;font-size:15px!important}.msai-voicebar button.listening{background:rgba(255,79,91,.18)!important;border-color:rgba(255,103,112,.6)!important}.msai-voicebar small{color:#8fa9b7;font-size:10px;line-height:1.25}.msai-voicebar .msai-clear{font-size:11px!important}
      @media(max-width:560px){.msai-pro-quick{grid-template-columns:repeat(2,minmax(0,1fr))}.msai-voicebar{grid-template-columns:auto auto auto}.msai-voicebar small{grid-column:1/-1}}
    `;document.head.appendChild(style);
  }

  function speakAnswer(){
    const answer=text('msDashboardCaptainAnswer');if(!answer)return;
    if(!('speechSynthesis'in window)){alert('Voorlezen wordt op dit apparaat niet ondersteund.');return}
    speechSynthesis.cancel();
    const utter=new SpeechSynthesisUtterance(answer);utter.lang='nl-NL';utter.rate=.96;utter.pitch=1;
    const voices=speechSynthesis.getVoices();const nl=voices.find(v=>/^nl/i.test(v.lang));if(nl)utter.voice=nl;
    speechSynthesis.speak(utter);
  }

  function stopListening(){try{recognition?.stop()}catch{};listening=false;const b=$('msCaptainMic');if(b){b.classList.remove('listening');b.textContent='🎙️';b.setAttribute('aria-label','Spreek vraag in')}}
  function startListening(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){const input=$('msDashboardCaptainInput');input?.focus();const hint=$('msCaptainVoiceHint');if(hint)hint.textContent='Spraakherkenning is hier niet beschikbaar; gebruik iPhone-dicteren op het toetsenbord.';return}
    if(listening){stopListening();return}
    speechSynthesis?.cancel?.();recognition=new SR();recognition.lang='nl-NL';recognition.interimResults=true;recognition.continuous=false;recognition.maxAlternatives=1;
    const input=$('msDashboardCaptainInput');const mic=$('msCaptainMic');listening=true;if(mic){mic.classList.add('listening');mic.textContent='⏹';mic.setAttribute('aria-label','Stop luisteren')}
    recognition.onresult=e=>{let final='';let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0]?.transcript||'';if(e.results[i].isFinal)final+=t;else interim+=t}if(input)input.value=(final||interim).trim();if(final){setTimeout(()=>{$('msDashboardCaptainForm')?.requestSubmit?.()},150)}};
    recognition.onerror=e=>{const hint=$('msCaptainVoiceHint');if(hint)hint.textContent=e.error==='not-allowed'?'Geef Safari microfoontoegang om Captain te kunnen inspreken.':'Ik kon je niet goed verstaan. Probeer opnieuw.'};
    recognition.onend=stopListening;try{recognition.start()}catch{stopListening()}
  }

  function watchAnswer(){
    const answer=$('msDashboardCaptainAnswer');if(!answer||answerObserver)return;
    let last='';answerObserver=new MutationObserver(()=>{const v=String(answer.textContent||'').trim();if(answer.classList.contains('ready')&&v&&v!==last){last=v;addHistory('assistant',v)}});answerObserver.observe(answer,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
  }

  function installConversationCapture(){
    const form=$('msDashboardCaptainForm');if(!form||form.dataset.msChatCapture==='1')return;
    form.dataset.msChatCapture='1';
    form.addEventListener('submit',event=>{
      const input=$('msDashboardCaptainInput');const q=String(input?.value||'').trim();if(q.length<2)return;
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      addHistory('user',q);
      const enriched=q+historyContext();
      const answer=$('msDashboardCaptainAnswer');if(answer){answer.classList.remove('ready','error');answer.classList.add('thinking');answer.textContent='✨ Captain denkt mee met de actuele boordgegevens…'}
      input?.blur();
      if(typeof window.ms71814AskCaptainAI==='function')window.ms71814AskCaptainAI(enriched,{target:answer,fallbackLocal:false});
      else if(answer){answer.classList.remove('thinking');answer.classList.add('error');answer.textContent='Captain AI wordt nog geladen.'}
    },true);
  }

  function ask(kind){
    const s=snapshot();const q=questionFor(kind,s);const input=$('msDashboardCaptainInput');if(input)input.value=q;$('msDashboardCaptainForm')?.requestSubmit?.();
  }

  function ensurePro(){
    const card=$('msDashboardCaptainSearch');if(!card)return false;ensureStyle();card.classList.add('msai-pro');
    const head=card.querySelector('.msai-dashboard-head');if(head){const label=head.querySelector('small');if(label)label.textContent='CHATGPT + BOORDDATA';if(!head.querySelector('.msai-chatgpt-label')){const tag=document.createElement('span');tag.className='msai-chatgpt-label';tag.textContent='spraak';head.appendChild(tag)}}
    if(!$('msCaptainProStatus')){const e=document.createElement('div');e.id='msCaptainProStatus';e.className='msai-pro-status';e.innerHTML='<i class="msai-pro-light"></i><div class="msai-pro-copy"><b>Boordcheck laden…</b><small>Captain controleert beschikbare sensordata</small></div><span class="msai-pro-mode">—</span>';card.querySelector('form')?.insertAdjacentElement('beforebegin',e)}
    if(!$('msCaptainProQuick')){const e=document.createElement('div');e.id='msCaptainProQuick';e.className='msai-pro-quick';e.innerHTML='<button type="button" data-ai-kind="check">🧭 Boordcheck</button><button type="button" data-ai-kind="energy">⚡ Energie</button><button type="button" data-ai-kind="departure">✅ Vertrekcheck</button><button type="button" data-ai-kind="route">🌊 Vaarcheck</button>';card.querySelector('form')?.insertAdjacentElement('afterend',e);e.addEventListener('click',x=>{const b=x.target.closest('[data-ai-kind]');if(b)ask(b.dataset.aiKind)})}
    if(!$('msCaptainVoiceBar')){const e=document.createElement('div');e.id='msCaptainVoiceBar';e.className='msai-voicebar';e.innerHTML='<button id="msCaptainMic" type="button" aria-label="Spreek vraag in">🎙️</button><button id="msCaptainSpeak" type="button" aria-label="Lees antwoord voor">🔊</button><button class="msai-clear" type="button" aria-label="Wis gesprek">Nieuw gesprek</button><small id="msCaptainVoiceHint">Tik 🎙️ en praat tegen Captain. Tik 🔊 om zijn antwoord te horen.</small>';card.querySelector('#msCaptainProQuick')?.insertAdjacentElement('afterend',e);$('msCaptainMic')?.addEventListener('click',startListening);$('msCaptainSpeak')?.addEventListener('click',speakAnswer);e.querySelector('.msai-clear')?.addEventListener('click',()=>{saveHistory([]);speechSynthesis?.cancel?.();const a=$('msDashboardCaptainAnswer');if(a){a.textContent='';a.className=''}const i=$('msDashboardCaptainInput');if(i)i.value='';const h=$('msCaptainVoiceHint');if(h)h.textContent='Nieuw gesprek gestart.'})}
    if(!$('msCaptainProIssues')){const e=document.createElement('div');e.id='msCaptainProIssues';e.className='msai-pro-issues';$('msDashboardCaptainAnswer')?.insertAdjacentElement('beforebegin',e)}
    if(!$('msCaptainProActions')){const e=document.createElement('div');e.id='msCaptainProActions';e.className='msai-pro-actions';e.innerHTML='<button data-route="technical">⚙ Techniek</button><button data-route="planner">🧭 Route</button><button data-route="weather">☀ Weer</button><button data-route="map">🗺 Kaart</button>';card.appendChild(e);e.addEventListener('click',x=>{const b=x.target.closest('[data-route]');if(b)route(b.dataset.route)})}
    installConversationCapture();watchAnswer();refresh();return true;
  }

  function refresh(){const status=$('msCaptainProStatus');if(!status)return;const s=snapshot();status.dataset.level=s.level;const b=status.querySelector('b'),small=status.querySelector('small'),mode=status.querySelector('.msai-pro-mode');if(b)b.textContent=statusText(s);if(small)small.textContent=`Live data ${s.completeness}% compleet · ${s.mode==='varen'?`${s.speed.toFixed(1)} km/u`:'stil/afgemeerd'}`;if(mode)mode.textContent=s.mode;const issues=$('msCaptainProIssues');if(issues){issues.classList.toggle('has-items',s.issues.length>0);issues.innerHTML=s.issues.slice(0,3).map(i=>`<div class="msai-pro-issue ${i.level}"><span>${i.level==='red'?'🔴':'🟠'}</span><span><b>${i.label}</b> · ${i.detail}</span></div>`).join('')}}

  function boot(){let tries=0;const install=()=>{tries++;if(ensurePro()||tries>40)return;setTimeout(install,350)};install();setInterval(()=>{if(!document.hidden){ensurePro();refresh()}},15000);['mijnserenity:dashboard-ready','mijnserenity-ha-state-updated','mijnserenity-ruuvi-vrm-updated','mijnserenity:routechange'].forEach(n=>window.addEventListener(n,()=>setTimeout(()=>{ensurePro();refresh()},100),{passive:true}));document.addEventListener('visibilitychange',()=>{if(!document.hidden){ensurePro();refresh()}},{passive:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();