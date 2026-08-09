import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../components/AuthContext';
import {
  getMarketplaceItems,
  deleteMarketplaceItem,
  extendMarketplaceItem,
} from '../api/marketplace';

// SVG default template fallback if item image is null
const createDefaultSvgImage = (itemTitle, itemCategory) => {
  const titleText = itemTitle ? itemTitle.substring(0, 18) : 'UVCE ITEM';
  const categoryText = itemCategory ? itemCategory.toUpperCase() : 'MARKETPLACE';
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="none"><rect width="400" height="300" fill="%23eff6ff"/><rect x="80" y="50" width="240" height="200" rx="12" fill="white" stroke="%23bfdbfe" stroke-width="2"/><text x="200" y="140" font-family="sans-serif" font-size="16" font-weight="bold" fill="%232563eb" text-anchor="middle">${encodeURIComponent(titleText)}</text><text x="200" y="170" font-family="sans-serif" font-size="12" font-weight="600" fill="%2364748b" text-anchor="middle">${encodeURIComponent(categoryText)}</text></svg>`;
};

export default function MarketplacePage() {
  const { user, token, logout, view, setView } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [actionInProgress, setActionInProgress] = useState(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMarketplaceItems(selectedCategory, searchQuery);
      setItems(data);
    } catch (err) {
      console.error('Failed to load marketplace items:', err);
      setError(err.message || 'Failed to load marketplace items.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleDelete = async (itemId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    setActionInProgress(itemId);
    try {
      await deleteMarketplaceItem(itemId, token);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      alert(err.message || 'Failed to delete listing.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleExtend = async (itemId) => {
    setActionInProgress(itemId);
    try {
      const updatedItem = await extendMarketplaceItem(itemId, token);
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? updatedItem : item))
      );
    } catch (err) {
      alert(err.message || 'Failed to extend listing expiry.');
    } finally {
      setActionInProgress(null);
    }
  };

  const calculateDaysLeft = (expiresAt) => {
    if (!expiresAt) return null;
    const diffMs = new Date(expiresAt) - new Date();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  };

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
              <option value="other">Other Accessories</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="alert-banner alert-error" style={{ marginBottom: '20px' }}>
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span className="spinner" style={{ width: '32px', height: '32px' }}></span>
            <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Loading marketplace listings...</p>
          </div>
        ) : items.length === 0 ? (
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
            {items.map((item) => {
              const isOwner = user && Number(item.seller_id) === Number(user.id);
              const daysLeft = calculateDaysLeft(item.expiresAt);
              const showExtendBanner = isOwner && daysLeft !== null && daysLeft <= 2 && daysLeft > 0;

              return (
                <div key={item.id} className="product-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="product-image-container">
                    <img
                      src={item.image || createDefaultSvgImage(item.title, item.category)}
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

                    {/* Expiry Badge */}
                    {daysLeft !== null && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          left: '8px',
                          backgroundColor: daysLeft <= 2 ? '#ef4444' : 'rgba(15, 23, 42, 0.75)',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '3px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        ⏳ {daysLeft <= 0 ? 'Expired' : `Expires in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`}
                      </span>
                    )}
                  </div>

                  <div className="product-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="product-price">₹{Number(item.price).toLocaleString('en-IN')}</div>
                    <h3 className="product-title" title={item.title}>
                      {item.title}
                    </h3>
                    <p className="product-description" style={{ flex: 1 }}>
                      {item.description || 'No description provided.'}
                    </p>

                    {/* Extend Prompt Banner for Seller if 2 or fewer days remain */}
                    {showExtendBanner && (
                      <div
                        style={{
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fca5a5',
                          borderRadius: '6px',
                          padding: '8px 10px',
                          margin: '8px 0',
                          fontSize: '12px',
                          color: '#991b1b',
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <span>This listing expires soon — extend by 5 days?</span>
                        <button
                          className="btn-primary"
                          style={{
                            width: 'auto',
                            padding: '3px 8px',
                            fontSize: '11px',
                            backgroundColor: '#dc2626',
                            margin: 0,
                          }}
                          disabled={actionInProgress === item.id}
                          onClick={() => handleExtend(item.id)}
                        >
                          {actionInProgress === item.id ? 'Extending...' : 'Extend'}
                        </button>
                      </div>
                    )}

                    <div className="product-footer" style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="seller-info">👤 {item.sellerName}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="post-date">
                          {new Date(item.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>

                        {/* Owner-Only Delete Button */}
                        {isOwner && (
                          <button
                            className="btn-secondary"
                            title="Delete this listing"
                            style={{
                              padding: '2px 8px',
                              fontSize: '12px',
                              color: '#dc2626',
                              borderColor: '#fca5a5',
                              backgroundColor: '#fff5f5',
                            }}
                            disabled={actionInProgress === item.id}
                            onClick={() => handleDelete(item.id, item.title)}
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
