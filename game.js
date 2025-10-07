// ========================================
// Perfect Chess - Phase 8
// Complete Chess with Guest-Only Multiplayer
// ========================================

// Import online modules
import { supabase } from './supabase-client.js';
import { getSessionId } from './session.js';
import { 
    createGame, 
    joinGame, 
    loadGame, 
    submitMove, 
    pollGameUpdates,
    stopPolling,
    updateActivity,
    endGame,
    abandonGame 
} from './online-game.js';

// Game state
const board = Array(8).fill(null).map(() => Array(8).fill(null));
const tileOverlays = Array(8).fill(null).map(() => Array(8).fill(null));
const gameState = {
    gameMode: 'menu', // 'menu', 'single', 'multi', 'online'
    aiPlayer: 2, // AI always plays as Player 2 (Black)
    aiThinking: false, // true when AI is calculating
    selectedPiece: null, // {row, col} or null
    currentTurn: 1, // 1 or 2
    legalMoves: [], // [{row, col}] when piece is selected
    lastMove: null, // {from: {row, col}, to: {row, col}, piece: type}
    inCheck: false,
    gameOver: false,
    winner: null, // 1, 2, or 'draw'
    moveHistory: [], // Array of all moves
    
    // Online game state
    onlineGameId: null,
    onlineGameCode: null,
    playerNumber: null, // 1 or 2 (which player am I?)
    pollController: null, // Polling controller for game updates
    heartbeatInterval: null, // Interval for connection heartbeat
    opponentConnected: true // Track opponent connection status
};

// Piece values for AI evaluation
const PIECE_VALUES = {
    pawn: 100,
    knight: 320,
    bishop: 330,
    rook: 500,
    queen: 900,
    king: 20000
};

// Center squares for bonus
const CENTER_SQUARES = [
    {row: 3, col: 3}, // d5
    {row: 3, col: 4}, // e5
    {row: 4, col: 3}, // d4
    {row: 4, col: 4}  // e4
];

// Movement offsets for pieces
const KNIGHT_OFFSETS = [
    [-2, -1], [-2, 1],  // Up 2, left/right 1
    [-1, -2], [-1, 2],  // Up 1, left/right 2
    [1, -2],  [1, 2],   // Down 1, left/right 2
    [2, -1],  [2, 1]    // Down 2, left/right 1
];

const KING_OFFSETS = [
    [-1, -1], [-1, 0], [-1, 1],  // Up row
    [0, -1],           [0, 1],   // Same row
    [1, -1],  [1, 0],  [1, 1]    // Down row
];

// Unicode chess pieces
const PIECES = {
    queen: { white: '♕', black: '♛' },
    king: { white: '♔', black: '♚' },
    rook: { white: '♖', black: '♜' },
    bishop: { white: '♗', black: '♝' },
    knight: { white: '♘', black: '♞' },
    pawn: { white: '♙', black: '♟' }
};

// ========================================
// AI Functions
// ========================================

/**
 * Get all legal moves for a player
 * @param {number} player - Player number (1 or 2)
 * @returns {Array} Array of move objects
 */
function getAllLegalMovesForPlayer(player) {
    const moves = [];
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.player === player) {
                const pieceMoves = getLegalMoves(row, col);
                for (const move of pieceMoves) {
                    moves.push({
                        from: { row, col },
                        to: { row: move.row, col: move.col },
                        piece: piece,
                        moveData: move // Include full move data (for castling, etc.)
                    });
                }
            }
        }
    }
    
    return moves;
}

/**
 * Evaluate a single move
 * @param {Object} move - Move object with from/to coordinates
 * @param {number} player - Player number
 * @returns {number} Score for the move
 */
function evaluateMove(move, player) {
    let score = 0;
    
    // 1. Capture value (highest priority)
    const targetPiece = board[move.to.row][move.to.col];
    if (targetPiece && targetPiece.player !== player) {
        score += PIECE_VALUES[targetPiece.type];
    }
    
    // 2. Center control bonus
    const isCenter = CENTER_SQUARES.some(
        sq => sq.row === move.to.row && sq.col === move.to.col
    );
    if (isCenter) {
        score += 30;
    }
    
    // 3. Development bonus (move off back rank early)
    const isBackRank = (player === 1 && move.from.row === 7) || 
                       (player === 2 && move.from.row === 0);
    if (isBackRank && move.piece.type !== 'king') {
        score += 20;
    }
    
    // 4. Small random factor (makes AI less predictable)
    score += Math.random() * 10;
    
    return score;
}

/**
 * Get best move for computer
 * @param {number} player - Player number
 * @returns {Object|null} Best move or null if no moves
 */
function getComputerMove(player) {
    const allMoves = getAllLegalMovesForPlayer(player);
    
    if (allMoves.length === 0) {
        return null; // No legal moves
    }
    
    let bestMove = null;
    let bestScore = -Infinity;
    
    for (const move of allMoves) {
        const score = evaluateMove(move, player);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    
    return bestMove;
}

/**
 * Helper function for delay
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise}
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Handle AI turn
 */
async function handleAITurn() {
    if (gameState.aiThinking || gameState.gameOver) return;
    
    // Visual feedback
    gameState.aiThinking = true;
    updateTurnIndicator();
    
    // Artificial delay for better UX
    await delay(800);
    
    // Get best move
    const move = getComputerMove(gameState.currentTurn);
    
    // Execute move
    if (move) {
        movePiece(move.from.row, move.from.col, move.to.row, move.to.col, move.moveData);
    }
    
    gameState.aiThinking = false;
}

// ========================================
// Game Setup
// ========================================

/**
 * Create a piece object
 */
function createPiece(type, player, row, col) {
    return {
        type,
        player,
        position: { row, col },
        hasMoved: false
    };
}

/**
 * Initialize the game board with standard chess starting position
 */
function initializeBoard() {
    // Clear the board
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            board[row][col] = null;
        }
    }
    
    // Chess board: row 0 = rank 8, row 7 = rank 1
    // Files: a=0, b=1, c=2, d=3, e=4, f=5, g=6, h=7
    
    // Black pieces (Player 2) - Row 0 (Rank 8)
    board[0][0] = createPiece('rook', 2, 0, 0);    // a8
    board[0][1] = createPiece('knight', 2, 0, 1);  // b8
    board[0][2] = createPiece('bishop', 2, 0, 2);  // c8
    board[0][3] = createPiece('queen', 2, 0, 3);   // d8
    board[0][4] = createPiece('king', 2, 0, 4);    // e8
    board[0][5] = createPiece('bishop', 2, 0, 5);  // f8
    board[0][6] = createPiece('knight', 2, 0, 6);  // g8
    board[0][7] = createPiece('rook', 2, 0, 7);    // h8
    
    // Black pawns - Row 1 (Rank 7)
    for (let col = 0; col < 8; col++) {
        board[1][col] = createPiece('pawn', 2, 1, col);
    }
    
    // White pawns - Row 6 (Rank 2)
    for (let col = 0; col < 8; col++) {
        board[6][col] = createPiece('pawn', 1, 6, col);
    }
    
    // White pieces (Player 1) - Row 7 (Rank 1)
    board[7][0] = createPiece('rook', 1, 7, 0);    // a1
    board[7][1] = createPiece('knight', 1, 7, 1);  // b1
    board[7][2] = createPiece('bishop', 1, 7, 2);  // c1
    board[7][3] = createPiece('queen', 1, 7, 3);   // d1
    board[7][4] = createPiece('king', 1, 7, 4);    // e1
    board[7][5] = createPiece('bishop', 1, 7, 5);  // f1
    board[7][6] = createPiece('knight', 1, 7, 6);  // g1
    board[7][7] = createPiece('rook', 1, 7, 7);    // h1
    
    // Reset game state
    gameState.selectedPiece = null;
    gameState.currentTurn = 1;
    gameState.legalMoves = [];
    gameState.lastMove = null;
    gameState.inCheck = false;
    gameState.gameOver = false;
    gameState.winner = null;
    gameState.moveHistory = [];
    
    // Update attack ranges
    updateAttackRanges();
    
    // Render the board
    renderBoard();
    updateTurnIndicator();
}

