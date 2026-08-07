(()=>{
  'use strict';

  const $=id=>document.getElementById(id);
  const clamp=value=>Math.max(0,Math.min(100,Number(value)||0));
  const finite=value=>Number.isFinite(Number(value));

  function waterMood(level){
    if(!finite(level))return {state:'warning',asset:'tank-water-mid.svg',title:'Drinkwater',text:'Nog geen tankstand',joke:'Zodra er data is, weet het poppetje hoe dorstig het moet kijken.'};
    const value=clamp(level);
    if(value>=80)return {state:'good',asset:'tank-water-full.svg',title:'Drinkwater',text:'Lekker gevuld',joke:'"Heerlijk!" zegt het poppetje — koffie, thee én douchen kunnen gewoon door.'};
    if(value>=55)return {state:'good',asset:'tank-water-good.svg',title:'Drinkwater',text:'Prima op voorraad',joke:'Nog geen dorststress aan boord.'};
    if(value>=30)return {state:'warning',asset:'tank-water-mid.svg',title:'Drinkwater',text:'Begint te zakken',joke:'Tijd om de watervoorraad in de gaten te houden.'};
    if(value>=15)return {state:'critical',asset:'tank-water-low.svg',title:'Drinkwater',text:'Behoorlijk dorstig',joke:'Poppetje kijkt al of iemand nog een flesje water heeft verstopt.'};
    return {state:'critical',asset:'tank-water-empty.svg',title:'Drinkwater',text:'Bijna uitgedroogd',joke:'"Help, dorst!" Voor je het weet verandert de bemanning in rozijnen.'};
  }

  function wasteMood(level){
    if(!finite(level))return {state:'warning',asset:'tank-waste-mid.svg',title:'Vuilwater',text:'Nog geen tankstand',joke:'Zonder meting weten we niet of het fris ruikt… of juist niet.'};
    const value=clamp(level);
    if(value<=15)return {state:'good',asset:'tank-waste-empty.svg',title:'Vuilwater',text:'Lekker leeg',joke:'Vrolijk poppetje: alle ruimte over en de neus nog blij.'};
    if(value<=49)return {state:'good',asset:'tank-waste-good.svg',title:'Vuilwater',text:'Nog genoeg ruimte',joke:'Geen paniek, het blijft nog sociaal aan boord.'};
    if(value<=74)return {state:'warning',asset:'tank-waste-mid.svg',title:'Vuilwater',text:'Begint te vullen',joke:'Het poppetje trekt al een twijfelend gezichtje.'};
    if(value<=89)return {state:'critical',asset:'tank-waste-high.svg',title:'Vuilwater',text:'Hoog tijd om te legen',joke:'De eerste imaginaire dampwolkjes verschijnen.'};
    return {state:'critical',asset:'tank-waste-full.svg',title:'Vuilwater',text:'Stinkalarm aan boord',joke:'"Ramen open!" Volle bak — dit poppetje vergast bijna het hele schip.'};
  }

  function ensureBlock(host,id,inline=false){
    if(!host)return null;
    let el=$(id);
    if(el)return el;
    el=document.createElement('div');
    el.id=id;
    el.className=`tank-humor cartoonish${inline?' inline':''}`;
    el.innerHTML='<div class="tank-humor-emoji"><img alt="Tank illustratie"></div><div class="tank-humor-copy"><span class="tank-humor-title"></span><strong class="tank-humor-text"></strong><span class="tank-humor-joke"></span></div>';
    host.appendChild(el);
    return el;
  }

  function paint(el,mood){
    if(!el||!mood)return;
    el.classList.remove('good','warning','critical');
    el.classList.add(mood.state);
    const emoji=el.querySelector('.tank-humor-emoji img');
    const title=el.querySelector('.tank-humor-title');
    const text=el.querySelector('.tank-humor-text');
    const joke=el.querySelector('.tank-humor-joke');
    if(emoji){emoji.src=mood.asset||''; emoji.alt=`${mood.title} illustratie`;}
    if(title)title.textContent=mood.title;
    if(text)text.textContent=mood.text;
    if(joke)joke.textContent=mood.joke;
  }

  function technicalCardFor(id){
    return $(id)?.closest('.technical-gauge')||null;
  }

  function updateTechnical(){
    paint(
      ensureBlock(technicalCardFor('techWaterLevel'),'techWaterMood'),
      waterMood(parseFloat(($('techWaterLevel')?.textContent||'').replace(',','.')))
    );
    paint(
      ensureBlock(technicalCardFor('techWasteLevel'),'techWasteMood'),
      wasteMood(parseFloat(($('techWasteLevel')?.textContent||'').replace(',','.')))
    );
  }

  function updateIvms(){
    const ivmsWaterCard=$('ivmsWaterRing')?.closest('.ivms-card');
    paint(
      ensureBlock(ivmsWaterCard,'ivmsWaterMood'),
      waterMood(parseFloat(($('ivmsWaterValue')?.textContent||'').replace(',','.')))
    );

    const wasteRow=$('ivmsTankWasteValue')?.closest('.ivms-tank-row');
    paint(
      ensureBlock(wasteRow,'ivmsWasteMood',true),
      wasteMood(parseFloat(($('ivmsTankWasteValue')?.textContent||'').replace(',','.')))
    );
  }

  function updateAll(){
    try{updateTechnical()}catch(error){console.debug('Tank humor technical update mislukt',error)}
    try{updateIvms()}catch(error){console.debug('Tank humor IVMS update mislukt',error)}
  }

  function install(){
    updateAll();
    setTimeout(updateAll,1200);
    setInterval(updateAll,3000);

    if(typeof window.renderTechnicalDashboard==='function'){
      const original=window.renderTechnicalDashboard;
      window.renderTechnicalDashboard=function(...args){
        const result=original.apply(this,args);
        setTimeout(updateAll,0);
        return result;
      };
    }

    window.addEventListener('mijnserenity-ha-state-updated',updateAll);
    window.addEventListener('mijnserenity-presence-updated',updateAll);
    window.addEventListener('mijnserenity-ruuvi-config-updated',updateAll);
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')setTimeout(updateAll,150);
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
