/* ============================================================
   MijnSerenity 7.5.5 — apparaat-synchronisatie en Start Guard
   De bootbrede stand van automatisch varen wordt klein en veilig
   opgeslagen in de bestaande live_navigation_state-rij.
   Slechts één apparaat blijft de GPS-recorder.
   ============================================================ */
(()=>{
  'use strict';

  const BUILD='7.5.5';
  const FIELD='sharedAutomaticVaren';
  let shared={
    known:false,
    enabled:false,
    updatedAt:0,
    updatedByDevice:'',
    preference:null,
    claimFresh:false,
    claimDeviceId:'',
    busy:false,
    error:''
  };
  let lastBoatId='';
  let fetchBusy=false;
  let writeBusy=false;
  let applyingRemote=false;
  let bootTimer=0;

  function now(){return Date.now();}
  function boat(){return typeof currentBoat!=='undefined'?currentBoat:null;}
  function user(){return typeof currentUser!=='undefined'?currentUser:null;}
  function client(){return typeof sb!=='undefined'?sb:null;}
  function localEnabled(){
    try{return Boolean(window.ms701AutomaticEnabled?.());}
    catch(_error){return false;}
  }
  function deviceId(){
    try{return String(window.ms640DeviceId?.()||'');}
    catch(_error){return '';}
  }
  function deviceLabel(){
    const ua=navigator.userAgent||'';
    if(/iPad/i.test(ua)||(/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1))return'iPad';
    if(/iPhone/i.test(ua))return'iPhone';
    return'Dit apparaat';
  }
  function currentBoatId(){return String(boat()?.id||'');}
  function claimFromRow(row){return row?.state?.autoRecorderClaim||null;}
  function claimIsFresh(claim){
    return Boolean(claim?.deviceId&&Number(claim.expiresAt||0)>now());
  }
  function explicitPreference(row){
    const value=row?.state?.[FIELD];
    if(!value||typeof value.enabled!=='boolean')return null;
    return value;
  }
  function inferEnabled(row){
    const pref=explicitPreference(row);
    if(pref)return Boolean(pref.enabled);
    const claim=claimFromRow(row);
    return claimIsFresh(claim)||['active','paused'].includes(String(row?.status||''));
  }
  function applySharedFromRow(row){
    if(!row||String(row.boat_id||'')!==currentBoatId())return;
    const pref=explicitPreference(row);
    const claim=claimFromRow(row);
    const enabled=inferEnabled(row);
    shared={
      ...shared,
      known:Boolean(pref)||enabled,
      enabled,
      updatedAt:Number(pref?.updatedAt||Date.parse(row.updated_at||'')||now()),
      updatedByDevice:String(pref?.updatedByDevice||''),
      preference:pref?{...pref}:{
        enabled,
        updatedAt:Number(Date.parse(row.updated_at||'')||now()),
        updatedByDevice:'',
        updatedByLabel:'',
        build:BUILD
      },
      claimFresh:claimIsFresh(claim),
      claimDeviceId:String(claim?.deviceId||row?.controller_device_id||''),
      busy:false,
      error:''
    };

    // Een bootbreed UIT-signaal schakelt ook de actieve recorder uit.
    if(pref&&pref.enabled===false&&localEnabled()&&!applyingRemote){
      applyingRemote=true;
      Promise.resolve(window.ms701DisableAutomaticMode?.())
        .catch(error=>console.warn('Automatisch varen lokaal uitschakelen mislukt:',error))
        .finally(()=>{
          applyingRemote=false;
          refreshUi();
        });
    }

    refreshUi();
  }
  function publicState(){
    return {
      ...shared,
      localRecorder:localEnabled(),
      thisDeviceId:deviceId(),
      deviceLabel:deviceLabel()
    };
  }
  window.ms753SharedAutomaticState=publicState;

  function setText(id,value){
    const node=document.getElementById(id);
    if(node)node.textContent=String(value??'');
  }
  function refreshUi(){
    window.ms753RefreshSimpleAutomaticUi?.();

    const toggle=document.getElementById('ms701AutoToggle');
    if(toggle&&shared.known)toggle.checked=Boolean(shared.enabled);

    if(shared.known&&shared.enabled&&!localEnabled()){
      const fresh=shared.claimFresh;
      setText('ms701AutoTitle',fresh?'Automatisch varen staat aan':'Automatisch varen staat aan, recorder ontbreekt');
      setText('ms701AutoDetail',fresh
        ?'Een ander apparaat registreert de GPS. Dit apparaat kijkt live mee.'
        :'Open MijnSerenity op het apparaat dat de vaart moet registreren.');
      setText('ms701DepartureStatus',fresh?'Meekijken':'Recorder nodig');
      setText('ms701ShareStatus','Bootbreed gesynchroniseerd');
      setText('ms701LogStatus','Automatisch');
      setText('ms701AutoMessage',fresh
        ?'Dezelfde Aan/Uit-stand wordt op iPhone en iPad getoond.'
        :'Tik eerst Uit en daarna Aan op het apparaat dat de GPS-opname moet uitvoeren.');
      document.getElementById('ms701AutoCard')?.classList.remove('disabled','collapsed');
      document.getElementById('ms701AutoCard')?.classList.add('expanded');
    }
  }

  async function readRow(){
    const database=client(), activeBoat=boat(), activeUser=user();
    if(!database||!activeBoat||!activeUser)return null;
    const {data,error}=await database
      .from('live_navigation_state')
      .select('*')
      .eq('boat_id',activeBoat.id)
      .maybeSingle();
    if(error)throw error;
    return data||null;
  }
  async function writePreference(enabled){
    const database=client(), activeBoat=boat(), activeUser=user();
    if(writeBusy||!database||!activeBoat||!activeUser)return false;
    writeBusy=true;
    shared={...shared,busy:true,error:''};
    refreshUi();
    try{
      const row=await readRow();
      const preference={
        enabled:Boolean(enabled),
        updatedAt:now(),
        updatedByDevice:deviceId(),
        updatedByLabel:deviceLabel(),
        updatedByUser:String(activeUser.id||''),
        build:BUILD
      };
      shared={...shared,known:true,enabled:Boolean(enabled),preference};
      const state={...(row?.state||{}),[FIELD]:preference};
      const payload={
        boat_id:activeBoat.id,
        session_id:row?.session_id||null,
        status:row?.status||'idle',
        controller_user_id:row?.controller_user_id||activeUser.id,
        controller_device_id:row?.controller_device_id||null,
        controller_name:row?.controller_name||null,
        state,
        updated_at:new Date().toISOString()
      };
      const {data,error}=await database
        .from('live_navigation_state')
        .upsert(payload,{onConflict:'boat_id'})
        .select('*')
        .single();
      if(error)throw error;
      applySharedFromRow(data||payload);
      return true;
    }catch(error){
      console.warn('Bootbrede stand automatisch varen synchroniseren mislukt:',error);
      shared={...shared,busy:false,error:String(error?.message||error)};
      refreshUi();
      window.showAppToast?.('Synchronisatie tussen iPhone en iPad is tijdelijk niet bereikbaar.');
      return false;
    }finally{
      writeBusy=false;
      shared={...shared,busy:false};
      refreshUi();
    }
  }

  window.ms753ToggleSharedAutomatic=async function(){
    if(shared.busy||writeBusy)return;
    const currentlyEnabled=shared.known?shared.enabled:localEnabled();

    if(currentlyEnabled){
      // Eerst bootbreed uitzetten; de recorder ontvangt dit realtime.
      await writePreference(false);
      if(localEnabled())await Promise.resolve(window.ms701DisableAutomaticMode?.());
      window.showAppToast?.('Automatisch varen staat op iPhone en iPad uit.');
      refreshUi();
      return;
    }

    const result=await Promise.resolve(window.ms701EnableAutomaticMode?.(true));
    if(result===false){
      await fetchShared(true);
      window.showAppToast?.(
        shared.enabled
          ?'Een ander apparaat registreert; dit apparaat kijkt mee.'
          :'Automatisch varen kon op dit apparaat niet worden gestart.'
      );
      return;
    }
    await writePreference(true);
    window.showAppToast?.('Automatisch varen staat bootbreed aan.');
    refreshUi();
  };

  async function fetchShared(force=false){
    const boatId=currentBoatId();
    if(fetchBusy||!boatId||!user()||!client())return;
    if(!force&&shared.known&&lastBoatId===boatId)return;
    fetchBusy=true;
    try{
      const row=await readRow();
      lastBoatId=boatId;
      if(row){
        applySharedFromRow(row);
        // Migratie: een bestaande lokale instelling of verse recorderclaim
        // één keer expliciet bootbreed vastleggen.
        if(!explicitPreference(row)&&(localEnabled()||inferEnabled(row))){
          await writePreference(true);
        }else if(!explicitPreference(row)){
          shared={...shared,known:true,enabled:false,claimFresh:false,busy:false};
          refreshUi();
        }
      }else if(localEnabled()){
        await writePreference(true);
      }else{
        shared={...shared,known:true,enabled:false,claimFresh:false,busy:false};
        refreshUi();
      }
    }catch(error){
      console.warn('Bootbrede automatische stand laden mislukt:',error);
      shared={
        ...shared,
        known:true,
        enabled:localEnabled(),
        busy:false,
        error:String(error?.message||error)
      };
      refreshUi();
    }finally{
      fetchBusy=false;
    }
  }

  // Iedere livekaart-update bewaart de bootbrede voorkeur, zodat een
  // GPS-synchronisatie deze niet per ongeluk uit de rij verwijdert.
  if(typeof window.ms640Payload==='function'){
    const originalPayload=window.ms640Payload;
    window.ms640Payload=function(){
      const payload=originalPayload();
      const preference=shared.preference||{
        enabled:shared.known?Boolean(shared.enabled):localEnabled(),
        updatedAt:shared.updatedAt||now(),
        updatedByDevice:shared.updatedByDevice||deviceId(),
        updatedByLabel:deviceLabel(),
        build:BUILD
      };
      return {...payload,[FIELD]:preference};
    };
  }

  // Realtime-rij eerst op de gedeelde voorkeur toepassen, daarna op de livekaart.
  if(typeof window.ms640ApplyRow==='function'){
    const originalApplyRow=window.ms640ApplyRow;
    window.ms640ApplyRow=function(row){
      applySharedFromRow(row);
      const result=originalApplyRow(row);
      window.setTimeout(refreshUi,0);
      return result;
    };
  }

  if(typeof window.ms701Render==='function'){
    const originalRender=window.ms701Render;
    window.ms701Render=function(){
      const result=originalRender();
      refreshUi();
      return result;
    };
  }

  if(typeof window.ms701AutoToggleChanged==='function'){
    const originalToggleChanged=window.ms701AutoToggleChanged;
    window.ms701AutoToggleChanged=async function(input){
      if(applyingRemote)return originalToggleChanged(input);
      if(input?.checked){
        const result=await Promise.resolve(window.ms701EnableAutomaticMode?.(true));
        if(result!==false)await writePreference(true);
        refreshUi();
        return result;
      }
      const result=window.ms701DisableAutomaticMode?.();
      await writePreference(false);
      refreshUi();
      return result;
    };
  }

  function boot(){
    const boatId=currentBoatId();
    if(boatId&&boatId!==lastBoatId){
      shared={...shared,known:false,error:''};
      fetchShared(true);
    }else if(boatId&&!shared.known){
      fetchShared(true);
    }
    refreshUi();
  }

  clearInterval(bootTimer);
  bootTimer=window.setInterval(boot,2500);
  window.addEventListener('online',()=>fetchShared(true),{passive:true});
  window.addEventListener('pageshow',()=>fetchShared(true),{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)fetchShared(true);
  });
  boot();
  console.info(`MijnSerenity ${BUILD}: apparaatsynchronisatie actief.`);
})();
