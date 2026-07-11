const SUPABASE_URL='https://wufslczbtguvtgmfufid.supabase.co';
const SUPABASE_KEY='sb_publishable_LCJ5Oj0yG4guOvBFPS5ALg_WG57gAo9';
const PHOTO_BUCKET='poi-photos';
const TRIP_PHOTO_BUCKET='trip-photos';
const BOAT_PHOTO_BUCKET='boat-photos';
const TRIP_GPX_BUCKET='trip-gpx';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let tripRouteMaps={};
let currentUser=null,currentBoat=null,currentRole=null,liveChannel=null,mapInstance=null,poiLayer=null,userMarker=null,poiCache=[],poiPhotoCache={},costCache=[],tripCache=[],settingsCache=null,favoritesOnly=false,poiPickerMap=null,poiPickerMarker=null,poiPickerSelection=null;
$('costDate').value=new Date().toISOString().slice(0,10);$('tripDate').value=new Date().toISOString().slice(0,10);

function setMsg(t){$('authMsg').textContent=t}
function toggleSection(id,button){
  const el=$(id);
  const willOpen=el.classList.contains('hidden');
  el.classList.toggle('hidden');
  button?.classList.toggle('open',willOpen);
}
function goToTab(id){
  const buttons=[...document.querySelectorAll('.tab')];
  const map={dashboard:0,live:1,map:2,pois:3,logbook:4,costs:5,finance:6,settings:7,boat:8};
  const button=buttons[map[id]];
  if(button)showTab(id,button);
  if(id==='live')initLiveMode();
  if(id==='map')initMap();
  if(id==='finance')renderFinance();
  if(id==='settings')loadSettingsForm();
}
function showTab(id,b){document.querySelectorAll('#appView > section').forEach(s=>s.classList.add('hidden'));$(id).classList.remove('hidden');document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active')}
function setPoiProgress(text){$('poiProgress').textContent=text;$('poiProgress').classList.toggle('hidden',!text)}
function clearPoiForm(){$('poiFavorite').checked=false;['poiId','poiName','poiPlace','poiAddress','poiReview','poiRating','poiLatitude','poiLongitude'].forEach(id=>$(id).value='');$('poiCategory').value='Haven';$('poiPhotos').value='';$('poiFormTitle').textContent='POI toevoegen';$('poiSaveButton').textContent='Opslaan';$('poiCancelButton').classList.add('hidden');setPoiProgress('')}
function cancelPoiEdit(){clearPoiForm()}
async function signUp(){const email=$('email').value.trim(),password=$('password').value;if(!email||password.length<6)return setMsg('Vul een geldig e-mailadres en minimaal 6 tekens als wachtwoord in.');const {data,error}=await sb.auth.signUp({email,password});if(error)return setMsg(error.message);setMsg(data.session?'Account gemaakt en ingelogd.':'Account gemaakt. Open de bevestigingsmail en log daarna in.')}
async function signIn(){const {error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)setMsg(error.message)}
async function signOut(){await sb.auth.signOut()}
async function initialise(session){currentUser=session?.user||null;$('authView').classList.toggle('hidden',!!currentUser);$('appView').classList.toggle('hidden',!currentUser);if(!currentUser){currentBoat=null;currentRole=null;if(liveChannel){await sb.removeChannel(liveChannel);liveChannel=null}return}$('welcome').textContent='Welkom '+currentUser.email;await loadMembership();renderBoat();if(currentBoat){await Promise.all([loadSettings(),loadPois(),loadCosts(),loadTrips()]);subscribeRealtime()}setTimeout(()=>captainNavigate('dashboard'),0)}
sb.auth.onAuthStateChange((_e,s)=>initialise(s));

async function loadMembership(){const {data,error}=await sb.from('boat_members').select('role,boat_id,boats(id,name,created_by)').eq('user_id',currentUser.id).limit(1);if(error){alert('Lidmaatschap laden mislukt: '+error.message);return}if(data?.length){currentRole=data[0].role;currentBoat=data[0].boats}else{currentRole=null;currentBoat=null}}
function renderBoat(){$('noBoatCard').classList.toggle('hidden',!!currentBoat);$('boatCard').classList.toggle('hidden',!currentBoat);$('dBoat').textContent=currentBoat?.name||'-';if(currentBoat){$('boatName').textContent=currentBoat.name;$('rolePill').textContent=currentRole==='owner'?'Eigenaar':'Lid';$('ownerInvite').classList.toggle('hidden',currentRole!=='owner')}}
async function createBoat(){const {error}=await sb.rpc('create_boat_with_owner',{boat_name:$('newBoatName').value.trim()||'Serenity'});if(error)return alert('Boot aanmaken mislukt: '+error.message);await loadMembership();renderBoat();await Promise.all([loadSettings(),loadPois(),loadCosts(),loadTrips()]);subscribeRealtime()}
async function createInvite(){const {data,error}=await sb.rpc('create_boat_invite',{target_boat:currentBoat.id});if(error)return alert('Deelcode maken mislukt: '+error.message);$('inviteCode').textContent=data}
async function joinBoat(){const code=$('joinCode').value.trim();if(!code)return alert('Vul eerst de deelcode in.');const {error}=await sb.rpc('join_boat_by_code',{invite_code:code});if(error)return alert('Deelnemen mislukt: '+error.message);await loadMembership();renderBoat();await Promise.all([loadSettings(),loadPois(),loadCosts(),loadTrips()]);subscribeRealtime()}

async function savePoi(){
  if(!currentBoat)return alert('Koppel eerst Serenity.');
  const id=$('poiId').value.trim();
  const row={boat_id:currentBoat.id,created_by:currentUser.id,name:$('poiName').value.trim(),category:$('poiCategory').value,place:$('poiPlace').value.trim(),address:$('poiAddress').value.trim(),review:$('poiReview').value.trim(),rating:Number($('poiRating').value)||null,is_favorite:$('poiFavorite').checked,latitude:Number($('poiLatitude').value)||null,longitude:Number($('poiLongitude').value)||null,updated_at:new Date().toISOString()};
  if(!row.name)return alert('Vul een naam in.');
  setPoiProgress(id?'POI bijwerken…':'POI opslaan…');
  let poiId=id;
  if(id){
    const {error}=await sb.from('pois').update({name:row.name,category:row.category,place:row.place,address:row.address,review:row.review,rating:row.rating,is_favorite:row.is_favorite,latitude:row.latitude,longitude:row.longitude,updated_at:row.updated_at}).eq('id',id);
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
function editPoi(id,name,category,place,address,rating,review,isFavorite,latitude,longitude){
  $('poiId').value=id;$('poiName').value=name;$('poiCategory').value=category||'Haven';$('poiPlace').value=place||'';$('poiAddress').value=address||'';$('poiRating').value=rating||'';$('poiReview').value=review||'';$('poiFavorite').checked=!!isFavorite;$('poiLatitude').value=latitude??'';$('poiLongitude').value=longitude??'';
  $('poiFormTitle').textContent='POI bewerken';$('poiFormWrap').classList.remove('hidden');document.querySelector('[onclick*=\"poiFormWrap\"]')?.classList.add('open');$('poiSaveButton').textContent='Wijzigingen opslaan';$('poiCancelButton').classList.remove('hidden');
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
  poiCache=(data||[]).map(poi=>({
    ...poi,
    latitude:poi.latitude===null||poi.latitude===''?null:Number(poi.latitude),
    longitude:poi.longitude===null||poi.longitude===''?null:Number(poi.longitude),
    is_favorite:isFavoritePoi(poi)
  }));
  poiPhotoCache=photos;
  $('dPois').textContent=poiCache.length;
  data=poiCache;
  $('poiList').innerHTML=data.length?data.map(p=>{
    const photoHtml=(photos[p.id]||[]).map(ph=>`<div class="photo-wrap"><img src="${esc(ph.url)}" alt="Foto van ${esc(p.name)}" onclick="openLightbox(${JSON.stringify(ph.url)})"><button class="photo-delete" onclick="deletePhoto('${ph.id}','${esc(ph.storage_path)}')">×</button></div>`).join('');
    return `<div class="item"><h3>${esc(p.name)}${p.is_favorite?'<span class="favorite-badge">⭐</span>':''}</h3><div class="small">${esc(p.category)} · ${esc(p.place)} · ${'★★★★★'.slice(0,p.rating||0)}</div>${p.address?`<div class="small">📍 ${esc(p.address)}</div>`:''}<p>${esc(p.review)}</p>${photoHtml?`<div class="photo-grid">${photoHtml}</div>`:''}<button class="delete-mini" onclick="deletePoi('${p.id}')">🗑️</button><div class="item-actions"><button class="edit-button" onclick='editPoi(${JSON.stringify(p.id)},${JSON.stringify(p.name)},${JSON.stringify(p.category)},${JSON.stringify(p.place)},${JSON.stringify(p.address)},${JSON.stringify(p.rating)},${JSON.stringify(p.review)},${JSON.stringify(!!p.is_favorite)},${JSON.stringify(p.latitude)},${JSON.stringify(p.longitude)})'>✏️ Bewerken</button></div></div>`;
  }).join(''):'<span class="small">Nog geen POI’s.</span>';if(mapInstance)renderPoiMarkers();
}

async function addCost(){if(!currentBoat)return alert('Koppel eerst Serenity.');const row={boat_id:currentBoat.id,created_by:currentUser.id,expense_date:$('costDate').value,amount:Number($('costAmount').value)||0,category:$('costCategory').value,description:$('costDescription').value.trim()};const {error}=await sb.from('costs').insert(row);if(error)return alert(error.message);$('costAmount').value='';$('costDescription').value=''}
async function deleteCost(id){const {error}=await sb.from('costs').delete().eq('id',id);if(error)alert(error.message)}
async function loadCosts(){const {data,error}=await sb.from('costs').select('*').eq('boat_id',currentBoat.id).order('expense_date',{ascending:false});if(error)return alert(error.message);costCache=data;$('dCosts').textContent='€'+data.reduce((s,c)=>s+Number(c.amount||0),0).toFixed(0);$('costList').innerHTML=data.length?data.map(c=>`<div class="item"><h3>€${Number(c.amount).toFixed(2)} · ${esc(c.category)}</h3><div class="small">${esc(c.expense_date)} · ${esc(c.description)}</div><button class="danger" onclick="deleteCost('${c.id}')">Verwijder</button></div>`).join(''):'<span class="small">Nog geen kosten.</span>'}
function subscribeRealtime(){if(liveChannel)sb.removeChannel(liveChannel);liveChannel=sb.channel('serenity-'+currentBoat.id).on('postgres_changes',{event:'*',schema:'public',table:'pois',filter:`boat_id=eq.${currentBoat.id}`},loadPois).on('postgres_changes',{event:'*',schema:'public',table:'poi_photos',filter:`boat_id=eq.${currentBoat.id}`},loadPois).on('postgres_changes',{event:'*',schema:'public',table:'costs',filter:`boat_id=eq.${currentBoat.id}`},loadCosts).on('postgres_changes',{event:'*',schema:'public',table:'trips',filter:`boat_id=eq.${currentBoat.id}`},loadTrips).on('postgres_changes',{event:'*',schema:'public',table:'trip_photos',filter:`boat_id=eq.${currentBoat.id}`},loadTrips).on('postgres_changes',{event:'*',schema:'public',table:'boat_settings',filter:`boat_id=eq.${currentBoat.id}`},loadSettings).subscribe(s=>$('dSync').textContent=s==='SUBSCRIBED'?'Live':'…')}

function resetPoiFilters(){$('poiSearch').value='';$('poiFilterCategory').value='';$('poiFilterRating').value='0';$('poiFilterExtra').value='';renderPoiList()}
function renderPoiList(){if(!$('poiList'))return;const q=($('poiSearch')?.value||'').toLowerCase(),cat=$('poiFilterCategory')?.value||'',rating=Number($('poiFilterRating')?.value||0),extra=$('poiFilterExtra')?.value||'';const f=poiCache.filter(p=>{const h=[p.name,p.place,p.review,p.category].join(' ').toLowerCase();return(!q||h.includes(q))&&(!cat||p.category===cat)&&(!rating||Number(p.rating||0)>=rating)&&(extra!=='favorite'||p.is_favorite)&&(extra!=='photos'||(poiPhotoCache[p.id]||[]).length)&&(extra!=='notes'||String(p.review||'').trim())});$('poiList').innerHTML=f.length?f.map(p=>{const ph=(poiPhotoCache[p.id]||[]).map(x=>`<div class="photo-wrap"><img src="${esc(x.url)}" onclick="openLightbox(${JSON.stringify(x.url)})"><button class="photo-delete" onclick="deletePhoto('${x.id}','${esc(x.storage_path)}')">×</button></div>`).join('');return `<div class="item"><h3>${esc(p.name)}${p.is_favorite?' ⭐':''}</h3><div class="small">${esc(p.category)} · ${esc(p.place)} · ${'★★★★★'.slice(0,p.rating||0)}</div>${p.address?`<div class="small">📍 ${esc(p.address)}</div>`:''}<p>${esc(p.review)}</p>${ph?`<div class="photo-grid">${ph}</div>`:''}<button class="delete-mini" onclick="deletePoi('${p.id}')">🗑️</button><div class="item-actions"><button class="edit-button" onclick='editPoi(${JSON.stringify(p.id)},${JSON.stringify(p.name)},${JSON.stringify(p.category)},${JSON.stringify(p.place)},${JSON.stringify(p.address)},${JSON.stringify(p.rating)},${JSON.stringify(p.review)},${JSON.stringify(!!p.is_favorite)},${JSON.stringify(p.latitude)},${JSON.stringify(p.longitude)})'>Bewerken</button><button class="danger" onclick="deletePoi('${p.id}')">Verwijderen</button></div></div>`}).join(''):'<span class="small">Geen POI’s gevonden.</span>'}
async function loadSettings(){
  if(!currentBoat)return;
  const {data,error}=await sb
    .from('boat_settings')
    .select('*')
    .eq('boat_id',currentBoat.id)
    .maybeSingle();

  if(error){
    console.error('Instellingen laden mislukt:',error);
    return;
  }

  settingsCache=data||{
    boat_id:currentBoat.id,
    boat_name:currentBoat.name,
    dashboard_photo_path:null
  };

  await loadDashboardPhoto();
}

async function loadDashboardPhoto(){
  const img=$('dashboardBoatPhoto');
  const placeholder=$('dashboardPhotoPlaceholder');
  if(!img||!placeholder)return;

  const photoPath=settingsCache?.dashboard_photo_path;
  if(!photoPath){
    img.removeAttribute('src');
    img.classList.add('hidden');
    placeholder.classList.remove('hidden');
    return;
  }

  const {data,error}=await sb.storage
    .from(BOAT_PHOTO_BUCKET)
    .createSignedUrl(photoPath,3600);

  if(error||!data?.signedUrl){
    console.error('Dashboardfoto laden mislukt:',error);
    img.removeAttribute('src');
    img.classList.add('hidden');
    placeholder.classList.remove('hidden');
    return;
  }

  img.onload=()=>{
    img.classList.remove('hidden');
    placeholder.classList.add('hidden');
  };
  img.onerror=()=>{
    img.classList.add('hidden');
    placeholder.classList.remove('hidden');
  };
  img.src=data.signedUrl+(data.signedUrl.includes('?')?'&':'?')+'v='+Date.now();
}
async function uploadDashboardPhoto(){
  const file=$('settingBoatPhoto').files[0];
  if(!file)return alert('Kies eerst een foto.');
  $('dashboardPhotoMsg').textContent='Foto uploaden…';
  $('dashboardPhotoMsg').classList.remove('hidden');

  const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
  const path=`${currentBoat.id}/dashboard-${Date.now()}.${ext}`;

  const {error:uploadError}=await sb.storage.from(BOAT_PHOTO_BUCKET).upload(path,file,{
    upsert:false,
    contentType:file.type||'image/jpeg',
    cacheControl:'3600'
  });
  if(uploadError)return alert(uploadError.message);

  const oldPath=settingsCache?.dashboard_photo_path||null;
  const row={
    boat_id:currentBoat.id,
    boat_name:settingsCache?.boat_name||currentBoat.name||'Serenity',
    fuel_price:settingsCache?.fuel_price??null,
    fuel_per_hour:settingsCache?.fuel_per_hour??null,
    tank_capacity:settingsCache?.tank_capacity??null,
    dashboard_photo_path:path,
    updated_at:new Date().toISOString()
  };
  const {error}=await sb.from('boat_settings').upsert(row,{onConflict:'boat_id'});
  if(error){
    await sb.storage.from(BOAT_PHOTO_BUCKET).remove([path]);
    return alert(error.message);
  }
  if(oldPath&&oldPath!==path)await sb.storage.from(BOAT_PHOTO_BUCKET).remove([oldPath]);
  settingsCache=row;
  $('dashboardPhotoMsg').textContent='Dashboardfoto opgeslagen ✅';
  $('settingBoatPhoto').value='';
  await loadDashboardPhoto();
}
async function removeDashboardPhoto(){
  if(!settingsCache?.dashboard_photo_path)return;
  if(!confirm('Dashboardfoto verwijderen?'))return;
  await sb.storage.from(BOAT_PHOTO_BUCKET).remove([settingsCache.dashboard_photo_path]);
  const {error}=await sb.from('boat_settings').update({dashboard_photo_path:null,updated_at:new Date().toISOString()}).eq('boat_id',currentBoat.id);
  if(error)return alert(error.message);
  settingsCache.dashboard_photo_path=null;await loadDashboardPhoto();
}

function loadSettingsForm(){if(!settingsCache)return;$('settingBoatName').value=settingsCache.boat_name||'Serenity';$('settingFuelPrice').value=settingsCache.fuel_price??'';$('settingFuelPerHour').value=settingsCache.fuel_per_hour??'';$('settingTankCapacity').value=settingsCache.tank_capacity??''}
async function saveSettings(){
  const row={
    boat_id:currentBoat.id,
    boat_name:$('settingBoatName').value.trim()||'Serenity',
    fuel_price:$('settingFuelPrice').value===''?null:Number($('settingFuelPrice').value),
    fuel_per_hour:$('settingFuelPerHour').value===''?null:Number($('settingFuelPerHour').value),
    tank_capacity:$('settingTankCapacity').value===''?null:Number($('settingTankCapacity').value),
    dashboard_photo_path:settingsCache?.dashboard_photo_path??null,
    updated_at:new Date().toISOString()
  };

  const {error}=await sb.from('boat_settings').upsert(row,{onConflict:'boat_id'});
  if(error)return alert(error.message);

  settingsCache={...(settingsCache||{}),...row};
  $('settingsMsg').textContent='Instellingen opgeslagen ✅';
  $('settingsMsg').classList.remove('hidden');
  await loadDashboardPhoto();
  previewFuelCalculation();
}
function previewFuelCalculation(){if(!$('fuelPreview'))return;const h=Number($('tripHours').value)||0,l=Number($('tripFuelLiters').value)||(h&&settingsCache?.fuel_per_hour?h*Number(settingsCache.fuel_per_hour):0),c=Number($('tripFuelCost').value)||(l&&settingsCache?.fuel_price?l*Number(settingsCache.fuel_price):0);$('fuelPreview').textContent=l?`Geschat: ${l.toFixed(1)} liter · €${c.toFixed(2)}`:'Vul vaartijd in en stel verbruik/prijs in.'}
function renderFinance(){
  if(!$('fTotal'))return;
  const currentYear=String(new Date().getFullYear());
  const years=[...new Set([
    ...costCache.map(c=>String(c.expense_date||'').slice(0,4)),
    ...tripCache.map(t=>String(t.trip_date||'').slice(0,4))
  ].filter(Boolean))].sort().reverse();

  const yearSelect=$('financeYear');
  const currentValue=yearSelect?.value||'';
  if(yearSelect){
    yearSelect.innerHTML='<option value="">Alle jaren</option>'+years.map(y=>`<option value="${y}">${y}</option>`).join('');
    if(years.includes(currentValue))yearSelect.value=currentValue;
  }

  const selectedYear=yearSelect?.value||'';
  const selectedCategory=$('financeCategory')?.value||'';

  const regular=costCache.filter(c=>{
    const yearOk=!selectedYear||String(c.expense_date||'').startsWith(selectedYear);
    const catOk=!selectedCategory||c.category===selectedCategory;
    return yearOk&&catOk;
  });

  const fuelTrips=tripCache.filter(t=>{
    const yearOk=!selectedYear||String(t.trip_date||'').startsWith(selectedYear);
    const catOk=!selectedCategory||selectedCategory==='Diesel';
    return yearOk&&catOk&&Number(t.fuel_cost||0)>0;
  });

  const filteredTotal=regular.reduce((s,c)=>s+Number(c.amount||0),0)+fuelTrips.reduce((s,t)=>s+Number(t.fuel_cost||0),0);
  const allFuel=tripCache.reduce((s,t)=>s+Number(t.fuel_cost||0),0);
  const yearTotal=costCache.filter(c=>String(c.expense_date||'').startsWith(currentYear)).reduce((s,c)=>s+Number(c.amount||0),0)+tripCache.filter(t=>String(t.trip_date||'').startsWith(currentYear)).reduce((s,t)=>s+Number(t.fuel_cost||0),0);
  const totalHours=tripCache.reduce((s,t)=>s+Number(t.duration_hours||0),0);

  $('fTotal').textContent='€'+filteredTotal.toFixed(0);
  $('fYear').textContent='€'+yearTotal.toFixed(0);
  $('fFuel').textContent='€'+allFuel.toFixed(0);
  $('fPerHour').textContent=totalHours?'€'+((costCache.reduce((s,c)=>s+Number(c.amount||0),0)+allFuel)/totalHours).toFixed(2):'€0';

  const groups={};
  regular.forEach(c=>groups[c.category||'Overig']=(groups[c.category||'Overig']||0)+Number(c.amount||0));
  if(fuelTrips.length)groups['Diesel']=(groups['Diesel']||0)+fuelTrips.reduce((s,t)=>s+Number(t.fuel_cost||0),0);
  const max=Math.max(1,...Object.values(groups));
  $('financeBreakdown').innerHTML=Object.entries(groups).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="finance-row"><div><b>${esc(k)}</b><div class="finance-bar"><span style="width:${Math.round(v/max*100)}%"></span></div></div><div>€${v.toFixed(2)}</div></div>`).join('')||'<span class="small">Geen kosten in dit filter.</span>';

  const months={};
  regular.forEach(c=>{const m=String(c.expense_date||'').slice(0,7);if(m)months[m]=(months[m]||0)+Number(c.amount||0)});
  fuelTrips.forEach(t=>{const m=String(t.trip_date||'').slice(0,7);if(m)months[m]=(months[m]||0)+Number(t.fuel_cost||0)});
  $('financeMonths').innerHTML=Object.entries(months).sort().map(([m,v])=>`<div class="finance-row"><div>${m}</div><div>€${v.toFixed(2)}</div></div>`).join('')||'<span class="small">Geen maandgegevens.</span>';
}
function setPoiPickerLocation(lat,lon,move=true){
  poiPickerSelection={lat:Number(lat),lon:Number(lon)};
  if(poiPickerMarker)poiPickerMarker.setLatLng([lat,lon]);
  else poiPickerMarker=L.marker([lat,lon]).addTo(poiPickerMap);
  $('pickerCoordinates').textContent=`Breedtegraad ${Number(lat).toFixed(6)} · Lengtegraad ${Number(lon).toFixed(6)}`;
  if(move)poiPickerMap.panTo([lat,lon]);
}
function confirmPoiMapSelection(){
  if(!poiPickerSelection)return alert('Tik eerst op een plek op de kaart.');
  $('poiLatitude').value=poiPickerSelection.lat.toFixed(6);
  $('poiLongitude').value=poiPickerSelection.lon.toFixed(6);
  closePoiMapPicker();
}
function closePoiMapPicker(){
  $('poiMapPicker').classList.add('hidden');
  document.body.style.overflow='';
}

function initMap(){
  if(mapInstance){
    renderPoiMarkers();
    setTimeout(()=>{
      mapInstance.invalidateSize({pan:false});
      fitPoiMarkers(false);
    },120);
    return;
  }

  mapInstance=L.map('mapCanvas',{
    preferCanvas:true,
    tap:false
  }).setView([52.5,5.75],7);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'&copy; OpenStreetMap',
    keepBuffer:4
  }).addTo(mapInstance);

  poiLayer=L.layerGroup().addTo(mapInstance);
  renderPoiMarkers();

  setTimeout(()=>{
    mapInstance.invalidateSize({pan:false});
    fitPoiMarkers(false);
  },180);
}

function normalisePoiCoordinate(value,maximum){
  const number=Number(value);
  return Number.isFinite(number)&&Math.abs(number)<=maximum?number:null;
}

function hasPoiLocation(poi){
  return normalisePoiCoordinate(poi?.latitude,90)!==null&&
    normalisePoiCoordinate(poi?.longitude,180)!==null;
}

function isFavoritePoi(poi){
  return poi?.is_favorite===true||
    poi?.is_favorite===1||
    poi?.is_favorite==='true'||
    poi?.is_favorite==='1';
}

function poiMarkerIcon(poi){
  const favorite=isFavoritePoi(poi);
  return L.divIcon({
    className:'poi-marker-shell',
    html:favorite
      ?'<div class="poi-map-marker favorite" aria-label="Favoriet">★</div>'
      :'<div class="poi-map-marker normal" aria-label="POI"><span></span></div>',
    iconSize:favorite?[38,38]:[30,38],
    iconAnchor:favorite?[19,19]:[15,36],
    popupAnchor:[0,favorite?-18:-32]
  });
}

function updatePoiMapStatus(visiblePois){
  const status=$('poiMapStatus');
  const button=$('favoritesMapButton');
  if(!status)return;

  const allFavorites=poiCache.filter(isFavoritePoi);
  const favoritesWithLocation=allFavorites.filter(hasPoiLocation);
  const favoritesWithoutLocation=allFavorites.length-favoritesWithLocation.length;
  const visibleWithLocation=visiblePois.filter(hasPoiLocation).length;

  if(button){
    button.classList.toggle('favorites-active',favoritesOnly);
    button.textContent=favoritesOnly
      ?'⭐ Favorieten zichtbaar'
      :'⭐ Alleen favorieten';
  }

  const parts=[];
  if(favoritesOnly){
    parts.push(`${favoritesWithLocation.length} favoriet${favoritesWithLocation.length===1?'':'en'} op de kaart`);
  }else{
    parts.push(`${visibleWithLocation} POI${visibleWithLocation===1?'':'’s'} op de kaart`);
    if(favoritesWithLocation.length){
      parts.push(`${favoritesWithLocation.length} met gouden ster`);
    }
  }
  if(favoritesWithoutLocation){
    parts.push(`${favoritesWithoutLocation} favoriet${favoritesWithoutLocation===1?' heeft':'en hebben'} nog geen kaartlocatie`);
  }

  status.textContent=parts.join(' · ');
  status.classList.toggle('warning',favoritesWithoutLocation>0);
}

function renderPoiMarkers(){
  if(!mapInstance||!poiLayer)return;

  poiLayer.clearLayers();
  const visiblePois=poiCache.filter(poi=>!favoritesOnly||isFavoritePoi(poi));

  visiblePois.forEach(poi=>{
    const lat=normalisePoiCoordinate(poi.latitude,90);
    const lon=normalisePoiCoordinate(poi.longitude,180);
    if(lat===null||lon===null)return;

    const favorite=isFavoritePoi(poi);
    const marker=L.marker([lat,lon],{
      icon:poiMarkerIcon(poi),
      zIndexOffset:favorite?1000:0,
      riseOnHover:true
    }).addTo(poiLayer);

    marker.bindPopup(`
      <div class="map-popup">
        <h3>${favorite?'⭐ ':''}${esc(poi.name||'POI')}</h3>
        <p>${esc(poi.category||'')}${poi.place?` · ${esc(poi.place)}`:''}</p>
        ${poi.address?`<p>📍 ${esc(poi.address)}</p>`:''}
        ${poi.review?`<p>${esc(poi.review)}</p>`:''}
        ${favorite?'<p><b>Favoriet</b></p>':''}
        <div class="map-popup-actions">
          <button onclick="openPoiRouteInWaterkaarten('${poi.id}')">🧭 Route in Waterkaarten</button>
          <button class="secondary" onclick="showPoiDetails('${poi.id}')">Meer info</button>
        </div>
      </div>
    `);
  });

  updatePoiMapStatus(visiblePois);
}


function getPoiById(id){
  return poiCache.find(poi=>String(poi.id)===String(id))||null;
}

function showAppToast(message,duration=2600){
  const toast=$('appToast');
  if(!toast)return;
  toast.textContent=message;
  toast.classList.remove('hidden');
  clearTimeout(showAppToast.timer);
  showAppToast.timer=setTimeout(()=>toast.classList.add('hidden'),duration);
}

async function copyPoiDestination(poi){
  const lat=normalisePoiCoordinate(poi?.latitude,90);
  const lon=normalisePoiCoordinate(poi?.longitude,180);
  const destination=[
    poi?.name||'Bestemming',
    poi?.address||poi?.place||'',
    lat!==null&&lon!==null?`${lat.toFixed(6)}, ${lon.toFixed(6)}`:''
  ].filter(Boolean).join(' · ');

  try{
    await navigator.clipboard.writeText(destination);
    return true;
  }catch(error){
    console.warn('Bestemming kopiëren mislukt:',error);
    return false;
  }
}

async function openPoiRouteInWaterkaarten(id){
  const poi=getPoiById(id);
  if(!poi)return alert('Deze POI kon niet worden gevonden.');
  if(!hasPoiLocation(poi))return alert('Deze favoriet heeft nog geen kaartlocatie.');

  mapInstance?.closePopup();

  const copied=await copyPoiDestination(poi);
  showAppToast(
    copied
      ?`${poi.name||'Bestemming'} gekopieerd. Waterkaarten wordt geopend.`
      :'Waterkaarten wordt geopend.'
  );

  setTimeout(()=>openWaterkaarten(),220);
}

function showPoiDetails(id){
  const poi=getPoiById(id);
  if(!poi)return;

  mapInstance?.closePopup();

  const favorite=isFavoritePoi(poi);
  const photos=(poiPhotoCache?.[poi.id]||[]);
  const stars='★★★★★'.slice(0,Math.max(0,Math.min(5,Number(poi.rating)||0)));
  const photoHtml=photos.length
    ?`<div class="poi-detail-photos">${photos.map(photo=>
      `<img src="${esc(photo.url)}" alt="Foto van ${esc(poi.name||'POI')}" onclick="openLightbox(${JSON.stringify(photo.url)})">`
    ).join('')}</div>`
    :'';

  $('poiDetailContent').innerHTML=`
    <div class="poi-detail-heading">
      <span class="poi-detail-icon">${favorite?'⭐':'📍'}</span>
      <div>
        <h2>${esc(poi.name||'POI')}</h2>
        <p>${esc(poi.category||'')}${poi.place?` · ${esc(poi.place)}`:''}</p>
      </div>
    </div>
    ${poi.address?`<div class="poi-detail-line"><b>Adres</b><span>${esc(poi.address)}</span></div>`:''}
    ${stars?`<div class="poi-detail-line"><b>Beoordeling</b><span>${stars}</span></div>`:''}
    ${poi.review?`<div class="poi-detail-review">${esc(poi.review)}</div>`:''}
    ${photoHtml}
    <div class="poi-detail-actions">
      <button onclick="openPoiRouteInWaterkaarten('${poi.id}')">🧭 Route in Waterkaarten</button>
      <button class="secondary" onclick='closePoiDetails();editPoi(
        ${JSON.stringify(poi.id)},
        ${JSON.stringify(poi.name)},
        ${JSON.stringify(poi.category)},
        ${JSON.stringify(poi.place)},
        ${JSON.stringify(poi.address)},
        ${JSON.stringify(poi.rating)},
        ${JSON.stringify(poi.review)},
        ${JSON.stringify(favorite)},
        ${JSON.stringify(poi.latitude)},
        ${JSON.stringify(poi.longitude)}
      );captainNavigate("pois")'>✏️ Bewerken</button>
    </div>
  `;

  $('poiDetailModal').classList.remove('hidden');
  document.body.style.overflow='hidden';
}

function closePoiDetails(event){
  if(event&&event.target!==$('poiDetailModal'))return;
  $('poiDetailModal')?.classList.add('hidden');
  document.body.style.overflow='';
}

function getVisiblePoiCoordinates(){
  return poiCache
    .filter(poi=>!favoritesOnly||isFavoritePoi(poi))
    .filter(hasPoiLocation)
    .map(poi=>[
      normalisePoiCoordinate(poi.latitude,90),
      normalisePoiCoordinate(poi.longitude,180)
    ]);
}

function fitPoiMarkers(showEmptyMessage=true){
  if(!mapInstance)initMap();
  const points=getVisiblePoiCoordinates();

  if(points.length===1){
    mapInstance.setView(points[0],14);
  }else if(points.length>1){
    mapInstance.fitBounds(points,{padding:[34,34],maxZoom:14});
  }else if(showEmptyMessage){
    alert(favoritesOnly
      ?'Er zijn nog geen favorieten met een kaartlocatie.'
      :'Er zijn nog geen POI’s met een kaartlocatie.');
  }
}

function showAllPoiMarkers(){
  favoritesOnly=false;
  renderPoiMarkers();
  fitPoiMarkers();
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
  const id=$('tripId').value.trim();
  const row={
    boat_id:currentBoat.id,
    created_by:currentUser.id,
    trip_date:$('tripDate').value,
    title:$('tripTitle').value.trim()||`${$('tripFrom').value.trim()} naar ${$('tripTo').value.trim()}`,
    departure:$('tripFrom').value.trim(),
    arrival:$('tripTo').value.trim(),
    distance_km:Number($('tripDistance').value)||null,
    duration_hours:Number($('tripHours').value)||null,
    crew:$('tripCrew').value.trim(),
    notes:$('tripNotes').value.trim(),fuel_liters:Number($('tripFuelLiters').value)||null,fuel_cost:Number($('tripFuelCost').value)||null,
    updated_at:new Date().toISOString()
  };
  setTripProgress(id?'Vaartocht bijwerken…':'Vaartocht opslaan…');
  let tripId=id;
  if(id){
    const {error}=await sb.from('trips').update({
      trip_date:row.trip_date,title:row.title,departure:row.departure,arrival:row.arrival,
      distance_km:row.distance_km,duration_hours:row.duration_hours,crew:row.crew,
      notes:row.notes,fuel_liters:row.fuel_liters,fuel_cost:row.fuel_cost,updated_at:row.updated_at
    }).eq('id',id);
    if(error){setTripProgress('');return alert(error.message)}
  }else{
    const {data,error}=await sb.from('trips').insert(row).select('id').single();
    if(error){setTripProgress('');return alert(error.message)}
    tripId=data.id;
  }
  if(!row.fuel_liters&&row.duration_hours&&settingsCache?.fuel_per_hour)row.fuel_liters=Number(row.duration_hours)*Number(settingsCache.fuel_per_hour);if(!row.fuel_cost&&row.fuel_liters&&settingsCache?.fuel_price)row.fuel_cost=Number(row.fuel_liters)*Number(settingsCache.fuel_price);await sb.from('trips').update({fuel_liters:row.fuel_liters,fuel_cost:row.fuel_cost}).eq('id',tripId);const routeFile=$('tripGpx').files[0];
  if(routeFile){
    setTripProgress('Route uit Waterkaarten verwerken…');

    let routeGeojson;
    try{
      routeGeojson=await parseRouteFile(routeFile);
    }catch(error){
      setTripProgress('');
      return alert('Routebestand kon niet worden gelezen: '+(error?.message||'onbekende fout'));
    }

    if(!routeGeojson){
      setTripProgress('');
      return alert('Dit bestand bevat geen bruikbare GPX-, KML- of KMZ-route.');
    }

    const safeName=(routeFile.name||'waterkaarten-route').replace(/[^a-zA-Z0-9._-]/g,'_');
    const routePath=`${currentBoat.id}/${tripId}/${Date.now()}-${safeName}`;
    const contentType=getRouteContentType(routeFile);

    const {error:routeUploadError}=await sb.storage
      .from(TRIP_GPX_BUCKET)
      .upload(routePath,routeFile,{
        upsert:true,
        contentType
      });

    if(routeUploadError){
      setTripProgress('');
      return alert('Route uploaden mislukt: '+routeUploadError.message);
    }

    const {error:routeDbError}=await sb.from('trips').update({
      gpx_storage_path:routePath,
      route_geojson:routeGeojson,
      updated_at:new Date().toISOString()
    }).eq('id',tripId);

    if(routeDbError){
      setTripProgress('');
      return alert('Route opslaan mislukt: '+routeDbError.message);
    }
  }
  const files=[...$('tripPhotos').files].slice(0,10);
  if(files.length)await uploadTripPhotos(tripId,files);
  clearTripForm();
  await loadTrips();
}

function setTripProgress(text){
  $('tripProgress').textContent=text;
  $('tripProgress').classList.toggle('hidden',!text);
}
function clearTripForm(){
  ['tripId','tripTitle','tripFrom','tripTo','tripDistance','tripHours','tripFuelLiters','tripFuelCost','tripCrew','tripNotes'].forEach(id=>$(id).value='');
  $('tripPhotos').value='';$('tripGpx').value='';
  $('tripDate').value=new Date().toISOString().slice(0,10);
  $('tripFormTitle').textContent='Nieuwe vaartocht';
  $('tripSaveButton').textContent='Vaartocht opslaan';
  $('tripCancelButton').classList.add('hidden');
  setTripProgress('');
}
function cancelTripEdit(){clearTripForm()}
function editTrip(id,tripDate,title,departure,arrival,distance,hours,fuelLiters,fuelCost,crew,notes){
  $('tripId').value=id;
  $('tripDate').value=tripDate||'';
  $('tripTitle').value=title||'';
  $('tripFrom').value=departure||'';
  $('tripTo').value=arrival||'';
  $('tripDistance').value=distance??'';
  $('tripHours').value=hours??'';$('tripFuelLiters').value=fuelLiters??'';$('tripFuelCost').value=fuelCost??'';
  $('tripCrew').value=crew||'';
  $('tripNotes').value=notes||'';
  $('tripFormTitle').textContent='Vaartocht bewerken';$('tripFormWrap').classList.remove('hidden');document.querySelector('[onclick*=\"tripFormWrap\"]')?.classList.add('open');
  $('tripSaveButton').textContent='Wijzigingen opslaan';
  $('tripCancelButton').classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
}
async function uploadTripPhotos(tripId,files){
  for(let i=0;i<files.length;i++){
    const file=files[i];
    setTripProgress(`Foto ${i+1} van ${files.length} uploaden…`);
    const safeExt=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
    const path=`${currentBoat.id}/${tripId}/${crypto.randomUUID()}.${safeExt}`;
    const {error:uploadError}=await sb.storage.from(TRIP_PHOTO_BUCKET).upload(path,file,{
      cacheControl:'3600',upsert:false,contentType:file.type||'image/jpeg'
    });
    if(uploadError){alert('Foto uploaden mislukt: '+uploadError.message);continue}
    const {error:metaError}=await sb.from('trip_photos').insert({
      trip_id:tripId,boat_id:currentBoat.id,created_by:currentUser.id,
      storage_path:path,original_name:file.name
    });
    if(metaError){
      await sb.storage.from(TRIP_PHOTO_BUCKET).remove([path]);
      alert('Foto registreren mislukt: '+metaError.message);
    }
  }
}
async function deleteTripPhoto(id,path){
  if(!confirm('Foto verwijderen?'))return;
  const {error:storageError}=await sb.storage.from(TRIP_PHOTO_BUCKET).remove([path]);
  if(storageError)return alert(storageError.message);
  const {error}=await sb.from('trip_photos').delete().eq('id',id);
  if(error)alert(error.message);
}
async function loadTripPhotos(){
  const {data,error}=await sb.from('trip_photos').select('*').eq('boat_id',currentBoat.id).order('created_at',{ascending:true});
  if(error){console.error(error);return {}}
  const grouped={};
  for(const photo of data){
    const {data:signed,error:signedError}=await sb.storage.from(TRIP_PHOTO_BUCKET).createSignedUrl(photo.storage_path,3600);
    if(signedError)continue;
    (grouped[photo.trip_id]??=[]).push({...photo,url:signed.signedUrl});
  }
  return grouped;
}

async function deleteTrip(id){
  const trip=tripCache.find(item=>String(item.id)===String(id));
  const title=trip?.title||'deze vaartocht';

  if(!confirm(`Log "${title}" definitief verwijderen?

De route en alle gekoppelde foto's worden ook verwijderd.`))return;

  const details=document.querySelector(`[data-trip-id="${id}"]`);
  if(details){
    details.classList.add('is-deleting');
    details.style.pointerEvents='none';
  }

  try{
    const {data:photos,error:photoReadError}=await sb
      .from('trip_photos')
      .select('id,storage_path')
      .eq('trip_id',id);

    if(photoReadError)throw photoReadError;

    const storagePaths=(photos||[])
      .map(photo=>photo.storage_path)
      .filter(Boolean);

    if(storagePaths.length){
      const {error:storageError}=await sb.storage
        .from(TRIP_PHOTO_BUCKET)
        .remove(storagePaths);

      if(storageError)console.warn('Foto-opslag kon niet volledig worden opgeschoond:',storageError);
    }

    if(trip?.gpx_storage_path){
      const {error:routeStorageError}=await sb.storage
        .from(TRIP_GPX_BUCKET)
        .remove([trip.gpx_storage_path]);

      if(routeStorageError)console.warn('Routebestand kon niet volledig worden opgeschoond:',routeStorageError);
    }

    const {error:photoDeleteError}=await sb
      .from('trip_photos')
      .delete()
      .eq('trip_id',id);

    if(photoDeleteError)throw photoDeleteError;

    const {error:tripDeleteError}=await sb
      .from('trips')
      .delete()
      .eq('id',id)
      .eq('boat_id',currentBoat.id);

    if(tripDeleteError)throw tripDeleteError;

    destroyRouteMap(`tripRouteMap-${id}`);
    tripCache=tripCache.filter(item=>String(item.id)!==String(id));
    if(window.tripPhotoCache)delete window.tripPhotoCache[id];

    renderTripList();
    renderFinance();
    updateLatestRouteDashboard();
    if($('dTrips'))$('dTrips').textContent=tripCache.length;

    alert('Log verwijderd.');
  }catch(error){
    console.error('Log verwijderen mislukt:',error);
    alert('Log verwijderen mislukt: '+(error?.message||'onbekende fout'));
    if(details){
      details.classList.remove('is-deleting');
      details.style.pointerEvents='';
    }
  }
}
async function loadTrips(){
  if(!currentBoat)return;
  const [{data,error},photos]=await Promise.all([
    sb.from('trips').select('*').eq('boat_id',currentBoat.id).order('trip_date',{ascending:false}),
    loadTripPhotos()
  ]);
  if(error){console.error(error);return}
  tripCache=data;
  window.tripPhotoCache=photos;
  $('dTrips').textContent=data.length;
  renderTripList();
  renderFinance();
  updateLatestRouteDashboard();
}



function updateLatestRouteDashboard(){
  const card=$('latestRouteCard');
  if(!card)return;

  const latest=tripCache.find(t=>normaliseRouteGeojson(t.route_geojson));
  if(!latest){
    card.classList.add('hidden');
    destroyRouteMap('latestRouteMap');
    return;
  }

  card.classList.remove('hidden');
  $('latestRouteTitle').textContent=latest.title||'Laatste vaartocht';
  $('latestRouteMeta').textContent=[
    latest.trip_date||'',
    latest.departure&&latest.arrival?`${latest.departure} → ${latest.arrival}`:'',
    latest.distance_km?`${latest.distance_km} km`:''
  ].filter(Boolean).join(' · ');

  setTimeout(()=>{
    renderTripRouteMap('latestRouteMap',latest.route_geojson,{dashboard:true});
  },120);
}


const WATERKAARTEN_URL='https://mijn.waterkaarten.app/';
const WATERKAARTEN_APPSTORE_URL='https://apps.apple.com/nl/app/waterkaarten-vaar-navigatie/id421372355';
const WATERKAARTEN_SHORTCUT_NAME='Open Waterkaarten';
const WATERKAARTEN_SHORTCUT_URL=
  'shortcuts://run-shortcut?name='+encodeURIComponent(WATERKAARTEN_SHORTCUT_NAME);

function isAppleMobile(){
  return /iPad|iPhone|iPod/.test(navigator.userAgent)||
    (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
}

function xmlEscape(value){
  return String(value??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&apos;");
}

function tripToGpxFile(trip){
  const route=normaliseRouteGeojson(trip?.route_geojson);
  if(!route)return null;

  const trackPoints=route.coordinates.map(([lon,lat])=>
    `<trkpt lat="${Number(lat).toFixed(7)}" lon="${Number(lon).toFixed(7)}"></trkpt>`
  ).join('');

  const title=trip?.title||'Waterkaarten route';
  const gpx=`<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1"
  creator="MijnSerenity"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${xmlEscape(title)}</name>
    ${trip?.trip_date?`<time>${xmlEscape(trip.trip_date)}T00:00:00Z</time>`:''}
  </metadata>
  <trk>
    <name>${xmlEscape(title)}</name>
    <trkseg>${trackPoints}</trkseg>
  </trk>
</gpx>`;

  const safeName=String(title)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9_-]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,60)||'MijnSerenity-route';

  return new File([gpx],`${safeName}.gpx`,{type:'application/gpx+xml'});
}

function downloadRouteFile(file){
  const url=URL.createObjectURL(file);
  const link=document.createElement('a');
  link.href=url;
  link.download=file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

function openTripInWaterkaarten(tripId){
  const trip=tripCache.find(item=>String(item.id)===String(tripId));
  const file=tripToGpxFile(trip);

  if(!file){
    alert('Bij deze vaartocht staat geen route.');
    return;
  }

  if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
    navigator.share({
      files:[file],
      title:trip?.title||'MijnSerenity-route',
      text:'Open deze route met de Waterkaarten-app.'
    }).catch(error=>{
      if(error?.name!=='AbortError'){
        console.error('Delen naar Waterkaarten mislukt:',error);
        downloadRouteFile(file);
        alert('De route is gedownload. Tik op Deel en kies Waterkaarten.');
      }
    });
    return;
  }

  downloadRouteFile(file);
  alert('De route is gedownload. Tik op Deel en kies Waterkaarten.');
}

function openWaterkaarten(){
  if(isAppleMobile()){
    window.location.href=WATERKAARTEN_SHORTCUT_URL;
    return;
  }

  const opened=window.open(WATERKAARTEN_URL,'_blank','noopener,noreferrer');
  if(!opened)window.location.href=WATERKAARTEN_URL;
}

function captainNavigate(id, sourceButton=null){
  const desktopButtons=[...document.querySelectorAll('.tab')];
  const map={dashboard:0,live:1,map:2,pois:3,logbook:4,costs:5,finance:6,settings:7,boat:8};
  const desktopButton=desktopButtons[map[id]];

  if(typeof showTab==='function' && desktopButton){
    showTab(id,desktopButton);
  }else{
    document.querySelectorAll('#appView > section').forEach(section=>section.classList.add('hidden'));
    document.getElementById(id)?.classList.remove('hidden');
  }

  document.querySelectorAll('.bottom-nav-item').forEach(button=>{
    button.classList.toggle('active',button.dataset.target===id);
  });

  if(id==='live' && typeof initLiveMode==='function')setTimeout(()=>initLiveMode(),80);
  if(id==='map' && typeof initMap==='function')setTimeout(()=>initMap(),80);
  if(id==='dashboard' && typeof updateLatestRouteDashboard==='function')setTimeout(()=>updateLatestRouteDashboard(),80);
  if(id==='finance' && typeof renderFinance==='function')renderFinance();
  if(id==='settings' && typeof loadSettingsForm==='function')loadSettingsForm();
}

(async()=>{const {data:{session}}=await sb.auth.getSession();await initialise(session)})();





/* Cloud 5.1 — Live Vaarmodus */
const LIVE_STORAGE_PREFIX='mijnserenity-live-v1-';
let liveNavState=createEmptyLiveState();
let liveWatchId=null;
let liveTimerId=null;
let liveMap=null;
let liveRouteLine=null;
let liveStartMarker=null;
let livePositionMarker=null;
let liveWakeLock=null;
let liveStateRestored=false;

function createEmptyLiveState(){
  return {
    status:'idle',
    startedAt:null,
    segmentStartedAt:null,
    accumulatedMs:0,
    points:[],
    distanceKm:0,
    speedKmh:0,
    accuracy:null,
    follow:true
  };
}

function localDateISO(date=new Date()){
  const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,10);
}

function liveStorageKey(){
  return LIVE_STORAGE_PREFIX+(currentBoat?.id||'geen-boot');
}

function persistLiveState(){
  if(!currentBoat)return;
  try{
    localStorage.setItem(liveStorageKey(),JSON.stringify(liveNavState));
  }catch(error){
    console.warn('Live opname kon niet lokaal worden bewaard:',error);
  }
}

function restoreLiveState(){
  if(liveStateRestored||!currentBoat)return;
  liveStateRestored=true;

  try{
    const saved=JSON.parse(localStorage.getItem(liveStorageKey())||'null');
    if(!saved||!Array.isArray(saved.points))return;

    liveNavState={
      ...createEmptyLiveState(),
      ...saved,
      points:saved.points.filter(point=>
        Number.isFinite(Number(point.lat))&&
        Number.isFinite(Number(point.lon))&&
        Number.isFinite(Number(point.time))
      )
    };

    if(liveNavState.status==='active'){
      liveNavState.status='paused';
      liveNavState.segmentStartedAt=null;
      $('liveGpsStatus').textContent='Opname hersteld. Tik op Hervat om GPS weer te starten.';
    }

    fillLiveTripDefaults(false);
  }catch(error){
    console.warn('Live opname herstellen mislukt:',error);
  }
}

function initLiveMode(){
  if(!currentBoat){
    alert('Koppel eerst Serenity.');
    captainNavigate('boat');
    return;
  }

  restoreLiveState();
  fillLiveTripDefaults(false);
  ensureLiveMap();
  renderLiveState();

  setTimeout(()=>{
    liveMap?.invalidateSize({pan:false});
    renderLiveRoute();
  },160);
}

function fillLiveTripDefaults(force=false){
  const startDate=liveNavState.startedAt?new Date(liveNavState.startedAt):new Date();
  if(force||!$('liveTitle')?.value){
    const date=startDate.toLocaleDateString('nl-NL');
    $('liveTitle').value=`Live vaartocht ${date}`;
  }
}

function ensureLiveMap(){
  const canvas=$('liveMapCanvas');
  if(!canvas||liveMap)return;

  liveMap=L.map(canvas,{
    zoomControl:true,
    attributionControl:true,
    preferCanvas:true,
    tap:false
  }).setView([52.22,6.89],10);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    minZoom:3,
    attribution:'&copy; OpenStreetMap',
    keepBuffer:4
  }).addTo(liveMap);

  renderLiveRoute();
}

