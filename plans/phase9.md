# Phase 9 Implementation Plan: Drag-and-Drop Piece Movement

## Objective
Replace click-to-select movement with drag-and-drop interaction. Provide real-time visual feedback as pieces are dragged, showing legal moves, attack ranges, and piece status updates dynamically.

## Philosophy
Make piece movement feel natural and intuitive. Players should be able to "pick up" pieces and see immediately where they can move, with the board updating in real-time to show the consequences of potential placements.

---

## Core Requirements

### 1. **Drag-and-Drop Mechanics**
- Pick up piece by clicking/touching and dragging
- Visual feedback: piece follows cursor/finger
- Semi-transparent original position while dragging
- Drop piece on valid square to move
- Return to original position if dropped on invalid square

### 2. **Real-Time Visual Feedback**
- **During drag:**
  - Show all legal move indicators (green dots/rings)
  - Highlight valid drop zones
  - Update attack range overlays (blue/red/purple) as if piece were in hover position
  - Update piece status borders for other pieces based on potential move
  - Ghost/preview piece at cursor position

- **On hover over valid squares:**
  - Show what the board state would look like with piece there
  - Update attack ranges dynamically
  - Update piece threat indicators
  - Visual indication that square is a valid drop target

### 3. **Validation**
- Can only drag your own pieces
- Can only drag on your turn
- Can only drop on legal move squares
- Invalid drops return piece to original position with animation

### 4. **Mobile Support**
- Touch events for mobile devices
- Prevent default scroll/zoom during drag
- Visual feedback adapted for touch (no hover)

### 5. **Preserve Existing Functionality**
- Castling still works
- Pawn promotion still triggers
- En passant still works
- Online multiplayer sync
- AI opponent compatibility
- All existing game modes work

---

## Technical Implementation

### HTML5 Drag and Drop API

#### 1. Make Pieces Draggable
```javascript
// In renderBoard(), add draggable attribute
if (piece && piece.player === gameState.currentTurn) {
    pieceElement.setAttribute('draggable', 'true');
    pieceElement.addEventListener('dragstart', handleDragStart);
    pieceElement.addEventListener('dragend', handleDragEnd);
}
```

#### 2. Make Tiles Drop Targets
```javascript
// Add drop event handlers to all tiles
tile.addEventListener('dragover', handleDragOver);
tile.addEventListener('drop', handleDrop);
tile.addEventListener('dragenter', handleDragEnter);
tile.addEventListener('dragleave', handleDragLeave);
```

### State Management

#### Drag State Object
```javascript
const dragState = {
    isDragging: false,
    draggedPiece: null, // {row, col}
    ghostPiece: null,   // DOM element following cursor
    originalPosition: null,
    legalMoves: [],
    currentHoverSquare: null // {row, col}
};
```

### Event Handlers

#### 1. Drag Start
```javascript
function handleDragStart(event) {
    const tile = event.target.closest('.tile');
    const row = parseInt(tile.dataset.row);
    const col = parseInt(tile.dataset.col);
    
    // Store drag state
    dragState.isDragging = true;
    dragState.draggedPiece = { row, col };
    dragState.originalPosition = { row, col };
    dragState.legalMoves = getLegalMoves(row, col);
    
    // Visual feedback
    event.target.style.opacity = '0.4';
    
    // Set drag image (optional - custom ghost piece)
    const dragImage = createDragImage(event.target);
    event.dataTransfer.setDragImage(dragImage, 34, 34); // Center on piece
    
    // Show legal moves
    renderLegalMovesOverlay(dragState.legalMoves);
    
    // Store data for drop handler
    event.dataTransfer.setData('text/plain', JSON.stringify({ row, col }));
    event.dataTransfer.effectAllowed = 'move';
}
```

#### 2. Drag Over (Hover)
```javascript
function handleDragOver(event) {
    if (!dragState.isDragging) return;
    
    event.preventDefault(); // Allow drop
    
    const tile = event.currentTarget;
    const row = parseInt(tile.dataset.row);
    const col = parseInt(tile.dataset.col);
    
    // Check if this is a legal move
    const isLegalMove = dragState.legalMoves.some(
        move => move.row === row && move.col === col
    );
    
    if (isLegalMove) {
        event.dataTransfer.dropEffect = 'move';
        
        // Update current hover position
        if (dragState.currentHoverSquare?.row !== row || 
            dragState.currentHoverSquare?.col !== col) {
            dragState.currentHoverSquare = { row, col };
            
            // Real-time preview: update board as if piece were here
            updateBoardPreview(dragState.draggedPiece, { row, col });
        }
    } else {
        event.dataTransfer.dropEffect = 'none';
    }
}
```

