/* eslint-env node */
import express from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'
import { WebSocketServer } from 'ws'
import { watch } from 'chokidar'
import http from 'http'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

import { 
  parseMissionFile, 
  shouldAutoArchive, 
  getStatusTransitionAction 
} from './missionParser.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 8888
const WS_PORT = 3001

// Base paths - adjust to your clawd installation
const CLAWD_PATH = process.env.CLAWD_PATH || '/home/node/clawd'
const AGENTS_PATH = path.join(CLAWD_PATH, 'agents')
const MISSION_CONTROL_PATH = path.join(CLAWD_PATH, 'mission-control')
const MEMORY_PATH = path.join(CLAWD_PATH, 'memory')

// Ensure completed directory exists
const ACTIVE_PATH = path.join(MISSION_CONTROL_PATH, 'active')
const COMPLETED_PATH = path.join(MISSION_CONTROL_PATH, 'completed')

async function ensureDirectories() {
  try {
    await fs.mkdir(ACTIVE_PATH, { recursive: true })
    await fs.mkdir(COMPLETED_PATH, { recursive: true })
  } catch (err) {
    console.error('Error creating directories:', err.message)
  }
}
ensureDirectories()

app.use(cors())
app.use(express.json())

// Known agent emojis and roles (from SQUAD.md)
const AGENT_META = {
  jarvis: { emoji: '🎯', role: 'Chief Orchestrator', color: '#6366f1' },
  hunter: { emoji: '🎯', role: 'Sales & Relationships', color: '#f97316' },
  inbox: { emoji: '📧', role: 'Email Intelligence', color: '#06b6d4' },
  money: { emoji: '💰', role: 'Revenue Intelligence', color: '#22c55e' },
  linkedin: { emoji: '💼', role: 'LinkedIn Growth', color: '#0077b5' },
  xpert: { emoji: '🐦', role: 'X/Twitter', color: '#000000' },
  dispatch: { emoji: '📰', role: 'Newsletter', color: '#8b5cf6' },
  scout: { emoji: '🔍', role: 'Research & Intel', color: '#eab308' },
  forge: { emoji: '🔨', role: 'Builder/Developer', color: '#ef4444' },
  oracle: { emoji: '🔮', role: 'Trading Intelligence', color: '#a855f7' },
  vibe: { emoji: '🎨', role: 'Marketing Systems', color: '#ec4899' },
  sentinel: { emoji: '🛡️', role: 'Security & Ops', color: '#6b7280' },
  nexus: { emoji: '🔗', role: 'System Intelligence', color: '#14b8a6' },
  claw: { emoji: '🦀', role: 'OpenClaw Specialist', color: '#f43f5e' },
  critic: { emoji: '🎭', role: 'Quality Control', color: '#84cc16' },
}

// ============================================
// In-memory state for tracking missions
// ============================================

// Cache of parsed missions (filename -> mission object)
const missionCache = new Map()

// Activity feed (keep last 100 items)
const activityFeed = []
const MAX_FEED_ITEMS = 100

