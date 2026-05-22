import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useProjects } from '../hooks/useProjects'
import { useTasks } from '../hooks/useTasks'
import { ProjectList, ProjectDetail, ProjectForm } from '../components/projects'
import { TaskDetail } from '../components/tasks'
import { Button, Drawer } from '../components/ui'
import { PROJECT_STATUS_ORDER, PROJECT_STATUSES, PRIORITY_ORDER, PRIORITIES, AREAS } from '../lib/constants'

const selectClass =
  'bg-app-pane border border-app-border rounded-lg px-3 py-1.5 text-xs text-app-muted focus:outline-none focus:border-app-highlight cursor-pointer'

export default function Projects() {
  const [statusFilter,     setStatusFilter]     = useState('all')
  const [priorityFilter,   setPriorityFilter]   = useState('')
  const [areaFilter,       setAreaFilter]        = useState('')
  const [selectedProject,  setSelectedProject]  = useState(null)
  const [selectedTask,     setSelectedTask]     = useState(null)
  const [showNewForm,      setShowNewForm]      = useState(false)

  const {
    projects: allProjects,
    loading, error,
    createProject, updateProject, deleteProject,
  } = useProjects({ priority: priorityFilter, area: areaFilter })

  // All tasks — only used for rollup counts on project cards
  const { tasks: allTasks, updateTask, deleteTask } = useTasks()

  // Task counts keyed by project id
  const taskCountsByProject = useMemo(() => {
    const map = {}
    for (const task of allTasks) {
      if (!task.project_id) continue
      if (!map[task.project_id]) map[task.project_id] = {}
      map[task.project_id][task.status] =
        (map[task.project_id][task.status] || 0) + 1
    }
    return map
  }, [allTasks])

  // Client-side status filter
  const projects =
    statusFilter === 'all'
      ? allProjects
      : allProjects.filter((p) => p.status === statusFilter)

  const statusTabs = [
    { value: 'all', label: 'All', count: allProjects.length },
    ...PROJECT_STATUS_ORDER.map((s) => ({
      value: s,
      label: PROJECT_STATUSES[s].label,
      count: allProjects.filter((p) => p.status === s).length,
    })),
  ]

  const handleCreate = async (data) => {
    const { error: err } = await createProject(data)
    if (!err) setShowNewForm(false)
  }

  const handleUpdate = async (id, updates) => {
    const { data } = await updateProject(id, updates)
    if (data && selectedProject?.id === id) setSelectedProject(data)
  }

  const handleDelete = async (id) => {
    await deleteProject(id)
    setSelectedProject(null)
  }

  const handleTaskUpdate = async (id, updates) => {
    const { data } = await updateTask(id, updates)
    if (data && selectedTask?.id === id) setSelectedTask(data)
  }

  const handleTaskDelete = async (id) => {
    await deleteTask(id)
    setSelectedTask(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-app-text">Projects</h1>
          <p className="text-app-muted text-sm mt-0.5">
            {loading
              ? 'Loading…'
              : `${allProjects.length} project${allProjects.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Plus size={14} />}
          onClick={() => setShowNewForm(true)}
        >
          Add Project
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
          {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 mb-6">
          {error}
        </p>
      )}

      {/* Project list / skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-app-pane border border-app-border rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <ProjectList
          projects={projects}
          taskCountsByProject={taskCountsByProject}
          statusFilter={statusFilter}
          onSelectProject={setSelectedProject}
        />
      )}

      {/* Project detail drawer (lg — has task list inside) */}
      <Drawer
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        title="Project Detail"
        width="lg"
      >
        {selectedProject && (
          <ProjectDetail
            project={selectedProject}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onClose={() => setSelectedProject(null)}
            onSelectTask={setSelectedTask}
          />
        )}
      </Drawer>

      {/* Task detail drawer — opens on top when a task is clicked inside project */}
      <Drawer
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title="Task Detail"
        width="md"
      >
        {selectedTask && (
          <TaskDetail
            task={selectedTask}
            onUpdate={handleTaskUpdate}
            onDelete={handleTaskDelete}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </Drawer>

      {/* New project drawer */}
      <Drawer
        isOpen={showNewForm}
        onClose={() => setShowNewForm(false)}
        title="New Project"
        width="md"
      >
        <ProjectForm
          onSubmit={handleCreate}
          onCancel={() => setShowNewForm(false)}
        />
      </Drawer>
    </div>
  )
}
