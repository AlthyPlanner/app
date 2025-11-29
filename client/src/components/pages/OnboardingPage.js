import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api';
import { useUser } from '../../contexts/UserContext';
import './OnboardingPage.css';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    chronotype: '',
    wake_time: '',
    sleep_time: '',
    planning_style: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const chronotypes = [
    { value: 'early_bird', label: 'Early Bird', description: 'You wake up early and are most productive in the morning' },
    { value: 'night_owl', label: 'Night Owl', description: 'You stay up late and are most productive in the evening' },
    { value: 'balanced', label: 'Balanced', description: 'You have a regular sleep schedule throughout the day' }
  ];

  const planningStyles = [
    { value: 'structured', label: 'Structured', description: 'I prefer detailed schedules and strict time blocks' },
    { value: 'relaxed', label: 'Relaxed', description: 'I prefer flexible plans with room for spontaneity' },
    { value: 'flexible', label: 'Flexible', description: 'I adapt my schedule based on what feels right each day' }
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleNext = () => {
    if (step === 1 && !formData.name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (step === 2 && !formData.chronotype) {
      setError('Please select your chronotype');
      return;
    }
    if (step === 3 && (!formData.wake_time || !formData.sleep_time)) {
      setError('Please enter both wake and sleep times');
      return;
    }
    if (step === 4 && !formData.planning_style) {
      setError('Please select your planning style');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.planning_style) {
      setError('Please select your planning style');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await apiFetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Update user context
        if (setUser) {
          setUser(data.user);
        }
        localStorage.setItem('althy_user', JSON.stringify(data.user));
        // Reload page to refresh user context and navigate to app
        window.location.href = '/app/plan';
      } else {
        setError(data.error || 'Failed to save onboarding data. Please try again.');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      setError('Failed to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-container">
        <div className="onboarding-card">
          <div className="onboarding-header">
            <img src="/img/Logo.png" alt="Althy" className="onboarding-logo" />
            <h1 className="onboarding-title">Welcome to Althy!</h1>
            <p className="onboarding-subtitle">Let's personalize your experience</p>
          </div>

        <div className="onboarding-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
          <p className="progress-text">Step {step} of 4</p>
        </div>

        <form onSubmit={handleSubmit} className="onboarding-form">
          {error && <div className="onboarding-error">{error}</div>}

          {/* Step 1: Name */}
          {step === 1 && (
            <div className="onboarding-step">
              <h2 className="step-title">What should we call you?</h2>
              <p className="step-description">Enter your name so we can personalize your experience</p>
              <div className="input-group">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="onboarding-input"
                  placeholder="Your name"
                  autoFocus
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          {/* Step 2: Chronotype */}
          {step === 2 && (
            <div className="onboarding-step">
              <h2 className="step-title">What's your chronotype?</h2>
              <p className="step-description">This helps us understand when you're most productive</p>
              <div className="option-group">
                {chronotypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleChange('chronotype', type.value)}
                    className={`option-button ${formData.chronotype === type.value ? 'option-button-selected' : ''}`}
                    disabled={isLoading}
                  >
                    <div className="option-label">{type.label}</div>
                    <div className="option-description">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Sleep Schedule */}
          {step === 3 && (
            <div className="onboarding-step">
              <h2 className="step-title">What's your sleep schedule?</h2>
              <p className="step-description">Tell us your typical wake and sleep times</p>
              <div className="input-group">
                <label className="input-label">Wake Time</label>
                <input
                  type="time"
                  value={formData.wake_time}
                  onChange={(e) => handleChange('wake_time', e.target.value)}
                  className="onboarding-input"
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">Sleep Time</label>
                <input
                  type="time"
                  value={formData.sleep_time}
                  onChange={(e) => handleChange('sleep_time', e.target.value)}
                  className="onboarding-input"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
          )}

          {/* Step 4: Planning Style */}
          {step === 4 && (
            <div className="onboarding-step">
              <h2 className="step-title">How do you prefer to manage your time?</h2>
              <p className="step-description">Choose the style that best describes your approach</p>
              <div className="option-group">
                {planningStyles.map((style) => (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => handleChange('planning_style', style.value)}
                    className={`option-button ${formData.planning_style === style.value ? 'option-button-selected' : ''}`}
                    disabled={isLoading}
                  >
                    <div className="option-label">{style.label}</div>
                    <div className="option-description">{style.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="onboarding-actions">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="onboarding-button onboarding-button-secondary"
                disabled={isLoading}
              >
                Back
              </button>
            )}
            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="onboarding-button onboarding-button-primary"
                disabled={isLoading}
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                className="onboarding-button onboarding-button-primary"
                disabled={isLoading || !formData.planning_style}
              >
                {isLoading ? 'Saving...' : 'Get Started'}
              </button>
            )}
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;

