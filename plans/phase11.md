# Phase 11 Implementation Plan: Image-Based Chess Pieces

## Objective
Replace Unicode chess piece symbols with actual PNG images for a more professional, visually appealing game. Initially, all pieces will use white piece images with CSS filters to differentiate between players.

## Philosophy
Great chess games deserve great visuals. By replacing the Unicode symbols with professionally designed piece images, we create a more immersive and polished experience. The pieces should feel tangible and premium while maintaining all interactive functionality like drag-and-drop, status indicators, and smooth animations.

---

## Core Requirements

### 1. **Image-Based Pieces**
- Use PNG images from `assets/` folder
- All pieces are 60px wide with varying heights
- Maintain aspect ratio and visual quality
- Support both white and black pieces (initially same images)

### 2. **Player Differentiation**
- **Player 1 (White):** Use original golden/yellow images
- **Player 2 (Black):** Apply CSS filter to make pieces darker
- Future: Add separate black piece images (`black_*.png`)

### 3. **Maintain All Functionality**
- Drag-and-drop still works perfectly
- Status borders (threatened/contested) remain visible
- Piece selection highlighting works
- Touch/mobile support preserved
- All animations smooth

### 4. **Performance**
- Preload all piece images
- Use CSS for efficient rendering
- No performance degradation
- Smooth 60 FPS maintained

### 5. **Responsive Scaling**
- Scale pieces proportionally on mobile
- Maintain aspect ratios
- Keep pieces centered in tiles

---

## Piece Specifications

### Available Images
All located in `assets/` folder:

| Piece | File | Width | Approx Height | Notes |
|-------|------|-------|---------------|-------|
| Pawn | `white_pawn.png` | 60px | ~45px | Shortest piece |
| Rook | `white_rook.png` | 60px | ~50px | Castle with battlements |
| Knight | `white_knight.png` | 60px | ~50px | Horse shape |
| Bishop | `white_bishop.png` | 60px | ~58px | Pointed mitre top |
| Queen | `white_queen.png` | 60px | ~68px | Tallest with crown |
| King | `white_king.png` | 60px | ~62px | Crown with cross |

*Note: Heights estimated from visual inspection. Images will maintain natural aspect ratio.*

### Styling Strategy

**Player 1 (White) - Original Color:**
```css
.piece.player1-piece img {
    filter: none;
    /* Original golden/yellow color */
}
```

**Player 2 (Black) - Darkened:**
```css
.piece.player2-piece img {
    filter: brightness(0.3) contrast(1.2) saturate(0.8);
    /* Makes pieces appear dark/black */
}
```

---

## Technical Implementation

### 1. Update JavaScript - Piece Rendering

#### Current Code (Unicode):
```javascript
// Get unicode symbol
const color = piece.player === 1 ? 'white' : 'black';
pieceElement.textContent = PIECES[piece.type][color];
```

#### New Code (Images):
```javascript
// Create image element
const img = document.createElement('img');
img.src = `./assets/white_${piece.type}.png`;
img.alt = `${piece.player === 1 ? 'White' : 'Black'} ${piece.type}`;
img.className = 'piece-image';
img.draggable = false; // Prevent image drag, use parent drag

pieceElement.appendChild(img);
```

#### Complete Updated Rendering Function

**In `game.js` - Update `renderBoard()`:**

```javascript
function renderBoard() {
    const chessboard = document.getElementById('chessboard');
    chessboard.innerHTML = ''; // Clear existing tiles
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.dataset.row = row;
            tile.dataset.col = col;
            
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
                
                // Create image element instead of Unicode
                const img = document.createElement('img');
                img.src = `./assets/white_${piece.type}.png`;
                img.alt = `${piece.player === 1 ? 'White' : 'Black'} ${piece.type}`;
                img.className = 'piece-image';
                img.draggable = false; // Important: prevent default image drag
                
                pieceElement.appendChild(img);
                
                // Make piece draggable if it's the player's turn
                const canDrag = !gameState.gameOver && piece.player === gameState.currentTurn &&
                    (gameState.gameMode !== 'online' || piece.player === gameState.playerNumber);
                
                if (canDrag) {
                    pieceElement.setAttribute('draggable', 'true');
                    pieceElement.addEventListener('dragstart', (e) => handleDragStart(e, row, col));
                    pieceElement.addEventListener('dragend', handleDragEnd);
                    
                    // Add touch support for mobile
                    pieceElement.addEventListener('touchstart', (e) => handleTouchStart(e, row, col), {passive: false});
                }
                
                tile.appendChild(pieceElement);
            }
            
            // Add drop event listeners to all tiles
            tile.addEventListener('dragover', handleDragOver);
            tile.addEventListener('drop', (e) => handleDrop(e, row, col));
            tile.addEventListener('dragenter', (e) => handleDragEnter(e, row, col));
            tile.addEventListener('dragleave', handleDragLeave);
            
            // Add touch move/end listeners to tiles (for mobile drop detection)
            tile.addEventListener('touchmove', handleTouchMove, {passive: false});
            tile.addEventListener('touchend', handleTouchEnd, {passive: false});
            
            // Keep click handler as fallback
            tile.addEventListener('click', () => handleTileClick(row, col));
            
            chessboard.appendChild(tile);
        }
    }
}
```

