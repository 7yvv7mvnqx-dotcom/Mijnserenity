/* MijnSerenity 8.23.6 — aandachtspunten direct openen */
(()=>{
  'use strict';
  if(window.__msAttentionScroll8236)return;
  window.__msAttentionScroll8236=true;

  const KEY='mijnserenity-pending-attention-v1';
  const CONFIG={
    technical:{label:'Techniek',selectors:[
      '#technicalAlertList .technical-alert.critical',
      '#technicalMaintenanceList .technical-maintenance-item.critical',
      '#technicalAlertList .technical-alert.warning',
      '#technicalMaintenanceList .technical-maintenance-item.warning',
      '#technicalAlertList','#technicalMaintenanceList'
    ]},
    rws:{label:'Vaarwegberichten',selectors:[
      '#rwsNoticeList .rws-notice.severity-urgent',
      '#rwsNoticeList .rws-notice.severity-warning',
      '#rwsNoticeList'
    ]},
    planner:{label:'Reisplanner',selectors:[
      '#plannerSavedList .planner-saved-item','#plannerSavedList'
    ]}
  };
  const num=value=>{const m=String(value??'').match(/\d+(?:[.,]\d+)?/);return m?Number(m[0].replace(',','.')):0};

  function installStyle(){
    if(document.getElementById('ms8236AttentionStyle'))return;
    const style=document.createElement('style');
    style.id='ms8236AttentionStyle';
    style.textContent='.ms8236-attention-focus{scroll-margin-top:calc(env(safe-area-inset-top) + 92px)!important;outline:2px solid rgba(58,211,255,.95)!important;outline-offset:4px!important;box-shadow:0 0 0 7px rgba(58,211,255,.12)!important}';
    document.head.appendChild(style);
  }

  function badgeState(root,target){
    const badge=[...root.querySelectorAll(`[data-ms8210-target="${target}"] .ms8234-card-badge`)]
      .find(node=>node.classList.contains('show')&&num(node.textContent)>0);
    if(!badge)return {target,count:0,level:'none'};
    const level=badge.classList.contains('critical')?'critical':badge.classList.contains('warning')?'warning':'info';
    return {target,count:num(badge.textContent),level};
  }

  function preferred(root){
    const rank={none:0,info:1,warning:2,critical:3};
    const order={technical:0,rws:1,planner:2};
    return ['technical','rws','planner'].map(target=>badgeState(root,target)).filter(state=>state.count>0)
      .sort((a,b)=>rank[b.level]-rank[a.level]||order[a.target]-order[b.target])[0]?.target||'technical';
  }

  function visible(node){
    if(!node)return false;
    try{return node.getClientRects().length>0&&getComputedStyle(node).visibility!=='hidden'}catch{return true}
  }

  function findTarget(target){
    for(const selector of CONFIG[target]?.selectors||[]){
      const node=document.querySelector(selector);
      if(node&&visible(node))return node;
    }
    return null;
  }

  function focus(target,attempt=0){
    const node=findTarget(target);
    if(node){
      try{sessionStorage.removeItem(KEY)}catch{}
      document.querySelectorAll('.ms8236-attention-focus').forEach(item=>item.classList.remove('ms8236-attention-focus'));
      node.classList.add('ms8236-attention-focus');
      requestAnimationFrame(()=>node.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'}));
      setTimeout(()=>node.classList.remove('ms8236-attention-focus'),2400);
      return;
    }
    const delays=[120,220,380,650,1100,1800];
    if(attempt<delays.length)setTimeout(()=>focus(target,attempt+1),delays[attempt]);
  }

  function queue(target){
    if(!CONFIG[target])return;
    try{sessionStorage.setItem(KEY,target)}catch{}
    focus(target);
  }

  function restore(){
    let target='';
    try{target=sessionStorage.getItem(KEY)||''}catch{}
    if(CONFIG[target])focus(target);
  }

  function wire(){
    installStyle();
    const root=document.getElementById('ms8210Start');
    if(!root)return;

    const summary=document.getElementById('ms8210Summary');
    if(summary){
      const target=preferred(root);
      summary.dataset.ms8210Target=target;
      summary.setAttribute('aria-label',`Open aandachtspunt in ${CONFIG[target]?.label||'Serenity'}`);
      if(!summary.dataset.ms8236AttentionWired){
        summary.dataset.ms8236AttentionWired='1';
        summary.addEventListener('click',()=>{if(num(summary.querySelector('.count')?.textContent)>0)queue(summary.dataset.ms8210Target)});
      }
    }

    ['planner','rws','technical'].forEach(target=>{
      root.querySelectorAll(`[data-ms8210-target="${target}"]`).forEach(button=>{
        const badge=button.querySelector('.ms8234-card-badge');
        if(!badge||button.dataset.ms8236AttentionWired)return;
        button.dataset.ms8236AttentionWired='1';
        button.addEventListener('click',()=>{if(badge.classList.contains('show')&&num(badge.textContent)>0)queue(target)});
      });
    });
  }

  let scheduled=false;
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;wire()});
  }

  function start(){
    wire();
    const dashboard=document.getElementById('dashboard');
    if(dashboard)new MutationObserver(schedule).observe(dashboard,{subtree:true,childList:true,characterData:true});
    ['mijnserenity:dashboard-ready','mijnserenity:routechange','storage'].forEach(name=>window.addEventListener(name,()=>{schedule();restore()},{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){schedule();restore()}},{passive:true});
    [150,500,1200,2500].forEach(ms=>setTimeout(schedule,ms));
    restore();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();

/* MijnSerenity 8.24.0 — filter POI's in reisplanner */
(()=>{
  'use strict';
  if(window.__msPlannerPoiFilter8240)return;
  window.__msPlannerPoiFilter8240=true;

  const FILTER_ID='plannerPoiCategoryFilter';
  const NONE='none';
  const STORE='mijnserenity-planner-poi-filter-v1';
  const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
  const norm=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const get=id=>document.getElementById(id);
  let oldCollect=null,oldSummary=null,oldMap=null,oldPoiRender=null,oldGpx=null;

  function disabled(){return clean(get('plannerPoiRadius')?.value)===NONE}
  function raw(plan){return Array.isArray(plan?.routePois)?plan.routePois:[]}
  function selected(){return clean(get(FILTER_ID)?.value||'all')||'all'}
  function filtered(plan){
    if(disabled())return [];
    const value=selected();
    return value==='all'?raw(plan):raw(plan).filter(p=>norm(p?.category||'POI')===norm(value));
  }
  function view(plan){return plan?{...plan,routePois:filtered(plan)}:plan}
  function save(value){try{localStorage.setItem(STORE,value||'all')}catch{}}
  function load(){try{return localStorage.getItem(STORE)||'all'}catch{return 'all'}}

  function categories(plan){
    const preferred=['Haven','Tankstation','Tankplaats','Restaurant','Café','Supermarkt','Sluis','Brug','Ankerplek','Toilet','Drinkwater','Trailerhelling','Bezienswaardigheid','Vaarobject','POI'];
    const values=[...new Set(raw(plan).map(p=>clean(p?.category||'POI')).filter(Boolean))];
    const rank=value=>{const i=preferred.findIndex(item=>norm(item)===norm(value));return i<0?999:i};
    return values.sort((a,b)=>rank(a)-rank(b)||a.localeCompare(b,'nl'));
  }

  function syncOptions(plan=window.plannerCurrentPlan){
    const select=get(FILTER_ID);if(!select)return;
    const previous=select.value||load();
    select.innerHTML='<option value="all">Alle POI’s</option>'+categories(plan).map(category=>`<option value="${esc(category)}">${esc(category)}</option>`).join('');
    select.value=[...select.options].some(option=>option.value===previous)?previous:'all';
  }

  function ensureUi(){
    const radius=get('plannerPoiRadius');if(!radius)return false;
    if(![...radius.options].some(option=>option.value===NONE)){
      const option=document.createElement('option');option.value=NONE;option.textContent='Geen';radius.prepend(option);
    }
    if(radius.dataset.ms8240Bound!=='1'){
      radius.dataset.ms8240Bound='1';
      radius.removeAttribute('onchange');radius.onchange=null;
      radius.addEventListener('change',()=>{
        if(disabled()&&window.plannerCurrentPlan){rerender();return}
        if(typeof window.plannerFormChanged==='function')window.plannerFormChanged();
      });
    }
    if(!get(FILTER_ID)){
      const field=document.createElement('div');
      field.className='ms8240-poi-filter-field';
      field.innerHTML=`<label for="${FILTER_ID}">Filter POI’s</label><select id="${FILTER_ID}"><option value="all">Alle POI’s</option></select><small class="ms8240-poi-filter-note">Filter de lijst en kaart op soort.</small>`;
      radius.closest('div')?.insertAdjacentElement('afterend',field);
      const select=get(FILTER_ID);
      if(select){select.value=load();select.addEventListener('change',()=>{save(select.value);rerender()})}
      if(!get('ms8240PoiStyle')){
        const style=document.createElement('style');style.id='ms8240PoiStyle';style.textContent='.ms8240-poi-filter-field{min-width:0}.ms8240-poi-filter-note{display:block;margin-top:5px;font-size:.76rem;opacity:.66}#plannerPoiCategoryFilter{width:100%}.ms8240-filter-chip{display:inline-flex;margin:0 0 10px;padding:5px 9px;border-radius:999px;border:1px solid rgba(83,183,229,.25);background:rgba(65,172,225,.13);font-size:.75rem;font-weight:800}';document.head.appendChild(style);
      }
    }
    syncOptions();
    return true;
  }

  function chip(plan){
    const box=get('plannerRoutePois');if(!box||box.classList.contains('hidden'))return;
    let node=box.querySelector('.ms8240-filter-chip');
    if(!node){node=document.createElement('span');node.className='ms8240-filter-chip';box.prepend(node)}
    node.textContent=disabled()?'POI’s: geen':selected()==='all'?`${filtered(plan).length} POI’s zichtbaar`:`${selected()}: ${filtered(plan).length} van ${raw(plan).length}`;
  }

  function rerender(){
    const plan=window.plannerCurrentPlan;if(!plan)return;
    syncOptions(plan);
    if(typeof window.renderPlannerSummary==='function')window.renderPlannerSummary(plan);
    requestAnimationFrame(()=>chip(plan));
  }

  function patch(){
    if(typeof window.ms650CollectRoutePois==='function'&&!oldCollect){oldCollect=window.ms650CollectRoutePois;window.ms650CollectRoutePois=function(a,b){return disabled()?[]:oldCollect.call(this,a,b)}}
    if(typeof window.renderPlannerMap==='function'&&!oldMap){oldMap=window.renderPlannerMap;window.renderPlannerMap=function(plan){return oldMap.call(this,view(plan))}}
    if(typeof window.ms650RenderRoutePois==='function'&&!oldPoiRender){oldPoiRender=window.ms650RenderRoutePois;window.ms650RenderRoutePois=function(plan){const result=oldPoiRender.call(this,view(plan));requestAnimationFrame(()=>chip(plan));return result}}
    if(typeof window.renderPlannerSummary==='function'&&!oldSummary){oldSummary=window.renderPlannerSummary;window.renderPlannerSummary=function(plan){syncOptions(plan);const result=oldSummary.call(this,view(plan));requestAnimationFrame(()=>chip(plan));return result}}
    if(typeof window.ms640PlannerGpx==='function'&&!oldGpx){oldGpx=window.ms640PlannerGpx;window.ms640PlannerGpx=function(plan){return oldGpx.call(this,view(plan))}}
  }

  function start(){
    ensureUi();patch();
    let tries=0;const timer=setInterval(()=>{tries++;ensureUi();patch();if(tries>24||oldSummary)clearInterval(timer)},250);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('mijnserenity:routechange',()=>setTimeout(()=>{ensureUi();patch()},0),{passive:true});
})();
