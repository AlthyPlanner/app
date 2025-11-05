import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch, API_BASE } from '../api';

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 00:00 - 23:00
const DEFAULT_START_HOUR = 8; // Start at 8am by default
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const isMobile = window.innerWidth < 768;

const CalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [showCatEditor, setShowCatEditor] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [draft, setDraft] = useState({ id: null, summary: '', start: '', end: '', category: 'work' });
  const [weekRef, setWeekRef] = useState(new Date());
  const [googleAuth, setGoogleAuth] = useState({ authorized: false, user: null });

  const weekStart = useMemo(() => startOfWeek(weekRef), [weekRef]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000)), [weekStart]);

  // Check Google authentication status
  useEffect(() => {
    const checkGoogleAuth = async () => {
      try {
        const response = await apiFetch('/api/google/auth/status');
        const data = await response.json();
        setGoogleAuth(data);
      } catch (error) {
        console.error('Failed to check Google auth status:', error);
      }
    };
    checkGoogleAuth();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        // Load local calendar events
        const ev = await apiFetch('/api/calendar/events');
        const evData = await ev.json();
        setEvents(evData.events || []);
        
        // Load categories
        const catRes = await apiFetch('/api/calendar/categories');
        const catData = await catRes.json();
        setCategories(catData.categories || []);
        
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
      } catch (e) {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [googleAuth.authorized]);

  // Update current time every minute
  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date());
    const interval = setInterval(updateTime, 60000); // Update every minute
    updateTime(); // Set initial time
    return () => clearInterval(interval);
  }, []);

  const eventsByDayHour = useMemo(() => {
    const map = {};
    days.forEach((d, di) => {
      HOURS.forEach((h) => {
        map[`${di}-${h}`] = [];
      });
    });
    events.forEach((e) => {
      const s = new Date(e.start);
      const di = days.findIndex((d) => isSameDay(s, d));
      if (di >= 0) {
        const hour = s.getHours();
        if (hour >= HOURS[0] && hour <= HOURS[HOURS.length - 1]) {
          map[`${di}-${hour}`].push(e);
        }
      }
    });
    return map;
  }, [events, days]);

  const goPrevWeek = () => setWeekRef(new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000));
  const goNextWeek = () => setWeekRef(new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000));
  const goThisWeek = () => setWeekRef(new Date());

  // Google authentication functions
  const handleGoogleSignIn = () => {
    // Always use configured API base to avoid CRA catching the route
    window.location.href = `${API_BASE}/api/google/auth/google`;
  };

  const handleGoogleSignOut = async () => {
    try {
      await apiFetch('/api/google/auth/logout', { method: 'POST' });
      setGoogleAuth({ authorized: false, user: null });
      // Reload events without Google events
      const ev = await apiFetch('/api/calendar/events');
      const evData = await ev.json();
      setEvents(evData.events || []);
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };


  const gridStyles = {
    display: 'grid',
    gridTemplateColumns: isMobile ? `60px repeat(7, 1fr)` : `80px repeat(7, 1fr)`,
    borderTop: '1px solid #e5e7eb',
    borderLeft: '1px solid #e5e7eb',
    fontSize: isMobile ? 10 : 12,
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch'
  };

  const catColor = (key) => (categories.find(c => c.key === key)?.color || '#1976d2');

  const getCurrentTimePosition = () => {
    const now = new Date();
    const dayIndex = days.findIndex(d => isSameDay(now, d));
    if (dayIndex === -1) return null; // Not in current week
    
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // Check if current hour is within our display range
    if (hour < HOURS[0] || hour > HOURS[HOURS.length - 1]) return null;
    
    // Calculate position within the current hour cell
    const cellHeight = 48; // Height of each hour cell
    const topPosition = (minute / 60) * cellHeight;
    
    return { dayIndex, topPosition, hour };
  };

  const openCreateAt = (dayIndex, hour) => {
    const base = new Date(days[dayIndex]);
    base.setHours(hour, 0, 0, 0);
    const end = new Date(base.getTime() + 60 * 60 * 1000);
    setDraft({ id: null, summary: '', start: base.toISOString(), end: end.toISOString(), category: categories[0]?.key || 'work' });
    setShowEditor(true);
  };

  const openCreateNow = () => {
    const now = new Date();
    const start = new Date(now);
    start.setMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setDraft({ id: null, summary: '', start: start.toISOString(), end: end.toISOString(), category: categories[0]?.key || 'work' });
    setShowEditor(true);
  };

  const editEvent = (ev) => {
    setDraft({ id: ev.id, summary: ev.summary || '', start: ev.start, end: ev.end, category: ev.category || categories[0]?.key || 'work' });
    setShowEditor(true);
  };

  const saveEvent = async () => {
    const payload = { summary: draft.summary, start: draft.start, end: draft.end, category: draft.category };
    if (draft.id) {
      const res = await apiFetch(`/api/calendar/events/${draft.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const updated = await res.json();
        setEvents((cur) => cur.map(e => e.id === updated.event.id ? updated.event : e));
      }
    } else {
      const res = await apiFetch('/api/calendar/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const created = await res.json();
        setEvents((cur) => [...cur, created.event]);
      }
    }
    setShowEditor(false);
  };

  const deleteEvent = async (id) => {
    const res = await apiFetch(`/api/calendar/events/${id}`, { method: 'DELETE' });
    if (res.ok) setEvents((cur) => cur.filter(e => e.id !== id));
    setShowEditor(false);
  };

  const saveCategories = async (cats) => {
    const res = await apiFetch('/api/calendar/categories', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cats) });
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories);
    }
  };

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: isMobile ? 16 : 20,
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 12 : 16
      }}>
        <div style={{ 
          display: 'flex', 
          gap: isMobile ? 8 : 12, 
          alignItems: 'center',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          justifyContent: 'center',
          width: '100%'
        }}>
          {/* Google Auth Section */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: isMobile ? 6 : 10, 
            order: isMobile ? 2 : 1
          }}>
            {googleAuth.authorized ? (
              <>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: isMobile ? 6 : 8,
                  padding: isMobile ? '6px 10px' : '8px 12px',
                  background: '#e8f5e8',
                  borderRadius: 8,
                  border: '1px solid #34a853'
                }}>
                  <div style={{
                    width: isMobile ? 20 : 24, 
                    height: isMobile ? 20 : 24, 
                    borderRadius: '50%',
                    background: '#34a853',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: isMobile ? 10 : 12,
                    fontWeight: 'bold'
                  }}>
                    {googleAuth.user?.name ? googleAuth.user.name.charAt(0).toUpperCase() : 'G'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ 
                      fontSize: isMobile ? 10 : 12, 
                      color: '#34a853', 
                      fontWeight: '600',
                      lineHeight: 1
                    }}>
                      {isMobile ? 'Google' : 'Google Calendar'}
                    </span>
                    {!isMobile && googleAuth.user?.name && (
                      <span style={{ fontSize: 10, color: '#666', lineHeight: 1 }}>
                        {googleAuth.user.name}
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={handleGoogleSignOut}
                    style={{ 
                      padding: isMobile ? '4px 6px' : '6px 8px', 
                      border: '1px solid #34a853', 
                      background: 'transparent', 
                      borderRadius: 6,
                      fontSize: isMobile ? 10 : 12,
                      color: '#34a853',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      marginLeft: isMobile ? 4 : 8
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#34a853';
                      e.target.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'transparent';
                      e.target.style.color = '#34a853';
                    }}
                  >
                    ✕
                  </button>
                </div>
              </>
            ) : (
              <button 
                onClick={handleGoogleSignIn}
                style={{ 
                  padding: isMobile ? '8px 12px' : '10px 16px', 
                  border: '1px solid #4285f4', 
                  background: '#4285f4', 
                  color: 'white', 
                  borderRadius: 8,
                  fontSize: isMobile ? 12 : 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? 4 : 6,
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <svg width={isMobile ? 12 : 16} height={isMobile ? 12 : 16} viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {isMobile ? 'Google' : 'Sign in with Google'}
              </button>
            )}
          </div>

          {/* Calendar Controls */}
          <div style={{ 
            display: 'flex', 
            gap: isMobile ? 6 : 10,
            order: isMobile ? 1 : 2,
            flexWrap: isMobile ? 'wrap' : 'nowrap'
          }}>
            <button onClick={goPrevWeek} style={{ 
              padding: isMobile ? '8px 12px' : '10px 16px', 
              border: '1px solid #ddd', 
              borderRadius: 8,
              fontSize: isMobile ? 12 : 14,
              background: 'white',
              color: '#374151',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}>{'‹'} {isMobile ? '' : 'Prev'}</button>
            <button onClick={goThisWeek} style={{ 
              padding: isMobile ? '8px 12px' : '10px 16px', 
              border: '1px solid #ddd', 
              borderRadius: 8,
              fontSize: isMobile ? 12 : 14,
              background: 'white',
              color: '#374151',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}>{isMobile ? 'Today' : 'This Week'}</button>
            <button onClick={goNextWeek} style={{ 
              padding: isMobile ? '8px 12px' : '10px 16px', 
              border: '1px solid #ddd', 
              borderRadius: 8,
              fontSize: isMobile ? 12 : 14,
              background: 'white',
              color: '#374151',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}>{isMobile ? '' : 'Next'} {'›'}</button>
            <button onClick={openCreateNow} style={{ 
              padding: isMobile ? '8px 12px' : '10px 16px', 
              border: '1px solid #1976d2', 
              background: '#1976d2', 
              color: 'white', 
              borderRadius: 8, 
              fontSize: isMobile ? 12 : 14,
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}>{isMobile ? '+' : 'Add Event'}</button>
            {!isMobile && (
              <button onClick={() => setShowCatEditor(true)} style={{ 
                padding: '6px 10px', 
                border: '1px solid #ddd', 
                background: 'white', 
                borderRadius: 6,
                fontSize: 12
              }}>Modify Categories</button>
            )}
          </div>
        </div>
      </div>

      {/* Header Row */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? `60px repeat(7, 1fr)` : `80px repeat(7, 1fr)`, 
        marginBottom: 4,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        <div></div>
        {days.map((d, i) => (
          <div key={i} style={{ 
            textAlign: 'center', 
            fontWeight: 600,
            fontSize: isMobile ? 10 : 12,
            padding: isMobile ? '4px 2px' : '8px 4px'
          }}>
            <div style={{ fontSize: isMobile ? 8 : 10, color: '#666' }}>
              {DAY_NAMES[i]}
            </div>
            <div>
              {d.getMonth() + 1}/{d.getDate()}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div style={{ 
          ...gridStyles,
          maxHeight: '70vh',
          overflowY: 'auto',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }} ref={(el) => {
          if (el && !el.scrolled) {
            // Scroll to 8am by default
            const hourHeight = isMobile ? 36 : 48;
            el.scrollTop = DEFAULT_START_HOUR * hourHeight;
            el.scrolled = true;
          }
        }}>
          {HOURS.map((h) => (
            <React.Fragment key={h}>
              {/* Hour label */}
              <div style={{
                borderRight: '1px solid #e5e7eb',
                borderBottom: '1px solid #e5e7eb',
                padding: isMobile ? '4px 3px' : '8px 6px',
                color: '#6b7280',
                background: '#fafafa',
                textAlign: 'right',
                fontSize: isMobile ? 9 : 12
              }}>{`${String(h).padStart(2, '0')}:00`}</div>
              {/* Day cells */}
              {days.map((_, di) => (
                <div key={`${di}-${h}`} style={{ 
                  borderRight: '1px solid #e5e7eb', 
                  borderBottom: '1px solid #e5e7eb', 
                  minHeight: isMobile ? 36 : 48, 
                  position: 'relative', 
                  padding: isMobile ? 2 : 4 
                }} onDoubleClick={() => openCreateAt(di, h)}>
                  {/* Current time indicator */}
                  {(() => {
                    const timePos = getCurrentTimePosition();
                    if (timePos && timePos.dayIndex === di && h === timePos.hour) {
                      return (
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: timePos.topPosition,
                          height: 2,
                          background: '#f44336',
                          zIndex: 10,
                          pointerEvents: 'none'
                        }} />
                      );
                    }
                    return null;
                  })()}
                  {(eventsByDayHour[`${di}-${h}`] || []).map((ev, idx) => {
                    
                    const s = new Date(ev.start);
                    const e = new Date(ev.end);
                    const durationMin = Math.max(30, (e.getTime() - s.getTime()) / 60000);
                    const offsetMin = s.getMinutes();
                    const cellHeight = isMobile ? 36 : 48;
                    const blockHeight = Math.min(100, (durationMin / 60) * cellHeight);
                    const blockTop = (offsetMin / 60) * cellHeight;
                    
                    const isGoogleEvent = ev.source === 'google';
                    const eventStyle = {
                      position: 'absolute',
                      left: isMobile ? 2 : 4,
                      right: isMobile ? 2 : 4,
                      top: blockTop,
                      height: blockHeight,
                      background: isGoogleEvent ? '#e8f5e8' : '#f0f9ff',
                      borderLeft: `3px solid ${isGoogleEvent ? '#34a853' : catColor(ev.category)}`,
                      borderRadius: isMobile ? 4 : 6,
                      padding: isMobile ? '2px 4px' : '4px 6px',
                      overflow: 'hidden',
                      fontSize: isMobile ? 9 : 11,
                      color: '#0f172a',
                      opacity: isGoogleEvent ? 0.8 : 1
                    };
                    
                    return (
                      <div key={idx} onClick={() => !isGoogleEvent && editEvent(ev)} style={eventStyle}>
                        <div style={{ 
                          fontWeight: 600, 
                          whiteSpace: 'nowrap', 
                          textOverflow: 'ellipsis', 
                          overflow: 'hidden',
                          fontSize: isMobile ? 9 : 11
                        }}>
                          {ev.summary || 'Untitled event'}
                          {isGoogleEvent && <span style={{ fontSize: isMobile ? 8 : 10, color: '#34a853', marginLeft: 2 }}>📅</span>}
                        </div>
                        {!isMobile && (
                          <div style={{ color: '#475569', fontSize: isMobile ? 8 : 10 }}>
                            {String(s.getHours()).padStart(2, '0')}:{String(s.getMinutes()).padStart(2, '0')} – {String(e.getHours()).padStart(2, '0')}:{String(e.getMinutes()).padStart(2, '0')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Category legend */}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        {categories.map((c) => (
          <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, background: c.color, borderRadius: 2 }}></div>
            <span style={{ fontSize: 12 }}>{c.label}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto' }}></div>
      </div>

      {/* Event Modal editor */}
      {showEditor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', padding: 16, borderRadius: 8, width: 420 }}>
            <h3 style={{ marginTop: 0 }}>{draft.id ? 'Edit Event' : 'Add Event'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
              <input value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} placeholder="Title" style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6 }} />
              <label style={{ fontSize: 12 }}>Start</label>
              <input type="datetime-local" value={draft.start ? new Date(draft.start).toISOString().slice(0,16) : ''} onChange={(e) => setDraft({ ...draft, start: new Date(e.target.value).toISOString() })} style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6 }} />
              <label style={{ fontSize: 12 }}>End</label>
              <input type="datetime-local" value={draft.end ? new Date(draft.end).toISOString().slice(0,16) : ''} onChange={(e) => setDraft({ ...draft, end: new Date(e.target.value).toISOString() })} style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6 }} />
              <label style={{ fontSize: 12 }}>Category</label>
              <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6 }}>
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowEditor(false)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6 }}>Cancel</button>
                <button onClick={saveEvent} style={{ padding: '6px 10px', border: '1px solid #1976d2', background: '#1976d2', color: 'white', borderRadius: 6 }}>Save</button>
              </div>
              {draft.id && (
                <button onClick={() => deleteEvent(draft.id)} style={{ padding: '6px 10px', border: '1px solid #f44336', background: '#f44336', color: 'white', borderRadius: 6 }}>Delete</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Categories Modal */}
      {showCatEditor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', padding: 16, borderRadius: 8, width: 420 }}>
            <h3 style={{ marginTop: 0 }}>Modify Categories</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8, marginTop: 8 }}>
              {categories.map((c, idx) => (
                <React.Fragment key={c.key}>
                  <input value={c.label} onChange={(e) => setCategories((cur) => cur.map((x, i) => i === idx ? { ...x, label: e.target.value } : x))} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }} />
                  <input type="color" value={c.color} onChange={(e) => setCategories((cur) => cur.map((x, i) => i === idx ? { ...x, color: e.target.value } : x))} />
                </React.Fragment>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <button onClick={() => setCategories((cur) => [...cur, { key: Math.random().toString(36).slice(2,6), label: 'New', color: '#607d8b' }])} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6 }}>Add Category</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowCatEditor(false)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6 }}>Close</button>
                <button onClick={() => { saveCategories(categories); setShowCatEditor(false); }} style={{ padding: '6px 10px', border: '1px solid #1976d2', background: '#1976d2', color: 'white', borderRadius: 6 }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;


