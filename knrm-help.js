/* MijnSerenity — hulp op Nederlandse wateren. Geen KNRM-alarm- of trackingintegratie. */
(()=>{
'use strict';
const dialog=document.getElementById('msKnrmHelp');
if(!dialog)return;
const status=document.getElementById('msKnrmPosition');
const locate=document.getElementById('msKnrmLocate');
let request=0;
document.addEventListener('click',event=>{
  if(!event.target.closest?.('[data-ms-knrm-help]'))return;
  if(!dialog.open)dialog.showModal();
});
function reset(){
  request++;
  locate.disabled=false;
  status.textContent='Nog geen positie opgevraagd. Geef je locatie zelf door aan de hulpverlener.';
}
document.getElementById('msKnrmClose').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
dialog.addEventListener('close',reset);
locate.addEventListener('click',()=>{
  const current=++request;
  status.textContent='Huidige positie ophalen… Bellen kan ondertussen gewoon.';
  locate.disabled=true;
  const fail=error=>{
    if(current!==request)return;
    locate.disabled=false;
    status.textContent=error?.code===1
      ?'Locatietoegang geweigerd. Geef je locatie of herkenningspunten mondeling door.'
      :'Geen actuele positie beschikbaar. Geef je locatie of herkenningspunten mondeling door.';
  };
  if(!navigator.geolocation){fail();return}
  navigator.geolocation.getCurrentPosition(position=>{
    if(current!==request)return;
    locate.disabled=false;
    const {latitude,longitude,accuracy}=position.coords;
    const timestamp=position.timestamp;
    if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180||!Number.isFinite(timestamp)||Math.abs(Date.now()-timestamp)>60000){fail();return}
    const time=new Date(timestamp).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    const precision=Number.isFinite(accuracy)&&accuracy>=0?` · nauwkeurigheid circa ${Math.ceil(accuracy)} m`:'';
    status.textContent=`Breedtegraad ${latitude.toFixed(6)}° · lengtegraad ${longitude.toFixed(6)}°${precision} · gemeten om ${time}. Dit is een momentopname; je positie wordt niet verstuurd.`;
  },fail,{enableHighAccuracy:true,maximumAge:0,timeout:12000});
});
})();
