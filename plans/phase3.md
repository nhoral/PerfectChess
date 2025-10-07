# Phase 3 Implementation Plan: Add Player 2 Queen and Two-Player System

## Objective
Extend Phase 2 by adding a second player with a queen. Implement simultaneous attack range visualization where Player 1's attack range is blue, Player 2's is red, and overlapping squares are purple. Implement turn-based gameplay.

## New Features

### 1. Add Player 2 Queen
- Place black queen on the board (suggested: d8 or e8)
- Render using Unicode: ♛ (U+2655 for white, U+265B for black)
- Position at opposite end from Player 1's pieces

### 2. Two-Color Attack Range System

#### Overlay Color Logic
- **Blue overlay (Player 1)**: Squares attacked only by Player 1 pieces
- **Red overlay (Player 2)**: Squares attacked only by Player 2 pieces
- **Purple overlay (contested)**: Squares attacked by both players
- Formula: Purple = Red + Blue (overlapping ranges)

#### Color Tinting on Pieces
- Pieces inherit the color of their tile overlay:
  - Piece on blue square: blue tint
  - Piece on red square: red tint (under threat!)
  - Piece on purple square: purple tint (contested position)
  - Piece on no overlay: normal appearance

This provides instant visual feedback about piece safety.

### 3. Turn-Based System

#### Turn Management
- Game starts with Player 1's turn
- Only current player can select and move their pieces
- After valid move, turn switches to other player
- Display current player's turn prominently

#### Player Restrictions
- Player 1 can only select/move white pieces (player: 1)
- Player 2 can only select/move black pieces (player: 2)
- Clicking opponent's piece has no effect (or shows message)

### 4. Capture Mechanics

#### Basic Capture Rules
- Piece can move to square occupied by enemy piece
- Enemy piece is removed from board
- Capturing piece takes that square
- Attack ranges recalculate after capture

#### Move Validation Updates
- Legal moves now include enemy-occupied squares
- Legal moves exclude friendly-occupied squares
- Queen can move to square with enemy piece (but cannot move through)

## Enhanced JavaScript Functions

### New Functions

**`calculateAttackRangeByPlayer(player)`**
- Calculate all attack squares for given player
- Iterate through all pieces belonging to player
- Return array of coordinates: `[{row, col}, ...]`

**`calculateOverlays()`**
- Get Player 1 attack range: `p1Attacks`
- Get Player 2 attack range: `p2Attacks`
- Find overlapping squares: `overlaps = p1Attacks ∩ p2Attacks`
- Return object:
  ```javascript
  {
    blue: [p1-only squares],
    red: [p2-only squares],
    purple: [overlapping squares]
  }
  ```

**`switchTurn()`**
- Toggle `gameState.currentTurn` between 1 and 2
- Clear any selected piece
- Update UI to show current player
- Optional: Add visual indicator (e.g., "Player 1's Turn" banner)

**`canSelectPiece(row, col)`**
- Check if square has piece
- Check if piece belongs to current player
- Return boolean

**`isEnemyPiece(row, col, player)`**
- Check if square has piece
- Check if piece belongs to different player
- Used for capture validation

**`capturePiece(row, col)`**
- Remove piece from board array
- Optional: Track captured pieces for display

### Updated Functions

**`updateAttackRanges()`** (major enhancement)
- Calculate attack ranges for both players
- Use `calculateOverlays()` to determine blue/red/purple squares
- Apply appropriate overlay colors to tiles
- Update piece tinting based on overlay colors

**`getLegalMoves(row, col)`** (enhanced)
- Include enemy-occupied squares as legal moves (captures)
- Exclude friendly-occupied squares
- Continue to block queen movement through pieces

**`movePiece(fromRow, fromCol, toRow, toCol)`** (enhanced)
- Check if destination has enemy piece (capture)
- If capture: call `capturePiece()` first
- Move piece
- Update `hasMoved` flag for pawns
- Update attack ranges
- Switch turn
- Re-render board

**`handleTileClick(row, col)`** (enhanced)
- Check if piece belongs to current player before selecting
- If opponent's piece: ignore or show message
- Validate moves are only for current player

**`initializeBoard()`** (enhanced)
- Add Player 2 queen at starting position
- Set up both players' pieces
- Initialize turn to Player 1

