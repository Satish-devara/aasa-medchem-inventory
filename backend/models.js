const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'seller'], required: true }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dimension: { type: String, enum: ['weight', 'volume', 'count'], required: true },
  baseUnit: { type: String, enum: ['g', 'kg', 'mL', 'L', 'unit'], required: true },
  pricePerUnit: { type: Number, required: true }, // price per 1 baseUnit in INR
  stock: { type: Number, required: true, default: 0 } // quantity in baseUnit
});

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  orderedQuantity: { type: Number, required: true },
  orderedUnit: { type: String, required: true },
  calculatedPrice: { type: Number, required: true }, // calculated price in INR
  quantityInBaseUnit: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  totalPrice: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);

module.exports = {
  User,
  Product,
  Order
};
