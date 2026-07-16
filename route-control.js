
/* ============================================================
   MijnSerenity Cloud 7.1.1 — Route, bereik en waarschuwingen
   ============================================================ */

let ms705ActiveTab='route';

function ms705Key(){
  return `mijnserenity-route-control-${currentBoat?.id||'serenity'}`;
}

function ms705Defaults(){
  return {
    reservePct:15,
    cruiseSpeed:9,
    poiRadius:1,
    fuelWarning:25,
    fuelCritical:15,
    waterWarning:12,
    engineTempWarning:88,
    engineTempCritical:95,
    windWarning:7,
    windCritical:9,
    gpsWarning:35,
    gpsCritical:80,
    houseWarning:12.2,
    houseCritical:11.9,
    startWarning:12.2,
    startCritical:11.9,
    oilCritical:1
  };
}

function ms705Settings(){
  try{
    return {
      ...ms705Defaults(),
      ...JSON.parse(localStorage.getItem(ms705Key())||'{}')
    };
  }catch{
    return ms705Defaults();
  }
}

function ms705SaveLocal(settings){
  try{
    localStorage.setItem(
      ms705Key(),
      JSON.stringify(settings)
    );
  }catch{}
}

function ms705Number(value,digits=1){
  const number=Number(value);
  return Number.isFinite(number)
    ?number.toLocaleString('nl-NL',{
        minimumFractionDigits:0,
        maximumFractionDigits:digits
      })
    :'–';
}

function ms705SetText(id,value){
  const element=document.getElementById(id);
  if(element)element.textContent=value;
}

function ms705SetStatus(id,message,type=''){
  const element=document.getElementById(id);
  if(!element)return;

  element.textContent=message||'';
  element.className=`ms705-status ${type}`;
}

function ms705OpenRouteControl(tab='route'){
  const modal=document.getElementById('ms705RouteControlModal');
  if(!modal)return;

  modal.classList.remove('hidden');
  document.body.classList.add('ms705-modal-open');
  ms705FillAll();
  ms705ShowControlTab(tab);
}

function ms705CloseRouteControl(event,force=false){
  const modal=document.getElementById('ms705RouteControlModal');

  if(event&&!force&&event.target!==modal)return;

  event?.preventDefault?.();
  event?.stopPropagation?.();

  modal?.classList.add('hidden');
  document.body.classList.remove('ms705-modal-open');
}

function ms705ShowControlTab(tab){
  const names=['route','range','warnings'];
  ms705ActiveTab=names.includes(tab)?tab:'route';

  names.forEach(name=>{
    const cap=name[0].toUpperCase()+name.slice(1);

    document.getElementById(`ms705Section${cap}`)
      ?.classList.toggle('hidden',name!==ms705ActiveTab);

    document.getElementById(`ms705Tab${cap}`)
      ?.classList.toggle('active',name===ms705ActiveTab);
  });

  if(ms705ActiveTab==='range'){
    ms705RenderRangePreview();
  }

  if(ms705ActiveTab==='warnings'){
    ms705RenderWarnings();
  }
}

function ms705DestinationOptions(){
  const values=new Set();

  (poiCache||[]).forEach(poi=>{
    [poi.name,poi.place].forEach(value=>{
      const clean=String(value||'').trim();
      if(clean)values.add(clean);
    });
  });

  if(typeof readPlannerDrafts==='function'){
    readPlannerDrafts().forEach(plan=>{
      [
        plan?.title,
        plan?.points?.at(-1)?.label,
        plan?.points?.at(-1)?.place
      ].forEach(value=>{
        const clean=String(value||'').trim();
        if(clean)values.add(clean);
      });
    });
  }

  if(plannerCurrentPlan){
    [
      plannerCurrentPlan.title,
      plannerCurrentPlan.points?.at(-1)?.label,
      plannerCurrentPlan.points?.at(-1)?.place
    ].forEach(value=>{
      const clean=String(value||'').trim();
      if(clean)values.add(clean);
    });
  }

  return [...values].sort((a,b)=>
    a.localeCompare(b,'nl')
  );
}

