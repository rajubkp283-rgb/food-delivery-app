const express = require("express");

const {
    register,
    login,
    getRestaurants,
    getRestaurantById,
    updateRestaurantImage
} = require("../controllers/restaurantController");

const restaurantAuth = require("../middleware/restaurantMiddleware");

const router = express.Router();


// Get approved restaurants
router.get(
    "/",
    getRestaurants
);

// Get single approved restaurant by ID
router.get(
    "/:id",
    getRestaurantById
);


// Restaurant registration
router.post(
    "/register",
    register
);


// Restaurant login
router.post(
    "/login",
    login
);

// Update restaurant image

router.put(
    "/image",
    restaurantAuth,
    updateRestaurantImage
);


module.exports = router;