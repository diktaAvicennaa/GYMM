// src/App.jsx
import { useState } from 'react';
import BottomNav from './components/BottomNav';
import Workout from './components/Workout';
import Profile from './pages/Profile';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('workout');
  return (
    // Background paling luar (Desktop view)
    <div className="flex justify-center min-h-screen bg-[#0c0c0c] text-[#f0f0f0] font-sans selection:bg-purple-500">
      
      {/* App Container (Maksimal ukuran HP: 480px) */}
      <div className="w-full max-w-[480px] bg-[#151515] h-screen flex flex-col relative overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] sm:border-x sm:border-[#333333]">
        
        {/* Header (Sesuai referensi HTML) */}
        <header className="flex-shrink-0 flex justify-between items-center px-5 pt-4 pb-2 bg-[#151515] z-10">
          <div className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <i className="fas fa-dumbbell text-purple-600 text-2xl"></i>
            <span className="bg-gradient-to-br from-purple-600 to-orange-500 bg-clip-text text-transparent">
              GymTrack
            </span>
          </div>
          <div className="flex gap-3">
            {/* Cari kode ini di bagian Header App.jsx */}
<button 
  onClick={() => alert("🔔 Belum ada notifikasi baru untukmu hari ini!")} 
  className="w-10 h-10 rounded-full bg-[#1e1e1e] flex items-center justify-center text-[#9e9e9e] hover:bg-[#252525] hover:text-[#f0f0f0] transition-colors relative"
>
  <i className="fas fa-bell"></i>
  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500 border-2 border-[#151515]"></span>
</button>
          </div>
        </header>

        {/* Main Content Area (Area yang bisa di-scroll) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
          
          {activeTab === 'home' && (
            <div className="mt-10 px-4 text-center animate-fade-in">
              <h1 className="text-2xl font-bold">Halaman Home 🏠</h1>
              <p className="text-[#9e9e9e] mt-2">Menunggu slicing komponen Home...</p>
            </div>
          )}
          
          {/* Render Komponen Workout di sini */}
          {activeTab === 'workout' && <Workout />}
          {activeTab === 'profile' && <Profile />}
          
          {activeTab === 'exercises' && <div className="mt-10 text-center">Library Latihan 🏋️</div>}
          {activeTab === 'history' && <div className="mt-10 text-center">Riwayat Latihan 📜</div>}
          {activeTab === 'profile' && <div className="mt-10 text-center">Profil User 👤</div>}

        </main>

        {/* Navigasi Bawah */}
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        
      </div>
    </div>
  );
}