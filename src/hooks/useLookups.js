import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase'

// Shared hook — reads the admin-managed Batch, Course, and Offering
// (Batch <-> Course pairing) lists. Used everywhere a "Batch" or
// "Module/Course" dropdown is shown, so every form pulls from the same
// single source of truth (no free-text typos that silently break the
// batch/module visibility filters).
export function useLookups() {
  const [batches, setBatches]   = useState([])
  const [courses, setCourses]   = useState([])
  const [offerings, setOfferings] = useState([]) // [{ id, batch, course }]

  useEffect(() => {
    const q = query(collection(db, 'batches'), orderBy('name', 'asc'))
    return onSnapshot(q, snap => setBatches(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'courses'), orderBy('name', 'asc'))
    return onSnapshot(q, snap => setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'offerings'), orderBy('batch', 'asc'))
    return onSnapshot(q, snap => setOfferings(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  // Given a batch name, return only the course names actually offered for it.
  // Falls back to the full course list if no offerings have been defined yet
  // for that batch (so forms aren't dead-ended before an admin sets pairings up).
  const coursesForBatch = (batchName) => {
    if (!batchName) return courses
    const matches = offerings.filter(o => o.batch === batchName).map(o => o.course)
    if (matches.length === 0) return courses
    return courses.filter(c => matches.includes(c.name))
  }

  return { batches, courses, offerings, coursesForBatch }
}