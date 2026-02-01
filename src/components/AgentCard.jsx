import { useState, useEffect } from 'react'

const statusColors = {
  working: 'bg-green-400',
  standby: 'bg-yellow-400',
  blocked: 'bg-red-400',
  offline: 'bg-gray-500',
}

const statusLabels = {
  working: 'WORKING',
  standby: 'STANDBY',
  blocked: 'BLOCKED',
  offline: 'OFFLINE',
}

const statusTextColors = {
  working: 'text-green-400',
  standby: 'text-gray-400',
  blocked: 'text-red-400',
  offline: 'text-gray-500',
}

const typeColors = {
  EXEC: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  LEAD: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  SPC: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
}

// Agent colors for initials
const agentColors = {
  JARVIS: '#6366f1', // indigo
  HUNTER: '#f97316', // orange
  INBOX: '#06b6d4', // cyan
  MONEY: '#22c55e', // green
  LINKEDIN: '#0077b5', // linkedin blue
  XPERT: '#1d9bf0', // twitter blue
  DISPATCH: '#8b5cf6', // violet
  SCOUT: '#eab308', // yellow
  FORGE: '#ef4444', // red
  ORACLE: '#a855f7', // purple
  VIBE: '#ec4899', // pink
  SENTINEL: '#6b7280', // gray
  NEXUS: '#14b8a6', // teal
  CLAW: '#f43f5e', // rose
  CRITIC: '#84cc16', // lime
}

export default function AgentCard({ agent, compact = false }) {
  const { name, emoji: _emoji, role, status, type = 'SPC', lastSeen: _lastSeen, currentTask, _updated } = agent
  const [isAnimating, setIsAnimating] = useState(false)

  // Trigger animation when agent status changes
  useEffect(() => {
    if (!_updated) return
    
    // Schedule animation start for next tick to avoid synchronous setState
    const startTimer = setTimeout(() => setIsAnimating(true), 0)
    const endTimer = setTimeout(() => setIsAnimating(false), 500)
    
    return () => {
      clearTimeout(startTimer)
      clearTimeout(endTimer)
    }
  }, [_updated])

  const initial = name?.[0] || '?'
  const bgColor = agentColors[name] || '#6b7280'

  if (compact) {
    // Compact mobile view
    return (
      <div className={`
        agent-card p-2.5 rounded-lg cursor-pointer transition-all touch-target
        ${status === 'working' ? 'bg-[#242b3d] border-l-2 border-green-400' : 'hover:bg-[#242b3d]/50'}
      `}>
        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
            style={{ backgroundColor: bgColor }}
          >
            {initial}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="agent-card-name font-medium text-white text-xs">{name}</span>
              <span className={`text-[9px] px-1 py-0.5 rounded border ${typeColors[type] || typeColors.SPC}`}>
                {type}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${statusColors[status] || statusColors.offline} ${status === 'working' ? 'animate-pulse' : ''}`}></span>
          </div>
        </div>
      </div>
    )
  }

  // Standard view
  return (
    <div className={`
      p-3 rounded-lg cursor-pointer transition-all duration-300
      ${status === 'working' ? 'bg-[#242b3d]' : ''}
      ${status === 'blocked' ? 'bg-[#2d242b]' : ''}
      ${status !== 'working' && status !== 'blocked' ? 'hover:bg-[#242b3d]/50' : ''}
      ${isAnimating ? 'scale-[1.02] shadow-lg shadow-green-400/10' : ''}
    `}>
      <div className="flex items-center gap-3">
        {/* Initial Circle */}
        <div 
          className={`
            w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold
            transition-transform duration-300 flex-shrink-0
            ${isAnimating ? 'scale-110' : ''}
          `}
          style={{ backgroundColor: bgColor }}
        >
          {initial}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="agent-card-name font-medium text-white text-sm">{name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${typeColors[type] || typeColors.SPC}`}>
              {type}
            </span>
          </div>
          <div className="text-xs text-gray-500 truncate">{role}</div>
        </div>

        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className={`
              w-2 h-2 rounded-full transition-all duration-300
              ${statusColors[status] || statusColors.offline} 
              ${status === 'working' ? 'animate-pulse' : ''}
              ${isAnimating ? 'scale-150' : ''}
            `}></span>
            <span className={`text-[10px] font-medium ${statusTextColors[status] || 'text-gray-500'}`}>
              {statusLabels[status] || 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Current task - shown below */}
      {currentTask && (
        <div 
          className="mt-2 ml-11 text-[10px] text-gray-500 truncate" 
          title={currentTask}
        >
          {currentTask.length > 45 ? currentTask.slice(0, 45) + '...' : currentTask}
        </div>
      )}
    </div>
  )
}
