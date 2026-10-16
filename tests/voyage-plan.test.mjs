import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const window={};
vm.runInNewContext(read('voyage-plan-core.js'),{window,Date});
const core=window.MSVoyageCore;
const route={id:'route-1',date:'2026-10-20',title:'Enschede naar Zutphen',fromRef:'a',toRef:'b',stopRefs:['c'],points:[{label:'Enschede'},{label:'Eefde'},{label:'Zutphen'}],speed:9,distanceKm:58,durationHours:7,routeSource:'Waterwegrouter'};
const now=new Date('2026-10-20T06:00:00').getTime();
const data=core.empty();
assert.ok(core.problems(data,now).length>=4,'Een leeg plan mag niet als vertrek klaar worden aangemerkt.');
Object.assign(data,{departure:'2026-10-20T09:00',eta:'2026-10-20T18:00',skipper:'Schipper',adults:'2',children:'0',contactName:'Thuisblijver',contactPhone:'0123456789',contactAgreement:'Om 18:30 bellen als er nog geen aankomstbericht is.'});
for(const id of core.ids)data.checks[id]=true;
assert.equal(core.completed(data),14);
assert.equal(core.problems(data,now).length,0);
data.checks.weather=false;
assert.ok(core.problems(data,now).some(item=>item.includes('1 controlepunt')));
data.checks.weather=true;
for(const invalid of ['-1','1.5','0','1000','']){
  assert.ok(core.problems({...data,adults:invalid},now).length>0,invalid);
}
assert.ok(core.problems({...data,children:'-1'},now).length>0);
assert.ok(core.problems({...data,eta:'2026-10-20T08:00'},now).length>0);
assert.ok(core.problems({...data,eta:'2026-10-19T18:00'},now).length>0);
assert.equal(core.problems({...data,eta:'2026-10-21T01:00'},now).length,0,'Een tocht over middernacht moet mogelijk zijn.');
const record=JSON.parse(JSON.stringify({id:route.id,signature:core.signature(route),data}));
const restored=core.restore(record,route);
assert.equal(restored.changed,false);
assert.equal(core.completed(restored.data),14,'Een opgeslagen plan moet de vinkjes behouden.');
assert.equal(restored.data.contactAgreement,data.contactAgreement);
for(const next of [{...route,date:'2026-10-21'},{...route,toRef:'d'},{...route,routeCoordinates:[{lat:52,lon:6}]}]){
  const result=core.restore(record,next);
  assert.equal(result.changed,true);
  assert.equal(core.completed(result.data),0,'Nieuwe route/datum mag geen oude vinkjes overnemen.');
  assert.equal(result.data.contactName,data.contactName,'Tochtgegevens blijven wel behouden.');
  assert.equal(result.data.status,'concept');
}
const unknown=core.normalize({checks:{weather:'true'},status:'alarm-started',eta:null});
assert.equal(unknown.checks.weather,false,'Alleen een echte boolean geldt als afgevinkt.');
assert.equal(unknown.status,'concept');
assert.equal(unknown.eta,'');
const text=core.overview(route,data,'Testboot');
assert.match(text,/Enschede → Eefde → Zutphen/);
assert.match(text,/Thuisblijver/);
assert.match(text,/14\/14/);
assert.match(text,/geen automatische melding bij te late aankomst/);
assert.match(text,/Om 18:30 bellen/);
assert.match(text,/Waterwegrouter/);

// Simuleer het koppelpunt met de bestaande planner, inclusief opslaan en heropenen.
const elements=new Map();
function element(id){
  const handlers={};
  const el={id,disabled:false,dataset:{},value:'',textContent:'',open:false,
    addEventListener(type,fn){(handlers[type]??=[]).push(fn)},
    emit(type,event={}){for(const fn of handlers[type]||[])fn(event)},
    focus(){},select(){},scrollIntoView(){},contains(target){return target?.inRoot===true},
    querySelector(){return element('query')},querySelectorAll(){return []}
  };
  elements.set(id,el);return el;
}
const root=element('msVoyagePreparation');
const ids=['msVoyageFields','msVoyageState','msVoyageProgress','msVoyageText','msVoyageMessage','msVoyageRoute','msVoyageStart','msVoyageArrive','msVoyageSave','msVoyageShare','msVoyageCopy','msVoyageWaterChart','msVoyagePreview','planner','appView'];
ids.forEach(element);
for(const key of Object.keys(core.empty()).filter(key=>!['checks','status','startedAt','arrivedAt'].includes(key)))element('msVoyage-'+key);
Object.entries({plannerFrom:'a',plannerTo:'b',plannerDate:'2026-10-20',plannerSpeed:'9'}).forEach(([id,value])=>element(id).value=value);
const doc=element('document');doc.getElementById=id=>elements.get(id)||null;
const store=new Map();
const localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)};
const ctx={window:{...window,renderPlannerSummary(){},initPlanner(){},plannerFormChanged(){},resetPlannerForm(){},deletePlannerDraft(){},addEventListener(){},savePlannerDraft:async()=>{},readPlannerDrafts:()=>[route]},
  document:doc,currentUser:{id:'user-a'},currentBoat:{id:'boat-a',name:'Testboot'},plannerCurrentPlan:route,localStorage,navigator:{},Date,
  MutationObserver:class{observe(){}},setTimeout(){},location:{hash:'#planner'}};
vm.runInNewContext(read('voyage-plan.js'),ctx);
assert.equal(elements.get('msVoyageFields').disabled,false);
const contact=elements.get('msVoyage-contactName');contact.dataset.voyageField='contactName';contact.value='Walcontact';contact.inRoot=true;
root.emit('input',{target:contact});
assert.equal(JSON.parse(store.values().next().value)[0].data.contactName,'Walcontact');
assert.equal(route.voyagePreparation.data.contactName,'Walcontact','Bestaande Bewaar planning neemt tochtvoorbereiding mee.');
ctx.window.renderPlannerSummary(route);
assert.equal(contact.value,'Walcontact');
elements.get('plannerSpeed').value='8';ctx.window.initPlanner();
assert.equal(elements.get('msVoyageFields').disabled,true,'Een gewijzigde snelheid mag niet een oude route bruikbaar maken.');
elements.get('plannerSpeed').value='9';ctx.window.initPlanner();
assert.equal(elements.get('msVoyageFields').disabled,false);
ctx.currentUser={id:'user-b'};ctx.window.initPlanner();
assert.equal(contact.value,'','Een ander account mag geen thuisblijvergegevens overnemen.');
ctx.currentUser={id:'user-a'};ctx.window.initPlanner();
assert.equal(contact.value,'Walcontact','Eigen gegevens moeten terugkomen na wisselen.');
localStorage.setItem=()=>{throw Error('quota')};contact.value='Nieuwe naam';root.emit('input',{target:contact});
assert.match(elements.get('msVoyageMessage').textContent,/niet gelukt/,'Geen onterechte opgeslagen-melding bij opslagfout.');
console.log('Vaarplan: checklist, ETA, routewijzigingen, overzicht, plannerkoppeling, opslagfouten en accountscheiding OK.');
