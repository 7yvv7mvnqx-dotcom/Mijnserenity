/* MijnSerenity 8.20.6 — legacy cleanup only.
   AI/ChatGPT is verwijderd uit de zichtbare site. Deze oude bestandsnaam blijft
   alleen bestaan voor gecachte loaders en start de energiewaarden-brug. */
(()=>{
  'use strict';
  window.__msCaptainAi8204=true;
  window.__msCaptainAi71814=true;
  window.__msDashboardCaptainSearch71832=true;
  window.__msCaptainAiPro8204=true;
  window.__msChatGPT8205=true;

  function cleanupAi(){
    document.querySelectorAll('#msDashboardCaptainSearch,#msChatGPTMs8205,[data-ms-chatgpt],.captain-command-center,.captain-strip').forEach(node=>node.remove());
    document.querySelectorAll('style[id^="msCaptain"],style[id*="CaptainAi"],style[id*="CaptainAI"],style[id*="ChatGPT"]').forEach(node=>node.remove());
    document.querySelectorAll('script[src*="chatgpt-ms-8205.js"],script[data-ms-chatgpt-loader]').forEach(node=>node.remove());
  }

  function loadEnergyBridge(){
    cleanupAi();
    if(window.__msEnergyBridge8206||document.querySelector('script[data-ms-energy-bridge-8206]'))return;
    const script=document.createElement('script');
    script.src='dashboard-energy-bridge-8206.js?v=82060';
    script.async=true;
    script.dataset.msEnergyBridge8206='1';
    script.onerror=()=>console.warn('Energiebrug kon niet worden geladen.');
    document.head.appendChild(script);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadEnergyBridge,{once:true});
  else loadEnergyBridge();
  window.addEventListener('mijnserenity:dashboard-ready',cleanupAi,{passive:true});
  setTimeout(cleanupAi,1500);
  setTimeout(cleanupAi,4000);
})();