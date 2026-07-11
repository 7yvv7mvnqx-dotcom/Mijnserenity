const SUPABASE_URL='https://wufslczbtguvtgmfufid.supabase.co';
const SUPABASE_KEY='sb_publishable_LCJ5Oj0yG4guOvBFPS5ALg_WG57gAo9';
const PHOTO_BUCKET='poi-photos';
const TRIP_PHOTO_BUCKET='trip-photos';
const BOAT_PHOTO_BUCKET='boat-photos';
const TRIP_GPX_BUCKET='trip-gpx';
const COST_RECEIPT_BUCKET='cost-receipts';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let tripRouteMaps={};
let pendingTripRouteDetails=null;
let pendingTripRouteFile=null;
let pendingTripRouteFingerprint=null;
let savedICloudRouteHandle=null;
let currentUser=null,currentBoat=null,currentRole=null,liveChannel=null,mapInstance=null,poiLayer=null,userMarker=null,poiCache=[],poiPhotoCache={},costCache=[],costReceiptCache={},tripCache=[],settingsCache=null,favoritesOnly=false,poiPickerMap=null,poiPickerMarker=null,poiPickerSelection=null,poiPickerTargetId=null,poiOnlineSuggestionResults=[],poiLocationSuggestionTimer=null,poiNameSuggestionTimer=null,poiLocationSuggestionController=null,poiLiveSuggestionResults={name:[],place:[],address:[]};
$('costDate').value=new Date().toISOString().slice(0,10);$('tripDate').value=new Date().toISOString().slice(0,10);


function getLoggedInFirstName(){
  const metadata=currentUser?.user_metadata||{};
  const profileName=[
    metadata.first_name,
    metadata.given_name,
    metadata.full_name,
    metadata.name
  ].find(value=>String(value||'').trim());

  let raw=profileName
    ?String(profileName).trim().split(/\s+/)[0]
    :String(currentUser?.email||'').split('@')[0].split(/[._-]/)[0];

  const normalized=String(raw||'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9]/g,'');

  if(normalized.startsWith('michel'))return 'Michel';
  if(normalized.startsWith('desiree')||normalized.startsWith('desi'))return 'Desi';

  raw=raw||'Kapitein';
  return raw.charAt(0).toUpperCase()+raw.slice(1);
}

async function refreshMijnSerenity(button){
  const sync=$('dSync');
  button?.classList.add('is-refreshing');
  if(button)button.disabled=true;
  if(sync)sync.textContent='Controleren…';

  try{
    if('serviceWorker' in navigator){
      const registration=await navigator.serviceWorker.getRegistration();

      if(registration){
        await registration.update();

        if(registration.waiting){
          if(sync)sync.textContent='Nieuwe versie';
          showAppToast('Nieuwe versie wordt geopend…');
          registration.waiting.postMessage({type:'SKIP_WAITING'});
          return;
        }

        if(registration.installing){
          await new Promise(resolve=>{
            const worker=registration.installing;
            const timeout=setTimeout(resolve,2500);

            worker?.addEventListener('statechange',()=>{
              if(worker.state==='installed'||worker.state==='activated'){
                clearTimeout(timeout);
                resolve();
              }
            });
          });

          if(registration.waiting){
            if(sync)sync.textContent='Nieuwe versie';
            showAppToast('Nieuwe versie wordt geopend…');
            registration.waiting.postMessage({type:'SKIP_WAITING'});
            return;
          }
        }
      }
    }

    if(!currentUser){
      const {data:{session}}=await sb.auth.getSession();
      currentUser=session?.user||null;
    }

    if(!currentBoat&&currentUser){
      await loadMembership();
      renderBoat();
    }

    if(!currentBoat){
      throw new Error('Serenity is niet gekoppeld aan dit account.');
    }

    if(sync)sync.textContent='Verversen…';
    resetPoiFilters(false);

    const jobs=[
      ['instellingen',loadSettings],
      ['POI’s',loadPois],
      ['kosten',loadCosts],
      ['logboek',loadTrips]
    ];

    let succeeded=0;
    const failed=[];

    for(const [label,job] of jobs){
      try{
        await job();
        succeeded++;
      }catch(error){
        console.error(`${label} verversen mislukt:`,error);
        failed.push(label);
      }
    }

    loadSettingsForm();
    renderPoiList();
    renderFinance();

    const time=new Date().toLocaleTimeString('nl-NL',{
      hour:'2-digit',
      minute:'2-digit'
    });

    if(succeeded){
      if(sync)sync.textContent=`Live ${time}`;
      showAppToast(
        failed.length
          ?`Verversing klaar. ${succeeded} van ${jobs.length} onderdelen bijgewerkt.`
          :'MijnSerenity is volledig ververst ✅'
      );
    }else{
      if(sync)sync.textContent='Fout';
      showAppToast('Verversen is niet gelukt. Bestaande gegevens blijven zichtbaar.');
    }
  }catch(error){
    console.error('Verversen mislukt:',error);
    if(sync)sync.textContent='Fout';
    showAppToast(error?.message||'Verversen mislukt.');
  }finally{
    button?.classList.remove('is-refreshing');
    if(button)button.disabled=false;
  }
}

function updatePoiSuggestionLists(){
  const unique=field=>[...new Set(
    poiCache.map(poi=>String(poi?.[field]||'').trim()).filter(Boolean)
  )].sort((a,b)=>a.localeCompare(b,'nl'));

  const fill=(id,values)=>{
    const list=$(id);
    if(!list)return;
    list.innerHTML=values.slice(0,100)
      .map(value=>`<option value="${esc(value)}"></option>`)
      .join('');
  };

  fill('poiNameSuggestions',unique('name'));
  fill('poiPlaceSuggestions',unique('place'));
  fill('poiAddressSuggestions',unique('address'));
}

function poiSuggestionName(result){
  const named=result?.namedetails||{};
  const address=result?.address||{};
  return named.name||result?.name||address.amenity||address.shop||address.tourism||
    String(result?.display_name||'').split(',')[0]||'Locatie';
}

function poiSuggestionPlace(result){
  const address=result?.address||{};
  return address.city||address.town||address.village||address.municipality||address.hamlet||'';
}


function hidePoiLiveSuggestions(exceptField=''){
  ['place','address'].forEach(field=>{
    if(field===exceptField)return;
    const panel=getPoiLocationSuggestionPanel(field);
    panel?.classList.add('hidden');
    if(panel)panel.innerHTML='';
  });
}

function getPoiLocationSuggestionPanel(field){
  return field==='place'
    ?$('poiPlaceLiveSuggestions')
    :$('poiAddressLiveSuggestions');
}

function getPoiLocationSuggestionInput(field){
  return field==='place'
    ?$('poiPlace')
    :$('poiAddress');
}


function getMatchingLocalPois(query,field='place'){
  const normalized=String(query||'').trim().toLowerCase();
  if(normalized.length<2)return [];

  return poiCache
    .map(poi=>{
      const name=String(poi.name||'').trim();
      const place=String(poi.place||'').trim();
      const address=String(poi.address||'').trim();
      const category=String(poi.category||'POI').trim();
      const haystack=[name,place,address,category].join(' ').toLowerCase();

      let score=0;
      if(name.toLowerCase().startsWith(normalized))score+=100;
      if(place.toLowerCase().startsWith(normalized))score+=90;
      if(address.toLowerCase().startsWith(normalized))score+=70;
      if(haystack.includes(normalized))score+=30;
      if(field==='place'&&place)score+=10;
      if(field==='name'&&name)score+=10;

      return {
        _source:'local-poi',
        _poi:poi,
        weergavenaam:name||place||'POI',
        naam:name,
        type:`${category}${place?' · '+place:''}`,
        score
      };
    })
    .filter(result=>result.score>0)
    .sort((a,b)=>b.score-a.score)
    .slice(0,6);
}

function schedulePoiNameSuggestions(immediate=false){
  clearTimeout(poiNameSuggestionTimer);

  const query=String($('poiName')?.value||'').trim();
  const panel=$('poiNameLiveSuggestions');

  if(query.length<2){
    panel?.classList.add('hidden');
    if(panel)panel.innerHTML='';
    return;
  }

  poiNameSuggestionTimer=setTimeout(()=>{
    poiLiveSuggestionResults.name=getMatchingLocalPois(query,'name');
    renderPoiLiveSuggestions('name');
  },immediate?0:180);
}

function selectLocalPoiSuggestion(field,result){
  const poi=result?._poi;
  if(!poi)return;

  if(!$('poiName').value.trim()||field==='name'){
    $('poiName').value=poi.name||'';
  }

  $('poiPlace').value=poi.place||'';
  $('poiAddress').value=poi.address||'';

  if(poi.latitude!==null&&poi.latitude!==undefined){
    $('poiLatitude').value=poi.latitude;
  }
  if(poi.longitude!==null&&poi.longitude!==undefined){
    $('poiLongitude').value=poi.longitude;
  }

  if(poi.category&&$('poiCategory').value==='Haven'){
    $('poiCategory').value=poi.category;
  }

  hidePoiLiveSuggestions();
  $('poiNameLiveSuggestions')?.classList.add('hidden');
  showAppToast(`Locatie van ${poi.name||'POI'} overgenomen ✅`);
}

function schedulePoiLocationSuggestions(field,immediate=false){
  clearTimeout(poiLocationSuggestionTimer);

  const input=getPoiLocationSuggestionInput(field);
  const query=String(input?.value||'').trim();
  const panel=getPoiLocationSuggestionPanel(field);

  hidePoiLiveSuggestions(field);

  if(query.length<2){
    panel?.classList.add('hidden');
    if(panel)panel.innerHTML='';
    return;
  }

  poiLocationSuggestionTimer=setTimeout(
    ()=>loadPoiLocationSuggestions(field,query),
    immediate?0:350
  );
}

async function loadPoiLocationSuggestions(field,query){
  const input=getPoiLocationSuggestionInput(field);
  const panel=getPoiLocationSuggestionPanel(field);

  if(!input||!panel)return;
  if(String(input.value||'').trim()!==query)return;

  const localResults=getMatchingLocalPois(query,field);
  poiLiveSuggestionResults[field]=localResults;
  renderPoiLiveSuggestions(field);

  if(poiLocationSuggestionController){
    poiLocationSuggestionController.abort();
  }
  poiLocationSuggestionController=new AbortController();

  if(!localResults.length){
    panel.classList.remove('hidden');
    panel.innerHTML='<div class="poi-live-loading">Plaatsen en adressen zoeken…</div>';
  }

  try{
    const params=new URLSearchParams({
      q:query,
      rows:'7'
    });

    const response=await fetch(
      `https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest?${params.toString()}`,
      {
        headers:{Accept:'application/json'},
        signal:poiLocationSuggestionController.signal
      }
    );

    if(!response.ok){
      throw new Error(`Locatieserver gaf fout ${response.status}`);
    }

    const payload=await response.json();
    const docs=Array.isArray(payload?.response?.docs)
      ?payload.response.docs
      :[];

    const allowedTypes=field==='place'
      ?new Set(['woonplaats','gemeente','buurt','wijk','provincie'])
      :new Set(['adres','weg','postcode','woonplaats']);

    let onlineResults=docs.filter(result=>
      allowedTypes.has(String(result.type||'').toLowerCase())
    );

    if(!onlineResults.length)onlineResults=docs;

    onlineResults=onlineResults
      .slice(0,7)
      .map(result=>({...result,_source:'pdok'}));

    poiLiveSuggestionResults[field]=[
      ...localResults,
      ...onlineResults
    ].slice(0,10);

    renderPoiLiveSuggestions(field);
  }catch(error){
    if(error?.name==='AbortError')return;
    console.error('Locatiesuggesties laden mislukt:',error);

    if(!localResults.length){
      panel.innerHTML='<div class="poi-live-loading">Suggesties zijn nu niet beschikbaar.</div>';
    }
  }
}

function renderPoiLiveSuggestions(field){
  const panel=field==='name'
    ?$('poiNameLiveSuggestions')
    :getPoiLocationSuggestionPanel(field);
  const results=poiLiveSuggestionResults[field]||[];

  if(!panel)return;

  if(!results.length){
    panel.innerHTML='<div class="poi-live-loading">Geen passende suggesties gevonden.</div>';
    panel.classList.remove('hidden');
    return;
  }

  panel.innerHTML=results.map((result,index)=>{
    const local=result._source==='local-poi';
    const title=result.weergavenaam||result.naam||'Locatie';
    const subtitle=local
      ?`Eigen POI · ${result.type||''}`
      :(result.type||'Plaats of adres');

    return `
      <button type="button" class="${local?'local-poi-suggestion':''}"
        onclick="selectPoiLocationSuggestion('${field}',${index})">
        <b>${esc(title)}</b>
        <span>${esc(subtitle)}</span>
      </button>
    `;
  }).join('');

  panel.classList.remove('hidden');
}

function parsePdokPoint(value){
  const match=String(value||'').match(
    /POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i
  );

  if(!match)return null;

  const longitude=Number(match[1]);
  const latitude=Number(match[2]);

  if(!Number.isFinite(latitude)||!Number.isFinite(longitude))return null;
  return {latitude,longitude};
}

function buildPdokAddress(doc){
  const parts=[];

  const street=doc.straatnaam||doc.openbareruimtenaam||'';
  const number=[
    doc.huisnummer,
    doc.huisletter,
    doc.huisnummertoevoeging
  ].filter(value=>
    value!==null&&
    value!==undefined&&
    String(value).trim()
  ).join('');

  if(street){
    parts.push(`${street}${number?' '+number:''}`.trim());
  }

  const postcode=doc.postcode||'';
  const place=doc.woonplaatsnaam||doc.gemeentenaam||'';
  const locality=[postcode,place].filter(Boolean).join(' ');

  if(locality)parts.push(locality);

  return parts.join(', ')||doc.weergavenaam||'';
}

async function selectPoiLocationSuggestion(field,index){
  const result=(poiLiveSuggestionResults[field]||[])[index];
  if(!result)return;

  if(result._source==='local-poi'){
    selectLocalPoiSuggestion(field,result);
    return;
  }

  const input=getPoiLocationSuggestionInput(field);
  const panel=getPoiLocationSuggestionPanel(field);

  if(input)input.value=result.weergavenaam||result.naam||input.value;
  panel?.classList.add('hidden');

  try{
    const params=new URLSearchParams({id:result.id});
    const response=await fetch(
      `https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup?${params.toString()}`,
      {headers:{Accept:'application/json'}}
    );

    if(!response.ok){
      throw new Error(`Locatie opzoeken gaf fout ${response.status}`);
    }

    const payload=await response.json();
    const doc=payload?.response?.docs?.[0];

    if(!doc){
      throw new Error('Geen locatiegegevens ontvangen.');
    }

    const point=parsePdokPoint(
      doc.centroide_ll||
      doc.geometrie_ll||
      ''
    );

    const resultType=String(doc.type||result.type||'').toLowerCase();
    const place=doc.woonplaatsnaam||
      doc.gemeentenaam||
      (resultType==='woonplaats'
        ?result.weergavenaam
        :''
      );

    if(place)$('poiPlace').value=place;

    if(field==='address'||resultType==='adres'){
      const address=buildPdokAddress(doc);
      if(address)$('poiAddress').value=address;
    }

    if(point){
      $('poiLatitude').value=point.latitude.toFixed(7);
      $('poiLongitude').value=point.longitude.toFixed(7);
      showAppToast('Plaats, adres en kaartlocatie overgenomen ✅');
    }else{
      showAppToast('Plaats of adres overgenomen. Kaartlocatie kon niet worden bepaald.');
    }
  }catch(error){
    console.error('Locatiesuggestie verwerken mislukt:',error);
    showAppToast('De tekst is overgenomen, maar de kaartlocatie niet.');
  }
}

document.addEventListener('click',event=>{
  const insideName=
    event.target===$('poiName')||
    $('poiNameLiveSuggestions')?.contains(event.target);

  const insidePlace=
    event.target===$('poiPlace')||
    $('poiPlaceLiveSuggestions')?.contains(event.target);

  const insideAddress=
    event.target===$('poiAddress')||
    $('poiAddressLiveSuggestions')?.contains(event.target);

  if(!insideName){
    $('poiNameLiveSuggestions')?.classList.add('hidden');
  }
  if(!insidePlace){
    $('poiPlaceLiveSuggestions')?.classList.add('hidden');
  }
  if(!insideAddress){
    $('poiAddressLiveSuggestions')?.classList.add('hidden');
  }
});

async function searchPoiAddressSuggestions(){
  const address=String($('poiAddress')?.value||'').trim();
  const place=String($('poiPlace')?.value||'').trim();

  if(address.length>=2){
    await loadPoiLocationSuggestions('address',address);
    return;
  }

  if(place.length>=2){
    await loadPoiLocationSuggestions('place',place);
    return;
  }

  alert('Typ eerst minimaal twee letters bij plaats of adres.');
}

function applyPoiOnlineSuggestion(index){
  const result=poiOnlineSuggestionResults[index];
  if(!result)return;

  const name=poiSuggestionName(result);
  const place=poiSuggestionPlace(result);

  if(name&&!$('poiName').value.trim())$('poiName').value=name;
  if(place)$('poiPlace').value=place;
  $('poiAddress').value=result.display_name||'';
  $('poiLatitude').value=Number(result.lat).toFixed(7);
  $('poiLongitude').value=Number(result.lon).toFixed(7);

  $('poiOnlineSuggestions').classList.add('hidden');
  showAppToast('Adres, plaats en kaartlocatie ingevuld ✅');
}

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
function clearPoiForm(closePanel=true){
  $('poiFavorite').checked=false;
  ['poiId','poiName','poiPlace','poiAddress','poiReview','poiRating','poiLatitude','poiLongitude']
    .forEach(id=>{
      const element=$(id);
      if(element)element.value='';
    });

  $('poiCategory').value='Haven';
  $('poiPhotos').value='';
  $('poiFormTitle').textContent='POI toevoegen';
  $('poiSaveButton').textContent='Opslaan';
  $('poiSaveButton').disabled=false;
  $('poiClearButton')?.classList.remove('hidden');
  $('poiCancelButton').classList.add('hidden');

  [
    'poiNameLiveSuggestions',
    'poiPlaceLiveSuggestions',
    'poiAddressLiveSuggestions',
    'poiOnlineSuggestions'
  ].forEach(id=>{
    const panel=$(id);
    panel?.classList.add('hidden');
    if(panel)panel.innerHTML='';
  });

  clearTimeout(poiNameSuggestionTimer);
  clearTimeout(poiLocationSuggestionTimer);
  poiLocationSuggestionController?.abort();
  poiLiveSuggestionResults={name:[],place:[],address:[]};
  poiOnlineSuggestionResults=[];
  setPoiProgress('');

  if(closePanel){
    closePoiFormPanel();
  }else{
    openPoiFormPanel();
    setTimeout(()=>$('poiName')?.focus(),50);
  }
}

function resetPoiEntryForm(){
  clearPoiForm(false);
  showAppToast('Ingevulde POI-gegevens zijn leeggemaakt.');
}

function cancelPoiEdit(){
  clearPoiForm(true);
}
async function signUp(){const email=$('email').value.trim(),password=$('password').value;if(!email||password.length<6)return setMsg('Vul een geldig e-mailadres en minimaal 6 tekens als wachtwoord in.');const {data,error}=await sb.auth.signUp({email,password});if(error)return setMsg(error.message);setMsg(data.session?'Account gemaakt en ingelogd.':'Account gemaakt. Open de bevestigingsmail en log daarna in.')}
async function signIn(){const {error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)setMsg(error.message)}
async function signOut(){await sb.auth.signOut()}
async function initialise(session){currentUser=session?.user||null;$('authView').classList.toggle('hidden',!!currentUser);$('appView').classList.toggle('hidden',!currentUser);if(!currentUser){currentBoat=null;currentRole=null;if(liveChannel){await sb.removeChannel(liveChannel);liveChannel=null}return}$('welcome').textContent='Welkom '+getLoggedInFirstName();resetPoiFilters(false);await loadMembership();renderBoat();if(currentBoat){await Promise.all([loadSettings(),loadPois(),loadCosts(),loadTrips()]);subscribeRealtime()}$('tripCrew').value=$('tripCrew').value||'Michel, Desi';closeTripForm();collapseDefaultPanels();setTimeout(()=>captainNavigate('dashboard'),0)}
sb.auth.onAuthStateChange((_e,s)=>initialise(s));

async function loadMembership(){const {data,error}=await sb.from('boat_members').select('role,boat_id,boats(id,name,created_by)').eq('user_id',currentUser.id).limit(1);if(error){alert('Lidmaatschap laden mislukt: '+error.message);return}if(data?.length){currentRole=data[0].role;currentBoat=data[0].boats}else{currentRole=null;currentBoat=null}}
function renderBoat(){$('noBoatCard').classList.toggle('hidden',!!currentBoat);$('boatCard').classList.toggle('hidden',!currentBoat);$('dBoat').textContent=currentBoat?.name||'-';if(currentBoat){$('boatName').textContent=currentBoat.name;$('rolePill').textContent=currentRole==='owner'?'Eigenaar':'Lid';$('ownerInvite').classList.toggle('hidden',currentRole!=='owner')}}
async function createBoat(){const {error}=await sb.rpc('create_boat_with_owner',{boat_name:$('newBoatName').value.trim()||'Serenity'});if(error)return alert('Boot aanmaken mislukt: '+error.message);await loadMembership();renderBoat();await Promise.all([loadSettings(),loadPois(),loadCosts(),loadTrips()]);subscribeRealtime()}
async function createInvite(){const {data,error}=await sb.rpc('create_boat_invite',{target_boat:currentBoat.id});if(error)return alert('Deelcode maken mislukt: '+error.message);$('inviteCode').textContent=data}
async function joinBoat(){const code=$('joinCode').value.trim();if(!code)return alert('Vul eerst de deelcode in.');const {error}=await sb.rpc('join_boat_by_code',{invite_code:code});if(error)return alert('Deelnemen mislukt: '+error.message);await loadMembership();renderBoat();await Promise.all([loadSettings(),loadPois(),loadCosts(),loadTrips()]);subscribeRealtime()}

async function savePoi(){
  const saveButton=$('poiSaveButton');
  if(saveButton?.disabled)return;

  try{
    if(!currentUser){
      const {data:{session}}=await sb.auth.getSession();
      currentUser=session?.user||null;
    }

    if(!currentBoat&&currentUser){
      await loadMembership();
      renderBoat();
    }

    if(!currentBoat){
      throw new Error('Koppel eerst Serenity aan dit account.');
    }

    const id=String($('poiId')?.value||'').trim();
    const name=String($('poiName')?.value||'').trim();
    const place=String($('poiPlace')?.value||'').trim();
    const address=String($('poiAddress')?.value||'').trim();
    const review=String($('poiReview')?.value||'').trim();
    const ratingValue=String($('poiRating')?.value||'').trim();
    const rating=ratingValue?Number(ratingValue):null;
    const latitude=parsePoiCoordinateInput($('poiLatitude')?.value,90);
    const longitude=parsePoiCoordinateInput($('poiLongitude')?.value,180);

    if(!name){
      alert('Vul eerst een naam voor de POI in.');
      $('poiName')?.focus();
      return;
    }

    if(rating!==null&&(!Number.isFinite(rating)||rating<1||rating>5)){
      alert('Beoordeling moet tussen 1 en 5 liggen.');
      $('poiRating')?.focus();
      return;
    }

    const hasLatitude=latitude!==null;
    const hasLongitude=longitude!==null;
    if(hasLatitude!==hasLongitude){
      alert('Vul zowel breedtegraad als lengtegraad in, of laat beide leeg.');
      return;
    }

    const row={
      boat_id:currentBoat.id,
      name,
      category:$('poiCategory').value,
      place,
      address,
      review,
      rating,
      is_favorite:$('poiFavorite').checked,
      latitude,
      longitude,
      updated_at:new Date().toISOString()
    };

    saveButton.disabled=true;
    setPoiProgress(id?'POI bijwerken…':'POI opslaan…');

    let poiId=id;

    if(id){
      const {data,error}=await sb.from('pois')
        .update(row)
        .eq('id',id)
        .eq('boat_id',currentBoat.id)
        .select('id')
        .single();

      if(error)throw error;
      poiId=data?.id||id;
    }else{
      const {data,error}=await sb.from('pois')
        .insert({
          ...row,
          created_by:currentUser.id
        })
        .select('id')
        .single();

      if(error)throw error;
      poiId=data.id;
    }

    const files=[...($('poiPhotos')?.files||[])].slice(0,6);
    if(files.length){
      setPoiProgress(`POI opgeslagen · ${files.length} foto${files.length===1?'':'’s'} uploaden…`);
      await uploadPoiPhotos(poiId,files);
    }

    resetPoiFilters(false);
    await loadPois();
    if(mapInstance)renderPoiMarkers();

    clearPoiForm(true);
    showAppToast(id?'POI bijgewerkt ✅':'POI opgeslagen ✅');
  }catch(error){
    console.error('POI opslaan mislukt:',error);
    const message=error?.message||'Onbekende fout';
    setPoiProgress(`Opslaan mislukt: ${message}`);
    alert(`POI opslaan mislukt: ${message}`);
  }finally{
    if(saveButton)saveButton.disabled=false;
  }
}
function editPoi(id,name,category,place,address,rating,review,isFavorite,latitude,longitude){
  $('poiId').value=id;$('poiName').value=name;$('poiCategory').value=category||'Haven';$('poiPlace').value=place||'';$('poiAddress').value=address||'';$('poiRating').value=rating||'';$('poiReview').value=review||'';$('poiFavorite').checked=!!isFavorite;$('poiLatitude').value=latitude??'';$('poiLongitude').value=longitude??'';
  $('poiFormTitle').textContent='POI bewerken';openPoiFormPanel();$('poiSaveButton').textContent='Wijzigingen opslaan';$('poiClearButton')?.classList.add('hidden');$('poiCancelButton').classList.remove('hidden');
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
  if(!currentBoat)return;

  const [{data,error},photos]=await Promise.all([
    sb.from('pois')
      .select('*')
      .eq('boat_id',currentBoat.id)
      .order('created_at',{ascending:false}),
    loadPoiPhotos()
  ]);

  if(error){
    console.error('POI laden mislukt:',error);
    throw error;
  }

  poiCache=(data||[]).map(poi=>({
    ...poi,
    latitude:poi.latitude,
    longitude:poi.longitude,
    is_favorite:isFavoritePoi(poi)
  }));
  poiPhotoCache=photos||{};

  $('dPois').textContent=poiCache.length;
  updatePoiSuggestionLists();
  renderPoiList();

  if(mapInstance)renderPoiMarkers();
}

let pendingCostReceiptFiles=[];
let costReceiptPreviewUrls=[];
let receiptOcrLibraryPromise=null;
let receiptOcrRunning=false;
let lastReceiptOcrText='';

function setCostProgress(message){
  const element=$('costProgress');
  if(!element)return;
  element.textContent=message||'';
  element.classList.toggle('hidden',!message);
}

function addCostReceiptFiles(fileList){
  const incoming=[...(fileList||[])];
  const newImages=[];

  for(const file of incoming){
    if(pendingCostReceiptFiles.length>=3){
      alert('Je kunt maximaal 3 bonnetjes per kostenpost toevoegen.');
      break;
    }

    const allowed=file.type.startsWith('image/')||file.type==='application/pdf';
    if(!allowed){
      alert(`${file.name} is geen afbeelding of PDF.`);
      continue;
    }

    if(file.size>10*1024*1024){
      alert(`${file.name} is groter dan 10 MB.`);
      continue;
    }

    const duplicate=pendingCostReceiptFiles.some(existing=>
      existing.name===file.name &&
      existing.size===file.size &&
      existing.lastModified===file.lastModified
    );

    if(!duplicate){
      pendingCostReceiptFiles.push(file);
      if(file.type.startsWith('image/'))newImages.push(file);
    }
  }

  $('costReceiptCamera').value='';
  $('costReceiptFiles').value='';
  renderCostReceiptPreview();

  const hasImage=pendingCostReceiptFiles.some(file=>file.type.startsWith('image/'));
  $('costOcrRetryButton')?.classList.toggle('hidden',!hasImage);

  if(newImages.length){
    scanCostReceipt(newImages[0]);
  }else if(incoming.some(file=>file.type==='application/pdf')){
    setCostOcrStatus('Een PDF wordt wel opgeslagen, maar automatisch uitlezen werkt alleen bij een foto.');
  }
}

function renderCostReceiptPreview(){
  costReceiptPreviewUrls.forEach(url=>URL.revokeObjectURL(url));
  costReceiptPreviewUrls=[];

  const preview=$('costReceiptPreview');
  if(!preview)return;

  if(!pendingCostReceiptFiles.length){
    preview.innerHTML='';
    preview.classList.add('hidden');
    return;
  }

  preview.innerHTML=pendingCostReceiptFiles.map((file,index)=>{
    if(file.type.startsWith('image/')){
      const url=URL.createObjectURL(file);
      costReceiptPreviewUrls.push(url);
      return `<div class="receipt-preview-item">
        <img src="${url}" alt="Voorbeeld van bonnetje">
        <button type="button" onclick="removePendingCostReceipt(${index})">×</button>
        <span>${esc(file.name)}</span>
      </div>`;
    }

    return `<div class="receipt-preview-item receipt-pdf-preview">
      <div class="receipt-pdf-icon">PDF</div>
      <button type="button" onclick="removePendingCostReceipt(${index})">×</button>
      <span>${esc(file.name)}</span>
    </div>`;
  }).join('');

  preview.classList.remove('hidden');
}

function removePendingCostReceipt(index){
  pendingCostReceiptFiles.splice(index,1);
  renderCostReceiptPreview();
  const hasImage=pendingCostReceiptFiles.some(file=>file.type.startsWith('image/'));
  $('costOcrRetryButton')?.classList.toggle('hidden',!hasImage);
  if(!hasImage){
    lastReceiptOcrText='';
    setCostOcrStatus('');
  }
}

function resetCostReceiptSelection(){
  pendingCostReceiptFiles=[];
  costReceiptPreviewUrls.forEach(url=>URL.revokeObjectURL(url));
  costReceiptPreviewUrls=[];
  lastReceiptOcrText='';

  if($('costReceiptCamera'))$('costReceiptCamera').value='';
  if($('costReceiptFiles'))$('costReceiptFiles').value='';

  $('costOcrRetryButton')?.classList.add('hidden');
  setCostOcrStatus('');
  renderCostReceiptPreview();
}


function setCostOcrStatus(message,isError=false){
  const el=$('costOcrStatus');
  if(!el)return;
  el.textContent=message||'';
  el.classList.toggle('hidden',!message);
  el.classList.toggle('receipt-ocr-error',!!isError);
}

async function loadReceiptOcrLibrary(){
  if(window.Tesseract)return window.Tesseract;
  if(receiptOcrLibraryPromise)return receiptOcrLibraryPromise;

  receiptOcrLibraryPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.async=true;
    script.onload=()=>window.Tesseract
      ?resolve(window.Tesseract)
      :reject(new Error('OCR-bibliotheek is niet beschikbaar.'));
    script.onerror=()=>reject(new Error('OCR-bibliotheek kon niet worden geladen.'));
    document.head.appendChild(script);
  });

  try{
    return await receiptOcrLibraryPromise;
  }catch(error){
    receiptOcrLibraryPromise=null;
    throw error;
  }
}