#### 3. Drag Enter
```javascript
function handleDragEnter(event) {
    if (!dragState.isDragging) return;
    
    const tile = event.currentTarget;
    const row = parseInt(tile.dataset.row);
    const col = parseInt(tile.dataset.col);
    
    const isLegalMove = dragState.legalMoves.some(
        move => move.row === row && move.col === col
    );
    
    if (isLegalMove) {
        tile.classList.add('drag-over-valid');
    } else {
        tile.classList.add('drag-over-invalid');
    }
}
```

#### 4. Drag Leave
```javascript
function handleDragLeave(event) {
    const tile = event.currentTarget;
    tile.classList.remove('drag-over-valid', 'drag-over-invalid');
}
```

#### 5. Drop
```javascript
function handleDrop(event) {
    event.preventDefault();
    
    if (!dragState.isDragging) return;
    
    const tile = event.currentTarget;
    const toRow = parseInt(tile.dataset.row);
    const toCol = parseInt(tile.dataset.col);
    
    // Check if legal move
    const legalMove = dragState.legalMoves.find(
        move => move.row === toRow && move.col === toCol
    );
    
    if (legalMove) {
        // Execute the move
        const { row: fromRow, col: fromCol } = dragState.draggedPiece;
        movePiece(fromRow, fromCol, toRow, toCol, legalMove.moveData);
    } else {
        // Invalid drop - animate piece back to original position
        animateReturnToOriginal(dragState.draggedPiece);
    }
    
    // Clean up drag state
    cleanupDragState();
}
```

#### 6. Drag End
```javascript
function handleDragEnd(event) {
    // Restore original opacity
    event.target.style.opacity = '1';
    
    // Clean up if drop wasn't handled
    if (dragState.isDragging) {
        cleanupDragState();
    }
}
```

### Real-Time Board Preview

#### Update Attack Ranges During Drag
```javascript
function updateBoardPreview(fromPos, toPos) {
    // Temporarily move piece in memory (don't modify actual board)
    const tempBoard = JSON.parse(JSON.stringify(board));
    
    // Simulate move
    const piece = tempBoard[fromPos.row][fromPos.col];
    tempBoard[toPos.row][toPos.col] = piece;
    tempBoard[fromPos.row][fromPos.col] = null;
    
    // Calculate attack ranges with temporary board
    const previewOverlays = calculateAttackRangesForBoard(tempBoard);
    
    // Render preview overlays
    renderPreviewOverlays(previewOverlays);
    
    // Update piece status borders with temporary board
    updatePieceStatusPreview(tempBoard);
}
```

#### Calculate for Temporary Board
```javascript
function calculateAttackRangesForBoard(tempBoard) {
    // Same logic as calculateAttackRangeByPlayer but use tempBoard
    // Returns overlay colors for each tile
    const player1Attacks = [];
    const player2Attacks = [];
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = tempBoard[row][col];
            if (piece) {
                const attacks = calculatePieceAttacksForBoard(piece, row, col, tempBoard);
                if (piece.player === 1) {
                    player1Attacks.push(...attacks);
                } else {
                    player2Attacks.push(...attacks);
                }
            }
        }
    }
    
    // Combine into overlay map
    return combineAttackRanges(player1Attacks, player2Attacks);
}
```

---

## Visual Design

### CSS for Drag States

#### 1. Dragging Piece
```css
.piece.dragging {
    opacity: 0.4;
    cursor: grabbing !important;
}

.piece[draggable="true"] {
    cursor: grab;
}

.piece[draggable="true"]:hover {
    transform: scale(1.05);
}
```

#### 2. Valid Drop Zone
```css
.tile.drag-over-valid {
    background-color: rgba(0, 255, 0, 0.3) !important;
    box-shadow: inset 0 0 0 3px rgba(0, 255, 0, 0.6);
}
```

#### 3. Invalid Drop Zone
```css
.tile.drag-over-invalid {
    background-color: rgba(255, 0, 0, 0.2) !important;
    box-shadow: inset 0 0 0 3px rgba(255, 0, 0, 0.5);
}
```

#### 4. Ghost Piece (Custom Drag Image)
```css
.ghost-piece {
    position: fixed;
    pointer-events: none;
    z-index: 10000;
    opacity: 0.8;
    font-size: 50px;
    transform: translate(-50%, -50%);
}
```

