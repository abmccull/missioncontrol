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

const typeColors = {
  EXEC: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  LEAD: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  SPC: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
}

export default function AgentCard({ agent }) {
  const { name, emoji, role, status, type = 'SPC', lastSeen, currentTask, _updated } = agent
  const [isAnimating, setIsAnimating] = useState(false)

  // Trigger animation when agent status changes
  useEffect(() => {
    if (_updated) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 500)
      return () => clearTimeout(timer)
    }
  }, [_updated])

  return (
    <div className={`
      p-3 rounded-lg cursor-pointer transition-all duration-300
      ${status === 'working' ? 'bg-[#242b3d] border-l-2 border-green-400' : ''}
      ${status === 'blocked' ? 'bg-[#2d242b] border-l-2 border-red-400' : ''}
      ${status !== 'working' && status !== 'blocked' ? 'hover:bg-[#242b3d]/50' : ''}
      ${isAnimating ? 'scale-[1.02] shadow-lg shadow-green-400/10' : ''}
    `}>
      <div className="flex items-start gap-3">
        <div className={`text-lg transition-transform duration-300 ${isAnimating ? 'scale-110' : ''}`}>
          {emoji || '🤖'}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white text-sm">{name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${typeColors[type] || typeColors.SPC}`}>
              {type}
            </span>
          </div>
          <div className="text-xs text-gray-400 truncate">{role}</div>
          {currentTask && (
            <div className="text-[10px] text-gray-500 truncate mt-1 max-w-[140px]" title={currentTask}>
              {currentTask.length > 35 ? currentTask.slice(0, 35) + '...' : currentTask}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <span className={`
              w-2 h-2 rounded-full transition-all duration-300
              ${statusColors[status] || statusColors.offline} 
              ${status === 'working' ? 'animate-pulse' : ''}
              ${isAnimating ? 'scale-150' : ''}
            `}></span>
            <span className={`text-[10px] font-medium transition-colors duration-300 ${
              status === 'working' ? 'text-green-400' : 
              status === 'blocked' ? 'text-red-400' :
              status === 'standby' ? 'text-yellow-400' : 'text-gray-500'
            }`}>
              {statusLabels[status] || 'OFFLINE'}
            </span>
          </div>
          {lastSeen && (
            <span className="text-[10px] text-gray-500">{lastSeen}</span>
          )}
        </div>
      </div>
    </div>
  )
}
