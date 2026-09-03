import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function makeElement(id=''){
  const classes=new Set();
  return {
    id,
    value:'',
    textContent:'',
    title:'',
    dataset:{},
    options:[],
    classList:{
      add(...names){names.forEach(name=>classes.add(name));},
      remove(...names){names.forEach(name=>classes.delete(name));},
      contains(name){return classes.has(name);},
      toggle(name,force){
        const enabled=force===undefined?!classes.has(name):Boolean(force);
        if(enabled)classes.add(name);else classes.delete(name);
        return enabled;
      }
    },
    appendChild(child){this.options.push(child);return child;},
    dispatchEvent(){return true;},
    removeAttribute(name){this[name]='';},
    remove(){}
  };
}

const elements=new Map([
  ['costId',makeElement('costId')],
  ['costAmount',makeElement('costAmount')],
  ['costDate',makeElement('costDate')],
  ['costCategory',makeElement('costCategory')],
  ['costDescription',makeElement('costDescription')],
  ['costReceiptDetailsWrap',makeElement('costReceiptDetailsWrap')],
  ['costOcrStatus',makeElement('costOcrStatus')],
  ['costOcrRetryButton',makeElement('costOcrRetryButton')]
]);
elements.get('costCategory').options=['','Onderhoud','Onderdelen','Elektra','Overig'].map(value=>({value,textContent:value}));

let shownDetails='';
let shownStatus='';
const document={
  head:{appendChild(element){if(element.id)elements.set(element.id,element);return element;}},
  createElement(){return makeElement();},
  getElementById(id){return elements.get(id)||null;}
};
const window={
  showCostReceiptDetails(details){shownDetails=details;},
  setCostOcrStatus(message){shownStatus=message;},
  renderCostReceiptPreview(){},
  loadReceiptOcrLibrary(){throw new Error('Niet nodig in parsertest.');}
};
const context={
  window,
  document,
  console,
  URL,
  URLSearchParams,
  Event,
  File:class File {},
  setTimeout,
  clearTimeout,
  alert(){}
};

const source=fs.readFileSync(new URL('../receipt-reader-pro.js',import.meta.url),'utf8');
vm.runInNewContext(source,context,{filename:'receipt-reader-pro.js'});

const sample=`
YOUR ADVENTURLEE Ee Is
Datum: 3 sep 2026
Accukabel met ogen 70mm2 zwart met SW_488496_3_SMP_6 — €51,95
Accukabel met ogen 70mm2 rood met SW_479143_3_SMP_6 — €11,95
i Ee . (Tota) verzendkosten — €0,00
Omni2 rood met : SW_48B496_3_SMP_6 — €0,00
in a met SW_479143_3_SMP_6 — €1,98
Totaal: €63,90
`;

const parsed=window.MSReceiptReaderPro.parseReceiptText(sample);
assert.equal(window.MSReceiptReaderPro.version,'8.23.0');
assert.equal(parsed.merchant,'Your Adventure');
assert.equal(parsed.date,'2026-09-03');
assert.equal(parsed.amount,63.9);
assert.equal(parsed.category,'Elektra');
assert.equal(parsed.summary,'Accukabels en aansluitmateriaal');
assert.equal(parsed.itemAudit.matches,true);
assert.equal(parsed.items.length,2);
assert.equal(Number(parsed.items.reduce((total,item)=>total+item.amount,0).toFixed(2)),63.9);
assert.ok(parsed.items.every(item=>!item.description.includes('SW_')));
assert.ok(!parsed.details.includes('SW_'));
assert.ok(!parsed.details.includes('€1,98'));
assert.equal(parsed.review.amount,false);
assert.equal(parsed.review.category,false);
assert.equal(parsed.review.description,false);
assert.equal(parsed.review.details,false);

window.applyReceiptOcrResult(sample);
assert.equal(elements.get('costAmount').value,'63.90');
assert.equal(elements.get('costDate').value,'2026-09-03');
assert.equal(elements.get('costCategory').value,'Elektra');
assert.equal(elements.get('costDescription').value,'Accukabels en aansluitmateriaal');
assert.ok(shownDetails.includes('Leverancier: Your Adventure'));
assert.ok(shownStatus.includes('onbetrouwbare OCR-regels verwijderd'));
assert.ok(shownStatus.includes('Bedrag en bonregels zijn gecontroleerd'));

console.log('Slimme bonscanner tests: OK');
