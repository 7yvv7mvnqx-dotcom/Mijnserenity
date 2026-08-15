const recent=new Map();
exports.handler=async(event)=>{
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
 if(event.httpMethod!=='POST')return{statusCode:405,headers,body:JSON.stringify({error:'Alleen POST toegestaan'})};
 const ip=event.headers['x-nf-client-connection-ip']||event.headers['client-ip']||'unknown',now=Date.now(),last=recent.get(ip)||0;
 if(now-last<1200)return{statusCode:429,headers,body:JSON.stringify({error:'Wacht heel even en probeer opnieuw.'})};recent.set(ip,now);
 let body={};try{body=JSON.parse(event.body||'{}')}catch{}
 const query=String(body.query||'').trim().slice(0,120);if(query.length<2)return{statusCode:400,headers,body:JSON.stringify({error:'Vul minimaal twee tekens in.'})};
 let search=query,ai=false;
 if(process.env.OPENAI_API_KEY){
  try{
   const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({
    model:'gpt-5-mini',
    input:[{role:'developer',content:'Zet een Nederlandse zoekopdracht voor een vaarbestemming om in één korte geografische zoekterm voor geocoding. Behoud haven-, plaats-, jachthaven-, brug- of sluisnamen. Verzin niets. Antwoord uitsluitend als JSON: {"search":"..."}.'},{role:'user',content:query}],
    max_output_tokens:80
   })});
   if(response.ok){const data=await response.json(),raw=data.output_text||data.output?.flatMap(x=>x.content||[]).map(x=>x.text||'').join('')||'';const match=raw.match(/\{[\s\S]*\}/);if(match){const parsed=JSON.parse(match[0]);if(parsed.search)search=String(parsed.search).slice(0,120);ai=true}}
  }catch{}
 }
 const params=new URLSearchParams({q:search,format:'jsonv2',limit:'6',countrycodes:'nl',addressdetails:'1'});
 try{
  const geo=await fetch('https://nominatim.openstreetmap.org/search?'+params,{headers:{'User-Agent':'MijnSerenity/7.15.51 (destination search)','Accept-Language':'nl'}});
  if(!geo.ok)throw new Error('Locatieservice niet beschikbaar');
  const rows=await geo.json();
  const results=rows.map((r,i)=>({id:'ai-'+Date.now()+'-'+i,name:String(r.name||r.display_name||search).split(',')[0],label:r.display_name,lat:Number(r.lat),lon:Number(r.lon),type:r.type||'',category:/marina|harbour|dock/i.test(r.type||'')?'Haven':'Bestemming'})).filter(r=>Number.isFinite(r.lat)&&Number.isFinite(r.lon));
  return{statusCode:200,headers,body:JSON.stringify({query,interpreted:search,ai,results})};
 }catch(error){return{statusCode:502,headers,body:JSON.stringify({error:error.message||'Zoeken mislukt'})}}
};