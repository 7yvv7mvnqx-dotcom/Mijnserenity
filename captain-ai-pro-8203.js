/* MijnSerenity — Captain OpenAI Voice bridge 8.20.5
   Eén Captain UI. Ruimt dubbele Captain-elementen op en vervangt browser-spraak door OpenAI transcriptie + TTS via Netlify. */
(()=>{
  'use strict';
  if(window.__msCaptainOpenAiVoice8205)return;
  window.__msCaptainOpenAiVoice8205=true;

  const $=id=>document.getElementById(id);
  let recorder=null,stream=null,chunks=[],recording=false,audioPlayer=null;

  function dedupe(selector){
    const nodes=[...document.querySelectorAll(`#msDashboardCaptainSearch ${selector}`)];
    nodes.slice(1).forEach(node=>node.remove());
  }

  function cleanupDuplicates(){
    ['.msai-pro-status','.msai-pro-quick','.msai-voicebar','.msai-pro-issues','.msai-pro-actions'].forEach(dedupe);
    const card=$('msDashboardCaptainSearch');
    if(!card)return false;
    const head=card.querySelector('.msai-dashboard-head');
    if(head){
      const small=head.querySelector('small');
      if(small)small.textContent='OPENAI + BOORDDATA';
      [...head.querySelectorAll('.msai-chatgpt-label')].slice(1).forEach(x=>x.remove());
    }
    return true;
  }

  function hint(message){const node=$('msCaptainVoiceHint');if(node)node.textContent=message;}
  function setMic(active){const b=$('msCaptainMic');if(!b)return;b.classList.toggle('listening',active);b.textContent=active?'⏹':'🎙️';b.setAttribute('aria-label',active?'Stop opname':'Spreek vraag in');}

  function blobToBase64(blob){
    return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=reject;r.onload=()=>resolve(String(r.result||'').split(',')[1]||'');r.readAsDataURL(blob);});
  }

  async function transcribe(blob){
    if(blob.size>5.5*1024*1024)throw new Error('Opname is te lang. Houd je vraag korter.');
    const audio=await blobToBase64(blob);
    const response=await fetch('/.netlify/functions/captain-transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio,mimeType:blob.type||'audio/mp4'})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'Transcriptie mislukt.');
    return String(data.text||'').trim();
  }

  async function stopRecording(){
    if(!recorder||!recording)return;
    recording=false;
    try{recorder.stop()}catch{}
    setMic(false);
    hint('Captain verwerkt je stem via OpenAI…');
  }

  async function startRecording(){
    if(recording){await stopRecording();return;}
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){hint('Microfoonopname wordt op dit apparaat niet ondersteund.');return;}
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      chunks=[];
      const options=MediaRecorder.isTypeSupported?.('audio/mp4')?{mimeType:'audio/mp4'}:undefined;
      recorder=new MediaRecorder(stream,options);
      recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
      recorder.onerror=()=>{recording=false;setMic(false);hint('Opnemen ging mis. Probeer opnieuw.');};
      recorder.onstop=async()=>{
        stream?.getTracks()?.forEach(t=>t.stop());stream=null;
        try{
          const blob=new Blob(chunks,{type:recorder.mimeType||'audio/mp4'});
          const text=await transcribe(blob);
          const input=$('msDashboardCaptainInput');
          if(input)input.value=text;
          if(text){hint('Vraag verstaan. Captain denkt mee…');$('msDashboardCaptainForm')?.requestSubmit?.();}
          else hint('Ik hoorde geen duidelijke vraag. Probeer opnieuw.');
        }catch(error){hint(error?.message||'Ik kon je niet verstaan.');}
      };
      recorder.start(250);recording=true;setMic(true);hint('Luisteren… tik nogmaals om te stoppen.');
      setTimeout(()=>{if(recording)stopRecording()},30000);
    }catch(error){setMic(false);hint(error?.name==='NotAllowedError'?'Geef MijnSerenity microfoontoegang in Safari.':'Microfoon kon niet worden gestart.');}
  }

  function base64ToBlob(base64,type='audio/mpeg'){
    const bin=atob(base64);const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return new Blob([bytes],{type});
  }

  async function speakWithOpenAI(){
    const text=String($('msDashboardCaptainAnswer')?.textContent||'').trim();
    if(!text){hint('Er is nog geen Captain-antwoord om voor te lezen.');return;}
    hint('OpenAI maakt de gesproken versie…');
    try{
      const response=await fetch('/.netlify/functions/captain-speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:text.slice(0,3500)})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'Voorlezen mislukt.');
      audioPlayer?.pause?.();
      if(audioPlayer?.src)URL.revokeObjectURL(audioPlayer.src);
      const blob=base64ToBlob(data.audio,data.mimeType||'audio/mpeg');
      audioPlayer=new Audio(URL.createObjectURL(blob));
      audioPlayer.onended=()=>hint('Tik 🎙️ voor een vervolgvraag.');
      await audioPlayer.play();hint('Captain spreekt…');
    }catch(error){hint(error?.message||'Gesproken antwoord kon niet worden afgespeeld.');}
  }

  function replaceButton(id,handler){
    const old=$(id);if(!old||old.dataset.msOpenAiVoice==='1')return;
    const fresh=old.cloneNode(true);fresh.dataset.msOpenAiVoice='1';old.replaceWith(fresh);fresh.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();handler();});
  }

  function install(){
    if(!cleanupDuplicates())return false;
    replaceButton('msCaptainMic',startRecording);
    replaceButton('msCaptainSpeak',speakWithOpenAI);
    hint(recording?'Luisteren…':'🎙️ OpenAI luistert · 🔊 OpenAI leest het antwoord voor.');
    return true;
  }

  let queued=false;
  const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;install()})});
  function boot(){install();observer.observe(document.body,{childList:true,subtree:true});[300,900,1800,3500].forEach(ms=>setTimeout(install,ms));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();