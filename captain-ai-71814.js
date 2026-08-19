/* MijnSerenity 7.18.14 — Captain AI + slimme logboekanalyse */
(()=>{
  'use strict';
  if(window.__msCaptainAi71814)return;
  window.__msCaptainAi71814=true;

  const ENDPOINT='/.netlify/functions/captain-ai';
  let localFallback=false;
  let controller=null;
  let observer=null;

  const $=id=>document.getElementById(id);
  const num=value=>{
    const parsed=Number(value);
    return Number.isFinite(parsed)?parsed:null;
  };
  const clean=value=>String(value??'').trim();

  function safeArray(value){return Array.isArray(value)?value:[];}

  function trips(){
    try{
      if(typeof tripCache!=='undefined'&&Array.isArray(tripCache))return tripCache;
    }catch{}
    return safeArray(window.tripCache);
  }

  function costs(){
    try{
      if(typeof costCache!=='undefined'&&Array.isArray(costCache))return costCache;
    }catch{}
    return safeArray(window.costCache);
  }

  function technical(){
    try{
      if(typeof technicalStateCache!=='undefined'&&technicalStateCache)return technicalStateCache;
      if(typeof readTechnicalLocalState==='function')return readTechnicalLocalState()||{};
    }catch{}
    return {};
  }

  function live(){
    try{
      if(typeof liveNavState!=='undefined'&&liveNavState)return liveNavState;
    }catch{}
    return window.liveNavState||{};
  }

  function tripSummary(trip){
    if(!trip||typeof trip!=='object')return null;
    return {
      date:trip.trip_date??trip.date??null,
      departure:trip.departure??trip.from??null,
      arrival:trip.arrival??trip.to??null,
      distance_km:num(trip.distance_km??trip.distanceKm),
      duration_hours:num(trip.duration_hours??trip.durationHours),
      average_speed_kmh:num(trip.average_speed_kmh??trip.avg_speed_kmh??trip.averageSpeedKmh),
      max_speed_kmh:num(trip.max_speed_kmh??trip.maxSpeedKmh),
      fuel_liters:num(trip.fuel_liters??trip.fuelLiters??trip.fuel),
      fuel_per_km:num(trip.fuel_per_km??trip.fuelPerKm),
      cost_eur:num(trip.cost_eur??trip.cost??trip.costs),
      gps_points:num(trip.gps_points??trip.gpsPointCount??safeArray(trip.points).length),
      gps_gaps:num(trip.gps_gap_count??trip.gpsGapCount),
      route_has_gps_gaps:Boolean(trip.route_has_gps_gaps??trip.routeHasGpsGaps),
      weather:trip.weather_summary??trip.weather??null,
      notes:clean(trip.notes??trip.note).slice(0,500)||null
    };
  }

  function context(selectedTripText=''){
    const tech=technical();
    const nav=live();
    const weather=nav.weather||{};
    const recentTrips=trips().slice(0,12).map(tripSummary).filter(Boolean);
    const recentCosts=costs().slice(0,20).map(item=>({
      date:item?.date??item?.cost_date??null,
      category:item?.category??item?.type??null,
      description:clean(item?.description??item?.name).slice(0,160)||null,
      amount_eur:num(item?.amount??item?.amount_eur??item?.cost)
    }));

    return {
      app_build:window.MIJSERENITY_BUILD||null,
      boat:{name:'Serenity',type:'Vri-Jon Contessa 37',length_m:11.2},
      current:{
        status:nav.status??null,
        speed_kmh:num(nav.currentSpeedKmh??nav.speedKmh),
        distance_km:num(nav.distanceKm??nav.distance_km),
        rpm:num(nav.rpm??nav.engineRpm),
        depth_m:num(nav.depthM??nav.depth),
        heading_deg:num(nav.heading??nav.course),
        gps_healthy:nav.gpsContinuityHealthy??null,
        gps_gap_count:num(nav.gpsGapCount),
        wind_kmh:num(weather.windSpeed??weather.windKmh),
        wind_direction:weather.windDirection??weather.windDir??null,
        temperature_c:num(weather.temperature??weather.temp),
        condition:weather.condition??weather.summary??null
      },
      technical:{
        house_voltage:num(tech.houseVoltage),
        house_soc:num(tech.houseSoc??tech.soc),
        house_current_a:num(tech.houseCurrent??tech.current),
        start_voltage:num(tech.startVoltage),
        shore_power:tech.shorePower??null,
        solar_w:num(tech.solarPower??tech.pvPower),
        water_pct:num(tech.waterPct),
        fuel_pct:num(tech.fuelPct),
        battery_type:tech.batteryType??null
      },
      recent_trips:recentTrips,
      recent_costs:recentCosts,
      selected_logbook_text:clean(selectedTripText).slice(0,5000)||null
    };
  }

  function setCaptainState(message,state='thinking'){
    const answer=$('ms760CaptainAnswer');
    if(!answer)return null;
    answer.classList.add('has-answer');
    answer.classList.toggle('thinking',state==='thinking');
    answer.dataset.aiState=state;
    answer.textContent=message;
    return answer;
  }

  function fallback(question){
    const form=$('ms760CaptainForm');
    const input=$('ms760CaptainInput');
    if(!form)return false;
    if(input)input.value=question;
    localFallback=true;
    try{
      if(typeof form.requestSubmit==='function')form.requestSubmit();
      else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
      return true;
    }finally{
      localFallback=false;
    }
  }

  async function askAi(question,{selectedTripText='',target=null,fallbackLocal=true}={}){
    const q=clean(question).slice(0,600);
    if(q.length<2)return;

    controller?.abort();
    controller=new AbortController();

    if(target){
      target.classList.add('thinking');
      target.textContent='✨ Captain AI analyseert de boordgegevens…';
    }else{
      setCaptainState('✨ Captain AI analyseert Serenity…','thinking');
    }

    try{
      const response=await fetch(ENDPOINT,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({question:q,context:context(selectedTripText)}),
        signal:controller.signal
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'Captain AI is niet bereikbaar.');
      const answer=clean(data.answer);
      if(!answer)throw new Error('Captain AI gaf geen antwoord.');

      if(target){
        target.textContent=answer;
        target.classList.remove('thinking');
        target.classList.add('ready');
      }else{
        setCaptainState(answer,'ready');
      }
    }catch(error){
      if(error?.name==='AbortError')return;
      console.warn('Captain AI:',error);
      if(!target&&fallbackLocal&&fallback(q))return;
      const message=`AI tijdelijk niet beschikbaar · ${clean(error?.message)||'probeer later opnieuw.'}`;
      if(target){
        target.textContent=message;
        target.classList.remove('thinking');
        target.classList.add('error');
      }else{
        setCaptainState(message,'error');
      }
    }
  }

  function ownText(element){
    if(!(element instanceof Element))return '';
    return [...element.childNodes]
      .filter(node=>node.nodeType===Node.TEXT_NODE)
      .map(node=>node.textContent||'')
      .join(' ')
      .trim();
  }

  function closestTripText(anchor){
    let node=anchor;
    for(let i=0;i<7&&node;i++,node=node.parentElement){
      const value=clean(node.textContent);
      if(value.length>=120&&value.length<=8000&&/(afstand|brandstof|gps|km\/u|vaartocht)/i.test(value))return value;
    }
    return clean(anchor?.parentElement?.textContent).slice(0,5000);
  }

  function addLogbookAi(){
    const logbook=$('logbook');
    if(!logbook)return;

    const elements=[...logbook.querySelectorAll('*')];
    for(const element of elements){
      const label=ownText(element)||clean(element.textContent);
      if(!/CAPTAIN\s+VAARANALYSE/i.test(label)||label.length>120)continue;
      if(element.dataset.msAiEnhanced==='1')continue;
      element.dataset.msAiEnhanced='1';

      const actions=document.createElement('div');
      actions.className='msai-trip-actions';
      const button=document.createElement('button');
      button.type='button';
      button.className='msai-trip-button';
      button.textContent='✨ AI analyse';
      const output=document.createElement('div');
      output.className='msai-trip-answer hidden';
      output.setAttribute('aria-live','polite');
      actions.append(button,output);
      element.insertAdjacentElement('afterend',actions);

      button.addEventListener('click',()=>{
        const tripText=closestTripText(element);
        output.classList.remove('hidden','error','ready');
        askAi(
          'Analyseer deze vaartocht. Benoem wat goed ging, welke waarden onwaarschijnlijk of verdacht zijn, en geef maximaal drie concrete aandachtspunten voor een volgende vaart.',
          {selectedTripText:tripText,target:output,fallbackLocal:false}
        );
      });
    }
  }

  function markGpsSpikes(){
    const logbook=$('logbook');
    if(!logbook)return;
    for(const element of logbook.querySelectorAll('*')){
      if(element.dataset.msGpsSpikeChecked==='1')continue;
      const value=ownText(element);
      if(!value||value.length>100)continue;
      const match=value.match(/Max\.?\s*([0-9]+(?:[.,][0-9]+)?)\s*km\/u/i);
      if(!match)continue;
      element.dataset.msGpsSpikeChecked='1';
      const speed=Number(match[1].replace(',','.'));
      if(!Number.isFinite(speed)||speed<45)continue;
      element.classList.add('msai-gps-spike');
      element.title='Deze maximumsnelheid lijkt onwaarschijnlijk voor Serenity en kan een GPS-piek zijn.';
      if(!element.querySelector('.msai-gps-warning')){
        const warning=document.createElement('small');
        warning.className='msai-gps-warning';
        warning.textContent='⚠️ GPS-piek verdacht';
        element.appendChild(warning);
      }
    }
  }

  function enhanceCaptain(){
    const head=document.querySelector('.ms760-captain-head');
    if(head&&!head.querySelector('.msai-active-badge')){
      const badge=document.createElement('span');
      badge.className='msai-active-badge';
      badge.textContent='✨ AI actief';
      badge.title='Vragen worden met actuele Serenity-gegevens door Captain AI geanalyseerd.';
      head.appendChild(badge);
    }
  }

  function injectStyle(){
    if($('msCaptainAiStyle71814'))return;
    const style=document.createElement('style');
    style.id='msCaptainAiStyle71814';
    style.textContent=`
      .msai-active-badge{margin-left:auto;align-self:flex-start;white-space:nowrap;padding:6px 9px;border-radius:999px;border:1px solid rgba(78,209,255,.32);background:rgba(57,186,255,.1);color:#8fe5ff;font-size:10px;font-weight:800;letter-spacing:.02em}
      .msai-trip-actions{display:grid;gap:8px;margin:10px 0 4px}
      .msai-trip-button{justify-self:start;border:1px solid rgba(78,209,255,.34)!important;border-radius:999px!important;background:rgba(57,186,255,.11)!important;color:#eafaff!important;padding:9px 13px!important;font-weight:800!important;font-size:12px!important}
      .msai-trip-answer{padding:12px 13px;border:1px solid rgba(78,209,255,.22);border-radius:12px;background:rgba(2,17,29,.55);color:#e8f5fb;font-size:13px;line-height:1.5;white-space:pre-wrap}
      .msai-trip-answer.hidden{display:none!important}.msai-trip-answer.thinking{color:#9db9c9}.msai-trip-answer.error{border-color:rgba(255,110,110,.3);color:#ffb7b7}
      .msai-gps-spike{outline:1px solid rgba(243,189,73,.4);border-radius:8px}.msai-gps-warning{display:inline-block!important;margin-left:7px!important;padding:3px 6px!important;border-radius:999px!important;background:rgba(243,189,73,.13)!important;color:#ffd978!important;font-size:9px!important;font-weight:800!important;white-space:nowrap}
      @media(max-width:560px){.msai-active-badge{font-size:9px;padding:5px 7px}.msai-trip-button{width:100%;justify-self:stretch}}
    `;
    document.head.appendChild(style);
  }

  function enhance(){
    injectStyle();
    enhanceCaptain();
    addLogbookAi();
    markGpsSpikes();
  }

  document.addEventListener('submit',event=>{
    if(localFallback)return;
    const form=event.target;
    if(!(form instanceof Element)||form.id!=='ms760CaptainForm')return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const question=$('ms760CaptainInput')?.value||'';
    askAi(question);
  },true);

  document.addEventListener('click',event=>{
    if(localFallback)return;
    const button=event.target instanceof Element?event.target.closest('.ms760-prompt'):null;
    if(!button)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const question=button.dataset.ms760Question||button.textContent||'';
    const input=$('ms760CaptainInput');
    if(input)input.value=question;
    askAi(question);
  },true);

  function boot(){
    enhance();
    observer=new MutationObserver(()=>enhance());
    observer.observe(document.body,{childList:true,subtree:true});
    window.ms71814AskCaptainAI=(question,options)=>askAi(question,options||{});
    console.info('MijnSerenity 7.18.14: Captain AI actief.');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
