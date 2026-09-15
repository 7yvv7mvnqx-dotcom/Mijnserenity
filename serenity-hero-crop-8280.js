/* MijnSerenity 8.28.0 hotfix — veilige Serenity hero zonder observer-loop. */
(()=>{
  'use strict';
  if(window.__msSerenityHeroCrop8280Safe)return;
  window.__msSerenityHeroCrop8280Safe=true;

  const STYLE_ID='msSerenityHeroCrop8280Style';
  const CSS=`
    #ms8210Start .ms8263-hero{background-position:center 58%!important;}
    #ms8210Start .ms8263-tag{display:none!important;visibility:hidden!important;}
    #ms8210Start .ms8263-brand{top:max(42px,env(safe-area-inset-top))!important;}
    @media (max-width:640px){
      #ms8210Start .ms8263-hero{background-position:center 58%!important;}
      #ms8210Start .ms8263-brand{top:max(38px,env(safe-area-inset-top))!important;}
    }
  `;

  function apply(){
    let style=document.getElementById(STYLE_ID);
    if(!style){
      style=document.createElement('style');
      style.id=STYLE_ID;
      (document.head||document.documentElement).appendChild(style);
    }
    if(style.textContent!==CSS)style.textContent=CSS;
  }

  apply();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
  window.addEventListener('pageshow',apply,{passive:true});
  window.addEventListener('hashchange',()=>setTimeout(apply,0),{passive:true});
  [120,500,1400].forEach(ms=>setTimeout(apply,ms));
})();
