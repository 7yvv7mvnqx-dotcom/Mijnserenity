/* MijnSerenity 8.27.2 — antwoordballon blijft staan tot nieuwe vraag of wissen. */
(()=>{
  'use strict';
  if(window.__msSerenityAiPersist8272)return;
  window.__msSerenityAiPersist8272=true;

  const FORM='msQuickAsk8267';
  const RESULT='msQuickAskResult8267';
  const CLEAR='ms8271Clear';
  const INPUT='msQuickAskInput8267';

  let observer=null;
  let resultObserver=null;
  let lastAnswerHtml='';
  let questionActive=false;
  let allowClear=false;
  let restoring=false;

  function resultEl(){return document.getElementById(RESULT)}

  function hasFinalAnswer(el){
    if(!el)return false;
    if(!el.classList.contains('show'))return false;
    if(el.classList.contains('thinking'))return false;
    return !!String(el.textContent||'').trim();
  }

  function rememberFinalAnswer(){
    const el=resultEl();
    if(!el||restoring)return;

    if(hasFinalAnswer(el)){
      lastAnswerHtml=el.innerHTML;
      questionActive=false;
      allowClear=false;
      return;
    }

    if(questionActive||allowClear||!lastAnswerHtml)return;

    /* Een antwoord mag niet door een timer/re-render verdwijnen. */
    if(!el.classList.contains('show')||!String(el.textContent||'').trim()){
      restoring=true;
      el.innerHTML=lastAnswerHtml;
      el.classList.remove('thinking');
      el.classList.add('show');
      restoring=false;
    }
  }

  function watchResult(){
    const el=resultEl();
    if(!el)return;
    resultObserver?.disconnect();
    resultObserver=new MutationObserver(()=>queueMicrotask(rememberFinalAnswer));
    resultObserver.observe(el,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
    rememberFinalAnswer();
  }

  function beginNewQuestion(){
    const input=document.getElementById(INPUT);
    const query=String(input?.value||'').trim();
    if(query.length<2)return;

    questionActive=true;
    allowClear=true;
    lastAnswerHtml='';

    const el=resultEl();
    if(el){
      el.textContent='';
      el.classList.remove('show','thinking');
    }
  }

  function clearAnswerState(){
    allowClear=true;
    questionActive=false;
    lastAnswerHtml='';
  }

  function bind(){
    const form=document.getElementById(FORM);
    if(!form)return false;
    if(form.dataset.msPersist8272==='1'){
      watchResult();
      return true;
    }
    form.dataset.msPersist8272='1';

    /* Capture: wis de vorige ballon direct zodra echt een nieuwe vraag wordt verstuurd. */
    form.addEventListener('submit',beginNewQuestion,true);

    document.getElementById(CLEAR)?.addEventListener('click',clearAnswerState,true);
    watchResult();
    return true;
  }

  function boot(){
    bind();
    observer?.disconnect();
    observer=new MutationObserver(()=>bind());
    observer.observe(document.body,{childList:true,subtree:true});
  }

  window.ms8272KeepSerenityAnswer=bind;

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  window.addEventListener('pageshow',()=>setTimeout(bind,50),{passive:true});
  window.addEventListener('mijnserenity:dashboard-ready',()=>setTimeout(bind,50),{passive:true});
})();
