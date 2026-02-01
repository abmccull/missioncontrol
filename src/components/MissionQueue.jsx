import { useEffect, useState, useRef } from 'react'
import TaskCard from './TaskCard'

// Fallback missions for demo when no data
const fallbackMissions = {
  queue: [
    { id: 1, title: 'Research AI task management tools', description: 'Compare the top 3 AI-powered task management tools.', priority: 'high', assigned_to: 'SCOUT', tags: ['research'], created_at: new Date().toISOString() },
  ],
  progress: [],
  review: [],
  done: []
}

const columns = [
  { key: 'queue', label: 'MISSION QUEUE', color: 'bg-gray-500', textColor: 'text-gray-300', bgColor: 'bg-gray-500/10' },
  { key: 'progress', label: 'IN PROGRESS', color: 'bg-blue-500', textColor: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  { key: 'review', label: 'REVIEW', color: 'bg-purple-500', textColor: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  { key: 'done', label: 'DONE', color: 'bg-green-500', textColor: 'text-green-400', bgColor: 'bg-green-500/10' },
]

export default function MissionQueue({ missions, loading, lastMessage }) {
  // Track recently moved cards for animation
  const [animatingCards, setAnimatingCards] = useState(new Set())
  const [removingCards, setRemovingCards] = useState(new Set())
  const prevMissionsRef = useRef(missions)
  
  // Detect card movements for animation
  useEffect(() => {
    if (!lastMessage) return
    
    const { type, payload } = lastMessage
    
    if (type === 'mission:update') {
      // Find if the card moved columns
      const cardId = payload.id || payload.filename
      
      // Mark as animating
      setAnimatingCards(prev => new Set([...prev, cardId]))
      
      // Clear animation after delay
      setTimeout(() => {
        setAnimatingCards(prev => {
          const next = new Set(prev)
          next.delete(cardId)
          return next
        })
      }, 500)
    }
    
    if (type === 'mission:complete' || type === 'mission:removed') {
      const cardId = payload.id || payload.filename
      
      // Mark for removal animation
      setRemovingCards(prev => new Set([...prev, cardId]))
      
      // Clear after animation
      setTimeout(() => {
        setRemovingCards(prev => {
          const next = new Set(prev)
          next.delete(cardId)
          return next
        })
      }, 300)
    }
  }, [lastMessage])
  
  // Update previous missions ref
  useEffect(() => {
    prevMissionsRef.current = missions
  }, [missions])
  
  // Use fallback if no missions
  const displayMissions = Object.keys(missions).some(k => missions[k]?.length > 0) 
    ? missions 
    : fallbackMissions

  const queueCount = (displayMissions.queue?.length || 0) + (displayMissions.progress?.length || 0)
  const reviewCount = displayMissions.review?.length || 0
  const doneCount = displayMissions.done?.length || 0
  const totalActive = queueCount + reviewCount

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
            <span className="text-white font-medium">{totalActive}</span> active
          </span>
          <span className="flex items-center gap-1.5 text-blue-400">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
            IN PROGRESS <span className="text-white">{displayMissions.progress?.length || 0}</span>
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
      <div className="grid grid-cols-4 gap-3 flex-1 min-h-0">
        {columns.map(col => {
          const tasks = displayMissions[col.key] || []
          return (
            <div key={col.key} className="flex flex-col bg-[#1a1f2e]/30 rounded-lg overflow-hidden min-h-0">
              {/* Column Header */}
              <div className={`flex items-center justify-between px-3 py-2 border-b border-gray-700/30 ${col.bgColor}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.color}`}></span>
                  <span className={`text-[11px] font-semibold uppercase ${col.textColor}`}>{col.label}</span>
                </div>
                <span className={`text-[10px] text-gray-400 ${col.color} bg-opacity-20 px-1.5 py-0.5 rounded min-w-[20px] text-center`}>
                  {tasks.length}
                </span>
              </div>
              
              {/* Task List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {loading ? (
                  <div className="text-center text-gray-500 text-xs py-6 animate-pulse">Loading...</div>
                ) : tasks.length === 0 ? (
                  <div className="text-center text-gray-600 text-[10px] py-6 opacity-50">
                    {col.key === 'queue' ? 'No pending tasks' : 
                     col.key === 'progress' ? 'Nothing in progress' :
                     col.key === 'review' ? 'No reviews pending' : 
                     'No completed tasks'}
                  </div>
                ) : (
                  tasks.map((task, idx) => {
                    const cardId = task.id || task.filename || idx
                    const isAnimating = animatingCards.has(cardId)
                    const isRemoving = removingCards.has(cardId)
                    
                    return (
                      <div 
                        key={cardId}
                        className={`
                          transition-all duration-300 ease-out
                          ${isAnimating ? 'animate-slide-in scale-105' : ''}
                          ${isRemoving ? 'opacity-0 scale-95 -translate-x-4' : ''}
                        `}
                      >
                        <TaskCard 
                          task={task} 
                          column={col.key} 
                        />
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* CSS for custom animations */}
      <style>{`
        @keyframes slide-in {
          0% { 
            opacity: 0; 
            transform: translateX(-20px) scale(0.95); 
          }
          100% { 
            opacity: 1; 
            transform: translateX(0) scale(1); 
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out forwards;
        }
      `}</style>
    </main>
  )
}
