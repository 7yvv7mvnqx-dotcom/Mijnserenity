/* MijnSerenity 8.25.0 — AI-first bonscanner met lokale OCR als reserve */
(()=>{
'use strict';
if(window.__msReceiptAiFirst8250)return;
window.__msReceiptAiFirst8250=true;
const $=id=>document.getElementById(id);
let installed=false,running=false,stream=null,timer=null,capturing=false,torchOn=false;
const pending=()=>{try{return [...pendingCostReceiptFiles]}catch{return[]}};

function status(msg,err=false){
  if(typeof window.setCostOcrStatus==='function')return window.setCostOcrStatus(msg,err);
  const el=$('costOcrStatus');
  if(!el)return;
  el.textContent=msg||'';
  el.classList.toggle('hidden',!msg);
  el.classList.toggle('receipt-ocr-error',!!err);
}
function timeout(p,ms,msg){let t;return Promise.race([Promise.resolve(p).finally(()=>clearTimeout(t)),new Promise((_,rej)=>t=setTimeout(()=>rej(new Error(msg)),ms))])}
function validDate(v){return /^20\d{2}-\d{2}-\d{2}$/.test(String(v||''))}
function money(v){const n=Number(v);return Number.isFinite(n)&&n>=0?n:null}
function formatEuro(v){const n=money(v);return n==null?'':`€${n.toFixed(2).replace('.',',')}`}
function categories(){const s=$('costCategory');return s?[...s.options].map(o=>String(o.value||o.textContent||'').trim()).filter(Boolean):[]}

async function bitmap(blob){
  if(typeof createImageBitmap==='function'){
    try{return await createImageBitmap(blob,{imageOrientation:'from-image'})}catch{try{return await createImageBitmap(blob)}catch{}}
  }
  return new Promise((res,rej)=>{const u=URL.createObjectURL(blob),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);res(im)};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('Foto openen mislukt.'))};im.src=u});
}
function canvasBlob(c,q=.9){return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('Afbeelding verwerken mislukt.')),'image/jpeg',q))}
function blobDataUrl(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result||''));r.onerror=()=>rej(new Error('Bonfoto kon niet worden verzonden.'));r.readAsDataURL(blob)})}
async function imageForAi(file){
  const im=await bitmap(file),w=Number(im.width||im.naturalWidth),h=Number(im.height||im.naturalHeight);
  const max=2400,scale=Math.min(1,max/Math.max(w,h));
  const c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));
  const x=c.getContext('2d',{alpha:false});x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,w,h,0,0,c.width,c.height);try{im.close?.()}catch{}
  return blobDataUrl(await canvasBlob(c,.9));
}

function detailsForAi(r){
  const out=[];
  if(r.merchant)out.push(`Leverancier: ${r.merchant}`);
  if(r.date)out.push(`Datum: ${r.date.split('-').reverse().join('-')}`);
  if(r.receipt_number)out.push(`Bonnummer: ${r.receipt_number}`);
  if(r.order_number)out.push(`Ordernummer: ${r.order_number}`);
  if(Array.isArray(r.items)&&r.items.length){
    out.push('','Materialen / artikelen:');
    r.items.forEach(item=>{
      const article=String(item?.article_number||'').trim();
      const desc=String(item?.description||'').trim();
      if(!article&&!desc)return;
      const extras=[];
      if(money(item?.quantity)!=null)extras.push(`aantal ${Number(item.quantity)}`);
      if(money(item?.line_total)!=null)extras.push(formatEuro(item.line_total));
      out.push(`• ${article?article+' ':''}${desc}${extras.length?' — '+extras.join(' · '):''}`.trim());
    });
  }
  if(money(r.subtotal_ex_vat)!=null)out.push('',`Totaal excl. BTW: ${formatEuro(r.subtotal_ex_vat)}`);
  if(money(r.vat_amount)!=null)out.push(`BTW: ${formatEuro(r.vat_amount)}`);
  if(money(r.total_amount)!=null)out.push(`Totaal incl. BTW: ${formatEuro(r.total_amount)}`);
  return out.join('\n').trim();
}

