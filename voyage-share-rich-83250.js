/* MijnSerenity - overzichtelijk vaarplan voor thuisblijver, lokaal gedeelde afbeelding. */
(()=>{
'use strict';
if(window.MSVoyageShare)return;
const $=id=>document.getElementById(id);
const core=window.MSVoyageCore;
const N=v=>String(v??'').trim();
const str=v=>N(v)||'Nog in te vullen';
const when=v=>v&&Number.isFinite(new Date(v).getTime())?new Date(v).toLocaleString('nl-NL',{weekday:'short',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Nog in te vullen';
const distance=v=>Number.isFinite(Number(v))?Number(v).toLocaleString('nl-NL',{maximumFractionDigits:1})+' km':'Onbekend';
const cleanName=v=>N(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
function warns(plan,data){
 const result=[];
 if(cleanName(data.skipper)&&cleanName(data.skipper)===cleanName(data.contactName))result.push('De thuisblijver is ook de schipper. Kies iemand die aan wal blijft.');
 if(!N(data.contactName)||!N(data.contactPhone))result.push('Naam of telefoonnummer van de thuisblijver ontbreekt.');
 if(!N(data.contactAgreement))result.push('Maak eerst een meldafspraak: wanneer moet de thuisblijver bellen en wat moet die doen bij geen contact?');
 const minimum=core?.earliestArrival(plan,data.departure);
 if(minimum&&(!data.eta||new Date(data.eta).getTime()<new Date(minimum).getTime()))result.push('De aankomsttijd ligt vóór de berekende minimale reistijd.');
 if(!N(data.conditions))result.push('Weer en waterstanden zijn nog niet ingevuld.');
 if(!N(data.alternative))result.push('Uitwijkhaven of alternatief is niet ingevuld.');
 const count=core?.completed(data)||0,total=core?.ids?.length||14;
 if(count<total)result.push((total-count)+' van de '+total+' controlepunten zijn nog niet afgevinkt.');
 return result;
}
function line(parent,klass,value){
 const el=document.createElement('div');if(klass)el.className=klass;
 el.textContent=value;parent.appendChild(el);return el;
}
function node(parent,tag,klass,value){
 const el=document.createElement(tag);if(klass)el.className=klass;
 if(value!==undefined&&value!==null)el.textContent=value;
 parent.appendChild(el);return el;
}
function field(parent,name,value){
 const e=node(parent,'div','msvr-field');node(e,'span','msvr-key',name);node(e,'strong','msvr-value',str(value));return e;
}
function buildText(plan,data,boat){
 // Dezelfde tekst als in het bestaande vaarplan, maar met een heldere instructie voor de thuisblijver.
 const base=core.overview(plan,data,boat);
 return base+'\n\nVOOR DE THUISBLIJVER\n'+
 '1. Controleer vooraf de naam, het telefoonnummer en de exacte meldafspraak.\n'+
 '2. Geen bericht op de afgesproken tijd? Bel de schipper en probeer eventuele andere opvarenden.\n'+
 '3. Blijft contact uit, ga na wat de laatst bekende positie en route zijn en schakel passende hulp in.\n'+
 '4. Bij direct gevaar voor personen: bel 112 en geef route, bestemming en laatst bekende positie door.\n'+
 'Let op: dit is geen live-locatie en MijnSerenity stuurt geen automatische waarschuwing.';
}
function wrap(ctx,value,maxWidth,font){
 ctx.font=font;
 const words=N(value).replace(/\r/g,'').split(/\s+/).filter(Boolean);
 if(!words.length)return ['—'];
 const lines=[];let line='';
 for(const word of words){
  const next=line?line+' '+word:word;
  if(ctx.measureText(next).width<=maxWidth){line=next;continue;}
  if(line){lines.push(line);line='';}
  if(ctx.measureText(word).width<=maxWidth){line=word;continue;}
  let part='';
  for(const c of word){
   if(part&&ctx.measureText(part+c).width>maxWidth){lines.push(part);part=c;}
   else part+=c;
  }
  line=part;
 }
 if(line)lines.push(line);
 return lines;
}
function drawCard(ctx,x,y,w,h,fill,color,paint){
 if(!paint)return;
 ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,22);ctx.fill();
 if(color){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();}
}
function createCanvas(plan,data,boat,logo){
 const width=1080,measure=document.createElement('canvas').getContext('2d');
 if(!measure)throw Error('Afbeelding maken wordt hier niet ondersteund.');
 const points=(plan.points||[]).map(p=>str(p.label||p.name)).join(' → ');
 const timeMinutes=core.estimatedTravelHours(plan)>0?Math.ceil(core.estimatedTravelHours(plan)*60):0;
 const duration=timeMinutes?Math.floor(timeMinutes/60)+' uur '+String(timeMinutes%60).padStart(2,'0')+' min':'Onbekend';
 const warning=warns(plan,data);
 const count=core.completed(data),total=core.ids.length;
 const truncate=(s,n)=>N(s).length>n?N(s).slice(0,n)+'…':N(s);
 function render(ctx,paint){
  let y=0;
  const font=(size,weight)=>String(weight||500)+' '+size+'px system-ui, sans-serif';
  const txt=(s,x,yy,size=27,color='#102c46',weight=500)=>{
   if(!paint)return;ctx.font=font(size,weight);ctx.fillStyle=color;ctx.fillText(String(s),x,yy);
  };
  const multi=(v,x,top,maxWidth,size=27,color='#183652',weight=500,leading=38)=>{
   const f=font(size,weight),lines=wrap(ctx,N(v)||'—',maxWidth,f);
   if(paint)lines.forEach((s,i)=>txt(s,x,top+i*leading,size,color,weight));
   return lines.length*leading;
  };
  const section=(title,items)=>{
   const pad=34,inner=width-2*pad,maxWidth=inner-36;
   let ht=83;
   items.forEach(item=>{
    const sz=item.small?22:27;
    const lines=wrap(ctx,item.value,maxWidth,font(sz,item.bold?750:500));
    ht+=30+lines.length*(item.small?32:39)+(item.gap||10);
   });
   drawCard(ctx,pad,y,inner,ht,'#ffffff','#d9e5ee',paint);
   txt(title,pad+26,y+45,30,'#0b314e',760);
   let cy=y+83;
   items.forEach(item=>{
    txt(item.label.toUpperCase(),pad+26,cy,18,'#597386',730);cy+=30;
    cy+=multi(item.value,pad+26,cy,maxWidth,item.small?22:27,item.warning?'#a84422':'#163751',item.bold?760:500,item.small?32:39);
    cy+=(item.gap||10);
   });
   y+=ht+18;
  };
  if(paint){ctx.fillStyle='#f0f5f8';ctx.fillRect(0,0,width,ctx.canvas.height);ctx.fillStyle='#07263c';ctx.fillRect(0,0,width,320);}
  if(logo&&paint){ctx.fillStyle='#ffffff';ctx.beginPath();ctx.roundRect(40,31,225,225,20);ctx.fill();ctx.drawImage(logo,43,34,219,219);}
  txt('VAARPLAN',295,118,44,'#ffffff',800);
  txt(N(boat)||'Serenity',295,173,37,'#f1d59b',640);
  txt('Informatie voor de thuisblijver',295,220,22,'#c5e4ed',540);
  y=350;
  const topH=170;
  drawCard(ctx,34,y,width-68,topH,'#0d3754',null,paint);
  txt(N(plan.title)||'Geplande vaartocht',62,y+54,39,'#ffffff',760);
  multi(points||'Route niet opgegeven',62,y+91,width-125,23,'#e1edf6',500,32);
  y+=topH+18;
  section('Reisgegevens',[
   {label:'Gepland vertrek',value:when(data.departure)},
   {label:'Vroegst berekende aankomst',value:when(data.eta),bold:true},
   {label:'Afstand / minimale vaartijd',value:distance(plan.distanceKm)+'  ·  '+duration},
   {label:'Routebron',value:str(plan.routeSource),small:true}
  ]);
  section('Wie zijn er aan boord?',[
   {label:'Schipper',value:str(data.skipper)},
   {label:'Opvarenden',value:str(data.adults)+' volwassenen, '+str(data.children)+' kinderen'},
   {label:'Namen en bijzonderheden',value:truncate(data.people,230),small:true}
  ]);
  section('Thuisblijver en contact',[
   {label:'Naam',value:str(data.contactName),bold:true,warning:cleanName(data.skipper)===cleanName(data.contactName)},
   {label:'Telefoon',value:str(data.contactPhone)},
   {label:'Afgesproken meldmoment en actie',value:truncate(data.contactAgreement,340),warning:!N(data.contactAgreement)}
  ]);
  section('Veiligheid en voorbereiding',[
   {label:'Controlepunten afgerond',value:count+' van '+total},
   {label:'Weer / water',value:truncate(data.conditions,260),small:true},
   {label:'Uitwijkmogelijkheid',value:truncate(data.alternative,260),small:true}
  ]);
  if(warning.length){
   section('Nog te controleren vóór vertrek',warning.map((w,i)=>({label:'Punt '+(i+1),value:w,small:true,warning:true})));
  }
  section('Voor de thuisblijver',[
   {label:'Wanneer melden?',value:N(data.contactAgreement)||'Nog af te spreken: spreek een duidelijk meldmoment af.',small:true},
   {label:'Als contact uitblijft',value:'Bel de schipper. Controleer mogelijke vertraging en de laatst bekende route of positie. Zoek passende hulp als contact uitblijft.',small:true},
   {label:'Bij direct gevaar',value:'Bel 112 en geef de route, bestemming en laatst bekende positie door.',bold:true}
  ]);
  // De deelbare afbeelding vermeldt ook de volledige checkliststatus.
  const open=core.groups.flatMap(g=>g.items.filter(([id])=>!data.checks[id]).map(([,label])=>label));
  if(open.length)section('Openstaande controlepunten',open.map((value,i)=>({label:String(i+1),value,small:true})));
  const footer=125;
  if(paint){ctx.fillStyle='#0c3048';ctx.fillRect(0,y,width,footer);}
  txt('GEEN LIVE-VOLGFUNCTIE OF AUTOMATISCHE NOODMELDING',40,y+46,19,'#ffffff',760);
  txt('Handmatig gedeeld vanuit MijnSerenity · controleer alle gegevens.',40,y+86,19,'#d4e3ee',500);
  return y+footer+20;
 }
 let height=render(measure,false);
 if(height>16000)throw Error('De afbeelding wordt te lang. Gebruik Kopieer bericht of Druk af / PDF.');
 const canvas=document.createElement('canvas');
 canvas.width=width;canvas.height=Math.ceil(height);
 const ctx=canvas.getContext('2d');
 render(ctx,true);
 return canvas;
}
function loadLogo(){
 return new Promise(resolve=>{
  const img=new Image();
  img.onload=()=>resolve(img);
  img.onerror=()=>resolve(null);
  img.src='/mijnserenity-logo.png';
  if(img.complete&&img.naturalWidth)resolve(img);
 });
}
async function makeFile(plan,data,boat){
 const logo=await loadLogo();
 const canvas=createCanvas(plan,data,boat,logo);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(Error('Afbeelding kon niet worden gemaakt.')),'image/png'));
 return new File([blob],'Serenity-vaarplan.png',{type:'image/png'});
}
function saveFile(file){
 const url=URL.createObjectURL(file);
 const a=document.createElement('a');
 a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),15000);
}
function fillView(d,plan,data,boat,warning){
 const content=$('msvrContent');content.replaceChildren();
 const hero=node(content,'div','msvr-hero');
 const img=node(hero,'img','msvr-logo');img.src='/mijnserenity-logo.png';img.alt='MijnSerenity logo';
 const heading=node(hero,'div','msvr-headtext');
 node(heading,'span','msvr-kicker','VAARPLAN · '+(data.status||'concept').toUpperCase());
 node(heading,'h2','',N(plan.title)||'Geplande vaartocht');
 node(heading,'p','',boat+' · Informatie voor de thuisblijver');
 const summary=node(content,'div','msvr-card msvr-route');
 node(summary,'strong','',((plan.points||[]).map(p=>p.label||p.name||'Routepunt').join(' → '))||'Route niet opgegeven');
 const metrics=node(content,'div','msvr-metrics');
 field(metrics,'Vertrek',when(data.departure));
 field(metrics,'Verwachte aankomst (minimaal)',when(data.eta));
 field(metrics,'Geschatte vaartijd',core.estimatedTravelHours(plan)>0?Math.ceil(core.estimatedTravelHours(plan)*60)+' minuten':'Onbekend');
 field(metrics,'Geschatte afstand',distance(plan.distanceKm));
 const crew=node(content,'section','msvr-card');
 node(crew,'h3','','Bemanning');
 field(crew,'Schipper',data.skipper);
 field(crew,'Opvarenden',str(data.adults)+' volwassenen · '+str(data.children)+' kinderen');
 field(crew,'Namen / bijzonderheden',data.people);
 field(crew,'Activiteit',data.activity);
 const home=node(content,'section','msvr-card msvr-important');
 node(home,'h3','','Voor de thuisblijver');
 field(home,'Contactpersoon',data.contactName);
 field(home,'Telefoon',data.contactPhone);
 field(home,'Meldafspraak en handelen bij geen contact',data.contactAgreement);
 const advice=node(home,'div','msvr-advice');
 node(advice,'strong','','Als contact uitblijft');
 node(advice,'p','','Bel de schipper en controleer of er vertraging is. Gebruik de laatst bekende route of positie en schakel passende hulp in als contact uitblijft. Bij direct gevaar voor personen: bel 112.');
 const prep=node(content,'section','msvr-card');
 node(prep,'h3','','Voorbereiding en omstandigheden');
 field(prep,'Weer / water',data.conditions);
 field(prep,'Uitwijkmogelijkheid',data.alternative);
 field(prep,'Routebron',plan.routeSource);
 field(prep,'Routenotities',plan.notes);
 field(prep,'Tochtnotities',data.notes);
 const check=node(content,'section','msvr-card');
 node(check,'h3','','Controle voor vertrek');
 node(check,'p','msvr-count',(core.completed(data))+' van '+core.ids.length+' punten gecontroleerd');
 for(const group of core.groups){
  const sec=node(check,'div','msvr-group');
  node(sec,'h4','',group.title);
  for(const [id,label] of group.items){
   const item=node(sec,'p',data.checks?.[id]?'msvr-checked':'msvr-unchecked');
   node(item,'span','',data.checks?.[id]?'☑':'☐');
   node(item,'span','',label);
  }
 }
 if(warning.length){
  const warn=node(content,'section','msvr-card msvr-warning');
  node(warn,'h3','','Nog aandacht nodig');
  warning.forEach(t=>node(warn,'p','',t));
 }
 node(content,'p','msvr-disclaimer','Dit plan is handmatig gedeeld. Geen koppeling met KNRM Helpt, geen automatische positievolging en geen melding bij te late aankomst. Maak altijd rechtstreeks een meldafspraak.');
}
function open(snapshot){
 const plan=snapshot?.plan,data=core?.normalize(snapshot?.data||{}),boat=N(snapshot?.boat)||'Serenity';
 if(!plan||!core||!data)return;
 core.enforceArrival(plan,data);
 let d=$('msVoyageRichDialog');
 if(!d){
  d=document.createElement('dialog');d.id='msVoyageRichDialog';d.className='msvr-dialog';
  d.innerHTML='<div class="msvr-toolbar"><span>MijnSerenity · deelbaar vaarplan</span><button type="button" id="msvrClose" aria-label="Sluiten">✕</button></div>'+
  '<div id="msvrContent"></div>'+
  '<div class="msvr-actions"><button type="button" id="msvrImage">📤 Deel afbeelding</button><button type="button" id="msvrCopy">Kopieer bericht</button><button type="button" id="msvrPrint">Print / PDF</button></div>'+
  '<p id="msvrStatus" class="msvr-status" role="status" aria-live="polite"></p>';
  document.body.appendChild(d);
  $('msvrClose').addEventListener('click',()=>d.close());
  d.addEventListener('click',e=>{if(e.target===d)d.close();});
 }
 const warning=warns(plan,data);
 fillView(d,plan,data,boat,warning);
 const status=$('msvrStatus');status.textContent=warning.length?'LET OP: '+warning.length+' aandachtspunt(en). Controleer de gegevens vóór vertrek.':'Voor vertrek: controleer of je thuisblijver dit plan heeft ontvangen.';
 $('msvrCopy').onclick=async()=>{
  try{await navigator.clipboard.writeText(buildText(plan,data,boat));status.textContent='Bericht gekopieerd. Plak het zelf in WhatsApp of een ander bericht.';}
  catch(_){status.textContent='Kopiëren niet beschikbaar. Selecteer en kopieer het vaarplan in de app.';}
 };
 $('msvrPrint').onclick=()=>window.print();
 $('msvrImage').onclick=async()=>{
  const b=$('msvrImage');b.disabled=true;status.textContent='Deelbare afbeelding met het Serenity-logo maken…';
  try{
   const f=await makeFile(plan,data,boat);
   if(typeof navigator.share==='function'&&navigator.canShare?.({files:[f]})){
    try{
     await navigator.share({title:'Vaarplan '+(N(plan.title)||boat),files:[f],text:'Vaarplan van '+boat+'. Bekijk ook de veiligheidsinformatie.'});
     status.textContent='Controleer of de thuisblijver de afbeelding ontvangen heeft.';
    }catch(err){if(err?.name==='AbortError')status.textContent='Delen afgebroken.';else{saveFile(f);status.textContent='Delen niet beschikbaar: afbeelding opgeslagen. Verstuur hem zelf naar de thuisblijver.';}}
   }else{saveFile(f);status.textContent='Afbeelding opgeslagen. Verstuur hem zelf via WhatsApp of berichten.';}
  }catch(err){status.textContent='Afbeelding maken is niet gelukt. Probeer Kopieer bericht of Print / PDF.';}
  finally{b.disabled=false;}
 };
 if(typeof d.showModal==='function'){if(!d.open)d.showModal();}
 else d.setAttribute('open','');
}
window.MSVoyageShare={open,warnings:warns};
})();