import React, { useState, useEffect } from 'react';

// API Base URL
const API_URL = window.location.origin.includes('localhost') 
  ? 'http://localhost:5001/api' 
  : '/api';

// Unit conversion constants
const UNIT_MULTIPLIERS = {
  g: 1,
  kg: 1000,
  mL: 1,
  L: 1000,
  unit: 1
};

const DIMENSION_UNITS = {
  weight: ['g', 'kg'],
  volume: ['mL', 'L'],
  count: ['unit']
};

function getDimension(unit) {
  if (DIMENSION_UNITS.weight.includes(unit)) return 'weight';
  if (DIMENSION_UNITS.volume.includes(unit)) return 'volume';
  if (DIMENSION_UNITS.count.includes(unit)) return 'count';
  throw new Error(`Unknown unit: ${unit}`);
}

function convertQuantity(quantity, fromUnit, toUnit) {
  const fromDim = getDimension(fromUnit);
  const toDim = getDimension(toUnit);
  
  if (fromDim !== toDim) {
    throw new Error(`Cannot convert between different dimensions: ${fromDim} and ${toDim}`);
  }
  
  const baseValue = Number(quantity) * UNIT_MULTIPLIERS[fromUnit];
  return baseValue / UNIT_MULTIPLIERS[toUnit];
}

