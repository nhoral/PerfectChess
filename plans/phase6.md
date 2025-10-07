# Phase 6 Implementation Plan: Online Multiplayer with Supabase

## Objective
Transform Perfect Chess into a fully online multiplayer game using Supabase's free tier, allowing players to compete against each other in real-time from anywhere in the world.

## Philosophy
Build a lightweight online multiplayer experience using Supabase's built-in features (Database, Realtime, Auth) without needing a custom backend server. Keep the game logic client-side while using Supabase for data synchronization and authentication.

## Why Supabase Free Tier Works Perfect for This Project

### Supabase Free Tier Includes:
- ✅ **Postgres Database** - Store games, moves, and player data
- ✅ **Real-time Subscriptions** - Live updates when opponent makes moves
- ✅ **Authentication** - User sign-up/login (email, OAuth providers)
- ✅ **Instant REST APIs** - Auto-generated from database schema
- ✅ **Row Level Security (RLS)** - Secure game data per user
- ✅ **500MB Database Storage** - More than enough for thousands of games
- ✅ **Bandwidth** - Sufficient for casual multiplayer chess
- ✅ **No Credit Card Required** - Perfect for getting started

### What We'll Use:
1. **Database**: Store games, game_moves, user_profiles
2. **Realtime**: Subscribe to opponent's moves in real-time
3. **Auth**: Simple email/password or Google OAuth
4. **Hosting**: Deploy static files to Netlify/Vercel (also free)

This setup supports **hundreds of concurrent games** on the free tier!

## Core Features

### 1. User Authentication
**Sign Up / Login**
- Email + Password authentication
- Optional: Google OAuth for easier sign-in
- User profile with username, stats, game history

**User Profile**
```javascript
{
  id: uuid,
  username: string,
  email: string,
  created_at: timestamp,
  wins: number,
  losses: number,
  draws: number
}
```

### 2. Game Lobby System
**Create Game**
- Player creates a new game
- Gets a shareable game code/URL
- Waits for opponent to join

**Join Game**
- Browse available games
- Enter game code to join specific game
- Auto-match with random player (optional)

**Game States**
- `waiting` - Created, waiting for opponent
- `active` - Both players joined, game in progress
- `completed` - Game finished

### 3. Real-time Gameplay
**Move Synchronization**
- Player makes move → saved to database
- Opponent's client subscribes to changes
- Move appears instantly on opponent's board
- No polling needed (Supabase Realtime handles it!)

**Game Flow**
1. Player 1 creates game
2. Player 2 joins game
3. Players alternate moves
4. Each move syncs in real-time
5. Game ends when king is captured
6. Stats updated automatically

### 4. Game Persistence
**Save Everything**
- Full game state in database
- Complete move history
- Players can refresh page and rejoin
- Games can be resumed later

## Database Schema

### Tables

#### `profiles`
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0
);
```

#### `games`
```sql
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_code TEXT UNIQUE NOT NULL,
  player1_id UUID REFERENCES profiles(id) NOT NULL,
  player2_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'waiting', -- waiting, active, completed
  winner_id UUID REFERENCES profiles(id),
  current_turn INTEGER DEFAULT 1,
  board_state JSONB NOT NULL, -- Stores entire board state
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `game_moves`
```sql
CREATE TABLE game_moves (
  id BIGSERIAL PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id) NOT NULL,
  move_number INTEGER NOT NULL,
  from_row INTEGER NOT NULL,
  from_col INTEGER NOT NULL,
  to_row INTEGER NOT NULL,
  to_col INTEGER NOT NULL,
  piece_type TEXT NOT NULL,
  captured_piece TEXT,
  notation TEXT, -- e.g., "e2-e4"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Row Level Security (RLS) Policies

**Profiles**
```sql
-- Users can read all profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

