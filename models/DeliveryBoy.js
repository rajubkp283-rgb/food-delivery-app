const mongoose = require("mongoose");

const DeliveryBoySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        phone: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        },

        email: {
            type: String,
            default: "",
            trim: true
        },

        address: {
            type: String,
            default: "",
            trim: true
        },

        city: {
            type: String,
            default: "",
            trim: true
        },

        vehicleType: {
            type: String,
            default: ""
        },

        vehicleNumber: {
            type: String,
            default: ""
        },

        profileImage: {
    type: String,
    default: ""
},

        isOnline: {
            type: Boolean,
            default: false
        },

        isApproved: {
            type: Boolean,
            default: false
        },

        isBanned: {
            type: Boolean,
            default: false
        },

        currentOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null
        },

        createdAt: {
            type: Date,
            default: Date.now
        }
    }
);

module.exports = mongoose.model(
    "DeliveryBoy",
    DeliveryBoySchema
);