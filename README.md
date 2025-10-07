# Perfect Chess

Perfect Chess is chess but with the board displaying more information about where units can attack and what units are currently at risk. It's meant to provide more information to the player about the current state of the game, and let them visualize the game in a new way.

## 🎨 Visual Features

### Attack Range Visualization
- **Blue tiles**: Player 1 (White) can move/attack here
- **Red tiles**: Player 2 (Black) can move/attack here  
- **Purple tiles**: Both players can reach (contested squares)
- **Piece coloring**: Pieces take on the color of their tile to show if they're protected or under attack

## ✨ Current Features (Phase 6)

✅ **Complete Chess Implementation**
- All standard chess pieces with correct movement rules
- Full game board with coordinate labels
- Win condition when king is captured

✅ **Local Multiplayer**
- Pass-and-play on same device
- Turn-based gameplay

✅ **Computer Opponent (AI)**
- Simple but effective AI that:
  - Prioritizes capturing high-value pieces
  - Controls the center
  - Develops pieces early
  - Makes strategic moves

✅ **Online Multiplayer** (NEW!)
- User authentication (sign up/login)
- Create and join games via game codes
- Real-time move synchronization (via polling every 2 seconds)
- Player stats tracking (wins/losses/draws)
- Share game links with friends
- Persistent game state (refresh and rejoin)

## 🚀 Quick Start

See **[SETUP.md](SETUP.md)** for detailed setup instructions.

### Install & Run
```bash
npm install
npm run dev
```

### For Online Multiplayer
1. Create free Supabase account
2. Run `supabase-setup.sql` in SQL Editor
3. Add your credentials to `.env`
4. That's it! No Realtime/Replication needed.

## 🎮 How to Play

1. **Main Menu**: Choose your game mode
   - 🌐 **Play Online**: Multiplayer via internet (requires account)
   - 🤖 **Play vs Computer**: Local single-player vs AI
   - 👥 **Local 2-Player**: Pass-and-play on same device

2. **Online Mode**:
   - Create a game and share the code
   - Or join a game with a code
   - Moves sync automatically between players

3. **Gameplay**:
   - Click a piece to select it
   - Valid moves are highlighted in green
   - Click destination to move
   - Blue/red/purple shows attack ranges

## 📋 Development Phases

- ✅ **Phase 1**: Basic board with attack visualization
- ✅ **Phase 2**: Piece movement (Queen & Pawn)
- ✅ **Phase 3**: Two-player local gameplay
- ✅ **Phase 4**: All chess pieces & full rules
- ✅ **Phase 5**: Computer opponent (AI)
- ✅ **Phase 6**: Online multiplayer with Supabase

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Supabase (PostgreSQL, Auth, APIs)
- **Build Tool**: Vite
- **Hosting**: Netlify/Vercel (both free)

## 📁 Project Structure

```
PerfectChess/
├── index.html              # Main HTML
├── game.js                 # Core game logic (ES6 module)
├── styles.css              # All styles
├── supabase-client.js      # Database connection
├── auth.js                 # Authentication
├── online-game.js          # Multiplayer logic
├── supabase-setup.sql      # Database schema
├── package.json            # Dependencies
├── vite.config.js          # Build config
├── SETUP.md                # Setup guide
└── plans/                  # Phase implementation plans
    ├── phase1.md through phase6.md
```

## 🔮 Future Enhancements

- Check/checkmate detection
- Special moves (castling, en passant, pawn promotion)
- Move history with replay
- Chess clock (timed games)
- ELO rating system
- Tournaments
- Game analysis
- Mobile app (PWA)

## 📄 License

MIT

---

**Play chess. See the battlefield. Win online.** ♟️