import React, { useState } from 'react';

const OpenAIChat = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResponse('');
    try {
      const res = await fetch('/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (res.ok) {
        setResponse(data.response);
      } else {
        setError(data.error || 'Error from API');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>AI Assistant</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={4}
          style={{ width: '100%', padding: 8 }}
          placeholder="Enter your prompt here..."
          required
        />
        <button type="submit" disabled={loading} style={{ marginTop: 8, padding: '8px 16px' }}>
          {loading ? 'Submitting...' : 'Submit'}
        </button>
      </form>
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      {response && (
        <div style={{ background: '#f4f4f4', padding: 16, borderRadius: 4 }}>
          <strong>OpenAI Response:</strong>
          <div>{response}</div>
        </div>
      )}
    </div>
  );
};

export default OpenAIChat; 