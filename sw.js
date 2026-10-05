const CACHE='toyo-visitas-v3.4.0';
const SHELL=['./','./index.html','./manifest.webmanifest','./assets/toyo_logo.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>null));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE && k.startsWith('toyo-visitas-')).map(k=>caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);

  if(url.hostname.endsWith('.supabase.co'))return;

  if(req.mode==='navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')){
    event.respondWith(
      fetch(req).then(resp=>{
        const copy=resp.clone();
        caches.open(CACHE).then(c=>c.put('./index.html',copy)).catch(()=>{});
        return resp;
      }).catch(()=>caches.match('./index.html').then(r=>r||caches.match('./')))
    );
    return;
  }

  if(url.origin===self.location.origin){
    event.respondWith(
      caches.match(req,{ignoreSearch:true}).then(cached=>{
        const network=fetch(req).then(resp=>{
          if(resp && resp.ok){
            const copy=resp.clone();
            caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
          }
          return resp;
        }).catch(()=>cached);
        return cached || network;
      })
    );
  }
});
