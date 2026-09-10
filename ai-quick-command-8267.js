/* MijnSerenity 8.27.0 — Serenity AI met ChatGPT, context, geheugen en analyses. */
(()=>{
  'use strict';
  if(window.__msQuickAsk8270)return;
  window.__msQuickAsk8270=true;

  const ROOT='ms8210Start';
  const FORM='msQuickAsk8267';
  const STYLE='msQuickAsk8267Style';
  const ENDPOINT='/.netlify/functions/ai-quick-command';
  const HISTORY_KEY='mijnserenity-serenity-ai-history-v1';
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
    {target:'costs',words:['kosten','uitgaven','bonnen','bonnetje','brandstofkosten','financien','financiën']},
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
      #${ROOT} .msqa8270-badge{display:inline-flex;align-items:center;padding:3px 6px;border-radius:999px;background:rgba(37,219,251,.11);border:1px solid rgba(75,222,247,.22);color:#bff7ff;font-size:8px;letter-spacing:.04em;text-transform:none}
      #${ROOT} .msqa8267-row{display:grid;grid-template-columns:38px minmax(0,1fr) 44px;align-items:center;gap:4px;min-height:58px;padding:5px 6px 5px 10px;border:1px solid rgba(93,211,244,.42);border-radius:18px;background:linear-gradient(145deg,rgba(5,43,62,.96),rgba(2,25,39,.96));box-shadow:inset 0 1px rgba(255,255,255,.04),0 10px 24px rgba(0,0,0,.10);transition:border-color .18s ease,box-shadow .18s ease}
      #${ROOT} .msqa8267:focus-within .msqa8267-row{border-color:rgba(56,225,255,.88);box-shadow:0 0 0 3px rgba(34,216,255,.09),0 12px 28px rgba(0,0,0,.13)}
      #${ROOT} .msqa8267-spark{display:grid;place-items:center;width:34px;height:34px;border-radius:12px;background:rgba(34,216,255,.10);color:#31ddfb;font-size:18px}
      #${ROOT} .msqa8267 input{width:100%;min-width:0;height:46px;padding:0 4px;border:0!important;outline:0!important;background:transparent!important;color:#fff!important;font:700 14px/1.2 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;box-shadow:none!important;-webkit-appearance:none}
      #${ROOT} .msqa8267 input::placeholder{color:#8faab8;opacity:1;font-weight:600}
      #${ROOT} .msqa8267-send{display:grid!important;place-items:center!important;width:42px!important;height:42px!important;min-width:42px!important;min-height:42px!important;padding:0!important;border:0!important;border-radius:14px!important;background:linear-gradient(135deg,#0ec4ec,#20dff8)!important;color:#fff!important;box-shadow:0 8px 20px rgba(12,196,231,.18)!important;cursor:pointer!important}
      #${ROOT} .msqa8267-send svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2.2}
      #${ROOT} .msqa8267-send[disabled]{opacity:.55;cursor:wait!important}
      #${ROOT} .msqa8267-result{display:none;margin:8px 2px 0;padding:10px 12px;border:1px solid rgba(89,199,238,.25);border-radius:14px;background:rgba(2,24,37,.88);color:#dcebf1;font-size:12px;line-height:1.45;white-space:pre-line}
      #${ROOT} .msqa8267-result.show{display:block}
      #${ROOT} .msqa8267-result strong{color:#39ddfa}
      #${ROOT} .msqa8267-result.thinking{color:#94adba}
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
  function txt(id){return String(document.getElementById(id)?.textContent||'').replace(/\s+/g,' ').trim()}
  function metric(id,label){const value=txt(id);const sub=txt(id+'Sub');return value&&value!=='—'?{label,value,sub}:null}

  function liveContext(){
    const values=[
      metric('ms8264House','Huishoudaccu'),metric('ms8264Start','Startaccu'),metric('ms8264Fuel','Dieseltank'),metric('ms8264Water','Drinkwater'),
      metric('ms8264Outside','Buitentemperatuur'),metric('ms8264Salon','Salon'),metric('ms8264Machine','Machinekamer'),metric('ms8264Solar','Zon / walstroom'),
      metric('ms8263Speed','Snelheid'),metric('ms8263Depth','Diepte'),metric('ms8263Wind','Wind')
    ].filter(Boolean);
    let p={};
    try{
      if(typeof liveNavState!=='undefined'&&liveNavState)p=liveNavState;
      else p=window.liveNavState||{};
    }catch{p=window.liveNavState||{}}
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
      {words:['dieseltank','brandstofniveau'],labels:['Dieseltank']},
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
      return range(start,new Date(start.getFullYear(),start.getMonth(),start.getDate()+6),'deze week');
    }
    if(/\bvorige week\b/.test(n)){
      const day=(now.getDay()+6)%7;
      const end=new Date(now.getFullYear(),now.getMonth(),now.getDate()-day-1);
      return range(new Date(end.getFullYear(),end.getMonth(),end.getDate()-6),end,'vorige week');
    }
    if(/\bdeze maand\b/.test(n)){
      return range(new Date(now.getFullYear(),now.getMonth(),1),new Date(now.getFullYear(),now.getMonth()+1,0),'deze maand');
    }
    if(/\bvorige maand\b/.test(n)){
      return range(new Date(now.getFullYear(),now.getMonth()-1,1),new Date(now.getFullYear(),now.getMonth(),0),'vorige maand');
    }
    if(/\bdit jaar\b|\bdit seizoen\b/.test(n)){
      return range(new Date(now.getFullYear(),0,1),new Date(now.getFullYear(),11,31),String(now.getFullYear()));
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
    const money=/\b(kosten?|gekost|kostte|uitgegeven|uitgaven|betaald|besteed|bedrag|euro|financien|financieel)\b/.test(n);
    return money||!!resolveFinanceCategory(n);
  }

  function financeNeedsChatGPT(q){
    const n=normal(q);
    return /\b(welke|waar aan|waaraan|waarvoor|overzicht|lijst|aankopen|posten|details|vergelijk|verschil|trend|gemiddeld|duurste|meeste|minste|top|grootste|analyse|analyseer|waarom|per maand|per jaar|per categorie|ontwikkeling)\b/.test(n);
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
          type:'cost',date:cost.expense_date||cost.date||'',category:cost.category||'Overig',
          description:String(cost.description||''),amount:Number(cost.amount||0)
        })).filter(entry=>Number.isFinite(entry.amount)&&entry.amount>0);
      }
    }catch{}
    return [];
  }

  function detailedFinanceEntries(){
    const entries=[];
    try{
      if(typeof costCache!=='undefined'&&Array.isArray(costCache)){
        costCache.forEach(cost=>entries.push({
          type:'kostenpost',
          date:String(cost.expense_date||'').slice(0,10),
          category:String(cost.category||'Overig').slice(0,80),
          description:String(cost.description||'').slice(0,1000),
          amount:Number(cost.amount||0)
        }));
      }
    }catch{}
    try{
      if(typeof tripCache!=='undefined'&&Array.isArray(tripCache)){
        tripCache.filter(trip=>Number(trip.fuel_cost||0)>0).forEach(trip=>entries.push({
          type:'brandstof_vaartocht',
          date:String(trip.trip_date||'').slice(0,10),
          category:'Diesel',
          description:String(trip.title||`${trip.departure||''} - ${trip.arrival||''}`||'Brandstof vaartocht').slice(0,500),
          amount:Number(trip.fuel_cost||0)
        }));
      }
    }catch{}
    return entries.filter(entry=>Number.isFinite(entry.amount)&&entry.amount>0)
      .sort((a,b)=>String(b.date).localeCompare(String(a.date)));
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
    if(!isFinanceQuestion(q)||financeNeedsChatGPT(q))return null;
    const n=normal(q);
    const asksAmount=/\b(wat kost|wat kosten|hoeveel|totaal|som|uitgegeven|besteed|betaald|gekost|kosten)\b/.test(n);
    if(!asksAmount)return null;

    const category=resolveFinanceCategory(q);
    const period=resolveFinancePeriod(q);
    let entries=await ensureFinanceEntries();

    if(period.start)entries=entries.filter(entry=>{
      const date=String(entry.date||'').slice(0,10);
      return date&&date>=period.start&&date<=period.end;
    });
    if(category){
      const wanted=normal(category.name);
      entries=entries.filter(entry=>normal(entry.category)===wanted);
    }

    const total=entries.reduce((sum,entry)=>sum+Number(entry.amount||0),0);
    if(!entries.length){
      return {action:'answer',answer:`Ik vind geen opgeslagen kosten voor ${category?category.name:'deze selectie'}${period.label==='in totaal'?'':' in '+period.label}.`};
    }
    if(category){
      return {action:'answer',answer:`Volgens je opgeslagen kosten is aan ${category.name} ${period.label} ${euro(total)} uitgegeven, verdeeld over ${entries.length} ${entries.length===1?'kostenpost':'kostenposten'}.`};
    }
    const groups={};
    entries.forEach(entry=>groups[entry.category||'Overig']=(groups[entry.category||'Overig']||0)+Number(entry.amount||0));
    const top=Object.entries(groups).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([name,amount])=>`${name}: ${euro(amount)}`).join(' · ');
    return {action:'answer',answer:`Je opgeslagen kosten zijn ${period.label} ${euro(total)}, verdeeld over ${entries.length} kostenposten.${top?`\nGrootste categorieën: ${top}.`:''}`};
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
    const verb=/\b(ga|open|toon pagina|laat pagina zien|breng|navigeer|zoek in|waar staat|waar vind|naar)\b/.test(n);
    const section=sectionFor(n);
    let target=pageFor(n);
    if(section&&['house-battery','start-battery','fuel','water','waste','outside','salon','machine','solar-shore'].includes(section))target='technical';
    if(section&&['speed','depth','wind','current-position'].includes(section)&&!target)target='live';
    if(!target)return null;
    const exact=pageAliases.some(p=>p.words.some(word=>normal(word)===n));
    if(!verb&&!exact)return null;
    return {action:'navigate',target,section};
  }

  function forbiddenKey(key){
    return /secret|password|token|api.?key|authorization|cookie|session|access.?token|refresh.?token|supabase|credential/i.test(String(key||''));
  }

  function safeData(value,depth=0){
    if(depth>4||value===undefined||value===null)return null;
    if(typeof value==='boolean')return value;
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value==='string')return value.slice(0,900);
    if(Array.isArray(value))return value.slice(0,80).map(item=>safeData(item,depth+1)).filter(item=>item!==null);
    if(typeof value==='object'){
      const out={};
      Object.entries(value).slice(0,70).forEach(([key,val])=>{
        if(forbiddenKey(key))return;
        const cleaned=safeData(val,depth+1);
        if(cleaned!==null)out[String(key).slice(0,70)]=cleaned;
      });
      return out;
    }
    return null;
  }

  function financeSummary(entries){
    const groups={};
    let total=0;
    entries.forEach(entry=>{
      const amount=Number(entry.amount||0);
      if(!Number.isFinite(amount)||amount<=0)return;
      total+=amount;
      const key=entry.category||'Overig';
      groups[key]=(groups[key]||0)+amount;
    });
    return {
      total:Number(total.toFixed(2)),
      count:entries.length,
      byCategory:Object.entries(groups).sort((a,b)=>b[1]-a[1]).map(([category,amount])=>({category,amount:Number(amount.toFixed(2))}))
    };
  }

  function tripContext(){
    try{
      if(typeof tripCache==='undefined'||!Array.isArray(tripCache))return [];
      return tripCache.slice(0,50).map(trip=>({
        date:String(trip.trip_date||'').slice(0,10),
        title:String(trip.title||'').slice(0,180),
        departure:String(trip.departure||'').slice(0,120),
        arrival:String(trip.arrival||'').slice(0,120),
        distance_km:Number(trip.distance_km)||null,
        duration_hours:Number(trip.duration_hours)||null,
        crew:String(trip.crew||'').slice(0,240),
        notes:String(trip.notes||'').slice(0,900),
        fuel_liters:Number(trip.fuel_liters)||null,
        fuel_cost:Number(trip.fuel_cost)||null
      }));
    }catch{return []}
  }

  function poiContext(){
    try{
      if(typeof poiCache==='undefined'||!Array.isArray(poiCache))return [];
      return poiCache.slice(0,70).map(poi=>({
        name:String(poi.name||'').slice(0,160),
        category:String(poi.category||'').slice(0,100),
        place:String(poi.place||'').slice(0,160),
        address:String(poi.address||'').slice(0,240),
        rating:Number(poi.rating)||null,
        review:String(poi.review||'').slice(0,700),
        favorite:Boolean(poi.is_favorite),
        latitude:Number.isFinite(Number(poi.latitude))?Number(poi.latitude):null,
        longitude:Number.isFinite(Number(poi.longitude))?Number(poi.longitude):null
      }));
    }catch{return []}
  }

  function boatSettingsContext(){
    const out={};
    try{
      if(typeof currentBoat!=='undefined'&&currentBoat?.name)out.name=String(currentBoat.name).slice(0,120);
    }catch{}
    try{
      if(typeof settingsCache!=='undefined'&&settingsCache){
        if(settingsCache.boat_name)out.name=String(settingsCache.boat_name).slice(0,120);
        if(Number.isFinite(Number(settingsCache.fuel_price)))out.fuel_price=Number(settingsCache.fuel_price);
        if(Number.isFinite(Number(settingsCache.fuel_per_hour)))out.fuel_per_hour=Number(settingsCache.fuel_per_hour);
        if(Number.isFinite(Number(settingsCache.tank_capacity)))out.tank_capacity=Number(settingsCache.tank_capacity);
      }
    }catch{}
    return out;
  }

  function technicalContext(){
    const out={};
    try{
      if(typeof technicalStateCache!=='undefined'&&technicalStateCache)out.state=safeData(technicalStateCache);
    }catch{}
    try{
      if(typeof technicalEventsCache!=='undefined'&&Array.isArray(technicalEventsCache))out.recentEvents=safeData(technicalEventsCache.slice(0,30));
    }catch{}
    return out;
  }

  function buildAIContext(query){
    const n=normal(query);
    const financeEntries=detailedFinanceEntries();
    const context={
      app:{
        timestamp:new Date().toISOString(),
        page:String(location.hash||'#dashboard').replace(/^#/,'')||'dashboard',
        online:navigator.onLine
      },
      boat:boatSettingsContext(),
      live:liveContext(),
      financeSummary:financeSummary(financeEntries)
    };

    const financeRelevant=isFinanceQuestion(n)||/\b(aankoop|bon|bonnetje|betaald|uitgaven|begroting|budget)\b/.test(n);
    const tripRelevant=/\b(reis|reizen|tocht|tochten|gevaren|logboek|afstand|vaartijd|bemanning|route|brandstofverbruik)\b/.test(n);
    const poiRelevant=/\b(poi|haven|jachthaven|marina|brug|sluis|restaurant|favoriet|favoriete|plaats|overnachten)\b/.test(n);
    const technicalRelevant=/\b(accu|batterij|tank|water|diesel|temperatuur|victron|energie|elektra|electra|solar|zonnepaneel|walstroom|omvormer|lader|dynamo|orion|motor|techniek|technisch|sensor|ruuvi)\b/.test(n);

    if(financeRelevant)context.financeEntries=financeEntries.slice(0,120);
    if(tripRelevant)context.trips=tripContext();
    if(poiRelevant)context.pois=poiContext();
    if(technicalRelevant)context.technical=technicalContext();

    if(/\b(mijn boot|serenity|samenvatting|overzicht van de boot|wat weet je)\b/.test(n)){
      context.trips=tripContext().slice(0,20);
      context.pois=poiContext().slice(0,25);
      context.technical=technicalContext();
      context.financeEntries=financeEntries.slice(0,50);
    }

    return safeData(context)||{};
  }

  function readHistory(){
    try{
      const value=JSON.parse(sessionStorage.getItem(HISTORY_KEY)||'[]');
      return Array.isArray(value)?value.slice(-8):[];
    }catch{return []}
  }

  function remember(user,assistant){
    const q=String(user||'').trim();
    const a=String(assistant||'').trim();
    if(!q||!a)return;
    try{
      const history=readHistory();
      history.push({user:q.slice(0,500),assistant:a.slice(0,900)});
      sessionStorage.setItem(HISTORY_KEY,JSON.stringify(history.slice(-8)));
    }catch{}
  }

  function setResult(message,kind='answer'){
    const box=document.getElementById('msQuickAskResult8267');
    if(!box)return;
    box.textContent='';
    box.classList.remove('thinking');
    const lead=document.createElement('strong');
    lead.textContent=kind==='navigate'?'Navigeren · ':kind==='thinking'?'AI · ':'Serenity AI · ';
    box.appendChild(lead);
    box.appendChild(document.createTextNode(String(message||'')));
    box.classList.add('show');
    if(kind==='thinking')box.classList.add('thinking');
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
    if(!navigate(target)){setResult('Ik kon die pagina niet openen.');return}
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
    const timer=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetch(ENDPOINT,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        signal:controller.signal,
        body:JSON.stringify({
          query,
          context:buildAIContext(query),
          history:readHistory()
        })
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'AI is tijdelijk niet bereikbaar.');
      return data;
    }finally{clearTimeout(timer)}
  }

  async function handle(query){
    const q=String(query||'').trim();
    if(q.length<2){setResult('Typ kort wat je wilt openen of weten.');return}

    const localNav=localNavigation(q);
    if(localNav){
      navigateAndLocate(localNav.target,localNav.section);
      remember(q,`Geopend: ${targetTitle(localNav.target)}${localNav.section?' → '+sectionTitle(localNav.section):''}.`);
      return;
    }

    const localInfo=metricAnswer(q);
    if(localInfo){
      setResult(localInfo.answer);
      remember(q,localInfo.answer);
      return;
    }

    const financeInfo=await financeAnswer(q);
    if(financeInfo){
      setResult(financeInfo.answer);
      remember(q,financeInfo.answer);
      return;
    }

    setResult('Ik kijk in je Serenity-gegevens en denk met je mee…','thinking');

    try{
      const data=await askServer(q);
      if(data.action==='navigate'&&allowedTargets.has(data.target)){
        navigateAndLocate(data.target,String(data.section||''));
        remember(q,data.answer||`Geopend: ${targetTitle(data.target)}.`);
        return;
      }
      const answer=data.answer||'Ik kon daar nog geen passend antwoord op vinden.';
      setResult(answer);
      remember(q,answer);
    }catch(error){
      setResult(error?.name==='AbortError'
        ?'De AI-reactie duurde te lang. Probeer het nog eens.'
        :(error?.message||'Serenity AI is tijdelijk niet bereikbaar.'));
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
      <div class="msqa8267-label">Vraag Serenity AI <span class="msqa8270-badge">met ChatGPT</span></div>
      <div class="msqa8267-row">
        <span class="msqa8267-spark" aria-hidden="true">✦</span>
        <input id="msQuickAskInput8267" type="search" enterkeyhint="go" autocomplete="off" autocapitalize="sentences" aria-label="Vraag Serenity AI" placeholder="Vraag iets over je boot, reizen, kosten of techniek">
        <button id="msQuickAskSend8267" class="msqa8267-send" type="submit" aria-label="Vraag versturen"><svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></button>
      </div>
      <div class="msqa8267-examples">Bijv. “welke elektra-aankopen heb ik?”, “vergelijk mijn kosten” of “hoe staat mijn huishoudaccu?”</div>
      <div id="msQuickAskResult8267" class="msqa8267-result" aria-live="polite"></div>`;
    start.before(form);

    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(busy)return;
      const input=document.getElementById('msQuickAskInput8267');
      const button=document.getElementById('msQuickAskSend8267');
      const query=input?.value||'';
      busy=true;
      if(button)button.disabled=true;
      input?.blur();
      try{await handle(query)}finally{
        busy=false;
        if(button)button.disabled=false;
      }
    });
    return true;
  }

  window.ms8267MountQuickAsk=mount;
  window.ms8270BuildAIContext=buildAIContext;

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
