# Phase 4 Implementation Plan: Complete Chess with All Pieces

## Objective
Add all remaining chess pieces (King, Rook, Bishop, Knight) for both players and implement complete chess rules including check, checkmate, castling, en passant, and pawn promotion.

## New Pieces to Add

### Starting Position (Standard Chess)
```
  a  b  c  d  e  f  g  h
8 ♜  ♞  ♝  ♛  ♚  ♝  ♞  ♜  ← Black pieces (Player 2)
7 ♟  ♟  ♟  ♟  ♟  ♟  ♟  ♟  ← Black pawns
6 .  .  .  .  .  .  .  .
5 .  .  .  .  .  .  .  .
4 .  .  .  .  .  .  .  .
3 .  .  .  .  .  .  .  .
2 ♙  ♙  ♙  ♙  ♙  ♙  ♙  ♙  ← White pawns
1 ♖  ♘  ♗  ♕  ♔  ♗  ♘  ♖  ← White pieces (Player 1)
```

### Piece Movement Rules

**King (♔/♚)**
- Moves one square in any direction (8 possible moves)
- Cannot move into check
- Special move: Castling (with rook)

**Rook (♖/♜)**
- Moves any number of squares horizontally or vertically
- Cannot jump over pieces
- Special move: Castling (with king)

**Bishop (♗/♝)**
- Moves any number of squares diagonally
- Cannot jump over pieces
- Each bishop stays on its starting color (light or dark)

**Knight (♘/♞)**
- Moves in "L" shape: 2 squares in one direction, 1 square perpendicular
- Can jump over other pieces
- 8 possible moves maximum

**Pawn (♙/♟)** - Enhanced from Phase 2
- Forward 1 or 2 squares on first move
- Diagonal capture
- En passant capture (special pawn capture)
- Promotion when reaching opposite end of board

## Core Features to Implement

### 1. Piece Movement Functions

**`calculateKingMoves(row, col, player)`**
- All 8 adjacent squares
- Filter out squares that would put king in check
- Include castling moves if conditions met

**`calculateKingAttacks(row, col)`**
- All 8 adjacent squares (for overlay display)
- Used for attack range visualization

**`calculateRookMoves(row, col, player)`**
- Four cardinal directions until blocked
- Stop at friendly pieces, capture enemy pieces

**`calculateRookAttacks(row, col)`**
- Same as moves but for overlay visualization

**`calculateBishopMoves(row, col, player)`**
- Four diagonal directions until blocked
- Stop at friendly pieces, capture enemy pieces

**`calculateBishopAttacks(row, col)`**
- Same as moves but for overlay visualization

**`calculateKnightMoves(row, col, player)`**
- 8 possible L-shaped moves
- Can jump over pieces
- Cannot land on friendly pieces

**`calculateKnightAttacks(row, col)`**
- All 8 L-shaped squares for overlay

### 2. Check Detection

**`isSquareUnderAttack(row, col, byPlayer)`**
- Check if a square is attacked by any piece of given player
- Used for check detection and king move validation

**`isKingInCheck(player)`**
- Find king position for given player
- Check if king's square is under attack by opponent
- Return boolean

**`getKingPosition(player)`**
- Search board for king of given player
- Return {row, col} coordinates

**`wouldMoveResultInCheck(fromRow, fromCol, toRow, toCol)`**
- Simulate move
- Check if current player's king would be in check
- Revert simulation
- Return boolean
- Used to prevent illegal moves that expose king

### 3. Checkmate and Stalemate

**`isCheckmate(player)`**
- Player's king is in check
- No legal move can get king out of check
- Game over - opponent wins

**`isStalemate(player)`**
- Player's king is NOT in check
- Player has no legal moves
- Game over - draw

**`hasLegalMoves(player)`**
- Check if player has any legal move available
- Used for checkmate/stalemate detection

### 4. Special Moves

**Castling**
- King and rook move simultaneously
- Conditions:
  - Neither piece has moved
  - No pieces between them
  - King not in check
  - King doesn't pass through check
  - King doesn't end in check
- Kingside: King moves 2 squares toward h-file, rook jumps over
- Queenside: King moves 2 squares toward a-file, rook jumps over

**`canCastle(player, side)`**
- Check all castling conditions
- side: 'kingside' or 'queenside'
- Return boolean