---

## Mobile/Touch Support

### Touch Event Handlers
```javascript
// Add touch event handlers for mobile
pieceElement.addEventListener('touchstart', handleTouchStart);
pieceElement.addEventListener('touchmove', handleTouchMove);
pieceElement.addEventListener('touchend', handleTouchEnd);
pieceElement.addEventListener('touchcancel', handleTouchCancel);
```

### Touch Implementation
```javascript
let touchState = {
    active: false,
    startPos: null,
    currentPos: null,
    ghostElement: null
};

function handleTouchStart(event) {
    event.preventDefault(); // Prevent scroll
    
    const touch = event.touches[0];
    const tile = event.target.closest('.tile');
    const row = parseInt(tile.dataset.row);
    const col = parseInt(tile.dataset.col);
    
    // Similar to dragStart
    touchState.active = true;
    touchState.startPos = { row, col };
    dragState.isDragging = true;
    dragState.draggedPiece = { row, col };
    dragState.legalMoves = getLegalMoves(row, col);
    
    // Create ghost element
    touchState.ghostElement = createTouchGhost(event.target);
    document.body.appendChild(touchState.ghostElement);
    
    // Show legal moves
    renderLegalMovesOverlay(dragState.legalMoves);
}

function handleTouchMove(event) {
    if (!touchState.active) return;
    event.preventDefault();
    
    const touch = event.touches[0];
    
    // Move ghost element
    touchState.ghostElement.style.left = touch.clientX + 'px';
    touchState.ghostElement.style.top = touch.clientY + 'px';
    
    // Determine which tile we're over
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const tile = element?.closest('.tile');
    
    if (tile) {
        const row = parseInt(tile.dataset.row);
        const col = parseInt(tile.dataset.col);
        
        // Update preview
        updateBoardPreview(dragState.draggedPiece, { row, col });
    }
}

function handleTouchEnd(event) {
    if (!touchState.active) return;
    event.preventDefault();
    
    const touch = event.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const tile = element?.closest('.tile');
    
    if (tile) {
        const toRow = parseInt(tile.dataset.row);
        const toCol = parseInt(tile.dataset.col);
        
        // Check if legal and execute move
        const legalMove = dragState.legalMoves.find(
            move => move.row === toRow && move.col === toCol
        );
        
        if (legalMove) {
            const { row: fromRow, col: fromCol } = dragState.draggedPiece;
            movePiece(fromRow, fromCol, toRow, toCol, legalMove.moveData);
        }
    }
    
    // Clean up
    document.body.removeChild(touchState.ghostElement);
    touchState.active = false;
    cleanupDragState();
}
```

---

## Animation & Polish

### Smooth Return Animation
```javascript
function animateReturnToOriginal(pos) {
    // Animate piece sliding back to original position
    const tile = getTileElement(pos.row, pos.col);
    const piece = tile.querySelector('.piece');
    
    piece.style.transition = 'transform 0.3s ease-out';
    piece.style.transform = 'translate(0, 0)';
    
    setTimeout(() => {
        piece.style.transition = '';
        piece.style.transform = '';
    }, 300);
}
```

### Drop Animation
```javascript
function animateDropToSquare(fromPos, toPos) {
    // Animate piece moving from drag position to final position
    // (Optional - piece already follows cursor, but can add bounce effect)
}
```

---

## Compatibility & Fallback

### Feature Detection
```javascript
function supportsDragAndDrop() {
    const div = document.createElement('div');
    return ('draggable' in div) || ('ondragstart' in div && 'ondrop' in div);
}

function supportsTouchEvents() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}
```

### Maintain Click-to-Move
```javascript
// Keep existing click handlers as fallback
if (!supportsDragAndDrop() && !supportsTouchEvents()) {
    // Use original click-based movement
    tile.addEventListener('click', handleTileClick);
}
```

---

## User Experience Enhancements

### 1. Visual Feedback Levels
- **Subtle**: Legal moves show as green dots (current)
- **Moderate**: Legal moves + hover preview of attack ranges
- **Full**: Everything + animated transitions + piece glow effects

### 2. Preview Transparency
- Dragged piece: 40% opacity at original position
- Ghost piece: 80% opacity following cursor
- Hovered valid square: slight highlight

### 3. Cursor Changes
- Over own piece (draggable): `cursor: grab`
- While dragging: `cursor: grabbing`
- Over valid drop: `cursor: pointer`
- Over invalid drop: `cursor: not-allowed`

