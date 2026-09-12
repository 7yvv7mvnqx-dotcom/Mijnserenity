/* MijnSerenity 8.25.1 — AI-first bonscanner + apart leveranciersveld */
(()=>{
'use strict';
if(window.__msReceiptAiLoader8251)return;
window.__msReceiptAiLoader8251=true;

const existing=[...document.scripts].find(s=>{try{return new URL(s.src,location.href).pathname==='/receipt-ai-first.js'}catch{return false}});
if(!existing){
  const script=document.createElement('script');
  script.src='/receipt-ai-first.js?v=825000';
  script.async=false;
  script.dataset.msReceiptAi='1';
  script.onerror=()=>console.error('AI-bonscanner kon niet worden geladen.');
  document.head.appendChild(script);
}

function receiptNoteLines(notes){
  if(!notes)return [];
  let text='';
  notes.childNodes.forEach(node=>{
    if(node.nodeName==='BR')text+='\n';
    else text+=node.textContent||'';
  });
  return text.split(/\n+/).map(line=>line.trim()).filter(Boolean);
}

function supplierFromCostDetails(scope){
  const notes=scope?.querySelector?.('.inline-cost-notes');
  const line=receiptNoteLines(notes).find(value=>/^(?:leverancier|zaak)\s*:/i.test(value));
  return line?line.replace(/^(?:leverancier|zaak)\s*:\s*/i,'').trim():'';
}

function isCostGrid(grid){
  const labels=[...grid.querySelectorAll(':scope > div > span')]
    .map(node=>String(node.textContent||'').trim().toLowerCase());
  return labels.includes('datum')&&labels.includes('categorie')&&labels.includes('bedrag')&&labels.includes('omschrijving');
}

function enhanceSupplierFields(root=document){
  const grids=[];
  if(root?.matches?.('.inline-cost-grid'))grids.push(root);
  root?.querySelectorAll?.('.inline-cost-grid').forEach(grid=>grids.push(grid));

  grids.forEach(grid=>{
    if(!isCostGrid(grid))return;
    const scope=grid.parentElement;
    const supplier=supplierFromCostDetails(scope);
    let field=grid.querySelector(':scope > [data-ms-cost-supplier-field]');
    if(!field){
      field=document.createElement('div');
      field.dataset.msCostSupplierField='1';
      field.style.gridColumn='1 / -1';
      const label=document.createElement('span');
      label.textContent='Leverancier';
      const value=document.createElement('strong');
      field.append(label,value);
      grid.appendChild(field);
    }
    const value=field.querySelector('strong');
    if(value)value.textContent=supplier||'-';
  });
}

function installSupplierField(){
  const target=document.getElementById('costList');
  enhanceSupplierFields(document);
  if(!target||target.dataset.msSupplierObserver==='1')return;
  target.dataset.msSupplierObserver='1';
  let scheduled=false;
  const observer=new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      enhanceSupplierFields(target);
    });
  });
  observer.observe(target,{childList:true,subtree:true,characterData:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installSupplierField,{once:true});
else installSupplierField();
})();