**`performCastle(player, side)`**
- Move king and rook
- Update hasMoved flags

**En Passant**
- Pawn captures diagonally as if enemy pawn moved only 1 square
- Only valid immediately after enemy pawn moves 2 squares forward
- Need to track last move

**`canEnPassant(row, col, player)`**
- Check if en passant is legal for pawn at position
- Requires tracking previous move in gameState

**Pawn Promotion**
- When pawn reaches opposite end (rank 1 or 8)
- Player chooses: Queen, Rook, Bishop, or Knight
- Default to Queen for Phase 4

**`promotePawn(row, col, pieceType)`**
- Replace pawn with chosen piece
- Update board and render

### 5. Game State Management

**Enhanced gameState**
```javascript
const gameState = {
    selectedPiece: null,
    currentTurn: 1,
    legalMoves: [],
    lastMove: null, // {from: {row, col}, to: {row, col}, piece: type}
    inCheck: false,
    gameOver: false,
    winner: null, // 1, 2, or 'draw'
    moveHistory: [] // Array of all moves
};
```

### 6. Move Validation Enhancement

**`getLegalMoves(row, col)`** - Enhanced
- Calculate all pseudo-legal moves based on piece type
- Filter out moves that would result in check
- Add special moves (castling, en passant)
- Return only truly legal moves

### 7. UI Enhancements

**Game Status Display**
- Show "Check!" message when king is in check
- Show "Checkmate!" and winner when game ends
- Show "Stalemate!" for draw
- Highlight king in check with special color (orange/yellow flash)

**Promotion Dialog**
- When pawn reaches end, show piece selection UI
- Buttons for Queen, Rook, Bishop, Knight
- Auto-promote to Queen for now (can enhance later)

**Move History**
- Optional: Display list of moves in notation
- Example: "1. e4 e5 2. Nf3 Nc6"

## Implementation Strategy

### Step 1: Add All Pieces to Starting Position
- Create full standard chess starting position
- Test rendering all pieces

### Step 2: Implement Basic Piece Movements
- Add movement functions for King, Rook, Bishop, Knight
- Test each piece type individually
- Update attack range visualization

### Step 3: Add Check Detection
- Implement `isSquareUnderAttack()`
- Implement `isKingInCheck()`
- Prevent moves that result in check

### Step 4: Implement Checkmate/Stalemate
- Add win condition detection
- Add game over state and UI
- Test various checkmate scenarios

### Step 5: Add Special Moves
- Implement castling
- Implement en passant
- Implement pawn promotion

### Step 6: Polish and Testing
- Test all piece interactions
- Test edge cases
- Ensure attack overlays work with all pieces
- Final UI polish

## Visual Requirements

### Full Board with All Pieces
```
  a  b  c  d  e  f  g  h
8 R  R  R  PR B  R  R  R  ← Black queen attacks much
7 P  P  P  P  P  P  P  P  ← Purple/red contested area
6 .  P  P  P  P  P  P  .
5 .  .  P  P  P  P  .  .
4 .  .  P  P  P  P  .  .
3 .  B  B  B  B  B  B  .
2 B  B  B  B  B  B  B  B  ← White pawns/pieces attack
1 B  B  B  B  B  B  B  B

Legend:
B = Blue (Player 1 attacks)
R = Red (Player 2 attacks)
P = Purple (Contested)
```

### King in Check Indicator
- King piece gets special highlight (orange glow or pulse animation)
- Turn indicator shows "CHECK!" in bold
- Only legal moves that get out of check are shown

### Checkmate Display
```
┌─────────────────────────────┐
│     CHECKMATE!              │
│  Player 1 Wins!             │
│  [New Game]                 │
└─────────────────────────────┘
```

## Data Structures

### Enhanced Piece Object
```javascript
{
    type: 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn',
    player: 1 | 2,
    position: { row, col },
    hasMoved: boolean,
    // Optional: for tracking
    moveCount: number
}
```

### Move History Entry
```javascript
{
    from: { row, col },
    to: { row, col },
    piece: 'queen',
    captured: 'pawn' | null,
    special: 'castle' | 'enPassant' | 'promotion' | null,
    check: boolean,
    checkmate: boolean
}
```

## Testing Scenarios

