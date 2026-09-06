const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const cors = require("cors");

require("dns").setServers(["8.8.8.8", "1.1.1.1"]);
const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(cors());

// የዳታቤዝ ግንኙነት መስመር (MongoDB Atlas Connection)
const MONGODB_URI =
  "mongodb+srv://rajubkp283_db_user:RajuKr12345@cluster0.hirgpz2.mongodb.net/ors_practice?appName=Cluster0";

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("ORS Database Cluster Connected Successfully"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// --- SCHEMAS ---
const UserSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  promoCode: { type: String, unique: true },
  referredBy: { type: String, default: null },
  balance: { type: Number, default: 0 }, // Every new user receives a 300 Birr bonus
  isBanned: { type: Boolean, default: false },
 upiAccount: { type: String, default: '' },
upiName: { type: String, default: '' },
upiMobile: { type: String, default: undefined },
bankAccount: { type: String, default: '' },
  bankIFSC: { type: String, default: '' },
  bankName: { type: String, default: '' },
  lastCheckIn: { type: String, default: "" },
  products: [
    {
      vipLevel: Number,
      purchasePrice: Number,
      dailyIncome: Number,
      purchasedAt: { type: Date, default: Date.now },
      lastPayoutAt: { type: Date, default: Date.now }, // Controls income payments every 24 hours
    },
  ],
  referralsCount: { type: Number, default: 0 },
  validReferrals: { type: Number, default: 0 }, // Number of referred users who made a deposit
});

UserSchema.index(
    { bankAccount: 1 },
    {
        unique: true,
        sparse: true
    }
);

const TransactionSchema = new mongoose.Schema({
    phone: String,

   type: {
    type: String,
    enum: [
        'deposit',
        'withdraw',
        'investment',
        'bonus',
        'checkin',
        'daily_profit'
    ]
},

    amount: Number,

    fee: {
        type: Number,
        default: 0
    },

    netAmount: Number,

    // Withdrawal payment method
    paymentMethod: {
        type: String,
        enum: ['', 'UPI', 'BANK'],
        default: ''
    },

    // UPI details
    upiAccount: {
        type: String,
        default: ''
    },

    upiName: {
        type: String,
        default: ''
    },

    // Bank details
    bankName: {
        type: String,
        default: ''
    },

    bankAccount: {
        type: String,
        default: ''
    },

    bankIFSC: {
        type: String,
        default: ''
    },

    status: {
        type: String,
        enum: ['pending', 'success'],
        default: 'pending'
    },

   txId: {
    type: String,
    default: ''
},

productName: {
    type: String,
    default: ''
},

// Deposit payment screenshot
paymentScreenshot: {
    type: String,
    default: ''
},

// Deposit payment note
paymentNote: {
    type: String,
    default: ''
},

createdAt: {
    type: Date,
    default: Date.now
}
});

const AdminPromoSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  redeemedUsers: [String],
});

const SystemConfigSchema = new mongoose.Schema({
  supportLink: { type: String, default: "https://t.me/your_support" },
  channelLink: { type: String, default: "https://t.me/your_channel" },
  usedTxIds: [String],
});

const User = mongoose.model("User", UserSchema);
const Transaction = mongoose.model("Transaction", TransactionSchema);
const AdminPromo = mongoose.model("AdminPromo", AdminPromoSchema);
const SystemConfig = mongoose.model("SystemConfig", SystemConfigSchema);

async function initConfig() {
  const config = await SystemConfig.findOne();
  if (!config) {
    await SystemConfig.create({});
  }
}

initConfig();

