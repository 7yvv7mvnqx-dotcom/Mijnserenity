const SUPABASE_URL='https://wufslczbtguvtgmfufid.supabase.co';
const SUPABASE_KEY='sb_publishable_LCJ5Oj0yG4guOvBFPS5ALg_WG57gAo9';
const PHOTO_BUCKET='poi-photos';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let currentUser=null,currentBoat=null,currentRole=null,liveChannel=null,mapInstance=null,poiLayer=null,userMarker=null,poiCache=[],favoritesOnly=false;
$('costDate').value=new Date().toISOString().slice(0,10);$('tripDate').value=new Date().toISOString().slice(0,10);

function setMsg(t){$('authMsg').textContent=t}
function showTab(id,b){document.querySelectorAll('#appView > section').forEach(s=>s.classList.add('hidden'));$(id).classList.remove('hidden');document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active')}
function setPoiProgress(text){$('poiProgress').textContent=text;$('poiProgress').classList.toggle('hidden',!text)}
function clearPoiForm(){$('poiFavorite').checked=false;['poiId','poiName','poiPlace','poiReview','poiRating','poiLatitude','poiLongitude'].forEach(id=>$(id).value='');$('poiCategory').value='Haven';$('poiPhotos').value='';$('poiFormTitle').textContent='POI toevoegen';$('poiSaveButton').textContent='Opslaan';$('poiCancelButton').classList.add('hidden');setPoiProgress('')}
function cancelPoiEdit(){clearPoiForm()}
async function signUp(){const email=$('email').value.trim(),password=$('password').value;if(!email||password.length<6)return setMsg('Vul een geldig e-mailadres en minimaal 6 tekens als wachtwoord in.');const {data,error}=await sb.auth.signUp({email,password});if(error)return setMsg(error.message);setMsg(data.session?'Account gemaakt en ingelogd.':'Account gemaakt. Open de bevestigingsmail en log daarna in.')}
async function signIn(){const {error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)setMsg(error.message)}
async function signOut(){await sb.auth.signOut()}
async function initialise(session){currentUser=session?.user||null;$('authView').classList.toggle('hidden',!!currentUser);$('appView').classList.toggle('hidden',!currentUser);if(!currentUser){currentBoat=null;currentRole=null;if(liveChannel){await sb.removeChannel(liveChannel);liveChannel=null}return}$('welcome').textContent='Welkom '+currentUser.email;await loadMembership();renderBoat();if(currentBoat){await Promise.all([loadPois(),loadCosts(),loadTrips()]);subscribeRealtime()}}
sb.auth.onAuthStateChange((_e,s)=>initialise(s));

async function loadMembership(){const {data,error}=await sb.from('boat_members').select('role,boat_id,boats(id,name,created_by)').eq('user_id',currentUser.id).limit(1);if(error){alert('Lidmaatschap laden mislukt: '+error.message);return}if(data?.length){currentRole=data[0].role;currentBoat=data[0].boats}else{currentRole=null;currentBoat=null}}
function renderBoat(){$('noBoatCard').classList.toggle('hidden',!!currentBoat);$('boatCard').classList.toggle('hidden',!currentBoat);$('dBoat').textContent=currentBoat?.name||'-';if(currentBoat){$('boatName').textContent=currentBoat.name;$('rolePill').textContent=currentRole==='owner'?'Eigenaar':'Lid';$('ownerInvite').classList.toggle('hidden',currentRole!=='owner')}}
async function createBoat(){const {error}=await sb.rpc('create_boat_with_owner',{boat_name:$('newBoatName').value.trim()||'Serenity'});if(error)return alert('Boot aanmaken mislukt: '+error.message);await loadMembership();renderBoat();await Promise.all([loadPois(),loadCosts(),loadTrips()]);subscribeRealtime()}
async function createInvite(){const {data,error}=await sb.rpc('create_boat_invite',{target_boat:currentBoat.id});if(error)return alert('Deelcode maken mislukt: '+error.message);$('inviteCode').textContent=data}
async function joinBoat(){const code=$('joinCode').value.trim();if(!code)return alert('Vul eerst de deelcode in.');const {error}=await sb.rpc('join_boat_by_code',{invite_code:code});if(error)return alert('Deelnemen mislukt: '+error.message);await loadMembership();renderBoat();await Promise.all([loadPois(),loadCosts(),loadTrips()]);subscribeRealtime()}

async function savePoi(){
  if(!currentBoat)return alert('Koppel eerst Serenity.');
  const id=$('poiId').value.trim();
  const row={boat_id:currentBoat.id,created_by:currentUser.id,name:$('poiName').value.trim(),category:$('poiCategory').value,place:$('poiPlace').value.trim(),review:$('poiReview').value.trim(),rating:Number($('poiRating').value)||null,is_favorite:$('poiFavorite').checked,latitude:Number($('poiLatitude').value)||null,longitude:Number($('poiLongitude').value)||null,updated_at:new Date().toISOString()};
  if(!row.name)return alert('Vul een naam in.');
  setPoiProgress(id?'POI bijwerken…':'POI opslaan…');
  let poiId=id;
  if(id){
    const {error}=await sb.from('pois').update({name:row.name,category:row.category,place:row.place,review:row.review,rating:row.rating,is_favorite:row.is_favorite,latitude:row.latitude,longitude:row.longitude,updated_at:row.updated_at}).eq('id',id);
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
function editPoi(id,name,category,place,rating,review,isFavorite,latitude,longitude){
  $('poiId').value=id;$('poiName').value=name;$('poiCategory').value=category||'Haven';$('poiPlace').value=place||'';$('poiRating').value=rating||'';$('poiReview').value=review||'';$('poiFavorite').checked=!!isFavorite;$('poiLatitude').value=latitude??'';$('poiLongitude').value=longitude??'';
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
  poiCache=data;$('dPois').textContent=data.length;
  $('poiList').innerHTML=data.length?data.map(p=>{
    const photoHtml=(photos[p.id]||[]).map(ph=>`<div class="photo-wrap"><img src="${esc(ph.url)}" alt="Foto van ${esc(p.name)}" onclick="openLightbox(${JSON.stringify(ph.url)})"><button class="photo-delete" onclick="deletePhoto('${ph.id}','${esc(ph.storage_path)}')">×</button></div>`).join('');
    return `<div class="item"><h3>${esc(p.name)}${p.is_favorite?'<span class="favorite-badge">⭐</span>':''}</h3><div class="small">${esc(p.category)} · ${esc(p.place)} · ${'★★★★★'.slice(0,p.rating||0)}</div><p>${esc(p.review)}</p>${photoHtml?`<div class="photo-grid">${photoHtml}</div>`:''}<div class="actions"><button class="secondary" onclick='editPoi(${JSON.stringify(p.id)},${JSON.stringify(p.name)},${JSON.stringify(p.category)},${JSON.stringify(p.place)},${JSON.stringify(p.rating)},${JSON.stringify(p.review)},${JSON.stringify(!!p.is_favorite)},${JSON.stringify(p.latitude)},${JSON.stringify(p.longitude)})'>Bewerken</button><button class="danger" onclick="deletePoi('${p.id}')">Verwijderen</button></div></div>`;
  }).join(''):'<span class="small">Nog geen POI’s.</span>';if(mapInstance)renderPoiMarkers();
}

async function addCost(){if(!currentBoat)return alert('Koppel eerst Serenity.');const row={boat_id:currentBoat.id,created_by:currentUser.id,expense_date:$('costDate').value,amount:Number($('costAmount').value)||0,category:$('costCategory').value,description:$('costDescription').value.trim()};const {error}=await sb.from('costs').insert(row);if(error)return alert(error.message);$('costAmount').value='';$('costDescription').value=''}
async function deleteCost(id){const {error}=await sb.from('costs').delete().eq('id',id);if(error)alert(error.message)}
async function loadCosts(){const {data,error}=await sb.from('costs').select('*').eq('boat_id',currentBoat.id).order('expense_date',{ascending:false});if(error)return alert(error.message);$('dCosts').textContent='€'+data.reduce((s,c)=>s+Number(c.amount||0),0).toFixed(0);$('costList').innerHTML=data.length?data.map(c=>`<div class="item"><h3>€${Number(c.amount).toFixed(2)} · ${esc(c.category)}</h3><div class="small">${esc(c.expense_date)} · ${esc(c.description)}</div><button class="danger" onclick="deleteCost('${c.id}')">Verwijder</button></div>`).join(''):'<span class="small">Nog geen kosten.</span>'}
function subscribeRealtime(){if(liveChannel)sb.removeChannel(liveChannel);liveChannel=sb.channel('serenity-'+currentBoat.id).on('postgres_changes',{event:'*',schema:'public',table:'pois',filter:`boat_id=eq.${currentBoat.id}`},loadPois).on('postgres_changes',{event:'*',schema:'public',table:'poi_photos',filter:`boat_id=eq.${currentBoat.id}`},loadPois).on('postgres_changes',{event:'*',schema:'public',table:'costs',filter:`boat_id=eq.${currentBoat.id}`},loadCosts).on('postgres_changes',{event:'*',schema:'public',table:'trips',filter:`boat_id=eq.${currentBoat.id}`},loadTrips).subscribe(s=>$('dSync').textContent=s==='SUBSCRIBED'?'Live':'…')}

function initMap(){
  if(mapInstance){setTimeout(()=>mapInstance.invalidateSize(),100);return}
  mapInstance=L.map('mapCanvas').setView([52.5,5.75],7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'&copy; OpenStreetMap'
  }).addTo(mapInstance);
  poiLayer=L.layerGroup().addTo(mapInstance);
  renderPoiMarkers();
  setTimeout(()=>mapInstance.invalidateSize(),150);
}
function renderPoiMarkers(){
  if(!mapInstance||!poiLayer)return;
  poiLayer.clearLayers();
  const points=[];
  poiCache.filter(p=>!favoritesOnly||p.is_favorite).forEach(p=>{
    if(typeof p.latitude!=='number'||typeof p.longitude!=='number')return;
    const marker=L.marker([p.latitude,p.longitude]).addTo(poiLayer);
    marker.bindPopup(`<div class="map-popup"><h3>${esc(p.name)}${p.is_favorite?' ⭐':''}</h3><p>${esc(p.category||'')} · ${esc(p.place||'')}</p><p>${esc(p.review||'')}</p></div>`);
    points.push([p.latitude,p.longitude]);
  });
  if(points.length===1)mapInstance.setView(points[0],14);
}
function fitPoiMarkers(){
  const points=poiCache.filter(p=>(!favoritesOnly||p.is_favorite)&&typeof p.latitude==='number'&&typeof p.longitude==='number').map(p=>[p.latitude,p.longitude]);
  if(!mapInstance)initMap();
  if(points.length)mapInstance.fitBounds(points,{padding:[30,30],maxZoom:14});
}
function toggleFavoritesOnly(){
  favoritesOnly=!favoritesOnly;
  renderPoiMarkers();
  fitPoiMarkers();
}
function locateMe(){
  if(!navigator.geolocation)return alert('Locatie wordt niet ondersteund.');
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat=pos.coords.latitude,lon=pos.coords.longitude;
    if(!mapInstance)initMap();
    if(userMarker)userMarker.remove();
    userMarker=L.circleMarker([lat,lon],{radius:9}).addTo(mapInstance).bindPopup('Jouw huidige positie');
    mapInstance.setView([lat,lon],14);
  },err=>alert('Locatie ophalen mislukt: '+err.message),{enableHighAccuracy:true,timeout:12000});
}
function useCurrentLocationForPoi(){
  if(!navigator.geolocation)return alert('Locatie wordt niet ondersteund.');
  navigator.geolocation.getCurrentPosition(pos=>{
    $('poiLatitude').value=pos.coords.latitude.toFixed(6);
    $('poiLongitude').value=pos.coords.longitude.toFixed(6);
  },err=>alert('Locatie ophalen mislukt: '+err.message),{enableHighAccuracy:true,timeout:12000});
}

