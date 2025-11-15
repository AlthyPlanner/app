import React, { useState, useEffect } from 'react';
import { apiFetch, API_BASE } from '../../api';
import ProfileEditModal from '../modals/ProfileEditModal';
import SharedCalendarModal from '../modals/SharedCalendarModal';

const ProfilePage = () => {
  const [user, setUser] = useState({ name: 'Jing Huang', role: 'Student', chronotype: 'early' });
  const [interests, setInterests] = useState({
    'Mind & Learning': ['Reading', 'Learning Languages', 'Podcasts'],
    'Body & Movement': ['Yoga', 'Hiking', 'Running'],
    'Creative & Leisure': ['Photography', 'Music', 'Writing']
  });
  const [weeklyBalance, setWeeklyBalance] = useState({
    'Work': 40,
    'Fitness': 7,
    'Rest': 35,
    'Leisure': 10,
    'Study': 5,
    'Personal': 8
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [googleAuth, setGoogleAuth] = useState({ authorized: false, user: null });
  const [outlookAuth, setOutlookAuth] = useState({ authorized: false, user: null });
  const [sharedCalendars, setSharedCalendars] = useState([]);
  const [showSharedCalendarModal, setShowSharedCalendarModal] = useState(false);
  const [selectedSharedCalendar, setSelectedSharedCalendar] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    checkGoogleAuth();
    checkOutlookAuth();
    loadWeeklyBalance();
    loadSharedCalendars();
    
    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('outlook_auth') === 'success') {
      checkOutlookAuth();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (urlParams.get('error') === 'outlook_auth_failed') {
      alert('Failed to connect Outlook Calendar. Please try again.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const checkGoogleAuth = async () => {
    try {
      const response = await apiFetch('/api/google/auth/status');
      const data = await response.json();
      setGoogleAuth(data);
      if (data.authorized && data.user) {
        const fullName = data.user.name || 'User';
        const nameParts = fullName.split(' ');
        setUser(prev => ({
          ...prev,
          name: fullName,
          initials: nameParts.map(n => n[0]).join('').toUpperCase()
        }));
      } else {
        // Default user
        setUser(prev => ({
          ...prev,
          initials: prev.name.split(' ').map(n => n[0]).join('').toUpperCase()
        }));
      }
    } catch (error) {
      console.error('Failed to check Google auth status:', error);
    }
  };

  const checkOutlookAuth = async () => {
    try {
      const response = await apiFetch('/api/outlook/auth/status');
      const data = await response.json();
      setOutlookAuth(data);
    } catch (error) {
      // If endpoint doesn't exist yet, set to unauthorized
      setOutlookAuth({ authorized: false, user: null });
    }
  };

  const handleGoogleConnect = () => {
    window.location.href = `${API_BASE}/api/google/auth/google`;
  };

  const handleGoogleDisconnect = async () => {
    try {
      const response = await apiFetch('/api/google/auth/logout', {
        method: 'POST'
      });
      if (response.ok) {
        setGoogleAuth({ authorized: false, user: null });
      }
    } catch (error) {
      console.error('Failed to disconnect Google Calendar:', error);
    }
  };

  const handleOutlookConnect = () => {
    // Placeholder - will be implemented when backend route is ready
    window.location.href = `${API_BASE}/api/outlook/auth/microsoft`;
  };

  const handleOutlookDisconnect = async () => {
    try {
      const response = await apiFetch('/api/outlook/auth/logout', {
        method: 'POST'
      });
      if (response.ok) {
        setOutlookAuth({ authorized: false, user: null });
      }
    } catch (error) {
      console.error('Failed to disconnect Outlook Calendar:', error);
    }
  };

  const loadSharedCalendars = async () => {
    try {
      const response = await apiFetch('/api/calendar/shared');
      const data = await response.json();
      setSharedCalendars(data.sharedCalendars || []);
    } catch (error) {
      console.error('Failed to load shared calendars:', error);
    }
  };

  const handleAddSharedCalendar = async (calendar) => {
    try {
      const response = await apiFetch('/api/calendar/shared', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calendar)
      });
      if (response.ok) {
        await loadSharedCalendars();
        setShowSharedCalendarModal(false);
        setSelectedSharedCalendar(null);
      }
    } catch (error) {
      console.error('Failed to add shared calendar:', error);
    }
  };

  const handleRemoveSharedCalendar = async (id) => {
    try {
      const response = await apiFetch(`/api/calendar/shared/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await loadSharedCalendars();
      }
    } catch (error) {
      console.error('Failed to remove shared calendar:', error);
    }
  };

  const getInitialsFromName = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const loadWeeklyBalance = async () => {
    try {
      // Load events from the past week
      const eventsRes = await apiFetch('/api/calendar/events');
      const eventsData = await eventsRes.json();
      const events = eventsData.events || [];
      
      // Calculate weekly balance from events
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const balance = {
        'Work': 0,
        'Fitness': 0,
        'Rest': 0,
        'Leisure': 0,
        'Study': 0,
        'Personal': 0
      };
      
      events.forEach(event => {
        const start = new Date(event.start);
        if (start >= weekAgo) {
          const end = new Date(event.end);
          const durationHours = (end - start) / (1000 * 60 * 60);
          const category = event.category || 'work';
          
          if (category === 'work') balance.Work += durationHours;
          else if (category === 'fitness') balance.Fitness += durationHours;
          else if (category === 'study') balance.Study += durationHours;
          else balance.Personal += durationHours;
        }
      });
      
      // Round to whole hours
      Object.keys(balance).forEach(key => {
        balance[key] = Math.round(balance[key]);
      });
      
      setWeeklyBalance(balance);
    } catch (err) {
      console.error('Failed to load weekly balance:', err);
    }
  };

  const getInitials = () => {
    if (user.initials) return user.initials;
    const nameParts = user.name.split(' ');
    return nameParts.map(n => n[0]).join('').toUpperCase();
  };

  const getTotalHours = () => {
    return Object.values(weeklyBalance).reduce((sum, hours) => sum + hours, 0);
  };

  const getColorForCategory = (category) => {
    const colors = {
      'Work': '#3b82f6',
      'Fitness': '#9333ea',
      'Rest': '#6b7280',
      'Leisure': '#ec4899',
      'Study': '#10b981',
      'Personal': '#84cc16'
    };
    return colors[category] || '#6b7280';
  };

  const handleAddInterest = (category) => {
    const newInterest = prompt(`Add new interest to ${category}:`);
    if (newInterest && newInterest.trim()) {
      setInterests(prev => ({
        ...prev,
        [category]: [...prev[category], newInterest.trim()]
      }));
    }
  };

  const handleRemoveInterest = (category, interest) => {
    setInterests(prev => ({
      ...prev,
      [category]: prev[category].filter(i => i !== interest)
    }));
  };

  const getInterestIcon = (interest) => {
    const icons = {
      'Reading': (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      ),
      'Learning Languages': (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M2 12h20"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      ),
      'Podcasts': (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <polygon points="10 8 16 12 10 16 10 8"/>
        </svg>
      ),
      'Yoga': (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M2 12h20"/>
        </svg>
      ),
      'Hiking': (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 2 7 12 12 22 7 12 2"/>
          <polyline points="2 17 12 22 22 17"/>
          <polyline points="2 12 12 17 22 12"/>
        </svg>
      ),
      'Running': (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      )
    };
    return icons[interest] || null;
  };

  const getFocusAreaIcon = (area) => {
    const icons = {
      'Fitness': (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6.5 6.5h11v11h-11z"/>
          <path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>
        </svg>
      ),
      'Learning': (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M2 12h20"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      ),
      'Creative': (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24"/>
        </svg>
      )
    };
    return icons[area] || null;
  };

  const totalHours = getTotalHours();

  return (
    <div style={{
      width: '100%',
      maxWidth: '100%',
      background: '#f9fafb',
      minHeight: 'calc(100vh - 80px)',
      paddingBottom: '120px',
      WebkitOverflowScrolling: 'touch'
    }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? '20px 16px' : '24px 24px 20px',
        background: 'white',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '12px'
        }}>
          <div>
            <h1 style={{
              margin: '0 0 8px 0',
              fontSize: isMobile ? '24px' : '28px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Hi, {user.name.split(' ')[0]}.
            </h1>
            <p style={{
              margin: 0,
              fontSize: isMobile ? '14px' : '16px',
              color: '#6b7280',
              lineHeight: '1.5'
            }}>
              You're finding a good rhythm. Keep listening to yourself.
            </p>
          </div>
          <button
            onClick={() => {}}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#f3f4f6';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        padding: isMobile ? '16px' : '24px',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Profile Card */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: isMobile ? '20px' : '24px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          position: 'relative'
        }}>
          <button
            onClick={() => setShowEditModal(true)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#f3f4f6';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            marginBottom: '20px'
          }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: isMobile ? '64px' : '80px',
                height: isMobile ? '64px' : '80px',
                borderRadius: '50%',
                background: '#bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '24px' : '32px',
                fontWeight: '600',
                color: '#1e40af'
              }}>
                {getInitials()}
              </div>
              <button
                onClick={() => {}}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#1f2937',
                  border: '2px solid white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <span style={{ color: 'white', fontSize: '14px', lineHeight: 1 }}>+</span>
              </button>
            </div>

            {/* Name and Role */}
            <div style={{ flex: 1 }}>
              <h2 style={{
                margin: '0 0 4px 0',
                fontSize: isMobile ? '20px' : '24px',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                {user.name}
              </h2>
              <p style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                color: '#6b7280'
              }}>
                {user.role}
              </p>
              <span style={{
                padding: '4px 12px',
                borderRadius: '12px',
                background: '#f3f4f6',
                color: '#6b7280',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {user.chronotype}
              </span>
            </div>
          </div>

          {/* Focus Areas */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {['Fitness', 'Learning', 'Creative'].map(area => (
              <span
                key={area}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  background: '#f3f4f6',
                  color: '#374151',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {getFocusAreaIcon(area)}
                {area}
              </span>
            ))}
          </div>
        </div>

        {/* Weekly Balance Card */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: isMobile ? '20px' : '24px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: isMobile ? '18px' : '20px',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            Weekly Balance
          </h3>
          <p style={{
            margin: '0 0 20px 0',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            How you spent your time this week
          </p>

          {/* Progress Bar */}
          <div style={{
            height: '24px',
            borderRadius: '12px',
            background: '#f3f4f6',
            overflow: 'hidden',
            display: 'flex',
            marginBottom: '20px',
            position: 'relative'
          }}>
            {Object.entries(weeklyBalance).map(([category, hours], index) => {
              const percentage = totalHours > 0 ? (hours / totalHours) * 100 : 0;
              const leftOffset = Object.entries(weeklyBalance)
                .slice(0, index)
                .reduce((sum, [, h]) => sum + (totalHours > 0 ? (h / totalHours) * 100 : 0), 0);
              
              return (
                <div
                  key={category}
                  style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: getColorForCategory(category),
                    transition: 'width 0.3s ease'
                  }}
                  title={`${category}: ${hours}h`}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '20px'
          }}>
            {Object.entries(weeklyBalance).map(([category, hours]) => (
              <div
                key={category}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: getColorForCategory(category),
                  flexShrink: 0
                }} />
                <span style={{
                  fontSize: '13px',
                  color: '#6b7280'
                }}>
                  {category} {hours}h
                </span>
              </div>
            ))}
          </div>

          {/* Insights Button */}
          <button
            onClick={() => {}}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              background: 'white',
              color: '#374151',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#f9fafb';
              e.target.style.borderColor = '#d1d5db';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'white';
              e.target.style.borderColor = '#e5e7eb';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              <span>See My Weekly Insights</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        {/* Calendar Connections Section */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: isMobile ? '20px' : '24px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: isMobile ? '18px' : '20px',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            Calendar Connections
          </h3>
          <p style={{
            margin: '0 0 20px 0',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            Connect your calendars to sync events across platforms
          </p>

          {/* Google Calendar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            marginBottom: '12px',
            background: googleAuth.authorized ? '#f0f9ff' : 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: '#4285f4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '2px'
                }}>
                  Google Calendar
                </div>
                {googleAuth.authorized && googleAuth.user && (
                  <div style={{
                    fontSize: '13px',
                    color: '#6b7280'
                  }}>
                    Connected as {googleAuth.user.email || googleAuth.user.name}
                  </div>
                )}
              </div>
            </div>
            {googleAuth.authorized ? (
              <button
                onClick={handleGoogleDisconnect}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #dc2626',
                  background: 'white',
                  color: '#dc2626',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#fef2f2';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'white';
                }}
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleGoogleConnect}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#4285f4',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#357ae8';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = '#4285f4';
                }}
              >
                Connect
              </button>
            )}
          </div>

          {/* Outlook Calendar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: outlookAuth.authorized ? '#f0f9ff' : 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: '#0078d4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" fill="white"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '2px'
                }}>
                  Outlook Calendar
                </div>
                {outlookAuth.authorized && outlookAuth.user && (
                  <div style={{
                    fontSize: '13px',
                    color: '#6b7280'
                  }}>
                    Connected as {outlookAuth.user.email || outlookAuth.user.name}
                  </div>
                )}
              </div>
            </div>
            {outlookAuth.authorized ? (
              <button
                onClick={handleOutlookDisconnect}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #dc2626',
                  background: 'white',
                  color: '#dc2626',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#fef2f2';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'white';
                }}
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleOutlookConnect}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#0078d4',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#006cbe';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = '#0078d4';
                }}
              >
                Connect
              </button>
            )}
          </div>
        </div>

        {/* Shared Calendars Section */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: isMobile ? '20px' : '24px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <div>
              <h3 style={{
                margin: '0 0 4px 0',
                fontSize: isMobile ? '18px' : '20px',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Shared Calendars
              </h3>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#6b7280'
              }}>
                View calendars shared by others
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedSharedCalendar(null);
                setShowSharedCalendarModal(true);
              }}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#3b82f6',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#2563eb';
              }}
              onMouseOut={(e) => {
                e.target.style.background = '#3b82f6';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add
            </button>
          </div>

          {sharedCalendars.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: '14px'
            }}>
              No shared calendars yet. Add one to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sharedCalendars.map((calendar) => (
                <div
                  key={calendar.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    background: 'white',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: calendar.color || '#3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      flexShrink: 0
                    }}>
                      {getInitialsFromName(calendar.name)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        color: '#1f2937',
                        marginBottom: '2px'
                      }}>
                        {calendar.name}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#6b7280'
                      }}>
                        {calendar.email}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveSharedCalendar(calendar.id)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #dc2626',
                      background: 'white',
                      color: '#dc2626',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = '#fef2f2';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'white';
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interests Section */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: isMobile ? '20px' : '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: isMobile ? '18px' : '20px',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            Interests
          </h3>

          {Object.entries(interests).map(([category, items]) => (
            <div key={category} style={{ marginBottom: '24px' }}>
              <h4 style={{
                margin: '0 0 12px 0',
                fontSize: '15px',
                fontWeight: '600',
                color: '#374151'
              }}>
                {category}
              </h4>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '12px'
              }}>
                {items.map((interest, index) => (
                  <span
                    key={index}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      background: '#f3f4f6',
                      color: '#374151',
                      fontSize: '13px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = '#e5e7eb';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = '#f3f4f6';
                    }}
                    onClick={() => handleRemoveInterest(category, interest)}
                  >
                    {getInterestIcon(interest)}
                    {interest}
                  </span>
                ))}
              </div>
              <button
                onClick={() => handleAddInterest(category)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  color: '#6b7280',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#f9fafb';
                  e.target.style.borderColor = '#d1d5db';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'white';
                  e.target.style.borderColor = '#e5e7eb';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Profile Edit Modal */}
      {showEditModal && (
        <ProfileEditModal
          user={user}
          onClose={() => setShowEditModal(false)}
          onSave={(updatedUser) => {
            setUser(updatedUser);
            setShowEditModal(false);
          }}
        />
      )}

      {/* Shared Calendar Modal */}
      {showSharedCalendarModal && (
        <SharedCalendarModal
          calendar={selectedSharedCalendar}
          onClose={() => {
            setShowSharedCalendarModal(false);
            setSelectedSharedCalendar(null);
          }}
          onSave={handleAddSharedCalendar}
        />
      )}
    </div>
  );
};

export default ProfilePage;