/**
 * Calculate all possible attack squares for a queen at given position
 * @param {number} row - Row index (0-7)
 * @param {number} col - Column index (0-7)
 * @param {number} player - Player number (for filtering friendly pieces)
 * @returns {Array} Array of {row, col} coordinates
 */
function calculateQueenAttacks(row, col, player) {
    const moves = [];
    
    // 8 directions: N, S, E, W, NE, NW, SE, SW
    const directions = [
        [-1, 0],  // North (up)
        [1, 0],   // South (down)
        [0, 1],   // East (right)
        [0, -1],  // West (left)
        [-1, 1],  // Northeast
        [-1, -1], // Northwest
        [1, 1],   // Southeast
        [1, -1]   // Southwest
    ];
    
    // For each direction, continue until edge of board or hit a piece
    for (const [dRow, dCol] of directions) {
        let currentRow = row + dRow;
        let currentCol = col + dCol;
        
        while (currentRow >= 0 && currentRow < 8 && currentCol >= 0 && currentCol < 8) {
            const targetPiece = board[currentRow][currentCol];
            
            // Include all squares (including defended friendly pieces)
            moves.push({ row: currentRow, col: currentCol });
            
            // Stop if we hit any piece (can't attack through pieces)
            if (targetPiece) {
                break;
            }
            
            currentRow += dRow;
            currentCol += dCol;
        }
    }
    
    return moves;
}

/**
 * Calculate attack squares for a pawn (diagonal forward)
 * @param {number} row - Row index (0-7)
 * @param {number} col - Column index (0-7)
 * @param {number} player - Player number (1 or 2)
 * @returns {Array} Array of {row, col} coordinates
 */
function calculatePawnAttacks(row, col, player) {
    const attacks = [];
    const direction = player === 1 ? -1 : 1; // Player 1 moves up (negative), Player 2 down (positive)
    
    // Diagonal attacks
    const attackRow = row + direction;
    
    if (attackRow >= 0 && attackRow < 8) {
        // Left diagonal
        if (col - 1 >= 0) {
            attacks.push({ row: attackRow, col: col - 1 });
        }
        // Right diagonal
        if (col + 1 < 8) {
            attacks.push({ row: attackRow, col: col + 1 });
        }
    }
    
    return attacks;
}

/**
 * Calculate attack squares for a rook at given position
 * @param {number} row - Row index (0-7)
 * @param {number} col - Column index (0-7)
 * @param {number} player - Player number (for filtering friendly pieces)
 * @returns {Array} Array of {row, col} coordinates
 */
function calculateRookAttacks(row, col, player) {
    const moves = [];
    
    // 4 directions: N, S, E, W
    const directions = [
        [-1, 0],  // North (up)
        [1, 0],   // South (down)
        [0, 1],   // East (right)
        [0, -1]   // West (left)
    ];
    
    // For each direction, continue until edge of board or hit a piece
    for (const [dRow, dCol] of directions) {
        let currentRow = row + dRow;
        let currentCol = col + dCol;
        
        while (currentRow >= 0 && currentRow < 8 && currentCol >= 0 && currentCol < 8) {
            const targetPiece = board[currentRow][currentCol];
            
            // Include all squares (including defended friendly pieces)
            moves.push({ row: currentRow, col: currentCol });
            
            // Stop if we hit any piece (can't attack through pieces)
            if (targetPiece) {
                break;
            }
            
            currentRow += dRow;
            currentCol += dCol;
        }
    }
    
    return moves;
}

/**
 * Calculate attack squares for a bishop at given position
 * @param {number} row - Row index (0-7)
 * @param {number} col - Column index (0-7)
 * @param {number} player - Player number (for filtering friendly pieces)
 * @returns {Array} Array of {row, col} coordinates
 */
function calculateBishopAttacks(row, col, player) {
    const moves = [];
    
    // 4 diagonal directions: NE, NW, SE, SW
    const directions = [
        [-1, 1],  // Northeast
        [-1, -1], // Northwest
        [1, 1],   // Southeast
        [1, -1]   // Southwest
    ];
    
    // For each direction, continue until edge of board or hit a piece
    for (const [dRow, dCol] of directions) {
        let currentRow = row + dRow;
        let currentCol = col + dCol;
        
        while (currentRow >= 0 && currentRow < 8 && currentCol >= 0 && currentCol < 8) {
            const targetPiece = board[currentRow][currentCol];
            
            // Include all squares (including defended friendly pieces)
            moves.push({ row: currentRow, col: currentCol });
            
            // Stop if we hit any piece (can't attack through pieces)
            if (targetPiece) {
                break;
            }
            
            currentRow += dRow;
            currentCol += dCol;
        }
    }
    
    return moves;
}

/**
 * Calculate attack squares for a knight at given position
 * @param {number} row - Row index (0-7)
 * @param {number} col - Column index (0-7)
 * @param {number} player - Player number (for filtering friendly pieces)
 * @returns {Array} Array of {row, col} coordinates
 */
function calculateKnightAttacks(row, col, player) {
    const moves = [];
    
    for (const [dRow, dCol] of KNIGHT_OFFSETS) {
        const newRow = row + dRow;
        const newCol = col + dCol;
        
        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            // Include all squares the knight can attack (including defense of friendly pieces)
            moves.push({ row: newRow, col: newCol });
        }
    }
    
    return moves;
}

/**
 * Calculate attack squares for a king at given position
 * @param {number} row - Row index (0-7)
 * @param {number} col - Column index (0-7)
 * @param {number} player - Player number (for filtering friendly pieces)
 * @returns {Array} Array of {row, col} coordinates
 */
function calculateKingAttacks(row, col, player) {
    const moves = [];
    
    for (const [dRow, dCol] of KING_OFFSETS) {
        const newRow = row + dRow;
        const newCol = col + dCol;
        
        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            // Include all squares the king can attack (including defense of friendly pieces)
            moves.push({ row: newRow, col: newCol });
        }
    }
    
    return moves;
}

/**
 * Calculate attack ranges for a specific player
 * @param {number} player - Player number (1 or 2)
 * @returns {Array} Array of {row, col} coordinates
 */
