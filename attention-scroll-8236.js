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
