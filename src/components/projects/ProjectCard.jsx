import { StatusPill, PriorityBadge } from '../ui'

export default function ProjectCard({ project, taskCounts = {}, onClick }) {
  const total    = Object.values(taskCounts).reduce((a, b) => a + b, 0)
  const done     = taskCounts.done || 0
  const open     = total - done - (taskCounts.someday || 0)
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div
      onClick={onClick}
      className="group bg-app-pane border border-app-border rounded-xl p-4 cursor-pointer hover:border-app-highlight transition-colors"
    >
      {/* Badges */}
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        <StatusPill status={project.status} type="project" />
        {project.priority && project.priority !== 'routine' && (
          <PriorityBadge priority={project.priority} />
        )}
      </div>

      {/* Title */}
      <h3
        className={`text-sm font-medium leading-snug mb-1 ${
          project.status === 'completed' ? 'line-through text-app-muted' : 'text-app-text'
        }`}
      >
        {project.title}
      </h3>

      {project.area && (
        <p className="text-xs text-app-muted mb-2">{project.area}</p>
      )}

      {project.description && (
        <p className="text-xs text-app-muted mb-3 line-clamp-2 leading-relaxed">
          {project.description}
        </p>
      )}

      {/* Progress bar */}
      {total > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-app-muted mb-1.5">
            <span>{done} / {total} done</span>
            {open > 0 && <span>{open} open</span>}
          </div>
          <div className="h-1 bg-app-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-app-highlight rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
