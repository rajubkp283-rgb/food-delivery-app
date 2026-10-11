const jwt = require("jsonwebtoken");

// ===============================
// ADMIN LOGIN
// ===============================

async function adminLogin(req, res) {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required"
            });
        }

        const adminUsername = process.env.ADMIN_USERNAME;
        const adminPassword = process.env.ADMIN_PASSWORD;
        const JWT_SECRET = process.env.JWT_SECRET;

        if (!adminUsername || !adminPassword || !JWT_SECRET) {
            return res.status(500).json({
                success: false,
                message: "Admin login configuration is missing"
            });
        }

        if (
            username !== adminUsername ||
            password !== adminPassword
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin username or password"
            });
        }

        const token = jwt.sign(
            {
                id: "ADMIN",
                role: "admin"
            },
            JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({
            success: true,
            message: "Admin login successful",
            token
        });

    } catch (error) {
        console.error("Admin Login Error:", error);

        res.status(500).json({
            success: false,
            message: "Admin login failed"
        });
    }
}

module.exports = {
    adminLogin
};