import React from 'react';

const Header = ({ currentPage, onNavigate }) => {
  const isMobile = window.innerWidth < 768;
  
  return (
    <header style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: isMobile ? '12px 0' : '0',
      background: isMobile ? 'white' : 'transparent',
      borderBottom: '1px solid #e5e7eb',
      boxShadow: isMobile ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
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