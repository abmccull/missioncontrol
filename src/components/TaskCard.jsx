const priorityColors = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const agentEmojis = {
  JARVIS: '🎯',
  FORGE: '🔨',
  SCHOLAR: '📚',
  SCRIBE: '✍️',
  SENTINEL: '🛡️',
  ORACLE: '🔮',
  HERALD: '📢',
  MAVEN: '📊',
  NEXUS: '🔗',
  CIPHER: '🔐',
  SAGE: '🧘',
  PIXEL: '🎨',
  ECHO: '🔊',
  ATLAS: '🗺️',
  TEMPO: '⏱️',
}

export default function TaskCard({ task, column }) {
  const { title, description, priority = 'medium', agent, tags = [], created, comments } = task

  return (
    <div className="bg-[#242b3d] rounded-lg p-3 hover:bg-[#2a3347] transition-colors cursor-pointer group">
      {priority && (
        <div className="mb-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-medium ${priorityColors[priority]}`}>
            ↑ {priority}
          </span>
        </div>
      )}
      
      <h3 className="text-sm font-medium text-white mb-1 group-hover:text-blue-400 transition-colors">
        {title}
      </h3>
      
      {description && (
        <p className="text-xs text-gray-400 mb-3 line-clamp-2">{description}</p>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          {agent ? (
            <div className="flex items-center gap-1.5 bg-[#1a1f2e] px-2 py-1 rounded">
              <span className="text-xs">{agentEmojis[agent] || '🤖'}</span>
              <span className="text-[10px] text-gray-300">{agent}</span>
            </div>
          ) : (
            <div className="text-[10px] text-gray-500 italic">Unassigned</div>
          )}
        </div>
        
        <span className="text-[10px] text-gray-500">{created}</span>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="text-[9px] px-1.5 py-0.5 bg-[#1a1f2e] text-gray-400 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {comments > 0 && (
        <div className="flex items-center gap-1 mt-2 text-gray-500">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-[10px]">{comments}</span>
        </div>
      )}
    </div>
  )
}
