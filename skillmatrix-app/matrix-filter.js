// Extra filter voor de Skillmatrix: ploeg + medewerker.
window.mat = function mat(){
  const ss=activeSkills();
  const employees=prod().slice().sort((a,b)=>String(a[1]).localeCompare(String(b[1]),'nl'));
  $('#view').innerHTML=`<div class="toolbar"><select id="mt" class="sel"><option value="">Alle ploegen</option>${['Ploeg A','Ploeg B','Ploeg C','Ploeg D','Ploeg E'].map(t=>`<option>${t}</option>`).join('')}</select><select id="me" class="sel"><option value="">Alle medewerkers</option>${employees.map(e=>`<option value="${e[0]}">${esc(e[1])} — ${esc(e[2])}</option>`).join('')}</select></div><div id="mw"></div>`;

  const syncEmployeeOptions=()=>{
    const t=$('#mt').value;
    const current=$('#me').value;
    const options=employees.filter(e=>!t||e[2]===t);
    $('#me').innerHTML=`<option value="">Alle medewerkers</option>${options.map(e=>`<option value="${e[0]}">${esc(e[1])} — ${esc(e[2])}</option>`).join('')}`;
    if(options.some(e=>String(e[0])===String(current))) $('#me').value=current;
  };

  const draw=()=>{
    const t=$('#mt').value;
    const selected=$('#me').value;
    const es=prod().filter(e=>(!t||e[2]===t)&&(!selected||String(e[0])===String(selected)));
    $('#mw').innerHTML=`<div class="tblw"><table><thead><tr><th>Medewerker</th>${ss.map(s=>`<th><div class="vskill">${esc(s[1])}</div></th>`).join('')}</tr></thead><tbody>${es.map(e=>`<tr><td><b>${esc(e[1])}</b><br><span class="muted">${esc(e[2])}</span></td>${ss.map(s=>cell(e,s)).join('')}</tr>`).join('')}</tbody></table></div>`;
    $$('.scsel').forEach(x=>x.onchange=()=>{
      S.x[x.dataset.e]||={};
      x.value?S.x[x.dataset.e][x.dataset.s]=+x.value:delete S.x[x.dataset.e][x.dataset.s];
      save();
      x.className='scsel '+(x.value?'s'+x.value:'se');
    });
  };

  $('#mt').onchange=()=>{syncEmployeeOptions();draw();};
  $('#me').onchange=draw;
  syncEmployeeOptions();
  draw();
};

// Als de gebruiker al op de matrixpagina staat bij het laden, meteen opnieuw renderen.
if(location.hash==='#mat') window.mat();
