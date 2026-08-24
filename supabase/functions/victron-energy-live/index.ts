import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const INSTALLATION_ID = 1003203;
const ALLOWED_ORIGINS = new Set([
  "https://mijnserenity.nl",
  "https://www.mijnserenity.nl",
  "http://localhost:8888",
  "http://localhost:3000",
]);
const NETLIFY_PREVIEW_ORIGIN = /^https:\/\/deploy-preview-\d+--radiant-pithivier-5c37cf\.netlify\.app$/;

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.has(origin) || NETLIFY_PREVIEW_ORIGIN.test(origin);
}
function headers(req) {
  const origin = String(req.headers.get("origin") || "");
  const allowed = isAllowedOrigin(origin) ? origin : "https://mijnserenity.nl";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-vrm-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}
function reply(req, status, data) {
  return new Response(JSON.stringify(data), { status, headers: headers(req) });
}
function finite(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}
function number(value) { return finite(value) ? Number(value) : null; }
function walkRows(value, output = []) {
  if (!value || typeof value !== "object") return output;
  if (!Array.isArray(value) && ("dbusPath" in value || "dataAttributeName" in value || "instance" in value)) output.push(value);
  if (Array.isArray(value)) for (const item of value) walkRows(item, output);
  else for (const item of Object.values(value)) walkRows(item, output);
  return output;
}
function rowValue(row) {
  for (const candidate of [row?.valueFloat, row?.rawValue, row?.valueFormattedValueOnly, row?.value]) {
    if (finite(candidate)) return Number(candidate);
  }
  return null;
}
function rowPath(row) { return String(row?.dbusPath || "").toLowerCase(); }
function rowText(row) {
  return [row?.dataAttributeName, row?.description, row?.dbusPath, row?.dbusServiceType, row?.productName]
    .filter(Boolean).join(" ").toLowerCase();
}
function rowString(row) {
  for (const candidate of [row?.rawValue, row?.value, row?.valueFormatted, row?.formattedValue, row?.valueFormattedValueOnly]) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
}
function metric(row) {
  if (!row) return null;
  return { value: rowValue(row), path: String(row?.dbusPath || ""), name: String(row?.dataAttributeName || row?.description || ""), instance: number(row?.instance) };
}
function bestAcInstance(rows) {
  const scores = new Map();
  for (const row of rows) {
    const instance = number(row?.instance);
    if (instance === null) continue;
    const path = rowPath(row), text = rowText(row);
    let score = scores.get(instance) || 0;
    if (path === "/ac/activein/l1/v" || path === "/ac/in/1/l1/v") score += 160;
    if (path === "/ac/activein/l1/p" || path === "/ac/in/1/l1/p") score += 130;
    if (path === "/ac/out/l1/p") score += 130;
    if (path === "/ac/activein/activeinput") score += 100;
    if (path === "/dc/0/current" || path === "/dc/0/power") score += 25;
    if (/vebus|multi(?:plus)?|quattro|inverter.?charger|omvormer.?lader/.test(text)) score += 80;
    if (/inverter|charger|lader|omvormer/.test(text)) score += 20;
    if (/smartsolar|mppt|solar charger|battery monitor|smartshunt/.test(text)) score -= 100;
    scores.set(instance, score);
  }
  const best = [...scores.entries()].sort((a,b)=>b[1]-a[1])[0];
  return best && best[1] > 40 ? best[0] : null;
}
function pick(rows, instance, paths, patterns = [], exclusions = []) {
  const pool = instance === null ? rows : rows.filter(row => Number(row?.instance) === Number(instance));
  for (const path of paths) {
    const found = pool.find(row => rowPath(row) === path.toLowerCase() && rowValue(row) !== null);
    if (found) return found;
  }
  for (const pattern of patterns) {
    const found = pool.find(row => {
      const text = rowText(row);
      return rowValue(row) !== null && pattern.test(text) && !exclusions.some(item => item.test(text));
    });
    if (found) return found;
  }
  return null;
}
function readAc(rows) {
  const instance = bestAcInstance(rows);
  const inputVoltageRow = pick(rows, instance,["/Ac/ActiveIn/L1/V","/Ac/In/1/L1/V","/Ac/Grid/L1/Voltage"],[/active.*in.*voltage|ac.*input.*voltage|grid.*voltage|mains.*voltage|walstroom.*spanning/],[/dc|battery|accu/]);
  const inputCurrentRow = pick(rows, instance,["/Ac/ActiveIn/L1/I","/Ac/In/1/L1/I","/Ac/Grid/L1/Current"],[/active.*in.*current|ac.*input.*current|grid.*current|mains.*current/],[/dc|battery|accu/]);
  const inputPowerRow = pick(rows, instance,["/Ac/ActiveIn/L1/P","/Ac/In/1/L1/P","/Ac/Grid/L1/Power"],[/active.*in.*power|ac.*input.*power|grid.*power|mains.*power|walstroom.*vermogen/],[/dc|battery|accu/]);
  const outputPowerRow = pick(rows, instance,["/Ac/Out/L1/P","/Ac/Consumption/L1/Power"],[/ac.*out.*power|ac.*output.*power|consumption.*power|load.*power|verbruik.*vermogen/],[/solar|pv|mppt|battery|accu/]);
  const activeInputRow = pick(rows, instance,["/Ac/ActiveIn/ActiveInput"],[/active input|active.*ac.*input/]);
  const dcVoltageRow = pick(rows, instance,["/Dc/0/Voltage"],[/dc.*voltage/],[/solar|mppt|smartshunt/]);
  const dcCurrentRow = pick(rows, instance,["/Dc/0/Current"],[/dc.*current/],[/solar|mppt|smartshunt/]);
  const dcPowerRow = pick(rows, instance,["/Dc/0/Power"],[/dc.*power/],[/solar|mppt|smartshunt/]);
  const inputVoltage=rowValue(inputVoltageRow), inputCurrent=rowValue(inputCurrentRow);
  let inputPower=rowValue(inputPowerRow), dcPower=rowValue(dcPowerRow);
  const outputPower=rowValue(outputPowerRow), activeInput=rowValue(activeInputRow);
  const dcVoltage=rowValue(dcVoltageRow), dcCurrent=rowValue(dcCurrentRow);
  if(inputPower===null&&inputVoltage!==null&&inputCurrent!==null)inputPower=inputVoltage*inputCurrent;
  if(dcPower===null&&dcVoltage!==null&&dcCurrent!==null)dcPower=dcVoltage*dcCurrent;
  let shoreConnected=null;
  if(inputVoltage!==null){ if(inputVoltage>=180&&inputVoltage<=280)shoreConnected=true; else if(inputVoltage<80)shoreConnected=false; }
  if(shoreConnected===null&&activeInput!==null){ if(activeInput===240||activeInput===255)shoreConnected=false; else if(activeInput>=0&&activeInput<=2)shoreConnected=true; }
  if(shoreConnected===null&&inputPower!==null&&Math.abs(inputPower)>2)shoreConnected=true;
  const deviceFound=instance!==null||Boolean(inputVoltageRow||inputPowerRow||outputPowerRow||activeInputRow);
  const loadPower=outputPower!==null?outputPower:(deviceFound?0:null);
  let chargerPower=null;
  if(shoreConnected===true){
    if(dcPower!==null&&dcPower>0)chargerPower=dcPower;
    else if(inputPower!==null&&outputPower!==null)chargerPower=Math.max(0,inputPower-outputPower);
    else if(deviceFound)chargerPower=0;
  } else if(shoreConnected===false&&deviceFound) chargerPower=0;
  let inverterPower=null;
  if(shoreConnected===false) inverterPower=outputPower!==null?Math.max(0,outputPower):(dcPower!==null&&dcPower<0?Math.abs(dcPower):(deviceFound?0:null));
  else if(shoreConnected===true&&deviceFound) inverterPower=0;
  return {
    instance,deviceFound,shoreConnected,inputVoltage,inputCurrent,inputPower,outputPower,loadPower,chargerPower,inverterPower,dcVoltage,dcCurrent,dcPower,activeInput,
    sourceMetrics:{inputVoltage:metric(inputVoltageRow),inputPower:metric(inputPowerRow),outputPower:metric(outputPowerRow),activeInput:metric(activeInputRow),dcPower:metric(dcPowerRow)}
  };
}