// Helper function for formatting password and phone number
function formatPhoneNumber(phone) {
  let clean = phone.replace(/[\s+]/g, ""); // Removes spaces and the + symbol

  if (clean.startsWith("2510")) {
    clean = "0" + clean.slice(4);
  } else if (clean.startsWith("251")) {
    clean = "0" + clean.slice(3);
  }

  return clean; // Ensures the number always starts with '09...' or '07...'
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  jwt.verify(token, "ORS_SECRET_KEY_2026", async (err, decoded) => {
    if (err) return res.status(403).json({ message: "Forbidden" });

    if (decoded.id === "ADMIN") {
      req.isAdmin = true;
      req.user = null;
      return next();
    }

    const user = await User.findById(decoded.id);

    if (!user || user.isBanned) {
      return res.status(403).json({
        message: "Account suspended or not found",
      });
    }

    req.user = user;
    req.isAdmin = false;
    next();
  });
};

// Fix 1: Correctly serve all static files (HTML, CSS, JS) from the main directory
app.use(express.static(__dirname));

// --- AUTH ROUTES ---
app.post("/api/register", async (req, res) => {
  try {
    let { phone, password, confirmPassword, promoCode } = req.body;

    if (!phone || !password || !confirmPassword) {
      return res.status(400).json({
        message: "Please fill in all required information",
      });
    }

    phone = formatPhoneNumber(phone.trim());
    password = password.trim();
    confirmPassword = confirmPassword.trim();

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "The two passwords do not match!",
      });
    }

    const existingUser = await User.findOne({ phone });

    if (existingUser) {
      return res.status(400).json({
        message: "This phone number is already registered!",
      });
    }

    let uniquePromo = Math.floor(100000 + Math.random() * 900000).toString();

    let referredByUser = null;

    if (promoCode) {
      referredByUser = await User.findOne({
        promoCode: promoCode.trim(),
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      phone,
      password: hashedPassword,
      promoCode: uniquePromo,
      referredBy: referredByUser ? referredByUser.phone : null,
      balance: 0,
    });

    await newUser.save();

    console.log("USER SAVED:", newUser.phone);

    if (referredByUser) {
      await User.updateOne(
        { phone: referredByUser.phone },
        { $inc: { referralsCount: 1 } },
      );
    }

    res.status(201).json({
      message: "Registration Successful",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// --- LOGIN ROUTE ---
app.post("/api/login", async (req, res) => {
  try {
    let { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        message: "Please enter your phone number and password!",
      });
    }

    phone = formatPhoneNumber(phone.trim());
    password = password.trim();

    // ADMIN LOGIN
    if (phone === "6202875038" && password === "406976") {
      const token = jwt.sign(
        { id: "ADMIN", isAdmin: true },
        "ORS_SECRET_KEY_2026",
      );

      return res.json({
        token,
        isAdmin: true,
      });
    }

    // USER LOGIN
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(400).json({
        message: "Unregistered phone number or incorrect password!",
      });
    }

    if (user.isBanned) {
      return res.status(400).json({
        message: "Your account has been suspended! Please contact support.",
      });
    }

    const validPass = await bcrypt.compare(password, user.password);

    if (!validPass) {
      return res.status(400).json({
        message: "Incorrect password!",
      });
    }

    const token = jwt.sign(
      { id: user._id, isAdmin: false },
      "ORS_SECRET_KEY_2026",
    );

    res.json({
      token,
      isAdmin: false,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// ============================================================
// USER PROFILE
// ============================================================

app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "User profile not found",
      });
    }

    res.json(req.user);
  } catch (err) {
    console.error("Profile Error:", err);

    res.status(500).json({
      message: "Failed to load profile",
    });
  }
});

// ============================================================
// UPDATE BANK / TELEBIRR DETAILS
// ============================================================

