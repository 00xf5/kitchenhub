import React from 'react';
import { Monitor, Clock, WifiOff, Circle, CheckCircle, Activity, ArrowUpRight } from 'lucide-react';

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400 shadow-emerald-500/50 animate-pulse' },
  idle:   { label: 'Idle',   color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400 shadow-amber-500/50' },
  offline:{ label: 'Offline',color: 'text-slate-500', bg: 'bg-slate-800/20 border-slate-700/10', dot: 'bg-slate-600' },
};

function ScreenshotPlaceholder({ agent, index }) {
  const palettes = [
    ['bg-slate-900', 'bg-slate-800', 'bg-brand-900/50'],
    ['bg-zinc-950', 'bg-zinc-900', 'bg-indigo-950/50'],
    ['bg-slate-950', 'bg-slate-900', 'bg-violet-950/50'],
  ];
  const palette = palettes[index % palettes.length];

  if (agent.status === 'offline') {
    return (
      <div className="w-full h-36 bg-slate-950 rounded-xl border border-slate-900 flex items-center justify-center relative overflow-hidden group">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:1rem_1rem] opacity-[0.03]"></div>
        <div className="text-center z-10">
          <WifiOff className="w-7 h-7 text-slate-700 mx-auto mb-2" />
          <span className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Offline telemetry</span>
        </div>
      </div>
    );
  }

  const isIdle = agent.status === 'idle';

  return (
    <div className="w-full h-36 bg-slate-950 rounded-xl border border-slate-900 p-1 flex flex-col relative overflow-hidden group/screen shadow-inner">
      {/* Browser/Window Header Bezel */}
      <div className="flex items-center justify-between px-2 py-1 bg-slate-900 border-b border-slate-950/80 rounded-t-lg">
        <div className="flex items-center space-x-1">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
        </div>
        <div className="text-[8px] font-mono text-slate-600 px-1 bg-slate-950 rounded border border-slate-900">
          agent://telemetry-{agent.id}
        </div>
        <div className="w-3"></div>
      </div>

      {/* Screen Workspace Mock */}
      <div className="flex-1 p-2.5 flex space-x-2 relative overflow-hidden">
        {/* Fake Side Panel */}
        <div className="w-6 h-full flex flex-col space-y-1">
          <div className="h-4 bg-brand-500/20 rounded opacity-60"></div>
          <div className="h-2 bg-slate-800 rounded opacity-50"></div>
          <div className="h-2 bg-slate-800 rounded opacity-50"></div>
          <div className="h-2 bg-slate-800 rounded opacity-50"></div>
        </div>

        {/* Fake Main Content Area */}
        <div className="flex-1 flex flex-col space-y-1.5">
          <div className="h-2.5 bg-slate-800 rounded w-2/3"></div>
          <div className="h-8 bg-slate-900 rounded border border-slate-850 p-1 space-y-1">
            <div className="h-1 bg-brand-500/10 rounded w-full"></div>
            <div className="h-1 bg-slate-850 rounded w-5/6"></div>
            <div className="h-1 bg-slate-850 rounded w-4/5"></div>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="h-2.5 bg-slate-800 rounded flex-1"></div>
            <div className="h-2.5 bg-brand-600/30 rounded w-5"></div>
          </div>
        </div>

        {/* Ambient background glow inside the monitor */}
        <div className="absolute -right-10 -bottom-10 w-24 h-24 rounded-full bg-brand-500/5 filter blur-xl"></div>
      </div>

      {/* Overlays */}
      {isIdle ? (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 transition-all duration-300">
          <Clock className="w-6 h-6 text-amber-400 mb-1 animate-pulse" />
          <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">Idle {agent.idleMinutes}m</span>
        </div>
      ) : (
        <>
          {/* Live capture badge */}
          <div className="absolute top-8 right-2.5 flex items-center space-x-1 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
            <div className="w-1 h-1 rounded-full bg-emerald-400 animate-ping"></div>
            <span className="text-[8px] text-emerald-400 font-extrabold uppercase tracking-wide">Live</span>
          </div>
          {/* Last action caption bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-slate-950/90 border-t border-slate-900 px-2.5 py-1 flex items-center justify-between text-[9px] text-slate-400">
            <span className="truncate">{agent.screenshots[0]?.label || 'Monitoring active'}</span>
            <span className="text-slate-600 text-[8px] flex-shrink-0 ml-1">{agent.screenshots[0]?.time}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function AgentGrid({ agents, onSelectAgent }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map((agent, index) => {
        const status = STATUS_CONFIG[agent.status];
        
        // Calculate workload status: Red if high (> 5), orange if (> 3), else green
        const openCount = agent.ticketsOpen;
        const workloadColor = openCount > 5 ? 'bg-red-500' : openCount > 3 ? 'bg-amber-500' : 'bg-emerald-500';
        const workloadPercent = Math.min((openCount / 8) * 100, 100);

        return (
          <div
            key={agent.id}
            onClick={() => onSelectAgent(agent)}
            className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-lg hover:shadow-2xl hover:shadow-brand-500/5 hover:border-brand-500/60 transition-all duration-300 cursor-pointer overflow-hidden group flex flex-col"
          >
            {/* Monitor Preview Frame */}
            <div className="p-4 pb-2 bg-slate-950/20">
              <ScreenshotPlaceholder agent={agent} index={index} />
            </div>

            {/* Agent Header Information */}
            <div className="px-4 pb-4 pt-1 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500/20 to-indigo-500/20 border border-brand-500/30 text-brand-300 text-xs font-bold flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                      {agent.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-brand-400 transition-colors leading-tight">{agent.name}</p>
                      <p className="text-[10px] font-mono text-slate-500">{agent.id}</p>
                    </div>
                  </div>

                  <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${status.bg} ${status.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                    <span>{status.label}</span>
                  </span>
                </div>

                {/* Simulated Workload Meter */}
                {agent.status !== 'offline' && (
                  <div className="mt-4 space-y-1">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-slate-500 font-semibold uppercase tracking-wider">Workload stress</span>
                      <span className="font-bold text-slate-300">{openCount} active tickets</span>
                    </div>
                    <div className="w-full h-1 bg-slate-850 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${workloadColor}`} 
                        style={{ width: `${workloadPercent}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Agent mini metrics footer */}
              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center"><Circle className="w-2 h-2 text-slate-600 mr-1.5 fill-slate-600" /> {agent.ticketsResolved} Resolved</span>
                <span className="flex items-center"><ArrowUpRight className="w-3.5 h-3.5 text-slate-600 mr-0.5" /> {agent.ticketsForwarded} Escalated</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