function renderLiveRoute(){
  if(!liveMap)return;

  if(liveRouteLine){
    liveRouteLine.remove();
    liveRouteLine=null;
  }
  if(liveStartMarker){
    liveStartMarker.remove();
    liveStartMarker=null;
  }
  if(livePositionMarker){
    livePositionMarker.remove();
    livePositionMarker=null;
  }

  const latlngs=liveNavState.points.map(point=>[Number(point.lat),Number(point.lon)]);
  if(!latlngs.length)return;

  if(latlngs.length>=2){
    liveRouteLine=L.polyline(latlngs,{
      weight:6,
      opacity:.95,
      lineCap:'round',
      lineJoin:'round'
    }).addTo(liveMap);
  }

  liveStartMarker=L.circleMarker(latlngs[0],{
    radius:7,
    weight:3,
    fillOpacity:1
  }).addTo(liveMap).bindTooltip('Start');

  const current=latlngs[latlngs.length-1];
  livePositionMarker=L.circleMarker(current,{
    radius:10,
    weight:4,
    fillOpacity:1
  }).addTo(liveMap).bindTooltip('Serenity');

  if(liveNavState.follow){
    liveMap.setView(current,Math.max(liveMap.getZoom(),15),{animate:true});
  }else if(liveRouteLine){
    liveMap.fitBounds(liveRouteLine.getBounds(),{padding:[28,28],maxZoom:16});
  }
}

