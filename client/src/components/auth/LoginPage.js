import React, { useState } from 'react';
import './LoginPage.css';

const LoginPage = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Small delay for better UX
    setTimeout(() => {
      const success = onLogin(password);
      if (!success) {
        setError('Incorrect password. Please try again.');
        setPassword('');
      }
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <img src="/img/Logo.png" alt="Althy" className="login-logo" />
          <h1 className="login-title">Welcome to Althy</h1>
          <p className="login-subtitle">Please enter the access password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
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
              autoFocus
              disabled={isLoading}
            />
            {error && <div className="login-error">{error}</div>}
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={isLoading || !password.trim()}
          >
            {isLoading ? 'Verifying...' : 'Access App'}
          </button>
        </form>

        <div className="login-footer">
          <p className="login-footer-text">Protected area</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

