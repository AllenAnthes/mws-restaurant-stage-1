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

        // local asset so we can provide access to the server via tunnel without having to spin up
        // a publicly accessible server.
        // return '/data/restaurants.json';
    }

    static openDatabase() {
        return idb.open('rest-reviews', 1, (upgradeDb) => {
            const restaurantStore = upgradeDb.createObjectStore('restaurants', {
                keyPath: 'id'
            });
            restaurantStore.createIndex('by-neighborhood', 'neighborhood');
            restaurantStore.createIndex('by-cuisine', 'cuisine_type');
            const reviewStore = upgradeDb.createObjectStore('reviews', {
                keyPath: 'id'
            });
            reviewStore.createIndex('by-restaurant', 'restaurant_id');
        });
    }

    /**
     * Fetch all restaurants.
     */
    static async fetchRestaurants() {
        try {
            const response = await fetch(`${DBHelper.DATABASE_URL}/restaurants`);
            const restaurants = await response.json();
            return restaurants.map(r => ({
                ...r,
                is_favorite: r.is_favorite === true || r.is_favorite === 'true'
            }));
        } catch (e) {
            console.warn(`Error in fetch restaurants: ${e}`);
            return false;
        }
    }

    static async fetchAllReviews() {
        try {
            const response = await fetch(`${DBHelper.DATABASE_URL}/reviews`);
            const reviews = await response.json();
            // console.log(reviews);
            return reviews;
        } catch (e) {
            console.warn(`Error in fetch reviews: ${e}`);
            return false;
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
        return restaurants.filter(r => r.cuisine_type == cuisine);
    }


    /**
     * Fetch restaurants by a neighborhood with proper error handling.
     */
    static async fetchRestaurantByNeighborhood(neighborhood) {
        if (!neighborhood) return false;

        const restaurants = await DBHelper.fetchRestaurants();
        return restaurants.filter(r => r.neighborhood == neighborhood);
    }


    /**
     * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
     */
    static async fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
        let restaurants = await DBHelper.fetchRestaurants();

        if (!restaurants) return false;

        if (cuisine !== 'all') { // filter by cuisine
            restaurants = restaurants.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood !== 'all') { // filter by neighborhood
            restaurants = restaurants.filter(r => r.neighborhood == neighborhood);
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
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
        // Remove duplicates from neighborhoods
        return neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
    }


    /**
     * Fetch all cuisines with proper error handling.
     */
    static async fetchCuisines() {
        const restaurants = await DBHelper.fetchRestaurants();
        if (!restaurants) return false;

        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        return cuisines.filter((v, i) => cuisines.indexOf(v) == i);
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
    static async mapMarkerForRestaurant(restaurant, map) {
        const url = await DBHelper.urlForRestaurant(restaurant);
        return new google.maps.Marker({
                position: restaurant.latlng,
                title: restaurant.name,
                url: url,
                map: map,
                animation: google.maps.Animation.DROP
            }
        );
    }
}
