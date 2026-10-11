const express = require("express");

const router = express.Router();

const {
    adminLogin
} = require("../controllers/adminAuthController");

// ===============================
// ADMIN LOGIN
// ===============================

router.post(
    "/login",
    adminLogin
);

module.exports = router;