function readReceiptImage(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror=()=>{
      URL.revokeObjectURL(url);
      reject(new Error('De bonfoto kon niet worden geopend.'));
    };
    img.src=url;
  });
}

async function prepareReceiptImageForOcr(file){
  try{
    const img=await readReceiptImage(file);
    const maxSide=1900;
    const scale=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight));
    const width=Math.max(1,Math.round(img.naturalWidth*scale));
    const height=Math.max(1,Math.round(img.naturalHeight*scale));

    const canvas=document.createElement('canvas');
    canvas.width=width;
    canvas.height=height;

    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#fff';
    ctx.fillRect(0,0,width,height);
    ctx.filter='grayscale(1) contrast(1.35)';
    ctx.drawImage(img,0,0,width,height);

    return await new Promise((resolve,reject)=>{
      canvas.toBlob(
        blob=>blob?resolve(blob):reject(new Error('De bonfoto kon niet worden voorbereid.')),
        'image/jpeg',
        .92
      );
    });
  }catch(error){
    console.warn('Voorbewerking mislukt; originele foto wordt gebruikt:',error);
    return file;
  }
}


const COST_DETAILS_MARKER='\n\n--- BONDETAILS ---\n';

function splitCostDescription(value){
  const text=String(value||'');
  const markerIndex=text.indexOf(COST_DETAILS_MARKER);

  if(markerIndex<0){
    return {summary:text.trim(),details:''};
  }

  return {
    summary:text.slice(0,markerIndex).trim(),
    details:text.slice(markerIndex+COST_DETAILS_MARKER.length).trim()
  };
}

function composeCostDescription(summary,details){
  const cleanSummary=String(summary||'').trim();
  const cleanDetails=String(details||'').trim();
  return cleanDetails
    ?`${cleanSummary}${COST_DETAILS_MARKER}${cleanDetails}`
    :cleanSummary;
}

function costDescriptionSummary(value){
  return splitCostDescription(value).summary||'Kostenpost';
}

function clearCostReceiptDetails(){
  if($('costReceiptDetails'))$('costReceiptDetails').value='';
  $('costReceiptDetailsWrap')?.classList.add('hidden');
}

function showCostReceiptDetails(details=''){
  if($('costReceiptDetails'))$('costReceiptDetails').value=String(details||'');
  $('costReceiptDetailsWrap')?.classList.remove('hidden');
}

