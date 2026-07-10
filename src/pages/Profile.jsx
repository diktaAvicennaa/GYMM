// src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Profile() {
  const [userName, setUserName] = useState('user');
  const [initial, setInitial] = useState('u');
  const [routines, setRoutines] = useState([]); // State untuk menyimpan riwayat rutinitas
  const [activeChartTab, setActiveChartTab] = useState('duration'); // State untuk tab grafik

  // Ambil data user & rutinitas dari Supabase
  useEffect(() => {
    const fetchData = async () => {
      // 1. Ambil Data User
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
        const name = user.email.split('@')[0];
        setUserName(name);
        setInitial(name.charAt(0).toLowerCase());

        // 2. Ambil Riwayat Rutinitas (sebagai contoh history)
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
    
    fetchData();
  }, []);

  // Fungsi utilitas untuk tombol yang belum full-backend
  const handleComingSoon = (feature) => {
    alert(`🚀 Fitur ${feature} sedang dalam tahap pengembangan!`);
  };

  return (
    <div className="flex flex-col h-full bg-black animate-fade-in pb-24 overflow-y-auto no-scrollbar">
      
      {/* Header Aplikasi */}
      <div className="flex justify-between items-center px-4 py-4 pt-6">
        <h1 className="text-xl font-bold text-white">{userName}</h1>
        <div className="flex items-center gap-5 text-white text-lg">
          <i className="fas fa-pencil-alt cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleComingSoon('Edit Profil')}></i>
          <i className="fas fa-share-alt cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleComingSoon('Bagikan Profil')}></i>
          <button 
            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded"
            onClick={async () => {
              const { error } = await supabase.auth.signOut();
              if (error) alert(error.message);
              // Tidak perlu navigasi manual, App.jsx akan mendeteksi session null dan pindah ke Auth
            }}
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
          <div className="flex gap-6">
            <div className="flex flex-col cursor-pointer hover:opacity-80">
              <span className="text-[#9e9e9e] text-xs font-medium">Workouts</span>
              <span className="text-white font-semibold text-lg">{routines.length}</span>
            </div>
            <div className="flex flex-col cursor-pointer hover:opacity-80" onClick={() => handleComingSoon('Followers')}>
              <span className="text-[#9e9e9e] text-xs font-medium">Followers</span>
              <span className="text-white font-semibold text-lg">0</span>
            </div>
            <div className="flex flex-col cursor-pointer hover:opacity-80" onClick={() => handleComingSoon('Following')}>
              <span className="text-[#9e9e9e] text-xs font-medium">Following</span>
              <span className="text-white font-semibold text-lg">0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Banner Setup */}
      <div className="px-4 mb-4">
        <div 
          onClick={() => handleComingSoon('Lengkapi Profil')}
          className="bg-[#243447] rounded-xl p-4 flex justify-between items-center cursor-pointer hover:brightness-110 transition-all border border-[#2c3f56]"
        >
          <span className="text-white text-sm font-medium">Your profile is 80% finished</span>
          <i className="fas fa-arrow-right text-white"></i>
        </div>
      </div>

      {/* Area Chart Placeholder */}
      <div className="px-4 mb-4">
        <div className="bg-[#1c1c1e] rounded-xl h-48 flex flex-col items-center justify-center gap-3 border border-[#333333]">
          <i className="fas fa-chart-bar text-4xl text-[#6b6b6b]"></i>
          <span className="text-[#9e9e9e] text-sm">
            Data grafik <span className="font-bold text-white capitalize">{activeChartTab}</span> belum tersedia
          </span>
        </div>
      </div>

      {/* Filter Tabs (Interaktif) */}
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
          <button onClick={() => handleComingSoon('Statistik Detail')} className="bg-[#1c1c1e] hover:bg-[#252525] transition-colors text-white py-4 rounded-xl flex items-center justify-center gap-3 font-medium border border-[#333333]">
            <i className="fas fa-chart-line text-lg text-blue-500"></i> Statistics
          </button>
          <button onClick={() => handleComingSoon('Master Latihan')} className="bg-[#1c1c1e] hover:bg-[#252525] transition-colors text-white py-4 rounded-xl flex items-center justify-center gap-3 font-medium border border-[#333333]">
            <i className="fas fa-dumbbell text-lg text-blue-500"></i> Exercises
          </button>
          <button onClick={() => handleComingSoon('Pengukuran Tubuh')} className="bg-[#1c1c1e] hover:bg-[#252525] transition-colors text-white py-4 rounded-xl flex items-center justify-center gap-3 font-medium border border-[#333333]">
            <i className="fas fa-child text-lg text-blue-500"></i> Measures
          </button>
          <button onClick={() => handleComingSoon('Kalender Latihan')} className="bg-[#1c1c1e] hover:bg-[#252525] transition-colors text-white py-4 rounded-xl flex items-center justify-center gap-3 font-medium border border-[#333333]">
            <i className="far fa-calendar-alt text-lg text-blue-500"></i> Calendar
          </button>
        </div>
      </div>

      {/* Workouts History Section (Sekarang Menampilkan Data Asli!) */}
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