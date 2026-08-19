import { useEffect, useState } from 'react'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const roleBadge = { student: 'badge-purple', lecturer: 'badge-amber', admin: 'badge-green' }

export default function ProfileModal({ onClose }) {
  const { user, role } = useAuth()
  const [profile, setProfile] = useState(null)
  const [name, setName]       = useState('')
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (!user) return
    return onSnapshot(doc(db, 'users', user.uid), s => {
      if (!s.exists()) return
      setProfile(s.data())
      setName(s.data().displayName || '')
    })
  }, [user])

  const save = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), { displayName: name.trim() })
      toast.success('Profile updated!')
      onClose()
    } catch {
      toast.error('Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-14 h-14 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center text-xl font-700 text-primary-700 flex-shrink-0">
            {(profile.displayName || profile.email)?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-display font-700 text-slate-900 truncate">{profile.displayName || profile.email}</p>
            <p className="text-xs text-slate-500 truncate">{profile.email}</p>
            <span className={`badge ${roleBadge[role] || 'badge-blue'} mt-1`}>{role}</span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-slate-100 rounded-xl p-2.5 text-center">
            <p className="text-lg font-display font-700 text-accent-700">{profile.points || 0}</p>
            <p className="text-[11px] text-slate-500">Points</p>
          </div>
          <div className="bg-slate-100 rounded-xl p-2.5 text-center">
            <p className="text-lg font-display font-700 text-primary-700">{profile.badges?.length || 0}</p>
            <p className="text-[11px] text-slate-500">Badges</p>
          </div>
          <div className="bg-slate-100 rounded-xl p-2.5 text-center">
            <p className="text-lg font-display font-700 text-orange-600">{profile.loginStreak || 0}🔥</p>
            <p className="text-[11px] text-slate-500">Streak</p>
          </div>
        </div>

        {(profile.batch || profile.module) && (
          <div className="flex gap-2 mb-5">
            {profile.batch && <span className="badge badge-amber">{profile.batch}</span>}
            {profile.module && <span className="badge badge-blue">{profile.module}</span>}
          </div>
        )}

        <form onSubmit={save}>
          <label className="label">Display Name</label>
          <input className="input mb-4" value={name} onChange={e => setName(e.target.value)} required />
          <p className="text-xs text-slate-400 mb-4">
            Need your email, password, batch, or course changed? Ask your administrator.
          </p>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Close</button>
          </div>
        </form>
      </div>
    </div>
  )
}