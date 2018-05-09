const FILLED_HEART = '♥';
const HEART_OUTLINE = '♡';

// var restaurants,
//     neighborhoods,
//     cuisines;
self.restaurants = [];
self.neighborhoods = [];
self.cuisines = [];
self.map = {};
self.markers = [];
// var map;
// var markers = [];

const _dbPromise = DBHelper.openDatabase();


/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', async () => {
    await getCachedRestaurants();
    await fetchNeighborhoods();
    fetchCuisines();
    fetchReviews();
});


/**
 * Update restaurants cache when fetched
 */
const cacheRestaurants = async (restaurants) => {
    const db = await _dbPromise;
    if (!db || !restaurants) return;

    const tx = db.transaction('restaurants', 'readwrite');
    const store = tx.objectStore('restaurants');
    restaurants.forEach(restaurant => store.put(restaurant));
    return tx.complete;
};

/**
 * Attempt to populate restaurants from cache before network
 */
const getCachedRestaurants = async () => {
    const db = await _dbPromise;

    if (!db || self.restaurants) return; // return if restaurants are already being displayed

    const store = await db.transaction('restaurants').objectStore('restaurants');
    const restaurants = await store.getAll();
    // console.log(restaurants);
    self.restaurants = restaurants;
    if (restaurants) {
        fillRestaurantsHTML();
    }
};

/**
 * Set neighborhoods HTML.
 */
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
    const select = document.getElementById('neighborhoods-select');
    neighborhoods.forEach(neighborhood => {
        const option = document.createElement('option');
        option.innerHTML = neighborhood;
        option.value = neighborhood;
        select.append(option);
    });
};

/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = async () => {
    const neighborhoods = await DBHelper.fetchNeighborhoods();
    if (neighborhoods) {
        self.neighborhoods = neighborhoods;
        fillNeighborhoodsHTML();
    }
};

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = async () => {
    const cuisines = await DBHelper.fetchCuisines();
    if (cuisines) {
        self.cuisines = cuisines;
        fillCuisinesHTML();
    }
};

/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
    const select = document.getElementById('cuisines-select');

    cuisines.forEach(cuisine => {
        const option = document.createElement('option');
        option.innerHTML = cuisine;
        option.value = cuisine;
        select.append(option);
    });
};

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = async () => {
    let loc = {
        lat: 40.722216,
        lng: -73.987501
    };
    self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 12,
        center: loc,
        scrollwheel: false
    });
    await updateRestaurants();
};

/**
 * Update page and map for current restaurants.
 */
const updateRestaurants = async () => {
    const cSelect = document.getElementById('cuisines-select');
    const nSelect = document.getElementById('neighborhoods-select');

    const cIndex = cSelect.selectedIndex;
    const nIndex = nSelect.selectedIndex;

    const cuisine = cSelect[cIndex].value;
    const neighborhood = nSelect[nIndex].value;

    const restaurants = await DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood);
    if (restaurants) {
        self.restaurants = restaurants;
        await cacheRestaurants(restaurants);
        resetRestaurants(restaurants);
        fillRestaurantsHTML();
    }
};

const fetchReviews = async () => {
    const reviews = await DBHelper.fetchAllReviews();
    const db = await _dbPromise;
    if (reviews && db) {
        const tx = db.transaction('reviews', 'readwrite');
        const store = tx.objectStore('reviews');
        reviews.forEach(review => store.put(review));
        return tx.complete;
    }
};


/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = (restaurants) => {
    // Remove all restaurants
    self.restaurants = [];
    const ul = document.getElementById('restaurants-list');
    ul.innerHTML = '';

    // Remove all map markers
    self.markers.forEach(m => m.setMap(null));
    self.markers = [];
    self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
    const ul = document.getElementById('restaurants-list');
    restaurants.forEach(restaurant => ul.append(createRestaurantHTML(restaurant)));
    addMarkersToMap();
};

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = (restaurant) => {
    const li = document.createElement('li');

    const fullImage = document.createElement('a');
    fullImage.href = DBHelper.jpgUrlForRestaurant(restaurant);
    fullImage.className = 'restaurant-img progressive replace';
    fullImage.setAttribute('data-srcset', DBHelper.webpUrlForRestaurant(restaurant));
    fullImage.setAttribute('aria-hidden', 'true');
    li.append(fullImage);

    const image = document.createElement('img');
    image.setAttribute('alt', '');
    image.className = 'restaurant-img preview';
    image.src = DBHelper.previewUrlForRestaurant(restaurant);
    fullImage.append(image);

    const name = document.createElement('h1');
    name.innerHTML = restaurant.name;
    li.append(name);

    const neighborhood = document.createElement('p');
    neighborhood.innerHTML = restaurant.neighborhood;
    li.append(neighborhood);

    const address = document.createElement('p');
    address.innerHTML = restaurant.address;
    li.append(address);

    const footer = document.createElement('div');
    footer.className = 'restaurant-footer';
    li.append(footer);

    const more = document.createElement('a');
    more.setAttribute('Role', 'button');
    more.innerHTML = 'View Details';
    more.href = DBHelper.urlForRestaurant(restaurant);
    more.setAttribute('aria-label', `View details for ${restaurant.name}`);
    more.className = 'more-button';
    footer.appendChild(more);

    const favorite = document.createElement('a');
    favorite.setAttribute('Role', 'button');
    favorite.innerHTML = restaurant.is_favorite ? FILLED_HEART : HEART_OUTLINE;
    favorite.onclick = (e) => toggleFavorite(restaurant, e);
    favorite.className = 'favorite-icon';
    footer.appendChild(favorite);


    return li;
};

const toggleFavorite = async (restaurant, e) => {
    restaurant.is_favorite = !restaurant.is_favorite;
    e.target.innerHTML = restaurant.is_favorite ? FILLED_HEART : HEART_OUTLINE;

    const db = await _dbPromise;
    const store = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
    await store.put(restaurant);
    DBHelper.updateFavorite(restaurant.id, restaurant.is_favorite);
};

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
    restaurants.forEach(async restaurant => {
        // Add marker to the map
        const marker = await DBHelper.mapMarkerForRestaurant(restaurant, self.map);
        google.maps.event.addListener(marker, 'click', () => window.location.href = marker.url);
        self.markers.push(marker);
    });
};

/**
 * Register service worker
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            // console.log(`ServiceWorker registration successful with scope: ${registration.scope}`);
        } catch (e) {
            // console.log(`Serviceworker registration failed.`);
        }
    });
}