function centerLiveMap(){
  liveNavState.follow=true;
  const last=liveNavState.points.at(-1);
  if(last&&liveMap)liveMap.setView([last.lat,last.lon],16,{animate:true});
  persistLiveState();
}

function getLiveElapsedMs(){
  let elapsed=Number(liveNavState.accumulatedMs)||0;
  if(liveNavState.status==='active'&&liveNavState.segmentStartedAt){
    elapsed+=Math.max(0,Date.now()-Number(liveNavState.segmentStartedAt));
  }
  return elapsed;
}

function formatLiveDuration(milliseconds){
  const total=Math.max(0,Math.floor(milliseconds/1000));
  const hours=String(Math.floor(total/3600)).padStart(2,'0');
  const minutes=String(Math.floor((total%3600)/60)).padStart(2,'0');
  const seconds=String(total%60).padStart(2,'0');
  return `${hours}:${minutes}:${seconds}`;
}

function formatDecimal(value,digits=1){
  return Number(value||0).toLocaleString('nl-NL',{
    minimumFractionDigits:digits,
    maximumFractionDigits:digits
  });
}

function renderLiveState(){
  const elapsedMs=getLiveElapsedMs();
  const elapsedHours=elapsedMs/3600000;
  const average=elapsedHours>0?liveNavState.distanceKm/elapsedHours:0;
  const status=liveNavState.status;

  $('liveSpeedKmh').textContent=formatDecimal(liveNavState.speedKmh,1);
  $('liveSpeedKnots').textContent=formatDecimal(liveNavState.speedKmh/1.852,1);
  $('liveDistance').textContent=formatDecimal(liveNavState.distanceKm,2);
  $('liveDuration').textContent=formatLiveDuration(elapsedMs);
  $('liveAverage').textContent=formatDecimal(average,1);
  $('liveAccuracy').textContent=Number.isFinite(Number(liveNavState.accuracy))
    ?`${Math.round(liveNavState.accuracy)} m`
    :'–';

  const badge=$('liveRecordingBadge');
  badge.className='live-recording-badge '+status;
  badge.textContent={
    idle:'Gereed',
    active:'● Opname actief',
    paused:'Gepauzeerd',
    stopped:'Opname klaar'
  }[status]||'Gereed';

  $('liveStartButton').classList.toggle('hidden',status!=='idle');
  $('livePauseButton').classList.toggle('hidden',status!=='active');
  $('liveResumeButton').classList.toggle('hidden',status!=='paused');
  $('liveStopButton').classList.toggle('hidden',!['active','paused'].includes(status));
  $('liveSaveButton').classList.toggle('hidden',status!=='stopped'||liveNavState.points.length<2);
  $('liveDiscardButton').classList.toggle('hidden',status==='idle');

  if(status==='active'&&!liveTimerId){
    liveTimerId=setInterval(renderLiveState,1000);
  }else if(status!=='active'&&liveTimerId){
    clearInterval(liveTimerId);
    liveTimerId=null;
  }
}

