import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api';
import NotificationToast from './NotificationToast';
import './LandingPage.css';

const ContactPage = () => {
  const [notification, setNotification] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [educatorForm, setEducatorForm] = useState({
    name: '',
    email: '',
    organization: '',
    message: ''
  });

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const hideNotification = () => {
    setNotification(null);
  };

  const handleEducatorFormSubmit = async (e) => {
    e.preventDefault();
    try {
      // Save to database
      const res = await apiFetch('/api/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: educatorForm.email,
          source: 'educator',
          name: educatorForm.name,
          organization: educatorForm.organization,
          message: educatorForm.message
        })
      });

      if (res.ok) {
        showNotification('Thank you! Your inquiry has been submitted. We\'ll be in touch soon. ✨');
        // Also send email via mailto
        const mailtoLink = `mailto:jing@althyplanner.com?subject=Educator Inquiry from ${educatorForm.name}&body=Name: ${educatorForm.name}%0D%0AEmail: ${educatorForm.email}%0D%0AOrganization: ${educatorForm.organization}%0D%0A%0D%0AMessage:%0D%0A${educatorForm.message}`;
        window.location.href = mailtoLink;
        
        // Reset form
        setEducatorForm({
          name: '',
          email: '',
          organization: '',
          message: ''
        });
      } else {
        const data = await res.json();
        showNotification(data.error || 'Something went wrong. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error submitting educator form:', error);
      showNotification('Failed to submit form. Please try again.', 'error');
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
          <button 
            className="hamburger-menu" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
          </button>
          <Link to="/" className="nav-logo">
            <img src="/img/Logo.png" alt="Althy" className="althy-logo-img" />
          </Link>
          {isMobileMenuOpen && (
            <div 
              className="mobile-menu-overlay" 
              onClick={() => setIsMobileMenuOpen(false)}
            ></div>
          )}
          <div className={`nav-menu ${isMobileMenuOpen ? 'open' : ''}`}>
            <Link to="/about" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>about</Link>
            <Link to="/for-students" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>for students</Link>
            <Link to="/contact" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>contact</Link>
            <Link to="/app" className="nav-download-btn-link" onClick={() => setIsMobileMenuOpen(false)}>
              <button className="nav-download-btn">App Early Access</button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Contact Section */}
      <section className="contact-section" style={{marginTop: '8rem'}}>
        <h2 className="contact-section-title">Reach out to us</h2>
        <p className="contact-description">
          We're building something special and we'd love to have you join us on this journey. We're currently recruiting interns and looking for enthusiastic testing users who want to help shape the future of personal planning. If you're passionate about productivity, design, or simply want to be part of an innovative project, we'd love to hear from you.
        </p>
        <p className="contact-email">
          Reach us at: <a href="mailto:jing@althyplanner.com" className="contact-email-link">jing@althyplanner.com</a>
        </p>
      </section>

      {/* Educator Section */}
      <section className="educator-section" style={{backgroundImage: 'url(/img/banner.png)'}}>
        <h2 className="educator-title">Are you an educator?</h2>
        <p className="educator-description">
          Bring Althy to your school.
        </p>
        <form className="educator-form" onSubmit={handleEducatorFormSubmit}>
          <div className="educator-form-row">
            <input
              type="text"
              placeholder="Name"
              className="educator-form-input"
              value={educatorForm.name}
              onChange={(e) => setEducatorForm({...educatorForm, name: e.target.value})}
              required
            />
            <input
              type="email"
              placeholder="Email"
              className="educator-form-input"
              value={educatorForm.email}
              onChange={(e) => setEducatorForm({...educatorForm, email: e.target.value})}
              required
            />
          </div>
          <input
            type="text"
            placeholder="Organization"
            className="educator-form-input educator-form-input-full"
            value={educatorForm.organization}
            onChange={(e) => setEducatorForm({...educatorForm, organization: e.target.value})}
            required
          />
          <textarea
            placeholder="Message"
            className="educator-form-textarea"
            rows="4"
            value={educatorForm.message}
            onChange={(e) => setEducatorForm({...educatorForm, message: e.target.value})}
            required
          />
          <button type="submit" className="educator-btn">
            <span>Send</span>
          </button>
        </form>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-column footer-brand">
            <div className="footer-logo">
              <img src="/img/Logo-4circle.png" alt="Althy" className="footer-logo-img" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ContactPage;

