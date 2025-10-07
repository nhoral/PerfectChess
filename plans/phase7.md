# Phase 7 Implementation Plan: Bug Fixes & Polish

## Objective
Address critical bugs and missing features to create a fully polished, production-ready chess game experience.

## Philosophy
Fix fundamental gameplay issues, complete missing chess rules, and ensure all UI controls work correctly across all game modes (local, AI, and online).

---

## Issues to Address

### 🎨 Issue 1: Defense Visualization
**Current Behavior:**
- Only squares that pieces can attack/move to are colored
- Friendly pieces that can be defended don't show defensive coverage

**Expected Behavior:**
- Blue overlay should show all squares White can control (attack OR defend)
- Red overlay should show all squares Black can control (attack OR defend)
- This includes squares occupied by friendly pieces that are "defended"
- Provides better strategic visualization of piece protection

**Impact:** Medium-High
- Important for strategic gameplay
- Helps players see which pieces are defended
- Core feature of "Perfect Chess" visualization

**Implementation Strategy:**
1. Modify `getAttackingSquares()` function to include friendly pieces
2. When calculating attack ranges, don't exclude friendly-occupied squares
3. Keep the distinction: blocked pieces (rook/bishop/queen) still can't attack through pieces
4. Knights and Kings always attack all their squares regardless of occupation

**Code Location:** `game.js` - `getAttackingSquares()` function

---

### ♜ Issue 2: Castling Not Implemented
**Current Behavior:**
- Castling move is completely missing
- Kings and rooks can move normally but special castling rule doesn't exist

**Expected Behavior:**
- King can castle kingside (short castle) or queenside (long castle)
- Requirements for castling:
  - King has never moved
  - Chosen rook has never moved
  - No pieces between king and rook
  - King is not in check
  - King doesn't move through check
  - King doesn't end in check

**Castling Rules:**
- **Kingside (Short):** King moves 2 squares toward kingside rook, rook jumps to other side
  - White: King e1→g1, Rook h1→f1
  - Black: King e8→g8, Rook h8→f8
- **Queenside (Long):** King moves 2 squares toward queenside rook, rook jumps to other side
  - White: King e1→c1, Rook a1→d1
  - Black: King e8→c8, Rook a8→d8

**Impact:** High
- Fundamental chess rule
- Important strategic move
- Expected by any chess player

**Implementation Strategy:**
1. Add `getCastlingMoves(piece)` function
2. Check all castling requirements
3. Add castling moves to legal moves when king is selected
4. When castling move is executed, move both king and rook
5. Set `hasMoved = true` for both pieces
6. Update move history notation (e.g., "O-O" for kingside, "O-O-O" for queenside)

**Code Location:** `game.js` - Add new function, integrate with `getLegalMoves()`

---

### 🔄 Issue 3: New Game Button Doesn't Reset Online Games
**Current Behavior:**
- "New Game" button during match only resets local game state
- In online mode, doesn't sync reset with opponent
- Opponent still sees old board state

**Expected Behavior:**
- In **Local/AI modes:** Reset immediately (current behavior is fine)
- In **Online mode:** 
  - Show confirmation dialog: "Start new game? This will reset the board for both players."
  - If confirmed, create a new game in database
  - Both players' boards reset and sync
  - Alternative: Disable "New Game" button during online matches (redirect to "Back to Menu" instead)

**Impact:** Medium
- Can cause desynced game states in online mode
- Confusing user experience

**Implementation Strategy:**
**Option A: Disable New Game in Online Mode**
```javascript
if (gameState.gameMode === 'online') {
    document.getElementById('btn-new-game').style.display = 'none';
}
```

**Option B: Implement Online Game Reset**
1. Add `resetOnlineGame(gameId)` function in `online-game.js`
2. Reset `board_state` in database
3. Reset `current_turn` to 1
4. Keep same `game_id` and players
5. Increment a `game_number` field to track restarts
6. Poll/sync picks up the reset automatically

**Recommendation:** Option A (simpler, cleaner UX)
- Players can "Back to Menu" and create a new game
- Avoids complexity of mid-game resets
- Clearer user intent

**Code Location:** `game.js` - `startOnlineGame()` and UI initialization

---

### 🏁 Issue 4: Game Over Buttons Don't Work
**Current Behavior:**
- After game ends, "Play Again" and "Back to Menu" buttons appear
- Clicking them does nothing
- Players are stuck on game over screen

