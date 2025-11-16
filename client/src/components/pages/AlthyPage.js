import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api';
import { 
  getChatHistory, 
  saveConversation, 
  getChatSettings, 
  saveChatSettings,
  deleteChatHistory,
  cleanupOldMessages
} from '../../utils/chatHistory';
import { 
  calculateDailyStatus, 
  getWorkflowMessage 
} from '../../utils/balanceTracker';
import './AlthyPage.css';

const AlthyPage = () => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [showSettings, setShowSettings] = useState(false);
  const [chatSettings, setChatSettings] = useState(getChatSettings());
  const [dailyStatus, setDailyStatus] = useState(null);
  const [workflowMessage, setWorkflowMessage] = useState(null);
  const [events, setEvents] = useState([]);
  const [todos, setTodos] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyMessages, setHistoryMessages] = useState([]);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const messagesEndRef = React.useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load chat history and data on mount
  useEffect(() => {
    // Check if chat was closed - if so, don't auto-load history
    const chatWasClosed = localStorage.getItem('althy_chat_closed');
    if (chatWasClosed === 'true') {
      // Chat was closed, start with empty messages (main screen)
      setMessages([]);
    } else {
      // Load chat history only if chat wasn't closed
      const history = getChatHistory();
      if (history.length > 0 && messages.length === 0) {
        setMessages(history);
      }
    }
    
    // Clean up old messages
    cleanupOldMessages();
    
    // Load events and todos for balance tracking
    loadData();
  }, []);

  // Load history when showing history panel
  useEffect(() => {
    if (showHistory) {
      const history = getChatHistory();
      setHistoryMessages(history);
    }
  }, [showHistory]);

  // Calculate daily status when events/todos change
  useEffect(() => {
    if (events.length > 0 || todos.length > 0) {
      const today = new Date();
      const status = calculateDailyStatus(events, todos, today);
      setDailyStatus(status);
      
      const workflow = getWorkflowMessage(events, todos);
      setWorkflowMessage(workflow);
    }
  }, [events, todos]);

  // Load calendar events and todos
  const loadData = async () => {
    try {
      const evRes = await apiFetch('/api/calendar/events');
      const evData = await evRes.json();
      setEvents(evData.events || []);
      
      const todosRes = await apiFetch('/api/todos');
      const todosData = await todosRes.json();
      setTodos(todosData.todos || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Close settings and history when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSettings && !event.target.closest('[data-settings-panel]') && !event.target.closest('[data-settings-button]')) {
        setShowSettings(false);
      }
      if (showHistory && !event.target.closest('[data-history-panel]') && !event.target.closest('[data-history-button]')) {
        setShowHistory(false);
      }
    };
    
    if (showSettings || showHistory) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSettings, showHistory]);

  // Save messages to history whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      saveConversation(messages);
    }
  }, [messages]);

  const suggestedActions = [
    'Plan my week for me',
    'Help me set a new goal',
    'Give me suggestions for tomorrow',
    'Cancel everything for today'
  ];

  const sendMessage = async (messageText) => {
    if (!messageText.trim()) return;
    
    // Clear the chat closed flag when starting a new message
    localStorage.removeItem('althy_chat_closed');
    
    // Add user message to chat
    const userMessage = { 
      role: 'user', 
      content: messageText,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setLoading(true);
    setError('');
    
    try {
      // Prepare chat history (exclude the current message we just added)
      const chatHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Prepare user context
      const userContext = {
        todos: todos.map(todo => ({
          text: todo.text,
          completed: todo.completed,
          due: todo.due,
          priority: todo.priority,
          category: todo.category
        })),
        events: events.slice(0, 10).map(event => ({ // Limit to recent 10 events
          summary: event.summary || event.text,
          start: event.start,
          end: event.end,
          category: event.category
        }))
      };

      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: messageText,
          history: chatHistory,
          context: userContext
        }),
      });

      // Check if response is empty or failed
      if (!res || !res.ok) {
        let errorMsg = 'Unable to connect to the server.';
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || `Server error (${res.status})`;
        } catch (e) {
          if (res.status === 0 || !res.status) {
            errorMsg = 'Network error. Make sure the server is running on port 5001.';
      } else {
            errorMsg = `Server error (${res.status}). Please try again.`;
          }
        }
        
        setError(errorMsg);
        const errorMessage = { 
          role: 'assistant', 
          content: `Error: ${errorMsg}`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      // Parse response
      let data;
      try {
        const text = await res.text();
        if (!text || text.trim() === '') {
          throw new Error('Empty response from server');
        }
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('Error parsing response:', parseErr);
        const errorMsg = 'Received invalid response from server. Please try again.';
        setError(errorMsg);
        const errorMessage = { 
          role: 'assistant', 
          content: `Error: ${errorMsg}`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      // Check if backend attempted to create a task or event
      if (data.action) {
        // Add action message (success or clarification)
        const actionMessage = {
          role: 'assistant',
          content: data.action.message,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, actionMessage]);
        
        // Reload data if task/event was successfully created
        if (data.action.success) {
          await loadData();
        }
      }
      
      // Add AI response to chat
      const aiMessage = { 
        role: 'assistant', 
        content: data.response || 'I apologize, but I couldn\'t generate a response. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      let errorMsg = 'Network error. Make sure the server is running on port 5001.';
      if (err.message) {
        errorMsg = err.message.includes('Failed to fetch') || err.message.includes('ERR_EMPTY_RESPONSE')
          ? 'Unable to connect to the server. Please make sure the server is running on port 5001.'
          : err.message;
      }
      setError(errorMsg);
      const errorMessage = { 
        role: 'assistant', 
        content: `Error: ${errorMsg}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Handle chat settings
  const handleSettingsChange = (key, value) => {
    const newSettings = { ...chatSettings, [key]: value };
    setChatSettings(newSettings);
    saveChatSettings(newSettings);
  };

  const handleDeleteHistory = () => {
    if (window.confirm('Are you sure you want to delete all chat history? This cannot be undone.')) {
      deleteChatHistory();
      setMessages([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await sendMessage(prompt);
  };

  const handleSuggestionClick = async (suggestion) => {
    await sendMessage(suggestion);
  };

  const iconSize = isMobile ? '60px' : isTablet ? '70px' : '80px';
  const iconInnerSize = isMobile ? '30' : isTablet ? '35' : '40';
  const headerPadding = isMobile ? '12px 16px' : '16px 20px';
  const contentPadding = isMobile ? '24px 16px' : isTablet ? '32px 24px' : '40px 20px';
  const headingSize = isMobile ? '22px' : isTablet ? '26px' : '28px';
  const subtextSize = isMobile ? '13px' : '14px';
  const buttonPadding = isMobile ? '12px 16px' : '14px 20px';
  const buttonFontSize = isMobile ? '14px' : '15px';
  const inputPadding = isMobile ? '10px 14px' : '12px 16px';
  const inputFontSize = isMobile ? '16px' : '15px';
  const inputBottomPadding = isMobile ? '12px 16px' : '12px 20px';
  const inputGap = isMobile ? '8px' : '12px';
  const bottomOffset = isMobile ? '80px' : '80px';

  // Calculate header heights
  const logoHeaderHeight = isMobile ? 80 : 72; // Logo header height from AppLayout
  const buttonHeaderHeight = isMobile ? 68 : 76; // Button header height (padding + button)
  const totalHeaderHeight = logoHeaderHeight + buttonHeaderHeight;

  return (
    <div style={{ 
      minHeight: 'calc(100vh - 100px)',
      background: 'white',
      display: 'flex',
      flexDirection: 'column',
      paddingTop: `${totalHeaderHeight}px`, // Space for both fixed headers (logo + buttons)
      paddingBottom: bottomOffset,
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden',
      marginTop: `-${logoHeaderHeight}px` // Offset AppLayout's paddingTop since we're handling both headers
    }}>
      {/* Header - Fixed (Button Header) */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        alignItems: 'center', 
        padding: isMobile ? '16px' : '20px',
        position: 'fixed',
        top: `${logoHeaderHeight}px`, // Position below logo header
        left: 0,
        right: 0,
        background: 'white',
        zIndex: 100,
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Chat History Button (Clock Icon) */}
          <button 
            data-history-button
            onClick={() => setShowHistory(!showHistory)}
            title="Chat History"
            style={{ 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer', 
              color: showHistory ? '#3b82f6' : '#6b7280',
              padding: isMobile ? '8px' : '10px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              minWidth: '36px',
              minHeight: '36px'
            }}
            onMouseOver={(e) => {
              if (!showHistory) {
                e.target.style.background = '#f3f4f6';
                e.target.style.color = '#374151';
              }
            }}
            onMouseOut={(e) => {
              if (!showHistory) {
                e.target.style.background = 'transparent';
                e.target.style.color = '#6b7280';
              }
            }}
          >
            <svg width={isMobile ? "20" : "22"} height={isMobile ? "20" : "22"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </button>
          
          {/* Close Chat Button - Only show when there are messages */}
          {messages.length > 0 && (
            <button 
              onClick={() => setShowCloseConfirm(true)}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                color: '#6b7280',
                padding: isMobile ? '8px' : '10px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                minWidth: '36px',
                minHeight: '36px'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#f3f4f6';
                e.target.style.color = '#374151';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#6b7280';
              }}
              title="Close Chat"
            >
              <svg width={isMobile ? "20" : "22"} height={isMobile ? "20" : "22"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
          
          {/* Settings Button */}
        <button 
            data-settings-button
            onClick={() => setShowSettings(!showSettings)}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            cursor: 'pointer', 
            color: '#6b7280',
            padding: isMobile ? '8px' : '10px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            minWidth: '36px',
            minHeight: '36px'
          }}
          onMouseOver={(e) => {
            e.target.style.background = '#f3f4f6';
            e.target.style.color = '#374151';
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.color = '#6b7280';
          }}
        >
          <svg width={isMobile ? "20" : "22"} height={isMobile ? "20" : "22"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .66.39 1.26 1 1.51.21.09.44.13.67.13H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
          </svg>
        </button>
        </div>
      </div>

      {/* Chat History Panel */}
      {showHistory && (
        <div 
          data-history-panel
          style={{
            position: 'fixed',
            bottom: isMobile ? '160px' : '180px',
            left: isMobile ? '16px' : '50%',
            right: isMobile ? '16px' : 'auto',
            transform: isMobile ? 'none' : 'translateX(-50%)',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '20px',
            zIndex: 1000,
            width: isMobile ? 'auto' : '500px',
            maxWidth: '90vw',
            maxHeight: '60vh',
            border: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
              Chat History
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            paddingRight: '8px'
          }}>
            {historyMessages.length === 0 ? (
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#6b7280',
                textAlign: 'center',
                padding: '20px'
              }}>
                No chat history yet
              </p>
            ) : (
              historyMessages.map((message, index) => {
                const date = new Date(message.timestamp);
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                
                return (
                  <div
                    key={index}
                    onClick={() => {
                      // Load full conversation history when clicking on a history item
                      const fullHistory = getChatHistory();
                      setMessages(fullHistory);
                      setShowHistory(false);
                      // Clear the chat closed flag since user is resuming a chat
                      localStorage.removeItem('althy_chat_closed');
                    }}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: message.role === 'user' ? '#eff6ff' : '#f9fafb',
                      border: `1px solid ${message.role === 'user' ? '#bfdbfe' : '#e5e7eb'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = message.role === 'user' ? '#dbeafe' : '#f3f4f6';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = message.role === 'user' ? '#eff6ff' : '#f9fafb';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      marginBottom: '4px'
                    }}>
                      {dateStr} at {timeStr}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#1f2937',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {message.role === 'user' ? 'You: ' : 'Althy: '}
                      {message.content.substring(0, 100)}{message.content.length > 100 ? '...' : ''}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div 
          data-settings-panel
          style={{
            position: 'fixed',
            top: '80px',
            right: isMobile ? '16px' : '20px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '20px',
            zIndex: 1000,
            minWidth: isMobile ? '280px' : '320px',
            border: '1px solid #e5e7eb'
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
              Chat Settings
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#f3f4f6';
                e.target.style.color = '#374151';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#6b7280';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          {/* Auto-delete toggle */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            cursor: 'pointer'
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                Auto-delete after 7 days
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Automatically delete messages older than 7 days
              </div>
            </div>
            <input
              type="checkbox"
              checked={chatSettings.autoDelete}
              onChange={(e) => handleSettingsChange('autoDelete', e.target.checked)}
              style={{
                width: '20px',
                height: '20px',
                cursor: 'pointer',
                accentColor: '#3b82f6'
              }}
            />
          </label>
          
          {/* Private mode toggle */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            cursor: 'pointer'
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                Private Session Mode
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Don't save messages (cleared on exit)
              </div>
            </div>
            <input
              type="checkbox"
              checked={chatSettings.privateMode}
              onChange={(e) => handleSettingsChange('privateMode', e.target.checked)}
              style={{
                width: '20px',
                height: '20px',
                cursor: 'pointer',
                accentColor: '#3b82f6'
              }}
            />
          </label>
          
          {/* Delete history button */}
          <button
            onClick={handleDeleteHistory}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#fecaca';
            }}
            onMouseOut={(e) => {
              e.target.style.background = '#fee2e2';
            }}
          >
            Delete All Chat History
          </button>
          
          {/* Privacy note */}
          <p style={{
            margin: '16px 0 0 0',
            fontSize: '12px',
            color: '#6b7280',
            lineHeight: '1.5'
          }}>
            Your conversations are private to you. You can delete history or disable saving anytime.
          </p>
        </div>
      )}

      {/* Workflow Message Banner */}
      {workflowMessage && messages.length === 0 && (
        <div style={{
          margin: '16px',
          marginTop: '0', // Remove top margin since we have paddingTop on container
          padding: '16px',
          background: '#eff6ff',
          borderRadius: '12px',
          border: '1px solid #bfdbfe',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#1e40af',
            fontWeight: '500'
          }}>
            {workflowMessage.message}
          </p>
          {workflowMessage.showButton && (
            <button
              onClick={() => sendMessage('Plan my day for me')}
              style={{
                padding: '10px 16px',
                background: '#3b82f6',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                alignSelf: 'flex-start',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#2563eb';
              }}
              onMouseOut={(e) => {
                e.target.style.background = '#3b82f6';
              }}
            >
              {workflowMessage.action}
            </button>
          )}
        </div>
      )}

      {/* Close Chat Confirmation Modal */}
      {showCloseConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '16px'
          }}
          onClick={() => setShowCloseConfirm(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Close Chat?
            </h3>
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '14px',
              color: '#6b7280',
              lineHeight: '1.5'
            }}>
              Your messages are saved in history. You can access them anytime using the clock icon.
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowCloseConfirm(false)}
                style={{
                  padding: '10px 20px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
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
                Cancel
              </button>
              <button
                onClick={() => {
                  setMessages([]);
                  // Mark chat as closed so it won't auto-load when returning to page
                  localStorage.setItem('althy_chat_closed', 'true');
                  setShowCloseConfirm(false);
                }}
                style={{
                  padding: '10px 20px',
                  background: '#3b82f6',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#2563eb';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = '#3b82f6';
                }}
              >
                Close Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: isMobile ? '16px' : '24px',
        maxWidth: isMobile ? '100%' : isTablet ? '700px' : '600px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        overflowY: 'auto',
        paddingBottom: '100px'
      }}>
        {/* Welcome Screen - Only show when no messages */}
        {messages.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            paddingTop: isMobile ? '20px' : '40px'
          }}>
            {/* AI Assistant Icon */}
            <div style={{
              width: iconSize,
              height: iconSize,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #a8e6cf 0%, #ffd3b6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: isMobile ? '20px' : '24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              flexShrink: 0
            }}>
              <svg width={iconInnerSize} height={iconInnerSize} viewBox="0 0 24 24" fill="none" stroke="#2c3e50" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>

            {/* Main Prompt */}
            <h2 style={{ 
              margin: '0 0 8px 0', 
              color: '#1f2937', 
              fontSize: headingSize, 
              fontWeight: '700',
              textAlign: 'center',
              lineHeight: '1.2',
              padding: isMobile ? '0 8px' : '0'
            }}>
              What can I help you with?
            </h2>

            {/* Suggested Actions Label */}
            <p style={{ 
              margin: isMobile ? '20px 0 12px 0' : '24px 0 16px 0', 
              color: '#6b7280', 
              fontSize: subtextSize,
              textAlign: 'center',
              padding: isMobile ? '0 8px' : '0'
            }}>
              Here are a few things you can ask me:
            </p>

            {/* Suggested Action Buttons */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: isMobile ? '10px' : '12px',
              width: '100%',
              marginBottom: isMobile ? '24px' : '40px'
            }}>
              {suggestedActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(action)}
                  style={{
                    padding: buttonPadding,
                    background: '#f9fafb',
                    border: 'none',
                    borderRadius: isMobile ? '10px' : '12px',
                    color: '#1f2937',
                    fontSize: buttonFontSize,
                    fontWeight: '500',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    width: '100%',
                    minHeight: isMobile ? '44px' : 'auto'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = '#f3f4f6';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = '#f9fafb';
                  }}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {messages.length > 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            width: '100%'
          }}>
            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  width: '100%'
                }}
              >
                <div style={{
                  maxWidth: '85%',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  background: message.role === 'user' ? '#3b82f6' : '#f3f4f6',
                  color: message.role === 'user' ? 'white' : '#1f2937',
                  fontSize: isMobile ? '14px' : '15px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  boxShadow: message.role === 'user' ? '0 2px 4px rgba(59, 130, 246, 0.2)' : '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                  {message.content}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-start',
                width: '100%'
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '16px',
                  background: '#f3f4f6',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#9ca3af',
                    animation: 'pulse 1.4s ease-in-out infinite'
                  }} />
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#9ca3af',
                    animation: 'pulse 1.4s ease-in-out infinite',
                    animationDelay: '0.2s'
                  }} />
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#9ca3af',
                    animation: 'pulse 1.4s ease-in-out infinite',
                    animationDelay: '0.4s'
                  }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Field */}
      <div style={{ 
        position: 'fixed',
        bottom: bottomOffset,
        left: 0,
        right: 0,
        padding: inputBottomPadding,
        background: 'white',
        zIndex: 1001
      }}>
        <form onSubmit={handleSubmit} style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: inputGap,
          maxWidth: isMobile ? '100%' : '600px',
          margin: '0 auto'
        }}>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask anything"
            disabled={loading}
            style={{
              flex: 1,
              padding: inputPadding,
              border: '1px solid #e5e7eb',
              borderRadius: '24px',
              fontSize: inputFontSize,
              outline: 'none',
              background: '#f9fafb',
              minWidth: 0,
              width: '100%'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
              e.target.style.background = 'white';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.background = '#f9fafb';
            }}
          />
          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: isMobile ? '6px' : '8px',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              minWidth: isMobile ? '36px' : '40px',
              minHeight: isMobile ? '36px' : '40px'
            }}
          >
            <svg width={isMobile ? "18" : "20"} height={isMobile ? "18" : "20"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>
          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: isMobile ? '6px' : '8px',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              minWidth: isMobile ? '36px' : '40px',
              minHeight: isMobile ? '36px' : '40px'
            }}
          >
            <svg width={isMobile ? "18" : "20"} height={isMobile ? "18" : "20"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          {loading && (
            <div style={{ 
              padding: isMobile ? '6px' : '8px', 
              color: '#6b7280',
              flexShrink: 0
            }}>
              <svg width={isMobile ? "18" : "20"} height={isMobile ? "18" : "20"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
              </svg>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AlthyPage;

