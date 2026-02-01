import { useState, useEffect } from 'react'

// Agent colors for initials
const agentColors = {
  JARVIS: '#6366f1', HUNTER: '#f97316', INBOX: '#06b6d4', MONEY: '#22c55e', LINKEDIN: '#0077b5',
  XPERT: '#1d9bf0', DISPATCH: '#8b5cf6', SCOUT: '#eab308', FORGE: '#ef4444', ORACLE: '#a855f7',
  VIBE: '#ec4899', SENTINEL: '#6b7280', NEXUS: '#14b8a6', CLAW: '#f43f5e', CRITIC: '#84cc16',
}

const agentTextColors = {
  JARVIS: 'text-indigo-400', HUNTER: 'text-orange-400', INBOX: 'text-cyan-400',
  MONEY: 'text-green-400', LINKEDIN: 'text-sky-400', XPERT: 'text-blue-400',
  DISPATCH: 'text-violet-400', SCOUT: 'text-yellow-400', FORGE: 'text-red-400',
  ORACLE: 'text-purple-400', VIBE: 'text-pink-400', SENTINEL: 'text-gray-400',
  NEXUS: 'text-teal-400', CLAW: 'text-rose-400', CRITIC: 'text-lime-400',
}

const fallbackFeed = [
  { id: 1, agent: 'FORGE', action: 'is working', target: 'Mission Control v2', time: 'just now', type: 'status' },
  { id: 2, agent: 'SCOUT', action: 'completed', target: 'Evening intel roundup', time: '2m ago', type: 'task' },
  { id: 3, agent: 'INBOX', action: 'triaged', target: '62 emails today', time: '5m ago', type: 'task' },
  { id: 4, agent: 'LINKEDIN', action: 'drafted', target: 'Week 9 posts - 126 in pipeline', time: '10m ago', type: 'task' },
  { id: 5, agent: 'DISPATCH', action: 'curating', target: 'Issue 4 content', time: '12m ago', type: 'task' },
  { id: 6, agent: 'XPERT', action: 'blocked by', target: 'API rate limit (42+ hours)', time: '15m ago', type: 'status' },
  { id: 7, agent: 'JARVIS', action: 'assigned', target: 'Dashboard build to FORGE', time: '20m ago', type: 'task' },
  { id: 8, agent: 'CLAW', action: 'scanned', target: '60+ OpenClaw issues', time: '25m ago', type: 'task' },
]

const tabs = ['All', 'Tasks', 'Comments', 'Docs', 'Status']

export default function LiveFeed({ feed, loading, isConnected }) {
  const [activeTab, setActiveTab] = useState('All')
  const displayFeed = feed.length > 0 ? feed : fallbackFeed

  const filteredFeed = activeTab === 'All' 
    ? displayFeed 
    : displayFeed.filter(item => 
        item.type?.toLowerCase() === activeTab.toLowerCase() ||
        (activeTab === 'Tasks' && item.type === 'task') ||
        (activeTab === 'Comments' && item.type === 'comment') ||
        (activeTab === 'Docs' && item.type === 'doc') ||
        (activeTab === 'Status' && item.type === 'status')
      )

  return (
    <aside className="w-72 bg-[#1a1f2e] border-l border-gray-700/50 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></span>
            <h2 className="text-xs font-semibold text-white uppercase tracking-wide">Live Feed</h2>
          </div>
          <span className="text-[10px] text-gray-500">{displayFeed.length} active</span>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex gap-0.5 bg-[#0f1419] rounded-lg p-0.5">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-1 text-[10px] rounded-md transition-all ${
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
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="text-center text-gray-500 text-xs py-6 animate-pulse">Loading...</div>
        ) : filteredFeed.length === 0 ? (
          <div className="text-center text-gray-600 text-[10px] py-6">No activity</div>
        ) : (
          <div className="space-y-0.5">
            {filteredFeed.map((item, idx) => (
              <FeedItem key={item.id || idx} item={item} />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

function FeedItem({ item }) {
  const { agent, action, target, time, _new } = item
  const [isNew, setIsNew] = useState(_new)
  const initial = agent?.[0] || '?'
  const bgColor = agentColors[agent] || '#6b7280'
  const textColor = agentTextColors[agent] || 'text-gray-400'
  
  // Clear "new" animation after it plays
  useEffect(() => {
    if (_new) {
      const timer = setTimeout(() => setIsNew(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [_new])
  
  return (
    <div className={`
      flex items-start gap-2 p-2 rounded-lg transition-all duration-300
      hover:bg-[#242b3d]/50
      ${isNew ? 'bg-green-400/10' : ''}
    `}
    style={{
      animation: isNew ? 'slideIn 0.3s ease-out' : 'none'
    }}
    >
      {/* Agent Initial Circle */}
      <div 
        className={`
          w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0
          transition-transform duration-300
          ${isNew ? 'scale-110' : ''}
        `}
        style={{ backgroundColor: bgColor }}
      >
        {initial}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-300 leading-relaxed">
          <span className={`font-medium ${textColor}`}>{agent}</span>
          {' '}{action}
          {target && (
            <>
              {' '}<span className="text-blue-400">"{target}"</span>
            </>
          )}
        </p>
        <span className="text-[10px] text-gray-600">{time}</span>
      </div>
    </div>
  )
}
