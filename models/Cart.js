const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },

    // Har product ki apni shop
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: false
    },

    shopName: {
      type: String,
      default: ""
    },

    shopCategory: {
      type: String,
      default: ""
    },

    name: {
      type: String,
      required: true
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },

    image: {
      type: String,
      default: ""
    },

    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const CartSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    // Cart ka type: Groceries ya Restaurant
    cartType: {
      type: String,
      enum: ["Groceries", "Restaurant", null],
      default: null
    },

    // Purane code ki compatibility ke liye rakha hai
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      default: null
    },

    items: {
      type: [CartItemSchema],
      default: []
    },

    subtotal: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", CartSchema);