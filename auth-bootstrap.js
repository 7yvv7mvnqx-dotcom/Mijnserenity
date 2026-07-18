/* MijnSerenity 7.3.1 — betrouwbare loginbootstrap */
(()=>{
  'use strict';

  const BUILD='7.3.1';
  const VERSION='7310';
  const APP_SCRIPTS=[
    `app.js?v=${VERSION}`,
    `mission-control.js?v=${VERSION}`,
    `easy-auto.js?v=${VERSION}`,
    `live-split.js?v=${VERSION}`,
    `route-control.js?v=${VERSION}`,
    `weather-page.js?v=${VERSION}`,
    `weather-radar.js?v=${VERSION}`,
    `ais-page.js?v=${VERSION}`,
    `entertainment-page.js?v=${VERSION}`,
    `development-mode.js?v=${VERSION}`,
    `ha-live-bridge.js?v=${VERSION}`,
    `page-swipe.js?v=${VERSION}`
  ];
  const SUPABASE_SOURCES=[
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://unpkg.com/@supabase/supabase-js@2'
  ];

  function setAuthStatus(message,isError=false){
    const target=document.getElementById('authMsg');
    if(!target)return;
    target.textContent=message;
    target.classList.toggle('error',Boolean(isError));
  }

  function loadScript(src,timeoutMs=18000){
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      let finished=false;
      const timer=setTimeout(()=>finish(new Error(`Time-out bij laden van ${src}`)),timeoutMs);

      function finish(error){
        if(finished)return;
        finished=true;
        clearTimeout(timer);
        script.onload=null;
        script.onerror=null;
        if(error){
          script.remove();
          reject(error);
        }else{
          resolve();
        }
      }

      script.src=src;
      script.async=false;
      script.crossOrigin=src.startsWith('http')?'anonymous':'';
      script.onload=()=>finish();
      script.onerror=()=>finish(new Error(`Laden mislukt: ${src}`));
      document.head.appendChild(script);
    });
  }


  function installDevelopmentSupabaseMock(){
    if(window.supabase?.createClient)return;

    const emptyResult=()=>({data:[],error:null,count:0});
    const makeBuilder=()=>{
      let selectedData=[];
      let proxy;
      const target={};
      proxy=new Proxy(target,{
        get(_object,property){
          if(property==='then'){
            return (resolve,reject)=>Promise.resolve(emptyResult()).then(resolve,reject);
          }
          if(property==='single'||property==='maybeSingle'){
            return async()=>({data:null,error:null});
          }
          if(property==='select'||property==='eq'||property==='neq'||property==='gt'||property==='gte'||property==='lt'||property==='lte'||property==='in'||property==='order'||property==='limit'||property==='range'||property==='filter'||property==='match'||property==='is'||property==='not'||property==='or'){
            return ()=>proxy;
          }
          if(property==='insert'||property==='update'||property==='upsert'||property==='delete'){
            return ()=>proxy;
          }
          return ()=>proxy;
        }
      });
      return proxy;
    };

    const subscription={unsubscribe(){}};
    const auth={
      onAuthStateChange(callback){
        setTimeout(()=>callback('INITIAL_SESSION',null),0);
        return {data:{subscription}};
      },
      async getSession(){return {data:{session:null},error:null}},
      async getUser(){return {data:{user:null},error:null}},
      async signInWithPassword(){return {data:{},error:new Error('Gebruik in deze branch de knop Testomgeving openen.')}},
      async signUp(){return {data:{},error:new Error('Accounts zijn uitgeschakeld in de testomgeving.')}},
      async resetPasswordForEmail(){return {data:{},error:new Error('Wachtwoordherstel is uitgeschakeld in de testomgeving.')}},
      async updateUser(){return {data:{user:null},error:null}},
      async signOut(){return {error:null}}
    };
    const storage={
      from(){
        return {
          async createSignedUrl(path){
            const value=String(path||'');
            let signedUrl='demo-haven.svg';
            if(value.includes('route'))signedUrl='demo-route.svg';
            if(value.includes('receipt')||value.includes('bon'))signedUrl='demo-receipt.svg';
            if(value.includes('boat')||value.includes('dashboard'))signedUrl='demo-serenity.svg';
            return {data:{signedUrl},error:null};
          },
          async upload(){return {data:{},error:null}},
          async remove(){return {data:{},error:null}}
        };
      }
    };
    const client={
      auth,
      storage,
      from(){return makeBuilder()},
      async rpc(){return {data:null,error:null}},
      channel(){
        const channel={
          on(){return channel},
          subscribe(callback){setTimeout(()=>callback?.('SUBSCRIBED'),0);return channel},
          unsubscribe(){return Promise.resolve('ok')}
        };
        return channel;
      },
      async removeChannel(){return 'ok'}
    };
    window.supabase={createClient(){return client}};
    window.MIJSERENITY_SUPABASE_MOCK=true;
  }

  async function ensureSupabase(){
    if(window.MIJSERENITY_DEV_BUILD){
      installDevelopmentSupabaseMock();
      return;
    }
    if(window.supabase?.createClient)return;

    let lastError=null;
    for(const source of SUPABASE_SOURCES){
      try{
        await loadScript(source);
        if(window.supabase?.createClient)return;
        throw new Error('Supabase-bibliotheek is niet gestart.');
      }catch(error){
        lastError=error;
        console.warn('Supabase-bron niet beschikbaar:',source,error);
      }
    }
    throw lastError||new Error('Geen beveiligde inlogverbinding beschikbaar.');
  }

  async function start(){
    try{
      setAuthStatus(window.MIJSERENITY_DEV_BUILD?'Lokale testomgeving wordt geladen…':'Beveiligde inlog wordt geladen…');
      await ensureSupabase();
      for(const src of APP_SCRIPTS)await loadScript(src,25000);

      if(typeof window.signIn!=='function'){
        throw new Error('De inlogfunctie is niet beschikbaar.');
      }

      const target=document.getElementById('authMsg');
      if(target&&/geladen/i.test(target.textContent||'')){
        target.textContent='Nog niet ingelogd.';
      }
      console.info(`MijnSerenity ${BUILD} is gestart.`);
    }catch(error){
      console.error('MijnSerenity kon niet starten:',error);
      setAuthStatus(
        'De beveiligde inlog kon niet worden geladen. Tik op “App herstellen en vernieuwen” en probeer opnieuw.',
        true
      );
      const button=document.getElementById('signInButton');
      if(button)button.disabled=true;
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }
})();
