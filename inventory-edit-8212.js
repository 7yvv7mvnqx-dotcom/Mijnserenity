/* MijnSerenity 8.21.2 — Voorraad & reservedelen met centrale cloud-synchronisatie */
(()=>{
  'use strict';
  if(window.__msInventoryEditor8212)return;
  window.__msInventoryEditor8212=true;

  const VERSION='8212';
  const STORE_KEY='mijnserenity:inventory:extra:v8211';
  const TABLE='inventory_item_meta';
  const PHOTO_BUCKET='inventory-photos';
  const STYLE_ID='ms-inventory-8211-style';
  const MODAL_ID='ms-inventory-8211-modal';
  const MARK='msInventoryEnhanced';
  const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  let active=null;
  let scanQueued=false;
  let cloudClient=null;
  let cloudBoatId='';
  let cloudUserId='';
  let cloudChannel=null;
  let cloudSyncPromise=null;
  let cloudInitPromise=null;
  let cloudRetryTimer=0;
  const photoUrlCache=new Map();
  const savePending=new Map();

  const txt=el=>(el?.textContent||'').replace(/\s+/g,' ').trim();
  const slug=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,120);

  function readStore(){
    try{
      const data=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');
      return data&&typeof data==='object'?data:{};
    }catch(_){return {};}
  }

  function writeStore(data){
    try{
      localStorage.setItem(STORE_KEY,JSON.stringify(data));
      return true;
    }catch(err){
      console.warn('MijnSerenity voorraadgegevens konden niet lokaal worden opgeslagen.',err);
      alert('Opslaan lukt niet. Verwijder eventueel een oude artikel-foto en probeer opnieuw.');
      return false;
    }
  }

  function normaliseUrl(raw){
    let value=String(raw||'').trim();
    if(!value)return '';
    if(!/^[a-z][a-z0-9+.-]*:/i.test(value))value='https://'+value;
    try{
      const url=new URL(value);
      if(!['http:','https:'].includes(url.protocol))return '';
      return url.href;
    }catch(_){return ''}
  }

  function siteFromUrl(url){
    try{return new URL(url).hostname.replace(/^www\./,'');}catch(_){return '';}
  }

  function formatPrice(raw){
    const value=String(raw||'').trim();
    if(!value)return '–';
    const cleaned=value.replace(/\s/g,'').replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const number=Number(cleaned);
    if(!Number.isFinite(number))return value;
    return new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(number);
  }

  function getAppClient(){
    try{
      if(typeof sb!=='undefined'&&sb?.from&&sb?.auth&&sb?.storage)return sb;
    }catch(_){ }
    return null;
  }

  function currentBoatId(){
    try{
      if(typeof currentBoat!=='undefined'){
        const value=currentBoat?.id||currentBoat?.boat_id||currentBoat;
        if(UUID_RE.test(String(value||'')))return String(value);
      }
    }catch(_){ }
    return '';
  }

  async function resolveCloudContext(){
    const client=getAppClient();
    if(!client)return false;
    const {data:userData,error:userError}=await client.auth.getUser();
    if(userError||!userData?.user?.id)return false;
    let boatId=currentBoatId();
    if(!boatId){
      const {data,error}=await client
        .from('boat_members')
        .select('boat_id')
        .eq('user_id',userData.user.id)
        .limit(1)
        .maybeSingle();
      if(error)throw error;
      boatId=String(data?.boat_id||'');
    }
    if(!UUID_RE.test(boatId))return false;
    cloudClient=client;
    cloudUserId=userData.user.id;
    cloudBoatId=boatId;
    return true;
  }

  function rowToRecord(row){
    return {
      name:String(row?.name||''),
      price:String(row?.price||''),
      site:String(row?.site||''),
      url:String(row?.url||''),
      photoPath:String(row?.photo_path||''),
      _dirty:false,
      _cloudUpdatedAt:String(row?.updated_at||'')
    };
  }

  function meaningfulRecord(record){
    return Boolean(record&&(record.name||record.price||record.site||record.url||record.photo||record.photoPath));
  }

  function safePhotoFileName(key){
    const clean=slug(key)||'artikel';
    let hash=0;
    const input=String(key||'');
    for(let i=0;i<input.length;i++)hash=((hash<<5)-hash+input.charCodeAt(i))|0;
    return `${clean}-${Math.abs(hash)}.jpg`;
  }

  function dataUrlToBlob(dataUrl){
    const parts=String(dataUrl||'').split(',');
    if(parts.length<2)throw new Error('Ongeldige foto.');
    const mime=(parts[0].match(/^data:([^;]+)/)||[])[1]||'image/jpeg';
    const binary=atob(parts.slice(1).join(','));
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return new Blob([bytes],{type:mime});
  }

  async function getSignedPhotoUrl(path){
    if(!path)return '';
    const cached=photoUrlCache.get(path);
    if(cached?.url&&cached.expiresAt>Date.now()+30000)return cached.url;
    if(!cloudClient||!cloudBoatId)await ensureCloud();
    if(!cloudClient)return '';
    const {data,error}=await cloudClient.storage.from(PHOTO_BUCKET).createSignedUrl(path,3600);
    if(error||!data?.signedUrl)throw error||new Error('Foto kon niet worden geladen.');
    const entry={url:data.signedUrl,expiresAt:Date.now()+50*60*1000};
    photoUrlCache.set(path,entry);
    return entry.url;
  }

  async function uploadPhoto(key,dataUrl){
    if(!cloudClient||!cloudBoatId)throw new Error('Cloudverbinding is niet beschikbaar.');
    const blob=dataUrlToBlob(dataUrl);
    const path=`${cloudBoatId}/${safePhotoFileName(key)}`;
    const {error}=await cloudClient.storage
      .from(PHOTO_BUCKET)
      .upload(path,blob,{contentType:'image/jpeg',cacheControl:'3600',upsert:true});
    if(error)throw error;
    photoUrlCache.delete(path);
    return path;
  }

  function renderAllForKey(key,record){
    document.querySelectorAll('[data-ms-inventory-key]').forEach(card=>{
      if(card.dataset.msInventoryKey===key)render(card,record);
    });
  }

  function setModalStatus(message,type=''){
    const node=document.querySelector(`#${MODAL_ID} [data-ms-inventory-cloud-status]`);
    if(!node)return;
    node.textContent=message||'';
    node.dataset.state=type||'';
  }

  async function saveCloudRecord(key,sourceRecord){
    if(savePending.has(key))return savePending.get(key);
    const task=(async()=>{
      const ready=await ensureCloud();
      if(!ready)throw new Error('Cloudverbinding is nog niet beschikbaar.');
      const local=readStore();
      const record={...(local[key]||sourceRecord||{})};
      let photoPath=String(record.photoPath||'');
      if(record.photo&&String(record.photo).startsWith('data:image/')){
        photoPath=await uploadPhoto(key,record.photo);
      }
      const row={
        boat_id:cloudBoatId,
        item_key:key,
        name:String(record.name||''),
        price:String(record.price||''),
        site:String(record.site||''),
        url:normaliseUrl(record.url),
        photo_path:photoPath||null,
        updated_by:cloudUserId,
        updated_at:new Date().toISOString()
      };
      const {data,error}=await cloudClient
        .from(TABLE)
        .upsert(row,{onConflict:'boat_id,item_key'})
        .select('name,price,site,url,photo_path,updated_at')
        .single();
      if(error)throw error;
      const all=readStore();
      const current={...(all[key]||record)};
      const clean={
        ...current,
        ...rowToRecord(data),
        photoPath:String(data?.photo_path||photoPath||''),
        _dirty:false
      };
      delete clean.photo;
      all[key]=clean;
      writeStore(all);
      renderAllForKey(key,clean);
      return clean;
    })().finally(()=>savePending.delete(key));
    savePending.set(key,task);
    return task;
  }

  async function persistRecord(key,patch,{quiet=false}={}){
    const all=readStore();
    const record={...(all[key]||{}),...patch,_dirty:true};
    all[key]=record;
    if(!writeStore(all))throw new Error('Lokaal opslaan mislukt.');
    renderAllForKey(key,record);
    try{
      const saved=await saveCloudRecord(key,record);
      if(!quiet)setModalStatus('✓ Opgeslagen in MijnSerenity cloud','ok');
      return {saved,cloud:true};
    }catch(error){
      console.warn('Voorraad cloud-synchronisatie uitgesteld:',error);
      if(!quiet)setModalStatus('Lokaal opgeslagen · cloud synchroniseert zodra verbinding terug is','pending');
      scheduleCloudRetry();
      return {saved:record,cloud:false,error};
    }
  }

  async function flushDirty(){
    const store=readStore();
    const keys=Object.keys(store).filter(key=>store[key]?._dirty&&meaningfulRecord(store[key]));
    for(const key of keys){
      try{await saveCloudRecord(key,store[key]);}catch(error){console.warn('Uitgestelde voorraadsync mislukt:',key,error);break;}
    }
  }

  async function syncCloud(){
    if(cloudSyncPromise)return cloudSyncPromise;
    cloudSyncPromise=(async()=>{
      const ready=cloudClient&&cloudBoatId?true:await resolveCloudContext();
      if(!ready)return false;
      const {data,error}=await cloudClient
        .from(TABLE)
        .select('item_key,name,price,site,url,photo_path,updated_at')
        .eq('boat_id',cloudBoatId);
      if(error)throw error;
      const remote=new Map((data||[]).map(row=>[row.item_key,row]));
      const local=readStore();
      const merged={...local};
      for(const [key,row] of remote){
        const localRecord=local[key]||{};
        if(localRecord._dirty)continue;
        merged[key]={...localRecord,...rowToRecord(row)};
        delete merged[key].photo;
      }
      for(const [key,record] of Object.entries(local)){
        if(!remote.has(key)&&meaningfulRecord(record))merged[key]={...record,_dirty:true};
      }
      writeStore(merged);
      document.querySelectorAll('[data-ms-inventory-key]').forEach(card=>{
        const key=card.dataset.msInventoryKey;
        render(card,merged[key]||{});
      });
      await flushDirty();
      return true;
    })().catch(error=>{
      console.warn('Voorraad cloud-synchronisatie mislukt:',error);
      scheduleCloudRetry();
      return false;
    }).finally(()=>{cloudSyncPromise=null;});
    return cloudSyncPromise;
  }

  function subscribeCloud(){
    if(!cloudClient||!cloudBoatId||cloudChannel)return;
    try{
      cloudChannel=cloudClient
        .channel(`inventory-item-meta-${cloudBoatId}`)
        .on('postgres_changes',{
          event:'*',schema:'public',table:TABLE,filter:`boat_id=eq.${cloudBoatId}`
        },()=>syncCloud())
        .subscribe();
    }catch(error){console.warn('Realtime voorraad-sync niet beschikbaar:',error);}
  }

  function scheduleCloudRetry(){
    if(cloudRetryTimer)return;
    cloudRetryTimer=setTimeout(()=>{
      cloudRetryTimer=0;
      ensureCloud().then(ok=>{if(ok)syncCloud();});
    },10000);
  }

  async function ensureCloud(){
    if(cloudClient&&cloudBoatId&&cloudUserId)return true;
    if(cloudInitPromise)return cloudInitPromise;
    cloudInitPromise=(async()=>{
      try{
        const ready=await resolveCloudContext();
        if(!ready)return false;
        subscribeCloud();
        return true;
      }catch(error){
        console.warn('Voorraad cloudverbinding nog niet klaar:',error);
        return false;
      }finally{cloudInitPromise=null;}
    })();
    return cloudInitPromise;
  }

  async function initialiseCloud(){
    const ready=await ensureCloud();
    if(ready)await syncCloud();
    else scheduleCloudRetry();
  }

  function injectStyle(){
    let style=document.getElementById(STYLE_ID);
    if(!style){style=document.createElement('style');style.id=STYLE_ID;document.head.appendChild(style);}
    style.textContent=`
      .ms-inventory-edit-btn,.ms-inventory-photo-btn{min-height:46px;border:1px solid rgba(45,183,246,.72);border-radius:14px;background:rgba(17,59,82,.72);color:#43bcf4;font:inherit;font-weight:800;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;-webkit-tap-highlight-color:transparent}
      .ms-inventory-edit-btn:hover,.ms-inventory-photo-btn:hover{background:rgba(31,93,124,.86)}
      .ms-inventory-extra{width:100%;box-sizing:border-box;margin-top:16px;padding-top:16px;border-top:1px solid rgba(150,190,214,.18);display:grid;grid-template-columns:minmax(100px,150px) minmax(0,1fr);gap:16px;align-items:start}
      .ms-inventory-photo{display:flex;flex-direction:column;gap:10px;min-width:0}
      .ms-inventory-photo-preview{width:100%;aspect-ratio:1/1;border-radius:15px;border:1px solid rgba(150,190,214,.22);background:rgba(255,255,255,.035);display:flex;align-items:center;justify-content:center;overflow:hidden;color:#7899ad;font-size:28px}
      .ms-inventory-photo-preview img{width:100%;height:100%;object-fit:cover;display:block}
      .ms-inventory-photo-btn{width:100%;padding:0 10px;font-size:.9em;white-space:nowrap}
      .ms-inventory-meta{min-width:0;display:grid;gap:9px;padding-top:2px}
      .ms-inventory-meta-row{display:grid;grid-template-columns:minmax(95px,135px) minmax(0,1fr);gap:12px;align-items:baseline;min-height:28px}
      .ms-inventory-meta-label{color:#9ab7c9;font-weight:650}
      .ms-inventory-meta-value{color:#f4f8fb;font-weight:800;min-width:0;overflow-wrap:anywhere}
      .ms-inventory-meta-link{color:#45bdf6!important;text-decoration:none;font-weight:850}
      .ms-inventory-meta-link:hover{text-decoration:underline}
      #${MODAL_ID}{position:fixed;inset:0;z-index:2147483600;display:none;align-items:flex-end;justify-content:center;background:rgba(1,12,20,.72);backdrop-filter:blur(8px);padding:14px;box-sizing:border-box}
      #${MODAL_ID}.is-open{display:flex}
      #${MODAL_ID} .ms-inventory-dialog{width:min(620px,100%);max-height:min(88vh,780px);overflow:auto;border:1px solid rgba(100,169,207,.32);border-radius:24px;background:linear-gradient(180deg,#102c3d,#0a2231);box-shadow:0 28px 80px rgba(0,0,0,.55);padding:20px;box-sizing:border-box;color:#eef8ff}
      #${MODAL_ID} .ms-inventory-dialog h2{margin:0 0 4px;font-size:1.45rem}
      #${MODAL_ID} .ms-inventory-dialog>p{margin:0 0 12px;color:#9db7c8}
      #${MODAL_ID} .ms-inventory-cloud-note{display:flex;align-items:center;gap:8px;margin:0 0 18px;padding:9px 11px;border-radius:12px;background:rgba(46,178,239,.09);color:#a9cde0;font-size:.88rem}
      #${MODAL_ID} .ms-inventory-form{display:grid;gap:14px}
      #${MODAL_ID} label{display:grid;gap:7px;font-weight:750;color:#b7ccda}
      #${MODAL_ID} input{width:100%;box-sizing:border-box;min-height:48px;border-radius:13px;border:1px solid rgba(130,176,201,.28);background:#0b2434;color:#f5fbff;padding:10px 12px;font:inherit;outline:none}
      #${MODAL_ID} input:focus{border-color:#38b9f4;box-shadow:0 0 0 3px rgba(56,185,244,.14)}
      #${MODAL_ID} .ms-inventory-modal-photo{display:grid;grid-template-columns:90px 1fr;gap:12px;align-items:center}
      #${MODAL_ID} .ms-inventory-modal-preview{width:90px;height:90px;border-radius:14px;overflow:hidden;border:1px solid rgba(130,176,201,.25);background:rgba(255,255,255,.035);display:flex;align-items:center;justify-content:center;color:#7899ad}
      #${MODAL_ID} .ms-inventory-modal-preview img{width:100%;height:100%;object-fit:cover}
      #${MODAL_ID} [data-ms-inventory-cloud-status]{min-height:20px;color:#9db7c8;font-size:.86rem}
      #${MODAL_ID} [data-ms-inventory-cloud-status][data-state="ok"]{color:#7ee1a5}
      #${MODAL_ID} [data-ms-inventory-cloud-status][data-state="pending"]{color:#ffd27a}
      #${MODAL_ID} .ms-inventory-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:0}
      #${MODAL_ID} .ms-inventory-actions button{min-height:48px;border-radius:13px;padding:0 18px;font:inherit;font-weight:850;cursor:pointer}
      #${MODAL_ID} .ms-inventory-actions button:disabled{opacity:.6;cursor:wait}
      #${MODAL_ID} .ms-inventory-cancel{border:1px solid rgba(150,190,214,.26);background:#153143;color:#dbe9f2}
      #${MODAL_ID} .ms-inventory-save{border:1px solid #36b9f5;background:#1297d1;color:white}
      @media(max-width:640px){
        .ms-inventory-extra{grid-template-columns:1fr}.ms-inventory-photo{display:grid;grid-template-columns:90px 1fr;align-items:center}.ms-inventory-photo-preview{width:90px;height:90px}.ms-inventory-meta-row{grid-template-columns:105px minmax(0,1fr)}
        #${MODAL_ID}{padding:0;align-items:flex-end}#${MODAL_ID} .ms-inventory-dialog{border-radius:24px 24px 0 0;max-height:92vh;padding:18px 16px calc(18px + env(safe-area-inset-bottom))}
      }
    `;
  }

  function buildModal(){
    let modal=document.getElementById(MODAL_ID);
    if(modal)modal.remove();
    modal=document.createElement('div');
    modal.id=MODAL_ID;
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.innerHTML=`
      <div class="ms-inventory-dialog">
        <h2>Artikel bewerken</h2>
        <p>Pas gegevens aan en voeg desgewenst een foto toe.</p>
        <div class="ms-inventory-cloud-note"><span aria-hidden="true">☁️</span><span>Gegevens worden centraal opgeslagen en zijn daarna hetzelfde op iPhone en iPad.</span></div>
        <form class="ms-inventory-form">
          <label>Artikelnaam<input name="name" autocomplete="off" required></label>
          <label>Prijs<input name="price" inputmode="decimal" placeholder="Bijv. 18,95"></label>
          <label>Verkoopsite<input name="site" autocomplete="off" placeholder="Bijv. Winparts.nl"></label>
          <label>Link naar verkoopsite<input name="url" inputmode="url" autocomplete="url" placeholder="https://..."></label>
          <label>Foto
            <div class="ms-inventory-modal-photo">
              <div class="ms-inventory-modal-preview">📷</div>
              <input name="photo" type="file" accept="image/*">
            </div>
          </label>
          <div data-ms-inventory-cloud-status></div>
          <div class="ms-inventory-actions">
            <button type="button" class="ms-inventory-cancel">Annuleren</button>
            <button type="submit" class="ms-inventory-save">Opslaan</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelector('.ms-inventory-cancel').addEventListener('click',closeEditor);
    modal.addEventListener('click',event=>{if(event.target===modal)closeEditor();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&modal.classList.contains('is-open'))closeEditor();});
    modal.querySelector('input[name="photo"]').addEventListener('change',async event=>{
      const file=event.target.files?.[0];
      if(!file)return;
      try{
        const data=await imageData(file);
        modal.dataset.pendingPhoto=data;
        setModalPreview(data);
      }catch(err){
        console.warn(err);
        alert('Deze foto kon niet worden verwerkt. Kies een andere foto.');
      }
    });
    modal.querySelector('form').addEventListener('submit',async event=>{
      event.preventDefault();
      if(!active)return;
      const form=event.currentTarget;
      const saveButton=form.querySelector('.ms-inventory-save');
      const cancelButton=form.querySelector('.ms-inventory-cancel');
      const rawUrl=form.elements.url.value;
      const url=normaliseUrl(rawUrl);
      if(rawUrl.trim()&&!url){
        form.elements.url.setCustomValidity('Vul een geldige verkooplink in.');
        form.elements.url.reportValidity();
        return;
      }
      form.elements.url.setCustomValidity('');
      saveButton.disabled=true;cancelButton.disabled=true;
      setModalStatus('Opslaan en synchroniseren…','');
      const patch={
        name:form.elements.name.value.trim(),
        price:form.elements.price.value.trim(),
        site:form.elements.site.value.trim(),
        url
      };
      if(modal.dataset.pendingPhoto)patch.photo=modal.dataset.pendingPhoto;
      try{
        const result=await persistRecord(active.key,patch);
        render(active.card,result.saved);
        if(result.cloud){setTimeout(()=>{if(modal.classList.contains('is-open'))closeEditor();},450);}
        else setTimeout(()=>{if(modal.classList.contains('is-open'))closeEditor();},1200);
      }catch(error){
        console.warn(error);
        setModalStatus('Opslaan is mislukt. Probeer het opnieuw.','pending');
      }finally{
        saveButton.disabled=false;cancelButton.disabled=false;
      }
    });
    return modal;
  }

  function setModalPreview(photo){
    const preview=document.querySelector(`#${MODAL_ID} .ms-inventory-modal-preview`);
    if(!preview)return;
    preview.innerHTML=photo?'<img alt="Artikel-foto">':'📷';
    if(photo)preview.querySelector('img').src=photo;
  }

  async function resolveRecordPhoto(record){
    if(record?.photo)return record.photo;
    if(record?.photoPath){
      try{return await getSignedPhotoUrl(record.photoPath);}catch(error){console.warn('Voorraadfoto laden mislukt:',error);}
    }
    return '';
  }

  function openEditor(card){
    const key=card.dataset.msInventoryKey;
    const title=findTitle(card);
    if(!key||!title)return;
    active={card,key,title};
    const all=readStore();
    const record=all[key]||{};
    const modal=document.getElementById(MODAL_ID)||buildModal();
    const form=modal.querySelector('form');
    form.elements.name.value=record.name||card.dataset.msInventoryBaseName||txt(title);
    form.elements.price.value=record.price||'';
    form.elements.site.value=record.site||'';
    form.elements.url.value=record.url||'';
    form.elements.photo.value='';
    delete modal.dataset.pendingPhoto;
    setModalPreview(record.photo||'');
    if(!record.photo&&record.photoPath)resolveRecordPhoto(record).then(setModalPreview);
    setModalStatus(navigator.onLine?'Cloud-synchronisatie actief':'Offline · wijzigingen worden later gesynchroniseerd',navigator.onLine?'':'pending');
    modal.classList.add('is-open');
    requestAnimationFrame(()=>form.elements.name.focus());
  }

  function closeEditor(){
    const modal=document.getElementById(MODAL_ID);
    modal?.classList.remove('is-open');
    active=null;
  }

  function imageData(file){
    return new Promise((resolve,reject)=>{
      if(!file?.type?.startsWith('image/')){reject(new Error('Geen afbeelding'));return;}
      if(file.size>15*1024*1024){reject(new Error('Afbeelding te groot'));return;}
      const reader=new FileReader();
      reader.onerror=()=>reject(reader.error||new Error('Lezen mislukt'));
      reader.onload=()=>{
        const img=new Image();
        img.onerror=()=>reject(new Error('Afbeelding ongeldig'));
        img.onload=()=>{
          const max=720;
          const scale=Math.min(1,max/Math.max(img.naturalWidth||1,img.naturalHeight||1));
          const w=Math.max(1,Math.round(img.naturalWidth*scale));
          const h=Math.max(1,Math.round(img.naturalHeight*scale));
          const canvas=document.createElement('canvas');
          canvas.width=w;canvas.height=h;
          const ctx=canvas.getContext('2d',{alpha:false});
          if(!ctx){reject(new Error('Canvas niet beschikbaar'));return;}
          ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
          resolve(canvas.toDataURL('image/jpeg',.78));
        };
        img.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function smallestMatches(root,re){
    return [...root.querySelectorAll('*')].filter(el=>{
      const own=txt(el);
      if(!re.test(own))return false;
      return ![...el.children].some(child=>re.test(txt(child)));
    });
  }

  function findRoots(){
    const candidates=[...document.querySelectorAll('h1,h2,h3,h4,h5,[role="heading"],strong,div,span')]
      .filter(el=>/Voorraad\s*&\s*reservedelen/i.test(txt(el)))
      .filter(el=>![...el.children].some(child=>/Voorraad\s*&\s*reservedelen/i.test(txt(child))));
    const roots=[];
    for(const head of candidates){
      let node=head;
      let best=head.parentElement;
      for(let i=0;i<7&&node?.parentElement;i++){
        node=node.parentElement;
        const text=txt(node);
        if(/Voorraad\s*&\s*reservedelen/i.test(text))best=node;
        if(/\b\d+\s+op voorraad\b/i.test(text)&&node.querySelectorAll('button').length>=3){best=node;break;}
      }
      if(best&&!roots.some(root=>root===best||root.contains(best)))roots.push(best);
    }
    return roots;
  }

  function findTitle(card){
    const selectors='h2,h3,h4,h5,h6,strong,[class*="title"],[class*="name"]';
    const candidates=[...card.querySelectorAll(selectors)];
    return candidates.find(el=>{
      const value=txt(el);
      return value&&value.length<100&&!/Voorraad\s*&\s*reservedelen/i.test(value)&&!/\b\d+\s+op voorraad\b/i.test(value)&&!/^(Prijs|Verkoopsite|Link|Bewerken|Foto toevoegen)$/i.test(value);
    })||[...card.querySelectorAll('div,span,p')].find(el=>{
      const value=txt(el);
      return el.children.length===0&&value.length>2&&value.length<70&&!/op voorraad|Nr\.|Prijs|Verkoopsite|Link/i.test(value);
    });
  }

  function findCard(stockNode,root){
    let node=stockNode;
    let fallback=null;
    for(let i=0;i<8&&node&&node!==root;i++,node=node.parentElement){
      const buttons=node.querySelectorAll('button');
      const title=findTitle(node);
      if(buttons.length>=2&&title){
        fallback=node;
        if(txt(node).length<1800)return node;
      }
    }
    return fallback;
  }

  function keyFor(card,title){
    const possible=[card.dataset.articleId,card.dataset.itemId,card.dataset.materialId,card.dataset.id,card.id].filter(Boolean)[0];
    if(possible)return 'id:'+slug(possible);
    const onclick=[...card.querySelectorAll('button')].map(button=>button.getAttribute('onclick')||'').join('|');
    const match=onclick.match(/["']([^"']{3,80})["']/);
    if(match)return 'action:'+slug(match[1]);
    const base=txt(title);
    const nr=(txt(card).match(/Nr\.\s*[:.]?\s*([^,+;|]{1,45})/i)||[])[1]||'';
    return 'article:'+slug(base+'-'+nr);
  }

  function render(card,record){
    const title=findTitle(card);
    if(title&&record.name)title.textContent=record.name;
    const price=card.querySelector('[data-ms-inventory-price]');
    const site=card.querySelector('[data-ms-inventory-site]');
    const link=card.querySelector('[data-ms-inventory-link]');
    const preview=card.querySelector('[data-ms-inventory-photo-preview]');
    if(price)price.textContent=formatPrice(record.price);
    const url=normaliseUrl(record.url);
    const siteName=record.site||siteFromUrl(url)||'–';
    if(site){
      site.textContent=siteName;
      if(url){site.href=url;site.classList.add('ms-inventory-meta-link');site.target='_blank';site.rel='noopener noreferrer';}
      else{site.removeAttribute('href');site.removeAttribute('target');site.removeAttribute('rel');site.classList.remove('ms-inventory-meta-link');}
    }
    if(link){
      if(url){link.textContent='Bekijk product ↗';link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.style.display='inline';}
      else{link.textContent='–';link.removeAttribute('href');link.removeAttribute('target');link.removeAttribute('rel');link.style.display='inline';}
    }
    if(preview){
      const direct=record.photo||'';
      const path=record.photoPath||'';
      preview.dataset.photoPath=path;
      preview.innerHTML=direct?'<img alt="Artikel-foto">':'📷';
      if(direct)preview.querySelector('img').src=direct;
      else if(path){
        getSignedPhotoUrl(path).then(photoUrl=>{
          if(!photoUrl||!preview.isConnected||preview.dataset.photoPath!==path)return;
          preview.innerHTML='<img alt="Artikel-foto">';
          preview.querySelector('img').src=photoUrl;
        }).catch(error=>console.warn('Voorraadfoto laden mislukt:',error));
      }
    }
  }

  async function pickPhoto(card){
    const key=card.dataset.msInventoryKey;
    if(!key)return;
    const input=document.createElement('input');
    input.type='file';input.accept='image/*';input.style.display='none';
    document.body.appendChild(input);
    input.addEventListener('change',async()=>{
      const file=input.files?.[0];
      try{
        if(file){
          const photo=await imageData(file);
          const result=await persistRecord(key,{photo},{quiet:true});
          render(card,result.saved);
          if(!result.cloud)alert('Foto is lokaal opgeslagen en wordt gesynchroniseerd zodra de verbinding terug is.');
        }
      }catch(err){console.warn(err);alert('Deze foto kon niet worden verwerkt. Kies een andere foto.');}
      input.remove();
    },{once:true});
    input.click();
    setTimeout(()=>{if(document.body.contains(input)&&!input.files?.length)input.remove();},60000);
  }

  function enhance(card){
    if(!card)return;
    if(card.dataset[MARK]===VERSION){
      const key=card.dataset.msInventoryKey;
      if(key)render(card,readStore()[key]||{});
      return;
    }
    const title=findTitle(card);
    if(!title)return;
    const baseName=card.dataset.msInventoryBaseName||txt(title);
    if(!baseName)return;
    const key=card.dataset.msInventoryKey||keyFor(card,title);
    if(!key)return;

    card.querySelectorAll('.ms-inventory-edit-btn,.ms-inventory-extra').forEach(node=>node.remove());
    card.dataset[MARK]=VERSION;
    card.dataset.msInventoryKey=key;
    card.dataset.msInventoryBaseName=baseName;

    const edit=document.createElement('button');
    edit.type='button';edit.className='ms-inventory-edit-btn';edit.innerHTML='<span aria-hidden="true">✎</span><span>Bewerken</span>';
    edit.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openEditor(card);});
    const existing=[...card.querySelectorAll('button')].filter(button=>!button.classList.contains('ms-inventory-edit-btn')&&!button.classList.contains('ms-inventory-photo-btn'));
    const last=existing[existing.length-1];
    if(last?.parentElement)last.insertAdjacentElement('afterend',edit);else card.prepend(edit);

    const extra=document.createElement('div');
    extra.className='ms-inventory-extra';
    extra.innerHTML=`
      <div class="ms-inventory-photo">
        <div class="ms-inventory-photo-preview" data-ms-inventory-photo-preview>📷</div>
        <button type="button" class="ms-inventory-photo-btn"><span aria-hidden="true">📷</span><span>Foto toevoegen</span></button>
      </div>
      <div class="ms-inventory-meta">
        <div class="ms-inventory-meta-row"><span class="ms-inventory-meta-label">Prijs</span><span class="ms-inventory-meta-value" data-ms-inventory-price>–</span></div>
        <div class="ms-inventory-meta-row"><span class="ms-inventory-meta-label">Verkoopsite</span><a class="ms-inventory-meta-value" data-ms-inventory-site>–</a></div>
        <div class="ms-inventory-meta-row"><span class="ms-inventory-meta-label">Link</span><a class="ms-inventory-meta-value ms-inventory-meta-link" data-ms-inventory-link>–</a></div>
      </div>`;
    extra.querySelector('.ms-inventory-photo-btn').addEventListener('click',event=>{event.preventDefault();event.stopPropagation();pickPhoto(card);});
    card.appendChild(extra);
    render(card,readStore()[key]||{});
  }

  function scan(){
    scanQueued=false;
    injectStyle();
    if(!document.getElementById(MODAL_ID))buildModal();
    const roots=findRoots();
    for(const root of roots){
      const stockNodes=smallestMatches(root,/\b\d+\s+op voorraad\b/i);
      for(const stockNode of stockNodes){
        const card=findCard(stockNode,root);
        if(card)enhance(card);
      }
    }
  }

  function queueScan(){
    if(scanQueued)return;
    scanQueued=true;
    requestAnimationFrame(scan);
  }

  const observer=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.addedNodes?.length))queueScan();
  });

  function start(){
    injectStyle();buildModal();scan();
    if(document.body)observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('hashchange',queueScan);
    window.addEventListener('popstate',queueScan);
    window.addEventListener('mijnserenity:routechange',()=>{queueScan();syncCloud();});
    window.addEventListener('mijnserenity:boot-complete',initialiseCloud,{once:true});
    window.addEventListener('online',initialiseCloud);
    window.addEventListener('focus',()=>{if(navigator.onLine)syncCloud();});
    setInterval(()=>{if(navigator.onLine)syncCloud();},60000);
    setTimeout(initialiseCloud,600);
  }

  window.__msInventoryEditor8212API={scan:queueScan,sync:syncCloud,version:VERSION};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();