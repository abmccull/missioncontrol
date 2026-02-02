import { useState, useEffect, useRef } from 'react'

const statusColors = {
  working: 'bg-green-400',
  standby: 'bg-yellow-400',
  blocked: 'bg-red-400',
  offline: 'bg-gray-500',
}

const statusLabels = {
  working: 'ACTIVE',
  standby: 'STANDBY',
  blocked: 'BLOCKED',
  offline: 'OFFLINE',
}

const statusTextColors = {
  working: 'text-green-400',
  standby: 'text-yellow-400',
  blocked: 'text-red-400',
  offline: 'text-gray-500',
}

const agentColors = {
  JARVIS: '#6366f1', HUNTER: '#f97316', INBOX: '#06b6d4', MONEY: '#22c55e', LINKEDIN: '#0077b5',
  XPERT: '#1d9bf0', DISPATCH: '#8b5cf6', SCOUT: '#eab308', FORGE: '#ef4444', ORACLE: '#a855f7',
  VIBE: '#ec4899', SENTINEL: '#6b7280', NEXUS: '#14b8a6', CLAW: '#f43f5e', CRITIC: '#84cc16',
}

const priorityColors = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

// Parse markdown for display
function renderMarkdown(text) {
  if (!text) return null
  
  const lines = text.split('\n')
  const elements = []
  
  const processInline = (text) => {
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    // Italic
    text = text.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    // Code
    text = text.replace(/`(.*?)`/g, '<code class="bg-[#242b3d] px-1.5 py-0.5 rounded text-xs font-mono text-cyan-400">$1</code>')
    return <span dangerouslySetInnerHTML={{ __html: text }} />
  }
  
  lines.forEach((line, idx) => {
    const trimmed = line.trim()
    
    if (trimmed.startsWith('## ')) {
      elements.push(<h3 key={idx} className="text-sm font-semibold text-white mt-3 mb-1">{processInline(trimmed.slice(3))}</h3>)
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={idx} className="flex items-start gap-2 my-0.5 text-xs text-gray-300">
          <span className="text-gray-500 mt-0.5">•</span>
          <span>{processInline(trimmed.slice(2))}</span>
        </div>
      )
    } else if (trimmed === '') {
      elements.push(<div key={idx} className="h-1" />)
    } else if (!trimmed.startsWith('#')) {
      elements.push(<p key={idx} className="text-gray-300 text-xs leading-relaxed my-0.5">{processInline(trimmed)}</p>)
    }
  })
  
  return elements
}

// Format relative time
function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Unknown'
  const now = Date.now()
  const diff = now - timestamp
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

