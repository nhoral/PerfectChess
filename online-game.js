// ========================================
// Online Multiplayer Game Functions (Guest Access)
// ========================================

import { supabase } from './supabase-client.js';
import { getSessionId } from './session.js';

/**
 * Generate a random 6-character game code
 * @returns {string}
 */
function generateGameCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Create a new online game
 * @param {Array} boardState - Current board state
 * @returns {Promise<{data, error}>}
 */
export async function createGame(boardState) {
  const sessionId = getSessionId();
  const gameCode = generateGameCode();
  
  const { data, error } = await supabase
    .from('games')
    .insert({
      game_code: gameCode,
      player1_session: sessionId,
      player1_last_active: new Date().toISOString(),
      player1_connected: true,
      board_state: boardState,
      status: 'waiting',
      current_turn: 1,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
    })
    .select()
    .single();
  
  if (data) {
    data.playerNumber = 1; // Creator is always Player 1
  }
  
  return { data, error };
}

/**
 * Join an existing game by game code
 * @param {string} gameCode - Game code to join
 * @returns {Promise<{data, error}>}
 */
export async function joinGame(gameCode) {
  const sessionId = getSessionId();
  
  // Load game
  const { data: game, error: loadError } = await supabase
    .from('games')
    .select('*')
    .eq('game_code', gameCode.toUpperCase())
    .single();
  
  if (loadError || !game) {
    return { data: null, error: { message: 'Game not found' } };
  }
  
  const now = new Date().toISOString();
  const disconnectThreshold = new Date(Date.now() - 60 * 1000).toISOString();
  
  // Check if already in game (reconnecting)
  if (game.player1_session === sessionId) {
    // Rejoin as Player 1
    const { error: updateError } = await supabase
      .from('games')
      .update({
        player1_connected: true,
        player1_last_active: now
      })
      .eq('id', game.id);
    
    if (updateError) {
      return { data: null, error: updateError };
    }
    
    return { data: { ...game, playerNumber: 1 }, error: null };
  }
  
  if (game.player2_session === sessionId) {
    // Rejoin as Player 2
    const { error: updateError } = await supabase
      .from('games')
      .update({
        player2_connected: true,
        player2_last_active: now
      })
      .eq('id', game.id);
    
    if (updateError) {
      return { data: null, error: updateError };
    }
    
    return { data: { ...game, playerNumber: 2 }, error: null };
  }
  
  // Try to join as new player
  // Check if Player 1 slot is available (empty or disconnected)
  const player1Disconnected = game.player1_last_active && 
    game.player1_last_active < disconnectThreshold;
  
  if (!game.player1_session || (player1Disconnected && !game.player1_connected)) {
    const { data: updatedGame, error: updateError } = await supabase
      .from('games')
      .update({
        player1_session: sessionId,
        player1_connected: true,
        player1_last_active: now
      })
      .eq('id', game.id)
      .select()
      .single();
    
    if (updateError) {
      return { data: null, error: updateError };
    }
    
    return { data: { ...updatedGame, playerNumber: 1 }, error: null };
  }
  
  // Check if Player 2 slot is available (empty or disconnected)
  const player2Disconnected = game.player2_last_active && 
    game.player2_last_active < disconnectThreshold;
  
  if (!game.player2_session || (player2Disconnected && !game.player2_connected)) {
    const { data: updatedGame, error: updateError } = await supabase
      .from('games')
      .update({
        player2_session: sessionId,
        player2_connected: true,
        player2_last_active: now,
        status: 'active' // Game starts when both players join
      })
      .eq('id', game.id)
      .select()
      .single();
    
    if (updateError) {
      return { data: null, error: updateError };
    }
    
    return { data: { ...updatedGame, playerNumber: 2 }, error: null };
  }
  
  // Both slots taken and active
  return { data: null, error: { message: 'Game is full' } };
}

/**
 * Load game by ID
 * @param {string} gameId - Game UUID
 * @returns {Promise<{data, error}>}
 */
export async function loadGame(gameId) {
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();
  
  if (gameError) return { data: null, error: gameError };
  
  // Get all moves for this game
  const { data: moves, error: movesError } = await supabase
    .from('game_moves')
    .select('*')
    .eq('game_id', gameId)
    .order('move_number', { ascending: true });
  
  return { data: { game, moves: moves || [] }, error: movesError };
}

