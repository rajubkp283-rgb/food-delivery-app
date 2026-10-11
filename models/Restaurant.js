const mongoose = require("mongoose");

const RestaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  ownerName: {
    type: String,
    required: true,
    trim: true,
  },

  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  password: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    default: "",
    trim: true,
  },

  address: {
    type: String,
    required: true,
    trim: true,
  },

  city: {
    type: String,
    default: "",
    trim: true,
  },

  category: {
    type: String,
    default: "Restaurant",
    trim: true,
  },

  description: {
    type: String,
    default: "",
  },

  

  image: {
    type: String,
    default: "",
  },

  ownerImage: {

    type: String,

    default: "",

},

  rating: {
    type: Number,
    default: 4.0,
    min: 0,
    max: 5,
  },

  deliveryTime: {
    type: Number,
    default: 30,
    min: 1,
  },

  deliveryFee: {
    type: Number,
    default: 30,
    min: 0,
  },

  latitude: {
    type: Number,
    default: null,
  },

  longitude: {
    type: Number,
    default: null,
  },

  isOpen: {
    type: Boolean,
    default: true,
  },

  isApproved: {
    type: Boolean,
    default: false,
  },

  isBanned: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Restaurant", RestaurantSchema);
