const CACHE='atpl-trainer-v4-13subjects';
const ASSETS=['./index.html','./styles.css','./app.js','./data.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(ASSETS);await self.skipWaiting()})());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{for(const key of await caches.keys()){if(key!==CACHE)await caches.delete(key)}await self.clients.claim()})());
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{try{const fresh=await fetch(event.request);const cache=await caches.open(CACHE);cache.put('./index.html',fresh.clone());return fresh}catch(e){return (await caches.match(event.request))||(await caches.match('./index.html'))}})());return;
  }
  event.respondWith((async()=>{const cached=await caches.match(event.request);if(cached)return cached;try{const fresh=await fetch(event.request);const cache=await caches.open(CACHE);cache.put(event.request,fresh.clone());return fresh}catch(e){return new Response('Offline',{status:503,statusText:'Offline'})}})());
});
