import { useEffect, useState } from 'react'
import {
  collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp, deleteDoc, doc
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { useLookups } from '../../hooks/useLookups'
import { PageLayout } from '../../components/common/Sidebar'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isToday, isSameMonth
} from 'date-fns'
import toast from 'react-hot-toast'

const EVENT_TYPES = ['lecture', 'assignment', 'exam', 'holiday', 'other']
const typeColors = {
  lecture:    'border-sky-200 bg-sky-50 text-sky-700',
  assignment: 'border-red-200 bg-red-50 text-red-700',
  exam:       'border-purple-200 bg-purple-50 text-purple-700',
  holiday:    'border-emerald-200 bg-emerald-50 text-emerald-700',
  other:      'border-slate-300 bg-slate-50 text-slate-600',
}

export default function LecturerCalendar() {
  const { user } = useAuth()
  const { batches, coursesForBatch } = useLookups()
  const [events, setEvents]     = useState([])
  const [current, setCurrent]   = useState(new Date())
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', type: 'lecture', time: '', description: '', module: '', batch: '' })
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'))
    return onSnapshot(q, snap => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const eventsForDay = (day) =>
    events.filter(e => isSameDay(e.date?.toDate?.() || new Date(e.date), day))

  const selectedEvents = selected ? eventsForDay(selected) : []

  const createEvent = async (e) => {
    e.preventDefault()
    if (!selected || !form.title.trim()) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'events'), {
        title:       form.title.trim(),
        type:        form.type,
        time:        form.time,
        description: form.description.trim(),
        module:      form.module.trim(),
        batch:       form.batch.trim(),
        date:        selected,
        createdBy:   user.uid,
        createdAt:   serverTimestamp(),
      })
      setForm({ title: '', type: 'lecture', time: '', description: '', module: '', batch: '' })
      setShowForm(false)
      toast.success('Event created!')
    } catch {
      toast.error('Failed to create event.')
    } finally {
      setSaving(false)
    }
  }

  const deleteEvent = async (ev) => {
    if (!confirm(`Delete "${ev.title}"?`)) return
    await deleteDoc(doc(db, 'events', ev.id))
    toast.success('Event deleted.')
  }

  const days = eachDayOfInterval({ start: startOfMonth(current), end: endOfMonth(current) })

  return (
    <PageLayout>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-700 text-slate-900">Academic Calendar</h1>
            <p className="text-slate-500 mt-1">Create and manage academic events.</p>
          </div>
          {selected && (
            <button onClick={() => setShowForm(f => !f)} className="btn-primary">
              + Add Event on {format(selected, 'MMM d')}
            </button>
          )}
        </div>

        {/* Event creation form */}
        {showForm && selected && (
          <form onSubmit={createEvent} className="card mb-6 animate-slide-up">
            <h3 className="font-medium text-slate-900 mb-4">New event on {format(selected, 'EEEE, MMMM d')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="label">Event Title *</label>
                <input className="input" placeholder="e.g. Week 5 Lecture"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input" value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Time</label>
                <input type="time" className="input" value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label className="label">Description</label>
                <input className="input" placeholder="Optional notes"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="label">Batch <span className="text-slate-400 font-normal">(blank = everyone)</span></label>
                <select className="input" value={form.batch}
                  onChange={e => setForm(f => ({ ...f, batch: e.target.value, module: '' }))}>
                  <option value="">— Everyone —</option>
                  {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Module <span className="text-slate-400 font-normal">(optional)</span></label>
                <select className="input" value={form.module}
                  onChange={e => setForm(f => ({ ...f, module: e.target.value }))}>
                  <option value="">— Everyone —</option>
                  {coursesForBatch(form.batch).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Create Event'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar grid */}
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1))}
                className="btn-secondary px-3 py-1.5 text-sm">←</button>
              <h2 className="font-display text-lg font-700 text-slate-900">{format(current, 'MMMM yyyy')}</h2>
              <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1))}
                className="btn-secondary px-3 py-1.5 text-sm">→</button>
            </div>
            <div className="grid grid-cols-7 mb-2">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="text-center text-xs text-slate-500 font-medium py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: days[0].getDay() }).map((_, i) => <div key={`p-${i}`} />)}
              {days.map(day => {
                const dayEvents   = eventsForDay(day)
                const isSelected  = selected && isSameDay(day, selected)
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => { setSelected(day); setShowForm(false) }}
                    className={`relative aspect-square flex flex-col items-center justify-start pt-1 rounded-xl text-sm transition-all
                      ${isSelected ? 'bg-primary-100 border border-primary-400' : 'hover:bg-slate-100'}
                      ${isToday(day) ? 'ring-2 ring-accent-500/50' : ''}
                      ${!isSameMonth(day, current) ? 'opacity-30' : ''}`}
                  >
                    <span className={`text-xs font-medium ${isToday(day) ? 'text-accent-700' : 'text-slate-600'}`}>
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                        {dayEvents.slice(0, 3).map(ev => (
                          <div key={ev.id} className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Events panel */}
          <div className="card">
            <h3 className="font-display text-slate-900 font-700 mb-4">
              {selected ? format(selected, 'EEEE, MMMM d') : 'Select a day'}
            </h3>
            {selected && selectedEvents.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-6">No events. Click "+ Add Event" to create one.</p>
            )}
            <div className="space-y-3">
              {selectedEvents.map(ev => (
                <div key={ev.id} className={`border rounded-xl p-3 ${typeColors[ev.type] || typeColors.other}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{ev.title}</p>
                      {ev.time && <p className="text-xs opacity-70 mt-0.5">🕐 {ev.time}</p>}
                      {ev.description && <p className="text-xs opacity-70 mt-1">{ev.description}</p>}
                      <span className="badge mt-2 bg-white/60 text-current border-current/20 text-xs">{ev.type}</span>
                      {ev.module && <span className="badge badge-blue mt-2 ml-1 text-xs">{ev.module}</span>}
                      {ev.batch && <span className="badge badge-amber mt-2 ml-1 text-xs">{ev.batch}</span>}
                    </div>
                    <button onClick={() => deleteEvent(ev)} className="text-xs text-red-600 hover:text-red-700 ml-2">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}