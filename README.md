# Mission Control Dashboard

Real-time dashboard for monitoring AI agent squads. Built for the Moltbot/OpenClaw ecosystem.

![Mission Control](https://img.shields.io/badge/status-alpha-orange)

## Features

- **Agent Status Panel** - Real-time status of all agents (working/standby/offline)
- **Mission Queue** - Kanban-style task board (queue → progress → review → done)
- **Live Activity Feed** - Real-time stream of agent actions

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

## Architecture

```
├── src/                 # React frontend
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── AgentPanel.jsx
│   │   ├── AgentCard.jsx
│   │   ├── MissionQueue.jsx
│   │   ├── TaskCard.jsx
│   │   └── LiveFeed.jsx
│   ├── App.jsx
│   └── index.css
├── server/
│   └── index.js         # Express API
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

## Tech Stack

- **Frontend:** React 19, Tailwind CSS 4, Vite 7
- **Backend:** Express 5, Node.js
- **Styling:** Dark theme, card-based UI

## Credits

Design inspired by [@adithyashreshti](https://twitter.com/adithyashreshti)'s agent dashboard concept.

## License

MIT
