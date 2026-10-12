import React, { useState, useEffect } from 'react';
import { SetupRecord, TarefaConfig, CatalogoItem } from '../types';
import { salvarSetup } from '../services/setupService';
import {
  ListChecks,
  PlayCircle,
  Edit,
  Save,
  CheckCheck,
  AlertTriangle,
  RotateCcw,
  Settings as CogIcon
} from 'lucide-react';

interface NovoSetupPanelProps {
  editSetup: SetupRecord | null;
  onClearEdit: () => void;
  onSaved: () => void;
  tarefas: TarefaConfig[];
  catalogo: CatalogoItem[];
  modelosAtivosNoPainel: string[];
}

export const NovoSetupPanel: React.FC<NovoSetupPanelProps> = ({
  editSetup,
  onClearEdit,
  onSaved,
  tarefas,
  catalogo,
  modelosAtivosNoPainel,
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

  // Models filter: exclude models already active in panel unless editing
  const modelosFiltrados = modelosCadastrados.filter(
    (mod) => !modelosAtivosNoPainel.includes(mod) || (editSetup && editSetup.modelo === mod)
  );

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
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <h5 className="font-bold text-[#004680] text-lg pl-3 border-l-4 border-[#004680]">
            {editSetup ? 'Editando Registro' : 'Iniciar Registro'}
          </h5>
          {editSetup && (
            <button
              onClick={resetForm}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Novo Registro</span>
            </button>
          )}
        </div>

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
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                MÁQUINA ESPECÍFICA
              </label>
              <select
                value={maquina}
                onChange={(e) => setMaquina(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#004680]"
              >
                <option value="">Escolha...</option>
                {maquinasCadastradas.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
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
    </div>
  );
};