function normalizeReceiptTextLine(value){
  return String(value||'')
    .replace(/[|]/g,'I')
    .replace(/\s+/g,' ')
    .replace(/^[^A-Za-zÀ-ÿ0-9€#]+/,'')
    .replace(/[^A-Za-zÀ-ÿ0-9€#.,:/&+()' -]+$/,'')
    .trim();
}

function extractReceiptAddress(text){
  const lines=receiptLines(text);
  let street='';
  let postal='';

  for(const line of lines.slice(0,18)){
    if(!street&&/\b(straat|weg|laan|plein|markt|kade|haven|gracht|dijk|singel|boulevard)\b/i.test(line)&&/\d/.test(line)){
      street=normalizeReceiptTextLine(line);
    }

    if(!postal){
      const match=line.match(/\b(\d{4}\s?[A-Z]{2})\s+([A-Za-zÀ-ÿ.' -]{2,})\b/i);
      if(match){
        postal=`${match[1].toUpperCase().replace(/(\d{4})\s?([A-Z]{2})/,'$1 $2')} ${match[2].trim()}`;
      }
    }
  }

  return [street,postal].filter(Boolean).join(', ');
}

function extractReceiptReference(text){
  const details=[];

  receiptLines(text).forEach(line=>{
    const order=line.match(/\b(bestelling|order)\s*#?\s*([A-Z0-9-]+)/i);
    if(order){
      const label=order[1][0].toUpperCase()+order[1].slice(1).toLowerCase();
      details.push(`${label}: ${order[2]}`);
    }

    const table=line.match(/\btafel\s*([A-Z0-9-]+)/i);
    if(table)details.push(`Tafel: ${table[1]}`);
  });

  return [...new Set(details)];
}

function extractReceiptItems(text){
  const results=[];
  const moneyPattern=/(?:€\s*)?\d{1,5}(?:[.\s]\d{3})*[,.]\d{2}/g;
  const reject=/\b(subtotaal|totaal|te betalen|btw|vat|incl|excl|belasting|korting|wisselgeld|contant|betaald|pin|bedrag)\b/i;
  const header=/\b(bestelling|order|tafel|manager|kassa|datum|tijd|receipt|bonnummer)\b/i;

  for(const line of receiptLines(text)){
    if(reject.test(line)||header.test(line))continue;

    const matches=[...line.matchAll(moneyPattern)];
    if(!matches.length)continue;

    const first=matches[0];
    let description=line.slice(0,first.index).trim();

    description=description
      .replace(/^\d+\s*[xX]?\s+/,'')
      .replace(/^[^A-Za-zÀ-ÿ0-9]+/,'')
      .replace(/\s{2,}/g,' ')
      .trim();

    if(description.length<2||description.length>80)continue;
    if(/^(tel|www|http|markt|straat|weg|postcode|bedankt)\b/i.test(description))continue;

    const amount=parseReceiptMoney(matches[matches.length-1][0]);
    if(amount===null)continue;

    const quantityMatch=line.match(/^\s*(\d+)\s+[A-Za-zÀ-ÿ]/);
    const quantity=quantityMatch?Number(quantityMatch[1]):1;

    results.push({
      description:normalizeReceiptTextLine(description),
      quantity,
      amount
    });
  }

  const unique=[];
  const seen=new Set();

  for(const item of results){
    const key=`${item.description.toLowerCase()}|${item.amount.toFixed(2)}`;
    if(seen.has(key))continue;
    seen.add(key);
    unique.push(item);
  }

  return unique.slice(0,15);
}

function buildReceiptDetails(text,{merchant,date,amount}={}){
  const lines=[];
  const address=extractReceiptAddress(text);
  const references=extractReceiptReference(text);
  const items=extractReceiptItems(text);

  if(merchant)lines.push(`Zaak: ${merchant}`);
  if(address)lines.push(`Adres: ${address}`);
  if(date)lines.push(`Datum: ${date.split('-').reverse().join('-')}`);
  references.forEach(reference=>lines.push(reference));

  if(items.length){
    lines.push('');
    lines.push('Artikelen:');
    items.forEach(item=>{
      const quantity=item.quantity>1?`${item.quantity} × `:'';
      lines.push(`• ${quantity}${item.description} — €${item.amount.toFixed(2).replace('.',',')}`);
    });
  }

  if(amount!==null&&amount!==undefined){
    lines.push('');
    lines.push(`Totaal: €${Number(amount).toFixed(2).replace('.',',')}`);
  }

  return lines.join('\n').trim();
}

function receiptLines(text){
  return String(text||'')
    .replace(/\r/g,'')
    .split('\n')
    .map(line=>line.replace(/\s+/g,' ').trim())
    .filter(Boolean);
}

function parseReceiptMoney(raw){
  let value=String(raw||'')
    .replace(/[€$£]/g,'')
    .replace(/\s/g,'')
    .trim();

  if(!value)return null;

  const comma=value.lastIndexOf(',');
  const dot=value.lastIndexOf('.');

  if(comma>-1&&dot>-1){
    value=comma>dot
      ?value.replace(/\./g,'').replace(',','.')
      :value.replace(/,/g,'');
  }else if(comma>-1){
    value=value.replace(/\./g,'').replace(',','.');
  }else{
    const parts=value.split('.');
    if(parts.length>2){
      const decimal=parts.pop();
      value=parts.join('')+'.'+decimal;
    }
  }

  const number=Number(value);
  return Number.isFinite(number)&&number>0&&number<100000?number:null;
}

function extractReceiptAmount(text){
  const lines=receiptLines(text);
  const candidates=[];
  const pattern=/(?:€\s*)?\d{1,5}(?:[.\s]\d{3})*[,.]\d{2}/g;

  lines.forEach((line,index)=>{
    const lower=line.toLowerCase();
    const matches=line.match(pattern)||[];

    for(const match of matches){
      const amount=parseReceiptMoney(match);
      if(amount===null)continue;

      let score=index/Math.max(lines.length,1)*18;
      if(/\b(eind)?totaal\b|te betalen|verschuldigd|betaald|pin(?:betaling)?|amount due|grand total/.test(lower))score+=120;
      if(/€/.test(line))score+=12;
      if(/\bsubtotaal\b|\bbtw\b|\bvat\b|belasting|korting|wisselgeld|contant terug/.test(lower))score-=45;
      if(/\bdatum\b|\bdate\b|\btijd\b|\btime\b/.test(lower))score-=30;

      candidates.push({amount,score,index});
    }
  });

  if(!candidates.length)return null;
  candidates.sort((a,b)=>b.score-a.score||b.index-a.index||b.amount-a.amount);
  return candidates[0].amount;
}

function validReceiptDate(year,month,day){
  const date=new Date(year,month-1,day);
  if(date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==day)return null;

  const tomorrow=new Date();
  tomorrow.setDate(tomorrow.getDate()+1);
  tomorrow.setHours(23,59,59,999);

  if(date>tomorrow||year<2000)return null;

  const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,10);
}

function extractReceiptDate(text){
  const lines=receiptLines(text);
  const candidates=[];

  lines.forEach((line,index)=>{
    const preferred=/\bdatum\b|\bdate\b|aankoopdatum|transactiedatum/.test(line.toLowerCase());

    for(const match of line.matchAll(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/g)){
      const date=validReceiptDate(Number(match[1]),Number(match[2]),Number(match[3]));
      if(date)candidates.push({date,score:(preferred?100:0)-index});
    }

    for(const match of line.matchAll(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2}|\d{2})\b/g)){
      let year=Number(match[3]);
      if(year<100)year+=year>=70?1900:2000;
      const date=validReceiptDate(year,Number(match[2]),Number(match[1]));
      if(date)candidates.push({date,score:(preferred?100:0)-index});
    }
  });

  if(!candidates.length)return null;
  candidates.sort((a,b)=>b.score-a.score);
  return candidates[0].date;
}

function extractReceiptMerchant(text){
  const candidates=[];

  receiptLines(text).slice(0,16).forEach((rawLine,index)=>{
    const line=normalizeReceiptTextLine(rawLine);
    const lower=line.toLowerCase();

    if(line.length<3||line.length>60)return;
    if(!/[A-Za-zÀ-ÿ]{3}/.test(line))return;
    if(/bon|receipt|factuur|invoice|kassabon|betaalbewijs/.test(lower))return;
    if(/totaal|subtotal|subtotaal|bedrag|te betalen|btw|vat|datum|date|tijd|time/.test(lower))return;
    if(/www\.|https?:|@|tel(?:efoon)?|kvk|iban|transactie|terminal|kaartnummer/.test(lower))return;
    if(/\b\d{4}\s?[a-z]{2}\b/i.test(line))return;
    if(/\b(straat|weg|laan|plein|markt|kade|haven)\b/i.test(line)&&/\d/.test(line))return;
    if(/\b(bestelling|order|tafel|manager)\b/i.test(line))return;

    const letters=line.match(/[A-Za-zÀ-ÿ]/g)||[];
    const uppercase=line.match(/[A-ZÀ-Þ]/g)||[];
    const uppercaseRatio=letters.length?uppercase.length/letters.length:0;
    const words=line.split(/\s+/).filter(Boolean);

    let score=120-index*7;
    if(uppercaseRatio>.72)score+=55;
    if(words.length>=2&&words.length<=5)score+=22;
    if(line.length>=5&&line.length<=32)score+=18;
    if(/\b(restaurant|café|cafe|bistro|brasserie|pizzeria|jachthaven|marina|shop)\b/i.test(line))score+=24;

    candidates.push({merchant:line,score});
  });

  if(!candidates.length)return null;
  candidates.sort((a,b)=>b.score-a.score);
  return candidates[0].merchant||null;
}

function detectReceiptCategory(text){
  const lower=String(text||'').toLowerCase();
  const rules=[
    ['Eten & Drinken',/\brestaurant\b|\bcafé\b|\bcafe\b|\bbistro\b|\bbrasserie\b|\bpizzeria\b|\bhoreca\b|\btafel\b|\bbestelling\b|\bcola\b|\bbier\b|\bbeer\b|\bwijn\b|\bwine\b|\bspaghetti\b|\bpizza\b|\bfiletto\b|\binsalata\b|\bpasta\b|\bburger\b|\bmenu\b|\bdiner\b|\blunch\b|\bkeuken\b/],
    ['Diesel',/\bdiesel\b|\bbrandstof\b|\bfuel\b|\btankstation\b|\bshell\b|\besso\b|\bbp\b|\btango\b|\btinq\b|\bavia\b/],
    ['Havengeld',/\bhavengeld\b|\bjachthaven\b|\bmarina\b|\bliggeld\b|\bligplaats\b|\bpassantenhaven\b/],
    ['Winterstalling',/\bwinterstalling\b|\bstalling\b|\bwinterberging\b/],
    ['Onderhoud',/\bonderhoud\b|\breparatie\b|\bservice\b|\bwerkplaats\b|\bscheepswerf\b|\bmonteur\b/],
    ['Onderdelen',/\bonderdeel\b|\bmaterialen\b|\bbouwmarkt\b|\bgamma\b|\bpraxis\b|\bkarwei\b|\bhornbach\b|\bwatersportwinkel\b/],
    ['Boodschappen',/\bsupermarkt\b|\balbert heijn\b|\bjumbo\b|\blidl\b|\baldi\b|\bplus\b|\bcoop\b|\bboodschappen\b/]
  ];
  return rules.find(([,pattern])=>pattern.test(lower))?.[0]||null;
}

function applyReceiptOcrResult(text){
  const amount=extractReceiptAmount(text);
  const date=extractReceiptDate(text);
  const merchant=extractReceiptMerchant(text);
  const category=detectReceiptCategory(text);
  const items=extractReceiptItems(text);
  const details=buildReceiptDetails(text,{merchant,date,amount});
  const found=[];

  if(amount!==null){
    $('costAmount').value=amount.toFixed(2);
    found.push(`bedrag €${amount.toFixed(2).replace('.',',')}`);
  }
  if(date){
    $('costDate').value=date;
    found.push(`datum ${date.split('-').reverse().join('-')}`);
  }
  if(merchant){
    $('costDescription').value=merchant;
    found.push(`omschrijving ${merchant}`);
  }
  if(category){
    $('costCategory').value=category;
    found.push(`categorie ${category}`);
  }
  if(details){
    showCostReceiptDetails(details);
    if(items.length)found.push(`${items.length} artikelregels`);
  }

  setCostOcrStatus(
    found.length
      ?`Automatisch ingevuld: ${found.join(' · ')}. Controleer en corrigeer waar nodig.`
      :'De bon is gelezen, maar er konden geen betrouwbare gegevens worden ingevuld.',
    !found.length
  );
}

async function scanCostReceipt(file){
  if(!file?.type?.startsWith('image/')||receiptOcrRunning)return;

  receiptOcrRunning=true;
  $('costOcrRetryButton')?.classList.remove('hidden');
  setCostOcrStatus('Bon voorbereiden…');

  let worker=null;

  try{
    const Tesseract=await loadReceiptOcrLibrary();
    const image=await prepareReceiptImageForOcr(file);

    worker=await Tesseract.createWorker('nld+eng',1,{
      logger:message=>{
        if(message.status==='recognizing text'){
          setCostOcrStatus(`Bon lezen… ${Math.round(Number(message.progress||0)*100)}%`);
        }else if(message.status){
          setCostOcrStatus('Bon lezen…');
        }
      }
    });

    const result=await worker.recognize(image);
    lastReceiptOcrText=String(result?.data?.text||'');
    applyReceiptOcrResult(lastReceiptOcrText);
  }catch(error){
    console.error('Bon uitlezen mislukt:',error);
    setCostOcrStatus('Automatisch uitlezen lukte niet. De foto wordt wel gewoon toegevoegd.',true);
  }finally{
    if(worker){
      try{await worker.terminate()}catch(error){console.warn(error)}
    }
    receiptOcrRunning=false;
  }
}

function scanFirstPendingCostReceipt(){
  const image=pendingCostReceiptFiles.find(file=>file.type.startsWith('image/'));
  if(!image){
    setCostOcrStatus('Voeg eerst een foto van een bonnetje toe.',true);
    return;
  }
  scanCostReceipt(image);
}

async function uploadCostReceipts(costId,files){
  let failed=0;

  for(let index=0;index<files.length;index++){
    const file=files[index];
    setCostProgress(`Bonnetje ${index+1} van ${files.length} uploaden…`);

    const rawExtension=(file.name.split('.').pop()||'jpg').toLowerCase();
    const safeExtension=rawExtension.replace(/[^a-z0-9]/g,'')||'jpg';
    const path=`${currentBoat.id}/${costId}/${crypto.randomUUID()}.${safeExtension}`;

    const {error:uploadError}=await sb.storage
      .from(COST_RECEIPT_BUCKET)
      .upload(path,file,{
        cacheControl:'3600',
        upsert:false,
        contentType:file.type||'image/jpeg'
      });

    if(uploadError){
      console.error('Bon uploaden mislukt:',uploadError);
      failed++;
      continue;
    }

    const {error:metadataError}=await sb.from('cost_receipts').insert({
      cost_id:costId,
      boat_id:currentBoat.id,
      created_by:currentUser.id,
      storage_path:path,
      original_name:file.name,
      mime_type:file.type||'application/octet-stream'
    });

    if(metadataError){
      await sb.storage.from(COST_RECEIPT_BUCKET).remove([path]);
      console.error('Bon registreren mislukt:',metadataError);
      failed++;
    }
  }

  return failed;
}


function editCost(id,date,amount,category,description){
  const parsed=splitCostDescription(description);

  $('costId').value=id;
  $('costDate').value=date||localDateISO(new Date());
  $('costAmount').value=Number(amount||0).toFixed(2);
  $('costCategory').value=category||'Overig';
  $('costDescription').value=parsed.summary||'';
  $('costReceiptDetails').value=parsed.details||'';
  $('costReceiptDetailsWrap')?.classList.toggle('hidden',!parsed.details);

  $('costFormTitle').textContent='Kosten bewerken';
  $('costSaveButton').textContent='Wijzigingen opslaan';
  $('costCancelButton').classList.remove('hidden');
  openCostFormPanel();

  captainNavigate('costs');
  window.scrollTo({top:0,behavior:'smooth'});
}

function cancelCostEdit(){
  $('costId').value='';
  $('costDate').value=localDateISO(new Date());
  $('costAmount').value='';
  $('costDescription').value='';
  $('costReceiptDetails').value='';
  $('costReceiptDetailsWrap')?.classList.add('hidden');
  $('costCategory').value='Havengeld';
  $('costFormTitle').textContent='Kosten toevoegen';
  $('costSaveButton').textContent='Kosten opslaan';
  $('costCancelButton').classList.add('hidden');
  resetCostReceiptSelection();
  setCostProgress('');
  closeCostFormPanel();
}

async function addCost(){
  if(!currentBoat)return alert('Koppel eerst Serenity.');

  const id=$('costId').value.trim();
  const amount=Number(String($('costAmount').value||'').replace(',','.'));

  if(!Number.isFinite(amount)||amount<=0){
    return alert('Vul een geldig bedrag in.');
  }

  const row={
    boat_id:currentBoat.id,
    created_by:currentUser.id,
    expense_date:$('costDate').value,
    amount,
    category:$('costCategory').value,
    description:composeCostDescription(
      $('costDescription').value.trim(),
      $('costReceiptDetails')?.value.trim()||''
    )
  };

  $('costSaveButton').disabled=true;
  setCostProgress(id?'Kosten bijwerken…':'Kosten opslaan…');

  try{
    let costId=id;

    if(id){
      const {error}=await sb.from('costs')
        .update({
          expense_date:row.expense_date,
          amount:row.amount,
          category:row.category,
          description:row.description
        })
        .eq('id',id)
        .eq('boat_id',currentBoat.id);

      if(error)throw error;
    }else{
      const {data,error}=await sb.from('costs')
        .insert(row)
        .select('id')
        .single();

      if(error)throw error;
      costId=data.id;
    }

    const files=[...pendingCostReceiptFiles];
    const existingCount=(costReceiptCache[costId]||[]).length;

    if(existingCount+files.length>3){
      throw new Error('Deze kostenpost kan maximaal 3 bonnetjes bevatten.');
    }

    const failed=files.length
      ?await uploadCostReceipts(costId,files)
      :0;

    cancelCostEdit();

    setCostProgress(
      failed
        ?`Kosten opgeslagen, maar ${failed} bonnetje${failed===1?'':'s'} kon niet worden toegevoegd.`
        :id
          ?'Kosten bijgewerkt ✅'
          :'Kosten en bonnetjes opgeslagen ✅'
    );

    await loadCosts();
    renderFinance();
    setTimeout(()=>setCostProgress(''),2800);
  }catch(error){
    console.error('Kosten opslaan mislukt:',error);
    alert('Kosten opslaan mislukt: '+(error?.message||'onbekende fout'));
    setCostProgress('');
  }finally{
    $('costSaveButton').disabled=false;
  }
}

async function loadCostReceipts(){
  const {data,error}=await sb
    .from('cost_receipts')
    .select('*')
    .eq('boat_id',currentBoat.id)
    .order('created_at',{ascending:true});

  if(error){
    console.warn('Bonnetjes laden mislukt. Is de Cloud 5.1.4 SQL uitgevoerd?',error);
    return {};
  }

  const grouped={};

  for(const receipt of data||[]){
    const {data:signed,error:signedError}=await sb.storage
      .from(COST_RECEIPT_BUCKET)
      .createSignedUrl(receipt.storage_path,3600);

    if(signedError)continue;
    (grouped[receipt.cost_id]??=[]).push({
      ...receipt,
      url:signed.signedUrl
    });
  }

  return grouped;
}

function renderCostReceipts(costId){
  const receipts=costReceiptCache[costId]||[];
  if(!receipts.length)return '';

  return `<div class="cost-receipts">${receipts.map(receipt=>{
    const isImage=String(receipt.mime_type||'').startsWith('image/');
    if(isImage){
      return `<div class="cost-receipt-item">
        <img src="${esc(receipt.url)}" alt="Bonnetje" onclick="openLightbox(${JSON.stringify(receipt.url)})">
        <button onclick="deleteCostReceipt('${receipt.id}','${esc(receipt.storage_path)}')">×</button>
        <small>🧾 Bekijk bon</small>
      </div>`;
    }

    return `<div class="cost-receipt-item cost-receipt-pdf">
      <a href="${esc(receipt.url)}" target="_blank" rel="noopener">🧾 PDF-bon openen</a>
      <button onclick="deleteCostReceipt('${receipt.id}','${esc(receipt.storage_path)}')">×</button>
    </div>`;
  }).join('')}</div>`;
}

async function deleteCostReceipt(id,path){
  if(!confirm('Dit bonnetje verwijderen?'))return;

  const {error:storageError}=await sb.storage
    .from(COST_RECEIPT_BUCKET)
    .remove([path]);

  if(storageError)return alert('Bestand verwijderen mislukt: '+storageError.message);

  const {error}=await sb.from('cost_receipts').delete().eq('id',id);
  if(error)return alert('Bonnetje verwijderen mislukt: '+error.message);

  await loadCosts();
}

async function deleteCost(id){
  if(!confirm('Deze kostenpost en alle bijbehorende bonnetjes verwijderen?'))return;

  const receipts=costReceiptCache[id]||[];
  const paths=receipts.map(receipt=>receipt.storage_path).filter(Boolean);

  if(paths.length){
    const {error:storageError}=await sb.storage
      .from(COST_RECEIPT_BUCKET)
      .remove(paths);
    if(storageError)console.warn('Niet alle bonnetjes konden uit opslag worden verwijderd:',storageError);
  }

  const {error:receiptError}=await sb.from('cost_receipts').delete().eq('cost_id',id);
  if(receiptError)return alert('Bonnetjes verwijderen mislukt: '+receiptError.message);

  const {error}=await sb.from('costs').delete().eq('id',id);
  if(error)return alert(error.message);

  await loadCosts();
  renderFinance();
}

async function loadCosts(){
  const [{data,error},receipts]=await Promise.all([
    sb.from('costs')
      .select('*')
      .eq('boat_id',currentBoat.id)
      .order('expense_date',{ascending:false}),
    loadCostReceipts()
  ]);

  if(error){
    console.error('Kosten laden mislukt:',error);
    throw error;
  }

  costCache=data||[];
  costReceiptCache=receipts||{};

  $('dCosts').textContent='€'+costCache
    .reduce((sum,cost)=>sum+Number(cost.amount||0),0)
    .toFixed(0);

  updateDashboardFinanceSummary();

  $('costList').innerHTML=costCache.length
    ?costCache.map(cost=>{
      const parsed=splitCostDescription(cost.description);
      const detailsHtml=parsed.details
        ?`<details class="cost-details">
            <summary>🧾 Bekijk bon-details</summary>
            <div class="cost-details-content">${esc(parsed.details).replace(/\n/g,'<br>')}</div>
          </details>`
        :'';

      return `<div class="item cost-item">
        <h3>€${Number(cost.amount).toFixed(2)} · ${esc(cost.category)}</h3>
        <div class="small">${esc(cost.expense_date)} · ${esc(parsed.summary||'')}</div>
        ${detailsHtml}
        ${renderCostReceipts(cost.id)}
        <div class="cost-item-actions">
          <button class="cost-edit-button" onclick='editCost(
            ${JSON.stringify(cost.id)},
            ${JSON.stringify(cost.expense_date)},
            ${JSON.stringify(cost.amount)},
            ${JSON.stringify(cost.category)},
            ${JSON.stringify(cost.description||'')}
          )'>✏️ Bewerken</button>
          <button class="cost-delete-button" aria-label="Kosten verwijderen" onclick="deleteCost('${cost.id}')">🗑️</button>
        </div>
      </div>`;
    }).join('')
    :'<span class="small">Nog geen kosten.</span>';
}

function subscribeRealtime(){if(liveChannel)sb.removeChannel(liveChannel);liveChannel=sb.channel('serenity-'+currentBoat.id).on('postgres_changes',{event:'*',schema:'public',table:'pois',filter:`boat_id=eq.${currentBoat.id}`},loadPois).on('postgres_changes',{event:'*',schema:'public',table:'poi_photos',filter:`boat_id=eq.${currentBoat.id}`},loadPois).on('postgres_changes',{event:'*',schema:'public',table:'costs',filter:`boat_id=eq.${currentBoat.id}`},loadCosts).on('postgres_changes',{event:'*',schema:'public',table:'cost_receipts',filter:`boat_id=eq.${currentBoat.id}`},loadCosts).on('postgres_changes',{event:'*',schema:'public',table:'trips',filter:`boat_id=eq.${currentBoat.id}`},loadTrips).on('postgres_changes',{event:'*',schema:'public',table:'trip_photos',filter:`boat_id=eq.${currentBoat.id}`},loadTrips).on('postgres_changes',{event:'*',schema:'public',table:'boat_settings',filter:`boat_id=eq.${currentBoat.id}`},loadSettings).subscribe(s=>$('dSync').textContent=s==='SUBSCRIBED'?'Live':'…')}

function resetPoiFilters(render=true){
  if($('poiSearch'))$('poiSearch').value='';
  if($('poiFilterCategory'))$('poiFilterCategory').value='';
  if($('poiFilterRating'))$('poiFilterRating').value='0';
  if($('poiFilterExtra'))$('poiFilterExtra').value='';
  if(render)renderPoiList();
}
function renderPoiList(){if(!$('poiList'))return;const q=($('poiSearch')?.value||'').toLowerCase(),cat=$('poiFilterCategory')?.value||'',rating=Number($('poiFilterRating')?.value||0),extra=$('poiFilterExtra')?.value||'';const f=poiCache.filter(p=>{const h=[p.name,p.place,p.review,p.category].join(' ').toLowerCase();return(!q||h.includes(q))&&(!cat||p.category===cat)&&(!rating||Number(p.rating||0)>=rating)&&(extra!=='favorite'||p.is_favorite)&&(extra!=='photos'||(poiPhotoCache[p.id]||[]).length)&&(extra!=='notes'||String(p.review||'').trim())});$('poiList').innerHTML=f.length?f.map(p=>{const ph=(poiPhotoCache[p.id]||[]).map(x=>`<div class="photo-wrap"><img src="${esc(x.url)}" onclick="openLightbox(${JSON.stringify(x.url)})"><button class="photo-delete" onclick="deletePhoto('${x.id}','${esc(x.storage_path)}')">×</button></div>`).join('');return `<div class="item"><h3>${esc(p.name)}${p.is_favorite?' ⭐':''}</h3><div class="small">${esc(p.category)} · ${esc(p.place)} · ${'★★★★★'.slice(0,p.rating||0)}</div>${p.address?`<div class="small">📍 ${esc(p.address)}</div>`:''}<p>${esc(p.review)}</p>${ph?`<div class="photo-grid">${ph}</div>`:''}<button class="delete-mini" onclick="deletePoi('${p.id}')">🗑️</button><div class="item-actions"><button class="edit-button" onclick='editPoi(${JSON.stringify(p.id)},${JSON.stringify(p.name)},${JSON.stringify(p.category)},${JSON.stringify(p.place)},${JSON.stringify(p.address)},${JSON.stringify(p.rating)},${JSON.stringify(p.review)},${JSON.stringify(!!p.is_favorite)},${JSON.stringify(p.latitude)},${JSON.stringify(p.longitude)})'>Bewerken</button></div></div>`}).join(''):'<span class="small">Geen POI’s gevonden.</span>'}
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
  setPanelCollapsed('settingsFormWrap','settingsFormToggle',true);
}
function previewFuelCalculation(){if(!$('fuelPreview'))return;const h=Number($('tripHours').value)||0,l=Number($('tripFuelLiters').value)||(h&&settingsCache?.fuel_per_hour?h*Number(settingsCache.fuel_per_hour):0),c=Number($('tripFuelCost').value)||(l&&settingsCache?.fuel_price?l*Number(settingsCache.fuel_price):0);$('fuelPreview').textContent=l?`Geschat: ${l.toFixed(1)} liter · €${c.toFixed(2)}`:'Vul vaartijd in en stel verbruik/prijs in.'}
function currentIsoWeekValue(date=new Date()){
  const utc=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
  const day=utc.getUTCDay()||7;
  utc.setUTCDate(utc.getUTCDate()+4-day);
  const yearStart=new Date(Date.UTC(utc.getUTCFullYear(),0,1));
  const week=Math.ceil((((utc-yearStart)/86400000)+1)/7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2,'0')}`;
}

function updateFinanceFilterInputs(){
  const type=$('financePeriodType')?.value||'all';
  const today=localDateISO(new Date());

  ['day','week','month','year'].forEach(mode=>{
    $(`finance${mode.charAt(0).toUpperCase()+mode.slice(1)}Wrap`)
      ?.classList.toggle('hidden',type!==mode);
  });

  if(type==='day'&&!$('financeDay').value){
    $('financeDay').value=today;
  }
  if(type==='week'&&!$('financeWeek').value){
    $('financeWeek').value=currentIsoWeekValue();
  }
  if(type==='month'&&!$('financeMonth').value){
    $('financeMonth').value=today.slice(0,7);
  }
  if(type==='year'&&!$('financeYear').value){
    $('financeYear').value=String(new Date().getFullYear());
  }
}

function financeDateMatches(dateValue,type){
  const date=String(dateValue||'');
  if(!date)return false;

  if(type==='day'){
    const selected=$('financeDay')?.value||'';
    return !selected||date===selected;
  }

  if(type==='week'){
    const selected=$('financeWeek')?.value||'';
    if(!selected)return true;
    const [start,end]=getIsoWeekRange(selected);
    return date>=start&&date<=end;
  }

  if(type==='month'){
    const selected=$('financeMonth')?.value||'';
    return !selected||date.startsWith(selected);
  }

  if(type==='year'){
    const selected=$('financeYear')?.value||'';
    return !selected||date.startsWith(selected);
  }

  return true;
}

function financePeriodLabel(type){
  if(type==='day'){
    const value=$('financeDay')?.value||'';
    return value
      ?new Date(`${value}T12:00:00`).toLocaleDateString('nl-NL',{
          weekday:'long',
          day:'numeric',
          month:'long',
          year:'numeric'
        })
      :'Alle dagen';
  }

  if(type==='week'){
    const value=$('financeWeek')?.value||'';
    return value?`Week ${value.split('-W')[1]} van ${value.split('-W')[0]}`:'Alle weken';
  }

  if(type==='month'){
    const value=$('financeMonth')?.value||'';
    if(!value)return 'Alle maanden';
    const [year,month]=value.split('-').map(Number);
    return new Date(year,month-1,1).toLocaleDateString('nl-NL',{
      month:'long',
      year:'numeric'
    });
  }

  if(type==='year'){
    return $('financeYear')?.value||'Alle jaren';
  }

  return 'Alle perioden';
}

function populateFinanceYears(){
  const years=[...new Set([
    ...costCache.map(cost=>String(cost.expense_date||'').slice(0,4)),
    ...tripCache.map(trip=>String(trip.trip_date||'').slice(0,4)),
    String(new Date().getFullYear())
  ].filter(year=>/^\d{4}$/.test(year)))].sort().reverse();

  const select=$('financeYear');
  if(!select)return;

  const previous=select.value;
  select.innerHTML=years
    .map(year=>`<option value="${year}">${year}</option>`)
    .join('');

  if(years.includes(previous)){
    select.value=previous;
  }else{
    select.value=String(new Date().getFullYear());
  }
}


function formatEuro(value){
  return Number(value||0).toLocaleString('nl-NL',{
    style:'currency',
    currency:'EUR',
    minimumFractionDigits:2,
    maximumFractionDigits:2
  });
}

function getAllFinanceEntries(){
  const regular=costCache.map(cost=>({
    type:'cost',
    id:cost.id,
    date:cost.expense_date,
    category:cost.category||'Overig',
    description:costDescriptionSummary(cost.description),
    amount:Number(cost.amount||0)
  }));

  const fuel=tripCache
    .filter(trip=>Number(trip.fuel_cost||0)>0)
    .map(trip=>({
      type:'trip',
      id:trip.id,
      date:trip.trip_date,
      category:'Diesel',
      description:trip.title||`${trip.departure||''} - ${trip.arrival||''}`.trim()||'Brandstof vaartocht',
      amount:Number(trip.fuel_cost||0)
    }));

  return [...regular,...fuel]
    .filter(entry=>Number.isFinite(entry.amount)&&entry.amount>0)
    .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
}

function updateDashboardFinanceSummary(){
  const totalElement=$('dashboardFinanceTotal');
  const categoriesElement=$('dashboardFinanceCategories');
  if(!totalElement||!categoriesElement)return;

  const entries=getAllFinanceEntries();
  const total=entries.reduce((sum,entry)=>sum+entry.amount,0);
  totalElement.textContent=formatEuro(total);

  const groups={};
  entries.forEach(entry=>{
    groups[entry.category]=(groups[entry.category]||0)+entry.amount;
  });

  const top=Object.entries(groups)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,5);

  categoriesElement.innerHTML=top.length
    ?top.map(([category,value])=>`
      <button type="button" class="dashboard-category-chip"
        onclick='openFinanceFromDashboard(${JSON.stringify(category)})'>
        <span>${esc(category)}</span>
        <strong>${formatEuro(value)}</strong>
      </button>
    `).join('')
    :'<span class="small">Nog geen kosten beschikbaar.</span>';
}

function openFinanceFromDashboard(category=''){
  captainNavigate('finance');

  if($('financePeriodType'))$('financePeriodType').value='all';
  if($('financeCategory'))$('financeCategory').value=category||'';

  updateFinanceFilterInputs();
  renderFinance();

  setTimeout(()=>{
    const target=category
      ?$('financeDetailsCard')
      :document.querySelector('#finance .card.hero');
    target?.scrollIntoView({behavior:'smooth',block:'start'});
  },120);
}

function openFinanceCategory(category){
  if($('financeCategory'))$('financeCategory').value=category||'';
  renderFinance();
  setTimeout(()=>{
    $('financeDetailsCard')?.scrollIntoView({behavior:'smooth',block:'start'});
  },80);
}

function openFinanceMonth(month){
  if($('financePeriodType'))$('financePeriodType').value='month';
  if($('financeMonth'))$('financeMonth').value=month||'';
  updateFinanceFilterInputs();
  renderFinance();
  setTimeout(()=>{
    $('financeDetailsCard')?.scrollIntoView({behavior:'smooth',block:'start'});
  },80);
}

function renderFinanceDetails(regular,fuelTrips,periodType,selectedCategory){
  const container=$('financeDetails');
  const summary=$('financeDetailsSummary');
  if(!container||!summary)return;

  const entries=[
    ...regular.map(cost=>({
      type:'cost',
      id:cost.id,
      date:cost.expense_date,
      category:cost.category||'Overig',
      description:costDescriptionSummary(cost.description),
      amount:Number(cost.amount||0)
    })),
    ...fuelTrips.map(trip=>({
      type:'trip',
      id:trip.id,
      date:trip.trip_date,
      category:'Diesel',
      description:trip.title||`${trip.departure||''} - ${trip.arrival||''}`.trim()||'Brandstof vaartocht',
      amount:Number(trip.fuel_cost||0)
    }))
  ].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));

  const total=entries.reduce((sum,entry)=>sum+entry.amount,0);
  summary.textContent=`${financePeriodLabel(periodType)} · ${selectedCategory||'Alle categorieën'} · ${entries.length} ${entries.length===1?'post':'posten'} · ${formatEuro(total)}`;

  container.innerHTML=entries.length
    ?entries.map(entry=>`
      <button type="button" class="finance-detail-row"
        onclick="${entry.type==='cost'?"captainNavigate('costs')":"captainNavigate('logbook')"}">
        <span class="finance-detail-main">
          <b>${esc(entry.category)}</b>
          <small>${esc(entry.date||'')} · ${esc(entry.description||'')}</small>
        </span>
        <strong>${formatEuro(entry.amount)}</strong>
        <span class="finance-detail-arrow">›</span>
      </button>
    `).join('')
    :'<span class="small">Geen kosten binnen dit filter.</span>';
}

function renderFinance(){
  if(!$('fTotal'))return;

  populateFinanceYears();
  updateFinanceFilterInputs();

  const periodType=$('financePeriodType')?.value||'all';
  const selectedCategory=$('financeCategory')?.value||'';

  const regular=costCache.filter(cost=>{
    const periodOk=financeDateMatches(cost.expense_date,periodType);
    const categoryOk=!selectedCategory||cost.category===selectedCategory;
    return periodOk&&categoryOk;
  });

  const matchingTrips=tripCache.filter(trip=>
    financeDateMatches(trip.trip_date,periodType)
  );

  const fuelTrips=matchingTrips.filter(trip=>
    (!selectedCategory||selectedCategory==='Diesel')&&
    Number(trip.fuel_cost||0)>0
  );

  const regularTotal=regular.reduce(
    (sum,cost)=>sum+Number(cost.amount||0),
    0
  );
  const filteredFuel=fuelTrips.reduce(
    (sum,trip)=>sum+Number(trip.fuel_cost||0),
    0
  );
  const filteredTotal=regularTotal+filteredFuel;
  const filteredHours=matchingTrips.reduce(
    (sum,trip)=>sum+Number(trip.duration_hours||0),
    0
  );
  const itemCount=regular.length+fuelTrips.length;

  $('fTotal').textContent=formatEuro(filteredTotal);
  $('fCount').textContent=String(itemCount);
  $('fFuel').textContent=formatEuro(filteredFuel);
  $('fPerHour').textContent=filteredHours
    ?formatEuro(filteredTotal/filteredHours)
    :formatEuro(0);

  const categoryLabel=selectedCategory||'Alle categorieën';
  $('financeFilterSummary').textContent=
    `${financePeriodLabel(periodType)} · ${categoryLabel} · ${itemCount} ${itemCount===1?'post':'posten'}`;

  const groups={};
  regular.forEach(cost=>{
    const category=cost.category||'Overig';
    groups[category]=(groups[category]||0)+Number(cost.amount||0);
  });
  if(fuelTrips.length){
    groups.Diesel=(groups.Diesel||0)+filteredFuel;
  }

  const max=Math.max(1,...Object.values(groups));
  $('financeBreakdown').innerHTML=Object.entries(groups)
    .sort((a,b)=>b[1]-a[1])
    .map(([category,value])=>`
      <button type="button" class="finance-row finance-row-button"
        onclick='openFinanceCategory(${JSON.stringify(category)})'>
        <div>
          <b>${esc(category)}</b>
          <div class="finance-bar">
            <span style="width:${Math.round(value/max*100)}%"></span>
          </div>
        </div>
        <div class="finance-row-value">${formatEuro(value)} <span>›</span></div>
      </button>
    `).join('')||'<span class="small">Geen kosten binnen dit filter.</span>';

  const months={};
  regular.forEach(cost=>{
    const month=String(cost.expense_date||'').slice(0,7);
    if(month)months[month]=(months[month]||0)+Number(cost.amount||0);
  });
  fuelTrips.forEach(trip=>{
    const month=String(trip.trip_date||'').slice(0,7);
    if(month)months[month]=(months[month]||0)+Number(trip.fuel_cost||0);
  });

  $('financeMonths').innerHTML=Object.entries(months)
    .sort((a,b)=>b[0].localeCompare(a[0]))
    .map(([month,value])=>{
      const [year,monthNumber]=month.split('-').map(Number);
      const label=new Date(year,monthNumber-1,1).toLocaleDateString('nl-NL',{
        month:'long',
        year:'numeric'
      });
      return `
        <button type="button" class="finance-row finance-row-button"
          onclick='openFinanceMonth(${JSON.stringify(month)})'>
          <div>${esc(label)}</div>
          <div class="finance-row-value">${formatEuro(value)} <span>›</span></div>
        </button>
      `;
    }).join('')||'<span class="small">Geen maandgegevens binnen dit filter.</span>';

  renderFinanceDetails(regular,fuelTrips,periodType,selectedCategory);
  updateDashboardFinanceSummary();
}
function parsePoiCoordinateInput(value,maximum){
  if(value===null||value===undefined||value==='')return null;
  const cleaned=String(value).trim().replace(',','.');
  const number=Number(cleaned);
  return Number.isFinite(number)&&Math.abs(number)<=maximum?number:null;
}

function getPoiMapPosition(poi){
  let lat=parsePoiCoordinateInput(poi?.latitude,90);
  let lon=parsePoiCoordinateInput(poi?.longitude,180);
  let swapped=false;

  // Zeer waarschijnlijk omgewisselde Nederlandse/Europese coördinaten:
  // bijvoorbeeld 6.12, 52.25 in plaats van 52.25, 6.12.
  if(lat!==null&&lon!==null&&Math.abs(lat)<=25&&Math.abs(lon)>=35&&Math.abs(lon)<=70){
    [lat,lon]=[lon,lat];
    swapped=true;
  }

  return {lat,lon,swapped,valid:lat!==null&&lon!==null};
}

function setPoiPickerLocation(lat,lon,move=true){
  const parsedLat=parsePoiCoordinateInput(lat,90);
  const parsedLon=parsePoiCoordinateInput(lon,180);
  if(parsedLat===null||parsedLon===null)return;

  poiPickerSelection={lat:parsedLat,lon:parsedLon};
  if(poiPickerMarker)poiPickerMarker.setLatLng([parsedLat,parsedLon]);
  else poiPickerMarker=L.marker([parsedLat,parsedLon],{draggable:true}).addTo(poiPickerMap);

  poiPickerMarker.off('dragend');
  poiPickerMarker.on('dragend',event=>{
    const position=event.target.getLatLng();
    setPoiPickerLocation(position.lat,position.lng,false);
  });

  $('pickerCoordinates').textContent=`Breedtegraad ${parsedLat.toFixed(6)} · Lengtegraad ${parsedLon.toFixed(6)}`;
  if(move)poiPickerMap.setView([parsedLat,parsedLon],15);
}

function ensurePoiPickerMap(){
  if(poiPickerMap)return;

  poiPickerMap=L.map('poiPickerMap',{
    preferCanvas:true,
    tap:false
  }).setView([52.2,5.5],7);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'&copy; OpenStreetMap',
    keepBuffer:4
  }).addTo(poiPickerMap);

  poiPickerMap.on('click',event=>{
    setPoiPickerLocation(event.latlng.lat,event.latlng.lng,false);
  });
}

function openPoiMapPicker(){
  poiPickerTargetId=null;
  $('poiMapPicker').classList.remove('hidden');
  document.body.style.overflow='hidden';
  ensurePoiPickerMap();

  const lat=parsePoiCoordinateInput($('poiLatitude').value,90);
  const lon=parsePoiCoordinateInput($('poiLongitude').value,180);

  setTimeout(()=>{
    poiPickerMap.invalidateSize({pan:false});
    if(lat!==null&&lon!==null){
      setPoiPickerLocation(lat,lon,true);
    }else{
      poiPickerMap.setView([52.2,5.5],7);
      $('pickerCoordinates').textContent='Tik op de juiste locatie op de kaart';
    }
  },120);
}

function openPoiLocationCorrection(id){
  const poi=getPoiById(id);
  if(!poi)return alert('Deze POI kon niet worden gevonden.');

  poiPickerTargetId=poi.id;
  const position=getPoiMapPosition(poi);

  mapInstance?.closePopup();
  closePoiDetails();

  $('poiMapPicker').classList.remove('hidden');
  document.body.style.overflow='hidden';
  ensurePoiPickerMap();

  setTimeout(()=>{
    poiPickerMap.invalidateSize({pan:false});
    if(position.valid){
      setPoiPickerLocation(position.lat,position.lon,true);
    }else{
      poiPickerMap.setView([52.2,5.5],7);
      $('pickerCoordinates').textContent='Tik op de juiste locatie van deze favoriet';
    }
  },120);
}

async function confirmPoiMapSelection(){
  if(!poiPickerSelection)return alert('Tik eerst op een plek op de kaart.');

  if(poiPickerTargetId){
    const targetId=poiPickerTargetId;
    const {error}=await sb.from('pois').update({
      latitude:Number(poiPickerSelection.lat.toFixed(7)),
      longitude:Number(poiPickerSelection.lon.toFixed(7)),
      updated_at:new Date().toISOString()
    }).eq('id',targetId).eq('boat_id',currentBoat.id);

    if(error)return alert('Locatie opslaan mislukt: '+error.message);

    closePoiMapPicker();
    await loadPois();
    renderPoiMarkers();
    fitPoiMarkers(false);
    showAppToast('Locatie bijgewerkt ✅');
    return;
  }

  $('poiLatitude').value=poiPickerSelection.lat.toFixed(6);
  $('poiLongitude').value=poiPickerSelection.lon.toFixed(6);
  closePoiMapPicker();
}

function closePoiMapPicker(){
  $('poiMapPicker').classList.add('hidden');
  document.body.style.overflow='';
  poiPickerTargetId=null;
  poiPickerSelection=null;
  if(poiPickerMarker){
    poiPickerMarker.remove();
    poiPickerMarker=null;
  }
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
  return parsePoiCoordinateInput(value,maximum);
}

function hasPoiLocation(poi){
  return getPoiMapPosition(poi).valid;
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
  const favoritesButton=$('favoritesMapButton');
  const allButton=$('allPoiMapButton');
  if(!status)return;

  const allFavorites=poiCache.filter(isFavoritePoi);
  const favoritesWithLocation=allFavorites.filter(hasPoiLocation);
  const favoritesWithoutLocation=allFavorites.length-favoritesWithLocation.length;
  const visibleWithLocation=visiblePois.filter(hasPoiLocation).length;
  const autoSwapped=visiblePois.filter(poi=>getPoiMapPosition(poi).swapped).length;

  favoritesButton?.classList.toggle('poi-filter-active',favoritesOnly);
  allButton?.classList.toggle('poi-filter-active',!favoritesOnly);

  const parts=[];
  if(favoritesOnly){
    parts.push(`Filter: alleen favorieten`);
    parts.push(`${favoritesWithLocation.length} zichtbaar`);
  }else{
    parts.push(`Filter: alle POI’s`);
    parts.push(`${visibleWithLocation} zichtbaar`);
    if(favoritesWithLocation.length)parts.push(`${favoritesWithLocation.length} favoriet`);
  }

  if(autoSwapped){
    parts.push(`${autoSwapped} locatie${autoSwapped===1?'':'s'} automatisch rechtgezet`);
  }
  if(favoritesWithoutLocation){
    parts.push(`${favoritesWithoutLocation} favoriet${favoritesWithoutLocation===1?' heeft':'en hebben'} geen locatie`);
  }

  status.textContent=parts.join(' · ');
  status.classList.toggle('warning',favoritesWithoutLocation>0||autoSwapped>0);
}

function renderPoiMarkers(){
  if(!mapInstance||!poiLayer)return;

  poiLayer.clearLayers();
  const visiblePois=poiCache.filter(poi=>!favoritesOnly||isFavoritePoi(poi));

  visiblePois.forEach(poi=>{
    const position=getPoiMapPosition(poi);
    if(!position.valid)return;
    const {lat,lon}=position;

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
          <button onclick="openPoiRouteInWaterkaarten('${poi.id}')">🧭 Kopieer bestemming en open Waterkaarten</button>
          <button class="secondary" onclick="showPoiDetails('${poi.id}')">Meer info</button>
          <button class="secondary location-correction-button" onclick="openPoiLocationCorrection('${poi.id}')">📍 Locatie corrigeren</button>
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
  const position=getPoiMapPosition(poi);
  const lat=position.lat;
  const lon=position.lon;
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
      <button onclick="openPoiRouteInWaterkaarten('${poi.id}')">🧭 Kopieer bestemming en open Waterkaarten</button>
      <button class="secondary" onclick="openPoiLocationCorrection('${poi.id}')">📍 Locatie corrigeren</button>
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
    .map(poi=>{
      const position=getPoiMapPosition(poi);
      return [position.lat,position.lon];
    });
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

function showFavoritesOnly(){
  favoritesOnly=true;
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
  if(!row.fuel_liters&&row.duration_hours&&settingsCache?.fuel_per_hour)row.fuel_liters=Number(row.duration_hours)*Number(settingsCache.fuel_per_hour);if(!row.fuel_cost&&row.fuel_liters&&settingsCache?.fuel_price)row.fuel_cost=Number(row.fuel_liters)*Number(settingsCache.fuel_price);await sb.from('trips').update({fuel_liters:row.fuel_liters,fuel_cost:row.fuel_cost}).eq('id',tripId);const routeFile=pendingTripRouteFile||$('tripGpx').files[0];
  if(routeFile){
    setTripProgress('Route uit Waterkaarten verwerken…');

    let routeGeojson=pendingTripRouteDetails?.geojson||null;
    try{
      if(!routeGeojson){
        routeGeojson=await parseRouteFile(routeFile);
      }
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

  if(pendingTripRouteFingerprint){
    markRouteFingerprintImported(pendingTripRouteFingerprint);
  }

  clearTripForm();
  await loadTrips();
}

function setTripProgress(text){
  $('tripProgress').textContent=text;
  $('tripProgress').classList.toggle('hidden',!text);
}


function setPanelCollapsed(wrapId,toggleId,collapsed=true){
  const wrap=$(wrapId);
  const toggle=$(toggleId);

  if(!wrap)return;

  wrap.classList.toggle('hidden',collapsed);
  toggle?.classList.toggle('open',!collapsed);
}

function collapseDefaultPanels(section=''){
  if(!section||section==='pois'){
    if(!$('poiId')?.value)setPanelCollapsed('poiFormWrap','poiFormToggle',true);
    setPanelCollapsed('poiSearchWrap','poiSearchToggle',true);
  }

  if(!section||section==='logbook'){
    if(!$('tripId')?.value&&!pendingTripRouteDetails&&!pendingTripRouteFile){
      setTripFormCollapsed(true);
    }
    setPanelCollapsed('tripSearchWrap','tripSearchToggle',true);
  }

  if(!section||section==='costs'){
    if(!$('costId')?.value)setPanelCollapsed('costFormWrap','costFormToggle',true);
  }

  if(!section||section==='finance'){
    setPanelCollapsed('financeFilterWrap','financeFilterToggle',true);
  }

  if(!section||section==='settings'){
    setPanelCollapsed('settingsFormWrap','settingsFormToggle',true);
  }
}

function openPoiFormPanel(){
  setPanelCollapsed('poiFormWrap','poiFormToggle',false);
}

function closePoiFormPanel(){
  setPanelCollapsed('poiFormWrap','poiFormToggle',true);
}

function openCostFormPanel(){
  setPanelCollapsed('costFormWrap','costFormToggle',false);
}

function closeCostFormPanel(){
  setPanelCollapsed('costFormWrap','costFormToggle',true);
}

function setTripFormCollapsed(collapsed=true){
  const wrap=$('tripFormWrap');
  const toggle=$('tripFormToggle');

  if(!wrap)return;

  wrap.classList.toggle('hidden',collapsed);
  toggle?.classList.toggle('open',!collapsed);
}

function openTripForm(){
  setTripFormCollapsed(false);
}

function closeTripForm(){
  setTripFormCollapsed(true);
}

function clearTripForm(){
  ['tripId','tripTitle','tripFrom','tripTo','tripDistance','tripHours','tripFuelLiters','tripFuelCost','tripCrew','tripNotes']
    .forEach(id=>$(id).value='');

  $('tripPhotos').value='';
  $('tripGpx').value='';
  $('tripDate').value=new Date().toISOString().slice(0,10);
  $('tripCrew').value='Michel, Desi';
  $('tripFormTitle').textContent='Nieuwe vaartocht';
  $('tripSaveButton').textContent='Vaartocht opslaan';
  $('tripCancelButton').classList.add('hidden');

  pendingTripRouteDetails=null;
  pendingTripRouteFile=null;
  pendingTripRouteFingerprint=null;
  const importStatus=$('tripRouteImportStatus');
  importStatus?.classList.add('hidden');
  if(importStatus)importStatus.innerHTML='';

  setTripProgress('');
  closeTripForm();
}
function cancelTripEdit(){clearTripForm()}
function editTrip(id,tripDate,title,departure,arrival,distance,hours,fuelLiters,fuelCost,crew,notes){
  pendingTripRouteDetails=null;
  $('tripRouteImportStatus')?.classList.add('hidden');
  $('tripId').value=id;
  $('tripDate').value=tripDate||'';
  $('tripTitle').value=title||'';
  $('tripFrom').value=departure||'';
  $('tripTo').value=arrival||'';
  $('tripDistance').value=distance??'';
  $('tripHours').value=hours??'';$('tripFuelLiters').value=fuelLiters??'';$('tripFuelCost').value=fuelCost??'';
  $('tripCrew').value=crew||'';
  $('tripNotes').value=notes||'';
  $('tripFormTitle').textContent='Vaartocht bewerken';openTripForm();
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
  updateDashboardFinanceSummary();
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

  collapseDefaultPanels(id);

  document.querySelectorAll('.bottom-nav-item').forEach(button=>{
    button.classList.toggle('active',button.dataset.target===id);
  });

  if(id==='live' && typeof initLiveMode==='function')setTimeout(()=>initLiveMode(),80);
  if(id==='map' && typeof initMap==='function')setTimeout(()=>initMap(),80);
  if(id==='dashboard'){
    if(typeof updateLatestRouteDashboard==='function')setTimeout(()=>updateLatestRouteDashboard(),80);
    if(typeof updateDashboardFinanceSummary==='function')updateDashboardFinanceSummary();
  }
  if(id==='pois'){
    resetPoiFilters(false);
    renderPoiList();
    if(currentBoat){
      loadPois().catch(error=>console.error('POI opnieuw laden mislukt:',error));
    }
  }
  if(id==='logbook'){
    const editing=Boolean($('tripId')?.value);
    const imported=Boolean(pendingTripRouteDetails||pendingTripRouteFile);

    if(!editing&&!imported){
      closeTripForm();
    }

    setTimeout(()=>autoCheckSavedICloudRouteFolder(),150);
  }
  if(id==='finance' && typeof renderFinance==='function')renderFinance();
  if(id==='settings'){
    if(typeof loadSettingsForm==='function')loadSettingsForm();
    if(typeof loadDashboardPhoto==='function')loadDashboardPhoto();
  }
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
    maxSpeedKmh:0,
    accuracy:null,
    engineRpm:0,
    rudderAngle:0,
    weather:null,
    weatherUpdatedAt:null,
    lastWeatherLat:null,
    lastWeatherLon:null,
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
      maxSpeedKmh:Number(saved.maxSpeedKmh)||0,
      engineRpm:Number(saved.engineRpm)||0,
      rudderAngle:Number(saved.rudderAngle)||0,
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



function cleanLivePlaceName(value){
  return String(value||'')
    .trim()
    .split(',')[0]
    .replace(/\s*\([^)]*\)\s*$/,'')
    .replace(/^(gemeente|provincie)\s+/i,'')
    .trim();
}

async function reverseLivePlaceName(coordinate){
  if(!Array.isArray(coordinate)||coordinate.length<2)return '';

  const longitude=Number(coordinate[0]);
  const latitude=Number(coordinate[1]);

  if(!Number.isFinite(latitude)||!Number.isFinite(longitude))return '';

  try{
    const params=new URLSearchParams({
      lat:String(latitude),
      lon:String(longitude),
      rows:'5',
      type:'woonplaats'
    });

    const response=await fetch(
      `https://api.pdok.nl/bzk/locatieserver/search/v3_1/reverse?${params.toString()}`,
      {headers:{Accept:'application/json'}}
    );

    if(!response.ok)return '';

    const payload=await response.json();
    const docs=Array.isArray(payload?.response?.docs)
      ?payload.response.docs
      :[];

    const woonplaats=docs
      .map(doc=>String(doc.woonplaatsnaam||'').trim())
      .find(Boolean);

    if(woonplaats)return cleanLivePlaceName(woonplaats);

    const plaatsResult=docs.find(doc=>
      String(doc.type||'').toLowerCase()==='woonplaats'
    );

    return cleanLivePlaceName(
      plaatsResult?.naam||
      plaatsResult?.weergavenaam||
      ''
    );
  }catch(error){
    console.warn('Woonplaats voor live vaartocht bepalen mislukt:',error);
    return '';
  }
}

function updateLiveRouteTitle(){
  const departure=cleanLivePlaceName($('liveFrom')?.value);
  const arrival=cleanLivePlaceName($('liveTo')?.value);
  const title=$('liveTitle');

  if(title){
    title.value=departure&&arrival
      ?`${departure} - ${arrival}`
      :'';
  }

  const status=$('liveRouteNameStatus');
  if(!status)return;

  if(departure&&arrival){
    status.textContent=`Wordt opgeslagen als: ${departure} - ${arrival}`;
    status.classList.add('success');
  }else{
    status.textContent='Vertrek en aankomst moeten beide ingevuld zijn voordat je kunt opslaan.';
    status.classList.remove('success');
  }
}

async function fillLiveDepartureAndArrival(force=false){
  if(!Array.isArray(liveNavState.points)||liveNavState.points.length<2){
    updateLiveRouteTitle();
    return false;
  }

  const first=liveNavState.points[0];
  const last=liveNavState.points[liveNavState.points.length-1];
  const fromInput=$('liveFrom');
  const toInput=$('liveTo');
  const status=$('liveRouteNameStatus');

  const needDeparture=force||!String(fromInput?.value||'').trim();
  const needArrival=force||!String(toInput?.value||'').trim();

  if(!needDeparture&&!needArrival){
    updateLiveRouteTitle();
    return true;
  }

  if(status){
    status.textContent='Vertrek en aankomst bepalen via de GPS-route…';
    status.classList.remove('success');
  }

  const [departure,arrival]=await Promise.all([
    needDeparture
      ?reverseLivePlaceName([Number(first.lon),Number(first.lat)])
      :Promise.resolve(String(fromInput.value||'').trim()),
    needArrival
      ?reverseLivePlaceName([Number(last.lon),Number(last.lat)])
      :Promise.resolve(String(toInput.value||'').trim())
  ]);

  if(needDeparture&&departure)fromInput.value=departure;
  if(needArrival&&arrival)toInput.value=arrival;

  updateLiveRouteTitle();

  return Boolean(
    String(fromInput?.value||'').trim()&&
    String(toInput?.value||'').trim()
  );
}

function validateLiveDepartureAndArrival(){
  const departure=String($('liveFrom')?.value||'').trim();
  const arrival=String($('liveTo')?.value||'').trim();

  if(!departure){
    alert('Vul de vertrekplaats in.');
    $('liveFrom')?.focus();
    return false;
  }

  if(!arrival){
    alert('Vul de aankomstplaats in.');
    $('liveTo')?.focus();
    return false;
  }

  updateLiveRouteTitle();
  return true;
}

function fillLiveTripDefaults(force=false){
  if(force||!String($('liveCrew')?.value||'').trim()){
    $('liveCrew').value='Michel, Desi';
  }

  if(force){
    $('liveFrom').value='';
    $('liveTo').value='';
  }

  updateLiveRouteTitle();
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
  $('liveMaxSpeed').textContent=formatDecimal(liveNavState.maxSpeedKmh,1);
  $('liveDistance').textContent=formatDecimal(liveNavState.distanceKm,2);
  $('liveDuration').textContent=formatLiveDuration(elapsedMs);
  $('liveAverage').textContent=formatDecimal(average,1);
  $('liveAccuracy').textContent=Number.isFinite(Number(liveNavState.accuracy))
    ?`${Math.round(liveNavState.accuracy)} m`
    :'–';

  renderLiveWeather();
  renderLiveInstruments();

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
  $('liveGpsStatus').textContent='GPS-opname gestart. Waterkaarten wordt geopend…';

  persistLiveState();
  startLiveGpsWatch();
  requestLiveWakeLock();
  renderLiveState();

  showAppToast('Live varen gestart · Waterkaarten wordt geopend');

  // De opname is al lokaal opgeslagen voordat MijnSerenity naar Waterkaarten schakelt.
  setTimeout(()=>{
    openWaterkaarten();
  },350);
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

async function stopLiveNavigation(){
  if(liveNavState.status==='active'){
    liveNavState.accumulatedMs=getLiveElapsedMs();
  }

  liveNavState.segmentStartedAt=null;
  liveNavState.status='stopped';
  liveNavState.speedKmh=0;
  stopLiveGpsWatch();
  releaseLiveWakeLock();
  persistLiveState();
  renderLiveState();

  const saveButton=$('liveSaveButton');
  if(saveButton)saveButton.disabled=true;

  if(liveNavState.points.length>=2){
    $('liveGpsStatus').textContent='Opname gereed. Vertrek en aankomst worden bepaald…';

    const complete=await fillLiveDepartureAndArrival(false);

    $('liveGpsStatus').textContent=complete
      ?'Opname gereed. Controleer vertrek en aankomst en sla de vaartocht op.'
      :'Opname gereed. Vul vertrek en aankomst handmatig aan en sla daarna op.';
  }else{
    $('liveGpsStatus').textContent='Te weinig GPS-punten. Laat de opname iets langer lopen.';
    updateLiveRouteTitle();
  }

  if(saveButton)saveButton.disabled=false;
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


function weatherCodeDescription(code){
  const value=Number(code);
  if(value===0)return 'Helder';
  if([1,2].includes(value))return 'Licht bewolkt';
  if(value===3)return 'Bewolkt';
  if([45,48].includes(value))return 'Mist';
  if([51,53,55,56,57].includes(value))return 'Motregen';
  if([61,63,65,66,67].includes(value))return 'Regen';
  if([71,73,75,77].includes(value))return 'Sneeuw';
  if([80,81,82].includes(value))return 'Regenbuien';
  if([85,86].includes(value))return 'Sneeuwbuien';
  if([95,96,99].includes(value))return 'Onweer';
  return 'Onbekend';
}

function weatherSummary(weather){
  if(!weather)return 'Wachten op GPS';
  const description=weatherCodeDescription(weather.weatherCode);
  const wind=Number.isFinite(Number(weather.windSpeed))
    ?`${Number(weather.windSpeed).toFixed(0)} km/u wind`
    :'';
  return [description,wind].filter(Boolean).join(' · ');
}

function liveWeatherDistanceKm(lat,lon){
  if(!Number.isFinite(Number(liveNavState.lastWeatherLat))||
     !Number.isFinite(Number(liveNavState.lastWeatherLon))){
    return Infinity;
  }

  return haversineKm(
    {lat:Number(liveNavState.lastWeatherLat),lon:Number(liveNavState.lastWeatherLon)},
    {lat:Number(lat),lon:Number(lon)}
  );
}

function renderLiveWeather(){
  const weather=liveNavState.weather;

  $('liveWeatherTemp').textContent=weather&&Number.isFinite(Number(weather.temperature))
    ?`${Number(weather.temperature).toFixed(1)}°`
    :'–';
  $('liveWeatherShort').textContent=weatherSummary(weather);

  $('liveWeatherTemperature').textContent=weather&&Number.isFinite(Number(weather.temperature))
    ?`${Number(weather.temperature).toFixed(1)} °C`
    :'–';
  $('liveWeatherFeels').textContent=weather&&Number.isFinite(Number(weather.apparentTemperature))
    ?`${Number(weather.apparentTemperature).toFixed(1)} °C`
    :'–';
  $('liveWeatherWind').textContent=weather&&Number.isFinite(Number(weather.windSpeed))
    ?`${Number(weather.windSpeed).toFixed(1)} km/u`
    :'–';
  $('liveWeatherGusts').textContent=weather&&Number.isFinite(Number(weather.windGusts))
    ?`${Number(weather.windGusts).toFixed(1)} km/u`
    :'–';
  $('liveWeatherRain').textContent=weather&&Number.isFinite(Number(weather.precipitation))
    ?`${Number(weather.precipitation).toFixed(1)} mm`
    :'–';
  $('liveWeatherDescription').textContent=weather
    ?weatherCodeDescription(weather.weatherCode)
    :'Wachten op GPS';

  if(weather&&liveNavState.weatherUpdatedAt){
    const time=new Date(liveNavState.weatherUpdatedAt).toLocaleTimeString('nl-NL',{
      hour:'2-digit',
      minute:'2-digit'
    });
    $('liveWeatherStatus').textContent=`Actueel weer bij de route · bijgewerkt ${time}`;
  }
}

async function fetchLiveWeather(lat,lon,force=false){
  if(!Number.isFinite(Number(lat))||!Number.isFinite(Number(lon)))return;

  const age=Date.now()-Number(liveNavState.weatherUpdatedAt||0);
  const movedKm=liveWeatherDistanceKm(lat,lon);

  if(!force&&liveNavState.weather&&age<15*60*1000&&movedKm<5){
    return;
  }

  $('liveWeatherStatus').textContent='Actueel weer ophalen…';

  try{
    const params=new URLSearchParams({
      latitude:String(Number(lat).toFixed(6)),
      longitude:String(Number(lon).toFixed(6)),
      current:[
        'temperature_2m',
        'apparent_temperature',
        'precipitation',
        'weather_code',
        'wind_speed_10m',
        'wind_gusts_10m'
      ].join(','),
      wind_speed_unit:'kmh',
      timezone:'auto'
    });

    const response=await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
      {headers:{Accept:'application/json'}}
    );

    if(!response.ok){
      throw new Error(`Weerservice gaf fout ${response.status}`);
    }

    const payload=await response.json();
    const current=payload?.current;

    if(!current){
      throw new Error('Geen actuele weergegevens ontvangen.');
    }

    liveNavState.weather={
      temperature:Number(current.temperature_2m),
      apparentTemperature:Number(current.apparent_temperature),
      precipitation:Number(current.precipitation),
      weatherCode:Number(current.weather_code),
      windSpeed:Number(current.wind_speed_10m),
      windGusts:Number(current.wind_gusts_10m)
    };
    liveNavState.weatherUpdatedAt=Date.now();
    liveNavState.lastWeatherLat=Number(lat);
    liveNavState.lastWeatherLon=Number(lon);

    persistLiveState();
    renderLiveWeather();
  }catch(error){
    console.error('Live weer ophalen mislukt:',error);
    $('liveWeatherStatus').textContent='Weer kon niet worden opgehaald. Tik op Weer om opnieuw te proberen.';
  }
}

async function refreshLiveWeather(force=false){
  const latest=liveNavState.points.at(-1);

  if(latest){
    await fetchLiveWeather(latest.lat,latest.lon,force);
    return;
  }

  if(!navigator.geolocation){
    $('liveWeatherStatus').textContent='Dit apparaat ondersteunt geen GPS-locatie.';
    return;
  }

  $('liveWeatherStatus').textContent='GPS-locatie ophalen voor het weer…';

  navigator.geolocation.getCurrentPosition(
    position=>fetchLiveWeather(
      position.coords.latitude,
      position.coords.longitude,
      true
    ),
    ()=>{$('liveWeatherStatus').textContent='Geef locatietoegang om het weer op te halen.';},
    {enableHighAccuracy:true,maximumAge:60000,timeout:15000}
  );
}

function formatRudderAngle(value){
  const angle=Math.max(-35,Math.min(35,Number(value)||0));
  if(Math.abs(angle)<1)return 'Midden';
  return angle<0
    ?`BB ${Math.abs(angle).toFixed(0)}°`
    :`SB ${angle.toFixed(0)}°`;
}

function updateLiveEngineRpm(value){
  liveNavState.engineRpm=Math.max(0,Math.min(5000,Number(value)||0));
  persistLiveState();
  renderLiveState();
}

function updateLiveRudderAngle(value){
  liveNavState.rudderAngle=Math.max(-35,Math.min(35,Number(value)||0));
  persistLiveState();
  renderLiveState();
}

function renderLiveInstruments(){
  const rpm=Math.max(0,Number(liveNavState.engineRpm)||0);
  const rudder=Number(liveNavState.rudderAngle)||0;
  const rudderText=formatRudderAngle(rudder);

  $('liveEngineRpm').textContent=Math.round(rpm).toLocaleString('nl-NL');
  $('liveRudderDisplay').textContent=rudderText;

  if($('liveEngineRpmInput')&&document.activeElement!==$('liveEngineRpmInput')){
    $('liveEngineRpmInput').value=String(Math.round(rpm));
  }
  if($('liveRudderInput')&&document.activeElement!==$('liveRudderInput')){
    $('liveRudderInput').value=String(Math.round(rudder));
  }
  $('liveRudderInputDisplay').textContent=rudderText;
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
    liveNavState.maxSpeedKmh=Math.max(
      Number(liveNavState.maxSpeedKmh)||0,
      Number(liveNavState.speedKmh)||0
    );

    // Voorkomt GPS-dwarrelen wanneer Serenity vrijwel stil ligt.
    if(segmentKm<0.004&&seconds<12){
      $('liveGpsStatus').textContent=`GPS actief · nauwkeurigheid ${Math.round(point.accuracy||0)} m`;
      renderLiveState();
      return;
    }

    liveNavState.distanceKm+=segmentKm;
  }else{
    liveNavState.speedKmh=Number.isFinite(point.speed)?point.speed:0;
    liveNavState.maxSpeedKmh=Math.max(
      Number(liveNavState.maxSpeedKmh)||0,
      Number(liveNavState.speedKmh)||0
    );
  }

  liveNavState.points.push(point);
  if(liveNavState.points.length>20000){
    liveNavState.points=liveNavState.points.filter((_,index)=>index%2===0);
  }

  $('liveGpsStatus').textContent=`GPS actief · ${liveNavState.points.length} routepunten · nauwkeurigheid ${Math.round(point.accuracy||0)} m`;
  persistLiveState();
  renderLiveState();
  renderLiveRoute();
  fetchLiveWeather(point.lat,point.lon,false);
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
  const saveButton=$('liveSaveButton');

  saveStatus.textContent='Vertrek en aankomst controleren…';
  saveStatus.classList.remove('hidden');
  saveButton.disabled=true;

  try{
    await fillLiveDepartureAndArrival(false);

    if(!validateLiveDepartureAndArrival()){
      saveStatus.textContent='Vul vertrek en aankomst in om de vaartocht op te slaan.';
      return;
    }

    const departure=cleanLivePlaceName($('liveFrom').value);
    const arrival=cleanLivePlaceName($('liveTo').value);

    $('liveFrom').value=departure;
    $('liveTo').value=arrival;

    const title=`${departure} - ${arrival}`;
    $('liveTitle').value=title;

    saveStatus.textContent=`${title} opslaan…`;

    const durationHours=getLiveElapsedMs()/3600000;
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
      departure,
      arrival,
      distance_km:Number(liveNavState.distanceKm.toFixed(2)),
      duration_hours:Number(durationHours.toFixed(2)),
      crew:$('liveCrew').value.trim()||'Michel, Desi',
      notes:[
        $('liveNotes').value.trim(),
        `Live opgenomen met MijnSerenity · ${liveNavState.points.length} GPS-punten`,
        `Max. snelheid: ${Number(liveNavState.maxSpeedKmh||0).toFixed(1)} km/u`,
        Number(liveNavState.engineRpm)>0
          ?`Motortoerental: ${Math.round(Number(liveNavState.engineRpm))} tpm`
          :'',
        `Roerstand: ${formatRudderAngle(liveNavState.rudderAngle)}`,
        liveNavState.weather
          ?`Weer: ${weatherCodeDescription(liveNavState.weather.weatherCode)} · ${Number(liveNavState.weather.temperature).toFixed(1)} °C · wind ${Number(liveNavState.weather.windSpeed).toFixed(1)} km/u · windstoten ${Number(liveNavState.weather.windGusts).toFixed(1)} km/u`
          :''
      ].filter(Boolean).join('\n'),
      fuel_liters:fuelLiters?Number(fuelLiters.toFixed(2)):null,
      fuel_cost:fuelCost?Number(fuelCost.toFixed(2)):null,
      route_geojson:routeGeojson,
      updated_at:new Date().toISOString()
    };

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

    saveStatus.textContent=`${title} opgeslagen ✅`;
    await loadTrips();
    clearLiveTrip();
    setTimeout(()=>captainNavigate('logbook'),500);
  }catch(error){
    console.error('Live vaartocht opslaan mislukt:',error);
    saveStatus.textContent='Opslaan mislukt: '+(error?.message||'onbekende fout');
  }finally{
    saveButton.disabled=false;
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
  $('liveGpsStatus').textContent='Tik op Start varen. MijnSerenity start de GPS-opname en opent daarna Waterkaarten. Open beide schermen op de iPad in Split View en laat beide schermen open totdat de reis is opgeslagen.';
  $('liveWeatherStatus').textContent='Het weer wordt na het eerste GPS-punt automatisch opgehaald.';
  fillLiveTripDefaults(true);
  updateLiveRouteTitle();
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


const APP_VERSION='5.1.32';
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




function isSupportedRouteFile(file){
  const name=String(file?.name||'').toLowerCase();
  return name.endsWith('.kmz')||name.endsWith('.kml')||name.endsWith('.gpx');
}

function routeFileFingerprint(file){
  return [
    String(file?.name||''),
    Number(file?.size||0),
    Number(file?.lastModified||0)
  ].join('|');
}

function importedRouteStorageKey(){
  return `mijnserenity-imported-routes-${currentBoat?.id||'geen-boot'}`;
}

function readImportedRouteFingerprints(){
  try{
    const value=JSON.parse(localStorage.getItem(importedRouteStorageKey())||'[]');
    return Array.isArray(value)?value:[];
  }catch(error){
    return [];
  }
}

function isRouteAlreadyImported(file){
  return readImportedRouteFingerprints().includes(routeFileFingerprint(file));
}

function markRouteFingerprintImported(fingerprint){
  if(!fingerprint)return;

  try{
    const current=readImportedRouteFingerprints();
    const updated=[fingerprint,...current.filter(value=>value!==fingerprint)].slice(0,250);
    localStorage.setItem(importedRouteStorageKey(),JSON.stringify(updated));
  }catch(error){
    console.warn('Route-import kon niet lokaal worden bijgehouden:',error);
  }
}

function setICloudRouteStatus(message,state=''){
  const status=$('icloudRouteFolderStatus');
  if(!status)return;

  status.textContent=message||'';
  status.classList.toggle('success',state==='success');
  status.classList.toggle('warning',state==='warning');
  status.classList.toggle('error',state==='error');
}

function openRouteHandleDatabase(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)){
      reject(new Error('Lokale mapopslag wordt niet ondersteund.'));
      return;
    }

    const request=indexedDB.open('mijnserenity-route-handles',1);

    request.onupgradeneeded=()=>{
      const database=request.result;
      if(!database.objectStoreNames.contains('handles')){
        database.createObjectStore('handles');
      }
    };

    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('Mapopslag openen mislukt.'));
  });
}