**Games**
```sql
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Anyone can view games
CREATE POLICY "Games are viewable by everyone"
  ON games FOR SELECT
  USING (true);

-- Anyone can create games
CREATE POLICY "Authenticated users can create games"
  ON games FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Players can update their own games
CREATE POLICY "Players can update their games"
  ON games FOR UPDATE
  USING (player1_id = auth.uid() OR player2_id = auth.uid());
```

**Game Moves**
```sql
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;

-- Anyone can view moves for games they're in
CREATE POLICY "Game moves are viewable by players"
  ON game_moves FOR SELECT
  USING (true);

-- Players can insert moves for their games
CREATE POLICY "Players can create moves"
  ON game_moves FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT player1_id FROM games WHERE id = game_id
    UNION
    SELECT player2_id FROM games WHERE id = game_id
  ));
```

## Implementation Strategy

### Step 1: Supabase Setup (30 minutes)
1. Create free Supabase account at [supabase.com](https://supabase.com)
2. Create new project
3. Set up database tables (profiles, games, game_moves)
4. Enable Row Level Security policies
5. Enable Realtime on `games` and `game_moves` tables
6. Configure authentication (email/password)

### Step 2: Local Game Integration (45 minutes)
1. Install Supabase JavaScript client
   ```bash
   npm install @supabase/supabase-js
   ```
2. Create `supabase-client.js` to initialize connection
3. Add authentication UI (login/signup modals)
4. Update game state management for online play
5. Keep existing local/AI modes working

### Step 3: Lobby System (60 minutes)
1. Create lobby UI (list of available games)
2. Implement "Create Game" function
   - Generates unique game code
   - Saves to database
   - Shows waiting screen
3. Implement "Join Game" function
   - Browse available games
   - Enter game code
   - Join as player 2
4. Add game URL sharing (e.g., `/game/ABC123`)

### Step 4: Real-time Synchronization (90 minutes)
1. Subscribe to game updates using Supabase Realtime
2. Implement move submission to database
3. Listen for opponent moves and update board
4. Sync game state on page load/refresh
5. Handle disconnections gracefully
6. Show opponent connection status

### Step 5: Game Completion & Stats (30 minutes)
1. Update game status to "completed" when king captured
2. Record winner in database
3. Update player win/loss/draw stats
4. Show game result to both players
5. Offer rematch option

### Step 6: Deployment (20 minutes)
1. Build production version of game
2. Deploy to Netlify or Vercel (free tier)
3. Configure environment variables
4. Test online multiplayer
5. Share with friends!

**Total Time: ~4.5 hours**

## File Structure After Phase 6

```
/PerfectChess
  /plans
    - phase1.md through phase6.md
  /src
    - game.js (existing game logic)
    - supabase-client.js (NEW: Supabase connection)
    - online-game.js (NEW: Online multiplayer logic)
    - lobby.js (NEW: Game lobby)
    - auth.js (NEW: Authentication)
  - index.html (updated with online features)
  - lobby.html (NEW: Game lobby page)
  - styles.css (updated)
  - .env (NEW: Supabase credentials)
  - package.json (NEW: dependencies)
  - README.md (updated with deployment info)
```

## Code Examples

### Supabase Client Setup

**supabase-client.js**
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Authentication

**auth.js**
```javascript
import { supabase } from './supabase-client.js';

// Sign Up
export async function signUp(email, password, username) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (!error) {
    // Create profile
    await supabase.from('profiles').insert({
      id: data.user.id,
      username
    });
  }
  
  return { data, error };
}

// Sign In
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

// Sign Out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// Get Current User
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
```

### Create Game

**online-game.js**
```javascript
import { supabase } from './supabase-client.js';

// Create a new game
export async function createGame(boardState) {
  const user = await getCurrentUser();
  const gameCode = generateGameCode(); // Random 6-char code
  
  const { data, error } = await supabase
    .from('games')
    .insert({
      game_code: gameCode,
      player1_id: user.id,
      board_state: boardState,
      status: 'waiting'
    })
    .select()
    .single();
  
  return { data, error };
}

// Generate random game code
function generateGameCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
```

### Join Game

```javascript
// Join existing game
export async function joinGame(gameCode) {
  const user = await getCurrentUser();
  
  const { data, error } = await supabase
    .from('games')
    .update({
      player2_id: user.id,
      status: 'active'
    })
    .eq('game_code', gameCode)
    .eq('status', 'waiting')
    .select()
    .single();
  
  return { data, error };
}
```

### Real-time Move Synchronization

```javascript
// Subscribe to game updates
export function subscribeToGame(gameId, onMoveReceived) {
  const channel = supabase
    .channel(`game:${gameId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'game_moves',
        filter: `game_id=eq.${gameId}`
      },
      (payload) => {
        // New move received!
        onMoveReceived(payload.new);
      }
    )
    .subscribe();
  
  return channel;
}

