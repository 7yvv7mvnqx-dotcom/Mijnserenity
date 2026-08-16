/* MijnSerenity 7.15.59 Pro dashboard loader */
(()=>{
  'use strict';
  if(document.getElementById('msPro71531Css'))return;
  const link=document.createElement('link');
  link.id='msPro71531Css';link.rel='stylesheet';link.href='/dashboard-pro-71531.css?v=715596';document.head.appendChild(link);
  if(!document.getElementById('msNav71548Css')){
    const navCss=document.createElement('link');navCss.id='msNav71548Css';navCss.rel='stylesheet';navCss.href='/dashboard-navigation-71548.css?v=715560';document.head.appendChild(navCss);
  }
  if(!document.getElementById('msAiDestinationCss')){
    const aiCss=document.createElement('link');aiCss.id='msAiDestinationCss';aiCss.rel='stylesheet';aiCss.href='/ai-destination-search.css?v=715530';document.head.appendChild(aiCss);
  }
  const scripts=[
    ['/dashboard-pro-71531.js?v=715594','msProDashboard'],
    ['/dashboard-cockpit-portal.js?v=715440','msCockpitPortal'],
    ['/dashboard-alarm-live-fix-71540.js?v=715400','msAlarmLiveFix'],
    ['/dashboard-wind-direction-fix-71541.js?v=715460','msWindDirectionFix'],
    ['/dashboard-rudder-icons-fix-71545.js?v=715450','msRudderIconsFix'],
    ['/dashboard-navigation-71548.js?v=715590','msNavigation71548'],
    ['/ai-destination-search.js?v=715540','msAiDestination71551']
  ];
  scripts.forEach(([src,key])=>{
    if(document.querySelector(`script[data-${key}]`))return;
    const script=document.createElement('script');script.setAttribute(`data-${key}`,'1');script.src=src;script.async=false;document.head.appendChild(script);
  });
})();
