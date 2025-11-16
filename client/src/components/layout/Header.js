import React from 'react';

const Header = ({ currentPage, onNavigate }) => {
  const isMobile = window.innerWidth < 768;
  
  return (
    <header style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: isMobile ? '12px 0' : '0',
      background: 'white',
      borderBottom: '1px solid #e5e7eb',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      width: '100%'
    }}>
      <img 
        src="/img/logo-blue.png" 
        alt="Althy Planner" 
        style={{ 
          height: isMobile ? '56px' : '72px',
          width: 'auto',
          objectFit: 'contain'
        }}
      />
    </header>
  );
};

export default Header;