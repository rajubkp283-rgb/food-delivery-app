const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
    {
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true
        },

        deliveryBoyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DeliveryBoy",
            default: null
        },

        items: [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    required: true
                },

                name: {
                    type: String,
                    required: true
                },

                quantity: {
                    type: Number,
                    required: true,
                    min: 1
                },

                price: {
                    type: Number,
                    required: true,
                    min: 0
                },

                total: {
                    type: Number,
                    required: true,
                    min: 0
                }
            }
        ],

        subtotal: {
            type: Number,
            required: true,
            min: 0
        },

        deliveryFee: {
            type: Number,
            default: 0,
            min: 0
        },

        totalAmount: {
            type: Number,
            required: true,
            min: 0
        },

        deliveryAddress: {
            name: {
                type: String,
                default: ""
            },

            phone: {
                type: String,
                default: ""
            },

            address: {
                type: String,
                required: true
            },

            city: {
                type: String,
                default: ""
            },

            pincode: {
            type: String,
             default: ""
           },

            latitude: {
                type: Number,
                default: null
            },

            longitude: {
                type: Number,
                default: null
            }
        },

        paymentMethod: {
            type: String,
            enum: [
                "COD",
                "ONLINE",
                "WALLET"
            ],
            default: "COD"
        },

        paymentStatus: {
            type: String,
            enum: [
                "PENDING",
                "PAID",
                "FAILED",
                "REFUNDED"
            ],
            default: "PENDING"
        },

        orderStatus: {
            type: String,
            enum: [
                "PLACED",
                "CONFIRMED",
                "PREPARING",
                "READY",
                "ASSIGNED",
                "PICKED_UP",
                "OUT_FOR_DELIVERY",
                "DELIVERED",
                "CANCELLED"
            ],
            default: "PLACED"
        },

        
        deliveredAt: {
            type: Date,
            default: null
        },


        customerNote: {
            type: String,
            default: ""
        },

        createdAt: {
            type: Date,
            default: Date.now
        },

        updatedAt: {
            type: Date,
            default: Date.now
        }
    }
);


// Automatically update updatedAt
OrderSchema.pre(
    "save",
    function (next) {
        this.updatedAt = new Date();
        next();
    }
);


module.exports = mongoose.model(
    "Order",
    OrderSchema
);