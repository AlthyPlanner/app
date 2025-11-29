import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../../api';
import LoginPage from './LoginPage';
import OnboardingPage from '../pages/OnboardingPage';

const USER_KEY = 'althy_user';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Check authentication status
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // First check localStorage
      const storedUser = localStorage.getItem(USER_KEY);
      
      // Then verify with server
      const res = await apiFetch('/api/auth/me');
      
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          setIsAuthenticated(true);
          // Update localStorage with fresh data
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        } else {
          clearAuth();
        }
      } else {
        // If server says not authenticated, clear local storage
        clearAuth();
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // If there's a stored user, allow access (offline mode)
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
        } catch (e) {
          clearAuth();
        }
      } else {
        clearAuth();
      }
    } finally {
      setIsChecking(false);
    }
  };

  const clearAuth = () => {
    localStorage.removeItem(USER_KEY);
    setIsAuthenticated(false);
    setUser(null);
  };

  const handleLogin = (userData) => {
    if (userData) {
      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      return true;
    }
    return false;
  };

  if (isChecking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f9f9f9'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Check if user needs onboarding (missing name or other required fields)
  const needsOnboarding = user && (!user.name || !user.chronotype || !user.planning_style);
  const isOnboardingRoute = location.pathname === '/app/onboarding';

  // If user needs onboarding and is not on onboarding page, redirect to onboarding
  if (needsOnboarding && !isOnboardingRoute) {
    return <Navigate to="/app/onboarding" replace />;
  }

  // If user completed onboarding but is on onboarding page, redirect to plan
  if (!needsOnboarding && isOnboardingRoute) {
    return <Navigate to="/app/plan" replace />;
  }

  // User is authenticated, render protected content with user context
  return <>{children}</>;
};

export default ProtectedRoute;

