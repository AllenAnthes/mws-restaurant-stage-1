const FILLED_HEART = '❤️️️';
const HEART_OUTLINE = '🖤';

self.restaurants = [];
self.neighborhoods = new Set();
self.cuisines = new Set();
self.map = {};
self.markers = [];

let gmapsScriptAdded = false;
const _dbPromise = DBHelper.db;


/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', async () => {
    await getCachedRestaurants();
    await fetchNeighborhoodsAndCuisines();


    if (self.restaurants.length === 0) {
        await updateRestaurants();
    }
    DBHelper.fetchAllReviews();
});


/**
 * Onclick method for toggling map and appending gmaps script
 */
const displayMap = () => {
    const mapContainer = document.getElementById('map-container');

    if (mapContainer.style.maxHeight) {
        mapContainer.style.maxHeight = null;
        mapContainer.style.display = 'none';
    } else {
        if (!gmapsScriptAdded) {
            addGoogleMapsScript();
        }

        mapContainer.style.display = 'block';
        mapContainer.style.maxHeight = '100%';
    }
};

/**
 * Adds deferred google maps script to DOM when slider panel
 * opened.
 */
const addGoogleMapsScript = () => {
    const head = document.getElementsByTagName('head')[0];
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyClGIH9TlfK1tBA9PF2vM0jiue552S-Y40&libraries=places&callback=initMap';
    head.appendChild(script);
    gmapsScriptAdded = true;
};


/**
 * Attempt to populate restaurants from cache before network
 */
const getCachedRestaurants = async () => {
    const db = await _dbPromise;

    if (!db || self.restaurants.length !== 0) return; // return if restaurants are already being displayed

    const store = db.transaction('restaurants').objectStore('restaurants');
    const restaurants = await store.getAll();
    // console.log(restaurants);
    self.restaurants = restaurants;
    if (restaurants) {
        const neighborhoods = new Set();
        restaurants.forEach(r => neighborhoods.add(r.neighborhood));
        if (neighborhoods !== self.neighborhoods) {
            fillNeighborhoodsHTML();
        }
        const cuisines = new Set();
        restaurants.forEach(r => cuisines.add(r.cuisine_type));
        if (cuisines !== self.cuisines) {
            fillCuisinesHTML();
        }
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
 * Populate neighborhoods and cuisines
 */
const fetchNeighborhoodsAndCuisines = async () => {
    const response = DBHelper.fetchNeighborhoods();
    const cuisines = await DBHelper.fetchCuisines();
    const neighborhoods = await response;

    if (neighborhoods && neighborhoods !== self.neighborhoods) {
        self.neighborhoods = neighborhoods;
        fillNeighborhoodsHTML();
    }
    if (cuisines && cuisines !== self.cuisines) {
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
    const loc = {
        lat: 40.722216,
        lng: -73.987501
    };
    self.map = await new google.maps.Map(document.getElementById('map'), {
        zoom: 11,
        center: loc,
        scrollwheel: false
    });
    await updateRestaurants();
    addMarkersToMap();

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
        resetRestaurants(restaurants);
        fillRestaurantsHTML();
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
    favorite.onclick = (e) => Utils.toggleFavorite(restaurant, e);
    favorite.className = 'favorite-icon';
    footer.appendChild(favorite);
    return li;
};

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
    restaurants.forEach(restaurant => {
        // Add marker to the map
        const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
        google.maps.event.addListener(marker, 'click', () => window.location.href = marker.url);
        self.markers.push(marker);
    });
};


/**
 * Register service worker
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        try {
            navigator.serviceWorker.register('/service-worker.js');
        } catch (e) {
            console.warn('Error when registering service worker', e);
        }
    });
}