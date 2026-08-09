import React from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import MarketplacePage from './pages/MarketplacePage';
import SellItemPage from './pages/SellItemPage';

function AppContent() {
  const { view } = useAuth();

  switch (view) {
    case 'register':
      return <RegisterPage />;
    case 'dashboard':
      return <DashboardPage />;
    case 'marketplace':
      return <MarketplacePage />;
    case 'sell':
      return <SellItemPage />;
    case 'login':
    default:
      return <LoginPage />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
