import express from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'

const app = express()
const PORT = 3001

// Base paths - adjust to your clawd installation
const CLAWD_PATH = process.env.CLAWD_PATH || '/home/node/clawd'
const AGENTS_PATH = path.join(CLAWD_PATH, 'agents')
const MISSION_CONTROL_PATH = path.join(CLAWD_PATH, 'mission-control')
const MEMORY_PATH = path.join(CLAWD_PATH, 'memory')

app.use(cors())
app.use(express.json())

// Helper: Read SOUL.md and extract agent info
async function parseAgentSoul(agentDir) {
  try {
    const soulPath = path.join(AGENTS_PATH, agentDir, 'SOUL.md')
    const content = await fs.readFile(soulPath, 'utf-8')
    
    // Extract name (usually first heading)
    const nameMatch = content.match(/^#\s*(.+)/m)
    const name = nameMatch ? nameMatch[1].replace(/[^a-zA-Z]/g, '').toUpperCase() : agentDir.toUpperCase()
    
    // Extract emoji
    const emojiMatch = content.match(/[\u{1F300}-\u{1F9FF}]/u)
    const emoji = emojiMatch ? emojiMatch[0] : '🤖'
    
    // Extract role/title
    const roleMatch = content.match(/(?:Role|Title|I am):\s*(.+)/i) || 
                      content.match(/\*\*(.+?)\*\*/m)
    const role = roleMatch ? roleMatch[1].trim() : 'Agent'
    
    return { name, emoji, role, dir: agentDir }
  } catch {
    return { name: agentDir.toUpperCase(), emoji: '🤖', role: 'Agent', dir: agentDir }
  }
}

// Helper: Determine agent status from WORKING.md and session activity
async function getAgentStatus(agentDir) {
  try {
    const workingPath = path.join(AGENTS_PATH, agentDir, 'WORKING.md')
    const stats = await fs.stat(workingPath)
    const mtime = stats.mtime.getTime()
    const now = Date.now()
    const ageMinutes = (now - mtime) / 1000 / 60
    
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

// GET /api/agents - List all agents with status
app.get('/api/agents', async (req, res) => {
  try {
    const dirs = await fs.readdir(AGENTS_PATH)
    const agentDirs = []
    
    for (const dir of dirs) {
      const stat = await fs.stat(path.join(AGENTS_PATH, dir))
      if (stat.isDirectory() && !dir.startsWith('.')) {
        agentDirs.push(dir)
      }
    }
    
    const agents = await Promise.all(agentDirs.map(async (dir) => {
      const soul = await parseAgentSoul(dir)
      const status = await getAgentStatus(dir)
      return { ...soul, status, type: 'SPC' }
    }))
    
    // Sort: working first, then standby, then offline
    const order = { working: 0, standby: 1, offline: 2 }
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
          
          // Categorize by status in file or default to queue
          if (mission.status === 'in-progress') missions.progress.push(mission)
          else if (mission.status === 'review') missions.review.push(mission)
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
  const title = titleMatch ? titleMatch[1] : filename.replace('.md', '')
  
  const statusMatch = content.match(/Status:\s*(\w+)/i)
  const status = statusMatch ? statusMatch[1].toLowerCase() : 'queue'
  
  const priorityMatch = content.match(/Priority:\s*(\w+)/i)
  const priority = priorityMatch ? priorityMatch[1].toLowerCase() : 'medium'
  
  const agentMatch = content.match(/(?:Assignee|Agent):\s*(\w+)/i)
  const agent = agentMatch ? agentMatch[1].toUpperCase() : null
  
  const descMatch = content.match(/^(?!#)(.{10,100})/m)
  const description = descMatch ? descMatch[1].trim() : ''
  
  return {
    id: filename,
    title,
    description,
    status,
    priority,
    agent,
    tags: [],
    created: 'recently'
  }
}

// GET /api/feed - Get recent activity
app.get('/api/feed', async (req, res) => {
  try {
    const feed = []
    const today = new Date().toISOString().split('T')[0]
    
    // Check each agent's memory for today
    const dirs = await fs.readdir(AGENTS_PATH).catch(() => [])
    
    for (const dir of dirs) {
      try {
        const memoryPath = path.join(AGENTS_PATH, dir, 'memory')
        const todayFile = path.join(memoryPath, `${today}.md`)
        
        const content = await fs.readFile(todayFile, 'utf-8').catch(() => null)
        if (content) {
          // Extract recent entries (look for timestamps or bullet points)
          const lines = content.split('\n').filter(l => l.trim().startsWith('-') || l.match(/\d{2}:\d{2}/))
          
          for (const line of lines.slice(-5)) {
            feed.push({
              agent: dir.toUpperCase(),
              action: 'logged',
              target: line.replace(/^[-*]\s*/, '').slice(0, 50),
              time: 'today',
              type: 'status'
            })
          }
        }
      } catch {}
    }
    
    // Add some synthetic feed items based on file changes
    // This would be enhanced with file watching in production
    
    res.json({ feed: feed.slice(0, 20) })
  } catch (err) {
    console.error('Error fetching feed:', err)
    res.json({ feed: [] })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Mission Control API running on port ${PORT}`)
  console.log(`Reading from: ${CLAWD_PATH}`)
})