function calculateAttackRangeByPlayer(player) {
    const attacks = [];
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.player === player) {
                let attackSquares = [];
                
                switch (piece.type) {
                    case 'queen':
                        attackSquares = calculateQueenAttacks(row, col, player);
                        break;
                    case 'rook':
                        attackSquares = calculateRookAttacks(row, col, player);
                        break;
                    case 'bishop':
                        attackSquares = calculateBishopAttacks(row, col, player);
                        break;
                    case 'knight':
                        attackSquares = calculateKnightAttacks(row, col, player);
                        break;
                    case 'king':
                        attackSquares = calculateKingAttacks(row, col, player);
                        break;
                    case 'pawn':
                        attackSquares = calculatePawnAttacks(row, col, piece.player);
                        break;
                }
                
                attacks.push(...attackSquares);
            }
        }
    }
    
    return attacks;
}

/**
 * Calculate overlay colors based on both players' attack ranges
 * @returns {Object} Object with blue, red, and purple square arrays
 */
function calculateOverlays() {
    const player1Attacks = calculateAttackRangeByPlayer(1);
    const player2Attacks = calculateAttackRangeByPlayer(2);
    
    // Create sets for efficient lookup
    const p1Set = new Set(player1Attacks.map(coord => `${coord.row},${coord.col}`));
    const p2Set = new Set(player2Attacks.map(coord => `${coord.row},${coord.col}`));
    
    const overlays = {
        blue: [],
        red: [],
        purple: []
    };
    
    // Check all squares
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const key = `${row},${col}`;
            const inP1Range = p1Set.has(key);
            const inP2Range = p2Set.has(key);
            
            if (inP1Range && inP2Range) {
                overlays.purple.push({ row, col });
            } else if (inP1Range) {
                overlays.blue.push({ row, col });
            } else if (inP2Range) {
                overlays.red.push({ row, col });
            }
        }
    }
    
    return overlays;
}

/**
 * Update attack range overlays for all pieces on the board
 */
function updateAttackRanges() {
    // Clear all overlays
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            tileOverlays[row][col] = null;
        }
    }
    
    // Calculate overlays for both players
    const overlays = calculateOverlays();
    
    // Apply blue overlays
    for (const square of overlays.blue) {
        tileOverlays[square.row][square.col] = 'blue';
    }
    
    // Apply red overlays
    for (const square of overlays.red) {
        tileOverlays[square.row][square.col] = 'red';
    }
    
    // Apply purple overlays (contested squares)
    for (const square of overlays.purple) {
        tileOverlays[square.row][square.col] = 'purple';
    }
}

/**
 * Apply an overlay color to a tile
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {string} color - 'blue', 'red', or will become 'purple' if both
 */
function applyOverlay(row, col, color) {
    const currentOverlay = tileOverlays[row][col];
    
    // If there's already an overlay of a different color, make it purple
    if (currentOverlay && currentOverlay !== color) {
        tileOverlays[row][col] = 'purple';
    } else {
        tileOverlays[row][col] = color;
    }
}

/**
 * Get legal moves for a piece at given position
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @returns {Array} Array of legal {row, col} coordinates
 */
function getLegalMoves(row, col) {
    const piece = board[row][col];
    if (!piece) return [];
    
    let moves = [];
    
    switch (piece.type) {
        case 'queen':
            moves = calculateQueenLegalMoves(row, col, piece.player);
            break;
        case 'rook':
            moves = calculateRookLegalMoves(row, col, piece.player);
            break;
        case 'bishop':
            moves = calculateBishopLegalMoves(row, col, piece.player);
            break;
        case 'knight':
            moves = calculateKnightLegalMoves(row, col, piece.player);
            break;
        case 'king':
            moves = calculateKingLegalMoves(row, col, piece.player);
            break;
        case 'pawn':
            moves = calculatePawnLegalMoves(row, col, piece.player, piece.hasMoved);
            break;
    }
    
    return moves;
}

/**
 * Calculate legal moves for a queen
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {number} player - Player number
 * @returns {Array} Array of legal {row, col} coordinates
 */
function calculateQueenLegalMoves(row, col, player) {
    const moves = [];
    const directions = [
        [-1, 0], [1, 0], [0, 1], [0, -1],
        [-1, 1], [-1, -1], [1, 1], [1, -1]
    ];
    
    for (const [dRow, dCol] of directions) {
        let currentRow = row + dRow;
        let currentCol = col + dCol;
        
        while (currentRow >= 0 && currentRow < 8 && currentCol >= 0 && currentCol < 8) {
            const targetPiece = board[currentRow][currentCol];
            
            if (targetPiece) {
                // Can capture enemy piece
                if (targetPiece.player !== player) {
                    moves.push({ row: currentRow, col: currentCol });
                }
                // Stop regardless (can't move through pieces)
                break;
            }
            
            moves.push({ row: currentRow, col: currentCol });
            currentRow += dRow;
            currentCol += dCol;
        }
    }
    
    return moves;
}

/**
 * Calculate legal moves for a pawn
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {number} player - Player number
 * @param {boolean} hasMoved - Whether pawn has moved before
 * @returns {Array} Array of legal {row, col} coordinates
 */
function calculatePawnLegalMoves(row, col, player, hasMoved) {
    const moves = [];
    const direction = player === 1 ? -1 : 1; // Player 1 moves up, Player 2 down
    
    // Forward movement (1 square)
    const oneForward = row + direction;
    if (oneForward >= 0 && oneForward < 8 && !board[oneForward][col]) {
        moves.push({ row: oneForward, col: col });
        
        // Two squares forward on first move
        if (!hasMoved) {
            const twoForward = row + (direction * 2);
            if (twoForward >= 0 && twoForward < 8 && !board[twoForward][col]) {
                moves.push({ row: twoForward, col: col });
            }
        }
    }
    
    // Diagonal captures
    const captureRow = row + direction;
    if (captureRow >= 0 && captureRow < 8) {
        // Left diagonal
        if (col - 1 >= 0) {
            const targetPiece = board[captureRow][col - 1];
            if (targetPiece && targetPiece.player !== player) {
                moves.push({ row: captureRow, col: col - 1 });
            }
        }
        // Right diagonal
        if (col + 1 < 8) {
            const targetPiece = board[captureRow][col + 1];
            if (targetPiece && targetPiece.player !== player) {
                moves.push({ row: captureRow, col: col + 1 });
            }
        }
    }
    
    return moves;
}

/**
 * Calculate legal moves for a rook
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {number} player - Player number
 * @returns {Array} Array of legal {row, col} coordinates
 */
function calculateRookLegalMoves(row, col, player) {
    const moves = [];
    const directions = [
        [-1, 0], [1, 0], [0, 1], [0, -1]
    ];
    
    for (const [dRow, dCol] of directions) {
        let currentRow = row + dRow;
        let currentCol = col + dCol;
        
        while (currentRow >= 0 && currentRow < 8 && currentCol >= 0 && currentCol < 8) {
            const targetPiece = board[currentRow][currentCol];
            
            if (targetPiece) {
                if (targetPiece.player !== player) {
                    moves.push({ row: currentRow, col: currentCol });
                }
                break;
            }
            
            moves.push({ row: currentRow, col: currentCol });
            currentRow += dRow;
            currentCol += dCol;
        }
    }
    
    return moves;
}

/**
 * Calculate legal moves for a bishop
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {number} player - Player number
 * @returns {Array} Array of legal {row, col} coordinates
 */
