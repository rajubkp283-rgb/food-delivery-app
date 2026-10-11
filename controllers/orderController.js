const Order = require("../models/Order");
const Restaurant = require("../models/Restaurant");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const DeliveryLocation = require("../models/DeliveryLocation");

// Create New Order
async function createOrder(req, res) {
    try {
        const customerId = req.user._id;

        const {
            restaurantId,
            items,
            deliveryAddress,
            paymentMethod,
            customerNote
        } = req.body;


        // Basic validation
        if (!restaurantId) {
            return res.status(400).json({
                success: false,
                message: "Restaurant ID is required."
            });
        }


        if (
            !Array.isArray(items) ||
            items.length === 0
        ) {
            return res.status(400).json({
                success: false,
                message: "At least one item is required."
            });
        }


        if (
            !deliveryAddress ||
            !deliveryAddress.address
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Delivery address is required."
            });
        }


        // Check restaurant
        const restaurant =
            await Restaurant.findById(
                restaurantId
            );

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found."
            });
        }


        if (
            restaurant.isBanned ||
            !restaurant.isApproved
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Restaurant is not available for orders."
            });
        }


        // Calculate totals
        let subtotal = 0;

        const formattedItems =
            items.map(item => {

                const quantity =
                    Number(item.quantity);

                const price =
                    Number(item.price);

                if (
                    !item.productId ||
                    !item.name ||
                    !Number.isFinite(quantity) ||
                    quantity < 1 ||
                    !Number.isFinite(price) ||
                    price < 0
                ) {
                    throw new Error(
                        "Invalid order item."
                    );
                }

                const total =
                    price * quantity;

                subtotal += total;

                return {
                    productId: item.productId,
                    name: item.name,
                    quantity,
                    price,
                    total
                };
            });


        const deliveryFee = 0;

        const totalAmount =
            subtotal + deliveryFee;


        const order =
            await Order.create({
                customerId,

                restaurantId,

                deliveryBoyId: null,

                items: formattedItems,

                subtotal,

                deliveryFee,

                totalAmount,

                deliveryAddress: {
                    name:
                        deliveryAddress.name || "",

                    phone:
                        deliveryAddress.phone || "",

                    address:
                        deliveryAddress.address,

                    city:
                        deliveryAddress.city || "",

                    latitude:
                        deliveryAddress.latitude !== undefined
                            ? Number(
                                deliveryAddress.latitude
                            )
                            : null,

                    longitude:
                        deliveryAddress.longitude !== undefined
                            ? Number(
                                deliveryAddress.longitude
                            )
                            : null
                },

                paymentMethod:
                    paymentMethod || "COD",

                customerNote:
                    customerNote || "",

                orderStatus: "PLACED",

                paymentStatus:
                    paymentMethod === "ONLINE"
                        ? "PENDING"
                        : "PENDING"
            });


        res.status(201).json({
            success: true,
            message:
                "Order placed successfully.",

            order: {
                id: order._id,
                restaurantId:
                    order.restaurantId,

                totalAmount:
                    order.totalAmount,

                paymentMethod:
                    order.paymentMethod,

                paymentStatus:
                    order.paymentStatus,

                orderStatus:
                    order.orderStatus,

                createdAt:
                    order.createdAt
            }
        });

    } catch (error) {

        console.error(
            "CREATE ORDER ERROR:",
            error
        );

        res.status(400).json({
            success: false,
            message:
                error.message ||
                "Failed to create order."
        });
    }
}