async function requestLiveWakeLock(){
  if(!('wakeLock' in navigator))return;
  try{
    liveWakeLock=await navigator.wakeLock.request('screen');
  }catch(error){
    console.warn('Scherm actief houden wordt niet ondersteund:',error);
  }
}

async function releaseLiveWakeLock(){
  try{
    await liveWakeLock?.release();
  }catch(error){}
  liveWakeLock=null;
}

function startLiveNavigation(){
  if(!navigator.geolocation){
    alert('Dit apparaat ondersteunt geen GPS-locatie.');
    return;
  }
  if(!currentBoat){
    alert('Koppel eerst Serenity.');
    return;
  }

  liveNavState=createEmptyLiveState();
  liveNavState.status='active';
  liveNavState.startedAt=Date.now();
  liveNavState.segmentStartedAt=Date.now();
  fillLiveTripDefaults(true);
  $('liveSaveStatus').classList.add('hidden');
  $('liveGpsStatus').textContent='GPS-signaal zoeken…';

  persistLiveState();
  startLiveGpsWatch();
  requestLiveWakeLock();
  renderLiveState();
}

function resumeLiveNavigation(){
  if(liveNavState.status!=='paused')return;

  liveNavState.status='active';
  liveNavState.segmentStartedAt=Date.now();
  $('liveGpsStatus').textContent='GPS-signaal zoeken…';
  persistLiveState();
  startLiveGpsWatch();
  requestLiveWakeLock();
  renderLiveState();
}

