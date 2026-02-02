import { useState, useEffect, useCallback } from 'react'

function MetricsPanel() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const API_URL = import.meta.env.VITE_API_URL || 'https://api.woodfloorwarehouse.cc'

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/metrics`)
      if (!res.ok) throw new Error('Failed to fetch metrics')
      const data = await res.json()
      setMetrics(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [API_URL])

  useEffect(() => {
    fetchMetrics()
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [fetchMetrics])

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-4 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-32 mb-4"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-400">
        <span className="font-medium">Error loading metrics:</span> {error}
      </div>
    )
  }

  if (!metrics) return null

  const { summary } = metrics

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-2xl">📊</span>
          Squad Metrics
        </h2>
        <span className="text-xs text-gray-500">
          {new Date(metrics.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Active Agents */}
        <div className="bg-emerald-900/30 rounded-lg p-3 border border-emerald-800/50">
          <div className="text-3xl font-bold text-emerald-400">{summary.activeAgents}</div>
          <div className="text-xs text-emerald-300/70 uppercase tracking-wider">Active</div>
        </div>

        {/* Total Agents */}
        <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-800/50">
          <div className="text-3xl font-bold text-blue-400">{summary.totalAgents}</div>
          <div className="text-xs text-blue-300/70 uppercase tracking-wider">Total Agents</div>
        </div>

        {/* Builds Today */}
        <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-800/50">
          <div className="text-3xl font-bold text-purple-400">{summary.buildsToday}</div>
          <div className="text-xs text-purple-300/70 uppercase tracking-wider">Builds</div>
        </div>

        {/* Commits Today */}
        <div className="bg-amber-900/30 rounded-lg p-3 border border-amber-800/50">
          <div className="text-3xl font-bold text-amber-400">{summary.commitsToday}</div>
          <div className="text-xs text-amber-300/70 uppercase tracking-wider">Commits</div>
        </div>

        {/* Alerts Today */}
        <div className="bg-red-900/30 rounded-lg p-3 border border-red-800/50">
          <div className="text-3xl font-bold text-red-400">{summary.alertsToday}</div>
          <div className="text-xs text-red-300/70 uppercase tracking-wider">Alerts</div>
        </div>

        {/* Tasks Completed */}
        <div className="bg-cyan-900/30 rounded-lg p-3 border border-cyan-800/50">
          <div className="text-3xl font-bold text-cyan-400">{summary.tasksCompletedToday}</div>
          <div className="text-xs text-cyan-300/70 uppercase tracking-wider">Tasks Done</div>
        </div>
      </div>

      {/* Agent Activity Grid */}
      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Agent Activity Today</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(metrics.agents).map(([name, data]) => (
            <div
              key={name}
              className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                data.status === 'active'
                  ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/50'
                  : data.status === 'blocked'
                  ? 'bg-red-900/40 text-red-400 border border-red-800/50'
                  : data.status === 'idle'
                  ? 'bg-gray-700/40 text-gray-400 border border-gray-600/50'
                  : 'bg-yellow-900/40 text-yellow-400 border border-yellow-800/50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                data.activityToday ? 'bg-current animate-pulse' : 'bg-current opacity-30'
              }`}></span>
              {name.toUpperCase()}
              {data.tasksToday > 0 && (
                <span className="ml-1 bg-black/30 px-1.5 rounded-full">
                  {data.tasksToday}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MetricsPanel
