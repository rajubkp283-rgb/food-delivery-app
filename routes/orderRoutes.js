const express = require("express");

const {
  createOrder,
  createOrderFromCart,
  getMyOrders,
  getRestaurantOrders,
  updateRestaurantOrderStatus,
  assignOrderToDeliveryBoy,getOrderTracking,
  reorderPreviousOrder,
} = require("../controllers/orderController");

const authMiddleware =
    require("../middleware/authMiddleware");

const router = express.Router();

const restaurantMiddleware =
    require("../middleware/restaurantMiddleware");


// Create New Order
router.post(
    "/",
    authMiddleware,
    createOrder
);

// Create order from customer cart
router.post(
  "/from-cart",
  authMiddleware,
  createOrderFromCart
);

// Get customer orders
router.get(
  "/my-orders",
  authMiddleware,
  getMyOrders
);

router.get(
  "/restaurant/orders",
  restaurantMiddleware,
  getRestaurantOrders
);

router.put(
  "/restaurant/orders/:orderId/status",
  restaurantMiddleware,
  updateRestaurantOrderStatus
);

router.put(
  "/restaurant/orders/:orderId/assign",
  restaurantMiddleware,
  assignOrderToDeliveryBoy
);

// Customer order tracking
router.get(
  "/:orderId/tracking",
  authMiddleware,
  getOrderTracking
);

// Reorder Previous Order

router.post(

  "/:orderId/reorder",

  authMiddleware,

  reorderPreviousOrder

);


module.exports = router;