### Basic Movement Tests
- ✓ All pieces can move according to chess rules
- ✓ Pieces cannot jump over others (except knight)
- ✓ Pieces cannot capture friendly pieces
- ✓ Attack overlays show correctly for all pieces

### Check Tests
- ✓ King cannot move into check
- ✓ Must get out of check when in check
- ✓ King is highlighted when in check
- ✓ Cannot make moves that expose king to check

### Checkmate Tests
- ✓ Back rank mate detected
- ✓ Smothered mate detected
- ✓ Game ends properly on checkmate
- ✓ Winner displayed correctly

### Special Moves Tests
- ✓ Castling works kingside
- ✓ Castling works queenside
- ✓ Cannot castle out of/through check
- ✓ En passant works correctly
- ✓ Pawn promotion works

### Game Flow Tests
- ✓ Turns alternate correctly
- ✓ Cannot move opponent's pieces
- ✓ Move history tracks correctly
- ✓ Attack overlays update after each move

## CSS Additions

```css
/* King in check highlight */
.tile.king-in-check {
    animation: checkPulse 1s infinite;
}

@keyframes checkPulse {
    0%, 100% {
        box-shadow: inset 0 0 0 3px rgba(255, 165, 0, 0.8);
    }
    50% {
        box-shadow: inset 0 0 0 5px rgba(255, 100, 0, 1);
    }
}

/* Game over overlay */
.game-over-overlay {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 40px;
    border-radius: 15px;
    box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
    z-index: 1000;
    text-align: center;
}

.game-over-overlay h2 {
    font-size: 2.5em;
    margin-bottom: 20px;
    color: #333;
}

.game-over-overlay button {
    padding: 15px 30px;
    font-size: 1.2em;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
}

/* Check indicator in turn display */
.turn-indicator.in-check {
    animation: checkFlash 0.5s infinite;
    font-size: 1.5em;
}

@keyframes checkFlash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
}
```

## Implementation Notes

### Move Validation Priority
1. Calculate pseudo-legal moves (piece can physically make the move)
2. Filter moves that would leave king in check
3. Add special moves if conditions met
4. Return final legal moves

### Performance Considerations
- Cache king positions (update only when king moves)
- Optimize check detection for common cases
- Reuse attack calculations for overlay and check detection

### Code Organization
- Group piece movement functions together
- Separate game logic from rendering
- Keep special move logic isolated and well-documented

### Knight Movement Offsets
```javascript
const knightOffsets = [
    [-2, -1], [-2, 1],  // Up 2, left/right 1
    [-1, -2], [-1, 2],  // Up 1, left/right 2
    [1, -2],  [1, 2],   // Down 1, left/right 2
    [2, -1],  [2, 1]    // Down 2, left/right 1
];
```

### King Movement Offsets
```javascript
const kingOffsets = [
    [-1, -1], [-1, 0], [-1, 1],  // Up row
    [0, -1],           [0, 1],   // Same row
    [1, -1],  [1, 0],  [1, 1]    // Down row
];
```

## Success Criteria

Phase 4 is complete when:
1. All 32 pieces render correctly in starting position
2. All pieces move according to standard chess rules
3. Check is detected and enforced
4. Checkmate ends the game with correct winner
5. Stalemate is detected properly
6. Castling works for both players
7. En passant works correctly
8. Pawn promotion functions (even if auto-Queen)
9. Attack overlays work with full piece set
10. Game is fully playable as complete chess with Perfect Chess overlays

## Future Enhancements (Beyond Phase 4)

- Move history display with chess notation
- Undo/Redo moves
- Save/Load game state
- Timed games with chess clock
- AI opponent
- Move suggestions/hints
- Opening book
- Real-time overlay updates (hover preview)
- Sound effects
- Animation for piece movement
- Captured pieces display
- 3D piece models option

## File Structure After Phase 4
```
/PerfectChess
  /plans
    - phase1.md
    - phase2.md
    - phase3.md
    - phase4.md
  - index.html
  - styles.css
  - game.js
  - README.md
```

Note: Consider splitting game.js into modules if it becomes too large:
- pieces.js (piece movement logic)
- gameLogic.js (check, checkmate, special moves)
- rendering.js (UI and board rendering)
- main.js (initialization and game loop)

