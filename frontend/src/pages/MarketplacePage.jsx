import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';

export default function MarketplacePage() {
  const { user, logout, view, setView, marketplaceItems } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredItems = marketplaceItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Top Navbar */}
      <header className="dashboard-navbar">
        <div className="nav-left">
          <div className="dashboard-brand" onClick={() => setView('dashboard')} style={{ cursor: 'pointer' }}>
            <span className="auth-logo" style={{ width: '36px', height: '36px', fontSize: '16px', margin: 0 }}>UV</span>
            Sync-UVCE
          </div>
          <nav className="nav-menu">
            <button
              className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
              onClick={() => setView('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`nav-item ${view === 'marketplace' || view === 'sell' ? 'active' : ''}`}
              onClick={() => setView('marketplace')}
            >
              Marketplace
            </button>
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn-primary" onClick={() => setView('sell')} style={{ width: 'auto', margin: 0, padding: '8px 16px', fontSize: '14px' }}>
            <span>+</span> Sell Item
          </button>
          <button id="logout-btn" className="btn-secondary" onClick={logout}>
            <span>🔒</span> Log Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="marketplace-container">
        {/* Header & Controls Banner */}
        <div className="marketplace-header-card">
          <div className="marketplace-header-text">
            <h1 className="marketplace-title">Student Marketplace</h1>
            <p className="marketplace-subtitle">
              Buy and sell textbooks, calculators, lab coats, and study materials directly within UVCE.
            </p>
          </div>
          <div className="marketplace-controls">
            <input
              type="text"
              className="form-input search-input"
              placeholder="Search listings (e.g. Maths, Casio, Notes)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="form-input category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="books">Books & Textbooks</option>
              <option value="calculator">Calculators</option>
              <option value="equipment">Lab Equipment & Drafters</option>
              <option value="notes">Notes & Study Guides</option>
            </select>
          </div>
        </div>

        {/* Listings Grid */}
        {filteredItems.length === 0 ? (
          <div className="empty-marketplace">
            <div className="empty-icon">📦</div>
            <h3>No items found</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
              Try adjusting your search query or category filter, or list the first item!
            </p>
            <button
              className="btn-primary"
              style={{ width: 'auto', marginTop: '16px' }}
              onClick={() => setView('sell')}
            >
              List an Item for Sale
            </button>
          </div>
        ) : (
          <div className="marketplace-grid">
            {filteredItems.map((item) => (
              <div key={item.id} className="product-card">
                <div className="product-image-container">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="product-image"
                  />
                  <span
                    className={`badge ${
                      item.pricingType === 'Negotiable'
                        ? 'badge-negotiable'
                        : 'badge-fixed'
                    } product-badge`}
                  >
                    {item.pricingType}
                  </span>
                </div>
                <div className="product-content">
                  <div className="product-price">₹{Number(item.price).toLocaleString('en-IN')}</div>
                  <h3 className="product-title" title={item.title}>
                    {item.title}
                  </h3>
                  <p className="product-description">
                    {item.description || 'No description provided.'}
                  </p>
                  <div className="product-footer">
                    <span className="seller-info">👤 {item.sellerName}</span>
                    <span className="post-date">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) for Sell */}
      <button
        className="fab-sell-btn"
        onClick={() => setView('sell')}
        title="Sell an Item"
      >
        <span>+</span> Sell
      </button>
    </div>
  );
}
