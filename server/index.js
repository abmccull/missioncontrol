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
