const SUPABASE_URL='https://wufslczbtguvtgmfufid.supabase.co';
const SUPABASE_KEY='sb_publishable_LCJ5Oj0yG4guOvBFPS5ALg_WG57gAo9';
const PHOTO_BUCKET='poi-photos';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let currentUser=null,currentBoat=null,currentRole=null,liveChannel=null;
$('costDate').value=new Date().toISOString().slice(0,10);

function setMsg(t){$('authMsg').textContent=t}
function showTab(id,b){document.querySelectorAll('#appView > section').forEach(s=>s.classList.add('hidden'));$(id).classList.remove('hidden');document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active')}
function setPoiProgress(text){$('poiProgress').textContent=text;$('poiProgress').classList.toggle('hidden',!text)}
function clearPoiForm(){['poiId','poiName','poiPlace','poiReview','poiRating'].forEach(id=>$(id).value='');$('poiCategory').value='Haven';$('poiPhotos').value='';$('poiFormTitle').textContent='POI toevoegen';$('poiSaveButton').textContent='Opslaan';$('poiCancelButton').classList.add('hidden');setPoiProgress('')}
function cancelPoiEdit(){clearPoiForm()}
async function signUp(){const email=$('email').value.trim(),password=$('password').value;if(!email||password.length<6)return setMsg('Vul een geldig e-mailadres en minimaal 6 tekens als wachtwoord in.');const {data,error}=await sb.auth.signUp({email,password});if(error)return setMsg(error.message);setMsg(data.session?'Account gemaakt en ingelogd.':'Account gemaakt. Open de bevestigingsmail en log daarna in.')}
async function signIn(){const {error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)setMsg(error.message)}
async function signOut(){await sb.auth.signOut()}
async function initialise(session){currentUser=session?.user||null;$('authView').classList.toggle('hidden',!!currentUser);$('appView').classList.toggle('hidden',!currentUser);if(!currentUser){currentBoat=null;currentRole=null;if(liveChannel){await sb.removeChannel(liveChannel);liveChannel=null}return}$('welcome').textContent='Welkom '+currentUser.email;await loadMembership();renderBoat();if(currentBoat){await Promise.all([loadPois(),loadCosts()]);subscribeRealtime()}}
sb.auth.onAuthStateChange((_e,s)=>initialise(s));

async function loadMembership(){const {data,error}=await sb.from('boat_members').select('role,boat_id,boats(id,name,created_by)').eq('user_id',currentUser.id).limit(1);if(error){alert('Lidmaatschap laden mislukt: '+error.message);return}if(data?.length){currentRole=data[0].role;currentBoat=data[0].boats}else{currentRole=null;currentBoat=null}}
function renderBoat(){$('noBoatCard').classList.toggle('hidden',!!currentBoat);$('boatCard').classList.toggle('hidden',!currentBoat);$('dBoat').textContent=currentBoat?.name||'-';if(currentBoat){$('boatName').textContent=currentBoat.name;$('rolePill').textContent=currentRole==='owner'?'Eigenaar':'Lid';$('ownerInvite').classList.toggle('hidden',currentRole!=='owner')}}
async function createBoat(){const {error}=await sb.rpc('create_boat_with_owner',{boat_name:$('newBoatName').value.trim()||'Serenity'});if(error)return alert('Boot aanmaken mislukt: '+error.message);await loadMembership();renderBoat();await Promise.all([loadPois(),loadCosts()]);subscribeRealtime()}
async function createInvite(){const {data,error}=await sb.rpc('create_boat_invite',{target_boat:currentBoat.id});if(error)return alert('Deelcode maken mislukt: '+error.message);$('inviteCode').textContent=data}
async function joinBoat(){const code=$('joinCode').value.trim();if(!code)return alert('Vul eerst de deelcode in.');const {error}=await sb.rpc('join_boat_by_code',{invite_code:code});if(error)return alert('Deelnemen mislukt: '+error.message);await loadMembership();renderBoat();await Promise.all([loadPois(),loadCosts()]);subscribeRealtime()}

async function savePoi(){
  if(!currentBoat)return alert('Koppel eerst Serenity.');
  const id=$('poiId').value.trim();
  const row={boat_id:currentBoat.id,created_by:currentUser.id,name:$('poiName').value.trim(),category:$('poiCategory').value,place:$('poiPlace').value.trim(),review:$('poiReview').value.trim(),rating:Number($('poiRating').value)||null,updated_at:new Date().toISOString()};
  if(!row.name)return alert('Vul een naam in.');
  setPoiProgress(id?'POI bijwerken…':'POI opslaan…');
  let poiId=id;
  if(id){
    const {error}=await sb.from('pois').update({name:row.name,category:row.category,place:row.place,review:row.review,rating:row.rating,updated_at:row.updated_at}).eq('id',id);
    if(error){setPoiProgress('');return alert(error.message)}
  }else{
    const {data,error}=await sb.from('pois').insert(row).select('id').single();
    if(error){setPoiProgress('');return alert(error.message)}
    poiId=data.id;
  }
  const files=[...$('poiPhotos').files].slice(0,6);
  if(files.length)await uploadPoiPhotos(poiId,files);
  clearPoiForm();
  await loadPois();
}
function editPoi(id,name,category,place,rating,review){
  $('poiId').value=id;$('poiName').value=name;$('poiCategory').value=category||'Haven';$('poiPlace').value=place||'';$('poiRating').value=rating||'';$('poiReview').value=review||'';
  $('poiFormTitle').textContent='POI bewerken';$('poiSaveButton').textContent='Wijzigingen opslaan';$('poiCancelButton').classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
}
async function deletePoi(id){
  if(!confirm('Deze POI en alle bijbehorende foto’s verwijderen?'))return;
  const {data:photos}=await sb.from('poi_photos').select('storage_path').eq('poi_id',id);
  if(photos?.length)await sb.storage.from(PHOTO_BUCKET).remove(photos.map(p=>p.storage_path));
  const {error}=await sb.from('pois').delete().eq('id',id);
  if(error)alert(error.message);
}
async function uploadPoiPhotos(poiId,files){
  for(let i=0;i<files.length;i++){
    const file=files[i];
    setPoiProgress(`Foto ${i+1} van ${files.length} uploaden…`);
    const safeExt=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
    const path=`${currentBoat.id}/${poiId}/${crypto.randomUUID()}.${safeExt}`;
    const {error:uploadError}=await sb.storage.from(PHOTO_BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||'image/jpeg'});
    if(uploadError){alert('Foto uploaden mislukt: '+uploadError.message);continue}
    const {error:metaError}=await sb.from('poi_photos').insert({poi_id:poiId,boat_id:currentBoat.id,created_by:currentUser.id,storage_path:path,original_name:file.name});
    if(metaError){await sb.storage.from(PHOTO_BUCKET).remove([path]);alert('Foto registreren mislukt: '+metaError.message)}
  }
}
async function deletePhoto(id,path){
  if(!confirm('Foto verwijderen?'))return;
  const {error:storageError}=await sb.storage.from(PHOTO_BUCKET).remove([path]);
  if(storageError)return alert(storageError.message);
  const {error}=await sb.from('poi_photos').delete().eq('id',id);
  if(error)alert(error.message);
}
async function loadPoiPhotos(){
  const {data,error}=await sb.from('poi_photos').select('*').eq('boat_id',currentBoat.id).order('created_at',{ascending:true});
  if(error){console.error(error);return {}}
  const grouped={};
  for(const photo of data){
    const {data:signed,error:signedError}=await sb.storage.from(PHOTO_BUCKET).createSignedUrl(photo.storage_path,3600);
    if(signedError)continue;
    (grouped[photo.poi_id]??=[]).push({...photo,url:signed.signedUrl});
  }
  return grouped;
}
async function loadPois(){
  const [{data,error},photos]=await Promise.all([
    sb.from('pois').select('*').eq('boat_id',currentBoat.id).order('created_at',{ascending:false}),
    loadPoiPhotos()
  ]);
  if(error)return alert(error.message);
  $('dPois').textContent=data.length;
  $('poiList').innerHTML=data.length?data.map(p=>{
    const photoHtml=(photos[p.id]||[]).map(ph=>`<div class="photo-wrap"><img src="${esc(ph.url)}" alt="Foto van ${esc(p.name)}"><button class="photo-delete" onclick="deletePhoto('${ph.id}','${esc(ph.storage_path)}')">×</button></div>`).join('');
    return `<div class="item"><h3>${esc(p.name)}</h3><div class="small">${esc(p.category)} · ${esc(p.place)} · ${'★★★★★'.slice(0,p.rating||0)}</div><p>${esc(p.review)}</p>${photoHtml?`<div class="photo-grid">${photoHtml}</div>`:''}<div class="actions"><button class="secondary" onclick='editPoi(${JSON.stringify(p.id)},${JSON.stringify(p.name)},${JSON.stringify(p.category)},${JSON.stringify(p.place)},${JSON.stringify(p.rating)},${JSON.stringify(p.review)})'>Bewerken</button><button class="danger" onclick="deletePoi('${p.id}')">Verwijderen</button></div></div>`;
  }).join(''):'<span class="small">Nog geen POI’s.</span>';
}