### 2. CSS Updates

**Remove old Unicode styling:**
```css
/* REMOVE these styles */
.piece {
    font-size: 65px;
    /* Remove text-based styling */
}

.piece.player1-piece {
    color: #F5E6D3;
    text-shadow: ...;
}

.piece.player2-piece {
    color: #1a1a1a;
    text-shadow: ...;
}
```

**Add new image-based styling:**

```css
/* Piece container - now holds image instead of text */
.piece {
    position: relative;
    width: 60px;  /* Match image width */
    height: 70px; /* Max height to accommodate tallest piece (queen) */
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    z-index: 10;
    /* Keep the drop shadow effect */
    filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.4));
}

/* The actual piece image */
.piece-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain; /* Maintain aspect ratio */
    pointer-events: none; /* Allow parent to handle drag events */
    display: block;
}

/* Player 1 pieces - Original golden/yellow color */
.piece.player1-piece .piece-image {
    filter: none;
    /* Original image colors */
}

/* Player 2 pieces - Darkened to appear black */
.piece.player2-piece .piece-image {
    filter: brightness(0.35) contrast(1.3) saturate(0.7) hue-rotate(200deg);
    /* Makes pieces appear dark brown/black with slight blue tint */
}

/* Alternative black filter (choose one) */
.piece.player2-piece .piece-image {
    /* Option 1: Pure dark */
    filter: brightness(0.3) contrast(1.2);
    
    /* Option 2: Dark with slight color */
    /* filter: brightness(0.35) contrast(1.3) saturate(0.7) hue-rotate(200deg); */
    
    /* Option 3: Grayscale black */
    /* filter: grayscale(100%) brightness(0.3) contrast(1.5); */
}

/* Draggable pieces - cursor feedback */
.piece[draggable="true"] {
    cursor: grab;
    transition: transform 0.15s ease;
}

.piece[draggable="true"]:hover {
    transform: scale(1.05);
}

.piece[draggable="true"]:active {
    cursor: grabbing;
}

/* Status borders still work on the piece container */
.piece.status-threatened {
    border-radius: 8px;
    box-shadow: 
        0 0 0 3px rgba(220, 20, 20, 0.9),
        0 0 8px 2px rgba(220, 20, 20, 0.6);
    animation: pulse-threat 1.5s ease-in-out infinite;
}

.piece.status-contested {
    border-radius: 8px;
    box-shadow: 
        0 0 0 3px rgba(255, 165, 0, 0.9),
        0 0 8px 2px rgba(255, 165, 0, 0.6);
    animation: pulse-contested 2s ease-in-out infinite;
}
```

### 3. Mobile Responsive Updates

```css
@media (max-width: 600px) {
    .piece {
        width: 40px;  /* Scale down for mobile */
        height: 48px;
    }
    
    .piece-image {
        max-width: 100%;
        max-height: 100%;
    }
}
```

### 4. Touch Ghost Element Update

**In `game.js` - Update `createTouchGhost()`:**

