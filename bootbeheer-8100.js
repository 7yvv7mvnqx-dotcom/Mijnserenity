/* MijnSerenity 8.1.0 — Bootbeheer
   YachtWave-inspired vessel management hub for maintenance, equipment,
   inventory, checklists, tasks, documents and notes.
   Local-first: safe offline persistence in localStorage. */
(()=>{
  'use strict';
  if(window.__msBootbeheer8100)return;
  window.__msBootbeheer8100=true;

  const VERSION='8.1.0';
  const DB_VERSION=1;
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
  const uid=()=>globalThis.crypto?.randomUUID?.()||`ms-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const today=()=>new Date().toISOString().slice(0,10);
  const fmtDate=value=>{
    if(!value)return 'Geen datum';
    const d=new Date(`${value}T12:00:00`);
    return Number.isNaN(d.getTime())?String(value):d.toLocaleDateString('nl-NL',{day:'2-digit',month:'short',year:'numeric'});
  };
  const num=value=>{
    const n=Number(String(value??'').replace(',','.'));
    return Number.isFinite(n)?n:null;
  };
  const boatId=()=>{
    try{return String(currentBoat?.id||currentBoat?.boat_id||currentBoat?.name||'serenity');}
    catch{return 'serenity';}
  };
  const storageKey=()=>`mijnserenity:bootbeheer:v${DB_VERSION}:${boatId()}`;

  const defaults=()=>({
    version:DB_VERSION,
    updatedAt:new Date().toISOString(),
    maintenance:[],
    equipment:[],
    inventory:[],
    tasks:[],
    documents:[],
    notes:[],
    checklists:[
      {
        id:uid(),name:'Vertrekcontrole',icon:'🧭',createdAt:new Date().toISOString(),
        items:[
          {id:uid(),text:'Walstroom los en opgeborgen',done:false},
          {id:uid(),text:'Landvasten en stootwillen gecontroleerd',done:false},
          {id:uid(),text:'Motorruimte visueel gecontroleerd',done:false},
          {id:uid(),text:'Brandstof, water en accustatus gecontroleerd',done:false},
          {id:uid(),text:'Route en weer gecontroleerd',done:false}
        ]
      },
      {
        id:uid(),name:'Aankomstcontrole',icon:'⚓',createdAt:new Date().toISOString(),
        items:[
          {id:uid(),text:'Landvasten en stootwillen vast',done:false},
          {id:uid(),text:'Motor uit en afsluiters gecontroleerd',done:false},
          {id:uid(),text:'Walstroom veilig aangesloten',done:false},
          {id:uid(),text:'Koelkast / 12V / bilge gecontroleerd',done:false}
        ]
      },
      {
        id:uid(),name:'Winterklaar',icon:'❄️',createdAt:new Date().toISOString(),
        items:[
          {id:uid(),text:'Drinkwatersysteem vorstvrij',done:false},
          {id:uid(),text:'Motor en koelwater winterklaar',done:false},
          {id:uid(),text:'Accu- en laadstrategie gecontroleerd',done:false},
          {id:uid(),text:'Vocht, ventilatie en dekzeil gecontroleerd',done:false}
        ]
      }
    ]
  });

  let state=load();
  let active='overview';
  let drawer=null;

  function normalize(data){
    const base=defaults();
    const src=data&&typeof data==='object'?data:{};
    return {
      version:DB_VERSION,
      updatedAt:src.updatedAt||base.updatedAt,
      maintenance:Array.isArray(src.maintenance)?src.maintenance:[],
      equipment:Array.isArray(src.equipment)?src.equipment:[],
      inventory:Array.isArray(src.inventory)?src.inventory:[],
      tasks:Array.isArray(src.tasks)?src.tasks:[],
      documents:Array.isArray(src.documents)?src.documents:[],
      notes:Array.isArray(src.notes)?src.notes:[],
      checklists:Array.isArray(src.checklists)&&src.checklists.length?src.checklists:base.checklists
    };
  }

  function load(){
    try{
      const raw=localStorage.getItem(storageKey());
      return raw?normalize(JSON.parse(raw)):defaults();
    }catch(error){
      console.warn('Bootbeheer kon lokale data niet lezen:',error);
      return defaults();
    }
  }

  function save(){
    state.updatedAt=new Date().toISOString();
    try{localStorage.setItem(storageKey(),JSON.stringify(state));}
    catch(error){console.warn('Bootbeheer kon niet lokaal opslaan:',error);}
    render();
    updateLauncher();
  }

  function dueInfo(item){
    if(item.completed)return {tone:'ok',label:'Afgerond'};
    if(item.dueDate){
      const due=new Date(`${item.dueDate}T23:59:59`);
      const days=Math.ceil((due-Date.now())/86400000);
      if(days<0)return {tone:'danger',label:`${Math.abs(days)} d te laat`};
      if(days===0)return {tone:'warn',label:'Vandaag'};
      if(days<=30)return {tone:'warn',label:`Over ${days} d`};
    }
    if(item.dueHours!=null&&item.currentHours!=null){
      const left=Number(item.dueHours)-Number(item.currentHours);
      if(Number.isFinite(left)){
        if(left<0)return {tone:'danger',label:`${Math.abs(Math.round(left))} u te laat`};
        if(left<=20)return {tone:'warn',label:`Nog ${Math.round(left)} u`};
      }
    }
    return {tone:'neutral',label:item.dueDate?fmtDate(item.dueDate):'Gepland'};
  }

  function stats(){
    const due=state.maintenance.filter(item=>['danger','warn'].includes(dueInfo(item).tone)).length;
    const openTasks=state.tasks.filter(item=>!item.done).length;
    const lowStock=state.inventory.filter(item=>(num(item.qty)??0)<=(num(item.minQty)??0)).length;
    const expiring=state.documents.filter(item=>{
      if(!item.expiry)return false;
      const days=Math.ceil((new Date(`${item.expiry}T23:59:59`)-Date.now())/86400000);
      return days<=45;
    }).length;
    return {due,openTasks,lowStock,expiring};
  }

  function installStyle(){
    if($('msBootbeheerStyle8100'))return;
    const style=document.createElement('style');
    style.id='msBootbeheerStyle8100';
    style.textContent=`
      :root{--msbm-bg:#07131f;--msbm-card:#0d2030;--msbm-card2:#112a3e;--msbm-border:rgba(255,255,255,.11);--msbm-text:#f5fbff;--msbm-muted:#9eb4c5;--msbm-accent:#45c5ff;--msbm-good:#42d392;--msbm-warn:#ffbf47;--msbm-danger:#ff6b6b}
      #msBootbeheerLauncher{position:relative;overflow:hidden;background:linear-gradient(145deg,#0d2437,#0b1b2a)!important;border:1px solid rgba(69,197,255,.3)!important}
      #msBootbeheerLauncher:before{content:'';position:absolute;inset:auto -40px -70px auto;width:180px;height:180px;border-radius:50%;background:rgba(69,197,255,.08)}
      #msBootbeheerLauncher .msbm-launch-head{display:flex;gap:12px;align-items:center;justify-content:space-between}
      #msBootbeheerLauncher .msbm-launch-title{display:flex;gap:12px;align-items:center}.msbm-launch-icon{font-size:30px}
      #msBootbeheerLauncher h3{margin:0}.msbm-launch-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:14px 0}
      .msbm-mini{padding:10px;border-radius:14px;background:rgba(255,255,255,.055);text-align:center}.msbm-mini b{display:block;font-size:20px}.msbm-mini small{color:var(--msbm-muted)}
      #msBootbeheerOverlay{position:fixed;inset:0;z-index:2147481000;background:var(--msbm-bg);color:var(--msbm-text);display:none;overflow:auto;-webkit-overflow-scrolling:touch;padding-bottom:calc(24px + env(safe-area-inset-bottom))}
      #msBootbeheerOverlay.open{display:block}.msbm-shell{max-width:980px;margin:0 auto;padding:calc(12px + env(safe-area-inset-top)) 14px 30px}
      .msbm-head{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:12px;padding:10px 0 12px;background:linear-gradient(var(--msbm-bg) 82%,rgba(7,19,31,0));backdrop-filter:blur(14px)}
      .msbm-head button,.msbm-button{border:0;border-radius:14px;padding:11px 14px;font:inherit;font-weight:800;color:#06131d;background:var(--msbm-accent);cursor:pointer}.msbm-head .msbm-close{width:44px;height:44px;padding:0;border-radius:50%;background:rgba(255,255,255,.09);color:#fff;font-size:24px}
      .msbm-head-copy{min-width:0;flex:1}.msbm-eyebrow{display:block;color:var(--msbm-accent);font-size:11px;letter-spacing:.15em;font-weight:900}.msbm-head h2{margin:2px 0 0;font-size:24px}.msbm-head small{color:var(--msbm-muted)}
      .msbm-tabs{display:flex;gap:8px;overflow:auto;padding:4px 0 12px;scrollbar-width:none}.msbm-tabs::-webkit-scrollbar{display:none}.msbm-tab{white-space:nowrap;border:1px solid var(--msbm-border);background:rgba(255,255,255,.045);color:var(--msbm-text);border-radius:999px;padding:9px 12px;font:inherit;font-size:13px;font-weight:750}.msbm-tab.active{background:var(--msbm-accent);color:#04131e;border-color:transparent}
      .msbm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.msbm-card{background:linear-gradient(150deg,var(--msbm-card2),var(--msbm-card));border:1px solid var(--msbm-border);border-radius:20px;padding:16px;box-shadow:0 12px 28px rgba(0,0,0,.16)}
      .msbm-card h3,.msbm-card h4{margin:0}.msbm-card p{color:var(--msbm-muted);margin:5px 0 0}.msbm-kpi{display:flex;align-items:center;gap:12px}.msbm-kpi>span{font-size:30px}.msbm-kpi b{font-size:27px;line-height:1}.msbm-kpi small{display:block;color:var(--msbm-muted);margin-top:4px}.msbm-wide{grid-column:1/-1}
      .msbm-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:4px 0 12px}.msbm-section-head h3{margin:0;font-size:20px}.msbm-add{border:1px solid rgba(69,197,255,.35);background:rgba(69,197,255,.1);color:var(--msbm-accent);border-radius:13px;padding:9px 11px;font-weight:850}
      .msbm-list{display:grid;gap:9px}.msbm-row{display:flex;gap:10px;align-items:flex-start;padding:12px;border:1px solid var(--msbm-border);border-radius:16px;background:rgba(255,255,255,.035)}.msbm-row-main{min-width:0;flex:1}.msbm-row strong{display:block}.msbm-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px;color:var(--msbm-muted);font-size:12px}.msbm-pill{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;background:rgba(255,255,255,.07);font-size:11px;font-weight:800}.msbm-pill.danger{background:rgba(255,107,107,.16);color:#ff9f9f}.msbm-pill.warn{background:rgba(255,191,71,.15);color:#ffd37a}.msbm-pill.ok{background:rgba(66,211,146,.14);color:#8af0bd}.msbm-pill.info{background:rgba(69,197,255,.14);color:#89dcff}
      .msbm-actions{display:flex;gap:7px;align-items:center}.msbm-iconbtn{border:1px solid var(--msbm-border);background:rgba(255,255,255,.05);color:#fff;border-radius:11px;min-width:36px;height:36px;font-size:16px}.msbm-empty{text-align:center;padding:28px 12px;color:var(--msbm-muted)}
      .msbm-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.msbm-form label{display:grid;gap:5px;color:var(--msbm-muted);font-size:12px;font-weight:800}.msbm-form input,.msbm-form select,.msbm-form textarea{width:100%;box-sizing:border-box;border:1px solid var(--msbm-border);border-radius:13px;background:#071824;color:#fff;padding:11px 12px;font:inherit}.msbm-form textarea{min-height:82px;resize:vertical}.msbm-form .wide{grid-column:1/-1}.msbm-form-actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px;margin-top:4px}.msbm-secondary{background:rgba(255,255,255,.08)!important;color:#fff!important;border:1px solid var(--msbm-border)!important}
      .msbm-check-head{display:flex;justify-content:space-between;gap:10px;align-items:center}.msbm-check-progress{height:6px;background:rgba(255,255,255,.08);border-radius:999px;overflow:hidden;margin:10px 0}.msbm-check-progress b{display:block;height:100%;background:var(--msbm-good)}.msbm-check-item{display:flex;gap:9px;align-items:flex-start;padding:8px 0;border-top:1px solid rgba(255,255,255,.06)}.msbm-check-item input{margin-top:3px;accent-color:var(--msbm-good)}.msbm-check-item.done span{text-decoration:line-through;color:var(--msbm-muted)}
      .msbm-quick{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.msbm-quick button{border:1px solid var(--msbm-border);background:rgba(255,255,255,.045);color:#fff;border-radius:15px;padding:13px 8px;font-weight:800}.msbm-quick span{display:block;font-size:22px;margin-bottom:4px}.msbm-note{white-space:pre-wrap}.msbm-low{color:#ffd37a}.msbm-overdue{color:#ff9f9f}
      .msbm-foot{margin:18px 0 0;text-align:center;color:var(--msbm-muted);font-size:11px}.msbm-file{position:absolute;left:-10000px}
      .msbm-drawer{position:fixed;inset:0;z-index:2147482000;background:rgba(0,0,0,.56);display:grid;place-items:end center;padding:12px;box-sizing:border-box}
      .msbm-drawer-card{width:min(720px,100%);max-height:88vh;max-height:88dvh;overflow:auto;box-sizing:border-box;border-radius:24px 24px 16px 16px}
      @media(max-width:680px){.msbm-grid{grid-template-columns:1fr}.msbm-wide{grid-column:auto}.msbm-form{grid-template-columns:1fr}.msbm-form .wide,.msbm-form-actions{grid-column:auto}.msbm-launch-stats{grid-template-columns:repeat(2,1fr)}.msbm-quick{grid-template-columns:repeat(3,1fr)}.msbm-shell{padding-left:10px;padding-right:10px}.msbm-card{border-radius:17px;padding:14px}.msbm-drawer{padding:12px 12px calc(112px + env(safe-area-inset-bottom))}.msbm-drawer-card{max-height:calc(100vh - 136px - env(safe-area-inset-top) - env(safe-area-inset-bottom));max-height:calc(100dvh - 136px - env(safe-area-inset-top) - env(safe-area-inset-bottom))}.msbm-form-actions{position:sticky;bottom:0;z-index:3;margin:8px -14px -14px;padding:12px 14px;background:linear-gradient(180deg,rgba(13,32,48,.92),#0d2030 30%);border-top:1px solid var(--msbm-border)}}
    `;
    document.head.appendChild(style);
  }

  function createOverlay(){
    if($('msBootbeheerOverlay'))return;
    const overlay=document.createElement('div');
    overlay.id='msBootbeheerOverlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Bootbeheer');
    overlay.innerHTML=`
      <div class="msbm-shell">
        <header class="msbm-head">
          <button class="msbm-close" type="button" onclick="msBootbeheerClose()" aria-label="Sluiten">×</button>
          <div class="msbm-head-copy"><span class="msbm-eyebrow">MIJNSERENITY</span><h2>Bootbeheer</h2><small id="msbmSubtitle">Alles van Serenity op één plek</small></div>
          <button type="button" class="msbm-button" onclick="msBootbeheerAddCurrent()">＋</button>
        </header>
        <nav id="msbmTabs" class="msbm-tabs" aria-label="Bootbeheer onderdelen"></nav>
        <div id="msbmContent"></div>
        <div class="msbm-foot">Bootbeheer ${VERSION} · offline beschikbaar · gegevens staan voorlopig veilig op dit apparaat</div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click',event=>{
      if(event.target===overlay)window.msBootbeheerClose();
    });
  }

  const sections=[
    ['overview','Overzicht'],['maintenance','Onderhoud'],['equipment','Apparatuur'],
    ['inventory','Voorraad'],['checklists','Checklists'],['tasks','Taken'],
    ['documents','Documenten'],['notes','Notities']
  ];

  function renderTabs(){
    const host=$('msbmTabs');
    if(!host)return;
    host.innerHTML=sections.map(([id,label])=>`<button type="button" class="msbm-tab ${active===id?'active':''}" onclick="msBootbeheerSection('${id}')">${label}</button>`).join('');
  }

  function overview(){
    const s=stats();
    return `
      <div class="msbm-grid">
        ${kpi('🔧',s.due,'Onderhoud aandacht',s.due?'Actie nodig':'Alles op schema','maintenance')}
        ${kpi('✅',s.openTasks,'Open taken',s.openTasks?'Nog te doen':'Alles afgehandeld','tasks')}
        ${kpi('📦',s.lowStock,'Voorraad laag',s.lowStock?'Aanvullen':'Voorraad op peil','inventory')}
        ${kpi('📄',s.expiring,'Documenten','verlopen / binnen 45 dagen','documents')}
        <section class="msbm-card msbm-wide">
          <div class="msbm-section-head"><div><h3>Snel naar MijnSerenity</h3><p>Techniek, logboek en kosten blijven één geheel.</p></div></div>
          <div class="msbm-quick">
            <button type="button" onclick="msBootbeheerGoto('technical')"><span>⚙️</span>Techniek</button>
            <button type="button" onclick="msBootbeheerGoto('logbook')"><span>📖</span>Logboek</button>
            <button type="button" onclick="msBootbeheerGoto('finance')"><span>💶</span>Financieel</button>
          </div>
        </section>
        <section class="msbm-card msbm-wide">
          <div class="msbm-section-head"><div><h3>Beheer & back-up</h3><p>Maak een export voordat je grote wijzigingen doet.</p></div></div>
          <div class="msbm-actions" style="flex-wrap:wrap">
            <button class="msbm-button" type="button" onclick="msBootbeheerExport()">⬇️ Exporteer</button>
            <button class="msbm-button msbm-secondary" type="button" onclick="document.getElementById('msbmImport').click()">⬆️ Importeer</button>
            <input class="msbm-file" id="msbmImport" type="file" accept="application/json" onchange="msBootbeheerImport(this.files?.[0]);this.value=''">
          </div>
        </section>
      </div>`;
  }

  function kpi(icon,value,title,sub,target){
    return `<button type="button" class="msbm-card" style="color:inherit;text-align:left" onclick="msBootbeheerSection('${target}')"><div class="msbm-kpi"><span>${icon}</span><div><b>${value}</b><strong>${esc(title)}</strong><small>${esc(sub)}</small></div></div></button>`;
  }

  function sectionHeader(title,subtitle,addLabel){
    return `<div class="msbm-section-head"><div><h3>${title}</h3><p>${subtitle}</p></div><button type="button" class="msbm-add" onclick="msBootbeheerAddCurrent()">＋ ${addLabel}</button></div>`;
  }

  function maintenanceView(){
    const rows=[...state.maintenance].sort((a,b)=>String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999'))).map(item=>{
      const due=dueInfo(item);
      return `<div class="msbm-row"><div class="msbm-row-main"><strong>${esc(item.title||'Onderhoud')}</strong><div class="msbm-meta"><span>${esc(item.category||'Algemeen')}</span>${item.dueDate?`<span>📅 ${fmtDate(item.dueDate)}</span>`:''}${item.dueHours?`<span>⏱ ${esc(item.dueHours)} motoruren</span>`:''}<span class="msbm-pill ${due.tone}">${esc(due.label)}</span></div>${item.notes?`<p>${esc(item.notes)}</p>`:''}</div><div class="msbm-actions"><button class="msbm-iconbtn" title="Afronden" onclick="msBootbeheerCompleteMaintenance('${item.id}')">✓</button><button class="msbm-iconbtn" title="Verwijderen" onclick="msBootbeheerDelete('maintenance','${item.id}')">🗑</button></div></div>`;
    }).join('');
    return `<section class="msbm-card">${sectionHeader('Onderhoud','Op datum én motoruren, zoals een echt onderhoudssysteem.','Onderhoud')}${rows?`<div class="msbm-list">${rows}</div>`:`<div class="msbm-empty">Nog geen onderhoud gepland.</div>`}</section>`;
  }

  function equipmentView(){
    const rows=state.equipment.map(item=>`<div class="msbm-row"><div class="msbm-row-main"><strong>${esc(item.name)}</strong><div class="msbm-meta">${item.brand?`<span>${esc(item.brand)}</span>`:''}${item.model?`<span>Model ${esc(item.model)}</span>`:''}${item.serial?`<span>S/N ${esc(item.serial)}</span>`:''}${item.location?`<span>📍 ${esc(item.location)}</span>`:''}</div>${item.notes?`<p>${esc(item.notes)}</p>`:''}</div><button class="msbm-iconbtn" onclick="msBootbeheerDelete('equipment','${item.id}')">🗑</button></div>`).join('');
    return `<section class="msbm-card">${sectionHeader('Apparatuur','Merk, model, serienummer en locatie altijd bij de hand.','Apparaat')}${rows?`<div class="msbm-list">${rows}</div>`:`<div class="msbm-empty">Nog geen apparatuur vastgelegd.</div>`}</section>`;
  }

  function inventoryView(){
    const rows=state.inventory.map(item=>{
      const q=num(item.qty)??0,min=num(item.minQty)??0,low=q<=min;
      return `<div class="msbm-row"><div class="msbm-row-main"><strong>${esc(item.name)}</strong><div class="msbm-meta"><span class="msbm-pill ${low?'warn':'ok'}">${esc(q)} op voorraad${low?' · aanvullen':''}</span>${item.partNo?`<span>Nr. ${esc(item.partNo)}</span>`:''}${item.location?`<span>📍 ${esc(item.location)}</span>`:''}</div></div><div class="msbm-actions"><button class="msbm-iconbtn" onclick="msBootbeheerStock('${item.id}',-1)">−</button><button class="msbm-iconbtn" onclick="msBootbeheerStock('${item.id}',1)">＋</button><button class="msbm-iconbtn" onclick="msBootbeheerDelete('inventory','${item.id}')">🗑</button></div></div>`;
    }).join('');
    return `<section class="msbm-card">${sectionHeader('Voorraad & reservedelen','Zie direct wat op raakt en waar het ligt.','Artikel')}${rows?`<div class="msbm-list">${rows}</div>`:`<div class="msbm-empty">Nog geen voorraad toegevoegd.</div>`}</section>`;
  }

  function tasksView(){
    const rows=[...state.tasks].sort((a,b)=>Number(a.done)-Number(b.done)||String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999'))).map(item=>{
      const overdue=!item.done&&item.dueDate&&new Date(`${item.dueDate}T23:59:59`)<new Date();
      return `<div class="msbm-row"><div class="msbm-row-main"><strong style="${item.done?'text-decoration:line-through;opacity:.65':''}">${esc(item.title)}</strong><div class="msbm-meta">${item.assignee?`<span>👤 ${esc(item.assignee)}</span>`:''}${item.dueDate?`<span class="${overdue?'msbm-overdue':''}">📅 ${fmtDate(item.dueDate)}</span>`:''}<span class="msbm-pill ${item.done?'ok':overdue?'danger':'info'}">${item.done?'Gereed':overdue?'Te laat':'Open'}</span></div>${item.notes?`<p>${esc(item.notes)}</p>`:''}</div><div class="msbm-actions"><button class="msbm-iconbtn" onclick="msBootbeheerToggleTask('${item.id}')">${item.done?'↩':'✓'}</button><button class="msbm-iconbtn" onclick="msBootbeheerDelete('tasks','${item.id}')">🗑</button></div></div>`;
    }).join('');
    return `<section class="msbm-card">${sectionHeader('Taken','Voor jezelf, familie of een monteur.','Taak')}${rows?`<div class="msbm-list">${rows}</div>`:`<div class="msbm-empty">Geen open taken. Dat vaart lekker.</div>`}</section>`;
  }

  function documentsView(){
    const rows=state.documents.map(item=>{
      const days=item.expiry?Math.ceil((new Date(`${item.expiry}T23:59:59`)-Date.now())/86400000):null;
      const tone=days==null?'neutral':days<0?'danger':days<=45?'warn':'ok';
      const label=days==null?'Geen verloopdatum':days<0?'Verlopen':days<=45?`Nog ${days} d`:'Geldig';
      return `<div class="msbm-row"><div class="msbm-row-main"><strong>${esc(item.title)}</strong><div class="msbm-meta"><span>${esc(item.type||'Document')}</span>${item.expiry?`<span>📅 ${fmtDate(item.expiry)}</span>`:''}<span class="msbm-pill ${tone}">${esc(label)}</span></div>${item.notes?`<p>${esc(item.notes)}</p>`:''}</div><div class="msbm-actions">${item.url?`<button class="msbm-iconbtn" onclick="window.open('${esc(item.url)}','_blank')">↗</button>`:''}<button class="msbm-iconbtn" onclick="msBootbeheerDelete('documents','${item.id}')">🗑</button></div></div>`;
    }).join('');
    return `<section class="msbm-card">${sectionHeader('Documenten','Verzekering, registratie, handleidingen en keuringsdata.','Document')}${rows?`<div class="msbm-list">${rows}</div>`:`<div class="msbm-empty">Nog geen documenten geregistreerd.</div>`}</section>`;
  }

  function notesView(){
    const rows=[...state.notes].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).map(item=>`<div class="msbm-row"><div class="msbm-row-main"><strong>${esc(item.title||'Notitie')}</strong><div class="msbm-meta"><span>${new Date(item.createdAt||Date.now()).toLocaleString('nl-NL')}</span></div><p class="msbm-note">${esc(item.text)}</p></div><button class="msbm-iconbtn" onclick="msBootbeheerDelete('notes','${item.id}')">🗑</button></div>`).join('');
    return `<section class="msbm-card">${sectionHeader('Notities','Snelle aantekeningen over de boot.','Notitie')}${rows?`<div class="msbm-list">${rows}</div>`:`<div class="msbm-empty">Nog geen notities.</div>`}</section>`;
  }

  function checklistsView(){
    const cards=state.checklists.map(list=>{
      const total=list.items?.length||0,done=list.items?.filter(item=>item.done).length||0,pct=total?Math.round(done/total*100):0;
      const items=(list.items||[]).map(item=>`<label class="msbm-check-item ${item.done?'done':''}"><input type="checkbox" ${item.done?'checked':''} onchange="msBootbeheerChecklistToggle('${list.id}','${item.id}',this.checked)"><span>${esc(item.text)}</span></label>`).join('');
      return `<section class="msbm-card"><div class="msbm-check-head"><div><h4>${esc(list.icon||'☑️')} ${esc(list.name)}</h4><p>${done}/${total} gereed</p></div><div class="msbm-actions"><button class="msbm-iconbtn" onclick="msBootbeheerResetChecklist('${list.id}')">↺</button><button class="msbm-iconbtn" onclick="msBootbeheerDelete('checklists','${list.id}')">🗑</button></div></div><div class="msbm-check-progress"><b style="width:${pct}%"></b></div>${items||'<div class="msbm-empty">Lege checklist</div>'}</section>`;
    }).join('');
    return `<div class="msbm-section-head"><div><h3>Checklists</h3><p>Vertrek, aankomst, veiligheid en winterklaar.</p></div><button type="button" class="msbm-add" onclick="msBootbeheerAddCurrent()">＋ Checklist</button></div><div class="msbm-grid">${cards}</div>`;
  }

  function render(){
    renderTabs();
    const host=$('msbmContent');
    if(!host)return;
    const views={overview,maintenance:maintenanceView,equipment:equipmentView,inventory:inventoryView,checklists:checklistsView,tasks:tasksView,documents:documentsView,notes:notesView};
    host.innerHTML=(views[active]||overview)();
    const sub=$('msbmSubtitle');
    if(sub)sub.textContent=`Serenity · bijgewerkt ${new Date(state.updatedAt).toLocaleString('nl-NL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}`;
  }

  function form(title,fields,onSubmit){
    closeDrawer();
    drawer=document.createElement('div');
    drawer.className='msbm-drawer';
    const card=document.createElement('div');
    card.className='msbm-card msbm-drawer-card';
    card.innerHTML=`<div class="msbm-section-head"><div><span class="msbm-eyebrow">NIEUW</span><h3>${esc(title)}</h3></div><button type="button" class="msbm-iconbtn" data-close>×</button></div><form class="msbm-form">${fields}</form>`;
    drawer.appendChild(card);document.body.appendChild(drawer);
    const f=card.querySelector('form');
    f.insertAdjacentHTML('beforeend','<div class="msbm-form-actions"><button type="button" class="msbm-button msbm-secondary" data-close>Annuleren</button><button class="msbm-button" type="submit">Opslaan</button></div>');
    drawer.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',closeDrawer));
    drawer.addEventListener('click',e=>{if(e.target===drawer)closeDrawer();});
    f.addEventListener('submit',e=>{e.preventDefault();onSubmit(new FormData(f));closeDrawer();save();});
    setTimeout(()=>f.querySelector('input,textarea,select')?.focus(),50);
  }

  function closeDrawer(){drawer?.remove();drawer=null;}
  const input=(name,label,type='text',extra='')=>`<label>${esc(label)}<input name="${name}" type="${type}" ${extra}></label>`;
  const textarea=(name,label)=>`<label class="wide">${esc(label)}<textarea name="${name}"></textarea></label>`;

  function addCurrent(){
    if(active==='overview'){active='maintenance';render();}
    if(active==='maintenance')return form('Onderhoud plannen',`${input('title','Onderhoud','text','required placeholder="Bijv. motorolie + filter"')}<label>Categorie<select name="category"><option>Motor</option><option>Elektrisch</option><option>Romp & dek</option><option>Veiligheid</option><option>Sanitair</option><option>Overig</option></select></label>${input('dueDate','Uiterlijk op','date')}${input('dueHours','Bij motoruren','number','min="0" step="1"')}${input('currentHours','Huidige motoruren','number','min="0" step="0.1"')}${input('intervalDays','Herhalen na dagen','number','min="1" step="1"')}${input('intervalHours','Herhalen na motoruren','number','min="1" step="1"')}${textarea('notes','Notitie')}`,fd=>state.maintenance.push({id:uid(),title:fd.get('title'),category:fd.get('category'),dueDate:fd.get('dueDate'),dueHours:num(fd.get('dueHours')),currentHours:num(fd.get('currentHours')),intervalDays:num(fd.get('intervalDays')),intervalHours:num(fd.get('intervalHours')),notes:fd.get('notes'),createdAt:new Date().toISOString()}));
    if(active==='equipment')return form('Apparaat toevoegen',`${input('name','Apparaat','text','required placeholder="Bijv. Victron MultiPlus-II"')}${input('brand','Merk')}${input('model','Model')}${input('serial','Serienummer')}${input('location','Locatie','text','placeholder="Machinekamer"')}${input('installed','Geïnstalleerd','date')}${textarea('notes','Notitie / specificaties')}`,fd=>state.equipment.push({id:uid(),name:fd.get('name'),brand:fd.get('brand'),model:fd.get('model'),serial:fd.get('serial'),location:fd.get('location'),installed:fd.get('installed'),notes:fd.get('notes'),createdAt:new Date().toISOString()}));
    if(active==='inventory')return form('Voorraad toevoegen',`${input('name','Artikel','text','required placeholder="Bijv. oliefilter"')}${input('partNo','Artikel-/onderdeelnummer')}${input('qty','Aantal','number','min="0" step="1" value="1"')}${input('minQty','Waarschuwen bij','number','min="0" step="1" value="1"')}${input('location','Locatie','text','placeholder="Bak stuurboord"')}${textarea('notes','Notitie')}`,fd=>state.inventory.push({id:uid(),name:fd.get('name'),partNo:fd.get('partNo'),qty:num(fd.get('qty'))??0,minQty:num(fd.get('minQty'))??0,location:fd.get('location'),notes:fd.get('notes'),createdAt:new Date().toISOString()}));
    if(active==='tasks')return form('Taak toevoegen',`${input('title','Taak','text','required placeholder="Bijv. impeller controleren"')}${input('assignee','Voor wie','text','placeholder="Michel / Desi / monteur"')}${input('dueDate','Uiterlijk op','date')}${textarea('notes','Notitie')}`,fd=>state.tasks.push({id:uid(),title:fd.get('title'),assignee:fd.get('assignee'),dueDate:fd.get('dueDate'),notes:fd.get('notes'),done:false,createdAt:new Date().toISOString()}));
    if(active==='documents')return form('Document registreren',`${input('title','Document','text','required placeholder="Bijv. verzekering Serenity"')}<label>Type<select name="type"><option>Verzekering</option><option>Registratie</option><option>Handleiding</option><option>Garantie</option><option>Keuring</option><option>Factuur</option><option>Overig</option></select></label>${input('expiry','Verloopt op','date')}${input('url','Link naar document','url','placeholder="https://…"')}${textarea('notes','Notitie')}`,fd=>state.documents.push({id:uid(),title:fd.get('title'),type:fd.get('type'),expiry:fd.get('expiry'),url:fd.get('url'),notes:fd.get('notes'),createdAt:new Date().toISOString()}));
    if(active==='notes')return form('Notitie toevoegen',`${input('title','Titel','text','required')}${textarea('text','Notitie')}`,fd=>state.notes.push({id:uid(),title:fd.get('title'),text:fd.get('text'),createdAt:new Date().toISOString()}));
    if(active==='checklists')return form('Checklist maken',`${input('name','Naam','text','required placeholder="Bijv. Veiligheid voor vertrek"')}${input('icon','Icoon','text','value="☑️"')}<label class="wide">Regels (één per regel)<textarea name="items" required placeholder="Reddingsvesten aan boord\nBrandblusser bereikbaar\nBilgepomp getest"></textarea></label>`,fd=>state.checklists.push({id:uid(),name:fd.get('name'),icon:fd.get('icon')||'☑️',createdAt:new Date().toISOString(),items:String(fd.get('items')||'').split(/\n+/).map(s=>s.trim()).filter(Boolean).map(text=>({id:uid(),text,done:false}))}));
  }

  function completeMaintenance(id){
    const item=state.maintenance.find(x=>x.id===id);if(!item)return;
    const now=today();
    item.lastCompletedAt=now;
    if(item.intervalDays){const d=new Date(`${now}T12:00:00`);d.setDate(d.getDate()+Number(item.intervalDays));item.dueDate=d.toISOString().slice(0,10);}
    else item.completed=true;
    if(item.intervalHours&&item.currentHours!=null){item.dueHours=Number(item.currentHours)+Number(item.intervalHours);item.completed=false;}
    save();
  }

  function installLauncher(){
    const settings=$('settings');
    if(!settings||$('msBootbeheerLauncher'))return false;
    const card=document.createElement('div');
    card.id='msBootbeheerLauncher';card.className='card';
    card.innerHTML=`<div class="msbm-launch-head"><div class="msbm-launch-title"><span class="msbm-launch-icon">🛥️</span><div><span class="msbm-eyebrow">BOOTBEHEER</span><h3>Serenity compleet beheren</h3></div></div><button type="button" class="msbm-button" onclick="msBootbeheerOpen()">Open</button></div><p>Onderhoud, apparatuur, voorraad, checklists, taken en documenten in één overzicht.</p><div class="msbm-launch-stats"><div class="msbm-mini"><b data-msbm-kpi="maintenance">0</b><small>onderhoud</small></div><div class="msbm-mini"><b data-msbm-kpi="tasks">0</b><small>taken</small></div><div class="msbm-mini"><b data-msbm-kpi="stock">0</b><small>voorraad laag</small></div><div class="msbm-mini"><b data-msbm-kpi="docs">0</b><small>documenten</small></div></div>`;
    const first=settings.querySelector('.card');
    if(first)first.insertAdjacentElement('beforebegin',card); else settings.prepend(card);
    updateLauncher();
    return true;
  }

  function updateLauncher(){
    const s=stats();
    const vals={maintenance:s.due,tasks:s.openTasks,stock:s.lowStock,docs:state.documents.length};
    Object.entries(vals).forEach(([key,value])=>{const el=document.querySelector(`[data-msbm-kpi="${key}"]`);if(el)el.textContent=String(value);});
  }

  function init(){
    installStyle();createOverlay();
    if(!installLauncher()){
      let attempts=0;const timer=setInterval(()=>{attempts++;if(installLauncher()||attempts>40)clearInterval(timer);},250);
    }
    updateLauncher();
  }

  window.msBootbeheerOpen=()=>{state=load();active='overview';render();$('msBootbeheerOverlay')?.classList.add('open');document.documentElement.style.overflow='hidden';};
  window.msBootbeheerClose=()=>{$('msBootbeheerOverlay')?.classList.remove('open');document.documentElement.style.overflow='';closeDrawer();};
  window.msBootbeheerSection=id=>{if(sections.some(([key])=>key===id)){active=id;render();}};
  window.msBootbeheerAddCurrent=addCurrent;
  window.msBootbeheerDelete=(collection,id)=>{if(!Array.isArray(state[collection]))return;const item=state[collection].find(x=>x.id===id);if(!item)return;if(!confirm('Dit onderdeel verwijderen?'))return;state[collection]=state[collection].filter(x=>x.id!==id);save();};
  window.msBootbeheerCompleteMaintenance=completeMaintenance;
  window.msBootbeheerStock=(id,delta)=>{const item=state.inventory.find(x=>x.id===id);if(!item)return;item.qty=Math.max(0,(num(item.qty)??0)+Number(delta||0));save();};
  window.msBootbeheerToggleTask=id=>{const item=state.tasks.find(x=>x.id===id);if(item){item.done=!item.done;item.completedAt=item.done?new Date().toISOString():null;save();}};
  window.msBootbeheerChecklistToggle=(listId,itemId,checked)=>{const list=state.checklists.find(x=>x.id===listId);const item=list?.items?.find(x=>x.id===itemId);if(item){item.done=Boolean(checked);save();}};
  window.msBootbeheerResetChecklist=id=>{const list=state.checklists.find(x=>x.id===id);if(list){(list.items||[]).forEach(item=>item.done=false);save();}};
  window.msBootbeheerGoto=target=>{window.msBootbeheerClose();try{if(typeof captainNavigate==='function')captainNavigate(target);}catch(error){console.warn('Navigeren vanuit Bootbeheer mislukt:',error);}};
  window.msBootbeheerExport=()=>{
    const payload={app:'MijnSerenity Bootbeheer',version:VERSION,exportedAt:new Date().toISOString(),boatId:boatId(),data:state};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`serenity-bootbeheer-${today()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  window.msBootbeheerImport=async file=>{
    if(!file)return;
    try{const parsed=JSON.parse(await file.text());const candidate=parsed?.data||parsed;if(!candidate||typeof candidate!=='object')throw new Error('Geen geldige Bootbeheer-back-up.');if(!confirm('Huidige Bootbeheer-data vervangen door deze back-up?'))return;state=normalize(candidate);save();}
    catch(error){alert(`Importeren mislukt: ${error?.message||error}`);}
  };

  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('msBootbeheerOverlay')?.classList.contains('open'))window.msBootbeheerClose();});
  window.addEventListener('mijnserenity:routechange',()=>setTimeout(installLauncher,0),{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();