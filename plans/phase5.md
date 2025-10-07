# Phase 5 Implementation Plan: Simple Computer Opponent & Game Mode Selection

## Objective
Add a simple computer opponent with basic AI and implement game mode selection, allowing players to choose between 1-player (vs Computer) or 2-player (local multiplayer) modes.

## Philosophy
Build a lightweight AI using existing move generation code. The AI will make sensible moves by evaluating captures and basic position, without external dependencies or complex algorithms.

## Core Features

### 1. Game Mode Selection UI

**Main Menu Screen**
- Display before game starts
- Two prominent buttons:
  - "Play vs Computer" (1-player mode)
  - "Play vs Friend" (2-player mode)
- "Back" button to return from game to menu
- No difficulty selection (single AI level)

### 2. Simple Computer Opponent AI

**AI Architecture**
```javascript
const AI = {
    thinkingTime: 800,    // ms delay for realism
    
    // Main entry point
    makeMove(board, player) {
        // Returns {from: {row, col}, to: {row, col}}
    }
};
```

**AI Strategy (Single Difficulty)**
The AI will make reasonable moves by:
- **Capturing pieces** when available (prioritize high-value pieces)
- **Controlling the center** (e4, e5, d4, d5)
- **Developing pieces** early game
- **Adding randomness** to avoid being completely predictable

**No external dependencies** - built entirely on existing move generation code!

### 3. Game State Management

**Enhanced gameState**
```javascript
const gameState = {
    // Existing fields...
    gameMode: 'menu',  // 'menu', 'single', 'multi'
    aiPlayer: 2,       // AI always plays as Player 2 (Black)
    aiThinking: false, // true when AI is calculating
    selectedPiece: null,
    currentTurn: 1,
    // ... rest of fields
};
```

### 4. AI Move Calculation Functions

**`getAllLegalMovesForPlayer(player)`**
- Iterate through all pieces of player
- Get legal moves for each piece
- Return array of {piece: {row, col}, move: {row, col}}

**`evaluateMove(move, player)`**
- Score a single move based on:
  - Capture value (if capturing a piece)
  - Center control bonus
  - Piece development bonus
  - Small random factor
- Return numeric score (higher = better move)

**Piece Values**
```javascript
const PIECE_VALUES = {
    pawn: 100,
    knight: 320,
    bishop: 330,
    rook: 500,
    queen: 900,
    king: 20000
};
```

**Move Evaluation Factors**
1. **Capture Score**: Value of captured piece (if any)
2. **Center Control**: Bonus if move goes to d4, d5, e4, e5 (+30 points)
3. **Development**: Bonus for moving piece off back rank early game (+20 points)
4. **Randomness**: Small random value (0-10 points) for unpredictability

**`getComputerMove(player)`**
- Get all legal moves for AI player
- Evaluate each move using `evaluateMove()`
- Return move with highest score
- This is the only AI function needed!

### 5. AI Turn Logic

**`handleAITurn()`**
```javascript
async function handleAITurn() {
    if (gameState.aiThinking || gameState.gameOver) return;
    
    // Visual feedback
    gameState.aiThinking = true;
    updateTurnIndicator(); // Show "Computer is thinking..."
    
    // Artificial delay for better UX (makes it feel more human)
    await delay(800);
    
    // Get best move
    const move = getComputerMove(gameState.currentTurn);
    
    // Execute move
    if (move) {
        movePiece(move.from.row, move.from.col, move.to.row, move.to.col);
    }
    
    gameState.aiThinking = false;
}
```

