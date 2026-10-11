const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    promoCode: {
        type: String,
        unique: true
    },

    referredBy: {
        type: String,
        default: null
    },

    balance: {
        type: Number,
        default: 0
    },

    isBanned: {
        type: Boolean,
        default: false
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
            default: ""
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

    upiAccount: {
        type: String,
        default: undefined
    },

    upiName: {
        type: String,
        default: ""
    },

    upiMobile: {
        type: String,
        default: undefined
    },

    bankAccount: {
        type: String,
        default: undefined
    },

    bankIFSC: {
        type: String,
        default: ""
    },

    bankName: {
        type: String,
        default: ""
    },

    lastCheckIn: {
        type: String,
        default: ""
    },

    checkInCount: {
        type: Number,
        default: 0
    },

    products: [{
        vipLevel: Number,
        purchasePrice: Number,
        dailyIncome: Number,

        purchasedAt: {
            type: Date,
            default: Date.now
        },

        lastPayoutAt: {
            type: Date,
            default: Date.now
        },

        totalCollected: {
            type: Number,
            default: 0
        }
    }],

    referralsCount: {
        type: Number,
        default: 0
    },

    validReferrals: {
        type: Number,
        default: 0
    },

    referralBonuses: [{
        referredUserPhone: {
            type: String,
            required: true
        },

        amount: {
            type: Number,
            default: 100
        },

        unlocked: {
            type: Boolean,
            default: false
        },

        createdAt: {
            type: Date,
            default: Date.now
        },

        unlockedAt: {
            type: Date,
            default: null
        }
    }]
});

UserSchema.index(
    { bankAccount: 1 },
    {
        unique: true,
        sparse: true
    }
);

module.exports = mongoose.model("User", UserSchema);