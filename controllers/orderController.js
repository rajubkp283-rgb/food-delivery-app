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

        const orderProducts = await Product.find({
    _id: {
        $in: items.map(item => item.productId)
    }
});

const orderProductMap = new Map(
    orderProducts.map(product => [
        product._id.toString(),
        product
    ])
);
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
              
                  image: (() => {
                      const product = orderProductMap.get(
                          item.productId.toString()
                      );
              
                      return product?.image ||
                          (Array.isArray(product?.images)
                              ? product.images[0]
                              : "") ||
                          item.image ||
                          item.productImage ||
                          "";
                  })(),

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



// Create Order From Cart - Multiple Grocery Shops Support
const createOrderFromCart = async (req, res) => {
  let createdOrderIds = [];

  try {
    const customerId = req.user._id;

    const {
      deliveryAddress,
      paymentMethod = "COD",
      customerNote = "",
    } = req.body;

    // Validate delivery address
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

    // Validate payment method
    if (!["COD", "ONLINE", "WALLET"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    // Get customer cart
    const cart = await Cart.findOne({ customerId });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty",
      });
    }

    // Get all product IDs
    const productIds = cart.items.map(item => item.productId);

    // Fetch products from database
    const products = await Product.find({
      _id: { $in: productIds },
      isAvailable: true,
    });

    if (products.length !== cart.items.length) {
      return res.status(400).json({
        success: false,
        message: "One or more products are unavailable",
      });
    }

    // Map products by ID
    const productMap = new Map(
      products.map(product => [
        product._id.toString(),
        product
      ])
    );

    // Prepare shop-wise cart groups
    const shopGroups = new Map();

    for (const cartItem of cart.items) {
      const product = productMap.get(
        cartItem.productId.toString()
      );

      if (!product) {
        throw new Error("Product not found");
      }

      // Product's actual shop ID
      const shopId = product.restaurantId.toString();

      // Check saved shop ID if available
      if (
        cartItem.shopId &&
        cartItem.shopId.toString() !== shopId
      ) {
        throw new Error(
          "Product shop information does not match"
        );
      }

      const quantity = Number(cartItem.quantity);

      if (
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        throw new Error("Invalid product quantity");
      }

      if (!shopGroups.has(shopId)) {
        shopGroups.set(shopId, {
          shopId: product.restaurantId,
          items: [],
        });
      }

      const price = Number(product.price);

      shopGroups.get(shopId).items.push({
    productId: product._id,
    name: product.name,

    image:
        product.image ||
        (Array.isArray(product.images)
            ? product.images[0]
            : ""),

    quantity,
    price,
    total: price * quantity,
});
    }

    // Get all shops
    const shopIds = Array.from(shopGroups.values()).map(
      group => group.shopId
    );

    const shops = await Restaurant.find({
      _id: { $in: shopIds },
      isApproved: true,
      isBanned: false,
    });

    if (shops.length !== shopGroups.size) {
      return res.status(400).json({
        success: false,
        message: "One or more shops are not available",
      });
    }

    const shopMap = new Map(
      shops.map(shop => [
        shop._id.toString(),
        shop
      ])
    );

    // Determine cart type
    const cartTypes = new Set();

    for (const shop of shops) {
      const category = String(shop.category || "")
        .trim()
        .toLowerCase();

      cartTypes.add(
        category === "groceries"
          ? "Groceries"
          : "Restaurant"
      );
    }

    // Grocery and Restaurant cannot be mixed
    if (cartTypes.size > 1) {
      return res.status(400).json({
        success: false,
        message:
          "Grocery and Restaurant products cannot be ordered together.",
      });
    }

    const cartType = Array.from(cartTypes)[0];

    // Restaurant cart can contain only one restaurant
    if (
      cartType === "Restaurant" &&
      shopGroups.size > 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Restaurant products from different restaurants cannot be ordered together.",
      });
    }

    // Calculate shop-wise subtotals
    let overallSubtotal = 0;

    const orderGroups = [];

    for (const [shopId, group] of shopGroups) {
      const subtotal = group.items.reduce(
        (sum, item) => sum + item.total,
        0
      );

      overallSubtotal += subtotal;

      orderGroups.push({
        restaurantId: group.shopId,
        shopName: shopMap.get(shopId).name,
        items: group.items,
        subtotal,
      });
    }

    // One delivery fee for the complete checkout
    const totalDeliveryFee = 30;

    // Create separate Order for every shop
    const createdOrders = [];

    try {
      for (let i = 0; i < orderGroups.length; i++) {
        const group = orderGroups[i];

        // Charge delivery fee only in first Order
        const deliveryFee = i === 0
          ? totalDeliveryFee
          : 0;

        const totalAmount =
          group.subtotal + deliveryFee;

        const order = await Order.create({
          customerId,

          restaurantId: group.restaurantId,

          deliveryBoyId: null,

          items: group.items,

          subtotal: group.subtotal,

          deliveryFee,

          totalAmount,

          deliveryAddress: {
            name: deliveryAddress.name,
            phone: deliveryAddress.phone,
            address: deliveryAddress.address,
            city: deliveryAddress.city,
            pincode: deliveryAddress.pincode,
            latitude:
              deliveryAddress.latitude !== undefined &&
              deliveryAddress.latitude !== null
                ? Number(deliveryAddress.latitude)
                : null,
            longitude:
              deliveryAddress.longitude !== undefined &&
              deliveryAddress.longitude !== null
                ? Number(deliveryAddress.longitude)
                : null,
          },

          paymentMethod,

          paymentStatus: "PENDING",

          orderStatus: "PLACED",

          customerNote,
        });

        createdOrders.push(order);
        createdOrderIds.push(order._id);
      }
    } catch (orderError) {
      // Remove already-created orders if a later order fails
      if (createdOrderIds.length > 0) {
        await Order.deleteMany({
          _id: { $in: createdOrderIds },
          customerId,
        });
      }

      throw orderError;
    }

    // Clear cart only after all orders are created
    await Cart.findOneAndUpdate(
      { customerId },
      {
        $set: {
          restaurantId: null,
          cartType: null,
          items: [],
          subtotal: 0,
        },
      }
    );

    const totalAmount =
      overallSubtotal + totalDeliveryFee;

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",

      order: createdOrders[0],

      orders: createdOrders,

      orderIds: createdOrders.map(order => order._id),

      cartType,

      subtotal: overallSubtotal,

      deliveryFee: totalDeliveryFee,

      totalAmount,
    });

  } catch (error) {
    console.error(
      "CREATE ORDER FROM CART ERROR:",
      error
    );

    return res.status(500).json({
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

        const orders = await Order.find({ customerId })
            .populate("restaurantId", "name")
            .sort({ createdAt: -1 });

        // Collect Product IDs
        const productIds = orders.flatMap(order =>
            order.items.map(item => item.productId).filter(Boolean)
        );

        // Fetch actual product images
        const products = await Product.find({
            _id: { $in: productIds }
        })
        .select("_id image images")
        .lean();

        // Create Product Map
        const productMap = new Map();

        products.forEach(product => {
            productMap.set(product._id.toString(), product);
        });

        // Attach images to orders
        const formattedOrders = orders.map(order => {
            const orderData = order.toObject();

            orderData.items = orderData.items.map(item => {

                const productId = item.productId?._id
                    ? item.productId._id.toString()
                    : item.productId.toString();

                const product = productMap.get(productId);

                const productImages = Array.isArray(product?.images)
                    ? product.images.filter(Boolean)
                    : [];

                const mainImage =
                    item.image ||
                    product?.image ||
                    productImages[0] ||
                    "";

                return {
                    ...item,
                    image: mainImage,
                    images: productImages.length
                        ? productImages
                        : (mainImage ? [mainImage] : [])
                };
            });

            return orderData;
        });

        console.log("MY ORDERS IMAGE CHECK:", {
            totalOrders: formattedOrders.length,
            productsFound: products.length,
            firstItem: formattedOrders[0]?.items[0]
        });

        return res.json({
            success: true,
            count: formattedOrders.length,
            orders: formattedOrders
        });

    } catch (error) {
        console.error("GET MY ORDERS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to get orders",
            error: error.message
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

    image:
        product.image ||
        (Array.isArray(product.images)
            ? product.images[0]
            : "") ||
        oldItem.image ||
        "",

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