function ms705FillDestinationList(){
  const list=document.getElementById('ms705DestinationList');
  if(!list)return;

  list.innerHTML=ms705DestinationOptions()
    .map(value=>`<option value="${esc(value)}"></option>`)
    .join('');
}

function ms705NavigationSummary(){
  return typeof ms660NavigationEstimate==='function'
    ?ms660NavigationEstimate()
    :{
        destination:String(document.getElementById('liveTo')?.value||'').trim()||'Nog niet gekozen',
        remainingKm:null,
        mode:'none'
      };
}

function ms705FillRoute(){
  const settings=ms705Settings();
  const navigation=ms705NavigationSummary();
  const destination=String(
    document.getElementById('liveTo')?.value||
    navigation.destination||
    ''
  ).trim();

  ms705FillDestinationList();

  const destinationInput=document.getElementById('ms705Destination');
  const speedInput=document.getElementById('ms705CruiseSpeed');
  const radiusInput=document.getElementById('ms705PoiRadius');

  if(destinationInput)destinationInput.value=
    destination==='Nog niet gekozen'?'':destination;

  if(speedInput) speedInput.value=
    settings.cruiseSpeed||9;

  if(radiusInput) radiusInput.value=
    String(settings.poiRadius||1);

  ms705SetText(
    'ms705CurrentDestination',
    navigation.destination||'Nog niet gekozen'
  );
  ms705SetText(
    'ms705CurrentRemaining',
    Number.isFinite(Number(navigation.remainingKm))
      ?`${ms705Number(navigation.remainingKm,1)} km`
      :'– km'
  );

  const speed=Number(settings.cruiseSpeed||9);
  const hours=Number(navigation.remainingKm)/Math.max(1,speed);
  const eta=Number.isFinite(hours)&&hours>=0
    ?new Date(Date.now()+hours*3600000)
    :null;

  ms705SetText(
    'ms705CurrentEta',
    eta
      ?eta.toLocaleTimeString('nl-NL',{
          hour:'2-digit',
          minute:'2-digit'
        })
      :'–'
  );

  const badge=document.getElementById('ms705RouteBadge');
  if(badge){
    badge.className=`ms705-badge ${
      navigation.mode==='none'?'warning':'good'
    }`;
    badge.textContent=
      navigation.mode==='route'
        ?'Waterwegroute actief'
        :navigation.mode==='direct'
          ?'Directe bestemming'
          :'Geen actieve route';
  }
}

function ms705FillRange(){
  const settings=ms705Settings();
  const state=normaliseTechnicalState(
    technicalStateCache||
    readTechnicalLocalState()
  );

  const values={
    ms705FuelPct:state.fuelPct,
    ms705TankCapacity:
      state.fuelCapacity||
      settingsCache?.tank_capacity,
    ms705FuelPerHour:
      settingsCache?.fuel_per_hour,
    ms705ReservePct:
      settings.reservePct,
    ms705RangeSpeed:
      settings.cruiseSpeed
  };

  Object.entries(values).forEach(([id,value])=>{
    const input=document.getElementById(id);
    if(input&&document.activeElement!==input){
      input.value=
        value===null||
        value===undefined||
        value===''
          ?''
          :String(value);
    }
  });

  [
    'ms705FuelPct',
    'ms705TankCapacity',
    'ms705FuelPerHour',
    'ms705ReservePct',
    'ms705RangeSpeed'
  ].forEach(id=>{
    const input=document.getElementById(id);

    if(input&&input.dataset.ms705LiveCalc!=='true'){
      input.dataset.ms705LiveCalc='true';
      input.addEventListener(
        'input',
        ms705RenderRangePreview
      );
    }
  });

  ms705RenderRangePreview();
}

function ms705RangeValues(){
  return {
    fuelPct:Number(document.getElementById('ms705FuelPct')?.value),
    capacity:Number(document.getElementById('ms705TankCapacity')?.value),
    consumption:Number(document.getElementById('ms705FuelPerHour')?.value),
    reservePct:Number(document.getElementById('ms705ReservePct')?.value),
    speed:Number(document.getElementById('ms705RangeSpeed')?.value)
  };
}

