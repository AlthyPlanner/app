import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api';
import './LoginPage.css';

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const body = isRegistering 
        ? { email, password, name: name || null, accessCode }
        : { email, password };

      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Store user info
        localStorage.setItem('althy_user', JSON.stringify(data.user));
        // Call the onLogin callback to update auth state
        if (onLogin) {
          onLogin(data.user);
        }
        // Navigate to app
        navigate('/app/plan');
      } else {
        setError(data.error || 'Login failed. Please try again.');
        setPassword('');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to connect to server. Please try again.');
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <img src="/img/Logo.png" alt="Althy" className="login-logo" />
          <h1 className="login-title">Welcome to Althy</h1>
          <p className="login-subtitle">{isRegistering ? 'Create your account to get started' : 'Login to access your planner'}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            <label htmlFor="email" className="login-label">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              className={`login-input ${error ? 'login-input-error' : ''}`}
              placeholder="Enter your email"
              autoFocus
              disabled={isLoading}
              required
            />
          </div>

          {isRegistering && (
            <>
              <div className="login-input-group">
                <label htmlFor="accessCode" className="login-label">Access Code</label>
                <input
                  id="accessCode"
                  type="password"
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value);
                    setError('');
                  }}
                  className={`login-input ${error ? 'login-input-error' : ''}`}
                  placeholder="Enter access code"
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="login-input-group">
                <label htmlFor="name" className="login-label">Name (Optional)</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError('');
                  }}
                  className="login-input"
                  placeholder="Enter your name"
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          <div className="login-input-group">
            <label htmlFor="password" className="login-label">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className={`login-input ${error ? 'login-input-error' : ''}`}
              placeholder="Enter password"
              disabled={isLoading}
              required
            />
            {error && <div className="login-error">{error}</div>}
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={isLoading || !email.trim() || !password.trim() || (isRegistering && !accessCode.trim())}
          >
            {isLoading ? (isRegistering ? 'Creating Account...' : 'Logging in...') : (isRegistering ? 'Create Account' : 'Login')}
          </button>

          <div className="login-toggle">
            <button
              type="button"
              className="login-toggle-button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
                setAccessCode('');
              }}
              disabled={isLoading}
            >
              {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
            </button>
          </div>
        </form>

        <div className="login-footer">
          <p className="login-footer-text">Protected area</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

