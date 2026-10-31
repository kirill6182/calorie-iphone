Claude














Sw · JS
// Чтобы выпустить обновление, увеличьте номер версии: cal-v3, v4...
const V='cal-v2',FILES=['./','index.html','styles.css','app.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(caches.match(e.request).then(hit=>{
    const net=fetch(e.request).then(r=>{if(r.ok)caches.open(V).then(c=>c.put(e.request,r.clone()));return r}).catch(()=>hit);
    return hit||net;
  }));
});
 
Ответ Claude завершен