function ms705CalculateRange(values=ms705RangeValues()){
  if(
    !Number.isFinite(values.fuelPct)||
    !Number.isFinite(values.capacity)||
    values.capacity<=0||
    !Number.isFinite(values.consumption)||
    values.consumption<=0||
    !Number.isFinite(values.speed)||
    values.speed<=0||
    !Number.isFinite(values.reservePct)
  ){
    return null;
  }

  const usableLitres=
    values.capacity*
    Math.max(0,values.fuelPct-values.reservePct)/
    100;
  const hours=usableLitres/values.consumption;

  return {
    ...values,
    usableLitres,
    hours,
    km:hours*values.speed
  };
}

function ms705RenderRangePreview(){
  const result=ms705CalculateRange();
  const badge=document.getElementById('ms705RangeBadge');

  ms705SetText(
    'ms705RangeKm',
    result?`${Math.round(result.km)} km`:'– km'
  );
  ms705SetText(
    'ms705RangeHours',
    result?`${ms705Number(result.hours,1)} uur`:'– uur'
  );
  ms705SetText(
    'ms705UsableLitres',
    result?`${ms705Number(result.usableLitres,1)} liter`:'– liter'
  );

  if(badge){
    badge.className=`ms705-badge ${
      !result
        ?'warning'
        :result.fuelPct<=result.reservePct
          ?'critical'
          :result.fuelPct<=result.reservePct+10
            ?'warning'
            :'good'
    }`;
    badge.textContent=
      !result
        ?'Gegevens ontbreken'
        :result.fuelPct<=result.reservePct
          ?'Reserve bereikt'
          :`${Math.round(result.km)} km`;
  }
}

function ms705FillWarnings(){
  const settings=ms705Settings();
  const map={
    ms705FuelWarn:'fuelWarning',
    ms705FuelCritical:'fuelCritical',
    ms705WaterWarn:'waterWarning',
    ms705TempWarn:'engineTempWarning',
    ms705TempCritical:'engineTempCritical',
    ms705WindWarn:'windWarning',
    ms705WindCritical:'windCritical',
    ms705GpsWarn:'gpsWarning',
    ms705GpsCritical:'gpsCritical',
    ms705HouseWarn:'houseWarning',
    ms705HouseCritical:'houseCritical',
    ms705OilCritical:'oilCritical'
  };

  Object.entries(map).forEach(([id,key])=>{
    const input=document.getElementById(id);
    if(input)input.value=String(settings[key]);
  });

  ms705RenderWarnings();
}

function ms705FillAll(){
  ms705FillRoute();
  ms705FillRange();
  ms705FillWarnings();
}

async function ms705SaveRouteSettings(){
  const destination=String(
    document.getElementById('ms705Destination')?.value||''
  ).trim();
  const speed=Number(
    document.getElementById('ms705CruiseSpeed')?.value
  );
  const radius=Number(
    document.getElementById('ms705PoiRadius')?.value
  );

  if(!destination){
    ms705SetStatus(
      'ms705RouteStatus',
      'Vul eerst een bestemming in.',
      'warning'
    );
    return;
  }

  if(!Number.isFinite(speed)||speed<1||speed>30){
    ms705SetStatus(
      'ms705RouteStatus',
      'Vul een geldige gemiddelde snelheid tussen 1 en 30 km/u in.',
      'warning'
    );
    return;
  }

  const settings={
    ...ms705Settings(),
    cruiseSpeed:speed,
    poiRadius:Number.isFinite(radius)?radius:1
  };
  ms705SaveLocal(settings);

  const liveTo=document.getElementById('liveTo');
  if(liveTo)liveTo.value=destination;

  const plannerSpeed=document.getElementById('plannerSpeed');
  if(plannerSpeed)plannerSpeed.value=String(speed);

  const plannerPoiRadius=document.getElementById('plannerPoiRadius');
  if(plannerPoiRadius)plannerPoiRadius.value=String(settings.poiRadius);

  if(typeof updateLiveRouteTitle==='function'){
    updateLiveRouteTitle();
  }

  if(typeof plannerFormChanged==='function'){
    plannerFormChanged();
  }

  if(typeof ms660RenderCommandCenter==='function'){
    ms660RenderCommandCenter();
  }

  ms705FillRoute();
  ms705SetStatus(
    'ms705RouteStatus',
    `${destination} is ingesteld als bestemming. Gebruik de volledige reisplanner om een nieuwe waterwegroute te berekenen.`,
    'success'
  );
  showAppToast('Bestemming en vaarsnelheid opgeslagen ✅');
}