```javascript
function createTouchGhost(pieceElement) {
    const ghost = document.createElement('div');
    ghost.className = 'touch-ghost-piece';
    
    // Clone the image instead of using text
    const img = pieceElement.querySelector('.piece-image');
    if (img) {
        const ghostImg = img.cloneNode(true);
        ghostImg.style.width = '60px';
        ghostImg.style.height = 'auto';
        ghost.appendChild(ghostImg);
    }
    
    ghost.style.position = 'fixed';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '10000';
    ghost.style.opacity = '0.8';
    ghost.style.transform = 'translate(-50%, -50%)';
    ghost.style.transition = 'none';
    
    // Copy piece styling (player1 or player2 filter)
    if (pieceElement.classList.contains('player1-piece')) {
        ghost.classList.add('player1-piece');
    } else {
        ghost.classList.add('player2-piece');
    }
    
    return ghost;
}
```

### 5. Image Preloading

**Add to initialization in `game.js`:**

```javascript
/**
 * Preload all piece images for better performance
 */
function preloadPieceImages() {
    const pieceTypes = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];
    const promises = pieceTypes.map(type => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = `./assets/white_${type}.png`;
            img.onload = () => {
                console.log(`Loaded: white_${type}.png`);
                resolve();
            };
            img.onerror = () => {
                console.error(`Failed to load: white_${type}.png`);
                reject();
            };
        });
    });
    
    return Promise.all(promises);
}

// Update DOMContentLoaded handler
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Perfect Chess - Phase 11 (Image Pieces) initialized');
    
    // Preload piece images
    try {
        console.log('Preloading piece images...');
        await preloadPieceImages();
        console.log('All piece images loaded successfully!');
    } catch (error) {
        console.error('Some piece images failed to load:', error);
        alert('Failed to load piece images. Please check assets folder.');
        return;
    }
    
    // Wait for chessboard background to load
    try {
        await initializeChessboardGraphics();
    } catch (error) {
        console.error('Graphics initialization failed:', error);
        alert('Failed to load game graphics. Please refresh the page.');
        return;
    }
    
    // ... rest of initialization
});
```

---

## Legend Updates

Update the legend to show image-based pieces instead of Unicode:

```html
<div class="legend-section">
    <h4>Piece Status</h4>
    <div class="legend-item">
        <span class="legend-piece">
            <img src="./assets/white_king.png" class="legend-piece-image player1" alt="White King">
        </span>
        <span>Red Border: Threatened!</span>
    </div>
    <div class="legend-item">
        <span class="legend-piece">
            <img src="./assets/white_king.png" class="legend-piece-image player1" alt="White King">
        </span>
        <span>Orange Border: Trade Available</span>
    </div>
</div>
```

```css
.legend-piece {
    width: 35px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
}

.legend-piece-image {
    width: 30px;
    height: auto;
}

.legend-piece-image.player1 {
    filter: none;
}

.legend-piece-image.player2 {
    filter: brightness(0.35) contrast(1.3) saturate(0.7) hue-rotate(200deg);
}

.legend-piece.threatened {
    box-shadow: 0 0 0 2px rgba(220, 20, 20, 0.9);
}

.legend-piece.contested {
    box-shadow: 0 0 0 2px rgba(255, 165, 0, 0.9);
}
```

---

## Player Color Customization (Future Enhancement)

Once black piece images are added (`black_*.png`):

```javascript
// In renderBoard() - update image source based on player
const imageName = piece.player === 1 ? 'white' : 'black';
img.src = `./assets/${imageName}_${piece.type}.png`;

// Remove CSS filter for player 2
.piece.player2-piece .piece-image {
    filter: none; /* Use actual black images */
}
```

---

## Testing Scenarios

### Visual Testing
- [ ] All 6 piece types render correctly
- [ ] Player 1 pieces show in original golden color
- [ ] Player 2 pieces appear dark/black (via CSS filter)
- [ ] Pieces centered in their tiles
- [ ] Aspect ratios maintained (no stretching)
- [ ] Images crisp and clear

### Functional Testing
- [ ] Click to select piece works
- [ ] Drag and drop works smoothly
- [ ] Piece images follow cursor during drag
- [ ] Legal move indicators still display
- [ ] Attack range overlays work
- [ ] Piece status borders visible around images
- [ ] Touch controls work on mobile
- [ ] Ghost image appears during touch drag

### Performance Testing
- [ ] All images preload before game starts
- [ ] No lag when rendering pieces
- [ ] Smooth 60 FPS during drag operations
- [ ] Mobile performance unchanged

### Game Modes
- [ ] Single player (vs AI) works
- [ ] Local 2-player works
- [ ] Online multiplayer works
- [ ] All special moves work (castling, promotion, en passant)

