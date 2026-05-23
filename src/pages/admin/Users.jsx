import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { PageLayout } from '../../components/common/Sidebar'
import toast from 'react-hot-toast'

export default function AdminUsers() {
  const { register } = useAuth()
  const [users, setUsers]   = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ displayName: '', email: '', password: '', role: 'student' })
  const [creating, setCreating] = useState(false)
  const [filter, setFilter]     = useState('all')

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const filtered = filter === 'all' ? users : users.filter(u => u.role === filter)

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await register(form.email, form.password, form.role, form.displayName)
      setForm({ displayName: '', email: '', password: '', role: 'student' })
      setShowForm(false)
      toast.success(`${form.role} account created!`)
    } catch (err) {
      toast.error(err.message || 'Failed to create user.')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (u) => {
    if (!confirm(`Delete account for ${u.email}? This cannot be undone.`)) return
    try {
      await deleteDoc(doc(db, 'users', u.id))
      toast.success('User removed from Firestore. Auth account requires Admin SDK to fully delete.')
    } catch {
      toast.error('Failed to delete user.')
    }
  }

  const roleBadge = { student: 'badge-purple', lecturer: 'badge-amber', admin: 'badge-green' }

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-700 text-white">User Management</h1>
            <p className="text-gray-500 mt-1">Create and manage student, lecturer, and admin accounts.</p>
          </div>
          <button onClick={() => setShowForm(f => !f)} className="btn-primary">+ New User</button>
        </div>

        {/* Create user form */}
        {showForm && (
          <form onSubmit={handleCreate} className="card mb-6 animate-slide-up">
            <h3 className="font-medium text-white mb-4">Create new account</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" placeholder="John Smith"
                  value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Role *</label>
                <select className="input" value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="student">Student</option>
                  <option value="lecturer">Lecturer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" placeholder="user@university.edu"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Temporary Password *</label>
                <input type="password" className="input" placeholder="Min 6 characters"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={creating} className="btn-primary">
                {creating ? 'Creating…' : 'Create Account'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {['all', 'student', 'lecturer', 'admin'].map(r => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all
                ${filter === r ? 'bg-primary-600/30 text-primary-300 border border-primary-700/50' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
              <span className="ml-1.5 text-xs opacity-60">
                {r === 'all' ? users.length : users.filter(u => u.role === r).length}
              </span>
            </button>
          ))}
        </div>

        {/* Users table */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-gray-500">Name</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500">Email</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500">Role</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500">Points</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500">Badges</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500">Joined</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id} className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-900/20'}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-600 text-primary-400">
                          {(u.displayName || u.email)?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-gray-200">{u.displayName || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-400">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${roleBadge[u.role] || 'badge-blue'}`}>{u.role}</span>
                    </td>
                    <td className="px-5 py-3 text-accent-400 font-mono font-600">
                      {(u.points || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-gray-400">{u.badges?.length || 0}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {u.createdAt?.toDate?.().toLocaleDateString() || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => handleDelete(u)} className="text-xs text-red-400 hover:text-red-300">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-10 text-gray-600">
                <p className="text-3xl mb-2">👥</p>
                <p className="text-sm">No users found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