async function storeRouteDirectoryHandle(handle){
  try{
    const database=await openRouteHandleDatabase();

    await new Promise((resolve,reject)=>{
      const transaction=database.transaction('handles','readwrite');
      transaction.objectStore('handles').put(handle,'vaarroutes');
      transaction.oncomplete=resolve;
      transaction.onerror=()=>reject(transaction.error);
    });

    database.close();
  }catch(error){
    console.warn('De Vaarroutes-map kon niet worden onthouden:',error);
  }
}

async function getStoredRouteDirectoryHandle(){
  try{
    const database=await openRouteHandleDatabase();

    const handle=await new Promise((resolve,reject)=>{
      const transaction=database.transaction('handles','readonly');
      const request=transaction.objectStore('handles').get('vaarroutes');
      request.onsuccess=()=>resolve(request.result||null);
      request.onerror=()=>reject(request.error);
    });

    database.close();
    return handle;
  }catch(error){
    return null;
  }
}

async function ensureRouteDirectoryPermission(handle,requestPermission=false){
  if(!handle)return false;

  try{
    let permission=await handle.queryPermission({mode:'read'});

    if(permission==='prompt'&&requestPermission){
      permission=await handle.requestPermission({mode:'read'});
    }

    return permission==='granted';
  }catch(error){
    return false;
  }
}

