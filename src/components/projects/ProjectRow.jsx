import { StatusPill, PriorityBadge } from '../ui'

export default function ProjectRow({ project, onClick }) {
  const isArchived  = !!project.archived_at
  const today       = new Date().toLocaleDateString('en-CA')
  const overdue     = project.end_date && project.end_date < today
    && project.status !== 'completed' && !isArchived

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 cursor-pointer transition-opacity hover:opacity-90"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Status */}
      <StatusPill status={project.status} type="project" />

      {/* Title + area */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm truncate"
          style={{
            color: isArchived || project.status === 'completed' ? 'var(--text-secondary)' : 'var(--text-primary)',
            textDecoration: project.status === 'completed' ? 'line-through' : 'none',
          }}
        >
          {project.is_highlight && <span className="mr-1">⭐</span>}
          {project.title}
        </p>
        {project.area && (
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            📂 {project.area}
          </p>
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
        {project.end_date && (
          <span className="text-xs" style={{ color: overdue ? 'var(--danger)' : 'var(--text-secondary)' }}>
            {overdue ? '⚠ ' : ''}
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
