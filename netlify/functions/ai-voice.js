function json(body,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store'
    }
  });
}

function cleanText(value,max=2800){
  return String(value??'')
    .replace(/\u0000/g,'')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,max);
}

export default async (request)=>{
  if(request.method==='OPTIONS'){
    return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
  }
  if(request.method!=='POST'){
    return json({error:'Alleen POST is toegestaan.'},405);
  }

  const apiKey=Netlify.env.get('OPENAI_API_KEY');
  if(!apiKey){
    return json({error:'De OpenAI-stem is nog niet gekoppeld.'},503);
  }

  let body;
  try{
    body=await request.json();
  }catch{
    return json({error:'Ongeldige aanvraag.'},400);
  }

  const text=cleanText(body?.text);
  if(text.length<2){
    return json({error:'Geen tekst om voor te lezen.'},400);
  }

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),25000);
  try{
    const response=await fetch('https://api.openai.com/v1/audio/speech',{
      method:'POST',
      signal:controller.signal,
      headers:{
        'Authorization':`Bearer ${apiKey}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        model:'gpt-4o-mini-tts',
        voice:'marin',
        input:text,
        instructions:'Spreek natuurlijk Nederlands uit Nederland. Klink warm, helder en rustig, als een moderne premium navigatie- en boordassistent. Gebruik natuurlijke intonatie en een prettig tempo. Geen overdreven emotie.',
        response_format:'mp3'
      })
    });

    if(!response.ok){
      let detail='OpenAI kon geen spraak maken.';
      try{
        const data=await response.json();
        detail=String(data?.error?.message||detail).slice(0,500);
      }catch{}
      return json({error:detail},response.status>=400&&response.status<600?response.status:502);
    }

    const audio=await response.arrayBuffer();
    return new Response(audio,{
      status:200,
      headers:{
        'Content-Type':'audio/mpeg',
        'Cache-Control':'no-store',
        'Content-Length':String(audio.byteLength)
      }
    });
  }catch(error){
    if(error?.name==='AbortError')return json({error:'De OpenAI-stem reageerde te langzaam.'},504);
    return json({error:'De OpenAI-stem is tijdelijk niet bereikbaar.'},502);
  }finally{
    clearTimeout(timer);
  }
};
