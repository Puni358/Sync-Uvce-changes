import React from 'react';
import { useAuth } from '../components/AuthContext';

export default function DashboardPage() {
  const { user, logout, loadingProfile } = useAuth();

  if (loadingProfile) {
    return (
      <div className="auth-container">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent', width: '32px', height: '32px', margin: '0 auto 16px' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Top Navbar */}
      <header className="dashboard-navbar">
        <div className="dashboard-brand">
          <span className="auth-logo" style={{ width: '36px', height: '36px', fontSize: '16px', margin: 0 }}>UV</span>
          Sync-UVCE
        </div>
        <button id="logout-btn" className="btn-secondary" onClick={logout}>
          <span>🔒</span> Log Out
        </button>
      </header>

      {/* Main Profile / Dashboard Content */}
      <main className="dashboard-container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="profile-title">Welcome, {user.name}!</h2>
              <p className="profile-subtitle">Authenticated UVCE Student Session</p>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">User ID</div>
              <div className="info-value">#{user.id}</div>
            </div>

            <div className="info-item">
              <div className="info-label">Full Name</div>
              <div className="info-value">{user.name}</div>
            </div>

            <div className="info-item">
              <div className="info-label">College Email</div>
              <div className="info-value">{user.email}</div>
            </div>

            <div className="info-item">
              <div className="info-label">Account Role</div>
              <div className="info-value">
                <span className="badge badge-student">{user.role}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-label">Verification Status</div>
              <div className="info-value">
                <span className={`badge ${user.is_verified ? 'badge-verified' : 'badge-unverified'}`}>
                  {user.is_verified ? 'Verified Student' : 'Pending Verification'}
                </span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-label">Account Created</div>
              <div className="info-value">
                {user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recently'}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
