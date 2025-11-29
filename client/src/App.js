import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LandingPage from './components/pages/LandingPage';
import AboutPage from './components/pages/AboutPage';
import ContactPage from './components/pages/ContactPage';
import ForStudentsPage from './components/pages/ForStudentsPage';
import CalendarPage from './components/pages/CalendarPage';
import TasksPage from './components/pages/TasksPage';
import GoalsPage from './components/pages/GoalsPage';
import ProfilePage from './components/pages/ProfilePage';
import AlthyPage from './components/pages/AlthyPage';
import OnboardingPage from './components/pages/OnboardingPage';

const AppContent = () => {
  const location = useLocation();

  // Disable outermost scrolling only when on /app routes (except onboarding)
  useEffect(() => {
    const isAppRoute = location.pathname.startsWith('/app');
    const isOnboarding = location.pathname === '/app/onboarding';
    
    if (isAppRoute && !isOnboarding) {
      // Disable scrolling on html/body when in app (but not onboarding)
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.position = 'fixed';
      document.documentElement.style.width = '100%';
      document.documentElement.style.height = '100%';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.touchAction = 'none';
    } else {
      // Enable scrolling on other routes and onboarding
      document.documentElement.style.overflow = '';
      document.documentElement.style.position = '';
      document.documentElement.style.width = '';
      document.documentElement.style.height = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.touchAction = '';
    }

    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.documentElement.style.overflow = '';
      document.documentElement.style.position = '';
      document.documentElement.style.width = '';
      document.documentElement.style.height = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.touchAction = '';
    };
  }, [location.pathname]);

  return (
    <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/for-students" element={<ForStudentsPage />} />
        <Route 
          path="/app" 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/app/plan" replace />} />
          <Route path="onboarding" element={<OnboardingPage />} />
          <Route path="plan" element={<CalendarPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="althy" element={<AlthyPage />} />
        </Route>
    </Routes>
  );
};

const App = () => {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
};

export default App;

