const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
} = require("../controllers/cartController");

// Add product to cart
router.post(
  "/add",
  authMiddleware,
  addToCart
);

// Get customer cart
router.get(
  "/",
  authMiddleware,
  getCart
);

// Update cart item quantity
router.put(
  "/item/:productId",
  authMiddleware,
  updateCartItem
);

// Remove product from cart
router.delete(
  "/item/:productId",
  authMiddleware,
  removeFromCart
);

module.exports = router;