function ms705OpenFullPlanner(){
  ms705CloseRouteControl(null,true);
  captainNavigate('planner');

  setTimeout(()=>{
    document.getElementById('plannerTo')
      ?.scrollIntoView({
        behavior:'smooth',
        block:'center'
      });
  },250);
}

function ms705ClearDestination(){
  const liveTo=document.getElementById('liveTo');
  const own=document.getElementById('ms705Destination');

  if(liveTo)liveTo.value='';
  if(own)own.value='';

  if(typeof updateLiveRouteTitle==='function'){
    updateLiveRouteTitle();
  }
  if(typeof ms660RenderCommandCenter==='function'){
    ms660RenderCommandCenter();
  }

  ms705FillRoute();
  ms705SetStatus(
    'ms705RouteStatus',
    'Bestemming is gewist.',
    'success'
  );
}

async function ms705SaveRangeSettings(){
  if(!currentBoat||!currentUser){
    alert('Log opnieuw in.');
    return;
  }

  const result=ms705CalculateRange();

  if(!result){
    ms705SetStatus(
      'ms705RangeStatus',
      'Controleer tankstand, tankinhoud, verbruik, reserve en snelheid.',
      'warning'
    );
    return;
  }

  if(result.fuelPct<0||result.fuelPct>100){
    ms705SetStatus(
      'ms705RangeStatus',
      'Tankstand moet tussen 0 en 100% liggen.',
      'warning'
    );
    return;
  }

  if(result.reservePct<0||result.reservePct>50){
    ms705SetStatus(
      'ms705RangeStatus',
      'Reserve moet tussen 0 en 50% liggen.',
      'warning'
    );
    return;
  }

  const local={
    ...ms705Settings(),
    reservePct:result.reservePct,
    cruiseSpeed:result.speed
  };
  ms705SaveLocal(local);

  technicalStateCache=normaliseTechnicalState({
    ...(
      technicalStateCache||
      readTechnicalLocalState()
    ),
    fuelPct:result.fuelPct,
    fuelCapacity:result.capacity,
    lastSnapshotAt:new Date().toISOString()
  });

  await persistTechnicalState(
    'Tankstand en tankinhoud opgeslagen.'
  );

  const row={
    boat_id:currentBoat.id,
    boat_name:
      settingsCache?.boat_name||
      currentBoat.name||
      'Serenity',
    fuel_price:
      settingsCache?.fuel_price??null,
    fuel_per_hour:result.consumption,
    tank_capacity:result.capacity,
    dashboard_photo_path:
      settingsCache?.dashboard_photo_path??null,
    updated_at:new Date().toISOString()
  };

  const {error}=await sb.from('boat_settings')
    .upsert(row,{onConflict:'boat_id'});

  if(error){
    ms705SetStatus(
      'ms705RangeStatus',
      `Technische waarden zijn lokaal opgeslagen, maar bootinstellingen niet: ${error.message}`,
      'warning'
    );
    return;
  }

  settingsCache={
    ...(settingsCache||{}),
    ...row
  };

  const plannerSpeed=document.getElementById('plannerSpeed');
  if(plannerSpeed)plannerSpeed.value=String(result.speed);

  if(typeof loadSettingsForm==='function'){
    loadSettingsForm();
  }
  if(typeof renderTechnicalDashboard==='function'){
    renderTechnicalDashboard();
  }
  if(typeof ms660RenderCommandCenter==='function'){
    ms660RenderCommandCenter();
  }
  if(typeof renderCaptainCommandCenter==='function'){
    renderCaptainCommandCenter();
  }

  ms705RenderRangePreview();
  ms705SetStatus(
    'ms705RangeStatus',
    `Bereik opgeslagen: ongeveer ${Math.round(result.km)} km met ${result.reservePct}% reserve.`,
    'success'
  );
  showAppToast('Brandstofbereik bijgewerkt ✅');
}

