import { useState, useEffect } from 'react'

export default function Header({ activeCount, totalCount }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    })
  }

  return (
    <header className="bg-[#1a1f2e] border-b border-gray-700 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <h1 className="text-lg font-semibold text-white">Mission Control</h1>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2 bg-[#242b3d] px-3 py-1.5 rounded-lg">
            <span>All Products</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{activeCount}</div>
            <div className="text-xs text-gray-400 uppercase">Agents Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{totalCount - activeCount}</div>
            <div className="text-xs text-gray-400 uppercase">Tasks in Queue</div>
          </div>
        </div>

        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <span>+</span> New Task
        </button>

        <div className="text-right">
          <div className="text-lg font-mono text-white">{formatTime(time)}</div>
          <div className="text-xs text-gray-400">{formatDate(time)}</div>
        </div>

        <div className="flex items-center gap-2 text-green-400">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span className="text-sm font-medium">ONLINE</span>
        </div>
      </div>
    </header>
  )
}
