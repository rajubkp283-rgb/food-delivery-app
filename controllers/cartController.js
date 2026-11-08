
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Restaurant = require("../models/Restaurant");

// Shop category ko Cart type mein convert karein
const getCartType = (category) => {
  return String(category || "").trim().toLowerCase() === "groceries"
    ? "Groceries"
    : "Restaurant";
};

// Purane Cart Items mein shopId nahi hai to Product se shop details nikalein
const attachShopDetailsToLegacyItems = async (cart) => {
  const missingItems = cart.items.filter((item) => !item.shopId);

  if (missingItems.length === 0) {
    return { changed: false, unresolved: false };
  }

  const productIds = missingItems.map((item) => item.productId);

  const products = await Product.find({
    _id: { $in: productIds },
  }).select("_id restaurantId");

  const productMap = new Map(
    products.map((product) => [product._id.toString(), product])
  );

  const shopIds = [
    ...new Set(
      products
        .filter((product) => product.restaurantId)
        .map((product) => product.restaurantId.toString())
    ),
  ];

  const shops = await Restaurant.find({
    _id: { $in: shopIds },
  }).select("_id name category");

  const shopMap = new Map(
    shops.map((shop) => [shop._id.toString(), shop])
  );

  let changed = false;
  let unresolved = false;

  for (const item of missingItems) {
    const product = productMap.get(item.productId.toString());

    const shop = product?.restaurantId
      ? shopMap.get(product.restaurantId.toString())
      : null;

    if (!product || !shop) {
      unresolved = true;
      continue;
    }

    item.shopId = shop._id;
    item.shopName = shop.name;
    item.shopCategory = shop.category;

    changed = true;
  }

  return { changed, unresolved };
};

// Cart ke existing items se Cart type verify karein
const getExistingCartType = async (cart) => {
  if (!cart || cart.items.length === 0) {
    return null;
  }

  const types = [
    ...new Set(
      cart.items.map((item) => getCartType(item.shopCategory))
    ),
  ];

  if (types.length > 1) {
    return "MIXED";
  }

  if (types.length === 1) {
    return types[0];
  }

  // Purane Cart ke liye fallback
  if (cart.restaurantId) {
    const oldShop = await Restaurant.findById(cart.restaurantId)
      .select("category");

    if (oldShop) {
      return getCartType(oldShop.category);
    }
  }

  return null;
};

// Add Product To Cart
const addToCart = async (req, res) => {
  try {
    const customerId = req.user._id;

    const { productId, quantity = 1 } = req.body;

    const qty = Number(quantity);

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    // Product find karein
    const product = await Product.findOne({
      _id: productId,
      isAvailable: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or unavailable",
      });
    }

    // Product ki shop verify karein
    const shop = await Restaurant.findOne({
      _id: product.restaurantId,
      isApproved: true,
      isBanned: false,
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop is not available",
      });
    }

    const newCartType = getCartType(shop.category);

    // Customer ka Cart find karein
    let cart = await Cart.findOne({ customerId });

    // Cart nahi hai to naya banayein
    if (!cart) {
      cart = new Cart({
        customerId,
        cartType: newCartType,
        restaurantId:
          newCartType === "Restaurant" ? shop._id : null,
        items: [],
        subtotal: 0,
      });
    } else {
      // Purane items mein shop details attach karein
      const migration = await attachShopDetailsToLegacyItems(cart);

      if (migration.unresolved) {
        return res.status(400).json({
          success: false,
          message:
            "Your old cart contains products whose shop could not be verified. Please remove those products or clear your cart first.",
        });
      }

      // Existing Cart type check karein
      const existingCartType = await getExistingCartType(cart);
      console.log("========== CART DEBUG ==========");

console.log("New Shop Name:", shop.name);
console.log("New Shop Category:", shop.category);
console.log("New Cart Type:", newCartType);
console.log("Existing Cart Type:", existingCartType);

console.log("Existing Cart Items:", cart.items.map(item => ({
    shopName: item.shopName,
    shopCategory: item.shopCategory,
    shopId: item.shopId?.toString()
})));

console.log("================================");

      if (existingCartType === "MIXED") {
        return res.status(400).json({
          success: false,
          message:
            "Your cart contains mixed shop categories. Please clear your cart first.",
        });
      }

      if (
        existingCartType &&
        existingCartType !== newCartType
      ) {
        return res.status(400).json({
          success: false,
          message:
            newCartType === "Groceries"
              ? "Your cart contains Restaurant items. Please clear your cart before adding Grocery products."
              : "Your cart contains Grocery items. Please clear your cart before adding Restaurant products.",
        });
      }

      // Restaurant Cart mein doosra Restaurant allowed nahi hai
      // Restaurant Cart mein doosra Restaurant allowed nahi hai
      if (newCartType === "Restaurant" && cart.items.length > 0) {
        const hasDifferentRestaurant = cart.items.some(
          (item) =>
            !item.shopId ||
            item.shopId.toString() !== shop._id.toString()
        );
      
        if (hasDifferentRestaurant) {
          return res.status(400).json({
            success: false,
            message:
              "Your cart contains items from another restaurant. Please clear your cart first.",
          });
        }
      }

      cart.cartType = newCartType;

      cart.restaurantId =
        newCartType === "Restaurant" ? shop._id : null;
    }

    // Check karein Product pehle se Cart mein hai ya nahi
    const existingItem = cart.items.find(
      (item) =>
        item.productId.toString() === product._id.toString()
    );

    if (existingItem) {
      existingItem.quantity =
        Number(existingItem.quantity) + qty;

      existingItem.price = product.price;

      existingItem.total =
        product.price * existingItem.quantity;

      existingItem.shopId = shop._id;
      existingItem.shopName = shop.name;
      existingItem.shopCategory = shop.category;
    } else {
      cart.items.push({
        productId: product._id,

        shopId: shop._id,
        shopName: shop.name,
        shopCategory: shop.category,

        name: product.name,
        price: product.price,
        quantity: qty,
        image: product.image,
        total: product.price * qty,
      });
    }

    // Subtotal calculate karein
    cart.subtotal = cart.items.reduce(
      (sum, item) =>
        sum + Number(item.price) * Number(item.quantity),
      0
    );

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Product added to cart",
      cart,
    });
  } catch (error) {
    console.error("ADD TO CART ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add product to cart",
      error: error.message,
    });
  }
};

