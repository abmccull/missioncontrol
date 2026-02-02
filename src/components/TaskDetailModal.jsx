import { useState, useEffect, useRef } from 'react'

const priorityColors = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const agentColors = {
  JARVIS: '#6366f1', HUNTER: '#f97316', INBOX: '#06b6d4', MONEY: '#22c55e', LINKEDIN: '#0077b5',
  XPERT: '#1d9bf0', DISPATCH: '#8b5cf6', SCOUT: '#eab308', FORGE: '#ef4444', ORACLE: '#a855f7',
  VIBE: '#ec4899', SENTINEL: '#6b7280', NEXUS: '#14b8a6', CLAW: '#f43f5e', CRITIC: '#84cc16',
}

const statusLabels = {
  queue: 'In Queue',
  progress: 'In Progress',
  review: 'Under Review',
  done: 'Completed',
}

const statusColors = {
  queue: 'bg-gray-500/20 text-gray-400',
  progress: 'bg-blue-500/20 text-blue-400',
  review: 'bg-purple-500/20 text-purple-400',
  done: 'bg-green-500/20 text-green-400',
}

// Simple markdown renderer for descriptions
function renderMarkdown(text) {
  if (!text) return null
  
  // Process line by line
  const lines = text.split('\n')
  const elements = []
  let inList = false
  let listItems = []
  
  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-gray-300">{processInline(item)}</li>
          ))}
        </ul>
      )
      listItems = []
    }
    inList = false
  }
  
  const processInline = (text) => {
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    // Italic
    text = text.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    // Code
    text = text.replace(/`(.*?)`/g, '<code class="bg-[#242b3d] px-1.5 py-0.5 rounded text-xs font-mono text-cyan-400">$1</code>')
    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:underline" target="_blank" rel="noopener">$1</a>')
    return <span dangerouslySetInnerHTML={{ __html: text }} />
  }
  
  lines.forEach((line, idx) => {
    const trimmed = line.trim()
    
    // Headers
    if (trimmed.startsWith('### ')) {
      flushList()
      elements.push(<h4 key={idx} className="text-sm font-semibold text-white mt-4 mb-2">{processInline(trimmed.slice(4))}</h4>)
    } else if (trimmed.startsWith('## ')) {
      flushList()
      elements.push(<h3 key={idx} className="text-base font-semibold text-white mt-4 mb-2">{processInline(trimmed.slice(3))}</h3>)
    } else if (trimmed.startsWith('# ')) {
      flushList()
      elements.push(<h2 key={idx} className="text-lg font-bold text-white mt-4 mb-2">{processInline(trimmed.slice(2))}</h2>)
    }
    // List items
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true
      listItems.push(trimmed.slice(2))
    }
    // Checkbox items
    else if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('- [x] ')) {
      flushList()
      const checked = trimmed.startsWith('- [x] ')
      const text = trimmed.slice(6)
      elements.push(
        <div key={idx} className="flex items-start gap-2 my-1">
          <span className={`mt-0.5 ${checked ? 'text-green-400' : 'text-gray-500'}`}>
            {checked ? '✓' : '○'}
          </span>
          <span className={checked ? 'text-gray-500 line-through' : 'text-gray-300'}>
            {processInline(text)}
          </span>
        </div>
      )
    }
    // Empty line
    else if (trimmed === '') {
      flushList()
      elements.push(<div key={idx} className="h-2" />)
    }
    // Regular paragraph
    else {
      flushList()
      elements.push(<p key={idx} className="text-gray-300 text-sm leading-relaxed my-1">{processInline(trimmed)}</p>)
    }
  })
  
  flushList()
  return elements
}

export default function TaskDetailModal({ task, column, isOpen, onClose, onComplete, onStatusChange }) {
  const modalRef = useRef(null)
  const [isCompleting, setIsCompleting] = useState(false)
  
  const { 
    id,
    title, 
    description, 
    priority = 'medium', 
    agent, 
    tags = [], 
    created,
    created_at,
    updated_at,
    comments = 0,
    status
  } = task || {}
  
  const agentInitial = agent?.[0] || '?'
  const agentColor = agentColors[agent] || '#6b7280'
  const currentStatus = status || column || 'queue'
  
  // Close on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])
  
  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === modalRef.current) {
      onClose()
    }
  }
  
  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      if (onComplete) {
        await onComplete(id)
      }
      onClose()
    } catch (err) {
      console.error('Failed to complete task:', err)
    } finally {
      setIsCompleting(false)
    }
  }
  
  if (!isOpen || !task) return null
  
  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#1a1f2e] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-gray-700/50 animate-slideUp">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-gray-700/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Priority & Status badges */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {priority && priority !== 'medium' && (
                  <span className={`text-[10px] px-2 py-1 rounded border uppercase font-medium ${priorityColors[priority]}`}>
                    ↑ {priority}
                  </span>
                )}
                <span className={`text-[10px] px-2 py-1 rounded uppercase font-medium ${statusColors[currentStatus]}`}>
                  {statusLabels[currentStatus]}
                </span>
              </div>
              
              {/* Title */}
              <h2 className="text-lg md:text-xl font-semibold text-white leading-tight">
                {title}
              </h2>
            </div>
            
            {/* Close button */}
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#242b3d] rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Agent & Meta */}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            {agent ? (
              <div className="flex items-center gap-2">
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ backgroundColor: agentColor }}
                >
                  {agentInitial}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{agent}</div>
                  <div className="text-[10px] text-gray-500">Assigned</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">Unassigned</div>
            )}
            
            <div className="text-xs text-gray-500">
              Created {created || created_at || 'recently'}
            </div>
            
            {updated_at && updated_at !== created_at && (
              <div className="text-xs text-gray-500">
                Updated {updated_at}
              </div>
            )}
            
            {comments > 0 && (
              <div className="flex items-center gap-1 text-gray-500 text-xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {comments} comments
              </div>
            )}
          </div>
        </div>
        
        {/* Body - scrollable */}
        <div className="p-4 md:p-6 overflow-y-auto max-h-[50vh]">
          {/* Description */}
          {description ? (
            <div className="prose prose-invert max-w-none">
              {renderMarkdown(description)}
            </div>
          ) : (
            <p className="text-gray-500 text-sm italic">No description provided</p>
          )}
          
          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-700/50">
              <div className="text-xs text-gray-500 uppercase font-medium mb-2">Tags</div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, idx) => (
                  <span 
                    key={idx}
                    className="text-xs px-2 py-1 rounded bg-[#242b3d] text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer - actions */}
        <div className="p-4 md:p-6 border-t border-gray-700/50 bg-[#0f1419]/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Status change dropdown could go here */}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Close
              </button>
              
              {currentStatus !== 'done' && (
                <button
                  onClick={handleComplete}
                  disabled={isCompleting}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {isCompleting ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Completing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Mark Complete
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