function newestUnimportedRouteFile(files){
  return [...(files||[])]
    .filter(isSupportedRouteFile)
    .filter(file=>!isRouteAlreadyImported(file))
    .sort((a,b)=>Number(b.lastModified||0)-Number(a.lastModified||0))[0]||null;
}

async function collectRouteFilesFromDirectory(handle){
  const files=[];

  for await(const entry of handle.values()){
    if(entry.kind!=='file')continue;

    const name=String(entry.name||'').toLowerCase();
    if(!name.endsWith('.kmz')&&!name.endsWith('.kml')&&!name.endsWith('.gpx')){
      continue;
    }

    try{
      files.push(await entry.getFile());
    }catch(error){
      console.warn('Routebestand kon niet worden geopend:',entry.name,error);
    }
  }

  return files;
}

async function importNewestRouteFile(files,sourceLabel='iCloud Drive / Vaarroutes'){
  const routeFile=newestUnimportedRouteFile(files);

  if(!routeFile){
    setICloudRouteStatus(
      'Geen nieuw GPX-, KML- of KMZ-bestand gevonden.',
      'warning'
    );
    return false;
  }

  setICloudRouteStatus(
    `Nieuwste route gevonden: ${routeFile.name}. Bezig met importeren…`
  );

  await handleTripRouteImport(routeFile,sourceLabel);

  setICloudRouteStatus(
    `${routeFile.name} is ingelezen. Sla de vaartocht op om de import af te ronden.`,
    'success'
  );

  return true;
}

