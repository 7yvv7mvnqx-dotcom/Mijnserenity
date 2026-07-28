
/* ============================================================
   MijnSerenity Cloud 7.8.0 — hersteld native iPhone/iPad paginavegen
   ============================================================ */

const ms708PageOrder=[
  'dashboard',
  'live',
  'ais',
  'weather',
  'map',
  'planner',
  'entertainment',
  'technical',
  'logbook',
  'pois',
  'finance',
  'settings'
];

const ms708PageLabels={
  dashboard:'Start',
  live:'Live varen',
  ais:'AIS',
  weather:'Weer',
  map:'Kaart',
  planner:'Reisplanner',
  entertainment:'Home Assistant',
  technical:'Techniek',
  logbook:'Logboek',
  pois:'POI',
  finance:'Financieel',
  settings:'Boot'
};

let ms708Pager=null;
let ms708OriginalShowTab=null;
let ms708OriginalCaptainNavigate=null;
let ms708SuppressScroll=false;
let ms708ActiveId='dashboard';
let ms708ScrollTimer=null;
let ms708Frame=null;
let ms708ResizeFrame=null;
let ms708PreparingId=null;
let ms708Initialised=false;


function ms708SinglePageMode(){
  /*
     7.8.0: de tijdelijke harde Start-oplossing zette de app blijvend
     in één-paginamodus. Daardoor verdwenen andere pagina's en stopte
     horizontaal vegen. Native paginavegen is weer altijd actief.
  */
  return false;
}

function ms708SetSingleActive(id){
  if(!ms708Pager)return;
  ms708PageOrder.forEach(pageId=>{
    const page=ms708PageElement(pageId);
    page?.classList.toggle('ms755-route-active',pageId===id);
    page?.setAttribute('aria-hidden',String(pageId!==id));
  });
  ms708Pager.dataset.ms755Active=id;
}

function ms708PageIndex(id){
  return ms708PageOrder.indexOf(id);
}

function ms708PageElement(id){
  return document.getElementById(id);
}

function ms708ClosestPageIndex(){
  if(!ms708Pager)return 0;

  const width=Math.max(
    1,
    ms708Pager.clientWidth
  );

  return Math.max(
    0,
    Math.min(
      ms708PageOrder.length-1,
      Math.round(
        ms708Pager.scrollLeft/width
      )
    )
  );
}

function ms708CurrentPageId(){
  if(ms708SinglePageMode())return ms708ActiveId||'dashboard';
  return ms708PageOrder[
    ms708ClosestPageIndex()
  ]||'dashboard';
}

function ms708SetNavigationState(id){
  document.querySelectorAll(
    '.bottom-nav-item'
  ).forEach(button=>{
    button.classList.toggle(
      'active',
      button.dataset.target===id
    );
  });

  document.querySelectorAll('.tab')
    .forEach(tab=>{
      tab.classList.toggle(
        'active',
        tab.dataset.target===id
      );
    });

  const activeButton=
    document.querySelector(
      `.bottom-nav-item[data-target="${id}"]`
    );

  if(
    typeof scrollActiveBottomNavigationIntoView==='function'
  ){
    scrollActiveBottomNavigationIntoView(
      activeButton,
      false
    );
  }
}

function ms708PreparePage(id){
  if(ms708PreparingId===id)return;

  ms708PreparingId=id;

  const page=ms708PageElement(id);
  if(page&&page.dataset.ms708Prepared!=='true'){
    page.scrollTop=0;
    page.dataset.ms708Prepared='true';
  }

  requestAnimationFrame(()=>{
    ms708PreparingId=null;
  });
}

function ms708ActivatePage(
  id,
  runPageActions=true
){
  if(!ms708PageOrder.includes(id))return;

  ms708ActiveId=id;
  ms708SetNavigationState(id);

  if(!runPageActions)return;

  ms708SuppressScroll=true;

  try{
    ms708OriginalCaptainNavigate?.(id);
  }finally{
    ms708SuppressScroll=false;
  }

  requestAnimationFrame(()=>{
    if(id==='ais'&&typeof initAisPage==='function'){
      initAisPage();
    }

    if(id==='weather'&&typeof initWeatherPage==='function'){
      initWeatherPage();
    }

    if(id==='live'){
      try{
        liveMap?.invalidateSize({
          pan:false
        });
      }catch{}

      if(typeof ms702RestoreSplitView==='function'){
        ms702RestoreSplitView();
      }
    }

    if(id==='map'){
      try{
        map?.invalidateSize?.({
          pan:false
        });
      }catch{}
    }

    if(id==='entertainment'&&typeof initEntertainmentPage==='function'){
      initEntertainmentPage();
    }

    if(id==='planner'){
      try{
        plannerMap?.invalidateSize({
          pan:false
        });
      }catch{}
    }
  });
}

