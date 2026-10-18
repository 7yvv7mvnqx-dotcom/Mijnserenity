/* MijnSerenity 8.32.7: foto's bij technische logitems.
   De bestaande privé-Supabase Storage en RLS beveiligen de beelden. */
(function(){
  'use strict';
  if(window.msTechPhotosReady)return;
  window.msTechPhotosReady=true;
  const BUCKET='technical-event-photos';
  const MAX_FILES=6;
  const MAX_BYTES=10*1024*1024;
  const IMAGE_TYPES=new Set(['image/jpeg','image/png','image/webp','image/heic','image/heif']);
  let pending=[];
  let previewUrls=[];
  let photosByEvent=new Map();
  let existingEventId='';
  let refreshPromise=null;

  function status(text,isError=false){
    const el=document.getElementById('msTechPhotosStatus');
    if(!el)return;
    el.textContent=text||'';
    el.classList.toggle('ms-tech-photo-error',!!isError);
  }
  function safe(text){
    return String(text??'').replace(/[&<>"']/g,ch=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
  }
  function validImage(file){
    if(!file || !IMAGE_TYPES.has(file.type)){
      status('Kies een JPG-, PNG-, WebP- of HEIC-foto.',true);
      return false;
    }
    if(file.size>MAX_BYTES){
      status('Deze foto is groter dan 10 MB. Verklein de foto en probeer opnieuw.',true);
      return false;
    }
    return true;
  }
  function resetInputs(){
    ['msTechPhotoCamera','msTechPhotoLibrary','msTechPhotoExisting'].forEach(id=>{
      const el=document.getElementById(id);
      if(el)el.value='';
    });
  }
  function clearPreviews(){
    previewUrls.forEach(url=>URL.revokeObjectURL(url));
    previewUrls=[];
  }
  function drawPending(){
    const el=document.getElementById('msTechPendingPhotos');
    if(!el)return;
    clearPreviews();
    el.innerHTML=pending.map((file,index)=>{
      const url=URL.createObjectURL(file);
      previewUrls.push(url);
      return '<div class="ms-tech-pending">'+
        '<img src="'+url+'" alt="Geselecteerde foto">'+
        '<button type="button" onclick="msTechRemovePending('+index+')" aria-label="Geselecteerde foto verwijderen">×</button>'+
        '</div>';
    }).join('');
    const count=document.getElementById('msTechPhotoCount');
    if(count)count.textContent=pending.length
      ?pending.length+' van '+MAX_FILES+' foto’s geselecteerd'
      :'Nog geen foto’s geselecteerd';
  }
  window.msTechPickPhoto=function(where){
    const id=where==='camera'?'msTechPhotoCamera':'msTechPhotoLibrary';
    document.getElementById(id)?.click();
  };
  window.msTechQueuePhotos=function(files){
    if(!files?.length)return;
    let skipped=0;
    for(const file of Array.from(files)){
      if(pending.length>=MAX_FILES){skipped++;continue;}
      if(validImage(file))pending.push(file);
      else skipped++;
    }
    resetInputs();
    drawPending();
    if(skipped)status(skipped+' foto(’s) overgeslagen (maximaal 6 per log, 10 MB per foto).',true);
    else status('');
  };
  window.msTechRemovePending=function(index){
    pending.splice(index,1);
    drawPending();
  };
  window.msTechCancelNewPhotos=function(){
    pending=[];
    clearPreviews();
    resetInputs();
    drawPending();
    status('');
  };
  window.msTechRenderForEvent=function(eventId){
    const photos=photosByEvent.get(String(eventId))||[];
    if(!photos.length)return '';
    return '<div class="ms-tech-event-photos" aria-label="Foto’s bij dit log">'+
      photos.map(photo=>{
        const path=safe(photo.storage_path);
        const id=safe(photo.id);
        const title=safe(photo.original_name||'Logfoto');
        return '<div class="ms-tech-event-photo">'+
          '<img src="'+STORAGE_SAFE_PLACEHOLDER+'" data-storage-bucket="'+BUCKET+
          '" data-storage-path="'+path+'" alt="'+title+
          '" loading="lazy" onclick="openStorageLightbox(\''+BUCKET+'\',this.dataset.storagePath,this)">'+
          '<button class="ms-tech-photo-remove" type="button" title="Foto verwijderen" aria-label="Foto verwijderen" onclick="msTechRemovePhoto(\''+id+'\')">×</button>'+
          '</div>';
      }).join('')+
      '</div>';
  };
  window.msTechPhotosRefresh=async function(){
    if(typeof currentBoat==='undefined'||!currentBoat?.id)return;
    if(refreshPromise)return refreshPromise;
    const boatId=currentBoat.id;
    refreshPromise=(async()=>{
      try{
        const {data,error}=await sb.from('technical_event_photos')
          .select('id,event_id,storage_path,original_name,created_at')
          .eq('boat_id',boatId).order('created_at',{ascending:true}).limit(1000);
        if(error)throw error;
        if(currentBoat?.id!==boatId)return;
        const grouped=new Map();
        for(const photo of data||[]){
          const id=String(photo.event_id);
          if(!grouped.has(id))grouped.set(id,[]);
          grouped.get(id).push(photo);
        }
        photosByEvent=grouped;
        if(typeof renderTechnicalEvents==='function')renderTechnicalEvents();
      }catch(error){
        console.warn('Technische logfoto’s laden mislukt:',error);
        status('Foto’s konden tijdelijk niet worden geladen.',true);
      }
    })();
    try{await refreshPromise;}finally{refreshPromise=null;}
  };
  function fileExtension(file){
    const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif'};
    return types[file.type]||'jpg';
  }
  async function uploadFiles(event,files){
    if(!files.length)return {uploaded:0,failed:0};
    if(!event?.id||event.source!=='cloud'||!currentBoat?.id||!currentUser?.id){
      status('Logitem is lokaal opgeslagen. Voor foto’s is een verbinding met Serenity Cloud nodig.',true);
      return {uploaded:0,failed:files.length};
    }
    let uploaded=0,failed=0;
    for(const file of files){
      if(!validImage(file)){failed++;continue;}
      status('Foto '+(uploaded+failed+1)+' van '+files.length+' opslaan…');
      const path=currentBoat.id+'/'+event.id+'/'+crypto.randomUUID()+'.'+fileExtension(file);
      try{
        const {error:uploadError}=await sb.storage.from(BUCKET).upload(path,file,{
          cacheControl:'31536000',upsert:false,contentType:file.type
        });
        if(uploadError)throw uploadError;
        const {error:metaError}=await sb.from('technical_event_photos').insert({
          event_id:event.id,boat_id:currentBoat.id,created_by:currentUser.id,
          storage_path:path,original_name:file.name
        });
        if(metaError){
          await sb.storage.from(BUCKET).remove([path]);
          throw metaError;
        }
        uploaded++;
      }catch(error){
        failed++;
        console.error('Technische logfoto uploaden mislukt:',error);
      }
    }
    await window.msTechPhotosRefresh();
    status(failed
      ?uploaded+' foto(’s) opgeslagen, '+failed+' niet. Kies de ontbrekende foto opnieuw.'
      :uploaded+' foto(’s) aan het log toegevoegd.',!!failed);
    return {uploaded,failed};
  }
  window.msTechPhotosAfterSave=async function(event){
    const files=pending.slice();
    if(!files.length)return {uploaded:0,failed:0};
    const outcome=await uploadFiles(event,files);
    window.msTechCancelNewPhotos();
    status(outcome.failed
      ?'Logitem bewaard, maar '+outcome.failed+' foto(’s) niet. Voeg deze opnieuw toe via de fotoknop bij het log.'
      :outcome.uploaded+' foto(’s) opgeslagen.',!!outcome.failed);
    return outcome;
  };
  window.msTechPickForEvent=function(eventId){
    const event=(technicalEventsCache||[]).find(e=>String(e.id)===String(eventId));
    if(!event||event.source!=='cloud'){
      status('Bij lokaal opgeslagen logs kun je pas foto’s toevoegen na synchronisatie.',true);
      showAppToast('Logfoto’s vereisen een cloudverbinding.');
      return;
    }
    existingEventId=String(eventId);
    document.getElementById('msTechPhotoExisting')?.click();
  };
  window.msTechUploadExisting=async function(files){
    const selected=Array.from(files||[]).slice(0,MAX_FILES);
    resetInputs();
    if(!selected.length)return;
    const event=(technicalEventsCache||[]).find(e=>String(e.id)===existingEventId);
    if(!event){showAppToast('Logitem niet gevonden.');return;}
    const result=await uploadFiles(event,selected);
    showAppToast(result.failed
      ?'Niet alle foto’s konden worden opgeslagen.'
      :result.uploaded+' foto(’s) toegevoegd ✅');
  };
  window.msTechRemovePhoto=async function(photoId){
    const photo=[...photosByEvent.values()].flat().find(p=>String(p.id)===String(photoId));
    if(!photo||!confirm('Deze foto bij het log verwijderen?'))return;
    const {error:storageError}=await sb.storage.from(BUCKET).remove([photo.storage_path]);
    if(storageError){
      alert('Foto verwijderen mislukt: '+storageError.message);
      return;
    }
    const {error:metaError}=await sb.from('technical_event_photos')
      .delete().eq('id',photo.id).eq('boat_id',currentBoat.id);
    if(metaError){
      alert('Foto verwijderd, maar het fotorecord kon niet worden bijgewerkt: '+metaError.message);
      return;
    }
    storageSafeForgetUrl(BUCKET,photo.storage_path);
    await window.msTechPhotosRefresh();
    showAppToast('Foto verwijderd.');
  };
  window.msTechPhotosAfterDelete=async function(eventId){
    const photos=photosByEvent.get(String(eventId))||[];
    if(!photos.length)return;
    const paths=photos.map(p=>p.storage_path);
    const {error}=await sb.storage.from(BUCKET).remove(paths);
    if(error)console.warn('Oude logfoto-bestanden opruimen mislukt:',error);
    for(const path of paths)storageSafeForgetUrl(BUCKET,path);
    photosByEvent.delete(String(eventId));
  };
  window.addEventListener('mijnserenity:routechange',()=>{
    if(document.getElementById('technicalEventList')?.offsetParent!==null){
      window.msTechPhotosRefresh();
    }
  });
  if(typeof currentBoat!=='undefined'&&currentBoat?.id)window.msTechPhotosRefresh();
})();