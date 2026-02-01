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

export default function AgentPanel({ agents, loading }) {
  const displayAgents = agents.length > 0 ? agents : fallbackAgents
  
  const activeCount = displayAgents.filter(a => a.status === 'working').length
  const blockedCount = displayAgents.filter(a => a.status === 'blocked').length
  const standbyCount = displayAgents.filter(a => a.status === 'standby').length

  return (
    <aside className="w-64 bg-[#1a1f2e] border-r border-gray-700 flex flex-col">
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
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            {activeCount} active
          </span>
          {blockedCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-400 rounded-full"></span>
              {blockedCount} blocked
            </span>
          )}
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
