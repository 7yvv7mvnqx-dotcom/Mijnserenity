const INSTALLATION_ID=1003203;
const VRM='https://vrmapi.victronenergy.com/v2';

function json(statusCode,data){
  return {statusCode,headers:{
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store, max-age=0',
    'X-Content-Type-Options':'nosniff'
  },body:JSON.stringify(data)};
}

async function fetchJson(url,token){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(url,{headers:{
      'X-Authorization':`Token ${token}`,
      'Accept':'application/json',
      'User-Agent':'MijnSerenity/8.21.1'
    },signal:controller.signal});
    const data=await response.json().catch(()=>null);
    if(!response.ok||data?.success===false){
      const error=new Error(`vrm_http_${response.status}`);
      error.status=response.status;
      throw error;
    }
    return data;
  }finally{clearTimeout(timer)}
}

function deepFirst(value,names,seen=new Set()){
  if(!value||typeof value!=='object'||seen.has(value))return null;
  seen.add(value);
  for(const name of names){
    const hit=value[name];
    if(hit!==undefined&&hit!==null&&String(hit).trim())return hit;
  }
  for(const child of Object.values(value)){
    if(child&&typeof child==='object'){
      const hit=deepFirst(child,names,seen);
      if(hit!==null)return hit;
    }
  }
  return null;
}

function shardFrom(identifier,mqttWebhost){
  const match=String(mqttWebhost||'').match(/webmqtt(\d+)\./i);
  if(match)return match[1];
  const id=String(identifier||'').trim().toLowerCase();
  if(!id)return '';
  let sum=0;
  for(const char of id)sum+=char.charCodeAt(0);
  return String(sum%128);
}

exports.handler=async event=>{
  if(event.httpMethod!=='POST')return json(405,{success:false,error:'Alleen POST toegestaan.'});
  const supplied=String(event.headers['x-vrm-token']||event.headers['X-Vrm-Token']||'').trim();
  const token=supplied.replace(/^Token\s+/i,'');
  if(!token)return json(400,{success:false,error:'VRM-token ontbreekt.'});

  try{
    const me=await fetchJson(`${VRM}/users/me`,token);
    const idUser=Number(deepFirst(me,['idUser','id_user','userId','id']));
    if(!Number.isFinite(idUser)||idUser<=0)throw new Error('vrm_user_not_found');

    const installations=await fetchJson(`${VRM}/users/${idUser}/installations?extended=1`,token);
    const records=Array.isArray(installations?.records)?installations.records:[];
    const site=records.find(item=>Number(item?.idSite)===INSTALLATION_ID)
      ||records.find(item=>Number(item?.idsite)===INSTALLATION_ID);
    if(!site)return json(404,{success:false,error:'Serenity is niet gevonden in deze VRM-account.'});

    const identifier=String(site.identifier||site.portalId||site.portal_id||'').trim();
    const mqttWebhost=String(site.mqtt_webhost||site.mqttWebhost||'').trim();
    const shard=shardFrom(identifier,mqttWebhost);
    if(!identifier||!shard)throw new Error('vrm_mqtt_config_missing');

    const email=String(deepFirst(me,['email','username','login'])||'').trim();
    return json(200,{
      success:true,
      installationId:INSTALLATION_ID,
      portalId:identifier,
      shard,
      mqttWebhost:mqttWebhost||`wss://webmqtt${shard}.victronenergy.com/mqtt`,
      email:email.includes('@')?email:null
    });
  }catch(error){
    const status=Number(error?.status)||0;
    if(status===401||status===403)return json(401,{success:false,error:'De Victron VRM-token is ongeldig of heeft geen toegang.'});
    console.warn('Victron console config mislukt:',String(error?.message||error));
    return json(502,{success:false,error:'De live Cerbo-console kon niet met VRM worden verbonden.'});
  }
};
