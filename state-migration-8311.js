/* MijnSerenity 8.31.1 — eenmalige, niet-destructieve state-migratie. */
(()=>{
  'use strict';
  if(window.__msStateMigration8311)return;
  window.__msStateMigration8311=true;

  const MIGRATION_KEY='mijnserenity-migration-8311';
  const CLIMATE_KEY='mijnserenity-ruuvi-climate-v7102';
  const LEGACY_VRM_KEYS=['ms7148_vrm_token','ms7148VrmToken','mijnserenity_vrm_token','vrm_api_token'];

  function readJson(key,fallback={}){
    try{const parsed=JSON.parse(localStorage.getItem(key)||'null');return parsed&&typeof parsed==='object'?parsed:fallback}catch{return fallback}
  }
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
  function migrateVrmToken(){
    const current=readJson(CLIMATE_KEY,{});
    if(String(current.vrmToken||'').trim())return false;
    let token='';
    for(const key of LEGACY_VRM_KEYS){
      try{const value=String(localStorage.getItem(key)||'').trim();if(value){token=value;break}}catch{}
    }
    if(!token)return false;
    return writeJson(CLIMATE_KEY,{...current,vrmToken:token});
  }
  function migrate(){
    let changed=false;
    try{changed=migrateVrmToken()||changed}catch(error){console.warn('MijnSerenity VRM-state migratie overgeslagen:',error)}
    try{localStorage.setItem(MIGRATION_KEY,JSON.stringify({at:new Date().toISOString(),changed}))}catch{}
    window.dispatchEvent(new CustomEvent('mijnserenity:state-migrated',{detail:{version:'8.31.1',changed}}));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',migrate,{once:true});else migrate();
})();