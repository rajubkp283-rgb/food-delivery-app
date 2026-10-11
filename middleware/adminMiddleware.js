const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

function adminAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Admin login required"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access only"
            });
        }

        req.admin = decoded;

        next();

    } catch (error) {
        console.error("Admin Auth Error:", error);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired admin token"
        });
    }
}

module.exports = adminAuth;