# Phase 8 Implementation Plan: Guest-Only Multiplayer (No Authentication)

## Objective
Remove authentication requirement and simplify online multiplayer to enable instant play. Players can create a game, share a link, and play immediately without signing up.

## Philosophy
Make online chess as frictionless as possible. No accounts, no passwords, no barriers - just instant multiplayer chess with friends.

---

## Core Requirements

### 1. **No Authentication**
- Remove all login/signup UI and flows
- Remove user profile system
- No usernames, emails, or passwords

### 2. **Simple Player Identity**
- Players are identified as "Player 1 (White)" and "Player 2 (Black)"
- No custom names or profiles
- Anonymous, ephemeral sessions

### 3. **One-Link Game Creation**
- Click "Play Online" → immediately get shareable game link
- No intermediate steps, no forms
- Link format: `https://perfectchess.netlify.app/game/ABC123`

### 4. **Auto-Join First Available Slot**
- First person to click link becomes Player 1
- Second person becomes Player 2
- System detects which slot is open if someone disconnects

### 5. **Disconnect Detection & Slot Recovery**
- Track player "last activity" timestamp
- If player inactive for 60+ seconds, mark as disconnected
- Free up their slot for rejoin or new player
- Original player can rejoin via same link

### 6. **Two-Player Limit**
- Once both slots filled, deny entry to additional players
- Show message: "This game is full. Please create a new game."

### 7. **Game Cleanup**
- Delete games immediately after completion
- Delete abandoned games (no activity for 1 hour)
- No game history or persistent records

---

## Database Schema Changes

### Updated `games` Table
```sql
-- Remove player references to user profiles
ALTER TABLE games DROP COLUMN player1_id;
ALTER TABLE games DROP COLUMN player2_id;
ALTER TABLE games DROP COLUMN winner_id;

-- Add new columns for guest sessions
ALTER TABLE games ADD COLUMN player1_session TEXT; -- Unique session ID
ALTER TABLE games ADD COLUMN player2_session TEXT; -- Unique session ID
ALTER TABLE games ADD COLUMN player1_last_active TIMESTAMP WITH TIME ZONE;
ALTER TABLE games ADD COLUMN player2_last_active TIMESTAMP WITH TIME ZONE;
ALTER TABLE games ADD COLUMN player1_connected BOOLEAN DEFAULT false;
ALTER TABLE games ADD COLUMN player2_connected BOOLEAN DEFAULT false;
ALTER TABLE games ADD COLUMN winning_player INTEGER; -- 1 or 2

-- Add game expiry
ALTER TABLE games ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
```

### Remove `profiles` Table
```sql
-- No longer needed without authentication
DROP TABLE IF EXISTS profiles CASCADE;
```

### Update `game_moves` Table
```sql
-- Change player references
ALTER TABLE game_moves DROP COLUMN player_id;
ALTER TABLE game_moves ADD COLUMN player_number INTEGER NOT NULL; -- 1 or 2
```

### Updated `games` Table Structure
```sql
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_code TEXT UNIQUE NOT NULL,
  
  -- Guest session tracking
  player1_session TEXT,
  player2_session TEXT,
  player1_last_active TIMESTAMP WITH TIME ZONE,
  player2_last_active TIMESTAMP WITH TIME ZONE,
  player1_connected BOOLEAN DEFAULT false,
  player2_connected BOOLEAN DEFAULT false,
  
  -- Game state
  status TEXT DEFAULT 'waiting', -- waiting, active, completed
  winning_player INTEGER, -- 1 or 2, null for ongoing
  current_turn INTEGER DEFAULT 1,
  board_state JSONB NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour'
);
```

---

## Row Level Security Updates

### Games Table RLS
```sql
-- Remove auth-based policies
DROP POLICY IF EXISTS "Players can update their games" ON games;
DROP POLICY IF EXISTS "Authenticated users can create games" ON games;

-- New open policies for guest access
CREATE POLICY "Anyone can view games"
  ON games FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create games"
  ON games FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update games"
  ON games FOR UPDATE
  USING (true);
```

### Game Moves Table RLS
```sql
-- Update for guest access
DROP POLICY IF EXISTS "Players can create moves" ON game_moves;

CREATE POLICY "Anyone can view moves"
  ON game_moves FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create moves"
  ON game_moves FOR INSERT
  WITH CHECK (true);
```

