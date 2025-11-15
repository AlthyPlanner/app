import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, API_BASE } from '../../api';
import EventModal from '../modals/EventModal';
import { calculateDailyStatus } from '../../utils/balanceTracker';
import './CalendarPage.css';

// Event category color palette
const EVENT_CATEGORY_COLORS = {
  'Work': '#6A8FA6',        // Steel Blue
  'Study': '#E6E6FA',       // Soft Lavender
  'Personal': '#FFE4D1',    // Peach Tint
  'Leisure': '#C8F5E1',    // Mint Green
  'Fitness': '#7CCAC1',     // Fresh Blue-Green
  'Health': '#FFB7A8',      // Soft Coral
  'Travel': '#F6E4A6',      // Light Golden Sand
  'Rest': '#DDEFF5'         // Misty Light Blue
};

// Event category mapping utilities
const getEventCategoryMapping = () => {
  try {
    const stored = localStorage.getItem('eventCategoryMapping');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load event category mapping:', error);
    return {};
  }
};

const saveEventCategoryMapping = (mapping) => {
  try {
    localStorage.setItem('eventCategoryMapping', JSON.stringify(mapping));
  } catch (error) {
    console.error('Failed to save event category mapping:', error);
  }
};

const getEventCategory = (eventName) => {
  const mapping = getEventCategoryMapping();
  return mapping[eventName] || null;
};

const setEventCategory = (eventName, category) => {
  const mapping = getEventCategoryMapping();
  mapping[eventName] = category;
  saveEventCategoryMapping(mapping);
};

// Day starts at 3am, so we need to adjust day comparison
function getDayStart(date) {
  const d = new Date(date);
  // If time is before 3am, consider it part of the previous day
  if (d.getHours() < 3) {
    d.setDate(d.getDate() - 1);
  }
  d.setHours(3, 0, 0, 0);
  return d;
}