function addToFeed(activity) {
  const item = {
    id: `${activity.agent || 'system'}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    ...activity
  }
  activityFeed.unshift(item)
  if (activityFeed.length > MAX_FEED_ITEMS) {
    activityFeed.pop()
  }
  return item
}

// ============================================
// WebSocket Server & File Watching
// ============================================

const server = http.createServer(app)
const wss = new WebSocketServer({ port: WS_PORT })

// Store connected clients
const clients = new Set()

wss.on('connection', (ws) => {
  console.log('WebSocket client connected')
  clients.add(ws)
  
  // Send initial connection confirmation
  ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }))
  
  ws.on('close', () => {
    clients.delete(ws)
    console.log('WebSocket client disconnected')
  })
  
  ws.on('error', (err) => {
    console.error('WebSocket error:', err)
    clients.delete(ws)
  })
})

// Broadcast to all connected clients
function broadcast(event) {
  const message = JSON.stringify(event)
  for (const client of clients) {
    if (client.readyState === 1) { // OPEN
      client.send(message)
    }
  }
}

// File watcher setup
const watchPaths = [
  path.join(MEMORY_PATH, '*', 'WORKING.md'),
  path.join(ACTIVE_PATH, '*.md'),
  path.join(COMPLETED_PATH, '*.md'),
  path.join(CLAWD_PATH, 'dashboard', 'state.json'),
]

const watcher = watch(watchPaths, {
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 300,
    pollInterval: 100
  }
})

// Debounce map to prevent rapid-fire events
const debounceMap = new Map()
function debounce(key, fn, delay = 500) {
  if (debounceMap.has(key)) {
    clearTimeout(debounceMap.get(key))
  }
  debounceMap.set(key, setTimeout(() => {
    fn()
    debounceMap.delete(key)
  }, delay))
}

// Process mission file change
async function handleMissionChange(filePath) {
  const filename = path.basename(filePath)
  
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const mission = parseMissionFile(content, filename)
    
    // Get previous state for comparison
    const previousMission = missionCache.get(filename)
    const previousStatus = previousMission?.status
    
    // Update cache
    missionCache.set(filename, mission)
    
    // Detect status changes
    if (previousStatus && previousStatus !== mission.status) {
      const action = getStatusTransitionAction(previousStatus, mission.status)
      
      // Add to activity feed
      const feedItem = addToFeed({
        agent: mission.assigned_to || 'SYSTEM',
        action,
        target: mission.title,
        targetType: 'mission',
        status: mission.status
      })
      
      broadcast({
        type: 'feed:activity',
        payload: {
          ...feedItem,
          time: 'just now',
          _new: true
        }
      })
      
      // Check for auto-archive
      if (shouldAutoArchive(previousStatus, mission.status)) {
        await autoArchiveMission(filePath, mission)
        return // Don't broadcast update, archive will handle it
      }
    }
    
    // Detect assignment changes
    if (previousMission && previousMission.assigned_to !== mission.assigned_to) {
      const feedItem = addToFeed({
        agent: mission.assigned_to || 'SYSTEM',
        action: mission.assigned_to ? 'assigned to self' : 'unassigned',
        target: mission.title,
        targetType: 'mission'
      })
      
      broadcast({
        type: 'feed:activity',
        payload: {
          ...feedItem,
          time: 'just now',
          _new: true
        }
      })
    }
    
    // Broadcast the update
    broadcast({
      type: 'mission:update',
      payload: mission
    })
    
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Error reading mission ${filename}:`, err.message)
    }
  }
}

// Auto-archive mission when status becomes done
async function autoArchiveMission(filePath, mission) {
  const filename = path.basename(filePath)
  const completedPath = path.join(COMPLETED_PATH, filename)
  
  try {
    // Move file to completed directory
    await fs.rename(filePath, completedPath)
    console.log(`Auto-archived: ${filename}`)
    
    // Remove from cache (will be re-added when watching completed dir)
    missionCache.delete(filename)
    
    // Add completion to feed
    const feedItem = addToFeed({
      agent: mission.assigned_to || 'SYSTEM',
      action: 'completed',
      target: mission.title,
      targetType: 'mission'
    })
    
    // Broadcast completion event
    broadcast({
      type: 'mission:complete',
      payload: {
        id: mission.id,
        filename,
        title: mission.title,
        assigned_to: mission.assigned_to
      }
    })
    
    broadcast({
      type: 'feed:activity',
      payload: {
        ...feedItem,
        time: 'just now',
        _new: true
      }
    })
    
  } catch (err) {
    console.error(`Error auto-archiving ${filename}:`, err.message)
    // Still broadcast the update even if archive fails
    broadcast({
      type: 'mission:update',
      payload: mission
    })
  }
}