// Get Customer Cart
const getCart = async (req, res) => {
  try {
    const customerId = req.user._id;

    const cart = await Cart.findOne({ customerId });

    if (!cart) {
      return res.json({
        success: true,
        message: "Cart is empty",
        cart: {
          cartType: null,
          items: [],
          subtotal: 0,
        },
      });
    }

    // Purane items ki shop details update karein
    const migration = await attachShopDetailsToLegacyItems(cart);

    if (migration.changed) {
      await cart.save();
    }

    // Har item ki shop populate karein
    await cart.populate("items.shopId", "name category");

    // Legacy restaurantId bhi populate rakhein
    await cart.populate("restaurantId", "name category");

    res.json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error("GET CART ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get cart",
      error: error.message,
    });
  }
};

// Update Cart Item Quantity
const updateCartItem = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { productId } = req.params;
    const quantity = Number(req.body.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    const cart = await Cart.findOne({ customerId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const item = cart.items.find(
      (item) =>
        item.productId.toString() === productId.toString()
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart",
      });
    }

    item.quantity = quantity;
    item.total = Number(item.price) * quantity;

    cart.subtotal = cart.items.reduce(
      (sum, cartItem) =>
        sum +
        Number(cartItem.price) * Number(cartItem.quantity),
      0
    );

    await cart.save();

    res.json({
      success: true,
      message: "Cart quantity updated successfully",
      cart,
    });
  } catch (error) {
    console.error("UPDATE CART ITEM ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update cart item",
      error: error.message,
    });
  }
};

// Remove Product From Cart
const removeFromCart = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { productId } = req.params;

    const cart = await Cart.findOne({ customerId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const itemExists = cart.items.some(
      (item) =>
        item.productId.toString() === productId.toString()
    );

    if (!itemExists) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart",
      });
    }

    cart.items = cart.items.filter(
      (item) =>
        item.productId.toString() !== productId.toString()
    );

    cart.subtotal = cart.items.reduce(
      (sum, item) =>
        sum + Number(item.price) * Number(item.quantity),
      0
    );

    // Cart empty ho gaya to type aur shop reset karein
    if (cart.items.length === 0) {
      cart.cartType = null;
      cart.restaurantId = null;
      cart.subtotal = 0;
    } else {
      const remainingType = await getExistingCartType(cart);

      cart.cartType =
        remainingType === "MIXED" ? null : remainingType;

      if (cart.cartType === "Restaurant") {
        cart.restaurantId = cart.items[0].shopId || null;
      } else {
        cart.restaurantId = null;
      }
    }

    await cart.save();

    res.json({
      success: true,
      message: "Product removed from cart",
      cart,
    });
  } catch (error) {
    console.error("REMOVE FROM CART ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to remove product from cart",
      error: error.message,
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
};