function applyAi(r,model=''){
  const found=[];
  const amount=money(r?.total_amount);
  if(amount!=null&&$('costAmount')){$('costAmount').value=amount.toFixed(2);found.push(`bedrag ${formatEuro(amount)}`)}
  if(validDate(r?.date)&&$('costDate')){$('costDate').value=r.date;found.push(`datum ${r.date.split('-').reverse().join('-')}`)}
  if(String(r?.summary||'').trim()&&$('costDescription')){$('costDescription').value=String(r.summary).trim();found.push(`omschrijving ${String(r.summary).trim()}`)}
  if(String(r?.category||'').trim()&&$('costCategory')){
    const s=$('costCategory');
    if([...s.options].some(o=>o.value===r.category||String(o.textContent||'').trim()===r.category))s.value=r.category;
  }
  const details=detailsForAi(r||{});
  if(details&&$('costReceiptDetails')){$('costReceiptDetails').value=details;$('costReceiptDetailsWrap')?.classList.remove('hidden')}
  if(typeof window.showCostReceiptDetails==='function'&&details)window.showCostReceiptDetails(details);
  const itemCount=Array.isArray(r?.items)?r.items.length:0;
  status(`🤖 AI gelezen: ${found.join(' · ')}${itemCount?` · ${itemCount} artikel${itemCount===1?'':'en'}`:''}.`);
}

function aiComplete(r){
  return Boolean(
    String(r?.merchant||'').trim()&&
    validDate(r?.date)&&
    money(r?.total_amount)!=null&&
    String(r?.summary||'').trim()&&
    Array.isArray(r?.items)&&r.items.length
  );
}

