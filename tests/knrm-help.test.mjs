import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const elements=new Map();
function element(id){
  const listeners={};
  const value={textContent:'',disabled:false,open:false,
    addEventListener:(type,fn)=>listeners[type]=fn,
    emit:(type,event={})=>listeners[type]?.(event),
    showModal(){this.open=true},close(){this.open=false;this.emit('close')}
  };
  elements.set(id,value);return value;
}
const dialog=element('msKnrmHelp');
const status=element('msKnrmPosition');
const locate=element('msKnrmLocate');
const close=element('msKnrmClose');
const document=element('document');
document.getElementById=id=>elements.get(id);
let gpsRequests=[];
const navigator={geolocation:{getCurrentPosition:(ok,fail,options)=>gpsRequests.push({ok,fail,options})}};
vm.runInNewContext(read('knrm-help.js'),{document,navigator,Date});
assert.equal(gpsRequests.length,0,'Geen locatiepermissie bij laden.');
document.emit('click',{target:{closest:()=>true}});
assert.equal(dialog.open,true);
assert.equal(gpsRequests.length,0,'Het hulpvenster mag GPS of bellen niet automatisch starten.');
locate.emit('click');
assert.equal(gpsRequests.length,1);
assert.equal(gpsRequests[0].options.maximumAge,0);
assert.equal(locate.disabled,true);
gpsRequests[0].ok({coords:{latitude:52.2,longitude:6.9,accuracy:23.1},timestamp:Date.now()});
assert.match(status.textContent,/52\.200000/);
assert.match(status.textContent,/24 m/);
assert.match(status.textContent,/niet verstuurd/);
locate.emit('click');
gpsRequests[1].fail({code:1});
assert.match(status.textContent,/geweigerd/);
assert.doesNotMatch(status.textContent,/52\.200000/,'Verouderde positie moet verdwijnen bij fouten.');
locate.emit('click');
gpsRequests[2].ok({coords:{latitude:52.2,longitude:6.9},timestamp:Date.now()-120000});
assert.match(status.textContent,/Geen actuele positie/);
locate.emit('click');
close.emit('click');
assert.equal(dialog.open,false);
assert.equal(locate.disabled,false);
gpsRequests[3].ok({coords:{latitude:52.2,longitude:6.9},timestamp:Date.now()});
assert.match(status.textContent,/Nog geen positie/,'Een late GPS-reactie mag een gesloten venster niet vullen.');
navigator.geolocation=undefined;
locate.emit('click');
assert.match(status.textContent,/Geen actuele positie/);
assert.equal(locate.disabled,false);

const html=read('index.html');
for(const number of ['112','+31889996100','+31889584040'])assert.ok(html.includes(`href="tel:${number}"`));
assert.match(html,/MijnSerenity stuurt geen positie of bootgegevens mee/);
assert.match(read('approved-dashboard-8263.js'),/data-ms-knrm-help/);
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
for(const id of ['msKnrmHelp','msKnrmTitle','msKnrmIntro','msKnrmClose','msKnrmPosition','msKnrmLocate'])assert.equal(ids.filter(v=>v===id).length,1);
const references=[...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(m=>m[1]).filter(p=>!/^([a-z]+:|#)/i.test(p)).map(p=>p.split('?')[0].replace(/^\//,''));
for(const ref of references.filter(Boolean))assert.ok(fs.existsSync(new URL('../'+ref,import.meta.url)),ref);
console.log('KNRM-hulp: dial-links, expliciete GPS-toestemming, fout/stale/late GPS-reacties en lokale assets OK.');
