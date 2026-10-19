/* Uitgebreid ploegoverzicht. Wordt na app.js/employee-profile.js geladen. */
(function(){
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const fmt=v=>Number.isFinite(v)?v.toFixed(2).replace('.',','):'—';
  const pct=v=>Math.round((v||0)*100)+'%';
  const catName=c=>String(c||'').startsWith('A')?'Basis':String(c||'').startsWith('B')?'Senior':'Extra verantwoordelijkheid';
  const activeSkills=()=>S.s.filter(s=>s[5]);
  const teamEmployees=team=>S.e.filter(e=>e[4]&&e[2]===team);
  const scoreMap=e=>S.x[String(e[0])]||{};

  function teamDetails(team){
    const employees=teamEmployees(team), skills=activeSkills();
    const employeeRows=employees.map(e=>({e,m:metrics(e)}));
    const assessedEmployee=employeeRows.filter(r=>r.m.avg!=null);
    const avg=assessedEmployee.length?assessedEmployee.reduce((a,r)=>a+r.m.avg,0)/assessedEmployee.length:null;
    const coverage=employeeRows.length?employeeRows.reduce((a,r)=>a+r.m.cov,0)/employeeRows.length:0;
    const skillRows=skills.map(s=>{
      const vals=employees.map(e=>scoreMap(e)[s[0]]).filter(Number.isFinite);
      const average=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
      const under=vals.filter(v=>v<s[3]).length;
      const lvl5=vals.filter(v=>v===5).length;
      const cov=employees.length?vals.length/employees.length:0;
      const on=vals.filter(v=>v>=s[3]).length;
      const onPct=vals.length?on/vals.length:0;
      const gap=average==null?null:s[3]-average;
      const status=vals.length===0?'Niet beoordeeld':cov<.75?'Onvolledig':onPct<.5?'KRITIEK':onPct<.75?'Aandacht':'Op niveau';
      return {s,vals,average,under,lvl5,cov,on,onPct,gap,status};
    });
    const categoryAvg=prefix=>{
      const values=[];
      employees.forEach(e=>skills.filter(s=>String(s[2]).startsWith(prefix)).forEach(s=>{
        const v=scoreMap(e)[s[0]]; if(Number.isFinite(v)) values.push(v);
      }));
      return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
    };
    const strengths=skillRows.filter(r=>r.average!=null).sort((a,b)=>b.average-a.average||b.onPct-a.onPct).slice(0,6);
    const needs=skillRows.filter(r=>r.vals.length&&r.under).sort((a,b)=>(b.gap||0)-(a.gap||0)||b.under-a.under).slice(0,8);
    const missing=skillRows.filter(r=>r.cov<1).sort((a,b)=>a.cov-b.cov||a.s[1].localeCompare(b.s[1]));
    const underCount=skillRows.reduce((a,r)=>a+r.under,0);
    const lvl5Count=skillRows.reduce((a,r)=>a+r.lvl5,0);
    const roles=[...new Set(employees.map(e=>e[3]).filter(Boolean))];
    const names=new Set(employees.map(e=>e[1]));
    const audits=(S.log||[]).filter(l=>names.has(l.e)).slice(0,10);
    return {employees,employeeRows,skills,skillRows,avg,coverage,basis:categoryAvg('A'),senior:categoryAvg('B'),extra:categoryAvg('C'),strengths,needs,missing,underCount,lvl5Count,roles,audits};
  }

  function stat(label,value,sub){return `<div class="card profile-stat"><span class="muted">${esc(label)}</span><b>${value}</b><span class="muted">${esc(sub||'')}</span></div>`}
  function statusHtml(r){
    const cl=r.status==='KRITIEK'?'crit':r.status==='Aandacht'?'att':r.status==='Op niveau'?'good':'neutral';
    return `<span class="status ${cl}">${esc(r.status)}</span>`;
  }
  function skillMini(r,kind){
    return `<div class="team-skill-mini ${kind||''}"><div><b>${esc(r.s[1])}</b><span class="muted">${esc(catName(r.s[2]))} · ${r.vals.length}/${teamEmployees(window.__rseTeam||'').length} beoordeeld</span></div><b>${fmt(r.average)}</b>${statusHtml(r)}</div>`;
  }

  window.openTeamProfile=function(team){
    window.__rseTeam=team;
    const d=teamDetails(team);
    $('#eye').textContent='Ploegoverzicht';
    $('#title').textContent=team;
    const members=d.employeeRows.map(({e,m})=>`<button class="team-member emp-open" data-id="${e[0]}"><div><b>${esc(e[1])}</b><span class="muted">${esc(e[3]||'—')}</span></div><div class="chips"><span class="chip">Gem. ${fmt(m.avg)}</span><span class="chip">${pct(m.cov)}</span><span class="chip">${m.under} onder doel</span></div><span class="emp-arrow">›</span></button>`).join('');
    $('#view').innerHTML=`
      <div class="profile-head card">
        <div class="profile-ident"><div class="team-avatar">${esc(team.replace('Ploeg ','P'))}</div><div><h2>${esc(team)}</h2><div class="muted">${d.employees.length} actieve medewerkers · ${esc(d.roles.join(' / ')||'—')}</div></div></div>
        <button class="btn s" id="back-dash">← Terug naar dashboard</button>
      </div>
      <div class="grid profile-kpis">
        ${stat('Medewerkers',d.employees.length,'Actief in deze ploeg')}
        ${stat('Gemiddelde',fmt(d.avg),'Gemiddelde per medewerker')}
        ${stat('Beoordeeld',pct(d.coverage),'Gemiddelde dekking')}
        ${stat('Onder doel',d.underCount,'Beoordeelde skill-scores')}
      </div>
      <div class="grid profile-cats">
        ${stat('Basisvaardigheden',fmt(d.basis),'Categorie A')}
        ${stat('Senior / vakbekwaam',fmt(d.senior),'Categorie B')}
        ${stat('Extra verantwoordelijkheid',fmt(d.extra),'Categorie C')}
      </div>
      <div class="card team-members-card"><div class="section-title"><div><span class="eyebrow">TEAM</span><h2>Medewerkers</h2></div><span class="muted">Klik voor persoonlijk dossier</span></div><div class="team-member-grid">${members}</div></div>
      <div class="grid profile-two">
        <div class="card"><div class="section-title"><div><span class="eyebrow">STERKE SKILLS</span><h2>Hoogste ploeggemiddelden</h2></div></div>${d.strengths.length?d.strengths.map(r=>skillMini(r,'strong')).join(''):'<div class="muted">Nog onvoldoende beoordelingen.</div>'}</div>
        <div class="card"><div class="section-title"><div><span class="eyebrow warn">OPLEIDING</span><h2>Grootste ontwikkelbehoefte</h2></div></div>${d.needs.length?d.needs.map(r=>skillMini(r,'develop')).join(''):'<div class="muted">Geen beoordeelde skills onder doel.</div>'}</div>
      </div>
      ${d.missing.length?`<div class="card"><div class="section-title"><div><span class="eyebrow">BEOORDELINGSACHTERSTAND</span><h2>${d.missing.length} skills niet volledig beoordeeld</h2></div></div><div class="coverage-list">${d.missing.slice(0,14).map(r=>`<div><b>${esc(r.s[1])}</b><div class="bar"><i style="width:${r.cov*100}%"></i></div><span>${pct(r.cov)}</span></div>`).join('')}</div></div>`:''}
      <div class="card profile-skills"><div class="section-title"><div><span class="eyebrow">VOLLEDIGE ANALYSE</span><h2>Alle skills van ${esc(team)}</h2></div><div class="legend-inline"><span class="score s1">1</span><span class="score s2">2</span><span class="score s3">3</span><span class="score s4">4</span><span class="score s5">5</span></div></div>
        <div class="profile-table-wrap"><table class="profile-table team-analysis"><thead><tr><th>Skill</th><th>Categorie</th><th>Doel</th><th>Gem.</th><th>Beoordeeld</th><th>Onder doel</th><th>Niveau 5</th><th>Status</th></tr></thead><tbody>${d.skillRows.map(r=>`<tr><td><b>${esc(r.s[1])}</b></td><td>${esc(catName(r.s[2]))}</td><td>${r.s[3]}</td><td><b>${fmt(r.average)}</b></td><td>${r.vals.length}/${d.employees.length}</td><td>${r.under}</td><td>${r.lvl5}</td><td>${statusHtml(r)}</td></tr>`).join('')}</tbody></table></div>
      </div>
      <div class="card"><div class="section-title"><div><span class="eyebrow">AUDITS</span><h2>Recente audits in deze ploeg</h2></div></div>${d.audits.length?`<div class="team-audits">${d.audits.map(a=>`<div><span class="muted">${new Date(a.d).toLocaleDateString('nl-NL')}</span><b>${esc(a.e)}</b><span>${esc(a.s)}</span><span class="score s${a.p}">${a.p}</span></div>`).join('')}</div>`:'<div class="muted">In deze test-app zijn voor deze ploeg nog geen audits opgeslagen.</div>'}</div>`;

    $('#back-dash').onclick=()=>{location.hash='dash'; if(location.hash==='#dash') dash()};
    $$('.team-member').forEach(b=>b.onclick=()=>window.openEmployeeProfile&&openEmployeeProfile(b.dataset.id));
    window.scrollTo({top:0,behavior:'smooth'});
  };

  // Dashboard: ploegregels worden klikbaar en openen het ploegoverzicht.
  window.dash=function(){
    const es=prod(),ms=es.map(metrics),avg=ms.filter(m=>m.avg!=null),g=avg.length?avg.reduce((a,b)=>a+b.avg,0)/avg.length:0,cov=ms.length?ms.reduce((a,b)=>a+b.cov,0)/ms.length:0,teams=['Ploeg A','Ploeg B','Ploeg C','Ploeg D','Ploeg E'];
    $('#view').innerHTML=`<div class="grid kpis">${k('Actief totaal',S.e.filter(e=>e[4]).length,'Medewerkers')}${k('Actief productie',es.length,'Met ploeg')}${k('Gem. score',fmt(g),'Alle beoordeelde skills')}${k('Beoordeeld',pct(cov),'Dekking')}</div><div class="grid two"><div class="card"><div class="section-title"><h2>Ploegen</h2><span class="muted">Klik voor uitgebreid overzicht</span></div>${teams.map(t=>{let a=es.filter(e=>e[2]===t),m=a.map(metrics),av=m.length?m.reduce((x,y)=>x+(y.avg||0),0)/m.length:0;return`<button class="team team-open" data-team="${esc(t)}"><b>${esc(t)}</b><div><div class="bar"><i style="width:${av/5*100}%"></i></div><span class="muted">${a.length} medewerkers</span></div><b>${fmt(av)}</b><span class="team-chevron">›</span></button>`}).join('')}</div><div class="card"><h2>Opleidingsaandacht</h2>${needs().slice(0,6).map(r=>rr(r)).join('')||'<div class="muted">Geen aandachtspunten.</div>'}</div></div>`;
    $$('.team-open').forEach(b=>b.onclick=()=>openTeamProfile(b.dataset.team));
  };
})();