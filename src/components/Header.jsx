import { useState, useEffect } from 'react'

const connectionColors = {
  connected: 'bg-green-400',
  connecting: 'bg-yellow-400 animate-pulse',
  reconnecting: 'bg-yellow-400 animate-pulse',
  failed: 'bg-red-400',
}

const connectionLabels = {
  connected: 'LIVE',
  connecting: 'CONNECTING',
  reconnecting: 'RECONNECTING',
  failed: 'OFFLINE',
}

const connectionTextColors = {
  connected: 'text-green-400',
  connecting: 'text-yellow-400',
  reconnecting: 'text-yellow-400',
  failed: 'text-red-400',
}

export default function Header({ activeCount, totalCount, queuedMissions = 0, connectionStatus = 'connecting', onMenuClick, onNewTask }) {
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
    <header className="header-container bg-[#1a1f2e] border-b border-gray-700 px-4 md:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4 md:gap-6 header-brand">
        {/* Mobile hamburger menu */}
        <button 
          className="hamburger-btn touch-target"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-lg md:text-xl">🎯</span>
          <h1 className="text-base md:text-lg font-semibold text-white">Mission Control</h1>
        </div>
        
{/* Removed All Products dropdown - meaningless in this context */}
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        {/* Stats - hidden on mobile */}
        <div className="header-stats hidden lg:flex items-center gap-4 text-sm">
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-white">{activeCount}</div>
            <div className="text-[10px] md:text-xs text-gray-400 uppercase">Agents Active</div>
          </div>
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-white">{queuedMissions || (totalCount - activeCount)}</div>
            <div className="text-[10px] md:text-xs text-gray-400 uppercase">Tasks in Queue</div>
          </div>
        </div>

        {/* New Task button */}
        <button 
          onClick={onNewTask}
          className="header-new-task bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium flex items-center gap-1 md:gap-2 transition-colors touch-target"
        >
          <span>+</span>
          <span className="hidden sm:inline">New Task</span>
        </button>

        {/* Time - hidden on mobile */}
        <div className="header-time hidden md:block text-right">
          <div className="text-lg font-mono text-white">{formatTime(time)}</div>
          <div className="text-xs text-gray-400">{formatDate(time)}</div>
        </div>

        {/* Connection status */}
        <div className={`header-status flex items-center gap-1 md:gap-2 ${connectionTextColors[connectionStatus] || connectionTextColors.connecting}`}>
          <span className={`w-2 h-2 rounded-full ${connectionColors[connectionStatus] || connectionColors.connecting}`}></span>
          <span className="text-xs md:text-sm font-medium hidden sm:inline">{connectionLabels[connectionStatus] || 'CONNECTING'}</span>
        </div>
      </div>
    </header>
  )
}
