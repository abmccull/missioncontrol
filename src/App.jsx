import { useState, useEffect } from 'react'
import Header from './components/Header'
import AgentPanel from './components/AgentPanel'
import MissionQueue from './components/MissionQueue'
import LiveFeed from './components/LiveFeed'
import MobileNav from './components/MobileNav'

function App() {
  const [agents, setAgents] = useState([])
  const [missions, setMissions] = useState({ queue: [], progress: [], review: [], done: [] })
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Mobile state
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeView, setActiveView] = useState('missions') // 'agents' | 'missions' | 'feed'

  useEffect(() => {
    const fetchData = async () => {
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
    }

    fetchData()
    const interval = setInterval(fetchData, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
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

  const activeCount = agents.filter(a => a.status === 'working').length

  return (
    <div className="min-h-screen bg-[#0f1419] flex flex-col">
      <Header 
        activeCount={activeCount} 
        totalCount={agents.length || 15}
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
        <LiveFeed feed={feed} loading={loading} />
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
            <LiveFeed feed={feed} loading={loading} isMobile={true} />
          )}
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav activeView={activeView} onViewChange={setActiveView} />
    </div>
  )
}

export default App
