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
    if(!finite(level))return {state:'warning',emoji:'🥤',title:'Drinkwater',text:'Nog geen tankstand',joke:'Zonder slokje data blijft dit poppetje in onzekerheid.'};
    const value=Math.max(0,Math.min(100,Number(level)));
    if(value>=80)return {state:'good',emoji:'💧',title:'Drinkwater',text:'Watervoorraad top',joke:'Douchen, koffie en afwassen? Dit poppetje juicht alvast.'};
    if(value>=55)return {state:'good',emoji:'🚰',title:'Drinkwater',text:'Netjes op peil',joke:'Nog geen dorstdrama in zicht.'};
    if(value>=30)return {state:'warning',emoji:'🥤',title:'Drinkwater',text:'Rustig aan met sproeien',joke:'Het poppetje telt stiekem al de kopjes koffie.'};
    if(value>=15)return {state:'critical',emoji:'🥵',title:'Drinkwater',text:'Dorstalarm nadert',joke:'Hij kijkt alsof iemand het laatste flesje al heeft gepakt.'};
    return {state:'critical',emoji:'🏜️',title:'Drinkwater',text:'Bijna kurkdroog',joke:'Nog even en hij vraagt om regenwater met een rietje.'};
  }

  function wasteMood(level){
    if(!finite(level))return {state:'warning',emoji:'😬',title:'Vuilwater',text:'Nog geen tankstand',joke:'Zonder meting blijft het een geurige gok.'};
    const value=Math.max(0,Math.min(100,Number(level)));
    if(value<=15)return {state:'good',emoji:'🚽',title:'Vuilwater',text:'Lekker leeg',joke:'Frisse neus, brede glimlach.'};
    if(value<=49)return {state:'good',emoji:'🙂',title:'Vuilwater',text:'Ruimte zat',joke:'Nog sociaal verantwoord in de machinekamer.'};
    if(value<=74)return {state:'warning',emoji:'😬',title:'Vuilwater',text:'Begint te pruttelen',joke:'Het poppetje houdt zijn adem al iets langer in.'};
    if(value<=89)return {state:'critical',emoji:'🤢',title:'Vuilwater',text:'Tijd om te legen',joke:'De eerste denkbeeldige dampwolken melden zich.'};
    return {state:'critical',emoji:'💨',title:'Vuilwater',text:'Stinkalarm',joke:'Volle bak — dit poppetje vergast bijna de hele boot.'};
  }

  function batteryMood(voltage,label='Accu'){
    if(!finite(voltage))return {state:'warning',emoji:'🔋',title:label,text:'Nog geen spanning',joke:'Gids: nog geen meting.'};
    const v=Number(voltage);
    if(v>=12.45)return {state:'good',emoji:'🔋',title:label,text:'Lekker vol',joke:'Gids: accu is goed.'};
    if(v>=12.15)return {state:'warning',emoji:'🔋',title:label,text:'Kan een laadje gebruiken',joke:'Gids: laden is handig.'};
    return {state:'critical',emoji:'🪫',title:label,text:'Laag in spanning',joke:'Gids: accu is laag.'};
  }

  function fuelMood(level){
    if(!finite(level))return {state:'warning',emoji:'⛽',title:'Dieseltank',text:'Nog geen tankstand',joke:'Gids: tankstand ontbreekt.'};
    const value=Math.max(0,Math.min(100,Number(level)));
    if(value>=55)return {state:'good',emoji:'⛽',title:'Dieseltank',text:'Mooie voorraad',joke:'Gids: genoeg voorraad.'};
    if(value>=25)return {state:'warning',emoji:'⛽',title:'Dieseltank',text:'Denk aan bijtanken',joke:'Gids: denk aan bijtanken.'};
    return {state:'critical',emoji:'⛽',title:'Dieseltank',text:'Bijna op reservegevoel',joke:'Gids: bijna tijd om te tanken.'};
  }

  function engineMood(){
    const service=text('techEngineService').toLowerCase();
    if(!service || service.includes('nog geen'))return {state:'warning',emoji:'⚙️',title:'Motor',text:'Onderhoud nog onbekend',joke:'Gids: gegevens aanvullen.'};
    if(service.includes('over')||service.includes('beurt')||service.includes('binnenkort'))return {state:'warning',emoji:'⚙️',title:'Motor',text:'Onderhoud in beeld',joke:'Gids: onderhoud komt eraan.'};
    return {state:'good',emoji:'⚙️',title:'Motor',text:'Loopt tevreden',joke:'Gids: motorstatus is prima.'};
  }

  function solarMood(){
    const power=numFromText('techSolarPower');
    const shore=text('techShorePowerStatus').toLowerCase();
    if(finite(power) && power>20)return {state:'good',emoji:'☀️',title:'Zonnepaneel',text:'Lekker aan het laden',joke:'Gids: laden actief.'};
    if(shore.includes('walstroom'))return {state:'good',emoji:'🌤️',title:'Zonnepaneel',text:'Mag even uitrusten',joke:'Gids: walstroom helpt mee.'};
    return {state:'warning',emoji:'🌤️',title:'Zonnepaneel',text:'Even rustig',joke:'Gids: weinig zonopbrengst.'};
  }

  function systemMood(){
    const heater=text('techHeaterStatus').toLowerCase();
    const bilge=text('techBilgeStatus').toLowerCase();
    if(heater.includes('storing') || bilge.includes('alarm') || bilge.includes('actief')){
      return {state:'critical',emoji:'🚨',title:'Systemen',text:'Aandacht nodig',joke:'Gids: storing vraagt aandacht.'};
    }
    if(heater.includes('onbekend') || bilge.includes('onbekend') || heater.includes('onderhoud')){
      return {state:'warning',emoji:'🛠️',title:'Systemen',text:'Even controleren',joke:'Gids: even controleren.'};
    }
    return {state:'good',emoji:'🔥',title:'Systemen',text:'Alles in orde',joke:'Gids: systemen zijn in orde.'};
  }

  function cardFor(id){ return $(id)?.closest('.technical-gauge') || null; }

  function ensure(host,id){
    if(!host)return null;
    let el=$(id);
    if(el)return el;
    el=document.createElement('div');
    el.id=id;
    el.className='technical-cartoon';
    el.innerHTML='<div class="technical-cartoon-art" aria-hidden="true"></div><div class="technical-cartoon-copy"><span class="technical-cartoon-title"></span><strong class="technical-cartoon-text"></strong><span class="technical-cartoon-joke"></span></div>';
    host.appendChild(el);
    return el;
  }

  function paint(el,mood){
    if(!el||!mood)return;
    el.classList.remove('good','warning','critical');
    el.classList.add(mood.state);
    const art=el.querySelector('.technical-cartoon-art');
    const title=el.querySelector('.technical-cartoon-title');
    const textEl=el.querySelector('.technical-cartoon-text');
    const joke=el.querySelector('.technical-cartoon-joke');
    if(art){ art.textContent=mood.emoji || '🙂'; art.setAttribute('aria-label', `${mood.title} symbool`); }
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
