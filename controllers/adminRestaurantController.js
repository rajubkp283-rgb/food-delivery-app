const Restaurant = require("../models/Restaurant");


// Get all restaurants
async function getRestaurants(req, res) {
    try {

        const restaurants = await Restaurant
            .find()
            .select("-password")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: restaurants.length,
            restaurants
        });

    } catch (error) {

        console.error(
            "Get Restaurants Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to get restaurants"
        });
    }
}


// Approve restaurant
async function approveRestaurant(req, res) {
    try {

        const { id } = req.params;

        const restaurant =
            await Restaurant.findById(id);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found"
            });
        }

        if (restaurant.isBanned) {
            return res.status(400).json({
                success: false,
                message: "Banned restaurant cannot be approved"
            });
        }

        restaurant.isApproved = true;

        await restaurant.save();

        res.json({
            success: true,
            message: "Restaurant approved successfully",
            restaurant: {
                id: restaurant._id,
                name: restaurant.name,
                isApproved: restaurant.isApproved
            }
        });

    } catch (error) {

        console.error(
            "Approve Restaurant Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to approve restaurant"
        });
    }
}


// Reject / remove approval
async function rejectRestaurant(req, res) {
    try {

        const { id } = req.params;

        const restaurant =
            await Restaurant.findById(id);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found"
            });
        }

        restaurant.isApproved = false;

        await restaurant.save();

        res.json({
            success: true,
            message: "Restaurant approval removed",
            restaurant: {
                id: restaurant._id,
                name: restaurant.name,
                isApproved: restaurant.isApproved
            }
        });

    } catch (error) {

        console.error(
            "Reject Restaurant Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to reject restaurant"
        });
    }
}


module.exports = {
    getRestaurants,
    approveRestaurant,
    rejectRestaurant
};