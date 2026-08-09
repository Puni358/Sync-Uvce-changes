import React, { createContext, useContext, useState } from 'react';
import { getCurrentUser } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null); // In-memory JWT storage
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); // 'login' | 'register' | 'dashboard'
  const [loadingProfile, setLoadingProfile] = useState(false);

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
