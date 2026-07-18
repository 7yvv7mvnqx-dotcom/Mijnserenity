/* MijnSerenity 7.2.3 — Development Mode */
(()=>{
  'use strict';

  const DEV_STATE_KEY='mijnserenity-dev-state-v723';
  const DEV_AUTO_KEY='mijnserenity-dev-auto-open-v723';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const today=new Date();
  const isoDate=offset=>{
    const date=new Date(today);
    date.setDate(date.getDate()+offset);
    return date.toISOString().slice(0,10);
  };

  const defaults={
    pois:[
      {id:'dev-poi-1',name:'Haven Blokzijl',place:'Blokzijl',address:'Zuiderkade 1, Blokzijl',review:'Rustige demo-haven met mooie historische omgeving.',category:'Haven',rating:5,is_favorite:true,latitude:52.7266,longitude:5.9612,created_at:new Date().toISOString()},
      {id:'dev-poi-2',name:'Brug Meppelerdiep',place:'Meppel',address:'Meppelerdiep',review:'Voorbeeld van een routeobject in de testomgeving.',category:'Brug',rating:4,is_favorite:false,latitude:52.6964,longitude:6.1948,created_at:new Date().toISOString()},
      {id:'dev-poi-3',name:'Tankstation Vollenhove',place:'Vollenhove',address:'Aan de haven',review:'Demo-locatie voor diesel en boodschappen.',category:'Tankstation',rating:4,is_favorite:true,latitude:52.6814,longitude:5.9469,created_at:new Date().toISOString()}
    ],
    poiPhotos:{
      'dev-poi-1':[{id:'dev-photo-1',poi_id:'dev-poi-1',storage_path:'demo/haven.svg',original_name:'demo-haven.svg'}]
    },
    costs:[
      {id:'dev-cost-1',expense_date:isoDate(-2),amount:35,category:'Havengeld',description:'Haven Blokzijl\n\n--- BON DETAILS ---\nHavengeld € 28,50\nStroom € 4,00\nToeristenbelasting € 2,50'},
      {id:'dev-cost-2',expense_date:isoDate(-5),amount:84.5,category:'Diesel',description:'Demo tankbeurt'},
      {id:'dev-cost-3',expense_date:isoDate(-8),amount:19.95,category:'Onderhoud',description:'Impeller en klein materiaal'}
    ],
    costReceipts:{
      'dev-cost-1':[{id:'dev-receipt-1',cost_id:'dev-cost-1',storage_path:'demo/receipt.svg',original_name:'demo-bon.svg',mime_type:'image/svg+xml'}]
    },
    trips:[
      {id:'dev-trip-1',trip_date:isoDate(-1),title:'Demo: Hengelo naar Blokzijl',departure:'Hengelo',arrival:'Blokzijl',distance_km:46.8,duration_hours:5.4,fuel_liters:13.5,fuel_cost:27.68,crew:'Michel, Desi',notes:'Rustige demovaart met voorbeeldroute.',route_geojson:{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:[[6.793,52.264],[6.58,52.42],[6.36,52.56],[6.08,52.68],[5.9612,52.7266]]}}},
      {id:'dev-trip-2',trip_date:isoDate(-7),title:'Demo rondje Vollenhove',departure:'Blokzijl',arrival:'Vollenhove',distance_km:18.2,duration_hours:2.1,fuel_liters:5.2,fuel_cost:10.66,crew:'Michel, Desi',notes:'Korte voorbeeldtocht.',route_geojson:null}
    ],
    tripPhotos:{
      'dev-trip-1':[{id:'dev-trip-photo-1',trip_id:'dev-trip-1',storage_path:'demo/route.svg',description:'Demo routefoto',latitude:52.6,longitude:6.2}]
    },
    settings:{boat_name:'Serenity DEV',fuel_price:2.05,fuel_per_hour:2.5,tank_capacity:250,dashboard_photo_path:'demo/boat.svg'},
    entertainment:{
      version:2,enabled:true,haBaseUrl:'https://demo.ui.nabu.casa',dashboardPath:'/lovelace/mijnserenity',webhookId:'serenity_demo_only',activePlayer:'salon',activeLight:'salon',volume:35,brightness:70,updatedAt:new Date().toISOString(),
      ring:{name:'Ring voordeur',cameraEntity:'camera.ring_voordeur',motionSwitchEntity:'switch.ring_bewegingsdetectie'},
      hue:{lights:[
        {key:'salon',name:'Hue salon',entityId:'light.salon'},
        {key:'stuurstand',name:'Hue stuurstand',entityId:'light.stuurstand'},
        {key:'achterdek',name:'Hue achterdek',entityId:'light.achterdek'},
        {key:'slaapruimte',name:'Hue slaapruimte',entityId:'light.slaapruimte'}
      ]},
      players:[
        {key:'salon',name:'Sonos salon',entityId:'media_player.sonos_salon'},
        {key:'stuurstand',name:'Sonos stuurstand',entityId:'media_player.sonos_stuurstand'},
        {key:'achterdek',name:'Sonos achterdek',entityId:'media_player.sonos_achterdek'}
      ],
      appleTv:{name:'Apple TV salon',mediaEntity:'media_player.apple_tv_salon',remoteEntity:'remote.apple_tv_salon'},
      scenes:[
        {key:'avond',name:'Avond aan boord',entityId:'scene.avond_aan_boord'},
        {key:'varen',name:'Varen',entityId:'scene.varen'},
        {key:'slapen',name:'Slapen',entityId:'scene.slapen'},
        {key:'alles-uit',name:'Alles uit',entityId:'scene.alles_uit'}
      ],
      favorites:[
        {id:'favoriet-1',name:'NPO Radio 2',mediaContentId:'demo://npo-radio-2',mediaContentType:'music'},
        {id:'favoriet-2',name:'Serenity playlist',mediaContentId:'demo://serenity-playlist',mediaContentType:'playlist'},
        {id:'favoriet-3',name:'Rustig varen',mediaContentId:'demo://rustig-varen',mediaContentType:'music'},
        {id:'favoriet-4',name:'Favoriet 4',mediaContentId:'',mediaContentType:'music'},
        {id:'favoriet-5',name:'Favoriet 5',mediaContentId:'',mediaContentType:'music'},
        {id:'favoriet-6',name:'Favoriet 6',mediaContentId:'',mediaContentType:'music'}
      ]
    }
  };

  function loadState(){
    try{
      const saved=JSON.parse(localStorage.getItem(DEV_STATE_KEY)||'null');
      return saved&&typeof saved==='object'?{...clone(defaults),...saved}:clone(defaults);
    }catch{return clone(defaults)}
  }
  function saveState(){
    if(!window.MIJSERENITY_DEV_MODE)return;
    const value={pois:poiCache,poiPhotos:poiPhotoCache,costs:costCache,costReceipts:costReceiptCache,trips:tripCache,tripPhotos:window.tripPhotoCache||{},settings:settingsCache,entertainment:technicalStateCache?.entertainment||defaults.entertainment};
    try{localStorage.setItem(DEV_STATE_KEY,JSON.stringify(value))}catch(error){console.warn('Demo opslaan mislukt:',error)}
  }
  function demoId(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2,8)}`}

  function installDashboardCard(){
    if(document.getElementById('developmentDashboardCard'))return;
    const dashboard=document.getElementById('dashboard');
    const anchor=dashboard?.querySelector('.captain-strip');
    if(!dashboard)return;
    const card=document.createElement('div');
    card.id='developmentDashboardCard';
    card.className='card development-dashboard-card';
    card.innerHTML=`<span class="development-local-pill">🧪 TESTOMGEVING</span><h3>Veilig verder bouwen</h3><p class="small">Deze branch gebruikt alleen lokale voorbeeldgegevens. Supabase, productieaccounts en echte foto-opslag worden niet benaderd.</p><div class="development-dashboard-grid"><div><span>Data</span><strong>Lokaal op dit apparaat</strong></div><div><span>Home Assistant</span><strong>Demo-bediening actief</strong></div><div><span>Opslagverkeer</span><strong>0 GB Supabase</strong></div><div><span>Versie</span><strong>7.2.3 DEV</strong></div></div>`;
    if(anchor)anchor.insertAdjacentElement('afterend',card);else dashboard.prepend(card);
  }

  function updateDashboard(){
    const setText=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
    setText('dPois',String(poiCache.length));
    setText('dTrips',String(tripCache.length));
    setText('dCosts','€'+costCache.reduce((sum,item)=>sum+Number(item.amount||0),0).toFixed(0));
    setText('dSync','DEV');
    setText('welcome','Welkom aan boord, Michel');
    setText('captainGreeting','Goedemorgen Michel — testomgeving actief');
    const photo=document.getElementById('dashboardBoatPhoto');
    const placeholder=document.getElementById('dashboardPhotoPlaceholder');
    if(photo){photo.src='demo-serenity.svg';photo.classList.remove('hidden')}
    placeholder?.classList.add('hidden');
  }

  function renderAll(){
    renderBoat?.();
    renderPoiList?.();
    renderTripList?.();
    renderFinance?.();
    updateLatestRouteDashboard?.();
    updateDashboardFinanceSummary?.();
    renderCaptainCommandCenter?.();
    populatePlannerSelectors?.();
    renderHarbourLibrary?.();
    loadSettingsForm?.();
    storageSafeObserveImages?.(document);
    updateDashboard();
  }

  function installOverrides(){
    window.loadPois=async()=>{renderPoiList();return poiCache};
    window.loadCosts=async()=>{renderAll();return costCache};
    window.loadTrips=async()=>{renderAll();return tripCache};
    window.loadSettings=async()=>settingsCache;
    window.loadTechnicalDashboard=async()=>technicalStateCache;
    window.subscribeRealtime=()=>{};
    window.startPresenceHeartbeat=()=>{};
    window.stopPresenceHeartbeat=()=>{};
    window.touchAccountPresence=async()=>{};
    window.loadAdminAccounts=async()=>[];

    window.signOutCurrentDevice=async()=>{
      localStorage.removeItem(DEV_AUTO_KEY);
      window.MIJSERENITY_DEV_MODE=false;
      document.getElementById('appView')?.classList.add('hidden');
      document.getElementById('authView')?.classList.remove('hidden');
      document.getElementById('authMsg').textContent='Testomgeving afgesloten.';
    };
    window.signOut=window.signOutCurrentDevice;

    window.addCost=async()=>{
      const amount=Number(String(document.getElementById('costAmount')?.value||'').replace(',','.'));
      if(!Number.isFinite(amount)||amount<=0){alert('Vul een geldig bedrag in.');return}
      const id=document.getElementById('costId')?.value||demoId('dev-cost');
      const item={id,expense_date:document.getElementById('costDate')?.value||isoDate(0),amount,category:document.getElementById('costCategory')?.value||'Overig',description:document.getElementById('costDescription')?.value||'Lokale demo-uitgave'};
      const index=costCache.findIndex(cost=>String(cost.id)===String(id));
      if(index>=0)costCache[index]=item;else costCache.unshift(item);
      cancelCostEdit?.();saveState();renderAll();showAppToast?.('Demo-kosten lokaal opgeslagen ✅');
    };
    window.deleteCost=async id=>{
      if(!confirm('Demo-kosten verwijderen?'))return;
      costCache=costCache.filter(item=>String(item.id)!==String(id));saveState();renderAll();
    };

    window.savePoi=async()=>{
      const name=String(document.getElementById('poiName')?.value||'').trim();
      if(!name){alert('Vul een naam in.');return}
      const id=document.getElementById('poiId')?.value||demoId('dev-poi');
      const item={id,name,place:document.getElementById('poiPlace')?.value||'',address:document.getElementById('poiAddress')?.value||'',review:document.getElementById('poiReview')?.value||'',category:document.getElementById('poiCategory')?.value||'POI',rating:Number(document.getElementById('poiRating')?.value||0),is_favorite:Boolean(document.getElementById('poiFavorite')?.checked),latitude:Number(document.getElementById('poiLatitude')?.value)||null,longitude:Number(document.getElementById('poiLongitude')?.value)||null,created_at:new Date().toISOString()};
      const index=poiCache.findIndex(poi=>String(poi.id)===String(id));
      if(index>=0)poiCache[index]=item;else poiCache.unshift(item);
      clearPoiForm?.();saveState();renderAll();showAppToast?.('Demo-POI lokaal opgeslagen ✅');
    };
    window.deletePoi=async id=>{
      if(!confirm('Demo-POI verwijderen?'))return;
      poiCache=poiCache.filter(item=>String(item.id)!==String(id));delete poiPhotoCache[id];saveState();renderAll();
    };

    window.saveTrip=async()=>{
      const id=document.getElementById('tripId')?.value||demoId('dev-trip');
      const item={id,trip_date:document.getElementById('tripDate')?.value||isoDate(0),title:document.getElementById('tripTitle')?.value||'Demo vaartocht',departure:document.getElementById('tripFrom')?.value||'',arrival:document.getElementById('tripTo')?.value||'',distance_km:Number(document.getElementById('tripDistance')?.value)||null,duration_hours:Number(document.getElementById('tripHours')?.value)||null,crew:document.getElementById('tripCrew')?.value||'Michel, Desi',notes:document.getElementById('tripNotes')?.value||'',fuel_liters:Number(document.getElementById('tripFuelLiters')?.value)||null,fuel_cost:Number(document.getElementById('tripFuelCost')?.value)||null,route_geojson:null};
      const index=tripCache.findIndex(trip=>String(trip.id)===String(id));
      if(index>=0)tripCache[index]=item;else tripCache.unshift(item);
      clearTripForm?.();saveState();renderAll();showAppToast?.('Demo-vaarttocht lokaal opgeslagen ✅');
    };
    window.deleteTrip=async id=>{
      if(!confirm('Demo-log verwijderen?'))return;
      tripCache=tripCache.filter(item=>String(item.id)!==String(id));delete window.tripPhotoCache[id];saveState();renderAll();
    };

    window.saveSettings=async()=>{
      settingsCache={...settingsCache,boat_name:document.getElementById('settingBoatName')?.value||'Serenity DEV',fuel_price:Number(document.getElementById('settingFuelPrice')?.value)||null,fuel_per_hour:Number(document.getElementById('settingFuelPerHour')?.value)||null,tank_capacity:Number(document.getElementById('settingTankCapacity')?.value)||null,dashboard_photo_path:'demo/boat.svg'};
      saveState();renderAll();document.getElementById('settingsMsg').textContent='Demo-instellingen lokaal opgeslagen ✅';document.getElementById('settingsMsg')?.classList.remove('hidden');
    };

    window.ms712SendCommand=async(category,action,target='',extra={})=>{
      const label=[category,action,target].filter(Boolean).join(' · ');
      ms712SetStatus?.(`Demo-opdracht uitgevoerd: ${label} ✅`,'success');
      showAppToast?.(`Home Assistant demo: ${label}`);
      return true;
    };
    window.ms712OpenHomeAssistant=()=>showAppToast?.('Dit opent later je beveiligde Home Assistant-dashboard.');
    window.ms712SaveSettings=async()=>{
      const config=ms712CollectConfig();
      technicalStateCache={...(technicalStateCache||{}),entertainment:config};
      saveState();renderEntertainmentPage();ms712SetStatus('Home Assistant-demo lokaal opgeslagen ✅','success');
    };
  }

  window.openMijnSerenityDevelopmentMode=function(){
    const state=loadState();
    window.MIJSERENITY_DEV_MODE=true;
    try{localStorage.setItem(DEV_AUTO_KEY,'1')}catch{}
    currentUser={id:'dev-user-michel',email:'michel@example.test',user_metadata:{first_name:'Michel'},last_sign_in_at:new Date().toISOString(),email_confirmed_at:new Date().toISOString()};
    currentBoat={id:'dev-serenity',name:'Serenity DEV',created_by:'dev-user-michel'};
    currentRole='owner';
    accountAccess={status:'approved',is_admin:false,setup_missing:false};
    settingsCache=state.settings;
    poiCache=state.pois;
    poiPhotoCache=state.poiPhotos;
    costCache=state.costs;
    costReceiptCache=state.costReceipts;
    tripCache=state.trips;
    window.tripPhotoCache=state.tripPhotos;
    technicalStateCache={entertainment:state.entertainment,updated_at:new Date().toISOString()};
    technicalCloudReady=false;

    document.getElementById('authView')?.classList.add('hidden');
    document.getElementById('approvalView')?.classList.add('hidden');
    document.getElementById('appView')?.classList.remove('hidden');
    installOverrides();installDashboardCard();renderAll();collapseDefaultPanels?.();
    setTimeout(()=>{captainNavigate?.('dashboard');storageSafeObserveImages?.(document);},0);
    showAppToast?.('MijnSerenity DEV geopend — geen Supabase-verkeer ✅');
  };

  window.resetMijnSerenityDevelopmentData=function(){
    if(!confirm('Alle lokale demo-aanpassingen wissen en opnieuw beginnen?'))return;
    localStorage.removeItem(DEV_STATE_KEY);
    localStorage.removeItem(DEV_AUTO_KEY);
    location.reload();
  };

  function prepare(){
    document.documentElement.classList.add('development-build');
    const authMessage=document.getElementById('authMsg');
    if(authMessage)authMessage.textContent='Kies “Testomgeving openen”. Er wordt geen verbinding met Supabase gemaakt.';
    if(localStorage.getItem(DEV_AUTO_KEY)==='1')setTimeout(window.openMijnSerenityDevelopmentMode,150);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',prepare,{once:true});else prepare();
})();