async function saveTrip(){
  if(!currentBoat)return alert('Koppel eerst Serenity.');
  const row={
    boat_id:currentBoat.id,created_by:currentUser.id,
    trip_date:$('tripDate').value,
    title:$('tripTitle').value.trim()||`${$('tripFrom').value.trim()} naar ${$('tripTo').value.trim()}`,
    departure:$('tripFrom').value.trim(),
    arrival:$('tripTo').value.trim(),
    distance_km:Number($('tripDistance').value)||null,
    duration_hours:Number($('tripHours').value)||null,
    crew:$('tripCrew').value.trim(),
    notes:$('tripNotes').value.trim()
  };
  const {error}=await sb.from('trips').insert(row);
  if(error)return alert(error.message);
  ['tripTitle','tripFrom','tripTo','tripDistance','tripHours','tripCrew','tripNotes'].forEach(id=>$(id).value='');
}
async function deleteTrip(id){
  if(!confirm('Deze vaartocht verwijderen?'))return;
  const {error}=await sb.from('trips').delete().eq('id',id);
  if(error)alert(error.message);
}
async function loadTrips(){
  if(!currentBoat)return;
  const {data,error}=await sb.from('trips').select('*').eq('boat_id',currentBoat.id).order('trip_date',{ascending:false});
  if(error){console.error(error);return}
  $('dTrips').textContent=data.length;
  $('tripList').innerHTML=data.length?data.map(t=>`<div class="item"><h3>${esc(t.title||'Vaartocht')}</h3><div class="small">${esc(t.trip_date)} · ${esc(t.departure||'')} → ${esc(t.arrival||'')}</div><div class="trip-summary"><span>Afstand: ${t.distance_km??'-'} km</span><span>Vaartijd: ${t.duration_hours??'-'} uur</span><span>Bemanning: ${esc(t.crew||'-')}</span></div><p>${esc(t.notes||'')}</p><button class="danger" onclick="deleteTrip('${t.id}')">Verwijderen</button></div>`).join(''):'<span class="small">Nog geen vaartochten.</span>';
}

(async()=>{const {data:{session}}=await sb.auth.getSession();await initialise(session)})();

function openLightbox(url){
  $('lightboxImage').src=url;
  $('lightbox').classList.remove('hidden');
  document.body.style.overflow='hidden';
}
function closeLightbox(){
  $('lightbox').classList.add('hidden');
  $('lightboxImage').src='';
  document.body.style.overflow='';
}
