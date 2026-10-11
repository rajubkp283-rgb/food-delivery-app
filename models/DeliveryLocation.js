const mongoose = require("mongoose");

const DeliveryLocationSchema = new mongoose.Schema(
    {
        deliveryBoyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DeliveryBoy",
            required: true,
            unique: true
        },

        latitude: {
            type: Number,
            required: true
        },

        longitude: {
            type: Number,
            required: true
        },

        accuracy: {
            type: Number,
            default: null
        },

        updatedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "DeliveryLocation",
    DeliveryLocationSchema
);