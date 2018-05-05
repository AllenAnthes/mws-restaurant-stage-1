const staticCacheName = 'restaurant-static-v1';
const googleMapsCache = 'restaurant-maps-v1';
const imageCacheName = 'restaurant-images-v1';
const allCaches = [
    staticCacheName,
    imageCacheName,
    googleMapsCache
];

self.addEventListener('install', (event) => {
    console.log('Installing SW');
    event.waitUntil(onInstalling(staticCacheName));
    console.log('Done installing SW');
});


const onInstalling = async (staticCacheName) => {
    const cache = await caches.open(staticCacheName);
    return cache.addAll([
        '/',
        '/js/main.js',
        '/js/dbhelper.js',
        '/js/restaurant_info.js',
        '/css/styles.css',
        '/css/restaurant.css',
        '/data/restaurants.json',
    ])
};

self.addEventListener('activate', (event) => {
    console.log('Activating SW');
    event.waitUntil(onActivate());
    console.log('Done activating SW');

});

const onActivate = async () => {
    const cacheNames = await caches.keys();
    return Promise.all(
        cacheNames.filter(cacheName => (cacheName.startsWith('restaurant-') && !allCaches.includes(cacheName)))
            .map(cacheName => caches.delete(cacheName)))
};

self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin === location.origin) {
        if (requestUrl.pathname.startsWith('/img/')) {
            event.respondWith(serveImage(event.request));
            return;
        }
    }

    if (requestUrl.href.startsWith('https://maps.googleapis.com/maps')) {
        event.respondWith(serveMapImage(event.request));
        return;
    }

    event.respondWith(checkAllCaches(event, requestUrl));
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
    await cache.put(storageUrl, networkResponse.clone());
    return networkResponse;
}

async function serveMapImage(request) {
    const cache = await caches.open(googleMapsCache);
    const response = await cache.match(request.url);
    if (response) {
        console.log(`Responding from MAP cache ${request.url}`);
        return response;
    }

    const networkResponse = await fetch(request);
    await cache.put(request, networkResponse.clone());
    return networkResponse;
}

async function checkAllCaches(event, requestUrl) {
    const response = await caches.match(event.request);
    if (response) {
        console.log(`Responding from any cache ${requestUrl}`);
        return response;
    }
    return fetch(event.request).catch(e => `Error in fetch ${e}`);
}