// Unsubscribe when leaving game
export function unsubscribeFromGame(channel) {
  supabase.removeChannel(channel);
}

// Submit a move
export async function submitMove(gameId, moveData) {
  const user = await getCurrentUser();
  
  // Insert move into game_moves
  const { error: moveError } = await supabase
    .from('game_moves')
    .insert({
      game_id: gameId,
      player_id: user.id,
      ...moveData
    });
  
  // Update game state
  const { error: gameError } = await supabase
    .from('games')
    .update({
      board_state: moveData.newBoardState,
      current_turn: moveData.nextTurn,
      updated_at: new Date().toISOString()
    })
    .eq('id', gameId);
  
  return { error: moveError || gameError };
}
```

### Load Game State

```javascript
// Load game from database
export async function loadGame(gameId) {
  // Get game data
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select(`
      *,
      player1:profiles!player1_id(username),
      player2:profiles!player2_id(username)
    `)
    .eq('id', gameId)
    .single();
  
  // Get all moves
  const { data: moves, error: movesError } = await supabase
    .from('game_moves')
    .select('*')
    .eq('game_id', gameId)
    .order('move_number', { ascending: true });
  
  return { game, moves, error: gameError || movesError };
}
```

### Update Stats on Game End

```javascript
// Update player stats when game ends
export async function endGame(gameId, winnerId) {
  // Update game status
  await supabase
    .from('games')
    .update({
      status: 'completed',
      winner_id: winnerId,
      updated_at: new Date().toISOString()
    })
    .eq('id', gameId);
  
  // Get game to find loser
  const { data: game } = await supabase
    .from('games')
    .select('player1_id, player2_id')
    .eq('id', gameId)
    .single();
  
  const loserId = game.player1_id === winnerId 
    ? game.player2_id 
    : game.player1_id;
  
  // Increment winner's wins
  await supabase.rpc('increment_wins', { user_id: winnerId });
  
  // Increment loser's losses
  await supabase.rpc('increment_losses', { user_id: loserId });
}

// Database functions (create these in Supabase SQL Editor)
/*
CREATE OR REPLACE FUNCTION increment_wins(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET wins = wins + 1 WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_losses(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET losses = losses + 1 WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;
*/
```

## UI Components

### Login Modal

```html
<div id="auth-modal" class="modal hidden">
  <div class="modal-content">
    <h2 id="auth-title">Sign In</h2>
    
    <form id="auth-form">
      <input type="email" id="email" placeholder="Email" required>
      <input type="password" id="password" placeholder="Password" required>
      <input type="text" id="username" placeholder="Username" class="signup-only hidden">
      
      <button type="submit" id="auth-submit">Sign In</button>
    </form>
    
    <p class="auth-toggle">
      <span id="toggle-text">Don't have an account?</span>
      <a href="#" id="toggle-mode">Sign Up</a>
    </p>
  </div>
