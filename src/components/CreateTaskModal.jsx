import { useState, useEffect, useRef } from 'react'

const agents = [
  'JARVIS', 'HUNTER', 'INBOX', 'MONEY', 'LINKEDIN', 'XPERT', 
  'DISPATCH', 'SCOUT', 'FORGE', 'ORACLE', 'VIBE', 'SENTINEL', 
  'NEXUS', 'CLAW', 'CRITIC'
]

const agentColors = {
  JARVIS: '#6366f1', HUNTER: '#f97316', INBOX: '#06b6d4', MONEY: '#22c55e', LINKEDIN: '#0077b5',
  XPERT: '#1d9bf0', DISPATCH: '#8b5cf6', SCOUT: '#eab308', FORGE: '#ef4444', ORACLE: '#a855f7',
  VIBE: '#ec4899', SENTINEL: '#6b7280', NEXUS: '#14b8a6', CLAW: '#f43f5e', CRITIC: '#84cc16',
}

const priorities = [
  { value: 'low', label: 'Low', color: 'text-gray-400' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
  { value: 'high', label: 'High', color: 'text-orange-400' },
  { value: 'critical', label: 'Critical', color: 'text-red-400' },
]

export default function CreateTaskModal({ isOpen, onClose, onSubmit, apiUrl }) {
  const modalRef = useRef(null)
  const titleRef = useRef(null)
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [priority, setPriority] = useState('medium')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  
  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription('')
      setAssignedTo('')
      setPriority('medium')
      setError(null)
      // Focus title field
      setTimeout(() => titleRef.current?.focus(), 100)
    }
  }, [isOpen])
  
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
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const response = await fetch(`${apiUrl}/api/missions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          assigned_to: assignedTo || null,
          priority,
          status: 'queue',
        }),
      })
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create task')
      }
      
      const newTask = await response.json()
      
      if (onSubmit) {
        onSubmit(newTask)
      }
      
      onClose()
    } catch (err) {
      console.error('Failed to create task:', err)
      setError(err.message || 'Failed to create task. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#1a1f2e] rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl border border-gray-700/50 animate-slideUp">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-gray-700/50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-blue-400">+</span>
            New Task
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#242b3d] rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-4 md:p-6 space-y-4 overflow-y-auto max-h-[60vh]">
            {/* Error message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}
            
            {/* Title */}
            <div>
              <label className="block text-xs text-gray-400 uppercase font-medium mb-2">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full bg-[#0f1419] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            
            {/* Description */}
            <div>
              <label className="block text-xs text-gray-400 uppercase font-medium mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details, context, or instructions... (Markdown supported)"
                rows={5}
                className="w-full bg-[#0f1419] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
              />
              <p className="text-[10px] text-gray-600 mt-1">Supports Markdown formatting</p>
            </div>
            
            {/* Assign to */}
            <div>
              <label className="block text-xs text-gray-400 uppercase font-medium mb-2">
                Assign to
              </label>
              <div className="relative">
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full bg-[#0f1419] border border-gray-700 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {agents.map(agent => (
                    <option key={agent} value={agent}>{agent}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {/* Agent preview */}
              {assignedTo && (
                <div className="mt-2 flex items-center gap-2">
                  <div 
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
                    style={{ backgroundColor: agentColors[assignedTo] || '#6b7280' }}
                  >
                    {assignedTo[0]}
                  </div>
                  <span className="text-sm text-gray-400">Task will be assigned to {assignedTo}</span>
                </div>
              )}
            </div>
            
            {/* Priority */}
            <div>
              <label className="block text-xs text-gray-400 uppercase font-medium mb-2">
                Priority
              </label>
              <div className="flex flex-wrap gap-2">
                {priorities.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      priority === p.value
                        ? `bg-[#242b3d] ${p.color} border border-current`
                        : 'bg-[#0f1419] text-gray-500 border border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-4 md:p-6 border-t border-gray-700/50 bg-[#0f1419]/50 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Create Task'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
