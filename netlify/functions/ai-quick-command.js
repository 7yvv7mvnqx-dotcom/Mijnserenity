const recent=new Map();
const RATE_WINDOW_MS=1200;
const RATE_RETENTION_MS=10*60*1000;
const TARGETS=new Set(['dashboard','map','planner','ais','weather','live','technical','pois','logbook','costs','settings']);
const SECTIONS=new Set(['','house-battery','start-battery','fuel','water','waste','outside','salon','machine','solar-shore','speed','depth','wind','current-position']);

function pruneRecent(now=Date.now()){
  for(const [key,at] of recent){if(now-at>RATE_RETENTION_MS)recent.delete(key)}
  while(recent.size>500){recent.delete(recent.keys().next().value)}
}
function clientKey(event){
  const h=event.headers||{};
  return String(h['x-nf-client-connection-ip']||h['x-forwarded-for']||h['client-ip']||'unknown').split(',')[0].trim();
}
function fetchWithTimeout(url,options={},ms=12000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  return fetch(url,{...options,signal:controller.signal}).finally(()=>clearTimeout(timer));
}
function responseText(data){
  if(typeof data?.output_text==='string')return data.output_text.trim();
  for(const item of data?.output||[]){
    for(const part of item?.content||[]){
      if(typeof part?.text==='string'&&(part.type==='output_text'||part.type==='text'))return part.text.trim();
    }
  }
  return '';
}
function safeContext(value){
  if(!Array.isArray(value))return [];
  return value.slice(0,16).map(item=>({
    label:String(item?.label||'').slice(0,60),
    value:String(item?.value||'').slice(0,80),
    sub:String(item?.sub||'').slice(0,100)
  })).filter(item=>item.label&&item.value);
}
function jsonFromText(text){
  const cleaned=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  try{return JSON.parse(cleaned)}catch{}
  const first=cleaned.indexOf('{'),last=cleaned.lastIndexOf('}');
  if(first>=0&&last>first){try{return JSON.parse(cleaned.slice(first,last+1))}catch{}}
  return null;
}
function fallback(query){
  return {action:'answer',target:'',section:'',answer:`Ik begrijp “${query.slice(0,80)}” nog niet goed genoeg. Probeer bijvoorbeeld “open techniek”, “ga naar drinkwater” of “wat is de accustand?”.`};
}

exports.handler=async(event)=>{
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
  if(event.httpMethod==='OPTIONS')return {statusCode:204,headers,body:''};
  if(event.httpMethod!=='POST')return {statusCode:405,headers,body:JSON.stringify({error:'Alleen POST is toegestaan.'})};

  const now=Date.now();pruneRecent(now);
  const key=clientKey(event),last=recent.get(key)||0;
  if(now-last<RATE_WINDOW_MS)return {statusCode:429,headers,body:JSON.stringify({error:'Even wachten en probeer opnieuw.'})};
  recent.set(key,now);

  let body={};
  try{body=JSON.parse(event.body||'{}')}catch{return {statusCode:400,headers,body:JSON.stringify({error:'Ongeldige aanvraag.'})}}
  const query=String(body.query||'').replace(/\s+/g,' ').trim().slice(0,500);
  if(query.length<2)return {statusCode:400,headers,body:JSON.stringify({error:'Vul minimaal twee tekens in.'})};
  const context=safeContext(body.context);

  if(!process.env.OPENAI_API_KEY)return {statusCode:200,headers,body:JSON.stringify(fallback(query))};

  const instructions=`Je bent Serenity AI, de compacte assistent in de Nederlandse vaarapp MijnSerenity.
Doel: begrijp een korte gebruikersvraag en kies precies één actie.

Beschikbare pagina's (target exact gebruiken):
- dashboard = Haven/startscherm
- map = Kaart/waterkaarten/navigatie
- planner = Reisplanner/route plannen
- ais = AIS/schepen in omgeving
- weather = Weer
- live = Live varen/cockpit
- technical = Techniek/Victron/accu's/tanks/sensoren
- pois = POI's/havens/bruggen/sluizen
- logbook = Logboek
- costs = Kosten/bonnen/uitgaven
- settings = Instellingen

Beschikbare posities binnen pagina's (section exact gebruiken):
house-battery, start-battery, fuel, water, waste, outside, salon, machine, solar-shore, speed, depth, wind, current-position.

Regels:
1. Als de gebruiker wil openen, gaan, navigeren, vinden of naar een onderdeel wil: action="navigate". Kies target en eventueel section.
2. Als de gebruiker een vraag stelt: action="answer". Gebruik live waarden uit CONTEXT als die relevant zijn. Verzin nooit een ontbrekende live waarde.
3. Je mag korte algemene vaar- of appinformatie geven als die vraag zonder actuele internetdata te beantwoorden is.
4. Voor actuele informatie die niet in CONTEXT staat (bijv. actueel weer op een andere plaats) stuur je liever naar de juiste pagina dan dat je iets verzint.
5. Antwoord in natuurlijk Nederlands, maximaal 70 woorden, geen markdown.
6. Retourneer ALLEEN geldige JSON in dit schema:
{"action":"navigate|answer","target":"","section":"","answer":""}
Bij navigeren mag answer een ultrakorte bevestiging zijn. Bij antwoorden zijn target en section leeg.`;

  try{
    const ai=await fetchWithTimeout('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'gpt-5-mini',
        instructions,
        input:`VRAAG: ${query}\nCONTEXT: ${JSON.stringify(context)}`,
        max_output_tokens:260
      })
    });
    const data=await ai.json().catch(()=>({}));
    if(!ai.ok)throw new Error(data?.error?.message||'OpenAI-aanvraag mislukt');
    const parsed=jsonFromText(responseText(data));
    if(!parsed||!['navigate','answer'].includes(parsed.action))return {statusCode:200,headers,body:JSON.stringify(fallback(query))};

    let target=String(parsed.target||'');
    let section=String(parsed.section||'');
    if(!TARGETS.has(target))target='';
    if(!SECTIONS.has(section))section='';
    if(parsed.action==='navigate'&&!target)return {statusCode:200,headers,body:JSON.stringify(fallback(query))};
    const answer=String(parsed.answer||'').replace(/\s+/g,' ').trim().slice(0,700);
    return {statusCode:200,headers,body:JSON.stringify({action:parsed.action,target,section,answer})};
  }catch(error){
    console.warn('ai-quick-command',error?.message||error);
    return {statusCode:200,headers,body:JSON.stringify(fallback(query))};
  }
};
