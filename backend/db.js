const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { User, Product, Order } = require('./models');

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');
    
    // Clear collections
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    console.log('Cleared existing data.');
    
    // Seed Users
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
    console.log('Seeded Users:');
    console.log('- Admin: admin / admin123');
    console.log('- Seller: seller / seller123');
    
    // Seed Products
    const products = [
      {
        name: 'Sodium Chloride (NaCl)',
        dimension: 'weight',
        baseUnit: 'kg',
        pricePerUnit: 500, // INR per kg
        stock: 25.5 // 25.5 kg
      },
      {
        name: 'Gold Chloride (AuCl3)',
        dimension: 'weight',
        baseUnit: 'g',
        pricePerUnit: 4500, // INR per gram
        stock: 50 // 50 grams
      },
      {
        name: 'Ethanol Absolute',
        dimension: 'volume',
        baseUnit: 'L',
        pricePerUnit: 800, // INR per Litre
        stock: 100 // 100 Litres
      },
      {
        name: 'Hydrochloric Acid 1M',
        dimension: 'volume',
        baseUnit: 'mL',
        pricePerUnit: 1.25, // INR per mL
        stock: 5000 // 5000 mL
      },
      {
        name: 'Cryovial Sterile 2mL',
        dimension: 'count',
        baseUnit: 'unit',
        pricePerUnit: 15, // INR per unit/item
        stock: 1000 // 1000 items
      }
    ];
    
    const seededProducts = await Product.insertMany(products);
    console.log('Seeded Products successfully!');
    
    // Seed Orders
    const nNaCl = seededProducts.find(p => p.name.includes('Sodium Chloride'));
    const nAuCl3 = seededProducts.find(p => p.name.includes('Gold Chloride'));
    const nEthanol = seededProducts.find(p => p.name.includes('Ethanol'));
    const nHCl = seededProducts.find(p => p.name.includes('Hydrochloric'));
    const nVial = seededProducts.find(p => p.name.includes('Cryovial'));

    const orders = [
      {
        user: sellerUser._id,
        items: [
          {
            product: nNaCl._id,
            productName: nNaCl.name,
            orderedQuantity: 500,
            orderedUnit: 'g',
            calculatedPrice: 250,
            quantityInBaseUnit: 0.5
          },
          {
            product: nAuCl3._id,
            productName: nAuCl3.name,
            orderedQuantity: 10,
            orderedUnit: 'g',
            calculatedPrice: 45000,
            quantityInBaseUnit: 10
          }
        ],
        totalPrice: 45250,
        status: 'approved',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        user: sellerUser._id,
        items: [
          {
            product: nEthanol._id,
            productName: nEthanol.name,
            orderedQuantity: 5,
            orderedUnit: 'L',
            calculatedPrice: 4000,
            quantityInBaseUnit: 5
          },
          {
            product: nHCl._id,
            productName: nHCl.name,
            orderedQuantity: 250,
            orderedUnit: 'mL',
            calculatedPrice: 312.50,
            quantityInBaseUnit: 250
          }
        ],
        totalPrice: 4312.50,
        status: 'pending',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        user: sellerUser._id,
        items: [
          {
            product: nVial._id,
            productName: nVial.name,
            orderedQuantity: 100,
            orderedUnit: 'unit',
            calculatedPrice: 1500,
            quantityInBaseUnit: 100
          }
        ],
        totalPrice: 1500,
        status: 'rejected',
        createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000) // 10 hours ago
      }
    ];

    await Order.insertMany(orders);
    console.log('Seeded Orders successfully!');
    
    mongoose.connection.close();
    console.log('Seeding completed successfully. Connection closed.');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
