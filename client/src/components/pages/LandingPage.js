import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      color: 'white',
      textAlign: 'center'
    }}>
      <h1 style={{ 
        fontSize: 'clamp(2rem, 5vw, 4rem)', 
        marginBottom: '1rem', 
        fontWeight: 'bold',
        textShadow: '0 2px 10px rgba(0,0,0,0.2)'
      }}>
        Althy Planner
      </h1>
      <p style={{ 
        fontSize: 'clamp(1rem, 2.5vw, 1.5rem)', 
        marginBottom: '2rem', 
        opacity: 0.95,
        maxWidth: '600px',
        lineHeight: '1.6'
      }}>
        Your intelligent calendar and todo planning assistant powered by AI
      </p>
      <Link 
        to="/app"
        style={{
          padding: '1rem 2.5rem',
          background: 'white',
          color: '#667eea',
          textDecoration: 'none',
          borderRadius: '12px',
          fontSize: '1.2rem',
          fontWeight: '600',
          transition: 'all 0.3s ease',
          display: 'inline-block',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.05)';
          e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
        }}
      >
        Get Started →
      </Link>
      <div style={{
        marginTop: '3rem',
        display: 'flex',
        gap: '2rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: '800px'
      }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>📅 Smart Calendar</h3>
          <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>Organize your events with Google Calendar integration</p>
        </div>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>✅ Todo Management</h3>
          <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>Track and manage your tasks efficiently</p>
        </div>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>🤖 AI Assistant</h3>
          <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>Get help planning and organizing with AI</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;