function ms708ScrollToPage(
  id,
  smooth=true
){
  if(ms708SinglePageMode())return ms708GoToPage(id,true);
  if(
    !ms708Pager||
    !ms708PageOrder.includes(id)
  ){
    return false;
  }

  const index=ms708PageIndex(id);
  const page=ms708PageElement(id);

  /*
     Zet de doelpagina direct als actief. Eerder bleef ms708ActiveId
     tijdens de animatie nog op bijvoorbeeld 'settings' staan. Een
     Visual Viewport/resize-event op iOS kon de pager dan meteen weer
     naar die oude pagina terugzetten: de kop veranderde wel, de pagina
     zelf niet. Dit is de kern van de Start-fout uit 7.5.3.
  */
  ms708ActiveId=id;
  ms708PreparePage(id);

  page?.scrollTo({
    top:0,
    left:0,
    behavior:'auto'
  });

  ms708SetPagerVisibility(true);

  ms708Pager.scrollTo({
    left:index*ms708Pager.clientWidth,
    top:0,
    behavior:smooth?'smooth':'auto'
  });

  ms708SetNavigationState(id);

  if(!smooth){
    ms708ActivatePage(id,true);
  }

  return true;
}

/*
   Betrouwbare openbare route voor de vereenvoudigde navigatie.
   Hiermee worden inhoud, paginapositie en paginalogica in één stap
   naar dezelfde pagina gezet, zonder afhankelijk te zijn van een
   soepele scrollanimatie die iOS tussentijds kan terugdraaien.
*/
function ms708GoToPage(id,runPageActions=true){
  if(!ms708Pager||!ms708PageOrder.includes(id))return false;

  ms708ActiveId=id;
  ms708PreparePage(id);
  ms708SetPagerVisibility(true);

  if(runPageActions){
    ms708ActivatePage(id,true);
  }else{
    ms708SetNavigationState(id);
  }

  if(ms708SinglePageMode()){
    ms708SetSingleActive(id);
    ms708Pager.scrollLeft=0;
    ms708PageElement(id)?.scrollTo({top:0,left:0,behavior:'auto'});
    ms708SetNavigationState(id);
    ms708ResizePager();
    return true;
  }

  const index=ms708PageIndex(id);
  const left=index*Math.max(1,ms708Pager.clientWidth);
  ms708Pager.scrollTo({left,top:0,behavior:'auto'});
  ms708Pager.scrollLeft=left;
  ms708SetNavigationState(id);

  return true;
}

function ms708SetPagerVisibility(visible){
  if(!ms708Pager)return;

  ms708Pager.classList.toggle(
    'hidden',
    !visible
  );

  document.querySelectorAll(
    '#appView > section'
  ).forEach(section=>{
    if(
      !ms708PageOrder.includes(section.id)
    ){
      section.classList.add('hidden');
    }
  });
}

