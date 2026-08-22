/* MijnSerenity 7.18.15 — kostenformulier iPhone + bonbedrag */
(()=>{
  'use strict';
  const BUILD='7.18.15';

  function parseMoney(raw){
    let value=String(raw||'').replace(/[€\s]/g,'').trim();
    if(!value)return null;
    const comma=value.lastIndexOf(',');
    const dot=value.lastIndexOf('.');
    if(comma>-1&&dot>-1){
      value=comma>dot?value.replace(/\./g,'').replace(',','.'):value.replace(/,/g,'');
    }else if(comma>-1){
      value=value.replace(/\./g,'').replace(',','.');
    }
    const number=Number(value);
    return Number.isFinite(number)&&number>0&&number<1000000?number:null;
  }

  function formatMoney(value){
    return Number(value).toFixed(2).replace('.',',');
  }

  function cleanDetails(details){
    const lines=String(details||'').replace(/\r/g,'').split('\n');
    const seenBullets=new Set();
    const output=[];
    for(const line of lines){
      const trimmed=line.trim();
      if(/^[•·*-]\s+/.test(trimmed)){
        const key=trimmed.toLowerCase().replace(/\s+/g,' ');
        if(seenBullets.has(key))continue;
        seenBullets.add(key);
      }
      output.push(line);
    }
    return output.join('\n').replace(/\n{3,}/g,'\n\n').trim();
  }

  function labelledMoney(text,label){
    const pattern=new RegExp(`${label}\\s*:?\\s*€?\\s*([\\d.]+,\\d{2})`,'i');
    const match=String(text||'').match(pattern);
    return match?parseMoney(match[1]):null;
  }

  function bulletTotal(text){
    const bulletLines=String(text||'').split('\n').filter(line=>/^[\s]*[•·*-]\s+/.test(line));
    const values=[];
    const seen=new Set();
    for(const line of bulletLines){
      const key=line.trim().toLowerCase().replace(/\s+/g,' ');
      if(seen.has(key))continue;
      seen.add(key);
      const matches=[...line.matchAll(/€\s*([\d.]+,\d{2})/g)];
      if(!matches.length)continue;
      // De laatste euro-waarde op een artikelregel is het regeltotaal.
      // Een voorloop zoals "6 ×" wordt daarom niet nogmaals vermenigvuldigd.
      const value=parseMoney(matches[matches.length-1][1]);
      if(value!==null)values.push(value);
    }
    if(values.length<2)return null;
    return Number(values.reduce((sum,value)=>sum+value,0).toFixed(2));
  }

  function explicitFinalTotal(text){
    const patterns=[
      /(?:^|\n)\s*(?:totaal\s+te\s+betalen|eindtotaal|te\s+betalen|grand\s+total|amount\s+due)\s*:?\s*€?\s*([\d.]+,\d{2})\b/i,
      /(?:^|\n)\s*(?:totaal|order\s+total)\b\s*:?\s*€?\s*([\d.]+,\d{2})\b/i
    ];
    for(const pattern of patterns){
      const match=String(text||'').match(pattern);
      const value=match?parseMoney(match[1]):null;
      if(value!==null)return value;
    }
    return null;
  }

  function inferTaxFromSubtotal(subtotal,total){
    if(subtotal===null||total===null||total<=subtotal)return null;
    for(const rate of [0.21,0.09]){
      const expected=Number((subtotal*(1+rate)).toFixed(2));
      if(Math.abs(expected-total)<=0.03){
        return {
          rate,
          vat:Number((total-subtotal).toFixed(2)),
          total
        };
      }
    }
    return null;
  }

  function reconcileDetails(details){
    let text=cleanDetails(details);
    const finalTotal=explicitFinalTotal(text);
    const subtotal=labelledMoney(text,'subtotaal');
    const exclusive=labelledMoney(text,'exclusief\\s+btw');
    const vat21=labelledMoney(text,'btw\\s*21\\s*%');
    const vat9=labelledMoney(text,'btw\\s*9\\s*%');
    const itemsTotal=bulletTotal(text);

    if(finalTotal!==null){
      return {details:text,amount:finalTotal,staleAmount:null};
    }

    if(exclusive!==null&&(vat21!==null||vat9!==null)){
      const amount=Number((exclusive+(vat21||0)+(vat9||0)).toFixed(2));
      return {details:text,amount,staleAmount:subtotal};
    }

    const inferredTax=inferTaxFromSubtotal(subtotal,itemsTotal);
    if(inferredTax){
      const rateLabel=Math.round(inferredTax.rate*100);
      if(!new RegExp(`(?:^|\\n)\\s*btw\\s*${rateLabel}\\s*%\\b`,'i').test(text)){
        text+=`\nBtw ${rateLabel}%: €${formatMoney(inferredTax.vat)}`;
      }
      if(explicitFinalTotal(text)===null){
        text+=`\nTotaal: €${formatMoney(inferredTax.total)}`;
      }
      return {details:text,amount:inferredTax.total,staleAmount:subtotal};
    }

    if(itemsTotal!==null&&subtotal===null){
      return {details:text,amount:itemsTotal,staleAmount:null};
    }

    if(subtotal!==null){
      return {details:text,amount:subtotal,staleAmount:null};
    }

    if(itemsTotal!==null){
      return {details:text,amount:itemsTotal,staleAmount:null};
    }

    return {details:text,amount:null,staleAmount:null};
  }

  function applyAmount(reconciled){
    const input=document.getElementById('costAmount');
    if(!input||reconciled?.amount===null||reconciled?.amount===undefined)return;

    const current=parseMoney(input.value);
    const currentEmpty=!String(input.value||'').trim();
    const stale=Number.isFinite(reconciled.staleAmount)?reconciled.staleAmount:null;
    const mayReplaceStale=stale!==null&&current!==null&&Math.abs(current-stale)<=0.01;
    if(!currentEmpty&&!mayReplaceStale)return;

    const next=Number(reconciled.amount).toFixed(2);
    if(String(input.value||'').trim()===next)return;
    input.value=next;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function processDetails(details){
    const reconciled=reconcileDetails(details);
    applyAmount(reconciled);
    return reconciled;
  }

  function installReceiptFix(){
    const original=window.showCostReceiptDetails;
    if(typeof original!=='function')return;
    window.showCostReceiptDetails=function(details=''){
      const reconciled=processDetails(details);
      const result=original.call(this,reconciled.details);
      // De oorspronkelijke bonweergave kan het bedrag na onze voorbewerking
      // opnieuw invullen. Corrigeer daarom ook direct na het renderen.
      applyAmount(reconciled);
      setTimeout(()=>applyAmount(reconciled),0);
      return result;
    };

    const current=document.getElementById('costReceiptDetails');
    if(current?.value){
      const reconciled=processDetails(current.value);
      if(reconciled.details!==current.value)current.value=reconciled.details;
      applyAmount(reconciled);
    }
  }

  function updateKeyboardSpace(){
    if(!window.visualViewport)return;
    const keyboard=Math.max(0,window.innerHeight-window.visualViewport.height-window.visualViewport.offsetTop);
    document.documentElement.style.setProperty('--ms-keyboard-space',`${keyboard}px`);
    document.body.classList.toggle('ms-keyboard-open',keyboard>80);
  }

  function keepVisible(target){
    if(!target?.closest?.('#costFormWrap'))return;
    setTimeout(()=>{
      try{target.scrollIntoView({block:'center',behavior:'smooth'});}catch{}
    },120);
  }

  function installKeyboardFix(){
    const style=document.createElement('style');
    style.id='ms-cost-keyboard-hotfix';
    style.textContent=`
      :root{--ms-keyboard-space:0px}
      body{padding-bottom:calc(var(--nav-height,78px) + env(safe-area-inset-bottom) + var(--ms-keyboard-space))!important}
      .ms-keyboard-open .bottom-nav{visibility:hidden!important;pointer-events:none!important}
      #costFormWrap{padding-bottom:calc(24px + var(--ms-keyboard-space))!important}
      #costSaveButton{scroll-margin-bottom:calc(120px + var(--ms-keyboard-space))}
    `;
    document.head.appendChild(style);

    if(window.visualViewport){
      visualViewport.addEventListener('resize',updateKeyboardSpace,{passive:true});
      visualViewport.addEventListener('scroll',updateKeyboardSpace,{passive:true});
      updateKeyboardSpace();
    }
    document.addEventListener('focusin',event=>keepVisible(event.target));
    document.getElementById('costSaveButton')?.addEventListener('click',()=>{
      document.activeElement?.blur?.();
      setTimeout(updateKeyboardSpace,40);
    },true);
  }

  function init(){
    installReceiptFix();
    installKeyboardFix();
    document.documentElement.dataset.msCostHotfix=BUILD;
    console.info(`MijnSerenity ${BUILD}: kostenformulier-hotfix actief.`);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