app.post('/api/profile/update-bank', authenticateToken, async (req, res) => {
    try {
        const { bankAccount, bankIFSC, bankName } = req.body;

        if (!bankAccount || !bankIFSC || !bankName) {
            return res.status(400).json({
                message: 'Bank account number, IFSC code and account name are required.'
            });
        }

        const cleanBankAccount = bankAccount.trim();
        const cleanBankIFSC = bankIFSC.trim().toUpperCase();
        const cleanBankName = bankName.trim();

        // Bank account can only be saved once
        if (req.user.bankAccount) {
            return res.status(400).json({
                message: 'Your bank account is already saved and cannot be changed.'
            });
        }

        // Prevent the same bank account from being used by another user
        const existingBankAccount = await User.findOne({
            bankAccount: cleanBankAccount,
            _id: { $ne: req.user._id }
        });

        if (existingBankAccount) {
            return res.status(400).json({
                message: 'This bank account is already linked to another user.'
            });
        }

        req.user.bankAccount = cleanBankAccount;
        req.user.bankIFSC = cleanBankIFSC;
        req.user.bankName = cleanBankName;

        await req.user.save();

        res.json({
            message: 'Bank account information saved successfully!'
        });

    } catch (err) {
        console.error('Bank Account Update Error:', err);

        res.status(500).json({
            message: 'Failed to save bank account information.'
        });
    }
});

app.post('/api/profile/update-upi', authenticateToken, async (req, res) => {
    try {
        const { upiAccount, upiName } = req.body;

        if (!upiAccount || !upiName) {
            return res.status(400).json({
                message: 'UPI account and UPI holder name are required.'
            });
        }

        const cleanUPI = upiAccount.trim().toLowerCase();
        const cleanUPIName = upiName.trim();

        // UPI can only be saved once
        if (req.user.upiAccount) {
            return res.status(400).json({
                message: 'Your UPI account is already saved and cannot be changed.'
            });
        }

        // Extract the 10-digit mobile number before @
        const upiParts = cleanUPI.split('@');

        if (upiParts.length !== 2) {
            return res.status(400).json({
                message: 'Please enter a valid UPI ID.'
            });
        }

        const upiMobile = upiParts[0].replace(/\D/g, '');

        if (!/^\d{10}$/.test(upiMobile)) {
            return res.status(400).json({
                message: 'UPI ID must contain a valid 10-digit mobile number before @.'
            });
        }

        // Prevent the same 10-digit UPI mobile number
        // from being used by another user
        const existingUPIMobile = await User.findOne({
            upiMobile: upiMobile,
            _id: { $ne: req.user._id }
        });

        if (existingUPIMobile) {
            return res.status(400).json({
                message: 'This UPI mobile number is already linked to another user.'
            });
        }

        req.user.upiAccount = cleanUPI;
        req.user.upiMobile = upiMobile;
        req.user.upiName = cleanUPIName;

        await req.user.save();

        res.json({
            message: 'UPI account information saved successfully!'
        });

    } catch (err) {
        console.error('UPI Update Error:', err);

        res.status(500).json({
            message: 'Failed to save UPI account information.'
        });
    }
});

// ============================================================
// CHANGE PASSWORD
// ============================================================

app.post(
  "/api/profile/change-password",
  authenticateToken,
  async (req, res) => {
    try {
      const { newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({
          message: "Please enter a new password!",
        });
      }

      req.user.password = await bcrypt.hash(newPassword, 10);

      await req.user.save();

      res.json({
        message: "Your password has been changed successfully!",
      });
    } catch (err) {
      console.error("Password Change Error:", err);

      res.status(500).json({
        message: "Failed to change password",
      });
    }
  },
);

app.post("/api/checkin", authenticateToken, async (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  if (req.user.lastCheckIn === today) {
    return res.status(400).json({
      message:
        "You have already claimed today's daily gift! Please try again tomorrow.",
    });
  }

  const checkInBonus = 10;

  req.user.balance += checkInBonus;
  req.user.lastCheckIn = today;

  await req.user.save();

  await Transaction.create({
    phone: req.user.phone,
    type: "checkin",
    amount: checkInBonus,
    fee: 0,
    netAmount: checkInBonus,
    status: "success",
    txId: `CHECKIN-${Date.now()}`,
    productName: "Daily Check-In",
  });

  res.json({
    message: "You have received your daily 10 INR gift!",
    newBalance: req.user.balance,
  });
});

