import { useState } from 'react'
import { Plus } from 'lucide-react'
import { usePeople } from '../hooks/usePeople'
import { PersonList, PersonDetail, PersonForm } from '../components/people'
import { TaskDetail } from '../components/tasks'
import { Button, Drawer } from '../components/ui'
import { CONTACT_TYPES } from '../lib/constants'
import { supabase } from '../lib/supabase'

const selectClass =
  'bg-app-pane border border-app-border rounded-lg px-3 py-1.5 text-xs text-app-muted focus:outline-none focus:border-app-highlight cursor-pointer'

export default function People() {
  const [typeFilter,     setTypeFilter]     = useState('')
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [selectedTask,   setSelectedTask]   = useState(null)
  const [showNewForm,    setShowNewForm]    = useState(false)

  const {
    people: allPeople,
    loading, error,
    createPerson, updatePerson, deletePerson,
  } = usePeople()

  // Client-side type filter
  const people = typeFilter
    ? allPeople.filter((p) => p.contact_type === typeFilter)
    : allPeople

  const handleCreate = async (data) => {
    const { error: err } = await createPerson(data)
    if (!err) setShowNewForm(false)
  }

  const handleUpdate = async (id, updates) => {
    const { data } = await updatePerson(id, updates)
    if (data && selectedPerson?.id === id) setSelectedPerson(data)
  }

  const handleDelete = async (id) => {
    await deletePerson(id)
    setSelectedPerson(null)
  }

  // Minimal task handlers for linked-task view inside Person drawer
  const handleTaskUpdate = async (id, updates) => {
    const { data } = await supabase
      .from('tasks').update(updates).eq('id', id).select().single()
    if (data && selectedTask?.id === id) setSelectedTask(data)
    return { data }
  }

  const handleTaskDelete = async (id) => {
    await supabase.from('tasks').delete().eq('id', id)
    setSelectedTask(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-app-text">People</h1>
          <p className="text-app-muted text-sm mt-0.5">
            {loading
              ? 'Loading…'
              : `${allPeople.length} contact${allPeople.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Plus size={14} />}
          onClick={() => setShowNewForm(true)}
        >
          Add Person
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={selectClass}
        >
          <option value="">All Types</option>
          {CONTACT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 mb-6">
          {error}
        </p>
      )}

      {/* List / skeleton */}
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
        <PersonList
          people={people}
          typeFilter={typeFilter}
          onSelectPerson={setSelectedPerson}
        />
      )}

      {/* Person detail drawer */}
      <Drawer
        isOpen={!!selectedPerson}
        onClose={() => setSelectedPerson(null)}
        title="Contact Detail"
        width="md"
      >
        {selectedPerson && (
          <PersonDetail
            person={selectedPerson}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onClose={() => setSelectedPerson(null)}
            onSelectTask={setSelectedTask}
          />
        )}
      </Drawer>

      {/* Task detail drawer (opens when linked task clicked) */}
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

      {/* New person drawer */}
      <Drawer
        isOpen={showNewForm}
        onClose={() => setShowNewForm(false)}
        title="New Contact"
        width="md"
      >
        <PersonForm
          onSubmit={handleCreate}
          onCancel={() => setShowNewForm(false)}
        />
      </Drawer>
    </div>
  )
}
