/* MijnSerenity 7.19.0 — legacy orientation hotfix uitgeschakeld.
   Breedte en oriëntatie worden voortaan uitsluitend door normale responsive CSS bepaald.
   Deze compatibiliteitsstub ruimt inline breedtes van oudere builds éénmalig op. */
(()=>{
  'use strict';
  if(window.__msOrientationCleanup71900)return;
  window.__msOrientationCleanup71900=true;

  const selectors=[
    'html','body','body > main','#appView','#dashboard','#msMarineGlass',
    '.ms708-native-pager','.ms708-native-pager > .ms708-native-page','.bottom-nav'
  ];

  function clean(){
    document.documentElement.removeAttribute('data-ms-orientation');
    document.body?.removeAttribute('data-ms-orientation');
    ['--ms-physical-width','--ms-layout-width','--ms-layout-height','--ms-landscape-width','--ms-viewport-width','--ms-viewport-height']
      .forEach(name=>document.documentElement.style.removeProperty(name));

    document.querySelectorAll(selectors.join(',')).forEach(node=>{
      ['width','max-width','min-width','margin-left','margin-right','left','right','transform','translate']
        .forEach(name=>node.style.removeProperty(name));
    });

    document.getElementById('msOrientationLayout71835Style')?.remove();
    document.getElementById('msOrientationLayout71836Style')?.remove();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clean,{once:true});
  else clean();
})();
