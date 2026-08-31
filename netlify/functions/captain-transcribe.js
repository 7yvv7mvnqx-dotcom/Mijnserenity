function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},body:JSON.stringify(body)}}
exports.handler=async event=>{
  if(event.httpMethod!=='POST')return json(405,{error:'Alleen POST toegestaan.'});
  if(!process.env.OPENAI_API_KEY)return json(503,{error:'OpenAI is niet geconfigureerd.'});
  let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Ongeldige aanvraag.'})}
  const base64=String(body.audio||'');const mimeType=String(body.mimeType||'audio/mp4').slice(0,80);
  if(!base64)return json(400,{error:'Geen audio ontvangen.'});
  let buffer;try{buffer=Buffer.from(base64,'base64')}catch{return json(400,{error:'Ongeldige audio.'})}
  if(!buffer.length||buffer.length>6*1024*1024)return json(413,{error:'Audio is te groot.'});
  try{
    const form=new FormData();
    form.append('model','gpt-4o-mini-transcribe');
    form.append('language','nl');
    form.append('file',new Blob([buffer],{type:mimeType}),mimeType.includes('webm')?'captain.webm':'captain.m4a');
    const response=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY},body:form});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)return json(502,{error:data?.error?.message||'OpenAI transcriptie mislukt.'});
    return json(200,{text:String(data.text||'').trim()});
  }catch(error){console.warn('Captain transcriptie:',error);return json(502,{error:'Spraak kon niet worden omgezet naar tekst.'})}
};