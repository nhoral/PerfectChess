# Phase 1 Implementation Plan: Basic Board with Attack Range Visualization

## Objective
Create a basic top-down chessboard that displays tile color overlays representing attack ranges. A single white queen will be placed in the center of the board, with all tiles she can attack highlighted in blue.

## Core Components

### 1. HTML Structure (`index.html`)
- Standard HTML5 document
- Container for the chessboard
- Include coordinate labels (files: a-h, ranks: 1-8)
- Link to CSS and JavaScript files

### 2. CSS Styling (`styles.css`)
- **Board Layout:**
  - 8x8 grid using CSS Grid or Flexbox
  - Standard chess coloring (alternating light/dark squares)
  - Light squares: #e8e8e8 (light gray)
  - Dark squares: #a0a0a0 (medium gray)
  
- **Tile Overlay System:**
  - Blue overlay (Player 1 attack range): rgba(0, 0, 255, 0.5)
  - Each tile should support overlay rendering without affecting piece visibility
  
- **Piece Rendering:**
  - Unicode chess symbols
  - White Queen: ♕ (U+2655)
  - Pieces should inherit the color tint of their underlying tile
  - Large, centered piece display
  
- **Coordinates:**
  - Files (a-h) displayed below the board
  - Ranks (1-8) displayed on the left side
  - Clear, readable font

### 3. JavaScript Logic (`game.js`)

#### Data Structures
```javascript
// Board state representation
const board = Array(8).fill(null).map(() => Array(8).fill(null));

// Piece object structure
{
  type: 'queen',
  player: 1,
  position: { row: 3, col: 3 } // center position (d4)
}

// Tile overlay state
const tileOverlays = Array(8).fill(null).map(() => Array(8).fill(null));
// Values: null, 'blue', 'red', 'purple'
```

#### Core Functions

**`initializeBoard()`**
- Create the 8x8 grid DOM elements
- Apply alternating square colors
- Add coordinate labels
- Place the white queen at center (d4 or e4)
- Call `updateAttackRanges()`

**`updateAttackRanges()`**
- Clear all existing overlays
- Calculate attack range for the queen
- Apply blue overlay to all attackable squares
- Update DOM with overlay classes

**`calculateQueenMoves(row, col)`**
- Calculate all valid moves in 8 directions:
  - Vertical: up, down
  - Horizontal: left, right
  - Diagonal: 4 diagonal directions
- Return array of coordinates `[{row, col}, ...]`
- Continue in each direction until edge of board

**`applyOverlay(row, col, color)`**
- Add overlay class to specified tile
- Update `tileOverlays` array

**`renderBoard()`**
- Clear and redraw all tiles
- Apply base square colors (light/dark alternating)
- Apply overlays from `tileOverlays` array
- Render pieces from `board` array
- Apply color tint effect to pieces based on tile overlay

## Visual Requirements

### Initial State
```
  a  b  c  d  e  f  g  h
8 .  .  .  B  .  .  .  .
7 .  .  .  B  .  .  .  .
6 .  .  .  B  .  .  .  .
5 B  .  .  B  .  .  .  B
4 .  B  B  ♕  B  B  B  B
3 B  .  .  B  .  .  .  B
2 .  .  .  B  .  .  .  .
1 .  .  .  B  .  .  .  .

Legend: B = Blue overlay, ♕ = White Queen
```

The queen at d4 should show blue overlays on all squares in her 8 directional attack range.

## File Structure
```
/PerfectChess
  /plans
    - phase1.md (this file)
  - index.html
  - styles.css
  - game.js
  - README.md
```

## Testing Criteria

### Visual Validation
- ✓ 8x8 board renders correctly
- ✓ Alternating square colors display properly
- ✓ Coordinates (a-h, 1-8) are visible and correctly positioned
- ✓ White queen displays in center of board
- ✓ Queen's unicode symbol is clear and centered

### Attack Range Validation
- ✓ All 4 cardinal directions show blue overlay
- ✓ All 4 diagonal directions show blue overlay
- ✓ Overlays extend to board edges
- ✓ Queen's square itself is NOT highlighted
- ✓ Overlays are at 50% opacity (blue tint visible but not overwhelming)

### Piece Color Tinting
- ✓ Queen displays with blue tint effect (since she's on a blue square)

## Implementation Notes
- Keep code modular and well-commented
- Use semantic HTML class names
- Separate concerns: rendering, game logic, state management
- No external dependencies (vanilla JS only)
- Ensure code is easily extensible for Phase 2

## Success Criteria
Phase 1 is complete when:
1. Board renders correctly with proper chess colors
2. Queen displays at center position
3. All attack squares show blue overlay
4. Coordinates are visible
5. Code is clean, readable, and ready for Phase 2 expansion