---

## Testing Scenarios

### Drag and Drop
- [ ] Can drag own pieces
- [ ] Cannot drag opponent pieces
- [ ] Cannot drag when not your turn
- [ ] Legal moves show during drag
- [ ] Invalid drops return piece to original position
- [ ] Valid drops execute move correctly

### Real-Time Updates
- [ ] Attack range overlays update during drag
- [ ] Piece status borders update during hover
- [ ] Preview accurately reflects potential move
- [ ] Updates smooth and responsive (<50ms)

### Special Moves
- [ ] Castling works with drag-and-drop
- [ ] Pawn promotion triggers on drag to back rank
- [ ] En passant works
- [ ] Captures work correctly

### Mobile/Touch
- [ ] Touch drag works on mobile
- [ ] No scrolling interference
- [ ] Ghost piece visible and smooth
- [ ] Drop works correctly

### Game Modes
- [ ] Works in local 2-player
- [ ] Works with AI opponent
- [ ] Works in online multiplayer
- [ ] Online moves sync correctly

### Edge Cases
- [ ] Dragging off board returns piece
- [ ] Fast drags don't break state
- [ ] Multiple rapid clicks don't cause issues
- [ ] Refresh during drag doesn't break game

---

## Implementation Order

### Step 1: Basic Drag and Drop
1. Add draggable attribute to pieces
2. Implement dragstart, dragend handlers
3. Implement dragover, drop handlers
4. Execute moves on valid drops
5. Return to original on invalid drops

### Step 2: Legal Move Indicators
1. Show legal moves during drag (existing logic)
2. Add visual styling for valid/invalid drop zones
3. Cursor feedback

### Step 3: Real-Time Preview
1. Implement temporary board state
2. Calculate attack ranges for preview board
3. Update overlays during hover
4. Update piece status borders

### Step 4: Touch Support
1. Add touch event handlers
2. Create touch ghost element
3. Touch move tracking
4. Touch drop handling

### Step 5: Polish & Animation
1. Smooth return animation
2. Custom drag image
3. Transition effects
4. Sound effects (optional)

### Step 6: Testing & Refinement
1. Test all game modes
2. Test all piece types
3. Mobile device testing
4. Performance optimization

---

## Performance Considerations

### Optimization Strategies
1. **Throttle hover updates**: Only recalculate preview every 100ms
2. **Cache legal moves**: Calculate once on drag start
3. **Efficient DOM updates**: Batch overlay changes
4. **Use CSS transforms**: Hardware-accelerated animations
5. **Lazy updates**: Only update visible tiles

### Performance Targets
- Drag initiation: <50ms
- Hover preview update: <100ms
- Drop execution: <50ms
- No frame drops during drag

---

## Accessibility Considerations

### Keyboard Support
- Still allow keyboard navigation (Tab to select piece)
- Enter/Space to pick up piece
- Arrow keys to move selection
- Enter/Space to drop

### Screen Reader Support
- Announce when piece is picked up
- Announce legal moves
- Announce when move is completed

---

## Future Enhancements (Beyond Phase 9)

### Optional Features
- **Piece rotation**: Rotate board view for Player 2
- **Multi-touch**: Pinch to zoom, two-finger pan
- **Undo drag**: Shake to undo (mobile)
- **Drag preview board**: Show mini-board preview during drag
- **Sound effects**: Piece pickup, drop, capture sounds
- **Haptic feedback**: Vibration on mobile for drag/drop

---

## Success Criteria

Phase 9 is complete when:
1. ✅ Pieces can be dragged and dropped
2. ✅ Legal moves show during drag
3. ✅ Attack ranges update in real-time during hover
4. ✅ Piece status borders update during hover
5. ✅ Invalid drops return piece smoothly
6. ✅ Valid drops execute move correctly
7. ✅ Touch support works on mobile
8. ✅ All game modes still functional
9. ✅ Special moves (castling, promotion, en passant) work
10. ✅ Performance is smooth (<100ms updates)
11. ✅ Works across all browsers (Chrome, Firefox, Safari)

---

## Estimated Time
**Total: ~6-8 hours**

- Basic drag-and-drop mechanics: 2 hours
- Legal move indicators: 30 min
- Real-time preview system: 2 hours
- Touch support: 1.5 hours
- Animation & polish: 1 hour
- Testing & debugging: 1.5 hours

---

**This will make Perfect Chess feel incredibly smooth and intuitive! 🎯♟️**