async function readAi(file){
  status('🤖 ChatGPT leest de bon…');
  const image=await timeout(imageForAi(file),10000,'Bonfoto voorbereiden duurde te lang.');
  const controller=new AbortController();
  const t=setTimeout(()=>controller.abort(),35000);
  try{
    const response=await fetch('/.netlify/functions/receipt-ai',{
      method:'POST',signal:controller.signal,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({image,categories:categories()})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data?.error||'AI-bonherkenning mislukt.');
    if(!data?.receipt)throw new Error('AI gaf geen bongegevens terug.');
    return data;
  }finally{clearTimeout(t)}
}

async function scanAiFirst(file,originalScan){
  if(!file?.type?.startsWith('image/')||running)return;
  running=true;
  try{
    const data=await readAi(file);
    if(aiComplete(data.receipt)){
      applyAi(data.receipt,data.model);
      return;
    }
    console.warn('AI-bonherkenning was onvolledig; lokale OCR wordt gebruikt.',data.receipt);
    status('AI las de bon gedeeltelijk. Lokale reserveherkenning controleert de rest…');
  }catch(error){
    console.warn('AI-bonherkenning niet beschikbaar:',error);
    status('AI-bonherkenning lukt nu niet. Lokale reserveherkenning wordt gebruikt…');
  }finally{
    running=false;
  }
  return originalScan?.(file);
}

function stop(){
  if(timer){clearInterval(timer);timer=null}
  torchOn=false;
  try{stream?.getTracks?.().forEach(t=>t.stop())}catch{}
  stream=null;capturing=false;
  document.body.classList.remove('ms-receipt-scanner-open');
  $('msReceiptDocumentScanner')?.remove();
}
function css(){
  if($('msReceiptDocumentScannerStyle'))return;
  const s=document.createElement('style');s.id='msReceiptDocumentScannerStyle';s.textContent=`
  body.ms-receipt-scanner-open{overflow:hidden!important}
  body.ms-receipt-scanner-open .tabs,body.ms-receipt-scanner-open nav,body.ms-receipt-scanner-open [class*="bottom"],body.ms-receipt-scanner-open [class*="dock"]{visibility:hidden!important}
  #msReceiptDocumentScanner{position:fixed!important;inset:0!important;z-index:2147483647!important;background:#020b12;color:#fff;display:flex;flex-direction:column;font-family:inherit;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}
  #msReceiptDocumentScanner .top{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;font-weight:800;gap:8px}
  #msReceiptDocumentScanner .top button{background:transparent;border:0;color:#fff;font:inherit;padding:10px;min-width:78px}
  #msReceiptDocumentScanner .torch{background:#173044!important;border-radius:12px!important;visibility:hidden}
  #msReceiptDocumentScanner .stage{position:relative;flex:1;min-height:0;background:#000;overflow:hidden}
  #msReceiptDocumentScanner video{width:100%;height:100%;object-fit:cover}
  #msReceiptDocumentScanner .guide{position:absolute;left:7%;right:7%;top:6%;bottom:7%;border:3px solid #f5b800;border-radius:18px;box-shadow:0 0 0 9999px rgba(0,0,0,.16);transition:.18s}
  #msReceiptDocumentScanner .guide.ready{border-color:#45d483}
  #msReceiptDocumentScanner .help{position:absolute;left:8%;right:8%;bottom:3%;text-align:center;background:rgba(0,0,0,.72);padding:9px 12px;border-radius:12px;font-size:14px}
  #msReceiptDocumentScanner .controls{display:flex;justify-content:center;padding:10px 16px 8px;background:#020b12}
  #msReceiptDocumentScanner .capture{border:0;border-radius:999px;background:#fff;color:#071420;font-weight:900;font-size:16px;padding:13px 25px;min-width:180px}
  #msReceiptDocumentScanner .auto{padding:0 16px calc(12px + env(safe-area-inset-bottom));text-align:center;background:#020b12;font-size:13px;color:#b9d7e7;min-height:30px}`;
  document.head.appendChild(s);
}
function probe(v){
  const vw=v.videoWidth,vh=v.videoHeight;if(!vw||!vh)return null;
  const sx=Math.round(vw*.07),sy=Math.round(vh*.06),sw=Math.round(vw*.86),sh=Math.round(vh*.87),w=180,h=Math.max(120,Math.round(sh/sw*w));
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(v,sx,sy,sw,sh,0,0,w,h);
  const d=x.getImageData(0,0,w,h).data,g=new Uint8Array(w*h);let sum=0,bright=0;
  for(let i=0,j=0;i<d.length;i+=4,j++){const n=Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]);g[j]=n;sum+=n;if(n>175)bright++}
  return{g,avg:sum/g.length,bright:bright/g.length};
}
function movement(a,b){if(!a||!b||a.length!==b.length)return 999;let s=0,n=0;for(let i=0;i<a.length;i+=5){s+=Math.abs(a[i]-b[i]);n++}return s/Math.max(1,n)}
async function frame(v){
  const vw=v.videoWidth,vh=v.videoHeight;if(!vw||!vh)throw new Error('Camera nog niet klaar.');
  const sx=Math.round(vw*.07),sy=Math.round(vh*.06),sw=Math.round(vw*.86),sh=Math.round(vh*.87),c=document.createElement('canvas');c.width=sw;c.height=sh;c.getContext('2d',{alpha:false}).drawImage(v,sx,sy,sw,sh,0,0,sw,sh);return canvasBlob(c,.98);
}
async function torch(track,on,b){try{if(!track?.getCapabilities?.().torch)return false;await track.applyConstraints({advanced:[{torch:Boolean(on)}]});torchOn=Boolean(on);b.style.visibility='visible';b.textContent=torchOn?'🔦 Licht uit':'🔦 Licht aan';return true}catch{return false}}
function auto(v,o,take){
  let prev=null,stable=0,warm=0;const guide=o.querySelector('.guide'),help=o.querySelector('.help'),txt=o.querySelector('.auto');
  timer=setInterval(async()=>{if(capturing||v.readyState<2)return;const q=probe(v);if(!q)return;warm++;const mv=movement(q.g,prev);prev=q.g;const light=q.avg>58||q.bright>.025;
    if(!light){stable=Math.max(0,stable-1);guide.classList.remove('ready');help.textContent=torchOn?'Houd de hele bon binnen het kader.':'Weinig licht — gebruik eventueel de zaklamp.';txt.textContent='Je kunt altijd direct op Maak foto tikken.';return}
    if(warm<3){help.textContent='Camera stelt scherp…';return}
    if(mv>22){stable=Math.max(0,stable-1);guide.classList.remove('ready');help.textContent='Ongeveer stilhouden is genoeg.';txt.textContent='Je kunt altijd direct op Maak foto tikken.';return}
    stable++;guide.classList.toggle('ready',stable>=2);help.textContent=stable>=2?'Bon staat goed in beeld.':'Bijna goed — nog heel even.';txt.textContent=stable>=2?'Foto wordt automatisch gemaakt…':'Automatische opname is actief.';if(stable>=3)await take();
  },300);
}
async function openScanner(){
  css();stop();
  const o=document.createElement('div');o.id='msReceiptDocumentScanner';o.innerHTML=`<div class="top"><button type="button" data-cancel>Annuleren</button><span>Scan bon met AI</span><button type="button" class="torch" data-torch>🔦 Licht aan</button></div><div class="stage"><video playsinline autoplay muted></video><div class="guide"></div><div class="help">Leg de hele bon binnen het kader. Perfect stilhouden hoeft niet.</div></div><div class="controls"><button type="button" class="capture" data-capture>📸 Maak foto</button></div><div class="auto">Camera starten…</div>`;
  document.body.appendChild(o);document.body.classList.add('ms-receipt-scanner-open');o.querySelector('[data-cancel]').onclick=stop;
  try{
    stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:2560},height:{ideal:1920},frameRate:{ideal:30,max:30}}});
    const v=o.querySelector('video'),track=stream.getVideoTracks()[0],tb=o.querySelector('[data-torch]');v.srcObject=stream;await v.play();
    const caps=track?.getCapabilities?.()||{};
    try{const adv={};if(caps.focusMode?.includes?.('continuous'))adv.focusMode='continuous';if(caps.exposureMode?.includes?.('continuous'))adv.exposureMode='continuous';if(Object.keys(adv).length)track.applyConstraints({advanced:[adv]}).catch(()=>{})}catch{}
    if(caps.torch){tb.style.visibility='visible';tb.onclick=()=>torch(track,!torchOn,tb);setTimeout(()=>torch(track,true,tb),250)}
    const take=async()=>{if(capturing)return;capturing=true;if(timer){clearInterval(timer);timer=null}try{const f=new File([await frame(v)],`bon-${new Date().toISOString().replace(/[:.]/g,'-')}.jpg`,{type:'image/jpeg'});stop();window.addCostReceiptFiles?.([f])}catch(e){capturing=false;throw e}};
    o.querySelector('[data-capture]').onclick=()=>take().catch(e=>status(e.message||'Foto maken mislukt.',true));auto(v,o,take);
  }catch(error){
    stop();const i=$('costReceiptCamera');if(i){i.dataset.msNative='1';i.click();setTimeout(()=>delete i.dataset.msNative,1200)}else status('Camera kon niet worden geopend.',true);
  }
}

