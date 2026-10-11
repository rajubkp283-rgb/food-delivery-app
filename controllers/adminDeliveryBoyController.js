const DeliveryBoy = require("../models/DeliveryBoy");


// Get all Delivery Boys
async function getDeliveryBoys(req, res) {
    try {
        const deliveryBoys = await DeliveryBoy.find()
            .select("-password")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            deliveryBoys
        });

    } catch (error) {
        console.error(
            "GET DELIVERY BOYS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load delivery boys."
        });
    }
}


// Approve Delivery Boy
async function approveDeliveryBoy(req, res) {
    try {
        const { id } = req.params;

        const deliveryBoy =
            await DeliveryBoy.findById(id);

        if (!deliveryBoy) {
            return res.status(404).json({
                success: false,
                message: "Delivery Boy not found."
            });
        }

        deliveryBoy.isApproved = true;
        deliveryBoy.isBanned = false;

        await deliveryBoy.save();

        res.json({
            success: true,
            message:
                "Delivery Boy approved successfully."
        });

    } catch (error) {
        console.error(
            "APPROVE DELIVERY BOY ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to approve delivery boy."
        });
    }
}


// Ban Delivery Boy
async function banDeliveryBoy(req, res) {
    try {
        const { id } = req.params;

        const deliveryBoy =
            await DeliveryBoy.findById(id);

        if (!deliveryBoy) {
            return res.status(404).json({
                success: false,
                message: "Delivery Boy not found."
            });
        }

        deliveryBoy.isBanned = true;
        deliveryBoy.isOnline = false;

        await deliveryBoy.save();

        res.json({
            success: true,
            message:
                "Delivery Boy banned successfully."
        });

    } catch (error) {
        console.error(
            "BAN DELIVERY BOY ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to ban delivery boy."
        });
    }
}


// Unban Delivery Boy
async function unbanDeliveryBoy(req, res) {
    try {
        const { id } = req.params;

        const deliveryBoy =
            await DeliveryBoy.findById(id);

        if (!deliveryBoy) {
            return res.status(404).json({
                success: false,
                message: "Delivery Boy not found."
            });
        }

        deliveryBoy.isBanned = false;

        await deliveryBoy.save();

        res.json({
            success: true,
            message:
                "Delivery Boy unbanned successfully."
        });

    } catch (error) {
        console.error(
            "UNBAN DELIVERY BOY ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to unban delivery boy."
        });
    }
}


module.exports = {
    getDeliveryBoys,
    approveDeliveryBoy,
    banDeliveryBoy,
    unbanDeliveryBoy
};