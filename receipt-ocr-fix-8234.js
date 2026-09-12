/* MijnSerenity 8.25.0 — laad AI-first bonscanner */
(()=>{
'use strict';
if(window.__msReceiptAiLoader8250)return;
window.__msReceiptAiLoader8250=true;
const existing=[...document.scripts].find(s=>{try{return new URL(s.src,location.href).pathname==='/receipt-ai-first.js'}catch{return false}});
if(existing)return;
const script=document.createElement('script');
script.src='/receipt-ai-first.js?v=825000';
script.async=false;
script.dataset.msReceiptAi='1';
script.onerror=()=>console.error('AI-bonscanner kon niet worden geladen.');
document.head.appendChild(script);
})();
