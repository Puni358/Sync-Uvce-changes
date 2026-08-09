// Marketplace API Client for Sync-UVCE (Connected to FastAPI Backend)

const API_BASE_URL = '';

/**
 * Safe parser helper for HTTP response
 */
async function parseResponse(response, defaultErrorMsg) {
  let data = null;
  const text = await response.text();

  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = null;
    }
  }

  if (!response.ok) {
    let errorMsg = data?.detail;
    if (Array.isArray(data?.detail)) {
      errorMsg = data.detail.map((err) => err.msg).join(', ');
    }
    if (!errorMsg) {
      errorMsg = `${defaultErrorMsg} (Status: ${response.status}).`;
    }
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Map backend Item item response schema to match frontend component properties seamlessly.
 */
function normalizeItem(item) {
  return {
    id: item.id,
    seller_id: item.seller_id,
    sellerName: item.seller_name || 'UVCE Student',
    title: item.title,
    description: item.description || '',
    price: item.price,
    pricingType: item.pricing_type || 'Fixed Price',
    category: item.category,
    image: item.image_path || null,
    status: item.status,
    createdAt: item.created_at,
    expiresAt: item.expires_at,
  };
}

/**
 * Fetch available marketplace items filtered by category and search query.
 * @param {string} category - optional category filter ('all', 'books', 'calculator', etc.)
 * @param {string} search - optional search query
 */
export async function getMarketplaceItems(category = 'all', search = '') {
  try {
    const params = new URLSearchParams();
    if (category && category !== 'all') {
      params.append('category', category);
    }
    if (search && search.trim()) {
      params.append('search', search.trim());
    }

    const queryString = params.toString();
    const url = `${API_BASE_URL}/marketplace/items${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const items = await parseResponse(response, 'Failed to fetch marketplace listings');
    return Array.isArray(items) ? items.map(normalizeItem) : [];
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Could not connect to server. Please ensure backend server is running on http://127.0.0.1:8000.');
    }
    throw err;
  }
}

/**
 * Create a new marketplace listing (authenticated).
 * @param {Object} itemData - { title, description, price, pricingType, category, image }
 * @param {string} token - JWT access token
 */
export async function createMarketplaceItem(itemData, token) {
  try {
    const payload = {
      title: itemData.title,
      description: itemData.description || null,
      price: Number(itemData.price),
      pricing_type: itemData.pricingType || itemData.pricing_type || 'Fixed Price',
      category: itemData.category,
      image_path: itemData.image || itemData.image_path || null,
    };

    const response = await fetch(`${API_BASE_URL}/marketplace/items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const created = await parseResponse(response, 'Failed to create listing');
    return normalizeItem(created);
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Could not connect to server. Please ensure backend server is running on http://127.0.0.1:8000.');
    }
    throw err;
  }
}

/**
 * Delete a marketplace listing by ID (owner only).
 * @param {number|string} itemId
 * @param {string} token - JWT access token
 */
export async function deleteMarketplaceItem(itemId, token) {
  try {
    const response = await fetch(`${API_BASE_URL}/marketplace/items/${itemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 204) {
      return true;
    }
    return await parseResponse(response, 'Failed to delete listing');
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Could not connect to server. Please ensure backend server is running on http://127.0.0.1:8000.');
    }
    throw err;
  }
}

/**
 * Extend expires_at by 5 days for an active listing (owner only).
 * @param {number|string} itemId
 * @param {string} token - JWT access token
 */
export async function extendMarketplaceItem(itemId, token) {
  try {
    const response = await fetch(`${API_BASE_URL}/marketplace/items/${itemId}/extend`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const updated = await parseResponse(response, 'Failed to extend listing duration');
    return normalizeItem(updated);
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Could not connect to server. Please ensure backend server is running on http://127.0.0.1:8000.');
    }
    throw err;
  }
}
