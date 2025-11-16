import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import MobileMenu from './MobileMenu';

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = window.innerWidth < 768;
  
  // Extract current page from pathname
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path.includes('/althy')) return 'althy';
    if (path.includes('/tasks')) return 'tasks';
    if (path.includes('/plan')) return 'plan';
    if (path.includes('/goals')) return 'goals';
    if (path.includes('/profile')) return 'profile';
    return 'plan'; // default
  };

  const currentPage = getCurrentPage();

  const handleNavigate = (page) => {
    navigate(`/app/${page}`);
  };

  // Calculate header height (logo header)
  const headerHeight = isMobile ? 80 : 72; // padding (12px * 2) + logo height (56px or 72px)

  return (
    <div style={{ 
      width: '100%',
      margin: '0', 
      fontFamily: 'sans-serif',
      minHeight: '100vh',
      background: '#f9f9f9',
      overflowX: 'hidden'
    }}>
      <Header currentPage={currentPage} onNavigate={handleNavigate} />
      
      {/* Main Content Area */}
      <div style={{ 
        background: '#f9f9f9', 
        minHeight: 'calc(100vh - 80px)',
        paddingTop: `${headerHeight}px`, // Space for fixed header
        paddingBottom: '100px',
        width: '100%',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch'
      }}>
        <Outlet />
      </div>

      {/* Bottom Menu */}
      <MobileMenu currentPage={currentPage} />
    </div>
  );
};

export default AppLayout;