function calculateBishopLegalMoves(row, col, player) {
    const moves = [];
    const directions = [
        [-1, 1], [-1, -1], [1, 1], [1, -1]
    ];
    
    for (const [dRow, dCol] of directions) {
        let currentRow = row + dRow;
        let currentCol = col + dCol;
        
        while (currentRow >= 0 && currentRow < 8 && currentCol >= 0 && currentCol < 8) {
            const targetPiece = board[currentRow][currentCol];
            
            if (targetPiece) {
                if (targetPiece.player !== player) {
                    moves.push({ row: currentRow, col: currentCol });
                }
                break;
            }
            
            moves.push({ row: currentRow, col: currentCol });
            currentRow += dRow;
            currentCol += dCol;
        }
    }
    
    return moves;
}

/**
 * Calculate legal moves for a knight
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {number} player - Player number
 * @returns {Array} Array of legal {row, col} coordinates
 */
function calculateKnightLegalMoves(row, col, player) {
    const moves = [];
    
    for (const [dRow, dCol] of KNIGHT_OFFSETS) {
        const newRow = row + dRow;
        const newCol = col + dCol;
        
        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            const targetPiece = board[newRow][newCol];
            
            // Can move to empty square or capture enemy piece
            if (!targetPiece || targetPiece.player !== player) {
                moves.push({ row: newRow, col: newCol });
            }
        }
    }
    
    return moves;
}

/**
 * Check if a square is under attack by opponent
 * NOTE: Uses raw attack patterns to avoid infinite recursion with getLegalMoves
 * @param {number} row - Row to check
 * @param {number} col - Column to check
 * @param {number} player - Player to check for (1 or 2)
 * @returns {boolean} True if square is under attack
 */
function isSquareUnderAttack(row, col, player) {
    const opponent = player === 1 ? 2 : 1;
    
    // Check all opponent pieces for attacks
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.player === opponent) {
                // Check if this piece can attack the target square
                if (canPieceAttackSquare(piece, r, c, row, col)) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

/**
 * Check if a piece can attack a specific square (ignoring check rules)
 * @param {Object} piece - The attacking piece
 * @param {number} fromRow - Piece's current row
 * @param {number} fromCol - Piece's current column
 * @param {number} toRow - Target row
 * @param {number} toCol - Target column
 * @returns {boolean}
 */
function canPieceAttackSquare(piece, fromRow, fromCol, toRow, toCol) {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    
    switch (piece.type) {
        case 'pawn':
            // Pawns attack diagonally (1 square)
            const direction = piece.player === 1 ? -1 : 1;
            return (toRow === fromRow + direction) && colDiff === 1;
            
        case 'knight':
            // Knights move in L-shape
            return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
            
        case 'bishop':
            // Bishops move diagonally
            if (rowDiff !== colDiff) return false;
            return !isPathBlocked(fromRow, fromCol, toRow, toCol);
            
        case 'rook':
            // Rooks move straight
            if (fromRow !== toRow && fromCol !== toCol) return false;
            return !isPathBlocked(fromRow, fromCol, toRow, toCol);
            
        case 'queen':
            // Queens move like rooks or bishops
            if (fromRow !== toRow && fromCol !== toCol && rowDiff !== colDiff) return false;
            return !isPathBlocked(fromRow, fromCol, toRow, toCol);
            
        case 'king':
            // Kings move 1 square in any direction
            return rowDiff <= 1 && colDiff <= 1;
            
        default:
            return false;
    }
}

/**
 * Check if path between two squares is blocked
 * @param {number} fromRow
 * @param {number} fromCol
 * @param {number} toRow
 * @param {number} toCol
 * @returns {boolean}
 */
function isPathBlocked(fromRow, fromCol, toRow, toCol) {
    const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
    const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
    
    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;
    
    while (currentRow !== toRow || currentCol !== toCol) {
        if (board[currentRow][currentCol] !== null) {
            return true; // Path is blocked
        }
        currentRow += rowStep;
        currentCol += colStep;
    }
    
    return false; // Path is clear
}

/**
 * Get castling moves for a king
 * @param {number} row - King's row
 * @param {number} col - King's column
 * @param {number} player - Player number
 * @returns {Array} Array of castling moves with special flag
 */
function getCastlingMoves(row, col, player) {
    const piece = board[row][col];
    if (!piece || piece.hasMoved) {
        return [];
    }
    
    const moves = [];
    
    // Check if king is in check (can't castle out of check)
    if (isSquareUnderAttack(row, col, player)) {
        return moves;
    }
    
    // Kingside castling (short castle) - King moves to column 6
    const kingsideRook = board[row][7];
    if (kingsideRook && 
        kingsideRook.type === 'rook' && 
        kingsideRook.player === player && 
        !kingsideRook.hasMoved) {
        
        // Check if squares between are empty
        if (!board[row][5] && !board[row][6]) {
            // Check if king doesn't move through or into check
            if (!isSquareUnderAttack(row, 5, player) && 
                !isSquareUnderAttack(row, 6, player)) {
                moves.push({ 
                    row, 
                    col: 6, 
                    isCastling: true, 
                    rookFromCol: 7, 
                    rookToCol: 5 
                });
            }
        }
    }
    
    // Queenside castling (long castle) - King moves to column 2
    const queensideRook = board[row][0];
    if (queensideRook && 
        queensideRook.type === 'rook' && 
        queensideRook.player === player && 
        !queensideRook.hasMoved) {
        
        // Check if squares between are empty
        if (!board[row][1] && !board[row][2] && !board[row][3]) {
            // Check if king doesn't move through or into check
            if (!isSquareUnderAttack(row, 2, player) && 
                !isSquareUnderAttack(row, 3, player)) {
                moves.push({ 
                    row, 
                    col: 2, 
                    isCastling: true, 
                    rookFromCol: 0, 
                    rookToCol: 3 
                });
            }
        }
    }
    
    return moves;
}

/**
 * Calculate legal moves for a king
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {number} player - Player number
 * @returns {Array} Array of legal {row, col} coordinates
 */
function calculateKingLegalMoves(row, col, player) {
    const moves = [];
    
    // Standard king moves
    for (const [dRow, dCol] of KING_OFFSETS) {
        const newRow = row + dRow;
        const newCol = col + dCol;
        
        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            const targetPiece = board[newRow][newCol];
            
            // Can move to empty square or capture enemy piece
            if (!targetPiece || targetPiece.player !== player) {
                moves.push({ row: newRow, col: newCol });
            }
        }
    }
    
    // Add castling moves
    const castlingMoves = getCastlingMoves(row, col, player);
    moves.push(...castlingMoves);
    
    return moves;
}

/**
 * Select a piece and show its legal moves
 * @param {number} row - Row index
 * @param {number} col - Column index
 */
function selectPiece(row, col) {
    const piece = board[row][col];
    if (!piece || piece.player !== gameState.currentTurn) {
        return;
    }
    
    gameState.selectedPiece = { row, col };
    gameState.legalMoves = getLegalMoves(row, col);
    renderBoard();
}

/**
 * Move a piece from one position to another
 * @param {number} fromRow - Source row
 * @param {number} fromCol - Source column
 * @param {number} toRow - Destination row
 * @param {number} toCol - Destination column
 */
