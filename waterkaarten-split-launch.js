/* MijnSerenity — Waterkaarten + openbare havenbibliotheek */
(()=>{
  'use strict';

  const WATERKAARTEN_URL='https://mijn.waterkaarten.app/';
  const FRAME_ID='msWaterkaartenFrame';
  const OVERLAY_ID='ms738WaterkaartenModal';
  const BANNER_ID='ms738WaterkaartenBanner';
  const HARBOR_ID='msWaterkaartenHarbors';
  const HARBOR_DETAIL_ID='msWaterkaartenHarborDetail';
  const OPEN_CLASS='ms-waterkaarten-open';
  const FIRST_INFO_KEY='mijnserenity-waterkaarten-iframe-info-seen';
  const HARBOR_FUNCTION='/.netlify/functions/waterkaarten-havens';

  const PROVINCES={
    'overijssel':'Overijssel','friesland':'Friesland','flevoland':'Flevoland','gelderland':'Gelderland',
    'drenthe':'Drenthe','groningen':'Groningen','utrecht':'Utrecht','noord-holland':'Noord-Holland',
    'zuid-holland':'Zuid-Holland','noord-brabant':'Noord-Brabant','zeeland':'Zeeland','limburg':'Limburg'
  };

  let originalOpenWaterkaarten=null;
  let observedTripStart=0;
  let patchTimer=null;
  let departureTimer=null;
  let harborState={province:'overijssel',page:1,totalPages:1,items:[],query:''};

  function safeRead(key,fallback=''){
    try{return localStorage.getItem(key)||fallback}catch{return fallback}
  }

  function safeWrite(key,value){
    try{localStorage.setItem(key,String(value))}catch{}
  }

  function toast(message){
    if(typeof window.showAppToast==='function')window.showAppToast(message);
  }

  function esc(value=''){
    return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function ensureHarborStyle(){
    if(document.getElementById('msWaterkaartenHarborStyle'))return;
    const style=document.createElement('style');
    style.id='msWaterkaartenHarborStyle';
    style.textContent=`
      .mswk-harbor-open{display:inline-flex!important;align-items:center;gap:6px;white-space:nowrap}
      #${HARBOR_ID}{position:absolute;inset:0;z-index:8;display:flex;flex-direction:column;min-width:0;background:linear-gradient(180deg,#061927 0%,#03111c 100%);color:#f7fbff;overflow:hidden}
      #${HARBOR_ID}.hidden{display:none!important}
      #${HARBOR_ID} .mswh-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:12px 12px 10px;border-bottom:1px solid rgba(116,222,255,.16);background:rgba(7,31,48,.95)}
      #${HARBOR_ID} .mswh-title{display:flex;align-items:center;gap:10px;min-width:0}
      #${HARBOR_ID} .mswh-title span{font-size:24px}
      #${HARBOR_ID} .mswh-title div{min-width:0;display:grid;gap:1px}
      #${HARBOR_ID} .mswh-title strong{font-size:16px;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #${HARBOR_ID} .mswh-title small{font-size:10px;color:#8edfff;letter-spacing:.02em}
      #${HARBOR_ID} .mswh-map{border:1px solid rgba(120,221,255,.22);background:rgba(255,255,255,.07);color:#fff;border-radius:10px;padding:8px 11px;font-weight:800}
      #${HARBOR_ID} .mswh-tools{display:grid;grid-template-columns:minmax(0,1fr) minmax(130px,.55fr);gap:8px;padding:10px 12px;border-bottom:1px solid rgba(116,222,255,.12)}
      #${HARBOR_ID} input,#${HARBOR_ID} select{width:100%;min-width:0;box-sizing:border-box;border:1px solid rgba(111,214,248,.22);background:#0a2638;color:#fff;border-radius:11px;padding:10px 11px;font:inherit}
      #${HARBOR_ID} .mswh-source{padding:8px 12px 0;color:#7dd9f7;font-size:10px;line-height:1.3}
      #${HARBOR_ID} .mswh-list{flex:1;overflow:auto;padding:10px 12px 110px;display:grid;align-content:start;gap:9px;-webkit-overflow-scrolling:touch}
      #${HARBOR_ID} .mswh-card{width:100%;text-align:left;border:1px solid rgba(114,214,247,.16);border-radius:14px;background:linear-gradient(180deg,rgba(13,47,66,.96),rgba(7,31,45,.98));padding:12px;color:#fff;box-shadow:0 8px 22px rgba(0,0,0,.14)}
      #${HARBOR_ID} .mswh-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
      #${HARBOR_ID} .mswh-card strong{display:block;font-size:15px;line-height:1.18}
      #${HARBOR_ID} .mswh-card small{display:block;margin-top:3px;color:#a9cbd9;font-size:11px}
      #${HARBOR_ID} .mswh-rating{flex:0 0 auto;display:inline-flex;align-items:center;gap:4px;border:1px solid rgba(255,219,110,.22);background:rgba(255,196,56,.12);color:#ffd66e;border-radius:999px;padding:5px 8px;font-weight:900;font-size:12px}
      #${HARBOR_ID} .mswh-price{display:inline-flex;margin-top:8px;border-radius:999px;padding:4px 8px;background:rgba(105,219,255,.09);color:#8de5ff;font-size:10px;font-weight:800}
      #${HARBOR_ID} .mswh-empty{padding:28px 14px;text-align:center;color:#a7c6d4}
      #${HARBOR_ID} .mswh-pages{position:absolute;left:0;right:0;bottom:0;z-index:4;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;padding:9px 12px calc(9px + env(safe-area-inset-bottom));background:rgba(3,17,28,.97);border-top:1px solid rgba(116,222,255,.16);backdrop-filter:blur(16px)}
      #${HARBOR_ID} .mswh-pages button{border:1px solid rgba(118,221,255,.18);background:#0b3147;color:#fff;border-radius:10px;padding:9px 10px;font-weight:850}
      #${HARBOR_ID} .mswh-pages button:disabled{opacity:.35}
      #${HARBOR_ID} .mswh-pages span{font-size:11px;color:#9ddff3;font-weight:800}
      #${HARBOR_DETAIL_ID}{position:absolute;inset:0;z-index:15;background:linear-gradient(180deg,#071c2b,#03111c);display:flex;flex-direction:column;overflow:hidden}
      #${HARBOR_DETAIL_ID}.hidden{display:none!important}
      #${HARBOR_DETAIL_ID} .mswh-detail-head{display:flex;align-items:center;gap:9px;padding:11px 12px;border-bottom:1px solid rgba(116,222,255,.15);background:#082235}
      #${HARBOR_DETAIL_ID} .mswh-detail-back{border:1px solid rgba(118,221,255,.2);background:rgba(255,255,255,.06);color:#fff;border-radius:10px;padding:8px 10px;font-weight:900}
      #${HARBOR_DETAIL_ID} .mswh-detail-head div{min-width:0;display:grid;gap:1px}
      #${HARBOR_DETAIL_ID} .mswh-detail-head strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:15px}
      #${HARBOR_DETAIL_ID} .mswh-detail-head small{color:#86daf5;font-size:10px}
      #${HARBOR_DETAIL_ID} .mswh-detail-body{flex:1;overflow:auto;padding:12px 12px calc(30px + env(safe-area-inset-bottom));-webkit-overflow-scrolling:touch}
      #${HARBOR_DETAIL_ID} .mswh-hero{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid rgba(117,218,250,.17);border-radius:15px;background:rgba(11,45,64,.88);padding:13px;margin-bottom:10px}
      #${HARBOR_DETAIL_ID} .mswh-hero h3{margin:0;font-size:18px;line-height:1.12}
      #${HARBOR_DETAIL_ID} .mswh-hero p{margin:5px 0 0;color:#a7c8d6;font-size:11px}
      #${HARBOR_DETAIL_ID} .mswh-big-rating{font-size:20px;font-weight:950;color:#ffd66e;white-space:nowrap}
      #${HARBOR_DETAIL_ID} .mswh-section{margin:10px 0;border:1px solid rgba(117,218,250,.14);border-radius:14px;background:rgba(8,34,49,.9);overflow:hidden}
      #${HARBOR_DETAIL_ID} .mswh-section h4{margin:0;padding:10px 12px;border-bottom:1px solid rgba(117,218,250,.12);font-size:12px;color:#8ee1fb;text-transform:uppercase;letter-spacing:.06em}
      #${HARBOR_DETAIL_ID} .mswh-info-row{display:grid;grid-template-columns:minmax(105px,.42fr) 1fr;gap:10px;padding:8px 12px;border-bottom:1px solid rgba(117,218,250,.07);font-size:12px}
      #${HARBOR_DETAIL_ID} .mswh-info-row:last-child{border-bottom:0}
      #${HARBOR_DETAIL_ID} .mswh-info-row b{color:#9dc7d7}
      #${HARBOR_DETAIL_ID} .mswh-review{padding:11px 12px;border-bottom:1px solid rgba(117,218,250,.08)}
      #${HARBOR_DETAIL_ID} .mswh-review:last-child{border-bottom:0}
      #${HARBOR_DETAIL_ID} .mswh-review-top{display:flex;justify-content:space-between;gap:8px;color:#ffd66e;font-size:11px;font-weight:850}
      #${HARBOR_DETAIL_ID} .mswh-review p{margin:7px 0 0;font-size:12px;line-height:1.45;color:#eaf7fb}
      #${HARBOR_DETAIL_ID} .mswh-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      #${HARBOR_DETAIL_ID} .mswh-actions button{border:1px solid rgba(118,221,255,.2);background:#0b3147;color:#fff;border-radius:10px;padding:9px 11px;font-weight:850}
      @media(max-width:620px){#${HARBOR_ID} .mswh-tools{grid-template-columns:1fr}#${HARBOR_ID} .mswh-head{grid-template-columns:minmax(0,1fr) auto}.mswk-harbor-open b{display:none}}
    `;
    document.head.appendChild(style);
  }

  function ensureUi(){
    if(document.getElementById(OVERLAY_ID))return;
    ensureHarborStyle();

    const overlay=document.createElement('div');
    overlay.id=OVERLAY_ID;
    overlay.className='mswk-overlay hidden';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Waterkaarten in MijnSerenity');
    overlay.innerHTML=`
      <div class="mswk-shell">
        <header class="mswk-toolbar">
          <button type="button" class="mswk-back" onclick="ms738CloseWaterkaartenPrompt()" aria-label="Terug naar MijnSerenity">
            <span aria-hidden="true">‹</span><b>MijnSerenity</b>
          </button>
          <div class="mswk-title">
            <span class="mswk-title-icon" aria-hidden="true">🗺️</span>
            <div><strong>Waterkaarten</strong><small>kaart + havengids</small></div>
          </div>
          <button type="button" class="mswk-external mswk-harbor-open" onclick="msWaterkaartenOpenHavens()" title="Open havens en reviews">
            <span aria-hidden="true">⚓</span><b>Havens</b>
          </button>
          <button type="button" class="mswk-external" onclick="msWaterkaartenOpenExternal()" title="Open Waterkaarten apart">
            <span aria-hidden="true">↗</span><b>Open apart</b>
          </button>
        </header>

        <div class="mswk-frame-stage">
          <div id="msWaterkaartenLoading" class="mswk-loading">
            <div class="mswk-spinner" aria-hidden="true"></div>
            <strong>Waterkaarten laden…</strong>
            <small>Je blijft in MijnSerenity.</small>
          </div>
          <iframe id="${FRAME_ID}"
            class="mswk-frame"
            title="Waterkaarten"
            allow="geolocation; fullscreen"
            referrerpolicy="strict-origin-when-cross-origin"></iframe>

          <div id="msWaterkaartenInfo" class="mswk-info hidden">
            <button type="button" class="mswk-info-close" onclick="msWaterkaartenDismissInfo()" aria-label="Melding sluiten">×</button>
            <b>Waterkaarten blijft binnen MijnSerenity</b>
            <span>Log zo nodig één keer in. Voor havens, tarieven en reviews kun je ook <b>Havens</b> gebruiken.</span>
          </div>

          <div id="${HARBOR_ID}" class="hidden" aria-label="Waterkaarten havenbibliotheek">
            <div class="mswh-head">
              <div class="mswh-title"><span>⚓</span><div><strong>Havens & reviews</strong><small>Waterkaarten / Vind een Jachthaven</small></div></div>
              <button type="button" class="mswh-map" onclick="msWaterkaartenShowMap()">🗺️ Kaart</button>
            </div>
            <div class="mswh-tools">
              <input id="mswhSearch" type="search" placeholder="Filter op haven of plaats…" autocomplete="off">
              <select id="mswhProvince" aria-label="Provincie">${Object.entries(PROVINCES).map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select>
            </div>
            <div class="mswh-source">Live gelezen uit de openbare Waterkaarten-havengids. Tik op een haven voor gegevens, faciliteiten en recensies.</div>
            <div id="mswhList" class="mswh-list"><div class="mswh-empty">Havens laden…</div></div>
            <div class="mswh-pages">
              <button id="mswhPrev" type="button">‹ Vorige</button>
              <span id="mswhPage">pagina 1</span>
              <button id="mswhNext" type="button">Volgende ›</button>
            </div>
            <div id="${HARBOR_DETAIL_ID}" class="hidden"></div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const frame=document.getElementById(FRAME_ID);
    frame?.addEventListener('load',()=>document.getElementById('msWaterkaartenLoading')?.classList.add('hidden'));

    const search=document.getElementById('mswhSearch');
    search?.addEventListener('input',event=>{
      harborState.query=String(event.target.value||'').trim().toLowerCase();
      renderHarborList();
    });
    const province=document.getElementById('mswhProvince');
    province?.addEventListener('change',event=>{
      harborState.province=String(event.target.value||'overijssel');
      harborState.page=1;
      loadHarbors();
    });
    document.getElementById('mswhPrev')?.addEventListener('click',()=>{
      if(harborState.page>1){harborState.page--;loadHarbors()}
    });
    document.getElementById('mswhNext')?.addEventListener('click',()=>{
      if(harborState.page<harborState.totalPages){harborState.page++;loadHarbors()}
    });

    const banner=document.createElement('div');
    banner.id=BANNER_ID;
    banner.className='mswk-departure-banner hidden';
    banner.setAttribute('role','status');
    banner.innerHTML=`
      <div class="mswk-departure-copy">
        <span aria-hidden="true">🗺️</span>
        <div><b>Waterkaarten</b><small>Open de kaart in MijnSerenity tijdens het varen.</small></div>
      </div>
      <div class="mswk-departure-actions">
        <button type="button" onclick="ms738LaunchWaterkaarten()">Open kaart</button>
        <button type="button" class="secondary" onclick="msWaterkaartenHideDepartureBanner()" aria-label="Melding sluiten">×</button>
      </div>`;
    document.body.appendChild(banner);
  }

  function setOpenState(open){
    document.documentElement.classList.toggle(OPEN_CLASS,open);
    document.body.classList.toggle(OPEN_CLASS,open);
  }

  function loadFrame(){
    const frame=document.getElementById(FRAME_ID);
    if(!frame)return;
    if(!frame.getAttribute('src')){
      document.getElementById('msWaterkaartenLoading')?.classList.remove('hidden');
      frame.setAttribute('src',WATERKAARTEN_URL);
    }
  }

  function showInfoOnce(){
    if(safeRead(FIRST_INFO_KEY,'0')==='1')return;
    const info=document.getElementById('msWaterkaartenInfo');
    if(info)info.classList.remove('hidden');
  }

  function showMap(){
    ensureUi();
    document.getElementById(HARBOR_DETAIL_ID)?.classList.add('hidden');
    document.getElementById(HARBOR_ID)?.classList.add('hidden');
    document.getElementById(FRAME_ID)?.classList.remove('hidden');
    loadFrame();
  }

  function openEmbedded(){
    ensureUi();
    showMap();
    document.getElementById(BANNER_ID)?.classList.add('hidden');
    document.getElementById(OVERLAY_ID)?.classList.remove('hidden');
    setOpenState(true);
    showInfoOnce();
    return false;
  }

  function closeEmbedded(){
    document.getElementById(OVERLAY_ID)?.classList.add('hidden');
    document.getElementById(HARBOR_DETAIL_ID)?.classList.add('hidden');
    setOpenState(false);
  }

  function dismissInfo(){
    safeWrite(FIRST_INFO_KEY,'1');
    document.getElementById('msWaterkaartenInfo')?.classList.add('hidden');
  }

  function openExternal(){
    const win=window.open(WATERKAARTEN_URL,'_blank','noopener,noreferrer');
    if(!win)window.location.assign(WATERKAARTEN_URL);
  }

  function openSource(url){
    const win=window.open(url,'_blank','noopener,noreferrer');
    if(!win)window.location.assign(url);
  }

  function hideDepartureBanner(){
    document.getElementById(BANNER_ID)?.classList.add('hidden');
  }

  function renderHarborList(){
    const list=document.getElementById('mswhList');
    if(!list)return;
    const q=harborState.query;
    const items=q?harborState.items.filter(item=>`${item.name||''} ${item.city||''} ${item.label||''}`.toLowerCase().includes(q)):harborState.items;
    if(!items.length){
      list.innerHTML='<div class="mswh-empty">Geen havens gevonden op deze pagina.</div>';
    }else{
      list.innerHTML=items.map(item=>{
        const rating=Number.isFinite(Number(item.rating))?`★ ${Number(item.rating).toFixed(1)}`:'Geen score';
        const price=Number.isFinite(Number(item.pricePerMeter))?`€ ${Number(item.pricePerMeter).toFixed(2)} / m`:'';
        return `<button type="button" class="mswh-card" data-mswh-url="${esc(item.url)}">
          <span class="mswh-card-top"><span><strong>${esc(item.name||'Jachthaven')}</strong><small>${esc(item.city||'')} · ${esc(PROVINCES[item.province]||item.province||'')}</small></span><span class="mswh-rating">${esc(rating)}</span></span>
          ${price?`<span class="mswh-price">${esc(price)}</span>`:''}
        </button>`;
      }).join('');
      list.querySelectorAll('[data-mswh-url]').forEach(button=>button.addEventListener('click',()=>openHarborDetail(button.dataset.mswhUrl)));
    }
    const page=document.getElementById('mswhPage');
    if(page)page.textContent=`pagina ${harborState.page}${harborState.totalPages>1?` / ${harborState.totalPages}`:''}`;
    const prev=document.getElementById('mswhPrev');
    const next=document.getElementById('mswhNext');
    if(prev)prev.disabled=harborState.page<=1;
    if(next)next.disabled=harborState.page>=harborState.totalPages;
  }

  async function loadHarbors(){
    const list=document.getElementById('mswhList');
    if(list)list.innerHTML='<div class="mswh-empty">Waterkaarten-havens laden…</div>';
    try{
      const url=`${HARBOR_FUNCTION}?mode=province&province=${encodeURIComponent(harborState.province)}&page=${harborState.page}`;
      const response=await fetch(url,{headers:{accept:'application/json'}});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(payload?.error?.message||'Havenbron niet beschikbaar');
      harborState.items=Array.isArray(payload.items)?payload.items:[];
      harborState.totalPages=Math.max(1,Number(payload.totalPages)||1);
      const select=document.getElementById('mswhProvince');
      if(select)select.value=harborState.province;
      renderHarborList();
    }catch(error){
      if(list)list.innerHTML=`<div class="mswh-empty"><b>Havens konden niet worden geladen.</b><br>${esc(error?.message||'Probeer later opnieuw.')}</div>`;
    }
  }

  function infoRows(info={}){
    return Object.entries(info).filter(([,value])=>String(value||'').trim()).slice(0,45).map(([key,value])=>`<div class="mswh-info-row"><b>${esc(key)}</b><span>${esc(value)}</span></div>`).join('');
  }

  function renderReviews(reviews=[]){
    if(!reviews.length)return '<div class="mswh-review"><p>Nog geen uitgelezen reviewtekst beschikbaar. Open de bron voor alle recensies.</p></div>';
    return reviews.map(review=>`<div class="mswh-review">
      <div class="mswh-review-top"><span>${esc(review.author||'Watersporter')}</span><span>${review.rating?`★ ${esc(review.rating)}`:esc(review.date||'')}</span></div>
      <p>${esc(review.body||'')}</p>
    </div>`).join('');
  }

  async function openHarborDetail(url){
    const detail=document.getElementById(HARBOR_DETAIL_ID);
    if(!detail)return;
    detail.classList.remove('hidden');
    detail.innerHTML='<div class="mswh-detail-head"><button type="button" class="mswh-detail-back" onclick="msWaterkaartenCloseHarborDetail()">‹ Havens</button><div><strong>Haven laden…</strong><small>Waterkaarten / Vind een Jachthaven</small></div></div><div class="mswh-detail-body"><div class="mswh-empty">Gegevens en reviews laden…</div></div>';
    try{
      const response=await fetch(`${HARBOR_FUNCTION}?mode=detail&url=${encodeURIComponent(url)}`,{headers:{accept:'application/json'}});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(payload?.error?.message||'Haven kon niet worden gelezen');
      const h=payload.harbor||{};
      const rating=Number.isFinite(Number(h.rating))?Number(h.rating).toFixed(1):'–';
      const count=Number(h.reviewCount)||0;
      detail.innerHTML=`
        <div class="mswh-detail-head"><button type="button" class="mswh-detail-back" onclick="msWaterkaartenCloseHarborDetail()">‹ Havens</button><div><strong>${esc(h.name||'Jachthaven')}</strong><small>${esc(h.source||'Waterkaarten / Vind een Jachthaven')}</small></div></div>
        <div class="mswh-detail-body">
          <div class="mswh-hero"><div><h3>${esc(h.name||'Jachthaven')}</h3><p>${count?`${count} reviews`: 'haveninformatie uit openbare Waterkaarten-havengids'}</p></div><div class="mswh-big-rating">★ ${esc(rating)}</div></div>
          <div class="mswh-section"><h4>Haveninformatie</h4>${infoRows(h.info||{})||'<div class="mswh-info-row"><span>Geen aanvullende gegevens gevonden.</span></div>'}</div>
          ${Array.isArray(h.facilities)&&h.facilities.length?`<div class="mswh-section"><h4>Faciliteiten</h4><div class="mswh-info-row"><span>${h.facilities.map(esc).join(' · ')}</span></div></div>`:''}
          <div class="mswh-section"><h4>Reviews</h4>${renderReviews(h.reviews||[])}</div>
          <div class="mswh-actions"><button type="button" onclick="msWaterkaartenOpenSource('${esc(h.url||url)}')">Open bron ↗</button><button type="button" onclick="msWaterkaartenShowMap()">Open Waterkaarten-kaart</button></div>
        </div>`;
    }catch(error){
      detail.innerHTML=`<div class="mswh-detail-head"><button type="button" class="mswh-detail-back" onclick="msWaterkaartenCloseHarborDetail()">‹ Havens</button><div><strong>Niet geladen</strong><small>Waterkaarten / Vind een Jachthaven</small></div></div><div class="mswh-detail-body"><div class="mswh-empty">${esc(error?.message||'Deze haven kon niet worden gelezen.')}</div></div>`;
    }
  }

  function closeHarborDetail(){
    document.getElementById(HARBOR_DETAIL_ID)?.classList.add('hidden');
  }

  function openHarbors(){
    ensureUi();
    document.getElementById('msWaterkaartenInfo')?.classList.add('hidden');
    document.getElementById(FRAME_ID)?.classList.add('hidden');
    document.getElementById('msWaterkaartenLoading')?.classList.add('hidden');
    document.getElementById(HARBOR_ID)?.classList.remove('hidden');
    document.getElementById(OVERLAY_ID)?.classList.remove('hidden');
    setOpenState(true);
    if(!harborState.items.length)loadHarbors();
    return false;
  }

  function patchOpenWaterkaarten(){
    const current=window.openWaterkaarten;
    if(typeof current!=='function'||current.__msWaterkaartenIframePatched)return;
    if(!originalOpenWaterkaarten)originalOpenWaterkaarten=current;
    const wrapped=function(){return openEmbedded()};
    wrapped.__msWaterkaartenIframePatched=true;
    wrapped.__msWaterkaartenOriginal=current;
    window.openWaterkaarten=wrapped;
  }

  function detectAutomaticDeparture(){
    try{
      if(typeof liveNavState==='undefined'||!liveNavState)return;
      const startedAt=Number(liveNavState.startedAt||0);
      const active=liveNavState.status==='active';
      const automatic=Boolean(liveNavState.autoStarted);
      if(active&&automatic&&startedAt&&startedAt!==observedTripStart){
        observedTripStart=startedAt;
        document.getElementById(BANNER_ID)?.classList.remove('hidden');
      }else if(!active){
        document.getElementById(BANNER_ID)?.classList.add('hidden');
      }
    }catch{}
  }

  function handleKeydown(event){
    if(event.key!=='Escape')return;
    const detail=document.getElementById(HARBOR_DETAIL_ID);
    if(detail&&!detail.classList.contains('hidden')){closeHarborDetail();return}
    const overlay=document.getElementById(OVERLAY_ID);
    if(overlay&&!overlay.classList.contains('hidden'))closeEmbedded();
  }

  function start(){
    ensureUi();
    patchOpenWaterkaarten();
    patchTimer=setInterval(patchOpenWaterkaarten,700);
    departureTimer=setInterval(detectAutomaticDeparture,1200);
    document.addEventListener('keydown',handleKeydown);
  }

  window.ms738ShowWaterkaartenPrompt=openEmbedded;
  window.ms738CloseWaterkaartenPrompt=closeEmbedded;
  window.ms738LaunchWaterkaarten=openEmbedded;
  window.ms738ToggleWaterkaartenHelp=showInfoOnce;
  window.ms759ConfirmWaterkaartenRight=()=>{dismissInfo();toast('Waterkaarten opent voortaan in MijnSerenity ✓')};
  window.ms759ResetWaterkaartenRight=()=>{safeWrite(FIRST_INFO_KEY,'0');showInfoOnce()};
  window.msWaterkaartenOpenExternal=openExternal;
  window.msWaterkaartenOpenSource=openSource;
  window.msWaterkaartenDismissInfo=dismissInfo;
  window.msWaterkaartenHideDepartureBanner=hideDepartureBanner;
  window.msWaterkaartenOpenHavens=openHarbors;
  window.msWaterkaartenShowMap=showMap;
  window.msWaterkaartenCloseHarborDetail=closeHarborDetail;

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
