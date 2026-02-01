import { useState, useEffect, useCallback } from 'react'
import Header from './components/Header'
import AgentPanel from './components/AgentPanel'
import MissionQueue from './components/MissionQueue'
import LiveFeed from './components/LiveFeed'
import MobileNav from './components/MobileNav'
import useWebSocket from './hooks/useWebSocket'

function App() {
  const [agents, setAgents] = useState([])
  const [missions, setMissions] = useState({ queue: [], progress: [], review: [], done: [] })
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ activeAgents: 0, queuedMissions: 0 })
  
  // Mobile state
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeView, setActiveView] = useState('missions') // 'agents' | 'missions' | 'feed'
  
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

  // Close sidebar when clicking overlay
  const handleOverlayClick = () => {
    setSidebarOpen(false)
  }

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
      case 'mission:new':
        setMissions(prev => {
          const updated = { ...prev }
          // Remove from all columns first
          for (const col of ['queue', 'progress', 'review', 'done']) {
            updated[col] = updated[col].filter(m => m.id !== payload.id)
          }
          // Add to appropriate column
          const targetCol = payload.status || 'queue'
          if (targetCol in updated) {
            updated[targetCol] = [payload, ...updated[targetCol]]
          } else {
            updated.queue = [payload, ...updated.queue]
          }
          return updated
        })
        break
        
      case 'mission:complete':
        setMissions(prev => ({
          ...prev,
          queue: prev.queue.filter(m => m.id !== payload.id),
          progress: prev.progress.filter(m => m.id !== payload.id),
          review: prev.review.filter(m => m.id !== payload.id),
          done: [{ id: payload.id, status: 'done' }, ...prev.done.slice(0, 9)]
        }))
        break
        
      case 'mission:removed':
        setMissions(prev => ({
          queue: prev.queue.filter(m => m.id !== payload.id),
          progress: prev.progress.filter(m => m.id !== payload.id),
          review: prev.review.filter(m => m.id !== payload.id),
          done: prev.done
        }))
        break
        
      case 'feed:activity':
        setFeed(prev => {
          const newFeed = [{ ...payload, _new: true }, ...prev.slice(0, 29)]
          return newFeed
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
        onMenuClick={() => setSidebarOpen(true)}
      />
      
      {/* Mobile sidebar overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      
      {/* Desktop layout */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Left Sidebar - Agents */}
        <AgentPanel agents={agents} loading={loading} />
        
        {/* Center - Mission Queue */}
        <MissionQueue missions={missions} loading={loading} />
        
        {/* Right Sidebar - Live Feed */}
        <LiveFeed feed={feed} loading={loading} isConnected={isConnected} />
      </div>

      {/* Mobile layout */}
      <div className="flex md:hidden flex-1 overflow-hidden">
        {/* Mobile sidebar */}
        <div className={`mobile-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <AgentPanel 
            agents={agents} 
            loading={loading} 
            isMobile={true}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        {/* Mobile content area - switches based on activeView */}
        <div className="flex-1 overflow-auto main-content">
          {activeView === 'agents' && (
            <AgentPanel agents={agents} loading={loading} isMobile={true} inline={true} />
          )}
          {activeView === 'missions' && (
            <MissionQueue missions={missions} loading={loading} isMobile={true} />
          )}
          {activeView === 'feed' && (
            <LiveFeed feed={feed} loading={loading} isMobile={true} isConnected={isConnected} />
          )}
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav activeView={activeView} onViewChange={setActiveView} />
    </div>
  )
}

export default App
