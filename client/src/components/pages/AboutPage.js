import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api';
import NotificationToast from './NotificationToast';
import './LandingPage.css';

const AboutPage = () => {
  const [email, setEmail] = useState('');
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const hideNotification = () => {
    setNotification(null);
  };

  const handleFooterEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    try {
      const res = await apiFetch('/api/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          source: 'footer'
        })
      });

      if (res.ok) {
        showNotification('Thank you! You\'ve been added to our waiting list. 🎉');
        setEmail('');
      } else {
        const data = await res.json();
        showNotification(data.error || 'Something went wrong. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error submitting email:', error);
      showNotification('Failed to submit email. Please try again.', 'error');
    }
  };

  return (
    <div className="landing-page">
      {notification && (
        <NotificationToast
          message={notification.message}
          type={notification.type}
          onClose={hideNotification}
          duration={4000}
        />
      )}
      {/* Header */}
      <header className="landing-header">
        <nav className="landing-nav">
          <Link to="/about" className="nav-link">about</Link>
          <Link to="/for-students" className="nav-link">for students</Link>
          <Link to="/" className="nav-logo">
            <img src="/img/Logo.png" alt="Althy" className="althy-logo-img" />
          </Link>
          <Link to="/contact" className="nav-link">contact</Link>
          <Link to="/app" className="nav-download-btn-link">
            <button className="nav-download-btn">App Coming Soon</button>
          </Link>
        </nav>
      </header>

      {/* How It Works Section */}
      <section className="how-it-works-section" style={{ paddingTop: '8rem', paddingBottom: '5rem' }}>
        <div className="how-it-works-label">HOW DO WE WORK</div>
        <div className="how-it-works-equation">
          AI + Healthy = <img src="/img/Logo-light-blue.png" alt="Althy" className="althy-logo-large-img" />
        </div>
        <p className="how-it-works-description">
          We transform your long-term goals into manageable steps and design a schedule that makes space for both rest and the hobbies you love.
        </p>
        <div className="process-visualization">
          <img src="/img/Steps.png" alt="How Althy works - breaking down goals into steps" className="steps-image" />
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-column footer-brand">
            <div className="footer-logo">
              <img src="/img/Logo-4circle.png" alt="Althy" className="footer-logo-img" />
              <span className="footer-logo-text">Althy</span>
            </div>
            <p className="footer-newsletter-label">Join our waiting list</p>
            <form className="footer-newsletter" onSubmit={handleFooterEmailSubmit}>
              <input
                type="email"
                placeholder="Enter your email"
                className="footer-email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="footer-email-btn">→</button>
            </form>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;

