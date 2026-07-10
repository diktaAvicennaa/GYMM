import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

// ============================================================
// ICON COMPONENT
// ============================================================
function ExerciseIcon({ image_url, name }) {
  const isUrl = image_url && (image_url.startsWith('http') || image_url.startsWith('https'));

  return (
    <div className="w-12 h-12 bg-[#1c1c1e] rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-[#333333]">
      {isUrl ? (
        <img 
          src={image_url}
          alt={name} 
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML = `<div class="text-white text-xl font-bold">${name ? name.charAt(0).toUpperCase() : '?'}</div>`;
          }}
        />
      ) : (
        <div className="text-white text-xl font-bold">{name ? name.charAt(0).toUpperCase() : '?'}</div>
      )}
    </div>
  );
}

// ============================================================
// REST TIMER COMPONENT
// ============================================================
function RestTimer({ seconds, onComplete, onSkip }) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    setTimeLeft(seconds);
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [seconds]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = ((seconds - timeLeft) / seconds) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-[#1c1c1e] rounded-2xl p-6 w-full max-w-sm border border-[#333333]">
        <h3 className="text-white text-center font-bold text-lg mb-4">⏱️ Rest Time</h3>

        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#333333" strokeWidth="6" />
            <circle 
              cx="50" cy="50" r="45" fill="none" stroke="#3b82f6" strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white text-3xl font-bold">{formatTime(timeLeft)}</span>
          </div>
        </div>

        <p className="text-[#9e9e9e] text-center text-sm mb-4">Recover before next set</p>

        <div className="flex gap-3">
          <button 
            onClick={onSkip}
            className="flex-1 bg-[#333333] hover:bg-[#444444] text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Skip
          </button>
          <button 
            onClick={() => setTimeLeft(seconds)}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            +{seconds}s
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DAY BADGE COMPONENT
// ============================================================
function DayBadge({ day, active, onClick }) {
  const dayLabels = { Mon: 'M', Tue: 'T', Wed: 'W', Thu: 'T', Fri: 'F', Sat: 'S', Sun: 'S' };
  return (
    <button
      onClick={onClick}
      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
        active 
          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
          : 'bg-[#1c1c1e] text-[#9e9e9e] border border-[#333333] hover:bg-[#252525]'
      }`}
    >
      {dayLabels[day]}
    </button>
  );
}

// ============================================================
// MAIN WORKOUT COMPONENT
// ============================================================
export default function Workout() {
  const [currentView, setCurrentView] = useState('main');
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const [routines, setRoutines] = useState([]);
  const [masterExercises, setMasterExercises] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMuscle, setFilterMuscle] = useState('All');

  // Routine form state
  const [editingRoutineId, setEditingRoutineId] = useState(null);
  const [routineName, setRoutineName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [routineScheduleDays, setRoutineScheduleDays] = useState([]);
  const [routineRestSeconds, setRoutineRestSeconds] = useState(90);
  const [loading, setLoading] = useState(false);

  // Custom exercise state
  const [newExName, setNewExName] = useState('');
  const [newExMuscle, setNewExMuscle] = useState('Chest');
  const [newExImageUrl, setNewExImageUrl] = useState('');

  // Active workout state
  const [activeSession, setActiveSession] = useState(null);
  const [activeWorkoutTimer, setActiveWorkoutTimer] = useState(0);
  const [restTimer, setRestTimer] = useState(null); // { seconds, onComplete }
  const workoutTimerRef = useRef(null);

  // Day options
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    fetchRoutines();
    fetchMasterExercises();
  }, []);

  // Active workout timer
  useEffect(() => {
    if (activeSession && currentView === 'active_workout') {
      workoutTimerRef.current = setInterval(() => {
        setActiveWorkoutTimer(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(workoutTimerRef.current);
      setActiveWorkoutTimer(0);
    }
    return () => clearInterval(workoutTimerRef.current);
  }, [activeSession, currentView]);

  const formatWorkoutTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const fetchRoutines = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('routines')
      .select(`
        id, 
        name, 
        created_at,
        schedule_days,
        rest_seconds,
        routine_exercises ( 
          default_sets,
          rest_seconds,
          exercises ( id, name, muscle, image_url ) 
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Supabase Fetch Error:", error);
      return;
    }

    if (data) {
      const formattedData = data.map(routine => ({
        id: routine.id,
        name: routine.name,
        scheduleDays: routine.schedule_days || [],
        defaultRestSeconds: routine.rest_seconds || 90,
        routineItems: (routine.routine_exercises || []).map(re => ({
          exercise: re.exercises || { id: 'unknown', name: 'Unknown', image_url: '', muscle: 'Unknown' },
          sets: re.default_sets && Array.isArray(re.default_sets) ? re.default_sets : [{ weight: '', reps: '' }],
          restSeconds: re.rest_seconds
        })),
        exerciseText: (routine.routine_exercises || [])
          .filter(re => re.exercises)
          .map(re => re.exercises.name)
          .join(', ') || 'Belum ada gerakan'
      }));
      setRoutines(formattedData);
    }
  };

  const fetchMasterExercises = async () => {
    const { data, error } = await supabase.from('exercises').select('*').order('name', { ascending: true });
    if (!error) setMasterExercises(data);
  };

  const handleEditRoutine = (routine) => {
    setEditingRoutineId(routine.id);
    setRoutineName(routine.name);
    setSelectedExercises(routine.routineItems);
    setRoutineScheduleDays(routine.scheduleDays || []);
    setRoutineRestSeconds(routine.defaultRestSeconds || 90);
    setCurrentView('create');
    setOpenDropdownId(null);
  };

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

  const handleUpdateExerciseRest = (exIndex, seconds) => {
    const updated = [...selectedExercises];
    updated[exIndex].restSeconds = seconds;
    setSelectedExercises(updated);
  };

  const sanitizeDecimalInput = (value) => value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
  const sanitizeIntegerInput = (value) => value.replace(/[^0-9]/g, '');

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

  const toggleScheduleDay = (day) => {
    setRoutineScheduleDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSaveRoutine = async () => {
    if (!routineName.trim() || selectedExercises.length === 0) return alert("Isi judul rutinitas dan minimal satu gerakan!");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Sesi login tidak valid.");

    let routineId = editingRoutineId;

    if (routineId) {
      await supabase.from('routines').update({ 
        name: routineName,
        schedule_days: routineScheduleDays,
        rest_seconds: routineRestSeconds
      }).eq('id', routineId);
      await supabase.from('routine_exercises').delete().eq('routine_id', routineId);
    } else {
      const { data: newRoutine, error: routineError } = await supabase
        .from('routines').insert([{ 
          name: routineName, 
          user_id: user.id,
          schedule_days: routineScheduleDays,
          rest_seconds: routineRestSeconds
        }]).select();
      if (routineError) { setLoading(false); return alert(routineError.message); }
      routineId = newRoutine[0].id;
    }

    const exercisesToInsert = selectedExercises.map((item, index) => ({
      routine_id: routineId, 
      exercise_id: item.exercise.id, 
      order_index: index,
      default_sets: item.sets,
      rest_seconds: item.restSeconds || null
    }));
    await supabase.from('routine_exercises').insert(exercisesToInsert);

    setRoutineName(''); 
    setSelectedExercises([]); 
    setEditingRoutineId(null);
    setRoutineScheduleDays([]);
    setRoutineRestSeconds(90);
    setCurrentView('main'); 
    fetchRoutines(); 
    setLoading(false);
  };

  const handleDeleteRoutine = async (id) => {
    if (!window.confirm("Yakin ingin menghapus rutinitas ini?")) return;
    const { error } = await supabase.from('routines').delete().eq('id', id);
    if (error) alert("Gagal menghapus: " + error.message);
    else { setOpenDropdownId(null); fetchRoutines(); }
  };

  const startRoutine = (routine) => {
    setActiveSession({
      name: routine.name,
      startTime: new Date().toISOString(),
      items: routine.routineItems.map(item => ({
        exercise: item.exercise,
        sets: item.sets.map(s => ({ weight: s.weight, reps: s.reps, done: false })),
        restSeconds: item.restSeconds || routine.defaultRestSeconds || 90
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

  const handleSetDone = (itemIdx, setIdx) => {
    const updated = { ...activeSession };
    const wasDone = updated.items[itemIdx].sets[setIdx].done;
    updated.items[itemIdx].sets[setIdx].done = !wasDone;
    setActiveSession(updated);

    // Trigger rest timer when marking done (not when unmarking)
    if (!wasDone) {
      const restSec = updated.items[itemIdx].restSeconds || 90;
      setRestTimer({
        seconds: restSec,
        onComplete: () => setRestTimer(null)
      });
    }
  };

  const handleAddExerciseToActiveWorkout = (exercise) => {
    const updated = { ...activeSession };
    updated.items.push({
      exercise: exercise,
      sets: [{ weight: '', reps: '', done: false }],
      restSeconds: 90
    });
    setActiveSession(updated);
    setCurrentView('active_workout');
    setSearchQuery('');
    setFilterMuscle('All');
  };

  const finishWorkout = async () => {
    if (!window.confirm("Selesaikan latihan dan simpan ke riwayat?")) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data: sessionData, error: sessionErr } = await supabase
      .from('workout_sessions')
      .insert([{ 
        user_id: user.id, 
        name: activeSession.name, 
        start_time: activeSession.startTime, 
        end_time: new Date().toISOString() 
      }]).select();

    if (sessionErr) { setLoading(false); return alert(sessionErr.message); }
    const sessionId = sessionData[0].id;

    const logsToInsert = [];
    activeSession.items.forEach((item) => {
      item.sets.forEach((set, idx) => {
        if (set.done || (set.weight && set.reps)) {
          logsToInsert.push({
            session_id: sessionId, 
            exercise_id: item.exercise.id, 
            set_number: idx + 1,
            weight: parseFloat(set.weight) || 0, 
            reps: parseInt(set.reps) || 0
          });
        }
      });
    });

    if (logsToInsert.length > 0) await supabase.from('workout_logs').insert(logsToInsert);
    setActiveSession(null); 
    setCurrentView('main'); 
    setLoading(false);
    setActiveWorkoutTimer(0);
  };

  const handleCreateCustomExercise = async () => {
    if (!newExName.trim()) return alert("Nama gerakan tidak boleh kosong!");
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('exercises')
      .insert([{ 
        name: newExName, 
        muscle: newExMuscle, 
        image_url: newExImageUrl.trim(),
        user_id: user.id 
      }])
      .select();
    if (error) alert(error.message);
    else {
      setMasterExercises([...masterExercises, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
      setCurrentView('add_exercise'); 
      setNewExName('');
      setNewExImageUrl('');
    }
    setLoading(false);
  };

  const uniqueMuscles = ['All', ...new Set(masterExercises.map(ex => ex.muscle))];
  const filteredExercises = masterExercises.filter(ex => {
    return ex.name.toLowerCase().includes(searchQuery.toLowerCase()) && (filterMuscle === 'All' || ex.muscle === filterMuscle);
  });

  // ============================================================
  // VIEW: CREATE / EDIT ROUTINE
  // ============================================================
  if (currentView === 'create') {
    return (
      <div className="flex flex-col h-full bg-black animate-fade-in pb-20">
        <div className="flex justify-between items-center px-4 py-3 bg-[#1c1c1e] border-b border-[#333333] sticky top-0 z-10">
          <button onClick={() => { setCurrentView('main'); setEditingRoutineId(null); }} className="text-blue-500 text-sm font-medium">Cancel</button>
          <h2 className="text-white font-semibold">{editingRoutineId ? 'Edit Routine' : 'Create Routine'}</h2>
          <button onClick={handleSaveRoutine} disabled={loading} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-60">{loading ? '...' : 'Save'}</button>
        </div>

        <div className="flex-1 px-4 py-4 overflow-y-auto">
          {/* Routine Name */}
          <div className="rounded-2xl border border-[#333333] bg-[#1c1c1e] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.25)] mb-4">
            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#9e9e9e] mb-2">Routine title</label>
            <input
              type="text"
              placeholder="e.g. Push Day"
              className="w-full bg-black text-white text-base font-semibold rounded-xl px-4 py-3 outline-none border border-transparent focus:border-blue-500"
              value={routineName}
              onChange={(e) => setRoutineName(e.target.value)}
            />
          </div>

          {/* Schedule Days */}
          <div className="rounded-2xl border border-[#333333] bg-[#1c1c1e] p-4 mb-4">
            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#9e9e9e] mb-3">Schedule Days</label>
            <div className="flex justify-between gap-1">
              {DAYS.map(day => (
                <DayBadge 
                  key={day} 
                  day={day} 
                  active={routineScheduleDays.includes(day)} 
                  onClick={() => toggleScheduleDay(day)}
                />
              ))}
            </div>
            {routineScheduleDays.length > 0 && (
              <p className="text-blue-400 text-xs mt-2">Scheduled: {routineScheduleDays.join(', ')}</p>
            )}
          </div>

          {/* Default Rest Timer */}
          <div className="rounded-2xl border border-[#333333] bg-[#1c1c1e] p-4 mb-4">
            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#9e9e9e] mb-2">Default Rest Timer</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="15"
                max="300"
                step="15"
                value={routineRestSeconds}
                onChange={(e) => setRoutineRestSeconds(Number(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-white font-bold w-16 text-right">{routineRestSeconds}s</span>
            </div>
            <div className="flex justify-between text-[#6b6b6b] text-xs mt-1">
              <span>15s</span>
              <span>5min</span>
            </div>
          </div>

          {/* Selected Exercises */}
          {selectedExercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-6 rounded-2xl border border-dashed border-[#333333] bg-[#1c1c1e] px-6 py-10 text-center mb-4">
              <p className="text-white font-medium">No exercises added yet.</p>
              <p className="text-[#9e9e9e] text-sm mt-1">Tambah gerakan dulu, lalu isi set, kg, dan reps-nya.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 mb-6">
              {selectedExercises.map((item, exIdx) => (
                <div key={exIdx} className="flex flex-col rounded-2xl border border-[#333333] bg-[#1c1c1e] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
                  <div className="flex justify-between items-start gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <ExerciseIcon image_url={item.exercise.image_url} name={item.exercise.name} />
                      <div>
                        <span className="block text-white font-bold text-lg leading-tight">{item.exercise.name}</span>
                        <span className="text-[#9e9e9e] text-sm">{item.exercise.muscle}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-[#9e9e9e] p-2 rounded-lg hover:bg-black hover:text-red-500 transition-colors"
                      onClick={() => handleRemoveExerciseFromRoutine(exIdx)}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>

                  {/* Per-exercise rest timer override */}
                  <div className="mb-4">
                    <label className="text-[#9e9e9e] text-xs mb-1 block">Rest: {item.restSeconds || routineRestSeconds}s</label>
                    <input
                      type="range"
                      min="15"
                      max="300"
                      step="15"
                      value={item.restSeconds || routineRestSeconds}
                      onChange={(e) => handleUpdateExerciseRest(exIdx, Number(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  <input type="text" placeholder="Add routine notes here" className="bg-black text-white text-sm w-full outline-none mb-4 px-4 py-3 rounded-xl border border-[#333333] placeholder-[#6b6b6b]" />

                  <div className="grid grid-cols-[50px_1fr_1fr_40px] text-[#9e9e9e] text-xs font-bold mb-2 items-center text-center uppercase tracking-[0.12em]">
                    <div>SET</div>
                    <div>KG</div>
                    <div>REPS</div>
                    <div></div>
                  </div>

                  {item.sets.map((set, setIdx) => (
                    <div key={setIdx} className="grid grid-cols-[50px_1fr_1fr_40px] gap-3 items-center text-center mb-2">
                      <div className="text-white font-bold">{setIdx + 1}</div>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        className="bg-black border border-[#333333] text-white text-center h-12 rounded-xl outline-none font-semibold focus:border-blue-500"
                        value={set.weight}
                        onChange={(e) => handleUpdateRoutineSet(exIdx, setIdx, 'weight', sanitizeDecimalInput(e.target.value))}
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        className="bg-black border border-[#333333] text-white text-center h-12 rounded-xl outline-none font-semibold focus:border-blue-500"
                        value={set.reps}
                        onChange={(e) => handleUpdateRoutineSet(exIdx, setIdx, 'reps', sanitizeIntegerInput(e.target.value))}
                      />
                      <button
                        type="button"
                        className="text-[#6b6b6b] p-2 rounded-lg hover:bg-black hover:text-red-500 transition-colors"
                        onClick={() => handleRemoveRoutineSet(exIdx, setIdx)}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}

                  <button onClick={() => handleAddRoutineSet(exIdx)} className="w-full bg-black text-white font-semibold py-3 rounded-xl mt-3 hover:bg-[#1c1c1e] border border-[#333333] transition-colors">
                    + Add Set
                  </button>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => setCurrentView('add_exercise')} className="w-full bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 mb-6">
            + Add exercise
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // VIEW: ADD EXERCISE (for Create Routine)
  // ============================================================
  if (currentView === 'add_exercise') {
    return (
      <div className="flex flex-col h-full bg-black animate-fade-in pb-20">
        <div className="flex justify-between items-center px-4 py-3 bg-[#1c1c1e] border-b border-[#333333]">
          <button onClick={() => setCurrentView('create')} className="text-blue-500 text-sm font-medium">Cancel</button>
          <h2 className="text-white font-semibold">Add Exercise</h2>
          <div className="w-10"></div>
        </div>
        <div className="px-4 pt-4 pb-2">
          <div className="bg-black flex items-center gap-3 px-3 py-2 rounded-xl border border-[#333333]">
            <i className="fas fa-search text-[#6b6b6b]"></i>
            <input type="text" placeholder="Search exercise" className="bg-transparent text-white w-full outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
        <div className="px-4 py-2 flex gap-3 overflow-x-auto no-scrollbar">
          <select value={filterMuscle} onChange={(e) => setFilterMuscle(e.target.value)} className="bg-black text-white py-2 px-3 rounded-xl text-sm font-medium outline-none border border-[#333333]">
            {uniqueMuscles.map(m => (<option key={m} value={m}>{m === 'All' ? 'All Muscles' : m}</option>))}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto px-4 mt-2">
          <h3 className="text-[#9e9e9e] text-sm font-medium mb-3">Exercises</h3>
          <div className="flex flex-col pb-6">
            {filteredExercises.map((ex) => (
              <div key={ex.id} 
                onClick={() => { 
                  setSelectedExercises([...selectedExercises, { exercise: ex, sets: [{ weight: '', reps: '' }], restSeconds: routineRestSeconds }]); 
                  setCurrentView('create'); 
                  setSearchQuery(''); 
                }} 
                className="flex items-center justify-between py-3 border-b border-[#1c1c1e] cursor-pointer hover:bg-[#1c1c1e] px-2 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <ExerciseIcon image_url={ex.image_url} name={ex.name} />
                  <div>
                    <h4 className="text-white font-medium">{ex.name}</h4>
                    <p className="text-[#9e9e9e] text-sm">{ex.muscle}</p>
                  </div>
                </div>
                <div className="text-blue-500 font-bold text-xl">+</div>
              </div>
            ))}
            <button onClick={() => setCurrentView('create_custom_exercise')} className="mt-6 flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#333333] rounded-xl hover:bg-[#1c1c1e] transition-colors">
              <i className="fas fa-plus-circle text-blue-500 text-3xl mb-2"></i>
              <span className="text-white font-medium">Create Custom Exercise</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // VIEW: ADD EXERCISE TO ACTIVE WORKOUT
  // ============================================================
  if (currentView === 'add_exercise_active') {
    return (
      <div className="flex flex-col h-full bg-black animate-fade-in pb-20">
        <div className="flex justify-between items-center px-4 py-3 bg-[#1c1c1e] border-b border-[#333333]">
          <button onClick={() => { setCurrentView('active_workout'); setSearchQuery(''); setFilterMuscle('All'); }} className="text-blue-500 text-sm font-medium">Cancel</button>
          <h2 className="text-white font-semibold">Add Exercise</h2>
          <div className="w-10"></div>
        </div>
        <div className="px-4 pt-4 pb-2">
          <div className="bg-black flex items-center gap-3 px-3 py-2 rounded-xl border border-[#333333]">
            <i className="fas fa-search text-[#6b6b6b]"></i>
            <input type="text" placeholder="Search exercise" className="bg-transparent text-white w-full outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
        <div className="px-4 py-2 flex gap-3 overflow-x-auto no-scrollbar">
          <select value={filterMuscle} onChange={(e) => setFilterMuscle(e.target.value)} className="bg-black text-white py-2 px-3 rounded-xl text-sm font-medium outline-none border border-[#333333]">
            {uniqueMuscles.map(m => (<option key={m} value={m}>{m === 'All' ? 'All Muscles' : m}</option>))}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto px-4 mt-2">
          <h3 className="text-[#9e9e9e] text-sm font-medium mb-3">Tap to add to current workout</h3>
          <div className="flex flex-col pb-6">
            {filteredExercises.map((ex) => (
              <div key={ex.id} 
                onClick={() => handleAddExerciseToActiveWorkout(ex)} 
                className="flex items-center justify-between py-3 border-b border-[#1c1c1e] cursor-pointer hover:bg-[#1c1c1e] px-2 active:bg-blue-500/20 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <ExerciseIcon image_url={ex.image_url} name={ex.name} />
                  <div>
                    <h4 className="text-white font-medium">{ex.name}</h4>
                    <p className="text-[#9e9e9e] text-sm">{ex.muscle}</p>
                  </div>
                </div>
                <div className="text-blue-500 font-bold text-xl">+</div>
              </div>
            ))}
            <button onClick={() => setCurrentView('create_custom_exercise')} className="mt-6 flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#333333] rounded-xl hover:bg-[#1c1c1e] transition-colors">
              <i className="fas fa-plus-circle text-blue-500 text-3xl mb-2"></i>
              <span className="text-white font-medium">Create Custom Exercise</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // VIEW: CREATE CUSTOM EXERCISE
  // ============================================================
  if (currentView === 'create_custom_exercise') {
    return (
      <div className="flex flex-col h-full bg-black animate-fade-in pb-20">
        <div className="flex justify-between items-center px-4 py-3 bg-[#1c1c1e] border-b border-[#333333]">
          <button onClick={() => setCurrentView('add_exercise')} className="text-blue-500 text-sm font-medium">Cancel</button>
          <h2 className="text-white font-semibold">Custom Exercise</h2>
          <button onClick={handleCreateCustomExercise} disabled={loading} className="text-blue-500 text-sm font-medium disabled:opacity-60">Save</button>
        </div>
        <div className="p-4 flex flex-col gap-4">
          <div>
            <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-2 block tracking-[0.18em]">Exercise Name</label>
            <input type="text" placeholder="e.g. My Special Curls" className="w-full bg-black text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500" value={newExName} onChange={(e) => setNewExName(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-2 block tracking-[0.18em]">Target Muscle</label>
            <select className="w-full bg-black text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500" value={newExMuscle} onChange={(e) => setNewExMuscle(e.target.value)}>
              {uniqueMuscles.filter(m => m !== 'All').map(m => (<option key={m} value={m}>{m}</option>))}
            </select>
          </div>
          <div>
            <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-2 block tracking-[0.18em]">Image URL (Optional)</label>
            <input 
              type="url" 
              placeholder="https://example.com/image.jpg" 
              className="w-full bg-black text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500" 
              value={newExImageUrl} 
              onChange={(e) => setNewExImageUrl(e.target.value)} 
            />
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // VIEW: ACTIVE WORKOUT
  // ============================================================
  if (currentView === 'active_workout' && activeSession) {
    return (
      <div className="flex flex-col h-full bg-black animate-fade-in pb-24">
        {/* Rest Timer Overlay */}
        {restTimer && (
          <RestTimer 
            seconds={restTimer.seconds} 
            onComplete={restTimer.onComplete}
            onSkip={() => setRestTimer(null)}
          />
        )}

        <div className="flex justify-between items-center px-4 py-4 bg-[#1c1c1e] border-b border-[#333333] sticky top-0 z-10">
          <button onClick={() => { if(window.confirm("Batalkan latihan? Data tidak akan disimpan.")) { setActiveSession(null); setCurrentView('main'); setActiveWorkoutTimer(0); } }} className="text-red-500 text-sm font-medium">Cancel</button>
          <div className="text-center">
            <h2 className="text-white font-semibold leading-tight">{activeSession.name}</h2>
            <span className="text-blue-500 text-xs font-bold">⏱️ {formatWorkoutTime(activeWorkoutTimer)}</span>
          </div>
          <button onClick={finishWorkout} disabled={loading} className="bg-blue-500 text-white px-3 py-1.5 rounded-md text-sm font-medium">{loading ? '...' : 'Finish'}</button>
        </div>

        <div className="flex-1 px-2 py-4 overflow-y-auto">
          {activeSession.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-10 p-4">
              <div className="text-[#6b6b6b] text-center mb-6">
                <i className="fas fa-dumbbell text-4xl mb-3 opacity-30"></i>
                <p className="text-lg font-medium text-white mb-1">Workout is empty</p>
                <p className="text-sm">Tambah gerakan untuk mulai latihan</p>
              </div>
              <button 
                onClick={() => setCurrentView('add_exercise_active')} 
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-colors flex items-center gap-2"
              >
                <i className="fas fa-plus"></i> Add Exercise
              </button>
            </div>
          ) : (
            <>
              {activeSession.items.map((item, itemIdx) => (
                <div key={itemIdx} className="mb-6 bg-[#1c1c1e] p-3 rounded-xl border border-[#333333]">
                  <div className="flex items-center gap-2 mb-3">
                    <ExerciseIcon image_url={item.exercise.image_url} name={item.exercise.name} />
                    <div>
                      <h3 className="text-blue-400 font-bold">{item.exercise.name}</h3>
                      <span className="text-[#9e9e9e] text-xs">Rest: {item.restSeconds || 90}s</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 text-[#9e9e9e] text-xs font-bold text-center mb-2 px-2">
                    <div>SET</div><div>KG</div><div>REPS</div><div>DONE</div>
                  </div>
                  {item.sets.map((set, setIdx) => (
                    <div key={setIdx} className={`grid grid-cols-4 gap-2 items-center text-center mb-2 px-2 py-1 rounded-lg ${set.done ? 'bg-blue-500/10' : ''}`}>
                      <div className="text-[#9e9e9e] font-bold">{setIdx + 1}</div>
                      <input type="text" inputMode="decimal" placeholder="0" className="bg-black text-white text-center py-1 rounded-md outline-none border border-[#333333]" value={set.weight} onChange={(e) => handleUpdateActiveSet(itemIdx, setIdx, 'weight', sanitizeDecimalInput(e.target.value))} />
                      <input type="text" inputMode="numeric" placeholder="0" className="bg-black text-white text-center py-1 rounded-md outline-none border border-[#333333]" value={set.reps} onChange={(e) => handleUpdateActiveSet(itemIdx, setIdx, 'reps', sanitizeIntegerInput(e.target.value))} />
                      <button onClick={() => handleSetDone(itemIdx, setIdx)} className={`w-8 h-8 mx-auto rounded-md flex items-center justify-center transition-colors ${set.done ? 'bg-blue-500 text-white' : 'bg-[#333333] text-[#9e9e9e]'}`}><i className="fas fa-check"></i></button>
                    </div>
                  ))}
                  <button onClick={() => handleAddActiveSet(itemIdx)} className="w-full mt-2 py-1.5 text-sm text-[#9e9e9e] font-medium hover:text-white transition-colors">+ Add Set</button>
                </div>
              ))}

              <button 
                onClick={() => setCurrentView('add_exercise_active')} 
                className="w-full bg-black hover:bg-[#1c1c1e] text-white font-bold py-4 rounded-xl border border-dashed border-[#333333] transition-colors flex items-center justify-center gap-2 mt-4 mb-6"
              >
                <i className="fas fa-plus"></i> Add Another Exercise
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // VIEW: EXPLORE TEMPLATES
  // ============================================================
  if (currentView === 'explore') {
    const templates = [
      { name: "Push Day Pro", desc: "Fokus Dada, Bahu Depan, dan Triceps.", scheduleDays: ['Mon', 'Thu'], restSeconds: 90 },
      { name: "Pull Day Pro", desc: "Fokus Punggung, Bahu Belakang, dan Biceps.", scheduleDays: ['Tue', 'Fri'], restSeconds: 90 },
      { name: "Leg Day Pro", desc: "Fokus Quads, Hamstrings, dan Glutes.", scheduleDays: ['Wed', 'Sat'], restSeconds: 120 }
    ];
    return (
      <div className="flex flex-col h-full bg-black animate-fade-in pb-20">
        <div className="flex justify-between items-center px-4 py-3 bg-[#1c1c1e] border-b border-[#333333]">
          <button onClick={() => setCurrentView('main')} className="text-blue-500 text-sm font-medium">Back</button>
          <h2 className="text-white font-semibold">Explore Routines</h2>
          <div className="w-10"></div>
        </div>
        <div className="p-4 flex flex-col gap-4">
          <p className="text-[#9e9e9e] text-sm">Pilih template di bawah ini untuk ditambahkan ke rutinitasmu.</p>
          {templates.map((tpl, i) => (
            <div key={i} className="bg-[#1c1c1e] p-4 rounded-xl border border-[#333333]">
              <h3 className="font-bold text-white mb-1">{tpl.name}</h3>
              <p className="text-sm text-[#9e9e9e] mb-2">{tpl.desc}</p>
              <div className="flex gap-1 mb-3">
                {tpl.scheduleDays.map(d => (
                  <span key={d} className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full">{d}</span>
                ))}
              </div>
              <button 
                onClick={() => { 
                  setRoutineName(tpl.name); 
                  setSelectedExercises([]); 
                  setRoutineScheduleDays(tpl.scheduleDays);
                  setRoutineRestSeconds(tpl.restSeconds);
                  setCurrentView('create'); 
                }}
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

  // ============================================================
  // VIEW: MAIN DASHBOARD
  // ============================================================
  return (
    <div className="flex flex-col gap-6 pt-4 animate-fade-in bg-black min-h-full pb-20">
      <div className="flex justify-between items-center px-4">
        <h1 className="text-2xl font-bold text-white">Workout</h1>
      </div>

      <div className="px-4">
        <button onClick={startEmptyWorkout} className="w-full bg-[#1c1c1e] hover:bg-black text-white font-medium py-4 rounded-xl flex items-center justify-center gap-2 border border-[#333333] transition-colors">
          <i className="fas fa-plus text-lg"></i> Start Empty Workout
        </button>
      </div>

      <div className="px-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-white">Routines</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button onClick={() => { 
            setRoutineName(''); 
            setSelectedExercises([]); 
            setEditingRoutineId(null);
            setRoutineScheduleDays([]);
            setRoutineRestSeconds(90);
            setCurrentView('create'); 
          }} className="bg-[#1c1c1e] hover:bg-black text-white py-3 rounded-xl flex justify-center gap-2 font-medium border border-[#333333] transition-colors">
            <i className="fas fa-clipboard-list"></i> New Routine
          </button>
          <button onClick={() => setCurrentView('explore')} className="bg-[#1c1c1e] hover:bg-black text-white py-3 rounded-xl flex justify-center gap-2 font-medium border border-[#333333] transition-colors">
            <i className="fas fa-search"></i> Explore
          </button>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[#9e9e9e] text-sm mb-3">
            <i className="fas fa-caret-down"></i> My Routines ({routines.length})
          </div>

          <div className="flex flex-col gap-4">
            {routines.map((routine) => (
              <div key={routine.id} className="bg-[#1c1c1e] p-4 rounded-xl flex flex-col gap-3 border border-transparent hover:border-[#333333] transition-colors">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-white uppercase">{routine.name}</h3>
                    {routine.scheduleDays.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {routine.scheduleDays.map(d => (
                          <span key={d} className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded-full font-medium">{d}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <i className="fas fa-ellipsis-h text-[#6b6b6b] p-2 cursor-pointer hover:text-white" onClick={() => setOpenDropdownId(openDropdownId === routine.id ? null : routine.id)}></i>
                    {openDropdownId === routine.id && (
                      <>
                        <button
                          type="button"
                          className="fixed inset-0 z-20 cursor-default bg-black/40 backdrop-blur-[1px]"
                          onClick={() => setOpenDropdownId(null)}
                        />
                        <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#171717] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
                          <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9e9e9e]">Routine options</p>
                          </div>
                          <button onClick={() => handleEditRoutine(routine)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-white hover:bg-white/5 font-medium transition-colors">
                            <i className="fas fa-pen text-blue-400"></i>
                            Edit routine
                          </button>
                          <button onClick={() => handleDeleteRoutine(routine.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 font-medium transition-colors">
                            <i className="fas fa-trash"></i>
                            Delete routine
                          </button>
                        </div>
                      </>
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