function ms705OpenTechnicalTanks(){
  ms705CloseRouteControl(null,true);
  captainNavigate('technical');

  setTimeout(()=>{
    openTechnicalSnapshotForm('tanks');
  },250);
}

function ms705ReadWarningForm(){
  return {
    ...ms705Settings(),
    fuelWarning:Number(document.getElementById('ms705FuelWarn')?.value),
    fuelCritical:Number(document.getElementById('ms705FuelCritical')?.value),
    waterWarning:Number(document.getElementById('ms705WaterWarn')?.value),
    engineTempWarning:Number(document.getElementById('ms705TempWarn')?.value),
    engineTempCritical:Number(document.getElementById('ms705TempCritical')?.value),
    windWarning:Number(document.getElementById('ms705WindWarn')?.value),
    windCritical:Number(document.getElementById('ms705WindCritical')?.value),
    gpsWarning:Number(document.getElementById('ms705GpsWarn')?.value),
    gpsCritical:Number(document.getElementById('ms705GpsCritical')?.value),
    houseWarning:Number(document.getElementById('ms705HouseWarn')?.value),
    houseCritical:Number(document.getElementById('ms705HouseCritical')?.value),
    oilCritical:Number(document.getElementById('ms705OilCritical')?.value)
  };
}

function ms705ValidateWarningSettings(settings){
  const numeric=[
    'fuelWarning','fuelCritical','waterWarning',
    'engineTempWarning','engineTempCritical',
    'windWarning','windCritical',
    'gpsWarning','gpsCritical',
    'houseWarning','houseCritical','oilCritical'
  ];

  if(numeric.some(key=>!Number.isFinite(settings[key]))){
    return 'Vul bij alle grenswaarden een geldig getal in.';
  }

  if(settings.fuelCritical>=settings.fuelWarning){
    return 'De kritieke dieselgrens moet lager zijn dan de waarschuwinggrens.';
  }

  if(settings.engineTempCritical<=settings.engineTempWarning){
    return 'De kritieke motortemperatuur moet hoger zijn dan de waarschuwinggrens.';
  }

  if(settings.windCritical<=settings.windWarning){
    return 'De kritieke windgrens moet hoger zijn dan de waarschuwinggrens.';
  }

  if(settings.gpsCritical<=settings.gpsWarning){
    return 'De kritieke GPS-afwijking moet hoger zijn dan de waarschuwinggrens.';
  }

  if(settings.houseCritical>=settings.houseWarning){
    return 'De kritieke accuspanning moet lager zijn dan de waarschuwinggrens.';
  }

  return '';
}

function ms705SaveWarningSettings(){
  const settings=ms705ReadWarningForm();
  const error=ms705ValidateWarningSettings(settings);

  if(error){
    ms705SetStatus(
      'ms705WarningStatus',
      error,
      'warning'
    );
    return;
  }

  ms705SaveLocal(settings);

  if(typeof ms660RenderCommandCenter==='function'){
    ms660RenderCommandCenter();
  }

  ms705RenderWarnings();
  ms705SetStatus(
    'ms705WarningStatus',
    'Waarschuwinggrenzen zijn opgeslagen en direct actief.',
    'success'
  );
  showAppToast('Waarschuwinggrenzen bijgewerkt ✅');
}

function ms705ResetWarningSettings(){
  const current=ms705Settings();
  const defaults=ms705Defaults();

  ms705SaveLocal({
    ...current,
    fuelWarning:defaults.fuelWarning,
    fuelCritical:defaults.fuelCritical,
    waterWarning:defaults.waterWarning,
    engineTempWarning:defaults.engineTempWarning,
    engineTempCritical:defaults.engineTempCritical,
    windWarning:defaults.windWarning,
    windCritical:defaults.windCritical,
    gpsWarning:defaults.gpsWarning,
    gpsCritical:defaults.gpsCritical,
    houseWarning:defaults.houseWarning,
    houseCritical:defaults.houseCritical,
    oilCritical:defaults.oilCritical
  });

  ms705FillWarnings();

  if(typeof ms660RenderCommandCenter==='function'){
    ms660RenderCommandCenter();
  }

  ms705SetStatus(
    'ms705WarningStatus',
    'De standaardgrenzen zijn hersteld.',
    'success'
  );
}

