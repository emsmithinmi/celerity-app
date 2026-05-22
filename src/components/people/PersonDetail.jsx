import { useState, useEffect } from 'react'
import { Pencil, Trash2, Mail, Phone, Cake, Send, X } from 'lucide-react'
import { Button, StatusPill } from '../ui'
import { supabase } from '../../lib/supabase'
import { TaskCard } from '../tasks'
import PersonForm from './PersonForm'

const TYPE_COLORS = {
  Personal: { bg: '#4ade80', text: '#000' },
  Work:     { bg: '#60a5fa', text: '#000' },
  Services: { bg: '#f472b6', text: '#000' },
}

function initials(name) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

function fmtBirthday(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric',
  })
}

export default function PersonDetail({ person, onUpdate, onDelete, onClose, onSelectTask }) {
  const [comments,       setComments]       = useState([])
  const [linkedTasks,    setLinkedTasks]    = useState([])
  const [linkedProjects, setLinkedProjects] = useState([])
  const [loadingLinks,   setLoadingLinks]   = useState(true)
  const [editing,        setEditing]        = useState(false)
  const [newComment,     setNewComment]     = useState('')
  const [savingComment,  setSavingComment]  = useState(false)

  useEffect(() => {
    const fetchLinks = async () => {
      setLoadingLinks(true)
      const [commentsRes, tasksRes, projectsRes] = await Promise.all([
        supabase
          .from('people_comments')
          .select('*')
          .eq('person_id', person.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('task_people')
          .select('tasks(*)')
          .eq('person_id', person.id),
        supabase
          .from('project_people')
          .select('projects(*)')
          .eq('person_id', person.id),
      ])
      setComments(commentsRes.data || [])
      setLinkedTasks((tasksRes.data || []).map((r) => r.tasks).filter(Boolean))
      setLinkedProjects((projectsRes.data || []).map((r) => r.projects).filter(Boolean))
      setLoadingLinks(false)
    }
    fetchLinks()
  }, [person.id])

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setSavingComment(true)
    const { data } = await supabase
      .from('people_comments')
      .insert({ person_id: person.id, body: newComment.trim() })
      .select()
      .single()
    if (data) setComments((prev) => [data, ...prev])
    setNewComment('')
    setSavingComment(false)
  }

  const handleDeleteComment = async (id) => {
    await supabase.from('people_comments').delete().eq('id', id)
    setComments((prev) => prev.filter((c) => c.id !== id))
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${person.name}"? This can't be undone.`)) return
    await onDelete(person.id)
    onClose()
  }

  const colors = TYPE_COLORS[person.contact_type] || { bg: '#6c7086', text: '#fff' }

  if (editing) {
    return (
      <PersonForm
        initial={person}
        submitLabel="Save Changes"
        onSubmit={async (data) => { await onUpdate(person.id, data); setEditing(false) }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="p-5 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
          style={{ background: colors.bg, color: colors.text }}
        >
          {initials(person.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-lg font-semibold text-app-text">{person.name}</h2>
            {person.contact_type && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: colors.bg, color: colors.text }}
              >
                {person.contact_type}
              </span>
            )}
          </div>
          {(person.title || person.company) && (
            <p className="text-sm text-app-muted">
              {[person.title, person.company].filter(Boolean).join(' @ ')}
            </p>
          )}
          {person.relationship && (
            <p className="text-xs text-app-muted mt-0.5">{person.relationship}</p>
          )}
        </div>
      </div>

      {/* Contact info */}
      {(person.email || person.phone || person.birthday) && (
        <div className="grid grid-cols-1 gap-2">
          {person.email && (
            <a
              href={`mailto:${person.email}`}
              className="flex items-center gap-2.5 bg-app-bg rounded-lg p-3 hover:bg-app-border transition-colors"
            >
              <Mail size={14} className="text-app-muted flex-shrink-0" />
              <span className="text-sm text-app-link truncate">{person.email}</span>
            </a>
          )}
          {person.phone && (
            <a
              href={`tel:${person.phone}`}
              className="flex items-center gap-2.5 bg-app-bg rounded-lg p-3 hover:bg-app-border transition-colors"
            >
              <Phone size={14} className="text-app-muted flex-shrink-0" />
              <span className="text-sm text-app-text">{person.phone}</span>
            </a>
          )}
          {person.birthday && (
            <div className="flex items-center gap-2.5 bg-app-bg rounded-lg p-3">
              <Cake size={14} className="text-app-muted flex-shrink-0" />
              <span className="text-sm text-app-text">{fmtBirthday(person.birthday)}</span>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {person.notes && (
        <div>
          <p className="text-xs font-semibold text-app-muted uppercase tracking-widest mb-2">Notes</p>
          <p className="text-sm text-app-text leading-relaxed whitespace-pre-wrap">{person.notes}</p>
        </div>
      )}

      {/* Linked Projects */}
      {!loadingLinks && linkedProjects.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-app-muted uppercase tracking-widest mb-2">
            Projects ({linkedProjects.length})
          </p>
          <div className="space-y-2">
            {linkedProjects.map((proj) => (
              <div key={proj.id} className="bg-app-bg rounded-lg p-3 flex items-center gap-2">
                <StatusPill status={proj.status} type="project" />
                <span className="text-sm text-app-text">{proj.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linked Tasks */}
      {!loadingLinks && linkedTasks.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-app-muted uppercase tracking-widest mb-2">
            Tasks ({linkedTasks.length})
          </p>
          <div className="space-y-2">
            {linkedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onSelectTask?.(task)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Comments / Notes history */}
      <div>
        <p className="text-xs font-semibold text-app-muted uppercase tracking-widest mb-3">
          Notes & History
        </p>

        <form onSubmit={handleAddComment} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a note…"
            className="flex-1 bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-highlight"
          />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={savingComment || !newComment.trim()}
          >
            <Send size={12} />
          </Button>
        </form>

        {comments.length === 0 ? (
          <p className="text-xs text-app-muted text-center py-4">No notes yet.</p>
        ) : (
          <div className="space-y-2">
            {comments.map((c) => (
              <div
                key={c.id}
                className="bg-app-bg rounded-lg p-3 group flex items-start gap-2"
              >
                <p className="text-sm text-app-text leading-relaxed flex-1 whitespace-pre-wrap">
                  {c.body}
                </p>
                <button
                  onClick={() => handleDeleteComment(c.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-app-muted hover:text-red-400 flex-shrink-0 mt-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit / Delete */}
      <div className="flex items-center gap-2 pt-2 border-t border-app-border">
        <Button
          variant="secondary"
          size="sm"
          icon={<Pencil size={12} />}
          onClick={() => setEditing(true)}
        >
          Edit
        </Button>
        <Button
          variant="danger"
          size="sm"
          icon={<Trash2 size={12} />}
          onClick={handleDelete}
        >
          Delete
        </Button>
      </div>
    </div>
  )
}
