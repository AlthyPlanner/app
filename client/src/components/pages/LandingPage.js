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

  const testimonials = [
    {
      title: "My go-to planner",
      text: "Does what it promises. Saves me time and keeps me organized. Does what it promises. Saves me time and keeps me organized.",
      author: "SARAH H."
    },
    {
      title: "Smooth & Reliable",
      text: "Great features, smooth experience. Exactly what I needed.",
      author: "MICHAEL T."
    },
    {
      title: "My go-to planner",
      text: "Does what it promises. Saves me time and keeps me organized. Does what it promises. Saves me time and keeps me organized.",
      author: "EMMA L."
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
          <Link to="/" className="nav-link">about</Link>
          <Link to="/" className="nav-link">for students</Link>
          <Link to="/" className="nav-logo">
            <img src="/img/Logo.png" alt="Althy" className="althy-logo-img" />
          </Link>
          <Link to="/" className="nav-link">contact</Link>
          <Link to="/app" className="nav-download-btn-link">
            <button className="nav-download-btn">Download Althy</button>
          </Link>
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

      {/* App Screenshots Section */}
      <section className="screenshots-section">
        <h2 className="screenshots-title">Don't need to overwork to achieve your goals</h2>
        <p className="screenshots-description">
          We transform your long-term goals into manageable steps and design a schedule that makes space for both rest and the hobbies you love.
        </p>
        <div className="screenshots-container">
          <img src="/img/screenshot1.png" alt="Althy app screenshot" className="app-screenshot" />
          <img src="/img/screenshot2.png" alt="Althy app screenshot" className="app-screenshot" />
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
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
          <div className="testimonial-nav-controls">
            <button className="testimonial-nav-btn testimonial-nav-left" onClick={prevTestimonial}>
              ←
            </button>
            <button className="testimonial-nav-btn testimonial-nav-right" onClick={nextTestimonial}>
              →
            </button>
          </div>
        </div>
      </section>

      {/* Educator Section */}
      <section className="educator-section" style={{backgroundImage: 'url(/img/banner.png)'}}>
        <h2 className="educator-title">Are you an educator?</h2>
        <p className="educator-description">
          Althy has helped thousands of students from top universities. Bring Althy to your school.
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
