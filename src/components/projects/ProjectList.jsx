import { PROJECT_STATUS_ORDER, PROJECT_STATUSES } from '../../lib/constants'
import ProjectCard from './ProjectCard'

export default function ProjectList({ projects, taskCountsByProject, statusFilter, onSelectProject }) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-app-muted text-sm">
          {statusFilter && statusFilter !== 'all'
            ? `No ${PROJECT_STATUSES[statusFilter]?.label} projects.`
            : 'No projects yet. Add one to get started.'}
        </p>
      </div>
    )
  }

  // Flat view when filtered to one status
  if (statusFilter && statusFilter !== 'all') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            taskCounts={taskCountsByProject[p.id] || {}}
            onClick={() => onSelectProject(p)}
          />
        ))}
      </div>
    )
  }

  // Grouped by status
  const groups = PROJECT_STATUS_ORDER
    .map((status) => ({
      status,
      label:    PROJECT_STATUSES[status].label,
      projects: projects.filter((p) => p.status === status),
    }))
    .filter((g) => g.projects.length > 0)

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.status}>
          <h2 className="text-xs font-semibold text-app-muted uppercase tracking-widest mb-3">
            {group.label}
            <span className="font-normal normal-case tracking-normal ml-2">
              ({group.projects.length})
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {group.projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                taskCounts={taskCountsByProject[p.id] || {}}
                onClick={() => onSelectProject(p)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
