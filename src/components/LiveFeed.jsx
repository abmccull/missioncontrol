import { useState } from 'react'

const agentEmojis = {
  JARVIS: '🎯', FORGE: '🔨', SCHOLAR: '📚', SCRIBE: '✍️', SENTINEL: '🛡️',
  ORACLE: '🔮', HERALD: '📢', MAVEN: '📊', NEXUS: '🔗', CIPHER: '🔐',
  SAGE: '🧘', PIXEL: '🎨', ECHO: '🔊', ATLAS: '🗺️', TEMPO: '⏱️',
}

const agentColors = {
  JARVIS: 'text-purple-400', FORGE: 'text-blue-400', SCHOLAR: 'text-green-400',
  SCRIBE: 'text-yellow-400', SENTINEL: 'text-red-400', ORACLE: 'text-indigo-400',
  HERALD: 'text-orange-400', MAVEN: 'text-pink-400', NEXUS: 'text-cyan-400',
  CIPHER: 'text-emerald-400', SAGE: 'text-teal-400', PIXEL: 'text-rose-400',
  ECHO: 'text-violet-400', ATLAS: 'text-amber-400', TEMPO: 'text-lime-400',
}

const fallbackFeed = [
  { id: 1, agent: 'FORGE', action: 'started working', target: 'Mission Control Dashboard', time: 'just now', type: 'status' },
  { id: 2, agent: 'FORGE', action: 'created repository', target: 'missioncontrol', time: 'just now', type: 'task' },
  { id: 3, agent: 'SAGE', action: 'moved to review', target: 'SEO Keyword Research', time: '2m ago', type: 'task' },
  { id: 4, agent: 'SAGE', action: 'commented on', target: 'SEO Keyword Research', time: '2m ago', type: 'comment' },
  { id: 5, agent: 'SCHOLAR', action: 'created document', target: 'AI Tools Comparison', time: '5m ago', type: 'doc' },
  { id: 6, agent: 'PIXEL', action: 'is now working', target: null, time: '10m ago', type: 'status' },
  { id: 7, agent: 'JARVIS', action: 'assigned task to', target: 'FORGE', time: '15m ago', type: 'task' },
  { id: 8, agent: 'SENTINEL', action: 'completed monitoring', target: 'System Health Check', time: '20m ago', type: 'task' },
]

const tabs = ['All', 'Tasks', 'Comments', 'Docs', 'Status']

export default function LiveFeed({ feed, loading, isMobile = false }) {
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

  // Mobile full-screen view
  if (isMobile) {
    return (
      <div className="flex flex-col h-full bg-[#0f1419]">
        <div className="p-4 border-b border-gray-700 bg-[#1a1f2e]">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Live Feed</h2>
          </div>
          
          <div className="flex gap-1 overflow-x-auto pb-1">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 text-xs rounded transition-colors whitespace-nowrap touch-target ${
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

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
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
      </div>
    )
  }

  // Desktop sidebar view
  return (
    <aside className="live-feed w-80 bg-[#1a1f2e] border-l border-gray-700 flex flex-col desktop-sidebar">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Live Feed</h2>
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
  const { agent, action, target, time } = item
  
  return (
    <div className="feed-item flex items-start gap-3 p-2 rounded hover:bg-[#242b3d]/50 transition-colors touch-target">
      <div className="w-7 h-7 rounded-full bg-[#242b3d] flex items-center justify-center text-xs flex-shrink-0">
        {agentEmojis[agent] || agent?.[0] || '?'}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="feed-item-text text-xs text-gray-300 leading-relaxed">
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
