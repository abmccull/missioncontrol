import AgentCard from './AgentCard'

// Fallback agents for when API isn't ready (our actual squad)
const fallbackAgents = [
  { name: 'JARVIS', emoji: '🎯', role: 'Chief Orchestrator', status: 'working', type: 'EXEC' },
  { name: 'HUNTER', emoji: '🎯', role: 'Sales & Relationships', status: 'working', type: 'SPC' },
  { name: 'INBOX', emoji: '📧', role: 'Email Intelligence', status: 'working', type: 'SPC' },
  { name: 'MONEY', emoji: '💰', role: 'Revenue Intelligence', status: 'working', type: 'SPC' },
  { name: 'LINKEDIN', emoji: '💼', role: 'LinkedIn Growth', status: 'working', type: 'SPC' },
  { name: 'XPERT', emoji: '🐦', role: 'X/Twitter', status: 'blocked', type: 'SPC' },
  { name: 'DISPATCH', emoji: '📰', role: 'Newsletter', status: 'working', type: 'SPC' },
  { name: 'SCOUT', emoji: '🔍', role: 'Research & Intel', status: 'working', type: 'SPC' },
  { name: 'FORGE', emoji: '🔨', role: 'Builder/Developer', status: 'working', type: 'SPC' },
  { name: 'ORACLE', emoji: '🔮', role: 'Trading Intelligence', status: 'working', type: 'SPC' },
  { name: 'VIBE', emoji: '🎨', role: 'Marketing Systems', status: 'standby', type: 'SPC' },
  { name: 'SENTINEL', emoji: '🛡️', role: 'Security & Ops', status: 'working', type: 'SPC' },
  { name: 'NEXUS', emoji: '🔗', role: 'System Intelligence', status: 'standby', type: 'SPC' },
  { name: 'CLAW', emoji: '🦀', role: 'OpenClaw Specialist', status: 'working', type: 'SPC' },
  { name: 'CRITIC', emoji: '🎭', role: 'Quality Control', status: 'standby', type: 'SPC' },
]

export default function AgentPanel({ agents, loading, isMobile = false, inline = false, onClose, onAgentClick }) {
  const displayAgents = agents.length > 0 ? agents : fallbackAgents
  
  const activeCount = displayAgents.filter(a => a.status === 'working').length
  const blockedCount = displayAgents.filter(a => a.status === 'blocked').length
  const standbyCount = displayAgents.filter(a => a.status === 'standby').length

  // Mobile inline view (full screen in mobile layout)
  if (inline) {
    return (
      <div className="flex flex-col h-full bg-[#0f1419]">
        <div className="p-4 border-b border-gray-700 bg-[#1a1f2e]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Agents</h2>
            <span className="text-gray-400 text-xs">{displayAgents.length} total</span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              {activeCount} active
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
              {standbyCount} standby
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <span className="animate-pulse">Loading agents...</span>
            </div>
          ) : (
            displayAgents.map((agent, idx) => (
              <AgentCard key={agent.name || idx} agent={agent} compact={false} onClick={onAgentClick} />
            ))
          )}
        </div>
      </div>
    )
  }

  // Mobile sidebar view
  if (isMobile) {
    return (
      <aside className="w-full h-full bg-[#1a1f2e] flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Agents</h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                {activeCount} active
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                {standbyCount} standby
              </span>
            </div>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white touch-target"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <span className="animate-pulse">Loading agents...</span>
            </div>
          ) : (
            displayAgents.map((agent, idx) => (
              <AgentCard key={agent.name || idx} agent={agent} compact={true} onClick={onAgentClick} />
            ))
          )}
        </div>
      </aside>
    )
  }

  // Desktop view
  return (
    <aside className="w-56 bg-[#1a1f2e] border-r border-gray-700/50 flex flex-col desktop-sidebar">
      {/* Header */}
      <div className="p-3 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold text-white uppercase tracking-wide">Agents</h2>
            <span className="text-[10px] text-gray-500">{displayAgents.length}</span>
          </div>
          <button className="text-gray-400 hover:text-white w-5 h-5 flex items-center justify-center rounded hover:bg-[#242b3d] transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
        
        {/* Status Summary */}
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
            <span className="text-green-400">{activeCount} active</span>
          </span>
          {blockedCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
              <span className="text-red-400">{blockedCount}</span>
            </span>
          )}
          {standbyCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
              <span className="text-gray-400">{standbyCount}</span>
            </span>
          )}
        </div>
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto p-1.5">
        {loading ? (
          <div className="flex items-center justify-center h-24 text-gray-500 text-xs animate-pulse">
            Loading agents...
          </div>
        ) : (
          <div className="space-y-0.5">
            {displayAgents.map((agent, idx) => (
              <AgentCard key={agent.name || idx} agent={agent} onClick={onAgentClick} />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
