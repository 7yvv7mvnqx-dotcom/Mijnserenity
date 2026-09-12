function safeText(value,max=1200){
  return String(value??'').replace(/\u0000/g,'').trim().slice(0,max);
}

function json(body,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}
  });
}

function responseText(data){
  if(typeof data?.output_text==='string'&&data.output_text.trim())return data.output_text.trim();
  const parts=[];
  for(const item of data?.output||[]){
    for(const content of item?.content||[]){
      if(typeof content?.text==='string')parts.push(content.text);
      if(typeof content?.output_text==='string')parts.push(content.output_text);
    }
  }
  return parts.join('\n').trim();
}

function receiptSchema(){
  const nullableNumber={type:['number','null']};
  return {
    type:'object',
    properties:{
      merchant:{type:'string'},
      date:{type:'string'},
      total_amount:nullableNumber,
      subtotal_ex_vat:nullableNumber,
      vat_amount:nullableNumber,
      currency:{type:'string'},
      receipt_number:{type:'string'},
      order_number:{type:'string'},
      category:{type:'string'},
      summary:{type:'string'},
      items:{
        type:'array',
        items:{
          type:'object',
          properties:{
            article_number:{type:'string'},
            description:{type:'string'},
            quantity:nullableNumber,
            unit:{type:'string'},
            unit_price:nullableNumber,
            line_total:nullableNumber
          },
          required:['article_number','description','quantity','unit','unit_price','line_total'],
          additionalProperties:false
        }
      },
      confidence:{type:'number'}
    },
    required:['merchant','date','total_amount','subtotal_ex_vat','vat_amount','currency','receipt_number','order_number','category','summary','items','confidence'],
    additionalProperties:false
  };
}

function systemPrompt(categories){
  const categoryText=categories.length?categories.join(', '):'geen categorieën meegegeven';
  return `Je leest een Nederlandse kassabon, factuur of aankoopbon voor de boot-app MijnSerenity.

Lees de AFBEELDING zelf zorgvuldig. Dit is geen klassieke OCR-taak: gebruik de hele visuele context van het document om kleine of lastig leesbare tekst correct te begrijpen.

REGELS
- Verzin niets dat niet zichtbaar is of sterk uit het document zelf volgt.
- Corrigeer alleen duidelijke tekenverwisselingen, bijvoorbeeld 0/O, 1/I of een slecht leesbaar jaartal, wanneer de rest van de bon dit overtuigend ondersteunt.
- Gebruik voor date de document-/bon-/factuurdatum, niet een willekeurige andere datum. Formaat exact YYYY-MM-DD. Leeg als echt niet betrouwbaar te bepalen.
- total_amount is het bedrag inclusief btw / te betalen. Gebruik een getal, geen tekst.
- subtotal_ex_vat en vat_amount alleen invullen als ze op de bon staan of direct en eenduidig uit de bon volgen; anders null.
- merchant is de echte leverancier/bedrijfsnaam, niet een klantnaam, plaatsnaam of willekeurige OCR-achtige letterreeks.
- summary is een korte bruikbare omschrijving van wat gekocht is, bij voorkeur het belangrijkste artikel. Niet alleen de leverancier.
- items bevat alle duidelijk herkenbare gekochte artikelen. Neem artikelnummer, omschrijving en bedragen over wanneer leesbaar.
- receipt_number is bon-/document-/factuurnummer. order_number is order-/bestelnummer.
- currency is EUR tenzij op de bon duidelijk iets anders staat.
- Kies category alleen uit deze bestaande app-categorieën: ${categoryText}. Als geen categorie logisch past of geen categorieën zijn meegegeven, gebruik een lege string.
- confidence is 0 t/m 1 en weerspiegelt hoe zeker je bent over de kernvelden.
- Antwoord uitsluitend volgens het JSON-schema.`;
}

function modelCandidates(preferred){
  return [...new Set([safeText(preferred,80),'gpt-5.6-sol','gpt-5.6-terra','gpt-5.6-luna'].filter(Boolean))];
}

async function callOpenAI(apiKey,model,image,categories){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),30000);
  try{
    return await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      signal:controller.signal,
      headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        model,
        store:false,
        reasoning:{effort:'low'},
        max_output_tokens:1400,
        input:[
          {role:'system',content:systemPrompt(categories)},
          {role:'user',content:[
            {type:'input_text',text:'Lees deze bon volledig en retourneer de velden uit het schema.'},
            {type:'input_image',image_url:image,detail:'original'}
          ]}
        ],
        text:{format:{type:'json_schema',name:'receipt_extraction',strict:true,schema:receiptSchema()}}
      })
    });
  }finally{
    clearTimeout(timer);
  }
}

