import { useState, useEffect } from 'react'
import Header from './components/Header'
import AgentPanel from './components/AgentPanel'
import MissionQueue from './components/MissionQueue'
import LiveFeed from './components/LiveFeed'

function App() {
  const [agents, setAgents] = useState([])
  const [missions, setMissions] = useState({ queue: [], progress: [], review: [], done: [] })
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [agentsRes, missionsRes, feedRes] = await Promise.all([
          fetch('/api/agents').then(r => r.json()).catch(() => ({ agents: [] })),
          fetch('/api/missions').then(r => r.json()).catch(() => ({ queue: [], progress: [], review: [], done: [] })),
          fetch('/api/feed').then(r => r.json()).catch(() => ({ feed: [] }))
        ])
        setAgents(agentsRes.agents || [])
        setMissions(missionsRes)
        setFeed(feedRes.feed || [])
      } catch (err) {
        console.error('Failed to fetch data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const activeCount = agents.filter(a => a.status === 'working').length

  return (
    <div className="min-h-screen bg-[#0f1419] flex flex-col">
      <Header 
        activeCount={activeCount} 
        totalCount={agents.length || 15} 
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Agents */}
        <AgentPanel agents={agents} loading={loading} />
        
        {/* Center - Mission Queue */}
        <MissionQueue missions={missions} loading={loading} />
        
        {/* Right Sidebar - Live Feed */}
        <LiveFeed feed={feed} loading={loading} />
      </div>
    </div>
  )
}

export default App
