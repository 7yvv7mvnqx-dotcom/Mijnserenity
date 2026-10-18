/* Vaarplan en tochtvoorbereiding sluiten aan op de bestaande Reisplanner. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
function mountKnmiWeatherLinks(){
  const weather=$('weather');
  if(!weather||$('msKnmiWeatherLinks'))return;
  const card=document.createElement('section');
  card.id='msKnmiWeatherLinks';
  card.className='card ms-knmi-weather-links';
  card.setAttribute('aria-labelledby','msKnmiWeatherTitle');
  card.innerHTML=`<div class="ms-knmi-weather-heading"><div><span class="eyebrow">OFFICIËLE WEERINFORMATIE</span><h2 id="msKnmiWeatherTitle">KNMI</h2><p>Bekijk de officiële verwachting en waarschuwingen naast de lokale vaarverwachting.</p></div></div><div class="ms-knmi-weather-actions"><a href="https://www.knmi.nl/nederland-nu/weer/verwachtingen" target="_blank" rel="noopener noreferrer">🌦️ Weer en verwachting</a><a href="https://www.knmi.nl/nederland-nu/weer/waarschuwingen/overijssel" target="_blank" rel="noopener noreferrer">⚠️ Waarschuwingen Overijssel</a><a href="https://www.knmi.nl/nederland-nu/weer/waarschuwingen-en-verwachtingen/waarschuwingen-kust-en-noordzee" target="_blank" rel="noopener noreferrer">🌊 Kust en ruime binnenwateren</a></div><p class="small">KNMI-pagina’s openen veilig in een nieuw tabblad. Voor actuele route- en vaarwegmeldingen blijft de bestaande RWS-functie beschikbaar.</p>`;
  weather.prepend(card);
}
mountKnmiWeatherLinks();
const core=window.MSVoyageCore;
const root=document.getElementById('msVoyagePreparation');
if(!core||!root)return;
let scope='',plan=null,data=core.empty(),storeFailed=false;
const fields=['departure','eta','skipper','adults','children','people','activity','contactName','contactPhone','contactAgreement','conditions','alternative','notes'];
const labels={departure:'Gepland vertrek',eta:'Verwachte aankomst',skipper:'Schipper',adults:'Volwassenen (incl. schipper)',children:'Kinderen',people:'Namen opvarenden / bijzonderheden',activity:'Activiteit',contactName:'Naam thuisblijver',contactPhone:'Telefoon thuisblijver',contactAgreement:'Meldafspraak en wat te doen bij geen contact',conditions:'Weer, wind en waterstanden — eigen beoordeling',alternative:'Uitwijkhaven / alternatief bij vertraging',notes:'Aanvullende tochtnotities'};
const multiline=new Set(['people','contactAgreement','conditions','alternative','notes']);
const types={departure:'datetime-local',eta:'datetime-local',adults:'number',children:'number',contactPhone:'tel'};
root.innerHTML=`<header class="ms-voyage-heading"><div><span class="eyebrow">VOOR VERTREK</span><h3 tabindex="-1" id="msVoyageTitle">Vaarplan & tochtvoorbereiding</h3></div><span id="msVoyageState">Concept</span></header>
<p id="msVoyageRoute">Bereken of open eerst een route in de reisplanner.</p>
<p class="ms-voyage-note">Dit vaarplan blijft op dit apparaat. Er is geen KNRM-volgfunctie of automatische melding bij te late aankomst. Deel het plan zelf met je thuisblijver en spreek af wanneer jullie contact hebben.</p>
<div class="ms-voyage-actions"><button type="button" data-voyage-route="planner">Route plannen / aanpassen</button><button type="button" data-voyage-route="weather">Eigen vaarweer bekijken</button><a class="ms-voyage-shortcut ms-voyage-knmi-link" href="https://www.knmi.nl/nederland-nu/weer/verwachtingen" target="_blank" rel="noopener noreferrer">🌦️ KNMI-verwachting</a><a class="ms-voyage-shortcut ms-voyage-knmi-link" href="https://www.knmi.nl/nederland-nu/weer/waarschuwingen/overijssel" target="_blank" rel="noopener noreferrer">⚠️ KNMI-waarschuwingen</a><button type="button" id="msVoyageWaterChart">Waterkaart controleren</button><button type="button" data-ms-knrm-help>Hulp op het water</button></div>
<p id="msVoyageMessage" role="status" aria-live="polite"></p>
<p id="msVoyageSafetyWarnings" class="ms-voyage-danger" role="status" aria-live="polite" hidden></p>
<fieldset id="msVoyageFields" disabled><legend>Gegevens van deze vaartocht</legend><div class="ms-voyage-grid">${fields.map(key=>`<label for="msVoyage-${key}"${multiline.has(key)?' class="ms-voyage-wide"':''}><span>${labels[key]}</span>${multiline.has(key)?`<textarea id="msVoyage-${key}" data-voyage-field="${key}" rows="2" maxlength="6000"></textarea>`:`<input id="msVoyage-${key}" data-voyage-field="${key}" type="${types[key]||'text'}" ${['adults','children'].includes(key)?`min="${key==='adults'?1:0}" max="999" step="1"`:''} maxlength="6000">`}</label>`).join('')}</div>
<p id="msVoyageArrivalHint" class="ms-voyage-note" role="status" aria-live="polite"></p>
<p>Gebruik bij een tocht over meerdere dagen de juiste aankomstdatum. Tijden staan in de tijdzone van dit apparaat.</p>
<h4>Controle voor vertrek</h4><p id="msVoyageProgress" aria-live="polite"></p>
<div class="ms-voyage-checks">${core.groups.map((group,i)=>`<details ${i===0?'open':''}><summary>${group.title}<span data-voyage-group="${i}"></span></summary>${group.items.map(([id,label])=>`<label class="ms-voyage-check"><input type="checkbox" data-voyage-check="${id}"><span>${label}</span></label>`).join('')}</details>`).join('')}</div>
<p class="ms-voyage-note">Afvinken is je eigen controle, geen automatische bevestiging dat de route of boot veilig is.</p>
<div class="ms-voyage-actions"><button type="button" id="msVoyageSave">Bewaar vaarplan</button><button type="button" id="msVoyageShare">Deel met thuisblijver</button><button type="button" id="msVoyageStart">Vertrek vastleggen</button><button type="button" id="msVoyageArrive">Aankomst vastleggen</button></div>
<details id="msVoyagePreview"><summary>Volledig vaarplan bekijken / kopiëren</summary><label for="msVoyageText">Deelbaar overzicht</label><textarea id="msVoyageText" readonly rows="14"></textarea><button type="button" id="msVoyageCopy">Kopieer vaarplan</button></details></fieldset>`;

function context(){
  try{return {scope:currentUser?.id&&currentBoat?.id?`${currentUser.id}:${currentBoat.id}`:'',boat:currentBoat?.name||'Serenity',plan:plannerCurrentPlan}}catch(_){return {scope:'',boat:'Serenity',plan:null}}
}
function storageKey(){return 'mijnserenity-voyage-preparation-v1:'+scope}
function routeCurrent(candidate){
  if(!candidate)return false;
  return ['plannerFrom','plannerTo','plannerDate','plannerSpeed'].every((id,index)=>{
    const input=$(id);if(!input)return true;
    const expected=[candidate.fromRef,candidate.toRef,candidate.date,candidate.speed][index];
    return id==='plannerSpeed'?Number(input.value)===Number(expected):String(input.value)===String(expected||'');
  });
}
function records(){try{const list=JSON.parse(localStorage.getItem(storageKey())||'[]');return Array.isArray(list)?list:[]}catch(_){return []}}
function message(text){$('msVoyageMessage').textContent=text}
function persist(silent=false){
  if(!plan||!scope)return false;
  const record={id:String(plan.id),signature:core.signature(plan),scope,data:core.normalize(data),updatedAt:new Date().toISOString()};
  plan.voyagePreparation=record;
  try{
    localStorage.setItem(storageKey(),JSON.stringify([record,...records().filter(item=>item.id!==record.id)].slice(0,40)));
    storeFailed=false;if(!silent)message('Tochtvoorbereiding op dit apparaat opgeslagen. Bewaar ook je route via ‘Bewaar vaarplan’.');return true;
  }catch(_){storeFailed=true;message('Opslaan is niet gelukt. Houd dit scherm open en kopieer je vaarplan.');return false}
}
function update(){
  const count=core.completed(data);
  const safety=[];
  if(plan){
    if(data.skipper?.trim()&&data.contactName?.trim()&&data.skipper.trim().toLocaleLowerCase('nl-NL')===data.contactName.trim().toLocaleLowerCase('nl-NL'))safety.push('De thuisblijver is ook de schipper. Kies een contactpersoon die aan wal blijft.');
    if(!data.contactAgreement?.trim())safety.push('Spreek een meldmoment af en leg vast wat de thuisblijver moet doen bij geen contact.');
  }
  const warningEl=$('msVoyageSafetyWarnings');
  warningEl.textContent=safety.join('\n');
  warningEl.hidden=!safety.length;
  const earliest=plan?core.earliestArrival(plan,data.departure):'';
  const travelHours=plan?core.estimatedTravelHours(plan):0;
  $('msVoyage-eta').min=earliest||'';
  $('msVoyageArrivalHint').textContent=earliest
    ?'Vroegste aankomst volgens de routeplanner: '+new Date(earliest).toLocaleString('nl-NL',{dateStyle:'medium',timeStyle:'short'})+
      ' (minimaal '+Math.ceil(travelHours*60)+' minuten inclusief bekende wachttijden; de werkelijke aankomst kan later zijn).'
    :travelHours>0?'Vul het geplande vertrek in; de verwachte aankomst wordt berekend uit de reistijd.'
      :'Bereken eerst een route om een minimale aankomsttijd te bepalen.';
  $('msVoyageState').textContent={concept:'Concept',onderweg:'Onderweg · lokaal',aangekomen:'Aangekomen · lokaal'}[data.status];
  $('msVoyageProgress').textContent=`${count} van ${core.ids.length} controlepunten afgevinkt${count<core.ids.length?' · nog punten open':''}.`;
  core.groups.forEach((g,i)=>root.querySelector(`[data-voyage-group="${i}"]`).textContent=`${g.items.filter(([id])=>data.checks[id]).length}/${g.items.length}`);
  $('msVoyageStart').disabled=data.status!=='concept';
  $('msVoyageArrive').disabled=data.status!=='onderweg';
  if(plan)$('msVoyageText').value=core.overview(plan,data,context().boat);
}
function render(){
  fields.forEach(key=>$('msVoyage-'+key).value=data[key]);
  root.querySelectorAll('[data-voyage-check]').forEach(el=>el.checked=data.checks[el.dataset.voyageCheck]===true);
  update();
}
function sync(next=context().plan){
  const ctx=context();
  if(!ctx.scope||!next?.id){
    scope=ctx.scope;plan=null;data=core.empty();render();
    $('msVoyageFields').disabled=true;
    $('msVoyageRoute').textContent='Bereken of open eerst een route in de reisplanner.';
    message('Je kunt daarna het vaarplan en de controlelijst invullen.');return;
  }
  const same=scope===ctx.scope&&String(plan?.id)===String(next.id);
  const changed=same&&core.signature(plan)!==core.signature(next);
  scope=ctx.scope;
  const record=records().find(item=>item.id===String(next.id))||(next.voyagePreparation?.scope===scope?next.voyagePreparation:null);
  // De router kan hetzelfde object wijzigen; de opgeslagen routehandtekening blijft dan leidend.
  const restored=core.restore(record,next);
  if(!same||changed||restored.changed)data=restored.data;
  plan=next;
  const arrivalAdjusted=core.enforceArrival(plan,data);
  if(restored.changed||arrivalAdjusted)persist(true);
  if(restored.changed)message('Route of vaardatum gewijzigd. Controleer de tochtvoorbereiding opnieuw; de vinkjes zijn gewist.');
  $('msVoyageFields').disabled=!routeCurrent(plan);
  $('msVoyageRoute').textContent=`${plan.title||'Geplande tocht'} · ${(plan.points||[]).map(p=>p.label||p.name||'Routepunt').join(' → ')} · vaardatum ${plan.date||'niet ingesteld'}`;
  if(!same)message(record?'Bewaarde tochtvoorbereiding geopend.':'Vul de gegevens in en loop de controlepunten door.');
  if(!routeCurrent(plan))message('Routegegevens gewijzigd. Bereken de route opnieuw voordat je dit vaarplan gebruikt.');
  else if(arrivalAdjusted)message('De verwachte aankomst is aangepast aan de minimaal berekende reistijd.');
  render();
}
function validCurrent(){
  const ctx=context();
  if(!scope||ctx.scope!==scope||!plan||String(ctx.plan?.id)!==String(plan.id)||!routeCurrent(ctx.plan)||$('msVoyageFields').disabled){sync();return false}
  return true;
}
function hook(name,after){
  const original=window[name];if(typeof original!=='function'||original.__msVoyageHook)return;
  const wrapped=function(...args){const result=original.apply(this,args);after(...args);return result};
  wrapped.__msVoyageHook=true;window[name]=wrapped;
}
function install(){
  hook('renderPlannerSummary',()=>sync());
  hook('initPlanner',()=>sync());
  hook('plannerFormChanged',()=>sync());
  hook('resetPlannerForm',()=>sync());
  hook('deletePlannerDraft',()=>sync());
  sync();
}
function openPreparation(){
  const help=$('msKnrmHelp');if(help?.open)help.close();
  if(typeof window.ms8263Navigate==='function')window.ms8263Navigate('planner');
  else if(typeof window.captainNavigate==='function')window.captainNavigate('planner');
  setTimeout(()=>{install();root.scrollIntoView({behavior:'smooth',block:'start'});$('msVoyageTitle').focus({preventScroll:true})},180);
}
document.addEventListener('click',event=>{if(event.target.closest?.('[data-voyage-open]'))openPreparation()});
root.addEventListener('input',event=>{
  const key=event.target.dataset.voyageField;if(!key||!validCurrent())return;
  data[key]=event.target.value;
  const adjusted=key==='departure'&&core.enforceArrival(plan,data);
  if(adjusted)$('msVoyage-eta').value=data.eta;
  persist();update();
  if(adjusted&&!storeFailed)message('De verwachte aankomst is bijgewerkt op basis van de reistijd.');
});
root.addEventListener('change',event=>{
  if(event.target.dataset.voyageField==='eta'&&validCurrent()){
    data.eta=event.target.value;
    if(core.enforceArrival(plan,data)){
      event.target.value=data.eta;
      persist();
      if(!storeFailed)message('Deze aankomsttijd was te vroeg; de minimale reistijd is toegepast.');
    }
    update();
    return;
  }
  const key=event.target.dataset.voyageCheck;if(!key||!validCurrent())return;
  data.checks[key]=event.target.checked;persist();update();
});
$('planner')?.addEventListener('input',event=>{
  if(root.contains(event.target))return;
  if(!['plannerDate','plannerSpeed','plannerFrom','plannerTo','plannerRoutingMode'].includes(event.target.id))return;
  $('msVoyageFields').disabled=true;message('Routegegevens gewijzigd. Bereken de route opnieuw voordat je dit vaarplan gebruikt.');
});
$('msVoyageSave').addEventListener('click',async()=>{
  if(!validCurrent()||!persist())return;
  try{
    await window.savePlannerDraft();
    const saved=window.readPlannerDrafts?.().find(item=>String(item.id)===String(plan.id));
    if(!saved)throw Error('not saved');
    message('Vaarplan inclusief route en tochtvoorbereiding op dit apparaat bewaard.');
  }catch(_){message('De route kon niet worden bewaard. Kopieer het overzicht voordat je afsluit.')}
});
async function copy(){
  if(!validCurrent())return;
  update();
  try{await navigator.clipboard.writeText($('msVoyageText').value);message('Vaarplan gekopieerd. Plak het zelf in een bericht aan je thuisblijver.')}catch(_){
    $('msVoyagePreview').open=true;$('msVoyageText').focus();$('msVoyageText').select();message('Selecteer en kopieer het overzicht handmatig.');
  }
}
$('msVoyageCopy').addEventListener('click',copy);
$('msVoyageShare').addEventListener('click',async()=>{
  if(!validCurrent())return;
  update();
  if(window.MSVoyageShare?.open){
    window.MSVoyageShare.open({plan,data,boat:context().boat});
    return;
  }
  if(!navigator.share){await copy();return}
  try{await navigator.share({title:'Vaarplan '+(plan.title||'Serenity'),text:$('msVoyageText').value});message('Controleer zelf of je thuisblijver het vaarplan heeft ontvangen. Er is geen automatische melding.')}catch(error){if(error?.name!=='AbortError')await copy()}
});
$('msVoyageStart').addEventListener('click',()=>{
  if(!validCurrent())return;
  const errors=core.problems(data,Date.now(),plan);
  if(errors.length){message(errors.join(' '));return}
  data.status='onderweg';data.startedAt=new Date().toISOString();persist();update();
  if(!storeFailed)message('Vertrek lokaal vastgelegd. Informeer je thuisblijver zelf; KNRM-tracking is niet gestart.');
});
$('msVoyageArrive').addEventListener('click',()=>{
  if(!validCurrent())return;
  data.status='aangekomen';data.arrivedAt=new Date().toISOString();persist();update();
  if(!storeFailed)message('Aankomst lokaal vastgelegd. Laat je thuisblijver zelf weten dat je er bent.');
});
root.querySelectorAll('[data-voyage-route]').forEach(button=>button.addEventListener('click',()=>{
  const target=button.dataset.voyageRoute;
  if(target==='planner'){$('planner').querySelector('.planner-form-card')?.scrollIntoView({behavior:'smooth',block:'start'});$('plannerDate')?.focus({preventScroll:true})}
  else if(typeof window.ms8263Navigate==='function')window.ms8263Navigate(target);
  else window.captainNavigate?.(target);
}));
$('msVoyageWaterChart').addEventListener('click',()=>window.openWaterkaarten?.());
['mijnserenity:live-core-ready','mijnserenity:modules-ready','mijnserenity:boot-complete'].forEach(type=>window.addEventListener(type,install));
window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#planner'))install()});
document.addEventListener('visibilitychange',()=>{if(context().scope!==scope)sync()});
const app=$('appView');if(app)new MutationObserver(()=>{if(context().scope!==scope)sync()}).observe(app,{attributes:true,attributeFilter:['class']});
install();
})();