**Expected Behavior:**
- **Play Again:**
  - Local/AI mode: Reset board and start new game with same mode
  - Online mode: Return to lobby (can't restart same online game)
- **Back to Menu:**
  - All modes: Hide game screen, show main menu
  - Online mode: Stop polling, disconnect from game

**Impact:** High
- Blocks users from continuing to play
- Core navigation issue

**Implementation Strategy:**
1. Locate game over overlay buttons (likely in `index.html`)
2. Add event listeners in `game.js` initialization
3. Implement handlers:

```javascript
// Play Again
function handlePlayAgain() {
    const gameOver = document.getElementById('game-over');
    gameOver.classList.add('hidden');
    
    if (gameState.gameMode === 'online') {
        // Return to lobby
        showLobby();
    } else {
        // Reset and restart with same mode
        initializeBoard();
        gameState.gameOver = false;
        gameState.winner = null;
        gameState.currentTurn = 1;
        updateAttackRanges();
        renderBoard();
        updateTurnIndicator();
    }
}

// Back to Menu
function handleBackToMenu() {
    const gameOver = document.getElementById('game-over');
    gameOver.classList.add('hidden');
    
    // Stop online game if active
    if (gameState.gameMode === 'online' && gameState.pollController) {
        stopPolling(gameState.pollController);
    }
    
    // Show main menu
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    
    // Reset game state
    gameState.gameMode = null;
    gameState.onlineGameId = null;
}
```

**Code Location:** 
- `index.html` - Find game over buttons
- `game.js` - Add event listeners in `DOMContentLoaded`

---

## Implementation Order

### Priority 1: Critical Functionality (Do First)
1. ✅ **Issue 4: Fix Game Over Buttons** (30 min)
   - Blocking users from continuing
   - Simple fix, high impact

2. ✅ **Issue 3: Handle New Game in Online Mode** (20 min)
   - Simple solution: Hide button in online mode
   - Prevents desynced states

### Priority 2: Core Chess Rules (Do Second)
3. ✅ **Issue 2: Implement Castling** (90 min)
   - Fundamental chess rule
   - More complex, requires thorough testing

### Priority 3: Visual Enhancement (Do Last)
4. ✅ **Issue 1: Defense Visualization** (45 min)
   - Nice to have, enhances strategy
   - May require tuning for visual clarity

**Total Estimated Time: ~3 hours**

---

## Testing Scenarios

### Castling Tests
- ✓ Can castle kingside when conditions met
- ✓ Can castle queenside when conditions met
- ✓ Cannot castle if king has moved
- ✓ Cannot castle if rook has moved
- ✓ Cannot castle if pieces are in the way
- ✓ Cannot castle out of check
- ✓ Cannot castle through check
- ✓ Cannot castle into check
- ✓ Both white and black can castle
- ✓ Castling works in all game modes (local, AI, online)
- ✓ Castling syncs correctly in online games

### Defense Visualization Tests
- ✓ Friendly pieces show defensive coverage
- ✓ Defended pieces have colored overlay
- ✓ Long-range pieces (rook/bishop/queen) don't defend through pieces
- ✓ Knights and kings defend all adjacent squares
- ✓ Purple overlay shows contested defended pieces
- ✓ Visualization updates correctly after moves

### Game Over Button Tests
- ✓ "Play Again" resets game in local mode
- ✓ "Play Again" resets game in AI mode
- ✓ "Play Again" returns to lobby in online mode
- ✓ "Back to Menu" shows main menu from all modes
- ✓ Online polling stops when returning to menu
- ✓ Game state resets correctly

### New Game Button Tests
- ✓ "New Game" works in local mode
- ✓ "New Game" works in AI mode
- ✓ "New Game" is hidden in online mode
- ✓ Button visibility updates when switching modes

---

## Code Examples

### 1. Defense Visualization Fix

**Current Code (Simplified):**
```javascript
function getAttackingSquares(piece) {
    const squares = [];
    // Get all squares piece can move to
    const moves = getLegalMoves(piece);
    moves.forEach(move => {
        squares.push(move);
    });
    return squares;
}
```

**Fixed Code:**
```javascript
function getAttackingSquares(piece) {
    const squares = [];
    
    if (piece.type === 'pawn') {
        // Pawns attack diagonally (including defending friendly pieces)
        const direction = piece.player === 1 ? -1 : 1;
        const attackSquares = [
            { row: piece.position.row + direction, col: piece.position.col - 1 },
            { row: piece.position.row + direction, col: piece.position.col + 1 }
        ];
        attackSquares.forEach(sq => {
            if (isInBounds(sq.row, sq.col)) {
                squares.push(sq);
            }
        });
    } else if (piece.type === 'knight' || piece.type === 'king') {
        // Knights and kings attack all their squares (including friendly)
        const moves = getAllPossibleMoves(piece); // Don't filter friendly
        moves.forEach(move => squares.push(move));
    } else {
        // Rooks, bishops, queens attack in lines until blocked
        const directions = getDirectionsForPiece(piece);
        directions.forEach(dir => {
            let row = piece.position.row + dir.rowDelta;
            let col = piece.position.col + dir.colDelta;
            
            while (isInBounds(row, col)) {
                squares.push({ row, col });
                
                // Stop if we hit any piece (friendly or enemy)
                if (board[row][col]) break;
                
                row += dir.rowDelta;
                col += dir.colDelta;
            }
        });
    }
    
    return squares;
}
```

### 2. Castling Implementation

```javascript
/**
 * Get castling moves for a king
 * @param {Object} piece - King piece
 * @returns {Array} Array of castling moves
 */
function getCastlingMoves(piece) {
    if (piece.type !== 'king' || piece.hasMoved) {
        return [];
    }
    
    const moves = [];
    const row = piece.position.row;
    const kingCol = piece.position.col;
    
    // Check if king is in check (can't castle out of check)
    if (isSquareUnderAttack(row, kingCol, piece.player)) {
        return moves;
    }
    
    // Kingside castling (short castle)
    const kingsideRook = board[row][7];
    if (kingsideRook && 
        kingsideRook.type === 'rook' && 
        kingsideRook.player === piece.player && 
        !kingsideRook.hasMoved) {
        
        // Check if squares between are empty
        if (!board[row][5] && !board[row][6]) {
            // Check if king doesn't move through or into check
            if (!isSquareUnderAttack(row, 5, piece.player) && 
                !isSquareUnderAttack(row, 6, piece.player)) {
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
    
    // Queenside castling (long castle)
    const queensideRook = board[row][0];
    if (queensideRook && 
        queensideRook.type === 'rook' && 
        queensideRook.player === piece.player && 
        !queensideRook.hasMoved) {
        
        // Check if squares between are empty
        if (!board[row][1] && !board[row][2] && !board[row][3]) {
            // Check if king doesn't move through or into check
            if (!isSquareUnderAttack(row, 2, piece.player) && 
                !isSquareUnderAttack(row, 3, piece.player)) {
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
 * Check if a square is under attack by opponent
 * @param {number} row 
 * @param {number} col 
 * @param {number} player - Player to check (1 or 2)
 * @returns {boolean}
 */
function isSquareUnderAttack(row, col, player) {
    const opponent = player === 1 ? 2 : 1;
    
    // Check all opponent pieces
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.player === opponent) {
                const attackSquares = getAttackingSquares(piece);
                if (attackSquares.some(sq => sq.row === row && sq.col === col)) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

/**
 * Execute castling move
 * @param {Object} piece - King
 * @param {number} toRow 
 * @param {number} toCol 
 * @param {Object} castlingData 
 */
function executeCastling(piece, toRow, toCol, castlingData) {
    const { rookFromCol, rookToCol } = castlingData;
    const row = toRow;
    
    // Move king
    board[toRow][toCol] = piece;
    board[piece.position.row][piece.position.col] = null;
    piece.position = { row: toRow, col: toCol };
    piece.hasMoved = true;
    
    // Move rook
    const rook = board[row][rookFromCol];
    board[row][rookToCol] = rook;
    board[row][rookFromCol] = null;
    rook.position = { row, col: rookToCol };
    rook.hasMoved = true;
    
    // Record move
    const notation = (toCol === 6) ? "O-O" : "O-O-O"; // Kingside or Queenside
    gameState.moveHistory.push({
        piece: piece.type,
        from: coordsToNotation(piece.position.row, piece.position.col),
        to: coordsToNotation(toRow, toCol),
        notation,
        isCastling: true
    });
}
```

**Integration into `movePiece()`:**
```javascript
function movePiece(piece, toRow, toCol, moveData = null) {
    const fromRow = piece.position.row;
    const fromCol = piece.position.col;
    
    // Check if this is a castling move
    if (moveData && moveData.isCastling) {
        executeCastling(piece, toRow, toCol, moveData);
    } else {
        // Regular move logic...
        const capturedPiece = board[toRow][toCol];
        
        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = null;
        piece.position = { row: toRow, col: toCol };
        piece.hasMoved = true;
        
        // ... rest of move logic
    }
    
    // ... rest of function
}
```

**Update `getLegalMoves()` to include castling:**
```javascript
function getLegalMoves(piece) {
    let moves = [];
    
    // Get standard moves
    moves = getMovesForPiece(piece);
    
    // Add castling moves if piece is king
    if (piece.type === 'king') {
        const castlingMoves = getCastlingMoves(piece);
        moves = moves.concat(castlingMoves);
    }
    
    return moves;
}
```

### 3. Game Over Buttons Fix

**In `index.html`, locate:**
```html
<div id="game-over" class="game-over-overlay hidden">
    <div class="game-over-content">
        <h2 id="winner-text">Player 1 Wins!</h2>
        <div class="game-over-buttons">
            <button id="btn-play-again" class="btn-primary">Play Again</button>
            <button id="btn-back-to-menu" class="btn-secondary">Back to Menu</button>
        </div>
    </div>
</div>
```

**In `game.js`, add to DOMContentLoaded:**
```javascript
document.addEventListener('DOMContentLoaded', () => {
    // ... existing code ...
    
    // Game over buttons
    const btnPlayAgain = document.getElementById('btn-play-again');
    const btnBackToMenu = document.getElementById('btn-back-to-menu');
    
    if (btnPlayAgain) {
        btnPlayAgain.addEventListener('click', handlePlayAgain);
    }
    
    if (btnBackToMenu) {
        btnBackToMenu.addEventListener('click', handleBackToMenuFromGame);
    }
    
    // ... rest of initialization
});

function handlePlayAgain() {
    hideGameOver();
    
    if (gameState.gameMode === 'online') {
        // Return to lobby for online games
        document.getElementById('game-screen').classList.add('hidden');
        showLobby();
    } else {
        // Reset and restart for local/AI games
        const currentMode = gameState.gameMode;
        initializeBoard();
        gameState.gameOver = false;
        gameState.winner = null;
        gameState.currentTurn = 1;
        gameState.selectedPiece = null;
        gameState.moveHistory = [];
        gameState.gameMode = currentMode; // Restore mode
        
        updateAttackRanges();
        renderBoard();
        updateTurnIndicator();
        
        // Restart AI if needed
        if (currentMode === 'single' && gameState.aiPlayer === 1) {
            setTimeout(handleAITurn, 500);
        }
    }
}

function handleBackToMenuFromGame() {
    hideGameOver();
    
    // Stop polling if in online mode
    if (gameState.gameMode === 'online' && gameState.pollController) {
        stopPolling(gameState.pollController);
    }
    
    // Hide all screens
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('waiting-screen').classList.add('hidden');
    document.getElementById('online-info').classList.add('hidden');
    
    // Show main menu
    document.getElementById('main-menu').classList.remove('hidden');
    
    // Reset game state
    gameState.gameMode = null;
    gameState.onlineGameId = null;
    gameState.onlineGameCode = null;
    gameState.playerNumber = null;
}

function hideGameOver() {
    const gameOver = document.getElementById('game-over');
    if (gameOver) {
        gameOver.classList.add('hidden');
    }
}
```

### 4. Hide New Game in Online Mode

**In `startOnlineGame()` function:**
```javascript
function startOnlineGame(game) {
    console.log('Starting online game:', game);
    
    // ... existing setup code ...
    
    // Hide "New Game" button in online mode
    const btnNewGame = document.getElementById('btn-new-game');
    if (btnNewGame) {
        btnNewGame.style.display = 'none';
    }
    
    // ... rest of function
}
```

**In `startLocalGame()` and `startSinglePlayer()`, show it:**
```javascript
function startLocalGame() {
    gameState.gameMode = 'local';
    
    const btnNewGame = document.getElementById('btn-new-game');
    if (btnNewGame) {
        btnNewGame.style.display = 'inline-block'; // Show in local mode
    }
    
    // ... rest of function
}
```

---

## Success Criteria

Phase 7 is complete when:
1. ✅ Defense visualization shows all controlled squares (including friendly pieces)
2. ✅ Castling works correctly with all rules enforced
3. ✅ "Play Again" button resets local/AI games and returns to lobby for online games
4. ✅ "Back to Menu" button properly disconnects and shows main menu
5. ✅ "New Game" button is hidden in online mode
6. ✅ All fixes work across all game modes (local, AI, online)
7. ✅ No regressions in existing functionality
8. ✅ Game feels polished and complete

---

## Future Considerations (Beyond Phase 7)

### Additional Chess Rules
- **En Passant**: Pawn capture special move
- **Pawn Promotion**: When pawn reaches opposite end, promote to queen/rook/bishop/knight
- **Stalemate Detection**: Detect when player has no legal moves but isn't in check
- **Threefold Repetition**: Draw if same position occurs three times
- **50-Move Rule**: Draw if 50 moves pass with no capture or pawn move

### Additional Features
- Move history display panel
- Undo move (local/AI only)
- Hint system (show one legal move)
- Save/load games
- Game timer (chess clock)
- Sound effects for moves

---

**This phase will make Perfect Chess a fully functional, polished chess game! Let's fix these bugs! ♟️**

