/* MijnSerenity 8.1.0 — Bootbeheer Cloud
   Synchroniseert de local-first Bootbeheer-module via Supabase en verzorgt
   privé documentuploads per boot. De bestaande boat_members RLS blijft leidend. */
(()=>{
  'use strict';
  if(window.__msBootbeheerCloud8100)return;
  window.__msBootbeheerCloud8100=true;

  const TABLE='boat_management_state';
  const BUCKET='boat-documents';
  const DB_VERSION=1;
  const SYNC_INTERVAL=8000;
  let channel=null;
  let lastPushedStamp='';
  let syncing=false;
  let observer=null;
  let bootIdAtSubscription='';

  const $=id=>document.getElementById(id);
  const getBoat=()=>{
    try{return currentBoat||null}catch{return null}
  };
  const getUser=()=>{
    try{return currentUser||null}catch{return null}
  };
  const getSb=()=>{
    try{return sb||null}catch{return null}
  };
  const boatId=()=>String(getBoat()?.id||getBoat()?.boat_id||'');
  const userId=()=>String(getUser()?.id||'');
  const localKey=()=>`mijnserenity:bootbeheer:v${DB_VERSION}:${boatId()||'serenity'}`;
  const uid=()=>globalThis.crypto?.randomUUID?.()||`ms-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  function readLocal(){
    try{return JSON.parse(localStorage.getItem(localKey())||'null')}
    catch{return null}
  }
  function writeLocal(data){
    if(!data||typeof data!=='object')return false;
    try{localStorage.setItem(localKey(),JSON.stringify(data));return true}catch{return false}
  }
  function localStamp(){return String(readLocal()?.updatedAt||'')}
  function timestamp(value){const n=new Date(value||0).getTime();return Number.isFinite(n)?n:0}

  function status(text,tone='neutral'){
    const badge=$('msbmCloudStatus');
    if(badge){badge.textContent=text;badge.dataset.tone=tone}
    const launch=$('msbmCloudLauncher');
    if(launch){launch.textContent=text;launch.dataset.tone=tone}
  }

  function installStyle(){
    if($('msbmCloudStyle8100'))return;
    const style=document.createElement('style');
    style.id='msbmCloudStyle8100';
    style.textContent=`
      #msbmCloudStatus,#msbmCloudLauncher{display:inline-flex;align-items:center;gap:5px;border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:5px 8px;font-size:10px;font-weight:850;color:#b8cada;background:rgba(255,255,255,.05)}
      #msbmCloudStatus[data-tone="ok"],#msbmCloudLauncher[data-tone="ok"]{color:#8af0bd;border-color:rgba(66,211,146,.25);background:rgba(66,211,146,.09)}
      #msbmCloudStatus[data-tone="busy"],#msbmCloudLauncher[data-tone="busy"]{color:#89dcff;border-color:rgba(69,197,255,.25);background:rgba(69,197,255,.09)}
      #msbmCloudStatus[data-tone="warn"],#msbmCloudLauncher[data-tone="warn"]{color:#ffd37a;border-color:rgba(255,191,71,.25);background:rgba(255,191,71,.09)}
      #msbmCloudStatus[data-tone="error"],#msbmCloudLauncher[data-tone="error"]{color:#ff9f9f;border-color:rgba(255,107,107,.25);background:rgba(255,107,107,.09)}
      .msbm-cloud-upload{border:1px solid rgba(69,197,255,.35);background:rgba(69,197,255,.1);color:#89dcff;border-radius:13px;padding:9px 11px;font-weight:850}
      .msbm-cloud-file{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}
    `;
    document.head.appendChild(style);
  }

  function decorateStatus(){
    const head=document.querySelector('#msBootbeheerOverlay .msbm-head-copy');
    if(head&&!$('msbmCloudStatus')){
      const badge=document.createElement('span');
      badge.id='msbmCloudStatus';badge.textContent='Cloud klaar';badge.dataset.tone='neutral';
      head.appendChild(document.createTextNode(' '));head.appendChild(badge);
    }
    const launcher=$('msBootbeheerLauncher');
    const launchHead=launcher?.querySelector('.msbm-launch-title > div');
    if(launchHead&&!$('msbmCloudLauncher')){
      const badge=document.createElement('span');badge.id='msbmCloudLauncher';badge.textContent='Cloud klaar';
      launchHead.appendChild(document.createElement('br'));launchHead.appendChild(badge);
    }
  }

  async function pullCloud({force=false}={}){
    const client=getSb(),bId=boatId();
    if(!client||!bId||!userId())return null;
    if(syncing)return null;
    syncing=true;status('Cloud ophalen…','busy');
    try{
      const {data,error}=await client.from(TABLE).select('data,updated_at,updated_by').eq('boat_id',bId).maybeSingle();
      if(error)throw error;
      if(!data?.data){status('Cloud verbonden','ok');return null;}
      const local=readLocal();
      const remoteStamp=data.updated_at||data.data?.updatedAt||'';
      const localTime=timestamp(local?.updatedAt);
      const remoteTime=Math.max(timestamp(remoteStamp),timestamp(data.data?.updatedAt));
      if(force||!local||remoteTime>localTime+500){
        const next={...data.data,updatedAt:data.data.updatedAt||remoteStamp};
        writeLocal(next);
        lastPushedStamp=String(next.updatedAt||remoteStamp||'');
      }else{
        lastPushedStamp=String(local?.updatedAt||'');
      }
      status('Cloud gesynchroniseerd','ok');
      return data.data;
    }catch(error){
      console.warn('Bootbeheer cloud ophalen mislukt:',error);
      status('Cloud niet bereikbaar','warn');
      return null;
    }finally{syncing=false}
  }

  async function pushCloud({force=false}={}){
    const client=getSb(),bId=boatId(),uId=userId(),local=readLocal();
    if(!client||!bId||!uId||!local)return false;
    const stamp=String(local.updatedAt||'');
    if(!force&&stamp&&stamp===lastPushedStamp)return true;
    if(syncing)return false;
    syncing=true;status('Cloud opslaan…','busy');
    try{
      const payload={boat_id:bId,data:local,updated_by:uId,updated_at:new Date().toISOString()};
      const {error}=await client.from(TABLE).upsert(payload,{onConflict:'boat_id'});
      if(error)throw error;
      lastPushedStamp=stamp;
      status('Cloud gesynchroniseerd','ok');
      return true;
    }catch(error){
      console.warn('Bootbeheer cloud opslaan mislukt:',error);
      status('Lokaal bewaard','warn');
      return false;
    }finally{syncing=false}
  }

  function activeSection(){
    const btn=document.querySelector('#msbmTabs .msbm-tab.active');
    const attr=btn?.getAttribute('onclick')||'';
    return attr.match(/msBootbeheerSection\('([^']+)'\)/)?.[1]||'overview';
  }

  function refreshOpenOverlay(section='overview'){
    const overlay=$('msBootbeheerOverlay');
    if(!overlay?.classList.contains('open'))return;
    try{
      window.msBootbeheerClose?.();
      window.msBootbeheerOpen?.();
      if(section&&section!=='overview')window.msBootbeheerSection?.(section);
    }catch(error){console.debug('Bootbeheer scherm verversen:',error)}
  }

  function subscribe(){
    const client=getSb(),bId=boatId();
    if(!client||!bId||bootIdAtSubscription===bId)return;
    try{if(channel)client.removeChannel(channel)}catch{}
    bootIdAtSubscription=bId;
    channel=client.channel(`ms-bootbeheer-${bId}`)
      .on('postgres_changes',{event:'*',schema:'public',table:TABLE,filter:`boat_id=eq.${bId}`},async payload=>{
        const remoteBy=String(payload?.new?.updated_by||'');
        if(remoteBy&&remoteBy===userId())return;
        const section=activeSection();
        await pullCloud({force:true});
        refreshOpenOverlay(section);
      })
      .subscribe(statusValue=>{
        if(statusValue==='SUBSCRIBED')status('Cloud live','ok');
      });
  }

  function safeName(name){
    const base=String(name||'document').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-');
    return base.slice(0,120)||'document';
  }

  function documentType(file){
    const type=String(file?.type||'').toLowerCase();
    if(type==='application/pdf')return 'PDF';
    if(type.startsWith('image/'))return 'Foto / scan';
    return 'Document';
  }

  async function uploadDocument(file){
    const client=getSb(),bId=boatId(),uId=userId();
    if(!file||!client||!bId||!uId)return;
    if(file.size>25*1024*1024){alert('Dit document is groter dan 25 MB.');return}
    status('Document uploaden…','busy');
    const path=`${bId}/${new Date().toISOString().slice(0,10)}/${uid()}-${safeName(file.name)}`;
    try{
      const {error}=await client.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
      if(error)throw error;
      const local=readLocal()||{version:DB_VERSION,updatedAt:new Date().toISOString(),maintenance:[],equipment:[],inventory:[],tasks:[],documents:[],notes:[],checklists:[]};
      if(!Array.isArray(local.documents))local.documents=[];
      local.documents.push({id:uid(),title:file.name,type:documentType(file),expiry:'',path,bucket:BUCKET,size:file.size,mime:file.type||'',notes:'',createdAt:new Date().toISOString()});
      local.updatedAt=new Date().toISOString();
      writeLocal(local);
      await pushCloud({force:true});
      status('Document opgeslagen','ok');
      refreshOpenOverlay('documents');
    }catch(error){
      console.error('Bootbeheer documentupload mislukt:',error);
      status('Upload mislukt','error');
      alert(`Document uploaden mislukt: ${error?.message||error}`);
    }
  }

  async function openStoredDocument(id){
    const doc=readLocal()?.documents?.find(item=>item.id===id);
    if(!doc?.path)return;
    try{
      if(typeof openStorageDocument==='function')return openStorageDocument(doc.bucket||BUCKET,doc.path);
    }catch{}
    const client=getSb();if(!client)return;
    const popup=window.open('about:blank','_blank');
    try{
      const {data,error}=await client.storage.from(doc.bucket||BUCKET).createSignedUrl(doc.path,3600);
      if(error||!data?.signedUrl)throw error||new Error('Geen tijdelijke documentlink ontvangen.');
      if(popup)popup.location.href=data.signedUrl;else window.location.href=data.signedUrl;
    }catch(error){popup?.close();alert(`Document openen mislukt: ${error?.message||error}`)}
  }

  function documentIdFromRow(row){
    const deleteButton=[...row.querySelectorAll('button')].find(btn=>(btn.getAttribute('onclick')||'').includes("msBootbeheerDelete('documents'"));
    const code=deleteButton?.getAttribute('onclick')||'';
    return code.match(/msBootbeheerDelete\('documents','([^']+)'\)/)?.[1]||'';
  }

  function decorateDocuments(){
    const host=$('msbmContent');if(!host)return;
    const header=[...host.querySelectorAll('.msbm-section-head h3')].find(el=>el.textContent.trim()==='Documenten');
    if(!header)return;
    const head=header.closest('.msbm-section-head');
    if(head&&!head.querySelector('[data-msbm-cloud-upload]')){
      const actions=head.lastElementChild?.tagName==='BUTTON'?head.lastElementChild:null;
      const wrap=document.createElement('div');wrap.className='msbm-actions';wrap.dataset.msbmCloudUpload='1';
      const button=document.createElement('button');button.type='button';button.className='msbm-cloud-upload';button.textContent='⬆️ Upload';
      const input=document.createElement('input');input.type='file';input.className='msbm-cloud-file';input.accept='application/pdf,image/jpeg,image/png,image/heic,image/heif,text/plain';
      button.addEventListener('click',()=>input.click());input.addEventListener('change',()=>{const file=input.files?.[0];input.value='';if(file)uploadDocument(file)});
      wrap.append(button,input);if(actions){actions.insertAdjacentElement('beforebegin',wrap)}else head.appendChild(wrap);
    }
    const docs=readLocal()?.documents||[];
    host.querySelectorAll('.msbm-row').forEach(row=>{
      const id=documentIdFromRow(row);if(!id)return;
      const doc=docs.find(item=>item.id===id);if(!doc?.path||row.querySelector('[data-msbm-open-doc]'))return;
      const actions=row.querySelector('.msbm-actions')||row;
      const open=document.createElement('button');open.type='button';open.className='msbm-iconbtn';open.dataset.msbmOpenDoc='1';open.title='Document openen';open.textContent='↗';open.addEventListener('click',()=>openStoredDocument(id));actions.prepend(open);
    });
  }

  function decorate(){decorateStatus();decorateDocuments()}

  function wrapOpen(){
    if(window.__msBootbeheerCloudOpenWrapped||typeof window.msBootbeheerOpen!=='function')return false;
    window.__msBootbeheerCloudOpenWrapped=true;
    const original=window.msBootbeheerOpen;
    window.msBootbeheerOpen=async function(){
      await pullCloud();
      original.apply(this,arguments);
      setTimeout(decorate,0);
    };
    return true;
  }

  function wrapMutations(){
    const names=['msBootbeheerCompleteMaintenance','msBootbeheerStock','msBootbeheerToggleTask','msBootbeheerChecklistToggle','msBootbeheerResetChecklist'];
    names.forEach(name=>{
      const original=window[name];if(typeof original!=='function'||original.__msCloudWrapped)return;
      const wrapped=function(){const result=original.apply(this,arguments);setTimeout(()=>pushCloud(),80);return result};
      wrapped.__msCloudWrapped=true;window[name]=wrapped;
    });
    const remove=window.msBootbeheerDelete;
    if(typeof remove==='function'&&!remove.__msCloudWrapped){
      const wrapped=function(collection,id){
        const before=collection==='documents'?readLocal()?.documents?.find(item=>item.id===id):null;
        const result=remove.apply(this,arguments);
        setTimeout(async()=>{
          const stillThere=collection==='documents'&&readLocal()?.documents?.some(item=>item.id===id);
          if(before?.path&&!stillThere){try{await getSb()?.storage.from(before.bucket||BUCKET).remove([before.path])}catch(error){console.warn('Documentbestand verwijderen:',error)}}
          await pushCloud();
        },100);
        return result;
      };
      wrapped.__msCloudWrapped=true;window.msBootbeheerDelete=wrapped;
    }
    const imported=window.msBootbeheerImport;
    if(typeof imported==='function'&&!imported.__msCloudWrapped){
      const wrapped=async function(){const result=await imported.apply(this,arguments);await pushCloud({force:true});return result};
      wrapped.__msCloudWrapped=true;window.msBootbeheerImport=wrapped;
    }
  }

  async function initialSync(){
    if(!boatId()||!userId())return false;
    const local=readLocal();
    const remote=await pullCloud();
    if(!remote&&local)await pushCloud({force:true});
    subscribe();decorate();
    return true;
  }

  function start(){
    installStyle();
    let tries=0;
    const ready=setInterval(async()=>{
      tries+=1;
      if(window.__msBootbeheer8100){
        clearInterval(ready);wrapOpen();wrapMutations();decorate();await initialSync();
      }else if(tries>60)clearInterval(ready);
    },250);

    setInterval(()=>{
      if(document.hidden)return;
      wrapOpen();wrapMutations();decorate();
      if(boatId()&&userId()){
        if(localStamp()&&localStamp()!==lastPushedStamp)pushCloud();
        subscribe();
      }
    },SYNC_INTERVAL);

    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){if(localStamp()!==lastPushedStamp)pushCloud()}
      else{pullCloud();subscribe();decorate()}
    },{passive:true});

    observer=new MutationObserver(()=>requestAnimationFrame(decorate));
    observer.observe(document.body,{childList:true,subtree:true});
  }

  window.msBootbeheerCloudSync=async()=>{await pullCloud();await pushCloud();};
  window.msBootbeheerUploadDocument=uploadDocument;
  window.msBootbeheerOpenStoredDocument=openStoredDocument;

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