function movePiece(fromRow, fromCol, toRow, toCol, moveData = null) {
    const piece = board[fromRow][fromCol];
    if (!piece) return;
    
    let capturedPiece = null;
    
    // Handle castling
    if (moveData && moveData.isCastling) {
        console.log(`${piece.player === 1 ? 'White' : 'Black'} is castling ${moveData.rookFromCol === 7 ? 'kingside' : 'queenside'}`);
        
        // Move king
        piece.position = { row: toRow, col: toCol };
        piece.hasMoved = true;
        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = null;
        
        // Move rook
        const rook = board[toRow][moveData.rookFromCol];
        rook.position = { row: toRow, col: moveData.rookToCol };
        rook.hasMoved = true;
        board[toRow][moveData.rookToCol] = rook;
        board[toRow][moveData.rookFromCol] = null;
    } else {
        // Regular move - check for capture
        capturedPiece = board[toRow][toCol];
        if (capturedPiece) {
            console.log(`${piece.player === 1 ? 'White' : 'Black'} ${piece.type} captured ${capturedPiece.player === 1 ? 'White' : 'Black'} ${capturedPiece.type}`);
            
            // Check if king was captured - game over!
            if (capturedPiece.type === 'king') {
                gameState.gameOver = true;
                gameState.winner = piece.player;
            }
        }
        
        // Update piece position
        piece.position = { row: toRow, col: toCol };
        piece.hasMoved = true;
        
        // Move piece on board (this also removes any captured piece)
        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = null;
    }
    
    // Clear selection
    gameState.selectedPiece = null;
    gameState.legalMoves = [];
    
    // Switch turn
    gameState.currentTurn = gameState.currentTurn === 1 ? 2 : 1;
    
    // Update attack ranges and render
    updateAttackRanges();
    renderBoard();
    updateTurnIndicator();
    
    console.log(`Player ${piece.player} moved ${piece.type} to ${coordsToNotation(toRow, toCol)}`);
    
    // Submit move to online database if in online mode
    if (gameState.gameMode === 'online' && gameState.onlineGameId) {
        submitOnlineMove(fromRow, fromCol, toRow, toCol, piece, capturedPiece);
    }
    
    // Check if game is over
    if (gameState.gameOver) {
        if (gameState.gameMode === 'online' && gameState.onlineGameId) {
            // Record game result in database
            endGame(gameState.onlineGameId, gameState.currentUser.id);
        }
        showGameOver();
        return;
    }
    
    // Check if next turn is AI
    if (gameState.gameMode === 'single' && gameState.currentTurn === gameState.aiPlayer) {
        setTimeout(handleAITurn, 100); // Small delay before AI thinks
    }
}

/**
 * Submit move to online database
 */
async function submitOnlineMove(fromRow, fromCol, toRow, toCol, piece, capturedPiece) {
    try {
        const boardState = board.map(row => 
            row.map(p => p ? {
                type: p.type,
                player: p.player,
                symbol: p.symbol,
                hasMoved: p.hasMoved
            } : null)
        );
        
        const moveData = {
            fromRow,
            fromCol,
            toRow,
            toCol,
            pieceType: piece.type,
            capturedPiece: capturedPiece ? capturedPiece.type : null,
            notation: `${coordsToNotation(fromRow, fromCol)}-${coordsToNotation(toRow, toCol)}`,
            newBoardState: boardState,
            nextTurn: gameState.currentTurn,
            moveNumber: gameState.moveHistory.length + 1
        };
        
        console.log(`Submitting move to database. Next turn will be: ${gameState.currentTurn}`);
        
        const { error } = await submitMove(gameState.onlineGameId, gameState.playerNumber, moveData);
        if (error) {
            console.error('Error submitting move:', error);
        } else {
            console.log('Move submitted successfully to database');
        }
    } catch (error) {
        console.error('Failed to submit move online:', error);
    }
}

/**
 * Handle tile click events
 * @param {number} row - Row index
 * @param {number} col - Column index
 */
function handleTileClick(row, col) {
    // Don't allow input if game is over
    if (gameState.gameOver) return;
    
    // Don't allow input if AI is thinking
    if (gameState.aiThinking) return;
    
    // Don't allow input if it's AI's turn in single player mode
    if (gameState.gameMode === 'single' && gameState.currentTurn === gameState.aiPlayer) {
        return;
    }
    
    // Don't allow input if it's not player's turn in online mode
    if (gameState.gameMode === 'online' && gameState.playerNumber !== gameState.currentTurn) {
        return;
    }
    
    // If no piece selected
    if (!gameState.selectedPiece) {
        const piece = board[row][col];
        if (piece && piece.player === gameState.currentTurn) {
            selectPiece(row, col);
        }
        return;
    }
    
    // If piece is already selected
    const { row: selectedRow, col: selectedCol } = gameState.selectedPiece;
    
    // Check if clicked on same piece (deselect)
    if (row === selectedRow && col === selectedCol) {
        gameState.selectedPiece = null;
        gameState.legalMoves = [];
        renderBoard();
        return;
    }
    
    // Check if clicked on another friendly piece (switch selection)
    const clickedPiece = board[row][col];
    if (clickedPiece && clickedPiece.player === gameState.currentTurn) {
        selectPiece(row, col);
        return;
    }
    
    // Check if move is legal
    const legalMove = gameState.legalMoves.find(move => move.row === row && move.col === col);
    if (legalMove) {
        movePiece(selectedRow, selectedCol, row, col, legalMove);
    } else {
        // Invalid move, deselect
        gameState.selectedPiece = null;
        gameState.legalMoves = [];
        renderBoard();
    }
}

/**
 * Render the entire board
 */
/**
 * Get the threat status of a piece
 * @param {number} row - Piece row
 * @param {number} col - Piece column
 * @returns {string} Status: 'safe', 'threatened', 'contested'
 */
function getPieceStatus(row, col) {
    const piece = board[row][col];
    if (!piece) return 'safe';
    
    const isUnderAttack = isSquareUnderAttack(row, col, piece.player);
    
    // Only show borders for pieces under attack
    if (!isUnderAttack) {
        return 'safe'; // No border for safe or defended pieces
    }
    
    const isDefended = isSquareDefendedByAlly(row, col, piece.player);
    
    if (isDefended) {
        return 'contested'; // Under attack but defended (trade possible)
    } else {
        return 'threatened'; // Under attack, not defended (danger!)
    }
}

/**
 * Check if a square is defended by an ally
 * @param {number} row - Row to check
 * @param {number} col - Column to check
 * @param {number} player - Player whose allies to check
 * @returns {boolean}
 */
function isSquareDefendedByAlly(row, col, player) {
    // Check all ally pieces
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.player === player && !(r === row && c === col)) {
                // Check if this ally can attack the target square
                if (canPieceAttackSquare(piece, r, c, row, col)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function renderBoard() {
    const chessboard = document.getElementById('chessboard');
    chessboard.innerHTML = ''; // Clear existing tiles
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.dataset.row = row;
            tile.dataset.col = col;
            
            // Apply alternating square colors
            if ((row + col) % 2 === 0) {
                tile.classList.add('light');
            } else {
                tile.classList.add('dark');
            }
            
            // Apply overlay if present
            const overlay = tileOverlays[row][col];
            if (overlay) {
                tile.classList.add(`overlay-${overlay}`);
            }
            
            // Highlight selected piece
            if (gameState.selectedPiece && 
                gameState.selectedPiece.row === row && 
                gameState.selectedPiece.col === col) {
                tile.classList.add('selected');
            }
            
            // Highlight legal moves
            const isLegalMove = gameState.legalMoves.some(move => move.row === row && move.col === col);
            if (isLegalMove) {
                tile.classList.add('legal-move');
            }
            
            // Render piece if present
            const piece = board[row][col];
            if (piece) {
                const pieceElement = document.createElement('div');
                pieceElement.className = 'piece';
                
                // Add player-specific class for coloring
                pieceElement.classList.add(piece.player === 1 ? 'player1-piece' : 'player2-piece');
                
                // Add threat status class
                const status = getPieceStatus(row, col);
                if (status !== 'safe') {
                    pieceElement.classList.add(`status-${status}`);
                }
                
                // Get unicode symbol
                const color = piece.player === 1 ? 'white' : 'black';
                pieceElement.textContent = PIECES[piece.type][color];
                
                tile.appendChild(pieceElement);
            }
            
            // Add click handler
            tile.addEventListener('click', () => handleTileClick(row, col));
            
            chessboard.appendChild(tile);
        }
    }
}

