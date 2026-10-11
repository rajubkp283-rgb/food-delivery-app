const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
    getMyAddress,
    updateMyAddress,
    deleteMyAddress
} = require("../controllers/customerAddressController");


// Get my delivery address
router.get(
    "/",
    authMiddleware,
    getMyAddress
);


// Save / Update my delivery address
router.put(
    "/",
    authMiddleware,
    updateMyAddress
);

// Delete my delivery address

router.delete(
    "/",
    authMiddleware,
    deleteMyAddress
);


module.exports = router;