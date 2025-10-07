# Phase 2 Implementation Plan: Add Pawn and Piece Movement

## Objective
Extend Phase 1 by adding a pawn piece and implementing legal chess movement for both the queen and pawn. Attack range overlays should update after each move based on the new board state.

## New Features

### 1. Add Pawn to Board
- Place a white pawn on the board (suggested: e2)
- Render using Unicode: ♙ (U+2659)
- Pawn should also display with blue tint from attack overlay

### 2. Movement System

#### Legal Move Calculation

**Queen Moves (already partially implemented)**
- Moves in 8 directions (vertical, horizontal, diagonal)
- Can move any number of squares until:
  - Edge of board
  - Another piece (can capture enemy pieces, cannot move through any piece)

**Pawn Moves (new)**
- Forward movement only (no backward)
- First move: can move 1 or 2 squares forward
- Subsequent moves: only 1 square forward
- Cannot move forward if square is occupied
- Attack moves: diagonal forward (1 square) only if enemy piece present
- For Phase 2, we only have Player 1 pieces, so pawn cannot capture

#### Move Validation
- Pieces can only move to legal squares
- Cannot move to squares occupied by friendly pieces
- Turn-based movement (preparing for Phase 3 with two players)

### 3. User Interaction

**Click/Selection System**
- First click: select a piece
  - Highlight selected piece (e.g., yellow border or glow)
  - Display possible legal moves (e.g., highlight in green)
- Second click: move piece to destination
  - If clicked square is a legal move: move piece
  - If clicked square is not legal: deselect and optionally show error
  - If clicked another friendly piece: select that piece instead

**Visual Feedback**
- Selected piece: yellow border or glow effect
- Legal move squares: green border or subtle green overlay (distinct from attack range overlays)
- Cursor changes to pointer on hoverable pieces

### 4. Attack Range Updates

**Recalculation Logic**
- After each piece move, recalculate attack ranges
- Clear all existing overlays
- Calculate queen's new attack range from new position
- Calculate pawn's attack range (diagonal forward squares)
- Apply blue overlays to all squares in attack ranges
- Re-render board with updated overlays

## Enhanced JavaScript Functions

### New Functions

**`calculatePawnMoves(row, col, player)`**
- Determine if pawn has moved (not in starting position)
- Calculate forward moves (1 or 2 squares if first move)
- Calculate diagonal attack squares (even if no enemy present, for overlay)
- Return: `{ moves: [{row, col}], attacks: [{row, col}] }`

**`calculatePawnAttacks(row, col, player)`**
- Return diagonal forward squares (for attack overlay)
- Player 1 pawns: row+1, col±1
- This is separate from legal moves (used for overlay display)

**`getLegalMoves(row, col)`**
- Get piece at position
- Based on piece type, calculate legal moves
- Return array of legal destination coordinates

**`selectPiece(row, col)`**
- Store selected piece coordinates
- Calculate and display legal moves with green highlights
- Add visual selection indicator to piece

**`movePiece(fromRow, fromCol, toRow, toCol)`**
- Validate move is legal
- Update board array
- Clear selection highlights
- Call `updateAttackRanges()`
- Call `renderBoard()`
- Switch turn (preparing for Phase 3)

**`handleTileClick(row, col)`**
- If no piece selected and tile has friendly piece: `selectPiece()`
- If piece selected and tile is legal move: `movePiece()`
- If piece selected and tile is another friendly piece: `selectPiece()` new piece
- If piece selected and tile is illegal: clear selection

### Updated Functions

**`updateAttackRanges()`** (enhanced)
- Clear all overlays
- For each piece on board:
  - Calculate attack range based on piece type
  - Apply blue overlay to attack squares
- Update board rendering

**`initializeBoard()`** (enhanced)
- Add pawn at starting position (e.g., e2)
- Add click event listeners to all tiles
- Initialize current turn state (Player 1)

**`renderBoard()`** (enhanced)
- Render legal move indicators (green) if piece selected
- Render selection indicator on selected piece
- Maintain existing overlay and piece rendering