function install(){
  if(installed)return true;
  if(typeof window.addCostReceiptFiles!=='function'||typeof window.scanCostReceipt!=='function')return false;
  installed=true;
  const originalScan=window.scanCostReceipt;
  window.scanCostReceipt=file=>file?.type?.startsWith('image/')?scanAiFirst(file,originalScan):originalScan(file);
  window.scanFirstPendingCostReceipt=function(){const f=pending().find(x=>x?.type?.startsWith('image/')||x?.type==='application/pdf'||/\.pdf$/i.test(x?.name||''));if(!f)return status('Voeg eerst een foto of PDF toe.',true);return f.type?.startsWith('image/')?scanAiFirst(f,originalScan):originalScan(f)};
  const input=$('costReceiptCamera');
  if(input&&input.dataset.msAiScanner!=='1'){
    input.dataset.msAiScanner='1';
    input.addEventListener('click',e=>{if(input.dataset.msNative==='1')return;if(navigator.mediaDevices?.getUserMedia){e.preventDefault();e.stopImmediatePropagation();openScanner()}},{capture:true});
  }
  const retry=$('costOcrRetryButton');if(retry)retry.textContent='🤖 Bon opnieuw met AI lezen';
  console.info('MijnSerenity 8.25.0 AI-bonscanner actief.');
  return true;
}
function wait(n=0){if(install())return;if(n<240)setTimeout(()=>wait(n+1),100)}
window.addEventListener('pagehide',stop,{once:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>wait(),{once:true});else wait();
})();