function pauseLiveNavigation(){
  if(liveNavState.status!=='active')return;

  liveNavState.accumulatedMs=getLiveElapsedMs();
  liveNavState.segmentStartedAt=null;
  liveNavState.status='paused';
  liveNavState.speedKmh=0;
  stopLiveGpsWatch();
  releaseLiveWakeLock();
  $('liveGpsStatus').textContent='Opname gepauzeerd.';
  persistLiveState();
  renderLiveState();
}

function stopLiveNavigation(){
  if(liveNavState.status==='active'){
    liveNavState.accumulatedMs=getLiveElapsedMs();
  }
  liveNavState.segmentStartedAt=null;
  liveNavState.status='stopped';
  liveNavState.speedKmh=0;
  stopLiveGpsWatch();
  releaseLiveWakeLock();
  $('liveGpsStatus').textContent=liveNavState.points.length>=2
    ?'Opname gereed. Controleer de gegevens en sla de vaartocht op.'
    :'Te weinig GPS-punten. Laat de opname iets langer lopen.';
  persistLiveState();
  renderLiveState();
}

function stopLiveGpsWatch(){
  if(liveWatchId!==null){
    navigator.geolocation.clearWatch(liveWatchId);
    liveWatchId=null;
  }
}

function startLiveGpsWatch(){
  stopLiveGpsWatch();
  liveWatchId=navigator.geolocation.watchPosition(
    handleLivePosition,
    handleLivePositionError,
    {
      enableHighAccuracy:true,
      maximumAge:1500,
      timeout:20000
    }
  );
}

