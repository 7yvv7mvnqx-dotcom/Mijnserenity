const CACHE_NAME='mijnserenity-7.9.9-start-varen-r1';
const APP_SHELL=[
  '/',
  '/index.html',
  '/styles.css?v=79900',
  '/ha-live-bridge.css?v=79900',
  '/live-cameras.css?v=79900',
  '/mission-control.css?v=79900',
  '/easy-auto.css?v=79900',
  '/auto-track-reliability.css?v=79900',
  '/gps-continuity-guard.css?v=79900',
  '/waterkaarten-split-launch.css?v=79900',
  '/live-split.css?v=79900',
  '/route-control.css?v=79900',
  '/page-swipe.css?v=79900',
  '/weather-page.css?v=79900',
  '/weather-radar.css?v=79900',
  '/rws-nearby.css?v=79900',
  '/ais-page.css?v=79900',
  '/entertainment-page.css?v=79900',
  '/navigation-compact.css?v=79900',
  '/simple-accessible.css?v=79900',
  '/home-assistant-contrast.css?v=79900',
  '/captain-experience.css?v=79900',
  '/serenity-ivms.css?v=79900',
  '/technical-live-sync.css?v=79900',
  '/auth-bootstrap.js?v=79900',
  '/app.js?v=79900',
  '/receipt-reader-pro.js?v=79900',
  '/mission-control.js?v=79900',
  '/easy-auto.js?v=79900',
  '/auto-track-reliability.js?v=79900',
  '/gps-continuity-guard.js?v=79900',
  '/waterkaarten-split-launch.js?v=79900',
  '/live-split.js?v=79900',
  '/route-control.js?v=79900',
  '/weather-page.js?v=79900',
  '/weather-radar.js?v=79900',
  '/rws-nearby.js?v=79900',
  '/ais-page.js?v=79900',
  '/entertainment-page.js?v=79900',
  '/ha-live-bridge.js?v=79900',
  '/technical-live-sync.js?v=79900',
  '/live-cameras.js?v=79900',
  '/page-swipe.js?v=79900',
  '/navigation-compact.js?v=79900',
  '/simple-accessible.js?v=79900',
  '/device-sync-guard.js?v=79900',
  '/captain-experience.js?v=79900',
  '/serenity-ivms.js?v=79900',
  '/manifest.json?v=79900',
  '/icon-192.png?v=79900',
  '/icon-512.png?v=79900',
  '/waterkaarten-dashboard.png?v=79900',
  '/mijnserenity-logo.png?v=79900',
  '/serenity-aankomend.gif?v=79900',
];

async function cacheFile(cache,path){
  try{
    const response=await fetch(path,{cache:'reload'});
    if(response.ok)await cache.put(path,response);
  }catch(error){
    console.warn('Bestand niet vooraf gecachet:',path,error);
  }
}

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>Promise.all(APP_SHELL.map(path=>cacheFile(cache,path))))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys
          .filter(key=>key.startsWith('mijnserenity-')&&key!==CACHE_NAME)
          .map(key=>caches.delete(key))
      ))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;

  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/.netlify/functions/'))return;

  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request,{cache:'no-store'})
        .then(response=>{
          if(response.ok){
            const copy=response.clone();
            caches.open(CACHE_NAME).then(cache=>cache.put('/index.html',copy));
          }
          return response;
        })
        .catch(async()=>
          (await caches.match('/index.html'))||
          new Response('<h1>MijnSerenity is tijdelijk offline</h1><p>Open de app opnieuw zodra er verbinding is.</p>',{
            status:503,
            headers:{'Content-Type':'text/html; charset=utf-8'}
          })
        )
    );
    return;
  }

  event.respondWith(
    fetch(request,{cache:'no-cache'})
      .then(response=>{
        if(response.ok){
          const copy=response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
        }
        return response;
      })
      .catch(async()=>
        (await caches.match(request))||
        new Response('',{status:503,statusText:'Offline'})
      )
  );
});
