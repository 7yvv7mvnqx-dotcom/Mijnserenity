/* MijnSerenity 8.24.0 — POI-filter voor de reisplanner + keuze Geen */
(()=>{
  'use strict';
  if(window.__msRoutePoiFilter8240)return;
  window.__msRoutePoiFilter8240=true;

  const FILTER_ID='plannerPoiCategoryFilter';
  const STORAGE_KEY='mijnserenity-planner-poi-category-filter-v1';
  const NONE_VALUE='none';
  const $=id=>document.getElementById(id);
  const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
  const normalise=value=>clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase();

  let installed=false;
  let originalCollect=null;
  let originalRenderSummary=null;
  let originalRenderMap=null;
  let originalRenderRoutePois=null;
  let originalPlannerGpx=null;

  function selectedFilter(){
    return clean($(FILTER_ID)?.value||'all')||'all';
  }

  function poiDisabled(){
    return clean($('plannerPoiRadius')?.value)===NONE_VALUE;
  }

  function rawPois(plan){
    return Array.isArray(plan?.routePois)?plan.routePois:[];
  }

  function filteredPois(plan){
    if(poiDisabled())return [];
    const filter=selectedFilter();
    const pois=rawPois(plan);
    if(filter==='all')return pois;
    const wanted=normalise(filter);
    return pois.filter(point=>normalise(point?.category||'POI')===wanted);
  }

  function viewPlan(plan){
    if(!plan)return plan;
    return {
      ...plan,
      routePois:filteredPois(plan)
    };
  }

  function preferredCategoryOrder(categories){
    const preferred=[
      'Haven','Tankstation','Tankplaats','Restaurant','Café','Supermarkt',
      'Sluis','Brug','Ankerplek','Toilet','Drinkwater','Trailerhelling',
      'Bezienswaardigheid','Vaarobject','POI'
    ];
    const rank=value=>{
      const index=preferred.findIndex(item=>normalise(item)===normalise(value));
      return index<0?999:index;
    };
    return [...categories].sort((a,b)=>
      rank(a)-rank(b)||a.localeCompare(b,'nl')
    );
  }

  function syncCategoryOptions(plan=window.plannerCurrentPlan){
    const select=$(FILTER_ID);
    if(!select)return;

    const current=clean(select.value||readStoredFilter()||'all')||'all';
    const categories=new Set(
      rawPois(plan)
        .map(point=>clean(point?.category||'POI'))
        .filter(Boolean)
    );

    const options=preferredCategoryOrder(categories);
    select.innerHTML=[
      '<option value="all">Alle POI’s</option>',
      ...options.map(category=>
        `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
      )
    ].join('');

    const exists=[...select.options].some(option=>option.value===current);
    select.value=exists?current:'all';
  }

  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,ch=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
  }

  function readStoredFilter(){
    try{return localStorage.getItem(STORAGE_KEY)||'all'}catch{return 'all'}
  }

  function saveFilter(value){
    try{localStorage.setItem(STORAGE_KEY,value||'all')}catch{}
  }

  function ensureStyles(){
    if($('ms8240RoutePoiFilterStyle'))return;
    const style=document.createElement('style');
    style.id='ms8240RoutePoiFilterStyle';
    style.textContent=`
      .ms8240-poi-filter-field{min-width:0}
      .ms8240-poi-filter-note{display:block;margin-top:5px;font-size:.76rem;opacity:.66;line-height:1.25}
      #plannerPoiCategoryFilter{width:100%}
      .ms8240-poi-filter-summary{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin:0 0 10px}
      .ms8240-poi-filter-chip{display:inline-flex;align-items:center;min-height:28px;padding:5px 9px;border-radius:999px;background:rgba(65,172,225,.13);border:1px solid rgba(83,183,229,.24);font-size:.75rem;font-weight:800}
    `;
    document.head.appendChild(style);
  }

  function ensureRadiusNone(){
    const radius=$('plannerPoiRadius');
    if(!radius)return false;

    if(![...radius.options].some(option=>option.value===NONE_VALUE)){
      const option=document.createElement('option');
      option.value=NONE_VALUE;
      option.textContent='Geen';
      radius.insertBefore(option,radius.firstChild);
    }

    if(radius.dataset.ms8240Bound!=='1'){
      radius.dataset.ms8240Bound='1';
      radius.removeAttribute('onchange');
      radius.onchange=null;
      radius.addEventListener('change',()=>{
        if(poiDisabled()){
          if(window.plannerCurrentPlan){
            rerenderCurrentPlan();
            setPlannerPoiStatus(window.plannerCurrentPlan);
          }else if(typeof window.plannerFormChanged==='function'){
            window.plannerFormChanged();
          }
          return;
        }
        if(typeof window.plannerFormChanged==='function')window.plannerFormChanged();
      });
    }
    return true;
  }

  function ensureFilterField(){
    const radius=$('plannerPoiRadius');
    if(!radius)return false;
    ensureStyles();

    let select=$(FILTER_ID);
    if(!select){
      const field=document.createElement('div');
      field.className='ms8240-poi-filter-field';
      field.innerHTML=`
        <label for="${FILTER_ID}">Filter POI’s</label>
        <select id="${FILTER_ID}" aria-label="Filter POI’s op categorie">
          <option value="all">Alle POI’s</option>
        </select>
        <small class="ms8240-poi-filter-note">Toon alleen de gekozen soort op kaart en in de lijst.</small>
      `;
      radius.closest('div')?.insertAdjacentElement('afterend',field);
      select=$(FILTER_ID);
      if(!select)return false;

      select.value=readStoredFilter();
      select.addEventListener('change',()=>{
        saveFilter(select.value);
        rerenderCurrentPlan();
        setPlannerPoiStatus(window.plannerCurrentPlan);
      });
    }

    syncCategoryOptions(window.plannerCurrentPlan);
    return true;
  }

  function setPlannerPoiStatus(plan){
    if(!plan)return;
    const total=rawPois(plan).length;
    const shown=filteredPois(plan).length;
    const container=$('plannerRoutePois');
    if(container&&!container.classList.contains('hidden')){
      let strip=container.querySelector('.ms8240-poi-filter-summary');
      if(!strip){
        strip=document.createElement('div');
        strip.className='ms8240-poi-filter-summary';
        container.prepend(strip);
      }
      if(poiDisabled()){
        strip.innerHTML='<span class="ms8240-poi-filter-chip">POI’s: geen</span>';
      }else if(selectedFilter()==='all'){
        strip.innerHTML=`<span class="ms8240-poi-filter-chip">${shown} POI’s zichtbaar</span>`;
      }else{
        strip.innerHTML=`<span class="ms8240-poi-filter-chip">${escapeHtml(selectedFilter())}: ${shown}</span><span class="ms8240-poi-filter-chip">totaal ${total}</span>`;
      }
    }
  }

  function rerenderCurrentPlan(){
    const plan=window.plannerCurrentPlan;
    if(!plan)return;
    syncCategoryOptions(plan);
    if(typeof window.renderPlannerSummary==='function'){
      window.renderPlannerSummary(plan);
    }else{
      if(typeof window.ms650RenderRoutePois==='function')window.ms650RenderRoutePois(plan);
      if(typeof window.renderPlannerMap==='function')window.renderPlannerMap(plan);
    }
    requestAnimationFrame(()=>setPlannerPoiStatus(plan));
  }

  function patchFunctions(){
    if(typeof window.ms650CollectRoutePois==='function'&&!originalCollect){
      originalCollect=window.ms650CollectRoutePois;
      window.ms650CollectRoutePois=function(routeCoordinates,anchorPoints){
        if(poiDisabled())return [];
        return originalCollect.call(this,routeCoordinates,anchorPoints);
      };
    }

    if(typeof window.renderPlannerMap==='function'&&!originalRenderMap){
      originalRenderMap=window.renderPlannerMap;
      window.renderPlannerMap=function(plan){
        return originalRenderMap.call(this,viewPlan(plan));
      };
    }

    if(typeof window.ms650RenderRoutePois==='function'&&!originalRenderRoutePois){
      originalRenderRoutePois=window.ms650RenderRoutePois;
      window.ms650RenderRoutePois=function(plan){
        const result=originalRenderRoutePois.call(this,viewPlan(plan));
        requestAnimationFrame(()=>setPlannerPoiStatus(plan));
        return result;
      };
    }

    if(typeof window.renderPlannerSummary==='function'&&!originalRenderSummary){
      originalRenderSummary=window.renderPlannerSummary;
      window.renderPlannerSummary=function(plan){
        syncCategoryOptions(plan);
        const result=originalRenderSummary.call(this,viewPlan(plan));
        requestAnimationFrame(()=>setPlannerPoiStatus(plan));
        return result;
      };
    }

    if(typeof window.ms640PlannerGpx==='function'&&!originalPlannerGpx){
      originalPlannerGpx=window.ms640PlannerGpx;
      window.ms640PlannerGpx=function(plan){
        return originalPlannerGpx.call(this,viewPlan(plan));
      };
    }
  }

  function install(){
    const ready=ensureRadiusNone()&&ensureFilterField();
    patchFunctions();
    installed=ready;
    return ready;
  }

  function start(){
    install();
    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      patchFunctions();
      if(!installed)install();
      if(installed&&originalRenderSummary&&attempts>4)clearInterval(timer);
      if(attempts>40)clearInterval(timer);
    },250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  window.addEventListener('mijnserenity:routechange',event=>{
    const detail=event?.detail;
    const route=typeof detail==='string'?detail:(detail?.route||detail?.id||detail?.target);
    if(String(route||'').toLowerCase()==='planner')setTimeout(()=>{
      install();
      if(window.plannerCurrentPlan){
        syncCategoryOptions(window.plannerCurrentPlan);
        setPlannerPoiStatus(window.plannerCurrentPlan);
      }
    },0);
  },{passive:true});
})();
