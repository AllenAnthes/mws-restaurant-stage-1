const FILLED_HEART = '❤️️️';
const HEART_OUTLINE = '🖤';

var restaurant;
var reviews;
var map;
const _dbPromise = DBHelper.openDatabase();


/**
 * Attempt to populate restaurants from cache before network
 */
const getCachedRestaurant = async (id) => {
    const db = await _dbPromise;

    if (!db || self.restaurant) return; // return if restaurants are already being displayed

    const store = await db.transaction('restaurants').objectStore('restaurants');
    const restaurant = await store.get(parseInt(id));
    if (restaurant) {
        self.restaurant = restaurant;
        fillRestaurantHTML(restaurant);
    }
};

/**
 * Attempts to fetch reviews from idb and populate html
 */
const getCachedReviews = async (id) => {
    const db = await _dbPromise;

    if (!db) return;

    const index = await db.transaction('reviews')
        .objectStore('reviews')
        .index('by-restaurant');

    const reviews = await index.getAll(parseInt(id));
    if (reviews) {
        // self.reviews = reviews;
        resetReviews(reviews);
        fillReviewsHTML();
    }
};

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = async () => {
    const id = getParameterByName('id');
    if (!id) { // no id found in URL
        console.warn('No restaurant id in URL');
        return;
    }

    await Promise.all([getCachedReviews(id), getCachedRestaurant(id)]);

    if (!self.restaurant) { //  If cache misses we have to wait for network data
        await fetchDataFromNetwork(id);
    } else { // else we'll get it eventually
        fetchDataFromNetwork(id);
    }

    if (!self.restaurant) return;
    self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: self.restaurant.latlng,
        scrollwheel: false
    });
    fillBreadcrumb();
    DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
};

/**
 * Get current restaurant from page URL.
 */
const fetchDataFromNetwork = async (id) => {
    const restaurant = await DBHelper.fetchRestaurantById(id);
    if (restaurant && self.restaurant !== restaurant) { // only update if different from cached
        self.restaurant = restaurant;
        fillRestaurantHTML(restaurant);
        // cacheRestaurant(restaurant);
    }

    const reviews = await DBHelper.fetchReviewsByRestarauntId(id);
    if (reviews && self.reviews.length < reviews.length) { // only update if different from cached
        self.reviews = reviews;
        fillReviewsHTML();
        // cacheReviews(reviews);
    }
};

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant) => {
    if (!restaurant) return;
    const name = document.getElementById('restaurant-name');
    name.innerHTML = restaurant.name;

    const favorite = document.getElementById('favorite');
    favorite.setAttribute('Role', 'button');
    favorite.innerHTML = restaurant.is_favorite ? FILLED_HEART : HEART_OUTLINE;
    favorite.onclick = (e) => Utils.toggleFavorite(restaurant, e);


    const address = document.getElementById('restaurant-address');
    address.innerHTML = restaurant.address;

    const image = document.getElementById('restaurant-img');
    image.className = 'restaurant-img';
    image.src = DBHelper.jpgUrlForRestaurant(restaurant);
    image.srcset = DBHelper.webpUrlForRestaurant(restaurant);

    const cuisine = document.getElementById('restaurant-cuisine');
    cuisine.innerHTML = restaurant.cuisine_type;

    // fill operating hours
    if (restaurant.operating_hours) {
        fillRestaurantHoursHTML();
    }
    // fill reviews
    fillReviewsHTML();
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
    const hours = document.getElementById('restaurant-hours');
    hours.innerHTML = '';
    Object.keys(operatingHours).forEach(key => {
        const row = document.createElement('tr');

        const day = document.createElement('td');
        day.innerHTML = key;
        row.appendChild(day);

        const time = document.createElement('td');
        time.innerHTML = operatingHours[key];
        row.appendChild(time);

        hours.appendChild(row);
    });
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (reviews = self.reviews) => {
    resetReviews(reviews);
    const container = document.getElementById('reviews-container');

    if (!reviews || reviews.length === 0) {
        const ul = document.getElementById('reviews-list');
        const noReviews = document.createElement('p');
        noReviews.innerHTML = 'No reviews yet!';
        ul.appendChild(noReviews);
    } else {
        const ul = document.getElementById('reviews-list');
        reviews.forEach(review => {
            ul.appendChild(createReviewHTML(review));
        });
        container.appendChild(ul);
    }
};

/**
 * Expands add review panel on button click
 */
const handleAddReviewClick = () => {
    const panel = document.getElementById('panel');
    if (panel.style.maxHeight) {
        panel.style.maxHeight = null;
    } else {
        panel.style.maxHeight = panel.scrollHeight + 'px';
    }
};

/**
 *  Adds new review to the page, adds to offline store to be added later
 *  if network connectivity isn't available
 */
const handleSubmit = async () => {
    const name = document.getElementById('name').value;
    const comments = document.getElementById('review-text').value;
    const rating = document.querySelector('input[name="rating"]:checked').value;

    const db = await _dbPromise;
    const tx = db.transaction('reviews', 'readwrite');
    const store = tx.objectStore('reviews');

    const review = {
        restaurant_id: self.restaurant.id,
        name,
        rating,
        comments,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    store.add(review);
    self.reviews.push(review);
    document.getElementById('reviews-list')
        .appendChild(createReviewHTML(review));
    handleAddReviewClick();
    try {
        await DBHelper.addNewReview(review);
    } catch (e) {
        console.log('Failed to update remote.  Adding to offlineStore');
        const offlineStore = db.transaction('offlineStore', 'readwrite').objectStore('offlineStore');
        offlineStore.add(review);

    }
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetReviews = (reviews) => {
    // Remove all reviews
    self.reviews = [];
    const ul = document.getElementById('reviews-list');
    ul.innerHTML = '';

    self.reviews = reviews;
};


/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
    const li = document.createElement('li');
    const reviewHeader = document.createElement('div');
    reviewHeader.className = 'review-header';
    li.appendChild(reviewHeader);

    const name = document.createElement('p');
    name.className = 'review-name';
    name.innerHTML = review.name;
    reviewHeader.appendChild(name);

    const date = document.createElement('p');
    date.innerHTML = new Date(review.createdAt).toLocaleString();
    date.className = 'review-date';
    reviewHeader.appendChild(date);

    const ratingContainer = document.createElement('div');
    ratingContainer.className = 'rating-container';
    li.appendChild(ratingContainer);

    const rating = document.createElement('p');
    rating.innerHTML = `Rating: ${review.rating}`;
    rating.className = 'review-rating';
    ratingContainer.appendChild(rating);

    const comments = document.createElement('p');
    comments.innerHTML = review.comments;
    comments.className = 'review-comments';
    li.appendChild(comments);

    return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant = self.restaurant) => {
    const breadcrumb = document.getElementById('breadcrumb');
    const li = document.createElement('li');
    li.innerHTML = restaurant.name;
    breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
    if (!url)
        url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
        results = regex.exec(url);
    if (!results)
        return null;
    if (!results[2])
        return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

/**
 * Register service worker
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            await navigator.serviceWorker.register('/service-worker.js');
        } catch (e) {
            console.log(`Serviceworker registration failed.`);
        }
    });
}