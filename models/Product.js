const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    category: {
      type: String,
      default: "",
      trim: true,
    },

    subcategory: {
      type: String,
      default: "",
      trim: true,
    },
    
    brand: {
      type: String,
      default: "",
      trim: true,
    },

    image: {
      type: String,
      default: "",
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    isVeg: {
      type: Boolean,
      default: true,
    },

    preparationTime: {
      type: Number,
      default: 20,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

ProductSchema.index({ restaurantId: 1 });
ProductSchema.index({ restaurantId: 1, category: 1 });

module.exports = mongoose.model("Product", ProductSchema);