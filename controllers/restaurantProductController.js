const Product = require("../models/Product");

// Add Product
const addProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      image,
      price,
      isAvailable,
      isVeg,
      preparationTime,
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Product name and price are required",
      });
    }

    const product = await Product.create({
      restaurantId: req.restaurant._id,
      name,
      description: description || "",
      category: category || "",
      image: image || "",
      price,
      isAvailable:
        isAvailable !== undefined ? isAvailable : true,
      isVeg: isVeg !== undefined ? isVeg : true,
      preparationTime: preparationTime || 20,
    });

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      product,
    });
  } catch (error) {
    console.error("ADD PRODUCT ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add product",
      error: error.message,
    });
  }
};


// Get Restaurant Products
const getRestaurantProducts = async (req, res) => {
  try {
    const products = await Product.find({
      restaurantId: req.restaurant._id,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("GET RESTAURANT PRODUCTS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get products",
      error: error.message,
    });
  }
};


// Update Product
const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const {
      name,
      description,
      category,
      image,
      price,
      isAvailable,
      isVeg,
      preparationTime,
    } = req.body;

    const product = await Product.findOne({
      _id: productId,
      restaurantId: req.restaurant._id,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (category !== undefined) product.category = category;
    if (image !== undefined) product.image = image;
    if (price !== undefined) product.price = price;
    if (isAvailable !== undefined) product.isAvailable = isAvailable;
    if (isVeg !== undefined) product.isVeg = isVeg;
    if (preparationTime !== undefined) {
      product.preparationTime = preparationTime;
    }

    await product.save();

    res.json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
};

// Delete Product
const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findOneAndDelete({
      _id: productId,
      restaurantId: req.restaurant._id,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message,
    });
  }
};


module.exports = {
  addProduct,
  getRestaurantProducts,
  updateProduct,
  deleteProduct,
};