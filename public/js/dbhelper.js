/**
 * Common database helper functions.
 */
class DBHelper {

    /**
     * Database URL.
     * Change this to restaurants.json file location on your server.
     */
    static get DATABASE_URL() {
        const port = 1337; // Change this to your server port
        return `http://localhost:${port}`;
        }

    static get db() {
        return DBHelper.openDatabase();
    }

    static openDatabase() {
        try {
            return idb.open('rest-reviews', 1, (upgradeDb) => {
                const restaurantStore = upgradeDb.createObjectStore('restaurants', {
                    keyPath: 'id'
                });
                restaurantStore.createIndex('by-neighborhood', 'neighborhood');
                restaurantStore.createIndex('by-cuisine', 'cuisine_type');
                const reviewStore = upgradeDb.createObjectStore('reviews', {
                    keyPath: 'id',
                    autoIncrement: true
                });

                reviewStore.createIndex('by-restaurant', 'restaurant_id');

                upgradeDb.createObjectStore('offlineStore', {
                    keyPath: 'temp_id',
                    autoIncrement: true
                });
            });
        } catch (e) {
            console.log('Error in openDatabase', e);
        }
    }

    /**
     * Returns cached restaurants in available
     */
    static async tryToFetchFromCache() {
        const db = await DBHelper.db;
        if (!db) return [];
        const store = await db.transaction('restaurants', 'readwrite').objectStore('restaurants');
        return await store.getAll();

    }

    /**
     * Fetch all restaurants.  If cache hit return immediately and cache new results from network
     * in the background
     */
    static async fetchRestaurants() {
        try {

            const cachedRestaurants = await DBHelper.tryToFetchFromCache();

            if (cachedRestaurants.length !== 0) {
                DBHelper.fetchRestaurantsInBackground();
                return cachedRestaurants;
            }

            const response = await fetch(`${DBHelper.DATABASE_URL}/restaurants`);
            const fetchedRestaurants = await response.json();
            const restaurants = fetchedRestaurants.map(r => ({
                ...r,
                is_favorite: r.is_favorite === true || r.is_favorite === 'true'
            }));

            DBHelper.store('restaurants', restaurants);
            return restaurants;

        } catch (e) {
            console.warn('Error in fetch restaurants:', e);
            return false;
        }
    }

    /**
     * If we can populate restaurants from cache fetch restaurants from network asynchronously to lazily update
     * cache
     */
    static async fetchRestaurantsInBackground() {
        try {
            const response = await fetch(`${DBHelper.DATABASE_URL}/restaurants`);
            const fetchedRestaurants = await response.json();
            const restaurants = fetchedRestaurants.map(r => ({
                ...r,
                is_favorite: r.is_favorite === true || r.is_favorite === 'true'
            }));

            await DBHelper.store('restaurants', restaurants);

        } catch (e) {
            console.warn('Error in fetch restaurants in background:', e);
        }
    }


    /**
     * Populate IDB store
     *
     * @param storeName: String of idb store name
     * @param iterable: List of items to be stored
     */
    static async store(storeName, iterable) {
        const db = await DBHelper.db;
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        iterable.forEach(i => store.put(i));
    }

    /**
     * Fetch all reviews.
     */
    static async fetchAllReviews() {
        try {
            const response = await fetch(`${DBHelper.DATABASE_URL}/reviews`);
            const reviews = await response.json();
            // console.log(reviews);
            DBHelper.store('reviews', reviews);
            DBHelper.checkOfflineStore();
            return reviews;
        } catch (e) {
            console.warn('Error in fetch reviews:', e);
            return [];
        }
    }

    /**
     * Check idb for items added when client was offline
     */
    static async checkOfflineStore() {
        const db = await DBHelper.db;
        const store = await db.transaction('offlineStore', 'readwrite').objectStore('offlineStore');
        const cachedReviews = await store.getAll();
        if (cachedReviews.length > 0) {
            try {
                const result = Promise.all(cachedReviews.map((r) => fetch(`${DBHelper.DATABASE_URL}/reviews`, {
                    method: 'POST',
                    body: JSON.stringify(r)
                })));
                await result;
                return await db.transaction('offlineStore', 'readwrite')
                    .objectStore('offlineStore')
                    .clear();
            } catch (e) {
                console.log('Error while attempting to update from offline store', e);
            }
        }

    }


