import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Workout() {
  const [currentView, setCurrentView] = useState('main');
  const [openDropdownId, setOpenDropdownId] = useState(null);
  
  const [routines, setRoutines] = useState([]);
  const [masterExercises, setMasterExercises] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMuscle, setFilterMuscle] = useState('All');
  
  // State untuk Create/Edit Routine (Sekarang menyimpan Set, KG, Reps)
  const [editingRoutineId, setEditingRoutineId] = useState(null);
  const [routineName, setRoutineName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState([]); 
  const [loading, setLoading] = useState(false);

  const [newExName, setNewExName] = useState('');
  const [newExMuscle, setNewExMuscle] = useState('Chest');

  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    fetchRoutines();
    fetchMasterExercises();
  }, []);

  const fetchRoutines = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Tambahkan default_sets pada query relasi
    const { data, error } = await supabase
      .from('routines')
      .select(`id, name, created_at, routine_exercises ( default_sets, exercises ( id, name, muscle, icon ) )`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formattedData = data.map(routine => ({
        id: routine.id,
        name: routine.name,
        routineItems: routine.routine_exercises.map(re => ({
          exercise: re.exercises,
          sets: re.default_sets || [{ weight: '', reps: '' }]
        })),
        exerciseText: routine.routine_exercises.map(re => re.exercises.name).join(', ') || 'Belum ada gerakan'
      }));
      setRoutines(formattedData);
    }
  };

  const fetchMasterExercises = async () => {
    const { data, error } = await supabase.from('exercises').select('*').order('name', { ascending: true });
    if (!error) setMasterExercises(data);
  };

  // --- LOGIKA CREATE / EDIT RUTINITAS ---
  const handleEditRoutine = (routine) => {
    setEditingRoutineId(routine.id);
    setRoutineName(routine.name);
    setSelectedExercises(routine.routineItems);
    setCurrentView('create');
    setOpenDropdownId(null);
  };

  // Fungsi untuk input KG dan REPS di halaman Create Routine
  const handleUpdateRoutineSet = (exIndex, setIndex, field, value) => {
    const updated = [...selectedExercises];
    updated[exIndex].sets[setIndex][field] = value;
    setSelectedExercises(updated);
  };

  const handleAddRoutineSet = (exIndex) => {
    const updated = [...selectedExercises];
    updated[exIndex].sets.push({ weight: '', reps: '' });
    setSelectedExercises(updated);
  };

  const handleRemoveRoutineSet = (exIndex, setIndex) => {
    const updated = [...selectedExercises];
    updated[exIndex].sets.splice(setIndex, 1);
    setSelectedExercises(updated);
  };

  const handleRemoveExerciseFromRoutine = (exIndex) => {
    if (window.confirm("Hapus gerakan ini dari rutinitas?")) {
      const updated = [...selectedExercises];
      updated.splice(exIndex, 1);
      setSelectedExercises(updated);
    }
  };

  const handleSaveRoutine = async () => {
    if (!routineName.trim() || selectedExercises.length === 0) return alert("Isi judul rutinitas dan minimal satu gerakan!");
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Sesi login tidak valid.");

    let routineId = editingRoutineId;

    if (routineId) {
      await supabase.from('routines').update({ name: routineName }).eq('id', routineId);
      await supabase.from('routine_exercises').delete().eq('routine_id', routineId);
    } else {
      const { data: newRoutine, error: routineError } = await supabase
        .from('routines').insert([{ name: routineName, user_id: user.id }]).select();
      if (routineError) { setLoading(false); return alert(routineError.message); }
      routineId = newRoutine[0].id;
    }

    // Insert relasi gerakan beserta default_sets (JSON)
    const exercisesToInsert = selectedExercises.map((item, index) => ({
      routine_id: routineId, 
      exercise_id: item.exercise.id, 
      order_index: index,
      default_sets: item.sets
    }));
    await supabase.from('routine_exercises').insert(exercisesToInsert);

    setRoutineName(''); setSelectedExercises([]); setEditingRoutineId(null);
    setCurrentView('main'); fetchRoutines(); setLoading(false);
  };

  const handleDeleteRoutine = async (id) => {
    if (!window.confirm("Yakin ingin menghapus rutinitas ini?")) return;
    const { error } = await supabase.from('routines').delete().eq('id', id);
    if (error) alert("Gagal menghapus: " + error.message);
    else { setOpenDropdownId(null); fetchRoutines(); }
  };

  // --- LOGIKA ACTIVE WORKOUT ---
  const startRoutine = (routine) => {
    setActiveSession({
      name: routine.name,
      startTime: new Date().toISOString(),
      // Gunakan default sets dari database
      items: routine.routineItems.map(item => ({
        exercise: item.exercise,
        sets: item.sets.map(s => ({ weight: s.weight, reps: s.reps, done: false }))
      }))
    });
    setCurrentView('active_workout');
  };

  const startEmptyWorkout = () => {
    setActiveSession({
      name: 'Freestyle Workout',
      startTime: new Date().toISOString(),
      items: []
    });
    setCurrentView('active_workout');
  };

  const handleUpdateActiveSet = (itemIdx, setIdx, field, value) => {
    const updated = { ...activeSession };
    updated.items[itemIdx].sets[setIdx][field] = value;
    setActiveSession(updated);
  };

  const handleAddActiveSet = (itemIdx) => {
    const updated = { ...activeSession };
    updated.items[itemIdx].sets.push({ weight: '', reps: '', done: false });
    setActiveSession(updated);
  };

  const finishWorkout = async () => {
    if (!window.confirm("Selesaikan latihan dan simpan ke riwayat?")) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data: sessionData, error: sessionErr } = await supabase
      .from('workout_sessions')
      .insert([{ user_id: user.id, name: activeSession.name, start_time: activeSession.startTime, end_time: new Date().toISOString() }]).select();

    if (sessionErr) { setLoading(false); return alert(sessionErr.message); }
    const sessionId = sessionData[0].id;

    const logsToInsert = [];
    activeSession.items.forEach((item) => {
      item.sets.forEach((set, idx) => {
        if (set.done || (set.weight && set.reps)) {
          logsToInsert.push({
            session_id: sessionId, exercise_id: item.exercise.id, set_number: idx + 1,
            weight: parseFloat(set.weight) || 0, reps: parseInt(set.reps) || 0
          });
        }
      });
    });

    if (logsToInsert.length > 0) await supabase.from('workout_logs').insert(logsToInsert);
    setActiveSession(null); setCurrentView('main'); setLoading(false);
  };

  const handleCreateCustomExercise = async () => {
    if (!newExName.trim()) return alert("Nama gerakan tidak boleh kosong!");
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('exercises').insert([{ name: newExName, muscle: newExMuscle, icon: '✨', user_id: user.id }]).select();

    if (error) alert(error.message);
    else {
      setMasterExercises([...masterExercises, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
      setCurrentView('add_exercise'); setNewExName('');
    }
    setLoading(false);
  };

  const uniqueMuscles = ['All', ...new Set(masterExercises.map(ex => ex.muscle))];
  const filteredExercises = masterExercises.filter(ex => {
    return ex.name.toLowerCase().includes(searchQuery.toLowerCase()) && (filterMuscle === 'All' || ex.muscle === filterMuscle);
  });

  // ==========================================
  // VIEW 2: CREATE / EDIT ROUTINE FORM (UPDATED UI)
  // ==========================================
  if (currentView === 'create') {
    return (
      <div className="flex flex-col h-full bg-black animate-fade-in pb-20">
        <div className="flex justify-between items-center px-4 py-3 bg-[#151515] border-b border-[#333333] sticky top-0 z-10">
          <button onClick={() => { setCurrentView('main'); setEditingRoutineId(null); }} className="text-blue-500 text-sm font-medium">Cancel</button>
          <h2 className="text-white font-semibold">{editingRoutineId ? 'Edit Routine' : 'Create Routine'}</h2>
          <button onClick={handleSaveRoutine} disabled={loading} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold">{loading ? '...' : 'Save'}</button>
        </div>
        
        <div className="px-4 py-4">
          <input type="text" placeholder="Routine title" className="w-full bg-transparent text-white text-xl font-bold border-b border-[#333333] pb-3 outline-none" value={routineName} onChange={(e) => setRoutineName(e.target.value)} />
        </div>
        
        <div className="flex-1 px-4 mt-2 overflow-y-auto">
          {selectedExercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-10"><p className="text-[#9e9e9e]">No exercises added yet.</p></div>
          ) : (
            <div className="flex flex-col gap-6 mb-6">
              {selectedExercises.map((item, exIdx) => (
                <div key={exIdx} className="flex flex-col">
                  {/* Exercise Header */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl">{item.exercise.icon}</div>
                      <span className="text-blue-500 font-bold text-lg">{item.exercise.name}</span>
                    </div>
                    <i className="fas fa-ellipsis-v text-[#9e9e9e] p-2 cursor-pointer" onClick={() => handleRemoveExerciseFromRoutine(exIdx)}></i>
                  </div>
                  
                  {/* Notes & Rest Timer (UI Only) */}
                  <input type="text" placeholder="Add routine notes here" className="bg-transparent text-[#9e9e9e] text-sm w-full outline-none mb-3" />
                  <div className="flex items-center gap-2 text-blue-500 text-sm font-medium mb-4">
                    <i className="fas fa-stopwatch"></i> Rest Timer: OFF
                  </div>

                  {/* Sets Table */}
                  <div className="grid grid-cols-[50px_1fr_1fr_40px] text-[#9e9e9e] text-xs font-bold mb-2 items-center text-center">
                    <div>SET</div>
                    <div>KG</div>
                    <div>REPS</div>
                    <div></div>
                  </div>
                  
                  {item.sets.map((set, setIdx) => (
                    <div key={setIdx} className="grid grid-cols-[50px_1fr_1fr_40px] gap-3 items-center text-center mb-2">
                      <div className="text-white font-bold">{setIdx + 1}</div>
                      <input type="number" placeholder="-" className="bg-[#252525] text-white text-center py-2 rounded-lg outline-none font-semibold" value={set.weight} onChange={(e) => handleUpdateRoutineSet(exIdx, setIdx, 'weight', e.target.value)} />
                      <input type="number" placeholder="-" className="bg-[#252525] text-white text-center py-2 rounded-lg outline-none font-semibold" value={set.reps} onChange={(e) => handleUpdateRoutineSet(exIdx, setIdx, 'reps', e.target.value)} />
                      <i className="fas fa-times text-[#6b6b6b] p-2 cursor-pointer hover:text-red-500" onClick={() => handleRemoveRoutineSet(exIdx, setIdx)}></i>
                    </div>
                  ))}

                  <button onClick={() => handleAddRoutineSet(exIdx)} className="w-full bg-[#1c1c1e] text-white font-semibold py-3 rounded-xl mt-2 hover:bg-[#252525]">
                    + Add Set
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <button onClick={() => setCurrentView('add_exercise')} className="w-full bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 mt-4 mb-6">
            + Add exercise
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: ADD EXERCISE 
  // ==========================================
  if (currentView === 'add_exercise') {
    return (
      <div className="flex flex-col h-full bg-black animate-fade-in pb-20">
        <div className="flex justify-between items-center px-4 py-3 bg-[#151515] border-b border-[#333333]">
          <button onClick={() => setCurrentView('create')} className="text-blue-500 text-sm font-medium">Cancel</button>
          <h2 className="text-white font-semibold">Add Exercise</h2>
          <div className="w-10"></div>
        </div>
        <div className="px-4 pt-4 pb-2">
          <div className="bg-[#1c1c1e] flex items-center gap-3 px-3 py-2 rounded-xl">
            <i className="fas fa-search text-[#6b6b6b]"></i>
            <input type="text" placeholder="Search exercise" className="bg-transparent text-white w-full outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
        <div className="px-4 py-2 flex gap-3 overflow-x-auto no-scrollbar">
          <select value={filterMuscle} onChange={(e) => setFilterMuscle(e.target.value)} className="bg-[#1c1c1e] text-white py-2 px-3 rounded-xl text-sm font-medium outline-none">
            {uniqueMuscles.map(m => (<option key={m} value={m}>{m === 'All' ? 'All Muscles' : m}</option>))}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto px-4 mt-2">
          <h3 className="text-[#9e9e9e] text-sm font-medium mb-3">Exercises</h3>
          <div className="flex flex-col pb-6">
            {filteredExercises.map((ex) => (
              <div key={ex.id} 
                onClick={() => { 
                  setSelectedExercises([...selectedExercises, { exercise: ex, sets: [{ weight: '', reps: '' }] }]); 
                  setCurrentView('create'); 
                  setSearchQuery(''); 
                }} 
                className="flex items-center justify-between py-3 border-b border-[#1c1c1e] cursor-pointer hover:bg-[#1c1c1e] px-2"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl">{ex.icon}</div>
                  <div>
                    <h4 className="text-white font-medium">{ex.name}</h4>
                    <p className="text-[#9e9e9e] text-sm">{ex.muscle}</p>
                  </div>
                </div>
                <div className="text-blue-500 font-bold text-xl">+</div>
              </div>
            ))}
            <button onClick={() => setCurrentView('create_custom_exercise')} className="mt-6 flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#333333] rounded-xl hover:bg-[#1c1c1e]">
              <i className="fas fa-plus-circle text-blue-500 text-3xl mb-2"></i>
              <span className="text-white font-medium">Create Custom Exercise</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 4: CREATE CUSTOM EXERCISE FORM
  // ==========================================
  if (currentView === 'create_custom_exercise') {
    return (
      <div className="flex flex-col h-full bg-black animate-fade-in pb-20">
        <div className="flex justify-between items-center px-4 py-3 bg-[#151515] border-b border-[#333333]">
          <button onClick={() => setCurrentView('add_exercise')} className="text-blue-500 text-sm font-medium">Cancel</button>
          <h2 className="text-white font-semibold">Custom Exercise</h2>
          <button onClick={handleCreateCustomExercise} disabled={loading} className="text-blue-500 text-sm font-medium">Save</button>
        </div>
        <div className="p-4 flex flex-col gap-4">
          <div>
            <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-1 block">Exercise Name</label>
            <input type="text" placeholder="e.g. My Special Curls" className="w-full bg-[#1c1c1e] text-white p-3 rounded-lg outline-none" value={newExName} onChange={(e) => setNewExName(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-1 block">Target Muscle</label>
            <select className="w-full bg-[#1c1c1e] text-white p-3 rounded-lg outline-none" value={newExMuscle} onChange={(e) => setNewExMuscle(e.target.value)}>
              {uniqueMuscles.filter(m => m !== 'All').map(m => (<option key={m} value={m}>{m}</option>))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 5: ACTIVE WORKOUT
  // ==========================================
  if (currentView === 'active_workout' && activeSession) {
    return (
      <div className="flex flex-col h-full bg-black animate-fade-in pb-24">
        <div className="flex justify-between items-center px-4 py-4 bg-[#151515] border-b border-[#333333] sticky top-0 z-10">
          <button onClick={() => { if(window.confirm("Batalkan latihan? Data tidak akan disimpan.")) { setActiveSession(null); setCurrentView('main'); } }} className="text-red-500 text-sm font-medium">Cancel</button>
          <div className="text-center">
            <h2 className="text-white font-semibold leading-tight">{activeSession.name}</h2>
            <span className="text-blue-500 text-xs font-bold animate-pulse">● In Progress</span>
          </div>
          <button onClick={finishWorkout} disabled={loading} className="bg-blue-500 text-white px-3 py-1.5 rounded-md text-sm font-medium">{loading ? '...' : 'Finish'}</button>
        </div>

        <div className="flex-1 px-2 py-4 overflow-y-auto">
          {activeSession.items.length === 0 ? (
            <div className="text-center text-[#6b6b6b] mt-10 p-4">Belum ada gerakan. Latihan freestyle!</div>
          ) : (
            activeSession.items.map((item, itemIdx) => (
              <div key={itemIdx} className="mb-6 bg-[#151515] p-3 rounded-xl border border-[#333333]">
                <h3 className="text-blue-400 font-bold mb-3 flex items-center gap-2"><span>{item.exercise.icon}</span> {item.exercise.name}</h3>
                <div className="grid grid-cols-4 text-[#9e9e9e] text-xs font-bold text-center mb-2 px-2">
                  <div>SET</div><div>KG</div><div>REPS</div><div>DONE</div>
                </div>
                {item.sets.map((set, setIdx) => (
                  <div key={setIdx} className={`grid grid-cols-4 gap-2 items-center text-center mb-2 px-2 py-1 rounded-lg ${set.done ? 'bg-blue-500/10' : ''}`}>
                    <div className="text-[#9e9e9e] font-bold">{setIdx + 1}</div>
                    <input type="number" placeholder="0" className="bg-[#252525] text-white text-center py-1 rounded-md outline-none" value={set.weight} onChange={(e) => handleUpdateActiveSet(itemIdx, setIdx, 'weight', e.target.value)} />
                    <input type="number" placeholder="0" className="bg-[#252525] text-white text-center py-1 rounded-md outline-none" value={set.reps} onChange={(e) => handleUpdateActiveSet(itemIdx, setIdx, 'reps', e.target.value)} />
                    <button onClick={() => handleUpdateActiveSet(itemIdx, setIdx, 'done', !set.done)} className={`w-8 h-8 mx-auto rounded-md flex items-center justify-center transition-colors ${set.done ? 'bg-blue-500 text-white' : 'bg-[#333333] text-[#9e9e9e]'}`}><i className="fas fa-check"></i></button>
                  </div>
                ))}
                <button onClick={() => handleAddActiveSet(itemIdx)} className="w-full mt-2 py-1.5 text-sm text-[#9e9e9e] font-medium hover:text-white transition-colors">+ Add Set</button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 6: EXPLORE (Template)
  // ==========================================
  if (currentView === 'explore') {
    const templates = [
      { name: "Push Day Pro", desc: "Fokus Dada, Bahu Depan, dan Triceps." },
      { name: "Pull Day Pro", desc: "Fokus Punggung, Bahu Belakang, dan Biceps." }
    ];
    return (
      <div className="flex flex-col h-full bg-black animate-fade-in pb-20">
        <div className="flex justify-between items-center px-4 py-3 bg-[#151515] border-b border-[#333333]">
          <button onClick={() => setCurrentView('main')} className="text-blue-500 text-sm font-medium">Back</button>
          <h2 className="text-white font-semibold">Explore Routines</h2>
          <div className="w-10"></div>
        </div>
        <div className="p-4 flex flex-col gap-4">
          <p className="text-[#9e9e9e] text-sm">Pilih template di bawah ini untuk ditambahkan ke rutinitasmu.</p>
          {templates.map((tpl, i) => (
            <div key={i} className="bg-[#1c1c1e] p-4 rounded-xl border border-[#333333]">
              <h3 className="font-bold text-white mb-1">{tpl.name}</h3>
              <p className="text-sm text-[#9e9e9e] mb-4">{tpl.desc}</p>
              <button 
                onClick={() => { setRoutineName(tpl.name); setSelectedExercises([]); setCurrentView('create'); }}
                className="w-full bg-[#333333] hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                Use Template
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: MAIN WORKOUT (Dashboard)
  // ==========================================
  return (
    <div className="flex flex-col gap-6 pt-4 animate-fade-in bg-black min-h-full pb-20">
      <div className="flex justify-between items-center px-4">
        <h1 className="text-2xl font-bold text-white">Workout</h1>
      </div>

      <div className="px-4">
        <button onClick={startEmptyWorkout} className="w-full bg-[#1c1c1e] hover:bg-[#252525] text-white font-medium py-4 rounded-xl flex items-center justify-center gap-2">
          <i className="fas fa-plus text-lg"></i> Start Empty Workout
        </button>
      </div>

      <div className="px-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-white">Routines</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button onClick={() => { setRoutineName(''); setSelectedExercises([]); setEditingRoutineId(null); setCurrentView('create'); }} className="bg-[#1c1c1e] hover:bg-[#252525] text-white py-3 rounded-xl flex justify-center gap-2 font-medium">
            <i className="fas fa-clipboard-list"></i> New Routine
          </button>
          <button onClick={() => setCurrentView('explore')} className="bg-[#1c1c1e] hover:bg-[#252525] text-white py-3 rounded-xl flex justify-center gap-2 font-medium">
            <i className="fas fa-search"></i> Explore
          </button>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[#9e9e9e] text-sm mb-3">
            <i className="fas fa-caret-down"></i> My Routines ({routines.length})
          </div>

          <div className="flex flex-col gap-4">
            {routines.map((routine) => (
              <div key={routine.id} className="bg-[#1c1c1e] p-4 rounded-xl flex flex-col gap-3 border border-transparent hover:border-[#333333]">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-white uppercase">{routine.name}</h3>
                  <div className="relative">
                    <i className="fas fa-ellipsis-h text-[#6b6b6b] p-2 cursor-pointer hover:text-white" onClick={() => setOpenDropdownId(openDropdownId === routine.id ? null : routine.id)}></i>
                    {openDropdownId === routine.id && (
                      <div className="absolute right-0 mt-2 w-32 bg-[#252525] rounded-lg shadow-lg z-10 overflow-hidden border border-[#333333]">
                        <button onClick={() => handleEditRoutine(routine)} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[#333333] font-medium border-b border-[#333333]">Edit</button>
                        <button onClick={() => handleDeleteRoutine(routine.id)} className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-[#333333] font-medium">Delete</button>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-[#9e9e9e] line-clamp-2">{routine.exerciseText}</p>
                <button onClick={() => startRoutine(routine)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg mt-1 transition-colors">
                  Start Routine
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}