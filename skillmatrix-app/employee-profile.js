/* Uitgebreid persoonlijk medewerkersrapport. Wordt na app.js geladen. */
(function(){
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const fmt=v=>Number.isFinite(v)?v.toFixed(2).replace('.',','):'—';
  const pct=v=>Math.round((v||0)*100)+'%';
  const scoreClass=v=>Number.isFinite(v)?'s'+Math.round(v):'se';
  const catName=c=>String(c||'').startsWith('A')?'Basis':String(c||'').startsWith('B')?'Senior':'Extra verantwoordelijkheid';
  const activeSkills=()=>S.s.filter(s=>s[5]);
  const scoreMap=e=>S.x[String(e[0])]||{};

  function details(e){
    const skills=activeSkills(), x=scoreMap(e);
    const rows=skills.map(s=>{
      const v=x[s[0]], ok=Number.isFinite(v), diff=ok?v-s[3]:null;
      return {s,v,ok,diff,status:!ok?'Niet beoordeeld':v>=s[3]?(v===5?'Niveau 5':'Op niveau'):'Ontwikkelen'};
    });
    const assessed=rows.filter(r=>r.ok);
    const avg=assessed.length?assessed.reduce((a,r)=>a+r.v,0)/assessed.length:null;
    const byCat=prefix=>{
      const a=rows.filter(r=>String(r.s[2]).startsWith(prefix)&&r.ok);
      return a.length?a.reduce((n,r)=>n+r.v,0)/a.length:null;
    };
    const strengths=[...assessed].sort((a,b)=>b.v-a.v||a.s[1].localeCompare(b.s[1])).slice(0,5);
    const dev=rows.filter(r=>r.ok&&r.v<r.s[3]).sort((a,b)=>(b.s[3]-b.v)-(a.s[3]-a.v)||a.v-b.v).slice(0,7);
    const missing=rows.filter(r=>!r.ok);
    const audits=(S.log||[]).filter(l=>l.e===e[1]).slice(0,8);
    return {rows,assessed,avg,basis:byCat('A'),senior:byCat('B'),extra:byCat('C'),strengths,dev,missing,audits,
      coverage:skills.length?assessed.length/skills.length:0,under:rows.filter(r=>r.ok&&r.v<r.s[3]).length,lvl5:rows.filter(r=>r.v===5).length};
  }

  function stat(label,value,sub){return `<div class="card profile-stat"><span class="muted">${esc(label)}</span><b>${value}</b><span class="muted">${esc(sub||'')}</span></div>`}
  function miniRow(r,kind){
    const d=r.ok?`${r.v.toString().replace('.',',')} / doel ${r.s[3]}`:'Niet beoordeeld';
    return `<div class="profile-mini ${kind||''}"><div><b>${esc(r.s[1])}</b><span class="muted">${esc(catName(r.s[2]))}</span></div><span class="score ${scoreClass(r.v)}">${r.ok?String(r.v).replace('.',','):'—'}</span><span class="muted">${esc(d)}</span></div>`;
  }
  function status(r){
    const cl=r.status==='Ontwikkelen'?'crit':r.status==='Niet beoordeeld'?'neutral':r.status==='Niveau 5'?'expert':'good';
    return `<span class="status ${cl}">${esc(r.status)}</span>`;
  }

  window.openEmployeeProfile=function(id){
    const e=S.e.find(x=>String(x[0])===String(id)); if(!e)return;
    const d=details(e);
    $('#eye').textContent='Persoonlijk dossier';
    $('#title').textContent=e[1];
    $('#view').innerHTML=`
      <div class="profile-head card">
        <div class="profile-ident"><div class="profile-avatar">${esc(e[1].split(/\s+/).map(n=>n[0]).slice(0,2).join('').toUpperCase())}</div><div><h2>${esc(e[1])}</h2><div class="muted">${esc(e[2]||'Support')} · ${esc(e[3]||'—')}</div></div></div>
        <button class="btn s" id="back-emps">← Terug naar medewerkers</button>
      </div>
      <div class="grid profile-kpis">
        ${stat('Gemiddelde',fmt(d.avg),'Alle beoordeelde skills')}
        ${stat('Beoordeeld',pct(d.coverage),`${d.assessed.length}/${d.rows.length} skills`)}
        ${stat('Onder doel',d.under,'Ontwikkelpunten')}
        ${stat('Niveau 5',d.lvl5,'Expertises')}
      </div>
      <div class="grid profile-cats">
        ${stat('Basisvaardigheden',fmt(d.basis),'Categorie A')}
        ${stat('Senior / vakbekwaam',fmt(d.senior),'Categorie B')}
        ${stat('Extra verantwoordelijkheid',fmt(d.extra),'Categorie C')}
      </div>
      <div class="grid profile-two">
        <div class="card"><div class="section-title"><div><span class="eyebrow">STERKE PUNTEN</span><h2>Hoogste scores</h2></div></div>${d.strengths.length?d.strengths.map(r=>miniRow(r,'strong')).join(''):'<div class="muted">Nog geen beoordelingen.</div>'}</div>
        <div class="card"><div class="section-title"><div><span class="eyebrow warn">ONTWIKKELEN</span><h2>Onder doelniveau</h2></div></div>${d.dev.length?d.dev.map(r=>miniRow(r,'develop')).join(''):'<div class="muted">Geen beoordeelde skills onder doel.</div>'}</div>
      </div>
      ${d.missing.length?`<div class="card"><div class="section-title"><div><span class="eyebrow">NOG TE BEOORDELEN</span><h2>${d.missing.length} skills zonder score</h2></div></div><div class="missing-chips">${d.missing.map(r=>`<span>${esc(r.s[1])}</span>`).join('')}</div></div>`:''}
      <div class="card profile-skills"><div class="section-title"><div><span class="eyebrow">VOLLEDIG OVERZICHT</span><h2>Alle skills</h2></div><div class="legend-inline"><span class="score s1">1</span><span class="score s2">2</span><span class="score s3">3</span><span class="score s4">4</span><span class="score s5">5</span></div></div>
        <div class="profile-table-wrap"><table class="profile-table"><thead><tr><th>Skill</th><th>Categorie</th><th>Doel</th><th>Score</th><th>Status</th></tr></thead><tbody>${d.rows.map(r=>`<tr><td><b>${esc(r.s[1])}</b></td><td>${esc(catName(r.s[2]))}</td><td>${r.s[3]}</td><td><span class="score ${scoreClass(r.v)}">${r.ok?String(r.v).replace('.',','):'—'}</span></td><td>${status(r)}</td></tr>`).join('')}</tbody></table></div>
      </div>
      <div class="card"><div class="section-title"><div><span class="eyebrow">AUDITGESCHIEDENIS</span><h2>Recente audits</h2></div></div>${d.audits.length?`<div class="audit-history">${d.audits.map(a=>`<div><span class="muted">${new Date(a.d).toLocaleDateString('nl-NL')}</span><b>${esc(a.s)}</b><span class="score ${scoreClass(a.p)}">${a.p}</span></div>`).join('')}</div>`:'<div class="muted">Voor deze medewerker zijn in de test-app nog geen audits opgeslagen.</div>'}</div>`;
    $('#back-emps').onclick=()=>{location.hash='emps'; if(location.hash==='#emps') emps()};
    window.scrollTo({top:0,behavior:'smooth'});
  };

  // Vervang de medewerkerslijst zodat elke kaart het dossier opent.
  window.emps=function(){
    $('#view').innerHTML=`<div class="toolbar"><input id="q" class="inp" placeholder="Zoek medewerker"><select id="tf" class="sel"><option value="">Alle ploegen</option>${['Ploeg A','Ploeg B','Ploeg C','Ploeg D','Ploeg E'].map(t=>`<option>${t}</option>`).join('')}</select></div><div class="emps" id="elist"></div>`;
    const draw=()=>{
      const q=$('#q').value.toLowerCase(),t=$('#tf').value;
      $('#elist').innerHTML=S.e.filter(e=>e[4]&&(!q||e[1].toLowerCase().includes(q))&&(!t||e[2]===t)).map(e=>{
        const m=metrics(e);
        return `<button class="emp emp-open" data-id="${e[0]}"><div class="emp-top"><div><b>${esc(e[1])}</b><span class="muted">${esc(e[2]||'Support')} · ${esc(e[3])}</span></div><span class="emp-arrow">›</span></div><div class="chips"><span class="chip">Gem. ${fmt(m.avg)}</span><span class="chip">${pct(m.cov)} beoordeeld</span><span class="chip">${m.under} onder doel</span></div></button>`;
      }).join('');
      $$('.emp-open').forEach(b=>b.onclick=()=>openEmployeeProfile(b.dataset.id));
    };
    $('#q').oninput=draw; $('#tf').onchange=draw; draw();
  };
})();