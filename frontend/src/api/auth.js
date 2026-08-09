// Auth API client for Sync-UVCE

const API_BASE_URL = '';

/**
 * Helper to safely parse response body as JSON or extract clear error message
 */
async function parseResponse(response, defaultErrorMsg) {
  let data = null;
  const text = await response.text();
  
  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Body was not JSON (e.g. proxy HTML error page or plain text)
      data = null;
    }
  }

  if (!response.ok) {
    let errorMsg = data?.detail;
    if (Array.isArray(data?.detail)) {
      errorMsg = data.detail.map((err) => err.msg).join(', ');
    }
    if (!errorMsg) {
      errorMsg = `${defaultErrorMsg} (Status: ${response.status}). Please check if the backend server is running on port 8000.`;
    }
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Register a new user account.
 * @param {Object} userData - { name, email, password }
 */
export async function registerUser({ name, email, password }) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password }),
    });

    return await parseResponse(response, 'Registration failed');
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Could not connect to server. Please ensure backend server is running on http://127.0.0.1:8000.');
    }
    throw err;
  }
}

/**
 * Login user and receive JWT access token.
 * @param {Object} credentials - { email, password }
 */
export async function loginUser({ email, password }) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    return await parseResponse(response, 'Invalid email or password');
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Could not connect to server. Please ensure backend server is running on http://127.0.0.1:8000.');
    }
    throw err;
  }
}

/**
 * Fetch profile of currently logged-in user.
 * @param {string} token - JWT access token
 */
export async function getCurrentUser(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return await parseResponse(response, 'Session expired. Please log in again.');
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Could not connect to server. Please ensure backend server is running on http://127.0.0.1:8000.');
    }
    throw err;
  }
}