function ms705OpenTechnicalSnapshot(){
  ms705CloseRouteControl(null,true);
  captainNavigate('technical');

  setTimeout(()=>{
    openTechnicalSnapshotForm();
  },250);
}

function ms705RenderWarnings(){
  const container=document.getElementById('ms705ActiveWarnings');
  const badge=document.getElementById('ms705WarningBadge');

  if(!container)return;

  const alerts=typeof ms660Alerts==='function'
    ?ms660Alerts()
    :[];

  if(!alerts.length){
    container.innerHTML=`
      <button type="button" class="ms705-warning-item good"
        onclick="ms705OpenTechnicalSnapshot()">
        <span>✓</span>
        <div>
          <strong>Geen actieve waarschuwingen</strong>
          <small>Alle bekende waarden vallen binnen de ingestelde grenzen.</small>
        </div>
        <b>›</b>
      </button>
    `;
  }else{
    container.innerHTML=alerts.map(alert=>`
      <button type="button"
        class="ms705-warning-item ${alert.level}"
        onclick="ms705OpenTechnicalSnapshot()">
        <span>${alert.level==='critical'?'!':'⚠'}</span>
        <div>
          <strong>${esc(alert.title)}</strong>
          <small>${esc(alert.text)}</small>
        </div>
        <b>›</b>
      </button>
    `).join('');
  }

  if(badge){
    const critical=alerts.filter(item=>item.level==='critical').length;
    const warnings=alerts.filter(item=>item.level==='warning').length;

    badge.className=`ms705-badge ${
      critical?'critical':warnings?'warning':'good'
    }`;
    badge.textContent=
      critical
        ?`${critical} kritisch`
        :warnings
          ?`${warnings} waarschuwing${warnings===1?'':'en'}`
          :'Alles rustig';
  }
}

/* ------------------------------------------------------------
   Bestaande berekening en waarschuwingen uitbreiden met instellingen
   ------------------------------------------------------------ */

const ms705OriginalCruiseSpeed=ms660CruiseSpeed;

ms660CruiseSpeed=function(){
  const current=Number(liveNavState?.speedKmh);
  const average=typeof liveAverageSpeed==='function'
    ?Number(liveAverageSpeed())
    :0;
  const plan=ms660NavigationPlan?.();
  const planned=Number(plan?.speed);
  const configured=Number(ms705Settings().cruiseSpeed);

  if(current>=1.5)return current;
  if(average>=1.5)return average;
  if(planned>=1)return planned;
  if(configured>=1)return configured;

  return ms705OriginalCruiseSpeed();
};

ms660FuelRange=function(state){
  const settings=ms705Settings();
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
  const reservePct=Number(settings.reservePct);

  if(
    !Number.isFinite(fuelPct)||
    !Number.isFinite(capacity)||
    capacity<=0||
    !Number.isFinite(consumption)||
    consumption<=0||
    !Number.isFinite(speed)||
    speed<=0||
    !Number.isFinite(reservePct)
  ){
    return null;
  }

  const usableLiters=
    capacity*
    Math.max(0,fuelPct-reservePct)/
    100;
  const hours=usableLiters/consumption;

  return {
    km:hours*speed,
    hours,
    liters:usableLiters,
    reservePct,
    speed,
    consumption
  };
};

