// src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Statistics from '../components/Statistics';
import EditProfile from '../components/EditProfile';
import BodyMeasurements from '../components/BodyMeasurements';
import WorkoutCalendar from '../components/WorkoutCalendar';

export default function Profile() {
  const [userName, setUserName] = useState('user');
  const [initial, setInitial] = useState('u');
  const [profile, setProfile] = useState(null);
  const [routines, setRoutines] = useState([]);
  const [activeChartTab, setActiveChartTab] = useState('duration');
  const [currentView, setCurrentView] = useState('profile'); // profile, statistics, edit_profile, measurements, calendar

  // Ambil data user & rutinitas dari Supabase
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.email) {
      const name = user.email.split('@')[0];
      setUserName(name);
      setInitial(name.charAt(0).toLowerCase());

      // Fetch profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        if (profileData.username) setUserName(profileData.username);
        if (profileData.username) setInitial(profileData.username.charAt(0).toLowerCase());
      }

      // Fetch routines
      const { data, error } = await supabase
        .from('routines')
        .select(`id, name, created_at, routine_exercises (exercises (name))`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const formattedData = data.map(routine => ({
          id: routine.id,
          name: routine.name,
          date: new Date(routine.created_at).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric'
          }),
          exerciseText: routine.routine_exercises.map(re => re.exercises.name).join(', ')
        }));
        setRoutines(formattedData);
      }
    }
  };

  const handleShareProfile = async () => {
    const shareData = {
      title: `${userName}'s Workout Profile`,
      text: `Check out ${userName}'s workout profile! ${routines.length} routines created.`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled
      }
    } else {
      // Fallback: copy to clipboard
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

  // Calculate profile completion
  const getProfileCompletion = () => {
    if (!profile) return 20;
    let filled = 1; // user exists
    if (profile.username) filled++;
    if (profile.full_name) filled++;
    if (profile.bio) filled++;
    if (profile.height) filled++;
    if (profile.weight) filled++;
    if (profile.birth_date) filled++;
    if (profile.gender) filled++;
    return Math.round((filled / 8) * 100);
  };

  // --- VIEW: STATISTICS ---
  if (currentView === 'statistics') {
    return <Statistics onClose={() => setCurrentView('profile')} />;
  }

  // --- VIEW: EDIT PROFILE ---
  if (currentView === 'edit_profile') {
    return <EditProfile onClose={() => setCurrentView('profile')} onUpdate={fetchData} />;
  }

  // --- VIEW: BODY MEASUREMENTS ---
  if (currentView === 'measurements') {
    return <BodyMeasurements onClose={() => setCurrentView('profile')} />;
  }

  // --- VIEW: CALENDAR ---
  if (currentView === 'calendar') {
    return <WorkoutCalendar onClose={() => setCurrentView('profile')} />;
  }

  // --- VIEW: PROFILE MAIN ---
  return (
    <div className="flex flex-col h-full bg-black animate-fade-in pb-24 overflow-y-auto no-scrollbar">

      {/* Header Aplikasi */}
      <div className="flex justify-between items-center px-4 py-4 pt-6">
        <h1 className="text-xl font-bold text-white">{userName}</h1>
        <div className="flex items-center gap-5 text-white text-lg">
          <i 
            className="fas fa-pencil-alt cursor-pointer hover:text-blue-500 transition-colors" 
            onClick={() => setCurrentView('edit_profile')}
            title="Edit Profile"
          ></i>
          <i 
            className="fas fa-share-alt cursor-pointer hover:text-blue-500 transition-colors" 
            onClick={handleShareProfile}
            title="Share Profile"
          ></i>
          <button 
            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Profil Info */}
      <div className="flex items-center px-4 mt-2 mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-4xl text-white font-medium mr-5 shadow-lg shadow-blue-500/20">
          {initial}
        </div>
        <div>
          <h2 className="text-lg font-bold text-white leading-tight mb-2">{userName}</h2>
          {profile?.bio && <p className="text-[#9e9e9e] text-sm mb-2 line-clamp-2">{profile.bio}</p>}
          <div className="flex gap-6">
            <div className="flex flex-col cursor-pointer hover:opacity-80">
              <span className="text-[#9e9e9e] text-xs font-medium">Workouts</span>
              <span className="text-white font-semibold text-lg">{routines.length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#9e9e9e] text-xs font-medium">Routines</span>
              <span className="text-white font-semibold text-lg">{routines.length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#9e9e9e] text-xs font-medium">Following</span>
              <span className="text-white font-semibold text-lg">0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      {(profile?.height || profile?.weight) && (
        <div className="px-4 mb-4 flex gap-3">
          {profile.height && (
            <div className="bg-[#1c1c1e] px-3 py-2 rounded-lg border border-[#333333]">
              <span className="text-[#9e9e9e] text-xs">Height</span>
              <div className="text-white font-semibold">{profile.height} cm</div>
            </div>
          )}
          {profile.weight && (
            <div className="bg-[#1c1c1e] px-3 py-2 rounded-lg border border-[#333333]">
              <span className="text-[#9e9e9e] text-xs">Weight</span>
              <div className="text-white font-semibold">{profile.weight} kg</div>
            </div>
          )}
          {profile.birth_date && (
            <div className="bg-[#1c1c1e] px-3 py-2 rounded-lg border border-[#333333]">
              <span className="text-[#9e9e9e] text-xs">Age</span>
              <div className="text-white font-semibold">
                {Math.floor((new Date() - new Date(profile.birth_date)) / (365.25 * 24 * 60 * 60 * 1000))} y
              </div>
            </div>
          )}
        </div>
      )}

      {/* Banner Setup */}
      <div className="px-4 mb-4">
        <div 
          onClick={() => setCurrentView('edit_profile')}
          className="bg-[#243447] rounded-xl p-4 flex justify-between items-center cursor-pointer hover:brightness-110 transition-all border border-[#2c3f56]"
        >
          <span className="text-white text-sm font-medium">Your profile is {getProfileCompletion()}% finished</span>
          <i className="fas fa-arrow-right text-white"></i>
        </div>
      </div>

      {/* Area Chart Placeholder - Mini Stats */}
      <div className="px-4 mb-4">
        <div className="bg-[#1c1c1e] rounded-xl p-4 border border-[#333333]">
          <div className="flex justify-between items-center mb-3">
            <span className="text-white font-semibold">Quick Stats</span>
            <span className="text-[#9e9e9e] text-xs capitalize">{activeChartTab}</span>
          </div>
          <div className="flex items-center justify-center gap-3 py-4">
            <i className="fas fa-chart-bar text-4xl text-[#6b6b6b]"></i>
            <span className="text-[#9e9e9e] text-sm">
              View detailed stats in <button onClick={() => setCurrentView('statistics')} className="text-blue-500 font-bold">Statistics</button>
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 flex gap-2 mb-6">
        {['duration', 'volume', 'reps'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveChartTab(tab)}
            className={`px-5 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              activeChartTab === tab 
                ? 'bg-blue-500 text-white' 
                : 'bg-[#1c1c1e] text-[#9e9e9e] hover:bg-[#252525] hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Dashboard Menu Grid */}
      <div className="px-4 mb-8">
        <h3 className="text-[#9e9e9e] text-sm mb-3 font-medium">Dashboard</h3>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setCurrentView('statistics')} className="bg-[#1c1c1e] hover:bg-[#252525] transition-colors text-white py-4 rounded-xl flex items-center justify-center gap-3 font-medium border border-[#333333]">
            <i className="fas fa-chart-line text-lg text-blue-500"></i> Statistics
          </button>
          <button onClick={() => setCurrentView('edit_profile')} className="bg-[#1c1c1e] hover:bg-[#252525] transition-colors text-white py-4 rounded-xl flex items-center justify-center gap-3 font-medium border border-[#333333]">
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
        <h3 className="text-[#9e9e9e] text-sm mb-3 font-medium">My Workouts History</h3>

        {routines.length === 0 ? (
          <div className="bg-[#1c1c1e] rounded-xl p-6 flex flex-col items-center justify-center gap-2 border border-[#333333] border-dashed">
            <span className="text-[#6b6b6b] text-sm">Belum ada riwayat latihan tersimpan.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {routines.map((routine) => (
              <div key={routine.id} className="bg-[#1c1c1e] p-4 rounded-xl border border-[#333333] flex flex-col gap-2 cursor-pointer hover:border-blue-500 transition-colors">
                <div className="flex justify-between items-start">
                  <h4 className="text-white font-bold uppercase">{routine.name}</h4>
                  <span className="text-[#6b6b6b] text-xs">{routine.date}</span>
                </div>
                <p className="text-[#9e9e9e] text-sm line-clamp-2">
                  {routine.exerciseText || 'Tidak ada gerakan tercatat'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}