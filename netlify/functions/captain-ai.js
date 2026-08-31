const recent=new Map();
const MODEL='gpt-5-mini';
const PRIMARY_MAX_OUTPUT_TOKENS=1600;
const RETRY_MAX_OUTPUT_TOKENS=2600;
const OPENAI_TIMEOUT_MS=18000;
const RATE_RETENTION_MS=10*60*1000;

function json(statusCode,body){
  return {
    statusCode,
    headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff'
    },
    body:JSON.stringify(body)
  };
}

function pruneRecent(now=Date.now()){
  for(const [key,at] of recent){if(now-at>RATE_RETENTION_MS)recent.delete(key)}
  while(recent.size>500){
    const key=recent.keys().next().value;
    if(key===undefined)break;
    recent.delete(key);
  }
}

function outputText(data){
  if(typeof data?.output_text==='string'&&data.output_text.trim())return data.output_text.trim();
  try{
    return (data?.output||[])
      .flatMap(item=>item?.content||[])
      .map(part=>part?.text||'')
      .join('')
      .trim();
  }catch{return ''}
}

function refusalText(data){
  try{
    return (data?.output||[])
      .flatMap(item=>item?.content||[])
      .map(part=>part?.refusal||'')
      .join('')
      .trim();
  }catch{return ''}
}

async function requestOpenAI({question,context,developer,maxOutputTokens}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),OPENAI_TIMEOUT_MS);
  let response;
  try{
    response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      signal:controller.signal,
      headers:{
        Authorization:'Bearer '+process.env.OPENAI_API_KEY,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        model:MODEL,
        input:[
          {role:'developer',content:developer},
          {role:'user',content:`Vraag: ${question}\n\nBoordgegevens (JSON):\n${JSON.stringify(context)}`}
        ],
        reasoning:{effort:'medium'},
        max_output_tokens:maxOutputTokens
      })
    });
  }catch(error){
    if(error?.name==='AbortError'){
      const timeout=new Error('OpenAI request time-out');
      timeout.status=504;
      timeout.code='upstream_timeout';
      throw timeout;
    }
    throw error;
  }finally{
    clearTimeout(timer);
  }

  if(!response.ok){
    const detail=await response.text().catch(()=>String(response.status));
    const error=new Error('OpenAI request mislukt');
    error.status=response.status;
    error.detail=detail;
    throw error;
  }

  const data=await response.json();
  return {data,answer:outputText(data),refusal:refusalText(data)};
}

