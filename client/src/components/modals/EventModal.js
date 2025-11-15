import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api';

// Event category color palette (same as CalendarPage)
const EVENT_CATEGORY_COLORS = {
  'Work': '#6A8FA6',        // Steel Blue
  'Study': '#E6E6FA',       // Soft Lavender
  'Personal': '#FFE4D1',    // Peach Tint
  'Leisure': '#C8F5E1',     // Mint Green
  'Fitness': '#7CCAC1',     // Fresh Blue-Green
  'Health': '#FFB7A8',      // Soft Coral
  'Travel': '#F6E4A6',      // Light Golden Sand
  'Rest': '#DDEFF5'         // Misty Light Blue
};

const EventModal = ({ event, categories, eventCategoryMapping = {}, onCategoryChange, onClose, onSave }) => {
  const [summary, setSummary] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [category, setCategory] = useState('work');
  const [repeat, setRepeat] = useState('none');
  const [linkedGoal, setLinkedGoal] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [goals, setGoals] = useState([]);
  const [outlookAuth, setOutlookAuth] = useState({ authorized: false });
  const [createInOutlook, setCreateInOutlook] = useState(false);
  
  // Check if event is from Outlook (read-only)
  const isOutlookEvent = event?.source === 'outlook';

  const repeatOptions = [
    { value: 'none', label: 'Does not repeat' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' }
  ];

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    loadGoals();
    checkOutlookAuth();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const checkOutlookAuth = async () => {
    try {
      const response = await apiFetch('/api/outlook/auth/status');
      const data = await response.json();
      setOutlookAuth(data);
    } catch (error) {
      console.error('Failed to check Outlook auth status:', error);
      setOutlookAuth({ authorized: false });
    }
  };

  const loadGoals = () => {
    // Use hardcoded goals similar to TaskModal
    const sampleGoals = [
      { id: 1, title: 'Learn Spanish' },
      { id: 2, title: 'Read 24 Books' },
      { id: 3, title: 'Run Marathon' },
      { id: 4, title: 'Learn Piano' },
      { id: 5, title: 'Build Mobile App' }
    ];
    setGoals(sampleGoals);
  };

  // Initialize form fields when event changes
  useEffect(() => {
    if (event) {
      const eventName = event.summary || event.text || '';
      setSummary(eventName);
      if (event.start || event.startTime) {
        const startDate = event.start ? new Date(event.start) : new Date(event.startTime);
        setDate(startDate.toISOString().split('T')[0]);
        const hours = String(startDate.getHours()).padStart(2, '0');
        const minutes = String(startDate.getMinutes()).padStart(2, '0');
        setStartTime(`${hours}:${minutes}`);
      } else {
        setDate('');
        setStartTime('');
      }
      if (event.end || event.endTime) {
        const endDate = event.end ? new Date(event.end) : new Date(event.endTime);
        const hours = String(endDate.getHours()).padStart(2, '0');
        const minutes = String(endDate.getMinutes()).padStart(2, '0');
        setEndTime(`${hours}:${minutes}`);
      } else {
        setEndTime('');
      }
      // Check for mapped category first, then event category, then default
      const mappedCategory = eventCategoryMapping[eventName];
      setCategory(mappedCategory || event.category || categories[0]?.key || 'work');
      setRepeat(event.repeat || 'none');
      setLinkedGoal(event.linkedGoal || '');
      setNotes(event.notes || '');
    } else {
      setSummary('');
      const today = new Date();
      setDate(today.toISOString().split('T')[0]);
      setStartTime('');
      setEndTime('');
      setCategory(categories[0]?.key || 'work');
      setRepeat('none');
      setLinkedGoal('');
      setNotes('');
    }
  }, [event, categories, eventCategoryMapping]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!summary.trim() || !date || !startTime || !endTime) return;

    // Prevent editing Outlook events
    if (isOutlookEvent) {
      alert('Outlook Calendar events are read-only. Please edit them in Outlook.');
      return;
    }

    setLoading(true);
    try {
      // Combine date and time for start/end
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);
      
      // If end time is before start time, assume it's the next day
      if (endDateTime < startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      const payload = {
        summary: summary.trim(),
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        category: category,
        repeat: repeat,
        linkedGoal: linkedGoal || null,
        notes: notes.trim() || null
      };

      if (event?.id && !isOutlookEvent) {
        // Update existing event (only if not Outlook)
        const res = await apiFetch(`/api/calendar/events/${event.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          onSave();
        }
      } else {
        // Create new event
        if (createInOutlook && outlookAuth.authorized) {
          // Create in Outlook Calendar
          const outlookPayload = {
            summary: summary.trim(),
            start: startDateTime.toISOString(),
            end: endDateTime.toISOString(),
            description: notes.trim() || ''
          };
          const outlookRes = await apiFetch('/api/outlook/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(outlookPayload)
          });
          if (outlookRes.ok) {
            onSave();
          }
        } else {
          // Create in local calendar
          const res = await apiFetch('/api/calendar/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            onSave();
          }
        }
      }
    } catch (err) {
      console.error('Failed to save event:', err);
      alert('Failed to save event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event?.id || !window.confirm('Are you sure you want to delete this event?')) return;
    
    // Prevent deleting Outlook events
    if (isOutlookEvent) {
      alert('Outlook Calendar events are read-only. Please delete them in Outlook.');
      return;
    }
    
    setLoading(true);
    try {
      const res = await apiFetch(`/api/calendar/events/${event.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onSave();
      }
    } catch (err) {
      console.error('Failed to delete event:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: isMobile ? '16px' : '24px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '500px',
          padding: isMobile ? '20px' : '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '8px'
        }}>
          <div style={{ flex: 1 }}>
            <h2 style={{
              margin: 0,
              fontSize: isMobile ? '20px' : '24px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '4px'
            }}>
              {isOutlookEvent ? 'Outlook Calendar Event' : event?.id ? 'Edit Event' : 'Add to Plan'}
            </h2>
            {isOutlookEvent && (
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#dc2626',
                fontWeight: '400',
                marginTop: '4px'
              }}>
                This event is read-only. Edit it in Outlook Calendar.
              </p>
            )}
            {!event?.id && !isOutlookEvent && (
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#6b7280',
                fontWeight: '400'
              }}>
                Create a new event or time block for your day
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              marginLeft: '16px'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
            {/* What are you planning? */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                What are you planning?
              </label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="e.g., Team meeting, Workout session"
                disabled={isOutlookEvent}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: isOutlookEvent ? '#f3f4f6' : 'white',
                  cursor: isOutlookEvent ? 'not-allowed' : 'text'
                }}
                onFocus={(e) => !isOutlookEvent && (e.target.style.borderColor = '#3b82f6')}
                onBlur={(e) => !isOutlookEvent && (e.target.style.borderColor = '#e5e7eb')}
                required
              />
            </div>

            {/* Category */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Category
                <span style={{
                  fontSize: '12px',
                  fontWeight: '400',
                  color: '#6b7280',
                  marginLeft: '8px'
                }}>
                  (affects event color)
                </span>
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={category}
                  onChange={(e) => {
                    const newCategory = e.target.value;
                    setCategory(newCategory);
                    // Save category mapping for this event name (works for all events, including Google/Outlook)
                    if (event && (event.summary || event.text) && newCategory) {
                      const eventName = event.summary || event.text;
                      if (onCategoryChange) {
                        onCategoryChange(eventName, newCategory);
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 36px 12px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    background: 'white',
                    boxSizing: 'border-box',
                    appearance: 'none',
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                >
                  <option value="">Choose a category</option>
                  {Object.keys(EVENT_CATEGORY_COLORS).map((catName) => (
                    <option key={catName} value={catName}>
                      {catName}
                    </option>
                  ))}
                  {categories.filter(cat => !Object.keys(EVENT_CATEGORY_COLORS).includes(cat.label)).map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                {category && EVENT_CATEGORY_COLORS[category] && (
                  <div style={{
                    position: 'absolute',
                    right: '40px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    background: EVENT_CATEGORY_COLORS[category],
                    border: '1px solid rgba(0,0,0,0.1)'
                  }} />
                )}
                <div style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#6b7280'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* When? */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '12px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                When?
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Date */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: '400',
                    color: '#6b7280'
                  }}>
                    Date
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      placeholder="mm/dd/yyyy"
                      disabled={isOutlookEvent}
                      style={{
                        width: '100%',
                        padding: '12px 36px 12px 16px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        color: date ? '#1f2937' : '#9ca3af',
                        background: isOutlookEvent ? '#f3f4f6' : 'white',
                        cursor: isOutlookEvent ? 'not-allowed' : 'text'
                      }}
                      onFocus={(e) => !isOutlookEvent && (e.target.style.borderColor = '#3b82f6')}
                      onBlur={(e) => !isOutlookEvent && (e.target.style.borderColor = '#e5e7eb')}
                      required
                    />
                    <div style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: '#9ca3af'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Start Time */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: '400',
                    color: '#6b7280'
                  }}>
                    Start Time
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      placeholder="--:-- --"
                      disabled={isOutlookEvent}
                      style={{
                        width: '100%',
                        padding: '12px 36px 12px 16px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        color: startTime ? '#1f2937' : '#9ca3af',
                        background: isOutlookEvent ? '#f3f4f6' : 'white',
                        cursor: isOutlookEvent ? 'not-allowed' : 'text'
                      }}
                      onFocus={(e) => !isOutlookEvent && (e.target.style.borderColor = '#3b82f6')}
                      onBlur={(e) => !isOutlookEvent && (e.target.style.borderColor = '#e5e7eb')}
                      required
                    />
                    <div style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: '#9ca3af'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* End Time */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: '400',
                    color: '#6b7280'
                  }}>
                    End Time
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      placeholder="--:-- --"
                      disabled={isOutlookEvent}
                      style={{
                        width: '100%',
                        padding: '12px 36px 12px 16px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        color: endTime ? '#1f2937' : '#9ca3af',
                        background: isOutlookEvent ? '#f3f4f6' : 'white',
                        cursor: isOutlookEvent ? 'not-allowed' : 'text'
                      }}
                      onFocus={(e) => !isOutlookEvent && (e.target.style.borderColor = '#3b82f6')}
                      onBlur={(e) => !isOutlookEvent && (e.target.style.borderColor = '#e5e7eb')}
                      required
                    />
                    <div style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: '#9ca3af'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Repeat */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10"/>
                  <polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
                </svg>
                Repeat
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value)}
                  disabled={isOutlookEvent}
                  style={{
                    width: '100%',
                    padding: '12px 36px 12px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    background: isOutlookEvent ? '#f3f4f6' : 'white',
                    boxSizing: 'border-box',
                    appearance: 'none',
                    cursor: isOutlookEvent ? 'not-allowed' : 'pointer'
                  }}
                  onFocus={(e) => !isOutlookEvent && (e.target.style.borderColor = '#3b82f6')}
                  onBlur={(e) => !isOutlookEvent && (e.target.style.borderColor = '#e5e7eb')}
                >
                  {repeatOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#6b7280'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* OPTIONAL Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '8px 0'
            }}>
              <div style={{
                flex: 1,
                height: '1px',
                background: '#e5e7eb'
              }} />
              <span style={{
                fontSize: '12px',
                fontWeight: '500',
                color: '#9ca3af',
                textTransform: 'uppercase'
              }}>
                OPTIONAL
              </span>
              <div style={{
                flex: 1,
                height: '1px',
                background: '#e5e7eb'
              }} />
            </div>

            {/* Linked Goal */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="6"/>
                  <circle cx="12" cy="12" r="2"/>
                </svg>
                Linked Goal
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={linkedGoal}
                  onChange={(e) => setLinkedGoal(e.target.value)}
                  disabled={isOutlookEvent}
                  style={{
                    width: '100%',
                    padding: '12px 36px 12px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    background: isOutlookEvent ? '#f3f4f6' : 'white',
                    boxSizing: 'border-box',
                    appearance: 'none',
                    cursor: isOutlookEvent ? 'not-allowed' : 'pointer'
                  }}
                  onFocus={(e) => !isOutlookEvent && (e.target.style.borderColor = '#3b82f6')}
                  onBlur={(e) => !isOutlookEvent && (e.target.style.borderColor = '#e5e7eb')}
                >
                  <option value="">Connect to a long-term goal (optional)</option>
                  {goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.title}
                    </option>
                  ))}
                </select>
                <div style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#6b7280'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
                disabled={isOutlookEvent}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  background: isOutlookEvent ? '#f3f4f6' : 'white',
                  cursor: isOutlookEvent ? 'not-allowed' : 'text'
                }}
                onFocus={(e) => !isOutlookEvent && (e.target.style.borderColor = '#3b82f6')}
                onBlur={(e) => !isOutlookEvent && (e.target.style.borderColor = '#e5e7eb')}
              />
            </div>

            {/* Create in Outlook Calendar Option */}
            {!event?.id && !isOutlookEvent && outlookAuth.authorized && (
              <div style={{
                padding: '12px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                marginTop: '8px'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: '#374151',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}>
                  <input
                    type="checkbox"
                    checked={createInOutlook}
                    onChange={(e) => setCreateInOutlook(e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#0078d4'
                    }}
                  />
                  <span>Create in Outlook Calendar</span>
                </label>
              </div>
            )}

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '8px',
              paddingTop: '16px'
            }}>
              {event?.id && !isOutlookEvent && (
                <button
                  type="button"
                  onClick={handleDelete}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    border: '1px solid #dc2626',
                    borderRadius: '8px',
                    background: 'white',
                    color: '#dc2626',
                    fontSize: '16px',
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
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#374151',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#f9fafb';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'white';
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || isOutlookEvent || !summary.trim() || !date || !startTime || !endTime}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  background: loading || isOutlookEvent || !summary.trim() || !date || !startTime || !endTime ? '#d1d5db' : '#06b6d4',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: loading || isOutlookEvent || !summary.trim() || !date || !startTime || !endTime ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  if (!loading && !isOutlookEvent && summary.trim() && date && startTime && endTime) {
                    e.target.style.background = '#0891b2';
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading && !isOutlookEvent && summary.trim() && date && startTime && endTime) {
                    e.target.style.background = '#06b6d4';
                  }
                }}
              >
                {isOutlookEvent ? 'Read-Only' : loading ? 'Adding...' : event?.id ? 'Save Changes' : 'Add to Plan'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;