// Create Order From Cart
const createOrderFromCart = async (req, res) => {
  try {
    const customerId = req.user._id;

    const {
      deliveryAddress,
      paymentMethod = "COD",
      customerNote = "",
    } = req.body;

    if (
    !deliveryAddress ||
    !deliveryAddress.name ||
    !deliveryAddress.phone ||
    !deliveryAddress.address ||
    !deliveryAddress.city ||
    !deliveryAddress.pincode
) {
      return res.status(400).json({
        success: false,
        message: "Complete delivery address is required",
      });
    }

    // Get customer cart
    const cart = await Cart.findOne({
      customerId,
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty",
      });
    }

    // Verify restaurant
    const restaurant = await Restaurant.findOne({
      _id: cart.restaurantId,
      isApproved: true,
      isBanned: false,
    });

    if (!restaurant) {
      return res.status(400).json({
        success: false,
        message: "Restaurant is not available",
      });
    }

    // Verify products and prices from database
    const productIds = cart.items.map((item) => item.productId);

    const products = await Product.find({
      _id: { $in: productIds },
      restaurantId: cart.restaurantId,
      isAvailable: true,
    });

    if (products.length !== cart.items.length) {
      return res.status(400).json({
        success: false,
        message: "One or more products are unavailable",
      });
    }

    // Create order items using database prices
    const orderItems = cart.items.map((cartItem) => {
      const product = products.find(
        (p) =>
          p._id.toString() === cartItem.productId.toString()
      );

      const quantity = Number(cartItem.quantity);
      const price = product.price;

      return {
        productId: product._id,
        name: product.name,
        quantity,
        price,
        total: price * quantity,
      };
    });

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.total,
      0
    );

    const deliveryFee = 30;
     const totalAmount = subtotal + deliveryFee;

    // Create order
    const order = await Order.create({
      customerId,
      restaurantId: cart.restaurantId,
      items: orderItems,
      subtotal,
      deliveryFee,
      totalAmount,
      deliveryAddress,
      paymentMethod,
      paymentStatus: "PENDING",
      orderStatus: "PLACED",
      customerNote,
    });

    // Clear cart after successful order
    await Cart.findOneAndUpdate(
      { customerId },
      {
        $set: {
          restaurantId: null,
          items: [],
          subtotal: 0,
        },
      }
    );

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    console.error("CREATE ORDER FROM CART ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

// Get Customer Orders
const getMyOrders = async (req, res) => {
  try {
    const customerId = req.user._id;

    const orders = await Order.find({
      customerId,
    })
      .populate("restaurantId", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("GET MY ORDERS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get orders",
      error: error.message,
    });
  }
};

// Get Restaurant Orders
const getRestaurantOrders = async (req, res) => {
  try {
    const restaurantId = req.restaurant._id;

    const orders = await Order.find({
      restaurantId,
    })
      .populate("customerId", "name phone")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("GET RESTAURANT ORDERS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get restaurant orders",
      error: error.message,
    });
  }
};

const updateRestaurantOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderStatus } = req.body;

    const allowedStatuses = [
      "CONFIRMED",
      "PREPARING",
      "READY",
      "CANCELLED",
    ];

    if (!allowedStatuses.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      restaurantId: req.restaurant._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.orderStatus = orderStatus;
    await order.save();

    res.json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.error("UPDATE RESTAURANT ORDER STATUS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: error.message,
    });
  }
};

// Assign Order To Delivery Boy
const assignOrderToDeliveryBoy = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryBoyId } = req.body;

    if (!deliveryBoyId) {
      return res.status(400).json({
        success: false,
        message: "Delivery Boy ID is required",
      });
    }

    // Find order belonging to this restaurant
    const order = await Order.findOne({
      _id: orderId,
      restaurantId: req.restaurant._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Order must be READY before assignment
    if (order.orderStatus !== "READY") {
      return res.status(400).json({
        success: false,
        message: "Only READY orders can be assigned",
      });
    }

    // Find delivery boy
    const DeliveryBoy = require("../models/DeliveryBoy");

    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);

    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery Boy not found",
      });
    }

    // Delivery boy must be approved
    if (!deliveryBoy.isApproved) {
      return res.status(400).json({
        success: false,
        message: "Delivery Boy is not approved",
      });
    }

    // Assign delivery boy
    order.deliveryBoyId = deliveryBoy._id;
    order.orderStatus = "ASSIGNED";

    await order.save();

    res.json({
      success: true,
      message: "Order assigned to Delivery Boy successfully",
      order,
    });
  } catch (error) {
    console.error("ASSIGN ORDER ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to assign order",
      error: error.message,
    });
  }
};