app.post("/api/promo-bonus", authenticateToken, async (req, res) => {
  const { code } = req.body;

  if (!code || code.trim() === "") {
    return res.status(400).json({
      message: "Please enter a valid promo code",
    });
  }

  const activePromo = await AdminPromo.findOne({
    code: code.trim().toUpperCase(),
  });

  if (!activePromo) {
    return res.status(400).json({
      message: "The promo code you entered was not found!",
    });
  }

  if (new Date() > activePromo.expiresAt) {
    return res.status(400).json({
      message: "This bonus code has expired!",
    });
  }

  if (activePromo.redeemedUsers.includes(req.user.phone)) {
    return res.status(400).json({
      message: "You have already used this bonus code!",
    });
  }

  const bonus = Math.floor(Math.random() * 10) + 1;

req.user.balance += bonus;

activePromo.redeemedUsers.push(req.user.phone);

await activePromo.save();
await req.user.save();

await Transaction.create({
  phone: req.user.phone,
  type: "bonus",
  amount: bonus,
  fee: 0,
  netAmount: bonus,
  status: "success",
  txId: `BONUS-${Date.now()}`,
  productName: `Promo Bonus - ${code.trim().toUpperCase()}`,
});

res.json({
  message: `Congratulations! You received a ${bonus} INR bonus gift.`,
  newBalance: req.user.balance,
});
});

// ============================================================
// VIP PRODUCT PURCHASE FROM WALLET
// ============================================================

const VIP_PRODUCTS = {
  1: {
    price: 100,
    dailyIncome: 5,
  },
  2: {
    price: 200,
    dailyIncome: 10,
  },
  3: {
    price: 400,
    dailyIncome: 20,
  },
  4: {
    price: 600,
    dailyIncome: 30,
  },
  5: {
    price: 1000,
    dailyIncome: 50,
  },
};

app.post("/api/buy-product", authenticateToken, async (req, res) => {
  try {
    const vipLevel = Number(req.body.vipLevel);

    const product = VIP_PRODUCTS[vipLevel];

    if (!product) {
      return res.status(400).json({
        message: "Invalid VIP product.",
      });
    }

    // Deduct the price from the wallet balance
    // and save the product in MongoDB.

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        balance: { $gte: product.price },
      },

      {
        $inc: {
          balance: -product.price,
        },

        $push: {
          products: {
            vipLevel: vipLevel,
            purchasePrice: product.price,
            dailyIncome: product.dailyIncome,
            purchasedAt: new Date(),
            lastPayoutAt: new Date(),
          },
        },
      },

      {
        new: true,
      },
    );

    // Wallet balance is insufficient
    if (!updatedUser) {
      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({
          message: "User account not found.",
        });
      }

      return res.status(400).json({
        message: `Insufficient wallet balance. VIP ${vipLevel} requires ${product.price} INR. Your balance is ${user.balance} INR.`,
      });
    }

    // Save the investment transaction
await Transaction.create({
  phone: updatedUser.phone,

  type: "investment",

  amount: product.price,

  fee: 0,

  netAmount: product.price,

  status: "success",

  txId: `VIP${vipLevel}-${Date.now()}`,

  productName: `VIP ${vipLevel} Product`,
});

    console.log(
      `VIP ${vipLevel} PURCHASED:`,
      updatedUser.phone,
      `Price: ${product.price}`,
      `New Balance: ${updatedUser.balance}`,
    );

    res.json({
      message: `VIP ${vipLevel} purchased successfully. ${product.price} INR deducted from wallet.`,

      vipLevel: vipLevel,

      price: product.price,

      dailyIncome: product.dailyIncome,

      balance: updatedUser.balance,

      products: updatedUser.products,
    });
  } catch (err) {
    console.error("VIP Purchase Error:", err);

    res.status(500).json({
      message: "VIP purchase failed. Please try again.",
    });
  }
});

// ============================================================
// MANUAL DEPOSIT REQUEST
// Customer submits payment details.
// Balance is NOT added here.
// Admin must approve it.
// ============================================================

