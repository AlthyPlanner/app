import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api';
import NotificationToast from './NotificationToast';
import './LandingPage.css';

const LandingPage = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [email, setEmail] = useState('');
  const [heroEmail, setHeroEmail] = useState('');
  const [notification, setNotification] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const hideNotification = () => {
    setNotification(null);
  };

  const handleHeroEmailSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: heroEmail,
          source: 'hero'
        })
      });

      if (res.ok) {
        showNotification('Thank you! You\'ve been added to our waiting list. 🎉');
        setHeroEmail('');
      } else {
        const data = await res.json();
        showNotification(data.error || 'Something went wrong. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error submitting email:', error);
      showNotification('Failed to submit email. Please try again.', 'error');
    }
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


  const testimonials = [
    {
      title: "My go-to planner",
      text: "This gives structure to the small, everyday tasks so the larger goals actually feel achievable — not just seem achievable. That's so cool.",
      author: "SARAH H."
    },
    {
      title: "Saves time",
      text: "Does what it promises. Saves me time and keeps me organized.",
      author: "EMMA L."
    },
    {
      title: "Smooth & Reliable",
      text: "I love how Althy brings everything together — it connects my tasks and goals, and the progress bar makes progress feel visual and motivating.",
      author: "MICHAEL T."
    },
    {
      title: "Surprisingly helpful",
      text: "Super helpful, clean design keeps me on track.",
      author: "JAMES R."
    }
  ];

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
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
              <button className="nav-download-btn">App Coming Soon</button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">Plan smarter · Live better</h1>
        <p className="hero-subtitle">Althy is your personal AI planner that helps you build a balanced schedule.</p>
        <form className="hero-email-form" onSubmit={handleHeroEmailSubmit}>
          <input
            type="email"
            placeholder="Enter your email"
            className="hero-email-input"
            value={heroEmail}
            onChange={(e) => setHeroEmail(e.target.value)}
            required
          />
          <button type="submit" className="hero-email-submit-btn">Join waiting list</button>
        </form>
      </section>

      {/* Feature Cards Section */}
      <section className="features-section">
        <div className="feature-card feature-card-yellow" style={{backgroundImage: 'url(/img/useAI.png)'}}>
          <h2 className="feature-title">Break down your tasks</h2>
          <div className="feature-task-box">
            <div className="task-date">24 DEC 2025</div>
            <div className="task-title">Complete project proposal</div>
            <div className="feature-milestones">
              <div className="milestone checked">Research requirements</div>
              <div className="milestone checked">Draft outline</div>
              <div className="milestone unchecked">Final review</div>
            </div>
          </div>
          <p className="feature-description">
            Tasks are the building blocks that move you closer to your goals. Break down what needs to be done and watch how each completed task brings you one step closer to success.
          </p>
        </div>

        <div className="feature-card feature-card-green" style={{backgroundImage: 'url(/img/harmony.png)'}}>
          <h2 className="feature-title">Never miss an event</h2>
          <div className="feature-task-box">
            <div className="task-date">15 JAN 2026</div>
            <div className="task-title">Team meeting</div>
            <div className="feature-milestones">
              <div className="milestone checked">Send calendar invite</div>
              <div className="milestone checked">Prepare agenda</div>
              <div className="milestone unchecked">Follow up notes</div>
            </div>
          </div>
          <p className="feature-description">
            Events shape your journey toward your goals. Every meeting, deadline, and milestone is a stepping stone that builds momentum toward achieving what matters most.
          </p>
        </div>

        <div className="feature-card feature-card-blue" style={{backgroundImage: 'url(/img/intergrate.png)'}}>
          <h2 className="feature-title">Achieve your goals</h2>
          <div className="feature-task-box">
            <div className="task-date">24 DEC 2025</div>
            <div className="task-title">Comfortable speaking Spanish</div>
            <div className="task-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{width: '80%'}}></div>
              </div>
            </div>
            <div className="feature-milestones">
              <div className="milestone checked">Complete beginner course</div>
              <div className="milestone checked">Practice 30-min daily</div>
              <div className="milestone unchecked">Hold 5-min conversation</div>
            </div>
          </div>
          <p className="feature-description">
            Your long-term goals come to life through the tasks you complete and events you attend. See how every action contributes to your bigger vision.
          </p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <h2 className="testimonials-title">Read what people say</h2>
        <div className="testimonials-container">
          <div className="testimonials-cards">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`testimonial-card testimonial-card-${index % 4}`}
              >
                <h3 className="testimonial-card-title">{testimonial.title}</h3>
                <p className="testimonial-card-text">{testimonial.text}</p>
                <div className="testimonial-card-author">{testimonial.author}</div>
              </div>
            ))}
          </div>
          {testimonials.length > 4 && (
            <div className="testimonial-nav-controls">
              <button className="testimonial-nav-btn testimonial-nav-left" onClick={prevTestimonial}>
                ←
              </button>
              <button className="testimonial-nav-btn testimonial-nav-right" onClick={nextTestimonial}>
                →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-column footer-brand">
            <div className="footer-logo">
              <img src="/img/Logo-4circle.png" alt="Althy" className="footer-logo-img" />
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

          <div className="footer-column">
            <h4 className="footer-column-title">PRODUCT</h4>
            <Link to="/" className="footer-link">Item 1</Link>
            <Link to="/" className="footer-link">Item 2</Link>
            <Link to="/" className="footer-link">Item 3</Link>
          </div>

          <div className="footer-column">
            <h4 className="footer-column-title">FOR INSTITUTION</h4>
            <Link to="/" className="footer-link">Get a demo</Link>
            <Link to="/" className="footer-link">Students</Link>
          </div>

          <div className="footer-column">
            <h4 className="footer-column-title">RESOURCE</h4>
            <Link to="/" className="footer-link">Company</Link>
            <Link to="/" className="footer-link">Careers</Link>
            <Link to="/" className="footer-link">Contact</Link>
          </div>

          <div className="footer-column">
            <h4 className="footer-column-title">DOWNLOAD ALTHY APP</h4>
            <button className="footer-download-btn">App Store</button>
            <button className="footer-download-btn">Google Play</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
