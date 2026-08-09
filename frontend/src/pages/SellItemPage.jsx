import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { createMarketplaceItem } from '../api/marketplace';

export default function SellItemPage() {
  const { token, logout, view, setView } = useAuth();

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [pricingType, setPricingType] = useState('Fixed Price'); // 'Fixed Price' | 'Negotiable'
  const [category, setCategory] = useState('books');
  const [description, setDescription] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // SVG default template fallback if user doesn't upload a picture
  const createDefaultSvgImage = (itemTitle, itemCategory) => {
    const titleText = itemTitle ? itemTitle.substring(0, 18) : 'UVCE ITEM';
    const categoryText = itemCategory ? itemCategory.toUpperCase() : 'MARKETPLACE';
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="none"><rect width="400" height="300" fill="%23eff6ff"/><rect x="80" y="50" width="240" height="200" rx="12" fill="white" stroke="%23bfdbfe" stroke-width="2"/><text x="200" y="140" font-family="sans-serif" font-size="16" font-weight="bold" fill="%232563eb" text-anchor="middle">${encodeURIComponent(titleText)}</text><text x="200" y="170" font-family="sans-serif" font-size="12" font-weight="600" fill="%2364748b" text-anchor="middle">${encodeURIComponent(categoryText)}</text></svg>`;
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file size must be under 5MB.');
        return;
      }
      setError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please enter an item title.');
      return;
    }

    if (!price || isNaN(price) || Number(price) <= 0) {
      setError('Please enter a valid positive price.');
      return;
    }

    setSubmitting(true);

    const finalImage = imagePreview || createDefaultSvgImage(title, category);

    const newItemData = {
      title: title.trim(),
      price: Number(price),
      pricingType,
      category,
      description: description.trim(),
      image: finalImage,
    };

    try {
      await createMarketplaceItem(newItemData, token);
      setView('marketplace');
    } catch (err) {
      console.error('Failed to add marketplace item:', err);
      setError(err.message || 'Failed to save listing. Please try again.');
      setSubmitting(false);
    }
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
        <button id="logout-btn" className="btn-secondary" onClick={logout}>
          <span>🔒</span> Log Out
        </button>
      </header>

      {/* Main Container */}
      <main className="sell-container">
        <div className="sell-card">
          <div className="sell-header">
            <button className="back-link-btn" onClick={() => setView('marketplace')}>
              ← Back to Marketplace
            </button>
            <h1 className="sell-title">List an Item for Sale</h1>
            <p className="sell-subtitle">
              Reach other UVCE students to sell your textbooks, notes, or equipment.
            </p>
          </div>

          {error && (
            <div className="alert-banner alert-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Title */}
            <div className="form-group">
              <label htmlFor="item-title" className="form-label">
                Item Title <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input
                id="item-title"
                type="text"
                className="form-input"
                placeholder="e.g. Engineering Mathematics III (B.S. Grewal)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Price & Pricing Type Grid */}
            <div className="form-row-2">
              {/* Price */}
              <div className="form-group">
                <label htmlFor="item-price" className="form-label">
                  Price (₹) <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  id="item-price"
                  type="number"
                  min="1"
                  step="1"
                  className="form-input"
                  placeholder="e.g. 350"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>

              {/* Negotiable vs Fixed Price */}
              <div className="form-group">
                <label className="form-label">
                  Pricing Tag <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <div className="pricing-radio-group">
                  <label className={`pricing-radio-btn ${pricingType === 'Fixed Price' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="pricingType"
                      value="Fixed Price"
                      checked={pricingType === 'Fixed Price'}
                      onChange={() => setPricingType('Fixed Price')}
                    />
                    <span>🏷️ Fixed Price</span>
                  </label>
                  <label className={`pricing-radio-btn ${pricingType === 'Negotiable' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="pricingType"
                      value="Negotiable"
                      checked={pricingType === 'Negotiable'}
                      onChange={() => setPricingType('Negotiable')}
                    />
                    <span>🤝 Negotiable</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="form-group">
              <label htmlFor="item-category" className="form-label">
                Category
              </label>
              <select
                id="item-category"
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="books">Books & Textbooks</option>
                <option value="calculator">Calculators</option>
                <option value="equipment">Lab Equipment & Drafters</option>
                <option value="notes">Notes & Study Materials</option>
                <option value="other">Other Accessories</option>
              </select>
            </div>

            {/* Photo Upload */}
            <div className="form-group">
              <label htmlFor="item-photo" className="form-label">
                Photo Upload
              </label>
              <div className="image-upload-wrapper">
                <input
                  id="item-photo"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="file-input-hidden"
                />
                <label htmlFor="item-photo" className="image-upload-box">
                  {imagePreview ? (
                    <div className="preview-container">
                      <img src={imagePreview} alt="Preview" className="upload-preview-img" />
                      <span className="change-photo-badge">Change Photo</span>
                    </div>
                  ) : (
                    <div className="upload-placeholder">
                      <div className="upload-icon">📷</div>
                      <span className="upload-text">Click to upload a photo of the item</span>
                      <span className="field-hint">PNG, JPG or WEBP (Max 5MB)</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Description (Optional) */}
            <div className="form-group">
              <label htmlFor="item-description" className="form-label">
                Description <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>(Optional)</span>
              </label>
              <textarea
                id="item-description"
                className="form-input"
                rows="4"
                placeholder="Mention item condition, edition, semester, syllabus details, or pickup spot on campus..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="spinner"></span> Posting...
                  </>
                ) : (
                  'Post Listing'
                )}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setView('marketplace')}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
