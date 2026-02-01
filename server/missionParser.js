/* eslint-env node */
import YAML from 'yaml'
import crypto from 'crypto'

/**
 * Mission file format:
 * 
 * ---
 * id: unique-id
 * title: Task title
 * assigned_to: agent-name
 * status: queue | in_progress | review | done
 * priority: critical | high | medium | low
 * created_at: ISO date
 * updated_at: ISO date
 * tags:
 *   - tag1
 *   - tag2
 * ---
 * 
 * ## Description
 * Task description here...
 */

// Status mapping from various formats to our standard statuses
const STATUS_MAP = {
  // Standard statuses
  'queue': 'queue',
  'in_progress': 'progress',
  'in-progress': 'progress',
  'progress': 'progress',
  'working': 'progress',
  'review': 'review',
  'reviewing': 'review',
  'done': 'done',
  'complete': 'done',
  'completed': 'done',
  'blocked': 'queue', // Show blocked in queue with special treatment
}

// Generate a slug-based ID from title
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50)
}

// Generate UUID v4
function generateId() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Parse YAML frontmatter from markdown content
 * Returns { frontmatter: {...}, body: '...' }
 */
export function extractFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)
  
  if (match) {
    try {
      const frontmatter = YAML.parse(match[1]) || {}
      const body = match[2]
      return { frontmatter, body, hasFrontmatter: true }
    } catch (err) {
      console.error('Failed to parse YAML frontmatter:', err.message)
      return { frontmatter: {}, body: content, hasFrontmatter: false }
    }
  }
  
  return { frontmatter: {}, body: content, hasFrontmatter: false }
}

/**
 * Parse a mission file (with or without frontmatter)
 * Falls back to parsing headers for legacy files
 */
export function parseMissionFile(content, filename) {
  const { frontmatter, body, hasFrontmatter } = extractFrontmatter(content)
  
  if (hasFrontmatter && Object.keys(frontmatter).length > 0) {
    // Parse from frontmatter
    return {
      id: frontmatter.id || slugify(frontmatter.title || filename),
      title: frontmatter.title || extractTitleFromBody(body) || filename.replace('.md', ''),
      description: extractDescription(body),
      assigned_to: normalizeAgent(frontmatter.assigned_to),
      status: normalizeStatus(frontmatter.status),
      priority: normalizePriority(frontmatter.priority),
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
      created_at: frontmatter.created_at || new Date().toISOString(),
      updated_at: frontmatter.updated_at || new Date().toISOString(),
      filename,
      hasFrontmatter: true
    }
  }
  
  // Legacy parsing for files without frontmatter
  return parseLegacyMission(content, filename)
}

/**
 * Parse legacy mission files that don't have frontmatter
 * Extracts info from headers and content
 */
