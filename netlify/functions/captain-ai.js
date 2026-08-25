const recent=new Map();
const MODEL='gpt-5-mini';
const PRIMARY_MAX_OUTPUT_TOKENS=1400;
const RETRY_MAX_OUTPUT_TOKENS=2400;

function json(statusCode,body){
  return {
    statusCode,
    headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store'
    },
    body:JSON.stringify(body)
  };
}

function outputText(data){
  if(typeof data?.output_text==='string'&&data.output_text.trim())return data.output_text.trim();
  try{
    return (data?.output||[])
      .flatMap(item=>item?.content||[])
      .map(part=>part?.text||'')
      .join('')
      .trim();
  }catch{return '';}
}

function refusalText(data){
  try{
    return (data?.output||[])
      .flatMap(item=>item?.content||[])
      .map(part=>part?.refusal||'')
      .join('')
      .trim();
  }catch{return '';}
}

async function requestOpenAI({question,context,developer,maxOutputTokens}){
  const response=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',
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
      reasoning:{effort:'low'},
      max_output_tokens:maxOutputTokens
    })
  });

  if(!response.ok){
    const detail=await response.text().catch(()=>String(response.status));
    const error=new Error('OpenAI request mislukt');
    error.status=response.status;
    error.detail=detail;
    throw error;
  }

  const data=await response.json();
  return {
    data,
    answer:outputText(data),
    refusal:refusalText(data)
  };
}

exports.handler=async(event)=>{
  if(event.httpMethod==='GET'){
    return json(200,{
      ok:true,
      service:'captain-ai',
      configured:Boolean(process.env.OPENAI_API_KEY),
      model:MODEL
    });
  }

  if(event.httpMethod!=='POST')return json(405,{error:'Alleen GET en POST toegestaan'});

  const ip=event.headers['x-nf-client-connection-ip']||event.headers['client-ip']||'unknown';
  const now=Date.now();
  const last=recent.get(ip)||0;
  if(now-last<900)return json(429,{error:'Wacht heel even en probeer opnieuw.'});
  recent.set(ip,now);

  let body={};
  try{body=JSON.parse(event.body||'{}');}catch{return json(400,{error:'Ongeldige aanvraag.'});}

  const question=String(body.question||'').trim().slice(0,600);
  if(question.length<2)return json(400,{error:'Stel eerst een vraag.'});
  if(!process.env.OPENAI_API_KEY)return json(503,{error:'Captain AI is nog niet geactiveerd.'});

  let context={};
  try{
    context=body.context&&typeof body.context==='object'?body.context:{};
    const serialized=JSON.stringify(context);
    if(serialized.length>30000)return json(413,{error:'Te veel gegevens voor één analyse.'});
  }catch{return json(400,{error:'Ongeldige context.'});}

  const developer=[
    'Je bent Captain AI in MijnSerenity, de boordassistent van Serenity.',
    'Serenity is een stalen Vri-Jon Contessa 37 motorboot van ongeveer 11,2 meter.',
    'Antwoord in helder Nederlands, praktisch en compact (maximaal circa 180 woorden).',
    'Kom snel tot een concreet antwoord en gebruik geen lange interne analyse.',
    'Baseer je antwoord alleen op de meegegeven gegevens. Zeg duidelijk wanneer iets niet gemeten of niet bekend is.',
    'Maak onderscheid tussen feiten, waarschijnlijke interpretaties en advies.',
    'Controleer telemetrie kritisch: een onwaarschijnlijk hoge maximumsnelheid (bijvoorbeeld tientallen km/u boven normale kruissnelheid) is waarschijnlijk een GPS-piek en mag niet als echte vaarsnelheid worden gepresenteerd.',
    'Bij route-, weer- of veiligheidsvragen: geef nuttige ondersteuning, maar doe niet alsof je officiële waterkaarten, actuele brugbediening of nautische verkeersinformatie hebt wanneer die niet in de context staat.',
    'Noem bij technische waarden die aandacht vragen kort waarom.',
    'Gebruik geen markdown-tabellen.'
  ].join(' ');

  try{
    let result=await requestOpenAI({
      question,
      context,
      developer,
      maxOutputTokens:PRIMARY_MAX_OUTPUT_TOKENS
    });

    if(!result.answer&&!result.refusal){
      console.warn(
        'Captain AI eerste antwoord leeg:',
        result.data?.status||'onbekend',
        result.data?.incomplete_details||null,
        result.data?.usage?.output_tokens_details||null
      );

      result=await requestOpenAI({
        question,
        context,
        developer,
        maxOutputTokens:RETRY_MAX_OUTPUT_TOKENS
      });
    }

    if(result.refusal){
      return json(422,{error:'Captain AI kan deze vraag niet beantwoorden.'});
    }

    if(!result.answer){
      console.warn(
        'Captain AI antwoord bleef leeg:',
        result.data?.status||'onbekend',
        result.data?.incomplete_details||null,
        result.data?.usage?.output_tokens_details||null
      );
      return json(502,{error:'Captain AI gaf geen bruikbaar antwoord. Probeer het nogmaals.'});
    }

    return json(200,{ai:true,answer:result.answer});
  }catch(error){
    if(error?.status){
      console.warn('Captain AI OpenAI-fout:',error.status,String(error.detail||'').slice(0,500));
      return json(502,{error:'Captain AI kon de analyse niet afronden.'});
    }
    console.warn('Captain AI fout:',error);
    return json(502,{error:'Captain AI is tijdelijk niet bereikbaar.'});
  }
};
