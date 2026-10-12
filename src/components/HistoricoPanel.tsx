import React, { useState, useEffect } from 'react';
import { SetupRecord } from '../types';
import {
  FileText,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  Trash2,
  Lock,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';

interface HistoricoPanelProps {
  setups: SetupRecord[];
  activeDetailSetupId?: string | null;
  onClearActiveDetail?: () => void;
  onDeleteSetup: (setupId: string) => Promise<void> | void;
}

export const HistoricoPanel: React.FC<HistoricoPanelProps> = ({
  setups,
  activeDetailSetupId,
  onClearActiveDetail,
  onDeleteSetup,
}) => {
  const [filtro, setFiltro] = useState('');
  const [selectedSetup, setSelectedSetup] = useState<SetupRecord | null>(null);
  const [modalFilter, setModalFilter] = useState<'TODOS' | 'OK' | 'FALTA'>('TODOS');

  // Delete modal state
  const [setupToDelete, setSetupToDelete] = useState<SetupRecord | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const finalizados = setups.filter((s) => s.isFinalizado);

  // If activeDetailSetupId is passed (e.g., from Painel Ativo immediately after finalizing)
  useEffect(() => {
    if (activeDetailSetupId) {
      const found = setups.find((s) => s.id === activeDetailSetupId);
      if (found) {
        setSelectedSetup(found);
      }
    }
  }, [activeDetailSetupId, setups]);

  const filtered = finalizados.filter((it) => {
    const val = filtro.toUpperCase();
    return (
      it.tipoMaquina.toUpperCase().includes(val) ||
      it.maquina.toUpperCase().includes(val) ||
      it.modelo.toUpperCase().includes(val) ||
      it.colaborador.toUpperCase().includes(val) ||
      (it.finalizadoPor && it.finalizadoPor.toUpperCase().includes(val))
    );
  });

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

  const handleCloseModal = () => {
    setSelectedSetup(null);
    if (onClearActiveDetail) {
      onClearActiveDetail();
    }
  };

  const handleOpenDelete = (setup: SetupRecord) => {
    setSetupToDelete(setup);
    setDeletePassword('');
    setDeletePasswordError(false);
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupToDelete) return;

    if (deletePassword.trim() !== '8619') {
      setDeletePasswordError(true);
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteSetup(setupToDelete.id);
      if (selectedSetup?.id === setupToDelete.id) {
        handleCloseModal();
      }
      setSetupToDelete(null);
      setDeletePassword('');
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const respostasFiltradas = selectedSetup?.respostas?.filter((r) => {
    if (modalFilter === 'OK') return r.status === 'OK';
    if (modalFilter === 'FALTA') return r.status === 'FALTA';
    return true;
  }) || [];

  const totalOK = selectedSetup?.respostas?.filter((r) => r.status === 'OK').length || 0;
  const totalFalta = selectedSetup?.respostas?.filter((r) => r.status === 'FALTA').length || 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden relative">
      {/* Top Bar matching video */}
      <div className="p-3.5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center bg-[#f8f9fa] gap-3">
        <div className="flex items-center gap-2">
          <h6 className="m-0 font-bold text-[#004680] text-sm uppercase tracking-wide">
            Monitoramento
          </h6>
          <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
            {finalizados.length} no histórico
          </span>
        </div>
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
              <th className="py-3 px-4">MÁQUINA/MODELO</th>
              <th className="py-3 px-4">STATUS</th>
              <th className="py-3 px-4">FINALIZAÇÃO</th>
              <th className="py-3 px-4">PREPARADOR</th>
              <th className="py-3 px-4 text-center">DETALHES / AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400 text-xs">
                  Nenhum registro no histórico.
                </td>
              </tr>
            ) : (
              filtered.map((it) => {
                const isExecutado = it.statusGeral.includes('EXECUTADO');

                return (
                  <tr
                    key={it.id}
                    onClick={() => setSelectedSetup(it)}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                  >
                    {/* MÁQUINA / MODELO */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-900 block group-hover:text-[#004680]">
                        {it.maquina}
                      </span>
                      <span className="font-bold text-[#004680] text-xs block">{it.modelo}</span>
                      <span className="text-[11px] text-slate-400 block">{it.tipoMaquina}</span>
                    </td>

                    {/* STATUS */}
                    <td className="py-3 px-4 font-bold text-xs whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isExecutado
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {isExecutado ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                        )}
                        <span>{it.statusGeral}</span>
                      </span>
                    </td>

                    {/* FINALIZAÇÃO */}
                    <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {formatDataHora(it.finalizadoAt || it.updatedAt)}
                    </td>

                    {/* PREPARADOR */}
                    <td className="py-3 px-4 text-xs font-bold text-slate-700 whitespace-nowrap">
                      {it.colaborador || it.finalizadoPor || 'SISTEMA'}
                    </td>

                    {/* DETALHES & LIXEIRA */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSetup(it);
                          }}
                          className="bg-blue-50 hover:bg-blue-100 text-[#004680] font-bold text-[11px] px-3 py-1.5 rounded-lg border border-blue-200 transition inline-flex items-center gap-1 cursor-pointer"
                          title="Ver todas as informações e itens do setup"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Ver Tudo</span>
                        </button>

                        {/* LIXEIRINHA PROTEGIDA COM SENHA 8619 */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDelete(it);
                          }}
                          className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 p-1.5 rounded-lg transition inline-flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                          title="Excluir setup do histórico (requer senha do gestor)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Checklist Details */}
      {selectedSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-[#004680] text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-400 text-blue-950 font-black text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
                    SETUP FINALIZADO
                  </span>
                  <h4 className="font-extrabold text-base sm:text-lg">
                    {selectedSetup.maquina}
                  </h4>
                </div>
                <p className="text-xs text-blue-200 mt-0.5">
                  Modelo: <strong className="text-white font-mono">{selectedSetup.modelo}</strong> | Layout:{' '}
                  <strong className="text-white">{selectedSetup.tipoMaquina}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenDelete(selectedSetup)}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white p-1.5 rounded-lg transition border border-red-400/40 text-xs flex items-center gap-1 cursor-pointer"
                  title="Excluir este setup (requer senha)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Excluir</span>
                </button>
                <button
                  onClick={handleCloseModal}
                  className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Overview Info Card */}
            <div className="bg-slate-50 p-4 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#004680] shrink-0" />
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">Preparador:</span>
                  <span className="font-bold text-slate-800">{selectedSetup.colaborador}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#004680] shrink-0" />
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">Início:</span>
                  <span className="font-bold text-slate-800">{formatDataHora(selectedSetup.createdAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#004680] shrink-0" />
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">Finalização:</span>
                  <span className="font-bold text-slate-800">
                    {formatDataHora(selectedSetup.finalizadoAt || selectedSetup.updatedAt)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">Status:</span>
                  <span className="font-extrabold text-emerald-700">{selectedSetup.statusGeral}</span>
                </div>
              </div>
            </div>

            {/* Checklist Filters inside modal */}
            <div className="px-5 pt-3 pb-2 bg-white flex items-center justify-between border-b border-slate-100 text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wide">
                Itens Checados ({selectedSetup.respostas?.length || 0}):
              </span>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                <button
                  onClick={() => setModalFilter('TODOS')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                    modalFilter === 'TODOS'
                      ? 'bg-white shadow text-[#004680]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({selectedSetup.respostas?.length || 0})
                </button>
                <button
                  onClick={() => setModalFilter('OK')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                    modalFilter === 'OK'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                >
                  OK ({totalOK})
                </button>
                <button
                  onClick={() => setModalFilter('FALTA')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                    modalFilter === 'FALTA'
                      ? 'bg-red-600 text-white'
                      : 'text-red-700 hover:text-red-900'
                  }`}
                >
                  Faltas ({totalFalta})
                </button>
              </div>
            </div>

            {/* Checklist Responses List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-2 flex-1 bg-slate-50/50">
              {respostasFiltradas.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Nenhum item com este filtro.
                </div>
              ) : (
                respostasFiltradas.map((r, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 shadow-xs ${
                      r.status === 'OK'
                        ? 'bg-white border-slate-200'
                        : 'bg-red-50 border-red-200 text-red-950'
                    }`}
                  >
                    <div className="flex-1">
                      <span className="font-bold text-slate-800 leading-snug block">
                        {i + 1}. {r.tarefa}
                      </span>
                      {r.obs && (
                        <p className="text-[11px] text-slate-500 mt-1 bg-slate-100/70 p-1 rounded font-medium">
                          <strong>Observação:</strong> {r.obs}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 font-black px-2.5 py-1 rounded-md text-[10px] tracking-wider uppercase ${
                        r.status === 'OK'
                          ? 'bg-[#198754] text-white shadow-xs'
                          : 'bg-[#dc3545] text-white shadow-xs'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-white border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={handleCloseModal}
                className="bg-[#004680] hover:bg-blue-800 text-white font-bold px-5 py-2 rounded-lg text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal with Password 8619 Requirement */}
      {setupToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h4 className="font-black text-base text-slate-900 mb-1 uppercase tracking-tight">
              Apagar Setup do Histórico
            </h4>

            <p className="text-xs text-slate-600 mb-2">
              Você está apagando o registro da máquina{' '}
              <strong className="text-slate-900">{setupToDelete.maquina}</strong> (Modelo: {setupToDelete.modelo}).
            </p>

            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-lg text-[11px] mb-4 text-left flex items-start gap-1.5">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>Esta ação é irreversível. Digite a senha do gestor (8619) para autorizar:</span>
            </div>

            <form onSubmit={handleConfirmDelete} className="space-y-3">
              <div>
                <input
                  type="password"
                  maxLength={10}
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    setDeletePasswordError(false);
                  }}
                  placeholder="Digite a senha..."
                  autoFocus
                  className="w-full text-center text-lg tracking-[0.3em] font-mono py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              {deletePasswordError && (
                <p className="text-xs text-red-600 font-bold flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Senha incorreta! Não autorizado.</span>
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSetupToDelete(null);
                    setDeletePassword('');
                  }}
                  disabled={isDeleting}
                  className="flex-1 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isDeleting || !deletePassword}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white transition cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Apagando...' : 'Confirmar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