export default function App() {
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  
  // Data state
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState('inventory');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDim, setFilterDim] = useState('');
  
  // Admin Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    dimension: 'weight',
    baseUnit: 'g',
    pricePerUnit: '',
    stock: ''
  });
  
  // Seller Order Panel state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [orderQty, setOrderQty] = useState('');
  const [orderUnit, setOrderUnit] = useState('g');
  const [cart, setCart] = useState([]); // List of items: { product, quantity, orderedUnit, calculatedPrice, qtyInBase }

  // Clear messages automatically after 5s
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Fetch initial data when token is present
  useEffect(() => {
    if (token) {
      fetchProducts();
      fetchOrders();
    }
  }, [token]);

  // Helper: headers
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  // API calls
  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/products`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/orders`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    }
  };

  // Auth Handlers
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setSuccess('Logged in successfully!');
      
      // Reset inputs
      setUsernameInput('');
      setPasswordInput('');
      
      // Default views
      if (data.user.role === 'admin') {
        setActiveTab('inventory');
      } else {
        setActiveTab('browse');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setProducts([]);
    setOrders([]);
    setCart([]);
    setSuccess('Logged out successfully.');
  };

  // Admin: Product Creation/Editing
  const openAddProductModal = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      dimension: 'weight',
      baseUnit: 'g',
      pricePerUnit: '',
      stock: ''
    });
    setModalOpen(true);
  };

  const openEditProductModal = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      dimension: product.dimension,
      baseUnit: product.baseUnit,
      pricePerUnit: product.pricePerUnit,
      stock: product.stock
    });
    setModalOpen(true);
  };

  const handleProductDimensionChange = (e) => {
    const dim = e.target.value;
    const defaultUnit = dim === 'weight' ? 'g' : dim === 'volume' ? 'mL' : 'unit';
    setProductForm({
      ...productForm,
      dimension: dim,
      baseUnit: defaultUnit
    });
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const url = editingProduct 
      ? `${API_URL}/products/${editingProduct._id}` 
      : `${API_URL}/products`;
    const method = editingProduct ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify({
          name: productForm.name,
          dimension: productForm.dimension,
          baseUnit: productForm.baseUnit,
          pricePerUnit: parseFloat(productForm.pricePerUnit),
          stock: parseFloat(productForm.stock)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save product');
      
      setSuccess(editingProduct ? 'Product updated successfully!' : 'Product added successfully!');
      setModalOpen(false);
      fetchProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    setError('');
    try {
      const res = await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete product');
      setSuccess('Product deleted successfully');
      fetchProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  // Admin: Order Status Updates
  const handleUpdateOrderStatus = async (orderId, status) => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update status');
      setSuccess(`Order ${status} successfully!`);
      fetchOrders();
      fetchProducts(); // Stock levels might have reverted on rejection
    } catch (err) {
      setError(err.message);
    }
  };

  // Seller: Add to order cart
  const handleSelectedProductChange = (e) => {
    const id = e.target.value;
    setSelectedProductId(id);
    const prod = products.find(p => p._id === id);
    if (prod) {
      setOrderUnit(prod.baseUnit);
    }
  };

  // Live conversion and pricing calculations
  const activeProduct = products.find(p => p._id === selectedProductId);
  let liveQtyInBase = 0;
  let liveCalculatedPrice = 0;
  let liveStockWarning = false;
  let liveError = false;

  if (activeProduct && orderQty && !isNaN(orderQty) && parseFloat(orderQty) > 0) {
    try {
      liveQtyInBase = convertQuantity(parseFloat(orderQty), orderUnit, activeProduct.baseUnit);
      liveCalculatedPrice = liveQtyInBase * activeProduct.pricePerUnit;
      liveStockWarning = liveQtyInBase > activeProduct.stock;
    } catch (e) {
      liveError = true;
    }
  }

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!selectedProductId || !orderQty || isNaN(orderQty) || parseFloat(orderQty) <= 0) {
      setError('Please select a product and enter a valid quantity.');
      return;
    }
    
    if (liveStockWarning) {
      setError(`Cannot add to order: Not enough stock for "${activeProduct.name}".`);
      return;
    }

    // Check if product is already in cart
    const existingIndex = cart.findIndex(item => item.product._id === selectedProductId);
    if (existingIndex > -1) {
      setError('Product is already in the order list. Edit or submit first.');
      return;
    }

    setCart([...cart, {
      product: activeProduct,
      quantity: parseFloat(orderQty),
      orderedUnit: orderUnit,
      calculatedPrice: liveCalculatedPrice,
      qtyInBase: liveQtyInBase
    }]);

    // Reset selectors
    setOrderQty('');
    setSuccess(`Added "${activeProduct.name}" to order list.`);
  };

  const handleRemoveFromCart = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      setError('Your order list is empty.');
      return;
    }
    setError('');
    
    const items = cart.map(item => ({
      productId: item.product._id,
      quantity: item.quantity,
      orderedUnit: item.orderedUnit
    }));

    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ items })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to place order');
      
      setSuccess('Quotation/Order placed successfully!');
      setCart([]);
      fetchOrders();
      fetchProducts(); // Refresh stocks
    } catch (err) {
      setError(err.message);
    }
  };

  // Product Filter and Search logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDim = filterDim ? p.dimension === filterDim : true;
    return matchesSearch && matchesDim;
  });

  return (
    <div>
      {/* App Header */}
      {token && (
        <header className="app-header">
          <div className="logo-container">
            <span className="logo-badge">AasaMedChem</span>
            <span className="logo-text">Inventory System</span>
          </div>
          <div className="user-info-section">
            <span className="text-secondary">Logged in as: <strong className="text-primary">{user?.username}</strong></span>
            <span className={`role-tag ${user?.role}`}>{user?.role}</span>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Logout</button>
          </div>
        </header>
      )}

      <main className="main-container">
        {/* Alerts */}
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* LOGIN SCREEN */}
        {!token && (
          <div className="login-wrapper">
            <div className="login-card">
              <h2>Sign In</h2>
              <p className="subtitle">MERN Inventory & Orders Management</p>
              
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    id="username"
                    type="text"
                    className="input-field"
                    placeholder="Enter username"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    className="input-field"
                    placeholder="Enter password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    required
                  />
                </div>
                
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                  Sign In
                </button>
              </form>

              <div className="auth-demo-hint">
                <strong>Demo Accounts:</strong>
                <table>
                  <tbody>
                    <tr>
                      <td>Admin:</td>
                      <td><code>admin</code> / <code>admin123</code></td>
                    </tr>
                    <tr>
                      <td>Seller:</td>
                      <td><code>seller</code> / <code>seller123</code></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* LOGGED IN VIEW */}
        {token && (
          <div>
            {/* Admin Panels */}
            {user?.role === 'admin' && (
              <div>
                {/* Admin Tabs */}
                <div className="tab-navigation">
                  <button 
                    className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
                    onClick={() => setActiveTab('inventory')}
                  >
                    Inventory Levels
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
                    onClick={() => setActiveTab('orders')}
                  >
                    Quotation & Orders Log
                  </button>
                </div>

                {/* Tab: Inventory & Products CRUD */}
                {activeTab === 'inventory' && (
                  <div className="glass-card">
                    <div className="section-title">
                      <h2>Product Inventory List</h2>
                      <button className="btn btn-primary btn-sm" onClick={openAddProductModal}>
                        + Add Product
                      </button>
                    </div>

                    {/* Search & Filter */}
                    <div className="search-bar-container">
                      <input
                        type="text"
                        placeholder="Search products..."
                        className="input-field search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <select 
                        className="filter-select"
                        value={filterDim}
                        onChange={(e) => setFilterDim(e.target.value)}
                      >
                        <option value="">All Dimensions</option>
                        <option value="weight">Weight</option>
                        <option value="volume">Volume</option>
                        <option value="count">Count</option>
                      </select>
                    </div>

                    {/* Products Table */}
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Product Name</th>
                            <th>Dimension</th>
                            <th>Base Storage Unit</th>
                            <th>Price per Base Unit</th>
                            <th>Available Stock</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProducts.length === 0 ? (
                            <tr>
                              <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                No products found.
                              </td>
                            </tr>
                          ) : (
                            filteredProducts.map(p => (
                              <tr key={p._id}>
                                <td><strong>{p.name}</strong></td>
                                <td style={{ textTransform: 'capitalize' }}>{p.dimension}</td>
                                <td><code>{p.baseUnit}</code></td>
                                <td className="price-inr">₹{p.pricePerUnit.toFixed(4)} / {p.baseUnit}</td>
                                <td>
                                  <span style={{ fontWeight: 600, color: p.stock <= 5 ? '#f87171' : 'var(--text-primary)' }}>
                                    {p.stock.toFixed(4)}
                                  </span> {p.baseUnit}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => openEditProductModal(p)}>Edit</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteProduct(p._id)}>Delete</button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab: Admin View Orders Log */}
                {activeTab === 'orders' && (
                  <div className="glass-card">
                    <h2>Quotation & Orders Log</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                      Review incoming quotations and verify conversion logic.
                    </p>

                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Date / Time</th>
                            <th>Seller</th>
                            <th>Items Ordered & Unit Conversions</th>
                            <th>Total Price</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.length === 0 ? (
                            <tr>
                              <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                No orders logged.
                              </td>
                            </tr>
                          ) : (
                            orders.map(o => (
                              <tr key={o._id}>
                                <td>{new Date(o.createdAt).toLocaleString()}</td>
                                <td>{o.user?.username}</td>
                                <td>
                                  <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                                    {o.items.map((item, idx) => (
                                      <li key={idx} style={{ marginBottom: '0.25rem' }}>
                                        <strong>{item.productName}</strong>: {item.orderedQuantity} {item.orderedUnit} 
                                        <span style={{ color: 'var(--text-secondary)' }}>
                                          &nbsp;(converted to: {item.quantityInBaseUnit.toFixed(4)} {products.find(p => p._id === item.product)?.baseUnit || ''})
                                        </span>
                                        <span className="price-inr" style={{ marginLeft: '0.5rem' }}>
                                          = ₹{item.calculatedPrice.toFixed(2)}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </td>
                                <td className="price-inr" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                  ₹{o.totalPrice.toFixed(2)}
                                </td>
                                <td>
                                  <span className={`status-badge ${o.status}`}>{o.status}</span>
                                </td>
                                <td>
                                  {o.status === 'pending' ? (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      <button className="btn btn-success btn-sm" onClick={() => handleUpdateOrderStatus(o._id, 'approved')}>Approve</button>
                                      <button className="btn btn-danger btn-sm" onClick={() => handleUpdateOrderStatus(o._id, 'rejected')}>Reject</button>
                                    </div>
                                  ) : (
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Closed</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Seller/User Panels */}
            {user?.role === 'seller' && (
              <div>
                <div className="tab-navigation">
                  <button 
                    className={`tab-btn ${activeTab === 'browse' ? 'active' : ''}`}
                    onClick={() => setActiveTab('browse')}
                  >
                    Place Quotation / Order
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'my_orders' ? 'active' : ''}`}
                    onClick={() => setActiveTab('my_orders')}
                  >
                    My Past Orders
                  </button>
                </div>

                {activeTab === 'browse' && (
                  <div className="dashboard-grid">
                    {/* Left: Product Browser */}
                    <div className="glass-card">
                      <h2>Available Product Catalogue</h2>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                        Browse products, available units, prices, and stocks.
                      </p>

                      <div className="search-bar-container">
                        <input
                          type="text"
                          placeholder="Search product..."
                          className="input-field search-input"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <select 
                          className="filter-select"
                          value={filterDim}
                          onChange={(e) => setFilterDim(e.target.value)}
                        >
                          <option value="">All Dimensions</option>
                          <option value="weight">Weight</option>
                          <option value="volume">Volume</option>
                          <option value="count">Count</option>
                        </select>
                      </div>

                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>Dimension</th>
                              <th>Base Price</th>
                              <th>Available Stock</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredProducts.map(p => (
                              <tr 
                                key={p._id} 
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  setSelectedProductId(p._id);
                                  setOrderUnit(p.baseUnit);
                                }}
                              >
                                <td>
                                  <strong>{p.name}</strong>
                                  {selectedProductId === p._id && <span style={{ color: 'var(--accent-primary)', marginLeft: '0.5rem', fontSize: '0.75rem' }}>● Selected</span>}
                                </td>
                                <td style={{ textTransform: 'capitalize' }}>{p.dimension}</td>
                                <td className="price-inr">₹{p.pricePerUnit.toFixed(2)} / {p.baseUnit}</td>
                                <td>{p.stock.toFixed(2)} {p.baseUnit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Right: Cart & Order Placement Panel */}
                    <div>
                      {/* Add Item form */}
                      <div className="glass-card">
                        <h3>Add to Order</h3>
                        <form onSubmit={handleAddToCart} style={{ marginTop: '1rem' }}>
                          <div className="form-group">
                            <label>Product</label>
                            <select value={selectedProductId} onChange={handleSelectedProductChange} required>
                              <option value="">-- Choose Product --</option>
                              {products.map(p => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                              ))}
                            </select>
                          </div>

                          {activeProduct && (
                            <div className="input-row">
                              <div className="form-group">
                                <label>Quantity</label>
                                <input
                                  type="number"
                                  step="any"
                                  className="input-field"
                                  placeholder="e.g. 500"
                                  value={orderQty}
                                  onChange={(e) => setOrderQty(e.target.value)}
                                  required
                                />
                              </div>

                              <div className="form-group">
                                <label>Unit</label>
                                <select 
                                  value={orderUnit} 
                                  onChange={(e) => setOrderUnit(e.target.value)}
                                >
                                  {DIMENSION_UNITS[activeProduct.dimension].map(u => (
                                    <option key={u} value={u}>{u}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}

                          {/* Live Conversion & Verification */}
                          {activeProduct && orderQty && (
                            <div className="conversion-preview">
                              <h4>Live Conversion & Verification</h4>
                              <div className="conversion-detail-grid">
                                <span className="conversion-detail-label">Base storage unit:</span>
                                <span className="conversion-detail-value">{activeProduct.baseUnit}</span>

                                <span className="conversion-detail-label">Stock available:</span>
                                <span className="conversion-detail-value">{activeProduct.stock.toFixed(4)} {activeProduct.baseUnit}</span>

                                <span className="conversion-detail-label">Requested quantity in base:</span>
                                <span className="conversion-detail-value" style={{ color: liveStockWarning ? '#f87171' : 'var(--text-primary)' }}>
                                  {liveQtyInBase.toFixed(4)} {activeProduct.baseUnit}
                                </span>

                                <span className="conversion-detail-label">Calculated Price:</span>
                                <span className="conversion-detail-value price-inr">₹{liveCalculatedPrice.toFixed(2)}</span>
                              </div>

                              {liveStockWarning && (
                                <div style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.75rem', fontWeight: 600 }}>
                                  ⚠️ Warning: Requested quantity exceeds available stock!
                                </div>
                              )}
                            </div>
                          )}

                          <button 
                            type="submit" 
                            className="btn btn-primary" 
                            style={{ width: '100%', marginTop: '1.25rem' }}
                            disabled={!activeProduct || !orderQty || liveStockWarning}
                          >
                            + Add to Order List
                          </button>
                        </form>
                      </div>

                      {/* Current Cart */}
                      <div className="glass-card">
                        <h3>Current Order Items</h3>
                        <div style={{ marginTop: '1rem' }}>
                          {cart.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No items added yet. Choose a product above.</p>
                          ) : (
                            <div className="cart-list">
                              {cart.map((item, idx) => (
                                <div className="cart-item" key={idx}>
                                  <div>
                                    <div className="cart-item-name">{item.product.name}</div>
                                    <div className="cart-item-desc">
                                      {item.quantity} {item.orderedUnit} ({item.qtyInBase.toFixed(2)} {item.product.baseUnit})
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span className="cart-item-price">₹{item.calculatedPrice.toFixed(2)}</span>
                                    <button 
                                      className="btn btn-danger btn-sm cart-item-actions"
                                      onClick={() => handleRemoveFromCart(idx)}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              ))}
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderTop: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                                <strong>Total Price:</strong>
                                <span className="price-inr" style={{ fontSize: '1.15rem', fontWeight: 'bold' }}>
                                  ₹{cart.reduce((sum, item) => sum + item.calculatedPrice, 0).toFixed(2)}
                                </span>
                              </div>

                              <button 
                                className="btn btn-success" 
                                style={{ width: '100%' }}
                                onClick={handleSubmitOrder}
                              >
                                Submit Quotation & Place Order
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'my_orders' && (
                  <div className="glass-card">
                    <h2>My Past Orders</h2>
                    <div className="table-container" style={{ marginTop: '1.25rem' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Date / Time</th>
                            <th>Items Ordered</th>
                            <th>Total Price</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.length === 0 ? (
                            <tr>
                              <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                You have not placed any orders yet.
                              </td>
                            </tr>
                          ) : (
                            orders.map(o => (
                              <tr key={o._id}>
                                <td>{new Date(o.createdAt).toLocaleString()}</td>
                                <td>
                                  <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                                    {o.items.map((item, idx) => (
                                      <li key={idx} style={{ marginBottom: '0.25rem' }}>
                                        <strong>{item.productName}</strong>: {item.orderedQuantity} {item.orderedUnit}
                                        <span className="price-inr" style={{ marginLeft: '0.5rem' }}>
                                          = ₹{item.calculatedPrice.toFixed(2)}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </td>
                                <td className="price-inr" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                  ₹{o.totalPrice.toFixed(2)}
                                </td>
                                <td>
                                  <span className={`status-badge ${o.status}`}>{o.status}</span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Admin Product Form Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
            <form onSubmit={handleProductSubmit}>
              <div className="form-group">
                <label htmlFor="prodName">Product Name</label>
                <input
                  id="prodName"
                  type="text"
                  className="input-field"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="prodDimension">Dimension</label>
                <select 
                  id="prodDimension"
                  value={productForm.dimension} 
                  onChange={handleProductDimensionChange}
                  disabled={!!editingProduct}
                >
                  <option value="weight">Weight (g, kg)</option>
                  <option value="volume">Volume (mL, L)</option>
                  <option value="count">Count (unit)</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="prodBaseUnit">Base Storage Unit</label>
                <select 
                  id="prodBaseUnit"
                  value={productForm.baseUnit} 
                  onChange={(e) => setProductForm({ ...productForm, baseUnit: e.target.value })}
                  disabled={!!editingProduct}
                >
                  {productForm.dimension === 'weight' && (
                    <>
                      <option value="g">Grams (g)</option>
                      <option value="kg">Kilograms (kg)</option>
                    </>
                  )}
                  {productForm.dimension === 'volume' && (
                    <>
                      <option value="mL">Milliliters (mL)</option>
                      <option value="L">Liters (L)</option>
                    </>
                  )}
                  {productForm.dimension === 'count' && (
                    <option value="unit">Items (unit)</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="prodPrice">Price per Base Unit (INR)</label>
                <input
                  id="prodPrice"
                  type="number"
                  step="any"
                  className="input-field"
                  placeholder="e.g. 500"
                  value={productForm.pricePerUnit}
                  onChange={(e) => setProductForm({ ...productForm, pricePerUnit: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="prodStock">Current Stock Level (in base unit)</label>
                <input
                  id="prodStock"
                  type="number"
                  step="any"
                  className="input-field"
                  placeholder="e.g. 100"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