**`renderBoard()`** (enhanced)
- Render pieces with appropriate color tints
- Show turn indicator UI element
- Display which pieces can be selected (optional: dim opponent's pieces)

## Data Structure Updates

```javascript
// Enhanced game state
const gameState = {
  selectedPiece: null,
  currentTurn: 1, // 1 or 2
  legalMoves: [],
  capturedPieces: {
    player1: [], // pieces captured by player 1
    player2: []  // pieces captured by player 2
  }
};

// Piece object (no changes needed, already has player field)
{
  type: 'pawn' | 'queen',
  player: 1 | 2,
  position: { row, col },
  hasMoved: false
}

// Overlay tracking (enhanced)
const tileOverlays = Array(8).fill(null).map(() => Array(8).fill(null));
// Values: null, 'blue', 'red', 'purple'
```

## Visual Requirements

### Initial State (Phase 3)
```
  a  b  c  d  e  f  g  h
8 R  R  R  ♛  R  R  R  R  ← Black Queen, red overlays
7 P  R  R  P  P  P  R  P  ← P = Purple (contested)
6 .  P  P  P  P  P  P  .
5 B  P  .  P  .  .  P  B
4 .  B  B  ♕  B  B  B  B  ← White Queen, blue overlays
3 B  .  .  B  B  B  .  B
2 .  .  .  B  ♙  .  .  .  ← White Pawn
1 .  .  .  B  .  .  .  .

Legend:
B = Blue overlay (Player 1 only)
R = Red overlay (Player 2 only)
P = Purple overlay (both players)
♕ = White Queen (Player 1)
♛ = Black Queen (Player 2)
♙ = White Pawn (Player 1)
```

### Example: Queen at Risk
If White Queen moves to a square in Black Queen's range:
```
  a  b  c  d  e  f  g  h
8 R  R  R  ♛  R  R  R  R
7 P  P  P  P  ♕  P  P  P  ← White Queen on RED square (under attack!)
...

The White Queen at e7 would display with a red tint, 
indicating it's under attack by Player 2.
```

### Turn Indicator (UI)
```
┌─────────────────────┐
│  Player 1's Turn    │  ← Displayed prominently above/beside board
└─────────────────────┘
```

After Player 1 moves:
```
┌─────────────────────┐
│  Player 2's Turn    │
└─────────────────────┘
```

## CSS Updates

### New Styles
```css
/* Red overlay (Player 2 attack range) */
.tile.overlay-red {
  background-color: rgba(255, 0, 0, 0.5);
}

/* Purple overlay (contested squares) */
.tile.overlay-purple {
  background-color: rgba(128, 0, 128, 0.5);
  /* Or mix: rgba(255, 0, 255, 0.5) */
}

/* Blue overlay remains from Phase 1 */
.tile.overlay-blue {
  background-color: rgba(0, 0, 255, 0.5);
}

/* Turn indicator */
.turn-indicator {
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  padding: 10px;
  margin-bottom: 20px;
  border-radius: 5px;
}

.turn-indicator.player1 {
  background-color: rgba(0, 0, 255, 0.2);
  color: #0000cc;
}

.turn-indicator.player2 {
  background-color: rgba(255, 0, 0, 0.2);
  color: #cc0000;
}

/* Piece color tinting */
.piece.tint-blue {
  filter: brightness(0.8) sepia(1) hue-rotate(180deg) saturate(5);
}

.piece.tint-red {
  filter: brightness(0.8) sepia(1) hue-rotate(0deg) saturate(5);
}

.piece.tint-purple {
  filter: brightness(0.8) sepia(1) hue-rotate(270deg) saturate(5);
}

/* Optional: Dim opponent's pieces during turn */
.piece.not-current-turn {
  opacity: 0.6;
}
```

## Testing Criteria

### Two-Player System
- ✓ Player 2 queen displays correctly
- ✓ Turn indicator shows current player
- ✓ Only current player can select their pieces
- ✓ Turn switches after valid move
- ✓ Clicking opponent's piece does nothing

### Attack Range Visualization
- ✓ Player 1 attack squares show blue
- ✓ Player 2 attack squares show red
- ✓ Overlapping attack squares show purple
- ✓ Overlays update correctly after each move
- ✓ All pieces (pawn + 2 queens) contribute to overlays

### Piece Tinting
- ✓ Pieces on blue squares have blue tint
- ✓ Pieces on red squares have red tint (visual danger indicator)
- ✓ Pieces on purple squares have purple tint
- ✓ Pieces on neutral squares have no tint

### Capture Mechanics
- ✓ Queen can capture enemy pieces
- ✓ Captured piece is removed from board
- ✓ Capturing piece moves to captured square
- ✓ Attack ranges update after capture
- ✓ Cannot capture friendly pieces

### Game Flow
- ✓ Game starts with Player 1's turn
- ✓ Players alternate turns
- ✓ Each player can only move their pieces
- ✓ Attack overlays update after each turn

## Implementation Notes

### Attack Range Calculation
- Calculate separately for each player first
- Then combine to determine colors (blue/red/purple)
- Use Set operations for efficiency:
  ```javascript
  const p1Set = new Set(p1Attacks.map(coord => `${coord.row},${coord.col}`));
  const p2Set = new Set(p2Attacks.map(coord => `${coord.row},${coord.col}`));
  ```

### Color Mixing Logic
```javascript
for each square (row, col):
  inP1Range = p1Set.has(`${row},${col}`)
  inP2Range = p2Set.has(`${row},${col}`)
  
  if inP1Range && inP2Range:
    overlay = 'purple'
  else if inP1Range:
    overlay = 'blue'
  else if inP2Range:
    overlay = 'red'
  else:
    overlay = null
```

### Piece Tinting Implementation
- Apply CSS filter or color blend mode
- Could also adjust piece color/opacity based on tile overlay
- Make sure pieces remain readable

## Success Criteria
Phase 3 is complete when:
1. Player 2 queen is on the board
2. Turn-based system works correctly
3. Blue/red/purple overlays display properly
4. Overlapping attack ranges show purple
5. Pieces display appropriate color tints based on tile
6. Capture mechanics work (queen can capture enemy pieces)
7. Only current player can move their pieces
8. Turn indicator shows current player clearly
9. Game is fully playable with two players alternating turns
10. All visual feedback helps players understand threats and safety

## Future Enhancements (Beyond Phase 3)
- Full chess piece set (rooks, bishops, knights, king)
- Check and checkmate detection
- En passant, castling
- Real-time overlay updates (debounced hover preview)
- Move history
- Undo/redo
- Game save/load
- AI opponent

