const Restaurant = require("../models/Restaurant");

const {
    registerRestaurant,
    loginRestaurant
} = require("../services/restaurantService");


// ===============================
// REGISTER RESTAURANT
// ===============================

async function register(req, res) {

    try {

        const {
        name,
        ownerName,
        phone,
        password,
        email,
        address,
        city,
        category,
        latitude,
        longitude
        } = req.body;

       if (
        !name ||
        !ownerName ||
        !phone ||
        !password ||
        !address ||
        latitude === undefined ||
        longitude === undefined ||
        latitude === "" ||
        longitude === ""
        ) {
          return res.status(400).json({
        message:
            "Restaurant name, owner name, phone, password, address and shop location are required."
        });
        }

        await registerRestaurant({
        name,
        ownerName,
        phone,
        password,
        email,
        address,
        city,
        category,
        latitude,
        longitude
        });

        res.status(201).json({
            message:
                "Restaurant registration successful. Please wait for admin approval."
        });

    } catch (error) {

        console.error(
            "Restaurant Registration Error:",
            error
        );

        res.status(400).json({
            message: error.message
        });
    }
}


// ===============================
// LOGIN RESTAURANT
// ===============================

async function login(req, res) {

    try {

        const {
            phone,
            password
        } = req.body;

        if (!phone || !password) {
            return res.status(400).json({
                message:
                    "Phone number and password are required."
            });
        }

        const result = await loginRestaurant(
            phone,
            password
        );

        res.json(result);

    } catch (error) {

        console.error(
            "Restaurant Login Error:",
            error
        );

        res.status(400).json({
            message: error.message
        });
    }
}


// ===============================
// GET APPROVED RESTAURANTS
// ===============================

async function getRestaurants(req, res) {

    try {

        const { category } = req.query;

        const filter = {
            isApproved: true,
            isBanned: false
        };

        // Category filter
        if (category) {
            filter.category = category.trim();
        }

        const restaurants = await Restaurant.find(
            filter
        ).sort({
            createdAt: -1
        });

        res.json({
            success: true,
            category: category || "All",
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
            message: "Failed to get restaurants",
            error: error.message
        });
    }
}

// ===============================
// GET SINGLE APPROVED RESTAURANT
// ===============================

async function getRestaurantById(req, res) {
    try {
        const { id } = req.params;

        if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid restaurant ID"
            });
        }

        const restaurant = await Restaurant.findOne({
            _id: id,
            isApproved: true,
            isBanned: false
        }).lean();

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Approved store not found"
            });
        }

        return res.json({
            success: true,
            restaurant
        });

    } catch (error) {
        console.error("Get Restaurant By ID Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load store"
        });
    }
}

// ===============================
// UPDATE RESTAURANT IMAGE
// ===============================

async function updateRestaurantImage(req, res) {

    try {

        const { image } = req.body;

        if (!image) {
            return res.status(400).json({
                success: false,
                message: "Restaurant image URL is required."
            });
        }

        const restaurantId = req.restaurant._id;

        const restaurant = await Restaurant.findById(
            restaurantId
        );

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found."
            });
        }

        restaurant.image = image.trim();

        await restaurant.save();

        res.json({
            success: true,
            message: "Restaurant image updated successfully.",
            image: restaurant.image
        });

    } catch (error) {

        console.error(
            "Update Restaurant Image Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to update restaurant image."
        });
    }
}

module.exports = {
    register,
    login,
    getRestaurants,
    getRestaurantById,
    updateRestaurantImage
};