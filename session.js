// ========================================
// Session Management for Guest Players
// ========================================

/**
 * Get or create a unique session ID for this browser
 * Used to identify players across page reloads without authentication
 * @returns {string} Session ID (UUID)
 */
export function getSessionId() {
  const SESSION_KEY = 'chess_session_id';
  
  // Check if session already exists
  let sessionId = localStorage.getItem(SESSION_KEY);
  
  if (!sessionId) {
    // Generate new session ID
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
    console.log('Created new session:', sessionId);
  } else {
    console.log('Using existing session:', sessionId);
  }
  
  return sessionId;
}

/**
 * Clear the current session
 * Useful for testing or if user wants to create a new session
 */
export function clearSession() {
  localStorage.removeItem('chess_session_id');
  console.log('Session cleared');
}

/**
 * Check if user has an existing session
 * @returns {boolean}
 */
export function hasSession() {
  return localStorage.getItem('chess_session_id') !== null;
}

