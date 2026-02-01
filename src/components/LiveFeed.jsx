import { useState, useEffect, useRef } from 'react'

// Agent colors for initials
const agentColors = {
  JARVIS: '#6366f1', HUNTER: '#f97316', INBOX: '#06b6d4', MONEY: '#22c55e', LINKEDIN: '#0077b5',
  XPERT: '#1d9bf0', DISPATCH: '#8b5cf6', SCOUT: '#eab308', FORGE: '#ef4444', ORACLE: '#a855f7',
  VIBE: '#ec4899', SENTINEL: '#6b7280', NEXUS: '#14b8a6', CLAW: '#f43f5e', CRITIC: '#84cc16',
  SYSTEM: '#374151',
}

const agentTextColors = {
  JARVIS: 'text-indigo-400', HUNTER: 'text-orange-400', INBOX: 'text-cyan-400',
  MONEY: 'text-green-400', LINKEDIN: 'text-sky-400', XPERT: 'text-blue-400',
  DISPATCH: 'text-violet-400', SCOUT: 'text-yellow-400', FORGE: 'text-red-400',
  ORACLE: 'text-purple-400', VIBE: 'text-pink-400', SENTINEL: 'text-gray-400',
  NEXUS: 'text-teal-400', CLAW: 'text-rose-400', CRITIC: 'text-lime-400',
  SYSTEM: 'text-gray-500',
}

// Action icons
const actionIcons = {
  'started': '▶️',
  'completed': '✅',
  'created': '📝',
  'moved': '➡️',
  'is working on': '⚡',
  'updated status': '🔄',
  'assigned': '👤',
  'submitted for review': '👀',
  'returned to progress': '🔙',
}

const tabs = ['All', 'Tasks', 'Status']

export default function LiveFeed({ feed, loading, isConnected }) {
  const [activeTab, setActiveTab] = useState('All')
  const [localFeed, setLocalFeed] = useState([])
  const feedContainerRef = useRef(null)
  
  // Merge API feed with any local updates
  useEffect(() => {
    if (feed.length > 0) {
      // Dedupe by id
      const seen = new Set()
      const merged = [...localFeed, ...feed].filter(item => {
        if (seen.has(item.id)) return false
        seen.add(item.id)
        return true
      })
      // Sort by newest first and limit
      merged.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0
        return timeB - timeA
      })
      setLocalFeed(merged.slice(0, 50))
    }
  }, [feed])
  
  const displayFeed = localFeed.length > 0 ? localFeed : feed

  const filteredFeed = activeTab === 'All' 
    ? displayFeed 
    : displayFeed.filter(item => {
        if (activeTab === 'Tasks') {
          return item.targetType === 'mission' || item.type === 'task' || 
                 ['started', 'completed', 'created', 'moved', 'submitted for review'].includes(item.action)
        }
        if (activeTab === 'Status') {
          return item.targetType === 'status' || item.type === 'status' ||
                 item.action?.includes('working') || item.action?.includes('status')
        }
        return true
      })

  return (
    <aside className="w-72 bg-[#1a1f2e] border-l border-gray-700/50 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></span>
            <h2 className="text-xs font-semibold text-white uppercase tracking-wide">Live Feed</h2>
          </div>
          <span className="text-[10px] text-gray-500">
            {isConnected ? 'Live' : 'Reconnecting...'}
          </span>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex gap-0.5 bg-[#0f1419] rounded-lg p-0.5">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-2 py-1 text-[10px] rounded-md transition-all ${
                activeTab === tab 
                  ? 'bg-[#242b3d] text-white font-medium' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Feed List */}
      <div ref={feedContainerRef} className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="text-center text-gray-500 text-xs py-6 animate-pulse">Loading...</div>
        ) : filteredFeed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-600">
            <span className="text-2xl mb-2">📭</span>
            <span className="text-[10px]">No activity yet</span>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredFeed.map((item, idx) => (
              <FeedItem key={item.id || idx} item={item} />
            ))}
          </div>
        )}
      </div>
      
      {/* Status bar */}
      <div className="px-3 py-2 border-t border-gray-700/30 text-[9px] text-gray-600">
        {displayFeed.length} events • {filteredFeed.length} shown
      </div>
    </aside>
  )
}

function FeedItem({ item }) {
  const { agent, action, target, time, _new, targetType, status } = item
  const [isNew, setIsNew] = useState(_new)
  const initial = agent?.[0] || '?'
  const bgColor = agentColors[agent] || '#6b7280'
  const textColor = agentTextColors[agent] || 'text-gray-400'
  const icon = actionIcons[action] || '•'
  
  // Clear "new" animation after it plays
  useEffect(() => {
    if (_new) {
      const timer = setTimeout(() => setIsNew(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [_new])
  
  // Determine badge color based on action type
  const getBadgeColor = () => {
    if (action === 'completed') return 'bg-green-500/20 text-green-400'
    if (action === 'started') return 'bg-blue-500/20 text-blue-400'
    if (action === 'created') return 'bg-purple-500/20 text-purple-400'
    if (action?.includes('working')) return 'bg-yellow-500/20 text-yellow-400'
    if (action === 'submitted for review') return 'bg-purple-500/20 text-purple-400'
    return 'bg-gray-500/20 text-gray-400'
  }
  
  return (
    <div 
      className={`
        flex items-start gap-2 p-2 rounded-lg transition-all duration-300
        hover:bg-[#242b3d]/50
        ${isNew ? 'bg-green-400/10 animate-slide-in-feed' : ''}
      `}
    >
      {/* Agent Initial Circle */}
      <div 
        className={`
          w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0
          transition-transform duration-300
          ${isNew ? 'scale-110 ring-2 ring-green-400/30' : ''}
        `}
        style={{ backgroundColor: bgColor }}
        title={agent}
      >
        {initial}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`font-medium text-[11px] ${textColor}`}>{agent}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${getBadgeColor()}`}>
            {icon} {action}
          </span>
        </div>
        {target && (
          <p className="text-[11px] text-gray-300 mt-0.5 line-clamp-1" title={target}>
            {target}
          </p>
        )}
        <span className="text-[10px] text-gray-600">{time}</span>
      </div>
      
      {/* Status indicator for task events */}
      {status && targetType === 'mission' && (
        <div className={`
          w-2 h-2 rounded-full flex-shrink-0 mt-1
          ${status === 'done' ? 'bg-green-500' : 
            status === 'progress' ? 'bg-blue-500' :
            status === 'review' ? 'bg-purple-500' : 'bg-gray-500'}
        `} title={`Status: ${status}`} />
      )}
      
      {/* CSS for feed animation */}
      <style>{`
        @keyframes slide-in-feed {
          0% { 
            opacity: 0; 
            transform: translateY(-10px); 
          }
          100% { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        .animate-slide-in-feed {
          animation: slide-in-feed 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