app.post("/api/deposit", authenticateToken, async (req, res) => {
  try {
    const { amount, txId, paymentNote, paymentScreenshot } = req.body;

    const parsedAmount = Number(amount);

    // Validate amount
    const allowedAmounts = [100, 200, 400, 600, 1000];

    if (!allowedAmounts.includes(parsedAmount)) {
      return res.status(400).json({
        message: "Invalid deposit amount.",
      });
    }

    // Transaction ID required
    if (!txId || !txId.trim()) {
      return res.status(400).json({
        message: "Please enter your UTR / Transaction ID.",
      });
    }

    const cleanTxId = txId.trim().toUpperCase();

    // Screenshot required
    if (!paymentScreenshot || !paymentScreenshot.startsWith("data:image/")) {
      return res.status(400).json({
        message: "Please upload your payment screenshot.",
      });
    }

    // Prevent duplicate transaction ID
    const existingTransaction = await Transaction.findOne({
      txId: cleanTxId,
    });

    if (existingTransaction) {
      return res.status(400).json({
        message: "This transaction ID has already been submitted.",
      });
    }

    // Save request as PENDING
    const depositRequest = await Transaction.create({
      phone: req.user.phone,

      type: "deposit",

      amount: parsedAmount,

      netAmount: parsedAmount,

      status: "pending",

      txId: cleanTxId,

      paymentScreenshot: paymentScreenshot,

      paymentNote: paymentNote ? paymentNote.trim() : "",
    });

    console.log(
      "NEW DEPOSIT REQUEST:",
      depositRequest._id,
      req.user.phone,
      parsedAmount,
      cleanTxId,
    );

    res.status(201).json({
      message:
        "Deposit request submitted successfully. Please wait for admin verification.",

      status: "pending",

      requestId: depositRequest._id,
    });
  } catch (err) {
    console.error("Deposit Request Error:", err);

    res.status(500).json({
      message: "Failed to submit deposit request.",
    });
  }
});

// ============================================================
// WITHDRAW REQUESTS
// ============================================================

app.post("/api/withdraw", authenticateToken, async (req, res) => {
  try {
    const {
      amount,
      paymentMethod,
      paymentDetails
    } = req.body;

    const withdrawAmount = parseFloat(amount);

    // Basic amount validation
    if (!Number.isFinite(withdrawAmount)) {
      return res.status(400).json({
        message: "Please enter a valid withdrawal amount."
      });
    }

    if (req.user.products.length === 0) {
      return res.status(400).json({
        message:
          "You must purchase at least one VIP product before submitting a withdrawal request."
      });
    }

    if (withdrawAmount < 5) {
      return res.status(400).json({
        message: "The minimum withdrawal amount is 5 INR."
      });
    }

    if (req.user.balance < withdrawAmount) {
      return res.status(400).json({
        message: "Insufficient balance in your account."
      });
    }

    // Only allow the two methods used by the frontend
    if (!["UPI", "BANK"].includes(paymentMethod)) {
      return res.status(400).json({
        message: "Please select UPI or Bank Account."
      });
    }

    // Validate selected payment details
    if (!paymentDetails || typeof paymentDetails !== "object") {
      return res.status(400).json({
        message: "Payment details are required."
      });
    }

    let transactionData = {
      phone: req.user.phone,
      type: "withdraw",
      amount: withdrawAmount,
      fee: 0,
      netAmount: withdrawAmount,
      paymentMethod: paymentMethod,
      status: "pending"
    };

    // UPI request
    if (paymentMethod === "UPI") {

      if (!req.user.upiAccount || !req.user.upiName) {
        return res.status(400).json({
          message: "Please connect your UPI account from your profile first."
        });
      }

      transactionData.upiAccount = req.user.upiAccount;
      transactionData.upiName = req.user.upiName;
    }

    // Bank request
    if (paymentMethod === "BANK") {

      if (
        !req.user.bankAccount ||
        !req.user.bankIFSC ||
        !req.user.bankName
      ) {
        return res.status(400).json({
          message: "Please add your complete bank account details first."
        });
      }

      transactionData.bankAccount = req.user.bankAccount;
      transactionData.bankIFSC = req.user.bankIFSC;
      transactionData.bankName = req.user.bankName;
    }

    // Deduct withdrawal amount from user's wallet balance
    req.user.balance -= withdrawAmount;

    await req.user.save();

    // Create withdrawal request.
    // No real payout/transfer is performed here.
    const withdrawalRequest = await Transaction.create(transactionData);

    console.log(
      "WITHDRAWAL REQUEST:",
      withdrawalRequest._id,
      req.user.phone,
      paymentMethod,
      withdrawAmount
    );

    res.status(201).json({
      message:
        "withdrawal request submitted successfully. It is pending for review.",
      status: "pending",
      requestId: withdrawalRequest._id,
      amount: withdrawAmount,
      paymentMethod: paymentMethod
    });

  } catch (err) {
    console.error("Withdrawal Request Error:", err);

    res.status(500).json({
      message: "Failed to submit withdrawal request."
    });
  }
});

