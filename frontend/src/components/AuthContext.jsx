import React, { createContext, useContext, useState } from 'react';
import { getCurrentUser } from '../api/auth';
import { getMarketplaceItems, saveMarketplaceItems } from '../api/marketplace';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null); // In-memory JWT storage
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); // 'login' | 'register' | 'dashboard' | 'marketplace' | 'sell'
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [marketplaceItems, setMarketplaceItems] = useState(getMarketplaceItems);

  /**
   * Called upon successful login with JWT access token.
   */
  const handleLoginSuccess = async (newToken) => {
    setToken(newToken);
    setLoadingProfile(true);
    try {
      const userProfile = await getCurrentUser(newToken);
      setUser(userProfile);
      setView('dashboard');
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setToken(null);
      setUser(null);
      setView('login');
      throw err;
    } finally {
      setLoadingProfile(false);
    }
  };

  /**
   * Add a new marketplace item to state and storage, then switch back to marketplace view.
   */
  const addMarketplaceItem = (newItem) => {
    const item = {
      id: `item-${Date.now()}`,
      createdAt: new Date().toISOString(),
      sellerName: user?.name || 'UVCE Student',
      ...newItem,
    };
    const updated = [item, ...marketplaceItems];
    setMarketplaceItems(updated);
    saveMarketplaceItems(updated);
    setView('marketplace');
  };

  /**
   * Logs out the user by clearing in-memory token and user data.
   */
  const logout = () => {
    setToken(null);
    setUser(null);
    setView('login');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        setUser,
        view,
        setView,
        handleLoginSuccess,
        logout,
        loadingProfile,
        marketplaceItems,
        addMarketplaceItem,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

