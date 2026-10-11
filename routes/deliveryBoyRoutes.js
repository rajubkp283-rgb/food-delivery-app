const express = require("express");

const {
    register,
    login,
    getProfile,
    updateProfileImage,
    updateOnlineStatus,
    getMyAssignedOrders,
    updateMyOrderStatus,
    getApprovedDeliveryBoys,
} = require("../controllers/deliveryBoyController");

const {
    getDeliveryLocation
} = require("../controllers/deliveryLocationController");

const {
    updateDeliveryLocation
} = require("../controllers/deliveryLocationController");

const deliveryBoyMiddleware =
    require("../middleware/deliveryBoyMiddleware");


const adminAuth =
require("../middleware/adminMiddleware");

const router = express.Router();


// Delivery Boy Registration
router.post(
    "/register",
    register
);


// Delivery Boy Login
router.post(
    "/login",
    login
);

// Delivery Boy Profile
router.get(
    "/profile",
    deliveryBoyMiddleware,
    getProfile
);

router.put(
    "/profile-image",
    deliveryBoyMiddleware,
    updateProfileImage
);

// Delivery Boy Online / Offline Status
router.patch(
    "/status",
    deliveryBoyMiddleware,
    updateOnlineStatus
);


// Update Delivery Boy Current Location
router.post(
    "/location",
    deliveryBoyMiddleware,
    updateDeliveryLocation
);

// Get Delivery Boy Current Location
router.get(
    "/location/:deliveryBoyId",
    adminAuth,
    getDeliveryLocation
);

// Get Approved Delivery Boys
router.get(
    "/approved",
    getApprovedDeliveryBoys
);

router.get(
    "/my-orders",
    deliveryBoyMiddleware,
    getMyAssignedOrders
);

router.put(
    "/my-orders/:orderId/status",
    deliveryBoyMiddleware,
    updateMyOrderStatus
);

module.exports = router;