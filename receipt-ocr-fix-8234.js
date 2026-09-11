/* MijnSerenity 8.24.3 — automatische bonscan + robuuste bedrag-/artikelherkenning */
(()=>{
'use strict';
if(window.__msReceiptOcrFix8243)return;
window.__msReceiptOcrFix8243=true;
const $=id=>document.getElementById(id);
let installed=false,running=false,worker=null,stream=null,timer=null,capturing=false;
const pending=()=>{try{return [...pendingCostReceiptFiles]}catch{return[]}};

function status(msg,err=false){
  if(typeof window.setCostOcrStatus==='function')return window.setCostOcrStatus(msg,err);
  const el=$('costOcrStatus'); if(!el)return; el.textContent=msg||''; el.classList.toggle('hidden',!msg); el.classList.toggle('receipt-ocr-error',!!err);
}
function timeout(p,ms,msg){let t;return Promise.race([Promise.resolve(p).finally(()=>clearTimeout(t)),new Promise((_,rej)=>t=setTimeout(()=>rej(new Error(msg)),ms))])}
function norm(v){return String(v||'').replace(/\r/g,'').replace(/[\u00a0\t]+/g,' ').replace(/[ ]{2,}/g,' ').replace(/€\s+(?=\d)/g,'€').trim()}
function money(raw){
  let v=String(raw||'').replace(/[€$£\s]/g,'').replace(/[Oo](?=\d)/g,'0');
  if(!v)return null;
  const c=v.lastIndexOf(','),d=v.lastIndexOf('.');
  if(c>-1&&d>-1)v=c>d?v.replace(/\./g,'').replace(',','.'):v.replace(/,/g,'');
  else if(c>-1)v=v.replace(/\./g,'').replace(',','.');
  else if(d>-1){
    const parts=v.split('.');
    if(parts.length>2){const dec=parts.pop();v=parts.join('')+'.'+dec}
  }
  const n=Number(v); return Number.isFinite(n)&&n>=0&&n<1e6?n:null;
}
function compactCents(raw){
  const digits=String(raw||'').replace(/\D/g,'');
  if(digits.length<3||digits.length>7)return null;
  const n=Number(digits)/100;
  return Number.isFinite(n)&&n>=0&&n<1e6?Number(n.toFixed(2)):null;
}
function lineMoney(line){
  return [...String(line||'').matchAll(/(?:€\s*)?\d{1,7}(?:[.\s]\d{3})*[,.]\d{2}/g)].map(m=>money(m[0])).filter(v=>v!=null);
}
function lines(text){return norm(text).split('\n').map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean)}
function moneyFromLabelSegment(segment){
  const s=String(segment||'').trim();
  const normal=lineMoney(s); if(normal.length)return normal[normal.length-1];
  const split=[...s.matchAll(/€?\s*(\d{1,5})\s+([0-9Oo]{2})(?!\d)/g)];
  if(split.length){const m=split[split.length-1];return money(`${m[1]},${m[2].replace(/O/gi,'0')}`)}
  const euro=[...s.matchAll(/€\s*([0-9Oo]{3,7})(?!\d)/gi)];
  if(euro.length)return compactCents(euro[euro.length-1][1].replace(/O/gi,'0'));
  const trailing=s.match(/(?:^|\s)([0-9Oo]{3,7})\s*$/i);
  if(trailing)return compactCents(trailing[1].replace(/O/gi,'0'));
  return null;
}
function mAfter(text,label){
  const doc=lines(text),re=new RegExp(label,'i');
  for(let i=0;i<doc.length;i++){
    const match=doc[i].match(re); if(!match)continue;
    const start=(match.index||0)+match[0].length;
    const sameLine=moneyFromLabelSegment(doc[i].slice(start)); if(sameLine!=null)return sameLine;
    for(let offset=1;offset<=2;offset++){
      const nearby=doc[i+offset]||'';
      if(!nearby)continue;
      if(/\b(?:totaal|total|btw|btv|vat|subtotaal)\b/i.test(nearby))break;
      const value=moneyFromLabelSegment(nearby); if(value!=null)return value;
    }
  }
  return null;
}

function knownMerchant(text){
  const t=norm(text);
  const rules=[
    ['Sikkens Center AGN',/(?:sikkens|sikk.?ns).{0,20}(?:center|cent.?r)|vakmanschap\s+is\s+mensenwerk|contant\s+ssc\s+enschede|h[a-z]*lostraat\s*4|brantho[\s-]*ko(?:rr|tr)ux/i],
    ['Hornbach',/\bhornbach\b/i],['GAMMA',/\bgamma\b/i],['Praxis',/\bpraxis\b/i],['Karwei',/\bkarwei\b/i],['Toolstation',/\btoolstation\b/i],['Action',/\baction\b/i],['Jumbo',/\bjumbo\b/i],['Lidl',/\blidl\b/i],['Aldi',/\baldi\b/i]
  ];
  return rules.find(([,r])=>r.test(t))?.[0]||'';
}
function badText(v){
  const t=String(v||'').replace(/\s+/g,' ').trim(); if(!t||t.length<2||t.length>90)return true;
  if(/^(?:n?ad|arty|e\s?ststeott)\s+m{2,}$/i.test(t))return true;
  const s=t.replace(/\s/g,''); const digits=(s.match(/\d/g)||[]).length,letters=(s.match(/[A-Za-zÀ-ÿ]/g)||[]).length;
  return letters<2||digits/Math.max(1,s.length)>.18||((t.match(/[A-Za-z]\d|\d[A-Za-z]/g)||[]).length>=2);
}
function strongDate(text){
  const t=norm(text); const m=t.match(/\b(?:documentdatum|factuurdatum|bon.?datum|datum)\s*:?\s*(\d{1,2}[-/.]\d{1,2}[-/.]20\d{2})\b/i)||t.match(/\b(\d{1,2}[-/.]\d{1,2}[-/.]20\d{2})\b/);
  if(!m)return''; const [d,mo,y]=m[1].split(/[-/.]/).map(Number); return d&&mo&&y&&d<=31&&mo<=12?`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`:'';
}
function totalIncl(text){
  const direct=mAfter(text,'\\btotaal\\s*(?:incl(?:usief)?|inc[l1])\\.?\\s*(?:btw|btv|vat)\\b')
    ??mAfter(text,'\\btotal\\s*(?:incl(?:usive)?|inc[l1])\\.?\\s*(?:vat|btw)\\b')
    ??mAfter(text,'\\btotaal\\s+te\\s+betalen\\b')
    ??mAfter(text,'\\bte\\s+betalen\\b');
  if(direct!=null)return direct;
  for(const line of lines(text)){
    if(/totaal/i.test(line)&&/(?:incl|btw|vat)/i.test(line)){const v=moneyFromLabelSegment(line);if(v!=null)return v}
  }
  return null;
}
function totalExcl(text){
  const v=mAfter(text,'\\btotaal\\s*(?:excl(?:usief)?|exc[l1])\\.?\\s*(?:btw|btv|vat)\\b');
  if(v!=null)return v;
  for(const line of lines(text)){if(/totaal/i.test(line)&&/excl/i.test(line)){const x=moneyFromLabelSegment(line);if(x!=null)return x}}
  return null;
}
function vatAmount(text){
  const v=mAfter(text,'\\b(?:btw|btv|vat)\\s*\\(?\\s*(?:21|9)\\s*%?\\s*\\)?');
  if(v!=null)return v;
  for(const line of lines(text)){if(/\b(?:btw|btv|vat)\b/i.test(line)&&/%/.test(line)){const x=moneyFromLabelSegment(line.replace(/^.*?%/,'%'));if(x!=null)return x}}
  return null;
}
function strongAmount(text){
  const incl=totalIncl(text); if(incl!=null)return incl;
  const excl=totalExcl(text),vat=vatAmount(text);
  if(excl!=null&&vat!=null)return Number((excl+vat).toFixed(2));
  if(excl!=null&&/\b21\s*%/.test(text))return Number((excl*1.21).toFixed(2));
  return null;
}
function nums(text){
  const t=norm(text);
  return {
    document:(t.match(/\bdocumentnummer\s*\(?(?:pos|pin)?\)?\s*:?\s*([A-Z0-9-]{6,})/i)||t.match(/\bbonnummer\s*:?\s*([A-Z0-9-]{5,})/i)||t.match(/\bfactuurnummer\s*:?\s*([A-Z0-9-]{5,})/i)||[])[1]||'',
    order:(t.match(/\bordernummer\s*:?\s*([A-Z0-9-]{6,})/i)||t.match(/\border\s*:?\s*([A-Z0-9-]{6,})/i)||t.match(/\bbestelnummer\s*:?\s*([A-Z0-9-]{6,})/i)||[])[1]||''
  };
}
function canonicalProduct(text){
  const t=norm(text);
  if(/brantho[\s-]*(?:korrux|kotrux)|brantho[^\n]{0,60}3\s*in\s*1/i.test(t)){
    const size=t.match(/\b(\d{2,4}(?:[,.]\d+)?)\s*m[l1i]\b/i)||t.match(/\b(\d+(?:[,.]\d+)?)\s*l\b/i);
    const ralRaw=(t.match(/\bral\s*[-:]?\s*([0-9ogqil]{4})\b/i)||[])[1]||'';
    const ral=ralRaw.toLowerCase().replace(/[oq]/g,'0').replace(/g/g,'9').replace(/[il]/g,'1');
    const sizeText=size?.[1]?`${size[1].replace('.',',')} ${/m[l1i]/i.test(size[0])?'ml':'l'}`:'';
    return ['Brantho-Korrux 3 in 1',sizeText,/^\d{4}$/.test(ral)?`RAL${ral}`:''].filter(Boolean).join(' ');
  }
  return '';
}
function lineItems(text){
  const out=[];
  for(const line of lines(text)){
    const m=line.match(/(?:^|\s)(\d{5,8})\s+(.{4,160})/); if(!m)continue;
    let d=m[2].replace(/\bundefined\b/gi,'').trim();
    const euroIndex=d.search(/\s€\s*[0-9Oo]/i); if(euroIndex>=0)d=d.slice(0,euroIndex).trim();
    d=d.replace(/\s+\d{1,3}\s*$/,'').replace(/\s{2,}/g,' ').trim(); if(d.length<4)continue;
    const canonical=canonicalProduct(d); if(canonical)d=canonical;
    const key=(m[1]+'|'+d).toLowerCase(); if(!out.some(x=>x.key===key))out.push({key,article:m[1],description:d});
  }
  return out.slice(0,5);
}
function harden(text,parsed={}){
  const p={...parsed},m=knownMerchant(text),d=strongDate(text),a=strongAmount(text),items=lineItems(text),n=nums(text),prod=canonicalProduct(text),ex=totalExcl(text),vat=vatAmount(text);
  if(m)p.merchant=m; if(d)p.date=d; if(a!=null)p.amount=a;
  if(m==='Sikkens Center AGN'||/\b(?:brantho|korrux|kotrux|verf|lak|primer|coating)\b/i.test(text))p.category='Onderhoud';
  if(prod)p.summary=prod; else if(items.length)p.summary=items.length===1?items[0].description:`${items[0].description} + ${items.length-1} artikel${items.length>2?'en':''}`; else if(badText(p.summary)&&m)p.summary=m;
  p._strongAmount=a; p._merchant=m; p._date=d; p._items=items; p._numbers=n; p._excl=ex; p._vat=vat; p._product=prod;
  p.review={...(p.review||{})}; if(a!=null)p.review.amount=false; if(d)p.review.date=false; if(m)p.review.merchant=false; if(p.summary&&!badText(p.summary))p.review.description=false; if(p.category==='Onderhoud')p.review.category=false;
  return p;
}
function parse(text){let base={};try{base=window.MSReceiptReaderPro?.parseReceiptText?.(text)||{}}catch{}return harden(text,base)}
function details(text,p){
  const l=[]; if(p.merchant&&!badText(p.merchant))l.push(`Leverancier: ${p.merchant}`); if(p.date)l.push(`Datum: ${p.date.split('-').reverse().join('-')}`);
  if(p._numbers.document)l.push(`Bonnummer: ${p._numbers.document}`); if(p._numbers.order)l.push(`Ordernummer: ${p._numbers.order}`);
  const seen=new Set(); const items=[]; if(p._product)items.push({article:p._items[0]?.article||'',description:p._product}); else items.push(...p._items);
  if(items.length){l.push('','Materialen / artikelen:');for(const i of items){const key=(i.article+'|'+i.description).toLowerCase();if(!seen.has(key)){seen.add(key);l.push(`• ${i.article?i.article+' ':''}${i.description}`)}}}
  if(p._excl!=null)l.push('',`Totaal excl. BTW: €${p._excl.toFixed(2).replace('.',',')}`); if(p._vat!=null)l.push(`BTW: €${p._vat.toFixed(2).replace('.',',')}`); if(p.amount!=null)l.push(`Totaal incl. BTW: €${Number(p.amount).toFixed(2).replace('.',',')}`);
  return l.join('\n').trim()||String(p.details||'').trim();
}
function apply(text){
  const p=parse(text),found=[],review=[];
  if(p.amount!=null&&$('costAmount')){$('costAmount').value=Number(p.amount).toFixed(2);found.push(`bedrag €${Number(p.amount).toFixed(2).replace('.',',')}`)}else review.push('bedrag');
  if(p.date&&$('costDate')){$('costDate').value=p.date;found.push(`datum ${p.date.split('-').reverse().join('-')}`)}else review.push('datum');
  if(p.summary&&!badText(p.summary)&&$('costDescription')){$('costDescription').value=p.summary;found.push(`omschrijving ${p.summary}`)}else review.push('omschrijving');
  if(p.category&&$('costCategory')){const sel=$('costCategory');if(![...sel.options].some(o=>o.value===p.category)){const o=document.createElement('option');o.value=o.textContent=p.category;sel.appendChild(o)}sel.value=p.category}
  if($('costReceiptDetails')){$('costReceiptDetails').value=details(text,p);$('costReceiptDetailsWrap')?.classList.toggle('hidden',!$('costReceiptDetails').value)}
  status(found.length?`Gevonden: ${found.join(' · ')}${review.length?`. Controleer nog: ${[...new Set(review)].join(', ')}.`:'.'}`:'Bon gelezen, maar nog onvoldoende betrouwbaar. Scan opnieuw.',!found.length);
  return p;
}

async function imageBitmap(blob){if(typeof createImageBitmap==='function'){try{return await createImageBitmap(blob,{imageOrientation:'from-image'})}catch{try{return await createImageBitmap(blob)}catch{}}}return new Promise((res,rej)=>{const u=URL.createObjectURL(blob),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);res(im)};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('Foto openen mislukt.'))};im.src=u})}
function canvasBlob(c,q=.95){return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('Afbeelding verwerken mislukt.')),'image/jpeg',q))}
async function region(file,y0,y1,contrast=1.35){
  const im=await imageBitmap(file),w=Number(im.width||im.naturalWidth),h=Number(im.height||im.naturalHeight); const sy=Math.round(h*y0),sh=Math.max(1,Math.round(h*(y1-y0)));
  const scale=Math.min(3,2600/Math.max(w,sh)); const c=document.createElement('canvas');c.width=Math.max(1200,Math.round(w*scale));c.height=Math.max(700,Math.round(sh*scale));
  const x=c.getContext('2d',{alpha:false,willReadFrequently:true});x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,sy,w,sh,0,0,c.width,c.height);try{im.close?.()}catch{}
  const d=x.getImageData(0,0,c.width,c.height),p=d.data;let min=255,max=0;for(let i=0;i<p.length;i+=4){const g=Math.round(.299*p[i]+.587*p[i+1]+.114*p[i+2]);min=Math.min(min,g);max=Math.max(max,g);p[i]=p[i+1]=p[i+2]=g}
  const span=Math.max(35,max-min);for(let i=0;i<p.length;i+=4){let g=(p[i]-min)*255/span;g=(g-128)*contrast+128;g=Math.max(0,Math.min(255,g));p[i]=p[i+1]=p[i+2]=g}x.putImageData(d,0,0);return canvasBlob(c,.96);
}
async function recognize(img,mode='6',label='Bon lezen…'){
  await worker.setParameters({tessedit_pageseg_mode:String(mode),preserve_interword_spaces:'1',user_defined_dpi:'300'}); status(label); const r=await timeout(worker.recognize(img),32000,'Bon lezen duurde te lang.');return String(r?.data?.text||'').trim();
}
async function scanImage(file){
  if(!file?.type?.startsWith('image/'))return;if(running)return;running=true;status('Bon voorbereiden…');
  try{
    const T=window.Tesseract||await timeout(window.loadReceiptOcrLibrary(),15000,'OCR laden duurde te lang.'); const imgs=await timeout(window.prepareReceiptImageForOcr(file),12000,'Bon voorbereiden duurde te lang.');
    worker=await timeout(T.createWorker('nld+eng',1,{logger:m=>m?.status==='recognizing text'&&status(`Bon lezen… ${Math.round(Number(m.progress||0)*100)}%`)}),30000,'OCR starten duurde te lang.');
    let full=await recognize(imgs?.soft||file,'6','Hele bon lezen…'); let combined=full; let p=parse(combined);
    if(!p._merchant||badText(p.merchant)||!p._date){try{const head=await region(file,0,.58,1.45);combined=[combined,await recognize(head,'6','Leverancier en datum lezen…')].filter(Boolean).join('\n');p=parse(combined)}catch(e){console.warn('Kop-OCR overgeslagen',e)}}
    if(p._strongAmount==null){try{const foot=await region(file,.68,1,1.85);combined=[combined,await recognize(foot,'6','Totaalbedrag lezen…')].filter(Boolean).join('\n');p=parse(combined);if(p._strongAmount==null){combined=[combined,await recognize(foot,'11','Totaalbedrag extra controleren…')].filter(Boolean).join('\n');p=parse(combined)}}catch(e){console.warn('Totaal-OCR overgeslagen',e)}}
    if((p._strongAmount==null||!p._merchant)&&imgs?.binary){try{combined=[combined,await recognize(imgs.binary,'4','Bon extra controleren…')].filter(Boolean).join('\n');p=parse(combined)}catch(e){console.warn('Extra OCR overgeslagen',e)}}
    if(!combined.trim())throw new Error('Geen leesbare tekst gevonden.'); apply(combined);
  }catch(e){console.error(e);status('Bon kon niet goed worden gelezen. Zorg voor goed licht, geen schaduw en de hele bon in beeld.',true)}finally{try{await worker?.terminate?.()}catch{}worker=null;running=false}
}

