const recent=new Map();
const RATE_WINDOW_MS=1200;
const RATE_RETENTION_MS=10*60*1000;

function pruneRecent(now=Date.now()){
  for(const [key,at] of recent){if(now-at>RATE_RETENTION_MS)recent.delete(key)}
  while(recent.size>500){
    const key=recent.keys().next().value;
    if(key===undefined)break;
    recent.delete(key);
  }
}

async function fetchWithTimeout(url,options={},timeoutMs=6000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetch(url,{...options,signal:controller.signal})}
  finally{clearTimeout(timer)}
}

exports.handler=async event=>{
  const headers={
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff'
  };
  if(event.httpMethod!=='POST')return {statusCode:405,headers,body:JSON.stringify({error:'Alleen POST toegestaan'})};

  const ip=event.headers['x-nf-client-connection-ip']||event.headers['client-ip']||'unknown';
  const now=Date.now();
  pruneRecent(now);
  const last=recent.get(ip)||0;
  if(now-last<RATE_WINDOW_MS)return {statusCode:429,headers,body:JSON.stringify({error:'Wacht heel even en probeer opnieuw.'})};
  recent.delete(ip);
  recent.set(ip,now);

  let body={};
  try{body=JSON.parse(event.body||'{}')}catch{}
  const query=String(body.query||'').trim().slice(0,120);
  if(query.length<2)return {statusCode:400,headers,body:JSON.stringify({error:'Vul minimaal twee tekens in.'})};

  let search=query,ai=false;
  if(process.env.OPENAI_API_KEY){
    try{
      const response=await fetchWithTimeout('https://api.openai.com/v1/responses',{
        method:'POST',
        headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({
          model:'gpt-5-mini',
          input:[
            {role:'developer',content:'Zet een Nederlandse zoekopdracht voor een vaarbestemming om in één korte geografische zoekterm voor geocoding. Behoud haven-, plaats-, jachthaven-, brug- of sluisnamen. Verzin niets. Antwoord uitsluitend als JSON: {"search":"..."}.'},
            {role:'user',content:query}
          ],
          max_output_tokens:80
        })
      },5500);
      if(response.ok){
        const data=await response.json();
        const raw=data.output_text||data.output?.flatMap(item=>item.content||[]).map(item=>item.text||'').join('')||'';
        const match=raw.match(/\{[\s\S]*\}/);
        if(match){
          const parsed=JSON.parse(match[0]);
          if(parsed.search){search=String(parsed.search).slice(0,120);ai=true}
        }
      }
    }catch(error){
      console.warn('AI-bestemmingsinterpretatie overgeslagen:',error?.name||error?.message||error);
    }
  }

  const params=new URLSearchParams({q:search,format:'jsonv2',limit:'6',countrycodes:'nl',addressdetails:'1'});
  try{
    const geo=await fetchWithTimeout('https://nominatim.openstreetmap.org/search?'+params,{
      headers:{'User-Agent':'MijnSerenity/8.20.2 (destination search)','Accept-Language':'nl','Accept':'application/json'}
    },6500);
    if(!geo.ok)throw new Error('Locatieservice niet beschikbaar');
    const rows=await geo.json();
    const results=rows.map((row,index)=>({
      id:'ai-'+Date.now()+'-'+index,
      name:String(row.name||row.display_name||search).split(',')[0],
      label:row.display_name,
      lat:Number(row.lat),lon:Number(row.lon),type:row.type||'',
      category:/marina|harbour|dock/i.test(row.type||'')?'Haven':'Bestemming'
    })).filter(result=>Number.isFinite(result.lat)&&Number.isFinite(result.lon));
    return {statusCode:200,headers,body:JSON.stringify({query,interpreted:search,ai,results})};
  }catch(error){
    return {statusCode:502,headers,body:JSON.stringify({error:error?.name==='AbortError'?'Locatieservice reageert te langzaam':error.message||'Zoeken mislukt'})};
  }
};