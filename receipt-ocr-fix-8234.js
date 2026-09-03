/* MijnSerenity 8.23.4 — iPad/iPhone bon-OCR herstel
   Voorkomt eindeloos "Bon lezen…", verwerkt liggende bonnen rechtop en
   gebruikt één snelle OCR-pass met alleen een tweede pass wanneer dat nodig is. */
(()=>{
  'use strict';
  if(window.__msReceiptOcrFix8234)return;
  window.__msReceiptOcrFix8234=true;

  const LIBRARY_TIMEOUT=12000;
  const PREPARE_TIMEOUT=10000;
  const WORKER_TIMEOUT=25000;
  const RECOGNIZE_TIMEOUT=30000;
  let installed=false;
  let running=false;
  let activeWorker=null;

  function setStatus(message,isError=false){
    if(typeof window.setCostOcrStatus==='function'){
      window.setCostOcrStatus(message,isError);
      return;
    }
    const target=document.getElementById('costOcrStatus');
    if(!target)return;
    target.textContent=message||'';
    target.classList.toggle('hidden',!message);
    target.classList.toggle('receipt-ocr-error',Boolean(isError));
  }

  function setLegacyRunning(value){
    try{receiptOcrRunning=Boolean(value)}catch{}
  }

  function pendingFiles(){
    try{return [...pendingCostReceiptFiles]}catch{return []}
  }

  function withTimeout(promise,timeout,message){
    let timer=0;
    return Promise.race([
      Promise.resolve(promise).finally(()=>clearTimeout(timer)),
      new Promise((_,reject)=>{
        timer=setTimeout(()=>reject(new Error(message)),timeout);
      })
    ]);
  }

  async function imageFromBlob(blob){
    if(typeof createImageBitmap==='function'){
      try{return await createImageBitmap(blob,{imageOrientation:'from-image'})}
      catch{
        try{return await createImageBitmap(blob)}catch{}
      }
    }
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(blob);
      const image=new Image();
      image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};
      image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Bonfoto kon niet worden geopend.'))};
      image.src=url;
    });
  }

  async function rotateLandscapeBlob(blob){
    if(!blob)return blob;
    const image=await imageFromBlob(blob);
    const width=Number(image.width||image.naturalWidth||0);
    const height=Number(image.height||image.naturalHeight||0);
    if(!width||!height||width<=height*1.12){
      try{image.close?.()}catch{}
      return blob;
    }

    const canvas=document.createElement('canvas');
    canvas.width=height;
    canvas.height=width;
    const context=canvas.getContext('2d',{alpha:false});
    context.fillStyle='#fff';
    context.fillRect(0,0,canvas.width,canvas.height);
    context.translate(canvas.width/2,canvas.height/2);
    context.rotate(Math.PI/2);
    context.drawImage(image,-width/2,-height/2,width,height);
    try{image.close?.()}catch{}

    return new Promise((resolve,reject)=>canvas.toBlob(
      result=>result?resolve(result):reject(new Error('Bonfoto kon niet worden gedraaid.')),
      'image/jpeg',
      .92
    ));
  }

  function receiptQuality(text){
    const value=String(text||'').trim();
    if(!value)return 0;
    let score=Math.min(40,value.length/8);
    if(/(?:€\s*)?\d{1,6}[,.]\d{2}/.test(value))score+=28;
    if(/\b(?:totaal|total|te betalen|bedrag|factuur|bon|receipt)\b/i.test(value))score+=16;
    if(/\b(?:20\d{2}|\d{1,2}[-/.]\d{1,2}[-/.](?:20)?\d{2})\b/.test(value))score+=10;
    try{
      const parsed=window.MSReceiptReaderPro?.parseReceiptText?.(value);
      if(parsed?.amount!==null&&parsed?.amount!==undefined)score+=24;
      if(parsed?.date)score+=12;
      if(parsed?.merchant)score+=8;
    }catch{}
    return score;
  }

  function updateRetryState(busy){
    const button=document.getElementById('costOcrRetryButton');
    if(!button)return;
    button.disabled=Boolean(busy);
    button.setAttribute('aria-busy',busy?'true':'false');
    if(busy)button.dataset.msReceiptBusy='1';
    else delete button.dataset.msReceiptBusy;
  }

  async function terminateWorker(worker){
    if(!worker)return;
    try{await withTimeout(worker.terminate(),2500,'OCR stoppen duurde te lang.')}catch{}
  }

  async function scanImage(file){
    if(!file?.type?.startsWith('image/'))throw new Error('Dit bestand is geen foto.');
    if(running)return;

    running=true;
    setLegacyRunning(true);
    updateRetryState(true);
    setStatus('Bon voorbereiden…');
    let worker=null;

    try{
      const Tesseract=window.Tesseract||await withTimeout(
        window.loadReceiptOcrLibrary(),
        LIBRARY_TIMEOUT,
        'OCR kon niet op tijd worden geladen.'
      );

      const prepared=await withTimeout(
        window.prepareReceiptImageForOcr(file),
        PREPARE_TIMEOUT,
        'De bonfoto voorbereiden duurde te lang.'
      );

      setStatus('Bon rechtzetten…');
      const soft=await withTimeout(
        rotateLandscapeBlob(prepared?.soft||file),
        PREPARE_TIMEOUT,
        'De bonfoto rechtzetten duurde te lang.'
      );
      const binary=await withTimeout(
        rotateLandscapeBlob(prepared?.binary||file),
        PREPARE_TIMEOUT,
        'De bonfoto rechtzetten duurde te lang.'
      );

      setStatus('OCR starten…');
      worker=await withTimeout(
        Tesseract.createWorker('nld',1,{
          logger:message=>{
            if(message?.status==='recognizing text'){
              const pct=Math.max(0,Math.min(100,Math.round(Number(message.progress||0)*100)));
              setStatus(`Bon lezen… ${pct}%`);
            }else if(message?.status){
              setStatus('OCR voorbereiden…');
            }
          }
        }),
        WORKER_TIMEOUT,
        'OCR starten duurde te lang.'
      );
      activeWorker=worker;

      await withTimeout(
        worker.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'}),
        6000,
        'OCR-instellingen konden niet worden toegepast.'
      );

      setStatus('Bon lezen… 0%');
      const first=await withTimeout(
        worker.recognize(soft),
        RECOGNIZE_TIMEOUT,
        'Bon lezen duurde te lang.'
      );
      let bestText=String(first?.data?.text||'').trim();
      let bestScore=receiptQuality(bestText);

      if(bestScore<72){
        setStatus('Bon extra controleren…');
        try{
          const second=await withTimeout(
            worker.recognize(binary),
            18000,
            'Extra boncontrole duurde te lang.'
          );
          const secondText=String(second?.data?.text||'').trim();
          const secondScore=receiptQuality(secondText);
          if(secondScore>bestScore){
            bestText=secondText;
            bestScore=secondScore;
          }
        }catch(error){
          console.warn('Tweede OCR-pass overgeslagen:',error);
        }
      }

      if(!bestText||bestScore<20){
        throw new Error('Er is onvoldoende leesbare tekst gevonden.');
      }

      if(typeof window.applyReceiptOcrResult!=='function'){
        throw new Error('Bonverwerking is nog niet beschikbaar.');
      }
      window.applyReceiptOcrResult(bestText);
    }catch(error){
      console.error('Snelle bon-OCR mislukt:',error);
      const timeout=/duurde te lang|niet op tijd/i.test(String(error?.message||''));
      setStatus(
        timeout
          ?'Bon lezen duurde te lang. Tik op “Gegevens opnieuw uit foto/PDF lezen” om opnieuw te proberen.'
          :'Bon kon niet automatisch worden gelezen. De foto blijft toegevoegd; vul de gegevens handmatig in of probeer opnieuw.',
        true
      );
    }finally{
      activeWorker=null;
      await terminateWorker(worker);
      setLegacyRunning(false);
      updateRetryState(false);
      running=false;
    }
  }

  function install(){
    if(installed)return true;
    if(typeof window.addCostReceiptFiles!=='function'||
       typeof window.scanCostReceipt!=='function'||
       typeof window.loadReceiptOcrLibrary!=='function'||
       typeof window.prepareReceiptImageForOcr!=='function'||
       !window.MSReceiptReaderPro)return false;

    installed=true;
    const originalAdd=window.addCostReceiptFiles;
    const originalScan=window.scanCostReceipt;

    window.scanCostReceipt=function(file){
      if(file?.type?.startsWith('image/'))return scanImage(file);
      return originalScan(file);
    };

    window.scanFirstPendingCostReceipt=function(){
      const file=pendingFiles().find(item=>
        item?.type?.startsWith('image/')||
        item?.type==='application/pdf'||
        /\.pdf$/i.test(item?.name||'')
      );
      if(!file){
        setStatus('Voeg eerst een foto of PDF toe.',true);
        return;
      }
      return file.type?.startsWith('image/')?scanImage(file):originalScan(file);
    };

    window.addCostReceiptFiles=function(fileList){
      const before=new Set(pendingFiles());
      setLegacyRunning(true);
      try{
        originalAdd.call(this,fileList);
      }finally{
        setLegacyRunning(false);
      }

      const added=pendingFiles().find(file=>!before.has(file));
      if(!added)return;
      queueMicrotask(()=>{
        if(added.type?.startsWith('image/'))scanImage(added);
        else originalScan(added);
      });
    };

    const retry=document.getElementById('costOcrRetryButton');
    if(retry)retry.textContent='✨ Gegevens opnieuw uit foto/PDF lezen';
    console.info('MijnSerenity 8.23.4 bon-OCR herstel actief.');
    return true;
  }

  function waitForRuntime(attempt=0){
    if(install())return;
    if(attempt>=200){
      console.warn('Bon-OCR herstel kon niet worden gekoppeld: runtime niet beschikbaar.');
      return;
    }
    setTimeout(()=>waitForRuntime(attempt+1),100);
  }

  window.addEventListener('pagehide',()=>terminateWorker(activeWorker),{once:true});
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>waitForRuntime(),{once:true});
  }else{
    waitForRuntime();
  }
})();
