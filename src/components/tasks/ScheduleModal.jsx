import { useState } from 'react'
import Modal  from '../ui/Modal'
import Button from '../ui/Button'
import { useEnergyLevels } from '../../contexts/EnergyLevelsContext'
import { usePriorities }   from '../../contexts/PrioritiesContext'
import { useAreas }        from '../../contexts/AreasContext'
import DurationInput from './DurationInput'

const inputCls  = 'w-full px-3 py-2 rounded-lg text-sm border outline-none bg-transparent'
const inputStyle = { borderColor: 'var(--border)', color: 'var(--text-primary)' }

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
        {label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

// fromInbox: when true, also collects the clarify fields so we can move out of inbox
export default function ScheduleModal({ open, onClose, onConfirm, fromInbox = false, task = {} }) {
  const { levels }     = useEnergyLevels()
  const { priorities } = usePriorities()
  const { areas }      = useAreas()

  const [date,        setDate]        = useState(task.scheduled_date ?? '')
  const [time,        setTime]        = useState(task.scheduled_time ?? '')
  const [priority,    setPriority]    = useState(task.priority ?? '')
  const [energyLevel, setEnergyLevel] = useState(task.energy_level ?? '')
  const [area,        setArea]        = useState(task.area ?? '')
  const [duration,    setDuration]    = useState(task.duration ?? '')
  const [description, setDescription] = useState(task.description ?? '')
  const [saving,      setSaving]      = useState(false)

  const canConfirm = date.trim() !== '' && (!fromInbox || (priority && energyLevel && area && duration))

  const handleConfirm = async () => {
    if (!canConfirm) return
    setSaving(true)
    const fields = { scheduled_date: date, scheduled_time: time || null }
    if (fromInbox) {
      fields.priority    = priority
      fields.energy_level = energyLevel
      fields.area        = area
      fields.duration    = duration
      if (description.trim()) fields.description = description
    }
    await onConfirm(fields)
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule Task"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirm} disabled={!canConfirm || saving}>
            {saving ? 'Scheduling…' : 'Schedule'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {fromInbox && (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Fill in the details below to clarify this task and add it to Next.
          </p>
        )}

        {/* Date + Time */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" required>
            <input
              type="date"
              autoFocus
              value={date}
              onChange={e => setDate(e.target.value)}
              className={inputCls}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </Field>
          <Field label="Time">
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className={inputCls}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </Field>
        </div>

        {/* Clarify fields — only shown when coming from inbox */}
        {fromInbox && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Priority" required>
                <select value={priority} onChange={e => setPriority(e.target.value)} className={inputCls} style={inputStyle}>
                  <option value="">Select…</option>
                  {priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </Field>
              <Field label="Energy Level" required>
                <select value={energyLevel} onChange={e => setEnergyLevel(e.target.value)} className={inputCls} style={inputStyle}>
                  <option value="">Select…</option>
                  {levels.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Area" required>
                <select value={area} onChange={e => setArea(e.target.value)} className={inputCls} style={inputStyle}>
                  <option value="">Select…</option>
                  {areas.map(a => <option key={a.id} value={a.label}>{a.label}</option>)}
                </select>
              </Field>
              <Field label="Duration" required>
                <DurationInput value={duration} onChange={setDuration} />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What does this task involve?"
                rows={2}
                className={`${inputCls} resize-none`}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </Field>
          </>
        )}
      </div>
    </Modal>
  )
}
