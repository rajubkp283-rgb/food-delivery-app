const jwt = require("jsonwebtoken");
const Restaurant = require("../models/Restaurant");

const JWT_SECRET = process.env.JWT_SECRET;

async function restaurantAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Restaurant login required"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.role !== "restaurant") {
            return res.status(403).json({
                success: false,
                message: "Restaurant access only"
            });
        }

        const restaurant = await Restaurant.findById(decoded.id).select("-password");

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found"
            });
        }

        if (restaurant.isBanned) {
            return res.status(403).json({
                success: false,
                message: "Restaurant account is banned"
            });
        }

        req.restaurant = restaurant;

        next();

    } catch (error) {
        console.error("Restaurant Auth Error:", error);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired restaurant token"
        });
    }
}

module.exports = restaurantAuth;