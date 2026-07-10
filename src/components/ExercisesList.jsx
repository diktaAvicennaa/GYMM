// src/components/ExercisesList.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ExercisesList({ onClose }) {
  const [exercises, setExercises] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMuscle, setFilterMuscle] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      setExercises(data);
    }
    setLoading(false);
  };

  const uniqueMuscles = ['All', ...new Set(exercises.map(ex => ex.muscle))];
  const filteredExercises = exercises.filter(ex => {
    return ex.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
           (filterMuscle === 'All' || ex.muscle === filterMuscle);
  });

  return (
    <div className="flex flex-col h-full bg-black animate-fade-in pb-24 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-4 bg-[#1c1c1e] border-b border-[#333333] sticky top-0 z-10">
        <button onClick={onClose} className="text-blue-500 text-sm font-medium">Back</button>
        <h2 className="text-white font-semibold">Exercises</h2>
        <div className="w-10"></div>
      </div>

      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-[#1c1c1e] flex items-center gap-3 px-3 py-2 rounded-xl border border-[#333333]">
          <i className="fas fa-search text-[#6b6b6b]"></i>
          <input 
            type="text" 
            placeholder="Search exercise" 
            className="bg-transparent text-white w-full outline-none" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
      </div>

      {/* Muscle Filter */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
        {uniqueMuscles.map(m => (
          <button
            key={m}
            onClick={() => setFilterMuscle(m)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filterMuscle === m 
                ? 'bg-blue-500 text-white' 
                : 'bg-[#1c1c1e] text-[#9e9e9e] hover:text-white'
            }`}
          >
            {m === 'All' ? 'All Muscles' : m}
          </button>
        ))}
      </div>

      {/* Exercise List */}
      <div className="flex-1 px-4 mt-2">
        {loading ? (
          <div className="text-[#9e9e9e] text-sm text-center py-8">Loading exercises...</div>
        ) : filteredExercises.length === 0 ? (
          <div className="text-[#9e9e9e] text-sm text-center py-8">No exercises found</div>
        ) : (
          <div className="flex flex-col pb-6">
            {filteredExercises.map((ex) => (
              <div key={ex.id} className="flex items-center justify-between py-3 border-b border-[#1c1c1e] px-2">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#1c1c1e] rounded-full flex items-center justify-center text-xl">
                    {ex.icon || '🏋️'}
                  </div>
                  <div>
                    <h4 className="text-white font-medium">{ex.name}</h4>
                    <p className="text-[#9e9e9e] text-sm">{ex.muscle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}