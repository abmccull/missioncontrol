import { useState } from 'react'
import TaskCard from './TaskCard'

// Fallback missions for demo
const fallbackMissions = {
  queue: [
    { id: 1, title: 'Research AI task management tools', description: 'Compare the top 3 AI-powered task management tools', priority: 'high', agent: 'SCHOLAR', tags: ['RESEARCH', 'AI-TOOLS'], created: '1h ago' },
    { id: 2, title: 'Draft newsletter intro', description: 'Write intro for Agent Dispatch #12', priority: 'medium', agent: null, tags: ['CONTENT'], created: '2h ago' },
  ],
  progress: [
    { id: 3, title: 'Build Mission Control v1', description: 'React dashboard for agent monitoring', priority: 'high', agent: 'FORGE', tags: ['DEV', 'PRIORITY'], created: '30m ago' },
  ],
  review: [
    { id: 4, title: 'SEO Keyword Research', description: 'Research high-volume, low-competition SEO keywords', priority: 'high', agent: 'SAGE', tags: ['RESEARCH', 'COMPETITIVE-ANALYSIS'], created: '2h ago', comments: 4 },
  ],
  done: [
    { id: 5, title: 'Setup repository', description: 'Initialize missioncontrol repo', priority: 'low', agent: 'FORGE', tags: ['DEV'], created: '3h ago', completedAt: '1h ago' },
  ]
}

const columns = [
  { key: 'queue', label: 'QUEUE', color: 'bg-gray-500' },
  { key: 'progress', label: 'IN PROGRESS', color: 'bg-blue-500' },
  { key: 'review', label: 'REVIEW', color: 'bg-purple-500' },
  { key: 'done', label: 'DONE', color: 'bg-green-500' },
]

export default function MissionQueue({ missions, loading, isMobile = false }) {
  const [activeColumn, setActiveColumn] = useState('queue')
  const [swipeMode, setSwipeMode] = useState(true) // Horizontal swipe mode on mobile
  
  const displayMissions = Object.keys(missions).some(k => missions[k]?.length > 0) 
    ? missions 
    : fallbackMissions

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
    <main className="mission-queue flex-1 bg-[#0f1419] p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-purple-400">●</span>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Mission Queue</h2>
        </div>
        <div className="text-xs text-gray-400">
          {Object.values(displayMissions).flat().filter(m => m).length} total tasks
        </div>
      </div>

      <div className="mission-grid grid grid-cols-4 gap-4 h-[calc(100%-3rem)]">
        {columns.map(col => {
          const tasks = displayMissions[col.key] || []
          return (
            <div key={col.key} className="flex flex-col bg-[#1a1f2e]/50 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.color}`}></span>
                  <span className="text-xs font-semibold text-gray-300 uppercase">{col.label}</span>
                </div>
                <span className="text-xs text-gray-500 bg-[#242b3d] px-2 py-0.5 rounded-full">
                  {tasks.length}
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
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
    </main>
  )
}