watcher.on('change', async (filePath) => {
  debounce(filePath, async () => {
    console.log(`File changed: ${filePath}`)
    
    // Determine what type of change this is
    if (filePath.includes('/memory/') && filePath.endsWith('WORKING.md')) {
      // Agent status update
      const match = filePath.match(/memory\/(\w+)\/WORKING\.md/)
      if (match) {
        const agentDir = match[1]
        const status = await getAgentStatus(agentDir)
        const task = await getAgentTask(agentDir)
        
        broadcast({
          type: 'agent:status',
          payload: {
            id: agentDir,
            name: agentDir.toUpperCase(),
            status,
            currentTask: task,
            lastSeen: Date.now()
          }
        })
        
        // Add to activity feed
        const feedItem = addToFeed({
          agent: agentDir.toUpperCase(),
          action: status === 'working' ? 'is working on' : 'updated status',
          target: task || 'standby',
          targetType: 'status'
        })
        
        broadcast({
          type: 'feed:activity',
          payload: {
            ...feedItem,
            time: 'just now',
            type: 'status',
            _new: true
          }
        })
      }
    } else if (filePath.includes('/mission-control/active/')) {
      await handleMissionChange(filePath)
    } else if (filePath.includes('/mission-control/completed/')) {
      // Just update the mission in done column
      const filename = path.basename(filePath)
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        const mission = parseMissionFile(content, filename)
        mission.status = 'done' // Force done status
        broadcast({
          type: 'mission:update',
          payload: mission
        })
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`Error reading completed mission ${filename}:`, err.message)
        }
      }
    } else if (filePath.endsWith('state.json')) {
      // Dashboard state update - refresh all agents
      broadcast({ type: 'agents:refresh' })
    }
  })
})

watcher.on('add', (filePath) => {
  if (filePath.includes('/mission-control/active/')) {
    debounce(`add-${filePath}`, async () => {
      const filename = path.basename(filePath)
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        const mission = parseMissionFile(content, filename)
        
        // Add to cache
        missionCache.set(filename, mission)
        
        // Add creation to feed
        const feedItem = addToFeed({
          agent: mission.assigned_to || 'SYSTEM',
          action: 'created',
          target: mission.title,
          targetType: 'mission'
        })
        
        broadcast({
          type: 'mission:new',
          payload: mission
        })
        
        broadcast({
          type: 'feed:activity',
          payload: {
            ...feedItem,
            time: 'just now',
            _new: true
          }
        })
        
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`Error reading new mission ${filename}:`, err.message)
        }
      }
    })
  }
})

watcher.on('unlink', (filePath) => {
  if (filePath.includes('/mission-control/active/')) {
    const filename = path.basename(filePath)
    
    // Get from cache before removing
    const mission = missionCache.get(filename)
    missionCache.delete(filename)
    
    broadcast({
      type: 'mission:removed',
      payload: { 
        id: mission?.id || filename,
        filename 
      }
    })
  }
})

// Periodic stats broadcast (every 10 seconds)
setInterval(async () => {
  const agents = Object.keys(AGENT_META)
  let activeCount = 0
  
  for (const agent of agents) {
    const status = await getAgentStatus(agent)
    if (status === 'working') activeCount++
  }
  
  // Count queued missions
  let queuedMissions = 0
  try {
    const files = await fs.readdir(ACTIVE_PATH)
    queuedMissions = files.filter(f => f.endsWith('.md')).length
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Error counting missions:', err.message)
    }
  }
  
  broadcast({
    type: 'stats:update',
    payload: {
      activeAgents: activeCount,
      totalAgents: agents.length,
      queuedMissions,
      timestamp: Date.now()
    }
  })
}, 10000)

// ============================================
// REST API Endpoints
// ============================================

// Helper: Get agent info from AGENT_META (canonical source)
async function parseAgentSoul(agentDir) {
  const meta = AGENT_META[agentDir.toLowerCase()] || {}
  return { 
    name: agentDir.toUpperCase(), 
    emoji: meta.emoji || '🤖', 
    role: meta.role || 'Agent',
    color: meta.color || '#6b7280',
    dir: agentDir 
  }
}

