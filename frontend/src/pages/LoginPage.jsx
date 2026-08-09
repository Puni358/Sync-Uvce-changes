import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { requestOtp, verifyOtp, registerUser } from '../api/auth';

export default function LoginPage() {
  const { setView, handleLoginSuccess } = useAuth();

  // Flow step: 1 = Email / Name input, 2 = 6-digit OTP verification
  const [step, setStep] = useState(1);
  const [isRegistering, setIsRegistering] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    otpCode: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Resend OTP 30-second cooldown timer
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setServerError('');
  };

  const validateStep1 = () => {
    const errors = {};
    const emailClean = formData.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailClean) {
      errors.email = 'Please enter your email address.';
    } else if (!emailRegex.test(emailClean)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (isRegistering && !formData.name.trim()) {
      errors.name = 'Please enter your full name.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setServerError('');
    setInfoMessage('');

    if (!validateStep1()) {
      return;
    }

    setSubmitting(true);
    const emailClean = formData.email.trim().toLowerCase();

    try {
      if (isRegistering && formData.name.trim()) {
        try {
          await registerUser({
            name: formData.name.trim(),
            email: emailClean,
          });
        } catch (regErr) {
          // If email is already registered, proceed to send OTP directly
          if (!regErr.message.includes('already registered')) {
            throw regErr;
          }
        }
      }

      // Request OTP
      await requestOtp({ email: emailClean });
      setStep(2);
      setResendTimer(30);
      setInfoMessage(`Passcode sent to ${emailClean}. Check your inbox or server console!`);
    } catch (err) {
      const msg = err.message || 'Failed to send OTP code.';
      if (msg.includes('No account found')) {
        setIsRegistering(true);
        setServerError('No account found for this email. Please enter your name below to register.');
      } else {
        setServerError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || submitting) return;
    setServerError('');
    setSubmitting(true);
    const emailClean = formData.email.trim().toLowerCase();

    try {
      await requestOtp({ email: emailClean });
      setResendTimer(30);
      setInfoMessage(`A fresh passcode has been sent to ${emailClean}.`);
    } catch (err) {
      setServerError(err.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setServerError('');

    const codeClean = formData.otpCode.strip ? formData.otpCode.strip() : formData.otpCode.trim();
    if (!codeClean || codeClean.length !== 6 || !/^\d+$/.test(codeClean)) {
      setFieldErrors({ otpCode: 'Please enter a valid 6-digit passcode.' });
      return;
    }

    setSubmitting(true);
    const emailClean = formData.email.trim().toLowerCase();

    try {
      const data = await verifyOtp({
        email: emailClean,
        code: codeClean,
      });

      // Pass JWT token to AuthContext -> fetches profile & redirects to dashboard
      await handleLoginSuccess(data.access_token);
    } catch (err) {
      setServerError(err.message || 'Invalid or expired code');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">UV</div>
          <h1 className="auth-title">
            {step === 1 ? (isRegistering ? 'Create Account' : 'Passcode Log In') : 'Enter Verification Code'}
          </h1>
          <p className="auth-subtitle">
            {step === 1
              ? 'Enter your email to receive a 6-digit login code'
              : `We sent a code to ${formData.email}`}
          </p>
        </div>

        {serverError && (
          <div className="alert-banner alert-error" role="alert">
            <span>⚠️</span>
            <div>{serverError}</div>
          </div>
        )}

        {infoMessage && (
          <div className="alert-banner alert-success" role="alert">
            <span>📩</span>
            <div>{infoMessage}</div>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleStep1Submit} noValidate>
            {isRegistering && (
              <div className="form-group">
                <label className="form-label" htmlFor="login-name">Full Name</label>
                <input
                  id="login-name"
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
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email Address</label>
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

            <button
              type="submit"
              id="login-submit-btn"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner"></span>
                  Sending code...
                </>
              ) : (
                isRegistering ? 'Register & Get Passcode' : 'Send Passcode'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleStep2Submit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="otp-code">6-Digit Passcode</label>
              <input
                id="otp-code"
                type="text"
                name="otpCode"
                maxLength="6"
                placeholder="123456"
                value={formData.otpCode}
                onChange={handleChange}
                style={{
                  letterSpacing: '8px',
                  fontSize: '24px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                }}
                className={`form-input ${fieldErrors.otpCode ? 'has-error' : ''}`}
                disabled={submitting}
                autoFocus
              />
              {fieldErrors.otpCode && (
                <span className="field-error">❌ {fieldErrors.otpCode}</span>
              )}
            </div>

            <button
              type="submit"
              id="verify-submit-btn"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner"></span>
                  Verifying...
                </>
              ) : (
                'Verify & Log In'
              )}
            </button>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="auth-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onClick={() => {
                  setStep(1);
                  setServerError('');
                  setInfoMessage('');
                }}
              >
                ← Change Email
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{
                  width: 'auto',
                  fontSize: '13px',
                  padding: '6px 12px',
                  opacity: resendTimer > 0 ? 0.6 : 1,
                  cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
                }}
                disabled={resendTimer > 0 || submitting}
                onClick={handleResendOtp}
              >
                {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : 'Resend Code'}
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer" style={{ marginTop: '24px' }}>
          {step === 1 && (
            isRegistering ? (
              <>
                Already have an account?{' '}
                <span
                  className="auth-link"
                  onClick={() => {
                    setIsRegistering(false);
                    setServerError('');
                  }}
                >
                  Log in here
                </span>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <span
                  className="auth-link"
                  onClick={() => {
                    setIsRegistering(true);
                    setServerError('');
                  }}
                >
                  Register here
                </span>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}
