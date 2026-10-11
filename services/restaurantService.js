const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Restaurant = require("../models/Restaurant");

const JWT_SECRET = process.env.JWT_SECRET;

function formatRestaurantPhone(phone) {
    let clean = String(phone || "").replace(/[\s+]/g, "");

    if (clean.startsWith("2510")) {
        clean = "0" + clean.slice(4);
    } else if (clean.startsWith("251")) {
        clean = "0" + clean.slice(3);
    }

    return clean;
}


// ===============================
// RESTAURANT REGISTRATION
// ===============================

async function registerRestaurant(data) {

    const {
    name,
    ownerName,
    phone,
    password,
    email,
    address,
    city,
    category,
    latitude,
    longitude
    } = data;

    const cleanPhone = formatRestaurantPhone(phone);

    const existingRestaurant = await Restaurant.findOne({
        phone: cleanPhone
    });

    if (existingRestaurant) {
        throw new Error(
            "This restaurant phone number is already registered."
        );
    }

    const hashedPassword = await bcrypt.hash(
        password,
        10
    );

    const restaurant = new Restaurant({
        name: name.trim(),
        ownerName: ownerName.trim(),
        phone: cleanPhone,
        password: hashedPassword,
        email: email ? email.trim() : "",
        address: address.trim(),
        city: city ? city.trim() : "",
        category: category
        ? category.trim()
        : "Restaurant",

        latitude:
            Number(latitude),
        
        longitude:
            Number(longitude),
        
        // New restaurants require admin approval.
        isApproved: false,
        isBanned: false
            });

    await restaurant.save();

    return restaurant;
}


// ===============================
// RESTAURANT LOGIN
// ===============================

async function loginRestaurant(phone, password) {

    const cleanPhone = formatRestaurantPhone(phone);

    const restaurant = await Restaurant.findOne({
        phone: cleanPhone
    });

    if (!restaurant) {
        throw new Error(
            "Restaurant account not found."
        );
    }

    if (restaurant.isBanned) {
        throw new Error(
            "Restaurant account has been suspended."
        );
    }

    if (!restaurant.isApproved) {
        throw new Error(
            "Restaurant account is waiting for admin approval."
        );
    }

    const validPassword = await bcrypt.compare(
        password,
        restaurant.password
    );

    if (!validPassword) {
        throw new Error(
            "Incorrect password."
        );
    }

    const token = jwt.sign(
        {
            id: restaurant._id,
            role: "restaurant"
        },
        JWT_SECRET
    );

   return {
    success: true,
    message: "Restaurant login successful",
    token,
    role: "restaurant",
    restaurantId: restaurant._id
};
}


module.exports = {
    registerRestaurant,
    loginRestaurant,
    formatRestaurantPhone
};