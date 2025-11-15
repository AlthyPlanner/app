// Chat History Management Utilities

const CHAT_HISTORY_KEY = 'althy_chat_history';
const CHAT_SETTINGS_KEY = 'althy_chat_settings';
const AUTO_DELETE_DAYS = 7;

// Default settings
const defaultSettings = {
  autoDelete: false,
  privateMode: false
};

// Get chat history from localStorage
export const getChatHistory = () => {
  try {
    const history = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!history) return [];
    
    const messages = JSON.parse(history);
    
    // Filter out messages older than auto-delete threshold if enabled
    const settings = getChatSettings();
    if (settings.autoDelete) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - AUTO_DELETE_DAYS);
      
      return messages.filter(msg => {
        const msgDate = new Date(msg.timestamp);
        return msgDate >= cutoffDate;
      });
    }
    
    return messages;
  } catch (error) {
    console.error('Error loading chat history:', error);
    return [];
  }
};

// Save message to chat history
export const saveMessage = (message, role) => {
  const settings = getChatSettings();
  
  // Don't save if private mode is enabled
  if (settings.privateMode) {
    return;
  }
  
  try {
    const history = getChatHistory();
    const newMessage = {
      role,
      content: message,
      timestamp: new Date().toISOString()
    };
    
    history.push(newMessage);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving message:', error);
  }
};

// Save entire conversation
export const saveConversation = (messages) => {
  const settings = getChatSettings();
  
  // Don't save if private mode is enabled
  if (settings.privateMode) {
    return;
  }
  
  try {
    const history = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp || new Date().toISOString()
    }));
    
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving conversation:', error);
  }
};

// Delete all chat history
export const deleteChatHistory = () => {
  try {
    localStorage.removeItem(CHAT_HISTORY_KEY);
    return true;
  } catch (error) {
    console.error('Error deleting chat history:', error);
    return false;
  }
};

// Get chat settings
export const getChatSettings = () => {
  try {
    const settings = localStorage.getItem(CHAT_SETTINGS_KEY);
    if (!settings) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(settings) };
  } catch (error) {
    console.error('Error loading chat settings:', error);
    return defaultSettings;
  }
};

// Save chat settings
export const saveChatSettings = (settings) => {
  try {
    localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(settings));
    
    // If auto-delete is enabled, clean up old messages
    if (settings.autoDelete) {
      const history = getChatHistory();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - AUTO_DELETE_DAYS);
      
      const filteredHistory = history.filter(msg => {
        const msgDate = new Date(msg.timestamp);
        return msgDate >= cutoffDate;
      });
      
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(filteredHistory));
    }
    
    return true;
  } catch (error) {
    console.error('Error saving chat settings:', error);
    return false;
  }
};

// Clean up old messages (called periodically)
export const cleanupOldMessages = () => {
  const settings = getChatSettings();
  if (!settings.autoDelete) return;
  
  try {
    const history = getChatHistory();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - AUTO_DELETE_DAYS);
    
    const filteredHistory = history.filter(msg => {
      const msgDate = new Date(msg.timestamp);
      return msgDate >= cutoffDate;
    });
    
    if (filteredHistory.length !== history.length) {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(filteredHistory));
    }
  } catch (error) {
    console.error('Error cleaning up messages:', error);
  }
};

