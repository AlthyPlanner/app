import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, API_BASE } from '../../api';
import EventModal from '../modals/EventModal';
import TaskModal from '../modals/TaskModal';
import { calculateDailyStatus } from '../../utils/balanceTracker';
import './CalendarPage.css';

// Event category color palette - will be built from categories loaded from API

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
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'week'
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showTasks, setShowTasks] = useState(true); // Toggle for showing/hiding tasks
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
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [expandedDayIndex, setExpandedDayIndex] = useState(null); // For week view: which day column is expanded

  const checkGoogleAuth = async () => {
    try {
      const response = await apiFetch('/api/google/auth/status', {
        credentials: 'include'   // <-- REQUIRED
      });
      const data = await response.json();
      setGoogleAuth(data);
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
      console.error('Failed to check Outlook auth status:', error);
      setOutlookAuth({ authorized: false, user: null });
    }
  };

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
      // Add a small delay to ensure session is established, then check auth status
      setTimeout(async () => {
        await checkGoogleAuth();
        setNotificationMessage('Successfully connected to Google Calendar!');
        setShowNotification(true);
        // Auto-hide notification after 3 seconds
        setTimeout(() => setShowNotification(false), 3000);
      }, 500);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (urlParams.get('outlook_auth') === 'success') {
      // Add a small delay to ensure session is established, then check auth status
      setTimeout(async () => {
        await checkOutlookAuth();
        setNotificationMessage('Successfully connected to Outlook Calendar!');
        setShowNotification(true);
        // Auto-hide notification after 3 seconds
        setTimeout(() => setShowNotification(false), 3000);
      }, 500);
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
    const today = new Date();
    const status = calculateDailyStatus(events, todos, today);
    setDailyStatus(status);
    // Show status message when a new status is calculated and has a message
    if (status && status.message) {
      setShowStatusMessage(true);
    } else {
      setShowStatusMessage(false);
    }
  }, [events, todos]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // First verify user is authenticated
      let isAuthenticated = false;
      try {
        const authRes = await apiFetch('/api/auth/me');
        if (authRes.ok) {
          const authData = await authRes.json();
          isAuthenticated = !!authData.user;
          if (!isAuthenticated) {
            console.warn('⚠️  User not authenticated, calendar events may not load from database');
          }
        }
      } catch (authError) {
        console.error('Failed to check authentication:', authError);
      }
      
      // Load calendar events from database (includes Google events if synced)
      // The backend will return events from database if user is authenticated,
      // or fallback to file-based calendar if not authenticated
      try {
        const evRes = await apiFetch('/api/calendar/events');
        if (!evRes.ok) {
          throw new Error(`Failed to load events: ${evRes.status}`);
        }
        const evData = await evRes.json();
        const loadedEvents = evData.events || [];
        console.log(`📅 Loaded ${loadedEvents.length} events from ${isAuthenticated ? 'database' : 'file-based calendar'}`);
        setEvents(loadedEvents);
        
        // If Google is connected, optionally sync fresh events (but don't block on it)
        if (googleAuth.authorized) {
          // Sync Google events in background (non-blocking)
          apiFetch('/api/google/events').catch(err => {
            console.log('Background Google sync failed (non-critical):', err);
          });
        }
      } catch (error) {
        console.error('Failed to load calendar events:', error);
        setEvents([]);
      }
        
        // Load categories
        const catRes = await apiFetch('/api/calendar/categories');
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      
      // Load todos
      const todosRes = await apiFetch('/api/todos');
      const todosData = await todosRes.json();
      setTodos(todosData.todos || []);

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
    // Try to find by key first
    let category = categories.find(c => c.key === categoryKey || c.key === categoryKey?.toLowerCase());
    // If not found, try by label
    if (!category) {
      category = categories.find(c => c.label === categoryKey || c.label === categoryKey?.charAt(0).toUpperCase() + categoryKey?.slice(1));
    }
    return category?.color || '#3b82f6';
  };

  // Helper function to determine text color based on background color
  const getTextColorForBackground = (backgroundColor) => {
    // All categories use black text for consistency
    return '#333';
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
    if (mappedCategory) {
      const mappedColor = getCategoryColor(mappedCategory);
      if (mappedColor !== '#3b82f6') {
        return mappedColor;
      }
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

  const getEventCategoryClass = (event) => {
    const eventName = event.summary || event.text || '';
    const mappedCategory = getEventCategory(eventName);
    if (mappedCategory) {
      const category = categories.find(c => c.key === mappedCategory || c.key === mappedCategory.toLowerCase() || c.label === mappedCategory);
      if (category) {
        const categoryKey = category.key.toLowerCase();
        return `event-color-${categoryKey}`;
      }
    }
    if (event.category) {
      const category = categories.find(c => c.key === event.category || c.key === event.category.toLowerCase());
      if (category) {
        const categoryKey = category.key.toLowerCase();
        return `event-color-${categoryKey}`;
      }
    }
    return '';
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
      .filter(todo => {
        // Only show incomplete tasks with due dates
        if (todo.completed || !todo.due) return false;
        
        // Parse the due date
        const dueDate = new Date(todo.due);
        if (isNaN(dueDate.getTime())) return false; // Invalid date
        
        // Check if the due date matches the current day (accounting for 3am day start)
        return isSameDay(dueDate, currentDate);
      })
      .map(todo => {
        const dueDate = new Date(todo.due);
        // Preserve the time if it exists, otherwise set default to 11am
        if (dueDate.getHours() === 0 && dueDate.getMinutes() === 0) {
        dueDate.setHours(11, 0, 0, 0);
        }
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
      .filter(todo => {
        // Only show incomplete tasks with due dates
        if (todo.completed || !todo.due) return false;
        
        // Parse the due date
        const dueDate = new Date(todo.due);
        if (isNaN(dueDate.getTime())) return false; // Invalid date
        
        // Check if the due date is within the week range
        return dueDate >= weekStart && dueDate < weekEnd;
      })
      .map(todo => {
        const dueDate = new Date(todo.due);
        // Preserve the time if it exists, otherwise set default to 11am
        if (dueDate.getHours() === 0 && dueDate.getMinutes() === 0) {
        dueDate.setHours(11, 0, 0, 0);
        }
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
        <div className="calendar-header-top">
          <h1 className="calendar-greeting">
          {events.length === 0 && todos.filter(t => !t.completed && t.due).length === 0
            ? "Add an event or connect to calendar to begin"
            : `${getGreeting()}, ${userName} — here's your ${viewMode === 'week' ? 'week' : 'day'}.`
          }
        </h1>

          {/* Daily Status Badge */}
          {dailyStatus && (
            <div 
              className="status-badge"
              style={{
                background: `${dailyStatus.color}15`,
                border: `1px solid ${dailyStatus.color}40`
              }}
            >
              <span className="status-badge-icon">{dailyStatus.icon}</span>
              <span 
                className="status-badge-text"
                style={{ color: dailyStatus.color }}
              >
                {dailyStatus.status === 'default' ? 'No Events' : dailyStatus.status.charAt(0).toUpperCase() + dailyStatus.status.slice(1)}
              </span>
            </div>
          )}

        </div>

        {/* Daily Status Message */}
        {dailyStatus && dailyStatus.message && showStatusMessage && (
          <div className={`status-message ${dailyStatus.status === 'overloaded' ? 'status-message-overloaded' : 'status-message-balanced'}`}>
            <span className="status-message-icon">{dailyStatus.icon}</span>
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
        <div className="view-selector-container">
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

          {/* Show/Hide Todos Toggle */}
          <button
            onClick={() => setShowTasks(!showTasks)}
            className="tasks-toggle-button"
            title={showTasks ? 'Hide todos' : 'Show todos'}
          >
            {showTasks ? 'Hide Todos' : 'Show Todos'}
          </button>
        </div>

        {/* Date Navigation */}
        <div className="date-navigation">
          <div>
            {viewMode === 'week' ? (
              <div className="date-display">
                {formatWeekRange()}
              </div>
            ) : (
              <>
                <div className="date-display">
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
        <div className="timeline-container">
          <div className="timeline-wrapper">
            {/* Time Labels */}
            <div className="time-labels">
              {hours.map(hour => (
                <div key={hour} className="time-label-item">
                  <span className="time-label-text">
                    {hour === 0 ? '12 am' : hour === 3 ? '3 am' : hour === 12 ? '12 pm' : hour > 12 ? `${hour - 12} pm` : `${hour} am`}
                  </span>
                </div>
              ))}
            </div>

            {/* Events Column */}
            <div className="events-column">
              {/* Current Time Indicator */}
              {isSameDay(currentDate, currentTime) && (
                <div
                  className="current-time-indicator"
                  style={{ top: `${getCurrentTimeTop()}px` }}
                >
                  <div className="current-time-dot" />
                </div>
              )}
              {dayEvents.map((item, index) => {
                const top = getEventTop(item.startTime);
                const height = getEventHeight(item.startTime, item.endTime);
                const isTask = item.type === 'task';
                
                // For tasks, show as a full event item with text
                if (isTask && !showTasks) {
                  return null; // Hide task if toggle is off
                }
                if (isTask) {
                  const categoryClass = getEventCategoryClass(item);
                  // Helper function to convert hex to rgba
                  const hexToRgba = (hex, alpha) => {
                    if (!hex || !hex.startsWith('#')) return `rgba(128, 128, 128, ${alpha})`;
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                  };
                      return (
                  <div
                    key={index}
                      className={`event-item ${categoryClass || ''} task-item ${!categoryClass ? 'task-item-static task-item-border' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        // Find the todo by matching text and due date since todos don't have ids
                        const todo = todos.find(t => {
                          // Match by text first
                          if (t.text !== (item.text || item.summary) || t.completed) {
                            return false;
                          }
                          // Match by due date - normalize both to compare just the date/time
                          if (t.due && item.due) {
                            const todoDate = new Date(t.due);
                            const itemDate = new Date(item.due);
                            // Compare date and time (ignore milliseconds)
                            return todoDate.getFullYear() === itemDate.getFullYear() &&
                                   todoDate.getMonth() === itemDate.getMonth() &&
                                   todoDate.getDate() === itemDate.getDate() &&
                                   todoDate.getHours() === itemDate.getHours() &&
                                   todoDate.getMinutes() === itemDate.getMinutes();
                          }
                          // If no due dates, match by text only
                          return !t.due && !item.due;
                        });
                        if (todo) {
                          setSelectedTask(todo);
                          setShowTaskModal(true);
                        } else {
                          console.log('Todo not found. Item:', item, 'Available todos:', todos.slice(0, 3));
                        }
                      }}
                      style={{
                        top: `${top}px`,
                        height: `${Math.max(20, Math.min(height, 24))}px`,
                        ...(categoryClass ? {} : { 
                          background: 'white',
                          borderColor: item.color || '#999'
                        })
                      }}
                    >
                      <div className="event-item-text">
                        ✓ {item.text || item.summary}
                      </div>
                    </div>
                  );
                }
                
                // For events, show full details
                const categoryClass = getEventCategoryClass(item);
                return (
                  <div
                    key={index}
                    className={`event-item ${categoryClass}`}
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
                      top: `${top}px`,
                      height: `${height}px`,
                      ...(categoryClass ? {} : {
                        background: item.color,
                        border: `2px solid ${item.color}`,
                        color: getTextColorForBackground(item.color)
                      })
                    }}
                  >
                    <div 
                      className={`event-item-text ${height > 30 ? 'event-item-text-multiline' : 'event-item-text-single'}`}
                    >
                      {item.summary || item.text}
                      {item.sharedCalendarName && (
                        <span className="event-item-shared">
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
        <div className="week-container">
          <div className="week-wrapper">
            {/* Day Headers */}
            <div 
              className="week-day-headers"
              style={expandedDayIndex !== null ? {
                gridTemplateColumns: isMobile 
                  ? `24px ${getWeekDays().map((_, idx) => idx === expandedDayIndex ? '4fr' : '0.5fr').join(' ')}`
                  : `50px ${getWeekDays().map((_, idx) => idx === expandedDayIndex ? '4fr' : '0.5fr').join(' ')}`
              } : undefined}
            >
              <div></div>
              {getWeekDays().map((day, index) => {
                const isToday = isSameDay(day, new Date());
                const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNumber = day.getDate();
                
                return (
                  <div key={index} className="week-day-header">
                    <div className="week-day-name">
                      {dayName}
                    </div>
                    <div className={`week-day-number ${isToday ? 'week-day-number-today' : ''}`}>
                      {dayNumber}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calendar Grid */}
            <div 
              className="week-calendar-grid"
              style={expandedDayIndex !== null ? {
                gridTemplateColumns: isMobile
                  ? `24px ${getWeekDays().map((_, idx) => idx === expandedDayIndex ? '4fr' : '0.5fr').join(' ')}`
                  : `50px ${getWeekDays().map((_, idx) => idx === expandedDayIndex ? '4fr' : '0.5fr').join(' ')}`
              } : undefined}
            >
              {/* Time Labels */}
              <div className="week-time-labels">
                {hours.map(hour => (
                  <div key={hour} className="week-time-label-item">
                    <span className="week-time-label-text">
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

                const isExpanded = expandedDayIndex === dayIndex;
                return (
                  <div
                    key={dayIndex}
                    className={`week-day-column ${isExpanded ? 'week-day-column-expanded' : ''}`}
                    style={{
                      gridColumn: dayIndex + 2
                    }}
                  >
                    {/* Hour Grid Lines */}
                    {hours.map((hour, hourIndex) => (
                      <div
                        key={hour}
                        className="week-hour-line"
                      />
                    ))}

                    {/* Current Time Indicator */}
                    {isSameDay(day, currentTime) && (
                      <div
                        className="week-current-time-indicator"
                        style={{
                          top: `${isMobile ? getCurrentTimeTop() * (40/60) : getCurrentTimeTop() * (50/60)}px`
                        }}
                      >
                        <div className="week-current-time-dot" />
                      </div>
                    )}

                    {/* Events */}
                    {dayEvents.map((item, eventIndex) => {
                      const top = isMobile ? getEventTop(item.startTime) * (40/60) : getEventTop(item.startTime) * (50/60);
                      const height = isMobile ? getEventHeight(item.startTime, item.endTime) * (40/60) : getEventHeight(item.startTime, item.endTime) * (50/60);
                      const isTask = item.type === 'task';
                      const eventText = item.summary || item.text || '';
                      
                      // For tasks, show as full-width item
                      if (isTask && !showTasks) {
                        return null; // Hide task if toggle is off
                      }
                      if (isTask) {
                        const categoryClass = getEventCategoryClass(item);
                        // Helper function to convert hex to rgba
                        const hexToRgba = (hex, alpha) => {
                          if (!hex || !hex.startsWith('#')) return `rgba(128, 128, 128, ${alpha})`;
                          const r = parseInt(hex.slice(1, 3), 16);
                          const g = parseInt(hex.slice(3, 5), 16);
                          const b = parseInt(hex.slice(5, 7), 16);
                          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                        };
                        // Tasks with white background and outlined border
                        return (
                          <div
                            key={eventIndex}
                            className={`week-event-item ${categoryClass || ''} week-task-item ${!categoryClass ? 'task-item-static task-item-border' : ''}`}
                            style={{
                              top: `${top}px`,
                              height: '16px',
                              ...(categoryClass ? {} : { 
                                borderColor: item.color || '#999'
                              })
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Find the todo by matching text and due date since todos don't have ids
                              const todo = todos.find(t => {
                                const todoDue = t.due ? new Date(t.due).toISOString() : null;
                                const itemDue = item.due ? new Date(item.due).toISOString() : null;
                                return t.text === (item.text || item.summary) && 
                                       todoDue === itemDue &&
                                       !t.completed;
                              });
                              if (todo) {
                                setSelectedTask(todo);
                                setShowTaskModal(true);
                              }
                            }}
                          >
                            <div 
                              className="week-event-item-text week-task-item-text-container"
                              title={item.text || item.summary}
                            >
                              <span className="week-task-checkmark">✓</span>
                              <span className="week-task-text">{item.text || item.summary}</span>
                            </div>
                          </div>
                        );
                      }
                      
                      // For events, show full details
                      const categoryClass = getEventCategoryClass(item);
                      return (
                        <div
                          key={eventIndex}
                          className={`week-event-item ${categoryClass}`}
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
                            top: `${top}px`,
                            height: `${height}px`,
                            ...(categoryClass ? {} : {
                              background: item.color,
                              border: `1.5px solid ${item.color}`,
                              color: getTextColorForBackground(item.color)
                            })
                          }}
                        >
                          <div 
                            className={`week-event-item-text ${height > (isMobile ? 25 : 30) ? 'week-event-item-text-multiline' : 'week-event-item-text-single'}`}
                          >
                            {eventText}
                            {item.sharedCalendarName && (
                              <span className="week-event-item-shared">
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
      <div className="fab-container">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="fab-button"
        >
          +
        </button>

        {/* Add Menu Dropdown */}
        {showAddMenu && (
          <>
            <div
              className="add-menu-overlay"
              onClick={() => setShowAddMenu(false)}
            />
            <div className="add-menu-dropdown">
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  setSelectedEvent(null);
                  setShowEventModal(true);
                }}
                className="add-menu-item"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add manually
              </button>
              <div className="add-menu-divider" />
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  navigate('/app/althy');
                }}
                className="add-menu-item"
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
          mode={selectedEvent?.id ? 'view' : 'edit'}
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

      {/* Task Modal */}
      {showTaskModal && (
        <TaskModal
          task={selectedTask}
          mode={selectedTask ? 'view' : 'edit'}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
          onSave={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
            // Reload data to show the newly created task
            loadData();
          }}
        />
      )}

      {/* Notification Modal */}
      {showNotification && (
        <div
          className={`notification-modal ${!isMobile ? 'notification-modal-desktop' : ''}`}
          onClick={() => setShowNotification(false)}
        >
          <div className="notification-icon-container">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <p className="notification-message">
            {notificationMessage}
          </p>
          <button
            onClick={() => setShowNotification(false)}
            className="notification-close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
