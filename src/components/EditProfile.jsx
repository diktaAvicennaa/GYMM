// src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Profile() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('user');
  const [initial, setInitial] = useState('u');
  const [profile, setProfile] = useState(null);
  const [routines, setRoutines] = useState([]);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [stats, setStats] = useState({ totalWorkouts: 0, totalVolume: 0, totalSets: 0, favoriteExercise: '-' });
  const [prs, setPrs] = useState([]);
  const [currentView, setCurrentView] = useState('profile');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const name = user.email.split('@')[0];
    setUserName(name);
    setInitial(name.charAt(0).toLowerCase());

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
      if (profileData.username) {
        setUserName(profileData.username);
        setInitial(profileData.username.charAt(0).toLowerCase());
      }
    }

    // Fetch routines count
    const { data: routinesData } = await supabase
      .from('routines')
      .select('id, name, created_at, routine_exercises (exercises (name))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (routinesData) {
      setRoutines(routinesData.map(routine => ({
        id: routine.id,
        name: routine.name,
        date: new Date(routine.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        exerciseText: routine.routine_exercises.map(re => re.exercises?.name).filter(Boolean).join(', ')
      })));
    }

    // Fetch workout sessions (REAL HISTORY)
    const { data: sessionsData } = await supabase
      .from('workout_sessions')
      .select(`
        id, name, start_time, end_time,
        workout_logs ( weight, reps, exercises ( name ) )
      `)
      .eq('user_id', user.id)
      .order('start_time', { ascending: false })
      .limit(20);

    if (sessionsData) {
      const formattedHistory = sessionsData.map(session => {
        const logs = session.workout_logs || [];
        const totalVolume = logs.reduce((sum, log) => sum + (log.weight * log.reps), 0);
        const totalSets = logs.length;
        const exercises = [...new Set(logs.map(l => l.exercises?.name).filter(Boolean))];
        const duration = session.end_time 
          ? Math.round((new Date(session.end_time) - new Date(session.start_time)) / 60000)
          : 0;

        return {
          id: session.id,
          name: session.name,
          date: new Date(session.start_time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
          time: new Date(session.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          duration,
          totalVolume,
          totalSets,
          exerciseText: exercises.join(', ') || 'Freestyle'
        };
      });
      setWorkoutHistory(formattedHistory);

      // Calculate overall stats
      const allLogs = sessionsData.flatMap(s => s.workout_logs || []);
      const totalVol = allLogs.reduce((sum, log) => sum + (log.weight * log.reps), 0);
      const totalSetsCount = allLogs.length;

      // Find favorite exercise
      const exerciseCounts = {};
      allLogs.forEach(log => {
        const name = log.exercises?.name;
        if (name) exerciseCounts[name] = (exerciseCounts[name] || 0) + 1;
      });
      const favorite = Object.entries(exerciseCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

      setStats({
        totalWorkouts: sessionsData.length,
        totalVolume: totalVol,
        totalSets: totalSetsCount,
        favoriteExercise: favorite
      });

      // Calculate PRs (max weight per exercise)
      const prMap = {};
      allLogs.forEach(log => {
        const name = log.exercises?.name;
        if (name && log.weight > (prMap[name]?.weight || 0)) {
          prMap[name] = { exercise: name, weight: log.weight, reps: log.reps };
        }
      });
      setPrs(Object.values(prMap).sort((a, b) => b.weight - a.weight).slice(0, 5));
    }

    setLoading(false);
  };

  const handleShareProfile = async () => {
    const shareData = {
      title: `${userName}'s Workout Profile`,
      text: `Check out ${userName}'s workout profile! ${stats.totalWorkouts} workouts completed.`,
      url: window.location.href
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        alert('Profile link copied to clipboard!');
      } catch {
        alert('Unable to share. URL: ' + window.location.href);
      }
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert(error.message);
  };

  const getProfileCompletion = () => {
    if (!profile) return 20;
    let filled = 1;
    if (profile.username) filled++;
    if (profile.full_name) filled++;
    if (profile.bio) filled++;
    if (profile.height) filled++;
    if (profile.weight) filled++;
    if (profile.birth_date) filled++;
    if (profile.gender) filled++;
    return Math.round((filled / 8) * 100);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // --- SUB-VIEWS (rendered as overlays, not replacing entire page) ---

  // VIEW: STATISTICS
  if (currentView === 'statistics') {
    return (
      <div className="flex flex-col h-full bg-black animate-fade-in pb-24">
        <div className="flex items-center px-4 py-4 pt-6 border-b border-[#333333]">
          <button onClick={() => setCurrentView('profile')} className="text-blue-500 text-sm font-medium mr-4">
            <i className="fas fa-arrow-left mr-1"></i> Back
          </button>
          <h1 className="text-xl font-bold text-white">Statistics</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-[#1c1c1e] p-4 rounded-xl border border-[#333333]">
              <div className="text-[#9e9e9e] text-xs mb-1">Total Workouts</div>
              <div className="text-white text-2xl font-bold">{stats.totalWorkouts}</div>
            </div>
            <div className="bg-[#1c1c1e] p-4 rounded-xl border border-[#333333]">
              <div className="text-[#9e9e9e] text-xs mb-1">Total Volume</div>
              <div className="text-white text-2xl font-bold">{formatNumber(stats.totalVolume)} <span className="text-sm text-[#9e9e9e]">kg</span></div>
            </div>
            <div className="bg-[#1c1c1e] p-4 rounded-xl border border-[#333333]">
              <div className="text-[#9e9e9e] text-xs mb-1">Total Sets</div>
              <div className="text-white text-2xl font-bold">{stats.totalSets}</div>
            </div>
            <div className="bg-[#1c1c1e] p-4 rounded-xl border border-[#333333]">
              <div className="text-[#9e9e9e] text-xs mb-1">Favorite</div>
              <div className="text-white text-lg font-bold truncate">{stats.favoriteExercise}</div>
            </div>
          </div>

          {/* Personal Records */}
          <h3 className="text-white font-semibold mb-3">Personal Records</h3>
          {prs.length === 0 ? (
            <div className="bg-[#1c1c1e] rounded-xl p-6 text-center border border-[#333333] border-dashed">
              <span className="text-[#6b6b6b] text-sm">No PRs recorded yet. Keep lifting!</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 mb-6">
              {prs.map((pr, i) => (
                <div key={i} className="bg-[#1c1c1e] p-3 rounded-xl border border-[#333333] flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold text-sm">{i + 1}</div>
                    <span className="text-white font-medium">{pr.exercise}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-bold">{pr.weight} kg</span>
                    <span className="text-[#9e9e9e] text-xs ml-2">x {pr.reps}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Volume Chart Placeholder */}
          <h3 className="text-white font-semibold mb-3">Volume Over Time</h3>
          <div className="bg-[#1c1c1e] rounded-xl p-6 border border-[#333333] flex items-center justify-center">
            <div className="text-center">
              <i className="fas fa-chart-area text-4xl text-[#6b6b6b] mb-2"></i>
              <p className="text-[#9e9e9e] text-sm">Volume chart coming soon</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VIEW: EDIT PROFILE
  if (currentView === 'edit_profile') {
    const [formData, setFormData] = useState({
      username: profile?.username || '',
      full_name: profile?.full_name || '',
      bio: profile?.bio || '',
      height: profile?.height || '',
      weight: profile?.weight || '',
      birth_date: profile?.birth_date || '',
      gender: profile?.gender || ''
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...formData, updated_at: new Date().toISOString() });

      if (error) alert(error.message);
      else {
        await fetchData();
        setCurrentView('profile');
      }
      setSaving(false);
    };

    return (
      <div className="flex flex-col h-full bg-black animate-fade-in pb-24">
        <div className="flex items-center px-4 py-4 pt-6 border-b border-[#333333]">
          <button onClick={() => setCurrentView('profile')} className="text-blue-500 text-sm font-medium mr-4">
            <i className="fas fa-arrow-left mr-1"></i> Back
          </button>
          <h1 className="text-xl font-bold text-white">Edit Profile</h1>
          <button onClick={handleSave} disabled={saving} className="ml-auto text-blue-500 text-sm font-medium disabled:opacity-60">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          <div>
            <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-2 block tracking-[0.18em]">Username</label>
            <input type="text" className="w-full bg-[#1c1c1e] text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500" 
              value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
          </div>
          <div>
            <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-2 block tracking-[0.18em]">Full Name</label>
            <input type="text" className="w-full bg-[#1c1c1e] text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500" 
              value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
          </div>
          <div>
            <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-2 block tracking-[0.18em]">Bio</label>
            <textarea className="w-full bg-[#1c1c1e] text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500 resize-none h-24" 
              value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} placeholder="Tell us about yourself..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-2 block tracking-[0.18em]">Height (cm)</label>
              <input type="number" className="w-full bg-[#1c1c1e] text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500" 
                value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} />
            </div>
            <div>
              <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-2 block tracking-[0.18em]">Weight (kg)</label>
              <input type="number" className="w-full bg-[#1c1c1e] text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500" 
                value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-2 block tracking-[0.18em]">Birth Date</label>
            <input type="date" className="w-full bg-[#1c1c1e] text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500" 
              value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} />
          </div>
          <div>
            <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-2 block tracking-[0.18em]">Gender</label>
            <select className="w-full bg-[#1c1c1e] text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500" 
              value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  // VIEW: BODY MEASUREMENTS
  if (currentView === 'measurements') {
    const [measurements, setMeasurements] = useState([]);
    const [newMeasurement, setNewMeasurement] = useState({
      date: new Date().toISOString().split('T')[0],
      weight: '', body_fat: '', chest: '', waist: '', arms: '', thighs: '', shoulders: '', notes: ''
    });
    const [showAddForm, setShowAddForm] = useState(false);

    useEffect(() => {
      fetchMeasurements();
    }, []);

    const fetchMeasurements = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      if (data) setMeasurements(data);
    };

    const handleAddMeasurement = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('body_measurements').insert([{ ...newMeasurement, user_id: user.id }]);
      if (error) alert(error.message);
      else { fetchMeasurements(); setShowAddForm(false); }
    };

    return (
      <div className="flex flex-col h-full bg-black animate-fade-in pb-24">
        <div className="flex items-center px-4 py-4 pt-6 border-b border-[#333333]">
          <button onClick={() => setCurrentView('profile')} className="text-blue-500 text-sm font-medium mr-4">
            <i className="fas fa-arrow-left mr-1"></i> Back
          </button>
          <h1 className="text-xl font-bold text-white">Body Measurements</h1>
          <button onClick={() => setShowAddForm(!showAddForm)} className="ml-auto text-blue-500 text-sm font-medium">
            <i className="fas fa-plus"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {showAddForm && (
            <div className="bg-[#1c1c1e] rounded-xl p-4 border border-[#333333] mb-4 flex flex-col gap-3">
              <h3 className="text-white font-semibold">New Entry</h3>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" className="bg-black text-white p-2 rounded-lg border border-[#333333] outline-none" 
                  value={newMeasurement.date} onChange={e => setNewMeasurement({...newMeasurement, date: e.target.value})} />
                <input type="number" placeholder="Weight (kg)" className="bg-black text-white p-2 rounded-lg border border-[#333333] outline-none" 
                  value={newMeasurement.weight} onChange={e => setNewMeasurement({...newMeasurement, weight: e.target.value})} />
                <input type="number" placeholder="Body Fat %" className="bg-black text-white p-2 rounded-lg border border-[#333333] outline-none" 
                  value={newMeasurement.body_fat} onChange={e => setNewMeasurement({...newMeasurement, body_fat: e.target.value})} />
                <input type="number" placeholder="Chest (cm)" className="bg-black text-white p-2 rounded-lg border border-[#333333] outline-none" 
                  value={newMeasurement.chest} onChange={e => setNewMeasurement({...newMeasurement, chest: e.target.value})} />
                <input type="number" placeholder="Waist (cm)" className="bg-black text-white p-2 rounded-lg border border-[#333333] outline-none" 
                  value={newMeasurement.waist} onChange={e => setNewMeasurement({...newMeasurement, waist: e.target.value})} />
                <input type="number" placeholder="Arms (cm)" className="bg-black text-white p-2 rounded-lg border border-[#333333] outline-none" 
                  value={newMeasurement.arms} onChange={e => setNewMeasurement({...newMeasurement, arms: e.target.value})} />
                <input type="number" placeholder="Thighs (cm)" className="bg-black text-white p-2 rounded-lg border border-[#333333] outline-none" 
                  value={newMeasurement.thighs} onChange={e => setNewMeasurement({...newMeasurement, thighs: e.target.value})} />
                <input type="number" placeholder="Shoulders (cm)" className="bg-black text-white p-2 rounded-lg border border-[#333333] outline-none" 
                  value={newMeasurement.shoulders} onChange={e => setNewMeasurement({...newMeasurement, shoulders: e.target.value})} />
              </div>
              <input type="text" placeholder="Notes" className="bg-black text-white p-2 rounded-lg border border-[#333333] outline-none" 
                value={newMeasurement.notes} onChange={e => setNewMeasurement({...newMeasurement, notes: e.target.value})} />
              <button onClick={handleAddMeasurement} className="bg-blue-600 text-white font-semibold py-2 rounded-lg">Save</button>
            </div>
          )}

          {measurements.length === 0 ? (
            <div className="text-center text-[#6b6b6b] mt-10">No measurements recorded yet.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {measurements.map((m, i) => (
                <div key={m.id || i} className="bg-[#1c1c1e] p-3 rounded-xl border border-[#333333]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-semibold">{new Date(m.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    {m.weight && <span className="text-blue-400 font-bold">{m.weight} kg</span>}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-[#9e9e9e]">
                    {m.body_fat && <span className="bg-black px-2 py-1 rounded">Fat: {m.body_fat}%</span>}
                    {m.chest && <span className="bg-black px-2 py-1 rounded">Chest: {m.chest}cm</span>}
                    {m.waist && <span className="bg-black px-2 py-1 rounded">Waist: {m.waist}cm</span>}
                    {m.arms && <span className="bg-black px-2 py-1 rounded">Arms: {m.arms}cm</span>}
                    {m.thighs && <span className="bg-black px-2 py-1 rounded">Thighs: {m.thighs}cm</span>}
                    {m.shoulders && <span className="bg-black px-2 py-1 rounded">Shoulders: {m.shoulders}cm</span>}
                  </div>
                  {m.notes && <p className="text-[#6b6b6b] text-xs mt-2">{m.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // VIEW: CALENDAR
  if (currentView === 'calendar') {
    const [calendarData, setCalendarData] = useState({});
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
      fetchCalendarData();
    }, [currentMonth]);

    const fetchCalendarData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString();

      const { data } = await supabase
        .from('workout_sessions')
        .select('start_time')
        .eq('user_id', user.id)
        .gte('start_time', startOfMonth)
        .lte('start_time', endOfMonth);

      const dates = {};
      if (data) {
        data.forEach(session => {
          const date = new Date(session.start_time).toISOString().split('T')[0];
          dates[date] = (dates[date] || 0) + 1;
        });
      }
      setCalendarData(dates);
    };

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="flex flex-col h-full bg-black animate-fade-in pb-24">
        <div className="flex items-center px-4 py-4 pt-6 border-b border-[#333333]">
          <button onClick={() => setCurrentView('profile')} className="text-blue-500 text-sm font-medium mr-4">
            <i className="fas fa-arrow-left mr-1"></i> Back
          </button>
          <h1 className="text-xl font-bold text-white">Workout Calendar</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Month Navigation */}
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="text-white p-2">
              <i className="fas fa-chevron-left"></i>
            </button>
            <span className="text-white font-semibold">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="text-white p-2">
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(d => <div key={d} className="text-center text-[#9e9e9e] text-xs font-medium py-2">{d}</div>)}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square"></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, day) => {
              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day + 1).padStart(2, '0')}`;
              const hasWorkout = calendarData[dateStr];
              const isToday = dateStr === new Date().toISOString().split('T')[0];

              return (
                <div key={day} className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm ${isToday ? 'border border-blue-500' : ''} ${hasWorkout ? 'bg-blue-500/20' : ''}`}>
                  <span className={`${hasWorkout ? 'text-blue-400 font-bold' : 'text-white'}`}>{day + 1}</span>
                  {hasWorkout && <div className="w-1 h-1 bg-blue-500 rounded-full mt-1"></div>}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-xs text-[#9e9e9e]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500/20 rounded"></div>
              <span>Workout Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-blue-500 rounded"></div>
              <span>Today</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: PROFILE MAIN ---
  return (
    <div className="flex flex-col h-full bg-black animate-fade-in pb-24 overflow-y-auto no-scrollbar">
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center px-4 py-4 pt-6">
        <h1 className="text-xl font-bold text-white">{userName}</h1>
        <div className="flex items-center gap-4 text-white text-lg">
          <i className="fas fa-pencil-alt cursor-pointer hover:text-blue-500 transition-colors" onClick={() => setCurrentView('edit_profile')} title="Edit Profile"></i>
          <i className="fas fa-share-alt cursor-pointer hover:text-blue-500 transition-colors" onClick={handleShareProfile} title="Share Profile"></i>
          <button className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Profile Info */}
      <div className="flex items-center px-4 mt-2 mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-4xl text-white font-medium mr-5 shadow-lg shadow-blue-500/20">
          {initial}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-white leading-tight mb-2">{userName}</h2>
          {profile?.bio && <p className="text-[#9e9e9e] text-sm mb-2 line-clamp-2">{profile.bio}</p>}
          <div className="flex gap-6">
            <div className="flex flex-col">
              <span className="text-[#9e9e9e] text-xs font-medium">Workouts</span>
              <span className="text-white font-semibold text-lg">{stats.totalWorkouts}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#9e9e9e] text-xs font-medium">Routines</span>
              <span className="text-white font-semibold text-lg">{routines.length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#9e9e9e] text-xs font-medium">Volume</span>
              <span className="text-white font-semibold text-lg">{formatNumber(stats.totalVolume)}<span className="text-xs text-[#9e9e9e]">kg</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details Pills */}
      {(profile?.height || profile?.weight || profile?.birth_date) && (
        <div className="px-4 mb-4 flex gap-2 flex-wrap">
          {profile.height && (
            <div className="bg-[#1c1c1e] px-3 py-2 rounded-lg border border-[#333333]">
              <span className="text-[#9e9e9e] text-xs block">Height</span>
              <span className="text-white font-semibold text-sm">{profile.height} cm</span>
            </div>
          )}
          {profile.weight && (
            <div className="bg-[#1c1c1e] px-3 py-2 rounded-lg border border-[#333333]">
              <span className="text-[#9e9e9e] text-xs block">Weight</span>
              <span className="text-white font-semibold text-sm">{profile.weight} kg</span>
            </div>
          )}
          {profile.birth_date && (
            <div className="bg-[#1c1c1e] px-3 py-2 rounded-lg border border-[#333333]">
              <span className="text-[#9e9e9e] text-xs block">Age</span>
              <span className="text-white font-semibold text-sm">
                {Math.floor((new Date() - new Date(profile.birth_date)) / (365.25 * 24 * 60 * 60 * 1000))} y
              </span>
            </div>
          )}
          {profile.gender && (
            <div className="bg-[#1c1c1e] px-3 py-2 rounded-lg border border-[#333333]">
              <span className="text-[#9e9e9e] text-xs block">Gender</span>
              <span className="text-white font-semibold text-sm">{profile.gender}</span>
            </div>
          )}
        </div>
      )}

      {/* Profile Completion Banner */}
      <div className="px-4 mb-4">
        <div onClick={() => setCurrentView('edit_profile')} 
          className="bg-[#243447] rounded-xl p-4 flex justify-between items-center cursor-pointer hover:brightness-110 transition-all border border-[#2c3f56]">
          <div>
            <span className="text-white text-sm font-medium">Your profile is {getProfileCompletion()}% finished</span>
            <div className="w-full bg-[#1c1c1e] rounded-full h-1.5 mt-2">
              <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${getProfileCompletion()}%` }}></div>
            </div>
          </div>
          <i className="fas fa-arrow-right text-white"></i>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-[#1c1c1e] rounded-xl p-3 border border-[#333333] text-center">
            <div className="text-blue-400 text-lg font-bold">{stats.totalWorkouts}</div>
            <div className="text-[#9e9e9e] text-[10px] uppercase tracking-wider">Workouts</div>
          </div>
          <div className="bg-[#1c1c1e] rounded-xl p-3 border border-[#333333] text-center">
            <div className="text-green-400 text-lg font-bold">{stats.totalSets}</div>
            <div className="text-[#9e9e9e] text-[10px] uppercase tracking-wider">Sets</div>
          </div>
          <div className="bg-[#1c1c1e] rounded-xl p-3 border border-[#333333] text-center">
            <div className="text-orange-400 text-lg font-bold">{formatNumber(stats.totalVolume)}</div>
            <div className="text-[#9e9e9e] text-[10px] uppercase tracking-wider">Vol(kg)</div>
          </div>
          <div className="bg-[#1c1c1e] rounded-xl p-3 border border-[#333333] text-center">
            <div className="text-purple-400 text-sm font-bold truncate">{stats.favoriteExercise}</div>
            <div className="text-[#9e9e9e] text-[10px] uppercase tracking-wider">Top Ex</div>
          </div>
        </div>
      </div>

      {/* Personal Records Preview */}
      {prs.length > 0 && (
        <div className="px-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-white font-semibold text-sm">Personal Records</h3>
            <button onClick={() => setCurrentView('statistics')} className="text-blue-500 text-xs">View All</button>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {prs.slice(0, 3).map((pr, i) => (
              <div key={i} className="bg-[#1c1c1e] px-4 py-3 rounded-xl border border-[#333333] min-w-[140px]">
                <div className="text-[#9e9e9e] text-xs mb-1">{pr.exercise}</div>
                <div className="text-white font-bold">{pr.weight} <span className="text-sm text-[#9e9e9e]">kg</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard Menu Grid */}
      <div className="px-4 mb-6">
        <h3 className="text-[#9e9e9e] text-sm mb-3 font-medium">Dashboard</h3>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setCurrentView('statistics')} className="bg-[#1c1c1e] hover:bg-[#252525] transition-colors text-white py-4 rounded-xl flex items-center justify-center gap-3 font-medium border border-[#333333]">
            <i className="fas fa-chart-line text-lg text-blue-500"></i> Statistics
          </button>
          <button onClick={() => navigate('/exercises')} className="bg-[#1c1c1e] hover:bg-[#252525] transition-colors text-white py-4 rounded-xl flex items-center justify-center gap-3 font-medium border border-[#333333]">
            <i className="fas fa-dumbbell text-lg text-blue-500"></i> Exercises
          </button>
          <button onClick={() => setCurrentView('measurements')} className="bg-[#1c1c1e] hover:bg-[#252525] transition-colors text-white py-4 rounded-xl flex items-center justify-center gap-3 font-medium border border-[#333333]">
            <i className="fas fa-child text-lg text-blue-500"></i> Measures
          </button>
          <button onClick={() => setCurrentView('calendar')} className="bg-[#1c1c1e] hover:bg-[#252525] transition-colors text-white py-4 rounded-xl flex items-center justify-center gap-3 font-medium border border-[#333333]">
            <i className="far fa-calendar-alt text-lg text-blue-500"></i> Calendar
          </button>
        </div>
      </div>

      {/* Workouts History Section */}
      <div className="px-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[#9e9e9e] text-sm font-medium">Workout History</h3>
          <span className="text-[#6b6b6b] text-xs">{workoutHistory.length} sessions</span>
        </div>

        {workoutHistory.length === 0 ? (
          <div className="bg-[#1c1c1e] rounded-xl p-6 flex flex-col items-center justify-center gap-2 border border-[#333333] border-dashed">
            <i className="fas fa-dumbbell text-2xl text-[#6b6b6b] mb-1"></i>
            <span className="text-[#6b6b6b] text-sm">Belum ada riwayat latihan.</span>
            <span className="text-[#9e9e9e] text-xs">Mulai workout pertama mu!</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {workoutHistory.slice(0, 10).map((session) => (
              <div key={session.id} className="bg-[#1c1c1e] p-4 rounded-xl border border-[#333333] flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-white font-bold">{session.name}</h4>
                    <span className="text-[#6b6b6b] text-xs">{session.date} · {session.time}</span>
                  </div>
                  <div className="text-right">
                    {session.duration > 0 && <span className="text-[#9e9e9e] text-xs">{session.duration} min</span>}
                  </div>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="text-blue-400">{session.totalSets} sets</span>
                  <span className="text-green-400">{session.totalVolume} kg vol</span>
                </div>
                <p className="text-[#9e9e9e] text-sm line-clamp-1">{session.exerciseText}</p>
              </div>
            ))}
            {workoutHistory.length > 10 && (
              <button onClick={() => setCurrentView('statistics')} className="text-blue-500 text-sm text-center py-2">
                View all {workoutHistory.length} workouts →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Routines Section */}
      <div className="px-4 mb-8">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[#9e9e9e] text-sm font-medium">My Routines</h3>
          <span className="text-[#6b6b6b] text-xs">{routines.length} created</span>
        </div>

        {routines.length === 0 ? (
          <div className="bg-[#1c1c1e] rounded-xl p-4 text-center border border-[#333333] border-dashed">
            <span className="text-[#6b6b6b] text-sm">No routines yet.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {routines.slice(0, 5).map((routine) => (
              <div key={routine.id} className="bg-[#1c1c1e] p-3 rounded-xl border border-[#333333] flex justify-between items-center">
                <div>
                  <h4 className="text-white font-medium">{routine.name}</h4>
                  <p className="text-[#9e9e9e] text-xs line-clamp-1">{routine.exerciseText}</p>
                </div>
                <span className="text-[#6b6b6b] text-xs">{routine.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}