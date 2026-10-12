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
  Database
} from 'lucide-react';

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

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3500);
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
          <div>
            <h3 className="text-base font-extrabold text-[#004680] uppercase">
              Modelos de Peças
            </h3>
            <p className="text-xs text-slate-500">
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
              className="bg-[#004680] hover:bg-blue-800 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1 transition shrink-0 cursor-pointer disabled:opacity-50"
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
    </div>
  );
};
