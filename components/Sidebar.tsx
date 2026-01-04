
import React from 'react';

const Sidebar: React.FC = () => {
  const menuItems = [
    { icon: '🏠', label: 'Dashboard', active: true },
    { icon: '👥', label: 'Communities', active: false },
    { icon: '📊', label: 'Analytics', active: false },
    { icon: '🛡️', label: 'Security', active: false },
    { icon: '⚙️', label: 'Settings', active: false },
  ];

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800 h-screen sticky top-0 flex flex-col p-6">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
          R
        </div>
        <h1 className="text-xl font-extrabold tracking-tighter text-white">RAVEN</h1>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
              item.active 
                ? 'bg-zinc-900 text-white shadow-sm' 
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
            {item.active && <div className="ml-auto w-1.5 h-1.5 bg-indigo-500 rounded-full" />}
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-2">
          <img src="https://picsum.photos/40/40" alt="Profile" className="w-10 h-10 rounded-full border border-zinc-700" />
          <div>
            <p className="text-sm font-semibold text-zinc-100">Alexander Raven</p>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
