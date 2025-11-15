import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, API_BASE } from '../../api';
import EventModal from '../modals/EventModal';

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const CalendarPage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'week'
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [googleAuth, setGoogleAuth] = useState({ authorized: false, user: null });
  const [outlookAuth, setOutlookAuth] = useState({ authorized: false, user: null });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sharedCalendars, setSharedCalendars] = useState([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showOutlookEvents, setShowOutlookEvents] = useState(true);
  const [showGoogleEvents, setShowGoogleEvents] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Update current time every minute
    const updateTime = () => {
      setCurrentTime(new Date());
    };
    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    checkGoogleAuth();
    checkOutlookAuth();
    
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
  }, []);

  useEffect(() => {
    loadData();
  }, [googleAuth.authorized, outlookAuth.authorized]);

  const checkOutlookAuth = async () => {
    try {
      const response = await apiFetch('/api/outlook/auth/status');
      const data = await response.json();
      setOutlookAuth(data);
    } catch (error) {
      console.error('Failed to check Outlook auth status:', error);
      setOutlookAuth({ authorized: false, user: null });
    }
  };

    const checkGoogleAuth = async () => {
      try {
        const response = await apiFetch('/api/google/auth/status');
        const data = await response.json();
        setGoogleAuth(data);
      } catch (error) {
        console.error('Failed to check Google auth status:', error);
      }
    };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load calendar events
      const evRes = await apiFetch('/api/calendar/events');
      const evData = await evRes.json();
        setEvents(evData.events || []);
        
        // Load categories
        const catRes = await apiFetch('/api/calendar/categories');
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      
      // Load todos
      const todosRes = await apiFetch('/api/todos');
      const todosData = await todosRes.json();
      setTodos(todosData.todos || []);
        
        // Load Google Calendar events if authenticated
        if (googleAuth.authorized) {
          try {
            const googleRes = await apiFetch('/api/google/events');
            const googleData = await googleRes.json();
            if (googleData.events) {
              setEvents(prev => [...prev, ...googleData.events]);
            }
          } catch (error) {
            console.error('Failed to load Google Calendar events:', error);
          }
        }

        // Load Outlook Calendar events if authenticated
        if (outlookAuth.authorized) {
          try {
            const outlookRes = await apiFetch('/api/outlook/events');
            const outlookData = await outlookRes.json();
            if (outlookData.events) {
              setEvents(prev => [...prev, ...outlookData.events]);
            }
          } catch (error) {
            console.error('Failed to load Outlook Calendar events:', error);
          }
        }

        // Load shared calendars
        try {
          const sharedRes = await apiFetch('/api/calendar/shared');
          const sharedData = await sharedRes.json();
          const calendars = sharedData.sharedCalendars || [];
          setSharedCalendars(calendars);
          
          // Generate mock events for shared calendars (in a real app, these would come from the shared calendar API)
          const sharedEvents = calendars.flatMap(calendar => {
            // Generate a few sample events for demonstration
            const today = new Date();
            const events = [];
            for (let i = 0; i < 3; i++) {
              const eventDate = new Date(today);
              eventDate.setDate(today.getDate() + i);
              eventDate.setHours(10 + i * 2, 0, 0, 0);
              const endDate = new Date(eventDate);
              endDate.setHours(eventDate.getHours() + 1);
              
              events.push({
                id: `shared-${calendar.id}-${i}`,
                summary: `${calendar.name}'s Event ${i + 1}`,
                start: eventDate.toISOString(),
                end: endDate.toISOString(),
                source: 'shared',
                sharedCalendarId: calendar.id,
                sharedCalendarName: calendar.name,
                color: calendar.color
              });
            }
            return events;
          });
          
          if (sharedEvents.length > 0) {
            setEvents(prev => [...prev, ...sharedEvents]);
          }
        } catch (error) {
          console.error('Failed to load shared calendars:', error);
        }
      } catch (e) {
      console.error('Failed to load data:', e);
      } finally {
        setLoading(false);
      }
    };

  const getCategoryColor = (categoryKey) => {
    const category = categories.find(c => c.key === categoryKey);
    return category?.color || '#3b82f6';
  };

  const getEventColor = (event) => {
    // If event has a color from shared calendar, use it
    if (event.color) {
      return event.color;
    }
    // Style Outlook events with blue border
    if (event.source === 'outlook') {
      return '#0078d4';
    }
    // Style Google events with green border
    if (event.source === 'google') {
      return '#10b981';
    }
    // Otherwise use category color
    if (event.category) {
      return getCategoryColor(event.category);
    }
    return '#3b82f6';
  };

  const getTypeColor = (typeName) => {
    const colors = {
      'Work': '#3b82f6',
      'Fitness': '#9333ea',
      'Study': '#10b981',
      'Learn Spanish': '#10b981',
      'Personal': '#ec4899'
    };
    return colors[typeName] || '#6b7280';
  };

  const getDayEvents = () => {
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    // Filter events for the selected day and apply visibility filters
    const dayEvents = events.filter(event => {
      const eventStart = new Date(event.start);
      const isInDay = eventStart >= dayStart && eventStart <= dayEnd;
      // Apply source filters
      if (event.source === 'outlook' && !showOutlookEvents) return false;
      if (event.source === 'google' && !showGoogleEvents) return false;
      return isInDay;
    }).map(event => ({
      ...event,
      type: 'event',
      startTime: new Date(event.start),
      endTime: new Date(event.end),
      color: getEventColor(event)
    }));

    // Filter todos with due dates for the selected day
    const dayTodos = todos
      .filter(todo => !todo.completed && todo.due)
      .filter(todo => {
        const dueDate = new Date(todo.due);
        return isSameDay(dueDate, currentDate);
      })
      .map(todo => {
        const dueDate = new Date(todo.due);
        // Set default time to 11am if no time specified
        dueDate.setHours(11, 0, 0, 0);
        return {
          ...todo,
          type: 'task',
          startTime: dueDate,
          endTime: new Date(dueDate.getTime() + 60 * 60 * 1000), // 1 hour default
          color: getTypeColor(todo.type),
          isDashed: true
        };
      });

    // Combine and sort by start time
    return [...dayEvents, ...dayTodos].sort((a, b) => 
      a.startTime.getTime() - b.startTime.getTime()
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const goToPrevDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    setCurrentDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const goToPrevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentDate(prev);
  };

  const goToNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    // Adjust so Monday is the first day (Monday = 1, Sunday = 0)
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  };

  const getWeekDays = () => {
    const weekStart = getWeekStart(currentDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const formatWeekRange = () => {
    const weekStart = getWeekStart(currentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
    const startDay = weekStart.getDate();
    const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
    const endDay = weekEnd.getDate();
    const year = weekEnd.getFullYear();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}, ${year}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    }
  };

  const getWeekEvents = () => {
    const weekStart = getWeekStart(currentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    weekEnd.setHours(0, 0, 0, 0);

    // Filter events for the week and apply visibility filters
    const weekEvents = events.filter(event => {
      const eventStart = new Date(event.start);
      const isInWeek = eventStart >= weekStart && eventStart < weekEnd;
      // Apply source filters
      if (event.source === 'outlook' && !showOutlookEvents) return false;
      if (event.source === 'google' && !showGoogleEvents) return false;
      return isInWeek;
    }).map(event => ({
      ...event,
      type: 'event',
      startTime: new Date(event.start),
      endTime: new Date(event.end),
      color: getEventColor(event)
    }));

    // Filter todos with due dates for the week
    const weekTodos = todos
      .filter(todo => !todo.completed && todo.due)
      .filter(todo => {
        const dueDate = new Date(todo.due);
        return dueDate >= weekStart && dueDate < weekEnd;
      })
      .map(todo => {
        const dueDate = new Date(todo.due);
        dueDate.setHours(11, 0, 0, 0);
        return {
          ...todo,
          type: 'task',
          startTime: dueDate,
          endTime: new Date(dueDate.getTime() + 60 * 60 * 1000),
          color: getTypeColor(todo.type),
          isDashed: true
        };
      });

    return [...weekEvents, ...weekTodos];
  };

  const formatDateDisplay = (date) => {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatMonthYear = (date) => {
    const options = { month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const getHourPosition = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return hours * 60 + minutes; // Position in minutes from midnight
  };

  const getEventHeight = (start, end) => {
    const startMinutes = getHourPosition(start);
    const endMinutes = getHourPosition(end);
    const heightInMinutes = endMinutes - startMinutes;
    // Convert minutes to pixels (60px per hour = 1px per minute)
    return Math.max(40, heightInMinutes); // Minimum 40px height
  };

  const getEventTop = (start) => {
    const startMinutes = getHourPosition(start);
    // Start timeline at midnight (0 minutes from midnight)
    const timelineStart = 0;
    const offsetMinutes = startMinutes - timelineStart;
    // Convert minutes to pixels (60px per hour = 1px per minute)
    return offsetMinutes;
  };

  const getCurrentTimeTop = () => {
    return getEventTop(currentTime);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i); // 0 (midnight) to 23 (11pm)

  const dayEvents = getDayEvents();
  const userName = googleAuth.user?.name || 'User';

  return (
    <div style={{
      width: '100%',
      maxWidth: '100%',
      background: 'white',
      minHeight: 'calc(100vh - 80px)',
      paddingBottom: '120px',
      WebkitOverflowScrolling: 'touch'
    }}>
      {/* Header */}
      <div style={{ 
        padding: isMobile ? '20px 16px' : '24px 24px 20px',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <h1 style={{
          margin: '0 0 16px 0',
          fontSize: isMobile ? '20px' : '24px',
          fontWeight: '600',
          color: '#1f2937',
          lineHeight: '1.3'
        }}>
          {getGreeting()}, {userName} — here's your {viewMode === 'week' ? 'week' : 'day'}.
        </h1>

        {/* View Selector - Segmented Control */}
        <div style={{
          display: 'flex',
          background: '#f3f4f6',
          borderRadius: '10px',
          padding: '4px',
          gap: '4px',
          width: '100%',
          marginBottom: '16px'
        }}>
          <button 
            onClick={() => setViewMode('day')}
            style={{ 
              flex: 1,
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: viewMode === 'day' ? 'white' : 'transparent',
              color: viewMode === 'day' ? '#1f2937' : '#6b7280',
              fontSize: '14px',
              fontWeight: viewMode === 'day' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: viewMode === 'day' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              whiteSpace: 'nowrap'
            }}
          >
            Day
          </button>
          <button 
            onClick={() => setViewMode('week')}
            style={{ 
              flex: 1,
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: viewMode === 'week' ? 'white' : 'transparent',
              color: viewMode === 'week' ? '#1f2937' : '#6b7280',
              fontSize: '14px',
              fontWeight: viewMode === 'week' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: viewMode === 'week' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              whiteSpace: 'nowrap'
            }}
          >
            Week
          </button>
        </div>

        {/* Calendar Toggles */}
        {(googleAuth.authorized || outlookAuth.authorized) && (
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px',
            flexWrap: 'wrap'
          }}>
            {googleAuth.authorized && (
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
                  checked={showGoogleEvents}
                  onChange={(e) => setShowGoogleEvents(e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    accentColor: '#10b981'
                  }}
                />
                <span>Show Google Calendar</span>
              </label>
            )}
            {outlookAuth.authorized && (
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
                  checked={showOutlookEvents}
                  onChange={(e) => setShowOutlookEvents(e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    accentColor: '#0078d4'
                  }}
                />
                <span>Show Outlook Calendar</span>
              </label>
            )}
          </div>
        )}

        {/* Date Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div>
            {viewMode === 'week' ? (
              <div style={{
                fontSize: isMobile ? '18px' : '20px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '2px'
              }}>
                {formatWeekRange()}
              </div>
            ) : (
              <>
                <div style={{
                  fontSize: isMobile ? '18px' : '20px',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '2px'
                }}>
                  {formatDateDisplay(currentDate)}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  {formatMonthYear(currentDate)}
                </div>
              </>
            )}
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: '8px'
          }}>
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
                justifyContent: 'center'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
            </button>
            <button
              onClick={viewMode === 'week' ? goToPrevWeek : goToPrevDay}
              style={{
                background: 'transparent',
                border: 'none',
              cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button
              onClick={goToToday}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: '1px solid #e5e7eb',
              background: 'white',
              color: '#374151',
                fontSize: '14px',
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
              Now
            </button>
            <button
              onClick={viewMode === 'week' ? goToNextWeek : goToNextDay}
              style={{
                background: 'transparent',
                border: 'none',
              cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Suggestion Banner */}
      {showSuggestion && (
      <div style={{ 
          margin: '16px',
          padding: '16px',
          background: '#fff7ed',
          borderRadius: '12px',
          border: '1px solid #fed7aa',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: '#f97316',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '2px'
          }}>
            <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>!</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '15px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '4px'
            }}>
              Time to recharge
            </div>
            <div style={{
              fontSize: '13px',
              color: '#6b7280'
            }}>
              Consider adding more rest or leisure time
            </div>
          </div>
          <button
            onClick={() => setShowSuggestion(false)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#6b7280',
              flexShrink: 0
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
      </div>
      )}

      {/* Timeline */}
      {viewMode === 'day' && (
        <div style={{ 
          padding: isMobile ? '16px' : '24px',
          position: 'relative'
        }}>
          <div style={{
            display: 'flex',
            gap: '16px',
            position: 'relative'
          }}>
            {/* Time Labels */}
            <div style={{
              width: '60px',
              flexShrink: 0
            }}>
              {hours.map(hour => (
                <div
                  key={hour}
                  style={{
                    height: '60px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    paddingTop: '8px'
                  }}
                >
                  <span style={{
                    fontSize: '13px',
                    color: '#9ca3af',
                    fontWeight: '500'
                  }}>
                    {hour === 0 ? '12 am' : hour === 12 ? '12 pm' : hour > 12 ? `${hour - 12} pm` : `${hour} am`}
                  </span>
                </div>
              ))}
            </div>

            {/* Events Column */}
              <div style={{
              flex: 1,
                  position: 'relative', 
              minHeight: `${hours.length * 60}px`
            }}>
              {/* Current Time Indicator */}
              {isSameDay(currentDate, currentTime) && (
                <div
                  style={{
                    position: 'absolute',
                    top: `${getCurrentTimeTop()}px`,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: '#3b82f6',
                    zIndex: 100,
                    pointerEvents: 'none',
                    boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '-8px',
                      top: '-4px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#3b82f6',
                      border: '2px solid white',
                      boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)'
                    }}
                  />
                </div>
              )}
              {dayEvents.map((item, index) => {
                const top = getEventTop(item.startTime);
                const height = getEventHeight(item.startTime, item.endTime);
                const isTask = item.type === 'task';
                
                      return (
                  <div
                    key={index}
                    onClick={() => {
                      if (item.type === 'event') {
                        // Ensure we pass the full event object with all properties
                        const eventToShow = {
                          id: item.id,
                          summary: item.summary,
                          start: item.start || item.startTime?.toISOString(),
                          end: item.end || item.endTime?.toISOString(),
                          category: item.category,
                          ...item
                        };
                        setSelectedEvent(eventToShow);
                        setShowEventModal(true);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      top: `${top}px`,
                      left: 0,
                      right: 0,
                      height: `${height}px`,
                      background: `${item.color}20`,
                      border: isTask ? `2px dashed ${item.color}` : `2px solid ${item.color}`,
                      borderRadius: '8px',
                      padding: '8px 12px',
                      cursor: item.type === 'event' ? 'pointer' : 'default',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      minHeight: '40px',
                      overflow: 'hidden',
                      boxSizing: 'border-box'
                    }}
                    onMouseOver={(e) => {
                      if (item.type === 'event') {
                        e.currentTarget.style.background = `${item.color}30`;
                        e.currentTarget.style.transform = 'scale(1.02)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (item.type === 'event') {
                        e.currentTarget.style.background = `${item.color}20`;
                        e.currentTarget.style.transform = 'scale(1)';
                      }
                    }}
                  >
                    {isTask && (
                        <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2">
                          <polyline points="9 11 12 14 22 4"/>
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                      </div>
                    )}
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: height > 50 ? '4px' : '0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: height > 50 ? 'normal' : 'nowrap',
                      wordBreak: height > 50 ? 'break-word' : 'normal',
                      lineHeight: '1.4',
                      maxHeight: height > 50 ? 'none' : '20px'
                    }}>
                      {item.summary || item.text}
                      {item.sharedCalendarName && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '400',
                          color: '#6b7280',
                          marginLeft: '6px'
                        }}>
                          ({item.sharedCalendarName})
                        </span>
                      )}
                    </div>
                    {height > 50 && (
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        marginTop: '4px',
                        lineHeight: '1.3'
                      }}>
                        {formatTime(item.startTime)} - {formatTime(item.endTime)}
                      </div>
                    )}
                      </div>
                    );
                  })}
            </div>
          </div>
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div style={{ 
          padding: isMobile ? '8px 4px' : '24px',
          overflowX: isMobile ? 'hidden' : 'auto',
          WebkitOverflowScrolling: 'touch',
          width: '100%'
        }}>
          <div style={{
            width: '100%',
            minWidth: isMobile ? 'auto' : '700px'
          }}>
            {/* Day Headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '32px repeat(7, 1fr)' : '60px repeat(7, 1fr)',
              gap: isMobile ? '2px' : '8px',
              marginBottom: '8px',
              position: 'sticky',
              top: 0,
              background: 'white',
              zIndex: 10,
              paddingBottom: '8px',
              borderBottom: '1px solid #e5e7eb',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <div></div>
              {getWeekDays().map((day, index) => {
                const isToday = isSameDay(day, new Date());
                const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNumber = day.getDate();
                
                return (
                  <div
                    key={index}
                    style={{
                      textAlign: 'center',
                      padding: isMobile ? '4px 1px' : '8px 4px'
                    }}
                  >
                    <div style={{
                      fontSize: isMobile ? '9px' : '12px',
                      color: '#6b7280',
                      fontWeight: '500',
                      marginBottom: isMobile ? '2px' : '4px',
                      lineHeight: '1.2'
                    }}>
                      {dayName}
                    </div>
                    <div style={{
                      fontSize: isMobile ? '12px' : '16px',
                      fontWeight: '600',
                      color: isToday ? '#3b82f6' : '#1f2937',
                      width: isToday ? (isMobile ? '24px' : '32px') : 'auto',
                      height: isToday ? (isMobile ? '24px' : '32px') : 'auto',
                      borderRadius: isToday ? '50%' : '0',
                      background: isToday ? '#3b82f620' : 'transparent',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      lineHeight: '1'
                    }}>
                      {dayNumber}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calendar Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '32px repeat(7, 1fr)' : '60px repeat(7, 1fr)',
              gap: isMobile ? '2px' : '8px',
              position: 'relative',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              {/* Time Labels */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                position: 'sticky',
                left: 0,
                background: 'white',
                zIndex: 5
              }}>
                {hours.map(hour => (
                  <div
                    key={hour}
                    style={{
                      height: isMobile ? '45px' : '60px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      paddingTop: '4px',
                      paddingRight: isMobile ? '2px' : '8px',
                      justifyContent: 'flex-end',
                      boxSizing: 'border-box'
                    }}
                  >
                    <span style={{
                      fontSize: isMobile ? '9px' : '12px',
                      color: '#9ca3af',
                      fontWeight: '500',
                      lineHeight: '1'
                    }}>
                      {hour === 0 ? '12' : hour === 12 ? '12' : hour > 12 ? `${hour - 12}` : `${hour}`}
                      {isMobile ? '' : (hour === 0 ? ' am' : hour === 12 ? ' pm' : hour > 12 ? ' pm' : ' am')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {getWeekDays().map((day, dayIndex) => {
                const dayStart = new Date(day);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(day);
                dayEnd.setHours(23, 59, 59, 999);

                const dayEvents = getWeekEvents().filter(item => {
                  const eventStart = new Date(item.startTime);
                  return eventStart >= dayStart && eventStart <= dayEnd;
                });

                return (
                  <div
                    key={dayIndex}
                    style={{
                      position: 'relative',
                      minHeight: isMobile ? `${hours.length * 45}px` : `${hours.length * 60}px`,
                      borderRight: dayIndex < 6 ? '1px solid #e5e7eb' : 'none',
                      overflow: 'visible'
                    }}
                  >
                    {/* Hour Grid Lines */}
                    {hours.map((hour, hourIndex) => (
                      <div
                        key={hour}
                        style={{
                          height: isMobile ? '45px' : '60px',
                          borderBottom: hourIndex < hours.length - 1 ? '1px solid #f3f4f6' : 'none',
                          boxSizing: 'border-box',
                          pointerEvents: 'none'
                        }}
                      />
                    ))}

                    {/* Current Time Indicator */}
                    {isSameDay(day, currentTime) && (
                      <div
                        style={{
                          position: 'absolute',
                          top: `${isMobile ? getCurrentTimeTop() * (45/60) : getCurrentTimeTop()}px`,
                          left: 0,
                          right: 0,
                          height: '2px',
                          background: '#3b82f6',
                          zIndex: 100,
                          pointerEvents: 'none',
                          boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)'
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left: '-6px',
                            top: '-4px',
                            width: isMobile ? '8px' : '10px',
                            height: isMobile ? '8px' : '10px',
                            borderRadius: '50%',
                            background: '#3b82f6',
                            border: '2px solid white',
                            boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)'
                          }}
                        />
                      </div>
                    )}

                    {/* Events */}
                    {dayEvents.map((item, eventIndex) => {
                      const top = isMobile ? getEventTop(item.startTime) * (45/60) : getEventTop(item.startTime);
                      const height = isMobile ? getEventHeight(item.startTime, item.endTime) * (45/60) : getEventHeight(item.startTime, item.endTime);
                      const isTask = item.type === 'task';
                      const eventText = item.summary || item.text || '';
                      const canShowTime = height > (isMobile ? 25 : 35);
                      
                      return (
                        <div
                          key={eventIndex}
                          onClick={() => {
                            if (item.type === 'event') {
                              // Ensure we pass the full event object with all properties
                              const eventToShow = {
                                id: item.id,
                                summary: item.summary,
                                start: item.start || item.startTime?.toISOString(),
                                end: item.end || item.endTime?.toISOString(),
                                category: item.category,
                                ...item
                              };
                              setSelectedEvent(eventToShow);
                              setShowEventModal(true);
                            }
                          }}
                          style={{
                            position: 'absolute',
                            top: `${top}px`,
                            left: isMobile ? '1px' : '4px',
                            right: isMobile ? '1px' : '4px',
                            height: `${height}px`,
                            background: `${item.color}25`,
                            border: isTask ? `1.5px dashed ${item.color}` : `1.5px solid ${item.color}`,
                            borderRadius: isMobile ? '3px' : '6px',
                            padding: isMobile ? '4px 6px' : '8px 10px',
                            cursor: item.type === 'event' ? 'pointer' : 'default',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: canShowTime ? 'flex-start' : 'center',
                            minHeight: isMobile ? '20px' : '32px',
                            zIndex: 1,
                            overflow: 'hidden',
                            boxSizing: 'border-box'
                          }}
                          onMouseOver={(e) => {
                            if (item.type === 'event') {
                              e.currentTarget.style.background = `${item.color}35`;
                              e.currentTarget.style.zIndex = 2;
                            }
                          }}
                          onMouseOut={(e) => {
                            if (item.type === 'event') {
                              e.currentTarget.style.background = `${item.color}25`;
                              e.currentTarget.style.zIndex = 1;
                            }
                          }}
                        >
                          {isTask && (
                            <svg width={isMobile ? "8" : "12"} height={isMobile ? "8" : "12"} viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2" style={{ marginBottom: '2px', flexShrink: 0, marginRight: '4px' }}>
                              <polyline points="9 11 12 14 22 4"/>
                              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                            </svg>
                          )}
                          <div style={{
                            fontSize: isMobile ? '11px' : '13px',
                            fontWeight: '600',
                            color: '#111827',
                            lineHeight: '1.4',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: canShowTime ? 'normal' : 'nowrap',
                            wordBreak: 'break-word',
                            display: '-webkit-box',
                            WebkitLineClamp: canShowTime ? 3 : 2,
                            WebkitBoxOrient: 'vertical',
                            flex: 1,
                            textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)'
                          }}>
                            {eventText}
                            {item.sharedCalendarName && (
                              <span style={{
                                fontSize: isMobile ? '9px' : '10px',
                                fontWeight: '400',
                                color: '#6b7280',
                                marginLeft: '4px'
                              }}>
                                ({item.sharedCalendarName})
                              </span>
                            )}
                          </div>
                          {canShowTime && !isTask && (
                            <div style={{
                              fontSize: isMobile ? '8px' : '10px',
                              color: '#6b7280',
                              marginTop: '2px',
                              lineHeight: '1.2',
                              flexShrink: 0
                            }}>
                              {formatTime(item.startTime)} - {formatTime(item.endTime)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          style={{
            position: 'fixed',
            bottom: isMobile ? '100px' : '120px',
            right: isMobile ? '20px' : '40px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#374151',
            border: 'none',
            color: 'white',
            fontSize: '28px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.transform = 'scale(1.1)';
            e.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
          }}
        >
          +
        </button>

        {/* Add Menu Dropdown */}
        {showAddMenu && (
          <>
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                background: 'transparent'
              }}
              onClick={() => setShowAddMenu(false)}
            />
            <div
              style={{
                position: 'fixed',
                bottom: isMobile ? '170px' : '190px',
                right: isMobile ? '20px' : '40px',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 1002,
                minWidth: '200px',
                overflow: 'hidden',
                border: '1px solid #e5e7eb'
              }}
            >
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  setSelectedEvent(null);
                  setShowEventModal(true);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  background: 'white',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#f9fafb';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'white';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add manually
              </button>
              <div style={{
                height: '1px',
                background: '#e5e7eb'
              }} />
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  navigate('/app/althy');
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  background: 'white',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#f9fafb';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'white';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Let Althy help you
              </button>
            </div>
          </>
        )}
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          event={selectedEvent}
          categories={categories}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
          onSave={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default CalendarPage;