// ============================================================
// TRANSACTION HISTORY
// ============================================================

app.get("/api/history", authenticateToken, async (req, res) => {
  try {
    // Admin does not have a user transaction history
    if (req.isAdmin) {
      return res.json([]);
    }

    // Normal user
    if (!req.user) {
      return res.status(401).json({
        message: "User not authenticated",
      });
    }

    const history = await Transaction.find({
      phone: req.user.phone,
    }).sort({
      createdAt: -1,
    });

    res.json(history);
  } catch (err) {
    console.error("History Error:", err);

    res.status(500).json({
      message: "Failed to load transaction history",
    });
  }
});

// ============================================================
// SYSTEM LINKS
// ============================================================

app.get("/api/system-links", async (req, res) => {
  const config = await SystemConfig.findOne();
  res.json(config);
});

// ============================================================
// ADMIN SYSTEM ENDPOINTS
// ============================================================

const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Denied",
    });
  }

  jwt.verify(token, "ORS_SECRET_KEY_2026", (err, decoded) => {
    if (err || !decoded.isAdmin) {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    next();
  });
};

// ============================================================
// USER - REFERRAL STATS
// ============================================================

app.get("/api/referral-stats", authenticateToken, async (req, res) => {
  try {
    if (req.isAdmin || !req.user) {
      return res.status(403).json({
        message: "User access only",
      });
    }

    const user = await User.findById(req.user._id).select(
      "referralsCount validReferrals",
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      referralsCount: Number(user.referralsCount || 0),
      validReferrals: Number(user.validReferrals || 0),
    });
  } catch (err) {
    console.error("Referral Stats Error:", err);

    res.status(500).json({
      message: "Failed to load referral statistics.",
    });
  }
});

// ============================================================
// ADMIN DASHBOARD
// ============================================================

app.get("/api/admin/dashboard", verifyAdmin, async (req, res) => {
  const totalUsers = await User.countDocuments();

  const totalDep = await Transaction.aggregate([
    {
      $match: {
        type: "deposit",
        status: "success",
      },
    },
    {
      $group: {
        _id: null,
        total: {
          $sum: "$amount",
        },
      },
    },
  ]);

  const totalWith = await Transaction.aggregate([
    {
      $match: {
        type: "withdraw",
        status: "success",
      },
    },
    {
      $group: {
        _id: null,
        total: {
          $sum: "$amount",
        },
      },
    },
  ]);

  const pendingWith = await Transaction.aggregate([
    {
      $match: {
        type: "withdraw",
        status: "pending",
      },
    },
    {
      $group: {
        _id: null,
        total: {
          $sum: "$netAmount",
        },
      },
    },
  ]);

  const pendingRequests = await Transaction.find({
    type: "withdraw",
    status: "pending",
  })
    .select('phone amount fee netAmount paymentMethod upiAccount upiName bankName bankAccount bankIFSC createdAt')
    .sort({
      createdAt: -1,
    });

  res.json({
    totalMembers: totalUsers,
    totalDeposit: totalDep[0]?.total || 0,
    totalWithdraw: totalWith[0]?.total || 0,
    pendingWithdraw: pendingWith[0]?.total || 0,
    pendingRequests,
  });
});

