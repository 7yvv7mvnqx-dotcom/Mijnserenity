/* MijnSerenity 8.23.6 — bevestiging vóór automatisch afmeren */
(()=>{
  'use strict';
  if(window.__msAutoStopConfirmation8236)return;
  window.__msAutoStopConfirmation8236=true;

  const REASK_MS=10*60*1000;
  let promptOpen=false;
  let snoozeUntil=0;

  function ensureStyle(){
    if(document.getElementById('msAutoStopConfirm8236Style'))return;
    const style=document.createElement('style');
    style.id='msAutoStopConfirm8236Style';
    style.textContent=`
      .ms-auto-stop-confirm{position:fixed;inset:0;z-index:2147483639;display:grid;place-items:center;padding:24px;background:rgba(2,12,22,.72);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
      .ms-auto-stop-confirm-card{width:min(100%,420px);padding:22px;border:1px solid rgba(115,192,223,.22);border-radius:26px;background:#102234;color:#f7fbff;box-shadow:0 26px 80px rgba(0,0,0,.42);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif}
      .ms-auto-stop-confirm-icon{display:grid;place-items:center;width:56px;height:56px;margin:0 0 14px;border-radius:18px;background:#16354b;font-size:30px}
      .ms-auto-stop-confirm-card h2{margin:0 0 8px;font-size:25px;line-height:1.12;letter-spacing:-.02em}
      .ms-auto-stop-confirm-card p{margin:0;color:#a9c0d0;font-size:16px;line-height:1.45}
      .ms-auto-stop-confirm-actions{display:grid;grid-template-columns:1fr;gap:10px;margin-top:20px}
      .ms-auto-stop-confirm-actions button{min-height:54px;border:0;border-radius:17px;padding:12px 16px;font:inherit;font-weight:800;font-size:16px;cursor:pointer}
      .ms-auto-stop-confirm-actions .primary{background:#1688f8;color:#fff}
      .ms-auto-stop-confirm-actions .secondary{background:#1b3143;color:#eef8ff;border:1px solid rgba(164,207,228,.18)}
      @media (min-width:520px){.ms-auto-stop-confirm-actions{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

  function ask({icon='⚓',title,text,yes='Ja',no='Nee',danger=false}){
    ensureStyle();
    return new Promise(resolve=>{
      const overlay=document.createElement('div');
      overlay.className='ms-auto-stop-confirm';
      overlay.setAttribute('role','dialog');
      overlay.setAttribute('aria-modal','true');
      overlay.setAttribute('aria-label',title);
      overlay.innerHTML=`
        <div class="ms-auto-stop-confirm-card">
          <div class="ms-auto-stop-confirm-icon">${icon}</div>
          <h2></h2>
          <p></p>
          <div class="ms-auto-stop-confirm-actions">
            <button type="button" class="secondary" data-answer="no"></button>
            <button type="button" class="primary" data-answer="yes"></button>
          </div>
        </div>`;
      const card=overlay.querySelector('.ms-auto-stop-confirm-card');
      card.querySelector('h2').textContent=title;
      card.querySelector('p').textContent=text;
      const noButton=card.querySelector('[data-answer="no"]');
      const yesButton=card.querySelector('[data-answer="yes"]');
      noButton.textContent=no;
      yesButton.textContent=yes;
      if(danger)yesButton.style.background='#d95252';

      let finished=false;
      const finish=value=>{
        if(finished)return;
        finished=true;
        document.removeEventListener('keydown',onKey);
        overlay.remove();
        resolve(value);
      };
      const onKey=event=>{
        if(event.key==='Escape')finish(false);
      };
      noButton.addEventListener('click',()=>finish(false));
      yesButton.addEventListener('click',()=>finish(true));
      document.addEventListener('keydown',onKey);
      document.body.appendChild(overlay);
      requestAnimationFrame(()=>yesButton.focus());
    });
  }

  function rearmForTenMinutes(){
    snoozeUntil=Date.now()+REASK_MS;
    try{
      if(window.liveNavState?.status==='active'){
        liveNavState.stationarySince=Date.now();
        liveNavState.autoStopTriggered=false;
        liveNavState.arrivalIgnoredUntilMove=false;
        liveNavState.backgroundRecovery=false;
        liveNavState.backgroundGapMinutes=0;
        window.persistLiveState?.();
      }
      window.clearLiveAutoStopTimer?.();
      if(window.liveNavState?.status==='active'){
        window.updateLiveAutoStopDetection?.({time:Date.now()});
      }
    }catch(error){
      console.warn('Afmeerdetectie opnieuw starten:',error);
    }
    window.setLiveAutoLogStatus?.(
      'Opname blijft actief · bij nogmaals 10 minuten zonder beweging vraagt MijnSerenity opnieuw.',
      'warning'
    );
  }

  function qualifiesForQuestion(options){
    return Boolean(
      options?.automatic&&
      window.liveNavState?.status==='active'
    );
  }

  function install(){
    if(window.__msAutoStopWrapped8236)return true;
    if(typeof window.stopLiveNavigation!=='function')return false;
    window.__msAutoStopWrapped8236=true;

    const original=window.stopLiveNavigation;
    window.stopLiveNavigation=async function(options={}){
      if(!qualifiesForQuestion(options)){
        return original.apply(this,arguments);
      }

      if(Date.now()<snoozeUntil||promptOpen){
        try{
          liveNavState.autoStopTriggered=false;
          window.persistLiveState?.();
        }catch{}
        return false;
      }

      promptOpen=true;
      try{
        const stillSailing=await ask({
          icon:'⛵',
          title:'Ben je nog aan het varen?',
          text:'MijnSerenity heeft 10 minuten geen duidelijke verplaatsing of snelheidsverandering waargenomen.',
          yes:'Ja, ik vaar nog',
          no:'Nee'
        });

        if(stillSailing){
          rearmForTenMinutes();
          window.showAppToast?.('Opname blijft actief. Over 10 minuten controleren we opnieuw als Serenity stil blijft.');
          return false;
        }

        const stopAndSave=await ask({
          icon:'⚓',
          title:'Route stoppen en opslaan?',
          text:'Wil je de huidige vaartocht nu stoppen en in het logboek opslaan?',
          yes:'Stoppen en opslaan',
          no:'Annuleren',
          danger:true
        });

        if(!stopAndSave){
          rearmForTenMinutes();
          window.showAppToast?.('Opname blijft actief.');
          return false;
        }

        snoozeUntil=0;
        return await original.call(this,{
          ...options,
          automatic:false,
          manualArrival:true,
          confirmedAutoStop:true
        });
      }finally{
        promptOpen=false;
      }
    };

    return true;
  }

  if(!install()){
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      if(install()||attempts>=30)clearInterval(timer);
    },500);
  }
})();
