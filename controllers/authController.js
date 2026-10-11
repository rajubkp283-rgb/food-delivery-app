const {
    registerUser,
    loginUser
} = require("../services/authService");

const authenticateToken =
    require("../middleware/authMiddleware");


async function register(req, res) {
    try {
        const {
            phone,
            password,
            confirmPassword,
            promoCode
        } = req.body;

        if (!phone || !password || !confirmPassword) {
            return res.status(400).json({
                message:
                    "Please fill in all required information"
            });
        }

        await registerUser({
            phone,
            password,
            confirmPassword,
            promoCode
        });

        res.status(201).json({
            message: "Registration Successful"
        });

    } catch (error) {
        console.error("Registration Error:", error);

        res.status(500).json({
            message: error.message
        });
    }
}


async function login(req, res) {
    try {
        const {
            phone,
            password
        } = req.body;

        if (!phone || !password) {
            return res.status(400).json({
                message:
                    "Please enter your phone number and password!"
            });
        }

        // Admin login remains separate for now.
        if (
            phone === "6202875038" &&
            password === "406976"
        ) {
            const jwt = require("jsonwebtoken");

            const token = jwt.sign(
                {
                    id: "ADMIN",
                    isAdmin: true
                },
                "ORS_SECRET_KEY_2026"
            );

            return res.json({
                token,
                isAdmin: true
            });
        }

        const result = await loginUser(
            phone,
            password
        );

        res.json(result);

    } catch (error) {
        console.error("Login Error:", error);

        res.status(400).json({
            message: error.message
        });
    }
}


/* ==========================================
   CUSTOMER PROFILE
   ========================================== */

async function profile(req, res) {
    try {

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Customer not authenticated."
            });
        }

        res.json({
            success: true,
            user: {
                id: req.user._id,
                name: req.user.name || "",
                phone: req.user.phone,
                email: req.user.email || "",
                isBanned: req.user.isBanned || false
            }
        });

    } catch (error) {

        console.error(
            "Profile Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load customer profile."
        });
    }
}


module.exports = {
    register,
    login,
    profile
};