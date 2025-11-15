import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';

const AlthyPage = () => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const messagesEndRef = React.useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const suggestedActions = [
    'Plan my week for me',
    'Help me set a new goal',
    'Give me suggestions for tomorrow',
    'Cancel everything for today'
  ];

  const sendMessage = async (messageText) => {
    if (!messageText.trim()) return;
    
    // Add user message to chat
    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setLoading(true);
    setError('');
    
    try {
      const res = await apiFetch('/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: messageText }),
      });
      const data = await res.json();
      if (res.ok) {
        // Add AI response to chat
        const aiMessage = { role: 'assistant', content: data.response };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        setError(data.error || 'Error from API');
        const errorMessage = { role: 'assistant', content: `Error: ${data.error || 'Something went wrong'}` };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (err) {
      const errorMsg = 'Network error. Make sure the server is running on port 5001.';
      setError(errorMsg);
      const errorMessage = { role: 'assistant', content: errorMsg };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
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

  return (
    <div style={{ 
      minHeight: 'calc(100vh - 100px)',
      background: 'white',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: bottomOffset,
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        alignItems: 'center', 
        padding: isMobile ? '16px' : '20px',
        position: 'sticky',
        top: 0,
        background: 'white',
        zIndex: 10
      }}>
        <button 
          onClick={() => navigate('/app/plan')}
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
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </button>
      </div>

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
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
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

