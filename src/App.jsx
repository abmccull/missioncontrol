import { useState, useEffect, useCallback } from 'react'
import Header from './components/Header'
import AgentPanel from './components/AgentPanel'
import MissionQueue from './components/MissionQueue'
import LiveFeed from './components/LiveFeed'
import MobileNav from './components/MobileNav'
import TaskDetailModal from './components/TaskDetailModal'
import CreateTaskModal from './components/CreateTaskModal'
import AgentProfilePanel from './components/AgentProfilePanel'
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
  
  // Modal state
  const [selectedTask, setSelectedTask] = useState(null)
  const [selectedTaskColumn, setSelectedTaskColumn] = useState(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  
  // Agent profile panel state
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [isAgentProfileOpen, setIsAgentProfileOpen] = useState(false)
  
  const { isConnected, lastMessage, connectionStatus } = useWebSocket()

  // API base URL
  const API_URL = import.meta.env.VITE_API_URL || 'https://api.woodfloorwarehouse.cc'

  // Initial data fetch
  const fetchData = useCallback(async () => {
    try {
      const [agentsRes, missionsRes, feedRes] = await Promise.all([
        fetch(`${API_URL}/api/agents`).then(r => r.json()).catch(() => ({ agents: [] })),
        fetch(`${API_URL}/api/missions`).then(r => r.json()).catch(() => ({ queue: [], progress: [], review: [], done: [] })),
        fetch(`${API_URL}/api/feed`).then(r => r.json()).catch(() => ({ feed: [] }))
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

  // Task modal handlers
  const handleTaskClick = useCallback((task, column) => {
    setSelectedTask(task)
    setSelectedTaskColumn(column)
    setIsTaskModalOpen(true)
  }, [])

  const handleCloseTaskModal = useCallback(() => {
    setIsTaskModalOpen(false)
    setSelectedTask(null)
    setSelectedTaskColumn(null)
  }, [])

  const handleCompleteTask = useCallback(async (taskId) => {
    try {
      const response = await fetch(`${API_URL}/api/missions/${taskId}/complete`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to complete task')
      // The WebSocket will update the UI, or we can manually update
      setMissions(prev => ({
        ...prev,
        queue: prev.queue.filter(m => m.id !== taskId),
        progress: prev.progress.filter(m => m.id !== taskId),
        review: prev.review.filter(m => m.id !== taskId),
        done: [{ id: taskId, status: 'done', ...selectedTask }, ...prev.done.slice(0, 9)]
      }))
    } catch (err) {
      console.error('Failed to complete task:', err)
      throw err
    }
  }, [API_URL, selectedTask])

  // Create task handlers
  const handleNewTaskClick = useCallback(() => {
    setIsCreateModalOpen(true)
  }, [])

  const handleCloseCreateModal = useCallback(() => {
    setIsCreateModalOpen(false)
  }, [])

  const handleTaskCreated = useCallback((newTask) => {
    // Add to queue immediately
    setMissions(prev => ({
      ...prev,
      queue: [newTask, ...prev.queue]
    }))
  }, [])

  // Agent profile handlers
  const handleAgentClick = useCallback((agent) => {
    setSelectedAgent(agent)
    setIsAgentProfileOpen(true)
    // Close sidebar on mobile when agent is clicked
    setSidebarOpen(false)
  }, [])

  const handleCloseAgentProfile = useCallback(() => {
    setIsAgentProfileOpen(false)
    setSelectedAgent(null)
  }, [])

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
        onNewTask={handleNewTaskClick}
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
        <AgentPanel agents={agents} loading={loading} onAgentClick={handleAgentClick} />
        
        {/* Center - Mission Queue */}
        <MissionQueue missions={missions} loading={loading} onTaskClick={handleTaskClick} />
        
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
            onAgentClick={handleAgentClick}
          />
        </div>

        {/* Mobile content area - switches based on activeView */}
        <div className="flex-1 overflow-auto main-content">
          {activeView === 'agents' && (
            <AgentPanel agents={agents} loading={loading} isMobile={true} inline={true} onAgentClick={handleAgentClick} />
          )}
          {activeView === 'missions' && (
            <MissionQueue missions={missions} loading={loading} isMobile={true} onTaskClick={handleTaskClick} />
          )}
          {activeView === 'feed' && (
            <LiveFeed feed={feed} loading={loading} isMobile={true} isConnected={isConnected} />
          )}
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav activeView={activeView} onViewChange={setActiveView} />

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        column={selectedTaskColumn}
        isOpen={isTaskModalOpen}
        onClose={handleCloseTaskModal}
        onComplete={handleCompleteTask}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSubmit={handleTaskCreated}
        apiUrl={API_URL}
      />

      {/* Agent Profile Panel */}
      <AgentProfilePanel
        agent={selectedAgent}
        isOpen={isAgentProfileOpen}
        onClose={handleCloseAgentProfile}
        onTaskClick={handleTaskClick}
        apiUrl={API_URL}
      />
    </div>
  )
}

export default App
