require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");


// ===============================
// FOOD DELIVERY ROUTES
// ===============================

const authRoutes = require("./routes/authRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const restaurantDashboardRoutes = require("./routes/restaurantDashboardRoutes");
const restaurantProductRoutes = require("./routes/restaurantProductRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const customerAddressRoutes = require("./routes/customerAddressRoutes");
const deliveryBoyRoutes = require("./routes/deliveryBoyRoutes");
const adminRestaurantRoutes = require("./routes/adminRestaurantRoutes");
const adminDeliveryBoyRoutes = require("./routes/adminDeliveryBoyRoutes");
const adminAuthRoutes = require("./routes/adminAuthRoutes");


const app = express();


// ===============================
// BASIC MIDDLEWARE
// ===============================

app.use(cors());

app.use(
    express.json({
        limit: "10mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
    })
);


// ===============================
// STATIC FILES
// ===============================

app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "food-index.html"));
});

// ===============================
// FOOD DELIVERY API ROUTES
// ===============================

app.use("/api/auth", authRoutes);

app.use("/api/restaurants", restaurantRoutes);

app.use("/api/restaurant", restaurantDashboardRoutes);

app.use("/api/restaurant", restaurantProductRoutes);

app.use("/api/products", productRoutes);

app.use("/api/cart", cartRoutes);

app.use("/api/orders", orderRoutes);

app.use("/api/customer/address", customerAddressRoutes);

app.use("/api/delivery-boys", deliveryBoyRoutes);

app.use("/api/admin/restaurants", adminRestaurantRoutes);

app.use("/api/admin/delivery-boys", adminDeliveryBoyRoutes);

app.use("/api/admin", adminAuthRoutes);




// ===============================
// BASIC HEALTH CHECK
// ===============================

app.get("/api/health", (req, res) => {

    res.json({
        success: true,
        message: "Food Delivery API is running"
    });

});


// ===============================
// MONGODB CONNECTION
// ===============================

const PORT = process.env.PORT || 5000;

const MONGODB_URI =
    process.env.MONGODB_URI;

    

if (!MONGODB_URI) {

    console.error(
        "❌ MONGODB_URI is missing in .env"
    );

    process.exit(1);
}


mongoose
    .connect(MONGODB_URI)
    .then(() => {

        console.log(
            "✅ Food Delivery MongoDB Connected"
        );

        app.listen(PORT, () => {

            console.log(
                `🚀 Food Delivery Server running on port ${PORT}`
            );

        });

    })
    .catch((error) => {

        console.error(
            "❌ MongoDB Connection Error:",
            error.message
        );

        process.exit(1);

    });