import React, { useState, useEffect } from 'react';
import { SetupRecord, TarefaConfig, CatalogoItem } from '../types';
import { salvarSetup, salvarItemCatalogo, limparModelosInvalidosDoCatalogo } from '../services/setupService';
import {
  checarPlanilhaEAtualizarModelos,
  SHEET_URL,
  ChecarPlanilhaResult,
  MODELOS_PRODUCOES_MAP,
  obterModelosComIntervalos,
  salvarIntervaloMaquina,
  salvarModelosCustomizadosMaquina,
  salvarPlanilhaColada,
  parseSpreadsheetDataComRegra,
  restaurarIntervalosPadrao,
  restaurarIntervaloDeUmaMaquina,
  PrintPlanilha,
  obterPrintsPlanilha,
  salvarPrintsPlanilha,
  limparPlanilhaColada,
  esModeloValido,
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
  ClipboardPaste,
  Info,
  Camera,
  Image as ImageIcon,
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
  const [showColarModal, setShowColarModal] = useState(false);
  const [colarTexto, setColarTexto] = useState('');
  const [showPrintsModal, setShowPrintsModal] = useState(false);
  const [prints, setPrints] = useState<PrintPlanilha[]>(() => obterPrintsPlanilha());
  const [selectedPrintPreview, setSelectedPrintPreview] = useState<string | null>(null);

  // Limpeza automática mandatória de modelos inválidos ao iniciar
  useEffect(() => {
    limparModelosInvalidosDoCatalogo().catch(console.error);
  }, []);

  const tiposDisponiveis = catalogo
    .filter((c) => c.categoria === 'tiposMaquinas' && c.ativo)
    .map((c) => c.valor);
  const modelosCadastrados = catalogo
    .filter((c) => c.categoria === 'modelos' && c.ativo && esModeloValido(c.valor))
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
    // Retorna todos os modelos válidos do intervalo da máquina
    return item.modelos;
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

  const handleSalvarIntervalo = async (maquinaNome: string) => {
    const limpo = intervalDraft.trim();
    setIsCheckingSheet(true);
    try {
      const { modelos: novosModelos, descartados: novosDescartados } = await salvarIntervaloMaquina(
        maquinaNome,
        limpo
      );

      if (checkResultModal) {
        setCheckResultModal({
          ...checkResultModal,
          todosEncontrados: checkResultModal.todosEncontrados.map((item) => {
            if (item.maquina === maquinaNome) {
              return {
                ...item,
                intervaloPlanilha: limpo || item.intervaloPlanilha,
                modelos: novosModelos,
                descartados: novosDescartados,
              };
            }
            return item;
          }),
        });
      }

      setSheetSuccessMessage(
        `Cadeado fechado: ${maquinaNome} verificado na planilha! ${novosModelos.length} modelo(s) encontrado(s): ${novosModelos.join(', ') || 'Nenhum'}`
      );
      setTimeout(() => setSheetSuccessMessage(null), 4000);
    } finally {
      setIsCheckingSheet(false);
      setEditingMachineInterval(null);
      setIntervalDraft('');
    }
  };

  const handleRestaurarTodosIntervalos = () => {
    restaurarIntervalosPadrao();
    const padrao = obterModelosComIntervalos();
    if (checkResultModal) {
      setCheckResultModal({
        ...checkResultModal,
        todosEncontrados: padrao,
      });
    }
  };

  const handleResetarIntervaloMaquina = (maquinaNome: string) => {
    restaurarIntervaloDeUmaMaquina(maquinaNome);
    const atualizado = obterModelosComIntervalos();
    if (checkResultModal) {
      setCheckResultModal({
        ...checkResultModal,
        todosEncontrados: atualizado,
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

  const handleProcessarPlanilhaColada = async () => {
    if (!colarTexto.trim()) return;
    salvarPlanilhaColada(colarTexto.trim());
    setIsCheckingSheet(true);
    try {
      const result = await checarPlanilhaEAtualizarModelos(catalogo);
      setCheckResultModal(result);
      setShowColarModal(false);
      setSheetSuccessMessage('Dados processados aplicando a regra: Coluna B sem Coluna G > 0!');
      setTimeout(() => setSheetSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage('Erro ao processar dados da planilha: ' + (err.message || String(err)));
    } finally {
      setIsCheckingSheet(false);
    }
  };

  const handleAdicionarPrint = (dataUrl: string, nomeArquivo?: string) => {
    setPrints((prev) => {
      const novoPrint: PrintPlanilha = {
        id: Date.now().toString(),
        dataUrl,
        nome: nomeArquivo || `Print ${prev.length + 1}`,
        criadoEm: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      const atualizados = prev.length >= 3 ? [...prev.slice(1), novoPrint] : [...prev, novoPrint];
      salvarPrintsPlanilha(atualizados);
      return atualizados;
    });
    setSheetSuccessMessage('Print da planilha anexado com sucesso!');
    setTimeout(() => setSheetSuccessMessage(null), 3000);
  };

  const handleExcluirPrint = (id: string) => {
    setPrints((prev) => {
      const atualizados = prev.filter((p) => p.id !== id);
      salvarPrintsPlanilha(atualizados);
      return atualizados;
    });
  };

  const handleLimparDadosColados = () => {
    limparPlanilhaColada();
    setColarTexto('');
    handleChecarPlanilha();
    setSheetSuccessMessage('Dados colados anteriores limpos! Planilha restaurada com mapeamento oficial.');
    setTimeout(() => setSheetSuccessMessage(null), 3500);
  };

  useEffect(() => {
    if (!showPrintsModal) return;
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (uploadEvent) => {
              const dataUrl = uploadEvent.target?.result as string;
              handleAdicionarPrint(dataUrl, `Print ${prints.length + 1} (Ctrl+V)`);
            };
            reader.readAsDataURL(file);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [showPrintsModal, prints.length]);

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

            {/* Banner Informativo & Regra */}
            <div className="p-4 bg-emerald-50 border-b border-emerald-100 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-emerald-900">
                    {checkResultModal.modelosAdicionados.length > 0
                      ? `Foram inseridos ${checkResultModal.modelosAdicionados.length} novos modelos no catálogo!`
                      : 'Todos os próximos modelos da planilha já estavam no catálogo.'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded">
                      <CheckCheck className="w-3 h-3 text-emerald-700" />
                      {checkResultModal.origem === 'live'
                        ? 'Sincronizado ao vivo via Google Sheets'
                        : checkResultModal.origem === 'colada'
                        ? 'Sincronizado via Dados Colados da Planilha'
                        : 'Mapeamento cirúrgico da aba Produções'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowPrintsModal(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-md shadow-2xs transition cursor-pointer"
                    title="Anexar ou colar até 3 prints da planilha (Ctrl+V)"
                  >
                    <Camera className="w-3.5 h-3.5 text-purple-600" />
                    <span>Prints (Ctrl+V)</span>
                    {prints.length > 0 && (
                      <span className="bg-purple-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                        {prints.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowColarModal(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 hover:border-blue-300 px-2.5 py-1 rounded-md shadow-2xs transition cursor-pointer"
                    title="Colar dados copiados diretamente do Google Planilhas (Ctrl+V)"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Colar Texto</span>
                  </button>

                  {checkResultModal.origem === 'colada' && (
                    <button
                      type="button"
                      onClick={handleLimparDadosColados}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-800 bg-red-50 border border-red-200 px-2 py-1 rounded-md transition cursor-pointer"
                      title="Limpar dados colados anteriores e restaurar mapeamento oficial"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Limpar Colado</span>
                    </button>
                  )}

                  <a
                    href={SHEET_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline shrink-0"
                  >
                    <span>Abrir link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Regra explícita */}
              <div className="p-2 bg-white/80 rounded-lg border border-emerald-200/80 text-[11px] text-slate-700 flex items-start gap-1.5 shadow-2xs">
                <Info className="w-3.5 h-3.5 text-[#004680] shrink-0 mt-0.5" />
                <span>
                  <strong>Regra ativa:</strong> Identifica a máquina na <strong>Coluna B</strong>, traz os modelos da <strong>Coluna C</strong> dentro do intervalo configurado e <strong>descarta qualquer modelo onde a Coluna G tem quantidade produzida (&gt; 0)</strong>.
                </span>
              </div>
            </div>

            {/* Lista de Máquinas e Modelos extraídos */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              <div className="flex flex-wrap items-center justify-between text-slate-600 font-medium text-[11px] gap-2">
                <span>Modelos identificados no intervalo configurado:</span>
                <button
                  type="button"
                  onClick={handleRestaurarTodosIntervalos}
                  className="text-[10px] font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1"
                  title="Restaura todos os intervalos para o padrão original da planilha"
                >
                  <RotateCcw className="w-3 h-3 text-amber-700" />
                  <span>Restaurar intervalos padrão</span>
                </button>
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
                            onClick={() => handleResetarIntervaloMaquina(item.maquina)}
                            className="p-1 hover:bg-amber-200 bg-amber-100 text-amber-800 rounded transition cursor-pointer"
                            title="Restaurar intervalo padrão desta máquina"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
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

                      {/* Modelos válidos trazidos */}
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

                      {/* Modelos descartados porque Coluna G > 0 */}
                      {item.descartados && item.descartados.map((d, dIdx) => (
                        <span
                          key={`desc-${dIdx}`}
                          className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100/80 border border-slate-200 rounded px-1.5 py-0.5 line-through opacity-70 cursor-help"
                          title={`Descartado pela regra da Coluna G: ${d.modelo} possui ${d.qtdeProduzida ?? ''} peças já produzidas (> 0)`}
                        >
                          <span>{d.modelo}</span>
                          <span className="no-underline text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 rounded">
                            Col G &gt; 0
                          </span>
                        </span>
                      ))}

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

      {/* Modal para Colar dados copiados da Planilha (Ctrl+V) */}
      {showColarModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full flex flex-col overflow-hidden">
            <div className="bg-[#004680] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide">
                  Colar Dados da Planilha (Google Sheets)
                </h3>
              </div>
              <button
                onClick={() => setShowColarModal(false)}
                className="text-white/80 hover:text-white p-1 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-slate-600">
                Selecione as linhas da sua aba <strong>Produções</strong> no Google Planilhas ou Excel, copie (<kbd className="bg-slate-100 border px-1 rounded font-mono">Ctrl+C</kbd>) e cole abaixo (<kbd className="bg-slate-100 border px-1 rounded font-mono">Ctrl+V</kbd>):
              </p>

              <textarea
                value={colarTexto}
                onChange={(e) => setColarTexto(e.target.value)}
                placeholder="Cole aqui as linhas copiadas da planilha (com Coluna A, Coluna B e Coluna G)..."
                rows={8}
                className="w-full font-mono text-[11px] p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#004680] focus:border-[#004680] bg-slate-50"
              />

              <div className="bg-blue-50 border border-blue-200 text-blue-900 p-2.5 rounded-lg text-[11px] flex items-start gap-1.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  O sistema obedecerá aos intervalos configurados nos cadeados, extrairá os modelos da <strong>Coluna B</strong> e <strong>descartará automaticamente quem tiver quantidade produzida (&gt; 0) na Coluna G</strong>!
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowColarModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleProcessarPlanilhaColada}
                disabled={!colarTexto.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Processar com a Regra</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Anexar Prints da Planilha (Ctrl+V) */}
      {showPrintsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full flex flex-col overflow-hidden max-h-[90vh]">
            <div className="bg-purple-800 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-purple-300" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide">
                  Prints da Planilha (Atalho Ctrl+V / Imagens)
                </h3>
              </div>
              <button
                onClick={() => setShowPrintsModal(false)}
                className="text-white/80 hover:text-white p-1 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Drop / Paste Zone */}
              <div
                className="border-2 border-dashed border-purple-300 hover:border-purple-500 bg-purple-50/60 rounded-xl p-5 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2"
                title="Clique aqui e pressione Ctrl+V para colar um print"
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">
                    Cole o Print aqui com <kbd className="bg-white border border-purple-300 px-1.5 py-0.5 rounded shadow-2xs font-mono text-purple-800 font-bold">Ctrl + V</kbd>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tire um print da tela no Google Planilhas (<kbd className="font-mono">Windows + Shift + S</kbd> ou <kbd className="font-mono">PrtScn</kbd>) e cole diretamente nesta janela!
                  </p>
                </div>

                <label className="mt-1 cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-purple-300 text-purple-700 font-bold rounded-lg text-xs hover:bg-purple-50 shadow-2xs transition">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ou escolha arquivo do computador</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (uploadEvent) => {
                          const dataUrl = uploadEvent.target?.result as string;
                          handleAdicionarPrint(dataUrl, file.name);
                        };
                        reader.readAsDataURL(file);
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              {/* Prints já anexados */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wide">
                    Prints Anexados ({prints.length} de 3):
                  </span>
                  {prints.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setPrints([]);
                        salvarPrintsPlanilha([]);
                      }}
                      className="text-[11px] text-red-600 hover:text-red-800 underline font-semibold cursor-pointer"
                    >
                      Remover todos
                    </button>
                  )}
                </div>

                {prints.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 italic">
                    Nenhum print anexado ainda. Aperte <kbd className="font-mono font-bold">Ctrl+V</kbd> para colar o primeiro print!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {prints.map((p, idx) => (
                      <div
                        key={p.id || idx}
                        className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs group hover:border-purple-400 transition flex flex-col"
                      >
                        <div
                          className="h-28 bg-slate-100 overflow-hidden relative cursor-pointer"
                          onClick={() => setSelectedPrintPreview(p.dataUrl)}
                          title="Clique para ampliar o print"
                        >
                          <img
                            src={p.dataUrl}
                            alt={p.nome}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-bold text-xs">
                            Ampliar 🔍
                          </div>
                        </div>

                        <div className="p-2 flex items-center justify-between bg-slate-50 border-t border-slate-100 text-[10px]">
                          <div>
                            <p className="font-extrabold text-slate-700 truncate max-w-[100px]">{p.nome}</p>
                            <span className="text-slate-400">{p.criadoEm}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleExcluirPrint(p.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition cursor-pointer"
                            title="Excluir print"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dica da regra */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-[11px] text-purple-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Como o sistema usa esses prints:</p>
                  <p className="text-purple-800 mt-0.5">
                    Os prints ficam armazenados no app para conferência visual direta das colunas e linhas. Os intervalos configurados nos cadeados respeitam exatamente as linhas da planilha!
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <button
                type="button"
                onClick={handleLimparDadosColados}
                className="text-red-600 hover:text-red-800 text-xs font-bold underline cursor-pointer"
                title="Limpar qualquer texto anterior colado que possa ter bagunçado as colunas"
              >
                Limpar dados de texto antigos
              </button>
              <button
                type="button"
                onClick={() => setShowPrintsModal(false)}
                className="bg-purple-700 hover:bg-purple-800 text-white font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Zoom do Print em tela cheia */}
      {selectedPrintPreview && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setSelectedPrintPreview(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700">Visualização do Print da Planilha</span>
              <button
                onClick={() => setSelectedPrintPreview(null)}
                className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[80vh] overflow-auto p-1">
              <img src={selectedPrintPreview} alt="Print ampliado" className="max-w-full h-auto rounded" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
