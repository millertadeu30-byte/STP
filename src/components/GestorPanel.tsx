import React, { useState } from 'react';
import { TarefaConfig, CatalogoItem, CatalogoCategoria } from '../types';
import {
  salvarTarefa,
  excluirTarefa,
  salvarItemCatalogo,
  excluirItemCatalogo,
  verificarEPopularBancoSeVazio
} from '../services/setupService';
import {
  Settings,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Layers,
  Cpu,
  UserCheck,
  ListTodo,
  RefreshCw,
  AlertCircle,
  Database,
  FileSpreadsheet,
  ExternalLink,
  LockOpen,
} from 'lucide-react';
import {
  checarPlanilhaEAtualizarModelos,
  SHEET_URL,
  ChecarPlanilhaResult,
  salvarIntervaloMaquina,
  salvarModelosCustomizadosMaquina,
} from '../services/sheetSyncService';

interface GestorPanelProps {
  isUnlocked: boolean;
  onUnlock: () => void;
  onLock: () => void;
  tarefas: TarefaConfig[];
  catalogo: CatalogoItem[];
}

export const GestorPanel: React.FC<GestorPanelProps> = ({
  isUnlocked,
  onUnlock,
  onLock,
  tarefas,
  catalogo,
}) => {
  // Password prompt state
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Active sub-tab inside Gestor
  const [activeSubTab, setActiveSubTab] = useState<
    'tarefas' | 'tipos' | 'modelos' | 'maquinas' | 'colaboradores' | 'banco'
  >('tarefas');

  // Selected machine type for task management
  const tiposDisponiveis = catalogo
    .filter((c) => c.categoria === 'tiposMaquinas' && c.ativo)
    .map((c) => c.valor);

  const [selectedTipo, setSelectedTipo] = useState<string>(
    tiposDisponiveis[0] || 'INDEX ABC'
  );

  // New task form state
  const [novaTarefaNome, setNovaTarefaNome] = useState('');
  const [editingTarefa, setEditingTarefa] = useState<TarefaConfig | null>(null);

  // Generic new catalog item form state
  const [novoItemValor, setNovoItemValor] = useState('');

  // Status message
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [isCheckingSheet, setIsCheckingSheet] = useState(false);
  const [checkResultModal, setCheckResultModal] = useState<ChecarPlanilhaResult | null>(null);

  // Edição discreta do intervalo de linhas com cadeado
  const [editingMachineInterval, setEditingMachineInterval] = useState<string | null>(null);
  const [intervalDraft, setIntervalDraft] = useState('');

  const handleIniciarEdicaoIntervalo = (maquinaNome: string, intervaloAtual?: string) => {
    setEditingMachineInterval(maquinaNome);
    setIntervalDraft(intervaloAtual || '');
  };

  const handleSalvarIntervalo = (maquinaNome: string) => {
    const limpo = intervalDraft.trim();
    const novosModelos = salvarIntervaloMaquina(maquinaNome, limpo);

    if (checkResultModal) {
      setCheckResultModal({
        ...checkResultModal,
        todosEncontrados: checkResultModal.todosEncontrados.map((item) => {
          if (item.maquina === maquinaNome) {
            return {
              ...item,
              intervaloPlanilha: limpo || item.intervaloPlanilha,
              modelos: novosModelos,
            };
          }
          return item;
        }),
      });
    }

    setEditingMachineInterval(null);
    setIntervalDraft('');
  };

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const handleChecarPlanilha = async () => {
    setIsCheckingSheet(true);
    try {
      const result = await checarPlanilhaEAtualizarModelos(catalogo);
      setCheckResultModal(result);
      if (result.modelosAdicionados.length > 0) {
        showMsg(`Planilha verificada: ${result.modelosAdicionados.length} novos modelos adicionados com sucesso!`);
      } else {
        showMsg('Planilha verificada: Todos os modelos dos próximos setups já estão cadastrados.');
      }
    } catch (err: any) {
      showMsg('Erro ao checar planilha: ' + (err.message || String(err)), 'error');
    } finally {
      setIsCheckingSheet(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === '8619') {
      setPasswordError(false);
      setPasswordInput('');
      onUnlock();
    } else {
      setPasswordError(true);
    }
  };

  // If locked, show security PIN screen
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4 border-2 border-amber-300">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
          Painel de Configuração do Gestor
        </h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          Área restrita de gestão de dados. Digite a senha master para acessar as configurações que comandam o app.
        </p>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              maxLength={10}
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError(false);
              }}
              placeholder="Digite a senha..."
              autoFocus
              className="w-full text-center text-2xl tracking-[0.5em] font-mono py-2.5 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {passwordError && (
            <p className="text-xs text-red-600 font-bold flex items-center justify-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Senha incorreta! Tente novamente.</span>
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 rounded-xl uppercase tracking-wider text-sm transition shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            <Unlock className="w-4 h-4" />
            <span>Desbloquear Painel</span>
          </button>
        </form>
      </div>
    );
  }

  // --- Task Operations ---
  const handleSaveNovaTarefa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaTarefaNome.trim() || !selectedTipo) return;
    setLoading(true);
    try {
      const tarefasDoTipo = tarefas.filter((t) => t.tipo === selectedTipo);
      await salvarTarefa({
        nome: novaTarefaNome.trim().toUpperCase(),
        tipo: selectedTipo,
        ordem: tarefasDoTipo.length + 1,
      });
      setNovaTarefaNome('');
      showMsg('Item de checklist cadastrado com sucesso!');
    } catch (err: any) {
      showMsg('Erro ao salvar item: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTarefa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTarefa || !editingTarefa.nome.trim()) return;
    setLoading(true);
    try {
      await salvarTarefa({
        id: editingTarefa.id,
        nome: editingTarefa.nome.trim().toUpperCase(),
        tipo: editingTarefa.tipo,
        ordem: editingTarefa.ordem,
      });
      setEditingTarefa(null);
      showMsg('Item atualizado com sucesso!');
    } catch (err: any) {
      showMsg('Erro ao atualizar item: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTarefa = async (id?: string) => {
    if (!id) return;
    setLoading(true);
    try {
      await excluirTarefa(id);
      showMsg('Item excluído!');
    } catch (err: any) {
      showMsg('Erro ao excluir: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- Catalog Item Operations ---
  const handleSaveItemCatalogo = async (categoria: CatalogoCategoria) => {
    if (!novoItemValor.trim()) return;
    setLoading(true);
    try {
      await salvarItemCatalogo({
        valor: novoItemValor.trim().toUpperCase(),
        categoria,
        ativo: true,
      });
      setNovoItemValor('');
      showMsg('Item adicionado ao catálogo!');
    } catch (err: any) {
      showMsg('Erro ao adicionar: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItemCatalogo = async (id?: string) => {
    if (!id) return;
    setLoading(true);
    try {
      await excluirItemCatalogo(id);
      showMsg('Registro excluído!');
    } catch (err: any) {
      showMsg('Erro ao excluir: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurarBanco = async () => {
    setLoading(true);
    try {
      await verificarEPopularBancoSeVazio(true);
      showMsg('Banco de dados restaurado com sucesso com todos os itens da planilha!');
    } catch (err: any) {
      showMsg('Erro ao restaurar banco: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const tarefasFiltradas = tarefas.filter((t) => t.tipo === selectedTipo);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-amber-500 text-slate-950 rounded-2xl p-5 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-950" />
            <h2 className="text-xl font-black uppercase tracking-tight">
              Painel de Configuração do Gestor
            </h2>
          </div>
          <p className="text-xs text-slate-900 font-medium mt-0.5">
            Configurações mestre: tipos de máquinas, checklists, modelos e colaboradores sincronizados em tempo real.
          </p>
        </div>

        <button
          onClick={onLock}
          className="bg-slate-950 hover:bg-slate-900 text-amber-400 font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Bloquear Painel</span>
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
            statusMsg.type === 'success'
              ? 'bg-emerald-100 border border-emerald-300 text-emerald-800'
              : 'bg-red-100 border border-red-300 text-red-800'
          }`}
        >
          <Check className="w-4 h-4" />
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Sub navigation bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 flex flex-wrap gap-2 text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('tarefas')}
          className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 ${
            activeSubTab === 'tarefas'
              ? 'bg-[#004680] text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ListTodo className="w-4 h-4" />
          <span>Checklists por Máquina ({tarefas.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('tipos')}
          className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 ${
            activeSubTab === 'tipos'
              ? 'bg-[#004680] text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Tipos de Layout ({tiposDisponiveis.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('modelos')}
          className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 ${
            activeSubTab === 'modelos'
              ? 'bg-[#004680] text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Modelos de Peças ({catalogo.filter((c) => c.categoria === 'modelos').length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('maquinas')}
          className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 ${
            activeSubTab === 'maquinas'
              ? 'bg-[#004680] text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Máquinas Específicas ({catalogo.filter((c) => c.categoria === 'maquinas').length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('colaboradores')}
          className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 ${
            activeSubTab === 'colaboradores'
              ? 'bg-[#004680] text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Preparadores ({catalogo.filter((c) => c.categoria === 'colaboradores').length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('banco')}
          className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 ${
            activeSubTab === 'banco'
              ? 'bg-[#004680] text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Base de Dados</span>
        </button>
      </div>

      {/* SUB-TAB: CHECKLIST TAREFAS */}
      {activeSubTab === 'tarefas' && (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-extrabold text-[#004680] uppercase">
                Itens de Checklist Vinculados à Máquina
              </h3>
              <p className="text-xs text-slate-500">
                Selecione o tipo de máquina para ver e editar os itens do checklist operacional.
              </p>
            </div>

            {/* Select Tipo de Máquina */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase">Layout:</span>
              <select
                value={selectedTipo}
                onChange={(e) => setSelectedTipo(e.target.value)}
                className="bg-slate-50 border-2 border-[#004680] rounded-lg px-3 py-1.5 text-xs font-extrabold text-slate-800 focus:outline-none"
              >
                {tiposDisponiveis.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Add new task form */}
          <form onSubmit={handleSaveNovaTarefa} className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 flex gap-2">
            <input
              type="text"
              value={novaTarefaNome}
              onChange={(e) => setNovaTarefaNome(e.target.value)}
              placeholder={`Novo item de checklist para "${selectedTipo}"...`}
              className="flex-1 bg-white border border-blue-300 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#004680]"
            />
            <button
              type="submit"
              disabled={loading || !novaTarefaNome.trim()}
              className="bg-[#004680] hover:bg-blue-800 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1 transition shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Item</span>
            </button>
          </form>

          {/* List of tasks */}
          <div className="space-y-2">
            <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Tarefas Cadastradas para {selectedTipo} ({tarefasFiltradas.length}):
            </div>

            {tarefasFiltradas.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Nenhum item cadastrado para este tipo. Adicione um novo item acima.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {tarefasFiltradas.map((t, idx) => {
                  const isEditing = editingTarefa?.id === t.id;

                  return (
                    <div
                      key={t.id || idx}
                      className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between gap-3 text-xs"
                    >
                      {isEditing && editingTarefa ? (
                        <form onSubmit={handleUpdateTarefa} className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editingTarefa.nome}
                            onChange={(e) =>
                              setEditingTarefa(prev => prev ? ({ ...prev, nome: e.target.value }) : null)
                            }
                            className="flex-1 border border-blue-400 rounded px-2 py-1 text-xs font-bold"
                            autoFocus
                          />
                          <button
                            type="submit"
                            className="bg-emerald-600 text-white p-1 rounded hover:bg-emerald-500"
                            title="Salvar"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTarefa(null)}
                            className="bg-slate-400 text-white p-1 rounded hover:bg-slate-500"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400 font-bold w-6">{idx + 1}.</span>
                            <span className="font-bold text-slate-800">{t.nome}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setEditingTarefa(t)}
                              className="text-slate-400 hover:text-blue-600 p-1 rounded transition"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTarefa(t.id)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB: TIPOS DE LAYOUT */}
      {activeSubTab === 'tipos' && (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-[#004680] uppercase">
              Tipos de Layout de Máquina
            </h3>
            <p className="text-xs text-slate-500">
              Cadastre novos layouts de máquinas para agrupar checklists operacionais (ex: INDEX ABC, T.CNC, T.A., INDEX C100).
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveItemCatalogo('tiposMaquinas');
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={novoItemValor}
              onChange={(e) => setNovoItemValor(e.target.value)}
              placeholder="Nome do novo layout de máquina (ex: STAR 20R, CITIZEN)..."
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-[#004680]"
            />
            <button
              type="submit"
              disabled={loading || !novoItemValor.trim()}
              className="bg-[#004680] hover:bg-blue-800 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1 transition shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Tipo</span>
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {catalogo
              .filter((c) => c.categoria === 'tiposMaquinas')
              .map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between"
                >
                  <span className="font-extrabold text-xs text-slate-800 uppercase">
                    {item.valor}
                  </span>
                  <button
                    onClick={() => handleDeleteItemCatalogo(item.id)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SUB-TAB: MODELOS */}
      {activeSubTab === 'modelos' && (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-6">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-base font-extrabold text-[#004680] uppercase">
              Modelos de Peças ({catalogo.filter((c) => c.categoria === 'modelos').length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cadastre os códigos de peças/modelos que entram para fabricação e setup (sem qualquer valor financeiro).
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveItemCatalogo('modelos');
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={novoItemValor}
              onChange={(e) => setNovoItemValor(e.target.value)}
              placeholder="Código do modelo da peça (ex: AL32003, BR1404)..."
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-[#004680]"
            />
            <button
              type="submit"
              disabled={loading || !novoItemValor.trim()}
              className="bg-[#004680] hover:bg-blue-800 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-1 transition shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Modelo</span>
            </button>
          </form>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-96 overflow-y-auto">
            {catalogo
              .filter((c) => c.categoria === 'modelos')
              .map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between text-xs"
                >
                  <span className="font-mono font-bold text-slate-800">{item.valor}</span>
                  <button
                    onClick={() => handleDeleteItemCatalogo(item.id)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SUB-TAB: MÁQUINAS */}
      {activeSubTab === 'maquinas' && (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-[#004680] uppercase">
              Máquinas Específicas
            </h3>
            <p className="text-xs text-slate-500">
              Cadastre as máquinas do parque fabril (ex: N16 - INDEX ABC, N4 - TND180, etc.).
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveItemCatalogo('maquinas');
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={novoItemValor}
              onChange={(e) => setNovoItemValor(e.target.value)}
              placeholder="Identificação da máquina (ex: N16 - INDEX ABC)..."
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-[#004680]"
            />
            <button
              type="submit"
              disabled={loading || !novoItemValor.trim()}
              className="bg-[#004680] hover:bg-blue-800 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1 transition shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Máquina</span>
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {catalogo
              .filter((c) => c.categoria === 'maquinas')
              .map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs"
                >
                  <span className="font-extrabold text-slate-800">{item.valor}</span>
                  <button
                    onClick={() => handleDeleteItemCatalogo(item.id)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SUB-TAB: COLABORADORES */}
      {activeSubTab === 'colaboradores' && (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-[#004680] uppercase">
              Preparadores Externos / Colaboradores
            </h3>
            <p className="text-xs text-slate-500">
              Cadastre os nomes dos preparadores externos responsáveis pela montagem do setup.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveItemCatalogo('colaboradores');
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={novoItemValor}
              onChange={(e) => setNovoItemValor(e.target.value)}
              placeholder="Nome do preparador (ex: MILLER, GABRIEL, CAIO)..."
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-[#004680]"
            />
            <button
              type="submit"
              disabled={loading || !novoItemValor.trim()}
              className="bg-[#004680] hover:bg-blue-800 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1 transition shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Preparador</span>
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {catalogo
              .filter((c) => c.categoria === 'colaboradores')
              .map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs"
                >
                  <span className="font-extrabold text-slate-800">{item.valor}</span>
                  <button
                    onClick={() => handleDeleteItemCatalogo(item.id)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SUB-TAB: BANCO DE DADOS RESTORE */}
      {activeSubTab === 'banco' && (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-[#004680] uppercase">
              Gerenciamento da Base de Dados (STPX26)
            </h3>
            <p className="text-xs text-slate-500">
              Operações de sincronização e restauração dos dados originais das fotos das planilhas.
            </p>
          </div>

          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 text-xs text-amber-900 space-y-3">
            <div className="font-black text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-700" />
              <span>Restaurar Base Completa da Planilha Original</span>
            </div>
            <p>
              Ao acionar esta restauração, todos os 60+ itens de checklist das 4 máquinas (INDEX ABC, INDEX C100, T.CNC, T.A.), bem como os 18 modelos de peças, as 16 máquinas específicas e os preparadores (Miller, Gabriel, Caio) serão recarregados no banco de dados Firebase Firestore STPX26.
            </p>
            <button
              onClick={handleRestaurarBanco}
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700 text-white font-black px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider transition shadow flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Restaurar Itens da Planilha Original</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Resultado da Checagem da Planilha */}
      {checkResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-[#004680] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base leading-tight">
                    Checagem da Planilha - Aba Produções
                  </h4>
                  <p className="text-[11px] text-blue-200">
                    Próximos setups identificados por máquina
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCheckResultModal(null)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                  +{checkResultModal.modelosAdicionados.length} novos adicionados
                </span>
                <span className="bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-full">
                  {checkResultModal.modelosJaExistentes.length} já cadastrados
                </span>
              </div>
              <a
                href={SHEET_URL}
                target="_blank"
                rel="noreferrer"
                className="text-[#004680] hover:underline font-bold flex items-center gap-1 text-[11px]"
              >
                <span>Ver Planilha Original</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Lista de Máquinas e Modelos extraídos */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              <p className="text-slate-600 font-medium">
                Os modelos que estão abaixo da primeira linha de cada máquina foram verificados e sincronizados:
              </p>
              <div className="space-y-2">
                {checkResultModal.todosEncontrados.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="font-extrabold text-slate-800 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span>{item.maquina}</span>
                      
                      {/* Badge discreto com cadeado para editar intervalo da linha */}
                      {editingMachineInterval === item.maquina ? (
                        <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 shadow-2xs font-sans">
                          <LockOpen className="w-3 h-3 text-amber-600 shrink-0 animate-pulse" />
                          <input
                            type="text"
                            value={intervalDraft}
                            onChange={(e) => setIntervalDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSalvarIntervalo(item.maquina);
                              } else if (e.key === 'Escape') {
                                setEditingMachineInterval(null);
                              }
                            }}
                            autoFocus
                            placeholder="ex: Linhas 3 a 8"
                            className="text-[10px] font-medium bg-white text-slate-800 border border-amber-300 rounded px-1.5 py-0.5 outline-none w-28 focus:ring-1 focus:ring-amber-500 font-sans"
                          />
                          <button
                            type="button"
                            onClick={() => handleSalvarIntervalo(item.maquina)}
                            className="p-1 hover:bg-emerald-600 bg-emerald-500 text-white rounded transition cursor-pointer"
                            title="Fechar cadeado e salvar intervalo para as próximas checagens"
                          >
                            <Lock className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingMachineInterval(null)}
                            className="p-1 hover:bg-slate-200 text-slate-500 rounded transition cursor-pointer"
                            title="Cancelar edição"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200/80 px-2 py-0.5 rounded border border-slate-200 transition group/interval w-fit font-sans">
                          <span>{item.intervaloPlanilha || 'Definir intervalo'}</span>
                          <button
                            type="button"
                            onClick={() => handleIniciarEdicaoIntervalo(item.maquina, item.intervaloPlanilha)}
                            className="text-slate-400 hover:text-amber-600 transition p-0.5 rounded cursor-pointer"
                            title="Abrir cadeado para editar intervalo de linhas desta máquina"
                          >
                            <Lock className="w-2.5 h-2.5 group-hover/interval:text-amber-600" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.modelos.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">Nenhum modelo previsto</span>
                      ) : (
                        item.modelos.map((m, mIdx) => {
                          const isNovo = checkResultModal.modelosAdicionados.includes(m.toUpperCase());
                          return (
                            <span
                              key={mIdx}
                              className={`px-2.5 py-0.5 rounded-md font-mono font-bold text-xs border ${
                                isNovo
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {m} {isNovo ? '✨ Novo' : ''}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setCheckResultModal(null)}
                className="bg-[#004680] hover:bg-blue-800 text-white font-bold px-5 py-2 rounded-lg text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Entendido / Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