function handleLivePosition(position){
  if(liveNavState.status!=='active')return;

  const coords=position.coords;
  const point={
    lat:Number(coords.latitude),
    lon:Number(coords.longitude),
    time:Number(position.timestamp)||Date.now(),
    accuracy:Number(coords.accuracy)||null,
    speed:Number.isFinite(coords.speed)?Math.max(0,coords.speed*3.6):null
  };

  if(!Number.isFinite(point.lat)||!Number.isFinite(point.lon))return;

  liveNavState.accuracy=point.accuracy;

  const previous=liveNavState.points.at(-1);
  if(previous){
    const segmentKm=haversineKm(previous,point);
    const seconds=Math.max(1,(point.time-previous.time)/1000);
    const calculatedSpeed=segmentKm/(seconds/3600);

    if(point.accuracy>100){
      $('liveGpsStatus').textContent=`Zwak GPS-signaal (${Math.round(point.accuracy)} m). Punt overgeslagen.`;
      renderLiveState();
      return;
    }

    if(calculatedSpeed>80||segmentKm>2){
      $('liveGpsStatus').textContent='Onwaarschijnlijke GPS-sprong overgeslagen.';
      renderLiveState();
      return;
    }

    liveNavState.speedKmh=Number.isFinite(point.speed)?point.speed:calculatedSpeed;

    // Voorkomt GPS-dwarrelen wanneer Serenity vrijwel stil ligt.
    if(segmentKm<0.004&&seconds<12){
      $('liveGpsStatus').textContent=`GPS actief · nauwkeurigheid ${Math.round(point.accuracy||0)} m`;
      renderLiveState();
      return;
    }

    liveNavState.distanceKm+=segmentKm;
  }else{
    liveNavState.speedKmh=Number.isFinite(point.speed)?point.speed:0;
  }

  liveNavState.points.push(point);
  if(liveNavState.points.length>20000){
    liveNavState.points=liveNavState.points.filter((_,index)=>index%2===0);
  }

  $('liveGpsStatus').textContent=`GPS actief · ${liveNavState.points.length} routepunten · nauwkeurigheid ${Math.round(point.accuracy||0)} m`;
  persistLiveState();
  renderLiveState();
  renderLiveRoute();
}

function handleLivePositionError(error){
  const messages={
    1:'Locatietoegang is geweigerd. Sta locatie toe in Safari-instellingen.',
    2:'GPS-positie is tijdelijk niet beschikbaar.',
    3:'Het ophalen van de GPS-positie duurde te lang.'
  };
  $('liveGpsStatus').textContent=messages[error.code]||('GPS-fout: '+error.message);
}

function haversineKm(a,b){
  const radius=6371;
  const toRad=value=>value*Math.PI/180;
  const dLat=toRad(Number(b.lat)-Number(a.lat));
  const dLon=toRad(Number(b.lon)-Number(a.lon));
  const lat1=toRad(Number(a.lat));
  const lat2=toRad(Number(b.lat));
  const h=Math.sin(dLat/2)**2+
    Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 2*radius*Math.asin(Math.min(1,Math.sqrt(h)));
}

function createLiveGpxFile(title){
  const points=liveNavState.points.map(point=>
    `<trkpt lat="${point.lat.toFixed(7)}" lon="${point.lon.toFixed(7)}">`+
    `<time>${new Date(point.time).toISOString()}</time></trkpt>`
  ).join('');

  const safeTitle=esc(title||'Live vaartocht');
  const gpx=`<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MijnSerenity"
 xmlns="http://www.topografix.com/GPX/1/1">
 <metadata><name>${safeTitle}</name></metadata>
 <trk><name>${safeTitle}</name><trkseg>${points}</trkseg></trk>
</gpx>`;

  const filename=String(title||'live-vaartocht')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9_-]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,60)||'live-vaartocht';

  return new File([gpx],`${filename}.gpx`,{type:'application/gpx+xml'});
}

async function saveLiveTrip(){
  if(!currentBoat||!currentUser)return alert('Log opnieuw in.');
  if(liveNavState.status!=='stopped'||liveNavState.points.length<2){
    return alert('Stop eerst de opname en zorg voor minimaal twee GPS-punten.');
  }

  const saveStatus=$('liveSaveStatus');
  saveStatus.textContent='Live vaartocht opslaan…';
  saveStatus.classList.remove('hidden');
  $('liveSaveButton').disabled=true;

  const durationHours=getLiveElapsedMs()/3600000;
  const title=$('liveTitle').value.trim()||`Live vaartocht ${localDateISO()}`;
  const fuelLiters=durationHours&&settingsCache?.fuel_per_hour
    ?durationHours*Number(settingsCache.fuel_per_hour)
    :null;
  const fuelCost=fuelLiters&&settingsCache?.fuel_price
    ?fuelLiters*Number(settingsCache.fuel_price)
    :null;

  const routeGeojson={
    type:'LineString',
    coordinates:liveNavState.points.map(point=>[
      Number(point.lon),
      Number(point.lat)
    ])
  };

  const row={
    boat_id:currentBoat.id,
    created_by:currentUser.id,
    trip_date:localDateISO(new Date(liveNavState.startedAt||Date.now())),
    title,
    departure:$('liveFrom').value.trim(),
    arrival:$('liveTo').value.trim(),
    distance_km:Number(liveNavState.distanceKm.toFixed(2)),
    duration_hours:Number(durationHours.toFixed(2)),
    crew:$('liveCrew').value.trim(),
    notes:[
      $('liveNotes').value.trim(),
      `Live opgenomen met MijnSerenity · ${liveNavState.points.length} GPS-punten`
    ].filter(Boolean).join('\n'),
    fuel_liters:fuelLiters?Number(fuelLiters.toFixed(2)):null,
    fuel_cost:fuelCost?Number(fuelCost.toFixed(2)):null,
    route_geojson:routeGeojson,
    updated_at:new Date().toISOString()
  };

  try{
    const {data,error}=await sb.from('trips').insert(row).select('id').single();
    if(error)throw error;

    const gpxFile=createLiveGpxFile(title);
    const routePath=`${currentBoat.id}/${data.id}/${Date.now()}-${gpxFile.name}`;
    const {error:uploadError}=await sb.storage
      .from(TRIP_GPX_BUCKET)
      .upload(routePath,gpxFile,{
        upsert:true,
        contentType:'application/gpx+xml'
      });

    if(!uploadError){
      await sb.from('trips')
        .update({gpx_storage_path:routePath})
        .eq('id',data.id);
    }else{
      console.warn('GPX-bestand uploaden mislukt; route staat wel in het logboek:',uploadError);
    }

    saveStatus.textContent='Vaartocht opgeslagen ✅';
    await loadTrips();
    clearLiveTrip();
    setTimeout(()=>captainNavigate('logbook'),500);
  }catch(error){
    console.error('Live vaartocht opslaan mislukt:',error);
    saveStatus.textContent='Opslaan mislukt: '+(error?.message||'onbekende fout');
  }finally{
    $('liveSaveButton').disabled=false;
  }
}