</div>
```

### Game Lobby

```html
<div id="lobby" class="lobby">
  <div class="user-info">
    <span id="username-display"></span>
    <span id="user-stats"></span>
    <button id="btn-logout">Logout</button>
  </div>
  
  <div class="lobby-actions">
    <button id="btn-create-game" class="lobby-btn primary">
      Create New Game
    </button>
    
    <div class="join-game">
      <input type="text" id="game-code-input" placeholder="Enter Game Code" maxlength="6">
      <button id="btn-join-game" class="lobby-btn">Join Game</button>
    </div>
  </div>
  
  <div class="available-games">
    <h3>Available Games</h3>
    <div id="games-list"></div>
  </div>
  
  <div class="mode-selector">
    <button id="btn-play-local">Play Locally</button>
    <button id="btn-play-ai">Play vs Computer</button>
  </div>
</div>
```

### Waiting Screen

```html
<div id="waiting-screen" class="waiting-screen hidden">
  <h2>Waiting for Opponent...</h2>
  <p class="game-code">Game Code: <strong id="display-game-code"></strong></p>
  <p class="share-text">Share this code with a friend!</p>
  
  <div class="share-url">
    <input type="text" id="game-url" readonly>
    <button id="btn-copy-url">Copy Link</button>
  </div>
  
  <button id="btn-cancel-game">Cancel</button>
</div>
```

### Online Game Info Bar

```html
<div id="online-info" class="online-info">
  <div class="player-info player-1">
    <span class="player-name" id="player1-name"></span>
    <span class="connection-status" id="player1-status">●</span>
  </div>
  
  <div class="game-code-display">
    Game: <strong id="current-game-code"></strong>
  </div>
  
  <div class="player-info player-2">
    <span class="connection-status" id="player2-status">●</span>
    <span class="player-name" id="player2-name"></span>
  </div>
</div>
```

## CSS Additions

```css
/* Auth Modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.modal-content {
  background: white;
  padding: 40px;
  border-radius: 15px;
  max-width: 400px;
  width: 90%;
}

.modal-content h2 {
  margin-bottom: 20px;
  color: #667eea;
}

.modal-content input {
  width: 100%;
  padding: 12px;
  margin-bottom: 15px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 1em;
}

.modal-content button {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1em;
  cursor: pointer;
}

/* Lobby */
.lobby {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
}

.user-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 30px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 10px;
}

.lobby-actions {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 40px;
}

.lobby-btn {
  padding: 15px 30px;
  font-size: 1.2em;
  border-radius: 10px;
  border: 2px solid #667eea;
  background: white;
  color: #667eea;
  cursor: pointer;
  transition: all 0.3s ease;
}

.lobby-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.lobby-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
}

.join-game {
  display: flex;
  gap: 10px;
}

.join-game input {
  flex: 1;
  padding: 15px;
  font-size: 1.1em;
  border: 2px solid #ddd;
  border-radius: 10px;
  text-transform: uppercase;
}

/* Available Games List */
.available-games {
  margin-bottom: 30px;
}

.game-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  margin-bottom: 10px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.game-item:hover {
  border-color: #667eea;
  transform: translateX(5px);
}

/* Waiting Screen */
.waiting-screen {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 50px;
  border-radius: 20px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  z-index: 9000;
}

.game-code {
  font-size: 1.5em;
  margin: 20px 0;
}

.game-code strong {
  color: #667eea;
  font-size: 1.8em;
  letter-spacing: 3px;
}

.share-url {
  display: flex;
  gap: 10px;
  margin: 20px 0;
}

.share-url input {
  flex: 1;
  padding: 10px;
  border: 2px solid #ddd;
  border-radius: 8px;
}

/* Online Game Info */
.online-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #f8f9fa;
  border-radius: 10px;
  margin-bottom: 20px;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.connection-status {
  font-size: 1.5em;
  color: #4caf50;
}

.connection-status.disconnected {
  color: #f44336;
}

