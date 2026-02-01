#!/usr/bin/env node
/* eslint-env node */
/**
 * Migration script to add YAML frontmatter to existing mission files
 * 
 * Usage:
 *   node scripts/migrate-missions.js [--dry-run] [--force]
 * 
 * Options:
 *   --dry-run  Show what would be changed without writing files
 *   --force    Re-migrate files that already have frontmatter
 */

import fs from 'fs/promises'
import path from 'path'
import YAML from 'yaml'

const CLAWD_PATH = process.env.CLAWD_PATH || '/home/node/clawd'
const MISSION_PATHS = [
  path.join(CLAWD_PATH, 'mission-control', 'active'),
  path.join(CLAWD_PATH, 'mission-control', 'done'),
  path.join(CLAWD_PATH, 'mission-control', 'completed'),
]

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const FORCE = args.includes('--force')

// Generate a slug-based ID from title
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50)
}

// Check if content already has frontmatter
function hasFrontmatter(content) {
  return content.trimStart().startsWith('---')
}

// Extract metadata from legacy mission file
function extractMetadata(content, filename) {
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
    status = 'done'
  } else if (statusLine.toLowerCase().includes('progress') || 
             statusLine.toLowerCase().includes('working') ||
             lowerContent.includes('in progress')) {
    status = 'in_progress'
  } else if (statusLine.toLowerCase().includes('blocked') ||
             statusLine.toLowerCase().includes('waiting')) {
    status = 'queue' // Blocked shows in queue
  } else if (statusLine.toLowerCase().includes('review')) {
    status = 'review'
  }
  
  // Extract priority
  const priorityMatch = content.match(/Priority:\s*(\w+)/i)
  let priority = priorityMatch ? priorityMatch[1].toLowerCase() : 'medium'
  if (['critical', 'urgent'].includes(priority)) priority = 'critical'
  else if (!['high', 'low'].includes(priority)) priority = 'medium'
  
  // Extract assigned agent
  const agentMatch = content.match(/(?:Assigned(?:\s+to)?|Assignee|Agent|From):\s*(\w+)/i) ||
                     filename.match(/^(\w+)-/i)
  const assigned_to = agentMatch ? agentMatch[1].toLowerCase() : 'unassigned'
  
  // Extract tags from content
  const tags = []
  if (priority === 'critical' || priority === 'high') tags.push('urgent')
  if (lowerContent.includes('blocked')) tags.push('blocked')
  if (lowerContent.includes('research')) tags.push('research')
  if (lowerContent.includes('develop') || lowerContent.includes('build')) tags.push('development')
  
  return {
    id: slugify(title) || filename.replace('.md', ''),
    title: title.slice(0, 80),
    assigned_to,
    status,
    priority,
    tags: tags.length > 0 ? tags : undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

// Generate frontmatter YAML
function generateFrontmatter(metadata) {
  // Clean up undefined values
  const clean = Object.fromEntries(
    Object.entries(metadata).filter(([, v]) => v !== undefined)
  )
  return '---\n' + YAML.stringify(clean) + '---\n\n'
}

async function migrateFile(filePath) {
  const filename = path.basename(filePath)
  
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    
    // Check if already has frontmatter
    if (hasFrontmatter(content) && !FORCE) {
      console.log(`⏭️  Skip (has frontmatter): ${filename}`)
      return { skipped: true }
    }
    
    // Extract metadata from content
    const metadata = extractMetadata(content, filename)
    
    // Generate frontmatter
    const frontmatter = generateFrontmatter(metadata)
    
    // Combine with existing content
    const newContent = frontmatter + (hasFrontmatter(content) 
      ? content.replace(/^---[\s\S]*?---\s*\n/, '') // Remove old frontmatter
      : content)
    
    console.log(`\n📄 ${filename}`)
    console.log(`   Title: ${metadata.title}`)
    console.log(`   Status: ${metadata.status}`)
    console.log(`   Assigned: ${metadata.assigned_to}`)
    console.log(`   Priority: ${metadata.priority}`)
    if (metadata.tags) console.log(`   Tags: ${metadata.tags.join(', ')}`)
    
    if (DRY_RUN) {
      console.log('   [DRY RUN - no changes written]')
    } else {
      await fs.writeFile(filePath, newContent)
      console.log('   ✅ Migrated')
    }
    
    return { migrated: true, metadata }
  } catch (err) {
    console.error(`❌ Error processing ${filename}:`, err.message)
    return { error: err.message }
  }
}

async function main() {
  console.log('🚀 Mission File Migration')
  console.log('========================')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Force: ${FORCE}`)
  console.log(`Paths: ${MISSION_PATHS.join(', ')}`)
  console.log('')
  
  let totalFiles = 0
  let migrated = 0
  let skipped = 0
  let errors = 0
  
  for (const dirPath of MISSION_PATHS) {
    try {
      const files = await fs.readdir(dirPath)
      const mdFiles = files.filter(f => f.endsWith('.md'))
      
      console.log(`\n📁 ${dirPath} (${mdFiles.length} files)`)
      
      for (const file of mdFiles) {
        const filePath = path.join(dirPath, file)
        const result = await migrateFile(filePath)
        totalFiles++
        
        if (result.migrated) migrated++
        else if (result.skipped) skipped++
        else if (result.error) errors++
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`❌ Error reading ${dirPath}:`, err.message)
      }
    }
  }
  
  console.log('\n========================')
  console.log('📊 Summary')
  console.log(`   Total files: ${totalFiles}`)
  console.log(`   Migrated: ${migrated}`)
  console.log(`   Skipped: ${skipped}`)
  console.log(`   Errors: ${errors}`)
  
  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN - no files were modified')
    console.log('   Run without --dry-run to apply changes')
  }
}

main().catch(console.error)