function parseLegacyMission(content, filename) {
  // Extract title from first H1/H2 or filename
  const titleMatch = content.match(/^#\s*(.+)/m)
  let title = titleMatch 
    ? titleMatch[1].replace(/^(FORGE|Task|Mission):\s*/i, '').trim() 
    : filename.replace('.md', '')
  
  // Extract status from content
  const statusLineMatch = content.match(/\*?\*?Status:\*?\*?\s*(.+)/i)
  const statusLine = statusLineMatch ? statusLineMatch[1].replace(/^\*+\s*/, '') : ''
  
  let status = 'queue'
  const lowerContent = content.toLowerCase()
  
  if (statusLine.includes('✅') || statusLine.toLowerCase().includes('complete')) {
    status = 'review' // Completed but in active/ = needs review
  } else if (statusLine.toLowerCase().includes('progress') || 
             statusLine.toLowerCase().includes('working') ||
             lowerContent.includes('in progress')) {
    status = 'progress'
  } else if (statusLine.toLowerCase().includes('blocked') ||
             statusLine.toLowerCase().includes('waiting')) {
    status = 'queue' // Blocked shows in queue
  }
  
  // Extract priority
  const priorityMatch = content.match(/Priority:\s*(\w+)/i)
  const priority = normalizePriority(priorityMatch?.[1])
  
  // Extract assigned agent
  const agentMatch = content.match(/(?:Assigned(?:\s+to)?|Assignee|Agent|From):\s*(\w+)/i) ||
                     filename.match(/^(\w+)-/i)
  const assigned_to = normalizeAgent(agentMatch?.[1])
  
  // Get description from objective or first paragraph
  const description = extractDescription(content)
  
  // Extract tags
  const tags = []
  if (priority === 'critical' || priority === 'high') tags.push('urgent')
  if (lowerContent.includes('blocked')) tags.push('blocked')
  
  return {
    id: slugify(title) || filename.replace('.md', ''),
    title: title.slice(0, 60),
    description,
    assigned_to,
    status,
    priority,
    tags,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    filename,
    hasFrontmatter: false
  }
}

/**
 * Extract title from body content
 */
function extractTitleFromBody(body) {
  const titleMatch = body.match(/^#\s*(.+)/m)
  return titleMatch ? titleMatch[1].replace(/^(FORGE|Task|Mission):\s*/i, '').trim() : null
}

/**
 * Extract description from content
 */
function extractDescription(content) {
  // Try Objective section first
  const objectiveMatch = content.match(/## Objective\s*\n+(.+)/i)
  if (objectiveMatch) return objectiveMatch[1].trim().slice(0, 100)
  
  // Try Description section
  const descMatch = content.match(/## Description\s*\n+(.+)/i)
  if (descMatch) return descMatch[1].trim().slice(0, 100)
  
  // Fall back to first paragraph after frontmatter
  const paragraphMatch = content.match(/\n\n([^#\n].{10,100})/m)
  return paragraphMatch ? paragraphMatch[1].trim() : ''
}

/**
 * Normalize agent name to uppercase
 */
function normalizeAgent(agent) {
  if (!agent || agent === 'unassigned') return null
  return agent.toUpperCase()
}

/**
 * Normalize status to our standard values
 */
function normalizeStatus(status) {
  if (!status) return 'queue'
  const lower = status.toLowerCase().replace(/[_-]/g, '_')
  return STATUS_MAP[lower] || 'queue'
}

/**
 * Normalize priority
 */
function normalizePriority(priority) {
  if (!priority) return 'medium'
  const lower = priority.toLowerCase()
  if (['critical', 'urgent', 'crit'].includes(lower)) return 'critical'
  if (['high', 'important'].includes(lower)) return 'high'
  if (['low', 'minor'].includes(lower)) return 'low'
  return 'medium'
}

/**
 * Generate frontmatter for a mission
 */
export function generateFrontmatter(mission) {
  const fm = {
    id: mission.id || generateId(),
    title: mission.title,
    assigned_to: mission.assigned_to?.toLowerCase() || 'unassigned',
    status: mission.status || 'queue',
    priority: mission.priority || 'medium',
    created_at: mission.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  
  if (mission.tags?.length > 0) {
    fm.tags = mission.tags
  }
  
  return '---\n' + YAML.stringify(fm) + '---\n\n'
}

/**
 * Update frontmatter in existing content
 */
export function updateFrontmatter(content, updates) {
  const { frontmatter, body, hasFrontmatter } = extractFrontmatter(content)
  
  const updated = {
    ...frontmatter,
    ...updates,
    updated_at: new Date().toISOString()
  }
  
  const newFrontmatter = '---\n' + YAML.stringify(updated) + '---\n\n'
  
  return newFrontmatter + body
}

/**
 * Check if a status change should trigger auto-archive
 */
export function shouldAutoArchive(oldStatus, newStatus) {
  return newStatus === 'done' && oldStatus !== 'done'
}

/**
 * Determine the action type from status transition
 */
export function getStatusTransitionAction(oldStatus, newStatus) {
  if (!oldStatus || oldStatus === 'queue') {
    if (newStatus === 'progress') return 'started'
    if (newStatus === 'done') return 'completed'
  }
  if (oldStatus === 'progress') {
    if (newStatus === 'review') return 'submitted for review'
    if (newStatus === 'done') return 'completed'
  }
  if (oldStatus === 'review') {
    if (newStatus === 'progress') return 'returned to progress'
    if (newStatus === 'done') return 'completed'
  }
  return 'moved'
}
