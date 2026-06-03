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
    
    await Product.insertMany(products);
    console.log('Seeded Products successfully!');
    
    mongoose.connection.close();
    console.log('Seeding completed successfully. Connection closed.');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