function isSameDay(a, b) {
  const dayStartA = getDayStart(a);
  const dayStartB = getDayStart(b);
  return dayStartA.getTime() === dayStartB.getTime();
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [googleAuth, setGoogleAuth] = useState({ authorized: false, user: null });
  const [outlookAuth, setOutlookAuth] = useState({ authorized: false, user: null });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sharedCalendars, setSharedCalendars] = useState([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showOutlookEvents, setShowOutlookEvents] = useState(true);
  const [selectedGoogleCalendar, setSelectedGoogleCalendar] = useState('My calendar');
  const [dailyStatus, setDailyStatus] = useState(null);
  const [showStatusMessage, setShowStatusMessage] = useState(true);
  const [eventCategoryMapping, setEventCategoryMapping] = useState(getEventCategoryMapping());

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
    if (urlParams.get('auth') === 'success') {
      checkGoogleAuth();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (urlParams.get('outlook_auth') === 'success') {
      checkOutlookAuth();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (urlParams.get('error') === 'auth_failed') {
      alert('Failed to connect Google Calendar. Please try again.');
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

  // Calculate daily status when events/todos change
  useEffect(() => {
    if (events.length > 0 || todos.length > 0) {
      const today = new Date();
      const status = calculateDailyStatus(events, todos, today);
      setDailyStatus(status);
      // Show status message when a new status is calculated
      if (status && status.message) {
        setShowStatusMessage(true);
      }
    }
  }, [events, todos]);

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
    
    // Get event name for category mapping
    const eventName = event.summary || event.text || '';
    
    // Check if there's a category mapping for this event name
    const mappedCategory = getEventCategory(eventName);
    if (mappedCategory && EVENT_CATEGORY_COLORS[mappedCategory]) {
      return EVENT_CATEGORY_COLORS[mappedCategory];
    }
    
    // Use event's category if available
    if (event.category) {
      const categoryColor = getCategoryColor(event.category);
      if (categoryColor !== '#3b82f6') {
        return categoryColor;
      }
    }
    
    // Style Outlook events with blue border
    if (event.source === 'outlook') {
      return '#0078d4';
    }
    // Style Google events with green border
    if (event.source === 'google') {
      return '#10b981';
    }
    
    return '#3b82f6';
  };
  
  const handleEventCategoryChange = (eventName, category) => {
    setEventCategory(eventName, category);
    setEventCategoryMapping(getEventCategoryMapping());
    // Reload data to update colors
    loadData();
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
    // Day starts at 3am
    const dayStart = getDayStart(currentDate);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    dayEnd.setHours(2, 59, 59, 999); // 2:59:59am next day

    // Filter events for the selected day and apply visibility filters
    const dayEvents = events.filter(event => {
      const eventStart = new Date(event.start);
      const isInDay = eventStart >= dayStart && eventStart <= dayEnd;
      // Apply source filters
      if (event.source === 'outlook' && !showOutlookEvents) return false;
      if (event.source === 'google') {
        // Filter by selected calendar
        const eventCalendar = event.calendarName || 'My calendar';
        if (selectedGoogleCalendar === 'My calendar' && eventCalendar !== 'My calendar') return false;
        if (selectedGoogleCalendar !== 'My calendar' && eventCalendar !== selectedGoogleCalendar) return false;
      }
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
    // Week starts at 3am of Monday
    weekStart.setHours(3, 0, 0, 0);
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
    weekEnd.setHours(3, 0, 0, 0);

    // Filter events for the week and apply visibility filters
    const weekEvents = events.filter(event => {
      const eventStart = new Date(event.start);
      const isInWeek = eventStart >= weekStart && eventStart < weekEnd;
      // Apply source filters
      if (event.source === 'outlook' && !showOutlookEvents) return false;
      if (event.source === 'google') {
        // Filter by selected calendar
        const eventCalendar = event.calendarName || 'My calendar';
        if (selectedGoogleCalendar === 'My calendar' && eventCalendar !== 'My calendar') return false;
        if (selectedGoogleCalendar !== 'My calendar' && eventCalendar !== selectedGoogleCalendar) return false;
      }
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
    // Calculate position from 3am (day start)
    // Hours before 3am are part of previous day, so add 24 hours
    const adjustedHours = hours < 3 ? hours + 24 : hours;
    return (adjustedHours - 3) * 60 + minutes; // Position in minutes from 3am
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
    // Start timeline at 3am (0 minutes from 3am)
    const timelineStart = 0;
    const offsetMinutes = startMinutes - timelineStart;
    // Convert minutes to pixels (60px per hour = 1px per minute)
    return offsetMinutes;
  };

  const getCurrentTimeTop = () => {
    return getEventTop(currentTime);
  };

  // Hours displayed: 3am to 2am (next day), shown as 3, 4, ..., 23, 0, 1, 2
  const hours = Array.from({ length: 24 }, (_, i) => (i + 3) % 24); // 3am to 2am

  const dayEvents = getDayEvents();
  const userName = googleAuth.user?.name || 'User';

  return (
    <div className="calendar-page">
      {/* Header */}
      <div className="calendar-header">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '16px',
          gap: '12px'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: isMobile ? '20px' : '24px',
            fontWeight: '600',
            color: '#1f2937',
            lineHeight: '1.3',
            flex: 1
          }}>
            {getGreeting()}, {userName} — here's your {viewMode === 'week' ? 'week' : 'day'}.
          </h1>
          
          {/* Daily Status Badge */}
          {dailyStatus && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: `${dailyStatus.color}15`,
              border: `1px solid ${dailyStatus.color}40`,
              flexShrink: 0
            }}>
              <span style={{ fontSize: '14px' }}>{dailyStatus.icon}</span>
              <span style={{
                fontSize: isMobile ? '11px' : '12px',
                fontWeight: '600',
                color: dailyStatus.color,
                textTransform: 'capitalize'
              }}>
                {dailyStatus.status}
              </span>
            </div>
          )}
        </div>

        {/* Daily Status Message */}
        {dailyStatus && dailyStatus.message && showStatusMessage && (
          <div className={`status-message ${dailyStatus.status === 'overloaded' ? 'status-message-overloaded' : 'status-message-balanced'}`}>
            <span style={{ fontSize: '18px' }}>{dailyStatus.icon}</span>
            <p className={`status-message-text ${dailyStatus.status === 'overloaded' ? 'status-message-text-overloaded' : 'status-message-text-balanced'}`}>
              {dailyStatus.message}
            </p>
            <button
              onClick={() => setShowStatusMessage(false)}
              className="status-close-button"
              style={{
                color: dailyStatus.status === 'overloaded' ? '#991b1b' : '#92400e'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}

        {/* View Selector and Calendar Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '16px'
        }}>
          {/* View Selector - Segmented Control */}
          <div className="view-selector">
            <button 
              onClick={() => setViewMode('day')}
              className={`view-button ${viewMode === 'day' ? 'view-button-active' : 'view-button-inactive'}`}
            >
              Day
            </button>
            <button 
              onClick={() => setViewMode('week')}
              className={`view-button ${viewMode === 'week' ? 'view-button-active' : 'view-button-inactive'}`}
            >
              Week
            </button>
          </div>

          {/* Calendar Selector */}
          {googleAuth.authorized && (
            <div className="calendar-selector">
              <select
                value={selectedGoogleCalendar}
                onChange={(e) => setSelectedGoogleCalendar(e.target.value)}
                className="calendar-select"
              >
                <option value="My calendar">My calendar</option>
                <option value="Mom's calendar">Mom's calendar</option>
                <option value="Friend's calendar">Friend's calendar</option>
              </select>
            </div>
          )}
        </div>

        {/* Date Navigation */}
        <div className="date-navigation">
          <div>
            {viewMode === 'week' ? (
              <div className="date-display" style={{ fontSize: isMobile ? '18px' : '20px' }}>
                {formatWeekRange()}
              </div>
            ) : (
              <>
                <div className="date-display" style={{ fontSize: isMobile ? '18px' : '20px' }}>
                  {formatDateDisplay(currentDate)}
                </div>
                <div className="date-month-year">
                  {formatMonthYear(currentDate)}
                </div>
              </>
            )}
          </div>
          <div className="nav-buttons">
            <button
              onClick={viewMode === 'week' ? goToPrevWeek : goToPrevDay}
              className="nav-button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="today-button"
            >
              Now
            </button>
            <button
              onClick={viewMode === 'week' ? goToNextWeek : goToNextDay}
              className="nav-button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

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
                    {hour === 0 ? '12 am' : hour === 3 ? '3 am' : hour === 12 ? '12 pm' : hour > 12 ? `${hour - 12} pm` : `${hour} am`}
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
                
                // For tasks, show only a small indicator
                if (isTask) {
                  return (
                    <div
                      key={index}
                      style={{
                        position: 'absolute',
                        top: `${top}px`,
                        left: '4px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: item.color,
                        border: `2px solid white`,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        zIndex: 10,
                        cursor: 'default'
                      }}
                      title={item.text || item.summary}
                    />
                  );
                }
                
                // For events, show full details
                return (
                  <div
                    key={index}
                    onClick={() => {
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
                    }}
                    style={{
                      position: 'absolute',
                      top: `${top}px`,
                      left: 0,
                      right: 0,
                      height: `${height}px`,
                      background: `${item.color}20`,
                      border: `2px solid ${item.color}`,
                      borderRadius: '8px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      minHeight: '40px',
                      overflow: 'hidden',
                      boxSizing: 'border-box'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = `${item.color}30`;
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = `${item.color}20`;
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '400',
                      color: '#1f2937',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: height > 30 ? 'normal' : 'nowrap',
                      wordBreak: 'break-word',
                      lineHeight: '1.1',
                      maxHeight: height > 30 ? 'none' : '14px'
                    }}>
                      {item.summary || item.text}
                      {item.sharedCalendarName && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '400',
                          color: '#6b7280',
                          marginLeft: '6px'
                        }}>
                          ({item.sharedCalendarName})
                        </span>
                      )}
                    </div>
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
                      {hour === 0 ? '12' : hour === 3 ? '3' : hour === 12 ? '12' : hour > 12 ? `${hour - 12}` : `${hour}`}
                      {isMobile ? '' : (hour === 0 ? ' am' : hour === 3 ? ' am' : hour === 12 ? ' pm' : hour > 12 ? ' pm' : ' am')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {getWeekDays().map((day, dayIndex) => {
                const dayStart = getDayStart(day);
                const dayEnd = new Date(dayStart);
                dayEnd.setDate(dayEnd.getDate() + 1);
                dayEnd.setHours(2, 59, 59, 999); // 2:59:59am next day

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
                      
                      // For tasks, show only a small indicator
                      if (isTask) {
                        return (
                          <div
                            key={eventIndex}
                            style={{
                              position: 'absolute',
                              top: `${top}px`,
                              left: isMobile ? '2px' : '4px',
                              width: isMobile ? '6px' : '8px',
                              height: isMobile ? '6px' : '8px',
                              borderRadius: '50%',
                              background: item.color,
                              border: `2px solid white`,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              zIndex: 10,
                              cursor: 'default'
                            }}
                            title={item.text || item.summary}
                          />
                        );
                      }
                      
                      // For events, show full details
                      return (
                        <div
                          key={eventIndex}
                          onClick={() => {
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
                          }}
                          style={{
                            position: 'absolute',
                            top: `${top}px`,
                            left: isMobile ? '1px' : '4px',
                            right: isMobile ? '1px' : '4px',
                            height: `${height}px`,
                            background: `${item.color}25`,
                            border: `1.5px solid ${item.color}`,
                            borderRadius: isMobile ? '3px' : '6px',
                            padding: isMobile ? '2px 3px' : '4px 5px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            minHeight: isMobile ? '20px' : '32px',
                            zIndex: 1,
                            overflow: 'hidden',
                            boxSizing: 'border-box'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = `${item.color}35`;
                            e.currentTarget.style.zIndex = 2;
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = `${item.color}25`;
                            e.currentTarget.style.zIndex = 1;
                          }}
                        >
                          <div style={{
                            fontSize: isMobile ? '10px' : '11px',
                            fontWeight: '400',
                            color: '#111827',
                            lineHeight: '1.1',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: height > (isMobile ? 25 : 30) ? 'normal' : 'nowrap',
                            wordBreak: 'break-word',
                            display: '-webkit-box',
                            WebkitLineClamp: height > (isMobile ? 25 : 30) ? 4 : 3,
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
          eventCategoryMapping={eventCategoryMapping}
          onCategoryChange={handleEventCategoryChange}
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
