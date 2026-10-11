const {
    registerDeliveryBoy,
    loginDeliveryBoy
} = require("../services/deliveryBoyService");


async function register(req, res) {
    try {
        const deliveryBoy =
            await registerDeliveryBoy(req.body);

        res.status(201).json({
            success: true,
            message:
                "Delivery Boy registered successfully. Waiting for admin approval.",
            deliveryBoy
        });

    } catch (error) {
        console.error(
            "DELIVERY BOY REGISTER ERROR:",
            error
        );

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}


async function login(req, res) {
    try {
        const {
            phone,
            password
        } = req.body;

        if (!phone || !password) {
            return res.status(400).json({
                success: false,
                message:
                    "Phone and password are required."
            });
        }

        const result =
            await loginDeliveryBoy(
                phone,
                password
            );

        res.json({
            success: true,
            message:
                "Delivery Boy login successful.",
            token: result.token,
            deliveryBoy: result.deliveryBoy
        });

    } catch (error) {
        console.error(
            "DELIVERY BOY LOGIN ERROR:",
            error
        );

        res.status(401).json({
            success: false,
            message: error.message
        });
    }
}

async function getProfile(req, res) {
    try {
        const deliveryBoy = req.deliveryBoy;

        res.json({
            success: true,
            deliveryBoy: {
                id: deliveryBoy._id,
                name: deliveryBoy.name,
                phone: deliveryBoy.phone,
                email: deliveryBoy.email,
                address: deliveryBoy.address,
                city: deliveryBoy.city,
                vehicleType: deliveryBoy.vehicleType,
                vehicleNumber: deliveryBoy.vehicleNumber,
                profileImage: deliveryBoy.profileImage || "",
                isOnline: deliveryBoy.isOnline,
                isApproved: deliveryBoy.isApproved
            }
        });

    } catch (error) {
        console.error(
            "DELIVERY BOY PROFILE ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load delivery boy profile."
        });
    }
}



async function updateProfileImage(req, res) {
    try {
        const { image } = req.body;

        if (
            typeof image !== "string" ||
            !/^data:image\/jpeg;base64,/.test(image)
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid profile photo is required."
            });
        }

        // Compressed image ki maximum length
        if (image.length > 250000) {
            return res.status(413).json({
                success: false,
                message: "Photo is too large. Please select another photo."
            });
        }

        req.deliveryBoy.profileImage = image;

        await req.deliveryBoy.save();

        return res.json({
            success: true,
            message: "Profile photo saved successfully.",
            profileImage: req.deliveryBoy.profileImage
        });
    } catch (error) {
        console.error("Update profile image error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to save profile photo."
        });
    }
}


async function updateOnlineStatus(req, res) {
    try {
        const { isOnline } = req.body;

        if (typeof isOnline !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "isOnline must be true or false."
            });
        }

        req.deliveryBoy.isOnline = isOnline;

        await req.deliveryBoy.save();

        res.json({
            success: true,
            message: isOnline
                ? "Delivery Boy is now online."
                : "Delivery Boy is now offline.",
            isOnline: req.deliveryBoy.isOnline
        });

    } catch (error) {
        console.error(
            "UPDATE ONLINE STATUS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to update online status."
        });
    }
}

const Order = require("../models/Order");
const DeliveryBoy = require("../models/DeliveryBoy");

async function getMyAssignedOrders(req, res) {
    try {
        const deliveryBoyId = req.deliveryBoy._id;

       
const orders = await Order.find({
    deliveryBoyId: deliveryBoyId,
    orderStatus: {
        $in: [
            "ASSIGNED",
            "PICKED_UP",
            "OUT_FOR_DELIVERY",
            "DELIVERED"
        ]
    }
})
.populate("restaurantId", "name phone address city")
.populate("customerId", "phone deliveryAddress")
.sort({ createdAt: -1 });


        res.json({
            success: true,
            count: orders.length,
            orders
        });

    } catch (error) {
        console.error(
            "GET ASSIGNED ORDERS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to get assigned orders."
        });
    }
}

// Update Delivery Boy Order Status
async function updateMyOrderStatus(req, res) {
    try {
        const { orderId } = req.params;
        const { orderStatus } = req.body;

        const allowedStatuses = [
            "PICKED_UP",
            "OUT_FOR_DELIVERY",
            "DELIVERED"
        ];

        if (!allowedStatuses.includes(orderStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order status."
            });
        }

        const order = await Order.findOne({
            _id: orderId,
            deliveryBoyId: req.deliveryBoy._id
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found or not assigned to you."
            });
        }

        // Check correct status sequence
        if (
            orderStatus === "PICKED_UP" &&
            order.orderStatus !== "ASSIGNED"
        ) {
            return res.status(400).json({
                success: false,
                message: "Order must be ASSIGNED before pickup."
            });
        }

        if (
            orderStatus === "OUT_FOR_DELIVERY" &&
            order.orderStatus !== "PICKED_UP"
        ) {
            return res.status(400).json({
                success: false,
                message: "Order must be PICKED_UP first."
            });
        }

        if (
            orderStatus === "DELIVERED" &&
            order.orderStatus !== "OUT_FOR_DELIVERY"
        ) {
            return res.status(400).json({
                success: false,
                message: "Order must be OUT_FOR_DELIVERY first."
            });
        }

        
order.orderStatus = orderStatus;

// Order deliver hone par date aur time save karein
if (orderStatus === "DELIVERED") {
    order.deliveredAt = new Date();
}

await order.save();

        res.json({
            success: true,
            message: "Order status updated successfully.",
            order
        });

    } catch (error) {
        console.error(
            "DELIVERY BOY ORDER STATUS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to update order status."
        });
    }
}

const getApprovedDeliveryBoys = async (req, res) => {
    try {

       const deliveryBoys = await DeliveryBoy.find({
         isApproved: true,
         isBanned: false
        })
        .select(
            "name phone vehicleType vehicleNumber isOnline"
        )
        .sort({
            isOnline: -1,
            name: 1
        });

        res.json({
            success: true,
            count: deliveryBoys.length,
            deliveryBoys
        });

    } catch (error) {

        console.error(
            "GET APPROVED DELIVERY BOYS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to get delivery boys",
            error: error.message
        });
    }
};



module.exports = {
    register,
    login,
    getProfile,
    updateProfileImage,
    updateOnlineStatus,
    getMyAssignedOrders,
    updateMyOrderStatus,
    getApprovedDeliveryBoys
};
