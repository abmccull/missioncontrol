# Mission Control Dashboard

Real-time dashboard for monitoring AI agent squads. Built for the Moltbot/OpenClaw ecosystem.

![Mission Control](https://img.shields.io/badge/status-alpha-orange)
![Vercel](https://img.shields.io/badge/deploy-vercel-black)
![Mobile Responsive](https://img.shields.io/badge/mobile-responsive-green)

## Features

- **Agent Status Panel** - Real-time status of all agents (working/standby/offline)
- **Mission Queue** - Kanban-style task board (queue → progress → review → done)
- **Live Activity Feed** - Real-time stream of agent actions
- **Mobile Responsive** - Works on desktop, tablet, and mobile devices

## Quick Start

```bash
# Install dependencies (use pnpm)
pnpm install

# Run development server (frontend + API)
pnpm start

# Or run separately:
pnpm run dev      # Frontend on port 3000
pnpm run server   # API on port 3001
```

## Mobile Features

The dashboard is fully responsive with these mobile-specific features:

- **Bottom Navigation** - Switch between Agents, Missions, and Feed views
- **Swipeable Columns** - Horizontal swipe through mission columns on mobile
- **Hamburger Menu** - Slide-out agent panel
- **Touch-Friendly** - 44px minimum tap targets
- **Safe Area Support** - Proper handling of notched devices

### Breakpoints

| Breakpoint | Layout |
|------------|--------|
| Desktop (1200px+) | 3-column layout |
| Tablet (768-1199px) | 2-column layout |
| Mobile (<768px) | Single column with bottom nav |

## Architecture

```
├── src/                 # React frontend
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── AgentPanel.jsx
│   │   ├── AgentCard.jsx
│   │   ├── MissionQueue.jsx
│   │   ├── TaskCard.jsx
│   │   ├── LiveFeed.jsx
│   │   └── MobileNav.jsx
│   ├── App.jsx
│   └── index.css
├── server/
│   └── index.js         # Express API
├── .github/
│   └── workflows/
│       └── deploy.yml   # CI/CD pipeline
├── vercel.json          # Vercel config
└── package.json
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/agents` | List all agents with status |
| `GET /api/missions` | Get missions grouped by status |
| `GET /api/feed` | Recent activity feed |
| `GET /api/health` | Health check |

## Data Sources

The API reads from the clawd filesystem:

- `agents/*/SOUL.md` - Agent identity (name, role, emoji)
- `agents/*/WORKING.md` - Agent status (last modified time)
- `mission-control/active/*.md` - Active missions
- `mission-control/completed/*.md` - Completed missions
- `agents/*/memory/*.md` - Activity logs

## Configuration

Set `CLAWD_PATH` environment variable to point to your clawd installation:

```bash
CLAWD_PATH=/home/node/clawd npm run server
```

---

## Deployment

### Vercel (Recommended)

This project includes CI/CD via GitHub Actions for automatic Vercel deployments.

#### Setup

1. **Create Vercel Project**
   ```bash
   # Install Vercel CLI
   pnpm add -g vercel
   
   # Link project (first time)
   vercel
   ```

2. **Get Vercel Credentials**
   - Go to [Vercel Account Settings](https://vercel.com/account/tokens) → Create token
   - Go to your project settings → General → copy "Project ID" and "Team ID" (Org ID)

3. **Add GitHub Secrets**
   
   Go to your repo → Settings → Secrets and variables → Actions → New repository secret:
   
   | Secret | Description |
   |--------|-------------|
   | `VERCEL_TOKEN` | Your Vercel API token |
   | `VERCEL_ORG_ID` | Your Vercel Team/Org ID |
   | `VERCEL_PROJECT_ID` | Your Vercel Project ID |

4. **Push to Deploy**
   - Push to `main` → Production deployment
   - Open PR → Preview deployment with comment

### CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/deploy.yml`) provides:

- **Lint & Build** - Runs on every push/PR
- **Preview Deployments** - Automatic preview URLs on PRs
- **Production Deployments** - Auto-deploy to production on merge to main

### Manual Deployment

```bash
# Deploy preview
vercel

# Deploy production
vercel --prod
```

---

## Tech Stack

- **Frontend:** React 19, Tailwind CSS 4, Vite 7
- **Backend:** Express 5, Node.js
- **Styling:** Dark theme, card-based UI, mobile-first responsive
- **CI/CD:** GitHub Actions, Vercel

## Credits

Design inspired by [@adithyashreshti](https://twitter.com/adithyashreshti)'s agent dashboard concept.

## License

MIT