ms660Alerts=function(){
  const thresholds=ms705Settings();
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
    add('critical','Bilge-alarm actief',
      'Controleer direct of er water binnenkomt.');
  }else if(state.bilge==='active'){
    add('warning','Bilgepomp draait',
      'Controleer of dit verwacht gedrag is.');
  }

  if(Number.isFinite(temp)&&temp>=thresholds.engineTempCritical){
    add('critical','Motortemperatuur hoog',
      `${ms660Number(temp,1)} °C · verminder belasting en controleer koeling.`);
  }else if(Number.isFinite(temp)&&temp>=thresholds.engineTempWarning){
    add('warning','Motor wordt warm',
      `${ms660Number(temp,1)} °C · houd de temperatuur in de gaten.`);
  }

  if(
    Number(liveNavState.engineRpm)>=700&&
    Number.isFinite(pressure)&&
    pressure>0&&
    pressure<thresholds.oilCritical
  ){
    add('critical','Oliedruk te laag',
      `${ms660Number(pressure,1)} bar bij draaiende motor.`);
  }

  if(Number.isFinite(house)&&house>0&&house<thresholds.houseCritical){
    add('critical','Huishoudaccu kritiek laag',
      `${ms660Number(house,2)} V`);
  }else if(Number.isFinite(house)&&house>0&&house<thresholds.houseWarning){
    add('warning','Huishoudaccu laag',
      `${ms660Number(house,2)} V`);
  }

  if(Number.isFinite(start)&&start>0&&start<thresholds.startCritical){
    add('critical','Startaccu kritiek laag',
      `${ms660Number(start,2)} V`);
  }else if(Number.isFinite(start)&&start>0&&start<thresholds.startWarning){
    add('warning','Startaccu laag',
      `${ms660Number(start,2)} V`);
  }

  if(Number.isFinite(fuel)&&fuel<=thresholds.fuelCritical){
    add('critical','Brandstofreserve bereikt',
      `${Math.round(fuel)}% resterend`);
  }else if(Number.isFinite(fuel)&&fuel<=thresholds.fuelWarning){
    add('warning','Brandstof wordt laag',
      `${Math.round(fuel)}% resterend`);
  }

  if(Number.isFinite(water)&&water<=thresholds.waterWarning){
    add('warning','Drinkwater bijna leeg',
      `${Math.round(water)}% resterend`);
  }

  if(Number.isFinite(accuracy)&&accuracy>thresholds.gpsCritical){
    add('critical','GPS-signaal zeer zwak',
      `Nauwkeurigheid ongeveer ${Math.round(accuracy)} meter`);
  }else if(Number.isFinite(accuracy)&&accuracy>thresholds.gpsWarning){
    add('warning','GPS-signaal minder nauwkeurig',
      `Nauwkeurigheid ongeveer ${Math.round(accuracy)} meter`);
  }

  if(Number.isFinite(gustBft)&&gustBft>=thresholds.windCritical){
    add('critical','Zware windstoten',
      `${gustBft} Bft · beoordeel of doorvaren verstandig is.`);
  }else if(Number.isFinite(gustBft)&&gustBft>=thresholds.windWarning){
    add('warning','Stevige windstoten',
      `${gustBft} Bft · extra aandacht bij manoeuvreren.`);
  }

  if(!navigator.onLine){
    add('warning','Offline modus',
      'GPS-opname blijft lokaal werken en synchroniseert later.');
  }

  const order={critical:3,warning:2,info:1};

  return alerts.sort((a,b)=>
    order[b.level]-order[a.level]
  );
};

/* Ook dashboardbereik gebruikt dezelfde reserve. */
ms690FuelRangeEstimate=function(){
  const state=ms690TechnicalSnapshot();
  const settings=ms705Settings();
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
      return distance>0&&hours>0
        ?distance/hours
        :null;
    })
    .filter(Number.isFinite);

  const speed=
    ms690Median(historicSpeeds)||
    Number(settings.cruiseSpeed)||
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

  const reservePct=Number(settings.reservePct);
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
};

document.addEventListener('keydown',event=>{
  if(
    event.key==='Escape'&&
    !document.getElementById('ms705RouteControlModal')
      ?.classList.contains('hidden')
  ){
    ms705CloseRouteControl(event,true);
  }
});

document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>{
    if(typeof ms660RenderCommandCenter==='function'){
      ms660RenderCommandCenter();
    }
  },1000);
});