function discardLiveTrip(){
  if(!confirm('Deze live opname definitief wissen?'))return;
  clearLiveTrip();
}

function clearLiveTrip(){
  stopLiveGpsWatch();
  releaseLiveWakeLock();
  liveNavState=createEmptyLiveState();
  localStorage.removeItem(liveStorageKey());
  ['liveTitle','liveCrew','liveFrom','liveTo','liveNotes'].forEach(id=>{
    if($(id))$(id).value='';
  });
  $('liveSaveStatus').classList.add('hidden');
  $('liveGpsStatus').textContent='Tik op Start varen en geef toestemming voor je locatie.';
  fillLiveTripDefaults(true);
  renderLiveState();
  renderLiveRoute();
}

document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&liveNavState.status==='active'){
    requestLiveWakeLock();
  }
  persistLiveState();
});

window.addEventListener('beforeunload',persistLiveState);


const APP_VERSION='5.1.2';
let deferredInstallPrompt=null;
let waitingServiceWorker=null;

function isStandaloneApp(){
  return window.matchMedia('(display-mode: standalone)').matches||
    window.navigator.standalone===true;
}

function updateInstallTile(){
  const tile=$('installAppTile');
  if(!tile)return;

  if(isStandaloneApp()){
    tile.classList.add('installed');
    const title=tile.querySelector('b');
    const subtitle=tile.querySelector('small');
    if(title)title.textContent='App geïnstalleerd';
    if(subtitle)subtitle.textContent='MijnSerenity draait als app';
  }
}

function openInstallHelp(){
  $('installHelp')?.classList.remove('hidden');
  document.body.style.overflow='hidden';
}

function closeInstallHelp(event){
  if(event&&event.target!==$('installHelp'))return;
  $('installHelp')?.classList.add('hidden');
  document.body.style.overflow='';
}

async function installMijnSerenity(){
  if(isStandaloneApp()){
    alert('MijnSerenity staat al als app op dit apparaat.');
    return;
  }

  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt=null;
    updateInstallTile();
    return;
  }

  openInstallHelp();
}

function updateConnectionStatus(){
  const status=$('connectionStatus');
  if(!status)return;

  const online=navigator.onLine;
  status.textContent=online?'Online':'Offline';
  status.classList.toggle('online',online);
  status.classList.toggle('offline',!online);
}

function showAppUpdate(registration){
  waitingServiceWorker=registration.waiting;
  $('appUpdateBanner')?.classList.remove('hidden');
}

function applyAppUpdate(){
  if(waitingServiceWorker){
    waitingServiceWorker.postMessage({type:'SKIP_WAITING'});
  }else{
    window.location.reload();
  }
}

async function registerMijnSerenityServiceWorker(){
  if(!('serviceWorker' in navigator))return;

  try{
    const registration=await navigator.serviceWorker.register('/sw.js');

    if(registration.waiting)showAppUpdate(registration);

    registration.addEventListener('updatefound',()=>{
      const worker=registration.installing;
      if(!worker)return;

      worker.addEventListener('statechange',()=>{
        if(worker.state==='installed'&&navigator.serviceWorker.controller){
          showAppUpdate(registration);
        }
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      window.location.reload();
    });

    setInterval(()=>registration.update(),30*60*1000);
  }catch(error){
    console.warn('Service worker kon niet worden geregistreerd:',error);
  }
}

window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  deferredInstallPrompt=event;
  updateInstallTile();
});

window.addEventListener('appinstalled',()=>{
  deferredInstallPrompt=null;
  updateInstallTile();
});

window.addEventListener('online',updateConnectionStatus);
window.addEventListener('offline',updateConnectionStatus);

window.addEventListener('load',()=>{
  updateInstallTile();
  updateConnectionStatus();
  registerMijnSerenityServiceWorker();
});


function getRouteContentType(file){
  const name=(file?.name||'').toLowerCase();
  if(name.endsWith('.kmz'))return 'application/vnd.google-earth.kmz';
  if(name.endsWith('.kml'))return 'application/vnd.google-earth.kml+xml';
  return 'application/gpx+xml';
}

async function parseRouteFile(file){
  const name=(file?.name||'').toLowerCase();

  if(name.endsWith('.kmz')){
    if(typeof JSZip==='undefined')throw new Error('KMZ-module is niet geladen.');
    if(file.size>50*1024*1024)throw new Error('Het KMZ-bestand is groter dan 50 MB.');

    const zip=await JSZip.loadAsync(await file.arrayBuffer());
    const kmlFiles=Object.values(zip.files)
      .filter(entry=>!entry.dir&&entry.name.toLowerCase().endsWith('.kml'));

    if(!kmlFiles.length)throw new Error('In dit KMZ-bestand staat geen KML-route.');

    const preferred=kmlFiles.find(entry=>/(^|\/)doc\.kml$/i.test(entry.name))||kmlFiles[0];
    const kmlText=await preferred.async('text');
    return parseKmlToGeoJson(kmlText);
  }

  const text=await file.text();
  if(name.endsWith('.kml'))return parseKmlToGeoJson(text);
  return parseGpxToGeoJson(text);
}

function parseGpxToGeoJson(text){
  try{
    const doc=new DOMParser().parseFromString(text,'application/xml');
    if(doc.querySelector('parsererror'))return null;

    const segments=[];

    const tracks=[...doc.getElementsByTagNameNS('*','trkseg')];
    tracks.forEach(segment=>{
      const coords=[...segment.getElementsByTagNameNS('*','trkpt')]
        .map(point=>[
          Number(point.getAttribute('lon')),
          Number(point.getAttribute('lat'))
        ])
        .filter(isValidRouteCoordinate);
      if(coords.length>=2)segments.push(coords);
    });

    const routePoints=[...doc.getElementsByTagNameNS('*','rtept')]
      .map(point=>[
        Number(point.getAttribute('lon')),
        Number(point.getAttribute('lat'))
      ])
      .filter(isValidRouteCoordinate);

    if(routePoints.length>=2)segments.push(routePoints);

    if(!segments.length){
      const allTrackPoints=[...doc.getElementsByTagNameNS('*','trkpt')]
        .map(point=>[
          Number(point.getAttribute('lon')),
          Number(point.getAttribute('lat'))
        ])
        .filter(isValidRouteCoordinate);
      if(allTrackPoints.length>=2)segments.push(allTrackPoints);
    }

    return longestRouteSegment(segments);
  }catch(error){
    console.error('GPX lezen mislukt:',error);
    return null;
  }
}

function parseKmlToGeoJson(text){
  try{
    const doc=new DOMParser().parseFromString(text,'application/xml');
    if(doc.querySelector('parsererror'))return null;

    const segments=[];

    const lineStrings=[...doc.getElementsByTagNameNS('*','LineString')];
    lineStrings.forEach(line=>{
      const coordinateNodes=[...line.getElementsByTagNameNS('*','coordinates')];
      coordinateNodes.forEach(node=>{
        const coords=parseKmlCoordinateText(node.textContent||'');
        if(coords.length>=2)segments.push(coords);
      });
    });

    const tracks=[...doc.getElementsByTagNameNS('*','Track')];
    tracks.forEach(track=>{
      const coords=[...track.getElementsByTagNameNS('*','coord')]
        .map(node=>{
          const values=(node.textContent||'').trim().split(/\s+/).map(Number);
          return [values[0],values[1]];
        })
        .filter(isValidRouteCoordinate);
      if(coords.length>=2)segments.push(coords);
    });

    if(!segments.length){
      const coordinateNodes=[...doc.getElementsByTagNameNS('*','coordinates')];
      coordinateNodes.forEach(node=>{
        const coords=parseKmlCoordinateText(node.textContent||'');
        if(coords.length>=2)segments.push(coords);
      });
    }

    return longestRouteSegment(segments);
  }catch(error){
    console.error('KML/KMZ lezen mislukt:',error);
    return null;
  }
}

function parseKmlCoordinateText(text){
  return String(text)
    .trim()
    .split(/\s+/)
    .map(item=>{
      const values=item.split(',').map(Number);
      return [values[0],values[1]];
    })
    .filter(isValidRouteCoordinate);
}

function isValidRouteCoordinate([lon,lat]){
  return Number.isFinite(lon)&&Number.isFinite(lat)&&
    Math.abs(lon)<=180&&Math.abs(lat)<=90;
}

function longestRouteSegment(segments){
  const usable=(segments||[]).filter(segment=>Array.isArray(segment)&&segment.length>=2);
  if(!usable.length)return null;

  const longest=usable.sort((a,b)=>b.length-a.length)[0];
  return {type:'LineString',coordinates:longest};
}
function normaliseRouteGeojson(value){
  if(!value)return null;
  if(typeof value==='string'){
    try{value=JSON.parse(value)}catch(e){return null}
  }
  if(value.type==='Feature')value=value.geometry;
  if(value.type==='FeatureCollection'){
    const feature=value.features?.find(f=>f?.geometry?.type==='LineString'||f?.geometry?.type==='MultiLineString');
    value=feature?.geometry;
  }
  if(value?.type==='MultiLineString'){
    value={type:'LineString',coordinates:value.coordinates.flat()};
  }
  if(value?.type!=='LineString'||!Array.isArray(value.coordinates))return null;
  const coordinates=value.coordinates
    .map(point=>[Number(point[0]),Number(point[1])])
    .filter(([lon,lat])=>Number.isFinite(lon)&&Number.isFinite(lat)&&Math.abs(lat)<=90&&Math.abs(lon)<=180);
  return coordinates.length>=2?{type:'LineString',coordinates}:null;
}