function stop(){if(timer){clearInterval(timer);timer=null}try{stream?.getTracks?.().forEach(t=>t.stop())}catch{}stream=null;capturing=false;document.body.classList.remove('ms-receipt-scanner-open');$('msReceiptDocumentScanner')?.remove()}
function style(){
  if($('msReceiptDocumentScannerStyle'))return; const s=document.createElement('style');s.id='msReceiptDocumentScannerStyle';s.textContent=`
  body.ms-receipt-scanner-open{overflow:hidden!important} body.ms-receipt-scanner-open .tabs,body.ms-receipt-scanner-open nav,body.ms-receipt-scanner-open [class*="bottom"],body.ms-receipt-scanner-open [class*="dock"]{visibility:hidden!important}
  #msReceiptDocumentScanner{position:fixed!important;inset:0!important;z-index:2147483647!important;background:#020b12;color:#fff;display:flex;flex-direction:column;font-family:inherit;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}
  #msReceiptDocumentScanner .top{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;font-weight:800}#msReceiptDocumentScanner .top button{background:transparent;border:0;color:#fff;font:inherit;padding:10px}
  #msReceiptDocumentScanner .stage{position:relative;flex:1;min-height:0;background:#000;overflow:hidden}#msReceiptDocumentScanner video{width:100%;height:100%;object-fit:cover}
  #msReceiptDocumentScanner .guide{position:absolute;left:7%;right:7%;top:6%;bottom:7%;border:3px solid #f5b800;border-radius:18px;box-shadow:0 0 0 9999px rgba(0,0,0,.22);transition:.2s}#msReceiptDocumentScanner .guide.ready{border-color:#45d483}
  #msReceiptDocumentScanner .help{position:absolute;left:8%;right:8%;bottom:2.5%;text-align:center;background:rgba(0,0,0,.76);padding:10px;border-radius:12px;font-size:14px}
  #msReceiptDocumentScanner .auto{padding:12px 16px calc(16px + env(safe-area-inset-bottom));text-align:center;background:#020b12;font-size:14px;color:#b9d7e7;min-height:44px}`;document.head.appendChild(s);
}
function probe(video){const vw=video.videoWidth,vh=video.videoHeight;if(!vw||!vh)return null;const w=160,h=Math.max(100,Math.round(vh/vw*w)),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(video,0,0,w,h);const d=x.getImageData(0,0,w,h).data,g=new Uint8Array(w*h);let sum=0,dark=0,bright=0;for(let i=0,j=0;i<d.length;i+=4,j++){const v=Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]);g[j]=v;sum+=v;if(v<72)dark++;if(v>190)bright++}return{g,avg:sum/g.length,dark:dark/g.length,bright:bright/g.length}}
function diff(a,b){if(!a||!b||a.length!==b.length)return 999;let s=0,n=0;for(let i=0;i<a.length;i+=4){s+=Math.abs(a[i]-b[i]);n++}return s/Math.max(1,n)}
async function frame(video){const vw=video.videoWidth,vh=video.videoHeight;if(!vw||!vh)throw new Error('Camera nog niet klaar.');const sx=Math.round(vw*.07),sy=Math.round(vh*.06),sw=Math.round(vw*.86),sh=Math.round(vh*.87),c=document.createElement('canvas');c.width=sw;c.height=sh;const x=c.getContext('2d',{alpha:false});x.drawImage(video,sx,sy,sw,sh,0,0,sw,sh);return canvasBlob(c,.99)}
function auto(video,overlay,capture){
  let prev=null,stable=0,warm=0;const guide=overlay.querySelector('.guide'),help=overlay.querySelector('.help'),txt=overlay.querySelector('.auto');
  timer=setInterval(async()=>{if(capturing||video.readyState<2)return;const q=probe(video);if(!q)return;warm++;
    const movement=diff(q.g,prev);prev=q.g;const light=q.avg>95&&q.bright>.10;const shadow=q.dark<.22;
    if(!light){stable=0;guide.classList.remove('ready');help.textContent='Meer licht nodig voor een scherpe scan.';txt.textContent='Wachten op voldoende licht…';return}
    if(!shadow){stable=0;guide.classList.remove('ready');help.textContent='Er valt te veel schaduw op de bon. Verplaats de iPad of lichtbron.';txt.textContent='Automatische foto wacht tot de bon goed leesbaar is…';return}
    if(warm<4||movement>7){stable=0;guide.classList.remove('ready');help.textContent='Houd de iPad even stil boven de bon.';txt.textContent='Automatisch scherpstellen…';return}
    stable++;guide.classList.toggle('ready',stable>=2);txt.textContent=stable>=2?'Bon staat goed — foto wordt automatisch gemaakt…':'Bijna klaar…';
    if(stable>=4){capturing=true;clearInterval(timer);timer=null;try{await capture()}catch(e){capturing=false;status(e?.message||'Foto maken mislukt.',true)}}
  },350);
}
async function openScanner(){
  style();stop();const o=document.createElement('div');o.id='msReceiptDocumentScanner';o.innerHTML=`<div class="top"><button type="button" data-cancel>Annuleren</button><span>Scan bon automatisch</span><span style="width:72px"></span></div><div class="stage"><video playsinline autoplay muted></video><div class="guide"></div><div class="help">Leg de hele bon vlak binnen het kader. De foto wordt automatisch gemaakt.</div></div><div class="auto">Camera starten…</div>`;document.body.appendChild(o);document.body.classList.add('ms-receipt-scanner-open');o.querySelector('[data-cancel]').onclick=stop;
  try{stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:3840},height:{ideal:2160}}});const v=o.querySelector('video');v.srcObject=stream;await v.play();
    const capture=async()=>{const blob=await frame(v),file=new File([blob],`bon-${new Date().toISOString().replace(/[:.]/g,'-')}.jpg`,{type:'image/jpeg'});stop();window.addCostReceiptFiles?.([file])};auto(v,o,capture);
  }catch(e){stop();const input=$('costReceiptCamera');if(input){input.dataset.msNative='1';input.click();setTimeout(()=>delete input.dataset.msNative,1200)}else status('Camera kon niet worden geopend.',true)}
}
function install(){
  if(installed)return true;if(typeof window.addCostReceiptFiles!=='function'||typeof window.scanCostReceipt!=='function'||typeof window.loadReceiptOcrLibrary!=='function'||!window.MSReceiptReaderPro)return false;installed=true;
  const originalAdd=window.addCostReceiptFiles,originalScan=window.scanCostReceipt;
  window.scanCostReceipt=file=>file?.type?.startsWith('image/')?scanImage(file):originalScan(file);
  window.addCostReceiptFiles=function(fileList){const before=new Set(pending());originalAdd.call(this,fileList);const added=pending().find(f=>!before.has(f));if(added)queueMicrotask(()=>added.type?.startsWith('image/')?scanImage(added):originalScan(added))};
  window.scanFirstPendingCostReceipt=function(){const f=pending().find(x=>x?.type?.startsWith('image/')||x?.type==='application/pdf'||/\.pdf$/i.test(x?.name||''));if(!f)return status('Voeg eerst een foto of PDF toe.',true);return f.type?.startsWith('image/')?scanImage(f):originalScan(f)};
  const input=$('costReceiptCamera');if(input&&input.dataset.msAutoScanner!=='1'){input.dataset.msAutoScanner='1';input.addEventListener('click',e=>{if(input.dataset.msNative==='1')return;if(navigator.mediaDevices?.getUserMedia){e.preventDefault();openScanner()}});const label=input.closest('label');if(label){const n=[...label.childNodes].find(x=>x.nodeType===Node.TEXT_NODE&&String(x.textContent||'').trim());if(n)n.textContent=' 📄 Scan automatisch ';}}
  const retry=$('costOcrRetryButton');if(retry)retry.textContent='✨ Gegevens opnieuw uit foto/PDF lezen';console.info('MijnSerenity 8.24.3 bonscanner actief.');return true;
}
window.MSReceiptOcrFix8243={version:'8.24.3',parseText:parse,detailsForText:text=>{const p=parse(text);return details(text,p)},strongAmount,totalIncl,totalExcl,vatAmount,canonicalProduct};
function wait(n=0){if(install())return;if(n<240)setTimeout(()=>wait(n+1),100)}
window.addEventListener('pagehide',()=>{try{worker?.terminate?.()}catch{}stop()},{once:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>wait(),{once:true});else wait();
})();
