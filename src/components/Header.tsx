import React from 'react';
import { ActiveTab } from '../types';
import { Settings, Lock } from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  ativosCount: number;
  isGestorUnlocked: boolean;
  onResetNovo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  ativosCount,
  isGestorUnlocked,
  onResetNovo,
}) => {
  return (
    <header className="bg-[#004680] shadow-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Subtle title / project tag */}
        <div className="flex items-center gap-2">
          <span className="text-white font-extrabold text-base tracking-wider uppercase">
            SETUP EXTERNO
          </span>
          <span className="text-blue-300 text-xs hidden md:inline">|</span>
          <span className="inline-flex items-center gap-1.5 bg-blue-900/60 px-2 py-0.5 rounded text-[11px] font-mono text-emerald-300 border border-blue-700/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>STPX26</span>
          </span>
        </div>

        {/* Navigation buttons matching the video */}
        <div className="flex items-center flex-wrap justify-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              onResetNovo();
              setActiveTab('novo');
            }}
            className={`font-semibold rounded-lg px-4 sm:px-5 py-2 uppercase text-xs sm:text-sm tracking-wider transition border-2 cursor-pointer ${
              activeTab === 'novo'
                ? 'bg-white text-[#004680] border-white font-bold shadow'
                : 'text-white border-white/40 hover:border-white hover:bg-white/10'
            }`}
          >
            NOVO SETUP
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('painel')}
            className={`font-semibold rounded-lg px-4 sm:px-5 py-2 uppercase text-xs sm:text-sm tracking-wider transition border-2 cursor-pointer relative ${
              activeTab === 'painel'
                ? 'bg-white text-[#004680] border-white font-bold shadow'
                : 'text-white border-white/40 hover:border-white hover:bg-white/10'
            }`}
          >
            <span>PAINEL ATIVO</span>
            {ativosCount > 0 && (
              <span
                className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[11px] font-black ${
                  activeTab === 'painel'
                    ? 'bg-[#004680] text-white'
                    : 'bg-amber-400 text-blue-950'
                }`}
              >
                {ativosCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hist')}
            className={`font-semibold rounded-lg px-4 sm:px-5 py-2 uppercase text-xs sm:text-sm tracking-wider transition border-2 cursor-pointer ${
              activeTab === 'hist'
                ? 'bg-white text-[#004680] border-white font-bold shadow'
                : 'text-white border-white/40 hover:border-white hover:bg-white/10'
            }`}
          >
            HISTÓRICO
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gestor')}
            className={`font-semibold rounded-lg px-3.5 sm:px-4 py-2 uppercase text-xs sm:text-sm tracking-wider transition border-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'gestor'
                ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow'
                : 'text-amber-300 border-amber-400/50 hover:border-amber-300 hover:bg-amber-400/10'
            }`}
            title="Painel de Configuração do Gestor"
          >
            <Settings className="w-4 h-4" />
            <span>GESTOR</span>
            {!isGestorUnlocked && <Lock className="w-3 h-3 text-amber-300 ml-0.5" />}
          </button>
        </div>
      </div>
    </header>
  );
};
