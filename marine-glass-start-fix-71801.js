/* MijnSerenity 7.18.12 — veilig herstel van Start/dashboard */
(()=>{
  'use strict';
  if(window.__msMarineGlassStartFix71812)return;
  window.__msMarineGlassStartFix71812=true;
  const BUILD='7.18.12';

  function resetBrokenMobileLayer(){document.getElementById('msMarineGlassMobile7182')?.remove();document.body.classList.remove('mg-mode')}
  function syncVersion(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');if(meta)meta.content=BUILD;
    const settings=document.getElementById('settingsAppVersion');if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');if(badge)badge.textContent=BUILD;
  }
  function cleanNavigation(){document.getElementById('mgNav718Style')?.remove();document.getElementById('mgMoreNav')?.remove();document.querySelector('.bottom-nav')?.classList.remove('mg-nav')}
  function cleanLiteralNewlines(root){
    if(!root||!document.createTreeWalker)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),remove=[];
    while(walker.nextNode()){const node=walker.currentNode;if(String(node.nodeValue||'').trim()==='\\n')remove.push(node)}
    remove.forEach(node=>{node.nodeValue=''})
  }
  function showDashboard(){
    const dashboard=document.getElementById('dashboard');if(!dashboard)return false;
    const glass=document.getElementById('msMarineGlass');
    dashboard.hidden=false;dashboard.classList.add('active');dashboard.style.removeProperty('display');dashboard.style.removeProperty('visibility');dashboard.style.removeProperty('opacity');
    if(glass){
      dashboard.classList.add('mg-active');glass.hidden=false;glass.style.setProperty('display','block','important');glass.style.setProperty('visibility','visible','important');glass.style.setProperty('opacity','1','important');
    }else{
      dashboard.classList.remove('mg-active');['ms71510Dashboard','serenityIvms'].forEach(id=>{const el=document.getElementById(id);if(el){el.hidden=false;el.style.removeProperty('display');el.style.removeProperty('visibility');el.style.removeProperty('opacity')}});
    }
    cleanLiteralNewlines(dashboard);cleanLiteralNewlines(document.getElementById('appView'));return true;
  }
  function repair(){resetBrokenMobileLayer();cleanNavigation();syncVersion();showDashboard()}
  function start(){
    repair();setTimeout(repair,120);setTimeout(repair,500);setTimeout(repair,1400);setTimeout(repair,3000);
    const app=document.getElementById('appView');
    if(app&&window.MutationObserver){const observer=new MutationObserver(()=>{if(!app.classList.contains('hidden'))requestAnimationFrame(repair)});observer.observe(app,{attributes:true,attributeFilter:['class','hidden']})}
    window.addEventListener('mijnserenity:modules-ready',repair,{passive:true});window.addEventListener('pageshow',repair,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)repair()},{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
