const staticCacheName = 'restaurant-static-v1';
const googleMapsCache = 'restaurant-maps-v1';
const imageCacheName = 'restaurant-images-v1';
const allCaches = [
    staticCacheName,
    imageCacheName,
    googleMapsCache
];


/**
 * Cache static assets on SW install
 * @param staticCacheName
 */
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

self.addEventListener('install', (event) => {
    console.log('Installing SW');
    event.waitUntil(onInstalling(staticCacheName));
    console.log('Done installing SW');
});


/**
 * Deletes any new caches when a new SW activates
 */
const onActivate = async () => {
    const cacheNames = await caches.keys();
    return Promise.all(
        cacheNames.filter(cacheName => (cacheName.startsWith('restaurant-') && !allCaches.includes(cacheName)))
            .map(cacheName => caches.delete(cacheName)))
};

self.addEventListener('activate', (event) => {
    console.log('Activating SW');
    event.waitUntil(onActivate());
    console.log('Done activating SW');

});


/**
 * Primary listener for implementing offline-first functionality
 */
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin === location.origin) {
        if (requestUrl.pathname.startsWith('/img/')) {
            const storageUrl = request.url.replace(/-\d+px\.jpg$/, '');
            event.respondWith(serveFromCache(request, storageUrl, imageCacheName));
            return;
        }
    }

    if (requestUrl.href.startsWith('https://maps.googleapis.com/maps')) {
        event.respondWith(serveFromCache(event.request, event.request.url, googleMapsCache));
        return;
    }

    event.respondWith(checkAllCaches(event, requestUrl));
});


/**
 * Utility function for interacting with cache
 *
 * TODO: Need to revisit this to see if we should change to a stale-while-revalidate strategy
 *
 * @param request   Request from the received event
 * @param url       Url of the resource.  Generally the url from
 *                  the request unless formatted for storage
 * @param cacheName Name of the cache to search/store resource
 */
async function serveFromCache(request, url, cacheName) {
    const cache = await caches.open(cacheName);
    const response = await cache.match(url);
    if (response) {
        console.log(`Responding from ${cacheName}: ${url}`);
        return response;
    }
    try {
        const networkResponse = await fetch(request);
        await cache.put(url, networkResponse.clone());
        return networkResponse;
    } catch (ex) {
        console.warn(`Error while attempting to fetch from network. ${ex}`)
    }
}


/**
 * Utility function checks all caches for request and returns that or network response
 * @param event
 * @param requestUrl
 */
async function checkAllCaches(event, requestUrl) {
    const response = await caches.match(event.request);
    if (response) {
        console.log(`Responding from any cache ${requestUrl}`);
        return response;
    }
    return await fetch(event.request);
}
