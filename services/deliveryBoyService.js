const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const DeliveryBoy = require("../models/DeliveryBoy");

function formatDeliveryBoyPhone(phone) {
    if (!phone) return "";

    let value = String(phone).trim();

    if (value.startsWith("+91")) {
        value = value.substring(3);
    }

    if (value.startsWith("91") && value.length === 12) {
        value = value.substring(2);
    }

    return value;
}

async function registerDeliveryBoy(data) {
    const {
        name,
        phone,
        password,
        email,
        address,
        city,
        vehicleType,
        vehicleNumber
    } = data;

    const formattedPhone =
        formatDeliveryBoyPhone(phone);

    if (!name || !formattedPhone || !password) {
        throw new Error(
            "Name, phone and password are required."
        );
    }

    const existing =
        await DeliveryBoy.findOne({
            phone: formattedPhone
        });

    if (existing) {
        throw new Error(
            "Delivery Boy with this phone already exists."
        );
    }

    const hashedPassword =
        await bcrypt.hash(password, 10);

    const deliveryBoy =
        await DeliveryBoy.create({
            name: name.trim(),
            phone: formattedPhone,
            password: hashedPassword,
            email: email || "",
            address: address || "",
            city: city || "",
            vehicleType: vehicleType || "",
            vehicleNumber: vehicleNumber || "",
            isOnline: false,
            isApproved: false,
            isBanned: false
        });

    return {
        id: deliveryBoy._id,
        name: deliveryBoy.name,
        phone: deliveryBoy.phone,
        isApproved: deliveryBoy.isApproved
    };
}

async function loginDeliveryBoy(phone, password) {
    const formattedPhone =
        formatDeliveryBoyPhone(phone);

    const deliveryBoy =
        await DeliveryBoy.findOne({
            phone: formattedPhone
        });

    if (!deliveryBoy) {
        throw new Error(
            "Invalid phone number or password."
        );
    }

    const passwordMatch =
        await bcrypt.compare(
            password,
            deliveryBoy.password
        );

    if (!passwordMatch) {
        throw new Error(
            "Invalid phone number or password."
        );
    }

    if (deliveryBoy.isBanned) {
        throw new Error(
            "Delivery Boy account is banned."
        );
    }

    if (!deliveryBoy.isApproved) {
        throw new Error(
            "Delivery Boy account is not approved yet."
        );
    }

    const token = jwt.sign(
        {
            id: deliveryBoy._id,
            role: "deliveryBoy"
        },
        process.env.ORS_SECRET_KEY ||
            "ORS_SECRET_KEY_2026",
        {
            expiresIn: "7d"
        }
    );

    return {
        token,
        deliveryBoy: {
            id: deliveryBoy._id,
            name: deliveryBoy.name,
            phone: deliveryBoy.phone,
            email: deliveryBoy.email,
            city: deliveryBoy.city,
            vehicleType: deliveryBoy.vehicleType,
            vehicleNumber: deliveryBoy.vehicleNumber,
            isOnline: deliveryBoy.isOnline,
            isApproved: deliveryBoy.isApproved
        }
    };
}

module.exports = {
    registerDeliveryBoy,
    loginDeliveryBoy
};