// Get Customer Order Tracking
const getOrderTracking = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      customerId: req.user._id,
    })
      .populate("restaurantId", "name phone address city category")
      .populate("deliveryBoyId", "name phone vehicleType vehicleNumber");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    let deliveryLocation = null;

if (order.deliveryBoyId) {
    deliveryLocation = await DeliveryLocation.findOne({
        deliveryBoyId: order.deliveryBoyId._id || order.deliveryBoyId
    }).sort({ updatedAt: -1 });
}

    res.json({
      success: true,
      order: {
        id: order._id,
        restaurant: order.restaurantId,
        deliveryBoy: order.deliveryBoyId,
        deliveryLocation: deliveryLocation,
        items: order.items,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        totalAmount: order.totalAmount,
        deliveryAddress: order.deliveryAddress,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        customerNote: order.customerNote,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  } catch (error) {
    console.error("GET ORDER TRACKING ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get order tracking.",
    });
  }
};

// Reorder Previous Order
const reorderPreviousOrder = async (req, res) => {
  try {

    const { orderId } = req.params;

    const customerId = req.user._id;


    // Find customer's previous order
    const order = await Order.findOne({
      _id: orderId,
      customerId: customerId
    });


    if (!order) {

      return res.status(404).json({
        success: false,
        message: "Order not found"
      });

    }


    // Reorder cannot be done from cancelled order
    if (order.orderStatus === "CANCELLED") {

      return res.status(400).json({
        success: false,
        message: "Cancelled order cannot be reordered"
      });

    }


    // Find products from previous order
    const Product = require("../models/Product");

    const productIds =
      order.items.map(
        item => item.productId
      );


    const products =
      await Product.find({
        _id: { $in: productIds },
        restaurantId: order.restaurantId,
        isAvailable: true
      });


    if (products.length === 0) {

      return res.status(400).json({
        success: false,
        message: "Products from this order are currently unavailable"
      });

    }


    // Find customer's cart
    const Cart = require("../models/Cart");

    let cart =
      await Cart.findOne({
        customerId
      });


    // If cart does not exist, create it
    if (!cart) {

      cart = new Cart({
        customerId,
        restaurantId: order.restaurantId,
        items: [],
        subtotal: 0
      });

    }


    // Reorder should belong to same restaurant
    if (
      cart.restaurantId &&
      cart.items.length > 0 &&
      cart.restaurantId.toString() !==
      order.restaurantId.toString()
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Your cart contains items from another restaurant. Please clear your cart first."
      });

    }


    cart.restaurantId =
      order.restaurantId;


    // Add previous order items
    for (const oldItem of order.items) {

      const product =
        products.find(
          p =>
            p._id.toString() ===
            oldItem.productId.toString()
        );


      if (!product) {
        continue;
      }


      const existingItem =
        cart.items.find(
          item =>
            item.productId.toString() ===
            product._id.toString()
        );


      if (existingItem) {

        existingItem.quantity +=
          Number(oldItem.quantity);

      } else {

        cart.items.push({
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: Number(oldItem.quantity),
          total:
            product.price *
            Number(oldItem.quantity)
        });

      }

    }


    // Recalculate cart subtotal
    cart.subtotal =
      cart.items.reduce(
        (sum, item) =>
          sum +
          Number(item.price) *
          Number(item.quantity),
        0
      );


    // Update item totals
    cart.items.forEach(item => {

      item.total =
        Number(item.price) *
        Number(item.quantity);

    });


    await cart.save();


    res.json({

      success: true,

      message:
        "Previous order added to cart successfully",

      cart

    });


  } catch (error) {

    console.error(
      "REORDER PREVIOUS ORDER ERROR:",
      error
    );


    res.status(500).json({

      success: false,

      message:
        "Failed to reorder previous order",

      error: error.message

    });

  }
};



module.exports = {
  createOrder,
  createOrderFromCart,
  getMyOrders,
  getRestaurantOrders,
  updateRestaurantOrderStatus,
  assignOrderToDeliveryBoy,
  getOrderTracking,
  reorderPreviousOrder,
};