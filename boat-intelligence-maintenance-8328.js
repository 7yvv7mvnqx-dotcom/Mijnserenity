(function maintenanceModule(){
  'use strict';
  if(window.ms8328MaintenanceReady)return;
  if(typeof ms690RenderPredictive!=='function'||typeof persistTechnicalState!=='function')return;
  window.ms8328MaintenanceReady=true;
  const el=id=>document.getElementById(id);
  const tasks=()=>technicalStateCache?.maintenance||[];
  const taskById=id=>tasks().find(t=>String(t.id)===String(id));
  const today=()=>technicalToday();
  const num=v=>v===''||v===null||v===undefined?null:Number(v);
  const format=v=>Number(v).toLocaleString('nl-NL',{maximumFractionDigits:1});
  const html=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let activeId=null,creating=false,busy=false,previousFocus=null;
  const message=s=>{if(el('ms8328Message'))el('ms8328Message').textContent=s||'';};
  function setBusy(flag){
    busy=flag;
    el('ms8328Modal')?.querySelectorAll('button,input,select,textarea').forEach(node=>{
      node.disabled=flag;
    });
  }
  // Zonder laatst geregistreerde motoruren kan een onderhoudstaak niet '200 uur achterstallig' zijn.
  technicalTaskStatus=function(task){
    const hasDate=Boolean(String(task.lastDate||'').trim());
    const hasHours=task.lastHours!==null&&task.lastHours!==''&&task.lastHours!==undefined&&Number.isFinite(Number(task.lastHours));
    const dueDate=hasDate?technicalAddMonths(task.lastDate,Number(task.intervalMonths||0)):null;
    const daysLeft=technicalDaysUntil(dueDate);
    const nextHours=hasHours&&Number(task.intervalHours||0)>0?Number(task.lastHours)+Number(task.intervalHours):null;
    const hoursLeft=nextHours!==null?nextHours-Number(technicalStateCache?.engineHours||0):null;
    const neverDone=!hasDate&&!hasHours;
    const overdue=(daysLeft!==null&&daysLeft<0)||(hoursLeft!==null&&hoursLeft<0);
    const dueSoon=(daysLeft!==null&&daysLeft<=30)||(hoursLeft!==null&&hoursLeft<=10);
    const level=neverDone?'warning':overdue?'critical':dueSoon?'warning':'good';
    const label=neverDone?'Eerste controle nodig':overdue?'Achterstallig':dueSoon?'Binnenkort':'In orde';
    const detail=[];
    if(dueDate)detail.push('datum '+dueDate.toLocaleDateString('nl-NL',{day:'2-digit',month:'2-digit',year:'numeric'}));
    if(nextHours!==null)detail.push('bij '+format(nextHours)+' uur');
    if(!detail.length)detail.push(neverDone?'Laatste uitvoering nog invullen':'Interval aanvullen');
    return {level,label,detail:detail.join(' · '),daysLeft,hoursLeft,dueDate,nextHours,neverDone};
  };

  function createModal(){
    if(el('ms8328Modal'))return;
    const root=document.createElement('div');
    root.id='ms8328Modal';
    root.className='ms8328-overlay';
    root.setAttribute('aria-hidden','true');
    root.innerHTML=`
      <div class="ms8328-sheet" role="dialog" aria-modal="true" aria-labelledby="ms8328Heading">
        <header class="ms8328-head">
          <div><small>BOAT INTELLIGENCE · ONDERHOUD</small><h2 id="ms8328Heading">Onderhoud</h2></div>
          <button type="button" id="ms8328Close" aria-label="Sluiten">×</button>
        </header>
        <div id="ms8328ListView" hidden>
          <p>Alle onderhoudstaken van Serenity op één plek.</p>
          <div id="ms8328List"></div>
          <button type="button" class="ms8328-primary" id="ms8328New">＋ Taak toevoegen</button>
        </div>
        <form id="ms8328Form" hidden>
          <label>Onderhoudstaak<input id="ms8328Title" required maxlength="160"></label>
          <div class="ms8328-two">
            <label>Categorie<select id="ms8328Category">
              <option>Motor</option><option>Elektrisch</option><option>Romp</option>
              <option>Veiligheid</option><option>Verwarming</option><option>Overig</option>
            </select></label>
            <label>Interval (maanden)<input id="ms8328Months" type="number" min="0" max="240" step="1" inputmode="numeric"></label>
          </div>
          <div class="ms8328-two">
            <label>Interval (motoruren)<input id="ms8328Hours" type="number" min="0" max="100000" step=".1" inputmode="decimal"></label>
            <label>Laatste uitvoering<input id="ms8328LastDate" type="date"></label>
          </div>
          <label>Motoruren vorige uitvoering<input id="ms8328LastHours" type="number" min="0" step=".1" inputmode="decimal">
            <small>Historische correcties worden niet als nieuwe uitvoering gelogd.</small></label>
          <label>Omschrijving en bijzonderheden<textarea id="ms8328Notes" rows="2"></textarea></label>
          <p id="ms8328Due" class="ms8328-due"></p>
          <button type="submit" class="ms8328-primary" id="ms8328Save">Wijzigingen opslaan</button>
          <section id="ms8328Complete">
            <h3>Uitvoering gereedmelden</h3>
            <div class="ms8328-two">
              <label>Uitvoerdatum<input id="ms8328DoneDate" type="date"></label>
              <label>Motoruren bij uitvoering<input id="ms8328DoneHours" type="number" min="0" step=".1" inputmode="decimal"></label>
            </div>
            <label>Opmerking bij uitvoering<textarea id="ms8328DoneNotes" rows="2"></textarea></label>
            <label>Foto's (optioneel)<input id="ms8328Photos" type="file" accept="image/*" multiple>
              <small>Maximaal 6 foto's van 10 MB. De foto's komen bij het technisch logboek.</small></label>
            <button type="button" class="ms8328-primary ms8328-success" id="ms8328MarkDone">✓ Als uitgevoerd registreren</button>
          </section>
          <section class="ms8328-history">
            <h3>Onderhoudshistorie</h3><div id="ms8328History"></div>
            <button type="button" class="ms8328-secondary" id="ms8328OpenLog">Bekijk technisch logboek</button>
          </section>
          <button type="button" class="ms8328-remove" id="ms8328Remove" hidden>Taak verwijderen</button>
          <p id="ms8328Message" role="status" aria-live="polite"></p>
        </form>
      </div>`;
    document.body.append(root);
    el('ms8328Close').addEventListener('click',close);
    root.addEventListener('click',e=>{if(e.target===root)close();});
    el('ms8328New').addEventListener('click',()=>openTask(null));
    el('ms8328Form').addEventListener('submit',e=>{e.preventDefault();void save();});
    el('ms8328MarkDone').addEventListener('click',()=>void complete());
    el('ms8328Remove').addEventListener('click',()=>void remove());
    el('ms8328OpenLog').addEventListener('click',openLog);
    ['ms8328Title','ms8328Months','ms8328Hours','ms8328LastDate','ms8328LastHours'].forEach(id=>{
      el(id).addEventListener('input',preview);
    });
  }
  function open(){
    createModal();
    if(el('ms8328Modal').classList.contains('is-open'))return;
    previousFocus=document.activeElement;
    el('ms8328Modal').classList.add('is-open');
    el('ms8328Modal').setAttribute('aria-hidden','false');
  }
  function close(){
    if(busy)return;
    el('ms8328Modal')?.classList.remove('is-open');
    el('ms8328Modal')?.setAttribute('aria-hidden','true');
    if(el('ms8328Photos'))el('ms8328Photos').value='';
    message('');
    if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
  }
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&el('ms8328Modal')?.classList.contains('is-open')){e.preventDefault();close();}
  });
  function sorted(){
    const priorities={critical:0,warning:1,good:2};
    return [...tasks()].sort((a,b)=>
      (priorities[technicalTaskStatus(a).level]??3)-(priorities[technicalTaskStatus(b).level]??3)
      ||String(a.title).localeCompare(String(b.title),'nl')
    );
  }
  function openList(){
    open();creating=false;activeId=null;
    el('ms8328Heading').textContent='Alle onderhoudstaken';
    el('ms8328ListView').hidden=false;el('ms8328Form').hidden=true;
    const list=el('ms8328List');list.replaceChildren();
    for(const item of sorted()){
      const btn=document.createElement('button');btn.type='button';btn.className='ms8328-list-item';
      const title=document.createElement('strong');title.textContent=item.title;
      const detail=document.createElement('small');
      const status=technicalTaskStatus(item);
      detail.textContent=status.label+' · '+status.detail;
      btn.append(title,detail);btn.addEventListener('click',()=>openTask(item.id));list.append(btn);
    }
  }
  function openTask(id){
    open();
    const task=id===null?null:taskById(id);
    if(id!==null&&!task){openList();return;}
    activeId=task?.id??null;creating=!task;
    el('ms8328ListView').hidden=true;el('ms8328Form').hidden=false;
    el('ms8328Heading').textContent=task?.title||'Nieuwe onderhoudstaak';
    el('ms8328Title').value=task?.title||'';
    el('ms8328Category').value=task?.category||'Motor';
    if(!el('ms8328Category').value)el('ms8328Category').value='Overig';
    el('ms8328Months').value=task?.intervalMonths??12;
    el('ms8328Hours').value=task?.intervalHours??'';
    el('ms8328LastDate').value=task?.lastDate||'';
    el('ms8328LastHours').value=task?.lastHours??'';
    el('ms8328Notes').value=task?.notes||'';
    el('ms8328Complete').hidden=creating;
    el('ms8328Remove').hidden=creating||!String(task.id).startsWith('custom-');
    el('ms8328Save').textContent=creating?'Taak toevoegen':'Wijzigingen opslaan';
    el('ms8328DoneDate').value=today();
    el('ms8328DoneHours').value=technicalStateCache?.engineHours??'';
    el('ms8328DoneNotes').value='';
    el('ms8328Photos').value='';
    message('');preview();history();
  }
  function read(){
    const title=el('ms8328Title').value.trim();
    const months=num(el('ms8328Months').value);
    const hours=num(el('ms8328Hours').value);
    const lastHours=num(el('ms8328LastHours').value);
    if(!title)throw new Error('Vul de naam van de taak in.');
    if(!(months>0)&&!(hours>0))throw new Error('Vul minstens één onderhoudsinterval in.');
    if((months!==null&&(!Number.isInteger(months)||months<0||months>240))
      ||(hours!==null&&(!Number.isFinite(hours)||hours<0||hours>100000))
      ||(lastHours!==null&&(!Number.isFinite(lastHours)||lastHours<0)))
      throw new Error('Controleer de maanden en motoruren.');
    return {title,category:el('ms8328Category').value,
      intervalMonths:months>0?months:null,intervalHours:hours>0?hours:null,
      lastDate:el('ms8328LastDate').value||'',lastHours,notes:el('ms8328Notes').value.trim()};
  }
  function preview(){
    if(!el('ms8328Due'))return;
    try{const status=technicalTaskStatus(read());
      el('ms8328Due').textContent='Prognose: '+status.label+' · '+status.detail;
    }catch{el('ms8328Due').textContent='Vul een naam en minimaal één interval in.';}
  }
  async function save(){
    if(busy)return;
    let fields;try{fields=read();}catch(e){message(e.message);return;}
    if(!technicalStateCache){message('Technische gegevens worden nog geladen.');return;}
    setBusy(true);
    try{
      if(creating){const item={id:'custom-'+crypto.randomUUID(),...fields};
        technicalStateCache.maintenance.push(item);activeId=item.id;
      }else{const item=taskById(activeId);
        if(!item)throw new Error('Taak niet gevonden.');
        Object.assign(item,fields);
      }
      const shared=await persistTechnicalState('Onderhoudstaak opgeslagen.');
      openTask(activeId);
      message(shared?'Opgeslagen en gesynchroniseerd.':'Lokaal opgeslagen. Cloudsynchronisatie controleren.');
    }catch(e){message('Opslaan mislukt: '+(e.message||e));}
    finally{setBusy(false);}
  }
  function history(){
    const target=el('ms8328History');if(!target)return;
    const task=taskById(activeId);
    if(!task){target.textContent='Nog geen onderhoudshistorie.';return;}
    const items=(technicalEventsCache||[]).filter(event=>event.category==='Onderhoud'
      &&(String(event.notes||'').includes('Onderhoudstaak-ID: '+task.id)||event.title===task.title))
      .sort((a,b)=>String(b.event_date||'').localeCompare(String(a.event_date||''))).slice(0,8);
    target.innerHTML=items.length?items.map(event=>
      '<div class="ms8328-history-item"><strong>'+html(event.event_date||'Onbekend')+'</strong><span>'+
      html(event.title)+(event.engine_hours===null||event.engine_hours===undefined?'':' · '+html(format(event.engine_hours))+' uur')+
      '</span><small>'+html(String(event.notes||'').replace(/Onderhoudstaak-ID: [^\n]+\n?/,'').trim())+'</small></div>'
    ).join(''):'<p>Er zijn nog geen uitvoeringen gelogd.</p>';
  }
  async function attachPhotos(event,files){
    if(!files.length)return '';
    if(event?.source!=='cloud'||!currentBoat?.id||!currentUser?.id)
      return 'Foto’s kunnen pas worden toegevoegd wanneer het log in de cloud is opgeslagen.';
    let failed=0;
    const typeMap={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif'};
    for(const file of files){
      const ext=typeMap[file.type];
      if(!ext||file.size>10*1024*1024){failed++;continue;}
      const path=currentBoat.id+'/'+event.id+'/'+crypto.randomUUID()+'.'+ext;
      try{
        const {error:uploadError}=await sb.storage.from('technical-event-photos').upload(path,file,
          {cacheControl:'31536000',upsert:false,contentType:file.type});
        if(uploadError)throw uploadError;
        const {error:recordError}=await sb.from('technical_event_photos').insert({
          event_id:event.id,boat_id:currentBoat.id,created_by:currentUser.id,
          storage_path:path,original_name:file.name});
        if(recordError){await sb.storage.from('technical-event-photos').remove([path]);throw recordError;}
      }catch(e){console.error('Foto upload mislukt:',e);failed++;}
    }
    if(typeof window.msTechPhotosRefresh==='function')await window.msTechPhotosRefresh();
    return failed?failed+' foto(’s) mislukt. Voeg deze via technisch logboek opnieuw toe.':'Foto’s toegevoegd aan het technisch logboek.';
  }
  async function complete(){
    if(busy||creating)return;
    let fields;try{fields=read();}catch(e){message(e.message);return;}
    const date=el('ms8328DoneDate').value;
    const hours=num(el('ms8328DoneHours').value);
    const photos=Array.from(el('ms8328Photos').files||[]);
    if(!date||date>today()){message('Kies een uitvoerdatum die niet in de toekomst ligt.');return;}
    if(hours===null||!Number.isFinite(hours)||hours<0){message('Vul de motoruren bij de uitvoering in.');return;}
    if(photos.length>6){message('Selecteer maximaal 6 foto’s.');return;}
    const item=taskById(activeId);if(!item){message('Taak niet gevonden.');return;}
    if(!confirm(fields.title+' gereedmelden op '+date+' bij '+format(hours)+' motoruren?'))return;
    setBusy(true);
    try{
      Object.assign(item,fields,{lastDate:date,lastHours:hours});
      const shared=await persistTechnicalState('Onderhoud gereedgemeld.');
      const event=await createTechnicalEvent({
        category:'Onderhoud',title:fields.title,event_date:date,engine_hours:hours,
        notes:'Onderhoudstaak-ID: '+item.id+'\n'+(el('ms8328DoneNotes').value.trim()||'Onderhoud uitgevoerd.')+
          '\nVolgende onderhoudsmoment opnieuw berekend.'
      },{silent:true});
      const photoMsg=await attachPhotos(event,photos);
      openTask(item.id);
      message('Gereedgemeld'+(shared?' en gesynchroniseerd.':'; lokaal opgeslagen, controleer synchronisatie.')+
        (photoMsg?' '+photoMsg:''));
      if(typeof showAppToast==='function')showAppToast('Onderhoud gereedgemeld ✓');
    }catch(e){message('Gereedmelden mislukt: '+(e.message||e));}
    finally{setBusy(false);}
  }
  async function remove(){
    const item=taskById(activeId);
    if(busy||!item||!String(item.id).startsWith('custom-'))return;
    if(!confirm('Onderhoudstaak "'+item.title+'" verwijderen? Logboekregels blijven behouden.'))return;
    setBusy(true);
    try{
      technicalStateCache.maintenance=tasks().filter(t=>String(t.id)!==String(item.id));
      const shared=await persistTechnicalState('Taak verwijderd.');
      openList();if(!shared)message('Taak lokaal verwijderd. Controleer synchronisatie.');
    }catch(e){message('Verwijderen mislukt: '+(e.message||e));}
    finally{setBusy(false);}
  }
  function openLog(){
    const task=taskById(activeId);
    close();
    if(task&&el('technicalEventSearch')){
      el('technicalEventSearch').value=task.title;
      el('technicalEventFilter').value='Onderhoud';
      renderTechnicalEvents();
      el('technicalEventList')?.scrollIntoView({behavior:'smooth',block:'start'});
    }
  }
  function button(label,callback,cls='ms8328-mini'){
    const node=document.createElement('button');node.type='button';
    node.className=cls;node.textContent=label;
    node.addEventListener('click',e=>{e.stopPropagation();callback();});
    return node;
  }
  function decorateForecast(){
    const holder=el('ms690MaintenanceForecast');
    if(!holder)return;
    const forecast=ms690MaintenanceForecast();
    holder.querySelectorAll('.ms690-forecast-item').forEach((node,index)=>{
      const task=forecast[index]?.task;if(!task)return;
      node.classList.add('ms8328-clickable');node.tabIndex=0;
      node.addEventListener('click',()=>openTask(task.id));
      node.addEventListener('keydown',e=>{
        if(e.target===node&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openTask(task.id);}
      });
      const actions=document.createElement('div');actions.className='ms8328-card-actions';
      actions.append(button('Bewerken',()=>openTask(task.id)),button('Gereedmelden',()=>openTask(task.id),'ms8328-mini ms8328-done'));
      node.append(actions);
    });
    const header=holder.closest('.ms690-predictive-panel')?.querySelector('.ms690-subhead');
    if(header&&!header.parentElement.querySelector('.ms8328-card-toolbar')){
      const toolbar=document.createElement('div');toolbar.className='ms8328-card-toolbar';
      toolbar.append(button('Alle taken',openList,'ms8328-toolbar-button'),button('＋ Taak',()=>openTask(null),'ms8328-toolbar-button'));
      header.insertAdjacentElement('afterend',toolbar);
    }
  }
  function decoratePlanner(){
    const container=el('technicalMaintenanceList');if(!container)return;
    const ordered=sorted();
    container.querySelectorAll('.technical-maintenance-item').forEach((node,index)=>{
      const task=ordered[index],actions=node.querySelector('.technical-maintenance-actions');
      if(!task||!actions||actions.querySelector('.ms8328-planner-edit'))return;
      actions.prepend(button('Bewerken',()=>openTask(task.id),'ms8328-mini ms8328-planner-edit'));
    });
  }
  const originalPredictive=ms690RenderPredictive;
  ms690RenderPredictive=function(...args){
    const value=originalPredictive.apply(this,args);decorateForecast();return value;
  };
  const originalPlanner=renderTechnicalMaintenance;
  renderTechnicalMaintenance=function(...args){
    const value=originalPlanner.apply(this,args);decoratePlanner();return value;
  };
  createModal();
  if(technicalStateCache){ms690RenderPredictive();renderTechnicalMaintenance();}
})();