/* MijnSerenity 8.27.4 — Serenity AI spreekt standaard direct en luistert op wekwoord “Gerard”. */
(()=>{
  'use strict';
  if(window.__msSerenityAiVoice8271)return;
  window.__msSerenityAiVoice8271=true;

  const ROOT='ms8210Start';
  const FORM='msQuickAsk8267';
  const RESULT='msQuickAskResult8267';
  const INPUT='msQuickAskInput8267';
  const STYLE='msSerenityAiVoice8271Style';
  const TOOLS='msSerenityAiVoice8271Tools';
  const VOICE_ENDPOINT='/.netlify/functions/ai-voice';
  const VOICE_PREF='mijnserenity-serenity-ai-voice-v2';
  const WAKE_PREF='mijnserenity-serenity-gerard-wake-v1';
  const SILENCE_AFTER_SPEECH_MS=700;
  const SILENCE_FALLBACK_MS=1250;
  const RESTART_DELAY_MS=240;
  const CONVERSATION_IDLE_MS=30000;
  const WAKE_WORD=/\b(?:gerard|gerrard|geraart)\b/i;

  let observer=null;
  let resultObserver=null;
  let recognition=null;
  let listening=false;
  let conversationMode=false;
  let wakeMode=true;
  let speechActive=false;
  let recognitionBaseTranscript='';
  let sessionTranscript='';
  let silenceTimer=null;
  let restartTimer=null;
  let pendingSubmitTimer=null;
  let conversationIdleTimer=null;
  let audioContext=null;
  let audioSource=null;
  let fallbackAudio=null;
  let fallbackUrl='';
  let voiceToken=0;
  let lastSpoken='';
  let speakTimer=null;
  let recognitionBlocked=false;

  const micIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/></svg>';
  const trashIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>';

  function installStyle(){
    if(document.getElementById(STYLE))return;
    const s=document.createElement('style');
    s.id=STYLE;
    s.textContent=`
      #${ROOT} .msqa8267{margin:0 0 22px!important;padding:17px 18px 16px;border:1px solid rgba(77,205,242,.36);border-radius:22px;background:linear-gradient(145deg,rgba(4,42,60,.96),rgba(2,25,39,.97));box-shadow:0 14px 34px rgba(0,0,0,.14),inset 0 1px rgba(255,255,255,.035)}
      #${ROOT} .msqa8267-label{margin-bottom:10px!important;font-size:11px!important}
      #${ROOT} .msqa8267-row{min-height:62px!important}
      #${ROOT} .msqa8267 input{font-size:15px!important}
      #${ROOT} .msqa8267-examples{margin-top:9px!important;font-size:10.5px!important}
      #${ROOT} .msqa8267-result{margin:13px 0 0!important;min-height:138px;padding:16px 17px!important;border:1px solid rgba(89,199,238,.30)!important;border-radius:17px!important;background:rgba(1,18,29,.88)!important;color:#e7f1f5!important;font-size:16px!important;line-height:1.55!important;white-space:pre-line;overflow:auto;max-height:340px}
      #${ROOT} .msqa8267-result strong{font-size:13px!important;letter-spacing:.02em}
      #${ROOT} .msqa8267-result.thinking{min-height:82px;color:#9db2bd!important}
      #${ROOT} .ms8271-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 1px 0}
      #${ROOT} .ms8271-tool{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:38px;padding:0 12px;border:1px solid rgba(91,199,233,.28);border-radius:12px;background:rgba(3,28,43,.84);color:#dff5fa;font-size:12px;font-weight:800;cursor:pointer}
      #${ROOT} .ms8271-tool svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      #${ROOT} .ms8271-tool.listening{border-color:rgba(49,221,251,.88);background:rgba(15,113,139,.35);color:#fff;box-shadow:0 0 0 3px rgba(34,216,255,.08)}
      #${ROOT} .ms8271-tool.wake{border-color:rgba(122,224,255,.48);background:rgba(7,68,91,.42)}
      #${ROOT} .ms8271-tool:disabled{opacity:.42;cursor:not-allowed}
      #${ROOT} .ms8271-speak{display:inline-flex;align-items:center;gap:7px;min-height:38px;padding:0 12px;border:1px solid rgba(91,199,233,.22);border-radius:12px;background:rgba(3,28,43,.58);color:#dff5fa;font-size:12px;font-weight:750;cursor:pointer;user-select:none}
      #${ROOT} .ms8271-speak input{width:17px!important;height:17px!important;min-width:17px!important;margin:0!important;accent-color:#22d8ff;-webkit-appearance:auto!important}
      #${ROOT} .ms8271-ai-note{color:#789aa9;font-size:10px;font-weight:650;white-space:nowrap}
      #${ROOT} .ms8271-voice-status{margin-left:auto;color:#86a8b7;font-size:10px;font-weight:700;min-height:14px}
      @media(max-width:600px){
        #${ROOT} .msqa8267{padding:15px 14px 14px;border-radius:19px}
        #${ROOT} .msqa8267-result{min-height:120px;padding:14px!important;font-size:15px!important}
        #${ROOT} .ms8271-voice-status{width:100%;margin-left:0}
      }
      @media(max-width:430px){
        #${ROOT} .msqa8267 input{font-size:14px!important}
        #${ROOT} .ms8271-tool,#${ROOT} .ms8271-speak{min-height:36px;padding:0 10px;font-size:11px}
        #${ROOT} .ms8271-ai-note{font-size:9px}
      }
    `;
    document.head.appendChild(s);
  }

  function getVoicePreference(){
    try{
      const value=localStorage.getItem(VOICE_PREF);
      return value===null?true:value!=='0';
    }catch{return true}
  }

  function saveVoicePreference(value){
    try{localStorage.setItem(VOICE_PREF,value?'1':'0')}catch{}
  }

  function getWakePreference(){
    try{
      const value=localStorage.getItem(WAKE_PREF);
      return value===null?true:value!=='0';
    }catch{return true}
  }

  function saveWakePreference(value){
    try{localStorage.setItem(WAKE_PREF,value?'1':'0')}catch{}
  }

  function voiceEnabled(){
    const checkbox=document.getElementById('ms8271Speak');
    return checkbox?checkbox.checked:getVoicePreference();
  }

  function setVoiceStatus(text){
    const el=document.getElementById('ms8271VoiceStatus');
    if(el)el.textContent=String(text||'');
  }

  function renderMicButton(){
    const button=document.getElementById('ms8271Mic');
    if(!button)return;
    button.classList.toggle('listening',conversationMode);
    button.classList.toggle('wake',!conversationMode&&wakeMode);
    let label='Microfoon';
    if(conversationMode)label=listening?'Luisteren…':'Gesprek actief';
    else if(wakeMode)label=listening?'Gerard actief':'Gerard luisteren';
    button.innerHTML=`${micIcon}<span>${label}</span>`;
    button.setAttribute('aria-label',conversationMode?'Spraakgesprek stoppen':(wakeMode?'Gerard-wachtstand uitschakelen':'Gerard-wachtstand inschakelen'));
  }

  function unlockAudio(){
    try{
      const Ctx=window.AudioContext||window.webkitAudioContext;
      if(Ctx&&!audioContext)audioContext=new Ctx();
      if(audioContext?.state==='suspended')audioContext.resume().catch(()=>{});
      if(audioContext){
        const source=audioContext.createBufferSource();
        source.buffer=audioContext.createBuffer(1,1,22050);
        source.connect(audioContext.destination);
        try{source.start(0)}catch{}
      }
    }catch{}
  }

  function voiceIsPlaying(){
    return !!audioSource||!!(fallbackAudio&&!fallbackAudio.paused&&!fallbackAudio.ended);
  }

  function stopVoice(){
    voiceToken++;
    try{audioSource?.stop()}catch{}
    audioSource=null;
    try{fallbackAudio?.pause()}catch{}
    fallbackAudio=null;
    if(fallbackUrl){
      try{URL.revokeObjectURL(fallbackUrl)}catch{}
      fallbackUrl='';
    }
  }

  function normalizeSpeech(value){
    return String(value||'').toLocaleLowerCase('nl-NL').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  }

  function likelyAssistantEcho(value){
    const heard=normalizeSpeech(value);
    const spoken=normalizeSpeech(lastSpoken);
    if(!heard||!spoken||heard.length<8)return false;
    if(spoken.includes(heard))return true;
    const words=heard.split(' ').filter(word=>word.length>2);
    if(words.length<3)return false;
    const matched=words.filter(word=>spoken.includes(word)).length;
    return matched/words.length>=0.82;
  }

  function stripWakeWord(value){
    const raw=String(value||'').trim();
    const match=raw.match(WAKE_WORD);
    if(!match)return null;
    return raw.replace(WAKE_WORD,' ').replace(/^[\s,.:;!?-]+|[\s,.:;!?-]+$/g,'').replace(/\s+/g,' ').trim();
  }

  function clearSpeechTimers(){
    clearTimeout(silenceTimer);
    clearTimeout(restartTimer);
    clearTimeout(pendingSubmitTimer);
    silenceTimer=restartTimer=pendingSubmitTimer=null;
  }

  function resetConversationIdle(){
    clearTimeout(conversationIdleTimer);
    if(!conversationMode)return;
    conversationIdleTimer=setTimeout(()=>{
      conversationIdleTimer=null;
      conversationMode=false;
      sessionTranscript='';
      recognitionBaseTranscript='';
      renderMicButton();
      setVoiceStatus(wakeMode?'Ik wacht op “Gerard”.':'Spraakgesprek gestopt.');
    },CONVERSATION_IDLE_MS);
  }

  function shouldListen(){return conversationMode||wakeMode}

  function scheduleRecognitionRestart(delay=RESTART_DELAY_MS){
    clearTimeout(restartTimer);
    if(!shouldListen()||recognitionBlocked)return;
    restartTimer=setTimeout(()=>{
      restartTimer=null;
      if(!shouldListen()||listening||!document.getElementById('ms8271Mic')||document.hidden)return;
      try{recognition?.start()}catch(error){
        if(error?.name!=='InvalidStateError')console.warn('Microfoon opnieuw starten:',error);
      }
    },delay);
  }

  function submitSpeechWhenReady(){
    clearTimeout(pendingSubmitTimer);
    pendingSubmitTimer=null;
    const form=document.getElementById(FORM);
    const input=document.getElementById(INPUT);
    const button=document.getElementById('msQuickAskSend8267');
    const query=String(sessionTranscript||input?.value||'').trim();
    if(!form||!input||!query)return;

    if(button?.disabled){
      pendingSubmitTimer=setTimeout(submitSpeechWhenReady,220);
      return;
    }

    input.value=query;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    sessionTranscript='';
    recognitionBaseTranscript='';
    speechActive=false;
    clearTimeout(silenceTimer);
    silenceTimer=null;

    if(listening){try{recognition?.abort()}catch{}}

    resetConversationIdle();
    setVoiceStatus('Vraag verstuurd · antwoord wordt direct voorgelezen.');
    if(typeof form.requestSubmit==='function')form.requestSubmit();
    else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  }

  function scheduleAutoSubmit(delay=SILENCE_FALLBACK_MS){
    clearTimeout(silenceTimer);
    if(!conversationMode||!String(sessionTranscript||'').trim())return;
    silenceTimer=setTimeout(()=>{
      silenceTimer=null;
      if(!conversationMode)return;
      if(speechActive){scheduleAutoSubmit(SILENCE_AFTER_SPEECH_MS);return}
      submitSpeechWhenReady();
    },delay);
  }

  async function speakWithOpenAI(text){
    if(!voiceEnabled())return;
    const clean=String(text||'').replace(/^Serenity AI\s*·\s*/i,'').trim();
    if(clean.length<2)return;

    stopVoice();
    const token=voiceToken;
    setVoiceStatus('AI-stem wordt geladen…');

    try{
      const response=await fetch(VOICE_ENDPOINT,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({text:clean})
      });
      if(!response.ok){
        const data=await response.json().catch(()=>({}));
        throw new Error(data.error||'Voorlezen lukt nu niet.');
      }
      const bytes=await response.arrayBuffer();
      if(token!==voiceToken)return;

      unlockAudio();
      if(audioContext){
        const buffer=await audioContext.decodeAudioData(bytes.slice(0));
        if(token!==voiceToken)return;
        audioSource=audioContext.createBufferSource();
        audioSource.buffer=buffer;
        audioSource.connect(audioContext.destination);
        audioSource.onended=()=>{
          audioSource=null;
          if(token===voiceToken){
            setVoiceStatus(conversationMode?'Ik luister · praat verder of zeg opnieuw “Gerard”.':(wakeMode?'Ik wacht op “Gerard”.':'AI-stem · gereed'));
            resetConversationIdle();
          }
        };
        audioSource.start(0);
        setVoiceStatus('AI antwoordt · praat om te onderbreken.');
        scheduleRecognitionRestart();
        return;
      }

      const blob=new Blob([bytes],{type:'audio/mpeg'});
      fallbackUrl=URL.createObjectURL(blob);
      fallbackAudio=new Audio(fallbackUrl);
      fallbackAudio.playsInline=true;
      fallbackAudio.onended=()=>{
        fallbackAudio=null;
        if(token===voiceToken){
          setVoiceStatus(conversationMode?'Ik luister · praat verder of zeg opnieuw “Gerard”.':(wakeMode?'Ik wacht op “Gerard”.':'AI-stem · gereed'));
          resetConversationIdle();
        }
      };
      await fallbackAudio.play();
      setVoiceStatus('AI antwoordt · praat om te onderbreken.');
      scheduleRecognitionRestart();
    }catch(error){
      if(token!==voiceToken)return;
      console.warn('Serenity AI stem:',error);
      setVoiceStatus(error?.name==='NotAllowedError'?'Tik één keer op Gerard luisteren om audio toe te staan.':(error?.message||'Voorlezen lukt nu niet.'));
    }
  }

  function currentAnswer(){
    const result=document.getElementById(RESULT);
    if(!result||!result.classList.contains('show')||result.classList.contains('thinking'))return '';
    return String(result.textContent||'').trim();
  }

  function scheduleSpeak(){
    clearTimeout(speakTimer);
    speakTimer=setTimeout(()=>{
      const answer=currentAnswer();
      if(!voiceEnabled()||!answer||answer===lastSpoken)return;
      lastSpoken=answer;
      speakWithOpenAI(answer);
    },120);
  }

  function watchResult(){
    const result=document.getElementById(RESULT);
    if(!result)return;
    resultObserver?.disconnect();
    resultObserver=new MutationObserver(scheduleSpeak);
    resultObserver.observe(result,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
  }

  function stopConversation({stopAudio=true,keepWake=true}={}){
    conversationMode=false;
    speechActive=false;
    sessionTranscript='';
    recognitionBaseTranscript='';
    clearSpeechTimers();
    clearTimeout(conversationIdleTimer);
    conversationIdleTimer=null;
    if(stopAudio)stopVoice();
    if(!keepWake)wakeMode=false;
    try{recognition?.abort()}catch{}
    listening=false;
    renderMicButton();
    setVoiceStatus(wakeMode?'Ik wacht op “Gerard”.':'Spraak luisteren gestopt.');
    if(wakeMode)scheduleRecognitionRestart();
  }

  function activateGerard(rest=''){
    conversationMode=true;
    recognitionBlocked=false;
    clearTimeout(conversationIdleTimer);
    stopVoice();
    lastSpoken='';
    sessionTranscript=String(rest||'').trim();
    recognitionBaseTranscript='';
    renderMicButton();
    setVoiceStatus(sessionTranscript?'Gerard gehoord · vraag ontvangen.':'Gerard gehoord · ik luister.');
    if(sessionTranscript){
      const input=document.getElementById(INPUT);
      if(input){
        input.value=sessionTranscript;
        input.dispatchEvent(new Event('input',{bubbles:true}));
      }
      scheduleAutoSubmit(500);
    }else{
      resetConversationIdle();
    }
  }

  function setupMicrophone(){
    const button=document.getElementById('ms8271Mic');
    const input=document.getElementById(INPUT);
    if(!button||!input)return;

    wakeMode=getWakePreference();
    renderMicButton();

    const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SpeechRecognition){
      button.disabled=true;
      button.title='Spraakherkenning wordt door deze browser niet ondersteund.';
      setVoiceStatus('Deze browser ondersteunt de Gerard-luisterfunctie niet.');
      return;
    }

    recognition=new SpeechRecognition();
    recognition.lang='nl-NL';
    recognition.interimResults=true;
    recognition.continuous=false;
    recognition.maxAlternatives=1;

    recognition.onstart=()=>{
      listening=true;
      recognitionBlocked=false;
      recognitionBaseTranscript=sessionTranscript;
      renderMicButton();
      if(conversationMode&&!voiceIsPlaying())setVoiceStatus('Ik luister · antwoord volgt automatisch na je spreekpauze.');
      else if(wakeMode&&!voiceIsPlaying())setVoiceStatus('Ik wacht op “Gerard”.');
    };

    recognition.onspeechstart=()=>{
      speechActive=true;
      clearTimeout(silenceTimer);
      silenceTimer=null;
    };

    recognition.onspeechend=()=>{
      speechActive=false;
      if(conversationMode&&sessionTranscript.trim())scheduleAutoSubmit(SILENCE_AFTER_SPEECH_MS);
    };

    recognition.onresult=event=>{
      let chunk='';
      for(let i=0;i<event.results.length;i++)chunk+=`${event.results[i][0]?.transcript||''} `;
      chunk=chunk.trim();
      if(!chunk)return;

      if(voiceIsPlaying()&&likelyAssistantEcho(chunk))return;

      if(!conversationMode){
        const rest=stripWakeWord(chunk);
        if(rest===null)return;
        activateGerard(rest);
        return;
      }

      if(voiceIsPlaying()){
        stopVoice();
        lastSpoken='';
        setVoiceStatus('Onderbroken · ik luister naar je aanvulling.');
      }

      const wakeStripped=stripWakeWord(chunk);
      if(wakeStripped!==null)chunk=wakeStripped;
      if(!chunk)return;

      const combined=[recognitionBaseTranscript,chunk].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
      sessionTranscript=combined;
      input.value=combined;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      resetConversationIdle();
      scheduleAutoSubmit(SILENCE_FALLBACK_MS);
    };

    recognition.onerror=event=>{
      if(event.error==='not-allowed'||event.error==='service-not-allowed'){
        recognitionBlocked=true;
        setVoiceStatus('Microfoon geblokkeerd · tik één keer op Gerard luisteren en sta microfoon toe.');
      }else if(event.error==='no-speech'){
        if(conversationMode)setVoiceStatus('Ik luister · praat wanneer je wilt.');
        else if(wakeMode)setVoiceStatus('Ik wacht op “Gerard”.');
      }else if(event.error!=='aborted'){
        setVoiceStatus('Ik kon de spraak niet goed verstaan · probeer het nog eens.');
      }
      renderMicButton();
    };

    recognition.onend=()=>{
      listening=false;
      speechActive=false;
      renderMicButton();
      if(conversationMode&&sessionTranscript.trim())scheduleAutoSubmit(450);
      scheduleRecognitionRestart();
    };

    button.addEventListener('click',()=>{
      unlockAudio();
      recognitionBlocked=false;

      if(conversationMode){
        stopConversation({stopAudio:true,keepWake:true});
        return;
      }

      wakeMode=!wakeMode;
      saveWakePreference(wakeMode);
      if(!wakeMode){
        try{recognition.abort()}catch{}
        listening=false;
        renderMicButton();
        setVoiceStatus('Gerard-wachtstand uit.');
        return;
      }

      renderMicButton();
      setVoiceStatus('Gerard-wachtstand actief · zeg “Gerard”.');
      try{recognition.start()}catch(error){
        console.warn('Microfoon starten:',error);
        scheduleRecognitionRestart();
      }
    });

    const armAfterUserGesture=()=>{
      unlockAudio();
      if(wakeMode&&!listening&&!recognitionBlocked)scheduleRecognitionRestart(40);
    };
    document.addEventListener('pointerdown',armAfterUserGesture,{once:true,passive:true});
    document.addEventListener('touchstart',armAfterUserGesture,{once:true,passive:true});
    document.addEventListener('keydown',armAfterUserGesture,{once:true,passive:true});

    if(wakeMode){
      setVoiceStatus('Gerard staat klaar · tik één keer in de app als de microfoon nog niet actief is.');
      scheduleRecognitionRestart(500);
    }
  }

  function addTools(form){
    if(document.getElementById(TOOLS))return;
    const row=form.querySelector('.msqa8267-row');
    if(!row)return;

    const tools=document.createElement('div');
    tools.id=TOOLS;
    tools.className='ms8271-tools';
    tools.innerHTML=`
      <button id="ms8271Mic" class="ms8271-tool" type="button" aria-label="Gerard-wachtstand inschakelen">${micIcon}<span>Gerard luisteren</span></button>
      <button id="ms8271Clear" class="ms8271-tool" type="button" aria-label="Vraag en antwoord wissen">${trashIcon}<span>Wis</span></button>
      <label class="ms8271-speak"><input id="ms8271Speak" type="checkbox"><span>AI-stem automatisch</span></label>
      <span class="ms8271-ai-note">OpenAI · AI-gegenereerde stem</span>
      <span id="ms8271VoiceStatus" class="ms8271-voice-status" aria-live="polite"></span>`;
    row.insertAdjacentElement('afterend',tools);

    const checkbox=document.getElementById('ms8271Speak');
    checkbox.checked=getVoicePreference();
    if(!checkbox.checked){
      checkbox.checked=true;
      saveVoicePreference(true);
    }
    checkbox.addEventListener('change',()=>{
      saveVoicePreference(checkbox.checked);
      if(checkbox.checked){
        unlockAudio();
        lastSpoken='';
        const answer=currentAnswer();
        if(answer){lastSpoken=answer;speakWithOpenAI(answer)}
        else setVoiceStatus(conversationMode?'Gesprek actief · ik luister.':(wakeMode?'Ik wacht op “Gerard”.':'AI-stem · ingeschakeld'));
      }else{
        stopVoice();
        setVoiceStatus('AI-stem uitgeschakeld.');
      }
    });

    document.getElementById('ms8271Clear')?.addEventListener('click',()=>{
      stopVoice();
      lastSpoken='';
      sessionTranscript='';
      recognitionBaseTranscript='';
      clearTimeout(silenceTimer);
      silenceTimer=null;
      const input=document.getElementById(INPUT);
      const result=document.getElementById(RESULT);
      if(input){input.value='';input.focus()}
      if(result){result.textContent='';result.classList.remove('show','thinking')}
      setVoiceStatus(conversationMode?'Ik luister · praat wanneer je wilt.':(wakeMode?'Ik wacht op “Gerard”.':''));
    });

    form.addEventListener('submit',()=>{
      unlockAudio();
      stopVoice();
      lastSpoken='';
    },true);

    setupMicrophone();
  }

  function enhance(){
    const root=document.getElementById(ROOT);
    const main=root?.querySelector('.ms8263-main');
    const form=document.getElementById(FORM);
    if(!root||!main||!form)return false;

    installStyle();
    if(form.parentElement!==main||main.firstElementChild!==form)main.prepend(form);
    addTools(form);
    watchResult();
    return true;
  }

  window.ms8271EnhanceSerenityAI=enhance;

  function boot(){
    enhance();
    observer?.disconnect();
    observer=new MutationObserver(()=>enhance());
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  window.addEventListener('mijnserenity:dashboard-ready',()=>setTimeout(enhance,40),{passive:true});
  window.addEventListener('pageshow',()=>{
    setTimeout(enhance,80);
    if(shouldListen())scheduleRecognitionRestart(400);
  },{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){
      try{recognition?.abort()}catch{}
      listening=false;
      stopVoice();
    }else if(shouldListen()){
      scheduleRecognitionRestart(400);
    }
  },{passive:true});
})();