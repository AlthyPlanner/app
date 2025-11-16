// Task and Note History Management Utilities

const TASK_HISTORY_KEY = 'althy_task_history';
const MAX_HISTORY_ITEMS = 1000; // Limit history size

// Task history entry structure:
// {
//   id: string,
//   type: 'task' | 'note',
//   action: 'created' | 'completed' | 'deleted' | 'updated' | 'saved',
//   content: string,
//   date: string (YYYY-MM-DD),
//   timestamp: string (ISO),
//   metadata: object (for tasks: priority, category, etc.)
// }

// Save a task history entry
export const saveTaskHistoryEntry = (entry) => {
  try {
    const history = getTaskHistory();
    
    // Add new entry
    const newEntry = {
      id: entry.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: entry.type || 'task',
      action: entry.action || 'created',
      content: entry.content || '',
      date: entry.date || new Date().toISOString().split('T')[0],
      timestamp: entry.timestamp || new Date().toISOString(),
      metadata: entry.metadata || {}
    };
    
    history.unshift(newEntry); // Add to beginning
    
    // Limit history size
    if (history.length > MAX_HISTORY_ITEMS) {
      history.splice(MAX_HISTORY_ITEMS);
    }
    
    localStorage.setItem(TASK_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving task history:', error);
  }
};

// Get all task history
export const getTaskHistory = () => {
  try {
    const history = localStorage.getItem(TASK_HISTORY_KEY);
    if (!history) return [];
    return JSON.parse(history);
  } catch (error) {
    console.error('Error loading task history:', error);
    return [];
  }
};

// Get all notes from localStorage
export const getAllNotes = () => {
  const notes = [];
  try {
    // Get all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      // Check if it's a notes key
      if (key && (key.startsWith('quickNotes-') || key.startsWith('quickNotes-week-'))) {
        const value = localStorage.getItem(key);
        if (value && value.trim()) {
          // Extract date from key
          let date = '';
          let type = 'day';
          
          if (key.startsWith('quickNotes-week-')) {
            date = key.replace('quickNotes-week-', '');
            type = 'week';
          } else {
            date = key.replace('quickNotes-', '');
            type = 'day';
          }
          
          notes.push({
            id: key,
            type: 'note',
            action: 'saved',
            content: value,
            date: date,
            timestamp: new Date().toISOString(), // We don't have exact timestamp, use current
            metadata: { noteType: type }
          });
        }
      }
    }
  } catch (error) {
    console.error('Error loading notes:', error);
  }
  
  return notes;
};

// Get combined task and note history, organized by date
export const getCombinedHistory = () => {
  const taskHistory = getTaskHistory();
  const notes = getAllNotes();
  
  // Combine and sort by date (newest first)
  const combined = [...taskHistory, ...notes].sort((a, b) => {
    const dateA = new Date(a.timestamp || a.date);
    const dateB = new Date(b.timestamp || b.date);
    return dateB - dateA;
  });
  
  // Group by date
  const grouped = {};
  combined.forEach(item => {
    const date = item.date || new Date(item.timestamp).toISOString().split('T')[0];
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(item);
  });
  
  // Convert to array and sort dates (newest first)
  return Object.keys(grouped)
    .sort((a, b) => new Date(b) - new Date(a))
    .map(date => ({
      date,
      items: grouped[date].sort((a, b) => {
        const timeA = new Date(a.timestamp || a.date);
        const timeB = new Date(b.timestamp || b.date);
        return timeB - timeA;
      })
    }));
};

// Format date for display
export const formatHistoryDate = (dateString) => {
  const date = new Date(dateString + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Reset time for comparison
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  if (date.getTime() === today.getTime()) {
    return 'Today';
  } else if (date.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }
};

// Format timestamp for display
export const formatHistoryTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

// Delete all task history
export const deleteTaskHistory = () => {
  try {
    localStorage.removeItem(TASK_HISTORY_KEY);
  } catch (error) {
    console.error('Error deleting task history:', error);
  }
};

