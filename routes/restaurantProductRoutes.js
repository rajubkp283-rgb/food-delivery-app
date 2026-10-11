const express = require("express");
const router = express.Router();

const restaurantMiddleware = require("../middleware/restaurantMiddleware");
const {
  addProduct,
  getRestaurantProducts,
  updateProduct,
  deleteProduct,
} = require("../controllers/restaurantProductController");

// Add new food product
router.post("/products", restaurantMiddleware, addProduct);

// Get all products of logged-in restaurant
router.get("/products", restaurantMiddleware, getRestaurantProducts);

// Update product
router.put("/products/:productId", restaurantMiddleware, updateProduct);

// Delete product
router.delete("/products/:productId", restaurantMiddleware, deleteProduct);

module.exports = router;
