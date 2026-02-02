/* eslint-env node */
/* global process */
import express from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { WebSocketServer } from 'ws'
import { watch } from 'chokidar'
import http from 'http'

import { fileURLToPath } from 'url'
import { dirname } from 'path'

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
// WebSocket Server & File Watching
// ============================================

const _server = http.createServer(app)
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
  path.join(MISSION_CONTROL_PATH, 'active', '*.md'),
  path.join(MISSION_CONTROL_PATH, 'completed', '*.md'),
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
        
        // Also broadcast to feed
        broadcast({
          type: 'feed:activity',
          payload: {
            id: `${agentDir}-${Date.now()}`,
            agent: agentDir.toUpperCase(),
            action: status === 'working' ? 'is working' : 'updated',
            target: task || 'status',
            time: 'just now',
            type: 'status'
          }
        })
      }
    } else if (filePath.includes('/mission-control/')) {
      // Mission update
      const filename = path.basename(filePath)
      if (filePath.includes('/active/')) {
        try {
          const content = await fs.readFile(filePath, 'utf-8')
          const mission = parseMissionFile(content, filename)
          broadcast({
            type: 'mission:update',
            payload: mission
          })
        } catch (err) {
          if (err.code !== 'ENOENT') {
            console.error(`Error reading mission ${filename}:`, err.message)
          }
        }
      } else if (filePath.includes('/completed/')) {
        broadcast({
          type: 'mission:complete',
          payload: { id: filename }
        })
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
        broadcast({
          type: 'mission:new',
          payload: mission
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
    broadcast({
      type: 'mission:removed',
      payload: { id: filename }
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
    const files = await fs.readdir(path.join(MISSION_CONTROL_PATH, 'active'))
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
// REST API Endpoints (existing)
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
    
    // Status based on WORKING.md mtime:
    // ACTIVE (green): modified < 2 min ago
    // STANDBY (yellow): modified < 30 min ago
    // OFFLINE (gray): modified > 30 min ago
    if (ageMinutes < 2) return 'working'
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

// POST /api/missions - Create a new mission
app.post('/api/missions', async (req, res) => {
  try {
    const { title, description, assigned_to, priority = 'medium', status = 'queue', tags = [] } = req.body
    
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' })
    }
    
    // Generate slug from title
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50)
    
    const id = crypto.randomUUID()
    const timestamp = new Date().toISOString()
    const filename = `${assigned_to?.toLowerCase() || 'task'}-${slug}.md`
    
    // Create frontmatter and content
    const content = `---
id: ${id}
title: ${title}
assigned_to: ${assigned_to || 'unassigned'}
status: ${status}
priority: ${priority}
created_at: ${timestamp}
updated_at: ${timestamp}
created_by: human
tags: [${tags.join(', ')}]
---

# ${title}

## Description
${description || 'No description provided.'}

## Status
⏳ In queue - awaiting assignment
`
    
    // Write file to active directory
    const activePath = path.join(MISSION_CONTROL_PATH, 'active')
    await fs.mkdir(activePath, { recursive: true })
    await fs.writeFile(path.join(activePath, filename), content, 'utf-8')
    
    // Return the created mission
    const mission = {
      id: filename,
      title: title.slice(0, 50),
      description: description?.slice(0, 80) || '',
      status: status,
      priority,
      agent: assigned_to?.toUpperCase() || null,
      tags,
      created: 'just now'
    }
    
    // Broadcast to WebSocket clients
    broadcast({
      type: 'mission:new',
      payload: mission
    })
    
    // Also add to feed
    broadcast({
      type: 'feed:activity',
      payload: {
        id: `new-mission-${Date.now()}`,
        agent: 'HUMAN',
        action: 'created',
        target: title.slice(0, 40),
        time: 'just now',
        type: 'task'
      }
    })
    
    console.log(`Created mission: ${filename}`)
    res.status(201).json(mission)
  } catch (err) {
    console.error('Error creating mission:', err)
    res.status(500).json({ error: 'Failed to create mission' })
  }
})

// POST /api/missions/:id/complete - Mark a mission as complete
app.post('/api/missions/:id/complete', async (req, res) => {
  try {
    const { id } = req.params
    const filename = id.endsWith('.md') ? id : `${id}.md`
    
    const activePath = path.join(MISSION_CONTROL_PATH, 'active', filename)
    const completedPath = path.join(MISSION_CONTROL_PATH, 'completed', filename)
    
    // Check if file exists in active
    try {
      await fs.access(activePath)
    } catch (err) {
      return res.status(404).json({ error: 'Mission not found' })
    }
    
    // Read the file and update status
    let content = await fs.readFile(activePath, 'utf-8')
    const timestamp = new Date().toISOString()
    
    // Update frontmatter status
    content = content.replace(/status:\s*\w+/i, 'status: done')
    content = content.replace(/updated_at:\s*.+/i, `updated_at: ${timestamp}`)
    
    // Add completion note
    if (!content.includes('## Completed')) {
      content += `\n\n## Completed\n✅ Marked complete at ${timestamp}\n`
    }
    
    // Move file to completed directory
    await fs.mkdir(path.join(MISSION_CONTROL_PATH, 'completed'), { recursive: true })
    await fs.writeFile(completedPath, content, 'utf-8')
    await fs.unlink(activePath)
    
    // Broadcast completion
    broadcast({
      type: 'mission:complete',
      payload: { id: filename }
    })
    
    // Add to feed
    broadcast({
      type: 'feed:activity',
      payload: {
        id: `complete-${Date.now()}`,
        agent: 'HUMAN',
        action: 'completed',
        target: filename.replace('.md', ''),
        time: 'just now',
        type: 'task'
      }
    })
    
    console.log(`Completed mission: ${filename}`)
    res.json({ success: true, id: filename })
  } catch (err) {
    console.error('Error completing mission:', err)
    res.status(500).json({ error: 'Failed to complete mission' })
  }
})

// GET /api/missions - Get missions by status
app.get('/api/missions', async (req, res) => {
  try {
    const missions = { queue: [], progress: [], review: [], done: [] }
    
    // Read active missions
    try {
      const activePath = path.join(MISSION_CONTROL_PATH, 'active')
      const activeFiles = await fs.readdir(activePath)
      
      for (const file of activeFiles) {
        if (file.endsWith('.md')) {
          const content = await fs.readFile(path.join(activePath, file), 'utf-8')
          const mission = parseMissionFile(content, file)
          
          // Categorize by status
          if (mission.status === 'progress') missions.progress.push(mission)
          else if (mission.status === 'review') missions.review.push(mission)
          else if (mission.status === 'blocked') missions.queue.push(mission) // Show blocked in queue for now
          else missions.queue.push(mission)
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('Error reading active missions:', err.message)
      }
    }
    
    // Read completed missions
    try {
      const completedPath = path.join(MISSION_CONTROL_PATH, 'completed')
      const completedFiles = await fs.readdir(completedPath)
      
      for (const file of completedFiles.slice(-10)) { // Last 10 completed
        if (file.endsWith('.md')) {
          const content = await fs.readFile(path.join(completedPath, file), 'utf-8')
          missions.done.push(parseMissionFile(content, file))
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('Error reading completed missions:', err.message)
      }
    }
    
    res.json(missions)
  } catch (err) {
    console.error('Error fetching missions:', err)
    res.json({ queue: [], progress: [], review: [], done: [] })
  }
})

function parseMissionFile(content, filename) {
  const titleMatch = content.match(/^#\s*(.+)/m)
  const title = titleMatch ? titleMatch[1].replace(/^(FORGE|Task|Mission):\s*/i, '').trim() : filename.replace('.md', '')
  
  // Get full status line (handle markdown **bold**)
  const statusLineMatch = content.match(/\*?\*?Status:\*?\*?\s*(.+)/i)
  const statusLine = statusLineMatch ? statusLineMatch[1].replace(/^\*+\s*/, '') : ''
  
  // Determine status category based on content
  let status = 'queue'
  if (statusLine.includes('✅') || statusLine.toLowerCase().includes('complete')) {
    status = 'review' // Completed but in active/ = needs review
  } else if (statusLine.toLowerCase().includes('progress') || 
             statusLine.toLowerCase().includes('working') ||
             content.toLowerCase().includes('in progress')) {
    status = 'progress'
  } else if (statusLine.toLowerCase().includes('blocked') ||
             statusLine.toLowerCase().includes('waiting')) {
    status = 'blocked'
  }
  
  const priorityMatch = content.match(/Priority:\s*(\w+)/i)
  const priority = priorityMatch ? priorityMatch[1].toLowerCase() : 'medium'
  
  // Look for assigned agent
  const agentMatch = content.match(/(?:Assigned to|Assignee|Agent):\s*(\w+)/i) ||
                     filename.match(/^(\w+)-/i)
  const agent = agentMatch ? agentMatch[1].toUpperCase() : null
  
  // Get description from objective or first paragraph
  const objectiveMatch = content.match(/## Objective\s*\n+(.+)/i)
  const descMatch = objectiveMatch || content.match(/\n\n([^#\n].{10,100})/m)
  const description = descMatch ? descMatch[1].trim().slice(0, 80) : ''
  
  return {
    id: filename,
    title: title.slice(0, 50),
    description,
    status,
    priority,
    agent,
    tags: priorityMatch && priority === 'critical' ? ['urgent'] : [],
    created: 'recently'
  }
}

// GET /api/feed - Get recent activity
app.get('/api/feed', async (req, res) => {
  try {
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
          // Extract recent entries from WORKING.md
          const lines = content.split('\n')
          
          // Look for "This Session Summary" or recent bullet points
          let inSummary = false
          for (const line of lines) {
            if (line.includes('This Session') || line.includes('Summary')) inSummary = true
            if (inSummary && line.trim().startsWith('-')) {
              feed.push({
                id: `${agentDir}-${Date.now()}-${Math.random()}`,
                agent: agentDir.toUpperCase(),
                action: 'completed',
                target: line.replace(/^[-*]\s*/, '').slice(0, 60),
                time: ageMinutes < 5 ? 'just now' : `${Math.round(ageMinutes)}m ago`,
                type: 'task'
              })
            }
          }
          
          // Add status update based on current task
          const taskMatch = content.match(/(?:Current(?:\s+Task)?|Status):\s*(.+)/i)
          if (taskMatch) {
            feed.push({
              id: `${agentDir}-status-${Date.now()}`,
              agent: agentDir.toUpperCase(),
              action: 'is working on',
              target: taskMatch[1].trim().slice(0, 50),
              time: ageMinutes < 5 ? 'just now' : `${Math.round(ageMinutes)}m ago`,
              type: 'status'
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
    
    // Sort by recency (just now first)
    feed.sort((a, b) => {
      const aTime = a.time === 'just now' ? 0 : parseInt(a.time) || 999
      const bTime = b.time === 'just now' ? 0 : parseInt(b.time) || 999
      return aTime - bTime
    })
    
    res.json({ feed: feed.slice(0, 30) })
  } catch (err) {
    console.error('Error fetching feed:', err)
    res.json({ feed: [] })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    websocket: {
      port: WS_PORT,
      clients: clients.size
    }
  })
})

// GET /api/system - System metrics for monitoring
app.get('/api/system', async (req, res) => {
  try {
    const os = await import('os')
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    
    // Memory info
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const memPercent = Math.round((usedMem / totalMem) * 100)
    
    // CPU load
    const loadAvg = os.loadavg()
    
    // Disk usage (async)
    let diskPercent = 0
    let diskUsed = '0G'
    let diskTotal = '0G'
    try {
      const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $5, $3, $2}'")
      const parts = stdout.trim().split(' ')
      diskPercent = parseInt(parts[0]) || 0
      diskUsed = parts[1] || '0G'
      diskTotal = parts[2] || '0G'
    } catch (e) {
      // Ignore disk errors
    }
    
    // Process count
    let processCount = 0
    let zombieCount = 0
    try {
      const { stdout: psOut } = await execAsync("ps aux | wc -l")
      processCount = parseInt(psOut.trim()) - 1 // subtract header
      const { stdout: zombieOut } = await execAsync("ps aux | grep -c 'Z\\s' || echo 0")
      zombieCount = parseInt(zombieOut.trim()) || 0
    } catch (e) {
      // Ignore ps errors
    }
    
    // Uptime
    const uptimeSeconds = os.uptime()
    const uptimeHours = Math.floor(uptimeSeconds / 3600)
    const uptimeMins = Math.floor((uptimeSeconds % 3600) / 60)
    
    // Agent health (count active from recent heartbeats)
    const knownAgents = Object.keys(AGENT_META)
    let activeAgents = 0
    let standbyAgents = 0
    let offlineAgents = 0
    
    for (const agent of knownAgents) {
      const status = await getAgentStatus(agent)
      if (status === 'working') activeAgents++
      else if (status === 'standby') standbyAgents++
      else offlineAgents++
    }
    
    res.json({
      timestamp: new Date().toISOString(),
      memory: {
        percent: memPercent,
        used: `${(usedMem / 1024 / 1024 / 1024).toFixed(1)}GB`,
        total: `${(totalMem / 1024 / 1024 / 1024).toFixed(1)}GB`
      },
      disk: {
        percent: diskPercent,
        used: diskUsed,
        total: diskTotal
      },
      cpu: {
        load1m: loadAvg[0].toFixed(2),
        load5m: loadAvg[1].toFixed(2),
        load15m: loadAvg[2].toFixed(2),
        cores: os.cpus().length
      },
      processes: {
        total: processCount,
        zombies: zombieCount
      },
      uptime: {
        seconds: uptimeSeconds,
        formatted: `${uptimeHours}h ${uptimeMins}m`
      },
      agents: {
        active: activeAgents,
        standby: standbyAgents,
        offline: offlineAgents,
        total: knownAgents.length
      },
      health: memPercent < 80 && diskPercent < 85 && zombieCount < 10 ? 'healthy' : 'warning'
    })
  } catch (err) {
    console.error('Error getting system metrics:', err)
    res.status(500).json({ error: 'Failed to get system metrics' })
  }
})

// GET /api/backlog - Get prioritized backlog
app.get('/api/backlog', async (req, res) => {
  try {
    const backlogPath = path.join(CLAWD_PATH, 'backlog', 'priorities.md')
    const content = await fs.readFile(backlogPath, 'utf-8')
    
    const items = []
    const lines = content.split('\n')
    
    let currentSection = null
    let currentItem = null
    
    for (const line of lines) {
      // Section headers
      if (line.startsWith('## 🔴 Active')) currentSection = 'active'
      else if (line.startsWith('## 🟡 Backlog')) currentSection = 'backlog'
      else if (line.startsWith('## ✅ Completed')) currentSection = 'completed'
      
      // Item titles (### numbered items)
      const itemMatch = line.match(/^###\s*(\d+)\.\s*(.+)/)
      if (itemMatch && currentSection) {
        if (currentItem) items.push(currentItem)
        currentItem = {
          rank: parseInt(itemMatch[1]),
          title: itemMatch[2].trim(),
          section: currentSection,
          project: null,
          type: null,
          scope: null
        }
      }
      
      // Item metadata
      if (currentItem) {
        const projectMatch = line.match(/\*\*Project:\*\*\s*(.+)/)
        if (projectMatch) currentItem.project = projectMatch[1].trim()
        
        const typeMatch = line.match(/\*\*Type:\*\*\s*(.+)/)
        if (typeMatch) currentItem.type = typeMatch[1].trim()
        
        const scopeMatch = line.match(/\*\*Scope:\*\*\s*(.+)/)
        if (scopeMatch) currentItem.scope = scopeMatch[1].trim()
      }
    }
    
    // Push last item
    if (currentItem) items.push(currentItem)
    
    // Group by section
    const active = items.filter(i => i.section === 'active')
    const backlog = items.filter(i => i.section === 'backlog')
    const completed = items.filter(i => i.section === 'completed').slice(-5)
    
    res.json({
      timestamp: new Date().toISOString(),
      nextUp: active[0] || null,
      active,
      backlog,
      recentCompleted: completed,
      totalActive: active.length,
      totalBacklog: backlog.length
    })
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.json({ active: [], backlog: [], recentCompleted: [], totalActive: 0, totalBacklog: 0 })
    } else {
      console.error('Error reading backlog:', err)
      res.status(500).json({ error: 'Failed to read backlog' })
    }
  }
})

// ============================================
// Agent Profile Endpoints (Phase 2)
// ============================================

// Path to cron jobs
const CRON_PATH = path.join(process.env.HOME || '/home/node', '.clawdbot', 'cron', 'jobs.json')

// Helper: Get SOUL.md excerpt
async function getSoulExcerpt(agentName) {
  try {
    const soulPath = path.join(AGENTS_PATH, agentName.toLowerCase(), 'SOUL.md')
    const content = await fs.readFile(soulPath, 'utf-8')
    
    // Skip the first header and get the next ~800 chars
    const lines = content.split('\n')
    let startIdx = 0
    
    // Find where content starts (after first # header)
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#')) {
        startIdx = i + 1
        break
      }
    }
    
    // Get next ~800 chars of meaningful content
    let excerpt = lines.slice(startIdx).join('\n').trim()
    
    // Truncate intelligently at a paragraph break if possible
    if (excerpt.length > 1000) {
      const breakPoint = excerpt.indexOf('\n\n', 600)
      if (breakPoint > 0 && breakPoint < 1000) {
        excerpt = excerpt.slice(0, breakPoint)
      } else {
        excerpt = excerpt.slice(0, 1000) + '...'
      }
    }
    
    return excerpt
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Error reading SOUL.md for ${agentName}:`, err.message)
    }
    return null
  }
}

// Helper: Get WORKING.md excerpt (last 20 lines of meaningful content)
async function getWorkingExcerpt(agentName) {
  try {
    const workingPath = path.join(MEMORY_PATH, agentName.toLowerCase(), 'WORKING.md')
    const content = await fs.readFile(workingPath, 'utf-8')
    
    // Get last meaningful section or last 30 lines
    const lines = content.split('\n')
    
    // Find "This Session" or "This Heartbeat" section if exists
    let sectionStart = -1
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].includes('This Session') || 
          lines[i].includes('This Heartbeat') || 
          lines[i].includes('✅ DONE')) {
        sectionStart = i
        break
      }
    }
    
    if (sectionStart >= 0) {
      // Find next section header or end
      let sectionEnd = lines.length
      for (let i = sectionStart + 1; i < lines.length; i++) {
        if (lines[i].startsWith('## ') || lines[i].startsWith('---')) {
          sectionEnd = i
          break
        }
      }
      return lines.slice(sectionStart, Math.min(sectionEnd, sectionStart + 25)).join('\n')
    }
    
    // Fallback: return last 20 lines
    return lines.slice(-20).join('\n')
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Error reading WORKING.md for ${agentName}:`, err.message)
    }
    return null
  }
}

// Helper: Get last heartbeat time from WORKING.md mtime
async function getLastHeartbeat(agentName) {
  try {
    const workingPath = path.join(MEMORY_PATH, agentName.toLowerCase(), 'WORKING.md')
    const stats = await fs.stat(workingPath)
    return stats.mtime.getTime()
  } catch (err) {
    return null
  }
}

// Helper: Count sessions today (from session files)
async function getSessionsToday(agentName) {
  try {
    const sessionsPath = path.join(process.env.HOME || '/home/node', '.clawdbot', 'agents', 'main', 'sessions')
    const files = await fs.readdir(sessionsPath)
    
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    
    // Count files modified today
    let count = 0
    for (const file of files.slice(-50)) { // Only check recent files
      if (file.endsWith('.jsonl')) {
        try {
          const stat = await fs.stat(path.join(sessionsPath, file))
          if (stat.mtime.toISOString().slice(0, 10) === today) {
            count++
          }
        } catch (e) {
          // Ignore file errors
        }
      }
    }
    
    return count
  } catch (err) {
    return 0
  }
}

// GET /api/agents/:name - Agent profile with soul and working excerpts
app.get('/api/agents/:name', async (req, res) => {
  try {
    const { name } = req.params
    const agentKey = name.toLowerCase()
    
    // Check if agent exists
    const meta = AGENT_META[agentKey]
    if (!meta) {
      return res.status(404).json({ error: 'Agent not found' })
    }
    
    const [soulExcerpt, workingExcerpt, status, currentTask, lastHeartbeat, sessionsToday] = await Promise.all([
      getSoulExcerpt(agentKey),
      getWorkingExcerpt(agentKey),
      getAgentStatus(agentKey),
      getAgentTask(agentKey),
      getLastHeartbeat(agentKey),
      getSessionsToday(agentKey),
    ])
    
    res.json({
      name: name.toUpperCase(),
      role: meta.role,
      emoji: meta.emoji,
      color: meta.color,
      status,
      currentTask,
      soulExcerpt,
      workingExcerpt,
      lastHeartbeat,
      sessionsToday,
    })
  } catch (err) {
    console.error('Error fetching agent profile:', err)
    res.status(500).json({ error: 'Failed to fetch agent profile' })
  }
})

// GET /api/agents/:name/tasks - Tasks assigned to agent
app.get('/api/agents/:name/tasks', async (req, res) => {
  try {
    const { name } = req.params
    const agentName = name.toUpperCase()
    
    const tasks = []
    
    // Read active missions
    try {
      const activePath = path.join(MISSION_CONTROL_PATH, 'active')
      const files = await fs.readdir(activePath)
      
      for (const file of files) {
        if (!file.endsWith('.md')) continue
        
        const content = await fs.readFile(path.join(activePath, file), 'utf-8')
        const mission = parseMissionFile(content, file)
        
        // Check if assigned to this agent (via frontmatter or filename)
        if (mission.agent === agentName || 
            file.toLowerCase().startsWith(name.toLowerCase() + '-')) {
          tasks.push(mission)
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`Error reading tasks for ${name}:`, err.message)
      }
    }
    
    res.json({ tasks })
  } catch (err) {
    console.error('Error fetching agent tasks:', err)
    res.status(500).json({ error: 'Failed to fetch agent tasks' })
  }
})

// GET /api/agents/:name/crons - Cron jobs related to agent
app.get('/api/agents/:name/crons', async (req, res) => {
  try {
    const { name } = req.params
    const agentNameLower = name.toLowerCase()
    const agentNameUpper = name.toUpperCase()
    
    const crons = []
    
    try {
      const cronContent = await fs.readFile(CRON_PATH, 'utf-8')
      const cronData = JSON.parse(cronContent)
      
      for (const job of cronData.jobs || []) {
        // Check if this cron mentions the agent
        const jobStr = JSON.stringify(job).toLowerCase()
        
        if (jobStr.includes(agentNameLower) || 
            job.name?.toLowerCase().includes(agentNameLower) ||
            job.payload?.message?.toLowerCase().includes(agentNameLower)) {
          crons.push({
            id: job.id,
            name: job.name,
            enabled: job.enabled,
            schedule: job.schedule,
            expr: job.schedule?.expr,
            tz: job.schedule?.tz,
            nextRun: job.state?.nextRunAtMs,
            lastRun: job.state?.lastRunAtMs,
            lastStatus: job.state?.lastStatus,
          })
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`Error reading crons for ${name}:`, err.message)
      }
    }
    
    res.json({ crons })
  } catch (err) {
    console.error('Error fetching agent crons:', err)
    res.status(500).json({ error: 'Failed to fetch agent crons' })
  }
})

// GET /api/crons - List all cron jobs
app.get('/api/crons', async (req, res) => {
  try {
    const { enabled } = req.query
    const CRON_PATH = path.join(process.env.HOME || '/home/node', '.clawdbot', 'cron', 'jobs.json')
    
    const cronContent = await fs.readFile(CRON_PATH, 'utf-8')
    const cronData = JSON.parse(cronContent)
    
    let jobs = (cronData.jobs || []).map(job => ({
      id: job.id,
      name: job.name,
      enabled: job.enabled,
      schedule: job.schedule,
      sessionTarget: job.sessionTarget,
      payloadKind: job.payload?.kind,
      payloadText: job.payload?.text?.slice(0, 100) || job.payload?.message?.slice(0, 100),
      nextRun: job.state?.nextRunAtMs ? new Date(job.state.nextRunAtMs).toISOString() : null,
      lastRun: job.state?.lastRunAtMs ? new Date(job.state.lastRunAtMs).toISOString() : null,
      lastStatus: job.state?.lastStatus,
      runCount: job.state?.runCount || 0
    }))
    
    // Filter by enabled status if specified
    if (enabled !== undefined) {
      const enabledBool = enabled === 'true'
      jobs = jobs.filter(j => j.enabled === enabledBool)
    }
    
    // Sort by next run time
    jobs.sort((a, b) => {
      if (!a.nextRun) return 1
      if (!b.nextRun) return -1
      return new Date(a.nextRun) - new Date(b.nextRun)
    })
    
    res.json({
      timestamp: new Date().toISOString(),
      totalJobs: jobs.length,
      enabledJobs: jobs.filter(j => j.enabled).length,
      jobs
    })
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.json({ timestamp: new Date().toISOString(), totalJobs: 0, enabledJobs: 0, jobs: [] })
    } else {
      console.error('Error reading crons:', err)
      res.status(500).json({ error: 'Failed to read crons' })
    }
  }
})

// GET /api/alerts - Aggregate alerts from alerts/ and escalations/
app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = []
    const { limit = 20, unread } = req.query
    
    // Read from alerts/ directory
    try {
      const alertsPath = path.join(MISSION_CONTROL_PATH, 'alerts')
      const files = await fs.readdir(alertsPath)
      
      for (const file of files.slice(-20)) {
        if (!file.endsWith('.md')) continue
        
        try {
          const content = await fs.readFile(path.join(alertsPath, file), 'utf-8')
          const stats = await fs.stat(path.join(alertsPath, file))
          
          // Parse priority from content
          const priorityMatch = content.match(/Priority:\s*🔴|Priority:\s*HIGH|CRITICAL|URGENT/i)
          const priority = priorityMatch ? 'high' : 'medium'
          
          // Parse title
          const titleMatch = content.match(/^#\s*(.+)/m)
          const title = titleMatch ? titleMatch[1].slice(0, 60) : file.replace('.md', '')
          
          // Parse from/agent
          const fromMatch = content.match(/(?:From|Agent):\s*(\w+)/i)
          const agent = fromMatch ? fromMatch[1].toUpperCase() : null
          
          alerts.push({
            id: file,
            type: 'alert',
            title,
            agent,
            priority,
            timestamp: stats.mtime,
            source: 'alerts'
          })
        } catch (err) {
          // Skip individual file errors
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('Error reading alerts:', err.message)
      }
    }
    
    // Read from escalations/ directory
    try {
      const escalationsPath = path.join(MISSION_CONTROL_PATH, 'escalations')
      const files = await fs.readdir(escalationsPath)
      
      for (const file of files.slice(-20)) {
        if (!file.endsWith('.md')) continue
        
        try {
          const content = await fs.readFile(path.join(escalationsPath, file), 'utf-8')
          const stats = await fs.stat(path.join(escalationsPath, file))
          
          const titleMatch = content.match(/^#\s*(.+)/m)
          const title = titleMatch ? titleMatch[1].slice(0, 60) : file.replace('.md', '')
          
          const fromMatch = content.match(/(?:From|Agent):\s*(\w+)/i)
          const agent = fromMatch ? fromMatch[1].toUpperCase() : null
          
          alerts.push({
            id: file,
            type: 'escalation',
            title,
            agent,
            priority: 'high',
            timestamp: stats.mtime,
            source: 'escalations'
          })
        } catch (err) {
          // Skip individual file errors
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('Error reading escalations:', err.message)
      }
    }
    
    // Sort by timestamp (newest first) and limit
    alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    
    res.json({
      timestamp: new Date().toISOString(),
      count: alerts.length,
      alerts: alerts.slice(0, parseInt(limit))
    })
  } catch (err) {
    console.error('Error fetching alerts:', err)
    res.status(500).json({ error: 'Failed to fetch alerts' })
  }
})

// GET /api/logs - List and read log files
app.get('/api/logs', async (req, res) => {
  try {
    const logsPath = path.join(CLAWD_PATH, 'logs')
    const { file, lines = 50 } = req.query
    
    if (file) {
      // Read specific log file
      const filePath = path.join(logsPath, path.basename(file)) // Prevent path traversal
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        const logLines = content.split('\n').slice(-parseInt(lines))
        res.json({
          file,
          lines: logLines.length,
          content: logLines.join('\n')
        })
      } catch (err) {
        if (err.code === 'ENOENT') {
          res.status(404).json({ error: 'Log file not found' })
        } else {
          throw err
        }
      }
    } else {
      // List log files
      const files = []
      
      async function scanDir(dir, prefix = '') {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true })
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name)
            const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
            
            if (entry.isDirectory()) {
              await scanDir(fullPath, relativePath)
            } else if (entry.name.endsWith('.log') || entry.name.endsWith('.txt')) {
              const stats = await fs.stat(fullPath)
              files.push({
                name: relativePath,
                size: stats.size,
                modified: stats.mtime,
                sizeHuman: stats.size > 1024 ? `${(stats.size / 1024).toFixed(1)}KB` : `${stats.size}B`
              })
            }
          }
        } catch (err) {
          // Ignore permission errors
        }
      }
      
      await scanDir(logsPath)
      
      // Sort by modified time, newest first
      files.sort((a, b) => new Date(b.modified) - new Date(a.modified))
      
      res.json({
        timestamp: new Date().toISOString(),
        logsPath,
        files: files.slice(0, 50) // Limit to 50 files
      })
    }
  } catch (err) {
    console.error('Error reading logs:', err)
    res.status(500).json({ error: 'Failed to read logs' })
  }
})

// GET /api/git - Git status and recent commits
app.get('/api/git', async (req, res) => {
  try {
    const { execSync } = await import('child_process')
    
    const status = execSync('git status --short', { cwd: CLAWD_PATH, encoding: 'utf-8' })
    const commits = execSync('git log --oneline -10', { cwd: CLAWD_PATH, encoding: 'utf-8' })
    const branch = execSync('git branch --show-current', { cwd: CLAWD_PATH, encoding: 'utf-8' }).trim()
    
    res.json({
      timestamp: new Date().toISOString(),
      branch,
      status: status.trim().split('\n').filter(Boolean),
      recentCommits: commits.trim().split('\n').map(line => {
        const [hash, ...msg] = line.split(' ')
        return { hash, message: msg.join(' ') }
      })
    })
  } catch (err) {
    console.error('Error getting git info:', err)
    res.status(500).json({ error: 'Failed to get git info' })
  }
})

// GET /api/metrics - Aggregated squad performance metrics
app.get('/api/metrics', async (req, res) => {
  try {
    const { execSync } = await import('child_process')
    const today = new Date().toISOString().split('T')[0]
    const metrics = {
      timestamp: new Date().toISOString(),
      today,
      agents: {},
      summary: {
        totalAgents: 0,
        activeAgents: 0,
        blockedAgents: 0,
        idleAgents: 0,
        tasksCompletedToday: 0,
        alertsToday: 0,
        buildsToday: 0
      }
    }

    // Read agent WORKING.md files for activity data
    const agentNames = Object.keys(AGENT_META)
    for (const name of agentNames) {
      try {
        const workingPath = path.join(MEMORY_PATH, name, 'WORKING.md')
        const content = await fs.readFile(workingPath, 'utf-8')
        
        // Extract status
        const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/i)
        const status = statusMatch ? statusMatch[1].toLowerCase() : 'unknown'
        
        // Count tasks/builds for FORGE
        let tasksToday = 0
        if (name === 'forge') {
          const buildMatch = content.match(/Today's Build Count:\s*(\d+)/i)
          if (buildMatch) {
            tasksToday = parseInt(buildMatch[1])
            metrics.summary.buildsToday = tasksToday
          }
        }
        
        // Track activity lines mentioning today
        const todayMentions = (content.match(new RegExp(today, 'g')) || []).length
        
        metrics.agents[name] = {
          status: status.includes('active') || status.includes('working') ? 'active' : 
                  status.includes('block') ? 'blocked' : 
                  status.includes('idle') || status.includes('standby') ? 'idle' : 'unknown',
          tasksToday,
          activityToday: todayMentions > 0
        }
        
        metrics.summary.totalAgents++
        if (metrics.agents[name].status === 'active') metrics.summary.activeAgents++
        if (metrics.agents[name].status === 'blocked') metrics.summary.blockedAgents++
        if (metrics.agents[name].status === 'idle') metrics.summary.idleAgents++
        
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`Error reading ${name} WORKING.md:`, err.message)
        }
      }
    }

    // Count completed missions today
    try {
      const completedPath = path.join(MISSION_CONTROL_PATH, 'completed')
      const files = await fs.readdir(completedPath)
      for (const file of files) {
        try {
          const stat = await fs.stat(path.join(completedPath, file))
          if (stat.mtime.toISOString().startsWith(today)) {
            metrics.summary.tasksCompletedToday++
          }
        } catch (err) {
          // Ignore
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('Error reading completed missions:', err.message)
      }
    }

    // Count alerts today
    try {
      const alertsPath = path.join(MISSION_CONTROL_PATH, 'alerts')
      const files = await fs.readdir(alertsPath)
      for (const file of files) {
        try {
          const stat = await fs.stat(path.join(alertsPath, file))
          if (stat.mtime.toISOString().startsWith(today)) {
            metrics.summary.alertsToday++
          }
        } catch (err) {
          // Ignore
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('Error reading alerts:', err.message)
      }
    }

    // Git activity today
    try {
      const gitLog = execSync(
        `git log --oneline --since="${today}T00:00:00" | wc -l`,
        { cwd: CLAWD_PATH, encoding: 'utf-8' }
      )
      metrics.summary.commitsToday = parseInt(gitLog.trim()) || 0
    } catch (err) {
      metrics.summary.commitsToday = 0
    }

    res.json(metrics)
  } catch (err) {
    console.error('Error computing metrics:', err)
    res.status(500).json({ error: 'Failed to compute metrics' })
  }
})

// GET /api/prs - Aggregate open PRs across monitored repos
app.get('/api/prs', async (req, res) => {
  try {
    const { execSync } = await import('child_process')
    
    // Active repos to monitor
    const repos = [
      'abmccull/churn-buster',
      'abmccull/missioncontrol',
      'abmccull/disputeshield-ai'
    ]
    
    const allPRs = []
    
    for (const repo of repos) {
      try {
        const prJson = execSync(
          `gh pr list --repo ${repo} --state open --json number,title,author,createdAt,url,labels,headRefName,isDraft --limit 10`,
          { encoding: 'utf-8', timeout: 10000 }
        )
        
        const prs = JSON.parse(prJson)
        
        for (const pr of prs) {
          allPRs.push({
            repo: repo.split('/')[1],
            repoFull: repo,
            number: pr.number,
            title: pr.title,
            author: pr.author?.login || 'unknown',
            branch: pr.headRefName,
            isDraft: pr.isDraft,
            labels: pr.labels?.map(l => l.name) || [],
            url: pr.url,
            createdAt: pr.createdAt,
            age: getAge(pr.createdAt)
          })
        }
      } catch (err) {
        console.error(`Error fetching PRs for ${repo}:`, err.message)
        // Continue with other repos
      }
    }
    
    // Sort by created date (newest first)
    allPRs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    
    // Group by repo
    const byRepo = {}
    for (const pr of allPRs) {
      if (!byRepo[pr.repo]) byRepo[pr.repo] = []
      byRepo[pr.repo].push(pr)
    }
    
    res.json({
      timestamp: new Date().toISOString(),
      totalOpen: allPRs.length,
      byRepo,
      prs: allPRs
    })
  } catch (err) {
    console.error('Error fetching PRs:', err)
    res.status(500).json({ error: 'Failed to fetch PRs' })
  }
})

// Helper: Get human-readable age
function getAge(dateStr) {
  const created = new Date(dateStr)
  const now = new Date()
  const diffMs = now - created
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffDays > 0) return `${diffDays}d ago`
  if (diffHours > 0) return `${diffHours}h ago`
  return 'just now'
}

// GET /api/builds - Build history from mission-control/builds/
app.get('/api/builds', async (req, res) => {
  try {
    const { limit = 20, agent } = req.query
    const buildsPath = path.join(MISSION_CONTROL_PATH, 'builds')
    
    const builds = []
    
    try {
      const files = await fs.readdir(buildsPath)
      
      for (const file of files.slice(-parseInt(limit) * 2)) {
        if (!file.endsWith('.md')) continue
        
        // Filter by agent if specified
        if (agent && !file.toLowerCase().startsWith(agent.toLowerCase())) continue
        
        try {
          const filePath = path.join(buildsPath, file)
          const content = await fs.readFile(filePath, 'utf-8')
          const stats = await fs.stat(filePath)
          
          // Parse build info
          const titleMatch = content.match(/^#\s*(.+)/m)
          const title = titleMatch ? titleMatch[1].slice(0, 80) : file.replace('.md', '')
          
          // Extract agent from filename
          const agentMatch = file.match(/^(\w+)-/)
          const buildAgent = agentMatch ? agentMatch[1].toUpperCase() : 'UNKNOWN'
          
          // Look for status indicators
          const isComplete = content.includes('✅') || content.toLowerCase().includes('complete')
          const isFailed = content.includes('❌') || content.toLowerCase().includes('failed')
          
          // Get project from content
          const projectMatch = content.match(/(?:Project|Repo):\s*(\S+)/i)
          const project = projectMatch ? projectMatch[1] : null
          
          builds.push({
            id: file,
            title,
            agent: buildAgent,
            project,
            status: isFailed ? 'failed' : isComplete ? 'complete' : 'in-progress',
            timestamp: stats.mtime,
            age: getAge(stats.mtime.toISOString())
          })
        } catch (err) {
          // Skip individual file errors
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('Error reading builds:', err.message)
      }
    }
    
    // Sort by timestamp (newest first)
    builds.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    
    res.json({
      timestamp: new Date().toISOString(),
      count: builds.length,
      builds: builds.slice(0, parseInt(limit))
    })
  } catch (err) {
    console.error('Error fetching builds:', err)
    res.status(500).json({ error: 'Failed to fetch builds' })
  }
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
  console.log(`Mission Control running on http://0.0.0.0:${PORT}`)
  console.log(`WebSocket server running on ws://0.0.0.0:${WS_PORT}`)
  console.log(`Reading from: ${CLAWD_PATH}`)
  console.log(`Watching: ${watchPaths.join(', ')}`)
})
