(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const finite=value=>Number.isFinite(Number(value));
  const numFromText=id=>{
    const raw=String($(id)?.textContent||'').replace(',', '.');
    const match=raw.match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  };
  const text=id=>String($(id)?.textContent||'').trim();

  function waterMood(level){
    if(!finite(level))return {state:'warning',asset:'tank-water-mid.svg',title:'Drinkwater',text:'Nog geen tankstand',joke:'Zonder slokje data blijft dit poppetje in onzekerheid.'};
    const value=Math.max(0,Math.min(100,Number(level)));
    if(value>=80)return {state:'good',asset:'tank-water-full.svg',title:'Drinkwater',text:'Watervoorraad top',joke:'Douchen, koffie en afwassen? Dit poppetje juicht alvast.'};
    if(value>=55)return {state:'good',asset:'tank-water-good.svg',title:'Drinkwater',text:'Netjes op peil',joke:'Nog geen dorstdrama in zicht.'};
    if(value>=30)return {state:'warning',asset:'tank-water-mid.svg',title:'Drinkwater',text:'Rustig aan met sproeien',joke:'Het poppetje telt stiekem al de kopjes koffie.'};
    if(value>=15)return {state:'critical',asset:'tank-water-low.svg',title:'Drinkwater',text:'Dorstalarm nadert',joke:'Hij kijkt alsof iemand het laatste flesje al heeft gepakt.'};
    return {state:'critical',asset:'tank-water-empty.svg',title:'Drinkwater',text:'Bijna kurkdroog',joke:'Nog even en hij vraagt om regenwater met een rietje.'};
  }

  function wasteMood(level){
    if(!finite(level))return {state:'warning',asset:'tank-waste-mid.svg',title:'Vuilwater',text:'Nog geen tankstand',joke:'Zonder meting blijft het een geurige gok.'};
    const value=Math.max(0,Math.min(100,Number(level)));
    if(value<=15)return {state:'good',asset:'tank-waste-empty.svg',title:'Vuilwater',text:'Lekker leeg',joke:'Frisse neus, brede glimlach.'};
    if(value<=49)return {state:'good',asset:'tank-waste-good.svg',title:'Vuilwater',text:'Ruimte zat',joke:'Nog sociaal verantwoord in de machinekamer.'};
    if(value<=74)return {state:'warning',asset:'tank-waste-mid.svg',title:'Vuilwater',text:'Begint te pruttelen',joke:'Het poppetje houdt zijn adem al iets langer in.'};
    if(value<=89)return {state:'critical',asset:'tank-waste-high.svg',title:'Vuilwater',text:'Tijd om te legen',joke:'De eerste denkbeeldige dampwolken melden zich.'};
    return {state:'critical',asset:'tank-waste-full.svg',title:'Vuilwater',text:'Stinkalarm',joke:'Volle bak — dit poppetje vergast bijna de hele boot.'};
  }

  function batteryMood(voltage,label='Accu'){
    if(!finite(voltage))return {state:'warning',asset:'tech-battery-warn.svg',title:label,text:'Nog geen spanning',joke:'Zelfs een accu wil af en toe een glamourshot met spanning.'};
    const v=Number(voltage);
    if(v>=12.45)return {state:'good',asset:'tech-battery-good.svg',title:label,text:'Lekker vol',joke:'Dit batterijtje bruist van de energie.'};
    if(v>=12.15)return {state:'warning',asset:'tech-battery-warn.svg',title:label,text:'Kan een laadje gebruiken',joke:'Hij hoopt subtiel op zon of walstroom.'};
    return {state:'critical',asset:'tech-battery-crit.svg',title:label,text:'Laag in spanning',joke:'Deze accu kijkt alsof hij nog maar 1% batterij heeft.'};
  }

  function fuelMood(level){
    if(!finite(level))return {state:'warning',asset:'tech-fuel-warn.svg',title:'Dieseltank',text:'Nog geen tankstand',joke:'Deze tank houdt zijn lippen stijf op elkaar over de liters.'};
    const value=Math.max(0,Math.min(100,Number(level)));
    if(value>=55)return {state:'good',asset:'tech-fuel-good.svg',title:'Dieseltank',text:'Mooie voorraad',joke:'Deze tank kan nog wel even vooruit brommen.'};
    if(value>=25)return {state:'warning',asset:'tech-fuel-warn.svg',title:'Dieseltank',text:'Denk aan bijtanken',joke:'Niet direct stress, wel alvast een station in de gaten houden.'};
    return {state:'critical',asset:'tech-fuel-crit.svg',title:'Dieseltank',text:'Bijna op reservegevoel',joke:'Het tankpoppetje wordt ineens heel zuinig.'};
  }

  function engineMood(){
    const service=text('techEngineService').toLowerCase();
    if(!service || service.includes('nog geen'))return {state:'warning',asset:'tech-engine-warn.svg',title:'Motor',text:'Onderhoud nog onbekend',joke:'De monteur poseert al, maar de checklist wil nog in beeld.'};
    if(service.includes('over')||service.includes('beurt')||service.includes('binnenkort'))return {state:'warning',asset:'tech-engine-warn.svg',title:'Motor',text:'Onderhoud in beeld',joke:'De motor mompelt: even een liefdevolle beurt graag.'};
    return {state:'good',asset:'tech-engine-good.svg',title:'Motor',text:'Loopt tevreden',joke:'Alles snort alsof de motor zelf ook vakantie heeft.'};
  }

  function solarMood(){
    const power=numFromText('techSolarPower');
    const shore=text('techShorePowerStatus').toLowerCase();
    if(finite(power) && power>20)return {state:'good',asset:'tech-solar-good.svg',title:'Zonnepaneel',text:'Lekker aan het laden',joke:'De zon doet vrolijk mee aan boord.'};
    if(shore.includes('walstroom'))return {state:'good',asset:'tech-solar-idle.svg',title:'Zonnepaneel',text:'Mag even uitrusten',joke:'Walstroom heeft de dienst nu even overgenomen.'};
    return {state:'warning',asset:'tech-solar-idle.svg',title:'Zonnepaneel',text:'Even rustig',joke:'De zon is even backstage voor een korte koffiepauze.'};
  }

  function systemMood(){
    const heater=text('techHeaterStatus').toLowerCase();
    const bilge=text('techBilgeStatus').toLowerCase();
    if(heater.includes('storing') || bilge.includes('alarm') || bilge.includes('actief')){
      return {state:'critical',asset:'tech-system-crit.svg',title:'Systemen',text:'Aandacht nodig',joke:'Dit poppetje heeft de hulplijn al bijna op speed dial.'};
    }
    if(heater.includes('onbekend') || bilge.includes('onbekend') || heater.includes('onderhoud')){
      return {state:'warning',asset:'tech-system-warn.svg',title:'Systemen',text:'Even controleren',joke:'Hij knijpt één oog dicht totdat alles gecheckt is.'};
    }
    return {state:'good',asset:'tech-system-good.svg',title:'Systemen',text:'Alles in orde',joke:'Verwarming en bilge gedragen zich voorbeeldig.'};
  }

  function cardFor(id){ return $(id)?.closest('.technical-gauge') || null; }

  function ensure(host,id){
    if(!host)return null;
    let el=$(id);
    if(el)return el;
    el=document.createElement('div');
    el.id=id;
    el.className='technical-cartoon';
    el.innerHTML='<div class="technical-cartoon-art"><img alt="Techniek illustratie"></div><div class="technical-cartoon-copy"><span class="technical-cartoon-title"></span><strong class="technical-cartoon-text"></strong><span class="technical-cartoon-joke"></span></div>';
    host.appendChild(el);
    return el;
  }

  function paint(el,mood){
    if(!el||!mood)return;
    el.classList.remove('good','warning','critical');
    el.classList.add(mood.state);
    const img=el.querySelector('img');
    const title=el.querySelector('.technical-cartoon-title');
    const textEl=el.querySelector('.technical-cartoon-text');
    const joke=el.querySelector('.technical-cartoon-joke');
    if(img){ img.src=mood.asset; img.alt=`${mood.title} cartoon`; }
    if(title) title.textContent=mood.title;
    if(textEl) textEl.textContent=mood.text;
    if(joke) joke.textContent=mood.joke;
  }

  function updateAll(){
    paint(ensure(cardFor('techEngineHours'),'techCartoonEngine'), engineMood());
    paint(ensure(cardFor('techHouseVoltage'),'techCartoonHouse'), batteryMood(numFromText('techHouseVoltage'),'Huishoudaccu'));
    paint(ensure(cardFor('techStartVoltage'),'techCartoonStart'), batteryMood(numFromText('techStartVoltage'),'Startaccu'));
    paint(ensure(cardFor('techFuelLevel'),'techCartoonFuel'), fuelMood(numFromText('techFuelLevel')));
    paint(ensure(cardFor('techWaterLevel'),'techCartoonWater'), waterMood(numFromText('techWaterLevel')));
    paint(ensure(cardFor('techWasteLevel'),'techCartoonWaste'), wasteMood(numFromText('techWasteLevel')));
    paint(ensure(cardFor('techSolarPower'),'techCartoonSolar'), solarMood());
    paint(ensure(cardFor('techHeaterStatus'),'techCartoonSystem'), systemMood());
  }

  function install(){
    updateAll();
    setTimeout(updateAll,800);
    setInterval(updateAll,3000);
    if(typeof window.renderTechnicalDashboard==='function'){
      const original=window.renderTechnicalDashboard;
      window.renderTechnicalDashboard=function(...args){
        const result=original.apply(this,args);
        setTimeout(updateAll,0);
        return result;
      };
    }
    window.addEventListener('mijnserenity-ha-state-updated', updateAll);
    document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') setTimeout(updateAll,150); });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();
