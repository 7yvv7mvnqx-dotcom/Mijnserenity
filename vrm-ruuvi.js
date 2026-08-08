exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors(), body: '' };
  const supplied = String(event.headers['x-vrm-token'] || event.headers['X-VRM-Token'] || '').trim();
  const configured = String(process.env.VRM_API_TOKEN || '').trim();
  const rawToken = supplied || configured;
  if (!rawToken) return json(401,{success:false,error:'VRM-token ontbreekt'});
  const auth = /^Token\s+/i.test(rawToken) ? rawToken : `Token ${rawToken}`;
  try {
    const url='https://vrmapi.victronenergy.com/v2/installations/1003203/diagnostics?count=1000';
    const response=await fetch(url,{headers:{'X-Authorization':auth,'Accept':'application/json'}});
    const body=await response.json().catch(()=>({}));
    if(!response.ok||body?.success===false) return json(response.status||502,{success:false,error:body?.errors||body?.error||`VRM HTTP ${response.status}`});
    const rows=Object.values(body?.records?.data||{}).filter(v=>v&&typeof v==='object'&&v.instance!=null);
    const read=(instance,kind)=>{
      const list=rows.filter(r=>Number(r.instance)===instance);
      const patterns=kind==='temperature'?[/\/temperature\b/i,/temperature/i]:kind==='humidity'?[/\/humidity\b/i,/humidity/i,/relative humidity/i]:[/pressure/i,/air pressure/i];
      for(const re of patterns){
        const hit=list.find(r=>re.test(`${r.dbusPath||''} ${r.dataAttributeName||''} ${r.code||''}`)&&finite(r.valueFloat??r.rawValue??r.value));
        if(hit)return Number(hit.valueFloat??hit.rawValue??hit.value);
      }
      return null;
    };
    const device=(instance)=>({temperature:read(instance,'temperature'),humidity:read(instance,'humidity'),pressure:read(instance,'pressure'),instance});
    return json(200,{success:true,siteId:1003203,salon:device(24),machinekamer:device(25),updatedAt:new Date().toISOString()});
  } catch(error){return json(502,{success:false,error:String(error?.message||error)});}
};
function finite(v){return v!==null&&v!==''&&Number.isFinite(Number(v));}
function cors(){return {'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, X-VRM-Token'};}
function json(statusCode,data){return {statusCode,headers:cors(),body:JSON.stringify(data)};}
