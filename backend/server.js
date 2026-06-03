const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { User, Product, Order } = require('./models');
const { convertQuantity, getDimension } = require('./conversions');

const app = express();
app.use(cors());
app.use(express.json());

// Middleware to normalize /api prefix (handles Vercel path mapping)
app.use((req, res, next) => {
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  next();
});

const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'aasa_medchem_jwt_secret_key_12345';

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await autoSeedDatabase();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Auto-seed function for cloud/empty databases
async function autoSeedDatabase() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('No users found in database. Auto-seeding initial users and products...');
      
      const adminPassword = await bcrypt.hash('admin123', 10);
      const sellerPassword = await bcrypt.hash('seller123', 10);
      
      const adminUser = new User({
        username: 'admin',
        password: adminPassword,
        role: 'admin'
      });
      
      const sellerUser = new User({
        username: 'seller',
        password: sellerPassword,
        role: 'seller'
      });
      
      await adminUser.save();
      await sellerUser.save();
      
      const products = [
        {
          name: 'Sodium Chloride (NaCl)',
          dimension: 'weight',
          baseUnit: 'kg',
          pricePerUnit: 500,
          stock: 25.5
        },
        {
          name: 'Gold Chloride (AuCl3)',
          dimension: 'weight',
          baseUnit: 'g',
          pricePerUnit: 4500,
          stock: 50
        },
        {
          name: 'Ethanol Absolute',
          dimension: 'volume',
          baseUnit: 'L',
          pricePerUnit: 800,
          stock: 100
        },
        {
          name: 'Hydrochloric Acid 1M',
          dimension: 'volume',
          baseUnit: 'mL',
          pricePerUnit: 1.25,
          stock: 5000
        },
        {
          name: 'Cryovial Sterile 2mL',
          dimension: 'count',
          baseUnit: 'unit',
          pricePerUnit: 15,
          stock: 1000
        }
      ];
      
      await Product.insertMany(products);
      console.log('Auto-seeding completed successfully!');
    } else {
      console.log('Database already has data. Skipping auto-seed.');
    }
  } catch (err) {
    console.error('Failed to auto-seed database:', err.message);
  }
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'Access Token Required' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or Expired Token' });
    req.user = user;
    next();
  });
}

// Admin Role Middleware
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

// --- AUTH ROUTES ---

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      password: hashedPassword,
      role
    });
    
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: { id: user._id, username: user.username, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// Get current user details
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

// --- PRODUCT ROUTES ---

// List Products
app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// Create Product (Admin Only)
app.post('/api/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, dimension, baseUnit, pricePerUnit, stock } = req.body;
    if (!name || !dimension || !baseUnit || pricePerUnit === undefined || stock === undefined) {
      return res.status(400).json({ message: 'All product fields are required' });
    }
    
    // Validate unit dimensions
    try {
      getDimension(baseUnit);
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }
    
    const product = new Product({
      name,
      dimension,
      baseUnit,
      pricePerUnit: Number(pricePerUnit),
      stock: Number(stock)
    });
    
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
});

// Update Product (Admin Only)
app.put('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, dimension, baseUnit, pricePerUnit, stock } = req.body;
    
    if (baseUnit) {
      try {
        getDimension(baseUnit);
      } catch (e) {
        return res.status(400).json({ message: e.message });
      }
    }
    
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        dimension,
        baseUnit,
        pricePerUnit: pricePerUnit !== undefined ? Number(pricePerUnit) : undefined,
        stock: stock !== undefined ? Number(stock) : undefined
      },
      { new: true }
    );
    
    if (!updatedProduct) return res.status(404).json({ message: 'Product not found' });
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
});

// Delete Product (Admin Only)
app.delete('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
});

// --- ORDER ROUTES ---

// Create Order/Quotation (Seller/User)
app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { items } = req.body; // Array of { productId, quantity, orderedUnit }
    
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }
    
    let totalPrice = 0;
    const orderItems = [];
    
    for (const item of items) {
      const { productId, quantity, orderedUnit } = item;
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(400).json({ message: `Product ${productId} not found` });
      }
      
      // Calculate quantities and prices
      let qtyInBase;
      try {
        qtyInBase = convertQuantity(quantity, orderedUnit, product.baseUnit);
      } catch (e) {
        return res.status(400).json({ message: `Conversion error: ${e.message}` });
      }
      
      // Check stock
      if (product.stock < qtyInBase) {
        return res.status(400).json({ message: `Insufficient stock for product "${product.name}". Available: ${product.stock} ${product.baseUnit}, Requested: ${qtyInBase.toFixed(4)} ${product.baseUnit}` });
      }
      
      const calculatedPrice = qtyInBase * product.pricePerUnit;
      
      // Deduct Stock
      product.stock -= qtyInBase;
      await product.save();
      
      orderItems.push({
        product: product._id,
        productName: product.name,
        orderedQuantity: Number(quantity),
        orderedUnit: orderedUnit,
        calculatedPrice: calculatedPrice,
        quantityInBaseUnit: qtyInBase
      });
      
      totalPrice += calculatedPrice;
    }
    
    const order = new Order({
      user: req.user.id,
      items: orderItems,
      totalPrice,
      status: 'pending'
    });
    
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// View Orders
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    let query = {};
    // Seller can only see their own orders
    if (req.user.role === 'seller') {
      query.user = req.user.id;
    }
    
    const orders = await Order.find(query)
      .populate('user', 'username role')
      .sort({ createdAt: -1 });
      
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// Update Order Status (Admin Only)
// If status is updated to 'rejected', the stock is restored.
app.put('/api/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check if status is already updated
    if (order.status !== 'pending') {
      return res.status(400).json({ message: `Order status is already "${order.status}"` });
    }
    
    if (status === 'rejected') {
      // Revert the stock
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.stock += item.quantityInBaseUnit;
          await product.save();
        }
      }
    }
    
    order.status = status;
    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
