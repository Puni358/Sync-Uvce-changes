import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { loginUser } from '../api/auth';

export default function LoginPage() {
  const { setView, handleLoginSuccess } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setServerError('');
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.email.trim()) {
      errors.email = 'Please enter your email address.';
    }
    if (!formData.password) {
      errors.password = 'Please enter your password.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const data = await loginUser({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      // Pass token to AuthContext which fetches user profile and redirects to dashboard
      await handleLoginSuccess(data.access_token);
    } catch (err) {
      // Show generic error message on login failure as mandated by security requirements
      setServerError(err.message || 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">UV</div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Log in to Sync-UVCE student portal</p>
        </div>

        {serverError && (
          <div className="alert-banner alert-error" role="alert">
            <span>⚠️</span>
            <div>{serverError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">College Email</label>
            <input
              id="login-email"
              type="email"
              name="email"
              placeholder="student@uvce.ac.in"
              value={formData.email}
              onChange={handleChange}
              className={`form-input ${fieldErrors.email ? 'has-error' : ''}`}
              disabled={submitting}
            />
            {fieldErrors.email && (
              <span className="field-error">❌ {fieldErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              className={`form-input ${fieldErrors.password ? 'has-error' : ''}`}
              disabled={submitting}
            />
            {fieldErrors.password && (
              <span className="field-error">❌ {fieldErrors.password}</span>
            )}
          </div>

          <button
            type="submit"
            id="login-submit-btn"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="spinner"></span>
                Logging in...
              </>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <span
            id="link-to-register"
            className="auth-link"
            onClick={() => setView('register')}
          >
            Register here
          </span>
        </div>
      </div>
    </div>
  );
}
