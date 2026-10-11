const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(403).json({
                message: "Forbidden"
            });
        }

        try {
            if (decoded.id === "ADMIN") {
                req.isAdmin = true;
                req.user = null;
                return next();
            }

            const user = await User.findById(decoded.id);

            if (!user || user.isBanned) {
                return res.status(403).json({
                    message: "Account suspended or not found"
                });
            }

            req.user = user;
            req.isAdmin = false;

            next();

        } catch (error) {
            console.error("Authentication Error:", error);

            return res.status(500).json({
                message: "Authentication failed"
            });
        }
    });
};

module.exports = authenticateToken;