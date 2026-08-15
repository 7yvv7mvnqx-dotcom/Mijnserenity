/* MijnSerenity 7.15.45 Pro dashboard loader */
(()=>{
  'use strict';
  if(document.getElementById('msPro71531Css'))return;
  const link=document.createElement('link');
  link.id='msPro71531Css';link.rel='stylesheet';link.href='/dashboard-pro-71531.css?v=715350';document.head.appendChild(link);
  const scripts=[
    ['/dashboard-pro-71531.js?v=715350','msProDashboard'],
    ['/dashboard-cockpit-portal.js?v=715440','msCockpitPortal'],
    ['/dashboard-energy-live-fix-71537.js?v=715380','msEnergyLiveFix'],
    ['/dashboard-alarm-live-fix-71540.js?v=715400','msAlarmLiveFix'],
    ['/dashboard-wind-direction-fix-71541.js?v=715440','msWindDirectionFix'],
    ['/dashboard-rudder-icons-fix-71545.js?v=715450','msRudderIconsFix']
  ];
  scripts.forEach(([src,key])=>{
    if(document.querySelector(`script[data-${key}]`))return;
    const script=document.createElement('script');script.setAttribute(`data-${key}`,'1');script.src=src;script.async=false;document.head.appendChild(script);
  });
})();
