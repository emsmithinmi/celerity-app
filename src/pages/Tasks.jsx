import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTasks } from '../hooks/useTasks'
import { useProjects } from '../hooks/useProjects'
import { TaskList, TaskDetail, TaskForm } from '../components/tasks'
import { Button, Drawer } from '../components/ui'
import { TASK_STATUS_ORDER, TASK_STATUSES, PRIORITY_ORDER, PRIORITIES, AREAS } from '../lib/constants'

const selectClass =
  'bg-app-pane border border-app-border rounded-lg px-3 py-1.5 text-xs text-app-muted focus:outline-none focus:border-app-highlight cursor-pointer'

export default function Tasks() {
  const [statusFilter,   setStatusFilter]   = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [areaFilter,     setAreaFilter]     = useState('')
  const [selectedTask,   setSelectedTask]   = useState(null)
  const [showNewForm,    setShowNewForm]    = useState(false)

  // Fetch all tasks; status is filtered client-side so tab counts stay accurate
  const { tasks: allTasks, loading, error, createTask, updateTask, deleteTask } = useTasks({
    priority: priorityFilter,
    area:     areaFilter,
  })
  const { projects } = useProjects()

  // Client-side status filter
  const tasks =
    statusFilter === 'all'
      ? allTasks
      : allTasks.filter((t) => t.status === statusFilter)

  // Tab definitions with live counts
  const statusTabs = [
    { value: 'all', label: 'All', icon: null, count: allTasks.length },
    ...TASK_STATUS_ORDER.map((s) => ({
      value: s,
      label: TASK_STATUSES[s].label,
      icon:  TASK_STATUSES[s].icon,
      count: allTasks.filter((t) => t.status === s).length,
    })),
  ]

  const handleCreate = async (data) => {
    const { error: err } = await createTask(data)
    if (!err) setShowNewForm(false)
  }

  const handleUpdate = async (id, updates) => {
    const { data } = await updateTask(id, updates)
    if (data && selectedTask?.id === id) setSelectedTask(data)
  }

  const handleDelete = async (id) => {
    await deleteTask(id)
    setSelectedTask(null)
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-app-text">Tasks</h1>
          <p className="text-app-muted text-sm mt-0.5">
            {loading
              ? 'Loading…'
              : `${allTasks.length} task${allTasks.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Plus size={14} />}
          onClick={() => setShowNewForm(true)}
        >
          Add Task
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 flex-wrap mb-4 bg-app-pane border border-app-border rounded-xl p-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-app-highlight text-white'
                : 'text-app-muted hover:text-app-text hover:bg-white/5'
            }`}
          >
            {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
            {tab.label}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full tabular-nums ${
                statusFilter === tab.value ? 'bg-white/20' : 'bg-white/5'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Secondary filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className={selectClass}
        >
          <option value="">All Priorities</option>
          {PRIORITY_ORDER.map((p) => (
            <option key={p} value={p}>{PRIORITIES[p].label}</option>
          ))}
        </select>
        <select
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value)}
          className={selectClass}
        >
          <option value="">All Areas</option>
          {AREAS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 mb-6">
          {error}
        </p>
      )}

      {/* Task list / skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-app-pane border border-app-border rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <TaskList
          tasks={tasks}
          statusFilter={statusFilter}
          onSelectTask={setSelectedTask}
        />
      )}

      {/* Task detail drawer */}
      <Drawer
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title="Task Detail"
        width="md"
      >
        {selectedTask && (
          <TaskDetail
            task={selectedTask}
            projects={projects}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </Drawer>

      {/* New task drawer */}
      <Drawer
        isOpen={showNewForm}
        onClose={() => setShowNewForm(false)}
        title="New Task"
        width="md"
      >
        <TaskForm
          projects={projects}
          onSubmit={handleCreate}
          onCancel={() => setShowNewForm(false)}
        />
      </Drawer>
    </div>
  )
}
