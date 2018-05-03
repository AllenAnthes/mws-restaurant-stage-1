const staticCacheName = 'restaurant-static-v2';
const googleMapsCache = 'restaurant-maps-v1';
const imageCacheName = 'restaurant-images-v1';
const allCaches = [
    staticCacheName,
    imageCacheName,
    googleMapsCache
];

self.addEventListener('install', function (event) {
    console.log('installing');
    event.waitUntil(
        caches.open(staticCacheName).then(function (cache) {
            return cache.addAll([
                '/',
                '/index.html',
                '/js/main.js',
                '/js/dbhelper.js',
                '/js/restaurant_info.js',
                '/css/styles.css',
                '/css/restaurant.css',
                '/data/restaurants.json',
            ]).catch(e => console.log(`Cache error ${e}`));
        })
    );
    console.log('done installing');
});

self.addEventListener('activate', async (event) => {
    console.log('activating');
    event.waitUntil((async () => {
            const cacheNames = await caches.keys();
            return Promise.all(
                cacheNames.filter(cacheName => (
                    cacheName.startsWith('restaurant-') && !allCaches.includes(cacheName)
                )).map(cacheName => caches.delete(cacheName)))
        })()
    )
});

self.addEventListener('fetch', function (event) {
    const requestUrl = new URL(event.request.url);
    // console.log(`Request URL: ${requestUrl}`);
    if (requestUrl.origin === location.origin) {

        if (requestUrl.pathname.startsWith('/img/')) {
            event.respondWith(serveImage(event.request));
            return;
        }
    }

    if (requestUrl.href.indexOf('https://maps.googleapi.com/maps')) {
        event.respondWith(serveMapImage(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                console.log(`Responding from cache ${requestUrl}`)
            }
            return response || fetch(event.request).catch(e => `Error in fetch ${e}`);
        }).catch(e => console.log(`error ${e}`))
    );
});

async function serveImage(request) {
    const storageUrl = request.url.replace(/-\d+px\.jpg$/, '');
    const cache = await caches.open(imageCacheName);
    const response = await cache.match(storageUrl);
    if (response) {
        console.log(`Responding from IMAGE cache ${request.url}`);

        return response;
    }

    const networkResponse = await fetch(request);
    const res = await cache.put(storageUrl, networkResponse.clone());
    console.log(res);

    return networkResponse;
}

async function serveMapImage(request) {
    const cache = await caches.open(googleMapsCache);
    const response = await cache.match(request.url);
    if (response) return response;

    const networkResponse = await fetch(request);
    const res = await cache.put(request, networkResponse.clone());
    return networkResponse;
}