**Simple delay helper**
```javascript
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 6. Game Flow Integration

**Modified Move Function**
```javascript
function movePiece(fromRow, fromCol, toRow, toCol) {
    // ... existing move logic ...
    
    // After move completes
    updateAttackRanges();
    renderBoard();
    updateTurnIndicator();
    
    // Check if next turn is AI
    if (gameState.gameMode === 'single' && 
        gameState.currentTurn === gameState.aiPlayer) {
        setTimeout(handleAITurn, 100); // Small delay
    }
}
```

**Disable Human Input During AI Turn**
```javascript
function handleTileClick(row, col) {
    // Don't allow input if AI is thinking
    if (gameState.aiThinking) return;
    
    // Don't allow input if it's AI's turn in single player mode
    if (gameState.gameMode === 'single' && 
        gameState.currentTurn === gameState.aiPlayer) {
        return;
    }
    
    // ... existing click logic ...
}
```

## UI Components

### 1. Menu Screen HTML

```html
<div id="menu-screen" class="menu-screen">
    <h1>Perfect Chess</h1>
    <p class="subtitle">Enhanced Chess with Attack Visualization</p>
    
    <div class="menu-buttons">
        <button id="btn-single-player" class="menu-btn">
            <span class="btn-icon">🤖</span>
            <span class="btn-text">Play vs Computer</span>
        </button>
        
        <button id="btn-two-player" class="menu-btn">
            <span class="btn-icon">👥</span>
            <span class="btn-text">Play vs Friend</span>
        </button>
    </div>
    
</div>

<div id="game-screen" class="game-screen hidden">
    <!-- Existing game board UI -->
    <button id="btn-back-to-menu" class="back-button">← Back to Menu</button>
</div>
```

### 2. AI Thinking Indicator

**In Turn Indicator**
```html
<div id="turn-indicator" class="turn-indicator player2">
    <span id="turn-text">Player 2's Turn (Black)</span>
    <span id="ai-thinking" class="ai-thinking hidden">
        <span class="thinking-dots">Thinking</span>
        <span class="spinner">⏳</span>
    </span>
</div>
```

### 3. Game Controls

**In-Game Options**
```html
<div class="game-controls">
    <button id="btn-new-game">New Game</button>
    <button id="btn-back-to-menu">Back to Menu</button>
</div>
```

## CSS Additions

```css
/* Menu Screen */
.menu-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 80vh;
    padding: 40px;
}

.menu-screen h1 {
    font-size: 3em;
    margin-bottom: 10px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.menu-buttons {
    display: flex;
    gap: 30px;
    margin: 40px 0;
}

.menu-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 30px 40px;
    font-size: 1.2em;
    background: white;
    border: 3px solid #667eea;
    border-radius: 15px;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 200px;
}

.menu-btn:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.btn-icon {
    font-size: 3em;
    margin-bottom: 15px;
}

/* AI Thinking Indicator */
.ai-thinking {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-left: 15px;
    font-style: italic;
    color: #666;
}

.thinking-dots::after {
    content: '...';
    animation: thinkingDots 1.5s infinite;
}

@keyframes thinkingDots {
    0%, 20% { content: '.'; }
    40% { content: '..'; }
    60%, 100% { content: '...'; }
}

