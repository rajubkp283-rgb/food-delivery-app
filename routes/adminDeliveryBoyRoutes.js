

const express = require("express");

const {
    getDeliveryBoys,
    approveDeliveryBoy,
    banDeliveryBoy,
    unbanDeliveryBoy
} = require("../controllers/adminDeliveryBoyController");

const adminAuth = require("../middleware/adminMiddleware");

const router = express.Router();


// Get all Delivery Boys
router.get(
    "/",
    getDeliveryBoys
);


// Approve Delivery Boy
router.patch(
    "/:id/approve",
    approveDeliveryBoy
);


// Ban Delivery Boy
router.patch(
    "/:id/ban",
    banDeliveryBoy
);


// Unban Delivery Boy
router.patch(
    "/:id/unban",
    unbanDeliveryBoy
);


module.exports = router;