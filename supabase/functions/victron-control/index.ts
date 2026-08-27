import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const INSTALLATION_ID = 1003203;
const ALLOWED_ORIGINS = new Set([
  "https://mijnserenity.nl",
  "https://www.mijnserenity.nl",
  "http://localhost:8888",
  "http://localhost:3000",
]);
const NETLIFY_PREVIEW_ORIGIN = /^https:\/\/deploy-preview-\d+--radiant-pithivier-5c37cf\.netlify\.app$/;
const MODE_LABELS = {1:"Alleen laden",2:"Alleen omvormer",3:"Aan",4:"Uit"};

function isAllowedOrigin(origin:string){return ALLOWED_ORIGINS.has(origin)||NETLIFY_PREVIEW_ORIGIN.test(origin)}
function headers(req:Request){
  const origin=String(req.headers.get("origin")||"");
  const allowed=isAllowedOrigin(origin)?origin:"https://mijnserenity.nl";
  return {
    "Access-Control-Allow-Origin":allowed,
    "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-vrm-token",
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store",
    Vary:"Origin",
  };
}
function reply(req:Request,status:number,data:unknown){return new Response(JSON.stringify(data),{status,headers:headers(req)})}
function finite(value:unknown){return value!==null&&value!==undefined&&value!==""&&Number.isFinite(Number(value))}
function number(value:unknown){return finite(value)?Number(value):null}
function rowValue(row:any){for(const v of [row?.valueFloat,row?.rawValue,row?.valueFormattedValueOnly,row?.value])if(finite(v))return Number(v);return null}
function rowString(row:any){for(const v of [row?.rawValue,row?.value,row?.valueFormatted,row?.formattedValue,row?.valueFormattedValueOnly])if(typeof v==="string"&&v.trim())return v.trim();return ""}
function rowPath(row:any){return String(row?.dbusPath||"").toLowerCase()}
function rowText(row:any){return [row?.dataAttributeName,row?.description,row?.dbusPath,row?.dbusServiceType,row?.productName].filter(Boolean).join(" ").toLowerCase()}
function walkRows(value:any,out:any[]=[]){if(!value||typeof value!=="object")return out;if(!Array.isArray(value)&&("dbusPath" in value||"dataAttributeName" in value||"instance" in value))out.push(value);if(Array.isArray(value))for(const item of value)walkRows(item,out);else for(const item of Object.values(value))walkRows(item,out);return out}
function bestVebusInstance(rows:any[]){
  const scores=new Map<number,number>();
  for(const row of rows){
    const instance=number(row?.instance);if(instance===null)continue;
    const path=rowPath(row),text=rowText(row);let score=scores.get(instance)||0;
    if(path==="/mode")score+=220;
    if(path==="/modeisadjustable")score+=180;
    if(path==="/ac/in/1/currentlimit"||path==="/ac/activein/l1/v"||path==="/ac/in/1/l1/v")score+=160;
    if(path==="/ac/out/l1/p")score+=100;
    if(/vebus|multiplus|quattro|inverter.?charger|omvormer.?lader/.test(text))score+=100;
    if(/smartsolar|mppt|smartshunt|battery monitor/.test(text))score-=180;
    scores.set(instance,score);
  }
  const best=[...scores.entries()].sort((a,b)=>b[1]-a[1])[0];
  return best&&best[1]>100?best[0]:null;
}
function findRow(rows:any[],instance:number|null,path:string){
  const p=path.toLowerCase();
  return rows.find(row=>(instance===null||Number(row?.instance)===Number(instance))&&rowPath(row)===p)||null;
}
function portalIdFromRows(rows:any[]){
  const systemSerial=rows.find(row=>rowPath(row)==="/serial"&&/system/.test(String(row?.dbusServiceType||"").toLowerCase()));
  const candidates=[rowString(systemSerial),...rows.filter(row=>rowPath(row)==="/serial").map(rowString)];
  for(const candidate of candidates){const m=String(candidate||"").trim().match(/^[0-9a-f]{12}$/i);if(m)return m[0].toLowerCase()}
  return "";
}
function environmentApiKey(){
  const direct=Deno.env.get("SUPABASE_PUBLISHABLE_KEY")||Deno.env.get("SUPABASE_ANON_KEY");if(direct)return direct;
  const raw=Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");if(!raw)return "";
  try{const parsed=JSON.parse(raw),candidate=(parsed as any)?.default||Object.values(parsed||{})[0]||"";if(String(candidate).startsWith("sb_"))return String(candidate);return Deno.env.get(String(candidate))||""}catch{return ""}
}
async function authorize(authHeader:string,boatId:string){
  const supabaseUrl=String(Deno.env.get("SUPABASE_URL")||""),apiKey=environmentApiKey();
  if(!supabaseUrl||!apiKey)throw new Error("supabase_configuration");
  const common={Authorization:authHeader,apikey:apiKey,Accept:"application/json"};
  const userResponse=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:common});
  if(!userResponse.ok)throw new Error("invalid_user");
  const user=await userResponse.json();if(!user?.id)throw new Error("invalid_user");
  const boatUrl=new URL(`${supabaseUrl}/rest/v1/boats`);boatUrl.searchParams.set("id",`eq.${boatId}`);boatUrl.searchParams.set("select","id");boatUrl.searchParams.set("limit","1");
  const boatResponse=await fetch(boatUrl,{headers:common});if(!boatResponse.ok)throw new Error("membership_check_failed");
  const boats=await boatResponse.json();if(!Array.isArray(boats)||boats.length!==1)throw new Error("not_a_boat_member");
  return user;
}
async function vrmDiagnostics(token:string){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(`https://vrmapi.victronenergy.com/v2/installations/${INSTALLATION_ID}/diagnostics?count=1000`,{headers:{"X-Authorization":`Token ${token}`,Accept:"application/json"},signal:controller.signal});
    const body=await response.json().catch(()=>null);
    if(!response.ok||body?.success===false){if(response.status===401||response.status===403)throw new Error("vrm_unauthorized");throw new Error(`vrm_http_${response.status}`)}
    return body;
  }finally{clearTimeout(timer)}
}
function readControl(rows:any[]){
  const instance=bestVebusInstance(rows);
  const modeRow=findRow(rows,instance,"/Mode");
  const modeAdjRow=findRow(rows,instance,"/ModeIsAdjustable");
  const limitRows=rows.filter(row=>Number(row?.instance)===Number(instance)&&/\/ac\/in\/\d+\/currentlimit$/i.test(String(row?.dbusPath||"")));
  const currentLimitRow=limitRows.find(row=>/\/ac\/in\/1\/currentlimit$/i.test(String(row?.dbusPath||"")))||limitRows[0]||null;
  const adjustableRow=currentLimitRow?findRow(rows,instance,`${String(currentLimitRow.dbusPath).replace(/\/CurrentLimit$/i,"")}/CurrentLimitIsAdjustable`):findRow(rows,instance,"/Ac/In/1/CurrentLimitIsAdjustable");
  const mode=rowValue(modeRow),currentLimit=rowValue(currentLimitRow);
  return {
    instance,
    mode,
    modeLabel:mode!==null?(MODE_LABELS as any)[mode]||`Stand ${mode}`:"Onbekend",
    modeAdjustable:rowValue(modeAdjRow)!==0,
    currentLimit,
    currentLimitPath:String(currentLimitRow?.dbusPath||"/Ac/In/1/CurrentLimit"),
    currentLimitAdjustable:rowValue(adjustableRow)!==0,
  };
}
function utf8(value:string){return new TextEncoder().encode(value)}
function mqttString(value:string){const b=utf8(value),o=new Uint8Array(2+b.length);o[0]=(b.length>>8)&255;o[1]=b.length&255;o.set(b,2);return o}
function concat(...parts:Uint8Array[]){const len=parts.reduce((a,b)=>a+b.length,0),out=new Uint8Array(len);let off=0;for(const p of parts){out.set(p,off);off+=p.length}return out}
function remainingLength(length:number){const out:number[]=[];do{let d=length%128;length=Math.floor(length/128);if(length>0)d|=128;out.push(d)}while(length>0);return new Uint8Array(out)}
function mqttConnectPacket(clientId:string,username:string,password:string){
  const vh=concat(mqttString("MQTT"),new Uint8Array([4,0xC2,0,30]));
  const payload=concat(mqttString(clientId),mqttString(username),mqttString(password));
  return concat(new Uint8Array([0x10]),remainingLength(vh.length+payload.length),vh,payload)
}
function mqttPublishPacket(topic:string,payload:string){const t=mqttString(topic),p=utf8(payload);return concat(new Uint8Array([0x30]),remainingLength(t.length+p.length),t,p)}
function brokerIndex(portalId:string){let sum=0;for(const c of portalId.toLowerCase().trim())sum+=c.charCodeAt(0);return sum%128}
async function mqttWrite(portalId:string,username:string,token:string,topic:string,value:number){
  if(!username)throw new Error("vrm_username_missing");
  const host=`webmqtt${brokerIndex(portalId)}.victronenergy.com`;
  const socket=new WebSocket(`wss://${host}`,"mqtt");
  socket.binaryType="arraybuffer";
  const connected=new Promise<void>((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error("mqtt_timeout")),9000);
    socket.onerror=()=>{clearTimeout(timer);reject(new Error("mqtt_connection"))};
    socket.onopen=()=>socket.send(mqttConnectPacket(`MijnSerenity_${crypto.randomUUID().replace(/-/g,"").slice(0,12)}`,username,`Token ${token}`));
    socket.onmessage=(event)=>{
      const data=event.data instanceof ArrayBuffer?new Uint8Array(event.data):new Uint8Array();
      if((data[0]&0xF0)===0x20){clearTimeout(timer);if(data.length>=4&&data[3]===0)resolve();else reject(new Error(`mqtt_connack_${data[3]??"unknown"}`))}
    };
  });
  try{
    await connected;
    socket.send(mqttPublishPacket(topic,JSON.stringify({value})));
    await new Promise(resolve=>setTimeout(resolve,350));
    if(socket.readyState===WebSocket.OPEN)socket.send(new Uint8Array([0xE0,0]));
    socket.close();
  }catch(error){try{socket.close()}catch{};throw error}
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS"){
    const origin=String(req.headers.get("origin")||"");if(origin&&!isAllowedOrigin(origin))return reply(req,403,{success:false,error:"Origin niet toegestaan."});
    return new Response(null,{status:204,headers:headers(req)});
  }
  if(req.method!=="POST")return reply(req,405,{success:false,error:"Alleen POST is toegestaan."});
  const origin=String(req.headers.get("origin")||"");if(origin&&!isAllowedOrigin(origin))return reply(req,403,{success:false,error:"Origin niet toegestaan."});
  const authHeader=String(req.headers.get("authorization")||"");if(!/^Bearer\s+[^\s]+$/i.test(authHeader))return reply(req,401,{success:false,error:"Log opnieuw in bij MijnSerenity."});
  const token=String(req.headers.get("x-vrm-token")||"").trim().replace(/^Token\s+/i,"");if(!token)return reply(req,400,{success:false,error:"VRM-token ontbreekt."});
  let body:any={};try{body=await req.json()}catch{return reply(req,400,{success:false,error:"Ongeldige aanvraag."})}
  const boatId=String(body?.boatId||"").trim();if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(boatId))return reply(req,400,{success:false,error:"Boot-ID ontbreekt of is ongeldig."});
  try{
    const user=await authorize(authHeader,boatId);
    const diagnostics=await vrmDiagnostics(token),rows=walkRows(diagnostics),portalId=portalIdFromRows(rows),control=readControl(rows);
    if(!portalId)throw new Error("portal_id_missing");
    if(control.instance===null)throw new Error("vebus_missing");
    const action=String(body?.action||"status");
    if(action==="status")return reply(req,200,{success:true,portalId,control});
    if(action==="setMode"){
      const mode=Number(body?.mode);if(![1,2,3,4].includes(mode))return reply(req,400,{success:false,error:"Ongeldige MultiPlus-stand."});
      if(control.modeAdjustable===false)return reply(req,409,{success:false,error:"De MultiPlus-stand is via Victron niet op afstand instelbaar."});
      await mqttWrite(portalId,String(user?.email||body?.vrmUsername||"").trim(),token,`W/${portalId}/vebus/${control.instance}/Mode`,mode);
      return reply(req,200,{success:true,accepted:true,control:{...control,mode,modeLabel:(MODE_LABELS as any)[mode]}});
    }
    if(action==="setCurrentLimit"){
      const amps=Number(body?.amps);if(!Number.isFinite(amps)||amps<1||amps>32)return reply(req,400,{success:false,error:"Walstroomlimiet moet tussen 1 en 32 A liggen."});
      if(control.currentLimitAdjustable===false)return reply(req,409,{success:false,error:"De walstroomlimiet is via Victron niet instelbaar."});
      const path=control.currentLimitPath.startsWith("/")?control.currentLimitPath:`/${control.currentLimitPath}`;
      await mqttWrite(portalId,String(user?.email||body?.vrmUsername||"").trim(),token,`W/${portalId}/vebus/${control.instance}${path}`,amps);
      return reply(req,200,{success:true,accepted:true,control:{...control,currentLimit:amps}});
    }
    return reply(req,400,{success:false,error:"Onbekende bedieningsactie."});
  }catch(error:any){
    const code=String(error?.message||error);
    const status=code==="not_a_boat_member"?403:code==="invalid_user"?401:code.startsWith("mqtt_connack_")?403:502;
    const messages:any={
      not_a_boat_member:"U heeft geen toegang tot deze boot.",
      invalid_user:"Uw MijnSerenity-login kon niet worden gecontroleerd.",
      vrm_unauthorized:"De VRM-token is ongeldig of heeft geen toegang tot Serenity.",
      vrm_username_missing:"Het VRM e-mailadres kon niet worden bepaald.",
      portal_id_missing:"De VRM Portal-ID van de Cerbo GX kon niet worden gevonden.",
      vebus_missing:"De MultiPlus-II kon niet als VE.Bus-apparaat worden gevonden.",
      mqtt_timeout:"Victron reageerde niet op de bedieningsverbinding.",
      mqtt_connection:"De beveiligde Victron-bedieningsverbinding kon niet worden geopend.",
    };
    return reply(req,status,{success:false,error:messages[code]||(/mqtt_connack_/.test(code)?"Victron heeft de MQTT-login of Full Control-toegang geweigerd.":"De MultiPlus-II kon niet worden bediend.")});
  }
});