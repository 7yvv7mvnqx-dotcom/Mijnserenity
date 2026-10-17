/* Serenity 8.32.12: lokale contactpersonen, vCard-import en naamsuggesties.
 * Safari op iOS kan Apple Contacten niet automatisch inlezen.
 */
(()=>{
'use strict';
if(window.__msVoyageContacts83212)return;
window.__msVoyageContacts83212=true;
const root=document.getElementById('msVoyagePreparation');
if(!root)return;
const MAX=1500, fields=[['skipper',false],['people',true],['contactName',false]];
const panels=new Map();
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const nameOf=v=>String(v||'').replace(/[\t\r\n]+/g,' ').replace(/\s+/g,' ').trim().slice(0,120);
const phoneOf=v=>String(v||'').replace(/[\t\r\n]+/g,' ').trim().slice(0,60);
const userId=()=>{try{return typeof currentUser!=='undefined'&&currentUser?.id?String(currentUser.id):'local-device'}catch{return'local-device'}};
const storageKey=()=> 'mijnserenity-voyage-contacten-v1:'+userId();
let items=[],owner='';
function read(){
 const who=userId();
 if(who===owner)return items;
 owner=who;
 try{const data=JSON.parse(localStorage.getItem(storageKey())||'[]');items=Array.isArray(data)?data.filter(x=>x&&typeof x.name==='string').map(x=>({name:nameOf(x.name),phone:phoneOf(x.phone)})).filter(x=>x.name).slice(0,MAX):[]}
 catch(_){items=[]}
 return items;
}
function status(s){const el=document.getElementById('msvContactStatus');if(el)el.textContent=s}
function updateBook(){
 const list=document.getElementById('msvContactSelect');
 if(!list)return;
 list.replaceChildren();
 const first=new Option('Kies opgeslagen contact…','');list.appendChild(first);
 read().forEach((x,i)=>list.appendChild(new Option(x.name+(x.phone?' · '+x.phone:''),String(i))));
 const count=document.getElementById('msvContactCount');
 if(count)count.textContent=items.length+' contactpersonen opgeslagen op dit apparaat';
}
function save(next){
 try{localStorage.setItem(storageKey(),JSON.stringify(next));items=next;updateBook();return true}
 catch(_){status('Opslaan lukt niet op dit apparaat.');return false}
}
function addContacts(incoming){
 read();const next=items.slice();let added=0,changed=0;
 for(const c of incoming){
  const name=nameOf(c?.name),phone=phoneOf(c?.phone);
  if(!name)continue;
  const i=next.findIndex(v=>norm(v.name)===norm(name));
  if(i>=0){
   if(phone&&phone!==next[i].phone){next[i]={name,phone};changed++}
  }else if(next.length<MAX){next.push({name,phone});added++}
 }
 next.sort((a,b)=>a.name.localeCompare(b.name,'nl'));
 if(!save(next))return null;
 return {added,changed};
}
function unescapeCard(s){
 return String(s||'').replace(/\\n/gi,' ').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\').trim();
}
function parseVCard(raw){
 const lines=String(raw).replace(/\r\n?/g,'\n').split('\n'),flat=[];
 for(const line of lines){
  if(/^[ \t]/.test(line)&&flat.length)flat[flat.length-1]+=line.slice(1);
  else flat.push(line);
 }
 const result=[];let record=null;
 for(const line of flat){
  if(/^BEGIN:VCARD$/i.test(line)){record={name:'',other:'',phone:''};continue}
  if(/^END:VCARD$/i.test(line)){
   if(record&&(record.name||record.other))result.push({name:record.name||record.other,phone:record.phone});
   record=null;continue
  }
  if(!record)continue;
  const colon=line.indexOf(':');if(colon<0)continue;
  const k=line.slice(0,colon).toUpperCase(),v=unescapeCard(line.slice(colon+1));
  if(k==='FN'||k.startsWith('FN;'))record.name=v;
  else if(k==='N'||k.startsWith('N;')){
   const parts=v.split(';');record.other=[parts[1],parts[0]].filter(Boolean).join(' ');
  }else if(/(^|\.)TEL(?:;|$)/.test(k)&&!record.phone)record.phone=v.replace(/^tel:/i,'');
 }
 return result;
}
function token(el,multi){
 const value=String(el.value||'');
 if(!multi)return {query:value.trim(),start:0,end:value.length};
 const pos=Math.min(value.length,el.selectionStart??value.length);
 let a=pos,b=pos;
 while(a>0&&!/[,;\n]/.test(value[a-1]))a--;
 while(b<value.length&&!/[,;\n]/.test(value[b]))b++;
 return {query:value.slice(a,pos).trim(),start:a,end:b};
}
function hide(p){
 p.list.hidden=true;p.input.setAttribute('aria-expanded','false');p.matches=[];p.active=-1;
 p.input.removeAttribute('aria-activedescendant');
}
function closeOthers(active){for(const p of panels.values())if(p!==active)hide(p)}
function choose(p,contact){
 const el=p.input,t=token(el,p.multi);
 if(p.multi){
  const before=el.value.slice(0,t.start),after=el.value.slice(t.end);
  el.value=before+(before&&/[,;]/.test(before.slice(-1))?' ':'')+contact.name+after;
 }else el.value=contact.name;
 if(el.id==='msVoyage-contactName'&&contact.phone){
  const phone=document.getElementById('msVoyage-contactPhone');
  if(phone){phone.value=contact.phone;phone.dispatchEvent(new Event('input',{bubbles:true}))}
 }
 el.dispatchEvent(new Event('input',{bubbles:true}));
 el.dispatchEvent(new Event('change',{bubbles:true}));
 hide(p);el.blur();
}
function suggestions(query){
 const q=norm(query);if(q.length<2)return [];
 read();
 return items.map(v=>{
  const n=norm(v.name),starts=n.startsWith(q),word=n.split(' ').some(x=>x.startsWith(q));
  const score=starts?0:word?1:n.includes(q)?2:99;
  return {v,score};
 }).filter(x=>x.score<99).sort((a,b)=>a.score-b.score||a.v.name.localeCompare(b.v.name,'nl')).slice(0,8).map(x=>x.v);
}
function showSuggestions(p){
 if(p.input.closest('fieldset')?.disabled){hide(p);return}
 const match=suggestions(token(p.input,p.multi).query);
 if(!match.length){hide(p);return}
 closeOthers(p);p.matches=match;p.active=-1;p.list.replaceChildren();
 match.forEach((contact,i)=>{
  const button=document.createElement('button');
  button.type='button';button.className='msv-contact-option';
  button.id=p.input.id+'-opt-'+i;button.setAttribute('role','option');
  const title=document.createElement('strong');title.textContent=contact.name;
  const subtitle=document.createElement('small');subtitle.textContent=contact.phone?'☎ '+contact.phone:'Contactpersoon';
  button.append(title,subtitle);
  button.addEventListener('mousedown',e=>e.preventDefault());
  button.addEventListener('click',e=>{e.stopPropagation();choose(p,contact)});
  p.list.appendChild(button);
 });
 p.list.hidden=false;p.input.setAttribute('aria-expanded','true');
}
function wire(key,multi){
 const input=document.getElementById('msVoyage-'+key);
 if(!input||panels.has(key))return;
 const list=document.createElement('div');
 list.id=input.id+'-contacts';list.className='msv-contact-list';list.hidden=true;list.setAttribute('role','listbox');
 input.insertAdjacentElement('afterend',list);
 input.setAttribute('aria-controls',list.id);
 input.setAttribute('aria-autocomplete','list');
 input.setAttribute('aria-expanded','false');
 input.setAttribute('autocomplete','off');
 const p={input,list,multi,matches:[],active:-1};panels.set(key,p);
 input.addEventListener('input',()=>showSuggestions(p));
 input.addEventListener('focus',()=>showSuggestions(p));
 input.addEventListener('keyup',()=>{if(multi&&document.activeElement===input&&!list.hidden)showSuggestions(p)});
 input.addEventListener('keydown',e=>{
  if(e.key==='Escape'){hide(p);return}
  if(list.hidden||!p.matches.length)return;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
   e.preventDefault();p.active=e.key==='ArrowDown'?Math.min(p.matches.length-1,p.active+1):Math.max(0,p.active-1);
   [...list.children].forEach((b,i)=>b.classList.toggle('selected',i===p.active));
   input.setAttribute('aria-activedescendant',input.id+'-opt-'+p.active);
  }
  if(e.key==='Enter'&&p.active>=0){e.preventDefault();choose(p,p.matches[p.active])}
 });
}
function makeBook(){
 if(document.getElementById('msvContactBook'))return;
 const fieldset=document.getElementById('msVoyageFields');
 if(!fieldset)return;
 const book=document.createElement('details');
 book.id='msvContactBook';book.className='msv-contact-book';
 book.innerHTML=[
  '<summary>👥 Contactpersonen beheren en importeren</summary>',
  '<p>Typ twee letters bij Schipper, Opvarenden of Thuisblijver. Kies een contact uit de suggesties. Bij Thuisblijver wordt het opgeslagen telefoonnummer ingevuld.</p>',
  '<p>Apple Contacten kunnen in Safari niet rechtstreeks worden gelezen. Exporteer contacten naar een .vcf-bestand en importeer ze hieronder. Alles blijft op dit apparaat.</p>',
  '<div class="msv-contact-grid">',
  '<label>Naam<input id="msvContactName" type="text" maxlength="120" autocomplete="off" placeholder="Naam contactpersoon"></label>',
  '<label>Telefoon (optioneel)<input id="msvContactPhone" type="tel" maxlength="60" autocomplete="off" placeholder="06…"></label></div>',
  '<div class="msv-contact-actions">',
  '<button type="button" id="msvContactAdd">Contact toevoegen / bijwerken</button>',
  '<label class="msv-contact-import">Contacten importeren (.vcf)<input id="msvContactFile" type="file" accept=".vcf,text/vcard,text/x-vcard" hidden></label>',
  '</div>',
  '<label>Opgeslagen contacten<select id="msvContactSelect"><option value="">Kies opgeslagen contact…</option></select></label>',
  '<div class="msv-contact-actions"><button type="button" id="msvContactDelete">Contact verwijderen</button></div>',
  '<p id="msvContactCount" class="msv-contact-secondary"></p>',
  '<p id="msvContactStatus" role="status" aria-live="polite"></p>',
  '<p class="msv-contact-secondary">Contacten worden alleen lokaal opgeslagen, niet automatisch gesynchroniseerd met iCloud of andere apparaten.</p>'
 ].join('');
 fieldset.insertAdjacentElement('beforebegin',book);
 document.getElementById('msvContactAdd').addEventListener('click',()=>{
  const name=document.getElementById('msvContactName'),phone=document.getElementById('msvContactPhone');
  if(!nameOf(name.value)){status('Vul eerst een naam in.');name.focus();return}
  const res=addContacts([{name:name.value,phone:phone.value}]);
  if(res){status(res.changed?'Contact bijgewerkt.':res.added?'Contact opgeslagen.':'Contact staat al in de lijst.');name.value='';phone.value=''}
 });
 document.getElementById('msvContactSelect').addEventListener('change',e=>{
  const index=Number(e.target.value);
  if(e.target.value!==''&&items[index]){
   document.getElementById('msvContactName').value=items[index].name;
   document.getElementById('msvContactPhone').value=items[index].phone;
  }
 });
 document.getElementById('msvContactDelete').addEventListener('click',()=>{
  const select=document.getElementById('msvContactSelect'),index=Number(select.value);
  if(select.value===''||!items[index]){status('Kies eerst een contact.');return}
  if(save(items.filter((_,i)=>i!==index)))status('Contact verwijderd.');
 });
 document.getElementById('msvContactFile').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(file.size>3*1024*1024){status('Bestand te groot (maximum 3 MB).');e.target.value='';return}
  try{
   const list=parseVCard(await file.text());
   if(!list.length){status('Geen contacten in dit .vcf-bestand gevonden.');return}
   const res=addContacts(list);
   if(res)status(list.length+' gelezen · '+res.added+' toegevoegd · '+res.changed+' bijgewerkt.');
  }catch(_){status('Contactenbestand kon niet worden gelezen.')}
  finally{e.target.value=''}
 });
 updateBook();
}
function style(){
 if(document.getElementById('msvContactStyle83212'))return;
 const el=document.createElement('style');el.id='msvContactStyle83212';
 el.textContent=[
  '#msVoyagePreparation .msv-contact-list{position:relative;z-index:2;max-height:220px;overflow-y:auto;-webkit-overflow-scrolling:touch;margin-top:3px;padding:5px;border:1px solid #668fa3;border-radius:10px;background:#e8f1f8}',
  '#msVoyagePreparation .msv-contact-list[hidden]{display:none!important}',
  '#msVoyagePreparation .msv-contact-option{width:100%;display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;min-height:48px;margin:0;padding:8px 10px;border:0;border-radius:8px;background:transparent;color:#082338;box-shadow:none}',
  '#msVoyagePreparation .msv-contact-option strong{font-size:15px;color:#082338}',
  '#msVoyagePreparation .msv-contact-option small{font-size:12px;color:#426677}',
  '#msVoyagePreparation .msv-contact-option:hover,#msVoyagePreparation .msv-contact-option.selected{background:#c9e3ef}',
  '#msVoyagePreparation #msvContactBook{margin:16px 0 8px;padding:0 14px 14px;border:1px solid #568296;border-radius:12px;background:#0d3042}',
  '#msVoyagePreparation #msvContactBook>summary{min-height:44px;font-size:15px}',
  '#msVoyagePreparation #msvContactBook p{font-size:13px}',
  '#msVoyagePreparation .msv-contact-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}',
  '#msVoyagePreparation #msvContactBook label{display:flex;flex-direction:column;gap:7px;margin:10px 0;color:#e2eff6;font-size:13px}',
  '#msVoyagePreparation #msvContactBook input,#msVoyagePreparation #msvContactBook select{box-sizing:border-box;width:100%;min-width:0;min-height:46px;padding:10px;border:1px solid #7195a6;border-radius:9px;background:#061b28;color:#fff;font:16px system-ui}',
  '#msVoyagePreparation .msv-contact-actions{display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin:10px 0}',
  '#msVoyagePreparation .msv-contact-actions button,#msVoyagePreparation .msv-contact-actions .msv-contact-import{min-height:44px;margin:0;display:inline-flex;align-items:center;justify-content:center;padding:9px 12px;border:1px solid #6693a8;border-radius:9px;background:#17455b;color:#fff;font:700 14px/1.3 system-ui;cursor:pointer}',
  '#msVoyagePreparation .msv-contact-import input{display:none!important}',
  '#msVoyagePreparation .msv-contact-secondary{font-size:12px!important;opacity:.8}',
  '#msVoyagePreparation #msvContactStatus{color:#ffe2a0;font-weight:650}',
  '@media(max-width:640px){#msVoyagePreparation .msv-contact-grid{grid-template-columns:1fr}}'
 ].join('\n');
 document.head.appendChild(el);
}
function install(){
 style();read();fields.forEach(([key,multi])=>wire(key,multi));makeBook();
 document.addEventListener('pointerdown',e=>{
  for(const p of panels.values())if(e.target!==p.input&&!p.list.contains(e.target))hide(p);
 },{passive:true});
 window.addEventListener('mijnserenity:routechange',()=>{
  if(userId()!==owner){read();updateBook()}
 },{passive:true});
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&userId()!==owner){read();updateBook()}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
