/* MySerenity 2026-11 — veilig terugvinden van oudere lokale voorraad.
   Geen automatische merge of verwijdering. Werkt alleen na bevestiging. */
(()=>{
'use strict';
if(window.__msVoorraadHerstel1)return;
window.__msVoorraadHerstel1=true;
const PREFIX='mijnserenity:bootbeheer:v';
const PANEL_ID='msbm-voorraad-herstel';
let scheduled=false;
function boatId(){
  try{return String(currentBoat?.id||currentBoat?.boat_id||currentBoat?.name||'serenity')}
  catch(_){return 'serenity'}
}
function activeKey(){return PREFIX+'1:'+boatId()}
function parse(key){
  try{
    const obj=JSON.parse(localStorage.getItem(key)||'null');
    return obj&&typeof obj==='object'&&Array.isArray(obj.inventory)?obj:null;
  }catch(_){return null}
}
function keyList(){
  const keys=[];
  try{for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(key&&key.startsWith(PREFIX)&&key!==activeKey())keys.push(key);
  }}catch(_){}
  return keys;
}
function items(obj){return (Array.isArray(obj?.inventory)?obj.inventory:[]).filter(v=>v&&typeof v==='object'&&String(v.name||'').trim())}
function equipment(obj){return (Array.isArray(obj?.equipment)?obj.equipment:[]).filter(v=>v&&typeof v==='object'&&String(v.name||'').trim())}
function identifier(v){
  const id=String(v.id||'').trim();
  if(id)return 'id:'+id;
  return 'name:'+String(v.partNo||'').trim().toLowerCase()+'|'+String(v.name||'').trim().toLowerCase()+'|'+String(v.location||'').trim().toLowerCase();
}
function buildCandidates(){
  return keyList().map(key=>({key,data:parse(key)}))
    .filter(x=>x.data&&(items(x.data).length||equipment(x.data).length))
    .sort((a,b)=>String(b.data.updatedAt||'').localeCompare(String(a.data.updatedAt||'')));
}
function escapeHtml(text){return String(text??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function fileLabel(key){return key.endsWith(':serenity')?'Oudere bootopslag': 'Opgeslagen boot ('+escapeHtml(key.slice(PREFIX.length).slice(0,32))+')'}
function countNew(old,current){
  const ids=new Set(items(current).map(identifier));
  const names=new Set(items(current).map(x=>String(x.name||'').trim().toLowerCase()+'|'+String(x.partNo||'').trim().toLowerCase()));
  return items(old).filter(x=>!ids.has(identifier(x))&&!names.has(String(x.name||'').trim().toLowerCase()+'|'+String(x.partNo||'').trim().toLowerCase())).length;
}
function makePanel(candidates){
  const panel=document.createElement('section');
  panel.id=PANEL_ID;
  panel.style.cssText='margin:14px 0;padding:16px;border-radius:16px;background:#122b3d;border:1px solid rgba(110,205,244,.4);color:#f2faff';
  const current=parse(activeKey());
  const header=document.createElement('div');
  header.innerHTML='<strong style="font-size:17px">📦 Oude voorraad terugvinden</strong><p style="margin:6px 0 0;color:#bcd4e4;font-size:13px">Controle van opgeslagen voorraadlijsten op dit apparaat. Er wordt niets automatisch gewist of vervangen.</p>';
  panel.appendChild(header);
  if(!candidates.length){
    const msg=document.createElement('p');
    msg.style.cssText='margin:10px 0 0;font-size:13px;color:#bcd4e4';
    msg.textContent='Op dit apparaat is geen andere Bootbeheer-voorraad gevonden. Probeer dezelfde iPad/app of browser waarin je de artikelen eerder hebt ingevoerd.';
    panel.appendChild(msg);
    return panel;
  }
  candidates.forEach((cand,idx)=>{
    const list=items(cand.data),extra=countNew(cand.data,current);
    const card=document.createElement('div');
    card.style.cssText='border-top:1px solid rgba(255,255,255,.13);margin-top:14px;padding-top:12px';
    const title=document.createElement('strong');
    title.textContent=fileLabel(cand.key).replace(/&amp;/g,'&');
    const desc=document.createElement('p');
    desc.style.cssText='margin:4px 0;font-size:13px;color:#c9d9e4';
    desc.textContent=list.length+' voorraadartikel(en), '+equipment(cand.data).length+' apparaat/apparaten · '+extra+' mogelijk ontbrekend';
    card.append(title,desc);
    const details=document.createElement('details');
    details.style.cssText='margin:8px 0;color:#d9f2ff;font-size:13px';
    const sum=document.createElement('summary');
    sum.textContent='Bekijk bewaarde artikelen';
    details.appendChild(sum);
    const ul=document.createElement('ul');
    ul.style.cssText='margin:8px 0 8px 20px;padding:0';
    list.forEach(it=>{const li=document.createElement('li');li.textContent=String(it.name)+' · aantal '+String(it.qty??'?');ul.appendChild(li)});
    details.appendChild(ul);
    card.appendChild(details);
    if(extra>0){
      const btn=document.createElement('button');
      btn.type='button';btn.className='msbm-button';
      btn.style.cssText='min-height:44px;max-width:100%;white-space:normal;margin-top:6px';
      btn.textContent='Voeg '+extra+' ontbrekende artikel(en) toe';
      btn.addEventListener('click',()=>restore(cand.key,btn));
      card.appendChild(btn);
    }
    panel.appendChild(card);
  });
  return panel;
}
async function restore(sourceKey,btn){
  const source=parse(sourceKey),destination=parse(activeKey());
  if(!source||!destination){
    alert('De huidige voorraad is nog niet geladen. Open Bootbeheer opnieuw en probeer het opnieuw.');
    return;
  }
  const prior=items(destination);
  const ids=new Set(prior.map(identifier));
  const names=new Set(prior.map(x=>String(x.name||'').trim().toLowerCase()+'|'+String(x.partNo||'').trim().toLowerCase()));
  const extra=[];
  for(const item of items(source)){
    const sig=String(item.name||'').trim().toLowerCase()+'|'+String(item.partNo||'').trim().toLowerCase();
    if(ids.has(identifier(item))||names.has(sig))continue;
    extra.push(item);ids.add(identifier(item));names.add(sig);
  }
  if(!extra.length){alert('Deze lijst bevat geen ontbrekende voorraadartikelen.');return}
  const ok=confirm('Wil je '+extra.length+' ontbrekende voorraadartikelen toevoegen aan de huidige voorraad? Bestaande artikelen en aantallen blijven behouden. Eerst wordt een lokale back-up gemaakt.');
  if(!ok)return;
  const backupKey='mijnserenity:bootbeheer:herstel-backup:'+new Date().toISOString();
  try{localStorage.setItem(backupKey,JSON.stringify({source:activeKey(),data:destination}))}
  catch(err){alert('Back-up maken mislukt. Er is daarom niets gewijzigd.');return}
  const merged={...destination,inventory:[...prior,...extra],updatedAt:new Date().toISOString()};
  const filename='mijnserenity-voorraad-herstel.json';
  btn.disabled=true;btn.textContent='Voorraad herstellen…';
  try{
    const file=new File([JSON.stringify({app:'MijnSerenity Bootbeheer',data:merged})],filename,{type:'application/json'});
    await window.msBootbeheerImport(file);
    const after=parse(activeKey());
    const restored=items(after);
    const success=extra.every(x=>restored.some(y=>identifier(y)===identifier(x)));
    if(success){
      alert(extra.length+' voorraadartikelen hersteld. Controleer het voorraadscherm en de cloudstatus.');
      window.msBootbeheerSection?.('inventory');
    }else alert('Het samenvoegen is niet voltooid. De originele lijst en de lokale back-up zijn bewaard.');
  }catch(err){alert('Herstel mislukt. De originele voorraad is niet aangepast: '+(err?.message||'onbekende fout'))}
  finally{btn.disabled=false;btn.textContent='Voeg ontbrekende artikelen toe';schedule()}
}
function visibleInventory(){
  const overlay=document.getElementById('msBootbeheerOverlay');
  if(!overlay?.classList.contains('open'))return false;
  const selected=overlay.querySelector('#msbmTabs .msbm-tab.active');
  return Boolean(selected&&(selected.textContent||'').trim().toLowerCase()==='voorraad');
}
function apply(){
  if(!visibleInventory())return;
  const host=document.getElementById('msbmContent');
  if(!host||host.querySelector('#'+PANEL_ID))return;
  host.appendChild(makePanel(buildCandidates()));
}
function schedule(){
  if(scheduled)return;scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;apply()});
}
function start(){
  new MutationObserver(changes=>{
    if(changes.some(c=>c.addedNodes.length||c.removedNodes.length))schedule();
  }).observe(document.getElementById('msBootbeheerOverlay')||document.body,{childList:true,subtree:true});
  schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();