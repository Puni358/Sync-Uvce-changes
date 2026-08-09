import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { registerUser } from '../api/auth';

export default function RegisterPage() {
  const { setView } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for edited field
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setServerError('');
  };

  const validateForm = () => {
    const errors = {};
    const emailClean = formData.email.trim().toLowerCase();

    if (!formData.name.trim()) {
      errors.name = 'Please enter your full name.';
    }

    // Basic email format check (accepts any valid email format)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailClean) {
      errors.email = 'Please enter your email address.';
    } else if (!emailRegex.test(emailClean)) {
      errors.email = 'Please enter a valid email address.';
    }
    // NOTE: Domain restriction can be added later (e.g. else if (!emailClean.endsWith('@uvce.ac.in')))

    if (!formData.password) {
      errors.password = 'Please enter a password.';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      await registerUser({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      setSuccessMessage('Account created successfully! You can now log in.');
      setTimeout(() => {
        setView('login');
      }, 1500);
    } catch (err) {
      setServerError(err.message || 'Failed to register account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">UV</div>
          <h1 className="auth-title">Create an Account</h1>
          <p className="auth-subtitle">Join Sync-UVCE student portal</p>
        </div>

        {serverError && (
          <div className="alert-banner alert-error" role="alert">
            <span>⚠️</span>
            <div>{serverError}</div>
          </div>
        )}

        {successMessage && (
          <div className="alert-banner alert-success" role="alert">
            <span>✅</span>
            <div>{successMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="register-name">Full Name</label>
            <input
              id="register-name"
              type="text"
              name="name"
              placeholder="e.g. Rahul Sharma"
              value={formData.name}
              onChange={handleChange}
              className={`form-input ${fieldErrors.name ? 'has-error' : ''}`}
              disabled={submitting}
            />
            {fieldErrors.name && (
              <span className="field-error">❌ {fieldErrors.name}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">Email Address</label>
            <input
              id="register-email"
              type="email"
              name="email"
              placeholder="student@example.com"
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
            <label className="form-label" htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              name="password"
              placeholder="Minimum 8 characters"
              value={formData.password}
              onChange={handleChange}
              className={`form-input ${fieldErrors.password ? 'has-error' : ''}`}
              disabled={submitting}
            />
            {fieldErrors.password && (
              <span className="field-error">❌ {fieldErrors.password}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-confirmPassword">Confirm Password</label>
            <input
              id="register-confirmPassword"
              type="password"
              name="confirmPassword"
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`form-input ${fieldErrors.confirmPassword ? 'has-error' : ''}`}
              disabled={submitting}
            />
            {fieldErrors.confirmPassword && (
              <span className="field-error">❌ {fieldErrors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            id="register-submit-btn"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="spinner"></span>
                Creating account...
              </>
            ) : (
              'Register Account'
            )}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <span
            id="link-to-login"
            className="auth-link"
            onClick={() => setView('login')}
          >
            Log in here
          </span>
        </div>
      </div>
    </div>
  );
}
