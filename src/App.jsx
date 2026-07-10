// src/App.jsx
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import BottomNav from './components/BottomNav';
import Workout from './components/Workout';
import Profile from './pages/Profile';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('workout');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        Loading...
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="flex justify-center min-h-screen bg-gym-primary text-[#f0f0f0] font-sans selection:bg-purple-500">
      
      <div className="w-full max-w-120 bg-gym-secondary h-screen flex flex-col relative overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] sm:border-x sm:border-[#333333]">
        
        <header className="shrink-0 flex justify-between items-center px-5 pt-4 pb-2 bg-gym-secondary z-10">
          <div className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <i className="fas fa-dumbbell text-purple-600 text-2xl"></i>
            <span className="bg-linear-to-br from-purple-600 to-orange-500 bg-clip-text text-transparent">
              GymTrack
            </span>
          </div>
          <div className="flex gap-3">
            {/* Cari kode ini di bagian Header App.jsx */}
<button 
  onClick={() => alert("🔔 Belum ada notifikasi baru untukmu hari ini!")} 
  className="w-10 h-10 rounded-full bg-gym-surface flex items-center justify-center text-[#9e9e9e] hover:bg-gym-card hover:text-[#f0f0f0] transition-colors relative"
>
  <i className="fas fa-bell"></i>
  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500 border-2 border-gym-secondary"></span>
</button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
          
          {activeTab === 'home' && (
            <div className="mt-10 px-4 text-center animate-fade-in">
              <h1 className="text-2xl font-bold">Halaman Home 🏠</h1>
              <p className="text-[#9e9e9e] mt-2">Menunggu slicing komponen Home...</p>
            </div>
          )}
          
          {activeTab === 'workout' && <Workout />}
          {activeTab === 'profile' && <Profile />}
          
          {activeTab === 'exercises' && <div className="mt-10 text-center">Library Latihan 🏋️</div>}
          {activeTab === 'history' && <div className="mt-10 text-center">Riwayat Latihan 📜</div>}
          {activeTab === 'profile' && <div className="mt-10 text-center">Profil User 👤</div>}

        </main>

        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        
      </div>
    </div>
  );
}