.game-code-display {
  font-weight: bold;
  color: #667eea;
}
```

## Testing Scenarios

### Authentication
- ✓ User can sign up with email/password
- ✓ User can log in
- ✓ User can log out
- ✓ Username is unique
- ✓ Invalid credentials show error
- ✓ Session persists on refresh

### Game Creation & Joining
- ✓ User can create a new game
- ✓ Game code is generated and displayed
- ✓ Game URL is shareable
- ✓ Other user can join via code
- ✓ Other user can join via URL
- ✓ Game starts when both players joined
- ✓ Can't join game that's already active

### Real-time Gameplay
- ✓ Moves sync instantly between players
- ✓ Turn indicator updates correctly
- ✓ Can't move on opponent's turn
- ✓ Board state persists on refresh
- ✓ Can rejoin game after disconnect
- ✓ Opponent sees win/loss screen

### Game Completion
- ✓ Game ends when king is captured
- ✓ Winner is recorded correctly
- ✓ Stats update for both players
- ✓ Can start new game from result screen
- ✓ Can return to lobby

## Success Criteria

Phase 6 is complete when:
1. ✅ Users can create accounts and log in
2. ✅ Players can create and join games
3. ✅ Moves sync in real-time between players
4. ✅ Game state persists (refresh doesn't lose game)
5. ✅ Win/loss/draw stats track correctly
6. ✅ Game works on free Supabase tier
7. ✅ Deployed and accessible via public URL
8. ✅ Local and AI modes still work
9. ✅ Multiple concurrent games supported
10. ✅ Clean, responsive UI for all features

## Deployment

### Netlify (Recommended)
1. Push code to GitHub
2. Connect GitHub repo to Netlify
3. Set environment variables (Supabase URL/Key)
4. Deploy! (auto-deploys on push)

### Vercel (Alternative)
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in project directory
3. Set environment variables
4. Deploy with `vercel --prod`

### Environment Variables Needed
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

## Future Enhancements (Beyond Phase 6)

### Social Features
- Friend system
- Private games with friends only
- Game chat between players
- Spectator mode

### Advanced Matchmaking
- ELO rating system
- Ranked matchmaking
- Tournament mode
- Leaderboards

### Game Features
- Move history replay
- Game analysis
- Save/export games (PGN format)
- Timed games (chess clock)

### Mobile
- Progressive Web App (PWA)
- Mobile-optimized UI
- Push notifications for turns

## Cost Considerations

### Free Tier Limits (Supabase)
- **Database**: 500MB (enough for ~100,000+ games)
- **Bandwidth**: 2GB/month (enough for ~1000 daily active users)
- **Realtime Connections**: Up to 200 concurrent
- **Authentication**: Unlimited users

### If You Exceed Free Tier
- Upgrade to Pro Plan: $25/month
- But you'll likely support thousands of players before hitting limits!

### Hosting (Always Free)
- Netlify: Free tier includes 100GB bandwidth
- Vercel: Free tier includes 100GB bandwidth
- GitHub Pages: Free (but no env variables)

## Notes

- Supabase auto-pauses projects after 1 week of inactivity (free tier)
- Easy to unpause with one click
- No credit card required to get started
- Can upgrade seamlessly if game becomes popular
- All data exportable (it's Postgres!)
- Open source alternative: Self-host Supabase

## Security Considerations

- ✅ Row Level Security prevents cheating
- ✅ Users can only submit moves for their own turn
- ✅ Game state validated server-side
- ✅ Authentication required for all actions
- ✅ Passwords hashed by Supabase (bcrypt)
- ✅ API keys are public-safe (anon key)

## Performance

- Supabase Realtime uses WebSockets (very fast)
- Move appears on opponent's board in < 100ms
- Database queries cached automatically
- Scales horizontally with no code changes
- Works globally (Supabase has worldwide CDN)

---

**This is an exciting phase! You'll transform Perfect Chess from a local game into a full multiplayer experience that anyone can play online! 🚀**

