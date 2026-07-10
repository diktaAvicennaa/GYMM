// src/components/BottomNav.jsx
import { NavLink } from 'react-router-dom';

export default function BottomNav({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'home', icon: 'fas fa-home', label: 'Home' },
    { id: 'workout', icon: 'fas fa-dumbbell', label: 'Workout' },
    { id: 'profile', icon: 'far fa-user', label: 'Profile' },
  ];

  return (
    <nav className="flex-shrink-0 flex justify-around items-center bg-[#151515] border-t border-[#333333] z-50 fixed bottom-0 w-full max-w-[480px] pb-safe">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        let iconClass = item.icon;
        if (item.id === 'profile' && isActive) iconClass = 'fas fa-user';

        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center py-2 px-3 transition-all duration-200 relative flex-1 ${
              isActive ? 'text-blue-700' : 'text-[#9e9e9e] hover:text-[#f0f0f0]'
            }`}
          >
            <i className={`${iconClass} text-xl mb-1 ${isActive ? 'scale-110' : ''} transition-transform`}></i>
            <span className="text-[10px] font-medium">{item.label}</span>
            {isActive && (
              <span className="absolute -top-0.5 w-8 h-0.5 bg-blue-600 rounded-full"></span>
            )}
          </button>
        );
      })}
    </nav>
  );
}