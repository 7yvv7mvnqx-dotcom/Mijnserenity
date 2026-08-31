function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},body:JSON.stringify(body)}}
exports.handler=async event=>{
  if(event.httpMethod!=='POST')return json(405,{error:'Alleen POST toegestaan.'});
  if(!process.env.OPENAI_API_KEY)return json(503,{error:'OpenAI is niet geconfigureerd.'});
  let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Ongeldige aanvraag.'})}
  const text=String(body.text||'').trim().slice(0,3500);
  if(!text)return json(400,{error:'Geen tekst om voor te lezen.'});
  try{
    const response=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o-mini-tts',voice:'alloy',input:text,response_format:'mp3'})});
    if(!response.ok){const detail=await response.text().catch(()=>String(response.status));console.warn('Captain TTS:',response.status,detail.slice(0,300));return json(502,{error:'OpenAI kon geen audio maken.'})}
    const buffer=Buffer.from(await response.arrayBuffer());
    return json(200,{audio:buffer.toString('base64'),mimeType:'audio/mpeg'});
  }catch(error){console.warn('Captain TTS:',error);return json(502,{error:'Gesproken antwoord is tijdelijk niet beschikbaar.'})}
};