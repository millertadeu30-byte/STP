import React, { useState } from 'react';
import { SetupRecord } from '../types';
import { Check, X, AlertTriangle } from 'lucide-react';

interface PainelAtivoPanelProps {
  setups: SetupRecord[];
  onRetomar: (setup: SetupRecord) => void;
  onFinalizar: (setupId: string, acao: 'ok' | 'cancelar') => void;
}

export const PainelAtivoPanel: React.FC<PainelAtivoPanelProps> = ({
  setups,
  onRetomar,
  onFinalizar,
}) => {
  const [filtro, setFiltro] = useState('');
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const [cancelModalSetup, setCancelModalSetup] = useState<SetupRecord | null>(null);

  // Filter only active (non-finalized) setups
  const ativos = setups.filter((s) => !s.isFinalizado);

  const filteredSetups = ativos.filter((it) => {
    const val = filtro.toUpperCase();
    return (
      it.tipoMaquina.toUpperCase().includes(val) ||
      it.maquina.toUpperCase().includes(val) ||
      it.modelo.toUpperCase().includes(val) ||
      it.colaborador.toUpperCase().includes(val)
    );
  });

  const handleFinalizarClick = (setup: SetupRecord) => {
    // Finaliza imediatamente e vai direto para o Histórico mostrando os dados daquele setup
    onFinalizar(setup.id, 'ok');
  };

  const handleCancelarClick = (setup: SetupRecord) => {
    // Abre modal interno seguro (sem depender de window.confirm do navegador)
    setCancelModalSetup(setup);
  };

  const confirmCancel = () => {
    if (cancelModalSetup) {
      onFinalizar(cancelModalSetup.id, 'cancelar');
      setCancelModalSetup(null);
    }
  };

  const formatDataHora = (isoDate?: string) => {
    if (!isoDate) return '-';
    try {
      const d = new Date(isoDate);
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const hora = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${dia}/${mes} ${hora}:${min}`;
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden relative">
      {/* Top Bar matching video */}
      <div className="p-3.5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center bg-[#f8f9fa] gap-3">
        <h6 className="m-0 font-bold text-[#004680] text-sm uppercase tracking-wide">
          Monitoramento
        </h6>
        <div className="w-full sm:w-80 relative">
          <input
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="🔍 Buscar por Tipo, Máquina ou Modelo..."
            className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#004680] bg-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-700 text-xs uppercase font-bold bg-white">
              <th className="py-3 px-4">TIPO</th>
              <th className="py-3 px-4">MÁQUINA/MODELO</th>
              <th className="py-3 px-4">STATUS</th>
              <th className="py-3 px-4">INÍCIO</th>
              <th className="py-3 px-4 text-center">RETOMAR</th>
              <th className="py-3 px-4 text-center">FINALIZAR / CANCELAR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredSetups.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                  Nenhum setup ativo no momento.
                </td>
              </tr>
            ) : (
              filteredSetups.map((it) => {
                const isPendente = it.statusGeral.includes('PENDENTE');
                const isTooltipOpen = activeTooltipId === it.id;

                return (
                  <tr key={it.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* TIPO */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold uppercase text-slate-600 text-xs">
                        {it.tipoMaquina}
                      </span>
                    </td>

                    {/* MÁQUINA / MODELO */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-900 block">{it.maquina}</span>
                      <span className="font-bold text-[#004680] text-xs block">{it.modelo}</span>
                      <span className="text-[11px] text-slate-500 font-bold block mt-0.5">
                        Prep: {it.colaborador}
                      </span>
                    </td>

                    {/* STATUS */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="relative inline-block">
                        <span
                          onMouseEnter={() => setActiveTooltipId(it.id)}
                          onMouseLeave={() => setActiveTooltipId(null)}
                          onClick={() => setActiveTooltipId(isTooltipOpen ? null : it.id)}
                          className={`rounded-full px-3 py-1 font-bold text-[10px] tracking-wider uppercase inline-block cursor-pointer ${
                            isPendente
                              ? 'bg-[#ffc107] text-slate-950 shadow-sm'
                              : 'bg-[#198754] text-white shadow-sm'
                          }`}
                        >
                          {it.statusGeral}
                        </span>

                        {/* Tooltip of pendencies */}
                        {isTooltipOpen && it.pendencias && it.pendencias.length > 0 && (
                          <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-[#333] text-white text-[11px] rounded-lg p-2.5 shadow-xl pointer-events-none text-left">
                            <strong className="block text-amber-300 mb-1">Pendências:</strong>
                            <div className="space-y-0.5">
                              {it.pendencias.map((p, idx) => (
                                <div key={idx} className="leading-tight">• {p}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* INÍCIO */}
                    <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {formatDataHora(it.createdAt)}
                    </td>

                    {/* RETOMAR */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onRetomar(it)}
                        className="bg-[#212529] hover:bg-black text-white font-bold text-[10px] px-3.5 py-1 rounded-full uppercase tracking-wider transition cursor-pointer"
                      >
                        RETOMAR
                      </button>
                    </td>

                    {/* FINALIZAR / CANCELAR */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-3">
                        {/* Finalizado */}
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] font-extrabold text-slate-400 uppercase mb-0.5">
                            Finalizado
                          </span>
                          <button
                            type="button"
                            onClick={() => handleFinalizarClick(it)}
                            disabled={isPendente}
                            title={
                              isPendente
                                ? 'Resolva as pendências antes de finalizar'
                                : 'Finalizar com sucesso e ir para o Histórico'
                            }
                            className={`w-[38px] h-[38px] rounded-full flex items-center justify-center text-white transition shadow-sm ${
                              isPendente
                                ? 'bg-[#dee2e6] opacity-50 cursor-not-allowed'
                                : 'bg-[#198754] hover:bg-emerald-700 cursor-pointer hover:scale-110 active:scale-95'
                            }`}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </button>
                        </div>

                        {/* Divider */}
                        <div className="w-[2px] h-[35px] bg-[#eee]" />

                        {/* Cancelar */}
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] font-extrabold text-slate-400 uppercase mb-0.5">
                            Cancelar
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCancelarClick(it)}
                            title="Cancelar este setup"
                            className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-white bg-[#dc3545] hover:bg-red-700 transition shadow-sm cursor-pointer hover:scale-110 active:scale-95"
                          >
                            <X className="w-4 h-4 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Internal In-App Cancel Confirmation Modal */}
      {cancelModalSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-base text-slate-900 mb-1">
              Cancelar Setup?
            </h4>
            <p className="text-xs text-slate-600 mb-4">
              Deseja realmente cancelar o setup da máquina <strong>{cancelModalSetup.maquina}</strong> (Modelo: {cancelModalSetup.modelo})?
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCancelModalSetup(null)}
                className="flex-1 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                className="flex-1 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white transition cursor-pointer"
              >
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
