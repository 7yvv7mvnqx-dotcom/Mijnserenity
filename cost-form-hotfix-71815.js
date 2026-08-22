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

  function detectAmount(details){
    const text=String(details||'');
    const labelled=[
      /(?:totaal\s+te\s+betalen|eindtotaal|te\s+betalen|grand\s+total|amount\s+due)\s*:?\s*€?\s*([\d.]+,\d{2})/i,
      /(?:totaal|order\s+total)\s*:?\s*€?\s*([\d.]+,\d{2})/i
    ];
    for(const pattern of labelled){
      const match=text.match(pattern);
      const value=match?parseMoney(match[1]):null;
      if(value!==null)return value;
    }

    const exclusive=labelledMoney(text,'exclusief\\s+btw');
    const vat21=labelledMoney(text,'btw\\s*21\\s*%');
    const vat9=labelledMoney(text,'btw\\s*9\\s*%');
    if(exclusive!==null&&(vat21!==null||vat9!==null)){
      return Number((exclusive+(vat21||0)+(vat9||0)).toFixed(2));
    }

    const bulletLines=text.split('\n').filter(line=>/^[\s]*[•·*-]\s+/.test(line));
    const unique=[];
    const seen=new Set();
    for(const line of bulletLines){
      const key=line.trim().toLowerCase().replace(/\s+/g,' ');
      if(seen.has(key))continue;
      seen.add(key);
      const matches=[...line.matchAll(/€\s*([\d.]+,\d{2})/g)];
      if(!matches.length)continue;
      const value=parseMoney(matches[matches.length-1][1]);
      if(value!==null)unique.push(value);
    }
    if(unique.length>=2)return Number(unique.reduce((sum,value)=>sum+value,0).toFixed(2));
    return null;
  }

  function fillAmountFromDetails(details){
    const input=document.getElementById('costAmount');
    if(!input||String(input.value||'').trim())return;
    const amount=detectAmount(details);
    if(amount===null)return;
    input.value=amount.toFixed(2);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function processDetails(details){
    const cleaned=cleanDetails(details);
    fillAmountFromDetails(cleaned);
    return cleaned;
  }

  function installReceiptFix(){
    const original=window.showCostReceiptDetails;
    if(typeof original!=='function')return;
    window.showCostReceiptDetails=function(details=''){
      const cleaned=processDetails(details);
      return original.call(this,cleaned);
    };

    const current=document.getElementById('costReceiptDetails');
    if(current?.value){
      const cleaned=processDetails(current.value);
      if(cleaned!==current.value)current.value=cleaned;
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
