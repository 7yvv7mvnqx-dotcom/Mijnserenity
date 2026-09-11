/* MijnSerenity 8.24.0 — documentscanner + betrouwbare bon-OCR
   - Camera scant als document: duidelijke scanweergave, uitsnijden en verbeteren.
   - OCR gebruikt Nederlands + Engels en controleert een tweede beeldvariant.
   - Velden worden alleen automatisch ingevuld wanneer de waarde betrouwbaar is.
*/
(()=>{
  'use strict';
  if(window.__msReceiptOcrFix8240)return;
  window.__msReceiptOcrFix8240=true;

  const LIBRARY_TIMEOUT=15000;
  const PREPARE_TIMEOUT=12000;
  const WORKER_TIMEOUT=30000;
  const RECOGNIZE_TIMEOUT=38000;
  const MAX_OCR_SIDE=2600;
  let installed=false;
  let running=false;
  let activeWorker=null;
  let scannerStream=null;

  function $(id){return document.getElementById(id)}

  function setStatus(message,isError=false){
    if(typeof window.setCostOcrStatus==='function'){
      window.setCostOcrStatus(message,isError);
      return;
    }
    const target=$('costOcrStatus');
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

  function canvasToBlob(canvas,quality=.94){
    return new Promise((resolve,reject)=>canvas.toBlob(
      blob=>blob?resolve(blob):reject(new Error('Scan kon niet worden verwerkt.')),
      'image/jpeg',
      quality
    ));
  }

  function clamp(value,min,max){return Math.min(max,Math.max(min,value))}

  function percentile(hist,total,p){
    const target=total*p;
    let acc=0;
    for(let i=0;i<hist.length;i++){
      acc+=hist[i];
      if(acc>=target)return i;
    }
    return 255;
  }

  function otsuThreshold(gray){
    const hist=new Uint32Array(256);
    for(let i=0;i<gray.length;i++)hist[gray[i]]++;
    const total=gray.length;
    let sum=0;
    for(let i=0;i<256;i++)sum+=i*hist[i];
    let sumB=0,wB=0,best=127,maxBetween=-1;
    for(let t=0;t<256;t++){
      wB+=hist[t];
      if(!wB)continue;
      const wF=total-wB;
      if(!wF)break;
      sumB+=t*hist[t];
      const mB=sumB/wB;
      const mF=(sum-sumB)/wF;
      const between=wB*wF*(mB-mF)*(mB-mF);
      if(between>maxBetween){maxBetween=between;best=t}
    }
    return best;
  }

  function detectDocumentBounds(canvas){
    const max=520;
    const scale=Math.min(1,max/Math.max(canvas.width,canvas.height));
    const w=Math.max(1,Math.round(canvas.width*scale));
    const h=Math.max(1,Math.round(canvas.height*scale));
    const probe=document.createElement('canvas');
    probe.width=w;probe.height=h;
    const ctx=probe.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(canvas,0,0,w,h);
    const data=ctx.getImageData(0,0,w,h).data;
    const gray=new Uint8Array(w*h);
    let k=0;
    for(let i=0;i<data.length;i+=4){
      gray[k++]=Math.round(.299*data[i]+.587*data[i+1]+.114*data[i+2]);
    }

    const border=[];
    const step=Math.max(1,Math.floor(Math.min(w,h)/80));
    for(let x=0;x<w;x+=step){border.push(gray[x],gray[(h-1)*w+x])}
    for(let y=0;y<h;y+=step){border.push(gray[y*w],gray[y*w+w-1])}
    border.sort((a,b)=>a-b);
    const bg=border[Math.floor(border.length/2)]||128;
    const brightPaper=bg<185;
    const rowCount=new Uint32Array(h);
    const colCount=new Uint32Array(w);
    const delta=brightPaper?Math.max(22,(210-bg)*.28):32;

    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const lum=gray[y*w+x];
        const candidate=brightPaper?lum>bg+delta:Math.abs(lum-bg)>delta;
        if(candidate){rowCount[y]++;colCount[x]++}
      }
    }

    const rowMin=Math.max(8,Math.floor(w*.18));
    const colMin=Math.max(8,Math.floor(h*.18));
    let top=0,bottom=h-1,left=0,right=w-1;
    while(top<h-1&&rowCount[top]<rowMin)top++;
    while(bottom>top&&rowCount[bottom]<rowMin)bottom--;
    while(left<w-1&&colCount[left]<colMin)left++;
    while(right>left&&colCount[right]<colMin)right--;

    const width=right-left+1;
    const height=bottom-top+1;
    const area=(width*height)/(w*h);
    const centered=Math.abs((left+right)/2-w/2)<w*.28&&Math.abs((top+bottom)/2-h/2)<h*.3;
    if(area<.22||area>.97||width<w*.38||height<h*.35||!centered){
      return {x:0,y:0,width:canvas.width,height:canvas.height,detected:false};
    }

    const padX=Math.round(width*.035);
    const padY=Math.round(height*.025);
    left=clamp(left-padX,0,w-1);
    right=clamp(right+padX,left+1,w-1);
    top=clamp(top-padY,0,h-1);
    bottom=clamp(bottom+padY,top+1,h-1);
    return {
      x:Math.round(left/scale),
      y:Math.round(top/scale),
      width:Math.round((right-left+1)/scale),
      height:Math.round((bottom-top+1)/scale),
      detected:true
    };
  }

  async function prepareDocumentImage(blob){
    const image=await imageFromBlob(blob);
    const sourceW=Number(image.width||image.naturalWidth||0);
    const sourceH=Number(image.height||image.naturalHeight||0);
    if(!sourceW||!sourceH)throw new Error('Afmetingen van bonfoto ontbreken.');

    const source=document.createElement('canvas');
    source.width=sourceW;source.height=sourceH;
    const sctx=source.getContext('2d',{alpha:false,willReadFrequently:true});
    sctx.fillStyle='#fff';sctx.fillRect(0,0,sourceW,sourceH);
    sctx.drawImage(image,0,0,sourceW,sourceH);
    try{image.close?.()}catch{}

    const bounds=detectDocumentBounds(source);
    const scale=Math.min(2,MAX_OCR_SIDE/Math.max(bounds.width,bounds.height));
    const outW=Math.max(900,Math.round(bounds.width*scale));
    const outH=Math.max(900,Math.round(bounds.height*scale));
    const soft=document.createElement('canvas');
    soft.width=outW;soft.height=outH;
    const ctx=soft.getContext('2d',{alpha:false,willReadFrequently:true});
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality='high';
    ctx.fillStyle='#fff';ctx.fillRect(0,0,outW,outH);
    ctx.drawImage(source,bounds.x,bounds.y,bounds.width,bounds.height,0,0,outW,outH);

    const imageData=ctx.getImageData(0,0,outW,outH);
    const d=imageData.data;
    const hist=new Uint32Array(256);
    const gray=new Uint8Array(outW*outH);
    for(let i=0,j=0;i<d.length;i+=4,j++){
      const g=Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]);
      gray[j]=g;hist[g]++;
    }
    const lo=percentile(hist,gray.length,.025);
    const hi=Math.max(lo+24,percentile(hist,gray.length,.985));
    const gain=255/(hi-lo);
    for(let i=0,j=0;i<d.length;i+=4,j++){
      const g=clamp(Math.round((gray[j]-lo)*gain),0,255);
      d[i]=d[i+1]=d[i+2]=g;
    }
    ctx.putImageData(imageData,0,0);

    const binary=document.createElement('canvas');
    binary.width=outW;binary.height=outH;
    const bctx=binary.getContext('2d',{alpha:false,willReadFrequently:true});
    const bdata=ctx.getImageData(0,0,outW,outH);
    const bd=bdata.data;
    const enhancedGray=new Uint8Array(outW*outH);
    for(let i=0,j=0;i<bd.length;i+=4,j++)enhancedGray[j]=bd[i];
    const threshold=clamp(otsuThreshold(enhancedGray)+12,110,220);
    for(let i=0;i<bd.length;i+=4){
      const value=bd[i]<threshold?0:255;
      bd[i]=bd[i+1]=bd[i+2]=value;
      bd[i+3]=255;
    }
    bctx.putImageData(bdata,0,0);

    return {
      soft:await canvasToBlob(soft,.95),
      binary:await canvasToBlob(binary,.93),
      detected:bounds.detected
    };
  }

  function merchantLooksGarbled(value){
    const text=String(value||'').replace(/\s+/g,' ').trim();
    if(!text)return true;
    if(text.length<2||text.length>90)return true;
    if(/(?:[A-Za-z]\d|\d[A-Za-z])/.test(text)&&((text.match(/(?:[A-Za-z]\d|\d[A-Za-z])/g)||[]).length>=2))return true;
    const chars=text.replace(/\s/g,'');
    const digits=(chars.match(/\d/g)||[]).length;
    const letters=(chars.match(/[A-Za-zÀ-ÿ]/g)||[]).length;
    if(letters<2)return true;
    if(digits/Math.max(1,chars.length)>.16)return true;
    const words=text.split(/\s+/).filter(Boolean);
    const suspicious=words.filter(word=>word.length>=6&&/\d/.test(word)&&/[A-Za-z]/.test(word));
    if(suspicious.length)return true;
    if(/^[A-Z]{1,2}\s+[A-Z]{5,}\s+[A-Z]{3,}/.test(text)&&words.length<=5)return true;
    return false;
  }

  function structuredQuality(text){
    const value=String(text||'').trim();
    if(!value)return {score:0,parsed:null};
    let parsed=null;
    try{parsed=window.MSReceiptReaderPro?.parseReceiptText?.(value)||null}catch{}
    let score=Math.min(32,value.length/10);
    if(/(?:€\s*)?\d{1,6}[,.]\d{2}/.test(value))score+=18;
    if(/\b(?:totaal|total|te betalen|bedrag|factuur|bon|receipt)\b/i.test(value))score+=12;
    if(/\b(?:20\d{2}|\d{1,2}[-/.]\d{1,2}[-/.](?:20)?\d{2})\b/.test(value))score+=8;
    if(parsed?.amount!==null&&parsed?.amount!==undefined)score+=26;
    if(parsed?.date)score+=18;
    if(parsed?.merchant&&!merchantLooksGarbled(parsed.merchant))score+=20;
    if(parsed?.summary&&!parsed?.review?.description)score+=16;
    if(parsed?.review?.amount)score-=10;
    if(parsed?.review?.merchant)score-=8;
    return {score,parsed};
  }

  function cleanDescription(parsed){
    const summary=String(parsed?.summary||'').replace(/\s+/g,' ').trim();
    const merchant=String(parsed?.merchant||'').replace(/\s+/g,' ').trim();
    if(summary&&!parsed?.review?.description&&!merchantLooksGarbled(summary))return summary;
    if(merchant&&!parsed?.review?.merchant&&!merchantLooksGarbled(merchant))return merchant;
    return '';
  }

  function applyStructuredResult(text){
    const reader=window.MSReceiptReaderPro;
    const parsed=reader?.parseReceiptText?.(text);
    if(!parsed){
      if(typeof window.applyReceiptOcrResult==='function')window.applyReceiptOcrResult(text);
      return;
    }

    const amount=$('costAmount');
    const date=$('costDate');
    const category=$('costCategory');
    const description=$('costDescription');
    const details=$('costReceiptDetails');
    const detailsWrap=$('costReceiptDetailsWrap');
    const found=[];
    const review=[];

    if(parsed.amount!==null&&parsed.amount!==undefined&&!parsed.review?.amount&&amount){
      amount.value=Number(parsed.amount).toFixed(2);
      found.push(`bedrag €${Number(parsed.amount).toFixed(2).replace('.',',')}`);
    }else if(parsed.amount!==null&&parsed.amount!==undefined){
      review.push('bedrag');
    }

    if(parsed.date&&date){
      date.value=parsed.date;
      found.push(`datum ${parsed.date.split('-').reverse().join('-')}`);
    }else review.push('datum');

    const safeDescription=cleanDescription(parsed);
    if(safeDescription&&description){
      description.value=safeDescription;
      found.push(`omschrijving ${safeDescription}`);
    }else review.push('leverancier/omschrijving');

    if(parsed.category&&category&&!parsed.review?.category){
      const exists=[...category.options].some(option=>option.value===parsed.category);
      if(!exists){
        const option=document.createElement('option');
        option.value=parsed.category;option.textContent=parsed.category;
        category.appendChild(option);
      }
      category.value=parsed.category;
      found.push(`categorie ${parsed.category}`);
    }

    let detailText=String(parsed.details||'').trim();
    const safeMerchant=(!parsed.review?.merchant&&!merchantLooksGarbled(parsed.merchant))?String(parsed.merchant||'').trim():'';
    if(safeMerchant&&!/^leverancier\s*:/im.test(detailText)){
      detailText=`Leverancier: ${safeMerchant}${detailText?`\n${detailText}`:''}`;
    }
    if(details){
      details.value=detailText;
      detailsWrap?.classList.toggle('hidden',!detailText);
    }

    const status=found.length
      ?`Gevonden: ${found.join(' · ')}${review.length?`. Controleer nog: ${[...new Set(review)].join(', ')}.`:'.'}`
      :'De bon is gelezen, maar de velden zijn niet betrouwbaar genoeg om automatisch in te vullen. Controleer de scan.';
    setStatus(status,!found.length);
    window.dispatchEvent(new CustomEvent('mijnserenity:receipt-parsed',{detail:{parsed,text}}));
  }

  function updateRetryState(busy){
    const button=$('costOcrRetryButton');
    if(!button)return;
    button.disabled=Boolean(busy);
    button.setAttribute('aria-busy',busy?'true':'false');
    if(busy)button.dataset.msReceiptBusy='1';
    else delete button.dataset.msReceiptBusy;
  }

  async function terminateWorker(worker){
    if(!worker)return;
    try{await withTimeout(worker.terminate(),3000,'OCR stoppen duurde te lang.')}catch{}
  }

  async function scanImage(file){
    if(!file?.type?.startsWith('image/'))throw new Error('Dit bestand is geen foto.');
    if(running)return;

    running=true;
    setLegacyRunning(true);
    updateRetryState(true);
    setStatus('Bon als document voorbereiden…');
    let worker=null;

    try{
      const Tesseract=window.Tesseract||await withTimeout(
        window.loadReceiptOcrLibrary(),
        LIBRARY_TIMEOUT,
        'OCR kon niet op tijd worden geladen.'
      );

      const prepared=await withTimeout(
        prepareDocumentImage(file),
        PREPARE_TIMEOUT,
        'De documentscan voorbereiden duurde te lang.'
      );

      setStatus(prepared.detected?'Bon automatisch uitgesneden…':'Bon verbeteren…');
      worker=await withTimeout(
        Tesseract.createWorker('nld+eng',1,{
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

      await withTimeout(worker.setParameters({
        tessedit_pageseg_mode:'6',
        preserve_interword_spaces:'1',
        user_defined_dpi:'300'
      }),6000,'OCR-instellingen konden niet worden toegepast.');

      const first=await withTimeout(
        worker.recognize(prepared.soft),
        RECOGNIZE_TIMEOUT,
        'Bon lezen duurde te lang.'
      );
      let bestText=String(first?.data?.text||'').trim();
      let quality=structuredQuality(bestText);

      const incomplete=!quality.parsed||quality.parsed.review?.amount||quality.parsed.review?.date||quality.parsed.review?.description||quality.score<105;
      if(incomplete){
        setStatus('Bon extra controleren…');
        try{
          await withTimeout(worker.setParameters({
            tessedit_pageseg_mode:'4',
            preserve_interword_spaces:'1',
            user_defined_dpi:'300'
          }),5000,'OCR-instellingen konden niet worden aangepast.');
          const second=await withTimeout(
            worker.recognize(prepared.binary),
            24000,
            'Extra boncontrole duurde te lang.'
          );
          const secondText=String(second?.data?.text||'').trim();
          const secondQuality=structuredQuality(secondText);
          if(secondQuality.score>quality.score){
            bestText=secondText;
            quality=secondQuality;
          }
        }catch(error){
          console.warn('Tweede OCR-pass overgeslagen:',error);
        }
      }

      if(!bestText||quality.score<24){
        throw new Error('Er is onvoldoende leesbare tekst gevonden.');
      }
      applyStructuredResult(bestText);
    }catch(error){
      console.error('Documentscan/OCR mislukt:',error);
      const timeout=/duurde te lang|niet op tijd/i.test(String(error?.message||''));
      setStatus(
        timeout
          ?'Bon lezen duurde te lang. Probeer opnieuw en leg de bon vlak, goed verlicht en volledig in beeld.'
          :'Bon kon niet betrouwbaar worden gelezen. Leg de bon vlak en volledig binnen het kader en scan opnieuw.',
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

  function stopScannerStream(){
    const stream=scannerStream;
    scannerStream=null;
    try{stream?.getTracks?.().forEach(track=>track.stop())}catch{}
  }

  function removeScanner(){
    stopScannerStream();
    document.getElementById('msReceiptDocumentScanner')?.remove();
  }

  function scannerStyles(){
    if(document.getElementById('msReceiptDocumentScannerStyle'))return;
    const style=document.createElement('style');
    style.id='msReceiptDocumentScannerStyle';
    style.textContent=`
      #msReceiptDocumentScanner{position:fixed;inset:0;z-index:999999;background:#020b12;color:#fff;display:flex;flex-direction:column;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);font-family:inherit}
      #msReceiptDocumentScanner .ms-scan-top{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;font-weight:800}
      #msReceiptDocumentScanner .ms-scan-top button{background:transparent;border:0;color:#fff;font:inherit;padding:10px}
      #msReceiptDocumentScanner .ms-scan-stage{position:relative;flex:1;min-height:0;overflow:hidden;background:#000}
      #msReceiptDocumentScanner video{width:100%;height:100%;object-fit:cover;display:block}
      #msReceiptDocumentScanner .ms-scan-guide{position:absolute;left:7%;right:7%;top:7%;bottom:7%;border:3px solid #f5b800;border-radius:18px;box-shadow:0 0 0 9999px rgba(0,0,0,.25);pointer-events:none}
      #msReceiptDocumentScanner .ms-scan-guide:before,#msReceiptDocumentScanner .ms-scan-guide:after{content:'';position:absolute;left:18%;right:18%;height:2px;background:rgba(255,255,255,.35)}
      #msReceiptDocumentScanner .ms-scan-guide:before{top:33%}#msReceiptDocumentScanner .ms-scan-guide:after{bottom:33%}
      #msReceiptDocumentScanner .ms-scan-help{position:absolute;left:9%;right:9%;bottom:3%;text-align:center;background:rgba(0,0,0,.66);padding:9px 12px;border-radius:12px;font-size:14px}
      #msReceiptDocumentScanner .ms-scan-controls{display:flex;align-items:center;justify-content:center;padding:18px 16px 22px;background:#020b12}
      #msReceiptDocumentScanner .ms-scan-shutter{width:74px;height:74px;border-radius:50%;border:6px solid #fff;background:#42c6ee;box-shadow:inset 0 0 0 4px #020b12}
      #msReceiptDocumentScanner .ms-scan-fallback{max-width:86%;margin:auto;text-align:center;line-height:1.45}
      #msReceiptDocumentScanner .ms-scan-fallback button{margin-top:16px;padding:13px 18px;border:0;border-radius:12px;font:inherit;font-weight:800}
    `;
    document.head.appendChild(style);
  }

  async function captureScannerFrame(video){
    const width=Number(video.videoWidth||0);
    const height=Number(video.videoHeight||0);
    if(!width||!height)throw new Error('Camera is nog niet klaar.');
    const canvas=document.createElement('canvas');
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d',{alpha:false});
    ctx.drawImage(video,0,0,width,height);
    return canvasToBlob(canvas,.97);
  }

  async function openDocumentScanner(){
    scannerStyles();
    removeScanner();
    const overlay=document.createElement('div');
    overlay.id='msReceiptDocumentScanner';
    overlay.innerHTML=`
      <div class="ms-scan-top"><button type="button" data-action="cancel">Annuleren</button><span>Scan bon als document</span><span style="width:72px"></span></div>
      <div class="ms-scan-stage"><video playsinline autoplay muted></video><div class="ms-scan-guide"></div><div class="ms-scan-help">Leg de bon vlak, volledig binnen het gele kader en zorg voor gelijkmatig licht.</div></div>
      <div class="ms-scan-controls"><button type="button" class="ms-scan-shutter" aria-label="Scan maken"></button></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="cancel"]').addEventListener('click',removeScanner);

    try{
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera niet beschikbaar in deze weergave.');
      scannerStream=await navigator.mediaDevices.getUserMedia({
        audio:false,
        video:{facingMode:{ideal:'environment'},width:{ideal:2560},height:{ideal:1920}}
      });
      const video=overlay.querySelector('video');
      video.srcObject=scannerStream;
      await video.play();
      overlay.querySelector('.ms-scan-shutter').addEventListener('click',async()=>{
        const shutter=overlay.querySelector('.ms-scan-shutter');
        shutter.disabled=true;
        try{
          const blob=await captureScannerFrame(video);
          const file=new File([blob],`bon-${new Date().toISOString().replace(/[:.]/g,'-')}.jpg`,{type:'image/jpeg'});
          removeScanner();
          if(typeof window.addCostReceiptFiles==='function')window.addCostReceiptFiles([file]);
        }catch(error){
          shutter.disabled=false;
          setStatus(error?.message||'Scan maken mislukt.',true);
        }
      });
    }catch(error){
      stopScannerStream();
      const stage=overlay.querySelector('.ms-scan-stage');
      stage.innerHTML=`<div class="ms-scan-fallback"><strong>Documentscanner kan de camera hier niet rechtstreeks openen.</strong><br>Gebruik de iPhone-camera; de foto wordt daarna automatisch uitgesneden en verbeterd.<br><button type="button" data-action="fallback">Open camera</button></div>`;
      overlay.querySelector('.ms-scan-controls')?.remove();
      stage.querySelector('[data-action="fallback"]').addEventListener('click',()=>{
        removeScanner();
        const input=$('costReceiptCamera');
        if(input){
          input.dataset.msAllowNativePicker='1';
          input.click();
          setTimeout(()=>delete input.dataset.msAllowNativePicker,1000);
        }
      });
    }
  }

  function hookDocumentScannerButton(){
    const input=$('costReceiptCamera');
    if(!input||input.dataset.msDocumentScanner==='1')return;
    input.dataset.msDocumentScanner='1';
    input.addEventListener('click',event=>{
      if(input.dataset.msAllowNativePicker==='1')return;
      if(navigator.mediaDevices?.getUserMedia){
        event.preventDefault();
        openDocumentScanner().catch(error=>{
          console.error('Documentscanner openen mislukt:',error);
          setStatus('Documentscanner kon niet worden geopend.',true);
        });
      }
    });
    const label=input.closest('label');
    if(label){
      const textNodes=[...label.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE);
      const first=textNodes.find(node=>String(node.textContent||'').trim());
      if(first)first.textContent=' 📄 Scan document ';
    }
  }

  function install(){
    if(installed)return true;
    if(typeof window.addCostReceiptFiles!=='function'||
       typeof window.scanCostReceipt!=='function'||
       typeof window.loadReceiptOcrLibrary!=='function'||
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
      try{originalAdd.call(this,fileList)}finally{setLegacyRunning(false)}
      const added=pendingFiles().find(file=>!before.has(file));
      if(!added)return;
      queueMicrotask(()=>{
        if(added.type?.startsWith('image/'))scanImage(added);
        else originalScan(added);
      });
    };

    hookDocumentScannerButton();
    const retry=$('costOcrRetryButton');
    if(retry)retry.textContent='✨ Gegevens opnieuw uit foto/PDF lezen';
    console.info('MijnSerenity 8.24.0 documentscanner + bon-OCR actief.');
    return true;
  }

  function waitForRuntime(attempt=0){
    if(install())return;
    if(attempt>=240){
      console.warn('Bon-OCR herstel kon niet worden gekoppeld: runtime niet beschikbaar.');
      return;
    }
    setTimeout(()=>waitForRuntime(attempt+1),100);
  }

  window.addEventListener('pagehide',()=>{terminateWorker(activeWorker);removeScanner()},{once:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>waitForRuntime(),{once:true});
  else waitForRuntime();
})();
