/* MijnSerenity 7.18.33 — veilig herstel van Start/dashboard */
(()=>{
  'use strict';
  if(window.__msMarineGlassStartFix71833)return;
  window.__msMarineGlassStartFix71833=true;

  function appIsOpen(){
    const app=document.getElementById('appView');
    const auth=document.getElementById('authView');
    const approval=document.getElementById('approvalView');
    if(!app||app.classList.contains('hidden')||app.hidden)return false;
    if(auth&&!auth.classList.contains('hidden')&&!auth.hidden)return false;
    if(approval&&!approval.classList.contains('hidden')&&!approval.hidden)return false;
    return true;
  }

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
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const remove=[];
    while(walker.nextNode()){
      const node=walker.currentNode;
      if(String(node.nodeValue||'').trim()==='\\n')remove.push(node);
    }
    remove.forEach(node=>{node.nodeValue=''});
  }

  function syncDisplayedVersion(){
    const build=window.MIJSERENITY_BUILD||'7.18.33';
    const settings=document.getElementById('settingsAppVersion');
    if(settings)settings.textContent=build;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=build);
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');
    if(badge)badge.textContent=build;
  }

  function showDashboard(){
    /* Nooit het dashboard forceren terwijl login of accountgoedkeuring zichtbaar is. */
    if(!appIsOpen())return false;
    const dashboard=document.getElementById('dashboard');
    if(!dashboard)return false;
    const glass=document.getElementById('msMarineGlass');
    dashboard.hidden=false;
    dashboard.classList.add('active');
    dashboard.style.removeProperty('display');
    dashboard.style.removeProperty('visibility');
    dashboard.style.removeProperty('opacity');
    if(glass){
      dashboard.classList.add('mg-active');
      glass.hidden=false;
      glass.style.setProperty('display','block','important');
      glass.style.setProperty('visibility','visible','important');
      glass.style.setProperty('opacity','1','important');
    }
    cleanLiteralNewlines(dashboard);
    cleanLiteralNewlines(document.getElementById('appView'));
    return true;
  }

  function repair(){
    resetBrokenMobileLayer();
    syncDisplayedVersion();
    if(!appIsOpen())return;
    cleanNavigation();
    showDashboard();
  }

  function start(){
    repair();
    setTimeout(repair,120);
    setTimeout(repair,500);
    setTimeout(repair,1400);
    const app=document.getElementById('appView');
    if(app&&window.MutationObserver){
      const observer=new MutationObserver(()=>{
        if(appIsOpen())requestAnimationFrame(repair);
      });
      observer.observe(app,{attributes:true,attributeFilter:['class','hidden']});
    }
    window.addEventListener('mijnserenity:modules-ready',repair,{passive:true});
    window.addEventListener('pageshow',repair,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)repair()},{passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