function bestBatteryInstance(rows){
  const scores=new Map();
  for(const row of rows){
    const instance=number(row?.instance);if(instance===null)continue;
    const path=rowPath(row),text=rowText(row);let score=scores.get(instance)||0;
    if(path==="/soc")score+=180;if(path==="/dc/0/voltage")score+=70;if(path==="/dc/0/current")score+=70;if(path==="/dc/1/voltage")score+=80;
    if(/smartshunt|battery monitor|bmv/.test(text))score+=180;
    if(/smartsolar|mppt|solar charger|vebus|multiplus|quattro/.test(text))score-=140;
    scores.set(instance,score);
  }
  const best=[...scores.entries()].sort((a,b)=>b[1]-a[1])[0];
  return best&&best[1]>100?best[0]:null;
}
function readBattery(rows){
  const instance=bestBatteryInstance(rows);
  const socRow=pick(rows,instance,["/Soc"],[/state of charge|\bsoc\b/]);
  const voltageRow=pick(rows,instance,["/Dc/0/Voltage"],[/battery.*voltage|accu.*spanning/],[/starter|aux|solar|pv/]);
  const currentRow=pick(rows,instance,["/Dc/0/Current"],[/battery.*current|accu.*stroom/],[/starter|aux|solar|pv/]);
  const powerRow=pick(rows,instance,["/Dc/0/Power"],[/battery.*power|accu.*vermogen/],[/solar|pv/]);
  const starterRow=pick(rows,instance,["/Dc/1/Voltage"],[/starter.*voltage|start.*battery.*voltage|aux.*voltage/]);
  const voltage=rowValue(voltageRow),current=rowValue(currentRow);let power=rowValue(powerRow);
  if(power===null&&voltage!==null&&current!==null)power=voltage*current;
  return {instance,soc:rowValue(socRow),voltage,current,power,starterVoltage:rowValue(starterRow),sourceMetrics:{soc:metric(socRow),voltage:metric(voltageRow),current:metric(currentRow),power:metric(powerRow),starterVoltage:metric(starterRow)}};
}
function bestSolarInstance(rows){
  const scores=new Map();
  for(const row of rows){const instance=number(row?.instance);if(instance===null)continue;const path=rowPath(row),text=rowText(row);let score=scores.get(instance)||0;
    if(path==="/yield/power")score+=180;if(path==="/pv/v"||path==="/pv/0/v")score+=90;if(path==="/state")score+=20;
    if(/smartsolar|mppt|solar charger/.test(text))score+=180;if(/smartshunt|battery monitor|vebus/.test(text))score-=150;scores.set(instance,score);
  }
  const best=[...scores.entries()].sort((a,b)=>b[1]-a[1])[0];return best&&best[1]>100?best[0]:null;
}
function readSolar(rows){
  const instance=bestSolarInstance(rows);
  const powerRow=pick(rows,instance,["/Yield/Power","/Pv/0/P","/Dc/0/Power"],[/solar.*power|pv.*power|yield.*power/],[/battery|load/]);
  const pvVoltageRow=pick(rows,instance,["/Pv/V","/Pv/0/V"],[/pv.*voltage/]);
  const currentRow=pick(rows,instance,["/Dc/0/Current"],[/charge.*current|charger.*current/]);
  const stateRow=pick(rows,instance,["/State"],[/charge state|charger state/]);
  return {instance,power:rowValue(powerRow),pvVoltage:rowValue(pvVoltageRow),chargeCurrent:rowValue(currentRow),state:rowValue(stateRow),sourceMetrics:{power:metric(powerRow),pvVoltage:metric(pvVoltageRow),chargeCurrent:metric(currentRow),state:metric(stateRow)}};
}

