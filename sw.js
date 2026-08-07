/* ---------------------------------------------------------------
   Service worker: офлайн-доступ без потери свежести.

   Стратегия — «сеть в приоритете, кэш как запасной вариант»:
   при живой сети всегда отдаётся актуальная версия с сервера,
   кэш работает только когда сети нет. Это исключает ситуацию,
   когда у установившего человека сайт залипает на старой версии.

   Чтобы принудительно обновить кэш у всех — поднимите VERSION.
   --------------------------------------------------------------- */

const VERSION = 'v2';
const CACHE   = `tg-${VERSION}`;

/* Минимум для офлайн-показа: страница, шрифты, иконки. */
const PRECACHE = [
  '/',
  '/404.html',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      /* по одному: если один файл не найдётся, установка не сорвётся */
      .then(cache => Promise.allSettled(PRECACHE.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  /* Только обычные GET-запросы со своего домена. */
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        /* Успешный ответ кладём в кэш про запас. */
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        /* Сети нет — отдаём сохранённое; для переходов — главную. */
        caches.match(req).then(hit =>
          hit || (req.mode === 'navigate' ? caches.match('/') : undefined)
        )
      )
  );
});
