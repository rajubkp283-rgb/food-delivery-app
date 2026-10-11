const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET;

function formatPhoneNumber(phone) {
    let clean = phone.replace(/[\s+]/g, "");

    if (clean.startsWith("2510")) {
        clean = "0" + clean.slice(4);
    } else if (clean.startsWith("251")) {
        clean = "0" + clean.slice(3);
    }

    return clean;
}

async function registerUser({
    phone,
    password,
    confirmPassword,
    promoCode
}) {
    phone = formatPhoneNumber(phone.trim());
    password = password.trim();
    confirmPassword = confirmPassword.trim();

    if (password !== confirmPassword) {
        throw new Error("The two passwords do not match!");
    }

    const existingUser = await User.findOne({ phone });

    if (existingUser) {
        throw new Error("This phone number is already registered!");
    }

    const uniquePromo = Math.floor(
        100000 + Math.random() * 900000
    ).toString();

    let referredByUser = null;

    if (promoCode) {
        referredByUser = await User.findOne({
            promoCode: promoCode.trim()
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
        phone,
        password: hashedPassword,
        promoCode: uniquePromo,
        referredBy: referredByUser
            ? referredByUser.phone
            : null,
        balance: 0
    });

    await newUser.save();

    if (referredByUser) {
        await User.updateOne(
            { phone: referredByUser.phone },
            {
                $inc: {
                    referralsCount: 1
                },

                $push: {
                    referralBonuses: {
                        referredUserPhone: newUser.phone,
                        amount: 100,
                        unlocked: false,
                        createdAt: new Date()
                    }
                }
            }
        );

        // ₹50 welcome bonus
        newUser.balance += 50;
        await newUser.save();
    }

    return newUser;
}

async function loginUser(phone, password) {
    phone = formatPhoneNumber(phone.trim());
    password = password.trim();

    const user = await User.findOne({ phone });

    if (!user) {
        throw new Error(
            "Unregistered phone number or incorrect password!"
        );
    }

    if (user.isBanned) {
        throw new Error(
            "Your account has been suspended! Please contact support."
        );
    }

    const validPass = await bcrypt.compare(
        password,
        user.password
    );

    if (!validPass) {
        throw new Error("Incorrect password!");
    }

    const token = jwt.sign(
        {
            id: user._id,
            isAdmin: false
        },
        JWT_SECRET
    );

    return {
        token,
        isAdmin: false
    };
}

module.exports = {
    registerUser,
    loginUser,
    formatPhoneNumber
};