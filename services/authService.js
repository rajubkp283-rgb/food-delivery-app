const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const firebaseApp = require("../firebaseAdmin");
const { getAuth } = require("firebase-admin/auth");



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
    name,
    phone,
    email,
    password,
    confirmPassword,
    promoCode
}) {
    phone = formatPhoneNumber(phone.trim());
    
email = email ? email.trim().toLowerCase() : undefined;

if (email) {
    const existingEmail = await User.findOne({ email });

    if (existingEmail) {
        throw new Error("This email address is already registered!");
    }
}

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
    name,
    phone,
    email,
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


async function loginUserByEmail(email, password) {
    email = email.trim().toLowerCase();
    password = password.trim();

    const user = await User.findOne({ email });

    if (!user) {
        throw new Error(
            "Unregistered email address or incorrect password!"
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



async function loginUserWithGoogle(idToken) {
    if (!idToken) {
        throw new Error("Google ID token is required.");
    }

    const decodedToken =
        await getAuth(firebaseApp).verifyIdToken(idToken);

    const email = decodedToken.email
        ? decodedToken.email.trim().toLowerCase()
        : "";

    if (!email || decodedToken.email_verified !== true) {
        throw new Error(
            "Please use a verified Google email address."
        );
    }

    // Only allow users who already exist in the database.
    const user = await User.findOne({ email });

    if (!user) {
        const error = new Error("Please register first.");
        error.code = "USER_NOT_REGISTERED";
        throw error;
    }

    if (user.isBanned) {
        throw new Error(
            "Your account has been suspended! Please contact support."
        );
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


async function registerUserWithGoogle(idToken) {
    if (!idToken) {
        throw new Error("Google ID token is required.");
    }

    const decodedToken =
        await getAuth(firebaseApp).verifyIdToken(idToken);

    const email = decodedToken.email
        ? decodedToken.email.trim().toLowerCase()
        : "";

    if (!email || decodedToken.email_verified !== true) {
        throw new Error(
            "Please use a verified Google email address."
        );
    }

    // Do not create duplicate accounts.
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        const error = new Error(
            "This email is already registered. Please log in."
        );
        error.code = "USER_ALREADY_REGISTERED";
        throw error;
    }

    const uniquePromo = Math.floor(
        100000 + Math.random() * 900000
    ).toString();

    const newUser = new User({
        name: decodedToken.name || "",
        email,
        phone: undefined,
        password: undefined,
        promoCode: uniquePromo,
        referredBy: null,
        balance: 0
    });

    await newUser.save();

    // Registration only: do not issue a login token here.
    return {
        message: "Registration successful. Please log in."
    };
}



async function loginUserWithFacebook(idToken) {
    if (!idToken) {
        throw new Error("Facebook ID token is required.");
    }

    // Verify Firebase ID token on the server.
    const decodedToken =
        await getAuth(firebaseApp).verifyIdToken(idToken);

    // Accept only tokens authenticated through Facebook.
    if (
        decodedToken.firebase?.sign_in_provider !== "facebook.com"
    ) {
        throw new Error("Please log in using Facebook.");
    }

    // Firebase UID is the stable user identifier for this project.
    const facebookUid = decodedToken.uid;

    if (!facebookUid) {
        throw new Error("Facebook user ID could not be verified.");
    }

    // Find the account by UID, not email.
    const user = await User.findOne({ facebookUid });

    if (!user) {
        const error = new Error(
            "Facebook account is not registered. Please register first."
        );
        error.code = "USER_NOT_REGISTERED";
        throw error;
    }

    if (user.isBanned) {
        throw new Error(
            "Your account has been suspended! Please contact support."
        );
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


async function registerUserWithFacebook(idToken) {
    if (!idToken) {
        throw new Error("Facebook ID token is required.");
    }

    // Verify Firebase ID token on the server.
    const decodedToken =
        await getAuth(firebaseApp).verifyIdToken(idToken);

    // Accept only tokens authenticated through Facebook.
    if (
        decodedToken.firebase?.sign_in_provider !== "facebook.com"
    ) {
        throw new Error("Please register using Facebook.");
    }

    const facebookUid = decodedToken.uid;

    if (!facebookUid) {
        throw new Error("Facebook user ID could not be verified.");
    }

    // Do not create a second account for the same Facebook UID.
    const existingFacebookUser = await User.findOne({
        facebookUid
    });

    if (existingFacebookUser) {
        const error = new Error(
            "This Facebook account is already registered. Please log in."
        );
        error.code = "USER_ALREADY_REGISTERED";
        throw error;
    }

    // Email is optional. Never link an existing account merely
    // because its email matches the Facebook email.
    const email = decodedToken.email
        ? decodedToken.email.trim().toLowerCase()
        : undefined;

    if (email) {
        const existingEmailUser = await User.findOne({ email });

        if (existingEmailUser) {
            const error = new Error(
                "This email already belongs to an account. Log in to that account before linking Facebook."
            );
            error.code = "EMAIL_ALREADY_REGISTERED";
            throw error;
        }
    }

    // Generate a promo code.
    const uniquePromo = Math.floor(
        100000 + Math.random() * 900000
    ).toString();

    const newUser = new User({
        name: decodedToken.name || "",
        email,
        facebookUid,
        phone: undefined,
        password: undefined,
        promoCode: uniquePromo,
        referredBy: null,
        balance: 0
    });

    await newUser.save();

    // Return a token because the current frontend expects one
    // from the Facebook registration endpoint.
    const token = jwt.sign(
        {
            id: newUser._id,
            isAdmin: false
        },
        JWT_SECRET
    );

    return {
        token,
        isAdmin: false,
        message: "Facebook registration successful."
    };
}




module.exports = {
    registerUser,
    loginUser,
    loginUserByEmail,
    loginUserWithGoogle,
    registerUserWithGoogle,
    loginUserWithFacebook,
    registerUserWithFacebook,
    formatPhoneNumber
};
