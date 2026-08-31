/* MijnSerenity 8.20.5 — legacy compatibility only.
   Captain is verwijderd uit de site. Deze oude bestandsnaam blijft tijdelijk bestaan
   zodat gecachte loaders veilig doorschakelen naar de geïntegreerde ChatGPT-module. */
(()=>{
  'use strict';
  window.__msCaptainAi8204=true;
  window.__msCaptainAi71814=true;
  window.__msDashboardCaptainSearch71832=true;
  window.__msCaptainAiPro8204=true;

  function cleanup(){
    document.querySelectorAll('#msDashboardCaptainSearch,.captain-command-center,.captain-strip').forEach(node=>node.remove());
    document.querySelectorAll('style[id^="msCaptain"],style[id*="CaptainAi"],style[id*="CaptainAI"]').forEach(node=>node.remove());
  }

  function loadChatGPT(){
    cleanup();
    if(window.__msChatGPT8205||document.querySelector('script[data-ms-chatgpt-loader]'))return;
    const script=document.createElement('script');
    script.src='chatgpt-ms-8205.js?v=82050';
    script.async=true;
    script.dataset.msChatgptLoader='1';
    script.onerror=()=>console.warn('MijnSerenity ChatGPT kon niet worden geladen.');
    document.head.appendChild(script);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadChatGPT,{once:true});
  else loadChatGPT();
})();