function ms708ResizePager(){
  if(!ms708Pager)return;

  cancelAnimationFrame(
    ms708ResizeFrame
  );

  ms708ResizeFrame=requestAnimationFrame(()=>{
    const nav=document.querySelector(
      '.bottom-nav'
    );
    const pagerRect=
      ms708Pager.getBoundingClientRect();
    const viewport=window.visualViewport;
    const visibleBottom=(Number(viewport?.offsetTop)||0)+(
      Number(viewport?.height)||window.innerHeight
    );
    const navHeight=Math.max(
      0,
      nav?.getBoundingClientRect().height||0
    );
    /*
       Gebruik de echte zichtbare viewport in plaats van een mogelijk
       verouderde nav-positie. Dit voorkomt de zwarte strook wanneer
       iOS na starten de safe-area of Visual Viewport nog bijwerkt.
    */
    const contentBottom=Math.max(
      pagerRect.top+260,
      visibleBottom-navHeight
    );
    const height=Math.max(
      260,
      Math.floor(contentBottom-pagerRect.top)
    );
    const currentIndex=
      ms708PageIndex(ms708ActiveId);

    ms708Pager.style.height=
      `${height}px`;

    if(ms708SinglePageMode()){
      ms708SetSingleActive(ms708ActiveId||'dashboard');
      ms708Pager.scrollLeft=0;
    }else if(currentIndex>=0){
      ms708Pager.scrollTo({
        left:
          currentIndex*
          ms708Pager.clientWidth,
        top:0,
        behavior:'auto'
      });
    }

    requestAnimationFrame(()=>{
      try{
        liveMap?.invalidateSize({
          pan:false
        });
      }catch{}

      try{
        plannerMap?.invalidateSize({
          pan:false
        });
      }catch{}
    });
  });
}

function ms708HandleScroll(){
  if(!ms708Pager||ms708SinglePageMode())return;

  if(!ms708Frame){
    ms708Frame=requestAnimationFrame(()=>{
      ms708Frame=null;

      const index=
        ms708ClosestPageIndex();
      const id=
        ms708PageOrder[index];

      ms708SetNavigationState(id);

      const width=Math.max(
        1,
        ms708Pager.clientWidth
      );
      const progress=
        ms708Pager.scrollLeft/width;
      const direction=
        progress>
        ms708PageIndex(ms708ActiveId)
          ?1
          :-1;
      const candidateIndex=Math.max(
        0,
        Math.min(
          ms708PageOrder.length-1,
          ms708PageIndex(ms708ActiveId)+
          direction
        )
      );

      if(
        Math.abs(
          progress-
          ms708PageIndex(ms708ActiveId)
        )>.08
      ){
        ms708PreparePage(
          ms708PageOrder[candidateIndex]
        );
      }
    });
  }

  clearTimeout(ms708ScrollTimer);

  ms708ScrollTimer=setTimeout(
    ms708HandleScrollSettled,
    95
  );
}

function ms708HandleScrollSettled(){
  if(!ms708Pager||ms708SinglePageMode())return;

  const id=ms708CurrentPageId();

  ms708Pager.scrollTo({
    left:
      ms708PageIndex(id)*
      ms708Pager.clientWidth,
    top:0,
    behavior:'auto'
  });

  if(id!==ms708ActiveId){
    ms708ActivatePage(id,true);
    ms708ShowPageToast(
      ms708PageLabels[id]||id
    );
  }else{
    ms708SetNavigationState(id);
  }
}

function ms708ShowPageToast(page){
  let toast=document.getElementById(
    'ms706PageToast'
  );

  if(!toast){
    toast=document.createElement('div');
    toast.id='ms706PageToast';
    toast.className='ms706-page-toast';
    document.body.appendChild(toast);
  }

  toast.innerHTML=`
    <small>Pagina</small>
    <strong>${esc(page)}</strong>
  `;

  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');

  clearTimeout(toast._hideTimer);

  toast._hideTimer=setTimeout(()=>{
    toast.classList.remove('show');
  },750);
}

function ms708MarkHintSeen(){
  try{
    localStorage.setItem(
      'mijnserenity-708-native-swipe-seen',
      '1'
    );
  }catch{}

  document.getElementById(
    'ms706SwipeHint'
  )?.classList.add('hidden');
}

function ms708ShowHint(){
  let seen=false;

  try{
    seen=
      localStorage.getItem(
        'mijnserenity-708-native-swipe-seen'
      )==='1';
  }catch{}

  if(seen)return;

  const hint=document.getElementById(
    'ms706SwipeHint'
  );

  if(!hint)return;

  hint.querySelector('strong').textContent=
    'Veeg soepel: pagina volgt je vinger';

  setTimeout(()=>{
    hint.classList.remove('hidden');
  },1500);

  setTimeout(()=>{
    hint.classList.add('hidden');
  },7510);
}