---

## Session Management

### Session ID Generation
When a player opens the app:
1. Check `localStorage` for existing `chess_session_id`
2. If not found, generate new UUID: `crypto.randomUUID()`
3. Store in `localStorage` for reconnection

### Connection Tracking
Every 10 seconds while in a game:
1. Update `playerX_last_active` timestamp in database
2. Check opponent's `last_active` timestamp
3. If opponent inactive for >60s, mark as disconnected
4. Show "Opponent disconnected" message

### Rejoin Logic
When clicking game link:
1. Check if session ID matches `player1_session` or `player2_session`
2. **If match:** Rejoin as that player
3. **If no match:** Join first available slot (player1 or player2)
4. **If both slots taken and active:** Deny entry

---

## UI/UX Changes

### Remove Authentication UI
- Delete auth modal (sign in/sign up)
- Delete lobby screen with user profile
- Delete stats display
- Delete logout button

### Simplified Flow

**Before (Phase 7):**
```
Main Menu → Sign In → Lobby → Create Game → Waiting Screen → Game
```

**After (Phase 8):**
```
Main Menu → Play Online → Get Link & Wait → Game
```

### New "Play Online" Flow

**Step 1: Click "Play Online"**
- Immediately create game in database
- Generate shareable link
- Show waiting screen with link

**Step 2: Waiting Screen**
```
┌─────────────────────────────────────┐
│   Waiting for Opponent...           │
│                                      │
│   Share this link with a friend:    │
│   ┌────────────────────────────┐    │
│   │ perfectchess.netlify.app/  │    │
│   │ game/G5UKRN                │ 📋 │
│   └────────────────────────────┘    │
│                                      │
│   [Cancel Game]                     │
└─────────────────────────────────────┘
```

**Step 3: Opponent Joins**
- Game starts automatically
- Show "Player 1 (White)" vs "Player 2 (Black)"

### In-Game Display
```
┌─────────────────────────────────────┐
│ Player 1 (White)    Game: G5UKRN   │
│ ● Connected                         │
│                                     │
│        [Chess Board]                │
│                                     │
│                      Player 2 (Black)│
│                      ● Connected    │
└─────────────────────────────────────┘
```

### Connection Status Indicators
- **Green dot (●)**: Player connected
- **Gray dot (○)**: Player disconnected
- Show message: "Player 2 disconnected. Waiting for rejoin..."

### Game Full Message
When clicking link to full game:
```
┌─────────────────────────────────────┐
│   ❌ Game Full                       │
│                                      │
│   This game already has 2 players.  │
│                                      │
│   [Create New Game] [Back to Menu]  │
└─────────────────────────────────────┘
```

---

## Implementation Details

### 1. Remove Authentication Code

**Files to Modify:**
- `index.html` - Remove auth modal HTML
- `game.js` - Remove auth checks and user profile references
- `supabase-client.js` - Simplify to just database client
- `auth.js` - **Delete this file**
- `styles.css` - Remove auth-related styles

### 2. Session Management

**`session.js` (NEW FILE)**
```javascript
/**
 * Get or create session ID for this browser
 * @returns {string} Session ID
 */
export function getSessionId() {
  let sessionId = localStorage.getItem('chess_session_id');
  
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('chess_session_id', sessionId);
  }
  
  return sessionId;
}

/**
 * Clear session (for testing)
 */
export function clearSession() {
  localStorage.removeItem('chess_session_id');
}
```

### 3. Create Game (Simplified)

**`online-game.js` - Update `createGame()`**
```javascript
import { getSessionId } from './session.js';

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
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
    })
    .select()
    .single();
  
  return { data, error };
}
```

### 4. Join Game Logic

