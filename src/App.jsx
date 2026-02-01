import { useState, useEffect, useCallback } from 'react'
import Header from './components/Header'
import AgentPanel from './components/AgentPanel'
import MissionQueue from './components/MissionQueue'
import LiveFeed from './components/LiveFeed'
import useWebSocket from './hooks/useWebSocket'

function App() {
  const [agents, setAgents] = useState([])
  const [missions, setMissions] = useState({ queue: [], progress: [], review: [], done: [] })
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ activeAgents: 0, queuedMissions: 0 })
  
  const { isConnected, lastMessage, connectionStatus } = useWebSocket()

  // Initial data fetch
  const fetchData = useCallback(async () => {
    try {
      const [agentsRes, missionsRes, feedRes] = await Promise.all([
        fetch('/api/agents').then(r => r.json()).catch(() => ({ agents: [] })),
        fetch('/api/missions').then(r => r.json()).catch(() => ({ queue: [], progress: [], review: [], done: [] })),
        fetch('/api/feed').then(r => r.json()).catch(() => ({ feed: [] }))
      ])
      setAgents(agentsRes.agents || [])
      setMissions(missionsRes)
      setFeed(feedRes.feed || [])
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Map status from server to column key
  const statusToColumn = (status) => {
    switch (status) {
      case 'in_progress':
      case 'progress':
      case 'working':
        return 'progress'
      case 'review':
      case 'reviewing':
        return 'review'
      case 'done':
      case 'complete':
      case 'completed':
        return 'done'
      default:
        return 'queue'
    }
  }

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return
    
    const { type, payload } = lastMessage
    
    switch (type) {
      case 'agent:status':
        setAgents(prev => prev.map(agent => 
          agent.name === payload.name 
            ? { ...agent, status: payload.status, currentTask: payload.currentTask, _updated: Date.now() }
            : agent
        ))
        break
        
      case 'agents:refresh':
        fetchData()
        break
        
      case 'mission:update':
      case 'mission:new': {
        const targetCol = statusToColumn(payload.status)
        
        setMissions(prev => {
          const updated = { ...prev }
          
          // Remove from all columns first
          for (const col of ['queue', 'progress', 'review', 'done']) {
            updated[col] = updated[col].filter(m => 
              m.id !== payload.id && m.filename !== payload.filename
            )
          }
          
          // Add to appropriate column with timestamp for animation
          const missionWithMeta = { 
            ...payload, 
            _updated: Date.now()
          }
          
          if (targetCol in updated) {
            updated[targetCol] = [missionWithMeta, ...updated[targetCol]]
          } else {
            updated.queue = [missionWithMeta, ...updated.queue]
          }
          
          return updated
        })
        break
      }
        
      case 'mission:complete': {
        const completedMission = {
          id: payload.id,
          filename: payload.filename,
          title: payload.title || 'Task completed',
          assigned_to: payload.assigned_to,
          status: 'done',
          _updated: Date.now()
        }
        
        setMissions(prev => ({
          queue: prev.queue.filter(m => m.id !== payload.id && m.filename !== payload.filename),
          progress: prev.progress.filter(m => m.id !== payload.id && m.filename !== payload.filename),
          review: prev.review.filter(m => m.id !== payload.id && m.filename !== payload.filename),
          done: [completedMission, ...prev.done.slice(0, 9)]
        }))
        break
      }
        
      case 'mission:removed':
        setMissions(prev => ({
          queue: prev.queue.filter(m => m.id !== payload.id && m.filename !== payload.filename),
          progress: prev.progress.filter(m => m.id !== payload.id && m.filename !== payload.filename),
          review: prev.review.filter(m => m.id !== payload.id && m.filename !== payload.filename),
          done: prev.done
        }))
        break
        
      case 'feed:activity':
        setFeed(prev => {
          const newItem = { ...payload, _new: true }
          // Avoid duplicates
          const filtered = prev.filter(item => item.id !== payload.id)
          return [newItem, ...filtered.slice(0, 49)]
        })
        break
        
      case 'stats:update':
        setStats(payload)
        break
        
      default:
        break
    }
  }, [lastMessage, fetchData])

  const activeCount = agents.filter(a => a.status === 'working').length
  const queuedCount = missions.queue.length + missions.progress.length

  return (
    <div className="min-h-screen bg-[#0f1419] flex flex-col">
      <Header 
        activeCount={stats.activeAgents || activeCount} 
        totalCount={agents.length || 15}
        queuedMissions={stats.queuedMissions || queuedCount}
        isConnected={isConnected}
        connectionStatus={connectionStatus}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Agents */}
        <AgentPanel agents={agents} loading={loading} />
        
        {/* Center - Mission Queue */}
        <MissionQueue 
          missions={missions} 
          loading={loading} 
          lastMessage={lastMessage}
        />
        
        {/* Right Sidebar - Live Feed */}
        <LiveFeed feed={feed} loading={loading} isConnected={isConnected} />
      </div>
    </div>
  )
}

export default App
