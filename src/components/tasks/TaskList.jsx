import { TASK_STATUS_ORDER, TASK_STATUSES } from '../../lib/constants'
import TaskCard from './TaskCard'

export default function TaskList({ tasks, statusFilter, onSelectTask }) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-app-muted text-sm">
          {statusFilter && statusFilter !== 'all'
            ? `No ${TASK_STATUSES[statusFilter]?.label} tasks.`
            : 'No tasks yet. Add one to get started.'}
        </p>
      </div>
    )
  }

  // Flat filtered view when a specific status is selected
  if (statusFilter && statusFilter !== 'all') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onSelectTask(task)} />
        ))}
      </div>
    )
  }

  // Grouped by status when showing all
  const groups = TASK_STATUS_ORDER
    .map((status) => ({
      status,
      label: TASK_STATUSES[status].label,
      icon: TASK_STATUSES[status].icon,
      tasks: tasks.filter((t) => t.status === status),
    }))
    .filter((g) => g.tasks.length > 0)

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.status}>
          <h2 className="text-xs font-semibold text-app-muted uppercase tracking-widest mb-3 flex items-center gap-2">
            <span aria-hidden="true">{group.icon}</span>
            {group.label}
            <span className="font-normal normal-case tracking-normal">
              ({group.tasks.length})
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {group.tasks.map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => onSelectTask(task)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
