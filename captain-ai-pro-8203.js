/* MijnSerenity — Captain AI Pro 8.20.3
   Verhoogt de bestaande Captain AI naar een contextbewuste boordassistent.
   Geen tweede Captain: deze laag verrijkt uitsluitend #msDashboardCaptainSearch. */
(()=>{
  'use strict';
  if(window.__msCaptainAiPro8203)return;
  window.__msCaptainAiPro8203=true;

  const $=id=>document.getElementById(id);
  const text=id=>String($(id)?.textContent||'').trim();
  const number=value=>{
    const match=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  };
  const route=name=>{
    if(typeof window.captainNavigate==='function')window.captainNavigate(name);
    else window.ms708GoToPage?.(name,true);
  };

  function snapshot(){
    const speed=number(text('mg-speed'))??number(text('ms71510Speed'))??0;
    const soc=number(text('mgSoc'))??number(text('ms71510HouseSoc'));
    const houseV=number(text('mgVolt'))??number(text('ms71510HouseVoltage'));
    const houseA=number(text('mgAmp'))??number(text('ms71510HouseCurrent'));
    const startV=number(text('mgStartV'))??number(text('ms71510StartVoltage'));
    const solar=number(text('mgSolar'));
    const water=number(text('mg-water'))??number(text('ms71510Water'));
    const fuel=number(text('mg-fuel'))??number(text('ms71510Fuel'));
    const depth=number(text('mg-depth'))??number(text('ms71510Depth'));
    const gps=String(text('mgGps')||'').toLowerCase();
    const shore=String(text('mgShore')||'').trim();
    const mode=speed>=1.5?'varen':'haven';

    const issues=[];
    const add=(level,label,detail)=>issues.push({level,label,detail});
    if(soc!==null){
      if(soc<20)add('red','Huishoudaccu',`${Math.round(soc)}% — kritisch laag`);
      else if(soc<40)add('orange','Huishoudaccu',`${Math.round(soc)}% — laag`);
    }
    if(startV!==null){
      if(startV<11.8)add('red','Startaccu',`${startV.toFixed(1)} V — kritisch laag`);
      else if(startV<12.2)add('orange','Startaccu',`${startV.toFixed(1)} V — controleren`);
      else if(startV>15.0)add('orange','Startaccu',`${startV.toFixed(1)} V — ongewoon hoog`);
    }
    if(fuel!==null){
      if(fuel<15)add('red','Diesel',`${Math.round(fuel)}% — bijna leeg`);
      else if(fuel<30)add('orange','Diesel',`${Math.round(fuel)}% — laag`);
    }
    if(water!==null&&water<20)add('orange','Drinkwater',`${Math.round(water)}% — laag`);
    if(mode==='varen'&&gps&&/(wacht|zoek|geen|offline|onbekend)/i.test(gps))add('red','GPS',`GPS-status: ${text('mgGps')}`);
    if(mode==='varen'&&depth!==null&&depth>0&&depth<1.2)add('orange','Diepte',`${depth.toFixed(1)} m — extra aandacht`);

    const known=[soc,houseV,startV,fuel,water,depth].filter(v=>v!==null).length;
    const completeness=Math.round((known/6)*100);
    const level=issues.some(x=>x.level==='red')?'red':issues.some(x=>x.level==='orange')?'orange':known>=3?'green':'grey';
    return {speed,soc,houseV,houseA,startV,solar,water,fuel,depth,gps,shore,mode,issues,completeness,level,at:Date.now()};
  }

  function statusText(s){
    if(s.level==='red')return `${s.issues.filter(x=>x.level==='red').length} direct aandachtspunt${s.issues.filter(x=>x.level==='red').length===1?'':'en'}`;
    if(s.level==='orange')return `${s.issues.length} aandachtspunt${s.issues.length===1?'':'en'} om te controleren`;
    if(s.level==='green')return 'Geen directe afwijkingen gevonden';
    return 'Nog te weinig live data voor een volledige boordcheck';
  }

  function questionFor(kind,s){
    const base=`Je bent mijn Captain AI. Ik ben nu in modus ${s.mode}.`;
    if(kind==='check')return `${base} Doe een volledige boordcheck op basis van de actuele Serenity-data. Geef eerst prioriteit Groen/Oranje/Rood, daarna maximaal drie concrete acties. Benoem ontbrekende of twijfelachtige sensordata expliciet.`;
    if(kind==='energy')return `${base} Analyseer mijn energiesysteem nu: huishoudaccu, laad/ontlaadstroom, startaccu, zonne-opbrengst en walstroom. Leg afwijkingen kort uit en geef maximaal drie acties in volgorde van prioriteit.`;
    if(kind==='departure')return `${base} Doe een vertrekcheck voor Serenity. Controleer wat je uit de beschikbare data kunt afleiden over accu's, brandstof, drinkwater, GPS, weer en techniek. Maak duidelijk wat ik nog handmatig moet controleren.`;
    if(kind==='route')return `${base} Doe een vaarcheck voor de huidige situatie. Beoordeel GPS, snelheid, diepte, weer/wind en beschikbare routegegevens. Geef alleen advies dat uit de actuele data volgt en benoem ontbrekende nautische informatie.`;
    return `${base} Analyseer de actuele boordstatus en geef het belangrijkste aandachtspunt.`;
  }

  function ensureStyle(){
    if($('msCaptainAiProStyle8203'))return;
    const style=document.createElement('style');
    style.id='msCaptainAiProStyle8203';
    style.textContent=`
      #msDashboardCaptainSearch.msai-pro{gap:12px!important;padding:15px!important;border-color:rgba(89,215,255,.38)!important;background:linear-gradient(150deg,rgba(4,27,44,.97),rgba(6,48,69,.9))!important}
      .msai-pro-status{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;padding:11px 12px;border-radius:14px;background:rgba(0,12,22,.46);border:1px solid rgba(255,255,255,.08)}
      .msai-pro-light{width:12px;height:12px;border-radius:50%;box-shadow:0 0 0 5px rgba(255,255,255,.04)}
      .msai-pro-status[data-level="green"] .msai-pro-light{background:#39d98a}.msai-pro-status[data-level="orange"] .msai-pro-light{background:#ffb84d}.msai-pro-status[data-level="red"] .msai-pro-light{background:#ff5e6c}.msai-pro-status[data-level="grey"] .msai-pro-light{background:#7f96a5}
      .msai-pro-copy{min-width:0}.msai-pro-copy b{display:block;color:#f3fbff;font-size:13px}.msai-pro-copy small{display:block;margin-top:2px;color:#9db5c3;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.msai-pro-mode{padding:5px 8px;border-radius:999px;background:rgba(76,202,255,.12);color:#8fe5ff;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.04em}
      .msai-pro-quick{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.msai-pro-quick button{min-height:42px!important;padding:7px 6px!important;border:1px solid rgba(110,204,236,.2)!important;border-radius:12px!important;background:rgba(9,43,62,.78)!important;color:#eaf8ff!important;font-size:11px!important;font-weight:800!important;line-height:1.15}.msai-pro-quick button:active{transform:scale(.98)}
      .msai-pro-issues{display:none;gap:6px}.msai-pro-issues.has-items{display:grid}.msai-pro-issue{display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border-radius:11px;background:rgba(0,12,22,.38);color:#dcecf4;font-size:11px;line-height:1.35}.msai-pro-issue b{color:#fff}.msai-pro-issue.red{border-left:3px solid #ff5e6c}.msai-pro-issue.orange{border-left:3px solid #ffb84d}
      .msai-pro-actions{display:flex;gap:7px;overflow:auto;padding-bottom:1px}.msai-pro-actions button{flex:0 0 auto!important;min-height:34px!important;padding:6px 10px!important;border:1px solid rgba(110,204,236,.18)!important;border-radius:999px!important;background:rgba(0,19,31,.48)!important;color:#bfeeff!important;font-size:10px!important;font-weight:800!important}
      @media(max-width:560px){.msai-pro-quick{grid-template-columns:repeat(2,minmax(0,1fr))}.msai-pro-status{grid-template-columns:auto minmax(0,1fr) auto}.msai-pro-copy small{white-space:normal}}
    `;
    document.head.appendChild(style);
  }

  function ask(kind){
    const card=$('msDashboardCaptainSearch');
    const input=$('msDashboardCaptainInput');
    const answer=$('msDashboardCaptainAnswer');
    if(!card||!answer)return;
    const s=snapshot();
    const q=questionFor(kind,s);
    if(input)input.value='';
    answer.classList.remove('ready','error');
    answer.classList.add('thinking');
    answer.textContent='✨ Captain AI maakt een actuele boordanalyse…';
    if(typeof window.ms71814AskCaptainAI!=='function'){
      answer.classList.remove('thinking');answer.classList.add('error');answer.textContent='Captain AI wordt nog geladen.';return;
    }
    window.ms71814AskCaptainAI(q,{target:answer,fallbackLocal:false});
  }

  function ensurePro(){
    const card=$('msDashboardCaptainSearch');
    if(!card)return false;
    ensureStyle();
    card.classList.add('msai-pro');
    const head=card.querySelector('.msai-dashboard-head');
    if(head){
      const label=head.querySelector('small');
      if(label)label.textContent='BOORDASSISTENT';
    }

    if(!$('msCaptainProStatus')){
      const status=document.createElement('div');
      status.id='msCaptainProStatus';
      status.className='msai-pro-status';
      status.innerHTML='<i class="msai-pro-light"></i><div class="msai-pro-copy"><b>Boordcheck laden…</b><small>Captain controleert de beschikbare sensordata</small></div><span class="msai-pro-mode">—</span>';
      const form=card.querySelector('form');
      form?.insertAdjacentElement('beforebegin',status);
    }

    if(!$('msCaptainProQuick')){
      const quick=document.createElement('div');
      quick.id='msCaptainProQuick';
      quick.className='msai-pro-quick';
      quick.innerHTML='<button type="button" data-ai-kind="check">🧭 Boordcheck</button><button type="button" data-ai-kind="energy">⚡ Energie</button><button type="button" data-ai-kind="departure">✅ Vertrekcheck</button><button type="button" data-ai-kind="route">🌊 Vaarcheck</button>';
      const form=card.querySelector('form');
      form?.insertAdjacentElement('afterend',quick);
      quick.addEventListener('click',event=>{const b=event.target.closest('[data-ai-kind]');if(b)ask(b.dataset.aiKind)});
    }

    if(!$('msCaptainProIssues')){
      const issues=document.createElement('div');
      issues.id='msCaptainProIssues';
      issues.className='msai-pro-issues';
      const answer=$('msDashboardCaptainAnswer');
      answer?.insertAdjacentElement('beforebegin',issues);
    }

    if(!$('msCaptainProActions')){
      const actions=document.createElement('div');
      actions.id='msCaptainProActions';
      actions.className='msai-pro-actions';
      actions.innerHTML='<button data-route="technical">⚙ Techniek</button><button data-route="planner">🧭 Route</button><button data-route="weather">☀ Weer</button><button data-route="map">🗺 Kaart</button>';
      card.appendChild(actions);
      actions.addEventListener('click',event=>{const b=event.target.closest('[data-route]');if(b)route(b.dataset.route)});
    }
    refresh();
    return true;
  }

  function refresh(){
    const status=$('msCaptainProStatus');
    if(!status)return;
    const s=snapshot();
    status.dataset.level=s.level;
    const title=status.querySelector('b');
    const sub=status.querySelector('small');
    const mode=status.querySelector('.msai-pro-mode');
    if(title)title.textContent=statusText(s);
    if(sub)sub.textContent=`Live data ${s.completeness}% compleet · ${s.mode==='varen'?`${s.speed.toFixed(1)} km/u`:'stil/afgemeerd'}`;
    if(mode)mode.textContent=s.mode;

    const issues=$('msCaptainProIssues');
    if(issues){
      issues.classList.toggle('has-items',s.issues.length>0);
      issues.innerHTML=s.issues.slice(0,3).map(item=>`<div class="msai-pro-issue ${item.level}"><span>${item.level==='red'?'🔴':'🟠'}</span><span><b>${item.label}</b> · ${item.detail}</span></div>`).join('');
    }
  }

  function boot(){
    let tries=0;
    const install=()=>{
      tries+=1;
      if(ensurePro()||tries>30)return;
      setTimeout(install,400);
    };
    install();
    setInterval(()=>{if(!document.hidden){ensurePro();refresh()}},15000);
    ['mijnserenity:dashboard-ready','mijnserenity-ha-state-updated','mijnserenity-ruuvi-vrm-updated','mijnserenity:routechange']
      .forEach(name=>window.addEventListener(name,()=>setTimeout(()=>{ensurePro();refresh()},100),{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){ensurePro();refresh()}},{passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();