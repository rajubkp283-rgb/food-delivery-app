const jwt = require("jsonwebtoken");
const DeliveryBoy = require("../models/DeliveryBoy");

async function deliveryBoyMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Delivery Boy authentication required."
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.ORS_SECRET_KEY || "ORS_SECRET_KEY_2026"
        );

        if (
            !decoded ||
            decoded.role !== "deliveryBoy"
        ) {
            return res.status(403).json({
                success: false,
                message: "Delivery Boy access required."
            });
        }

        const deliveryBoy =
            await DeliveryBoy.findById(decoded.id);

        if (!deliveryBoy) {
            return res.status(401).json({
                success: false,
                message: "Delivery Boy account not found."
            });
        }

        if (deliveryBoy.isBanned) {
            return res.status(403).json({
                success: false,
                message: "Delivery Boy account is banned."
            });
        }

        req.deliveryBoy = deliveryBoy;

        next();

    } catch (error) {
        console.error(
            "DELIVERY BOY AUTH ERROR:",
            error
        );

        return res.status(401).json({
            success: false,
            message: "Invalid or expired Delivery Boy token."
        });
    }
}

module.exports = deliveryBoyMiddleware;