const FLUID_NAMES={0:"Fuel",1:"Fresh water",2:"Waste water",3:"Live well",4:"Oil",5:"Black water",6:"Gasoline",7:"Diesel",8:"LPG",9:"LNG",10:"Hydraulic oil",11:"Raw water"};
function tankGroups(rows){
  const groups=new Map();
  const tankPaths=new Set(["/level","/fluidtype","/capacity","/remaining","/customname","/productname","/status","/standard"]);
  for(const row of rows){
    const path=rowPath(row),service=String(row?.dbusServiceType||"").toLowerCase();
    if(!service.includes("tank")&&!tankPaths.has(path))continue;
    const instance=number(row?.instance);
    const key=`${service||"tank"}:${instance===null?"unknown":instance}`;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(row);
  }
  return [...groups.values()];
}
function tankFromGroup(group){
  const findPath=(path,requireValue=false)=>group.find(row=>rowPath(row)===path&&(!requireValue||rowValue(row)!==null));
  const levelRow=findPath("/level",true), fluidRow=findPath("/fluidtype"), statusRow=findPath("/status");
  const capacityRow=findPath("/capacity",true), remainingRow=findPath("/remaining",true);
  const nameRow=findPath("/customname")||findPath("/productname");
  const rawLevel=rowValue(levelRow),fluidType=rowValue(fluidRow),status=rowValue(statusRow);
  if(rawLevel===null||rawLevel<0||rawLevel>100)return null;
  const identity=group.map(row=>`${rowText(row)} ${rowString(row)}`).join(" ").toLowerCase();
  const capacityM3=rowValue(capacityRow),remainingM3=rowValue(remainingRow);
  return {
    levelPct:Math.round(rawLevel*10)/10,
    fluidType,
    fluidName:fluidType===null?null:(FLUID_NAMES[fluidType]||`Type ${fluidType}`),
    status,
    instance:number(levelRow?.instance??fluidRow?.instance??group[0]?.instance),
    name:rowString(nameRow)||String(group[0]?.productName||"")||"Tank",
    identity,
    capacityLiters:capacityM3===null?null:Math.round(capacityM3*1000),
    remainingLiters:remainingM3===null?null:Math.round(remainingM3*1000),
    sourceMetrics:{level:metric(levelRow),fluidType:metric(fluidRow),status:metric(statusRow),capacity:metric(capacityRow),remaining:metric(remainingRow)}
  };
}
function tankScore(tank,type){
  if(!tank)return -9999;
  const id=tank.identity||"";
  let score=0;
  if(tank.status===0||tank.status===null)score+=80; else score-=500;
  if(type==="water"){
    if(tank.fluidType===1)score+=1200;
    if(/fresh\s*water|freshwater|drinkwater|zoetwater/.test(id))score+=700;
    if([0,5,6,7].includes(tank.fluidType))score-=900;
  }else if(type==="fuel"){
    if(tank.fluidType===7)score+=1400;
    if(tank.fluidType===0)score+=1100;
    if(/diesel/.test(id))score+=900;
    else if(/brandstof|fuel/.test(id))score+=650;
    if([1,2,5].includes(tank.fluidType))score-=700;
  }else if(type==="waste"){
    if(tank.fluidType===5)score+=1400;
    if(tank.fluidType===2)score+=900;
    if(/black\s*water|zwartwater|sewage|riool/.test(id))score+=900;
    else if(/waste\s*water|wastewater|afvalwater|vuilwater/.test(id))score+=500;
    if([0,1,6,7].includes(tank.fluidType))score-=900;
  }
  return score;
}
function readTanks(rows){
  const all=tankGroups(rows).map(tankFromGroup).filter(Boolean);
  const used=new Set();
  const result={water:null,fuel:null,waste:null,all:[]};
  for(const type of ["fuel","water","waste"]){
    const ranked=all.map(tank=>({tank,score:tankScore(tank,type)})).filter(x=>x.score>200&&!used.has(x.tank.instance)).sort((a,b)=>b.score-a.score);
    if(ranked[0]){result[type]=ranked[0].tank;used.add(ranked[0].tank.instance);}
  }
  result.all=all.map(({identity,...safe})=>safe);
  return result;
}

