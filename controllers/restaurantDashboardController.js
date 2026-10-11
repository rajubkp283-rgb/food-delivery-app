async function getProfile(req, res) {
    try {
        const restaurant = req.restaurant;

        res.json({
            success: true,
            restaurant: {
                id: restaurant._id,
                name: restaurant.name,
                ownerName: restaurant.ownerName,
                phone: restaurant.phone,
                email: restaurant.email,
                address: restaurant.address,
                city: restaurant.city,
                category: restaurant.category,
                description: restaurant.description,
                image: restaurant.image,
                ownerImage: restaurant.ownerImage,
                latitude: restaurant.latitude,
                longitude: restaurant.longitude,
                isOpen: restaurant.isOpen,
                isApproved: restaurant.isApproved,
                isBanned: restaurant.isBanned,
                createdAt: restaurant.createdAt
            }
        });

    } catch (error) {
        console.error("Restaurant Profile Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load restaurant profile"
        });
    }
}

async function updateRestaurantImage(req, res) {
    try {
        const { image } = req.body;

        if (!image || !image.trim()) {
            return res.status(400).json({
                success: false,
                message: "Image URL is required"
            });
        }

        const restaurant = req.restaurant;

        restaurant.image = image.trim();

        await restaurant.save();

        res.json({
            success: true,
            message: "Restaurant image updated successfully",
            image: restaurant.image
        });

    } catch (error) {
        console.error("Restaurant Image Update Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update restaurant image"
        });
    }
}

async function updateOwnerImage(req, res) {

    try {

        const { image } = req.body;

        if (!image || !image.trim()) {

            return res.status(400).json({
                success: false,
                message: "Owner image URL is required"
            });

        }

        const restaurant = req.restaurant;

        restaurant.ownerImage = image.trim();

        await restaurant.save();

        res.json({
            success: true,
            message: "Owner image updated successfully",
            ownerImage: restaurant.ownerImage
        });

    } catch (error) {

        console.error(
            "Owner Image Update Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to update owner image"
        });

    }

}


// ==========================================
// UPDATE RESTAURANT OPEN / CLOSED STATUS
// ==========================================

async function updateRestaurantStatus(req, res) {

    try {

        const { isOpen } = req.body;

        // Only true / false allowed
        if (typeof isOpen !== "boolean") {

            return res.status(400).json({
                success: false,
                message: "Invalid restaurant status."
            });

        }

        const restaurant = req.restaurant;

        if (!restaurant) {

            return res.status(404).json({
                success: false,
                message: "Restaurant not found."
            });

        }

        // Update status
        restaurant.isOpen = isOpen;

        await restaurant.save();

        return res.json({

            success: true,

            message:
                isOpen
                    ? "Restaurant is now OPEN."
                    : "Restaurant is now CLOSED.",

            isOpen: restaurant.isOpen

        });

    } catch (error) {

        console.error(
            "Restaurant Status Update Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to update restaurant status."

        });

    }

}

module.exports = {
    getProfile,
    updateRestaurantImage,
    updateOwnerImage,
    updateRestaurantStatus
};