# Perfect Chess - Phase 6 Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://wpnsxanwwunzecurjsfd.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Note:** The `.env` file is already in `.gitignore` and won't be committed to version control.

### 3. Set Up Supabase Database

1. Go to your Supabase project: https://wpnsxanwwunzecurjsfd.supabase.co
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase-setup.sql`
5. Paste into the SQL editor
6. Click **Run** to execute

This will create:
- `profiles` table (user data and stats)
- `games` table (game sessions)
- `game_moves` table (move history)
- Row Level Security policies
- Helper functions for stats
- Realtime subscriptions

### 4. ~~Enable Realtime~~ (Not Required!)

**Good news:** Realtime/Replication is currently in early access and not required! We use **polling** instead (checks for updates every 2 seconds), which works great for turn-based chess.

If Realtime becomes available later, you can enable it for instant updates, but the game works perfectly without it!

### 5. Run Development Server

```bash
npm run dev
```

The game will open in your browser at `http://localhost:3000`

### 6. Build for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` folder.

---

## 🎮 Testing Online Multiplayer

### Test Accounts

You'll need to create at least 2 accounts to test multiplayer:

1. Open the game in two different browsers (or incognito window)
2. Sign up with different emails:
   - Player 1: `test1@example.com` / password / username
   - Player 2: `test2@example.com` / password / username

### Test Flow

1. **Player 1**: Sign in → Create Game → Get game code
2. **Player 2**: Sign in → Join Game → Enter code
3. **Both**: Play chess! Moves sync in real-time
4. **Winner**: See stats update automatically

---

## 📦 Project Structure

```
PerfectChess/
├── supabase-setup.sql      # Database schema (run in Supabase)
├── supabase-client.js      # Supabase connection
├── auth.js                 # Authentication functions
├── online-game.js          # Multiplayer game logic
├── game.js                 # Core chess game logic
├── index.html              # Main HTML file
├── styles.css              # All styles
├── package.json            # Dependencies
├── vite.config.js          # Build configuration
├── .env                    # Environment variables (DO NOT COMMIT)
└── .gitignore              # Git ignore rules
```

---

## 🔒 Security Notes

- The anon key is safe to expose in client-side code
- Row Level Security (RLS) policies protect your data
- Users can only modify their own games/moves
- All passwords are hashed by Supabase (bcrypt)

---

## 🌐 Deployment

### Option 1: Netlify (Recommended)

1. Push code to GitHub
2. Go to [Netlify](https://netlify.com)
3. Click "New site from Git"
4. Connect your repo
5. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Add environment variables in **Site settings** → **Environment variables**:
   ```
   VITE_SUPABASE_URL=https://wpnsxanwwunzecurjsfd.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
7. Deploy!

### Option 2: Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in project directory
3. Follow prompts and add environment variables
4. Deploy with `vercel --prod`

---

## 🐛 Troubleshooting

### "Not authenticated" errors
- Make sure user is signed in
- Check browser console for auth state

### Moves not syncing
- Verify Realtime is enabled on `games` and `game_moves` tables
- Check browser console for subscription errors
- Ensure both players are in the same game

### Database errors
- Verify `supabase-setup.sql` ran successfully
- Check Supabase logs in Dashboard → Logs
- Ensure RLS policies are enabled

### Environment variables not working
- Make sure `.env` file exists in project root
- Verify variable names start with `VITE_`
- Restart dev server after changing `.env`

---

## 📝 Next Steps

After Phase 6 is working:

- [ ] Add friend system
- [ ] Implement chess clock (timed games)
- [ ] Add game chat
- [ ] Create leaderboards
- [ ] Add move hints
- [ ] Implement undo/redo
- [ ] Add game analysis

---

## 🆘 Support

If you run into issues:

1. Check Supabase Dashboard → Logs for errors
2. Check browser console (F12) for JavaScript errors
3. Verify database tables were created correctly
4. Test with simple operations (signup, create profile)

Happy coding! ♟️