.spinner {
    animation: spin 2s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

/* Game Controls */
.game-controls {
    display: flex;
    gap: 15px;
    justify-content: center;
    margin-top: 20px;
}

.game-controls button {
    padding: 10px 20px;
    font-size: 1em;
    border: 2px solid #667eea;
    background: white;
    color: #667eea;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.game-controls button:hover {
    background: #667eea;
    color: white;
}

/* Hidden state */
.hidden {
    display: none !important;
}

/* Disable interactions during AI turn */
.board-disabled {
    pointer-events: none;
    opacity: 0.7;
}
```

## Implementation Strategy

### Step 1: Menu System (20 minutes)
- Create menu screen UI
- Add game mode buttons (vs Computer, vs Friend)
- Implement navigation between menu and game
- Test mode switching

### Step 2: Move Generation Helper (15 minutes)
- Implement `getAllLegalMovesForPlayer()`
- Returns array of all possible moves for a player
- Test that it finds all legal moves correctly

### Step 3: Simple AI Evaluation (30 minutes)
- Implement `evaluateMove()` function
- Add capture scoring (piece values)
- Add center control bonus
- Add development bonus
- Add small randomness factor
- Implement `getComputerMove()` (picks best move)

### Step 4: AI Integration (20 minutes)
- Implement `handleAITurn()` with delay
- Integrate AI into game flow (after human moves)
- Disable human input during AI turn
- Add thinking indicator

### Step 5: Testing & Polish (15 minutes)
- Test AI makes legal moves
- Test AI captures pieces when possible
- Test game flow (menu → game → AI turn → human turn)
- Add game controls (new game, back to menu)

**Total Time: ~90 minutes**

## AI Evaluation Implementation

### Complete AI Code Example

```javascript
// Piece values for evaluation
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

/**
 * Get all legal moves for a player
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
                        piece: piece
                    });
                }
            }
        }
    }
    
    return moves;
}

/**
 * Evaluate a single move
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
 */
function getComputerMove(player) {
    const allMoves = getAllLegalMovesForPlayer(player);
    
    if (allMoves.length === 0) {
        return null; // No legal moves (stalemate/checkmate)
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
```

That's it! Just ~80 lines for a working AI.

## Testing Scenarios

### Menu & Mode Selection
- ✓ Menu displays on initial load
- ✓ Single player button starts game vs computer
- ✓ Two player button starts multiplayer game
- ✓ Back button returns to menu
- ✓ New game button restarts game

### Simple AI
- ✓ AI makes legal moves consistently
- ✓ AI captures pieces when available
- ✓ AI prioritizes high-value captures (queen > pawn)
- ✓ AI moves toward center
- ✓ AI develops pieces early game
- ✓ AI is unpredictable (has randomness)
- ✓ Thinking indicator shows during AI turn
- ✓ Performance is instant (< 100ms per move)

### Game Flow
- ✓ Human can't move during AI turn
- ✓ AI automatically moves after human
- ✓ Turn indicator updates correctly
- ✓ Game ends properly (checkmate, stalemate)
- ✓ Can start new game or return to menu

## Success Criteria

Phase 5 is complete when:
1. Menu system allows choosing 1-player or 2-player mode
2. Computer makes legal moves every turn (no illegal moves)
3. Computer captures pieces when available
4. Computer shows basic strategy (center control, development)
5. AI thinking indicator provides visual feedback
6. Human input is disabled during AI turn
7. Game flow seamlessly integrates AI turns
8. Can return to menu and start new games
9. Computer is beatable but challenging for casual players
10. No external dependencies or libraries needed

## Future Enhancements (Beyond Phase 5)

### AI Improvements (If Needed)
- Add difficulty levels (Easy = more random, Hard = less random)
- Consider piece protection (don't capture if it loses material)
- Add simple one-move lookahead (what will opponent do next?)
- Opening book for first few moves
- Better endgame evaluation

### UX Improvements
- Show AI's "thinking" with progress indicator
- Adjustable AI thinking time (faster/slower)
- Move hints/suggestions for human player
- Undo move feature

### Multiplayer
- Online multiplayer
- Game lobby system
- Matchmaking by skill level
- Chat between players

### Game Modes
- Timed games (chess clock)
- Puzzle mode (solve chess puzzles)
- Training mode (practice specific scenarios)
- Tournament mode (play series of games)

## Performance Considerations

- Simple evaluation is very fast (~1ms for typical position)
- No need for web workers (AI is synchronous)
- Artificial delay (800ms) makes it feel more natural
- Scales well even with full chess board (32 pieces)

## File Structure After Phase 5
```
/PerfectChess
  /plans
    - phase1.md
    - phase2.md
    - phase3.md
    - phase4.md
    - phase5.md (this file)
  - index.html
  - styles.css
  - game.js
  - ai.js (optional: separate AI logic)
  - README.md
```

## Notes

- Simple AI is good enough for casual play
- Easy to understand and modify
- No external dependencies = smaller download, faster load
- Can always add complexity later if needed
- Player always plays as White (Player 1) in single-player mode
- Computer always plays as Black (Player 2)
- AI is deterministic with small random factor for variety

