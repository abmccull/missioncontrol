const statusColors = {
  working: 'bg-green-400',
  standby: 'bg-yellow-400',
  offline: 'bg-gray-500',
}

const statusLabels = {
  working: 'WORKING',
  standby: 'STANDBY',
  offline: 'OFFLINE',
}

const typeColors = {
  EXEC: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  LEAD: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  SPC: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
}

export default function AgentCard({ agent, compact = false }) {
  const { name, emoji, role, status, type = 'SPC', lastSeen } = agent

  if (compact) {
    // Compact mobile view
    return (
      <div className={`
        agent-card p-2.5 rounded-lg cursor-pointer transition-all touch-target
        ${status === 'working' ? 'bg-[#242b3d] border-l-2 border-green-400' : 'hover:bg-[#242b3d]/50'}
      `}>
        <div className="flex items-center gap-2">
          <div className="agent-card-emoji text-base">{emoji || '🤖'}</div>
          
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
      agent-card p-3 rounded-lg cursor-pointer transition-all touch-target
      ${status === 'working' ? 'bg-[#242b3d] border-l-2 border-green-400' : 'hover:bg-[#242b3d]/50'}
    `}>
      <div className="flex items-start gap-3">
        <div className="agent-card-emoji text-lg">{emoji || '🤖'}</div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="agent-card-name font-medium text-white text-sm">{name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${typeColors[type] || typeColors.SPC}`}>
              {type}
            </span>
          </div>
          <div className="agent-card-role text-xs text-gray-400 truncate">{role}</div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${statusColors[status] || statusColors.offline} ${status === 'working' ? 'animate-pulse' : ''}`}></span>
            <span className={`text-[10px] font-medium ${
              status === 'working' ? 'text-green-400' : 
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
