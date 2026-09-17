/* Veiligheidsmodule voor Drukkerij Ontwikkel & Performance Hub. Testdata lokaal op dit apparaat. */
(function(){
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const h=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const TEAMS=['Ploeg A','Ploeg B','Ploeg C','Ploeg D','Ploeg E'];
  const LOCATIONS=['708-1','708-2','706','CTP','Nabewerking','Magazijn','Technische Dienst','Kantoor','Terrein','Overig'];
  const CATEGORIES=['Persoonlijk letsel','Bijna-ongeval','Machineveiligheid','PBM','Orde & netheid','Chemische stoffen','Brandveiligheid','Heftruck & intern transport','Ergonomie','Overig'];
  const TYPES=[['near','Bijna-ongeval / onveilige situatie'],['incident','Incident zonder letsel'],['accident','Ongeval / letsel'],['observation','Veiligheidsobservatie']];
  const SEVERITIES=['Laag','Middel','Hoog','Kritiek'];
  const REPORT_STATUS=['Nieuw','In onderzoek','Actie uitgezet','Afgerond'];
  const ACTION_STATUS=['Open','Bezig','Geblokkeerd','Afgerond'];
  const periodState={period:'m12',team:'',location:'',type:'',status:'',employee:'',q:''};

  function ensureStore(){
    S.safety=S.safety||{};
    S.safety.reports=S.safety.reports||[];
    S.safety.actions=S.safety.actions||[];
    S.safety.trainings=S.safety.trainings||[];
    S.safety.settings=S.safety.settings||{goalZeroStart:''};
    return S.safety;
  }
  function today(){return new Date().toISOString().slice(0,10)}
  function isoDate(v){if(!v)return null;const d=new Date(v+'T12:00:00');return isNaN(d)?null:d}
  function nlDate(v){const d=isoDate(v);return d?d.toLocaleDateString('nl-NL'):'—'}
  function empById(id){return S.e.find(e=>String(e[0])===String(id))}
  function empName(id){return empById(id)?.[1]||'Niet gekoppeld'}
  function typeLabel(v){return TYPES.find(x=>x[0]===v)?.[1]||v||'—'}
  function cutoff(period){
    if(period==='all')return null;
    const d=new Date();
    if(period==='year')return new Date(d.getFullYear(),0,1);
    const months={m1:1,m3:3,m6:6,m12:12}[period]||12;
    d.setMonth(d.getMonth()-months);d.setHours(0,0,0,0);return d;
  }
  function inPeriod(date,period){const c=cutoff(period);if(!c)return true;const d=isoDate(date);return !!d&&d>=c}
  function daysUntil(v){const d=isoDate(v);if(!d)return null;const now=isoDate(today());return Math.ceil((d-now)/86400000)}
  function isOpenAction(a){return a.status!=='Afgerond'}
  function isOverdue(a){const n=daysUntil(a.due);return isOpenAction(a)&&n!=null&&n<0}
  function filteredReports(){
    const s=ensureStore(),q=(periodState.q||'').toLowerCase();
    return s.reports.filter(r=>inPeriod(r.date,periodState.period)
      &&(!periodState.team||r.team===periodState.team)
      &&(!periodState.location||r.location===periodState.location)
      &&(!periodState.type||r.type===periodState.type)
      &&(!periodState.status||r.status===periodState.status)
      &&(!periodState.employee||String(r.employeeId)===String(periodState.employee))
      &&(!q||[r.description,r.category,r.location,r.ref,empName(r.employeeId)].join(' ').toLowerCase().includes(q)))
      .sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  }
  function employeeReports(id){return ensureStore().reports.filter(r=>String(r.employeeId)===String(id)).sort((a,b)=>(b.date||'').localeCompare(a.date||''))}
  function employeeActions(id){return ensureStore().actions.filter(a=>String(a.employeeId)===String(id)||String(a.ownerId)===String(id)).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'))}
  function employeeTrainings(id){return ensureStore().trainings.filter(t=>String(t.employeeId)===String(id)).sort((a,b)=>(b.date||'').localeCompare(a.date||''))}
  function sevClass(s){return ({Laag:'safe-low',Middel:'safe-mid',Hoog:'safe-high',Kritiek:'safe-critical'})[s]||'safe-low'}
  function statusClass(s){return s==='Afgerond'?'good':s==='Geblokkeerd'?'crit':s==='Nieuw'||s==='Open'?'att':'safe-progress'}
  function iconForType(t){return t==='accident'?'✚':t==='near'?'⚠':t==='incident'?'!':'◉'}
  function htmlOptions(arr,current,blank){return `${blank?`<option value="">${h(blank)}</option>`:''}${arr.map(x=>{const v=Array.isArray(x)?x[0]:x,l=Array.isArray(x)?x[1]:x;return`<option value="${h(v)}" ${String(current)===String(v)?'selected':''}>${h(l)}</option>`}).join('')}`}
  function activeEmployees(){return S.e.filter(e=>e[4]).sort((a,b)=>a[1].localeCompare(b[1]))}
  function employeeOptions(current,blank='Niet gekoppeld'){return `<option value="">${h(blank)}</option>${activeEmployees().map(e=>`<option value="${e[0]}" ${String(current)===String(e[0])?'selected':''}>${h(e[1])} — ${h(e[2]||'Support')}</option>`).join('')}`}

  function metrics(){
    const s=ensureStore(),month=s.reports.filter(r=>inPeriod(r.date,'m1'));
    return {reports:month.length,near:month.filter(r=>r.type==='near').length,accidents:month.filter(r=>r.type==='accident').length,open:s.actions.filter(isOpenAction).length,overdue:s.actions.filter(isOverdue).length};
  }
  function lastAccident(){return ensureStore().reports.filter(r=>r.type==='accident').sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0]||null}
  function goalZero(){
    const last=lastAccident(),settings=ensureStore().settings;
    const start=last?.date||settings.goalZeroStart;
    if(!start)return {days:null,text:'Nog geen startdatum of ongeval geregistreerd',date:null};
    const a=isoDate(start),b=isoDate(today()),days=Math.max(0,Math.floor((b-a)/86400000));
    return {days,text:last?`Sinds laatste geregistreerde ongeval op ${nlDate(last.date)}`:`Sinds ingestelde startdatum ${nlDate(start)}`,date:start};
  }
  function monthSeries(){
    const s=ensureStore(),now=new Date(),out=[];
    for(let i=5;i>=0;i--){
      const d=new Date(now.getFullYear(),now.getMonth()-i,1),y=d.getFullYear(),m=d.getMonth();
      const rows=s.reports.filter(r=>{const x=isoDate(r.date);return x&&x.getFullYear()===y&&x.getMonth()===m});
      out.push({label:d.toLocaleDateString('nl-NL',{month:'short'}),reports:rows.length,near:rows.filter(r=>r.type==='near').length,acc:rows.filter(r=>r.type==='accident').length});
    }
    return out;
  }
  function kpi(label,value,sub,click){return `<button class="card kpi safety-kpi ${click?'clickable':''}" ${click?`data-safety-jump="${h(click)}"`:''}><span class="muted">${h(label)}</span><b>${h(value)}</b><span class="muted">${h(sub)}</span></button>`}

  function safety(){
    ensureStore();
    if(window.safetyEmployeeFilter){periodState.employee=String(window.safetyEmployeeFilter);window.safetyEmployeeFilter=''}
    $('#eye').textContent='Goal Zero & opvolging';$('#title').textContent='Veiligheid';
    const m=metrics(),gz=goalZero(),series=monthSeries(),max=Math.max(1,...series.map(x=>x.reports));
    $('#view').innerHTML=`
      <div class="safety-actions-top">
        <div class="safety-title-note"><b>Veilig werken = samen verbeteren.</b><span>Registraties zijn bedoeld om risico’s, oorzaken en verbeteracties zichtbaar te maken — niet als persoonlijke strafscore.</span></div>
        <div class="toolbar"><button class="btn t" id="s-new-report">＋ Melding</button><button class="btn s" id="s-new-action">＋ Actie</button><button class="btn s" id="s-new-training">＋ Instructie</button><button class="btn s" id="s-print">⇧ PDF / delen</button></div>
      </div>
      <div class="grid safety-kpis">${kpi('Meldingen deze maand',m.reports,'Alle typen','reports')}${kpi('Bijna-ongevallen',m.near,'Deze maand','near')}${kpi('Open acties',m.open,m.overdue?`${m.overdue} over deadline`:'Geen verlopen acties','actions')}${kpi('Ongevallen',m.accidents,'Deze maand','accidents')}</div>
      <div class="grid safety-hero-grid">
        <section class="card goalzero"><div><span class="eyebrow">GOAL ZERO</span><h2>${gz.days==null?'Startregistratie nodig':`${gz.days} dagen`}</h2><p class="muted">${h(gz.text)}</p></div><button class="btn s" id="s-goal-start">Startdatum instellen</button></section>
        <section class="card safety-trend"><div class="section-title"><div><span class="eyebrow">TREND</span><h2>Laatste 6 maanden</h2></div></div><div class="trend-bars">${series.map(x=>`<div class="trend-col" title="${h(x.label)}: ${x.reports} meldingen"><div class="trend-stack"><i style="height:${Math.max(3,x.reports/max*100)}%"></i></div><b>${x.reports}</b><span>${h(x.label)}</span></div>`).join('')}</div><div class="muted trend-legend">Totaal meldingen per maand. Open een melding voor type, ernst en opvolging.</div></section>
      </div>
      <section class="card safety-filter-card">
        <div class="section-title"><div><span class="eyebrow">MELDINGEN</span><h2>Registratie & analyse</h2></div><span class="safe-count" id="s-count"></span></div>
        <div class="safety-filters">
          <select class="sel" id="sf-period">${htmlOptions([['m1','Laatste maand'],['m3','Laatste 3 maanden'],['m6','Laatste 6 maanden'],['m12','Laatste 12 maanden'],['year','Dit kalenderjaar'],['all','Alle perioden']],periodState.period)}</select>
          <select class="sel" id="sf-team">${htmlOptions(TEAMS,periodState.team,'Alle ploegen')}</select>
          <select class="sel" id="sf-loc">${htmlOptions(LOCATIONS,periodState.location,'Alle locaties')}</select>
          <select class="sel" id="sf-type">${htmlOptions(TYPES,periodState.type,'Alle typen')}</select>
          <select class="sel" id="sf-status">${htmlOptions(REPORT_STATUS,periodState.status,'Alle statussen')}</select>
          <select class="sel" id="sf-employee">${employeeOptions(periodState.employee,'Alle medewerkers')}</select>
          <input class="inp" id="sf-q" value="${h(periodState.q)}" placeholder="Zoek melding…">
          <button class="btn s" id="sf-reset">Filters wissen</button>
        </div>
        <div id="s-report-list"></div>
      </section>
      <div class="grid safety-two">
        <section class="card"><div class="section-title"><div><span class="eyebrow">ACTIES</span><h2>Open veiligheidsacties</h2></div><button class="btn s" id="s-action-all">Alle acties</button></div><div id="s-action-list">${actionListHtml(true)}</div></section>
        <section class="card"><div class="section-title"><div><span class="eyebrow">INSTRUCTIE</span><h2>Recente instructies & trainingen</h2></div></div><div id="s-training-list">${trainingListHtml()}</div></section>
      </div>`;
    bindMain();drawReports();window.scrollTo({top:0,behavior:'smooth'});
  }
  window.safety=safety;

  function bindMain(){
    $('#s-new-report').onclick=()=>openReportForm();$('#s-new-action').onclick=()=>openActionForm();$('#s-new-training').onclick=()=>openTrainingForm();$('#s-print').onclick=printReport;
    $('#s-goal-start').onclick=()=>{const v=prompt('Startdatum Goal Zero (jjjj-mm-dd):',ensureStore().settings.goalZeroStart||today());if(v&&isoDate(v)){ensureStore().settings.goalZeroStart=v;save();safety()}};
    const map={'sf-period':'period','sf-team':'team','sf-loc':'location','sf-type':'type','sf-status':'status','sf-employee':'employee'};
    Object.entries(map).forEach(([id,key])=>$('#'+id).onchange=e=>{periodState[key]=e.target.value;drawReports()});
    $('#sf-q').oninput=e=>{periodState.q=e.target.value;drawReports()};
    $('#sf-reset').onclick=()=>{Object.assign(periodState,{period:'m12',team:'',location:'',type:'',status:'',employee:'',q:''});safety()};
    $$('.safety-kpi[data-safety-jump]').forEach(b=>b.onclick=()=>{const j=b.dataset.safetyJump;if(j==='near'){periodState.type='near';$('#sf-type').value='near';drawReports();document.querySelector('.safety-filter-card').scrollIntoView({behavior:'smooth'})}else if(j==='accidents'){periodState.type='accident';$('#sf-type').value='accident';drawReports();document.querySelector('.safety-filter-card').scrollIntoView({behavior:'smooth'})}else if(j==='actions')document.querySelector('#s-action-list').scrollIntoView({behavior:'smooth'});else document.querySelector('.safety-filter-card').scrollIntoView({behavior:'smooth'})});
    $('#s-action-all').onclick=()=>openActionOverview();bindActionButtons();bindTrainingButtons();
  }
  function drawReports(){const rows=filteredReports();$('#s-count').textContent=`${rows.length} melding${rows.length===1?'':'en'}`;$('#s-report-list').innerHTML=rows.length?rows.map(reportRow).join(''):`<div class="safe-empty"><b>Nog geen meldingen voor deze selectie.</b><span>Gebruik “＋ Melding” om een veiligheidsobservatie, bijna-ongeval of incident vast te leggen.</span></div>`;$$('.safe-report-row').forEach(x=>x.onclick=()=>openReportDetail(x.dataset.id))}
  function reportRow(r){return `<button class="safe-report-row" data-id="${h(r.id)}"><span class="safe-type-icon ${sevClass(r.severity)}">${iconForType(r.type)}</span><span class="safe-main"><b>${h(r.description||r.category||typeLabel(r.type))}</b><span>${nlDate(r.date)} · ${h(r.location||'Geen locatie')} · ${h(r.team||'Geen ploeg')} · ${h(empName(r.employeeId))}</span><small>${h(typeLabel(r.type))} · ${h(r.category||'Overig')}</small></span><span class="safe-row-meta"><span class="safe-sev ${sevClass(r.severity)}">${h(r.severity||'Laag')}</span><span class="status ${statusClass(r.status)}">${h(r.status||'Nieuw')}</span></span><span class="emp-arrow">›</span></button>`}
  function actionListHtml(onlyOpen){let rows=ensureStore().actions.filter(a=>!onlyOpen||isOpenAction(a)).sort((a,b)=>(isOverdue(b)-isOverdue(a))||(a.due||'9999').localeCompare(b.due||'9999'));if(!rows.length)return `<div class="safe-empty compact"><span>${onlyOpen?'Geen open veiligheidsacties.':'Nog geen veiligheidsacties.'}</span></div>`;return rows.slice(0,onlyOpen?8:999).map(a=>`<div class="safe-action-row ${isOverdue(a)?'overdue':''}"><div><b>${h(a.title)}</b><span>${h(a.location||'Algemeen')} · ${h(empName(a.ownerId))}${a.due?' · deadline '+nlDate(a.due):''}</span>${a.verification?`<small>Controle: ${h(a.verification)}</small>`:''}</div><div><span class="status ${statusClass(a.status)}">${h(a.status)}</span><button class="safe-icon-btn" data-action-edit="${h(a.id)}" title="Bewerken">✎</button></div></div>`).join('')}
  function trainingListHtml(){const rows=ensureStore().trainings.sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,8);if(!rows.length)return `<div class="safe-empty compact"><span>Nog geen instructies of trainingen geregistreerd.</span></div>`;return rows.map(t=>`<div class="safe-training-row"><div><b>${h(t.title)}</b><span>${nlDate(t.date)} · ${h(empName(t.employeeId))}</span><small>${h(t.type||'Instructie')}${t.validUntil?' · geldig t/m '+nlDate(t.validUntil):''}</small></div><button class="safe-icon-btn" data-training-edit="${h(t.id)}" title="Bewerken">✎</button></div>`).join('')}
  function bindActionButtons(){$$('[data-action-edit]').forEach(b=>b.onclick=e=>{e.stopPropagation();openActionForm(ensureStore().actions.find(a=>a.id===b.dataset.actionEdit))})}
  function bindTrainingButtons(){$$('[data-training-edit]').forEach(b=>b.onclick=e=>{e.stopPropagation();openTrainingForm(ensureStore().trainings.find(t=>t.id===b.dataset.trainingEdit))})}

  function closePanel(){document.querySelector('#safety-panel')?.remove();document.body.classList.remove('safe-open')}
  function panel(title,subtitle,body,wide=false){closePanel();document.body.insertAdjacentHTML('beforeend',`<div class="safe-backdrop" id="safety-panel"><section class="safe-panel ${wide?'wide':''}" role="dialog" aria-modal="true"><div class="safe-panel-head"><div><span class="eyebrow">VEILIGHEID</span><h2>${h(title)}</h2><p>${h(subtitle||'')}</p></div><button class="safe-close">×</button></div><div class="safe-panel-body">${body}</div></section></div>`);document.body.classList.add('safe-open');const p=$('#safety-panel');p.querySelector('.safe-close').onclick=closePanel;p.onclick=e=>{if(e.target===p)closePanel()};return p}
  function reportFormHtml(r={}){const e=empById(r.employeeId),team=r.team||e?.[2]||'';return `<div class="safe-form-grid"><label>Datum*<input id="sr-date" type="date" value="${h(r.date||today())}"></label><label>Type*<select id="sr-type">${htmlOptions(TYPES,r.type||'near')}</select></label><label>Categorie*<select id="sr-cat">${htmlOptions(CATEGORIES,r.category||'Machineveiligheid')}</select></label><label>Ernst<select id="sr-sev">${htmlOptions(SEVERITIES,r.severity||'Middel')}</select></label><label>Medewerker betrokken / melder<select id="sr-emp">${employeeOptions(r.employeeId)}</select></label><label>Ploeg<select id="sr-team">${htmlOptions(TEAMS,team,'Niet van toepassing')}</select></label><label>Locatie / machine<select id="sr-loc">${htmlOptions(LOCATIONS,r.location||'')}</select></label><label>Status<select id="sr-status">${htmlOptions(REPORT_STATUS,r.status||'Nieuw')}</select></label><label class="wide">Korte omschrijving*<textarea id="sr-desc" placeholder="Wat is er feitelijk gebeurd of gezien?">${h(r.description||'')}</textarea></label><label class="wide">Directe oorzaak / omstandigheden<textarea id="sr-cause" placeholder="Wat droeg bij aan de situatie?">${h(r.cause||'')}</textarea></label><label class="wide">Direct genomen maatregel<textarea id="sr-measure" placeholder="Wat is direct gedaan om het risico weg te nemen?">${h(r.measure||'')}</textarea></label><label class="wide">5xWhy / achterliggende oorzaak<textarea id="sr-why" placeholder="Optioneel: kern van de oorzaakanalyse">${h(r.fiveWhy||'')}</textarea></label><label class="wide">Foto / bewijs<input id="sr-photo" type="file" accept="image/*"><span class="safe-help">Foto’s worden verkleind en alleen lokaal in deze test-app opgeslagen.${r.photo?' Er is al een foto gekoppeld.':''}</span></label><label class="wide">Referentie / Common Sens / nummer<input id="sr-ref" value="${h(r.ref||'')}" placeholder="Optioneel"></label></div><div class="safe-form-actions"><button class="btn t" id="sr-save">Opslaan</button>${r.id?'<button class="btn danger" id="sr-delete">Verwijderen</button>':''}<button class="btn s" id="sr-cancel">Annuleren</button></div>`}
  function openReportForm(r){panel(r?.id?'Melding bewerken':'Nieuwe veiligheidsmelding','Leg feiten, risico en opvolging vast.',reportFormHtml(r),true);$('#sr-emp').onchange=e=>{const x=empById(e.target.value);if(x&&x[2])$('#sr-team').value=x[2]};$('#sr-cancel').onclick=closePanel;$('#sr-save').onclick=()=>saveReport(r);if(r?.id)$('#sr-delete').onclick=()=>{if(confirm('Deze veiligheidsmelding verwijderen?')){ensureStore().reports=ensureStore().reports.filter(x=>x.id!==r.id);save();closePanel();safety()}}}
  async function saveReport(old){const date=$('#sr-date').value,description=$('#sr-desc').value.trim();if(!date||!description)return toast('Vul datum en omschrijving in');const row={...(old||{}),id:old?.id||'sr'+Date.now(),date,type:$('#sr-type').value,category:$('#sr-cat').value,severity:$('#sr-sev').value,employeeId:$('#sr-emp').value,team:$('#sr-team').value,location:$('#sr-loc').value,status:$('#sr-status').value,description,cause:$('#sr-cause').value.trim(),measure:$('#sr-measure').value.trim(),fiveWhy:$('#sr-why').value.trim(),ref:$('#sr-ref').value.trim()};const file=$('#sr-photo').files[0];if(file){try{row.photo=await resizeImage(file)}catch(e){toast('Foto kon niet worden verwerkt')}}const s=ensureStore(),i=s.reports.findIndex(x=>x.id===row.id);if(i>=0)s.reports[i]=row;else s.reports.unshift(row);save();closePanel();safety()}
  function resizeImage(file){return new Promise((resolve,reject)=>{const rd=new FileReader();rd.onerror=reject;rd.onload=()=>{const im=new Image();im.onerror=reject;im.onload=()=>{const max=1100,scale=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*scale);c.height=Math.round(im.height*scale);c.getContext('2d').drawImage(im,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.72))};im.src=rd.result};rd.readAsDataURL(file)})}
  function openReportDetail(id){const r=ensureStore().reports.find(x=>x.id===id);if(!r)return;const related=ensureStore().actions.filter(a=>a.reportId===id);panel(typeLabel(r.type),`${nlDate(r.date)} · ${r.location||'Geen locatie'} · ${r.team||'Geen ploeg'}`,`<div class="safe-detail-head"><span class="safe-sev ${sevClass(r.severity)}">${h(r.severity)}</span><span class="status ${statusClass(r.status)}">${h(r.status)}</span></div><h3>${h(r.description)}</h3><div class="safe-detail-grid"><div><span>Medewerker</span><b>${h(empName(r.employeeId))}</b></div><div><span>Categorie</span><b>${h(r.category)}</b></div><div><span>Referentie</span><b>${h(r.ref||'—')}</b></div><div><span>Locatie</span><b>${h(r.location||'—')}</b></div></div>${detailBlock('Directe oorzaak / omstandigheden',r.cause)}${detailBlock('Direct genomen maatregel',r.measure)}${detailBlock('5xWhy / achterliggende oorzaak',r.fiveWhy)}${r.photo?`<div class="safe-photo"><img src="${r.photo}" alt="Foto bij veiligheidsmelding"></div>`:''}<div class="section-title safe-related"><div><span class="eyebrow">OPVOLGING</span><h2>Gekoppelde acties</h2></div><button class="btn s" id="sd-add-action">＋ Actie</button></div>${related.length?related.map(a=>`<div class="safe-action-row"><div><b>${h(a.title)}</b><span>${h(empName(a.ownerId))}${a.due?' · '+nlDate(a.due):''}</span></div><span class="status ${statusClass(a.status)}">${h(a.status)}</span></div>`).join(''):'<div class="safe-empty compact"><span>Nog geen actie gekoppeld.</span></div>'}<div class="safe-form-actions"><button class="btn t" id="sd-edit">Melding bewerken</button><button class="btn s" id="sd-close">Sluiten</button></div>`,true);$('#sd-edit').onclick=()=>openReportForm(r);$('#sd-close').onclick=closePanel;$('#sd-add-action').onclick=()=>openActionForm(null,r.id,r.employeeId,r.location)}
  function detailBlock(t,v){return v?`<div class="safe-detail-block"><span>${h(t)}</span><p>${h(v)}</p></div>`:''}

  function actionFormHtml(a={},reportId='',employeeId='',location=''){return `<div class="safe-form-grid"><label class="wide">Actie*<input id="sa-title" value="${h(a.title||'')}" placeholder="Concrete veiligheidsactie"></label><label>Eigenaar<select id="sa-owner">${employeeOptions(a.ownerId,'Kies eigenaar')}</select></label><label>Betrokken medewerker<select id="sa-emp">${employeeOptions(a.employeeId||employeeId)}</select></label><label>Deadline<input id="sa-due" type="date" value="${h(a.due||'')}"></label><label>Status<select id="sa-status">${htmlOptions(ACTION_STATUS,a.status||'Open')}</select></label><label>Locatie<select id="sa-loc">${htmlOptions(LOCATIONS,a.location||location,'Algemeen')}</select></label><label>Gekoppelde melding<select id="sa-report"><option value="">Geen</option>${ensureStore().reports.slice().sort((x,y)=>(y.date||'').localeCompare(x.date||'')).map(r=>`<option value="${h(r.id)}" ${(a.reportId||reportId)===r.id?'selected':''}>${nlDate(r.date)} — ${h((r.description||'').slice(0,60))}</option>`).join('')}</select></label><label class="wide">Toelichting<textarea id="sa-note">${h(a.note||'')}</textarea></label><label class="wide">Verificatie / controle<textarea id="sa-ver" placeholder="Hoe is gecontroleerd dat de maatregel werkt?">${h(a.verification||'')}</textarea></label></div><div class="safe-form-actions"><button class="btn t" id="sa-save">Opslaan</button>${a.id?'<button class="btn danger" id="sa-delete">Verwijderen</button>':''}<button class="btn s" id="sa-cancel">Annuleren</button></div>`}
  function openActionForm(a,reportId='',employeeId='',location=''){panel(a?.id?'Actie bewerken':'Nieuwe veiligheidsactie','Wijs eigenaar, deadline en verificatie toe.',actionFormHtml(a,reportId,employeeId,location),true);$('#sa-cancel').onclick=closePanel;$('#sa-save').onclick=()=>{const title=$('#sa-title').value.trim();if(!title)return toast('Vul een actie in');const row={...(a||{}),id:a?.id||'sa'+Date.now(),title,ownerId:$('#sa-owner').value,employeeId:$('#sa-emp').value,due:$('#sa-due').value,status:$('#sa-status').value,location:$('#sa-loc').value,reportId:$('#sa-report').value,note:$('#sa-note').value.trim(),verification:$('#sa-ver').value.trim()};const s=ensureStore(),i=s.actions.findIndex(x=>x.id===row.id);if(i>=0)s.actions[i]=row;else s.actions.unshift(row);save();closePanel();safety()};if(a?.id)$('#sa-delete').onclick=()=>{if(confirm('Deze veiligheidsactie verwijderen?')){ensureStore().actions=ensureStore().actions.filter(x=>x.id!==a.id);save();closePanel();safety()}}}
  function openActionOverview(){panel('Alle veiligheidsacties','Open, geblokkeerde en afgeronde acties.',`<div id="safe-all-actions">${actionListHtml(false)}</div><div class="safe-form-actions"><button class="btn t" id="sao-new">＋ Nieuwe actie</button><button class="btn s" id="sao-close">Sluiten</button></div>`,true);$('#sao-new').onclick=()=>openActionForm();$('#sao-close').onclick=closePanel;bindActionButtons()}

  function trainingFormHtml(t={}){return `<div class="safe-form-grid"><label>Datum*<input id="st-date" type="date" value="${h(t.date||today())}"></label><label>Medewerker*<select id="st-emp">${employeeOptions(t.employeeId,'Kies medewerker')}</select></label><label>Type<select id="st-type">${htmlOptions(['Veiligheidsinstructie','Toolbox','Training','Herinstructie','PBM-instructie','Machine-instructie'],t.type||'Veiligheidsinstructie')}</select></label><label>Geldig t/m<input id="st-valid" type="date" value="${h(t.validUntil||'')}"></label><label class="wide">Onderwerp*<input id="st-title" value="${h(t.title||'')}" placeholder="Bijv. drooglopen vochtdoseerrollen voorkomen"></label><label class="wide">Notitie / bewijs<textarea id="st-note">${h(t.note||'')}</textarea></label></div><div class="safe-form-actions"><button class="btn t" id="st-save">Opslaan</button>${t.id?'<button class="btn danger" id="st-delete">Verwijderen</button>':''}<button class="btn s" id="st-cancel">Annuleren</button></div>`}
  function openTrainingForm(t){panel(t?.id?'Instructie bewerken':'Nieuwe instructie / training','Koppel gevolgde veiligheidsinstructie aan een medewerker.',trainingFormHtml(t),true);$('#st-cancel').onclick=closePanel;$('#st-save').onclick=()=>{const date=$('#st-date').value,employeeId=$('#st-emp').value,title=$('#st-title').value.trim();if(!date||!employeeId||!title)return toast('Vul datum, medewerker en onderwerp in');const row={...(t||{}),id:t?.id||'st'+Date.now(),date,employeeId,type:$('#st-type').value,validUntil:$('#st-valid').value,title,note:$('#st-note').value.trim()};const s=ensureStore(),i=s.trainings.findIndex(x=>x.id===row.id);if(i>=0)s.trainings[i]=row;else s.trainings.unshift(row);save();closePanel();safety()};if(t?.id)$('#st-delete').onclick=()=>{if(confirm('Deze instructie verwijderen?')){ensureStore().trainings=ensureStore().trainings.filter(x=>x.id!==t.id);save();closePanel();safety()}}}

  function employeeBlock(e){const reports=employeeReports(e[0]),actions=employeeActions(e[0]).filter(isOpenAction),trainings=employeeTrainings(e[0]),last=reports[0];return `<section class="card employee-safety" id="employee-safety"><div class="section-title"><div><span class="eyebrow">VEILIGHEID</span><h2>Veiligheid & instructie</h2></div><button class="btn s" id="es-open">Open veiligheid</button></div><div class="employee-safe-grid"><div><span>Meldingen</span><b>${reports.length}</b><small>${last?'Laatste '+nlDate(last.date):'Geen registraties'}</small></div><div><span>Open acties</span><b>${actions.length}</b><small>${actions.filter(isOverdue).length?'Waarvan '+actions.filter(isOverdue).length+' over deadline':'Geen verlopen acties'}</small></div><div><span>Instructies</span><b>${trainings.length}</b><small>${trainings[0]?'Laatste '+nlDate(trainings[0].date):'Nog niet geregistreerd'}</small></div></div><p class="safe-employee-note">Dit overzicht toont feitelijke registraties en opvolging. Er wordt geen persoonlijke veiligheidsscore berekend.</p></section>`}
  function injectEmployee(e){document.querySelector('#employee-safety')?.remove();const anchor=document.querySelector('#hrq-section')||document.querySelector('.profile-cats');if(!anchor)return;anchor.insertAdjacentHTML('afterend',employeeBlock(e));$('#es-open').onclick=()=>{window.safetyEmployeeFilter=e[0];location.hash='safe'}}
  function dashboardCard(){if(location.hash&&location.hash!=='#dash')return;const view=$('#view');if(!view||document.querySelector('#safety-dashboard-card'))return;const m=metrics();const node=document.createElement('section');node.id='safety-dashboard-card';node.className='card safety-dashboard-card';node.innerHTML=`<div><span class="eyebrow">VEILIGHEID</span><h2>Goal Zero & opvolging</h2><p class="muted">${m.open} open acties · ${m.reports} melding${m.reports===1?'':'en'} deze maand · ${m.accidents} ongeval${m.accidents===1?'':'len'}.</p></div><button class="btn t">Open Veiligheid →</button>`;node.querySelector('button').onclick=()=>location.hash='safe';view.prepend(node)}
  function installNav(){['#nav','#bnav'].forEach(sel=>{const n=$(sel);if(!n||n.querySelector('[data-r="safe"]'))return;const b=document.createElement('button');b.dataset.r='safe';b.innerHTML='🦺 Veiligheid';b.onclick=()=>location.hash='safe';n.appendChild(b)})}
  function onHash(){setTimeout(()=>{const r=location.hash.slice(1)||'dash';if(r==='safe'){safety();$$('[data-r]').forEach(b=>b.classList.toggle('on',b.dataset.r==='safe'))}else if(r==='dash')dashboardCard()},0)}

  function printReport(){const rows=filteredReports(),s=ensureStore(),actions=s.actions.filter(a=>{if(periodState.employee&&String(a.employeeId)!==String(periodState.employee)&&String(a.ownerId)!==String(periodState.employee))return false;if(periodState.location&&a.location!==periodState.location)return false;return true}),gz=goalZero();const w=window.open('','_blank');if(!w)return toast('Pop-up geblokkeerd');w.document.write(`<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Veiligheidsrapport Drukkerij</title><style>body{font-family:Arial,sans-serif;color:#172334;margin:32px}h1{margin:0}h2{margin-top:28px;border-bottom:2px solid #0f766e;padding-bottom:6px}.meta{color:#667;margin:6px 0 22px}.k{display:flex;gap:12px}.k div{border:1px solid #ccd6df;border-radius:10px;padding:12px;min-width:130px}.k b{display:block;font-size:24px}table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}th,td{border:1px solid #d8e0e7;padding:7px;text-align:left;vertical-align:top}th{background:#edf3f6}.note{margin-top:24px;padding:10px;border:1px solid #ddd;background:#f7f8fa;font-size:11px}@media print{button{display:none}}</style></head><body><h1>Veiligheidsrapport Drukkerij</h1><div class="meta">Drukkerij Ontwikkel & Performance Hub · gegenereerd ${new Date().toLocaleString('nl-NL')}</div><div class="k"><div><span>Meldingen</span><b>${rows.length}</b></div><div><span>Open acties</span><b>${actions.filter(isOpenAction).length}</b></div><div><span>Over deadline</span><b>${actions.filter(isOverdue).length}</b></div><div><span>Goal Zero</span><b>${gz.days==null?'—':gz.days+' d'}</b></div></div><h2>Meldingen</h2>${rows.length?`<table><thead><tr><th>Datum</th><th>Type</th><th>Categorie</th><th>Locatie</th><th>Ploeg</th><th>Medewerker</th><th>Omschrijving</th><th>Ernst</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${nlDate(r.date)}</td><td>${h(typeLabel(r.type))}</td><td>${h(r.category)}</td><td>${h(r.location)}</td><td>${h(r.team)}</td><td>${h(empName(r.employeeId))}</td><td>${h(r.description)}</td><td>${h(r.severity)}</td><td>${h(r.status)}</td></tr>`).join('')}</tbody></table>`:'<p>Geen meldingen in deze selectie.</p>'}<h2>Acties</h2>${actions.length?`<table><thead><tr><th>Actie</th><th>Eigenaar</th><th>Locatie</th><th>Deadline</th><th>Status</th><th>Verificatie</th></tr></thead><tbody>${actions.map(a=>`<tr><td>${h(a.title)}</td><td>${h(empName(a.ownerId))}</td><td>${h(a.location)}</td><td>${nlDate(a.due)}</td><td>${h(a.status)}</td><td>${h(a.verification||'')}</td></tr>`).join('')}</tbody></table>`:'<p>Geen gekoppelde acties.</p>'}<div class="note">Veiligheidsregistraties zijn bedoeld voor risicoherkenning, oorzaakanalyse en opvolging. Dit rapport bevat geen persoonlijke veiligheidsscore.</div><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()}

  ensureStore();installNav();
  const originalProfile=window.openEmployeeProfile;
  if(typeof originalProfile==='function')window.openEmployeeProfile=function(id){originalProfile(id);const e=empById(id);if(e)setTimeout(()=>injectEmployee(e),0)};
  addEventListener('hashchange',onHash);
  if((location.hash.slice(1)||'dash')==='safe')setTimeout(safety,0);else if((location.hash.slice(1)||'dash')==='dash')setTimeout(dashboardCard,0);
})();