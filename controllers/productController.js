const Product = require("../models/Product");
const Restaurant = require("../models/Restaurant");

// Get products of a restaurant
const getRestaurantProductsForCustomer = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // Check restaurant
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      isApproved: true,
      isBanned: false,
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // Get available products
    const products = await Product.find({
      restaurantId: restaurantId,
      isAvailable: true,
    }).sort({ category: 1, createdAt: -1 });

    res.json({
      success: true,
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
      },
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("CUSTOMER PRODUCTS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get restaurant products",
      error: error.message,
    });
  }
};

const getRestaurantsByCategory = async (req, res) => {
    try {
        const { category } = req.params;

        if (!category) {
            return res.status(400).json({
                success: false,
                message: "Category is required"
            });
        }

        const products = await Product.find({
            category: {
                $regex: category,
                $options: "i"
            },
            isAvailable: true
        }).select("restaurantId");

        const restaurantIds = [
            ...new Set(
                products.map(product =>
                    product.restaurantId.toString()
                )
            )
        ];

        const restaurants = await Restaurant.find({
            _id: { $in: restaurantIds },
            isApproved: true,
            isBanned: false
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            category,
            count: restaurants.length,
            restaurants
        });

    } catch (error) {

        console.error(
            "CATEGORY RESTAURANTS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to get category restaurants",
            error: error.message
        });
    }
};



// ==========================================
// GET NEAREST PRODUCTS FOR CUSTOMER
// Restaurant / Grocery within 5 KM
// ==========================================

const getNearestProducts = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      category
    } = req.query;

    // -------------------------------
    // Validate location
    // -------------------------------
    if (
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required"
      });
    }

    const userLatitude = Number(latitude);
    const userLongitude = Number(longitude);

    if (
      !Number.isFinite(userLatitude) ||
      !Number.isFinite(userLongitude)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude"
      });
    }

    // -------------------------------
    // Validate category
    // -------------------------------
    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category is required"
      });
    }

    const normalizedCategory =
      category.toLowerCase().trim();

    let categoryRegex;

    if (normalizedCategory === "restaurant") {
      categoryRegex = /^restaurant$/i;
    } else if (
      normalizedCategory === "grocery" ||
      normalizedCategory === "groceries"
    ) {
      categoryRegex = /^groceries?$/i;
    } else {
      return res.status(400).json({
        success: false,
        message: "Category must be Restaurant or Grocery"
      });
    }

    // -------------------------------
    // Find approved shops
    // -------------------------------
    const restaurants = await Restaurant.find({
      category: categoryRegex,
      isApproved: true,
      isBanned: false,
      latitude: {
        $ne: null
      },
      longitude: {
        $ne: null
      }
    }).lean();

    // -------------------------------
    // Calculate distance
    // Haversine Formula
    // -------------------------------

    const toRadians = (degree) => {
      return degree * (Math.PI / 180);
    };

    const calculateDistanceInKm = (
      lat1,
      lon1,
      lat2,
      lon2
    ) => {

      const earthRadiusKm = 6371;

      const dLat = toRadians(lat2 - lat1);
      const dLon = toRadians(lon2 - lon1);

      const a =
        Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

      const c =
        2 *
        Math.atan2(
          Math.sqrt(a),
          Math.sqrt(1 - a)
        );

      return earthRadiusKm * c;
    };

    // -------------------------------
    // Keep only shops within 5 KM
    // -------------------------------

    const nearbyRestaurants = restaurants
      .map((restaurant) => {

        const distance = calculateDistanceInKm(
          userLatitude,
          userLongitude,
          Number(restaurant.latitude),
          Number(restaurant.longitude)
        );

        return {
          ...restaurant,
          distance: Number(distance.toFixed(2))
        };

      })
      .filter(
        (restaurant) =>
          restaurant.distance <= 5
      )
      .sort(
        (a, b) =>
          a.distance - b.distance
      );

    // -------------------------------
    // If no nearby shops
    // -------------------------------

    if (nearbyRestaurants.length === 0) {
      return res.json({
        success: true,
        category,
        radius: 5,
        count: 0,
        restaurants: [],
        products: []
      });
    }

    // -------------------------------
    // Restaurant IDs
    // -------------------------------

    const restaurantIds =
      nearbyRestaurants.map(
        (restaurant) => restaurant._id
      );

    // -------------------------------
    // Get available products
    // -------------------------------

    const products = await Product.find({
      restaurantId: {
        $in: restaurantIds
      },
      isAvailable: true
    })
      .sort({
        createdAt: -1
      })
      .lean();

    // -------------------------------
    // Attach shop information
    // -------------------------------

    const restaurantMap = new Map();

    nearbyRestaurants.forEach(
      (restaurant) => {

        restaurantMap.set(
          restaurant._id.toString(),
          restaurant
        );

      }
    );

    const productsWithShop =
      products.map((product) => {

        const shop =
          restaurantMap.get(
            product.restaurantId.toString()
          );

        return {
          ...product,

          shop: shop
            ? {
                id: shop._id,
                name: shop.name,
                phone: shop.phone,
                address: shop.address,
                city: shop.city,
                category: shop.category,
                deliveryTime:
                  shop.deliveryTime,
                deliveryFee:
                  shop.deliveryFee,
                isOpen: shop.isOpen,
                latitude:
                  shop.latitude,
                longitude:
                  shop.longitude,
                distance:
                  shop.distance
              }
            : null
        };

      });

    // -------------------------------
    // Final response
    // -------------------------------

    res.json({
      success: true,

      category,

      radius: 5,

      userLocation: {
        latitude: userLatitude,
        longitude: userLongitude
      },

      restaurantCount:
        nearbyRestaurants.length,

      productCount:
        productsWithShop.length,

      restaurants:
        nearbyRestaurants,

      products:
        productsWithShop
    });

  } catch (error) {

    console.error(
      "NEAREST PRODUCTS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to get nearest products",
      error: error.message
    });
  }
};

module.exports = {
  getRestaurantProductsForCustomer,
  getRestaurantsByCategory,
  getNearestProducts,
};