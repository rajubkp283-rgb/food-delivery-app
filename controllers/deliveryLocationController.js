const DeliveryLocation = require("../models/DeliveryLocation");

async function updateDeliveryLocation(req, res) {
    try {
        const deliveryBoyId = req.deliveryBoy._id;

        const { latitude, longitude, accuracy } = req.body;

        if (
            latitude === undefined ||
            longitude === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Latitude and longitude are required."
            });
        }

        const lat = Number(latitude);
        const lng = Number(longitude);
        const acc =
            accuracy !== undefined
                ? Number(accuracy)
                : null;

        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid latitude or longitude."
            });
        }

        if (lat < -90 || lat > 90) {
            return res.status(400).json({
                success: false,
                message: "Invalid latitude."
            });
        }

        if (lng < -180 || lng > 180) {
            return res.status(400).json({
                success: false,
                message: "Invalid longitude."
            });
        }

        const location =
            await DeliveryLocation.findOneAndUpdate(
                { deliveryBoyId },

                {
                    deliveryBoyId,
                    latitude: lat,
                    longitude: lng,
                    accuracy: Number.isFinite(acc)
                        ? acc
                        : null,
                    updatedAt: new Date()
                },

                {
                    new: true,
                    upsert: true,
                    setDefaultsOnInsert: true
                }
            );

        res.json({
            success: true,
            message: "Delivery location updated successfully.",
            location: {
                deliveryBoyId: location.deliveryBoyId,
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy,
                updatedAt: location.updatedAt
            }
        });

    } catch (error) {
        console.error(
            "UPDATE DELIVERY LOCATION ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to update delivery location."
        });
    }
}

async function getDeliveryLocation(req, res) {
    try {
        const { deliveryBoyId } = req.params;

        if (!deliveryBoyId) {
            return res.status(400).json({
                success: false,
                message: "Delivery Boy ID is required."
            });
        }

        const location =
            await DeliveryLocation.findOne({
                deliveryBoyId
            });

        if (!location) {
            return res.status(404).json({
                success: false,
                message: "Delivery Boy location not found."
            });
        }

        res.json({
            success: true,
            location: {
                deliveryBoyId:
                    location.deliveryBoyId,

                latitude:
                    location.latitude,

                longitude:
                    location.longitude,

                accuracy:
                    location.accuracy,

                updatedAt:
                    location.updatedAt
            }
        });

    } catch (error) {
        console.error(
            "GET DELIVERY LOCATION ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to get delivery location."
        });
    }
}

module.exports = {
    updateDeliveryLocation,
    getDeliveryLocation
};