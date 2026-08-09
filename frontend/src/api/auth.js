// Auth API client for Sync-UVCE

const API_BASE_URL = '';

/**
 * Register a new user account.
 * @param {Object} userData - { name, email, password }
 */
export async function registerUser({ name, email, password }) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    let errorMsg = data.detail || 'Registration failed. Please try again.';
    if (Array.isArray(data.detail)) {
      errorMsg = data.detail.map((err) => err.msg).join(', ');
    }
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Login user and receive JWT access token.
 * @param {Object} credentials - { email, password }
 */
export async function loginUser({ email, password }) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    let errorMsg = data.detail || 'Invalid email or password';
    if (Array.isArray(data.detail)) {
      errorMsg = data.detail.map((err) => err.msg).join(', ');
    }
    throw new Error(errorMsg);
  }

  return data; // { access_token, token_type }
}

/**
 * Fetch profile of currently logged-in user.
 * @param {string} token - JWT access token
 */
export async function getCurrentUser(token) {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'Session expired. Please log in again.');
  }

  return data; // { id, name, email, role, is_verified, created_at }
}
