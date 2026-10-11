const User = require("../models/User");


// Get My Delivery Address
const getMyAddress = async (req, res) => {

    try {

        const user = await User.findById(req.user._id)
            .select("deliveryAddress phone");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            address: user.deliveryAddress || {
                phone: user.phone
            }
        });

    } catch (error) {

        console.error(
            "GET ADDRESS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to get delivery address",
            error: error.message
        });
    }
};


// Save / Update My Delivery Address
const updateMyAddress = async (req, res) => {

    try {

        const {
            name,
            phone,
            address,
            city,
            pincode,
            latitude,
            longitude
        } = req.body;


        // Find logged-in user
        const user = await User.findById(
            req.user._id
        );


        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }


        // Address is required
        if (
            !address ||
            !String(address).trim()
        ) {

            return res.status(400).json({
                success: false,
                message: "Address is required"
            });
        }


        // Use account phone if phone is not
        // provided by frontend
        const finalPhone =
            phone &&
            String(phone).trim()
                ? String(phone).trim()
                : user.phone;


        // Name is optional
        const finalName =
            name &&
            String(name).trim()
                ? String(name).trim()
                : "Customer";


        // City is optional
        const finalCity =
            city &&
            String(city).trim()
                ? String(city).trim()
                : "";


        // Pincode is optional
        const finalPincode =
            pincode &&
            String(pincode).trim()
                ? String(pincode).trim()
                : "";


        // Save / Update address
        user.deliveryAddress = {

            name:
                finalName,

            phone:
                finalPhone,

            address:
                String(address).trim(),

            city:
                finalCity,

            pincode:
                finalPincode,

            latitude:
                latitude !== undefined &&
                latitude !== null &&
                latitude !== ""
                    ? Number(latitude)
                    : null,

            longitude:
                longitude !== undefined &&
                longitude !== null &&
                longitude !== ""
                    ? Number(longitude)
                    : null
        };


        await user.save();


        // Success response
        res.json({

            success: true,

            message:
                "Delivery address saved successfully",

            address:
                user.deliveryAddress
        });


    } catch (error) {

        console.error(
            "UPDATE ADDRESS ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to save delivery address",

            error:
                error.message
        });
    }
};


// Delete My Delivery Address
const deleteMyAddress = async (req, res) => {

    try {

        const user = await User.findById(
            req.user._id
        );

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }


        // Permanently remove delivery address
        user.deliveryAddress = undefined;

        await user.save();


        res.json({
            success: true,
            message: "Delivery address deleted successfully"
        });


    } catch (error) {

        console.error(
            "DELETE ADDRESS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to delete delivery address",
            error: error.message
        });
    }
};


module.exports = {
    getMyAddress,
    updateMyAddress,
    deleteMyAddress
};