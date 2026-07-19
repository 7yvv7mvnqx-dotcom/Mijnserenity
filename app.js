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
let currentUser=null,currentBoat=null,currentRole=null,accountAccess=null,presenceHeartbeatTimer=null,adminAccountRefreshTimer=null,liveChannel=null,mapInstance=null,poiLayer=null,userMarker=null,poiCache=[],poiPhotoCache={},costCache=[],costReceiptCache={},tripCache=[],settingsCache=null,favoritesOnly=false,poiPickerMap=null,poiPickerMarker=null,poiPickerSelection=null,poiPickerTargetId=null,poiOnlineSuggestionResults=[],poiLocationSuggestionTimer=null,poiNameSuggestionTimer=null,poiLocationSuggestionController=null,poiHarbourSuggestionController=null,poiNearbyHarbourController=null,poiHarbourLastRequestAt=0,poiHarbourSuggestionCache=new Map(),poiNearbyHarbourCache=new Map(),poiLiveSuggestionResults={name:[],place:[],address:[]},poiWebPhotoResults=[],selectedPoiWebPhotos=[],poiWebPhotoController=null,poiNearbySearchController=null,poiNearbySearchCache=new Map(),plannerStops=[],plannerCurrentPlan=null,plannerCurrentPosition=null,plannerMap=null,plannerMapLayer=null,technicalStateCache=null,technicalEventsCache=[],technicalCloudReady=false,technicalLoading=false,homeAssistantStatusCache=null,homeAssistantStatusLoading=false,radarCameraRefreshTimer=null,radarCameraLiveActive=false,radarCameraLiveToken='',radarCameraLiveRefreshTimer=null,radarCameraFrameTimer=null,radarCameraFrameBusy=false,radarCameraFrameFailures=0;


/* ============================================================
   MijnSerenity Cloud 7.4.4 — Storage Safety
   Foto's en documenten worden pas geladen wanneer ze zichtbaar
   of bewust geopend worden. Signed URLs worden tijdelijk hergebruikt.
   ============================================================ */
const STORAGE_SAFE_PLACEHOLDER='data:image/gif;base64,R0lGODlhAQABAAAAACw=';
const STORAGE_SAFE_URL_TTL_MS=50*60*1000;
const STORAGE_SAFE_SESSION_PREFIX='mijnserenity-storage-url-v722:';
const storageSafeUrlCache=new Map();
const storageSafeUrlPending=new Map();
const storageSafeRealtimeTimers=new Map();
const storageSafeStats={
  signedRequests:0,
  cacheHits:0,
  imageAssignments:0,
  documentOpens:0,
  preventedReloads:0
};
let storageSafeImageObserver=null;
let storageSafeMutationObserver=null;
let storageSafeInitialiseKey='';
let storageSafeInitialiseAt=0;
let poiLastMetadataLoadAt=0;
let costLastMetadataLoadAt=0;
let tripLastMetadataLoadAt=0;

function storageSafeKey(bucket,path){
  return `${String(bucket||'')}::${String(path||'')}`;
}

function storageSafeSessionKey(bucket,path){
  return STORAGE_SAFE_SESSION_PREFIX+encodeURIComponent(storageSafeKey(bucket,path));
}

function storageSafeReadSession(bucket,path){
  try{
    const raw=sessionStorage.getItem(storageSafeSessionKey(bucket,path));
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    if(!parsed?.url||Number(parsed.expiresAt||0)<=Date.now()+30000){
      sessionStorage.removeItem(storageSafeSessionKey(bucket,path));
      return null;
    }
    return parsed;
  }catch{
    return null;
  }
}

function storageSafeWriteSession(bucket,path,value){
  try{
    sessionStorage.setItem(
      storageSafeSessionKey(bucket,path),
      JSON.stringify(value)
    );
  }catch{}
}

function storageSafeForgetUrl(bucket,path){
  const key=storageSafeKey(bucket,path);
  storageSafeUrlCache.delete(key);
  storageSafeUrlPending.delete(key);
  try{sessionStorage.removeItem(storageSafeSessionKey(bucket,path));}catch{}
}

function storageSafeRenderStatus(){
  const target=document.getElementById('storageSafetyStatus');
  if(!target)return;
  target.innerHTML=`
    <div class="storage-safety-heading">
      <span>🛡️</span>
      <div>
        <strong>Storage Safety actief</strong>
        <small>Foto’s worden alleen op aanvraag geladen.</small>
      </div>
    </div>
    <div class="storage-safety-stats">
      <span><b>${storageSafeStats.signedRequests}</b> nieuwe links</span>
      <span><b>${storageSafeStats.cacheHits}</b> hergebruikt</span>
      <span><b>${storageSafeStats.imageAssignments}</b> foto’s getoond</span>
    </div>`;
}

function storageSafeEnsureStatusCard(){
  const settings=document.getElementById('settings');
  if(!settings||document.getElementById('storageSafetyStatus'))return;
  const card=document.createElement('div');
  card.id='storageSafetyStatus';
  card.className='card storage-safety-card';
  const firstCard=settings.querySelector('.card');
  if(firstCard)firstCard.insertAdjacentElement('beforebegin',card);
  else settings.prepend(card);
  storageSafeRenderStatus();
}

async function getStorageSignedUrl(bucket,path,{force=false,expiresIn=3600}={}){
  if(!bucket||!path)throw new Error('Opslaglocatie ontbreekt.');
  const key=storageSafeKey(bucket,path);
  const now=Date.now();

  if(!force){
    const memory=storageSafeUrlCache.get(key);
    if(memory?.url&&Number(memory.expiresAt||0)>now+30000){
      storageSafeStats.cacheHits++;
      storageSafeRenderStatus();
      return memory.url;
    }

    const stored=storageSafeReadSession(bucket,path);
    if(stored){
      storageSafeUrlCache.set(key,stored);
      storageSafeStats.cacheHits++;
      storageSafeRenderStatus();
      return stored.url;
    }

    if(storageSafeUrlPending.has(key)){
      storageSafeStats.preventedReloads++;
      storageSafeRenderStatus();
      return storageSafeUrlPending.get(key);
    }
  }

  const task=(async()=>{
    storageSafeStats.signedRequests++;
    storageSafeRenderStatus();
    const {data,error}=await sb.storage
      .from(bucket)
      .createSignedUrl(path,expiresIn);
    if(error||!data?.signedUrl){
      throw error||new Error('Tijdelijke bestandslink kon niet worden gemaakt.');
    }
    const value={
      url:data.signedUrl,
      expiresAt:Date.now()+Math.min(
        STORAGE_SAFE_URL_TTL_MS,
        Math.max(60000,expiresIn*1000-60000)
      )
    };
    storageSafeUrlCache.set(key,value);
    storageSafeWriteSession(bucket,path,value);
    return value.url;
  })();

  storageSafeUrlPending.set(key,task);
  try{
    return await task;
  }finally{
    storageSafeUrlPending.delete(key);
  }
}

async function ensureStorageImage(image){
  if(!image)return '';
  const bucket=image.dataset.storageBucket;
  const path=image.dataset.storagePath;
  if(!bucket||!path)return image.currentSrc||image.src||'';

  if(image.dataset.storageLoaded==='1'&&image.src){
    storageSafeStats.cacheHits++;
    storageSafeRenderStatus();
    return image.src;
  }
  if(image.dataset.storageLoading==='1')return '';

  image.dataset.storageLoading='1';
  image.classList.add('storage-safe-loading');
  try{
    const url=await getStorageSignedUrl(bucket,path);
    if(!image.isConnected)return url;
    image.onload=()=>{
      image.classList.add('storage-safe-loaded');
      image.classList.remove('storage-safe-loading','storage-safe-error');
    };
    image.onerror=()=>{
      image.classList.remove('storage-safe-loading');
      image.classList.add('storage-safe-error');
    };
    if(image.src!==url){
      image.src=url;
      storageSafeStats.imageAssignments++;
      storageSafeRenderStatus();
    }
    image.dataset.storageLoaded='1';
    return url;
  }catch(error){
    console.warn('Foto op aanvraag laden mislukt:',error);
    image.classList.remove('storage-safe-loading');
    image.classList.add('storage-safe-error');
    return '';
  }finally{
    delete image.dataset.storageLoading;
  }
}

function storageSafeObserveImages(root=document){
  const images=[...root.querySelectorAll?.('img[data-storage-bucket][data-storage-path]')||[]];
  images.forEach(image=>{
    if(image.dataset.storageObserved==='1')return;
    image.dataset.storageObserved='1';
    if(storageSafeImageObserver){
      storageSafeImageObserver.observe(image);
    }
  });
}

function initialiseStorageSafety(){
  storageSafeEnsureStatusCard();

  if('IntersectionObserver' in window){
    storageSafeImageObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        storageSafeImageObserver.unobserve(entry.target);
        ensureStorageImage(entry.target);
      });
    },{rootMargin:'160px 0px',threshold:0.01});
  }

  storageSafeMutationObserver=new MutationObserver(mutations=>{
    if(mutations.some(item=>item.addedNodes?.length)){
      requestAnimationFrame(()=>storageSafeObserveImages(document));
    }
  });
  storageSafeMutationObserver.observe(document.body,{childList:true,subtree:true});
  storageSafeObserveImages(document);
}

async function openStorageLightbox(bucket,path,image=null){
  try{
    showAppToast('Foto veilig laden…');
    const url=image
      ?(await ensureStorageImage(image)||await getStorageSignedUrl(bucket,path))
      :await getStorageSignedUrl(bucket,path);
    if(url)openLightbox(url);
  }catch(error){
    alert('Foto openen mislukt: '+(error?.message||'onbekende fout'));
  }
}

async function openStorageDocument(bucket,path){
  const popup=window.open('about:blank','_blank');
  try{
    const url=await getStorageSignedUrl(bucket,path);
    storageSafeStats.documentOpens++;
    storageSafeRenderStatus();
    if(popup)popup.location.href=url;
    else window.location.href=url;
  }catch(error){
    popup?.close();
    alert('Document openen mislukt: '+(error?.message||'onbekende fout'));
  }
}

async function rescanStoredReceiptPath(costId,bucket,path){
  try{
    const url=await getStorageSignedUrl(bucket,path);
    await rescanStoredReceipt(costId,url);
  }catch(error){
    alert('Bon opnieuw lezen mislukt: '+(error?.message||'onbekende fout'));
  }
}

function scheduleRealtimeRefresh(key,job,delay=900){
  const existing=storageSafeRealtimeTimers.get(key);
  if(existing)clearTimeout(existing);
  storageSafeRealtimeTimers.set(key,setTimeout(async()=>{
    storageSafeRealtimeTimers.delete(key);
    try{await job();}
    catch(error){console.error(`Realtime verversen (${key}) mislukt:`,error);}
  },delay));
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',initialiseStorageSafety,{once:true});
}else{
  initialiseStorageSafety();
}
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
      ['logboek',loadTrips],
      ['techniek',()=>loadTechnicalDashboard(true)]
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

  const words=normalized
    .split(/\s+/)
    .filter(word=>word.length>1);

  return poiCache
    .map(poi=>{
      const name=String(poi.name||'').trim();
      const place=String(poi.place||'').trim();
      const address=String(poi.address||'').trim();
      const category=String(poi.category||'POI').trim();

      const nameLower=name.toLowerCase();
      const placeLower=place.toLowerCase();
      const addressLower=address.toLowerCase();
      const categoryLower=category.toLowerCase();
      const haystack=[nameLower,placeLower,addressLower,categoryLower].join(' ');

      let score=0;

      if(nameLower===normalized)score+=180;
      if(nameLower.startsWith(normalized))score+=120;
      else if(nameLower.includes(normalized))score+=85;

      if(placeLower===normalized)score+=115;
      else if(placeLower.startsWith(normalized))score+=90;
      else if(placeLower.includes(normalized))score+=65;

      if(addressLower.includes(normalized))score+=45;

      const allWordsMatch=words.length&&words.every(word=>haystack.includes(word));
      if(allWordsMatch)score+=55;

      const asksForHarbour=/\b(haven|jachthaven|marina)\b/.test(normalized);
      if(asksForHarbour&&categoryLower==='haven'&&
         words.some(word=>placeLower.includes(word)||nameLower.includes(word))){
        score+=50;
      }

      if(score>0&&field==='name')score+=10;
      if(score>0&&field==='place'&&place)score+=10;

      return {
        _source:'saved-poi',
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



function poiOnlineContext(){
  const place=String($('poiPlace')?.value||'').trim();
  const address=String($('poiAddress')?.value||'').trim();

  return place||address||'';
}

function poiOnlineCategory(result){
  const type=String(result?.type||'').toLowerCase();
  const category=String(result?.category||result?.class||'').toLowerCase();
  const extra=result?.extratags||{};
  const text=[
    result?.display_name,
    result?.name,
    result?.namedetails?.name,
    type,
    category,
    extra?.amenity,
    extra?.shop,
    extra?.tourism,
    extra?.leisure,
    extra?.harbour,
    extra?.seamark_type
  ].join(' ').toLowerCase();

  if(
    type==='marina'||
    type==='harbour'||
    type==='boatyard'||
    type==='mooring'||
    extra.leisure==='marina'||
    extra.harbour||
    extra.seamark_type==='harbour'||
    /\b(jachthaven|passantenhaven|marina|harbour|havenkom|boothaven)\b/.test(text)
  )return 'Haven';

  if(type==='supermarket'||type==='convenience'||extra.shop==='supermarket'){
    return 'Supermarkt';
  }

  if(
    type==='fast_food'||
    /\b(cafetaria|snackbar|fast food|frituur)\b/.test(text)
  )return 'Cafetaria';

  if(type==='restaurant')return 'Restaurant';

  if(
    ['cafe','pub','bar','biergarten'].includes(type)||
    /\b(café|cafe|koffiebar)\b/.test(text)
  )return 'Café';

  if(
    type==='fuel'||
    extra.amenity==='fuel'||
    /\b(tankstation|benzinepomp|fuel station)\b/.test(text)
  )return 'Tankstation';

  if(type==='bakery'||extra.shop==='bakery')return 'Bakker';
  if(type==='pharmacy'||extra.amenity==='pharmacy')return 'Apotheek';
  if(type==='camp_site'||type==='caravan_site')return 'Camping';
  if(type==='parking'||extra.amenity==='parking')return 'Parkeren';
  if(type==='toilets'||extra.amenity==='toilets')return 'Toilet';
  if(type==='drinking_water'||extra.amenity==='drinking_water')return 'Watertappunt';
  if(type==='bridge')return 'Brug';
  if(type==='lock_gate'||type==='lock')return 'Sluis';

  if(category==='shop'||extra.shop)return 'Winkel';
  return 'Overig';
}

function poiOnlineIsUseful(result){
  const category=String(result?.category||result?.class||'').toLowerCase();
  const type=String(result?.type||'').toLowerCase();
  const mapped=poiOnlineCategory(result);

  if(mapped!=='Overig')return true;

  return [
    'amenity',
    'shop',
    'tourism',
    'leisure',
    'waterway',
    'man_made'
  ].includes(category)&&
    !['yes','building','residential'].includes(type);
}


function nearbyPoiRadiusKm(){
  const radius=Number($('poiNearbyRadius')?.value||15);
  return Math.max(1,Math.min(50,radius||15));
}

function nearbyPoiCategoryLabel(category){
  return category==='Alle'?'POI':category;
}

function nearbyPoiFragments(category,radius,latitude,longitude){
  const around=`around:${Math.round(radius*1000)},${latitude},${longitude}`;
  const groups={
    Haven:[
      `nwr(${around})["leisure"="marina"];`,
      `nwr(${around})["harbour"];`,
      `nwr(${around})["seamark:type"="harbour"];`,
      `nwr(${around})["landuse"="harbour"];`,
      `nwr(${around})["waterway"="boatyard"];`,
      `nwr(${around})["mooring"];`
    ],
    Supermarkt:[
      `nwr(${around})["shop"="supermarket"];`,
      `nwr(${around})["shop"="convenience"];`
    ],
    Cafetaria:[
      `nwr(${around})["amenity"="fast_food"];`
    ],
    Tankstation:[
      `nwr(${around})["amenity"="fuel"];`
    ],
    Restaurant:[
      `nwr(${around})["amenity"="restaurant"];`
    ],
    Café:[
      `nwr(${around})["amenity"="cafe"];`,
      `nwr(${around})["amenity"="pub"];`,
      `nwr(${around})["amenity"="bar"];`
    ],
    Bakker:[
      `nwr(${around})["shop"="bakery"];`
    ],
    Apotheek:[
      `nwr(${around})["amenity"="pharmacy"];`,
      `nwr(${around})["shop"="chemist"];`
    ],
    Camping:[
      `nwr(${around})["tourism"="camp_site"];`,
      `nwr(${around})["tourism"="caravan_site"];`
    ],
    Toilet:[
      `nwr(${around})["amenity"="toilets"];`
    ],
    Watertappunt:[
      `nwr(${around})["amenity"="drinking_water"];`
    ],
    Parkeren:[
      `nwr(${around})["amenity"="parking"];`
    ]
  };

  if(category!=='Alle'){
    return groups[category]||[];
  }

  return [
    ...groups.Haven,
    ...groups.Supermarkt,
    ...groups.Cafetaria,
    ...groups.Tankstation,
    ...groups.Restaurant,
    ...groups.Café,
    ...groups.Bakker,
    ...groups.Apotheek,
    ...groups.Camping,
    ...groups.Toilet,
    ...groups.Watertappunt
  ];
}

function nearbyPoiFallbackTitle(category,distance,place=''){
  const distanceText=Number.isFinite(distance)
    ?`${distance.toLocaleString('nl-NL',{maximumFractionDigits:1})} km`
    :'in de omgeving';

  const prefix=category==='Haven'
    ?'Kleine haven'
    :category||'POI';

  return `${prefix} · ${distanceText}${place?' · '+place:''}`;
}

function normalizeNearbyPoi(element,center){
  const tags=element?.tags||{};
  const latitude=Number(element?.lat??element?.center?.lat);
  const longitude=Number(element?.lon??element?.center?.lon);

  if(!Number.isFinite(latitude)||!Number.isFinite(longitude))return null;

  const synthetic={
    type:
      tags.amenity||
      tags.shop||
      tags.tourism||
      tags.leisure||
      tags.waterway||
      tags.harbour||
      '',
    category:
      tags.amenity?'amenity':
      tags.shop?'shop':
      tags.tourism?'tourism':
      tags.leisure?'leisure':
      tags.waterway?'waterway':'',
    display_name:tags.name||tags.operator||'',
    name:tags.name||tags.operator||'',
    namedetails:{name:tags['name:nl']||tags.name||tags.operator||''},
    extratags:tags,
    address:{
      road:tags['addr:street']||'',
      house_number:tags['addr:housenumber']||'',
      postcode:tags['addr:postcode']||'',
      city:
        tags['addr:city']||
        tags['addr:place']||
        tags['addr:village']||
        tags['is_in:city']||
        ''
    }
  };

  const category=poiOnlineCategory(synthetic);
  const place=String(
    tags['addr:city']||
    tags['addr:place']||
    tags['addr:village']||
    tags['is_in:city']||
    ''
  ).trim();

  const distance=poiDistanceKm(
    center.latitude,
    center.longitude,
    latitude,
    longitude
  );

  const explicitName=String(
    tags['name:nl']||
    tags.name||
    tags.operator||
    tags.brand||
    ''
  ).trim();

  const name=explicitName||
    nearbyPoiFallbackTitle(category,distance,place);

  const street=[
    tags['addr:street'],
    tags['addr:housenumber']
  ].filter(Boolean).join(' ').trim();

  const locality=[
    tags['addr:postcode'],
    place
  ].filter(Boolean).join(' ').trim();

  const address=[street,locality].filter(Boolean).join(', ');

  return {
    _source:'osm-poi-nearby',
    _onlinePoi:{
      ...synthetic,
      lat:String(latitude),
      lon:String(longitude)
    },
    _overpassTags:tags,
    weergavenaam:name,
    naam:name,
    category,
    type:`${category} · ${distance.toLocaleString('nl-NL',{
      maximumFractionDigits:1
    })} km${place?' · '+place:''}`,
    place,
    address,
    latitude,
    longitude,
    distance_km:distance,
    has_explicit_name:!!explicitName
  };
}

async function fetchOverpassNearby(query,signal){
  const endpoints=[
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.nchc.org.tw/api/interpreter'
  ];

  let lastError=null;

  for(const endpoint of endpoints){
    try{
      const response=await fetch(endpoint,{
        method:'POST',
        headers:{
          'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8',
          Accept:'application/json'
        },
        body:new URLSearchParams({data:query}).toString(),
        signal
      });

      if(!response.ok){
        throw new Error(`zoekdienst gaf fout ${response.status}`);
      }

      return await response.json();
    }catch(error){
      if(error?.name==='AbortError')throw error;
      lastError=error;
      console.warn('Omgevingszoekdienst niet beschikbaar:',endpoint,error);
    }
  }

  throw lastError||new Error('Geen omgevingszoekdienst beschikbaar.');
}

function nearbyNominatimTerms(category){
  const terms={
    Haven:['jachthaven','passantenhaven','marina','boothaven','haven'],
    Supermarkt:['supermarkt','levensmiddelenwinkel'],
    Cafetaria:['cafetaria','snackbar','fast food'],
    Tankstation:['tankstation','benzinepomp'],
    Restaurant:['restaurant'],
    Café:['café','koffiebar','pub'],
    Bakker:['bakker'],
    Apotheek:['apotheek'],
    Camping:['camping'],
    Toilet:['openbaar toilet'],
    Watertappunt:['drinkwaterpunt']
  };

  if(category==='Alle'){
    return [
      'jachthaven',
      'supermarkt',
      'cafetaria',
      'tankstation',
      'restaurant',
      'café'
    ];
  }

  return terms[category]||[category];
}

function nearbyViewbox(center,radiusKm){
  const latitudeDelta=radiusKm/111;
  const longitudeScale=Math.max(
    .2,
    Math.cos(center.latitude*Math.PI/180)
  );
  const longitudeDelta=radiusKm/(111*longitudeScale);

  return [
    center.longitude-longitudeDelta,
    center.latitude+latitudeDelta,
    center.longitude+longitudeDelta,
    center.latitude-latitudeDelta
  ].join(',');
}

async function fallbackNearbyPois(category,center,radius,signal){
  const results=[];
  const seen=new Set();
  const terms=nearbyNominatimTerms(category).slice(0,6);

  for(const term of terms){
    const wait=Math.max(
      0,
      1100-(Date.now()-Number(poiHarbourLastRequestAt||0))
    );
    if(wait)await new Promise(resolve=>setTimeout(resolve,wait));

    poiHarbourLastRequestAt=Date.now();

    const params=new URLSearchParams({
      q:term,
      format:'jsonv2',
      countrycodes:'nl',
      limit:'20',
      bounded:'1',
      viewbox:nearbyViewbox(center,radius),
      addressdetails:'1',
      namedetails:'1',
      extratags:'1',
      dedupe:'1',
      'accept-language':'nl'
    });

    const response=await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {headers:{Accept:'application/json'},signal}
    );

    if(!response.ok)continue;

    const payload=await response.json();

    (Array.isArray(payload)?payload:[])
      .filter(poiOnlineIsUseful)
      .map(normalizeHarbourSuggestion)
      .forEach(result=>{
        const distance=poiDistanceKm(
          center.latitude,
          center.longitude,
          result.latitude,
          result.longitude
        );

        if(distance>radius*1.15)return;

        const normalized={
          ...result,
          _source:'osm-poi-nearby',
          distance_km:distance,
          type:`${result.category} · ${distance.toLocaleString('nl-NL',{
            maximumFractionDigits:1
          })} km${result.place?' · '+result.place:''}`
        };

        const key=[
          normalized.weergavenaam.toLowerCase(),
          normalized.latitude.toFixed(5),
          normalized.longitude.toFixed(5)
        ].join('|');

        if(seen.has(key))return;
        seen.add(key);
        results.push(normalized);
      });
  }

  return results;
}

function mergeNearbyPoiResults(results=[]){
  const seen=new Set();

  return results
    .filter(Boolean)
    .filter(result=>{
      const key=[
        String(result.weergavenaam||'').toLowerCase(),
        Number(result.latitude).toFixed(5),
        Number(result.longitude).toFixed(5)
      ].join('|');

      if(seen.has(key))return false;
      seen.add(key);
      return true;
    })
    .sort((a,b)=>{
      if(a.has_explicit_name!==b.has_explicit_name){
        return a.has_explicit_name?-1:1;
      }
      return Number(a.distance_km||9999)-Number(b.distance_km||9999);
    })
    .slice(0,120);
}

async function searchNearbyPois(category='Alle'){
  const panel=$('poiNameLiveSuggestions');
  const radius=nearbyPoiRadiusKm();

  if(panel){
    panel.innerHTML=`
      <div class="poi-live-loading">
        ${esc(nearbyPoiCategoryLabel(category))} binnen ${radius} km zoeken…
      </div>
    `;
    panel.classList.remove('hidden');
  }

  showPoiAutoInfo(
    'Zoekcentrum bepalen via gekozen plaats, GPS of huidige positie…',
    'warning'
  );

  try{
    const center=await resolvePoiSearchCenter();

    if(!center){
      throw new Error(
        'Kies eerst een plaatsuggestie, vul GPS in of geef toegang tot je locatie.'
      );
    }

    const cacheKey=[
      category,
      radius,
      center.latitude.toFixed(3),
      center.longitude.toFixed(3)
    ].join('|');

    if(poiNearbySearchCache.has(cacheKey)){
      poiLiveSuggestionResults.name=poiNearbySearchCache.get(cacheKey)||[];
      renderPoiLiveSuggestions('name');
      showPoiAutoInfo(
        `${poiLiveSuggestionResults.name.length} resultaten gevonden binnen ${radius} km.`,
        poiLiveSuggestionResults.name.length?'success':'warning'
      );
      return;
    }

    poiNearbySearchController?.abort();
    poiNearbySearchController=new AbortController();
    const signal=poiNearbySearchController.signal;
    const fragments=nearbyPoiFragments(
      category,
      radius,
      center.latitude,
      center.longitude
    );

    if(!fragments.length){
      throw new Error('Deze categorie kan nog niet in de omgeving worden gezocht.');
    }

    const batches=[];
    const chunkSize=category==='Alle'?6:10;

    for(let index=0;index<fragments.length;index+=chunkSize){
      const chunk=fragments.slice(index,index+chunkSize);
      const query=`
        [out:json][timeout:35];
        (
          ${chunk.join('\n')}
        );
        out center tags qt;
      `;

      try{
        const payload=await fetchOverpassNearby(query,signal);
        batches.push(...(payload?.elements||[]));
      }catch(error){
        if(error?.name==='AbortError')throw error;
        console.warn('Een deel van de omgevingszoekactie mislukte:',error);
      }
    }

    let results=batches
      .map(element=>normalizeNearbyPoi(element,center))
      .filter(Boolean)
      .filter(result=>
        category==='Alle'||
        result.category===category||
        (category==='Haven'&&result.category==='Haven')
      );

    if(results.length<5){
      try{
        const fallback=await fallbackNearbyPois(
          category,
          center,
          radius,
          signal
        );
        results.push(...fallback);
      }catch(error){
        if(error?.name!=='AbortError'){
          console.warn('Naamzoek-fallback mislukte:',error);
        }
      }
    }

    results=mergeNearbyPoiResults(results);
    poiNearbySearchCache.set(cacheKey,results);
    poiLiveSuggestionResults.name=results;
    renderPoiLiveSuggestions('name');

    const centerLabel=center.source==='place'
      ?`rond ${String($('poiPlace')?.value||'de gekozen plaats').trim()}`
      :center.source==='form'
        ?'rond de ingevulde GPS-locatie'
        :'rond je huidige positie';

    showPoiAutoInfo(
      results.length
        ?`${results.length} ${nearbyPoiCategoryLabel(category).toLowerCase()}-resultaten gevonden ${centerLabel}, binnen ${radius} km.`
        :`Geen resultaten gevonden ${centerLabel}. Vergroot de zoekafstand of kies een andere categorie.`,
      results.length?'success':'warning'
    );
  }catch(error){
    if(error?.name==='AbortError')return;

    console.error('POI’s in omgeving zoeken mislukt:',error);
    poiLiveSuggestionResults.name=[];
    renderPoiLiveSuggestions('name');
    showPoiAutoInfo(
      error?.message||'Zoeken in de omgeving is niet gelukt.',
      'error'
    );
  }
}

function poiOnlineSearchQueries(query){
  const clean=String(query||'').trim();
  if(!clean)return [];

  const context=poiOnlineContext();
  const suffix=[context,'Nederland'].filter(Boolean).join(', ');
  const base=suffix?`${clean}, ${suffix}`:`${clean}, Nederland`;

  if(poiGenericHarbourQuery(clean)){
    return [
      suffix?`jachthaven, ${suffix}`:'jachthaven, Nederland',
      suffix?`passantenhaven, ${suffix}`:'passantenhaven, Nederland',
      suffix?`marina, ${suffix}`:'marina, Nederland',
      suffix?`boothaven, ${suffix}`:'boothaven, Nederland',
      suffix?`haven, ${suffix}`:'haven, Nederland'
    ];
  }

  if(/\b(cafetaria|snackbar|frituur)\b/i.test(clean)){
    return [
      base,
      suffix?`snackbar, ${suffix}`:'snackbar, Nederland'
    ];
  }

  return [base];
}

function quickPoiSearch(term,category){
  if(category){
    searchNearbyPois(category);
    return;
  }

  $('poiName').value=term;
  schedulePoiNameSuggestions(true);
}


function poiReadableValue(value){
  const text=String(value??'').trim();
  if(!text)return '';

  const normalized=text.toLowerCase();
  if(['yes','true','designated'].includes(normalized))return 'Ja';
  if(['no','false'].includes(normalized))return 'Nee';
  if(normalized==='customers')return 'Voor klanten';
  if(normalized==='permissive')return 'Toegestaan';
  return text;
}

function poiContactWebsite(tags={}){
  return String(
    tags.website||
    tags['contact:website']||
    tags.url||
    ''
  ).trim();
}

function poiOnlineDetailsLines(result){
  const raw=result?._onlinePoi||{};
  const tags={
    ...(raw.extratags||{}),
    ...(result?._overpassTags||{})
  };

  const lines=[];
  const add=(label,value)=>{
    const clean=poiReadableValue(value);
    if(clean)lines.push(`${label}: ${clean}`);
  };

  add('Telefoon',tags.phone||tags['contact:phone']);
  add('Website',poiContactWebsite(tags));
  add('E-mail',tags.email||tags['contact:email']);
  add('Openingstijden',tags.opening_hours);
  add('Beheerder',tags.operator||tags.brand);
  add('Aantal ligplaatsen',tags.capacity||tags['capacity:boats']);
  add('Passantenplaatsen',tags['guest_berths']||tags['berths:guest']);
  add('Stroom',tags.electricity||tags['power_supply']);
  add('Drinkwater',tags.drinking_water||tags.water_point);
  add('Toiletten',tags.toilets);
  add('Douches',tags.shower||tags.showers);
  add('Wifi',tags.internet_access||tags.wifi);
  add('Brandstof',tags.fuel||tags['fuel:diesel']||tags['fuel:octane_95']);
  add('Vuilwaterstation',tags.sanitary_dump_station);
  add('Helling',tags.slipway||tags.boat_ramp);
  add('Wasserette',tags.laundry);
  add('Restaurant',tags.restaurant);
  add('Rolstoeltoegang',tags.wheelchair);
  add('Keuken',tags.cuisine);

  return [...new Set(lines)];
}

function mergePoiDetailsIntoReview(lines=[]){
  if(!lines.length)return;

  const textarea=$('poiReview');
  if(!textarea)return;

  const current=String(textarea.value||'').trim();
  const missing=lines.filter(line=>!current.includes(line));
  if(!missing.length)return;

  const block=`Online informatie:\n${missing.join('\n')}`;
  textarea.value=current?`${current}\n\n${block}`:block;
}

function showPoiAutoInfo(message,state='success'){
  const panel=$('poiAutoInfo');
  if(!panel)return;

  panel.textContent=message||'';
  panel.classList.remove('hidden','success','warning','error');
  panel.classList.add(state);
}

function poiDistanceKm(lat1,lon1,lat2,lon2){
  const toRad=value=>value*Math.PI/180;
  const earthRadius=6371;
  const dLat=toRad(lat2-lat1);
  const dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+
    Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*
    Math.sin(dLon/2)**2;

  return earthRadius*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function poiGenericHarbourQuery(query){
  return /\b(alle\s+havens?|havens?|jachthavens?|marina|marinas)\b/i.test(
    String(query||'').trim()
  );
}

function poiHarbourSearchScore(result,query){
  const clean=String(query||'')
    .toLowerCase()
    .replace(/\b(alle|haven|havens|jachthaven|jachthavens|marina|marinas)\b/g,' ')
    .replace(/\s+/g,' ')
    .trim();

  if(!clean)return 0;

  const name=String(result.weergavenaam||'').toLowerCase();
  if(name===clean)return 100;
  if(name.startsWith(clean))return 80;
  if(name.includes(clean))return 60;

  return clean.split(' ').filter(Boolean)
    .reduce((score,term)=>score+(name.includes(term)?12:0),0);
}

async function resolvePoiSearchCenter(){
  const latitude=Number($('poiLatitude')?.value);
  const longitude=Number($('poiLongitude')?.value);

  if(Number.isFinite(latitude)&&Number.isFinite(longitude)){
    return {latitude,longitude,source:'form'};
  }

  const place=String($('poiPlace')?.value||'').trim();
  if(place.length>=2){
    try{
      const suggestParams=new URLSearchParams({
        q:place,
        rows:'4'
      });

      const suggestResponse=await fetch(
        `https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest?${suggestParams.toString()}`,
        {headers:{Accept:'application/json'}}
      );

      if(suggestResponse.ok){
        const suggestPayload=await suggestResponse.json();
        const docs=Array.isArray(suggestPayload?.response?.docs)
          ?suggestPayload.response.docs
          :[];

        const best=docs.find(doc=>
          ['woonplaats','gemeente','buurt','wijk'].includes(
            String(doc.type||'').toLowerCase()
          )
        )||docs[0];

        if(best?.id){
          const lookupParams=new URLSearchParams({id:best.id});
          const lookupResponse=await fetch(
            `https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup?${lookupParams.toString()}`,
            {headers:{Accept:'application/json'}}
          );

          if(lookupResponse.ok){
            const lookupPayload=await lookupResponse.json();
            const doc=lookupPayload?.response?.docs?.[0];
            const point=parsePdokPoint(
              doc?.centroide_ll||
              doc?.geometrie_ll||
              ''
            );

            if(point){
              return {
                latitude:point.latitude,
                longitude:point.longitude,
                source:'place'
              };
            }
          }
        }
      }
    }catch(error){
      console.warn('Middelpunt uit plaats bepalen mislukt:',error);
    }
  }

  if(navigator.geolocation){
    try{
      const position=await new Promise((resolve,reject)=>
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy:false,
            timeout:8000,
            maximumAge:300000
          }
        )
      );

      return {
        latitude:position.coords.latitude,
        longitude:position.coords.longitude,
        source:'current'
      };
    }catch(error){
      console.warn('Huidige positie voor havenzoeker niet beschikbaar:',error);
    }
  }

  return null;
}

function normalizeNearbyHarbour(element,center){
  const tags=element?.tags||{};
  const latitude=Number(
    element?.lat??element?.center?.lat
  );
  const longitude=Number(
    element?.lon??element?.center?.lon
  );

  if(!Number.isFinite(latitude)||!Number.isFinite(longitude))return null;

  const name=String(
    tags['name:nl']||
    tags.name||
    tags.operator||
    tags.ref||
    'Naamloze kleine haven'
  ).trim();

  const place=String(
    tags['addr:city']||
    tags['addr:place']||
    tags['addr:village']||
    tags['is_in:city']||
    ''
  ).trim();

  const street=[
    tags['addr:street'],
    tags['addr:housenumber']
  ].filter(Boolean).join(' ').trim();

  const locality=[
    tags['addr:postcode'],
    place
  ].filter(Boolean).join(' ').trim();

  const address=[street,locality].filter(Boolean).join(', ');
  const distance=poiDistanceKm(
    center.latitude,
    center.longitude,
    latitude,
    longitude
  );

  const onlinePoi={
    display_name:[name,address].filter(Boolean).join(', '),
    name,
    lat:String(latitude),
    lon:String(longitude),
    address:{
      road:tags['addr:street']||'',
      house_number:tags['addr:housenumber']||'',
      postcode:tags['addr:postcode']||'',
      city:place
    },
    extratags:tags,
    namedetails:{name}
  };

  return {
    _source:'osm-harbour-nearby',
    _onlinePoi:onlinePoi,
    _overpassTags:tags,
    weergavenaam:name,
    naam:name,
    category:'Haven',
    type:`Haven · ${distance.toLocaleString('nl-NL',{
      maximumFractionDigits:1
    })} km${place?' · '+place:''}`,
    place,
    address,
    latitude,
    longitude,
    distance_km:distance
  };
}

async function loadNearbyHarbourSuggestions(query){
  const center=await resolvePoiSearchCenter();
  if(!center)return [];

  const roundedLat=center.latitude.toFixed(3);
  const roundedLon=center.longitude.toFixed(3);
  const cacheKey=`${roundedLat}|${roundedLon}|30000`;

  if(poiNearbyHarbourCache.has(cacheKey)){
    const cached=poiNearbyHarbourCache.get(cacheKey)||[];
    return cached
      .map(result=>({
        ...result,
        _harbourScore:poiHarbourSearchScore(result,query)
      }))
      .sort((a,b)=>
        b._harbourScore-a._harbourScore||
        a.distance_km-b.distance_km
      );
  }

  poiNearbyHarbourController?.abort();
  poiNearbyHarbourController=new AbortController();

  const overpassQuery=`
    [out:json][timeout:25];
    (
      nwr(around:30000,${center.latitude},${center.longitude})["leisure"="marina"];
      nwr(around:30000,${center.latitude},${center.longitude})["harbour"];
      nwr(around:30000,${center.latitude},${center.longitude})["seamark:type"="harbour"];
      nwr(around:30000,${center.latitude},${center.longitude})["landuse"="harbour"];
      nwr(around:30000,${center.latitude},${center.longitude})["waterway"="boatyard"];
      nwr(around:30000,${center.latitude},${center.longitude})["mooring"]["name"];
    );
    out center tags;
  `;

  const endpoints=[
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  let lastError=null;

  for(const endpoint of endpoints){
    try{
      const response=await fetch(endpoint,{
        method:'POST',
        headers:{
          'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8',
          Accept:'application/json'
        },
        body:new URLSearchParams({data:overpassQuery}).toString(),
        signal:poiNearbyHarbourController.signal
      });

      if(!response.ok){
        throw new Error(`Havenzoekdienst gaf fout ${response.status}`);
      }

      const payload=await response.json();
      const seen=new Set();

      const results=(payload?.elements||[])
        .map(element=>normalizeNearbyHarbour(element,center))
        .filter(Boolean)
        .filter(result=>{
          const key=[
            result.weergavenaam.toLowerCase(),
            result.latitude.toFixed(5),
            result.longitude.toFixed(5)
          ].join('|');

          if(seen.has(key))return false;
          seen.add(key);
          return true;
        })
        .sort((a,b)=>a.distance_km-b.distance_km)
        .slice(0,120);

      poiNearbyHarbourCache.set(cacheKey,results);

      return results
        .map(result=>({
          ...result,
          _harbourScore:poiHarbourSearchScore(result,query)
        }))
        .sort((a,b)=>
          b._harbourScore-a._harbourScore||
          a.distance_km-b.distance_km
        );
    }catch(error){
      if(error?.name==='AbortError')return [];
      lastError=error;
      console.warn('Havenzoekdienst proberen mislukt:',endpoint,error);
    }
  }

  if(lastError)throw lastError;
  return [];
}

async function reverseEnrichPoi(result){
  if(
    !result||
    !Number.isFinite(result.latitude)||
    !Number.isFinite(result.longitude)
  )return result;

  try{
    const wait=Math.max(
      0,
      1100-(Date.now()-Number(poiHarbourLastRequestAt||0))
    );
    if(wait)await new Promise(resolve=>setTimeout(resolve,wait));

    poiHarbourLastRequestAt=Date.now();

    const params=new URLSearchParams({
      lat:String(result.latitude),
      lon:String(result.longitude),
      format:'jsonv2',
      addressdetails:'1',
      namedetails:'1',
      extratags:'1',
      zoom:'18',
      'accept-language':'nl'
    });

    const response=await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      {headers:{Accept:'application/json'}}
    );

    if(!response.ok)return result;

    const payload=await response.json();
    const normalized=normalizeHarbourSuggestion(payload);

    return {
      ...result,
      ...normalized,
      weergavenaam:
        result.weergavenaam||
        normalized.weergavenaam,
      category:
        result.category||
        normalized.category,
      place:
        result.place||
        normalized.place,
      address:
        result.address||
        normalized.address,
      _onlinePoi:payload,
      _overpassTags:result._overpassTags||{}
    };
  }catch(error){
    console.warn('POI-details aanvullen mislukt:',error);
    return result;
  }
}

async function applyOnlinePoiToForm(result,{showMessage=true}={}){
  if(!result)return false;

  showPoiAutoInfo('Adres en beschikbare informatie worden aangevuld…','warning');

  const enriched=await reverseEnrichPoi(result);
  const title=enriched.weergavenaam||enriched.naam||'';

  $('poiName').value=title;
  $('poiCategory').value=enriched.category||'Overig';
  $('poiPlace').value=enriched.place||'';
  $('poiAddress').value=enriched.address||'';

  if(Number.isFinite(enriched.latitude)){
    $('poiLatitude').value=enriched.latitude.toFixed(7);
  }
  if(Number.isFinite(enriched.longitude)){
    $('poiLongitude').value=enriched.longitude.toFixed(7);
  }

  const detailLines=poiOnlineDetailsLines(enriched);
  mergePoiDetailsIntoReview(detailLines);

  hidePoiLiveSuggestions();
  $('poiNameLiveSuggestions')?.classList.add('hidden');

  const additions=[
    enriched.address?'adres':'',
    enriched.place?'plaats':'',
    Number.isFinite(enriched.latitude)?'GPS':'',
    detailLines.length?`${detailLines.length} extra gegevens`:''
  ].filter(Boolean);

  showPoiAutoInfo(
    additions.length
      ?`Automatisch ingevuld: ${additions.join(', ')}.`
      :'Naam overgenomen. Er waren geen extra gegevens beschikbaar.',
    additions.length?'success':'warning'
  );

  if(showMessage){
    showAppToast(
      `${enriched.category||'POI'} ${title} volledig aangevuld ✅`
    );
  }

  return true;
}

function normalizePoiNameForMatch(value){
  return String(value||'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,' ')
    .trim();
}

function findExactPoiSuggestion(query){
  const wanted=normalizePoiNameForMatch(query);
  if(!wanted)return null;

  const results=poiLiveSuggestionResults.name||[];

  return results.find(result=>
    normalizePoiNameForMatch(
      result.weergavenaam||result.naam
    )===wanted
  )||(
    results.length===1
      ?results[0]
      :null
  );
}

function schedulePoiExactNameCompletion(){
  setTimeout(async()=>{
    const active=document.activeElement;
    if(
      active&&
      $('poiNameLiveSuggestions')?.contains(active)
    )return;

    const query=String($('poiName')?.value||'').trim();
    if(query.length<2)return;

    const existingAddress=String($('poiAddress')?.value||'').trim();
    const existingLatitude=String($('poiLatitude')?.value||'').trim();
    if(existingAddress&&existingLatitude)return;

    let result=findExactPoiSuggestion(query);

    if(!result){
      await loadPoiNameAndHarbourSuggestions(query);
      result=findExactPoiSuggestion(query);
    }

    if(
      result&&
      [
        'osm-poi',
        'osm-harbour',
        'osm-harbour-nearby',
        'osm-poi-nearby'
      ].includes(result._source)
    ){
      await applyOnlinePoiToForm(result,{showMessage:false});
    }
  },320);
}

async function completePoiInformation(){
  const query=String($('poiName')?.value||'').trim();

  if(query.length<2){
    alert('Vul eerst minimaal twee letters van de naam in.');
    $('poiName')?.focus();
    return;
  }

  showPoiAutoInfo('Zoeken naar adres, GPS en extra gegevens…','warning');

  await loadPoiNameAndHarbourSuggestions(query);

  const result=findExactPoiSuggestion(query)||
    (poiLiveSuggestionResults.name||[]).find(item=>
      [
        'osm-poi',
        'osm-harbour',
        'osm-harbour-nearby',
        'osm-poi-nearby'
      ].includes(item._source)
    );

  if(!result){
    showPoiAutoInfo(
      'Geen volledige online match gevonden. Kies een suggestie uit de lijst.',
      'warning'
    );
    return;
  }

  await applyOnlinePoiToForm(result);
}

function harbourSearchQuery(query){
  return poiOnlineSearchQueries(query)[0]||'';
}

function harbourSuggestionTitle(result){
  return String(
    result?.namedetails?.['name:nl']||
    result?.namedetails?.name||
    result?.name||
    result?.address?.amenity||
    result?.address?.shop||
    String(result?.display_name||'').split(',')[0]||
    'POI'
  ).trim();
}

function harbourSuggestionPlace(result){
  const address=result?.address||{};
  return String(
    address.city||
    address.town||
    address.village||
    address.hamlet||
    address.municipality||
    address.county||
    ''
  ).trim();
}

function isHarbourSuggestion(result){
  return poiOnlineCategory(result)==='Haven';
}

function normalizeHarbourSuggestion(result){
  const title=harbourSuggestionTitle(result);
  const place=harbourSuggestionPlace(result);
  const address=result?.address||{};
  const category=poiOnlineCategory(result);

  const streetLine=[
    address.road||
      address.pedestrian||
      address.square||
      address.neighbourhood,
    address.house_number
  ].filter(Boolean).join(' ').trim();

  const locality=[
    address.postcode,
    place
  ].filter(Boolean).join(' ').trim();

  const addressText=[
    streetLine,
    locality
  ].filter(Boolean).join(', ')||
    String(result?.display_name||'').trim();

  return {
    _source:'osm-poi',
    _onlinePoi:result,
    weergavenaam:title,
    naam:title,
    category,
    type:`${category}${place?' · '+place:''}`,
    place,
    address:addressText,
    latitude:Number(result.lat),
    longitude:Number(result.lon)
  };
}

function mergePoiNameSuggestions(localResults,onlineResults,query){
  const wantsHarbour=/\b(haven|havens|jachthaven|jachthavens|marina)\b/i.test(query);
  const ordered=wantsHarbour
    ?[
        ...onlineResults.filter(result=>result.category==='Haven'),
        ...localResults,
        ...onlineResults.filter(result=>result.category!=='Haven')
      ]
    :[...localResults,...onlineResults];

  const seen=new Set();

  return ordered.filter(result=>{
    const key=[
      String(result.weergavenaam||'').toLowerCase(),
      String(result.place||result._poi?.place||'').toLowerCase(),
      String(result.category||result._poi?.category||'').toLowerCase()
    ].join('|');

    if(!result.weergavenaam||seen.has(key))return false;
    seen.add(key);
    return true;
  }).slice(0,18);
}

async function loadPoiNameAndHarbourSuggestions(query){
  const currentQuery=String($('poiName')?.value||'').trim();
  if(currentQuery!==query||query.length<2)return;

  const localResults=getMatchingLocalPois(query,'name');
  const context=poiOnlineContext();
  const cacheKey=`${query}|${context}`.toLowerCase();

  if(poiHarbourSuggestionCache.has(cacheKey)){
    const cached=poiHarbourSuggestionCache.get(cacheKey)||[];
    poiLiveSuggestionResults.name=mergePoiNameSuggestions(
      localResults,
      cached,
      query
    );
    renderPoiLiveSuggestions('name');
    return;
  }

  poiHarbourSuggestionController?.abort();
  poiHarbourSuggestionController=new AbortController();

  const searchQueries=poiOnlineSearchQueries(query);
  const collected=[];
  const seenPlaces=new Set();

  const addResult=result=>{
    if(
      !result?.weergavenaam||
      !Number.isFinite(result.latitude)||
      !Number.isFinite(result.longitude)
    )return;

    const key=[
      result.weergavenaam.toLowerCase(),
      result.latitude.toFixed(5),
      result.longitude.toFixed(5)
    ].join('|');

    if(seenPlaces.has(key))return;
    seenPlaces.add(key);
    collected.push(result);
  };

  try{
    for(const searchQuery of searchQueries){
      if(String($('poiName')?.value||'').trim()!==query)return;

      const wait=Math.max(
        0,
        1100-(Date.now()-Number(poiHarbourLastRequestAt||0))
      );
      if(wait)await new Promise(resolve=>setTimeout(resolve,wait));

      poiHarbourLastRequestAt=Date.now();

      const params=new URLSearchParams({
        q:searchQuery,
        format:'jsonv2',
        countrycodes:'nl',
        limit:'24',
        addressdetails:'1',
        namedetails:'1',
        extratags:'1',
        dedupe:'1',
        'accept-language':'nl'
      });

      const response=await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers:{Accept:'application/json'},
          signal:poiHarbourSuggestionController.signal
        }
      );

      if(!response.ok){
        throw new Error(`Online POI-zoekdienst gaf fout ${response.status}`);
      }

      const payload=await response.json();

      (Array.isArray(payload)?payload:[])
        .filter(poiOnlineIsUseful)
        .map(normalizeHarbourSuggestion)
        .forEach(addResult);
    }

    const wantsHarbours=
      poiGenericHarbourQuery(query)||
      String($('poiCategory')?.value||'')==='Haven';

    if(wantsHarbours){
      try{
        const nearby=await loadNearbyHarbourSuggestions(query);
        nearby.forEach(addResult);
      }catch(error){
        console.warn('Kleine havens aanvullend zoeken mislukt:',error);
      }
    }

    collected.sort((a,b)=>{
      const scoreDifference=
        poiHarbourSearchScore(b,query)-
        poiHarbourSearchScore(a,query);

      if(scoreDifference)return scoreDifference;

      const aDistance=Number.isFinite(a.distance_km)
        ?a.distance_km
        :9999;
      const bDistance=Number.isFinite(b.distance_km)
        ?b.distance_km
        :9999;

      return aDistance-bDistance;
    });

    poiHarbourSuggestionCache.set(cacheKey,collected);

    if(String($('poiName')?.value||'').trim()!==query)return;

    poiLiveSuggestionResults.name=mergePoiNameSuggestions(
      localResults,
      collected,
      query
    );
    renderPoiLiveSuggestions('name');
  }catch(error){
    if(error?.name==='AbortError')return;
    console.warn('Online POI-suggesties laden mislukt:',error);

    poiLiveSuggestionResults.name=localResults;
    renderPoiLiveSuggestions('name');
  }
}

async function selectHarbourSuggestion(result){
  if(!result)return;
  await applyOnlinePoiToForm(result);
}

function schedulePoiNameSuggestions(immediate=false){
  clearTimeout(poiNameSuggestionTimer);

  const query=String($('poiName')?.value||'').trim();
  const panel=$('poiNameLiveSuggestions');

  poiHarbourSuggestionController?.abort();

  if(query.length<2){
    panel?.classList.add('hidden');
    if(panel)panel.innerHTML='';
    poiLiveSuggestionResults.name=[];
    return;
  }

  const localResults=getMatchingLocalPois(query,'name');
  poiLiveSuggestionResults.name=localResults;

  if(localResults.length){
    renderPoiLiveSuggestions('name');
  }else if(panel){
    panel.innerHTML='<div class="poi-live-loading">Online POI’s zoeken…</div>';
    panel.classList.remove('hidden');
  }

  poiNameSuggestionTimer=setTimeout(
    ()=>loadPoiNameAndHarbourSuggestions(query),
    immediate?100:500
  );
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

  if(localResults.length){
    renderPoiLiveSuggestions(field);
  }else{
    panel.classList.remove('hidden');
    panel.innerHTML='<div class="poi-live-loading">Plaatsen en adressen zoeken…</div>';
  }

  poiLocationSuggestionController?.abort();
  poiLocationSuggestionController=new AbortController();

  try{
    const placeContext=field==='address'
      ?String($('poiPlace')?.value||'').trim()
      :'';
    const searchText=[
      query,
      placeContext&&!query.toLowerCase().includes(placeContext.toLowerCase())
        ?placeContext
        :''
    ].filter(Boolean).join(' ');

    const params=new URLSearchParams({
      q:searchText,
      rows:'12'
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

    let onlineResults=docs
      .filter(result=>
        allowedTypes.has(String(result.type||'').toLowerCase())
      )
      .map(result=>({...result,_source:'pdok'}));

    if(!onlineResults.length){
      onlineResults=docs
        .slice(0,10)
        .map(result=>({...result,_source:'pdok'}));
    }

    const seen=new Set();
    onlineResults=onlineResults.filter(result=>{
      const key=[
        String(result.id||''),
        String(result.weergavenaam||'').toLowerCase()
      ].join('|');

      if(seen.has(key))return false;
      seen.add(key);
      return true;
    });

    poiLiveSuggestionResults[field]=[
      ...localResults,
      ...onlineResults
    ].slice(0,14);

    renderPoiLiveSuggestions(field);
  }catch(error){
    if(error?.name==='AbortError')return;
    console.error('Locatiesuggesties laden mislukt:',error);

    if(!localResults.length){
      panel.innerHTML=
        '<div class="poi-live-loading">Suggesties zijn nu niet beschikbaar. Probeer een postcode of plaatsnaam.</div>';
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
    panel.innerHTML=field==='name'
      ?'<div class="poi-live-loading">Geen passende POI’s gevonden. Vergroot de zoekafstand of kies een plaats/GPS.</div>'
      :'<div class="poi-live-loading">Geen passende plaats of adres gevonden.</div>';
    panel.classList.remove('hidden');
    return;
  }

  panel.innerHTML=results.map((result,index)=>{
    const saved=result._source==='saved-poi'||result._source==='local-poi';
    const online=[
      'osm-poi',
      'osm-harbour',
      'osm-harbour-nearby',
      'osm-poi-nearby'
    ].includes(result._source);
    const nearby=[
      'osm-harbour-nearby',
      'osm-poi-nearby'
    ].includes(result._source);
    const title=result.weergavenaam||result.naam||'Locatie';
    const subtitle=online
      ?result.type||'Online POI'
      :saved
        ?result.type||'Opgeslagen POI'
        :[
            result.type||'Plaats of adres',
            result.weergavenaam===title?'':result.weergavenaam
          ].filter(Boolean).join(' · ');

    return `
      <button type="button"
        class="${saved?'local-poi-suggestion ':''}${online?'online-poi-suggestion ':''}${nearby?'nearby-harbour-suggestion':''}"
        onclick="selectPoiLocationSuggestion('${field}',${index})">
        <span class="poi-suggestion-main">
          <b>${nearby?'📡 ':''}${esc(title)}</b>
          <span>${esc(subtitle)}</span>
        </span>
        ${online&&result.category
          ?`<em>${nearby?'Dichtbij':esc(result.category)}</em>`
          :''}
      </button>
    `;
  }).join('');

  if(field==='name'&&results.some(result=>
    [
      'osm-poi',
      'osm-harbour',
      'osm-harbour-nearby',
      'osm-poi-nearby'
    ].includes(result._source)
  )){
    panel.innerHTML+=`
      <div class="poi-suggestion-attribution">
        Kies een resultaat; naam, adres, GPS en beschikbare informatie worden aangevuld
      </div>
    `;
  }

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

  if(result._source==='saved-poi'||result._source==='local-poi'){
    selectLocalPoiSuggestion(field,result);
    return;
  }

  if([
    'osm-poi',
    'osm-harbour',
    'osm-harbour-nearby',
    'osm-poi-nearby'
  ].includes(result._source)){
    await selectHarbourSuggestion(result);
    return;
  }

  const panel=getPoiLocationSuggestionPanel(field);
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
    const place=String(
      doc.woonplaatsnaam||
      doc.gemeentenaam||
      (resultType==='woonplaats'
        ?doc.weergavenaam||result.weergavenaam
        :''
      )||
      ''
    ).replace(/<[^>]+>/g,'').trim();

    const address=buildPdokAddress(doc);

    if(field==='place'){
      $('poiPlace').value=
        place||
        String(result.weergavenaam||result.naam||'')
          .replace(/<[^>]+>/g,'')
          .trim();
    }else{
      if(place)$('poiPlace').value=place;
      $('poiAddress').value=
        address||
        String(result.weergavenaam||'')
          .replace(/<[^>]+>/g,'')
          .trim();
    }

    if(point){
      $('poiLatitude').value=point.latitude.toFixed(7);
      $('poiLongitude').value=point.longitude.toFixed(7);
    }

    hidePoiLiveSuggestions();

    if(
      field==='place'&&
      String($('poiName')?.value||'').trim().length>=2
    ){
      schedulePoiNameSuggestions(true);
    }

    showAppToast(
      point
        ?'Plaats, adres en kaartlocatie overgenomen ✅'
        :'Plaats of adres overgenomen.'
    );
  }catch(error){
    console.error('Locatiesuggestie verwerken mislukt:',error);

    const clean=String(result.weergavenaam||result.naam||'')
      .replace(/<[^>]+>/g,'')
      .trim();

    if(field==='place')$('poiPlace').value=clean;
    else $('poiAddress').value=clean;

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

  alert('Typ minimaal twee letters bij plaats of adres. Voor online POI’s gebruik je het veld Naam of de snelle knoppen.');
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
  const map={
    dashboard:0,
    live:1,
    ais:2,
    weather:3,
    map:4,
    planner:5,
    entertainment:6,
    technical:7,
    pois:8,
    logbook:9,
    costs:10,
    finance:11,
    settings:12,
    boat:13
  };
  const button=buttons[map[id]];

  if(button)showTab(id,button);
  if(id==='live')initLiveMode();
  if(id==='ais'&&typeof initAisPage==='function')initAisPage();
  if(id==='map')initMap();
  if(id==='planner')initPlanner();
  if(id==='entertainment'&&typeof initEntertainmentPage==='function')initEntertainmentPage();
  if(id==='technical')initTechnicalDashboard();
  if(id==='finance')renderFinance();
  if(id==='settings')loadSettingsForm();
}
function showTab(id,b){
  if(id==='boat'&&!isAppAdmin()){
    showAppToast(
      'Boot & delen is alleen toegankelijk voor Michel.'
    );
    captainNavigate('settings');
    return;
  }

  if(id!=='live'&&radarCameraLiveActive){
    stopRadarLiveStream(false);
  }
  if(id!=='live'){
    stopLiveTechnicalSync();
    if(typeof window.ms733PauseAllLiveCameras==='function')window.ms733PauseAllLiveCameras(false);
    else if(typeof window.ms732PauseAllLiveCameras==='function')window.ms732PauseAllLiveCameras(false);
  }

  document.querySelectorAll('#appView > section')
    .forEach(section=>section.classList.add('hidden'));

  $(id)?.classList.remove('hidden');

  document.querySelectorAll('.tab')
    .forEach(tab=>tab.classList.remove('active'));

  b?.classList.add('active');
}
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
  poiHarbourSuggestionController?.abort();
  poiNearbySearchController?.abort();
  poiLiveSuggestionResults={name:[],place:[],address:[]};
  poiOnlineSuggestionResults=[];
  resetPoiWebPhotoSearch();
  setPoiProgress('');

  if(closePanel){
    closePoiFormPanel();
  }else{
    openPoiFormPanel();
    setTimeout(()=>$('poiName')?.focus(),50);
  }

  $('poiAutoInfo')?.classList.add('hidden');
  if($('poiAutoInfo'))$('poiAutoInfo').textContent='';
}

function resetPoiEntryForm(){
  clearPoiForm(false);
  showAppToast('Ingevulde POI-gegevens zijn leeggemaakt.');

  $('poiAutoInfo')?.classList.add('hidden');
  if($('poiAutoInfo'))$('poiAutoInfo').textContent='';
}

function cancelPoiEdit(){
  clearPoiForm(true);
}
async function signUp(){
  const email=String($('email')?.value||'').trim();
  const password=$('password')?.value||'';

  if(!email||password.length<10){
    return setMsg('Vul een geldig e-mailadres en minimaal 10 tekens als wachtwoord in.');
  }

  if(passwordStrengthScore(password)<2){
    return setMsg('Gebruik een sterker wachtwoord met cijfers en verschillende tekens.');
  }

  try{
    setMsg('Account aanvragen…');

    const {data,error}=await sb.auth.signUp({email,password});
    if(error)throw error;

    setMsg(
      data.session
        ?'Account aangevraagd. Michel moet eerst toestemming geven.'
        :'Account aangevraagd. Bevestig je e-mailadres; daarna moet Michel toestemming geven.'
    );
  }catch(error){
    console.error('Account aanvragen mislukt:',error);
    setMsg(friendlyAuthError(error));
  }
}


function setAccountMsg(message,isError=false){
  const element=$('accountMsg');
  if(!element)return;
  element.textContent=message||'';
  element.classList.toggle('hidden',!message);
  element.classList.toggle('account-error',!!isError);
}

function friendlyAuthError(error){
  const message=String(error?.message||'').toLowerCase();

  if(message.includes('invalid login credentials')){
    return 'Inloggen mislukt. Controleer e-mailadres en wachtwoord.';
  }
  if(message.includes('email not confirmed')){
    return 'Bevestig eerst je e-mailadres via de ontvangen e-mail.';
  }
  if(message.includes('rate limit')||message.includes('too many')){
    return 'Te veel pogingen. Wacht even en probeer het daarna opnieuw.';
  }
  if(message.includes('password')){
    return 'Het wachtwoord voldoet niet aan de beveiligingseisen.';
  }

  return error?.message||'Er ging iets mis. Probeer het opnieuw.';
}

function handleAuthEnter(event){
  if(event.key!=='Enter')return;
  event.preventDefault();
  signIn();
}

function togglePasswordVisibility(inputId,button){
  const input=$(inputId);
  if(!input)return;

  const showing=input.type==='text';
  input.type=showing?'password':'text';
  button.textContent=showing?'👁':'🙈';
  button.setAttribute(
    'aria-label',
    showing?'Wachtwoord tonen':'Wachtwoord verbergen'
  );
}

function passwordStrengthScore(password){
  const value=String(password||'');
  let score=0;

  if(value.length>=10)score++;
  if(value.length>=14)score++;
  if(/[a-z]/.test(value)&&/[A-Z]/.test(value))score++;
  if(/\d/.test(value))score++;
  if(/[^A-Za-z0-9]/.test(value))score++;

  return Math.min(4,score);
}

function updatePasswordStrength(){
  const password=$('accountNewPassword')?.value||'';
  const score=passwordStrengthScore(password);
  const bar=$('passwordStrengthBar');
  const text=$('passwordStrengthText');
  const labels=[
    'Gebruik minimaal 10 tekens.',
    'Zwak wachtwoord',
    'Redelijk wachtwoord',
    'Sterk wachtwoord',
    'Zeer sterk wachtwoord'
  ];

  if(bar){
    bar.style.width=password?`${score*25}%`:'0%';
    bar.dataset.score=String(score);
  }
  if(text)text.textContent=labels[score];
}

function formatAccountDate(value){
  if(!value)return 'Onbekend';

  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return 'Onbekend';

  return date.toLocaleString('nl-NL',{
    day:'2-digit',
    month:'2-digit',
    year:'numeric',
    hour:'2-digit',
    minute:'2-digit'
  });
}


function setApprovalView(status='pending'){
  const pending=status==='pending';
  const rejected=status==='rejected';

  $('approvalIcon').textContent=pending?'⏳':rejected?'⛔':'🔐';
  $('approvalTitle').textContent=pending
    ?'Wachten op toestemming'
    :rejected
      ?'Toegang niet goedgekeurd'
      :'Account geblokkeerd';

  $('approvalText').textContent=pending
    ?'Je account is aangemaakt. Michel moet eerst toestemming geven voordat MijnSerenity opent.'
    :rejected
      ?'De beheerder heeft dit account niet goedgekeurd. Neem contact op met Michel.'
      :'Dit account heeft momenteel geen toegang tot MijnSerenity.';

  $('approvalEmail').textContent=currentUser?.email||'–';
  $('approvalStatusMsg').textContent=pending
    ?'Tik later op Status vernieuwen nadat Michel het account heeft goedgekeurd.'
    :'Je kunt MijnSerenity niet openen met dit account.';
}

async function loadMyAccountAccess(){
  if(!currentUser)return null;

  const {data,error}=await sb
    .from('account_access')
    .select('user_id,email,status,is_admin,requested_at,reviewed_at')
    .eq('user_id',currentUser.id)
    .maybeSingle();

  if(error){
    if(
      error.code==='42P01'||
      error.code==='PGRST205'||
      String(error.message||'').includes('account_access')
    ){
      console.warn('Accountgoedkeuring is nog niet via SQL geactiveerd.');
      return {
        user_id:currentUser.id,
        email:currentUser.email||'',
        status:'approved',
        is_admin:String(currentUser.email||'').toLowerCase()==='michelvissia@gmail.com',
        setup_missing:true
      };
    }
    throw error;
  }

  if(data)return data;

  const {data:created,error:createError}=await sb.rpc('ensure_my_account_access');
  if(createError)throw createError;

  return created||{
    user_id:currentUser.id,
    email:currentUser.email||'',
    status:'pending',
    is_admin:false
  };
}

async function refreshAccountApproval(){
  const button=event?.currentTarget;
  if(button)button.disabled=true;

  try{
    accountAccess=await loadMyAccountAccess();

    if(accountAccess?.status==='approved'){
      $('approvalStatusMsg').textContent='Toegang goedgekeurd ✅ MijnSerenity wordt geopend…';
      await initialise({user:currentUser});
      return;
    }

    setApprovalView(accountAccess?.status||'pending');
  }catch(error){
    console.error('Goedkeuringsstatus laden mislukt:',error);
    $('approvalStatusMsg').textContent='Status kon niet worden geladen. Probeer het opnieuw.';
  }finally{
    if(button)button.disabled=false;
  }
}

function isAppAdmin(){
  return accountAccess?.status==='approved'&&accountAccess?.is_admin===true;
}

function adminStatusLabel(status){
  if(status==='approved')return 'Goedgekeurd';
  if(status==='rejected')return 'Geweigerd';
  return 'Wacht op toestemming';
}

function adminStatusClass(status){
  if(status==='approved')return 'approved';
  if(status==='rejected')return 'rejected';
  return 'pending';
}


function accountDisplayName(account){
  const name=String(account?.display_name||'').trim();
  if(name)return name;

  return String(account?.email||'Account')
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map(part=>part.charAt(0).toUpperCase()+part.slice(1))
    .join(' ');
}

function accountIsOnline(account){
  if(!account?.last_seen_at)return false;
  const lastSeen=new Date(account.last_seen_at).getTime();
  return Number.isFinite(lastSeen)&&Date.now()-lastSeen<2*60*1000;
}

function accountLastSeenLabel(account){
  if(!account?.last_seen_at)return 'Nog niet actief geweest';

  if(accountIsOnline(account))return 'Nu online';

  const timestamp=new Date(account.last_seen_at);
  const difference=Date.now()-timestamp.getTime();

  if(difference<60*60*1000){
    const minutes=Math.max(2,Math.round(difference/60000));
    return `${minutes} minuten geleden actief`;
  }

  return `Laatst actief ${formatAccountDate(account.last_seen_at)}`;
}

function currentDeviceLabel(){
  const userAgent=navigator.userAgent||'';
  const platform=navigator.platform||'';

  if(/iPad/i.test(userAgent)||(
    platform==='MacIntel'&&navigator.maxTouchPoints>1
  ))return 'iPad';

  if(/iPhone/i.test(userAgent))return 'iPhone';
  if(/Mac/i.test(platform))return 'Mac';
  if(/Android/i.test(userAgent))return 'Android';
  if(/Windows/i.test(platform))return 'Windows';

  return 'Webbrowser';
}

async function touchAccountPresence(){
  if(!currentUser)return;

  const displayName=[
    currentUser.user_metadata?.first_name,
    currentUser.user_metadata?.given_name,
    currentUser.user_metadata?.full_name,
    getLoggedInFirstName()
  ].find(value=>String(value||'').trim())||'';

  try{
    const {error}=await sb.rpc('touch_my_account_presence',{
      device_name:currentDeviceLabel(),
      profile_name:String(displayName).trim()
    });

    if(error){
      if(
        error.code==='PGRST202'||
        String(error.message||'').includes('touch_my_account_presence')
      ){
        console.warn('Online status is nog niet via SQL geactiveerd.');
        return;
      }
      throw error;
    }

    if(isAppAdmin()&&!$('adminAccessSection')?.classList.contains('hidden')){
      loadAdminAccounts();
    }
  }catch(error){
    console.warn('Online status bijwerken mislukt:',error);
  }
}

function startPresenceHeartbeat(){
  stopPresenceHeartbeat();
  touchAccountPresence();

  presenceHeartbeatTimer=setInterval(
    ()=>touchAccountPresence(),
    60000
  );
}

function stopPresenceHeartbeat(){
  if(presenceHeartbeatTimer){
    clearInterval(presenceHeartbeatTimer);
    presenceHeartbeatTimer=null;
  }
  if(adminAccountRefreshTimer){
    clearInterval(adminAccountRefreshTimer);
    adminAccountRefreshTimer=null;
  }
}

function startAdminAccountRefresh(){
  if(adminAccountRefreshTimer){
    clearInterval(adminAccountRefreshTimer);
  }

  adminAccountRefreshTimer=setInterval(()=>{
    if(
      isAppAdmin()&&
      !$('adminAccessSection')?.classList.contains('hidden')
    ){
      loadAdminAccounts();
    }
  },45000);
}

function applyAdminVisibility(){
  const admin=isAppAdmin();

  $('boatManagementTab')?.classList.toggle('hidden',!admin);
  document.querySelector('.settings-share-button')
    ?.classList.toggle('hidden',!admin);
  $('boat')?.classList.toggle('admin-section-locked',!admin);

  if(!admin&&document.querySelector('#boat:not(.hidden)')){
    captainNavigate('settings');
  }
}

document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&currentUser){
    touchAccountPresence();
  }
});

function renderAdminAccounts(accounts=[]){
  const pending=accounts.filter(account=>account.status==='pending');
  const online=accounts.filter(account=>accountIsOnline(account));

  $('totalAccountCount').textContent=String(accounts.length);
  $('onlineAccountCount').textContent=String(online.length);
  $('pendingAccountCount').textContent=String(pending.length);
  $('dashboardPendingAccountCount').textContent=String(pending.length);
  $('adminApprovalDashboardCard')?.classList.toggle(
    'hidden',
    !isAppAdmin()||pending.length===0
  );

  const accountRow=(account,showActions=true)=>{
    const own=account.user_id===currentUser?.id;
    const admin=account.is_admin===true;
    const onlineNow=accountIsOnline(account);
    const statusClass=adminStatusClass(account.status);

    return `
      <div class="admin-account-row ${statusClass}">
        <div class="account-presence-dot ${onlineNow?'online':'offline'}"></div>

        <div class="admin-account-copy">
          <b>${esc(accountDisplayName(account))}</b>
          <span class="admin-account-email">${esc(account.email||'Onbekend account')}</span>
          <small>
            <span class="admin-status-pill ${statusClass}">
              ${adminStatusLabel(account.status)}
            </span>
            ${admin?' · Beheerder':''}
            · ${esc(accountLastSeenLabel(account))}
            ${account.last_device?' · '+esc(account.last_device):''}
          </small>
        </div>

        ${!showActions||own||admin
          ?'<span class="small protected-account">Beschermd</span>'
          :`<div class="admin-account-actions">
              ${account.status==='approved'
                ?`<button type="button" class="small-danger"
                    onclick='setAccountApproval(${JSON.stringify(account.user_id)},"rejected")'>
                    Toegang intrekken
                  </button>`
                :account.status==='pending'
                  ?`<button type="button"
                      onclick='setAccountApproval(${JSON.stringify(account.user_id)},"approved")'>
                      Goedkeuren
                    </button>
                    <button type="button" class="small-danger"
                      onclick='setAccountApproval(${JSON.stringify(account.user_id)},"rejected")'>
                      Weigeren
                    </button>`
                  :`<button type="button"
                      onclick='setAccountApproval(${JSON.stringify(account.user_id)},"approved")'>
                      Alsnog goedkeuren
                    </button>`}
            </div>`
        }
      </div>
    `;
  };

  $('pendingAccountsList').innerHTML=pending.length
    ?pending.map(account=>accountRow(account,true)).join('')
    :'<span class="small">Geen wachtende accounts.</span>';

  $('allAccountsList').innerHTML=accounts.length
    ?accounts.map(account=>accountRow(account,true)).join('')
    :'<span class="small">Nog geen accounts.</span>';
}

async function loadAdminAccounts(){
  const section=$('adminAccessSection');

  if(!isAppAdmin()){
    section?.classList.add('hidden');
    $('adminApprovalDashboardCard')?.classList.add('hidden');
    return;
  }

  section?.classList.remove('hidden');

  try{
    const {data,error}=await sb
      .from('account_access')
      .select(
        'user_id,email,display_name,status,is_admin,requested_at,reviewed_at,last_seen_at,last_device'
      )
      .order('requested_at',{ascending:false});

    if(error)throw error;

    renderAdminAccounts(data||[]);
    startAdminAccountRefresh();
  }catch(error){
    console.error('Gebruikersbeheer laden mislukt:',error);
    $('pendingAccountsList').innerHTML=
      `<span class="small">Gebruikers konden niet worden geladen: ${esc(error?.message||'onbekende fout')}</span>`;
    $('allAccountsList').innerHTML='';
  }
}

async function setAccountApproval(userId,status){
  const action=status==='approved'?'goedkeuren':'weigeren';

  if(!confirm(`Dit account ${action}?`))return;

  try{
    setAccountMsg(`Account ${action}…`);

    const {error}=await sb.rpc('admin_set_account_status',{
      target_user:userId,
      new_status:status
    });

    if(error)throw error;

    setAccountMsg(
      status==='approved'
        ?'Account goedgekeurd ✅'
        :'Toegang ingetrokken of geweigerd.'
    );
    await loadAdminAccounts();
  }catch(error){
    console.error('Accountstatus wijzigen mislukt:',error);
    setAccountMsg(error?.message||'Accountstatus wijzigen mislukt.',true);
  }
}

function openAdminAccountManagement(){
  captainNavigate('settings');
  setPanelCollapsed('accountPanelWrap','accountPanelToggle',false);
  setTimeout(()=>{
    loadAccountManagement();
    loadAdminAccounts();
    $('adminAccessSection')?.scrollIntoView({behavior:'smooth',block:'start'});
  },100);
}

async function signIn(){
  const email=String($('email')?.value||'').trim();
  const password=$('password')?.value||'';
  const button=$('signInButton');

  if(!email||!password){
    return setMsg('Vul e-mailadres en wachtwoord in.');
  }

  try{
    button.disabled=true;
    setMsg('Veilig inloggen…');

    const {error}=await sb.auth.signInWithPassword({email,password});
    if(error)throw error;

    $('password').value='';
  }catch(error){
    console.error('Inloggen mislukt:',error);
    setMsg(friendlyAuthError(error));
  }finally{
    button.disabled=false;
  }
}



async function signOut(){
  await signOutCurrentDevice();
}

async function loadAccountManagement(){
  if(!currentUser)return;

  try{
    const {data,error}=await sb.auth.getUser();
    if(error)throw error;

    currentUser=data.user||currentUser;
    const metadata=currentUser.user_metadata||{};

    $('accountEmail').textContent=currentUser.email||'–';
    $('accountEmailStatus').textContent=currentUser.email_confirmed_at
      ?'Bevestigd ✅'
      :'Nog niet bevestigd';
    $('accountBoatRole').textContent=currentRole==='owner'
      ?'Eigenaar'
      :currentRole==='member'
        ?'Lid'
        :'Geen boot gekoppeld';
    $('accountLastSignIn').textContent=formatAccountDate(
      currentUser.last_sign_in_at
    );
    $('accountFirstName').value=
      metadata.first_name||
      metadata.given_name||
      getLoggedInFirstName()||
      '';

    $('accountSecurityBadge').textContent=currentUser.email_confirmed_at
      ?'Beveiligd'
      :'E-mail controleren';
    $('accountSecurityBadge').classList.toggle(
      'warning',
      !currentUser.email_confirmed_at
    );

    $('adminAccessSection')?.classList.toggle('hidden',!isAppAdmin());

    if(isAppAdmin()){
      await loadAdminAccounts();
    }

    setAccountMsg('');
  }catch(error){
    console.error('Accountgegevens laden mislukt:',error);
    setAccountMsg(friendlyAuthError(error),true);
  }
}

async function saveAccountProfile(){
  const firstName=String($('accountFirstName')?.value||'').trim();

  if(firstName.length<2){
    return setAccountMsg('Vul een geldige voornaam in.',true);
  }

  try{
    setAccountMsg('Profielnaam opslaan…');

    const {data,error}=await sb.auth.updateUser({
      data:{
        ...(currentUser?.user_metadata||{}),
        first_name:firstName
      }
    });

    if(error)throw error;

    currentUser=data.user||currentUser;
    $('welcome').textContent='Welkom aan boord, '+getLoggedInFirstName();
    await touchAccountPresence();
    setAccountMsg('Profielnaam opgeslagen ✅');
  }catch(error){
    console.error('Profielnaam opslaan mislukt:',error);
    setAccountMsg(friendlyAuthError(error),true);
  }
}

async function changeAccountPassword(){
  const password=$('accountNewPassword')?.value||'';
  const confirmation=$('accountConfirmPassword')?.value||'';
  const button=$('changePasswordButton');

  if(password.length<10){
    return setAccountMsg('Gebruik een wachtwoord van minimaal 10 tekens.',true);
  }
  if(password!==confirmation){
    return setAccountMsg('De twee wachtwoorden zijn niet gelijk.',true);
  }
  if(passwordStrengthScore(password)<2){
    return setAccountMsg('Kies een sterker wachtwoord met cijfers en verschillende tekens.',true);
  }

  try{
    button.disabled=true;
    setAccountMsg('Wachtwoord wijzigen…');

    const {error}=await sb.auth.updateUser({password});
    if(error)throw error;

    $('accountNewPassword').value='';
    $('accountConfirmPassword').value='';
    updatePasswordStrength();

    setAccountMsg('Wachtwoord gewijzigd ✅ Andere apparaten kun je hieronder uitloggen.');
  }catch(error){
    console.error('Wachtwoord wijzigen mislukt:',error);
    setAccountMsg(friendlyAuthError(error),true);
  }finally{
    button.disabled=false;
  }
}

async function sendPasswordReset(fromAccount=false){
  const email=fromAccount
    ?String(currentUser?.email||'').trim()
    :String($('email')?.value||'').trim();

  const showMessage=(message,isError=false)=>{
    if(fromAccount)setAccountMsg(message,isError);
    else setMsg(message);
  };

  if(!email){
    showMessage('Vul eerst je e-mailadres in.',true);
    return;
  }

  try{
    showMessage('Herstelmail wordt verstuurd…');

    const redirectTo=window.location.origin+window.location.pathname;
    const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo});
    if(error)throw error;

    showMessage('Herstelmail verstuurd. Controleer ook de map Ongewenste e-mail.');
  }catch(error){
    console.error('Herstelmail sturen mislukt:',error);
    showMessage(friendlyAuthError(error),true);
  }
}

async function signOutCurrentDevice(){
  stopPresenceHeartbeat();

  try{
    const {error}=await sb.auth.signOut({scope:'local'});
    if(error)throw error;
  }catch(error){
    alert('Uitloggen mislukt: '+friendlyAuthError(error));
  }
}

async function signOutOtherDevices(){
  if(!confirm('Alle andere apparaten uitloggen, maar dit apparaat ingelogd houden?'))return;

  try{
    setAccountMsg('Andere apparaten uitloggen…');
    const {error}=await sb.auth.signOut({scope:'others'});
    if(error)throw error;
    setAccountMsg('Andere apparaten zijn uitgelogd ✅');
  }catch(error){
    console.error('Andere apparaten uitloggen mislukt:',error);
    setAccountMsg(friendlyAuthError(error),true);
  }
}

async function signOutAllDevices(){
  if(!confirm('Alle apparaten uitloggen, inclusief dit apparaat?'))return;

  stopPresenceHeartbeat();

  try{
    const {error}=await sb.auth.signOut({scope:'global'});
    if(error)throw error;
  }catch(error){
    alert('Alle apparaten uitloggen mislukt: '+friendlyAuthError(error));
  }
}

async function handleAuthStateChange(event,session){
  await initialise(session);

  if(event==='PASSWORD_RECOVERY'&&session?.user){
    setTimeout(()=>{
      captainNavigate('settings');
      setPanelCollapsed('accountPanelWrap','accountPanelToggle',false);
      loadAccountManagement();
      $('accountNewPassword')?.focus();
      setAccountMsg('Kies nu een nieuw wachtwoord voor je account.');
    },120);
  }
}

async function initialise(session){
  const initialiseKey=session?.user?.id||'anonymous';
  if(
    initialiseKey===storageSafeInitialiseKey&&
    Date.now()-storageSafeInitialiseAt<5000
  ){
    storageSafeStats.preventedReloads++;
    storageSafeRenderStatus();
    return;
  }
  storageSafeInitialiseKey=initialiseKey;
  storageSafeInitialiseAt=Date.now();
  currentUser=session?.user||null;

  $('authView').classList.add('hidden');
  $('approvalView').classList.add('hidden');
  $('appView').classList.add('hidden');

  if(!currentUser){
    stopPresenceHeartbeat();
    accountAccess=null;
    currentBoat=null;
    currentRole=null;
    $('authView').classList.remove('hidden');

    if(liveChannel){
      await sb.removeChannel(liveChannel);
      liveChannel=null;
    }
    return;
  }

  try{
    accountAccess=await loadMyAccountAccess();
  }catch(error){
    console.error('Accounttoegang laden mislukt:',error);
    accountAccess={
      status:'pending',
      is_admin:false
    };
  }

  if(accountAccess?.status!=='approved'){
    startPresenceHeartbeat();
    currentBoat=null;
    currentRole=null;
    $('approvalView').classList.remove('hidden');
    setApprovalView(accountAccess?.status||'pending');

    if(liveChannel){
      await sb.removeChannel(liveChannel);
      liveChannel=null;
    }
    return;
  }

  $('appView').classList.remove('hidden');
  startPresenceHeartbeat();
  applyAdminVisibility();
  $('welcome').textContent='Welkom aan boord, '+getLoggedInFirstName();
  resetPoiFilters(false);

  await loadMembership();
  renderBoat();

  if(currentBoat){
    await Promise.all([
      loadSettings(),
      loadPois(),
      loadCosts(),
      loadTrips(),
      loadTechnicalDashboard()
    ]);
    subscribeRealtime();
  }

  $('tripCrew').value=$('tripCrew').value||'Michel, Desi';
  closeTripForm();
  collapseDefaultPanels();

  if(accountAccess?.setup_missing&&isAppAdmin()){
    console.warn('Voer SUPABASE_ACCOUNT_GOEDKEURING_5_1_37.sql uit om accountgoedkeuring te activeren.');
  }

  if(isAppAdmin()){
    startAdminAccountRefresh();
    loadAdminAccounts().catch(error=>
      console.error('Wachtende accounts laden mislukt:',error)
    );
  }

  setTimeout(()=>captainNavigate('dashboard'),0);
}
sb.auth.onAuthStateChange((event,session)=>{
  setTimeout(()=>handleAuthStateChange(event,session),0);
});

async function loadMembership(){const {data,error}=await sb.from('boat_members').select('role,boat_id,boats(id,name,created_by)').eq('user_id',currentUser.id).limit(1);if(error){alert('Lidmaatschap laden mislukt: '+error.message);return}if(data?.length){currentRole=data[0].role;currentBoat=data[0].boats}else{currentRole=null;currentBoat=null}}
function renderBoat(){
  const admin=isAppAdmin();

  $('noBoatCard').classList.toggle('hidden',!!currentBoat||!admin);
  $('boatCard').classList.toggle('hidden',!currentBoat||!admin);
  $('dBoat').textContent=currentBoat?.name||'-';

  if(currentBoat){
    $('boatName').textContent=currentBoat.name;
    $('rolePill').textContent=currentRole==='owner'?'Eigenaar':'Lid';
    $('ownerInvite').classList.toggle(
      'hidden',
      !admin||currentRole!=='owner'
    );
  }

  applyAdminVisibility();
}
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
    const originalReview=String($('poiReview')?.value||'').trim();
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

    saveButton.disabled=true;

    const localFiles=[...($('poiPhotos')?.files||[])].slice(0,6);
    const availableSlots=Math.max(0,6-localFiles.length);
    const selectedWebPhotos=selectedPoiWebPhotos.slice(0,availableSlots);
    const downloadedWebPhotos=[];
    const webFiles=[];
    let webPhotoFailures=0;

    for(let i=0;i<selectedWebPhotos.length;i++){
      const photo=selectedWebPhotos[i];

      try{
        setPoiProgress(
          `Internetfoto ${i+1} van ${selectedWebPhotos.length} voorbereiden…`
        );
        const file=await webPhotoToFile(photo,i);
        webFiles.push(file);
        downloadedWebPhotos.push(photo);
      }catch(error){
        webPhotoFailures++;
        console.warn('Internetfoto voorbereiden mislukt:',photo,error);
      }
    }

    const review=composePoiReviewWithWebPhotos(
      originalReview,
      downloadedWebPhotos
    );

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

    const files=[...localFiles,...webFiles].slice(0,6);

    if(files.length){
      setPoiProgress(
        `POI opgeslagen · ${files.length} foto${files.length===1?'':'’s'} uploaden…`
      );
      await uploadPoiPhotos(poiId,files);
    }

    resetPoiFilters(false);
    await loadPois();

    if(mapInstance)renderPoiMarkers();

    clearPoiForm(true);

    if(webPhotoFailures){
      showAppToast(
        `POI opgeslagen. ${webPhotoFailures} internetfoto${webPhotoFailures===1?' kon':'’s konden'} niet worden toegevoegd.`
      );
    }else{
      showAppToast(id?'POI bijgewerkt ✅':'POI opgeslagen ✅');
    }
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
  resetPoiWebPhotoSearch();
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

function plainTextFromHtml(value){
  const container=document.createElement('div');
  container.innerHTML=String(value||'');
  return String(container.textContent||container.innerText||'')
    .replace(/\s+/g,' ')
    .trim();
}

function commonsMetadataValue(metadata,key){
  return plainTextFromHtml(metadata?.[key]?.value||'');
}

function commonsPhotoKey(photo){
  return String(
    photo?.pageId||
    photo?.sourceUrl||
    photo?.downloadUrl||
    photo?.title||
    ''
  );
}

function normalizeCommonsPhoto(page,kind='zoekresultaat'){
  const info=page?.imageinfo?.[0];
  if(!info)return null;

  const mime=String(info.mime||'').toLowerCase();
  if(!['image/jpeg','image/png','image/webp'].includes(mime))return null;

  const width=Number(info.width||0);
  const height=Number(info.height||0);
  if(width&&height&&Math.max(width,height)<350)return null;

  const metadata=info.extmetadata||{};
  const title=String(page.title||'')
    .replace(/^File:/i,'')
    .replace(/_/g,' ')
    .trim();

  const description=
    commonsMetadataValue(metadata,'ImageDescription')||
    title;

  const artist=
    commonsMetadataValue(metadata,'Artist')||
    commonsMetadataValue(metadata,'Credit')||
    'Onbekende maker';

  const license=
    commonsMetadataValue(metadata,'LicenseShortName')||
    commonsMetadataValue(metadata,'UsageTerms')||
    'Zie bronpagina';

  const sourceUrl=
    info.descriptionurl||
    `https://commons.wikimedia.org/wiki/${encodeURIComponent(
      String(page.title||'').replace(/ /g,'_')
    )}`;

  const coordinate=Array.isArray(page.coordinates)
    ?page.coordinates[0]
    :null;
  const latitude=Number(coordinate?.lat);
  const longitude=Number(coordinate?.lon);

  const metadataText=[
    title,
    description,
    commonsMetadataValue(metadata,'ObjectName'),
    commonsMetadataValue(metadata,'Categories'),
    commonsMetadataValue(metadata,'Location'),
    commonsMetadataValue(metadata,'Credit')
  ].filter(Boolean).join(' ');

  return {
    pageId:String(page.pageid||page.title||sourceUrl),
    title,
    description,
    metadataText,
    artist,
    license,
    sourceUrl,
    previewUrl:info.thumburl||info.url,
    downloadUrl:info.thumburl||info.url,
    originalUrl:info.url,
    mime,
    width,
    height,
    latitude:Number.isFinite(latitude)?latitude:null,
    longitude:Number.isFinite(longitude)?longitude:null,
    kind,
    relevanceScore:0,
    relevanceLabel:'',
    relevanceReasons:[],
    distanceKm:null
  };
}

function commonsApiPages(payload){
  return Object.values(payload?.query?.pages||{});
}

async function fetchCommonsPhotosByText(query,signal){
  const clean=String(query||'').trim();
  if(!clean)return [];

  const params=new URLSearchParams({
    action:'query',
    format:'json',
    origin:'*',
    generator:'search',
    gsrnamespace:'6',
    gsrsearch:clean,
    gsrlimit:'20',
    prop:'imageinfo',
    iiprop:'url|mime|size|extmetadata',
    iiurlwidth:'960'
  });

  const response=await fetch(
    `https://commons.wikimedia.org/w/api.php?${params.toString()}`,
    {
      headers:{Accept:'application/json'},
      signal
    }
  );

  if(!response.ok){
    throw new Error(`Afbeeldingen zoeken gaf fout ${response.status}`);
  }

  const payload=await response.json();
  return commonsApiPages(payload)
    .map(page=>normalizeCommonsPhoto(page,'naam en plaats'))
    .filter(Boolean);
}

async function fetchCommonsPhotosByCoordinates(latitude,longitude,signal){
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude))return [];

  const params=new URLSearchParams({
    action:'query',
    format:'json',
    origin:'*',
    generator:'geosearch',
    ggsnamespace:'6',
    ggsprimary:'all',
    ggscoord:`${latitude}|${longitude}`,
    ggsradius:'500',
    ggslimit:'40',
    prop:'imageinfo|coordinates',
    iiprop:'url|mime|size|extmetadata',
    iiurlwidth:'960'
  });

  const response=await fetch(
    `https://commons.wikimedia.org/w/api.php?${params.toString()}`,
    {
      headers:{Accept:'application/json'},
      signal
    }
  );

  if(!response.ok){
    throw new Error(`Foto’s bij de POI zoeken gaf fout ${response.status}`);
  }

  const payload=await response.json();
  return commonsApiPages(payload)
    .map(page=>normalizeCommonsPhoto(page,'direct bij POI'))
    .filter(Boolean);
}


function poiPhotoNormaliseText(value){
  return String(value||'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function poiPhotoTokens(value,{allowGeneric=false}={}){
  const stopWords=new Set([
    'de','het','een','van','der','den','des','te','ten','ter',
    'aan','op','in','bij','voor','en','of','the','at','of',
    'nederland','netherlands'
  ]);

  const generic=new Set([
    'haven','havens','jachthaven','jachthavens','marina','marinas',
    'passantenhaven','boothaven','watersport','watersportvereniging',
    'restaurant','cafe','cafeteria','cafetaria','snackbar',
    'supermarkt','tankstation','camping','winkel','apotheek',
    'bakker','parking','parkeren','toilet','drinkwaterpunt',
    'club','yacht','harbour'
  ]);

  return [...new Set(
    poiPhotoNormaliseText(value)
      .split(' ')
      .filter(token=>
        token.length>=3&&
        !stopWords.has(token)&&
        (allowGeneric||!generic.has(token))
      )
  )];
}

function poiWebPhotoContext(){
  const name=String($('poiName')?.value||'').trim();
  const place=String($('poiPlace')?.value||'').trim();
  const address=String($('poiAddress')?.value||'').trim();
  const category=String($('poiCategory')?.value||'').trim();
  const latitude=Number($('poiLatitude')?.value);
  const longitude=Number($('poiLongitude')?.value);

  const addressStreet=address
    .split(',')[0]
    .replace(/\b\d+[a-zA-Z-]*\b/g,' ')
    .trim();

  return {
    name,
    place,
    address,
    category,
    latitude:Number.isFinite(latitude)?latitude:null,
    longitude:Number.isFinite(longitude)?longitude:null,
    nameNormalised:poiPhotoNormaliseText(name),
    placeNormalised:poiPhotoNormaliseText(place),
    addressNormalised:poiPhotoNormaliseText(address),
    nameTokens:poiPhotoTokens(name),
    placeTokens:poiPhotoTokens(place,{allowGeneric:true}),
    streetTokens:poiPhotoTokens(addressStreet,{allowGeneric:true}),
    categoryTokens:poiPhotoTokens(category,{allowGeneric:true})
  };
}

function poiPhotoDistanceKm(photo,context){
  if(
    !Number.isFinite(photo?.latitude)||
    !Number.isFinite(photo?.longitude)||
    !Number.isFinite(context?.latitude)||
    !Number.isFinite(context?.longitude)
  )return null;

  return haversineKm(
    {lat:context.latitude,lon:context.longitude},
    {lat:photo.latitude,lon:photo.longitude}
  );
}

function poiPhotoKeywordEvidence(tokens,text){
  const matched=(tokens||[]).filter(token=>
    text.includes(token)
  );

  return {
    matched,
    count:matched.length,
    all:Boolean(tokens?.length)&&matched.length===tokens.length
  };
}

function scorePoiWebPhoto(photo,context){
  const text=poiPhotoNormaliseText(
    photo?.metadataText||
    `${photo?.title||''} ${photo?.description||''}`
  );

  const nameEvidence=poiPhotoKeywordEvidence(
    context.nameTokens,
    text
  );
  const placeEvidence=poiPhotoKeywordEvidence(
    context.placeTokens,
    text
  );
  const streetEvidence=poiPhotoKeywordEvidence(
    context.streetTokens,
    text
  );
  const categoryEvidence=poiPhotoKeywordEvidence(
    context.categoryTokens,
    text
  );

  const exactName=Boolean(
    context.nameNormalised.length>=3&&
    text.includes(context.nameNormalised)
  );

  const distanceKm=poiPhotoDistanceKm(photo,context);
  const veryClose=Number.isFinite(distanceKm)&&distanceKm<=.12;
  const close=Number.isFinite(distanceKm)&&distanceKm<=.30;
  const nearby=Number.isFinite(distanceKm)&&distanceKm<=.50;

  let score=0;
  const reasons=[];

  if(exactName){
    score+=16;
    reasons.push('exacte POI-naam');
  }

  if(nameEvidence.all){
    score+=10;
    reasons.push('volledige naamsmatch');
  }else if(nameEvidence.count){
    score+=nameEvidence.count*4;
    reasons.push('naam herkenbaar');
  }

  if(placeEvidence.count){
    score+=Math.min(3,placeEvidence.count);
    reasons.push('juiste plaats');
  }

  if(streetEvidence.count){
    score+=Math.min(4,streetEvidence.count*2);
    reasons.push('adres herkenbaar');
  }

  if(categoryEvidence.count){
    score+=1;
  }

  if(veryClose){
    score+=10;
    reasons.push('binnen 120 meter');
  }else if(close){
    score+=6;
    reasons.push('binnen 300 meter');
  }else if(nearby){
    score+=3;
    reasons.push('binnen 500 meter');
  }

  const hasDistinctName=context.nameTokens.length>0;
  const strongNameMatch=exactName||nameEvidence.all||
    nameEvidence.count>=Math.min(2,context.nameTokens.length);
  const locationConfirmed=veryClose&&(
    nameEvidence.count||
    categoryEvidence.count||
    streetEvidence.count
  );
  const textConfirmed=strongNameMatch&&(
    placeEvidence.count||
    streetEvidence.count||
    score>=16
  );

  const related=hasDistinctName
    ?(textConfirmed||locationConfirmed)
    :(
      veryClose&&
      (streetEvidence.count||categoryEvidence.count)&&
      placeEvidence.count
    );

  let label='Mogelijke match';
  if(exactName&&veryClose)label='Exacte naam + locatie';
  else if(exactName)label='Exacte POI-naam';
  else if(nameEvidence.all&&placeEvidence.count)label='Naam + plaats';
  else if(locationConfirmed)label='Direct bij POI';
  else if(nameEvidence.count&&streetEvidence.count)label='Naam + adres';

  return {
    ...photo,
    relevanceScore:score,
    relevanceLabel:label,
    relevanceReasons:[...new Set(reasons)],
    distanceKm,
    related
  };
}

function filterRelevantPoiWebPhotos(photos,context){
  return (photos||[])
    .map(photo=>scorePoiWebPhoto(photo,context))
    .filter(photo=>photo.related)
    .sort((a,b)=>{
      const scoreDifference=
        Number(b.relevanceScore||0)-
        Number(a.relevanceScore||0);

      if(scoreDifference)return scoreDifference;

      const aDistance=Number.isFinite(a.distanceKm)
        ?a.distanceKm
        :9999;
      const bDistance=Number.isFinite(b.distanceKm)
        ?b.distanceKm
        :9999;

      return aDistance-bDistance;
    });
}

function poiWebPhotoSearchQueries(){
  const name=String($('poiName')?.value||'').trim();
  const place=String($('poiPlace')?.value||'').trim();
  const address=String($('poiAddress')?.value||'').trim();
  const category=String($('poiCategory')?.value||'').trim();

  if(name.length<3)return [];

  const quotedName=`"${name.replace(/"/g,'')}"`;
  const queries=[
    [quotedName,place].filter(Boolean).join(' '),
    [`intitle:${quotedName}`,place].filter(Boolean).join(' '),
    [quotedName,address].filter(Boolean).join(' '),
    [quotedName,category,place].filter(Boolean).join(' ')
  ];

  const seen=new Set();

  return queries.filter(query=>{
    const key=query.toLowerCase().replace(/\s+/g,' ').trim();
    if(key.length<3||seen.has(key))return false;
    seen.add(key);
    return true;
  });
}

function setPoiWebPhotoStatus(message,state=''){
  const status=$('poiWebPhotoStatus');
  if(!status)return;

  status.textContent=message||'';
  status.classList.toggle('hidden',!message);
  status.classList.remove('success','warning','error');

  if(state)status.classList.add(state);
}

function isPoiWebPhotoSelected(photo){
  const key=commonsPhotoKey(photo);
  return selectedPoiWebPhotos.some(
    selected=>commonsPhotoKey(selected)===key
  );
}

function renderPoiWebPhotos(){
  const container=$('poiWebPhotoResults');
  if(!container)return;

  if(!poiWebPhotoResults.length){
    container.innerHTML='';
    container.classList.add('hidden');
    return;
  }

  container.innerHTML=poiWebPhotoResults.map((photo,index)=>{
    const selected=isPoiWebPhotoSelected(photo);
    const distanceText=Number.isFinite(photo.distanceKm)
      ?`${Math.round(photo.distanceKm*1000)} m van POI`
      :'';

    return `
      <article class="poi-web-photo-card ${selected?'selected':''}">
        <button type="button"
          class="poi-web-photo-select"
          onclick="togglePoiWebPhoto(${index})"
          aria-label="${selected?'Foto niet gebruiken':'Foto gebruiken'}">
          <img src="${esc(photo.previewUrl)}"
            loading="lazy"
            alt="${esc(photo.description||photo.title)}">
          <span class="poi-web-photo-relevance">
            ✓ ${esc(photo.relevanceLabel||'Gerelateerd')}
          </span>
          <span class="poi-web-photo-check">
            ${selected?'✓ Geselecteerd':'＋ Gebruiken'}
          </span>
        </button>

        <div class="poi-web-photo-meta">
          <strong>${esc(photo.title||'Internetfoto')}</strong>
          <small>
            ${esc([
              distanceText,
              ...(photo.relevanceReasons||[]).slice(0,2)
            ].filter(Boolean).join(' · '))}
          </small>
          <small>${esc(photo.artist||'Onbekende maker')}</small>
          <small>${esc(photo.license||'Zie bronpagina')}</small>
          <a href="${esc(photo.sourceUrl)}"
            target="_blank"
            rel="noopener noreferrer">
            Controleer bron
          </a>
        </div>
      </article>
    `;
  }).join('');

  container.classList.remove('hidden');

  const selectedCount=selectedPoiWebPhotos.length;
  setPoiWebPhotoStatus(
    selectedCount
      ?`${selectedCount} gerelateerde foto${selectedCount===1?'':'’s'} geselecteerd. Deze worden bij Opslaan toegevoegd.`
      :'Alleen duidelijk gerelateerde foto’s worden getoond. Controleer de bron en kies maximaal 3 foto’s.',
    selectedCount?'success':''
  );
}

function togglePoiWebPhoto(index){
  const photo=poiWebPhotoResults[index];
  if(!photo)return;

  const key=commonsPhotoKey(photo);
  const selectedIndex=selectedPoiWebPhotos.findIndex(
    selected=>commonsPhotoKey(selected)===key
  );

  if(selectedIndex>=0){
    selectedPoiWebPhotos.splice(selectedIndex,1);
  }else{
    if(selectedPoiWebPhotos.length>=3){
      showAppToast('Je kunt maximaal 3 internetfoto’s selecteren.');
      return;
    }

    selectedPoiWebPhotos.push(photo);
  }

  renderPoiWebPhotos();
}

function resetPoiWebPhotoSearch(){
  poiWebPhotoController?.abort();
  poiWebPhotoController=null;
  poiWebPhotoResults=[];
  selectedPoiWebPhotos=[];

  const results=$('poiWebPhotoResults');
  if(results){
    results.innerHTML='';
    results.classList.add('hidden');
  }

  const status=$('poiWebPhotoStatus');
  if(status){
    status.textContent='';
    status.classList.add('hidden');
    status.classList.remove('success','warning','error');
  }
}

async function searchPoiWebPhotos({silent=false}={}){
  const context=poiWebPhotoContext();
  const queries=poiWebPhotoSearchQueries();

  if(context.name.length<3){
    if(!silent){
      alert('Vul eerst een duidelijke POI-naam van minimaal drie tekens in.');
      $('poiName')?.focus();
    }
    return;
  }

  if(!context.nameTokens.length){
    setPoiWebPhotoStatus(
      'De POI-naam is te algemeen om betrouwbare foto’s te vinden. Gebruik de specifieke naam van de haven, winkel of locatie.',
      'warning'
    );
    poiWebPhotoResults=[];
    renderPoiWebPhotos();
    return;
  }

  poiWebPhotoController?.abort();
  poiWebPhotoController=new AbortController();
  const signal=poiWebPhotoController.signal;

  if(!silent){
    setPoiWebPhotoStatus(
      `Gerelateerde foto’s zoeken voor ${[
        context.name,
        context.place
      ].filter(Boolean).join(' · ')}…`,
      'warning'
    );
  }

  try{
    const jobs=queries
      .slice(0,4)
      .map(query=>fetchCommonsPhotosByText(query,signal));

    if(
      Number.isFinite(context.latitude)&&
      Number.isFinite(context.longitude)
    ){
      jobs.push(
        fetchCommonsPhotosByCoordinates(
          context.latitude,
          context.longitude,
          signal
        )
      );
    }

    const batches=await Promise.allSettled(jobs);
    const seen=new Set();
    const collected=[];

    batches.forEach(batch=>{
      if(batch.status!=='fulfilled')return;

      batch.value.forEach(photo=>{
        const key=commonsPhotoKey(photo);
        if(!key||seen.has(key))return;
        seen.add(key);
        collected.push(photo);
      });
    });

    poiWebPhotoResults=filterRelevantPoiWebPhotos(
      collected,
      context
    ).slice(0,18);

    selectedPoiWebPhotos=selectedPoiWebPhotos.filter(selected=>
      poiWebPhotoResults.some(photo=>
        commonsPhotoKey(photo)===commonsPhotoKey(selected)
      )
    );

    renderPoiWebPhotos();

    if(!poiWebPhotoResults.length){
      setPoiWebPhotoStatus(
        `Geen foto gevonden die aantoonbaar bij “${context.name}” hoort. Algemene foto’s van ${context.place||'de omgeving'} zijn bewust niet getoond.`,
        'warning'
      );
    }else if(!silent){
      setPoiWebPhotoStatus(
        `${poiWebPhotoResults.length} duidelijk gerelateerde foto${poiWebPhotoResults.length===1?'':'’s'} gevonden. Controleer de bron voordat je een foto gebruikt.`,
        'success'
      );
    }
  }catch(error){
    if(error?.name==='AbortError')return;

    console.error('Gerelateerde internetfoto’s zoeken mislukt:',error);
    setPoiWebPhotoStatus(
      'Gerelateerde foto’s zoeken is niet gelukt. Probeer het later opnieuw.',
      'error'
    );
  }
}

function safeWebPhotoFilename(photo,index=0){
  const base=String(photo?.title||`poi-foto-${index+1}`)
    .replace(/\.[^.]+$/,'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9_-]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,80)||
    `poi-foto-${index+1}`;

  const extension=photo?.mime==='image/png'
    ?'png'
    :photo?.mime==='image/webp'
      ?'webp'
      :'jpg';

  return `${base}.${extension}`;
}

async function webPhotoToFile(photo,index=0){
  const response=await fetch(photo.downloadUrl,{
    mode:'cors',
    cache:'no-store'
  });

  if(!response.ok){
    throw new Error(`Foto downloaden gaf fout ${response.status}`);
  }

  const blob=await response.blob();
  if(!blob.type.startsWith('image/')){
    throw new Error('Het gedownloade bestand is geen afbeelding.');
  }

  return new File(
    [blob],
    safeWebPhotoFilename(photo,index),
    {
      type:blob.type||photo.mime||'image/jpeg',
      lastModified:Date.now()
    }
  );
}

function webPhotoAttributionLine(photo){
  return [
    `Internetfoto: ${photo.title||'Afbeelding'}`,
    `relatie ${photo.relevanceLabel||'gerelateerd aan POI'}`,
    `maker ${photo.artist||'onbekend'}`,
    `licentie ${photo.license||'zie bron'}`,
    `bron ${photo.sourceUrl||''}`
  ].filter(Boolean).join(' — ');
}

function composePoiReviewWithWebPhotos(review,photos=[]){
  const current=String(review||'').trim();
  const lines=photos
    .map(webPhotoAttributionLine)
    .filter(line=>line&&!current.includes(line));

  if(!lines.length)return current;

  const block=`Fotobronnen:\n${lines.join('\n')}`;
  return current?`${current}\n\n${block}`:block;
}

function openPoiWebPhotoSearchForPoi(id){
  const poi=getPoiById(id);
  if(!poi)return;

  closePoiDetails();
  editPoi(
    poi.id,
    poi.name,
    poi.category,
    poi.place,
    poi.address,
    poi.rating,
    poi.review,
    isFavoritePoi(poi),
    poi.latitude,
    poi.longitude
  );

  setTimeout(()=>{
    $('poiWebPhotoResults')?.scrollIntoView({
      behavior:'smooth',
      block:'center'
    });
    searchPoiWebPhotos();
  },180);
}

async function uploadPoiPhotos(poiId,files){
  for(let i=0;i<files.length;i++){
    const file=files[i];
    setPoiProgress(`Foto ${i+1} van ${files.length} uploaden…`);
    const safeExt=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
    const path=`${currentBoat.id}/${poiId}/${crypto.randomUUID()}.${safeExt}`;
    const {error:uploadError}=await sb.storage.from(PHOTO_BUCKET).upload(path,file,{cacheControl:'31536000',upsert:false,contentType:file.type||'image/jpeg'});
    if(uploadError){alert('Foto uploaden mislukt: '+uploadError.message);continue}
    const {error:metaError}=await sb.from('poi_photos').insert({poi_id:poiId,boat_id:currentBoat.id,created_by:currentUser.id,storage_path:path,original_name:file.name});
    if(metaError){await sb.storage.from(PHOTO_BUCKET).remove([path]);alert('Foto registreren mislukt: '+metaError.message)}
  }
}
async function deletePhoto(id,path){
  if(!confirm('Foto verwijderen?'))return;
  storageSafeForgetUrl(PHOTO_BUCKET,path);
  const {error:storageError}=await sb.storage.from(PHOTO_BUCKET).remove([path]);
  if(storageError)return alert(storageError.message);
  const {error}=await sb.from('poi_photos').delete().eq('id',id);
  if(error)alert(error.message);
}
async function loadPoiPhotos(){
  const {data,error}=await sb.from('poi_photos').select('*').eq('boat_id',currentBoat.id).order('created_at',{ascending:true});
  if(error){console.error(error);return {}}
  const grouped={};
  for(const photo of data||[]){
    (grouped[photo.poi_id]??=[]).push({...photo,url:null});
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
  poiLastMetadataLoadAt=Date.now();

  $('dPois').textContent=poiCache.length;
  updatePoiSuggestionLists();
  renderPoiList();
  renderCaptainCommandCenter();
  populatePlannerSelectors();
  renderHarbourLibrary();

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
    const sourceCanvas=document.createElement('canvas');

    const sourceScale=Math.min(
      1,
      1800/Math.max(img.naturalWidth,img.naturalHeight)
    );

    sourceCanvas.width=Math.max(1,Math.round(img.naturalWidth*sourceScale));
    sourceCanvas.height=Math.max(1,Math.round(img.naturalHeight*sourceScale));

    const sourceCtx=sourceCanvas.getContext('2d',{willReadFrequently:true});
    sourceCtx.drawImage(img,0,0,sourceCanvas.width,sourceCanvas.height);

    const pixels=sourceCtx.getImageData(
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height
    ).data;

    const step=4;
    let minX=sourceCanvas.width;
    let minY=sourceCanvas.height;
    let maxX=0;
    let maxY=0;
    let paperPixels=0;

    for(let y=0;y<sourceCanvas.height;y+=step){
      for(let x=Math.round(sourceCanvas.width*.08);x<sourceCanvas.width;x+=step){
        const offset=(y*sourceCanvas.width+x)*4;
        const red=pixels[offset];
        const green=pixels[offset+1];
        const blue=pixels[offset+2];
        const luminance=.2126*red+.7152*green+.0722*blue;
        const spread=Math.max(red,green,blue)-Math.min(red,green,blue);

        if(luminance>145&&spread<58){
          minX=Math.min(minX,x);
          minY=Math.min(minY,y);
          maxX=Math.max(maxX,x);
          maxY=Math.max(maxY,y);
          paperPixels++;
        }
      }
    }

    let cropX=0;
    let cropY=0;
    let cropWidth=sourceCanvas.width;
    let cropHeight=sourceCanvas.height;

    const enoughPaper=paperPixels>
      (sourceCanvas.width/step)*(sourceCanvas.height/step)*.08;

    if(enoughPaper&&maxX>minX&&maxY>minY){
      const padX=Math.round(sourceCanvas.width*.025);
      const padY=Math.round(sourceCanvas.height*.02);

      cropX=Math.max(0,minX-padX);
      cropY=Math.max(0,minY-padY);
      cropWidth=Math.min(sourceCanvas.width-cropX,maxX-minX+padX*2);
      cropHeight=Math.min(sourceCanvas.height-cropY,maxY-minY+padY*2);
    }

    const maxSide=2500;
    const upscale=Math.min(
      2,
      maxSide/Math.max(cropWidth,cropHeight)
    );

    const width=Math.max(1,Math.round(cropWidth*upscale));
    const height=Math.max(1,Math.round(cropHeight*upscale));

    const cropCanvas=document.createElement('canvas');
    cropCanvas.width=width;
    cropCanvas.height=height;

    const cropCtx=cropCanvas.getContext('2d',{willReadFrequently:true});
    cropCtx.fillStyle='#fff';
    cropCtx.fillRect(0,0,width,height);
    cropCtx.drawImage(
      sourceCanvas,
      cropX,cropY,cropWidth,cropHeight,
      0,0,width,height
    );

    const softCanvas=document.createElement('canvas');
    softCanvas.width=width;
    softCanvas.height=height;
    const softCtx=softCanvas.getContext('2d');
    softCtx.fillStyle='#fff';
    softCtx.fillRect(0,0,width,height);
    softCtx.filter='grayscale(1) contrast(1.65) brightness(1.05)';
    softCtx.drawImage(cropCanvas,0,0);

    const binaryCanvas=document.createElement('canvas');
    binaryCanvas.width=width;
    binaryCanvas.height=height;
    const binaryCtx=binaryCanvas.getContext('2d',{willReadFrequently:true});
    binaryCtx.drawImage(cropCanvas,0,0);

    const imageData=binaryCtx.getImageData(0,0,width,height);
    const data=imageData.data;

    for(let i=0;i<data.length;i+=4){
      const gray=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];
      const value=gray<176?0:255;
      data[i]=value;
      data[i+1]=value;
      data[i+2]=value;
      data[i+3]=255;
    }

    binaryCtx.putImageData(imageData,0,0);

    const toBlob=canvas=>new Promise((resolve,reject)=>{
      canvas.toBlob(
        blob=>blob?resolve(blob):reject(new Error('De bonfoto kon niet worden voorbereid.')),
        'image/jpeg',
        .96
      );
    });

    return {
      binary:await toBlob(binaryCanvas),
      soft:await toBlob(softCanvas)
    };
  }catch(error){
    console.warn('Voorbewerking mislukt; originele foto wordt gebruikt:',error);
    return {binary:file,soft:file};
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
    if(/\b(?:21|9|0)[,.]0\b/.test(line)&&/\b(excl|incl|btw|vat)\b/i.test(line))continue;

    const matches=[...line.matchAll(moneyPattern)];
    if(!matches.length)continue;

    const first=matches[0];
    let description=cleanReceiptItemDescription(
      line.slice(0,first.index)
    );

    if(description.length<2||description.length>80)continue;
    if(/^(tel|www|http|markt|straat|weg|postcode|bedankt|ka)\b/i.test(description))continue;

    const amount=parseReceiptItemMoney(matches[matches.length-1][0]);
    if(amount===null)continue;

    const quantityMatch=line.match(/\b(\d{1,2})\s+(?=[A-Za-zÀ-ÿ])/);
    const quantity=quantityMatch?Number(quantityMatch[1]):1;

    results.push({
      description,
      quantity,
      amount
    });
  }

  const unique=[];
  const seen=new Set();

  for(const item of results){
    const normalized=item.description
      .toLowerCase()
      .replace(/[^a-z0-9]/g,'');

    const key=`${normalized}|${item.amount.toFixed(2)}`;
    if(!normalized||seen.has(key))continue;

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


function scoreReceiptOcrText(text){
  const normalized=String(text||'');
  const lines=receiptLines(normalized);
  let score=0;

  score+=Math.min(80,lines.length*3);
  if(/\b20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b|\b\d{1,2}[-/.]\d{1,2}[-/.](?:20)?\d{2}\b/.test(normalized))score+=45;
  if(/t[e3]\s*betalen|sub\s*t[o0]ta[a4]l|eind\s*t[o0]ta[a4]l|grand\s*total|amount\s*due/i.test(normalized))score+=90;
  if(/bestelling|order|tafel|table/i.test(normalized))score+=30;
  if(/giorgio|restaurant|café|cafe|bistro|marina|jachthaven/i.test(normalized))score+=40;

  const moneyMatches=normalized.match(/(?:€\s*)?\d{1,5}(?:[.\s]\d{3})*[,.]\d{2}/g)||[];
  score+=Math.min(70,moneyMatches.length*7);

  return score;
}

function mergeReceiptOcrTexts(primary,secondary){
  const output=[];
  const seen=new Set();

  for(const line of [...receiptLines(primary),...receiptLines(secondary)]){
    const key=line
      .toLowerCase()
      .replace(/[^a-z0-9€]/g,'')
      .slice(0,70);

    if(!key||seen.has(key))continue;
    seen.add(key);
    output.push(line);
  }

  return output.join('\n');
}

function canonicalReceiptMerchant(value,text=''){
  const combined=`${value||''} ${text||''}`.toLowerCase();

  if(/giorgio/.test(combined)){
    return 'Da Giorgio';
  }

  let merchant=normalizeReceiptTextLine(value)
    .replace(/^(?:[A-Za-z]{1,2}\s+){1,3}(?=[A-ZÀ-Þ]{3,})/,'')
    .trim();

  if(!merchant)return '';

  if(merchant===merchant.toUpperCase()){
    merchant=merchant
      .toLowerCase()
      .replace(/\b([a-zà-ÿ])/g,letter=>letter.toUpperCase());
  }

  return merchant;
}

function parseReceiptItemMoney(raw){
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
  }

  const number=Number(value);
  return Number.isFinite(number)&&number>=0&&number<100000
    ?number
    :null;
}

function cleanReceiptItemDescription(value){
  let description=String(value||'')
    .replace(/([a-zà-ÿ])([A-ZÀ-Þ])/g,'$1 $2')
    .replace(/\s+\d{3,4}$/,'')
    .replace(/^[^A-Za-zÀ-ÿ0-9]+/,'')
    .replace(/\s{2,}/g,' ')
    .trim();

  const quantityMarkers=[...description.matchAll(/\b\d{1,2}\s+(?=[A-Za-zÀ-ÿ])/g)];
  if(quantityMarkers.length){
    const marker=quantityMarkers[quantityMarkers.length-1];
    description=description.slice(marker.index+marker[0].length).trim();
  }

  return description;
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
  const pattern=/(?:€\s*)?\d{1,5}(?:[.\s]\d{3})*[,.]\d{2}/g;
  const candidates=[];
  const totalPattern=/t[e3]\s*betalen|tebetalen|sub\s*t[o0]ta[a4]l|eind\s*t[o0]ta[a4]l|t[o0]ta[a4]l|verschuldigd|amount\s*due|grand\s*total/i;
  const taxPattern=/\bbtw\b|\bvat\b|\bexcl\b|\bincl\b|belasting|wisselgeld|korting/i;

  lines.forEach((line,index)=>{
    const matches=line.match(pattern)||[];
    const totalLike=totalPattern.test(line);
    const taxLike=taxPattern.test(line);

    for(const raw of matches){
      const amount=parseReceiptMoney(raw);
      if(amount===null)continue;

      let score=0;
      if(totalLike)score+=250;
      if(/€/.test(raw)||/€/.test(line))score+=18;
      if(index>lines.length*.55)score+=28;
      if(taxLike)score-=120;

      candidates.push({amount,score,index,totalLike,taxLike});
    }
  });

  if(!candidates.length)return null;

  const frequencies={};
  candidates.forEach(candidate=>{
    const key=candidate.amount.toFixed(2);
    frequencies[key]=(frequencies[key]||0)+1;
  });

  candidates.forEach(candidate=>{
    candidate.score+=(frequencies[candidate.amount.toFixed(2)]||0)*16;
    candidate.score+=Math.min(40,candidate.amount/5);
  });

  const explicitTotals=candidates.filter(candidate=>candidate.totalLike&&!candidate.taxLike);
  if(explicitTotals.length){
    explicitTotals.sort((a,b)=>b.score-a.score||b.amount-a.amount);
    return explicitTotals[0].amount;
  }

  const usable=candidates.filter(candidate=>!candidate.taxLike);
  usable.sort((a,b)=>b.score-a.score||b.amount-a.amount);
  return usable[0]?.amount??null;
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
  if(/giorgio/i.test(text))return 'Da Giorgio';

  const candidates=[];

  receiptLines(text).slice(0,18).forEach((rawLine,index)=>{
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

    candidates.push({
      merchant:canonicalReceiptMerchant(line,text),
      score
    });
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
  setCostOcrStatus('Bon uitsnijden en verbeteren…');

  let worker=null;

  try{
    const Tesseract=await loadReceiptOcrLibrary();
    const images=await prepareReceiptImageForOcr(file);

    worker=await Tesseract.createWorker('nld+eng',1,{
      logger:message=>{
        if(message.status==='recognizing text'){
          setCostOcrStatus(`Bon lezen… ${Math.round(Number(message.progress||0)*100)}%`);
        }else if(message.status){
          setCostOcrStatus('Bon lezen…');
        }
      }
    });

    await worker.setParameters({
      tessedit_pageseg_mode:'6',
      preserve_interword_spaces:'1'
    });

    const binaryResult=await worker.recognize(images.binary);
    const binaryText=String(binaryResult?.data?.text||'');

    setCostOcrStatus('Bon nogmaals controleren…');

    const softResult=await worker.recognize(images.soft);
    const softText=String(softResult?.data?.text||'');

    const binaryScore=scoreReceiptOcrText(binaryText);
    const softScore=scoreReceiptOcrText(softText);
    const primary=binaryScore>=softScore?binaryText:softText;
    const secondary=binaryScore>=softScore?softText:binaryText;

    lastReceiptOcrText=mergeReceiptOcrTexts(primary,secondary);
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
        cacheControl:'31536000',
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
    (grouped[receipt.cost_id]??=[]).push({...receipt,url:null});
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
        <img src="${STORAGE_SAFE_PLACEHOLDER}" class="storage-safe-image"
          loading="lazy" decoding="async"
          data-storage-bucket="${esc(COST_RECEIPT_BUCKET)}"
          data-storage-path="${esc(receipt.storage_path)}"
          alt="Bonnetje"
          onclick='openStorageLightbox(${JSON.stringify(COST_RECEIPT_BUCKET)},${JSON.stringify(receipt.storage_path)},this)'>
        <button onclick="deleteCostReceipt('${receipt.id}','${esc(receipt.storage_path)}')">×</button>
        <small>🧾 Bekijk bon</small>
      </div>`;
    }

    return `<div class="cost-receipt-item cost-receipt-pdf">
      <button type="button" class="storage-document-button"
        onclick='openStorageDocument(${JSON.stringify(COST_RECEIPT_BUCKET)},${JSON.stringify(receipt.storage_path)})'>🧾 PDF-bon openen</button>
      <button onclick="deleteCostReceipt('${receipt.id}','${esc(receipt.storage_path)}')">×</button>
    </div>`;
  }).join('')}</div>`;
}

async function deleteCostReceipt(id,path){
  if(!confirm('Dit bonnetje verwijderen?'))return;
  storageSafeForgetUrl(COST_RECEIPT_BUCKET,path);

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
  costLastMetadataLoadAt=Date.now();

  $('dCosts').textContent='€'+costCache
    .reduce((sum,cost)=>sum+Number(cost.amount||0),0)
    .toFixed(0);

  updateDashboardFinanceSummary();
  renderCaptainCommandCenter();

  $('costList').innerHTML=costCache.length
    ?costCache.map(cost=>{
      const parsed=splitCostDescription(cost.description);

      return `<div class="item cost-item expandable-cost-card" data-cost-id="${cost.id}">
        <button type="button" class="cost-title-button" onclick="toggleInlineDetails(this)">
          <span class="cost-title-main">
            <strong>${formatEuro(cost.amount)}</strong>
            <span>${esc(cost.category)}</span>
          </span>
          <span class="details-chevron">›</span>
        </button>

        <div class="small cost-list-summary">${esc(cost.expense_date)} · ${esc(parsed.summary||'')}</div>

        <div class="inline-cost-details hidden">
          <div class="inline-cost-grid">
            <div><span>Datum</span><strong>${esc(cost.expense_date||'-')}</strong></div>
            <div><span>Categorie</span><strong>${esc(cost.category||'Overig')}</strong></div>
            <div><span>Bedrag</span><strong>${formatEuro(cost.amount||0)}</strong></div>
            <div><span>Omschrijving</span><strong>${esc(parsed.summary||'-')}</strong></div>
          </div>

          ${parsed.details
            ?`<div class="inline-cost-notes">
                <b>Details van de bon</b><br>
                ${esc(parsed.details).replace(/\n/g,'<br>')}
              </div>`
            :'<div class="inline-cost-notes muted-detail">Geen extra bon-details opgeslagen.</div>'}

          <div class="inline-receipt-heading">Bonnetjes</div>
          ${renderReadOnlyCostReceipts(cost.id)}
        </div>

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

function subscribeRealtime(){
  if(liveChannel)sb.removeChannel(liveChannel);

  liveChannel=sb.channel('serenity-'+currentBoat.id)
    .on(
      'postgres_changes',
      {event:'*',schema:'public',table:'pois',filter:`boat_id=eq.${currentBoat.id}`},
      ()=>scheduleRealtimeRefresh('pois',loadPois)
    )
    .on(
      'postgres_changes',
      {event:'*',schema:'public',table:'poi_photos',filter:`boat_id=eq.${currentBoat.id}`},
      ()=>scheduleRealtimeRefresh('poi-photos',loadPois)
    )
    .on(
      'postgres_changes',
      {event:'*',schema:'public',table:'costs',filter:`boat_id=eq.${currentBoat.id}`},
      ()=>scheduleRealtimeRefresh('costs',loadCosts)
    )
    .on(
      'postgres_changes',
      {event:'*',schema:'public',table:'cost_receipts',filter:`boat_id=eq.${currentBoat.id}`},
      ()=>scheduleRealtimeRefresh('cost-receipts',loadCosts)
    )
    .on(
      'postgres_changes',
      {event:'*',schema:'public',table:'trips',filter:`boat_id=eq.${currentBoat.id}`},
      ()=>scheduleRealtimeRefresh('trips',loadTrips)
    )
    .on(
      'postgres_changes',
      {event:'*',schema:'public',table:'trip_photos',filter:`boat_id=eq.${currentBoat.id}`},
      ()=>scheduleRealtimeRefresh('trip-photos',loadTrips)
    )
    .on(
      'postgres_changes',
      {event:'*',schema:'public',table:'boat_settings',filter:`boat_id=eq.${currentBoat.id}`},
      ()=>scheduleRealtimeRefresh('settings',loadSettings)
    );

  if(technicalCloudReady){
    liveChannel
      .on(
        'postgres_changes',
        {event:'*',schema:'public',table:'technical_state',filter:`boat_id=eq.${currentBoat.id}`},
        ()=>loadTechnicalDashboard(true)
      )
      .on(
        'postgres_changes',
        {event:'*',schema:'public',table:'technical_events',filter:`boat_id=eq.${currentBoat.id}`},
        ()=>loadTechnicalDashboard(true)
      );
  }

  liveChannel.subscribe(status=>{
    $('dSync').textContent=status==='SUBSCRIBED'?'Live':'…';
  });
}

function resetPoiFilters(render=true){
  if($('poiSearch'))$('poiSearch').value='';
  if($('poiFilterCategory'))$('poiFilterCategory').value='';
  if($('poiFilterRating'))$('poiFilterRating').value='0';
  if($('poiFilterExtra'))$('poiFilterExtra').value='';
  if(render)renderPoiList();
}
function renderPoiList(){
  if(!$('poiList'))return;

  const query=($('poiSearch')?.value||'').toLowerCase();
  const category=$('poiFilterCategory')?.value||'';
  const rating=Number($('poiFilterRating')?.value||0);
  const extra=$('poiFilterExtra')?.value||'';

  const filtered=poiCache.filter(poi=>{
    const haystack=[
      poi.name,
      poi.place,
      poi.address,
      poi.review,
      poi.category
    ].join(' ').toLowerCase();

    return (!query||haystack.includes(query))&&
      (!category||poi.category===category)&&
      (!rating||Number(poi.rating||0)>=rating)&&
      (extra!=='favorite'||poi.is_favorite)&&
      (extra!=='photos'||(poiPhotoCache[poi.id]||[]).length)&&
      (extra!=='notes'||String(poi.review||'').trim());
  });

  $('poiList').innerHTML=filtered.length
    ?filtered.map(poi=>{
      const photos=(poiPhotoCache[poi.id]||[]).map(photo=>`
        <div class="photo-wrap">
          <img src="${STORAGE_SAFE_PLACEHOLDER}"
            class="storage-safe-image"
            loading="lazy" decoding="async"
            data-storage-bucket="${esc(PHOTO_BUCKET)}"
            data-storage-path="${esc(photo.storage_path)}"
            alt="Foto van ${esc(poi.name||'POI')}"
            onclick='openStorageLightbox(${JSON.stringify(PHOTO_BUCKET)},${JSON.stringify(photo.storage_path)},this)'>
          ${photo.auto_imported
            ?`<span class="ms694-photo-source"
                title="${esc(photo.source_attribution||'Wikimedia Commons')}">
                Wikimedia
              </span>`
            :''}
          <button class="photo-delete"
            aria-label="Foto verwijderen"
            onclick="deletePhoto('${photo.id}','${esc(photo.storage_path)}')">×</button>
        </div>
      `).join('');

      const stars=ms692RatingDisplay(poi.rating);

      return `
        <div class="item poi-list-item">
          <button type="button"
            class="poi-title-button"
            onclick='showPoiDetails(${JSON.stringify(poi.id)})'
            aria-label="Alle informatie van ${esc(poi.name||'POI')} bekijken">
            <span class="poi-title-copy">
              <strong>${esc(poi.name||'POI')}${poi.is_favorite?' ⭐':''}</strong>
              <small>
                ${esc(poi.category||'POI')}
                ${poi.place?` · ${esc(poi.place)}`:''}
                ${stars?` · ${stars}`:''}
              </small>
            </span>
            <span class="poi-title-arrow">›</span>
          </button>

          ${poi.address
            ?`<div class="small poi-list-address">📍 ${esc(poi.address)}</div>`
            :''}

          ${poi.review
            ?`<p class="poi-list-review">${esc(poi.review)}</p>`
            :''}

          ${ms694PoiExtraHtml(poi)}

          ${photos
            ?`<div class="photo-grid">${photos}</div>`
            :''}

          <button class="delete-mini"
            aria-label="POI verwijderen"
            onclick="deletePoi('${poi.id}')">🗑️</button>

          <div class="item-actions">
            <button class="edit-button" onclick='editPoi(
              ${JSON.stringify(poi.id)},
              ${JSON.stringify(poi.name)},
              ${JSON.stringify(poi.category)},
              ${JSON.stringify(poi.place)},
              ${JSON.stringify(poi.address)},
              ${JSON.stringify(poi.rating)},
              ${JSON.stringify(poi.review)},
              ${JSON.stringify(!!poi.is_favorite)},
              ${JSON.stringify(poi.latitude)},
              ${JSON.stringify(poi.longitude)}
            )'>Bewerken</button>
          </div>
        </div>
      `;
    }).join('')
    :'<span class="small">Geen POI’s gevonden.</span>';
}
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
  plannerSetDefaults();

  if(technicalStateCache&&!technicalStateCache.fuelCapacity&&settingsCache?.tank_capacity){
    technicalStateCache.fuelCapacity=Number(settingsCache.tank_capacity);
    saveTechnicalLocalState(technicalStateCache);
    renderTechnicalDashboard();
  }
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

  let signedUrl='';
  try{
    signedUrl=await getStorageSignedUrl(BOAT_PHOTO_BUCKET,photoPath);
  }catch(error){
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
  if(img.dataset.storagePath===photoPath&&img.src===signedUrl){
    storageSafeStats.preventedReloads++;
    storageSafeRenderStatus();
    return;
  }
  img.dataset.storagePath=photoPath;
  img.src=signedUrl;
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
    cacheControl:'31536000'
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
  if(oldPath&&oldPath!==path){
    storageSafeForgetUrl(BOAT_PHOTO_BUCKET,oldPath);
    await sb.storage.from(BOAT_PHOTO_BUCKET).remove([oldPath]);
  }
  settingsCache=row;
  $('dashboardPhotoMsg').textContent='Dashboardfoto opgeslagen ✅';
  $('settingBoatPhoto').value='';
  await loadDashboardPhoto();
}
async function removeDashboardPhoto(){
  if(!settingsCache?.dashboard_photo_path)return;
  if(!confirm('Dashboardfoto verwijderen?'))return;
  storageSafeForgetUrl(BOAT_PHOTO_BUCKET,settingsCache.dashboard_photo_path);
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



const PLANNER_STORAGE_VERSION='v1';

function plannerStorageKey(){
  return `mijnserenity-planner-${PLANNER_STORAGE_VERSION}-${currentBoat?.id||'geen-boot'}`;
}

function readPlannerDrafts(){
  try{
    const value=JSON.parse(
      localStorage.getItem(plannerStorageKey())||'[]'
    );
    return Array.isArray(value)?value:[];
  }catch(error){
    console.warn('Conceptplanningen lezen mislukt:',error);
    return [];
  }
}

function writePlannerDrafts(plans){
  try{
    localStorage.setItem(
      plannerStorageKey(),
      JSON.stringify((plans||[]).slice(0,40))
    );
    return true;
  }catch(error){
    console.error('Conceptplanning bewaren mislukt:',error);
    return false;
  }
}

function plannerPoiHasLocation(poi){
  const position=getPoiMapPosition(poi);
  return Boolean(position?.valid);
}

function plannerPoiReference(poi){
  return `poi:${poi.id}`;
}

function plannerPointFromPoi(poi){
  if(!poi)return null;
  const position=getPoiMapPosition(poi);
  if(!position.valid)return null;

  return {
    ref:plannerPoiReference(poi),
    poiId:poi.id,
    label:poi.name||poi.place||'POI',
    place:poi.place||'',
    address:poi.address||'',
    category:poi.category||'POI',
    lat:Number(position.lat),
    lon:Number(position.lon)
  };
}

function plannerSortedPois(){
  return poiCache
    .filter(plannerPoiHasLocation)
    .sort((a,b)=>{
      const favoriteDifference=
        Number(isFavoritePoi(b))-Number(isFavoritePoi(a));
      if(favoriteDifference)return favoriteDifference;

      const harbourDifference=
        Number(String(b.category)==='Haven')-
        Number(String(a.category)==='Haven');
      if(harbourDifference)return harbourDifference;

      return String(a.name||'').localeCompare(
        String(b.name||''),
        'nl'
      );
    });
}

function plannerOptionLabel(poi){
  const prefix=isFavoritePoi(poi)
    ?'⭐ '
    :String(poi.category)==='Haven'
      ?'⚓ '
      :'📍 ';

  return `${prefix}${poi.name||'POI'}${poi.place?' · '+poi.place:''}`;
}

function plannerSelectOptions({includeCurrent=false}={}){
  const currentOption=includeCurrent
    ?'<option value="current">📍 Huidige positie</option>'
    :'';

  const groups=new Map();

  plannerSortedPois().forEach(poi=>{
    const group=String(poi.category||'Overig');
    if(!groups.has(group))groups.set(group,[]);
    groups.get(group).push(poi);
  });

  const preferred=[
    'Haven',
    'Ankerplek',
    'Tankplaats',
    'Supermarkt',
    'Restaurant',
    'Café',
    'Overig'
  ];

  const ordered=[
    ...preferred.filter(category=>groups.has(category)),
    ...[...groups.keys()]
      .filter(category=>!preferred.includes(category))
      .sort((a,b)=>a.localeCompare(b,'nl'))
  ];

  return currentOption+ordered.map(category=>`
    <optgroup label="${esc(category)}">
      ${groups.get(category).map(poi=>`
        <option value="${esc(plannerPoiReference(poi))}">
          ${esc(plannerOptionLabel(poi))}
        </option>
      `).join('')}
    </optgroup>
  `).join('');
}

function populatePlannerSelectors(){
  const from=$('plannerFrom');
  const to=$('plannerTo');
  const stop=$('plannerStopSelect');
  if(!from||!to||!stop)return;

  const previousFrom=from.value||'current';
  const previousTo=to.value||'';
  const previousStop=stop.value||'';

  const options=plannerSelectOptions();
  from.innerHTML=`
    <option value="">Kies vertrekpunt</option>
    ${plannerSelectOptions({includeCurrent:true})}
  `;
  to.innerHTML=`
    <option value="">Kies bestemming</option>
    ${options}
  `;
  stop.innerHTML=`
    <option value="">Kies een tussenstop</option>
    ${options}
  `;

  const setIfAvailable=(element,value,fallback='')=>{
    const exists=[...element.options]
      .some(option=>option.value===value);
    element.value=exists?value:fallback;
  };

  setIfAvailable(from,previousFrom,'current');
  setIfAvailable(to,previousTo,'');
  setIfAvailable(stop,previousStop,'');
}

function plannerDefaultDate(){
  return localDateISO(new Date());
}

function plannerSetDefaults(){
  if($('plannerDate')&&!$('plannerDate').value){
    $('plannerDate').value=plannerDefaultDate();
  }

  if($('plannerFuelPerHour')&&!$('plannerFuelPerHour').value){
    const consumption=Number(settingsCache?.fuel_per_hour||0);
    if(consumption>0)$('plannerFuelPerHour').value=consumption;
  }

  if($('plannerFuelPrice')&&!$('plannerFuelPrice').value){
    const price=Number(settingsCache?.fuel_price||0);
    if(price>0)$('plannerFuelPrice').value=price;
  }
}

function initPlanner(){
  if(!currentBoat){
    showAppToast('Koppel eerst Serenity.');
    captainNavigate(isAppAdmin()?'boat':'settings');
    return;
  }

  populatePlannerSelectors();
  plannerSetDefaults();
  renderPlannerStops();
  renderPlannerDrafts();
  renderHarbourLibrary();
  ensurePlannerMap();

  if(plannerCurrentPlan){
    renderPlannerSummary(plannerCurrentPlan);
  }else{
    setTimeout(()=>plannerMap?.invalidateSize({pan:false}),120);
  }
}

function ensurePlannerMap(){
  const container=$('plannerMap');
  if(!container||plannerMap)return;

  plannerMap=L.map(container,{
    zoomControl:true,
    attributionControl:true
  }).setView([52.25,5.45],7);

  L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom:19,
      attribution:'© OpenStreetMap'
    }
  ).addTo(plannerMap);

  plannerMapLayer=L.layerGroup().addTo(plannerMap);
}

function renderPlannerMap(plan){
  ensurePlannerMap();
  if(!plannerMap||!plannerMapLayer)return;

  plannerMapLayer.clearLayers();
  const points=Array.isArray(plan?.points)?plan.points:[];

  if(!points.length){
    plannerMap.setView([52.25,5.45],7);
    return;
  }

  const coordinates=points.map(point=>[point.lat,point.lon]);

  L.polyline(coordinates,{
    weight:4,
    opacity:.88,
    dashArray:'9 7'
  }).addTo(plannerMapLayer);

  points.forEach((point,index)=>{
    const role=index===0
      ?'Vertrek'
      :index===points.length-1
        ?'Bestemming'
        :`Stop ${index}`;

    L.marker([point.lat,point.lon])
      .addTo(plannerMapLayer)
      .bindPopup(`
        <b>${esc(role)}</b><br>
        ${esc(point.label)}
        ${point.place?`<br>${esc(point.place)}`:''}
      `);
  });

  if(coordinates.length===1){
    plannerMap.setView(coordinates[0],14);
  }else{
    plannerMap.fitBounds(
      L.latLngBounds(coordinates),
      {padding:[30,30],maxZoom:13}
    );
  }

  setTimeout(()=>plannerMap.invalidateSize({pan:false}),120);
}

function plannerFormChanged(){
  plannerCurrentPlan=null;
  $('plannerSummary')?.classList.add('hidden');
  $('plannerEmptyState')?.classList.remove('hidden');
  if($('plannerSummaryTitle')){
    $('plannerSummaryTitle').textContent='Route opnieuw berekenen';
  }
  if($('plannerSummaryBadge')){
    $('plannerSummaryBadge').textContent='Gewijzigd';
  }
}

function addPlannerStop(){
  const select=$('plannerStopSelect');
  const ref=String(select?.value||'');
  if(!ref)return;

  if(plannerStops.includes(ref)){
    showAppToast('Deze tussenstop staat al in de route.');
    return;
  }

  const fromRef=$('plannerFrom')?.value||'';
  const toRef=$('plannerTo')?.value||'';

  if(ref===fromRef||ref===toRef){
    showAppToast('Vertrekpunt of bestemming hoeft niet als tussenstop.');
    return;
  }

  plannerStops.push(ref);
  select.value='';
  renderPlannerStops();
  plannerFormChanged();
}

function removePlannerStop(index){
  plannerStops.splice(index,1);
  renderPlannerStops();
  plannerFormChanged();
}

function movePlannerStop(index,direction){
  const target=index+direction;

  if(
    target<0||
    target>=plannerStops.length
  )return;

  const [item]=plannerStops.splice(index,1);
  plannerStops.splice(target,0,item);
  renderPlannerStops();
  plannerFormChanged();
}

function plannerPoiByRef(ref){
  const id=String(ref||'').replace(/^poi:/,'');
  return poiCache.find(poi=>String(poi.id)===id)||null;
}

function plannerRefLabel(ref){
  if(ref==='current'){
    return plannerCurrentPosition?.label||'Huidige positie';
  }

  const poi=plannerPoiByRef(ref);
  return poi?.name||'Onbekende POI';
}

function renderPlannerStops(){
  const container=$('plannerStops');
  if(!container)return;

  if(!plannerStops.length){
    container.innerHTML='<span class="small">Nog geen tussenstops.</span>';
    return;
  }

  container.innerHTML=plannerStops.map((ref,index)=>`
    <div class="planner-stop-chip">
      <span>
        <b>${index+1}</b>
        ${esc(plannerRefLabel(ref))}
      </span>
      <span class="planner-stop-controls">
        <button type="button" onclick="movePlannerStop(${index},-1)"
          aria-label="Tussenstop omhoog">↑</button>
        <button type="button" onclick="movePlannerStop(${index},1)"
          aria-label="Tussenstop omlaag">↓</button>
        <button type="button" onclick="removePlannerStop(${index})"
          aria-label="Tussenstop verwijderen">×</button>
      </span>
    </div>
  `).join('');
}

function plannerGeolocation(){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){
      reject(new Error('Locatie wordt op dit apparaat niet ondersteund.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position=>resolve({
        ref:'current',
        label:'Huidige positie',
        place:'',
        address:'',
        category:'Positie',
        lat:Number(position.coords.latitude),
        lon:Number(position.coords.longitude)
      }),
      error=>reject(new Error(
        error?.message||
        'Huidige positie kon niet worden opgehaald.'
      )),
      {
        enableHighAccuracy:true,
        timeout:12000,
        maximumAge:120000
      }
    );
  });
}

async function useCurrentPositionForPlanner(){
  setPlannerStatus('Huidige positie ophalen…');

  try{
    plannerCurrentPosition=await plannerGeolocation();
    $('plannerFrom').value='current';
    setPlannerStatus(
      `Huidige positie ingesteld: ${plannerCurrentPosition.lat.toFixed(5)}, ${plannerCurrentPosition.lon.toFixed(5)}`,
      'success'
    );
    plannerFormChanged();
  }catch(error){
    setPlannerStatus(error.message,'error');
  }
}

async function resolvePlannerPoint(ref){
  if(ref==='current'){
    if(!plannerCurrentPosition){
      plannerCurrentPosition=await plannerGeolocation();
    }
    return {...plannerCurrentPosition};
  }

  const poi=plannerPoiByRef(ref);
  const point=plannerPointFromPoi(poi);

  if(!point){
    throw new Error(
      `${poi?.name||'Een gekozen POI'} heeft geen geldige GPS-locatie.`
    );
  }

  return point;
}

function setPlannerStatus(message,state=''){
  const status=$('plannerStatus');
  if(!status)return;

  status.textContent=message||'';
  status.classList.toggle('hidden',!message);
  status.classList.remove('success','warning','error');

  if(state)status.classList.add(state);
}

function plannerDurationText(hours){
  const totalMinutes=Math.max(0,Math.round(Number(hours||0)*60));
  const wholeHours=Math.floor(totalMinutes/60);
  const minutes=totalMinutes%60;

  if(!wholeHours)return `${minutes} min`;
  return minutes
    ?`${wholeHours} uur ${minutes} min`
    :`${wholeHours} uur`;
}

function plannerNumber(value,digits=1){
  return Number(value||0).toLocaleString('nl-NL',{
    minimumFractionDigits:0,
    maximumFractionDigits:digits
  });
}

function plannerCreateSegments(points,factor){
  const segments=[];

  for(let index=1;index<points.length;index++){
    const from=points[index-1];
    const to=points[index];
    const directKm=haversineKm(from,to);
    const estimatedKm=directKm*factor;

    segments.push({
      index:index-1,
      from,
      to,
      directKm,
      estimatedKm
    });
  }

  return segments;
}

function plannerBuildTitle(points){
  const custom=String($('plannerTitle')?.value||'').trim();
  if(custom)return custom;

  const from=points[0]?.label||'Vertrek';
  const to=points.at(-1)?.label||'Bestemming';
  return `${from} naar ${to}`;
}

async function calculatePlannerRoute({silent=false}={}){
  const fromRef=String($('plannerFrom')?.value||'');
  const toRef=String($('plannerTo')?.value||'');

  if(!fromRef||!toRef){
    setPlannerStatus(
      'Kies eerst een vertrekpunt en bestemming.',
      'warning'
    );
    return null;
  }

  if(fromRef===toRef&&!plannerStops.length){
    setPlannerStatus(
      'Vertrekpunt en bestemming mogen niet hetzelfde zijn.',
      'warning'
    );
    return null;
  }

  const speed=Number($('plannerSpeed')?.value||0);
  const factor=Number($('plannerRouteFactor')?.value||1.3);
  const fuelPerHour=Number($('plannerFuelPerHour')?.value||0);
  const fuelPrice=Number($('plannerFuelPrice')?.value||0);

  if(!Number.isFinite(speed)||speed<=0){
    setPlannerStatus('Vul een geldige gemiddelde snelheid in.','warning');
    return null;
  }

  if(!silent)setPlannerStatus('Route en verbruik berekenen…');

  try{
    const refs=[
      fromRef,
      ...plannerStops.filter(ref=>ref!==fromRef&&ref!==toRef),
      toRef
    ];

    const points=[];
    for(const ref of refs){
      points.push(await resolvePlannerPoint(ref));
    }

    const segments=plannerCreateSegments(points,factor);
    const distanceKm=segments.reduce(
      (sum,segment)=>sum+segment.estimatedKm,
      0
    );
    const durationHours=distanceKm/speed;
    const fuelLiters=durationHours*fuelPerHour;
    const fuelCost=fuelLiters*fuelPrice;

    plannerCurrentPlan={
      id:plannerCurrentPlan?.id||crypto.randomUUID(),
      createdAt:plannerCurrentPlan?.createdAt||new Date().toISOString(),
      updatedAt:new Date().toISOString(),
      date:$('plannerDate')?.value||plannerDefaultDate(),
      title:plannerBuildTitle(points),
      fromRef,
      toRef,
      stopRefs:[...plannerStops],
      speed,
      factor,
      fuelPerHour,
      fuelPrice,
      notes:String($('plannerNotes')?.value||'').trim(),
      points,
      segments,
      distanceKm,
      durationHours,
      fuelLiters,
      fuelCost
    };

    renderPlannerSummary(plannerCurrentPlan);
    setPlannerStatus(
      `Route berekend: ${plannerNumber(distanceKm)} km en ${plannerDurationText(durationHours)}.`,
      'success'
    );

    return plannerCurrentPlan;
  }catch(error){
    console.error('Reisplanning berekenen mislukt:',error);
    setPlannerStatus(error.message||'Route berekenen is mislukt.','error');
    return null;
  }
}

function renderPlannerSummary(plan){
  if(!plan)return;

  $('plannerEmptyState')?.classList.add('hidden');
  $('plannerSummary')?.classList.remove('hidden');

  $('plannerSummaryTitle').textContent=plan.title||'Geplande vaartocht';
  $('plannerSummaryBadge').textContent='Berekend';
  $('plannerDistance').textContent=`${plannerNumber(plan.distanceKm)} km`;
  $('plannerDuration').textContent=plannerDurationText(plan.durationHours);
  $('plannerFuel').textContent=`${plannerNumber(plan.fuelLiters)} liter`;
  $('plannerCost').textContent=formatEuro(plan.fuelCost);

  const segments=Array.isArray(plan.segments)
    ?plan.segments
    :plannerCreateSegments(plan.points||[],Number(plan.factor||1.3));

  $('plannerSegments').innerHTML=segments.length
    ?segments.map((segment,index)=>`
      <div class="planner-segment">
        <div class="planner-segment-number">${index+1}</div>
        <div class="planner-segment-copy">
          <strong>${esc(segment.from.label)} → ${esc(segment.to.label)}</strong>
          <small>
            ${plannerNumber(segment.estimatedKm)} km geschat
            · ${plannerNumber(segment.directKm)} km rechte lijn
          </small>
        </div>
        <button type="button" class="secondary"
          onclick="openPlannerSegmentInWaterkaarten(${index})">
          🧭
        </button>
      </div>
    `).join('')
    :'<span class="small">Geen etappes beschikbaar.</span>';

  renderPlannerMap(plan);
}

function plannerDestinationText(point){
  return [
    point?.label||'Bestemming',
    point?.address||point?.place||'',
    Number.isFinite(point?.lat)&&Number.isFinite(point?.lon)
      ?`${point.lat.toFixed(6)}, ${point.lon.toFixed(6)}`
      :''
  ].filter(Boolean).join(' · ');
}

async function copyPlannerText(text){
  try{
    await navigator.clipboard.writeText(text);
    return true;
  }catch(error){
    console.warn('Planning kopiëren mislukt:',error);
    return false;
  }
}

async function openPlannerSegmentInWaterkaarten(index){
  const segment=plannerCurrentPlan?.segments?.[index];
  if(!segment)return;

  const copied=await copyPlannerText(
    plannerDestinationText(segment.to)
  );

  showAppToast(
    copied
      ?`${segment.to.label} gekopieerd. Waterkaarten wordt geopend.`
      :'Waterkaarten wordt geopend.'
  );

  setTimeout(()=>openWaterkaarten(),220);
}

async function openFullPlannerRouteInWaterkaarten(){
  if(!plannerCurrentPlan){
    const plan=await calculatePlannerRoute({silent:true});
    if(!plan)return;
  }

  const routeText=[
    `Route: ${plannerCurrentPlan.title}`,
    ...plannerCurrentPlan.points.map(
      (point,index)=>`${index+1}. ${plannerDestinationText(point)}`
    )
  ].join('\n');

  const copied=await copyPlannerText(routeText);

  showAppToast(
    copied
      ?'Volledige route gekopieerd. Waterkaarten wordt geopend.'
      :'Waterkaarten wordt geopend.'
  );

  setTimeout(()=>openWaterkaarten(),220);
}

function plannerDraftDisplayDate(value){
  if(!value)return 'Datum onbekend';

  const date=new Date(`${value}T12:00:00`);
  if(Number.isNaN(date.getTime()))return value;

  return date.toLocaleDateString('nl-NL',{
    weekday:'short',
    day:'numeric',
    month:'short',
    year:'numeric'
  });
}

async function savePlannerDraft(){
  const plan=plannerCurrentPlan||
    await calculatePlannerRoute({silent:true});
  if(!plan)return;

  plan.updatedAt=new Date().toISOString();

  const drafts=readPlannerDrafts();
  const updated=[
    plan,
    ...drafts.filter(item=>String(item.id)!==String(plan.id))
  ].slice(0,40);

  if(!writePlannerDrafts(updated)){
    setPlannerStatus('Conceptplanning kon niet lokaal worden bewaard.','error');
    return;
  }

  renderPlannerDrafts();
  setPlannerStatus('Conceptplanning op dit apparaat bewaard ✅','success');
  showAppToast('Reisplanning bewaard ✅');
}

function renderPlannerDrafts(){
  const container=$('plannerSavedList');
  const count=$('plannerSavedCount');
  if(!container||!count)return;

  const drafts=readPlannerDrafts();
  count.textContent=String(drafts.length);

  container.innerHTML=drafts.length
    ?drafts.map(plan=>`
      <article class="planner-saved-item">
        <button type="button" class="planner-saved-main"
          onclick="loadPlannerDraft('${plan.id}')">
          <span class="planner-saved-icon">🧭</span>
          <span>
            <strong>${esc(plan.title||'Geplande vaartocht')}</strong>
            <small>
              ${esc(plannerDraftDisplayDate(plan.date))}
              · ${plannerNumber(plan.distanceKm)} km
              · ${esc(plannerDurationText(plan.durationHours))}
            </small>
          </span>
          <b>›</b>
        </button>
        <div class="planner-saved-actions">
          <button type="button" class="secondary"
            onclick="plannerDraftToLogbook('${plan.id}')">
            Naar logboek
          </button>
          <button type="button" class="record-delete-mini"
            onclick="deletePlannerDraft('${plan.id}')"
            aria-label="Conceptplanning verwijderen">🗑️</button>
        </div>
      </article>
    `).join('')
    :'<span class="small">Nog geen conceptplanning bewaard.</span>';
}

function loadPlannerDraft(id){
  const plan=readPlannerDrafts()
    .find(item=>String(item.id)===String(id));
  if(!plan)return;

  plannerCurrentPlan=plan;
  plannerStops=Array.isArray(plan.stopRefs)?[...plan.stopRefs]:[];

  populatePlannerSelectors();

  const setSelect=(id,value)=>{
    const element=$(id);
    if(!element)return;
    const exists=[...element.options]
      .some(option=>option.value===value);
    if(exists)element.value=value;
  };

  setSelect('plannerFrom',plan.fromRef);
  setSelect('plannerTo',plan.toRef);

  $('plannerDate').value=plan.date||plannerDefaultDate();
  $('plannerSpeed').value=plan.speed??9;
  $('plannerRouteFactor').value=String(plan.factor??1.3);
  $('plannerFuelPerHour').value=plan.fuelPerHour??'';
  $('plannerFuelPrice').value=plan.fuelPrice??'';
  $('plannerTitle').value=plan.title||'';
  $('plannerNotes').value=plan.notes||'';

  renderPlannerStops();

  if(
    !Array.isArray(plan.segments)||
    !plan.segments.length
  ){
    plan.segments=plannerCreateSegments(
      plan.points||[],
      Number(plan.factor||1.3)
    );
  }

  renderPlannerSummary(plan);
  setPlannerStatus('Bewaarde planning geopend.','success');

  $('planner')?.scrollIntoView({
    behavior:'smooth',
    block:'start'
  });
}

function deletePlannerDraft(id){
  if(!confirm('Deze conceptplanning verwijderen?'))return;

  const drafts=readPlannerDrafts()
    .filter(item=>String(item.id)!==String(id));

  writePlannerDrafts(drafts);

  if(String(plannerCurrentPlan?.id)===String(id)){
    plannerCurrentPlan=null;
  }

  renderPlannerDrafts();
  showAppToast('Conceptplanning verwijderd.');
}

async function plannerDraftToLogbook(id){
  const plan=readPlannerDrafts()
    .find(item=>String(item.id)===String(id));
  if(!plan)return;

  plannerCurrentPlan=plan;
  await plannerToLogbook();
}

function plannerNotesForLogbook(plan){
  const stops=(plan.points||[])
    .slice(1,-1)
    .map(point=>point.label)
    .filter(Boolean);

  return [
    'Gepland met MijnSerenity Reisplanner.',
    `Geschatte afstand: ${plannerNumber(plan.distanceKm)} km.`,
    `Waterwegfactor: ${Number(plan.factor||1.3).toLocaleString('nl-NL',{maximumFractionDigits:2})}.`,
    stops.length?`Tussenstops: ${stops.join(' → ')}.`:'',
    'Controleer de definitieve vaarroute, bruggen en sluizen in Waterkaarten.',
    plan.notes||''
  ].filter(Boolean).join('\n');
}

async function plannerToLogbook(){
  const plan=plannerCurrentPlan||
    await calculatePlannerRoute({silent:true});
  if(!plan)return;

  captainNavigate('logbook');

  setTimeout(()=>{
    clearTripForm();

    $('tripDate').value=plan.date||plannerDefaultDate();
    $('tripTitle').value=plan.title||'Geplande vaartocht';
    $('tripFrom').value=plan.points?.[0]?.label||'';
    $('tripTo').value=plan.points?.at(-1)?.label||'';
    $('tripDistance').value=Number(plan.distanceKm||0).toFixed(1);
    $('tripHours').value=Number(plan.durationHours||0).toFixed(1);
    $('tripFuelLiters').value=Number(plan.fuelLiters||0)
      ?Number(plan.fuelLiters).toFixed(1)
      :'';
    $('tripFuelCost').value=Number(plan.fuelCost||0)
      ?Number(plan.fuelCost).toFixed(2)
      :'';
    $('tripCrew').value='Michel, Desi';
    $('tripNotes').value=plannerNotesForLogbook(plan);

    $('tripFormTitle').textContent='Geplande vaartocht opslaan';
    openTripForm();
    previewFuelCalculation();

    window.scrollTo({top:0,behavior:'smooth'});
    showAppToast('Planning staat klaar in het logboek.');
  },140);
}

function plannerShareText(plan){
  const segments=(plan.segments||[]).map(
    (segment,index)=>
      `${index+1}. ${segment.from.label} → ${segment.to.label}: ${plannerNumber(segment.estimatedKm)} km`
  );

  return [
    `MijnSerenity reisplanning: ${plan.title}`,
    `Datum: ${plannerDraftDisplayDate(plan.date)}`,
    `Afstand: ${plannerNumber(plan.distanceKm)} km`,
    `Vaartijd: ${plannerDurationText(plan.durationHours)}`,
    `Brandstof: ${plannerNumber(plan.fuelLiters)} liter`,
    `Kosten: ${formatEuro(plan.fuelCost)}`,
    '',
    ...segments,
    '',
    'Let op: dit is een schatting. Controleer de route in Waterkaarten.'
  ].join('\n');
}

async function sharePlannerRoute(){
  const plan=plannerCurrentPlan||
    await calculatePlannerRoute({silent:true});
  if(!plan)return;

  const text=plannerShareText(plan);

  if(navigator.share){
    try{
      await navigator.share({
        title:plan.title,
        text
      });
      return;
    }catch(error){
      if(error?.name==='AbortError')return;
    }
  }

  const copied=await copyPlannerText(text);
  showAppToast(
    copied
      ?'Reisplanning gekopieerd.'
      :'Reisplanning kon niet worden gedeeld.'
  );
}

function resetPlannerForm(){
  plannerStops=[];
  plannerCurrentPlan=null;
  plannerCurrentPosition=null;

  populatePlannerSelectors();
  plannerSetDefaults();

  if($('plannerFrom'))$('plannerFrom').value='current';
  if($('plannerTo'))$('plannerTo').value='';
  if($('plannerDate'))$('plannerDate').value=plannerDefaultDate();
  if($('plannerSpeed'))$('plannerSpeed').value='9';
  if($('plannerRouteFactor'))$('plannerRouteFactor').value='1.30';
  if($('plannerTitle'))$('plannerTitle').value='';
  if($('plannerNotes'))$('plannerNotes').value='';

  renderPlannerStops();

  $('plannerSummary')?.classList.add('hidden');
  $('plannerEmptyState')?.classList.remove('hidden');
  $('plannerSummaryTitle').textContent='Nog geen route berekend';
  $('plannerSummaryBadge').textContent='Concept';
  setPlannerStatus('');

  if(plannerMapLayer)plannerMapLayer.clearLayers();
  if(plannerMap)plannerMap.setView([52.25,5.45],7);
}

function harbourLibraryPois(){
  return poiCache
    .filter(poi=>String(poi.category||'')==='Haven')
    .sort((a,b)=>{
      const favoriteDifference=
        Number(isFavoritePoi(b))-Number(isFavoritePoi(a));
      if(favoriteDifference)return favoriteDifference;

      return String(a.name||'').localeCompare(
        String(b.name||''),
        'nl'
      );
    });
}

function harbourCompleteness(poi){
  const photos=poiPhotoCache?.[poi.id]||[];
  const checks=[
    Boolean(String(poi.name||'').trim()),
    Boolean(String(poi.place||'').trim()),
    Boolean(String(poi.address||'').trim()),
    plannerPoiHasLocation(poi),
    Boolean(String(poi.review||'').trim()),
    Number(poi.rating||0)>0,
    photos.length>0
  ];

  const completeCount=checks.filter(Boolean).length;
  const percentage=Math.round(
    completeCount/checks.length*100
  );

  const missing=[];
  if(!checks[1])missing.push('plaats');
  if(!checks[2])missing.push('adres');
  if(!checks[3])missing.push('GPS');
  if(!checks[4])missing.push('informatie');
  if(!checks[5])missing.push('beoordeling');
  if(!checks[6])missing.push('foto');

  return {
    percentage,
    complete:percentage>=85,
    missing
  };
}

function renderHarbourLibrary(){
  const container=$('harbourLibraryList');
  if(!container)return;

  const all=harbourLibraryPois();
  const query=String($('harbourLibrarySearch')?.value||'')
    .toLowerCase()
    .trim();
  const filter=$('harbourLibraryFilter')?.value||'';

  const enriched=all.map(poi=>({
    poi,
    completeness:harbourCompleteness(poi),
    photoCount:(poiPhotoCache?.[poi.id]||[]).length
  }));

  const filtered=enriched.filter(item=>{
    const {poi,completeness,photoCount}=item;
    const haystack=[
      poi.name,
      poi.place,
      poi.address,
      poi.review
    ].join(' ').toLowerCase();

    if(query&&!haystack.includes(query))return false;
    if(filter==='favorite'&&!isFavoritePoi(poi))return false;
    if(filter==='complete'&&!completeness.complete)return false;
    if(filter==='incomplete'&&completeness.complete)return false;
    if(filter==='photos'&&!photoCount)return false;
    return true;
  });

  const completeCount=enriched.filter(
    item=>item.completeness.complete
  ).length;
  const favoriteCount=all.filter(isFavoritePoi).length;

  $('harbourLibraryTotal').textContent=String(all.length);
  $('harbourLibraryFavorites').textContent=String(favoriteCount);
  $('harbourLibraryComplete').textContent=String(completeCount);
  $('harbourLibraryIncomplete').textContent=String(all.length-completeCount);

  container.innerHTML=filtered.length
    ?filtered.map(item=>{
      const {poi,completeness,photoCount}=item;
      const updated=poi.updated_at
        ?captainFormatDate(poi.updated_at)
        :'Onbekend';

      return `
        <article class="harbour-library-item">
          <button type="button" class="harbour-library-main"
            onclick="showPoiDetails('${poi.id}')">
            <span class="harbour-library-icon">
              ${isFavoritePoi(poi)?'⭐':'⚓'}
            </span>
            <span class="harbour-library-copy">
              <strong>${esc(poi.name||'Haven')}</strong>
              <small>
                ${esc(poi.place||poi.address||'Plaats onbekend')}
                · bijgewerkt ${esc(updated)}
              </small>
              <span class="harbour-completeness-bar">
                <i style="width:${completeness.percentage}%"></i>
              </span>
              <em>
                ${completeness.percentage}% compleet
                ${completeness.missing.length
                  ?` · mist ${esc(completeness.missing.slice(0,3).join(', '))}`
                  :' · klaar voor gebruik'}
              </em>
            </span>
            <b>›</b>
          </button>

          <div class="harbour-library-meta">
            <span>📷 ${photoCount}</span>
            <span>⭐ ${Number(poi.rating||0)||'–'}</span>
            <span>${plannerPoiHasLocation(poi)?'📍 GPS':'⚠️ geen GPS'}</span>
          </div>

          <div class="harbour-library-item-actions">
            <button type="button" class="secondary"
              onclick="planToHarbour('${poi.id}')">
              🧭 Plan hierheen
            </button>
            <button type="button" class="secondary"
              onclick='editPoi(
                ${JSON.stringify(poi.id)},
                ${JSON.stringify(poi.name)},
                ${JSON.stringify(poi.category)},
                ${JSON.stringify(poi.place)},
                ${JSON.stringify(poi.address)},
                ${JSON.stringify(poi.rating)},
                ${JSON.stringify(poi.review)},
                ${JSON.stringify(isFavoritePoi(poi))},
                ${JSON.stringify(poi.latitude)},
                ${JSON.stringify(poi.longitude)}
              );captainNavigate("pois")'>
              ✏️ Aanvullen
            </button>
          </div>
        </article>
      `;
    }).join('')
    :'<span class="small">Geen havens gevonden met deze selectie.</span>';
}

function planToHarbour(id){
  const poi=getPoiById(id);
  if(!poi)return;

  if(!plannerPoiHasLocation(poi)){
    showAppToast('Deze haven heeft nog geen GPS-locatie.');
    return;
  }

  captainNavigate('planner');

  setTimeout(()=>{
    populatePlannerSelectors();
    $('plannerFrom').value='current';
    $('plannerTo').value=plannerPoiReference(poi);
    $('plannerTitle').value=`Naar ${poi.name||'haven'}`;
    plannerStops=[];
    renderPlannerStops();
    plannerFormChanged();
    $('plannerTo')?.scrollIntoView({
      behavior:'smooth',
      block:'center'
    });
    showAppToast(`${poi.name} ingesteld als bestemming.`);
  },100);
}

function openNewHarbourFromLibrary(){
  captainNavigate('pois');

  setTimeout(()=>{
    clearPoiForm(false);
    $('poiCategory').value='Haven';
    $('poiFormTitle').textContent='Nieuwe haven toevoegen';
    $('poiName')?.focus();
  },100);
}

function openNearbyHarbourSearchFromLibrary(){
  captainNavigate('pois');

  setTimeout(()=>{
    clearPoiForm(false);
    $('poiCategory').value='Haven';
    searchNearbyPois('Haven');
  },120);
}


const TECHNICAL_LOCAL_VERSION='v1';

function technicalLocalKey(){
  return `mijnserenity-technical-${TECHNICAL_LOCAL_VERSION}-${currentBoat?.id||'geen-boot'}`;
}

function technicalEventsLocalKey(){
  return `${technicalLocalKey()}-events`;
}

function technicalToday(){
  return localDateISO(new Date());
}

function defaultTechnicalTasks(){
  return [
    {
      id:'engine-oil',
      title:'Motorolie vervangen',
      category:'Motor',
      intervalMonths:12,
      intervalHours:100,
      lastDate:'',
      lastHours:null
    },
    {
      id:'oil-filter',
      title:'Oliefilter vervangen',
      category:'Motor',
      intervalMonths:12,
      intervalHours:100,
      lastDate:'',
      lastHours:null
    },
    {
      id:'fuel-prefilter',
      title:'Dieselvoorfilter controleren/vervangen',
      category:'Motor',
      intervalMonths:12,
      intervalHours:100,
      lastDate:'',
      lastHours:null
    },
    {
      id:'fuel-filter',
      title:'Fijn brandstoffilter vervangen',
      category:'Motor',
      intervalMonths:24,
      intervalHours:200,
      lastDate:'',
      lastHours:null
    },
    {
      id:'impeller',
      title:'Impeller vervangen',
      category:'Motor',
      intervalMonths:12,
      intervalHours:150,
      lastDate:'',
      lastHours:null
    },
    {
      id:'gearbox-oil',
      title:'Keerkoppelingolie vervangen',
      category:'Motor',
      intervalMonths:24,
      intervalHours:250,
      lastDate:'',
      lastHours:null
    },
    {
      id:'coolant',
      title:'Koelvloeistof vervangen',
      category:'Motor',
      intervalMonths:24,
      intervalHours:null,
      lastDate:'',
      lastHours:null
    },
    {
      id:'heater-service',
      title:'Dieselverwarming onderhouden',
      category:'Verwarming',
      intervalMonths:12,
      intervalHours:null,
      lastDate:'',
      lastHours:null
    },
    {
      id:'antifouling',
      title:'Onderwaterschip en antifouling controleren',
      category:'Romp',
      intervalMonths:12,
      intervalHours:null,
      lastDate:'',
      lastHours:null
    },
    {
      id:'anodes',
      title:'Anodes controleren',
      category:'Romp',
      intervalMonths:12,
      intervalHours:null,
      lastDate:'',
      lastHours:null
    },
    {
      id:'fire-extinguishers',
      title:'Brandblussers controleren',
      category:'Veiligheid',
      intervalMonths:12,
      intervalHours:null,
      lastDate:'',
      lastHours:null
    },
    {
      id:'safety-equipment',
      title:'Reddingsmiddelen en nooduitrusting controleren',
      category:'Veiligheid',
      intervalMonths:12,
      intervalHours:null,
      lastDate:'',
      lastHours:null
    },
    {
      id:'battery-check',
      title:'Accu’s, klemmen en laadspanning controleren',
      category:'Elektrisch',
      intervalMonths:6,
      intervalHours:null,
      lastDate:'',
      lastHours:null
    }
  ];
}

function defaultTechnicalState(){
  return {
    boat:{
      name:currentBoat?.name||'Serenity',
      model:'VriJon Contessa 37E',
      buildYear:1994,
      lengthM:11.2,
      hull:'Staal'
    },
    engineHours:0,
    countedTripHours:{},
    lastEngineHoursUpdate:null,
    engineTemp:null,
    oilPressure:null,
    coolantLevel:'unknown',
    batteryType:'lead',
    houseVoltage:null,
    startVoltage:null,
    fuelPct:null,
    fuelCapacity:Number(settingsCache?.tank_capacity||0)||null,
    waterPct:null,
    wastePct:null,
    shorePower:false,
    solarPower:null,
    heater:'unknown',
    bilge:'unknown',
    camera:{
      name:'Camera radarbeugel',
      snapshotUrl:'',
      entityId:'',
      homeAssistantBaseUrl:'',
      filename:'',
      refreshSeconds:30,
      enabled:false,
      liveEnabled:false,
      accessToken:'',
      tokenUpdatedAt:null,
      lastRefreshAt:null
    },
    entertainment:{
      version:2,
      enabled:false,
      haBaseUrl:'',
      dashboardPath:'/lovelace/mijnserenity',
      webhookId:'',
      activePlayer:'salon',
      activeLight:'salon',
      volume:35,
      brightness:70,
      ring:{
        name:'Ring beveiliging',
        cameraEntity:'',
        motionSwitchEntity:''
      },
      hue:{
        lights:[
          {key:'salon',name:'Hue salon',entityId:''},
          {key:'stuurstand',name:'Hue stuurstand',entityId:''},
          {key:'achterdek',name:'Hue achterdek',entityId:''},
          {key:'slaapruimte',name:'Hue slaapruimte',entityId:''}
        ]
      },
      players:[
        {key:'salon',name:'Sonos salon',entityId:''},
        {key:'stuurstand',name:'Sonos stuurstand',entityId:''},
        {key:'achterdek',name:'Sonos achterdek',entityId:''}
      ],
      appleTv:{
        name:'Apple TV',
        mediaEntity:'',
        remoteEntity:''
      },
      scenes:[
        {key:'avond',name:'Avond aan boord',entityId:''},
        {key:'varen',name:'Varen',entityId:''},
        {key:'slapen',name:'Slapen',entityId:''},
        {key:'alles-uit',name:'Alles uit',entityId:''}
      ],
      favorites:Array.from({length:6},(_,index)=>({
        id:`favoriet-${index+1}`,
        name:`Favoriet ${index+1}`,
        mediaContentId:'',
        mediaContentType:'music'
      })),
      updatedAt:null
    },
    integrations:{
      victron:'not_configured',
      homeAssistant:'planned',
      nmea2000:'planned'
    },
    notes:'',
    maintenance:defaultTechnicalTasks(),
    lastSnapshotAt:null,
    updatedAt:null
  };
}

function mergeTechnicalTasks(savedTasks=[]){
  const defaults=defaultTechnicalTasks();
  const savedMap=new Map(
    (Array.isArray(savedTasks)?savedTasks:[])
      .map(task=>[String(task.id),task])
  );

  const merged=defaults.map(task=>({
    ...task,
    ...(savedMap.get(String(task.id))||{})
  }));

  const defaultIds=new Set(defaults.map(task=>String(task.id)));
  const custom=(Array.isArray(savedTasks)?savedTasks:[])
    .filter(task=>!defaultIds.has(String(task.id)));

  return [...merged,...custom];
}

function normaliseTechnicalState(value){
  const base=defaultTechnicalState();
  const saved=value&&typeof value==='object'?value:{};
  const countedTripHours=(
    saved.countedTripHours&&
    typeof saved.countedTripHours==='object'&&
    !Array.isArray(saved.countedTripHours)
  )
    ?saved.countedTripHours
    :{};

  return {
    ...base,
    ...saved,
    boat:{
      ...base.boat,
      ...(saved.boat||{})
    },
    integrations:{
      ...base.integrations,
      ...(saved.integrations||{})
    },
    entertainment:{
      ...base.entertainment,
      ...(saved.entertainment||{}),
      ring:{
        ...base.entertainment.ring,
        ...(saved.entertainment?.ring||{})
      },
      hue:{
        ...base.entertainment.hue,
        ...(saved.entertainment?.hue||{}),
        lights:Array.isArray(saved.entertainment?.hue?.lights)
          ?saved.entertainment.hue.lights
          :base.entertainment.hue.lights
      },
      players:Array.isArray(saved.entertainment?.players)
        ?saved.entertainment.players
        :base.entertainment.players,
      appleTv:{
        ...base.entertainment.appleTv,
        ...(saved.entertainment?.appleTv||{})
      },
      scenes:Array.isArray(saved.entertainment?.scenes)
        ?saved.entertainment.scenes
        :base.entertainment.scenes,
      favorites:Array.isArray(saved.entertainment?.favorites)
        ?saved.entertainment.favorites
        :base.entertainment.favorites
    },
    camera:{
      ...base.camera,
      ...(saved.camera||{})
    },
    countedTripHours:{...countedTripHours},
    maintenance:mergeTechnicalTasks(saved.maintenance)
  };
}

function readTechnicalLocalState(){
  try{
    return normaliseTechnicalState(
      JSON.parse(localStorage.getItem(technicalLocalKey())||'null')
    );
  }catch(error){
    console.warn('Technische lokale gegevens lezen mislukt:',error);
    return defaultTechnicalState();
  }
}

function saveTechnicalLocalState(state){
  try{
    localStorage.setItem(
      technicalLocalKey(),
      JSON.stringify(state)
    );
  }catch(error){
    console.warn('Technische lokale gegevens bewaren mislukt:',error);
  }
}

function readTechnicalLocalEvents(){
  try{
    const events=JSON.parse(
      localStorage.getItem(technicalEventsLocalKey())||'[]'
    );
    return Array.isArray(events)?events:[];
  }catch(error){
    console.warn('Technische lokale logitems lezen mislukt:',error);
    return [];
  }
}

function saveTechnicalLocalEvents(events){
  try{
    localStorage.setItem(
      technicalEventsLocalKey(),
      JSON.stringify((events||[]).slice(0,300))
    );
  }catch(error){
    console.warn('Technische logitems lokaal bewaren mislukt:',error);
  }
}

function technicalTableMissing(error){
  const code=String(error?.code||'');
  const message=String(error?.message||'').toLowerCase();

  return (
    ['42P01','PGRST205','PGRST204'].includes(code)||
    message.includes('technical_state')&&
      (
        message.includes('does not exist')||
        message.includes('schema cache')||
        message.includes('could not find')
      )
  );
}

function setTechnicalSyncStatus(message,state=''){
  const element=$('technicalSyncStatus');
  if(!element)return;

  element.textContent=message||'';
  element.classList.toggle('hidden',!message);
  element.classList.remove('success','warning','error');

  if(state)element.classList.add(state);
}

async function loadTechnicalDashboard(force=false){
  if(!currentBoat||technicalLoading)return;

  technicalLoading=true;

  if(!technicalStateCache||force){
    technicalStateCache=readTechnicalLocalState();
    technicalEventsCache=readTechnicalLocalEvents();
    renderTechnicalDashboard();
  }

  try{
    const [{data:stateRow,error:stateError},{data:eventRows,error:eventError}]
      =await Promise.all([
        sb.from('technical_state')
          .select('data,updated_at')
          .eq('boat_id',currentBoat.id)
          .maybeSingle(),
        sb.from('technical_events')
          .select('*')
          .eq('boat_id',currentBoat.id)
          .order('event_date',{ascending:false})
          .order('created_at',{ascending:false})
          .limit(200)
      ]);

    if(stateError)throw stateError;
    if(eventError)throw eventError;

    technicalCloudReady=true;

    if(stateRow?.data){
      technicalStateCache=normaliseTechnicalState({
        ...stateRow.data,
        updatedAt:stateRow.updated_at||
          stateRow.data.updatedAt||
          null
      });
      saveTechnicalLocalState(technicalStateCache);
    }else{
      technicalStateCache=normaliseTechnicalState(technicalStateCache);
    }

    technicalEventsCache=(eventRows||[]).map(event=>({
      ...event,
      source:'cloud'
    }));
    saveTechnicalLocalEvents(technicalEventsCache);

    renderTechnicalDashboard();
    refreshHomeAssistantConnectionStatus(false);
    setTechnicalSyncStatus(
      technicalStateCache?.updatedAt
        ?`Gedeeld dashboard bijgewerkt ${formatAccountDate(technicalStateCache.updatedAt)}`
        :'Gedeeld technisch dashboard is gereed.',
      'success'
    );
  }catch(error){
    if(technicalTableMissing(error)){
      technicalCloudReady=false;
      setTechnicalSyncStatus(
        'Technische gegevens staan nu lokaal. Voer SUPABASE_TECHNISCH_DASHBOARD_5_4_0.sql uit om ze met Desi te delen.',
        'warning'
      );
    }else{
      console.error('Technisch dashboard laden mislukt:',error);
      setTechnicalSyncStatus(
        'Cloud synchronisatie is tijdelijk niet beschikbaar. Lokale gegevens blijven zichtbaar.',
        'warning'
      );
    }

    technicalStateCache=normaliseTechnicalState(
      technicalStateCache||readTechnicalLocalState()
    );
    technicalEventsCache=technicalEventsCache.length
      ?technicalEventsCache
      :readTechnicalLocalEvents();
    renderTechnicalDashboard();
  }finally{
    technicalLoading=false;
  }
}

function initTechnicalDashboard(){
  if(!currentBoat){
    showAppToast('Koppel eerst Serenity.');
    captainNavigate(isAppAdmin()?'boat':'settings');
    return;
  }

  if(!technicalStateCache){
    technicalStateCache=readTechnicalLocalState();
    technicalEventsCache=readTechnicalLocalEvents();
  }

  renderTechnicalDashboard();
  fillHomeAssistantMappings();
  fillRadarCameraSettings();
  renderRadarCamera();
  setTimeout(()=>refreshRadarCamera(false),250);
  refreshHomeAssistantConnectionStatus(false);
  loadTechnicalDashboard(false);
}

function technicalNumber(value,digits=1){
  const number=Number(value);
  if(!Number.isFinite(number))return null;

  return number.toLocaleString('nl-NL',{
    minimumFractionDigits:0,
    maximumFractionDigits:digits
  });
}

function technicalPercent(value){
  const number=Number(value);
  return Number.isFinite(number)
    ?`${Math.round(number)}%`
    :'–%';
}

function technicalClampPercent(value){
  const number=Number(value);
  if(!Number.isFinite(number))return null;
  return Math.max(0,Math.min(100,number));
}

function technicalBatteryStatus(voltage,type='lead'){
  const value=Number(voltage);
  if(!Number.isFinite(value)||value<=0){
    return {level:'unknown',label:'Nog niet gemeten'};
  }

  if(type==='lithium'){
    if(value<12.2)return {level:'critical',label:'Kritiek laag'};
    if(value<12.8)return {level:'warning',label:'Laag'};
    return {level:'good',label:'In orde'};
  }

  if(value<11.9)return {level:'critical',label:'Kritiek laag'};
  if(value<12.2)return {level:'warning',label:'Laag'};
  return {level:'good',label:'In orde'};
}

function technicalAddMonths(dateValue,months){
  if(!dateValue||!Number(months))return null;

  const date=new Date(`${dateValue}T12:00:00`);
  if(Number.isNaN(date.getTime()))return null;

  date.setMonth(date.getMonth()+Number(months));
  return date;
}

function technicalDaysUntil(date){
  if(!(date instanceof Date)||Number.isNaN(date.getTime()))return null;
  return Math.ceil(
    (date.getTime()-Date.now())/86400000
  );
}

function technicalTaskStatus(task){
  const engineHours=Number(technicalStateCache?.engineHours||0);
  const dueDate=technicalAddMonths(
    task.lastDate,
    Number(task.intervalMonths||0)
  );
  const daysLeft=technicalDaysUntil(dueDate);

  const nextHours=(
    Number.isFinite(Number(task.lastHours))&&
    Number(task.intervalHours||0)>0
  )
    ?Number(task.lastHours)+Number(task.intervalHours)
    :null;

  const hoursLeft=Number.isFinite(nextHours)
    ?nextHours-engineHours
    :null;

  const neverDone=!task.lastDate&&!Number.isFinite(Number(task.lastHours));
  const overdue=(
    Number.isFinite(daysLeft)&&daysLeft<0
  )||(
    Number.isFinite(hoursLeft)&&hoursLeft<0
  );

  const dueSoon=(
    Number.isFinite(daysLeft)&&daysLeft<=30
  )||(
    Number.isFinite(hoursLeft)&&hoursLeft<=10
  );

  let level='good';
  let label='In orde';

  if(neverDone){
    level='warning';
    label='Eerste controle nodig';
  }else if(overdue){
    level='critical';
    label='Achterstallig';
  }else if(dueSoon){
    level='warning';
    label='Binnenkort';
  }

  const detail=[];

  if(dueDate){
    detail.push(
      `datum ${dueDate.toLocaleDateString('nl-NL',{
        day:'2-digit',
        month:'2-digit',
        year:'numeric'
      })}`
    );
  }

  if(Number.isFinite(nextHours)){
    detail.push(
      `bij ${technicalNumber(nextHours,1)} uur`
    );
  }

  return {
    level,
    label,
    detail:detail.length?detail.join(' · '):'Nog geen interval ingesteld',
    daysLeft,
    hoursLeft,
    dueDate,
    nextHours,
    neverDone
  };
}

function technicalWarnings(){
  const state=technicalStateCache||defaultTechnicalState();
  const warnings=[];

  const push=(level,title,text,icon='⚠️')=>{
    warnings.push({level,title,text,icon});
  };

  const house=technicalBatteryStatus(
    state.houseVoltage,
    state.batteryType
  );
  const start=technicalBatteryStatus(state.startVoltage,'lead');

  if(house.level==='critical'){
    push('critical','Huishoudaccu kritisch',
      `${technicalNumber(state.houseVoltage,2)} V gemeten.`,'🔋');
  }else if(house.level==='warning'){
    push('warning','Huishoudaccu laag',
      `${technicalNumber(state.houseVoltage,2)} V gemeten.`,'🔋');
  }

  if(start.level==='critical'){
    push('critical','Startaccu kritisch',
      `${technicalNumber(state.startVoltage,2)} V gemeten.`,'🔌');
  }else if(start.level==='warning'){
    push('warning','Startaccu laag',
      `${technicalNumber(state.startVoltage,2)} V gemeten.`,'🔌');
  }

  if(Number.isFinite(Number(state.fuelPct))&&Number(state.fuelPct)<=20){
    push(
      Number(state.fuelPct)<=10?'critical':'warning',
      'Dieselvoorraad laag',
      `Tank staat op ${Math.round(Number(state.fuelPct))}%.`,
      '⛽'
    );
  }

  if(Number.isFinite(Number(state.waterPct))&&Number(state.waterPct)<=20){
    push('warning','Drinkwater bijna op',
      `Watertank staat op ${Math.round(Number(state.waterPct))}%.`,'💧');
  }

  if(Number.isFinite(Number(state.wastePct))&&Number(state.wastePct)>=75){
    push(
      Number(state.wastePct)>=90?'critical':'warning',
      'Vuilwatertank raakt vol',
      `Tank staat op ${Math.round(Number(state.wastePct))}%.`,
      '🚽'
    );
  }

  if(Number(state.engineTemp)>100){
    push(
      Number(state.engineTemp)>105?'critical':'warning',
      'Motortemperatuur hoog',
      `${technicalNumber(state.engineTemp,0)} °C gemeten.`,
      '🌡️'
    );
  }

  if(
    Number.isFinite(Number(state.oilPressure))&&
    Number(state.oilPressure)>0&&
    Number(state.oilPressure)<1
  ){
    push('critical','Oliedruk laag',
      `${technicalNumber(state.oilPressure,1)} bar gemeten.`,'🛢️');
  }

  if(state.coolantLevel==='low'){
    push('critical','Koelvloeistof laag',
      'Controleer het niveau voor vertrek.','🧊');
  }

  if(state.heater==='fault'){
    push('critical','Storing dieselverwarming',
      'Controle of service nodig.','🔥');
  }else if(state.heater==='service'){
    push('warning','Verwarming heeft onderhoud nodig',
      'Plan een servicebeurt.','🔥');
  }

  if(state.bilge==='alarm'){
    push('critical','Bilge-alarm',
      'Water aanwezig of bilgepomp vraagt direct aandacht.','🚨');
  }else if(state.bilge==='active'){
    push('warning','Bilgepomp actief',
      'Controleer waarom de pomp draait.','🌊');
  }

  (state.maintenance||[]).forEach(task=>{
    const status=technicalTaskStatus(task);
    if(status.level==='critical'){
      push('critical',task.title,
        `${status.label} · ${status.detail}`,'🛠️');
    }else if(status.level==='warning'&&!status.neverDone){
      push('warning',task.title,
        `${status.label} · ${status.detail}`,'🔧');
    }
  });

  return warnings.slice(0,12);
}

function technicalHealth(){
  const warnings=technicalWarnings();
  const critical=warnings.filter(item=>item.level==='critical').length;
  const attention=warnings.filter(item=>item.level==='warning').length;

  if(critical){
    return {
      level:'critical',
      label:`${critical} dringend`,
      dashboard:'Techniek vraagt aandacht'
    };
  }

  if(attention){
    return {
      level:'warning',
      label:`${attention} aandachtspunt${attention===1?'':'en'}`,
      dashboard:`${attention} technisch aandachtspunt${attention===1?'':'en'}`
    };
  }

  if(!technicalStateCache?.lastSnapshotAt){
    return {
      level:'unknown',
      label:'Nog controleren',
      dashboard:'Eerste controle invullen'
    };
  }

  return {
    level:'good',
    label:'Alles in orde',
    dashboard:'Techniek in orde'
  };
}

function technicalIntegrationLabel(value){
  return {
    connected:'Verbonden',
    planned:'Koppeling gepland',
    not_configured:'Niet gekoppeld'
  }[value]||'Niet gekoppeld';
}

function technicalIntegrationClass(value){
  return value==='connected'
    ?'connected'
    :value==='planned'
      ?'planned'
      :'offline';
}

function renderTechnicalAlerts(){
  const container=$('technicalAlertList');
  if(!container)return;

  const warnings=technicalWarnings();

  if(!warnings.length){
    container.innerHTML=`
      <div class="technical-alert good">
        <span>✅</span>
        <div>
          <b>Geen actieve waarschuwingen.</b>
          <small>De laatst ingevoerde waarden vallen binnen de ingestelde grenzen.</small>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML=warnings.map(item=>`
    <div class="technical-alert ${item.level}">
      <span>${item.icon}</span>
      <div>
        <b>${esc(item.title)}</b>
        <small>${esc(item.text)}</small>
      </div>
    </div>
  `).join('');
}

function renderTechnicalMaintenance(){
  const summary=$('technicalMaintenanceSummary');
  const list=$('technicalMaintenanceList');
  if(!summary||!list)return;

  const tasks=(technicalStateCache?.maintenance||[])
    .map(task=>({
      task,
      status:technicalTaskStatus(task)
    }))
    .sort((a,b)=>{
      const priority={critical:0,warning:1,good:2};
      const levelDifference=
        priority[a.status.level]-priority[b.status.level];
      if(levelDifference)return levelDifference;
      return String(a.task.title).localeCompare(
        String(b.task.title),
        'nl'
      );
    });

  const counts={
    critical:tasks.filter(item=>item.status.level==='critical').length,
    warning:tasks.filter(item=>item.status.level==='warning').length,
    good:tasks.filter(item=>item.status.level==='good').length
  };

  summary.innerHTML=`
    <span class="critical">${counts.critical} achterstallig</span>
    <span class="warning">${counts.warning} binnenkort/eerste controle</span>
    <span class="good">${counts.good} in orde</span>
  `;

  list.innerHTML=tasks.length
    ?tasks.map(({task,status})=>`
      <article class="technical-maintenance-item ${status.level}">
        <div class="technical-maintenance-status">
          ${status.level==='critical'?'!':status.level==='warning'?'•':'✓'}
        </div>
        <div class="technical-maintenance-copy">
          <strong>${esc(task.title)}</strong>
          <small>${esc(task.category||'Onderhoud')} · ${esc(status.detail)}</small>
          <span>${esc(status.label)}</span>
        </div>
        <div class="technical-maintenance-actions">
          <button type="button"
            onclick="completeTechnicalTask('${task.id}')">
            Uitgevoerd
          </button>
          ${String(task.id).startsWith('custom-')
            ?`<button type="button" class="record-delete-mini"
                onclick="deleteTechnicalTask('${task.id}')"
                aria-label="Onderhoudstaak verwijderen">🗑️</button>`
            :''}
        </div>
      </article>
    `).join('')
    :'<span class="small">Nog geen onderhoudstaken.</span>';
}


const HOME_ASSISTANT_LOCAL_VERSION='v1';

function homeAssistantLocalKey(){
  return `mijnserenity-ha-${HOME_ASSISTANT_LOCAL_VERSION}-${currentBoat?.id||'geen-boot'}`;
}

function defaultHomeAssistantLocalConfig(){
  return {
    secret:'',
    mappings:{
      engineHours:'',
      houseVoltage:'',
      startVoltage:'',
      solarPower:'',
      fuelPct:'',
      waterPct:'',
      wastePct:'',
      shorePower:'',
      engineTemp:'',
      oilPressure:'',
      heater:'',
      bilge:''
    }
  };
}

function readHomeAssistantLocalConfig(){
  try{
    const saved=JSON.parse(
      localStorage.getItem(homeAssistantLocalKey())||'null'
    );

    return {
      ...defaultHomeAssistantLocalConfig(),
      ...(saved||{}),
      mappings:{
        ...defaultHomeAssistantLocalConfig().mappings,
        ...(saved?.mappings||{})
      }
    };
  }catch(error){
    console.warn('Home Assistant-configuratie lezen mislukt:',error);
    return defaultHomeAssistantLocalConfig();
  }
}

function saveHomeAssistantLocalConfig(config){
  try{
    localStorage.setItem(
      homeAssistantLocalKey(),
      JSON.stringify(config)
    );
  }catch(error){
    console.warn('Home Assistant-configuratie bewaren mislukt:',error);
  }
}

function homeAssistantSetupMissing(error){
  const code=String(error?.code||'');
  const message=String(error?.message||'').toLowerCase();

  return (
    ['42883','PGRST202','PGRST203'].includes(code)||
    message.includes('could not find the function')||
    message.includes('schema cache')||
    message.includes('does not exist')
  );
}

function randomHomeAssistantSecret(){
  const bytes=new Uint8Array(32);
  crypto.getRandomValues(bytes);

  return [...bytes]
    .map(byte=>byte.toString(16).padStart(2,'0'))
    .join('');
}

function setHomeAssistantConnectionStatus(message,state=''){
  const element=$('homeAssistantConnectionStatus');
  if(!element)return;

  element.textContent=message||'';
  element.classList.toggle('hidden',!message);
  element.classList.remove('success','warning','error');

  if(state)element.classList.add(state);
}

function homeAssistantDate(value){
  if(!value)return 'Nog nooit';

  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return 'Nog nooit';

  return date.toLocaleString('nl-NL',{
    day:'2-digit',
    month:'2-digit',
    year:'numeric',
    hour:'2-digit',
    minute:'2-digit'
  });
}

function homeAssistantIsRecentlyOnline(value){
  if(!value)return false;
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return false;
  return Date.now()-date.getTime()<=12*60*1000;
}

function homeAssistantMappingIds(){
  return {
    engineHours:'haEntityEngineHours',
    houseVoltage:'haEntityHouseVoltage',
    startVoltage:'haEntityStartVoltage',
    solarPower:'haEntitySolarPower',
    fuelPct:'haEntityFuelPct',
    waterPct:'haEntityWaterPct',
    wastePct:'haEntityWastePct',
    shorePower:'haEntityShorePower',
    engineTemp:'haEntityEngineTemp',
    oilPressure:'haEntityOilPressure',
    heater:'haEntityHeater',
    bilge:'haEntityBilge'
  };
}

function fillHomeAssistantMappings(){
  const config=readHomeAssistantLocalConfig();

  Object.entries(homeAssistantMappingIds())
    .forEach(([key,id])=>{
      if($(id))$(id).value=config.mappings?.[key]||'';
    });

  if($('homeAssistantSecretDisplay')){
    $('homeAssistantSecretDisplay').value=config.secret||'';
  }

  updateHomeAssistantYaml();
}

function homeAssistantCurrentMappings(){
  const mappings={};

  Object.entries(homeAssistantMappingIds())
    .forEach(([key,id])=>{
      mappings[key]=String($(id)?.value||'').trim();
    });

  return mappings;
}

function homeAssistantMappingChanged(){
  const config=readHomeAssistantLocalConfig();
  config.mappings=homeAssistantCurrentMappings();
  saveHomeAssistantLocalConfig(config);
  updateHomeAssistantYaml();
}

function homeAssistantNumericTemplate(entityId){
  if(!entityId)return 'null';

  return `{{ (states('${entityId}') | float(none)) | to_json }}`;
}

function homeAssistantStringTemplate(entityId){
  if(!entityId)return 'null';

  return `{{ (states('${entityId}') if states('${entityId}') not in ['unknown','unavailable','none',''] else none) | to_json }}`;
}

function homeAssistantBooleanTemplate(entityId){
  if(!entityId)return 'null';

  return `{{ (is_state('${entityId}','on') if states('${entityId}') not in ['unknown','unavailable','none',''] else none) | to_json }}`;
}

function homeAssistantMappedEntities(mappings){
  return [...new Set(
    Object.values(mappings||{})
      .map(value=>String(value||'').trim())
      .filter(Boolean)
  )];
}

function buildHomeAssistantYaml(){
  const config=readHomeAssistantLocalConfig();
  const mappings=homeAssistantCurrentMappings();
  const camera=radarCameraConfig();
  const cameraEntity=String(camera.entityId||'').trim();
  const cameraBaseUrl=normaliseRadarCameraUrl(
    camera.homeAssistantBaseUrl
  );
  const secret=config.secret||'NOG_GEEN_SLEUTEL';
  const endpoint=
    `${SUPABASE_URL}/rest/v1/rpc/ingest_home_assistant_technical_data`;
  const entities=homeAssistantMappedEntities(mappings);

  if(cameraEntity&&!entities.includes(cameraEntity)){
    entities.push(cameraEntity);
  }

  const stateTriggers=entities.length
    ?entities.map(entity=>`      - ${entity}`).join('\n')
    :'      # Voeg hierboven eerst één of meer entiteiten in MijnSerenity toe.';

  const cameraTokenTemplate=cameraEntity
    ?`{{ (state_attr('${cameraEntity.replace(/'/g,"''")}', 'access_token') if state_attr('${cameraEntity.replace(/'/g,"''")}', 'access_token') else none) | to_json }}`
    :'null';

  return `# ============================================================
# MIJNSERENITY 5.6.0 — HOME ASSISTANT KOPPELING
# ============================================================

# 1. Voeg dit toe aan secrets.yaml
mijnserenity_rpc_url: "${endpoint}"
mijnserenity_supabase_key: "${SUPABASE_KEY}"
mijnserenity_authorization: "Bearer ${SUPABASE_KEY}"
mijnserenity_secret: "${secret}"

# 2. Voeg dit toe aan configuration.yaml
rest_command:
  mijnserenity_sync:
    url: !secret mijnserenity_rpc_url
    method: post
    content_type: "application/json"
    headers:
      apikey: !secret mijnserenity_supabase_key
      Authorization: !secret mijnserenity_authorization
      x-mijnserenity-secret: !secret mijnserenity_secret
    payload: >-
      {
        "p_boat_id": "${currentBoat?.id||'BOOT_ID_ONTBREEKT'}",
        "p_payload": {
          "engine_hours": ${homeAssistantNumericTemplate(mappings.engineHours)},
          "house_voltage": ${homeAssistantNumericTemplate(mappings.houseVoltage)},
          "start_voltage": ${homeAssistantNumericTemplate(mappings.startVoltage)},
          "solar_power": ${homeAssistantNumericTemplate(mappings.solarPower)},
          "fuel_pct": ${homeAssistantNumericTemplate(mappings.fuelPct)},
          "water_pct": ${homeAssistantNumericTemplate(mappings.waterPct)},
          "waste_pct": ${homeAssistantNumericTemplate(mappings.wastePct)},
          "shore_power": ${homeAssistantBooleanTemplate(mappings.shorePower)},
          "engine_temp": ${homeAssistantNumericTemplate(mappings.engineTemp)},
          "oil_pressure": ${homeAssistantNumericTemplate(mappings.oilPressure)},
          "heater": ${homeAssistantStringTemplate(mappings.heater)},
          "bilge": ${homeAssistantStringTemplate(mappings.bilge)},
          "camera_entity": ${cameraEntity?JSON.stringify(cameraEntity):'null'},
          "camera_base_url": ${cameraBaseUrl?JSON.stringify(cameraBaseUrl):'null'},
          "camera_access_token": ${cameraTokenTemplate}
        }
      }

# 3. Voeg dit toe aan automations.yaml
- id: mijnserenity_techniek_synchroniseren
  alias: MijnSerenity technisch dashboard synchroniseren
  description: Stuurt gekozen sensoren en cameratoegang naar MijnSerenity.
  mode: restart
  triggers:
    - trigger: homeassistant
      event: start
    - trigger: time_pattern
      minutes: "/4"
${entities.length?`    - trigger: state
      entity_id:
${stateTriggers}
      for:
        seconds: 20
`:''}  actions:
    - action: rest_command.mijnserenity_sync

# 4. Controleer de configuratie en herstart Home Assistant.
# 5. Voer daarna rest_command.mijnserenity_sync één keer handmatig uit.
`;
}

function updateHomeAssistantYaml(){
  const textarea=$('homeAssistantYaml');
  if(!textarea)return;

  textarea.value=buildHomeAssistantYaml();
}


function homeAssistantStatusFromTechnicalState(){
  const state=technicalStateCache||{};
  const integration=state.integrations?.homeAssistant;
  const lastSeen=
    state.homeAssistantLastSync||
    state.updatedAt||
    null;
  const fieldCount=Number(
    state.homeAssistantFieldCount||0
  );

  const connected=integration==='connected';
  const planned=integration==='planned';

  return {
    enabled:connected||planned,
    last_seen_at:connected?lastSeen:null,
    last_status:connected
      ?'connected'
      :planned
        ?'configured'
        :'not_configured',
    field_count:Number.isFinite(fieldCount)?fieldCount:0,
    source:'technical_state'
  };
}

function mergeHomeAssistantStatus(primary,fallback){
  const a=primary&&typeof primary==='object'?primary:{};
  const b=fallback&&typeof fallback==='object'?fallback:{};

  const aHasConnection=Boolean(
    a.enabled||
    a.last_seen_at||
    a.last_status==='connected'
  );
  const bHasConnection=Boolean(
    b.enabled||
    b.last_seen_at||
    b.last_status==='connected'
  );

  if(aHasConnection){
    return {
      ...b,
      ...a,
      field_count:Number(
        a.field_count??b.field_count??0
      ),
      source:a.source||'rpc'
    };
  }

  if(bHasConnection){
    return {
      ...a,
      ...b,
      source:b.source||'technical_state'
    };
  }

  return {
    enabled:false,
    last_seen_at:null,
    last_status:'not_configured',
    field_count:0,
    ...b,
    ...a
  };
}

async function fetchHomeAssistantTechnicalFallback(){
  if(!currentBoat)return null;

  try{
    const {data,error}=await sb.from('technical_state')
      .select('data,updated_at')
      .eq('boat_id',currentBoat.id)
      .maybeSingle();

    if(error)throw error;

    if(data?.data){
      technicalStateCache=normaliseTechnicalState({
        ...data.data,
        updatedAt:data.updated_at||
          data.data.updatedAt||
          null
      });
      saveTechnicalLocalState(technicalStateCache);
      renderTechnicalDashboard();
    }

    return homeAssistantStatusFromTechnicalState();
  }catch(error){
    console.warn(
      'Home Assistant-fallback uit technisch dashboard ophalen mislukt:',
      error
    );
    return homeAssistantStatusFromTechnicalState();
  }
}

function homeAssistantErrorText(error){
  const code=String(error?.code||'').trim();
  const message=String(
    error?.message||
    error?.details||
    'Onbekende fout'
  ).trim();

  return [code,message].filter(Boolean).join(' · ');
}

function renderHomeAssistantConnectionStatus(){
  const fallback=homeAssistantStatusFromTechnicalState();
  const status=mergeHomeAssistantStatus(
    homeAssistantStatusCache,
    fallback
  );

  homeAssistantStatusCache=status;

  const badge=$('homeAssistantConnectionBadge');
  const lastSeen=$('homeAssistantLastSeen');
  const fieldCount=$('homeAssistantFieldCount');
  const disableButton=$('homeAssistantDisableButton');
  const createButton=$('homeAssistantCreateButton');
  const panel=$('homeAssistantSetupPanel');

  const enabled=Boolean(status.enabled);
  const online=enabled&&(
    status.last_status==='connected'||
    homeAssistantIsRecentlyOnline(status.last_seen_at)
  );
  const configured=enabled&&!online;

  if(badge){
    badge.className='home-assistant-connection-badge '+
      (online?'online':configured?'configured':'offline');

    badge.textContent=online
      ?'Verbonden'
      :configured
        ?'Koppeling ingesteld'
        :'Niet gekoppeld';
  }

  if(lastSeen){
    lastSeen.textContent=homeAssistantDate(status.last_seen_at);
  }

  if(fieldCount){
    fieldCount.textContent=String(
      Number(status.field_count||0)
    );
  }

  disableButton?.classList.toggle('hidden',!enabled);

  if(createButton){
    createButton.textContent=enabled
      ?'⚙️ Configuratie openen'
      :'🔗 Koppeling aanmaken';

    createButton.onclick=enabled
      ?()=>openHomeAssistantSetupPanel()
      :()=>createHomeAssistantConnection();
  }

  const localConfig=readHomeAssistantLocalConfig();

  if(panel&&!panel.classList.contains('hidden')){
    fillHomeAssistantMappings();

    if(enabled&&!localConfig.secret){
      setHomeAssistantConnectionStatus(
        'De koppeling werkt, maar de geheime sleutel staat niet meer op dit apparaat. Alleen voor een nieuwe configuratie is een nieuwe sleutel nodig.',
        'warning'
      );
    }
  }
}

async function refreshHomeAssistantConnectionStatus(showMessage=false){
  if(!currentBoat)return;

  if(homeAssistantStatusLoading){
    if(showMessage){
      setHomeAssistantConnectionStatus(
        'Verbinding wordt al gecontroleerd…',
        'warning'
      );
    }
    return;
  }

  homeAssistantStatusLoading=true;

  const button=$('homeAssistantCheckButton');
  const originalText=button?.textContent||'↻ Controleer verbinding';

  if(button){
    button.disabled=true;
    button.textContent='⏳ Controleren…';
  }

  if(showMessage){
    setHomeAssistantConnectionStatus(
      'Home Assistant-verbinding controleren…',
      'warning'
    );
  }

  let rpcError=null;

  try{
    const fallback=await fetchHomeAssistantTechnicalFallback();

    const {data,error}=await sb.rpc(
      'get_home_assistant_integration_status',
      {p_boat_id:currentBoat.id}
    );

    if(error){
      rpcError=error;
    }

    homeAssistantStatusCache=mergeHomeAssistantStatus(
      error?null:data,
      fallback
    );

    renderHomeAssistantConnectionStatus();
    renderTechnicalIntegrations();

    const connected=Boolean(
      homeAssistantStatusCache.enabled&&
      (
        homeAssistantStatusCache.last_status==='connected'||
        homeAssistantStatusCache.last_seen_at
      )
    );

    if(showMessage){
      if(connected){
        setHomeAssistantConnectionStatus(
          `Home Assistant is verbonden ✅ Laatste synchronisatie: ${homeAssistantDate(homeAssistantStatusCache.last_seen_at)}. Ontvangen waarden: ${Number(homeAssistantStatusCache.field_count||0)}.`,
          'success'
        );
      }else if(homeAssistantStatusCache.enabled){
        setHomeAssistantConnectionStatus(
          'De koppeling is ingesteld, maar er is nog geen synchronisatie ontvangen. Voer rest_command.mijnserenity_sync in Home Assistant uit.',
          'warning'
        );
      }else if(rpcError){
        setHomeAssistantConnectionStatus(
          `Statusfunctie gaf een fout (${homeAssistantErrorText(rpcError)}). Het technische dashboard toont nog geen ontvangen Home Assistant-data.`,
          'error'
        );
      }else{
        setHomeAssistantConnectionStatus(
          'Home Assistant is nog niet gekoppeld.',
          'warning'
        );
      }
    }
  }catch(error){
    console.error('Home Assistant-status controleren mislukt:',error);

    const fallback=homeAssistantStatusFromTechnicalState();
    homeAssistantStatusCache=mergeHomeAssistantStatus(null,fallback);
    renderHomeAssistantConnectionStatus();
    renderTechnicalIntegrations();

    const connected=Boolean(
      homeAssistantStatusCache.enabled&&
      (
        homeAssistantStatusCache.last_status==='connected'||
        homeAssistantStatusCache.last_seen_at
      )
    );

    setHomeAssistantConnectionStatus(
      connected
        ?`Home Assistant-data is ontvangen via het technische dashboard ✅ Laatste synchronisatie: ${homeAssistantDate(homeAssistantStatusCache.last_seen_at)}.`
        :`Controle mislukt: ${homeAssistantErrorText(error)}`,
      connected?'success':'error'
    );
  }finally{
    homeAssistantStatusLoading=false;

    if(button){
      button.disabled=false;
      button.textContent=originalText;
    }
  }
}

function openHomeAssistantSetupPanel(){
  $('homeAssistantSetupPanel')?.classList.remove('hidden');
  fillHomeAssistantMappings();

  $('homeAssistantSetupPanel')?.scrollIntoView({
    behavior:'smooth',
    block:'start'
  });
}

async function createHomeAssistantConnection(){
  if(!currentBoat||!currentUser){
    showAppToast('Log opnieuw in en koppel Serenity.');
    return;
  }

  if(!technicalCloudReady){
    setHomeAssistantConnectionStatus(
      'Voer eerst de SQL van het technische dashboard 5.4.0 uit.',
      'warning'
    );
    return;
  }

  const config=readHomeAssistantLocalConfig();
  const secret=config.secret||randomHomeAssistantSecret();

  setHomeAssistantConnectionStatus(
    'Beveiligde Home Assistant-koppeling aanmaken…',
    'warning'
  );

  try{
    const {data,error}=await sb.rpc(
      'configure_home_assistant_integration',
      {
        p_boat_id:currentBoat.id,
        p_secret:secret
      }
    );

    if(error)throw error;

    config.secret=secret;
    saveHomeAssistantLocalConfig(config);

    homeAssistantStatusCache=data||{
      enabled:true,
      last_seen_at:null,
      field_count:0
    };

    openHomeAssistantSetupPanel();
    renderHomeAssistantConnectionStatus();
    updateHomeAssistantYaml();

    setHomeAssistantConnectionStatus(
      'Koppeling aangemaakt. Kopieer nu de configuratie naar Home Assistant.',
      'success'
    );
  }catch(error){
    console.error('Home Assistant-koppeling aanmaken mislukt:',error);

    setHomeAssistantConnectionStatus(
      homeAssistantSetupMissing(error)
        ?'Voer eerst SUPABASE_HOME_ASSISTANT_5_5_0.sql uit.'
        :error?.message||'Koppeling aanmaken is mislukt.',
      'error'
    );
  }
}

async function regenerateHomeAssistantSecret(){
  if(!confirm(
    'Een nieuwe sleutel maakt de oude Home Assistant-configuratie direct ongeldig. Doorgaan?'
  ))return;

  const config=readHomeAssistantLocalConfig();
  config.secret=randomHomeAssistantSecret();
  saveHomeAssistantLocalConfig(config);

  try{
    const {data,error}=await sb.rpc(
      'configure_home_assistant_integration',
      {
        p_boat_id:currentBoat.id,
        p_secret:config.secret
      }
    );

    if(error)throw error;

    homeAssistantStatusCache=data||homeAssistantStatusCache;
    fillHomeAssistantMappings();
    setHomeAssistantConnectionStatus(
      'Nieuwe sleutel aangemaakt. Vervang secrets.yaml in Home Assistant.',
      'success'
    );
  }catch(error){
    console.error('Home Assistant-sleutel vernieuwen mislukt:',error);
    setHomeAssistantConnectionStatus(
      error?.message||'Nieuwe sleutel opslaan is mislukt.',
      'error'
    );
  }
}

async function disableHomeAssistantConnection(){
  if(!confirm(
    'Home Assistant loskoppelen? De huidige geheime sleutel werkt daarna niet meer.'
  ))return;

  try{
    const {error}=await sb.rpc(
      'disable_home_assistant_integration',
      {p_boat_id:currentBoat.id}
    );

    if(error)throw error;

    localStorage.removeItem(homeAssistantLocalKey());
    homeAssistantStatusCache={
      enabled:false,
      last_seen_at:null,
      field_count:0
    };

    $('homeAssistantSetupPanel')?.classList.add('hidden');
    renderHomeAssistantConnectionStatus();
    renderTechnicalIntegrations();

    setHomeAssistantConnectionStatus(
      'Home Assistant is losgekoppeld.',
      'success'
    );
  }catch(error){
    console.error('Home Assistant loskoppelen mislukt:',error);
    setHomeAssistantConnectionStatus(
      error?.message||'Loskoppelen is mislukt.',
      'error'
    );
  }
}

function toggleHomeAssistantSecret(button){
  const input=$('homeAssistantSecretDisplay');
  if(!input)return;

  const show=input.type==='password';
  input.type=show?'text':'password';

  if(button)button.textContent=show?'Verberg':'Toon';
}

async function copyTextToClipboard(value){
  try{
    await navigator.clipboard.writeText(String(value||''));
    return true;
  }catch(error){
    console.warn('Kopiëren via clipboard mislukt:',error);

    const textarea=document.createElement('textarea');
    textarea.value=String(value||'');
    textarea.style.position='fixed';
    textarea.style.opacity='0';
    document.body.appendChild(textarea);
    textarea.select();

    const copied=document.execCommand('copy');
    textarea.remove();
    return copied;
  }
}

async function copyHomeAssistantSecret(){
  const secret=readHomeAssistantLocalConfig().secret;

  if(!secret){
    showAppToast('Maak eerst een koppeling aan.');
    return;
  }

  const copied=await copyTextToClipboard(secret);
  showAppToast(
    copied
      ?'Geheime Home Assistant-sleutel gekopieerd.'
      :'Kopiëren is niet gelukt.'
  );
}

async function copyHomeAssistantYaml(){
  const yaml=buildHomeAssistantYaml();
  const copied=await copyTextToClipboard(yaml);

  showAppToast(
    copied
      ?'Home Assistant-configuratie gekopieerd ✅'
      :'Kopiëren is niet gelukt.'
  );
}

function downloadHomeAssistantYaml(){
  const yaml=buildHomeAssistantYaml();
  const blob=new Blob([yaml],{type:'text/yaml;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');

  link.href=url;
  link.download='mijnserenity-home-assistant-5.5.0.yaml';
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function renderTechnicalIntegrations(){
  const container=$('technicalIntegrationList');
  if(!container)return;

  const integrations=technicalStateCache?.integrations||
    defaultTechnicalState().integrations;

  const status=mergeHomeAssistantStatus(
    homeAssistantStatusCache,
    homeAssistantStatusFromTechnicalState()
  );

  const haEnabled=Boolean(status.enabled);
  const haOnline=haEnabled&&(
    status.last_status==='connected'||
    homeAssistantIsRecentlyOnline(status.last_seen_at)
  );

  const haValue=haOnline
    ?'connected'
    :haEnabled
      ?'planned'
      :integrations.homeAssistant;

  const rows=[
    {
      icon:'🔷',
      title:'Victron',
      text:'Accu, walstroom, zonnepaneel en tanks',
      value:integrations.victron
    },
    {
      icon:'🏠',
      title:'Home Assistant',
      text:haOnline
        ?`Laatste sync ${homeAssistantDate(status.last_seen_at)}`
        :'Automatisering, meldingen en sensordata',
      value:haValue
    },
    {
      icon:'🛥️',
      title:'NMEA2000',
      text:'Motor, sensoren en navigatiegegevens',
      value:integrations.nmea2000
    }
  ];

  container.innerHTML=rows.map(row=>`
    <div class="technical-integration-row">
      <span>${row.icon}</span>
      <div>
        <b>${row.title}</b>
        <small>${row.text}</small>
      </div>
      <em class="${technicalIntegrationClass(row.value)}">
        ${technicalIntegrationLabel(row.value)}
      </em>
    </div>
  `).join('');

  renderHomeAssistantConnectionStatus();
}



function radarCameraLiveUrl(){
  const camera=radarCameraConfig();
  const base=normaliseRadarCameraUrl(
    camera.homeAssistantBaseUrl
  );
  const entity=String(camera.entityId||'').trim();
  const token=String(camera.accessToken||'').trim();

  if(!base||!entity||!token)return '';

  if(
    location.protocol==='https:'&&
    !base.toLowerCase().startsWith('https://')
  ){
    return '';
  }

  return `${base}/api/camera_proxy/${encodeURIComponent(entity)}?token=${encodeURIComponent(token)}`;
}

function radarCameraHasLiveConfig(){
  const camera=radarCameraConfig();

  return Boolean(
    normaliseRadarCameraUrl(camera.homeAssistantBaseUrl)&&
    String(camera.entityId||'').trim()
  );
}

function setLiveRadarCameraMessage(message,state=''){
  const element=$('liveRadarCameraMessage');
  if(!element)return;

  element.textContent=message||'';
  element.classList.toggle('hidden',!message);
  element.classList.remove('success','warning','error');

  if(state)element.classList.add(state);
}

function radarCameraTargetImages(){
  return [
    $('radarCameraImage'),
    $('liveRadarCameraImage')
  ].filter(Boolean);
}

function updateRadarLiveButtons(){
  const label=radarCameraLiveActive
    ?'⏹ Stop livebeeld'
    :'▶ Start livebeeld';

  if($('radarCameraLiveButton')){
    $('radarCameraLiveButton').textContent=label;
  }

  if($('liveRadarCameraToggleButton')){
    $('liveRadarCameraToggleButton').textContent=label;
  }
}

function stopRadarLiveRefreshTimer(){
  if(radarCameraLiveRefreshTimer){
    clearInterval(radarCameraLiveRefreshTimer);
    radarCameraLiveRefreshTimer=null;
  }
}


function stopRadarCameraFrameTimer(){
  if(radarCameraFrameTimer){
    clearTimeout(radarCameraFrameTimer);
    radarCameraFrameTimer=null;
  }
}

function radarCameraFrameTargets(){
  const targets=[];
  const technicalVisible=
    !$('technical')?.classList.contains('hidden');
  const liveVisible=
    !$('live')?.classList.contains('hidden');
  const fullscreenVisible=
    !$('radarCameraFullscreen')?.classList.contains('hidden');

  if(technicalVisible&&$('radarCameraImage')){
    targets.push({
      image:$('radarCameraImage'),
      placeholder:$('radarCameraPlaceholder'),
      loading:$('radarCameraLoading')
    });
  }

  if(liveVisible&&$('liveRadarCameraImage')){
    targets.push({
      image:$('liveRadarCameraImage'),
      placeholder:$('liveRadarCameraPlaceholder'),
      loading:$('liveRadarCameraLoading')
    });
  }

  if(fullscreenVisible&&$('radarCameraFullscreenImage')){
    targets.push({
      image:$('radarCameraFullscreenImage'),
      placeholder:null,
      loading:null
    });
  }

  return targets;
}

function scheduleRadarCameraNextFrame(delay=1000){
  stopRadarCameraFrameTimer();

  if(!radarCameraLiveActive)return;

  radarCameraFrameTimer=setTimeout(
    ()=>loadRadarCameraFrame(false),
    Math.max(700,Number(delay)||1000)
  );
}

function radarCameraFrameTimestamp(){
  return new Date().toLocaleTimeString(
    'nl-NL',
    {
      hour:'2-digit',
      minute:'2-digit',
      second:'2-digit'
    }
  );
}

function loadRadarCameraFrame(firstFrame=false){
  if(
    !radarCameraLiveActive||
    radarCameraFrameBusy
  )return;

  const baseUrl=radarCameraLiveUrl();
  const targets=radarCameraFrameTargets();

  if(!baseUrl){
    stopRadarLiveStream(false);
    setRadarCameraStatus(
      'De actuele cameratoegang ontbreekt. Voer rest_command.mijnserenity_camera_sync opnieuw uit.',
      'error'
    );
    setLiveRadarCameraMessage(
      'De actuele cameratoegang ontbreekt. Synchroniseer de camera opnieuw vanuit Home Assistant.',
      'error'
    );
    return;
  }

  if(!targets.length){
    scheduleRadarCameraNextFrame(1200);
    return;
  }

  radarCameraFrameBusy=true;

  if(firstFrame){
    targets.forEach(target=>{
      target.loading?.classList.remove('hidden');
    });
  }

  const frameUrl=
    `${baseUrl}${baseUrl.includes('?')?'&':'?'}_ms=${Date.now()}`;
  const probe=new Image();
  let settled=false;

  probe.referrerPolicy='no-referrer';

  const finish=(success)=>{
    if(settled)return;
    settled=true;
    clearTimeout(timeout);
    radarCameraFrameBusy=false;

    if(!radarCameraLiveActive)return;

    if(success){
      radarCameraFrameFailures=0;
      const now=radarCameraFrameTimestamp();

      targets.forEach(({image,placeholder,loading})=>{
        if(!image)return;

        image.referrerPolicy='no-referrer';
        image.src=frameUrl;
        image.dataset.streaming='true';
        image.classList.remove('hidden');
        placeholder?.classList.add('hidden');
        loading?.classList.add('hidden');
      });

      if($('radarCameraLastRefresh')){
        $('radarCameraLastRefresh').textContent=
          `Livebeeld ${now}`;
      }

      if($('liveRadarCameraStatusText')){
        $('liveRadarCameraStatusText').textContent=
          `Livebeeld ${now}`;
      }

      setRadarCameraStatus(
        'Live camerabeeld actief · ongeveer 1 beeld per seconde ✅',
        'success'
      );
      setLiveRadarCameraMessage(
        'Live camerabeeld actief · ongeveer 1 beeld per seconde ✅',
        'success'
      );

      scheduleRadarCameraNextFrame(1000);
      return;
    }

    radarCameraFrameFailures+=1;

    targets.forEach(({image,placeholder,loading})=>{
      loading?.classList.add('hidden');

      if(
        !image?.src||
        image.classList.contains('hidden')
      ){
        image?.classList.add('hidden');
        placeholder?.classList.remove('hidden');
      }
    });

    if(radarCameraFrameFailures>=2){
      setRadarCameraStatus(
        'Camerabeeld kon niet worden opgehaald. De verbinding en token zijn aanwezig, maar Home Assistant levert het beeld nog niet extern.',
        'error'
      );
      setLiveRadarCameraMessage(
        'Camerabeeld tijdelijk niet beschikbaar. MijnSerenity probeert automatisch opnieuw.',
        'error'
      );
    }

    scheduleRadarCameraNextFrame(
      radarCameraFrameFailures>=3?4000:1800
    );
  };

  const timeout=setTimeout(
    ()=>finish(false),
    12000
  );

  probe.onload=()=>finish(true);
  probe.onerror=()=>finish(false);
  probe.src=frameUrl;
}

function scheduleRadarLiveTokenRefresh(){
  stopRadarLiveRefreshTimer();

  if(!radarCameraLiveActive)return;

  radarCameraLiveRefreshTimer=setInterval(async()=>{
    const previousToken=radarCameraLiveToken;

    await loadTechnicalDashboard(true);

    const nextToken=String(
      radarCameraConfig().accessToken||''
    ).trim();

    if(
      radarCameraLiveActive&&
      nextToken&&
      nextToken!==previousToken
    ){
      radarCameraLiveToken=nextToken;
      radarCameraFrameFailures=0;
      loadRadarCameraFrame(true);
    }
  },4*60*1000);
}

function stopRadarLiveStream(showMessage=false){
  radarCameraLiveActive=false;
  radarCameraLiveToken='';
  radarCameraFrameBusy=false;
  radarCameraFrameFailures=0;

  stopRadarCameraFrameTimer();
  stopRadarLiveRefreshTimer();

  radarCameraTargetImages().forEach(image=>{
    if(image?.dataset?.streaming==='true'){
      image.dataset.streaming='false';
      image.classList.add('hidden');
    }
  });

  $('radarCameraLoading')?.classList.add('hidden');
  $('liveRadarCameraLoading')?.classList.add('hidden');

  updateRadarLiveButtons();
  renderRadarCamera();
  renderLiveRadarCamera();

  if(showMessage){
    setRadarCameraStatus(
      'Livebeeld gestopt.',
      'warning'
    );
    setLiveRadarCameraMessage(
      'Livebeeld gestopt.',
      'warning'
    );
  }
}

async function startRadarLiveStream(
  showMessage=true,
  forceRestart=false
){
  if(!technicalStateCache){
    technicalStateCache=readTechnicalLocalState();
  }

  let url=radarCameraLiveUrl();

  if(!url||forceRestart){
    await loadTechnicalDashboard(true);
    url=radarCameraLiveUrl();
  }

  if(!url){
    const camera=radarCameraConfig();
    const hasConfig=radarCameraHasLiveConfig();

    radarCameraLiveActive=false;
    updateRadarLiveButtons();
    renderRadarCamera();
    renderLiveRadarCamera();

    const message=!hasConfig
      ?'Vul bij Techniek de camera-entiteit en het externe Home Assistant HTTPS-adres in.'
      :location.protocol==='https:'&&
        !String(camera.homeAssistantBaseUrl||'')
          .toLowerCase().startsWith('https://')
        ?'Gebruik een extern HTTPS-adres van Home Assistant; een HTTP-adres wordt door de browser geblokkeerd.'
        :'Nog geen geldige cameratoegang ontvangen. Voer rest_command.mijnserenity_camera_sync in Home Assistant uit.';

    setRadarCameraStatus(message,'warning');
    setLiveRadarCameraMessage(message,'warning');
    return false;
  }

  radarCameraLiveActive=true;
  radarCameraLiveToken=String(
    radarCameraConfig().accessToken||''
  ).trim();
  radarCameraFrameFailures=0;
  radarCameraFrameBusy=false;

  stopRadarCameraFrameTimer();

  radarCameraFrameTargets().forEach(
    ({placeholder,loading})=>{
      placeholder?.classList.add('hidden');
      loading?.classList.remove('hidden');
    }
  );

  updateRadarLiveButtons();
  renderRadarCamera();
  renderLiveRadarCamera();
  scheduleRadarLiveTokenRefresh();

  if(showMessage){
    setRadarCameraStatus(
      'Live camerabeeld ophalen…',
      'warning'
    );
    setLiveRadarCameraMessage(
      'Live camerabeeld ophalen…',
      'warning'
    );
  }

  loadRadarCameraFrame(true);
  return true;
}

function toggleRadarLiveStream(showMessage=true){
  if(radarCameraLiveActive){
    stopRadarLiveStream(showMessage);
    return;
  }

  startRadarLiveStream(showMessage);
}

function renderLiveRadarCamera(){
  const url=radarCameraLiveUrl();
  const camera=radarCameraConfig();
  const badge=$('liveRadarCameraBadge');
  const placeholder=$('liveRadarCameraPlaceholder');
  const image=$('liveRadarCameraImage');

  if(badge){
    badge.className='radar-camera-badge '+
      (radarCameraLiveActive
        ?'live'
        :url
          ?'ready'
          :'offline');

    badge.textContent=radarCameraLiveActive
      ?'● Live'
      :url
        ?'Live beschikbaar'
        :'Niet beschikbaar';
  }

  if($('liveRadarCameraSource')){
    $('liveRadarCameraSource').textContent=url
      ?'Bron: Home Assistant camera · 1 beeld/sec.'
      :camera.snapshotUrl
        ?'Bron: reserve-snapshot'
        :'Bron: Home Assistant';
  }

  if(!radarCameraLiveActive){
    image?.classList.add('hidden');
    placeholder?.classList.remove('hidden');
  }

  updateRadarLiveButtons();
}

document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    stopRadarLiveStream(false);
    return;
  }

  const liveVisible=
    !$('live')?.classList.contains('hidden');

  if(liveVisible&&radarCameraLiveUrl()){
    startRadarLiveStream(false);
  }
});

function radarCameraRandomFilename(){
  const bytes=new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const suffix=[...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');
  return `mijnserenity-radarbeugel-${suffix}.jpg`;
}

function normaliseRadarCameraUrl(value){
  const url=String(value||'').trim();
  if(!url)return '';
  return url.replace(/\/+$/,'');
}

function radarCameraConfig(){
  const state=technicalStateCache||defaultTechnicalState();
  return {
    ...defaultTechnicalState().camera,
    ...(state.camera||{})
  };
}

function radarCameraImageUrl(){
  const camera=radarCameraConfig();
  const direct=String(camera.snapshotUrl||'').trim();
  if(direct)return direct;
  const base=normaliseRadarCameraUrl(camera.homeAssistantBaseUrl);
  const filename=String(camera.filename||'').trim();
  if(!base||!filename)return '';
  return `${base}/local/${encodeURIComponent(filename)}`;
}

function radarCameraCacheBustedUrl(){
  const url=radarCameraImageUrl();
  if(!url)return '';
  return `${url}${url.includes('?')?'&':'?'}_ms=${Date.now()}`;
}

function setRadarCameraStatus(message,state=''){
  const element=$('radarCameraStatus');
  if(!element)return;
  element.textContent=message||'';
  element.classList.toggle('hidden',!message);
  element.classList.remove('success','warning','error');
  if(state)element.classList.add(state);
}

function radarCameraAutomationYaml(){
  const camera=radarCameraConfig();
  const entity=String(
    $('radarCameraEntity')?.value||
    camera.entityId||
    ''
  ).trim();
  const base=normaliseRadarCameraUrl(
    $('radarCameraHaBaseUrl')?.value||
    camera.homeAssistantBaseUrl
  );

  if(!entity||!base){
    return '# Vul eerst de Home Assistant camera-entiteit en het externe HTTPS-adres in.';
  }

  const safeEntity=entity.replace(/'/g,"''");
  const safeBase=JSON.stringify(base);
  const boatId=currentBoat?.id||'BOOT_ID_ONTBREEKT';

  return `# ============================================================
# MIJNSERENITY 5.6.0 — LIVE CAMERA RADARBEUGEL
# ============================================================

# A. configuration.yaml
# Plak dit ONDER de bestaande regel rest_command:
# dus met precies twee spaties vóór mijnserenity_camera_sync.

  mijnserenity_camera_sync:
    url: !secret mijnserenity_rpc_url
    method: post
    content_type: "application/json"
    headers:
      apikey: !secret mijnserenity_supabase_key
      Authorization: !secret mijnserenity_authorization
      x-mijnserenity-secret: !secret mijnserenity_secret
    payload: >-
      {
        "p_boat_id": "${boatId}",
        "p_payload": {
          "camera_entity": ${JSON.stringify(entity)},
          "camera_base_url": ${safeBase},
          "camera_access_token": {{ (state_attr('${safeEntity}', 'access_token') if state_attr('${safeEntity}', 'access_token') else none) | to_json }}
        }
      }

# B. automations.yaml
# Plak dit als nieuwe automatisering helemaal onderaan.

- id: mijnserenity_live_camera_synchroniseren
  alias: MijnSerenity live camera synchroniseren
  description: Vernieuwt de kort geldige cameratoegang voor MijnSerenity.
  mode: restart
  triggers:
    - trigger: homeassistant
      event: start
    - trigger: time_pattern
      minutes: "/4"
  conditions: []
  actions:
    - action: rest_command.mijnserenity_camera_sync
`;
}

function updateRadarCameraAutomationYaml(){
  const element=$('radarCameraAutomationYaml');
  if(element)element.value=radarCameraAutomationYaml();
}

function fillRadarCameraSettings(){
  const camera=radarCameraConfig();
  if(!camera.filename){
    camera.filename=radarCameraRandomFilename();
    technicalStateCache.camera=camera;
    saveTechnicalLocalState(technicalStateCache);
  }
  const set=(id,value)=>{if($(id))$(id).value=value??'';};
  set('radarCameraName',camera.name||'Camera radarbeugel');
  set('radarCameraRefreshSeconds',String(camera.refreshSeconds??30));
  set('radarCameraSnapshotUrl',camera.snapshotUrl||'');
  set('radarCameraEntity',camera.entityId||'');
  set('radarCameraHaBaseUrl',camera.homeAssistantBaseUrl||'');
  set('radarCameraFilename',camera.filename||radarCameraRandomFilename());
  updateRadarCameraAutomationYaml();
}

function toggleRadarCameraSettings(force){
  const panel=$('radarCameraSettings');
  if(!panel)return;
  const show=typeof force==='boolean'?force:panel.classList.contains('hidden');
  panel.classList.toggle('hidden',!show);
  if(show){
    fillRadarCameraSettings();
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  }
}

async function saveRadarCameraSettings(){
  technicalStateCache=normaliseTechnicalState(
    technicalStateCache||
    readTechnicalLocalState()
  );

  const entityId=String(
    $('radarCameraEntity')?.value||''
  ).trim();
  const homeAssistantBaseUrl=normaliseRadarCameraUrl(
    $('radarCameraHaBaseUrl')?.value
  );
  const snapshotUrl=String(
    $('radarCameraSnapshotUrl')?.value||''
  ).trim();

  const camera={
    ...technicalStateCache.camera,
    name:String(
      $('radarCameraName')?.value||
      'Camera radarbeugel'
    ).trim()||'Camera radarbeugel',
    snapshotUrl,
    entityId,
    homeAssistantBaseUrl,
    filename:String(
      $('radarCameraFilename')?.value||''
    ).trim()||radarCameraRandomFilename(),
    refreshSeconds:Number(
      $('radarCameraRefreshSeconds')?.value||30
    ),
    enabled:Boolean(
      snapshotUrl||
      (
        homeAssistantBaseUrl&&
        entityId
      )
    ),
    liveEnabled:Boolean(
      homeAssistantBaseUrl&&
      entityId
    )
  };

  technicalStateCache.camera=camera;

  await persistTechnicalState(
    'Instellingen van de radarbeugelcamera opgeslagen.'
  );

  toggleRadarCameraSettings(false);
  renderRadarCamera();
  renderLiveRadarCamera();

  if(radarCameraLiveUrl()){
    startRadarLiveStream(true,true);
  }else if(snapshotUrl){
    refreshRadarCamera(true);
  }else{
    setRadarCameraStatus(
      'Camera opgeslagen. Voeg nu de live-configuratie toe aan Home Assistant en voer de camera-sync uit.',
      'warning'
    );
  }

  showAppToast('Camera radarbeugel opgeslagen ✅');
}

function renderRadarCamera(){
  const camera=radarCameraConfig();
  const liveUrl=radarCameraLiveUrl();
  const snapshotUrl=radarCameraImageUrl();
  const badge=$('radarCameraBadge');
  const source=$('radarCameraSource');
  const last=$('radarCameraLastRefresh');
  const placeholder=$('radarCameraPlaceholder');
  const image=$('radarCameraImage');

  if(badge){
    badge.className='radar-camera-badge '+
      (radarCameraLiveActive
        ?'live'
        :liveUrl
          ?'ready'
          :snapshotUrl
            ?'snapshot'
            :'offline');

    badge.textContent=radarCameraLiveActive
      ?'● Live'
      :liveUrl
        ?'Live beschikbaar'
        :snapshotUrl
          ?'Reservebeeld'
          :'Niet ingesteld';
  }

  if(source){
    source.textContent=radarCameraLiveActive
      ?'Bron: Home Assistant camera · 1 beeld/sec.'
      :liveUrl
        ?'Bron: Home Assistant cameratoegang beschikbaar'
        :camera.snapshotUrl
          ?'Bron: directe snapshot'
          :'Bron: Home Assistant snapshot';
  }

  if(last&&!radarCameraLiveActive){
    last.textContent=camera.tokenUpdatedAt
      ?`Cameratoegang bijgewerkt ${new Date(camera.tokenUpdatedAt).toLocaleTimeString('nl-NL',{
          hour:'2-digit',
          minute:'2-digit'
        })}`
      :camera.lastRefreshAt
        ?`Momentopname ${new Date(camera.lastRefreshAt).toLocaleTimeString('nl-NL',{
            hour:'2-digit',
            minute:'2-digit',
            second:'2-digit'
          })}`
        :'Nog niet verbonden';
  }

  if(!radarCameraLiveActive){
    placeholder?.classList.toggle(
      'hidden',
      Boolean(snapshotUrl)
    );

    if(!snapshotUrl){
      image?.classList.add('hidden');
    }
  }

  updateRadarLiveButtons();
  scheduleRadarCameraRefresh();
}

function scheduleRadarCameraRefresh(){
  if(radarCameraRefreshTimer){
    clearInterval(radarCameraRefreshTimer);
    radarCameraRefreshTimer=null;
  }

  const camera=radarCameraConfig();
  const seconds=Number(camera.refreshSeconds||0);
  const technicalVisible=
    !$('technical')?.classList.contains('hidden');

  if(
    radarCameraLiveActive||
    !technicalVisible||
    !radarCameraImageUrl()||
    seconds<=0
  )return;

  radarCameraRefreshTimer=setInterval(
    ()=>refreshRadarCamera(false),
    Math.max(10,seconds)*1000
  );
}

function refreshRadarCamera(showMessage=false){
  const url=radarCameraCacheBustedUrl();
  const image=$('radarCameraImage');
  const loading=$('radarCameraLoading');
  const placeholder=$('radarCameraPlaceholder');

  if(!url){
    setRadarCameraStatus(
      radarCameraHasLiveConfig()
        ?'Live camera is ingesteld. Voer eerst de Home Assistant camera-sync uit voor een actuele toegang.'
        :'Stel eerst de camera-entiteit en het externe Home Assistant-adres in.',
      'warning'
    );
    toggleRadarCameraSettings(true);
    return;
  }

  if(radarCameraLiveActive){
    stopRadarLiveStream(false);
  }

  loading?.classList.remove('hidden');

  if(showMessage){
    setRadarCameraStatus(
      'Reserve-momentopname laden…',
      'warning'
    );
  }

  const probe=new Image();

  probe.onload=()=>{
    if(image){
      image.src=url;
      image.classList.remove('hidden');
      image.dataset.streaming='false';
    }

    placeholder?.classList.add('hidden');
    loading?.classList.add('hidden');

    technicalStateCache=normaliseTechnicalState(
      technicalStateCache||
      readTechnicalLocalState()
    );

    technicalStateCache.camera={
      ...technicalStateCache.camera,
      lastRefreshAt:new Date().toISOString()
    };

    saveTechnicalLocalState(technicalStateCache);
    renderRadarCamera();

    if(showMessage){
      setRadarCameraStatus(
        'Reservebeeld geladen ✅',
        'success'
      );
    }
  };

  probe.onerror=()=>{
    loading?.classList.add('hidden');

    if(image)image.classList.add('hidden');

    placeholder?.classList.remove('hidden');

    setRadarCameraStatus(
      'Reservebeeld kon niet worden geladen. Start livebeeld of controleer de snapshotinstellingen.',
      'error'
    );
  };

  probe.src=url;
}

function openRadarCameraFullscreen(preferLive=false){
  const liveUrl=radarCameraLiveUrl();
  const snapshotUrl=radarCameraImageUrl();
  const overlay=$('radarCameraFullscreen');
  const image=$('radarCameraFullscreenImage');
  const caption=$('radarCameraFullscreenCaption');

  if(!liveUrl&&!snapshotUrl){
    captainNavigate('technical');
    toggleRadarCameraSettings(true);
    return;
  }

  overlay?.classList.remove('hidden');
  document.body.style.overflow='hidden';

  if(caption){
    caption.textContent=liveUrl
      ?`${radarCameraConfig().name||'Camera radarbeugel'} · LIVE 1 BEELD/SEC.`
      :radarCameraConfig().name||'Camera radarbeugel';
  }

  if(liveUrl&&preferLive){
    if(!radarCameraLiveActive){
      startRadarLiveStream(false);
    }else{
      loadRadarCameraFrame(true);
    }
    return;
  }

  if(image&&snapshotUrl){
    image.referrerPolicy='no-referrer';
    image.src=
      `${snapshotUrl}${snapshotUrl.includes('?')?'&':'?'}_ms=${Date.now()}`;
  }
}

function closeRadarCameraFullscreen(event,force=false){
  if(
    !force&&
    event?.target?.id!=='radarCameraFullscreen'
  )return;

  const image=$('radarCameraFullscreenImage');

  if(image)image.removeAttribute('src');

  $('radarCameraFullscreen')?.classList.add('hidden');
  document.body.style.overflow='';
}

async function copyRadarCameraAutomation(){
  updateRadarCameraAutomationYaml();

  const yaml=$('radarCameraAutomationYaml')?.value||'';
  const copied=await copyTextToClipboard(yaml);

  showAppToast(
    copied
      ?'Live-camera configuratie gekopieerd ✅'
      :'Kopiëren is niet gelukt.'
  );
}

function regenerateRadarCameraFilename(){
  if($('radarCameraFilename'))$('radarCameraFilename').value=radarCameraRandomFilename();
  updateRadarCameraAutomationYaml();
  setRadarCameraStatus('Nieuwe willekeurige bestandsnaam gemaakt. Kopieer de camera-automatisering opnieuw.','warning');
}

function renderTechnicalEvents(){
  const container=$('technicalEventList');
  if(!container)return;

  const query=String($('technicalEventSearch')?.value||'')
    .toLowerCase()
    .trim();
  const category=$('technicalEventFilter')?.value||'';

  const filtered=[...(technicalEventsCache||[])]
    .filter(event=>{
      if(category&&event.category!==category)return false;

      const haystack=[
        event.title,
        event.category,
        event.notes,
        event.event_date,
        event.engine_hours
      ].join(' ').toLowerCase();

      return !query||haystack.includes(query);
    })
    .sort((a,b)=>{
      const aDate=new Date(
        `${a.event_date||'1900-01-01'}T12:00:00`
      ).getTime();
      const bDate=new Date(
        `${b.event_date||'1900-01-01'}T12:00:00`
      ).getTime();

      return bDate-aDate||
        new Date(b.created_at||0).getTime()-
        new Date(a.created_at||0).getTime();
    });

  container.innerHTML=filtered.length
    ?filtered.map(event=>`
      <article class="technical-event-item">
        <div class="technical-event-date">
          <strong>${esc(
            new Date(`${event.event_date}T12:00:00`)
              .toLocaleDateString('nl-NL',{
                day:'2-digit',
                month:'short'
              })
          )}</strong>
          <small>${esc(event.category||'Log')}</small>
        </div>
        <div class="technical-event-copy">
          <strong>${esc(event.title||'Technisch logitem')}</strong>
          <small>
            ${Number.isFinite(Number(event.engine_hours))
              ?`${technicalNumber(event.engine_hours,1)} motoruren`
              :'Geen motoruren'}
          </small>
          ${event.notes?`<p>${esc(event.notes)}</p>`:''}
        </div>
        <button type="button" class="record-delete-mini"
          onclick="deleteTechnicalEvent('${event.id}')"
          aria-label="Technisch logitem verwijderen">🗑️</button>
      </article>
    `).join('')
    :'<span class="small">Nog geen technische logitems met deze selectie.</span>';
}

function renderTechnicalDashboard(){
  if(!technicalStateCache){
    technicalStateCache=readTechnicalLocalState();
  }

  const state=technicalStateCache;
  const health=technicalHealth();
  const badge=$('technicalHealthBadge');

  if(badge){
    badge.className=`technical-health-badge ${health.level}`;
    badge.textContent=health.label;
  }

  if($('dashboardTechnicalStatus')){
    $('dashboardTechnicalStatus').textContent=health.dashboard;
  }

  $('techEngineHours').textContent=
    technicalNumber(state.engineHours,1)||'0,0';

  const engineTasks=(state.maintenance||[])
    .map(task=>({task,status:technicalTaskStatus(task)}))
    .filter(item=>item.task.category==='Motor')
    .sort((a,b)=>{
      const priority={critical:0,warning:1,good:2};
      return priority[a.status.level]-priority[b.status.level];
    });

  $('techEngineService').textContent=engineTasks[0]
    ?`${engineTasks[0].task.title}: ${engineTasks[0].status.label}`
    :'Nog geen motoronderhoud';

  const lastEngineUpdate=state.lastEngineHoursUpdate;
  const autoText=lastEngineUpdate?.updatedAt
    ?(
      lastEngineUpdate.type==='baseline'
        ?'Bestaande vaart als uitgangspunt geregistreerd'
        :lastEngineUpdate.type==='deleted-trip'
          ?`${technicalEngineHoursText(Math.abs(lastEngineUpdate.deltaHours||0))} afgetrokken`
          :`${Number(lastEngineUpdate.deltaHours||0)>=0?'+':'−'}${technicalEngineHoursText(Math.abs(lastEngineUpdate.deltaHours||0))} via logboek`
    )
    :'Vaartijd wordt automatisch bijgeteld';

  if($('techEngineAutoUpdate')){
    $('techEngineAutoUpdate').textContent=autoText;
  }

  if($('technicalLastEngineUpdate')){
    $('technicalLastEngineUpdate').textContent=lastEngineUpdate?.updatedAt
      ?`${lastEngineUpdate.title||'Vaartocht'} · ${formatAccountDate(lastEngineUpdate.updatedAt)}`
      :'Nog geen vaart verwerkt';
  }

  const houseStatus=technicalBatteryStatus(
    state.houseVoltage,
    state.batteryType
  );
  const startStatus=technicalBatteryStatus(
    state.startVoltage,
    'lead'
  );

  $('techHouseVoltage').textContent=
    technicalNumber(state.houseVoltage,2)
      ?`${technicalNumber(state.houseVoltage,2)} V`
      :'– V';
  $('techHouseBatteryStatus').textContent=houseStatus.label;

  $('techStartVoltage').textContent=
    technicalNumber(state.startVoltage,2)
      ?`${technicalNumber(state.startVoltage,2)} V`
      :'– V';
  $('techStartBatteryStatus').textContent=startStatus.label;

  $('techFuelLevel').textContent=technicalPercent(state.fuelPct);
  const fuelPct=technicalClampPercent(state.fuelPct);
  const capacity=Number(state.fuelCapacity||settingsCache?.tank_capacity||0);

  $('techFuelLiters').textContent=(
    fuelPct!==null&&capacity>0
  )
    ?`circa ${technicalNumber(capacity*fuelPct/100,0)} van ${technicalNumber(capacity,0)} liter`
    :capacity>0
      ?`${technicalNumber(capacity,0)} liter tank`
      :'Inhoud onbekend';

  $('techWaterLevel').textContent=technicalPercent(state.waterPct);
  $('techWasteLevel').textContent=technicalPercent(state.wastePct);
  $('techWasteStatus').textContent=
    Number(state.wastePct)>=75
      ?'Legen aanbevolen'
      :'Beschikbare ruimte';

  $('techSolarPower').textContent=
    technicalNumber(state.solarPower,0)
      ?`${technicalNumber(state.solarPower,0)} W`
      :'– W';
  $('techShorePowerStatus').textContent=state.shorePower
    ?'Walstroom aangesloten'
    :'Geen walstroom gemeld';

  $('techHeaterStatus').textContent={
    unknown:'Onbekend',
    off:'Uit',
    running:'In bedrijf',
    service:'Onderhoud',
    fault:'Storing'
  }[state.heater]||'Onbekend';

  $('techBilgeStatus').textContent={
    unknown:'Bilge onbekend',
    ok:'Bilgepomp in orde',
    active:'Bilgepomp actief',
    alarm:'Bilge-alarm'
  }[state.bilge]||'Bilge onbekend';

  renderRadarCamera();
  renderTechnicalAlerts();
  renderTechnicalMaintenance();
  renderTechnicalIntegrations();
  renderTechnicalEvents();
  if(typeof renderEntertainmentPage==='function'){
    renderEntertainmentPage();
  }
  if(typeof renderLiveTechnicalStrip==='function'){
    renderLiveTechnicalStrip();
  }
}

function fillTechnicalSnapshotForm(){
  const state=technicalStateCache||defaultTechnicalState();

  const setValue=(id,value)=>{
    if($(id))$(id).value=value??'';
  };

  setValue('techInputEngineHours',state.engineHours);
  setValue('techInputEngineTemp',state.engineTemp);
  setValue('techInputOilPressure',state.oilPressure);
  setValue('techInputCoolantLevel',state.coolantLevel||'unknown');
  setValue('techInputBatteryType',state.batteryType||'lead');
  setValue('techInputHouseVoltage',state.houseVoltage);
  setValue('techInputStartVoltage',state.startVoltage);
  setValue('techInputSolarPower',state.solarPower);
  setValue('techInputFuelPct',state.fuelPct);
  setValue('techInputWaterPct',state.waterPct);
  setValue('techInputWastePct',state.wastePct);
  setValue('techInputFuelCapacity',
    state.fuelCapacity||settingsCache?.tank_capacity||'');
  setValue('techInputHeater',state.heater||'unknown');
  setValue('techInputBilge',state.bilge||'unknown');
  setValue('techInputVictron',
    state.integrations?.victron||'not_configured');
  setValue('techInputHomeAssistant',
    state.integrations?.homeAssistant||'planned');
  setValue('techInputNmea',
    state.integrations?.nmea2000||'planned');
  setValue('techInputNotes',state.notes||'');

  if($('techInputShorePower')){
    $('techInputShorePower').checked=Boolean(state.shorePower);
  }
}

function openTechnicalSnapshotForm(section=''){
  fillTechnicalSnapshotForm();
  $('technicalSnapshotCard')?.classList.remove('hidden');

  if(section){
    const target=document.querySelector(
      `.technical-form-section[data-tech-section="${section}"]`
    );
    target?.scrollIntoView({
      behavior:'smooth',
      block:'center'
    });
  }else{
    $('technicalSnapshotCard')?.scrollIntoView({
      behavior:'smooth',
      block:'start'
    });
  }
}

function closeTechnicalSnapshotForm(){
  $('technicalSnapshotCard')?.classList.add('hidden');
}

function technicalInputNumber(id){
  const value=String($(id)?.value||'').trim();
  if(value==='')return null;

  const number=Number(value);
  return Number.isFinite(number)?number:null;
}


function technicalRoundHours(value){
  const number=Number(value);
  if(!Number.isFinite(number)||number<=0)return 0;
  return Math.round(number*100)/100;
}

function technicalEngineHoursText(value){
  return `${technicalNumber(value,2)||'0'} uur`;
}

async function refreshTechnicalStateBeforeEngineUpdate(){
  if(!currentBoat)return;

  if(!technicalStateCache){
    technicalStateCache=readTechnicalLocalState();
  }

  if(!technicalCloudReady)return;

  try{
    const {data,error}=await sb.from('technical_state')
      .select('data,updated_at')
      .eq('boat_id',currentBoat.id)
      .maybeSingle();

    if(error)throw error;

    if(data?.data){
      technicalStateCache=normaliseTechnicalState({
        ...data.data,
        updatedAt:data.updated_at||
          data.data.updatedAt||
          null
      });
      saveTechnicalLocalState(technicalStateCache);
    }
  }catch(error){
    console.warn(
      'Laatste technische status voor motoruren kon niet worden opgehaald:',
      error
    );
  }
}

async function applyTripDurationToEngineHours({
  tripId,
  durationHours,
  title='Vaartocht',
  tripDate='',
  isNewTrip=false
}={}){
  const id=String(tripId||'').trim();
  const hours=technicalRoundHours(durationHours);

  if(!id||!hours){
    return {
      applied:false,
      delta:0,
      reason:'Geen geldige vaartijd'
    };
  }

  try{
    await refreshTechnicalStateBeforeEngineUpdate();

    technicalStateCache=normaliseTechnicalState(
      technicalStateCache||readTechnicalLocalState()
    );

    const tracked={
      ...(technicalStateCache.countedTripHours||{})
    };
    const alreadyTracked=Object.prototype.hasOwnProperty.call(
      tracked,
      id
    );

    // Bestaande logboeken van vóór 5.4.2 worden als uitgangspunt vastgelegd.
    // Zo worden oude motoruren bij een latere bewerking niet dubbel opgeteld.
    if(!alreadyTracked&&!isNewTrip){
      tracked[id]=hours;
      technicalStateCache.countedTripHours=tracked;
      technicalStateCache.lastEngineHoursUpdate={
        tripId:id,
        title,
        tripDate:tripDate||technicalToday(),
        durationHours:hours,
        deltaHours:0,
        engineHours:Number(technicalStateCache.engineHours||0),
        type:'baseline',
        updatedAt:new Date().toISOString()
      };

      await persistTechnicalState(
        'Bestaande vaartocht als motoruren-uitgangspunt geregistreerd.'
      );

      renderTechnicalDashboard();

      return {
        applied:false,
        baseline:true,
        delta:0,
        engineHours:Number(technicalStateCache.engineHours||0)
      };
    }

    const previousTripHours=alreadyTracked
      ?technicalRoundHours(tracked[id])
      :0;
    const delta=Math.round((hours-previousTripHours)*100)/100;

    if(Math.abs(delta)<.005){
      return {
        applied:false,
        delta:0,
        engineHours:Number(technicalStateCache.engineHours||0),
        reason:'Vaartijd was al verwerkt'
      };
    }

    const previousEngineHours=Number(
      technicalStateCache.engineHours||0
    );
    const newEngineHours=Math.max(
      0,
      Math.round((previousEngineHours+delta)*100)/100
    );

    tracked[id]=hours;

    technicalStateCache={
      ...technicalStateCache,
      engineHours:newEngineHours,
      countedTripHours:tracked,
      lastEngineHoursUpdate:{
        tripId:id,
        title,
        tripDate:tripDate||technicalToday(),
        durationHours:hours,
        previousTripHours,
        deltaHours:delta,
        previousEngineHours,
        engineHours:newEngineHours,
        type:alreadyTracked?'correction':'new-trip',
        updatedAt:new Date().toISOString()
      }
    };

    await persistTechnicalState(
      delta>0
        ?`Motoruren automatisch met ${technicalEngineHoursText(delta)} verhoogd.`
        :`Motoruren automatisch met ${technicalEngineHoursText(Math.abs(delta))} gecorrigeerd.`
    );

    await createTechnicalEvent({
      category:'Vaartijd',
      title:alreadyTracked
        ?'Motoruren gecorrigeerd na wijziging vaartocht'
        :'Motoruren automatisch bijgewerkt',
      event_date:tripDate||technicalToday(),
      engine_hours:newEngineHours,
      value:delta,
      unit:'uur',
      notes:[
        title,
        `Geregistreerde vaartijd: ${technicalEngineHoursText(hours)}.`,
        alreadyTracked
          ?`Eerder verwerkt: ${technicalEngineHoursText(previousTripHours)}.`
          :'Nieuwe vaartocht automatisch verwerkt.',
        `Motoruren: ${technicalEngineHoursText(previousEngineHours)} → ${technicalEngineHoursText(newEngineHours)}.`
      ].join('\n')
    },{
      silent:true
    });

    renderTechnicalDashboard();

    return {
      applied:true,
      delta,
      engineHours:newEngineHours,
      previousEngineHours
    };
  }catch(error){
    console.error(
      'Vaartijd automatisch bij motoruren optellen mislukt:',
      error
    );

    return {
      applied:false,
      delta:0,
      error
    };
  }
}

async function removeTripDurationFromEngineHours({
  tripId,
  title='Vaartocht'
}={}){
  const id=String(tripId||'').trim();
  if(!id)return {applied:false,delta:0};

  try{
    await refreshTechnicalStateBeforeEngineUpdate();

    technicalStateCache=normaliseTechnicalState(
      technicalStateCache||readTechnicalLocalState()
    );

    const tracked={
      ...(technicalStateCache.countedTripHours||{})
    };

    if(!Object.prototype.hasOwnProperty.call(tracked,id)){
      return {applied:false,delta:0};
    }

    const hours=technicalRoundHours(tracked[id]);
    delete tracked[id];

    if(!hours){
      technicalStateCache.countedTripHours=tracked;
      await persistTechnicalState(
        'Verwijderde vaartocht uit motorurenregistratie gehaald.'
      );
      return {applied:false,delta:0};
    }

    const previousEngineHours=Number(
      technicalStateCache.engineHours||0
    );
    const newEngineHours=Math.max(
      0,
      Math.round((previousEngineHours-hours)*100)/100
    );

    technicalStateCache={
      ...technicalStateCache,
      engineHours:newEngineHours,
      countedTripHours:tracked,
      lastEngineHoursUpdate:{
        tripId:id,
        title,
        durationHours:hours,
        deltaHours:-hours,
        previousEngineHours,
        engineHours:newEngineHours,
        type:'deleted-trip',
        updatedAt:new Date().toISOString()
      }
    };

    await persistTechnicalState(
      `Motoruren na verwijderen van de vaartocht met ${technicalEngineHoursText(hours)} gecorrigeerd.`
    );

    await createTechnicalEvent({
      category:'Vaartijd',
      title:'Motoruren gecorrigeerd na verwijderen vaartocht',
      event_date:technicalToday(),
      engine_hours:newEngineHours,
      value:-hours,
      unit:'uur',
      notes:[
        title,
        `Verwerkte vaartijd verwijderd: ${technicalEngineHoursText(hours)}.`,
        `Motoruren: ${technicalEngineHoursText(previousEngineHours)} → ${technicalEngineHoursText(newEngineHours)}.`
      ].join('\n')
    },{
      silent:true
    });

    renderTechnicalDashboard();

    return {
      applied:true,
      delta:-hours,
      engineHours:newEngineHours
    };
  }catch(error){
    console.error(
      'Motoruren na verwijderen vaartocht corrigeren mislukt:',
      error
    );
    return {applied:false,delta:0,error};
  }
}

async function persistTechnicalState(message='Technische gegevens opgeslagen.'){
  technicalStateCache=normaliseTechnicalState({
    ...technicalStateCache,
    updatedAt:new Date().toISOString()
  });

  saveTechnicalLocalState(technicalStateCache);
  renderTechnicalDashboard();

  if(!technicalCloudReady){
    setTechnicalSyncStatus(
      `${message} Lokaal bewaard; voer de SQL-installatie uit voor delen met Desi.`,
      'warning'
    );
    return false;
  }

  const {error}=await sb.from('technical_state').upsert({
    boat_id:currentBoat.id,
    updated_by:currentUser.id,
    data:technicalStateCache,
    updated_at:new Date().toISOString()
  },{
    onConflict:'boat_id'
  });

  if(error){
    console.error('Technische status opslaan mislukt:',error);

    if(technicalTableMissing(error)){
      technicalCloudReady=false;
    }

    setTechnicalSyncStatus(
      `${message} Lokaal bewaard; cloud synchronisatie is niet gelukt.`,
      'warning'
    );
    return false;
  }

  setTechnicalSyncStatus(
    `${message} Gedeeld met Desi ✅`,
    'success'
  );
  return true;
}

async function saveTechnicalSnapshot(){
  const button=document.querySelector(
    '#technicalSnapshotCard button[onclick="saveTechnicalSnapshot()"]'
  );
  if(button)button.disabled=true;

  try{
    const previousHours=Number(technicalStateCache?.engineHours||0);
    const engineHours=technicalInputNumber('techInputEngineHours')??0;

    technicalStateCache=normaliseTechnicalState({
      ...technicalStateCache,
      engineHours,
      engineTemp:technicalInputNumber('techInputEngineTemp'),
      oilPressure:technicalInputNumber('techInputOilPressure'),
      coolantLevel:$('techInputCoolantLevel')?.value||'unknown',
      batteryType:$('techInputBatteryType')?.value||'lead',
      houseVoltage:technicalInputNumber('techInputHouseVoltage'),
      startVoltage:technicalInputNumber('techInputStartVoltage'),
      solarPower:technicalInputNumber('techInputSolarPower'),
      shorePower:Boolean($('techInputShorePower')?.checked),
      fuelPct:technicalClampPercent(
        technicalInputNumber('techInputFuelPct')
      ),
      waterPct:technicalClampPercent(
        technicalInputNumber('techInputWaterPct')
      ),
      wastePct:technicalClampPercent(
        technicalInputNumber('techInputWastePct')
      ),
      fuelCapacity:technicalInputNumber('techInputFuelCapacity'),
      heater:$('techInputHeater')?.value||'unknown',
      bilge:$('techInputBilge')?.value||'unknown',
      integrations:{
        victron:$('techInputVictron')?.value||'not_configured',
        homeAssistant:$('techInputHomeAssistant')?.value||'planned',
        nmea2000:$('techInputNmea')?.value||'planned'
      },
      notes:String($('techInputNotes')?.value||'').trim(),
      lastSnapshotAt:new Date().toISOString()
    });

    await persistTechnicalState('Technische momentopname opgeslagen.');

    const changes=[];

    if(engineHours!==previousHours){
      changes.push(
        `Motoruren ${technicalNumber(previousHours,1)} → ${technicalNumber(engineHours,1)}`
      );
    }

    const warnings=technicalWarnings();

    await createTechnicalEvent({
      category:'Metingen',
      title:'Technische momentopname',
      event_date:technicalToday(),
      engine_hours:engineHours,
      notes:[
        changes.join(' · '),
        warnings.length
          ?`${warnings.length} aandachtspunt${warnings.length===1?'':'en'} gedetecteerd.`
          :'Geen actieve waarschuwingen.',
        technicalStateCache.notes||''
      ].filter(Boolean).join('\n')
    },{
      silent:true
    });

    closeTechnicalSnapshotForm();
    showAppToast('Technische momentopname opgeslagen ✅');
  }catch(error){
    console.error('Technische momentopname opslaan mislukt:',error);
    setTechnicalSyncStatus(
      error?.message||'Technische gegevens opslaan is mislukt.',
      'error'
    );
  }finally{
    if(button)button.disabled=false;
  }
}

function toggleTechnicalTaskForm(force){
  const form=$('technicalTaskForm');
  if(!form)return;

  const show=typeof force==='boolean'
    ?force
    :form.classList.contains('hidden');

  form.classList.toggle('hidden',!show);

  if(show){
    $('technicalTaskTitle')?.focus();
  }
}

async function addTechnicalTask(){
  const title=String($('technicalTaskTitle')?.value||'').trim();
  if(!title){
    alert('Vul een onderhoudstaak in.');
    return;
  }

  const intervalMonths=Math.max(
    0,
    Number($('technicalTaskMonths')?.value||0)
  );
  const intervalHours=Math.max(
    0,
    Number($('technicalTaskHours')?.value||0)
  );

  if(!intervalMonths&&!intervalHours){
    alert('Vul een interval in maanden of motoruren in.');
    return;
  }

  technicalStateCache=normaliseTechnicalState(technicalStateCache);

  technicalStateCache.maintenance.push({
    id:`custom-${crypto.randomUUID()}`,
    title,
    category:$('technicalTaskCategory')?.value||'Overig',
    intervalMonths:intervalMonths||null,
    intervalHours:intervalHours||null,
    lastDate:'',
    lastHours:null
  });

  await persistTechnicalState('Onderhoudstaak toegevoegd.');

  $('technicalTaskTitle').value='';
  $('technicalTaskMonths').value='12';
  $('technicalTaskHours').value='';
  toggleTechnicalTaskForm(false);
  renderTechnicalMaintenance();
}

async function completeTechnicalTask(id){
  const task=(technicalStateCache?.maintenance||[])
    .find(item=>String(item.id)===String(id));
  if(!task)return;

  if(!confirm(`${task.title} als uitgevoerd registreren?`))return;

  task.lastDate=technicalToday();
  task.lastHours=Number(technicalStateCache.engineHours||0);

  await persistTechnicalState(`${task.title} bijgewerkt.`);

  await createTechnicalEvent({
    category:'Onderhoud',
    title:task.title,
    event_date:technicalToday(),
    engine_hours:Number(technicalStateCache.engineHours||0),
    notes:`Uitgevoerd en volgende interval opnieuw berekend.`
  },{
    silent:true
  });

  showAppToast(`${task.title} geregistreerd ✅`);
}

async function deleteTechnicalTask(id){
  const task=(technicalStateCache?.maintenance||[])
    .find(item=>String(item.id)===String(id));
  if(!task)return;

  if(!confirm(`Onderhoudstaak “${task.title}” verwijderen?`))return;

  technicalStateCache.maintenance=
    technicalStateCache.maintenance.filter(
      item=>String(item.id)!==String(id)
    );

  await persistTechnicalState('Onderhoudstaak verwijderd.');
}

function toggleTechnicalEventForm(force){
  const form=$('technicalEventForm');
  if(!form)return;

  const show=typeof force==='boolean'
    ?force
    :form.classList.contains('hidden');

  form.classList.toggle('hidden',!show);

  if(show){
    $('technicalEventDate').value=
      $('technicalEventDate').value||technicalToday();
    $('technicalEventHours').value=
      technicalStateCache?.engineHours??'';
    $('technicalEventTitle')?.focus();
  }
}

async function createTechnicalEvent(event,{silent=false}={}){
  const normalized={
    id:event.id||crypto.randomUUID(),
    boat_id:currentBoat.id,
    created_by:currentUser.id,
    event_date:event.event_date||technicalToday(),
    category:event.category||'Overig',
    title:event.title||'Technisch logitem',
    notes:event.notes||'',
    engine_hours:Number.isFinite(Number(event.engine_hours))
      ?Number(event.engine_hours)
      :null,
    value:Number.isFinite(Number(event.value))
      ?Number(event.value)
      :null,
    unit:event.unit||null,
    created_at:new Date().toISOString(),
    source:technicalCloudReady?'cloud':'local'
  };

  technicalEventsCache=[
    normalized,
    ...(technicalEventsCache||[]).filter(
      item=>String(item.id)!==String(normalized.id)
    )
  ].slice(0,300);

  saveTechnicalLocalEvents(technicalEventsCache);
  renderTechnicalEvents();

  if(technicalCloudReady){
    const {data,error}=await sb.from('technical_events')
      .insert({
        boat_id:normalized.boat_id,
        created_by:normalized.created_by,
        event_date:normalized.event_date,
        category:normalized.category,
        title:normalized.title,
        notes:normalized.notes,
        engine_hours:normalized.engine_hours,
        value:normalized.value,
        unit:normalized.unit
      })
      .select('*')
      .single();

    if(error){
      console.error('Technisch logitem opslaan mislukt:',error);
      normalized.source='local';
      technicalCloudReady=!technicalTableMissing(error);
      saveTechnicalLocalEvents(technicalEventsCache);

      if(!silent){
        setTechnicalSyncStatus(
          'Logitem lokaal bewaard; synchronisatie is niet gelukt.',
          'warning'
        );
      }
      return normalized;
    }

    technicalEventsCache=[
      {...data,source:'cloud'},
      ...technicalEventsCache.filter(
        item=>String(item.id)!==String(normalized.id)
      )
    ].slice(0,300);

    saveTechnicalLocalEvents(technicalEventsCache);
    renderTechnicalEvents();
  }

  return normalized;
}

async function addTechnicalEvent(){
  const title=String($('technicalEventTitle')?.value||'').trim();

  if(!title){
    alert('Vul een omschrijving in.');
    $('technicalEventTitle')?.focus();
    return;
  }

  await createTechnicalEvent({
    event_date:$('technicalEventDate')?.value||technicalToday(),
    category:$('technicalEventCategory')?.value||'Overig',
    title,
    notes:String($('technicalEventNotes')?.value||'').trim(),
    engine_hours:technicalInputNumber('technicalEventHours')
  });

  $('technicalEventTitle').value='';
  $('technicalEventNotes').value='';
  $('technicalEventHours').value=
    technicalStateCache?.engineHours??'';
  toggleTechnicalEventForm(false);
  showAppToast('Technisch logitem opgeslagen ✅');
}

async function deleteTechnicalEvent(id){
  const event=(technicalEventsCache||[])
    .find(item=>String(item.id)===String(id));
  if(!event)return;

  if(!confirm(`Logitem “${event.title}” verwijderen?`))return;

  technicalEventsCache=technicalEventsCache.filter(
    item=>String(item.id)!==String(id)
  );
  saveTechnicalLocalEvents(technicalEventsCache);
  renderTechnicalEvents();

  if(technicalCloudReady&&event.source==='cloud'){
    const {error}=await sb.from('technical_events')
      .delete()
      .eq('id',id)
      .eq('boat_id',currentBoat.id);

    if(error){
      console.error('Technisch logitem verwijderen mislukt:',error);
      showAppToast('Lokaal verwijderd, maar cloudverwijdering mislukte.');
      return;
    }
  }

  showAppToast('Technisch logitem verwijderd.');
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


function captainCurrentYear(){
  return new Date().getFullYear();
}

function captainDateValue(value){
  const timestamp=new Date(value||0).getTime();
  return Number.isFinite(timestamp)?timestamp:0;
}

function captainFormatDate(value){
  if(!value)return 'Onbekende datum';

  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return String(value);

  return date.toLocaleDateString('nl-NL',{
    day:'numeric',
    month:'short',
    year:date.getFullYear()===captainCurrentYear()?undefined:'numeric'
  });
}

function captainGreetingText(){
  const hour=new Date().getHours();
  const part=hour<12?'Goedemorgen':hour<18?'Goedemiddag':'Goedenavond';
  return `${part}, ${getLoggedInFirstName()}`;
}

function captainSeasonTrips(){
  const year=String(captainCurrentYear());
  return tripCache.filter(trip=>
    String(trip.trip_date||'').slice(0,4)===year
  );
}

function captainSeasonCosts(){
  const year=String(captainCurrentYear());
  return getAllFinanceEntries().filter(entry=>
    String(entry.date||'').slice(0,4)===year
  );
}

function captainInsightText(){
  if(!currentBoat){
    return 'Koppel Serenity om je persoonlijke command center te activeren.';
  }

  const seasonTrips=captainSeasonTrips();
  const favoriteCount=poiCache.filter(isFavoritePoi).length;
  const latestTrip=tripCache[0];

  if(!settingsCache?.dashboard_photo_path&&!settingsCache?.dashboard_photo_url){
    return 'Maak je dashboard persoonlijk met een mooie foto van Serenity.';
  }

  if(!seasonTrips.length){
    return 'Je seizoen staat klaar. Start Live varen om je eerste route automatisch vast te leggen.';
  }

  if(!poiCache.length){
    return 'Je logboek groeit. Voeg nu je favoriete havens en ligplaatsen toe als POI.';
  }

  if(!favoriteCount){
    return 'Markeer je beste havens met een ster, zodat je ze later direct terugvindt.';
  }

  if(latestTrip){
    const distance=Number(latestTrip.distance_km||0);
    const route=latestTrip.departure&&latestTrip.arrival
      ?`${latestTrip.departure} → ${latestTrip.arrival}`
      :(latestTrip.title||'je laatste vaartocht');

    return distance>0
      ?`Laatste vaart: ${route}, ${distance.toLocaleString('nl-NL',{maximumFractionDigits:1})} km.`
      :`Laatste activiteit: ${route}. Alles staat veilig in je logboek.`;
  }

  return 'Serenity is bijgewerkt. Routes, POI’s en kosten staan op één plek.';
}

function captainActivityItems(){
  const items=[];

  tripCache.forEach(trip=>{
    items.push({
      type:'trip',
      id:trip.id,
      date:trip.trip_date,
      sortDate:captainDateValue(trip.trip_date),
      icon:'⛵',
      title:trip.title||`${trip.departure||''} → ${trip.arrival||''}`||'Vaartocht',
      subtitle:[
        captainFormatDate(trip.trip_date),
        trip.distance_km?`${Number(trip.distance_km).toLocaleString('nl-NL',{maximumFractionDigits:1})} km`:'',
        trip.departure&&trip.arrival?`${trip.departure} → ${trip.arrival}`:''
      ].filter(Boolean).join(' · ')
    });
  });

  poiCache.forEach(poi=>{
    items.push({
      type:'poi',
      id:poi.id,
      date:poi.created_at,
      sortDate:captainDateValue(poi.created_at),
      icon:isFavoritePoi(poi)?'⭐':'📍',
      title:poi.name||'POI',
      subtitle:[
        poi.category||'POI',
        poi.place||poi.address||'',
        captainFormatDate(poi.created_at)
      ].filter(Boolean).join(' · ')
    });
  });

  costCache.forEach(cost=>{
    const description=splitCostDescription(cost.description).summary;
    items.push({
      type:'cost',
      id:cost.id,
      date:cost.expense_date,
      sortDate:captainDateValue(cost.expense_date),
      icon:'🧾',
      title:`${formatEuro(cost.amount)} · ${cost.category||'Kosten'}`,
      subtitle:[
        captainFormatDate(cost.expense_date),
        description||''
      ].filter(Boolean).join(' · ')
    });
  });

  return items
    .sort((a,b)=>b.sortDate-a.sortDate)
    .slice(0,5);
}

function renderCaptainActivity(){
  const container=$('captainActivityList');
  if(!container)return;

  const items=captainActivityItems();

  container.innerHTML=items.length
    ?items.map(item=>`
      <button type="button"
        class="captain-activity-item"
        onclick='openCaptainItem(${JSON.stringify(item.type)},${JSON.stringify(item.id)})'>
        <span class="captain-activity-icon">${item.icon}</span>
        <span class="captain-activity-copy">
          <strong>${esc(item.title)}</strong>
          <small>${esc(item.subtitle)}</small>
        </span>
        <span class="captain-activity-arrow">›</span>
      </button>
    `).join('')
    :'<span class="small">Nog geen activiteit beschikbaar.</span>';
}

function renderCaptainCommandCenter(){
  if(!$('captainGreeting'))return;

  const year=captainCurrentYear();
  const trips=captainSeasonTrips();
  const entries=captainSeasonCosts();

  const distance=trips.reduce(
    (sum,trip)=>sum+Number(trip.distance_km||0),
    0
  );
  const hours=trips.reduce(
    (sum,trip)=>sum+Number(trip.duration_hours||0),
    0
  );
  const fuel=trips.reduce(
    (sum,trip)=>sum+Number(trip.fuel_liters||0),
    0
  );
  const spend=entries.reduce(
    (sum,entry)=>sum+Number(entry.amount||0),
    0
  );
  const favoriteCount=poiCache.filter(isFavoritePoi).length;

  $('captainGreeting').textContent=captainGreetingText();
  $('captainSeasonBadge').textContent=`Seizoen ${year}`;
  $('captainInsight').textContent=captainInsightText();

  $('captainTripCount').textContent=String(trips.length);
  $('captainTripLabel').textContent=trips.length===1
    ?'vaarttocht dit seizoen'
    :'vaartochten dit seizoen';

  $('captainDistance').textContent=
    `${distance.toLocaleString('nl-NL',{maximumFractionDigits:1})} km`;
  $('captainHours').textContent=
    `${hours.toLocaleString('nl-NL',{maximumFractionDigits:1})} vaaruren`;

  $('captainFavoriteCount').textContent=String(favoriteCount);
  $('captainPoiLabel').textContent=
    `van ${poiCache.length} ${poiCache.length===1?'locatie':'locaties'}`;

  $('captainTotalSpend').textContent=formatEuro(spend);
  $('captainFuelLabel').textContent=
    `${fuel.toLocaleString('nl-NL',{maximumFractionDigits:1})} liter brandstof`;

  renderCaptainActivity();
}

function captainSearchItems(){
  const items=[];

  poiCache.forEach(poi=>{
    items.push({
      type:'poi',
      id:poi.id,
      icon:isFavoritePoi(poi)?'⭐':'📍',
      title:poi.name||'POI',
      subtitle:[
        poi.category,
        poi.place,
        poi.address
      ].filter(Boolean).join(' · '),
      search:[
        poi.name,
        poi.category,
        poi.place,
        poi.address,
        poi.review
      ].join(' ').toLowerCase()
    });
  });

  tripCache.forEach(trip=>{
    items.push({
      type:'trip',
      id:trip.id,
      icon:'⛵',
      title:trip.title||'Vaartocht',
      subtitle:[
        captainFormatDate(trip.trip_date),
        trip.departure&&trip.arrival?`${trip.departure} → ${trip.arrival}`:'',
        trip.distance_km?`${trip.distance_km} km`:''
      ].filter(Boolean).join(' · '),
      search:[
        trip.title,
        trip.departure,
        trip.arrival,
        trip.crew,
        trip.notes,
        trip.trip_date
      ].join(' ').toLowerCase()
    });
  });

  costCache.forEach(cost=>{
    const parsed=splitCostDescription(cost.description);
    items.push({
      type:'cost',
      id:cost.id,
      icon:'🧾',
      title:`${formatEuro(cost.amount)} · ${cost.category||'Kosten'}`,
      subtitle:[
        captainFormatDate(cost.expense_date),
        parsed.summary||''
      ].filter(Boolean).join(' · '),
      search:[
        cost.category,
        cost.description,
        cost.expense_date,
        cost.amount
      ].join(' ').toLowerCase()
    });
  });

  return items;
}

function searchCaptainData(value=''){
  const input=$('captainSearch');
  const container=$('captainSearchResults');
  const clearButton=$('captainSearchClear');
  if(!container)return;

  const query=String(value||'').trim().toLowerCase();
  clearButton?.classList.toggle('hidden',!query);

  if(query.length<2){
    container.classList.add('hidden');
    container.innerHTML='';
    return;
  }

  const terms=query.split(/\s+/).filter(Boolean);
  const matches=captainSearchItems()
    .filter(item=>terms.every(term=>item.search.includes(term)))
    .slice(0,12);

  container.innerHTML=matches.length
    ?matches.map(item=>`
      <button type="button"
        class="captain-search-result"
        onclick='openCaptainItem(${JSON.stringify(item.type)},${JSON.stringify(item.id)})'>
        <span>${item.icon}</span>
        <span>
          <strong>${esc(item.title)}</strong>
          <small>${esc(item.subtitle)}</small>
        </span>
        <b>›</b>
      </button>
    `).join('')
    :`<div class="captain-search-empty">
        Geen resultaat voor “${esc(value)}”.
      </div>`;

  container.classList.remove('hidden');
}

function clearCaptainSearch(){
  if($('captainSearch'))$('captainSearch').value='';
  $('captainSearchResults')?.classList.add('hidden');
  if($('captainSearchResults'))$('captainSearchResults').innerHTML='';
  $('captainSearchClear')?.classList.add('hidden');
}

function handleCaptainSearchKey(event){
  if(event.key==='Escape'){
    clearCaptainSearch();
    event.currentTarget?.blur();
  }

  if(event.key==='Enter'){
    const first=$('captainSearchResults')
      ?.querySelector('.captain-search-result');
    first?.click();
  }
}

function openCaptainItem(type,id){
  clearCaptainSearch();

  if(type==='poi'){
    showPoiDetails(id);
    return;
  }

  if(type==='trip'){
    captainNavigate('logbook');
    setTimeout(()=>{
      const details=document.querySelector(
        `[data-trip-id="${CSS.escape(String(id))}"]`
      );
      if(details){
        details.open=true;
        details.scrollIntoView({behavior:'smooth',block:'start'});
      }
    },150);
    return;
  }

  if(type==='cost'){
    captainNavigate('costs');
    setTimeout(()=>{
      const card=document.querySelector(
        `[data-cost-id="${CSS.escape(String(id))}"]`
      );
      card?.scrollIntoView({behavior:'smooth',block:'center'});
      card?.classList.add('captain-highlight');
      setTimeout(()=>card?.classList.remove('captain-highlight'),1800);
    },150);
  }
}

function captainQuickAction(action){
  clearCaptainSearch();

  if(action==='live'){
    captainNavigate('live');
    return;
  }

  if(action==='poi'){
    captainNavigate('pois');
    clearPoiForm(false);
    return;
  }

  if(action==='cost'){
    captainNavigate('costs');
    openCostFormPanel();
    setTimeout(()=>$('costAmount')?.focus(),100);
    return;
  }

  if(action==='trip'){
    captainNavigate('logbook');
    clearTripForm();
    openTripForm();
    setTimeout(()=>$('tripTitle')?.focus(),100);
  }
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


function toggleInlineDetails(button){
  const card=button?.closest('.expandable-cost-card,.finance-detail-card');
  const details=card?.querySelector('.inline-cost-details');
  if(!details)return;

  const opening=details.classList.contains('hidden');

  document.querySelectorAll('.inline-cost-details:not(.hidden)').forEach(panel=>{
    if(panel!==details){
      panel.classList.add('hidden');
      panel.closest('.expandable-cost-card,.finance-detail-card')
        ?.querySelector('.details-chevron')
        ?.classList.remove('open');
    }
  });

  details.classList.toggle('hidden',!opening);
  card.querySelector('.details-chevron')?.classList.toggle('open',opening);

  if(opening){
    details.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
}


async function rescanStoredReceipt(costId,url){
  const cost=costCache.find(item=>item.id===costId);
  if(!cost)return alert('Kostenpost niet gevonden.');

  try{
    editCost(
      cost.id,
      cost.expense_date,
      cost.amount,
      cost.category,
      cost.description||''
    );

    setCostOcrStatus('Bestaand bonnetje opnieuw ophalen…');

    const response=await fetch(url);
    if(!response.ok)throw new Error(`Bon ophalen gaf fout ${response.status}`);

    const blob=await response.blob();
    const file=new File(
      [blob],
      `bon-${costId}.jpg`,
      {type:blob.type||'image/jpeg'}
    );

    await scanCostReceipt(file);
    showAppToast('Bon opnieuw gelezen. Controleer de gegevens en sla wijzigingen op.');
  }catch(error){
    console.error('Bestaand bonnetje opnieuw lezen mislukt:',error);
    alert('Bon opnieuw lezen mislukt: '+(error?.message||'onbekende fout'));
  }
}

function renderReadOnlyCostReceipts(costId){
  const receipts=costReceiptCache[costId]||[];
  if(!receipts.length)return '<span class="small">Geen bonnetje toegevoegd.</span>';

  return `<div class="finance-receipt-grid">${receipts.map(receipt=>{
    const isImage=String(receipt.mime_type||'').startsWith('image/');

    if(isImage){
      return `<div class="finance-receipt-card">
        <button type="button" class="finance-receipt-button"
          onclick='openStorageLightbox(${JSON.stringify(COST_RECEIPT_BUCKET)},${JSON.stringify(receipt.storage_path)},this.querySelector("img"))'>
          <img src="${STORAGE_SAFE_PLACEHOLDER}" class="storage-safe-image"
            loading="lazy" decoding="async"
            data-storage-bucket="${esc(COST_RECEIPT_BUCKET)}"
            data-storage-path="${esc(receipt.storage_path)}"
            alt="Bonnetje">
          <span>Bekijk bon</span>
        </button>
        <button type="button" class="receipt-rescan-button"
          onclick='rescanStoredReceiptPath(${JSON.stringify(costId)},${JSON.stringify(COST_RECEIPT_BUCKET)},${JSON.stringify(receipt.storage_path)})'>
          ✨ Opnieuw lezen
        </button>
      </div>`;
    }

    return `<button type="button" class="finance-receipt-button finance-receipt-pdf"
      onclick='openStorageDocument(${JSON.stringify(COST_RECEIPT_BUCKET)},${JSON.stringify(receipt.storage_path)})'>
      <span>🧾 PDF-bon openen</span>
    </button>`;
  }).join('')}</div>`;
}

function renderFinanceCostExpanded(entry){
  if(entry.type==='trip'){
    const trip=tripCache.find(item=>item.id===entry.id);

    if(!trip){
      return '<span class="small">Deze vaartocht kon niet worden gevonden.</span>';
    }

    return `
      <div class="inline-cost-grid">
        <div><span>Datum</span><strong>${esc(trip.trip_date||'-')}</strong></div>
        <div><span>Route</span><strong>${esc(trip.departure||'-')} → ${esc(trip.arrival||'-')}</strong></div>
        <div><span>Afstand</span><strong>${trip.distance_km??'-'} km</strong></div>
        <div><span>Vaartijd</span><strong>${trip.duration_hours??'-'} uur</strong></div>
        <div><span>Brandstof</span><strong>${trip.fuel_liters?Number(trip.fuel_liters).toFixed(1)+' l':'-'}</strong></div>
        <div><span>Kosten</span><strong>${formatEuro(trip.fuel_cost||0)}</strong></div>
      </div>
      ${trip.notes?`<div class="inline-cost-notes">${esc(trip.notes).replace(/\n/g,'<br>')}</div>`:''}
      <button type="button" class="secondary inline-open-button" onclick="captainNavigate('logbook')">
        Open in Logboek
      </button>
    `;
  }

  const cost=costCache.find(item=>item.id===entry.id);

  if(!cost){
    return '<span class="small">Deze kostenpost kon niet worden gevonden.</span>';
  }

  const parsed=splitCostDescription(cost.description);

  return `
    <div class="inline-cost-grid">
      <div><span>Datum</span><strong>${esc(cost.expense_date||'-')}</strong></div>
      <div><span>Categorie</span><strong>${esc(cost.category||'Overig')}</strong></div>
      <div><span>Bedrag</span><strong>${formatEuro(cost.amount||0)}</strong></div>
      <div><span>Omschrijving</span><strong>${esc(parsed.summary||'-')}</strong></div>
    </div>

    ${parsed.details
      ?`<div class="inline-cost-notes">
          <b>Details van de bon</b><br>
          ${esc(parsed.details).replace(/\n/g,'<br>')}
        </div>`
      :'<div class="inline-cost-notes muted-detail">Geen extra bon-details opgeslagen.</div>'}

    <div class="inline-receipt-heading">Bonnetjes</div>
    ${renderReadOnlyCostReceipts(cost.id)}

    <div class="inline-cost-actions">
      <button type="button" class="secondary" onclick='editCost(
        ${JSON.stringify(cost.id)},
        ${JSON.stringify(cost.expense_date)},
        ${JSON.stringify(cost.amount)},
        ${JSON.stringify(cost.category)},
        ${JSON.stringify(cost.description||'')}
      )'>✏️ Bewerken</button>
      <button type="button" class="secondary" onclick="captainNavigate('costs')">Open bij Kosten</button>
    </div>
  `;
}

function financeCategoryIcon(category){
  const key=String(category||'Overig').toLowerCase();
  if(key.includes('diesel')||key.includes('brandstof'))return '⛽';
  if(key.includes('haven')||key.includes('ligplaats'))return '⚓';
  if(key.includes('onderhoud'))return '🛠️';
  if(key.includes('onderdeel')||key.includes('materiaal'))return '🔩';
  if(key.includes('winterstalling'))return '🏠';
  if(key.includes('boodschap'))return '🛒';
  if(key.includes('eten')||key.includes('drinken'))return '🍽️';
  if(key.includes('verzekering'))return '🛡️';
  if(key.includes('elektr'))return '🔌';
  return '💳';
}

function financeFilteredEntries(regular,fuelTrips){
  return [
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
}

function renderFinanceDetails(regular,fuelTrips,periodType,selectedCategory){
  const container=$('financeDetails');
  const summary=$('financeDetailsSummary');
  if(!container||!summary)return;

  const entries=financeFilteredEntries(regular,fuelTrips);
  const total=entries.reduce((sum,entry)=>sum+entry.amount,0);
  summary.textContent=`${financePeriodLabel(periodType)} · ${selectedCategory||'Alle categorieën'} · ${entries.length} ${entries.length===1?'post':'posten'} · ${formatEuro(total)}`;

  container.innerHTML=entries.length
    ?entries.map(entry=>`
      <div class="finance-detail-card">
        <button type="button" class="finance-detail-row" onclick="toggleInlineDetails(this)">
          <span class="finance-detail-icon">${financeCategoryIcon(entry.category)}</span>
          <span class="finance-detail-main">
            <b>${esc(entry.category)}</b>
            <small>${esc(entry.date||'')} · ${esc(entry.description||'')}</small>
          </span>
          <strong>${formatEuro(entry.amount)}</strong>
          <span class="finance-detail-arrow details-chevron">›</span>
        </button>
        <div class="inline-cost-details hidden">
          ${renderFinanceCostExpanded(entry)}
        </div>
      </div>
    `).join('')
    :'<div class="finance-empty-state"><span>🧾</span><b>Nog geen kosten</b><small>Voeg een kostenpost toe of pas het filter aan.</small></div>';
}

function financeMonthKey(date){
  return /^\d{4}-\d{2}/.test(String(date||''))?String(date).slice(0,7):'';
}

function renderFinanceTrend(entries){
  const chart=$('financeTrendChart');
  const totalNode=$('financeTrendTotal');
  if(!chart||!totalNode)return;

  const now=new Date();
  const months=[];
  for(let offset=5;offset>=0;offset--){
    const date=new Date(now.getFullYear(),now.getMonth()-offset,1);
    months.push({
      key:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`,
      label:date.toLocaleDateString('nl-NL',{month:'short'}).replace('.',''),
      value:0
    });
  }
  entries.forEach(entry=>{
    const month=months.find(item=>item.key===financeMonthKey(entry.date));
    if(month)month.value+=Number(entry.amount||0);
  });

  const max=Math.max(1,...months.map(item=>item.value));
  const total=months.reduce((sum,item)=>sum+item.value,0);
  totalNode.textContent=formatEuro(total);
  chart.innerHTML=months.map(item=>`
    <button type="button" class="finance-trend-column" onclick='openFinanceMonth(${JSON.stringify(item.key)})' title="${esc(item.label)} · ${formatEuro(item.value)}">
      <span class="finance-trend-value">${item.value?formatEuro(item.value):'–'}</span>
      <span class="finance-trend-bar-wrap"><i style="height:${Math.max(item.value?8:2,Math.round(item.value/max*100))}%"></i></span>
      <b>${esc(item.label)}</b>
    </button>
  `).join('');
}

function renderFinanceInsights(entries,matchingTrips,groups,filteredTotal,filteredFuel){
  const container=$('financeInsights');
  if(!container)return;

  if(!entries.length){
    container.innerHTML='<div class="finance-empty-state"><span>✨</span><b>Inzichten verschijnen vanzelf</b><small>Zodra kosten zijn toegevoegd zie je hier trends en aandachtspunten.</small></div>';
    return;
  }

  const sortedGroups=Object.entries(groups).sort((a,b)=>b[1]-a[1]);
  const top=sortedGroups[0]||['Overig',0];
  const topShare=filteredTotal?Math.round(top[1]/filteredTotal*100):0;
  const fuelShare=filteredTotal?Math.round(filteredFuel/filteredTotal*100):0;
  const totalKm=matchingTrips.reduce((sum,trip)=>sum+Number(trip.distance_km||0),0);
  const totalHours=matchingTrips.reduce((sum,trip)=>sum+Number(trip.duration_hours||0),0);
  const expenseDays=new Set(entries.map(entry=>entry.date).filter(Boolean)).size;

  const insights=[
    {icon:financeCategoryIcon(top[0]),title:`${top[0]} is nummer 1`,text:`${formatEuro(top[1])} · ${topShare}% van het geselecteerde totaal.`},
    {icon:'⛽',title:'Aandeel brandstof',text:filteredFuel?`${formatEuro(filteredFuel)} · ${fuelShare}% van alle kosten.`:'Geen brandstofkosten binnen dit filter.'},
    {icon:'🧭',title:'Kosten tijdens het varen',text:totalKm?`${formatEuro(filteredTotal/totalKm)} per km over ${totalKm.toFixed(1)} km.`:'Nog geen afstand gekoppeld aan deze periode.'},
    {icon:'⏱️',title:'Kosten per vaaruur',text:totalHours?`${formatEuro(filteredTotal/totalHours)} per uur over ${totalHours.toFixed(1)} uur.`:'Nog geen vaaruren gekoppeld aan deze periode.'},
    {icon:'📅',title:'Spreiding',text:`${entries.length} posten verdeeld over ${expenseDays} ${expenseDays===1?'dag':'dagen'}.`}
  ];

  container.innerHTML=insights.map(item=>`
    <div class="finance-smart-item">
      <span>${item.icon}</span>
      <div><b>${esc(item.title)}</b><small>${esc(item.text)}</small></div>
    </div>
  `).join('');
}

function currentFinanceExportRows(){
  const periodType=$('financePeriodType')?.value||'all';
  const selectedCategory=$('financeCategory')?.value||'';
  const regular=costCache.filter(cost=>financeDateMatches(cost.expense_date,periodType)&&(!selectedCategory||cost.category===selectedCategory));
  const fuelTrips=tripCache.filter(trip=>financeDateMatches(trip.trip_date,periodType)&&(!selectedCategory||selectedCategory==='Diesel')&&Number(trip.fuel_cost||0)>0);
  return financeFilteredEntries(regular,fuelTrips);
}

function exportFinanceCsv(){
  const entries=currentFinanceExportRows();
  if(!entries.length){
    alert('Er zijn geen financiële gegevens binnen het huidige filter.');
    return;
  }
  const rows=[
    ['Datum','Categorie','Omschrijving','Bedrag EUR'],
    ...entries.map(entry=>[entry.date||'',entry.category||'',entry.description||'',Number(entry.amount||0).toFixed(2).replace('.',',')])
  ];
  const csv='\ufeff'+rows.map(row=>row.map(value=>`"${String(value).replace(/"/g,'""')}"`).join(';')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=`Serenity-financieel-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  showAppToast('Financieel overzicht geëxporteerd ✅');
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

  const matchingTrips=tripCache.filter(trip=>financeDateMatches(trip.trip_date,periodType));
  const fuelTrips=matchingTrips.filter(trip=>(!selectedCategory||selectedCategory==='Diesel')&&Number(trip.fuel_cost||0)>0);

  const regularTotal=regular.reduce((sum,cost)=>sum+Number(cost.amount||0),0);
  const tripFuelTotal=fuelTrips.reduce((sum,trip)=>sum+Number(trip.fuel_cost||0),0);
  const regularDieselTotal=regular
    .filter(cost=>String(cost.category||'').toLowerCase()==='diesel')
    .reduce((sum,cost)=>sum+Number(cost.amount||0),0);
  const filteredFuel=tripFuelTotal+regularDieselTotal;
  const filteredTotal=regularTotal+tripFuelTotal;
  const filteredHours=matchingTrips.reduce((sum,trip)=>sum+Number(trip.duration_hours||0),0);
  const filteredDistance=matchingTrips.reduce((sum,trip)=>sum+Number(trip.distance_km||0),0);
  const itemCount=regular.length+fuelTrips.length;
  const entries=financeFilteredEntries(regular,fuelTrips);

  const groups={};
  regular.forEach(cost=>{
    const category=cost.category||'Overig';
    groups[category]=(groups[category]||0)+Number(cost.amount||0);
  });
  if(fuelTrips.length)groups.Diesel=(groups.Diesel||0)+tripFuelTotal;

  const topCategory=Object.entries(groups).sort((a,b)=>b[1]-a[1])[0]||null;
  const largest=entries.slice().sort((a,b)=>b.amount-a.amount)[0]||null;

  $('fTotal').textContent=formatEuro(filteredTotal);
  $('fCount').textContent=String(itemCount);
  $('fFuel').textContent=formatEuro(filteredFuel);
  $('fPerHour').textContent=filteredHours?formatEuro(filteredTotal/filteredHours):formatEuro(0);
  $('fPerKm').textContent=filteredDistance?formatEuro(filteredTotal/filteredDistance):formatEuro(0);
  $('fAverage').textContent=itemCount?formatEuro(filteredTotal/itemCount):formatEuro(0);
  $('fTopCategory').textContent=topCategory?topCategory[0]:'–';
  $('fTopCategoryValue').textContent=topCategory?`${formatEuro(topCategory[1])} · ${filteredTotal?Math.round(topCategory[1]/filteredTotal*100):0}%`:'nog geen gegevens';
  $('fLargest').textContent=largest?formatEuro(largest.amount):formatEuro(0);
  $('fLargestLabel').textContent=largest?`${largest.category} · ${largest.date||''}`:'nog geen gegevens';

  const categoryLabel=selectedCategory||'Alle categorieën';
  $('financeFilterSummary').textContent=`${financePeriodLabel(periodType)} · ${categoryLabel} · ${itemCount} ${itemCount===1?'post':'posten'}`;

  const max=Math.max(1,...Object.values(groups));
  $('financeBreakdown').innerHTML=Object.entries(groups)
    .sort((a,b)=>b[1]-a[1])
    .map(([category,value])=>`
      <button type="button" class="finance-row finance-row-button finance-category-row" onclick='openFinanceCategory(${JSON.stringify(category)})'>
        <span class="finance-row-icon">${financeCategoryIcon(category)}</span>
        <div class="finance-row-copy">
          <b>${esc(category)}</b>
          <small>${filteredTotal?Math.round(value/filteredTotal*100):0}% van totaal</small>
          <div class="finance-bar"><span style="width:${Math.round(value/max*100)}%"></span></div>
        </div>
        <div class="finance-row-value">${formatEuro(value)} <span>›</span></div>
      </button>
    `).join('')||'<div class="finance-empty-state"><span>🧭</span><b>Geen categorieën</b><small>Voeg een kostenpost toe of pas het filter aan.</small></div>';

  const months={};
  entries.forEach(entry=>{
    const month=financeMonthKey(entry.date);
    if(month)months[month]=(months[month]||0)+Number(entry.amount||0);
  });

  $('financeMonths').innerHTML=Object.entries(months)
    .sort((a,b)=>b[0].localeCompare(a[0]))
    .map(([month,value])=>{
      const [year,monthNumber]=month.split('-').map(Number);
      const label=new Date(year,monthNumber-1,1).toLocaleDateString('nl-NL',{month:'long',year:'numeric'});
      return `
        <button type="button" class="finance-row finance-row-button finance-month-row" onclick='openFinanceMonth(${JSON.stringify(month)})'>
          <span class="finance-row-icon">📅</span>
          <div class="finance-row-copy"><b>${esc(label)}</b><small>Open maanddetails</small></div>
          <div class="finance-row-value">${formatEuro(value)} <span>›</span></div>
        </button>`;
    }).join('')||'<div class="finance-empty-state"><span>📅</span><b>Geen maandgegevens</b><small>Er zijn geen posten binnen dit filter.</small></div>';

  renderFinanceTrend(entries);
  renderFinanceInsights(entries,matchingTrips,groups,filteredTotal,filteredFuel);
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
  const ratingNumber=Math.max(
    0,
    Math.min(5,Number(poi.rating)||0)
  );
  const stars='★★★★★'.slice(0,ratingNumber);
  const position=getPoiMapPosition(poi);
  const hasLocation=position.valid;
  const latitude=hasLocation?position.lat:null;
  const longitude=hasLocation?position.lon:null;

  const photoHtml=photos.length
    ?`<div class="poi-detail-section">
        <div class="poi-detail-section-title">
          Foto’s <span>${photos.length}</span>
        </div>
        <div class="poi-detail-photos">
          ${photos.map(photo=>`
            <img src="${STORAGE_SAFE_PLACEHOLDER}"
              class="storage-safe-image"
              loading="lazy" decoding="async"
              data-storage-bucket="${esc(PHOTO_BUCKET)}"
              data-storage-path="${esc(photo.storage_path)}"
              alt="Foto van ${esc(poi.name||'POI')}"
              onclick='openStorageLightbox(${JSON.stringify(PHOTO_BUCKET)},${JSON.stringify(photo.storage_path)},this)'>
          `).join('')}
        </div>
      </div>`
    :`<div class="poi-detail-line">
        <b>Foto’s</b>
        <span>Geen foto’s toegevoegd</span>
      </div>`;

  const createdAt=poi.created_at
    ?formatAccountDate(poi.created_at)
    :'Niet beschikbaar';
  const updatedAt=poi.updated_at
    ?formatAccountDate(poi.updated_at)
    :'Niet beschikbaar';

  $('poiDetailContent').innerHTML=`
    <div class="poi-detail-heading">
      <span class="poi-detail-icon">${favorite?'⭐':'📍'}</span>
      <div>
        <h2>${esc(poi.name||'POI')}</h2>
        <p>${esc(poi.category||'POI')}${poi.place?` · ${esc(poi.place)}`:''}</p>
      </div>
    </div>

    <div class="poi-detail-overview">
      <div>
        <span>Categorie</span>
        <strong>${esc(poi.category||'Niet ingevuld')}</strong>
      </div>
      <div>
        <span>Plaats</span>
        <strong>${esc(poi.place||'Niet ingevuld')}</strong>
      </div>
      <div>
        <span>Beoordeling</span>
        <strong>${stars?`${stars} (${ratingNumber}/5)`:'Niet beoordeeld'}</strong>
      </div>
      <div>
        <span>Favoriet</span>
        <strong>${favorite?'Ja ⭐':'Nee'}</strong>
      </div>
    </div>

    <div class="poi-detail-line">
      <b>Adres</b>
      <span>${esc(poi.address||'Niet ingevuld')}</span>
    </div>

    <div class="poi-detail-line">
      <b>GPS</b>
      <span>
        ${hasLocation
          ?`${latitude.toFixed(7)}, ${longitude.toFixed(7)}`
          :'Geen kaartlocatie opgeslagen'}
      </span>
    </div>

    <div class="poi-detail-line">
      <b>Aangemaakt</b>
      <span>${esc(createdAt)}</span>
    </div>

    <div class="poi-detail-line">
      <b>Laatst gewijzigd</b>
      <span>${esc(updatedAt)}</span>
    </div>

    <div class="poi-detail-section">
      <div class="poi-detail-section-title">Notities of beoordeling</div>
      <div class="poi-detail-review">
        ${poi.review
          ?esc(poi.review).replace(/\n/g,'<br>')
          :'<span class="poi-detail-empty">Geen notities toegevoegd.</span>'}
      </div>
    </div>

    ${photoHtml}

    <div class="poi-detail-actions">
      ${hasLocation
        ?`<button onclick="openPoiRouteInWaterkaarten('${poi.id}')">
            🧭 Kopieer bestemming en open Waterkaarten
          </button>`
        :`<button class="secondary" onclick="openPoiLocationCorrection('${poi.id}')">
            📍 Kaartlocatie toevoegen
          </button>`}

      ${hasLocation
        ?`<button class="secondary" onclick="openPoiLocationCorrection('${poi.id}')">
            📍 Locatie corrigeren
          </button>`
        :''}

      <button class="secondary"
        onclick="openPoiWebPhotoSearchForPoi('${poi.id}')">
        🌐 Zoek internetfoto’s
      </button>

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
  const isNewTrip=!id;

  const row={
    boat_id:currentBoat.id,
    created_by:currentUser.id,
    trip_date:$('tripDate').value,
    title:$('tripTitle').value.trim()||
      `${$('tripFrom').value.trim()} naar ${$('tripTo').value.trim()}`,
    departure:$('tripFrom').value.trim(),
    arrival:$('tripTo').value.trim(),
    distance_km:Number($('tripDistance').value)||null,
    duration_hours:Number($('tripHours').value)||null,
    crew:$('tripCrew').value.trim(),
    notes:$('tripNotes').value.trim(),
    fuel_liters:Number($('tripFuelLiters').value)||null,
    fuel_cost:Number($('tripFuelCost').value)||null,
    updated_at:new Date().toISOString()
  };

  setTripProgress(id?'Vaartocht bijwerken…':'Vaartocht opslaan…');

  let tripId=id;

  if(id){
    const {error}=await sb.from('trips').update({
      trip_date:row.trip_date,
      title:row.title,
      departure:row.departure,
      arrival:row.arrival,
      distance_km:row.distance_km,
      duration_hours:row.duration_hours,
      crew:row.crew,
      notes:row.notes,
      fuel_liters:row.fuel_liters,
      fuel_cost:row.fuel_cost,
      updated_at:row.updated_at
    }).eq('id',id);

    if(error){
      setTripProgress('');
      return alert(error.message);
    }
  }else{
    const {data,error}=await sb.from('trips')
      .insert(row)
      .select('id')
      .single();

    if(error){
      setTripProgress('');
      return alert(error.message);
    }

    tripId=data.id;
  }

  if(
    !row.fuel_liters&&
    row.duration_hours&&
    settingsCache?.fuel_per_hour
  ){
    row.fuel_liters=
      Number(row.duration_hours)*
      Number(settingsCache.fuel_per_hour);
  }

  if(
    !row.fuel_cost&&
    row.fuel_liters&&
    settingsCache?.fuel_price
  ){
    row.fuel_cost=
      Number(row.fuel_liters)*
      Number(settingsCache.fuel_price);
  }

  await sb.from('trips').update({
    fuel_liters:row.fuel_liters,
    fuel_cost:row.fuel_cost
  }).eq('id',tripId);

  const routeFile=
    pendingTripRouteFile||
    $('tripGpx').files[0];

  if(routeFile){
    setTripProgress('Route uit Waterkaarten verwerken…');

    let routeGeojson=pendingTripRouteDetails?.geojson||null;

    try{
      if(!routeGeojson){
        routeGeojson=await parseRouteFile(routeFile);
      }
    }catch(error){
      setTripProgress('');
      return alert(
        'Routebestand kon niet worden gelezen: '+
        (error?.message||'onbekende fout')
      );
    }

    if(!routeGeojson){
      setTripProgress('');
      return alert(
        'Dit bestand bevat geen bruikbare GPX-, KML- of KMZ-route.'
      );
    }

    const safeName=(routeFile.name||'waterkaarten-route')
      .replace(/[^a-zA-Z0-9._-]/g,'_');
    const routePath=
      `${currentBoat.id}/${tripId}/${Date.now()}-${safeName}`;
    const contentType=getRouteContentType(routeFile);

    const {error:routeUploadError}=await sb.storage
      .from(TRIP_GPX_BUCKET)
      .upload(routePath,routeFile,{
        upsert:true,
        contentType
      });

    if(routeUploadError){
      setTripProgress('');
      return alert(
        'Route uploaden mislukt: '+routeUploadError.message
      );
    }

    const {error:routeDbError}=await sb.from('trips').update({
      gpx_storage_path:routePath,
      route_geojson:routeGeojson,
      updated_at:new Date().toISOString()
    }).eq('id',tripId);

    if(routeDbError){
      setTripProgress('');
      return alert(
        'Route opslaan mislukt: '+routeDbError.message
      );
    }
  }

  const files=[...$('tripPhotos').files].slice(0,10);

  if(files.length){
    await uploadTripPhotos(tripId,files);
  }

  if(pendingTripRouteFingerprint){
    markRouteFingerprintImported(pendingTripRouteFingerprint);
  }

  setTripProgress('Vaartijd bij motoruren verwerken…');

  const engineUpdate=await applyTripDurationToEngineHours({
    tripId,
    durationHours:row.duration_hours,
    title:row.title,
    tripDate:row.trip_date,
    isNewTrip
  });

  clearTripForm();
  await loadTrips();

  if(engineUpdate.applied){
    showAppToast(
      `${row.title} opgeslagen · motoruren ${
        engineUpdate.delta>=0?'+':'−'
      }${technicalNumber(Math.abs(engineUpdate.delta),2)} uur ✅`
    );
  }else if(engineUpdate.baseline){
    showAppToast(
      `${row.title} bijgewerkt · bestaande motoruren niet dubbel geteld ✅`
    );
  }else{
    showAppToast(`${row.title} opgeslagen ✅`);
  }
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
    setPanelCollapsed('accountPanelWrap','accountPanelToggle',true);
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
      cacheControl:'31536000',upsert:false,contentType:file.type||'image/jpeg'
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
  storageSafeForgetUrl(TRIP_PHOTO_BUCKET,path);
  const {error:storageError}=await sb.storage.from(TRIP_PHOTO_BUCKET).remove([path]);
  if(storageError)return alert(storageError.message);
  const {error}=await sb.from('trip_photos').delete().eq('id',id);
  if(error)alert(error.message);
}
async function loadTripPhotos(){
  const {data,error}=await sb.from('trip_photos').select('*').eq('boat_id',currentBoat.id).order('created_at',{ascending:true});
  if(error){console.error(error);return {}}
  const grouped={};
  for(const photo of data||[]){
    (grouped[photo.trip_id]??=[]).push({...photo,url:null});
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

    const engineUpdate=await removeTripDurationFromEngineHours({
      tripId:id,
      title
    });

    destroyRouteMap(`tripRouteMap-${id}`);
    tripCache=tripCache.filter(item=>String(item.id)!==String(id));
    if(window.tripPhotoCache)delete window.tripPhotoCache[id];

    renderTripList();
    renderFinance();
    updateLatestRouteDashboard();
    if($('dTrips'))$('dTrips').textContent=tripCache.length;

    alert(
      engineUpdate.applied
        ?`Log verwijderd. Motoruren zijn met ${technicalNumber(Math.abs(engineUpdate.delta),2)} uur gecorrigeerd.`
        :'Log verwijderd.'
    );
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
  tripLastMetadataLoadAt=Date.now();
  $('dTrips').textContent=data.length;
  renderTripList();
  renderFinance();
  updateLatestRouteDashboard();
  updateDashboardFinanceSummary();
  renderCaptainCommandCenter();
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
  if(id==='boat'&&!isAppAdmin()){
    showAppToast('Boot & delen is alleen toegankelijk voor Michel.');
    id='settings';
    sourceButton=null;
  }

  const desktopButtons=[...document.querySelectorAll('.tab')];
  const map={
    dashboard:0,
    live:1,
    ais:2,
    weather:3,
    map:4,
    planner:5,
    entertainment:6,
    technical:7,
    pois:8,
    logbook:9,
    costs:10,
    finance:11,
    settings:12,
    boat:13
  };
  const desktopButton=desktopButtons[map[id]];

  if(typeof showTab==='function'&&desktopButton){
    showTab(id,desktopButton);
  }else{
    document.querySelectorAll('#appView > section')
      .forEach(section=>section.classList.add('hidden'));
    document.getElementById(id)?.classList.remove('hidden');
  }

  collapseDefaultPanels(id);

  document.querySelectorAll('.bottom-nav-item').forEach(button=>{
    button.classList.toggle('active',button.dataset.target===id);
  });

  if(id==='live'&&typeof initLiveMode==='function'){
    setTimeout(()=>initLiveMode(),80);
  }

  if(id==='ais'&&typeof initAisPage==='function'){
    setTimeout(()=>initAisPage(),40);
  }

  if(id==='weather'&&typeof initWeatherPage==='function'){
    setTimeout(()=>initWeatherPage(),40);
  }

  if(id==='map'&&typeof initMap==='function'){
    setTimeout(()=>initMap(),80);
  }

  if(id==='planner'&&typeof initPlanner==='function'){
    setTimeout(()=>initPlanner(),60);
  }

  if(id==='entertainment'&&typeof initEntertainmentPage==='function'){
    setTimeout(()=>initEntertainmentPage(),50);
  }

  if(id==='technical'&&typeof initTechnicalDashboard==='function'){
    setTimeout(()=>initTechnicalDashboard(),60);
  }

  if(id==='dashboard'){
    if(typeof updateLatestRouteDashboard==='function'){
      setTimeout(()=>updateLatestRouteDashboard(),80);
    }
    if(typeof updateDashboardFinanceSummary==='function'){
      updateDashboardFinanceSummary();
    }
    if(typeof renderCaptainCommandCenter==='function'){
      renderCaptainCommandCenter();
    }
    if(typeof renderTechnicalDashboard==='function'){
      renderTechnicalDashboard();
    }
    if(isAppAdmin())loadAdminAccounts();
  }

  if(id==='pois'){
    resetPoiFilters(false);
    renderPoiList();

    if(currentBoat&&Date.now()-poiLastMetadataLoadAt>2*60*1000){
      loadPois().catch(error=>
        console.error('POI opnieuw laden mislukt:',error)
      );
    }else{
      storageSafeStats.preventedReloads++;
      storageSafeRenderStatus();
    }
  }

  if(id==='logbook'){
    const editing=Boolean($('tripId')?.value);
    const imported=Boolean(
      pendingTripRouteDetails||
      pendingTripRouteFile
    );

    if(!editing&&!imported){
      closeTripForm();
    }

    setTimeout(()=>autoCheckSavedICloudRouteFolder(),150);
  }

  if(id==='finance'&&typeof renderFinance==='function'){
    renderFinance();
  }

  if(id==='settings'){
    if(typeof loadSettingsForm==='function')loadSettingsForm();
    if(typeof loadDashboardPhoto==='function')loadDashboardPhoto();

    if(!$('accountPanelWrap')?.classList.contains('hidden')){
      loadAccountManagement();
    }
  }

  // Iedere pagina begint standaard bovenaan, ook op iPad/Safari.
  requestAnimationFrame(()=>{
    window.scrollTo({top:0,left:0,behavior:'auto'});
    document.documentElement.scrollTop=0;
    document.body.scrollTop=0;
  });
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
let liveAutoSaveRunning=false;
let liveAutoStopTimer=null;
let liveLastReliableSpeedAt=0;
let liveSmoothedSpeedKmh=0;
let liveSmoothedHeadingDeg=null;
let liveTechnicalSyncTimer=null;

function createEmptyLiveState(){
  return {
    status:'idle',
    startedAt:null,
    endedAt:null,
    segmentStartedAt:null,
    accumulatedMs:0,
    points:[],
    distanceKm:0,
    speedKmh:0,
    maxSpeedKmh:0,
    headingDeg:null,
    headingSource:'',
    accuracy:null,
    gpsSource:'',
    gpsRateHz:0,
    externalGpsLikely:false,
    gpsSelectionMode:'automatic',
    engineRpm:0,
    rudderAngle:0,
    weather:null,
    weatherUpdatedAt:null,
    lastWeatherLat:null,
    lastWeatherLon:null,
    movingDetected:false,
    lastMovingAt:null,
    stationarySince:null,
    autoStopTriggered:false,
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
      headingDeg:(saved.headingDeg!==null&&saved.headingDeg!==''&&Number.isFinite(Number(saved.headingDeg)))?Number(saved.headingDeg):null,
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

    liveSmoothedHeadingDeg=Number.isFinite(Number(liveNavState.headingDeg))
      ?Number(liveNavState.headingDeg)
      :null;

    fillLiveTripDefaults(false);
    loadLiveAutomationSettings();
    setLiveAutoLogStatus(
      liveNavState.status==='paused'
        ?'Eerdere opname hersteld. Tik op Hervat om verder te gaan.'
        :'Eerdere opname hersteld.',
      'warning'
    );
  }catch(error){
    console.warn('Live opname herstellen mislukt:',error);
  }
}


const LIVE_AUTOMATION_STORAGE_PREFIX='mijnserenity-live-auto-v1-';

function liveAutomationStorageKey(){
  return LIVE_AUTOMATION_STORAGE_PREFIX+(currentBoat?.id||'geen-boot');
}

function defaultLiveAutomationSettings(){
  return {
    autoSave:true,
    autoStop:false,
    autoStopMinutes:15,
    minDistanceKm:.2,
    minDurationMinutes:3
  };
}

function readLiveAutomationSettings(){
  try{
    return {
      ...defaultLiveAutomationSettings(),
      ...JSON.parse(
        localStorage.getItem(liveAutomationStorageKey())||'{}'
      )
    };
  }catch(error){
    console.warn('Automatische logboekinstellingen lezen mislukt:',error);
    return defaultLiveAutomationSettings();
  }
}

function saveLiveAutomationSettings(){
  const settings={
    autoSave:Boolean($('liveAutoSave')?.checked),
    autoStop:Boolean($('liveAutoStop')?.checked),
    autoStopMinutes:Number($('liveAutoStopMinutes')?.value||15),
    minDistanceKm:Number($('liveAutoMinDistance')?.value||.2),
    minDurationMinutes:3
  };

  try{
    localStorage.setItem(
      liveAutomationStorageKey(),
      JSON.stringify(settings)
    );
  }catch(error){
    console.warn('Automatische logboekinstellingen bewaren mislukt:',error);
  }

  updateLiveAutoLogUi();
}

function loadLiveAutomationSettings(){
  const settings=readLiveAutomationSettings();

  if($('liveAutoSave'))$('liveAutoSave').checked=Boolean(settings.autoSave);
  if($('liveAutoStop'))$('liveAutoStop').checked=Boolean(settings.autoStop);
  if($('liveAutoStopMinutes')){
    $('liveAutoStopMinutes').value=String(settings.autoStopMinutes||15);
  }
  if($('liveAutoMinDistance')){
    $('liveAutoMinDistance').value=String(settings.minDistanceKm||.2);
  }

  updateLiveAutoLogUi();
}

function setLiveAutoLogStatus(message,state=''){
  const status=$('liveAutoLogStatus');
  if(!status)return;

  status.textContent=message||'';
  status.classList.remove('success','warning','error');

  if(state)status.classList.add(state);
}

function updateLiveAutoLogUi(){
  const settings=readLiveAutomationSettings();
  const badge=$('liveAutoLogBadge');
  if(!badge)return;

  badge.className='live-auto-log-badge '+
    (settings.autoSave?'active':'manual');
  badge.textContent=settings.autoSave
    ?'Automatisch actief'
    :'Handmatig opslaan';

  if(liveNavState.status==='idle'){
    setLiveAutoLogStatus(
      settings.autoSave
        ?`Na Stop wordt de vaartocht automatisch opgeslagen${settings.autoStop?` · afmeerdetectie na ${settings.autoStopMinutes} minuten`:''}.`
        :'De route wordt opgenomen, maar je slaat hem daarna handmatig op.'
    );
  }
}

function liveTripQualifiesForAutoSave(){
  const settings=readLiveAutomationSettings();
  const durationMinutes=getLiveElapsedMs()/60000;

  return (
    liveNavState.points.length>=2&&
    Number(liveNavState.distanceKm||0)>=Number(settings.minDistanceKm||.2)&&
    durationMinutes>=Number(settings.minDurationMinutes||3)
  );
}

function nearestSavedPoiForLivePoint(point,maxKm=1.5){
  if(!point)return null;

  let best=null;
  let bestDistance=Infinity;

  poiCache.forEach(poi=>{
    const position=getPoiMapPosition(poi);
    if(!position.valid)return;

    const distance=haversineKm(
      {lat:Number(point.lat),lon:Number(point.lon)},
      {lat:Number(position.lat),lon:Number(position.lon)}
    );

    if(distance<bestDistance){
      bestDistance=distance;
      best=poi;
    }
  });

  return best&&bestDistance<=maxKm
    ?{poi:best,distanceKm:bestDistance}
    :null;
}

function liveFallbackPlaceName(point,prefix='GPS'){
  const nearest=nearestSavedPoiForLivePoint(point);

  if(nearest){
    return cleanLivePlaceName(
      nearest.poi.name||
      nearest.poi.place||
      nearest.poi.address||
      `${prefix}-locatie`
    );
  }

  const latitude=Number(point?.lat);
  const longitude=Number(point?.lon);

  if(Number.isFinite(latitude)&&Number.isFinite(longitude)){
    return `${prefix} ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }

  return `${prefix}-locatie`;
}

async function ensureAutomaticLiveNames(){
  await fillLiveDepartureAndArrival(false);

  const first=liveNavState.points?.[0];
  const last=liveNavState.points?.at(-1);

  if(!String($('liveFrom')?.value||'').trim()){
    $('liveFrom').value=liveFallbackPlaceName(first,'Vertrek');
  }

  if(!String($('liveTo')?.value||'').trim()){
    $('liveTo').value=liveFallbackPlaceName(last,'Aankomst');
  }

  updateLiveRouteTitle();

  return Boolean(
    String($('liveFrom')?.value||'').trim()&&
    String($('liveTo')?.value||'').trim()
  );
}

function liveRouteNearbyPois(maxDistanceKm=.45){
  if(!liveNavState.points?.length||!poiCache.length)return [];

  const sampled=liveNavState.points.filter(
    (_,index)=>index%Math.max(1,Math.floor(liveNavState.points.length/350))===0
  );
  const found=[];

  poiCache.forEach(poi=>{
    const position=getPoiMapPosition(poi);
    if(!position.valid)return;

    let closest=Infinity;

    for(const point of sampled){
      const distance=haversineKm(
        {lat:Number(point.lat),lon:Number(point.lon)},
        {lat:Number(position.lat),lon:Number(position.lon)}
      );

      if(distance<closest)closest=distance;
      if(closest<=maxDistanceKm)break;
    }

    if(closest<=maxDistanceKm){
      found.push({poi,distanceKm:closest});
    }
  });

  return found
    .sort((a,b)=>a.distanceKm-b.distanceKm)
    .slice(0,10)
    .map(item=>item.poi.name||item.poi.place)
    .filter(Boolean);
}

function liveTimeText(value){
  if(!value)return '–';

  return new Date(value).toLocaleTimeString('nl-NL',{
    hour:'2-digit',
    minute:'2-digit'
  });
}

function liveAverageSpeed(){
  const hours=getLiveElapsedMs()/3600000;
  return hours>0
    ?Number(liveNavState.distanceKm||0)/hours
    :0;
}

function buildAutomaticLiveNotes(){
  const nearbyPois=liveRouteNearbyPois();
  const averageSpeed=liveAverageSpeed();

  return [
    String($('liveNotes')?.value||'').trim(),
    'Automatisch vaarlogboek van MijnSerenity',
    `Vertrek: ${liveTimeText(liveNavState.startedAt)}`,
    `Aankomst: ${liveTimeText(liveNavState.endedAt||Date.now())}`,
    `Live opgenomen met MijnSerenity · ${liveNavState.points.length} GPS-punten`,
    `Gem. snelheid: ${averageSpeed.toFixed(1)} km/u`,
    `Max. snelheid: ${Number(liveNavState.maxSpeedKmh||0).toFixed(1)} km/u`,
    Number(liveNavState.engineRpm)>0
      ?`Motortoerental: ${Math.round(Number(liveNavState.engineRpm))} tpm`
      :'',
    `Roerstand: ${formatRudderAngle(liveNavState.rudderAngle)}`,
    nearbyPois.length
      ?`POI’s onderweg: ${nearbyPois.join(' · ')}`
      :'',
    liveNavState.weather
      ?`Weer: ${weatherCodeDescription(liveNavState.weather.weatherCode)} · ${Number(liveNavState.weather.temperature).toFixed(1)} °C · wind ${formatWindBeaufort(liveNavState.weather.windSpeed,true)} · windstoten ${formatWindBeaufort(liveNavState.weather.windGusts,true)}`
      :''
  ].filter(Boolean).join('\n');
}

function renderLiveAutoSummary(){
  const container=$('liveAutoSummary');
  if(!container)return;

  if(
    liveNavState.status!=='stopped'||
    liveNavState.points.length<2
  ){
    container.classList.add('hidden');
    container.innerHTML='';
    return;
  }

  const durationHours=getLiveElapsedMs()/3600000;
  const fuelLiters=durationHours&&settingsCache?.fuel_per_hour
    ?durationHours*Number(settingsCache.fuel_per_hour)
    :0;
  const fuelCost=fuelLiters&&settingsCache?.fuel_price
    ?fuelLiters*Number(settingsCache.fuel_price)
    :0;
  const nearbyPois=liveRouteNearbyPois();

  container.innerHTML=`
    <div>
      <span>Route</span>
      <strong>${esc($('liveTitle')?.value||'Wordt bepaald')}</strong>
    </div>
    <div>
      <span>Afstand</span>
      <strong>${Number(liveNavState.distanceKm||0).toFixed(2)} km</strong>
    </div>
    <div>
      <span>Vaartijd</span>
      <strong>${formatLiveDuration(getLiveElapsedMs())}</strong>
    </div>
    <div>
      <span>Gemiddeld</span>
      <strong>${liveAverageSpeed().toFixed(1)} km/u</strong>
    </div>
    <div>
      <span>Brandstof</span>
      <strong>${fuelLiters?fuelLiters.toFixed(1)+' l':'–'}</strong>
    </div>
    <div>
      <span>Kosten</span>
      <strong>${fuelCost?formatEuro(fuelCost):'–'}</strong>
    </div>
    ${nearbyPois.length
      ?`<p><b>POI’s onderweg:</b> ${esc(nearbyPois.join(' · '))}</p>`
      :''}
  `;

  container.classList.remove('hidden');
}

function clearLiveAutoStopTimer(){
  if(liveAutoStopTimer){
    clearTimeout(liveAutoStopTimer);
    liveAutoStopTimer=null;
  }
}

function updateLiveAutoStopDetection(point){
  const settings=readLiveAutomationSettings();
  const speed=Number(liveNavState.speedKmh||0);
  const now=Number(point?.time)||Date.now();

  if(
    liveNavState.status!=='active'||
    !settings.autoStop||
    liveNavState.autoStopTriggered
  ){
    clearLiveAutoStopTimer();
    return;
  }

  if(speed>=1.5){
    liveNavState.movingDetected=true;
    liveNavState.lastMovingAt=now;
    liveNavState.stationarySince=null;
    clearLiveAutoStopTimer();
    setLiveAutoLogStatus('Varen gedetecteerd · automatische opname actief.','success');
    return;
  }

  if(
    !liveNavState.movingDetected||
    !liveTripQualifiesForAutoSave()
  ){
    return;
  }

  if(!liveNavState.stationarySince){
    liveNavState.stationarySince=now;
  }

  const stillMs=now-Number(liveNavState.stationarySince);
  const stopMs=Number(settings.autoStopMinutes||15)*60000;
  const remainingMs=Math.max(0,stopMs-stillMs);

  setLiveAutoLogStatus(
    remainingMs>0
      ?`Mogelijk afgemeerd · automatisch stoppen over ${Math.ceil(remainingMs/60000)} min als Serenity stil blijft.`
      :'Afmeren gedetecteerd · opname automatisch afronden…',
    'warning'
  );

  clearLiveAutoStopTimer();

  if(remainingMs<=0){
    liveNavState.autoStopTriggered=true;
    persistLiveState();
    stopLiveNavigation({automatic:true});
    return;
  }

  liveAutoStopTimer=setTimeout(()=>{
    if(
      liveNavState.status==='active'&&
      liveNavState.stationarySince&&
      Number(liveNavState.speedKmh||0)<1.5
    ){
      liveNavState.autoStopTriggered=true;
      persistLiveState();
      stopLiveNavigation({automatic:true});
    }
  },Math.min(remainingMs+500,60000));
}

async function initLiveMode(){
  if(!currentBoat){
    alert('Koppel eerst Serenity.');
    captainNavigate(
      isAppAdmin()?'boat':'settings'
    );
    return;
  }

  restoreLiveState();
  fillLiveTripDefaults(false);
  loadLiveAutomationSettings();

  if(!technicalStateCache){
    technicalStateCache=readTechnicalLocalState();
  }

  await loadTechnicalDashboard(false);
  startLiveTechnicalSync();

  ensureLiveMap();
  renderLiveState();
  renderLiveTechnicalStrip();
  renderLiveAutoSummary();
  renderLiveRadarCamera();

  setTimeout(()=>{
    liveMap?.invalidateSize({pan:false});
    renderLiveRoute();
  },160);

  setTimeout(()=>{
    if(typeof window.ms733InitLiveCameras==='function'){
      window.ms733InitLiveCameras();
      return;
    }
    if(typeof window.ms732InitLiveCameras==='function'){
      window.ms732InitLiveCameras();
      return;
    }
    if(radarCameraLiveUrl()){
      startRadarLiveStream(false);
    }else{
      renderLiveRadarCamera();
    }
  },300);
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

function normaliseLiveHeading(value){
  const heading=Number(value);
  if(!Number.isFinite(heading))return null;
  return ((heading%360)+360)%360;
}

function smoothLiveHeading(current,target,factor=.3){
  const next=normaliseLiveHeading(target);
  if(!Number.isFinite(next))return current;
  if(!Number.isFinite(current))return next;

  const difference=((next-current+540)%360)-180;
  return normaliseLiveHeading(current+difference*factor);
}

function liveBearingDegrees(a,b){
  const lat1=Number(a?.lat)*Math.PI/180;
  const lat2=Number(b?.lat)*Math.PI/180;
  const dLon=(Number(b?.lon)-Number(a?.lon))*Math.PI/180;
  if(![lat1,lat2,dLon].every(Number.isFinite))return null;

  const y=Math.sin(dLon)*Math.cos(lat2);
  const x=Math.cos(lat1)*Math.sin(lat2)-
    Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
  return normaliseLiveHeading(Math.atan2(y,x)*180/Math.PI);
}

function liveHeadingCardinal(value){
  const heading=normaliseLiveHeading(value);
  if(!Number.isFinite(heading))return '–';
  const directions=['N','NO','O','ZO','Z','ZW','W','NW'];
  return directions[Math.round(heading/45)%8];
}

function renderLiveHeading(){
  const heading=normaliseLiveHeading(liveNavState.headingDeg);
  const text=$('liveHeadingText');
  const degrees=$('liveHeadingDegrees');
  const needle=$('liveHeadingNeedle');

  if(!Number.isFinite(heading)){
    if(text)text.textContent='–';
    if(degrees)degrees.textContent='Koers wordt via GPS bepaald';
    if(needle)needle.style.transform='translate(-50%,-82%) rotate(0deg)';
    return;
  }

  if(text)text.textContent=liveHeadingCardinal(heading);
  if(degrees){
    degrees.textContent=`${Math.round(heading).toString().padStart(3,'0')}° · ${liveNavState.headingSource||'GPS'}`;
  }
  if(needle){
    needle.style.transform=`translate(-50%,-82%) rotate(${heading}deg)`;
  }
}

function liveTechnicalNumber(value,digits=1,suffix=''){
  if(value===null||value===undefined||value==='')return `–${suffix}`;
  const number=Number(value);
  return Number.isFinite(number)
    ?`${number.toLocaleString('nl-NL',{maximumFractionDigits:digits})}${suffix}`
    :`–${suffix}`;
}

function renderLiveTechnicalStrip(){
  const state=normaliseTechnicalState(
    technicalStateCache||readTechnicalLocalState()
  );
  const setText=(id,value)=>{if($(id))$(id).textContent=value;};

  setText('liveHouseVoltage',liveTechnicalNumber(state.houseVoltage,2,' V'));
  setText('liveStartVoltage',liveTechnicalNumber(state.startVoltage,2,' V'));
  setText('liveFuelPct',(state.fuelPct!==null&&state.fuelPct!==''&&Number.isFinite(Number(state.fuelPct)))?`${Math.round(state.fuelPct)}%`:'–%');
  setText('liveWaterPct',(state.waterPct!==null&&state.waterPct!==''&&Number.isFinite(Number(state.waterPct)))?`${Math.round(state.waterPct)}%`:'–%');
  setText('liveSolarPower',liveTechnicalNumber(state.solarPower,0,' W'));
  setText('liveShorePower',state.shorePower?'Aan':'Uit');
  setText('liveEngineTemp',liveTechnicalNumber(state.engineTemp,1,' °C'));
  setText('liveOilPressure',liveTechnicalNumber(state.oilPressure,1,' bar'));
  setText('liveBilge',({ok:'In orde',active:'Actief',alarm:'ALARM',unknown:'Onbekend'})[state.bilge]||'Onbekend');

  const updated=$('liveTechnicalUpdated');
  if(updated){
    updated.textContent=state.updatedAt
      ?`Bijgewerkt ${new Date(state.updatedAt).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}`
      :'Lokale boorddata';
    updated.classList.toggle('live',Boolean(state.updatedAt));
  }
}

async function refreshLiveTechnicalData(showFeedback=false){
  if(showFeedback)showAppToast('Boorddata vernieuwen…');
  await loadTechnicalDashboard(true);
  renderLiveTechnicalStrip();
  if(showFeedback)showAppToast('Boorddata bijgewerkt');
}

function startLiveTechnicalSync(){
  stopLiveTechnicalSync();
  liveTechnicalSyncTimer=setInterval(()=>{
    if(
      !document.hidden&&
      !$('live')?.classList.contains('hidden')
    ){
      refreshLiveTechnicalData(false);
    }
  },30000);
}

function stopLiveTechnicalSync(){
  if(liveTechnicalSyncTimer){
    clearInterval(liveTechnicalSyncTimer);
    liveTechnicalSyncTimer=null;
  }
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

  const signal=$('liveSpeedSignal');
  if(signal){
    signal.className='live-signal-dot '+(
      status==='active'&&Number(liveNavState.speedKmh)>=.6
        ?'moving'
        :status==='active'
          ?'active'
          :'idle'
    );
  }

  renderLiveHeading();
  renderLiveTechnicalStrip();
  renderLiveWeather();
  renderLiveInstruments();
  updateLiveAutoLogUi();

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
  $('liveSaveButton').classList.toggle(
    'hidden',
    status!=='stopped'||
    liveNavState.points.length<2||
    liveAutoSaveRunning
  );
  $('liveDiscardButton').classList.toggle('hidden',status==='idle'||liveAutoSaveRunning);

  if(status==='active'&&!liveTimerId){
    liveTimerId=setInterval(renderLiveState,1000);
  }else if(status!=='active'&&liveTimerId){
    clearInterval(liveTimerId);
    liveTimerId=null;
  }

  renderLiveAutoSummary();
  renderLiveRadarCamera();
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

  clearLiveAutoStopTimer();
  liveAutoSaveRunning=false;
  liveNavState=createEmptyLiveState();
  liveLastReliableSpeedAt=0;
  liveSmoothedSpeedKmh=0;
  liveSmoothedHeadingDeg=null;
  liveNavState.status='active';
  liveNavState.startedAt=Date.now();
  liveNavState.segmentStartedAt=Date.now();

  fillLiveTripDefaults(true);
  if($('livePhotos'))$('livePhotos').value='';
  $('liveSaveStatus').classList.add('hidden');
  $('liveAutoSummary')?.classList.add('hidden');
  $('liveGpsStatus').textContent='GPS-opname gestart. Waterkaarten wordt geopend…';
  setLiveAutoLogStatus('GPS-opname actief · route en logboek worden automatisch opgebouwd.','success');

  persistLiveState();
  startLiveGpsWatch();
  requestLiveWakeLock();
  renderLiveState();

  showAppToast('Live varen gestart · automatisch vaarlogboek actief');

  setTimeout(()=>{
    openWaterkaarten();
  },350);
}

function resumeLiveNavigation(){
  if(liveNavState.status!=='paused')return;

  liveNavState.status='active';
  liveNavState.segmentStartedAt=Date.now();
  liveNavState.stationarySince=null;
  liveNavState.autoStopTriggered=false;
  $('liveGpsStatus').textContent='GPS-signaal zoeken…';
  setLiveAutoLogStatus('Opname hervat · automatisch vaarlogboek actief.','success');
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
  liveNavState.stationarySince=null;
  clearLiveAutoStopTimer();
  stopLiveGpsWatch();
  releaseLiveWakeLock();
  $('liveGpsStatus').textContent='Opname gepauzeerd.';
  setLiveAutoLogStatus('Opname gepauzeerd · automatische afmeerdetectie staat stil.','warning');
  persistLiveState();
  renderLiveState();
}

async function stopLiveNavigation(options={}){
  const automatic=Boolean(options.automatic);

  if(liveNavState.status==='active'){
    liveNavState.accumulatedMs=getLiveElapsedMs();
  }

  liveNavState.endedAt=Date.now();
  liveNavState.segmentStartedAt=null;
  liveNavState.status='stopped';
  liveNavState.speedKmh=0;
  liveNavState.stationarySince=null;
  clearLiveAutoStopTimer();
  stopLiveGpsWatch();
  releaseLiveWakeLock();
  persistLiveState();
  renderLiveState();

  const saveButton=$('liveSaveButton');
  if(saveButton)saveButton.disabled=true;

  if(liveNavState.points.length>=2){
    $('liveGpsStatus').textContent=automatic
      ?'Afmeren gedetecteerd. Automatisch logboek wordt afgerond…'
      :'Opname gereed. Vertrek en aankomst worden bepaald…';

    await ensureAutomaticLiveNames();
    renderLiveAutoSummary();

    const settings=readLiveAutomationSettings();

    if(settings.autoSave&&liveTripQualifiesForAutoSave()){
      setLiveAutoLogStatus(
        'Route compleet · automatisch opslaan in het gedeelde logboek…',
        'success'
      );

      if(saveButton)saveButton.disabled=false;
      await saveLiveTrip({automatic:true});
      return;
    }

    if(settings.autoSave&&!liveTripQualifiesForAutoSave()){
      $('liveGpsStatus').textContent=
        'Opname is te kort voor automatisch opslaan. Controleer de gegevens en sla handmatig op.';
      setLiveAutoLogStatus(
        `Niet automatisch opgeslagen: minimaal ${settings.minDistanceKm} km en ${settings.minDurationMinutes} minuten nodig.`,
        'warning'
      );
    }else{
      $('liveGpsStatus').textContent=
        'Opname gereed. Controleer vertrek en aankomst en sla de vaartocht op.';
      setLiveAutoLogStatus('Opname gereed voor handmatig opslaan.','warning');
    }
  }else{
    $('liveGpsStatus').textContent=
      'Te weinig GPS-punten. Laat de opname iets langer lopen.';
    setLiveAutoLogStatus('Te weinig GPS-gegevens voor een logboekitem.','error');
    updateLiveRouteTitle();
  }

  if(saveButton)saveButton.disabled=false;
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

function windKmhToBeaufort(kmh){
  const speed=Math.max(0,Number(kmh)||0);
  const limits=[1,6,12,20,29,39,50,62,75,89,103,118];
  for(let bft=0;bft<limits.length;bft+=1){
    if(speed<limits[bft])return bft;
  }
  return 12;
}

function formatWindBeaufort(kmh,includeKmh=true){
  if(!Number.isFinite(Number(kmh)))return '–';
  const speed=Math.max(0,Number(kmh));
  const bft=windKmhToBeaufort(speed);
  return includeKmh
    ?`${bft} Bft · ${speed.toFixed(1)} km/u`
    :`${bft} Bft`;
}

function weatherSummary(weather){
  if(!weather)return 'Wachten op GPS';
  const description=weatherCodeDescription(weather.weatherCode);
  const wind=Number.isFinite(Number(weather.windSpeed))
    ?formatWindBeaufort(weather.windSpeed,false)
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
    ?formatWindBeaufort(weather.windSpeed,true)
    :'–';
  $('liveWeatherGusts').textContent=weather&&Number.isFinite(Number(weather.windGusts))
    ?formatWindBeaufort(weather.windGusts,true)
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
        'wind_gusts_10m',
        'wind_direction_10m'
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
      windGusts:Number(current.wind_gusts_10m),
      windDirection:Number(current.wind_direction_10m)
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
  const rudder=Math.max(-35,Math.min(35,Number(liveNavState.rudderAngle)||0));
  const rudderText=formatRudderAngle(rudder);

  $('liveEngineRpm').textContent=Math.round(rpm).toLocaleString('nl-NL');
  $('liveRudderDisplay').textContent=rudderText;

  const rpmDial=document.querySelector('.live-rpm-dial');
  if(rpmDial){
    rpmDial.classList.remove('rpm-green','rpm-yellow','rpm-red');
    rpmDial.classList.add(rpm<=1800?'rpm-green':rpm<=2300?'rpm-yellow':'rpm-red');
  }

  const rpmNeedle=$('liveRpmNeedle');
  if(rpmNeedle){
    const rpmAngle=-120+(Math.min(5000,rpm)/5000)*240;
    rpmNeedle.style.transform=`translate(-50%,-90%) rotate(${rpmAngle}deg)`;
  }

  const helmWheel=$('liveHelmWheel');
  if(helmWheel){
    helmWheel.setAttribute('transform',`rotate(${rudder*2.2} 180 143)`);
  }

  const helmRudder=$('liveHelmRudderIndicator');
  if(helmRudder){
    helmRudder.setAttribute('transform',`rotate(${rudder} 180 202)`);
  }

  const helmText=$('liveHelmSideText');
  if(helmText){
    helmText.textContent=Math.abs(rudder)<1
      ?'Serenity vaart rechtuit'
      :rudder<0
        ?`Koerscorrectie naar bakboord · ${Math.abs(rudder).toFixed(0)}°`
        :`Koerscorrectie naar stuurboord · ${rudder.toFixed(0)}°`;
  }

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
    speed:Number.isFinite(coords.speed)?Math.max(0,coords.speed*3.6):null,
    heading:Number.isFinite(coords.heading)?normaliseLiveHeading(coords.heading):null
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

    if(calculatedSpeed>180||segmentKm>5){
      $('liveGpsStatus').textContent='Onwaarschijnlijke GPS-sprong overgeslagen.';
      renderLiveState();
      return;
    }

    const movementHeading=(segmentKm>=0.0015&&calculatedSpeed>=0.8)
      ?liveBearingDegrees(previous,point)
      :null;
    const gpsHeading=(Number.isFinite(point.heading)&&Number(point.speed)>=0.8)
      ?point.heading
      :null;
    const headingCandidate=Number.isFinite(gpsHeading)
      ?gpsHeading
      :movementHeading;

    if(Number.isFinite(headingCandidate)){
      liveSmoothedHeadingDeg=smoothLiveHeading(
        liveSmoothedHeadingDeg,
        headingCandidate,
        .32
      );
      liveNavState.headingDeg=liveSmoothedHeadingDeg;
      liveNavState.headingSource=Number.isFinite(gpsHeading)
        ?'GPS-kompas'
        :'GPS-route';
    }

    // iPad/Safari geeft soms afwisselend een geldige snelheid en 0 km/u door.
    // Gebruik daarom GPS-snelheid én verplaatsing, met lichte demping en een korte hold.
    const gpsSpeed=Number.isFinite(point.speed)?point.speed:null;
    const gpsSpeedUsable=Number.isFinite(gpsSpeed)&&Number(point.accuracy||999)<=50;
    // Gebruik Garmin/iOS Doppler-snelheid direct wanneer die beschikbaar is.
    // Alleen bij een ontbrekende of tijdelijke nulmeting gebruiken we de
    // snelheid uit de verplaatsing tussen twee GPS-punten.
    const candidateSpeed=(gpsSpeedUsable&&gpsSpeed>=0.3)
      ?gpsSpeed
      :(Number.isFinite(calculatedSpeed)?calculatedSpeed:0);
    const now=Date.now();

    if(candidateSpeed>=0.6){
      liveLastReliableSpeedAt=now;
      const difference=Math.abs(candidateSpeed-liveSmoothedSpeedKmh);
      const response=liveSmoothedSpeedKmh<=0
        ?1
        :(candidateSpeed>=45||difference>=8?.72:.5);
      liveSmoothedSpeedKmh=liveSmoothedSpeedKmh>0
        ?(liveSmoothedSpeedKmh*(1-response))+(candidateSpeed*response)
        :candidateSpeed;
      liveNavState.speedKmh=liveSmoothedSpeedKmh;
    }else if(now-liveLastReliableSpeedAt<=5000&&liveSmoothedSpeedKmh>=0.6){
      // Houd de laatste betrouwbare snelheid maximaal 5 seconden vast.
      liveNavState.speedKmh=liveSmoothedSpeedKmh;
    }else{
      liveSmoothedSpeedKmh=0;
      liveNavState.speedKmh=0;
    }

    liveNavState.maxSpeedKmh=Math.max(
      Number(liveNavState.maxSpeedKmh)||0,
      Number(liveNavState.speedKmh)||0
    );

    // Alleen stilstand registreren als zowel GPS-snelheid als verplaatsing laag blijven.
    const trulyStationary=(candidateSpeed<0.6&&segmentKm<0.001&&seconds>=3);
    if(trulyStationary){
      liveSmoothedSpeedKmh=0;
      liveNavState.speedKmh=0;
      $('liveGpsStatus').textContent=`GPS actief · nauwkeurigheid ${Math.round(point.accuracy||0)} m`;
      updateLiveAutoStopDetection(point);
      persistLiveState();
      renderLiveState();
      return;
    }

    liveNavState.distanceKm+=segmentKm;
  }else{
    if(Number.isFinite(point.heading)){
      liveSmoothedHeadingDeg=point.heading;
      liveNavState.headingDeg=point.heading;
      liveNavState.headingSource='GPS-kompas';
    }
    const initialSpeed=Number.isFinite(point.speed)?point.speed:0;
    if(initialSpeed>=0.6){
      liveLastReliableSpeedAt=Date.now();
      liveSmoothedSpeedKmh=initialSpeed;
    }
    liveNavState.speedKmh=liveSmoothedSpeedKmh;
    liveNavState.maxSpeedKmh=Math.max(
      Number(liveNavState.maxSpeedKmh)||0,
      Number(liveNavState.speedKmh)||0
    );
  }

  liveNavState.points.push(point);
  if(liveNavState.points.length>20000){
    liveNavState.points=liveNavState.points.filter((_,index)=>index%2===0);
  }

  $('liveGpsStatus').textContent=`${liveNavState.gpsSource||'GPS actief'} · ${liveNavState.points.length} routepunten · nauwkeurigheid ${Math.round(point.accuracy||0)} m${Number(liveNavState.gpsRateHz)>0?` · ${Number(liveNavState.gpsRateHz).toFixed(1)}/sec`:''}`;
  updateLiveAutoStopDetection(point);
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
    `<trkpt lat="${Number(point.lat).toFixed(7)}" lon="${Number(point.lon).toFixed(7)}">`+
    `<time>${new Date(point.time).toISOString()}</time></trkpt>`
  ).join('');

  const photoWaypoints=(
    typeof ms681PendingPhotoUploads==='function'
      ?ms681PendingPhotoUploads()
      :[]
  )
    .filter(photo=>
      Number.isFinite(Number(photo.latitude))&&
      Number.isFinite(Number(photo.longitude))
    )
    .map((photo,index)=>
      `<wpt lat="${Number(photo.latitude).toFixed(7)}" `+
      `lon="${Number(photo.longitude).toFixed(7)}">`+
      `<name>${xmlEscape(photo.description||`Routefoto ${index+1}`)}</name>`+
      `<desc>${xmlEscape(photo.description||'Foto onderweg')}</desc>`+
      `<time>${new Date(photo.capturedAt||Date.now()).toISOString()}</time>`+
      `<type>Routefoto</type></wpt>`
    ).join('');

  const safeTitle=xmlEscape(title||'Live vaartocht');
  const gpx=`<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MijnSerenity 7.4.4"
 xmlns="http://www.topografix.com/GPX/1/1">
 <metadata><name>${safeTitle}</name></metadata>
 ${photoWaypoints}
 <trk><name>${safeTitle}</name><trkseg>${points}</trkseg></trk>
</gpx>`;

  const filename=String(title||'live-vaartocht')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9_-]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,60)||'live-vaartocht';

  return new File(
    [gpx],
    `${filename}.gpx`,
    {type:'application/gpx+xml'}
  );
}

async function saveLiveTrip(options={}){
  const automatic=Boolean(options.automatic);

  if(liveAutoSaveRunning)return;

  if(!currentBoat||!currentUser){
    if(!automatic)alert('Log opnieuw in.');
    return;
  }

  if(liveNavState.status!=='stopped'||liveNavState.points.length<2){
    if(!automatic){
      alert('Stop eerst de opname en zorg voor minimaal twee GPS-punten.');
    }
    return;
  }

  const saveStatus=$('liveSaveStatus');
  const saveButton=$('liveSaveButton');

  liveAutoSaveRunning=true;
  saveStatus.textContent=automatic
    ?'Automatisch vaarlogboek wordt opgebouwd…'
    :'Vertrek en aankomst controleren…';
  saveStatus.classList.remove('hidden');
  saveButton.disabled=true;
  renderLiveState();

  try{
    await ensureAutomaticLiveNames();

    if(!validateLiveDepartureAndArrival()){
      throw new Error('Vertrek en aankomst konden niet worden bepaald.');
    }

    const departure=cleanLivePlaceName($('liveFrom').value);
    const arrival=cleanLivePlaceName($('liveTo').value);

    $('liveFrom').value=departure;
    $('liveTo').value=arrival;

    const title=`${departure} - ${arrival}`;
    $('liveTitle').value=title;

    saveStatus.textContent=`${title} opslaan…`;
    setLiveAutoLogStatus('Logboekitem, route en foto’s worden opgeslagen…','success');

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
      trip_date:localDateISO(
        new Date(liveNavState.startedAt||Date.now())
      ),
      title,
      departure,
      arrival,
      distance_km:Number(liveNavState.distanceKm.toFixed(2)),
      duration_hours:Number(durationHours.toFixed(2)),
      crew:$('liveCrew').value.trim()||'Michel, Desi',
      notes:buildAutomaticLiveNotes(),
      fuel_liters:fuelLiters?Number(fuelLiters.toFixed(2)):null,
      fuel_cost:fuelCost?Number(fuelCost.toFixed(2)):null,
      route_geojson:routeGeojson,
      updated_at:new Date().toISOString()
    };

    const {data,error}=await sb
      .from('trips')
      .insert(row)
      .select('id')
      .single();

    if(error)throw error;

    const tripId=data.id;
    const gpxFile=createLiveGpxFile(title);
    const routePath=
      `${currentBoat.id}/${tripId}/${Date.now()}-${gpxFile.name}`;

    const {error:uploadError}=await sb.storage
      .from(TRIP_GPX_BUCKET)
      .upload(routePath,gpxFile,{
        upsert:true,
        contentType:'application/gpx+xml'
      });

    if(!uploadError){
      await sb.from('trips')
        .update({gpx_storage_path:routePath})
        .eq('id',tripId);
    }else{
      console.warn(
        'GPX-bestand uploaden mislukt; route staat wel in het logboek:',
        uploadError
      );
    }

    const photoFiles=ms681PendingPhotoUploads();

    if(photoFiles.length){
      saveStatus.textContent=
        `${title} opgeslagen · ${photoFiles.length} foto${photoFiles.length===1?'':'’s'} toevoegen…`;
      await uploadTripPhotos(tripId,photoFiles);
    }

    saveStatus.textContent='Vaartijd bij motoruren optellen…';

    const engineUpdate=await applyTripDurationToEngineHours({
      tripId,
      durationHours:row.duration_hours,
      title,
      tripDate:row.trip_date,
      isNewTrip:true
    });

    saveStatus.textContent=engineUpdate.applied
      ?`${title} opgeslagen · motoruren +${technicalNumber(engineUpdate.delta,2)} uur ✅`
      :`${title} automatisch opgeslagen ✅`;
    setLiveAutoLogStatus(
      `Vaartocht automatisch opgeslagen: ${Number(liveNavState.distanceKm||0).toFixed(2)} km · ${formatLiveDuration(getLiveElapsedMs())}.`,
      'success'
    );

    await loadTrips();

    const savedTitle=title;
    clearLiveTrip({keepStatus:true});

    showAppToast(
      engineUpdate.applied
        ?`${savedTitle} opgeslagen · motoruren +${technicalNumber(engineUpdate.delta,2)} uur ✅`
        :automatic
          ?`${savedTitle} automatisch in het logboek opgeslagen ✅`
          :`${savedTitle} opgeslagen ✅`
    );

    setTimeout(()=>captainNavigate('logbook'),650);
  }catch(error){
    console.error('Live vaartocht opslaan mislukt:',error);
    saveStatus.textContent=
      'Opslaan mislukt: '+(error?.message||'onbekende fout');
    setLiveAutoLogStatus(
      'Automatisch opslaan is niet gelukt. De GPS-opname blijft lokaal bewaard; probeer handmatig opnieuw.',
      'error'
    );
    liveNavState.status='stopped';
    persistLiveState();
  }finally{
    liveAutoSaveRunning=false;
    saveButton.disabled=false;
    renderLiveState();
  }
}

function discardLiveTrip(){
  if(!confirm('Deze live opname definitief wissen?'))return;
  clearLiveTrip();
}

function clearLiveTrip(options={}){
  const keepStatus=Boolean(options.keepStatus);

  stopLiveGpsWatch();
  clearLiveAutoStopTimer();
  releaseLiveWakeLock();
  liveAutoSaveRunning=false;
  liveNavState=createEmptyLiveState();
  localStorage.removeItem(liveStorageKey());

  [
    'liveTitle',
    'liveCrew',
    'liveFrom',
    'liveTo',
    'liveNotes'
  ].forEach(id=>{
    if($(id))$(id).value='';
  });

  if($('livePhotos'))$('livePhotos').value='';

  $('liveSaveStatus').classList.add('hidden');
  $('liveAutoSummary')?.classList.add('hidden');
  $('liveAutoSummary').innerHTML='';

  $('liveGpsStatus').textContent=
    'Tik op Start varen. MijnSerenity start de GPS-opname en opent daarna Waterkaarten. Open beide schermen op de iPad in Split View en laat beide schermen open totdat de reis is opgeslagen.';

  $('liveWeatherStatus').textContent=
    'Het weer wordt na het eerste GPS-punt automatisch opgehaald.';

  fillLiveTripDefaults(true);
  loadLiveAutomationSettings();
  updateLiveRouteTitle();

  if(!keepStatus){
    setLiveAutoLogStatus(
      'Klaar om de volgende vaartocht automatisch vast te leggen.'
    );
  }

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


const APP_VERSION='7.4.4';
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
    const registration=await navigator.serviceWorker.register('/sw.js?v=7440',{updateViaCache:'none'});

    await registration.update();

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

    setInterval(()=>registration.update(),5*60*1000);
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
    averageSpeed:'',
    maxSpeed:'',
    engineRpm:'',
    rudder:'',
    weather:'',
    startTime:'',
    endTime:'',
    routePois:'',
    automatic:false,
    customNotes:''
  };

  const customLines=[];

  String(notes||'').split(/\r?\n/).forEach(rawLine=>{
    const line=String(rawLine||'').trim();
    if(!line)return;

    if(/^Automatisch vaarlogboek van MijnSerenity$/i.test(line)){
      result.automatic=true;
      return;
    }

    let match=line.match(
      /^Live opgenomen met MijnSerenity\s*·\s*(\d+)\s*GPS-punten$/i
    );
    if(match){
      result.gpsPoints=match[1];
      return;
    }

    match=line.match(/^Gem\.\s*snelheid:\s*(.+)$/i);
    if(match){
      result.averageSpeed=match[1].trim();
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

    match=line.match(/^Vertrek:\s*(.+)$/i);
    if(match){
      result.startTime=match[1].trim();
      return;
    }

    match=line.match(/^Aankomst:\s*(.+)$/i);
    if(match){
      result.endTime=match[1].trim();
      return;
    }

    match=line.match(/^POI’s onderweg:\s*(.+)$/i);
    if(match){
      result.routePois=match[1].trim();
      return;
    }

    customLines.push(line);
  });

  result.customNotes=customLines.join('\n');
  return result;
}

function renderLiveTripMetricBalloons(metrics){
  if(!metrics)return '';

  const items=[
    metrics.automatic
      ?['🤖','Automatisch logboek']
      :null,
    metrics.startTime&&metrics.endTime
      ?['🕒',`${metrics.startTime} → ${metrics.endTime}`]
      :null,
    metrics.gpsPoints
      ?['📍',`${metrics.gpsPoints} GPS-punten`]
      :null,
    metrics.averageSpeed
      ?['≈',`Gem. ${metrics.averageSpeed}`]
      :null,
    metrics.maxSpeed
      ?['↗',`Max. ${metrics.maxSpeed}`]
      :null,
    metrics.engineRpm
      ?['⚙️',metrics.engineRpm]
      :null,
    metrics.rudder
      ?['🛞',metrics.rudder]
      :null,
    metrics.weather
      ?['🌤️',metrics.weather]
      :null,
    metrics.routePois
      ?['🧭',metrics.routePois]
      :null
  ].filter(Boolean);

  if(!items.length)return '';

  return `
    <div class="live-trip-metric-balloons">
      ${items.map(([icon,text])=>`
        <span>
          <b>${icon}</b>
          ${esc(text)}
        </span>
      `).join('')}
    </div>
  `;
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
      <div class="trip-photo-wrap ms681-saved-photo">
        <img src="${STORAGE_SAFE_PLACEHOLDER}"
          class="storage-safe-image"
          loading="lazy" decoding="async"
          data-storage-bucket="${esc(TRIP_PHOTO_BUCKET)}"
          data-storage-path="${esc(ph.storage_path)}"
          alt="Foto van ${esc(t.title||'vaarttocht')}"
          onclick='openStorageLightbox(${JSON.stringify(TRIP_PHOTO_BUCKET)},${JSON.stringify(ph.storage_path)},this)'>
        ${Number.isFinite(Number(ph.latitude))&&Number.isFinite(Number(ph.longitude))
          ?'<span class="ms681-photo-location-badge">📍 Routefoto</span>'
          :''}
        <button class="trip-photo-delete"
          onclick="deleteTripPhoto('${ph.id}','${esc(ph.storage_path)}')">×</button>
        <div class="ms681-saved-photo-caption">
          <span>${esc(ph.description||'Foto onderweg')}</span>
          <button type="button" class="secondary"
            onclick='ms681EditSavedPhotoDescription(
              ${JSON.stringify(ph.id)},
              ${JSON.stringify(ph.description||'')},
              ${JSON.stringify(t.id)}
            )'>✏️</button>
        </div>
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


/* MijnSerenity Cloud 7.4.4 — vaste onderste navigatie */
let bottomNavHideTimer=null;
let bottomNavActivityFrame=null;

function bottomNavigationElement(){
  return document.querySelector('.bottom-nav');
}

function scrollActiveBottomNavigationIntoView(
  preferredItem=null,
  smooth=true
){
  const nav=bottomNavigationElement();
  if(!nav)return;

  const item=
    preferredItem?.classList?.contains('bottom-nav-item')
      ?preferredItem
      :nav.querySelector('.bottom-nav-item.active');

  if(!item)return;

  const itemCenter=
    item.offsetLeft+
    item.offsetWidth/2;
  const maxLeft=Math.max(
    0,
    nav.scrollWidth-nav.clientWidth
  );
  const targetLeft=Math.max(
    0,
    Math.min(
      itemCenter-nav.clientWidth/2,
      maxLeft
    )
  );

  nav.scrollTo({
    left:targetLeft,
    top:0,
    behavior:smooth?'smooth':'auto'
  });
}

function forceBottomNavigationVisible(
  focusActive=false,
  smooth=false
){
  const nav=bottomNavigationElement();
  if(!nav)return;

  clearTimeout(bottomNavHideTimer);

  nav.classList.remove(
    'bottom-nav-auto-hidden'
  );
  nav.classList.add(
    'bottom-nav-always-visible',
    'bottom-nav-viewport-fixed'
  );
  nav.dataset.autoHide='false';
  nav.setAttribute(
    'aria-hidden',
    'false'
  );

  if(focusActive){
    requestAnimationFrame(()=>{
      scrollActiveBottomNavigationIntoView(
        null,
        smooth
      );
    });
  }
}

/* Bestaande aanroepen mogen de navigatie niet meer verbergen. */
function hideBottomNavigation(){
  forceBottomNavigationVisible(
    false,
    false
  );
}

function scheduleBottomNavigationHide(){
  clearTimeout(bottomNavHideTimer);
  forceBottomNavigationVisible(
    false,
    false
  );
}

function showBottomNavigation(
  focusActive=true,
  smooth=true
){
  forceBottomNavigationVisible(
    focusActive,
    smooth
  );
}

function bottomNavigationActivity(
  focusActive=true
){
  if(bottomNavActivityFrame)return;

  bottomNavActivityFrame=
    requestAnimationFrame(()=>{
      bottomNavActivityFrame=null;
      forceBottomNavigationVisible(
        focusActive,
        false
      );
    });
}

function initAutoHideBottomNavigation(){
  const nav=bottomNavigationElement();

  if(!nav)return;

  nav.dataset.autoHideReady='fixed';
  nav.dataset.autoHide='false';

  forceBottomNavigationVisible(
    true,
    false
  );

  if(
    nav.dataset.fixedClickReady!=='true'
  ){
    nav.dataset.fixedClickReady='true';

    nav.addEventListener(
      'click',
      event=>{
        const item=
          event.target.closest(
            '.bottom-nav-item'
          );

        forceBottomNavigationVisible(
          false,
          false
        );

        if(item){
          requestAnimationFrame(()=>{
            scrollActiveBottomNavigationIntoView(
              item,
              true
            );
          });
        }
      }
    );
  }
}

if(document.readyState==='loading'){
  document.addEventListener(
    'DOMContentLoaded',
    initAutoHideBottomNavigation,
    {once:true}
  );
}else{
  initAutoHideBottomNavigation();
}

window.addEventListener(
  'pageshow',
  ()=>{
    forceBottomNavigationVisible(
      true,
      false
    );
  },
  {passive:true}
);

document.addEventListener(
  'visibilitychange',
  ()=>{
    if(!document.hidden){
      forceBottomNavigationVisible(
        false,
        false
      );
    }
  }
);



/* MijnSerenity Cloud 7.4.4 — Waterkaarten Bridge + gedeelde live vaarkaart */
let ms640CloudReady=false;
let ms640Viewing=false;
let ms640SyncTimer=null;
let ms640SyncBusy=false;
let ms640LastSentAt=0;
let ms640LastReceivedAt=0;
let ms640Channel=null;
let ms640InitTimer=null;

function ms640DeviceId(){
  const key='mijnserenity-device-id';
  let value=localStorage.getItem(key);
  if(!value){
    value=globalThis.crypto?.randomUUID?.()||`device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key,value);
  }
  return value;
}

function ms640SessionId(){
  return globalThis.crypto?.randomUUID?.()||`live-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ms640IsController(){
  return Boolean(liveNavState?.controllerDeviceId&&liveNavState.controllerDeviceId===ms640DeviceId());
}

function ms640SetUi(title,detail,state='ready'){
  const t=$('liveCloudStatus'), d=$('liveCloudDetail'), b=$('liveCloudBadge');
  if(t)t.textContent=title;
  if(d)d.textContent=detail;
  if(b){
    b.className=`live-cloud-badge ${state}`;
    b.textContent={checking:'Controleren',ready:'Gereed',live:'● Live',viewing:'Meekijken',offline:'SQL nodig',error:'Storing'}[state]||'Cloud';
  }
}

function ms640TableMissing(error){
  const text=String(error?.message||error?.details||error?.hint||'').toLowerCase();
  return text.includes('live_navigation_state')&&(text.includes('does not exist')||text.includes('schema cache')||text.includes('relation'));
}

function ms640CompactPoints(points){
  const valid=(Array.isArray(points)?points:[]).filter(p=>Number.isFinite(Number(p?.lat))&&Number.isFinite(Number(p?.lon)));
  if(valid.length<=2)return valid;
  const out=[valid[0]];
  let previous=valid[0];
  for(let i=1;i<valid.length-1;i++){
    const point=valid[i];
    const distance=haversineKm(previous,point);
    const timeGap=Math.abs(Number(point.time||0)-Number(previous.time||0));
    if(distance>=0.008||timeGap>=5000){out.push(point);previous=point;}
  }
  out.push(valid.at(-1));
  if(out.length<=1500)return out;
  const step=Math.ceil(out.length/1500);
  return out.filter((p,i)=>i===0||i===out.length-1||i%step===0);
}

function ms640FormData(){
  return {
    title:String($('liveTitle')?.value||''),
    crew:String($('liveCrew')?.value||''),
    departure:String($('liveFrom')?.value||''),
    arrival:String($('liveTo')?.value||''),
    notes:String($('liveNotes')?.value||'')
  };
}

function ms640ApplyForm(form={}){
  const map={liveTitle:form.title,liveCrew:form.crew,liveFrom:form.departure,liveTo:form.arrival,liveNotes:form.notes};
  Object.entries(map).forEach(([id,value])=>{
    const element=$(id);
    if(element&&document.activeElement!==element&&value!==undefined&&value!==null)element.value=String(value);
  });
}

function ms640Payload(){
  return {
    ...liveNavState,
    points:ms640CompactPoints(liveNavState.points),
    form:ms640FormData(),
    controllerDeviceId:liveNavState.controllerDeviceId||ms640DeviceId(),
    controllerName:liveNavState.controllerName||getLoggedInFirstName(),
    cloudUpdatedAt:Date.now()
  };
}

function ms640ScheduleSync(immediate=false){
  if(!currentBoat||!currentUser||!ms640CloudReady||!ms640IsController())return;
  clearTimeout(ms640SyncTimer);
  const elapsed=Date.now()-ms640LastSentAt;
  ms640SyncTimer=setTimeout(ms640Sync,immediate?0:Math.max(0,2000-elapsed));
}

async function ms640Sync(){
  if(ms640SyncBusy||!currentBoat||!currentUser||!ms640CloudReady||!ms640IsController())return;
  ms640SyncBusy=true;
  try{
    const {error}=await sb.from('live_navigation_state').upsert({
      boat_id:currentBoat.id,
      session_id:liveNavState.sessionId||null,
      status:liveNavState.status||'idle',
      controller_user_id:currentUser.id,
      controller_device_id:ms640DeviceId(),
      controller_name:liveNavState.controllerName||getLoggedInFirstName(),
      state:ms640Payload(),
      updated_at:new Date().toISOString()
    },{onConflict:'boat_id'});
    if(error)throw error;
    ms640LastSentAt=Date.now();
    ms640SetUi(liveNavState.status==='active'?'Live kaart wordt gedeeld':'Live kaart is gesynchroniseerd',liveNavState.status==='active'?'Alle geopende apparaten ontvangen route en vaargegevens.':'De gedeelde vaarstatus is bijgewerkt.',liveNavState.status==='active'?'live':'ready');
  }catch(error){
    console.error('Live vaarkaart synchroniseren mislukt:',error);
    if(ms640TableMissing(error)){
      ms640CloudReady=false;
      ms640SetUi('Cloud livekaart nog niet geactiveerd','Voer SUPABASE_LIVE_VAARKAART_6_4_0.sql één keer uit.','offline');
    }else{
      ms640SetUi('Synchronisatie tijdelijk onderbroken',error?.message||'MijnSerenity probeert het opnieuw.','error');
    }
  }finally{ms640SyncBusy=false;}
}

function ms640ApplyRow(row){
  if(!row||!currentBoat||row.boat_id!==currentBoat.id)return;
  const updated=Date.parse(row.updated_at||'')||Date.now();
  if(updated<ms640LastReceivedAt)return;
  ms640LastReceivedAt=updated;
  const controllerDeviceId=row.controller_device_id||row.state?.controllerDeviceId||null;
  if(controllerDeviceId===ms640DeviceId()){
    ms640Viewing=false;
    return;
  }
  const incoming={
    ...createEmptyLiveState(),
    ...(row.state||{}),
    sessionId:row.session_id||row.state?.sessionId||null,
    controllerDeviceId,
    controllerName:row.controller_name||row.state?.controllerName||'ander apparaat',
    cloudUpdatedAt:updated,
    points:(Array.isArray(row.state?.points)?row.state.points:[]).filter(p=>Number.isFinite(Number(p?.lat))&&Number.isFinite(Number(p?.lon)))
  };
  ms640Viewing=incoming.status!=='idle';
  if(ms640Viewing){stopLiveGpsWatch();releaseLiveWakeLock();}
  liveNavState=incoming;
  ms640ApplyForm(row.state?.form||{});
  renderLiveState();
  renderLiveRoute();
  const time=new Date(updated).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  ms640SetUi(incoming.status==='active'?`Je kijkt live mee met ${incoming.controllerName}`:incoming.status==='paused'?`${incoming.controllerName} heeft de vaart gepauzeerd`:'Gedeelde vaart bijgewerkt',`${incoming.points.length} routepunten · laatste update ${time}`,incoming.status==='active'?'viewing':'ready');
}

async function ms640LoadCloud(){
  if(!currentBoat||!currentUser)return;
  ms640SetUi('Gedeelde livekaart laden…','Controleren of een ander apparaat aan het varen is.','checking');
  try{
    const {data,error}=await sb.from('live_navigation_state').select('*').eq('boat_id',currentBoat.id).maybeSingle();
    if(error)throw error;
    ms640CloudReady=true;
    if(data)ms640ApplyRow(data);
    else ms640SetUi('Gedeelde livekaart gereed','Start een vaart; andere geopende apparaten volgen automatisch.','ready');
  }catch(error){
    if(ms640TableMissing(error)){
      ms640CloudReady=false;
      ms640SetUi('Cloud livekaart nog niet geactiveerd','Voer SUPABASE_LIVE_VAARKAART_6_4_0.sql één keer uit.','offline');
    }else{
      console.error('Gedeelde livekaart laden mislukt:',error);
      ms640SetUi('Cloud livekaart niet bereikbaar',error?.message||'Probeer het later opnieuw.','error');
    }
  }
}

async function ms640EnsureCloud(){
  if(!currentBoat||!currentUser)return false;
  if(ms640Channel)return true;
  try{
    const {error}=await sb.from('live_navigation_state').select('boat_id').eq('boat_id',currentBoat.id).maybeSingle();
    if(error)throw error;
    ms640CloudReady=true;
    ms640Channel=sb.channel(`live-navigation-${currentBoat.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'live_navigation_state',filter:`boat_id=eq.${currentBoat.id}`},payload=>ms640ApplyRow(payload.new))
      .subscribe();
    await ms640LoadCloud();
    return true;
  }catch(error){
    if(ms640TableMissing(error))ms640SetUi('Cloud livekaart nog niet geactiveerd','Voer SUPABASE_LIVE_VAARKAART_6_4_0.sql één keer uit.','offline');
    return false;
  }
}

const ms640OriginalPersistLiveState=persistLiveState;
persistLiveState=function(){
  if(!ms640Viewing||ms640IsController())ms640OriginalPersistLiveState();
  if(ms640IsController())ms640ScheduleSync(false);
};

const ms640OriginalStartLiveNavigation=startLiveNavigation;
startLiveNavigation=function(){
  ms640Viewing=false;
  ms640OriginalStartLiveNavigation();
  liveNavState.sessionId=ms640SessionId();
  liveNavState.controllerDeviceId=ms640DeviceId();
  liveNavState.controllerName=getLoggedInFirstName();
  persistLiveState();
  ms640ScheduleSync(true);
  showAppToast('Live varen gestart · alle geopende apparaten kunnen meekijken');
};

const ms640OriginalPauseLiveNavigation=pauseLiveNavigation;
pauseLiveNavigation=function(){
  if(!ms640IsController())return;
  const result=ms640OriginalPauseLiveNavigation();
  ms640ScheduleSync(true);
  return result;
};

const ms640OriginalResumeLiveNavigation=resumeLiveNavigation;
resumeLiveNavigation=function(){
  if(!ms640IsController())return;
  const result=ms640OriginalResumeLiveNavigation();
  ms640ScheduleSync(true);
  return result;
};

const ms640OriginalStopLiveNavigation=stopLiveNavigation;
stopLiveNavigation=async function(options={}){
  if(!ms640IsController())return;
  const result=await ms640OriginalStopLiveNavigation(options);
  ms640ScheduleSync(true);
  return result;
};

const ms640OriginalClearLiveTrip=clearLiveTrip;
clearLiveTrip=function(options={}){
  const wasController=ms640IsController();
  const result=ms640OriginalClearLiveTrip(options);
  ms640Viewing=false;
  if(wasController){
    liveNavState.controllerDeviceId=ms640DeviceId();
    liveNavState.controllerName=getLoggedInFirstName();
    ms640ScheduleSync(true);
  }
  return result;
};

const ms640OriginalRenderLiveState=renderLiveState;
renderLiveState=function(){
  const result=ms640OriginalRenderLiveState();
  const status=liveNavState.status||'idle';
  const controller=ms640IsController();
  const remote=ms640Viewing&&['active','paused','stopped'].includes(status);
  $('liveStartButton')?.classList.toggle('hidden',status!=='idle'||remote);
  $('livePauseButton')?.classList.toggle('hidden',status!=='active'||!controller);
  $('liveResumeButton')?.classList.toggle('hidden',status!=='paused'||!controller);
  $('liveStopButton')?.classList.toggle('hidden',!['active','paused'].includes(status)||!controller);
  $('liveTakeoverButton')?.classList.toggle('hidden',!ms640Viewing||!['active','paused'].includes(status));
  $('liveShareRouteButton')?.classList.toggle('hidden',(liveNavState.points||[]).length<2);
  ['liveEngineRpmInput','liveRudderInput','liveCrew','liveFrom','liveTo','liveNotes'].forEach(id=>{if($(id))$(id).disabled=remote;});
  if(controller&&status==='active')ms640SetUi('Dit apparaat deelt de livekaart',`${liveNavState.points.length} routepunten · andere apparaten kijken automatisch mee.`,'live');
  return result;
};

const ms640OriginalInitLiveMode=initLiveMode;
initLiveMode=async function(){
  await ms640OriginalInitLiveMode();
  ['liveCrew','liveFrom','liveTo','liveNotes'].forEach(id=>{
    const element=$(id);
    if(element&&!element.dataset.ms640CloudListener){
      element.dataset.ms640CloudListener='true';
      element.addEventListener('input',()=>ms640ScheduleSync(false),{passive:true});
    }
  });
  await ms640EnsureCloud();
  renderLiveState();
  renderLiveRoute();
};

async function takeOverLiveNavigation(){
  if(!currentBoat||!currentUser)return;
  if(!confirm('De live opname op dit apparaat overnemen? Het andere apparaat wordt daarna meekijker.'))return;
  ms640Viewing=false;
  liveNavState.accumulatedMs=getLiveElapsedMs();
  liveNavState.segmentStartedAt=Date.now();
  liveNavState.status='active';
  liveNavState.controllerDeviceId=ms640DeviceId();
  liveNavState.controllerName=getLoggedInFirstName();
  liveNavState.sessionId=liveNavState.sessionId||ms640SessionId();
  persistLiveState();
  startLiveGpsWatch();
  requestLiveWakeLock();
  renderLiveState();
  ms640ScheduleSync(true);
  showAppToast('Live opname overgenomen op dit apparaat ✅');
}

function ms640Xml(value){
  return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

function ms640FileName(value='serenity-route'){
  return String(value||'serenity-route').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)||'serenity-route';
}

function ms640PlannerGpx(plan){
  const points=(Array.isArray(plan?.points)?plan.points:[]).map(p=>({lat:Number(p?.lat),lon:Number(p?.lon),name:String(p?.label||p?.name||'Routepunt')})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon));
  if(points.length<2)throw new Error('Bereken eerst een route met een vertrekpunt en bestemming.');
  const title=plan?.title||'Serenity vaarroute';
  const route=points.map(p=>`<rtept lat="${p.lat.toFixed(7)}" lon="${p.lon.toFixed(7)}"><name>${ms640Xml(p.name)}</name></rtept>`).join('');
  const gpx=`<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="MijnSerenity" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>${ms640Xml(title)}</name></metadata><rte><name>${ms640Xml(title)}</name>${route}</rte></gpx>`;
  return new File([gpx],`${ms640FileName(title)}.gpx`,{type:'application/gpx+xml'});
}

async function ms640ShareFile(file,title){
  const shareData={
    title,
    text:
      'GPX-route uit MijnSerenity. Deel via AirDrop, Berichten, Mail, '+
      'Bewaar in Bestanden of een app die GPX ondersteunt.',
    files:[file]
  };

  try{
    if(
      navigator.share&&
      (
        !navigator.canShare||
        navigator.canShare(shareData)
      )
    ){
      await navigator.share(shareData);
      return true;
    }
  }catch(error){
    if(error?.name==='AbortError')return false;

    console.warn(
      'iOS-deelvenster kon niet worden geopend:',
      error
    );
  }

  const url=URL.createObjectURL(file);
  const link=document.createElement('a');
  link.href=url;
  link.download=file.name;
  link.rel='noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(
    ()=>URL.revokeObjectURL(url),
    30000
  );

  showAppToast(
    'GPX gedownload. Open Bestanden en tik op Deel om het iOS-deelvenster te openen.'
  );

  return true;
}

async function shareLiveRouteWithWaterkaarten(){
  if((liveNavState.points||[]).length<2){showAppToast('Er zijn nog onvoldoende routepunten om te delen.');return;}
  const title=$('liveTitle')?.value||`${$('liveFrom')?.value||'Vertrek'} - ${$('liveTo')?.value||'Aankomst'}`;
  await ms640ShareFile(createLiveGpxFile(title),title);
}

async function sharePlannerRouteWithWaterkaarten(){
  const plan=plannerCurrentPlan||await calculatePlannerRoute({silent:true});
  if(!plan)return;
  try{await ms640ShareFile(ms640PlannerGpx(plan),plan.title||'Serenity vaarroute');}
  catch(error){showAppToast(error?.message||'De GPX-route kon niet worden gemaakt.');}
}

openFullPlannerRouteInWaterkaarten=async function(){
  await sharePlannerRouteWithWaterkaarten();
};

ms640InitTimer=setInterval(async()=>{
  if(await ms640EnsureCloud()){
    clearInterval(ms640InitTimer);
    ms640InitTimer=null;
  }
},1200);


/* ============================================================
   MijnSerenity Cloud 7.4.4
   Echte waterwegroute + POI's + GPX-track voor Waterkaarten
   ============================================================ */

let ms650SeaMarkLayer=null;
let ms650RoutingRequest=null;

function ms650Coordinate(point){
  if(Array.isArray(point)){
    return {
      lon:Number(point[0]),
      lat:Number(point[1])
    };
  }

  return {
    lat:Number(point?.lat),
    lon:Number(point?.lon)
  };
}

function ms650ValidCoordinate(point){
  const coordinate=ms650Coordinate(point);

  return (
    Number.isFinite(coordinate.lat)&&
    Number.isFinite(coordinate.lon)
  );
}

function ms650RouteDistanceKm(coordinates){
  let total=0;
  const valid=(Array.isArray(coordinates)?coordinates:[])
    .map(ms650Coordinate)
    .filter(ms650ValidCoordinate);

  for(let index=1;index<valid.length;index++){
    total+=haversineKm(
      valid[index-1],
      valid[index]
    );
  }

  return total;
}

function ms650CumulativeDistances(coordinates){
  const valid=(Array.isArray(coordinates)?coordinates:[])
    .map(ms650Coordinate)
    .filter(ms650ValidCoordinate);
  const cumulative=[0];

  for(let index=1;index<valid.length;index++){
    cumulative[index]=
      cumulative[index-1]+
      haversineKm(valid[index-1],valid[index]);
  }

  return {
    coordinates:valid,
    cumulative
  };
}

function ms650NearestRoutePosition(point,routeCoordinates){
  const route=ms650CumulativeDistances(routeCoordinates);

  if(!route.coordinates.length){
    return {
      distanceKm:Infinity,
      routeIndex:-1,
      alongKm:0
    };
  }

  let best={
    distanceKm:Infinity,
    routeIndex:0,
    alongKm:0
  };

  route.coordinates.forEach((routePoint,index)=>{
    const distance=haversineKm(point,routePoint);

    if(distance<best.distanceKm){
      best={
        distanceKm:distance,
        routeIndex:index,
        alongKm:route.cumulative[index]||0
      };
    }
  });

  return best;
}

function ms650CollectRoutePois(
  routeCoordinates,
  anchorPoints
){
  const radius=Math.max(
    .2,
    Number($('plannerPoiRadius')?.value||1)
  );

  const anchorIds=new Set(
    (Array.isArray(anchorPoints)?anchorPoints:[])
      .map(point=>String(point?.poiId||''))
      .filter(Boolean)
  );

  return poiCache
    .map(poi=>{
      const point=plannerPointFromPoi(poi);
      if(!point)return null;
      if(anchorIds.has(String(point.poiId)))return null;

      const routeInfo=ms650NearestRoutePosition(
        point,
        routeCoordinates
      );

      if(routeInfo.distanceKm>radius)return null;

      return {
        ...point,
        distanceFromRouteKm:routeInfo.distanceKm,
        alongRouteKm:routeInfo.alongKm,
        favorite:isFavoritePoi(poi)
      };
    })
    .filter(Boolean)
    .sort((a,b)=>
      a.alongRouteKm-b.alongRouteKm||
      a.distanceFromRouteKm-b.distanceFromRouteKm
    )
    .slice(0,80);
}

function ms650SplitRouteByAnchors(
  routeCoordinates,
  anchors
){
  const route=(Array.isArray(routeCoordinates)
    ?routeCoordinates
    :[]
  ).map(ms650Coordinate).filter(ms650ValidCoordinate);

  if(route.length<2||anchors.length<2){
    return plannerCreateSegments(
      anchors,
      Number($('plannerRouteFactor')?.value||1.3)
    );
  }

  const indices=[0];
  let searchStart=0;

  for(let anchorIndex=1;anchorIndex<anchors.length-1;anchorIndex++){
    const anchor=anchors[anchorIndex];
    let nearestIndex=searchStart;
    let nearestDistance=Infinity;

    for(let routeIndex=searchStart;routeIndex<route.length;routeIndex++){
      const distance=haversineKm(anchor,route[routeIndex]);

      if(distance<nearestDistance){
        nearestDistance=distance;
        nearestIndex=routeIndex;
      }
    }

    indices.push(nearestIndex);
    searchStart=nearestIndex;
  }

  indices.push(route.length-1);

  return anchors.slice(1).map((to,index)=>{
    const from=anchors[index];
    const startIndex=indices[index];
    const endIndex=Math.max(
      startIndex+1,
      indices[index+1]
    );
    const legCoordinates=route.slice(
      startIndex,
      endIndex+1
    );
    const distanceKm=ms650RouteDistanceKm(
      legCoordinates
    );

    return {
      index,
      from,
      to,
      directKm:haversineKm(from,to),
      estimatedKm:distanceKm,
      distanceKm,
      routeCoordinates:legCoordinates
    };
  });
}

async function ms650RequestWaterwayRoute(points){
  if(ms650RoutingRequest){
    try{
      ms650RoutingRequest.abort();
    }catch{}
  }

  ms650RoutingRequest=new AbortController();
  const signal=ms650RoutingRequest.signal;
  const timeout=setTimeout(
    ()=>ms650RoutingRequest?.abort(),
    26000
  );

  const normalisedPoints=points.map(point=>({
    lat:Number(point.lat),
    lon:Number(point.lon),
    label:point.label||''
  }));

  const parseRoutePayload=payload=>{
    const features=payload?.type==='FeatureCollection'
      ?payload.features||[]
      :payload?.type==='Feature'
        ?[payload]
        :payload?.type==='LineString'
          ?[{
              type:'Feature',
              geometry:payload,
              properties:{}
            }]
          :[];

    const feature=features.find(candidate=>
      candidate?.geometry?.type==='LineString'&&
      Array.isArray(candidate.geometry.coordinates)&&
      candidate.geometry.coordinates.length>=2
    );

    if(!feature){
      throw new Error(
        'De router gaf geen bruikbare waterwegroute terug.'
      );
    }

    const coordinates=feature.geometry.coordinates
      .map(ms650Coordinate)
      .filter(ms650ValidCoordinate);

    if(coordinates.length<2){
      throw new Error(
        'De waterwegroute bevat te weinig routepunten.'
      );
    }

    return {
      ok:true,
      coordinates,
      distanceKm:ms650RouteDistanceKm(coordinates),
      properties:feature.properties||{}
    };
  };

  const tryLegacyFunction=async()=>{
    const response=await fetch(
      '/.netlify/functions/waterway-route',
      {
        method:'POST',
        headers:{
          'content-type':'application/json'
        },
        body:JSON.stringify({
          points:normalisedPoints
        }),
        signal
      }
    );

    if(response.status===404){
      throw new Error('FUNCTION_NOT_DEPLOYED');
    }

    const data=await response.json().catch(()=>({}));

    if(!response.ok||!data?.ok){
      throw new Error(
        data?.error||
        `Waterwegrouter gaf HTTP ${response.status}.`
      );
    }

    const coordinates=(Array.isArray(data.coordinates)
      ?data.coordinates
      :[]
    ).map(ms650Coordinate).filter(ms650ValidCoordinate);

    if(coordinates.length<2){
      throw new Error(
        'De waterwegrouter gaf geen bruikbare route terug.'
      );
    }

    return {
      ...data,
      coordinates
    };
  };

  const tryProxyCandidate=async(
    endpoint,
    profile
  )=>{
    const url=new URL(
      endpoint,
      location.origin
    );

    url.searchParams.set(
      'lonlats',
      normalisedPoints
        .map(point=>`${point.lon},${point.lat}`)
        .join('|')
    );
    url.searchParams.set('profile',profile);
    url.searchParams.set('alternativeidx','0');
    url.searchParams.set('format','geojson');

    const response=await fetch(url,{
      method:'GET',
      headers:{
        accept:'application/geo+json, application/json'
      },
      signal
    });

    if(!response.ok){
      throw new Error(
        `${profile}: HTTP ${response.status}`
      );
    }

    const payload=await response.json();
    const route=parseRoutePayload(payload);

    return {
      ...route,
      source:'Netlify BRouter-proxy',
      profile
    };
  };

  try{
    try{
      return await tryLegacyFunction();
    }catch(error){
      if(
        error?.message!=='FUNCTION_NOT_DEPLOYED'
      ){
        console.warn(
          'Netlify Function niet bruikbaar; proxy wordt geprobeerd:',
          error
        );
      }
    }

    const candidates=[
      ['/api/waterway-route','motorboat'],
      ['/api/waterway-route','waterway_nomod'],
      ['/api/waterway-route','river'],
      ['/api/waterway-route-backup','motorboat'],
      ['/api/waterway-route-backup','waterway_nomod'],
      ['/api/waterway-route-backup','river']
    ];

    const attempts=candidates.map(
      ([endpoint,profile])=>
        tryProxyCandidate(endpoint,profile)
    );

    if(typeof Promise.any==='function'){
      return await Promise.any(attempts);
    }

    const results=await Promise.allSettled(attempts);
    const success=results.find(
      result=>result.status==='fulfilled'
    );

    if(success)return success.value;

    throw new Error(
      'Geen waterwegrouter kon een route berekenen.'
    );
  }catch(error){
    if(error?.name==='AbortError'){
      throw new Error(
        'De waterwegrouter reageerde niet op tijd.'
      );
    }

    if(error instanceof AggregateError){
      const messages=[...error.errors]
        .map(item=>item?.message)
        .filter(Boolean);

      throw new Error(
        messages[0]||
        'Geen waterwegrouter kon een route berekenen.'
      );
    }

    throw error;
  }finally{
    clearTimeout(timeout);
    ms650RoutingRequest=null;
  }
}

function ms650PoiIcon(category){
  const value=String(category||'').toLowerCase();

  if(value.includes('haven'))return '⚓';
  if(value.includes('tank'))return '⛽';
  if(value.includes('sluis'))return '🚧';
  if(value.includes('brug'))return '🌉';
  if(value.includes('anker'))return '⚓';
  if(value.includes('restaurant'))return '🍽️';
  if(value.includes('café')||value.includes('cafe'))return '☕';
  if(value.includes('supermarkt'))return '🛒';
  return '📍';
}

function ms650AddRoutePoiStop(reference){
  if(!reference)return;

  if(plannerStops.includes(reference)){
    showAppToast(
      'Deze POI staat al als tussenstop in de route.'
    );
    return;
  }

  plannerStops.push(reference);
  renderPlannerStops();
  plannerFormChanged();

  showAppToast(
    'POI als tussenstop toegevoegd. Bereken de route opnieuw.'
  );
}

const ms650OriginalEnsurePlannerMap=ensurePlannerMap;
ensurePlannerMap=function(){
  ms650OriginalEnsurePlannerMap();

  if(
    plannerMap&&
    !ms650SeaMarkLayer
  ){
    ms650SeaMarkLayer=L.tileLayer(
      'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
      {
        maxZoom:18,
        opacity:.9,
        attribution:
          'Nautische objecten © OpenSeaMap-bijdragers'
      }
    ).addTo(plannerMap);
  }
};

const ms650OriginalRenderPlannerMap=renderPlannerMap;
renderPlannerMap=function(plan){
  const routeCoordinates=(Array.isArray(plan?.routeCoordinates)
    ?plan.routeCoordinates
    :[]
  ).map(ms650Coordinate).filter(ms650ValidCoordinate);

  if(routeCoordinates.length<2){
    ms650OriginalRenderPlannerMap(plan);
    return;
  }

  ensurePlannerMap();

  if(!plannerMap||!plannerMapLayer)return;

  plannerMapLayer.clearLayers();

  const latLngs=routeCoordinates.map(point=>[
    point.lat,
    point.lon
  ]);

  L.polyline(latLngs,{
    weight:6,
    opacity:.95,
    lineJoin:'round',
    lineCap:'round'
  }).addTo(plannerMapLayer);

  (plan.points||[]).forEach((point,index)=>{
    const role=index===0
      ?'Vertrek'
      :index===plan.points.length-1
        ?'Bestemming'
        :`Tussenstop ${index}`;

    L.marker([point.lat,point.lon])
      .addTo(plannerMapLayer)
      .bindPopup(`
        <b>${esc(role)}</b><br>
        ${esc(point.label)}
        ${point.place?`<br>${esc(point.place)}`:''}
      `);
  });

  (plan.routePois||[]).forEach(point=>{
    const icon=L.divIcon({
      className:'planner-route-poi-marker',
      html:`<span>${ms650PoiIcon(point.category)}</span>`,
      iconSize:[30,30],
      iconAnchor:[15,15]
    });

    L.marker(
      [point.lat,point.lon],
      {icon}
    )
      .addTo(plannerMapLayer)
      .bindPopup(`
        <b>${esc(point.label)}</b><br>
        ${esc(point.category||'POI')}
        ${point.place?`<br>${esc(point.place)}`:''}
        <br>
        ${plannerNumber(point.alongRouteKm)} km vanaf vertrek
      `);
  });

  plannerMap.fitBounds(
    L.latLngBounds(latLngs),
    {
      padding:[32,32],
      maxZoom:14
    }
  );

  setTimeout(
    ()=>plannerMap.invalidateSize({pan:false}),
    120
  );
};

const ms650OriginalCalculatePlannerRoute=
  calculatePlannerRoute;

calculatePlannerRoute=async function({
  silent=false
}={}){
  const routingMode=
    String($('plannerRoutingMode')?.value||'waterway');

  if(routingMode==='estimate'){
    const fallback=await ms650OriginalCalculatePlannerRoute({
      silent
    });

    if(fallback){
      fallback.routingMode='estimate';
      fallback.routeSource='Noodschatting';
      fallback.routeCoordinates=fallback.points||[];
      fallback.routePois=ms650CollectRoutePois(
        fallback.routeCoordinates,
        fallback.points||[]
      );
      renderPlannerSummary(fallback);
    }

    return fallback;
  }

  const fromRef=String($('plannerFrom')?.value||'');
  const toRef=String($('plannerTo')?.value||'');

  if(!fromRef||!toRef){
    setPlannerStatus(
      'Kies eerst een vertrekpunt en bestemming.',
      'warning'
    );
    return null;
  }

  if(fromRef===toRef&&!plannerStops.length){
    setPlannerStatus(
      'Vertrekpunt en bestemming mogen niet hetzelfde zijn.',
      'warning'
    );
    return null;
  }

  const speed=Number($('plannerSpeed')?.value||0);
  const factor=Number(
    $('plannerRouteFactor')?.value||1.3
  );
  const fuelPerHour=Number(
    $('plannerFuelPerHour')?.value||
    settingsCache?.fuel_per_hour||
    0
  );
  const fuelPrice=Number(
    $('plannerFuelPrice')?.value||
    settingsCache?.fuel_price||
    0
  );

  if(!Number.isFinite(speed)||speed<=0){
    setPlannerStatus(
      'Vul een geldige gemiddelde snelheid in.',
      'warning'
    );
    return null;
  }

  if(!silent){
    setPlannerStatus(
      'Waterwegen zoeken en routepunten ophalen…'
    );
  }

  try{
    const refs=[
      fromRef,
      ...plannerStops.filter(
        ref=>ref!==fromRef&&ref!==toRef
      ),
      toRef
    ];

    const points=[];

    for(const reference of refs){
      points.push(
        await resolvePlannerPoint(reference)
      );
    }

    const routed=await ms650RequestWaterwayRoute(
      points
    );
    const routeCoordinates=routed.coordinates;
    const segments=ms650SplitRouteByAnchors(
      routeCoordinates,
      points
    );
    const distanceKm=
      Number(routed.distanceKm)||
      ms650RouteDistanceKm(routeCoordinates);
    const durationHours=distanceKm/speed;
    const fuelLiters=durationHours*fuelPerHour;
    const fuelCost=fuelLiters*fuelPrice;
    const routePois=ms650CollectRoutePois(
      routeCoordinates,
      points
    );

    plannerCurrentPlan={
      id:plannerCurrentPlan?.id||
        crypto.randomUUID(),
      createdAt:plannerCurrentPlan?.createdAt||
        new Date().toISOString(),
      updatedAt:new Date().toISOString(),
      date:$('plannerDate')?.value||
        plannerDefaultDate(),
      title:plannerBuildTitle(points),
      fromRef,
      toRef,
      stopRefs:[...plannerStops],
      speed,
      factor,
      fuelPerHour,
      fuelPrice,
      notes:String(
        $('plannerNotes')?.value||''
      ).trim(),
      points,
      segments,
      routeCoordinates,
      routePois,
      routingMode:'waterway',
      routeSource:
        `Waterwegrouter · ${routed.profile||'motorboot'}`,
      routeWarning:routed.warning||'',
      distanceKm,
      durationHours,
      fuelLiters,
      fuelCost
    };

    renderPlannerSummary(plannerCurrentPlan);

    setPlannerStatus(
      `Waterwegroute gevonden: `+
      `${plannerNumber(distanceKm)} km, `+
      `${plannerDurationText(durationHours)} en `+
      `${routePois.length} POI’s langs de route.`,
      'success'
    );

    return plannerCurrentPlan;
  }catch(error){
    console.warn(
      'Waterwegrouter niet beschikbaar, noodschatting wordt gebruikt:',
      error
    );

    const fallback=await ms650OriginalCalculatePlannerRoute({
      silent:true
    });

    if(!fallback)return null;

    fallback.routingMode='estimate';
    fallback.routeSource='Noodschatting';
    fallback.routeWarning=
      error?.message||
      'De waterwegrouter was niet bereikbaar.';
    fallback.routeCoordinates=fallback.points||[];
    fallback.routePois=ms650CollectRoutePois(
      fallback.routeCoordinates,
      fallback.points||[]
    );

    renderPlannerSummary(fallback);
    setPlannerStatus(
      `${fallback.routeWarning} `+
      'Er wordt tijdelijk een schatting getoond; '+
      'controleer de route in Waterkaarten.',
      'warning'
    );

    return fallback;
  }
};

function ms650RenderRoutePois(plan){
  const container=$('plannerRoutePois');
  const pois=Array.isArray(plan?.routePois)
    ?plan.routePois
    :[];

  if(!container)return;

  if(!pois.length){
    container.classList.remove('hidden');
    container.innerHTML=`
      <div class="planner-route-poi-heading">
        <b>POI’s langs de route</b>
        <span>Geen opgeslagen POI’s binnen de gekozen afstand.</span>
      </div>
    `;
    return;
  }

  container.classList.remove('hidden');
  container.innerHTML=`
    <div class="planner-route-poi-heading">
      <b>${pois.length} POI’s langs de route</b>
      <span>
        Havens, tankplaatsen en andere opgeslagen plekken
        in routevolgorde.
      </span>
    </div>
    <div class="planner-route-poi-list">
      ${pois.slice(0,24).map(point=>`
        <article class="planner-route-poi-item">
          <span class="planner-route-poi-icon">
            ${ms650PoiIcon(point.category)}
          </span>
          <span>
            <strong>${esc(point.label)}</strong>
            <small>
              ${esc(point.category||'POI')}
              · ${plannerNumber(point.alongRouteKm)} km vanaf vertrek
              · ${plannerNumber(point.distanceFromRouteKm,2)} km van de route
            </small>
          </span>
          <button type="button" class="secondary"
            onclick="ms650AddRoutePoiStop('${esc(point.ref)}')">
            + Stop
          </button>
        </article>
      `).join('')}
    </div>
  `;
}

const ms650OriginalRenderPlannerSummary=
  renderPlannerSummary;

renderPlannerSummary=function(plan){
  ms650OriginalRenderPlannerSummary(plan);

  if(!plan)return;

  const routed=
    plan.routingMode==='waterway'&&
    Array.isArray(plan.routeCoordinates)&&
    plan.routeCoordinates.length>1;

  if($('plannerSummaryBadge')){
    $('plannerSummaryBadge').textContent=routed
      ?'Waterwegroute'
      :'Noodschatting';
    $('plannerSummaryBadge').classList.toggle(
      'warning',
      !routed
    );
  }

  const info=$('plannerRouteInfo');

  if(info){
    info.classList.remove('hidden');
    info.innerHTML=`
      <div>
        <b>
          ${routed?'🛥 Waterwegen gevolgd':'⚠️ Rechte-lijnschatting'}
        </b>
        <span>${esc(plan.routeSource||'MijnSerenity')}</span>
      </div>
      <small>
        ${routed
          ?'De kaart en het GPX-bestand gebruiken de volledige waterweg-geometrie.'
          :'De waterwegrouter was niet bereikbaar. Deze lijn is alleen een indicatie.'}
        ${plan.routeWarning?` ${esc(plan.routeWarning)}`:''}
      </small>
    `;
  }

  if(routed&&$('plannerSegments')){
    $('plannerSegments').innerHTML=(plan.segments||[])
      .map((segment,index)=>`
        <div class="planner-segment">
          <div class="planner-segment-number">
            ${index+1}
          </div>
          <div class="planner-segment-copy">
            <strong>
              ${esc(segment.from.label)}
              →
              ${esc(segment.to.label)}
            </strong>
            <small>
              ${plannerNumber(segment.distanceKm)} km over water
              · ${plannerDurationText(
                segment.distanceKm/
                Math.max(1,Number(plan.speed||9))
              )}
            </small>
          </div>
          <button type="button" class="secondary"
            onclick="openPlannerSegmentInWaterkaarten(${index})">
            🧭
          </button>
        </div>
      `).join('');
  }

  ms650RenderRoutePois(plan);
};

function ms650GpxWaypoint(point){
  return `
<wpt lat="${Number(point.lat).toFixed(7)}"
 lon="${Number(point.lon).toFixed(7)}">
 <name>${ms640Xml(point.label||point.name||'POI')}</name>
 <type>${ms640Xml(point.category||'POI')}</type>
 <desc>${ms640Xml(
   [
     point.place||'',
     point.address||''
   ].filter(Boolean).join(' · ')
 )}</desc>
</wpt>`;
}

ms640PlannerGpx=function(plan){
  const anchors=(Array.isArray(plan?.points)
    ?plan.points
    :[]
  ).filter(ms650ValidCoordinate);

  const track=(Array.isArray(plan?.routeCoordinates)&&
    plan.routeCoordinates.length>1
      ?plan.routeCoordinates
      :anchors
  ).map(ms650Coordinate).filter(ms650ValidCoordinate);

  if(track.length<2){
    throw new Error(
      'Bereken eerst een route met een vertrekpunt en bestemming.'
    );
  }

  const title=plan?.title||'Serenity vaarroute';
  const pois=[
    ...anchors,
    ...(Array.isArray(plan?.routePois)
      ?plan.routePois
      :[]
    )
  ];

  const waypoints=pois
    .filter(ms650ValidCoordinate)
    .map(ms650GpxWaypoint)
    .join('');

  const trackPoints=track.map(point=>`
<trkpt lat="${point.lat.toFixed(7)}"
 lon="${point.lon.toFixed(7)}"></trkpt>`
  ).join('');

  const routePoints=anchors.map(point=>`
<rtept lat="${Number(point.lat).toFixed(7)}"
 lon="${Number(point.lon).toFixed(7)}">
 <name>${ms640Xml(point.label||'Routepunt')}</name>
</rtept>`
  ).join('');

  const gpx=`<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1"
 creator="MijnSerenity 7.4.4"
 xmlns="http://www.topografix.com/GPX/1/1">
 <metadata>
  <name>${ms640Xml(title)}</name>
  <desc>Waterwegroute met POI's uit MijnSerenity</desc>
 </metadata>
 ${waypoints}
 <rte>
  <name>${ms640Xml(title)} · hoofdpunten</name>
  ${routePoints}
 </rte>
 <trk>
  <name>${ms640Xml(title)} · waterweg</name>
  <trkseg>${trackPoints}</trkseg>
 </trk>
</gpx>`;

  return new File(
    [gpx],
    `${ms640FileName(title)}-waterweg.gpx`,
    {type:'application/gpx+xml'}
  );
};



/* MijnSerenity 7.4.4 — navigatie altijd aan de viewport vastzetten */
function mountBottomNavigationToViewport(){
  const nav=document.querySelector('.bottom-nav');
  if(!nav)return;

  if(nav.parentElement!==document.body){
    document.body.appendChild(nav);
  }

  nav.classList.add('bottom-nav-viewport-fixed');
}

if(document.readyState==='loading'){
  document.addEventListener(
    'DOMContentLoaded',
    mountBottomNavigationToViewport,
    {once:true}
  );
}else{
  mountBottomNavigationToViewport();
}

window.addEventListener(
  'pageshow',
  mountBottomNavigationToViewport,
  {passive:true}
);

window.addEventListener(
  'orientationchange',
  ()=>{
    setTimeout(mountBottomNavigationToViewport,120);
  },
  {passive:true}
);


/* ============================================================
   MijnSerenity Cloud 7.4.4 — Next Level Live Cockpit
   ============================================================ */

let ms660FocusMode=false;
let ms660NightMode=false;
let ms660LastAlertKey='';

function ms660SetText(id,value){
  const element=$(id);
  if(element)element.textContent=value;
}

function ms660Number(value,digits=1){
  const number=Number(value);
  if(!Number.isFinite(number))return null;

  return number.toLocaleString('nl-NL',{
    minimumFractionDigits:0,
    maximumFractionDigits:digits
  });
}

function ms660NormalizeText(value){
  return String(value||'')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,' ')
    .trim();
}

function ms660LatestPoint(){
  const point=liveNavState?.points?.at(-1);
  return point&&
    Number.isFinite(Number(point.lat))&&
    Number.isFinite(Number(point.lon))
      ?{
          lat:Number(point.lat),
          lon:Number(point.lon)
        }
      :null;
}

function ms660CumulativeRoute(coordinates){
  const points=(Array.isArray(coordinates)?coordinates:[])
    .map(point=>Array.isArray(point)
      ?{
          lon:Number(point[0]),
          lat:Number(point[1])
        }
      :{
          lat:Number(point?.lat),
          lon:Number(point?.lon)
        }
    )
    .filter(point=>
      Number.isFinite(point.lat)&&
      Number.isFinite(point.lon)
    );

  const cumulative=[0];

  for(let index=1;index<points.length;index++){
    cumulative[index]=
      cumulative[index-1]+
      haversineKm(
        points[index-1],
        points[index]
      );
  }

  return {
    points,
    cumulative,
    total:cumulative.at(-1)||0
  };
}

function ms660PlanDestination(plan){
  return String(
    plan?.points?.at(-1)?.label||
    plan?.points?.at(-1)?.place||
    plan?.title||
    ''
  ).trim();
}

function ms660NavigationPlan(){
  const destination=ms660NormalizeText(
    $('liveTo')?.value
  );

  const candidates=[
    plannerCurrentPlan,
    ...(
      typeof readPlannerDrafts==='function'
        ?readPlannerDrafts()
        :[]
    )
  ].filter(plan=>
    Array.isArray(plan?.routeCoordinates)&&
    plan.routeCoordinates.length>=2
  );

  if(!candidates.length)return null;

  if(destination){
    const matching=candidates.find(plan=>{
      const planDestination=ms660NormalizeText(
        ms660PlanDestination(plan)
      );
      const title=ms660NormalizeText(plan?.title);

      return (
        planDestination===destination||
        planDestination.includes(destination)||
        destination.includes(planDestination)||
        title.includes(destination)
      );
    });

    if(matching)return matching;
  }

  return candidates
    .sort((a,b)=>
      new Date(b.updatedAt||b.createdAt||0)-
      new Date(a.updatedAt||a.createdAt||0)
    )[0];
}

function ms660RouteProgress(plan,current){
  if(!plan||!current)return null;

  const route=ms660CumulativeRoute(
    plan.routeCoordinates
  );

  if(route.points.length<2)return null;

  let nearestIndex=0;
  let nearestDistance=Infinity;

  route.points.forEach((point,index)=>{
    const distance=haversineKm(current,point);

    if(distance<nearestDistance){
      nearestDistance=distance;
      nearestIndex=index;
    }
  });

  const along=route.cumulative[nearestIndex]||0;

  return {
    route,
    nearestIndex,
    nearestDistance,
    along,
    remaining:Math.max(0,route.total-along)
  };
}

function ms660DestinationPoi(){
  const destination=ms660NormalizeText(
    $('liveTo')?.value
  );

  if(!destination)return null;

  let best=null;
  let score=0;

  poiCache.forEach(poi=>{
    const texts=[
      poi.name,
      poi.place,
      poi.address
    ].map(ms660NormalizeText).filter(Boolean);

    let candidateScore=0;

    texts.forEach(text=>{
      if(text===destination){
        candidateScore=Math.max(candidateScore,100);
      }else if(
        text.includes(destination)||
        destination.includes(text)
      ){
        candidateScore=Math.max(candidateScore,70);
      }
    });

    if(candidateScore>score){
      const position=getPoiMapPosition(poi);

      if(position?.valid){
        score=candidateScore;
        best={
          poi,
          lat:Number(position.lat),
          lon:Number(position.lon)
        };
      }
    }
  });

  return best;
}

function ms660NavigationEstimate(){
  const current=ms660LatestPoint();
  const plan=ms660NavigationPlan();
  const destinationText=String(
    $('liveTo')?.value||
    ms660PlanDestination(plan)||
    ''
  ).trim();

  if(plan&&current){
    const progress=ms660RouteProgress(
      plan,
      current
    );

    if(progress){
      const nextPoi=(plan.routePois||[])
        .filter(poi=>
          Number.isFinite(Number(poi.alongRouteKm))&&
          Number(poi.alongRouteKm)>progress.along+.05
        )
        .sort((a,b)=>
          Number(a.alongRouteKm)-
          Number(b.alongRouteKm)
        )[0]||null;

      return {
        destination:
          destinationText||
          ms660PlanDestination(plan)||
          'Waterwegroute',
        source:'Actieve waterwegroute',
        remainingKm:progress.remaining,
        routeTotalKm:progress.route.total,
        currentAlongKm:progress.along,
        nextPoi,
        nextPoiKm:nextPoi
          ?Math.max(
              0,
              Number(nextPoi.alongRouteKm)-
              progress.along
            )
          :null,
        offRouteKm:progress.nearestDistance,
        mode:'route'
      };
    }
  }

  const destinationPoi=ms660DestinationPoi();

  if(current&&destinationPoi){
    return {
      destination:
        destinationText||
        destinationPoi.poi.name||
        'Bestemming',
      source:'Hemelsbreed naar opgeslagen POI',
      remainingKm:haversineKm(
        current,
        destinationPoi
      ),
      nextPoi:null,
      nextPoiKm:null,
      mode:'direct'
    };
  }

  return {
    destination:
      destinationText||
      'Nog niet gekozen',
    source:plan
      ?'Wachten op GPS voor actieve waterwegroute'
      :'Kies een planning of vul aankomst in',
    remainingKm:null,
    nextPoi:null,
    nextPoiKm:null,
    mode:'none'
  };
}

function ms660CruiseSpeed(){
  const current=Number(liveNavState?.speedKmh);
  const average=typeof liveAverageSpeed==='function'
    ?Number(liveAverageSpeed())
    :0;
  const plan=ms660NavigationPlan();
  const planned=Number(plan?.speed);
  const preferred=Number(
    settingsCache?.cruise_speed||
    settingsCache?.average_speed||
    9
  );

  if(current>=1.5)return current;
  if(average>=1.5)return average;
  if(planned>=1)return planned;
  return preferred>=1?preferred:9;
}

function ms660WindDirectionText(value){
  const degrees=Number(value);
  if(!Number.isFinite(degrees))return '';

  const directions=[
    'N','NO','O','ZO',
    'Z','ZW','W','NW'
  ];

  return directions[
    Math.round(
      ((degrees%360)+360)%360/45
    )%8
  ];
}

function ms660TechnicalDepth(state){
  const candidates=[
    state?.depthM,
    state?.depth,
    state?.waterDepth,
    state?.water_depth,
    state?.nmea?.depth,
    state?.homeAssistant?.depth
  ];

  return candidates
    .map(Number)
    .find(value=>
      Number.isFinite(value)&&
      value>=0
    );
}

function ms660FuelRange(state){
  const fuelPct=Number(state?.fuelPct);
  const capacity=Number(
    state?.fuelCapacity||
    settingsCache?.tank_capacity
  );
  const consumption=Number(
    settingsCache?.fuel_per_hour||
    settingsCache?.fuelPerHour
  );
  const speed=ms660CruiseSpeed();

  if(
    !Number.isFinite(fuelPct)||
    !Number.isFinite(capacity)||
    capacity<=0||
    !Number.isFinite(consumption)||
    consumption<=0||
    speed<=0
  ){
    return null;
  }

  const usableLiters=
    capacity*
    Math.max(0,fuelPct-15)/
    100;
  const hours=usableLiters/consumption;

  return {
    km:hours*speed,
    liters:usableLiters,
    reservePct:15,
    speed,
    consumption
  };
}

function ms660ConnectionState(){
  const online=navigator.onLine;
  const viewer=Boolean(
    globalThis.ms640Viewing||
    (
      typeof ms640Viewing!=='undefined'&&
      ms640Viewing
    )
  );
  const controller=typeof ms640IsController==='function'
    ?ms640IsController()
    :true;

  return {
    online,
    viewer,
    controller
  };
}

function ms660Alerts(){
  const state=normaliseTechnicalState(
    technicalStateCache||
    readTechnicalLocalState()
  );
  const alerts=[];
  const add=(level,title,text)=>{
    alerts.push({level,title,text});
  };

  const house=Number(state.houseVoltage);
  const start=Number(state.startVoltage);
  const fuel=Number(state.fuelPct);
  const water=Number(state.waterPct);
  const temp=Number(state.engineTemp);
  const pressure=Number(state.oilPressure);
  const accuracy=Number(liveNavState.accuracy);
  const gusts=Number(liveNavState.weather?.windGusts);
  const gustBft=Number.isFinite(gusts)
    ?windKmhToBeaufort(gusts)
    :null;

  if(state.bilge==='alarm'){
    add(
      'critical',
      'Bilge-alarm actief',
      'Controleer direct of er water binnenkomt.'
    );
  }else if(state.bilge==='active'){
    add(
      'warning',
      'Bilgepomp draait',
      'Controleer of dit verwacht gedrag is.'
    );
  }

  if(Number.isFinite(temp)&&temp>=95){
    add(
      'critical',
      'Motortemperatuur hoog',
      `${ms660Number(temp,1)} °C · verminder belasting en controleer koeling.`
    );
  }else if(Number.isFinite(temp)&&temp>=88){
    add(
      'warning',
      'Motor wordt warm',
      `${ms660Number(temp,1)} °C · houd de temperatuur in de gaten.`
    );
  }

  if(
    Number(liveNavState.engineRpm)>=700&&
    Number.isFinite(pressure)&&
    pressure>0&&
    pressure<1
  ){
    add(
      'critical',
      'Oliedruk te laag',
      `${ms660Number(pressure,1)} bar bij draaiende motor.`
    );
  }

  if(Number.isFinite(house)&&house>0&&house<11.9){
    add(
      'critical',
      'Huishoudaccu kritiek laag',
      `${ms660Number(house,2)} V`
    );
  }else if(Number.isFinite(house)&&house>0&&house<12.2){
    add(
      'warning',
      'Huishoudaccu laag',
      `${ms660Number(house,2)} V`
    );
  }

  if(Number.isFinite(start)&&start>0&&start<11.9){
    add(
      'critical',
      'Startaccu kritiek laag',
      `${ms660Number(start,2)} V`
    );
  }else if(Number.isFinite(start)&&start>0&&start<12.2){
    add(
      'warning',
      'Startaccu laag',
      `${ms660Number(start,2)} V`
    );
  }

  if(Number.isFinite(fuel)&&fuel<=15){
    add(
      'critical',
      'Brandstofreserve bereikt',
      `${Math.round(fuel)}% resterend`
    );
  }else if(Number.isFinite(fuel)&&fuel<=25){
    add(
      'warning',
      'Brandstof wordt laag',
      `${Math.round(fuel)}% resterend`
    );
  }

  if(Number.isFinite(water)&&water<=12){
    add(
      'warning',
      'Drinkwater bijna leeg',
      `${Math.round(water)}% resterend`
    );
  }

  if(Number.isFinite(accuracy)&&accuracy>80){
    add(
      'critical',
      'GPS-signaal zeer zwak',
      `Nauwkeurigheid ongeveer ${Math.round(accuracy)} meter`
    );
  }else if(Number.isFinite(accuracy)&&accuracy>35){
    add(
      'warning',
      'GPS-signaal minder nauwkeurig',
      `Nauwkeurigheid ongeveer ${Math.round(accuracy)} meter`
    );
  }

  if(Number.isFinite(gustBft)&&gustBft>=9){
    add(
      'critical',
      'Zware windstoten',
      `${gustBft} Bft · beoordeel of doorvaren verstandig is.`
    );
  }else if(Number.isFinite(gustBft)&&gustBft>=7){
    add(
      'warning',
      'Stevige windstoten',
      `${gustBft} Bft · extra aandacht bij manoeuvreren.`
    );
  }

  if(!navigator.onLine){
    add(
      'warning',
      'Offline modus',
      'GPS-opname blijft lokaal werken en synchroniseert later.'
    );
  }

  const levelOrder={
    critical:3,
    warning:2,
    info:1
  };

  return alerts.sort(
    (a,b)=>
      levelOrder[b.level]-
      levelOrder[a.level]
  );
}

function ms660RenderAlerts(){
  const panel=$('ms660AlertPanel');
  const alerts=ms660Alerts();
  const alert=alerts[0];

  if(!panel)return;

  if(!alert){
    panel.className='ms660-alert-panel good';
    ms660SetText('ms660AlertIcon','✓');
    ms660SetText(
      'ms660AlertTitle',
      'Alles rustig aan boord'
    );
    ms660SetText(
      'ms660AlertText',
      'GPS, techniek, brandstof, bilge en weer geven geen directe waarschuwing.'
    );
    return;
  }

  panel.className=
    `ms660-alert-panel ${alert.level}`;
  ms660SetText(
    'ms660AlertIcon',
    alert.level==='critical'?'!':'⚠'
  );
  ms660SetText(
    'ms660AlertTitle',
    alert.title
  );
  ms660SetText(
    'ms660AlertText',
    alerts.length>1
      ?`${alert.text} · daarnaast ${alerts.length-1} andere melding(en).`
      :alert.text
  );

  const key=`${alert.level}:${alert.title}`;

  if(
    key!==ms660LastAlertKey&&
    liveNavState.status==='active'&&
    alert.level==='critical'
  ){
    ms660LastAlertKey=key;
    showAppToast(
      `⚠️ ${alert.title}: ${alert.text}`
    );
  }
}

function ms660RenderCommandCenter(){
  const navigation=ms660NavigationEstimate();
  const speed=ms660CruiseSpeed();
  const state=normaliseTechnicalState(
    technicalStateCache||
    readTechnicalLocalState()
  );
  const weather=liveNavState.weather||{};
  const connection=ms660ConnectionState();

  ms660SetText(
    'ms660Destination',
    navigation.destination
  );
  ms660SetText(
    'ms660RouteSource',
    navigation.source
  );

  if(Number.isFinite(navigation.remainingKm)){
    ms660SetText(
      'ms660Remaining',
      `${ms660Number(navigation.remainingKm,1)} km`
    );
    ms660SetText(
      'ms660RemainingDetail',
      navigation.mode==='route'
        ?navigation.offRouteKm>.5
          ?`${ms660Number(navigation.offRouteKm,1)} km van de geplande route`
          :'Berekend over de geplande waterweg'
        :'Hemelsbrede indicatie'
    );

    const hours=navigation.remainingKm/
      Math.max(1,speed);
    const eta=new Date(
      Date.now()+hours*3600000
    );

    ms660SetText(
      'ms660Eta',
      eta.toLocaleTimeString(
        'nl-NL',
        {
          hour:'2-digit',
          minute:'2-digit'
        }
      )
    );
    ms660SetText(
      'ms660EtaSpeed',
      `op basis van ${ms660Number(speed,1)} km/u`
    );
  }else{
    ms660SetText('ms660Remaining','– km');
    ms660SetText(
      'ms660RemainingDetail',
      'Wachten op bestemming en GPS'
    );
    ms660SetText('ms660Eta','–');
    ms660SetText(
      'ms660EtaSpeed',
      'Nog geen routeberekening'
    );
  }

  if(navigation.nextPoi){
    ms660SetText(
      'ms660NextPoi',
      navigation.nextPoi.label||
      navigation.nextPoi.name||
      'Route-POI'
    );
    ms660SetText(
      'ms660NextPoiDistance',
      `${ms660Number(navigation.nextPoiKm,1)} km verderop`
    );
  }else{
    ms660SetText('ms660NextPoi','–');
    ms660SetText(
      'ms660NextPoiDistance',
      navigation.mode==='route'
        ?'Geen volgende POI op deze route'
        :'Open een waterwegplanning met POI’s'
    );
  }

  const wind=Number(weather.windSpeed);
  const gusts=Number(weather.windGusts);
  const direction=ms660WindDirectionText(
    weather.windDirection
  );

  if(Number.isFinite(wind)){
    ms660SetText(
      'ms660Wind',
      `${windKmhToBeaufort(wind)} Bft${direction?` ${direction}`:''}`
    );
    ms660SetText(
      'ms660WindDetail',
      Number.isFinite(gusts)
        ?`windstoten ${windKmhToBeaufort(gusts)} Bft`
        :`${ms660Number(wind,1)} km/u`
    );
  }else{
    ms660SetText('ms660Wind','–');
    ms660SetText(
      'ms660WindDetail',
      'Wachten op actueel weer'
    );
  }

  const depth=ms660TechnicalDepth(state);

  ms660SetText(
    'ms660Depth',
    Number.isFinite(depth)
      ?`${ms660Number(depth,1)} m`
      :'– m'
  );
  ms660SetText(
    'liveDepth',
    Number.isFinite(depth)
      ?`${ms660Number(depth,1)} m`
      :'– m'
  );
  ms660SetText(
    'ms660DepthDetail',
    Number.isFinite(depth)
      ?'Live sensorwaarde'
      :'NMEA/HA-dieptesensor nog niet gekoppeld'
  );

  const range=ms660FuelRange(state);

  if(range){
    ms660SetText(
      'ms660FuelRange',
      `${Math.round(range.km)} km`
    );
    ms660SetText(
      'ms660FuelRangeDetail',
      `${ms660Number(range.liters,0)} liter bruikbaar · 15% reserve`
    );
  }else{
    ms660SetText('ms660FuelRange','– km');
    ms660SetText(
      'ms660FuelRangeDetail',
      'Tankinhoud en verbruik per uur instellen'
    );
  }

  ms660SetText(
    'ms660Connection',
    connection.online
      ?connection.viewer
        ?'Live meekijken'
        :'Online'
      :'Offline'
  );
  ms660SetText(
    'ms660ConnectionDetail',
    connection.viewer
      ?'Een ander apparaat bestuurt de opname'
      :connection.online
        ?'Cloudsync en GPS-opname beschikbaar'
        :'Route blijft veilig lokaal opgeslagen'
  );

  const role=$('ms660ControlRole');

  if(role){
    role.className=
      `ms660-role-badge ${
        connection.viewer?'viewer':'controller'
      }`;
    role.textContent=connection.viewer
      ?'Meekijken'
      :liveNavState.status==='active'
        ?'● Besturing actief'
        :'Besturing';
  }

  ms660RenderAlerts();
}

function toggleLiveCockpitFocus(force){
  ms660FocusMode=typeof force==='boolean'
    ?force
    :!ms660FocusMode;

  document.body.classList.toggle(
    'ms660-cockpit-focus',
    ms660FocusMode
  );

  const button=$('ms660FocusButton');

  if(button){
    button.textContent=ms660FocusMode
      ?'✕ Sluit focus'
      :'⛶ Focus';
  }

  try{
    localStorage.setItem(
      'mijnserenity-cockpit-focus',
      ms660FocusMode?'1':'0'
    );
  }catch{}

  if(ms660FocusMode){
    requestLiveWakeLock?.();
    setTimeout(()=>{
      $('live')?.scrollIntoView({
        block:'start',
        behavior:'smooth'
      });
      liveMap?.invalidateSize({pan:false});
      if(
        typeof hideBottomNavigation==='function'
      ){
        setTimeout(hideBottomNavigation,900);
      }
    },80);
  }else{
    setTimeout(()=>{
      liveMap?.invalidateSize({pan:false});
    },80);
  }
}

function toggleLiveNightMode(force){
  ms660NightMode=typeof force==='boolean'
    ?force
    :!ms660NightMode;

  document.body.classList.toggle(
    'ms660-night-mode',
    ms660NightMode
  );

  const button=$('ms660NightButton');

  if(button){
    button.textContent=ms660NightMode
      ?'☀️ Dag'
      :'🌙 Nacht';
  }

  try{
    localStorage.setItem(
      'mijnserenity-night-mode',
      ms660NightMode?'1':'0'
    );
  }catch{}
}

function ms660RestoreCockpitMode(){
  try{
    const focus=
      localStorage.getItem(
        'mijnserenity-cockpit-focus'
      )==='1';
    const night=
      localStorage.getItem(
        'mijnserenity-night-mode'
      )==='1';

    toggleLiveNightMode(night);

    if(focus){
      toggleLiveCockpitFocus(true);
    }
  }catch{}
}

function ms660ShowLivePanel(type){
  const target=type==='camera'
    ?document.querySelector(
        '.live-radar-camera-card'
      )
    :document.querySelector(
        '.live-map-card'
      );

  target?.scrollIntoView({
    behavior:'smooth',
    block:'center'
  });

  if(type==='map'){
    setTimeout(()=>{
      liveMap?.invalidateSize({pan:false});
      centerLiveMap();
    },300);
  }
}

const ms660OriginalRenderLiveState=
  renderLiveState;

renderLiveState=function(){
  const result=
    ms660OriginalRenderLiveState();

  ms660RenderCommandCenter();
  return result;
};

const ms660OriginalRenderLiveTechnicalStrip=
  renderLiveTechnicalStrip;

renderLiveTechnicalStrip=function(){
  const result=
    ms660OriginalRenderLiveTechnicalStrip();

  ms660RenderCommandCenter();
  return result;
};

const ms660OriginalInitLiveMode=
  initLiveMode;

initLiveMode=async function(){
  const result=
    await ms660OriginalInitLiveMode();

  ms660RestoreCockpitMode();
  ms660RenderCommandCenter();
  return result;
};

window.addEventListener(
  'online',
  ms660RenderCommandCenter,
  {passive:true}
);

window.addEventListener(
  'offline',
  ms660RenderCommandCenter,
  {passive:true}
);

document.addEventListener(
  'visibilitychange',
  ()=>{
    if(!document.hidden){
      ms660RenderCommandCenter();
    }
  }
);



/* ============================================================
   MijnSerenity Cloud 7.4.4 — Smart Route
   ============================================================ */

const MS670_OVERPASS_ENDPOINTS=[
  '/api/overpass',
  '/api/overpass-backup',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

let ms670InfrastructureController=null;
let ms670ProfileTimer=null;

function ms670ProfileKey(){
  return `mijnserenity-smart-route-profile-${currentBoat?.id||'serenity'}`;
}

function ms670Number(value){
  const number=Number(value);
  return Number.isFinite(number)&&number>0
    ?number
    :null;
}

function ms670BoatProfile(){
  return {
    length:ms670Number($('ms670BoatLength')?.value),
    width:ms670Number($('ms670BoatWidth')?.value),
    draft:ms670Number($('ms670BoatDraft')?.value),
    airDraft:ms670Number($('ms670BoatAirDraft')?.value),
    dailyHours:
      ms670Number($('ms670DailyHours')?.value)||6,
    startTime:
      String($('ms670StartTime')?.value||'09:00'),
    bridgeDelayMinutes:
      Number($('ms670BridgeDelay')?.value||15),
    lockDelayMinutes:
      Number($('ms670LockDelay')?.value||30)
  };
}

function ms670SaveProfile(){
  const profile=ms670BoatProfile();

  try{
    localStorage.setItem(
      ms670ProfileKey(),
      JSON.stringify(profile)
    );
  }catch(error){
    console.warn(
      'Smart Route-profiel bewaren mislukt:',
      error
    );
  }

  const badge=$('ms670ProfileBadge');

  if(badge){
    badge.textContent='Opgeslagen';
    badge.classList.add('saved');
  }

  return profile;
}

function ms670LoadProfile(){
  let saved=null;

  try{
    saved=JSON.parse(
      localStorage.getItem(ms670ProfileKey())||'null'
    );
  }catch{}

  const values={
    ms670BoatLength:saved?.length||11.2,
    ms670BoatWidth:saved?.width||'',
    ms670BoatDraft:saved?.draft||'',
    ms670BoatAirDraft:saved?.airDraft||'',
    ms670DailyHours:saved?.dailyHours||6,
    ms670StartTime:saved?.startTime||'09:00',
    ms670BridgeDelay:saved?.bridgeDelayMinutes||15,
    ms670LockDelay:saved?.lockDelayMinutes||30
  };

  Object.entries(values).forEach(([id,value])=>{
    const element=$(id);
    if(element)element.value=String(value);
  });

  const badge=$('ms670ProfileBadge');

  if(badge){
    badge.textContent=saved
      ?'Profiel geladen'
      :'Vul maten aan';
    badge.classList.toggle('saved',Boolean(saved));
  }
}

function ms670PlannerProfileChanged(){
  const badge=$('ms670ProfileBadge');

  if(badge){
    badge.textContent='Wordt opgeslagen…';
    badge.classList.remove('saved');
  }

  clearTimeout(ms670ProfileTimer);

  ms670ProfileTimer=setTimeout(()=>{
    ms670SaveProfile();

    if(plannerCurrentPlan){
      plannerCurrentPlan.boatProfile=
        ms670BoatProfile();
      plannerCurrentPlan.smartAnalysis=
        ms670AnalysePlan(plannerCurrentPlan);
      ms670RenderSmartRoute(plannerCurrentPlan);
    }
  },350);
}

function ms670ParseMeasurement(value){
  const text=String(value??'')
    .trim()
    .replace(',','.');

  if(!text)return null;

  const feetInches=text.match(
    /(\d+(?:\.\d+)?)\s*'\s*(\d+(?:\.\d+)?)?\s*"?/
  );

  if(feetInches){
    return (
      Number(feetInches[1])*0.3048+
      Number(feetInches[2]||0)*0.0254
    );
  }

  const number=Number(
    text.match(/-?\d+(?:\.\d+)?/)?.[0]
  );

  if(!Number.isFinite(number))return null;

  if(/\b(cm|centimeter)\b/i.test(text)){
    return number/100;
  }

  if(/\b(mm|millimeter)\b/i.test(text)){
    return number/1000;
  }

  return number;
}

function ms670ElementPosition(element){
  const lat=Number(
    element?.lat??
    element?.center?.lat??
    (
      element?.bounds
        ?(
          Number(element.bounds.minlat)+
          Number(element.bounds.maxlat)
        )/2
        :NaN
    )
  );
  const lon=Number(
    element?.lon??
    element?.center?.lon??
    (
      element?.bounds
        ?(
          Number(element.bounds.minlon)+
          Number(element.bounds.maxlon)
        )/2
        :NaN
    )
  );

  return {
    lat,
    lon,
    valid:
      Number.isFinite(lat)&&
      Number.isFinite(lon)
  };
}

function ms670ObjectCategory(tags={}){
  if(
    tags.waterway==='lock_gate'||
    tags.waterway==='lock'||
    tags.lock==='yes'||
    tags.lock==='sluice'
  )return 'Sluis';

  if(
    tags.bridge==='movable'||
    tags['seamark:type']==='bridge'||
    tags['bridge:movable']||
    tags.maxheight||
    tags['maxheight:physical']||
    tags['seamark:bridge:clearance_height_closed']
  )return 'Brug';

  if(
    tags.leisure==='marina'||
    tags.harbour==='yes'||
    tags['seamark:type']==='harbour'
  )return 'Haven';

  if(tags.amenity==='fuel')return 'Tankstation';
  if(tags.amenity==='restaurant')return 'Restaurant';
  if(tags.amenity==='cafe')return 'Café';
  if(tags.shop==='supermarket')return 'Supermarkt';
  if(tags.amenity==='toilets')return 'Toilet';
  if(tags.amenity==='drinking_water')return 'Drinkwater';
  if(tags.leisure==='slipway')return 'Trailerhelling';
  if(tags.mooring)return 'Aanlegplaats';
  if(tags.tourism==='attraction')return 'Bezienswaardigheid';

  return 'Vaarobject';
}

function ms670ObjectName(tags,category){
  return String(
    tags.name||
    tags['seamark:name']||
    tags.ref||
    {
      Sluis:'Naamloze sluis',
      Brug:'Naamloze brug',
      Haven:'Jachthaven',
      Tankstation:'Brandstofpunt',
      Restaurant:'Restaurant',
      Café:'Café',
      Supermarkt:'Supermarkt',
      Toilet:'Openbaar toilet',
      Drinkwater:'Drinkwaterpunt',
      Trailerhelling:'Trailerhelling',
      Aanlegplaats:'Aanlegplaats',
      Bezienswaardigheid:'Bezienswaardigheid'
    }[category]||
    'Vaarobject'
  );
}

function ms670RouteBounds(coordinates){
  const points=(Array.isArray(coordinates)?coordinates:[])
    .map(ms650Coordinate)
    .filter(ms650ValidCoordinate);

  if(!points.length)return null;

  const lats=points.map(point=>point.lat);
  const lons=points.map(point=>point.lon);
  const margin=.035;

  return {
    south:Math.min(...lats)-margin,
    west:Math.min(...lons)-margin,
    north:Math.max(...lats)+margin,
    east:Math.max(...lons)+margin
  };
}

function ms670InfrastructureQuery(bounds){
  const box=[
    bounds.south,
    bounds.west,
    bounds.north,
    bounds.east
  ].map(value=>Number(value).toFixed(6)).join(',');

  return `[out:json][timeout:32];
(
  nwr["waterway"="lock_gate"](${box});
  nwr["waterway"="lock"](${box});
  nwr["lock"="yes"](${box});
  nwr["bridge"="movable"](${box});
  nwr["seamark:type"="bridge"](${box});
  nwr["bridge"]["maxheight"](${box});
  nwr["bridge"]["maxheight:physical"](${box});
  nwr["leisure"="marina"](${box});
  nwr["harbour"="yes"](${box});
  nwr["seamark:type"="harbour"](${box});
  nwr["amenity"="fuel"](${box});
  nwr["amenity"="restaurant"](${box});
  nwr["amenity"="cafe"](${box});
  nwr["shop"="supermarket"](${box});
  nwr["amenity"="toilets"](${box});
  nwr["amenity"="drinking_water"](${box});
  nwr["leisure"="slipway"](${box});
  nwr["mooring"](${box});
  nwr["tourism"="attraction"](${box});
);
out center tags;`;
}

async function ms670FetchOverpass(query){
  let lastError=null;

  if(ms670InfrastructureController){
    try{
      ms670InfrastructureController.abort();
    }catch{}
  }

  for(const endpoint of MS670_OVERPASS_ENDPOINTS){
    const controller=new AbortController();
    ms670InfrastructureController=controller;
    const timeout=setTimeout(
      ()=>controller.abort(),
      32000
    );

    try{
      const target=endpoint.startsWith('http')
        ?endpoint
        :new URL(endpoint,location.origin).toString();

      const response=await fetch(target,{
        method:'POST',
        headers:{
          'content-type':
            'application/x-www-form-urlencoded;charset=UTF-8',
          accept:'application/json'
        },
        body:new URLSearchParams({data:query}).toString(),
        signal:controller.signal,
        cache:'no-store'
      });

      if(!response.ok){
        throw new Error(
          `Kaartdienst gaf HTTP ${response.status}.`
        );
      }

      const data=await response.json();

      if(!Array.isArray(data?.elements)){
        throw new Error(
          'Kaartdienst gaf geen geldige objectenlijst terug.'
        );
      }

      return data.elements;
    }catch(error){
      lastError=error;
      console.warn(
        'Smart Route kaartdienst niet bereikbaar:',
        endpoint,
        error
      );
    }finally{
      clearTimeout(timeout);
    }
  }

  throw lastError||
    new Error('Geen kaartdienst bereikbaar.');
}

function ms670ObjectClearance(tags={}){
  const candidates=[
    tags['seamark:bridge:clearance_height_closed'],
    tags['seamark:bridge:clearance_height'],
    tags['bridge:clearance'],
    tags['maxheight:physical'],
    tags.maxheight
  ];

  for(const candidate of candidates){
    const value=ms670ParseMeasurement(candidate);
    if(Number.isFinite(value))return value;
  }

  return null;
}

function ms670ObjectWidth(tags={}){
  for(const candidate of [
    tags.maxwidth,
    tags['maxwidth:physical'],
    tags['seamark:bridge:clearance_width']
  ]){
    const value=ms670ParseMeasurement(candidate);
    if(Number.isFinite(value))return value;
  }

  return null;
}

function ms670ObjectDepth(tags={}){
  for(const candidate of [
    tags.maxdraft,
    tags.maxdraught,
    tags.maxdepth,
    tags.depth,
    tags['seamark:depth']
  ]){
    const value=ms670ParseMeasurement(candidate);
    if(Number.isFinite(value))return value;
  }

  return null;
}

function ms670IsMovableBridge(tags={}){
  return (
    tags.bridge==='movable'||
    Boolean(tags['bridge:movable'])||
    /bascule|swing|lift|drawbridge|opening/i.test(
      String(
        tags['seamark:bridge:category']||
        tags.bridge||
        tags.description||
        ''
      )
    )
  );
}

function ms670ProcessObjects(
  elements,
  routeCoordinates
){
  const seen=new Set();
  const objects=[];

  (elements||[]).forEach(element=>{
    const position=ms670ElementPosition(element);
    if(!position.valid)return;

    const tags=element.tags||{};
    const category=ms670ObjectCategory(tags);
    const nearest=ms650NearestRoutePosition(
      position,
      routeCoordinates
    );
    const maxDistance={
      Haven:3,
      Tankstation:3,
      Restaurant:1.5,
      'Café':1.5,
      Supermarkt:2,
      Toilet:1,
      Drinkwater:1,
      Trailerhelling:1.5,
      Aanlegplaats:1,
      Bezienswaardigheid:2.5,
      Brug:.8,
      Sluis:.8
    }[category]||.8;

    if(nearest.distanceKm>maxDistance)return;

    const key=
      `${category}:${element.type}:${element.id}`;

    if(seen.has(key))return;
    seen.add(key);

    objects.push({
      id:key,
      osmType:element.type,
      osmId:element.id,
      category,
      label:ms670ObjectName(tags,category),
      lat:position.lat,
      lon:position.lon,
      tags,
      alongRouteKm:nearest.alongKm,
      distanceFromRouteKm:nearest.distanceKm,
      clearanceHeight:ms670ObjectClearance(tags),
      clearanceWidth:ms670ObjectWidth(tags),
      maxDepth:ms670ObjectDepth(tags),
      movable:
        category==='Brug'&&
        ms670IsMovableBridge(tags),
      openingHours:
        tags.opening_hours||
        tags.service_times||
        tags['seamark:bridge:opening_hours']||
        '',
      phone:
        tags.phone||
        tags['contact:phone']||
        '',
      vhf:
        tags.vhf||
        tags['seamark:radio_station:channel']||
        ''
    });
  });

  return objects.sort(
    (a,b)=>
      a.alongRouteKm-b.alongRouteKm||
      a.category.localeCompare(b.category,'nl')
  );
}

async function ms670LoadInfrastructure(plan){
  if(
    !Array.isArray(plan?.routeCoordinates)||
    plan.routeCoordinates.length<2
  ){
    return [];
  }

  const bounds=ms670RouteBounds(
    plan.routeCoordinates
  );

  if(!bounds)return [];

  const elements=await ms670FetchOverpass(
    ms670InfrastructureQuery(bounds)
  );

  return ms670ProcessObjects(
    elements,
    plan.routeCoordinates
  );
}

function ms670CheckResult(
  level,
  title,
  text,
  object=null
){
  return {
    level,
    title,
    text,
    object
  };
}

function ms670AnalysePlan(plan){
  const profile=
    plan.boatProfile||
    ms670BoatProfile();
  const objects=
    Array.isArray(plan.routeObjects)
      ?plan.routeObjects
      :[];
  const checks=[];
  const bridges=objects.filter(
    object=>object.category==='Brug'
  );
  const locks=objects.filter(
    object=>object.category==='Sluis'
  );

  if(!profile.width){
    checks.push(ms670CheckResult(
      'unknown',
      'Breedte Serenity ontbreekt',
      'Vul de maximale breedte in voor een betere routecheck.'
    ));
  }

  if(!profile.draft){
    checks.push(ms670CheckResult(
      'unknown',
      'Diepgang Serenity ontbreekt',
      'Vul de maximale diepgang in voor een betere routecheck.'
    ));
  }

  if(!profile.airDraft){
    checks.push(ms670CheckResult(
      'unknown',
      'Doorvaarthoogte Serenity ontbreekt',
      'Vul de werkelijke hoogte boven de waterlijn in.'
    ));
  }

  bridges.forEach(object=>{
    if(
      profile.airDraft&&
      Number.isFinite(object.clearanceHeight)
    ){
      const margin=
        object.clearanceHeight-
        profile.airDraft;

      if(margin<0){
        checks.push(ms670CheckResult(
          'critical',
          `${object.label} mogelijk te laag`,
          `Bekende hoogte ${plannerNumber(object.clearanceHeight)} m · Serenity ${plannerNumber(profile.airDraft)} m.`,
          object
        ));
      }else if(margin<.35){
        checks.push(ms670CheckResult(
          'warning',
          `Weinig hoogtemarge bij ${object.label}`,
          `Slechts ${plannerNumber(margin,2)} m bekende marge. Waterstand en meetmethode kunnen verschillen.`,
          object
        ));
      }
    }

    if(
      profile.width&&
      Number.isFinite(object.clearanceWidth)
    ){
      const margin=
        object.clearanceWidth-
        profile.width;

      if(margin<0){
        checks.push(ms670CheckResult(
          'critical',
          `${object.label} mogelijk te smal`,
          `Bekende breedte ${plannerNumber(object.clearanceWidth)} m · Serenity ${plannerNumber(profile.width)} m.`,
          object
        ));
      }else if(margin<.6){
        checks.push(ms670CheckResult(
          'warning',
          `Weinig breedtemarge bij ${object.label}`,
          `Ongeveer ${plannerNumber(margin,2)} m bekende totale marge.`,
          object
        ));
      }
    }
  });

  objects.forEach(object=>{
    if(
      profile.draft&&
      Number.isFinite(object.maxDepth)
    ){
      const margin=
        object.maxDepth-
        profile.draft;

      if(margin<0){
        checks.push(ms670CheckResult(
          'critical',
          `${object.label}: bekende diepte onvoldoende`,
          `Bekende diepte ${plannerNumber(object.maxDepth)} m · Serenity ${plannerNumber(profile.draft)} m.`,
          object
        ));
      }else if(margin<.4){
        checks.push(ms670CheckResult(
          'warning',
          `Weinig dieptemarge bij ${object.label}`,
          `Ongeveer ${plannerNumber(margin,2)} m bekende marge.`,
          object
        ));
      }
    }
  });

  const unknownHeights=bridges.filter(
    object=>!Number.isFinite(object.clearanceHeight)
  ).length;

  if(unknownHeights){
    checks.push(ms670CheckResult(
      'unknown',
      `${unknownHeights} bruggen zonder bruikbare hoogte`,
      'Controleer deze bruggen handmatig in Waterkaarten en bij de beheerder.'
    ));
  }

  if(locks.length){
    checks.push(ms670CheckResult(
      'info',
      `${locks.length} sluizen gevonden`,
      `Voor de reistijd is ${profile.lockDelayMinutes} minuten buffer per sluis toegevoegd.`
    ));
  }

  if(bridges.some(object=>object.movable)){
    const count=bridges.filter(
      object=>object.movable
    ).length;

    checks.push(ms670CheckResult(
      'info',
      `${count} beweegbare bruggen gevonden`,
      `Voor de reistijd is ${profile.bridgeDelayMinutes} minuten buffer per beweegbare brug toegevoegd.`
    ));
  }

  if(!objects.length){
    checks.push(ms670CheckResult(
      'unknown',
      'Nog geen bruggen of route-POI’s ontvangen',
      'De openbare kaartdienst gaf nog geen bruggen, sluizen, havens of andere POI’s terug.'
    ));
  }

  const critical=checks.filter(
    check=>check.level==='critical'
  ).length;
  const warnings=checks.filter(
    check=>check.level==='warning'
  ).length;

  const delayHours=
    locks.length*
    profile.lockDelayMinutes/60+
    bridges.filter(object=>object.movable).length*
    profile.bridgeDelayMinutes/60;

  return {
    checks,
    critical,
    warnings,
    lockCount:locks.length,
    bridgeCount:bridges.length,
    movableBridgeCount:
      bridges.filter(object=>object.movable).length,
    delayHours,
    adjustedDurationHours:
      Number(plan.durationHours||0)+
      delayHours,
    status:critical
      ?'critical'
      :warnings
        ?'warning'
        :'incomplete'
  };
}

function ms670HarbourCandidates(plan){
  const online=(plan.routeObjects||[])
    .filter(object=>object.category==='Haven')
    .map(object=>({
      ...object,
      source:'OpenStreetMap'
    }));

  const saved=(plan.routePois||[])
    .filter(object=>
      String(object.category||'')
        .toLowerCase()
        .includes('haven')
    )
    .map(object=>({
      ...object,
      source:'MijnSerenity'
    }));

  return [...saved,...online]
    .filter(object=>
      Number.isFinite(Number(object.alongRouteKm))
    )
    .sort(
      (a,b)=>
        Number(a.alongRouteKm)-
        Number(b.alongRouteKm)
    );
}

function ms670BuildDayPlan(plan){
  const profile=
    plan.boatProfile||
    ms670BoatProfile();
  const analysis=
    plan.smartAnalysis||
    ms670AnalysePlan(plan);
  const speed=Math.max(
    1,
    Number(plan.speed||9)
  );
  const dailyHours=Math.max(
    1,
    Number(profile.dailyHours||6)
  );
  const totalHours=Math.max(
    .01,
    Number(analysis.adjustedDurationHours||
      plan.durationHours||
      0)
  );
  const days=Math.max(
    1,
    Math.ceil(totalHours/dailyHours)
  );
  const distance=Number(plan.distanceKm||0);
  const candidates=ms670HarbourCandidates(plan);
  const rows=[];

  for(let day=1;day<=days;day++){
    const hours=Math.min(
      dailyHours,
      Math.max(
        0,
        totalHours-
        (day-1)*dailyHours
      )
    );
    const targetFraction=Math.min(
      1,
      day*dailyHours/totalHours
    );
    const targetKm=distance*targetFraction;

    const harbour=day<days
      ?candidates
        .map(candidate=>({
          ...candidate,
          targetDifference:
            Math.abs(
              Number(candidate.alongRouteKm)-
              targetKm
            )
        }))
        .filter(candidate=>
          candidate.targetDifference<=
          Math.max(12,speed*1.5)
        )
        .sort(
          (a,b)=>
            a.targetDifference-
            b.targetDifference
        )[0]||null
      :null;

    rows.push({
      day,
      hours,
      estimatedKm:
        Math.min(
          distance,
          speed*hours
        ),
      targetKm,
      harbour,
      final:day===days
    });
  }

  const [hour,minute]=String(
    profile.startTime||'09:00'
  ).split(':').map(Number);
  const routeDate=new Date(
    `${plan.date||plannerDefaultDate()}T00:00:00`
  );
  const lastDay=rows.at(-1);
  const finalDate=new Date(routeDate);
  finalDate.setDate(
    finalDate.getDate()+days-1
  );
  finalDate.setHours(
    Number.isFinite(hour)?hour:9,
    Number.isFinite(minute)?minute:0,
    0,
    0
  );
  finalDate.setTime(
    finalDate.getTime()+
    Number(lastDay?.hours||0)*3600000
  );

  return {
    days,
    rows,
    finalDate,
    totalHours,
    dailyHours
  };
}

function ms670Icon(category){
  return {
    Brug:'🌉',
    Sluis:'🚧',
    Haven:'⚓',
    Tankstation:'⛽',
    Restaurant:'🍽️',
    Café:'☕',
    Supermarkt:'🛒',
    Toilet:'🚻',
    Drinkwater:'🚰',
    Trailerhelling:'🛥️',
    Aanlegplaats:'🪢',
    Bezienswaardigheid:'⭐'
  }[category]||'📍';
}

function ms670CheckIcon(level){
  return {
    critical:'⛔',
    warning:'⚠️',
    unknown:'❓',
    info:'ℹ️',
    good:'✅'
  }[level]||'ℹ️';
}

function ms670ObjectDetail(object){
  const details=[];

  if(Number.isFinite(object.clearanceHeight)){
    details.push(
      `hoogte ${plannerNumber(object.clearanceHeight)} m`
    );
  }

  if(Number.isFinite(object.clearanceWidth)){
    details.push(
      `breedte ${plannerNumber(object.clearanceWidth)} m`
    );
  }

  if(Number.isFinite(object.maxDepth)){
    details.push(
      `diepte ${plannerNumber(object.maxDepth)} m`
    );
  }

  if(object.movable){
    details.push('beweegbaar');
  }

  if(object.openingHours){
    details.push(object.openingHours);
  }

  if(object.vhf){
    details.push(`VHF ${object.vhf}`);
  }

  return details.join(' · ')||
    'Geen aanvullende gegevens';
}

function ms670RenderSmartRoute(plan){
  const panel=$('ms670SmartRoute');
  if(!panel||!plan)return;

  const analysis=
    plan.smartAnalysis||
    ms670AnalysePlan(plan);
  const dayPlan=
    plan.dayPlan||
    ms670BuildDayPlan(plan);
  const objects=
    Array.isArray(plan.routeObjects)
      ?plan.routeObjects
      :[];
  const badge=$('ms670RouteBadge');

  panel.classList.remove('hidden');

  if(badge){
    badge.className=
      `ms670-route-badge ${analysis.status}`;
    badge.textContent=analysis.critical
      ?`${analysis.critical} blokkade${analysis.critical===1?'':'s'}`
      :analysis.warnings
        ?`${analysis.warnings} aandachtspunt${analysis.warnings===1?'':'en'}`
        :'Onvolledig gecontroleerd';
  }

  $('ms670RouteChecks').innerHTML=
    analysis.checks.length
      ?analysis.checks.slice(0,12).map(check=>`
        <article class="ms670-route-check ${check.level}">
          <span>${ms670CheckIcon(check.level)}</span>
          <div>
            <strong>${esc(check.title)}</strong>
            <small>${esc(check.text)}</small>
          </div>
        </article>
      `).join('')
      :`
        <article class="ms670-route-check good">
          <span>✅</span>
          <div>
            <strong>Geen bekende maatbeperking gevonden</strong>
            <small>
              Dit is geen garantie: veel vaarweggegevens zijn niet volledig.
            </small>
          </div>
        </article>
      `;

  ms670SetTextSafe(
    'ms670ObjectCount',
    `${objects.length} gevonden`
  );

  $('ms670RouteTimeline').innerHTML=
    objects.length
      ?objects.slice(0,40).map(object=>`
        <article class="ms670-timeline-item">
          <span class="ms670-timeline-icon">
            ${ms670Icon(object.category)}
          </span>
          <div>
            <strong>${esc(object.label)}</strong>
            <small>
              ${plannerNumber(object.alongRouteKm)} km vanaf vertrek
              · ${esc(ms670ObjectDetail(object))}
            </small>
          </div>
          <span class="ms670-object-category">
            ${esc(object.category)}
          </span>
        </article>
      `).join('')
      :`
        <div class="ms670-empty">
          Nog geen bruggen, sluizen, havens of tankpunten ontvangen.
        </div>
      `;

  ms670SetTextSafe(
    'ms670TripDays',
    `${dayPlan.days} ${dayPlan.days===1?'dag':'dagen'}`
  );

  $('ms670DayPlan').innerHTML=
    dayPlan.rows.map(row=>`
      <article class="ms670-day-row">
        <div class="ms670-day-number">
          ${row.day}
        </div>
        <div>
          <strong>
            ${row.final
              ?'Aankomstdag'
              :row.harbour
                ?esc(row.harbour.label)
                :'Overnachtingshaven zoeken'}
          </strong>
          <small>
            ${plannerNumber(row.hours,1)} uur varen
            · ongeveer ${plannerNumber(row.estimatedKm,1)} km
            ${row.harbour
              ?`· ${plannerNumber(row.harbour.alongRouteKm)} km vanaf vertrek`
              :''}
          </small>
        </div>
        <span>
          ${row.final
            ?dayPlan.finalDate.toLocaleString(
              'nl-NL',
              {
                weekday:'short',
                day:'numeric',
                month:'short',
                hour:'2-digit',
                minute:'2-digit'
              }
            )
            :row.harbour
              ?'⚓'
              :'🔎'}
        </span>
      </article>
    `).join('');

  const disclaimer=$('ms670RouteDisclaimer');

  if(disclaimer){
    disclaimer.textContent=
      `Geschatte extra wachttijd: `+
      `${plannerDurationText(analysis.delayHours)}. `+
      `Verwachte totale vaartijd inclusief buffers: `+
      `${plannerDurationText(analysis.adjustedDurationHours)}. `+
      `Ontbrekende gegevens betekenen niet dat de route geschikt is.`;
  }
}

function ms670SetTextSafe(id,text){
  const element=$(id);
  if(element)element.textContent=text;
}

function ms670MapObjectIcon(object){
  return L.divIcon({
    className:
      `ms670-map-object ms670-map-${String(object.category).toLowerCase()}`,
    html:`<span>${ms670Icon(object.category)}</span>`,
    iconSize:[32,32],
    iconAnchor:[16,16]
  });
}

const ms670OriginalRenderPlannerMap=
  renderPlannerMap;

renderPlannerMap=function(plan){
  ms670OriginalRenderPlannerMap(plan);

  if(!plannerMapLayer)return;

  (plan?.routeObjects||[]).forEach(object=>{
    if(
      !Number.isFinite(Number(object.lat))||
      !Number.isFinite(Number(object.lon))
    )return;

    L.marker(
      [Number(object.lat),Number(object.lon)],
      {
        icon:ms670MapObjectIcon(object)
      }
    )
      .addTo(plannerMapLayer)
      .bindPopup(`
        <b>${esc(object.label)}</b><br>
        ${esc(object.category)}
        · ${plannerNumber(object.alongRouteKm)} km vanaf vertrek
        <br>${esc(ms670ObjectDetail(object))}
      `);
  });
};

const ms670OriginalRenderPlannerSummary=
  renderPlannerSummary;

renderPlannerSummary=function(plan){
  const result=
    ms670OriginalRenderPlannerSummary(plan);

  if(plan){
    ms670RenderSmartRoute(plan);
  }

  return result;
};

const ms670OriginalCalculatePlannerRoute=
  calculatePlannerRoute;

calculatePlannerRoute=async function(options={}){
  const profile=ms670SaveProfile();
  const plan=await ms670OriginalCalculatePlannerRoute(
    options
  );

  if(!plan)return null;

  plan.boatProfile=profile;

  if(
    plan.routingMode==='waterway'&&
    Array.isArray(plan.routeCoordinates)&&
    plan.routeCoordinates.length>=2
  ){
    setPlannerStatus(
      'Waterwegroute gevonden. Bruggen, sluizen en havens controleren…'
    );

    try{
      plan.routeObjects=
        await ms670LoadInfrastructure(plan);
      plan.smartDataStatus='online';
    }catch(error){
      console.warn(
        'Smart Route-objecten konden niet worden geladen:',
        error
      );
      plan.routeObjects=
        Array.isArray(plan.routeObjects)
          ?plan.routeObjects
          :[];
      plan.smartDataStatus='unavailable';
      plan.smartDataError=
        error?.message||
        'Openbare kaartdienst niet bereikbaar.';
    }
  }else{
    plan.routeObjects=[];
    plan.smartDataStatus='estimate';
  }

  plan.smartAnalysis=
    ms670AnalysePlan(plan);
  plan.dayPlan=
    ms670BuildDayPlan(plan);
  plan.updatedAt=
    new Date().toISOString();

  plannerCurrentPlan=plan;
  renderPlannerSummary(plan);

  const analysis=plan.smartAnalysis;
  const message=analysis.critical
    ?`Route berekend, maar ${analysis.critical} mogelijke blokkade(s) gevonden.`
    :analysis.warnings
      ?`Route berekend met ${analysis.warnings} aandachtspunt(en).`
      :plan.smartDataStatus==='online'
        ?`Smart Route gereed: ${plan.routeObjects.length} routeobjecten gecontroleerd.`
        :`Route gereed. Smart Route-objecten waren niet volledig beschikbaar.`;

  setPlannerStatus(
    message,
    analysis.critical
      ?'error'
      :analysis.warnings
        ?'warning'
        :'success'
  );

  return plan;
};

const ms670OriginalInitPlanner=
  initPlanner;

initPlanner=function(){
  const result=
    ms670OriginalInitPlanner();

  ms670LoadProfile();

  if(plannerCurrentPlan){
    ms670RenderSmartRoute(
      plannerCurrentPlan
    );
  }

  return result;
};

const ms670PreviousPlannerGpx=
  ms640PlannerGpx;

ms640PlannerGpx=function(plan){
  const baseObjects=[
    ...(Array.isArray(plan?.routeObjects)
      ?plan.routeObjects
      :[]),
    ...(Array.isArray(plan?.routePois)
      ?plan.routePois
      :[])
  ].filter(object=>
    Number.isFinite(Number(object?.lat))&&
    Number.isFinite(Number(object?.lon))
  );

  const anchors=(Array.isArray(plan?.points)
    ?plan.points
    :[]
  ).filter(ms650ValidCoordinate);

  const track=(Array.isArray(plan?.routeCoordinates)&&
    plan.routeCoordinates.length>1
      ?plan.routeCoordinates
      :anchors
  ).map(ms650Coordinate).filter(ms650ValidCoordinate);

  if(track.length<2){
    return ms670PreviousPlannerGpx(plan);
  }

  const title=
    plan?.title||
    'Serenity Smart Route';

  const waypoints=[
    ...anchors,
    ...baseObjects
  ].map(point=>`
<wpt lat="${Number(point.lat).toFixed(7)}"
 lon="${Number(point.lon).toFixed(7)}">
 <name>${ms640Xml(
   point.label||
   point.name||
   point.category||
   'Routeobject'
 )}</name>
 <type>${ms640Xml(
   point.category||
   'Routepunt'
 )}</type>
 <desc>${ms640Xml(
   point.tags
     ?ms670ObjectDetail(point)
     :[
       point.place||'',
       point.address||''
     ].filter(Boolean).join(' · ')
 )}</desc>
</wpt>`).join('');

  const trackPoints=track.map(point=>`
<trkpt lat="${point.lat.toFixed(7)}"
 lon="${point.lon.toFixed(7)}"></trkpt>`
  ).join('');

  const routePoints=anchors.map(point=>`
<rtept lat="${Number(point.lat).toFixed(7)}"
 lon="${Number(point.lon).toFixed(7)}">
 <name>${ms640Xml(point.label||'Routepunt')}</name>
</rtept>`).join('');

  const gpx=`<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1"
 creator="MijnSerenity 7.4.4 Smart Route"
 xmlns="http://www.topografix.com/GPX/1/1">
 <metadata>
  <name>${ms640Xml(title)}</name>
  <desc>
   Waterwegroute met bruggen, sluizen, havens en POI's.
   Controleer actuele vaarinformatie altijd in Waterkaarten.
  </desc>
 </metadata>
 ${waypoints}
 <rte>
  <name>${ms640Xml(title)} · hoofdpunten</name>
  ${routePoints}
 </rte>
 <trk>
  <name>${ms640Xml(title)} · waterweg</name>
  <trkseg>${trackPoints}</trkseg>
 </trk>
</gpx>`;

  return new File(
    [gpx],
    `${ms640FileName(title)}-smart-route.gpx`,
    {type:'application/gpx+xml'}
  );
};



/* MijnSerenity 7.4.4 — OSM-routeobjecten ook als POI tonen */
const ms672OriginalRenderRoutePois=
  ms650RenderRoutePois;

ms650RenderRoutePois=function(plan){
  if(plan){
    const infrastructurePois=(plan.routeObjects||[])
      .filter(object=>
        [
          'Haven',
          'Tankstation',
          'Restaurant',
          'Café',
          'Supermarkt',
          'Toilet',
          'Drinkwater',
          'Trailerhelling',
          'Aanlegplaats',
          'Bezienswaardigheid'
        ].includes(object.category)
      )
      .map(object=>({
        ...object,
        ref:`osm:${object.osmType}:${object.osmId}`,
        favorite:false,
        distanceFromRouteKm:
          Number(object.distanceFromRouteKm)||0
      }));

    const existing=Array.isArray(plan.routePois)
      ?[...plan.routePois]
      :[];

    const seen=new Set(
      existing
        .filter(item=>
          Number.isFinite(Number(item.lat))&&
          Number.isFinite(Number(item.lon))
        )
        .map(item=>
          `${Number(item.lat).toFixed(6)}:${Number(item.lon).toFixed(6)}`
        )
    );

    infrastructurePois.forEach(item=>{
      const key=
        `${Number(item.lat).toFixed(6)}:${Number(item.lon).toFixed(6)}`;

      if(!seen.has(key)){
        existing.push(item);
        seen.add(key);
      }
    });

    plan.routePois=existing.sort(
      (a,b)=>
        Number(a.alongRouteKm||0)-
        Number(b.alongRouteKm||0)
    );
  }

  return ms672OriginalRenderRoutePois(plan);
};



/* ============================================================
   MijnSerenity Cloud 7.4.4 — Fullscreen kaart + alternatieve route
   ============================================================ */

let ms673PlannerMapPlaceholder=null;
let ms673PlannerMapOriginalParent=null;
let ms673PlannerMapOriginalNextSibling=null;
let ms673PlannerMapTapStart=null;
let ms673AlternativeSearchBusy=false;

function ms673RouteSignature(coordinates){
  const points=(Array.isArray(coordinates)?coordinates:[])
    .map(ms650Coordinate)
    .filter(ms650ValidCoordinate);

  if(points.length<2)return '';

  const indexes=[
    0,
    Math.floor(points.length*.25),
    Math.floor(points.length*.5),
    Math.floor(points.length*.75),
    points.length-1
  ];

  return indexes
    .map(index=>{
      const point=points[
        Math.min(points.length-1,index)
      ];
      return `${point.lat.toFixed(4)},${point.lon.toFixed(4)}`;
    })
    .join('|');
}

function ms673MapInteractionTarget(target){
  return Boolean(
    target?.closest?.(
      '.leaflet-control,'+
      '.leaflet-marker-icon,'+
      '.leaflet-popup,'+
      '.planner-map-expand'
    )
  );
}

function ms673AttachPlannerMapTap(){
  const mapElement=$('plannerMap');

  if(
    !mapElement||
    mapElement.dataset.fullscreenTapReady==='true'
  ){
    return;
  }

  mapElement.dataset.fullscreenTapReady='true';

  mapElement.addEventListener(
    'pointerdown',
    event=>{
      if(ms673MapInteractionTarget(event.target)){
        ms673PlannerMapTapStart=null;
        return;
      }

      ms673PlannerMapTapStart={
        x:event.clientX,
        y:event.clientY,
        at:Date.now()
      };
    },
    {passive:true}
  );

  mapElement.addEventListener(
    'pointerup',
    event=>{
      const start=ms673PlannerMapTapStart;
      ms673PlannerMapTapStart=null;

      if(
        !start||
        ms673MapInteractionTarget(event.target)
      ){
        return;
      }

      const moved=Math.hypot(
        event.clientX-start.x,
        event.clientY-start.y
      );

      if(
        moved<=9&&
        Date.now()-start.at<650
      ){
        openPlannerMapFullscreen(event);
      }
    },
    {passive:true}
  );
}

function openPlannerMapFullscreen(event){
  event?.preventDefault?.();
  event?.stopPropagation?.();

  const overlay=$('plannerMapFullscreen');
  const host=$('plannerMapFullscreenHost');
  const mapElement=$('plannerMap');

  if(
    !overlay||
    !host||
    !mapElement||
    !overlay.classList.contains('hidden')
  ){
    return;
  }

  ms673PlannerMapOriginalParent=
    mapElement.parentElement;
  ms673PlannerMapOriginalNextSibling=
    mapElement.nextSibling;

  ms673PlannerMapPlaceholder=
    document.createComment(
      'planner-map-fullscreen-placeholder'
    );

  ms673PlannerMapOriginalParent.insertBefore(
    ms673PlannerMapPlaceholder,
    mapElement
  );

  host.appendChild(mapElement);
  mapElement.classList.add(
    'planner-map-fullscreen-canvas'
  );

  overlay.classList.remove('hidden');
  document.body.classList.add(
    'planner-map-fullscreen-open'
  );

  const titleElement=$(
    'plannerMapFullscreenTitle'
  );

  if(titleElement){
    titleElement.textContent=
      plannerCurrentPlan?.title||
      'Routekaart Serenity';
  }

  if(
    typeof hideBottomNavigation==='function'
  ){
    hideBottomNavigation();
  }

  requestAnimationFrame(()=>{
    plannerMap?.invalidateSize({pan:false});

    const coordinates=
      plannerCurrentPlan?.routeCoordinates||[];

    if(
      plannerMap&&
      Array.isArray(coordinates)&&
      coordinates.length>1
    ){
      const bounds=L.latLngBounds(
        coordinates
          .map(ms650Coordinate)
          .filter(ms650ValidCoordinate)
          .map(point=>[point.lat,point.lon])
      );

      plannerMap.fitBounds(
        bounds,
        {
          padding:[42,42],
          maxZoom:15
        }
      );
    }
  });
}

function closePlannerMapFullscreen(
  event,
  force=false
){
  if(
    event&&
    !force&&
    event.target!==$('plannerMapFullscreen')
  ){
    return;
  }

  event?.preventDefault?.();
  event?.stopPropagation?.();

  const overlay=$('plannerMapFullscreen');
  const mapElement=$('plannerMap');

  if(
    mapElement&&
    ms673PlannerMapOriginalParent
  ){
    if(
      ms673PlannerMapPlaceholder?.parentNode
    ){
      ms673PlannerMapPlaceholder.parentNode
        .replaceChild(
          mapElement,
          ms673PlannerMapPlaceholder
        );
    }else if(
      ms673PlannerMapOriginalNextSibling&&
      ms673PlannerMapOriginalNextSibling.parentNode===
        ms673PlannerMapOriginalParent
    ){
      ms673PlannerMapOriginalParent.insertBefore(
        mapElement,
        ms673PlannerMapOriginalNextSibling
      );
    }else{
      ms673PlannerMapOriginalParent.appendChild(
        mapElement
      );
    }
  }

  mapElement?.classList.remove(
    'planner-map-fullscreen-canvas'
  );
  overlay?.classList.add('hidden');
  document.body.classList.remove(
    'planner-map-fullscreen-open'
  );

  ms673PlannerMapPlaceholder=null;
  ms673PlannerMapOriginalParent=null;
  ms673PlannerMapOriginalNextSibling=null;

  requestAnimationFrame(()=>{
    plannerMap?.invalidateSize({pan:false});

    if(plannerCurrentPlan){
      renderPlannerMap(plannerCurrentPlan);
    }

    if(
      typeof showBottomNavigation==='function'
    ){
      showBottomNavigation(false,false);
    }
  });
}

document.addEventListener(
  'keydown',
  event=>{
    if(
      event.key==='Escape'&&
      !$('plannerMapFullscreen')?.classList
        .contains('hidden')
    ){
      closePlannerMapFullscreen(event,true);
    }
  }
);

function ms673ProfileNeedsAlternative(plan){
  return Boolean(
    plan?.smartAnalysis?.checks?.some(
      check=>
        check.level==='critical'&&
        /te laag|te smal|diepte onvoldoende|breedte|hoogte|diepgang/i
          .test(
            `${check.title} ${check.text}`
          )
    )
  );
}

function ms673RouteCandidateScore(candidate){
  const analysis=candidate.smartAnalysis||{};
  const unknown=(analysis.checks||[])
    .filter(check=>check.level==='unknown')
    .length;

  return (
    Number(analysis.critical||0)*100000+
    Number(analysis.warnings||0)*10000+
    unknown*500+
    Number(candidate.durationHours||0)*100+
    Number(candidate.distanceKm||0)
  );
}

function ms673UnionBounds(routeSets){
  const points=routeSets
    .flatMap(coordinates=>
      (Array.isArray(coordinates)?coordinates:[])
        .map(ms650Coordinate)
        .filter(ms650ValidCoordinate)
    );

  if(!points.length)return null;

  const lats=points.map(point=>point.lat);
  const lons=points.map(point=>point.lon);
  const margin=.04;

  return {
    south:Math.min(...lats)-margin,
    west:Math.min(...lons)-margin,
    north:Math.max(...lats)+margin,
    east:Math.max(...lons)+margin
  };
}

async function ms673FetchRouteVariant(
  points,
  profile,
  alternativeIndex
){
  const endpoints=[
    '/api/waterway-route',
    '/api/waterway-route-backup'
  ];
  let lastError=null;

  for(const endpoint of endpoints){
    try{
      const url=new URL(
        endpoint,
        location.origin
      );

      url.searchParams.set(
        'lonlats',
        points
          .map(point=>
            `${Number(point.lon)},${Number(point.lat)}`
          )
          .join('|')
      );
      url.searchParams.set(
        'profile',
        profile
      );
      url.searchParams.set(
        'alternativeidx',
        String(alternativeIndex)
      );
      url.searchParams.set(
        'format',
        'geojson'
      );

      const response=await fetch(url,{
        headers:{
          accept:
            'application/geo+json, application/json'
        },
        cache:'no-store'
      });

      if(!response.ok){
        throw new Error(
          `${profile} alternatief ${alternativeIndex}: `+
          `HTTP ${response.status}`
        );
      }

      const payload=await response.json();
      const features=payload?.type==='FeatureCollection'
        ?payload.features||[]
        :payload?.type==='Feature'
          ?[payload]
          :payload?.type==='LineString'
            ?[{
                geometry:payload,
                properties:{}
              }]
            :[];

      const feature=features.find(item=>
        item?.geometry?.type==='LineString'&&
        Array.isArray(item.geometry.coordinates)&&
        item.geometry.coordinates.length>=2
      );

      if(!feature){
        throw new Error(
          'Router gaf geen alternatieve lijn terug.'
        );
      }

      const coordinates=
        feature.geometry.coordinates
          .map(ms650Coordinate)
          .filter(ms650ValidCoordinate);

      if(coordinates.length<2){
        throw new Error(
          'Alternatieve route bevat te weinig punten.'
        );
      }

      return {
        coordinates,
        profile,
        alternativeIndex,
        routeSource:
          `Alternatief ${alternativeIndex} · ${profile}`
      };
    }catch(error){
      lastError=error;
    }
  }

  throw lastError||
    new Error(
      'Alternatieve waterwegroute niet beschikbaar.'
    );
}

function ms673VariantFromPlan(
  plan,
  id='basis',
  label='Basisroute'
){
  return {
    id,
    label,
    coordinates:[
      ...(plan.routeCoordinates||[])
    ],
    distanceKm:Number(plan.distanceKm||0),
    durationHours:Number(plan.durationHours||0),
    routeSource:
      plan.routeSource||
      label,
    routeObjects:[
      ...(plan.routeObjects||[])
    ],
    routePois:[
      ...(plan.routePois||[])
    ],
    segments:[
      ...(plan.segments||[])
    ],
    smartAnalysis:plan.smartAnalysis,
    dayPlan:plan.dayPlan,
    score:ms673RouteCandidateScore(plan)
  };
}

function ms673BuildCandidate(
  basePlan,
  variant,
  elements
){
  const distanceKm=
    ms650RouteDistanceKm(
      variant.coordinates
    );
  const durationHours=
    distanceKm/
    Math.max(1,Number(basePlan.speed||9));
  const routeObjects=
    ms670ProcessObjects(
      elements,
      variant.coordinates
    );
  const routePois=
    ms650CollectRoutePois(
      variant.coordinates,
      basePlan.points||[]
    );

  const candidate={
    ...basePlan,
    routeCoordinates:variant.coordinates,
    distanceKm,
    durationHours,
    routeSource:variant.routeSource,
    routeObjects,
    routePois,
    segments:ms650SplitRouteByAnchors(
      variant.coordinates,
      basePlan.points||[]
    )
  };

  candidate.smartAnalysis=
    ms670AnalysePlan(candidate);
  candidate.dayPlan=
    ms670BuildDayPlan(candidate);

  return {
    id:
      `alternatief-${variant.profile}-${variant.alternativeIndex}`,
    label:
      `Alternatief ${variant.alternativeIndex} · ${variant.profile}`,
    coordinates:variant.coordinates,
    distanceKm,
    durationHours,
    routeSource:variant.routeSource,
    routeObjects,
    routePois,
    segments:candidate.segments,
    smartAnalysis:candidate.smartAnalysis,
    dayPlan:candidate.dayPlan,
    score:ms673RouteCandidateScore(candidate)
  };
}

function ms673ApplyVariantData(
  plan,
  variant
){
  plan.routeCoordinates=[
    ...(variant.coordinates||[])
  ];
  plan.distanceKm=
    Number(variant.distanceKm||0);
  plan.durationHours=
    Number(variant.durationHours||0);
  plan.routeSource=
    variant.routeSource||
    variant.label;
  plan.routeObjects=[
    ...(variant.routeObjects||[])
  ];
  plan.routePois=[
    ...(variant.routePois||[])
  ];
  plan.segments=[
    ...(variant.segments||[])
  ];
  plan.smartAnalysis=
    variant.smartAnalysis;
  plan.dayPlan=
    variant.dayPlan;
  plan.selectedRouteVariant=
    variant.id;
  plan.updatedAt=
    new Date().toISOString();

  return plan;
}

function ms673VariantDescription(variant){
  const analysis=variant.smartAnalysis||{};
  const critical=Number(
    analysis.critical||0
  );
  const warnings=Number(
    analysis.warnings||0
  );

  return [
    `${plannerNumber(variant.distanceKm)} km`,
    plannerDurationText(
      variant.durationHours
    ),
    critical
      ?`${critical} mogelijke blokkade${critical===1?'':'s'}`
      :'geen bekende blokkade',
    warnings
      ?`${warnings} aandachtspunt${warnings===1?'':'en'}`
      :''
  ].filter(Boolean).join(' · ');
}

function ms673RenderAlternativePanel(plan){
  const panel=$('ms673AlternativePanel');
  const title=$('ms673AlternativeTitle');
  const text=$('ms673AlternativeText');
  const actions=$(
    'ms673AlternativeActions'
  );

  if(!panel||!actions)return;

  const variants=
    Array.isArray(plan?.routeVariants)
      ?plan.routeVariants
      :[];

  if(
    !ms673ProfileNeedsAlternative(plan)&&
    variants.length<2
  ){
    panel.classList.add('hidden');
    return;
  }

  panel.classList.remove('hidden');

  if(plan.alternativeSearchStatus==='searching'){
    panel.className=
      'ms673-alternative-panel searching';
    title.textContent=
      'Alternatieve route wordt gezocht…';
    text.textContent=
      'De router vergelijkt andere waterwegvarianten met de maten van Serenity.';
    actions.innerHTML=
      '<span class="ms673-spinner">⟳</span>';
    return;
  }

  if(variants.length<2){
    panel.className=
      'ms673-alternative-panel unavailable';
    title.textContent=
      'Geen betere alternatieve route gevonden';
    text.textContent=
      'De basisroute blijft staan. Controleer de blokkade handmatig en kies eventueel andere tussenstops.';
    actions.innerHTML='';
    return;
  }

  const selected=variants.find(
    variant=>
      variant.id===
      plan.selectedRouteVariant
  )||variants[0];
  const base=variants[0];
  const improved=
    selected.id!==base.id&&
    selected.score<base.score;

  panel.className=
    `ms673-alternative-panel ${
      improved?'success':'available'
    }`;

  title.textContent=improved
    ?'Veiligere alternatieve route automatisch gekozen'
    :'Alternatieve routes beschikbaar';

  text.textContent=improved
    ?`${selected.label}: ${ms673VariantDescription(selected)}.`
    :'Vergelijk de routes op bekende beperkingen, afstand en vaartijd.';

  actions.innerHTML=variants.map(
    variant=>`
      <button type="button"
        class="${
          variant.id===selected.id
            ?'active'
            :'secondary'
        }"
        onclick="ms673SelectRouteVariant('${esc(variant.id)}')">
        ${
          variant.id===base.id
            ?'Basis'
            :'Alternatief'
        }
        <small>
          ${esc(ms673VariantDescription(variant))}
        </small>
      </button>
    `
  ).join('');
}

function ms673SelectRouteVariant(id){
  const plan=plannerCurrentPlan;
  const variant=plan?.routeVariants?.find(
    item=>item.id===id
  );

  if(!plan||!variant)return;

  ms673ApplyVariantData(
    plan,
    variant
  );

  renderPlannerSummary(plan);
  setPlannerStatus(
    `${variant.label} geselecteerd: `+
    `${ms673VariantDescription(variant)}.`,
    variant.smartAnalysis?.critical
      ?'warning'
      :'success'
  );

  showAppToast(
    `${variant.label} actief`
  );
}

async function ms673FindSaferAlternative(
  plan
){
  if(
    ms673AlternativeSearchBusy||
    !ms673ProfileNeedsAlternative(plan)||
    !Array.isArray(plan?.points)||
    plan.points.length<2
  ){
    return plan;
  }

  ms673AlternativeSearchBusy=true;
  plan.alternativeSearchStatus='searching';
  ms673RenderAlternativePanel(plan);

  try{
    const parsedProfile=String(
      plan.routeSource||''
    ).split('·').at(-1)?.trim();
    const currentProfile=
      parsedProfile&&
      /^[a-z0-9_-]+$/i.test(parsedProfile)
        ?parsedProfile
        :'motorboat';

    const requests=[
      [currentProfile,1],
      [currentProfile,2],
      ['motorboat',1],
      ['waterway_nomod',1],
      ['river',1]
    ];

    const results=await Promise.allSettled(
      requests.map(
        ([profile,index])=>
          ms673FetchRouteVariant(
            plan.points,
            profile,
            index
          )
      )
    );

    const baseSignature=
      ms673RouteSignature(
        plan.routeCoordinates
      );
    const seen=new Set([baseSignature]);
    const rawVariants=[];

    results.forEach(result=>{
      if(result.status!=='fulfilled')return;

      const signature=
        ms673RouteSignature(
          result.value.coordinates
        );

      if(
        !signature||
        seen.has(signature)
      ){
        return;
      }

      seen.add(signature);
      rawVariants.push(result.value);
    });

    if(!rawVariants.length){
      plan.routeVariants=[
        ms673VariantFromPlan(plan)
      ];
      plan.selectedRouteVariant='basis';
      plan.alternativeSearchStatus=
        'unavailable';
      ms673RenderAlternativePanel(plan);
      return plan;
    }

    const bounds=ms673UnionBounds([
      plan.routeCoordinates,
      ...rawVariants.map(
        variant=>variant.coordinates
      )
    ]);

    let elements=[];

    if(bounds){
      try{
        elements=await ms670FetchOverpass(
          ms670InfrastructureQuery(bounds)
        );
      }catch(error){
        console.warn(
          'Objecten voor alternatieve route niet beschikbaar:',
          error
        );
      }
    }

    const baseVariant=
      ms673VariantFromPlan(plan);
    const alternatives=rawVariants.map(
      variant=>
        ms673BuildCandidate(
          plan,
          variant,
          elements
        )
    );

    const variants=[
      baseVariant,
      ...alternatives
    ];

    plan.routeVariants=variants;

    const safest=[...variants]
      .sort((a,b)=>a.score-b.score)[0];

    if(
      safest&&
      safest.score<baseVariant.score
    ){
      ms673ApplyVariantData(
        plan,
        safest
      );
      plan.alternativeSearchStatus=
        'selected';
    }else{
      plan.selectedRouteVariant=
        baseVariant.id;
      plan.alternativeSearchStatus=
        'available';
    }

    plannerCurrentPlan=plan;
    renderPlannerSummary(plan);

    return plan;
  }catch(error){
    console.error(
      'Alternatieve route zoeken mislukt:',
      error
    );
    plan.routeVariants=[
      ms673VariantFromPlan(plan)
    ];
    plan.selectedRouteVariant='basis';
    plan.alternativeSearchStatus=
      'unavailable';
    ms673RenderAlternativePanel(plan);
    return plan;
  }finally{
    ms673AlternativeSearchBusy=false;
  }
}

const ms673OriginalRenderPlannerSummary=
  renderPlannerSummary;

renderPlannerSummary=function(plan){
  const result=
    ms673OriginalRenderPlannerSummary(
      plan
    );

  ms673AttachPlannerMapTap();
  ms673RenderAlternativePanel(plan);
  return result;
};

const ms673OriginalCalculatePlannerRoute=
  calculatePlannerRoute;

calculatePlannerRoute=async function(options={}){
  const plan=
    await ms673OriginalCalculatePlannerRoute(
      options
    );

  if(!plan)return null;

  await ms673FindSaferAlternative(plan);
  return plannerCurrentPlan||plan;
};

const ms673OriginalInitPlanner=
  initPlanner;

initPlanner=function(){
  const result=
    ms673OriginalInitPlanner();

  setTimeout(
    ms673AttachPlannerMapTap,
    100
  );

  if(plannerCurrentPlan){
    ms673RenderAlternativePanel(
      plannerCurrentPlan
    );
  }

  return result;
};



/* ============================================================
   MijnSerenity Cloud 7.4.4 — Auto Logbook
   ============================================================ */

let ms680DepartureWatchId=null;
let ms680DepartureArmed=false;
let ms680DepartureBaseline=null;
let ms680MovementCandidateAt=null;
let ms680LastWatchPoint=null;
let ms680SuppressWaterkaarten=false;
let ms680StopCandidateAt=null;
let ms680StopEventOpen=false;
let ms680QuickPhotoFiles=[];
let ms680AutoStartInProgress=false;
let ms680PlaceLookupBusy=false;

function ms680EventIcon(type){
  return {
    armed:'⚓',
    departure:'▶',
    moving:'🛥️',
    stop:'⏸',
    resume:'▶',
    arrival:'🏁',
    photo:'📷',
    saved:'✅',
    cancelled:'↩'
  }[type]||'•';
}

function ms680EventTitle(type){
  return {
    armed:'Wacht op vertrek',
    departure:'Vertrek gedetecteerd',
    moving:'Serenity vaart',
    stop:'Tussenstop gedetecteerd',
    resume:'Vaart hervat',
    arrival:'Aankomst gedetecteerd',
    photo:'Foto toegevoegd',
    saved:'Logboek opgeslagen',
    cancelled:'Aankomstdetectie geannuleerd'
  }[type]||'Gebeurtenis';
}

function ms680EnsureState(){
  if(!Array.isArray(liveNavState.autoEvents)){
    liveNavState.autoEvents=[];
  }

  if(!Array.isArray(liveNavState.stopEvents)){
    liveNavState.stopEvents=[];
  }

  if(
    typeof liveNavState.arrivalIgnoredUntilMove!=='boolean'
  ){
    liveNavState.arrivalIgnoredUntilMove=false;
  }

  return liveNavState;
}

function ms680AddEvent(
  type,
  details='',
  point=null,
  options={}
){
  ms680EnsureState();

  const now=Number(options.time)||Date.now();
  const last=liveNavState.autoEvents.at(-1);

  if(
    options.dedupe!==false&&
    last?.type===type&&
    now-Number(last.time||0)<30000
  ){
    return last;
  }

  const event={
    id:
      globalThis.crypto?.randomUUID?.()||
      `event-${now}-${Math.random().toString(16).slice(2)}`,
    type,
    title:
      options.title||
      ms680EventTitle(type),
    details:String(details||''),
    time:now,
    lat:Number.isFinite(Number(point?.lat))
      ?Number(point.lat)
      :null,
    lon:Number.isFinite(Number(point?.lon))
      ?Number(point.lon)
      :null,
    place:String(options.place||'')
  };

  liveNavState.autoEvents.push(event);

  if(liveNavState.autoEvents.length>80){
    liveNavState.autoEvents=
      liveNavState.autoEvents.slice(-80);
  }

  persistLiveState();
  ms680RenderTimeline();

  if(
    event.lat!==null&&
    event.lon!==null&&
    !event.place
  ){
    ms680ResolveEventPlace(event);
  }

  return event;
}

async function ms680ResolveEventPlace(event){
  if(!event||event.place)return;

  try{
    const place=await reverseLivePlaceName([
      event.lon,
      event.lat
    ]);

    if(place){
      event.place=place;
      persistLiveState();
      ms680RenderTimeline();
    }
  }catch(error){
    console.warn(
      'Plaats bij automatische gebeurtenis bepalen mislukt:',
      error
    );
  }
}

function ms680FormatEventTime(value){
  if(!value)return '–';

  return new Date(value).toLocaleTimeString(
    'nl-NL',
    {
      hour:'2-digit',
      minute:'2-digit'
    }
  );
}

function ms680RenderTimeline(){
  const container=$('ms680TripTimeline');
  const count=$('ms680TimelineCount');

  if(!container||!count)return;

  const events=Array.isArray(liveNavState.autoEvents)
    ?liveNavState.autoEvents
    :[];

  count.textContent=
    `${events.length} ${
      events.length===1
        ?'gebeurtenis'
        :'gebeurtenissen'
    }`;

  if(!events.length){
    container.innerHTML=`
      <div class="ms680-empty-timeline">
        Vertrek, varen, stilstand en aankomst verschijnen hier
        automatisch.
      </div>
    `;
    return;
  }

  container.innerHTML=events
    .slice()
    .reverse()
    .map(event=>`
      <article class="ms680-timeline-item ${esc(event.type)}">
        <span class="ms680-timeline-icon">
          ${ms680EventIcon(event.type)}
        </span>
        <div>
          <strong>${esc(event.title||ms680EventTitle(event.type))}</strong>
          <small>
            ${ms680FormatEventTime(event.time)}
            ${event.place?` · ${esc(event.place)}`:''}
            ${event.details?` · ${esc(event.details)}`:''}
          </small>
        </div>
      </article>
    `).join('');
}

function ms680SetAutoUi(
  title,
  text,
  state='idle',
  icon='⚓'
){
  const badge=$('ms680AutoBadge');

  ms660SetText?.('ms680AutoTitle',title);
  ms660SetText?.('ms680AutoText',text);
  ms660SetText?.('ms680AutoIcon',icon);

  if(badge){
    badge.className=`ms680-auto-badge ${state}`;
    badge.textContent={
      idle:'Gereed',
      armed:'Wachten',
      moving:'Vertrek',
      active:'● Opname',
      stopped:'Aankomst',
      error:'Storing'
    }[state]||'Gereed';
  }

  $('ms680ArmButton')?.classList.toggle(
    'hidden',
    ms680DepartureArmed||
    liveNavState.status!=='idle'
  );
  $('ms680DisarmButton')?.classList.toggle(
    'hidden',
    !ms680DepartureArmed
  );
  $('ms680FinishButton')?.classList.toggle(
    'hidden',
    !['active','paused'].includes(
      liveNavState.status
    )
  );
}

function ms680AutomationSettings(){
  const stored=readLiveAutomationSettings();

  return {
    ...stored,
    autoStart:
      stored.autoStart!==false,
    startSpeedKmh:
      Number(stored.startSpeedKmh||2),
    startConfirmSeconds:
      Number(stored.startConfirmSeconds||15),
    stopEventMinutes:
      Number(stored.stopEventMinutes||3)
  };
}

function ms680CurrentWatchSpeed(position){
  const point={
    lat:Number(position?.coords?.latitude),
    lon:Number(position?.coords?.longitude),
    time:Number(position?.timestamp)||Date.now(),
    speed:Number.isFinite(position?.coords?.speed)
      ?Math.max(0,position.coords.speed*3.6)
      :null
  };

  if(
    !Number.isFinite(point.lat)||
    !Number.isFinite(point.lon)
  ){
    return null;
  }

  let calculated=0;

  if(ms680LastWatchPoint){
    const seconds=Math.max(
      1,
      (point.time-ms680LastWatchPoint.time)/1000
    );
    calculated=
      haversineKm(
        ms680LastWatchPoint,
        point
      )/
      (seconds/3600);
  }

  point.speedKmh=Math.max(
    Number.isFinite(point.speed)
      ?point.speed
      :0,
    Number.isFinite(calculated)
      ?calculated
      :0
  );

  ms680LastWatchPoint=point;
  return point;
}

function ms680StopDepartureWatch(){
  if(ms680DepartureWatchId!==null){
    navigator.geolocation.clearWatch(
      ms680DepartureWatchId
    );
    ms680DepartureWatchId=null;
  }

  ms680MovementCandidateAt=null;
  ms680LastWatchPoint=null;
}

function ms680DisarmDepartureWatch(options={}){
  ms680StopDepartureWatch();
  ms680DepartureArmed=false;

  try{
    localStorage.setItem(
      `mijnserenity-auto-departure-armed-${currentBoat?.id||'boat'}`,
      '0'
    );
  }catch{}

  if(!options.silent){
    ms680AddEvent(
      'cancelled',
      'Wachtmodus gestopt',
      null,
      {dedupe:false}
    );
  }

  ms680SetAutoUi(
    'Klaar voor vertrek',
    'Tik op Wacht op vertrek om automatische vertrekdetectie te activeren.',
    'idle',
    '⚓'
  );
}

function ms680ArmDepartureWatch(){
  if(
    !navigator.geolocation||
    liveNavState.status!=='idle'
  ){
    if(!navigator.geolocation){
      alert(
        'Dit apparaat ondersteunt geen GPS-locatie.'
      );
    }
    return;
  }

  const settings=ms680AutomationSettings();

  if(!settings.autoStart){
    showAppToast(
      'Zet Automatisch starten eerst aan in de instellingen.'
    );
    $('ms680AutoStart')?.focus();
    return;
  }

  ms680StopDepartureWatch();
  ms680DepartureArmed=true;
  ms680DepartureBaseline=null;

  try{
    localStorage.setItem(
      `mijnserenity-auto-departure-armed-${currentBoat?.id||'boat'}`,
      '1'
    );
  }catch{}

  ms680AddEvent(
    'armed',
    `Start vanaf ${settings.startSpeedKmh.toFixed(1)} km/u`,
    null,
    {dedupe:false}
  );

  ms680SetAutoUi(
    'Wachten tot Serenity vertrekt',
    `Beweging wordt ${settings.startConfirmSeconds} seconden gecontroleerd om GPS-jitter te voorkomen.`,
    'armed',
    '⚓'
  );

  setLiveAutoLogStatus(
    'Wachtmodus actief · laat MijnSerenity geopend en locatie ingeschakeld.',
    'success'
  );

  ms680DepartureWatchId=
    navigator.geolocation.watchPosition(
      ms680HandleDepartureWatch,
      error=>{
        ms680SetAutoUi(
          'GPS voor vertrekdetectie niet beschikbaar',
          error?.message||
          'Controleer de locatietoegang.',
          'error',
          '!'
        );
      },
      {
        enableHighAccuracy:true,
        maximumAge:1500,
        timeout:20000
      }
    );
}

async function ms680HandleDepartureWatch(position){
  if(
    !ms680DepartureArmed||
    liveNavState.status!=='idle'||
    ms680AutoStartInProgress
  ){
    return;
  }

  const settings=ms680AutomationSettings();
  const point=ms680CurrentWatchSpeed(position);

  if(!point)return;

  if(
    !ms680DepartureBaseline||
    Number(position.coords.accuracy)>80
  ){
    if(!ms680DepartureBaseline){
      ms680DepartureBaseline=point;
    }

    ms680SetAutoUi(
      'GPS-locatie controleren',
      `Nauwkeurigheid ${Math.round(position.coords.accuracy||0)} meter`,
      'armed',
      '⌖'
    );
    return;
  }

  const movedKm=haversineKm(
    ms680DepartureBaseline,
    point
  );
  const moving=
    point.speedKmh>=settings.startSpeedKmh&&
    movedKm>=.025;

  if(!moving){
    ms680MovementCandidateAt=null;

    ms680SetAutoUi(
      'Wachten tot Serenity vertrekt',
      `Actueel ${point.speedKmh.toFixed(1)} km/u · minimaal ${settings.startSpeedKmh.toFixed(1)} km/u`,
      'armed',
      '⚓'
    );
    return;
  }

  if(!ms680MovementCandidateAt){
    ms680MovementCandidateAt=point.time;

    ms680SetAutoUi(
      'Beweging gedetecteerd',
      `Nog ${settings.startConfirmSeconds} seconden bevestigen…`,
      'moving',
      '🛥️'
    );
    return;
  }

  const confirmedSeconds=
    (point.time-ms680MovementCandidateAt)/1000;
  const remaining=Math.max(
    0,
    settings.startConfirmSeconds-
    confirmedSeconds
  );

  ms680SetAutoUi(
    'Serenity begint te varen',
    remaining>0
      ?`Vertrek wordt over ${Math.ceil(remaining)} seconden gestart.`
      :'Vertrek bevestigd · opname starten…',
    'moving',
    '🛥️'
  );

  if(confirmedSeconds<settings.startConfirmSeconds){
    return;
  }

  ms680AutoStartInProgress=true;
  const departurePoint={
    lat:ms680DepartureBaseline.lat,
    lon:ms680DepartureBaseline.lon,
    time:ms680DepartureBaseline.time
  };

  ms680DisarmDepartureWatch({silent:true});
  ms680SuppressWaterkaarten=true;

  try{
    startLiveNavigation();

    ms680EnsureState();
    liveNavState.autoStarted=true;
    liveNavState.autoEvents=[];
    liveNavState.stopEvents=[];
    liveNavState.points.unshift(
      departurePoint
    );

    ms680AddEvent(
      'departure',
      'Opname automatisch gestart',
      departurePoint,
      {dedupe:false}
    );
    ms680AddEvent(
      'moving',
      `${point.speedKmh.toFixed(1)} km/u`,
      point,
      {dedupe:false}
    );

    if(!String($('liveFrom')?.value||'').trim()){
      reverseLivePlaceName([
        departurePoint.lon,
        departurePoint.lat
      ]).then(place=>{
        if(place){
          $('liveFrom').value=place;
          updateLiveRouteTitle();
          persistLiveState();
        }
      });
    }

    const plan=
      typeof ms660NavigationPlan==='function'
        ?ms660NavigationPlan()
        :null;
    const destination=
      plan?.points?.at(-1)?.label||
      plan?.points?.at(-1)?.place||
      '';

    if(
      destination&&
      !String($('liveTo')?.value||'').trim()
    ){
      $('liveTo').value=destination;
      liveNavState.linkedPlannerId=
        plan.id||null;
      updateLiveRouteTitle();
    }

    persistLiveState();
    renderLiveState();
    renderLiveRoute();

    showAppToast(
      'Vertrek gedetecteerd · automatisch vaarlogboek gestart'
    );
  }finally{
    setTimeout(()=>{
      ms680SuppressWaterkaarten=false;
      ms680AutoStartInProgress=false;
    },1000);
  }
}

function ms680ProcessActivePosition(position){
  if(liveNavState.status!=='active')return;

  ms680EnsureState();

  const point={
    lat:Number(position?.coords?.latitude),
    lon:Number(position?.coords?.longitude),
    time:Number(position?.timestamp)||Date.now()
  };
  const speed=Number(liveNavState.speedKmh||0);
  const settings=ms680AutomationSettings();
  const now=point.time;

  if(speed>=1.5){
    if(liveNavState.arrivalIgnoredUntilMove){
      liveNavState.arrivalIgnoredUntilMove=false;
    }

    if(ms680StopEventOpen){
      const stop=liveNavState.stopEvents.at(-1);
      const stoppedMinutes=stop
        ?Math.max(
            0,
            (now-Number(stop.startedAt||now))/60000
          )
        :0;

      if(stop){
        stop.endedAt=now;
        stop.durationMinutes=
          stoppedMinutes;
      }

      ms680AddEvent(
        'resume',
        stoppedMinutes>=1
          ?`Na ${Math.round(stoppedMinutes)} minuten`
          :'Vaart hervat',
        point,
        {dedupe:false}
      );
    }

    ms680StopEventOpen=false;
    ms680StopCandidateAt=null;
    return;
  }

  if(!liveNavState.movingDetected)return;

  if(!ms680StopCandidateAt){
    ms680StopCandidateAt=now;
    return;
  }

  const stopMinutes=
    (now-ms680StopCandidateAt)/60000;

  if(
    stopMinutes>=settings.stopEventMinutes&&
    !ms680StopEventOpen
  ){
    ms680StopEventOpen=true;

    liveNavState.stopEvents.push({
      startedAt:ms680StopCandidateAt,
      endedAt:null,
      durationMinutes:null,
      lat:point.lat,
      lon:point.lon
    });

    ms680AddEvent(
      'stop',
      `Serenity staat ${Math.floor(stopMinutes)} minuten stil`,
      point,
      {dedupe:false}
    );
  }
}

function ms680RenderArrivalCountdown(){
  const panel=$('ms680ArrivalCountdown');

  if(!panel)return;

  const settings=ms680AutomationSettings();
  const active=
    liveNavState.status==='active'&&
    liveNavState.movingDetected&&
    liveNavState.stationarySince&&
    settings.autoStop&&
    !liveNavState.arrivalIgnoredUntilMove;

  panel.classList.toggle('hidden',!active);

  if(!active)return;

  const elapsed=
    Date.now()-
    Number(liveNavState.stationarySince);
  const total=
    Number(settings.autoStopMinutes||10)*
    60000;
  const remaining=Math.max(
    0,
    total-elapsed
  );

  ms660SetText?.(
    'ms680ArrivalTitle',
    remaining>0
      ?`Automatisch afronden over ${Math.ceil(remaining/60000)} min`
      :'Aankomst wordt nu vastgelegd'
  );
  ms660SetText?.(
    'ms680ArrivalText',
    'Blijft Serenity stil, dan worden aankomst, route en logboek automatisch afgerond.'
  );
}

function ms680CancelArrivalDetection(){
  liveNavState.arrivalIgnoredUntilMove=true;
  liveNavState.stationarySince=null;
  liveNavState.autoStopTriggered=false;
  clearLiveAutoStopTimer();

  ms680AddEvent(
    'cancelled',
    'Stilstand telt niet als aankomst',
    liveNavState.points.at(-1),
    {dedupe:false}
  );

  persistLiveState();
  ms680RenderArrivalCountdown();
  setLiveAutoLogStatus(
    'Aankomstdetectie geannuleerd. Na opnieuw varen wordt deze automatisch hersteld.',
    'warning'
  );
}

async function ms680FinishNow(){
  if(
    !['active','paused'].includes(
      liveNavState.status
    )
  ){
    return;
  }

  if(!confirm(
    'Deze positie als aankomst vastleggen en de vaartocht afronden?'
  )){
    return;
  }

  await stopLiveNavigation({
    automatic:true,
    manualArrival:true
  });
}

function ms680AddQuickPhotos(fileList){
  const incoming=[...(fileList||[])];

  if(!incoming.length)return;

  ms680QuickPhotoFiles=[
    ...ms680QuickPhotoFiles,
    ...incoming
  ].slice(0,10);

  const mainInput=$('livePhotos');

  try{
    const transfer=new DataTransfer();

    [
      ...(mainInput?.files||[]),
      ...ms680QuickPhotoFiles
    ]
      .slice(0,10)
      .forEach(file=>transfer.items.add(file));

    if(mainInput){
      mainInput.files=transfer.files;
    }

    ms680QuickPhotoFiles=[
      ...transfer.files
    ];
  }catch(error){
    console.warn(
      'Foto’s combineren via DataTransfer niet beschikbaar:',
      error
    );
  }

  ms680AddEvent(
    'photo',
    `${incoming.length} foto${incoming.length===1?'':'’s'} toegevoegd`,
    liveNavState.points.at(-1),
    {dedupe:false}
  );

  showAppToast(
    `${ms680QuickPhotoFiles.length} foto${ms680QuickPhotoFiles.length===1?'':'’s'} klaar voor het logboek`
  );

  const input=$('ms680QuickPhoto');
  if(input)input.value='';
}

function ms680TimelineNotes(){
  const events=Array.isArray(liveNavState.autoEvents)
    ?liveNavState.autoEvents
    :[];
  const stops=Array.isArray(liveNavState.stopEvents)
    ?liveNavState.stopEvents
    :[];

  const lines=events.map(event=>{
    const time=ms680FormatEventTime(event.time);
    const location=event.place
      ?` · ${event.place}`
      :'';
    const detail=event.details
      ?` · ${event.details}`
      :'';

    return `${time} ${event.title}${location}${detail}`;
  });

  const stopMinutes=stops.reduce(
    (total,stop)=>
      total+
      Number(stop.durationMinutes||0),
    0
  );

  return [
    lines.length
      ?'Automatische tijdlijn:\n'+lines.join('\n')
      :'',
    stopMinutes>0
      ?`Herkenbare tussenstops: ${Math.round(stopMinutes)} minuten totaal.`
      :'',
    liveNavState.autoStarted
      ?'Opname automatisch gestart na vertrekdetectie.'
      :''
  ].filter(Boolean).join('\n');
}

function ms680RenderAutoLogbook(){
  ms680EnsureState();
  ms680RenderTimeline();
  ms680RenderArrivalCountdown();

  if(ms680DepartureArmed){
    ms680SetAutoUi(
      'Wachten tot Serenity vertrekt',
      'GPS bewaakt beweging. Laat MijnSerenity geopend.',
      'armed',
      '⚓'
    );
    return;
  }

  const status=liveNavState.status;

  if(status==='active'){
    ms680SetAutoUi(
      liveNavState.autoStarted
        ?'Automatische opname actief'
        :'Vaartocht wordt opgenomen',
      liveNavState.movingDetected
        ?`${Number(liveNavState.distanceKm||0).toFixed(2)} km vastgelegd`
        :'Wachten op duidelijke vaarbeweging',
      'active',
      '🛥️'
    );
  }else if(status==='paused'){
    ms680SetAutoUi(
      'Opname gepauzeerd',
      'Hervat om GPS en automatische detectie weer te starten.',
      'idle',
      '⏸'
    );
  }else if(status==='stopped'){
    ms680SetAutoUi(
      'Aankomst vastgelegd',
      'Vertrek, aankomst en route worden voorbereid voor het logboek.',
      'stopped',
      '🏁'
    );
  }else{
    ms680SetAutoUi(
      'Klaar voor vertrek',
      'Tik op Wacht op vertrek of start de opname handmatig.',
      'idle',
      '⚓'
    );
  }
}

function ms680RestoreArmedWatch(){
  if(
    liveNavState.status!=='idle'||
    ms680DepartureArmed
  ){
    return;
  }

  let armed=false;

  try{
    armed=
      localStorage.getItem(
        `mijnserenity-auto-departure-armed-${currentBoat?.id||'boat'}`
      )==='1';
  }catch{}

  if(
    armed&&
    ms680AutomationSettings().autoStart
  ){
    setTimeout(
      ms680ArmDepartureWatch,
      450
    );
  }
}

/* Respecteer geannuleerde aankomstdetectie. */
const ms680OriginalAutoStopDetection=
  updateLiveAutoStopDetection;

updateLiveAutoStopDetection=function(point){
  if(liveNavState.arrivalIgnoredUntilMove){
    if(Number(liveNavState.speedKmh||0)>=1.5){
      liveNavState.arrivalIgnoredUntilMove=false;
    }else{
      clearLiveAutoStopTimer();
      ms680RenderArrivalCountdown();
      return;
    }
  }

  return ms680OriginalAutoStopDetection(point);
};

/* Verwerk beweging en tussenstops na ieder geldig GPS-resultaat. */
const ms680OriginalHandleLivePosition=
  handleLivePosition;

handleLivePosition=function(position){
  const result=
    ms680OriginalHandleLivePosition(position);

  ms680ProcessActivePosition(position);
  ms680RenderAutoLogbook();
  return result;
};

/* Automatisch starten mag Waterkaarten niet via een geblokkeerde popup openen. */
const ms680OriginalOpenWaterkaarten=
  openWaterkaarten;

openWaterkaarten=function(){
  if(ms680SuppressWaterkaarten){
    return;
  }

  return ms680OriginalOpenWaterkaarten();
};

/* Nieuwe velden initialiseren bij iedere start. */
const ms680OriginalStartLiveNavigation=
  startLiveNavigation;

startLiveNavigation=function(){
  ms680DisarmDepartureWatch({silent:true});

  const result=
    ms680OriginalStartLiveNavigation();

  ms680EnsureState();

  if(!liveNavState.autoEvents.length){
    ms680AddEvent(
      'departure',
      liveNavState.autoStarted
        ?'Automatisch gestart'
        :'Handmatig gestart',
      liveNavState.points.at(-1),
      {dedupe:false}
    );
  }

  ms680StopCandidateAt=null;
  ms680StopEventOpen=false;
  ms680RenderAutoLogbook();

  return result;
};

/* Aankomst als gebeurtenis toevoegen vóór automatisch opslaan. */
const ms680OriginalStopLiveNavigation=
  stopLiveNavigation;

stopLiveNavigation=async function(options={}){
  const lastPoint=liveNavState.points.at(-1);

  if(
    ['active','paused'].includes(
      liveNavState.status
    )
  ){
    ms680AddEvent(
      'arrival',
      options.automatic
        ?'Automatisch afgerond na afmeren'
        :'Opname gestopt',
      lastPoint,
      {dedupe:false}
    );
  }

  const result=
    await ms680OriginalStopLiveNavigation(
      options
    );

  ms680RenderAutoLogbook();
  return result;
};

/* Automatische tijdlijn opnemen in de notities. */
const ms680OriginalBuildAutomaticLiveNotes=
  buildAutomaticLiveNotes;

buildAutomaticLiveNotes=function(){
  return [
    ms680OriginalBuildAutomaticLiveNotes(),
    ms680TimelineNotes()
  ].filter(Boolean).join('\n\n');
};

/* Bij wissen ook de Auto Logbook-status herstellen. */
const ms680OriginalClearLiveTrip=
  clearLiveTrip;

clearLiveTrip=function(options={}){
  ms680StopDepartureWatch();
  ms680DepartureArmed=false;
  ms680StopCandidateAt=null;
  ms680StopEventOpen=false;
  ms680QuickPhotoFiles=[];

  const result=
    ms680OriginalClearLiveTrip(options);

  ms680RenderAutoLogbook();
  return result;
};

/* Instellingen uitbreiden zonder bestaande voorkeuren te verliezen. */
const ms680OriginalDefaultLiveAutomationSettings=
  defaultLiveAutomationSettings;

defaultLiveAutomationSettings=function(){
  return {
    ...ms680OriginalDefaultLiveAutomationSettings(),
    autoStart:true,
    autoStop:true,
    autoStopMinutes:10,
    startSpeedKmh:2,
    startConfirmSeconds:15,
    stopEventMinutes:3
  };
};

const ms680OriginalSaveLiveAutomationSettings=
  saveLiveAutomationSettings;

saveLiveAutomationSettings=function(){
  const current={
    ...readLiveAutomationSettings(),
    autoStart:Boolean(
      $('ms680AutoStart')?.checked
    ),
    startSpeedKmh:Number(
      $('ms680StartSpeed')?.value||2
    ),
    startConfirmSeconds:Number(
      $('ms680StartSeconds')?.value||15
    ),
    stopEventMinutes:Number(
      $('ms680StopEventMinutes')?.value||3
    ),
    autoSave:Boolean(
      $('liveAutoSave')?.checked
    ),
    autoStop:Boolean(
      $('liveAutoStop')?.checked
    ),
    autoStopMinutes:Number(
      $('liveAutoStopMinutes')?.value||10
    ),
    minDistanceKm:Number(
      $('liveAutoMinDistance')?.value||.2
    ),
    minDurationMinutes:3
  };

  try{
    localStorage.setItem(
      liveAutomationStorageKey(),
      JSON.stringify(current)
    );
  }catch(error){
    console.warn(
      'Auto Logbook-instellingen bewaren mislukt:',
      error
    );
  }

  updateLiveAutoLogUi();
  ms680RenderAutoLogbook();

  if(
    !current.autoStart&&
    ms680DepartureArmed
  ){
    ms680DisarmDepartureWatch();
  }
};

const ms680OriginalLoadLiveAutomationSettings=
  loadLiveAutomationSettings;

loadLiveAutomationSettings=function(){
  ms680OriginalLoadLiveAutomationSettings();

  const settings=ms680AutomationSettings();

  if($('ms680AutoStart')){
    $('ms680AutoStart').checked=
      Boolean(settings.autoStart);
  }
  if($('ms680StartSpeed')){
    $('ms680StartSpeed').value=
      String(settings.startSpeedKmh);
  }
  if($('ms680StartSeconds')){
    $('ms680StartSeconds').value=
      String(settings.startConfirmSeconds);
  }
  if($('ms680StopEventMinutes')){
    $('ms680StopEventMinutes').value=
      String(settings.stopEventMinutes);
  }

  ms680RenderAutoLogbook();
};

/* Auto Logbook iedere seconde samen met de cockpit bijwerken. */
const ms680OriginalRenderLiveState=
  renderLiveState;

renderLiveState=function(){
  const result=
    ms680OriginalRenderLiveState();

  ms680RenderAutoLogbook();
  return result;
};

const ms680OriginalInitLiveMode=
  initLiveMode;

initLiveMode=async function(){
  const result=
    await ms680OriginalInitLiveMode();

  ms680EnsureState();
  loadLiveAutomationSettings();
  ms680RenderAutoLogbook();
  ms680RestoreArmedWatch();

  return result;
};

window.addEventListener(
  'online',
  ()=>{
    if(
      liveNavState.status==='stopped'&&
      liveNavState.points.length>=2
    ){
      setLiveAutoLogStatus(
        'Internet hersteld · de lokaal bewaarde vaartocht kan worden opgeslagen.',
        'success'
      );
    }
  },
  {passive:true}
);

document.addEventListener(
  'visibilitychange',
  ()=>{
    if(
      !document.hidden&&
      ms680DepartureArmed&&
      ms680DepartureWatchId===null
    ){
      ms680ArmDepartureWatch();
    }
  }
);



/* ============================================================
   MijnSerenity Cloud 7.4.4 — Routefoto’s met GPS en omschrijving
   ============================================================ */

let ms681PendingPhotos=[];
let ms681LivePhotoLayer=null;
let ms681PhotoSchemaWarningShown=false;

function ms681PhotoFingerprint(file){
  return [
    file?.name||'foto',
    Number(file?.size||0),
    Number(file?.lastModified||0)
  ].join(':');
}

function ms681CurrentRoutePoint(){
  const point=liveNavState?.points?.at(-1);

  if(
    point&&
    Number.isFinite(Number(point.lat))&&
    Number.isFinite(Number(point.lon))
  ){
    return {
      lat:Number(point.lat),
      lon:Number(point.lon),
      time:Number(point.time)||Date.now(),
      accuracy:Number(liveNavState.accuracy)||null
    };
  }

  return null;
}

function ms681GetCurrentPosition(){
  const routePoint=ms681CurrentRoutePoint();

  if(
    routePoint&&
    Date.now()-routePoint.time<120000
  ){
    return Promise.resolve(routePoint);
  }

  if(!navigator.geolocation){
    return Promise.resolve(routePoint);
  }

  return new Promise(resolve=>{
    navigator.geolocation.getCurrentPosition(
      position=>resolve({
        lat:Number(position.coords.latitude),
        lon:Number(position.coords.longitude),
        time:Number(position.timestamp)||Date.now(),
        accuracy:Number(position.coords.accuracy)||null
      }),
      ()=>resolve(routePoint),
      {
        enableHighAccuracy:true,
        maximumAge:15000,
        timeout:10000
      }
    );
  });
}

function ms681SyncLivePhotoInput(){
  const input=$('livePhotos');
  if(!input)return;

  try{
    const transfer=new DataTransfer();

    ms681PendingPhotos
      .slice(0,10)
      .forEach(photo=>transfer.items.add(photo.file));

    input.files=transfer.files;
  }catch(error){
    console.warn(
      'Bestandslijst kon niet worden bijgewerkt:',
      error
    );
  }
}

function ms681PendingPhotoUploads(){
  const records=[...ms681PendingPhotos];
  const inputFiles=[
    ...($('livePhotos')?.files||[])
  ];

  const fingerprints=new Set(
    records.map(record=>
      ms681PhotoFingerprint(record.file)
    )
  );

  inputFiles.forEach(file=>{
    const fingerprint=
      ms681PhotoFingerprint(file);

    if(!fingerprints.has(fingerprint)){
      const point=ms681CurrentRoutePoint();

      records.push({
        id:
          crypto.randomUUID?.()||
          `photo-${Date.now()}-${Math.random()}`,
        file,
        fingerprint,
        objectUrl:'',
        description:'',
        latitude:point?.lat??null,
        longitude:point?.lon??null,
        accuracy:point?.accuracy??null,
        capturedAt:
          Number(file.lastModified)||
          Date.now()
      });

      fingerprints.add(fingerprint);
    }
  });

  return records.slice(0,10);
}

async function ms681CaptureRoutePhotos(
  fileList,
  quickCapture=false
){
  const files=[...(fileList||[])];

  if(!files.length)return;

  const remaining=Math.max(
    0,
    10-ms681PendingPhotos.length
  );

  if(!remaining){
    showAppToast(
      'Maximaal 10 routefoto’s per vaartocht.'
    );
    return;
  }

  const point=await ms681GetCurrentPosition();
  const existing=new Set(
    ms681PendingPhotos.map(photo=>
      photo.fingerprint
    )
  );
  const added=[];

  files.slice(0,remaining).forEach(file=>{
    const fingerprint=
      ms681PhotoFingerprint(file);

    if(existing.has(fingerprint))return;

    const photo={
      id:
        crypto.randomUUID?.()||
        `photo-${Date.now()}-${Math.random()}`,
      file,
      fingerprint,
      objectUrl:URL.createObjectURL(file),
      description:'',
      latitude:point?.lat??null,
      longitude:point?.lon??null,
      accuracy:point?.accuracy??null,
      capturedAt:
        Number(file.lastModified)||
        Date.now(),
      quickCapture:Boolean(quickCapture)
    };

    ms681PendingPhotos.push(photo);
    added.push(photo);
    existing.add(fingerprint);
  });

  ms681SyncLivePhotoInput();
  ms681RenderPhotoComposer();
  ms681RenderLivePhotoMarkers();

  added.forEach((photo,index)=>{
    ms680AddEvent?.(
      'photo',
      Number.isFinite(photo.latitude)
        ?'GPS-positie aan foto gekoppeld'
        :'Foto toegevoegd zonder GPS-positie',
      Number.isFinite(photo.latitude)
        ?{
            lat:photo.latitude,
            lon:photo.longitude
          }
        :liveNavState.points.at(-1),
      {
        title:'Routefoto toegevoegd',
        dedupe:false,
        time:photo.capturedAt
      }
    );
  });

  if(added.length){
    showAppToast(
      `${added.length} routefoto${added.length===1?'':'’s'} toegevoegd`
    );

    setTimeout(()=>{
      document.querySelector(
        `.ms681-pending-photo[data-photo-id="${added[0].id}"] textarea`
      )?.focus();
    },120);
  }

  const quickInput=$('ms680QuickPhoto');
  if(quickInput)quickInput.value='';
}

function ms681ImportLivePhotos(fileList){
  return ms681CaptureRoutePhotos(
    fileList,
    false
  );
}

function ms681UpdatePhotoDescription(
  id,
  value
){
  const photo=ms681PendingPhotos.find(
    item=>item.id===id
  );

  if(!photo)return;

  photo.description=String(value||'')
    .slice(0,500);

  ms681RenderLivePhotoMarkers();
}

function ms681RemovePendingPhoto(id){
  const index=ms681PendingPhotos.findIndex(
    item=>item.id===id
  );

  if(index<0)return;

  const [photo]=ms681PendingPhotos.splice(
    index,
    1
  );

  if(photo?.objectUrl){
    URL.revokeObjectURL(photo.objectUrl);
  }

  ms681SyncLivePhotoInput();
  ms681RenderPhotoComposer();
  ms681RenderLivePhotoMarkers();
}

function ms681FocusPhotoOnMap(id){
  const photo=ms681PendingPhotos.find(
    item=>item.id===id
  );

  if(
    !photo||
    !Number.isFinite(photo.latitude)||
    !Number.isFinite(photo.longitude)||
    !liveMap
  ){
    return;
  }

  liveMap.setView(
    [photo.latitude,photo.longitude],
    Math.max(16,liveMap.getZoom()),
    {animate:true}
  );

  document.querySelector(
    '.live-map-card'
  )?.scrollIntoView({
    behavior:'smooth',
    block:'center'
  });
}

function ms681RenderPhotoComposer(){
  const panel=$('ms681PhotoComposer');
  const container=$('ms681PendingPhotos');
  const count=$('ms681PhotoCount');

  if(!panel||!container||!count)return;

  count.textContent=
    `${ms681PendingPhotos.length} ${
      ms681PendingPhotos.length===1
        ?'foto'
        :'foto’s'
    }`;

  panel.classList.toggle(
    'hidden',
    !ms681PendingPhotos.length
  );

  if(!ms681PendingPhotos.length){
    container.innerHTML='';
    return;
  }

  container.innerHTML=
    ms681PendingPhotos.map((photo,index)=>`
      <article class="ms681-pending-photo"
        data-photo-id="${photo.id}">
        <button type="button"
          class="ms681-photo-preview"
          onclick="ms681FocusPhotoOnMap('${photo.id}')">
          <img src="${esc(photo.objectUrl)}"
            alt="Routefoto ${index+1}">
          <span>
            ${
              Number.isFinite(photo.latitude)
                ?'📍 Op route'
                :'⚠ Geen GPS'
            }
          </span>
        </button>
        <div class="ms681-photo-copy">
          <label for="ms681Caption-${photo.id}">
            Omschrijving
          </label>
          <textarea id="ms681Caption-${photo.id}"
            rows="2"
            maxlength="500"
            placeholder="Bijv. wachten voor de sluis, mooie ligplaats…"
            oninput="ms681UpdatePhotoDescription(
              '${photo.id}',
              this.value
            )">${esc(photo.description||'')}</textarea>
          <small>
            ${
              Number.isFinite(photo.latitude)
                ?`${Number(photo.latitude).toFixed(5)}, ${Number(photo.longitude).toFixed(5)}`
                :'GPS-positie kon nog niet worden bepaald'
            }
            · ${new Date(photo.capturedAt).toLocaleTimeString(
              'nl-NL',
              {
                hour:'2-digit',
                minute:'2-digit'
              }
            )}
          </small>
        </div>
        <button type="button"
          class="ms681-photo-remove"
          aria-label="Routefoto verwijderen"
          onclick="ms681RemovePendingPhoto('${photo.id}')">×</button>
      </article>
    `).join('');
}

function ms681PhotoMarkerIcon(photo){
  const localImage=photo.objectUrl||'';

  return L.divIcon({
    className:'ms681-photo-marker',
    html:localImage
      ?`<span><img src="${esc(localImage)}" alt=""></span>`
      :`<span class="storage-safe-map-marker" aria-label="Routefoto">📷</span>`,
    iconSize:[46,46],
    iconAnchor:[23,42],
    popupAnchor:[0,-40]
  });
}

function ms681PhotoPopup(photo){
  const localImage=photo.objectUrl||'';
  const description=
    photo.description||
    'Foto onderweg';
  const imageHtml=localImage
    ?`<img src="${esc(localImage)}" alt="Routefoto">`
    :photo.storage_path
      ?`<img src="${STORAGE_SAFE_PLACEHOLDER}"
          class="storage-safe-image"
          loading="lazy" decoding="async"
          data-storage-bucket="${esc(TRIP_PHOTO_BUCKET)}"
          data-storage-path="${esc(photo.storage_path)}"
          alt="Routefoto"
          onclick='openStorageLightbox(${JSON.stringify(TRIP_PHOTO_BUCKET)},${JSON.stringify(photo.storage_path)},this)'>`
      :'';

  return `
    <div class="ms681-map-photo-popup">
      ${imageHtml}
      <strong>${esc(description)}</strong>
      <small>
        ${photo.capturedAt||photo.captured_at
          ?new Date(photo.capturedAt||photo.captured_at)
            .toLocaleString('nl-NL',{
              day:'numeric',
              month:'short',
              hour:'2-digit',
              minute:'2-digit'
            })
          :''}
      </small>
    </div>
  `;
}

function ms681RenderLivePhotoMarkers(){
  if(!liveMap)return;

  if(!ms681LivePhotoLayer){
    ms681LivePhotoLayer=
      L.layerGroup().addTo(liveMap);
  }

  ms681LivePhotoLayer.clearLayers();

  ms681PendingPhotos.forEach(photo=>{
    if(
      !Number.isFinite(Number(photo.latitude))||
      !Number.isFinite(Number(photo.longitude))
    ){
      return;
    }

    L.marker(
      [
        Number(photo.latitude),
        Number(photo.longitude)
      ],
      {
        icon:ms681PhotoMarkerIcon(photo),
        zIndexOffset:800
      }
    )
      .addTo(ms681LivePhotoLayer)
      .bindPopup(
        ms681PhotoPopup(photo),
        {
          maxWidth:250,
          className:'ms681-photo-popup-shell'
        }
      );
  });
}

function ms681TripPhotosForMap(
  containerId
){
  const photos=window.tripPhotoCache||{};

  if(containerId==='latestRouteMap'){
    const latest=tripCache.find(
      trip=>normaliseRouteGeojson(
        trip.route_geojson
      )
    );

    return latest
      ?photos[latest.id]||[]
      :[];
  }

  const match=String(containerId)
    .match(/^tripRouteMap-(.+)$/);

  return match
    ?photos[match[1]]||[]
    :[];
}

function ms681AddTripPhotoMarkers(
  containerId
){
  const map=tripRouteMaps[containerId];
  if(!map)return;

  if(map.ms681PhotoLayer){
    map.ms681PhotoLayer.clearLayers();
  }else{
    map.ms681PhotoLayer=
      L.layerGroup().addTo(map);
  }

  ms681TripPhotosForMap(containerId)
    .filter(photo=>
      Number.isFinite(Number(photo.latitude))&&
      Number.isFinite(Number(photo.longitude))
    )
    .forEach(photo=>{
      L.marker(
        [
          Number(photo.latitude),
          Number(photo.longitude)
        ],
        {
          icon:ms681PhotoMarkerIcon(photo),
          zIndexOffset:800
        }
      )
        .addTo(map.ms681PhotoLayer)
        .bindPopup(
          ms681PhotoPopup(photo),
          {
            maxWidth:250,
            className:'ms681-photo-popup-shell'
          }
        );
    });
}

async function ms681EditSavedPhotoDescription(
  photoId,
  currentDescription,
  tripId
){
  const description=prompt(
    'Omschrijving van deze routefoto:',
    currentDescription||''
  );

  if(description===null)return;

  const clean=String(description)
    .trim()
    .slice(0,500);

  const {error}=await sb
    .from('trip_photos')
    .update({
      description:clean||null
    })
    .eq('id',photoId)
    .eq('boat_id',currentBoat.id);

  if(error){
    alert(
      'Omschrijving opslaan mislukt: '+
      error.message
    );
    return;
  }

  const photo=(
    window.tripPhotoCache?.[tripId]||[]
  ).find(item=>
    String(item.id)===String(photoId)
  );

  if(photo)photo.description=clean;

  renderTripList();
  showAppToast(
    'Foto-omschrijving opgeslagen ✅'
  );
}

function ms681IsMissingPhotoColumns(error){
  const message=String(
    error?.message||
    error?.details||
    ''
  ).toLowerCase();

  return (
    message.includes('description')||
    message.includes('latitude')||
    message.includes('longitude')||
    message.includes('captured_at')||
    message.includes('schema cache')
  );
}

const ms681OriginalUploadTripPhotos=
  uploadTripPhotos;

uploadTripPhotos=async function(
  tripId,
  items
){
  const normalised=[...(items||[])]
    .slice(0,10)
    .map(item=>{
      if(item instanceof File){
        return {
          file:item,
          description:'',
          latitude:null,
          longitude:null,
          capturedAt:
            Number(item.lastModified)||
            Date.now()
        };
      }

      return {
        ...item,
        file:item.file
      };
    })
    .filter(item=>item.file instanceof File);

  for(let index=0;index<normalised.length;index++){
    const photo=normalised[index];
    const file=photo.file;

    setTripProgress(
      `Routefoto ${index+1} van ${normalised.length} uploaden…`
    );

    const safeExt=(
      file.name.split('.').pop()||
      'jpg'
    )
      .toLowerCase()
      .replace(/[^a-z0-9]/g,'')||
      'jpg';

    const path=
      `${currentBoat.id}/${tripId}/`+
      `${crypto.randomUUID()}.${safeExt}`;

    const {error:uploadError}=await sb.storage
      .from(TRIP_PHOTO_BUCKET)
      .upload(path,file,{
        cacheControl:'31536000',
        upsert:false,
        contentType:
          file.type||
          'image/jpeg'
      });

    if(uploadError){
      alert(
        'Foto uploaden mislukt: '+
        uploadError.message
      );
      continue;
    }

    const metadata={
      trip_id:tripId,
      boat_id:currentBoat.id,
      created_by:currentUser.id,
      storage_path:path,
      original_name:file.name,
      description:
        String(photo.description||'')
          .trim()
          .slice(0,500)||
        null,
      latitude:
        Number.isFinite(Number(photo.latitude))
          ?Number(photo.latitude)
          :null,
      longitude:
        Number.isFinite(Number(photo.longitude))
          ?Number(photo.longitude)
          :null,
      captured_at:new Date(
        photo.capturedAt||
        file.lastModified||
        Date.now()
      ).toISOString()
    };

    let {error:metaError}=await sb
      .from('trip_photos')
      .insert(metadata);

    if(
      metaError&&
      ms681IsMissingPhotoColumns(metaError)
    ){
      if(!ms681PhotoSchemaWarningShown){
        ms681PhotoSchemaWarningShown=true;
        alert(
          'De routefoto wordt opgeslagen, maar voer eerst '+
          'SUPABASE_ROUTEFOTOS_6_8_1.sql uit om locatie en '+
          'omschrijving in het logboek te bewaren.'
        );
      }

      const fallback={
        trip_id:tripId,
        boat_id:currentBoat.id,
        created_by:currentUser.id,
        storage_path:path,
        original_name:file.name
      };

      const result=await sb
        .from('trip_photos')
        .insert(fallback);

      metaError=result.error;
    }

    if(metaError){
      await sb.storage
        .from(TRIP_PHOTO_BUCKET)
        .remove([path]);

      alert(
        'Foto registreren mislukt: '+
        metaError.message
      );
    }
  }
};

/* Foto’s ook na het openen van een opgeslagen logboek op de routekaart. */
const ms681OriginalHandleTripToggle=
  handleTripToggle;

handleTripToggle=function(
  details,
  mapId,
  tripId
){
  ms681OriginalHandleTripToggle(
    details,
    mapId,
    tripId
  );

  if(details.open){
    [180,450,900].forEach(delay=>{
      setTimeout(
        ()=>ms681AddTripPhotoMarkers(mapId),
        delay
      );
    });
  }
};

const ms681OriginalUpdateLatestRouteDashboard=
  updateLatestRouteDashboard;

updateLatestRouteDashboard=function(){
  const result=
    ms681OriginalUpdateLatestRouteDashboard();

  [220,500,950].forEach(delay=>{
    setTimeout(
      ()=>ms681AddTripPhotoMarkers(
        'latestRouteMap'
      ),
      delay
    );
  });

  return result;
};

const ms681OriginalEnsureLiveMap=
  ensureLiveMap;

ensureLiveMap=function(){
  const result=
    ms681OriginalEnsureLiveMap();

  ms681RenderLivePhotoMarkers();
  return result;
};

const ms681OriginalRenderLiveRoute=
  renderLiveRoute;

renderLiveRoute=function(){
  const result=
    ms681OriginalRenderLiveRoute();

  ms681RenderLivePhotoMarkers();
  return result;
};

/* Bestaande snelle fotoknop gebruikt nu GPS-routefoto’s. */
ms680AddQuickPhotos=function(fileList){
  return ms681CaptureRoutePhotos(
    fileList,
    true
  );
};

/* Na opslaan of wissen object-URL’s en routefotostatus opruimen. */
const ms681OriginalClearLiveTrip=
  clearLiveTrip;

clearLiveTrip=function(options={}){
  ms681PendingPhotos.forEach(photo=>{
    if(photo.objectUrl){
      URL.revokeObjectURL(
        photo.objectUrl
      );
    }
  });

  ms681PendingPhotos=[];
  ms681LivePhotoLayer?.clearLayers();

  const result=
    ms681OriginalClearLiveTrip(options);

  ms681RenderPhotoComposer();
  return result;
};

const ms681OriginalInitLiveMode=
  initLiveMode;

initLiveMode=async function(){
  const result=
    await ms681OriginalInitLiveMode();

  ms681RenderPhotoComposer();
  ms681RenderLivePhotoMarkers();
  return result;
};



/* ============================================================
   MijnSerenity Cloud 7.4.4 — Boat Intelligence
   ============================================================ */

function ms690Clamp(value,min=0,max=100){
  return Math.max(min,Math.min(max,Number(value)||0));
}

function ms690SetText(id,value){
  const element=$(id);
  if(element)element.textContent=value;
}

function ms690Average(values){
  const numbers=(values||[])
    .map(Number)
    .filter(Number.isFinite);

  return numbers.length
    ?numbers.reduce((sum,value)=>sum+value,0)/numbers.length
    :null;
}

function ms690Median(values){
  const numbers=(values||[])
    .map(Number)
    .filter(Number.isFinite)
    .sort((a,b)=>a-b);

  if(!numbers.length)return null;

  const middle=Math.floor(numbers.length/2);

  return numbers.length%2
    ?numbers[middle]
    :(numbers[middle-1]+numbers[middle])/2;
}

function ms690SeasonTrips(){
  const year=new Date().getFullYear();

  return (tripCache||[]).filter(trip=>
    String(trip.trip_date||'').startsWith(String(year))
  );
}

function ms690TechnicalSnapshot(){
  return normaliseTechnicalState(
    technicalStateCache||
    readTechnicalLocalState()
  );
}

function ms690FuelRangeEstimate(){
  const state=ms690TechnicalSnapshot();
  const fuelPct=Number(state.fuelPct);
  const capacity=Number(
    state.fuelCapacity||
    settingsCache?.tank_capacity
  );
  const consumption=Number(
    settingsCache?.fuel_per_hour
  );

  const historicSpeeds=(tripCache||[])
    .map(trip=>{
      const distance=Number(trip.distance_km);
      const hours=Number(trip.duration_hours);

      return (
        distance>0&&hours>0
          ?distance/hours
          :null
      );
    })
    .filter(Number.isFinite);

  const speed=
    ms690Median(historicSpeeds)||
    9;

  if(
    !Number.isFinite(fuelPct)||
    !Number.isFinite(capacity)||
    capacity<=0||
    !Number.isFinite(consumption)||
    consumption<=0
  ){
    return null;
  }

  const reservePct=15;
  const usableLitres=
    capacity*
    Math.max(0,fuelPct-reservePct)/
    100;
  const hours=usableLitres/consumption;

  return {
    km:hours*speed,
    hours,
    usableLitres,
    speed,
    consumption,
    reservePct
  };
}

function ms690NextMaintenance(){
  const state=ms690TechnicalSnapshot();
  const tasks=(state.maintenance||[])
    .map(task=>({
      task,
      status:technicalTaskStatus(task)
    }));

  const rank={
    critical:0,
    warning:1,
    good:2
  };

  return tasks.sort((a,b)=>{
    const levelDifference=
      (rank[a.status.level]??3)-
      (rank[b.status.level]??3);

    if(levelDifference)return levelDifference;

    const aHours=Number.isFinite(a.status.hoursLeft)
      ?a.status.hoursLeft
      :999999;
    const bHours=Number.isFinite(b.status.hoursLeft)
      ?b.status.hoursLeft
      :999999;

    const aDays=Number.isFinite(a.status.daysLeft)
      ?a.status.daysLeft
      :999999;
    const bDays=Number.isFinite(b.status.daysLeft)
      ?b.status.daysLeft
      :999999;

    return Math.min(aHours,aDays)-
      Math.min(bHours,bDays);
  })[0]||null;
}

function ms690BoatHealth(){
  const warnings=technicalWarnings();
  const state=ms690TechnicalSnapshot();
  let score=100;

  warnings.forEach(item=>{
    score-=item.level==='critical'
      ?22
      :item.level==='warning'
        ?9
        :3;
  });

  const required=[
    state.houseVoltage,
    state.startVoltage,
    state.fuelPct,
    state.engineHours
  ];

  score-=required.filter(value=>
    value===null||
    value===''||
    !Number.isFinite(Number(value))
  ).length*4;

  if(!state.lastSnapshotAt){
    score-=7;
  }

  score=ms690Clamp(score);

  return {
    score,
    level:
      score>=85?'good':
      score>=65?'warning':
      'critical',
    warnings
  };
}

function ms690TripAnalysis(trip){
  const photos=(
    window.tripPhotoCache?.[trip.id]||
    []
  );
  const metrics=parseLiveTripNoteMetrics(
    trip.notes
  );
  const distance=Number(trip.distance_km);
  const hours=Number(trip.duration_hours);
  const fuel=Number(trip.fuel_liters);
  const averageSpeed=
    distance>0&&hours>0
      ?distance/hours
      :null;
  const litresPerKm=
    fuel>0&&distance>0
      ?fuel/distance
      :null;

  const historicEfficiency=(tripCache||[])
    .filter(item=>
      String(item.id)!==String(trip.id)
    )
    .map(item=>{
      const itemFuel=Number(item.fuel_liters);
      const itemDistance=Number(item.distance_km);

      return (
        itemFuel>0&&itemDistance>0
          ?itemFuel/itemDistance
          :null
      );
    })
    .filter(Number.isFinite);

  const baseline=
    ms690Median(historicEfficiency);

  let score=58;
  const strengths=[];
  const attention=[];

  if(normaliseRouteGeojson(trip.route_geojson)){
    score+=12;
    strengths.push('volledige route opgeslagen');
  }else{
    score-=8;
    attention.push('geen routekaart beschikbaar');
  }

  if(trip.departure&&trip.arrival){
    score+=5;
  }

  if(metrics.automatic){
    score+=5;
    strengths.push('automatisch logboek gebruikt');
  }

  if(photos.length){
    score+=Math.min(10,photos.length*2);
    strengths.push(
      `${photos.length} routefoto${photos.length===1?'':'’s'}`
    );
  }else{
    attention.push('geen foto’s toegevoegd');
  }

  if(fuel>0){
    score+=5;
  }else{
    attention.push('brandstofverbruik ontbreekt');
  }

  if(averageSpeed&&averageSpeed>=4&&averageSpeed<=14){
    score+=5;
    strengths.push('rustige gemiddelde vaarsnelheid');
  }

  if(
    litresPerKm&&
    baseline&&
    litresPerKm<=baseline*.9
  ){
    score+=8;
    strengths.push('zuiniger dan je eigen gemiddelde');
  }else if(
    litresPerKm&&
    baseline&&
    litresPerKm>=baseline*1.2
  ){
    score-=7;
    attention.push('hoger verbruik dan je eigen gemiddelde');
  }

  if(metrics.maxSpeed&&metrics.averageSpeed){
    const maxValue=Number(
      String(metrics.maxSpeed).replace(',','.')
        .match(/\d+(?:\.\d+)?/)?.[0]
    );
    const avgValue=Number(
      String(metrics.averageSpeed).replace(',','.')
        .match(/\d+(?:\.\d+)?/)?.[0]
    );

    if(
      Number.isFinite(maxValue)&&
      Number.isFinite(avgValue)&&
      avgValue>0&&
      maxValue>avgValue*1.8
    ){
      score-=4;
      attention.push('grote snelheidsverschillen onderweg');
    }
  }

  score=ms690Clamp(score);

  const label=
    score>=90?'Uitstekend':
    score>=78?'Sterk':
    score>=65?'Goed':
    score>=50?'Redelijk':
    'Onvolledig';

  const efficiencyText=
    litresPerKm
      ?`${litresPerKm.toLocaleString('nl-NL',{
          maximumFractionDigits:2
        })} l/km`
      :'Nog niet berekend';

  return {
    score,
    label,
    photos:photos.length,
    distance,
    hours,
    fuel,
    averageSpeed,
    litresPerKm,
    efficiencyText,
    strengths,
    attention,
    metrics
  };
}

function ms690SeasonPerformance(){
  const trips=ms690SeasonTrips();

  if(!trips.length){
    return {
      score:null,
      detail:'Nog geen vaartochten dit seizoen'
    };
  }

  const analyses=trips.map(
    ms690TripAnalysis
  );
  const score=Math.round(
    ms690Average(
      analyses.map(item=>item.score)
    )||0
  );

  return {
    score,
    detail:
      `${trips.length} ${
        trips.length===1
          ?'tocht'
          :'tochten'
      } geanalyseerd`
  };
}

function ms690Advice(){
  const health=ms690BoatHealth();
  const state=ms690TechnicalSnapshot();
  const range=ms690FuelRangeEstimate();
  const nextMaintenance=ms690NextMaintenance();
  const trips=ms690SeasonTrips();
  const advice=[];

  health.warnings
    .slice(0,3)
    .forEach(item=>{
      advice.push({
        level:item.level,
        icon:item.icon||'⚠️',
        title:item.title,
        text:item.text,
        action:'technical'
      });
    });

  if(
    Number.isFinite(Number(state.fuelPct))&&
    Number(state.fuelPct)<=30
  ){
    advice.push({
      level:Number(state.fuelPct)<=15
        ?'critical'
        :'warning',
      icon:'⛽',
      title:'Plan een tankstop',
      text:
        range
          ?`Geschat bruikbaar bereik ${Math.round(range.km)} km met 15% reserve.`
          :`Brandstoftank staat op ${Math.round(Number(state.fuelPct))}%.`,
      action:'planner'
    });
  }

  if(
    nextMaintenance&&
    ['critical','warning'].includes(
      nextMaintenance.status.level
    )
  ){
    advice.push({
      level:nextMaintenance.status.level,
      icon:'🔧',
      title:nextMaintenance.task.title,
      text:
        `${nextMaintenance.status.label} · `+
        `${nextMaintenance.status.detail}`,
      action:'technical'
    });
  }

  if(!trips.length){
    advice.push({
      level:'info',
      icon:'📖',
      title:'Start je eerste automatische logboek',
      text:
        'Gebruik Wacht op vertrek zodat route, tijdlijn en foto’s automatisch worden vastgelegd.',
      action:'live'
    });
  }else{
    const latest=trips[0];
    const analysis=ms690TripAnalysis(latest);

    if(analysis.attention.length){
      advice.push({
        level:'info',
        icon:'📊',
        title:'Maak je volgende log nog completer',
        text:analysis.attention[0],
        action:'logbook'
      });
    }
  }

  if(
    Number.isFinite(Number(state.solarPower))&&
    Number(state.solarPower)<10&&
    !state.shorePower
  ){
    advice.push({
      level:'info',
      icon:'☀️',
      title:'Weinig zonne-opbrengst',
      text:
        `${technicalNumber(state.solarPower,0)} W gemeten zonder walstroom. Controleer schaduw en paneelstatus wanneer dit onverwacht is.`,
      action:'technical'
    });
  }

  if(!advice.length){
    advice.push({
      level:'good',
      icon:'✓',
      title:'Serenity is vaarklaar',
      text:
        'Geen directe technische of onderhoudswaarschuwingen gevonden.',
      action:'live'
    });
  }

  return advice.slice(0,6);
}

function ms690RenderDashboard(){
  if(!$('ms690HealthScore'))return;

  const health=ms690BoatHealth();
  const technical=technicalHealth();
  const range=ms690FuelRangeEstimate();
  const maintenance=ms690NextMaintenance();
  const season=ms690SeasonPerformance();
  const ring=$('ms690HealthRing');

  ms690SetText(
    'ms690HealthScore',
    Math.round(health.score)
  );

  if(ring){
    ring.className=
      `ms690-health-ring ${health.level}`;
    ring.style.setProperty(
      '--score',
      `${health.score*3.6}deg`
    );
  }

  ms690SetText(
    'ms690TechnicalStatus',
    technical.label
  );
  ms690SetText(
    'ms690TechnicalDetail',
    technical.dashboard
  );

  ms690SetText(
    'ms690FuelRange',
    range
      ?`${Math.round(range.km)} km`
      :'– km'
  );
  ms690SetText(
    'ms690FuelRangeDetail',
    range
      ?`${technicalNumber(range.usableLitres,0)} liter bruikbaar · circa ${technicalNumber(range.hours,1)} uur`
      :'Vul tankinhoud, tankpercentage en verbruik in'
  );

  ms690SetText(
    'ms690Maintenance',
    maintenance
      ?maintenance.task.title
      :'Geen taken'
  );
  ms690SetText(
    'ms690MaintenanceDetail',
    maintenance
      ?`${maintenance.status.label} · ${maintenance.status.detail}`
      :'Onderhoudsplan is leeg'
  );

  ms690SetText(
    'ms690SeasonScore',
    season.score===null
      ?'–'
      :`${season.score}/100`
  );
  ms690SetText(
    'ms690SeasonDetail',
    season.detail
  );

  const list=$('ms690AdviceList');

  if(list){
    list.innerHTML=ms690Advice()
      .map(item=>`
        <button type="button"
          class="ms690-advice-item ${item.level}"
          onclick="captainNavigate('${item.action}')">
          <span>${item.icon}</span>
          <span>
            <strong>${esc(item.title)}</strong>
            <small>${esc(item.text)}</small>
          </span>
          <b>›</b>
        </button>
      `).join('');
  }
}

function ms690QuestionKey(event){
  if(event.key==='Enter'){
    event.preventDefault();
    ms690AskCaptain();
  }
}

function ms690LatestTrip(){
  return [...(tripCache||[])]
    .sort((a,b)=>
      String(b.trip_date||'')
        .localeCompare(
          String(a.trip_date||'')
        )
    )[0]||null;
}

function ms690CaptainAnswer(question){
  const query=String(question||'')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'');

  const health=ms690BoatHealth();
  const state=ms690TechnicalSnapshot();
  const range=ms690FuelRangeEstimate();
  const maintenance=ms690NextMaintenance();
  const seasonTrips=ms690SeasonTrips();
  const seasonDistance=seasonTrips.reduce(
    (sum,trip)=>sum+Number(trip.distance_km||0),
    0
  );
  const seasonHours=seasonTrips.reduce(
    (sum,trip)=>sum+Number(trip.duration_hours||0),
    0
  );
  const seasonFuel=seasonTrips.reduce(
    (sum,trip)=>sum+Number(trip.fuel_liters||0),
    0
  );
  const seasonCosts=captainSeasonCosts().reduce(
    (sum,cost)=>sum+Number(cost.amount||0),
    0
  );

  if(
    /hoe is de boot|bootstatus|status|vaarklaar|techniek/.test(query)
  ){
    const warning=health.warnings[0];

    return warning
      ?`Bootscore ${Math.round(health.score)}/100. Belangrijkste aandachtspunt: ${warning.title}. ${warning.text}`
      :`Bootscore ${Math.round(health.score)}/100. Er zijn geen directe technische waarschuwingen gevonden.`;
  }

  if(/bereik|hoe ver|brandstof|diesel/.test(query)){
    return range
      ?`Met de huidige tankstand is het geschatte bruikbare bereik ongeveer ${Math.round(range.km)} km, of ${technicalNumber(range.hours,1)} vaaruur. Hierbij blijft 15% reserve staan.`
      :'Ik kan het bereik nog niet berekenen. Vul tankinhoud, tankpercentage en gemiddeld verbruik per uur in.';
  }

  if(/onderhoud|service|beurt|impeller|olie/.test(query)){
    return maintenance
      ?`Het eerstvolgende aandachtspunt is ${maintenance.task.title}: ${maintenance.status.label.toLowerCase()}. ${maintenance.status.detail}.`
      :'Er staan nog geen onderhoudstaken in het technische dashboard.';
  }

  if(/accu|energie|zonne|walstroom/.test(query)){
    const house=technicalBatteryStatus(
      state.houseVoltage,
      state.batteryType
    );

    return [
      Number.isFinite(Number(state.houseVoltage))
        ?`Huishoudaccu ${technicalNumber(state.houseVoltage,2)} V (${house.label.toLowerCase()}).`
        :'Huishoudaccuspanning is nog niet gemeten.',
      Number.isFinite(Number(state.solarPower))
        ?`Zonne-opbrengst ${technicalNumber(state.solarPower,0)} W.`
        :'Zonne-opbrengst ontbreekt.',
      state.shorePower
        ?'Walstroom is aangesloten.'
        :'Walstroom is niet actief.'
    ].join(' ');
  }

  if(/water|vuilwater|tank/.test(query)){
    return [
      Number.isFinite(Number(state.waterPct))
        ?`Drinkwater ${Math.round(Number(state.waterPct))}%.`
        :'Drinkwaterstand onbekend.',
      Number.isFinite(Number(state.wastePct))
        ?`Vuilwatertank ${Math.round(Number(state.wastePct))}%.`
        :'Vuilwaterstand onbekend.',
      Number.isFinite(Number(state.fuelPct))
        ?`Diesel ${Math.round(Number(state.fuelPct))}%.`
        :'Dieselstand onbekend.'
    ].join(' ');
  }

  if(/laatste vaart|laatste tocht|analyseer/.test(query)){
    const trip=ms690LatestTrip();

    if(!trip){
      return 'Er staat nog geen vaartocht in het logboek.';
    }

    const analysis=ms690TripAnalysis(trip);

    return `${trip.title||'De laatste vaartocht'} scoort ${analysis.score}/100 (${analysis.label.toLowerCase()}). ${
      analysis.strengths.length
        ?`Sterk: ${analysis.strengths.slice(0,2).join(' en ')}.`
        :''
    } ${
      analysis.attention.length
        ?`Verbeterpunt: ${analysis.attention[0]}.`
        :'Geen direct verbeterpunt gevonden.'
    }`;
  }

  if(/seizoen|hoeveel gevaren|vaaruren|afstand/.test(query)){
    return `Dit seizoen staan ${seasonTrips.length} vaartochten geregistreerd: ${technicalNumber(seasonDistance,1)} km, ${technicalNumber(seasonHours,1)} vaaruur en ${technicalNumber(seasonFuel,1)} liter brandstof.`;
  }

  if(/kosten|uitgaven|geld/.test(query)){
    return `De geregistreerde uitgaven van dit seizoen zijn ${formatEuro(seasonCosts)}. Open Financieel voor de verdeling per categorie.`;
  }

  if(/route|bestemming|aankomst|eta/.test(query)){
    const navigation=
      typeof ms660NavigationEstimate==='function'
        ?ms660NavigationEstimate()
        :null;

    return (
      navigation&&
      Number.isFinite(navigation.remainingKm)
    )
      ?`Naar ${navigation.destination} resteert ongeveer ${technicalNumber(navigation.remainingKm,1)} km. De actuele ETA staat in de live cockpit.`
      :'Er is nog geen actieve route met een actuele GPS-positie.';
  }

  return 'Ik kan vragen beantwoorden over bootstatus, bereik, onderhoud, accu, tanks, kosten, seizoen, route en de laatste vaartocht.';
}

function ms690AskCaptain(question=''){
  const input=$('ms690Question');
  const value=String(
    question||
    input?.value||
    ''
  ).trim();

  if(!value){
    input?.focus();
    return;
  }

  if(input)input.value=value;

  const answer=$('ms690CaptainAnswer');

  if(answer){
    answer.classList.add('thinking');
    answer.textContent='Captain analyseert Serenity…';

    setTimeout(()=>{
      answer.textContent=
        ms690CaptainAnswer(value);
      answer.classList.remove('thinking');
    },220);
  }
}

function ms690RefreshIntelligence(){
  ms690RenderDashboard();
  renderTechnicalDashboard();
  renderLiveState();
  showAppToast(
    'Captain Intelligence bijgewerkt'
  );
}

function ms690MaintenanceForecast(){
  const state=ms690TechnicalSnapshot();
  const averageTripHours=
    ms690Average(
      (tripCache||[])
        .map(trip=>Number(trip.duration_hours))
        .filter(value=>value>0)
    )||3;

  return (state.maintenance||[])
    .map(task=>{
      const status=technicalTaskStatus(task);
      let forecast='';

      if(Number.isFinite(status.hoursLeft)){
        const trips=Math.max(
          0,
          Math.ceil(
            status.hoursLeft/
            averageTripHours
          )
        );

        forecast=status.hoursLeft<=0
          ?'Nu uitvoeren'
          :`ongeveer ${trips} ${
              trips===1?'vaart':'vaarten'
            } resterend`;
      }else if(Number.isFinite(status.daysLeft)){
        forecast=status.daysLeft<=0
          ?'Nu uitvoeren'
          :`over ${status.daysLeft} dagen`;
      }else{
        forecast='Interval aanvullen';
      }

      return {
        task,
        status,
        forecast
      };
    })
    .sort((a,b)=>{
      const rank={
        critical:0,
        warning:1,
        good:2
      };

      return (
        (rank[a.status.level]??3)-
        (rank[b.status.level]??3)
      );
    })
    .slice(0,6);
}

function ms690EnergyForecast(){
  const state=ms690TechnicalSnapshot();
  const range=ms690FuelRangeEstimate();
  const house=technicalBatteryStatus(
    state.houseVoltage,
    state.batteryType
  );
  const start=technicalBatteryStatus(
    state.startVoltage,
    'lead'
  );

  return [
    {
      icon:'🔋',
      title:'Huishoudaccu',
      value:Number.isFinite(Number(state.houseVoltage))
        ?`${technicalNumber(state.houseVoltage,2)} V`
        :'–',
      detail:house.label,
      level:house.level
    },
    {
      icon:'🔌',
      title:'Startaccu',
      value:Number.isFinite(Number(state.startVoltage))
        ?`${technicalNumber(state.startVoltage,2)} V`
        :'–',
      detail:start.label,
      level:start.level
    },
    {
      icon:'☀️',
      title:'Zonnepaneel',
      value:Number.isFinite(Number(state.solarPower))
        ?`${technicalNumber(state.solarPower,0)} W`
        :'–',
      detail:state.shorePower
        ?'Walstroom actief'
        :'Zonder walstroom',
      level:'info'
    },
    {
      icon:'⛽',
      title:'Dieselbereik',
      value:range
        ?`${Math.round(range.km)} km`
        :'–',
      detail:range
        ?`${technicalNumber(range.usableLitres,0)} l bruikbaar`
        :'Gegevens aanvullen',
      level:
        Number(state.fuelPct)<=15
          ?'critical'
          :Number(state.fuelPct)<=30
            ?'warning'
            :'good'
    },
    {
      icon:'💧',
      title:'Drinkwater',
      value:Number.isFinite(Number(state.waterPct))
        ?`${Math.round(Number(state.waterPct))}%`
        :'–',
      detail:
        Number(state.waterPct)<=20
          ?'Bijvullen plannen'
          :'Voorraad',
      level:
        Number(state.waterPct)<=20
          ?'warning'
          :'good'
    },
    {
      icon:'🚽',
      title:'Vuilwater',
      value:Number.isFinite(Number(state.wastePct))
        ?`${Math.round(Number(state.wastePct))}%`
        :'–',
      detail:
        Number(state.wastePct)>=75
          ?'Legen plannen'
          :'Capaciteit beschikbaar',
      level:
        Number(state.wastePct)>=90
          ?'critical'
          :Number(state.wastePct)>=75
            ?'warning'
            :'good'
    }
  ];
}

function ms690RenderPredictive(){
  const maintenanceContainer=$(
    'ms690MaintenanceForecast'
  );
  const energyContainer=$(
    'ms690EnergyForecast'
  );

  if(
    !maintenanceContainer||
    !energyContainer
  ){
    return;
  }

  const forecast=ms690MaintenanceForecast();
  const badge=$('ms690PredictiveBadge');
  const urgent=forecast.filter(item=>
    ['critical','warning'].includes(
      item.status.level
    )
  );

  ms690SetText(
    'ms690MaintenanceCount',
    `${urgent.length} ${
      urgent.length===1
        ?'aandachtspunt'
        :'aandachtspunten'
    }`
  );

  if(badge){
    badge.className=
      `ms690-predictive-badge ${
        urgent.some(item=>
          item.status.level==='critical'
        )
          ?'critical'
          :urgent.length
            ?'warning'
            :'good'
      }`;

    badge.textContent=
      urgent.some(item=>
        item.status.level==='critical'
      )
        ?'Actie nodig'
        :urgent.length
          ?'Binnenkort'
          :'Op schema';
  }

  maintenanceContainer.innerHTML=
    forecast.length
      ?forecast.map(item=>`
        <article class="ms690-forecast-item ${item.status.level}">
          <span>${
            item.status.level==='critical'
              ?'⛔'
              :item.status.level==='warning'
                ?'🔧'
                :'✓'
          }</span>
          <div>
            <strong>${esc(item.task.title)}</strong>
            <small>
              ${esc(item.status.detail)} · ${esc(item.forecast)}
            </small>
          </div>
        </article>
      `).join('')
      :'<span class="small">Geen onderhoudstaken gevonden.</span>';

  energyContainer.innerHTML=
    ms690EnergyForecast()
      .map(item=>`
        <article class="ms690-energy-item ${item.level}">
          <span>${item.icon}</span>
          <div>
            <strong>${esc(item.title)}</strong>
            <small>${esc(item.detail)}</small>
          </div>
          <b>${esc(item.value)}</b>
        </article>
      `).join('');
}

function ms690LiveAdvisor(){
  const rpm=Number(liveNavState.engineRpm||0);
  const speed=Number(liveNavState.speedKmh||0);
  const health=ms690BoatHealth();
  const navigation=
    typeof ms660NavigationEstimate==='function'
      ?ms660NavigationEstimate()
      :null;

  let economyTitle='Wachten op vaargegevens';
  let economyDetail=
    'Snelheid en toerental worden live beoordeeld.';
  let economyLevel='idle';

  if(liveNavState.status==='active'){
    if(rpm>2300){
      economyTitle='Hoog toerental';
      economyDetail=
        `${Math.round(rpm)} rpm · controleer of de extra snelheid het hogere verbruik waard is.`;
      economyLevel='warning';
    }else if(rpm>=1500&&rpm<=1800){
      economyTitle='Rustige economische zone';
      economyDetail=
        `${Math.round(rpm)} rpm · actuele snelheid ${technicalNumber(speed,1)} km/u.`;
      economyLevel='good';
    }else if(rpm>1800){
      economyTitle='Normale vaarbelasting';
      economyDetail=
        `${Math.round(rpm)} rpm · houd verbruik en motortemperatuur in de gaten.`;
      economyLevel='info';
    }else if(speed>=2){
      economyTitle='Varen zonder toerentaldata';
      economyDetail=
        `${technicalNumber(speed,1)} km/u · koppel RPM via Home Assistant of NMEA.`;
      economyLevel='info';
    }
  }

  ms690SetText(
    'ms690LiveEconomy',
    economyTitle
  );
  ms690SetText(
    'ms690LiveEconomyDetail',
    economyDetail
  );

  if(
    navigation&&
    Number.isFinite(navigation.remainingKm)
  ){
    ms690SetText(
      'ms690LiveRoute',
      `${technicalNumber(navigation.remainingKm,1)} km naar ${navigation.destination}`
    );
    ms690SetText(
      'ms690LiveRouteDetail',
      navigation.mode==='route'
        ?'Berekend over de actieve waterwegroute'
        :'Hemelsbrede indicatie'
    );
  }else{
    ms690SetText(
      'ms690LiveRoute',
      'Nog geen actieve route'
    );
    ms690SetText(
      'ms690LiveRouteDetail',
      'Kies een planning voor ETA en resterende afstand.'
    );
  }

  ms690SetText(
    'ms690LiveTechnical',
    health.warnings.length
      ?health.warnings[0].title
      :'Alles rustig aan boord'
  );
  ms690SetText(
    'ms690LiveTechnicalDetail',
    health.warnings.length
      ?health.warnings[0].text
      :'Geen directe technische waarschuwing.'
  );

  const advice=$('ms690LiveAdvice');
  const badge=$('ms690LiveAdvisorBadge');

  if(advice){
    advice.className=
      `ms690-live-advice ${economyLevel}`;

    advice.textContent=
      liveNavState.status==='active'
        ?health.warnings.length
          ?`${health.warnings[0].icon||'⚠️'} ${health.warnings[0].title}: ${health.warnings[0].text}`
          :economyDetail
        :'Start een vaartocht om live advies te ontvangen.';
  }

  if(badge){
    badge.className=
      `ms690-advisor-badge ${economyLevel}`;
    badge.textContent=
      liveNavState.status==='active'
        ?economyLevel==='warning'
          ?'Aandacht'
          :'● Live'
        :'Gereed';
  }
}

function ms690TripAnalysisHtml(trip){
  const analysis=ms690TripAnalysis(trip);
  const strengths=analysis.strengths
    .slice(0,3)
    .map(item=>`<li>✓ ${esc(item)}</li>`)
    .join('');
  const attention=analysis.attention
    .slice(0,3)
    .map(item=>`<li>→ ${esc(item)}</li>`)
    .join('');

  return `
    <div class="ms690-trip-analysis"
      data-ms690-trip-analysis="${esc(trip.id)}">
      <div class="ms690-trip-score ${
        analysis.score>=78
          ?'good'
          :analysis.score>=55
            ?'warning'
            :'critical'
      }">
        <strong>${analysis.score}</strong>
        <small>/100</small>
      </div>
      <div class="ms690-trip-analysis-copy">
        <span class="eyebrow">CAPTAIN VAARANALYSE</span>
        <strong>${esc(analysis.label)}</strong>
        <small>
          ${
            analysis.averageSpeed
              ?`Gemiddeld ${technicalNumber(analysis.averageSpeed,1)} km/u`
              :'Gemiddelde snelheid onbekend'
          }
          · ${esc(analysis.efficiencyText)}
          · ${analysis.photos} routefoto${analysis.photos===1?'':'’s'}
        </small>
        ${
          strengths||attention
            ?`<ul>${strengths}${attention}</ul>`
            :''
        }
      </div>
      <button type="button" class="secondary"
        onclick="ms690ShareTripAnalysis('${esc(trip.id)}')">
        ↗ Deel analyse
      </button>
    </div>
  `;
}

function ms690DecorateTripAnalyses(){
  document.querySelectorAll(
    '.trip-row[data-trip-id]'
  ).forEach(details=>{
    const tripId=details.dataset.tripId;
    const body=details.querySelector(
      '.trip-row-body'
    );
    const summary=body?.querySelector(
      '.trip-summary'
    );

    if(
      !body||
      !summary||
      body.querySelector(
        '[data-ms690-trip-analysis]'
      )
    ){
      return;
    }

    const trip=tripCache.find(item=>
      String(item.id)===String(tripId)
    );

    if(!trip)return;

    summary.insertAdjacentHTML(
      'afterend',
      ms690TripAnalysisHtml(trip)
    );
  });
}

async function ms690ShareTripAnalysis(tripId){
  const trip=tripCache.find(item=>
    String(item.id)===String(tripId)
  );

  if(!trip)return;

  const analysis=ms690TripAnalysis(trip);
  const text=[
    `${trip.title||'Vaartocht'} · Captain Vaaranalyse`,
    `Score: ${analysis.score}/100 (${analysis.label})`,
    analysis.averageSpeed
      ?`Gemiddelde snelheid: ${technicalNumber(analysis.averageSpeed,1)} km/u`
      :'',
    analysis.fuel
      ?`Brandstof: ${technicalNumber(analysis.fuel,1)} liter`
      :'',
    analysis.strengths.length
      ?`Sterk: ${analysis.strengths.join(', ')}`
      :'',
    analysis.attention.length
      ?`Aandacht: ${analysis.attention.join(', ')}`
      :''
  ].filter(Boolean).join('\n');

  try{
    if(navigator.share){
      await navigator.share({
        title:
          `${trip.title||'Vaartocht'} · MijnSerenity`,
        text
      });
      return;
    }
  }catch(error){
    if(error?.name==='AbortError')return;
  }

  try{
    await navigator.clipboard.writeText(text);
    showAppToast(
      'Vaaranalyse gekopieerd'
    );
  }catch{
    alert(text);
  }
}

/* Bestaande renders uitbreiden zonder databronnen te vervangen. */
const ms690OriginalRenderCaptainCommandCenter=
  renderCaptainCommandCenter;

renderCaptainCommandCenter=function(){
  const result=
    ms690OriginalRenderCaptainCommandCenter();

  ms690RenderDashboard();
  return result;
};

const ms690OriginalRenderTechnicalDashboard=
  renderTechnicalDashboard;

renderTechnicalDashboard=function(){
  const result=
    ms690OriginalRenderTechnicalDashboard();

  ms690RenderPredictive();
  ms690RenderDashboard();
  return result;
};

const ms690OriginalRenderLiveState=
  renderLiveState;

renderLiveState=function(){
  const result=
    ms690OriginalRenderLiveState();

  ms690LiveAdvisor();
  ms690RenderDashboard();
  return result;
};

const ms690OriginalRenderTripList=
  renderTripList;

renderTripList=function(){
  const result=
    ms690OriginalRenderTripList();

  ms690DecorateTripAnalyses();
  ms690RenderDashboard();
  return result;
};

window.addEventListener(
  'online',
  ms690RenderDashboard,
  {passive:true}
);

document.addEventListener(
  'visibilitychange',
  ()=>{
    if(!document.hidden){
      ms690RenderDashboard();
      ms690RenderPredictive();
      ms690LiveAdvisor();
    }
  }
);



/* ============================================================
   MijnSerenity Cloud 7.4.4 — Gewaardeerde havenimporteur
   ============================================================ */

let ms692HarbourImportBusy=false;

function ms692Normalise(value){
  return String(value||'')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,' ')
    .trim();
}

function ms692RatingDisplay(value){
  const rating=Number(value);

  if(!Number.isFinite(rating)||rating<=0){
    return '';
  }

  const rounded=Math.round(rating*2)/2;
  const full=Math.floor(rounded);
  const half=rounded-full>=.5;
  const stars=[
    ...Array(full).fill('★'),
    ...(half?['½']:[]),
    ...Array(
      Math.max(0,5-full-(half?1:0))
    ).fill('☆')
  ].join('');

  return `${stars} · ${rating.toLocaleString('nl-NL',{
    minimumFractionDigits:
      Number.isInteger(rating)?0:1,
    maximumFractionDigits:1
  })}`;
}

function ms692SetHarbourStatus(
  text,
  type='info'
){
  const status=$('ms692HarbourImportStatus');

  if(status){
    status.className=
      `ms692-harbour-status ${type}`;
    status.textContent=text;
  }
}

function ms692SetHarbourBadge(
  text,
  type=''
){
  const badge=$('ms692HarbourBadge');

  if(badge){
    badge.className=
      `ms692-harbour-badge ${type}`;
    badge.textContent=text;
  }
}

function ms692ParseRating(value){
  const text=String(value??'')
    .trim()
    .replace(',','.');

  if(!text)return null;

  const fraction=text.match(
    /(\d+(?:\.\d+)?)\s*(?:\/|van)\s*(\d+(?:\.\d+)?)/i
  );

  if(fraction){
    const numerator=Number(fraction[1]);
    const denominator=Number(fraction[2]);

    if(
      Number.isFinite(numerator)&&
      Number.isFinite(denominator)&&
      denominator>0
    ){
      const normalised=
        numerator/denominator*5;

      return normalised>=0&&normalised<=5
        ?Math.round(normalised*10)/10
        :null;
    }
  }

  const number=Number(
    text.match(/\d+(?:\.\d+)?/)?.[0]
  );

  if(!Number.isFinite(number)){
    return null;
  }

  return number>=0&&number<=5
    ?Math.round(number*10)/10
    :null;
}

function ms692HarbourRating(tags={}){
  const sources=[
    ['rating',tags.rating],
    ['stars',tags.stars],
    ['review:rating',tags['review:rating']],
    ['review_score',tags.review_score],
    ['score',tags.score],
    ['operator:rating',tags['operator:rating']]
  ];

  for(const [source,value] of sources){
    const rating=ms692ParseRating(value);

    if(Number.isFinite(rating)){
      return {
        rating,
        source,
        original:String(value)
      };
    }
  }

  return null;
}

function ms692ElementPosition(element){
  const lat=Number(
    element?.lat??
    element?.center?.lat??
    (
      element?.bounds
        ?(
          Number(element.bounds.minlat)+
          Number(element.bounds.maxlat)
        )/2
        :NaN
    )
  );
  const lon=Number(
    element?.lon??
    element?.center?.lon??
    (
      element?.bounds
        ?(
          Number(element.bounds.minlon)+
          Number(element.bounds.maxlon)
        )/2
        :NaN
    )
  );

  return {
    lat,
    lon,
    valid:
      Number.isFinite(lat)&&
      Number.isFinite(lon)
  };
}

function ms692HarbourQuery(country='NL'){
  const safeCountry=String(country)
    .replace(/[^A-Z]/g,'')
    .slice(0,2)||'NL';

  const ratedSelectors=[
    '["rating"]',
    '["stars"]',
    '["review:rating"]',
    '["review_score"]',
    '["score"]',
    '["operator:rating"]'
  ];

  const marinaSelectors=[
    '["leisure"="marina"]',
    '["seamark:harbour:category"="marina"]',
    '["seamark:type"="harbour"]["harbour"="marina"]'
  ];

  const lines=[];

  marinaSelectors.forEach(marina=>{
    ratedSelectors.forEach(rating=>{
      lines.push(
        `nwr${marina}${rating}(area.searchArea);`
      );
    });
  });

  return `[out:json][timeout:90];
area["ISO3166-1"="${safeCountry}"][admin_level=2]->.searchArea;
(
  ${lines.join('\n  ')}
);
out center tags;`;
}

async function ms692FetchHarbours(query){
  const endpoints=[
    '/api/overpass',
    '/api/overpass-backup',
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  let lastError=null;

  for(const endpoint of endpoints){
    const controller=new AbortController();
    const timeout=setTimeout(
      ()=>controller.abort(),
      95000
    );

    try{
      const target=endpoint.startsWith('http')
        ?endpoint
        :new URL(endpoint,location.origin).toString();

      const response=await fetch(target,{
        method:'POST',
        headers:{
          'content-type':
            'application/x-www-form-urlencoded;charset=UTF-8',
          accept:'application/json'
        },
        body:new URLSearchParams({
          data:query
        }).toString(),
        signal:controller.signal,
        cache:'no-store'
      });

      if(!response.ok){
        throw new Error(
          `Kaartdienst gaf HTTP ${response.status}.`
        );
      }

      const payload=await response.json();

      if(!Array.isArray(payload?.elements)){
        throw new Error(
          'Kaartdienst gaf geen geldige havenlijst terug.'
        );
      }

      return payload.elements;
    }catch(error){
      lastError=error;
      console.warn(
        'Havenimport via kaartdienst mislukt:',
        endpoint,
        error
      );
    }finally{
      clearTimeout(timeout);
    }
  }

  throw lastError||
    new Error('Geen kaartdienst bereikbaar.');
}

function ms692Address(tags={}){
  const street=[
    tags['addr:street'],
    tags['addr:housenumber']
  ].filter(Boolean).join(' ');

  const city=[
    tags['addr:postcode'],
    tags['addr:city']||
    tags['addr:place']
  ].filter(Boolean).join(' ');

  return [street,city]
    .filter(Boolean)
    .join(', ');
}

function ms692HarbourPlace(tags={}){
  return String(
    tags['addr:city']||
    tags['addr:place']||
    tags['is_in:city']||
    tags['is_in:town']||
    tags['is_in']||
    ''
  ).trim();
}

function ms692HarbourReview(
  element,
  tags,
  ratingInfo
){
  const details=[
    'Geïmporteerd uit openbare OpenStreetMap-gegevens.',
    `Openbare score/classificatie: ${ratingInfo.rating.toLocaleString('nl-NL',{
      maximumFractionDigits:1
    })}/5`,
    `brontag: ${ratingInfo.source}=${ratingInfo.original}`,
    tags.website||tags['contact:website']
      ?`website: ${tags.website||tags['contact:website']}`
      :'',
    tags.phone||tags['contact:phone']
      ?`telefoon: ${tags.phone||tags['contact:phone']}`
      :'',
    tags.vhf
      ?`VHF: ${tags.vhf}`
      :'',
    tags.power_supply==='yes'||
    tags.power_supply==='available'
      ?'walstroom aanwezig'
      :'',
    tags.shower==='yes'
      ?'douches aanwezig'
      :'',
    tags.toilets==='yes'
      ?'toiletten aanwezig'
      :'',
    tags.washing_machine==='yes'
      ?'wasmachine aanwezig'
      :'',
    `[OSM:${element.type}/${element.id}]`
  ].filter(Boolean);

  return details.join(' · ');
}

function ms692HarbourRows(
  elements,
  minimum
){
  const seen=new Set();
  const rows=[];

  (elements||[]).forEach(element=>{
    const tags=element.tags||{};
    const position=ms692ElementPosition(element);
    const ratingInfo=ms692HarbourRating(tags);

    if(
      !position.valid||
      !ratingInfo||
      !(ratingInfo.rating>minimum)
    ){
      return;
    }

    const name=String(
      tags.name||
      tags['seamark:name']||
      tags.operator||
      ''
    ).trim();

    if(!name)return;

    const key=
      `${element.type}:${element.id}`;

    if(seen.has(key))return;
    seen.add(key);

    rows.push({
      osmKey:key,
      name,
      category:'Haven',
      place:ms692HarbourPlace(tags),
      address:ms692Address(tags),
      review:ms692HarbourReview(
        element,
        tags,
        ratingInfo
      ),
      rating:ratingInfo.rating,
      is_favorite:false,
      latitude:position.lat,
      longitude:position.lon,
      tags
    });
  });

  return rows.sort(
    (a,b)=>
      b.rating-a.rating||
      a.name.localeCompare(b.name,'nl')
  );
}

function ms692ExistingHarbourMatch(candidate){
  const candidateName=
    ms692Normalise(candidate.name);

  return (poiCache||[]).some(poi=>{
    if(poi.category!=='Haven')return false;

    if(
      String(poi.review||'')
        .includes(`[OSM:${candidate.osmKey}]`)
    ){
      return true;
    }

    const sameName=
      candidateName&&
      ms692Normalise(poi.name)===
        candidateName;

    const position=getPoiMapPosition(poi);
    const close=
      position.valid&&
      haversineKm(
        {
          lat:candidate.latitude,
          lon:candidate.longitude
        },
        {
          lat:position.lat,
          lon:position.lon
        }
      )<.15;

    return sameName||close;
  });
}

function ms692RenderHarbourPreview(
  candidates,
  imported,
  duplicates
){
  const preview=$('ms692HarbourPreview');
  if(!preview)return;

  const examples=candidates
    .slice(0,10)
    .map(harbour=>`
      <article>
        <span>⚓</span>
        <div>
          <strong>${esc(harbour.name)}</strong>
          <small>
            ${harbour.place?`${esc(harbour.place)} · `:''}
            ${esc(ms692RatingDisplay(harbour.rating))}
          </small>
        </div>
      </article>
    `).join('');

  preview.classList.remove('hidden');
  preview.innerHTML=`
    <div class="ms692-harbour-summary">
      <div>
        <span>Gevonden</span>
        <strong>${candidates.length}</strong>
      </div>
      <div>
        <span>Nieuw toegevoegd</span>
        <strong>${imported}</strong>
      </div>
      <div>
        <span>Al aanwezig</span>
        <strong>${duplicates}</strong>
      </div>
    </div>
    ${
      examples
        ?`<div class="ms692-harbour-examples">${examples}</div>`
        :''
    }
  `;
}

async function ms692InsertHarbours(rows){
  let imported=0;

  for(let index=0;index<rows.length;index+=75){
    const chunk=rows
      .slice(index,index+75)
      .map(row=>({
        boat_id:currentBoat.id,
        created_by:currentUser.id,
        name:row.name,
        category:row.category,
        place:row.place,
        address:row.address,
        review:row.review,
        rating:row.rating,
        is_favorite:false,
        latitude:row.latitude,
        longitude:row.longitude,
        updated_at:new Date().toISOString()
      }));

    ms692SetHarbourStatus(
      `Havens toevoegen: ${Math.min(index+chunk.length,rows.length)} van ${rows.length}…`
    );

    const {data,error}=await sb
      .from('pois')
      .insert(chunk)
      .select('id');

    if(error)throw error;
    imported+=(data||[]).length;
  }

  return imported;
}

async function ms692ImportRatedHarbours(){
  if(ms692HarbourImportBusy)return;

  const button=$('ms692HarbourImportButton');
  const country=
    $('ms692HarbourCountry')?.value||
    'NL';
  const minimum=Number(
    $('ms692HarbourMinimum')?.value||
    3
  );

  try{
    if(!currentUser){
      const {data:{session}}=
        await sb.auth.getSession();
      currentUser=session?.user||null;
    }

    if(!currentBoat&&currentUser){
      await loadMembership();
    }

    if(!currentBoat||!currentUser){
      throw new Error(
        'Log opnieuw in en koppel Serenity.'
      );
    }

    ms692HarbourImportBusy=true;
    if(button)button.disabled=true;

    ms692SetHarbourBadge(
      'Zoeken…',
      'checking'
    );
    ms692SetHarbourStatus(
      `Alle Nederlandse havens met een openbare score hoger dan ${minimum.toLocaleString('nl-NL')} worden gezocht…`
    );

    const elements=
      await ms692FetchHarbours(
        ms692HarbourQuery(country)
      );

    const candidates=
      ms692HarbourRows(
        elements,
        minimum
      );

    const fresh=[];
    let duplicates=0;

    candidates.forEach(candidate=>{
      if(ms692ExistingHarbourMatch(candidate)){
        duplicates++;
      }else{
        fresh.push(candidate);
      }
    });

    if(!candidates.length){
      ms692SetHarbourBadge(
        'Geen resultaten',
        'warning'
      );
      ms692SetHarbourStatus(
        'De openbare kaartgegevens bevatten op dit moment geen Nederlandse havens met een bruikbare numerieke score boven deze grens.',
        'warning'
      );
      ms692RenderHarbourPreview(
        [],
        0,
        0
      );
      return;
    }

    let imported=0;

    if(fresh.length){
      imported=
        await ms692InsertHarbours(
          fresh
        );
      await loadPois();
    }

    ms692SetHarbourBadge(
      imported
        ?`${imported} toegevoegd`
        :'Alles aanwezig',
      'success'
    );

    ms692SetHarbourStatus(
      imported
        ?`${imported} gewaardeerde haven${imported===1?' is':'s zijn'} toegevoegd aan POI. ${duplicates} bestaande haven${duplicates===1?' is':'s zijn'} overgeslagen.`
        :`Alle ${duplicates} gevonden havens stonden al in POI.`,
      'success'
    );

    ms692RenderHarbourPreview(
      candidates,
      imported,
      duplicates
    );

    if(imported){
      showAppToast(
        `${imported} gewaardeerde havens toegevoegd ✅`
      );
    }
  }catch(error){
    console.error(
      'Gewaardeerde havens importeren mislukt:',
      error
    );
    ms692SetHarbourBadge(
      'Import mislukt',
      'error'
    );
    ms692SetHarbourStatus(
      `Importeren mislukt: ${error?.message||'onbekende fout'}`,
      'error'
    );
  }finally{
    ms692HarbourImportBusy=false;
    if(button)button.disabled=false;
  }
}



/* ============================================================
   MijnSerenity Cloud 7.4.4 — Havens binnen straal van locatie
   ============================================================ */

let ms693NearbyBusy=false;

function ms693CurrentPosition(){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){
      reject(
        new Error(
          'Dit apparaat ondersteunt geen locatiebepaling.'
        )
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position=>resolve({
        lat:Number(position.coords.latitude),
        lon:Number(position.coords.longitude),
        accuracy:Number(position.coords.accuracy)||null
      }),
      error=>{
        const messages={
          1:'Locatietoegang is geweigerd. Sta locatie toe voor mijnserenity.nl.',
          2:'De huidige locatie is tijdelijk niet beschikbaar.',
          3:'Het ophalen van de locatie duurde te lang.'
        };

        reject(
          new Error(
            messages[error.code]||
            error.message||
            'Locatie kon niet worden bepaald.'
          )
        );
      },
      {
        enableHighAccuracy:true,
        maximumAge:30000,
        timeout:20000
      }
    );
  });
}

function ms693NearbyHarbourQuery(
  lat,
  lon,
  radiusKm
){
  const radiusMeters=Math.round(
    Math.max(1,Number(radiusKm)||20)*
    1000
  );

  return `[out:json][timeout:45];
(
  nwr["leisure"="marina"](around:${radiusMeters},${Number(lat).toFixed(6)},${Number(lon).toFixed(6)});
  nwr["seamark:harbour:category"="marina"](around:${radiusMeters},${Number(lat).toFixed(6)},${Number(lon).toFixed(6)});
  nwr["seamark:type"="harbour"]["harbour"="marina"](around:${radiusMeters},${Number(lat).toFixed(6)},${Number(lon).toFixed(6)});
);
out center tags;`;
}

function ms693HarbourRows(
  elements,
  origin,
  radiusKm
){
  const seen=new Set();
  const rows=[];

  (elements||[]).forEach(element=>{
    const tags=element.tags||{};
    const position=ms692ElementPosition(element);

    if(!position.valid)return;

    const distanceKm=haversineKm(
      origin,
      {
        lat:position.lat,
        lon:position.lon
      }
    );

    if(distanceKm>Number(radiusKm))return;

    const name=String(
      tags.name||
      tags['seamark:name']||
      tags.operator||
      'Naamloze jachthaven'
    ).trim();

    const key=
      `${element.type}:${element.id}`;

    if(seen.has(key))return;
    seen.add(key);

    const ratingInfo=
      ms692HarbourRating(tags);

    rows.push({
      osmKey:key,
      name,
      category:'Haven',
      place:ms692HarbourPlace(tags),
      address:ms692Address(tags),
      review:[
        'Geïmporteerd als haven nabij mijn locatie.',
        `Afstand bij import: ${distanceKm.toLocaleString('nl-NL',{
          maximumFractionDigits:1
        })} km`,
        ratingInfo
          ?`Openbare score/classificatie: ${ratingInfo.rating.toLocaleString('nl-NL',{
              maximumFractionDigits:1
            })}/5 · brontag ${ratingInfo.source}=${ratingInfo.original}`
          :'Geen openbare numerieke beoordeling beschikbaar.',
        tags.website||tags['contact:website']
          ?`website: ${tags.website||tags['contact:website']}`
          :'',
        tags.phone||tags['contact:phone']
          ?`telefoon: ${tags.phone||tags['contact:phone']}`
          :'',
        tags.vhf
          ?`VHF: ${tags.vhf}`
          :'',
        `[OSM:${element.type}/${element.id}]`
      ].filter(Boolean).join(' · '),
      rating:ratingInfo?.rating??null,
      is_favorite:false,
      latitude:position.lat,
      longitude:position.lon,
      distanceKm,
      tags
    });
  });

  return rows.sort(
    (a,b)=>
      a.distanceKm-b.distanceKm||
      a.name.localeCompare(b.name,'nl')
  );
}

function ms693RenderNearbyPreview(
  candidates,
  imported,
  duplicates,
  radiusKm
){
  const preview=$('ms692HarbourPreview');
  if(!preview)return;

  const examples=candidates
    .slice(0,15)
    .map(harbour=>`
      <article>
        <span>⚓</span>
        <div>
          <strong>${esc(harbour.name)}</strong>
          <small>
            ${harbour.distanceKm.toLocaleString('nl-NL',{
              maximumFractionDigits:1
            })} km
            ${harbour.place?` · ${esc(harbour.place)}`:''}
            ${Number.isFinite(Number(harbour.rating))
              ?` · ${esc(ms692RatingDisplay(harbour.rating))}`
              :' · geen score'}
          </small>
        </div>
      </article>
    `).join('');

  preview.classList.remove('hidden');
  preview.innerHTML=`
    <div class="ms692-harbour-summary">
      <div>
        <span>Binnen ${Number(radiusKm)} km</span>
        <strong>${candidates.length}</strong>
      </div>
      <div>
        <span>Nieuw toegevoegd</span>
        <strong>${imported}</strong>
      </div>
      <div>
        <span>Al aanwezig</span>
        <strong>${duplicates}</strong>
      </div>
    </div>
    ${
      examples
        ?`<div class="ms692-harbour-examples">${examples}</div>`
        :''
    }
  `;
}

async function ms693ImportNearbyHarbours(){
  if(ms693NearbyBusy)return;

  const button=$('ms693NearbyButton');
  const radiusKm=Number(
    $('ms693NearbyRadius')?.value||
    20
  );

  try{
    if(!currentUser){
      const {data:{session}}=
        await sb.auth.getSession();
      currentUser=session?.user||null;
    }

    if(!currentBoat&&currentUser){
      await loadMembership();
    }

    if(!currentBoat||!currentUser){
      throw new Error(
        'Log opnieuw in en koppel Serenity.'
      );
    }

    ms693NearbyBusy=true;
    if(button)button.disabled=true;

    ms692SetHarbourBadge(
      'Locatie bepalen…',
      'checking'
    );
    ms692SetHarbourStatus(
      'Huidige GPS-locatie ophalen…'
    );

    const origin=
      await ms693CurrentPosition();

    ms692SetHarbourBadge(
      'Havens zoeken…',
      'checking'
    );
    ms692SetHarbourStatus(
      `Alle jachthavens binnen ${radiusKm} km van je huidige locatie worden gezocht.`
    );

    const elements=
      await ms692FetchHarbours(
        ms693NearbyHarbourQuery(
          origin.lat,
          origin.lon,
          radiusKm
        )
      );

    const candidates=
      ms693HarbourRows(
        elements,
        origin,
        radiusKm
      );

    const fresh=[];
    let duplicates=0;

    candidates.forEach(candidate=>{
      if(ms692ExistingHarbourMatch(candidate)){
        duplicates++;
      }else{
        fresh.push(candidate);
      }
    });

    if(!candidates.length){
      ms692SetHarbourBadge(
        'Geen havens gevonden',
        'warning'
      );
      ms692SetHarbourStatus(
        `Binnen ${radiusKm} km zijn geen jachthavens in de openbare kaartgegevens gevonden. Probeer een grotere straal.`,
        'warning'
      );
      ms693RenderNearbyPreview(
        [],
        0,
        0,
        radiusKm
      );
      return;
    }

    let imported=0;

    if(fresh.length){
      imported=
        await ms692InsertHarbours(
          fresh
        );
      await loadPois();
    }

    ms692SetHarbourBadge(
      imported
        ?`${imported} toegevoegd`
        :'Alles aanwezig',
      'success'
    );

    ms692SetHarbourStatus(
      imported
        ?`${imported} haven${imported===1?' is':'s zijn'} binnen ${radiusKm} km toegevoegd. ${duplicates} bestaande haven${duplicates===1?' is':'s zijn'} overgeslagen.`
        :`Alle ${duplicates} gevonden havens stonden al in POI.`,
      'success'
    );

    ms693RenderNearbyPreview(
      candidates,
      imported,
      duplicates,
      radiusKm
    );

    if(imported){
      showAppToast(
        `${imported} havens in de buurt toegevoegd ✅`
      );
    }
  }catch(error){
    console.error(
      'Havens in de buurt importeren mislukt:',
      error
    );

    ms692SetHarbourBadge(
      'Zoeken mislukt',
      'error'
    );
    ms692SetHarbourStatus(
      `Zoeken mislukt: ${error?.message||'onbekende fout'}`,
      'error'
    );
  }finally{
    ms693NearbyBusy=false;
    if(button)button.disabled=false;
  }
}



/* ============================================================
   MijnSerenity Cloud 7.4.4 — POI Data Service
   ============================================================ */

let ms694EnrichmentBusy=false;
let ms694EnrichmentCancelled=false;
let ms694AutomaticRunStarted=false;

function ms694SettingsKey(){
  return `mijnserenity-poi-enrichment-${currentBoat?.id||'boat'}`;
}

function ms694DefaultSettings(){
  return {
    intervalDays:30,
    autoPhotos:true,
    autoOnOpen:true
  };
}

function ms694ReadSettings(){
  try{
    return {
      ...ms694DefaultSettings(),
      ...JSON.parse(
        localStorage.getItem(ms694SettingsKey())||
        '{}'
      )
    };
  }catch{
    return ms694DefaultSettings();
  }
}

function ms694LoadSettings(){
  const settings=ms694ReadSettings();

  if($('ms694RefreshInterval')){
    $('ms694RefreshInterval').value=
      String(settings.intervalDays);
  }

  if($('ms694AutoPhotos')){
    $('ms694AutoPhotos').checked=
      Boolean(settings.autoPhotos);
  }

  if($('ms694AutoOnOpen')){
    $('ms694AutoOnOpen').checked=
      Boolean(settings.autoOnOpen);
  }

  ms694RenderOverview();
}

function ms694SaveSettings(){
  const settings={
    intervalDays:Number(
      $('ms694RefreshInterval')?.value||
      0
    ),
    autoPhotos:Boolean(
      $('ms694AutoPhotos')?.checked
    ),
    autoOnOpen:Boolean(
      $('ms694AutoOnOpen')?.checked
    )
  };

  try{
    localStorage.setItem(
      ms694SettingsKey(),
      JSON.stringify(settings)
    );
  }catch{}

  ms694RenderOverview();
}

function ms694SetStatus(
  message,
  type=''
){
  const status=$('ms694EnrichmentStatus');

  if(status){
    status.className=
      `ms694-enrichment-status ${type}`;
    status.textContent=message;
  }
}

function ms694SetBadge(
  message,
  type=''
){
  const badge=$('ms694EnrichmentBadge');

  if(badge){
    badge.className=
      `ms694-enrichment-badge ${type}`;
    badge.textContent=message;
  }
}

function ms694SetProgress(
  current,
  total
){
  const percentage=
    total>0
      ?Math.round(current/total*100)
      :0;
  const bar=$('ms694ProgressBar');

  if(bar){
    bar.style.width=`${percentage}%`;
  }
}

function ms694ValidCoordinate(poi){
  const latitude=Number(poi?.latitude);
  const longitude=Number(poi?.longitude);

  return {
    latitude,
    longitude,
    valid:
      Number.isFinite(latitude)&&
      Number.isFinite(longitude)
  };
}

function ms694PoiAgeDays(poi){
  if(!poi?.enriched_at)return Infinity;

  const timestamp=
    new Date(poi.enriched_at).getTime();

  return Number.isFinite(timestamp)
    ?Math.max(
        0,
        (Date.now()-timestamp)/86400000
      )
    :Infinity;
}

function ms694PoiNeedsRefresh(
  poi,
  intervalDays
){
  const missingCore=
    !String(poi.place||'').trim()||
    !String(poi.address||'').trim()||
    !String(poi.website||'').trim()||
    !String(poi.phone||'').trim();

  return missingCore||
    ms694PoiAgeDays(poi)>=intervalDays;
}

function ms694ReviewLinks(poi){
  const query=[
    poi.name,
    poi.place,
    poi.address
  ].filter(Boolean).join(' ');

  const encoded=encodeURIComponent(query);

  return {
    google:
      `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    tripadvisor:
      `https://www.tripadvisor.nl/Search?q=${encoded}`
  };
}

function ms694SafeExternalUrl(value){
  const text=String(value||'').trim();

  if(!text)return '';

  try{
    const url=new URL(
      /^https?:\/\//i.test(text)
        ?text
        :`https://${text}`
    );

    return ['http:','https:'].includes(
      url.protocol
    )
      ?url.toString()
      :'';
  }catch{
    return '';
  }
}

function ms694PoiExtraHtml(poi){
  const website=
    ms694SafeExternalUrl(poi.website);
  const phone=String(poi.phone||'').trim();
  const hours=String(
    poi.opening_hours||
    ''
  ).trim();
  const externalRating=Number(
    poi.external_rating
  );
  const links=ms694ReviewLinks(poi);
  const enriched=poi.enriched_at
    ?new Date(poi.enriched_at)
    :null;
  const source=String(
    poi.enrichment_sources||
    ''
  ).trim();

  if(
    !website&&
    !phone&&
    !hours&&
    !Number.isFinite(externalRating)&&
    !enriched
  ){
    return `
      <div class="ms694-poi-extra pending">
        <span>ℹ️ Nog niet automatisch verrijkt</span>
      </div>
    `;
  }

  return `
    <div class="ms694-poi-extra">
      <div class="ms694-poi-extra-badges">
        ${
          Number.isFinite(externalRating)
            ?`<span class="rating">
                ★ ${externalRating.toLocaleString('nl-NL',{
                  maximumFractionDigits:1
                })}
                ${poi.external_rating_source
                  ?`· ${esc(poi.external_rating_source)}`
                  :''}
              </span>`
            :''
        }
        ${
          enriched
            ?`<span>
                ↻ ${enriched.toLocaleDateString('nl-NL',{
                  day:'numeric',
                  month:'short',
                  year:'numeric'
                })}
              </span>`
            :''
        }
      </div>

      ${
        hours
          ?`<div class="ms694-poi-detail">
              🕒 ${esc(hours)}
            </div>`
          :''
      }

      <div class="ms694-poi-links">
        ${
          website
            ?`<a href="${esc(website)}"
                target="_blank"
                rel="noopener noreferrer">
                🌐 Website
              </a>`
            :''
        }
        ${
          phone
            ?`<a href="tel:${esc(phone.replace(/[^\d+]/g,''))}">
                ☎️ Bellen
              </a>`
            :''
        }
        <a href="${esc(links.google)}"
          target="_blank"
          rel="noopener noreferrer">
          ⭐ Google-recensies
        </a>
        <a href="${esc(links.tripadvisor)}"
          target="_blank"
          rel="noopener noreferrer">
          🦉 Tripadvisor
        </a>
      </div>

      ${
        source
          ?`<small class="ms694-poi-source">
              Bronnen: ${esc(source)}
            </small>`
          :''
      }
    </div>
  `;
}

function ms694ParseOsmReference(poi){
  const match=String(poi?.review||'')
    .match(
      /\[OSM:(node|way|relation)\/(\d+)\]/i
    );

  return match
    ?{
        type:match[1].toLowerCase(),
        id:match[2]
      }
    :null;
}

function ms694OsmSelectors(category){
  const map={
    Haven:[
      '["leisure"="marina"]',
      '["seamark:harbour:category"="marina"]',
      '["seamark:type"="harbour"]'
    ],
    Brug:[
      '["bridge"]',
      '["seamark:type"="bridge"]'
    ],
    Sluis:[
      '["waterway"="lock_gate"]',
      '["waterway"="lock"]',
      '["lock"="yes"]'
    ],
    Supermarkt:[
      '["shop"="supermarket"]'
    ],
    Cafetaria:[
      '["amenity"="fast_food"]'
    ],
    Restaurant:[
      '["amenity"="restaurant"]'
    ],
    Café:[
      '["amenity"="cafe"]'
    ],
    Tankstation:[
      '["amenity"="fuel"]'
    ],
    Bakker:[
      '["shop"="bakery"]'
    ],
    Apotheek:[
      '["amenity"="pharmacy"]'
    ],
    Winkel:[
      '["shop"]'
    ],
    Camping:[
      '["tourism"="camp_site"]'
    ],
    Parkeren:[
      '["amenity"="parking"]'
    ],
    Toilet:[
      '["amenity"="toilets"]'
    ],
    Watertappunt:[
      '["amenity"="drinking_water"]'
    ],
    Tankplaats:[
      '["amenity"="fuel"]'
    ],
    Ankerplek:[
      '["seamark:type"="anchorage"]',
      '["anchorage"]'
    ]
  };

  return map[category]||
    ['["name"]'];
}

function ms694OsmQuery(poi,coordinate){
  const reference=
    ms694ParseOsmReference(poi);

  if(reference){
    return `[out:json][timeout:25];
${reference.type}(${reference.id});
out center tags;`;
  }

  const selectors=
    ms694OsmSelectors(poi.category);

  return `[out:json][timeout:28];
(
  ${selectors.map(selector=>
    `nwr${selector}(around:300,${coordinate.latitude.toFixed(7)},${coordinate.longitude.toFixed(7)});`
  ).join('\n  ')}
);
out center tags;`;
}

function ms694OsmPosition(element){
  return ms692ElementPosition(element);
}

function ms694OsmCandidateScore(
  poi,
  element,
  coordinate
){
  const tags=element.tags||{};
  const name=ms692Normalise(
    tags['name:nl']||
    tags.name||
    tags.operator||
    ''
  );
  const target=ms692Normalise(poi.name);
  const position=ms694OsmPosition(element);

  if(!position.valid)return -Infinity;

  const distance=haversineKm(
    {
      lat:coordinate.latitude,
      lon:coordinate.longitude
    },
    {
      lat:position.lat,
      lon:position.lon
    }
  );

  let score=Math.max(0,30-distance*100);

  if(name===target)score+=100;
  else if(
    name&&target&&
    (
      name.includes(target)||
      target.includes(name)
    )
  )score+=65;
  else{
    const words=target.split(' ')
      .filter(word=>word.length>=3);

    score+=words.filter(word=>
      name.includes(word)
    ).length*12;
  }

  return score;
}

async function ms694FetchOsmDetails(
  poi,
  coordinate
){
  try{
    const elements=
      await ms692FetchHarbours(
        ms694OsmQuery(
          poi,
          coordinate
        )
      );

    if(!elements.length)return null;

    return [...elements]
      .sort(
        (a,b)=>
          ms694OsmCandidateScore(
            poi,b,coordinate
          )-
          ms694OsmCandidateScore(
            poi,a,coordinate
          )
      )[0]||null;
  }catch(error){
    console.warn(
      'OSM-details voor POI niet beschikbaar:',
      poi.name,
      error
    );
    return null;
  }
}

function ms694OsmAddress(tags={}){
  return [
    [
      tags['addr:street'],
      tags['addr:housenumber']
    ].filter(Boolean).join(' '),
    [
      tags['addr:postcode'],
      tags['addr:city']||
      tags['addr:place']||
      tags['addr:village']
    ].filter(Boolean).join(' ')
  ].filter(Boolean).join(', ');
}

function ms694OsmPlace(tags={}){
  return String(
    tags['addr:city']||
    tags['addr:place']||
    tags['addr:village']||
    tags['is_in:city']||
    tags['is_in:town']||
    tags['is_in']||
    ''
  ).trim();
}

function ms694OsmRating(tags={}){
  const result=ms692HarbourRating(tags);

  return result
    ?{
        rating:result.rating,
        source:`OpenStreetMap ${result.source}`
      }
    :{
        rating:null,
        source:''
      };
}

async function ms694ResolveCoordinate(poi){
  const current=ms694ValidCoordinate(poi);

  if(current.valid)return current;

  const query=[
    poi.name,
    poi.address,
    poi.place
  ].filter(Boolean).join(' ');

  if(query.length<3)return current;

  try{
    const suggestResponse=await fetch(
      `https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest?${new URLSearchParams({
        q:query,
        rows:'5'
      })}`,
      {
        headers:{Accept:'application/json'}
      }
    );

    if(!suggestResponse.ok)return current;

    const suggest=await suggestResponse.json();
    const candidate=
      suggest?.response?.docs?.[0];

    if(!candidate?.id)return current;

    const lookupResponse=await fetch(
      `https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup?${new URLSearchParams({
        id:candidate.id
      })}`,
      {
        headers:{Accept:'application/json'}
      }
    );

    if(!lookupResponse.ok)return current;

    const lookup=await lookupResponse.json();
    const doc=lookup?.response?.docs?.[0];
    const point=parsePdokPoint(
      doc?.centroide_ll||
      doc?.geometrie_ll||
      ''
    );

    return point
      ?{
          latitude:Number(point.latitude),
          longitude:Number(point.longitude),
          valid:true
        }
      :current;
  }catch(error){
    console.warn(
      'POI-coördinaten bepalen mislukt:',
      poi.name,
      error
    );
    return current;
  }
}

async function ms694ReversePdok(coordinate){
  if(!coordinate.valid)return null;

  try{
    const response=await fetch(
      `https://api.pdok.nl/bzk/locatieserver/search/v3_1/reverse?${new URLSearchParams({
        lat:String(coordinate.latitude),
        lon:String(coordinate.longitude),
        rows:'10'
      })}`,
      {
        headers:{Accept:'application/json'}
      }
    );

    if(!response.ok)return null;

    const payload=await response.json();
    const docs=Array.isArray(
      payload?.response?.docs
    )
      ?payload.response.docs
      :[];

    const addressDoc=docs.find(doc=>
      String(doc.type||'').toLowerCase()==='adres'
    )||docs[0];

    if(!addressDoc)return null;

    return {
      place:String(
        addressDoc.woonplaatsnaam||
        addressDoc.gemeentenaam||
        ''
      ).trim(),
      address:buildPdokAddress(
        addressDoc
      ),
      displayName:String(
        addressDoc.weergavenaam||
        ''
      ).replace(/<[^>]+>/g,'').trim()
    };
  }catch(error){
    console.warn(
      'PDOK reverse lookup mislukt:',
      error
    );
    return null;
  }
}

function ms694PhotoContext(poi,coordinate){
  const address=String(poi.address||'');
  const addressStreet=address
    .split(',')[0]
    .replace(/\b\d+[a-zA-Z-]*\b/g,' ')
    .trim();

  return {
    name:String(poi.name||'').trim(),
    place:String(poi.place||'').trim(),
    address,
    category:String(poi.category||'').trim(),
    latitude:coordinate.valid
      ?coordinate.latitude
      :null,
    longitude:coordinate.valid
      ?coordinate.longitude
      :null,
    nameNormalised:
      poiPhotoNormaliseText(poi.name),
    placeNormalised:
      poiPhotoNormaliseText(poi.place),
    addressNormalised:
      poiPhotoNormaliseText(address),
    nameTokens:
      poiPhotoTokens(poi.name),
    placeTokens:
      poiPhotoTokens(
        poi.place,
        {allowGeneric:true}
      ),
    streetTokens:
      poiPhotoTokens(
        addressStreet,
        {allowGeneric:true}
      ),
    categoryTokens:
      poiPhotoTokens(
        poi.category,
        {allowGeneric:true}
      )
  };
}

async function ms694FindPhoto(
  poi,
  coordinate
){
  if(
    (poiPhotoCache[poi.id]||[]).length
  ){
    return null;
  }

  const context=
    ms694PhotoContext(
      poi,
      coordinate
    );

  if(
    context.name.length<3||
    !context.nameTokens.length
  ){
    return null;
  }

  const quotedName=
    `"${context.name.replace(/"/g,'')}"`;

  const queries=[
    [quotedName,context.place]
      .filter(Boolean).join(' '),
    [quotedName,context.category,context.place]
      .filter(Boolean).join(' ')
  ];

  const controller=new AbortController();
  const timeout=setTimeout(
    ()=>controller.abort(),
    25000
  );

  try{
    const jobs=queries.map(query=>
      fetchCommonsPhotosByText(
        query,
        controller.signal
      )
    );

    if(coordinate.valid){
      jobs.push(
        fetchCommonsPhotosByCoordinates(
          coordinate.latitude,
          coordinate.longitude,
          controller.signal
        )
      );
    }

    const results=
      await Promise.allSettled(jobs);
    const seen=new Set();
    const photos=[];

    results.forEach(result=>{
      if(result.status!=='fulfilled')return;

      result.value.forEach(photo=>{
        const key=commonsPhotoKey(photo);

        if(!key||seen.has(key))return;
        seen.add(key);
        photos.push(photo);
      });
    });

    return filterRelevantPoiWebPhotos(
      photos,
      context
    )[0]||null;
  }catch(error){
    console.warn(
      'Automatische fotozoekactie mislukt:',
      poi.name,
      error
    );
    return null;
  }finally{
    clearTimeout(timeout);
  }
}

function ms694MissingPhotoColumns(error){
  const message=String(
    error?.message||
    ''
  ).toLowerCase();

  return [
    'source_url',
    'source_title',
    'source_attribution',
    'source_license',
    'auto_imported',
    'enriched_at',
    'schema cache'
  ].some(term=>message.includes(term));
}

async function ms694UploadPhoto(
  poi,
  photo
){
  if(!photo)return false;

  const file=await webPhotoToFile(
    photo,
    0
  );
  const safeExt=(
    file.name.split('.').pop()||
    'jpg'
  )
    .toLowerCase()
    .replace(/[^a-z0-9]/g,'')||
    'jpg';
  const path=
    `${currentBoat.id}/${poi.id}/`+
    `${crypto.randomUUID()}.${safeExt}`;

  const {error:uploadError}=await sb.storage
    .from(PHOTO_BUCKET)
    .upload(path,file,{
      cacheControl:'31536000',
      upsert:false,
      contentType:
        file.type||
        'image/jpeg'
    });

  if(uploadError)throw uploadError;

  const metadata={
    poi_id:poi.id,
    boat_id:currentBoat.id,
    created_by:currentUser.id,
    storage_path:path,
    original_name:file.name,
    source_url:photo.sourceUrl||null,
    source_title:photo.title||null,
    source_attribution:
      webPhotoAttributionLine(photo),
    source_license:photo.license||null,
    auto_imported:true,
    enriched_at:
      new Date().toISOString()
  };

  let {error}=await sb
    .from('poi_photos')
    .insert(metadata);

  if(
    error&&
    ms694MissingPhotoColumns(error)
  ){
    const fallback=await sb
      .from('poi_photos')
      .insert({
        poi_id:poi.id,
        boat_id:currentBoat.id,
        created_by:currentUser.id,
        storage_path:path,
        original_name:file.name
      });

    error=fallback.error;
  }

  if(error){
    await sb.storage
      .from(PHOTO_BUCKET)
      .remove([path]);
    throw error;
  }

  return true;
}

function ms694OsmSourceUrl(element){
  if(!element?.type||!element?.id)return '';

  return `https://www.openstreetmap.org/${element.type}/${element.id}`;
}

function ms694ExternalFields(
  poi,
  osmElement,
  pdok
){
  const tags=osmElement?.tags||{};
  const rating=ms694OsmRating(tags);
  const osmAddress=ms694OsmAddress(tags);
  const osmPlace=ms694OsmPlace(tags);
  const website=ms694SafeExternalUrl(
    tags.website||
    tags['contact:website']||
    poi.website
  );
  const phone=String(
    tags.phone||
    tags['contact:phone']||
    poi.phone||
    ''
  ).trim();
  const openingHours=String(
    tags.opening_hours||
    poi.opening_hours||
    ''
  ).trim();

  const sources=[
    pdok&&(pdok.place||pdok.address)
      ?'PDOK'
      :'',
    osmElement
      ?'OpenStreetMap'
      :'',
    (poiPhotoCache[poi.id]||[])
      .some(photo=>photo.auto_imported)
      ?'Wikimedia Commons'
      :''
  ].filter(Boolean);

  return {
    latitude:
      Number.isFinite(Number(poi.latitude))
        ?Number(poi.latitude)
        :null,
    longitude:
      Number.isFinite(Number(poi.longitude))
        ?Number(poi.longitude)
        :null,
    place:
      String(poi.place||'').trim()||
      osmPlace||
      pdok?.place||
      '',
    address:
      String(poi.address||'').trim()||
      osmAddress||
      pdok?.address||
      '',
    website,
    phone,
    opening_hours:openingHours,
    external_rating:
      Number.isFinite(rating.rating)
        ?rating.rating
        :poi.external_rating??null,
    external_rating_source:
      rating.source||
      poi.external_rating_source||
      '',
    source_url:
      ms694OsmSourceUrl(osmElement)||
      poi.source_url||
      '',
    osm_type:
      osmElement?.type||
      poi.osm_type||
      null,
    osm_id:
      osmElement?.id
        ?String(osmElement.id)
        :poi.osm_id||
        null,
    enrichment_sources:
      [...new Set([
        ...sources,
        ...String(
          poi.enrichment_sources||
          ''
        ).split(' · ').filter(Boolean)
      ])].join(' · '),
    enriched_at:
      new Date().toISOString(),
    enrichment_status:'success',
    updated_at:
      new Date().toISOString()
  };
}

async function ms694EnrichPoi(
  poi,
  settings
){
  const coordinate=
    await ms694ResolveCoordinate(poi);

  const pdok=coordinate.valid
    ?await ms694ReversePdok(coordinate)
    :null;

  const workingPoi={
    ...poi,
    latitude:coordinate.valid
      ?coordinate.latitude
      :poi.latitude,
    longitude:coordinate.valid
      ?coordinate.longitude
      :poi.longitude,
    place:
      String(poi.place||'').trim()||
      pdok?.place||
      '',
    address:
      String(poi.address||'').trim()||
      pdok?.address||
      ''
  };

  const osmElement=coordinate.valid
    ?await ms694FetchOsmDetails(
        workingPoi,
        coordinate
      )
    :null;

  const update=ms694ExternalFields(
    workingPoi,
    osmElement,
    pdok
  );

  if(coordinate.valid){
    update.latitude=coordinate.latitude;
    update.longitude=coordinate.longitude;
  }

  const {error}=await sb
    .from('pois')
    .update(update)
    .eq('id',poi.id)
    .eq('boat_id',currentBoat.id);

  if(error)throw error;

  let photoAdded=false;

  if(
    settings.autoPhotos&&
    !(poiPhotoCache[poi.id]||[]).length
  ){
    const photo=await ms694FindPhoto(
      {
        ...workingPoi,
        ...update
      },
      coordinate
    );

    if(photo){
      photoAdded=
        await ms694UploadPhoto(
          poi,
          photo
        );
    }
  }

  return {
    updated:true,
    photoAdded,
    coordinate:coordinate.valid,
    osm:Boolean(osmElement),
    pdok:Boolean(pdok)
  };
}

function ms694Delay(milliseconds){
  return new Promise(resolve=>
    setTimeout(resolve,milliseconds)
  );
}

function ms694CancelEnrichment(){
  ms694EnrichmentCancelled=true;
  ms694SetStatus(
    'Bijwerken wordt na de huidige POI gestopt.',
    'warning'
  );
}

async function ms694RunQueue(
  pois,
  {
    automatic=false
  }={}
){
  if(
    ms694EnrichmentBusy||
    !pois.length
  ){
    return;
  }

  const settings=ms694ReadSettings();
  const button=$('ms694EnrichAllButton');
  const cancel=$('ms694CancelButton');

  ms694EnrichmentBusy=true;
  ms694EnrichmentCancelled=false;

  if(button)button.disabled=true;
  cancel?.classList.remove('hidden');

  let updated=0;
  let photos=0;
  let failed=0;

  ms694SetBadge(
    automatic
      ?'Automatisch bijwerken'
      :'Bezig…',
    'checking'
  );
  ms694SetProgress(0,pois.length);

  for(
    let index=0;
    index<pois.length;
    index++
  ){
    if(ms694EnrichmentCancelled)break;

    const poi=pois[index];

    ms694SetStatus(
      `${index+1} van ${pois.length}: ${poi.name} aanvullen…`
    );

    try{
      const result=
        await ms694EnrichPoi(
          poi,
          settings
        );

      if(result.updated)updated++;
      if(result.photoAdded)photos++;
    }catch(error){
      failed++;

      console.warn(
        'POI-verrijking mislukt:',
        poi.name,
        error
      );

      try{
        await sb.from('pois')
          .update({
            enrichment_status:'error',
            enriched_at:
              new Date().toISOString()
          })
          .eq('id',poi.id)
          .eq('boat_id',currentBoat.id);
      }catch{}
    }

    ms694SetProgress(
      index+1,
      pois.length
    );

    if(index<pois.length-1){
      await ms694Delay(850);
    }
  }

  const stopped=ms694EnrichmentCancelled;

  try{
    await loadPoisOriginalForMs694();
  }catch{
    await loadPois();
  }

  ms694SetBadge(
    stopped
      ?'Gestopt'
      :`${updated} bijgewerkt`,
    stopped
      ?'warning'
      :failed
        ?'warning'
        :'success'
  );

  ms694SetStatus(
    stopped
      ?`Gestopt. ${updated} POI’s zijn bijgewerkt en ${photos} foto’s toegevoegd.`
      :`${updated} POI’s bijgewerkt · ${photos} foto’s toegevoegd · ${failed} niet gelukt.`,
    failed||stopped
      ?'warning'
      :'success'
  );

  if(!automatic&&!stopped){
    showAppToast(
      `${updated} POI’s bijgewerkt ✅`
    );
  }

  try{
    localStorage.setItem(
      `${ms694SettingsKey()}-last-run`,
      String(Date.now())
    );
  }catch{}

  ms694EnrichmentBusy=false;
  ms694EnrichmentCancelled=false;
  if(button)button.disabled=false;
  cancel?.classList.add('hidden');
  ms694RenderOverview();
}

async function ms694EnrichAllPois(){
  if(!currentBoat||!currentUser){
    alert('Log opnieuw in.');
    return;
  }

  if(!poiCache.length){
    showAppToast(
      'Er zijn nog geen POI’s om bij te werken.'
    );
    return;
  }

  if(!confirm(
    `Alle ${poiCache.length} POI’s controleren en aanvullen? Dit kan enkele minuten duren.`
  )){
    return;
  }

  await ms694RunQueue(
    [...poiCache],
    {automatic:false}
  );
}

function ms694RenderOverview(){
  if(!$('ms694EnrichmentBadge'))return;

  const settings=ms694ReadSettings();
  const enriched=(poiCache||[])
    .filter(poi=>poi.enriched_at);
  const stale=(poiCache||[])
    .filter(poi=>
      ms694PoiNeedsRefresh(
        poi,
        Math.max(
          1,
          Number(settings.intervalDays)||30
        )
      )
    );

  if(ms694EnrichmentBusy)return;

  if(!poiCache.length){
    ms694SetBadge(
      'Geen POI’s',
      ''
    );
    return;
  }

  ms694SetBadge(
    `${enriched.length}/${poiCache.length} verrijkt`,
    stale.length
      ?'warning'
      :'success'
  );

  if(!ms694EnrichmentBusy){
    ms694SetProgress(
      enriched.length,
      poiCache.length
    );
  }
}

async function ms694MaybeAutoRefresh(){
  if(
    ms694AutomaticRunStarted||
    ms694EnrichmentBusy||
    !currentBoat||
    !currentUser
  ){
    return;
  }

  const settings=ms694ReadSettings();

  if(
    !settings.autoOnOpen||
    Number(settings.intervalDays)<=0
  ){
    return;
  }

  let lastRun=0;

  try{
    lastRun=Number(
      localStorage.getItem(
        `${ms694SettingsKey()}-last-auto-run`
      )||0
    );
  }catch{}

  if(Date.now()-lastRun<20*60*60*1000){
    return;
  }

  const stale=(poiCache||[])
    .filter(poi=>
      ms694PoiNeedsRefresh(
        poi,
        Number(settings.intervalDays)
      )
    )
    .sort((a,b)=>
      ms694PoiAgeDays(b)-
      ms694PoiAgeDays(a)
    )
    .slice(0,3);

  if(!stale.length)return;

  ms694AutomaticRunStarted=true;

  try{
    localStorage.setItem(
      `${ms694SettingsKey()}-last-auto-run`,
      String(Date.now())
    );
  }catch{}

  setTimeout(()=>{
    ms694RunQueue(
      stale,
      {automatic:true}
    );
  },1800);
}

const loadPoisOriginalForMs694=
  loadPois;

loadPois=async function(...args){
  const result=
    await loadPoisOriginalForMs694(...args);

  ms694LoadSettings();
  ms694RenderOverview();
  ms694MaybeAutoRefresh();

  return result;
};