// Helper: Determine agent status from WORKING.md and session activity
async function getAgentStatus(agentDir) {
  try {
    // WORKING.md is in memory/{agent}/WORKING.md, not agents/{agent}/
    const workingPath = path.join(MEMORY_PATH, agentDir, 'WORKING.md')
    const stats = await fs.stat(workingPath)
    const mtime = stats.mtime.getTime()
    const now = Date.now()
    const ageMinutes = (now - mtime) / 1000 / 60
    
    // Also try to read the status from state.json
    try {
      const stateJson = path.join(CLAWD_PATH, 'dashboard', 'state.json')
      const stateContent = await fs.readFile(stateJson, 'utf-8')
      const state = JSON.parse(stateContent)
      const agentState = state.agents?.[agentDir.toLowerCase()]
      if (agentState) {
        // Map state.json status to our status
        if (agentState.status === 'active' || agentState.status === 'working') return 'working'
        if (agentState.status === 'blocked') return 'blocked'
        if (agentState.status === 'idle') return 'standby'
        // Use file mtime as fallback
      }
    } catch (err) {
      // state.json is optional, ignore ENOENT
      if (err.code !== 'ENOENT') {
        console.error(`Error reading state.json for ${agentDir}:`, err.message)
      }
    }
    
    // If WORKING.md was modified in last 5 minutes = working
    // If modified in last 30 minutes = standby  
    // Otherwise = offline
    if (ageMinutes < 5) return 'working'
    if (ageMinutes < 30) return 'standby'
    return 'offline'
  } catch (err) {
    // Missing WORKING.md means agent is offline
    if (err.code !== 'ENOENT') {
      console.error(`Error checking status for ${agentDir}:`, err.message)
    }
    return 'offline'
  }
}

// Helper: Get agent's current task from WORKING.md or state.json
async function getAgentTask(agentDir) {
  try {
    // Try state.json first (has currentTask)
    const stateJson = path.join(CLAWD_PATH, 'dashboard', 'state.json')
    const stateContent = await fs.readFile(stateJson, 'utf-8')
    const state = JSON.parse(stateContent)
    const agentState = state.agents?.[agentDir.toLowerCase()]
    if (agentState?.currentTask) {
      return agentState.currentTask
    }
  } catch (err) {
    // state.json is optional
    if (err.code !== 'ENOENT') {
      console.error(`Error reading state.json for task:`, err.message)
    }
  }
  
  try {
    // Fallback to WORKING.md first line
    const workingPath = path.join(MEMORY_PATH, agentDir, 'WORKING.md')
    const content = await fs.readFile(workingPath, 'utf-8')
    // Match "Current:", "Current Task:", or "Status:"
    const firstTask = content.match(/(?:Current(?:\s+Task)?|Status):\s*(.+)/i)
    return firstTask ? firstTask[1].trim().slice(0, 60) : null
  } catch (err) {
    // Ignore missing files, log other errors
    if (err.code !== 'ENOENT') {
      console.error(`Error reading task for ${agentDir}:`, err.message)
    }
    return null
  }
}

// GET /api/agents - List all agents with status
app.get('/api/agents', async (req, res) => {
  try {
    // Use known agent list instead of scanning dirs
    const knownAgents = Object.keys(AGENT_META)
    
    const agents = await Promise.all(knownAgents.map(async (dir) => {
      const soul = await parseAgentSoul(dir)
      const status = await getAgentStatus(dir)
      const currentTask = await getAgentTask(dir)
      
      // Determine agent type (JARVIS is EXEC, others are SPC)
      const type = dir.toLowerCase() === 'jarvis' ? 'EXEC' : 'SPC'
      
      return { ...soul, status, type, currentTask }
    }))
    
    // Sort: working first, then blocked, then standby, then offline
    const order = { working: 0, blocked: 1, standby: 2, offline: 3 }
    agents.sort((a, b) => order[a.status] - order[b.status])
    
    res.json({ agents })
  } catch (err) {
    console.error('Error fetching agents:', err)
    res.json({ agents: [] })
  }
})

