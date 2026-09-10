/* MijnSerenity 8.26.8 — AI snelvraag + slimme paginanavigatie + kostenanalyse. */
(()=>{
  'use strict';
  if(window.__msQuickAsk8267)return;
  window.__msQuickAsk8267=true;

  const ROOT='ms8210Start';
  const FORM='msQuickAsk8267';
  const STYLE='msQuickAsk8267Style';
  const ENDPOINT='/.netlify/functions/ai-quick-command';
  const allowedTargets=new Set(['dashboard','map','planner','ais','weather','live','technical','pois','logbook','costs','settings']);
  let observer=null;
  let busy=false;

  const sectionWords={
    'house-battery':['huishoudaccu','huishoud accu','house battery','soc','accuspanning'],
    'start-battery':['startaccu','start accu','starter battery'],
    fuel:['dieseltank','diesel','brandstof','fuel'],
    water:['drinkwater','watertank','water tank','waterniveau'],
    waste:['zwartwater','vuilwater','afvaltank','waste'],
    outside:['buitentemp','buitentemperatuur','outside temperature'],
    salon:['salon','cabine','binnentemperatuur'],
    machine:['machinekamer','machine kamer','engine room'],
    'solar-shore':['zon / walstroom','zonnepaneel','zonnepanelen','solar','walstroom','shore power'],
    speed:['snelheid','speed'],
    depth:['diepte','depth'],
    wind:['wind'],
    'current-position':['positie','gps','locatie','current position']
  };

  const pageAliases=[
    {target:'dashboard',words:['dashboard','home','startscherm','beginscherm','havenpagina']},
    {target:'map',words:['kaart','waterkaart','waterkaarten','navigatie','map']},
    {target:'planner',words:['reisplanner','routeplanner','route plannen','route']},
    {target:'ais',words:['ais','schepen','scheepvaart']},
    {target:'weather',words:['weer','weerbericht','verwachting','weather']},
    {target:'live',words:['live varen','varen','vaart','cockpit']},
    {target:'technical',words:['techniek','technisch','victron','accu','accus','tank','tanks','sensoren','energie']},
    {target:'pois',words:['poi','pois','havens','jachthaven','jachthavens','brug','bruggen','sluis','sluizen']},
    {target:'logbook',words:['logboek','vaargeschiedenis','reizen','journaal']},
    {target:'costs',words:['kosten','uitgaven','bonnen','bonnetje','brandstofkosten']},
    {target:'settings',words:['instellingen','settings','configuratie']}
  ];

  const financeCategories=[
    {name:'Elektra',words:['elektra','electra','elektriciteit','electriciteit','elektrisch','stroom','walstroom','shore power','victron']},
    {name:'Diesel',words:['diesel','brandstof','fuel','tanken']},
    {name:'Havengeld',words:['havengeld','jachthaven','marina','passantenhaven']},
    {name:'Ligplaats',words:['ligplaats','liggeld','vaste plaats']},
    {name:'Winterstalling',words:['winterstalling','winterberging','stalling']},
    {name:'Onderhoud',words:['onderhoud','reparatie','service','werkplaats','monteur']},
    {name:'Onderdelen',words:['onderdelen','onderdeel']},
    {name:'Materialen',words:['materialen','materiaal']},
    {name:'Boodschappen',words:['boodschappen','supermarkt']},
    {name:'Eten & Drinken',words:['eten en drinken','eten drinken','restaurant','horeca']},
    {name:'Verzekering',words:['verzekering','verzekeringen']},
    {name:'Overig',words:['overig','overige kosten']}
  ];

  function installStyle(){
    if(document.getElementById(STYLE))return;
    const s=document.createElement('style');
    s.id=STYLE;
    s.textContent=`
      #${ROOT} .msqa8267{position:relative;z-index:2;margin:0 0 16px}
      #${ROOT} .msqa8267-label{display:flex;align-items:center;gap:7px;margin:0 2px 8px;color:#8deeff;font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}
      #${ROOT} .msqa8267-label:before{content:'✦';font-size:13px;color:#25dbfb}
      #${ROOT} .msqa8267-row{display:grid;grid-template-columns:38px minmax(0,1fr) 44px;align-items:center;gap:4px;min-height:58px;padding:5px 6px 5px 10px;border:1px solid rgba(93,211,244,.42);border-radius:18px;background:linear-gradient(145deg,rgba(5,43,62,.96),rgba(2,25,39,.96));box-shadow:inset 0 1px rgba(255,255,255,.04),0 10px 24px rgba(0,0,0,.10);transition:border-color .18s ease,box-shadow .18s ease}
      #${ROOT} .msqa8267:focus-within .msqa8267-row{border-color:rgba(56,225,255,.88);box-shadow:0 0 0 3px rgba(34,216,255,.09),0 12px 28px rgba(0,0,0,.13)}
      #${ROOT} .msqa8267-spark{display:grid;place-items:center;width:34px;height:34px;border-radius:12px;background:rgba(34,216,255,.10);color:#31ddfb;font-size:18px}
      #${ROOT} .msqa8267 input{width:100%;min-width:0;height:46px;padding:0 4px;border:0!important;outline:0!important;background:transparent!important;color:#fff!important;font:700 14px/1.2 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;box-shadow:none!important;-webkit-appearance:none}
      #${ROOT} .msqa8267 input::placeholder{color:#8faab8;opacity:1;font-weight:600}
      #${ROOT} .msqa8267-send{display:grid!important;place-items:center!important;width:42px!important;height:42px!important;min-width:42px!important;min-height:42px!important;padding:0!important;border:0!important;border-radius:14px!important;background:linear-gradient(135deg,#0ec4ec,#20dff8)!important;color:#fff!important;box-shadow:0 8px 20px rgba(12,196,231,.18)!important;cursor:pointer!important}
      #${ROOT} .msqa8267-send svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2.2}
      #${ROOT} .msqa8267-send[disabled]{opacity:.55;cursor:wait!important}
      #${ROOT} .msqa8267-result{display:none;margin:8px 2px 0;padding:10px 12px;border:1px solid rgba(89,199,238,.25);border-radius:14px;background:rgba(2,24,37,.88);color:#dcebf1;font-size:12px;line-height:1.4;white-space:pre-line}
      #${ROOT} .msqa8267-result.show{display:block}
      #${ROOT} .msqa8267-result strong{color:#39ddfa}
      #${ROOT} .msqa8267-examples{margin:7px 2px 0;color:#7695a6;font-size:10px;line-height:1.35}
      @media(max-width:430px){
        #${ROOT} .msqa8267-row{grid-template-columns:34px minmax(0,1fr) 42px;min-height:55px;padding-left:8px;border-radius:17px}
        #${ROOT} .msqa8267-spark{width:31px;height:31px;border-radius:10px;font-size:16px}
        #${ROOT} .msqa8267 input{font-size:13px!important}
        #${ROOT} .msqa8267-send{width:39px!important;height:39px!important;min-width:39px!important;min-height:39px!important;border-radius:12px!important}
        #${ROOT} .msqa8267-examples{font-size:9.5px}
      }
    `;
    document.head.appendChild(s);
  }

  function normal(v){
    return String(v||'').toLocaleLowerCase('nl-NL').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s/.-]/g,' ').replace(/\s+/g,' ').trim();
  }
  function includesAny(text,words){return words.some(word=>text.includes(normal(word)))}
  function text(id){return String(document.getElementById(id)?.textContent||'').replace(/\s+/g,' ').trim()}
  function metric(id,label){const value=text(id);const sub=text(id+'Sub');return value&&value!=='—'?{label,value,sub}:null}

  function liveContext(){
    const values=[
      metric('ms8264House','Huishoudaccu'),metric('ms8264Start','Startaccu'),metric('ms8264Fuel','Dieseltank'),metric('ms8264Water','Drinkwater'),
      metric('ms8264Outside','Buitentemperatuur'),metric('ms8264Salon','Salon'),metric('ms8264Machine','Machinekamer'),metric('ms8264Solar','Zon / walstroom'),
      metric('ms8263Speed','Snelheid'),metric('ms8263Depth','Diepte'),metric('ms8263Wind','Wind')
    ].filter(Boolean);
    const p=window.liveNavState||{};
    const lat=Number(p.lat??p.currentLat),lon=Number(p.lon??p.currentLon);
    if(Number.isFinite(lat)&&Number.isFinite(lon))values.push({label:'GPS-positie',value:`${lat.toFixed(5)}, ${lon.toFixed(5)}`,sub:''});
    return values;
  }

  function metricAnswer(q){
    const n=normal(q),ctx=liveContext();
    const wantsInfo=/\b(wat|hoe|welke|hoeveel|status|stand|niveau|temperatuur|spanning|soc|vermogen|snelheid|diepte|wind|waar ben)\b/.test(n);
    if(!wantsInfo)return null;
    const rules=[
      {words:['huishoudaccu','huishoud accu','soc','accuspanning'],labels:['Huishoudaccu']},
      {words:['startaccu','start accu'],labels:['Startaccu']},
      {words:['diesel','dieseltank','brandstof'],labels:['Dieseltank']},
      {words:['drinkwater','watertank','waterniveau'],labels:['Drinkwater']},
      {words:['buitentemperatuur','buiten temp','buitentemp'],labels:['Buitentemperatuur']},
      {words:['salon','binnentemperatuur'],labels:['Salon']},
      {words:['machinekamer','machine kamer'],labels:['Machinekamer']},
      {words:['zonnepaneel','zonnepanelen','solar','walstroom','vermogen'],labels:['Zon / walstroom']},
      {words:['snelheid','vaart'],labels:['Snelheid']},
      {words:['diepte'],labels:['Diepte']},
      {words:['wind'],labels:['Wind']},
      {words:['waar ben','positie','gps locatie','gps-positie'],labels:['GPS-positie']}
    ];
    const rule=rules.find(r=>includesAny(n,r.words));
    if(!rule)return null;
    const hits=ctx.filter(item=>rule.labels.includes(item.label));
    if(!hits.length)return {action:'answer',answer:'Die live waarde is op dit moment nog niet beschikbaar.'};
    return {action:'answer',answer:hits.map(item=>`${item.label}: ${item.value}${item.sub?` · ${item.sub}`:''}`).join('\n')};
  }

  function euro(value){
    return new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(Number(value)||0);
  }

  function resolveFinanceCategory(q){
    const n=normal(q);
    return financeCategories.find(category=>includesAny(n,[category.name,...category.words]))||null;
  }

  function resolveFinancePeriod(q){
    const n=normal(q);
    const now=new Date();
    const iso=date=>{
      const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);
      return local.toISOString().slice(0,10);
    };
    const range=(start,end,label)=>({start:iso(start),end:iso(end),label});

    if(/\bvandaag\b/.test(n)){
      const d=new Date(now.getFullYear(),now.getMonth(),now.getDate());
      return range(d,d,'vandaag');
    }
    if(/\bdeze week\b/.test(n)){
      const day=(now.getDay()+6)%7;
      const start=new Date(now.getFullYear(),now.getMonth(),now.getDate()-day);
      const end=new Date(start.getFullYear(),start.getMonth(),start.getDate()+6);
      return range(start,end,'deze week');
    }
    if(/\bvorige week\b/.test(n)){
      const day=(now.getDay()+6)%7;
      const end=new Date(now.getFullYear(),now.getMonth(),now.getDate()-day-1);
      const start=new Date(end.getFullYear(),end.getMonth(),end.getDate()-6);
      return range(start,end,'vorige week');
    }
    if(/\bdeze maand\b/.test(n)){
      const start=new Date(now.getFullYear(),now.getMonth(),1);
      const end=new Date(now.getFullYear(),now.getMonth()+1,0);
      return range(start,end,'deze maand');
    }
    if(/\bvorige maand\b/.test(n)){
      const start=new Date(now.getFullYear(),now.getMonth()-1,1);
      const end=new Date(now.getFullYear(),now.getMonth(),0);
      return range(start,end,'vorige maand');
    }
    if(/\bdit jaar\b|\bdit seizoen\b/.test(n)){
      const start=new Date(now.getFullYear(),0,1);
      const end=new Date(now.getFullYear(),11,31);
      return range(start,end,String(now.getFullYear()));
    }
    if(/\bvorig jaar\b|\bvorig seizoen\b/.test(n)){
      const year=now.getFullYear()-1;
      return range(new Date(year,0,1),new Date(year,11,31),String(year));
    }
    const explicitYear=n.match(/\b(20\d{2})\b/);
    if(explicitYear){
      const year=Number(explicitYear[1]);
      return range(new Date(year,0,1),new Date(year,11,31),String(year));
    }
    return {start:'',end:'',label:'in totaal'};
  }

  function isFinanceQuestion(q){
    const n=normal(q);
    const hasMoneyWord=/\b(kosten?|gekost|kostte|uitgegeven|uitgaven|betaald|besteed|bedrag|euro|financien|financieel)\b/.test(n);
    const hasQuestionWord=/\b(wat|hoeveel|welke|toon|geef|totaal|som)\b/.test(n);
    const hasCategory=!!resolveFinanceCategory(n);
    return hasMoneyWord&&(hasQuestionWord||hasCategory);
  }

  function readFinanceEntries(){
    try{
      if(typeof getAllFinanceEntries==='function'){
        const entries=getAllFinanceEntries();
        if(Array.isArray(entries))return entries.slice();
      }
    }catch(error){console.warn('Serenity AI: financieel overzicht niet direct beschikbaar.',error)}
    try{
      if(typeof costCache!=='undefined'&&Array.isArray(costCache)){
        return costCache.map(cost=>({
          type:'cost',
          id:cost.id,
          date:cost.expense_date||cost.date||'',
          category:cost.category||'Overig',
          description:String(cost.description||''),
          amount:Number(cost.amount||0)
        })).filter(entry=>Number.isFinite(entry.amount)&&entry.amount>0);
      }
    }catch{}
    return [];
  }

  async function ensureFinanceEntries(){
    let entries=readFinanceEntries();
    if(entries.length)return entries;
    const tasks=[];
    try{if(typeof loadCosts==='function')tasks.push(loadCosts())}catch{}
    try{if(typeof loadTrips==='function')tasks.push(loadTrips())}catch{}
    if(tasks.length){
      await Promise.allSettled(tasks);
      entries=readFinanceEntries();
    }
    return entries;
  }

  async function financeAnswer(q){
    if(!isFinanceQuestion(q))return null;
    const category=resolveFinanceCategory(q);
    const period=resolveFinancePeriod(q);
    let entries=await ensureFinanceEntries();

    if(period.start)entries=entries.filter(entry=>{
      const date=String(entry.date||'').slice(0,10);
      return date&&date>=period.start&&date<=period.end;
    });

    if(category){
      const categoryName=normal(category.name);
      entries=entries.filter(entry=>normal(entry.category)===categoryName);
    }

    const total=entries.reduce((sum,entry)=>sum+Number(entry.amount||0),0);
    const count=entries.length;
    const subject=category?category.name:'alle opgeslagen kosten';

    if(!count){
      return {action:'answer',answer:`Ik vind geen opgeslagen kosten voor ${subject}${period.label==='in totaal'?'':' in '+period.label}.`};
    }

    if(category){
      const noun=count===1?'kostenpost':'kostenposten';
      return {action:'answer',answer:`Volgens je opgeslagen kosten is aan ${category.name} ${period.label} ${euro(total)} uitgegeven, verdeeld over ${count} ${noun}.`};
    }

    const groups={};
    entries.forEach(entry=>{
      const key=String(entry.category||'Overig');
      groups[key]=(groups[key]||0)+Number(entry.amount||0);
    });
    const top=Object.entries(groups)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,3)
      .map(([name,amount])=>`${name}: ${euro(amount)}`)
      .join(' · ');
    return {action:'answer',answer:`Je ${subject} zijn ${period.label} ${euro(total)}, verdeeld over ${count} kostenposten.${top?`\nGrootste categorieën: ${top}.`:''}`};
  }

  function sectionFor(q){
    const n=normal(q);
    for(const [section,words] of Object.entries(sectionWords))if(includesAny(n,words))return section;
    return '';
  }
  function pageFor(q){
    const n=normal(q);
    if(n==='haven'||/^(ga|breng|navigeer|terug) (naar )?haven$/.test(n))return 'dashboard';
    for(const page of pageAliases)if(includesAny(n,page.words))return page.target;
    return '';
  }
  function localNavigation(q){
    const n=normal(q);
    const verb=/\b(ga|open|toon|laat zien|breng|navigeer|zoek in|waar staat|waar vind|naar)\b/.test(n);
    const section=sectionFor(n);
    let target=pageFor(n);
    if(section&&['house-battery','start-battery','fuel','water','waste','outside','salon','machine','solar-shore'].includes(section))target='technical';
    if(section&&['speed','depth','wind','current-position'].includes(section)&&!target)target='live';
    if(!target)return null;
    const exact=pageAliases.some(p=>p.words.some(word=>normal(word)===n));
    if(!verb&&!exact)return null;
    return {action:'navigate',target,section};
  }

  function setResult(message,kind='answer'){
    const box=document.getElementById('msQuickAskResult8267');
    if(!box)return;
    box.textContent='';
    const lead=document.createElement('strong');
    lead.textContent=kind==='navigate'?'Navigeren · ':'AI · ';
    box.appendChild(lead);
    box.appendChild(document.createTextNode(String(message||'')));
    box.classList.add('show');
  }

  function targetTitle(target){
    return ({dashboard:'Haven',map:'Kaart',planner:'Reisplanner',ais:'AIS',weather:'Weer',live:'Live varen',technical:'Techniek',pois:"POI's",logbook:'Logboek',costs:'Kosten',settings:'Instellingen'})[target]||target;
  }
  function sectionTitle(section){
    return ({'house-battery':'Huishoudaccu','start-battery':'Startaccu',fuel:'Dieseltank',water:'Drinkwater',waste:'Zwartwater',outside:'Buitentemperatuur',salon:'Salon',machine:'Machinekamer','solar-shore':'Zon / walstroom',speed:'Snelheid',depth:'Diepte',wind:'Wind','current-position':'Positie'})[section]||'';
  }

  function navigate(target){
    if(!allowedTargets.has(target))return false;
    try{if(typeof window.ms8263Navigate==='function'){window.ms8263Navigate(target);return true}}catch{}
    try{if(typeof window.captainNavigate==='function'){window.captainNavigate(target);return true}}catch{}
    try{history.replaceState(null,'',location.pathname+location.search+'#'+target)}catch{}
    try{if(typeof window.navigateTo==='function'){window.navigateTo(target);return true}}catch{}
    try{if(typeof window.showPage==='function'){window.showPage(target);return true}}catch{}
    location.hash=target;
    return true;
  }

  function visible(el){return !!(el&&el.isConnected&&(el.offsetWidth||el.offsetHeight||el.getClientRects().length))}
  function locateSection(section){
    const words=sectionWords[section]||[];
    if(!words.length)return false;
    const nodes=[...document.querySelectorAll('h1,h2,h3,h4,strong,label,small,.card-title,.section-title,[data-label],[aria-label]')];
    const match=nodes.find(el=>visible(el)&&includesAny(normal(el.textContent+' '+(el.getAttribute('aria-label')||'')+' '+(el.getAttribute('data-label')||'')),words));
    if(!match)return false;
    const host=match.closest('section,article,[class*="card"],[class*="panel"],[class*="tile"],[id]')||match;
    host.scrollIntoView({behavior:'smooth',block:'center'});
    try{host.animate([{outline:'2px solid rgba(34,216,255,.0)'},{outline:'2px solid rgba(34,216,255,.85)'},{outline:'2px solid rgba(34,216,255,.0)'}],{duration:1500,easing:'ease-out'})}catch{}
    return true;
  }

  function navigateAndLocate(target,section){
    if(!navigate(target)){setResult('Ik kon die pagina niet openen.','answer');return}
    const detail=sectionTitle(section);
    setResult(`${targetTitle(target)}${detail?' → '+detail:''}`,'navigate');
    if(!section)return;
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(locateSection(section)||tries>=12)clearInterval(timer);
    },250);
  }

  async function askServer(query){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch(ENDPOINT,{
        method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
        body:JSON.stringify({query,context:liveContext().slice(0,16)})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'AI is tijdelijk niet bereikbaar.');
      return data;
    }finally{clearTimeout(timer)}
  }

  async function handle(query){
    const q=String(query||'').trim();
    if(q.length<2){setResult('Typ kort wat je wilt openen of weten.');return}
    const financeInfo=await financeAnswer(q);
    if(financeInfo){setResult(financeInfo.answer);return}
    const localInfo=metricAnswer(q);
    if(localInfo){setResult(localInfo.answer);return}
    const localNav=localNavigation(q);
    if(localNav){navigateAndLocate(localNav.target,localNav.section);return}

    try{
      const data=await askServer(q);
      if(data.action==='navigate'&&allowedTargets.has(data.target)){
        navigateAndLocate(data.target,String(data.section||''));
        return;
      }
      setResult(data.answer||'Ik kon daar nog geen passend antwoord op vinden.');
    }catch(error){
      setResult(error?.name==='AbortError'?'De AI-reactie duurde te lang. Probeer het nog eens.':(error?.message||'AI is tijdelijk niet bereikbaar.'));
    }
  }

  function mount(){
    const root=document.getElementById(ROOT);
    const welcome=root?.querySelector('.ms8263-welcome');
    const start=welcome?.querySelector('.ms8263-start');
    if(!root||!welcome||!start)return false;
    installStyle();
    if(document.getElementById(FORM))return true;

    const form=document.createElement('form');
    form.id=FORM;
    form.className='msqa8267';
    form.setAttribute('role','search');
    form.innerHTML=`
      <div class="msqa8267-label">Vraag Serenity AI</div>
      <div class="msqa8267-row">
        <span class="msqa8267-spark" aria-hidden="true">✦</span>
        <input id="msQuickAskInput8267" type="search" enterkeyhint="go" autocomplete="off" autocapitalize="sentences" aria-label="Vraag Serenity AI" placeholder="Waar wil je heen of wat wil je weten?">
        <button id="msQuickAskSend8267" class="msqa8267-send" type="submit" aria-label="Vraag versturen"><svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></button>
      </div>
      <div class="msqa8267-examples">Bijv. “wat kost elektra?”, “open logboek” of “wat is de accustand?”</div>
      <div id="msQuickAskResult8267" class="msqa8267-result" aria-live="polite"></div>`;
    start.before(form);

    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(busy)return;
      const input=document.getElementById('msQuickAskInput8267');
      const button=document.getElementById('msQuickAskSend8267');
      const query=input?.value||'';
      busy=true;if(button)button.disabled=true;
      input?.blur();
      try{await handle(query)}finally{busy=false;if(button)button.disabled=false}
    });
    return true;
  }

  window.ms8267MountQuickAsk=mount;

  function boot(){
    mount();
    observer?.disconnect();
    observer=new MutationObserver(()=>{if(!document.getElementById(FORM))mount()});
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  window.addEventListener('mijnserenity:dashboard-ready',()=>setTimeout(mount,20),{passive:true});
  window.addEventListener('pageshow',()=>setTimeout(mount,40),{passive:true});
})();