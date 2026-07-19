/* MijnSerenity 7.4.4 — PDF & Receipt Reader Pro */
(()=>{
  'use strict';

  const PDFJS_VERSION='3.11.174';
  const PDFJS_URL=`https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.js`;
  const PDFJS_WORKER_URL=`https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;
  let pdfLibraryPromise=null;

  const original={
    scanCostReceipt:window.scanCostReceipt,
    extractReceiptAmount:window.extractReceiptAmount,
    extractReceiptDate:window.extractReceiptDate,
    extractReceiptMerchant:window.extractReceiptMerchant,
    detectReceiptCategory:window.detectReceiptCategory,
    extractReceiptItems:window.extractReceiptItems,
    buildReceiptDetails:window.buildReceiptDetails,
    renderReadOnlyCostReceipts:window.renderReadOnlyCostReceipts
  };

  function isImage(file){
    return Boolean(file?.type?.startsWith('image/'));
  }

  function isPdf(file){
    return file?.type==='application/pdf'||/\.pdf$/i.test(file?.name||'');
  }

  function normalizeDocumentText(value){
    return String(value||'')
      .replace(/V\s*O\s*L\s*V\s*O\s+P\s*E\s*N\s*T\s*A/gi,'VOLVO PENTA')
      .replace(/O\s*[-–—]?\s*ring/gi,'O-ring')
      .replace(/€\s+(?=\d)/g,'€')
      .replace(/[\u00a0\t]+/g,' ')
      .replace(/ {2,}/g,' ')
      .replace(/\r/g,'')
      .trim();
  }

  function lines(value){
    return normalizeDocumentText(value)
      .split('\n')
      .map(line=>line.replace(/\s+/g,' ').trim())
      .filter(Boolean);
  }

  function parseMoney(raw){
    let value=String(raw||'')
      .replace(/[€$£]/g,'')
      .replace(/\s/g,'')
      .trim();
    if(!value)return null;

    const comma=value.lastIndexOf(',');
    const dot=value.lastIndexOf('.');
    if(comma>-1&&dot>-1){
      value=comma>dot
        ?value.replace(/\./g,'').replace(',','.')
        :value.replace(/,/g,'');
    }else if(comma>-1){
      value=value.replace(/\./g,'').replace(',','.');
    }else if(dot>-1){
      const groups=value.split('.');
      if(groups.length>2){
        const decimal=groups.pop();
        value=groups.join('')+'.'+decimal;
      }
    }

    const number=Number(value);
    return Number.isFinite(number)&&number>=0&&number<1000000?number:null;
  }

  function moneyValues(line){
    const pattern=/(?:€\s*)?\d{1,7}(?:[.\s]\d{3})*[,.]\d{2}/g;
    return [...String(line||'').matchAll(pattern)]
      .map(match=>({raw:match[0],value:parseMoney(match[0]),index:match.index||0}))
      .filter(item=>item.value!==null);
  }

  function extractAmount(text){
    const docLines=lines(text);
    const candidates=[];
    const strongTotal=/\b(totale?\s+kosten|eindtotaal|te\s*betalen|verschuldigd|amount\s*due|grand\s*total|total\s*costs?|order\s*total|net\s*payable)\b/i;
    const regularTotal=/\b(totaal|total)\b/i;
    const subtotal=/\b(subtotaal|subtotal)\b/i;
    const exclusion=/\b(btw|vat|belasting|korting|coupon|wisselgeld|verzend(?:ing)?\s+en\s+afhandeling\s+btw)\b/i;

    docLines.forEach((line,index)=>{
      const values=moneyValues(line);
      if(!values.length)return;
      const isStrong=strongTotal.test(line);
      const isTotal=regularTotal.test(line);
      const isSubtotal=subtotal.test(line);
      const isExcluded=exclusion.test(line);

      values.forEach(({value})=>{
        let score=0;
        if(isStrong)score+=1000;
        else if(isTotal)score+=350;
        if(isSubtotal)score-=500;
        if(isExcluded)score-=450;
        if(index>=docLines.length*.65)score+=100;
        score+=Math.min(80,value/4);
        candidates.push({value,score,index,isStrong,isSubtotal,isExcluded,line});
      });
    });

    if(!candidates.length){
      return typeof original.extractReceiptAmount==='function'
        ?original.extractReceiptAmount(text)
        :null;
    }

    const strong=candidates.filter(item=>item.isStrong&&!item.isExcluded&&!item.isSubtotal);
    const pool=strong.length?strong:candidates.filter(item=>!item.isExcluded&&!item.isSubtotal);
    pool.sort((a,b)=>b.score-a.score||b.value-a.value);
    return pool[0]?.value??null;
  }

  function extractMerchant(text){
    const normalized=normalizeDocumentText(text);
    if(/\bvolvo\s*penta\b/i.test(normalized))return 'Volvo Penta';
    if(/\bda\s+giorgio\b/i.test(normalized))return 'Da Giorgio';

    const reject=/orderbevestiging|bestelbevestiging|factuuradres|bezorgadres|klantreferentie|aanvullende informatie|onderdeelnummer|beschrijving|samenvatting|subtotaal|totale kosten|bestelnummer|besteldatum|orderklasse|bezorgwijze|betalingsmethode|nettogewicht|\bklant\b|\bbedrijf\b|\be-?mail\b|telefoon/i;
    const candidates=[];

    lines(normalized).slice(0,24).forEach((line,index)=>{
      if(reject.test(line))return;
      if(line.length<3||line.length>55)return;
      if(!/[A-Za-zÀ-ÿ]{3}/.test(line))return;
      if(/@|https?:|www\.|\b\d{4}\s?[A-Z]{2}\b/i.test(line))return;
      if(/\b(straat|weg|laan|plein|kade|haven|gracht|dijk)\b/i.test(line)&&/\d/.test(line))return;
      if(/^\d/.test(line))return;

      const letters=line.match(/[A-Za-zÀ-ÿ]/g)||[];
      const uppercase=line.match(/[A-ZÀ-Þ]/g)||[];
      let score=150-index*8;
      if(letters.length&&uppercase.length/letters.length>.75)score+=80;
      if(/\b(bv|b\.v\.|nv|n\.v\.|marine|marina|jachthaven|watersport|service|shop)\b/i.test(line))score+=45;
      candidates.push({line,score});
    });

    if(candidates.length){
      candidates.sort((a,b)=>b.score-a.score);
      return String(candidates[0].line)
        .toLowerCase()
        .replace(/\b([a-zà-ÿ])/g,letter=>letter.toUpperCase());
    }

    return typeof original.extractReceiptMerchant==='function'
      ?original.extractReceiptMerchant(text)
      :null;
  }

  function detectCategory(text){
    const normalized=normalizeDocumentText(text).toLowerCase();
    if(/volvo\s*penta|onderdeelnummer|pakking|afdichtring|o-ring|onderdelen|spare\s*parts?/.test(normalized)){
      return 'Onderdelen';
    }
    return typeof original.detectReceiptCategory==='function'
      ?original.detectReceiptCategory(text)
      :null;
  }

  function structuredItemRows(text){
    const results=[];
    for(const line of lines(text)){
      const match=line.match(/^([A-Z0-9-]{4,})\s+(.+?)\s+(\d{1,3})\s+(.*)$/i);
      if(!match)continue;
      const amounts=moneyValues(line);
      if(amounts.length<2)continue;

      const partNumber=match[1];
      let description=match[2]
        .replace(/\s+\d+[,.]\d+$/,'')
        .replace(/\s{2,}/g,' ')
        .trim();
      const quantity=Number(match[3]);
      const total=amounts[amounts.length-1].value;

      if(!description||!Number.isFinite(quantity)||quantity<1||quantity>999)continue;
      if(/onderdeelnummer|beschrijving|subtotaal|totaal/i.test(description))continue;

      results.push({
        description:`${partNumber} · ${description}`,
        quantity,
        amount:total
      });
    }
    return results;
  }

  function extractItems(text){
    const structured=structuredItemRows(text);
    if(structured.length)return structured.slice(0,20);
    return typeof original.extractReceiptItems==='function'
      ?original.extractReceiptItems(text)
      :[];
  }

  function findLabelValue(text,labelPattern){
    for(const line of lines(text)){
      const match=line.match(labelPattern);
      if(match?.[1])return match[1].trim();
    }
    return '';
  }

  function findMoneyByLabel(text,pattern){
    for(const line of lines(text)){
      if(!pattern.test(line))continue;
      const values=moneyValues(line);
      if(values.length)return values[values.length-1].value;
    }
    return null;
  }

  function buildDetails(text,{merchant,date,amount}={}){
    const result=[];
    const normalized=normalizeDocumentText(text);
    const items=extractItems(normalized);
    const orderNumber=findLabelValue(normalized,/\bbestelnummer\s*:?\s*([A-Z0-9-]+)/i)
      ||findLabelValue(normalized,/\border(?:nummer)?\s*#?\s*:?\s*([A-Z0-9-]+)/i);
    const subtotal=findMoneyByLabel(normalized,/\bsubtotaal\b/i);
    const shipping=findMoneyByLabel(normalized,/\bverzend(?:ing)?[-\s]+en[-\s]+afhandelingskosten\b/i);

    if(merchant)result.push(`Leverancier: ${merchant}`);
    if(date)result.push(`Datum: ${date.split('-').reverse().join('-')}`);
    if(orderNumber)result.push(`Bestelnummer: ${orderNumber}`);

    if(items.length){
      result.push('');
      result.push('Artikelen:');
      items.forEach(item=>{
        const quantity=item.quantity>1?`${item.quantity} × `:'';
        result.push(`• ${quantity}${item.description} — €${item.amount.toFixed(2).replace('.',',')}`);
      });
    }

    if(subtotal!==null){
      result.push('');
      result.push(`Subtotaal: €${subtotal.toFixed(2).replace('.',',')}`);
    }
    if(shipping!==null)result.push(`Verzend- en afhandelingskosten: €${shipping.toFixed(2).replace('.',',')}`);
    if(amount!==null&&amount!==undefined)result.push(`Totaal: €${Number(amount).toFixed(2).replace('.',',')}`);

    if(!result.length&&typeof original.buildReceiptDetails==='function'){
      return original.buildReceiptDetails(text,{merchant,date,amount});
    }
    return result.join('\n').trim();
  }

  function parseReceiptText(text){
    const normalized=normalizeDocumentText(text);
    const amount=extractAmount(normalized);
    const date=typeof original.extractReceiptDate==='function'
      ?original.extractReceiptDate(normalized)
      :null;
    const merchant=extractMerchant(normalized);
    const category=detectCategory(normalized);
    const items=extractItems(normalized);
    const details=buildDetails(normalized,{merchant,date,amount});
    return {normalized,amount,date,merchant,category,items,details};
  }

  function applyResult(text,source='bon'){
    const parsed=parseReceiptText(text);
    const found=[];

    if(parsed.amount!==null){
      document.getElementById('costAmount').value=parsed.amount.toFixed(2);
      found.push(`bedrag €${parsed.amount.toFixed(2).replace('.',',')}`);
    }
    if(parsed.date){
      document.getElementById('costDate').value=parsed.date;
      found.push(`datum ${parsed.date.split('-').reverse().join('-')}`);
    }
    if(parsed.merchant){
      document.getElementById('costDescription').value=parsed.merchant;
      found.push(`omschrijving ${parsed.merchant}`);
    }
    if(parsed.category){
      document.getElementById('costCategory').value=parsed.category;
      found.push(`categorie ${parsed.category}`);
    }
    if(parsed.details){
      window.showCostReceiptDetails(parsed.details);
      if(parsed.items.length)found.push(`${parsed.items.length} artikelregels`);
    }

    window.setCostOcrStatus(
      found.length
        ?`${source==='pdf'?'PDF rechtstreeks gelezen':'Automatisch ingevuld'}: ${found.join(' · ')}. Controleer de gegevens vóór opslaan.`
        :`De ${source==='pdf'?'PDF':'bon'} is gelezen, maar er konden geen betrouwbare gegevens worden ingevuld.`,
      !found.length
    );
    return parsed;
  }

  function loadClassicScript(src,timeout=25000){
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      const timer=setTimeout(()=>{
        script.remove();
        reject(new Error('Time-out bij laden van PDF-lezer.'));
      },timeout);
      script.src=src;
      script.async=true;
      script.crossOrigin='anonymous';
      script.onload=()=>{clearTimeout(timer);resolve();};
      script.onerror=()=>{clearTimeout(timer);reject(new Error('PDF-lezer kon niet worden geladen.'));};
      document.head.appendChild(script);
    });
  }

  async function loadPdfLibrary(){
    if(window.pdfjsLib){
      window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER_URL;
      return window.pdfjsLib;
    }
    if(pdfLibraryPromise)return pdfLibraryPromise;
    pdfLibraryPromise=(async()=>{
      await loadClassicScript(PDFJS_URL);
      if(!window.pdfjsLib)throw new Error('PDF-lezer is niet beschikbaar.');
      window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER_URL;
      return window.pdfjsLib;
    })();
    try{return await pdfLibraryPromise;}
    catch(error){pdfLibraryPromise=null;throw error;}
  }

  function reconstructPdfLines(items){
    const rows=[];
    for(const item of items||[]){
      const str=String(item?.str||'').trim();
      if(!str)continue;
      const transform=item.transform||[];
      const x=Number(transform[4]||0);
      const y=Number(transform[5]||0);
      let row=rows.find(candidate=>Math.abs(candidate.y-y)<=2.8);
      if(!row){
        row={y,items:[]};
        rows.push(row);
      }
      row.items.push({x,str,width:Number(item.width||0)});
    }

    rows.sort((a,b)=>b.y-a.y);
    return rows.map(row=>{
      row.items.sort((a,b)=>a.x-b.x);
      let output='';
      let previousEnd=null;
      row.items.forEach(item=>{
        const gap=previousEnd===null?0:item.x-previousEnd;
        if(output&&gap>1.5)output+=' ';
        output+=item.str;
        previousEnd=item.x+Math.max(item.width,0);
      });
      return output.replace(/\s+/g,' ').trim();
    }).filter(Boolean);
  }

  async function extractPdfText(file){
    const pdfjs=await loadPdfLibrary();
    const bytes=new Uint8Array(await file.arrayBuffer());
    const task=pdfjs.getDocument({data:bytes});
    const pdf=await task.promise;
    const output=[];
    const maxPages=Math.min(pdf.numPages,5);

    for(let pageNumber=1;pageNumber<=maxPages;pageNumber++){
      window.setCostOcrStatus(`PDF-tekst lezen… pagina ${pageNumber} van ${maxPages}`);
      const page=await pdf.getPage(pageNumber);
      const content=await page.getTextContent({normalizeWhitespace:true});
      output.push(...reconstructPdfLines(content.items));
    }
    return {text:normalizeDocumentText(output.join('\n')),pdf};
  }

  async function renderPdfPages(pdf,maxPages=2){
    const blobs=[];
    const count=Math.min(pdf.numPages,maxPages);
    for(let pageNumber=1;pageNumber<=count;pageNumber++){
      window.setCostOcrStatus(`Scan-PDF voorbereiden… pagina ${pageNumber} van ${count}`);
      const page=await pdf.getPage(pageNumber);
      const base=page.getViewport({scale:1});
      const scale=Math.min(2.4,2200/Math.max(base.width,base.height));
      const viewport=page.getViewport({scale:Math.max(1.7,scale)});
      const canvas=document.createElement('canvas');
      canvas.width=Math.ceil(viewport.width);
      canvas.height=Math.ceil(viewport.height);
      const context=canvas.getContext('2d',{alpha:false});
      context.fillStyle='#fff';
      context.fillRect(0,0,canvas.width,canvas.height);
      await page.render({canvasContext:context,viewport}).promise;
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(
        result=>result?resolve(result):reject(new Error('PDF-pagina kon niet worden omgezet.')),
        'image/jpeg',.96
      ));
      blobs.push(blob);
    }
    return blobs;
  }

  async function ocrPdfPages(blobs){
    const Tesseract=await window.loadReceiptOcrLibrary();
    const worker=await Tesseract.createWorker('nld+eng',1,{
      logger:message=>{
        if(message.status==='recognizing text'){
          window.setCostOcrStatus(`Scan-PDF lezen… ${Math.round(Number(message.progress||0)*100)}%`);
        }
      }
    });
    try{
      await worker.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'});
      const texts=[];
      for(const blob of blobs){
        const result=await worker.recognize(blob);
        texts.push(String(result?.data?.text||''));
      }
      return normalizeDocumentText(texts.join('\n'));
    }finally{
      try{await worker.terminate();}catch(error){console.warn(error);}
    }
  }

  async function scanPdf(file){
    if(receiptOcrRunning)return;
    receiptOcrRunning=true;
    document.getElementById('costOcrRetryButton')?.classList.remove('hidden');
    window.setCostOcrStatus('PDF openen en tekst controleren…');

    try{
      const {text,pdf}=await extractPdfText(file);
      const direct=parseReceiptText(text);
      const hasUsefulText=text.length>80&&(direct.amount!==null||direct.date||direct.merchant||direct.items.length);

      if(hasUsefulText){
        lastReceiptOcrText=text;
        applyResult(text,'pdf');
        return direct;
      }

      window.setCostOcrStatus('Deze PDF bestaat waarschijnlijk uit scans. OCR wordt gestart…');
      const pageBlobs=await renderPdfPages(pdf,Math.min(3,pdf.numPages));
      const ocrText=await ocrPdfPages(pageBlobs);
      lastReceiptOcrText=ocrText;
      return applyResult(ocrText,'pdf');
    }catch(error){
      console.error('PDF uitlezen mislukt:',error);
      window.setCostOcrStatus('PDF uitlezen lukte niet. Het document wordt wel opgeslagen; vul de gegevens handmatig aan.',true);
      throw error;
    }finally{
      receiptOcrRunning=false;
    }
  }

  async function scanAnyReceipt(file){
    if(isPdf(file))return scanPdf(file);
    if(isImage(file))return original.scanCostReceipt(file);
    throw new Error('Dit bestand is geen foto of PDF.');
  }

  window.addCostReceiptFiles=function(fileList){
    const incoming=[...(fileList||[])];
    const added=[];

    for(const file of incoming){
      if(pendingCostReceiptFiles.length>=3){
        alert('Je kunt maximaal 3 bonnetjes per kostenpost toevoegen.');
        break;
      }
      if(!isImage(file)&&!isPdf(file)){
        alert(`${file.name} is geen afbeelding of PDF.`);
        continue;
      }
      if(file.size>10*1024*1024){
        alert(`${file.name} is groter dan 10 MB.`);
        continue;
      }
      const duplicate=pendingCostReceiptFiles.some(existing=>
        existing.name===file.name&&existing.size===file.size&&existing.lastModified===file.lastModified
      );
      if(!duplicate){
        pendingCostReceiptFiles.push(file);
        added.push(file);
      }
    }

    const camera=document.getElementById('costReceiptCamera');
    const picker=document.getElementById('costReceiptFiles');
    if(camera)camera.value='';
    if(picker)picker.value='';
    window.renderCostReceiptPreview();

    const hasReadable=pendingCostReceiptFiles.some(file=>isImage(file)||isPdf(file));
    document.getElementById('costOcrRetryButton')?.classList.toggle('hidden',!hasReadable);
    if(added.length)scanAnyReceipt(added[0]).catch(()=>{});
  };

  window.removePendingCostReceipt=function(index){
    pendingCostReceiptFiles.splice(index,1);
    window.renderCostReceiptPreview();
    const hasReadable=pendingCostReceiptFiles.some(file=>isImage(file)||isPdf(file));
    document.getElementById('costOcrRetryButton')?.classList.toggle('hidden',!hasReadable);
    if(!hasReadable){
      lastReceiptOcrText='';
      window.setCostOcrStatus('');
    }
  };

  window.scanFirstPendingCostReceipt=function(){
    const file=pendingCostReceiptFiles.find(item=>isImage(item)||isPdf(item));
    if(!file){
      window.setCostOcrStatus('Voeg eerst een foto of PDF toe.',true);
      return;
    }
    scanAnyReceipt(file).catch(()=>{});
  };

  window.scanCostReceipt=scanAnyReceipt;
  window.extractReceiptAmount=extractAmount;
  window.extractReceiptMerchant=extractMerchant;
  window.detectReceiptCategory=detectCategory;
  window.extractReceiptItems=extractItems;
  window.buildReceiptDetails=buildDetails;
  window.applyReceiptOcrResult=text=>applyResult(text,'bon');

  window.rescanStoredReceipt=async function(costId,url){
    const cost=costCache.find(item=>item.id===costId);
    if(!cost)return alert('Kostenpost niet gevonden.');
    try{
      window.editCost(cost.id,cost.expense_date,cost.amount,cost.category,cost.description||'');
      window.setCostOcrStatus('Bestaand document opnieuw ophalen…');
      const response=await fetch(url);
      if(!response.ok)throw new Error(`Document ophalen gaf fout ${response.status}`);
      const blob=await response.blob();
      const pdf=blob.type==='application/pdf';
      const file=new File([blob],`bon-${costId}.${pdf?'pdf':'jpg'}`,{type:blob.type||(pdf?'application/pdf':'image/jpeg')});
      await scanAnyReceipt(file);
      window.showAppToast('Document opnieuw gelezen. Controleer de gegevens en sla wijzigingen op.');
    }catch(error){
      console.error('Bestaand document opnieuw lezen mislukt:',error);
      alert('Document opnieuw lezen mislukt: '+(error?.message||'onbekende fout'));
    }
  };

  window.renderReadOnlyCostReceipts=function(costId){
    const receipts=costReceiptCache[costId]||[];
    if(!receipts.length)return '<span class="small">Geen bonnetje toegevoegd.</span>';
    return `<div class="finance-receipt-grid">${receipts.map(receipt=>{
      const image=String(receipt.mime_type||'').startsWith('image/');
      if(image){
        return `<div class="finance-receipt-card">
          <button type="button" class="finance-receipt-button"
            onclick='openStorageLightbox(${JSON.stringify(COST_RECEIPT_BUCKET)},${JSON.stringify(receipt.storage_path)},this.querySelector("img"))'>
            <img src="${STORAGE_SAFE_PLACEHOLDER}" class="storage-safe-image" loading="lazy" decoding="async"
              data-storage-bucket="${esc(COST_RECEIPT_BUCKET)}"
              data-storage-path="${esc(receipt.storage_path)}" alt="Bonnetje">
            <span>Bekijk bon</span>
          </button>
          <button type="button" class="receipt-rescan-button"
            onclick='rescanStoredReceiptPath(${JSON.stringify(costId)},${JSON.stringify(COST_RECEIPT_BUCKET)},${JSON.stringify(receipt.storage_path)})'>✨ Opnieuw lezen</button>
        </div>`;
      }
      return `<div class="finance-receipt-card">
        <button type="button" class="finance-receipt-button finance-receipt-pdf"
          onclick='openStorageDocument(${JSON.stringify(COST_RECEIPT_BUCKET)},${JSON.stringify(receipt.storage_path)})'>
          <span>🧾 PDF-bon openen</span>
        </button>
        <button type="button" class="receipt-rescan-button"
          onclick='rescanStoredReceiptPath(${JSON.stringify(costId)},${JSON.stringify(COST_RECEIPT_BUCKET)},${JSON.stringify(receipt.storage_path)})'>✨ PDF opnieuw lezen</button>
      </div>`;
    }).join('')}</div>`;
  };

  window.MSReceiptReaderPro={
    version:'7.4.4',
    parseReceiptText,
    extractAmount,
    extractMerchant,
    detectCategory,
    extractItems,
    buildDetails,
    normalizeDocumentText
  };

  const retry=document.getElementById('costOcrRetryButton');
  if(retry)retry.textContent='✨ Gegevens opnieuw uit foto/PDF lezen';
  console.info('MijnSerenity 7.4.4 PDF & Receipt Reader Pro actief.');
})();
