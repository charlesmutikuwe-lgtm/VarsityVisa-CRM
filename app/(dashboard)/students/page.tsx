'use client'

import { useEffect, useState } from 'react'
import { getStudents } from '@/lib/supabase'
import { destinationLabel } from '@/lib/constants'

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStudents()
      .then(data => setStudents(data || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold">Students</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Active client records created from leads that entered the application pipeline.
        </p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="p-8 text-sm" style={{ color: 'var(--text-muted)' }}>Loading students…</div>
        ) : students.length === 0 ? (
          <div className="p-8 text-sm" style={{ color: 'var(--text-muted)' }}>
            No active students yet. Move a lead to Application Started or later to create a student record.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)' }}>Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)' }}>Destination</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)' }}>Programme</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)' }}>Stage</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px' }}>{student.full_name}</td>
                    <td style={{ padding: '12px 16px' }}>{destinationLabel(student.destination)}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{student.programme_name || 'Not set'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{String(student.stage || '').replace(/_/g, ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
