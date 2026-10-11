const express = require("express");

const router = express.Router();

const {
    getRestaurantProductsForCustomer,
    getRestaurantsByCategory,
    getNearestProducts
} = require("../controllers/productController");

// Get products of a restaurant for customer
router.get(
  "/restaurant/:restaurantId",
  getRestaurantProductsForCustomer
);

router.get("/category/:category", getRestaurantsByCategory);

// Get nearest Restaurant / Grocery products within 5 KM

router.get(
    "/nearest",
    getNearestProducts
);

module.exports = router;