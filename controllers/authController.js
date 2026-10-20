
const {
    registerUser,
    loginUser,
    loginUserByEmail,
    loginUserWithGoogle,
    registerUserWithGoogle,
    loginUserWithFacebook,
    registerUserWithFacebook
} = require("../services/authService");

const authenticateToken =
    require("../middleware/authMiddleware");



async function register(req, res) {
    try {
        const {
            name,
            phone,
            email,
            password,
            confirmPassword,
            promoCode
        } = req.body;

        if (
            !name ||
            !phone ||
            !email ||
            !password ||
            !confirmPassword
        ) {
            return res.status(400).json({
                message: "Please fill in all required information"
            });
        }

        await registerUser({
            name,
            phone,
            email,
            password,
            confirmPassword,
            promoCode
        });

        return res.status(201).json({
            message: "Registration Successful"
        });

    } catch (error) {
        console.error("Registration Error:", error);

        const message = error.message || "Registration failed.";

        const statusCode =
            message.includes("already registered") ||
            message.includes("do not match") ||
            message.includes("valid email")
                ? 400
                : 500;

        return res.status(statusCode).json({
            message
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



/* CUSTOMER EMAIL LOGIN */
async function emailLogin(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Please enter your email and password!"
            });
        }

        const result = await loginUserByEmail(email, password);
        return res.json(result);

    } catch (error) {
        console.error("Email Login Error:", error);
        return res.status(400).json({
            message: error.message
        });
    }
}


async function googleLogin(req, res) {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: "Google ID token is required."
            });
        }

        const result = await loginUserWithGoogle(idToken);

        return res.json({
            success: true,
            ...result
        });
    
    } catch (error) {
        console.error("Google Login Error:", error.message);

        if (error.code === "USER_NOT_REGISTERED") {
            return res.status(404).json({
                success: false,
                code: "USER_NOT_REGISTERED",
                message: "Please register first."
            });
        }

        return res.status(401).json({
            success: false,
            message: error.message || "Google login failed."
        });
    }

}


async function googleRegister(req, res) {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: "Google ID token is required."
            });
        }

        const result = await registerUserWithGoogle(idToken);

        return res.status(201).json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error(
            "Google Registration Error:",
            error.message
        );

        if (error.code === "USER_ALREADY_REGISTERED") {
            return res.status(409).json({
                success: false,
                code: "USER_ALREADY_REGISTERED",
                message: error.message
            });
        }

        return res.status(400).json({
            success: false,
            message: error.message ||
                "Google registration failed."
        });
    }
}


async function facebookLogin(req, res) {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: "Facebook ID token is required."
            });
        }

        const result = await loginUserWithFacebook(idToken);

        return res.json({ success: true, ...result });
    } catch (error) {
        console.error("Facebook Login Error:", error.message);

        if (error.code === "USER_NOT_REGISTERED") {
            return res.status(404).json({
                success: false,
                code: "USER_NOT_REGISTERED",
                message: "Please register first."
            });
        }

        return res.status(401).json({
            success: false,
            message: error.message || "Facebook login failed."
        });
    }
}


async function facebookRegister(req, res) {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: "Facebook ID token is required."
            });
        }

        const result = await registerUserWithFacebook(idToken);

        return res.status(201).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error("Facebook Registration Error:", error.message);

        if (error.code === "USER_ALREADY_REGISTERED") {
            return res.status(409).json({
                success: false,
                code: "USER_ALREADY_REGISTERED",
                message: error.message
            });
        }

        return res.status(400).json({
            success: false,
            message: error.message || "Facebook registration failed."
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
    emailLogin,
    googleLogin,
    googleRegister,
    facebookLogin,
    facebookRegister,
    profile
};