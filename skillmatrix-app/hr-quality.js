/* HR & Kwaliteit in het persoonlijke dossier. Testversie: dossierdata lokaal, bronknoppen naar SharePoint. */
(function(){
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const SOURCES={
    conversations:{label:'SharePoint gespreksverslagen',url:'https://royalsens.sharepoint.com/sites/MichelVissia/Shared%20Documents/Medewerkers/Medewerkers%20gesprekken/'},
    absence:{label:'SharePoint ziekteverzuim-overzicht',url:'https://royalsens-my.sharepoint.com/personal/vissia_sens_nl/_layouts/15/Doc.aspx?sourcedoc=%7BCD571F1C-3005-4E04-91EF-474DD349153A%7D&file=OVERZICHT+ZIEKTEVERZUIM.docx&action=default&mobileredirect=true&web=1'},
    external:{label:'SharePoint externe klachten 2026',url:'https://royalsens.sharepoint.com/sites/ExternalComplaints/Shared%20Documents/General/2026/'},
    internal:{label:'Procedure interne/externe klachten',url:'https://royalsens.sharepoint.com/sites/StandardOperatingProceduresSOP2/Shared%20Documents/General/13.%20Kwaliteit/Procedures/16.301_Agenda%20meeting%20Interne%20en%20Externe%20klachten.pdf?web=1'}
  };
  const periodState={};

  function ensureStore(){
    S.hrq=S.hrq||{};
    S.hrq.conversations=S.hrq.conversations||[];
    S.hrq.absence=S.hrq.absence||[];
    S.hrq.complaints=S.hrq.complaints||[];
    return S.hrq;
  }
  function isoToday(){return new Date().toISOString().slice(0,10)}
  function nlDate(v){if(!v)return '—';const d=new Date(v+'T12:00:00');return isNaN(d)?esc(v):d.toLocaleDateString('nl-NL')}
  function cutoff(period){
    if(period==='all')return null;
    const months={m3:3,m6:6,m12:12}[period]||12,d=new Date(); d.setMonth(d.getMonth()-months); d.setHours(0,0,0,0); return d;
  }
  function inPeriod(date,period){const c=cutoff(period);if(!c)return true;if(!date)return false;return new Date(date+'T12:00:00')>=c}
  function absenceOverlaps(r,period){
    const c=cutoff(period);if(!c)return true;
    const start=new Date((r.start||r.end)+'T12:00:00'),end=new Date((r.end||r.start||isoToday())+'T12:00:00');
    return end>=c && start<=new Date();
  }
  function daysBetween(start,end){
    if(!start)return 0;const a=new Date(start+'T12:00:00'),b=new Date((end||isoToday())+'T12:00:00');
    return Math.max(1,Math.floor((b-a)/86400000)+1);
  }
  function recordsFor(e,kind,period){
    const h=ensureStore();
    if(kind==='conversations')return h.conversations.filter(r=>String(r.e)===String(e[0])&&inPeriod(r.date,period)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    if(kind==='absence')return h.absence.filter(r=>String(r.e)===String(e[0])&&absenceOverlaps(r,period)).sort((a,b)=>(b.start||'').localeCompare(a.start||''));
    return h.complaints.filter(r=>String(r.e)===String(e[0])&&r.type===kind&&inPeriod(r.date,period)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  }
  function periodLabel(p){return ({m3:'3 maanden',m6:'6 maanden',m12:'12 maanden',all:'Alle perioden'})[p]||'12 maanden'}
  function topCategory(rows){
    const c={}; rows.forEach(r=>{const k=r.category||'Niet ingedeeld';c[k]=(c[k]||0)+1});
    return Object.entries(c).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';
  }
  function summary(e,kind,period){
    const rows=recordsFor(e,kind,period);
    if(kind==='conversations') return {value:rows.length,sub:rows.length?`Laatste: ${nlDate(rows[0].date)}`:'Nog geen dossierrecords'};
    if(kind==='absence'){
      const days=rows.reduce((n,r)=>n+daysBetween(r.start,r.end),0);
      return {value:rows.length,sub:`${days} geregistreerde dag${days===1?'':'en'}`};
    }
    return {value:rows.length,sub:rows.length?`Meest: ${topCategory(rows)}`:'Geen gekoppelde klachten'};
  }
  function card(kind,title,e,period,icon){
    const s=summary(e,kind,period);
    return `<button class="hrq-card" data-hrq="${kind}"><span class="hrq-icon">${icon}</span><span class="hrq-label">${esc(title)}</span><b>${s.value}</b><small>${esc(s.sub)}</small><span class="hrq-more">Bekijk overzicht →</span></button>`;
  }
  function block(e){
    const p=periodState[e[0]]||'m12';
    return `<section class="card hrq-section" id="hrq-section">
      <div class="hrq-head"><div><span class="eyebrow">HR & KWALITEIT</span><h2>Dossierkoppelingen</h2><p class="muted">Gespreksverslagen, verzuim en klachten per periode. Medische oorzaken/diagnoses worden niet opgeslagen.</p></div>
      <select class="sel hrq-period" aria-label="Periode"><option value="m3" ${p==='m3'?'selected':''}>Laatste 3 maanden</option><option value="m6" ${p==='m6'?'selected':''}>Laatste 6 maanden</option><option value="m12" ${p==='m12'?'selected':''}>Laatste 12 maanden</option><option value="all" ${p==='all'?'selected':''}>Alle perioden</option></select></div>
      <div class="hrq-grid">${card('conversations','Gespreksverslagen',e,p,'▤')}${card('absence','Ziekteverzuim',e,p,'◷')}${card('external','Externe klachten',e,p,'↗')}${card('internal','Interne klachten',e,p,'↘')}</div>
      <div class="hrq-note"><b>Bronkoppeling:</b> de knoppen in elk detailoverzicht openen de bestaande SharePoint-bron. In deze testversie worden de gekoppelde dossierregels lokaal op dit apparaat bewaard.</div>
    </section>`;
  }
  function inject(e){
    document.querySelector('#hrq-section')?.remove();
    const anchor=document.querySelector('.profile-cats')||document.querySelector('.profile-kpis');
    if(!anchor)return;
    anchor.insertAdjacentHTML('afterend',block(e));
    const root=$('#hrq-section');
    root.querySelector('.hrq-period').onchange=ev=>{periodState[e[0]]=ev.target.value;inject(e)};
    root.querySelectorAll('[data-hrq]').forEach(b=>b.onclick=()=>openPanel(e,b.dataset.hrq,periodState[e[0]]||'m12'));
  }
  function sourceFor(kind){return SOURCES[kind]||SOURCES.internal}
  function titleFor(kind){return ({conversations:'Gespreksverslagen',absence:'Ziekteverzuim',external:'Externe klachten',internal:'Interne klachten'})[kind]||kind}
  function detailSummary(e,kind,period){
    const r=recordsFor(e,kind,period);
    if(kind==='absence'){
      const days=r.reduce((n,x)=>n+daysBetween(x.start,x.end),0);
      return `${r.length} verzuimperiode${r.length===1?'':'n'} · ${days} geregistreerde dag${days===1?'':'en'} in ${periodLabel(period).toLowerCase()}.`;
    }
    if(kind==='conversations')return `${r.length} gespreksverslag${r.length===1?'':'en'} gekoppeld in ${periodLabel(period).toLowerCase()}.`;
    return `${r.length} ${kind==='external'?'externe':'interne'} klacht${r.length===1?'':'en'} gekoppeld. ${r.length?'Meest voorkomende categorie: '+topCategory(r)+'.':''}`;
  }
  function rowHtml(kind,r){
    if(kind==='conversations')return `<div class="hrq-row"><div><b>${esc(r.title||r.kind||'Gesprek')}</b><span>${nlDate(r.date)}${r.summary?' · '+esc(r.summary):''}</span></div><div>${r.url?`<a class="btn s" target="_blank" rel="noopener" href="${esc(r.url)}">Bron</a>`:''}<button class="hrq-del" data-id="${esc(r.id)}">×</button></div></div>`;
    if(kind==='absence')return `<div class="hrq-row"><div><b>${nlDate(r.start)} → ${r.end?nlDate(r.end):'lopend'}</b><span>${daysBetween(r.start,r.end)} dag${daysBetween(r.start,r.end)===1?'':'en'}${r.note?' · '+esc(r.note):''}</span></div><div>${r.url?`<a class="btn s" target="_blank" rel="noopener" href="${esc(r.url)}">Bron</a>`:''}<button class="hrq-del" data-id="${esc(r.id)}">×</button></div></div>`;
    return `<div class="hrq-row"><div><b>${esc(r.ref||'Klacht')} · ${esc(r.category||'Niet ingedeeld')}</b><span>${nlDate(r.date)}${r.po?' · PO '+esc(r.po):''}${r.note?' · '+esc(r.note):''}</span></div><div>${r.url?`<a class="btn s" target="_blank" rel="noopener" href="${esc(r.url)}">Bron</a>`:''}<button class="hrq-del" data-id="${esc(r.id)}">×</button></div></div>`;
  }
  function formHtml(kind){
    if(kind==='conversations')return `<div class="hrq-form-grid"><label>Datum<input id="hq-date" type="date" value="${isoToday()}"></label><label>Type<select id="hq-kind"><option>Ontwikkelgesprek</option><option>Functioneringsgesprek</option><option>Voortgangsgesprek</option><option>Overig gesprek</option></select></label><label class="wide">Titel<input id="hq-title" placeholder="Onderwerp gesprek"></label><label class="wide">Samenvatting<textarea id="hq-summary" placeholder="Korte zakelijke samenvatting"></textarea></label><label class="wide">Link naar verslag / bron<input id="hq-url" type="url" placeholder="https://..."></label></div>`;
    if(kind==='absence')return `<div class="hrq-form-grid"><label>Startdatum<input id="hq-start" type="date" value="${isoToday()}"></label><label>Einddatum<input id="hq-end" type="date"></label><label class="wide">Korte notitie<textarea id="hq-note" placeholder="Bijv. ziekmelding / hersteldatum. Geen medische oorzaak of diagnose."></textarea></label><label class="wide">Link naar bron<input id="hq-url" type="url" placeholder="https://..."></label></div>`;
    return `<div class="hrq-form-grid"><label>Datum<input id="hq-date" type="date" value="${isoToday()}"></label><label>Klachtnummer<input id="hq-ref" placeholder="R-26-... / intern nr."></label><label>PO / order<input id="hq-po" placeholder="PO"></label><label>Categorie<input id="hq-cat" placeholder="Kleur, stans, snijden..."></label><label class="wide">Samenvatting<textarea id="hq-note" placeholder="Korte feitelijke omschrijving"></textarea></label><label class="wide">Link naar klacht / bron<input id="hq-url" type="url" placeholder="https://..."></label></div>`;
  }
  function closePanel(){document.querySelector('#hrq-panel')?.remove();document.body.classList.remove('hrq-open')}
  function openPanel(e,kind,period){
    const source=sourceFor(kind),rows=recordsFor(e,kind,period);
    closePanel();
    document.body.insertAdjacentHTML('beforeend',`<div class="hrq-backdrop" id="hrq-panel"><section class="hrq-panel" role="dialog" aria-modal="true"><div class="hrq-panel-head"><div><span class="eyebrow">${esc(titleFor(kind).toUpperCase())}</span><h2>${esc(e[1])}</h2><p>${esc(detailSummary(e,kind,period))}</p></div><button class="hrq-close">×</button></div><div class="hrq-source"><a class="btn t" target="_blank" rel="noopener" href="${esc(source.url)}">Open ${esc(source.label)}</a><span class="muted">Periode: ${esc(periodLabel(period))}</span></div><div class="hrq-list">${rows.length?rows.map(r=>rowHtml(kind,r)).join(''):'<div class="hrq-empty">Nog geen gekoppelde dossierregels voor deze periode.</div>'}</div><details class="hrq-add"><summary>＋ Dossierregel toevoegen</summary>${formHtml(kind)}<button class="btn t" id="hq-save">Opslaan</button></details></section></div>`);
    document.body.classList.add('hrq-open');
    const panel=$('#hrq-panel');panel.querySelector('.hrq-close').onclick=closePanel;panel.onclick=ev=>{if(ev.target===panel)closePanel()};
    panel.querySelectorAll('.hrq-del').forEach(b=>b.onclick=()=>deleteRecord(e,kind,b.dataset.id,period));
    panel.querySelector('#hq-save').onclick=()=>addRecord(e,kind,period);
  }
  function addRecord(e,kind,period){
    const h=ensureStore(),id='hq'+Date.now();
    if(kind==='conversations'){
      const date=$('#hq-date').value;if(!date)return toast('Vul een datum in');
      h.conversations.unshift({id,e:e[0],date,kind:$('#hq-kind').value,title:$('#hq-title').value.trim(),summary:$('#hq-summary').value.trim(),url:$('#hq-url').value.trim()});
    } else if(kind==='absence'){
      const start=$('#hq-start').value;if(!start)return toast('Vul een startdatum in');
      h.absence.unshift({id,e:e[0],start,end:$('#hq-end').value,note:$('#hq-note').value.trim(),url:$('#hq-url').value.trim()});
    } else {
      const date=$('#hq-date').value;if(!date)return toast('Vul een datum in');
      h.complaints.unshift({id,e:e[0],type:kind,date,ref:$('#hq-ref').value.trim(),po:$('#hq-po').value.trim(),category:$('#hq-cat').value.trim(),note:$('#hq-note').value.trim(),url:$('#hq-url').value.trim()});
    }
    save();closePanel();openEmployeeProfile(e[0]);setTimeout(()=>openPanel(e,kind,period),0);
  }
  function deleteRecord(e,kind,id,period){
    const h=ensureStore();
    if(!confirm('Deze dossierregel verwijderen?'))return;
    if(kind==='conversations')h.conversations=h.conversations.filter(r=>r.id!==id);
    else if(kind==='absence')h.absence=h.absence.filter(r=>r.id!==id);
    else h.complaints=h.complaints.filter(r=>r.id!==id);
    save();closePanel();openEmployeeProfile(e[0]);setTimeout(()=>openPanel(e,kind,period),0);
  }

  ensureStore();
  const original=window.openEmployeeProfile;
  if(typeof original==='function') window.openEmployeeProfile=function(id){original(id);const e=S.e.find(x=>String(x[0])===String(id));if(e)setTimeout(()=>inject(e),0)};
})();