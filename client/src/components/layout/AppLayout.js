import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import MobileMenu from './MobileMenu';
import './AppLayout.css';

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

  // Phone frame - slightly wider
  const iphoneMaxWidth = 380;
  const iphoneAspectRatio = 19.5 / 9;

  return (
    <div className="app-layout-wrapper">
      {/* Beautiful gradient background matching login page */}
      <div className="app-background-gradient" />
      
      {/* iPhone 16 Pro Max frame simulation */}
      <div className="app-phone-frame" style={{
        maxWidth: `${iphoneMaxWidth}px`,
        aspectRatio: iphoneAspectRatio,
        maxHeight: '100vh'
      }}>
        {/* Fixed Header */}
        <Header currentPage={currentPage} onNavigate={handleNavigate} />
        
        {/* Content Container */}
        <div className="app-content-container">
          {/* Main Content Area */}
          <div className="app-main-content" style={{ 
            paddingTop: `${headerHeight}px`,
            paddingBottom: '100px'
          }}>
            <Outlet />
          </div>
        </div>

        {/* Fixed Bottom Menu */}
        <MobileMenu currentPage={currentPage} />
      </div>
    </div>
  );
};

export default AppLayout;

