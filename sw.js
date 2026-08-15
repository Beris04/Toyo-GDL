self.addEventListener("install",e=>self.skipWaiting());
self.addEventListener("activate",e=>{e.waitUntil((async()=>{const ks=await caches.keys();await Promise.all(ks.filter(k=>/^toyo-comercial-/i.test(k)).map(k=>caches.delete(k)));await self.registration.unregister();await self.clients.claim();})())});
