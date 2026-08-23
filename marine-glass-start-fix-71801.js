/* MijnSerenity 7.18.30 — compatibel herstel van Start zonder navigatie/versie te forceren */
(()=>{
  'use strict';
  if(window.__msMarineGlassStartFix71830)return;
  window.__msMarineGlassStartFix71830=true;
  window.__msMarineGlassStartFix71812=true;

  function resetBrokenMobileLayer(){
    document.getElementById('msMarineGlassMobile7182')?.remove();
    document.body.classList.remove('mg-mode');
  }

  function cleanNavigation(){
    document.getElementById('mgNav718Style')?.remove();
    document.getElementById('mgMoreNav')?.remove();
    document.querySelector('.bottom-nav')?.classList.remove('mg-nav');
  }

  function cleanLiteralNewlines(root){
    if(!root||!document.createTreeWalker)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),remove=[];
    while(walker.nextNode()){
      const node=walker.currentNode;
      if(String(node.nodeValue||'').trim()==='\\n')remove.push(node);
    }
    remove.forEach(node=>{node.nodeValue=''});
  }

  function repairVisibleDashboard(){
    resetBrokenMobileLayer();
    cleanNavigation();

    const dashboard=document.getElementById('dashboard');
    const glass=document.getElementById('msMarineGlass');
    if(!dashboard||dashboard.classList.contains('hidden'))return;

    dashboard.hidden=false;
    dashboard.classList.add('active');
    dashboard.style.removeProperty('display');
    dashboard.style.removeProperty('visibility');
    dashboard.style.removeProperty('opacity');
    dashboard.style.removeProperty('height');
    dashboard.style.removeProperty('max-height');
    dashboard.style.removeProperty('overflow');

    if(glass){
      dashboard.classList.add('mg-active');
      glass.hidden=false;
      ['display','visibility','opacity','height','max-height','overflow','position','transform','contain']
        .forEach(name=>glass.style.removeProperty(name));
    }

    cleanLiteralNewlines(dashboard);
    cleanLiteralNewlines(document.getElementById('appView'));
  }

  function start(){
    repairVisibleDashboard();
    [120,500,1400].forEach(delay=>setTimeout(repairVisibleDashboard,delay));
    window.addEventListener('mijnserenity:dashboard-ready',repairVisibleDashboard,{passive:true});
    window.addEventListener('mijnserenity:routechange',()=>requestAnimationFrame(repairVisibleDashboard),{passive:true});
    window.addEventListener('pageshow',repairVisibleDashboard,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)repairVisibleDashboard()},{passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();