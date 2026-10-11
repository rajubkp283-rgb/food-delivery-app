const express = require("express");

const restaurantAuth = require("../middleware/restaurantMiddleware");
const restaurantDashboardController = require("../controllers/restaurantDashboardController");

const router = express.Router();

// Restaurant Dashboard Profile
router.get(
    "/profile",
    restaurantAuth,
    restaurantDashboardController.getProfile
);

// Update Restaurant Image

router.put(
    "/image",
    restaurantAuth,
    restaurantDashboardController.updateRestaurantImage
);

// Update Owner Image

router.put(

    "/owner-image",

    restaurantAuth,

    restaurantDashboardController.updateOwnerImage

);


// Update Restaurant Open / Closed Status

router.put(
    "/status",
    restaurantAuth,
    restaurantDashboardController.updateRestaurantStatus
);

module.exports = router;