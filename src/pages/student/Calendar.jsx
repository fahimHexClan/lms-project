import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { PageLayout } from '../../components/common/Sidebar'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from 'date-fns'

const typeColors = {
  lecture:    'bg-blue-900/50 text-blue-300 border-sky-200',
  assignment: 'bg-red-900/50 text-red-300 border-red-200',
  exam:       'bg-purple-900/50 text-purple-300 border-purple-800/40',
  holiday:    'bg-green-900/50 text-green-300 border-emerald-200',
  other:      'bg-slate-100 text-slate-600 border-slate-300',
}

export default function StudentCalendar() {
  const [events, setEvents]   = useState([])
  const [current, setCurrent] = useState(new Date())
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'))
    return onSnapshot(q, snap => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const days = eachDayOfInterval({ start: startOfMonth(current), end: endOfMonth(current) })
  const selectedEvents = selected
    ? events.filter(e => {
        const d = e.date?.toDate?.() || new Date(e.date)
        return isSameDay(d, selected)
      })
    : []

  const eventsForDay = (day) =>
    events.filter(e => {
      const d = e.date?.toDate?.() || new Date(e.date)
      return isSameDay(d, day)
    })

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-700 text-slate-900">Academic Calendar</h1>
          <p className="text-slate-500 mt-1">All lectures, deadlines, and events in one place.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar grid */}
          <div className="lg:col-span-2 card">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1))} className="btn-secondary px-3 py-1.5 text-sm">←</button>
              <h2 className="font-display text-lg font-700 text-slate-900">{format(current, 'MMMM yyyy')}</h2>
              <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1))} className="btn-secondary px-3 py-1.5 text-sm">→</button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="text-center text-xs text-slate-500 font-medium py-1">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {/* Offset for first day */}
              {Array.from({ length: days[0].getDay() }).map((_, i) => <div key={`pad-${i}`} />)}

              {days.map(day => {
                const dayEvents = eventsForDay(day)
                const isSelected = selected && isSameDay(day, selected)
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelected(day)}
                    className={`relative aspect-square flex flex-col items-center justify-start pt-1 rounded-xl text-sm transition-all
                      ${isSelected ? 'bg-primary-600/30 border border-primary-500' : 'hover:bg-slate-100'}
                      ${isToday(day) ? 'ring-2 ring-accent-500/50' : ''}
                      ${!isSameMonth(day, current) ? 'opacity-30' : ''}
                    `}
                  >
                    <span className={`text-xs font-medium ${isToday(day) ? 'text-accent-700' : 'text-slate-600'}`}>
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                        {dayEvents.slice(0, 3).map(e => (
                          <div key={e.id} className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Events for selected day */}
          <div className="card">
            <h3 className="font-display text-slate-900 font-700 mb-4">
              {selected ? format(selected, 'EEEE, MMMM d') : 'Select a day'}
            </h3>
            {selected && selectedEvents.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-6">No events on this day</p>
            )}
            <div className="space-y-3">
              {selectedEvents.map(e => (
                <div key={e.id} className={`border rounded-xl p-3 ${typeColors[e.type] || typeColors.other}`}>
                  <p className="font-medium text-sm">{e.title}</p>
                  {e.time && <p className="text-xs opacity-70 mt-0.5">🕐 {e.time}</p>}
                  {e.description && <p className="text-xs opacity-70 mt-1">{e.description}</p>}
                  <span className="badge mt-2 bg-white/10 text-current border-white/20">{e.type}</span>
                </div>
              ))}
            </div>

            {/* Upcoming events */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-3">Upcoming</p>
              {events
                .filter(e => {
                  const d = e.date?.toDate?.() || new Date(e.date)
                  return d >= new Date()
                })
                .slice(0, 4)
                .map(e => (
                  <div key={e.id} className="flex items-center gap-2 py-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary-400 flex-shrink-0" />
                    <span className="text-xs text-slate-500 truncate">{e.title}</span>
                    <span className="text-xs text-slate-500 ml-auto flex-shrink-0">
                      {(e.date?.toDate?.() || new Date(e.date)).toLocaleDateString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}