**`online-game.js` - Update `joinGame()`**
```javascript
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
  
  // Check if already in game (reconnecting)
  if (game.player1_session === sessionId) {
    // Rejoin as Player 1
    await supabase
      .from('games')
      .update({
        player1_connected: true,
        player1_last_active: new Date().toISOString()
      })
      .eq('id', game.id);
    
    return { data: { ...game, playerNumber: 1 }, error: null };
  }
  
  if (game.player2_session === sessionId) {
    // Rejoin as Player 2
    await supabase
      .from('games')
      .update({
        player2_connected: true,
        player2_last_active: new Date().toISOString()
      })
      .eq('id', game.id);
    
    return { data: { ...game, playerNumber: 2 }, error: null };
  }
  
  // Try to join as new player
  const now = new Date().toISOString();
  const disconnectThreshold = new Date(Date.now() - 60 * 1000).toISOString();
  
  // Check if Player 1 slot is available
  if (!game.player1_session || 
      (game.player1_last_active < disconnectThreshold && !game.player1_connected)) {
    await supabase
      .from('games')
      .update({
        player1_session: sessionId,
        player1_connected: true,
        player1_last_active: now
      })
      .eq('id', game.id);
    
    return { data: { ...game, playerNumber: 1 }, error: null };
  }
  
  // Check if Player 2 slot is available
  if (!game.player2_session || 
      (game.player2_last_active < disconnectThreshold && !game.player2_connected)) {
    await supabase
      .from('games')
      .update({
        player2_session: sessionId,
        player2_connected: true,
        player2_last_active: now,
        status: 'active' // Game starts when both players join
      })
      .eq('id', game.id);
    
    return { data: { ...game, playerNumber: 2 }, error: null };
  }
  
  // Both slots taken
  return { data: null, error: { message: 'Game is full' } };
}
```

### 5. Connection Heartbeat

**`game.js` - Add heartbeat function**
```javascript
let heartbeatInterval = null;

function startHeartbeat() {
  // Update every 10 seconds
  heartbeatInterval = setInterval(async () => {
    if (!gameState.onlineGameId) return;
    
    const sessionId = getSessionId();
    const playerField = gameState.playerNumber === 1 
      ? 'player1_last_active' 
      : 'player2_last_active';
    
    // Update our last active time
    await supabase
      .from('games')
      .update({
        [playerField]: new Date().toISOString()
      })
      .eq('id', gameState.onlineGameId);
    
    // Check opponent status
    await checkOpponentConnection();
  }, 10000);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

async function checkOpponentConnection() {
  const { data: game } = await supabase
    .from('games')
    .select('player1_last_active, player2_last_active, player1_connected, player2_connected')
    .eq('id', gameState.onlineGameId)
    .single();
  
  if (!game) return;
  
  const opponentField = gameState.playerNumber === 1 ? 'player2' : 'player1';
  const opponentLastActive = new Date(game[`${opponentField}_last_active`]);
  const now = new Date();
  const secondsSinceActive = (now - opponentLastActive) / 1000;
  
  const isDisconnected = secondsSinceActive > 60;
  
  // Update UI with opponent connection status
  updateOpponentStatus(isDisconnected ? 'disconnected' : 'connected');
}
```

### 6. URL Routing

**Add simple URL routing to handle `/game/ABC123` links**

**`game.js` - Add at initialization**
```javascript
document.addEventListener('DOMContentLoaded', async () => {
  // Check URL for game code
  const urlPath = window.location.pathname;
  const gameCodeMatch = urlPath.match(/\/game\/([A-Z0-9]{6})/);
  
  if (gameCodeMatch) {
    const gameCode = gameCodeMatch[1];
    console.log(`Joining game from URL: ${gameCode}`);
    
    // Auto-join game
    await handleAutoJoinGame(gameCode);
  } else {
    // Show main menu
    showMenu();
  }
  
  // ... rest of initialization
});

async function handleAutoJoinGame(gameCode) {
  // Show loading
  document.getElementById('menu-screen').classList.add('hidden');
  document.getElementById('waiting-screen').classList.remove('hidden');
  document.getElementById('waiting-screen').innerHTML = '<h2>Joining game...</h2>';
  
  const result = await joinGame(gameCode);
  
  if (result.error) {
    if (result.error.message === 'Game is full') {
      showGameFullMessage();
    } else {
      showGameNotFoundMessage();
    }
  } else {
    startOnlineGame(result.data);
  }
}
```

### 7. Update Main Menu

