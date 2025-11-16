const natural = require('natural');
const fs = require('fs').promises;
const path = require('path');

// Category keywords for training/classification
const categoryKeywords = {
  work: ['meeting', 'conference', 'call', 'work', 'office', 'business', 'client', 'project', 'deadline', 'presentation', 'interview', 'team', 'workplace', 'workplace', 'manager', 'boss', 'colleague', 'corporate', 'company', 'job', 'career', 'professional', 'office hours', 'workday'],
  study: ['study', 'class', 'lecture', 'homework', 'exam', 'test', 'quiz', 'assignment', 'course', 'learning', 'school', 'university', 'college', 'reading', 'research', 'thesis', 'dissertation', 'seminar', 'workshop', 'tutorial', 'education', 'academic', 'student', 'professor', 'teacher'],
  personal: ['family', 'personal', 'birthday', 'anniversary', 'wedding', 'shopping', 'errand', 'chore', 'home', 'house', 'personal time', 'family time', 'parent', 'child', 'spouse', 'relative', 'household', 'domestic'],
  leisure: ['movie', 'film', 'game', 'gaming', 'party', 'dinner', 'lunch', 'brunch', 'coffee', 'drinks', 'social', 'hangout', 'fun', 'entertainment', 'concert', 'show', 'event', 'festival', 'music', 'theater', 'comedy', 'nightlife', 'bar', 'club', 'friends', 'socializing'],
  fitness: ['gym', 'workout', 'exercise', 'running', 'jogging', 'fitness', 'training', 'yoga', 'pilates', 'cycling', 'swimming', 'sports', 'basketball', 'football', 'soccer', 'tennis', 'hiking', 'walking', 'marathon', 'race', 'athletic', 'physical', 'cardio', 'strength', 'weightlifting', 'crossfit'],
  health: ['doctor', 'appointment', 'dentist', 'therapy', 'medical', 'checkup', 'hospital', 'clinic', 'health', 'wellness', 'medication', 'prescription', 'physician', 'surgeon', 'nurse', 'treatment', 'diagnosis', 'surgery', 'therapy session', 'counseling', 'mental health'],
  travel: ['travel', 'trip', 'vacation', 'flight', 'airport', 'hotel', 'journey', 'destination', 'tour', 'visit', 'road trip', 'cruise', 'airline', 'booking', 'reservation', 'itinerary', 'sightseeing', 'explore', 'adventure', 'holiday', 'getaway', 'excursion'],
  rest: ['rest', 'sleep', 'nap', 'relax', 'meditation', 'break', 'time off', 'vacation', 'holiday', 'weekend', 'off day', 'recovery', 'unwind', 'chill', 'leisure time', 'downtime', 'peace', 'calm', 'mindfulness']
};

let classifier = null;
let isTrained = false;

/**
 * Train the logistic regression classifier
 */
function trainClassifier() {
  if (isTrained && classifier) {
    return classifier;
  }

  // Create a new classifier
  classifier = new natural.LogisticRegressionClassifier();

  // Train on category keywords
  Object.entries(categoryKeywords).forEach(([category, keywords]) => {
    keywords.forEach(keyword => {
      classifier.addDocument(keyword, category);
    });
  });

  // Train the classifier
  classifier.train();

  isTrained = true;
  return classifier;
}

/**
 * Extract features from event text using TF-IDF
 */
function extractFeatures(text) {
  if (!text) return [];
  
  // Tokenize and normalize
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(text.toLowerCase());
  
  if (!tokens || tokens.length === 0) return [];
  
  // Remove stopwords and short words
  const stopwords = natural.stopwords;
  const filtered = tokens.filter(token => 
    token.length > 2 && 
    !stopwords.includes(token) &&
    !/^\d+$/.test(token) // Remove pure numbers
  );
  
  return filtered;
}

/**
 * Categorize an event using logistic regression
 * @param {string} summary - Event title/summary
 * @param {string} description - Event description (optional)
 * @param {string} location - Event location (optional)
 * @returns {Promise<string>} - Category key (work, study, personal, leisure, fitness, health, travel, rest)
 */
async function categorizeEvent(summary = '', description = '', location = '') {
  try {
    // Combine all text
    const eventText = [summary, description, location]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .trim();

    if (!eventText) {
      return 'personal'; // Default category
    }

    // Train classifier if not already trained
    const trainedClassifier = trainClassifier();

    // Extract features
    const features = extractFeatures(eventText);
    
    if (features.length === 0) {
      return 'personal'; // Default if no features
    }

    // Get classification
    const classifications = trainedClassifier.getClassifications(eventText);
    
    if (classifications && classifications.length > 0) {
      // Get the top classification
      const topClassification = classifications[0];
      
      // Only use if confidence is reasonable (above 0.1)
      if (topClassification.value > 0.1) {
        return topClassification.label;
      }
    }

    // Fallback to keyword matching if classifier confidence is low
    return categorizeByKeywords(summary, description, location);
  } catch (error) {
    console.error('Logistic regression categorization failed:', error);
    // Fallback to keyword-based categorization
    return categorizeByKeywords(summary, description, location);
  }
}

/**
 * Fallback keyword-based categorization
 * @param {string} summary - Event title/summary
 * @param {string} description - Event description
 * @param {string} location - Event location
 * @returns {string} - Category key
 */
function categorizeByKeywords(summary = '', description = '', location = '') {
  const text = `${summary} ${description} ${location}`.toLowerCase();

  // Calculate scores for each category
  const scores = {};
  Object.entries(categoryKeywords).forEach(([category, keywords]) => {
    scores[category] = keywords.reduce((score, keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(regex);
      return score + (matches ? matches.length : 0);
    }, 0);
  });

  // Find category with highest score
  let maxScore = 0;
  let bestCategory = 'personal'; // Default

  Object.entries(scores).forEach(([category, score]) => {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  });

  return bestCategory;
}

module.exports = {
  categorizeEvent,
  trainClassifier // Export for potential retraining
};
