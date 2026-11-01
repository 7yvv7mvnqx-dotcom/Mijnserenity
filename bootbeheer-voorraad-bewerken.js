/* MijnSerenity — Voorraad bewerken, fotograferen en miniaturen.
   Uitbreiding op Bootbeheer 8.1; laat bestaande artikelen ongewijzigd. */
(()=>{
  'use strict';
  if(window.__msBootbeheerInventoryEdit1)return;
  window.__msBootbeheerInventoryEdit1=true;
  const BUCKET='boat-documents';
  const photoUrls=new Map();
  const inFlight=new Map();
  let modal=null;
  let selectedFile=null;
  let previewUrl=null;
  let dropPhoto=false;
  let pending=false;
  const el=id=>document.getElementById(id);
  const uid=()=>globalThis.crypto?.randomUUID?.()||('ms-'+Date.now()+'-'+Math.random().toString(16).slice(2));
  const getBoat=()=>{try{return currentBoat||null}catch(_){return null}};
  const getUser=()=>{try{return currentUser||null}catch(_){return null}};
  const getClient=()=>{try{return sb||null}catch(_){return null}};
  const boatId=()=>String(getBoat()?.id||getBoat()?.boat_id||getBoat()?.name||'serenity');
  const storageKey=()=> 'mijnserenity:bootbeheer:v1:'+boatId();
  const read=()=>{try{return JSON.parse(localStorage.getItem(storageKey())||'null')}catch(_){return null}};
  const inventoryActive=()=>{
    const overlay=el('msBootbeheerOverlay');
    if(!overlay?.classList.contains('open'))return false;
    const active=overlay.querySelector('#msbmTabs .msbm-tab.active');
    return (active?.textContent||'').trim().toLowerCase()==='voorraad';
  };
  const numberOr=(value,fallback=0)=>{
    const n=Number(String(value??'').replace(',','.'));
    return Number.isFinite(n)?Math.max(0,Math.round(n)):fallback;
  };

  function installStyles(){
    if(el('msbmInventoryEditStyles'))return;
    const style=document.createElement('style');
    style.id='msbmInventoryEditStyles';
    style.textContent=[
      '.msbm-inventory-edit{cursor:pointer;border-radius:10px;outline-offset:4px}',
      '.msbm-inventory-edit:focus-visible,.msbm-inv-thumb:focus-visible{outline:3px solid #47c5ff}',
      '.msbm-inventory-edit strong:after{content:" ✎";font-size:13px;color:#5acfff;opacity:.9}',
      '.msbm-inv-thumb{flex:0 0 54px;width:54px;height:54px;border:1px solid rgba(85,200,245,.4);border-radius:12px;overflow:hidden;display:grid;place-items:center;padding:0;background:#0b293c;color:#7edbff;font-size:24px;cursor:pointer}',
      '.msbm-inv-thumb img{display:block;width:100%;height:100%;object-fit:cover}',
      '@media(max-width:650px){.msbm-inventory-item{display:grid!important;grid-template-columns:54px minmax(0,1fr);gap:10px!important;align-items:center!important}.msbm-inventory-item>.msbm-actions{grid-column:2;grid-row:2;justify-content:flex-start}.msbm-inventory-item>.msbm-row-main{grid-column:2;grid-row:1}.msbm-inventory-item>.msbm-inv-thumb{grid-column:1;grid-row:1/3}}',
      '.msbm-inv-modal{position:fixed;inset:0;z-index:2147483200;background:rgba(0,5,14,.78);display:flex;align-items:flex-end;justify-content:center;padding:12px 12px calc(12px + env(safe-area-inset-bottom));box-sizing:border-box}',
      '.msbm-inv-panel{background:#102637;color:#eff9ff;border:1px solid rgba(96,207,255,.32);border-radius:22px;width:min(600px,100%);max-height:90dvh;overflow:auto;padding:18px;box-sizing:border-box;box-shadow:0 18px 55px rgba(0,0,0,.45)}',
      '.msbm-inv-panel h3{margin:0;font-size:20px}.msbm-inv-panel header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:14px}',
      '.msbm-inv-panel form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.msbm-inv-panel label{display:grid;gap:5px;font-size:12px;color:#b9cfdb;font-weight:800}',
      '.msbm-inv-panel input:not([type=file]),.msbm-inv-panel textarea{width:100%;min-width:0;box-sizing:border-box;background:#071824;border:1px solid rgba(160,210,235,.23);color:#fff;padding:11px;border-radius:12px;font:inherit}',
      '.msbm-inv-panel textarea{resize:vertical;min-height:75px}.msbm-inv-wide{grid-column:1/-1}',
      '.msbm-inv-photo{display:flex;gap:14px;align-items:center;flex-wrap:wrap;padding:10px;border:1px dashed rgba(97,203,246,.4);border-radius:14px}',
      '.msbm-inv-preview{width:86px;height:86px;object-fit:cover;border-radius:12px;background:#09202f;border:1px solid rgba(97,203,246,.25)}',
      '.msbm-inv-preview-empty{width:86px;height:86px;border-radius:12px;display:grid;place-items:center;background:#09202f;font-size:30px;color:#71d6ff}',
      '.msbm-inv-photo-buttons{display:flex;gap:7px;flex-wrap:wrap;flex:1}.msbm-inv-panel button{min-height:40px;padding:9px 12px;border-radius:11px;border:1px solid rgba(122,213,251,.3);background:#1c3a4b;color:#e9f8ff;font-weight:800;cursor:pointer}',
      '.msbm-inv-panel button.primary{background:#48c5ff;color:#061623;border:0}.msbm-inv-panel button:disabled{opacity:.55;cursor:wait}',
      '.msbm-inv-panel footer{display:flex;justify-content:flex-end;gap:9px;margin-top:4px}.msbm-inv-panel small{display:block;color:#b7cfdd;line-height:1.4}',
      '@media(max-width:420px){.msbm-inv-panel{padding:14px}.msbm-inv-panel form{grid-template-columns:1fr}.msbm-inv-wide{grid-column:auto}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function showThumb(button,item){
    button.replaceChildren();
    const path=String(item.photoPath||'');
    const legacy=String(item.photoData||'');
    if(legacy.startsWith('data:image/')){
      const img=document.createElement('img');img.src=legacy;img.alt='Foto '+item.name;button.appendChild(img);return;
    }
    if(!path){button.textContent='📷';return}
    button.textContent='📷';
    const cached=photoUrls.get(path);
    if(cached&&cached.until>Date.now()){
      const img=document.createElement('img');img.src=cached.url;img.alt='Foto '+item.name;img.onerror=()=>{button.replaceChildren();button.textContent='📷'};
      button.replaceChildren(img);return;
    }
    const client=getClient();
    if(!client)return;
    if(!inFlight.has(path)){
      const promise=client.storage.from(item.photoBucket||BUCKET).createSignedUrl(path,14400)
        .then(({data,error})=>{
          if(error||!data?.signedUrl)throw error||new Error('Foto niet beschikbaar');
          photoUrls.set(path,{url:data.signedUrl,until:Date.now()+13800000});
          return data.signedUrl;
        }).catch(error=>{console.warn('Bootbeheer foto laden:',error);return ''})
        .finally(()=>inFlight.delete(path));
      inFlight.set(path,promise);
    }
    inFlight.get(path).then(url=>{
      if(!url||!button.isConnected||button.dataset.path!==path)return;
      const img=document.createElement('img');img.src=url;img.alt='Foto '+item.name;
      img.onerror=()=>{button.replaceChildren();button.textContent='📷'};
      button.replaceChildren(img);
    });
  }

  function decorate(){
    if(!inventoryActive())return;
    const host=el('msbmContent'),data=read();
    if(!host||!Array.isArray(data?.inventory))return;
    const items=new Map(data.inventory.map(item=>[String(item.id),item]));
    host.querySelectorAll('.msbm-list .msbm-row').forEach(row=>{
      const btn=Array.from(row.querySelectorAll('button')).find(b=>(b.getAttribute('onclick')||'').includes("msBootbeheerDelete('inventory'"));
      const id=btn?.getAttribute('onclick')?.match(/msBootbeheerDelete\('inventory','([^']+)'\)/)?.[1];
      const item=items.get(String(id||''));
      if(!item||row.dataset.msbmInventoryEdit===id)return;
      row.dataset.msbmInventoryEdit=id;
      row.classList.add('msbm-inventory-item');
      const main=row.querySelector('.msbm-row-main');
      if(!main)return;
      main.classList.add('msbm-inventory-edit');
      main.tabIndex=0;
      main.setAttribute('role','button');
      main.setAttribute('aria-label','Bewerk artikel '+item.name);
      main.title='Tik om artikel te bewerken';
      main.addEventListener('click',()=>openEditor(id));
      main.addEventListener('keydown',event=>{
        if(event.key==='Enter'||event.key===' '){event.preventDefault();openEditor(id)}
      });
      const photo=document.createElement('button');
      photo.type='button';photo.className='msbm-inv-thumb';photo.title='Foto toevoegen of artikel bewerken';
      photo.setAttribute('aria-label','Foto of artikel bewerken: '+item.name);
      photo.dataset.path=String(item.photoPath||'');
      photo.addEventListener('click',()=>openEditor(id));
      row.insertBefore(photo,main);
      showThumb(photo,item);
    });
  }

  function schedule(){
    if(pending)return;
    pending=true;requestAnimationFrame(()=>{pending=false;decorate()});
  }
  function clearPreview(){
    if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null}
  }
  function closeModal(){
    clearPreview();modal?.remove();modal=null;selectedFile=null;dropPhoto=false;
  }

  function updatePreview(item){
    const host=modal?.querySelector('[data-preview]');
    if(!host)return;
    host.replaceChildren();
    let src='';
    if(selectedFile){clearPreview();previewUrl=URL.createObjectURL(selectedFile);src=previewUrl}
    else if(!dropPhoto && item?.photoData?.startsWith('data:image/'))src=item.photoData;
    else if(!dropPhoto&&item?.photoPath){
      const cached=photoUrls.get(item.photoPath);
      if(cached?.until>Date.now())src=cached.url;
    }
    if(src){
      const img=document.createElement('img');img.className='msbm-inv-preview';img.alt='Artikelafbeelding';img.src=src;host.appendChild(img);
    }else{
      const placeholder=document.createElement('div');placeholder.className='msbm-inv-preview-empty';placeholder.textContent='📷';host.appendChild(placeholder);
    }
    const remove=modal.querySelector('[data-remove-photo]');
    if(remove)remove.hidden=!selectedFile&&(!item?.photoPath&&!item?.photoData||dropPhoto);
  }

  function openEditor(id){
    const existing=id?read()?.inventory?.find(item=>String(item.id)===String(id)):null;
    if(id&&!existing){alert('Dit artikel is niet meer beschikbaar. Open de voorraad opnieuw.');return}
    closeModal();
    const panel=document.createElement('div');
    panel.className='msbm-inv-modal';
    panel.innerHTML=[
      "<section class='msbm-inv-panel' role='dialog' aria-modal='true' aria-label='Voorraadartikel bewerken'>",
      "<header><h3>"+(existing?'Artikel bewerken':'Artikel toevoegen')+"</h3><button type='button' data-close aria-label='Sluiten'>✕</button></header>",
      "<form>",
      "<label class='msbm-inv-wide'>Artikelnaam<input name='name' required maxlength='150' placeholder='Bijv. oliefilter'></label>",
      "<label>Artikel-/onderdeelnummer<input name='partNo' maxlength='100'></label>",
      "<label>Locatie aan boord<input name='location' maxlength='150' placeholder='Bijv. motorruimte'></label>",
      "<label>Aantal op voorraad<input name='qty' type='number' min='0' step='1' required></label>",
      "<label>Waarschuwen bij<input name='minQty' type='number' min='0' step='1' required></label>",
      "<label class='msbm-inv-wide'>Notitie<textarea name='notes'></textarea></label>",
      "<div class='msbm-inv-wide'><strong>Artikelafbeelding</strong><div class='msbm-inv-photo'><div data-preview></div><div class='msbm-inv-photo-buttons'>",
      "<button type='button' data-camera>📷 Maak foto</button><button type='button' data-library>🖼️ Kies foto</button><button type='button' data-remove-photo>Verwijder foto</button>",
      "</div></div><small>Foto's worden veilig bij de Serenity opgeslagen en zijn daarna ook op andere apparaten zichtbaar.</small></div>",
      "<input type='file' data-camera-input accept='image/*' capture='environment' hidden>",
      "<input type='file' data-library-input accept='image/*' hidden>",
      "<footer class='msbm-inv-wide'><button type='button' data-close>Annuleren</button><button type='submit' class='primary' data-save>Opslaan</button></footer>",
      "</form></section>"
    ].join('');
    document.body.appendChild(panel);modal=panel;
    const f=panel.querySelector('form');
    ['name','partNo','location','qty','minQty','notes'].forEach(name=>{
      const node=f.elements.namedItem(name);
      if(node)node.value=String(existing?.[name]??(name==='qty'||name==='minQty'?'1':''));
    });
    const selectFile=file=>{
      if(!file)return;
      if(!file.type.startsWith('image/')&&!/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)){alert('Kies een afbeeldingsbestand.');return}
      if(file.size>20*1024*1024){alert('Deze foto is groter dan 20 MB. Kies een kleinere foto.');return}
      selectedFile=file;dropPhoto=false;updatePreview(existing);
    };
    panel.querySelector('[data-camera]').addEventListener('click',()=>panel.querySelector('[data-camera-input]').click());
    panel.querySelector('[data-library]').addEventListener('click',()=>panel.querySelector('[data-library-input]').click());
    panel.querySelectorAll('input[type=file]').forEach(input=>input.addEventListener('change',()=>{
      const file=input.files?.[0];input.value='';selectFile(file);
    }));
    panel.querySelector('[data-remove-photo]').addEventListener('click',()=>{selectedFile=null;dropPhoto=true;clearPreview();updatePreview(existing)});
    panel.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closeModal));
    panel.addEventListener('click',event=>{if(event.target===panel)closeModal()});
    panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeModal()}});
    f.addEventListener('submit',event=>{event.preventDefault();void saveEditor(id,f)});
    updatePreview(existing);
    f.elements.namedItem('name')?.focus();
  }

  async function optimisePhoto(file){
    if(file.size<=1200000 && /image\/(jpeg|png|webp)/i.test(file.type))return file;
    return new Promise(resolve=>{
      const original=URL.createObjectURL(file);
      const image=new Image();
      image.onload=()=>{
        try{
          const scale=Math.min(1,1280/Math.max(image.naturalWidth,image.naturalHeight));
          const canvas=document.createElement('canvas');
          canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
          canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
          const ctx=canvas.getContext('2d');
          if(!ctx)throw new Error('Canvas niet beschikbaar');
          ctx.drawImage(image,0,0,canvas.width,canvas.height);
          canvas.toBlob(blob=>{URL.revokeObjectURL(original);resolve(blob||file)},'image/jpeg',.8);
        }catch(_){URL.revokeObjectURL(original);resolve(file)}
      };
      image.onerror=()=>{URL.revokeObjectURL(original);resolve(file)};
      image.src=original;
    });
  }

  async function saveEditor(id,form){
    const saveButton=modal?.querySelector('[data-save]');
    if(!saveButton||saveButton.disabled)return;
    saveButton.disabled=true;saveButton.textContent='Opslaan…';
    let uploadedPath='';
    try{
      const data=read();
      if(!data||!Array.isArray(data.inventory))throw new Error('De actuele voorraad kon niet worden geladen.');
      let item=id?data.inventory.find(value=>String(value.id)===String(id)):null;
      if(id&&!item)throw new Error('Dit artikel is intussen verwijderd. Vernieuw de voorraad.');
      const values=new FormData(form);
      const name=String(values.get('name')||'').trim();
      if(!name)throw new Error('Vul een artikelnaam in.');
      const updates={
        name,partNo:String(values.get('partNo')||'').trim(),
        location:String(values.get('location')||'').trim(),
        qty:numberOr(values.get('qty')),minQty:numberOr(values.get('minQty')),
        notes:String(values.get('notes')||'').trim()
      };
      if(selectedFile){
        const client=getClient(),bId=String(getBoat()?.id||getBoat()?.boat_id||'');
        if(!client||!bId||!getUser()?.id)throw new Error('Voor foto-opslag moet je ingelogd en online zijn.');
        const photo=await optimisePhoto(selectedFile);
        const ext=photo.type==='image/jpeg'?'jpg':(selectedFile.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
        uploadedPath=bId+'/inventory/'+uid()+'.'+(ext||'jpg');
        const result=await client.storage.from(BUCKET).upload(uploadedPath,photo,{
          cacheControl:'3600',upsert:false,contentType:photo.type||selectedFile.type||'image/jpeg'
        });
        if(result.error)throw result.error;
        updates.photoPath=uploadedPath;updates.photoBucket=BUCKET;
        delete updates.photoData;
      }
      const stamp=new Date().toISOString();
      if(!item){item={id:uid(),createdAt:stamp};data.inventory.push(item)}
      Object.assign(item,updates,{modifiedAt:stamp});
      if(dropPhoto){delete item.photoPath;delete item.photoBucket;delete item.photoData}
      if(uploadedPath)delete item.photoData;
      data.updatedAt=stamp;
      localStorage.setItem(storageKey(),JSON.stringify(data));
      closeModal();
      // De bestaande Bootbeheer-module leest de gewijzigde gegevens opnieuw in.
      window.msBootbeheerClose?.();
      await window.msBootbeheerOpen?.();
      window.msBootbeheerSection?.('inventory');
      // De bestaande beveiligde cloud-synchronisatie verwerkt deze wijziging.
      try{await window.msBootbeheerCloudSync?.()}catch(error){console.warn('Voorraad lokaal opgeslagen, cloud later:',error)}
    }catch(error){
      if(uploadedPath){
        try{await getClient()?.storage.from(BUCKET).remove([uploadedPath])}catch(_){}
      }
      console.error('Voorraadartikel opslaan mislukt:',error);
      alert('Artikel opslaan mislukt: '+(error?.message||error));
    }finally{
      const button=modal?.querySelector('[data-save]');
      if(button){button.disabled=false;button.textContent='Opslaan'}
    }
  }

  function wrapAdd(){
    const original=window.msBootbeheerAddCurrent;
    if(typeof original!=='function'||original.__msInventoryEditWrapped)return;
    const wrapped=function(){
      if(inventoryActive())return openEditor(null);
      return original.apply(this,arguments);
    };
    wrapped.__msInventoryEditWrapped=true;
    window.msBootbeheerAddCurrent=wrapped;
  }
  function start(){
    installStyles();wrapAdd();schedule();
    new MutationObserver(changes=>{
      if(changes.some(x=>x.addedNodes.length||x.removedNodes.length))schedule();
    }).observe(el('msBootbeheerOverlay')||document.body,{childList:true,subtree:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()},{passive:true});
    window.addEventListener('storage',schedule);
    setInterval(wrapAdd,1500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();