/**
 * Convert chess notation to board coordinates
 * @param {string} notation - Chess notation (e.g., "d4")
 * @returns {Object} {row, col} coordinates
 */
function notationToCoords(notation) {
    const file = notation.charCodeAt(0) - 'a'.charCodeAt(0); // a=0, b=1, ..., h=7
    const rank = 8 - parseInt(notation[1]); // 8=row 0, 7=row 1, ..., 1=row 7
    return { row: rank, col: file };
}

/**
 * Convert board coordinates to chess notation
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @returns {string} Chess notation (e.g., "d4")
 */
function coordsToNotation(row, col) {
    const file = String.fromCharCode('a'.charCodeAt(0) + col);
    const rank = 8 - row;
    return `${file}${rank}`;
}

/**
 * Update the turn indicator display
 */
function updateTurnIndicator() {
    const turnText = document.getElementById('turn-text');
    const aiThinking = document.getElementById('ai-thinking');
    const indicator = document.getElementById('turn-indicator');
    
    if (!indicator || !turnText) return;
    
    if (gameState.gameMode === 'online') {
        // Online mode - show whose turn it is
        const isMyTurn = gameState.currentTurn === gameState.playerNumber;
        if (gameState.currentTurn === 1) {
            turnText.textContent = isMyTurn ? "Your Turn (White)" : "Opponent's Turn (White)";
            indicator.className = 'turn-indicator player1';
        } else {
            turnText.textContent = isMyTurn ? "Your Turn (Black)" : "Opponent's Turn (Black)";
            indicator.className = 'turn-indicator player2';
        }
    } else if (gameState.currentTurn === 1) {
        turnText.textContent = gameState.gameMode === 'single' ? "Your Turn (White)" : "Player 1's Turn (White)";
        indicator.className = 'turn-indicator player1';
    } else {
        turnText.textContent = gameState.gameMode === 'single' ? "Computer's Turn (Black)" : "Player 2's Turn (Black)";
        indicator.className = 'turn-indicator player2';
    }
    
    // Show/hide AI thinking indicator
    if (aiThinking) {
        if (gameState.aiThinking) {
            aiThinking.classList.remove('hidden');
        } else {
            aiThinking.classList.add('hidden');
        }
    }
}

// ========================================
// Menu Navigation
// ========================================

/**
 * Show menu screen, hide game screen
 */
function showMenu() {
    // Stop polling if in online mode
    if (gameState.gameMode === 'online' && gameState.pollController) {
        stopPolling(gameState.pollController);
    }
    
    // Hide all screens
    const gameScreen = document.getElementById('game-screen');
    const lobbyScreen = document.getElementById('lobby-screen');
    const waitingScreen = document.getElementById('waiting-screen');
    const onlineInfo = document.getElementById('online-info');
    
    if (gameScreen) gameScreen.classList.add('hidden');
    if (lobbyScreen) lobbyScreen.classList.add('hidden');
    if (waitingScreen) waitingScreen.classList.add('hidden');
    if (onlineInfo) onlineInfo.classList.add('hidden');
    
    // Show main menu
    const menuScreen = document.getElementById('menu-screen');
    if (menuScreen) {
        menuScreen.classList.remove('hidden');
    }
    
    // Reset online game state
    gameState.gameMode = null;
    gameState.onlineGameId = null;
    gameState.onlineGameCode = null;
    gameState.playerNumber = null;
    gameState.pollController = null;
    
    console.log('Returned to main menu');
}

/**
 * Start single player game
 */
function startSinglePlayer() {
    gameState.gameMode = 'single';
    
    // Hide menu, show game
    const menuScreen = document.getElementById('menu-screen');
    const gameScreen = document.getElementById('game-screen');
    if (menuScreen) menuScreen.classList.add('hidden');
    if (gameScreen) gameScreen.classList.remove('hidden');
    
    // Show New Game button for single player
    const btnNewGame = document.getElementById('btn-new-game');
    if (btnNewGame) {
        btnNewGame.style.display = 'inline-block';
    }
    
    initializeBoard();
    console.log('Starting single player game vs Computer');
}

/**
 * Start two player game
 */
function startTwoPlayer() {
    gameState.gameMode = 'multi';
    
    // Hide menu, show game
    const menuScreen = document.getElementById('menu-screen');
    const gameScreen = document.getElementById('game-screen');
    if (menuScreen) menuScreen.classList.add('hidden');
    if (gameScreen) gameScreen.classList.remove('hidden');
    
    // Show New Game button for local 2-player
    const btnNewGame = document.getElementById('btn-new-game');
    if (btnNewGame) {
        btnNewGame.style.display = 'inline-block';
    }
    
    initializeBoard();
    console.log('Starting two player game');
}

/**
 * Start a new game with current mode
 */
function newGame() {
    // Hide game over overlay if visible
    const gameOverOverlay = document.getElementById('game-over-overlay');
    if (gameOverOverlay) {
        gameOverOverlay.remove();
    }
    
    // For online mode, return to lobby instead of resetting
    if (gameState.gameMode === 'online') {
        console.log('Cannot reset online game - returning to lobby');
        showLobby();
        return;
    }
    
    // For local/AI modes, reset the board
    const currentMode = gameState.gameMode;
    const currentAiPlayer = gameState.aiPlayer;
    
    initializeBoard();
    
    // Restore game mode settings
    gameState.gameMode = currentMode;
    gameState.aiPlayer = currentAiPlayer;
    gameState.gameOver = false;
    gameState.winner = null;
    
    // Restart AI if it's AI's turn
    if (currentMode === 'single' && gameState.aiPlayer === 1) {
        setTimeout(handleAITurn, 500);
    }
    
    console.log('New game started');
}

/**
 * Show game over overlay
 */