function normalize(payload,categories){
  const p=payload&&typeof payload==='object'?payload:{};
  const category=categories.includes(String(p.category||''))?String(p.category):'';
  const date=/^20\d{2}-\d{2}-\d{2}$/.test(String(p.date||''))?String(p.date):'';
  const num=v=>v===null||v===undefined||v===''?undefined:(Number.isFinite(Number(v))?Number(v):undefined);
  const items=Array.isArray(p.items)?p.items.slice(0,20).map(item=>({
    article_number:safeText(item?.article_number,80),
    description:safeText(item?.description,300),
    quantity:num(item?.quantity),
    unit:safeText(item?.unit,40),
    unit_price:num(item?.unit_price),
    line_total:num(item?.line_total)
  })).filter(item=>item.description||item.article_number):[];
  return {
    merchant:safeText(p.merchant,180),
    date,
    total_amount:num(p.total_amount),
    subtotal_ex_vat:num(p.subtotal_ex_vat),
    vat_amount:num(p.vat_amount),
    currency:safeText(p.currency,12)||'EUR',
    receipt_number:safeText(p.receipt_number,120),
    order_number:safeText(p.order_number,120),
    category,
    summary:safeText(p.summary,300),
    items,
    confidence:Math.max(0,Math.min(1,Number(p.confidence)||0))
  };
}

export default async (request)=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
  if(request.method!=='POST')return json({error:'Alleen POST is toegestaan.'},405);

  const apiKey=Netlify.env.get('OPENAI_API_KEY');
  if(!apiKey)return json({error:'AI-bonherkenning is nog niet gekoppeld aan OpenAI.'},503);

  const now=Date.now();
  const recent=globalThis.__serenityReceiptAiRecent instanceof Map
    ?globalThis.__serenityReceiptAiRecent
    :(globalThis.__serenityReceiptAiRecent=new Map());
  for(const [key,at] of recent){if(now-at>10*60*1000)recent.delete(key)}
  while(recent.size>600)recent.delete(recent.keys().next().value);
  const ip=String(request.headers.get('x-nf-client-connection-ip')||request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();
  const last=recent.get(ip)||0;
  if(now-last<900)return json({error:'Even wachten en probeer de bon opnieuw.'},429);
  recent.set(ip,now);

  let body;
  try{body=await request.json()}catch{return json({error:'Ongeldige aanvraag.'},400)}
  const image=String(body?.image||'');
  if(!/^data:image\/(?:jpeg|jpg|png|webp);base64,/i.test(image))return json({error:'Geen geldige bonfoto ontvangen.'},400);
  if(image.length>8_000_000)return json({error:'De bonfoto is te groot.'},413);
  const categories=Array.isArray(body?.categories)
    ?body.categories.map(v=>safeText(v,80)).filter(Boolean).slice(0,30)
    :[];

  let lastStatus=500;
  for(const model of modelCandidates(Netlify.env.get('OPENAI_RECEIPT_MODEL'))){
    let response;
    try{response=await callOpenAI(apiKey,model,image,categories)}catch(error){
      console.error('Receipt AI netwerkfout:',error);
      return json({error:'AI-bonherkenning kon OpenAI niet bereiken.'},502);
    }
    const data=await response.json().catch(()=>({}));
    if(response.ok){
      const text=responseText(data);
      let parsed;
      try{parsed=JSON.parse(text)}catch{
        console.warn('Receipt AI gaf geen geldige JSON:',text.slice(0,500));
        return json({error:'AI-bonherkenning gaf een onleesbaar antwoord.'},502);
      }
      return json({receipt:normalize(parsed,categories),model});
    }
    lastStatus=response.status;
    const message=safeText(data?.error?.message||data?.error||'OpenAI gaf een fout.',500);
    console.warn(`Receipt AI model ${model} gaf ${response.status}:`,message);
    if([401,429].includes(response.status))break;
    if(![400,403,404,422].includes(response.status))break;
  }

  const error=lastStatus===401
    ?'De OpenAI-koppeling moet opnieuw worden geautoriseerd.'
    :lastStatus===429
      ?'AI-bonherkenning is even druk. Probeer zo opnieuw.'
      :'AI-bonherkenning kon deze bon nu niet verwerken.';
  return json({error},502);
};