async function scanICloudRouteDirectory(handle,userInitiated=false){
  if(!handle)return false;

  const allowed=await ensureRouteDirectoryPermission(handle,userInitiated);

  if(!allowed){
    if(userInitiated){
      setICloudRouteStatus(
        'Geen toegang tot de gekozen map. Kies de map Vaarroutes opnieuw.',
        'error'
      );
    }
    return false;
  }

  savedICloudRouteHandle=handle;
  setICloudRouteStatus('Map Vaarroutes controleren…');

  try{
    const files=await collectRouteFilesFromDirectory(handle);
    return await importNewestRouteFile(files);
  }catch(error){
    console.error('Vaarroutes-map controleren mislukt:',error);
    setICloudRouteStatus(
      'De map kon niet worden gecontroleerd. Kies het nieuwste bestand handmatig.',
      'error'
    );
    return false;
  }
}

async function chooseICloudRouteFolder(){

  if('showDirectoryPicker' in window){
    try{
      const handle=await window.showDirectoryPicker({
        id:'mijnserenity-vaarroutes',
        mode:'read',
        startIn:'documents'
      });

      savedICloudRouteHandle=handle;
      await storeRouteDirectoryHandle(handle);
      await scanICloudRouteDirectory(handle,true);
      return;
    }catch(error){
      if(error?.name==='AbortError')return;
      console.warn('Mapkiezer niet beschikbaar, bestandenkiezer wordt geopend:',error);
    }
  }

  setICloudRouteStatus(
    'Open iCloud Drive, ga naar Vaarroutes en kies het nieuwste routebestand.'
  );
  $('icloudRouteFiles')?.click();
}

