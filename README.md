# RushOnCash - Telegram Mini App Ecosystem

A complete Telegram Mini App platform for earning money through games, ads, and tasks.

## 🏗️ Architecture

```
rushoncash-ecosystem/
├── bot/                 # Telegram Bot (Telegraf) - Railway
├── mini-app/            # React Mini App - Vercel
├── admin-panel/         # React Admin Panel - Vercel
├── shared/              # Shared types, constants, API
├── supabase/            # Database schema & migrations
└── railway.toml         # Railway deployment config
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Supabase account
- Telegram Bot (from @BotFather)
- Railway account (for bot)
- Vercel account (for mini-app & admin)

### 1. Clone & Install
```bash
git clone <repo>
cd rushoncash-ecosystem
npm install
```

### 2. Setup Supabase
1. Create new Supabase project
2. Run migrations: `npm run db:migrate`
3. Run seed: `npm run db:seed`
4. Copy Supabase URL & keys to `.env`

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your values
```

### 4. Development
```bash
# Terminal 1 - Bot
npm run dev:bot

# Terminal 2 - Mini App
npm run dev:mini-app

# Terminal 3 - Admin Panel
npm run dev:admin
```

### 5. Deploy

#### Bot → Railway
1. Connect GitHub repo to Railway
2. Set environment variables in Railway dashboard
3. Deploy from `bot/` directory
4. Set webhook: `https://your-app.railway.app/api/webhook`

#### Mini App → Vercel
1. Connect GitHub repo to Vercel
2. Set root directory to `mini-app/`
3. Add environment variables
4. Deploy

#### Admin Panel → Vercel
1. Connect GitHub repo to Vercel
2. Set root directory to `admin-panel/`
3. Add environment variables
4. Deploy (use subdomain like `admin.yourdomain.com`)

## 🎮 Features

### Mini App
- **CoinFlip** - 50/50 coin toss game
- **Spin Wheel** - Configurable probability wheel
- **Ad Watching** - Monetag, GigaPub, Adsgram with fallback
- **Tasks** - Telegram channel, YouTube, Facebook, daily login
- **Referral System** - Earn per referral
- **Withdrawals** - bKash, Nagad, Rocket, Binance
- **Leaderboard** - Compete with other players

### Telegram Bot
- User registration & referral tracking
- Balance checking
- Withdrawal requests
- Admin commands (broadcast, stats, user management)
- Webhook-based for scalability

### Admin Panel
- Dashboard with real-time stats
- User management (search, edit balance, ban/unban)
- Withdrawal queue (approve/reject)
- Game configuration (rewards, limits, probabilities)
- Ad network configuration
- Task rewards configuration
- Bot configuration
- Analytics & charts

## 🗄️ Database Schema

- **users** - User profiles, balances, referrals
- **games_log** - Game history with provably fair seeds
- **withdrawals** - Withdrawal requests & status
- **tasks** - Task completion tracking
- **referrals** - Referral relationships
- **ads_log** - Ad watching history
- **app_config** - Dynamic configuration
- **admin_logs** - Audit trail

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| Bot Runtime | Node.js + Telegraf |
| Mini App | React 18 + Vite + TypeScript |
| Admin Panel | React 18 + Vite + TypeScript |
| Database | Supabase (PostgreSQL) |
| Real-time | Supabase Realtime |
| Bot Hosting | Railway |
| Frontend Hosting | Vercel |
| Styling | Tailwind CSS |
| State | Zustand + React Context |
| Validation | Zod |

## 📱 Telegram Mini App Setup

1. Create bot with @BotFather
2. Set Mini App URL in BotFather: `https://your-mini-app.vercel.app`
3. Configure Web App button in bot commands
4. Set webhook URL in bot code

## 🛡️ Security

- Row Level Security (RLS) on all tables
- JWT authentication via Supabase
- Admin-only routes protected
- Input validation with Zod
- Rate limiting on API endpoints
- CORS configured for specific domains

## 📊 Monitoring

- Railway metrics for bot
- Vercel analytics for frontend
- Supabase dashboard for database
- Admin panel analytics page

## 📝 License

MIT License - feel free to use for your own projects!

## 🤝 Contributing

1. Fork the repo
2. Create feature branch
3. Commit changes
4. Open Pull Request

## 📞 Support

For issues, open a GitHub issue or contact via Telegram @support