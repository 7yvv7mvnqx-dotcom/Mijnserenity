/* MijnSerenity 8.23.0 — slimme bonscanner met veld- en totaalcontrole */
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
      .replace(/\bYOUR\s+ADVENTUR(?:E|EE|LEE)(?:\s+(?:EE|E|IS)){0,3}\b/gi,'YOUR ADVENTURE')
      .replace(/O\s*[-–—]?\s*ring/gi,'O-ring')
      .replace(/(\d+)\s*(?:mm2|mm²)\b/gi,'$1 mm²')
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


  function isInsurancePolicy(text){
    const normalized=normalizeDocumentText(text);
    return /\b(?:bootverzekering|verzekeringspolis|polisnummer|verzekeringsoverzicht)\b/i.test(normalized)&&
      /\b(?:verzekerd\s+bij|verzekeringen|premie|dekking(?:en)?)\b/i.test(normalized);
  }

  function findLineMoney(text,pattern){
    for(const line of lines(text)){
      if(!pattern.test(line))continue;
      const values=moneyValues(line);
      if(values.length)return values[values.length-1].value;
    }
    return null;
  }

  function parseDutchDateValue(raw){
    const months={
      jan:1,januari:1,feb:2,februari:2,mrt:3,maart:3,apr:4,april:4,mei:5,
      jun:6,juni:6,jul:7,juli:7,aug:8,augustus:8,sep:9,sept:9,september:9,
      okt:10,oktober:10,nov:11,november:11,dec:12,december:12
    };
    const match=String(raw||'').match(/\b(\d{1,2})\s+(jan(?:uari)?|feb(?:ruari)?|mrt|maart|apr(?:il)?|mei|jun(?:i)?|jul(?:i)?|aug(?:ustus)?|sept?|september|okt(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(20\d{2})\b/i);
    if(!match)return null;
    const day=Number(match[1]);
    const month=months[match[2].toLowerCase()];
    const year=Number(match[3]);
    if(!month||day<1||day>31)return null;
    return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  function findDutchDateAfterLabel(text,labelSource){
    const normalized=normalizeDocumentText(text);
    const month='jan(?:uari)?|feb(?:ruari)?|mrt|maart|apr(?:il)?|mei|jun(?:i)?|jul(?:i)?|aug(?:ustus)?|sept?|september|okt(?:ober)?|nov(?:ember)?|dec(?:ember)?';
    const pattern=new RegExp(`${labelSource}[^\\n]{0,100}?(\\d{1,2}\\s+(?:${month})\\.?\\s+20\\d{2})`,'i');
    const sameLine=normalized.match(pattern);
    if(sameLine)return parseDutchDateValue(sameLine[1]);

    const windowPattern=new RegExp(`${labelSource}[\\s\\S]{0,120}?(\\d{1,2}\\s+(?:${month})\\.?\\s+20\\d{2})`,'i');
    const nearby=normalized.match(windowPattern);
    return nearby?parseDutchDateValue(nearby[1]):null;
  }

  function parseInsurancePolicy(text){
    const normalized=normalizeDocumentText(text);
    if(!isInsurancePolicy(normalized))return null;

    let amount=null;
    let cadence='';
    for(const line of lines(normalized)){
      const match=line.match(/\btotale?\s+premie\s+per\s+(maand|kwartaal|halfjaar|jaar)\b/i);
      if(!match)continue;
      const values=moneyValues(line);
      if(values.length){
        amount=values[values.length-1].value;
        cadence=match[1].toLowerCase();
        break;
      }
    }

    // Alleen wanneer geen expliciete totaalpremie aanwezig is, mag een gewone
    // periodieke premie als reserve worden gebruikt. Verzekerde bedragen,
    // eigen risico's en maximale uitkeringen zijn nooit een te boeken kostenbedrag.
    if(amount===null){
      for(const line of lines(normalized)){
        const match=line.match(/^premie\s+per\s+(maand|kwartaal|halfjaar|jaar)\b/i);
        if(!match)continue;
        const values=moneyValues(line);
        if(values.length){
          amount=values[values.length-1].value;
          cadence=match[1].toLowerCase();
          break;
        }
      }
    }

    const insurerMatch=normalized.match(/\bverzekerd\s+bij\s+([^\n]{3,80}?)(?=\s{2,}|\bnetto\s+jaarpremie\b|\n)/i)
      ||normalized.match(/\b(TVM\s+verzekeringen\s+N\.?V\.?)\b/i);
    const insurer=insurerMatch?.[1]?.replace(/\s+/g,' ').trim()||'Verzekeraar';
    const policyNumber=(normalized.match(/\bpolisnummer\s*:?\s*([0-9A-Z-]{4,})\b/i)||[])[1]||'';
    const relationNumber=(normalized.match(/\brelatienummer\s*:?\s*([0-9A-Z-]{3,})\b/i)||[])[1]||'';
    const startDate=findDutchDateAfterLabel(normalized,'\\bingangs-?\\/?wijzigingsdatum\\b')
      ||findDutchDateAfterLabel(normalized,'\\bingangsdatum\\b');
    const documentDate=findDutchDateAfterLabel(normalized,'\\bdatum\\b');
    const paymentMethod=(normalized.match(/\bbetaalwijze\s*:?\s*([^\n]{3,80})/i)||[])[1]?.trim()||'';
    const baseQuarterly=findLineMoney(normalized,/^premie\s+per\s+kwartaal\b/i);
    const tax=findLineMoney(normalized,/\bassurantiebelasting\b/i);
    const liability=findLineMoney(normalized,/^aansprakelijkheid\s*:/i);
    const occupants=findLineMoney(normalized,/^ongevallen\s+opvarenden\s*:/i);
    const annualNet=(liability!==null&&occupants!==null)?Number((liability+occupants).toFixed(2)):null;

    const coverages=[];
    for(const [label,pattern] of [
      ['Aansprakelijkheid',/^aansprakelijkheid\s*:\s*ja\b/i],
      ['Casco',/^casco\s*:\s*ja\b/i],
      ['Inboedel',/^inboedel\s*:\s*ja\b/i],
      ['Vaartuigenhulp',/^vaartuigenhulp\s*:\s*ja\b/i],
      ['Ongevallen opvarenden',/^ongevallen\s+opvarenden\s*:\s*ja\b/i]
    ]){
      if(lines(normalized).some(line=>pattern.test(line)))coverages.push(label);
    }

    return {
      amount,
      cadence,
      insurer,
      policyNumber,
      relationNumber,
      date:startDate||documentDate||null,
      startDate,
      documentDate,
      paymentMethod,
      baseQuarterly,
      tax,
      annualNet,
      coverages
    };
  }

  function extractDocumentDate(text){
    const normalized=normalizeDocumentText(text);
    const policy=parseInsurancePolicy(normalized);
    if(policy?.date)return policy.date;

    // Nederlandse leveranciers gebruiken vaak een uitgeschreven datum, zoals
    // "Datum: 6 mei 2026". Geef een datum met expliciet label altijd voorrang.
    const labelled=findDutchDateAfterLabel(
      normalized,
      '\\b(?:factuurdatum|besteldatum|orderdatum|datum)\\b'
    );
    if(labelled)return labelled;

    const anyDutch=parseDutchDateValue(normalized);
    if(anyDutch)return anyDutch;

    return typeof original.extractReceiptDate==='function'
      ?original.extractReceiptDate(normalized)
      :null;
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
    const normalized=normalizeDocumentText(text);
    const policy=parseInsurancePolicy(normalized);
    if(policy?.amount!==null&&policy?.amount!==undefined)return policy.amount;
    const docLines=lines(normalized);
    const moneySource='(?:\\d{1,7}(?:[.\\s]\\d{3})*[,.]\\d{2})';

    // Facturen zetten het label en bedrag vaak op verschillende regels. Wanneer
    // "TOTAAL TE BETALEN" gevolgd wordt door EXCL./INCL., is INCL. leidend.
    const totalWindowPattern=new RegExp(
      `\\b(?:totaal\\s+te\\s+betalen|te\\s+betalen|eindtotaal|totale?\\s+kosten|grand\\s+total|amount\\s+due)\\b[\\s\\S]{0,320}?\\bincl(?:usief)?\\.?\\s*(?:€\\s*)?(${moneySource})`,
      'i'
    );
    const totalWindowMatch=normalized.match(totalWindowPattern);
    if(totalWindowMatch){
      const value=parseMoney(totalWindowMatch[1]);
      if(value!==null)return value;
    }

    const totalSameLinePattern=new RegExp(
      `\\b(?:totaal\\s+te\\s+betalen|te\\s+betalen|eindtotaal|totale?\\s+kosten|grand\\s+total|amount\\s+due)\\b[^\\n]{0,100}?(?:€\\s*)?(${moneySource})`,
      'i'
    );
    const totalSameLineMatch=normalized.match(totalSameLinePattern);
    if(totalSameLineMatch){
      const value=parseMoney(totalSameLineMatch[1]);
      if(value!==null)return value;
    }

    const plainTotalPattern=new RegExp(
      `(?:^|\\n)\\s*(?:totaal|total|order\\s+total)\\s*:?\\s*(?:€\\s*)?(${moneySource})\\b`,
      'i'
    );
    const plainTotalMatch=normalized.match(plainTotalPattern);
    if(plainTotalMatch){
      const value=parseMoney(plainTotalMatch[1]);
      if(value!==null)return value;
    }

    const candidates=[];
    const strongTotal=/\b(totale?\s+kosten|totaal\s+te\s+betalen|eindtotaal|te\s*betalen|voldaan|betaald|verschuldigd|amount\s*due|grand\s*total|total\s*costs?|order\s*total|net\s*payable)\b/i;
    const regularTotal=/\b(totaal|total)\b/i;
    const subtotal=/\b(subtotaal|subtotal)\b/i;

    docLines.forEach((line,index)=>{
      const values=moneyValues(line);
      if(!values.length)return;
      const isStrong=strongTotal.test(line);
      const isTotal=regularTotal.test(line);
      const isSubtotal=subtotal.test(line);
      const priorStrong=[docLines[index-1],docLines[index-2]].filter(Boolean).some(previous=>strongTotal.test(previous));

      values.forEach(({value,index:moneyIndex})=>{
        const before=line.slice(Math.max(0,moneyIndex-32),moneyIndex).toLowerCase();
        const after=line.slice(moneyIndex,Math.min(line.length,moneyIndex+24)).toLowerCase();
        const local=`${before} ${after}`;
        const isIncl=/\bincl(?:usief)?\.?\s*$/.test(before)||/\bincl(?:usief)?\.?/.test(local);
        const isExcl=/\bexcl(?:usief)?\.?\s*$/.test(before);
        const isVat=/\b(?:btw|vat)\s*(?:\d{1,2}\s*%)?\s*$/.test(before);
        const isDiscount=/\b(korting|coupon|wisselgeld)\b/.test(local);

        let score=0;
        if(isIncl&&(priorStrong||isStrong||docLines.some(candidate=>strongTotal.test(candidate))))score+=1800;
        if(isStrong)score+=1000;
        else if(isTotal)score+=350;
        if(priorStrong)score+=220;
        if(isSubtotal)score-=650;
        if(isExcl)score-=250;
        if(isVat)score-=750;
        if(isDiscount)score-=600;
        if(index>=docLines.length*.65)score+=100;
        score+=Math.min(100,value/4);
        candidates.push({value,score,index,isStrong,isSubtotal,isIncl,isExcl,isVat,line});
      });
    });

    if(!candidates.length){
      return typeof original.extractReceiptAmount==='function'
        ?original.extractReceiptAmount(text)
        :null;
    }

    candidates.sort((a,b)=>b.score-a.score||b.value-a.value);
    const best=candidates[0];
    if(!best || (!best.isStrong && !best.isIncl && best.score<500)) return null;
    return best.value;
  }

  function merchantLooksLikeItem(value){
    const line=String(value||'').trim();
    if(!line)return true;
    if(/^(?:nederland|nederlan|netherlands?|holland|voldaan|betaald|betaling|pin|maestro|visa|mastercard)$/i.test(line))return true;
    if(/^\d{1,3}(?:[,.]\d{1,2})?\s+/.test(line))return true;
    if(moneyValues(line).length)return true;
    if(/\b(?:aantal|stukprijs|bedrag|arbeid|materiaal|vetkoord|impeller|pakking|afdichtring|o-ring)\b/i.test(line))return true;
    return false;
  }

  function extractMerchant(text){
    const normalized=normalizeDocumentText(text);
    const policy=parseInsurancePolicy(normalized);
    if(policy)return /\bbootverzekering\b/i.test(normalized)?'TVM Bootverzekering':policy.insurer;

    // Herken leveranciers ook aan bestandsnaam, website en e-mailadres. Bij
    // PDF's staat het logo namelijk geregeld als afbeelding buiten de tekstlaag.
    if(/\bgeertman\b|jachtwerfgeertman\.nl|info@jachtwerfgeertman/i.test(normalized))return 'Jachtwerf Geertman BV';
    if(/\bkranerweerd\b/i.test(normalized))return 'Jachthaven de Kranerweerd B.V.';
    if(/\bvolvo\s*penta\b/i.test(normalized)&&/\b(?:orderbevestiging|bestelnummer|onderdeelnummer)\b/i.test(normalized))return 'Volvo Penta';
    if(/\bda\s+giorgio\b/i.test(normalized))return 'Da Giorgio';
    if(/\bparts?point\b|parts?point\.nl|info@parts?point\.nl/i.test(normalized))return /\bhengelo\b/i.test(normalized)?'PartsPoint Hengelo':'PartsPoint';
    if(/\byour\s+adventur/i.test(normalized))return 'Your Adventure';
    

    const docLines=lines(normalized);
    const legalEntity=docLines.find(line=>
      /\b(?:b\.?v\.?|n\.?v\.?|vof|v\.o\.f\.)\b/i.test(line)&&
      /[A-Za-zÀ-ÿ]{3}/.test(line)&&
      !merchantLooksLikeItem(line)&&
      !/\b(?:iban|bic|btw|kvk|rekening|bank|factuuradres|bezorgadres|algemene voorwaarden)\b/i.test(line)
    );
    if(legalEntity){
      return legalEntity
        .replace(/^(?:adres|website|telefoon|email|e-mail)\s*:?\s*/i,'')
        .replace(/\s{2,}/g,' ')
        .trim();
    }

    const reject=/\b(?:factuur|invoice|orderbevestiging|bestelbevestiging|factuuradres|bezorgadres|klantreferentie|aanvullende informatie|onderdeelnummer|beschrijving|samenvatting|subtotaal|totale kosten|bestelnummer|besteldatum|orderklasse|bezorgwijze|betalingsmethode|nettogewicht|klant|bedrijf|e-?mail|telefoon|betreft|deb\.?\s*nr|pagina|ordernummer|pakbon|dealer|referentie|vestiging|uw\s+referentie|geholpen\s+door)\b/i;
    const candidates=[];

    docLines.slice(0,40).forEach((line,index)=>{
      if(reject.test(line)||merchantLooksLikeItem(line))return;
      if(line.length<3||line.length>70)return;
      if(!/[A-Za-zÀ-ÿ]{3}/.test(line))return;
      if(/@|https?:|www\.|\b\d{4}\s?[A-Z]{2}\b/i.test(line))return;
      if(/\b(straat|weg|laan|plein|kade|haven|gracht|dijk)\b/i.test(line)&&/\d/.test(line))return;
      if(/^\d/.test(line))return;

      const letters=line.match(/[A-Za-zÀ-ÿ]/g)||[];
      const uppercase=line.match(/[A-ZÀ-Þ]/g)||[];
      let score=150-index*8;
      if(letters.length&&uppercase.length/letters.length>.75)score+=40;
      if(/\b(bv|b\.v\.|nv|n\.v\.|marine|marina|jachtwerf|jachthaven|watersport|service|shop)\b/i.test(line))score+=140;
      if(/^full service/i.test(line))score+=40;
      candidates.push({line,score});
    });

    if(candidates.length){
      candidates.sort((a,b)=>b.score-a.score);
      const merchant=String(candidates[0].line)
        .replace(/^[^A-Za-zÀ-ÿ]+/,'')
        .replace(/\s{2,}/g,' ')
        .trim();
      if(!merchantLooksLikeItem(merchant))return merchant;
    }

    const fallback=typeof original.extractReceiptMerchant==='function'
      ?original.extractReceiptMerchant(normalized)
      :null;
    return merchantLooksLikeItem(fallback)?null:fallback;
  }

  function detectCategory(text){
    const normalized=normalizeDocumentText(text).toLowerCase();
    if(isInsurancePolicy(normalized))return 'Verzekering';
    if(/\b(?:accu[-\s]?kabel|kabelogen?|kabelschoenen?|stroomkabel|massakabel|zekering(?:houder)?|busbar|verdeelrail|hoofdstroomschakelaar|victron|renogy|orion|multiplus|omvormer|laadregelaar|dc[-\s]?dc|12\s*v|24\s*v|mm²|amp[eè]re)\b/.test(normalized)){
      return 'Elektra';
    }
    if(/jachtwerf|uit\/?in\s+water|schoonspuiten\s+onderwaterschip|conserveren|overige\s+werkzaamheden|arbeid\s+geert|vervangen\s+stuurcilinder|uurloon\s+service\s+monteur|werkzaamheden|reparatie|service\s+monteur/.test(normalized)){
      return 'Onderhoud';
    }
    if(/volvo\s*penta|onderdeelnummer|pakking|afdichtring|o-ring|onderdelen|spare\s*parts?/.test(normalized)){
      return 'Onderdelen';
    }
    return typeof original.detectReceiptCategory==='function'
      ?original.detectReceiptCategory(text)
      :null;
  }

  function cleanItemDescription(value){
    let description=String(value||'')
      .replace(/([a-zà-ÿ])([A-ZÀ-Þ])/g,'$1 $2')
      .replace(/\b(?:sku|artikel(?:nummer)?|productcode|itemcode)\s*[:#]?\s*[A-Z0-9][A-Z0-9_.-]{3,}\b/gi,' ')
      .replace(/\b[A-Z]{1,8}_[A-Z0-9]+(?:_[A-Z0-9]+){2,}\b/g,' ')
      .replace(/\b[A-Z]{1,5}-[A-Z0-9]{3,}(?:-[A-Z0-9]{2,})*\b/g,' ')
      .replace(/^\s*[-–—•·:;|]+\s*/,'')
      .replace(/\s*[-–—•·:;|]+\s*$/,'')
      .replace(/\s+(?:met|incl(?:usief)?|code|artikel)\s*[:·-]*\s*$/i,'')
      .replace(/\s{2,}/g,' ')
      .trim();

    description=description
      .replace(/^\s*(?:i\s+e+\s*[.,]*)?\(?\s*tota?\s*\)?\s*/i,'')
      .replace(/\s{2,}/g,' ')
      .trim();
    return description;
  }

  function itemDescriptionLooksUseful(value){
    const description=String(value||'').trim();
    if(description.length<5||description.length>120)return false;
    if(!/[A-Za-zÀ-ÿ]{4}/.test(description))return false;
    if(/\b(?:subtotaal|totaal|te betalen|btw|vat|excl|incl|belasting|korting|wisselgeld|voldaan|betaald|verzendkosten|afhandelingskosten)\b/i.test(description))return false;
    if(/^(?:in\s+a|i\s+e+|e+\s+is|met|artikel|regel|item)\b/i.test(description))return false;

    const words=description.toLowerCase().match(/[a-zà-ÿ0-9]+/g)||[];
    const meaningful=words.filter(word=>/[a-zà-ÿ]{3}/.test(word));
    if(!meaningful.length)return false;
    const allowedShort=new Set(['de','het','een','en','of','met','in','op','voor','per','à','x']);
    const noise=words.filter(word=>/^[a-zà-ÿ]{1,2}$/.test(word)&&!allowedShort.has(word));
    return noise.length<Math.max(2,Math.ceil(words.length*.55));
  }

  function sanitizeReceiptItems(items){
    const cleaned=[];
    const seen=new Set();

    for(const item of items||[]){
      const description=cleanItemDescription(item?.description);
      const amount=Number(item?.amount);
      let quantity=Number(item?.quantity||1);
      if(!itemDescriptionLooksUseful(description)||!Number.isFinite(amount)||amount<=0||amount>=1000000)continue;
      if(!Number.isFinite(quantity)||quantity<=0||quantity>999)quantity=1;

      const key=`${description.toLowerCase().replace(/[^a-z0-9]+/g,'')}|${amount.toFixed(2)}`;
      if(!key.startsWith('|')&&seen.has(key))continue;
      seen.add(key);
      cleaned.push({
        description,
        quantity,
        amount:Number(amount.toFixed(2)),
        ...(Number.isFinite(Number(item?.unitPrice))?{unitPrice:Number(item.unitPrice)}:{})
      });
    }
    return cleaned;
  }

  function findMatchingItemSubset(items,target){
    const targetCents=Math.round(Number(target)*100);
    if(!Number.isFinite(targetCents)||targetCents<=0||items.length>32)return null;

    const states=new Map([[0,[]]]);
    items.forEach((item,index)=>{
      const cents=Math.round(Number(item.amount)*100);
      if(!Number.isFinite(cents)||cents<=0||cents>targetCents+2)return;
      const snapshot=[...states.entries()].sort((a,b)=>b[0]-a[0]);
      snapshot.forEach(([sum,path])=>{
        const next=sum+cents;
        if(next>targetCents+2)return;
        const candidate=[...path,index];
        const current=states.get(next);
        if(!current||candidate.length>current.length)states.set(next,candidate);
      });
    });

    for(const delta of [0,-1,1,-2,2]){
      const match=states.get(targetCents+delta);
      if(match?.length)return match.map(index=>items[index]);
    }
    return null;
  }

  function reconcileReceiptItems(items,{amount,subtotal,exclusive,shipping}={}){
    const cleaned=sanitizeReceiptItems(items);
    if(!cleaned.length)return {items:[],matches:null,filtered:Math.max(0,(items||[]).length),matchedTarget:''};

    const targetCandidates=[
      ['totaal',amount],
      ['totaal zonder verzendkosten',Number.isFinite(amount)&&Number.isFinite(shipping)?Number((amount-shipping).toFixed(2)):null],
      ['subtotaal',subtotal],
      ['exclusief btw',exclusive]
    ];
    const usedTargets=new Set();
    for(const [label,value] of targetCandidates){
      const numeric=Number(value);
      if(!Number.isFinite(numeric)||numeric<=0)continue;
      const key=numeric.toFixed(2);
      if(usedTargets.has(key))continue;
      usedTargets.add(key);

      const sum=Number(cleaned.reduce((total,item)=>total+item.amount,0).toFixed(2));
      if(Math.abs(sum-numeric)<=.02){
        return {items:cleaned,matches:true,filtered:Math.max(0,(items||[]).length-cleaned.length),matchedTarget:label};
      }

      const subset=findMatchingItemSubset(cleaned,numeric);
      if(subset){
        return {items:subset,matches:true,filtered:Math.max(0,(items||[]).length-subset.length),matchedTarget:label};
      }
    }

    return {
      items:cleaned.slice(0,12),
      matches:false,
      filtered:Math.max(0,(items||[]).length-Math.min(cleaned.length,12)),
      matchedTarget:''
    };
  }

  function invoiceItemRows(text){
    const results=[];
    const reject=/\b(?:omschrijving|aantal|stuksprijs|subtotaal|totaal|te betalen|btw|vat|excl|incl|betaling binnen|factuurdatum|factuurnummer|relatienummer|deb\.?\s*nr)\b/i;
    const money='(\\d{1,7}(?:[.\\s]\\d{3})*[,.]\\d{2})';
    const quantity='(\\d{1,3}(?:[,.]\\d{1,2})?)';
    const descriptionFirst=new RegExp(`^(.+?)\\s+${quantity}\\s*[x×]\\s*(?:€\\s*)?${money}\\s+(?:€\\s*)?${money}\\s*$`,'i');
    const quantityFirst=new RegExp(`^${quantity}\\s+(?!€)(.+?)\\s+(?:€\\s*)?${money}\\s+(?:€\\s*)?${money}\\s*$`,'i');

    for(const line of lines(text)){
      if(reject.test(line))continue;
      let match=line.match(descriptionFirst);
      let description,quantityRaw,unitRaw,totalRaw;
      if(match){
        description=match[1];
        quantityRaw=match[2];
        unitRaw=match[3];
        totalRaw=match[4];
      }else{
        match=line.match(quantityFirst);
        if(!match)continue;
        quantityRaw=match[1];
        description=match[2];
        unitRaw=match[3];
        totalRaw=match[4];
      }

      description=cleanItemDescription(description);
      const quantityNumber=Number(String(quantityRaw).replace(',','.'));
      const unitPrice=parseMoney(unitRaw);
      const total=parseMoney(totalRaw);
      if(!description||description.length<3||!Number.isFinite(quantityNumber)||quantityNumber<=0||quantityNumber>999)continue;
      if(unitPrice===null||total===null)continue;
      results.push({description,quantity:quantityNumber,unitPrice,amount:total});
    }
    return results;
  }

  function structuredItemRows(text){
    const results=[];
    for(const line of lines(text)){
      const match=line.match(/^([A-Z0-9-]{4,})\s+(.+?)\s+(\d{1,3})\s+(.*)$/i);
      if(!match)continue;
      const amounts=moneyValues(line);
      if(amounts.length<2)continue;

      const partNumber=match[1];
      let description=cleanItemDescription(match[2]
        .replace(/\s+\d+[,.]\d+$/,'')
        .replace(/\s{2,}/g,' ')
        .trim());
      const quantity=Number(match[3]);
      const total=amounts[amounts.length-1].value;

      if(!description||!Number.isFinite(quantity)||quantity<1||quantity>999)continue;
      if(/onderdeelnummer|beschrijving|subtotaal|totaal/i.test(description))continue;

      results.push({
        description,
        quantity,
        amount:total
      });
    }
    return results;
  }

  function partsPointItemRows(text){
    const results=[];
    for(const rawLine of lines(text)){
      const line=String(rawLine||'').replace(/\s{2,}/g,' ').trim();
      if(!/\b[A-Z]{1,4}-[A-Z0-9-]{3,}\b/i.test(line))continue;
      if(!/\b(?:ST|STK|PCS|EA)\b/i.test(line))continue;
      const code=(line.match(/\b([A-Z]{1,4}-[A-Z0-9-]{3,})\b/i)||[])[1];
      if(!code)continue;
      const amounts=moneyValues(line);
      if(!amounts.length)continue;
      const codeIndex=line.toUpperCase().indexOf(code.toUpperCase());
      let tail=line.slice(codeIndex+code.length).trim();
      // Stop omschrijving vóór aantal + eenheid of vóór de eerste geldkolom.
      tail=tail.replace(/\s+\d+(?:[,.]\d+)?\s*(?:ST|STK|PCS|EA)\b[\s\S]*$/i,'').trim();
      if(!tail){
        const firstMoney=amounts[0];
        tail=line.slice(codeIndex+code.length,firstMoney.index).trim();
      }
      tail=cleanItemDescription(tail);
      const qtyMatch=line.match(/\b(\d+(?:[,.]\d+)?)\s*(?:ST|STK|PCS|EA)\b/i);
      const quantity=qtyMatch?Number(qtyMatch[1].replace(',','.')):1;
      const amount=amounts[amounts.length-1].value;
      if(!tail||tail.length<3||amount===null)continue;
      results.push({description:tail,quantity:Number.isFinite(quantity)?quantity:1,amount});
    }
    return results;
  }

  function crossLineItemRows(text){
    const normalized=normalizeDocumentText(text);
    const docLines=lines(normalized);
    const results=[];
    const codePattern=/\b([A-Z]{1,5}(?:-[A-Z0-9]{2,}){1,3})\b/i;
    const stopPattern=/\b(?:totaal|subtotaal|voldaan|betaald|btw|vat|factuurnr|factuurnummer|ordernummer|bestelnummer|pakbon|dealer|referentie|debiteur|vestiging|woonplaats|telefoon|datum)\b/i;

    for(let i=0;i<docLines.length;i++){
      const base=String(docLines[i]||'').trim();
      const codeMatch=base.match(codePattern);
      if(!codeMatch)continue;
      const code=codeMatch[1];
      if(/^(?:IBAN|BIC|BTW|KVK)-/i.test(code))continue;

      // OCR van facturen splitst kolommen vaak over meerdere regels. Combineer
      // daarom de artikelregel met maximaal drie regels erna.
      const windowLines=[base];
      for(let j=1;j<=3 && i+j<docLines.length;j++){
        const candidate=String(docLines[i+j]||'').trim();
        if(!candidate)continue;
        if(stopPattern.test(candidate))break;
        windowLines.push(candidate);
      }
      const joined=windowLines.join(' ').replace(/\s+/g,' ').trim();
      const monies=moneyValues(joined);
      if(!monies.length)continue;

      const codeIndex=joined.toUpperCase().indexOf(code.toUpperCase());
      let after=joined.slice(codeIndex+code.length).trim();
      const firstMoney=monies[0];
      const absoluteFirstMoney=joined.indexOf(firstMoney.raw,codeIndex+code.length);
      if(absoluteFirstMoney>=0)after=joined.slice(codeIndex+code.length,absoluteFirstMoney).trim();

      // Verwijder kolomwaarden voor aantal/eenheid/btw uit de omschrijving.
      const qtyMatch=joined.match(/\b(\d+(?:[,.]\d+)?)\s*(ST|STK|PCS|EA|SET|X)\b/i);
      let quantity=qtyMatch?Number(qtyMatch[1].replace(',','.')):1;
      if(!Number.isFinite(quantity)||quantity<=0)quantity=1;
      after=cleanItemDescription(after
        .replace(/^[-:;|]+\s*/,'')
        .replace(/\b\d+(?:[,.]\d+)?\s*(?:ST|STK|PCS|EA|SET|X)\b[\s\S]*$/i,'')
        .replace(/\b\d{1,2}\s*%\b[\s\S]*$/i,'')
        .replace(/\s+/g,' ')
        .trim());

      if(after.length<3)continue;
      const amount=monies[monies.length-1].value;
      if(amount===null)continue;
      results.push({description:after,quantity,amount});
    }

    const seen=new Set();
    return results.filter(item=>{
      const key=`${item.description.toLowerCase()}|${item.amount.toFixed(2)}`;
      if(seen.has(key))return false;
      seen.add(key);return true;
    });
  }

  function singleAmountItemRows(text){
    const results=[];
    const reject=/\b(?:omschrijving|aantal|stuksprijs|subtotaal|totaal|te betalen|btw|vat|excl|incl|belasting|korting|wisselgeld|voldaan|betaald|verzendkosten|afhandelingskosten|factuurdatum|factuurnummer|relatienummer|bestelnummer|ordernummer)\b/i;

    for(const line of lines(text)){
      if(reject.test(line))continue;
      const amounts=moneyValues(line);
      if(!amounts.length)continue;
      const last=amounts[amounts.length-1];
      const description=cleanItemDescription(line.slice(0,last.index));
      if(!itemDescriptionLooksUseful(description))continue;

      const quantityMatch=line.match(/^\s*(\d{1,3}(?:[,.]\d{1,2})?)\s*(?:x|×|st|stk|pcs|ea)?\s+(?=[A-Za-zÀ-ÿ])/i);
      const quantity=quantityMatch?Number(quantityMatch[1].replace(',','.')):1;
      results.push({description,quantity:Number.isFinite(quantity)?quantity:1,amount:last.value});
    }
    return results;
  }

  function extractItemCandidates(text){
    if(isInsurancePolicy(text))return [];
    return [
      ...partsPointItemRows(text),
      ...invoiceItemRows(text),
      ...structuredItemRows(text),
      ...crossLineItemRows(text),
      ...singleAmountItemRows(text)
    ].slice(0,60);
  }

  function extractItems(text){
    return sanitizeReceiptItems(extractItemCandidates(text)).slice(0,30);
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

  function findMoneyAfterLabel(text,labelSource){
    const money='(\\d{1,7}(?:[.\\s]\\d{3})*[,.]\\d{2})';
    const pattern=new RegExp(`${labelSource}\\s*(?:€\\s*)?${money}`,'i');
    const match=normalizeDocumentText(text).match(pattern);
    return match?parseMoney(match[1]):null;
  }

  function findWorkDescription(text){
    const docLines=lines(text);
    const index=docLines.findIndex(line=>/^werkzaamheden\b/i.test(line));
    if(index<0)return '';
    for(let offset=1;offset<=3;offset++){
      const line=docLines[index+offset];
      if(!line)break;
      if(/^[-–—•]\s*/.test(line))return line.replace(/^[-–—•]\s*/,'').trim();
      if(!moneyValues(line).length&&!/uurloon|materiaal|totaal/i.test(line))return line.trim();
    }
    return '';
  }

  function buildSmartDescription(text,{merchant,category,items=[]}={}){
    const normalized=normalizeDocumentText(text).toLowerCase();
    if(category==='Elektra'){
      if(/\baccu[-\s]?kabel|\bkabelogen?|\bkabelschoenen?/.test(normalized))return 'Accukabels en aansluitmateriaal';
      if(/\bzekering|\bzekeringhouder/.test(normalized))return 'Zekeringen en aansluitmateriaal';
      if(/\bvictron|\brenogy|\borion|\bmultiplus|\bomvormer|\blaadregelaar/.test(normalized))return 'Elektrische installatie';
      return 'Elektrische materialen';
    }

    if(category==='Onderhoud'){
      const work=findWorkDescription(text);
      if(work)return cleanItemDescription(work).slice(0,90);
    }

    if(merchant&&!merchantLooksLikeItem(merchant))return merchant;
    if(items.length===1)return items[0].description.slice(0,90);
    if(items.length>1){
      if(category==='Onderdelen')return 'Onderdelen voor Serenity';
      if(category==='Materialen')return 'Materialen voor Serenity';
    }
    return '';
  }

  function hasLabelledTotal(text){
    return lines(text).some(line=>
      /\b(?:totaal\s+te\s+betalen|eindtotaal|te\s+betalen|totale?\s+kosten|grand\s+total|amount\s+due|order\s+total|totaal)\b/i.test(line)&&
      !/\b(?:subtotaal|excl(?:usief)?|btw|vat)\b/i.test(line)&&
      moneyValues(line).length>0
    );
  }

  function buildReviewState(text,{amount,date,merchant,category,summary,itemAudit}={}){
    const amountTrusted=amount!==null&&amount!==undefined&&(hasLabelledTotal(text)||itemAudit?.matches===true);
    const summaryTrusted=Boolean(summary)&&!merchantLooksLikeItem(summary);
    return {
      amount:!amountTrusted,
      date:!date,
      category:!category,
      description:!summaryTrusted,
      details:itemAudit?.matches===false,
      merchant:!merchant||merchantLooksLikeItem(merchant)
    };
  }

  function buildDetails(text,{merchant,date,amount,items:providedItems,itemAudit:providedItemAudit}={}){
    const result=[];
    const normalized=normalizeDocumentText(text);
    const policy=parseInsurancePolicy(normalized);
    if(policy){
      result.push(`Verzekeraar: ${policy.insurer}`);
      if(policy.policyNumber)result.push(`Polisnummer: ${policy.policyNumber}`);
      if(policy.relationNumber)result.push(`Relatienummer: ${policy.relationNumber}`);
      if(policy.startDate)result.push(`Ingangsdatum: ${policy.startDate.split('-').reverse().join('-')}`);
      else if(date)result.push(`Datum: ${date.split('-').reverse().join('-')}`);
      if(policy.paymentMethod)result.push(`Betaalwijze: ${policy.paymentMethod}`);
      if(policy.coverages.length)result.push(`Dekkingen: ${policy.coverages.join(', ')}`);
      result.push('');
      if(policy.annualNet!==null)result.push(`Netto jaarpremie: €${policy.annualNet.toFixed(2).replace('.',',')}`);
      if(policy.baseQuarterly!==null)result.push(`Premie per kwartaal: €${policy.baseQuarterly.toFixed(2).replace('.',',')}`);
      if(policy.tax!==null)result.push(`Assurantiebelasting: €${policy.tax.toFixed(2).replace('.',',')}`);
      if(amount!==null&&amount!==undefined){
        const period=policy.cadence?` per ${policy.cadence}`:'';
        result.push(`Te boeken premie${period}: €${Number(amount).toFixed(2).replace('.',',')}`);
      }
      result.push('Verzekerde bedragen en eigen risico’s zijn bewust niet als kosten meegenomen.');
      return result.join('\n').trim();
    }
    const invoiceNumber=findLabelValue(normalized,/\bfactuurnummer\s*(?:=\s*)?:?\s*([A-Z0-9-]+)/i)
      ||findLabelValue(normalized,/^factuur\s+(?:nr\.?\s*)?([A-Z0-9-]{3,})\b/i);
    const relationNumber=findLabelValue(normalized,/\brelatienummer\s*(?:=\s*)?:?\s*([A-Z0-9-]+)/i);
    const debtorNumber=findLabelValue(normalized,/\bdeb\.?\s*nr\.?\s*:?[ ]*([A-Z0-9-]+)/i);
    const subject=findLabelValue(normalized,/\bbetreft\s*:?[ ]*(.+)$/i);
    const orderNumber=findLabelValue(normalized,/\bbestelnummer\s*:?\s*([A-Z0-9-]+)/i)
      ||findLabelValue(normalized,/\border(?:nummer)?\s*#?\s*:?\s*([A-Z0-9-]+)/i)
      ||((normalized.match(/\bordernummer\b[\s\S]{0,80}?\b(\d{6,12})\b/i)||[])[1]||'')
      ||((normalized.match(/\buw\s+referentie\b[\s\S]{0,80}?\b(\d{6,12})\b/i)||[])[1]||'');
    const subtotal=findMoneyByLabel(normalized,/\bsubtotaal\b/i);
    const shipping=findMoneyByLabel(normalized,/\bverzend(?:ing)?[-\s]+en[-\s]+afhandelingskosten\b/i)
      ??findMoneyByLabel(normalized,/\bverzendkosten\b/i);
    const exclusive=findMoneyByLabel(normalized,/\btotaal\s+excl\.?\s*btw\b/i)
      ??findMoneyAfterLabel(normalized,'\\bEXCL(?:USIEF)?\\.?');
    const vat21=findMoneyAfterLabel(normalized,'\\bBTW\\s*21\\s*%');
    const vat9=findMoneyAfterLabel(normalized,'\\bBTW\\s*9\\s*%');
    const work=findWorkDescription(normalized);
    const extractedItems=providedItems||extractItemCandidates(normalized);
    const itemAudit=providedItemAudit||reconcileReceiptItems(extractedItems,{amount,subtotal,exclusive,shipping});
    const items=providedItems||itemAudit.items;

    if(merchant)result.push(`Leverancier: ${merchant}`);
    if(date)result.push(`Datum: ${date.split('-').reverse().join('-')}`);
    if(invoiceNumber)result.push(`Factuurnummer: ${invoiceNumber}`);
    else if(orderNumber)result.push(`Bestelnummer: ${orderNumber}`);
    if(relationNumber)result.push(`Relatienummer: ${relationNumber}`);
    if(debtorNumber)result.push(`Debiteurnummer: ${debtorNumber}`);
    if(subject)result.push(`Betreft: ${subject}`);
    if(work)result.push(`Werkzaamheden: ${work}`);

    if(items.length){
      result.push('');
      result.push('Materialen / artikelen:');
      items.forEach(item=>{
        const quantity=item.quantity>1?`${Number(item.quantity).toLocaleString('nl-NL',{maximumFractionDigits:2})} × `:'';
        const unit=item.unitPrice!==undefined&&item.quantity>1
          ?` à €${Number(item.unitPrice).toFixed(2).replace('.',',')}`
          :'';
        result.push(`• ${quantity}${item.description}${unit} — €${item.amount.toFixed(2).replace('.',',')}`);
      });
    }

    if(subtotal!==null){
      result.push('');
      result.push(`Subtotaal: €${subtotal.toFixed(2).replace('.',',')}`);
    }
    if(shipping!==null)result.push(`Verzend- en afhandelingskosten: €${shipping.toFixed(2).replace('.',',')}`);
    if(exclusive!==null)result.push(`Exclusief btw: €${exclusive.toFixed(2).replace('.',',')}`);
    if(vat9!==null&&vat9>0)result.push(`Btw 9%: €${vat9.toFixed(2).replace('.',',')}`);
    if(vat21!==null&&vat21>0)result.push(`Btw 21%: €${vat21.toFixed(2).replace('.',',')}`);
    if(amount!==null&&amount!==undefined)result.push(`Totaal te betalen: €${Number(amount).toFixed(2).replace('.',',')}`);
    if(itemAudit.matches===false){
      result.push('⚠️ Artikelbedragen konden niet volledig worden gecontroleerd; vergelijk ze met de bonfoto.');
    }

    if(!result.length&&typeof original.buildReceiptDetails==='function'){
      return original.buildReceiptDetails(text,{merchant,date,amount});
    }
    return result.join('\n').trim();
  }

  function parseReceiptText(text){
    const normalized=normalizeDocumentText(text);
    const amount=extractAmount(normalized);
    const date=extractDocumentDate(normalized);
    const merchant=extractMerchant(normalized);
    const category=detectCategory(normalized);
    const subtotal=findMoneyByLabel(normalized,/\bsubtotaal\b/i);
    const shipping=findMoneyByLabel(normalized,/\bverzend(?:ing)?[-\s]+en[-\s]+afhandelingskosten\b/i)
      ??findMoneyByLabel(normalized,/\bverzendkosten\b/i);
    const exclusive=findMoneyByLabel(normalized,/\btotaal\s+excl\.?\s*btw\b/i)
      ??findMoneyAfterLabel(normalized,'\\bEXCL(?:USIEF)?\\.?');
    const extractedItems=extractItemCandidates(normalized);
    const itemAudit=reconcileReceiptItems(extractedItems,{amount,subtotal,exclusive,shipping});
    const items=itemAudit.items;
    const summary=buildSmartDescription(normalized,{merchant,category,items});
    const review=buildReviewState(normalized,{amount,date,merchant,category,summary,itemAudit});
    const details=buildDetails(normalized,{merchant,date,amount,items,itemAudit});
    return {normalized,amount,date,merchant,category,summary,items,itemAudit,review,details};
  }

  function ensureCategoryOption(select,category){
    if(!select||!category)return false;
    let option=[...select.options].find(item=>String(item.value||item.textContent||'').toLowerCase()===category.toLowerCase());
    if(!option){
      option=document.createElement('option');
      option.value=category;
      option.textContent=category;
      select.appendChild(option);
    }
    select.value=option.value;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }

  function markReviewField(id,needsReview,reason='Controleer dit veld met de bonfoto.'){
    const field=document.getElementById(id);
    if(!field)return;
    field.classList.toggle('receipt-needs-review',Boolean(needsReview));
    if(needsReview){
      field.dataset.receiptReviewReason=reason;
      field.title=reason;
    }else{
      delete field.dataset.receiptReviewReason;
      if(/bonfoto|bonscan/i.test(field.title||''))field.removeAttribute('title');
    }
  }

  function installReviewStyles(){
    if(document.getElementById('msReceiptReviewStyles8230'))return;
    const style=document.createElement('style');
    style.id='msReceiptReviewStyles8230';
    style.textContent=`
      .receipt-needs-review{border-color:#f5a623!important;box-shadow:0 0 0 3px rgba(245,166,35,.2)!important}
      .receipt-details-card.receipt-needs-review{background:linear-gradient(145deg,rgba(245,166,35,.09),rgba(4,30,47,.94))!important}
      .receipt-ocr-status.receipt-ocr-warning{color:#ffd38a!important}
    `;
    document.head.appendChild(style);
  }

  function applyResult(text,source='bon'){
    const parsed=parseReceiptText(text);
    const found=[];
    const reviewLabels=[];
    const amountInput=document.getElementById('costAmount');
    const dateInput=document.getElementById('costDate');
    const categoryInput=document.getElementById('costCategory');
    const descriptionInput=document.getElementById('costDescription');

    if(parsed.amount!==null&&amountInput){
      amountInput.value=parsed.amount.toFixed(2);
      found.push(`bedrag €${parsed.amount.toFixed(2).replace('.',',')}`);
    }
    if(parsed.date&&dateInput){
      dateInput.value=parsed.date;
      found.push(`datum ${parsed.date.split('-').reverse().join('-')}`);
    }
    if(parsed.summary&&descriptionInput){
      descriptionInput.value=parsed.summary;
      found.push(`omschrijving ${parsed.summary}`);
    }
    const editing=Boolean(document.getElementById('costId')?.value);
    if(parsed.category&&categoryInput&&(!editing||!categoryInput.value)){
      if(ensureCategoryOption(categoryInput,parsed.category))found.push(`categorie ${parsed.category}`);
    }else if(parsed.category){
      found.push(`categorie herkend als ${parsed.category}`);
    }
    if(parsed.details){
      window.showCostReceiptDetails(parsed.details);
      if(parsed.items.length)found.push(`${parsed.items.length} gecontroleerde artikelregels`);
    }
    if(parsed.itemAudit.filtered>0)found.push(`${parsed.itemAudit.filtered} onbetrouwbare OCR-regels verwijderd`);

    const reviewMap=[
      ['costAmount','amount','bedrag'],
      ['costDate','date','datum'],
      ['costCategory','category','categorie'],
      ['costDescription','description','omschrijving'],
      ['costReceiptDetailsWrap','details','bonregels']
    ];
    reviewMap.forEach(([id,key,label])=>{
      const needsReview=Boolean(parsed.review[key]);
      markReviewField(id,needsReview);
      if(needsReview)reviewLabels.push(label);
    });

    window.setCostOcrStatus(
      found.length
        ?`${source==='pdf'?'PDF rechtstreeks gelezen':'Automatisch ingevuld'}: ${found.join(' · ')}. ${reviewLabels.length?`Controleer de oranje velden: ${reviewLabels.join(', ')}.`:'Bedrag en bonregels zijn gecontroleerd.'}`
        :`De ${source==='pdf'?'PDF':'bon'} is gelezen, maar er konden geen betrouwbare gegevens worden ingevuld.`,
      !found.length
    );
    document.getElementById('costOcrStatus')?.classList.toggle('receipt-ocr-warning',reviewLabels.length>0);
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
      const fileHint=`Documentnaam: ${String(file?.name||'').replace(/[_-]+/g,' ')}`;
      const directText=normalizeDocumentText(`${fileHint}\n${text}`);
      const direct=parseReceiptText(directText);
      const hasUsefulText=text.length>80&&(direct.amount!==null||direct.date||direct.merchant||direct.items.length);
      const needsHeaderEnrichment=hasUsefulText&&(
        merchantLooksLikeItem(direct.merchant)||
        !direct.merchant||
        !direct.date||
        (/\bfactuur\b/i.test(directText)&&direct.items.length===0)
      );

      if(hasUsefulText&&!needsHeaderEnrichment){
        lastReceiptOcrText=directText;
        applyResult(directText,'pdf');
        return direct;
      }

      if(hasUsefulText&&needsHeaderEnrichment){
        window.setCostOcrStatus('PDF-tekst gevonden; leverancier en factuurkop extra controleren…');
        try{
          const pageBlobs=await renderPdfPages(pdf,1);
          const ocrText=await ocrPdfPages(pageBlobs);
          const enrichedText=normalizeDocumentText(`${directText}\n${ocrText}`);
          const enriched=parseReceiptText(enrichedText);
          lastReceiptOcrText=enrichedText;
          applyResult(enrichedText,'pdf');
          return enriched;
        }catch(enrichmentError){
          console.warn('Extra controle van factuurkop mislukt; directe PDF-tekst wordt gebruikt.',enrichmentError);
          lastReceiptOcrText=directText;
          applyResult(directText,'pdf');
          return direct;
        }
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
    version:'8.23.0',
    parseReceiptText,
    extractAmount,
    extractMerchant,
    detectCategory,
    extractItems,
    buildDetails,
    cleanItemDescription,
    reconcileReceiptItems,
    normalizeDocumentText,
    parseInsurancePolicy
  };

  installReviewStyles();
  const retry=document.getElementById('costOcrRetryButton');
  if(retry)retry.textContent='✨ Gegevens opnieuw uit foto/PDF lezen';
  console.info('MijnSerenity 8.23.0 slimme bonscanner actief.');
})();
