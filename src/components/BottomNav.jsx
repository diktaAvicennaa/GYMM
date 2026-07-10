// src/components/BottomNav.jsx
export default function BottomNav({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'home', icon: 'fas fa-home', label: 'Home' },
    { id: 'workout', icon: 'fas fa-dumbbell', label: 'Workout' },
    { id: 'profile', icon: 'far fa-user', label: 'Profile' }, // Menggunakan 'far' (regular) agar icon user tidak full seperti di gambar saat tidak aktif
  ];

  return (
    <nav className="flex-shrink-0 flex justify-around items-center bg-[#151515] border-t border-[#333333] z-20 absolute bottom-0 w-full pb-safe">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        
        // Sedikit logika agar icon user menjadi full (fas) saat aktif
        let iconClass = item.icon;
        if (item.id === 'profile' && isActive) iconClass = 'fas fa-user';

        return (
          <div 
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center gap-1 p-2 w-24 h-14 cursor-pointer transition-colors ${
              isActive ? 'text-blue-500' : 'text-[#9e9e9e] hover:text-[#c7c7c7]'
            }`}
          >
            <i className={`${iconClass} text-xl mb-0.5`}></i>
            <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
          </div>
        );
      })}
    </nav>
  );
}