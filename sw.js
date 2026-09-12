/* MijnSerenity 8.26.10 — receipt camera hotfix + network-first OCR */
const CACHE_NAME='mijnserenity-8.26.10';
const BUILD='8.26.10';
const TOKEN='826910';
const CORE=[
  '/',
  '/index.html',
  `/auth-bootstrap.js?v=${TOKEN}`,
  `/start-dashboard-71510.js?v=${TOKEN}`,
  `/dashboard-unified-71919-loader.js?v=${TOKEN}`,
  `/approved-dashboard-8263.js?v=${TOKEN}`,
  `/approved-dashboard-live-8264.js?v=${TOKEN}`,
  `/dashboard-buttons-8265.js?v=${TOKEN}`,
  `/rws-water-temp-8233.js?v=${TOKEN}`,
  '/serenity-dashboard-boat-20260909.webp?v=8264',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];
async function fresh(request){return fetch(request,{cache:'no-store'})}
async function put(cache,key,response){try{if(response&&response.ok)await cache.put(key,response.clone())}catch(_){}}
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE_NAME);await Promise.all(CORE.map(async path=>{try{const response=await fresh(path);await put(cache,path,response)}catch(_){}}));await self.skipWaiting()})())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('mijnserenity-')&&k!==CACHE_NAME).map(k=>caches.delete(k)));await self.clients.claim()})())});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
async function networkFirst(request,fallback){const cache=await caches.open(CACHE_NAME);try{const response=await fresh(request);if(response.ok){await put(cache,request,response);if(fallback)await put(cache,fallback,response)}return response}catch(_){return(await caches.match(request,{ignoreSearch:false}))||(fallback?await caches.match(fallback):null)||new Response('MijnSerenity kon niet worden geladen.',{status:503,headers:{'content-type':'text/plain; charset=utf-8'}})}}
async function staleWhileRevalidate(request){const cached=await caches.match(request,{ignoreSearch:false});const update=fresh(request).then(async response=>{if(response.ok){const cache=await caches.open(CACHE_NAME);await put(cache,request,response)}return response}).catch(()=>null);return cached||(await update)||new Response('',{status:503})}
const CRITICAL=new Set([
  '/auth-bootstrap.js','/start-dashboard-71510.js','/dashboard-unified-71919-loader.js','/approved-dashboard-8263.js','/approved-dashboard-live-8264.js','/dashboard-buttons-8265.js','/rws-water-temp-8233.js','/receipt-reader-pro.js','/receipt-ocr-fix-8234.js','/serenity-dashboard-boat-20260909.webp'
]);
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/.netlify/functions/')||url.pathname.startsWith('/victron-gui/'))return;if(request.mode==='navigate'){event.respondWith(networkFirst(request,'/index.html'));return}if(CRITICAL.has(url.pathname)){event.respondWith(networkFirst(request));return}if(url.pathname.endsWith('.js')||url.pathname.endsWith('.css')||url.pathname==='/manifest.json'){event.respondWith(staleWhileRevalidate(request));return}event.respondWith(staleWhileRevalidate(request))});
function pushPayload(event){if(!event.data)return{};try{return event.data.json()||{}}catch(_){}try{return{body:event.data.text()}}catch(_){return{}}}
self.addEventListener('push',event=>{const payload=pushPayload(event);const level=String(payload.level||'warning').toLowerCase()==='critical'?'critical':'warning';const title=String(payload.title||(level==='critical'?'🚨 SERENITY ALARM':'⚠️ Serenity waarschuwing'));const body=String(payload.body||payload.text||'Controleer MijnSerenity.');const url=String(payload.url||'/?alarm=1');event.waitUntil(self.registration.showNotification(title,{body,icon:'/icon-192.png',badge:'/favicon-64.png',tag:String(payload.tag||`serenity-${level}-alarm`),renotify:true,requireInteraction:level==='critical',silent:false,vibrate:level==='critical'?[300,120,300,120,500]:[180,80,180],data:{...payload,url,level}}))});
self.addEventListener('notificationclick',event=>{event.notification.close();const target=new URL(String(event.notification?.data?.url||'/?alarm=1'),self.location.origin).href;event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows){try{if('navigate'in client)await client.navigate(target);client.postMessage({type:'mijnserenity-open-alarm',data:event.notification?.data||{}});if('focus'in client)return client.focus()}catch(_){}}return self.clients.openWindow?self.clients.openWindow(target):null})())});