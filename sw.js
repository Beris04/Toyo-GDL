const CACHE='toyo-comercial-v4-3';
const CORE=[
  './',
  './index.html',
  './visitas.html',
  './cotizador.html',
  './assets/toyo_logo.png',
  './manifest.webmanifest'
];

async function fetchWithTimeout(request, ms=5000){
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), ms);
  try{
    return await fetch(request, {signal:controller.signal, cache:'no-cache'});
  } finally {
    clearTimeout(timer);
  }
}

self.addEventListener('install', event=>{
  event.waitUntil((async()=>{
    const cache = await caches.open(CACHE);
    await Promise.allSettled(
      CORE.map(async url=>{
        try{
          const r = await fetch(url, {cache:'reload'});
          if(r.ok) await cache.put(url, r.clone());
        }catch(e){}
      })
    );
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event=>{
  event.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event=>{
  if(event.request.method!=='GET') return;

  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;

  const isData =
    url.pathname.includes('/data/') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.json.gz');

  const isHtml =
    event.request.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/');

  if(isHtml){
    event.respondWith((async()=>{
      const cache = await caches.open(CACHE);

      // En 4G débil mostramos inmediatamente la versión guardada.
      const cached =
        await cache.match(event.request, {ignoreSearch:true}) ||
        (url.pathname.endsWith('/') ? await cache.match('./index.html') : null);

      if(cached){
        // Actualiza en segundo plano sin detener al vendedor.
        event.waitUntil((async()=>{
          try{
            const fresh = await fetchWithTimeout(event.request, 3500);
            if(fresh && fresh.ok) await cache.put(event.request, fresh.clone());
          }catch(e){}
        })());
        return cached;
      }

      // Primera carga: espera poco tiempo y da fallback claro.
      try{
        const fresh = await fetchWithTimeout(event.request, 6500);
        if(fresh && fresh.ok){
          await cache.put(event.request, fresh.clone());
          return fresh;
        }
      }catch(e){}

      const fallback = await cache.match('./index.html');
      if(fallback) return fallback;

      return new Response(
        `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <body style="font-family:system-ui;padding:28px;background:#f2f6fb;color:#11213b">
        <h2>Toyo Foods</h2><p>No hay conexión suficiente para abrir la app por primera vez.</p>
        <p>Cuando tengas señal, vuelve a abrirla una vez para dejarla disponible en el teléfono.</p></body></html>`,
        {headers:{'Content-Type':'text/html; charset=utf-8'}, status:503}
      );
    })());
    return;
  }

  if(isData){
    event.respondWith((async()=>{
      const cache = await caches.open(CACHE);
      const cached = await cache.match(event.request, {ignoreSearch:true});

      if(cached){
        event.waitUntil((async()=>{
          try{
            const fresh = await fetchWithTimeout(event.request, 10000);
            if(fresh && fresh.ok) await cache.put(event.request, fresh.clone());
          }catch(e){}
        })());
        return cached;
      }

      try{
        const fresh = await fetchWithTimeout(event.request, 15000);
        if(fresh && fresh.ok){
          await cache.put(event.request, fresh.clone());
          return fresh;
        }
      }catch(e){}

      return new Response('[]',{
        headers:{'Content-Type':'application/json; charset=utf-8'},
        status:200
      });
    })());
    return;
  }

  event.respondWith((async()=>{
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request, {ignoreSearch:true});
    if(cached) return cached;

    try{
      const fresh = await fetchWithTimeout(event.request, 8000);
      if(fresh && fresh.ok) await cache.put(event.request, fresh.clone());
      return fresh;
    }catch(e){
      return new Response('', {status:504, statusText:'Offline'});
    }
  })());
});
