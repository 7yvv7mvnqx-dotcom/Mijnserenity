/* Interactieve verdieping op de cijferkaarten in het medewerkersdossier. */
(function(){
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const fmt=v=>Number.isFinite(v)?v.toFixed(2).replace('.',','):'—';
  const pct=v=>Math.round((v||0)*100)+'%';
  const catName=c=>String(c||'').startsWith('A')?'Basisvaardigheden':String(c||'').startsWith('B')?'Senior / vakbekwaam':'Extra verantwoordelijkheid';
  const scoreName=v=>({1:'Geen kennis',2:'Basis / begeleiding',3:'Beperkt zelfstandig',4:'Zelfstandig vakbekwaam',5:'Expert / opleider'})[v]||'Niet beoordeeld';
  const activeSkills=()=>S.s.filter(s=>s[5]);

  function dataset(employee){
    const x=S.x[String(employee[0])]||{};
    const rows=activeSkills().map(s=>{
      const v=x[s[0]], ok=Number.isFinite(v), gap=ok?s[3]-v:null;
      return {s,v,ok,gap,status:!ok?'Niet beoordeeld':v>=s[3]?(v===5?'Niveau 5':'Op niveau'):'Onder doel'};
    });
    const assessed=rows.filter(r=>r.ok), missing=rows.filter(r=>!r.ok), under=rows.filter(r=>r.ok&&r.v<r.s[3]);
    const avg=assessed.length?assessed.reduce((a,r)=>a+r.v,0)/assessed.length:null;
    return {rows,assessed,missing,under,avg,coverage:rows.length?assessed.length/rows.length:0,lvl5:rows.filter(r=>r.v===5)};
  }

  function stats(rows){
    const assessed=rows.filter(r=>r.ok), missing=rows.filter(r=>!r.ok), under=rows.filter(r=>r.ok&&r.v<r.s[3]);
    const avg=assessed.length?assessed.reduce((a,r)=>a+r.v,0)/assessed.length:null;
    return {rows,assessed,missing,under,avg,coverage:rows.length?assessed.length/rows.length:0,lvl5:rows.filter(r=>r.v===5)};
  }

  function dist(rows){
    const d={1:0,2:0,3:0,4:0,5:0}; rows.filter(r=>r.ok).forEach(r=>d[Math.round(r.v)]++); return d;
  }
  function distHtml(rows){
    const d=dist(rows), max=Math.max(1,...Object.values(d));
    return `<div class="insight-dist">${[1,2,3,4,5].map(n=>`<div class="insight-dist-row"><span class="score s${n}">${n}</span><div class="insight-bar"><i style="width:${(d[n]/max)*100}%"></i></div><b>${d[n]}</b><span>${scoreName(n)}</span></div>`).join('')}</div>`;
  }
  function statusChip(r){
    const cl=!r.ok?'neutral':r.v>=r.s[3]?(r.v===5?'expert':'good'):'crit';
    return `<span class="status ${cl}">${esc(r.status)}</span>`;
  }
  function rowHtml(r,showGap){
    const score=r.ok?`<span class="score s${Math.round(r.v)}">${r.v}</span>`:`<span class="score se">—</span>`;
    const extra=showGap&&r.ok&&r.gap>0?`<span class="insight-gap">-${r.gap}</span>`:'';
    return `<div class="insight-skill"><div><b>${esc(r.s[1])}</b><span>${esc(catName(r.s[2]))} · doel ${r.s[3]}</span></div><div class="insight-skill-meta">${score}${extra}${statusChip(r)}</div></div>`;
  }
  function listHtml(rows,empty,showGap){return rows.length?`<div class="insight-list">${rows.map(r=>rowHtml(r,showGap)).join('')}</div>`:`<div class="insight-empty">${esc(empty)}</div>`}
  function categoryGrid(d){
    return `<div class="insight-cat-grid">${[['A','Basis'],['B','Senior'],['C','Extra']].map(([p,label])=>{
      const s=stats(d.rows.filter(r=>String(r.s[2]).startsWith(p)));
      return `<div class="insight-mini-card"><span>${label}</span><b>${fmt(s.avg)}</b><small>${s.assessed.length}/${s.rows.length} beoordeeld · ${s.under.length} onder doel</small></div>`;
    }).join('')}</div>`;
  }
  function summaryText(key,d,sub){
    if(key==='avg') return `De gemiddelde score is ${fmt(d.avg)} over ${d.assessed.length} beoordeelde skills. ${d.under.length} skills zitten onder het doelniveau en ${d.lvl5.length} skills staan op niveau 5.`;
    if(key==='coverage') return `${d.assessed.length} van ${d.rows.length} actieve skills zijn beoordeeld (${pct(d.coverage)}). Er ontbreken nog ${d.missing.length} beoordelingen.`;
    if(key==='under') return d.under.length?`${d.under.length} skills zitten onder doel. Het grootste tekort is ${Math.max(...d.under.map(r=>r.gap))} niveaupunt(en). De lijst hieronder staat op grootste tekort.`:'Alle beoordeelde skills zijn op of boven het ingestelde doelniveau.';
    if(key==='lvl5') return d.lvl5.length?`${d.lvl5.length} skills staan op niveau 5. Dit zijn de aantoonbare expertises van deze medewerker.`:'Er zijn nog geen skills op niveau 5. Onder “Dicht bij niveau 5” zie je de hoogst beoordeelde skills die mogelijk verder ontwikkeld kunnen worden.';
    return `${sub.assessed.length} van ${sub.rows.length} ${catName(sub.rows[0]?.s[2]||'')} zijn beoordeeld. Gemiddelde ${fmt(sub.avg)}, ${sub.under.length} onder doel en ${sub.lvl5.length} op niveau 5.`;
  }

  function insightContent(employee,key){
    const d=dataset(employee);
    const titles={avg:'Gemiddelde score',coverage:'Beoordelingsgraad',under:'Onder doelniveau',lvl5:'Niveau 5 expertise',basis:'Basisvaardigheden',senior:'Senior / vakbekwaam',extra:'Extra verantwoordelijkheid'};
    let sub=d, body='';
    if(['basis','senior','extra'].includes(key)){
      const prefix={basis:'A',senior:'B',extra:'C'}[key];
      sub=stats(d.rows.filter(r=>String(r.s[2]).startsWith(prefix)));
      const ordered=[...sub.rows].sort((a,b)=>(b.ok?1:0)-(a.ok?1:0)||(a.ok&&b.ok?b.v-a.v:0)||a.s[1].localeCompare(b.s[1]));
      body=`<div class="insight-kpis"><div><span>Gemiddelde</span><b>${fmt(sub.avg)}</b></div><div><span>Beoordeeld</span><b>${pct(sub.coverage)}</b></div><div><span>Onder doel</span><b>${sub.under.length}</b></div><div><span>Niveau 5</span><b>${sub.lvl5.length}</b></div></div>${distHtml(sub.rows)}<h3>Alle skills in deze categorie</h3>${listHtml(ordered,'Geen skills in deze categorie.',false)}`;
    } else if(key==='avg'){
      const best=[...d.assessed].sort((a,b)=>b.v-a.v||a.s[1].localeCompare(b.s[1])).slice(0,5);
      const low=[...d.assessed].sort((a,b)=>a.v-b.v||b.gap-a.gap).slice(0,5);
      body=`${categoryGrid(d)}${distHtml(d.rows)}<div class="insight-columns"><div><h3>Hoogste scores</h3>${listHtml(best,'Nog geen scores.',false)}</div><div><h3>Laagste scores</h3>${listHtml(low,'Nog geen scores.',false)}</div></div>`;
    } else if(key==='coverage'){
      body=`${categoryGrid(d)}<div class="insight-progress"><div><i style="width:${d.coverage*100}%"></i></div><b>${pct(d.coverage)}</b></div><h3>Nog te beoordelen (${d.missing.length})</h3>${listHtml(d.missing,'Alles is beoordeeld.',false)}`;
    } else if(key==='under'){
      const under=[...d.under].sort((a,b)=>b.gap-a.gap||a.v-b.v||a.s[1].localeCompare(b.s[1]));
      const byCat=['A','B','C'].map(p=>({p,n:under.filter(r=>String(r.s[2]).startsWith(p)).length}));
      body=`<div class="insight-kpis"><div><span>Basis</span><b>${byCat[0].n}</b></div><div><span>Senior</span><b>${byCat[1].n}</b></div><div><span>Extra</span><b>${byCat[2].n}</b></div><div><span>Totaal</span><b>${under.length}</b></div></div><h3>Opleidingsprioriteit</h3>${listHtml(under,'Geen skills onder doel.',true)}`;
    } else if(key==='lvl5'){
      const near=[...d.assessed].filter(r=>r.v===4).sort((a,b)=>a.s[1].localeCompare(b.s[1])).slice(0,10);
      body=`<h3>Expertises</h3>${listHtml(d.lvl5,'Nog geen niveau-5 skills.',false)}<h3>Dicht bij niveau 5</h3>${listHtml(near,'Nog geen niveau-4 skills beschikbaar.',false)}`;
    }
    return {title:titles[key]||'Inzicht',summary:summaryText(key,d,sub),body};
  }

  function closeInsight(){document.querySelector('#profile-insight')?.remove();document.body.classList.remove('insight-open')}
  function openInsight(employeeId,key){
    const e=S.e.find(x=>String(x[0])===String(employeeId)); if(!e)return;
    const c=insightContent(e,key);
    closeInsight();
    document.body.insertAdjacentHTML('beforeend',`<div class="insight-backdrop" id="profile-insight"><section class="insight-panel" role="dialog" aria-modal="true" aria-label="${esc(c.title)}"><div class="insight-head"><div><span class="eyebrow">VERDIEPING</span><h2>${esc(c.title)}</h2><p>${esc(e[1])}</p></div><button class="insight-close" aria-label="Sluiten">×</button></div><div class="insight-summary"><b>Samenvatting</b><p>${esc(c.summary)}</p></div><div class="insight-body">${c.body}</div></section></div>`);
    document.body.classList.add('insight-open');
    const root=document.querySelector('#profile-insight');
    root.querySelector('.insight-close').onclick=closeInsight;
    root.onclick=ev=>{if(ev.target===root)closeInsight()};
    document.addEventListener('keydown',function escClose(ev){if(ev.key==='Escape'){closeInsight();document.removeEventListener('keydown',escClose)}});
  }

  function enhance(employeeId){
    const cards=[...document.querySelectorAll('.profile-stat')];
    const map=['avg','coverage','under','lvl5','basis','senior','extra'];
    cards.forEach((card,i)=>{
      const key=map[i]; if(!key)return;
      card.classList.add('profile-stat-click'); card.setAttribute('role','button'); card.setAttribute('tabindex','0'); card.dataset.insight=key;
      card.insertAdjacentHTML('beforeend','<span class="profile-stat-more">Bekijk details →</span>');
      card.onclick=()=>openInsight(employeeId,key);
      card.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();openInsight(employeeId,key)}};
    });
  }

  const original=window.openEmployeeProfile;
  if(typeof original==='function'){
    window.openEmployeeProfile=function(id){original(id);setTimeout(()=>enhance(id),0)};
  }
})();