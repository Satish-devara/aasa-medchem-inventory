# Inventory & Order Management System (MERN Stack)

This is a clean, minimal inventory and order management system built using the MERN stack (MongoDB, Express, React, Node.js). 

It satisfies the requirement for a dual-panel interface supporting Admin operations, Seller orders, and precise unit conversions across weight, volume, and count dimensions.

---

## Tech Stack & Architecture

- **Frontend**: Single Page Application built using React (Vite) and styled with Vanilla CSS.
- **Backend**: Node.js + Express REST API.
- **Database**: MongoDB (Mongoose ODM).
- **Communication**: REST API endpoints secured via JWT (JSON Web Tokens) role-based authentication.

---

## Database Schemas

### 1. User
- `username`: `String` (Unique, Required)
- `password`: `String` (Hashed using bcrypt, Required)
- `role`: `String` (Enum: `admin` | `seller`, Required)

### 2. Product
- `name`: `String` (Required)
- `dimension`: `String` (Enum: `weight` | `volume` | `count`, Required)
- `baseUnit`: `String` (Enum: `g` | `kg` | `mL` | `L` | `unit`, Required)
- `pricePerUnit`: `Number` (Double-precision float representation in INR, Required)
- `stock`: `Number` (Double-precision float representing current stock in the `baseUnit`, Required)

### 3. Order
- `user`: `ObjectId` (Refers to `User`, Required)
- `items`: `Array` of:
  - `product`: `ObjectId` (Refers to `Product`)
  - `productName`: `String` (Snapshot of product name)
  - `orderedQuantity`: `Number`
  - `orderedUnit`: `String`
  - `calculatedPrice`: `Number` (Price of item in INR)
  - `quantityInBaseUnit`: `Number` (Deducted from stock)
- `totalPrice`: `Number` (Total price in INR)
- `status`: `String` (Enum: `pending` | `approved` | `rejected`, default: `pending`)
- `createdAt`: `Date` (default: `Date.now`)

---

## Unit Storage & Conversion Strategy

### 1. Dimension Definitions & Absolute Base Units
We support three physical dimensions, each with a designated absolute base unit for internal calculations:
- **Weight**: Base is `g` (Grams)
  - Supported units: `g` (1x multiplier), `kg` (1000x multiplier)
- **Volume**: Base is `mL` (Milliliters)
  - Supported units: `mL` (1x multiplier), `L` (1000x multiplier)
- **Count**: Base is `unit` (Items)
  - Supported units: `unit` (1x multiplier)

### 2. Stock and Pricing Calculations
- Product prices and stocks are configured and stored directly in the product's `baseUnit` (e.g. ₹500/kg or ₹1.25/mL).
- When a seller orders a quantity in an alternative unit (e.g. ordering 500g of a product priced per kg):
  1. The quantity is converted to the absolute base unit (`g`), and then to the product's target base unit (`kg`):
     $$\text{Base Qty} = \frac{500 \text{ g} \times 1}{1000} = 0.5 \text{ kg}$$
  2. The price is calculated by multiplying the converted quantity with the base price:
     $$\text{Price} = 0.5 \text{ kg} \times ₹500/\text{kg} = ₹250.00$$
  3. Stock is deducted from the product by subtracting the base quantity.
  4. If the order is rejected by the admin, the deducted quantity is added back.

---

## Setup & Running Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MongoDB](https://www.mongodb.com/) running locally (port `27017`)

### 1. Install Dependencies
Run the installation script in the root directory to install packages for root, backend, and frontend:
```bash
npm run install-all
```

### 2. Seed the Database
Initialize the database with default users and products:
```bash
npm run seed --prefix backend
```

### 3. Run the Servers
Start both the Express API server and the Vite React app concurrently:
```bash
npm run dev
```

The application will be accessible at:
- **Frontend UI**: `http://localhost:5173/`
- **Backend API**: `http://localhost:5001/`

---

## Test Credentials

Use these credentials on the sign-in page to test the roles:

| Role | Username | Password |
|---|---|---|
| **Admin** | `admin` | `admin123` |
| **Seller** | `seller` | `seller123` |
