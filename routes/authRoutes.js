const express = require("express");

const {
    register,
    login,
    emailLogin,
    googleLogin,
    googleRegister,
    facebookLogin,
    facebookRegister,
    profile
} = require("../controllers/authController");

const authenticateToken =
    require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);

router.post("/login", login);
router.post("/email-login", emailLogin);
router.post("/google-login", googleLogin);
router.post("/google-register", googleRegister);
router.post("/facebook-login", facebookLogin);
router.post("/facebook-register", facebookRegister);

router.get(
    "/profile",
    authenticateToken,
    profile
);

module.exports = router;