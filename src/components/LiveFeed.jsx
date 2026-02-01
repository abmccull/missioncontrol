import { useState, useEffect } from 'react'

// Our actual agent squad emojis
const agentEmojis = {
  JARVIS: '🎯', HUNTER: '🎯', INBOX: '📧', MONEY: '💰', LINKEDIN: '💼',
  XPERT: '🐦', DISPATCH: '📰', SCOUT: '🔍', FORGE: '🔨', ORACLE: '🔮',
  VIBE: '🎨', SENTINEL: '🛡️', NEXUS: '🔗', CLAW: '🦀', CRITIC: '🎭',
}

const agentColors = {
  JARVIS: 'text-purple-400', HUNTER: 'text-green-400', INBOX: 'text-blue-400',
  MONEY: 'text-yellow-400', LINKEDIN: 'text-cyan-400', XPERT: 'text-sky-400',
  DISPATCH: 'text-orange-400', SCOUT: 'text-emerald-400', FORGE: 'text-indigo-400',
  ORACLE: 'text-violet-400', VIBE: 'text-pink-400', SENTINEL: 'text-red-400',
  NEXUS: 'text-teal-400', CLAW: 'text-rose-400', CRITIC: 'text-amber-400',
}

const fallbackFeed = [
  { id: 1, agent: 'FORGE', action: 'started building', target: 'Mission Control Dashboard', time: 'just now', type: 'status' },
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
    <aside className="w-80 bg-[#1a1f2e] border-l border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></span>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Live Feed</h2>
          <span className="text-xs text-gray-500 ml-auto">{displayFeed.length} events</span>
        </div>
        
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                activeTab === tab 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-[#242b3d]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {loading ? (
          <div className="text-center text-gray-500 text-sm py-8">Loading...</div>
        ) : filteredFeed.length === 0 ? (
          <div className="text-center text-gray-600 text-xs py-8">No activity</div>
        ) : (
          filteredFeed.map((item, idx) => (
            <FeedItem key={item.id || idx} item={item} />
          ))
        )}
      </div>
    </aside>
  )
}

function FeedItem({ item }) {
  const { agent, action, target, time, _new } = item
  const [isNew, setIsNew] = useState(_new)
  
  // Clear "new" animation after it plays
  useEffect(() => {
    if (_new) {
      const timer = setTimeout(() => setIsNew(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [_new])
  
  return (
    <div className={`
      flex items-start gap-3 p-2 rounded transition-all duration-300
      hover:bg-[#242b3d]/50
      ${isNew ? 'bg-green-400/10 translate-x-0 opacity-100 animate-slide-in' : ''}
    `}
    style={{
      animation: isNew ? 'slideIn 0.3s ease-out' : 'none'
    }}
    >
      <div className={`
        w-6 h-6 rounded-full bg-[#242b3d] flex items-center justify-center text-xs flex-shrink-0
        transition-transform duration-300
        ${isNew ? 'scale-110' : ''}
      `}>
        {agentEmojis[agent] || agent?.[0] || '?'}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-300 leading-relaxed">
          <span className={`font-medium ${agentColors[agent] || 'text-gray-300'}`}>{agent}</span>
          {' '}{action}
          {target && (
            <>
              {' '}<span className="text-blue-400">"{target}"</span>
            </>
          )}
        </p>
        <span className="text-[10px] text-gray-500">{time}</span>
      </div>
    </div>
  )
}
