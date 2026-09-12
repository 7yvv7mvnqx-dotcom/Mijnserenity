/* MijnSerenity 8.27.7 — veilige iPhone/iPad Gerard-stem, alleen op het antwoordvak. */
(()=>{
  'use strict';
  if(window.__msSerenityAiIosVoiceFix8277)return;
  window.__msSerenityAiIosVoiceFix8277=true;

  const isIOS=/iPad|iPhone|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(!isIOS||!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window))return;

  const RESULT='msQuickAskResult8267';
  const INPUT='msQuickAskInput8267';
  const STATUS='ms8271VoiceStatus';
  let resultObserver=null;
  let attachAttempts=0;
  let lastAnswer='';
  let speakTimer=null;
  let speechToken=0;
  let speaking=false;
  let primed=false;

  function status(text){
    const el=document.getElementById(STATUS);
    if(el)el.textContent=String(text||'');
  }

  function clean(text){
    return String(text||'')
      .replace(/^Serenity AI\s*·\s*/i,'')
      .replace(/^Gerard\s*·\s*/i,'')
      .replace(/\s+/g,' ')
      .trim();
  }

  function currentAnswer(){
    const result=document.getElementById(RESULT);
    if(!result||!result.classList.contains('show')||result.classList.contains('thinking'))return '';
    return clean(result.textContent||'');
  }

  function chooseDutchVoice(){
    const voices=window.speechSynthesis.getVoices?.()||[];
    return voices.find(v=>/^nl-NL$/i.test(v.lang)&&/xander|finn|joost|thomas/i.test(v.name))
      ||voices.find(v=>/^nl-NL$/i.test(v.lang))
      ||voices.find(v=>/^nl/i.test(v.lang))
      ||null;
  }

  function chunks(text){
    const source=String(text||'').trim();
    if(!source)return [];
    const sentences=source.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[source];
    const out=[];
    let current='';
    for(const sentence of sentences){
      const part=sentence.trim();
      if(!part)continue;
      if((current+' '+part).trim().length<=220){
        current=(current+' '+part).trim();
        continue;
      }
      if(current)out.push(current);
      if(part.length<=220){
        current=part;
        continue;
      }
      const words=part.split(/\s+/);
      current='';
      for(const word of words){
        if((current+' '+word).trim().length>210){
          if(current)out.push(current);
          current=word;
        }else current=(current+' '+word).trim();
      }
    }
    if(current)out.push(current);
    return out;
  }

  function stopNative(){
    speechToken++;
    speaking=false;
    try{window.speechSynthesis.cancel()}catch{}
  }

  function finish(token){
    if(token!==speechToken)return;
    speaking=false;
    const micText=document.getElementById('ms8271Mic')?.textContent||'';
    status(/Gerard actief|Luisteren|Gesprek actief/i.test(micText)?'Ik luister · praat gewoon verder.':'Ik wacht op “Gerard”.');
  }

  function speakNative(text){
    const message=clean(text);
    if(message.length<2)return;
    stopNative();
    const token=speechToken;
    const queue=chunks(message);
    if(!queue.length)return;
    speaking=true;
    status('Gerard antwoordt…');

    const next=()=>{
      if(token!==speechToken||!speaking)return;
      const part=queue.shift();
      if(!part){finish(token);return}
      const utterance=new SpeechSynthesisUtterance(part);
      const voice=chooseDutchVoice();
      if(voice)utterance.voice=voice;
      utterance.lang=voice?.lang||'nl-NL';
      utterance.rate=0.96;
      utterance.pitch=1.0;
      utterance.volume=1.0;
      utterance.onstart=()=>{if(token===speechToken)status('Gerard antwoordt · praat om te onderbreken.');};
      utterance.onend=()=>{if(token===speechToken)setTimeout(next,20);};
      utterance.onerror=event=>{
        if(token!==speechToken)return;
        console.warn('Gerard iOS-stem:',event?.error||event);
        speaking=false;
        status('Stem kon niet worden afgespeeld · zet mediavolume hoger en tik één keer in de app.');
      };
      try{
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      }catch(error){
        console.warn('Gerard iOS-stem starten:',error);
        speaking=false;
        status('Stem kon niet worden afgespeeld · tik één keer in de app.');
      }
    };

    setTimeout(next,30);
  }

  function scheduleSpeak(){
    clearTimeout(speakTimer);
    speakTimer=setTimeout(()=>{
      const answer=currentAnswer();
      if(!answer||answer===lastAnswer)return;
      lastAnswer=answer;
      speakNative(answer);
    },160);
  }

  function attachToAnswer(){
    const result=document.getElementById(RESULT);
    if(!result){
      if(++attachAttempts<60)setTimeout(attachToAnswer,250);
      return;
    }
    if(result.dataset.ms8277VoiceObserved==='1')return;
    result.dataset.ms8277VoiceObserved='1';
    lastAnswer=currentAnswer();
    resultObserver?.disconnect();
    resultObserver=new MutationObserver(scheduleSpeak);
    resultObserver.observe(result,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
  }

  function prime(){
    if(primed)return;
    primed=true;
    try{
      window.speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(' ');
      u.lang='nl-NL';
      u.volume=0.01;
      u.rate=1;
      window.speechSynthesis.speak(u);
      setTimeout(()=>window.speechSynthesis.cancel(),30);
    }catch{}
  }

  function boot(){
    attachToAnswer();
    try{window.speechSynthesis.getVoices()}catch{}

    document.addEventListener('pointerdown',prime,{once:true,passive:true});
    document.addEventListener('touchstart',prime,{once:true,passive:true});
    document.addEventListener('keydown',prime,{once:true,passive:true});

    document.addEventListener('input',event=>{
      if(speaking&&event.target?.id===INPUT){
        stopNative();
        status('Onderbroken · ik luister naar je aanvulling.');
      }
    },true);

    document.addEventListener('click',event=>{
      if(event.target?.closest?.('#ms8271Clear'))stopNative();
    },true);

    document.addEventListener('visibilitychange',()=>{
      if(document.hidden)stopNative();
    },{passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