async function handleICloudRouteFileSelection(fileList){
  const files=[...(fileList||[])];

  if(!files.length)return;

  try{
    await importNewestRouteFile(files);
  }finally{
    $('icloudRouteFiles').value='';
  }
}

async function autoCheckSavedICloudRouteFolder(){
  if(!currentBoat)return;

  if(!savedICloudRouteHandle){
    savedICloudRouteHandle=await getStoredRouteDirectoryHandle();
  }

  if(!savedICloudRouteHandle)return;

  const allowed=await ensureRouteDirectoryPermission(savedICloudRouteHandle,false);
  if(!allowed)return;

  await scanICloudRouteDirectory(savedICloudRouteHandle,false);
}

function routeFileBaseName(file){
  return String(file?.name||'Vaarroute')
    .replace(/\.(gpx|kml|kmz)$/i,'')
    .replace(/[_]+/g,' ')
    .replace(/\s+/g,' ')
    .trim()||'Vaarroute';
}

function xmlFirstText(parent,localName){
  if(!parent)return '';
  const node=[...parent.getElementsByTagNameNS('*',localName)][0];
  return String(node?.textContent||'').trim();
}

function parseRouteTimestamp(value){
  if(!value)return null;
  const time=Date.parse(String(value).trim());
  return Number.isFinite(time)?time:null;
}

function routeDistanceKm(coordinates){
  const points=(coordinates||[]).filter(isValidRouteCoordinate);
  let total=0;

  for(let index=1;index<points.length;index++){
    const [lon1,lat1]=points[index-1];
    const [lon2,lat2]=points[index];

    const toRad=value=>value*Math.PI/180;
    const earthRadiusKm=6371.0088;
    const dLat=toRad(lat2-lat1);
    const dLon=toRad(lon2-lon1);

    const a=
      Math.sin(dLat/2)**2+
      Math.cos(toRad(lat1))*
      Math.cos(toRad(lat2))*
      Math.sin(dLon/2)**2;

    total+=earthRadiusKm*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }

  return total;
}

function localDateFromTimestamp(timestamp){
  if(!Number.isFinite(timestamp))return '';
  const date=new Date(timestamp);
  const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,10);
}

function splitRouteTitle(title){
  const value=String(title||'').trim();
  if(!value)return {departure:'',arrival:''};

  const patterns=[
    /\s+→\s+/,
    /\s+naar\s+/i,
    /\s+to\s+/i,
    /\s+[–—-]\s+/
  ];

  for(const pattern of patterns){
    const parts=value.split(pattern).map(part=>part.trim()).filter(Boolean);
    if(parts.length>=2){
      return {
        departure:parts[0],
        arrival:parts.slice(1).join(' - ')
      };
    }
  }

  return {departure:'',arrival:''};
}

function distanceBetweenRoutePointsKm(a,b){
  if(!a||!b)return Infinity;
  return routeDistanceKm([[a.lon,a.lat],[b.lon,b.lat]]);
}

function nearestNamedRoutePoint(namedPoints,target,maxDistanceKm=5){
  let best=null;

  for(const point of namedPoints||[]){
    if(!point.name)continue;
    const distance=distanceBetweenRoutePointsKm(point,target);
    if(distance<=maxDistanceKm&&(!best||distance<best.distance)){
      best={name:point.name,distance};
    }
  }

  return best?.name||'';
}

function parseGpxRouteDetails(text,file){
  const doc=new DOMParser().parseFromString(text,'application/xml');
  if(doc.querySelector('parsererror')){
    throw new Error('Het GPX-bestand bevat ongeldige XML.');
  }

  const tracks=[...doc.getElementsByTagNameNS('*','trk')];
  const routes=[...doc.getElementsByTagNameNS('*','rte')];
  const metadata=[...doc.getElementsByTagNameNS('*','metadata')][0];

  const candidates=[];

  tracks.forEach(track=>{
    [...track.getElementsByTagNameNS('*','trkseg')].forEach(segment=>{
      const points=[...segment.getElementsByTagNameNS('*','trkpt')]
        .map(point=>({
          lon:Number(point.getAttribute('lon')),
          lat:Number(point.getAttribute('lat')),
          time:parseRouteTimestamp(xmlFirstText(point,'time')),
          name:xmlFirstText(point,'name')
        }))
        .filter(point=>isValidRouteCoordinate([point.lon,point.lat]));

      if(points.length>=2){
        candidates.push({
          points,
          name:xmlFirstText(track,'name'),
          description:xmlFirstText(track,'desc')
        });
      }
    });
  });

  routes.forEach(route=>{
    const points=[...route.getElementsByTagNameNS('*','rtept')]
      .map(point=>({
        lon:Number(point.getAttribute('lon')),
        lat:Number(point.getAttribute('lat')),
        time:parseRouteTimestamp(xmlFirstText(point,'time')),
        name:xmlFirstText(point,'name')
      }))
      .filter(point=>isValidRouteCoordinate([point.lon,point.lat]));

    if(points.length>=2){
      candidates.push({
        points,
        name:xmlFirstText(route,'name'),
        description:xmlFirstText(route,'desc')
      });
    }
  });

  if(!candidates.length){
    throw new Error('Geen bruikbare routepunten gevonden.');
  }

  candidates.sort((a,b)=>b.points.length-a.points.length);
  const selected=candidates[0];
  const points=selected.points;
  const coordinates=points.map(point=>[point.lon,point.lat]);
  const validTimes=points.map(point=>point.time).filter(Number.isFinite);

  const waypoints=[...doc.getElementsByTagNameNS('*','wpt')]
    .map(point=>({
      lon:Number(point.getAttribute('lon')),
      lat:Number(point.getAttribute('lat')),
      name:xmlFirstText(point,'name')
    }))
    .filter(point=>
      point.name&&
      isValidRouteCoordinate([point.lon,point.lat])
    );

  const title=
    selected.name||
    xmlFirstText(metadata,'name')||
    routeFileBaseName(file);

  const split=splitRouteTitle(title);
  const first=points[0];
  const last=points[points.length-1];

  const departure=
    nearestNamedRoutePoint(waypoints,first)||
    first.name||
    split.departure;

  const arrival=
    nearestNamedRoutePoint(waypoints,last)||
    last.name||
    split.arrival;

  const startTime=validTimes.length?validTimes[0]:null;
  const endTime=validTimes.length?validTimes[validTimes.length-1]:null;
  const durationHours=
    Number.isFinite(startTime)&&
    Number.isFinite(endTime)&&
    endTime>startTime
      ?(endTime-startTime)/3600000
      :null;

  return {
    geojson:{type:'LineString',coordinates},
    title,
    departure,
    arrival,
    distanceKm:routeDistanceKm(coordinates),
    durationHours,
    tripDate:localDateFromTimestamp(startTime),
    notes:selected.description||xmlFirstText(metadata,'desc'),
    pointCount:coordinates.length,
    startTime,
    endTime
  };
}