// Format cron expression to human readable
function formatCron(expr, tz) {
  const parts = expr.split(' ')
  if (parts.length < 5) return expr
  
  const [min, hour, dom, mon, dow] = parts
  
  let time = ''
  if (hour !== '*' && min !== '*') {
    const h = parseInt(hour)
    const m = parseInt(min)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    time = `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
  }
  
  let days = ''
  if (dow === '*' && dom === '*') {
    days = 'Daily'
  } else if (dow !== '*') {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    if (dow.includes(',')) {
      days = dow.split(',').map(d => dayNames[parseInt(d)] || d).join(', ')
    } else {
      days = dayNames[parseInt(dow)] || dow
    }
  }
  
  const tzShort = tz?.replace('America/', '') || 'UTC'
  return `${days} ${time} (${tzShort})`
}

export default function AgentProfilePanel({ agent, isOpen, onClose, onTaskClick, apiUrl }) {
  const panelRef = useRef(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [crons, setCrons] = useState([])
  const [loading, setLoading] = useState(true)
  
  const { name, role, status, currentTask, color } = agent || {}
  const agentColor = color || agentColors[name] || '#6b7280'
  
  // Fetch agent profile data
  useEffect(() => {
    if (!isOpen || !name) return
    
    const fetchProfile = async () => {
      setLoading(true)
      try {
        const [profileRes, tasksRes, cronsRes] = await Promise.all([
          fetch(`${apiUrl}/api/agents/${name.toLowerCase()}`).then(r => r.json()).catch(() => ({})),
          fetch(`${apiUrl}/api/agents/${name.toLowerCase()}/tasks`).then(r => r.json()).catch(() => ({ tasks: [] })),
          fetch(`${apiUrl}/api/agents/${name.toLowerCase()}/crons`).then(r => r.json()).catch(() => ({ crons: [] })),
        ])
        setProfile(profileRes)
        setTasks(tasksRes.tasks || [])
        setCrons(cronsRes.crons || [])
      } catch (err) {
        console.error('Failed to fetch agent profile:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchProfile()
  }, [isOpen, name, apiUrl])
  
  // Close on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])
  
  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === panelRef.current) {
      onClose()
    }
  }
  
  if (!isOpen || !agent) return null
  
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'tasks', label: 'Tasks', count: tasks.length },
    { id: 'activity', label: 'Activity' },
    { id: 'schedule', label: 'Schedule', count: crons.length },
  ]
  
  return (
    <div 
      ref={panelRef}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md bg-[#1a1f2e] h-full overflow-hidden shadow-2xl border-l border-gray-700/50 animate-slideInRight flex flex-col">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-gray-700/50 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Large Avatar */}
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg"
                style={{ backgroundColor: agentColor }}
              >
                {name?.[0] || '?'}
              </div>
              
              <div>
                <h2 className="text-xl font-bold text-white">{name}</h2>
                <p className="text-sm text-gray-400">{role}</p>
                
                {/* Status indicator */}
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${statusColors[status]} ${status === 'working' ? 'animate-pulse' : ''}`}></span>
                  <span className={`text-xs font-medium ${statusTextColors[status]}`}>
                    {statusLabels[status]}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Close button */}
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#242b3d] rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Current task snippet */}
          {currentTask && (
            <div className="mt-3 p-2 bg-[#242b3d] rounded-lg">
              <div className="text-[10px] uppercase text-gray-500 font-medium mb-1">Current Task</div>
              <p className="text-sm text-gray-300 truncate">{currentTask}</p>
            </div>
          )}
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-700/50 px-4 flex-shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-3 py-2.5 text-xs font-medium transition-colors relative
                ${activeTab === tab.id 
                  ? 'text-white' 
                  : 'text-gray-500 hover:text-gray-300'
                }
              `}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 text-[10px] text-gray-500">({tab.count})</span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <span className="animate-pulse">Loading profile...</span>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Mission / Soul excerpt */}
                  {profile?.soulExcerpt && (
                    <div>
                      <h3 className="text-xs uppercase text-gray-500 font-medium mb-2">Mission & Identity</h3>
                      <div className="bg-[#242b3d] rounded-lg p-3 text-sm text-gray-300 leading-relaxed">
                        {renderMarkdown(profile.soulExcerpt)}
                      </div>
                    </div>
                  )}
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#242b3d] rounded-lg p-3">
                      <div className="text-[10px] uppercase text-gray-500 font-medium mb-1">Last Heartbeat</div>
                      <div className="text-sm text-white font-medium">
                        {formatRelativeTime(profile?.lastHeartbeat)}
                      </div>
                    </div>
                    <div className="bg-[#242b3d] rounded-lg p-3">
                      <div className="text-[10px] uppercase text-gray-500 font-medium mb-1">Sessions Today</div>
                      <div className="text-sm text-white font-medium">{profile?.sessionsToday || 0}</div>
                    </div>
                    <div className="bg-[#242b3d] rounded-lg p-3">
                      <div className="text-[10px] uppercase text-gray-500 font-medium mb-1">Tasks Assigned</div>
                      <div className="text-sm text-white font-medium">{tasks.length}</div>
                    </div>
                    <div className="bg-[#242b3d] rounded-lg p-3">
                      <div className="text-[10px] uppercase text-gray-500 font-medium mb-1">Cron Jobs</div>
                      <div className="text-sm text-white font-medium">{crons.length}</div>
                    </div>
                  </div>
                  
                  {/* Token usage if available */}
                  {profile?.usage && (
                    <div>
                      <h3 className="text-xs uppercase text-gray-500 font-medium mb-2">Token Usage</h3>
                      <div className="bg-[#242b3d] rounded-lg p-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Today</span>
                          <span className="text-white">{(profile.usage.today?.tokens || 0).toLocaleString()} tokens</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Est. Cost</span>
                          <span className="text-green-400">${(profile.usage.today?.cost || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Tasks Tab */}
              {activeTab === 'tasks' && (
                <div className="space-y-2">
                  {tasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No tasks assigned to {name}
                    </div>
                  ) : (
                    tasks.map((task, idx) => (
                      <div 
                        key={task.id || idx}
                        onClick={() => onTaskClick?.(task, task.status || 'queue')}
                        className="bg-[#242b3d] rounded-lg p-3 cursor-pointer hover:bg-[#2d3548] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-medium text-white truncate flex-1">{task.title}</h4>
                          {task.priority && task.priority !== 'medium' && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase ${priorityColors[task.priority]}`}>
                              {task.priority}
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{task.description}</p>
                        )}
                        <div className="text-[10px] text-gray-500 mt-2">{task.created || 'recently'}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
              
              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className="space-y-3">
                  <h3 className="text-xs uppercase text-gray-500 font-medium mb-2">Recent Activity (WORKING.md)</h3>
                  
                  {profile?.workingExcerpt ? (
                    <div className="bg-[#242b3d] rounded-lg p-3">
                      {renderMarkdown(profile.workingExcerpt)}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No recent activity found
                    </div>
                  )}
                </div>
              )}
              
              {/* Schedule Tab */}
              {activeTab === 'schedule' && (
                <div className="space-y-2">
                  {crons.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No scheduled jobs for {name}
                    </div>
                  ) : (
                    crons.map((cron, idx) => (
                      <div 
                        key={cron.id || idx}
                        className="bg-[#242b3d] rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-medium text-white">{cron.name}</h4>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${cron.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                            {cron.enabled ? 'ACTIVE' : 'DISABLED'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatCron(cron.schedule?.expr || cron.expr, cron.schedule?.tz || cron.tz)}
                        </p>
                        {cron.nextRun && (
                          <p className="text-[10px] text-gray-500 mt-1">
                            Next: {formatRelativeTime(cron.nextRun)}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-700/50 bg-[#0f1419]/50 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#242b3d] rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
