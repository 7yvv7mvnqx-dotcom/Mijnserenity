const recent=new Map();
const MODEL='gpt-5-mini';
const TIMEOUT=20000;
function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},body:JSON.stringify(body)}}
function textFrom(data){if(typeof data?.output_text==='string')return data.output_text.trim();try{return (data?.output||[]).flatMap(x=>x?.content||[]).map(x=>x?.text||'').join('').trim()}catch{return''}}
exports.handler=async event=>{
 if(event.httpMethod==='GET')return json(200,{ok:true,service:'mijnserenity-chatgpt',configured:Boolean(process.env.OPENAI_API_KEY),model:MODEL});
 if(event.httpMethod!=='POST')return json(405,{error:'Alleen GET en POST toegestaan.'});
 if(!process.env.OPENAI_API_KEY)return json(503,{error:'OpenAI is nog niet geconfigureerd.'});
 const ip=event.headers['x-nf-client-connection-ip']||event.headers['client-ip']||'unknown',now=Date.now(),last=recent.get(ip)||0;
 if(now-last<700)return json(429,{error:'Wacht heel even en probeer opnieuw.'});recent.set(ip,now);for(const[k,t]of recent)if(now-t>600000)recent.delete(k);
 let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Ongeldige aanvraag.'})}
 const message=String(body.message||'').trim().slice(0,1800);if(message.length<2)return json(400,{error:'Typ of spreek eerst een bericht.'});
 const history=Array.isArray(body.history)?body.history.slice(-10).map(x=>({role:x?.role==='assistant'?'assistant':'user',content:String(x?.content||'').slice(0,1800)})):[];
 const context=body.context&&typeof body.context==='object'?body.context:{};if(JSON.stringify(context).length>35000)return json(413,{error:'Te veel context.'});
 const developer=[
  'Je bent ChatGPT geïntegreerd in MijnSerenity, een persoonlijke assistent binnen een vaar- en bootdashboard.',
  'Antwoord in helder Nederlands, natuurlijk en behulpzaam.',
  'Je mag algemene vragen beantwoorden en je mag de meegegeven MijnSerenity-context gebruiken wanneer die relevant is.',
  'Behandel boordwaarden als sensordata: ontbrekende of onwaarschijnlijke waarden niet verzinnen en onzekerheid expliciet benoemen.',
  'Bij nautische of veiligheidskritische vragen: maak duidelijk welke informatie niet officieel of niet live beschikbaar is.',
  'Wees compact tenzij de gebruiker om uitleg vraagt. Gebruik geen markdown-tabellen tenzij dat echt nodig is.'
 ].join(' ');
 const input=[{role:'developer',content:developer},...history,{role:'user',content:`Bericht: ${message}\n\nMijnSerenity-context (JSON):\n${JSON.stringify(context)}`}];
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),TIMEOUT);
 try{
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',signal:controller.signal,headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,input,reasoning:{effort:'low'},max_output_tokens:1800})});
  const data=await r.json().catch(()=>({}));if(!r.ok)return json(502,{error:data?.error?.message||'OpenAI kon niet antwoorden.'});
  const answer=textFrom(data);if(!answer)return json(502,{error:'ChatGPT gaf geen bruikbaar antwoord.'});return json(200,{answer,model:MODEL});
 }catch(error){if(error?.name==='AbortError')return json(504,{error:'ChatGPT reageert te langzaam. Probeer opnieuw.'});console.warn('MijnSerenity ChatGPT:',error);return json(502,{error:'ChatGPT is tijdelijk niet bereikbaar.'})}finally{clearTimeout(timer)}
};