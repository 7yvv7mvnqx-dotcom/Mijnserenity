/* MijnSerenity 7.15.31 Pro dashboard loader */
(()=>{
  'use strict';
  if(document.getElementById('msPro71531Css'))return;
  const link=document.createElement('link');
  link.id='msPro71531Css';
  link.rel='stylesheet';
  link.href='/dashboard-pro-71531.css?v=715320';
  document.head.appendChild(link);
  if(!document.querySelector('script[data-ms-pro-dashboard]')){
    const script=document.createElement('script');
    script.dataset.msProDashboard='1';
    script.src='/dashboard-pro-71531.js?v=715320';
    script.async=false;
    document.head.appendChild(script);
  }
})();