/**
 * Submit a move to the database
 * @param {string} gameId - Game UUID
 * @param {number} playerNumber - 1 or 2
 * @param {Object} moveData - Move details
 * @returns {Promise<{error}>}
 */
export async function submitMove(gameId, playerNumber, moveData) {
  const {
    fromRow,
    fromCol,
    toRow,
    toCol,
    pieceType,
    capturedPiece,
    notation,
    newBoardState,
    nextTurn,
    moveNumber
  } = moveData;
  
  // Insert the move
  const { error: moveError } = await supabase
    .from('game_moves')
    .insert({
      game_id: gameId,
      player_number: playerNumber,
      move_number: moveNumber,
      from_row: fromRow,
      from_col: fromCol,
      to_row: toRow,
      to_col: toCol,
      piece_type: pieceType,
      captured_piece: capturedPiece,
      notation: notation
    });
  
  if (moveError) return { error: moveError };
  
  // Update game state and activity timestamp
  const sessionId = getSessionId();
  const activityField = playerNumber === 1 ? 'player1_last_active' : 'player2_last_active';
  
  const { error: gameError } = await supabase
    .from('games')
    .update({
      board_state: newBoardState,
      current_turn: nextTurn,
      [activityField]: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', gameId);
  
  return { error: gameError };
}

/**
 * Poll for game updates
 * @param {string} gameId - Game UUID
 * @param {Function} onGameUpdate - Callback for game changes
 * @param {Function} onMoveReceived - Callback for new moves
 * @param {number} intervalMs - Polling interval in milliseconds (default: 2000)
 * @returns {Object} Polling controller with stop method
 */
export function pollGameUpdates(gameId, onGameUpdate, onMoveReceived, intervalMs = 2000) {
  let lastKnownMoveId = 0;
  let lastUpdatedAt = null;
  let isPolling = true;
  
  async function poll() {
    if (!isPolling) return;
    
    try {
      // Get latest game state
      const { data: game } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();
      
      if (game) {
        // Check if game was updated
        if (!lastUpdatedAt || game.updated_at !== lastUpdatedAt) {
          lastUpdatedAt = game.updated_at;
          if (onGameUpdate) {
            onGameUpdate(game);
          }
        }
      }
      
      // Get new moves since last check
      const { data: moves } = await supabase
        .from('game_moves')
        .select('*')
        .eq('game_id', gameId)
        .gt('id', lastKnownMoveId)
        .order('id', { ascending: true });
      
      if (moves && moves.length > 0) {
        // Update last known move ID
        lastKnownMoveId = moves[moves.length - 1].id;
        
        // Notify about each new move
        if (onMoveReceived) {
          moves.forEach(move => onMoveReceived(move));
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
    
    // Schedule next poll
    if (isPolling) {
      setTimeout(poll, intervalMs);
    }
  }
  
  // Start polling
  poll();
  
  // Return controller to stop polling
  return {
    stop: () => {
      isPolling = false;
    }
  };
}

/**
 * Stop polling for game updates
 * @param {Object} pollController - Controller returned from pollGameUpdates
 */
export function stopPolling(pollController) {
  if (pollController && pollController.stop) {
    pollController.stop();
  }
}

/**
 * Update player activity (heartbeat)
 * @param {string} gameId - Game UUID
 * @param {number} playerNumber - 1 or 2
 * @returns {Promise<{error}>}
 */
export async function updateActivity(gameId, playerNumber) {
  const activityField = playerNumber === 1 ? 'player1_last_active' : 'player2_last_active';
  
  const { error } = await supabase
    .from('games')
    .update({
      [activityField]: new Date().toISOString()
    })
    .eq('id', gameId);
  
  return { error };
}

/**
 * End a game
 * @param {string} gameId - Game UUID
 * @param {number} winningPlayer - 1 or 2 (or null for draw)
 * @returns {Promise<{error}>}
 */
export async function endGame(gameId, winningPlayer = null) {
  const updateData = {
    status: 'completed',
    updated_at: new Date().toISOString()
  };
  
  if (winningPlayer) {
    updateData.winning_player = winningPlayer;
  }
  
  const { error } = await supabase
    .from('games')
    .update(updateData)
    .eq('id', gameId);
  
  return { error };
}

/**
 * Abandon/cancel a game
 * @param {string} gameId - Game UUID
 * @returns {Promise<{error}>}
 */
export async function abandonGame(gameId) {
  const { error } = await supabase
    .from('games')
    .delete()
    .eq('id', gameId);
  
  return { error };
}
