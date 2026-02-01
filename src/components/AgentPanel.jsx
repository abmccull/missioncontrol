import AgentCard from './AgentCard'

// Fallback agents for when API isn't ready
const fallbackAgents = [
  { name: 'JARVIS', emoji: '🎯', role: 'Chief of Staff', status: 'working', type: 'EXEC' },
  { name: 'FORGE', emoji: '🔨', role: 'Builder', status: 'working', type: 'SPC' },
  { name: 'SCHOLAR', emoji: '📚', role: 'Researcher', status: 'standby', type: 'SPC' },
  { name: 'SCRIBE', emoji: '✍️', role: 'Writer', status: 'standby', type: 'SPC' },
  { name: 'SENTINEL', emoji: '🛡️', role: 'Monitor', status: 'working', type: 'SPC' },
  { name: 'ORACLE', emoji: '🔮', role: 'Analyst', status: 'standby', type: 'SPC' },
  { name: 'HERALD', emoji: '📢', role: 'Comms', status: 'standby', type: 'SPC' },
  { name: 'MAVEN', emoji: '📊', role: 'Marketing', status: 'standby', type: 'SPC' },
  { name: 'NEXUS', emoji: '🔗', role: 'Integrator', status: 'offline', type: 'SPC' },
  { name: 'CIPHER', emoji: '🔐', role: 'Security', status: 'offline', type: 'SPC' },
  { name: 'SAGE', emoji: '🧘', role: 'Advisor', status: 'standby', type: 'SPC' },
  { name: 'PIXEL', emoji: '🎨', role: 'Designer', status: 'working', type: 'SPC' },
  { name: 'ECHO', emoji: '🔊', role: 'Voice', status: 'offline', type: 'SPC' },
  { name: 'ATLAS', emoji: '🗺️', role: 'Navigator', status: 'offline', type: 'SPC' },
  { name: 'TEMPO', emoji: '⏱️', role: 'Scheduler', status: 'standby', type: 'SPC' },
]

export default function AgentPanel({ agents, loading, isMobile = false, inline = false, onClose }) {
  const displayAgents = agents.length > 0 ? agents : fallbackAgents
  
  const activeCount = displayAgents.filter(a => a.status === 'working').length
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
              <AgentCard key={agent.name || idx} agent={agent} compact={false} />
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
              <AgentCard key={agent.name || idx} agent={agent} compact={true} />
            ))
          )}
        </div>
      </aside>
    )
  }

  // Desktop view
  return (
    <aside className="agent-panel w-64 bg-[#1a1f2e] border-r border-gray-700 flex flex-col desktop-sidebar">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Agents</h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">{displayAgents.length}</span>
            <button className="text-gray-400 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
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

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <span className="animate-pulse">Loading agents...</span>
          </div>
        ) : (
          displayAgents.map((agent, idx) => (
            <AgentCard key={agent.name || idx} agent={agent} />
          ))
        )}
      </div>
    </aside>
  )
}
