import { useState } from 'react'
import TaskCard from './TaskCard'

// Fallback missions for demo
const fallbackMissions = {
  queue: [
    { id: 1, title: 'Research AI task management tools', description: 'Compare the top 3 AI-powered task management tools. For each, cover: key features, pricing, unique capabilities.', priority: 'high', agent: 'SCOUT', tags: ['RESEARCH', 'AI-TOOLS'], created: '1h ago', comments: 7 },
    { id: 2, title: 'Draft newsletter intro', description: 'Write intro for Agent Dispatch Issue 4', priority: 'medium', agent: null, tags: ['CONTENT'], created: '2h ago' },
  ],
  progress: [
    { id: 3, title: 'Build Mission Control v2', description: 'Add WebSocket real-time updates and UI polish', priority: 'high', agent: 'FORGE', tags: ['DEVELOPMENT', 'PRIORITY'], created: '30m ago', comments: 2 },
  ],
  review: [
    { id: 4, title: 'SEO Keyword Research', description: 'Research high-volume, low-competition SEO keywords for ChurnBusterAI', priority: 'high', agent: 'SCOUT', tags: ['RESEARCH', 'COMPETITIVE-ANALYSIS'], created: '2h ago', comments: 4 },
  ],
  done: []
}

const columns = [
  { key: 'queue', label: 'MISSION QUEUE', color: 'bg-gray-500', textColor: 'text-gray-300' },
  { key: 'progress', label: 'IN PROGRESS', color: 'bg-blue-500', textColor: 'text-blue-400' },
  { key: 'review', label: 'REVIEW', color: 'bg-purple-500', textColor: 'text-purple-400' },
  { key: 'done', label: 'DONE', color: 'bg-green-500', textColor: 'text-green-400' },
]

export default function MissionQueue({ missions, loading, isMobile = false }) {
  const [activeColumn, setActiveColumn] = useState('queue')
  const [swipeMode, _setSwipeMode] = useState(true) // Horizontal swipe mode on mobile
  
  const displayMissions = Object.keys(missions).some(k => missions[k]?.length > 0) 
    ? missions 
    : fallbackMissions

  const queueCount = (displayMissions.queue?.length || 0) + (displayMissions.progress?.length || 0)
  const reviewCount = displayMissions.review?.length || 0
  const doneCount = displayMissions.done?.length || 0

  // Mobile view
  if (isMobile) {
    return (
      <main className="flex-1 bg-[#0f1419] flex flex-col overflow-hidden">
        {/* Column tabs */}
        <div className="flex border-b border-gray-700 bg-[#1a1f2e] overflow-x-auto">
          {columns.map(col => {
            const count = displayMissions[col.key]?.length || 0
            return (
              <button
                key={col.key}
                onClick={() => setActiveColumn(col.key)}
                className={`flex-1 min-w-[80px] px-3 py-3 text-xs font-medium transition-colors touch-target
                  ${activeColumn === col.key 
                    ? 'text-white border-b-2 border-blue-500 bg-[#242b3d]/50' 
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${col.color}`}></span>
                  {col.label}
                  <span className="text-[10px] bg-[#242b3d] px-1.5 py-0.5 rounded-full">{count}</span>
                </span>
              </button>
            )
          })}
        </div>

        {/* Swipeable columns view */}
        {swipeMode ? (
          <div className="flex-1 overflow-hidden">
            <div 
              className="swipe-container h-full flex"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {columns.map(col => {
                const tasks = displayMissions[col.key] || []
                return (
                  <div 
                    key={col.key} 
                    className="swipe-item flex-shrink-0 w-full h-full overflow-y-auto p-3"
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <div className="space-y-3">
                      {loading ? (
                        <div className="text-center text-gray-500 text-sm py-8">Loading...</div>
                      ) : tasks.length === 0 ? (
                        <div className="text-center text-gray-600 text-xs py-8">No tasks</div>
                      ) : (
                        tasks.map((task, idx) => (
                          <TaskCard key={task.id || idx} task={task} column={col.key} />
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* Single column view */
          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-3">
              {loading ? (
                <div className="text-center text-gray-500 text-sm py-8">Loading...</div>
              ) : (displayMissions[activeColumn] || []).length === 0 ? (
                <div className="text-center text-gray-600 text-xs py-8">No tasks</div>
              ) : (
                (displayMissions[activeColumn] || []).map((task, idx) => (
                  <TaskCard key={task.id || idx} task={task} column={activeColumn} />
                ))
              )}
            </div>
          </div>
        )}
      </main>
    )
  }

  // Desktop view
  return (
    <main className="flex-1 bg-[#0f1419] p-4 overflow-hidden flex flex-col">
      {/* Header Row */}
      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-purple-400 text-sm">●</span>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Mission Queue</h2>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-gray-400">
            <span className="text-white font-medium">{queueCount}</span> in queue
          </span>
          <span className="flex items-center gap-1.5 text-purple-400">
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
            REVIEW <span className="text-white">{reviewCount}</span>
          </span>
          <span className="flex items-center gap-1.5 text-green-400">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
            DONE <span className="text-white">{doneCount}</span>
          </span>
        </div>
      </div>

      {/* Columns Grid */}
      <div className="mission-grid grid grid-cols-4 gap-3 flex-1 min-h-0">
        {columns.map(col => {
          const tasks = displayMissions[col.key] || []
          return (
            <div key={col.key} className="flex flex-col bg-[#1a1f2e]/30 rounded-lg overflow-hidden min-h-0">
              {/* Column Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/30">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.color}`}></span>
                  <span className={`text-[11px] font-semibold uppercase ${col.textColor}`}>{col.label}</span>
                </div>
                <span className="text-[10px] text-gray-500 bg-[#242b3d] px-1.5 py-0.5 rounded min-w-[20px] text-center">
                  {tasks.length}
                </span>
              </div>
              
              {/* Task List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {loading ? (
                  <div className="text-center text-gray-500 text-xs py-6 animate-pulse">Loading...</div>
                ) : tasks.length === 0 ? (
                  <div className="text-center text-gray-600 text-[10px] py-6 opacity-50">No tasks</div>
                ) : (
                  tasks.map((task, idx) => (
                    <TaskCard key={task.id || idx} task={task} column={col.key} />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