function showGameOver() {
    // Determine winner text based on game mode
    let winnerText;
    if (gameState.gameMode === 'single') {
        winnerText = gameState.winner === 1 ? 'You Win!' : 'Computer Wins!';
    } else if (gameState.gameMode === 'online') {
        const isWinner = gameState.winner === gameState.playerNumber;
        winnerText = isWinner ? 'You Win!' : 'Opponent Wins!';
    } else {
        winnerText = gameState.winner === 1 ? 'Player 1 (White) Wins!' : 'Player 2 (Black) Wins!';
    }
    
    // Change "Play Again" text for online mode
    const playAgainText = gameState.gameMode === 'online' ? 'Return to Lobby' : 'Play Again';
    
    const overlay = document.createElement('div');
    overlay.id = 'game-over-overlay';
    overlay.className = 'game-over-overlay';
    overlay.innerHTML = `
        <h2>${winnerText}</h2>
        <p>King was captured!</p>
        <div class="game-over-buttons">
            <button id="btn-play-again" class="game-over-btn">${playAgainText}</button>
            <button id="btn-menu" class="game-over-btn">Back to Menu</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Add event listeners
    document.getElementById('btn-play-again').addEventListener('click', () => {
        overlay.remove();
        
        if (gameState.gameMode === 'online') {
            // For online mode, return to lobby
            document.getElementById('game-screen').classList.add('hidden');
            showLobby();
        } else {
            // For local/AI modes, start new game
            newGame();
        }
    });
    
    document.getElementById('btn-menu').addEventListener('click', () => {
        overlay.remove();
        showMenu();
    });
    
    console.log(`Game Over! Winner: Player ${gameState.winner}`);
}

// ========================================
// Online Multiplayer Functions (Guest Access)
// ========================================

/**
 * Start online game - immediately create and show shareable link
 */
async function startOnline() {
    console.log('Starting online game...');
    
    // Hide menu, show waiting screen immediately
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('waiting-screen').classList.remove('hidden');
    document.getElementById('waiting-screen').innerHTML = '<h2>Creating game...</h2>';
    
    // Initialize a fresh board
    initializeBoard();
    
    // Create initial board state
    const boardState = board.map(row => 
        row.map(p => p ? {
            type: p.type,
            player: p.player,
            symbol: p.symbol,
            hasMoved: p.hasMoved
        } : null)
    );
    
    // Create game in database
    const { data: game, error } = await createGame(boardState);
    
    if (error) {
        console.error('Error creating game:', error);
        alert('Failed to create game. Please try again.');
        showMenu();
        return;
    }
    
    console.log('Game created:', game);
    
    // Store game info
    gameState.onlineGameId = game.id;
    gameState.onlineGameCode = game.game_code;
    gameState.playerNumber = game.playerNumber;
    
    // Show waiting screen with shareable link
    showWaitingScreen(game.game_code);
    
    // Start polling for when opponent joins
    startWaitingForOpponent();
}

/**
 * Show waiting screen with shareable link
 */
function showWaitingScreen(gameCode) {
    const waitingScreen = document.getElementById('waiting-screen');
    const gameUrl = `${window.location.origin}/game/${gameCode}`;
    
    waitingScreen.innerHTML = `
        <div class="waiting-content">
            <h2>Waiting for Opponent...</h2>
            <div class="spinner-large">⏳</div>
            <p class="game-code">Game Code: <strong>${gameCode}</strong></p>
            <p class="share-text">Share this link with a friend:</p>
            
            <div class="share-url">
                <input type="text" id="game-url" value="${gameUrl}" readonly>
                <button id="btn-copy-url" class="btn-secondary">📋 Copy</button>
            </div>
            
            <button id="btn-cancel-waiting" class="btn-secondary">Cancel</button>
        </div>
    `;
    
    document.getElementById('btn-copy-url')?.addEventListener('click', () => {
        const urlInput = document.getElementById('game-url');
        urlInput.select();
        navigator.clipboard.writeText(gameUrl);
        alert('Link copied to clipboard!');
    });
    
    document.getElementById('btn-cancel-waiting')?.addEventListener('click', async () => {
        if (gameState.onlineGameId) {
            await abandonGame(gameState.onlineGameId);
        }
        waitingScreen.classList.add('hidden');
        showMenu();
    });
}

/**
 * Start waiting for opponent to join
 */
function startWaitingForOpponent() {
    const checkInterval = setInterval(async () => {
        if (!gameState.onlineGameId) {
            clearInterval(checkInterval);
            return;
        }
        
        const { data, error } = await loadGame(gameState.onlineGameId);
        
        if (error) {
            console.error('Error checking game status:', error);
            clearInterval(checkInterval);
            return;
        }
        
        const game = data.game;
        
        // Check if game became active (opponent joined)
        if (game.status === 'active') {
            clearInterval(checkInterval);
            console.log('Opponent joined! Starting game...');
            await startOnlineGame(game);
        }
    }, 2000); // Check every 2 seconds
}

/**
 * Show "Game Full" message
 */
function showGameFullMessage() {
    const waitingScreen = document.getElementById('waiting-screen');
    waitingScreen.classList.remove('hidden');
    waitingScreen.innerHTML = `
        <div class="waiting-content">
            <h2>❌ Game Full</h2>
            <p>This game already has 2 players.</p>
            <button id="btn-new-game-full" class="btn-primary">Create New Game</button>
            <button id="btn-menu-full" class="btn-secondary">Back to Menu</button>
        </div>
    `;
    
    document.getElementById('btn-new-game-full')?.addEventListener('click', () => {
        startOnline();
    });
    
    document.getElementById('btn-menu-full')?.addEventListener('click', () => {
        waitingScreen.classList.add('hidden');
        showMenu();
    });
}

/**
 * Handle joining a game by code
 */
async function handleJoinGame(gameCode) {
    if (!gameCode) {
        gameCode = document.getElementById('game-code-input')?.value;
    }
    
    if (!gameCode || gameCode.length !== 6) {
        alert('Please enter a valid 6-character game code');
        return;
    }
    
    console.log('Attempting to join game:', gameCode);
    
    // Show loading
    document.getElementById('menu-screen')?.classList.add('hidden');
    document.getElementById('waiting-screen').classList.remove('hidden');
    document.getElementById('waiting-screen').innerHTML = '<h2>Joining game...</h2>';
    
    const { data: game, error } = await joinGame(gameCode);
    
    if (error) {
        console.error('Error joining game:', error);
        if (error.message === 'Game is full') {
            showGameFullMessage();
        } else {
            alert(error.message || 'Could not join game');
            showMenu();
        }
        return;
    }
    
    console.log('Joined game:', game);
    
    // Store game info
    gameState.onlineGameId = game.id;
    gameState.onlineGameCode = game.game_code;
    gameState.playerNumber = game.playerNumber;
    
    // Start the game
    await startOnlineGame(game);
}

/**
 * Start online game
 */
async function startOnlineGame(game) {
    console.log('Starting online game:', game);
    
    // Hide lobby/waiting screens
    document.getElementById('lobby-screen')?.classList.add('hidden');
    document.getElementById('waiting-screen').classList.add('hidden');
    
    // Set game mode
    gameState.gameMode = 'online';
    
    // Hide "New Game" button in online mode
    const btnNewGame = document.getElementById('btn-new-game');
    if (btnNewGame) {
        btnNewGame.style.display = 'none';
    }
    
    // Load board state from database
    loadBoardFromState(game.board_state);
    gameState.currentTurn = game.current_turn;
    
    // Show online info (simplified - no usernames)
    document.getElementById('online-info').classList.remove('hidden');
    document.getElementById('current-game-code').textContent = game.game_code;
    document.getElementById('player1-name').textContent = 'Player 1';
    document.getElementById('player2-name').textContent = 'Player 2';
    
    // Update board and show game screen
    updateAttackRanges();
    renderBoard();
    updateTurnIndicator();
    
    document.getElementById('game-screen').classList.remove('hidden');
    
    // Start polling for moves
    startPolling();
    
    // Start connection heartbeat
    startHeartbeat();
}

/**
 * Load board from saved state
 */
function loadBoardFromState(boardState) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const pieceData = boardState[row][col];
            if (pieceData) {
                board[row][col] = {
                    type: pieceData.type,
                    player: pieceData.player,
                    symbol: pieceData.symbol,
                    position: { row, col },
                    hasMoved: pieceData.hasMoved || false
                };
            } else {
                board[row][col] = null;
            }
        }
    }
}

/**
 * Start polling for game updates
 */
function startPolling() {
    if (gameState.pollController) {
        stopPolling(gameState.pollController);
    }
    
    gameState.pollController = pollGameUpdates(
        gameState.onlineGameId,
        handleGameUpdate,
        handleMoveReceived,
        2000 // Poll every 2 seconds
    );
}

/**
 * Handle game update from polling
 */
function handleGameUpdate(game) {
    console.log('Game updated from polling:', game);
    
    // Sync turn from database
    const oldTurn = gameState.currentTurn;
    gameState.currentTurn = game.current_turn;
    
    if (oldTurn !== gameState.currentTurn) {
        console.log(`Turn changed: ${oldTurn} -> ${gameState.currentTurn}`);
        updateTurnIndicator();
    }
    
    if (game.status === 'completed') {
        // Game ended
        gameState.gameOver = true;
        if (game.winning_player) {
            gameState.winner = game.winning_player;
        }
        
        if (gameState.pollController) {
            stopPolling(gameState.pollController);
        }
        
        showGameOver();
    }
}

/**
 * Handle move received from opponent
 */
function handleMoveReceived(move) {
    console.log('Move received:', move);
    
    // Check if this move is from opponent
    if (move.player_number === gameState.playerNumber) {
        // This is my own move, ignore
        return;
    }
    
    // Apply the move to the board
    const piece = board[move.from_row][move.from_col];
    if (piece) {
        const capturedPiece = board[move.to_row][move.to_col];
        
        // Check if king was captured
        if (capturedPiece && capturedPiece.type === 'king') {
            gameState.gameOver = true;
            gameState.winner = piece.player;
        }
        
        board[move.to_row][move.to_col] = piece;
        board[move.from_row][move.from_col] = null;
        piece.position = { row: move.to_row, col: move.to_col };
        piece.hasMoved = true;
        
        console.log('Opponent move applied. Now refreshing game state from database...');
        
        // Refresh game state from database to sync turn
        refreshGameState();
    }
}

/**
 * Refresh game state from database
 */
async function refreshGameState() {
    if (!gameState.onlineGameId) return;
    
    const { data: gameData } = await loadGame(gameState.onlineGameId);
    if (gameData && gameData.game) {
        gameState.currentTurn = gameData.game.current_turn;
        
        // Check if game ended
        if (gameData.game.status === 'completed') {
            gameState.gameOver = true;
            if (gameData.game.winning_player) {
                gameState.winner = gameData.game.winning_player;
            }
        }
        
        console.log('Game state refreshed. Current turn:', gameState.currentTurn);
        
        // Update display
        updateAttackRanges();
        renderBoard();
        updateTurnIndicator();
        
        // Check if game over
        if (gameState.gameOver) {
            showGameOver();
        }
    }
}

/**
 * Start connection heartbeat (updates every 10 seconds)
 */
function startHeartbeat() {
    // Clear any existing heartbeat
    stopHeartbeat();
    
    // Update immediately
    updatePlayerActivity();
    
    // Then update every 10 seconds
    gameState.heartbeatInterval = setInterval(async () => {
        await updatePlayerActivity();
        await checkOpponentConnection();
    }, 10000);
    
    console.log('Heartbeat started');
}

/**
 * Stop connection heartbeat
 */
function stopHeartbeat() {
    if (gameState.heartbeatInterval) {
        clearInterval(gameState.heartbeatInterval);
        gameState.heartbeatInterval = null;
        console.log('Heartbeat stopped');
    }
}

/**
 * Update this player's activity timestamp
 */
async function updatePlayerActivity() {
    if (!gameState.onlineGameId || !gameState.playerNumber) return;
    
    const { error } = await updateActivity(gameState.onlineGameId, gameState.playerNumber);
    
    if (error) {
        console.error('Error updating activity:', error);
    }
}

/**
 * Check if opponent is still connected
 */
async function checkOpponentConnection() {
    if (!gameState.onlineGameId) return;
    
    const { data: gameData } = await loadGame(gameState.onlineGameId);
    if (!gameData || !gameData.game) return;
    
    const game = gameData.game;
    const opponentField = gameState.playerNumber === 1 ? 'player2' : 'player1';
    const opponentLastActive = game[`${opponentField}_last_active`];
    
    if (!opponentLastActive) {
        gameState.opponentConnected = false;
        updateOpponentStatus('disconnected');
        return;
    }
    
    const lastActiveTime = new Date(opponentLastActive);
    const now = new Date();
    const secondsSinceActive = (now - lastActiveTime) / 1000;
    
    const wasConnected = gameState.opponentConnected;
    gameState.opponentConnected = secondsSinceActive < 60;
    
    // Log status changes
    if (wasConnected && !gameState.opponentConnected) {
        console.log('Opponent disconnected');
        updateOpponentStatus('disconnected');
    } else if (!wasConnected && gameState.opponentConnected) {
        console.log('Opponent reconnected');
        updateOpponentStatus('connected');
    }
}

/**
 * Update opponent connection status indicator
 */
function updateOpponentStatus(status) {
    const opponentStatusId = gameState.playerNumber === 1 ? 'player2-status' : 'player1-status';
    const statusElement = document.getElementById(opponentStatusId);
    
    if (statusElement) {
        if (status === 'connected') {
            statusElement.textContent = '●';
            statusElement.style.color = '#4caf50';
            statusElement.title = 'Connected';
        } else {
            statusElement.textContent = '○';
            statusElement.style.color = '#999';
            statusElement.title = 'Disconnected';
        }
    }
}

/**
 * Copy game URL to clipboard (deprecated, kept for compatibility)
 */
function copyGameUrl() {
    const urlInput = document.getElementById('game-url');
    urlInput.select();
    document.execCommand('copy');
    alert('Game link copied to clipboard!');
}

// ========================================
// Initialization
// ========================================

// Initialize the game when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Perfect Chess - Phase 8 (Guest Mode) initialized');
    
    // Check URL for game code (auto-join feature)
    const urlPath = window.location.pathname;
    const gameCodeMatch = urlPath.match(/\/game\/([A-Z0-9]{6})/i);
    
    if (gameCodeMatch) {
        const gameCode = gameCodeMatch[1].toUpperCase();
        console.log(`Auto-joining game from URL: ${gameCode}`);
        setTimeout(() => handleJoinGame(gameCode), 500);
        return; // Don't show menu, go straight to joining
    }
    
    // Menu buttons
    document.getElementById('btn-single-player')?.addEventListener('click', startSinglePlayer);
    document.getElementById('btn-two-player')?.addEventListener('click', startTwoPlayer);
    document.getElementById('btn-play-online')?.addEventListener('click', startOnline);
    document.getElementById('btn-back-to-menu')?.addEventListener('click', showMenu);
    document.getElementById('btn-new-game')?.addEventListener('click', newGame);
    
    // Show menu
    console.log('Menu ready - Choose game mode');
    showMenu();
});