    /**
     * Fetch a restaurant by its ID.
     * Fetch all restaurants as the request is most likely cached
     */
    static async fetchRestaurantById(id) {
        const restaurants = await DBHelper.fetchRestaurants();
        if (restaurants) {
            return restaurants.find(r => r.id == id);
        } else {
            return false;
        }
    }

    /**
     * Fetch reviews for a restaurant by ID.
     * Fetch all reviews as the request is most likely cached
     */
    static async fetchReviewsByRestarauntId(id) {
        const reviews = await DBHelper.fetchAllReviews();
        if (reviews) {
            return reviews.filter(review => review.restaurant_id == id);
        } else {
            return false;
        }
    }

    /**
     * Update external server with new favorite
     */
    static async updateFavorite(id, is_favorite) {
        return fetch(`${DBHelper.DATABASE_URL}/restaurants/${id}/?is_favorite=${is_favorite}`, {
            method: 'PUT'
        });
    }

    /**
     * Fetch restaurants by a cuisine type with proper error handling.
     */
    static async fetchRestaurantByCuisine(cuisine) {
        if (!cuisine) return false;

        const restaurants = await DBHelper.fetchRestaurants();
        return restaurants.filter(r => r.cuisine_type === cuisine);
    }


    /**
     * Fetch restaurants by a neighborhood with proper error handling.
     */
    static async fetchRestaurantByNeighborhood(neighborhood) {
        if (!neighborhood) return false;

        const restaurants = await DBHelper.fetchRestaurants();
        return restaurants.filter(r => r.neighborhood === neighborhood);
    }


    /**
     * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
     */
    static async fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
        let restaurants = await DBHelper.fetchRestaurants();

        if (!restaurants) return false;

        if (cuisine !== 'all') { // filter by cuisine
            restaurants = restaurants.filter(r => r.cuisine_type === cuisine);
        }
        if (neighborhood !== 'all') { // filter by neighborhood
            restaurants = restaurants.filter(r => r.neighborhood === neighborhood);
        }
        return restaurants;
    }


    /**
     * Fetch all neighborhoods with proper error handling.
     */
    static async fetchNeighborhoods() {
        const restaurants = await DBHelper.fetchRestaurants();
        if (!restaurants) return false;

        // Get all neighborhoods from all restaurants
        const neighborhoods = new Set();
        restaurants.forEach(r => neighborhoods.add(r.neighborhood));
        return neighborhoods;
    }


    /**
     * Fetch all cuisines with proper error handling.
     */
    static async fetchCuisines() {
        const restaurants = await DBHelper.fetchRestaurants();
        if (!restaurants) return false;

        // Get all cuisines from all restaurants
        const cuisines = new Set();
        restaurants.forEach(r => cuisines.add(r.cuisine_type));
        return cuisines;
    }

    /**
     * POST new review to database
     */
    static async addNewReview(review) {
        try {
            return fetch(`${DBHelper.DATABASE_URL}/reviews`, {
                method: 'POST',
                body: JSON.stringify(review)
            });
        } catch (e) {
            console.warn('Error while posting new review:', e);
            return false;
        }
    }


    /**
     * Restaurant page URL.
     */
    static urlForRestaurant(restaurant) {
        return (`./restaurant.html?id=${restaurant.id}`);
    }

    /**
     * Restaurant image URL.
     */
    static jpgUrlForRestaurant(restaurant) {
        return (`/img/${restaurant.photograph}.jpg`);
    }

    /**
     * Restaurant image URL.
     */
    static webpUrlForRestaurant(restaurant) {
        return (`/img/${restaurant.photograph}.webp`);
    }

    /**
     * Preview image URL.
     */
    static previewUrlForRestaurant(restaurant) {
        return (`/img/previews/${restaurant.photograph}.jpg`);
    }

    /**
     * Map marker for a restaurant.
     */
    static mapMarkerForRestaurant(restaurant, map) {
        try {
            const url = DBHelper.urlForRestaurant(restaurant);
            return new google.maps.Marker({
                    position: restaurant.latlng,
                    title: restaurant.name,
                    url: url,
                    map: map,
                    animation: google.maps.Animation.DROP
                }
            );
        } catch (e) {
            console.log('error in map marker function', e);
        }
    }
}

class Utils {
    static async toggleFavorite(restaurant, e) {
        restaurant.is_favorite = !restaurant.is_favorite;
        e.target.innerHTML = restaurant.is_favorite ? FILLED_HEART : HEART_OUTLINE;

        const db = await _dbPromise;
        const store = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
        await store.put(restaurant);
        DBHelper.updateFavorite(restaurant.id, restaurant.is_favorite);
    };

}