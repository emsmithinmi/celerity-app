import { Check, Star, Folder, AlertTriangle } from 'lucide-react'
import { StatusPill, PriorityBadge, ProgressBar } from '../ui'
import { computeProgress, projectTasksToProgressItems } from '../../lib/progress'

function somedayReviewAge(project) {
  if (project.status !== 'someday') return null
  const ref = project.reviewed_at || project.created_at
  if (!ref) return null
  return Math.floor((Date.now() - new Date(ref).getTime()) / 86_400_000)
}

export default function ProjectRow({ project, onClick, selectable = false, selected = false, onToggle }) {
  const isArchived  = !!project.archived_at
  const today       = new Date().toLocaleDateString('en-CA')
  const overdue     = project.end_date && project.end_date < today
    && project.status !== 'completed' && !isArchived
  const reviewDays  = somedayReviewAge(project)

  return (
    <div
      onClick={selectable ? onToggle : onClick}
      className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 cursor-pointer transition-opacity hover:opacity-90"
      style={{ borderColor: 'var(--border)', backgroundColor: selected ? 'var(--state-info-bg)' : 'transparent' }}
    >
      {/* Checkbox (select mode) or status pill */}
      {selectable ? (
        <div
          className="flex items-center justify-center rounded border shrink-0"
          style={{ width: 16, height: 16, borderColor: selected ? 'var(--accent)' : 'var(--border)', backgroundColor: selected ? 'var(--accent)' : 'transparent' }}
        >
          {selected && <Check size={10} strokeWidth={3} style={{ color: 'var(--pane-bg)' }} />}
        </div>
      ) : (
        <StatusPill status={project.status} type="project" />
      )}

      {/* Title + area */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm truncate"
          style={{
            color: isArchived || project.status === 'completed' ? 'var(--text-secondary)' : 'var(--text-primary)',
            textDecoration: project.status === 'completed' ? 'line-through' : 'none',
          }}
        >
          {project.is_highlight && <Star size={11} fill="currentColor" className="inline-block mr-1 -mt-0.5" style={{ color: 'var(--highlight)' }} />}
          {project.title}
        </p>
        {project.area && (
          <p className="text-xs truncate mt-0.5 inline-flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            <Folder size={10} /> {project.area}
          </p>
        )}
        {project.tasks?.length > 0 && (
          <ProgressBar
            fraction={computeProgress(projectTasksToProgressItems(project.tasks)).fraction}
            className="mt-1.5 max-w-[160px]"
          />
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 shrink-0">
        {isArchived && (
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{ backgroundColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Archived
          </span>
        )}
        {reviewDays !== null && (
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              backgroundColor: reviewDays >= 30 ? 'var(--state-warning-bg)' : 'var(--border)',
              color: reviewDays >= 30 ? 'var(--state-warning-text)' : 'var(--text-secondary)',
            }}
          >
            {reviewDays === 0 ? 'Today' : reviewDays === 1 ? '1d ago' : `${reviewDays}d ago`}
          </span>
        )}
        {project.end_date && (
          <span className="text-xs inline-flex items-center gap-1" style={{ color: overdue ? 'var(--danger)' : 'var(--text-secondary)' }}>
            {overdue && <AlertTriangle size={10} />}
            {new Date(project.end_date + 'T00:00:00').toLocaleDateString('en-US', {
              month: 'short', day: 'numeric',
            })}
          </span>
        )}
        <PriorityBadge priority={project.priority} />
      </div>
    </div>
  )
}
