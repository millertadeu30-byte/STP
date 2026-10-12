import React, { useState, useEffect } from 'react';
import { SetupRecord, TarefaConfig, CatalogoItem } from '../types';
import { salvarSetup, salvarItemCatalogo } from '../services/setupService';
import {
  checarPlanilhaEAtualizarModelos,
  SHEET_URL,
  ChecarPlanilhaResult,
  MODELOS_PRODUCOES_MAP,
  obterModelosComIntervalos,
  salvarIntervaloMaquina,
  salvarModelosCustomizadosMaquina,
} from '../services/sheetSyncService';
import {
  ListChecks,
  PlayCircle,
  Edit,
  Save,
  CheckCheck,
  AlertTriangle,
  RotateCcw,
  Settings as CogIcon,
  FileSpreadsheet,
  ExternalLink,
  X,
  Plus,
  Trash2,
  Check,
  Lock,
  LockOpen,
} from 'lucide-react';

interface NovoSetupPanelProps {
  editSetup: SetupRecord | null;
  onClearEdit: () => void;
  onSaved: () => void;
  tarefas: TarefaConfig[];
  catalogo: CatalogoItem[];
  modelosAtivosNoPainel: string[];
  setupsAtivos?: SetupRecord[];
}

export const NovoSetupPanel: React.FC<NovoSetupPanelProps> = ({
  editSetup,
  onClearEdit,
  onSaved,
  tarefas,
  catalogo,
  modelosAtivosNoPainel,
  setupsAtivos = [],
}) => {
  const [colaborador, setColaborador] = useState('');
  const [tipoMaquina, setTipoMaquina] = useState('');
  const [modelo, setModelo] = useState('');
  const [maquina, setMaquina] = useState('');

  const [isChecklistMounted, setIsChecklistMounted] = useState(false);
  const [checklistRespostas, setChecklistRespostas] = useState<{
    [tarefaNome: string]: { status: 'OK' | 'FALTA' | ''; obs: string };
  }>({});
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sheet Sync State
  const [isCheckingSheet, setIsCheckingSheet] = useState(false);
  const [sheetSuccessMessage, setSheetSuccessMessage] = useState<string | null>(null);
  const [checkResultModal, setCheckResultModal] = useState<ChecarPlanilhaResult | null>(null);

  const tiposDisponiveis = catalogo
    .filter((c) => c.categoria === 'tiposMaquinas' && c.ativo)
    .map((c) => c.valor);
  const modelosCadastrados = catalogo
    .filter((c) => c.categoria === 'modelos' && c.ativo)
    .map((c) => c.valor);
  const maquinasCadastradas = catalogo
    .filter((c) => c.categoria === 'maquinas' && c.ativo)
    .map((c) => c.valor);
  const colaboradoresCadastrados = catalogo
    .filter((c) => c.categoria === 'colaboradores' && c.ativo)
    .map((c) => c.valor);

  // Models filter:
  // "SE O MODELO ESTIVER ATIVO NAQUELA MÁQUINA ELE NÃO APARECE MAIS EM INICIAR REGISTRO POIS ELE JA TA SENDO FEITO"
  const modelosFiltrados = modelosCadastrados.filter((mod) => {
    if (editSetup && editSetup.modelo === mod) {
      return true;
    }

    if (maquina) {
      const emAndamentoNestaMaquina = setupsAtivos.some(
        (s) =>
          s.maquina.trim().toUpperCase() === maquina.trim().toUpperCase() &&
          s.modelo.trim().toUpperCase() === mod.trim().toUpperCase()
      );
      return !emAndamentoNestaMaquina;
    }

    return !modelosAtivosNoPainel.includes(mod);
  });

  // Se trocar de máquina e o modelo previamente selecionado já estiver em execução nela, deseleciona o modelo
  useEffect(() => {
    if (modelo && !modelosFiltrados.includes(modelo)) {
      setModelo('');
    }
  }, [maquina, modelosFiltrados, modelo]);

  // Modelos previstos na planilha para a máquina selecionada
  const proximosModelosDaMaquina = React.useMemo(() => {
    if (!maquina) return [];
    const lista = obterModelosComIntervalos();
    const item = lista.find(
      (p) => p.maquina.trim().toUpperCase() === maquina.trim().toUpperCase()
    );
    if (!item) return [];
    return item.modelos.filter((mod) => modelosFiltrados.includes(mod));
  }, [maquina, modelosFiltrados, checkResultModal]);

  // Máquina sugerida pela planilha caso o usuário selecione primeiro o modelo
  const maquinaSugeridaParaModelo = React.useMemo(() => {
    if (!modelo || maquina) return null;
    const lista = obterModelosComIntervalos();
    const item = lista.find((p) =>
      p.modelos.some((m) => m.toUpperCase() === modelo.toUpperCase())
    );
    return item ? item.maquina : null;
  }, [modelo, maquina, checkResultModal]);

  // Interactive modal helpers (adicionar/excluir modelos e selecionar no formulário)
  const [addingModelToMachine, setAddingModelToMachine] = useState<string | null>(null);
  const [novoModeloInput, setNovoModeloInput] = useState('');

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

  const handleExcluirModeloDaMaquinaNoModal = (maquinaNome: string, modeloExcluir: string) => {
    if (!checkResultModal) return;
    const itemAtual = checkResultModal.todosEncontrados.find((i) => i.maquina === maquinaNome);
    const novosModelos = itemAtual
      ? itemAtual.modelos.filter((m) => m !== modeloExcluir)
      : [];
    salvarModelosCustomizadosMaquina(maquinaNome, novosModelos);

    setCheckResultModal({
      ...checkResultModal,
      todosEncontrados: checkResultModal.todosEncontrados.map((item) => {
        if (item.maquina === maquinaNome) {
          return {
            ...item,
            modelos: novosModelos,
          };
        }
        return item;
      }),
    });
  };

  const handleAdicionarModeloNaMaquinaNoModal = async (maquinaNome: string) => {
    const val = novoModeloInput.trim().toUpperCase();
    if (!val || !checkResultModal) return;

    try {
      await salvarItemCatalogo({
        valor: val,
        categoria: 'modelos',
        ativo: true,
      });
    } catch (e) {
      console.error('Erro ao salvar item catalogo:', e);
    }

    const itemAtual = checkResultModal.todosEncontrados.find((i) => i.maquina === maquinaNome);
    const novosModelos = itemAtual
      ? (itemAtual.modelos.includes(val) ? itemAtual.modelos : [...itemAtual.modelos, val])
      : [val];
    salvarModelosCustomizadosMaquina(maquinaNome, novosModelos);

    setCheckResultModal({
      ...checkResultModal,
      todosEncontrados: checkResultModal.todosEncontrados.map((item) => {
        if (item.maquina === maquinaNome) {
          return {
            ...item,
            modelos: novosModelos,
          };
        }
        return item;
      }),
      modelosAdicionados: [...checkResultModal.modelosAdicionados, val],
    });

    setNovoModeloInput('');
    setAddingModelToMachine(null);
  };

  const handleSelecionarDoModal = (maquinaEscolhida: string, modeloEscolhido: string) => {
    setMaquina(maquinaEscolhida);
    setModelo(modeloEscolhido);

    // Auto-identificar tipo de layout
    if (maquinaEscolhida.includes('C100')) {
      setTipoMaquina('INDEX C100');
    } else if (maquinaEscolhida.includes('INDEX ABC')) {
      setTipoMaquina('INDEX ABC');
    } else if (maquinaEscolhida.startsWith('TA-')) {
      setTipoMaquina('T.A.');
    } else {
      setTipoMaquina('T.CNC');
    }

    setCheckResultModal(null);
  };

  // Handler para checar planilha diretamente da aba NOVO SETUP
  const handleChecarPlanilha = async () => {
    setIsCheckingSheet(true);
    setSheetSuccessMessage(null);
    try {
      const result = await checarPlanilhaEAtualizarModelos(catalogo);
      setCheckResultModal(result);
      if (result.modelosAdicionados.length > 0) {
        setSheetSuccessMessage(`${result.modelosAdicionados.length} novos modelos adicionados com sucesso!`);
      } else {
        setSheetSuccessMessage('Planilha verificada: Modelos atualizados.');
      }
      setTimeout(() => setSheetSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage('Erro ao checar planilha: ' + (err.message || String(err)));
    } finally {
      setIsCheckingSheet(false);
    }
  };

  useEffect(() => {
    if (editSetup) {
      setColaborador(editSetup.colaborador);
      setTipoMaquina(editSetup.tipoMaquina);
      setModelo(editSetup.modelo);
      setMaquina(editSetup.maquina);

      const respMap: { [k: string]: { status: 'OK' | 'FALTA' | ''; obs: string } } = {};
      editSetup.respostas.forEach((r) => {
        respMap[r.tarefa] = { status: r.status, obs: r.obs || '' };
      });
      setChecklistRespostas(respMap);
      setIsChecklistMounted(true);
      setErrorMessage(null);
    } else {
      resetForm();
    }
  }, [editSetup]);

  const resetForm = () => {
    setColaborador('');
    setTipoMaquina('');
    setModelo('');
    setMaquina('');
    setIsChecklistMounted(false);
    setChecklistRespostas({});
    setErrorMessage(null);
    onClearEdit();
  };

  const handleMontarChecklist = () => {
    setErrorMessage(null);
    if (!colaborador || !tipoMaquina || !modelo || !maquina) {
      setErrorMessage('Atenção: O nome do Preparador Externo, Modelo, Máquina e Tipo são obrigatórios!');
      return;
    }

    const tarefasFiltradas = tarefas.filter((t) => t.tipo === tipoMaquina);
    if (tarefasFiltradas.length === 0) {
      setErrorMessage(`Nenhuma tarefa cadastrada para o tipo "${tipoMaquina}". Acesse o painel GESTOR para cadastrar.`);
      return;
    }

    const newAnswers = { ...checklistRespostas };
    tarefasFiltradas.forEach((t) => {
      if (!newAnswers[t.nome]) {
        newAnswers[t.nome] = { status: '', obs: '' };
      }
    });

    setChecklistRespostas(newAnswers);
    setIsChecklistMounted(true);
  };

  const handleSetStatus = (tarefaNome: string, status: 'OK' | 'FALTA') => {
    setChecklistRespostas((prev) => ({
      ...prev,
      [tarefaNome]: {
        status,
        obs: prev[tarefaNome]?.obs || '',
      },
    }));
  };

  const handleSetObs = (tarefaNome: string, obs: string) => {
    setChecklistRespostas((prev) => ({
      ...prev,
      [tarefaNome]: {
        status: prev[tarefaNome]?.status || '',
        obs,
      },
    }));
  };

  const handleMarcarTodosOK = () => {
    const tarefasFiltradas = tarefas.filter((t) => t.tipo === tipoMaquina);
    const updated = { ...checklistRespostas };
    tarefasFiltradas.forEach((t) => {
      updated[t.nome] = {
        status: 'OK',
        obs: updated[t.nome]?.obs || '',
      };
    });
    setChecklistRespostas(updated);
  };

  const handleSalvar = async () => {
    setErrorMessage(null);
    const tarefasFiltradas = tarefas.filter((t) => t.tipo === tipoMaquina);

    const faltando = tarefasFiltradas.filter(
      (t) => !checklistRespostas[t.nome] || !checklistRespostas[t.nome].status
    );

    if (faltando.length > 0) {
      setErrorMessage(`Responda tudo! Faltam ${faltando.length} item(ns).`);
      return;
    }

    setSaving(true);
    try {
      const respostasPayload = tarefasFiltradas.map((t) => ({
        tarefa: t.nome,
        status: checklistRespostas[t.nome].status as 'OK' | 'FALTA',
        obs: checklistRespostas[t.nome].obs || '',
      }));

      await salvarSetup({
        id: editSetup?.id,
        colaborador,
        modelo,
        maquina,
        tipoMaquina,
        respostas: respostasPayload,
      });

      resetForm();
      onSaved();
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Erro ao salvar setup: ' + (err.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  const tarefasDoTipo = tarefas.filter((t) => t.tipo === tipoMaquina);

  return (
    <div className="max-w-[550px] mx-auto space-y-4">
      {/* Registration Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 gap-2">
          <h5 className="font-bold text-[#004680] text-lg pl-3 border-l-4 border-[#004680]">
            {editSetup ? 'Editando Registro' : 'Iniciar Registro'}
          </h5>

          <div className="flex items-center gap-2">
            {/* BOTÃO CHECAR PLANILHA INDICADO NA FOTO 1 NA ABA NOVO SETUP */}
            <button
              type="button"
              onClick={handleChecarPlanilha}
              disabled={isCheckingSheet}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition hover:scale-105 active:scale-95 cursor-pointer uppercase tracking-wider shrink-0"
              title="Checar planilha Mapa Usinagem CNC (aba Produções) e puxar os próximos modelos de cada máquina"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 ${isCheckingSheet ? 'animate-spin' : ''}`} />
              <span>{isCheckingSheet ? 'Checando...' : 'CHECAR PLANILHA'}</span>
            </button>

            {editSetup && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Novo Registro</span>
              </button>
            )}
          </div>
        </div>

        {sheetSuccessMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border-l-4 border-emerald-500 rounded text-emerald-800 text-xs font-semibold flex items-center justify-between">
            <span>{sheetSuccessMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-3.5">
          {/* Preparador Externo */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              PREPARADOR EXTERNO (Obrigatório)
            </label>
            <select
              value={colaborador}
              onChange={(e) => setColaborador(e.target.value)}
              className="w-full bg-white border border-blue-600 rounded-lg px-3 py-2 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Escolha...</option>
              {colaboradoresCadastrados.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Tipo de Layout */}
          <div>
            <label className="block text-xs font-bold text-red-600 uppercase mb-1 flex items-center gap-1">
              <CogIcon className="w-3.5 h-3.5" />
              <span>TIPO DE LAYOUT DA MÁQUINA</span>
            </label>
            <select
              value={tipoMaquina}
              onChange={(e) => {
                setTipoMaquina(e.target.value);
                setIsChecklistMounted(false);
              }}
              className="w-full bg-white border border-red-500 rounded-lg px-3 py-2 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Escolha...</option>
              {tiposDisponiveis.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Modelo & Máquina */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                MODELO DA PEÇA
              </label>
              <select
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#004680]"
              >
                <option value="">Escolha...</option>
                {modelosFiltrados.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              {/* Sugestões da planilha para a máquina selecionada */}
              {proximosModelosDaMaquina.length > 0 && (
                <div className="mt-1.5 flex items-center flex-wrap gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Da Planilha:</span>
                  {proximosModelosDaMaquina.map((pMod) => (
                    <button
                      key={pMod}
                      type="button"
                      onClick={() => setModelo(pMod)}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded border transition cursor-pointer ${
                        modelo === pMod
                          ? 'bg-[#004680] text-white border-[#004680]'
                          : 'bg-blue-50 text-[#004680] border-blue-200 hover:bg-blue-100'
                      }`}
                    >
                      {pMod}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                MÁQUINA ESPECÍFICA
              </label>
              <select
                value={maquina}
                onChange={(e) => {
                  const mVal = e.target.value;
                  setMaquina(mVal);
                  if (mVal && !tipoMaquina) {
                    if (mVal.includes('C100')) setTipoMaquina('INDEX C100');
                    else if (mVal.includes('INDEX ABC')) setTipoMaquina('INDEX ABC');
                    else if (mVal.startsWith('TA-')) setTipoMaquina('T.A.');
                    else setTipoMaquina('T.CNC');
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#004680]"
              >
                <option value="">Escolha...</option>
                {maquinasCadastradas.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              {/* Sugestão de máquina caso o operador selecione primeiro o modelo */}
              {maquinaSugeridaParaModelo && (
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Sugerida:</span>
                  <button
                    type="button"
                    onClick={() => setMaquina(maquinaSugeridaParaModelo)}
                    className="px-2 py-0.5 text-[11px] font-bold rounded border bg-blue-50 text-[#004680] border-blue-200 hover:bg-blue-100 transition cursor-pointer truncate max-w-full"
                  >
                    {maquinaSugeridaParaModelo}
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleMontarChecklist}
            className="w-full bg-[#0d6efd] hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm uppercase tracking-wide transition shadow-sm flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            <ListChecks className="w-4 h-4" />
            <span>MONTAR CHECKLIST</span>
          </button>
        </div>
      </div>

      {/* Checklist Form */}
      {isChecklistMounted && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
          {/* Yellow Banner */}
          <div className="bg-[#fff8e1] border-l-4 border-[#ffc107] text-[#856404] p-3.5 rounded-r-lg shadow-sm text-xs">
            <div className="font-bold text-[#ffc107] text-base mb-1 flex items-center gap-1.5">
              {editSetup ? <Edit className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
              <span>{editSetup ? 'Retomar / Corrigir Setup' : 'Iniciando Novo Setup'}</span>
            </div>
            <div>
              <span className="font-bold">{editSetup ? 'Editando:' : 'Modelo:'}</span> {modelo} |{' '}
              <span className="font-bold">Máquina:</span> {maquina}
            </div>
            <div className="font-bold text-[#004680] mt-1">
              Prep: {colaborador}
            </div>
          </div>

          {/* Quick Marcar Todos como OK */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleMarcarTodosOK}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-3 py-1 rounded text-xs flex items-center gap-1 cursor-pointer transition"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Marcar Todos como OK</span>
            </button>
          </div>

          {/* Task Items */}
          <div className="space-y-2.5">
            {tarefasDoTipo.map((t, idx) => {
              const current = checklistRespostas[t.nome] || { status: '', obs: '' };
              const isOK = current.status === 'OK';
              const isFalta = current.status === 'FALTA';

              return (
                <div
                  key={t.nome + idx}
                  className="bg-[#fafafa] border border-slate-200 rounded-xl p-3"
                >
                  <label className="font-bold text-xs text-[#004680] block mb-2 leading-tight">
                    {t.nome}
                  </label>

                  <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden shadow-sm shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSetStatus(t.nome, 'OK')}
                        className={`px-3 py-1 text-xs font-bold transition cursor-pointer ${
                          isOK
                            ? 'bg-[#198754] text-white'
                            : 'bg-white text-slate-700 hover:bg-emerald-50'
                        }`}
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetStatus(t.nome, 'FALTA')}
                        className={`px-2.5 py-1 text-xs font-bold border-l border-slate-300 transition cursor-pointer ${
                          isFalta
                            ? 'bg-[#dc3545] text-white'
                            : 'bg-white text-slate-700 hover:bg-red-50'
                        }`}
                      >
                        FALTA
                      </button>
                    </div>

                    <input
                      type="text"
                      value={current.obs}
                      onChange={(e) => handleSetObs(t.nome, e.target.value)}
                      placeholder="Obs..."
                      className="text-xs px-2.5 py-1 border border-slate-300 rounded bg-white w-full focus:outline-none focus:ring-1 focus:ring-[#004680]"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Salvar Button */}
          <button
            type="button"
            onClick={handleSalvar}
            disabled={saving}
            className="w-full bg-[#198754] hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>SALVAR SETUP</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Modal de Resultado da Checagem da Planilha */}
      {checkResultModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header Modal */}
            <div className="bg-emerald-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide">
                  Resultado: Checagem de Planilha
                </h3>
              </div>
              <button
                onClick={() => setCheckResultModal(null)}
                className="text-white/80 hover:text-white p-1 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Banner Informativo */}
            <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-emerald-900">
                  {checkResultModal.modelosAdicionados.length > 0
                    ? `Foram inseridos ${checkResultModal.modelosAdicionados.length} novos modelos no catálogo!`
                    : 'Todos os próximos modelos da planilha já estavam no catálogo.'}
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Lidos automaticamente da aba <strong>Produções</strong> (próximos modelos abaixo da linha 1).
                </p>
              </div>
              <a
                href={SHEET_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline shrink-0"
              >
                <span>Abrir planilha</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Lista de Máquinas e Modelos extraídos */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              <div className="flex items-center justify-between text-slate-600 font-medium text-[11px]">
                <span>Modelos verificados abaixo da linha 1 de cada máquina:</span>
                <span className="text-[10px] text-slate-400 italic">Toque no modelo para preencher o formulário</span>
              </div>

              <div className="space-y-2">
                {checkResultModal.todosEncontrados.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs hover:border-slate-300 transition"
                  >
                    <div className="font-extrabold text-slate-800 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                        <span>{item.maquina}</span>
                      </div>
                      
                      {/* Badge discreto com cadeado para editar intervalo da linha */}
                      {editingMachineInterval === item.maquina ? (
                        <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 shadow-2xs">
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
                            className="text-[10px] font-medium bg-white text-slate-800 border border-amber-300 rounded px-1.5 py-0.5 outline-none w-28 focus:ring-1 focus:ring-amber-500"
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
                        <div className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200/80 px-2 py-0.5 rounded border border-slate-200 transition group/interval w-fit">
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

                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.modelos.length === 0 && (
                        <span className="text-[11px] text-slate-400 italic">Nenhum modelo previsto</span>
                      )}

                      {item.modelos.map((m, mIdx) => {
                        const isNovo = checkResultModal.modelosAdicionados.includes(m.toUpperCase());
                        return (
                          <div
                            key={mIdx}
                            className={`inline-flex items-center rounded-md font-mono font-bold text-xs border overflow-hidden transition shadow-2xs ${
                              isNovo
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleSelecionarDoModal(item.maquina, m)}
                              className="px-2 py-0.5 hover:bg-emerald-100/60 cursor-pointer flex items-center gap-1"
                              title={`Selecionar ${m} na máquina ${item.maquina}`}
                            >
                              <span>{m}</span>
                              {isNovo && <span className="text-[9px] text-emerald-600 font-sans">✨ Novo</span>}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExcluirModeloDaMaquinaNoModal(item.maquina, m);
                              }}
                              className="px-1 py-0.5 hover:bg-red-500 hover:text-white text-slate-400 border-l border-slate-200 transition cursor-pointer"
                              title={`Excluir ${m} desta máquina`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Inline form para adicionar modelo nesta máquina */}
                      {addingModelToMachine === item.maquina ? (
                        <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-md p-0.5">
                          <input
                            type="text"
                            value={novoModeloInput}
                            onChange={(e) => setNovoModeloInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAdicionarModeloNaMaquinaNoModal(item.maquina);
                              } else if (e.key === 'Escape') {
                                setAddingModelToMachine(null);
                              }
                            }}
                            placeholder="Cód..."
                            autoFocus
                            className="w-20 px-1 py-0.5 text-xs font-mono font-bold uppercase bg-white border border-slate-200 rounded outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAdicionarModeloNaMaquinaNoModal(item.maquina)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-0.5 rounded cursor-pointer"
                            title="Confirmar adição"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingModelToMachine(null);
                              setNovoModeloInput('');
                            }}
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAddingModelToMachine(item.maquina);
                            setNovoModeloInput('');
                          }}
                          className="px-1.5 py-0.5 text-[10px] font-bold text-slate-500 hover:text-[#004680] hover:bg-blue-50 border border-dashed border-slate-300 rounded flex items-center gap-0.5 transition cursor-pointer"
                          title="Adicionar outro modelo para esta máquina"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Adicionar</span>
                        </button>
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
