/* MijnSerenity 7.15.38 Pro dashboard loader */
(()=>{
  'use strict';
  if(document.getElementById('msPro71531Css'))return;
  const link=document.createElement('link');
  link.id='msPro71531Css';link.rel='stylesheet';link.href='/dashboard-pro-71531.css?v=715350';document.head.appendChild(link);
  const scripts=[
    ['/dashboard-pro-71531.js?v=715350','msProDashboard'],
    ['/dashboard-cockpit-portal.js?v=715350','msCockpitPortal'],
    ['/dashboard-energy-live-fix-71537.js?v=715380','msEnergyLiveFix']
  ];
  scripts.forEach(([src,key])=>{
    if(document.querySelector(`script[data-${key}]`))return;
    const script=document.createElement('script');script.setAttribute(`data-${key}`,'1');script.src=src;script.async=false;document.head.appendChild(script);
  });
})();
