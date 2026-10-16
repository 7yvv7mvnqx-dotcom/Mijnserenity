/* Gedeelde logica voor lokale vaarplannen; geen tracking of alarmering. */
(()=>{
'use strict';
const groups=[
  {title:'Route & vaarweg',items:[
    ['route','Definitieve route en tussenstops gecontroleerd in een actuele waterkaart.'],
    ['clearance','Doorvaarthoogte, breedte en diepte gecontroleerd voor deze tocht.'],
    ['closures','Stremmingen, brug- en sluisbediening en marifoonkanalen gecontroleerd.'],
    ['alternative','Uitwijkhaven en alternatief bij vertraging of pech gekozen.']
  ]},
  {title:'Weer & water',items:[
    ['weather','Actuele weersverwachting, wind en waarschuwingen voor de hele tocht bekeken.'],
    ['water','Waterstanden, stroming en waar van toepassing het getij gecontroleerd.']
  ]},
  {title:'Boot & voorraad',items:[
    ['fuel','Voldoende brandstof voor de route, met reserve, gecontroleerd.'],
    ['power','Startaccu, huishoudaccu en communicatieapparatuur gecontroleerd.'],
    ['engine','Motor, koelwater, lekkages en bilge gecontroleerd.'],
    ['supplies','Drinkwater, eten en benodigde medicijnen aanwezig.']
  ]},
  {title:'Veiligheid & thuisblijver',items:[
    ['vests','Passende reddingsvesten en reddingsmiddelen klaar; bemanning geïnstrueerd.'],
    ['equipment','Brandblusser, EHBO, anker en noodmiddelen gecontroleerd.'],
    ['communication','Telefoon opgeladen en waar aanwezig marifoon gecontroleerd.'],
    ['contact','Thuisblijver kent het vaarplan, de meldafspraak en wat te doen bij uitblijven van contact.']
  ]}
];
const ids=groups.flatMap(g=>g.items.map(i=>i[0]));
function empty(){return {departure:'',eta:'',skipper:'',adults:'',children:'0',people:'',activity:'Motorboottocht',contactName:'',contactPhone:'',contactAgreement:'',conditions:'',alternative:'',notes:'',checks:{},status:'concept',startedAt:'',arrivedAt:''}}
function normalize(value){
  const result=empty();
  for(const key of Object.keys(result))if(typeof result[key]==='string'&&typeof value?.[key]==='string')result[key]=value[key].slice(0,6000);
  result.status=['concept','onderweg','aangekomen'].includes(result.status)?result.status:'concept';
  result.checks=Object.fromEntries(ids.map(id=>[id,value?.checks?.[id]===true]));
  return result;
}
function completed(data){return ids.filter(id=>data.checks?.[id]===true).length}
function dateTime(value){const n=new Date(value).getTime();return value&&Number.isFinite(n)?n:NaN}
function problems(data,now=Date.now()){
  const errors=[];
  const departure=dateTime(data.departure),eta=dateTime(data.eta);
  if(!Number.isFinite(departure))errors.push('Vul de geplande vertrekdatum en -tijd in.');
  if(!Number.isFinite(eta))errors.push('Vul de verwachte aankomstdatum en -tijd in.');
  else if(eta<=now||eta<=departure)errors.push('De verwachte aankomst moet na vertrek en in de toekomst liggen.');
  if(!data.skipper.trim())errors.push('Vul de naam van de schipper in.');
  const adults=Number(data.adults),children=Number(data.children);
  if(!String(data.adults).trim()||!Number.isInteger(adults)||adults<1||adults>999||!Number.isInteger(children)||children<0||children>999)errors.push('Vul een geldig aantal volwassenen (minimaal 1) en kinderen in.');
  if(!data.contactName.trim()||!data.contactPhone.trim()||!data.contactAgreement.trim())errors.push('Vul de thuisblijver, het telefoonnummer en de meldafspraak in.');
  if(completed(data)!==ids.length)errors.push(`Nog te controleren: ${ids.length-completed(data)} ${ids.length-completed(data)===1?'controlepunt':'controlepunten'}.`);
  return errors;
}
function signature(plan){
  // Ook een alternatieve route met dezelfde eindpunten vraagt om een nieuwe controle.
  const raw=JSON.stringify([plan.date,plan.fromRef,plan.toRef,plan.stopRefs,plan.points,plan.routeCoordinates,plan.routingMode,plan.speed]);
  let hash=2166136261;for(let i=0;i<raw.length;i++)hash=Math.imul(hash^raw.charCodeAt(i),16777619);
  return String(hash>>>0);
}
function restore(record,plan){
  const data=normalize(record?.data);
  const changed=Boolean(record&&record.signature!==signature(plan));
  if(changed){data.checks={};data.status='concept';data.startedAt='';data.arrivedAt=''}
  return {data,changed};
}
function formatDate(value){const n=dateTime(value);return Number.isFinite(n)?new Date(n).toLocaleString('nl-NL',{dateStyle:'medium',timeStyle:'short'}):'Nog in te vullen'}
function overview(plan,data,boat='Serenity'){
  const points=(plan.points||[]).map(p=>p.label||p.name||'Onbekend punt');
  const missing=ids.filter(id=>!data.checks[id]);
  return [
    `VAARPLAN — ${boat}`,`Status: ${data.status}`,`Tocht: ${plan.title||'Naamloos vaarplan'}`,
    `Route: ${points.join(' → ')||'Niet ingevuld'}`,`Routebron: ${plan.routeSource||'Niet vermeld'}${plan.routeWarning?' · '+plan.routeWarning:''}`,
    `Vertrek: ${formatDate(data.departure)}`,`Verwachte aankomst: ${formatDate(data.eta)}`,
    `Geschatte afstand: ${Number.isFinite(Number(plan.distanceKm))?Number(plan.distanceKm).toLocaleString('nl-NL',{maximumFractionDigits:1})+' km':'Onbekend'}`,
    `Geschatte vaartijd: ${Number.isFinite(Number(plan.durationHours))?Math.round(Number(plan.durationHours)*60)+' minuten':'Onbekend'}`,
    `Schipper: ${data.skipper||'Nog in te vullen'}`,`Opvarenden: ${data.adults||'?'} volwassenen, ${data.children||'0'} kinderen`,
    data.people?'Namen / bijzonderheden: '+data.people:'',`Activiteit: ${data.activity}`,
    '',`Thuisblijver: ${data.contactName||'Nog in te vullen'} · ${data.contactPhone||'Telefoon ontbreekt'}`,
    `Meldafspraak / handelen bij geen contact: ${data.contactAgreement||'Nog af te spreken'}`,
    `Weer / water: ${data.conditions||'Niet genoteerd'}`,`Uitwijkmogelijkheid: ${data.alternative||'Niet genoteerd'}`,
    plan.notes?'Routenotities: '+plan.notes:'',data.notes?'Tochtnotities: '+data.notes:'',
    '',`Tochtvoorbereiding: ${completed(data)}/${ids.length} controlepunten afgevinkt.`,
    ...groups.flatMap(g=>[g.title,...g.items.map(([id,label])=>`${data.checks[id]?'[✓]':'[ ]'} ${label}`)]),
    missing.length?'Er staan nog controlepunten open.':'Afgevinkt door de gebruiker; dit is geen automatische veiligheidsbeoordeling.',
    data.startedAt?'Vertrek vastgelegd: '+formatDate(data.startedAt):'',data.arrivedAt?'Aankomst vastgelegd: '+formatDate(data.arrivedAt):'',
    '', 'Dit vaarplan is handmatig gedeeld vanuit MijnSerenity. Er is geen koppeling met KNRM Helpt, geen automatische volgfunctie en geen automatische melding bij te late aankomst. Spreek rechtstreeks af wie wanneer contact opneemt.'
  ].filter(v=>v!=='').join('\n');
}
window.MSVoyageCore={groups,ids,empty,normalize,completed,problems,signature,restore,overview};
})();