// ============================================================
// ADMIN - GET PENDING DEPOSITS
// ============================================================

app.get("/api/admin/pending-deposits", verifyAdmin, async (req, res) => {
  try {
    const deposits = await Transaction.find({
      type: "deposit",
      status: "pending",
    })
      .select(
        "phone amount netAmount txId paymentScreenshot paymentNote createdAt",
      )
      .sort({
        createdAt: -1,
      });

    res.json({
      deposits,
    });
  } catch (err) {
    console.error("Pending Deposits Error:", err);

    res.status(500).json({
      message: "Failed to load pending deposits.",
    });
  }
});

// ============================================================
// ADMIN - APPROVE DEPOSIT
// ============================================================

app.post("/api/admin/approve-deposit", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        message: "Deposit request ID is required.",
      });
    }

    // Find pending deposit
    const deposit = await Transaction.findOne({
      _id: id,
      type: "deposit",
      status: "pending",
    });

    if (!deposit) {
      return res.status(404).json({
        message: "Pending deposit request not found.",
      });
    }

    // Find user
    const user = await User.findOne({
      phone: deposit.phone,
    });

    if (!user) {
      return res.status(404).json({
        message: "User account not found.",
      });
    }

    // Add deposit amount to user's wallet
    const depositAmount = Number(deposit.amount);

    user.balance += depositAmount;
    await user.save();

    // ============================================================
    // REFERRAL BONUS
    // Level 1 = 20%
    // Level 2 = 2%
    // Level 3 = 1%
    // ============================================================

    if (user.referredBy) {
      // LEVEL 1 REFERRER
      const level1 = await User.findOne({
        phone: user.referredBy,
      });

      if (level1) {
        const level1Bonus = depositAmount * 0.2;

        level1.balance += level1Bonus;
        level1.validReferrals += 1;

        await level1.save();

        // LEVEL 2 REFERRER
        if (level1.referredBy) {
          const level2 = await User.findOne({
            phone: level1.referredBy,
          });

          if (level2) {
            const level2Bonus = depositAmount * 0.02;

            level2.balance += level2Bonus;

            await level2.save();

            // LEVEL 3 REFERRER
            if (level2.referredBy) {
              const level3 = await User.findOne({
                phone: level2.referredBy,
              });

              if (level3) {
                const level3Bonus = depositAmount * 0.01;

                level3.balance += level3Bonus;

                await level3.save();
              }
            }
          }
        }
      }
    }

    // Mark transaction successful
    deposit.status = "success";

    await deposit.save();

    console.log(
      "DEPOSIT APPROVED:",
      deposit.phone,
      deposit.amount,
      deposit.txId,
    );

    res.json({
      message: `Deposit approved. ${deposit.amount} INR added to user's wallet.`,

      balance: user.balance,
    });
  } catch (err) {
    console.error("Approve Deposit Error:", err);

    res.status(500).json({
      message: "Failed to approve deposit.",
    });
  }
});

// ============================================================
// ADMIN - GENERATE PROMO CODE
// ============================================================

app.post("/api/admin/generate-promo", verifyAdmin, async (req, res) => {
  try {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    let generatedCode = "";

    for (let i = 0; i < 6; i++) {
      generatedCode += letters.charAt(
        Math.floor(Math.random() * letters.length),
      );
    }

    const expires = new Date();

    expires.setHours(expires.getHours() + 24);

    const newPromo = new AdminPromo({
      code: generatedCode,
      expiresAt: expires,
      redeemedUsers: [],
    });

    await newPromo.save();

    res.json({
      message: "Bonus code generated successfully!",
      code: generatedCode,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error generating promo code",
    });
  }
});

// ============================================================
// ADMIN - SEARCH USER
// ============================================================

