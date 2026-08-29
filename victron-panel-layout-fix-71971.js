/* MijnSerenity 7.19.7.1 — voorkomt viewport-hoge Victron Live kaart op iPhone */
(()=>{
  'use strict';
  if(window.__msVictronPanelLayoutFix71971)return;
  window.__msVictronPanelLayoutFix71971=true;

  let hostObserver=null;
  let observedHost=null;
  let applyFrame=0;

  const important=(el,name,value)=>el?.style?.setProperty(name,value,'important');

  function normaliseBox(el){
    if(!el)return;
    important(el,'height','auto');
    important(el,'min-height','0');
    important(el,'max-height','none');
    important(el,'min-block-size','0');
    important(el,'block-size','auto');
    important(el,'aspect-ratio','auto');
    important(el,'position','relative');
    important(el,'inset','auto');
    important(el,'transform','none');
    important(el,'translate','none');
    important(el,'align-self','start');
    important(el,'contain','none');
    important(el,'visibility','visible');
    important(el,'opacity','1');
  }

  function apply(){
    applyFrame=0;
    const host=document.getElementById('msVictronEnergy');
    if(!host)return false;
    const panel=host.querySelector(':scope > [data-ms-victron-live]')||host.querySelector('[data-ms-victron-live]');
    if(!panel)return false;

    normaliseBox(host);
    important(host,'display','block');
    important(host,'overflow','visible');
    important(host,'margin-bottom','10px');

    normaliseBox(panel);
    important(panel,'display','block');
    important(panel,'overflow','visible');
    important(panel,'width','100%');
    important(panel,'max-width','100%');
    important(panel,'margin','0');
    panel.dataset.msCompactHeight='71971';

    const displayMap=[
      ['.mg-live-head','flex'],
      ['.mg-main','grid'],
      ['.mg-three','grid'],
      ['.mg-systems','grid'],
      ['.mg-flow-card','grid'],
      ['.mg-foot','flex']
    ];
    for(const [selector,display] of displayMap){
      const el=panel.querySelector(selector);
      if(!el)continue;
      el.hidden=false;
      el.removeAttribute('aria-hidden');
      normaliseBox(el);
      important(el,'display',display);
      important(el,'width','100%');
      important(el,'max-width','100%');
      important(el,'overflow','visible');
      important(el,'grid-row','auto');
      important(el,'grid-column','auto');
    }

    panel.querySelectorAll('.mg-mini,.mg-battery,.mg-info-card,.mg-system,.mg-climate-mini,.mg-climate-mini button,.mg-flow-node').forEach(el=>{
      normaliseBox(el);
      important(el,'max-height','none');
    });

    const hiddenCompat=panel.querySelector('#mgHiddenCompat');
    if(hiddenCompat)hiddenCompat.style.setProperty('display','none','important');

    if(observedHost!==host){
      hostObserver?.disconnect();
      observedHost=host;
      hostObserver=new MutationObserver(()=>queue());
      hostObserver.observe(host,{childList:true,subtree:false});
    }
    return true;
  }

  function queue(){
    if(applyFrame)return;
    applyFrame=requestAnimationFrame(apply);
  }

  ['mijnserenity:dashboard-ready','mijnserenity-vrm-energy-live-updated','mijnserenity-vrm-diagnostics-updated','mijnserenity:routechange'].forEach(name=>window.addEventListener(name,queue,{passive:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()},{passive:true});
  window.addEventListener('focus',queue,{passive:true});

  const start=()=>{
    queue();
    [150,500,1200,2500,5000].forEach(delay=>setTimeout(queue,delay));
    setInterval(()=>{if(!document.hidden)queue()},15000);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
