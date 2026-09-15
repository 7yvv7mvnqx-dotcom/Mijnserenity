/* MijnSerenity 8.28.0 — Serenity hero: tagline rechts verwijderd en foto hoger uitgesneden. */
(()=>{
  'use strict';
  if(window.__msSerenityHeroCrop8280)return;
  window.__msSerenityHeroCrop8280=true;

  const STYLE_ID='msSerenityHeroCrop8280Style';

  function apply(){
    let style=document.getElementById(STYLE_ID);
    if(!style){
      style=document.createElement('style');
      style.id=STYLE_ID;
      (document.head||document.documentElement).appendChild(style);
    }
    style.textContent=`
      #ms8210Start .ms8263-hero{
        background-position:center 58%!important;
      }
      #ms8210Start .ms8263-tag{
        display:none!important;
        visibility:hidden!important;
      }
      #ms8210Start .ms8263-brand{
        top:max(42px,env(safe-area-inset-top))!important;
      }
      @media (max-width:640px){
        #ms8210Start .ms8263-hero{
          background-position:center 58%!important;
        }
        #ms8210Start .ms8263-brand{
          top:max(38px,env(safe-area-inset-top))!important;
        }
      }
    `;
  }

  apply();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
  window.addEventListener('pageshow',apply,{passive:true});
  window.addEventListener('hashchange',()=>setTimeout(apply,0),{passive:true});
  new MutationObserver(()=>apply()).observe(document.documentElement,{childList:true,subtree:true});
})();