async function addCost(){if(!currentBoat)return alert('Koppel eerst Serenity.');const row={boat_id:currentBoat.id,created_by:currentUser.id,expense_date:$('costDate').value,amount:Number($('costAmount').value)||0,category:$('costCategory').value,description:$('costDescription').value.trim()};const {error}=await sb.from('costs').insert(row);if(error)return alert(error.message);$('costAmount').value='';$('costDescription').value=''}
async function deleteCost(id){const {error}=await sb.from('costs').delete().eq('id',id);if(error)alert(error.message)}
async function loadCosts(){const {data,error}=await sb.from('costs').select('*').eq('boat_id',currentBoat.id).order('expense_date',{ascending:false});if(error)return alert(error.message);$('dCosts').textContent='€'+data.reduce((s,c)=>s+Number(c.amount||0),0).toFixed(0);$('costList').innerHTML=data.length?data.map(c=>`<div class="item"><h3>€${Number(c.amount).toFixed(2)} · ${esc(c.category)}</h3><div class="small">${esc(c.expense_date)} · ${esc(c.description)}</div><button class="danger" onclick="deleteCost('${c.id}')">Verwijder</button></div>`).join(''):'<span class="small">Nog geen kosten.</span>'}
function subscribeRealtime(){if(liveChannel)sb.removeChannel(liveChannel);liveChannel=sb.channel('serenity-'+currentBoat.id).on('postgres_changes',{event:'*',schema:'public',table:'pois',filter:`boat_id=eq.${currentBoat.id}`},loadPois).on('postgres_changes',{event:'*',schema:'public',table:'poi_photos',filter:`boat_id=eq.${currentBoat.id}`},loadPois).on('postgres_changes',{event:'*',schema:'public',table:'costs',filter:`boat_id=eq.${currentBoat.id}`},loadCosts).subscribe(s=>$('dSync').textContent=s==='SUBSCRIBED'?'Live':'…')}
(async()=>{const {data:{session}}=await sb.auth.getSession();await initialise(session)})();
