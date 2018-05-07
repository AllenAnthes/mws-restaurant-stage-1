let restaurant;
let map;
const _dbPromise = DBHelper.openDatabase();

/**
 * Attempt to populate restaurants from cache before network
 */
const getCachedRestaurant = async (id) => {
    const db = await _dbPromise;

    if (!db || self.restaurant) return; // return if restaurants are already being displayed

    const store = await db.transaction('restaurants').objectStore('restaurants');
    const restaurants = await store.getAll();
    // console.log(restaurants);
    return restaurants.find(r => r.id == id);
};


/**
 * Initialize Google map, called from HTML.
 */
window.initMap = async () => {
    const restaurant = await fetchRestaurantFromURL();
    if (!restaurant) return;
    self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
    });
    fillBreadcrumb();
    DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
};

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = async () => {
    if (self.restaurant) { // restaurant already fetched!
        return self.restaurant;
    }
    const id = getParameterByName('id');
    if (!id) { // no id found in URL
        const error = 'No restaurant id in URL';
        console.warn(error);
        return false;
    }

    let restaurant = await getCachedRestaurant(id);
    if (restaurant) {
        self.restaurant = restaurant;
        fillRestaurantHTML();
        return restaurant;
    }

    restaurant = await DBHelper.fetchRestaurantById(id);
    if (restaurant) {
        self.restaurant = restaurant;
        fillRestaurantHTML();
        return restaurant;
    }
};

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
    const name = document.getElementById('restaurant-name');
    name.innerHTML = restaurant.name;

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
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
    const hours = document.getElementById('restaurant-hours');
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
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
    const container = document.getElementById('reviews-container');
    const title = document.createElement('h2');
    title.innerHTML = 'Reviews';
    container.appendChild(title);

    if (!reviews) {
        const noReviews = document.createElement('p');
        noReviews.innerHTML = 'No reviews yet!';
        container.appendChild(noReviews);
        return;
    }
    const ul = document.getElementById('reviews-list');
    reviews.forEach(review => {
        ul.appendChild(createReviewHTML(review));
    });
    container.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
    const li = document.createElement('li');
    const reviewHeader = document.createElement('div');
    reviewHeader.className = 'review-header';
    li.appendChild(reviewHeader);

    const name = document.createElement('p');
    name.className = 'review-name';
    name.innerHTML = review.name;
    reviewHeader.appendChild(name);

    const date = document.createElement('p');
    date.innerHTML = review.date;
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
fillBreadcrumb = (restaurant = self.restaurant) => {
    const breadcrumb = document.getElementById('breadcrumb');
    const li = document.createElement('li');
    li.innerHTML = restaurant.name;
    breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
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
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log(`ServiceWorker registration successful with scope: ${registration.scope}`);
        } catch (e) {
            console.log(`Serviceworker registration failed.`);
        }
    });
}