## Data Structure Updates

```javascript
// Add tracking for game state
const gameState = {
  selectedPiece: null, // {row, col} or null
  currentTurn: 1, // 1 or 2 (preparing for Phase 3)
  legalMoves: [] // [{row, col}] when piece is selected
};

// Piece object enhancement
{
  type: 'pawn' | 'queen',
  player: 1,
  position: { row, col },
  hasMoved: false // track if pawn has moved for first-move logic
}
```

## Visual Requirements

### Initial State (Phase 2)
```
  a  b  c  d  e  f  g  h
8 .  .  .  B  .  .  .  .
7 .  .  .  B  .  .  .  .
6 .  .  .  B  .  .  .  .
5 B  .  .  B  .  .  .  B
4 .  B  B  ♕  B  B  B  B
3 B  .  .  B  B  B  .  B
2 .  .  .  B  ♙  .  .  .
1 .  .  .  B  .  .  .  .

Legend:
B = Blue overlay (attack range)
♕ = White Queen at d4
♙ = White Pawn at e2
```

Note: Pawn at e2 adds diagonal attack squares at d3 and f3 to blue overlay.

### After Selecting Pawn (e2)
```
  a  b  c  d  e  f  g  h
8 .  .  .  B  .  .  .  .
7 .  .  .  B  .  .  .  .
6 .  .  .  B  .  .  .  .
5 B  .  .  B  .  .  .  B
4 .  B  B  ♕  G  B  B  B  ← Legal move: e4
3 B  .  .  B  BG .  .  B  ← Legal move: e3
2 .  .  .  B [♙] .  .  .  ← Selected (yellow border)
1 .  .  .  B  .  .  .  .

Legend:
[♙] = Selected piece
G = Green highlight (legal move)
BG = Blue overlay + Green highlight (overlapping)
```

## CSS Updates

### New Styles
```css
/* Legal move indicators */
.tile.legal-move {
  border: 2px solid rgba(0, 255, 0, 0.6);
}

/* Selected piece indicator */
.tile.selected {
  border: 3px solid rgba(255, 255, 0, 0.9);
  box-shadow: 0 0 10px rgba(255, 255, 0, 0.6);
}

/* Hover effects */
.tile.has-piece:hover {
  cursor: pointer;
  opacity: 0.9;
}
```

## Testing Criteria

### Movement Validation
- ✓ Queen can move in all 8 directions
- ✓ Queen movement stops at board edge
- ✓ Queen cannot move through other pieces
- ✓ Pawn can move 1 or 2 squares forward on first move
- ✓ Pawn can move only 1 square forward after first move
- ✓ Pawn cannot move if square ahead is blocked
- ✓ Illegal moves are rejected

### Interaction Validation
- ✓ Clicking piece selects it with visual indicator
- ✓ Legal moves display with green highlights
- ✓ Clicking legal move executes the move
- ✓ Clicking illegal square deselects piece
- ✓ Clicking another friendly piece switches selection

### Attack Range Validation
- ✓ Attack overlays update after each move
- ✓ Queen's attack range updates from new position
- ✓ Pawn shows diagonal forward attack squares (d3, f3 from e2)
- ✓ Overlays correctly combine from multiple pieces
- ✓ Pieces display with blue tint from overlays

## Implementation Notes
- Keep movement logic separate from rendering
- Use helper functions for move validation
- Event delegation for tile clicks (efficient for 64 tiles)
- Clear separation between "attack range" and "legal moves"
  - Attack range: for visualization (where piece threatens)
  - Legal moves: for movement validation (where piece can actually move)

## Success Criteria
Phase 2 is complete when:
1. Pawn is added to board and displays correctly
2. Both queen and pawn can be selected via click
3. Legal moves display with green highlights
4. Pieces move to legal squares when clicked
5. Illegal moves are rejected
6. Attack range overlays update correctly after each move
7. Pawn movement follows chess rules (forward only, first move bonus)
8. Code is ready for Phase 3 (adding Player 2)