function ms708CreatePager(){
  document.body?.classList.remove('ms755-single-page-nav');

  const appView=document.getElementById(
    'appView'
  );

  if(!appView||ms708Initialised)return;

  const pages=ms708PageOrder
    .map(ms708PageElement)
    .filter(Boolean);

  if(pages.length!==ms708PageOrder.length){
    setTimeout(ms708CreatePager,500);
    return;
  }

  ms708OriginalShowTab=showTab;
  ms708OriginalCaptainNavigate=
    captainNavigate;

  const pager=document.createElement('div');
  pager.id='ms708NativePager';
  pager.className='ms708-native-pager';
  pager.setAttribute(
    'aria-label',
    'MijnSerenity pagina’s'
  );

  pages[0].parentNode.insertBefore(
    pager,
    pages[0]
  );

  pages.forEach((page,index)=>{
    page.classList.remove('hidden');
    page.classList.add(
      'ms708-native-page'
    );
    page.dataset.ms708Index=
      String(index);
    page.setAttribute(
      'aria-label',
      ms708PageLabels[page.id]||
      page.id
    );
    pager.appendChild(page);
  });

  ms708Pager=pager;
  ms708Initialised=true;
  if(ms708SinglePageMode())ms708SetSingleActive('dashboard');

  showTab=function(id,button){
    if(ms708PageOrder.includes(id)){
      ms708OriginalShowTab(id,button);

      document.querySelectorAll(
        '#ms708NativePager > section'
      ).forEach(section=>
        section.classList.remove('hidden')
      );

      ms708SetPagerVisibility(true);

      if(ms708SinglePageMode()){
        ms708ActiveId=id;
        ms708SetSingleActive(id);
        ms708SetNavigationState(id);
      }else if(!ms708SuppressScroll){
        ms708ScrollToPage(id,true);
      }

      return;
    }

    ms708Pager.classList.add('hidden');
    ms708OriginalShowTab(id,button);
  };

  captainNavigate=function(
    id,
    sourceButton=null
  ){
    const result=
      ms708OriginalCaptainNavigate(
        id,
        sourceButton
      );

    if(ms708PageOrder.includes(id)&&!ms708SuppressScroll){
      if(ms708SinglePageMode()){
        ms708ActiveId=id;
        ms708SetSingleActive(id);
        ms708SetNavigationState(id);
        ms708ResizePager();
      }else{
        ms708ScrollToPage(id,true);
      }
    }

    return result;
  };

  pager.addEventListener(
    'scroll',
    ms708HandleScroll,
    {passive:true}
  );

  pager.addEventListener(
    'pointerdown',
    ms708MarkHintSeen,
    {passive:true,once:true}
  );

  if('onscrollend' in window){
    pager.addEventListener(
      'scrollend',
      ms708HandleScrollSettled,
      {passive:true}
    );
  }

  const observer=new MutationObserver(()=>{
    const appVisible=
      !appView.classList.contains(
        'hidden'
      );

    document.body.classList.toggle(
      'ms708-native-pages-active',
      appVisible
    );

    if(appVisible){
      ms708SetPagerVisibility(true);
      ms708ResizePager();
    }
  });

  observer.observe(appView,{
    attributes:true,
    attributeFilter:['class']
  });

  document.body.classList.toggle(
    'ms708-native-pages-active',
    !appView.classList.contains(
      'hidden'
    )
  );

  ms708ActiveId='dashboard';
  ms708SetNavigationState(
    ms708ActiveId
  );
  ms708ResizePager();
  ms708ScrollToPage(
    ms708ActiveId,
    false
  );
  ms708ShowHint();
}

window.ms708ResizePager=ms708ResizePager;
window.ms708ScrollToPage=ms708ScrollToPage;
window.ms708GoToPage=ms708GoToPage;
window.ms708SetSingleActive=ms708SetSingleActive;

document.addEventListener(
  'DOMContentLoaded',
  ()=>{
    setTimeout(
      ms708CreatePager,
      80
    );
  }
);

window.addEventListener(
  'pageshow',
  ()=>{
    ms708CreatePager();
    ms708ResizePager();
  },
  {passive:true}
);

window.addEventListener(
  'resize',
  ms708ResizePager,
  {passive:true}
);

window.visualViewport?.addEventListener(
  'resize',
  ms708ResizePager,
  {passive:true}
);

window.visualViewport?.addEventListener(
  'scroll',
  ms708ResizePager,
  {passive:true}
);
