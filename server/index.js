import express from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'

import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 8888

// Base paths - adjust to your clawd installation
const CLAWD_PATH = process.env.CLAWD_PATH || '/home/node/clawd'
const AGENTS_PATH = path.join(CLAWD_PATH, 'agents')
const MISSION_CONTROL_PATH = path.join(CLAWD_PATH, 'mission-control')
const MEMORY_PATH = path.join(CLAWD_PATH, 'memory')

app.use(cors())
app.use(express.json())

// Known agent emojis and roles (from SQUAD.md)
const AGENT_META = {
  jarvis: { emoji: '🎯', role: 'Chief Orchestrator' },
  hunter: { emoji: '🎯', role: 'Sales & Relationships' },
  inbox: { emoji: '📧', role: 'Email Intelligence' },
  money: { emoji: '💰', role: 'Revenue Intelligence' },
  linkedin: { emoji: '💼', role: 'LinkedIn Growth' },
  xpert: { emoji: '🐦', role: 'X/Twitter' },
  dispatch: { emoji: '📰', role: 'Newsletter' },
  scout: { emoji: '🔍', role: 'Research & Intel' },
  forge: { emoji: '🔨', role: 'Builder/Developer' },
  oracle: { emoji: '🔮', role: 'Trading Intelligence' },
  vibe: { emoji: '🎨', role: 'Marketing Systems' },
  sentinel: { emoji: '🛡️', role: 'Security & Ops' },
  nexus: { emoji: '🔗', role: 'System Intelligence' },
  claw: { emoji: '🦀', role: 'OpenClaw Specialist' },
  critic: { emoji: '🎭', role: 'Quality Control' },
}

// Helper: Get agent info from AGENT_META (canonical source)
async function parseAgentSoul(agentDir) {
  const meta = AGENT_META[agentDir.toLowerCase()] || {}
  return { 
    name: agentDir.toUpperCase(), 
    emoji: meta.emoji || '🤖', 
    role: meta.role || 'Agent', 
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
    } catch {}
    
    // If WORKING.md was modified in last 5 minutes = working
    // If modified in last 30 minutes = standby  
    // Otherwise = offline
    if (ageMinutes < 5) return 'working'
    if (ageMinutes < 30) return 'standby'
    return 'offline'
  } catch {
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
  } catch {}
  
  try {
    // Fallback to WORKING.md first line
    const workingPath = path.join(MEMORY_PATH, agentDir, 'WORKING.md')
    const content = await fs.readFile(workingPath, 'utf-8')
    const firstTask = content.match(/(?:Current|Status):\s*(.+)/i)
    return firstTask ? firstTask[1].trim().slice(0, 60) : null
  } catch {}
  
  return null
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
    } catch {}
    
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
    } catch {}
    
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
          const taskMatch = content.match(/(?:Current Task|Status):\s*(.+)/i)
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
      } catch {}
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
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
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
  console.log(`Reading from: ${CLAWD_PATH}`)
})