function parseKmlRouteDetails(text,file){
  const doc=new DOMParser().parseFromString(text,'application/xml');
  if(doc.querySelector('parsererror')){
    throw new Error('Het KML-bestand bevat ongeldige XML.');
  }

  const candidates=[];
  const placemarks=[...doc.getElementsByTagNameNS('*','Placemark')];

  placemarks.forEach(placemark=>{
    [...placemark.getElementsByTagNameNS('*','LineString')].forEach(line=>{
      [...line.getElementsByTagNameNS('*','coordinates')].forEach(node=>{
        const coordinates=parseKmlCoordinateText(node.textContent||'');
        if(coordinates.length>=2){
          candidates.push({
            coordinates,
            times:[],
            name:xmlFirstText(placemark,'name'),
            description:xmlFirstText(placemark,'description')
          });
        }
      });
    });

    [...placemark.getElementsByTagNameNS('*','Track')].forEach(track=>{
      const coordinates=[...track.getElementsByTagNameNS('*','coord')]
        .map(node=>{
          const values=String(node.textContent||'')
            .trim()
            .split(/\s+/)
            .map(Number);
          return [values[0],values[1]];
        })
        .filter(isValidRouteCoordinate);

      const times=[...track.getElementsByTagNameNS('*','when')]
        .map(node=>parseRouteTimestamp(node.textContent))
        .filter(Number.isFinite);

      if(coordinates.length>=2){
        candidates.push({
          coordinates,
          times,
          name:xmlFirstText(placemark,'name'),
          description:xmlFirstText(placemark,'description')
        });
      }
    });
  });

  if(!candidates.length){
    const coordinatesNodes=[...doc.getElementsByTagNameNS('*','coordinates')];
    coordinatesNodes.forEach(node=>{
      const coordinates=parseKmlCoordinateText(node.textContent||'');
      if(coordinates.length>=2){
        candidates.push({
          coordinates,
          times:[],
          name:'',
          description:''
        });
      }
    });
  }

  if(!candidates.length){
    throw new Error('Geen bruikbare routepunten gevonden.');
  }

  candidates.sort((a,b)=>b.coordinates.length-a.coordinates.length);
  const selected=candidates[0];

  const documentNode=[...doc.getElementsByTagNameNS('*','Document')][0];
  const title=
    selected.name||
    xmlFirstText(documentNode,'name')||
    routeFileBaseName(file);

  const split=splitRouteTitle(title);

  const namedPoints=placemarks
    .map(placemark=>{
      const pointNode=[...placemark.getElementsByTagNameNS('*','Point')][0];
      const coordinateText=pointNode
        ?xmlFirstText(pointNode,'coordinates')
        :'';
      const coordinate=parseKmlCoordinateText(coordinateText)[0];

      return coordinate
        ?{
            lon:coordinate[0],
            lat:coordinate[1],
            name:xmlFirstText(placemark,'name')
          }
        :null;
    })
    .filter(Boolean);

  const firstCoordinate=selected.coordinates[0];
  const lastCoordinate=selected.coordinates[selected.coordinates.length-1];
  const first={lon:firstCoordinate[0],lat:firstCoordinate[1]};
  const last={lon:lastCoordinate[0],lat:lastCoordinate[1]};

  const departure=
    nearestNamedRoutePoint(namedPoints,first)||
    split.departure;

  const arrival=
    nearestNamedRoutePoint(namedPoints,last)||
    split.arrival;

  const startTime=selected.times.length?selected.times[0]:null;
  const endTime=selected.times.length
    ?selected.times[selected.times.length-1]
    :null;

  const durationHours=
    Number.isFinite(startTime)&&
    Number.isFinite(endTime)&&
    endTime>startTime
      ?(endTime-startTime)/3600000
      :null;

  return {
    geojson:{type:'LineString',coordinates:selected.coordinates},
    title,
    departure,
    arrival,
    distanceKm:routeDistanceKm(selected.coordinates),
    durationHours,
    tripDate:localDateFromTimestamp(startTime),
    notes:selected.description||xmlFirstText(documentNode,'description'),
    pointCount:selected.coordinates.length,
    startTime,
    endTime
  };
}

async function parseTripRouteImport(file){
  const name=String(file?.name||'').toLowerCase();

  if(name.endsWith('.kmz')){
    if(typeof JSZip==='undefined'){
      throw new Error('KMZ-module is niet geladen.');
    }

    if(file.size>50*1024*1024){
      throw new Error('Het KMZ-bestand is groter dan 50 MB.');
    }

    const zip=await JSZip.loadAsync(await file.arrayBuffer());
    const kmlFiles=Object.values(zip.files)
      .filter(entry=>
        !entry.dir&&
        entry.name.toLowerCase().endsWith('.kml')
      );

    if(!kmlFiles.length){
      throw new Error('In dit KMZ-bestand staat geen KML-route.');
    }

    const preferred=
      kmlFiles.find(entry=>/(^|\/)doc\.kml$/i.test(entry.name))||
      kmlFiles[0];

    return parseKmlRouteDetails(await preferred.async('text'),file);
  }

  const text=await file.text();

  if(name.endsWith('.kml')){
    return parseKmlRouteDetails(text,file);
  }

  return parseGpxRouteDetails(text,file);
}

function setTripRouteImportStatus(details,file){
  const status=$('tripRouteImportStatus');
  if(!status)return;

  const values=[
    file?.name?`Bestand: ${file.name}`:'',
    details?.pointCount?`${details.pointCount} routepunten`:'',
    Number.isFinite(details?.distanceKm)
      ?`Afstand: ${details.distanceKm.toFixed(1)} km`
      :'',
    Number.isFinite(details?.durationHours)
      ?`${details.durationEstimated?'Geschatte vaartijd':'Vaartijd'}: ${formatRouteDuration(details.durationHours)}`
      :'',
    Number.isFinite(details?.fuelLiters)
      ?`Brandstof: ${details.fuelLiters.toFixed(1)} l`
      :'',
    Number.isFinite(details?.fuelCost)
      ?`Kosten: €${details.fuelCost.toFixed(2)}`
      :'',
    details?.tripDate
      ?`Datum: ${details.tripDate.split('-').reverse().join('-')}`
      :''
  ].filter(Boolean);

  status.innerHTML=`
    <b>Route en gegevens ingelezen ✅</b>
    <span>${esc(values.join(' · '))}</span>
    <small>Geschatte waarden staan ook in de notities. Controleer ze vóór opslaan.</small>
  `;
  status.classList.remove('hidden');
}

function formatRouteDuration(hours){
  const totalMinutes=Math.max(0,Math.round(Number(hours||0)*60));
  const wholeHours=Math.floor(totalMinutes/60);
  const minutes=totalMinutes%60;

  if(wholeHours&&minutes){
    return `${wholeHours} uur ${minutes} min`;
  }
  if(wholeHours){
    return `${wholeHours} uur`;
  }
  return `${minutes} min`;
}


function reliableNumber(value){
  const number=Number(value);
  return Number.isFinite(number)&&number>0?number:null;
}

function estimateCruiseSpeedKmh(){
  const usable=tripCache.filter(trip=>{
    const distance=reliableNumber(trip.distance_km);
    const hours=reliableNumber(trip.duration_hours);
    if(!distance||!hours)return false;
    const speed=distance/hours;
    return speed>=3&&speed<=20;
  });

  if(usable.length){
    const totalDistance=usable.reduce(
      (sum,trip)=>sum+Number(trip.distance_km||0),
      0
    );
    const totalHours=usable.reduce(
      (sum,trip)=>sum+Number(trip.duration_hours||0),
      0
    );
    const weighted=totalHours?totalDistance/totalHours:null;
    if(weighted&&weighted>=3&&weighted<=20)return weighted;
  }

  return 9;
}

function estimateFuelPerHour(){
  const fromSettings=reliableNumber(settingsCache?.fuel_per_hour);
  if(fromSettings)return fromSettings;

  const usable=tripCache.filter(trip=>
    reliableNumber(trip.fuel_liters)&&
    reliableNumber(trip.duration_hours)
  );

  const totalLiters=usable.reduce(
    (sum,trip)=>sum+Number(trip.fuel_liters||0),
    0
  );
  const totalHours=usable.reduce(
    (sum,trip)=>sum+Number(trip.duration_hours||0),
    0
  );

  return totalHours?totalLiters/totalHours:null;
}

function estimateFuelPrice(){
  const fromSettings=reliableNumber(settingsCache?.fuel_price);
  if(fromSettings)return fromSettings;

  const usable=tripCache.filter(trip=>
    reliableNumber(trip.fuel_cost)&&
    reliableNumber(trip.fuel_liters)
  );

  const totalCost=usable.reduce(
    (sum,trip)=>sum+Number(trip.fuel_cost||0),
    0
  );
  const totalLiters=usable.reduce(
    (sum,trip)=>sum+Number(trip.fuel_liters||0),
    0
  );

  return totalLiters?totalCost/totalLiters:null;
}

function reverseLocationLabel(doc){
  if(!doc)return '';
  return String(
    doc.woonplaatsnaam||
    doc.gemeentenaam||
    doc.weergavenaam||
    doc.straatnaam||
    ''
  ).trim();
}

async function reverseRouteLocation(coordinate){
  if(!Array.isArray(coordinate)||coordinate.length<2)return '';

  const longitude=Number(coordinate[0]);
  const latitude=Number(coordinate[1]);

  if(!Number.isFinite(latitude)||!Number.isFinite(longitude))return '';

  const attempts=[
    new URLSearchParams({
      lat:String(latitude),
      lon:String(longitude),
      rows:'1',
      type:'woonplaats'
    }),
    new URLSearchParams({
      lat:String(latitude),
      lon:String(longitude),
      rows:'1'
    })
  ];

  for(const params of attempts){
    try{
      const response=await fetch(
        `https://api.pdok.nl/bzk/locatieserver/search/v3_1/reverse?${params.toString()}`,
        {headers:{Accept:'application/json'}}
      );

      if(!response.ok)continue;

      const payload=await response.json();
      const doc=payload?.response?.docs?.[0];
      const label=reverseLocationLabel(doc);

      if(label)return label;
    }catch(error){
      console.warn('Routeplaats bepalen mislukt:',error);
    }
  }

  return '';
}

function isGenericImportedTitle(title,file){
  const value=String(title||'').trim().toLowerCase();
  const base=routeFileBaseName(file).toLowerCase();

  return !value||
    value===base||
    value==='vaarroute'||
    value==='route'||
    value==='track'||
    value==='waterkaarten route';
}

function appendUniqueTripNote(existing,note){
  const cleanExisting=String(existing||'').trim();
  const cleanNote=String(note||'').trim();

  if(!cleanNote)return cleanExisting;
  if(!cleanExisting)return cleanNote;
  if(cleanExisting.toLowerCase().includes(cleanNote.toLowerCase())){
    return cleanExisting;
  }

  return `${cleanExisting}\n\n${cleanNote}`;
}

async function enrichTripRouteDetails(details,file){
  if(!details)return details;

  const enriched={...details};
  const coordinates=enriched.geojson?.coordinates||[];
  const first=coordinates[0];
  const last=coordinates[coordinates.length-1];

  if(!enriched.departure||!enriched.arrival){
    const [departure,arrival]=await Promise.all([
      enriched.departure
        ?Promise.resolve(enriched.departure)
        :reverseRouteLocation(first),
      enriched.arrival
        ?Promise.resolve(enriched.arrival)
        :reverseRouteLocation(last)
    ]);

    enriched.departure=enriched.departure||departure;
    enriched.arrival=enriched.arrival||arrival;
  }

  if(
    enriched.departure&&
    enriched.arrival&&
    isGenericImportedTitle(enriched.title,file)
  ){
    enriched.title=`${enriched.departure} - ${enriched.arrival}`;
  }

  if(!enriched.tripDate){
    enriched.tripDate=localDateFromTimestamp(file?.lastModified)||localDateISO(new Date());
    enriched.tripDateEstimated=true;
  }

  if(
    !reliableNumber(enriched.durationHours)&&
    reliableNumber(enriched.distanceKm)
  ){
    const speed=estimateCruiseSpeedKmh();
    enriched.durationHours=enriched.distanceKm/speed;
    enriched.durationEstimated=true;
    enriched.estimatedSpeedKmh=speed;
  }

  enriched.crew=String($('tripCrew')?.value||'').trim()||'Michel, Desi';

  const fuelPerHour=estimateFuelPerHour();
  const fuelPrice=estimateFuelPrice();

  if(
    reliableNumber(enriched.durationHours)&&
    reliableNumber(fuelPerHour)
  ){
    enriched.fuelLiters=enriched.durationHours*fuelPerHour;
    enriched.fuelEstimated=true;
    enriched.fuelPerHourUsed=fuelPerHour;
  }

  if(
    reliableNumber(enriched.fuelLiters)&&
    reliableNumber(fuelPrice)
  ){
    enriched.fuelCost=enriched.fuelLiters*fuelPrice;
    enriched.fuelPriceUsed=fuelPrice;
  }

  const generatedNotes=[];

  generatedNotes.push(`Geïmporteerd uit ${file?.name||'routebestand'}.`);

  if(enriched.durationEstimated){
    generatedNotes.push(
      `Vaartijd geschat op basis van ${enriched.estimatedSpeedKmh.toFixed(1)} km/u.`
    );
  }

  if(enriched.fuelEstimated){
    generatedNotes.push(
      `Brandstof geschat met ${enriched.fuelPerHourUsed.toFixed(1)} liter per uur.`
    );
  }

  if(
    reliableNumber(enriched.fuelCost)&&
    reliableNumber(enriched.fuelPriceUsed)
  ){
    generatedNotes.push(
      `Brandstofkosten berekend met €${enriched.fuelPriceUsed.toFixed(2)} per liter.`
    );
  }

  enriched.notes=appendUniqueTripNote(
    enriched.notes,
    generatedNotes.join(' ')
  );

  return enriched;
}

function applyTripRouteDetails(details,file){
  if(!details)return;

  pendingTripRouteDetails=details;

  if(details.tripDate){
    $('tripDate').value=details.tripDate;
  }

  if(details.title){
    $('tripTitle').value=details.title;
  }

  if(details.departure){
    $('tripFrom').value=details.departure;
  }

  if(details.arrival){
    $('tripTo').value=details.arrival;
  }

  if(Number.isFinite(details.distanceKm)&&details.distanceKm>0){
    $('tripDistance').value=details.distanceKm.toFixed(1);
  }

  if(Number.isFinite(details.durationHours)&&details.durationHours>0){
    $('tripHours').value=details.durationHours.toFixed(2);
  }

  if(details.crew){
    $('tripCrew').value=details.crew;
  }

  if(Number.isFinite(details.fuelLiters)&&details.fuelLiters>0){
    $('tripFuelLiters').value=details.fuelLiters.toFixed(1);
  }

  if(Number.isFinite(details.fuelCost)&&details.fuelCost>0){
    $('tripFuelCost').value=details.fuelCost.toFixed(2);
  }

  if(details.notes){
    $('tripNotes').value=appendUniqueTripNote(
      $('tripNotes').value,
      details.notes
    );
  }

  previewFuelCalculation();
  setTripRouteImportStatus(details,file);
}


async function handleManualTripRouteImport(file){
  if(!file)return;

  try{
    await handleTripRouteImport(file,'handmatig bestand');
  }catch(error){
    alert('Vaarroute kon niet worden ingelezen: '+(error?.message||'onbekende fout'));
  }
}

async function handleTripRouteImport(file,sourceLabel='bestand'){
  openTripForm();
  if(!file)return;

  pendingTripRouteFile=file;
  pendingTripRouteFingerprint=routeFileFingerprint(file);

  setTripProgress('Vaarroute inlezen en ontbrekende gegevens aanvullen…');
  const status=$('tripRouteImportStatus');
  status?.classList.add('hidden');

  try{
    const parsed=await parseTripRouteImport(file);
    const details=await enrichTripRouteDetails(parsed,file);
    details.importSource=sourceLabel;

    applyTripRouteDetails(details,file);
    setTripProgress('');
    showAppToast('Route en ontbrekende gegevens zijn ingevuld ✅');
  }catch(error){
    console.error('Vaarroute importeren mislukt:',error);
    pendingTripRouteDetails=null;
    pendingTripRouteFile=null;
    pendingTripRouteFingerprint=null;
    setTripProgress('');
    throw error;
  }
}

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


function parseLiveTripNoteMetrics(notes){
  const result={
    gpsPoints:'',
    maxSpeed:'',
    engineRpm:'',
    rudder:'',
    weather:'',
    customNotes:''
  };

  const customLines=[];

  String(notes||'').split(/\r?\n/).forEach(rawLine=>{
    const line=String(rawLine||'').trim();
    if(!line)return;

    let match=line.match(
      /^Live opgenomen met MijnSerenity\s*·\s*(\d+)\s*GPS-punten$/i
    );
    if(match){
      result.gpsPoints=match[1];
      return;
    }

    match=line.match(/^Max\.\s*snelheid:\s*(.+)$/i);
    if(match){
      result.maxSpeed=match[1].trim();
      return;
    }

    match=line.match(/^Motortoerental:\s*(.+)$/i);
    if(match){
      result.engineRpm=match[1].trim();
      return;
    }

    match=line.match(/^Roerstand:\s*(.+)$/i);
    if(match){
      result.rudder=match[1].trim();
      return;
    }

    match=line.match(/^Weer:\s*(.+)$/i);
    if(match){
      result.weather=match[1].trim();
      return;
    }

    customLines.push(line);
  });

  result.customNotes=customLines.join('\n');
  return result;
}

function renderLiveTripMetricBalloons(metrics){
  if(!metrics)return '';

  return [
    metrics.gpsPoints
      ?`<span class="trip-summary-live">GPS-punten: ${esc(metrics.gpsPoints)}</span>`
      :'',
    metrics.maxSpeed
      ?`<span class="trip-summary-live">Max. snelheid: ${esc(metrics.maxSpeed)}</span>`
      :'',
    metrics.engineRpm
      ?`<span class="trip-summary-live">Motortoerental: ${esc(metrics.engineRpm)}</span>`
      :'',
    metrics.rudder
      ?`<span class="trip-summary-live">Roerstand: ${esc(metrics.rudder)}</span>`
      :'',
    metrics.weather
      ?`<span class="trip-summary-live trip-summary-weather">Weer: ${esc(metrics.weather)}</span>`
      :''
  ].filter(Boolean).join('');
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

    const liveMetrics=parseLiveTripNoteMetrics(t.notes);
    const liveMetricBalloons=renderLiveTripMetricBalloons(liveMetrics);
    const visibleNotes=liveMetrics.customNotes;

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
          ${liveMetricBalloons}
        </div>
        ${visibleNotes?`<p>${esc(visibleNotes)}</p>`:''}
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
          <button class="record-delete-mini" aria-label="Log verwijderen" title="Log verwijderen" onclick="deleteTrip('${t.id}')">🗑️</button>
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
  $('financePeriodType').value='all';
  $('financeCategory').value='';
  $('financeDay').value='';
  $('financeWeek').value='';
  $('financeMonth').value='';
  populateFinanceYears();
  updateFinanceFilterInputs();
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