**Simplify to 3 buttons:**
```html
<div id="menu-screen" class="menu-screen">
  <h1>Perfect Chess</h1>
  <p class="subtitle">Enhanced Chess with Attack Visualization</p>
  
  <div class="menu-buttons">
    <button id="btn-play-online" class="menu-btn">🌐 Play Online</button>
    <button id="btn-play-ai" class="menu-btn">🤖 Play vs Computer</button>
    <button id="btn-play-local" class="menu-btn">👥 Local 2-Player</button>
  </div>
</div>
```

---

## Testing Scenarios

### Guest Access
- ✓ Can create game without signing in
- ✓ Shareable link generated immediately
- ✓ Second player can join via link
- ✓ No authentication prompts anywhere

### Session & Reconnection
- ✓ Session ID persists in localStorage
- ✓ Closing and reopening browser rejoins same game
- ✓ Can rejoin from same link after disconnect
- ✓ Fills first available slot if original is taken

### Two-Player Limit
- ✓ Third player trying to join sees "Game Full"
- ✓ Can't join if both players active
- ✓ Can join if one player disconnected

### Connection Tracking
- ✓ Heartbeat updates every 10 seconds
- ✓ Opponent marked disconnected after 60s inactivity
- ✓ Reconnection updates status immediately
- ✓ Visual indicators show connection state

### Game Cleanup
- ✓ Completed games deleted from database
- ✓ Abandoned games (1 hour inactive) cleaned up
- ✓ No orphaned data left behind

---

## Database Cleanup Function

**Add automated cleanup (Supabase Edge Function or manual script)**

```sql
-- Delete completed games
DELETE FROM games 
WHERE status = 'completed' 
AND updated_at < NOW() - INTERVAL '5 minutes';

-- Delete expired games
DELETE FROM games 
WHERE expires_at < NOW();

-- Delete abandoned games (no activity for 1 hour)
DELETE FROM games 
WHERE 
  status != 'completed' 
  AND updated_at < NOW() - INTERVAL '1 hour';
```

**Schedule with Supabase pg_cron:**
```sql
SELECT cron.schedule(
  'cleanup-games',
  '*/15 * * * *', -- Every 15 minutes
  $$
  DELETE FROM games WHERE expires_at < NOW() OR status = 'completed';
  $$
);
```

---

## Migration Path

### Step 1: Database Schema Updates
1. Run schema migration in Supabase SQL editor
2. Update RLS policies
3. Test with sample data

### Step 2: Code Updates
1. Remove authentication code
2. Add session management
3. Update online game functions
4. Add URL routing

### Step 3: UI Updates
1. Remove auth modal
2. Simplify main menu
3. Update waiting screen
4. Add connection indicators

### Step 4: Testing
1. Test create/join flow
2. Test reconnection
3. Test game full scenario
4. Test on multiple devices

### Step 5: Deployment
1. Deploy code to Netlify
2. Run database migration
3. Test live

---

## Success Criteria

Phase 8 is complete when:
1. ✅ No authentication required anywhere
2. ✅ Can create game and get shareable link instantly
3. ✅ Second player can join via link
4. ✅ Session persists across browser refresh
5. ✅ Connection status visible for both players
6. ✅ Third player denied entry to full game
7. ✅ Completed games auto-delete
8. ✅ Disconnected players can rejoin
9. ✅ Works on all devices (mobile, desktop)
10. ✅ All existing game modes (local, AI) still work

---

## Estimated Time
**Total: ~4-5 hours**

- Database schema updates: 30 min
- Remove auth code: 45 min
- Session management: 1 hour
- Join/rejoin logic: 1.5 hours
- Connection tracking: 1 hour
- UI updates: 45 min
- Testing & debugging: 1 hour

---

## Future Enhancements (Beyond Phase 8)

### Optional Features
- **Game expiry notifications**: "This game will expire in 10 minutes"
- **Spectator mode**: Allow third+ players to watch
- **Game history**: View move history within current game
- **Mobile optimizations**: Better mobile UX
- **Share buttons**: Direct share to WhatsApp, Discord, etc.

### Re-adding Authentication (Optional)
If you want to add accounts back later:
- Keep guest mode as default
- Add optional "Sign in to save stats" feature
- Hybrid approach: guests + optional accounts

---

**This phase will make Perfect Chess instantly playable with zero friction! 🚀♟️**

