const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Restaurant = require("../models/Restaurant");

// Add Product To Cart
const addToCart = async (req, res) => {
  try {
    const customerId = req.user._id;

    const {
      productId,
      quantity = 1,
    } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    // Find product
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

    // Check restaurant
    const restaurant = await Restaurant.findOne({
      _id: product.restaurantId,
      isApproved: true,
      isBanned: false,
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant is not available",
      });
    }

    // Find customer's cart
    let cart = await Cart.findOne({
      customerId,
    });

    // Create cart if it doesn't exist
    if (!cart) {
      cart = new Cart({
        customerId,
        restaurantId: product.restaurantId,
        items: [],
        subtotal: 0,
      });
    }

    // If cart belongs to another restaurant
    if (
      cart.restaurantId &&
      cart.restaurantId.toString() !== product.restaurantId.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Your cart contains items from another restaurant. Please clear your cart first.",
      });
    }

    cart.restaurantId = product.restaurantId;

    // Check if product already exists
    const existingItem = cart.items.find(
      (item) =>
        item.productId.toString() === productId.toString()
    );

    if (existingItem) {
      existingItem.quantity += Number(quantity);
      existingItem.total =
        existingItem.price * existingItem.quantity;
    } else {
      cart.items.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: Number(quantity),
        image: product.image,
        total: product.price * Number(quantity),
      });
    }

    // Calculate subtotal
    cart.subtotal = cart.items.reduce(
      (sum, item) => sum + item.total,
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

    const cart = await Cart.findOne({
  customerId,
}).populate(
  "restaurantId",
  "name category"
);

    if (!cart) {
      return res.json({
        success: true,
        message: "Cart is empty",
        cart: {
          items: [],
          subtotal: 0,
        },
      });
    }

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
    const { quantity } = req.body;

    if (quantity === undefined || Number(quantity) < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    const cart = await Cart.findOne({
      customerId,
    });

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

    item.quantity = Number(quantity);
    item.total = item.price * item.quantity;

    // Recalculate subtotal
    cart.subtotal = cart.items.reduce(
      (sum, item) => sum + item.total,
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

    const cart = await Cart.findOne({
      customerId,
    });

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

    // Recalculate subtotal
    cart.subtotal = cart.items.reduce(
      (sum, item) => sum + item.total,
      0
    );

    // If cart becomes empty
    if (cart.items.length === 0) {
      cart.restaurantId = null;
      cart.subtotal = 0;
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