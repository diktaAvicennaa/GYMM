// src/components/ExerciseSearch.jsx
import { useState } from 'react';
import { searchExercises, getExercisesByMuscle } from '../services/muscleWiki';

const MUSCLE_GROUPS = [
  'All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 
  'Forearms', 'Abs', 'Quads', 'Hamstrings', 'Glutes', 'Calves'
];

export default function ExerciseSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMuscle, setSelectedMuscle] = useState('All');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim() && selectedMuscle === 'All') return;

    setLoading(true);
    setError(null);
    
    try {
      let data;
      if (query.trim()) {
        data = await searchExercises(query);
      } else if (selectedMuscle !== 'All') {
        data = await getExercisesByMuscle(selectedMuscle);
      }
      setResults(data?.exercises || data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMuscleFilter = async (muscle) => {
    setSelectedMuscle(muscle);
    setQuery('');
    setLoading(true);
    setError(null);

    try {
      const data = muscle === 'All' 
        ? [] 
        : await getExercisesByMuscle(muscle);
      setResults(data?.exercises || data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#9e9e9e] text-sm"></i>
          <input
            type="text"
            placeholder="Cari exercise..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-gym-surface border border-[#333333] text-[#f0f0f0] placeholder-[#9e9e9e] focus:outline-none focus:border-purple-600 transition-colors"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button 
          type="submit" 
          className="px-5 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
          disabled={loading}
        >
          {loading ? <span className="loading loading-spinner loading-sm"></span> : 'Cari'}
        </button>
      </form>

      {/* Muscle Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {MUSCLE_GROUPS.map((muscle) => (
          <button
            key={muscle}
            onClick={() => handleMuscleFilter(muscle)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedMuscle === muscle
                ? 'bg-purple-600 text-white'
                : 'bg-gym-surface text-[#9e9e9e] hover:bg-gym-card hover:text-[#f0f0f0]'
            }`}
          >
            {muscle}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </div>
      )}

      {/* Results */}
      <div className="space-y-3 pb-20">
        {results.map((ex) => (
          <div key={ex.id} className="p-4 rounded-xl bg-gym-surface border border-[#333333] hover:border-purple-600/50 transition-colors">
            <div className="flex gap-4">
              {ex.image && (
                <img 
                  src={ex.image} 
                  alt={ex.name} 
                  className="w-20 h-20 rounded-lg object-cover bg-gym-card shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[#f0f0f0] truncate">{ex.name}</h3>
                <p className="text-sm text-purple-400 mt-1">{ex.muscle}</p>
                {ex.difficulty && (
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                    ex.difficulty === 'Beginner' ? 'bg-green-500/20 text-green-400' :
                    ex.difficulty === 'Intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {ex.difficulty}
                  </span>
                )}
              </div>
              <button className="shrink-0 w-10 h-10 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center hover:bg-purple-600 hover:text-white transition-colors">
                <i className="fas fa-plus"></i>
              </button>
            </div>
          </div>
        ))}

        {results.length === 0 && !loading && (
          <div className="text-center py-12 text-[#9e9e9e]">
            <i className="fas fa-dumbbell text-4xl mb-3 opacity-30"></i>
            <p>Cari exercise atau pilih muscle group</p>
          </div>
        )}
      </div>
    </div>
  );
}