const priorityColors = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

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

const tagColors = {
  'urgent': 'bg-red-500/20 text-red-400',
  'research': 'bg-blue-500/20 text-blue-400',
  'development': 'bg-green-500/20 text-green-400',
  'marketing': 'bg-purple-500/20 text-purple-400',
  'ai-tools': 'bg-cyan-500/20 text-cyan-400',
  'competitive-analysis': 'bg-orange-500/20 text-orange-400',
}

export default function TaskCard({ task }) {
  const { title, description, priority = 'medium', agent, tags = [], created, comments = 0 } = task
  const agentInitial = agent?.[0] || '?'
  const agentColor = agentColors[agent] || '#6b7280'

  return (
    <div className="task-card bg-[#242b3d] rounded-lg p-3 hover:bg-[#2a3347] transition-colors cursor-pointer group border border-transparent hover:border-gray-600 touch-target">
      {/* Priority Badge */}
      {priority && priority !== 'medium' && (
        <div className="mb-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-medium ${priorityColors[priority]}`}>
            ↑ {priority}
          </span>
        </div>
      )}
      
      {/* Title */}
      <h3 className="task-card-title text-sm font-medium text-white mb-1 group-hover:text-blue-400 transition-colors line-clamp-2">
        {title}
      </h3>
      
      {/* Description */}
      {description && (
        <p className="task-card-description text-xs text-gray-400 mb-3 line-clamp-2">{description}</p>
      )}

      {/* Agent + Time Row */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          {agent ? (
            <div className="flex items-center gap-2">
              {/* Agent Initial Circle */}
              <div 
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
                style={{ backgroundColor: agentColor }}
              >
                {agentInitial}
              </div>
              <span className="text-[10px] text-gray-400">{created || 'just now'}</span>
            </div>
          ) : (
            <div className="text-[10px] text-gray-500 italic">Unassigned</div>
          )}
        </div>
        
        {/* Comment Count */}
        {comments > 0 && (
          <div className="flex items-center gap-1 text-gray-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-[10px]">{comments}</span>
          </div>
        )}
      </div>

      {/* Tags Row */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.slice(0, 3).map((tag, idx) => (
            <span 
              key={idx} 
              className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-medium ${
                tagColors[tag.toLowerCase()] || 'bg-gray-500/20 text-gray-400'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