// GET /api/missions - Get missions by status
app.get('/api/missions', async (req, res) => {
  try {
    const missions = { queue: [], progress: [], review: [], done: [] }
    
    // Read active missions
    try {
      const activeFiles = await fs.readdir(ACTIVE_PATH)
      
      for (const file of activeFiles) {
        if (file.endsWith('.md')) {
          const content = await fs.readFile(path.join(ACTIVE_PATH, file), 'utf-8')
          const mission = parseMissionFile(content, file)
          
          // Update cache
          missionCache.set(file, mission)
          
          // Categorize by status
          const col = mission.status === 'progress' ? 'progress' 
                    : mission.status === 'review' ? 'review'
                    : mission.status === 'done' ? 'done'
                    : 'queue'
          missions[col].push(mission)
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('Error reading active missions:', err.message)
      }
    }
    
    // Read completed missions (last 10)
    try {
      const completedFiles = await fs.readdir(COMPLETED_PATH)
      
      for (const file of completedFiles.slice(-10)) {
        if (file.endsWith('.md')) {
          const content = await fs.readFile(path.join(COMPLETED_PATH, file), 'utf-8')
          const mission = parseMissionFile(content, file)
          mission.status = 'done' // Force done status
          missions.done.push(mission)
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('Error reading completed missions:', err.message)
      }
    }
    
    // Sort by priority within each column
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    for (const col of Object.keys(missions)) {
      missions[col].sort((a, b) => 
        (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
      )
    }
    
    res.json(missions)
  } catch (err) {
    console.error('Error fetching missions:', err)
    res.json({ queue: [], progress: [], review: [], done: [] })
  }
})

// GET /api/feed - Get recent activity
app.get('/api/feed', async (req, res) => {
  try {
    // Return cached feed if available
    if (activityFeed.length > 0) {
      const feed = activityFeed.map(item => ({
        ...item,
        time: formatRelativeTime(new Date(item.timestamp))
      }))
      return res.json({ feed })
    }
    
    // Otherwise build initial feed from WORKING.md files
    const feed = []
    const knownAgents = Object.keys(AGENT_META)
    
    // Check each agent's WORKING.md for recent activity
    for (const agentDir of knownAgents) {
      try {
        const workingPath = path.join(MEMORY_PATH, agentDir, 'WORKING.md')
        const content = await fs.readFile(workingPath, 'utf-8')
        const stats = await fs.stat(workingPath)
        const mtime = stats.mtime
        const ageMinutes = (Date.now() - mtime.getTime()) / 1000 / 60
        
        // Only include recently active agents
        if (ageMinutes < 60) {
          // Add status update based on current task
          const taskMatch = content.match(/(?:Current(?:\s+Task)?|Status):\s*(.+)/i)
          if (taskMatch) {
            feed.push({
              id: `${agentDir}-status-${Date.now()}`,
              agent: agentDir.toUpperCase(),
              action: 'is working on',
              target: taskMatch[1].trim().slice(0, 50),
              time: formatRelativeTime(mtime),
              type: 'status',
              timestamp: mtime.toISOString()
            })
          }
        }
      } catch (err) {
        // Missing WORKING.md is expected for some agents
        if (err.code !== 'ENOENT') {
          console.error(`Error reading feed for ${agentDir}:`, err.message)
        }
      }
    }
    
    // Sort by recency
    feed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    
    res.json({ feed: feed.slice(0, 30) })
  } catch (err) {
    console.error('Error fetching feed:', err)
    res.json({ feed: [] })
  }
})

// Format timestamp as relative time
function formatRelativeTime(date) {
  const now = Date.now()
  const then = date instanceof Date ? date.getTime() : new Date(date).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    websocket: {
      port: WS_PORT,
      clients: clients.size
    },
    cache: {
      missions: missionCache.size,
      feedItems: activityFeed.length
    }
  })
})

// Serve static files from dist/ in production
const distPath = path.join(__dirname, '..', 'dist')
app.use(express.static(distPath))

// SPA fallback - serve index.html for all non-API routes
// Note: Express 5 requires named params, use {*path} instead of *
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mission Control v4 running on http://0.0.0.0:${PORT}`)
  console.log(`WebSocket server running on ws://0.0.0.0:${WS_PORT}`)
  console.log(`Reading from: ${CLAWD_PATH}`)
  console.log(`Watching: ${watchPaths.join(', ')}`)
  console.log(`Active missions: ${ACTIVE_PATH}`)
  console.log(`Completed missions: ${COMPLETED_PATH}`)
})