function destroyRouteMap(containerId){
  const old=tripRouteMaps[containerId];
  if(old){
    try{old.off();old.remove()}catch(e){}
    delete tripRouteMaps[containerId];
  }
  const el=$(containerId);
  if(el){
    el.innerHTML='';
    el.classList.remove('route-map-error');
  }
}

function routeMarkerIcon(kind){
  return L.divIcon({
    className:'',
    html:`<div class="route-marker ${kind}"></div>`,
    iconSize:[24,24],
    iconAnchor:[12,12]
  });
}

function renderTripRouteMap(containerId,geojson,options={}){
  const route=normaliseRouteGeojson(geojson);
  const el=$(containerId);
  if(!el)return;

  destroyRouteMap(containerId);

  if(!route){
    el.className=(el.className+' route-map-error').trim();
    el.innerHTML='Geen bruikbare route gevonden.';
    return;
  }

  el.classList.add('route-map-loading');
  el.textContent='Routekaart laden…';

  const draw=()=>{
    if(!document.body.contains(el))return;
    const rect=el.getBoundingClientRect();
    if(rect.width<40||rect.height<40){
      setTimeout(draw,120);
      return;
    }

    el.classList.remove('route-map-loading');
    el.textContent='';

    const map=L.map(el,{
      zoomControl:true,
      attributionControl:true,
      preferCanvas:true,
      tap:false
    });

    const tiles=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,
      minZoom:3,
      attribution:'&copy; OpenStreetMap',
      updateWhenIdle:false,
      keepBuffer:4
    }).addTo(map);

    const latlngs=route.coordinates.map(([lon,lat])=>[lat,lon]);
    const routeLine=L.polyline(latlngs,{
      weight:5,
      opacity:.95,
      lineJoin:'round',
      lineCap:'round'
    }).addTo(map);

    const start=latlngs[0];
    const end=latlngs[latlngs.length-1];
    L.marker(start,{icon:routeMarkerIcon('start')})
      .addTo(map)
      .bindTooltip('Start',{permanent:false,direction:'top',className:'route-marker-label'});
    L.marker(end,{icon:routeMarkerIcon('end')})
      .addTo(map)
      .bindTooltip('Einde',{permanent:false,direction:'top',className:'route-marker-label'});

    const bounds=routeLine.getBounds();

    // Toon eigen POI's die in of vlak bij het routegebied liggen.
    const nearbyBounds=bounds.pad(.18);
    (poiCache||[]).forEach(p=>{
      const lat=Number(p.latitude),lon=Number(p.longitude);
      if(!Number.isFinite(lat)||!Number.isFinite(lon)||!nearbyBounds.contains([lat,lon]))return;
      L.circleMarker([lat,lon],{
        radius:6,
        weight:2,
        fillOpacity:.9
      }).addTo(map).bindPopup(
        `<b>${esc(p.name||'POI')}</b><br>${esc(p.category||'')}${p.place?` · ${esc(p.place)}`:''}`
      );
    });

    map.fitBounds(bounds,{padding:[28,28],maxZoom:15});
    tripRouteMaps[containerId]=map;

    // Leaflet werd eerder geopend in een verborgen uitklapvak.
    // Meerdere invalidate-calls voorkomen het zwarte vlak op iPhone/iPad.
    [40,180,450,900].forEach(delay=>{
      setTimeout(()=>{
        if(tripRouteMaps[containerId]===map){
          map.invalidateSize({pan:false});
          map.fitBounds(bounds,{padding:[28,28],maxZoom:15});
        }
      },delay);
    });

    tiles.on('tileerror',()=>{
      el.style.background='#d9e4e9';
    });

    if(options.dashboard){
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.dragging.disable();
      map.touchZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
      if(map.zoomControl)map.zoomControl.remove();
    }
  };

  requestAnimationFrame(()=>requestAnimationFrame(draw));
}

function populateTripYears(){
  const select=$('tripFilterYear');
  if(!select)return;
  const years=[...new Set(tripCache.map(t=>String(t.trip_date||'').slice(0,4)).filter(Boolean))].sort().reverse();
  const current=select.value;
  select.innerHTML='<option value="">Kies jaar</option>'+years.map(y=>`<option value="${y}">${y}</option>`).join('');
  if(years.includes(current))select.value=current;
}
function updateTripFilterInput(){
  const mode=$('tripDateFilter').value;
  document.querySelectorAll('.trip-filter-input').forEach(el=>el.classList.add('hidden'));
  $('tripFilterEmpty').classList.toggle('hidden',!!mode);
  const map={day:'tripFilterDay',week:'tripFilterWeek',month:'tripFilterMonth',year:'tripFilterYear'};
  const labels={day:'Kies datum',week:'Kies week',month:'Kies maand',year:'Kies jaar'};
  $('tripFilterLabel').textContent=labels[mode]||'Kies periode';
  if(map[mode])$(map[mode]).classList.remove('hidden');
  if(mode==='year')populateTripYears();
  renderTripList();
}
function getIsoWeekRange(weekValue){
  const [year,week]=weekValue.split('-W').map(Number);
  const simple=new Date(Date.UTC(year,0,4));
  const day=simple.getUTCDay()||7;
  const monday=new Date(simple);
  monday.setUTCDate(simple.getUTCDate()-day+1+(week-1)*7);
  const sunday=new Date(monday);sunday.setUTCDate(monday.getUTCDate()+6);
  return [monday.toISOString().slice(0,10),sunday.toISOString().slice(0,10)];
}

function getTripDateStatusClass(tripDate){
  if(!tripDate)return '';

  const today=new Date();
  today.setHours(0,0,0,0);

  const tripDay=new Date(`${tripDate}T00:00:00`);
  if(Number.isNaN(tripDay.getTime()))return '';

  if(tripDay<today)return 'trip-past';
  if(tripDay>today)return 'trip-future';
  return 'trip-today';
}

function renderTripList(){
  if(!$('tripList'))return;
  populateTripYears();
  const mode=$('tripDateFilter')?.value||'';
  let filtered=[...tripCache];

  if(mode==='day'&&$('tripFilterDay').value){
    filtered=filtered.filter(t=>t.trip_date===$('tripFilterDay').value);
  }
  if(mode==='week'&&$('tripFilterWeek').value){
    const [start,end]=getIsoWeekRange($('tripFilterWeek').value);
    filtered=filtered.filter(t=>t.trip_date>=start&&t.trip_date<=end);
  }
  if(mode==='month'&&$('tripFilterMonth').value){
    filtered=filtered.filter(t=>String(t.trip_date).slice(0,7)===$('tripFilterMonth').value);
  }
  if(mode==='year'&&$('tripFilterYear').value){
    filtered=filtered.filter(t=>String(t.trip_date).slice(0,4)===$('tripFilterYear').value);
  }

  const photos=window.tripPhotoCache||{};
  $('tripList').innerHTML=filtered.length?filtered.map(t=>{
    const photoHtml=(photos[t.id]||[]).map(ph=>`
      <div class="trip-photo-wrap">
        <img src="${esc(ph.url)}" alt="Foto van ${esc(t.title||'vaarttocht')}" onclick="openLightbox(${JSON.stringify(ph.url)})">
        <button class="trip-photo-delete" onclick="deleteTripPhoto('${ph.id}','${esc(ph.storage_path)}')">×</button>
      </div>`).join('');

    const mapId=`tripRouteMap-${t.id}`;
    const routeHtml=normaliseRouteGeojson(t.route_geojson)
      ?`<div id="${mapId}" class="trip-route-map"></div>`
      :'';

    const dateStatusClass=getTripDateStatusClass(t.trip_date);
    return `<details class="trip-row ${dateStatusClass}" data-trip-id="${t.id}" ontoggle="handleTripToggle(this,'${mapId}','${t.id}')">
      <summary>
        <div class="trip-row-title">${esc(t.title||'Vaartocht')}</div>
        <div class="trip-row-date">${esc(t.trip_date)}</div>
      </summary>
      <div class="trip-row-body">
        <div class="small">${esc(t.departure||'')} → ${esc(t.arrival||'')}</div>
        <div class="trip-summary">
          <span>Afstand: ${t.distance_km??'-'} km</span>
          <span>Vaartijd: ${t.duration_hours??'-'} uur</span>
          <span>Bemanning: ${esc(t.crew||'-')}</span>
          <span>Brandstof: ${t.fuel_liters?Number(t.fuel_liters).toFixed(1)+' l':'-'}</span>
          <span>Kosten: ${t.fuel_cost?'€'+Number(t.fuel_cost).toFixed(2):'-'}</span>
        </div>
        <p>${esc(t.notes||'')}</p>
        ${routeHtml}
        ${photoHtml?`<div class="trip-photo-grid">${photoHtml}</div>`:''}
        <div class="item-actions trip-actions">
          <button class="edit-button" onclick='editTrip(
            ${JSON.stringify(t.id)},
            ${JSON.stringify(t.trip_date)},
            ${JSON.stringify(t.title)},
            ${JSON.stringify(t.departure)},
            ${JSON.stringify(t.arrival)},
            ${JSON.stringify(t.distance_km)},
            ${JSON.stringify(t.duration_hours)},
            ${JSON.stringify(t.fuel_liters)},
            ${JSON.stringify(t.fuel_cost)},
            ${JSON.stringify(t.crew)},
            ${JSON.stringify(t.notes)}
          )'>✏️ Bewerken</button>
          ${normaliseRouteGeojson(t.route_geojson)
            ?`<button class="waterkaarten-button" onclick="openTripInWaterkaarten('${t.id}')">🧭 Deel route naar Waterkaarten</button>`
            :''}
          <button class="danger-button" onclick="deleteTrip('${t.id}')">🗑️ Log verwijderen</button>
        </div>
      </div>
    </details>`;
  }).join(''):'<span class="small">Geen vaartochten gevonden.</span>';
}

function handleTripToggle(details,mapId,tripId){
  if(details.open){
    const trip=tripCache.find(item=>String(item.id)===String(tripId));
    setTimeout(()=>renderTripRouteMap(mapId,trip?.route_geojson),80);
  }else{
    destroyRouteMap(mapId);
  }
}
function setTripFilterToday(){
  $('tripDateFilter').value='day';
  updateTripFilterInput();
  $('tripFilterDay').value=new Date().toISOString().slice(0,10);
  renderTripList();
}
function clearTripFilters(){
  $('tripDateFilter').value='';
  ['tripFilterDay','tripFilterWeek','tripFilterMonth','tripFilterYear'].forEach(id=>$(id).value='');
  updateTripFilterInput();
}
function resetFinanceFilters(){
  $('financeYear').value='';
  $('financeCategory').value='';
  renderFinance();
}

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