### Edge Cases
- [ ] Missing image files handled gracefully
- [ ] Failed image loads show error
- [ ] Very small screens scale properly
- [ ] High DPI displays render sharply

---

## File Structure

```
PerfectChess/
├── assets/
│   ├── chessboard.png          (existing)
│   ├── white_pawn.png          ✓ Added
│   ├── white_rook.png          ✓ Added
│   ├── white_knight.png        ✓ Added
│   ├── white_bishop.png        ✓ Added
│   ├── white_queen.png         ✓ Added
│   ├── white_king.png          ✓ Added
│   └── (future: black_*.png)   (Phase 12)
├── game.js                     (update renderBoard, add preloading)
├── styles.css                  (update piece styling)
└── index.html                  (update legend - optional)
```

---

## Implementation Order

### Step 1: Update CSS Styling
1. Remove Unicode text-based styling
2. Add image-based `.piece` and `.piece-image` styles
3. Add player1/player2 filters
4. Test in browser DevTools

### Step 2: Update JavaScript Rendering
1. Modify `renderBoard()` to create `<img>` elements
2. Set correct src paths
3. Add `piece-image` class
4. Disable image dragging (`img.draggable = false`)

### Step 3: Add Image Preloading
1. Create `preloadPieceImages()` function
2. Add to initialization
3. Handle load errors gracefully

### Step 4: Update Touch Ghost
1. Modify `createTouchGhost()` to clone image
2. Test touch drag on mobile/tablet

### Step 5: Update Legend (Optional)
1. Replace Unicode symbols with images
2. Add styled borders to show status examples

### Step 6: Test & Refine
1. Test all piece types
2. Verify drag-and-drop
3. Check status borders
4. Test on mobile
5. Adjust filters if needed

### Step 7: Fine-tune Filters
1. Adjust Player 2 filter for best appearance
2. Test contrast and visibility
3. Ensure pieces distinguishable on all backgrounds

---

## CSS Filter Options for Player 2 (Black)

Test these options and choose the best looking:

```css
/* Option 1: Simple dark (recommended) */
.piece.player2-piece .piece-image {
    filter: brightness(0.35) contrast(1.3);
}

/* Option 2: Dark with slight blue tint */
.piece.player2-piece .piece-image {
    filter: brightness(0.35) contrast(1.3) saturate(0.7) hue-rotate(200deg);
}

/* Option 3: Grayscale black */
.piece.player2-piece .piece-image {
    filter: grayscale(100%) brightness(0.3) contrast(1.5);
}

/* Option 4: Sepia dark (warm black) */
.piece.player2-piece .piece-image {
    filter: sepia(100%) brightness(0.25) contrast(1.4);
}

/* Option 5: Inverted (experimental) */
.piece.player2-piece .piece-image {
    filter: invert(100%) brightness(0.4) contrast(1.3);
}
```

---

## Success Criteria

Phase 11 is complete when:

1. ✅ All pieces render as PNG images instead of Unicode
2. ✅ Player 1 pieces show in original golden color
3. ✅ Player 2 pieces appear dark/black via CSS filter
4. ✅ All 6 piece types display correctly
5. ✅ Drag-and-drop works perfectly with images
6. ✅ Status borders (red/orange) visible around images
7. ✅ Touch support works on mobile
8. ✅ Images preload before game starts
9. ✅ Performance maintained (60 FPS)
10. ✅ No visual glitches or alignment issues
11. ✅ All game modes functional
12. ✅ Mobile responsive scaling works

---

## Estimated Time

**Total: ~2-3 hours**

- CSS updates: 45 min
- JavaScript rendering updates: 1 hour
- Image preloading: 30 min
- Touch ghost updates: 30 min
- Testing and refinement: 45 min
- Filter fine-tuning: 30 min

---

## Future Enhancements (Phase 12+)

### Add Black Piece Images
1. Create/add `black_*.png` images
2. Remove CSS filters
3. Use actual black piece images for Player 2

### Piece Themes
1. Multiple piece sets (classical, modern, minimal)
2. User selection in menu
3. LocalStorage preference

### Animations
1. Piece capture animation
2. Smooth piece movement
3. Promotion selection dialog with images

### Visual Polish
1. Piece shadows on board
2. Glow effects for selected pieces
3. Sparkle effect on captures

---

**This phase will make Perfect Chess look absolutely stunning with professional piece graphics! 🎨♟️**

