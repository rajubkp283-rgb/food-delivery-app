const express = require("express");

const adminAuth =
    require("../middleware/adminMiddleware");

const controller =
    require("../controllers/adminRestaurantController");

const router = express.Router();


// Get all restaurants
router.get(
    "/",
    adminAuth,
    controller.getRestaurants
);


// Approve restaurant
router.put(
    "/:id/approve",
    adminAuth,
    controller.approveRestaurant
);


// Reject restaurant
router.put(
    "/:id/reject",
    adminAuth,
    controller.rejectRestaurant
);


module.exports = router;