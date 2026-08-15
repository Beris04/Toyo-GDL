const CACHE='toyo-comercial-v4-2';
const CORE=['./','./index.html','./visitas.html','./cotizador.html','./assets/toyo_logo.png','./manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin) return;
  const isData=u.pathname.includes('/data/')||u.pathname.endsWith('.json')||u.pathname.endsWith('.json.gz');
  const isHtml=e.request.mode==='navigate'||u.pathname.endsWith('.html')||u.pathname.endsWith('/');
  if(isHtml){
    e.respondWith((async()=>{
      const c=await caches.open(CACHE);
      try{const r=await fetch(e.request,{cache:'no-cache'});if(r.ok)c.put(e.request,r.clone());return r;}catch(err){return (await c.match(e.request))||(await c.match('./index.html'));}
    })());
    return;
  }
  if(isData){
    e.respondWith(caches.open(CACHE).then(async c=>{
      const cached=await c.match(e.request);
      const net=fetch(e.request).then(r=>{if(r.ok)c.put(e.request,r.clone());return r}).catch(()=>cached);
      return cached||net;
    }));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r})));
});
