// src/components/Routines.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Routines({ session }) {
  const [routines, setRoutines] = useState([])
  const [newRoutineName, setNewRoutineName] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const fetchRoutines = async () => {
    const { data, error } = await supabase
      .from('routines')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error) setRoutines(data)
  }

  useEffect(() => {
    fetchRoutines()
  }, [])

  const handleAddRoutine = async (e) => {
    e.preventDefault()
    if (!newRoutineName) return

    setLoading(true)
    const { error } = await supabase
      .from('routines')
      .insert([{ name: newRoutineName, user_id: session.user.id }])

    if (!error) {
      setNewRoutineName('')
      setIsAdding(false)
      fetchRoutines()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Rutinitas Saya</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="btn btn-sm btn-ghost text-info"
        >
          {isAdding ? 'Batal' : '+ Rutinitas Baru'}
        </button>
      </div>

      {/* Form Input (Muncul jika tombol + diklik) */}
      {isAdding && (
        <form onSubmit={handleAddRoutine} className="bg-base-200 p-4 rounded-xl flex flex-col gap-3">
          <input 
            type="text" 
            placeholder="Cth: Triceps Hypertrophy" 
            className="input input-bordered w-full bg-base-300" 
            value={newRoutineName}
            onChange={(e) => setNewRoutineName(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn btn-info w-full" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </form>
      )}

      {/* Grid Card Rutinitas */}
      <div className="grid grid-cols-1 gap-4">
        {routines.map((routine) => (
          <div key={routine.id} className="bg-base-200 p-5 rounded-2xl shadow-sm border border-neutral/50 cursor-pointer hover:border-info transition-colors">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg">{routine.name}</h3>
              <button className="btn btn-xs btn-circle btn-ghost">⋮</button>
            </div>
            
            {/* Dummy text untuk meniru preview gerakan Hevy */}
            <p className="text-xs text-neutral-400 line-clamp-2">
              Tricep Pushdown, Skullcrusher, Close-Grip Bench Press...
            </p>
          </div>
        ))}

        {routines.length === 0 && !isAdding && (
          <div className="text-center py-10 opacity-50 text-sm border-2 border-dashed border-neutral rounded-xl">
            Belum ada rutinitas.
          </div>
        )}
      </div>
    </div>
  )
}