function environmentApiKey(){
  const direct=Deno.env.get("SUPABASE_PUBLISHABLE_KEY")||Deno.env.get("SUPABASE_ANON_KEY");
  if(direct)return direct;
  const raw=Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if(!raw)return "";
  try{const parsed=JSON.parse(raw);const candidate=parsed?.default||Object.values(parsed||{})[0]||"";if(String(candidate).startsWith("sb_"))return String(candidate);return Deno.env.get(String(candidate))||"";}catch{return "";}
}
async function authorize(authHeader,boatId){
  const supabaseUrl=String(Deno.env.get("SUPABASE_URL")||""),apiKey=environmentApiKey();
  if(!supabaseUrl||!apiKey)throw new Error("supabase_configuration");
  const common={Authorization:authHeader,apikey:apiKey,Accept:"application/json"};
  const userResponse=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:common});
  if(!userResponse.ok)throw new Error("invalid_user");
  const user=await userResponse.json();if(!user?.id)throw new Error("invalid_user");
  const boatUrl=new URL(`${supabaseUrl}/rest/v1/boats`);boatUrl.searchParams.set("id",`eq.${boatId}`);boatUrl.searchParams.set("select","id");boatUrl.searchParams.set("limit","1");
  const boatResponse=await fetch(boatUrl,{headers:common});if(!boatResponse.ok)throw new Error("membership_check_failed");
  const boats=await boatResponse.json();if(!Array.isArray(boats)||boats.length!==1)throw new Error("not_a_boat_member");
}
async function mergeTechnicalStatePatch(boatId,patch){
  if(!Object.keys(patch).length)return;
  const supabaseUrl=String(Deno.env.get("SUPABASE_URL")||""),serviceKey=String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"");
  if(!supabaseUrl||!serviceKey)throw new Error("technical_state_configuration");
  const response=await fetch(`${supabaseUrl}/rest/v1/rpc/merge_technical_state_patch`,{method:"POST",headers:{Authorization:`Bearer ${serviceKey}`,apikey:serviceKey,Accept:"application/json","Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({p_boat_id:boatId,p_patch:patch})});
  if(!response.ok)throw new Error(`technical_state_http_${response.status}`);
}
async function vrmDiagnostics(token){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(`https://vrmapi.victronenergy.com/v2/installations/${INSTALLATION_ID}/diagnostics?count=1000`,{headers:{"X-Authorization":`Token ${token}`,Accept:"application/json"},signal:controller.signal});
    const body=await response.json().catch(()=>null);
    if(!response.ok||body?.success===false){if(response.status===401||response.status===403)throw new Error("vrm_unauthorized");throw new Error(`vrm_http_${response.status}`);}
    return body;
  }finally{clearTimeout(timer);}
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS"){
    const origin=String(req.headers.get("origin")||"");if(origin&&!isAllowedOrigin(origin))return reply(req,403,{success:false,error:"Origin niet toegestaan."});
    return new Response(null,{status:204,headers:headers(req)});
  }
  if(req.method!=="POST")return reply(req,405,{success:false,error:"Alleen POST is toegestaan."});
  const origin=String(req.headers.get("origin")||"");if(origin&&!isAllowedOrigin(origin))return reply(req,403,{success:false,error:"Origin niet toegestaan."});
  const authHeader=String(req.headers.get("authorization")||"");if(!/^Bearer\s+[^\s]+$/i.test(authHeader))return reply(req,401,{success:false,error:"Log opnieuw in bij MijnSerenity."});
  const token=String(req.headers.get("x-vrm-token")||"").trim().replace(/^Token\s+/i,"");if(!token)return reply(req,400,{success:false,error:"VRM-token ontbreekt."});
  let body={};try{body=await req.json();}catch{return reply(req,400,{success:false,error:"Ongeldige aanvraag."});}
  const boatId=String(body?.boatId||"").trim();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(boatId))return reply(req,400,{success:false,error:"Boot-ID ontbreekt of is ongeldig."});
  try{
    await authorize(authHeader,boatId);
    const diagnostics=await vrmDiagnostics(token),rows=walkRows(diagnostics),ac=readAc(rows),battery=readBattery(rows),solar=readSolar(rows),tanks=readTanks(rows);
    const patch={};
    if(tanks.water?.levelPct!==null&&(tanks.water?.status===null||tanks.water?.status===0))patch.waterPct=tanks.water.levelPct;
    if(tanks.fuel?.levelPct!==null&&(tanks.fuel?.status===null||tanks.fuel?.status===0))patch.fuelPct=tanks.fuel.levelPct;
    if(tanks.waste?.levelPct!==null&&(tanks.waste?.status===null||tanks.waste?.status===0))patch.wastePct=tanks.waste.levelPct;
    let tanksPersisted=false;
    try{await mergeTechnicalStatePatch(boatId,patch);tanksPersisted=Object.keys(patch).length>0;}catch(error){console.warn("Victron tankniveaus konden niet worden opgeslagen:",error);}
    return reply(req,200,{success:true,sampledAt:new Date().toISOString(),installationId:INSTALLATION_ID,battery,solar,ac,tanks:{water:tanks.water,fuel:tanks.fuel,waste:tanks.waste,all:tanks.all,persisted:tanksPersisted},source:{diagnostics:true,rowCount:rows.length}});
  }catch(error){
    const code=String(error?.message||error),status=code==="not_a_boat_member"?403:code==="invalid_user"?401:502;
    const messages={not_a_boat_member:"U heeft geen toegang tot deze boot.",invalid_user:"Uw MijnSerenity-login kon niet worden gecontroleerd.",vrm_unauthorized:"De VRM-token is ongeldig of heeft geen toegang tot Serenity."};
    return reply(req,status,{success:false,error:messages[code]||"Victron VRM kon niet live worden uitgelezen."});
  }
});