exports.handler=async event=>{
  if(event.httpMethod==='GET'){
    return json(200,{ok:true,service:'captain-ai',configured:Boolean(process.env.OPENAI_API_KEY),model:MODEL,level:'pro'});
  }
  if(event.httpMethod!=='POST')return json(405,{error:'Alleen GET en POST toegestaan'});

  const ip=event.headers['x-nf-client-connection-ip']||event.headers['client-ip']||'unknown';
  const now=Date.now();
  pruneRecent(now);
  const last=recent.get(ip)||0;
  if(now-last<900)return json(429,{error:'Wacht heel even en probeer opnieuw.'});
  recent.delete(ip);
  recent.set(ip,now);

  let body={};
  try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Ongeldige aanvraag.'})}

  const question=String(body.question||'').trim().slice(0,600);
  if(question.length<2)return json(400,{error:'Stel eerst een vraag.'});
  if(!process.env.OPENAI_API_KEY)return json(503,{error:'Captain AI is nog niet geactiveerd.'});

  let context={};
  try{
    context=body.context&&typeof body.context==='object'?body.context:{};
    const serialized=JSON.stringify(context);
    if(serialized.length>30000)return json(413,{error:'Te veel gegevens voor één analyse.'});
  }catch{return json(400,{error:'Ongeldige context.'})}

  const developer=[
    'Je bent Captain AI Pro in MijnSerenity: een nuchtere, contextbewuste eerste stuurman en boordassistent van Serenity.',
    'Serenity is een stalen Vri-Jon Contessa 37 motorboot van ongeveer 11,2 meter.',
    'Antwoord in helder Nederlands, compact en praktisch. Richtlijn: maximaal circa 220 woorden, tenzij een korte checklist nuttiger is.',
    'Kom direct tot de kern. Geef bij boord-, energie-, vertrek- en vaarchecks eerst één duidelijke prioriteit: GROEN, ORANJE of ROOD, met één zin waarom.',
    'Geef daarna maximaal drie acties, in volgorde van urgentie. Maak acties concreet: wat controleren, waar kijken en wat de gebruiker daarna moet verwachten.',
    'Baseer conclusies alleen op meegegeven data. Ontbrekende data is geen nulwaarde. Zeg expliciet wanneer een sensor ontbreekt, oud lijkt of een conclusie onzeker maakt.',
    'Vergelijk samenhangende waarden met elkaar: spanning versus SOC, stroomrichting versus laadbron, startspanning versus motorstatus, snelheid versus GPS-status, tanks versus geplande vaart.',
    'Signaleer tegenstrijdigheden en onwaarschijnlijke meetwaarden. Presenteer een verdachte waarde nooit als feit zonder waarschuwing.',
    'Een onwaarschijnlijk hoge maximumsnelheid voor Serenity is waarschijnlijk een GPS-piek. Benoem dat als dat relevant is.',
    'Bij accu- en laadproblemen: onderscheid huishoudaccu, startaccu, walstroom, zonne-opbrengst en dynamo/DC-DC-lading. Trek geen conclusies over een component waarvan geen meetwaarde beschikbaar is.',
    'Bij varen: leg extra nadruk op GPS-betrouwbaarheid, snelheid, diepte, weer/wind, route-informatie en eventuele ontbrekende nautische data.',
    'Bij vertrek: geef ook aan welke cruciale punten niet digitaal bevestigd kunnen worden en dus handmatig gecontroleerd moeten worden.',
    'Bij route-, weer- of veiligheidsvragen: ondersteun de schipper, maar doe nooit alsof je officiële waterkaarten, actuele brugbediening, verkeersleiding of lokale vaarwegbeperkingen hebt als die niet in de context staan.',
    'Gebruik geen markdown-tabellen. Vermijd lange disclaimers en vermijd dramatische taal. Bij direct gevaar: wees kort, duidelijk en actiegericht.',
    'Als alles normaal lijkt, zeg dat gewoon en geef hooguit één preventief aandachtspunt. Zoek geen probleem als de data daar geen aanleiding toe geeft.'
  ].join(' ');

  try{
    let result=await requestOpenAI({question,context,developer,maxOutputTokens:PRIMARY_MAX_OUTPUT_TOKENS});

    if(!result.answer&&!result.refusal){
      console.warn(
        'Captain AI eerste antwoord leeg:',
        result.data?.status||'onbekend',
        result.data?.incomplete_details||null,
        result.data?.usage?.output_tokens_details||null
      );
      result=await requestOpenAI({question,context,developer,maxOutputTokens:RETRY_MAX_OUTPUT_TOKENS});
    }

    if(result.refusal)return json(422,{error:'Captain AI kan deze vraag niet beantwoorden.'});
    if(!result.answer){
      console.warn(
        'Captain AI antwoord bleef leeg:',
        result.data?.status||'onbekend',
        result.data?.incomplete_details||null,
        result.data?.usage?.output_tokens_details||null
      );
      return json(502,{error:'Captain AI gaf geen bruikbaar antwoord. Probeer het nogmaals.'});
    }
    return json(200,{ai:true,level:'pro',answer:result.answer});
  }catch(error){
    if(error?.status){
      console.warn('Captain AI upstream-fout:',error.status,String(error.detail||error.code||'').slice(0,500));
      if(error.status===504)return json(504,{error:'Captain AI reageert te langzaam. Probeer het opnieuw.'});
      return json(502,{error:'Captain AI kon de analyse niet afronden.'});
    }
    console.warn('Captain AI fout:',error);
    return json(502,{error:'Captain AI is tijdelijk niet bereikbaar.'});
  }
};