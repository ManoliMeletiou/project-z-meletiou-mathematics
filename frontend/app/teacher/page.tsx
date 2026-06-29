'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function TeacherPage() {
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    async function fetchStudents() {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('role', 'student');
        setStudents(data || []);
      } catch (err) {
        console.error(err);
      }
    }
    fetchStudents();
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Teacher Dashboard</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Name</th>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>ID</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td style={{ padding: '0.5rem 0' }}>{s.full_name}</td>
              <td style={{ padding: '0.5rem 0' }}>{s.id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}