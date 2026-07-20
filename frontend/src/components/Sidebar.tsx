import React from 'react';
import { NavLink } from 'react-router-dom';
import { BrainCircuit, Network, FileText, Activity, ShieldCheck, Sparkles, Layers, Zap } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { name: 'Intelligence Query', path: '/', icon: BrainCircuit },
    { name: 'Knowledge Graph', path: '/graph', icon: Network },
    { name: 'Architecture Map', path: '/architecture', icon: Layers },
    { name: 'Impact Analysis', path: '/impact', icon: Zap },
    { name: 'Enterprise Documents', path: '/documents', icon: FileText },
    { name: 'Agent Diagnostics', path: '/diagnostics', icon: Activity },
  ];


  return (
    <aside className="w-64 bg-slate-950/80 backdrop-blur-xl border-r border-slate-800/80 flex flex-col h-screen shrink-0 z-20">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white tracking-tight leading-none">EKIP</h1>
          <p className="text-xs text-slate-400 mt-1">Enterprise Intelligence</p>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Platform Apps
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600/20 to-indigo-600/10 text-white border border-violet-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`
              }
            >
              <Icon className="w-4 h-4 text-violet-400 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 m-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
        <div className="flex items-center justify-between text-xs font-medium text-slate-300">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            AcmeAI Production
          </span>
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5">
          Multi-Agent RAG + Neo4j Online
        </p>
      </div>
    </aside>
  );
};