app.post("/api/admin/search-user", verifyAdmin, async (req, res) => {
  let { phone } = req.body;

  phone = formatPhoneNumber(phone.trim());

  const target = await User.findOne({
    phone,
  }).select("-password");

  if (!target) {
    return res.status(404).json({
      message: "The user phone number was not found in the system!",
    });
  }

  res.json(target);
});

// ============================================================
// ADMIN - USER ACTIONS
// ============================================================

app.post("/api/admin/action-user", verifyAdmin, async (req, res) => {
  let { phone, action, amount } = req.body;

  phone = formatPhoneNumber(phone.trim());

  const target = await User.findOne({
    phone,
  });

  if (!target) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  if (action === "ban") {
    target.isBanned = true;
  }

  if (action === "unban") {
    target.isBanned = false;
  }

  if (action === "addbalance") {
    target.balance += parseFloat(amount || 0);
  }

  await target.save();

  res.json({
    message: "The action was completed successfully!",
  });
});

// ============================================================
// ADMIN - APPROVE WITHDRAWAL
// ============================================================

app.post("/api/admin/approve-withdraw", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        message: "Withdrawal request ID is required."
      });
    }

    // Only approve a pending withdrawal request
    const withdrawal = await Transaction.findOne({
      _id: id,
      type: "withdraw",
      status: "pending"
    });

    if (!withdrawal) {
      return res.status(404).json({
        message: "Pending withdrawal request not found."
      });
    }

    // Approval status update only.
// No payout transfer is performed here.
    withdrawal.status = "success";

    await withdrawal.save();

    console.log(
      "WITHDRAWAL APPROVED:",
      withdrawal.phone,
      withdrawal.amount,
      withdrawal.paymentMethod
    );

    res.json({
      message: "Withdrawal request approved successfully.",
      status: "success",
      requestId: withdrawal._id
    });

  } catch (err) {

    console.error(
      "Withdrawal Approval Error:",
      err
    );

    res.status(500).json({
      message: "Failed to approve withdrawal request."
    });
  }
});

// ============================================================
// ADMIN - UPDATE SYSTEM LINKS
// ============================================================

app.post("/api/admin/update-links", verifyAdmin, async (req, res) => {
  const { supportLink, channelLink } = req.body;

  await SystemConfig.updateOne(
    {},
    {
      supportLink,
      channelLink,
    },
  );

  res.json({
    message: "Official Telegram links have been updated!",
  });
});



// ============================================================
// PASSIVE DYNAMIC VIP DAILY INCOME AUTOMATION
// ============================================================

setInterval(
  async () => {
    try {
      const users = await User.find({
        "products.0": {
          $exists: true,
        },
      });

      const now = new Date();

      for (let u of users) {
        let updated = false;

        for (const p of u.products) {
  const totalAgeDays =
    (now.getTime() - new Date(p.purchasedAt).getTime()) /
    1000 /
    60 /
    60 /
    24;

  if (totalAgeDays <= 150) {
    const hoursSinceLastPayout =
      (now.getTime() - new Date(p.lastPayoutAt).getTime()) /
      1000 /
      60 /
      60;

    if (hoursSinceLastPayout >= 24) {
      u.balance += p.dailyIncome;

      await Transaction.create({
        phone: u.phone,
        type: "daily_profit",
        amount: p.dailyIncome,
        fee: 0,
        netAmount: p.dailyIncome,
        status: "success",
        txId: `PROFIT-VIP${p.vipLevel}-${Date.now()}`,
        productName: `VIP ${p.vipLevel} Daily Profit`,
      });

      p.lastPayoutAt = now;
      updated = true;
    }
  }
}

        if (updated) {
          await u.save();
        }
      }
    } catch (err) {
      console.error("Error in Daily Income Scheduler:", err);
    }
  },
  1000 * 60 * 30,
);

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 10000;

app.listen(PORT, () =>
  console.log(`ORS Database cluster engine online on port ${PORT}`),
);
